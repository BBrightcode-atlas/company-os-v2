#!/usr/bin/env -S node --import tsx
/**
 * DB 노이즈 정리 — 테스트 잔존 에이전트 terminate + 죽은 leader_processes 레코드 삭제.
 *
 * 대상 (명백한 테스트 잔존):
 *   - Browser Proposal Test
 *   - Ephemeral Proposal
 *   - New Agent / New Agent 2
 *   - Post Hardening Test
 *
 * 그리고 dead leader_processes (status IN ('crashed','stopped')) — Hana 등 Coordinator 의
 * project-scoped 잔존 레코드. PM2 프로세스는 이미 죽어있으므로 DB row 만 정리.
 *
 * Usage:
 *   # dry-run 기본
 *   pnpm tsx scripts/cleanup-agent-noise.ts [--port 3100] [--company-id <id>]
 *
 *   # 실제 적용
 *   pnpm tsx scripts/cleanup-agent-noise.ts --apply
 *
 * 유지 대상 (범위 밖 — 사용자 확인 필요):
 *   - Atlas (CEO Chief of Staff)
 *   - Release Manager (Staff Release Manager) — dogfooding phase 5.2
 *   - Rune (COS Platform Engineer)
 *   - Performance Specialist (Staff PE)
 */

import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

const args = process.argv.slice(2);
const port = (() => {
  const i = args.indexOf("--port");
  return i >= 0 ? Number(args[i + 1]) : 3100;
})();
const companyIdArg = (() => {
  const i = args.indexOf("--company-id");
  return i >= 0 ? args[i + 1] : null;
})();
const dryRun = !args.includes("--apply");

const baseUrl = `http://127.0.0.1:${port}/api`;

const PSQL_BIN = "/opt/homebrew/Cellar/postgresql@17/17.8/bin/psql";
const DB_URL = "postgresql://cloud_admin:cos2026@mac-studio:55433/cos";

async function api<T>(method: string, p: string, body?: unknown): Promise<T> {
  const res = await fetch(`${baseUrl}${p}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${p} failed: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

async function psql(sql: string): Promise<string> {
  const { stdout } = await execFile(PSQL_BIN, [DB_URL, "-At", "-c", sql]);
  return stdout.trim();
}

interface Agent {
  id: string;
  name: string;
  status: string;
  adapterType: string;
  companyId: string;
}

const TEST_NAMES = [
  "Browser Proposal Test",
  "Ephemeral Proposal",
  "New Agent",
  "New Agent 2",
  "Post Hardening Test",
];

async function getCompany(): Promise<{ id: string; name: string }> {
  if (companyIdArg) {
    return await api("GET", `/companies/${companyIdArg}`);
  }
  const companies = await api<Array<{ id: string; name: string }>>("GET", "/companies/");
  if (companies.length === 0) throw new Error("No companies found");
  return companies[0];
}

async function main() {
  console.log("=== COS v2 agent noise cleanup ===");
  console.log(`Mode: ${dryRun ? "DRY RUN (no changes)" : "APPLY (live changes)"}`);

  const company = await getCompany();
  console.log(`Company: ${company.name} (${company.id})\n`);

  const agents = await api<Agent[]>("GET", `/companies/${company.id}/agents`);

  // ───────────────────────────────────────────────────────────────
  // Phase A — 테스트 잔존 에이전트 terminate
  // ───────────────────────────────────────────────────────────────
  console.log("Phase A. 테스트 잔존 에이전트 terminate");
  let terminated = 0;
  for (const name of TEST_NAMES) {
    const agent = agents.find((a) => a.name === name);
    if (!agent) {
      console.log(`  ↺ ${name}: 에이전트 없음`);
      continue;
    }
    if (agent.status === "terminated") {
      console.log(`  ↺ ${name}: 이미 terminated`);
      continue;
    }
    console.log(`  ${dryRun ? "○" : "+"} ${name} (${agent.adapterType}, ${agent.id.slice(0, 8)}) → terminated`);
    if (!dryRun) {
      await api("POST", `/agents/${agent.id}/terminate`);
    }
    terminated++;
  }
  console.log(`  → terminate: ${terminated}건\n`);

  // ───────────────────────────────────────────────────────────────
  // Phase B — dead leader_processes 삭제 (crashed / stopped)
  //   company 전체 스코프. 에이전트 terminate 시 status 는 남아있을 수 있음.
  //   PM2 는 이미 죽어있으므로 row 만 정리.
  // ───────────────────────────────────────────────────────────────
  console.log("Phase B. dead leader_processes 삭제 (status='crashed' or 'stopped')");
  const deadRowsQuery = `
    SELECT lp.id, a.name, lp.status, lp.pm2_name, lp.project_id, lp.exit_reason
    FROM leader_processes lp
    JOIN agents a ON a.id = lp.agent_id
    WHERE a.company_id = '${company.id}'
      AND lp.status IN ('crashed', 'stopped')
    ORDER BY lp.updated_at DESC
  `;
  const deadRowsOut = await psql(deadRowsQuery);
  const deadRows = deadRowsOut
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((line) => {
      const [id, name, status, pm2Name, projectId, exitReason] = line.split("|");
      return { id, name, status, pm2Name, projectId: projectId || null, exitReason: exitReason || null };
    });

  let deletedProcs = 0;
  for (const row of deadRows) {
    const projScope = row.projectId ? `project=${row.projectId.slice(0, 8)}` : "(no project)";
    console.log(
      `  ${dryRun ? "○" : "+"} ${row.name} [${row.status}] ${projScope} pm2=${row.pm2Name ?? "-"} → 삭제`,
    );
    if (!dryRun) {
      await psql(`DELETE FROM leader_processes WHERE id = '${row.id}'`);
    }
    deletedProcs++;
  }
  console.log(`  → delete: ${deletedProcs}건\n`);

  console.log("=== Summary ===");
  console.log(`  Phase A terminate: ${terminated}건`);
  console.log(`  Phase B leader_processes delete: ${deletedProcs}건`);
  if (dryRun) {
    console.log("\n  ⚠ DRY RUN — 실제 변경 없음. --apply 로 실행.");
  } else {
    console.log("\n  ✓ 완료");
  }
}

main().catch((err) => {
  console.error("✗ Cleanup failed:", err);
  process.exit(1);
});

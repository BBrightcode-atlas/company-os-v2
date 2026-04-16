#!/usr/bin/env -S node --import tsx
/**
 * DB 노이즈 정리 — 테스트 잔존 에이전트 terminate + 죽은 leader_processes 레코드 삭제.
 *
 * 대상 (terminate):
 *   테스트 잔재:
 *     - Browser Proposal Test
 *     - Ephemeral Proposal
 *     - New Agent / New Agent 2
 *     - Post Hardening Test
 *   Dogfooding / 실험 잔재:
 *     - Release Manager     (phase 5.2 dogfooding)
 *     - Performance Specialist
 *     - Rune                (COS Platform Engineer 실험)
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
 * 유지 대상:
 *   - Atlas (CEO Chief of Staff) — 루트 에이전트, CEO 대행
 *   - 신 조직 10명 (Sophia/Hana/Rex + Kai/Remy/Vera/Orion/Zion/Blitz/Jett)
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

// terminate 대상 — 테스트 잔재 + 스펙 외 dogfooding/test 에이전트.
// Atlas (CEO Chief of Staff) 는 루트 에이전트로 유지.
const TERMINATE_NAMES = [
  // 명백한 테스트 잔재
  "Browser Proposal Test",
  "Ephemeral Proposal",
  "New Agent",
  "New Agent 2",
  "Post Hardening Test",
  // Dogfooding phase 5.2 / Platform engineer 실험 잔재 (사용자 승인)
  "Release Manager",
  "Performance Specialist",
  "Rune",
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
  for (const name of TERMINATE_NAMES) {
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
  // Phase B — 고아 leader_processes 정리
  //   1) status='crashed'|'stopped' → DB row 만 삭제 (PM2 이미 죽음)
  //   2) agent.status='terminated' 인데 lp.status='running' → PM2 kill + DB row 삭제
  // ───────────────────────────────────────────────────────────────
  console.log("Phase B. 고아 leader_processes 정리 (dead + terminated agent's alive CLI)");
  const orphanRowsQuery = `
    SELECT lp.id, a.name, a.status AS agent_status, lp.status AS cli_status,
           lp.pm2_name, lp.project_id
    FROM leader_processes lp
    JOIN agents a ON a.id = lp.agent_id
    WHERE a.company_id = '${company.id}'
      AND (
        lp.status IN ('crashed', 'stopped')
        OR (a.status = 'terminated' AND lp.status IN ('running', 'starting'))
      )
    ORDER BY a.name, lp.updated_at DESC
  `;
  const orphanRowsOut = await psql(orphanRowsQuery);
  const orphanRows = orphanRowsOut
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((line) => {
      const [id, name, agentStatus, cliStatus, pm2Name, projectId] = line.split("|");
      return {
        id,
        name,
        agentStatus,
        cliStatus,
        pm2Name: pm2Name || null,
        projectId: projectId || null,
      };
    });

  let deletedProcs = 0;
  let pm2Killed = 0;
  for (const row of orphanRows) {
    const projScope = row.projectId ? `project=${row.projectId.slice(0, 8)}` : "(default)";
    const needsKill = row.agentStatus === "terminated" && ["running", "starting"].includes(row.cliStatus);
    const tag = needsKill ? "KILL+DELETE" : "DELETE";
    console.log(
      `  ${dryRun ? "○" : "+"} ${row.name} [agent=${row.agentStatus}, cli=${row.cliStatus}] ${projScope} pm2=${row.pm2Name ?? "-"} → ${tag}`,
    );
    if (!dryRun) {
      if (needsKill && row.pm2Name) {
        try {
          await execFile("pm2", ["delete", row.pm2Name]);
          pm2Killed++;
        } catch (err) {
          console.log(`    ⚠ pm2 delete 실패 (프로세스 이미 없을 수도): ${err instanceof Error ? err.message : err}`);
        }
      }
      await psql(`DELETE FROM leader_processes WHERE id = '${row.id}'`);
    }
    deletedProcs++;
  }
  console.log(`  → pm2 kill: ${pm2Killed}건 / DB row delete: ${deletedProcs}건\n`);

  console.log("=== Summary ===");
  console.log(`  Phase A terminate: ${terminated}건`);
  console.log(`  Phase B pm2 kill: ${pm2Killed}건 / DB row delete: ${deletedProcs}건`);
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

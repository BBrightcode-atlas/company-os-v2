#!/usr/bin/env -S node --import tsx
/**
 * Coordinator 인스트럭션 주입 — Sophia/Hana/Rex 에게 coordinator-playbook.md 를 시스템 프롬프트로 업로드.
 *
 * Claude CLI 는 --append-system-prompt-file 로 agent 의 instructions bundle entry file 을 주입한다.
 * 이 스크립트는 `docs/cos-v2/coordinator-playbook.md` + per-Coordinator 식별 헤더를 조합해서
 * 각 Coordinator 의 entry file 에 업로드한다.
 *
 * Usage:
 *   # dry-run (무엇을 올릴지 출력만)
 *   pnpm tsx scripts/push-coordinator-playbook.ts [--port 3100] [--company-id <id>]
 *
 *   # 실제 업로드
 *   pnpm tsx scripts/push-coordinator-playbook.ts --apply
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

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

interface Agent {
  id: string;
  name: string;
  companyId: string;
  adapterType: string;
}

interface Bundle {
  agentId: string;
  mode: string;
  entryFile: string;
  editable: boolean;
}

const COORDINATORS: Record<string, { team: string; ownedTeamBuckets: string }> = {
  Sophia: { team: "OS (COM)", ownedTeamBuckets: "COM" },
  Hana: { team: "Flotter (FLT)", ownedTeamBuckets: "FLT, ENG3, PLT3, GRW, QA (all Flotter sub-teams)" },
  Rex: { team: "Superbuilder (SB)", ownedTeamBuckets: "SB" },
};

function renderIdentityHeader(name: string, info: { team: string; ownedTeamBuckets: string }): string {
  return `# Coordinator Identity

**Name**: ${name}
**Team**: ${info.team}
**Owned issue buckets**: ${info.ownedTeamBuckets}

당신은 COS v2 의 Coordinator 입니다. 직접 구현은 예외적 경우만 수행하고, 대부분의 작업을 subagent 로 위임합니다.
최종 승인권자이며, Critic verdict 를 통합하고 decisive verification 을 직접 재실행합니다.

다른 Coordinator (${Object.keys(COORDINATORS).filter((n) => n !== name).join(", ")}) 의 미션에 개입하지 않습니다.

---

`;
}

async function getCompany(): Promise<{ id: string; name: string }> {
  if (companyIdArg) {
    return await api("GET", `/companies/${companyIdArg}`);
  }
  const companies = await api<Array<{ id: string; name: string }>>("GET", "/companies/");
  if (companies.length === 0) throw new Error("No companies found");
  return companies[0];
}

async function main() {
  console.log("=== Coordinator playbook push ===");
  console.log(`Mode: ${dryRun ? "DRY RUN (no changes)" : "APPLY (live changes)"}`);

  const playbookPath = path.resolve(process.cwd(), "docs/cos-v2/coordinator-playbook.md");
  const playbookContent = await readFile(playbookPath, "utf8");
  console.log(`Playbook source: ${playbookPath} (${playbookContent.length} chars)\n`);

  const company = await getCompany();
  console.log(`Company: ${company.name} (${company.id})\n`);

  const agents = await api<Agent[]>("GET", `/companies/${company.id}/agents`);

  let pushed = 0;
  let skipped = 0;

  for (const [name, info] of Object.entries(COORDINATORS)) {
    const agent = agents.find((a) => a.name === name);
    if (!agent) {
      console.log(`  ⚠ ${name}: 에이전트 없음 — 건너뜀`);
      skipped++;
      continue;
    }
    if (agent.adapterType !== "claude_local") {
      console.log(`  ⚠ ${name}: adapter=${agent.adapterType} (claude_local 아님) — 건너뜀`);
      skipped++;
      continue;
    }

    let bundle: Bundle;
    try {
      bundle = await api<Bundle>("GET", `/agents/${agent.id}/instructions-bundle`);
    } catch (err) {
      console.log(`  ⚠ ${name}: bundle 조회 실패 — ${err instanceof Error ? err.message : err}`);
      skipped++;
      continue;
    }

    if (!bundle.editable) {
      console.log(`  ⚠ ${name}: bundle editable=false — 건너뜀`);
      skipped++;
      continue;
    }

    const targetPath = bundle.entryFile || "AGENTS.md";
    const content = renderIdentityHeader(name, info) + playbookContent;

    // 1) bundle mode='managed' 로 PATCH — 기존 rootPath 가 잘못된 worktree 경로면 리셋됨
    console.log(`  ${dryRun ? "○" : "+"} ${name}: PATCH bundle mode=managed (rootPath 리셋)`);
    if (!dryRun) {
      await api("PATCH", `/agents/${agent.id}/instructions-bundle`, {
        mode: "managed",
        entryFile: targetPath,
      });
    }

    // 2) entry file 업로드
    console.log(`  ${dryRun ? "○" : "+"} ${name}: PUT /agents/${agent.id.slice(0, 8)}/instructions-bundle/file`);
    console.log(`      path=${targetPath}, content=${content.length} chars`);

    if (!dryRun) {
      await api("PUT", `/agents/${agent.id}/instructions-bundle/file`, {
        path: targetPath,
        content,
        clearLegacyPromptTemplate: true,
      });
    }
    pushed++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`  pushed: ${pushed}, skipped: ${skipped}`);
  if (dryRun) {
    console.log("  ⚠ DRY RUN — 실제 업로드 없음. --apply 로 다시 실행하세요.");
  } else {
    console.log("  ✓ 완료");
  }
}

main().catch((err) => {
  console.error("✗ Push failed:", err);
  process.exit(1);
});

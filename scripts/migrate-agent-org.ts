#!/usr/bin/env -S node --import tsx
/**
 * COS v2 에이전트 조직 마이그레이션 — 기존 DB를 Builder-centric cell 구조로 전환.
 *
 * 작업
 *   1) 10명 유지 에이전트의 title/capabilities 업데이트 (seed 는 skip-existing 이라 직접 PATCH 필요)
 *   2) Flotter 서브팀 (ENG3/PLT3/GRW/QA) lead 해제
 *   3) 은퇴 8명 (Cyrus/Felix/LunaLead/Iris/Lux/Yuna/Nova/Aria) terminate (soft delete)
 *
 * Usage:
 *   # 기본: dry-run (무엇을 바꿀지 로그만 출력)
 *   pnpm tsx scripts/migrate-agent-org.ts [--port 3101] [--company-id <id>]
 *
 *   # 실제 적용
 *   pnpm tsx scripts/migrate-agent-org.ts --apply
 *
 * 안전
 *   - terminate 는 soft delete (status=terminated). 복구 가능.
 *   - hard delete (DELETE /agents/:id) 는 사용하지 않는다 — leader CLI / 히스토리 손실 위험.
 *   - dry-run 이 기본. --apply 명시해야 실행.
 */

const args = process.argv.slice(2);

const port = (() => {
  const i = args.indexOf("--port");
  return i >= 0 ? Number(args[i + 1]) : 3101;
})();
const companyIdArg = (() => {
  const i = args.indexOf("--company-id");
  return i >= 0 ? args[i + 1] : null;
})();
const dryRun = !args.includes("--apply");

const baseUrl = `http://127.0.0.1:${port}/api`;

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 409) {
    const text = await res.text();
    throw new Error(`${method} ${path} failed: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

interface Company { id: string; name: string }
interface Team { id: string; name: string; identifier: string; parentId: string | null; leadAgentId: string | null }
interface Agent {
  id: string;
  name: string;
  title: string | null;
  capabilities: string | null;
  adapterType: string;
  status: string;
  companyId: string;
}

// 유지 에이전트의 새 title/capabilities (seed-cos-v2.ts 와 동기화)
const KEEP_UPDATES: Record<string, { title: string; capabilities: string }> = {
  Sophia: {
    title: "OS Coordinator",
    capabilities: "mission decomposition, brief authoring, fan-out, result integration",
  },
  Hana: {
    title: "Flotter Coordinator",
    capabilities: "mission decomposition, brief authoring, fan-out, result integration",
  },
  Rex: {
    title: "SB Coordinator",
    capabilities: "mission decomposition, brief authoring, fan-out, result integration",
  },
  Kai: {
    title: "Builder",
    capabilities: "implementation across FE/BE/infra/design; skill bundle injected per mission",
  },
  Remy: {
    title: "Reviewer (Static)",
    capabilities: "static diff review, architecture/security/convention checks; read-only, no execution",
  },
  Vera: {
    title: "QA (Dynamic)",
    capabilities: "acceptance scenario execution, test runs, evidence logs; no source edits",
  },
  Orion: {
    title: "Scout",
    capabilities: "read-only code exploration, log gathering, external research",
  },
  Zion: {
    title: "UI Verifier",
    capabilities: "Playwright/browser-based visual & interaction verification; UI missions only",
  },
  Blitz: {
    title: "Perf Checker",
    capabilities: "performance benchmarking against harness; spawn only when harness exists",
  },
  Jett: {
    title: "Infra Operator",
    capabilities: "deployment & observability with elevated permissions; spawn when deploy judgment needed",
  },
};

const RETIRE_NAMES = ["Cyrus", "Felix", "LunaLead", "Iris", "Lux", "Yuna", "Nova", "Aria"];

// Flotter 서브팀 식별자 (이슈 버킷으로 유지 · lead 제거)
const SUBTEAM_IDENTIFIERS = ["ENG3", "PLT3", "GRW", "QA"];

async function getCompany(): Promise<Company> {
  if (companyIdArg) {
    return await api<Company>("GET", `/companies/${companyIdArg}`);
  }
  const companies = await api<Company[]>("GET", "/companies/");
  if (companies.length === 0) throw new Error("No companies found");
  if (companies.length > 1 && !companyIdArg) {
    console.warn(`  ⚠ ${companies.length} companies found, using first: ${companies[0].name}`);
  }
  return companies[0];
}

async function listAgents(companyId: string): Promise<Agent[]> {
  return await api<Agent[]>("GET", `/companies/${companyId}/agents`);
}

async function listTeams(companyId: string): Promise<Team[]> {
  return await api<Team[]>("GET", `/companies/${companyId}/teams`);
}

async function patchAgent(
  _companyId: string,
  agentId: string,
  patch: { title?: string; capabilities?: string },
): Promise<void> {
  if (dryRun) return;
  await api<Agent>("PATCH", `/agents/${agentId}`, patch);
}

async function terminateAgent(agentId: string): Promise<void> {
  if (dryRun) return;
  await api<Agent>("POST", `/agents/${agentId}/terminate`);
}

async function clearTeamLead(companyId: string, teamId: string): Promise<void> {
  if (dryRun) return;
  await api<Team>("PATCH", `/companies/${companyId}/teams/${teamId}`, { leadAgentId: null });
}

async function main() {
  console.log("=== COS v2 agent org migration ===");
  console.log(`Mode: ${dryRun ? "DRY RUN (no changes)" : "APPLY (live changes)"}`);

  const company = await getCompany();
  console.log(`Company: ${company.name} (${company.id})\n`);

  const [agents, teams] = await Promise.all([listAgents(company.id), listTeams(company.id)]);

  // ───────────────────────────────────────────────────────────────
  // Phase 1 — 유지 에이전트 title/capabilities 업데이트
  // ───────────────────────────────────────────────────────────────
  console.log("Phase 1. 유지 에이전트 title/capabilities 업데이트");
  let updatedCount = 0;
  let skipped = 0;
  for (const [name, target] of Object.entries(KEEP_UPDATES)) {
    const agent = agents.find((a) => a.name === name);
    if (!agent) {
      console.log(`  ⚠ ${name}: 에이전트 없음 (seed 먼저 돌리세요)`);
      continue;
    }
    if (agent.status === "terminated") {
      console.log(`  ⚠ ${name}: terminated 상태 — 건너뜀`);
      continue;
    }
    const titleChanged = agent.title !== target.title;
    const capsChanged = agent.capabilities !== target.capabilities;
    if (!titleChanged && !capsChanged) {
      console.log(`  ↺ ${name}: 변경 없음`);
      skipped++;
      continue;
    }
    const diff: string[] = [];
    if (titleChanged) diff.push(`title: "${agent.title ?? "-"}" → "${target.title}"`);
    if (capsChanged) diff.push(`capabilities: 업데이트`);
    console.log(`  ${dryRun ? "○" : "+"} ${name}: ${diff.join(" | ")}`);
    await patchAgent(company.id, agent.id, target);
    updatedCount++;
  }
  console.log(`  → 업데이트: ${updatedCount}건, 동일: ${skipped}건\n`);

  // ───────────────────────────────────────────────────────────────
  // Phase 2 — Flotter 서브팀 lead 해제
  // ───────────────────────────────────────────────────────────────
  console.log("Phase 2. Flotter 서브팀 lead 해제 (ENG3/PLT3/GRW/QA)");
  let leadsCleared = 0;
  for (const ident of SUBTEAM_IDENTIFIERS) {
    const team = teams.find((t) => t.identifier === ident);
    if (!team) {
      console.log(`  ⚠ ${ident}: 팀 없음`);
      continue;
    }
    if (!team.leadAgentId) {
      console.log(`  ↺ ${ident}: 이미 lead 없음`);
      continue;
    }
    const leadAgent = agents.find((a) => a.id === team.leadAgentId);
    const leadName = leadAgent?.name ?? team.leadAgentId.slice(0, 8);
    console.log(`  ${dryRun ? "○" : "+"} ${ident}: lead = ${leadName} → null`);
    await clearTeamLead(company.id, team.id);
    leadsCleared++;
  }
  console.log(`  → lead 해제: ${leadsCleared}건\n`);

  // ───────────────────────────────────────────────────────────────
  // Phase 3 — 은퇴 에이전트 terminate (soft delete)
  // ───────────────────────────────────────────────────────────────
  console.log("Phase 3. 은퇴 에이전트 terminate (soft delete)");
  let retiredCount = 0;
  for (const name of RETIRE_NAMES) {
    const agent = agents.find((a) => a.name === name);
    if (!agent) {
      console.log(`  ↺ ${name}: 에이전트 없음 (이미 정리됨?)`);
      continue;
    }
    if (agent.status === "terminated") {
      console.log(`  ↺ ${name}: 이미 terminated`);
      continue;
    }
    console.log(
      `  ${dryRun ? "○" : "+"} ${name} (${agent.adapterType}, status=${agent.status}) → terminated`,
    );
    await terminateAgent(agent.id);
    retiredCount++;
  }
  console.log(`  → terminate: ${retiredCount}건\n`);

  // ───────────────────────────────────────────────────────────────
  // 요약
  // ───────────────────────────────────────────────────────────────
  console.log("=== Summary ===");
  console.log(`  Phase 1 업데이트: ${updatedCount}건 (동일 ${skipped}건)`);
  console.log(`  Phase 2 lead 해제: ${leadsCleared}건`);
  console.log(`  Phase 3 terminate: ${retiredCount}건`);
  if (dryRun) {
    console.log("\n  ⚠ DRY RUN — 실제 변경은 없음. --apply 로 다시 실행하세요.");
  } else {
    console.log("\n  ✓ 완료");
  }
}

main().catch((err) => {
  console.error("✗ Migration failed:", err);
  process.exit(1);
});

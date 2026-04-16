#!/usr/bin/env -S node --import tsx
/**
 * COS v2 seed script — Builder-centric cell 구조 (simple × powerful).
 *
 * 조직 모델
 *   - 팀 = 이슈 버킷 (에이전트 역할과 분리)
 *   - Coordinator 3명 (claude_local · CLI · 최종 승인권자)
 *   - 에이전트 풀 (team-agnostic · 미션별 spawn)
 *       · Builder  1명: Kai   — 통합 구현자
 *       · Critic   2명: Remy (Static Reviewer), Vera (Dynamic QA)  — 병렬 fan-out · 서로 격리
 *       · Scout    1명: Orion — read-only 탐색 · 값싼 리서치
 *   - Specialist 3명 (조건부 · tool/권한 차별성 있을 때만 spawn)
 *       · Zion   — UI Verifier (Playwright)
 *       · Blitz  — Perf Checker (harness 존재 시)
 *       · Jett   — Infra Operator (배포 권한)
 *
 * Usage:
 *   pnpm tsx scripts/seed-cos-v2.ts [--port 3101] [--company-id <id>]
 *
 * Idempotent: skips entities that already exist by name/identifier.
 * 기존 DB 에 은퇴 에이전트(Cyrus/Felix/LunaLead/Iris/Lux/Yuna/Nova/Aria)가
 * 남아 있다면 이 스크립트는 건드리지 않는다. 정리는 별도 마이그레이션/수동.
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
interface Team { id: string; name: string; identifier: string; parentId: string | null }
interface Agent { id: string; name: string }

async function getOrCreateCompany(): Promise<Company> {
  if (companyIdArg) {
    const company = await api<Company>("GET", `/companies/${companyIdArg}`);
    return company;
  }
  const companies = await api<Company[]>("GET", "/companies/");
  if (companies.length > 0) return companies[0];
  return await api<Company>("POST", "/companies/", { name: "BBrightcode Corp" });
}

async function getOrCreateTeam(
  companyId: string,
  spec: { name: string; identifier: string; parentId?: string | null; color?: string },
): Promise<Team> {
  const teams = await api<Team[]>("GET", `/companies/${companyId}/teams`);
  const existing = teams.find((t) => t.identifier === spec.identifier);
  if (existing) {
    console.log(`  ↺ team ${spec.identifier} already exists (${existing.id.slice(0, 8)})`);
    return existing;
  }
  const team = await api<Team>("POST", `/companies/${companyId}/teams`, {
    name: spec.name,
    identifier: spec.identifier,
    parentId: spec.parentId ?? null,
    color: spec.color ?? null,
  });
  console.log(`  + team ${spec.identifier}: ${spec.name}`);
  return team;
}

async function getOrCreateAgent(
  companyId: string,
  spec: {
    name: string;
    role?: string;
    title?: string;
    adapterType?: string;
    capabilities?: string;
  },
): Promise<Agent> {
  const agents = await api<Agent[]>("GET", `/companies/${companyId}/agents`);
  const existing = agents.find((a) => a.name === spec.name);
  if (existing) {
    console.log(`  ↺ agent ${spec.name} already exists`);
    return existing;
  }
  const agent = await api<Agent>("POST", `/companies/${companyId}/agents`, {
    name: spec.name,
    role: spec.role ?? "general",
    title: spec.title ?? null,
    adapterType: spec.adapterType ?? "claude_local",
    capabilities: spec.capabilities ?? null,
  });
  console.log(`  + agent ${spec.name} (${spec.adapterType ?? "claude_local"})`);
  return agent;
}

async function setTeamLead(companyId: string, teamId: string, leadAgentId: string) {
  await api<Team>("PATCH", `/companies/${companyId}/teams/${teamId}`, { leadAgentId });
}

async function main() {
  console.log("=== COS v2 seed ===");

  const company = await getOrCreateCompany();
  console.log(`Company: ${company.name} (${company.id})`);

  // 1) Top-level teams
  console.log("\n1. Creating top-level teams");
  const osTeam = await getOrCreateTeam(company.id, {
    name: "OS",
    identifier: "COM",
    color: "#0EA5E9",
  });
  const flotterTeam = await getOrCreateTeam(company.id, {
    name: "Flotter",
    identifier: "FLT",
    color: "#8B5CF6",
  });
  const sbTeam = await getOrCreateTeam(company.id, {
    name: "Superbuilder",
    identifier: "SB",
    color: "#10B981",
  });

  // 2) Flotter sub-teams
  console.log("\n2. Creating Flotter sub-teams");
  const engTeam = await getOrCreateTeam(company.id, {
    name: "Engine",
    identifier: "ENG3",
    parentId: flotterTeam.id,
    color: "#3B82F6",
  });
  const pltTeam = await getOrCreateTeam(company.id, {
    name: "Platform",
    identifier: "PLT3",
    parentId: flotterTeam.id,
    color: "#A855F7",
  });
  const grwTeam = await getOrCreateTeam(company.id, {
    name: "Growth",
    identifier: "GRW",
    parentId: flotterTeam.id,
    color: "#F59E0B",
  });
  const qaTeam = await getOrCreateTeam(company.id, {
    name: "QA",
    identifier: "QA",
    parentId: flotterTeam.id,
    color: "#EF4444",
  });

  // 3) Coordinator agents (claude_local, CLI, 인간 접점)
  //    — 최종 승인권자. 미션 분해 / brief 작성 / fan-out / 통합 담당.
  //    — 서브팀(ENG3/PLT3/GRW/QA) lead 은 제거. Hana 가 FLT 전체 coordinator.
  console.log("\n3. Creating coordinator agents");
  const sophia = await getOrCreateAgent(company.id, {
    name: "Sophia",
    title: "OS Coordinator",
    adapterType: "claude_local",
    capabilities: "mission decomposition, brief authoring, fan-out, result integration",
  });
  const hana = await getOrCreateAgent(company.id, {
    name: "Hana",
    title: "Flotter Coordinator",
    adapterType: "claude_local",
    capabilities: "mission decomposition, brief authoring, fan-out, result integration",
  });
  const rex = await getOrCreateAgent(company.id, {
    name: "Rex",
    title: "SB Coordinator",
    adapterType: "claude_local",
    capabilities: "mission decomposition, brief authoring, fan-out, result integration",
  });

  // 4) 에이전트 풀 (team-agnostic · 미션별 spawn · team membership 없음)
  //    — Builder 1 + Critic 2 + Scout 1 이 상시 풀
  //    — skill bundle 과 tool whitelist 는 미션 brief 에서 주입
  console.log("\n4. Creating agent pool (team-agnostic)");

  // Builder — 통합 구현자 (FE/BE/infra/design 전부, skill bundle 로 차별화)
  const kai = await getOrCreateAgent(company.id, {
    name: "Kai",
    title: "Builder",
    adapterType: "process",
    capabilities: "implementation across FE/BE/infra/design; skill bundle injected per mission",
  });

  // Critic — Static (Reviewer) · 실행 금지 · diff 리뷰 전용
  const remy = await getOrCreateAgent(company.id, {
    name: "Remy",
    title: "Reviewer (Static)",
    adapterType: "process",
    capabilities: "static diff review, architecture/security/convention checks; read-only, no execution",
  });

  // Critic — Dynamic (QA) · Edit 금지 · 실행/검증 전용
  const vera = await getOrCreateAgent(company.id, {
    name: "Vera",
    title: "QA (Dynamic)",
    adapterType: "process",
    capabilities: "acceptance scenario execution, test runs, evidence logs; no source edits",
  });

  // Scout — read-only 탐색 · 값싼 리서치 · Edit/Write 금지
  const orion = await getOrCreateAgent(company.id, {
    name: "Orion",
    title: "Scout",
    adapterType: "process",
    capabilities: "read-only code exploration, log gathering, external research",
  });

  // 5) Specialist (조건부 · 실제 tool/권한 차별성 있을 때만 spawn)
  //    — UI 미션 / perf harness 존재 / 배포 판단 필요 시에만 호출
  console.log("\n5. Creating conditional specialists");

  const zion = await getOrCreateAgent(company.id, {
    name: "Zion",
    title: "UI Verifier",
    adapterType: "process",
    capabilities: "Playwright/browser-based visual & interaction verification; UI missions only",
  });

  const blitz = await getOrCreateAgent(company.id, {
    name: "Blitz",
    title: "Perf Checker",
    adapterType: "process",
    capabilities: "performance benchmarking against harness; spawn only when harness exists",
  });

  const jett = await getOrCreateAgent(company.id, {
    name: "Jett",
    title: "Infra Operator",
    adapterType: "process",
    capabilities: "deployment & observability with elevated permissions; spawn when deploy judgment needed",
  });

  // 6) 팀 = 이슈 버킷 (역할과 분리).
  //    — Top-level 팀에만 lead 배정. 서브팀은 lead 없음.
  //    — 풀/Specialist 에이전트는 팀 membership 없음 (team-agnostic).
  console.log("\n6. Assigning team leads (top-level only)");
  console.log(`  ${osTeam.identifier}: lead = Sophia`);
  await setTeamLead(company.id, osTeam.id, sophia.id);
  console.log(`  ${flotterTeam.identifier}: lead = Hana (ENG3/PLT3/GRW/QA 전부 통합)`);
  await setTeamLead(company.id, flotterTeam.id, hana.id);
  console.log(`  ${sbTeam.identifier}: lead = Rex`);
  await setTeamLead(company.id, sbTeam.id, rex.id);
  console.log(`  ${engTeam.identifier} / ${pltTeam.identifier} / ${grwTeam.identifier} / ${qaTeam.identifier}: 이슈 버킷 전용 (lead 없음)`);

  console.log("\n✓ Seed complete");
  console.log("   Coordinator 3 · Builder 1 · Critic 2 · Scout 1 · Specialist 3 = 10 agents");
  console.log("   은퇴: Cyrus / Felix / LunaLead / Iris / Lux / Yuna / Nova / Aria");
  console.log("   ↑ 기존 DB 에는 남아있을 수 있음. 정리는 별도 마이그레이션 스크립트 또는 수동.");
}

main().catch((err) => {
  console.error("✗ Seed failed:", err);
  process.exit(1);
});

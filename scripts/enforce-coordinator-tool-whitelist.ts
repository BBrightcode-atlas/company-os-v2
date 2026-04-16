#!/usr/bin/env -S node --import tsx
/**
 * Coordinator 물리 tool 제약 적용.
 *
 * MASFT (arXiv 2503.13657) 의 "Disobey role specification" 실패 재현 관찰:
 * Playbook 으로 "직접 수정하지 말고 cos-builder 에게 위임" 지시해도
 * Coordinator 가 여전히 Edit/Write 를 사용해 직접 수정.
 *
 * 해결: Claude CLI 의 --disallowed-tools 플래그로 물리적으로 차단.
 *
 * adapterConfig.extraArgs 에 ["--disallowed-tools", "Edit Write"] 주입.
 * Bash 는 허용 유지 (git/test/build/paperclipai CLI 용).
 *
 * Usage:
 *   pnpm tsx scripts/enforce-coordinator-tool-whitelist.ts [--port 3100] [--company-id <id>]
 *   pnpm tsx scripts/enforce-coordinator-tool-whitelist.ts --apply
 *
 * 효과:
 *   - Coordinator 가 Edit/Write tool 호출 시 Claude CLI 가 거부
 *   - 파일 수정 하려면 Task(cos-builder) 로 위임 강제
 *   - Bash 는 허용 (test 실행, paperclipai CLI 사용)
 */

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

// Coordinator 에게 금지할 tool 목록.
// Edit/Write 는 cos-builder 에게 위임 강제.
// Bash 는 허용 (paperclipai CLI + git + test 필요).
// Task 는 명시 안 함 = 허용.
const DISALLOWED_TOOLS = ["Edit", "Write", "NotebookEdit"];

const COORDINATOR_NAMES = ["Sophia", "Hana", "Rex"];

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
  adapterType: string;
  adapterConfig: Record<string, unknown>;
}

async function getCompany(): Promise<{ id: string; name: string }> {
  if (companyIdArg) {
    return await api("GET", `/companies/${companyIdArg}`);
  }
  const companies = await api<Array<{ id: string; name: string }>>("GET", "/companies/");
  return companies[0];
}

function mergeExtraArgs(existing: unknown, disallowed: string[]): string[] {
  const base = Array.isArray(existing)
    ? (existing as string[]).filter((v) => typeof v === "string")
    : [];
  // 기존 --disallowed-tools 관련 args 제거 후 새로 추가
  const cleaned: string[] = [];
  let skipNext = false;
  for (const arg of base) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    if (arg === "--disallowed-tools" || arg === "--disallowedTools") {
      skipNext = true;
      continue;
    }
    cleaned.push(arg);
  }
  cleaned.push("--disallowed-tools", disallowed.join(","));
  return cleaned;
}

async function main() {
  console.log("=== Coordinator tool whitelist 물리 제약 ===");
  console.log(`Mode: ${dryRun ? "DRY RUN (no changes)" : "APPLY (live changes)"}`);
  console.log(`Disallowed tools: ${DISALLOWED_TOOLS.join(", ")}`);

  const company = await getCompany();
  console.log(`Company: ${company.name} (${company.id})\n`);

  const agents = await api<Agent[]>("GET", `/companies/${company.id}/agents`);

  let applied = 0;
  let skipped = 0;
  for (const name of COORDINATOR_NAMES) {
    const agent = agents.find((a) => a.name === name);
    if (!agent) {
      console.log(`  ⚠ ${name}: 에이전트 없음`);
      skipped++;
      continue;
    }
    if (agent.adapterType !== "claude_local") {
      console.log(`  ⚠ ${name}: adapter=${agent.adapterType} — 건너뜀`);
      skipped++;
      continue;
    }

    const existingExtraArgs = (agent.adapterConfig as Record<string, unknown>)?.extraArgs;
    const newExtraArgs = mergeExtraArgs(existingExtraArgs, DISALLOWED_TOOLS);

    const existingStr = JSON.stringify(existingExtraArgs ?? []);
    const newStr = JSON.stringify(newExtraArgs);
    if (existingStr === newStr) {
      console.log(`  ↺ ${name}: 이미 적용됨`);
      skipped++;
      continue;
    }

    console.log(`  ${dryRun ? "○" : "+"} ${name}`);
    console.log(`      before: ${existingStr}`);
    console.log(`      after:  ${newStr}`);

    if (!dryRun) {
      await api("PATCH", `/agents/${agent.id}`, {
        adapterConfig: { extraArgs: newExtraArgs },
      });
    }
    applied++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`  applied: ${applied}, skipped: ${skipped}`);
  if (!dryRun) {
    console.log("\n  ⚠ 적용 후 Coordinator CLI 재시작 필요:");
    console.log("     POST /companies/:cid/agents/:aid/cli/restart");
  }
}

main().catch((err) => {
  console.error("✗ Failed:", err);
  process.exit(1);
});

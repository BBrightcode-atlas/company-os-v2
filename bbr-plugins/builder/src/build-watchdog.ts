import type { PluginContext } from "@paperclipai/plugin-sdk";
import { ALLOWED_COMPANY_ID, PLUGIN_ID } from "./blueprint/contract.js";

export const BUILD_WATCHDOG_JOB_KEY = "build-progress-watchdog";
// 순차 체인은 blocker 완료 시 호스트가 dependent를 자동 wake한다. watchdog은 그
// 자동 체이닝이 끊기는 두 경우만 복구한다:
// (a) 실패 run이 retry 소진 후 recovery가 이슈를 blocked로 주차 → blocker가 이미
//     끝났으면 todo로 되돌리고 재-wake (체인 재개)
// (b) ready 상태(todo/in_progress)인데 live run 없이 장시간 방치 → 재-wake 넛지
export const WATCHDOG_STALL_THRESHOLD_MS = 10 * 60 * 1000;
export const WATCHDOG_MIN_NUDGE_INTERVAL_MS = 30 * 60 * 1000;
export const WATCHDOG_MAX_REVIVES_PER_ISSUE = 3;

const WATCHDOG_ISSUE_STATE_KEY = "build-watchdog";

type WatchdogIssueState = {
  reviveCount?: number;
  lastNudgeAt?: string;
};

type WatchdogSummary = {
  scanned: number;
  revived: string[];
  nudged: string[];
  exhausted: string[];
};

function issueStateScope(issueId: string) {
  return { scopeKind: "issue" as const, scopeId: issueId, stateKey: WATCHDOG_ISSUE_STATE_KEY };
}

function asDateMs(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

async function readIssueState(ctx: PluginContext, issueId: string): Promise<WatchdogIssueState> {
  const raw = await ctx.state.get(issueStateScope(issueId));
  return raw && typeof raw === "object" ? raw as WatchdogIssueState : {};
}

async function writeIssueState(ctx: PluginContext, issueId: string, state: WatchdogIssueState): Promise<void> {
  await ctx.state.set(issueStateScope(issueId), state);
}

export async function runBuildWatchdog(ctx: PluginContext, now: Date = new Date()): Promise<WatchdogSummary> {
  const companyId = ALLOWED_COMPANY_ID;
  const summary: WatchdogSummary = { scanned: 0, revived: [], nudged: [], exhausted: [] };

  const issues = await ctx.issues.list({
    companyId,
    originKindPrefix: `plugin:${PLUGIN_ID}`,
    limit: 500,
  });

  for (const issue of issues) {
    if (issue.status === "done" || issue.status === "cancelled" || issue.status === "backlog") continue;
    if (!issue.assigneeAgentId) continue;
    summary.scanned += 1;

    const relations = await ctx.issues.relations.get(issue.id, companyId);
    const blockers = relations.blockedBy ?? [];
    const unresolved = blockers.filter((blocker) => blocker.status !== "done");
    if (unresolved.length > 0) continue; // 아직 순번 아님 — 호스트 dependency gate에 맡긴다

    if (issue.status === "blocked") {
      // (a) recovery가 주차한 이슈: blocker가 모두 끝났으면 체인 재개
      const state = await readIssueState(ctx, issue.id);
      const reviveCount = state.reviveCount ?? 0;
      if (reviveCount >= WATCHDOG_MAX_REVIVES_PER_ISSUE) {
        summary.exhausted.push(issue.id);
        continue;
      }
      await ctx.issues.update(issue.id, { status: "todo" }, companyId);
      await ctx.issues.requestWakeup(issue.id, companyId, {
        reason: "builder-watchdog: blockers resolved, resuming stalled chain",
        idempotencyKey: `${BUILD_WATCHDOG_JOB_KEY}:revive:${issue.id}:${reviveCount + 1}`,
      });
      await writeIssueState(ctx, issue.id, { ...state, reviveCount: reviveCount + 1, lastNudgeAt: now.toISOString() });
      summary.revived.push(issue.id);
      continue;
    }

    // (b) ready인데 live run 없이 STALL_THRESHOLD 이상 방치된 이슈 넛지
    if (issue.executionRunId) continue;
    const updatedAtMs = asDateMs(issue.updatedAt);
    if (updatedAtMs === null || now.getTime() - updatedAtMs < WATCHDOG_STALL_THRESHOLD_MS) continue;

    const state = await readIssueState(ctx, issue.id);
    const lastNudgeMs = asDateMs(state.lastNudgeAt);
    if (lastNudgeMs !== null && now.getTime() - lastNudgeMs < WATCHDOG_MIN_NUDGE_INTERVAL_MS) continue;

    await ctx.issues.requestWakeup(issue.id, companyId, {
      reason: "builder-watchdog: ready issue idle without a live run",
      idempotencyKey: `${BUILD_WATCHDOG_JOB_KEY}:nudge:${issue.id}:${now.toISOString().slice(0, 13)}`,
    });
    await writeIssueState(ctx, issue.id, { ...state, lastNudgeAt: now.toISOString() });
    summary.nudged.push(issue.id);
  }

  return summary;
}

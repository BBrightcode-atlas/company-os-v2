import { describe, expect, it, vi } from "vitest";
import {
  runBuildWatchdog,
  WATCHDOG_MAX_REVIVES_PER_ISSUE,
  WATCHDOG_MIN_NUDGE_INTERVAL_MS,
  WATCHDOG_STALL_THRESHOLD_MS,
} from "../src/build-watchdog.js";
import { ALLOWED_COMPANY_ID } from "../src/blueprint/contract.js";

type FakeIssue = {
  id: string;
  status: string;
  assigneeAgentId: string | null;
  executionRunId: string | null;
  updatedAt: Date;
};

function makeCtx(input: {
  issues: FakeIssue[];
  blockersByIssue?: Record<string, Array<{ id: string; status: string }>>;
  state?: Record<string, unknown>;
}) {
  const state = new Map<string, unknown>(Object.entries(input.state ?? {}));
  const updates: Array<{ issueId: string; patch: unknown }> = [];
  const wakeups: Array<{ issueId: string; reason?: string }> = [];
  return {
    ctx: {
      issues: {
        list: vi.fn(async () => input.issues),
        update: vi.fn(async (issueId: string, patch: unknown) => {
          updates.push({ issueId, patch });
          return { id: issueId };
        }),
        requestWakeup: vi.fn(async (issueId: string, _companyId: string, options?: { reason?: string }) => {
          wakeups.push({ issueId, reason: options?.reason });
          return { queued: true, runId: null };
        }),
        relations: {
          get: vi.fn(async (issueId: string) => ({
            blockedBy: input.blockersByIssue?.[issueId] ?? [],
            blocks: [],
          })),
        },
      },
      state: {
        get: vi.fn(async (scope: { scopeId?: string }) => state.get(scope.scopeId ?? "") ?? null),
        set: vi.fn(async (scope: { scopeId?: string }, value: unknown) => {
          state.set(scope.scopeId ?? "", value);
        }),
      },
    },
    updates,
    wakeups,
    state,
  };
}

const NOW = new Date("2026-07-02T12:00:00Z");

function issue(partial: Partial<FakeIssue> & { id: string }): FakeIssue {
  return {
    status: "todo",
    assigneeAgentId: "agent-1",
    executionRunId: null,
    updatedAt: NOW,
    ...partial,
  };
}

describe("build watchdog", () => {
  it("blocker가 모두 done인 blocked 이슈를 todo로 되돌리고 재-wake한다", async () => {
    const { ctx, updates, wakeups } = makeCtx({
      issues: [issue({ id: "iss-1", status: "blocked" })],
      blockersByIssue: { "iss-1": [{ id: "dep-1", status: "done" }] },
    });
    const summary = await runBuildWatchdog(ctx as never, NOW);
    expect(summary.revived).toEqual(["iss-1"]);
    expect(updates).toEqual([{ issueId: "iss-1", patch: { status: "todo" } }]);
    expect(wakeups).toHaveLength(1);
  });

  it("blocker가 아직 안 끝난 이슈는 건드리지 않는다 (순차 보존)", async () => {
    const { ctx, updates, wakeups } = makeCtx({
      issues: [issue({ id: "iss-1", status: "blocked" })],
      blockersByIssue: { "iss-1": [{ id: "dep-1", status: "in_progress" }] },
    });
    const summary = await runBuildWatchdog(ctx as never, NOW);
    expect(summary.revived).toEqual([]);
    expect(updates).toHaveLength(0);
    expect(wakeups).toHaveLength(0);
  });

  it("revive 한도를 소진한 이슈는 exhausted로 보고만 한다", async () => {
    const { ctx, wakeups } = makeCtx({
      issues: [issue({ id: "iss-1", status: "blocked" })],
      state: { "iss-1": { reviveCount: WATCHDOG_MAX_REVIVES_PER_ISSUE } },
    });
    const summary = await runBuildWatchdog(ctx as never, NOW);
    expect(summary.exhausted).toEqual(["iss-1"]);
    expect(wakeups).toHaveLength(0);
  });

  it("ready인데 live run 없이 방치된 이슈를 넛지한다", async () => {
    const stale = new Date(NOW.getTime() - WATCHDOG_STALL_THRESHOLD_MS - 1000);
    const { ctx, wakeups } = makeCtx({
      issues: [issue({ id: "iss-1", status: "todo", updatedAt: stale })],
    });
    const summary = await runBuildWatchdog(ctx as never, NOW);
    expect(summary.nudged).toEqual(["iss-1"]);
    expect(wakeups).toHaveLength(1);
  });

  it("live run이 있는 이슈는 넛지하지 않는다", async () => {
    const stale = new Date(NOW.getTime() - WATCHDOG_STALL_THRESHOLD_MS - 1000);
    const { ctx, wakeups } = makeCtx({
      issues: [issue({ id: "iss-1", status: "in_progress", executionRunId: "run-1", updatedAt: stale })],
    });
    await runBuildWatchdog(ctx as never, NOW);
    expect(wakeups).toHaveLength(0);
  });

  it("최근에 넛지한 이슈는 최소 간격 전까지 다시 넛지하지 않는다", async () => {
    const stale = new Date(NOW.getTime() - WATCHDOG_STALL_THRESHOLD_MS - 1000);
    const recentNudge = new Date(NOW.getTime() - WATCHDOG_MIN_NUDGE_INTERVAL_MS + 60_000);
    const { ctx, wakeups } = makeCtx({
      issues: [issue({ id: "iss-1", status: "todo", updatedAt: stale })],
      state: { "iss-1": { lastNudgeAt: recentNudge.toISOString() } },
    });
    await runBuildWatchdog(ctx as never, NOW);
    expect(wakeups).toHaveLength(0);
  });

  it("done/cancelled/backlog/미배정 이슈는 스캔하지 않는다", async () => {
    const { ctx, wakeups } = makeCtx({
      issues: [
        issue({ id: "iss-done", status: "done" }),
        issue({ id: "iss-cancelled", status: "cancelled" }),
        issue({ id: "iss-backlog", status: "backlog" }),
        issue({ id: "iss-unassigned", status: "blocked", assigneeAgentId: null }),
      ],
    });
    const summary = await runBuildWatchdog(ctx as never, NOW);
    expect(summary.scanned).toBe(0);
    expect(wakeups).toHaveLength(0);
  });

  it("BBR 회사 스코프로 이슈를 조회한다", async () => {
    const { ctx } = makeCtx({ issues: [] });
    await runBuildWatchdog(ctx as never, NOW);
    expect(ctx.issues.list).toHaveBeenCalledWith(expect.objectContaining({ companyId: ALLOWED_COMPANY_ID }));
  });
});

import { describe, expect, it, beforeEach, vi } from "vitest";
import { createFakeProcessBackend } from "../services/process-backend-fake.js";
import {
  createLeaderProcessService,
  type LeaderWorkspaceProvisioner,
} from "../services/leader-processes.js";
import type { AgentSessionRecord, AgentSessionService } from "../services/agent-sessions.js";

/**
 * Unit tests for leaderProcessService state machine + mutex behavior.
 *
 * All external deps (db, sessions, workspace, process backend) are
 * either mocked or stubbed in-memory so the tests run instantly
 * without touching the real filesystem or Postgres.
 */

/* ---------- In-memory db stub ---------- */

interface LeaderRow {
  id: string;
  companyId: string;
  agentId: string;
  sessionId: string | null;
  status: string;
  pm2Name: string | null;
  pm2PmId: number | null;
  pid: number | null;
  agentKeyId: string | null;
  startedAt: Date | null;
  stoppedAt: Date | null;
  lastHeartbeatAt: Date | null;
  exitCode: number | null;
  exitReason: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function makeStubDb() {
  const rows: LeaderRow[] = [];

  // Build a chainable stub that returns test data for the minimal
  // surface the service uses: select/insert/update/delete with where().
  const db: any = {
    select: (_shape?: unknown) => ({
      from: (_tbl: unknown) => ({
        where: (cond: any) => ({
          limit: (_n: number) => Promise.resolve(filterRows(rows, cond)),
          then: (cb: any) => Promise.resolve(filterRows(rows, cond)).then(cb),
        }),
        then: (cb: any) => Promise.resolve(rows).then(cb),
      }),
    }),
    insert: (_tbl: unknown) => ({
      values: (vals: Partial<LeaderRow>) => ({
        returning: () => {
          const row: LeaderRow = {
            id: `row-${rows.length + 1}`,
            companyId: vals.companyId ?? "",
            agentId: vals.agentId ?? "",
            sessionId: null,
            status: vals.status ?? "stopped",
            pm2Name: null,
            pm2PmId: null,
            pid: null,
            agentKeyId: null,
            startedAt: null,
            stoppedAt: null,
            lastHeartbeatAt: null,
            exitCode: null,
            exitReason: null,
            errorMessage: null,
            createdAt: vals.createdAt ?? new Date(),
            updatedAt: vals.updatedAt ?? new Date(),
            ...(vals as any),
          };
          rows.push(row);
          return Promise.resolve([row]);
        },
      }),
    }),
    update: (_tbl: unknown) => ({
      set: (patch: Partial<LeaderRow>) => ({
        where: (cond: any) => ({
          returning: () => {
            const matched = filterRows(rows, cond);
            for (const r of matched) {
              Object.assign(r, patch);
            }
            return Promise.resolve(matched);
          },
        }),
      }),
    }),
    delete: (_tbl: unknown) => ({
      where: (cond: any) => {
        const matched = filterRows(rows, cond);
        for (const r of matched) {
          const i = rows.indexOf(r);
          if (i >= 0) rows.splice(i, 1);
        }
        return Promise.resolve();
      },
    }),
    // Test helpers
    _rows: rows,
    _reset() { rows.length = 0; },
  };
  return db;
}

// Crude matcher — we only filter by agentId or companyId in this service.
function filterRows(rows: LeaderRow[], cond: any): LeaderRow[] {
  if (!cond) return rows.slice();
  const condStr = String(cond);
  // drizzle's eq() returns an opaque SQL object; we grep its stringified form
  const match = condStr.match(/agent_id.*?=.*?['"]?([a-z0-9-]+)['"]?/i);
  const companyMatch = condStr.match(/company_id.*?=.*?['"]?([a-z0-9-]+)['"]?/i);
  if (match && match[1]) {
    return rows.filter((r) => r.agentId === match[1]);
  }
  if (companyMatch && companyMatch[1]) {
    return rows.filter((r) => r.companyId === companyMatch[1]);
  }
  return rows.slice();
}

/* ---------- Fake deps ---------- */

function makeFakeSessions(): AgentSessionService & { _reset(): void } {
  const sessions: AgentSessionRecord[] = [];
  let counter = 0;
  const svc = {
    async ensureActive({ agentId, companyId }: { companyId: string; agentId: string }) {
      const active = sessions.find((s) => s.agentId === agentId && s.status === "active");
      if (active) return active;
      counter++;
      const row: AgentSessionRecord = {
        id: `session-${counter}`,
        companyId,
        agentId,
        workspacePath: `/tmp/fake/${agentId}-${counter}`,
        claudeProjectDir: `/tmp/fake/${agentId}-${counter}`,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
        archiveReason: null,
      };
      sessions.push(row);
      return row;
    },
    async archive({ sessionId, reason }: { sessionId: string; reason: string }) {
      const row = sessions.find((s) => s.id === sessionId);
      if (!row) return null;
      row.status = "archived";
      row.archivedAt = new Date();
      row.archiveReason = reason;
      return row;
    },
    async getActive({ agentId }: { agentId: string }) {
      return sessions.find((s) => s.agentId === agentId && s.status === "active") ?? null;
    },
    async listByAgent({ agentId }: { agentId: string }) {
      return sessions.filter((s) => s.agentId === agentId);
    },
    async getById({ sessionId }: { sessionId: string }) {
      return sessions.find((s) => s.id === sessionId) ?? null;
    },
    _reset() {
      sessions.length = 0;
      counter = 0;
    },
  };
  return svc as AgentSessionService & { _reset(): void };
}

function makeFakeWorkspaces(): LeaderWorkspaceProvisioner & {
  provisionCalls: number;
  destroyCalls: number;
  shouldFail: boolean;
} {
  const state = {
    provisionCalls: 0,
    destroyCalls: 0,
    shouldFail: false,
    async provision(params: any) {
      state.provisionCalls++;
      if (state.shouldFail) throw new Error("provision failed");
      return {
        root: params.session.workspacePath,
        binary: "/fake/bin/claude",
        args: ["--test"],
        env: { COS_AGENT_ID: params.agentId },
        agentKeyId: "fake-key-1",
      };
    },
    async destroy(_params: { sessionId: string }) {
      state.destroyCalls++;
    },
  };
  return state as any;
}

describe("leaderProcessService", () => {
  let db: ReturnType<typeof makeStubDb>;
  let sessions: ReturnType<typeof makeFakeSessions>;
  let workspaces: ReturnType<typeof makeFakeWorkspaces>;
  let backend: ReturnType<typeof createFakeProcessBackend>;
  let service: ReturnType<typeof createLeaderProcessService>;

  beforeEach(() => {
    db = makeStubDb();
    sessions = makeFakeSessions();
    workspaces = makeFakeWorkspaces();
    backend = createFakeProcessBackend();
    service = createLeaderProcessService({
      db: db as any,
      sessions,
      workspaces,
      backend,
    });
  });

  it("I1: start after stop always succeeds (stopped → starting → running)", async () => {
    const row1 = await service.start({ companyId: "co-1", agentId: "agent-1" });
    expect(row1.status).toBe("running");
    expect(row1.pm2Name).toBe("cos-leader-agent1"); // "cos-leader-" + first 8 chars

    const stopped = await service.stop({ agentId: "agent-1" });
    expect(stopped.status).toBe("stopped");

    const row3 = await service.start({ companyId: "co-1", agentId: "agent-1" });
    expect(row3.status).toBe("running");
  });

  it("I3: concurrent start — one wins, others get 409", async () => {
    const promises = Array.from({ length: 5 }, () =>
      service.start({ companyId: "co-1", agentId: "agent-2" }).catch((e) => e),
    );
    const results = await Promise.all(promises);
    const successes = results.filter((r: any) => r?.status === "running");
    const errors = results.filter((r: any) => r instanceof Error);

    expect(successes).toHaveLength(1);
    expect(errors.length).toBe(4);
    for (const err of errors) {
      expect((err as any).status).toBe(409);
    }
  });

  it("I4: crashed status is recoverable by start", async () => {
    await service.start({ companyId: "co-1", agentId: "agent-3" });
    backend.crash("cos-leader-agent3", 137);

    // Reconcile should mark it crashed
    const result = await service.reconcile();
    expect(result.crashed).toBe(1);

    const detail = await service.status({ agentId: "agent-3" });
    expect(detail?.row.status).toBe("crashed");

    // Crashed → start should succeed
    const revived = await service.start({ companyId: "co-1", agentId: "agent-3" });
    expect(revived.status).toBe("running");
  });

  it("I6: stop is idempotent on already-stopped", async () => {
    await service.start({ companyId: "co-1", agentId: "agent-4" });
    const first = await service.stop({ agentId: "agent-4" });
    expect(first.status).toBe("stopped");

    const second = await service.stop({ agentId: "agent-4" });
    expect(second.status).toBe("stopped");
  });

  it("I7: restart after crash restores to running", async () => {
    await service.start({ companyId: "co-1", agentId: "agent-5" });
    backend.crash("cos-leader-agent5", 1);
    await service.reconcile();

    const restarted = await service.restart({ companyId: "co-1", agentId: "agent-5" });
    expect(restarted.status).toBe("running");
  });

  it("I2: reconcile is idempotent", async () => {
    await service.start({ companyId: "co-1", agentId: "agent-6" });
    const r1 = await service.reconcile();
    const r2 = await service.reconcile();
    expect(r1.reconciled + r1.crashed + r1.orphanStopped).toBe(0);
    expect(r2.reconciled + r2.crashed + r2.orphanStopped).toBe(0);
  });

  it("provision failure marks row stopped with errorMessage", async () => {
    workspaces.shouldFail = true;
    await expect(
      service.start({ companyId: "co-1", agentId: "agent-7" }),
    ).rejects.toThrow("provision failed");

    const detail = await service.status({ agentId: "agent-7" });
    expect(detail?.row.status).toBe("stopped");
    expect(detail?.row.errorMessage).toContain("provision failed");
  });

  it("destroyForAgent archives session + removes backend entry + deletes row", async () => {
    await service.start({ companyId: "co-1", agentId: "agent-8" });
    await service.destroyForAgent({ agentId: "agent-8" });

    const detail = await service.status({ agentId: "agent-8" });
    expect(detail).toBeNull();

    const active = await sessions.getActive({ agentId: "agent-8" });
    expect(active).toBeNull();
    expect(workspaces.destroyCalls).toBe(1);

    expect(await backend.describe("cos-leader-agent8")).toBeNull();
  });

  it("reconcile kills orphan backend processes not in DB", async () => {
    // Spawn directly on backend without going through service → orphan
    await backend.spawn({
      name: "cos-leader-orphan1",
      script: "/fake/bin/claude",
      args: [],
      cwd: "/tmp",
      env: {},
    });

    const result = await service.reconcile();
    expect(result.orphanStopped).toBe(1);
    expect(await backend.describe("cos-leader-orphan1")).toBeNull();
  });
});

import { and, eq } from "drizzle-orm";
import { Mutex } from "async-mutex";
import type { Db } from "@paperclipai/db";
import { leaderProcesses, type LeaderProcessRow } from "@paperclipai/db";
import type { LeaderProcessStatus } from "@paperclipai/shared";
import type { ProcessBackend } from "./process-backend.js";
import type { AgentSessionService, AgentSessionRecord } from "./agent-sessions.js";

/**
 * Phase 4: domain service for leader CLI process lifecycle.
 *
 * All runtime state is reconciled between DB (intent + history) and
 * ProcessBackend (runtime reality). File IO + spawn happens OUTSIDE
 * transactions — row lock is held only long enough to read/write the
 * state transition. Per-agent async mutex serializes start/stop races.
 *
 * Invariants (§18 of design doc):
 *   I1. start(X) after stop(X) always succeeds if workspace valid.
 *   I2. reconcile() is idempotent.
 *   I3. Concurrent start(X) — one wins, others get 409.
 *   I4. crashed is recoverable via start.
 *   I5. Agent deletion cascades to stopping + workspace removal.
 *   I6. stop(X) is idempotent on already-stopped.
 *   I7. restart after crash restores to running.
 *   I8. start blocks on in-progress stop (mutex).
 *
 * @see docs/cos-v2/phase4-cli-design.md §10
 */

export interface LeaderProcessStatusDetail {
  row: LeaderProcessRow;
  /** Real-time alive check via ProcessBackend. */
  alive: boolean;
}

export interface WorkspaceSpec {
  /** Root directory — e.g. ~/.cos-v2/leaders/<slug>/ */
  root: string;
  /** Path to the binary to spawn. */
  binary: string;
  /** Arguments to pass. */
  args: string[];
  /** Environment variables for the child process. */
  env: Record<string, string>;
}

/**
 * The provisioner interface is used by leaderProcessService but its
 * implementation lives in workspace-provisioner.ts (4i). Declaring the
 * shape here lets us inject a mock in tests without pulling in the
 * real filesystem code.
 */
export interface LeaderWorkspaceProvisioner {
  provision(params: {
    companyId: string;
    agentId: string;
    session: AgentSessionRecord;
  }): Promise<WorkspaceSpec & { agentKeyId: string | null }>;

  /** Remove the workspace directory (called on agent delete). */
  destroy(params: { sessionId: string }): Promise<void>;
}

export interface LeaderProcessServiceDeps {
  db: Db;
  sessions: AgentSessionService;
  workspaces: LeaderWorkspaceProvisioner;
  backend: ProcessBackend;
  clock?: { now(): Date };
  logger?: {
    info(obj: Record<string, unknown>, msg?: string): void;
    warn(obj: Record<string, unknown>, msg?: string): void;
    error(obj: Record<string, unknown>, msg?: string): void;
  };
}

export interface LeaderProcessService {
  start(params: {
    companyId: string;
    agentId: string;
  }): Promise<LeaderProcessRow>;
  stop(params: {
    agentId: string;
    timeoutMs?: number;
  }): Promise<LeaderProcessRow>;
  restart(params: {
    companyId: string;
    agentId: string;
  }): Promise<LeaderProcessRow>;
  status(params: {
    agentId: string;
  }): Promise<LeaderProcessStatusDetail | null>;
  list(params: { companyId: string }): Promise<LeaderProcessRow[]>;
  reconcile(): Promise<{ reconciled: number; crashed: number; orphanStopped: number }>;
  /**
   * Graceful teardown on agent deletion — stop + remove + archive
   * session + destroy workspace. Safe to call if no leader process
   * row exists.
   */
  destroyForAgent(params: { agentId: string }): Promise<void>;
}

/* ---------- Errors ---------- */

function httpErr(message: string, status: number): Error {
  return Object.assign(new Error(message), { status });
}

/* ---------- Service factory ---------- */

const noopLogger = {
  info() {},
  warn() {},
  error() {},
};

export function createLeaderProcessService(
  deps: LeaderProcessServiceDeps,
): LeaderProcessService {
  const { db, sessions, workspaces, backend } = deps;
  const logger = deps.logger ?? noopLogger;
  const clock = deps.clock ?? { now: () => new Date() };

  // Per-agent mutexes. A stopped + restarted agent can reuse the same
  // mutex instance safely because it only matters while operations
  // are in flight.
  const mutexes = new Map<string, Mutex>();
  function mutexFor(agentId: string): Mutex {
    let m = mutexes.get(agentId);
    if (!m) {
      m = new Mutex();
      mutexes.set(agentId, m);
    }
    return m;
  }

  function pm2NameFor(agentId: string): string {
    // Full agentId (dashes removed for readability). 8-char prefix
    // had a non-zero birthday collision risk across agents.
    return `cos-leader-${agentId.replace(/-/g, "")}`;
  }

  async function loadRow(agentId: string): Promise<LeaderProcessRow | null> {
    const [row] = await db
      .select()
      .from(leaderProcesses)
      .where(eq(leaderProcesses.agentId, agentId))
      .limit(1);
    return row ?? null;
  }

  async function setStatus(
    agentId: string,
    updates: Partial<LeaderProcessRow>,
  ): Promise<LeaderProcessRow> {
    const [row] = await db
      .update(leaderProcesses)
      .set({ ...updates, updatedAt: clock.now() })
      .where(eq(leaderProcesses.agentId, agentId))
      .returning();
    return row;
  }

  async function upsertStarting(params: {
    companyId: string;
    agentId: string;
  }): Promise<LeaderProcessRow> {
    const existing = await loadRow(params.agentId);
    const now = clock.now();
    if (existing) {
      const [row] = await db
        .update(leaderProcesses)
        .set({
          status: "starting" satisfies LeaderProcessStatus,
          companyId: params.companyId,
          stoppedAt: null,
          exitCode: null,
          exitReason: null,
          errorMessage: null,
          updatedAt: now,
        })
        .where(eq(leaderProcesses.agentId, params.agentId))
        .returning();
      return row;
    }
    const [row] = await db
      .insert(leaderProcesses)
      .values({
        companyId: params.companyId,
        agentId: params.agentId,
        status: "starting" satisfies LeaderProcessStatus,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return row;
  }

  /**
   * Core start logic — DOES NOT acquire the per-agent mutex.
   * Callers are responsible for holding the mutex.
   */
  async function doStart({
    companyId,
    agentId,
  }: {
    companyId: string;
    agentId: string;
  }): Promise<LeaderProcessRow> {
    const existing = await loadRow(agentId);
    if (
      existing &&
      existing.status !== "stopped" &&
      existing.status !== "crashed"
    ) {
      throw httpErr(`Cannot start: current status = ${existing.status}`, 409);
    }
    await upsertStarting({ companyId, agentId });
    try {
      const session = await sessions.ensureActive({ companyId, agentId });
      const workspace = await workspaces.provision({ companyId, agentId, session });
      const pm2Name = pm2NameFor(agentId);
      const handle = await backend.spawn({
        name: pm2Name,
        script: workspace.binary,
        args: workspace.args,
        cwd: workspace.root,
        env: workspace.env,
      });
      logger.info(
        { agentId, pm2Name, pid: handle.pid, sessionId: session.id },
        "leader process started",
      );
      return await setStatus(agentId, {
        status: "running" satisfies LeaderProcessStatus,
        sessionId: session.id,
        pm2Name: handle.name,
        pm2PmId: handle.pmId,
        pid: handle.pid,
        agentKeyId: workspace.agentKeyId,
        startedAt: clock.now(),
        errorMessage: null,
      });
    } catch (err: any) {
      logger.error(
        { agentId, err: err?.message ?? String(err) },
        "leader process start failed",
      );
      await setStatus(agentId, {
        status: "stopped" satisfies LeaderProcessStatus,
        errorMessage: `start failed: ${err?.message ?? String(err)}`,
        stoppedAt: clock.now(),
      });
      throw err;
    }
  }

  /**
   * Core stop logic — DOES NOT acquire the mutex.
   */
  async function doStop({
    agentId,
    timeoutMs = 10_000,
  }: {
    agentId: string;
    timeoutMs?: number;
  }): Promise<LeaderProcessRow> {
    const existing = await loadRow(agentId);
    if (!existing) {
      throw httpErr("Leader process not found", 404);
    }
    if (
      existing.status === "stopped" ||
      existing.status === "crashed" ||
      existing.status === "stopping"
    ) {
      return existing;
    }
    await setStatus(agentId, {
      status: "stopping" satisfies LeaderProcessStatus,
    });
    const pm2Name = existing.pm2Name ?? pm2NameFor(agentId);
    let exitCode: number | null = null;
    try {
      const result = await backend.stop(pm2Name, timeoutMs);
      exitCode = result.exitCode;
    } catch (err: any) {
      logger.warn(
        { agentId, pm2Name, err: err?.message ?? String(err) },
        "backend.stop threw; marking stopped anyway",
      );
    }
    return await setStatus(agentId, {
      status: "stopped" satisfies LeaderProcessStatus,
      stoppedAt: clock.now(),
      pid: null,
      exitCode,
      exitReason: exitCode === null ? "stop requested" : null,
    });
  }

  async function start(params: { companyId: string; agentId: string }) {
    return mutexFor(params.agentId).runExclusive(() => doStart(params));
  }

  async function stop(params: { agentId: string; timeoutMs?: number }) {
    return mutexFor(params.agentId).runExclusive(() => doStop(params));
  }

  async function restart(params: { companyId: string; agentId: string }) {
    // Hold the mutex across BOTH operations so a concurrent start/stop
    // cannot interleave. doStop/doStart do not take the mutex so this
    // path does not deadlock.
    return mutexFor(params.agentId).runExclusive(async () => {
      const existing = await loadRow(params.agentId);
      if (
        existing &&
        existing.status !== "stopped" &&
        existing.status !== "crashed"
      ) {
        await doStop({ agentId: params.agentId });
      }
      return doStart(params);
    });
  }

  async function status({ agentId }: { agentId: string }) {
    const row = await loadRow(agentId);
    if (!row) return null;
    const alive = row.pm2Name ? await backend.isAlive(row.pm2Name) : false;
    return { row, alive };
  }

  async function list({ companyId }: { companyId: string }) {
    return db
      .select()
      .from(leaderProcesses)
      .where(eq(leaderProcesses.companyId, companyId));
  }

  async function reconcile() {
    const dbRows = await db.select().from(leaderProcesses);
    const backendList = await backend.list();
    const backendByName = new Map(backendList.map((p) => [p.name, p]));
    const dbByName = new Map(
      dbRows
        .filter((r): r is LeaderProcessRow & { pm2Name: string } => !!r.pm2Name)
        .map((r) => [r.pm2Name, r]),
    );

    let reconciled = 0;
    let crashed = 0;
    let orphanStopped = 0;

    // Direction A: DB says running/starting/stopping — verify with backend.
    for (const row of dbRows) {
      if (
        row.status !== "running" &&
        row.status !== "starting" &&
        row.status !== "stopping"
      ) {
        continue;
      }
      const info = row.pm2Name ? backendByName.get(row.pm2Name) : null;
      if (!info || info.status !== "online") {
        await setStatus(row.agentId, {
          status: "crashed" satisfies LeaderProcessStatus,
          stoppedAt: clock.now(),
          exitReason: info
            ? `backend reports ${info.status}`
            : "backend has no such process",
        });
        logger.warn(
          { agentId: row.agentId, pm2Name: row.pm2Name },
          "reconcile: marked crashed (backend out of sync)",
        );
        crashed++;
        continue;
      }
      // Reconciled sync from starting/stopping to running if backend says online
      if (row.status !== "running") {
        await setStatus(row.agentId, {
          status: "running" satisfies LeaderProcessStatus,
          pid: info.pid,
          pm2PmId: info.pmId,
        });
        reconciled++;
      }
    }

    // Direction B: backend has cos-leader-* that DB doesn't know about.
    for (const info of backendList) {
      if (!info.name.startsWith("cos-leader-")) continue;
      if (dbByName.has(info.name)) continue;
      try {
        await backend.stop(info.name);
        await backend.remove(info.name);
        orphanStopped++;
        logger.warn(
          { pm2Name: info.name },
          "reconcile: killed orphan backend process",
        );
      } catch (err: any) {
        logger.error(
          { pm2Name: info.name, err: err?.message ?? String(err) },
          "reconcile: failed to kill orphan",
        );
      }
    }

    return { reconciled, crashed, orphanStopped };
  }

  async function destroyForAgent({ agentId }: { agentId: string }) {
    // Entire teardown runs under the per-agent mutex so a concurrent
    // start/restart cannot race the cleanup and leave a running
    // process with no DB row.
    return mutexFor(agentId).runExclusive(async () => {
      const existing = await loadRow(agentId);
      // Graceful stop first (if running-ish). Even if existing is
      // null, we still attempt backend.remove below as a safety net —
      // an orphan process with the predictable name could exist from
      // a prior server crash.
      if (
        existing &&
        (existing.status === "running" ||
          existing.status === "starting" ||
          existing.status === "stopping")
      ) {
        try {
          await doStop({ agentId });
        } catch (err: any) {
          logger.warn(
            { agentId, err: err?.message ?? String(err) },
            "destroyForAgent: stop failed; continuing cleanup",
          );
        }
      }
      // Unconditionally remove from backend using the deterministic
      // pm2 name, falling back to any stored name. This closes the
      // gap where existing.pm2Name was unset (e.g. start aborted
      // before setStatus wrote it) but a backend process exists.
      const candidates = new Set<string>();
      if (existing?.pm2Name) candidates.add(existing.pm2Name);
      candidates.add(pm2NameFor(agentId));
      for (const name of candidates) {
        try {
          await backend.remove(name);
        } catch (err: any) {
          logger.warn(
            { agentId, pm2Name: name, err: err?.message ?? String(err) },
            "destroyForAgent: backend.remove failed",
          );
        }
      }
      // Archive active session + destroy workspace
      const active = await sessions.getActive({ agentId });
      if (active) {
        try {
          await workspaces.destroy({ sessionId: active.id });
        } catch (err: any) {
          logger.warn(
            { agentId, sessionId: active.id, err: err?.message ?? String(err) },
            "destroyForAgent: workspace destroy failed",
          );
        }
        await sessions.archive({
          sessionId: active.id,
          reason: "agent deleted",
        });
      }
      // Explicit row delete (CASCADE would also handle it on agent
      // delete, but calling here keeps UI state consistent when
      // destroyForAgent is invoked for reasons other than agent
      // deletion — e.g., a future "clear workspace" UI action).
      await db.delete(leaderProcesses).where(eq(leaderProcesses.agentId, agentId));
    });
  }

  return { start, stop, restart, status, list, reconcile, destroyForAgent };
}

import { and, eq, isNull } from "drizzle-orm";
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
  /**
   * Paperclip instance id (e.g. "default", "pap-885-show-worktree-banner").
   * Scopes PM2 process names AND reconcile's orphan-kill loop so that
   * two COS v2 instances running under the same user on the same PM2
   * daemon do NOT interfere with each other's leaders.
   */
  instanceId?: string;
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
    projectId?: string | null;
  }): Promise<LeaderProcessRow>;
  stop(params: {
    agentId: string;
    projectId?: string | null;
    timeoutMs?: number;
  }): Promise<LeaderProcessRow>;
  restart(params: {
    companyId: string;
    agentId: string;
    projectId?: string | null;
  }): Promise<LeaderProcessRow>;
  status(params: {
    agentId: string;
    projectId?: string | null;
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
  // Sanitize instance id to PM2-safe characters (alnum + _ + -).
  const instanceId = (deps.instanceId ?? "default").replace(/[^A-Za-z0-9_-]/g, "_");
  const processNamePrefix = `cos-${instanceId}-`;

  // Per (agent, project) mutexes. A stopped + restarted agent can
  // reuse the same mutex instance safely because it only matters
  // while operations are in flight.
  const mutexes = new Map<string, Mutex>();
  function mutexKey(agentId: string, projectId?: string | null): string {
    return projectId ? `${agentId}:${projectId}` : agentId;
  }
  function mutexFor(agentId: string, projectId?: string | null): Mutex {
    const key = mutexKey(agentId, projectId);
    let m = mutexes.get(key);
    if (!m) {
      m = new Mutex();
      mutexes.set(key, m);
    }
    return m;
  }

  function pm2NameFor(agentId: string, projectId?: string | null): string {
    // Instance-scoped prefix so two local COS v2 instances (e.g. two
    // worktrees) running against the same user-global PM2 daemon do
    // NOT collide or reconcile-kill each other's leaders.
    const base = agentId.replace(/-/g, "");
    if (projectId) {
      return `${processNamePrefix}${base.slice(0, 16)}-${projectId.replace(/-/g, "").slice(0, 8)}`;
    }
    return `${processNamePrefix}${base}`;
  }

  async function loadRow(agentId: string, projectId?: string | null): Promise<LeaderProcessRow | null> {
    const projectFilter = projectId
      ? eq(leaderProcesses.projectId, projectId)
      : isNull(leaderProcesses.projectId);
    const [row] = await db
      .select()
      .from(leaderProcesses)
      .where(and(eq(leaderProcesses.agentId, agentId), projectFilter))
      .limit(1);
    return row ?? null;
  }

  async function setStatusById(
    rowId: string,
    updates: Partial<LeaderProcessRow>,
  ): Promise<LeaderProcessRow> {
    const [row] = await db
      .update(leaderProcesses)
      .set({ ...updates, updatedAt: clock.now() })
      .where(eq(leaderProcesses.id, rowId))
      .returning();
    return row;
  }

  /** Legacy helper — updates by (agentId, projectId) for reconcile paths. */
  async function setStatusByAgent(
    agentId: string,
    projectId: string | null | undefined,
    updates: Partial<LeaderProcessRow>,
  ): Promise<LeaderProcessRow> {
    const row = await loadRow(agentId, projectId);
    if (!row) throw httpErr("Leader process not found", 404);
    return setStatusById(row.id, updates);
  }

  async function upsertStarting(params: {
    companyId: string;
    agentId: string;
    projectId?: string | null;
  }): Promise<LeaderProcessRow> {
    const existing = await loadRow(params.agentId, params.projectId);
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
        .where(eq(leaderProcesses.id, existing.id))
        .returning();
      return row;
    }
    try {
      const [row] = await db
        .insert(leaderProcesses)
        .values({
          companyId: params.companyId,
          agentId: params.agentId,
          projectId: params.projectId ?? null,
          status: "starting" satisfies LeaderProcessStatus,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return row;
    } catch (err: any) {
      // Unique index collision — another server instance raced us.
      if (err?.code === "23505") {
        const raceRow = await loadRow(params.agentId, params.projectId);
        if (raceRow) return raceRow;
      }
      throw err;
    }
  }

  /**
   * Core start logic — DOES NOT acquire the per-agent mutex.
   * Callers are responsible for holding the mutex.
   */
  async function doStart({
    companyId,
    agentId,
    projectId,
  }: {
    companyId: string;
    agentId: string;
    projectId?: string | null;
  }): Promise<LeaderProcessRow> {
    const existing = await loadRow(agentId, projectId);
    if (
      existing &&
      existing.status !== "stopped" &&
      existing.status !== "crashed"
    ) {
      throw httpErr(`Cannot start: current status = ${existing.status}`, 409);
    }
    const startingRow = await upsertStarting({ companyId, agentId, projectId });
    // Remember the keyId created by provision so we can revoke it
    // in the catch branch if spawn fails — otherwise a freshly-issued
    // valid leader-cli token would remain valid in the DB without any
    // running process to use it.
    let provisionedKeyId: string | null = null;
    try {
      const session = await sessions.ensureActive({ companyId, agentId, projectId });
      const workspace = await workspaces.provision({ companyId, agentId, session });
      provisionedKeyId = workspace.agentKeyId;
      const pm2Name = pm2NameFor(agentId, projectId);
      // Remove stale PM2 registration so spawn gets a fresh cwd.
      try { await backend.remove(pm2Name); } catch { /* ok if missing */ }
      const handle = await backend.spawn({
        name: pm2Name,
        script: workspace.binary,
        args: workspace.args,
        cwd: workspace.root,
        env: workspace.env,
      });
      logger.info(
        { agentId, projectId, pm2Name, pid: handle.pid, sessionId: session.id },
        "leader process started",
      );
      return await setStatusById(startingRow.id, {
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
        { agentId, projectId, err: err?.message ?? String(err) },
        "leader process start failed",
      );
      // Revoke the key we minted during this failed provision so it
      // can't be used by a stale process or leaked artifact.
      if (provisionedKeyId) {
        try {
          const { agentService } = await import("./agents.js");
          await agentService(db).revokeKey(provisionedKeyId);
        } catch (revokeErr: any) {
          logger.warn(
            { agentId, keyId: provisionedKeyId, err: revokeErr?.message ?? String(revokeErr) },
            "failed to revoke agent key after failed start",
          );
        }
      }
      await setStatusById(startingRow.id, {
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
    projectId,
    timeoutMs = 10_000,
  }: {
    agentId: string;
    projectId?: string | null;
    timeoutMs?: number;
  }): Promise<LeaderProcessRow> {
    const existing = await loadRow(agentId, projectId);
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
    await setStatusById(existing.id, {
      status: "stopping" satisfies LeaderProcessStatus,
    });
    const pm2Name = existing.pm2Name ?? pm2NameFor(agentId, projectId);
    let exitCode: number | null = null;
    let stopErr: unknown = null;
    try {
      const result = await backend.stop(pm2Name, timeoutMs);
      exitCode = result.exitCode;
    } catch (err: any) {
      stopErr = err;
      logger.warn(
        { agentId, projectId, pm2Name, err: err?.message ?? String(err) },
        "backend.stop failed",
      );
    }

    // Verify the process is actually down before claiming stopped.
    const stillAlive = await backend.isAlive(pm2Name).catch(() => false);
    if (stillAlive) {
      return await setStatusById(existing.id, {
        status: "running" satisfies LeaderProcessStatus,
        errorMessage: `stop failed: ${
          (stopErr as any)?.message ?? String(stopErr ?? "process still alive")
        }`,
      });
    }

    return await setStatusById(existing.id, {
      status: "stopped" satisfies LeaderProcessStatus,
      stoppedAt: clock.now(),
      pid: null,
      exitCode,
      exitReason: exitCode === null ? "stop requested" : null,
      errorMessage: null,
    });
  }

  async function start(params: { companyId: string; agentId: string; projectId?: string | null }) {
    return mutexFor(params.agentId, params.projectId).runExclusive(() => doStart(params));
  }

  async function stop(params: { agentId: string; projectId?: string | null; timeoutMs?: number }) {
    return mutexFor(params.agentId, params.projectId).runExclusive(() => doStop(params));
  }

  async function restart(params: { companyId: string; agentId: string; projectId?: string | null }) {
    // Hold the mutex across BOTH operations so a concurrent start/stop
    // cannot interleave. doStop/doStart do not take the mutex so this
    // path does not deadlock.
    return mutexFor(params.agentId, params.projectId).runExclusive(async () => {
      const existing = await loadRow(params.agentId, params.projectId);
      if (
        existing &&
        existing.status !== "stopped" &&
        existing.status !== "crashed"
      ) {
        await doStop({ agentId: params.agentId, projectId: params.projectId });
      }
      // Remove PM2 registration so spawn gets a fresh cwd (PM2 caches
      // cwd from the first start; remove + re-spawn is the only way to
      // change it on restart).
      const pm2Name = existing?.pm2Name ?? pm2NameFor(params.agentId, params.projectId);
      try { await backend.remove(pm2Name); } catch { /* ok if missing */ }
      return doStart(params);
    });
  }

  async function status({ agentId, projectId }: { agentId: string; projectId?: string | null }) {
    const row = await loadRow(agentId, projectId);
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

      // Transitional backend states are compatible with transitional
      // DB states — don't rewrite them as crashed mid-flight.
      //   DB starting + backend launching → leave alone
      //   DB stopping + backend stopping  → leave alone
      if (info) {
        if (row.status === "starting" && info.status === "launching") continue;
        if (row.status === "stopping" && info.status === "stopping") continue;
      }

      if (!info || (info.status !== "online" && info.status !== "launching")) {
        await setStatusById(row.id, {
          status: "crashed" satisfies LeaderProcessStatus,
          stoppedAt: clock.now(),
          exitReason: info
            ? `backend reports ${info.status}`
            : "backend has no such process",
        });
        logger.warn(
          { agentId: row.agentId, projectId: row.projectId, pm2Name: row.pm2Name },
          "reconcile: marked crashed (backend out of sync)",
        );
        crashed++;
        continue;
      }
      // Reconciled sync from starting/stopping to running if backend says online
      if (row.status !== "running" && info.status === "online") {
        await setStatusById(row.id, {
          status: "running" satisfies LeaderProcessStatus,
          pid: info.pid,
          pm2PmId: info.pmId,
        });
        reconciled++;
      }
    }

    // Direction B: backend has this instance's orphans that DB
    // doesn't know about. CRITICAL: only touch processes owned by
    // THIS instance — other worktrees or dev setups on the same
    // host share the PM2 daemon and have their own cos-*-* names.
    for (const info of backendList) {
      if (!info.name.startsWith(processNamePrefix)) continue;
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
    // Load ALL leader process rows for this agent (could be multiple projects).
    const allRows = await db
      .select()
      .from(leaderProcesses)
      .where(eq(leaderProcesses.agentId, agentId));

    for (const existing of allRows) {
      await mutexFor(agentId, existing.projectId).runExclusive(async () => {
        if (
          existing.status === "running" ||
          existing.status === "starting" ||
          existing.status === "stopping"
        ) {
          try {
            await doStop({ agentId, projectId: existing.projectId });
          } catch (err: any) {
            logger.warn(
              { agentId, projectId: existing.projectId, err: err?.message ?? String(err) },
              "destroyForAgent: stop failed; continuing cleanup",
            );
          }
        }
        const candidates = new Set<string>();
        if (existing.pm2Name) candidates.add(existing.pm2Name);
        candidates.add(pm2NameFor(agentId, existing.projectId));
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
      });
    }

    // If no rows existed, still try to clean up the legacy pm2 name
    if (allRows.length === 0) {
      try {
        await backend.remove(pm2NameFor(agentId));
      } catch { /* ignore */ }
    }

    // Archive ALL active sessions + destroy workspaces.
    // Derive the expected companyId from the leader_processes rows for
    // defense-in-depth — only archive sessions belonging to the same company.
    const expectedCompanyId = allRows[0]?.companyId ?? null;
    const activeSessions = await sessions.listByAgent({ agentId });
    for (const session of activeSessions) {
      if (session.status !== "active") continue;
      if (expectedCompanyId && session.companyId !== expectedCompanyId) {
        logger.warn(
          { agentId, sessionId: session.id, sessionCompany: session.companyId, expectedCompanyId },
          "destroyForAgent: skipping session from different company",
        );
        continue;
      }
      try {
        await workspaces.destroy({ sessionId: session.id });
      } catch (err: any) {
        logger.warn(
          { agentId, sessionId: session.id, err: err?.message ?? String(err) },
          "destroyForAgent: workspace destroy failed",
        );
      }
      await sessions.archive({
        sessionId: session.id,
        reason: "agent deleted",
      });
    }

    // Explicit row delete
    await db.delete(leaderProcesses).where(eq(leaderProcesses.agentId, agentId));
  }

  return { start, stop, restart, status, list, reconcile, destroyForAgent };
}

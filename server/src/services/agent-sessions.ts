import { and, eq, desc } from "drizzle-orm";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import type { Db } from "@paperclipai/db";
import { agentSessions, agents } from "@paperclipai/db";

/**
 * Phase 4: durable session entity for a leader agent's Claude CLI.
 *
 * Design ref: docs/cos-v2/phase4-cli-design.md §10.1
 *
 * Core invariants (enforced by DB partial unique index
 * "agent_sessions_one_active_per_agent"):
 *   S1. At most one active session per agent.
 *   S2. ensureActive is idempotent.
 *   S3. archive + ensureActive → new row.
 *   S4. workspace_path is stable across restarts of the same session.
 */
export type AgentSessionRecord = typeof agentSessions.$inferSelect;

export interface AgentSessionService {
  ensureActive(params: {
    companyId: string;
    agentId: string;
  }): Promise<AgentSessionRecord>;

  archive(params: {
    sessionId: string;
    reason: string;
  }): Promise<AgentSessionRecord | null>;

  getActive(params: {
    agentId: string;
  }): Promise<AgentSessionRecord | null>;

  listByAgent(params: {
    agentId: string;
  }): Promise<AgentSessionRecord[]>;

  getById(params: {
    sessionId: string;
  }): Promise<AgentSessionRecord | null>;
}

/**
 * Build a workspace path for a new session.
 *
 * Stable per (agentId, sessionSuffix) — if the same session is reused
 * across restarts the path is the same, which lets Claude's
 * ~/.claude/projects/<hash(cwd)>/ history auto-restore.
 */
function buildWorkspacePath(agentId: string, sessionId: string): string {
  const agentShort = agentId.slice(0, 8);
  const sessionShort = sessionId.slice(0, 8);
  return path.join(
    os.homedir(),
    ".cos-v2",
    "leaders",
    `${agentShort}-${sessionShort}`,
  );
}

export function createAgentSessionService(db: Db): AgentSessionService {
  return {
    async ensureActive({ companyId, agentId }) {
      // Fast path: read the active session if any.
      const existing = await db
        .select()
        .from(agentSessions)
        .where(
          and(
            eq(agentSessions.agentId, agentId),
            eq(agentSessions.status, "active"),
          ),
        )
        .limit(1);
      if (existing[0]) return existing[0];

      // Validate agent belongs to company before creating a session.
      const agent = await db
        .select({ companyId: agents.companyId })
        .from(agents)
        .where(eq(agents.id, agentId))
        .limit(1);
      if (!agent[0]) {
        throw Object.assign(new Error(`Agent ${agentId} not found`), { status: 404 });
      }
      if (agent[0].companyId !== companyId) {
        throw Object.assign(
          new Error(`Agent ${agentId} does not belong to this company`),
          { status: 422 },
        );
      }

      // Two-phase insert: pre-generate id so workspace_path is deterministic.
      const newId = crypto.randomUUID();
      const workspacePath = buildWorkspacePath(agentId, newId);

      try {
        const [row] = await db
          .insert(agentSessions)
          .values({
            id: newId,
            companyId,
            agentId,
            workspacePath,
            claudeProjectDir: workspacePath,
            status: "active",
          })
          .returning();
        return row;
      } catch (err: any) {
        // Partial unique index collision — another caller raced us to
        // insert the active session. Re-query and return theirs.
        if (err?.code === "23505") {
          const [rowAfterRace] = await db
            .select()
            .from(agentSessions)
            .where(
              and(
                eq(agentSessions.agentId, agentId),
                eq(agentSessions.status, "active"),
              ),
            )
            .limit(1);
          if (rowAfterRace) return rowAfterRace;
        }
        throw err;
      }
    },

    async archive({ sessionId, reason }) {
      const [row] = await db
        .update(agentSessions)
        .set({
          status: "archived",
          archivedAt: new Date(),
          archiveReason: reason,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(agentSessions.id, sessionId),
            eq(agentSessions.status, "active"),
          ),
        )
        .returning();
      return row ?? null;
    },

    async getActive({ agentId }) {
      const [row] = await db
        .select()
        .from(agentSessions)
        .where(
          and(
            eq(agentSessions.agentId, agentId),
            eq(agentSessions.status, "active"),
          ),
        )
        .limit(1);
      return row ?? null;
    },

    async listByAgent({ agentId }) {
      return db
        .select()
        .from(agentSessions)
        .where(eq(agentSessions.agentId, agentId))
        .orderBy(desc(agentSessions.createdAt));
    },

    async getById({ sessionId }) {
      const [row] = await db
        .select()
        .from(agentSessions)
        .where(eq(agentSessions.id, sessionId))
        .limit(1);
      return row ?? null;
    },
  };
}

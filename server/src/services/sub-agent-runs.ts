import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { subAgentRuns, agents } from "@paperclipai/db";

export function subAgentRunsService(db: Db) {
  return {
    async list(companyId: string, filter?: { subAgentId?: string; leaderAgentId?: string }) {
      const conditions = [eq(subAgentRuns.companyId, companyId)];
      if (filter?.subAgentId) conditions.push(eq(subAgentRuns.subAgentId, filter.subAgentId));
      if (filter?.leaderAgentId) conditions.push(eq(subAgentRuns.leaderAgentId, filter.leaderAgentId));
      return db
        .select()
        .from(subAgentRuns)
        .where(and(...conditions))
        .orderBy(desc(subAgentRuns.startedAt));
    },

    async getById(id: string) {
      const [row] = await db.select().from(subAgentRuns).where(eq(subAgentRuns.id, id));
      return row ?? null;
    },

    async create(companyId: string, leaderAgentId: string, data: { subAgentId: string; issueId?: string | null; task: string }) {
      const [row] = await db
        .insert(subAgentRuns)
        .values({
          companyId,
          leaderAgentId,
          subAgentId: data.subAgentId,
          issueId: data.issueId ?? null,
          task: data.task,
          status: "started",
        })
        .returning();

      // Mark sub-agent as running
      await db
        .update(agents)
        .set({ status: "running", updatedAt: new Date() })
        .where(eq(agents.id, data.subAgentId));

      return row!;
    },

    async complete(id: string, data: { status: "completed" | "failed"; result?: string | null }) {
      const existing = await db.select().from(subAgentRuns).where(eq(subAgentRuns.id, id)).then((r) => r[0]);
      if (!existing) throw Object.assign(new Error("Sub-agent run not found"), { status: 404 });
      if (existing.status !== "started") throw Object.assign(new Error("Run already completed"), { status: 409 });

      const now = new Date();
      const durationMs = existing.startedAt ? now.getTime() - new Date(existing.startedAt).getTime() : null;

      const [row] = await db
        .update(subAgentRuns)
        .set({
          status: data.status,
          result: data.result ?? null,
          durationMs,
          completedAt: now,
          updatedAt: now,
        })
        .where(eq(subAgentRuns.id, id))
        .returning();

      // Mark sub-agent back to idle
      await db
        .update(agents)
        .set({ status: "idle", updatedAt: new Date() })
        .where(eq(agents.id, existing.subAgentId));

      return row!;
    },

    async rate(id: string, data: { rating: "thumbs_up" | "thumbs_down" }, userId: string) {
      const existing = await db.select().from(subAgentRuns).where(eq(subAgentRuns.id, id)).then((r) => r[0]);
      if (!existing) throw Object.assign(new Error("Sub-agent run not found"), { status: 404 });

      const [row] = await db
        .update(subAgentRuns)
        .set({
          rating: data.rating,
          ratedByUserId: userId,
          ratedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(subAgentRuns.id, id))
        .returning();
      return row!;
    },

    async listForAgent(agentId: string) {
      return db
        .select()
        .from(subAgentRuns)
        .where(eq(subAgentRuns.subAgentId, agentId))
        .orderBy(desc(subAgentRuns.startedAt));
    },

    async listByLeader(agentId: string) {
      return db
        .select()
        .from(subAgentRuns)
        .where(eq(subAgentRuns.leaderAgentId, agentId))
        .orderBy(desc(subAgentRuns.startedAt));
    },
  };
}

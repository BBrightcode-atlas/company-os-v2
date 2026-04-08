import { and, eq, asc, ne } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { teams, teamMembers, teamWorkflowStatuses, agents, companyMemberships } from "@paperclipai/db";
import { DEFAULT_WORKFLOW_STATUSES } from "@paperclipai/shared";

/**
 * Validate that an agent belongs to the given company. Throws 422 otherwise.
 * Prevents cross-tenant member insertion (P0 — Codex finding).
 */
async function assertAgentInCompany(
  tx: { select: Db["select"] },
  agentId: string,
  companyId: string,
): Promise<void> {
  const [row] = await tx
    .select({ companyId: agents.companyId })
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);
  if (!row) {
    throw Object.assign(new Error(`Agent ${agentId} not found`), { status: 404 });
  }
  if (row.companyId !== companyId) {
    throw Object.assign(new Error(`Agent ${agentId} does not belong to this company`), {
      status: 422,
    });
  }
}

export function teamService(db: Db) {
  return {
    list: (companyId: string) =>
      db
        .select()
        .from(teams)
        .where(and(eq(teams.companyId, companyId), ne(teams.status, "deleted")))
        .orderBy(asc(teams.name)),

    getById: (id: string) =>
      db
        .select()
        .from(teams)
        .where(eq(teams.id, id))
        .then((rows) => rows[0] ?? null),

    getByIdentifier: (companyId: string, identifier: string) =>
      db
        .select()
        .from(teams)
        .where(and(eq(teams.companyId, companyId), eq(teams.identifier, identifier)))
        .then((rows) => rows[0] ?? null),

    create: async (
      companyId: string,
      data: Omit<typeof teams.$inferInsert, "companyId">,
    ) => {
      return db.transaction(async (tx) => {
        const existing = await tx
          .select()
          .from(teams)
          .where(and(eq(teams.companyId, companyId), eq(teams.identifier, data.identifier!)))
          .then((rows) => rows[0] ?? null);
        if (existing) {
          throw Object.assign(new Error("Team identifier already exists"), { status: 409 });
        }

        // Validate parent_id belongs to the same company
        if (data.parentId) {
          const [parent] = await tx
            .select({ companyId: teams.companyId })
            .from(teams)
            .where(eq(teams.id, data.parentId))
            .limit(1);
          if (!parent || parent.companyId !== companyId) {
            throw Object.assign(
              new Error(`Parent team ${data.parentId} does not belong to this company`),
              { status: 422 },
            );
          }
        }

        // Validate lead_agent_id belongs to the same company
        if (data.leadAgentId) {
          await assertAgentInCompany(tx, data.leadAgentId, companyId);
        }

        const team = await tx
          .insert(teams)
          .values({ ...data, companyId })
          .returning()
          .then((rows) => rows[0]);

        // Seed default workflow statuses
        await tx.insert(teamWorkflowStatuses).values(
          DEFAULT_WORKFLOW_STATUSES.map((s) => ({
            teamId: team.id,
            name: s.name,
            slug: s.slug,
            category: s.category,
            color: s.color,
            position: s.position,
            isDefault: s.isDefault,
          })),
        );

        // Sync lead_agent_id → team_members as lead role
        if (data.leadAgentId) {
          await tx
            .insert(teamMembers)
            .values({
              teamId: team.id,
              companyId,
              agentId: data.leadAgentId,
              role: "lead",
            })
            .onConflictDoUpdate({
              target: [teamMembers.teamId, teamMembers.agentId],
              set: { role: "lead", updatedAt: new Date() },
            });
        }

        return team;
      });
    },

    update: async (id: string, data: Partial<typeof teams.$inferInsert>) => {
      return db.transaction(async (tx) => {
        // Lock the team row to serialize concurrent lead updates
        const [existingTeam] = await tx
          .select()
          .from(teams)
          .where(eq(teams.id, id))
          .for("update")
          .limit(1);
        if (!existingTeam) return null;

        // Validate lead_agent_id belongs to the same company
        if (data.leadAgentId) {
          await assertAgentInCompany(tx, data.leadAgentId, existingTeam.companyId);
        }

        // Validate parent_id company match if changing
        if (data.parentId !== undefined && data.parentId !== null) {
          const [parent] = await tx
            .select({ companyId: teams.companyId })
            .from(teams)
            .where(eq(teams.id, data.parentId))
            .limit(1);
          if (!parent || parent.companyId !== existingTeam.companyId) {
            throw Object.assign(
              new Error(`Parent team does not belong to this company`),
              { status: 422 },
            );
          }
        }

        const [team] = await tx
          .update(teams)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(teams.id, id))
          .returning();

        // Sync lead_agent_id change → team_members (atomic with team update)
        if (data.leadAgentId !== undefined) {
          await tx
            .update(teamMembers)
            .set({ role: "member", updatedAt: new Date() })
            .where(and(eq(teamMembers.teamId, id), eq(teamMembers.role, "lead")));

          if (data.leadAgentId) {
            await tx
              .insert(teamMembers)
              .values({
                teamId: id,
                companyId: existingTeam.companyId,
                agentId: data.leadAgentId,
                role: "lead",
              })
              .onConflictDoUpdate({
                target: [teamMembers.teamId, teamMembers.agentId],
                set: { role: "lead", updatedAt: new Date() },
              });
          }
        }

        return team;
      });
    },

    remove: (id: string) =>
      db
        .update(teams)
        .set({ status: "deleted", updatedAt: new Date() })
        .where(eq(teams.id, id))
        .returning()
        .then((rows) => rows[0] ?? null),

    // --- Members ---

    listMembers: (teamId: string) =>
      db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.teamId, teamId))
        .orderBy(asc(teamMembers.createdAt)),

    addMember: async (
      teamId: string,
      companyId: string,
      data: { agentId?: string; userId?: string; role?: string },
    ) => {
      if (!data.agentId && !data.userId) {
        throw Object.assign(new Error(`Must provide agentId or userId`), { status: 422 });
      }
      // Validate agent belongs to the same company (P0 cross-tenant fix)
      if (data.agentId) {
        await assertAgentInCompany(db, data.agentId, companyId);
      }
      // Validate userId is a member of the same company
      if (data.userId) {
        const [membership] = await db
          .select({ id: companyMemberships.id })
          .from(companyMemberships)
          .where(
            and(
              eq(companyMemberships.companyId, companyId),
              eq(companyMemberships.principalType, "user"),
              eq(companyMemberships.principalId, data.userId),
              eq(companyMemberships.status, "active"),
            ),
          )
          .limit(1);
        if (!membership) {
          throw Object.assign(
            new Error(`User ${data.userId} is not an active member of this company`),
            { status: 422 },
          );
        }
      }
      return db
        .insert(teamMembers)
        .values({ teamId, companyId, ...data })
        .onConflictDoNothing()
        .returning()
        .then((rows) => rows[0] ?? null);
    },

    removeMember: (teamId: string, memberId: string) =>
      db
        .delete(teamMembers)
        .where(and(eq(teamMembers.id, memberId), eq(teamMembers.teamId, teamId)))
        .returning()
        .then((rows) => rows[0] ?? null),
  };
}

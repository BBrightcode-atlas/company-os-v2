import { and, asc, desc, eq, isNull, lte, or } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  agents,
  companyMemberships,
  projects,
  projectMembers,
  projectMilestones,
  projectTeams,
  projectUpdates,
  teams,
} from "@paperclipai/db";
import type { ProjectHealth } from "@paperclipai/shared";

async function assertEntityInCompany<T extends { companyId: string | null }>(
  tx: { select: Db["select"] },
  table: any,
  id: string,
  companyId: string,
  label: string,
): Promise<void> {
  const [row] = await tx.select({ companyId: table.companyId }).from(table).where(eq(table.id, id)).limit(1);
  if (!row) {
    throw Object.assign(new Error(`${label} ${id} not found`), { status: 404 });
  }
  if (row.companyId !== companyId) {
    throw Object.assign(new Error(`${label} ${id} does not belong to this company`), {
      status: 422,
    });
  }
}

export function projectExtrasService(db: Db) {
  return {
    // === project_teams (N:M) ===

    listTeams: async (projectId: string) => {
      return db
        .select({
          projectId: projectTeams.projectId,
          teamId: projectTeams.teamId,
          addedAt: projectTeams.addedAt,
          team: {
            id: teams.id,
            name: teams.name,
            identifier: teams.identifier,
            color: teams.color,
            status: teams.status,
          },
        })
        .from(projectTeams)
        .innerJoin(teams, eq(projectTeams.teamId, teams.id))
        .where(eq(projectTeams.projectId, projectId))
        .orderBy(asc(projectTeams.addedAt));
    },

    addTeam: async (projectId: string, companyId: string, teamId: string) => {
      return db.transaction(async (tx) => {
        await assertEntityInCompany(tx, projects, projectId, companyId, "Project");
        await assertEntityInCompany(tx, teams, teamId, companyId, "Team");
        const [row] = await tx
          .insert(projectTeams)
          .values({ projectId, teamId, companyId })
          .onConflictDoNothing()
          .returning();
        return row ?? null;
      });
    },

    removeTeam: async (projectId: string, teamId: string) =>
      db
        .delete(projectTeams)
        .where(and(eq(projectTeams.projectId, projectId), eq(projectTeams.teamId, teamId)))
        .returning()
        .then((rows) => rows[0] ?? null),

    // === project_members ===

    listMembers: (projectId: string) =>
      db
        .select()
        .from(projectMembers)
        .where(eq(projectMembers.projectId, projectId))
        .orderBy(asc(projectMembers.joinedAt)),

    addMember: async (
      projectId: string,
      companyId: string,
      data: { agentId?: string; userId?: string; role?: string },
    ) => {
      if (!data.agentId && !data.userId) {
        throw Object.assign(new Error(`Must provide agentId or userId`), { status: 422 });
      }
      return db.transaction(async (tx) => {
        await assertEntityInCompany(tx, projects, projectId, companyId, "Project");
        if (data.agentId) {
          const [agent] = await tx
            .select({ companyId: agents.companyId })
            .from(agents)
            .where(eq(agents.id, data.agentId))
            .limit(1);
          if (!agent) {
            throw Object.assign(new Error(`Agent ${data.agentId} not found`), { status: 404 });
          }
          if (agent.companyId !== companyId) {
            throw Object.assign(
              new Error(`Agent ${data.agentId} does not belong to this company`),
              { status: 422 },
            );
          }
        }
        // P0 fix — validate userId is a member of this company.
        // company_memberships uses principal_type/principal_id; "user" is the type.
        if (data.userId) {
          const [membership] = await tx
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
        const [row] = await tx
          .insert(projectMembers)
          .values({ projectId, companyId, ...data })
          .onConflictDoNothing()
          .returning();
        return row ?? null;
      });
    },

    removeMember: (projectId: string, memberId: string) =>
      db
        .delete(projectMembers)
        .where(and(eq(projectMembers.id, memberId), eq(projectMembers.projectId, projectId)))
        .returning()
        .then((rows) => rows[0] ?? null),

    // === project_milestones ===

    listMilestones: (projectId: string) =>
      db
        .select()
        .from(projectMilestones)
        .where(eq(projectMilestones.projectId, projectId))
        .orderBy(asc(projectMilestones.sortOrder), asc(projectMilestones.createdAt)),

    getMilestoneById: (id: string) =>
      db
        .select()
        .from(projectMilestones)
        .where(eq(projectMilestones.id, id))
        .then((rows) => rows[0] ?? null),

    createMilestone: async (
      projectId: string,
      companyId: string,
      data: {
        name: string;
        description?: string | null;
        targetDate?: string | null;
        status?: string;
        sortOrder?: number;
      },
    ) => {
      return db.transaction(async (tx) => {
        await assertEntityInCompany(tx, projects, projectId, companyId, "Project");
        const [row] = await tx
          .insert(projectMilestones)
          .values({
            projectId,
            companyId,
            name: data.name,
            description: data.description ?? null,
            targetDate: data.targetDate ?? null,
            status: data.status ?? "planned",
            sortOrder: data.sortOrder ?? 0,
          })
          .returning();
        return row;
      });
    },

    updateMilestone: (id: string, data: Record<string, unknown>) =>
      db
        .update(projectMilestones)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(projectMilestones.id, id))
        .returning()
        .then((rows) => rows[0] ?? null),

    // Delete a milestone, scoped to projectId for safety. The migration uses
    // ON DELETE SET NULL on issues.milestone_id which is safe now that
    // milestoneId scope is enforced on issue create/update (P0 fix #1).
    removeMilestone: (projectId: string, id: string) =>
      db
        .delete(projectMilestones)
        .where(and(eq(projectMilestones.id, id), eq(projectMilestones.projectId, projectId)))
        .returning()
        .then((rows) => rows[0] ?? null),

    // === project_updates (health) ===

    listUpdates: (projectId: string, limit = 50) =>
      db
        .select()
        .from(projectUpdates)
        .where(eq(projectUpdates.projectId, projectId))
        .orderBy(desc(projectUpdates.createdAt))
        .limit(limit),

    createUpdate: async (
      projectId: string,
      companyId: string,
      data: {
        health: ProjectHealth;
        body: string;
        createdByAgentId?: string | null;
        createdByUserId?: string | null;
      },
    ) => {
      return db.transaction(async (tx) => {
        await assertEntityInCompany(tx, projects, projectId, companyId, "Project");
        const now = new Date();
        const [row] = await tx
          .insert(projectUpdates)
          .values({
            projectId,
            companyId,
            health: data.health,
            body: data.body,
            createdByAgentId: data.createdByAgentId ?? null,
            createdByUserId: data.createdByUserId ?? null,
            createdAt: now,
          })
          .returning();
        // Denormalize: update projects.health + healthUpdatedAt with monotonic
        // guard. If a newer update has already committed, our stale write
        // becomes a no-op and the latest health stands. (P1 race fix)
        await tx
          .update(projects)
          .set({
            health: data.health,
            healthUpdatedAt: now,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(projects.id, projectId),
              or(isNull(projects.healthUpdatedAt), lte(projects.healthUpdatedAt, now)),
            ),
          );
        return row;
      });
    },
  };
}

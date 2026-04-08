import { and, eq, asc, ne, inArray } from "drizzle-orm";
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

    /**
     * Return all agent→team memberships in a company as a flat list.
     * Used by the Org Chart to render team color dots per card without
     * N+1 fetches. Excludes deleted teams. Scoped by company_id on
     * team_members (Phase 1 hardening column).
     */
    agentMembershipsForCompany: (companyId: string) =>
      db
        .select({
          agentId: teamMembers.agentId,
          role: teamMembers.role,
          teamId: teams.id,
          name: teams.name,
          identifier: teams.identifier,
          color: teams.color,
        })
        .from(teamMembers)
        .innerJoin(teams, eq(teamMembers.teamId, teams.id))
        .where(
          and(
            eq(teamMembers.companyId, companyId),
            ne(teams.status, "deleted"),
          ),
        )
        .orderBy(asc(teams.name)),

    /**
     * List teams this agent belongs to within a company (scoped by
     * team_members.company_id to prevent cross-tenant leak).
     * Returns the team row plus the member's role in that team.
     */
    listForAgent: async (agentId: string, companyId: string) => {
      await assertAgentInCompany(db, agentId, companyId);
      return db
        .select({
          team: teams,
          role: teamMembers.role,
          memberCreatedAt: teamMembers.createdAt,
        })
        .from(teamMembers)
        .innerJoin(teams, eq(teamMembers.teamId, teams.id))
        .where(
          and(
            eq(teamMembers.agentId, agentId),
            eq(teamMembers.companyId, companyId),
            ne(teams.status, "deleted"),
          ),
        )
        .orderBy(asc(teams.name));
    },

    /**
     * Aggregate instructions markdown for a leader agent: one section per
     * team where this agent has role=lead, each listing the team's
     * non-CLI sub-agents (adapterType !== "claude_local"). Used by the
     * Agent Detail "Team Instructions" preview card, and designed to be
     * the single endpoint a leader CLI hits at startup (Phase 4).
     *
     * Returns `{ teams: [...], markdown: "..." }` — empty `teams[]` if
     * the agent does not lead any team.
     */
    leaderInstructionsForAgent: async (agentId: string, companyId: string) => {
      await assertAgentInCompany(db, agentId, companyId);

      // 1. Find all teams this agent leads in this company.
      const leaderships = await db
        .select({
          teamId: teams.id,
          name: teams.name,
          identifier: teams.identifier,
        })
        .from(teamMembers)
        .innerJoin(teams, eq(teamMembers.teamId, teams.id))
        .where(
          and(
            eq(teamMembers.agentId, agentId),
            eq(teamMembers.companyId, companyId),
            eq(teamMembers.role, "lead"),
            ne(teams.status, "deleted"),
          ),
        )
        .orderBy(asc(teams.name));

      if (leaderships.length === 0) {
        return { teams: [] as Array<{ id: string; name: string; identifier: string; subAgents: Array<{ id: string; name: string; title: string | null; capabilities: string | null }> }>, markdown: "" };
      }

      // 2. Fetch all non-lead members for these teams in ONE query. Filtering
      // by teamMembers.role = "member" at the SQL layer is the correct
      // discriminator — schema-enforced, smaller result set, and does not
      // rely on agents.adapter_type string conventions being consistent.
      // Peer leader agents (other lead CLIs) are intentionally excluded
      // because you can't "spawn" a peer leader via the Agent tool.
      const teamIds = leaderships.map((t) => t.teamId);
      const memberRows = await db
        .select({ teamId: teamMembers.teamId, agentId: teamMembers.agentId })
        .from(teamMembers)
        .where(
          and(
            inArray(teamMembers.teamId, teamIds),
            eq(teamMembers.companyId, companyId),
            eq(teamMembers.role, "member"),
          ),
        );

      const subAgentIds = Array.from(
        new Set(
          memberRows
            .map((r) => r.agentId)
            .filter((id): id is string => id !== null && id !== agentId),
        ),
      );

      // 3. Fetch agent details in ONE query. Redundant company_id filter
      // is defense-in-depth against a corrupt team_members row referencing
      // an agent in another company (cross-tenant belt-and-suspenders).
      const agentRows = subAgentIds.length === 0
        ? []
        : await db
            .select({
              id: agents.id,
              name: agents.name,
              title: agents.title,
              capabilities: agents.capabilities,
              companyId: agents.companyId,
            })
            .from(agents)
            .where(
              and(
                inArray(agents.id, subAgentIds),
                eq(agents.companyId, companyId),
              ),
            );

      const subAgentById = new Map(
        agentRows.map((a) => [a.id, a] as const),
      );

      // 4. Group sub-agents by team.
      const teamSubAgents = new Map<string, Array<{ id: string; name: string; title: string | null; capabilities: string | null }>>();
      for (const row of memberRows) {
        if (!row.agentId || row.agentId === agentId) continue;
        const a = subAgentById.get(row.agentId);
        if (!a) continue;
        const list = teamSubAgents.get(row.teamId) ?? [];
        list.push({ id: a.id, name: a.name, title: a.title, capabilities: a.capabilities });
        teamSubAgents.set(row.teamId, list);
      }

      // 5. Build markdown.
      const lines: string[] = [];
      const teamsOut: Array<{ id: string; name: string; identifier: string; subAgents: Array<{ id: string; name: string; title: string | null; capabilities: string | null }> }> = [];
      for (const t of leaderships) {
        const subs = teamSubAgents.get(t.teamId) ?? [];
        teamsOut.push({ id: t.teamId, name: t.name, identifier: t.identifier, subAgents: subs });

        lines.push(`## ${t.name} Team (${t.identifier}) — Members`);
        lines.push("");
        if (subs.length === 0) {
          lines.push("_No sub-agents on this team yet._");
        } else {
          lines.push("Sub-agents you can spawn via the Agent tool to delegate work:");
          lines.push("");
          for (const a of subs) {
            const title = a.title ? ` (${a.title})` : "";
            const caps = a.capabilities ? `: ${a.capabilities}` : "";
            lines.push(`- **${a.name}**${title}${caps}`);
          }
        }
        lines.push("");
      }

      return { teams: teamsOut, markdown: lines.join("\n").trimEnd() };
    },

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

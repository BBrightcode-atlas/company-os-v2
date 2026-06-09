/**
 * GroundingSnapshot — a frozen, live read of company state captured INSIDE the action scope
 * (where ctx.* RPCs work) and handed to the tool executor that runs in the fire-and-forget
 * reply IIFE (where ctx.* RPCs are dead). Every grounded answer reads only from this snapshot,
 * so the agent reasons over real state instead of guessing.
 */

export interface AgentLite {
  id: string;
  name: string;
  role: string | null;
  status: string | null;
  adapterType: string | null;
  model: string | null;
}
export interface ProjectLite {
  id: string;
  name: string;
  status: string | null;
  workspacePath: string | null;
  repoUrl: string | null;
  branch: string | null;
}
export interface IssueLite {
  id: string;
  identifier: string | null;
  title: string;
  status: string;
  priority: string;
  projectId: string | null;
  assigneeAgentId: string | null;
}
export interface GoalLite {
  id: string;
  title: string;
  level: string | null;
  status: string | null;
}
export interface IssueDetail {
  issue: IssueLite & { description?: string | null; goalId?: string | null };
  comments: { authorAgentId: string | null; authorUserId: string | null; body: string; createdAt: string }[];
  subtree: unknown;
  orchestration: unknown;
}
export interface GroundingSnapshot {
  companyId: string;
  callerAgentId: string;
  agents: AgentLite[];
  projects: ProjectLite[];
  issues: IssueLite[];
  goals: GoalLite[];
  issueDetail: Record<string, IssueDetail>;
}

/** The subset of ctx the snapshot builder needs (all live in the action scope). */
export interface SnapshotCtx {
  agents: { list(input: { companyId: string; limit?: number }): Promise<unknown[]> };
  projects: {
    list(input: { companyId: string; limit?: number }): Promise<unknown[]>;
    getPrimaryWorkspace(projectId: string, companyId: string): Promise<unknown>;
  };
  goals: { list(input: { companyId: string; limit?: number }): Promise<unknown[]> };
  issues: {
    list(input: { companyId: string; assigneeAgentId?: string; projectId?: string; status?: string; limit?: number }): Promise<unknown[]>;
    get(issueId: string, companyId: string): Promise<unknown>;
    getSubtree(issueId: string, companyId: string, options?: unknown): Promise<unknown>;
    listComments(issueId: string, companyId: string): Promise<unknown[]>;
    summaries: { getOrchestration(input: { issueId: string; companyId: string; includeSubtree?: boolean }): Promise<unknown> };
  };
}

const ISSUE_REF_RE = /\b[A-Z][A-Z0-9]+-\d+\b/g;

function s(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function toAgent(a: Record<string, unknown>): AgentLite {
  const cfg = (a.adapterConfig ?? a.adapter_config ?? {}) as Record<string, unknown>;
  return {
    id: String(a.id),
    name: String(a.name ?? ""),
    role: s(a.role),
    status: s(a.status),
    adapterType: s(a.adapterType ?? a.adapter_type),
    model: s(cfg.model),
  };
}
function toIssue(i: Record<string, unknown>): IssueLite {
  return {
    id: String(i.id),
    identifier: s(i.identifier),
    title: String(i.title ?? ""),
    status: String(i.status ?? ""),
    priority: String(i.priority ?? ""),
    projectId: s(i.projectId),
    assigneeAgentId: s(i.assigneeAgentId),
  };
}
function toGoal(g: Record<string, unknown>): GoalLite {
  return { id: String(g.id), title: String(g.title ?? ""), level: s(g.level), status: s(g.status) };
}

/** Run a read, swallowing BOTH sync throws (missing ctx namespace) and async rejections. */
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return (await fn()) ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Build the snapshot. Bounded (limits + only referenced issues get deep detail) to stay within
 * the 30s action budget. Every call is best-effort: a failed read degrades to empty, never throws.
 */
export async function buildSnapshot(
  ctx: SnapshotCtx,
  companyId: string,
  callerAgentId: string,
  lastHumanText: string,
): Promise<GroundingSnapshot> {
  const [agentsRaw, projectsRaw, goalsRaw, recentIssues, myIssues] = await Promise.all([
    safe(() => ctx.agents.list({ companyId, limit: 200 }), [] as unknown[]),
    safe(() => ctx.projects.list({ companyId, limit: 100 }), [] as unknown[]),
    safe(() => ctx.goals.list({ companyId, limit: 100 }), [] as unknown[]),
    safe(() => ctx.issues.list({ companyId, limit: 150 }), [] as unknown[]),
    callerAgentId
      ? safe(() => ctx.issues.list({ companyId, assigneeAgentId: callerAgentId, limit: 60 }), [] as unknown[])
      : Promise.resolve([] as unknown[]),
  ]);

  const issueById = new Map<string, IssueLite>();
  for (const raw of [...(recentIssues as Record<string, unknown>[]), ...(myIssues as Record<string, unknown>[])]) {
    const i = toIssue(raw);
    issueById.set(i.id, i);
  }
  const issues = [...issueById.values()];

  // primary workspace per project (parallel, best-effort) for code/branch grounding
  const projects: ProjectLite[] = await Promise.all(
    (projectsRaw as Record<string, unknown>[]).map(async (p) => {
      const id = String(p.id);
      const ws = await safe(
        () => ctx.projects.getPrimaryWorkspace(id, companyId) as Promise<Record<string, unknown> | null>,
        null,
      );
      return {
        id,
        name: String(p.name ?? ""),
        status: s(p.status),
        workspacePath: ws ? s(ws.path) : null,
        repoUrl: ws ? s(ws.repoUrl) : null,
        branch: ws ? s(ws.repoRef ?? ws.defaultRef) : null,
      };
    }),
  );

  // deep detail only for issue identifiers the human actually referenced
  const refs = [...new Set((lastHumanText.match(ISSUE_REF_RE) ?? []))].slice(0, 5);
  const byIdent = new Map(issues.filter((i) => i.identifier).map((i) => [i.identifier as string, i]));
  const issueDetail: Record<string, IssueDetail> = {};
  await Promise.all(
    refs.map(async (ident) => {
      const lite = byIdent.get(ident);
      if (!lite) return;
      const [full, subtree, orch, comments] = await Promise.all([
        safe(() => ctx.issues.get(lite.id, companyId) as Promise<Record<string, unknown> | null>, null),
        safe(() => ctx.issues.getSubtree(lite.id, companyId, { includeActiveRuns: true, includeRelations: true }), null),
        safe(() => ctx.issues.summaries.getOrchestration({ issueId: lite.id, companyId, includeSubtree: false }), null),
        safe(() => ctx.issues.listComments(lite.id, companyId), [] as unknown[]),
      ]);
      const fi = (full ?? {}) as Record<string, unknown>;
      issueDetail[ident] = {
        issue: { ...lite, description: s(fi.description), goalId: s(fi.goalId) },
        comments: (comments as Record<string, unknown>[]).slice(-20).map((c) => ({
          authorAgentId: s(c.authorAgentId),
          authorUserId: s(c.authorUserId),
          body: String(c.body ?? ""),
          createdAt: String(c.createdAt ?? ""),
        })),
        subtree,
        orchestration: orch,
      };
    }),
  );

  return {
    companyId,
    callerAgentId,
    agents: (agentsRaw as Record<string, unknown>[]).map(toAgent),
    projects,
    issues,
    goals: (goalsRaw as Record<string, unknown>[]).map(toGoal),
    issueDetail,
  };
}

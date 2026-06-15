export type ProjectStatus = "backlog" | "planned" | "in_progress" | "completed" | "cancelled" | string;
export type IssueStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done" | "blocked" | "cancelled" | string;

export interface PortfolioProject {
  id: string;
  urlKey?: string | null;
  name: string;
  status: ProjectStatus;
  targetDate: string | null;
  archivedAt?: string | Date | null;
  updatedAt: string | Date;
}

export interface PortfolioIssue {
  id: string;
  projectId: string | null;
  parentId: string | null;
  identifier: string | null;
  title: string;
  status: IssueStatus;
  assigneeAgentId: string | null;
  updatedAt: string | Date;
}

export interface PortfolioAgent {
  id: string;
  name: string;
}

export type ScheduleState = "completed" | "overdue" | "due_soon" | "on_track" | "asap";

export interface PortfolioProgress {
  done: number;
  total: number;
  percent: number;
}

export interface ActiveWorkItem {
  id: string;
  identifier: string | null;
  title: string;
  agentId: string | null;
  agentName: string;
}

export interface PortfolioRow {
  project: PortfolioProject;
  progress: PortfolioProgress;
  schedule: ScheduleState;
  activeWork: ActiveWorkItem[];
  activeSummary: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DUE_SOON_DAYS = 14;
const TERMINAL_ISSUE_STATUSES = new Set<IssueStatus>(["cancelled"]);

function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function projectHref(project: PortfolioProject): string {
  return `/projects/${encodeURIComponent(project.urlKey || project.id)}`;
}

export function issueHref(issue: ActiveWorkItem): string {
  return `/issues/${encodeURIComponent(issue.identifier || issue.id)}`;
}

export function isLeafIssue(issue: PortfolioIssue, projectIssues: PortfolioIssue[]): boolean {
  return !projectIssues.some((candidate) => candidate.parentId === issue.id);
}

export function calculateProgress(projectIssues: PortfolioIssue[]): PortfolioProgress {
  const leafIssues = projectIssues.filter((issue) =>
    isLeafIssue(issue, projectIssues) && !TERMINAL_ISSUE_STATUSES.has(issue.status)
  );
  const total = leafIssues.length;
  const done = leafIssues.filter((issue) => issue.status === "done").length;
  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

export function scheduleState(project: PortfolioProject, progress: PortfolioProgress, today = new Date()): ScheduleState {
  if (project.status === "completed" || progress.percent === 100) return "completed";
  const targetDate = parseDate(project.targetDate);
  if (!targetDate) return "asap";

  const todayStart = startOfDay(today);
  const targetStart = startOfDay(targetDate);
  const daysUntilDue = Math.ceil((targetStart.getTime() - todayStart.getTime()) / DAY_MS);
  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue <= DUE_SOON_DAYS) return "due_soon";
  return "on_track";
}

export function activeWorkForProject(projectIssues: PortfolioIssue[], agents: PortfolioAgent[]): ActiveWorkItem[] {
  const agentById = new Map(agents.map((agent) => [agent.id, agent]));
  return projectIssues
    .filter((issue) => issue.status === "in_progress")
    .sort((left, right) => {
      const leftTime = parseDate(left.updatedAt)?.getTime() ?? 0;
      const rightTime = parseDate(right.updatedAt)?.getTime() ?? 0;
      return rightTime - leftTime || left.title.localeCompare(right.title);
    })
    .map((issue) => ({
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      agentId: issue.assigneeAgentId,
      agentName: issue.assigneeAgentId ? agentById.get(issue.assigneeAgentId)?.name ?? "Unknown agent" : "Unassigned",
    }));
}

export function summarizeActiveWork(activeWork: ActiveWorkItem[], maxEntries = 2): string {
  if (activeWork.length === 0) return "None";

  const counts = new Map<string, number>();
  for (const item of activeWork) {
    counts.set(item.agentName, (counts.get(item.agentName) ?? 0) + 1);
  }

  const entries = [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([name, count]) => count > 1 ? `${name} x${count}` : name);

  if (entries.length <= maxEntries) return entries.join(", ");
  return `${entries.slice(0, maxEntries).join(", ")} +${entries.length - maxEntries}`;
}

export function buildPortfolioRows(
  projects: PortfolioProject[],
  issues: PortfolioIssue[],
  agents: PortfolioAgent[],
  today = new Date(),
): PortfolioRow[] {
  const issuesByProjectId = new Map<string, PortfolioIssue[]>();
  for (const issue of issues) {
    if (!issue.projectId) continue;
    const list = issuesByProjectId.get(issue.projectId) ?? [];
    list.push(issue);
    issuesByProjectId.set(issue.projectId, list);
  }

  return projects
    .filter((project) => !project.archivedAt && project.status !== "cancelled")
    .map((project) => {
      const projectIssues = issuesByProjectId.get(project.id) ?? [];
      const progress = calculateProgress(projectIssues);
      const activeWork = activeWorkForProject(projectIssues, agents);
      return {
        project,
        progress,
        schedule: scheduleState(project, progress, today),
        activeWork,
        activeSummary: summarizeActiveWork(activeWork),
      };
    })
    .sort(comparePortfolioRows);
}

export function comparePortfolioRows(left: PortfolioRow, right: PortfolioRow): number {
  const leftCompleted = left.project.status === "completed";
  const rightCompleted = right.project.status === "completed";
  if (leftCompleted !== rightCompleted) return leftCompleted ? 1 : -1;

  if (leftCompleted && rightCompleted) {
    const leftUpdated = parseDate(left.project.updatedAt)?.getTime() ?? 0;
    const rightUpdated = parseDate(right.project.updatedAt)?.getTime() ?? 0;
    return rightUpdated - leftUpdated || left.project.name.localeCompare(right.project.name);
  }

  const leftTarget = parseDate(left.project.targetDate);
  const rightTarget = parseDate(right.project.targetDate);
  if (leftTarget && rightTarget) {
    const targetDiff = startOfDay(leftTarget).getTime() - startOfDay(rightTarget).getTime();
    return targetDiff || scheduleRank(left.schedule) - scheduleRank(right.schedule) || left.project.name.localeCompare(right.project.name);
  }
  if (leftTarget && !rightTarget) return -1;
  if (!leftTarget && rightTarget) return 1;
  return left.project.name.localeCompare(right.project.name);
}

function scheduleRank(state: ScheduleState): number {
  switch (state) {
    case "overdue": return 0;
    case "due_soon": return 1;
    case "on_track": return 2;
    case "asap": return 3;
    case "completed": return 4;
  }
}

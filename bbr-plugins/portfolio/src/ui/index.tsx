import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useHostContext, useHostNavigation, type PluginPageProps } from "@paperclipai/plugin-sdk/ui";
import {
  buildPortfolioRows,
  issueHref,
  projectHref,
  type PortfolioAgent,
  type PortfolioIssue,
  type PortfolioProject,
  type PortfolioRow,
  type ScheduleState,
} from "../portfolio.js";

type LoadState =
  | { status: "idle" | "loading"; error: null }
  | { status: "error"; error: string }
  | { status: "ready"; error: null };

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function formatDate(value: string | null): string {
  if (!value) return "As soon as possible";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function scheduleLabel(state: ScheduleState): string {
  switch (state) {
    case "completed": return "Completed";
    case "overdue": return "Overdue";
    case "due_soon": return "Due soon";
    case "on_track": return "On track";
    case "asap": return "As soon as possible";
  }
}

function scheduleClassName(state: ScheduleState): string {
  switch (state) {
    case "completed": return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "overdue": return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
    case "due_soon": return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "on_track": return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    case "asap": return "border-border bg-muted text-muted-foreground";
  }
}

function statusClassName(status: string): string {
  if (status === "completed") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "in_progress") return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  if (status === "planned") return "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300";
  return "border-border bg-muted text-muted-foreground";
}

function Badge({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${className}`}>
      {children}
    </span>
  );
}

function ProgressCell({ row }: { row: PortfolioRow }) {
  return (
    <div className="min-w-[150px] space-y-1">
      <div key="label" className="text-xs tabular-nums text-foreground">
        {`${row.progress.done} / ${row.progress.total} · ${row.progress.percent}%`}
      </div>
      <div key="bar" className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground/70"
          style={{ width: `${Math.min(100, Math.max(0, row.progress.percent))}%` }}
        />
      </div>
    </div>
  );
}

function PortfolioTable({
  rows,
}: {
  rows: PortfolioRow[];
}) {
  const nav = useHostNavigation();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const toggleExpanded = (projectId: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
        No active projects to show.
      </div>
    );
  }

  const tableRows: ReactNode[] = [];
  for (const row of rows) {
    const isExpanded = expanded.has(row.project.id);
    tableRows.push(
      <tr key={`${row.project.id}:summary`} className="border-b border-border bg-background align-middle">
        <td key="toggle" className="px-3 py-2">
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-accent/50"
            aria-label={isExpanded ? `Collapse ${row.project.name}` : `Expand ${row.project.name}`}
            onClick={() => toggleExpanded(row.project.id)}
          >
            <span className="text-xs text-muted-foreground">{isExpanded ? "▾" : "▸"}</span>
          </button>
        </td>
        <td key="project" className="max-w-[280px] px-3 py-2">
          <a
            {...nav.linkProps(projectHref(row.project))}
            className="font-medium text-foreground hover:underline"
            onClick={(event) => {
              if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                event.preventDefault();
                nav.navigate(projectHref(row.project));
              }
            }}
          >
            {row.project.name}
          </a>
        </td>
        <td key="end" className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{formatDate(row.project.targetDate)}</td>
        <td key="progress" className="px-3 py-2"><ProgressCell row={row} /></td>
        <td key="schedule" className="px-3 py-2"><Badge className={scheduleClassName(row.schedule)}>{scheduleLabel(row.schedule)}</Badge></td>
        <td key="status" className="px-3 py-2"><Badge className={statusClassName(row.project.status)}>{row.project.status.replace("_", " ")}</Badge></td>
        <td key="active" className="max-w-[220px] truncate px-3 py-2 text-xs text-muted-foreground" title={row.activeSummary}>
          {row.activeSummary}
        </td>
      </tr>,
    );

    if (isExpanded) {
      tableRows.push(
        <tr key={`${row.project.id}:active`} className="border-b border-border bg-muted/20">
          <td key="spacer" />
          <td key="content" colSpan={6} className="px-3 py-3">
            {row.activeWork.length === 0 ? (
              <p className="text-sm text-muted-foreground">현재 작업 중인 이슈 없음</p>
            ) : (
              <div className="space-y-1">
                {row.activeWork.map((item) => (
                  <div key={item.id} className="grid grid-cols-[minmax(120px,180px)_1fr] gap-3 text-sm">
                    <span key="agent" className="truncate text-muted-foreground" title={item.agentName}>{item.agentName}</span>
                    <a
                      key="task"
                      {...nav.linkProps(issueHref(item))}
                      className="truncate text-foreground hover:underline"
                      title={item.title}
                      onClick={(event) => {
                        if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                          event.preventDefault();
                          nav.navigate(issueHref(item));
                        }
                      }}
                    >
                      {`${item.identifier ? `${item.identifier} ` : ""}${item.title}`}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>,
      );
    }
  }

  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full min-w-[920px] border-collapse text-sm">
        <thead key="head" className="bg-muted/60 text-xs text-muted-foreground">
          <tr className="border-b border-border">
            <th key="toggle" className="w-10 px-3 py-2 text-left font-medium" />
            <th key="project" className="px-3 py-2 text-left font-medium">Project</th>
            <th key="end" className="px-3 py-2 text-left font-medium">End</th>
            <th key="progress" className="px-3 py-2 text-left font-medium">Progress</th>
            <th key="schedule" className="px-3 py-2 text-left font-medium">Schedule</th>
            <th key="status" className="px-3 py-2 text-left font-medium">Status</th>
            <th key="active" className="px-3 py-2 text-left font-medium">Active</th>
          </tr>
        </thead>
        <tbody key="body">
          {tableRows}
        </tbody>
      </table>
    </div>
  );
}

export function PortfolioPage(_props: PluginPageProps) {
  const context = useHostContext();
  const companyId = context.companyId;
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [issues, setIssues] = useState<PortfolioIssue[]>([]);
  const [agents, setAgents] = useState<PortfolioAgent[]>([]);
  const [loadState, setLoadState] = useState<LoadState>({ status: "idle", error: null });

  useEffect(() => {
    let cancelled = false;
    if (!companyId) return;

    async function load() {
      setLoadState({ status: "loading", error: null });
      try {
        const [nextProjects, nextIssues, nextAgents] = await Promise.all([
          getJson<PortfolioProject[]>(`/companies/${companyId}/projects`),
          getJson<PortfolioIssue[]>(`/companies/${companyId}/issues?limit=5000`),
          getJson<PortfolioAgent[]>(`/companies/${companyId}/agents`),
        ]);
        if (cancelled) return;
        setProjects(nextProjects);
        setIssues(nextIssues);
        setAgents(nextAgents);
        setLoadState({ status: "ready", error: null });
      } catch (error) {
        if (cancelled) return;
        setLoadState({ status: "error", error: error instanceof Error ? error.message : "Failed to load portfolio" });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const rows = useMemo(() => buildPortfolioRows(projects, issues, agents), [agents, issues, projects]);
  const activeCount = rows.reduce((total, row) => total + row.activeWork.length, 0);

  if (!companyId) {
    return <p className="text-sm text-muted-foreground">Select a company to view Portfolio.</p>;
  }

  return (
    <div className="space-y-4">
      <div key="header" className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div key="title">
          <h1 key="heading" className="text-xl font-semibold tracking-normal">Portfolio</h1>
          <p key="description" className="mt-1 text-sm text-muted-foreground">
            Compare project progress, due dates, and active agent work.
          </p>
        </div>
        <div key="stats" className="flex items-center gap-4 text-xs text-muted-foreground">
          <span key="projects">{`${rows.length} projects`}</span>
          <span key="active">{`${activeCount} active tasks`}</span>
        </div>
      </div>

      {loadState.status === "error" ? (
        <div key="error" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {loadState.error}
        </div>
      ) : null}
      {loadState.status === "loading" || loadState.status === "idle" ? (
        <div key="loading" className="rounded-md border border-border bg-card px-4 py-8 text-sm text-muted-foreground">Loading portfolio…</div>
      ) : (
        <PortfolioTable key="table" rows={rows} />
      )}
    </div>
  );
}

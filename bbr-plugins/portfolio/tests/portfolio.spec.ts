import { describe, expect, it } from "vitest";
import {
  buildPortfolioRows,
  calculateProgress,
  summarizeActiveWork,
  type PortfolioAgent,
  type PortfolioIssue,
  type PortfolioProject,
} from "../src/portfolio.js";

function project(overrides: Partial<PortfolioProject>): PortfolioProject {
  return {
    id: "project-1",
    urlKey: "project-1",
    name: "Project 1",
    status: "in_progress",
    targetDate: null,
    updatedAt: "2026-06-01T00:00:00Z",
    archivedAt: null,
    ...overrides,
  };
}

function issue(overrides: Partial<PortfolioIssue>): PortfolioIssue {
  return {
    id: "issue-1",
    projectId: "project-1",
    parentId: null,
    identifier: "PAP-1",
    title: "Issue 1",
    status: "todo",
    assigneeAgentId: null,
    updatedAt: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

const agents: PortfolioAgent[] = [
  { id: "agent-1", name: "Codex" },
  { id: "agent-2", name: "Claude" },
  { id: "agent-3", name: "Gemini" },
];

describe("calculateProgress", () => {
  it("uses leaf issues only and excludes cancelled issues", () => {
    const progress = calculateProgress([
      issue({ id: "parent", status: "done" }),
      issue({ id: "child-1", parentId: "parent", status: "done" }),
      issue({ id: "child-2", parentId: "parent", status: "todo" }),
      issue({ id: "child-3", parentId: "parent", status: "cancelled" }),
    ]);

    expect(progress).toEqual({ done: 1, total: 2, percent: 50 });
  });

  it("shows empty projects as 0 / 0 · 0%", () => {
    expect(calculateProgress([])).toEqual({ done: 0, total: 0, percent: 0 });
  });
});

describe("buildPortfolioRows", () => {
  it("hides cancelled and archived projects", () => {
    const rows = buildPortfolioRows(
      [
        project({ id: "active", name: "Active" }),
        project({ id: "cancelled", name: "Cancelled", status: "cancelled" }),
        project({ id: "archived", name: "Archived", archivedAt: "2026-06-01T00:00:00Z" }),
      ],
      [],
      agents,
    );

    expect(rows.map((row) => row.project.id)).toEqual(["active"]);
  });

  it("marks due soon at 14 days and overdue after the target date", () => {
    const rows = buildPortfolioRows(
      [
        project({ id: "due", name: "Due", targetDate: "2026-06-15" }),
        project({ id: "overdue", name: "Overdue", targetDate: "2026-05-31" }),
        project({ id: "later", name: "Later", targetDate: "2026-07-10" }),
        project({ id: "asap", name: "ASAP", targetDate: null }),
      ],
      [],
      agents,
      new Date("2026-06-01T12:00:00Z"),
    );

    const byId = new Map(rows.map((row) => [row.project.id, row.schedule]));
    expect(byId.get("due")).toBe("due_soon");
    expect(byId.get("overdue")).toBe("overdue");
    expect(byId.get("later")).toBe("on_track");
    expect(byId.get("asap")).toBe("asap");
  });

  it("sorts incomplete dated projects first, ASAP next, completed projects last by recent update", () => {
    const rows = buildPortfolioRows(
      [
        project({ id: "done-old", name: "Done Old", status: "completed", updatedAt: "2026-06-01T00:00:00Z" }),
        project({ id: "asap", name: "ASAP", targetDate: null }),
        project({ id: "later", name: "Later", targetDate: "2026-07-01" }),
        project({ id: "sooner", name: "Sooner", targetDate: "2026-06-20" }),
        project({ id: "done-new", name: "Done New", status: "completed", updatedAt: "2026-06-10T00:00:00Z" }),
      ],
      [],
      agents,
      new Date("2026-06-01T12:00:00Z"),
    );

    expect(rows.map((row) => row.project.id)).toEqual(["sooner", "later", "asap", "done-new", "done-old"]);
  });

  it("summarizes active agents with per-agent counts", () => {
    const rows = buildPortfolioRows(
      [project({ id: "project-1" })],
      [
        issue({ id: "a", status: "in_progress", assigneeAgentId: "agent-1" }),
        issue({ id: "b", status: "in_progress", assigneeAgentId: "agent-1" }),
        issue({ id: "c", status: "in_progress", assigneeAgentId: "agent-2" }),
      ],
      agents,
    );

    expect(rows[0]?.activeSummary).toBe("Codex x2, Claude");
    expect(rows[0]?.activeWork).toHaveLength(3);
  });
});

describe("summarizeActiveWork", () => {
  it("collapses long active summaries", () => {
    expect(summarizeActiveWork([
      { id: "a", identifier: null, title: "A", agentId: "agent-1", agentName: "Codex" },
      { id: "b", identifier: null, title: "B", agentId: "agent-2", agentName: "Claude" },
      { id: "c", identifier: null, title: "C", agentId: "agent-3", agentName: "Gemini" },
    ])).toBe("Claude, Codex +1");
  });
});

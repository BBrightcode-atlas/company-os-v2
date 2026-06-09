import { describe, expect, it } from "vitest";
import { ensureThread, listThreadProposals } from "../src/db.js";
import { makeToolExecutor } from "../src/tools.js";
import type { GroundingSnapshot } from "../src/snapshot.js";
import type { IssueProposalPayload, RoadmapProposalPayload } from "../src/constants.js";
import { createMemDb } from "./helpers/pgmem.js";

function snap(over: Partial<GroundingSnapshot> = {}): GroundingSnapshot {
  return {
    companyId: "c1",
    callerAgentId: "a1",
    agents: [{ id: "a1", name: "CTO", role: "cto", status: "idle", adapterType: "claude_local", model: "claude-opus-4-8" }],
    projects: [{ id: "p1", name: "Flotter MVP", status: "active", workspacePath: "/repo", repoUrl: "git@x", branch: "main" }],
    issues: [{ id: "i1", identifier: "FLO-19", title: "Fix login", status: "in_progress", priority: "high", projectId: "p1", assigneeAgentId: "a1" }],
    goals: [{ id: "g1", title: "Ship v1", level: "company", status: "active" }],
    issueDetail: {
      "FLO-19": {
        issue: { id: "i1", identifier: "FLO-19", title: "Fix login", status: "in_progress", priority: "high", projectId: "p1", assigneeAgentId: "a1", description: "desc" },
        comments: [],
        subtree: null,
        orchestration: null,
      },
    },
    ...over,
  };
}

describe("grounded tool executor", () => {
  it("reads agents/issues from the snapshot; refuses an unknown issue", async () => {
    const db = createMemDb();
    const exec = makeToolExecutor({ snapshot: snap(), db, threadId: null, messageId: null, companyId: "c1", userId: "u1" });
    expect(await exec("list_agents", {})).toContain("CTO");
    expect(await exec("get_issue", { identifier: "FLO-19" })).toContain("Fix login");
    const unknown = await exec("get_issue", { identifier: "FLO-999" });
    expect(unknown).toMatch(/스냅샷에 없|추측/);
  });

  it("list_issues filters by assignee name resolved against the snapshot", async () => {
    const db = createMemDb();
    const exec = makeToolExecutor({ snapshot: snap(), db, threadId: null, messageId: null, companyId: "c1", userId: "u1" });
    const out = await exec("list_issues", { assigneeName: "CTO" });
    expect(out).toContain("FLO-19");
    const miss = await exec("list_issues", { assigneeName: "Ghost" });
    expect(miss).toMatch(/못 찾/);
  });

  it("propose_issue resolves names→ids and persists a pending proposal", async () => {
    const db = createMemDb();
    const t = await ensureThread(db, "c1", "u1", "a1");
    const exec = makeToolExecutor({ snapshot: snap(), db, threadId: t.id, messageId: null, companyId: "c1", userId: "u1" });
    const out = await exec("propose_issue", { title: "Add 2FA", assigneeName: "CTO", projectName: "Flotter MVP", priority: "high" });
    expect(out).toContain("초안");
    const props = await listThreadProposals(db, t.id);
    expect(props).toHaveLength(1);
    expect(props[0].kind).toBe("issue");
    const pl = props[0].payload as IssueProposalPayload;
    expect(pl.assigneeAgentId).toBe("a1");
    expect(pl.projectId).toBe("p1");
    expect(pl.priority).toBe("high");
  });

  it("propose_issue refuses an unknown assignee and writes nothing", async () => {
    const db = createMemDb();
    const t = await ensureThread(db, "c1", "u1", "a1");
    const exec = makeToolExecutor({ snapshot: snap(), db, threadId: t.id, messageId: null, companyId: "c1", userId: "u1" });
    const out = await exec("propose_issue", { title: "x", assigneeName: "Ghost" });
    expect(out).toMatch(/못 찾|보류/);
    expect(await listThreadProposals(db, t.id)).toHaveLength(0);
  });

  it("propose_roadmap resolves assignees + deps and persists a roadmap proposal", async () => {
    const db = createMemDb();
    const t = await ensureThread(db, "c1", "u1", "a1");
    const exec = makeToolExecutor({ snapshot: snap(), db, threadId: t.id, messageId: null, companyId: "c1", userId: "u1" });
    const out = await exec("propose_roadmap", {
      goalTitle: "Ship v1",
      goalLevel: "company",
      issues: [
        { title: "Backend", assigneeName: "CTO", priority: "high" },
        { title: "QA gate", assigneeName: "CTO", blockedByIndexes: [0] },
      ],
    });
    expect(out).toContain("로드맵 초안");
    const props = await listThreadProposals(db, t.id);
    expect(props).toHaveLength(1);
    expect(props[0].kind).toBe("roadmap");
    const pl = props[0].payload as RoadmapProposalPayload;
    expect(pl.goalTitle).toBe("Ship v1");
    expect(pl.goalLevel).toBe("company");
    expect(pl.issues).toHaveLength(2);
    expect(pl.issues[0].assigneeAgentId).toBe("a1");
    expect(pl.issues[0].priority).toBe("high");
    expect(pl.issues[1].blockedByIndexes).toEqual([0]);
  });
});

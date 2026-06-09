import { readFile, readdir } from "node:fs/promises";
import type { ChatTool } from "./llm.js";
import type { Db } from "./db.js";
import { insertProposal } from "./db.js";
import type { GroundingSnapshot, IssueLite, ProjectLite } from "./snapshot.js";
import type { GoalProposalPayload, IssueProposalPayload, RoadmapIssue, RoadmapProposalPayload } from "./constants.js";

/**
 * Grounded tool suite. READ tools serve ONLY from the frozen GroundingSnapshot (captured in the
 * live action scope) — the agent never guesses about project/issue/code state. WRITE intents
 * (propose_*) never mutate host data; they persist a chat_proposals row (ctx.db survives the
 * fire-and-forget IIFE) and render a confirm card. Real creation happens later in applyProposal.
 */
export const CHAT_TOOLS: ChatTool[] = [
  {
    name: "list_agents",
    description: "회사의 모든 에이전트 + 역할/상태/어댑터(claude_local/codex_local)/모델을 반환.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "list_projects",
    description: "회사의 모든 프로젝트(이름/상태/워크스페이스 경로/리포/브랜치)를 반환.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "list_issues",
    description:
      "이슈 목록을 필터(프로젝트명/담당자명/상태)로 조회. 키워드 전문검색은 불가 — 필터로만 조회됨.",
    input_schema: {
      type: "object",
      properties: {
        projectName: { type: "string" },
        assigneeName: { type: "string" },
        status: { type: "string", description: "backlog|todo|in_progress|in_review|done|blocked|cancelled" },
      },
      required: [],
    },
  },
  {
    name: "get_issue",
    description: "이슈 식별자(예: FLO-19)로 상세(상태/담당/설명/오케스트레이션)를 반환. 사실 주장 전 필수.",
    input_schema: {
      type: "object",
      properties: { identifier: { type: "string", description: "예: FLO-19" } },
      required: ["identifier"],
    },
  },
  {
    name: "get_issue_comments",
    description: "이슈 식별자의 최근 댓글/진행 이력을 반환.",
    input_schema: {
      type: "object",
      properties: { identifier: { type: "string" } },
      required: ["identifier"],
    },
  },
  {
    name: "get_run_state",
    description: "런 ID로 실제 실행 상태(status/error/exit_code/결과 요약)를 반환. '왜 실패했나' 같은 질문에 사용.",
    input_schema: {
      type: "object",
      properties: { runId: { type: "string" } },
      required: ["runId"],
    },
  },
  {
    name: "get_workspace_info",
    description: "프로젝트명 또는 이슈 식별자로 코드 워크스페이스 경로/리포/브랜치를 반환.",
    input_schema: {
      type: "object",
      properties: { projectName: { type: "string" }, identifier: { type: "string" } },
      required: [],
    },
  },
  {
    name: "list_goals",
    description: "회사의 목표(goal) 트리를 레벨/상태 필터로 반환 (로드맵/전략 grounding).",
    input_schema: {
      type: "object",
      properties: { level: { type: "string" }, status: { type: "string" } },
      required: [],
    },
  },
  {
    name: "list_dir",
    description: "디렉토리의 파일/폴더 목록(절대 경로). 코드 확인용.",
    input_schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
  },
  {
    name: "read_file",
    description: "텍스트 파일 내용(최대 ~40KB, 절대 경로). 코드 근거 제시용.",
    input_schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
  },
  {
    name: "propose_issue",
    description:
      "대화에서 도출된 이슈 초안을 만든다. 실제로 생성하지 않고 사용자 확인 카드를 띄운다. 담당자/프로젝트는 실제 이름으로.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        projectName: { type: "string" },
        assigneeName: { type: "string", description: "list_agents의 실제 이름" },
        priority: { type: "string", description: "critical|high|medium|low" },
      },
      required: ["title"],
    },
  },
  {
    name: "propose_goal",
    description: "대화에서 도출된 목표(goal) 초안을 만든다. 확인 카드를 띄운다.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        level: { type: "string", description: "company|team|agent|task" },
        ownerName: { type: "string" },
      },
      required: ["title"],
    },
  },
  {
    name: "propose_roadmap",
    description:
      "회의/논의를 로드맵으로 전환: 목표 1개 + 그 아래 여러 이슈(담당자·우선순위·의존성)를 한 번에 초안으로 만든다. " +
      "확인 시 goal 생성 → 이슈들 생성·담당자 지정 → 의존성(blockedBy) 연결까지 일괄 처리. 담당자는 실제 이름으로.",
    input_schema: {
      type: "object",
      properties: {
        goalTitle: { type: "string" },
        goalDescription: { type: "string" },
        goalLevel: { type: "string", description: "company|team|agent|task" },
        issues: {
          type: "array",
          description: "로드맵 하위 이슈들 (순서대로)",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              assigneeName: { type: "string" },
              priority: { type: "string", description: "critical|high|medium|low" },
              blockedByIndexes: {
                type: "array",
                description: "이 이슈가 의존하는 다른 이슈들의 배열 인덱스(0-base)",
                items: { type: "number" },
              },
            },
            required: ["title"],
          },
        },
      },
      required: ["goalTitle", "issues"],
    },
  },
];

/** Read-only subset (no propose_*) — used by group rooms where writes come later (Phase 3). */
export const CHAT_READ_TOOLS: ChatTool[] = CHAT_TOOLS.filter((t) => !t.name.startsWith("propose_"));

// Block obvious secret-bearing paths so a chat prompt can't exfiltrate credentials.
function pathAllowed(p: string): boolean {
  const lower = p.toLowerCase();
  return ![
    "/secret", "secret", ".env", "/.ssh", "credential",
    ".pem", "id_rsa", "id_ed25519", ".key", "password", "token",
  ].some((bad) => lower.includes(bad));
}

function findByName<T extends { name: string }>(list: T[], name: string): T | null {
  const q = name.trim().toLowerCase();
  if (!q) return null;
  return list.find((x) => x.name.toLowerCase() === q) ?? list.find((x) => x.name.toLowerCase().includes(q)) ?? null;
}

const VALID_PRIORITY = new Set(["critical", "high", "medium", "low"]);
const VALID_LEVEL = new Set(["company", "team", "agent", "task"]);

function issueView(i: IssueLite, agents: { id: string; name: string }[]): Record<string, unknown> {
  const a = agents.find((x) => x.id === i.assigneeAgentId);
  return { identifier: i.identifier, title: i.title, status: i.status, priority: i.priority, assignee: a?.name ?? null };
}
function projectView(p: ProjectLite): Record<string, unknown> {
  return { name: p.name, status: p.status, workspacePath: p.workspacePath, repoUrl: p.repoUrl, branch: p.branch };
}

export interface ToolExecutorOpts {
  snapshot: GroundingSnapshot;
  db: Db;
  threadId: string | null;
  roomId?: string | null;
  messageId: string | null;
  companyId: string;
  userId: string;
}

/**
 * Build the grounded tool executor. Reads come from the frozen snapshot; propose_* writes a
 * chat_proposals row via db (which survives the fire-and-forget IIFE). Never calls ctx.* lazily.
 */
export function makeToolExecutor(opts: ToolExecutorOpts) {
  const { snapshot: snap, db } = opts;
  return async (name: string, args: Record<string, unknown>): Promise<string> => {
    switch (name) {
      case "list_agents":
        return JSON.stringify(
          snap.agents.map((a) => ({ name: a.name, role: a.role, status: a.status, adapterType: a.adapterType, model: a.model })),
        );

      case "list_projects":
        return JSON.stringify(snap.projects.map(projectView));

      case "list_issues": {
        let issues = snap.issues;
        const note: string[] = [];
        if (args.projectName) {
          const p = findByName(snap.projects, String(args.projectName));
          if (!p) return `프로젝트 '${String(args.projectName)}'를 못 찾음. list_projects로 실제 이름 확인.`;
          issues = issues.filter((i) => i.projectId === p.id);
        }
        if (args.assigneeName) {
          const ag = findByName(snap.agents, String(args.assigneeName));
          if (!ag) return `담당자 '${String(args.assigneeName)}'를 못 찾음. list_agents 확인.`;
          issues = issues.filter((i) => i.assigneeAgentId === ag.id);
        }
        if (args.status) issues = issues.filter((i) => i.status === String(args.status));
        if (issues.length > 80) note.push(`(상위 80건만, 총 ${issues.length}건; 필터로 좁혀라)`);
        return JSON.stringify({ issues: issues.slice(0, 80).map((i) => issueView(i, snap.agents)), note: note.join(" ") || undefined });
      }

      case "get_issue": {
        const ident = String(args.identifier ?? "").trim();
        const detail = snap.issueDetail[ident];
        if (detail) {
          return JSON.stringify({
            identifier: ident,
            title: detail.issue.title,
            status: detail.issue.status,
            priority: detail.issue.priority,
            assignee: snap.agents.find((a) => a.id === detail.issue.assigneeAgentId)?.name ?? null,
            description: detail.issue.description ?? null,
            orchestration: detail.orchestration ?? null,
          });
        }
        const lite = snap.issues.find((i) => i.identifier === ident);
        if (lite) return JSON.stringify({ ...issueView(lite, snap.agents), note: "요약만 확보됨(상세 미선fetch)." });
        return `${ident}는 현재 스냅샷에 없음. 추측하지 말고, 식별자를 다시 확인하거나 새 메시지로 그 이슈를 직접 언급해 달라고 사용자에게 요청하라.`;
      }

      case "get_issue_comments": {
        const ident = String(args.identifier ?? "").trim();
        const detail = snap.issueDetail[ident];
        if (!detail) return `${ident}의 댓글은 스냅샷에 없음. 사용자가 그 식별자를 메시지에 직접 넣으면 다음 턴에 불러올 수 있음.`;
        return JSON.stringify({
          identifier: ident,
          comments: detail.comments.map((c) => ({
            author: snap.agents.find((a) => a.id === c.authorAgentId)?.name ?? (c.authorUserId ? "사용자" : "?"),
            body: c.body.slice(0, 1000),
            at: c.createdAt,
          })),
        });
      }

      case "get_run_state": {
        const runId = String(args.runId ?? "").trim();
        if (!runId) return "runId가 필요함.";
        try {
          const rows = await db.query<{ status: string; error: unknown; resultJson: unknown }>(
            `SELECT status, error, result_json AS "resultJson" FROM public.heartbeat_runs WHERE id=$1`,
            [runId],
          );
          if (!rows[0]) return `런 ${runId}를 못 찾음.`;
          const rj = (rows[0].resultJson ?? {}) as { result?: unknown; summary?: unknown };
          const summary = typeof rj.result === "string" ? rj.result : typeof rj.summary === "string" ? rj.summary : null;
          return JSON.stringify({
            runId,
            status: rows[0].status,
            error: rows[0].error ?? null,
            summary: summary ? String(summary).slice(0, 1500) : null,
          });
        } catch (e) {
          return `런 조회 실패: ${e instanceof Error ? e.message : "error"}`;
        }
      }

      case "get_workspace_info": {
        let proj: ProjectLite | null = null;
        if (args.projectName) proj = findByName(snap.projects, String(args.projectName));
        if (!proj && args.identifier) {
          const i = snap.issues.find((x) => x.identifier === String(args.identifier));
          if (i) proj = snap.projects.find((p) => p.id === i.projectId) ?? null;
        }
        if (!proj) return "프로젝트/이슈로 워크스페이스를 못 찾음. list_projects 확인.";
        return JSON.stringify(projectView(proj));
      }

      case "list_goals": {
        let goals = snap.goals;
        if (args.level) goals = goals.filter((g) => g.level === String(args.level));
        if (args.status) goals = goals.filter((g) => g.status === String(args.status));
        return JSON.stringify(goals.map((g) => ({ title: g.title, level: g.level, status: g.status })));
      }

      case "list_dir": {
        const p = String(args.path ?? "");
        if (!pathAllowed(p)) return "접근이 제한된 경로입니다.";
        try {
          const items = await readdir(p, { withFileTypes: true });
          return JSON.stringify(items.map((d) => ({ name: d.name, type: d.isDirectory() ? "dir" : "file" })));
        } catch (e) {
          return `읽기 실패: ${e instanceof Error ? e.message : "error"}`;
        }
      }
      case "read_file": {
        const p = String(args.path ?? "");
        if (!pathAllowed(p)) return "접근이 제한된 경로입니다 (secrets/credentials).";
        try {
          const txt = await readFile(p, "utf8");
          return txt.length > 40_000 ? `${txt.slice(0, 40_000)}\n…(이하 생략)` : txt;
        } catch (e) {
          return `읽기 실패: ${e instanceof Error ? e.message : "error"}`;
        }
      }

      case "propose_issue": {
        const title = String(args.title ?? "").trim();
        if (!title) return "title이 필요함.";
        const payload: IssueProposalPayload = { title };
        if (args.description) payload.description = String(args.description);
        if (args.projectName) {
          const p = findByName(snap.projects, String(args.projectName));
          if (!p) return `프로젝트 '${String(args.projectName)}'를 못 찾음 — 초안 보류. list_projects로 실제 이름 확인 후 다시.`;
          payload.projectId = p.id;
          payload.projectName = p.name;
        }
        if (args.assigneeName) {
          const ag = findByName(snap.agents, String(args.assigneeName));
          if (!ag) return `담당자 '${String(args.assigneeName)}'를 못 찾음 — 초안 보류. list_agents 확인 후 다시.`;
          payload.assigneeAgentId = ag.id;
          payload.assigneeName = ag.name;
        }
        if (args.priority && VALID_PRIORITY.has(String(args.priority))) {
          payload.priority = String(args.priority) as IssueProposalPayload["priority"];
        }
        await insertProposal(db, {
          threadId: opts.threadId, roomId: opts.roomId ?? null, messageId: opts.messageId, companyId: opts.companyId, userId: opts.userId,
          kind: "issue", title, payload,
        });
        return `이슈 초안 생성됨: "${title}"${payload.assigneeName ? ` (담당: ${payload.assigneeName})` : ""}. 사용자 확인 카드를 띄웠다 — 길게 설명 말고 "확인을 눌러 생성하세요"처럼 짧게 안내하라.`;
      }

      case "propose_goal": {
        const title = String(args.title ?? "").trim();
        if (!title) return "title이 필요함.";
        const payload: GoalProposalPayload = { title };
        if (args.description) payload.description = String(args.description);
        if (args.level && VALID_LEVEL.has(String(args.level))) payload.level = String(args.level) as GoalProposalPayload["level"];
        if (args.ownerName) {
          const ag = findByName(snap.agents, String(args.ownerName));
          if (ag) { payload.ownerAgentId = ag.id; payload.ownerName = ag.name; }
        }
        await insertProposal(db, {
          threadId: opts.threadId, roomId: opts.roomId ?? null, messageId: opts.messageId, companyId: opts.companyId, userId: opts.userId,
          kind: "goal", title, payload,
        });
        return `목표 초안 생성됨: "${title}". 확인 카드를 띄웠다 — 짧게 안내하라.`;
      }

      case "propose_roadmap": {
        const goalTitle = String(args.goalTitle ?? "").trim();
        if (!goalTitle) return "goalTitle이 필요함.";
        const rawIssues = Array.isArray(args.issues) ? (args.issues as Record<string, unknown>[]) : [];
        if (rawIssues.length === 0) return "issues가 비어있음 — 로드맵엔 최소 1개 이슈 필요.";
        const issues: RoadmapIssue[] = [];
        for (const ri of rawIssues) {
          const title = String(ri.title ?? "").trim();
          if (!title) continue;
          const issue: RoadmapIssue = { title };
          if (ri.description) issue.description = String(ri.description);
          if (ri.assigneeName) {
            const ag = findByName(snap.agents, String(ri.assigneeName));
            if (ag) {
              issue.assigneeAgentId = ag.id;
              issue.assigneeName = ag.name;
            }
            // unknown assignee → leave unassigned (a roadmap shouldn't fail wholesale)
          }
          if (ri.priority && VALID_PRIORITY.has(String(ri.priority))) issue.priority = String(ri.priority) as RoadmapIssue["priority"];
          if (Array.isArray(ri.blockedByIndexes)) {
            const idx = (ri.blockedByIndexes as unknown[]).map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 0);
            if (idx.length) issue.blockedByIndexes = idx;
          }
          issues.push(issue);
        }
        if (issues.length === 0) return "유효한 이슈가 없음.";
        const payload: RoadmapProposalPayload = { goalTitle, issues };
        if (args.goalDescription) payload.goalDescription = String(args.goalDescription);
        if (args.goalLevel && VALID_LEVEL.has(String(args.goalLevel))) {
          payload.goalLevel = String(args.goalLevel) as RoadmapProposalPayload["goalLevel"];
        }
        await insertProposal(db, {
          threadId: opts.threadId, roomId: opts.roomId ?? null, messageId: opts.messageId, companyId: opts.companyId, userId: opts.userId,
          kind: "roadmap", title: goalTitle, payload,
        });
        return `로드맵 초안 생성됨: 목표 "${goalTitle}" + 이슈 ${issues.length}개. 확인 카드를 띄웠다 — 이슈 목록 나열 말고 짧게 안내하라.`;
      }

      default:
        return `알 수 없는 도구: ${name}`;
    }
  };
}

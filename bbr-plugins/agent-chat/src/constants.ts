export const PLUGIN_KEY = "flotter.agent-chat";

export type ThreadStatus = "idle" | "streaming";
export type MessageRole = "human" | "agent";
export type MessageStatus =
  | "complete" // human message
  | "streaming"
  | "done"
  | "error"
  | "timeout";

export function taskKey(companyId: string, userId: string, agentId: string): string {
  return `plugin:${PLUGIN_KEY}:dm:${companyId}:${userId}:${agentId}`;
}

export function streamChannel(threadId: string, runId: string): string {
  return `chat:${threadId}:${runId}`;
}

/** ms with no session event before we mark the agent message as timed out. */
export const STREAM_IDLE_TIMEOUT_MS = 90_000;

export interface ChatThread {
  id: string;
  companyId: string;
  userId: string;
  agentId: string;
  taskKey: string;
  sessionId: string | null;
  status: ThreadStatus;
  lastRunId: string | null;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A file the user attached to a chat message. Images are sent to the agent (vision). */
export interface Attachment {
  /** Original filename, for display. */
  name: string;
  /** MIME type, e.g. "image/png". */
  mime: string;
  /** Byte size of the decoded file. */
  size: number;
  /** `data:<mime>;base64,<...>` URL — rendered inline and decoded for the LLM. */
  dataUrl: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  seq: number;
  role: MessageRole;
  body: string;
  status: MessageStatus;
  clientMessageId: string | null;
  runId: string | null;
  attachments: Attachment[];
  /** "text" (normal), "proposal" (renders a confirm card), "system" (facilitator/notice). */
  messageType: string;
  /** Free-form per-message metadata: { proposalId?, grounding?, ... }. */
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type ProposalKind = "issue" | "goal" | "roadmap";
export type ProposalStatus = "pending" | "applied" | "discarded" | "failed";

/** A drafted issue, resolved against the live grounding snapshot, awaiting human confirm. */
export interface IssueProposalPayload {
  title: string;
  description?: string;
  projectId?: string | null;
  projectName?: string | null;
  assigneeAgentId?: string | null;
  assigneeName?: string | null;
  priority?: "critical" | "high" | "medium" | "low";
}

export interface GoalProposalPayload {
  title: string;
  description?: string;
  level?: "company" | "team" | "agent" | "task";
  ownerAgentId?: string | null;
  ownerName?: string | null;
}

/** A child issue inside a roadmap proposal. blockedByIndexes reference other issues by array index. */
export interface RoadmapIssue {
  title: string;
  description?: string;
  assigneeAgentId?: string | null;
  assigneeName?: string | null;
  priority?: "critical" | "high" | "medium" | "low";
  blockedByIndexes?: number[];
}

/** A goal + an ordered, dependency-aware set of child issues, derived from a room discussion. */
export interface RoadmapProposalPayload {
  goalTitle: string;
  goalDescription?: string;
  goalLevel?: "company" | "team" | "agent" | "task";
  issues: RoadmapIssue[];
}

export interface ChatProposal {
  id: string;
  threadId: string | null;
  roomId: string | null;
  messageId: string | null;
  companyId: string;
  userId: string;
  kind: ProposalKind;
  title: string;
  payload: IssueProposalPayload | GoalProposalPayload | RoadmapProposalPayload;
  status: ProposalStatus;
  appliedResult: unknown;
  createdAt: string;
  updatedAt: string;
}

export type RoomKind = "group" | "standup" | "brainstorm";
export type RoomAuthorKind = "human" | "agent" | "system";

export interface ChatRoom {
  id: string;
  companyId: string;
  slug: string;
  displayName: string;
  kind: RoomKind;
  createdByUserId: string | null;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  seq: number;
  authorKind: RoomAuthorKind;
  authorAgentId: string | null;
  authorUserId: string | null;
  body: string;
  status: MessageStatus;
  clientMessageId: string | null;
  runId: string | null;
  messageType: string;
  metadata: Record<string, unknown>;
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export type StreamEventType = "chunk" | "done" | "error" | "timeout";

export interface ChatStreamEvent {
  type: StreamEventType;
  runId: string;
  text?: string;
  message?: string;
}

/**
 * The host streams the agent run's raw log output (Claude Code stream-json: one JSON
 * object per line — system/hook/assistant/result), not a clean token stream. Pull out
 * just the assistant's text so the chat shows the reply, not the run log. Falls back to
 * the trimmed raw output if no assistant lines are present (non-Claude adapters).
 */
export function extractAssistantText(raw: string): string {
  const texts: string[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    let obj: unknown;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      continue;
    }
    const rec = obj as {
      type?: unknown;
      message?: { content?: unknown };
      item?: { type?: unknown; text?: unknown };
    };
    // Claude Code stream-json: { type: "assistant", message: { content: [{ type:"text", text }] } }
    if (rec.type === "assistant" && Array.isArray(rec.message?.content)) {
      for (const part of rec.message!.content as Array<{ type?: unknown; text?: unknown }>) {
        if (part?.type === "text" && typeof part.text === "string") texts.push(part.text);
      }
    }
    // Codex stream-json: { type: "item.completed", item: { type: "agent_message", text } }
    if (rec.type === "item.completed" && rec.item?.type === "agent_message" && typeof rec.item.text === "string") {
      texts.push(rec.item.text);
    }
  }
  const joined = texts.join("\n").trim();
  return joined.length > 0 ? joined : raw.trim();
}

/** Terminal heartbeat run statuses. */
export function isTerminalRunStatus(status: string | null | undefined): boolean {
  return status === "succeeded" || status === "failed" || status === "cancelled" || status === "timed_out";
}

/**
 * Pull the agent's final reply out of a heartbeat run's result_json, across adapters:
 * claude_local exposes `result`, codex_local exposes `summary`; otherwise fall back to
 * parsing assistant text out of the stdout log.
 */
export function extractRunReply(resultJson: unknown): string {
  const rj = (resultJson ?? {}) as { result?: unknown; summary?: unknown; stdout?: unknown };
  if (typeof rj.result === "string" && rj.result.trim()) return rj.result.trim();
  if (typeof rj.summary === "string" && rj.summary.trim()) return rj.summary.trim();
  if (typeof rj.stdout === "string" && rj.stdout.trim()) {
    const fromStream = extractAssistantText(rj.stdout);
    if (fromStream && fromStream !== rj.stdout.trim()) return fromStream;
  }
  return "";
}

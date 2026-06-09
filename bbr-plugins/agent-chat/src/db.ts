import { randomUUID } from "node:crypto";
import type {
  Attachment,
  ChatMessage,
  ChatProposal,
  ChatRoom,
  ChatThread,
  MessageStatus,
  ProposalKind,
  ProposalStatus,
  RoomKind,
  RoomMessage,
} from "./constants.js";
import { taskKey } from "./constants.js";

/**
 * Minimal subset of the plugin `ctx.db` API used by this plugin.
 * The runtime does NOT put the plugin namespace on the search_path, and both
 * ctx.db.query and ctx.db.execute require namespace-qualified table names, so
 * every statement below qualifies tables with `${db.namespace}.<table>`.
 */
export interface Db {
  namespace: string;
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<{ rowCount: number }>;
}

// raw SQL returns snake_case columns; alias to the camelCase interface shape.
const THREAD_COLS = `id, company_id AS "companyId", user_id AS "userId", agent_id AS "agentId",
  task_key AS "taskKey", session_id AS "sessionId", status, last_run_id AS "lastRunId", hidden,
  created_at AS "createdAt", updated_at AS "updatedAt"`;
const MSG_COLS = `id, thread_id AS "threadId", seq, role, body, status,
  client_message_id AS "clientMessageId", run_id AS "runId", attachments,
  message_type AS "messageType", metadata,
  created_at AS "createdAt", updated_at AS "updatedAt"`;
const PROPOSAL_COLS = `id, thread_id AS "threadId", room_id AS "roomId", message_id AS "messageId",
  company_id AS "companyId", user_id AS "userId", kind, title, payload, status,
  applied_result AS "appliedResult", created_at AS "createdAt", updated_at AS "updatedAt"`;

// `db.namespace` is a host-derived, validated SQL identifier — safe to interpolate.
const threads = (db: Db) => `${db.namespace}.chat_threads`;
const messages = (db: Db) => `${db.namespace}.chat_messages`;
const proposals = (db: Db) => `${db.namespace}.chat_proposals`;
const rooms = (db: Db) => `${db.namespace}.chat_rooms`;
const roomMembers = (db: Db) => `${db.namespace}.chat_room_members`;
const roomMessages = (db: Db) => `${db.namespace}.chat_room_messages`;
const roomHidden = (db: Db) => `${db.namespace}.chat_room_hidden`;

const ROOM_COLS = `id, company_id AS "companyId", slug, display_name AS "displayName", kind,
  created_by_user_id AS "createdByUserId", hidden, created_at AS "createdAt", updated_at AS "updatedAt"`;
const ROOM_MSG_COLS = `id, room_id AS "roomId", seq, author_kind AS "authorKind",
  author_agent_id AS "authorAgentId", author_user_id AS "authorUserId", body, status,
  client_message_id AS "clientMessageId", run_id AS "runId", message_type AS "messageType",
  metadata, attachments, created_at AS "createdAt", updated_at AS "updatedAt"`;

/** jsonb comes back parsed from pg, but as a string from pg-mem — normalize. */
function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function mapMessage(row: ChatMessage): ChatMessage {
  let attachments = (row as { attachments?: unknown }).attachments;
  attachments = parseJson(attachments, [] as Attachment[]);
  return {
    ...row,
    seq: Number(row.seq),
    attachments: Array.isArray(attachments) ? attachments : [],
    messageType: (row as { messageType?: string }).messageType ?? "text",
    metadata: parseJson((row as { metadata?: unknown }).metadata, {} as Record<string, unknown>),
  };
}

function mapProposal(row: ChatProposal): ChatProposal {
  return {
    ...row,
    payload: parseJson((row as { payload?: unknown }).payload, {} as ChatProposal["payload"]),
    appliedResult: parseJson((row as { appliedResult?: unknown }).appliedResult, null),
  };
}

/** Return the existing DM thread, or null. Does NOT create one. */
export async function getThread(
  db: Db,
  companyId: string,
  userId: string,
  agentId: string,
): Promise<ChatThread | null> {
  const rows = await db.query<ChatThread>(
    `SELECT ${THREAD_COLS} FROM ${threads(db)} WHERE company_id=$1 AND user_id=$2 AND agent_id=$3 ORDER BY created_at ASC, id ASC LIMIT 1`,
    [companyId, userId, agentId],
  );
  return rows[0] ?? null;
}

export async function ensureThread(
  db: Db,
  companyId: string,
  userId: string,
  agentId: string,
): Promise<ChatThread> {
  const found = await db.query<ChatThread>(
    `SELECT ${THREAD_COLS} FROM ${threads(db)} WHERE company_id=$1 AND user_id=$2 AND agent_id=$3 ORDER BY created_at ASC, id ASC LIMIT 1`,
    [companyId, userId, agentId],
  );
  if (found[0]) return found[0];
  await db.execute(
    `INSERT INTO ${threads(db)} (id, company_id, user_id, agent_id, task_key, status)
     VALUES ($1,$2,$3,$4,$5,'idle')
     ON CONFLICT (company_id, user_id, agent_id) DO NOTHING`,
    [randomUUID(), companyId, userId, agentId, taskKey(companyId, userId, agentId)],
  );
  const rows = await db.query<ChatThread>(
    `SELECT ${THREAD_COLS} FROM ${threads(db)} WHERE company_id=$1 AND user_id=$2 AND agent_id=$3 ORDER BY created_at ASC, id ASC LIMIT 1`,
    [companyId, userId, agentId],
  );
  return rows[0];
}

/** Atomic idle->streaming transition. Returns true if the lock was acquired. */
export async function acquireLock(db: Db, threadId: string): Promise<boolean> {
  const r = await db.execute(
    `UPDATE ${threads(db)} SET status='streaming', updated_at=now() WHERE id=$1 AND status='idle'`,
    [threadId],
  );
  return r.rowCount === 1;
}

export async function releaseLock(db: Db, threadId: string): Promise<void> {
  await db.execute(
    `UPDATE ${threads(db)} SET status='idle', updated_at=now() WHERE id=$1`,
    [threadId],
  );
}

async function nextSeq(db: Db, threadId: string): Promise<number> {
  const r = await db.query<{ n: number }>(
    `SELECT COALESCE(MAX(seq),0)+1 AS n FROM ${messages(db)} WHERE thread_id=$1`,
    [threadId],
  );
  return Number(r[0].n);
}

export async function insertHumanMessage(
  db: Db,
  threadId: string,
  body: string,
  clientMessageId: string,
  attachments: Attachment[] = [],
): Promise<ChatMessage> {
  const existing = await db.query<ChatMessage>(
    `SELECT ${MSG_COLS} FROM ${messages(db)} WHERE thread_id=$1 AND client_message_id=$2`,
    [threadId, clientMessageId],
  );
  if (existing[0]) return mapMessage(existing[0]);
  const seq = await nextSeq(db, threadId);
  await db.execute(
    `INSERT INTO ${messages(db)} (id, thread_id, seq, role, body, status, client_message_id, attachments)
     VALUES ($1,$2,$3,'human',$4,'complete',$5,$6::jsonb)`,
    [randomUUID(), threadId, seq, body, clientMessageId, JSON.stringify(attachments ?? [])],
  );
  const rows = await db.query<ChatMessage>(
    `SELECT ${MSG_COLS} FROM ${messages(db)} WHERE thread_id=$1 AND client_message_id=$2`,
    [threadId, clientMessageId],
  );
  return mapMessage(rows[0]);
}

export async function insertAgentPlaceholder(
  db: Db,
  threadId: string,
  runId: string,
): Promise<ChatMessage> {
  // Idempotent on runId via a pre-check (we avoid ON CONFLICT so the same code path
  // works against the in-memory test backend, which lacks partial-index upsert support).
  const existing = await db.query<ChatMessage>(
    `SELECT ${MSG_COLS} FROM ${messages(db)} WHERE thread_id=$1 AND run_id=$2`,
    [threadId, runId],
  );
  if (existing[0]) return mapMessage(existing[0]);
  const seq = await nextSeq(db, threadId);
  await db.execute(
    `INSERT INTO ${messages(db)} (id, thread_id, seq, role, body, status, run_id)
     VALUES ($1,$2,$3,'agent','','streaming',$4)`,
    [randomUUID(), threadId, seq, runId],
  );
  const rows = await db.query<ChatMessage>(
    `SELECT ${MSG_COLS} FROM ${messages(db)} WHERE thread_id=$1 AND run_id=$2`,
    [threadId, runId],
  );
  return mapMessage(rows[0]);
}

export async function appendAgentChunk(db: Db, messageId: string, text: string): Promise<void> {
  await db.execute(
    `UPDATE ${messages(db)} SET body = body || $2, updated_at=now() WHERE id=$1`,
    [messageId, text],
  );
}

/** Insert a system notice (role='agent', message_type='system') — e.g. "✅ 이슈 생성됨". */
export async function insertSystemMessage(db: Db, threadId: string, body: string): Promise<void> {
  const seq = await nextSeq(db, threadId);
  await db.execute(
    `INSERT INTO ${messages(db)} (id, thread_id, seq, role, body, status, message_type)
     VALUES ($1,$2,$3,'agent',$4,'done','system')`,
    [randomUUID(), threadId, seq, body],
  );
}

export async function finalizeAgentMessage(
  db: Db,
  messageId: string,
  status: Extract<MessageStatus, "done" | "error" | "timeout">,
  finalBody?: string,
): Promise<void> {
  if (finalBody != null) {
    await db.execute(
      `UPDATE ${messages(db)} SET body=$2, status=$3, updated_at=now() WHERE id=$1`,
      [messageId, finalBody, status],
    );
  } else {
    await db.execute(
      `UPDATE ${messages(db)} SET status=$2, updated_at=now() WHERE id=$1`,
      [messageId, status],
    );
  }
}

export async function listMessages(db: Db, threadId: string): Promise<ChatMessage[]> {
  const rows = await db.query<ChatMessage>(
    `SELECT ${MSG_COLS} FROM ${messages(db)} WHERE thread_id=$1 ORDER BY seq ASC`,
    [threadId],
  );
  return rows.map(mapMessage);
}

export async function setThreadSession(
  db: Db,
  threadId: string,
  sessionId: string,
  runId: string,
): Promise<void> {
  await db.execute(
    `UPDATE ${threads(db)} SET session_id=$2, last_run_id=$3, updated_at=now() WHERE id=$1`,
    [threadId, sessionId, runId],
  );
}

export async function listThreadAgentIds(
  db: Db,
  companyId: string,
  userId: string,
): Promise<string[]> {
  const rows = await db.query<{ agentId: string }>(
    `SELECT agent_id AS "agentId" FROM ${threads(db)}
     WHERE company_id=$1 AND user_id=$2 AND NOT hidden ORDER BY updated_at DESC`,
    [companyId, userId],
  );
  return rows.map((r) => r.agentId);
}

/** Close (hidden=true) or reopen (hidden=false) a DM thread without touching its messages. */
export async function setThreadHidden(db: Db, threadId: string, hidden: boolean): Promise<void> {
  await db.execute(
    `UPDATE ${threads(db)} SET hidden=$2, updated_at=now() WHERE id=$1`,
    [threadId, hidden],
  );
}

// --- proposals: conversation → backlog, always human-confirm gated ----------

export async function insertProposal(
  db: Db,
  p: {
    threadId: string | null;
    roomId?: string | null;
    messageId: string | null;
    companyId: string;
    userId: string;
    kind: ProposalKind;
    title: string;
    payload: unknown;
  },
): Promise<ChatProposal> {
  const id = randomUUID();
  await db.execute(
    `INSERT INTO ${proposals(db)} (id, thread_id, room_id, message_id, company_id, user_id, kind, title, payload, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,'pending')`,
    [id, p.threadId, p.roomId ?? null, p.messageId, p.companyId, p.userId, p.kind, p.title, JSON.stringify(p.payload ?? {})],
  );
  const rows = await db.query<ChatProposal>(`SELECT ${PROPOSAL_COLS} FROM ${proposals(db)} WHERE id=$1`, [id]);
  return mapProposal(rows[0]);
}

export async function listThreadProposals(db: Db, threadId: string): Promise<ChatProposal[]> {
  const rows = await db.query<ChatProposal>(
    `SELECT ${PROPOSAL_COLS} FROM ${proposals(db)} WHERE thread_id=$1 ORDER BY created_at ASC`,
    [threadId],
  );
  return rows.map(mapProposal);
}

export async function listRoomProposals(db: Db, roomId: string): Promise<ChatProposal[]> {
  const rows = await db.query<ChatProposal>(
    `SELECT ${PROPOSAL_COLS} FROM ${proposals(db)} WHERE room_id=$1 ORDER BY created_at ASC`,
    [roomId],
  );
  return rows.map(mapProposal);
}

export async function getProposal(db: Db, proposalId: string): Promise<ChatProposal | null> {
  const rows = await db.query<ChatProposal>(`SELECT ${PROPOSAL_COLS} FROM ${proposals(db)} WHERE id=$1`, [proposalId]);
  return rows[0] ? mapProposal(rows[0]) : null;
}

/** Atomic pending->status claim; returns true only if THIS call won (prevents double-apply). */
export async function claimProposal(
  db: Db,
  proposalId: string,
  status: Extract<ProposalStatus, "applied" | "discarded" | "failed">,
): Promise<boolean> {
  const r = await db.execute(
    `UPDATE ${proposals(db)} SET status=$2, updated_at=now() WHERE id=$1 AND status='pending'`,
    [proposalId, status],
  );
  return r.rowCount === 1;
}

export async function setProposalResult(
  db: Db,
  proposalId: string,
  status: ProposalStatus,
  appliedResult: unknown,
): Promise<void> {
  await db.execute(
    `UPDATE ${proposals(db)} SET status=$2, applied_result=$3::jsonb, updated_at=now() WHERE id=$1`,
    [proposalId, status, JSON.stringify(appliedResult ?? null)],
  );
}

// --- rooms: company-wide multi-agent channels (roadmap / standup / brainstorm) ----

function mapRoomMessage(row: RoomMessage): RoomMessage {
  let attachments = parseJson((row as { attachments?: unknown }).attachments, [] as Attachment[]);
  return {
    ...row,
    seq: Number(row.seq),
    attachments: Array.isArray(attachments) ? attachments : [],
    messageType: (row as { messageType?: string }).messageType ?? "text",
    metadata: parseJson((row as { metadata?: unknown }).metadata, {} as Record<string, unknown>),
  };
}

/** Create the room if missing (idempotent on slug), returning it. */
export async function ensureRoom(
  db: Db,
  r: { companyId: string; slug: string; displayName: string; kind: RoomKind; createdByUserId?: string | null },
): Promise<ChatRoom> {
  const found = await db.query<ChatRoom>(
    `SELECT ${ROOM_COLS} FROM ${rooms(db)} WHERE company_id=$1 AND slug=$2`,
    [r.companyId, r.slug],
  );
  if (found[0]) return found[0];
  await db.execute(
    `INSERT INTO ${rooms(db)} (id, company_id, slug, display_name, kind, created_by_user_id)
     VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (company_id, slug) DO NOTHING`,
    [randomUUID(), r.companyId, r.slug, r.displayName, r.kind, r.createdByUserId ?? null],
  );
  const rows = await db.query<ChatRoom>(
    `SELECT ${ROOM_COLS} FROM ${rooms(db)} WHERE company_id=$1 AND slug=$2`,
    [r.companyId, r.slug],
  );
  return rows[0];
}

export async function getRoomBySlug(db: Db, companyId: string, slug: string): Promise<ChatRoom | null> {
  const rows = await db.query<ChatRoom>(
    `SELECT ${ROOM_COLS} FROM ${rooms(db)} WHERE company_id=$1 AND slug=$2`,
    [companyId, slug],
  );
  return rows[0] ?? null;
}

export async function getRoomById(db: Db, roomId: string): Promise<ChatRoom | null> {
  const rows = await db.query<ChatRoom>(`SELECT ${ROOM_COLS} FROM ${rooms(db)} WHERE id=$1`, [roomId]);
  return rows[0] ?? null;
}

export async function listRooms(db: Db, companyId: string, userId: string): Promise<ChatRoom[]> {
  // Exclude rooms this user has closed (per-user hide via chat_room_hidden), plus any
  // company-wide hidden rooms. Single-table outer FROM keeps ROOM_COLS unqualified safe.
  return db.query<ChatRoom>(
    `SELECT ${ROOM_COLS} FROM ${rooms(db)} r
     WHERE r.company_id=$1 AND NOT r.hidden
       AND r.id NOT IN (SELECT room_id FROM ${roomHidden(db)} WHERE user_id=$2)
     ORDER BY r.created_at ASC`,
    [companyId, userId],
  );
}

/** Close (hide) or reopen a room for a single user, without touching the shared room. */
export async function setRoomHidden(db: Db, roomId: string, userId: string, hidden: boolean): Promise<void> {
  if (hidden) {
    await db.execute(
      `INSERT INTO ${roomHidden(db)} (room_id, user_id) VALUES ($1,$2) ON CONFLICT (room_id, user_id) DO NOTHING`,
      [roomId, userId],
    );
  } else {
    await db.execute(`DELETE FROM ${roomHidden(db)} WHERE room_id=$1 AND user_id=$2`, [roomId, userId]);
  }
}

export async function addRoomMember(db: Db, roomId: string, agentId: string): Promise<void> {
  await db.execute(
    `INSERT INTO ${roomMembers(db)} (room_id, agent_id) VALUES ($1,$2) ON CONFLICT (room_id, agent_id) DO NOTHING`,
    [roomId, agentId],
  );
}

export async function getRoomMemberIds(db: Db, roomId: string): Promise<string[]> {
  const rows = await db.query<{ agentId: string }>(
    `SELECT agent_id AS "agentId" FROM ${roomMembers(db)} WHERE room_id=$1 ORDER BY added_at ASC`,
    [roomId],
  );
  return rows.map((r) => r.agentId);
}

async function nextRoomSeq(db: Db, roomId: string): Promise<number> {
  const r = await db.query<{ n: number }>(
    `SELECT COALESCE(MAX(seq),0)+1 AS n FROM ${roomMessages(db)} WHERE room_id=$1`,
    [roomId],
  );
  return Number(r[0].n);
}

export async function insertRoomHumanMessage(
  db: Db,
  roomId: string,
  userId: string,
  body: string,
  clientMessageId: string,
  attachments: Attachment[] = [],
): Promise<RoomMessage> {
  const existing = await db.query<RoomMessage>(
    `SELECT ${ROOM_MSG_COLS} FROM ${roomMessages(db)} WHERE room_id=$1 AND client_message_id=$2`,
    [roomId, clientMessageId],
  );
  if (existing[0]) return mapRoomMessage(existing[0]);
  const seq = await nextRoomSeq(db, roomId);
  await db.execute(
    `INSERT INTO ${roomMessages(db)} (id, room_id, seq, author_kind, author_user_id, body, status, client_message_id, attachments)
     VALUES ($1,$2,$3,'human',$4,$5,'complete',$6,$7::jsonb)`,
    [randomUUID(), roomId, seq, userId, body, clientMessageId, JSON.stringify(attachments ?? [])],
  );
  const rows = await db.query<RoomMessage>(
    `SELECT ${ROOM_MSG_COLS} FROM ${roomMessages(db)} WHERE room_id=$1 AND client_message_id=$2`,
    [roomId, clientMessageId],
  );
  return mapRoomMessage(rows[0]);
}

export async function insertRoomSystemMessage(
  db: Db,
  roomId: string,
  body: string,
  metadata: Record<string, unknown> = {},
): Promise<RoomMessage> {
  const seq = await nextRoomSeq(db, roomId);
  const id = randomUUID();
  await db.execute(
    `INSERT INTO ${roomMessages(db)} (id, room_id, seq, author_kind, body, status, message_type, metadata)
     VALUES ($1,$2,$3,'system',$4,'done','system',$5::jsonb)`,
    [id, roomId, seq, body, JSON.stringify(metadata ?? {})],
  );
  const rows = await db.query<RoomMessage>(`SELECT ${ROOM_MSG_COLS} FROM ${roomMessages(db)} WHERE id=$1`, [id]);
  return mapRoomMessage(rows[0]);
}

export async function insertRoomAgentPlaceholder(
  db: Db,
  roomId: string,
  agentId: string,
  runId: string,
): Promise<RoomMessage> {
  const existing = await db.query<RoomMessage>(
    `SELECT ${ROOM_MSG_COLS} FROM ${roomMessages(db)} WHERE room_id=$1 AND run_id=$2`,
    [roomId, runId],
  );
  if (existing[0]) return mapRoomMessage(existing[0]);
  const seq = await nextRoomSeq(db, roomId);
  await db.execute(
    `INSERT INTO ${roomMessages(db)} (id, room_id, seq, author_kind, author_agent_id, body, status, run_id)
     VALUES ($1,$2,$3,'agent',$4,'','streaming',$5)`,
    [randomUUID(), roomId, seq, agentId, runId],
  );
  const rows = await db.query<RoomMessage>(
    `SELECT ${ROOM_MSG_COLS} FROM ${roomMessages(db)} WHERE room_id=$1 AND run_id=$2`,
    [roomId, runId],
  );
  return mapRoomMessage(rows[0]);
}

export async function finalizeRoomMessage(
  db: Db,
  messageId: string,
  status: Extract<MessageStatus, "done" | "error" | "timeout">,
  finalBody?: string,
): Promise<void> {
  if (finalBody != null) {
    await db.execute(
      `UPDATE ${roomMessages(db)} SET body=$2, status=$3, updated_at=now() WHERE id=$1`,
      [messageId, finalBody, status],
    );
  } else {
    await db.execute(`UPDATE ${roomMessages(db)} SET status=$2, updated_at=now() WHERE id=$1`, [messageId, status]);
  }
}

export async function listRoomMessages(db: Db, roomId: string): Promise<RoomMessage[]> {
  const rows = await db.query<RoomMessage>(
    `SELECT ${ROOM_MSG_COLS} FROM ${roomMessages(db)} WHERE room_id=$1 ORDER BY seq ASC`,
    [roomId],
  );
  return rows.map(mapRoomMessage);
}

/**
 * Read a heartbeat run's status + result directly (manifest whitelists
 * `heartbeat_runs` as a core read table). Used to reconcile a chat reply when the
 * live session-event stream didn't deliver a terminal event (e.g. codex process loss).
 */
export async function getRun(
  db: Db,
  runId: string,
): Promise<{ status: string; resultJson: unknown } | null> {
  const r = await db.query<{ status: string; resultJson: unknown }>(
    `SELECT status, result_json AS "resultJson" FROM public.heartbeat_runs WHERE id=$1`,
    [runId],
  );
  return r[0] ?? null;
}

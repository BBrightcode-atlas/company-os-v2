import { randomUUID } from "node:crypto";
import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import type { Attachment, ChatMessage, GoalProposalPayload, IssueProposalPayload, RoadmapProposalPayload, RoomMessage } from "./constants.js";
import { extractRunReply, isTerminalRunStatus, streamChannel } from "./constants.js";
import {
  acquireLock,
  addRoomMember,
  claimProposal,
  ensureRoom,
  ensureThread,
  finalizeAgentMessage,
  finalizeRoomMessage,
  getProposal,
  getRoomBySlug,
  getRoomMemberIds,
  getRun,
  getThread,
  insertAgentPlaceholder,
  insertHumanMessage,
  insertRoomAgentPlaceholder,
  insertRoomHumanMessage,
  insertRoomSystemMessage,
  insertSystemMessage,
  listMessages,
  listRoomMessages,
  listRoomProposals,
  listRooms,
  listThreadAgentIds,
  listThreadProposals,
  releaseLock,
  setProposalResult,
  setRoomHidden,
  setThreadHidden,
} from "./db.js";
import { chatComplete, loadInstructions, roomDirective } from "./llm.js";
import { CHAT_TOOLS, makeToolExecutor } from "./tools.js";
import { buildSnapshot, type SnapshotCtx } from "./snapshot.js";

interface AgentRec { id: string; name: string; role: string | null; adapterConfig?: Record<string, unknown> }

/** Which member agents are @mentioned in the text (matches @ExactName, case-insensitive). */
function parseMentions(text: string, agents: AgentRec[]): string[] {
  const ids: string[] = [];
  for (const a of agents) {
    if (!a.name) continue;
    const re = new RegExp("@" + a.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (re.test(text)) ids.push(a.id);
  }
  return [...new Set(ids)];
}

/** Adapt room history to the per-agent Anthropic view: own turns = assistant, others = user (attributed). */
function roomHistoryForAgent(history: RoomMessage[], nameById: Map<string, string>, currentAgentId: string): ChatMessage[] {
  return history
    .filter((m) => !(m.authorKind === "agent" && m.status === "streaming"))
    .map((m) => {
      const isSelf = m.authorKind === "agent" && m.authorAgentId === currentAgentId;
      const speaker =
        m.authorKind === "agent" ? nameById.get(m.authorAgentId ?? "") ?? "에이전트" : m.authorKind === "system" ? "진행자" : "사용자";
      const role: "human" | "agent" = isSelf ? "agent" : "human";
      const body = isSelf ? m.body : `[${speaker}] ${m.body}`;
      return { role, body, status: m.status, attachments: m.attachments } as unknown as ChatMessage;
    });
}

function slugify(name: string): string {
  const s = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return s || `room-${randomUUID().slice(0, 8)}`;
}

const plugin = definePlugin({
  async setup(ctx) {
    // --- DATA: agent picker (all company agents, for "new message") ---------
    ctx.data.register("listAgents", async (params) => {
      const companyId = String((params as { companyId?: unknown }).companyId ?? "");
      const agents = await ctx.agents.list({ companyId });
      return {
        agents: agents.map((a) => ({
          id: a.id,
          name: a.name,
          role: a.role,
          status: a.status,
        })),
      };
    });

    // --- DATA: existing DM threads (Slack-style DM list) --------------------
    ctx.data.register("listThreads", async (params) => {
      const companyId = String((params as { companyId?: unknown }).companyId ?? "");
      const userId = String((params as { userId?: unknown }).userId ?? "");
      const agentIds = await listThreadAgentIds(ctx.db, companyId, userId);
      if (agentIds.length === 0) return { threads: [] };
      const agents = await ctx.agents.list({ companyId });
      const byId = new Map(agents.map((a) => [a.id, a]));
      // preserve recency order from listThreadAgentIds
      const threads = agentIds
        .map((id) => byId.get(id))
        .filter((a): a is NonNullable<typeof a> => Boolean(a))
        .map((a) => ({ id: a.id, name: a.name, role: a.role, status: a.status }));
      return { threads };
    });

    // --- DATA: thread history (does not create a thread on open) ------------
    ctx.data.register("listMessages", async (params) => {
      const { companyId, userId, agentId } = params as Record<string, string>;
      const thread = await getThread(ctx.db, String(companyId), String(userId), String(agentId));
      if (!thread) return { threadId: null, status: "idle", messages: [] };
      // Opening a closed (hidden) DM reopens it — "resume" from past history. The sidebar
      // lists only non-hidden threads, so un-hiding here makes it reappear there too.
      if (thread.hidden) await setThreadHidden(ctx.db, thread.id, false);
      let messages = await listMessages(ctx.db, thread.id);

      // Reconcile any agent message stuck on `streaming`. Direct-LLM replies finalize
      // themselves, but if the worker died mid-reply the row would hang — so finalize stale
      // rows. (Legacy agent-run replies, prefixed runIds aside, read the run outcome.)
      const STALE_MS = 120_000;
      const stuck = messages.filter((m) => m.role === "agent" && m.status === "streaming");
      let reconciled = false;
      for (const m of stuck) {
        try {
          if (m.runId && !m.runId.startsWith("direct-")) {
            const run = await getRun(ctx.db, m.runId);
            if (run && isTerminalRunStatus(run.status)) {
              if (run.status === "succeeded") {
                await finalizeAgentMessage(ctx.db, m.id, "done", extractRunReply(run.resultJson) || "(빈 응답)");
              } else {
                await finalizeAgentMessage(ctx.db, m.id, "error", `실행 실패 (${run.status})`);
              }
              await releaseLock(ctx.db, thread.id);
              reconciled = true;
              continue;
            }
          }
          // time-based fallback: the reply never finalized (worker crash / missing run)
          if (Date.now() - new Date(m.createdAt).getTime() > STALE_MS) {
            await finalizeAgentMessage(ctx.db, m.id, "timeout", "응답 시간 초과");
            await releaseLock(ctx.db, thread.id);
            reconciled = true;
          }
        } catch {
          // best-effort; leave the message as-is if it can't be reconciled
        }
      }
      if (reconciled) messages = await listMessages(ctx.db, thread.id);

      const proposals = await listThreadProposals(ctx.db, thread.id);
      const fresh = await getThread(ctx.db, String(companyId), String(userId), String(agentId));
      return { threadId: thread.id, status: fresh?.status ?? "idle", messages, proposals };
    });

    // --- ACTION: close a DM thread (hide it; keep messages for resume) -------
    ctx.actions.register("closeThread", async (params) => {
      const { companyId, userId, agentId } = params as Record<string, string>;
      const thread = await getThread(ctx.db, String(companyId), String(userId), String(agentId));
      if (thread) await setThreadHidden(ctx.db, thread.id, true);
      return { ok: true };
    });

    // --- ACTION: apply a proposal (human-confirmed) — the ONLY place writes happen.
    // Runs in a fresh, live RPC scope (a normal action), so ctx.issues/goals.create work.
    ctx.actions.register("applyProposal", async (params, context) => {
      const proposalId = String((params as { proposalId?: unknown }).proposalId ?? "");
      // default: start the work (status 'todo' auto-starts the assignee). start:false => backlog.
      const start = (params as { start?: unknown }).start !== false;
      const p = await getProposal(ctx.db, proposalId);
      if (!p) return { ok: false, reason: "제안을 찾을 수 없습니다" };
      if (p.status !== "pending") return { ok: false, reason: `이미 처리됨 (${p.status})` };
      // atomically claim so a double-click can't create twice
      if (!(await claimProposal(ctx.db, proposalId, "applied"))) {
        return { ok: false, reason: "이미 처리 중입니다" };
      }
      const actorUserId = (context as { actor?: { userId?: string | null } } | undefined)?.actor?.userId ?? p.userId;
      const actor = { actorUserId };
      const postSystem = async (body: string) => {
        if (p.roomId) await insertRoomSystemMessage(ctx.db, p.roomId, body);
        else if (p.threadId) await insertSystemMessage(ctx.db, p.threadId, body);
      };
      const logActivity = (message: string, entityId?: string) =>
        ctx.activity
          .log({ companyId: p.companyId, message, ...(entityId ? { entityType: "issue", entityId } : {}) })
          .catch(() => {});
      const issueStatus = start ? "todo" : "backlog";
      try {
        if (p.kind === "issue") {
          const pl = p.payload as IssueProposalPayload;
          const issue = await ctx.issues.create({
            companyId: p.companyId,
            title: pl.title,
            description: pl.description,
            projectId: pl.projectId ?? undefined,
            assigneeAgentId: pl.assigneeAgentId ?? undefined,
            priority: pl.priority,
            status: issueStatus,
            actor,
          });
          await setProposalResult(ctx.db, proposalId, "applied", { id: issue.id, identifier: issue.identifier, status: issue.status });
          await logActivity(`Agent chat created issue ${issue.identifier ?? issue.id}`, issue.id);
          await postSystem(
            `✅ 이슈 생성됨: ${issue.identifier ?? ""} "${pl.title}"` +
              `${pl.assigneeName ? ` → ${pl.assigneeName}` : ""}` +
              `${issueStatus === "todo" ? " (시작됨)" : " (백로그)"}`,
          );
          return { ok: true, identifier: issue.identifier ?? null };
        }
        if (p.kind === "goal") {
          const pl = p.payload as GoalProposalPayload;
          const goal = await ctx.goals.create({
            companyId: p.companyId,
            title: pl.title,
            description: pl.description,
            level: pl.level,
            ownerAgentId: pl.ownerAgentId ?? undefined,
          });
          await setProposalResult(ctx.db, proposalId, "applied", { id: goal.id });
          await postSystem(`✅ 목표 생성됨: "${pl.title}"`);
          return { ok: true };
        }
        if (p.kind === "roadmap") {
          const pl = p.payload as RoadmapProposalPayload;
          const goal = await ctx.goals.create({
            companyId: p.companyId,
            title: pl.goalTitle,
            description: pl.goalDescription,
            level: pl.goalLevel,
          });
          const created: { id: string; identifier: string | null }[] = [];
          for (const ri of pl.issues) {
            const issue = await ctx.issues.create({
              companyId: p.companyId,
              goalId: goal.id,
              title: ri.title,
              description: ri.description,
              assigneeAgentId: ri.assigneeAgentId ?? undefined,
              priority: ri.priority,
              status: issueStatus,
              actor,
            });
            created.push({ id: issue.id, identifier: issue.identifier ?? null });
            await logActivity(`Agent chat created roadmap issue ${issue.identifier ?? issue.id}`, issue.id);
          }
          // dependency edges: blockedByIndexes reference issues by array index
          for (let i = 0; i < pl.issues.length; i++) {
            const deps = pl.issues[i].blockedByIndexes ?? [];
            const blockerIds = deps.map((j) => created[j]?.id).filter((x): x is string => Boolean(x));
            if (blockerIds.length) {
              await ctx.issues.relations.setBlockedBy(created[i].id, blockerIds, p.companyId, actor).catch(() => {});
            }
          }
          await setProposalResult(ctx.db, proposalId, "applied", { goalId: goal.id, issues: created });
          const idents = created.map((c) => c.identifier).filter(Boolean).join(", ");
          await postSystem(
            `✅ 로드맵 생성됨: 목표 "${pl.goalTitle}" + 이슈 ${created.length}개` +
              `${idents ? ` (${idents})` : ""}${issueStatus === "todo" ? " — 시작됨" : " — 백로그"}`,
          );
          return { ok: true, goalId: goal.id, count: created.length };
        }
        await setProposalResult(ctx.db, proposalId, "failed", { error: "unknown kind" });
        return { ok: false, reason: "지원하지 않는 제안 종류" };
      } catch (e) {
        await setProposalResult(ctx.db, proposalId, "failed", { error: e instanceof Error ? e.message : "error" });
        return { ok: false, reason: e instanceof Error ? e.message : "생성 실패" };
      }
    });

    // --- ACTION: discard a proposal ----------------------------------------
    ctx.actions.register("discardProposal", async (params) => {
      const proposalId = String((params as { proposalId?: unknown }).proposalId ?? "");
      await claimProposal(ctx.db, proposalId, "discarded");
      return { ok: true };
    });

    // --- ACTION: send a message + stream the agent reply ---------------------
    ctx.actions.register("sendMessage", async (params) => {
      const { companyId, userId, agentId, text } = params as Record<string, string>;
      const clientMessageId = String((params as { clientMessageId?: unknown }).clientMessageId ?? "");
      const rawAtts = (params as { attachments?: unknown }).attachments;
      const attachments = (Array.isArray(rawAtts) ? rawAtts : []) as Attachment[];
      const cid = String(companyId), uid = String(userId), aid = String(agentId);
      const thread = await ensureThread(ctx.db, cid, uid, aid);

      // one in-flight reply per thread
      const locked = await acquireLock(ctx.db, thread.id);
      if (!locked) return { ok: false, reason: "이전 응답이 진행 중입니다 (busy)" };

      let placeholderId: string | null = null;
      try {
        await insertHumanMessage(ctx.db, thread.id, String(text), clientMessageId, attachments);

        // Direct LLM "fast lane": wake-free reply. Waking a full agent run costs ~80s of cold
        // start (process spawn + MCP + hooks + workspace) for a ~6s LLM call, so we call the
        // model directly with the agent's own instructions (AGENTS.md) as the system prompt.
        const agent = await ctx.agents.get(aid, cid).catch(() => null);
        const instructions = await loadInstructions(agent);
        const history = await listMessages(ctx.db, thread.id); // includes the new human turn
        // Capture the grounding snapshot NOW (while the RPC scope is alive). ctx.* calls fail
        // inside the fire-and-forget below; the tool executor reads ONLY this frozen snapshot.
        const snapshot = await buildSnapshot(ctx as unknown as SnapshotCtx, cid, aid, String(text));

        const runId = `direct-${randomUUID()}`;
        const placeholder = await insertAgentPlaceholder(ctx.db, thread.id, runId);
        placeholderId = placeholder.id;
        const channel = streamChannel(thread.id, runId);

        // fire-and-forget so the action returns fast (the UI shows the human turn + a "typing"
        // state immediately and the reply lands via the DB poll). performAction has a ~30s RPC
        // timeout, and the LLM call can occasionally exceed it.
        void (async () => {
          try {
            const reply = await chatComplete({
              agent,
              instructions,
              history,
              tools: CHAT_TOOLS,
              executeTool: makeToolExecutor({
                snapshot,
                db: ctx.db,
                threadId: thread.id,
                messageId: placeholderId!,
                companyId: cid,
                userId: uid,
              }),
            });
            await finalizeAgentMessage(ctx.db, placeholderId!, "done", reply);
          } catch (e) {
            await finalizeAgentMessage(
              ctx.db,
              placeholderId!,
              "error",
              e instanceof Error ? e.message : "reply failed",
            );
          } finally {
            await releaseLock(ctx.db, thread.id);
            ctx.streams.emit?.(channel, { type: "done", runId });
          }
        })().catch(() => {});

        return { ok: true, threadId: thread.id, runId, channel };
      } catch (err) {
        if (placeholderId) await finalizeAgentMessage(ctx.db, placeholderId, "error", "reply failed");
        await releaseLock(ctx.db, thread.id);
        return { ok: false, reason: err instanceof Error ? err.message : "send failed" };
      }
    });

    // ======================================================================
    // ROOMS — company-wide multi-agent channels (roadmap / standup / brainstorm)
    // ======================================================================
    ctx.data.register("listRooms", async (params) => {
      const companyId = String((params as { companyId?: unknown }).companyId ?? "");
      const userId = String((params as { userId?: unknown }).userId ?? "");
      const rs = await listRooms(ctx.db, companyId, userId);
      return { rooms: rs.map((r) => ({ slug: r.slug, displayName: r.displayName, kind: r.kind })) };
    });

    // --- ACTION: close a room for this user (hide it; keep messages for resume) ----
    ctx.actions.register("closeRoom", async (params) => {
      const companyId = String((params as { companyId?: unknown }).companyId ?? "");
      const userId = String((params as { userId?: unknown }).userId ?? "");
      const roomSlug = String((params as { roomSlug?: unknown }).roomSlug ?? "");
      const room = await getRoomBySlug(ctx.db, companyId, roomSlug);
      if (room && userId) await setRoomHidden(ctx.db, room.id, userId, true);
      return { ok: true };
    });

    ctx.data.register("listRoomMessages", async (params) => {
      const companyId = String((params as { companyId?: unknown }).companyId ?? "");
      const userId = String((params as { userId?: unknown }).userId ?? "");
      const roomSlug = String((params as { roomSlug?: unknown }).roomSlug ?? "");
      const room = await getRoomBySlug(ctx.db, companyId, roomSlug);
      if (!room) return { roomId: null, messages: [], members: [] };
      // Opening a closed room reopens it for this user — "resume" from past history,
      // mirroring DM listMessages. The sidebar lists only non-hidden rooms.
      if (userId) await setRoomHidden(ctx.db, room.id, userId, false);
      let messages = await listRoomMessages(ctx.db, room.id);
      const STALE_MS = 120_000;
      let reconciled = false;
      for (const m of messages.filter((x) => x.authorKind === "agent" && x.status === "streaming")) {
        if (Date.now() - new Date(m.createdAt).getTime() > STALE_MS) {
          await finalizeRoomMessage(ctx.db, m.id, "timeout", "응답 시간 초과");
          reconciled = true;
        }
      }
      if (reconciled) messages = await listRoomMessages(ctx.db, room.id);
      const memberIds = await getRoomMemberIds(ctx.db, room.id);
      const agents = await ctx.agents.list({ companyId }).catch(() => []);
      const byId = new Map(agents.map((a) => [a.id, a]));
      const members = memberIds
        .map((id) => byId.get(id))
        .filter((a): a is NonNullable<typeof a> => Boolean(a))
        .map((a) => ({ id: a.id, name: a.name, role: a.role, status: a.status }));
      const out = messages.map((m) => ({
        id: m.id,
        seq: m.seq,
        authorKind: m.authorKind,
        status: m.status,
        body: m.body,
        messageType: m.messageType,
        attachments: m.attachments,
        authorName:
          m.authorKind === "agent"
            ? byId.get(m.authorAgentId ?? "")?.name ?? "에이전트"
            : m.authorKind === "system"
              ? "진행자"
              : "나",
      }));
      const proposals = await listRoomProposals(ctx.db, room.id);
      return { roomId: room.id, displayName: room.displayName, kind: room.kind, members, messages: out, proposals };
    });

    ctx.actions.register("createRoom", async (params) => {
      const companyId = String((params as { companyId?: unknown }).companyId ?? "");
      const userId = String((params as { userId?: unknown }).userId ?? "");
      const displayName = (String((params as { displayName?: unknown }).displayName ?? "").trim()) || "새 룸";
      const kindRaw = String((params as { kind?: unknown }).kind ?? "group");
      const kind = kindRaw === "standup" || kindRaw === "brainstorm" ? kindRaw : "group";
      const rawSlug = (params as { slug?: unknown }).slug;
      const slug = typeof rawSlug === "string" && rawSlug.trim() ? rawSlug.trim() : slugify(displayName);
      const memberAgentIds = (params as { memberAgentIds?: unknown }).memberAgentIds;
      const room = await ensureRoom(ctx.db, { companyId, slug, displayName, kind, createdByUserId: userId });
      for (const aid of Array.isArray(memberAgentIds) ? memberAgentIds : []) {
        if (aid) await addRoomMember(ctx.db, room.id, String(aid));
      }
      return { ok: true, slug: room.slug };
    });

    ctx.actions.register("addRoomMember", async (params) => {
      const companyId = String((params as { companyId?: unknown }).companyId ?? "");
      const roomSlug = String((params as { roomSlug?: unknown }).roomSlug ?? "");
      const agentId = String((params as { agentId?: unknown }).agentId ?? "");
      const room = await getRoomBySlug(ctx.db, companyId, roomSlug);
      if (!room || !agentId) return { ok: false };
      await addRoomMember(ctx.db, room.id, agentId);
      return { ok: true };
    });

    ctx.actions.register("sendRoomMessage", async (params) => {
      const companyId = String((params as { companyId?: unknown }).companyId ?? "");
      const userId = String((params as { userId?: unknown }).userId ?? "");
      const roomSlug = String((params as { roomSlug?: unknown }).roomSlug ?? "");
      const text = String((params as { text?: unknown }).text ?? "");
      const clientMessageId = String((params as { clientMessageId?: unknown }).clientMessageId ?? "");
      const room = await getRoomBySlug(ctx.db, companyId, roomSlug);
      if (!room) return { ok: false, reason: "룸을 찾을 수 없음" };
      await insertRoomHumanMessage(ctx.db, room.id, userId, text, clientMessageId);

      const memberIds = await getRoomMemberIds(ctx.db, room.id);
      const allAgents = (await ctx.agents.list({ companyId }).catch(() => [])) as AgentRec[];
      const byId = new Map(allAgents.map((a) => [a.id, a]));
      const nameById = new Map(allAgents.map((a) => [a.id, a.name]));
      const mentioned = parseMentions(text, allAgents).filter((id) => memberIds.includes(id));
      const targetIds = mentioned.length ? mentioned : memberIds;
      if (targetIds.length === 0) return { ok: true, roomId: room.id, note: "멤버 에이전트가 없습니다" };

      // ONE shared grounding snapshot for the whole turn (captured while the scope is live)
      const snapshot = await buildSnapshot(ctx as unknown as SnapshotCtx, companyId, "", text);
      const memberNames = memberIds.map((id) => nameById.get(id) ?? "에이전트");
      const targets: { agent: AgentRec; instructions: string }[] = [];
      for (const id of targetIds) {
        const agent = byId.get(id);
        if (agent) targets.push({ agent, instructions: await loadInstructions(agent) });
      }

      const replyFor = async (agent: AgentRec, instructions: string) => {
        const runId = `direct-${randomUUID()}`;
        const placeholder = await insertRoomAgentPlaceholder(ctx.db, room.id, agent.id, runId);
        try {
          const history = roomHistoryForAgent(await listRoomMessages(ctx.db, room.id), nameById, agent.id);
          const reply = await chatComplete({
            agent,
            instructions,
            history,
            tools: CHAT_TOOLS,
            directive: roomDirective(room.displayName, memberNames, agent.name),
            executeTool: makeToolExecutor({ snapshot, db: ctx.db, threadId: null, roomId: room.id, messageId: placeholder.id, companyId, userId }),
          });
          await finalizeRoomMessage(ctx.db, placeholder.id, "done", reply);
        } catch (e) {
          await finalizeRoomMessage(ctx.db, placeholder.id, "error", e instanceof Error ? e.message : "reply failed").catch(() => {});
        }
      };

      if (mentioned.length) {
        // targeted: mentioned agents reply in parallel
        void Promise.all(targets.map((t) => replyFor(t.agent, t.instructions))).catch(() => {});
      } else {
        // round-robin: sequential so each agent sees peers' replies (fresh history per turn)
        void (async () => {
          for (const t of targets) await replyFor(t.agent, t.instructions);
        })().catch(() => {});
      }
      return { ok: true, roomId: room.id, responders: targets.length };
    });
  },

  async onHealth() {
    return { status: "ok", message: "agent-chat worker running" };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);

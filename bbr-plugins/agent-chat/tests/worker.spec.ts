import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTestHarness } from "@paperclipai/plugin-sdk/testing";
import manifest from "../src/manifest.js";
import plugin from "../src/worker.js";
import { ensureThread, getProposal, insertProposal, listMessages } from "../src/db.js";
import { createMemDb } from "./helpers/pgmem.js";

afterEach(() => vi.unstubAllGlobals());

function makeHarness() {
  const harness = createTestHarness({ manifest, capabilities: [...manifest.capabilities] });
  // real SQL backend instead of the no-op stub
  (harness.ctx as { db: unknown }).db = createMemDb();
  return harness;
}

describe("worker: data handlers", () => {
  it("listAgents returns seeded company agents", async () => {
    const companyId = randomUUID();
    const agentId = randomUUID();
    const harness = makeHarness();
    harness.seed({ agents: [{ id: agentId, companyId, name: "CTO", role: "cto", status: "idle" } as never] });
    await plugin.definition.setup(harness.ctx);
    const res = await harness.getData<{ agents: { id: string }[] }>("listAgents", { companyId });
    expect(res.agents.map((a) => a.id)).toContain(agentId);
  });

  it("listMessages returns no thread until one exists", async () => {
    const companyId = randomUUID(), userId = randomUUID(), agentId = randomUUID();
    const harness = makeHarness();
    await plugin.definition.setup(harness.ctx);
    const res = await harness.getData<{ messages: unknown[]; threadId: string | null }>("listMessages", {
      companyId, userId, agentId,
    });
    expect(res.messages).toEqual([]);
    expect(res.threadId).toBeNull();
  });
});

describe("worker: sendMessage (direct LLM)", () => {
  function mockAgentAndLLM(harness: ReturnType<typeof makeHarness>, reply: string) {
    (harness.ctx.agents as { get: unknown }).get = vi.fn(async (id: string) => ({
      id,
      name: "QA",
      role: "qa",
      adapterConfig: {},
    }));
    const emit = vi.fn();
    (harness.ctx as { streams: unknown }).streams = { open: vi.fn(), emit, close: vi.fn() };
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      async json() {
        return { content: [{ type: "text", text: reply }] };
      },
      async text() {
        return reply;
      },
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
    return { emit, fetchMock };
  }

  async function waitForReply(
    harness: ReturnType<typeof makeHarness>,
    params: Record<string, string>,
  ) {
    for (let i = 0; i < 50; i++) {
      const data = await harness.getData<{ messages: { role: string; status: string }[] }>("listMessages", params);
      const agentMsg = data.messages.find((m) => m.role === "agent");
      if (agentMsg && agentMsg.status !== "streaming") return data;
      await new Promise((r) => setTimeout(r, 5));
    }
    throw new Error("agent reply did not finalize");
  }

  it("happy path: human msg + direct LLM reply finalized in DB", async () => {
    const companyId = randomUUID(), userId = randomUUID(), agentId = randomUUID();
    const harness = makeHarness();
    const { fetchMock } = mockAgentAndLLM(harness, "안녕하세요");
    await plugin.definition.setup(harness.ctx);

    const res = await harness.performAction<{ ok: boolean }>("sendMessage", {
      companyId, userId, agentId, text: "hi", clientMessageId: randomUUID(),
    });
    expect(res.ok).toBe(true);

    const data = await waitForReply(harness, { companyId, userId, agentId });
    const msgs = data.messages as { role: string; body: string; status: string }[];
    expect(msgs.map((m) => m.role)).toEqual(["human", "agent"]);
    expect(msgs[1].body).toBe("안녕하세요");
    expect(msgs[1].status).toBe("done");
    expect(fetchMock).toHaveBeenCalled();
  });

  it("rejects a concurrent send on the same thread (busy lock)", async () => {
    const companyId = randomUUID(), userId = randomUUID(), agentId = randomUUID();
    const harness = makeHarness();
    // never-resolving LLM so the first send holds the lock
    (harness.ctx.agents as { get: unknown }).get = vi.fn(async (id: string) => ({ id, name: "QA", role: "qa", adapterConfig: {} }));
    (harness.ctx as { streams: unknown }).streams = { open: vi.fn(), emit: vi.fn(), close: vi.fn() };
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})) as unknown as typeof fetch);
    await plugin.definition.setup(harness.ctx);

    const first = await harness.performAction<{ ok: boolean }>("sendMessage", {
      companyId, userId, agentId, text: "first", clientMessageId: randomUUID(),
    });
    expect(first.ok).toBe(true);

    const second = await harness.performAction<{ ok: boolean; reason?: string }>("sendMessage", {
      companyId, userId, agentId, text: "second", clientMessageId: randomUUID(),
    });
    expect(second.ok).toBe(false);
    expect(second.reason).toMatch(/busy|진행/);
  });

  it("human resend with the same clientMessageId is idempotent", async () => {
    const companyId = randomUUID(), userId = randomUUID(), agentId = randomUUID();
    const harness = makeHarness();
    mockAgentAndLLM(harness, "ok");
    await plugin.definition.setup(harness.ctx);
    const cid = randomUUID();

    await harness.performAction("sendMessage", { companyId, userId, agentId, text: "hi", clientMessageId: cid });
    await waitForReply(harness, { companyId, userId, agentId });
    await harness.performAction("sendMessage", { companyId, userId, agentId, text: "hi", clientMessageId: cid });

    const data = await harness.getData<{ messages: { role: string }[] }>("listMessages", {
      companyId, userId, agentId,
    });
    expect(data.messages.filter((m) => m.role === "human").length).toBe(1);
  });

  it("sends an image attachment to the LLM as a vision block and stores it", async () => {
    const companyId = randomUUID(), userId = randomUUID(), agentId = randomUUID();
    const harness = makeHarness();
    const { fetchMock } = mockAgentAndLLM(harness, "이미지 확인했습니다");
    await plugin.definition.setup(harness.ctx);
    const att = { name: "s.png", mime: "image/png", size: 4, dataUrl: "data:image/png;base64,Zm9v" };

    await harness.performAction("sendMessage", {
      companyId, userId, agentId, text: "이거 봐", attachments: [att], clientMessageId: randomUUID(),
    });
    const data = await waitForReply(harness, { companyId, userId, agentId });

    const human = (data.messages as { role: string; attachments?: { name: string }[] }[]).find((m) => m.role === "human");
    expect(human?.attachments?.[0]?.name).toBe("s.png");
    // the LLM request carried the image as an Anthropic vision block (base64 "Zm9v")
    const bodies = (fetchMock.mock.calls as unknown[][]).map((c) => String((c[1] as { body?: unknown })?.body ?? ""));
    expect(bodies.some((b) => b.includes('"type":"image"') && b.includes("Zm9v"))).toBe(true);
  });

  it("falls back to a text-only retry when the backend can't process the image", async () => {
    const companyId = randomUUID(), userId = randomUUID(), agentId = randomUUID();
    const harness = makeHarness();
    (harness.ctx.agents as { get: unknown }).get = vi.fn(async () => ({ id: agentId, name: "QA", role: "qa", adapterConfig: {} }));
    (harness.ctx as { streams: unknown }).streams = { open: vi.fn(), emit: vi.fn(), close: vi.fn() };
    let calls = 0;
    const seen: string[] = [];
    const fetchMock = vi.fn(async (_url: string, init: { body?: string }) => {
      calls++;
      seen.push(String(init?.body ?? ""));
      if (calls === 1) {
        return { ok: false, status: 400, async text() { return '{"error":{"message":"Could not process image"}}'; }, async json() { return {}; } };
      }
      return { ok: true, status: 200, async json() { return { content: [{ type: "text", text: "텍스트로 답합니다" }] }; }, async text() { return ""; } };
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
    await plugin.definition.setup(harness.ctx);

    const att = { name: "x.png", mime: "image/png", size: 4, dataUrl: "data:image/png;base64,Zm9v" };
    await harness.performAction("sendMessage", {
      companyId, userId, agentId, text: "색?", attachments: [att], clientMessageId: randomUUID(),
    });
    const data = await waitForReply(harness, { companyId, userId, agentId });

    const agentMsg = (data.messages as unknown as { role: string; body: string }[]).find((m) => m.role === "agent");
    expect(agentMsg?.body).toBe("텍스트로 답합니다");
    expect(calls).toBe(2);
    expect(seen[0].includes('"type":"image"')).toBe(true); // first attempt carried the image
    expect(seen[1].includes('"type":"image"')).toBe(false); // retry stripped it
  });

  it("close hides the DM from the list; reopening (listMessages) restores it with history", async () => {
    const companyId = randomUUID(), userId = randomUUID(), agentId = randomUUID();
    const harness = makeHarness();
    harness.seed({ agents: [{ id: agentId, companyId, name: "CTO", role: "cto", status: "idle" } as never] });
    mockAgentAndLLM(harness, "ok");
    await plugin.definition.setup(harness.ctx);

    // one exchange creates the thread
    await harness.performAction("sendMessage", { companyId, userId, agentId, text: "hi", clientMessageId: randomUUID() });
    await waitForReply(harness, { companyId, userId, agentId });

    // visible in the DM list
    let list = await harness.getData<{ threads: { id: string }[] }>("listThreads", { companyId, userId });
    expect(list.threads.map((t) => t.id)).toContain(agentId);

    // close → hidden from the list, messages kept
    const closed = await harness.performAction<{ ok: boolean }>("closeThread", { companyId, userId, agentId });
    expect(closed.ok).toBe(true);
    list = await harness.getData<{ threads: { id: string }[] }>("listThreads", { companyId, userId });
    expect(list.threads.map((t) => t.id)).not.toContain(agentId);

    // reopen via listMessages → past history intact + thread un-hidden (resume)
    const reopened = await harness.getData<{ messages: { role: string }[] }>("listMessages", { companyId, userId, agentId });
    expect(reopened.messages.map((m) => m.role)).toEqual(["human", "agent"]);
    list = await harness.getData<{ threads: { id: string }[] }>("listThreads", { companyId, userId });
    expect(list.threads.map((t) => t.id)).toContain(agentId);
  });
});

describe("worker: applyProposal (conversation → backlog)", () => {
  function stubWrites(harness: ReturnType<typeof makeHarness>, created: { id: string; identifier: string; status: string }) {
    const createIssue = vi.fn(async () => created);
    (harness.ctx as { issues: unknown }).issues = { create: createIssue };
    (harness.ctx as { goals: unknown }).goals = { create: vi.fn() };
    (harness.ctx as { activity: unknown }).activity = { log: vi.fn(async () => {}) };
    return { createIssue };
  }

  it("creates a host issue (status todo = auto-start), marks applied, posts a system message", async () => {
    const companyId = randomUUID(), userId = randomUUID(), agentId = randomUUID();
    const harness = makeHarness();
    const created = { id: randomUUID(), identifier: "FLO-42", status: "todo" };
    const { createIssue } = stubWrites(harness, created);
    await plugin.definition.setup(harness.ctx);

    const db = (harness.ctx as { db: ReturnType<typeof createMemDb> }).db;
    const t = await ensureThread(db, companyId, userId, agentId);
    const prop = await insertProposal(db, {
      threadId: t.id, messageId: null, companyId, userId, kind: "issue", title: "Add 2FA",
      payload: { title: "Add 2FA", assigneeAgentId: agentId, assigneeName: "QA", priority: "high" },
    });

    const res = await harness.performAction<{ ok: boolean; identifier?: string }>("applyProposal", { proposalId: prop.id, start: true });
    expect(res.ok).toBe(true);
    expect(res.identifier).toBe("FLO-42");
    const arg = (createIssue.mock.calls[0] as unknown[])[0] as { title: string; assigneeAgentId: string; status: string };
    expect(arg.title).toBe("Add 2FA");
    expect(arg.assigneeAgentId).toBe(agentId);
    expect(arg.status).toBe("todo");

    expect((await getProposal(db, prop.id))?.status).toBe("applied");
    const msgs = await listMessages(db, t.id);
    expect(msgs.some((m) => m.messageType === "system" && m.body.includes("FLO-42"))).toBe(true);
  });

  it("start:false creates a backlog issue (no auto-start)", async () => {
    const companyId = randomUUID(), userId = randomUUID(), agentId = randomUUID();
    const harness = makeHarness();
    const { createIssue } = stubWrites(harness, { id: randomUUID(), identifier: "FLO-43", status: "backlog" });
    await plugin.definition.setup(harness.ctx);
    const db = (harness.ctx as { db: ReturnType<typeof createMemDb> }).db;
    const t = await ensureThread(db, companyId, userId, agentId);
    const prop = await insertProposal(db, {
      threadId: t.id, messageId: null, companyId, userId, kind: "issue", title: "Doc cleanup",
      payload: { title: "Doc cleanup" },
    });
    await harness.performAction("applyProposal", { proposalId: prop.id, start: false });
    const arg = (createIssue.mock.calls[0] as unknown[])[0] as { status: string };
    expect(arg.status).toBe("backlog");
  });

  it("double-apply is idempotent (claim guard)", async () => {
    const companyId = randomUUID(), userId = randomUUID(), agentId = randomUUID();
    const harness = makeHarness();
    const { createIssue } = stubWrites(harness, { id: randomUUID(), identifier: "FLO-44", status: "todo" });
    await plugin.definition.setup(harness.ctx);
    const db = (harness.ctx as { db: ReturnType<typeof createMemDb> }).db;
    const t = await ensureThread(db, companyId, userId, agentId);
    const prop = await insertProposal(db, {
      threadId: t.id, messageId: null, companyId, userId, kind: "issue", title: "Once",
      payload: { title: "Once" },
    });
    const [r1, r2] = await Promise.all([
      harness.performAction<{ ok: boolean }>("applyProposal", { proposalId: prop.id, start: true }),
      harness.performAction<{ ok: boolean }>("applyProposal", { proposalId: prop.id, start: true }),
    ]);
    expect([r1.ok, r2.ok].filter(Boolean)).toHaveLength(1); // exactly one won
    expect(createIssue).toHaveBeenCalledTimes(1);
  });

  it("roadmap: creates a goal + N issues, wires blockedBy deps, marks applied", async () => {
    const companyId = randomUUID(), userId = randomUUID(), agentId = randomUUID();
    const harness = makeHarness();
    // distinct issue ids per create so the dependency assertion is meaningful
    let n = 0;
    const createdIds = [randomUUID(), randomUUID()];
    const createIssue = vi.fn(async () => ({ id: createdIds[n], identifier: `FLO-5${++n}`, status: "backlog" }));
    const createGoal = vi.fn(async () => ({ id: "goal-1" }));
    const setBlockedBy = vi.fn(async () => {});
    (harness.ctx as { issues: unknown }).issues = { create: createIssue, relations: { setBlockedBy } };
    (harness.ctx as { goals: unknown }).goals = { create: createGoal };
    (harness.ctx as { activity: unknown }).activity = { log: vi.fn(async () => {}) };
    await plugin.definition.setup(harness.ctx);

    const db = (harness.ctx as { db: ReturnType<typeof createMemDb> }).db;
    const t = await ensureThread(db, companyId, userId, agentId);
    const prop = await insertProposal(db, {
      threadId: t.id, messageId: null, companyId, userId, kind: "roadmap", title: "Ship v1",
      payload: {
        goalTitle: "Ship v1",
        goalLevel: "company",
        issues: [
          { title: "Backend", assigneeAgentId: agentId, assigneeName: "CTO", priority: "high" },
          { title: "QA gate", blockedByIndexes: [0] },
        ],
      },
    });

    const res = await harness.performAction<{ ok: boolean; goalId?: string; count?: number }>(
      "applyProposal",
      { proposalId: prop.id, start: false },
    );
    expect(res.ok).toBe(true);
    expect(res.count).toBe(2);
    expect(res.goalId).toBe("goal-1");

    // goal created once with the goal title/level
    expect(createGoal).toHaveBeenCalledTimes(1);
    const goalArg = (createGoal.mock.calls[0] as unknown[])[0] as { title: string; level?: string };
    expect(goalArg.title).toBe("Ship v1");
    expect(goalArg.level).toBe("company");

    // two issues created, both attached to the goal, backlog (start:false)
    expect(createIssue).toHaveBeenCalledTimes(2);
    const i0 = (createIssue.mock.calls[0] as unknown[])[0] as { goalId: string; status: string; assigneeAgentId?: string };
    expect(i0.goalId).toBe("goal-1");
    expect(i0.status).toBe("backlog");
    expect(i0.assigneeAgentId).toBe(agentId);

    // dependency edge: issue[1] blockedBy issue[0]
    expect(setBlockedBy).toHaveBeenCalledTimes(1);
    const [depTarget, depBlockers] = setBlockedBy.mock.calls[0] as unknown[];
    expect(depTarget).toBe(createdIds[1]);
    expect(depBlockers).toEqual([createdIds[0]]);

    expect((await getProposal(db, prop.id))?.status).toBe("applied");
    const msgs = await listMessages(db, t.id);
    expect(msgs.some((m) => m.messageType === "system" && m.body.includes("로드맵"))).toBe(true);
  });
});

describe("worker: rooms (multi-agent turn-taking)", () => {
  function mockRoom(harness: ReturnType<typeof makeHarness>) {
    (harness.ctx as { streams: unknown }).streams = { open: vi.fn(), emit: vi.fn(), close: vi.fn() };
    let n = 0;
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      async json() {
        return { content: [{ type: "text", text: `의견 ${++n}` }] };
      },
      async text() {
        return "";
      },
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
    return fetchMock;
  }

  async function waitRoom(
    harness: ReturnType<typeof makeHarness>,
    params: Record<string, string>,
    minDone: number,
  ) {
    for (let i = 0; i < 80; i++) {
      const data = await harness.getData<{ messages: { authorKind: string; status: string; authorName: string; body: string }[] }>("listRoomMessages", params);
      const done = data.messages.filter((m) => m.authorKind === "agent" && m.status !== "streaming");
      if (done.length >= minDone) return data;
      await new Promise((r) => setTimeout(r, 5));
    }
    throw new Error("room replies did not finalize");
  }

  it("round-robin: every member replies once, attributed by name", async () => {
    const companyId = randomUUID(), userId = randomUUID();
    const a1 = randomUUID(), a2 = randomUUID();
    const harness = makeHarness();
    harness.seed({ agents: [
      { id: a1, companyId, name: "CTO", role: "cto", status: "idle" } as never,
      { id: a2, companyId, name: "QA", role: "qa", status: "idle" } as never,
    ] });
    mockRoom(harness);
    await plugin.definition.setup(harness.ctx);

    const cr = await harness.performAction<{ ok: boolean; slug: string }>("createRoom", {
      companyId, userId, displayName: "로드맵", memberAgentIds: [a1, a2],
    });
    expect(cr.ok).toBe(true);
    await harness.performAction("sendRoomMessage", { companyId, userId, roomSlug: cr.slug, text: "로드맵 짜자", clientMessageId: randomUUID() });

    const data = await waitRoom(harness, { companyId, roomSlug: cr.slug }, 2);
    const agentMsgs = data.messages.filter((m) => m.authorKind === "agent");
    expect(agentMsgs.length).toBe(2);
    expect(agentMsgs.every((m) => m.status === "done")).toBe(true);
    const names = new Set(agentMsgs.map((m) => m.authorName));
    expect(names.has("CTO")).toBe(true);
    expect(names.has("QA")).toBe(true);
  });

  it("@mention targets only the mentioned member", async () => {
    const companyId = randomUUID(), userId = randomUUID();
    const a1 = randomUUID(), a2 = randomUUID();
    const harness = makeHarness();
    harness.seed({ agents: [
      { id: a1, companyId, name: "CTO", role: "cto", status: "idle" } as never,
      { id: a2, companyId, name: "QA", role: "qa", status: "idle" } as never,
    ] });
    mockRoom(harness);
    await plugin.definition.setup(harness.ctx);
    const cr = await harness.performAction<{ ok: boolean; slug: string }>("createRoom", {
      companyId, userId, displayName: "회의", memberAgentIds: [a1, a2],
    });
    await harness.performAction("sendRoomMessage", { companyId, userId, roomSlug: cr.slug, text: "@QA 릴리스 상태 알려줘", clientMessageId: randomUUID() });

    const data = await waitRoom(harness, { companyId, roomSlug: cr.slug }, 1);
    const agentMsgs = data.messages.filter((m) => m.authorKind === "agent");
    expect(agentMsgs.length).toBe(1);
    expect(agentMsgs[0].authorName).toBe("QA");
  });

  it("close hides a room from this user's list; another user still sees it; reopening restores it", async () => {
    const companyId = randomUUID(), userId = randomUUID(), other = randomUUID();
    const a1 = randomUUID();
    const harness = makeHarness();
    harness.seed({ agents: [{ id: a1, companyId, name: "CTO", role: "cto", status: "idle" } as never] });
    await plugin.definition.setup(harness.ctx);

    const cr = await harness.performAction<{ ok: boolean; slug: string }>("createRoom", {
      companyId, userId, displayName: "로드맵", memberAgentIds: [a1],
    });
    expect(cr.ok).toBe(true);

    // visible in the room list
    let mine = await harness.getData<{ rooms: { slug: string }[] }>("listRooms", { companyId, userId });
    expect(mine.rooms.map((r) => r.slug)).toContain(cr.slug);

    // close → hidden from THIS user's list only
    const closed = await harness.performAction<{ ok: boolean }>("closeRoom", { companyId, userId, roomSlug: cr.slug });
    expect(closed.ok).toBe(true);
    mine = await harness.getData<{ rooms: { slug: string }[] }>("listRooms", { companyId, userId });
    expect(mine.rooms.map((r) => r.slug)).not.toContain(cr.slug);
    const theirs = await harness.getData<{ rooms: { slug: string }[] }>("listRooms", { companyId, userId: other });
    expect(theirs.rooms.map((r) => r.slug)).toContain(cr.slug); // per-user hide

    // reopen via listRoomMessages → un-hidden for this user (resume)
    await harness.getData("listRoomMessages", { companyId, userId, roomSlug: cr.slug });
    mine = await harness.getData<{ rooms: { slug: string }[] }>("listRooms", { companyId, userId });
    expect(mine.rooms.map((r) => r.slug)).toContain(cr.slug);
  });
});

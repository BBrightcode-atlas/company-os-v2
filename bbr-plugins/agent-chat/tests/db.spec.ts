import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  acquireLock,
  appendAgentChunk,
  ensureThread,
  finalizeAgentMessage,
  insertAgentPlaceholder,
  insertHumanMessage,
  listMessages,
  releaseLock,
} from "../src/db.js";
import { createMemDb } from "./helpers/pgmem.js";

describe("db helpers (pg-mem)", () => {
  it("ensureThread is idempotent per (company,user,agent)", async () => {
    const db = createMemDb();
    const c = randomUUID(), u = randomUUID(), a = randomUUID();
    const t1 = await ensureThread(db, c, u, a);
    const t2 = await ensureThread(db, c, u, a);
    expect(t2.id).toBe(t1.id);
    expect(t1.status).toBe("idle");
    expect(t1.taskKey).toContain(":dm:");
  });

  it("acquireLock blocks a second acquire until released", async () => {
    const db = createMemDb();
    const t = await ensureThread(db, randomUUID(), randomUUID(), randomUUID());
    expect(await acquireLock(db, t.id)).toBe(true);
    expect(await acquireLock(db, t.id)).toBe(false);
    await releaseLock(db, t.id);
    expect(await acquireLock(db, t.id)).toBe(true);
  });

  it("insertHumanMessage dedupes on clientMessageId", async () => {
    const db = createMemDb();
    const t = await ensureThread(db, randomUUID(), randomUUID(), randomUUID());
    const cid = randomUUID();
    const m1 = await insertHumanMessage(db, t.id, "hi", cid);
    const m2 = await insertHumanMessage(db, t.id, "hi", cid);
    expect(m2.id).toBe(m1.id);
    expect(m1.role).toBe("human");
    expect(m1.seq).toBe(1);
  });

  it("placeholder -> chunk append -> finalize done", async () => {
    const db = createMemDb();
    const t = await ensureThread(db, randomUUID(), randomUUID(), randomUUID());
    const runId = randomUUID();
    const ph = await insertAgentPlaceholder(db, t.id, runId);
    expect(ph.status).toBe("streaming");
    await appendAgentChunk(db, ph.id, "he");
    await appendAgentChunk(db, ph.id, "llo");
    await finalizeAgentMessage(db, ph.id, "done");
    const msgs = await listMessages(db, t.id);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].body).toBe("hello");
    expect(msgs[0].status).toBe("done");
  });

  it("placeholder is idempotent per runId", async () => {
    const db = createMemDb();
    const t = await ensureThread(db, randomUUID(), randomUUID(), randomUUID());
    const runId = randomUUID();
    const a = await insertAgentPlaceholder(db, t.id, runId);
    const b = await insertAgentPlaceholder(db, t.id, runId);
    expect(b.id).toBe(a.id);
    expect(await listMessages(db, t.id)).toHaveLength(1);
  });

  it("messages return ordered by seq", async () => {
    const db = createMemDb();
    const t = await ensureThread(db, randomUUID(), randomUUID(), randomUUID());
    await insertHumanMessage(db, t.id, "first", randomUUID());
    await insertAgentPlaceholder(db, t.id, randomUUID());
    const msgs = await listMessages(db, t.id);
    expect(msgs.map((m) => m.role)).toEqual(["human", "agent"]);
    expect(msgs.map((m) => m.seq)).toEqual([1, 2]);
  });

  it("round-trips message attachments (jsonb); defaults to empty", async () => {
    const db = createMemDb();
    const t = await ensureThread(db, randomUUID(), randomUUID(), randomUUID());
    const atts = [{ name: "shot.png", mime: "image/png", size: 12, dataUrl: "data:image/png;base64,AAAA" }];
    await insertHumanMessage(db, t.id, "see this", randomUUID(), atts);
    await insertAgentPlaceholder(db, t.id, randomUUID());
    const msgs = await listMessages(db, t.id);
    expect(msgs[0].attachments).toEqual(atts);
    expect(msgs[1].attachments).toEqual([]); // placeholder has none
  });
});

# Agent DM Chat 플러그인 — 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 외부 격리 Paperclip 플러그인 `paperclip-plugin-agent-chat`을 만들어 사람↔에이전트 1:1 DM 채팅(라이브 스트리밍, plugin-DB 영속, CHAT 사이드바)을 추가한다.

**Architecture:** worker(`definePlugin`)가 `ctx.db`(plugin namespace)에 채팅을 저장하고 `ctx.agents.sessions`로 에이전트 run을 깨워 응답을 `ctx.streams`로 UI에 중계한다. UI는 `routeSidebar`(CHAT+에이전트 DM 리스트) + `page`(Flat 스레드). 스레드당 busy lock으로 직렬화, DB가 진실원천.

**Tech Stack:** TypeScript, `@paperclipai/plugin-sdk`, esbuild, vitest, React, plugin namespace SQL(migrations).

**Spec:** `docs/superpowers/specs/2026-06-04-agent-chat-plugin-design.md`

---

## 개발 환경 / 전제

- 플러그인은 **레포 밖** 외부 패키지로 만든다: `~/dev/paperclip-plugins/agent-chat`.
- `paperclipai` CLI는 PATH에 없음 → scaffolder를 node로 직접 호출:
  `node /Users/bright/Projects/company-os-v2/packages/plugins/create-paperclip-plugin/dist/index.js`
- SDK 스냅샷: scaffold 시 `--sdk-path /Users/bright/Projects/company-os-v2/packages/plugins/sdk`.
- 단위 테스트: `@paperclipai/plugin-sdk/testing`의 `createTestHarness({ manifest })`.
  - API: `harness.seed({agents,issues,...})`, `harness.getData(key, params)`, `harness.performAction(key, params, opts)`, `harness.simulateSessionEvent(sessionId, event)`, `harness.ctx`, `harness.dbQueries`, `harness.dbExecutes`.
- 설치 대상 인스턴스: 로컬 dev 또는 mac-studio prod(`paperclipai plugin install <abs-path>`; prod는 §Task 9).

> **구현 전 1회:** 아래 코드의 정확한 시그니처를 실제 SDK 소스로 확정한다.
> - `packages/plugins/sdk/src/types.ts:1472`(`ctx.agents.list`), `:1534-1555`(`ctx.agents.sessions.*`), `:1510`(`AgentSessionEvent`), `~470-540`(`ctx.db` query/execute), `:1784`(`ctx.streams`).
> - `packages/plugins/sdk/src/testing.ts:93-128`(TestHarness), `:2387`(simulateSessionEvent).
> - manifest 타입: `PaperclipPluginManifestV1`(`@paperclipai/plugin-sdk`).

---

## File Structure

```
~/dev/paperclip-plugins/agent-chat/
  package.json                 # paperclipPlugin block → dist/{manifest,worker}.js, dist/ui
  src/
    manifest.ts                # capabilities + slots(routeSidebar,page) + database decl
    constants.ts               # PLUGIN_KEY, channel/taskKey helpers, types
    db.ts                      # SQL helper fns over ctx.db (threads/messages CRUD)
    worker.ts                  # definePlugin: data+action handlers, session/stream logic
    ui/
      index.tsx                # slot exports: ChatSidebar, ChatPage
      ChatSidebar.tsx          # routeSidebar: CHAT heading + agent DM list
      ChatPage.tsx             # page: Flat thread + input + stream subscribe
      linkify.tsx              # issuePrefix-NN → host issue route
  migrations/
    0001_init.sql              # chat_threads, chat_messages + constraints
  tests/
    manifest.spec.ts
    db.spec.ts
    worker-send.spec.ts        # core: lock, idempotency, stream relay, finalize, timeout
    worker-data.spec.ts        # listAgents, listMessages
```

각 파일 단일 책임: `db.ts`=SQL만, `worker.ts`=오케스트레이션, UI 컴포넌트 분리.

---

## Task 0: 외부 패키지 scaffold + 빌드 확인

**Files:** Create: `~/dev/paperclip-plugins/agent-chat/` (전체)

- [ ] **Step 1: scaffold**

```bash
mkdir -p ~/dev/paperclip-plugins
node /Users/bright/Projects/company-os-v2/packages/plugins/create-paperclip-plugin/dist/index.js @flotter/agent-chat \
  --output ~/dev/paperclip-plugins \
  --template default \
  --category automation \
  --display-name "Agent Chat" \
  --description "1:1 DM chat with company agents" \
  --sdk-path /Users/bright/Projects/company-os-v2/packages/plugins/sdk
```

Expected: `~/dev/paperclip-plugins/agent-chat/` 생성(src/manifest.ts, src/worker.ts, src/ui/index.tsx, tests/, esbuild.config.mjs, package.json).

- [ ] **Step 2: install + baseline build**

```bash
cd ~/dev/paperclip-plugins/agent-chat
pnpm install
pnpm build
```

Expected: `dist/manifest.js`, `dist/worker.js`, `dist/ui/` 생성, 에러 없음.

- [ ] **Step 3: baseline test 통과 확인**

Run: `pnpm test`
Expected: scaffold placeholder 테스트 PASS.

- [ ] **Step 4: Commit (플러그인 레포 자체 git init)**

```bash
cd ~/dev/paperclip-plugins/agent-chat && git init -q && git add -A && git commit -q -m "chore: scaffold agent-chat plugin"
```

---

## Task 1: constants + 타입

**Files:** Create: `src/constants.ts`

- [ ] **Step 1: 작성**

```ts
export const PLUGIN_KEY = "flotter.agent-chat";

export type ThreadStatus = "idle" | "streaming";
export type MessageRole = "human" | "agent";
export type MessageStatus = "complete" | "streaming" | "done" | "error" | "timeout";

export function taskKey(companyId: string, userId: string, agentId: string): string {
  return `plugin:${PLUGIN_KEY}:dm:${companyId}:${userId}:${agentId}`;
}

export function streamChannel(threadId: string, runId: string): string {
  return `chat:${threadId}:${runId}`;
}

/** 마지막 청크 이후 이 시간(ms) 무이벤트면 timeout 처리 */
export const STREAM_IDLE_TIMEOUT_MS = 90_000;

export interface ChatThread {
  id: string; companyId: string; userId: string; agentId: string;
  taskKey: string; sessionId: string | null; status: ThreadStatus;
  lastRunId: string | null; createdAt: string; updatedAt: string;
}
export interface ChatMessage {
  id: string; threadId: string; seq: number; role: MessageRole;
  body: string; status: MessageStatus; clientMessageId: string | null;
  runId: string | null; createdAt: string; updatedAt: string;
}
export interface StreamEvent {
  type: "chunk" | "done" | "error" | "timeout";
  text?: string; message?: string; runId: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/constants.ts && git commit -q -m "feat: plugin constants + types"
```

---

## Task 2: DB migration (chat_threads, chat_messages)

**Files:** Create: `migrations/0001_init.sql`; Modify: `src/manifest.ts`(database decl — Task 4에서 통합)

> namespace 내부 객체만 생성. 모든 테이블/인덱스는 `ctx.db.namespace` 스키마에 만들어진다(호스트가 search_path 주입). 평문 테이블명 사용.

- [ ] **Step 1: 작성**

```sql
-- 0001_init.sql
CREATE TABLE chat_threads (
  id            uuid PRIMARY KEY,
  company_id    text NOT NULL,
  user_id       text NOT NULL,
  agent_id      text NOT NULL,
  task_key      text NOT NULL,
  session_id    text,
  status        text NOT NULL DEFAULT 'idle',
  last_run_id   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_threads_uq UNIQUE (company_id, user_id, agent_id)
);

CREATE TABLE chat_messages (
  id                 uuid PRIMARY KEY,
  thread_id          uuid NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  seq                bigint NOT NULL,
  role               text NOT NULL,
  body               text NOT NULL DEFAULT '',
  status             text NOT NULL,
  client_message_id  text,
  run_id             text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_messages_seq_uq UNIQUE (thread_id, seq)
);

CREATE UNIQUE INDEX chat_messages_client_uq
  ON chat_messages (thread_id, client_message_id)
  WHERE client_message_id IS NOT NULL;

CREATE UNIQUE INDEX chat_messages_run_uq
  ON chat_messages (thread_id, run_id)
  WHERE run_id IS NOT NULL;

CREATE INDEX chat_messages_thread_seq ON chat_messages (thread_id, seq);
```

- [ ] **Step 2: Commit**

```bash
git add migrations/0001_init.sql && git commit -q -m "feat: chat schema migration"
```

---

## Task 3: db.ts — SQL 헬퍼 (TDD)

**Files:** Create: `src/db.ts`; Test: `tests/db.spec.ts`

> `ctx.db.query(sql, params)` = SELECT, `ctx.db.execute(sql, params)` = INSERT/UPDATE/DELETE (정확 시그니처 types.ts ~470-540로 확정). 헬퍼는 `db` 객체를 받아 동작하도록 작성해 테스트 용이하게 한다.
>
> **컬럼 매핑(필수):** raw SQL은 snake_case 컬럼을 반환하지만 TS 인터페이스(`ChatThread`/`ChatMessage`)는 camelCase다. 모든 SELECT에서 alias로 맞춘다. 재사용 상수로 DRY:
> ```ts
> const THREAD_COLS = `id, company_id AS "companyId", user_id AS "userId", agent_id AS "agentId",
>   task_key AS "taskKey", session_id AS "sessionId", status, last_run_id AS "lastRunId",
>   created_at AS "createdAt", updated_at AS "updatedAt"`;
> const MSG_COLS = `id, thread_id AS "threadId", seq, role, body, status,
>   client_message_id AS "clientMessageId", run_id AS "runId",
>   created_at AS "createdAt", updated_at AS "updatedAt"`;
> ```
> 아래 db.ts의 `SELECT *`를 전부 `SELECT ${THREAD_COLS}` / `SELECT ${MSG_COLS}`로 치환한다. `seq`는 `Number(row.seq)`로 캐스팅(bigint→number).

- [ ] **Step 1: 실패 테스트 작성**

```ts
// tests/db.spec.ts
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createTestHarness } from "@paperclipai/plugin-sdk/testing";
import manifest from "../src/manifest.js";
import { ensureThread, insertHumanMessage, acquireLock, releaseLock } from "../src/db.js";

describe("db helpers", () => {
  it("ensureThread is idempotent per (company,user,agent)", async () => {
    const h = createTestHarness({ manifest });
    const c = randomUUID(), u = randomUUID(), a = randomUUID();
    const t1 = await ensureThread(h.ctx.db, c, u, a);
    const t2 = await ensureThread(h.ctx.db, c, u, a);
    expect(t2.id).toBe(t1.id);
  });

  it("acquireLock returns false when already streaming", async () => {
    const h = createTestHarness({ manifest });
    const c = randomUUID(), u = randomUUID(), a = randomUUID();
    const t = await ensureThread(h.ctx.db, c, u, a);
    expect(await acquireLock(h.ctx.db, t.id)).toBe(true);
    expect(await acquireLock(h.ctx.db, t.id)).toBe(false);
    await releaseLock(h.ctx.db, t.id);
    expect(await acquireLock(h.ctx.db, t.id)).toBe(true);
  });

  it("insertHumanMessage dedupes on clientMessageId", async () => {
    const h = createTestHarness({ manifest });
    const c = randomUUID(), u = randomUUID(), a = randomUUID();
    const t = await ensureThread(h.ctx.db, c, u, a);
    const cid = randomUUID();
    const m1 = await insertHumanMessage(h.ctx.db, t.id, "hi", cid);
    const m2 = await insertHumanMessage(h.ctx.db, t.id, "hi", cid);
    expect(m2.id).toBe(m1.id);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm test tests/db.spec.ts`
Expected: FAIL (`ensureThread` 등 미정의).

- [ ] **Step 3: db.ts 구현**

```ts
// src/db.ts  (PluginDb 타입은 ctx.db 실제 타입으로 확정)
import { randomUUID } from "node:crypto";
import type { ChatThread, ChatMessage } from "./constants.js";
import { taskKey } from "./constants.js";

type Db = { query<T=any>(sql: string, params?: unknown[]): Promise<T[]>;
            execute(sql: string, params?: unknown[]): Promise<{ rowCount: number }>; };

export async function ensureThread(db: Db, companyId: string, userId: string, agentId: string): Promise<ChatThread> {
  const found = await db.query<ChatThread>(
    `SELECT * FROM chat_threads WHERE company_id=$1 AND user_id=$2 AND agent_id=$3`, [companyId, userId, agentId]);
  if (found[0]) return found[0];
  const id = randomUUID();
  await db.execute(
    `INSERT INTO chat_threads (id, company_id, user_id, agent_id, task_key, status)
     VALUES ($1,$2,$3,$4,$5,'idle')
     ON CONFLICT (company_id, user_id, agent_id) DO NOTHING`,
    [id, companyId, userId, agentId, taskKey(companyId, userId, agentId)]);
  const rows = await db.query<ChatThread>(
    `SELECT * FROM chat_threads WHERE company_id=$1 AND user_id=$2 AND agent_id=$3`, [companyId, userId, agentId]);
  return rows[0];
}

/** idle→streaming 원자적 전이. 성공 true. */
export async function acquireLock(db: Db, threadId: string): Promise<boolean> {
  const r = await db.execute(
    `UPDATE chat_threads SET status='streaming', updated_at=now() WHERE id=$1 AND status='idle'`, [threadId]);
  return r.rowCount === 1;
}
export async function releaseLock(db: Db, threadId: string): Promise<void> {
  await db.execute(`UPDATE chat_threads SET status='idle', updated_at=now() WHERE id=$1`, [threadId]);
}

async function nextSeq(db: Db, threadId: string): Promise<number> {
  const r = await db.query<{ n: string }>(`SELECT COALESCE(MAX(seq),0)+1 AS n FROM chat_messages WHERE thread_id=$1`, [threadId]);
  return Number(r[0].n);
}

export async function insertHumanMessage(db: Db, threadId: string, body: string, clientMessageId: string): Promise<ChatMessage> {
  const existing = await db.query<ChatMessage>(
    `SELECT * FROM chat_messages WHERE thread_id=$1 AND client_message_id=$2`, [threadId, clientMessageId]);
  if (existing[0]) return existing[0];
  const id = randomUUID(); const seq = await nextSeq(db, threadId);
  await db.execute(
    `INSERT INTO chat_messages (id, thread_id, seq, role, body, status, client_message_id)
     VALUES ($1,$2,$3,'human',$4,'complete',$5)
     ON CONFLICT (thread_id, client_message_id) DO NOTHING`, [id, threadId, seq, body, clientMessageId]);
  const rows = await db.query<ChatMessage>(`SELECT * FROM chat_messages WHERE thread_id=$1 AND client_message_id=$2`, [threadId, clientMessageId]);
  return rows[0];
}

export async function insertAgentPlaceholder(db: Db, threadId: string, runId: string): Promise<ChatMessage> {
  const id = randomUUID(); const seq = await nextSeq(db, threadId);
  await db.execute(
    `INSERT INTO chat_messages (id, thread_id, seq, role, body, status, run_id)
     VALUES ($1,$2,$3,'agent','','streaming',$4)
     ON CONFLICT (thread_id, run_id) DO NOTHING`, [id, threadId, seq, runId]);
  const rows = await db.query<ChatMessage>(`SELECT * FROM chat_messages WHERE thread_id=$1 AND run_id=$2`, [threadId, runId]);
  return rows[0];
}

export async function appendAgentChunk(db: Db, messageId: string, text: string): Promise<void> {
  await db.execute(`UPDATE chat_messages SET body = body || $2, updated_at=now() WHERE id=$1`, [messageId, text]);
}
export async function finalizeAgentMessage(db: Db, messageId: string, status: "done"|"error"|"timeout", finalBody?: string): Promise<void> {
  if (finalBody != null) await db.execute(`UPDATE chat_messages SET body=$2, status=$3, updated_at=now() WHERE id=$1`, [messageId, finalBody, status]);
  else await db.execute(`UPDATE chat_messages SET status=$2, updated_at=now() WHERE id=$1`, [messageId, status]);
}
export async function listMessages(db: Db, threadId: string): Promise<ChatMessage[]> {
  return db.query<ChatMessage>(`SELECT * FROM chat_messages WHERE thread_id=$1 ORDER BY seq ASC`, [threadId]);
}
export async function setThreadSession(db: Db, threadId: string, sessionId: string, runId: string): Promise<void> {
  await db.execute(`UPDATE chat_threads SET session_id=$2, last_run_id=$3, updated_at=now() WHERE id=$1`, [threadId, sessionId, runId]);
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm test tests/db.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/db.ts tests/db.spec.ts && git commit -q -m "feat: db helpers (threads/messages, lock, idempotency)"
```

---

## Task 4: manifest.ts (capabilities + slots + database)

**Files:** Modify: `src/manifest.ts`; Test: `tests/manifest.spec.ts`

> 정확한 capability 문자열은 `packages/shared/src/constants.ts`로 확정(특히 routeSidebar). 슬롯 `routeSidebar`+`page`.

- [ ] **Step 1: 실패 테스트**

```ts
// tests/manifest.spec.ts
import { describe, expect, it } from "vitest";
import { pluginManifestV1Schema } from "@paperclipai/shared";
import manifest from "../src/manifest.js";

it("manifest validates + declares chat surfaces", () => {
  const m = pluginManifestV1Schema.parse(manifest);
  expect(m.database).toMatchObject({ migrationsDir: "migrations" });
  expect(m.capabilities).toEqual(expect.arrayContaining([
    "agents.read","agent.sessions.create","agent.sessions.send","agent.sessions.close",
    "database.namespace.migrate","database.namespace.read","database.namespace.write",
  ]));
  const slotTypes = (m.ui?.slots ?? []).map((s:any)=>s.type);
  expect(slotTypes).toEqual(expect.arrayContaining(["routeSidebar","page"]));
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm test tests/manifest.spec.ts` → FAIL.

- [ ] **Step 3: manifest 작성**

```ts
// src/manifest.ts
import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const manifest: PaperclipPluginManifestV1 = {
  id: "flotter.agent-chat",
  apiVersion: 1,
  version: "0.1.0",
  displayName: "Agent Chat",
  description: "1:1 DM chat with company agents (live streaming, plugin-DB history).",
  author: "Flotter",
  categories: ["automation"],
  capabilities: [
    "agents.read",
    "agent.sessions.create",
    "agent.sessions.list",
    "agent.sessions.send",
    "agent.sessions.close",
    "database.namespace.migrate",
    "database.namespace.read",
    "database.namespace.write",
    "ui.sidebar.register",
    "ui.page.register",
  ],
  database: { migrationsDir: "migrations" },
  entrypoints: { worker: "./dist/worker.js", ui: "./dist/ui" },
  ui: {
    slots: [
      { type: "routeSidebar", id: "chat-sidebar", routePath: "chat", exportName: "ChatSidebar", displayName: "Chat" },
      { type: "page", id: "chat-page", routePath: "chat", exportName: "ChatPage", displayName: "Chat" },
    ],
  },
};
export default manifest;
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm test tests/manifest.spec.ts` → PASS. (slot 필드명/capability 키가 schema와 다르면 schema 에러 메시지대로 수정.)

- [ ] **Step 5: Commit**

```bash
git add src/manifest.ts tests/manifest.spec.ts && git commit -q -m "feat: manifest (capabilities, slots, database)"
```

---

## Task 5: worker — data handlers (TDD)

**Files:** Modify: `src/worker.ts`; Test: `tests/worker-data.spec.ts`

- [ ] **Step 1: 실패 테스트**

```ts
// tests/worker-data.spec.ts
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createTestHarness } from "@paperclipai/plugin-sdk/testing";
import manifest from "../src/manifest.js";
import plugin from "../src/worker.js";

it("listAgents returns seeded company agents", async () => {
  const companyId = randomUUID(); const agentId = randomUUID();
  const h = createTestHarness({ manifest, plugin });
  h.seed({ agents: [{ id: agentId, companyId, name: "CTO", role: "cto" } as any] });
  const res = await h.getData<{ agents: any[] }>("listAgents", { companyId });
  expect(res.agents.map(a=>a.id)).toContain(agentId);
});

it("listMessages returns empty for new thread", async () => {
  const companyId = randomUUID(); const agentId = randomUUID(); const userId = randomUUID();
  const h = createTestHarness({ manifest, plugin });
  const res = await h.getData<{ messages: any[]; threadId: string }>("listMessages", { companyId, userId, agentId });
  expect(res.messages).toEqual([]);
  expect(res.threadId).toBeTruthy();
});
```

> `createTestHarness` 인자에 `plugin`을 넘기는지(`{manifest, plugin}`) 또는 `plugin.setup(h.ctx)` 수동 호출인지 testing.ts:443로 확정. 예제 orchestration-smoke는 worker를 import해 사용 — 패턴 맞춤.

- [ ] **Step 2: 실패 확인** — Run: `pnpm test tests/worker-data.spec.ts` → FAIL.

- [ ] **Step 3: worker data handlers 구현(부분)**

```ts
// src/worker.ts (1차: data handlers)
import { definePlugin } from "@paperclipai/plugin-sdk";
import { ensureThread, listMessages } from "./db.js";

export default definePlugin({
  setup(ctx) {
    ctx.data.register("listAgents", async (params) => {
      const companyId = String((params as any).companyId);
      const agents = await ctx.agents.list({ companyId });
      return { agents: agents.map((a:any) => ({ id: a.id, name: a.name, role: a.role, status: a.status })) };
    });

    ctx.data.register("listMessages", async (params) => {
      const { companyId, userId, agentId } = params as any;
      const thread = await ensureThread(ctx.db, String(companyId), String(userId), String(agentId));
      const messages = await listMessages(ctx.db, thread.id);
      return { threadId: thread.id, status: thread.status, messages };
    });
  },
});
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm test tests/worker-data.spec.ts` → PASS.
- [ ] **Step 5: Commit**

```bash
git add src/worker.ts tests/worker-data.spec.ts && git commit -q -m "feat: worker data handlers (listAgents, listMessages)"
```

---

## Task 6: worker — sendMessage action (핵심, TDD)

**Files:** Modify: `src/worker.ts`; Test: `tests/worker-send.spec.ts`

- [ ] **Step 1: 실패 테스트 (lock+멱등+스트림중계+finalize)**

```ts
// tests/worker-send.spec.ts
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createTestHarness } from "@paperclipai/plugin-sdk/testing";
import manifest from "../src/manifest.js";
import plugin from "../src/worker.js";

function setup() {
  const companyId = randomUUID(), userId = randomUUID(), agentId = randomUUID(), sessionId = randomUUID(), runId = randomUUID();
  const h = createTestHarness({ manifest, plugin });
  h.seed({ agents: [{ id: agentId, companyId, name: "CTO", role: "cto" } as any] });
  // ctx.agents.sessions 모킹: create→sessionId, sendMessage→{runId} + onEvent 저장
  let onEvent: any;
  (h.ctx.agents as any).sessions = {
    create: vi.fn(async () => ({ sessionId })),
    list: vi.fn(async () => []),
    sendMessage: vi.fn(async (_sid:string,_cid:string,opts:any) => { onEvent = opts.onEvent; return { runId }; }),
    close: vi.fn(async () => {}),
  };
  const emit = vi.fn();
  (h.ctx as any).streams = { open: vi.fn(), emit, close: vi.fn() };
  return { h, companyId, userId, agentId, sessionId, runId, fire: (e:any)=>onEvent?.(e), emit };
}

it("happy path: human msg + streamed agent reply finalized", async () => {
  const { h, companyId, userId, agentId, runId, fire, emit } = setup();
  const cid = randomUUID();
  const p = h.performAction("sendMessage", { companyId, userId, agentId, text: "hi", clientMessageId: cid });
  await p;
  fire({ sessionId: "s", runId, seq: 1, eventType: "chunk", message: "he" });
  fire({ sessionId: "s", runId, seq: 2, eventType: "chunk", message: "llo" });
  fire({ sessionId: "s", runId, seq: 3, eventType: "done", message: null });
  const res = await h.getData<{ messages:any[] }>("listMessages", { companyId, userId, agentId });
  const roles = res.messages.map(m=>m.role);
  expect(roles).toEqual(["human","agent"]);
  const agentMsg = res.messages[1];
  expect(agentMsg.body).toBe("hello");
  expect(agentMsg.status).toBe("done");
  expect(emit).toHaveBeenCalled();
});

it("rejects concurrent send on same thread (busy lock)", async () => {
  const { h, companyId, userId, agentId } = setup();
  await h.performAction("sendMessage", { companyId, userId, agentId, text: "first", clientMessageId: randomUUID() });
  // 첫 전송이 streaming 상태로 잡힌 동안 두번째
  const r2 = await h.performAction<{ ok:boolean; reason?:string }>("sendMessage", { companyId, userId, agentId, text: "second", clientMessageId: randomUUID() });
  expect(r2.ok).toBe(false);
  expect(r2.reason).toMatch(/busy|streaming|진행/i);
});

it("human resend with same clientMessageId is idempotent", async () => {
  const { h, companyId, userId, agentId, runId, fire } = setup();
  const cid = randomUUID();
  await h.performAction("sendMessage", { companyId, userId, agentId, text: "hi", clientMessageId: cid });
  fire({ sessionId:"s", runId, seq:1, eventType:"done", message:"ok" });
  await h.performAction("sendMessage", { companyId, userId, agentId, text: "hi", clientMessageId: cid });
  const res = await h.getData<{ messages:any[] }>("listMessages", { companyId, userId, agentId });
  expect(res.messages.filter(m=>m.role==="human").length).toBe(1);
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm test tests/worker-send.spec.ts` → FAIL.

- [ ] **Step 3: sendMessage 구현(worker.ts에 추가)**

```ts
// src/worker.ts 내 setup(ctx)에 추가
import { acquireLock, releaseLock, insertHumanMessage, insertAgentPlaceholder,
         appendAgentChunk, finalizeAgentMessage, setThreadSession } from "./db.js";
import { streamChannel, taskKey, STREAM_IDLE_TIMEOUT_MS } from "./constants.js";

ctx.actions.register("sendMessage", async (params) => {
  const { companyId, userId, agentId, text } = params as any;
  const clientMessageId = String((params as any).clientMessageId);
  const thread = await ensureThread(ctx.db, String(companyId), String(userId), String(agentId));

  // 1) busy lock
  const locked = await acquireLock(ctx.db, thread.id);
  if (!locked) return { ok: false, reason: "이전 응답 진행 중(busy)" };

  try {
    // 2) human msg (멱등)
    await insertHumanMessage(ctx.db, thread.id, String(text), clientMessageId);

    // 3) 세션 resolve (taskKey 우선; 저장 session 없으면 create)
    let sessionId = thread.sessionId;
    if (!sessionId) {
      const s = await ctx.agents.sessions.create(String(agentId), String(companyId),
        { taskKey: taskKey(String(companyId), String(userId), String(agentId)) });
      sessionId = (s as any).sessionId;
    }

    // 4) 전송 → runId
    let placeholderId: string | null = null;
    let buf = "";
    let lastEventAt = Date.now();
    let settled = false;

    const finish = async (status: "done"|"error"|"timeout", msg?: string) => {
      if (settled) return; settled = true;
      if (placeholderId) await finalizeAgentMessage(ctx.db, placeholderId, status, status==="done" ? buf : undefined);
      await releaseLock(ctx.db, thread.id);
      ctx.streams.emit(streamChannel(thread.id, runIdRef), { type: status, runId: runIdRef, message: msg });
    };

    let runIdRef = "";
    const { runId } = await ctx.agents.sessions.sendMessage(sessionId!, String(companyId), {
      prompt: String(text),
      onEvent: async (ev: any) => {
        lastEventAt = Date.now();
        if (!placeholderId) { /* 방어: 아직 placeholder 미생성 시 생성 */ }
        if (ev.eventType === "chunk") {
          const t = ev.message ?? "";
          buf += t;
          if (placeholderId) await appendAgentChunk(ctx.db, placeholderId, t);
          ctx.streams.emit(streamChannel(thread.id, runIdRef), { type: "chunk", text: t, runId: runIdRef });
        } else if (ev.eventType === "done") {
          await finish("done");
        } else if (ev.eventType === "error") {
          await finish("error", ev.message ?? "agent error");
        }
      },
    });
    runIdRef = runId;
    await setThreadSession(ctx.db, thread.id, sessionId!, runId);
    const placeholder = await insertAgentPlaceholder(ctx.db, thread.id, runId);
    placeholderId = placeholder.id;
    ctx.streams.open?.(streamChannel(thread.id, runId), String(companyId));

    // 6) 타임아웃 가드 (idle 동안 폴링)
    const timer = setInterval(async () => {
      if (settled) { clearInterval(timer); return; }
      if (Date.now() - lastEventAt > STREAM_IDLE_TIMEOUT_MS) {
        clearInterval(timer);
        await finish("timeout", "no events");
      }
    }, 5_000);

    return { ok: true, threadId: thread.id, runId, channel: streamChannel(thread.id, runId) };
  } catch (e: any) {
    await releaseLock(ctx.db, thread.id);
    return { ok: false, reason: e?.message ?? "send failed" };
  }
});
```

> **주의(구현 시 확정):** `onEvent` 콜백이 `sendMessage` resolve 전에 호출될 수 있으므로 `placeholderId`/`runIdRef`가 아직 없을 때의 청크는 버퍼(`buf`)에만 쌓고, placeholder 생성 직후 DB에 flush한다. 위 코드의 방어 분기를 실제로 채운다. 순서 경쟁은 테스트(Step 1)가 잡는다.

- [ ] **Step 4: 통과 확인** — Run: `pnpm test tests/worker-send.spec.ts` → PASS (3 tests). 경쟁/순서 이슈 나오면 buf-flush 로직 보완 후 재실행.
- [ ] **Step 5: Commit**

```bash
git add src/worker.ts tests/worker-send.spec.ts && git commit -q -m "feat: sendMessage (lock, stream relay, finalize, timeout guard)"
```

---

## Task 7: UI — routeSidebar (CHAT + 에이전트 DM 리스트)

**Files:** Create: `src/ui/ChatSidebar.tsx`, `src/ui/index.tsx`(export)

- [ ] **Step 1: ChatSidebar 작성**

```tsx
// src/ui/ChatSidebar.tsx
import { usePluginData, useHostContext, useHostNavigation } from "@paperclipai/plugin-sdk/ui";

export function ChatSidebar() {
  const { companyId } = useHostContext();
  const nav = useHostNavigation();
  const { data } = usePluginData<{ agents: { id:string; name:string; role:string; status:string }[] }>(
    "listAgents", { companyId });
  const agents = data?.agents ?? [];
  return (
    <div className="flex flex-col">
      <div className="px-3 pt-3 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Chat</div>
      <div className="flex flex-col gap-0.5 px-2">
        {agents.map(a => (
          <a key={a.id} {...nav.linkProps(`chat?agent=${a.id}`)}
             className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/80 text-[11px] text-primary-foreground">
              {a.name.slice(0,1)}
            </span>
            <span className="flex-1 truncate">{a.name}</span>
            <span className={`h-1.5 w-1.5 rounded-full ${a.status==="idle"?"bg-muted-foreground/40":"bg-emerald-500"}`} />
          </a>
        ))}
      </div>
    </div>
  );
}
```

> `useHostContext`/`useHostNavigation`/`usePluginData` 정확 export·시그니처를 `packages/plugins/sdk/src/ui/hooks.ts`로 확정. `nav.linkProps` 라우트 형식(`chat?agent=`)을 PluginPage 라우팅 규칙에 맞춤.

- [ ] **Step 2: index.tsx export**

```tsx
// src/ui/index.tsx
export { ChatSidebar } from "./ChatSidebar.js";
export { ChatPage } from "./ChatPage.js";
```

- [ ] **Step 3: 빌드 확인** — Run: `pnpm build` (ChatPage 미작성이면 Task 8 후 통합 빌드). 일단 typecheck: `pnpm typecheck`.
- [ ] **Step 4: Commit**

```bash
git add src/ui/ChatSidebar.tsx src/ui/index.tsx && git commit -q -m "feat(ui): CHAT routeSidebar + agent DM list"
```

---

## Task 8: UI — ChatPage (Flat 스레드 + 입력 + 스트림 + linkify)

**Files:** Create: `src/ui/ChatPage.tsx`, `src/ui/linkify.tsx`

- [ ] **Step 1: linkify 작성**

```tsx
// src/ui/linkify.tsx
import { useHostNavigation } from "@paperclipai/plugin-sdk/ui";
const RE = /\b([A-Z]{2,6}-\d+)\b/g;
export function Linkified({ text }: { text: string }) {
  const nav = useHostNavigation();
  const parts = text.split(RE);
  return <>{parts.map((p,i)=> RE.test(p)
    ? <a key={i} {...nav.linkProps(`issues/${p}`)} className="text-primary underline">{p}</a>
    : <span key={i}>{p}</span>)}</>;
}
```

> 이슈 라우트 형식(`issues/<identifier>` vs `<prefix>/issues/<id>`)을 호스트 라우팅으로 확정.

- [ ] **Step 2: ChatPage 작성**

```tsx
// src/ui/ChatPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { usePluginData, usePluginAction, usePluginStream, useHostContext, MarkdownBlock } from "@paperclipai/plugin-sdk/ui";
import { Linkified } from "./linkify.js";

function useQueryAgentId(): string {
  const sp = new URLSearchParams(window.location.search);
  return sp.get("agent") ?? "";
}

export function ChatPage() {
  const { companyId, userId } = useHostContext() as any;
  const agentId = useQueryAgentId();
  const { data, refresh } = usePluginData<{ threadId:string; status:string; messages:any[] }>(
    "listMessages", { companyId, userId, agentId });
  const send = usePluginAction("sendMessage");
  const [text, setText] = useState("");
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const { events } = usePluginStream<{type:string;text?:string;runId:string}>(activeChannel ?? "", { companyId });
  const streaming = data?.status === "streaming" || !!activeChannel;

  // 스트림 종료 시 DB 재동기화
  useEffect(() => {
    const last = events[events.length-1];
    if (last && (last.type==="done"||last.type==="error"||last.type==="timeout")) {
      setActiveChannel(null); refresh();
    }
  }, [events]); // eslint-disable-line

  const liveText = useMemo(() =>
    events.filter(e=>e.type==="chunk").map(e=>e.text??"").join(""), [events]);

  async function onSend() {
    if (!text.trim() || streaming) return;
    const clientMessageId = crypto.randomUUID();
    const body = text; setText("");
    const res = await send.run({ companyId, userId, agentId, text: body, clientMessageId }) as any;
    if (res?.ok && res.channel) { setActiveChannel(res.channel); }
    refresh();
  }

  const messages = data?.messages ?? [];
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{ endRef.current?.scrollIntoView(); }, [messages.length, liveText]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto p-4 flex flex-col gap-3.5">
        {messages.map(m => (
          <div key={m.id} className="flex gap-2.5">
            <span className="h-6 w-6 shrink-0 rounded-full bg-muted inline-flex items-center justify-center text-[11px]">
              {m.role==="human" ? "나" : "A"}
            </span>
            <div className="flex-1">
              <div className="text-[11px] text-muted-foreground mb-0.5">{m.role==="human"?"나":"Agent"}</div>
              {m.role==="agent"
                ? <div className="text-sm"><Linkified text={(m.status==="streaming" && activeChannel)? liveText : m.body} /></div>
                : <div className="text-sm whitespace-pre-wrap">{m.body}</div>}
              {m.status==="streaming" && <span className="opacity-60">▋</span>}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="border-t p-3">
        <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
          <input className="flex-1 bg-transparent text-sm outline-none"
            placeholder={streaming ? "응답 대기 중…" : "메시지…"} value={text}
            disabled={streaming || !agentId}
            onChange={e=>setText(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter") onSend(); }} />
        </div>
      </div>
    </div>
  );
}
```

> `MarkdownBlock`이 SDK ui에 있으면 에이전트 본문을 `<MarkdownBlock markdown=...>`로 렌더(linkify는 fallback). hooks 정확 시그니처(`usePluginAction().run` vs 직접 호출)는 hooks.ts로 확정.

- [ ] **Step 3: typecheck + build** — Run: `pnpm typecheck && pnpm build` → 에러 0, `dist/ui/` 생성.
- [ ] **Step 4: Commit**

```bash
git add src/ui/ChatPage.tsx src/ui/linkify.tsx && git commit -q -m "feat(ui): ChatPage flat thread + streaming + linkify"
```

---

## Task 9: 검증 + 설치 + E2E

**Files:** (없음 — 설치/검증)

- [ ] **Step 1: 전체 검증**

Run: `pnpm typecheck && pnpm test && pnpm build`
Expected: 전부 PASS, dist 생성.

- [ ] **Step 2: 로컬 설치(가능 시)** — 로컬 Paperclip 인스턴스가 떠 있으면:

```bash
node /Users/bright/Projects/company-os-v2/packages/cli/dist/index.js plugin install ~/dev/paperclip-plugins/agent-chat --local 2>/dev/null \
  || echo "로컬 인스턴스 없음 → mac-studio prod로(Step 3)"
```

- [ ] **Step 3: mac-studio prod 설치** — rsync 후 prod CLI로 설치:

```bash
rsync -az --delete ~/dev/paperclip-plugins/agent-chat/ mac-studio:/Users/papert/dev/paperclip-plugins/agent-chat/
ssh mac-studio "cd /Users/papert/Projects/company-os-v2 && PATH=/opt/homebrew/opt/node@24/bin:\$PATH \
  ./node_modules/.bin/tsx packages/cli/src/index.ts plugin install /Users/papert/dev/paperclip-plugins/agent-chat --local"
# 또는 prod가 쓰는 설치 경로/방식은 [[project_quote_plugin]] 메모리 레시피 따름
```

Expected: `plugin list`에 `flotter.agent-chat` status=`ready`.

- [ ] **Step 4: 헤드 브라우저 E2E** (API 200 ≠ UI 동작 — 필수)

- `http://mac-studio.tail9b5d74.ts.net:3100/` 로그인 → 좌측 CHAT 라벨 + 에이전트 리스트 확인.
- CTO 클릭 → DM 열림 → "FLO-19 상태 알려줘" 전송 → 응답 스트리밍 → `FLO-19` 링크화 확인.
- 응답 중 입력 잠금 확인. 새로고침 후 기록 유지(plugin DB) 확인.
- 에이전트가 이슈 touch 요청("새 이슈 만들어줘") → 호스트 이슈에 반영 확인.

- [ ] **Step 5: 최종 커밋 + 문서**

```bash
cd ~/dev/paperclip-plugins/agent-chat && git add -A && git commit -q -m "chore: agent-chat plugin v0.1.0"
```

- Paperclip 레포에 변경 없음(격리). spec/plan은 이미 커밋됨.

---

## 완료 기준

- `pnpm typecheck && pnpm test && pnpm build` 전부 PASS.
- `plugin inspect flotter.agent-chat` status=ready, lastError 없음.
- 헤드 브라우저: CHAT 라벨→에이전트 DM→스트리밍 응답→이슈 링크→기록 유지 전부 동작.
- Paperclip 코어 0수정(격리 검증: `git -C /Users/bright/Projects/company-os-v2 status`에 플러그인 관련 코어 변경 없음).

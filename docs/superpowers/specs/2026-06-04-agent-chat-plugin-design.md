# Agent DM Chat 플러그인 — 설계 spec

- 날짜: 2026-06-04
- 상태: 설계 승인 (구현 전)
- 플러그인 패키지(가칭): `paperclip-plugin-agent-chat`
- 진실원천 탐색: 코드베이스 7-dimension 탐색 + Codex 독립 리뷰(실제 SDK/host 소스 검증)

---

## 1. 개요

Paperclip 위에 **에이전트와 1:1 DM 채팅** 기능을 추가한다. 사용자가 좌측 "CHAT" 메뉴에서 회사 에이전트를 골라 대화하면, 메시지가 해당 에이전트의 실제 run을 깨우고, 응답이 실시간으로 스트리밍된다. 채팅 중 이슈 읽기/쓰기는 **에이전트가 자기 도구로** 수행한다.

**반드시 외부 격리 플러그인으로 만든다.** `packages/plugins/` 밖의 독립 패키지로 작성하고 local-path로 설치한다. 호스트 코어는 **0줄 수정**한다.

### 1.1 목표 (in scope)

1. 사람 ↔ 에이전트 1:1 DM, 에이전트 응답 실시간(live run-output) 스트리밍.
2. 좌측 사이드바 top-level "CHAT" 라벨 + 회사 전체 에이전트 DM 리스트.
3. 채팅에서 이슈 read/write — **에이전트 주도**(사람이 에이전트에게 요청 → 에이전트 run이 자기 툴로 처리).
4. 채팅 기록은 **플러그인 DB 네임스페이스**에 영속.
5. UI는 Paperclip 디자인 언어(shadcn-neutral) + `@paperclipai/plugin-sdk/ui` 공용 컴포넌트를 따른다.

### 1.2 비목표 (out of scope)

- **스킬 편집** (C레벨이 에이전트 스킬 편집) — 이번 버전에서 제외.
- 사람이 직접 누르는 이슈 조작 UI(생성/상태변경 버튼) — 이슈는 에이전트 주도.
- 그룹 채팅 / 멀티-에이전트 방.
- 수평 확장(멀티노드) 환경 — 단일노드(mac-studio) 전제.

---

## 2. 결정 사항 (rationale)

| 결정 | 선택 | 근거 |
|---|---|---|
| 채팅 저장 | 플러그인 DB 네임스페이스 | 채팅과 이슈를 깨끗이 분리(경계 명확). 에이전트 wakeup은 `ctx.agents.sessions`가 처리하므로 호스트-이슈 백킹 이점 작음. |
| 이슈 R/W 주체 | 에이전트 주도 | 에이전트는 이미 codex/claude + paperclip 스킬로 이슈 툴 보유. 플러그인은 `ctx.issues` 미사용 → 더 단순·격리. |
| 응답 전송 | `ctx.agents.sessions` | 유일한 스트리밍 가능 경로. `invoke`는 논스트림, 이슈-댓글 wakeup은 채팅에 부적합. |
| 세션 모델 | taskKey 우선 + 스레드당 busy lock | 실제로 sendMessage마다 새 heartbeat run. "장수명 세션"은 `agent_task_sessions.taskKey` 재사용일 뿐. 동시성 위해 lock 필수(§6). |
| CHAT 메뉴 | `routeSidebar` slot | 호스트 사이드바는 native 중첩 nav 미지원 → 플러그인이 CHAT 섹션 전체를 자체 렌더. |
| 메시지 스타일 | Flat 행 | Paperclip의 조밀·깔끔 미학. 코드블록·이슈링크 렌더에 유리. |
| C레벨 정의 | (스킬편집 제외로 무효) | — |

---

## 3. 아키텍처

```
┌─ 플러그인 UI (React, @paperclipai/plugin-sdk/ui) ─────────────────┐
│  routeSidebar slot                                                │
│    "CHAT" 헤딩 + 에이전트 DM 리스트 (getData: listAgents)          │
│  page slot (routePath 'chat')                                     │
│    Flat 행 스레드 + 입력창 (스트리밍 중 입력 잠금)                  │
│      usePluginData   → getData('listMessages', {threadId})        │
│      usePluginStream → 'chat:<threadId>:<runId>' (라이브 청크)     │
│      usePluginAction → performAction('sendMessage',{agentId,text})│
│      issuePrefix-NN(예: FLO-19) 멘션 → 호스트 이슈 라우트 auto-linkify                 │
└───────────────────────────┬───────────────────────────────────────┘
                            │ getData / performAction (JSON-RPC over stdio)
┌───────────────────────────▼─ 플러그인 Worker (definePlugin) ───────┐
│  ctx.db (plugin namespace) : chat_threads, chat_messages          │
│  ctx.agents.list           : DM 대상(회사 전체)                    │
│  ctx.state (선택)          : 스레드별 캐시                          │
│  performAction('sendMessage'):                                    │
│    1) busy lock 확인 (thread.status != 'streaming')               │
│    2) human msg insert (clientMessageId unique)                   │
│    3) placeholder agent msg insert (runId, status='streaming')    │
│    4) ctx.agents.sessions.create|resume (taskKey 우선)            │
│    5) ctx.agents.sessions.sendMessage(prompt, onEvent)            │
│    6) onEvent 'chunk' → ctx.streams.emit('chat:<tid>:<rid>')       │
│                       + placeholder body append                   │
│    7) 'done' → 최종 본문 finalize, status='done'                  │
│       'error'/타임아웃 → status='error'|'timeout'                 │
└───────────────────────────┬───────────────────────────────────────┘
                            │ ctx.agents.sessions → host heartbeat.wakeup
                    ┌───────▼────────┐
                    │ 대상 에이전트 run │ ← 자기 도구로 이슈 R/W
                    └────────────────┘
```

**핵심 원칙: 플러그인 DB가 진실원천.** `ctx.streams`는 best-effort 라이브 채널일 뿐이다. 스트림이 끊기거나(타임아웃/재접속/워커 재시작) 빠진 청크가 있어도 UI는 항상 DB(`listMessages`)에서 스레드를 재구성할 수 있어야 한다.

---

## 4. 데이터 모델 (`ctx.db` plugin namespace)

`ctx.db`는 **raw SQL 네임스페이스 API**다(Drizzle 타입 테이블 아님). migration SQL을 `migrations/`에 파일명 순서로 작성한다. namespace 내부 객체만 생성/변경 가능, runtime query는 SELECT, execute는 namespace-local INSERT/UPDATE/DELETE로 제한된다.

### 4.1 `chat_threads`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | 스레드 id |
| company_id | text NOT NULL | |
| user_id | text NOT NULL | 사람(better-auth user) |
| agent_id | text NOT NULL | 대상 에이전트 |
| task_key | text NOT NULL | `plugin:<key>:dm:<companyId>:<userId>:<agentId>` |
| session_id | text NULL | 마지막 agent session id(있으면 resume) |
| status | text NOT NULL | `idle` \| `streaming` |
| last_run_id | text NULL | 진행/직전 run |
| created_at, updated_at | timestamptz | |

- UNIQUE `(company_id, user_id, agent_id)` — DM 스레드 유일.
- `status='streaming'`이 busy lock. 전송 시작 시 `idle→streaming` 조건부 UPDATE(원자적), 실패하면 거부.

### 4.2 `chat_messages`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| thread_id | uuid NOT NULL FK→chat_threads | |
| seq | bigint NOT NULL | 스레드 내 순서 |
| role | text NOT NULL | `human` \| `agent` |
| body | text NOT NULL DEFAULT '' | 스트리밍 중 append |
| status | text NOT NULL | `complete`(human) \| `streaming`\|`done`\|`error`\|`timeout`(agent) |
| client_message_id | text NULL | human 메시지 멱등키 |
| run_id | text NULL | agent 메시지의 run |
| created_at, updated_at | timestamptz | |

- UNIQUE `(thread_id, seq)` — 순서 충돌 방지.
- UNIQUE `(thread_id, client_message_id)` WHERE client_message_id NOT NULL — human 재전송 멱등.
- UNIQUE `(thread_id, run_id)` WHERE run_id NOT NULL — run당 agent 메시지 1개(스트림→finalize 중복 방지).
- `seq` 생성은 busy lock 하에 `MAX(seq)+1` (스레드당 직렬화되므로 안전).

---

## 5. 세션 & 스트리밍 모델

### 5.1 taskKey 우선

`session_id` 단독 의존 금지. 안정 `task_key = plugin:<pluginKey>:dm:<companyId>:<userId>:<agentId>`로 세션을 resolve한다. 첫 전송 시 `ctx.agents.sessions.create({taskKey})`, 이후엔 저장된 `session_id`로 resume하되, 없거나 무효면 taskKey로 재생성한다.

**주의(어댑터 의존):** host는 taskKey로 `agent_task_sessions`의 adapter 세션 파라미터/display id를 재사용한다. 실제 "대화 연속성"은 어댑터(codex_local/claude_local)가 세션 resume을 지원하는지에 달림. 보장하지 않으며, 최소한 각 메시지는 직전 컨텍스트 없이도 동작하도록 프롬프트를 구성한다(필요 시 최근 N개 메시지를 프롬프트에 동봉).

### 5.2 전송 흐름 (performAction `sendMessage`)

1. `chat_threads` 조건부 lock: `UPDATE ... SET status='streaming' WHERE id=? AND status='idle'`. 0 rows → **거부**("이전 응답 진행 중").
2. human `chat_messages` insert (`client_message_id` 멱등; 충돌이면 기존 행 사용).
3. placeholder agent `chat_messages` insert (`status='streaming'`, `run_id` 미정이면 직후 채움).
4. session resolve (taskKey 우선) → `ctx.agents.sessions.sendMessage(sessionId, companyId, {prompt, onEvent})` → `run_id` 확보 후 placeholder/thread에 기록.
5. `onEvent`:
   - `chunk` → `ctx.streams.emit('chat:<threadId>:<runId>', {type:'chunk', text})` + placeholder `body` append.
   - `done` → 최종 본문 finalize, agent msg `status='done'`, thread `status='idle'`, emit `{type:'done'}`.
   - `error` → `status='error'`, thread `idle`, emit `{type:'error', message}`.
6. **타임아웃 가드:** host 구독은 30분 후 강제 정리될 수 있고 runId replay API가 없다. 워커에 자체 타이머를 두어, 마지막 청크 이후 임계시간(예: 90s) 무이벤트면 agent msg `status='timeout'`, thread `idle`, emit `{type:'timeout'}`. 사용자는 재전송/새 턴 가능.

### 5.3 스트림 채널 & 재구성

- 채널명 `chat:<threadId>:<runId>` (sessionId 아님). 여러 DM 동시 열림 대비 스레드+run별 분리.
- UI는 (a) mount 시 `listMessages`로 DB 기록 로드, (b) 진행 중 run이 있으면 해당 채널 구독, (c) 스트림 종료/끊김 시 `listMessages` 재호출로 최종본 동기화. **스트림 누락은 DB 재로드로 항상 복구.**

---

## 6. 동시성 / 엣지 케이스

- **중복 전송(같은 스레드):** §5.2-1 lock으로 차단. 워커가 sessionId당 콜백 1개만 보유하므로 병렬 send는 콜백 덮어쓰기 + host run coalesce 위험 → v1은 **스레드당 1 active 강제**, 병렬 미지원.
- **다른 스레드 동시 진행:** 허용. 채널/스레드 분리로 격리.
- **human 재전송(네트워크 재시도):** `client_message_id` 멱등으로 중복 insert 방지.
- **스트림→finalize 중복:** `(thread_id, run_id)` unique로 run당 agent 메시지 1개 보장.
- **워커 재시작/브라우저 재접속:** 라이브 청크 유실 가능 → DB 재로드로 복구. 진행 중이던 placeholder가 `streaming`에 멈춰 있으면 타임아웃 가드가 정리.
- **에이전트 일시정지/취소/예산초과:** sendMessage가 거부/실패하면 agent msg `error`로 마킹, 사유 표시.

---

## 7. 매니페스트 / capabilities

```ts
capabilities: [
  'agents.read',            // ctx.agents.list (DM 대상)
  'agent.sessions.create',
  'agent.sessions.list',
  'agent.sessions.send',
  'agent.sessions.close',
  'database.namespace.migrate',
  'database.namespace.read',
  'database.namespace.write',
  'ui.sidebar.register',    // routeSidebar
  'ui.page.register',       // page (routePath 'chat')
]
```

- 슬롯: `routeSidebar`(CHAT nav), `page`(routePath `chat`).
- **이슈 capability 불필요** — 이슈 R/W는 에이전트 run이 자기 권한으로 수행, 플러그인은 `ctx.issues` 미사용.
- entrypoints: `worker: ./dist/worker.js`, `ui: ./dist/ui`.
- 정확한 capability 키 문자열(특히 `routeSidebar`용)은 구현 시 `packages/shared/src/constants.ts`의 enum으로 확정한다. 위 목록은 설계 의도이며, 슬롯 capability가 `ui.sidebar.register`/별도 키인지 코드로 검증 후 고정.

---

## 8. UI 설계

- **디자인 언어:** Paperclip = shadcn-neutral(oklch 그레이, 다크). `@paperclipai/plugin-sdk/ui`의 `MarkdownBlock`(에이전트 응답 렌더) 등 공용 컴포넌트 우선 사용. 호스트 CSS 변수 직접 import 불가 → SDK 주입 컴포넌트/토큰 재현.
- **routeSidebar:** "CHAT" 섹션 헤딩 + 에이전트 행(아바타 이니셜, 이름, 상태점 idle/online, 선택 강조). `useHostNavigation().linkProps`로 라우팅.
- **page(thread):** 헤더(에이전트 + 어댑터/모델), Flat 행 메시지(아바타+이름+시각+본문), 스트리밍 중 caret + "live · run …" 표시, 하단 입력창(스트리밍 중 disabled).
- **이슈 멘션:** 응답 본문의 `issuePrefix-NN(예: FLO-19)` 패턴 → 호스트 이슈 라우트 링크로 auto-linkify(읽기 전용 표시, 에이전트 주도 원칙 유지).

---

## 9. 테스트 전략

- **Worker 단위:** sendMessage 흐름 — lock 획득/거부, 멱등(client_message_id), placeholder→finalize, onEvent chunk/done/error/timeout 분기, 타임아웃 가드. SDK 테스트 하니스의 `simulateSessionEvent()`로 onEvent 주입.
- **DB migration:** namespace DDL 적용, unique 제약(중복 seq/run_id/client_message_id) 위반 테스트.
- **UI:** listMessages 로드 → 스트림 청크 누적 → 종료 후 DB 재동기화. 스트리밍 중 입력 잠금. 멀티 DM 채널 분리.
- **통합(수동, mac-studio):** 실제 에이전트(codex_local)와 DM, 이슈 요청 → 에이전트가 이슈 touch 확인, 스트리밍/타임아웃/재접속 복구.
- 헤드 브라우저로 클릭 플로우까지 검증(요구: API 200 ≠ UI 동작).

---

## 10. 리스크 & 알려진 한계

| # | 리스크 | 완화 |
|---|---|---|
| 1 | `agents.sessions.event` 미타입(런타임 문자열매칭, worker-rpc-host.ts:1737) | known-risk 수용. 통합 테스트로 회귀 감지. 순수 플러그인 제약상 호스트 수정 불가. |
| 2 | 스트림 best-effort(인메모리 단일노드, 30분 타임아웃, replay 없음) | DB 진실원천 + 타임아웃 가드 + UI DB 재로드. |
| 3 | "토큰단위" 아님 = live run-output 청크 | 문구·기대치 정정. |
| 4 | 세션 연속성 어댑터 의존 | 프롬프트에 최근 맥락 동봉 옵션. 보장하지 않음 명시. |
| 5 | 단일노드 전용 | mac-studio 단일 호스트 전제. 수평확장 시 재설계 필요(문서화). |
| 6 | pluginKey 변경 시 live session 고아 | 기록은 DB라 안전; resume만 영향. taskKey 재생성으로 복구. |

---

## 11. 빌드 순서 (개략)

1. `paperclipai plugin init`로 외부 패키지 scaffold(레포 밖, local SDK 스냅샷).
2. manifest(capabilities/슬롯) + `migrations/0001_init.sql`(chat_threads, chat_messages).
3. worker: getData(listAgents/listMessages) + performAction(sendMessage) + 세션/스트림/타임아웃 로직.
4. UI: routeSidebar(CHAT+DM 리스트) + page(Flat 스레드 + 입력 + 스트림 구독 + 멘션 linkify).
5. `pnpm typecheck && pnpm test && pnpm build`.
6. `paperclipai plugin install <abs-path>` → `plugin list/inspect` status=ready.
7. mac-studio prod 설치 + 헤드 브라우저 E2E.

---

## 12. 참조 (소스 근거)

- `packages/plugins/sdk/src/types.ts:1534` — `ctx.agents.sessions.*`, `AgentSessionEvent:1510`.
- `packages/shared/src/constants.ts:784` — session capabilities; `:870` — routeSidebar/page 슬롯.
- `packages/plugins/sdk/src/protocol.ts:573` — HostToWorkerMethods(여기에 `agents.sessions.event` 없음).
- `packages/plugins/sdk/src/worker-rpc-host.ts:1737` — 세션 이벤트 문자열매칭; `:1047` — sessionId당 콜백 1개.
- `server/src/services/plugin-host-services.ts:2615` — sendMessage→`heartbeat.wakeup({prompt},taskKey)`; `:478,:2683` — 구독 30분 타임아웃.
- `server/src/services/heartbeat.ts:8032` — `adapter.execute()`(정상 run 경로); `:3588,:8383` — taskKey 세션 재사용; `:9587` — same-task run coalesce.
- `server/src/services/plugin-stream-bus.ts:51` — 인메모리 Map; `server/src/routes/plugins.ts:1645` — SSE 구독.
- `ui/src/pages/PluginPage.tsx`, `ui/src/plugins/slots.tsx`, `ui/src/components/Layout.tsx` — routeSidebar가 매칭 라우트에서 회사 사이드바 대체.
- 예제: `packages/plugins/examples/plugin-kitchen-sink-example`(agent-session/stream 데모, 단 fresh-session·공유채널), `plugin-file-browser-example`(worker↔UI data/action).

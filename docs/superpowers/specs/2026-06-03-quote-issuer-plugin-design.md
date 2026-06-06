# 견적서 발행 플러그인 (quote-issuer) — 설계

기준일: 2026-06-03
대상: Paperclip Plugin (main = 순정 Paperclip 위에 설치). Paperclip core 밖 독립 패키지.

## 1. 목적

사람이 견적 입력 → 에이전트가 리스크 분석 + 하이브리드 가격 산출 → 엑셀급 HTML/PDF 견적서 생성 → 플러그인 DB에 이력/사례 축적. UI 위저드로 전 과정 진행.

산출물은 **독립**(Paperclip issue에 첨부하지 않음, 플러그인 DB에만 저장).

## 2. 아키텍처 (SDK 매핑)

```
[UI 위저드 (React, ui.page slot, routePath "quotes")]
  1 입력 → 2 분석(스트리밍) → 3 미리보기 → 4 발행
        │ usePluginAction / usePluginData / usePluginStream
        ▼
[Worker (define-plugin, onApiRequest + actions)]
  - createQuote/getQuote/listQuotes/triggerAnalysis
  - analysis orchestration  ──►  [Managed Agent "Quote Analyzer" (claude_local)]
                                   ctx.agents.sessions.create + sendMessage(onEvent stream)
                                   ① 리스크 분석 ② 하이브리드 가격(내부 기준표 + 웹리서치) ③ 항목화
                                   → 구조화 JSON 반환
  - HTML 렌더(JSON + 고정 템플릿) → 엑셀급 A4 HTML
  - PDF: analyzer 에이전트 shell(chrome --headless/weasyprint)로 HTML→PDF
  - 저장: ctx.db (plugin namespace)
        ▼
[Plugin DB (namespace)]
  quotes 테이블 (입력/분석JSON/가격/html/pdf경로/status/생성일) = 이력+사례
  reference_rates (단가운영기준 + ABADC seed)
```

## 3. 컴포넌트 (경계)

### 3.1 manifest (`src/manifest.ts`)
- `id: "quote-issuer"`, `apiVersion: 1`, `entrypoints: { worker, ui }`
- `capabilities`: `database.namespace.migrate/read/write`, `api.routes.register`, `ui.page.register`, `ui.sidebar.register`, `agents.managed`, `agent.sessions.create/send/close`, `http.outbound`, `secrets.read-ref`, `plugin.state.read/write`
- `database`: `{ namespaceSlug: "quote_issuer", migrationsDir: "migrations", coreReadTables: ["companies","issues","projects","agents"] }`
- `agents`: [{ key: "quote-analyzer", role: "general", adapterType: "claude_local", instructions: 견적 방법론 번들 }]
- `ui.slots`: [{ type: "page", routePath: "quotes", label: "견적" }, { type: "sidebar", ... }]
- `apiRoutes`/actions: createQuote, getQuote, listQuotes, triggerAnalysis, renderPdf

### 3.2 Worker (`src/worker.ts`)
- `onAction("createQuote")`: 입력 검증 → quotes 행 draft INSERT → quoteId 반환
- `onAction("triggerAnalysis", {quoteId})`: analyzer 세션 생성 → 프롬프트(입력+내부 기준표) 전송 → onEvent 청크를 `ctx.streams.emit("analysis:{quoteId}")`로 UI 스트리밍 → 종료 시 JSON 파싱·검증 → quotes.analysis 업데이트
- `onData("getQuote"|"listQuotes")`: DB 조회 (listQuotes = 사례 목록)
- `onAction("publish", {quoteId})`: HTML 렌더 → analyzer 세션에 "HTML→PDF shell 명령" 위임 → pdf 경로 저장 → status=published
- `runWorker(plugin, import.meta.url)` 엔트리 필수

### 3.3 Analyzer Agent (managed)
- adapterType `claude_local`, instructions = 견적 단가산정 운영기준(번들 md) + JSON 출력 계약
- 웹리서치: 에이전트 자체 browse 도구 + 필요시 worker가 `ctx.http.fetch` 보조
- **출력 JSON 계약** (worker가 schema 검증):
```json
{
  "standardItems": [{ "no":1, "category":"기획/설계", "item":"...", "scopeBasis":"...", "evidence":"...", "standardPrice": 2500000 }],
  "discounts": [{ "type":"PWA/비네이티브 조정", "desc":"...", "adjust": -3000000 }],
  "pricing": { "standardSupply": 48200000, "proposedSupply": 40000000, "vat": 4000000, "total": 44000000, "vatMode": "별도" },
  "risks": [{ "level":"high|med|low", "title":"...", "detail":"...", "mitigation":"..." }],
  "research": [{ "source":"위시켓/크몽 등", "url":"...", "insight":"...", "priceRange":"..." }],
  "scope": { "included": ["..."], "excluded": ["..."], "assumptions": ["..."], "externalCosts": ["..."] },
  "cases": [{ "quoteId":"...", "client":"...", "amount": 0, "similarity":"..." }]
}
```

### 3.4 UI (`src/ui/app.tsx`)
- 멀티스텝 위저드 (컴포넌트 내부 state). React + SDK hooks.
- Step1 입력폼 → `createQuote` → Step2 `triggerAnalysis` + `usePluginStream`로 진행 표시 → Step3 미리보기(`getQuote`: HTML iframe/srcDoc + 리스크 카드 + 사례 목록) → Step4 발행(`publish`) + PDF 다운로드 링크
- `useHostNavigation` 사용

### 3.5 HTML 템플릿 (`src/template/quote.html.ts`)
- 기존 A4 템플릿(generated/quotes/*.html) 기반, **엑셀급 정밀화**: tabular-nums, 정확 컬럼폭, @page A4, Pretendard, 섹션(개요/범위/표준산정/할인/금액/전제·제외/공급자)
- 입력 = analysis JSON. 함수 `renderQuoteHtml(quote, analysis): string`
- 공급자 고정: (주)비브라이트코드 / 김대환 / 111-87-03249 / 강서구 마곡동 800-3 우성에스비2차 1005호 / 010-6622-5361 (instanceConfig로 덮어쓰기 가능)

### 3.6 Plugin DB (`migrations/001_init.sql`)
- `quotes`: id, company_id, client_name, requirements(text), work_scope(text), expected_price(bigint), status('draft'|'analyzing'|'analyzed'|'published'), analysis(jsonb), html(text), pdf_path(text), created_at, updated_at
- `reference_rates`: category, standard_price, note (단가운영기준 ABADC seed)

## 4. 데이터 흐름
입력 → createQuote(draft) → triggerAnalysis(세션 스트리밍) → analysis JSON 저장 → 미리보기 HTML 렌더 → publish(PDF+status) → 사례로 재사용(listQuotes)

## 5. 에러 처리
- analyzer JSON 파싱 실패 → status=draft 유지 + 에러 UI, 재시도 액션
- 세션 타임아웃/실패 → onEvent terminal 감지 + 에러 표면화
- PDF shell 실패 → HTML은 유효, pdf_path=null + 경고(미리보기/프린트 대체)
- 웹리서치 실패 → 내부 기준표만으로 산정(research=[], 경고)

## 6. 테스트
- worker: createQuote/listQuotes DB CRUD, JSON schema 검증, renderQuoteHtml 스냅샷
- analysis JSON 계약 검증 단위테스트
- UI: 위저드 스텝 전이 (선택)
- 설치 스모크: `paperclipai plugin install <path>` → UI 페이지 로드 + draft 생성

## 7. 설치 (사용자가 직접)
- `paperclipai plugin init quote-issuer` (외부 디렉토리, 예: `~/dev/paperclip-plugins/quote-issuer`)
- 구현 후 `pnpm build` → `dist/worker.js` + `dist/ui/`
- `paperclipai plugin install <path>` → migration 자동 + UI 등록
- analyzer 에이전트는 설치 회사에 reconcile

## 8. v1 범위
전체 파이프라인 (입력→분석→리서치→미리보기→HTML/PDF→DB). 사례 추천은 listQuotes 기반 단순 매칭으로 시작.

## 미해결/주의
- analyzer 세션의 JSON 신뢰성: 프롬프트에 schema 강제 + worker 검증·재시도. (Paperclip은 structured-output 강제 도구 없음 → 프롬프트+파싱 방어)
- 웹리서치 품질은 에이전트 browse 도구 가용성에 의존(claude_local + Chrome).

## 검증 결과 — 확정 API/보정 (2026-06-03 SDK 소스 검증)

**DB (중요 보정):**
- migration .sql 은 **fully-qualified 스키마명** 필수: `plugin_<slug>_<hash>.<table>`. hash = `sha256(manifest.id).slice(0,10)` (derivePluginDatabaseNamespace, server/src/services/plugin-database.ts:31). bare 테이블명 금지(host 검증기 거부). 런타임 쿼리는 `${ctx.db.namespace}.<table>` 사용.
- 금지: TRIGGER/FUNCTION/EXTENSION/GRANT/DROP/TRUNCATE/DELETE/SECURITY DEFINER. 컬럼변경은 `ADD COLUMN IF NOT EXISTS` 누적만. updated_at 자동갱신 트리거 불가 → 앱레벨로 set.
- `ctx.db.query<T>(sql, params[])`, `ctx.db.execute(sql, params[])→{rowCount}`. coreReadTables = read-only JOIN via `public.<table>`. core write는 ctx.issues 등 전용.
- capabilities: `database.namespace.migrate/read/write`.

**UI↔worker = bridge RPC (apiRoutes 아님):**
- worker: `ctx.data.register(key, (params)=>Promise)`, `ctx.actions.register(key, (params,{actor})=>Promise)`, `ctx.streams.open/emit/close(channel)`.
- UI: `usePluginData(key,params)→{data,loading,error,refresh()}`, `usePluginAction(key)→(params)=>Promise`, `usePluginStream(channel,{companyId})→{events,lastEvent,connecting,connected,error,close()}`. page 컴포넌트 prop = `PluginPageProps{context: PluginHostContext{companyId,companyPrefix,...}}`. `useHostNavigation/useHostLocation/usePluginToast`.
- apiRoutes(onApiRequest) 는 외부/agent REST 용 — v1 위저드엔 불필요(에이전트가 견적 트리거하게 할 때 추가).

**Agent sessions (분석):**
- manifest.agents: `[{agentKey, displayName, role, adapterType:"claude_local", adapterPreference:["claude_local","codex_local"], status:"idle", instructions:{content|files}}]`. status는 **idle**(paused면 invoke 막힘).
- `ctx.agents.managed.reconcile(agentKey, companyId)→{agentId,status}` (agentId null 가드 필수). `ctx.agents.sessions.create(agentId, companyId, {taskKey,reason})→{sessionId}`. `ctx.agents.sessions.sendMessage(sessionId, companyId, {prompt, reason, onEvent})→{runId}` (fire-and-stream).
- onEvent: `{eventType:"chunk"|"status"|"done"|"error", stream, message}`. 답변 = chunk 누적(`stream!=="stderr" && message`). **done/error = 종료** → Promise 로 감싸 resolve/reject. taskKey 유니크.
- capabilities: `agents.managed, agents.read, agent.sessions.create/list/send/close`.

**http/config/files/PDF:**
- `ctx.http.fetch(url, init)` (cap `http.outbound`) — 웹리서치. 또는 analyzer 에이전트 자체 browse.
- `ctx.config.get()→Record` — instanceConfigSchema(JSON Schema)로 공급자 정보 운영자 설정.
- HTML: worker가 문자열 렌더 → `quotes.html` 컬럼 저장(+선택 `ctx.localFolders.writeTextAtomic`, cap `local.folders`).
- **PDF**: SDK API 0. analyzer 에이전트 shell 위임(chrome --headless). worker는 fork된 Node(샌드박스 없음, onShutdown 10s) — PDF를 worker child_process로 직접 하면 바이너리 미보장+추적밖이라 비권장.

**빌드/설치:**
- `paperclipai plugin init <packageName>` → package.json/tsconfig/esbuild.config.mjs/src/{manifest.ts,worker.ts,ui/index.tsx}/migrations 등. 외부 dir이면 SDK/shared를 tgz pack → **pnpm install 선행 필수**.
- 빌드 `node ./esbuild.config.mjs` → **dist/{worker.js, manifest.js, ui/index.js} 3번들**. worker.ts 끝 `export default plugin` + `runWorker(plugin, import.meta.url)` 필수.
- install `paperclipai plugin install <abs-path>` (instance-admin) — **in-place, 빌드 안 함** → 사전 빌드 필수. manifest.database 있으면 migration 자동. package.json `files`에 `migrations` 포함. `paperclipPlugin` 블록 유지.

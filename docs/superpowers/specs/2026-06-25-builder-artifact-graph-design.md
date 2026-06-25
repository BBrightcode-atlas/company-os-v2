# Builder Knowledge-Base Graph — 설계 문서 (Design Spec)

- 작성일: 2026-06-25
- 대상 플러그인: `bbr-plugins/builder` (`paperclip-plugin-builder`, BBR 전용)
- 상태: Draft (user review 대기)
- 작성 근거: 코드 직접 검증(7-agent grounding `wf_90cfdc2d-ee1`, 3-lens 적대적 리뷰 `wf_8c12ed72-f2e`)

---

## 1. 목적(Purpose) & 문제(Problem)

### 1.1 #1 목적 — 산출물 생성용 지식베이스(Knowledge Base)

Blueprint "그래프" 탭(이하 **그래프**)의 **가장 큰 목적은, 산출물을 만들기 위한 지식베이스가 되는 것**이다.

- 그래프가 **소유·관리**하는 것 = **입력 자료(다종 source materials)의 연결된 지식베이스.** 다양한 요구사항 문서·기획서·figma·참조 문서 등이 들어오고, 서로 연결되어 읽기 좋은 형태로 정리된다.
- 그래프가 **소유하지 않는 것 = 산출물(deliverables).** 산출물은 **명시성(explicitness)** 이 필요해 **`project_documents`(= `deliverable.*` document slot)** 로 별도 존재하며 **산출물 탭에서 관리**한다. 그래프는 산출물을 **읽기전용 참조 노드**로 보여줄 뿐, 편집/관리하지 않는다.
- 사용 루프: **다종 자료 → 정규화·연결(지식베이스) → 거기서 읽어 산출물 생성 → 산출물은 project_documents에 명시적으로 적재.** 그래프는 이 지식베이스이자 생성 근거이고, derive 링크로 추적성을 부수적으로 제공한다.

### 1.2 사용자 3관점

1. **입력 정규화**: 여러 포맷 파일을 분석해 읽기 편한 형태(md / csv / html 등)로 변환, 이후 산발적 추가 등록.
2. **연결(Connect)**: 자료끼리 + 자료↔산출물을 다 연결해서 본다. (지식베이스의 핵심 = 연결)
3. **생성(Generate)**: 지식베이스에서 읽어 산출물을 뽑아낸다(산출물은 project_documents로 적재).

### 1.3 현재 실태와 갭 (코드 검증)

| 관점 | 현재 실태 (file:line 근거) | 판정 |
| --- | --- | --- |
| ① 다형 정규화 | `ui/parse.ts` `extractDocx/Pptx/Pdf/Xlsx`가 **모든 포맷을 단일 `body:string`으로 평탄화**. md(자료 정리본) 하나. csv/html 산출 없음 | ⚠️ md만 |
| ① 산발 추가등록 | `register-source-document` fingerprint 누적 ✔. 단 추가 시 `standardPlan/screenPlan=null` 전체 무효화 | ⚠️ 되나 전체 재생성 |
| ② 연결(지식베이스) | **자료↔자료 연결 전무.** notion intake가 `externalLinks/figmaLinks/pageIds`를 `SourceIntakeResult.metadata`에 캡처(notion.ts:721-730)하지만 register 핸들러가 **버림**(worker.ts:2372-2385, `SourceMaterial`에 metadata 필드 없음 contract.ts:463-493). **지식베이스의 핵심인 연결 데이터가 들어왔다 사라짐** | ❌ 전무 + 손실 |
| ③ 읽어 생성 | `run-standard-plan`/`run-screens`가 **full `state.sources` 통째**(12k/48k cap)로 생성, 산출물은 `deliverable.*` slot에 적재 ✔. 단 비선택·추적 약함. derive 잠재필드 존재(`sourceRefs` 등) | ⚠️ 있으나 비선택 |

**진단**: ② "자료끼리 연결"이 지식베이스의 핵심인데 **현재 전무이며, 들어온 링크 데이터를 등록 시 버린다.** 이것이 #1 목적의 최대 갭이다.

---

## 2. 방향 결정(Decision)

### 2.1 그래프 = 자료 지식베이스(관리) + 산출물 참조(읽기전용)

| | Native LLM Wiki (`plugin-llm-wiki`) | Builder Graph (이 spec) |
| --- | --- | --- |
| 정체 | 회사 전역 distill 지식 위키 | **프로젝트 자료 지식베이스 + 산출물 참조** |
| 노드 | LLM distill 요약 페이지 | 자료=verbatim 관리 노드 / 산출물=project_documents 참조 |
| 연결 | LLM 추론 backlink | **자료 실제 링크(notion/figma/외부) + derive ref** |
| 결정성 | 비결정 | **결정적**(state 파생, drift 0) |
| 무손실 | 요약(원본 raw/에만) | **자료=원본 보존** |
| 역할 | 보조(후속 슬라이스, optional) | **primary — 산출물 생성 지식베이스** |

**결정**:
- **그래프 = 자료 지식베이스 primary.** 자료를 정규화·연결해 소유/관리.
- **산출물 = `project_documents`(deliverable.* slot)에서 관리**(명시성). 그래프엔 **읽기전용 참조 노드**로만 등장(클릭 시 산출물 탭/슬롯으로 이동, 편집은 거기서).
- **Native LLM Wiki = 보조**(회사 전역 Q&A grounding 원할 때만, 후속 슬라이스, 정본 무손실).

### 2.2 OSS 재사용(바닥부터 X)

- **그래프 엔진**: `@xyflow/react`(React Flow) + `@dagrejs/dagre` — **이미 builder 의존성, `wireframe/ui/index.tsx` `AllPagesView`("All Pages" 탭)에서 풀 노드그래프로 가동 중**(dagre LR 레이아웃 — `userMovedRef` false일 때만 재계산, 커스텀 `nodeTypes`, SmoothStep 엣지, Background/Controls, MiniMap top-right, `ensureReactFlowStyles` 런타임 CSS). → **RF+dagre 코드 패턴 복제**. 컨테이너 CSS는 별도(§3.7).
- **모델 시맨틱**: StrictDoc/Doorstop 추적성(typed 관계: parent-child/derives-from/references) **개념 차용**(Python 독립앱이라 임베드 불가, 참고용).
- **wiki 계열**(OpenKB/IWE/OKF = Karpathy 비전)은 이미 `plugin-llm-wiki`로 in-platform. 신규 도입 X.

### 2.3 저장 substrate

검증(V1): blueprint는 **DB 테이블 0**, `ctx.state` scoped JSON blob(`cos-blueprint-state`)만 사용(wireframe만 DB namespace `plugin_wireframes_a96aea0e66`).

**결정**:
- 그래프 = `buildGraphFromState(state): BlueprintGraph` **순수 함수 파생**(저장 안 함, 매 조회 재계산, drift 0). UI는 신규 worker provider 없이 기존 `DATA.overview`의 `overview.state`에서 호출.
- **단, 자료↔자료 링크는 파생만으로 안 됨** — 현재 버려지므로(V2) `SourceMaterial`에 `links` 필드를 추가해 **영속**해야 한다(§3.5, MVP 포함). 즉 MVP는 "기존 state 파생 + `SourceMaterial.links` 신규 영속".
- 신규 DB 테이블 없음. 규모 커지면 그때 wireframe 패턴(`plugin_builder_<hash>.*` + migration)으로 승격(YAGNI).

---

## 3. 아키텍처(Architecture)

### 3.1 지식베이스 허브

```
[요구사항.docx]──link──[기획서.pdf]          ┌ project_documents (산출물 탭, 관리) ┐
   │                      │                  │                                     │
[figma:디자인]──┐    ┌────┘   [참조:경쟁사]   │  PRD · Schema · API · Screen ...     │
   │            ▼    ▼          │            └──────────────▲──────────────────────┘
   └─────────▶ ( 자료 지식베이스 )───── 생성(read) ─────────┘  derive(읽기전용 참조)
        자료끼리 link + 자료→산출물 derive 참조
```

- **관리 대상** = 자료 지식베이스(좌). 자료끼리 link로 연결.
- **참조 대상** = 산출물(우, project_documents). 그래프는 derive 링크로 가리키기만.
- 생성: 지식베이스(자료 부분집합) 읽어 산출물 생성 → project_documents 적재 → 그래프에 derive 참조로 반영.

### 3.2 노드 모델(GraphNode)

```ts
type GraphNodeKind =
  | "source"        // 자료. 그래프가 관리하는 지식베이스 노드.
  | "deliverable";  // 산출물. project_documents(deliverable.* slot) 읽기전용 참조.

// Slice 1(MVP) 가용 포맷: md | text | url | figma | notion (body 현재 평탄화 text/md).
// csv | html 은 Slice 2(다형 정규화)에서 parse.ts가 구조화 body 산출 시 추가.
type GraphNodeFormat = "md" | "text" | "url" | "figma" | "notion" | "csv" | "html";

type GraphNode = {
  id: string;                  // source: source.id | deliverable: slotKey 또는 code
  kind: GraphNodeKind;
  subtype: string;             // source: external-plan/reference/... | deliverable: prd/schema/api/screen/...
  title: string;
  format: GraphNodeFormat;
  bodyRef:                     // 본문 위치 (복제 X)
    | { kind: "source"; sourceId: string }          // 자료
    | { kind: "slot"; slotKey: string };            // 산출물 = project_documents slot 참조
  managedBy: "graph" | "project_documents";         // source→graph, deliverable→project_documents
  status: "draft" | "ready" | "approved";
  updatedAt: string;
};
```

- **source 노드** = 그래프 관리(`managedBy:"graph"`). = 입력 자료 지식베이스.
- **deliverable 노드** = `project_documents` 참조(`managedBy:"project_documents"`). 클릭 → 산출물 탭/슬롯으로 이동. **그래프에서 편집 불가.**

> **파이프라인 명확화(참고)**: `sources → 자료 정리본(deliverable.requirement_inventory) → standardPlan(= **산출물 생성용 분석 모델**) → 산출물(deliverable.* slot, project_documents)`. 즉 deliverable 노드(schema/api/screen/FR)는 **standardPlan/screenPlan(분석 모델)에서 존재가 파생**되고, **본문 정본은 project_documents slot**(`write-standard-plan-docs` 실행 후 채워짐). standardPlan만 있고 docs 미작성이면 노드는 보이되 클릭 시 산출물 탭 슬롯이 빌 수 있음(정상).

### 3.3 엣지 모델(GraphEdge)

```ts
type GraphEdgeType =
  | "links-to"       // 자료↔자료: notion external/figma 링크
  | "child-of"       // 자료↔자료: notion 부모-자식 페이지 계층
  | "derives-from"   // 산출물 ← 자료 (생성 추적)
  | "references"     // 산출물 ↔ 산출물 (screen→api, screen→schema, api→schema)
  | "depends-on"     // 산출물 순서 의존 (OUTPUT_INVENTORY_TARGETS.dependsOn)
  | "manual";        // 사용자가 그래프에서 직접 연결 (후속)

type GraphEdge = {
  id: string; from: string; to: string;
  type: GraphEdgeType;
  origin: "derived" | "stored" | "manual";  // links-to/child-of=stored(SourceMaterial.links), 나머지=derived
  evidence?: string;
};

type BlueprintGraph = { nodes: GraphNode[]; edges: GraphEdge[] };
```

### 3.4 엣지 추출 (잠재 ref/링크 → 1급 엣지)

| 엣지 | 원천 (file 근거) | origin | Slice |
| --- | --- | --- | --- |
| 자료↔자료 `links-to`/`child-of` | `SourceMaterial.links`(신규) — notion `childUrls`/parent-child, `externalLinks`/`figmaLinks`. **현재 등록 시 버려짐(V2), MVP에서 영속화** | stored | **1(MVP)** |
| 산출물→자료 `derives-from` | `RequirementInventoryItem.sourceRefs{sourceId,evidenceExcerpt}`(type contract.ts:770-778), `RequirementInventoryDeliverableUnit.sourceItemIds/sourceRefs`(type 781-791; 생성 ~2515-2529), `FunctionalRequirement.sourceInventoryItemIds`(604-610) | derived | **1(MVP)** |
| 산출물→산출물 `references` | `api.schemas`, **`ScreenDefinition.apis: string[]` / `.schemas: string[]`**(contract.ts:596-598 — ⚠️ `apiRefs/schemaRefs` 아님, 그건 문서 metadata 명칭), `schema.sourceRequirementCodes` | derived | **1(MVP)** |
| 산출물 `depends-on` | `OUTPUT_INVENTORY_TARGETS.dependsOn` | derived | **1(MVP)** |

### 3.5 자료↔자료 링크 영속화 (MVP 핵심 — Slice1+2 병합)

지식베이스의 #1 가치 = 자료끼리 연결. 현재 버려지는(V2) 링크를 살린다. **단 워크플로우별 가용 데이터가 다름**(seam S2):

| 워크플로우 | 현재 가용 링크 데이터 | MVP 비용 |
| --- | --- | --- |
| notion | `metadata.{externalLinks, figmaLinks, pageIds, pageUrls}` 즉시 가용(버려지는 중) | **싸다 — 읽어서 영속만** |
| notion 부모-자식(child-of) | `childUrls`가 crawl 큐에만 쓰이고 parent URL 폐기 | crawl 루프에 `{parentUrl, childUrl}` 기록 추가 필요 |
| url | `extractUrlText`가 href까지 strip → **링크 0** | href 보존하려면 추출 로직 변경 |
| figma | 노드 구조 텍스트만, **링크 데이터 0** | — |

1. `SourceMaterial`에 optional `links` 추가(seam S1: non-breaking 확인):
   ```ts
   links?: {
     external?: string[];      // 외부 링크 (links-to)
     figma?: string[];         // figma 링크 (links-to)
     notionPageIds?: string[]; // 같은 pageId의 다른 notion source 매칭용
     notionPageUrls?: string[];
     children?: string[];      // notion 부모-자식 (child-of) — crawl 변경 필요
   };
   ```
2. **MVP 핵심 = notion `links-to`**: register 핸들러가 `notion.metadata.{externalLinks,figmaLinks,pageIds,pageUrls}`를 `SourceMaterial.links`에 영속(seam S3: `source.fingerprint` 할당 직후, `withStateLock` 전 — dedup 안전).
3. `buildGraphFromState`가 `source.links`로 엣지 생성 + 같은 `url`/`notionPageId`의 다른 등록 source끼리 `links-to` 연결. 미등록 외부 링크 = 외부 leaf 노드 또는 생략(임의 fetch X).
4. **child-of(부모-자식)·url href는 MVP에서 crawl/추출 변경이 작으면 포함, 크면 Slice 2로**(플랜에서 비용 보고 결정).

### 3.6 선택적 생성 + derive 기록 (③, 후속 Slice 3)

현재 생성은 full sources 덤프(V5). 후속: 생성 액션이 선택 sourceIds 수용 + `buildSourceText`/inventory 필터 + derive 엣지 영속. **MVP 아님**(생성 파이프라인은 그대로, 그래프는 읽기/연결 먼저).

### 3.7 UI — Blueprint 내 "그래프" 탭

검증된 현재 구조(V7): Blueprint = `<aside>`(PM 채팅 380px) + `<main>`(flex-1). `<main>` 내부 = `height: calc(100dvh - 168px)` div → `grid(320px nav + minmax(0,1fr) content)`, content 패널 `min-h-0 overflow-y-auto`(blueprint/ui/index.tsx:877-879,1151-1206). 탭 = 로컬상태 `WorkspaceTab = "deliverables" | "sources"`(산출물 / 등록한 자료 pill, ui/index.tsx:1130).

**비주얼 스타일(확정)**: **구조형 RF 그래프** — 박스 노드(제목/상태) + 방향 화살표(typed 엣지), dagre 레이아웃. **자료는 kind 그룹(레인)으로 묶고 자료끼리 link 표시**(1열 나열 X), 산출물은 derive로 연결된 **읽기전용 참조 노드**. 순수 파이프라인 flowchart 아님 — **연결된 지식 웹 + 산출물 참조**. 옵시디언 force-dot도 아님(후속에 dagre↔d3-force 토글 가능, MVP 제외).

**변경(사용자 지시)**:
- `WorkspaceTab`에 `"graph"` 추가 → `[산출물 | 등록한 자료 | 그래프]`.
- "그래프" 탭 활성 시 `<main>` 내부 grid를 RF로 full-bleed 대체(320px nav 숨김). PM `<aside>`·헤더 유지.
- **컨테이너 CSS 작업 필요**: content 패널 `overflow-y-auto`→`min-h-0 flex-1`(또는 height 고정) 교체해야 RF가 `height:0` 안 됨. wireframe `AllPagesView`의 `-m-4`+측정 height 효과를 Blueprint 구조에 맞게 구현.
- 렌더 = `AllPagesView`의 RF+dagre 코드 패턴 복제. 자료 그룹 = RF group/parent 노드 또는 rank 레인.
- **노드 클릭**:
  - source 노드 → md-only 본문 peek(`Markdown.tsx`; csv/html은 pre-text, 전용 렌더러는 Slice 2) + 이웃 하이라이트.
  - deliverable 노드 → **산출물 탭으로 이동/해당 슬롯 열기**(project_documents에서 관리, 그래프 편집 X).
- 직접 이웃 하이라이트 = 클라(RF selection + in-memory edges). worker BFS impact는 후속.
- **새 route/page slot·신규 worker 엔드포인트 신설 X** → `BOARD_ROUTE_ROOTS` 무관.

데이터(MVP): 신규 provider 없음. UI는 기존 `usePluginData(DATA.overview)`의 `overview.state`(+ `SourceMaterial.links`)로 순수 함수 `buildGraphFromState(state): BlueprintGraph` 호출. 탭 활성 시 1회(폴링 X).

#### 3.7.1 UI 컴포넌트 규칙 (필수)

CLAUDE.md FE 규칙: **raw HTML 컨트롤 금지**(`<button>/<input>/<select>/<textarea>`). builder wrapper(shadcn/Base-UI) 사용.
- 탭 pill/버튼 → `Button`(`src/ui/primitives.tsx`)
- 드롭다운/필터(노드종류·엣지타입 토글) → `Select`/`SelectTrigger`/`SelectItem`(`src/ui/select.tsx`) 또는 `DropdownMenu*`(`src/ui/dropdown-menu.tsx`)
- 입력 `Input`/`Textarea`, 라벨 `Label`/`FieldLabel`, 배지/카드 `Badge`/`Card`
- RF 커스텀 노드 내부 컨트롤도 wrapper.
- 없으면 `superbuilder-mcp` 조회 → `packages/ui`/`src/ui` wrapper 추가 후 사용. RF/MiniMap/Controls 등 그래프 전용 위젯은 라이브러리 제공분(예외).
- `dangerouslySetInnerHTML`은 mermaid SVG / sanitize html peek(Slice 2)만. MVP md peek은 `Markdown.tsx`.

### 3.8 Impact (유지보수 부산물)

- **MVP**: 클라이언트 — 노드 클릭 시 in-memory edges로 직접 이웃 하이라이트(RF selection). 신규 엔드포인트 X.
- **후속(Slice 4)**: worker-side 결정적 BFS 다단계 영향 질의("이 schema 바꾸면 영향 api/screen 전부"). 필요 시 Cytoscape(MIT).

### 3.9 Wiki 보조 연동 (Optional, 후속)

검증(V6): builder worker `ctx.events.emit("source.registered", companyId, payload)` → 호스트가 `plugin.<builderId>.source.registered`로 namespace → wiki `ctx.events.on(...)` 수신. 변경: builder manifest `events.emit` cap 추가 + wiki worker `.on()` 1개(wiki는 `events.subscribe` 보유). 무손실(raw/ verbatim + distill 추가 레이어). primary 그래프와 독립, 후속에서만.

---

## 4. 슬라이스 분해(Decomposition)

### Slice 1 (MVP, 이번 플랜) — 자료 지식베이스 그래프 + 산출물 참조
**= 기존 Slice1+2 병합. 자료끼리 연결된 제대로 된 지식베이스가 첫 출시 목표.**

- **자료 링크 영속**(§3.5): `SourceMaterial.links` 필드 추가 + notion/figma/외부 링크 구조 보존(intake) + register 핸들러 영속.
- **그래프 파생**: `contract.ts`에 `buildGraphFromState(state): BlueprintGraph` 순수 함수 + 타입 export. 엣지 = `links-to`/`child-of`(stored from links) + `derives-from`/`references`/`depends-on`(derived). source=관리 노드, deliverable=project_documents 참조 노드.
- **UI**: Blueprint `[산출물 | 등록한 자료 | 그래프]` 탭, full-bleed RF+dagre(AllPagesView 패턴, 자료 kind 그룹 레인 + 자료링크). source 클릭→md peek+이웃 하이라이트, deliverable 클릭→산출물 탭 이동. wrapper 컴포넌트(§3.7.1).
- **제외**: 다형 정규화(csv/html 전용 렌더러), 선택적 생성, worker BFS, 수동 엣지, wiki — 후속.
- 검증: 헤드 브라우저 — 탭 클릭→그래프 렌더, 자료끼리 link 보임, source 클릭→peek, deliverable 클릭→산출물 탭, notion 자료 등록→자식/링크 엣지 생성(메모리 규칙: API 200 ≠ UI 동작).

### Slice 2 — 다형 정규화 (md/csv/html)
`parse.ts`/intake에 포맷별 최적 표현(xlsx→csv, html 보존) + 노드 `format`/peek 렌더러. 무손실 유지.

### Slice 3 — 선택적 생성 + derive 영속
생성 액션이 선택 sourceIds 수용 + derive 엣지 저장. 증분 반영 검토.

### Slice 4 — Impact BFS (worker)
다단계 영향 질의 엔드포인트.

### Slice 5 — 수동 엣지 / free 노드
overlay에 manual 엣지/free 노드 CRUD(RF 편집). (단 §7.2 — screen code carry-forward 선행 필요)

### Slice 6 — Wiki 보조 연동
§3.9 event-driven. 정본 무손실.

### Slice 7 — 프로젝트간 재사용 (vault 전역)
scope 경계 재설계 + 공용 library. Project Builder REUSE 연계. (별도 설계)

---

## 5. 보안(Security)

- BBR 회사 한정(`isAllowedCompany`).
- html peek sanitize(Slice 2). csv plain. MVP는 md만.
- 링크 승격은 표시·연결용, 자동 재크롤 트리거 금지. 외부 미등록 링크는 leaf 표시 또는 생략(임의 fetch X).
- Slice 6 wiki 시 Phase-5 게이트(asset/work-product metadata-only).

---

## 6. 테스트(Testing)

- 단위(vitest): `buildGraphFromState` 순수 함수 — 결정성·멱등성, `source.links`→`links-to`/`child-of` 엣지, derive 엣지(특히 `screen.apis`/`screen.schemas`), 링크 매칭(등록 source끼리 연결), 빈/부분/full state.
- 단위: notion intake가 링크 구조 보존, register 핸들러가 `SourceMaterial.links` 영속.
- UI(헤드 브라우저): 그래프 탭 full-bleed 렌더, 자료↔자료 엣지 표시, source peek, deliverable→산출물 탭 이동, 빈 그래프 graceful.
- 회귀: 산출물/등록한 자료 탭·레이아웃 불변(content 패널 CSS 교체가 기존 탭에 영향 X), 기존 생성 파이프라인 불변.

---

## 7. 리스크 & 미해결(Risks / Open Questions)

1. **링크 매칭 모호성**: notion 자식/외부 링크 URL을 "등록된 다른 source"와 매칭하는 규칙 필요(같은 url/notion pageId 기준). 미등록 링크 처리(leaf 노드 vs 생략) 결정 필요. 기존 등록분은 링크가 이미 버려졌으므로 신규 등록부터 엣지 생성(기존분은 body 재파싱 fallback 별도 검토).
2. **deliverable 노드 id 안정성 — 정정**: 단일 화면 재생성(`regenerateScreen`)은 code 강제 유지(worker.ts:2138-2139) 안정. **전체 재생성(`run-screens`→`generateScreenPlan`)은 code carry-forward 없음**(worker.ts:1789-1795), LLM code로 통째 교체 → 엣지 깨질 수 있음. **MVP는 매 조회 파생이라 항상 일관**(영향 X). 단 영속 엣지(Slice 5) 전 `generateScreenPlan`에 code carry-forward(route/index 머지) 필요.
3. **full-bleed 컨테이너 CSS**: RF는 명시적 height 조상 필요. content 패널 `overflow-y-auto`→`min-h-0 flex-1` 교체 필요(§3.7). RF 코드 재사용, CSS는 신규.
4. **ctx.state blob 크기**(V1 gap): `SourceMaterial.links`는 소량이라 무관. 대형 overlay(Slice 5) 전 SDK state 한도 확인.
5. **자료 그룹 레이아웃**: dagre는 순수 DAG 레이아웃 — 자료↔자료 무방향 링크 + 그룹 레인을 함께 두려면 RF group 노드 또는 사전 rank 지정 필요. AllPagesView는 group 안 씀 → 그룹 처리 신규.

---

## 8. 통합 인터페이스 (Integration Interface — 기존 동작 연결점)

코드 검증(seam workflow `wf_605b4a6f-972`) 기준 정확한 접점.

### 8.1 `SourceMaterial.links` 추가 (seam S1) — non-breaking
- 타입: `contract.ts:463-493`(SourceMaterial). optional `links` 추가.
- **dedup 안전**: `sourceFingerprint`(worker.ts:647-662)는 `{type,format,fileName,url,body}`만 해시 — links 미포함. 변경 0.
- 읽기 13곳(`buildSourceText` 2708-2732, `renderSourceDocument` 3724-3750, `renderSourceMaterialsMarkdown` 3919-3998, `projectSlotUpdateForSource`, `findDuplicateSourceEntry` 681-698, `normalizeState` 394-421, 생성자 2개 2222/2372, `emptyState`, `buildPmRevisionSourceContext` 등) 전부 fixed-field 접근 → links 없어도 무탈. state JSON round-trip이 links 자동 보존(마이그레이션 X).
- 선택: links를 자료 정리본/source 문서에 보이려면 `renderSourceDocument`/`renderSourceMaterialsMarkdown`에 행 추가(omission, 깨짐 아님).

### 8.2 링크 캡처 (seam S2) — notion branch
- `register-source-document` notion 분기(worker.ts:2278-2287): `fetchNotionSharedPageSource`(notion.ts:674-732) 반환 `metadata.{externalLinks,figmaLinks,pageIds,pageUrls}` 읽어 영속. `metadata`는 `Record<string,unknown>`이라 cast 필요.
- child-of: `NotionPageResult.childUrls`(notion.ts:20)가 crawl 큐(686-703)에만 쓰이고 parent 폐기 → `SourceIntakeResult`에 `childEdges:[{parentUrl,childUrl}]` 추가하는 crawl 변경 필요(MVP 비용 보고 포함/연기).
- url/figma: 링크 데이터 없음(§3.5 표).

### 8.3 register 핸들러 삽입 (seam S3)
- 삽입점: worker.ts **2388**(=`source.fingerprint = fingerprint` 직후, `withStateLock`(2392) 전). `if (intakeLinks) source.links = intakeLinks;`. **fingerprint 먼저라 dedup 불변.**
- `appendSource`(2393-2405)가 closed-over `source`를 `[source, ...state.sources]`로 씀 → 2388 mutation 반영됨.
- 선택: slot metadata에도 `sourceLinks`(importProjectSourceDocumentSlot 호출 2451-2465)에 1필드 추가 — 기존 `sourceUrl` 등과 동일 패턴.

### 8.4 `buildGraphFromState` 위치·필드 (seam S4)
- **위치 = `contract.ts` 내부** 필수: `OUTPUT_INVENTORY_TARGETS`(396)가 **export 안 됨** → 외부 파일에서 import 불가. 같은 파일이면 직접 접근.
- 확인된 필드(전부 존재): `standardPlan.{projectTitle 823, schemas[].{code 505,name 506,sourceRequirementCodes 510}, apis[].{code 523,method 524,path 525,schemas 529}, functionalRequirements[].{code 605,sourceInventoryItemIds 609}, layouts[].{code 544,name 545}}`, `screenPlan.screens[].{code, name 589, route, apis 597, schemas 596, layoutCode}`, `RequirementInventoryItem.{id,sourceRefs 781-790}`, `RequirementInventoryDeliverableUnit.{sourceItemIds,sourceRefs 792-802}`.
- **버그 주의**: `screen.title` **없음 → `screen.name`(589) 사용**(노드 라벨). `screen.apiRefs/schemaRefs` **없음 → `screen.apis`/`screen.schemas`**.
- deliverable 노드 slotKey 매핑: `PROJECT_DOCUMENT_SLOT_KEYS`(167-182) — `deliverable.prd/schema_definition/api_definition/screen_definitions/feature_files/architecture`. `RequirementInventoryItem.targetDeliverables`(OutputInventoryDeliverableSlotKey)와 정합.

### 8.5 UI 탭 + 크로스탭 (seam S5) — `blueprint/ui/index.tsx`
- `WorkspaceTab`(100): `"graph"` 추가.
- pill 컨트롤(1116-1148): 3번째 `Button`("그래프") 추가.
- content grid(1150-1244): `activeTab==="graph"`일 때 grid 대신 full-bleed `GraphView` 렌더. content 패널 `overflow-y-auto`(1206)→`min-h-0 flex-1` 교체.
- 크로스탭 nav: deliverable 노드 클릭 → `setActiveTab("deliverables")` + `setSelectedDeliverableKey(slotKey)`(상태 setter 405-406 co-located, prop drilling 불필요).
- **리스크 R1 — PM chat 검증**: `sendPmText`(579)가 `activeWorkspaceTab: activeTab`를 `ACTION.chatWithPmAgent` 백엔드로 전송. 백엔드가 `"deliverables"|"sources"`만 허용하면 `"graph"`에서 **런타임 에러**. → 백엔드 검증 확인·완화 또는 graph 탭에선 해당 필드 미전송.
- **리스크 R2 — badge count**: `activeRowsCount`(1134) 삼항이 graph 분기 없어 잘못된 수 표시 → graph 분기 추가(노드 수 또는 0).

### 8.6 RF 재사용 (seam S6) — copy-pattern
- wireframe RF 심볼(`ensureReactFlowStyles` 495, `ScreenNode` 604, `nodeTypes` 647, `layoutScreenNodes` 691, `AllPagesView` 740)은 **전부 module-local 미export** → import 불가. **신규 `blueprint/ui/BlueprintGraphView.tsx`로 패턴 복제.**
- 재사용 API: `@dagrejs/dagre`(`new dagre.graphlib.Graph()`, `rankdir:"LR"`, `dagre.layout`), `@xyflow/react`(`useNodesState/useEdgesState`, `ReactFlow`, `Background/Controls/MiniMap`) — **이미 deps(package.json 33,35)**, 신규 패키지 0. CSS는 esbuild `text` 로더로 주입.
- `ScreenNode`(iframe)는 전이 불가 → 새 `BlueprintNode`(박스+제목/상태, `Handle`+`Position` 패턴만 복제).
- **리스크**: RF CSS 중복주입(wireframe+blueprint 동시 마운트) → 모듈 boolean 대신 **DOM attribute 가드**(`data-rf-styles`) 공유.

### 8.7 생성 소비 인터페이스 (Generation Consumption — #1 목적의 종착점)

**KB는 결국 산출물 생성이 읽는 substrate다.** 구현은 Slice 3(선택적 생성)지만, KB 모델을 생성-호환으로 설계하기 위해 소비 seam을 지금 고정한다.

- **현재 생성 읽기**(V5): `run-standard-plan`/`run-screens` 액션이 `initial.sources`(full)를 `generateStandardPlan({title, sources, productBuilderBlueprintId, requirementInventory})` / `generateScreenPlan(...)`로 넘기고, 내부에서 `buildSourceText(sources: SourceMaterial[])`(contract.ts:2708-2732)가 본문을 직렬화. **선택 메커니즘 없음.**
- **KB→생성 연결 규칙(설계 고정)**:
  - KB source 노드 id = `source.id`. 그래프 선택 = `Set<source.id>`.
  - 생성 시 `state.sources.filter(s => selected.has(s.id))`를 `generateStandardPlan`/`generateScreenPlan`에 주입 + `requirementInventory` 항목도 선택 source로 필터. 즉 **생성 입력 = 그래프에서 선택한 KB 부분집합.**
  - 노드 모델이 `source.id` 기반이므로 추가 매핑 없이 정합(seam S4).
- **출력측**: 생성 결과는 기존대로 `deliverable.*` slot(project_documents)에 적재 → 그래프엔 deliverable 참조 노드 + `derives-from` 엣지로 자동 반영(읽기전용). 그래프는 산출물을 **관리 안 함**(§2.1).
- **MVP 영향**: Slice 1은 소비 wiring을 구현하지 않지만, `buildGraphFromState`의 노드 id를 `source.id`로 고정해 **Slice 3가 추가 모델 변경 없이 선택→생성 연결** 가능하게 둔다. (만약 노드 id를 source.id가 아닌 합성 키로 두면 Slice 3에서 재작업 발생 → 금지.)

---

- 본 spec user review 통과 후 `writing-plans`로 **Slice 1(MVP) 구현 플랜** 작성.

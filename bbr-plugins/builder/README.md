# Builder

BBR 전용 Paperclip 플러그인. 고객이 제공한 프로젝트 자료를 Paperclip 프로젝트(Project)에 등록하고, PM 에이전트(PM Agent)가 회사 표준 산출물을 만든 뒤, 와이어프레임(Wireframe)과 구현 Task 목록까지 이어지게 하는 통합 Builder 플러그인이다.

기존 분리 플러그인인 `cos-blueprint`, `wireframe-builder`, `product-builder`는 이 패키지 하나로 통합되었다. 운영 기준 설치 대상은 `bbr-plugins/builder` 하나다.

## 목적(Goal)

Builder의 목적은 단순 문서 생성이 아니라 프로젝트 실행 준비 상태를 만드는 것이다.

1. 고객 자료를 프로젝트(Project)의 source slot에 등록한다.
2. 등록 자료를 축소 없이 읽기 쉬운 자료 정리본(Source Material Markdown)으로 먼저 만들고, 이를 기준으로 PRD(Product Requirements Document), 기능 정의서(Feature Definition), 스키마/API/화면정의서를 고정 산출물로 만든다.
3. 화면정의서(Screen Definitions)를 기준으로 클릭 가능한 HTML 와이어프레임(HTML Wireframe)을 만든다.
4. Blueprint/Wireframe 산출물을 읽어 BuildPlan, 전체 Task 목록(Full Task List), 실제 Paperclip 이슈와 차단 관계를 만든다.
5. 여러 프로젝트를 동시에 진행할 수 있게 프로젝트별 상태와 산출물을 분리한다.

## 메뉴(Menu)

Paperclip 좌측 메뉴에는 `Builder` 섹션 아래에 다음 순서로 노출된다.

1. Blueprint
2. Wireframe
3. Project Builder

각 메뉴는 독립적으로 열 수 있지만, 표준 진행은 `Blueprint -> Wireframe -> Project Builder` 순서다.

## 전체 구조(Architecture)

Builder는 단일 worker(`src/worker.ts`)와 단일 manifest(`src/manifest.ts`) 아래에 3개 모듈을 묶는다. 세 모듈은 같은 `PluginContext`를 공유하지만 서로 직접 호출하지 않는다. 모듈 간 hand-off는 전부 **Paperclip Project document slot**으로만 일어난다. 앞 모듈이 slot을 `ready/approved`로 채우면, 뒤 모듈이 그 slot을 읽어 다음 단계를 진행한다.

```mermaid
flowchart LR
  subgraph host["Paperclip Host"]
    ui["Builder UI<br/>3 pages"]
    issues["Paperclip Issues"]
    llm["LLM Gateway<br/>vibeproxy :8317"]
  end

  subgraph worker["Builder Worker (단일 프로세스)"]
    bp["blueprint<br/>module"]
    wf["wireframe<br/>module"]
    pb["project-builder<br/>module"]
  end

  subgraph slots["Project Document Slots (hand-off 매개체)"]
    s_src["source.*"]
    s_inv["deliverable.requirement_inventory"]
    s_plan["deliverable.prd<br/>+ schema / api / ..."]
    s_scr["deliverable.screen_definitions"]
    s_wf["deliverable.wireframe_html"]
    s_build["deliverable.build_plan<br/>task_list"]
  end

  ui --> bp & wf & pb
  bp -->|LLM 호출| llm
  wf -->|LLM 호출| llm

  bp -->|write| s_src & s_inv & s_plan & s_scr
  s_inv -. read .-> pb
  s_plan -. read .-> wf
  s_scr -. read .-> wf
  wf -->|write| s_wf
  s_plan -. read .-> pb
  s_scr -. read .-> pb
  s_wf -. read .-> pb
  pb -->|write| s_build
  pb -->|create| issues
```

## 전체 흐름(Workflow)

표준 진행은 `Blueprint -> Wireframe -> Project Builder` 단방향이다. 각 모듈은 "기획 → 시각화 → 구현 착수" 한 단계씩 책임지고, 산출물을 다음 모듈이 읽을 수 있는 상태로 넘긴다.

```mermaid
flowchart LR
  subgraph BP["1. Blueprint"]
    direction LR
    B1["<b>register-source-document</b><br/>파일·URL·Figma·Notion 자료 등록·중복 제거"] --> B2["<b>set-product-builder-blueprint</b><br/>제품 유형 선택"] --> B3["<b>run-requirement-inventory</b><br/>자료 정리본 생성"] --> B4["<b>run-standard-plan</b><br/>자료 정리본 기준 PRD/계약 생성"] --> B5["<b>confirm-standard-plan</b><br/>PRD 기준선 확정 게이트"] --> B6["<b>write-standard-plan-docs</b><br/>기획 문서 slot 기록"] --> B7["<b>run-screens</b><br/>화면정의서 LLM 생성"] --> B8["<b>review / regenerate-screen</b><br/>화면 검수·재생성"] --> B9["<b>write-screen-docs</b><br/>화면정의서 slot 기록"]
  end
  subgraph WF["2. Wireframe"]
    direction LR
    W1["<b>createWireframe</b><br/>화면모델 추출"] --> W2["<b>triggerGenerate</b><br/>HTML 와이어프레임 생성"] --> W3["<b>addComment</b><br/>코멘트로 HTML 보정"] --> W4["<b>syncDeliverableSlot</b><br/>HTML slot 기록"]
  end
  subgraph PB["3. Project Builder"]
    direction LR
    P1["<b>blueprint.overview</b><br/>산출물 준비 검증"] --> P2["<b>instantiate-build(-plan)</b><br/>Task/Issue 전환·배정"]
  end
  B9 -->|"screen_definitions=ready"| W1
  W4 -->|"wireframe_html=ready"| P1
```

> 각 화살표는 게이트다. 앞 모듈 산출물이 **확정(ready)** 돼야 다음 모듈이 시작된다. 미확정이면 해당 모듈 안에서 재작업(PRD/계약 재생성 / 화면 재검수 / slot 보완)을 반복한다. 모듈별 액션·게이트 세부는 아래 표와 시퀀스 다이어그램 참고.

### 액션 설명(Action Reference)

| 모듈 | 액션(메소드) | 설명 |
| --- | --- | --- |
| Blueprint | `register-source-document` | 고객 자료 등록. 파일/일반 URL/Figma/Notion 공유페이지를 source intake workflow로 분기하고, 동일 자료는 fingerprint로 중복 제거 후 `source.*` slot에 적재 |
| Blueprint | `set-product-builder-blueprint` | 제품 유형(웹서비스 / 웹 어플리케이션) 선택. `prd` slot metadata에 기록 |
| Builder | `ensure-builder-resources` / `reset-builder-resources` | Builder 전체 관리형 에이전트/스킬/루틴/project를 설치 회사에 생성 또는 정책 재설정 |
| Blueprint | `run-requirement-inventory` | 호환 이름. 등록 자료의 추출 본문 전체를 축소 없이 자료 정리본(Source Material Markdown)으로 기록 |
| Blueprint | `run-standard-plan` | 자료 정리본과 내부 coverage index를 기준으로 PRD, 기능/스키마/API 계약 초안 생성. fire-and-forget job |
| Blueprint | `confirm-standard-plan` | PRD 기준선 확정. 화면정의서 단계 진입 게이트 해제 |
| Blueprint | `write-standard-plan-docs` | 확정된 기획서를 `support.*` + `deliverable.*` slot 문서로 기록 |
| Blueprint | `run-screens` | 확정 PRD/계약 기준 화면정의서 전체 LLM 생성. 기준선 변경 시 stale-data 취소 |
| Blueprint | `review-screen` / `regenerate-screen` | 화면별 검수 상태·코멘트 기록 / 피드백 반영해 단일 화면 LLM 재생성 |
| Blueprint | `write-screen-docs` | 화면정의서를 `screen_definitions` slot에 기록. 전체 승인 시 status=ready |
| Wireframe | `createWireframe` | Blueprint slot(화면정의서·PRD) 읽어 8섹션 화면 모델 추출, wireframe record 생성 |
| Wireframe | `triggerGenerate` | 클릭 가능한 단일 HTML 와이어프레임 생성. `generating` CAS로 중복 차단 |
| Wireframe | `addComment` | 검수 코멘트 입력 → 현재 HTML을 LLM으로 반복 보정 |
| Wireframe | `syncDeliverableSlot` | 완성 HTML을 `deliverable.wireframe_html` slot에 기록(status=ready) |
| Project Builder | `blueprint.overview` | 필수 upstream slot(requirement_inventory·prd·schema·api·screens·wireframe…) ready/approved 검증 |
| Project Builder | `instantiate-build` / `instantiate-build-plan` | BuildPlan·Task 생성 → Paperclip issue(root+task+blocked-by) 전환, 에이전트 배정. classic / workflow(agent tool) |

### Blueprint Source Intake Workflow Structure

Blueprint의 입력 자료 수집은 `src/blueprint/source-intake/` 아래 registry 중심 구조로 분리한다. 현재 Notion 공유페이지 수집이 새 구조를 사용하고, 기존 파일/일반 URL/Figma 경로도 같은 workflow id로 점진 이관할 수 있게 둔다. Notion은 `notion.site`/`notion.so`/`app.notion.com` 공유 URL을 인식하고 공개 `loadPageChunk` recordMap을 우선 사용해 root + 하위 페이지, 표, 첨부/외부 링크, Figma 링크를 Markdown에 보존한다. 산출물 생성 workflow metadata는 `src/blueprint/deliverable-workflows/` 아래 registry로 분리해 UI 작업상황 패널과 산출물별 실행 흐름을 한 곳에서 참조할 수 있게 한다.

```mermaid
flowchart LR
  UI["PromptInput + menu"] --> M{"자료 추가 메뉴"}
  M --> F["파일 첨부<br/>file_upload"]
  M --> U["URL 등록<br/>url"]
  M --> N["노션공유페이지<br/>notion_shared_page"]
  M --> G["Figma 링크<br/>figma"]
  F & U & N & G --> R["register-source-document"]
  R --> W["source-intake registry<br/>resolve workflow"]
  W --> NF["Notion crawler<br/>root + child pages"]
  W --> UF["URL/Figma/file legacy adapters<br/>incremental migration"]
  NF & UF --> S["SourceMaterial<br/>body + format + intakeWorkflow"]
  S --> DS["Project source slot<br/>source.*"]
  S --> SM["Source Material Markdown<br/>deliverable.requirement_inventory"]
```

```mermaid
sequenceDiagram
  participant UI as Blueprint UI
  participant W as blueprint worker
  participant RI as source-intake registry
  participant N as Notion public page
  participant SL as Project source slots

  UI->>W: register-source-document(format=notion, intakeWorkflow=notion_shared_page, url)
  W->>RI: resolveSourceIntakeWorkflow
  RI-->>W: notion_shared_page
  W->>N: fetch root shared page
  N-->>W: HTML / HTTP failure
  W->>N: fetch accessible child Notion links (bounded depth/page count)
  N-->>W: child HTML / failure
  W->>W: render SourceMaterial Markdown with page boundaries, URL, title, body, fetch errors
  W->>SL: import source.customer_originals
  W-->>UI: registered source + slot/documentRef
```

## 시퀀스(Sequence Diagrams)

### A. Blueprint — PRD/계약 산출물 생성 (fire-and-forget LLM job)

LLM 호출은 호스트 RPC 30초 타임아웃을 넘기므로, 액션은 `job=running`만 기록하고 즉시 반환한다. 실제 생성은 백그라운드에서 돌고 UI는 `blueprint.overview`를 폴링해 완료를 감지한다. `jobId` stale guard로 reset/재실행 후 늦게 끝난 job이 현재 상태를 덮어쓰지 못하게 막는다.

```mermaid
sequenceDiagram
  participant UI as Blueprint UI
  participant W as blueprint worker
  participant S as ctx.state (project scope)
  participant L as LLM Gateway (:8317)

  UI->>W: run-requirement-inventory(companyId, projectId)
  W->>S: readState → sources 존재 확인
  W->>S: startJob → job=running (state lock)
  W-->>UI: { started, job } 즉시 반환
  Note over W,L: 백그라운드 (RPC 타임아웃 밖)
  W->>S: 자료 정리본(Source Material Markdown) slot 기록
  W->>S: state lock + jobId 일치 시 planning baseline/screenPlan 무효화, job=null
  UI->>W: run-standard-plan(companyId, projectId, title)
  W->>S: readState → internalCoverageIndex 확인(없으면 내부 생성)
  W->>S: startJob → job=running (state lock)
  W->>L: POST /v1/messages (PRD/contract prompt)
  L-->>W: JSON (실패 시 deterministic fallback)
  W->>S: inventory item coverage 보정 후 planning baseline 저장, screenPlan 무효화, job=null
  loop 폴링
    UI->>W: blueprint.overview
    W-->>UI: state.job / planning baseline
  end
  UI->>W: confirm-standard-plan
  W->>S: planning baseline confirmedAt 설정 (화면 단계 게이트 해제)
  UI->>W: write-standard-plan-docs
  W->>W: support.* + deliverable.* slot import (pm 절차 / 화면 룰 / prd / schema / api / ...)
```

### B. Wireframe — Blueprint slot에서 HTML 생성·검수

`createWireframe`는 Blueprint가 채운 `screen_definitions` slot(필수)과 `prd` slot(선택)을 읽어 8섹션 화면 모델을 추출한다. 생성/수정은 DB의 `status='generating'` CAS(`claimGenerating`)로 중복을 막고, 진행 상황은 stream으로 흘린다.

```mermaid
sequenceDiagram
  participant UI as Wireframe UI
  participant W as wireframe worker
  participant DB as plugin DB (wireframes)
  participant SL as Project Slots
  participant L as LLM Gateway (:8317)

  UI->>W: createWireframe(projectId, title)
  W->>SL: screen_definitions slot 읽기 (필수, ready/approved)
  W->>SL: prd slot 읽기 (선택)
  W->>L: extractScreenSpec (자유형식 → 8섹션 JSON)
  W->>DB: 기존 record/comment 삭제 후 새 record insert
  W-->>UI: { id }

  UI->>W: triggerGenerate(id)
  W->>DB: claimGenerating (status<>generating일 때만 CAS)
  W-->>UI: { ok }
  Note over W,L: 백그라운드 job
  W->>L: generateHtml (spec + screenDoc + reference)
  L-->>W: HTML
  W->>DB: status=generated, html 저장
  W-->>UI: stream emit (generationChannel)

  UI->>W: addComment(id, body)
  W->>DB: user comment insert + claimGenerating
  W->>L: reviseAll (현재 HTML + 피드백)
  L-->>W: 수정 HTML + summary
  W->>DB: html 갱신 + revision comment
  UI->>W: syncDeliverableSlot(id)
  W->>SL: deliverable.wireframe_html slot import (status=ready)
```

### C. Project Builder — 산출물 readiness 게이트 → Task/Issue 생성

Project Builder는 파일 경로를 추측하지 않고 Project deliverable slot만 읽는다. 모든 필수 slot이 `ready/approved`(wireframe_html은 ready/approved)인지 게이트로 검증한 뒤에만 build를 시작한다. build는 project scope 잠금으로 같은 프로젝트의 중복 실행을 막는다.

```mermaid
sequenceDiagram
  participant UI as Project Builder UI / Agent
  participant W as project-builder worker
  participant SL as Project Slots
  participant ST as ctx.state (build-job)
  participant IS as Paperclip Issues

  UI->>W: instantiate-build / instantiate-build-plan(projectId)
  W->>SL: prd slot metadata → 제품 유형(blueprint) 확인
  W->>SL: 필수 upstream slot readiness 확인 (requirement_inventory/prd/schema/api/screens/wireframe ...)
  alt 미충족
    W-->>UI: Error (준비 안 된 slot 목록)
  else 충족
    W->>ST: beginBuildJob → running (project lock, 중복 차단)
    W->>W: blueprint 기준 task set 생성 (classic) 또는 BuildPlan 기준 5단계 (workflow)
    W->>W: 관리형 에이전트 reconcile + task별 배정
    W->>IS: root issue 생성
    loop task마다
      W->>IS: child issue 생성 (decision별 status)
    end
    W->>IS: dependsOn → blockedByIssueIds 연결
    W->>SL: build_plan / task_list slot import
    W->>ST: lastBuild 저장, build-job=null
    W-->>UI: 빌드 요약 (root issue, counts, slots)
  end
```

## 1. Blueprint

Blueprint는 실제 PM 업무 순서대로 프로젝트 자료를 분석하고 회사 표준 산출물을 만든다.

### 입력(Input)

- 직접 입력 텍스트(Text)
- URL, 예: Notion 공유 URL
- 파일(File): `.txt`, `.md`, `.docx`, `.pptx`, `.pdf`, `.xlsx`
- 여러 개의 고객 문서(Customer Documents). 10개 이상도 source slot collection으로 누적 등록 가능

### 제품 유형(Product Type)

제품 유형은 Project Builder가 아니라 Blueprint에서 선택한다. 기획 단계에서 제품 성격을 확정하는 것이 더 명확하기 때문이다.

| 값(Value) | 의미(Meaning) |
| --- | --- |
| 웹서비스(Web Service) | 공개 웹사이트, SEO/AEO/GEO, 관리자, REST API, 서비스 백엔드 중심 |
| 웹 어플리케이션(Web Application) | 로그인 후 반복 작업 중심 SPA, REST API 서버, 관리자, AI 서버 중심 |

### 주요 액션(Actions)

| 액션(Action) | 역할(Role) |
| --- | --- |
| `register-source-document` | source slot에 고객 자료 등록 |
| `set-product-builder-blueprint` | 제품 유형 선택 |
| `run-requirement-inventory` | 등록 자료를 축소 없이 자료 정리본(Source Material Markdown)으로 기록 |
| `run-standard-plan` | 자료 정리본 기준 PRD/기능/계약 산출물 초안 생성 |
| `confirm-standard-plan` | PRD 기준선 확정 |
| `write-standard-plan-docs` | 표준 산출물을 Project deliverable slot에 기록 |
| `run-screens` | 화면정의서 생성 |
| `write-screen-docs` | 화면정의서를 Project deliverable slot에 기록 |
| `review-screen` | 화면별 검수 상태/코멘트 기록 |
| `regenerate-screen` | 특정 화면정의서 재생성 |
| `reconcile-managed-agent` | Blueprint 전용 PM/계약/화면 에이전트 정합성 보정 |
| `reconcile-managed-resources` | Blueprint 전용 project/skill/routine 리소스 정합성 보정 |
| `run-managed-routine` | Blueprint 관리형 routine 실행 |
| `read-source-original` | legacy 원본 바이너리 다운로드 호환 |
| `reset` | 현재 프로젝트 Blueprint 상태 초기화 |

### Blueprint 산출물(Output)

Blueprint 산출물은 workspace export 경로가 아니라 Project document slot이 기준이다.

| Slot | 산출물(Deliverable) | 템플릿(Template) |
| --- | --- | --- |
| `support.pm_execution_procedure` | PM 업무 실행 절차(PM Execution Procedure) | `templates/standards/pm-execution-procedure.md` |
| `support.screen_definition_writing_rules` | 화면정의서 작성 룰(Screen Definition Writing Rules) | `templates/standards/screen-definition-writing-rules.md` |
| `deliverable.requirement_inventory` | 자료 정리본(Source Material Markdown) | `templates/deliverables/source-materials.md` |
| `deliverable.prd` | PRD(Product Requirements Document) | `templates/deliverables/prd.md` |
| `deliverable.feature_index` | 기능 정의서 목록(Feature Definition Index) | `templates/deliverables/feature-definition-index.md` |
| `deliverable.feature_files` | 기능별 기능 정의서(Feature Definitions) | `templates/deliverables/feature-definition.md` |
| `deliverable.schema_definition` | 스키마 정의서(Schema Definition) | `templates/deliverables/schema-definition.md` |
| `deliverable.api_definition` | API 정의서(API Definition) | `templates/deliverables/api-definition.md` |
| `deliverable.architecture` | 아키텍쳐 정의서(Architecture Definition) — 인프라·기술 스택·컴포넌트·데이터 흐름 + mermaid 시스템 도식 | `templates/deliverables/architecture-definition.md` |
| `deliverable.screen_definitions` | 화면정의서(Screen Definitions) | `templates/deliverables/screen-definition.md` |

### 작성 기준(Writing Rules)

- PRD(Product Requirements Document)는 후속 산출물 생성을 위한 실행 기준선이다.
- 자료 정리본(Source Material Markdown)은 PRD 이전에 생성되는 무손실 source baseline이며, Blueprint PM Agent가 책임지는 첫 번째 게이트다.
- 자료 정리 workflow는 전체 읽기(Full Reading) → 무손실 Markdown 정리(Lossless Markdown) → 실패/빈 본문 표시(Failure Marking) → 내부 coverage index 생성 순서를 따른다.
- PRD/기능/계약/화면정의서는 자료 정리본과 내부 coverage index를 근거로 삼는다.
- PRD(Product Requirements Document)는 사용자 문제, 대상 사용자, 성공 기준, 제품 요구사항을 다룬다.
- 기능 요구사항은 기능 정의서 목록과 기능별 기능 정의서로 분리한다.
- PM 산출물에는 기능 코드(Feature Code)를 넣지 않는다. 기능명(Feature Name)과 Project slot 문서 참조(Project Slot Document Reference)로 추적한다.
- 내용이 없는 산출물은 삭제하지 않는다. `해당 없음(N/A)`과 사유를 남긴다.
- 자료가 부족하면 추론으로 채우지 않고 Missing Inputs 또는 미확정 항목으로 남긴다.

## 2. Wireframe

Wireframe은 Blueprint가 만든 화면정의서(Screen Definitions)를 읽어 단일 HTML 와이어프레임을 만든다.

### 입력(Input)

- `deliverable.screen_definitions`
- 준비되어 있으면 `deliverable.prd`
- 필요 시 참고 문서(Reference Docs)

### 주요 액션(Actions)

| 액션(Action) | 역할(Role) |
| --- | --- |
| `createWireframe` | 프로젝트별 wireframe record 생성 |
| `triggerGenerate` | HTML 생성 시작 |
| `addComment` | 검수 코멘트와 HTML 수정 요청 |
| `updateInputs` | 입력 문서/화면 모델 수정 |
| `deleteWireframe` | wireframe record 삭제 |
| `extractScreenModel` | 자유 형식 화면정의서에서 8섹션 JSON 모델 추출 |

### 산출물(Output)

| Slot | 산출물(Deliverable) | 저장 형태(Storage) |
| --- | --- | --- |
| `deliverable.wireframe_html` | HTML 와이어프레임(HTML Wireframe) | Project document/artifact slot |

Wireframe route sidebar도 선택된 `projectId` 기준으로 현재 wireframe을 조회한다. 프로젝트 context가 없을 때만 company-wide fallback을 사용한다.

## 3. Project Builder

Project Builder는 Blueprint와 Wireframe 산출물을 읽어 실제 구현에 필요한 전체 Task 목록과 Paperclip 이슈를 만든다.

### 필수 입력(Required Inputs)

Project Builder는 파일 경로나 workspace export를 추측하지 않고 Project deliverable slot만 읽는다.

| Slot | 입력(Input) |
| --- | --- |
| `deliverable.requirement_inventory` | 자료 정리본(Source Material Markdown) |
| `deliverable.prd` | PRD(Product Requirements Document) |
| `deliverable.feature_files` | 기능별 기능 정의서(Feature Definitions) |
| `deliverable.schema_definition` | 스키마 정의서(Schema Definition) |
| `deliverable.api_definition` | API 정의서(API Definition) |
| `deliverable.screen_definitions` | 화면정의서(Screen Definitions) |
| `deliverable.wireframe_html` | HTML 와이어프레임(HTML Wireframe) |

### 산출물(Output)

| Slot | 산출물(Deliverable) | 저장 형태(Storage) |
| --- | --- | --- |
| `deliverable.build_plan` | BuildPlan | Project document slot |
| `deliverable.task_list` | 전체 Task 목록(Full Task List) | Project document slot |

Issue Graph는 별도 사용자 산출물 slot으로 노출하지 않는다. 생성된 root issue, child issue, blocked-by 관계, issueRefs는 Product Builder의 build summary/state와 각 산출물 metadata에 남는 내부 실행 기록이다.

### 빌드 방식(Build Mode)

- Classic build: 선택된 제품 유형(Product Type)과 Blueprint 산출물을 기준으로 표준 task set을 생성한다.
- Workflow build: agent/tool이 전달한 구조화 BuildPlan을 기준으로 feature별 5단계 BE -> BE QA -> FE -> FE QA -> 전체 QA 흐름을 만든다.
- Product Builder는 기획을 다시 쓰지 않는다. 앞 단계 산출물을 구현 이슈로 전환한다.

### 주요 액션(Actions)

| 액션(Action) | 역할(Role) |
| --- | --- |
| `instantiate-build` | Classic build를 실행해 BuildPlan, Task List, Paperclip issues를 생성 |
| `instantiate-build-plan` | 구조화 BuildPlan 기반 Workflow build를 실행 |

## Project document slot 기준

이 플러그인의 완료 기준은 로컬 파일 경로가 아니라 Paperclip Project document slot이다.

### Source slots

| Slot | 의미(Meaning) |
| --- | --- |
| `source.customer_originals` | 고객 원본(Customer Originals) |
| `source.internal_notes` | 내부 정리본(Internal Notes) |
| `source.references` | 참고 자료(References) |

### Slot 상태(Status)

| 상태(Status) | 의미(Meaning) |
| --- | --- |
| `empty` | slot은 있으나 아직 내용 없음 |
| `draft` | 초안 있음 |
| `ready` | 다음 단계가 읽을 수 있음 |
| `approved` | 운영자/PM이 확정함 |
| `n/a` | 해당 없음. 본문에 사유 필요 |

## 동시 프로젝트 실행(Concurrent Projects)

여러 프로젝트를 동시에 진행할 수 있게 상태를 프로젝트 단위로 분리했다.

### Blueprint

- `jobId`, `stage`, `projectId`를 job 상태에 기록한다.
- Project A와 Project B의 `run-standard-plan`, `run-screens`, `regenerate-screen`은 동시에 실행 가능하다.
- 같은 프로젝트에서 이미 running job이 있으면 중복 실행을 시작하지 않고 기존 job 상태를 반환한다.
- reset/re-run 이후 이전 background job이 늦게 끝나도 `jobId`가 다르면 현재 상태를 덮어쓰지 않는다.

### Wireframe

- `wireframe.getCurrent`는 `projectId`가 있으면 해당 프로젝트의 최신 wireframe만 반환한다.
- 같은 프로젝트의 wireframe이 `generating`이면 새 생성/삭제를 막는다.
- 다른 프로젝트의 wireframe 생성/검수는 독립적으로 진행된다.
- 프로젝트 context가 없을 때만 company-wide fallback을 사용한다.

### Project Builder

- `last-build`는 company scope가 아니라 project scope에 저장한다.
- `buildJob`도 project scope에 저장한다.
- 같은 프로젝트에서 build가 running이면 중복 build를 막는다.
- 다른 프로젝트의 build는 동시에 실행할 수 있다.

현재 lock은 일반적인 단일 plugin worker 프로세스 기준이다. 나중에 같은 plugin worker를 여러 서버/프로세스로 수평 확장하면 `ctx.state`의 CAS 또는 DB 기반 distributed lock을 추가해야 한다.

## UI 기준(UI)

- Builder 메뉴 아래 3개 페이지를 순차적으로 배치한다.
- Blueprint 화면은 재구현 전까지 빈 화면으로 둔다. source 등록/분석 조작 UI는 노출하지 않는다.
- Wireframe sidebar는 선택된 Project context를 유지한다.
- UI는 가능한 한 플러그인 공통 primitive와 shadcn 스타일 컴포넌트를 사용한다. HTML 기본 `input`, `select`를 직접 쓰는 대신 일관된 컴포넌트 표면을 우선한다.

## 템플릿(Templates)

모든 표준 템플릿은 이 패키지 내부에 있다.

```text
bbr-plugins/builder/templates/
  deliverables/
    source-materials.md
    prd.md
    feature-definition-index.md
    feature-definition.md
    schema-definition.md
    api-definition.md
    architecture-definition.md
    screen-definition.md
  standards/
    pm-execution-procedure.md
    screen-definition-writing-rules.md
  wireframe/
    wireframe-html-prompt.md
  project-builder/
    build-plan.md
    task-list.md
```

## 설치(Install)

```sh
cd bbr-plugins/builder
pnpm install
pnpm build
paperclipai plugin install /absolute/path/to/company-os-v2/bbr-plugins/builder
```

운영 기준에서는 기존 분리 패키지인 `cos-blueprint`, `wireframe-builder`, `product-builder`와 동시에 설치하지 않는다. 마이그레이션 중 동시에 설치된 경우 호스트 UI가 동일 route/sidebar를 Builder 기준으로 우선 표시하지만, 최종 설치 대상은 Builder 하나다.

관리형 리소스는 `ensure-builder-resources` 액션으로 Blueprint PM, Contract, Screen, Product Builder 계열 관리형 에이전트를 생성/정합성 보정한다. Blueprint UI는 재구현 전까지 빈 화면이므로 자동 호출 표면을 제공하지 않는다. 자료 정리본(Source Material Markdown)은 별도 분석 에이전트가 아니라 Blueprint PM Agent의 첫 번째 workflow gate로 동작한다. 기존 설치에 남아 있던 분리형 산출물 분석 에이전트는 `ensure-builder-resources` / `reset-builder-resources`에서 종료(retire)한다. 관리형 에이전트 정책은 `codex_local` + `gpt-5.5` + `modelReasoningEffort=xhigh`로 고정된다. 기존 에이전트 설정이 drift되었으면 `reset-builder-resources`로 같은 정책으로 되돌린다.

## 검증(Verification)

```sh
cd bbr-plugins/builder
pnpm typecheck
pnpm test
pnpm build
```

현재 주요 회귀 테스트는 다음을 검증한다.

- Blueprint, Wireframe, Project Builder가 단일 worker/manifest로 묶이는지
- Builder 관리형 에이전트가 고정 Codex xhigh 정책으로 선언/생성/재설정되는지
- Blueprint 자료 정리본이 PRD 이전에 생성되고 Project slot/wiki/Product Builder upstream gate에 연결되는지
- source 문서 업로드와 중복 업로드 처리
- 10개 이상 source 문서 누적 등록
- Blueprint 상태와 산출물 slot이 project-scoped인지
- legacy company state가 source slot과 매칭되는 project에만 승계되는지
- Blueprint 동시 A/B 프로젝트 job과 stale reset 방지
- Wireframe project scoping과 generating 상태 보호
- Project Builder project-scoped `lastBuild`와 중복 build guard

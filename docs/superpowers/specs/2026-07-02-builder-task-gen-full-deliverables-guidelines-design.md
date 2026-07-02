# Builder task 생성 — 전 산출물 + 역할별 필수 가이드라인 반영 (설계)

- 날짜: 2026-07-02
- 대상 플러그인: `bbr-plugins/builder` (blueprint 흐름)
- 상태: 설계 확정 대기

## 1. 배경 / 문제

현재 "Task 생성"·"이슈 생성"(`buildBlueprintProductTasks(state.prd)`)은 **PRD 객체만** 읽는다.

- 반영됨: `functionalRequirements`(기능), `schemas`(스키마), `apis`(API) — 모두 `state.prd`에 내장, feature 감지·grounding 신호로 사용.
- **반영 안 됨**: 화면정의서(`screen_definitions`/screenModel), 와이어프레임(`wireframe_html`), 아키텍처(`architecture`).
- **반영 안 됨**: 코드에 하드코딩된 내부 개발 지침(base repo 규칙, feature 기본 decision, REUSE/EXTEND/NEW/N/A, 완료 게이트, 역할별 규칙). 운영자가 화면에서 수정 불가.

목표: task/이슈 생성이 **① 모든 산출물 + ② 편집 가능한 역할별 필수 가이드라인(0순위)** 을 전부 반영.

## 2. 결정 요약

| 항목 | 결정 |
|---|---|
| 화면정의서 → task | feature별 **FE task의 items**에 관련 화면을 나열(신규 task 생성 안 함) |
| FE 시각 소스 | **Figma = 화면의 모양(정답, definitive)**. Figma 있으면 그것이 FE 소스, 와이어프레임은 **Figma 없을 때만** fallback |
| 아키텍처 → task | 기존 **platform/base task**의 description·items에 context 보강(신규 task 안 함) |
| schemas/apis | 현행 감지·grounding 유지 |
| 필수 가이드라인 | **공통 + 6역할**(orchestrator/backend/frontend/platform/ai/qa) 섹션. 각 task 본문 **맨 앞(0순위)** 에 `[공통 + 역할]` 주입 |
| 가이드라인 편집 | 설정 탭에서 섹션별 편집·저장(persist). 하드코딩 지침을 기본값으로 seed |
| 구현 순서 | A(가이드라인) + B(task 반영) 단일 spec. PR은 A→B 2개로 나눠도 됨 |

## 3. Part A — 필수 가이드라인 역할 섹션화

### 3.1 State 스키마
현재: `state.agentGuidelinesMarkdown: string` (단일).

변경:
```ts
type AgentGuidelineSectionKey =
  | "common" | "orchestrator" | "backend" | "frontend" | "platform" | "ai" | "qa";

type AgentGuidelines = Record<AgentGuidelineSectionKey, string>; // 각 섹션 markdown

// state
agentGuidelines: AgentGuidelines;
```

**하위호환 마이그레이션**: `readState`에서 legacy `agentGuidelinesMarkdown`(string) 발견 시 `{ common: <그 값>, 나머지: "" }`로 승격. 새 필드 없으면 seed 기본값(3.3)으로 초기화.

### 3.2 저장 액션
`ACTION.setAgentGuidelines` 확장:
- 입력: `{ section: AgentGuidelineSectionKey, markdown: string }` (섹션 단위) 또는 `{ guidelines: AgentGuidelines }`(전체).
- `withStateLock`으로 해당 섹션만 병합 저장.
- 반환: 갱신된 `agentGuidelines`.

### 3.3 Seed (하드코딩 지침 이관)
기본값 상수 `DEFAULT_AGENT_GUIDELINES: AgentGuidelines`를 신설. 출처:
- 공통(common): base repo(`product-builder-base`) URL/경로/branch·클론 규칙, REUSE/EXTEND/NEW/N/A 원칙, PB-BASE-001 게이트, 완료 게이트(deploy/login 검증). 출처 = `project-builder/agent/product-builder-instructions.ts`의 공통 항목.
- backend: 스키마/API 계약, drizzle(`packages/drizzle`, `core/*`, `features/*`) 재사용, feature별 BE 규칙. 출처 = `blueprint/manifest.ts` `BLUEPRINT_CONTRACT_AGENT_INSTRUCTIONS` + SKILL_MARKDOWN feature 기본 decision.
- frontend: 화면 구현, public/auth modal gate, admin UI. 출처 = SKILL_MARKDOWN online/web UI 규칙.
- platform: repo/workspace 바인딩(PB-REPO-001), Neon/Vercel/env, 배포 검증. 출처 = SKILL_MARKDOWN.
- ai: AI 서버/런타임 경계, AI job/cost guard. 출처 = manifest AI agent capabilities.
- qa: contract/build/browser E2E/배포 readiness/login/admin 검증. 출처 = SKILL_MARKDOWN 완료 조건.
- orchestrator: 범위 확정, 이슈 관리, PB-FEAT-003 scope lock, 후속 질문/승인.

원문 하드코딩은 **삭제하지 않고** seed 기본값의 출처로만 사용(에이전트 manifest instructions는 유지). 운영자가 편집하면 state 값이 우선.

### 3.4 UI (설정 탭)
`ui/index.tsx`: 단일 textarea(`draftAgentGuidelinesMarkdown`) → **7섹션 에디터**(아코디언 또는 서브탭).
- 각 섹션: 라벨(공통/오케스트레이터/백엔드/프론트엔드/플랫폼/AI/QA), Textarea, 개별 저장·reset, dirty 표시.
- `공용 UI 컴포넌트`(Textarea/Button/Accordion) 사용(HTML element 직접 금지 규칙 준수).

## 4. Part B — task/이슈에 산출물 + 가이드라인 주입

### 4.1 입력 확장
`buildBlueprintProductTasks(prd, blueprintId)` →
```ts
buildBlueprintProductTasks(prd, blueprintId, {
  screenModel?: ScreenModel,          // state.screenPlan → screenPlanToScreenModel
  architecture?: Architecture,        // prd.architecture (이미 state.prd에 존재)
})
```
호출부(`writeBlueprintTaskListDocuments`, `instantiateWorkflowIssues`)에서 `state.screenPlan`을 `screenModel`로 변환해 전달. architecture는 `prd.architecture` 그대로.

### 4.2 화면정의서 → FE task items
- 각 화면을 대상 feature에 매핑(화면 metadata의 feature 링크 또는 제목 토큰 매칭 — `domainFeaturesFromPrd`의 grounding 재사용).
- 매핑된 feature의 **FE 관련 task**(category `frontend`)의 `items`에 화면 항목 추가:
  - `화면명 — <시각소스 마커>`
  - **시각 소스 해석(정답 순서)**:
    1. `Figma` — 화면 source `format:"figma"` 존재 시. 마커 `[Figma: <레이아웃 참조>]`. **definitive**.
    2. `Wireframe` — Figma 없을 때. 마커 `[Wireframe]` + fragment 참조.
    3. `Spec` — 둘 다 없을 때. 화면 spec 텍스트만.
- 신규 task 생성 안 함. 기존 FE task가 없는 feature는 items만 축적(안전).

### 4.3 아키텍처 → platform/base context
- `architecture`(기술경계/배포/외부연동/리스크)를 platform 계열 task(category `ops`/`platform`, 예: PB-REPO-001, 배포 task)의 description·items에 context 블록으로 병합. 신규 task 없음.

### 4.4 가이드라인 0순위 주입
`buildIssueDescription(task, ...)` 및 root/parent 설명 생성 시:
- 이슈 본문 **최상단**에 주입:
  ```
  ## 필수 가이드라인 (우선순위 0)
  <common 섹션>
  <agentKeyForTask(task) → 역할 섹션>
  ```
- 그 아래에 기존 산출물 context(스키마/API/화면 등).
- 역할 매핑: `agentKeyForTask(task)` → 섹션 키(orchestrator/backend/frontend/platform/ai/qa). 매핑 없으면 common만.
- 가이드라인은 `state.agentGuidelines`에서 읽음(빈 섹션은 생략).

## 5. 데이터 흐름

```
state.agentGuidelines(0순위)
        +
state.prd (기능/스키마/API)  ──► buildBlueprintProductTasks ──► tasks
state.screenPlan (화면; Figma>Wireframe)                         │
prd.architecture (플랫폼 context)                                │
                                                                 ▼
                              buildIssueDescription: [가이드라인 0순위] + 산출물 context
                                                                 ▼
                              writeBlueprintTaskListDocuments / instantiateWorkflowIssues
```

## 6. 영향 파일

| 파일 | 변경 |
|---|---|
| `src/blueprint/contract.ts` | state schema(`agentGuidelines`), `DEFAULT_AGENT_GUIDELINES`, `buildIssueDescription`/root 설명에 가이드라인 주입, `buildProductBuilderTasks` 화면/아키텍처 반영, ACTION 입력 타입 |
| `src/blueprint/build-plan-mapper.ts` | `buildBlueprintProductTasks` 시그니처 확장(screenModel/architecture), 화면→FE items, 아키텍처→platform context |
| `src/blueprint/worker.ts` | `readState` 마이그레이션, `setAgentGuidelines` 섹션 처리, `writeBlueprintTaskListDocuments`/`instantiateWorkflowIssues`가 screenModel+architecture 전달 |
| `src/blueprint/ui/index.tsx` | 설정 탭 7섹션 에디터, draft/save/reset 섹션화 |
| (seed) | `DEFAULT_AGENT_GUIDELINES` 상수 |

## 7. 하위호환 / 안전

- legacy `agentGuidelinesMarkdown`(string) → `agentGuidelines.common` 승격. 데이터 손실 없음.
- 화면/아키텍처 없을 때: 해당 주입 skip, 기존 동작 유지.
- 신규 task 미생성(결정론적 task 집합 불변) → 이슈 수 안정.
- Figma/Wireframe 둘 다 없으면 spec 텍스트 fallback.

## 8. 테스트

- state 마이그레이션: legacy string → common 승격.
- `setAgentGuidelines`: 섹션별 저장·병합.
- seed 기본값 로드.
- 화면→FE items: Figma 있는 화면 = `[Figma]`, 없으면 `[Wireframe]`, 둘 다 없으면 spec.
- 아키텍처→platform context 병합.
- `buildIssueDescription`: 본문 최상단에 common+역할 섹션, 역할 매핑 정확.
- 회귀: 기존 task 수/구조 불변(화면/아키텍처는 items·context만 추가).

## 9. 범위 밖 (YAGNI)

- 삭제한 `instantiate-build-plan`(5단계 격리 workflow) 재도입 안 함.
- 화면별 **신규** FE 이슈 생성 안 함(items 축적만).
- 와이어프레임 전체 HTML 주입 안 함(참조/fragment만).
- `packages/shared` slot 레지스트리, product-builder 독립 플러그인 미터치.

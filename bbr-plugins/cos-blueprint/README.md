# COS Blueprint

BBR 회사 전용 Paperclip 플러그인. 내부/외부 기획 자료를 등록하고 LLM 분석을 통해 프로젝트 산출물 초안을 만든다.

핵심 목적은 "기획 자료를 읽고 화면정의서만 만드는 것"이 아니다. PM 에이전트가 기획 자료를 받아 PM 업무를 정형화하고, 순차 게이트(Sequential Gate)를 통과하면서 회사 표준 산출물 세트(표준 기획서(Standard Plan), 제품 요구사항 문서(PRD, Product Requirements Document), 스키마 정의서(Schema Definition), REST API 정의서(REST API Definition), 인터페이스 정의서(Interface Definition), 공통 레이아웃 정의서(Common Layout Definition), 화면정의서(Screen Definition))를 만든다. 화면정의서는 선행 스키마/API/레이아웃 계약을 코드로만 참조하므로 기획, 개발, QA, E2E 자동화가 같은 기준으로 움직일 수 있다.

## Plugin Boundary

- 설치 위치: `bbr-plugins/cos-blueprint`
- 플러그인 ID: `paperclip-plugin-cos-blueprint`
- 표시 이름: `COS Blueprint`
- 대상 회사: BBR 전용
- 저장 범위: Paperclip company-scoped plugin state + Project document slots
- 완료 기준: Project document slot 등록(`ready`/`approved`/`n/a`)
- 호환 저장: 선택한 project의 primary workspace가 있으면 export/검수 편의를 위해 같은 내용을 파일로도 기록
- 전용 리소스(Managed Resources): Blueprint 에이전트 팀, 프로젝트, 스킬, 루틴

## Managed Resources

LLM Wiki 공식 플러그인의 managed resource 패턴을 따른다. 플러그인은 일반 에이전트나 프로젝트를 임의로 만들지 않고, manifest에 선언한 전용 리소스를 회사별로 reconcile/reset한다.

### Agents

| 에이전트 키(Agent Key) | 표시 이름(Display Name) | 역할(Role) | 기본 상태(Default Status) | 목적(Purpose) |
| --- | --- | --- | --- | --- |
| `blueprint-pm` | Blueprint PM Agent | `pm` | `paused` | 기획 자료(Source Material) → 표준 기획서(Standard Plan), PRD 기준선 |
| `blueprint-contract` | Blueprint Contract Agent | `engineer` | `paused` | 스키마 정의서(Schema Definition), REST API 정의서(REST API Definition), 인터페이스 정의서(Interface Definition), 공통 레이아웃 정의서(Common Layout Definition) |
| `blueprint-screen` | Blueprint Screen Agent | `designer` | `paused` | 화면정의서(Screen Definition), 화면별 리뷰 피드백 반영 |

각 에이전트의 월 예산(Monthly Budget)은 기본 `0`이다. 운영자가 보드에서 상태, 예산, 어댑터, 지시문을 확인하고 조정한 뒤 실행한다.

### Project, Skills, Routines

| 구분 | 키(Key) | 목적 |
| --- | --- | --- |
| 프로젝트(Project) | `blueprint` | Blueprint 산출 작업을 추적하는 플러그인 관리 프로젝트 |
| 스킬(Skill) | `blueprint-pm-execution` | PM 실행 절차와 표준 산출물 작성 기준 |
| 스킬(Skill) | `blueprint-contract-definition` | 스키마/API/인터페이스/레이아웃 계약 작성 기준 |
| 스킬(Skill) | `blueprint-screen-definition` | 화면정의서 작성 및 리뷰 반영 기준 |
| 루틴(Routine) | `blueprint-standard-plan` | 표준 기획서(Standard Plan)와 PRD 생성 작업 |
| 루틴(Routine) | `blueprint-contract-definition` | 스키마/API/인터페이스/레이아웃 계약 생성 작업 |
| 루틴(Routine) | `blueprint-screen-definition` | 화면정의서 생성 및 리뷰 작업 |

운영자가 `reconcile-managed-resources` 액션을 실행하면 Paperclip 회사 안에 플러그인 소유 metadata를 가진 정상 리소스가 생성된다. 이 리소스들은 숨은 background worker가 아니며, 보드에서 확인 가능한 에이전트/프로젝트/스킬/루틴이다.

## Workflow

분석은 **2단계 게이트(Two-stage Gate)**로 진행한다. ①단계에서 PM 에이전트의 순차 업무 기준선과 선행 계약 산출물을 먼저 생성·확정해야 ②화면정의서 단계로 넘어간다.

1. **대상 프로젝트 선택** — 자료/산출물을 기록할 프로젝트를 고른다. 미선택 시 자료는 회사 단위 state에만 저장된다.
2. **기획 자료 등록** (내부/외부 기획, 회의록, 참고 자료)
   - 파일 업로드: `txt`, `md`, `docx`, `pptx` (브라우저에서 평문 추출 후 등록)
   - 직접 입력: 제목/유형/본문
   - 등록 시 source slot update를 만들고, 현재 구현에서는 선택 프로젝트의 `docs/cos-blueprint/sources/{slug}.md`에도 호환 기록
3. **① 표준 기획서(Standard Plan) 생성** (`run-standard-plan`) — PM 실행 절차/개요/목표/범위/기능 요구사항/비기능/스키마/API/레이아웃/리스크/전제. (일정 제외)
4. **표준 기획서(Standard Plan) 확정** (`confirm-standard-plan`) — 확정해야 화면정의서 단계가 열린다.
5. **표준 산출물 문서 산출** (`write-standard-plan-docs`) — 고정 기준 문서 2종 + 프로젝트별 기본 산출물 + 기능별 기능 정의서.
6. **② 화면정의서 전체 생성** (`run-screens`) — 확정된 표준 기획서와 스키마/API/레이아웃 정의서를 입력으로 생성. 각 화면은 `access`(public/authenticated/admin)를 가진다.
7. **화면정의서 리뷰** — 2-pane(좌: 문서, 우: 피드백)에서 화면별 검토. 피드백 코멘트(`review-screen`) → 해당 화면만 LLM 재생성(`regenerate-screen`). 승인 시 상태 `approved`.
8. **화면정의서 문서 산출** (`write-screen-docs`) — 화면별 md 기록. 작성 룰은 `_standards/` 고정 문서를 참조한다.

## What It Generates

| 단계 | 산출물 | Slot | 호환 파일 | 목적 |
| --- | --- | --- | --- | --- |
| ① | 표준 기획서(Standard Plan) | `deliverable.standard_plan` | `docs/cos-blueprint/standard-plan.md` | PM 에이전트의 후속 산출물 생성을 위한 목표, 범위, 요구사항, 고정 기준 문서 참조, 참조 계약, 리스크/전제 기준선 |
| ① | 제품 요구사항 문서(PRD, Product Requirements Document) | `deliverable.prd` | `docs/cos-blueprint/product-requirements-document.md` | 문제 정의, 대상 사용자, 성공 기준, 범위, 기능 목록, 인수 기준, 검증 방법, 다음 액션 |
| ① | 기능 정의서 목록(Feature Definition Index) | `deliverable.feature_index` | `docs/cos-blueprint/feature-definition.md` | 기능 코드를 만들지 않고 기능명과 Project slot 문서 참조로 기능 요구사항을 추적 |
| ① | 기능 정의서(Feature Definition) | `deliverable.feature_files` | `docs/cos-blueprint/features/{feature-name}.md` | 기능 1개당 1문서. 사용자/조건/흐름/예외/입출력/인수 기준 정리 |
| ① | 스키마 정의서(Schema Definition) | `deliverable.schema_definition` | `docs/cos-blueprint/schema-definition.md` | 스키마별 목적, 소유자, 필드, 검증, 관계, 인수 기준 |
| ① | REST API 정의서(REST API Definition) | `deliverable.api_definition` | `docs/cos-blueprint/api-definition.md` | API별 actor/auth/request/response/error/audit/인수 기준 |
| ① | 인터페이스 정의서(Interface Definition) | `deliverable.interface_definition` | `docs/cos-blueprint/interface-definition.md` | 스키마 정의서와 REST API 정의서 사이의 참조/추적성 요약 |
| ① | 공통 레이아웃 정의서(Common Layout Definition) | `deliverable.layout_definition` | `docs/cos-blueprint/layout-definition.md` | 화면별 반복 설명을 줄이기 위한 레이아웃 코드와 slot 정의 |
| ② | 화면별 화면정의서(Screen Definition) | `deliverable.screen_definitions` | `docs/cos-blueprint/screens/{screen-code}-{screen-name}.md` | 화면 1개당 1문서. 실제 화면 내용과 인터랙션에 집중 |

## Fixed Standards

아래 문서는 프로젝트마다 바뀌지 않는 고정 기준 문서다. 프로젝트별 산출물과 분리해 `_standards/` 아래에 기록한다.

| 산출물 | Slot | 호환 파일 | 목적 |
| --- | --- | --- | --- |
| PM 업무 실행 절차(PM Execution Procedure) | `support.pm_execution_procedure` | `docs/cos-blueprint/_standards/pm-execution-procedure.md` | PM 에이전트가 자료 수집→표준 기획→스키마/API→화면정의서까지 진행하는 고정 절차 |
| 화면정의서 작성 룰(Screen Definition Writing Rules) | `support.screen_definition_writing_rules` | `docs/cos-blueprint/_standards/screen-definition-writing-rules.md` | 화면코드, 화면 상태, 액션코드, test-id, API 참조 규칙 |

## Slot Mapping / Compatibility Files

각 산출 액션은 Project document slot을 canonical 저장소로 갱신한다. 프로젝트 primary workspace가 있으면 호환/export 레이어로 아래 파일도 쓴다.

```text
# 자료 등록
docs/cos-blueprint/sources/{slug}.md
# 고정 기준 문서 (write-standard-plan-docs에서 함께 기록)
docs/cos-blueprint/_standards/pm-execution-procedure.md
docs/cos-blueprint/_standards/screen-definition-writing-rules.md
# ① 프로젝트별 표준 산출물 (write-standard-plan-docs)
docs/cos-blueprint/standard-plan.md
docs/cos-blueprint/product-requirements-document.md
docs/cos-blueprint/feature-definition.md
docs/cos-blueprint/features/{feature-name}.md
docs/cos-blueprint/schema-definition.md
docs/cos-blueprint/api-definition.md
docs/cos-blueprint/interface-definition.md
docs/cos-blueprint/layout-definition.md
# ② 프로젝트별 화면정의서 (write-screen-docs, 후속 작업)
docs/cos-blueprint/screens/{screen-code}-{screen-name}.md
```

`projectId`가 없으면 Project document slot을 갱신하지 못하므로 company-scoped state와 생성 예정 파일 목록만 반환한다. primary workspace가 없더라도 `projectId`가 있으면 Project document slot 등록은 계속 수행한다.

## Wiki 등재 (plugin-llm-wiki)

Project document slot이 canonical 저장소다. Wiki 등재는 산출물을 프로젝트 위키 공간에 추가로 노출하는 보조 흐름이며, ①/② 패널의 **위키 등재** 버튼으로 실행한다.

- 호출 주체: **UI(브라우저 board 세션)** — worker는 board/agent 인증이 없어 다른 플러그인 apiRoute를 못 부른다.
  UI에서 wiki 플러그인 apiRoute를 same-origin 상대경로 + `credentials:"include"`로 직접 호출한다(`src/ui/wiki.ts`).
- 대상 공간: 프로젝트 → wiki space **find-or-create**. wiki엔 프로젝트→space 자동 매핑이 없다.
  slug = `normalizeWikiSlug(프로젝트명)`(ASCII), 한글 등으로 비면 `proj-{projectId8}`로 대체. displayName = 프로젝트명.
  `create-space`는 멱등이 아니므로(중복 slug → 500) **`GET /spaces` 조회 후 없을 때만 생성**한다.
- 등재 방식: 페이지당 `POST /file-as-page` (`{companyId, spaceSlug, path, title, contents}`). 같은 `path` 재등재는 **update(멱등)**.
- 페이지 경로(공간 상대, wiki 규칙: `wiki/` 시작 + `.md` 종료):

```text
wiki/blueprint/standard-plan.md
wiki/blueprint/_standards/pm-execution-procedure.md
wiki/blueprint/_standards/screen-definition-writing-rules.md
wiki/blueprint/product-requirements-document.md
wiki/blueprint/schema-definition.md
wiki/blueprint/api-definition.md
wiki/blueprint/interface-definition.md
wiki/blueprint/layout-definition.md
wiki/blueprint/screens/{screen-code}-{screen-name}.md
```

> 비용: `file-as-page`는 호출 1건당 `plugin_operation` 이슈 1건을 만든다(보드에서 숨김, done 처리). 화면 N개 등재 = 이슈 N+1건.
> apiRoute URL은 호스트가 `/api` 하위에 `/plugins/:id/api`를 mount하므로 `/api` 가 2번 들어간다.

## Data Contract

분석 결과는 아래 순서로 만들어진다. PM 에이전트 업무 흐름은 분석 결과가 아니라 `_standards/pm-execution-procedure.md` 고정 기준이다.

1. 스키마 정의(Schema Definition): `schemas`
   - 코드 예: `SCH-001`
   - 필수 항목: `code`, `name`, `description`, `fields`
   - 권장 항목: `owner`, `relations`, `acceptanceCriteria`
   - field 필수 항목: `name`, `type`, `required`, `description`
   - field 권장 항목: `validation`, `example`
2. REST API 정의(REST API Definition): `apis`
   - 코드 예: `API-001`
   - 필수 항목: `code`, `method`, `path`, `summary`, `input`, `output`, `schemas`
   - 권장 항목: `actor`, `auth`, `errors`, `auditAction`, `acceptanceCriteria`
   - method: `GET`, `POST`, `PATCH`, `PUT`, `DELETE`
   - 화면 문서는 API를 재정의하지 않고 API 코드만 참조한다.
3. 레이아웃 정의(Layout Definition): `layouts`
   - 코드 예: `COS-LAY-001`
   - 필수 항목: `code`, `name`, `description`, `slots`
   - screen은 `layoutCode`와 `layoutSlot`만 참조한다.
4. 화면정의(Screen Definition): `screens`
   - 코드 예: `COS-SCR-001`
   - 필수 항목: `code`, `name`, `description`, `layoutCode`, `layoutSlot`, `route`, `primaryTestId`, `schemas`, `apis`, `fields`, `states`, `actions`, `acceptanceCriteria`

## Screen Definition Rules

- 화면 1개는 화면정의서 1개로 작성한다.
- 화면코드는 `{AREA}-SCR-{NNN}` 형식을 사용한다.
- 공통 레이아웃은 `{AREA}-LAY-{NNN}` 문서에 먼저 정의한다.
- 각 화면은 `layoutCode`와 `layoutSlot`만 참조하고 실제 화면 내용에 집중한다.
- 사용자 동작은 `ACT-01`, 인수 기준은 `AC-01`부터 순번으로 작성한다.
- 화면 상태는 `default`, `empty`, `loading`, `error`, `permission` 기준으로 작성한다.
- `data-testid`는 화면코드와 action/ac code에서 파생한다.
  - 예: `cos-scr-001-act-01`
  - 예: `cos-scr-001-ac-01`
- 화면 이동 액션에는 대상 화면정의서 코드(`targetScreenCode`)를 적는다.
- 화면에서 사용하는 스키마/API는 선행 인터페이스 정의서의 코드를 참조한다.
- 예외, 빈 상태, 권한 오류처럼 QA가 확인해야 하는 상태는 `acceptanceCriteria`에 적는다.

## Action and Test ID Rule

액션 코드와 테스트 ID는 별도로 창의적으로 만들지 않는다. 같은 화면 코드에서 기계적으로 파생한다.

| 구분 | 코드 | test-id |
| --- | --- | --- |
| 화면 | `COS-SCR-001` | `cos-scr-001` |
| 사용자 액션 | `ACT-01` | `cos-scr-001-act-01` |
| 인수 기준 | `AC-01` | `cos-scr-001-ac-01` |

이 규칙을 쓰면 화면정의서, 구현 코드, E2E selector, QA 체크리스트가 같은 식별자를 공유한다.

## Worker Actions

| Action | 설명 |
| --- | --- |
| `save-source` | 기획 자료를 company-scoped state에 저장 (문서 미기록) |
| `register-source-document` | 기획 자료를 state에 저장하고 프로젝트 선택 시 source slot에 import한다. primary workspace가 있으면 `docs/cos-blueprint/sources/{slug}.md`에도 호환 기록. 원본 base64 동봉 시 `sources/originals/`에 바이너리 보관 |
| `run-standard-plan` | ① 저장 자료로 표준 기획서(StandardPlan) 생성. 기존 화면정의서는 stale로 무효화 |
| `confirm-standard-plan` | 표준 기획서를 확정(`confirmedAt`). 화면정의서 게이트 해제 |
| `write-standard-plan-docs` | 고정 기준 문서 2종과 프로젝트별 표준 산출물, 기능별 기능 정의서를 Project document slot에 import하고 project primary workspace에 호환 기록 |
| `run-screens` | ② 확정된 표준 기획서로 화면정의서 전체 생성. 미확정 시 거부(게이트). 전체 재생성 시 reviews 초기화 |
| `write-screen-docs` | 프로젝트별 화면정의서 md를 Project document slot에 import하고 project workspace에 호환 기록. 미확정 시 거부 |
| `review-screen` | 화면별 리뷰 — 피드백 코멘트 추가/상태(`approved`/`changes-requested`) 기록. `ScreenPlan.reviews[code]`에 저장 |
| `regenerate-screen` | 리뷰 피드백을 반영해 해당 화면 1개만 LLM 재생성. 확정 게이트 + `generatedAt` 핀 재검증, 리뷰 상태 `pending` 전환 |
| `reconcile-managed-agent` | 호환용 단일 액션. Blueprint PM Agent만 회사별 managed agent로 생성/복구 |
| `reset-managed-agent` | 호환용 단일 액션. Blueprint PM Agent의 이름, 역할, 지시문, 기본 예산 등을 manifest 기본값으로 재적용 |
| `reconcile-managed-resources` | Blueprint 에이전트 3종, 프로젝트 1종, 스킬 3종, 루틴 3종을 생성/복구 |
| `reset-managed-resources` | Blueprint managed resources 전체를 manifest 기본값으로 재적용 |
| `run-managed-routine` | 지정한 Blueprint managed routine을 실행 큐에 등록. 실행 전 전체 managed resources를 reconcile |
| `read-source-original` | 보관한 원본 바이너리를 workspace에서 읽어 base64로 반환(UI 다운로드용). 6MB 초과/부재 시 실패 반환 |
| `reset` | 저장 자료·표준 기획서·화면정의서 초기화 |

## Data Providers

| Data | 설명 |
| --- | --- |
| `overview` | 현재 company-scoped state (sources + analysis) |
| `projects` | 선택 가능한 프로젝트 목록 (`id`, `name`, `status`) |
| `managed-agent` | Blueprint PM Agent managed resource 상태(`missing`/`created`/`resolved`/`reset`) |
| `managed-resources` | Blueprint managed agents/project/skills/routines 전체 상태 |

## File Upload

업로드 파일은 **브라우저(UI)에서 평문으로 추출**해 분석에 쓴다. 원본 바이너리는 프로젝트 선택 시 별도로 base64로 동봉해 보관한다(아래 "고객 원본 문서 보관" 참조).

| 포맷 | 추출 방식 |
| --- | --- |
| `txt`, `md` | `File.text()` 그대로 |
| `docx` | jszip → `word/document.xml`, `<w:p>`를 줄바꿈으로 변환 후 태그 제거 |
| `pptx` | jszip → `ppt/slides/slideN.xml`(순서대로), `<a:p>`를 줄바꿈으로 변환 후 태그 제거 |

추출 텍스트는 등록 자료 본문이 되어 분석(①/②)에 쓰인다.

## 고객 원본 문서 보관

추출 텍스트와 별개로, **프로젝트가 선택된 경우 원본 바이너리(docx/pptx/pdf 등)를 그대로 보관**한다. 호스트는 플러그인에 바이너리 저장/스트리밍 API를 주지 않으므로(localFolders 텍스트 전용·apiRoute JSON 전용·`ctx.assets` 미구현) 다음 방식으로 처리한다:

- **저장**: 등록 시 UI가 원본을 base64로 동봉 → worker가 프로젝트 workspace `docs/cos-blueprint/sources/originals/<slug>-<id>.<ext>`에 바이너리로 기록(`assertInside` 경로방어). 이슈/asset store를 쓰지 않는다. agent가 읽고 git에 버전된다.
- **크기 한도**: `MAX_ORIGINAL_BYTES` = 6MB. UI→worker action 본문은 호스트 JSON 한도(10MB) 안에 들어가야 해서, base64 팽창 여유를 두고 제한한다. 초과 파일은 **텍스트만** 등록.
- **다운로드**: "등록된 자료" 목록의 **원본 다운로드** 버튼 → `read-source-original` 액션이 파일을 읽어 base64로 반환 → 브라우저가 Blob으로 저장. (호스트가 플러그인 파일 URL을 안 주므로 다운로드는 이 페이지에서만.)

프로젝트 미선택 시 원본은 보관하지 않는다(텍스트만 state 저장).

## LLM Runtime

분석은 Anthropic-compatible gateway를 직접 호출한다.

```bash
ANTHROPIC_BASE_URL=http://localhost:8317
ANTHROPIC_API_KEY=no-key-required
COS_BLUEPRINT_MODEL=claude-opus-4-8
```

테스트 또는 오프라인 실행에서 LLM을 끄려면:

```bash
COS_BLUEPRINT_DISABLE_LLM=true
```

이 경우 deterministic fallback 산출물을 생성한다.

LLM system guard는 JSON 전용 순수 함수 역할만 부여한다. worker는 파일시스템/도구/웹 탐색을 LLM에 맡기지 않고, user message에 포함된 기획 자료만 근거로 산출물을 만들게 한다.

## Build

```bash
cd bbr-plugins/cos-blueprint
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

## Install

빌드 후 Paperclip 인스턴스에서 local path plugin으로 설치한다.

```http
POST /api/plugins/install
Content-Type: application/json

{
  "packageName": "/absolute/path/to/company-os-v2/bbr-plugins/cos-blueprint",
  "isLocalPath": true
}
```

## Verification

```bash
pnpm typecheck
pnpm test
pnpm build
```

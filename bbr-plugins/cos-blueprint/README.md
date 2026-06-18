# COS Blueprint

BBR 회사 전용 Paperclip 플러그인. 내부/외부 기획 자료를 등록하고 LLM 분석을 통해 프로젝트 산출물 초안을 만든다.

핵심 목적은 "기획 자료를 읽고 화면정의서만 만드는 것"이 아니다. 화면정의서가 나오기 전에 필요한 스키마, API 인터페이스, 공통 레이아웃을 먼저 정리하고, 각 화면 문서는 그 선행 계약을 참조하게 만드는 것이다. 이렇게 해야 기획, 개발, QA, E2E 자동화가 같은 코드를 기준으로 움직일 수 있다.

## Plugin Boundary

- 설치 위치: `bbr-plugins/cos-blueprint`
- 플러그인 ID: `paperclip-plugin-cos-blueprint`
- 표시 이름: `COS Blueprint`
- 대상 회사: BBR 전용
- 저장 범위: Paperclip company-scoped plugin state
- 문서 반영 위치: 선택한 project의 primary workspace

## Workflow

분석은 **2단계 게이트**로 진행한다. 표준 기획서를 먼저 생성·확정해야 화면정의서 단계로 넘어간다.

1. **대상 프로젝트 선택** — 자료/산출물을 기록할 프로젝트를 고른다. 미선택 시 자료는 회사 단위 state에만 저장된다.
2. **기획 자료 등록** (내부/외부 기획, 회의록, 참고 자료)
   - 파일 업로드: `txt`, `md`, `docx`, `pptx` (브라우저에서 평문 추출 후 등록)
   - 직접 입력: 제목/유형/본문
   - 등록 시 선택 프로젝트의 `docs/cos-blueprint/sources/{slug}.md`로 기록
3. **① 표준 기획서 생성** (`run-standard-plan`) — 개요/목표/범위/기능 요구사항/비기능/DB·API 개요/공통 레이아웃/리스크/전제. (일정 제외)
4. **표준 기획서 확정** (`confirm-standard-plan`) — 확정해야 화면정의서 단계가 열린다.
5. **표준 기획서 문서 산출** (`write-standard-plan-docs`) — standard-plan / interface-definition / layout-definition 3종.
6. **② 화면정의서 전체 생성** (`run-screens`) — 확정된 표준 기획서를 입력으로 생성. 각 화면은 `access`(public/authenticated/admin)를 가진다.
7. **화면정의서 리뷰** — 2-pane(좌: 문서, 우: 피드백)에서 화면별 검토. 피드백 코멘트(`review-screen`) → 해당 화면만 LLM 재생성(`regenerate-screen`). 승인 시 상태 `approved`.
8. **화면정의서 문서 산출** (`write-screen-docs`) — 작성 룰 + 화면별 md 기록.

## What It Generates

| 단계 | 산출물 | 파일 | 목적 |
| --- | --- | --- | --- |
| ① | 표준 기획서 | `docs/cos-blueprint/standard-plan.md` | 개요/목표/범위/기능요구사항/비기능/DB·API개요/레이아웃/리스크/전제 (일정 제외) |
| ① | 인터페이스 정의서 | `docs/cos-blueprint/interface-definition.md` | DB 스키마 목차와 API method/path/input/output/schema 연결 |
| ① | 공통 레이아웃 정의서 | `docs/cos-blueprint/layout-definition.md` | 화면별 반복 설명을 줄이기 위한 레이아웃 코드와 slot 정의 |
| ② | 화면정의서 작성 룰 | `docs/cos-blueprint/screen-definition-writing-rules.md` | 화면코드, 액션코드, test-id, API 참조 규칙 |
| ② | 화면별 화면정의서 | `docs/cos-blueprint/screens/{screen-code}-{screen-name}.md` | 화면 1개당 1문서. 실제 화면 내용과 인터랙션에 집중 |

## Output Documents

프로젝트 primary workspace가 있으면 단계별로 아래 파일을 쓴다.

```text
# 자료 등록
docs/cos-blueprint/sources/{slug}.md
# ① 표준 기획서 (write-standard-plan-docs)
docs/cos-blueprint/standard-plan.md
docs/cos-blueprint/interface-definition.md
docs/cos-blueprint/layout-definition.md
# ② 화면정의서 (write-screen-docs, 후속 작업)
docs/cos-blueprint/screen-definition-writing-rules.md
docs/cos-blueprint/screens/{screen-code}-{screen-name}.md
```

`projectId` 또는 primary workspace가 없으면 파일을 쓰지 않고 생성 예정 파일 목록만 반환한다.

## Wiki 등재 (plugin-llm-wiki)

프로젝트 workspace 파일은 앱 화면에 노출되지 않으므로(Paperclip에 프로젝트 문서 화면 없음), 산출물을
프로젝트 위키 공간에 페이지로 등재해 가시화한다. ①/② 패널의 **위키 등재** 버튼.

- 호출 주체: **UI(브라우저 board 세션)** — worker는 board/agent 인증이 없어 다른 플러그인 apiRoute를 못 부른다.
  UI에서 wiki 플러그인 apiRoute를 same-origin 상대경로 + `credentials:"include"`로 직접 호출한다(`src/ui/wiki.ts`).
- 대상 공간: 프로젝트 → wiki space **find-or-create**. wiki엔 프로젝트→space 자동 매핑이 없다.
  slug = `normalizeWikiSlug(프로젝트명)`(ASCII), 한글 등으로 비면 `proj-{projectId8}`로 대체. displayName = 프로젝트명.
  `create-space`는 멱등이 아니므로(중복 slug → 500) **`GET /spaces` 조회 후 없을 때만 생성**한다.
- 등재 방식: 페이지당 `POST /file-as-page` (`{companyId, spaceSlug, path, title, contents}`). 같은 `path` 재등재는 **update(멱등)**.
- 페이지 경로(공간 상대, wiki 규칙: `wiki/` 시작 + `.md` 종료):

```text
wiki/blueprint/standard-plan.md
wiki/blueprint/interface-definition.md
wiki/blueprint/layout-definition.md
wiki/blueprint/screen-definition-writing-rules.md
wiki/blueprint/screens/{screen-code}-{screen-name}.md
```

> 비용: `file-as-page`는 호출 1건당 `plugin_operation` 이슈 1건을 만든다(보드에서 숨김, done 처리). 화면 N개 등재 = 이슈 N+1건.
> apiRoute URL은 호스트가 `/api` 하위에 `/plugins/:id/api`를 mount하므로 `/api` 가 2번 들어간다.

## Data Contract

분석 결과는 아래 순서로 만들어진다.

1. `schemas`
   - 코드 예: `SCH-001`
   - 필수 항목: `code`, `name`, `description`, `fields`
   - field 필수 항목: `name`, `type`, `required`, `description`
2. `apis`
   - 코드 예: `API-001`
   - 필수 항목: `code`, `method`, `path`, `summary`, `input`, `output`, `schemas`
   - method: `GET`, `POST`, `PATCH`, `PUT`, `DELETE`
   - 화면 문서는 API를 재정의하지 않고 API 코드만 참조한다.
3. `layouts`
   - 코드 예: `COS-LAY-001`
   - 필수 항목: `code`, `name`, `description`, `slots`
   - screen은 `layoutCode`와 `layoutSlot`만 참조한다.
4. `screens`
   - 코드 예: `COS-SCR-001`
   - 필수 항목: `code`, `name`, `description`, `layoutCode`, `layoutSlot`, `route`, `primaryTestId`, `schemas`, `apis`, `fields`, `actions`, `acceptanceCriteria`

## Screen Definition Rules

- 화면 1개는 화면정의서 1개로 작성한다.
- 화면코드는 `{AREA}-SCR-{NNN}` 형식을 사용한다.
- 공통 레이아웃은 `{AREA}-LAY-{NNN}` 문서에 먼저 정의한다.
- 각 화면은 `layoutCode`와 `layoutSlot`만 참조하고 실제 화면 내용에 집중한다.
- 사용자 동작은 `ACT-01`, 인수 기준은 `AC-01`부터 순번으로 작성한다.
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
| `register-source-document` | 기획 자료를 state에 저장하고, 프로젝트 선택 시 `docs/cos-blueprint/sources/{slug}.md`로 기록. 원본 base64 동봉 시 `sources/originals/`에 바이너리 보관 |
| `run-standard-plan` | ① 저장 자료로 표준 기획서(StandardPlan) 생성. 기존 화면정의서는 stale로 무효화 |
| `confirm-standard-plan` | 표준 기획서를 확정(`confirmedAt`). 화면정의서 게이트 해제 |
| `write-standard-plan-docs` | 표준 기획서 문서 3종을 project primary workspace에 기록 |
| `run-screens` | ② 확정된 표준 기획서로 화면정의서 전체 생성. 미확정 시 거부(게이트). 전체 재생성 시 reviews 초기화 |
| `write-screen-docs` | 화면정의서 문서(작성 룰 + 화면별 md)를 project workspace에 기록. 미확정 시 거부 |
| `review-screen` | 화면별 리뷰 — 피드백 코멘트 추가/상태(`approved`/`changes-requested`) 기록. `ScreenPlan.reviews[code]`에 저장 |
| `regenerate-screen` | 리뷰 피드백을 반영해 해당 화면 1개만 LLM 재생성. 확정 게이트 + `generatedAt` 핀 재검증, 리뷰 상태 `pending` 전환 |
| `read-source-original` | 보관한 원본 바이너리를 workspace에서 읽어 base64로 반환(UI 다운로드용). 6MB 초과/부재 시 실패 반환 |
| `reset` | 저장 자료·표준 기획서·화면정의서 초기화 |

## Data Providers

| Data | 설명 |
| --- | --- |
| `overview` | 현재 company-scoped state (sources + analysis) |
| `projects` | 선택 가능한 프로젝트 목록 (`id`, `name`, `status`) |

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

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

1. 내부 기획, 외부 기획, 회의록, 참고 자료 등록
2. LLM 분석
3. DB 스키마와 API 인터페이스 목차 정의
   - 주소
   - method: `GET`, `POST`, `PATCH`, `PUT`, `DELETE`
   - 입력 파라미터 이름/타입/필수 여부
   - 출력 파라미터 이름/타입/필수 여부
4. 표준 기획서 산출
5. 화면 기획서/화면정의서 산출
6. 프로젝트 도큐먼트 업데이트

## What It Generates

| 산출물 | 파일 | 목적 |
| --- | --- | --- |
| 표준 기획서 | `docs/cos-blueprint/standard-plan.md` | 요구사항, 전제, 진행 단계를 한 문서로 정리 |
| 인터페이스 정의서 | `docs/cos-blueprint/interface-definition.md` | DB 스키마 목차와 API method/path/input/output/schema 연결 |
| 공통 레이아웃 정의서 | `docs/cos-blueprint/layout-definition.md` | 화면별 반복 설명을 줄이기 위한 레이아웃 코드와 slot 정의 |
| 화면정의서 작성 룰 | `docs/cos-blueprint/screen-definition-writing-rules.md` | 화면코드, 액션코드, test-id, API 참조 규칙 |
| 화면별 화면정의서 | `docs/cos-blueprint/screens/{screen-code}-{screen-name}.md` | 화면 1개당 1문서. 실제 화면 내용과 인터랙션에 집중 |

## Output Documents

프로젝트 primary workspace가 있으면 아래 파일을 쓴다.

```text
docs/cos-blueprint/standard-plan.md
docs/cos-blueprint/interface-definition.md
docs/cos-blueprint/layout-definition.md
docs/cos-blueprint/screen-definition-writing-rules.md
docs/cos-blueprint/screens/{screen-code}-{screen-name}.md
```

`projectId` 또는 primary workspace가 없으면 파일을 쓰지 않고 생성 예정 파일 목록만 반환한다.

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
| `save-source` | 기획 자료를 company-scoped state에 저장 |
| `run-analysis` | 저장된 자료를 LLM에 전달하고 산출물 JSON 생성 |
| `update-project-documents` | 분석 결과를 project primary workspace의 `docs/cos-blueprint/**`에 기록 |
| `reset` | 저장 자료와 분석 결과 초기화 |

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

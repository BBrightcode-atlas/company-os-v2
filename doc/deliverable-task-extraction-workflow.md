# 산출물 기반 Task 추출 워크플로우

## 1. 목적

`generated/source-intake/<project>/runs/.../*.md` 산출물과, 존재하는 경우 Figma MCP 확인 결과를 바탕으로 대상 scope의 구현 Task 목록을 생성한다.

최종 Task는 Linear 이슈 등록 전 다음 조건을 만족해야 한다.

- 산출물의 feature/schema/API/screen 정의에 부합한다.
- Figma가 존재하는 경우 Figma MCP로 직접 확인한 화면 내용을 반영한다.
- Figma가 없거나 접근할 수 없는 경우, 해당 사실을 명시하고 문서 기반으로만 Task를 작성한다.
- 구현자가 바로 착수할 수 있을 만큼 구체적이다.
- 자기비판적 품질 평가에서 9.5점 이하를 받으면 재작성한다.
- 품질 게이트를 통과한 Task만 Linear 등록 후보가 된다.

## 2. 입력 문서

다음 문서를 기준 입력으로 사용한다.

1. `implementation-readiness-review.md`
2. `feature-definition.md`
3. `schema-definition.md`
4. `api-definition.md`
5. `api-definition.openapi.yaml`
6. `figma-screens.md`
7. `screen-definition.md`
8. `*screen-definition-work/screen-workflow.md`
9. Figma MCP 직접 확인 결과, 존재하는 경우
10. 이전 리뷰 피드백

## 3. 기본 원칙

- Task는 산출물에 없는 내용을 임의로 만들지 않는다.
- 모든 Task는 최소 하나 이상의 근거를 가져야 한다.
  - `FEA-*`
  - `SCH-*`
  - `API operationId`
  - `SCREEN-*`
  - Figma frame/node reference, 존재하는 경우
- 요청된 대상 scope를 우선한다.
- 대상 scope 밖의 작업은 제외하되, 구현에 필요한 외부 dependency는 표시한다.
- 화면 Task는 Figma가 존재하고 접근 가능한 경우 Figma MCP로 실제 화면을 확인한 뒤 작성한다.
- Figma가 없거나 접근 불가한 경우, Figma 확인은 생략하고 `figma_not_available` 또는 `figma_access_unavailable` 상태를 기록한다.
- Linear 등록은 품질 평가 통과 후 별도 승인된 Task만 대상으로 한다.

## 4. Figma 사용 정책

Figma는 필수 입력이 아니라, 존재할 때 사용하는 보강 근거다.

### Figma를 사용하는 경우

다음 조건을 모두 만족하면 Figma MCP를 사용한다.

- `figma-screens.md`에 Figma URL, file key, node id, frame reference가 있다.
- Figma MCP 접근이 가능하다.
- 해당 화면이 대상 Task 생성 scope에 포함된다.

이 경우 화면 Task에는 Figma reference를 포함한다.

```markdown
- Figma: fileKey/nodeId 또는 frame name
```

### Figma를 생략하는 경우

다음 경우에는 Figma 확인을 생략한다.

- Figma 링크가 없다.
- `figma-screens.md`가 비어 있거나 화면 매핑이 없다.
- Figma MCP가 접근 권한 오류를 반환한다.
- Figma 파일은 있으나 해당 대상 화면 node를 특정할 수 없다.
- 산출물 자체가 문서 기반 화면 정의만 제공한다.

이 경우 Task에는 다음처럼 기록한다.

```markdown
- Figma: N/A
- Figma Status: figma_not_available
- 화면 근거: screen-definition.md 기준
```

또는 접근 실패라면 다음처럼 기록한다.

```markdown
- Figma: N/A
- Figma Status: figma_access_unavailable
- 화면 근거: screen-definition.md 기준
```

Figma가 없다는 이유만으로 Task를 탈락시키지 않는다. 단, Figma가 없을 때는 `screen-definition.md`, API, schema, feature 근거가 더 구체적이어야 한다.

## 5. Task 생성 단위

Builder의 Task 생성 방식에 맞춰 feature 단위로 다음 workflow를 만든다.

| Stage | 역할 | 설명 |
| --- | --- | --- |
| DATA | Backend/Data | schema, migration, model, repository, domain validation |
| BE | Backend API | REST API, service logic, permission, error handling |
| BE-QA | QA/API | API test, schema validation, permission test |
| FE | Frontend App | 대상 surface 화면, 상태, API client, interaction |
| FE-QA | QA/Frontend | 화면 상태, user action, validation, accessibility |
| FULL-QA | QA/E2E | feature end-to-end 검증 |
| INT-QA | QA/Integration | cross-feature integration 검증 |
| RELEASE | Release | smoke test, deployment readiness |

## 6. Task 추출 절차

### Step 1. Source Intake 정리

각 산출물에서 구현 근거를 추출한다.

- `feature-definition.md`
  - 기능 코드
  - 기능명
  - 사용자 가치
  - reuse/extend/new 판단
  - 관련 화면/API/schema
- `schema-definition.md`
  - entity
  - table/model
  - field
  - relation
  - constraint
  - migration 필요 여부
- `api-definition.md` / `api-definition.openapi.yaml`
  - endpoint
  - operationId
  - request/response schema
  - auth/permission
  - error case
- `screen-definition.md`
  - screen id
  - route
  - state
  - field
  - user action
  - API 연결
  - QA case
- `figma-screens.md`
  - Figma URL
  - file key
  - node id
  - frame/screen mapping
  - Figma 사용 가능 여부
- Figma MCP, 존재하고 접근 가능한 경우
  - 실제 화면 구조
  - component hierarchy
  - empty/loading/error state
  - form/input/button/action
  - navigation flow

### Step 2. Figma 가용성 판정

Task 생성 전 Figma 상태를 먼저 판정한다.

| 상태 | 의미 | 처리 |
| --- | --- | --- |
| `figma_available` | Figma 링크와 MCP 접근 가능 | Figma MCP로 직접 확인 |
| `figma_not_available` | Figma 링크 또는 매핑 없음 | 문서 기반으로 진행 |
| `figma_access_unavailable` | 링크는 있으나 권한/접근 실패 | 접근 실패 기록 후 문서 기반으로 진행 |
| `figma_node_unresolved` | 파일은 있으나 화면 node 특정 불가 | node 미확정 기록 후 문서 기반으로 진행 |

Figma 상태는 `task-quality-review.md`와 각 화면 Task의 source references에 남긴다.

### Step 3. 대상 Scope 확정

Task 생성 대상은 요청된 구현 scope로 제한한다.

포함한다.

- 대상 제품/앱의 화면
- 대상 scope의 API 연동
- 대상 scope에 필요한 backend/data 작업
- 인증/권한 dependency
- 대상 scope의 QA/E2E

제외한다.

- 범위 밖 화면/기능
- scope에 포함되지 않은 운영자/관리자 전용 기능
- 대상 scope와 직접 연결되지 않는 내부 운영 기능

단, 대상 scope 구현을 위해 필요한 범위 밖 dependency는 blocker 또는 related task로 표시한다.

### Step 4. Feature 정규화

`FEA-*`를 기준으로 기능을 정리한다.

같은 entity에 대한 조회/생성/수정/삭제 요구사항은 하나의 domain feature로 묶는다.

예시:

```text
FEA-RESOURCE-MANAGEMENT
- 리소스 상세 조회
- 리소스 생성/수정
- 첨부 파일 업로드
```

이 feature에서 다음 Task chain을 만든다.

```text
DATA -> BE -> BE-QA -> FE -> FE-QA -> FULL-QA
```

### Step 5. 화면 기반 FE Task 보강

각 대상 화면을 관련 feature에 매핑한다.

화면 Task에는 다음 항목을 포함한다.

- Screen ID
- Route
- Figma reference, 존재하는 경우
- Figma status
- 연결 Feature
- 연결 API operationId
- 연결 Schema
- 화면 상태
  - initial
  - loading
  - empty
  - error
  - success
- User Actions
- Validation
- Acceptance Criteria

추상적인 문구는 금지한다.

금지 예시:

```text
사용자가 정보를 입력하고 저장할 수 있다.
```

허용 예시:

```text
사용자가 항목 편집 화면에서 필수 이름 값을 입력하고 저장하면 updateResource operation을 호출한다. 저장 성공 시 상세 화면에 변경된 값이 표시되고, 실패 시 API error code별 메시지를 표시한다.
```

## 7. Task 작성 형식

각 Task는 다음 형식을 따른다.

```markdown
## [Task Key] Task Title

### Type
DATA | BE | BE-QA | FE | FE-QA | FULL-QA | INT-QA | RELEASE

### Source References
- Feature: FEA-*
- Schema: SCH-*
- API: operationId
- Screen: SCREEN-*
- Figma: fileKey/nodeId 또는 N/A
- Figma Status: figma_available | figma_not_available | figma_access_unavailable | figma_node_unresolved

### Description
구현자가 바로 착수할 수 있는 수준으로 작업 내용을 설명한다.

### Dependencies
- Blocked by:
- Blocks:

### Implementation Notes
- 주요 구현 기준
- permission/auth 기준
- state 처리 기준
- error 처리 기준

### Acceptance Criteria
- [ ] 검증 가능한 완료 조건
- [ ] API/schema/screen 기준과 연결된 조건
- [ ] 실패/empty/loading 상태 포함
```

## 8. 품질 평가 루프

Task 작성 후 Linear 등록 전에 자기비판적 품질 평가를 수행한다.

### 평가 기준

| 항목 | 배점 |
| --- | ---: |
| 산출물 부합성 | 2.0 |
| Feature/Schema/API/Screen 추적성 | 2.0 |
| Figma MCP 확인 반영 또는 Figma 생략 사유 명시 | 1.5 |
| 구현 구체성 | 1.5 |
| Acceptance Criteria 검증 가능성 | 1.0 |
| Dependency 명확성 | 1.0 |
| Linear 이슈 적합성 | 1.0 |
| 총점 | 10.0 |

### 감점 규칙

- Figma가 존재하고 접근 가능한데 Figma MCP 확인을 하지 않으면 통과 불가
- Figma가 없거나 접근 불가한데 그 상태를 명시하지 않으면 최대 8.5점
- `FEA/SCH/API/SCREEN` 근거가 없으면 최대 8.5점
- generic한 구현 문구만 있으면 최대 8.0점
- acceptance criteria가 검증 불가능하면 최대 8.0점
- API/schema와 불일치하면 최대 7.5점
- dependency가 불명확하면 최대 8.8점
- 대상 scope 밖의 Task가 섞이면 최대 8.5점

### 통과 기준

- 9.5점 이하: 재작성
- 9.5점 초과: Linear 등록 후보

즉, 9.5점도 재작성 대상이다.

## 9. 재작성 절차

품질 평가에서 9.5점 이하를 받은 Task는 다음 순서로 재작성한다.

1. 감점 사유를 기록한다.
2. 관련 원본 산출물을 다시 확인한다.
3. Figma가 존재하고 접근 가능한 경우 Figma MCP로 화면 근거를 다시 확인한다.
4. Figma가 없거나 접근 불가한 경우 해당 상태 기록이 충분한지 확인한다.
5. title, description, source references, acceptance criteria를 수정한다.
6. dependency를 재검토한다.
7. 다시 품질 평가를 수행한다.

이 반복은 모든 등록 후보 Task가 9.5점 초과를 받을 때까지 계속한다.

## 10. 최종 산출물

Linear 등록 전 다음 산출물을 만든다.

### `task-list.md`

사람이 검토할 전체 Task 목록.

포함 항목:

- Task Key
- Title
- Type
- Source References
- Dependencies
- Description
- Acceptance Criteria

### `task-quality-review.md`

품질 평가 결과.

포함 항목:

- Task Key
- 최초 점수
- 감점 사유
- 재작성 내역
- 최종 점수
- 통과 여부
- Figma status

### `task-list.linear.json`

Linear 등록 후보만 포함한 machine-readable 원장.

포함 항목:

- title
- description
- team
- project
- priority
- labels
- parentId
- blockedBy
- blocks
- source references
- figma status

## 11. Linear 등록 원칙

Linear 등록은 품질 게이트 통과 후에만 진행한다.

등록 전 확인한다.

- Linear team
- Linear project
- parent issue 사용 여부
- label 규칙
- priority 규칙
- dependency relation 등록 방식
- 중복 이슈 확인 방식

Linear issue title은 안정적인 Task Key를 포함한다.

예시:

```text
[PROJECT-SURFACE-FEA-001-BE] 리소스 수정 API 구현
```

Linear description에는 다음을 포함한다.

- Source References
- Figma Status
- 구현 설명
- Dependencies
- Acceptance Criteria
- 품질 평가 통과 점수

## 12. 완료 조건

Task 목록 생성 workflow는 다음 조건을 모두 만족해야 완료된다.

- 모든 대상 scope feature가 Task로 분해되었다.
- 각 Task가 산출물 근거를 가진다.
- Figma가 존재하고 접근 가능한 화면 Task는 Figma MCP 확인 결과를 반영한다.
- Figma가 없거나 접근 불가한 경우 그 상태와 생략 사유가 명시되었다.
- 모든 Task가 품질 평가에서 9.5점 초과를 받았다.
- 탈락 Task는 Linear 등록 후보에서 제외되었다.
- Linear 등록용 원장이 생성되었다.
- 실제 Linear 등록은 사용자 승인 전까지 수행하지 않는다.

# BuildPlan Template

이 템플릿은 Blueprint/Wireframe 산출물을 Product Builder가 읽은 뒤, 전체 Task 목록과 실제 Paperclip 이슈를 만들기 전에 작성하는 구조화 계획이다.

## 1. 기본 정보(Basic Information)

| 항목(Item) | 내용(Description) |
| --- | --- |
| 제품명(Product Name) | {{productName}} |
| 기준 Blueprint(Blueprint) | {{blueprintId}} |
| 기준 repo(Base Repo) | {{baseRepo}} |
| 기준 ref(Base Ref) | {{baseRef}} |
| 작성자(Owner) | Product Builder Orchestrator |
| 상태(Status) | {{status}} |

## 2. 입력 산출물(Input Deliverables)

| 산출물(Deliverable) | Slot | 상태(Status) | 문서 참조(Document Reference) |
| --- | --- | --- | --- |
| PRD(Product Requirements Document) | `deliverable.prd` | {{status}} | {{documentRef}} |
| 기능 정의서(Feature Definition) | `deliverable.feature_files` | {{status}} | {{documentRef}} |
| 스키마 정의서(Schema Definition) | `deliverable.schema_definition` | {{status}} | {{documentRef}} |
| API 정의서(API Definition) | `deliverable.api_definition` | {{status}} | {{documentRef}} |
| 공통 레이아웃 정의서(Common Layout Definition) | `deliverable.layout_definition` | {{status}} | {{documentRef}} |
| 화면정의서(Screen Definition) | `deliverable.screen_definitions` | {{status}} | {{documentRef}} |
| HTML 와이어프레임(HTML Wireframe) | `deliverable.wireframe_html` | {{status}} | {{documentRef}} |

## 3. 기능별 판정(Feature Decisions)

| 기능(Feature) | 기능 설명(Description) | 기본 판정(Default Decision) | 근거(Evidence) |
| --- | --- | --- | --- |
| {{featureName}} | {{featureDescription}} | {{featureDecision}} | {{evidence}} |

## 4. 단계별 계획(Stage Plan)

각 기능은 고정 5단계로 나눈다: BE(Backend), BE QA(Backend QA), FE(Frontend), FE QA(Frontend QA), 전체 QA(Full QA).

| 기능(Feature) | 단계(Stage) | 판정(Decision) | 재사용 근거(Reuse Ref) | 작업 항목(Items) |
| --- | --- | --- | --- | --- |
| {{featureName}} | BE(Backend) | {{decision}} | {{reuseRef}} | {{items}} |
| {{featureName}} | BE QA(Backend QA) | {{decision}} | {{reuseRef}} | {{items}} |
| {{featureName}} | FE(Frontend) | {{decision}} | {{reuseRef}} | {{items}} |
| {{featureName}} | FE QA(Frontend QA) | {{decision}} | {{reuseRef}} | {{items}} |
| {{featureName}} | 전체 QA(Full QA) | {{decision}} | {{reuseRef}} | {{items}} |

## 5. 공통 작업(Shared Work)

| 공통 작업(Shared Work) | 종류(Kind) | 판정(Decision) | 작업 항목(Items) | 의존 기능(Dependent Features) |
| --- | --- | --- | --- | --- |
| {{sharedTitle}} | {{kind}} | {{decision}} | {{items}} | {{dependentFeatures}} |

## 6. 이슈 생성 규칙(Issue Creation Rules)

- NEW/EXTEND만 실행 대상 이슈로 생성한다.
- REUSE/N/A는 완료 기록으로 남기고 downstream blocker를 만들지 않는다.
- 기능 간 stage는 서로 막지 않는다.
- 공통 작업은 필요한 기능의 FE 단계만 막을 수 있다.
- 모든 기능의 전체 QA가 끝난 뒤 통합 QA(Integration QA)를 생성한다.
- 통합 QA 이후 통합 Release를 생성한다.

## 7. 해당 없음(N/A)

| 항목(Item) | 사유(Reason) |
| --- | --- |
| {{naItem}} | {{naReason}} |

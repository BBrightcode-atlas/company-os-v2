# 표준 기획서(Standard Plan) - {{projectTitle}}

이 문서는 PM 에이전트(PM Agent)가 후속 산출물을 일관되게 만들기 위한 실행 기준선이다. PRD(Product Requirements Document)는 제품 요구사항을 다루고, 이 표준 기획서는 목표, 범위, 산출물 생성 순서, 참조 계약을 고정한다.

## 0. 문서 관리(Document Control)

| 항목(Item) | 내용(Description) |
| --- | --- |
| 프로젝트(Project) | {{projectTitle}} |
| 생성일(Created At) | {{generatedAt}} |
| 상태(Status) | {{status}} |
| 작성자(Owner) | {{owner}} |
| 문서 역할(Document Role) | 후속 PRD/기능/스키마/API/화면정의서 생성을 위한 기준선 |

## 1. 개요(Overview)

{{overview}}

## 2. 목표(Goals)

- {{goal}}

## 3. 범위(Scope)

### 포함 범위(In Scope)

- {{inScopeItem}}

### 제외 범위(Out of Scope)

- {{outOfScopeItem}}

## 4. 기능 요구사항(Functional Requirements)

| 기능(Feature) | 우선순위(Priority) | 상세 문서 참조(Feature Definition Ref) | 설명(Description) |
| --- | --- | --- | --- |
| {{featureName}} | {{priority}} | {{featureDocumentRef}} | {{featureSummary}} |

## 5. 비기능 요구사항(Non-functional Requirements)

- {{nonFunctionalRequirement}}

## 6. 고정 기준 문서(Standard References)

| 문서(Document) | Slot | 용도(Purpose) |
| --- | --- | --- |
| PM 업무 실행 절차(PM Execution Procedure) | `support.pm_execution_procedure` | PM 에이전트의 고정 실행 순서 |
| 화면정의서 작성 룰(Screen Definition Writing Rules) | `support.screen_definition_writing_rules` | 화면 문서 작성 시 고정 규칙 |

## 7. 참조 계약 인덱스(Contract Index)

### DB 스키마 개요(DB Schema Overview)

| 스키마(Schema) | 이름(Name) | 설명(Description) |
| --- | --- | --- |
| {{schemaName}} | {{schemaDisplayName}} | {{schemaSummary}} |

### REST API 개요(REST API Overview)

| API | 메서드(Method) | 경로(Path) | 설명(Description) |
| --- | --- | --- | --- |
| {{apiName}} | {{method}} | {{path}} | {{apiSummary}} |

### 공통 레이아웃(Common Layouts)

| 레이아웃(Layout) | 이름(Name) | 설명(Description) |
| --- | --- | --- |
| {{layoutName}} | {{layoutDisplayName}} | {{layoutSummary}} |

## 8. 리스크(Risks)

| 리스크(Risk) | 영향(Impact) | 완화 방안(Mitigation) |
| --- | --- | --- |
| {{risk}} | {{impact}} | {{mitigation}} |

## 9. 전제(Assumptions)

- {{assumption}}

## 10. 해당 없음(N/A)

| 산출물/항목(Output/Item) | 사유(Reason) |
| --- | --- |
| {{naItem}} | {{naReason}} |

# 제품 요구사항 문서(PRD, Product Requirements Document) - {{projectTitle}}

이 문서는 실행력 높은 팀이 바로 만들고 검증하기 위해 문제, 사용자, 성공 기준, 범위, 요구사항, 검증 방법, 다음 액션을 정리하는 제품 요구사항 문서다.

## 0. 작성 원칙(Writing Rules)

- 입력 자료에 없는 내용은 만들지 않고 `미확정(Undecided)`으로 남긴다.
- 기능보다 문제(Problem)와 성공 기준(Success Criteria)을 먼저 확정한다.
- 이번 버전에서 하지 않을 일을 반드시 적는다.
- 모든 요구사항은 검증 가능한 문장으로 쓴다.
- 기능 코드(Feature Code)는 쓰지 않는다. 기능명(Feature Name)과 Project slot 문서 참조(Project Slot Document Reference)로 추적한다.

## 1. 결정 요약(Decision Summary)

| 항목(Item) | 내용(Description) |
| --- | --- |
| 제품/기능(Product or Feature) | {{projectTitle}} |
| 한 줄 요약(One-line Summary) | {{oneLineSummary}} |
| 작성자(Owner) | {{owner}} |
| 상태(Status) | {{status}} |
| 이번 결정(Main Decision) | {{mainDecision}} |
| 다음 액션(Next Action) | {{nextAction}} |

## 2. 문제 정의(Problem)

### 2.1 해결할 문제(Problem to Solve)

{{problemToSolve}}

### 2.2 왜 지금 해야 하는가(Why Now)

{{whyNow}}

### 2.3 근거(Evidence)

| 구분(Type) | 근거(Evidence) | 출처(Source) |
| --- | --- | --- |
| 사용자(User) | {{userEvidence}} | {{source}} |
| 데이터(Data) | {{dataEvidence}} | {{source}} |
| 운영/사업(Ops/Business) | {{businessEvidence}} | {{source}} |

## 3. 사용자(User)

| 사용자(User) | 상황(Context) | 핵심 니즈(Core Need) |
| --- | --- | --- |
| {{targetUser}} | {{userContext}} | {{coreNeed}} |

## 4. 성공 기준(Success)

| 지표(Metric) | 현재값(Baseline) | 목표값(Target) | 확인 방법(How to Measure) |
| --- | --- | --- | --- |
| {{metric}} | {{baseline}} | {{target}} | {{measurement}} |

## 5. 범위(Scope)

### 5.1 이번에 하는 것(In Scope)

- {{inScopeItem}}

### 5.2 이번에 하지 않는 것(Out of Scope)

- {{outOfScopeItem}}

## 6. 사용자 흐름(User Flow)

1. {{userFlowStep}}

## 7. 요구사항(Requirements)

### 7.1 기능 요구사항(Functional Requirements)

| 기능(Feature) | 우선순위(Priority) | 상세 문서 참조(Feature Definition Ref) | 검증 방법(Verification) |
| --- | --- | --- | --- |
| {{featureName}} | {{priority}} | {{featureDocumentRef}} | {{verificationMethod}} |

### 7.2 비기능 요구사항(Non-functional Requirements)

- {{nonFunctionalRequirement}}

## 8. 인수 기준(Acceptance Criteria)

| 기준(Criteria) | 관련 기능(Related Feature) | 확인 방법(Verification) |
| --- | --- | --- |
| {{acceptanceCriteria}} | {{featureName}} | {{verificationMethod}} |

## 9. 데이터/기술 고려사항(Data & Technical Notes)

| 항목(Item) | 내용(Description) |
| --- | --- |
| 필요한 데이터(Required Data) | {{requiredData}} |
| 외부 연동(Integration) | {{integration}} |
| 권한/인증(Auth) | {{auth}} |
| 추적/로그(Tracking/Logging) | {{tracking}} |

## 10. 출시 및 검증(Release & Validation)

| 항목(Item) | 내용(Description) |
| --- | --- |
| 출시 방식(Release Type) | {{releaseType}} |
| 첫 검증 대상(First Validation Audience) | {{validationAudience}} |
| 출시 전 확인(Pre-release Check) | {{preReleaseCheck}} |
| 롤백 기준(Rollback Criteria) | {{rollbackCriteria}} |

## 11. 리스크와 오픈 이슈(Risks & Open Questions)

| 구분(Type) | 내용(Description) | 담당(Owner) | 결정 필요 시점(Needed By) |
| --- | --- | --- | --- |
| 리스크(Risk) | {{risk}} | {{owner}} | {{neededBy}} |
| 질문(Question) | {{question}} | {{owner}} | {{neededBy}} |

## 12. 해당 없음(N/A)

| 항목(Item) | 사유(Reason) |
| --- | --- |
| {{naItem}} | {{naReason}} |

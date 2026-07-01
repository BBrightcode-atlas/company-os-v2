# 기능 정의서(Feature Definition) - {{featureName}}

이 문서는 기능 1개를 실제 구현/검증 가능한 단위로 정리한 문서다. 기능 코드는 사용하지 않는다.

## 1. 요약(Summary)

| 항목(Item) | 내용(Description) |
| --- | --- |
| 프로젝트(Project) | {{projectTitle}} |
| 기능(Feature) | {{featureName}} |
| 대상 surface(Target Surface) | {{targetSurface}} |
| 우선순위(Priority) | {{priority}} |
| 목적(Purpose) | {{purpose}} |

## 2. project-builder-base 재사용 검토(Project Builder Base Reuse Review)

프로젝트는 project-builder-base를 hard-copy해 시작한다. 아래는 이 기능의 제목·설명에서 추론한 base 재사용 후보다. Product Builder가 실제 경로를 확인해 전체 재사용/부분 재사용/신규/N/A로 확정한다.

| 항목(Item) | 내용(Description) |
| --- | --- |
| 대상 surface(Target Surface) | {{targetSurface}} |
| base Feature API 후보(Base Feature API Candidates) | {{baseFeatureApiCandidates}} |
| base Drizzle 스키마 후보(Base Drizzle Candidates) | {{baseDrizzleCandidates}} |
| 기본 재사용 판정(Default Reuse Decision) | {{reuseDecision}} |
| 커스터마이징 범위(Customization Scope) | {{customizationScope}} |

## 3. 사용자와 조건(User & Conditions)

| 항목(Item) | 내용(Description) |
| --- | --- |
| 사용자(User) | {{user}} |
| 진입 조건(Preconditions) | {{preconditions}} |
| 완료 조건(Done Condition) | {{doneCondition}} |

## 4. 주요 흐름(Main Flow)

- {{mainFlowStep}}

## 5. 예외 흐름(Exception Flow)

- {{exceptionHandling}}

## 6. 입력/출력(Input/Output)

| 구분(Type) | 내용(Description) |
| --- | --- |
| 입력(Input) | {{input}} |
| 출력(Output) | {{output}} |

## 7. 참조 산출물(References)

| 산출물(Output) | 참조 방식(Reference Rule) |
| --- | --- |
| project-builder-base | {{baseFeatureReference}} |
| 스키마 정의서(Schema Definition) | `schema-definition.md`에서 필요한 스키마를 확인한다. |
| REST API 정의서(REST API Definition) | `api-definition.md`에서 필요한 API를 확인한다. |
| 화면정의서(Screen Definition) | 관련 화면이 확정되면 `deliverable.screen_definitions` slot의 화면 문서를 연결한다. |

## 8. 인수 기준(Acceptance Criteria)

- project-builder-base 기준 재사용 판정과 대상 surface가 명시된다.
- {{featureName}} 기능이 목적에 맞게 동작한다.
- 주요 흐름과 예외 흐름이 QA에서 확인 가능하다.
- 필요한 스키마/API/화면 참조가 누락되지 않는다.

## 9. 제외 범위(Out of Scope)

- {{outOfScopeItem}}

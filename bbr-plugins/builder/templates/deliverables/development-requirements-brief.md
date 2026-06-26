# 개발 요구사항 브리프(Development Requirements Brief) - {{projectTitle}}

이 문서는 고객이 제공한 기획서, 요구사항 문서, 회의 메모, 레퍼런스 자료를 개발 착수 기준선으로 정리한 문서다. 제품을 새로 기획하는 문서가 아니라, 이미 받은 개발 미션에서 무엇을 구현해야 하는지와 무엇을 결정해야 하는지를 명확히 한다.

## 1. 프로젝트 맥락

고객이 무엇을 만들라고 요청했고, 어떤 자료가 그 요청을 정의하는가?

### 1.1 개발 미션 요약

{{missionSummary}}

### 1.2 입력 자료

| 자료 | 포함 내용 | 개발 범위에 미치는 영향 |
| --- | --- | --- |
| {{source}} | {{sourceSummary}} | {{deliveryImpact}} |

### 1.3 확정된 배경

- {{confirmedContext}}

## 2. 확정 구현 범위

이 프로젝트가 납품되었다고 판단하려면 무엇이 반드시 구현되어야 하는가?

| 구현 범위 | 설명 | 근거 자료 | 우선순위 |
| --- | --- | --- | --- |
| {{scopeItem}} | {{description}} | {{source}} | {{priority}} |

## 3. 기능 요구사항

사용자 또는 운영자가 실제로 사용할 수 있어야 하는 기능은 무엇인가?

| 기능/역량 | 필수 동작 | 행위자 | 조건/규칙 | 검증 방법 |
| --- | --- | --- | --- | --- |
| {{featureName}} | {{requiredBehavior}} | {{actor}} | {{conditionsAndRules}} | {{verification}} |

## 4. 사용자/관리자 흐름

어떤 흐름이 처음부터 끝까지 동작해야 하는가?

| 흐름 | 행위자 | 시작 조건 | 단계 | 기대 결과 |
| --- | --- | --- | --- | --- |
| {{flowName}} | {{actor}} | {{startCondition}} | {{steps}} | {{expectedResult}} |

## 5. 데이터, API, 연동 필요사항

고객 자료에서 이미 확인된 구현 제약이나 연동 요구는 무엇인가?

| 영역 | 필요사항 | 근거/이유 | 후속 산출물 |
| --- | --- | --- | --- |
| 데이터 | {{dataNeed}} | {{sourceOrRationale}} | 스키마 정의서 |
| API | {{apiNeed}} | {{sourceOrRationale}} | API 정의서 |
| 연동 | {{integrationNeed}} | {{sourceOrRationale}} | 아키텍쳐 정의서 |

## 6. 인수 기준

구현 결과가 이 브리프를 만족한다고 어떻게 판단할 것인가?

| 기준 | 관련 범위/기능 | 검증 방법 |
| --- | --- | --- |
| {{criteria}} | {{relatedScopeOrFeature}} | {{verificationMethod}} |

## 7. 마일스톤/납품 단위

구현은 어떤 단위로 나누어 진행하고 납품해야 하는가?

| 마일스톤/단위 | 산출물 | 완료 기준 | 의존성 |
| --- | --- | --- | --- |
| {{milestoneOrUnit}} | {{deliverable}} | {{exitCriteria}} | {{dependency}} |

## 8. 핵심 전제와 오픈 결정

진행을 위해 무엇을 전제하고 있으며, 무엇은 고객 또는 운영자의 결정이 필요한가?

### 8.1 핵심 전제

| 전제 | 지금 진행 가능한 이유 | 전제가 틀릴 때의 리스크 |
| --- | --- | --- |
| {{assumption}} | {{whyProceed}} | {{riskIfFalse}} |

### 8.2 오픈 결정

| 결정 필요 항목 | 선택지/맥락 | 담당 | 결정 필요 시점 |
| --- | --- | --- | --- |
| {{decisionNeeded}} | {{optionsOrContext}} | {{owner}} | {{neededBy}} |

## 9. 제외 범위

이번 구현에 포함하지 않는 것과 있으면 좋은 수준의 항목은 무엇인가?

| 항목 | 구분 | 제외 이유 |
| --- | --- | --- |
| {{outOfScopeItem}} | {{nonGoalOrNiceToHave}} | {{reason}} |

# 기능정의서(Feature Definition) - 목록(Index) - {{projectTitle}}

이 페이지는 기능정의서 산출물 안의 목록 페이지다. PRD의 기능 요구사항을 기능별 상세 문서로 분리하고, 기능명(Feature Name), Project slot 문서 참조(Project Slot Document Reference), project-builder-base 재사용 판정으로 추적한다.

## 1. 기능 목록(Feature List)

| 기능(Feature) | 우선순위(Priority) | 상세 문서 참조(Feature Definition Ref) | Base 재사용 판정(Base Reuse Decision) | 요약(Summary) | 상태(Status) |
| --- | --- | --- | --- | --- | --- |
| {{featureName}} | {{priority}} | {{featureDocumentRef}} | {{reuseDecision}} | {{featureSummary}} | {{status}} |

## 2. 작성 규칙(Writing Rules)

- 기능 1개는 기능 정의서(Feature Definition) 1개로 분리한다.
- 기능 코드는 만들지 않는다.
- 기능명이 중복되면 Project slot 문서 참조로 구분한다.
- 구현 task의 내부 id/slug는 Product Builder 단계에서만 만든다.
- 기능별로 project-builder-base의 admin/site/app/landing 중 대상 surface를 판정한다.
- 기능별로 전체 재사용/부분 재사용/커스터마이징/신규/N/A를 명시한다.
- 구조 세팅은 project-builder-base hard-copy를 전제로 하고, 기능정의서에는 feature 재사용과 커스터마이징 범위만 남긴다.
- 각 기능 정의서는 Flowchart와 Sequence Diagram을 모두 포함해야 한다.
- 기능 범위, 흐름, actor, API, 상태, 예외 처리가 바뀌면 해당 기능 정의서의 Flowchart와 Sequence Diagram도 함께 갱신한다.

## 3. 해당 없음(N/A)

| 항목(Item) | 사유(Reason) |
| --- | --- |
| {{naItem}} | {{naReason}} |

# 기능 정의서 목록(Feature Definition Index) - {{projectTitle}}

이 문서는 PRD의 기능 요구사항을 기능별 상세 문서로 분리하기 위한 목차다. 기능 코드는 사용하지 않고 기능명(Feature Name)과 Project slot 문서 참조(Project Slot Document Reference)로 추적한다.

## 1. 기능 목록(Feature List)

| 기능(Feature) | 우선순위(Priority) | 상세 문서 참조(Feature Definition Ref) | 요약(Summary) | 상태(Status) |
| --- | --- | --- | --- | --- |
| {{featureName}} | {{priority}} | {{featureDocumentRef}} | {{featureSummary}} | {{status}} |

## 2. 작성 규칙(Writing Rules)

- 기능 1개는 기능 정의서(Feature Definition) 1개로 분리한다.
- 기능 코드는 만들지 않는다.
- 기능명이 중복되면 Project slot 문서 참조로 구분한다.
- 구현 task의 내부 id/slug는 Product Builder 단계에서만 만든다.
- 각 기능 정의서는 Flowchart와 Sequence Diagram을 모두 포함해야 한다.
- 기능 범위, 흐름, actor, API, 상태, 예외 처리가 바뀌면 해당 기능 정의서의 Flowchart와 Sequence Diagram도 함께 갱신한다.

## 3. 해당 없음(N/A)

| 항목(Item) | 사유(Reason) |
| --- | --- |
| {{naItem}} | {{naReason}} |

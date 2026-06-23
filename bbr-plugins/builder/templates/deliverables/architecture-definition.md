# 아키텍쳐 정의서(Architecture Definition) - {{projectTitle}}

이 문서는 구축 대상 시스템의 아키텍쳐를 정의한다. 인프라 구성과 기술 스택을 구체적으로 기록하고, 프론트엔드·API·데이터·AI 계층과 핵심 데이터 흐름을 도식으로 표현한다. 표준 기획서(Standard Plan)의 스키마·API·레이아웃 계약과 정합해야 한다.

## 1. 개요(Overview)

{{architectureOverview}}

## 2. 시스템 아키텍쳐 다이어그램(System Architecture Diagram)

```mermaid
{{architectureDiagram}}
```

## 3. 기술 스택(Tech Stack)

| 영역(Area) | 채택(Choice) | 근거(Rationale) |
| --- | --- | --- |
| {{techArea}} | {{techChoice}} | {{techRationale}} |

## 4. 인프라 구성(Infrastructure)

| 코드(Code) | 구성요소(Component) | 분류(Category) | 제공자(Provider) | 상세(Detail) |
| --- | --- | --- | --- | --- |
| {{infraCode}} | {{infraName}} | {{infraCategory}} | {{infraProvider}} | {{infraDetail}} |

## 5. 컴포넌트(Components)

| 코드(Code) | 이름(Name) | 계층(Layer) | 책임(Responsibility) | 기술(Tech) | 의존(Depends On) |
| --- | --- | --- | --- | --- | --- |
| {{componentCode}} | {{componentName}} | {{componentLayer}} | {{componentResponsibility}} | {{componentTech}} | {{componentDependsOn}} |

## 6. 외부 연동(Integrations)

- {{integration}}

## 7. 핵심 데이터 흐름(Data Flow)

- {{dataFlow}}

## 8. 해당 없음(N/A)

| 항목(Item) | 사유(Reason) |
| --- | --- |
| {{naItem}} | {{naReason}} |

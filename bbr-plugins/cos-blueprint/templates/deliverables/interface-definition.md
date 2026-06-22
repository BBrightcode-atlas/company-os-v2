# 인터페이스 정의서(Interface Definition) - {{projectTitle}}

이 문서는 화면(Screen), API, 스키마(Schema) 사이의 참조 관계를 한눈에 확인하기 위한 요약 산출물이다. 상세 필드와 검수 기준은 `schema-definition.md`, `api-definition.md`, 화면정의서(Screen Definition)를 기준으로 한다.

## 1. 스키마/API 추적성(Schema/API Traceability)

| 스키마(Schema) | 스키마 이름(Schema Name) | 참조 API(Referenced APIs) | 관련 기능(Related Features) |
| --- | --- | --- | --- |
| {{schemaName}} | {{schemaDisplayName}} | {{apiReference}} | {{relatedFeatures}} |

## 2. API/화면 연결(API/Screen Mapping)

| API | 메서드(Method) | 경로(Path) | 행위자(Actor) | 참조 화면(Referenced Screens) |
| --- | --- | --- | --- | --- |
| {{apiName}} | {{method}} | {{path}} | {{actor}} | {{screenReference}} |

## 3. 화면/스키마 연결(Screen/Schema Mapping)

| 화면(Screen) | 사용 스키마(Schemas) | 사용 API(APIs) | 비고(Notes) |
| --- | --- | --- | --- |
| {{screenName}} | {{schemaReference}} | {{apiReference}} | {{notes}} |

## 4. 해당 없음(N/A)

| 항목(Item) | 사유(Reason) |
| --- | --- |
| {{naItem}} | {{naReason}} |

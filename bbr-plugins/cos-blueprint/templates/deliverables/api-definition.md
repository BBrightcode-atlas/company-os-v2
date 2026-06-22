# REST API 정의서(REST API Definition) - {{projectTitle}}

이 문서는 REST API 계약을 화면정의서, 개발, QA가 같은 기준으로 참조하도록 분리한 회사 표준 산출물이다.

## 1. API 목차(API Index)

| API | 행위자(Actor) | 메서드(Method) | 경로(Path) | 설명(Description) | 스키마(Schema) |
| --- | --- | --- | --- | --- | --- |
| {{apiName}} | {{actor}} | {{method}} | {{path}} | {{apiSummary}} | {{schemaReference}} |

## 2. API 상세(API Detail)

### {{method}} {{path}}

| 항목(Item) | 내용(Description) |
| --- | --- |
| 설명(Description) | {{apiSummary}} |
| 행위자(Actor) | {{actor}} |
| 인증(Auth) | {{auth}} |
| 감사 액션(Audit Action) | {{auditAction}} |
| 참조 스키마(Referenced Schema) | {{schemaReference}} |

#### 요청(Request)

| 이름(Name) | 위치(Location) | 타입(Type) | 필수(Required) | 설명(Description) |
| --- | --- | --- | --- | --- |
| {{requestField}} | {{location}} | {{type}} | {{required}} | {{description}} |

#### 응답(Response)

| 이름(Name) | 타입(Type) | 필수(Required) | 설명(Description) |
| --- | --- | --- | --- |
| {{responseField}} | {{type}} | {{required}} | {{description}} |

#### 오류(Errors)

| HTTP 상태(HTTP Status) | 조건(Condition) | 메시지(Message) |
| --- | --- | --- |
| {{status}} | {{condition}} | {{message}} |

#### 인수 기준(Acceptance Criteria)

- {{acceptanceCriteria}}

## 3. 해당 없음(N/A)

| 항목(Item) | 사유(Reason) |
| --- | --- |
| {{naItem}} | {{naReason}} |

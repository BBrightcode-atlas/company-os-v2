# REST API 정의서(REST API Definition) - {{projectTitle}}

이 문서는 기능정의서(Feature Definition)와 스키마 정의서(Schema Definition)를 함께 읽어 확정한 REST API 계약을 product-builder-base 서버 API 구조와 대조해 화면정의서, 개발, QA가 같은 기준으로 참조하도록 분리한 회사 표준 산출물이다.

## 1. 기준 코드베이스(Base Server API Baseline)

| 항목(Item) | 기준(Baseline) |
| --- | --- |
| 기준 repo(Base Repo) | product-builder-base |
| Server app | `product-builder-base:apps/server` |
| Server module exposure | `product-builder-base:apps/server/src/app.module.ts` |
| Feature API packages | `product-builder-base:packages/features/{feature-name}` |
| Feature package pattern | `controller/*`, `service/*`, `dto/*`, `{feature}.module.ts`, `index.ts` |
| 작성 원칙(Authoring Rule) | 기능정의서와 스키마 정의서를 함께 읽고 endpoint별 REUSE/EXTEND/NEW/N/A를 판정한다. 프로젝트는 product-builder-base를 클론한 뒤 프로젝트 이름으로 생성되므로, 수정 여부는 clone된 base 파일의 hard-copy 이후 변경 범위로 기록한다. |

## 2. 기능 기준 API 매핑(Feature-to-API Matrix)

| 기능 코드(Feature Code) | 기능(Feature) | 대상 surface(Target Surface) | 연결 API(API Codes) | 기본 판정(Default Decision) | base Feature API 후보(Base Feature API Candidates) |
| --- | --- | --- | --- | --- | --- |
| {{featureCode}} | {{featureName}} | {{targetSurface}} | {{apiCodes}} | {{reuseDecision}} | {{baseFeatureApiCandidates}} |

## 3. API 목차(API Index)

| API | 행위자(Actor) | 메서드(Method) | 경로(Path) | 재사용 판정(Reuse Decision) | 관련 기능(Related Features) | 스키마(Schema) | Base Feature API 참조 | 설명(Description) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| {{apiName}} | {{actor}} | {{method}} | {{path}} | {{reuseDecision}} | {{relatedFeatures}} | {{schemaReference}} | {{baseFeatureApiReferences}} | {{apiSummary}} |

## 4. API 상세(API Detail)

### {{method}} {{path}}

| 항목(Item) | 내용(Description) |
| --- | --- |
| 설명(Description) | {{apiSummary}} |
| 행위자(Actor) | {{actor}} |
| 인증(Auth) | {{auth}} |
| 감사 액션(Audit Action) | {{auditAction}} |
| 관련 기능(Related Features) | {{relatedFeatures}} |
| 참조 스키마(Referenced Schema) | {{schemaReference}} |
| 재사용 판정(Reuse Decision) | {{reuseDecision}} |
| Base Feature API 참조(Base Feature API References) | {{baseFeatureApiReferences}} |
| Server Exposure | {{serverExposure}} |
| 수정 범위(Customization Scope) | {{customizationScope}} |

#### 요청(Request)

| 이름(Name) | 타입(Type) | 필수(Required) | 설명(Description) |
| --- | --- | --- | --- |
| {{requestField}} | {{type}} | {{required}} | {{description}} |

#### 응답(Response)

| 이름(Name) | 타입(Type) | 필수(Required) | 설명(Description) |
| --- | --- | --- | --- |
| {{responseField}} | {{type}} | {{required}} | {{description}} |

#### 오류(Errors)

| 코드(Code) | 조건(Condition) |
| --- | --- |
| {{status}} | {{condition}} |

#### 구현 메모(Implementation Notes)

- {{implementationNote}}

#### 인수 기준(Acceptance Criteria)

- {{acceptanceCriteria}}

## 5. 해당 없음(N/A)

| 항목(Item) | 사유(Reason) |
| --- | --- |
| {{naItem}} | {{naReason}} |

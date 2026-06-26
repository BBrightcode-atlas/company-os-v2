# 스키마 정의서(Schema Definition) - {{projectTitle}}

이 문서는 기능정의서(Feature Definition) 기준 데이터 구조를 product-builder-base `packages/drizzle` schema와 대조해 개발/QA가 검수 가능한 기준으로 분리한 회사 표준 산출물이다.

## 1. 기준 코드베이스(Base Drizzle Baseline)

| 항목(Item) | 기준(Baseline) |
| --- | --- |
| 기준 repo(Base Repo) | product-builder-base |
| Drizzle schema barrel | `product-builder-base:packages/drizzle/src/schema/index.ts` |
| Core schema | `product-builder-base:packages/drizzle/src/schema/core/*` |
| Feature schema | `product-builder-base:packages/drizzle/src/schema/features/{feature-name}/*` |
| 작성 원칙(Authoring Rule) | 기능정의서의 기능 단위별로 REUSE/EXTEND/NEW/N/A를 판정하고 재사용 가능한 table/export를 남긴다. |

## 2. 기능 기준 스키마 매핑(Feature-to-Schema Matrix)

| 기능 코드(Feature Code) | 기능(Feature) | 대상 surface(Target Surface) | 연결 스키마(Schema Codes) | 기본 판정(Default Decision) | base Drizzle 후보(Base Drizzle Candidates) |
| --- | --- | --- | --- | --- | --- |
| {{featureCode}} | {{featureName}} | {{targetSurface}} | {{schemaCodes}} | {{reuseDecision}} | {{baseDrizzleCandidates}} |

## 3. 스키마 목차(Schema Index)

| 코드(Code) | 이름(Name) | 소유자(Owner) | 재사용 판정(Reuse Decision) | Drizzle Table | 관련 기능(Related Features) | Base Drizzle 참조 | 설명(Description) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| {{schemaCode}} | {{schemaName}} | {{owner}} | {{reuseDecision}} | {{tableName}} | {{relatedFeatures}} | {{baseDrizzleReferences}} | {{schemaSummary}} |

## 4. 스키마 상세(Schema Detail)

### {{schemaCode}} {{schemaName}}

| 항목(Item) | 내용(Description) |
| --- | --- |
| 설명(Description) | {{schemaSummary}} |
| 소유자(Owner) | {{owner}} |
| 관련 기능(Related Features) | {{relatedFeatures}} |
| 재사용 판정(Reuse Decision) | {{reuseDecision}} |
| Drizzle Table | {{tableName}} |
| Drizzle Export | {{drizzleExportName}} |
| Base Drizzle 참조(Base Drizzle References) | {{baseDrizzleReferences}} |
| Migration Scope | {{migrationScope}} |

#### 테이블 컬럼 선언(Table Column Declaration)

| 필드(Field) | 타입(Type) | 필수(Required) | 설명(Description) | 검증(Validation) | 예시(Example) |
| --- | --- | --- | --- | --- | --- |
| {{fieldName}} | {{fieldType}} | {{required}} | {{fieldDescription}} | {{validation}} | {{example}} |

#### 관계(Relations)

- {{relation}}

#### 인덱스와 enum(Indexes & Enums)

| 구분(Type) | 내용(Description) |
| --- | --- |
| Indexes | {{indexes}} |
| Enums | {{enums}} |

#### 구현 메모(Implementation Notes)

- {{implementationNote}}

#### 불변 조건(Invariants)

- {{invariant}}

#### 인수 기준(Acceptance Criteria)

- {{acceptanceCriteria}}

## 5. 해당 없음(N/A)

| 항목(Item) | 사유(Reason) |
| --- | --- |
| {{naItem}} | {{naReason}} |

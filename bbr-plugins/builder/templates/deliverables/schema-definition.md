# 스키마 정의서(Schema Definition) - {{projectTitle}}

이 문서의 스키마 정의는 Mermaid ERD와 테이블 상세를 기준으로 한다. product-builder-base 참고, 재사용 판정, migration scope는 아래 참고 섹션에서 별도로 설명한다.

## 1. 전체 ERD(Mermaid Entity Relationship Diagram)

아래 ERD가 스키마 정의의 기준이다. 구현자는 먼저 테이블과 관계를 확인한 뒤 테이블 상세의 필드 목록을 검토한다.

```mermaid
erDiagram
    {{TABLE_NAME}} {
        {{fieldType}} {{fieldName}}
    }
    {{TABLE_NAME}} ||--o{ {{RELATED_TABLE_NAME}} : relates
```

### 1.1 관계 목록(Relationship Index)

Mermaid 관계 라벨은 FK 필드명 또는 관계 방향을 표시한다. 원문 relation은 상세 검수용으로 함께 둔다.

| 출발 엔티티(From) | 관계(Relation) | 대상 엔티티(To) | 라벨(Label) | 원문(Source Relation) |
| --- | --- | --- | --- | --- |
| {{fromEntity}} | {{relationCardinality}} | {{toEntity}} | {{relationLabel}} | {{sourceRelation}} |

## 2. ERD 엔티티 목록(Entity Index)

| 코드(Code) | 엔티티(Entity) | Drizzle Table | 관련 기능/근거(Related Feature or Requirement) | 컬럼 수(Fields) | 관계 수(Relations) | 설명(Description) |
| --- | --- | --- | --- | --- | --- | --- |
| {{schemaCode}} | {{schemaName}} | {{tableName}} | {{relatedFeatures}} | {{fieldCount}} | {{relationCount}} | {{schemaSummary}} |

## 3. 테이블 상세(Table Detail)

### 3.1 {{schemaCode}} `{{tableName}}` - {{schemaName}}

{{schemaSummary}}

#### 테이블(Table)

| 테이블명(Table) | 엔티티(Entity) | Drizzle Export |
| --- | --- | --- |
| {{tableName}} | {{schemaName}} | {{drizzleExportName}} |

#### 필드(Fields)

| 필드(Field) | 타입(Type) | 필수(Required) | 키/제약(Key/Constraint) | 설명(Description) |
| --- | --- | --- | --- | --- |
| {{fieldName}} | {{fieldType}} | {{required}} | {{constraint}} | {{fieldDescription}} |

#### 관계(Relations)

| 관계(Relation) | 대상 테이블(Target Table) | 필드/라벨(Field or Label) | 원문(Source) |
| --- | --- | --- | --- |
| {{relationCardinality}} | {{targetTable}} | {{relationLabel}} | {{sourceRelation}} |

#### 인덱스/Enum(Indexes & Enums)

| 구분(Type) | 내용(Description) |
| --- | --- |
| Indexes | {{indexes}} |
| Enums | {{enums}} |

## 4. 기능, 참고, 재사용, 마이그레이션 설명(Feature, Reference, Reuse & Migration Notes)

ERD와 테이블 상세를 먼저 읽은 뒤 아래 표에서 기능 연결, product-builder-base 참고, 재사용/확장 판정, migration scope를 확인한다.

### 4.1 기능 기준 스키마 매핑(Feature-to-Schema Matrix)

| 기능 코드(Feature Code) | 기능(Feature) | 대상 surface(Target Surface) | 연결 스키마(Schema Codes) | 기본 판정(Default Decision) | base Drizzle 후보(Base Drizzle Candidates) |
| --- | --- | --- | --- | --- | --- |
| {{featureCode}} | {{featureName}} | {{targetSurface}} | {{schemaCodes}} | {{reuseDecision}} | {{baseDrizzleCandidates}} |

### 4.2 Product Builder Base 구성 범위(Component Scope)

| 경로(Path) | 사용 여부(Usage) | 필수 여부(Required) | 역할(Role) |
| --- | --- | --- | --- |
| {{basePath}} | {{usage}} | {{required}} | {{role}} |

### 4.3 기준 코드베이스(Base Drizzle Baseline)

| 항목(Item) | 기준(Baseline) |
| --- | --- |
| 기준 repo(Base Repo) | product-builder-base |
| Drizzle schema barrel | `product-builder-base:packages/drizzle/src/schema/index.ts` |
| Core schema | `product-builder-base:packages/drizzle/src/schema/core/*` |
| Feature schema | `product-builder-base:packages/drizzle/src/schema/features/{feature-name}/*` |
| 작성 원칙(Authoring Rule) | 기능정의서의 기능 단위별로 REUSE/EXTEND/NEW/N/A를 판정하고 재사용 가능한 table/export를 남긴다. |

### 4.4 스키마별 참고/재사용/마이그레이션(Per-Schema Reference & Reuse)

| 코드(Code) | 엔티티(Entity) | 재사용 판정(Reuse Decision) | Drizzle Export | Base Drizzle 참조(Base Drizzle References) | Migration Scope | 구현 메모(Implementation Notes) | 인수 기준(Acceptance Criteria) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| {{schemaCode}} | {{schemaName}} | {{reuseDecision}} | {{drizzleExportName}} | {{baseDrizzleReferences}} | {{migrationScope}} | {{implementationNotes}} | {{acceptanceCriteria}} |

## 5. 해당 없음(N/A)

| 항목(Item) | 사유(Reason) |
| --- | --- |
| {{naItem}} | {{naReason}} |

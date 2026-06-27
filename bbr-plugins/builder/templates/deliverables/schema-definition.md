# 스키마 정의서(Schema Definition) - {{projectTitle}}

이 문서의 스키마 선언은 Mermaid ERD를 기준으로 읽는다. 전체 테이블 구조를 먼저 보고, 기능별 ERD에서 해당 기능이 쓰는 테이블/필드/관계를 확인한 뒤 product-builder-base 참고와 재사용 판정을 검토한다.

## 1. 전체 ERD(Mermaid Entity Relationship Diagram)

아래 ERD가 스키마 정의의 기준이다. 테이블명, 필드, 키(PK/FK/UK), 관계를 이 블록에서 먼저 확인한다.

```mermaid
erDiagram
    {{TABLE_NAME}} {
        {{fieldType}} {{fieldName}} {{key}} "{{fieldDescription}}"
    }
    {{TABLE_NAME}} ||--o{ {{RELATED_TABLE_NAME}} : relates
```

## 2. 기능별 ERD(Feature ERD)

기능정의서의 FR 행을 그대로 제목으로 쓰지 않고, 제목/설명/테이블명에서 실제 feature 묶음을 추출해 관련 테이블을 모았다. FR 코드는 추적 정보로만 표시한다.

### 2.1 {{featureClusterName}}

관련 요구사항: {{requirementRefs}}

대상 surface: {{targetSurface}}

연결 스키마: {{schemaCodes}}

```mermaid
erDiagram
    {{FEATURE_TABLE_NAME}} {
        {{fieldType}} {{fieldName}} {{key}} "{{fieldDescription}}"
    }
    {{FEATURE_TABLE_NAME}} }o--|| {{FEATURE_RELATED_TABLE_NAME}} : {{relationLabel}}
```

## 3. 기능, 참고, 재사용, 마이그레이션 설명(Feature, Reference, Reuse & Migration Notes)

ERD를 먼저 읽은 뒤 아래 표에서 기능 연결, product-builder-base 참고, 재사용/확장 판정, migration scope를 확인한다.

### 3.1 기능 기준 스키마 매핑(Feature-to-Schema Matrix)

| 기능 묶음(Feature Cluster) | 관련 요구사항(Requirement Refs) | 대상 surface(Target Surface) | 연결 스키마(Schema Codes) | 기본 판정(Default Decision) | base Drizzle 후보(Base Drizzle Candidates) |
| --- | --- | --- | --- | --- | --- |
| {{featureClusterName}} | {{requirementRefs}} | {{targetSurface}} | {{schemaCodes}} | {{reuseDecision}} | {{baseDrizzleCandidates}} |

### 3.2 Product Builder Base 구성 범위(Component Scope)

| 경로(Path) | 사용 여부(Usage) | 필수 여부(Required) | 역할(Role) |
| --- | --- | --- | --- |
| {{basePath}} | {{usage}} | {{required}} | {{role}} |

### 3.3 기준 코드베이스(Base Drizzle Baseline)

| 항목(Item) | 기준(Baseline) |
| --- | --- |
| 기준 repo(Base Repo) | product-builder-base |
| Drizzle schema barrel | `product-builder-base:packages/drizzle/src/schema/index.ts` |
| Core schema | `product-builder-base:packages/drizzle/src/schema/core/*` |
| Feature schema | `product-builder-base:packages/drizzle/src/schema/features/{feature-name}/*` |
| 작성 원칙(Authoring Rule) | 기능정의서의 FR 행을 그대로 표시 단위로 쓰지 않고 feature cluster별로 REUSE/EXTEND/NEW/N/A를 판정하며 재사용 가능한 table/export를 남긴다. |

### 3.4 스키마별 참고/재사용/마이그레이션(Per-Schema Reference & Reuse)

| 코드(Code) | 엔티티(Entity) | Drizzle Table | 재사용 판정(Reuse Decision) | Drizzle Export | Base Drizzle 참조(Base Drizzle References) | Migration Scope | 구현 메모(Implementation Notes) | 인수 기준(Acceptance Criteria) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| {{schemaCode}} | {{schemaName}} | {{tableName}} | {{reuseDecision}} | {{drizzleExportName}} | {{baseDrizzleReferences}} | {{migrationScope}} | {{implementationNotes}} | {{acceptanceCriteria}} |

## 4. 해당 없음(N/A)

| 항목(Item) | 사유(Reason) |
| --- | --- |
| {{naItem}} | {{naReason}} |

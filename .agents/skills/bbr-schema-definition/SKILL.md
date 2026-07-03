---
name: bbr-schema-definition
description: Use after BBR feature definition to create schema-definition.md and schema-coverage.json from feature-definition.md, feature-coverage.json, and source-material.md. Produces Schema Definition artifacts with Mermaid ERD, SCH codes, Drizzle reuse decisions, migration scope, and feature-to-schema traceability.
---

# BBR Schema Definition

Create a schema definition from a completed feature definition.

This is the next step after `$bbr-feature-definition`. It is not a generic database brainstorm. It produces the schema-definition artifact contract:

1. Read `feature-definition.md`, `feature-coverage.json`, `feature-definition-scope.json`, and source analysis artifacts.
2. Build a data-entity inventory from every feature group.
3. Merge duplicate entities across features.
4. Assign stable `SCH-###` schema codes.
5. Define table name, Drizzle export name, fields, keys, relations, indexes, enums, migration scope, implementation notes, default values, and acceptance criteria.
6. Compare each schema with `product-builder-base` Drizzle schema and classify reuse.
7. Write the first draft `schema-definition.md` with ERD-first structure.
8. Write the first draft `schema-coverage.json` for downstream automation.
9. Validate and review.
10. Perform agent semantic self-review.
11. Patch `schema-definition.md` and `schema-coverage.json` based on validation, scripted review, and semantic self-review findings.
12. Rerun validation and review after patching. The handoff files must be the post-review revised artifacts, not the first draft.

## Required Inputs

Use the latest source-intake run for the project unless `--run-dir` is supplied.

Required files:

- `feature-definition.md`
- `feature-coverage.json`
- `feature-definition-scope.json`
- `source-material.md`
- `feature-definition-work/feature-analysis-input.json`

If `feature-definition.md` or `feature-coverage.json` is missing, run `$bbr-feature-definition` first.

## Output Files

Write these files into the same run directory:

- `schema-definition.md`
- `schema-coverage.json`
- `schema-definition.validation.json`
- `schema-definition.review.json`
- `schema-definition-review.md`
- `schema-definition-loop.md`

## Output Format

`schema-definition.md` must match the schema-definition shape:

1. `# 스키마 정의서(Schema Definition) - <project>`
2. `## 1. 전체 ERD(Mermaid Entity Relationship Diagram)`
3. Mermaid `erDiagram` containing all schema tables, fields, key markers, and relations.
4. `## 2. 기능별 ERD(Feature ERD)` grouped by feature cluster, not by raw FR row.
5. `## 3. 기능, 참고, 재사용, 마이그레이션 설명(Feature, Reference, Reuse & Migration Notes)`
6. `### 3.1 기능 기준 스키마 매핑(Feature-to-Schema Matrix)`
7. `### 3.2 Product Builder Base 구성 범위(Component Scope)`
8. `### 3.3 기준 코드베이스(Base Drizzle Baseline)`
9. `### 3.4 스키마별 참고/재사용/마이그레이션(Per-Schema Reference & Reuse)`
10. `### 3.5 Mermaid 스키마 필드 정의(Type, Name, Description, Default)`
11. Optional `## 4. 해당 없음(N/A)` only when features are intentionally not represented by schemas.

Do not replace the ERD with only per-table field tables. The Mermaid ERD is the primary schema declaration.
Every schema field must expose type, field name, Korean description, and default value. Put these in Mermaid field comments using the form `type name KEY "description; 기본값: value"`.

## Schema Coverage JSON

`schema-coverage.json` must include:

```json
{
  "projectName": "aiga",
  "sourceFeatureDefinition": "feature-definition.md",
  "schemas": [
    {
      "code": "SCH-001",
      "name": "회원 계정",
      "tableName": "users",
      "drizzleExportName": "users",
      "description": "로그인 사용자와 회원 등급의 기준 테이블",
      "owner": "server",
      "sourceFeatureIds": ["FEA-001", "FEA-002"],
      "sourceChunks": ["CH-005", "CH-048..CH-050"],
      "baseReuseDecision": "EXTEND",
      "baseDrizzleReferences": [
        {
          "packagePath": "packages/drizzle/src/schema/core/auth.ts",
          "exportName": "users",
          "tableName": "users",
          "reuseDecision": "EXTEND",
          "note": "기본 auth user를 회원 등급과 의사 인증 상태로 확장"
        }
      ],
      "fields": [
        {
          "name": "id",
          "type": "uuid",
          "required": true,
          "description": "사용자 식별자",
          "defaultValue": "defaultRandom()",
          "validation": "PK"
        }
      ],
      "relations": ["users 1:1 doctor_profiles"],
      "indexes": ["users.email unique"],
      "enums": ["member_grade: guest, member, verified_doctor"],
      "migrationScope": ["기존 users 확장"],
      "implementationNotes": ["의사 인증 승인 트랜잭션과 연결"],
      "acceptanceCriteria": ["회원 등급별 권한 판정이 users 기준으로 가능하다."]
    }
  ],
  "featureSchemaMappings": [
    {
      "featureId": "FEA-001",
      "featureName": "회원 등급 및 권한 정책",
      "schemaCodes": ["SCH-001"],
      "defaultDecision": "EXTEND",
      "baseDrizzleCandidates": ["packages/drizzle/src/schema/core/auth.ts"]
    }
  ],
  "unmappedFeatures": []
}
```

Use reuse decisions only from:

- `REUSE`
- `EXTEND`
- `NEW`
- `N/A`
- `UNDECIDED`

## Workflow

1. Prepare schema analysis:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-schema-definition/scripts/prepare-schema-analysis.ts \
  --project-name "<project-name>"
```

Use `--run-dir "<runDir>"` when targeting a specific run.

2. Read:

- `schema-definition-work/schema-analysis-input.json`
- `schema-definition-work/schema-workflow.md`
- `feature-definition.md`
- `feature-coverage.json`

3. Build the schema inventory:

- Extract data entities, not screens.
- Merge entities referenced by multiple features.
- Keep project-specific domain schemas separate when they have different lifecycle or ownership.
- Connect every schema to one or more `FEA-###` feature ids unless it is truly common/system-level.
- Keep external REST/API-only concerns out of tables unless persisted state, logs, cache, audit, or mapping data is required.

4. Compare with `product-builder-base`:

- Prefer codebase-memory MCP architecture/search tools when available.
- Fallback to local file search when graph tools are unavailable or insufficient.
- Check `product-builder-base:packages/drizzle/src/schema/index.ts`.
- Check `core/*` before `features/*`.
- Record reusable table/export candidates in `baseDrizzleReferences`.
- Do not force reuse. Use `NEW` when a domain entity has no real base table.

5. Write:

- `schema-definition.md`
- `schema-coverage.json`

6. Validate:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-schema-definition/scripts/validate-schema-definition.ts \
  --project-name "<project-name>"
```

7. Review:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-schema-definition/scripts/review-schema-definition.ts \
  --project-name "<project-name>"
```

8. Semantic self-review:

Check at least:

- Every feature is mapped to schemas or explicitly listed in `unmappedFeatures` with a reason.
- No table is overloaded with unrelated lifecycle data.
- Relations are ERD-convertible.
- Every schema has fields with name/type/required/description/defaultValue.
- Every schema field has a default value, including explicit `없음` or `null` when no DB default exists.
- `baseReuseDecision` matches `baseDrizzleReferences`.
- `NEW` schemas explain why base reuse is not sufficient.
- AI chat external REST integration only creates persisted integration/session/log schemas if needed; it must not imply internal AI runtime implementation when excluded.
- Admin-only operational views do not become separate tables unless they require persisted workflow state.

Append findings to `schema-definition-loop.md`, patch artifacts, then rerun validation and review.

The final deliverable state is defined by the last successful loop iteration:

- `schema-definition.md` and `schema-coverage.json` include every required patch from validation, scripted review, and semantic self-review.
- `schema-definition.validation.json` and `schema-definition.review.json` were regenerated after those patches.
- `schema-definition-loop.md` records the findings fixed, patches made, remaining accepted warnings, and final stop condition.
- Do not hand off a schema draft plus a separate review that still requires manual reconciliation. Review-driven fixes must be incorporated into the final files.

## Iterative Review Loop

For large or implementation-critical schema definitions, do not stop at one review if the output has errors, unexplained warnings, or semantic gaps. Use a bounded loop:

1. Run validation and review.
2. Read `schema-definition.validation.json`, `schema-definition.review.json`, and `schema-definition-review.md`.
3. Perform semantic self-review against `schema-definition.md`, `schema-coverage.json`, `feature-definition.md`, and `feature-coverage.json`.
4. Classify findings:
   - `error`: must revise `schema-definition.md` or `schema-coverage.json`.
   - `warning`: revise unless it is intentionally accepted and explained.
   - `info`: record only.
5. Patch the final deliverable files. Do not leave the fix only in the review document.
6. Append a short entry to `schema-definition-loop.md` with iteration number, commands run, static findings, semantic findings, changes, and remaining accepted warnings.
7. Rerun validation and review after the patch.
8. Stop only when validation passes, review has no errors, semantic self-review has no unresolved findings, and the patched `schema-definition.md` / `schema-coverage.json` are the current files on disk. If warnings remain, each warning category must have an explicit acceptance rationale in `schema-definition-loop.md`.

Default loop budget is 3 iterations. Increase to 5 only when review errors remain and the source material is broad enough to justify more passes.

Dedicated Codex prompt:

```text
/prompts:builder-schema-definition-loop PROJECT_NAME="aiga" MAX_ITERS="3"
```

## Quality Bar

- ERD is readable and complete enough for implementation planning.
- Schema codes are stable and referenced by downstream API/screen definition work.
- Field names are implementation-facing.
- Product Builder Base reuse is concrete: path/export/table where possible.
- The artifact avoids PRD prose and avoids endpoint definitions. API paths belong in API Definition, not Schema Definition.
- The final checked-in/output schema files are post-review patched files, with loop evidence showing how findings were fixed or accepted.

---
description: "Create schema-definition.md from feature-definition.md"
argument-hint: "PROJECT_NAME=\"aiga\" [RUN_DIR=\"\"] [EXTRA_CONTEXT=\"\"]"
---

Use `$bbr-schema-definition`.

All arguments: `$ARGUMENTS`

Create a schema definition for the project. If `PROJECT_NAME` is not supplied, use `aiga`.

This workflow starts after the feature definition is already complete. Do not ask for app-area selection again; read the existing `feature-definition-scope.json` and preserve its selected scope and extra context.

From `<repo-root>`, run:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-schema-definition/scripts/prepare-schema-analysis.ts \
  --project-name "<PROJECT_NAME or aiga>"
```

If `RUN_DIR` is supplied, use `--run-dir "<RUN_DIR>"` instead of resolving latest-run by project name.

Then:

1. Read `schema-definition-work/schema-analysis-input.json`, `schema-definition-work/schema-workflow.md`, `feature-definition.md`, `feature-coverage.json`, and `feature-definition-scope.json`.
2. Build a data-entity inventory from every `FEA-###`. Merge scattered requirements into the same schema when they share lifecycle and ownership.
3. Compare schema candidates against `/Users/bright/Projects/product-builder-base/packages/drizzle/src/schema`.
   - Prefer codebase-memory MCP architecture/search tools when available.
   - Fallback to local file reads only when graph tools are unavailable or insufficient.
   - Record concrete `packagePath`, `exportName`, `tableName`, and reuse decision.
4. Write `<runDir>/schema-definition.md` using the schema-definition shape:
   - `# 스키마 정의서(Schema Definition) - <project>`
   - `## 1. 전체 ERD(Mermaid Entity Relationship Diagram)`
   - Mermaid `erDiagram`
   - `## 2. 기능별 ERD(Feature ERD)`
   - `## 3. 기능, 참고, 재사용, 마이그레이션 설명(Feature, Reference, Reuse & Migration Notes)`
   - `### 3.1 기능 기준 스키마 매핑(Feature-to-Schema Matrix)`
   - `### 3.2 Product Builder Base 구성 범위(Component Scope)`
   - `### 3.3 기준 코드베이스(Base Drizzle Baseline)`
   - `### 3.4 스키마별 참고/재사용/마이그레이션(Per-Schema Reference & Reuse)`
   - `### 3.5 Mermaid 스키마 필드 정의(Type, Name, Description, Default)`
5. Write `<runDir>/schema-coverage.json` with `schemas`, `featureSchemaMappings`, and `unmappedFeatures`.
   - Every field must include `name`, `type`, `required`, `description`, and `defaultValue`.
   - If no DB default exists, write an explicit default such as `없음` or `null`.
   - The Markdown must expose type, name, description, and default in Mermaid, not only prose tables.
6. Run validation:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-schema-definition/scripts/validate-schema-definition.ts \
  --project-name "<PROJECT_NAME or aiga>"
```

7. Run review:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-schema-definition/scripts/review-schema-definition.ts \
  --project-name "<PROJECT_NAME or aiga>"
```

After review, perform an agent semantic self-review and patch the final deliverable files. Do not report completion with a draft plus a review document that still requires manual reconciliation.

Mandatory finalization loop:

1. Run validation and review.
2. Read `schema-definition.validation.json`, `schema-definition.review.json`, and `schema-definition-review.md`.
3. Perform semantic self-review against `schema-definition.md`, `schema-coverage.json`, `feature-definition.md`, and `feature-coverage.json`.
4. Patch `schema-definition.md` and `schema-coverage.json` for every validation, scripted review, and semantic self-review finding that is not intentionally accepted.
5. Append the iteration summary to `schema-definition-loop.md`.
6. Rerun validation and review after patching.
7. Stop only when the current on-disk `schema-definition.md` and `schema-coverage.json` are the post-review revised artifacts, validation/review pass, and unresolved semantic findings are 0.

If warnings remain, accept them only with an explicit rationale in `schema-definition-loop.md`.

Use only these schema reuse decisions: `REUSE`, `EXTEND`, `NEW`, `N/A`, `UNDECIDED`.

Respect the current Aiga scope: AI chat generation/recommendation logic is external REST API integration only; do not create internal `ai-runtime` schemas.

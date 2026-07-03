---
description: "Create OpenAPI api-definition from feature and schema definitions"
argument-hint: "PROJECT_NAME=\"aiga\" [RUN_DIR=\"\"]"
---

Use `$bbr-api-definition`.

All arguments: `$ARGUMENTS`

Create an API definition for the project. If `PROJECT_NAME` is not supplied, use `aiga`.

This workflow starts after the schema definition is complete. Do not ask for app-area selection again; read the existing `feature-definition-scope.json` and preserve its selected scope and extra context.

From `<repo-root>`, run:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-api-definition/scripts/prepare-api-analysis.ts \
  --project-name "<PROJECT_NAME or aiga>"
```

If `RUN_DIR` is supplied, use `--run-dir "<RUN_DIR>"` instead of resolving latest-run by project name.

Then:

1. Read `api-definition-work/api-analysis-input.json`, `api-definition-work/api-workflow.md`, `feature-definition.md`, `feature-coverage.json`, `schema-definition.md`, `schema-coverage.json`, and `feature-definition-scope.json`.
2. Generate the initial OpenAPI/API coverage artifacts:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-api-definition/scripts/generate-api-definition.ts \
  --project-name "<PROJECT_NAME or aiga>"
```

If `RUN_DIR` is supplied, use `--run-dir "<RUN_DIR>"`.

3. Build or refine implementation-facing REST operations from every `FEA-###`. Merge scattered screen requirements into the same endpoint when they share lifecycle and ownership.
4. Compare API candidates against `/Users/bright/Projects/product-builder-base/packages/features/*/controller`, `service`, and `dto`.
   - Prefer codebase-memory MCP architecture/search tools when available.
   - Fallback to local file reads only when graph tools are unavailable or insufficient.
   - Record concrete `packagePath`, `controllerPath`, `servicePath`, `dtoPath`, and reuse decision.
5. Write `<runDir>/api-definition.openapi.yaml` as OpenAPI 3.1. This is the primary API definition artifact.
6. Also write `<runDir>/api-definition.openapi.json`, `<runDir>/api-definition.md`, and `<runDir>/api-coverage.json`.
7. OpenAPI `tags` must be feature-based: `FEA-### <feature name>`. Do not group YAML tags by broad domain labels such as `Community` or `Admin`; keep those only in `x-domain-tag`.
8. Every OpenAPI operation must include `x-api-code`, `x-domain-tag`, `x-feature-codes`, `x-schema-codes`, `x-base-reuse-decision`, `x-base-feature-references`, and `x-audit-action`.
9. Run validation:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-api-definition/scripts/validate-api-definition.ts \
  --project-name "<PROJECT_NAME or aiga>"
```

10. Run review:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-api-definition/scripts/review-api-definition.ts \
  --project-name "<PROJECT_NAME or aiga>"
```

After review, perform an agent semantic self-review and patch the final deliverable files. Do not report completion with a draft plus a review document that still requires manual reconciliation.

Mandatory finalization loop:

1. Run validation and review.
2. Read `api-definition.validation.json`, `api-definition.review.json`, and `api-definition-review.md`.
3. Perform semantic self-review against `api-definition.openapi.yaml`, `api-coverage.json`, `feature-definition.md`, `feature-coverage.json`, `schema-definition.md`, and `schema-coverage.json`.
4. Patch `api-definition.openapi.yaml`, `api-definition.openapi.json`, `api-definition.md`, and `api-coverage.json` for every validation, scripted review, and semantic self-review finding that is not intentionally accepted.
5. Append the iteration summary to `api-definition-loop.md`.
6. Rerun validation and review after patching.
7. Stop only when the current on-disk OpenAPI, Markdown, and coverage files are the post-review revised artifacts, validation/review pass, and unresolved semantic findings are 0.

If warnings remain, accept them only with an explicit rationale in `api-definition-loop.md`.

Use only these API reuse decisions: `REUSE`, `EXTEND`, `NEW`, `N/A`, `UNDECIDED`.

Respect the current Aiga scope: AI chat generation/recommendation logic is external REST API integration only; do not create internal AI runtime endpoints.

---
name: bbr-api-definition
description: Use after BBR schema definition to create api-definition.openapi.yaml, api-definition.md, and api-coverage.json from feature-definition.md, feature-coverage.json, schema-definition.md, and schema-coverage.json. Produces API Definition artifacts with OpenAPI 3.1 paths, feature/schema traceability, product-builder-base reuse decisions, and review loops.
---

# BBR API Definition

Create an API definition from completed feature and schema definitions.

This is the next step after `$bbr-schema-definition`. It produces the API definition artifact contract, with OpenAPI as the primary artifact:

1. Read `feature-definition.md`, `feature-coverage.json`, `schema-definition.md`, and `schema-coverage.json`.
2. Build a REST endpoint inventory from every feature group.
3. Merge duplicate endpoints across screens/features into implementation-facing API operations.
4. Assign stable `API-###` operation codes.
5. Write OpenAPI 3.1 with paths, methods, params, request bodies, responses, error responses, tags, auth, operation ids, and `x-*` traceability extensions.
6. Compare each operation with `product-builder-base` controller/service/dto packages and classify reuse.
7. Write the first draft `api-definition.openapi.yaml` as the primary spec.
8. Write the first draft `api-definition.md` as a readable index and review document.
9. Write the first draft `api-coverage.json` for downstream automation.
10. Validate and review.
11. Perform agent semantic self-review.
12. Patch `api-definition.openapi.yaml`, `api-definition.openapi.json`, `api-definition.md`, and `api-coverage.json` based on validation, scripted review, and semantic self-review findings.
13. Rerun validation and review after patching. The handoff files must be the post-review revised artifacts, not the first draft.

## Required Inputs

Use the latest source-intake run for the project unless `--run-dir` is supplied.

Required files:

- `feature-definition.md`
- `feature-coverage.json`
- `feature-definition-scope.json`
- `schema-definition.md`
- `schema-coverage.json`
- `source-material.md`

If `schema-definition.md` or `schema-coverage.json` is missing, run `$bbr-schema-definition` first.

## Output Files

Write these files into the same run directory:

- `api-definition.openapi.yaml`
- `api-definition.openapi.json`
- `api-definition.md`
- `api-coverage.json`
- `api-definition.validation.json`
- `api-definition.review.json`
- `api-definition-review.md`
- `api-definition-loop.md`

## OpenAPI Rules

The OpenAPI artifact is the source of truth.

- Use `openapi: 3.1.0`.
- Paths include the `/api` prefix.
- Use feature-based OpenAPI tags. Top-level tags and operation `tags` must use `FEA-### <feature name>`, not domain buckets such as `Community` or `Admin`.
- Keep the previous domain grouping only as `x-domain-tag` when it helps navigation.
- Every operation must include:
  - `operationId`
  - `summary`
  - `tags`
  - `responses`
  - `x-api-code`
  - `x-domain-tag`
  - `x-feature-codes`
  - `x-schema-codes`
  - `x-base-reuse-decision`
  - `x-base-feature-references`
  - `x-audit-action`
- Authenticated user operations use `security: [{ bearerAuth: [] }]`.
- Admin operations use bearer auth plus `x-required-role: admin`.
- Provider callbacks are tagged and marked with `x-actor: provider`.
- Do not create internal `ai-runtime` endpoints when the selected scope excludes it.
- External AI chat must be represented as a server/site API contract that calls an external REST API, not as internal generation/runtime implementation.

Use reuse decisions only from:

- `REUSE`
- `EXTEND`
- `NEW`
- `N/A`
- `UNDECIDED`

## API Coverage JSON

`api-coverage.json` must include:

```json
{
  "projectName": "aiga",
  "sourceFeatureDefinition": "feature-definition.md",
  "sourceSchemaDefinition": "schema-definition.md",
  "apis": [
    {
      "code": "API-001",
      "method": "GET",
      "path": "/api/me",
      "operationId": "getMe",
      "summary": "현재 사용자 세션과 등급 조회",
      "actor": "member",
      "auth": "bearer",
      "sourceFeatureCodes": ["FEA-001", "FEA-002"],
      "schemaCodes": ["SCH-001"],
      "baseReuseDecision": "EXTEND",
      "baseFeatureReferences": [
        {
          "packagePath": "packages/features/_common",
          "moduleName": "CommonFeatureModule",
          "controllerPath": "packages/features/_common/controller/user-profile.controller.ts",
          "servicePath": "packages/features/_common/service/user-profile.service.ts",
          "dtoPath": "packages/features/_common/dto/index.ts",
          "providedBy": "product-builder-base",
          "reuseDecision": "EXTEND",
          "customizationScope": "Aiga 회원 등급과 의사 인증 상태를 응답에 추가",
          "note": "base user profile endpoint를 세션/권한 컨텍스트로 확장"
        }
      ],
      "serverExposure": "apps/server REST /api",
      "customizationScope": "회원 등급과 권한 플래그 추가",
      "implementationNotes": ["Better Auth session을 기준으로 사용자 컨텍스트를 구성한다."],
      "input": "Authorization bearer token",
      "output": "UserSessionResponse",
      "errors": [{ "code": "401", "condition": "인증 토큰 없음 또는 만료" }],
      "auditAction": "none",
      "acceptanceCriteria": ["로그인 사용자는 본인의 등급, 인증 상태, 권한 플래그를 받을 수 있다."]
    }
  ],
  "featureApiMappings": [
    {
      "featureId": "FEA-001",
      "featureName": "회원 등급 및 권한 정책",
      "apiCodes": ["API-001"],
      "defaultDecision": "EXTEND",
      "baseFeatureApiCandidates": ["packages/features/_common/controller/user-profile.controller.ts"]
    }
  ],
  "schemaApiMappings": [
    {
      "schemaCode": "SCH-001",
      "schemaName": "회원 계정과 등급",
      "apiCodes": ["API-001"]
    }
  ],
  "unmappedFeatures": []
}
```

## Workflow

1. Prepare API analysis:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-api-definition/scripts/prepare-api-analysis.ts \
  --project-name "<project-name>"
```

Use `--run-dir "<runDir>"` when targeting a specific run.

2. Read:

- `api-definition-work/api-analysis-input.json`
- `api-definition-work/api-workflow.md`
- `feature-definition.md`
- `feature-coverage.json`
- `schema-definition.md`
- `schema-coverage.json`

3. For the current Aiga/product-builder-base workflow, generate the initial OpenAPI artifact:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-api-definition/scripts/generate-api-definition.ts \
  --project-name "<project-name>"
```

Use `--run-dir "<runDir>"` when targeting a specific run.

4. Build or refine the API inventory:

- Extract server contracts, not screen events.
- Merge duplicate operations across screens.
- Keep admin operations under `/api/admin/*`.
- Keep site/user operations under `/api/*`.
- Connect every operation to one or more `FEA-###` feature ids.
- Connect every persisted operation to one or more `SCH-###` schema ids.
- Use `N/A` only when an endpoint is truly external/pass-through and does not touch persisted project state.

5. Compare with `product-builder-base`:

- Prefer codebase-memory MCP architecture/search tools when available.
- Fallback to local file reads when graph tools are unavailable or insufficient.
- Check `product-builder-base:packages/features/*/controller`, `service`, and `dto`.
- Record concrete package/controller/service/dto references for `REUSE` and `EXTEND`.
- Use `NEW` when no real base controller or service exists.

6. Write:

- `api-definition.openapi.yaml`
- `api-definition.openapi.json`
- `api-definition.md`
- `api-coverage.json`

7. Validate:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-api-definition/scripts/validate-api-definition.ts \
  --project-name "<project-name>"
```

8. Review:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-api-definition/scripts/review-api-definition.ts \
  --project-name "<project-name>"
```

9. Semantic self-review:

Check at least:

- Every feature is mapped to APIs or explicitly listed in `unmappedFeatures` with a reason.
- Every operation has a valid OpenAPI path/method and operation id.
- OpenAPI `x-feature-codes`, `x-schema-codes`, and coverage JSON agree.
- Admin mutating operations have an audit action.
- Product Builder Base reuse references are concrete for `REUSE` and `EXTEND`.
- External AI chat does not imply internal `ai-runtime` implementation.
- No schema-only table has unnecessary APIs.

Append findings to `api-definition-loop.md`, patch artifacts, then rerun validation and review.

The final deliverable state is defined by the last successful loop iteration:

- `api-definition.openapi.yaml`, `api-definition.openapi.json`, `api-definition.md`, and `api-coverage.json` include every required patch from validation, scripted review, and semantic self-review.
- `api-definition.validation.json` and `api-definition.review.json` were regenerated after those patches.
- `api-definition-loop.md` records the findings fixed, patches made, remaining accepted warnings, and final stop condition.
- Do not hand off an OpenAPI draft plus a separate review that still requires manual reconciliation. Review-driven fixes must be incorporated into the final OpenAPI and coverage files.

## Iterative Review Loop

For large or implementation-critical API definitions, do not stop at one review if the output has errors, unexplained warnings, or semantic gaps. Use a bounded loop:

1. Run validation and review.
2. Read `api-definition.validation.json`, `api-definition.review.json`, and `api-definition-review.md`.
3. Perform semantic self-review against `api-definition.openapi.yaml`, `api-coverage.json`, `feature-definition.md`, `feature-coverage.json`, `schema-definition.md`, and `schema-coverage.json`.
4. Classify findings:
   - `error`: must revise OpenAPI, Markdown index, or coverage JSON.
   - `warning`: revise unless it is intentionally accepted and explained.
   - `info`: record only.
5. Patch the final deliverable files. Do not leave the fix only in the review document.
6. Append a short entry to `api-definition-loop.md` with iteration number, commands run, static findings, semantic findings, changes, and remaining accepted warnings.
7. Rerun validation and review after the patch.
8. Stop only when validation passes, review has no errors, semantic self-review has no unresolved findings, and the patched OpenAPI/coverage/Markdown files are the current files on disk. If warnings remain, each warning category must have an explicit acceptance rationale in `api-definition-loop.md`.

Default loop budget is 3 iterations. Increase to 5 only when review errors remain and the source material is broad enough to justify more passes.

Dedicated Codex prompt:

```text
/prompts:builder-api-definition-loop PROJECT_NAME="aiga" MAX_ITERS="3"
```

## Quality Bar

- OpenAPI can be consumed by implementation, QA, and future codegen.
- API codes are stable and referenced by downstream screen definition/task work.
- Endpoint shapes are implementation-facing, not loose PRD prose.
- Product Builder Base reuse is concrete: package/controller/service/dto where possible.
- The artifact avoids database field design. Schema details belong in Schema Definition.
- The final OpenAPI and coverage files are post-review patched files, with loop evidence showing how findings were fixed or accepted.

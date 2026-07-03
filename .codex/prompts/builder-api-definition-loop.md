---
description: "Iteratively refine OpenAPI API definition until validation and review pass"
argument-hint: "PROJECT_NAME=\"aiga\" [RUN_DIR=\"\"] [MAX_ITERS=\"3\"]"
---

Use `$bbr-api-definition`.

All arguments: `$ARGUMENTS`

Run an iterative review loop for an API definition. If `PROJECT_NAME` is not supplied, use `aiga`. If `MAX_ITERS` is not supplied, use 3.

From `<repo-root>`:

1. Resolve the project run from `latest-run.json`, or use `RUN_DIR` if supplied.
2. If `api-definition.openapi.yaml` or `api-coverage.json` is missing, first perform `/prompts:builder-api-definition`.
3. For each iteration from 1 to `MAX_ITERS`:
   - Run `validate-api-definition.ts`.
   - Run `review-api-definition.ts`.
   - Read `api-definition.validation.json`, `api-definition.review.json`, and `api-definition-review.md`.
   - Patch `api-definition.openapi.yaml`, `api-definition.openapi.json`, `api-definition.md`, and/or `api-coverage.json` for validation errors. Fixes must be in these final deliverable files, not only described in the review Markdown.
   - Patch wrong feature mappings, missing schema mappings, missing reuse references, admin mutation audit gaps, weak request/response contracts, and any operation that implies excluded internal AI implementation.
   - Perform semantic self-review against `feature-definition.md`, `feature-coverage.json`, `schema-definition.md`, and `schema-coverage.json`.
   - Append an entry to `<runDir>/api-definition-loop.md` with: iteration number, commands run, static findings summary, semantic findings summary, patches made, remaining accepted warnings, and whether the current on-disk deliverables are post-review revised.
   - Rerun validation and review after patching before deciding to stop.
4. Stop early when validation and review both pass, semantic self-review has no unresolved findings, and current OpenAPI, Markdown, and coverage files already include the review-driven fixes.
5. Report final paths for `api-definition.openapi.yaml`, `api-definition.openapi.json`, `api-definition.md`, `api-coverage.json`, `api-definition-review.md`, `api-definition.review.json`, `api-definition.validation.json`, and `api-definition-loop.md`.

Commands:

```bash
cd <repo-root>
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-api-definition/scripts/validate-api-definition.ts \
  --project-name "<PROJECT_NAME or aiga>"
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-api-definition/scripts/review-api-definition.ts \
  --project-name "<PROJECT_NAME or aiga>"
```

If `RUN_DIR` is supplied, use `--run-dir "<RUN_DIR>"`.

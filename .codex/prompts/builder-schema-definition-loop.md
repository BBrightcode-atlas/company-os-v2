---
description: "Iteratively refine schema-definition.md until validation and review pass"
argument-hint: "PROJECT_NAME=\"aiga\" [RUN_DIR=\"\"] [MAX_ITERS=\"3\"]"
---

Use `$bbr-schema-definition`.

All arguments: `$ARGUMENTS`

Run an iterative review loop for a schema definition. If `PROJECT_NAME` is not supplied, use `aiga`. If `MAX_ITERS` is not supplied, use 3.

From `<repo-root>`:

1. Resolve the project run from `latest-run.json`, or use `RUN_DIR` if supplied.
2. If `schema-definition.md` or `schema-coverage.json` is missing, first perform `/prompts:builder-schema-definition`.
3. For each iteration from 1 to `MAX_ITERS`:
   - Run `validate-schema-definition.ts`.
   - Run `review-schema-definition.ts`.
   - Read `schema-definition.validation.json`, `schema-definition.review.json`, and `schema-definition-review.md`.
   - Patch `schema-definition.md` and/or `schema-coverage.json` for validation errors. Fixes must be in these final deliverable files, not only described in the review Markdown.
   - Patch wrong feature mappings, missing reuse references, overloaded tables, weak relations, missing field details, missing default values, and any table that implies excluded `ai-runtime` implementation.
   - Perform semantic self-review against `feature-definition.md` and `feature-coverage.json`.
   - Append an entry to `<runDir>/schema-definition-loop.md` with: iteration number, commands run, static findings summary, semantic findings summary, patches made, remaining accepted warnings, and whether the current on-disk deliverables are post-review revised.
   - Rerun validation and review after patching before deciding to stop.
4. Stop early when validation and review both pass, semantic self-review has no unresolved findings, and current `schema-definition.md` and `schema-coverage.json` already include the review-driven fixes.
5. Report final paths for `schema-definition.md`, `schema-coverage.json`, `schema-definition-review.md`, `schema-definition.review.json`, `schema-definition.validation.json`, and `schema-definition-loop.md`.

Commands:

```bash
cd <repo-root>
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-schema-definition/scripts/validate-schema-definition.ts \
  --project-name "<PROJECT_NAME or aiga>"
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-schema-definition/scripts/review-schema-definition.ts \
  --project-name "<PROJECT_NAME or aiga>"
```

If `RUN_DIR` is supplied, use `--run-dir "<RUN_DIR>"`.

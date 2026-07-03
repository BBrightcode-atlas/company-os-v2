---
description: "Iteratively refine feature-centered screen-definition documents until validation and review pass"
argument-hint: "PROJECT_NAME=\"aiga\" [RUN_DIR=\"\"] [MAX_ITERS=\"3\"]"
---

Use `$bbr-screen-definition`.

All arguments: `$ARGUMENTS`

Run an iterative review loop for screen definitions. If `PROJECT_NAME` is not supplied, use `aiga`. If `MAX_ITERS` is not supplied, use 3.

From `<repo-root>`:

1. Resolve the project run from `latest-run.json`, or use `RUN_DIR` if supplied.
2. If `screen-coverage.json`, `screen-definition.md`, or `screen-definitions/screen-definition-index.md` is missing, first perform `/prompts:builder-screen-definition`.
3. For each iteration from 1 to `MAX_ITERS`:
   - Run `validate-screen-definition.ts`.
   - Run `review-screen-definition.ts`.
   - Read `screen-definition.validation.json`, `screen-definition.review.json`, and `screen-definition-review.md`.
   - Patch detailed screen docs, `screen-definition.md`, `screen-definitions/screen-definition-index.md`, and/or `screen-coverage.json` for validation errors. Fixes must be in these final deliverable files, not only described in the review Markdown.
   - Patch wrong feature mappings, missing API mappings, missing schema references, mixed target surfaces, missing states, missing action test ids, weak QA cases, stale UX diagrams, and any screen that implies excluded internal AI runtime behavior.
   - Perform semantic self-review against `feature-definition.md`, `feature-coverage.json`, `schema-definition.md`, `schema-coverage.json`, `api-definition.md`, `api-coverage.json`, and relevant source chunks.
   - Append an entry to `<runDir>/screen-definition-loop.md` with: iteration number, commands run, static findings summary, semantic findings summary, patches made, remaining accepted warnings, and whether the current on-disk deliverables are post-review revised.
   - Rerun validation and review after patching before deciding to stop.
4. Stop early when validation and review both pass, semantic self-review has no unresolved findings, and current screen docs, index, aggregate Markdown, and coverage JSON already include the review-driven fixes.
5. Report final paths for `screen-definition.md`, `screen-definitions/screen-definition-index.md`, `screen-coverage.json`, `screen-definition-review.md`, `screen-definition.review.json`, `screen-definition.validation.json`, and `screen-definition-loop.md`.

Commands:

```bash
cd <repo-root>
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-screen-definition/scripts/validate-screen-definition.ts \
  --workflow feature-implementation \
  --project-name "<PROJECT_NAME or aiga>"
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-screen-definition/scripts/review-screen-definition.ts \
  --workflow feature-implementation \
  --project-name "<PROJECT_NAME or aiga>"
```

If `RUN_DIR` is supplied, use `--run-dir "<RUN_DIR>"`.

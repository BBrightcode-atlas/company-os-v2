---
description: "Iteratively refine Figma-first screen-definition baseline artifacts until validation, Figma coverage, and review pass"
argument-hint: "PROJECT_NAME=\"aiga\" [RUN_DIR=\"\"] [MAX_ITERS=\"3\"]"
---

Use `$bbr-figma-screen-definition`.

All arguments: `$ARGUMENTS`

Run an iterative review loop for Figma screen baseline artifacts. If `PROJECT_NAME` is not supplied, use `aiga`. If `MAX_ITERS` is not supplied, use 3.

This loop is only for `figma-screen-definition.md` artifacts. Do not patch `screen-definition.md` from this prompt.

From `<repo-root>`:

1. Resolve the project run from `latest-run.json`, or use `RUN_DIR` if supplied.
2. If `figma-screen-coverage.json`, `figma-screen-definition.md`, or `figma-screen-definitions/figma-screen-definition-index.md` is missing, first perform `/prompts:builder-figma-screen-definition`.
3. For each iteration from 1 to `MAX_ITERS`:
   - Run `validate-screen-definition.ts --workflow figma-baseline`.
   - Run `review-screen-definition.ts --workflow figma-baseline`.
   - Read `figma-screen-definition.validation.json`, `figma-screen-definition.review.json`, and `figma-screen-definition-review.md`.
   - Patch detailed Figma screen docs, `figma-screen-definition.md`, `figma-screen-definitions/figma-screen-definition-index.md`, and/or `figma-screen-coverage.json` for validation errors.
   - Patch missing Figma node mappings, weak Figma implementation notes, guessed visual values, wrong feature/API/schema mappings, mixed target surfaces, missing states, missing action test ids, weak QA cases, stale UX diagrams, and excluded internal AI runtime behavior.
   - Perform semantic self-review against Figma nodes in `figma-screen-definition-work/screen-analysis-input.json`, `feature-definition.md`, `feature-coverage.json`, `schema-definition.md`, `schema-coverage.json`, `api-definition.md`, `api-coverage.json`, and relevant source chunks.
   - Append an entry to `<runDir>/figma-screen-definition-loop.md` with: iteration number, commands run, static findings summary, semantic findings summary, patches made, remaining accepted warnings, and whether the current on-disk Figma deliverables are post-review revised.
   - Rerun validation and review after patching before deciding to stop.
4. Stop early when validation and review both pass, Figma coverage has no unmapped required node, semantic self-review has no unresolved findings, and current Figma docs, index, aggregate Markdown, and coverage JSON already include the review-driven fixes.
5. Report final paths for `figma-screen-definition.md`, `figma-screen-definitions/figma-screen-definition-index.md`, `figma-screen-coverage.json`, `figma-screen-definition-review.md`, `figma-screen-definition.review.json`, `figma-screen-definition.validation.json`, and `figma-screen-definition-loop.md`.

Commands:

```bash
cd <repo-root>
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-screen-definition/scripts/validate-screen-definition.ts \
  --workflow figma-baseline \
  --project-name "<PROJECT_NAME or aiga>"
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-screen-definition/scripts/review-screen-definition.ts \
  --workflow figma-baseline \
  --project-name "<PROJECT_NAME or aiga>"
```

If `RUN_DIR` is supplied, use `--run-dir "<RUN_DIR>"`.

---
description: "Iteratively refine feature-definition.md until validation and review pass"
argument-hint: "PROJECT_NAME=\"aiga\" [APP_AREAS=\"admin,app,server,ai-runtime\"] [EXTRA_CONTEXT=\"\"] [RUN_DIR=\"\"] [MAX_ITERS=\"3\"]"
---

Use `$bbr-feature-definition`.

All arguments: `$ARGUMENTS`

Run an iterative review loop for a feature definition. If `PROJECT_NAME` is not supplied, use `aiga`. If `MAX_ITERS` is not supplied, use 3.

From `<repo-root>`:

1. Resolve the project run. If `APP_AREAS` is supplied, update scope before looping:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-feature-definition/scripts/configure-feature-scope.ts \
  --project-name "<PROJECT_NAME or aiga>" \
  --areas "<APP_AREAS>" \
  --notes "<EXTRA_CONTEXT or empty>"
```

If `APP_AREAS` is not supplied, read the existing `feature-definition-scope.json`. If it does not exist, use the runtime's interactive user-input UI as a checkbox/multi-select picker when available:

- Prompt: `기능정의서 보완 loop에 포함할 apps 범위를 선택해주세요.`
- Options: `admin`, `site`, `server`, `app`, `ai-runtime`
- Default/preselected values when supported: `admin`, `app`, `server`, `ai-runtime`
- Also collect optional free-text extra context.

Then configure scope with the selected values before looping. If the current Codex surface exposes no checkbox/multi-select input tool, ask the same questions in chat and wait for the answer; do not infer scope silently.

2. If `feature-definition.md` or `feature-coverage.json` is missing, first perform the normal feature-definition workflow from `/prompts:builder-feature-definition`.
3. For each iteration from 1 to `MAX_ITERS`:
   - Run `validate-feature-definition.ts`.
   - Run `review-feature-definition.ts`.
   - Read `feature-definition-scope.json`.
   - Read `feature-definition.validation.json` and `feature-definition.review.json`.
   - If validation has errors, patch `feature-definition.md`.
   - If review has errors, patch `feature-definition.md` or `feature-coverage.json`.
   - If review has warnings, inspect whether they are fixable. Fix wrong area classification, duplicate feature groups, overbroad source mappings, and suspicious unmapped chunks.
   - Accept a warning only when it is intentional, usually because one source chunk defines a cross-cutting requirement that belongs to multiple feature groups.
   - Perform a semantic self-review by reading `feature-definition.md` directly and checking it against the source chunks referenced in `feature-coverage.json`.
   - In semantic self-review, specifically look for wrong `영역` classification, one row mixing multiple surfaces, source contradictions that need a conflict note, missing user-facing submission flows, rows that are too broad for downstream implementation task extraction, and missing or implausible `product-builder-base` reuse decisions.
   - Every feature must have exactly one `product-builder-base 재사용 판단` table in Markdown and a matching `reuse` object in `feature-coverage.json`.
   - Reuse types must be one of `complete-reuse`, `partial-reuse`, `reuse-with-customization`, `new-implementation`, `not-applicable`.
   - Patch `feature-definition.md` and `feature-coverage.json` for semantic findings. Fixes must be in these final deliverable files, not only described in the review Markdown.
   - Append an entry to `<runDir>/feature-definition-loop.md` with: iteration number, commands run, static findings summary, semantic findings summary, patches made, remaining accepted warnings, and whether the current on-disk deliverables are post-review revised.
   - Rerun validation and review after patching before deciding to stop.
4. Stop early when:
   - validation `ok` is true,
   - review `ok` is true,
   - semantic self-review has no unresolved findings,
   - current `feature-definition.md` and `feature-coverage.json` already include the review-driven fixes,
   - and remaining warnings are explicitly explained in `feature-definition-loop.md`.
5. Report final paths for `feature-definition.md`, `feature-coverage.json`, `feature-definition-review.md`, `feature-definition.review.json`, `feature-definition-loop.md`, and `feature-definition-scope.json`.

Commands:

```bash
cd <repo-root>
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-feature-definition/scripts/validate-feature-definition.ts \
  --project-name "<PROJECT_NAME or aiga>"
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-feature-definition/scripts/review-feature-definition.ts \
  --project-name "<PROJECT_NAME or aiga>"
```

If `RUN_DIR` is supplied, use `--run-dir "<RUN_DIR>"` where the script supports it. The validator accepts `--run-dir`; the reviewer accepts `--run-dir`.

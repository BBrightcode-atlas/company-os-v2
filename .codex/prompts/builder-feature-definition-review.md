---
description: "Review an existing feature-definition.md against source coverage"
argument-hint: "PROJECT_NAME=\"aiga\" [RUN_DIR=\"\"]"
---

Use `$bbr-feature-definition`.

All arguments: `$ARGUMENTS`

Review an existing feature definition for the project. If `PROJECT_NAME` is not supplied, use `aiga`.

From `<repo-root>`, first read `<runDir>/feature-definition-scope.json`. If it does not exist, note that the artifact was produced before scope selection was required.

Run validation first:

```bash
cd <repo-root>
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-feature-definition/scripts/validate-feature-definition.ts \
  --project-name "<PROJECT_NAME or aiga>"
```

If `RUN_DIR` is supplied, use `--run-dir "<RUN_DIR>"` where the script supports it.

Then run the review helper:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-feature-definition/scripts/review-feature-definition.ts \
  --project-name "<PROJECT_NAME or aiga>"
```

Read `feature-definition-review.md` and `feature-definition.review.json`. Then perform semantic self-review against `feature-definition.md`, `feature-coverage.json`, and referenced source chunks.

If there are validation errors, review errors, fixable warnings, or semantic findings, revise `feature-definition.md` or `feature-coverage.json`; append the changes to `feature-definition-loop.md`; rerun validation; then rerun review. Do not leave required fixes only in `feature-definition-review.md`.

Stop only when the current on-disk `feature-definition.md` and `feature-coverage.json` are the post-review revised artifacts and there are no unresolved review or semantic findings.

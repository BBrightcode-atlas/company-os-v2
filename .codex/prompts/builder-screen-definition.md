---
description: "Create feature-centered screen-definition documents from feature/schema/API definitions"
argument-hint: "PROJECT_NAME=\"aiga\" [RUN_DIR=\"\"] [EXTRA_CONTEXT=\"\"]"
---

Use `$bbr-screen-definition`.

All arguments: `$ARGUMENTS`

Create feature-centered screen definitions for the project. If `PROJECT_NAME` is not supplied, use `aiga`.

This workflow starts after the API definition is complete. Do not ask for app-area selection again; read the existing `feature-definition-scope.json` and preserve its selected scope and extra context. This is not the Figma-first workflow; use `/prompts:builder-figma-screen-definition` when Figma nodes are the source of truth.

From `<repo-root>`, run:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-screen-definition/scripts/prepare-screen-analysis.ts \
  --workflow feature-implementation \
  --project-name "<PROJECT_NAME or aiga>"
```

If `RUN_DIR` is supplied, use `--run-dir "<RUN_DIR>"` instead of resolving latest-run by project name.

Then:

1. Read `screen-definition-work/screen-analysis-input.json`, `screen-definition-work/screen-workflow.md`, `feature-definition.md`, `schema-definition.md`, `api-definition.md`, `api-definition.openapi.yaml`, and all coverage JSON files.
2. Read the screen template and writing rules included in the analysis input:
   - `.agents/skills/bbr-screen-definition/templates/deliverables/screen-definition.md`
   - `.agents/skills/bbr-screen-definition/templates/standards/screen-definition-writing-rules.md`
3. Build implementation-facing screens from every UI-relevant `FEA-###`, source screen sections, route clues, admin queues, forms, modals, tabs, and API-consuming flows.
4. Merge duplicate screen candidates by route, tab, modal lifecycle, admin queue purpose, or user task.
5. Do not create screens for pure server behavior.
6. Use screen codes `{SURFACE}-SCR-###`, where surface is `ADMIN`, `SITE`, `APP`, or `LANDING`.
7. Write one document per screen under `<runDir>/screen-definitions/{surface}/`.
8. Write `<runDir>/screen-definitions/screen-definition-index.md`.
9. Write `<runDir>/screen-definition.md` as an aggregate review document.
10. Write `<runDir>/screen-coverage.json` with `screens`, `featureScreenMappings`, `apiScreenMappings`, and `unmappedFeatures`.

Every screen document must follow the screen template sections and include UX flow diagrams:

- `## 1. 기본 정보(Basic Information)`
- `## 2. 참조 계약(Referenced Contracts)`
- `## 3. 화면 구성(Screen Composition)`
- `## 4. 화면 필드(Screen Fields)`
- `## 5. 화면 상태(Screen States)`
- `## 6. 사용자 액션(User Actions)`
- `## 7. UX Flow Diagrams`
- Mermaid `flowchart TD`
- Mermaid `sequenceDiagram`
- `## 8. 화면 QA 인수 기준(Screen QA Acceptance Criteria)`
- `## 9. 미확정(Undecided)`
- `## 10. 해당 없음(N/A)`

Run validation:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-screen-definition/scripts/validate-screen-definition.ts \
  --workflow feature-implementation \
  --project-name "<PROJECT_NAME or aiga>"
```

Run review:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-screen-definition/scripts/review-screen-definition.ts \
  --workflow feature-implementation \
  --project-name "<PROJECT_NAME or aiga>"
```

After review, perform an agent semantic self-review and patch the final deliverable files. Do not report completion with a draft plus a review document that still requires manual reconciliation.

Mandatory finalization loop:

1. Run validation and review.
2. Read `screen-definition.validation.json`, `screen-definition.review.json`, and `screen-definition-review.md`.
3. Perform semantic self-review against screen docs, `screen-coverage.json`, feature/schema/API definitions, and relevant source chunks.
4. Patch screen docs, `screen-definition.md`, `screen-definitions/screen-definition-index.md`, and `screen-coverage.json` for every validation, scripted review, and semantic self-review finding that is not intentionally accepted.
5. Append the iteration summary to `screen-definition-loop.md`.
6. Rerun validation and review after patching.
7. Stop only when the current on-disk screen docs, index, aggregate Markdown, and coverage JSON are the post-review revised artifacts, validation/review pass, and unresolved semantic findings are 0.

If warnings remain, accept them only with an explicit rationale in `screen-definition-loop.md`.

Use `/prompts:builder-screen-definition-loop PROJECT_NAME="<PROJECT_NAME or aiga>" MAX_ITERS="3"` when review findings need multiple refinement passes.

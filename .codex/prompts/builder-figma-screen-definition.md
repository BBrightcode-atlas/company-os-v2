---
description: "Create Figma-first screen-definition baseline artifacts from supplied Figma nodes"
argument-hint: "PROJECT_NAME=\"aiga\" FIGMA_LINKS_FILE=\"generated/source-intake/aiga/figma-screens.md\" [RUN_DIR=\"\"] [MAX_ITERS=\"3\"]"
---

Use `$bbr-figma-screen-definition`.

All arguments: `$ARGUMENTS`

Create Figma-first screen definition baseline artifacts for the project. If `PROJECT_NAME` is not supplied, use `aiga`. If `FIGMA_LINKS_FILE` is not supplied for AIGA, use `generated/source-intake/aiga/figma-screens.md`.

This workflow is explicitly separate from `/prompts:builder-screen-definition`. It creates `figma-screen-definition.md` artifacts and must not overwrite `screen-definition.md`.

From `<repo-root>`, run:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-screen-definition/scripts/prepare-screen-analysis.ts \
  --workflow figma-baseline \
  --project-name "<PROJECT_NAME or aiga>" \
  --figma-links-file "<FIGMA_LINKS_FILE>"
```

If `RUN_DIR` is supplied, add `--run-dir "<RUN_DIR>"`.

Then:

1. Read `figma-screen-definition-work/screen-analysis-input.json`, `figma-screen-definition-work/screen-workflow.md`, `feature-definition.md`, `schema-definition.md`, `api-definition.md`, `api-definition.openapi.yaml`, and all coverage JSON files.
2. Read the Figma screen template and writing rules included in the analysis input:
   - `.agents/skills/bbr-screen-definition/templates/deliverables/figma-screen-definition.md`
   - `.agents/skills/bbr-screen-definition/templates/standards/figma-screen-definition-writing-rules.md`
3. Build screens from the supplied Figma nodes first, then enrich with feature/schema/API/source evidence.
4. Merge duplicate Figma nodes by route, tab, modal lifecycle, state variant, or user task.
5. Every supplied Figma node must be mapped to a screen/state/modal/tab or listed in `unmappedFigmaNodes` with a reason.
6. Do not create screens for pure server behavior.
7. Use screen codes `{SURFACE}-SCR-###`, where surface is `ADMIN`, `SITE`, `APP`, or `LANDING`.
8. Write one document per screen under `<runDir>/figma-screen-definitions/{surface}/`.
9. Write `<runDir>/figma-screen-definitions/figma-screen-definition-index.md`.
10. Write `<runDir>/figma-screen-definition.md` as the aggregate Figma baseline document.
11. Write `<runDir>/figma-screen-coverage.json` with `screens`, `featureScreenMappings`, `apiScreenMappings`, `unmappedFeatures`, `figmaNodes`, and `unmappedFigmaNodes`.

Every Figma screen document must include:

- `## 1. 기본 정보(Basic Information)`
- `## 2. Figma 구현 기준(Figma Implementation Baseline)`
- `## 3. 참조 계약(Referenced Contracts)`
- `## 4. 화면 구성(Screen Composition)`
- `## 5. 화면 필드(Screen Fields)`
- `## 6. 화면 상태(Screen States)`
- `## 7. 사용자 액션(User Actions)`
- `## 8. UX Flow Diagrams`
- Mermaid `flowchart TD`
- Mermaid `sequenceDiagram`
- `## 9. 화면 QA 인수 기준(Screen QA Acceptance Criteria)`
- `## 10. 미확정(Undecided)`
- `## 11. 해당 없음(N/A)`

Figma rules:

- Treat supplied Figma nodes as the visual/layout source of truth.
- Capture exact layout, spacing, typography, color, component, asset, responsive, and state details only when they are visible in Figma or supplied export data.
- If the agent cannot inspect Figma directly, do not guess visual values. Document the access/export gap in the Figma section and `figma-screen-coverage.json`.
- Do not redefine API request/response schemas or DB fields.

Run validation:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-screen-definition/scripts/validate-screen-definition.ts \
  --workflow figma-baseline \
  --project-name "<PROJECT_NAME or aiga>"
```

Run review:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-screen-definition/scripts/review-screen-definition.ts \
  --workflow figma-baseline \
  --project-name "<PROJECT_NAME or aiga>"
```

After review, perform an agent semantic self-review and patch the final Figma deliverable files. Do not report completion with a draft plus review findings still requiring manual reconciliation.

Mandatory finalization loop:

1. Run validation and review.
2. Read `figma-screen-definition.validation.json`, `figma-screen-definition.review.json`, and `figma-screen-definition-review.md`.
3. Perform semantic self-review against Figma nodes, Figma screen docs, `figma-screen-coverage.json`, feature/schema/API definitions, and relevant source chunks.
4. Patch Figma screen docs, `figma-screen-definition.md`, `figma-screen-definitions/figma-screen-definition-index.md`, and `figma-screen-coverage.json` for every unresolved finding.
5. Append the iteration summary to `figma-screen-definition-loop.md`.
6. Rerun validation and review after patching.
7. Stop only when the current on-disk Figma baseline artifacts are post-review revised, validation/review pass, Figma node coverage is complete, and unresolved semantic findings are 0.

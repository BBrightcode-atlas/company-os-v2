---
name: bbr-figma-screen-definition
description: Use when a project has explicit Figma nodes and the goal is to create a Figma-first screen-definition baseline. Produces figma-screen-definition.md, figma-screen-definitions/, figma-screen-coverage.json, validation/review artifacts, and review loops without overwriting the later feature-centered screen-definition workflow.
---

# BBR Figma Screen Definition

Create a Figma-first screen definition baseline from supplied Figma node URLs, completed feature/schema/API definitions, and source material.

This workflow is for "피그마대로 구현할 수 있는 화면정의서" extraction. It is separate from `$bbr-screen-definition`, which is the later feature-centered workflow for design/development execution.

## Separation Contract

- Figma-first workflow output names:
  - `figma-screen-definition.md`
  - `figma-screen-definitions/figma-screen-definition-index.md`
  - `figma-screen-definitions/{surface}/{SURFACE}-SCR-###-{slug}.md`
  - `figma-screen-coverage.json`
  - `figma-screen-definition.validation.json`
  - `figma-screen-definition.review.json`
  - `figma-screen-definition-review.md`
  - `figma-screen-definition-loop.md`
  - `figma-screen-definition-work/screen-analysis-input.json`
  - `figma-screen-definition-work/screen-workflow.md`
- Feature-centered implementation workflow output names:
  - `screen-definition.md`
  - `screen-definitions/`
  - `screen-coverage.json`
- Do not overwrite feature-centered outputs from this Figma workflow.

## Required Inputs

Use the latest source-intake run for the project unless `--run-dir` is supplied.

Required files:

- `feature-definition.md`
- `feature-coverage.json`
- `feature-definition-scope.json`
- `schema-definition.md`
- `schema-coverage.json`
- `api-definition.openapi.yaml`
- `api-coverage.json`
- `source-material.md`
- Figma node URLs via one of:
  - `--figma-url "<figma url>"`, repeated as needed
  - `--figma-links-file "<markdown file>"`

## Template Contract

Use:

- `.agents/skills/bbr-screen-definition/templates/deliverables/figma-screen-definition.md`
- `.agents/skills/bbr-screen-definition/templates/standards/figma-screen-definition-writing-rules.md`

Every detailed Figma screen document must include:

1. `# Figma 화면정의서(Figma Screen Definition) - <screen name>`
2. `## 1. 기본 정보(Basic Information)`
3. `## 2. Figma 구현 기준(Figma Implementation Baseline)`
4. `## 3. 참조 계약(Referenced Contracts)`
5. `## 4. 화면 구성(Screen Composition)`
6. `## 5. 화면 필드(Screen Fields)`
7. `## 6. 화면 상태(Screen States)`
8. `## 7. 사용자 액션(User Actions)`
9. `## 8. UX Flow Diagrams`
10. Mermaid `flowchart TD`
11. Mermaid `sequenceDiagram`
12. `## 9. 화면 QA 인수 기준(Screen QA Acceptance Criteria)`
13. `## 10. 미확정(Undecided)`
14. `## 11. 해당 없음(N/A)`

## Figma Rules

- Treat supplied Figma nodes as the visual/layout source of truth.
- Map multiple Figma nodes to one screen when they are variants/states of the same route or modal lifecycle.
- Every supplied Figma node must be mapped to a screen/state/modal/tab or listed in `unmappedFigmaNodes` with a reason.
- Every Figma-backed screen must include Figma URL, file key, node id, frame/title, viewport/frame size, layout constraints, spacing/grid, typography, color, component mapping, assets/icons/images, responsive behavior, and design-to-implementation notes when available.
- If the agent cannot inspect Figma directly, do not guess visual values. Document the access/export gap in the Figma section and `figma-screen-coverage.json`.
- Schema/API/feature codes are references only. Do not redefine DB fields or API request/response bodies.

## Workflow

1. Prepare Figma screen analysis:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-screen-definition/scripts/prepare-screen-analysis.ts \
  --workflow figma-baseline \
  --project-name "<project-name>" \
  --figma-links-file "./generated/source-intake/<project-name>/figma-screens.md"
```

Use `--run-dir "<runDir>"` when targeting a specific run.

2. Read:

- `figma-screen-definition-work/screen-analysis-input.json`
- `figma-screen-definition-work/screen-workflow.md`
- the Figma screen template and writing rules embedded in the analysis input
- feature/schema/API/source files and coverage JSON files

3. Build Figma screen inventory:

- Extract screens from Figma nodes first.
- Merge Figma nodes into one screen when they are route states, search states, modals, tabs, or error/empty variants.
- Preserve all node IDs in `figmaNodes`.
- Do not create pure server screens.
- Use existing `FEA-###`, `SCH-###`, and `API-###` codes only.

4. Write:

- `figma-screen-definitions/figma-screen-definition-index.md`
- one detailed Figma screen document per screen under `figma-screen-definitions/{surface}/`
- `figma-screen-definition.md`
- `figma-screen-coverage.json`

5. Validate:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-screen-definition/scripts/validate-screen-definition.ts \
  --workflow figma-baseline \
  --project-name "<project-name>"
```

6. Review:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-screen-definition/scripts/review-screen-definition.ts \
  --workflow figma-baseline \
  --project-name "<project-name>"
```

7. Semantic self-review:

- Every supplied Figma node is mapped or explicitly unmapped with a reason.
- Every Figma-backed screen contains Figma node refs in both the detailed doc and `figma-screen-coverage.json`.
- No guessed layout/style/token values remain unless clearly marked as access/export gaps.
- Feature/schema/API codes exist in the prior deliverables.
- Screen states, actions, diagrams, and QA cases match the Figma state inventory.

Append findings to `figma-screen-definition-loop.md`, patch final artifacts, and rerun validation/review.

## Quality Bar

- Final files are the post-review patched Figma baseline artifacts.
- Figma node coverage is complete or every exception is justified.
- The result can be used as visual/layout input for the later feature-centered design/development screen workflow.

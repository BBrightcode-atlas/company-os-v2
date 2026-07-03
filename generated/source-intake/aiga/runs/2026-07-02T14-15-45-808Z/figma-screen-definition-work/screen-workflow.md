# Figma Screen Definition Baseline Workflow - aiga

- workflow: figma-baseline
- aggregate artifact: `figma-screen-definition.md`
- coverage artifact: `figma-screen-coverage.json`

## Inputs

- `feature-definition.md`
- `feature-coverage.json`
- `schema-definition.md`
- `schema-coverage.json`
- `api-definition.openapi.yaml`
- `api-coverage.json`
- `source-material.md`
- Codex workflow template: `.agents/skills/bbr-screen-definition/templates/deliverables/figma-screen-definition.md`
- Codex workflow writing rules: `.agents/skills/bbr-screen-definition/templates/standards/figma-screen-definition-writing-rules.md`

## Selected Scope

- selected feature areas: admin, site, server
- screen target surfaces: admin, site
- feature groups: 23
- schema count: 26
- API count: 97
- source chunks with screen hints: 326
- Figma baseline: 48 node(s), file key(s): 4F1yav1LVfMJFluyIQq7pr
- Figma required: yes

## Figma Implementation Baseline

- Treat the supplied Figma nodes as the visual/layout source of truth for screen definitions.
- Every screen derived from Figma must keep the Figma URL, file key, node id, frame name/title, and implementation notes in its screen document and `figma-screen-coverage.json`.
- Capture exact layout, spacing, typography, color, component, asset, responsive, and state details only when they are visible in Figma or supplied export data.
- If the agent cannot inspect Figma directly, do not guess visual values. Mark the screen with an explicit Figma access/export gap and ask for screenshots/export/API access before final implementation-level detail.
- This workflow is not the feature-centered implementation workflow. Use `feature-implementation` separately when converting feature groups into development tasks and implementation screens.

## Steps

1. Read `screen-analysis-input.json` completely.
2. Build a screen inventory from source screen sections, feature rows, API routes, and user/admin task flows.
3. Merge duplicate screen candidates by route, tab, modal lifecycle, or admin queue purpose.
4. Exclude pure server behavior from screens unless there is an admin/site/app/landing UI consuming it.
5. Assign stable screen codes using `{SURFACE}-SCR-###`.
6. Write one detailed document per screen using the Codex screen-definition template.
7. Write `figma-screen-definitions/figma-screen-definition-index.md` grouped by target surface.
8. Write `figma-screen-definition.md` as an aggregate review document.
9. Write `figma-screen-coverage.json` with screens, featureScreenMappings, apiScreenMappings, unmappedFeatures, figmaNodes, and unmappedFigmaNodes.
10. Run validation and review scripts.
11. Perform agent semantic self-review against Figma nodes, feature/schema/API definitions, and source chunks.
12. Patch screen docs, index, aggregate Markdown, and coverage JSON for every validation, scripted review, and semantic finding that is not intentionally accepted.
13. Append the iteration summary to `figma-screen-definition-loop.md`.
14. Rerun validation and review after the patch.
15. Stop only when the current on-disk screen docs/coverage/index/aggregate files are the post-review revised artifacts and validation/review have no unresolved findings.

# Feature Implementation Screen Definition Workflow - aiga

- workflow: feature-implementation
- aggregate artifact: `screen-definition.md`
- coverage artifact: `screen-coverage.json`

## Inputs

- `feature-definition.md`
- `feature-coverage.json`
- `schema-definition.md`
- `schema-coverage.json`
- `api-definition.openapi.yaml`
- `api-coverage.json`
- `source-material.md`
- Codex workflow template: `.agents/skills/bbr-screen-definition/templates/deliverables/screen-definition.md`
- Codex workflow writing rules: `.agents/skills/bbr-screen-definition/templates/standards/screen-definition-writing-rules.md`

## Selected Scope

- selected feature areas: admin, site, server
- screen target surfaces: admin, site
- feature groups: 23
- schema count: 26
- API count: 97
- source chunks with screen hints: 326
- Figma baseline: (not supplied)
- Figma required: no

## Workflow Separation

- This is the feature-centered implementation screen workflow. Do not treat Figma as the governing visual source here; use `figma-baseline` for Figma-first extraction.

## Steps

1. Read `screen-analysis-input.json` completely.
2. Build a screen inventory from source screen sections, feature rows, API routes, and user/admin task flows.
3. Merge duplicate screen candidates by route, tab, modal lifecycle, or admin queue purpose.
4. Exclude pure server behavior from screens unless there is an admin/site/app/landing UI consuming it.
5. Assign stable screen codes using `{SURFACE}-SCR-###`.
6. Write one detailed document per screen using the Codex screen-definition template.
7. Write `screen-definitions/screen-definition-index.md` grouped by target surface.
8. Write `screen-definition.md` as an aggregate review document.
9. Write `screen-coverage.json` with screens, featureScreenMappings, apiScreenMappings, and unmappedFeatures.
10. Run validation and review scripts.
11. Perform agent semantic self-review against feature/schema/API definitions and source chunks.
12. Patch screen docs, index, aggregate Markdown, and coverage JSON for every validation, scripted review, and semantic finding that is not intentionally accepted.
13. Append the iteration summary to `screen-definition-loop.md`.
14. Rerun validation and review after the patch.
15. Stop only when the current on-disk screen docs/coverage/index/aggregate files are the post-review revised artifacts and validation/review have no unresolved findings.

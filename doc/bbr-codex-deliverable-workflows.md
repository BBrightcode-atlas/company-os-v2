# BBR Codex Deliverable Workflows

This document records the repo-local Codex workflows used to turn customer source material into development-ready planning artifacts.

These are local Codex operator workflows for creating, validating, reviewing, and patching artifacts before they are used downstream.

## Workflow Layers

BBR project planning has these deliverable layers:

| Level | Purpose | Output |
| --- | --- | --- |
| Source intake | Preserve customer material and normalize it into Markdown/source chunks | `source-material.md`, source coverage files |
| Feature definition | Group requirements into implementable feature units | `feature-definition.md`, `feature-coverage.json` |
| Schema definition | Define reusable data model contracts | `schema-definition.md`, `schema-coverage.json` |
| API definition | Define feature-tagged OpenAPI contracts | `api-definition.md`, `api-definition.openapi.yaml`, `api-coverage.json` |
| Figma screen baseline | Extract Figma-first visual/layout screen baseline | `figma-screen-definition.md`, `figma-screen-coverage.json`, `figma-screen-definitions/` |
| Feature screen definition | Convert feature/schema/API contracts into development-facing screen docs | `screen-definition.md`, `screen-coverage.json`, `screen-definitions/` |

The last two screen workflows are deliberately different:

- **Figma screen baseline** answers: "Can we implement the UI as shown in these Figma nodes?"
- **Feature screen definition** answers: "Which screens, states, actions, APIs, QA cases, and implementation surfaces are needed to build the features?"

Do not overwrite `screen-definition.md` from the Figma workflow. Figma baseline artifacts use the `figma-screen-*` prefix.

## Repo-Local Skills

The repo tracks these skills under `.agents/skills/`:

| Skill | Use |
| --- | --- |
| `bbr-feature-definition` | Build feature definition with area selection and project-builder-base reuse analysis |
| `bbr-schema-definition` | Build schema definition after feature definition |
| `bbr-api-definition` | Build feature-tagged OpenAPI/API definition after schema definition |
| `bbr-figma-screen-definition` | Build Figma-first screen baseline from explicit Figma nodes |
| `bbr-screen-definition` | Build feature-centered screen definition for design/development execution |

The repo also carries prompt copies under `.codex/prompts/` so the workflow entrypoints are inspectable in git.

## Review Loop Contract

All deliverable workflows follow the same finalization rule:

1. Prepare analysis input.
2. Draft the deliverable.
3. Run validation.
4. Run scripted review.
5. Perform agent semantic self-review.
6. Patch the final deliverable files, not only the review document.
7. Append an iteration note to the loop file.
8. Rerun validation and review.
9. Stop only when the current on-disk deliverables are the post-review revised artifacts.

Warnings may remain only when the loop file states why they are accepted.

## Commands

Feature definition:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-feature-definition/scripts/configure-feature-scope.ts \
  --project-name aiga \
  --areas admin,site,server \
  --notes "ai 채팅관련은 별도 REST API로 받아 자체 구현은 생략한다."

node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-feature-definition/scripts/prepare-feature-analysis.ts \
  --project-name aiga
```

Schema definition:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-schema-definition/scripts/prepare-schema-analysis.ts \
  --project-name aiga
```

API definition:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-api-definition/scripts/prepare-api-analysis.ts \
  --project-name aiga
```

Figma screen baseline:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-screen-definition/scripts/prepare-screen-analysis.ts \
  --workflow figma-baseline \
  --project-name aiga \
  --figma-links-file generated/source-intake/aiga/figma-screens.md
```

Feature-centered screen definition:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-screen-definition/scripts/prepare-screen-analysis.ts \
  --workflow feature-implementation \
  --project-name aiga
```

Validate/review screen artifacts:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-screen-definition/scripts/validate-screen-definition.ts \
  --workflow figma-baseline \
  --project-name aiga

node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-screen-definition/scripts/review-screen-definition.ts \
  --workflow figma-baseline \
  --project-name aiga
```

Use `--workflow feature-implementation` for the later feature-centered screen-definition review.

## AIGA Artifact State

Current project artifacts live under:

```text
generated/source-intake/aiga/runs/2026-07-02T14-15-45-808Z/
```

The current finalized planning artifacts are:

| Artifact | Status |
| --- | --- |
| `feature-definition.md` | Generated and reviewed |
| `schema-definition.md` | Generated and reviewed |
| `api-definition.md` | Generated and reviewed |
| `api-definition.openapi.yaml` | Generated and reviewed |
| `implementation-readiness-review.md` | Development-ready summary |

The current screen workflow status is:

| Artifact | Status |
| --- | --- |
| `figma-screen-definition-work/screen-analysis-input.json` | Prepared with 48 Figma nodes |
| `figma-screen-definition-work/screen-workflow.md` | Prepared |
| `screen-definition-work/screen-analysis-input.json` | Prepared for feature-centered screen definition |
| `screen-definition-work/screen-workflow.md` | Prepared |
| `figma-screen-definition.md` | Not generated yet |
| `screen-definition.md` | Not generated yet |

The AIGA Figma input list is:

```text
generated/source-intake/aiga/figma-screens.md
```

## File Format Notes

- `screen-coverage.json` actions must use stable `ACT-##` codes and include trigger, description, API codes, target screen when applicable, and test id.
- QA cases must use stable `AC-##` codes.
- Feature-centered screens should reference existing `FEA-###`, `SCH-###`, and `API-###` codes.
- Figma baseline screens must also include `figmaNodes` and must map every supplied Figma node or list it under `unmappedFigmaNodes` with a reason.
- For non-Notion source formats such as PDF, DOCX, and PPTX, use a document extraction step before feature analysis. Docling is a suitable candidate for that conversion layer, but the conversion output should still land as Markdown/source chunks before these deliverable workflows run.

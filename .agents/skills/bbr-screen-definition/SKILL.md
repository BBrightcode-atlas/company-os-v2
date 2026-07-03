---
name: bbr-screen-definition
description: Use after BBR feature/schema/API definitions to create feature-centered screen-definition documents for downstream design, development, wireframe, and QA work. Produces screen docs, index, coverage JSON, validation/review artifacts, and review loops.
---

# BBR Screen Definition

Create feature-centered implementation screen definitions from completed feature, schema, and API definitions.

This is the next step after `$bbr-api-definition` when the goal is design/development execution by feature. It produces one aggregate document, one index, one coverage JSON, and one document per screen.

This is not the Figma-first workflow. If the source of truth is a Figma node list and the goal is to extract a visual/layout baseline, use `$bbr-figma-screen-definition`.

1. Read `feature-definition.md`, `feature-coverage.json`, `schema-definition.md`, `schema-coverage.json`, `api-definition.openapi.yaml`, `api-coverage.json`, `source-material.md`, and `feature-definition-scope.json`.
2. Read the Codex workflow templates:
   - `.agents/skills/bbr-screen-definition/templates/deliverables/screen-definition.md`
   - `.agents/skills/bbr-screen-definition/templates/standards/screen-definition-writing-rules.md`
3. Build a screen inventory from feature rows, source screen sections, API operations, and route/action clues.
4. Merge duplicate screen candidates that describe the same route, tab, modal, admin page, or user task.
5. Assign stable screen codes using `{SURFACE}-SCR-###`, where surface is `ADMIN`, `SITE`, `APP`, or `LANDING`.
6. Write one detailed Markdown file per screen with the Codex screen template structure.
7. Write a screen index and aggregate Markdown for easy review.
8. Write `screen-coverage.json` for downstream wireframe/task automation.
9. Validate and review.
10. Perform agent semantic self-review.
11. Patch final screen docs, index, aggregate Markdown, and coverage JSON based on validation, scripted review, and semantic self-review findings.
12. Rerun validation and review after patching. The handoff files must be the post-review revised artifacts, not the first draft.

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

If API or schema artifacts are missing, run `$bbr-api-definition` or `$bbr-schema-definition` first.

## Output Files

Write these files into the same run directory:

- `screen-definition.md` aggregate review document
- `screen-definitions/screen-definition-index.md`
- `screen-definitions/{surface}/{SURFACE}-SCR-###-{slug}.md`
- `screen-coverage.json`
- `screen-definition.validation.json`
- `screen-definition.review.json`
- `screen-definition-review.md`
- `screen-definition-loop.md`
- `screen-definition-work/screen-analysis-input.json`
- `screen-definition-work/screen-workflow.md`

## Template Contract

The source template is `.agents/skills/bbr-screen-definition/templates/deliverables/screen-definition.md`.

Every detailed screen document must include:

1. `# 화면정의서(Screen Definition) - <screen code> <screen name>`
2. `## 1. 기본 정보(Basic Information)`
3. `## 2. 참조 계약(Referenced Contracts)`
4. `## 3. 화면 구성(Screen Composition)`
5. `## 4. 화면 필드(Screen Fields)`
6. `## 5. 화면 상태(Screen States)`
7. `## 6. 사용자 액션(User Actions)`
8. `## 7. UX Flow Diagrams`
9. Mermaid `flowchart TD`
10. Mermaid `sequenceDiagram`
11. `## 8. 화면 QA 인수 기준(Screen QA Acceptance Criteria)`
12. `## 9. 미확정(Undecided)`
13. `## 10. 해당 없음(N/A)`

The standard rules are `.agents/skills/bbr-screen-definition/templates/standards/screen-definition-writing-rules.md`:

- One screen document per screen.
- Screen definitions reference prior schema/API/feature contracts; they do not redefine API request/response or DB fields.
- Target surfaces are `admin`, `site`, `app`, and `landing`.
- Do not mix multiple target surfaces inside one screen document.
- Every screen must consider default, empty, loading, error, and permission states.
- Every user action must include trigger, result, API reference, target screen when applicable, and `data-testid`.

## Screen Coverage JSON

`screen-coverage.json` must include:

```json
{
  "projectName": "aiga",
  "sourceFeatureDefinition": "feature-definition.md",
  "sourceSchemaDefinition": "schema-definition.md",
  "sourceApiDefinition": "api-definition.openapi.yaml",
  "screenIndex": "screen-definitions/screen-definition-index.md",
  "aggregateDocument": "screen-definition.md",
  "screens": [
    {
      "code": "SITE-SCR-001",
      "name": "홈",
      "targetSurface": "site",
      "route": "/",
      "access": "guest_or_member",
      "description": "홈 큐레이션과 주요 진입점을 제공한다.",
      "layoutReference": "site.default / main",
      "primaryTestId": "site-scr-001",
      "documentPath": "screen-definitions/site/SITE-SCR-001-home.md",
      "sourceFeatureCodes": ["FEA-016"],
      "schemaCodes": ["SCH-003", "SCH-006"],
      "apiCodes": ["API-043"],
      "states": ["Default", "Empty", "Loading", "Error", "Permission"],
      "actions": [
        {
          "code": "ACT-01",
          "name": "명의 상세 이동",
          "testId": "site-scr-001-act-01",
          "trigger": "의사 카드 클릭",
          "apiCodes": [],
          "targetScreenCode": "SITE-SCR-002"
        }
      ],
      "qaCases": [
        {
          "code": "AC-01",
          "testId": "site-scr-001-ac-01",
          "description": "홈 진입 시 주요 섹션이 렌더링된다."
        }
      ],
      "sourceChunks": ["CH-001"],
      "notes": "source screen sections merged"
    }
  ],
  "featureScreenMappings": [
    {
      "featureId": "FEA-016",
      "featureName": "홈 큐레이션",
      "screenCodes": ["SITE-SCR-001"]
    }
  ],
  "apiScreenMappings": [
    {
      "apiCode": "API-043",
      "screenCodes": ["SITE-SCR-001"]
    }
  ],
  "unmappedFeatures": []
}
```

## Workflow

1. Prepare screen analysis:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-screen-definition/scripts/prepare-screen-analysis.ts \
  --workflow feature-implementation \
  --project-name "<project-name>"
```

Use `--run-dir "<runDir>"` when targeting a specific run.

2. Read:

- `screen-definition-work/screen-analysis-input.json`
- `screen-definition-work/screen-workflow.md`
- Screen template and writing rules embedded in the analysis input.
- `feature-definition.md`, `schema-definition.md`, `api-definition.md`, and coverage JSON files.

3. Build screen inventory:

- Extract page, tab, modal, drawer, admin queue, form, detail, and list screens.
- Merge repeated descriptions of the same screen across source sections.
- Keep common components as referenced components unless they have their own route/modal lifecycle that needs a separate screen document.
- Do not create screens for pure server behavior.
- A selected `server` feature may still map to a screen only when there is an admin/site/app/landing UI consuming it.
- Use source evidence and prior feature/API/schema codes. Do not invent API or schema codes in screen docs.

4. Compare with `product-builder-base`:

- Prefer codebase-memory MCP architecture/search tools when available.
- Fallback to local file reads only when graph tools are unavailable or insufficient.
- Check target app surfaces and reusable layouts/components:
  - `apps/admin`
  - `apps/site`
  - `apps/app`
  - `apps/landing`
  - shared UI packages/components when available.
- Record base layout/component references in `screen-coverage.json.notes` or screen doc referenced contracts when useful.

5. Write:

- `screen-definitions/screen-definition-index.md`
- one detailed screen document per screen under `screen-definitions/{surface}/`
- `screen-definition.md` aggregate document
- `screen-coverage.json`

6. Validate:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-screen-definition/scripts/validate-screen-definition.ts \
  --workflow feature-implementation \
  --project-name "<project-name>"
```

7. Review:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-screen-definition/scripts/review-screen-definition.ts \
  --workflow feature-implementation \
  --project-name "<project-name>"
```

8. Semantic self-review:

Check at least:

- Every screen has one target surface and no mixed surface responsibilities.
- Every UI-relevant feature is mapped to screens or explicitly unmapped with reason.
- Every screen references existing `FEA-###`, `SCH-###`, and `API-###` codes only.
- Screen docs do not redefine DB fields or API request/response schemas.
- Required states include default/empty/loading/error/permission or a documented N/A reason.
- Every user action has a test id and is covered by a QA case.
- Flowchart and sequenceDiagram match user actions and API references.
- Admin screens include permission/error handling and audit-sensitive actions when applicable.
- External AI chat stays as external REST integration; no internal `ai-runtime` screen or runtime flow is implied when excluded.

Append findings to `screen-definition-loop.md`, patch artifacts, then rerun validation and review.

## Iterative Review Loop

For large screen packs, use a bounded loop:

1. Run validation and review.
2. Read `screen-definition.validation.json`, `screen-definition.review.json`, and `screen-definition-review.md`.
3. Perform semantic self-review against screen docs, `screen-coverage.json`, feature/schema/API definitions, and relevant source chunks.
4. Classify findings:
   - `error`: must revise screen docs, aggregate Markdown, or coverage JSON.
   - `warning`: revise unless it is intentionally accepted and explained.
   - `info`: record only.
5. Patch the final deliverable files. Do not leave the fix only in the review document.
6. Append a short entry to `screen-definition-loop.md` with iteration number, commands run, static findings, semantic findings, changes, and remaining accepted warnings.
7. Rerun validation and review after the patch.
8. Stop only when validation passes, review has no errors, semantic self-review has no unresolved findings, and the patched screen docs/coverage/index/aggregate files are the current files on disk. If warnings remain, each warning category must have an explicit acceptance rationale in `screen-definition-loop.md`.

Default loop budget is 3 iterations. Increase to 5 only when review errors remain and the source material is broad enough to justify more passes.

Dedicated Codex prompt:

```text
/prompts:builder-screen-definition-loop PROJECT_NAME="aiga" MAX_ITERS="3"
```

## Quality Bar

- The output is usable by wireframe generation, frontend implementation, and QA.
- Every screen is implementation-facing: route, auth, layout, states, fields, actions, API references, diagrams, and QA cases are explicit.
- Screen docs reference existing feature/schema/API codes and do not invent lower-level contracts.
- Screen template sections are present, with no `{{placeholder}}` remnants.
- Final screen files are post-review patched files, with loop evidence showing how findings were fixed or accepted.

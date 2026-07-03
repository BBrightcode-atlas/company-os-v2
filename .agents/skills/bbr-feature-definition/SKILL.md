---
name: bbr-feature-definition
description: Use after BBR client source intake to turn a large source-material.md into a grouped feature definition Markdown. It must detect when the same feature is scattered across multiple source sections and produce tables with 영역, 기능명, 상세 설명, 메모.
---

# BBR Feature Definition

Create a feature definition from a project source-material baseline.

This is step 2 after `$bbr-client-source-intake`. It is not a summarization task. It is a coverage-preserving analysis workflow:

1. Select the Product Builder app areas to analyze and collect extra user context.
2. Read the full `source-material.md`.
3. Build a heading/chunk map.
4. Extract atomic requirements from every chunk.
5. Merge requirements that describe the same feature even when they appear in different documents or sections.
6. Classify each implementation row into one selected Product Builder area.
7. Compare each feature group with `product-builder-base` and decide the reuse strategy.
8. Produce the first draft Markdown feature definition and coverage JSON.
9. Validate the table shape and area values.
10. Review the generated feature definition against source coverage, scattered-requirement merge quality, and reuse rationale quality.
11. Perform an agent semantic self-review.
12. Patch the final deliverable files based on validation, scripted review, and semantic self-review findings.
13. Rerun validation and review after patching. The handoff files must be the post-review revised artifacts, not the first draft.

## Allowed Areas

Available Product Builder app areas:

- `admin`
- `site`
- `server`
- `app`
- `ai-runtime`

Before analysis, the operator must choose one or more of these areas. Use only the selected values in the `영역` column. If a feature spans multiple selected areas, write one row per selected area under the same feature section. If a source requirement belongs to an unselected area, do not silently include it; either omit it with an explicit coverage note or ask the operator to expand the selected scope.

Do not invent area names. Do not use `docs`, `kcb-identity-server`, or package names in the `영역` column.

## Scope Selection

Before preparing analysis, configure scope:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-feature-definition/scripts/configure-feature-scope.ts \
  --project-name "<project-name>" \
  --areas "admin,app,server" \
  --notes "<extra user explanation>"
```

This writes `feature-definition-scope.json` in the source-intake run directory.

Rules:

- If no selected areas are provided in the user request, collect them before analysis. In Codex surfaces with interactive input support, use a checkbox/multi-select picker instead of a plain-text question. If no picker is available, ask the user to choose from `admin`, `site`, `server`, `app`, `ai-runtime` in chat and wait for the answer.
- `--notes` is optional but should be used for operator constraints, priorities, excluded surfaces, implementation assumptions, or customer-specific interpretation.
- `prepare-feature-analysis.ts`, `validate-feature-definition.ts`, and `review-feature-definition.ts` read this scope file.
- Once scope exists, validation fails if `feature-definition.md` uses an area outside the selected scope.

## Required Output Format

The feature definition must be Markdown.

Group by feature:

```md
## FEA-001 회원 등급 및 권한 정책

| 영역 | 기능명 | 상세 설명 | 메모 |
| --- | --- | --- | --- |
| server | 사용자 등급 권한 모델 | 비회원, 일반 회원, 의사 인증 회원의 권한 차이를 서버 정책으로 정의하고 게시글, 리뷰, 댓글, 신고, 저장 등 액션별 접근 가능 여부를 판정한다. |  |
| app | 로그인 필요 모달 | 비회원이 권한 없는 기능을 시도하면 LoginRequiredToast를 표시한다. |  |

### product-builder-base 재사용 판단

| 재사용 유형 | 기준 surface | base 참조 | hard-copy 범위 | 커스터마이징 범위 | 메모 |
| --- | --- | --- | --- | --- | --- |
| partial-reuse | server, app | `packages/core/auth`, `apps/app/src/pages/auth` | 인증 상태, 세션 가드, 로그인 UI 패턴 | 회원 등급 정책, 의사 인증 예외, 전환 안내 문구 |  |
```

Rules:

- `메모` is for the user. Leave it empty.
- `상세 설명` must be implementation-facing and specific enough for task extraction.
- Preserve scattered requirements by merging them into the same feature group and listing all affected areas.
- Do not add estimates, timelines, PRD prose, screen wireframes, or implementation tasks.
- Add exactly one `product-builder-base 재사용 판단` table under every feature section.
- The reuse table is implementation strategy, not a replacement for the feature table. Do not add reuse columns to the main `영역 | 기능명 | 상세 설명 | 메모` table.
- Use these reuse types only: `complete-reuse`, `partial-reuse`, `reuse-with-customization`, `new-implementation`, `not-applicable`.
- `기준 surface` should use the selected target areas affected by the reuse decision. `base 참조` may point to actual `product-builder-base` paths or feature modules even when the source module lives under another base surface that will be ported or copied.

## product-builder-base Reuse Analysis

BBR projects commonly start from `product-builder-base`. Before finalizing each feature, inspect the base codebase or documented feature inventory and classify reuse.

For each feature decide:

- `complete-reuse`: the base feature can be copied or enabled with minimal naming/content changes.
- `partial-reuse`: base contracts, schema, hooks, or UI patterns are useful, but the feature still needs meaningful project-specific work.
- `reuse-with-customization`: a base feature is the main implementation foundation, but domain behavior, copy, screens, data fields, or policy must be changed.
- `new-implementation`: no suitable base feature exists; only generic primitives may be reused.
- `not-applicable`: the feature is an operating constraint, external dependency, or excluded scope where reuse does not apply.

Record the result in both places:

1. In `feature-definition.md`, under the feature section, add the reuse table shown above.
2. In `feature-coverage.json`, add a machine-readable `reuse` object:

```json
{
  "featureId": "FEA-001",
  "featureName": "회원 등급 및 권한 정책",
  "sourceChunks": ["CH-001", "CH-017"],
  "areas": ["server", "app"],
  "reuse": {
    "type": "partial-reuse",
    "surfaces": ["server", "app"],
    "baseReferences": ["packages/core/auth", "packages/drizzle/src/schema/core/auth.ts"],
    "hardCopyScope": "세션, 사용자 프로필, 권한 가드 패턴",
    "customizationScope": "비회원/일반/의사 인증 회원 등급 정책과 의사 인증 예외",
    "reason": "기본 인증 구조는 재사용 가능하지만 Aiga의 의료진 등급과 콘텐츠 권한 정책은 프로젝트 특화가 필요하다."
  }
}
```

## Workflow

1. Configure scope as described above.

2. Resolve the run:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-feature-definition/scripts/prepare-feature-analysis.ts \
  --project-name "<project-name>"
```

This writes:

- `feature-definition-work/source-outline.md`
- `feature-definition-work/feature-analysis-input.json`
- `feature-definition-work/feature-workflow.md`

3. Read `feature-analysis-input.json`, `feature-definition-scope.json`, and `source-outline.md`.

4. Build an internal requirement inventory:

- Each atomic requirement must cite at least one chunk id.
- If two requirements share the same user-visible capability, policy object, data object, or UI interaction, merge them into one feature candidate.
- Keep cross-document evidence. Example: a restriction in a policy doc and a modal in a UI component doc are usually one feature group, not two unrelated features.

5. Build a `product-builder-base` reuse inventory:

- Prefer codebase-memory MCP architecture/search tools for code discovery when available.
- Fallback to local file search only when graph tools are unavailable or insufficient.
- Identify reusable base references at the feature/module level, such as auth, community, comment, reaction, feedback, identity verification, notification, admin layout, common API/error handling, and data/schema packages.
- Do not force reuse. If the base has only generic primitives and no feature-level match, classify as `new-implementation` and record the primitive references only when helpful.

6. Write:

- `feature-definition.md`
- `feature-coverage.json`

`feature-coverage.json` should contain:

```json
{
  "projectName": "aiga",
  "features": [
    {
      "featureId": "FEA-001",
      "featureName": "회원 등급 및 권한 정책",
      "sourceChunks": ["CH-001", "CH-017"],
      "areas": ["server", "app"],
      "reuse": {
        "type": "partial-reuse",
        "surfaces": ["server", "app"],
        "baseReferences": ["packages/core/auth"],
        "hardCopyScope": "auth guard and user session patterns",
        "customizationScope": "Aiga membership grades and doctor verification policy",
        "reason": "why this reuse type was selected"
      },
      "notes": "why these scattered chunks were merged"
    }
  ],
  "unmappedChunks": []
}
```

7. Validate:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-feature-definition/scripts/validate-feature-definition.ts \
  --project-name "<project-name>"
```

Fix the Markdown until validation passes.

8. Review:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-feature-definition/scripts/review-feature-definition.ts \
  --project-name "<project-name>"
```

This writes:

- `feature-definition.review.json`
- `feature-definition-review.md`

If the review reports an `error`, revise `feature-definition.md` or `feature-coverage.json`, then rerun both validation and review. Warnings may be accepted only when they are explained by a deliberate feature grouping decision.

The final deliverable state is defined by the last successful loop iteration:

- `feature-definition.md` and `feature-coverage.json` include every required patch from validation, scripted review, and semantic self-review.
- `feature-definition.validation.json` and `feature-definition.review.json` were regenerated after those patches.
- `feature-definition-loop.md` records the findings fixed, patches made, remaining accepted warnings, and final stop condition.
- Do not hand off a draft plus a separate review that still requires manual reconciliation. Review-driven fixes must be incorporated into the final files.

9. Semantic self-review:

After static validation/review passes, read the generated Markdown as if it will be used for downstream implementation planning. This is a manual review step, not just a script check.

Check at least:

- Rows whose `영역` value does not match the work described in `상세 설명`.
- Rows whose `영역` is valid globally but outside the selected scope.
- A single row that mixes multiple surfaces, such as `app` text mentioning admin screens or `server` text bundling `ai-runtime` behavior.
- Source contradictions where the chosen policy differs from another source section.
- User-facing submission flows that only have an admin handling row.
- Missing conflict notes in `feature-coverage.json` when a source contradiction is intentionally resolved.
- Overbroad feature rows that would create vague downstream implementation tasks.
- Missing or weak `product-builder-base` reuse decisions, especially `new-implementation` without a reason.
- Reuse claims that do not match the selected target surface or the referenced base module.

Write the findings into `feature-definition-loop.md`, patch `feature-definition.md` and `feature-coverage.json`, then rerun validation and review.

## Iterative Review Loop

For large source packs, do not stop at one review if the output has errors or unexplained warnings. Use a bounded loop:

1. Run validation and review.
2. Read `feature-definition.validation.json` and `feature-definition.review.json`.
3. Perform semantic self-review against `feature-definition.md`, `feature-coverage.json`, and relevant source chunks.
4. Classify findings:
   - `error`: must revise `feature-definition.md` or `feature-coverage.json`.
   - `warning`: revise unless it is intentional cross-cutting coverage.
   - `info`: record only.
5. Patch the artifacts.
6. Append a short entry to `feature-definition-loop.md` with iteration number, static findings, semantic findings, changes, and remaining accepted warnings.
7. Rerun validation and review.
8. Stop only when validation passes, review has no errors, semantic self-review has no unresolved findings, and the patched `feature-definition.md` / `feature-coverage.json` are the current files on disk. If warnings remain, each warning category must have an explicit acceptance rationale in `feature-definition-loop.md`.

Default loop budget is 3 iterations. Increase to 5 only when review errors remain and the source material is broad enough to justify more passes.

Dedicated Codex prompt:

```text
/prompts:builder-feature-definition-loop PROJECT_NAME="aiga" MAX_ITERS="3"
```

## Quality Bar

- Every important source heading must be represented in `feature-coverage.json`, either under a feature or in `unmappedChunks` with a reason.
- No duplicate feature groups for the same capability.
- Rows should be feature-level, not tiny UI-label rows.
- Rows should not be so broad that downstream task extraction cannot identify backend/frontend/API/admin work.
- When uncertain, keep the row but leave `메모` empty and explain uncertainty in `feature-coverage.json`, not the Markdown table.
- The review artifact must be generated after the first draft so the user can inspect both the draft and the review result.
- For looped refinement, `feature-definition-loop.md` is part of the deliverable because it records how review findings were fixed or deliberately accepted.
- Static review passing is not sufficient for handoff. The semantic self-review must either patch or explicitly accept each meaning-level issue.

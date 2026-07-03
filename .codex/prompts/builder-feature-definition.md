---
description: "Create grouped feature-definition.md from a source-material run"
argument-hint: "PROJECT_NAME=\"aiga\" [APP_AREAS=\"admin,app,server,ai-runtime\"] [EXTRA_CONTEXT=\"\"] [RUN_DIR=\"\"]"
---

Use `$bbr-feature-definition`.

All arguments: `$ARGUMENTS`

Create a feature definition for the project. If `PROJECT_NAME` is not supplied, use `aiga`.

Before analysis, require the operator to choose `APP_AREAS`. Allowed values are `admin`, `site`, `server`, `app`, `ai-runtime`.

If `APP_AREAS` is missing, do not proceed with analysis yet. First use the runtime's interactive user-input UI as a checkbox/multi-select picker when available.

Picker requirements:

- Prompt: `기능정의서 분석에 포함할 apps 범위를 선택해주세요.`
- Options:
  - `admin` — 관리자 운영, 검수, 백오피스 화면
  - `site` — 공개 웹서비스/SEO 웹 화면
  - `server` — API, 인증, 데이터 정책, 서버 처리
  - `app` — 사용자 앱/로그인 후 사용 화면
  - `ai-runtime` — OCR, 챗봇, 추천, AI 런타임
- Default/preselected values when supported: `admin`, `app`, `server`, `ai-runtime`
- Also collect optional free-text extra context with the prompt: `분석에 반영할 추가 설명이나 제외 범위를 입력해주세요. 없으면 비워두세요.`

After the operator responds, translate the selected checkbox values into comma-separated `APP_AREAS`, translate the free-text answer into `EXTRA_CONTEXT`, then continue. If the current Codex surface exposes no checkbox/multi-select input tool, ask the same two questions in chat and wait for the answer; do not infer scope silently.

If `APP_AREAS` is supplied, configure scope first:

```bash
cd <repo-root>
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-feature-definition/scripts/configure-feature-scope.ts \
  --project-name "<PROJECT_NAME or aiga>" \
  --areas "<APP_AREAS>" \
  --notes "<EXTRA_CONTEXT or empty>"
```

Then run the analysis preparation helper:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-feature-definition/scripts/prepare-feature-analysis.ts \
  --project-name "<PROJECT_NAME or aiga>"
```

If `RUN_DIR` is supplied, use `--run-dir "<RUN_DIR>"` instead of resolving latest-run by project name.

Then:

1. Read `feature-definition-scope.json`, `feature-definition-work/feature-analysis-input.json`, and `feature-definition-work/source-outline.md`.
2. Analyze every chunk. Do not skip chunks. Merge scattered requirements into the same feature when they describe the same capability, policy object, UI interaction, data object, state transition, or admin operation.
3. Write `<runDir>/feature-definition.md` grouped by feature. Every feature section must contain a table with exactly: `영역 | 기능명 | 상세 설명 | 메모`.
   - Use only selected `APP_AREAS` in the `영역` column.
   - Apply `EXTRA_CONTEXT` as an operator constraint or interpretation note.
4. For every feature, compare against `product-builder-base` and decide reuse.
   - Prefer codebase-memory MCP architecture/search tools for code discovery when available; fallback to local file search only when graph tools are unavailable or insufficient.
   - Use only these reuse types: `complete-reuse`, `partial-reuse`, `reuse-with-customization`, `new-implementation`, `not-applicable`.
   - Under every feature section in Markdown, add exactly one table:

```md
### product-builder-base 재사용 판단

| 재사용 유형 | 기준 surface | base 참조 | hard-copy 범위 | 커스터마이징 범위 | 메모 |
| --- | --- | --- | --- | --- | --- |
| partial-reuse | server, site | `packages/core/auth` | 세션/권한 가드 패턴 | 프로젝트별 회원 등급 정책 |  |
```

   - Do not add reuse columns to the main feature table.
   - `기준 surface` should be selected target areas. `base 참조` may name actual base paths/modules, even if the source module will be ported across surfaces.
5. Write `<runDir>/feature-coverage.json` with `featureId`, `featureName`, `sourceChunks`, `areas`, merge rationale, `reuse`, and `unmappedChunks`.
   - Each feature entry must include:

```json
"reuse": {
  "type": "partial-reuse",
  "surfaces": ["server", "site"],
  "baseReferences": ["packages/core/auth"],
  "hardCopyScope": "세션/권한 가드 패턴",
  "customizationScope": "프로젝트별 회원 등급 정책",
  "reason": "why this reuse type was selected"
}
```
6. Run validation:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-feature-definition/scripts/validate-feature-definition.ts \
  --project-name "<PROJECT_NAME or aiga>"
```

7. Run review:

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-feature-definition/scripts/review-feature-definition.ts \
  --project-name "<PROJECT_NAME or aiga>"
```

After review, perform an agent semantic self-review and patch the final deliverable files. Do not report completion with a draft plus a review document that still requires manual reconciliation.

Mandatory finalization loop:

1. Run validation and review.
2. Read `feature-definition.validation.json`, `feature-definition.review.json`, and `feature-definition-review.md`.
3. Perform semantic self-review against `feature-definition.md`, `feature-coverage.json`, and relevant source chunks.
4. Patch `feature-definition.md` and `feature-coverage.json` for every validation, scripted review, and semantic self-review finding that is not intentionally accepted.
5. Append the iteration summary to `feature-definition-loop.md`.
6. Rerun validation and review after patching.
7. Stop only when the current on-disk `feature-definition.md` and `feature-coverage.json` are the post-review revised artifacts, validation/review pass, and unresolved semantic findings are 0.

If warnings remain, accept them only with an explicit rationale in `feature-definition-loop.md`.

For broad source packs, continue with `/prompts:builder-feature-definition-loop PROJECT_NAME="<PROJECT_NAME or aiga>" MAX_ITERS="3"` when review findings need multiple refinement passes.

Allowed `영역` values are only the selected `APP_AREAS`. Leave `메모` empty because the user writes it.

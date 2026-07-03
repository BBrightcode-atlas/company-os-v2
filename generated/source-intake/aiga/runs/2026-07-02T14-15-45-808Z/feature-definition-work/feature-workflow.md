# Feature Definition Workflow - aiga

## Selected Scope

- Selected areas: admin, site, server
- Extra context: AI 채팅관련은 별도로 REST API로 받을 예정이다. 자체 구현은 생략한다.

1. Read `feature-analysis-input.json` completely.
2. Build atomic requirements for every chunk. Do not skip chunks just because a heading looks repetitive.
3. Merge scattered requirements into feature groups when they describe the same capability, policy object, UI interaction, data object, or state transition.
4. For each feature group, write one or more table rows using only the selected areas in the `영역` column: admin, site, server.
5. Leave `메모` empty because the user writes it.
6. Compare every feature group against `product-builder-base` and classify reuse as `complete-reuse`, `partial-reuse`, `reuse-with-customization`, `new-implementation`, or `not-applicable`.
7. Under every feature section, add exactly one `product-builder-base 재사용 판단` table with columns: `재사용 유형 | 기준 surface | base 참조 | hard-copy 범위 | 커스터마이징 범위 | 메모`.
8. Add the same reuse decision to each `feature-coverage.json.features[]` entry as a structured `reuse` object.
9. Write the first draft `feature-definition.md` and `feature-coverage.json` in the run directory.
10. Run `validate-feature-definition.ts --project-name aiga` and `review-feature-definition.ts --project-name aiga`.
11. Perform agent semantic self-review against feature-definition, feature coverage, and referenced source chunks.
12. Patch `feature-definition.md` and `feature-coverage.json` for every validation, scripted review, and semantic self-review finding that is not intentionally accepted.
13. Append the iteration summary to `feature-definition-loop.md`.
14. Rerun validation and review after the patch.
15. Stop only when the current on-disk feature-definition/coverage files are the post-review revised artifacts and validation/review have no unresolved findings.

Feature grouping rule:

- Policy doc + screen doc + common component doc can all be the same feature.
- Example: 비회원 제한 정책, LoginRequiredToast, GuestLimitModal, and daily read limit should be evaluated together before deciding feature boundaries.
- Do not produce duplicate features just because content appears under multiple source pages.

Reuse analysis rule:

- Prefer codebase-memory MCP architecture/search tools for `product-builder-base` discovery when available.
- Fallback to local file search only when graph tools are unavailable or insufficient.
- Do not force reuse. If only generic primitives exist, classify the domain feature as `new-implementation` and explain the reason in coverage JSON.

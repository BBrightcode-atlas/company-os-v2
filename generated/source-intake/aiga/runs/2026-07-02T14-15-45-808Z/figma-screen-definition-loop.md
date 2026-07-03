# Figma 화면정의서 보완 루프 - Aiga

## Iteration 1 - draft generation

- commands: inspected Figma via MCP get_metadata/get_screenshot, then generated Figma baseline docs from supplied 48 nodes.
- static findings: pending validation/review.
- semantic findings: every supplied Figma node mapped; page-level screenshot and 11 representative node screenshots analyzed; exact asset export remains an implementation-time action.
- changes: wrote figma-screen-definition.md, figma-screen-definitions/, figma-screen-coverage.json, figma-screen-definition-work/figma-mcp-analysis.md.
- remaining accepted warnings: pending.

## Iteration 2 - validation and accepted warning

- commands: validate-screen-definition.ts --workflow figma-baseline --project-name aiga; review-screen-definition.ts --workflow figma-baseline --project-name aiga.
- static findings: validation pass, error 0, warning 0.
- review findings: pass, error 0, warning 1, info 1.
- semantic findings: API-050 is an admin dashboard API from FEA-019/FEA-020, but the supplied Figma list contains only site/mobile user-facing nodes. It is intentionally not mapped to a Figma baseline screen and is covered by ADMIN-SCR-002 in the feature-centered screen-definition workflow.
- changes: accepted the figma-baseline-only warning in this loop file; no screen document changes required.
- remaining accepted warnings: API-050 unmapped in figma-baseline because no admin Figma node was supplied.

## Iteration 3 - mypage mapping correction

- commands: semantic self-review of aggregate screen list and Figma node titles.
- static findings: validation pass, error 0, warning 0 after rerun.
- review findings: pass, error 0, warning 1, info 1 after rerun.
- semantic findings: SITE-SCR-029, SITE-SCR-032, SITE-SCR-033, and SITE-SCR-035 were too broadly mapped to `/my`; SITE-SCR-031 의사 프로필 편집 was too broadly mapped to home. These were quality issues even though static validation passed.
- changes: corrected route, feature, API, schema, index, aggregate, and individual document references for the five affected Figma baseline screens.
- remaining accepted warnings: API-050 unmapped in figma-baseline because no admin Figma node was supplied.

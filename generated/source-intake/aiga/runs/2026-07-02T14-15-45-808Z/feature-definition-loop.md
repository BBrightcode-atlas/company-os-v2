# 기능정의서 보완 Loop - aiga

## Loop Policy

- 최대 반복: 3회
- 종료 조건: `feature-definition.validation.json.ok = true`, `feature-definition.review.json.ok = true`, review error 0개
- warning 처리 기준: 수정 가능한 경고는 수정한다. 하나의 원문 청크가 권한, UI, 운영 기능을 동시에 정의해 여러 feature에 걸리는 경우만 의도된 교차 매핑으로 수용한다.

## Iteration 1

### Commands

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-feature-definition/scripts/validate-feature-definition.ts \
  --project-name aiga

node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-feature-definition/scripts/review-feature-definition.ts \
  --project-name aiga
```

### Result

- validation: pass
- review: pass
- feature groups: 22
- table rows: 106
- source chunks: 370
- mapped chunks: 359
- explicitly unmapped chunks: 12
- review errors: 0
- review warnings: 23

### Changes Made In This Iteration

- `FEA-006 의사 리뷰와 후기 작성` coverage에서 `admin` 영역을 제거했다. 어드민 후기 관리는 `FEA-014 신고, 블라인드, 운영 처리`와 `FEA-020 어드민 사용자, 의사, 콘텐츠 관리`에서 별도 운영 기능으로 다룬다.
- `FEA-012 마이페이지, 내 활동, 고객지원, 회원탈퇴` coverage에서 `admin` 영역을 제거했다. 어드민 사용자 관리는 `FEA-020`에서 별도 운영 기능으로 다룬다.
- 수정 후 validation과 review를 다시 실행했다.

### Accepted Warnings

남은 warning은 모두 `chunk-overlap`이다. 아래 유형은 기능 중복이 아니라 원문 구조상 하나의 청크가 여러 구현 관점을 동시에 설명하기 때문에 유지한다.

- 의사 인증 버튼 노출, 인증 플로우, 의사 프로필 진입점이 함께 있는 청크: `FEA-001`, `FEA-008`, `FEA-010`에 교차 매핑한다.
- 게시글 상세 더보기, 삭제 placeholder, 신고, 댓글 정책이 함께 있는 청크: `FEA-004`, `FEA-005`, `FEA-014`에 교차 매핑한다.
- 의사 인증 후 커뮤니티, 리뷰, 마이페이지 변화가 함께 있는 청크: `FEA-009`, `FEA-010`, `FEA-012`에 교차 매핑한다.
- 의사 프로필 상세 모달과 리뷰 카드 이미지 그리드가 함께 있는 청크: `FEA-006`, `FEA-010`, `FEA-013`에 교차 매핑한다.
- 마이페이지 고객지원 진입점이 공지사항과 의견 보내기 양쪽의 상위 진입점으로 쓰이는 청크: `FEA-012`, `FEA-017`, `FEA-018`에 교차 매핑한다.

### Stop Decision

추가 반복은 하지 않는다. validation과 review 모두 pass이고, 남은 warning은 기능 중복이나 누락이 아니라 cross-cutting source coverage로 설명된다.

## Semantic Self-Review Addendum

2026-07-03 직접 리뷰 결과, static validation/review로는 잡히지 않는 의미 수준 이슈가 확인되었다. 따라서 다음 loop iteration에서는 아래 항목을 patch 대상으로 본다.

### Semantic Findings To Patch

1. `FEA-006 의사 리뷰와 후기 작성`의 `app | 리뷰 카드와 이미지 뷰어` 행이 `의사 후기 관리 화면`을 포함한다. 어드민 후기 관리 표현은 `admin` 행으로 분리하거나 `FEA-020`에만 남겨야 한다.
2. `FEA-007 병원 방문 인증과 OCR 뱃지`의 `app | 인증 뱃지 표시` 행이 `어드민 커뮤니티 관리`를 포함한다. 어드민 표시/관리 요구는 `admin` 행으로 분리해야 한다.
3. 병원 진료 인증 방식이 원문에서 일부 충돌한다. 커뮤니티 뱃지 섹션은 `영수증/처방전 등 제출 -> 관리자 검토`라고 쓰고, 후반 리뷰/정책 섹션은 OCR 자동 매칭을 명시한다. 산출물은 OCR 자동을 채택하되 `feature-coverage.json`에 충돌과 선택 근거를 남겨야 한다.
4. 의사 인증 검증 방식도 원문 충돌이 있다. 의사 인증 SSOT는 면허번호 포맷 검증 자동 승인인데, 어드민 문서에는 `면허번호 입력 + OCR 자동 인식 검증`이라고 되어 있다. SSOT 우선 적용과 어드민 문구 충돌을 coverage notes에 남겨야 한다.
5. `FEA-010 의사 프로필, 명의 찾기, 본인 프로필 관리`에는 어드민 처리 행만 있고 사용자 앱의 `의사 정보 수정 요청 제출` 흐름이 빠져 있다. `app` 행을 추가해야 한다.
6. `FEA-020 어드민 사용자, 의사, 콘텐츠 관리`의 `server | 자동 처리 영역 분리` 행이 챗봇 응답, OCR 판독, 추천 알고리즘을 한 server 행에 묶는다. `ai-runtime` 책임을 별도 행으로 분리해야 한다.

### Workflow Impact

앞으로 loop의 종료 조건은 static validation/review pass만으로 부족하다. semantic self-review에서 위와 같은 의미 수준 finding이 없거나, patch/accept rationale이 `feature-definition-loop.md`에 남아 있어야 종료한다.

## Iteration 2 - scope reset: admin/site/server

### Scope

- selected areas: `admin`, `site`, `server`
- operator note: `AI 채팅관련은 별도로 REST API로 받을 예정이다. 자체 구현은 생략한다.`
- interpretation: user-facing requirements are assigned to `site`; no `app` or `ai-runtime` rows are allowed. AI chat is represented only as external REST API integration, not as internal model/runtime implementation.

### Commands

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-feature-definition/scripts/configure-feature-scope.ts \
  --project-name aiga \
  --areas "admin,site,server" \
  --notes "AI 채팅관련은 별도로 REST API로 받을 예정이다. 자체 구현은 생략한다."

node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-feature-definition/scripts/prepare-feature-analysis.ts \
  --project-name aiga

node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-feature-definition/scripts/validate-feature-definition.ts \
  --project-name aiga

node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-feature-definition/scripts/review-feature-definition.ts \
  --project-name aiga
```

### Static Result

- validation: pass
- review: pass
- feature groups: 23
- table rows: 109
- source chunks: 370
- mapped chunks: 365
- explicitly unmapped chunks: 6
- review errors: 0
- review warnings: 0
- review info: coverage summary only

### Semantic Findings Checked

- `app` and `ai-runtime` are not used as Markdown table areas.
- User-facing rows were reclassified as `site`; admin operations remain `admin`; backend/API/policy rows remain `server`.
- AI chat 자체 구현 is omitted. `FEA-023` only defines external REST API request/response normalization and site rendering of returned chat/recommendation data.
- OCR and image moderation are not implemented as `ai-runtime`; they are represented as external API integrations under `server`, with admin fallback where the source mentions manual review.
- Hospital visit certification conflict is recorded in `feature-coverage.json`: OCR automatic badge vs receipt/prescription admin review is resolved as external OCR first, admin fallback.
- Doctor verification conflict is recorded in `feature-coverage.json`: SSOT format validation auto-approval is used for beta, with future external verification contract separation.
- The prior broad `server | 자동 처리 영역 분리` row was rewritten to exclude chatbot response implementation and to keep direct/manual/automatic operational boundaries clear.

### Changes Made In This Iteration

- Rewrote `feature-definition.md` for the selected scope.
- Rewrote `feature-coverage.json` with selected areas and explicit operator context.
- Added `FEA-023 외부 AI 채팅 REST API 연동` so the chat requirement is traceable without creating an internal AI runtime scope.
- Reduced coverage overlap warnings by assigning shared chunks to the most specific feature groups.

### Accepted Warnings

None. The only remaining review finding is informational coverage summary.

### Stop Decision

Stop after Iteration 2. Static validation passes, review has no errors or warnings, semantic self-review found no unresolved scope or responsibility conflicts, and all out-of-scope chunks are either mapped as external integration/fallback or explicitly unmapped with rationale.

## Iteration 3 - product-builder-base reuse mapping

### Purpose

Feature definition now needs to support downstream Product Builder implementation planning. Each feature should state whether it can reuse `product-builder-base`, which base references are useful, what can be hard-copied, and what must be customized.

### Commands

```bash
node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-feature-definition/scripts/prepare-feature-analysis.ts \
  --project-name aiga

node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-feature-definition/scripts/validate-feature-definition.ts \
  --project-name aiga

node cli/node_modules/tsx/dist/cli.mjs \
  .agents/skills/bbr-feature-definition/scripts/review-feature-definition.ts \
  --project-name aiga
```

### Static Result

- validation: pass
- review: pass
- feature groups: 23
- main feature table rows: 109
- reuse tables in Markdown: 23
- coverage entries with `reuse`: 23
- review errors: 0
- review warnings: 0
- review info: coverage summary only

### Changes Made In This Iteration

- Updated the workflow instructions so every feature must include a `product-builder-base 재사용 판단` table under the main feature table.
- Added structured `reuse` metadata to every `feature-coverage.json.features[]` entry.
- Added `reuseReference` metadata for `product-builder-base`.
- Classified reuse with the fixed enum: `complete-reuse`, `partial-reuse`, `reuse-with-customization`, `new-implementation`, `not-applicable`.
- Checked that each reuse `surfaces` value stays within the feature's selected areas.
- Kept AI chat as `new-implementation` only for external REST API integration; no `ai-runtime` or internal model/runtime implementation was added.
- Hardened `review-feature-definition.ts` so future runs fail when reuse tables or `feature-coverage.json.features[].reuse` are missing, malformed, out of scope, or mismatched.
- Adjusted `.gitignore` so `.agents/skills/bbr-feature-definition/**` can be version-controlled while other `.agents` local files remain ignored.

### Semantic Reuse Findings

- Community, comments, moderation, home feed, auth, feedback, identity verification, admin shell, common UI/error handling have reusable base foundations.
- Doctor profile, hospital visit certification, policy settings, and external AI chat REST integration require new project-specific implementation with only generic base primitives reused.
- Some base references live under `apps/app`; they are listed only as `base 참조` sources to port or copy from. Target `기준 surface` remains limited to selected project areas: `admin`, `site`, `server`.

### Stop Decision

Stop after Iteration 3. Static validation and review pass, reuse coverage is complete for all 23 feature groups, and semantic reuse checks pass.

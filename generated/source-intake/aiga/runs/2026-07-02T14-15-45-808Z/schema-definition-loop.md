# 스키마 정의서 보완 루프 - Aiga

## Iteration 1 - Mermaid 필드 정의 보강

- 명령:
  - `node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-schema-definition/scripts/validate-schema-definition.ts --project-name aiga`
  - `node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-schema-definition/scripts/review-schema-definition.ts --project-name aiga`
- 정적 검증 결과: pass, error 0, warning 0.
- 리뷰 결과: pass, 17 schemas, 23/23 features mapped, unmapped 0.
- 의미 검토:
  - 전체 관계는 `## 1. 전체 ERD(Mermaid Entity Relationship Diagram)`의 Mermaid `erDiagram`에 유지했다.
  - 각 스키마의 타입, 필드 이름, 설명, 기본값은 `### 3.5 Mermaid 스키마 필드 정의(Type, Name, Description, Default)`에 Mermaid 필드 주석으로 추가했다.
  - `schema-coverage.json`의 모든 필드에 `defaultValue`를 추가해 누락 시 validation이 실패하도록 했다.
  - AI 채팅은 외부 REST 세션/오류/추천 의사 매핑 스키마만 유지하고 내부 `ai-runtime` 구현 스키마는 추가하지 않았다.
- 패치:
  - `schema-definition.md`: Mermaid 필드 정의 섹션 추가.
  - `schema-coverage.json`: 17개 스키마, 129개 필드에 `defaultValue` 추가.
  - `validate-schema-definition.ts`: `defaultValue`와 Mermaid 필드 정의 섹션을 필수 검증으로 추가.
  - `review-schema-definition.ts`: Markdown에 필드명과 기본값이 노출되는지 리뷰 경고로 확인.
- 남은 허용 warning: 없음.

## Iteration 2 - table prefix 제거와 community base 재사용 강화

- 명령:
  - `node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-schema-definition/scripts/validate-schema-definition.ts --project-name aiga`
  - `node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-schema-definition/scripts/review-schema-definition.ts --project-name aiga`
- 정적 검증 결과: pass, error 0, warning 0.
- 리뷰 결과: pass, 17 schemas, 23/23 features mapped, unmapped 0.
- 의미 검토:
  - 모든 table name과 Mermaid 관계에서 `aiga_` prefix를 제거했다.
  - 커뮤니티 게시글은 `community_posts` / `communityPosts`를 기준으로 유지했다.
  - 커뮤니티 댓글은 `community_comments` / `communityComments`를 기준으로 유지했다.
  - 커뮤니티 공감/저장은 `community_votes` / `communityVotes`와 `community_saved_posts` / `communitySavedPosts`를 기준으로 재사용하도록 보강했다.
  - 커뮤니티 신고/운영 로그는 `community_reports` / `communityReports`와 `community_mod_logs` / `communityModLogs`를 기준으로 재사용하도록 보강했다.
  - Aiga 특화 요구는 신규 커뮤니티 테이블로 분리하지 않고 base community feature에 최소 확장하는 것으로 정리했다.
- 패치:
  - `schema-definition.md`: 전체 ERD, 기능별 ERD, 3.4 reuse table, 3.5 Mermaid 필드 정의의 테이블명을 prefix 없는 이름으로 변경.
  - `schema-coverage.json`: `tableName`, `drizzleExportName`, relations, indexes, baseDrizzleReferences를 prefix 없는 이름과 product-builder-base community export 기준으로 변경.
- 남은 허용 warning: 없음.

## Iteration 3 - product-builder-base community schema 직접 대조

- 명령:
  - codebase-memory `search_code`로 `packages/drizzle/src/schema/features/community/index.ts`의 `communities`, `communityPosts`, `communityComments`, `communityVotes`, `communityReports`, `communityModLogs`, `communitySavedPosts` export 확인
  - codebase-memory `get_code_snippet`으로 각 export의 실제 필드/관계 확인
  - `node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-schema-definition/scripts/validate-schema-definition.ts --project-name aiga`
  - `node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-schema-definition/scripts/review-schema-definition.ts --project-name aiga`
- 정적 검증 결과: pass, error 0, warning 0.
- 리뷰 결과: pass, 19 schemas, 23/23 features mapped, unmapped 0.
- 의미 검토:
  - `community_posts`, `community_reports`, `community_mod_logs`는 base schema에서 `community_id`가 필수이므로 부모 `community_communities`를 누락하면 안 된다.
  - `SCH-018 community_communities`를 추가하고 Aiga 공식 커뮤니티 seed 또는 질환/진료과 커뮤니티 seed 전략을 명시했다.
  - `SCH-006 community_posts`는 base의 `communityId`, `content`, `mediaUrls`, `status`, vote/comment/hot score fields를 기준으로 재정렬하고 Aiga 확장 필드는 질환/진료과/병원 인증으로 제한했다.
  - `SCH-007 community_comments`는 base `communityComments`처럼 `postId` 기반으로 두고, 리뷰 댓글을 섞지 않도록 했다.
  - `SCH-019 comment_comments`를 추가해 의사 리뷰 댓글은 product-builder-base generic `comments` schema 확장으로 분리했다.
  - `SCH-008 community_votes`는 community 공감만 담당하도록 줄이고 `community_saved_posts`와 저장 의료진을 억지로 묶지 않았다.
  - `SCH-012 community_reports`는 base `communityReports` / `communityModLogs` 구조에 맞춰 `communityId`와 post/comment/user target만 다루고, 후기 신고는 `reviewReports` 쪽과 admin view에서 병합하도록 정리했다.
- 패치:
  - `schema-definition.md`: 전체 ERD, 기능별 ERD, 3.1/3.2/3.4/3.5 섹션을 community base schema 기준으로 재생성.
  - `schema-coverage.json`: `SCH-018`, `SCH-019` 추가 및 `SCH-006`, `SCH-007`, `SCH-008`, `SCH-012` 필드/관계/base ref 수정.
- 남은 허용 warning: 없음.

## Iteration 4 - 구현 차단 항목 스키마 보완

- 명령:
  - `node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-schema-definition/scripts/validate-schema-definition.ts --project-name aiga`
  - `node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-schema-definition/scripts/review-schema-definition.ts --project-name aiga`
- 정적 검증 결과: pass, 26 schemas, error 0, warning 0.
- 리뷰 결과: pass, 26 schemas, 23/23 features mapped, unmapped 0, info 1.
- 의미 검토:
  - 파일 업로드/스토리지는 `SCH-020 files`로 product-builder-base `packages/drizzle/src/schema/core/files.ts`를 확장한다.
  - 저장한 의료진은 `SCH-021 saved_doctors`로 분리해 `users`와 `doctor_profiles` 사이의 사용자별 저장 관계를 명확히 했다.
  - 분석 이벤트는 `SCH-022 analytics_events`로 서버 수집 taxonomy, screen/action/result/errorCode, PHI 제거 저장 정책을 명시했다.
  - 어드민 2FA/세션 정책은 `SCH-023 admin_mfa_factors`로 Better Auth session/verifications 확장 범위를 명시했다.
  - 콘텐츠 안전 로그, 외부 OCR/이미지 안전/외부 AI REST 호출 비용은 `SCH-024 content_safety_logs`, `SCH-025 integration_call_logs`로 분리했다.
  - 원본 보관/수정/삭제 이력은 `SCH-026 content_edit_histories`로 분리하고 게시글, 댓글, 후기, 리뷰 댓글에 연결했다.
  - `doctor_profiles`, `doctor_reviews`, `community_posts`, `community_comments`, `comment_comments`, `content_safety_rules`에 세부 필드와 soft-delete/edit-history/status 필드를 보강했다.
- 패치:
  - `schema-definition.md`: 전체 ERD, 기능별 ERD, feature-to-schema matrix, component scope, per-schema reuse, Mermaid field definition을 26개 스키마 기준으로 갱신.
  - `schema-coverage.json`: `SCH-020`..`SCH-026` 추가, 기존 스키마 필드/관계/acceptance criteria 보강.
- 남은 허용 warning: 없음.

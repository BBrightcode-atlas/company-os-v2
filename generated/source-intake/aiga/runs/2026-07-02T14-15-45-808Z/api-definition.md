# REST API 정의서(REST API Definition) - aiga

이 문서의 기준 산출물은 `api-definition.openapi.yaml`이다. 아래 표는 구현/QA/화면정의서에서 빠르게 참조하기 위한 색인이다.

## 1. OpenAPI 산출물

| 항목 | 파일 |
| --- | --- |
| Primary OpenAPI YAML | `api-definition.openapi.yaml` |
| OpenAPI JSON mirror | `api-definition.openapi.json` |
| Coverage JSON | `api-coverage.json` |

## 2. 기준 코드베이스(Base Server API Baseline)

| 항목(Item) | 기준(Baseline) |
| --- | --- |
| 기준 repo(Base Repo) | `product-builder-base` |
| Server exposure | `apps/server` REST `/api` |
| Feature API packages | `packages/features/{feature-name}` |
| Feature package pattern | `controller/*`, `service/*`, `dto/*`, `{feature}.module.ts`, `index.ts` |
| 작성 원칙(Authoring Rule) | 기능정의서와 스키마 정의서를 함께 읽고 endpoint별 `REUSE`/`EXTEND`/`NEW`/`N/A`를 판정한다. |
| AI chat scope | 내부 AI generation은 제외하고 외부 REST 연동 API만 정의한다. |

## 3. 기능 기준 API 매핑(Feature-to-API Matrix)

| 기능 코드 | 기능 | 대상 surface | 연결 API | 기본 판정 | base API 후보 |
| --- | --- | --- | --- | --- | --- |
| FEA-001 | 회원 등급 및 권한 정책 | server, site | API-001, API-002, API-023, API-027, API-035, API-057 | EXTEND | packages/core/auth<br>packages/drizzle/src/schema/core/auth.ts<br>packages/drizzle/src/schema/core/profiles.ts<br>packages/drizzle/src/schema/core/role-permission/user-roles.ts |
| FEA-002 | 인증, 로그인, 세션, SNS 계정 통합 | server, site | API-001, API-002, API-003, API-004, API-005 | EXTEND | apps/site/src/modules/auth<br>packages/core/auth<br>apps/admin/src/features/auth |
| FEA-003 | 비회원 제한, 한도, 로그인 유도 | server, site | API-001, API-007, API-008, API-009, API-011, API-022 | EXTEND | apps/site/src/components/gated-cta.tsx<br>packages/core/auth/guards<br>packages/core/rate-limit |
| FEA-004 | 커뮤니티 피드, 글쓰기, 상세, 임시저장 | server, site | API-020, API-021, API-022, API-023, API-024, API-025, API-033, API-079, API-080, API-082, API-097 | EXTEND | packages/features/community<br>apps/app/src/features/community<br>packages/drizzle/src/schema/features/community/index.ts |
| FEA-005 | 댓글, 대댓글, 공감 인터랙션 | server, site | API-026, API-027, API-028, API-029, API-030, API-031, API-039, API-040, API-041, API-042, API-048, API-076, API-077, API-082, API-097 | EXTEND | packages/features/comment<br>packages/widgets/src/comment<br>packages/features/reaction<br>packages/widgets/src/reaction |
| FEA-006 | 의사 리뷰와 후기 작성 | server, site | API-018, API-034, API-035, API-036, API-037, API-038, API-039, API-040, API-041, API-042, API-048, API-062, API-063, API-076, API-077, API-079, API-080, API-081, API-082, API-097 | EXTEND | packages/drizzle/src/schema/core/reviews.ts<br>packages/widgets/src/comment |
| FEA-007 | 병원 방문 인증과 증빙 뱃지 | server, admin, site | API-018, API-019, API-023, API-034, API-035, API-048, API-058, API-059, API-076, API-077, API-079, API-080, API-081, API-094, API-095 | NEW | packages/features/identity-verification<br>packages/core/storage<br>apps/admin/src/features/identity-verification |
| FEA-008 | 의사 인증 플로우와 면허번호 검증 | server, site | API-013, API-014, API-015, API-016, API-017, API-056, API-057 | EXTEND | packages/features/identity-verification<br>apps/kcb-identity-server<br>apps/admin/src/features/identity-verification |
| FEA-009 | 의사 인증 표시와 실명 전환 | server, site | API-011, API-016, API-017, API-022, API-023, API-026, API-027, API-040, API-057, API-096 | EXTEND | packages/drizzle/src/schema/core/profiles.ts<br>packages/features/community<br>packages/features/comment<br>packages/drizzle/src/schema/core/reviews.ts |
| FEA-010 | 의사 프로필, 명의 찾기, 정보 수정 요청 | server, site, admin | API-010, API-011, API-012, API-034, API-035, API-049, API-052, API-053, API-054, API-055, API-083, API-084, API-085 | EXTEND | packages/drizzle/src/schema/core/profiles.ts<br>packages/drizzle/src/schema/core/reviews.ts<br>apps/admin/src/features/profile<br>packages/features/_common/service/user-profile.service.ts |
| FEA-011 | 통합 검색, 명의 찾기 검색, 입력 보안 | server, site | API-007, API-008, API-009, API-010, API-021 | EXTEND | packages/features/community<br>apps/app/src/features/community/hooks<br>packages/api-client<br>packages/core/error |
| FEA-012 | 마이페이지, 내 활동, 고객지원, 회원탈퇴 | server, site | API-002, API-003, API-005, API-006, API-034, API-037, API-044, API-045, API-047, API-082, API-083, API-084, API-085 | EXTEND | packages/drizzle/src/schema/core/profiles.ts<br>packages/drizzle/src/schema/core/user-preferences.ts<br>packages/drizzle/src/schema/core/terms.ts<br>packages/features/feedback |
| FEA-013 | 공통 UI 상태, 네비게이션, 중복 액션 방지 | server, site | API-001, API-048, API-076, API-077 | EXTEND | packages/ui<br>packages/core/error<br>packages/core/i18n<br>apps/site/src/components/site-header.tsx<br>apps/site/src/lib/api.ts |
| FEA-014 | 신고, 블라인드, 운영 처리 | server, site, admin | API-020, API-021, API-022, API-024, API-025, API-026, API-028, API-029, API-032, API-034, API-036, API-037, API-038, API-039, API-040, API-041, API-042, API-060, API-061, API-062, API-063, API-097 | EXTEND | apps/admin/src/features/community/routes/mod-queue-page.tsx<br>apps/admin/src/features/community/hooks/use-moderation.ts<br>packages/features/community<br>packages/drizzle/src/schema/features/community/index.ts |
| FEA-015 | 콘텐츠 안전 자동 차단 | server, site, admin | API-018, API-021, API-022, API-023, API-024, API-026, API-027, API-028, API-032, API-035, API-036, API-040, API-041, API-060, API-061, API-064, API-065, API-066, API-079, API-080, API-081, API-093, API-094, API-095 | EXTEND | apps/app/src/features/community/hooks/useProfanityCheck.ts<br>apps/admin/src/features/community/hooks/use-moderation.ts<br>packages/core/integrations/server<br>packages/core/storage |
| FEA-016 | 홈 운영과 사용자 홈 노출 | admin, server, site | API-010, API-020, API-021, API-033, API-043, API-067, API-068, API-069, API-070, API-079, API-080, API-081 | EXTEND | apps/admin/src/features/community/routes/home-feed-page.tsx<br>apps/admin/src/features/community/pages/home-feed.tsx<br>apps/admin/src/features/community/utils/hot-algorithm.ts<br>packages/features/community |
| FEA-017 | 공지사항과 정책 콘텐츠 관리 | server, site, admin | API-043, API-044, API-045, API-046, API-071, API-072, API-073 | EXTEND | packages/drizzle/src/schema/core/terms.ts<br>apps/site/src/modules/registry.ts<br>packages/ui |
| FEA-018 | 의견 보내기와 운영자 종결 | server, site, admin | API-047, API-071, API-073, API-074, API-075 | EXTEND | packages/features/feedback<br>packages/features/feedback/controller<br>packages/features/feedback/service |
| FEA-019 | 어드민 공통 운영, 권한, 감사 로그 | admin, server | API-050, API-051, API-078, API-087, API-088, API-089, API-090, API-091, API-092 | EXTEND | apps/admin/src/layouts/admin-layout.tsx<br>apps/admin/src/features/auth<br>packages/core/nestjs/auth/admin.guard.ts<br>apps/admin/src/pages/admin/dashboard.tsx |
| FEA-020 | 어드민 사용자, 의사, 콘텐츠 관리 | admin, server | API-012, API-016, API-050, API-051, API-052, API-053, API-054, API-055, API-056, API-057, API-058, API-059, API-060, API-061, API-062, API-063, API-067, API-068, API-069, API-070, API-071, API-072, API-073, API-074, API-075, API-078, API-096, API-097 | EXTEND | packages/features/_common/service/admin-users.service.ts<br>apps/admin/src/pages/admin/users.tsx<br>apps/admin/src/features/community<br>apps/admin/src/features/profile |
| FEA-021 | 운영 정책 설정 | server, admin, site | API-001, API-023, API-024, API-025, API-027, API-028, API-029, API-035, API-036, API-037, API-048, API-076, API-077 | NEW | packages/ui<br>apps/admin/src/features/community<br>packages/core/error |
| FEA-022 | 개인정보, 접근성, 분석 이벤트 | server, site, admin | API-001, API-002, API-003, API-006, API-013, API-014, API-015, API-018, API-019, API-023, API-024, API-025, API-032, API-035, API-038, API-046, API-049, API-051, API-053, API-056, API-057, API-059, API-060, API-061, API-062, API-063, API-064, API-065, API-066, API-072, API-073, API-078, API-079, API-080, API-081, API-086, API-087, API-088, API-089, API-090, API-091, API-092, API-093, API-094, API-095, API-096, API-097 | EXTEND | packages/core/analytics<br>packages/core/i18n/user-facing-error.ts<br>packages/core/logger<br>packages/core/nestjs/auth<br>packages/ui |
| FEA-023 | 외부 AI 채팅 REST API 연동 | server, site | API-049, API-094, API-095 | NEW | packages/api-client<br>apps/site/src/lib/api.ts<br>packages/core/integrations/server |

## 4. 기능별 API 묶음(Feature API Groups)

OpenAPI YAML의 `tags`도 아래 feature label과 동일하게 구성한다. 여러 feature에 걸친 API는 연결된 feature 섹션마다 반복해서 표시한다.

### FEA-001 회원 등급 및 권한 정책

| API | Method | Path | Auth | Schemas | Reuse | Domain | Audit | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-001 | GET | `/api/app-context` | optional | SCH-001, SCH-002, SCH-014 | EXTEND | Auth & Session | none | 사이트 앱 컨텍스트 조회 |
| API-002 | GET | `/api/me` | bearer | SCH-001 | EXTEND | Auth & Session | none | 현재 사용자 세션과 등급 조회 |
| API-023 | POST | `/api/community/posts` | bearer | SCH-001, SCH-006, SCH-010, SCH-014, SCH-016, SCH-018 | EXTEND | Community | community.post.create | 커뮤니티 게시글 작성 |
| API-027 | POST | `/api/community/comments` | bearer | SCH-001, SCH-007, SCH-014, SCH-016 | EXTEND | Community | community.comment.create | 커뮤니티 댓글 작성 |
| API-035 | POST | `/api/doctors/{doctorProfileId}/reviews` | bearer | SCH-001, SCH-003, SCH-009, SCH-010, SCH-014, SCH-016 | EXTEND | Doctor Reviews | doctor_review.create | 의사 후기 작성 |
| API-057 | PATCH | `/api/admin/doctor-verifications/{requestId}` | admin | SCH-001, SCH-003, SCH-005, SCH-013 | EXTEND | Admin | admin.doctor_verification.resolve | 의사 인증 요청 승인/반려 |

### FEA-002 인증, 로그인, 세션, SNS 계정 통합

| API | Method | Path | Auth | Schemas | Reuse | Domain | Audit | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-001 | GET | `/api/app-context` | optional | SCH-001, SCH-002, SCH-014 | EXTEND | Auth & Session | none | 사이트 앱 컨텍스트 조회 |
| API-002 | GET | `/api/me` | bearer | SCH-001 | EXTEND | Auth & Session | none | 현재 사용자 세션과 등급 조회 |
| API-003 | PATCH | `/api/me/profile` | bearer | SCH-001 | EXTEND | Auth & Session | user.profile.update | 내 프로필 수정 |
| API-004 | POST | `/api/auth/oauth/{provider}/callback` | none | SCH-001 | EXTEND | Auth & Session | auth.oauth.callback | SNS 로그인 콜백 처리 |
| API-005 | POST | `/api/auth/logout` | bearer | SCH-001 | EXTEND | Auth & Session | auth.logout | 로그아웃 |

### FEA-003 비회원 제한, 한도, 로그인 유도

| API | Method | Path | Auth | Schemas | Reuse | Domain | Audit | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-001 | GET | `/api/app-context` | optional | SCH-001, SCH-002, SCH-014 | EXTEND | Auth & Session | none | 사이트 앱 컨텍스트 조회 |
| API-007 | GET | `/api/guest-limits` | optional | SCH-002 | EXTEND | Guest Limits | none | 비회원 사용 한도 조회 |
| API-008 | POST | `/api/guest-limits/events` | optional | SCH-002 | EXTEND | Guest Limits | guest.limit.event | 비회원 제한 이벤트 차감 |
| API-009 | GET | `/api/search` | optional | SCH-002, SCH-003, SCH-006 | EXTEND | Search | none | 통합 검색 |
| API-011 | GET | `/api/doctors/{doctorProfileId}` | optional | SCH-002, SCH-003, SCH-009 | NEW | Doctor Profiles | none | 의사 프로필 상세 |
| API-022 | GET | `/api/community/posts/{postId}` | optional | SCH-002, SCH-006, SCH-007, SCH-008, SCH-012 | EXTEND | Community | none | 커뮤니티 게시글 상세 |

### FEA-004 커뮤니티 피드, 글쓰기, 상세, 임시저장

| API | Method | Path | Auth | Schemas | Reuse | Domain | Audit | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-020 | GET | `/api/community` | optional | SCH-018 | REUSE | Community | none | 커뮤니티 공간 목록 |
| API-021 | GET | `/api/community/posts` | optional | SCH-006, SCH-018, SCH-016 | EXTEND | Community | none | 커뮤니티 게시글 목록 |
| API-022 | GET | `/api/community/posts/{postId}` | optional | SCH-002, SCH-006, SCH-007, SCH-008, SCH-012 | EXTEND | Community | none | 커뮤니티 게시글 상세 |
| API-023 | POST | `/api/community/posts` | bearer | SCH-001, SCH-006, SCH-010, SCH-014, SCH-016, SCH-018 | EXTEND | Community | community.post.create | 커뮤니티 게시글 작성 |
| API-024 | PUT | `/api/community/posts/{postId}` | bearer | SCH-006, SCH-014, SCH-016 | EXTEND | Community | community.post.update | 커뮤니티 게시글 수정 |
| API-025 | DELETE | `/api/community/posts/{postId}` | bearer | SCH-006, SCH-014, SCH-013 | EXTEND | Community | community.post.delete | 커뮤니티 게시글 삭제 |
| API-033 | GET | `/api/community/feed/home` | optional | SCH-006, SCH-011, SCH-018 | EXTEND | Home Curation | none | 홈 커뮤니티 피드 조회 |
| API-079 | POST | `/api/files/upload-url` | bearer | SCH-020, SCH-024, SCH-025 | EXTEND | Files | file.upload_url.create | 파일 업로드 URL 생성 |
| API-080 | POST | `/api/files/confirm` | bearer | SCH-020, SCH-024, SCH-025 | EXTEND | Files | file.upload.confirm | 파일 업로드 확정 |
| API-082 | GET | `/api/me/activity` | bearer | SCH-006, SCH-007, SCH-009, SCH-019, SCH-021 | EXTEND | My Page | none | 내 활동 집계 조회 |
| API-097 | GET | `/api/admin/content-edit-histories` | admin | SCH-006, SCH-007, SCH-009, SCH-019, SCH-026, SCH-013 | NEW | Admin | none | 콘텐츠 수정 이력 조회 |

### FEA-005 댓글, 대댓글, 공감 인터랙션

| API | Method | Path | Auth | Schemas | Reuse | Domain | Audit | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-026 | GET | `/api/community/posts/{postId}/comments` | optional | SCH-007, SCH-012 | EXTEND | Community | none | 커뮤니티 게시글 댓글 목록 |
| API-027 | POST | `/api/community/comments` | bearer | SCH-001, SCH-007, SCH-014, SCH-016 | EXTEND | Community | community.comment.create | 커뮤니티 댓글 작성 |
| API-028 | PUT | `/api/community/comments/{commentId}` | bearer | SCH-007, SCH-014, SCH-016 | EXTEND | Community | community.comment.update | 커뮤니티 댓글 수정 |
| API-029 | DELETE | `/api/community/comments/{commentId}` | bearer | SCH-007, SCH-014, SCH-013 | EXTEND | Community | community.comment.delete | 커뮤니티 댓글 삭제 |
| API-030 | POST | `/api/community/votes` | bearer | SCH-008 | REUSE | Community | community.vote.create | 커뮤니티 공감 등록 |
| API-031 | DELETE | `/api/community/votes` | bearer | SCH-008 | REUSE | Community | community.vote.delete | 커뮤니티 공감 취소 |
| API-039 | GET | `/api/comment` | optional | SCH-019 | EXTEND | Review Comments | none | 리뷰 댓글 목록 |
| API-040 | POST | `/api/comment` | bearer | SCH-019, SCH-016 | EXTEND | Review Comments | review_comment.create | 리뷰 댓글 작성 |
| API-041 | PUT | `/api/comment/{commentId}` | bearer | SCH-019, SCH-016 | EXTEND | Review Comments | review_comment.update | 리뷰 댓글 수정 |
| API-042 | DELETE | `/api/comment/{commentId}` | bearer | SCH-019, SCH-013 | EXTEND | Review Comments | review_comment.delete | 리뷰 댓글 삭제 |
| API-048 | GET | `/api/operational-policies/effective` | optional | SCH-014 | NEW | Operational Policies | none | 적용 중 운영 정책 조회 |
| API-076 | GET | `/api/admin/operational-policies` | admin | SCH-014, SCH-013 | NEW | Operational Policies | none | 운영 정책 목록 |
| API-077 | PUT | `/api/admin/operational-policies/{policyKey}` | admin | SCH-014, SCH-013 | NEW | Operational Policies | admin.operational_policy.upsert | 운영 정책 저장 |
| API-082 | GET | `/api/me/activity` | bearer | SCH-006, SCH-007, SCH-009, SCH-019, SCH-021 | EXTEND | My Page | none | 내 활동 집계 조회 |
| API-097 | GET | `/api/admin/content-edit-histories` | admin | SCH-006, SCH-007, SCH-009, SCH-019, SCH-026, SCH-013 | NEW | Admin | none | 콘텐츠 수정 이력 조회 |

### FEA-006 의사 리뷰와 후기 작성

| API | Method | Path | Auth | Schemas | Reuse | Domain | Audit | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-018 | POST | `/api/medical-visit-verifications` | bearer | SCH-009, SCH-010, SCH-016 | NEW | Medical Visit Verification | medical_visit_verification.create | 병원 방문 인증 제출 |
| API-034 | GET | `/api/doctors/{doctorProfileId}/reviews` | optional | SCH-003, SCH-009, SCH-010, SCH-019 | EXTEND | Doctor Reviews | none | 의사 후기 목록 |
| API-035 | POST | `/api/doctors/{doctorProfileId}/reviews` | bearer | SCH-001, SCH-003, SCH-009, SCH-010, SCH-014, SCH-016 | EXTEND | Doctor Reviews | doctor_review.create | 의사 후기 작성 |
| API-036 | PATCH | `/api/reviews/{reviewId}` | bearer | SCH-009, SCH-014, SCH-016 | NEW | Doctor Reviews | doctor_review.update | 의사 후기 수정 |
| API-037 | DELETE | `/api/reviews/{reviewId}` | bearer | SCH-009, SCH-014, SCH-013 | NEW | Doctor Reviews | doctor_review.delete | 의사 후기 삭제 |
| API-038 | POST | `/api/reviews/{reviewId}/reports` | bearer | SCH-009, SCH-012, SCH-013 | EXTEND | Moderation | doctor_review.report.create | 의사 후기 신고 |
| API-039 | GET | `/api/comment` | optional | SCH-019 | EXTEND | Review Comments | none | 리뷰 댓글 목록 |
| API-040 | POST | `/api/comment` | bearer | SCH-019, SCH-016 | EXTEND | Review Comments | review_comment.create | 리뷰 댓글 작성 |
| API-041 | PUT | `/api/comment/{commentId}` | bearer | SCH-019, SCH-016 | EXTEND | Review Comments | review_comment.update | 리뷰 댓글 수정 |
| API-042 | DELETE | `/api/comment/{commentId}` | bearer | SCH-019, SCH-013 | EXTEND | Review Comments | review_comment.delete | 리뷰 댓글 삭제 |
| API-048 | GET | `/api/operational-policies/effective` | optional | SCH-014 | NEW | Operational Policies | none | 적용 중 운영 정책 조회 |
| API-062 | GET | `/api/admin/review-reports` | admin | SCH-009, SCH-012, SCH-013 | EXTEND | Admin | none | 후기 신고 목록 |
| API-063 | POST | `/api/admin/review-reports/{reportId}/resolve` | admin | SCH-009, SCH-012, SCH-013 | EXTEND | Admin | admin.review_report.resolve | 후기 신고 처리 |
| API-076 | GET | `/api/admin/operational-policies` | admin | SCH-014, SCH-013 | NEW | Operational Policies | none | 운영 정책 목록 |
| API-077 | PUT | `/api/admin/operational-policies/{policyKey}` | admin | SCH-014, SCH-013 | NEW | Operational Policies | admin.operational_policy.upsert | 운영 정책 저장 |
| API-079 | POST | `/api/files/upload-url` | bearer | SCH-020, SCH-024, SCH-025 | EXTEND | Files | file.upload_url.create | 파일 업로드 URL 생성 |
| API-080 | POST | `/api/files/confirm` | bearer | SCH-020, SCH-024, SCH-025 | EXTEND | Files | file.upload.confirm | 파일 업로드 확정 |
| API-081 | GET | `/api/files/{fileId}/signed-url` | bearer | SCH-020 | EXTEND | Files | none | 파일 signed URL 조회 |
| API-082 | GET | `/api/me/activity` | bearer | SCH-006, SCH-007, SCH-009, SCH-019, SCH-021 | EXTEND | My Page | none | 내 활동 집계 조회 |
| API-097 | GET | `/api/admin/content-edit-histories` | admin | SCH-006, SCH-007, SCH-009, SCH-019, SCH-026, SCH-013 | NEW | Admin | none | 콘텐츠 수정 이력 조회 |

### FEA-007 병원 방문 인증과 증빙 뱃지

| API | Method | Path | Auth | Schemas | Reuse | Domain | Audit | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-018 | POST | `/api/medical-visit-verifications` | bearer | SCH-009, SCH-010, SCH-016 | NEW | Medical Visit Verification | medical_visit_verification.create | 병원 방문 인증 제출 |
| API-019 | GET | `/api/medical-visit-verifications/{verificationId}` | bearer | SCH-010 | NEW | Medical Visit Verification | none | 병원 방문 인증 상태 조회 |
| API-023 | POST | `/api/community/posts` | bearer | SCH-001, SCH-006, SCH-010, SCH-014, SCH-016, SCH-018 | EXTEND | Community | community.post.create | 커뮤니티 게시글 작성 |
| API-034 | GET | `/api/doctors/{doctorProfileId}/reviews` | optional | SCH-003, SCH-009, SCH-010, SCH-019 | EXTEND | Doctor Reviews | none | 의사 후기 목록 |
| API-035 | POST | `/api/doctors/{doctorProfileId}/reviews` | bearer | SCH-001, SCH-003, SCH-009, SCH-010, SCH-014, SCH-016 | EXTEND | Doctor Reviews | doctor_review.create | 의사 후기 작성 |
| API-048 | GET | `/api/operational-policies/effective` | optional | SCH-014 | NEW | Operational Policies | none | 적용 중 운영 정책 조회 |
| API-058 | GET | `/api/admin/medical-visit-verifications` | admin | SCH-010, SCH-013 | NEW | Admin | none | 병원 방문 인증 검토 목록 |
| API-059 | PATCH | `/api/admin/medical-visit-verifications/{verificationId}` | admin | SCH-010, SCH-013 | NEW | Admin | admin.medical_visit_verification.resolve | 병원 방문 인증 수동 처리 |
| API-076 | GET | `/api/admin/operational-policies` | admin | SCH-014, SCH-013 | NEW | Operational Policies | none | 운영 정책 목록 |
| API-077 | PUT | `/api/admin/operational-policies/{policyKey}` | admin | SCH-014, SCH-013 | NEW | Operational Policies | admin.operational_policy.upsert | 운영 정책 저장 |
| API-079 | POST | `/api/files/upload-url` | bearer | SCH-020, SCH-024, SCH-025 | EXTEND | Files | file.upload_url.create | 파일 업로드 URL 생성 |
| API-080 | POST | `/api/files/confirm` | bearer | SCH-020, SCH-024, SCH-025 | EXTEND | Files | file.upload.confirm | 파일 업로드 확정 |
| API-081 | GET | `/api/files/{fileId}/signed-url` | bearer | SCH-020 | EXTEND | Files | none | 파일 signed URL 조회 |
| API-094 | GET | `/api/admin/integration-call-logs` | admin | SCH-020, SCH-025, SCH-013 | EXTEND | Integrations | none | 외부 연동 호출 로그 조회 |
| API-095 | GET | `/api/admin/integrations/status` | admin | SCH-015, SCH-024, SCH-025 | EXTEND | Integrations | none | 외부 연동 상태 조회 |

### FEA-008 의사 인증 플로우와 면허번호 검증

| API | Method | Path | Auth | Schemas | Reuse | Domain | Audit | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-013 | POST | `/api/identity-verifications/kcb/sessions` | optional | SCH-005 | EXTEND | Doctor Verification | identity.kcb.session.create | KCB 본인확인 세션 생성 |
| API-014 | GET | `/api/identity-verifications/kcb/sessions/{sessionId}` | optional | SCH-005 | REUSE | Doctor Verification | none | KCB 본인확인 세션 조회 |
| API-015 | POST | `/api/identity-verifications/kcb/sessions/{sessionId}/link` | bearer | SCH-001, SCH-005 | REUSE | Doctor Verification | identity.kcb.session.link | KCB 본인확인 세션 사용자 연결 |
| API-016 | POST | `/api/doctor-verifications/license` | bearer | SCH-001, SCH-003, SCH-005, SCH-013 | EXTEND | Doctor Verification | doctor_verification.license.submit | 의사 면허 검증 제출 |
| API-017 | GET | `/api/doctor-verifications/me` | bearer | SCH-001, SCH-003, SCH-005 | EXTEND | Doctor Verification | none | 내 의사 인증 상태 조회 |
| API-056 | GET | `/api/admin/doctor-verifications` | admin | SCH-001, SCH-003, SCH-005, SCH-013 | EXTEND | Admin | none | 의사 인증 요청 목록 |
| API-057 | PATCH | `/api/admin/doctor-verifications/{requestId}` | admin | SCH-001, SCH-003, SCH-005, SCH-013 | EXTEND | Admin | admin.doctor_verification.resolve | 의사 인증 요청 승인/반려 |

### FEA-009 의사 인증 표시와 실명 전환

| API | Method | Path | Auth | Schemas | Reuse | Domain | Audit | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-011 | GET | `/api/doctors/{doctorProfileId}` | optional | SCH-002, SCH-003, SCH-009 | NEW | Doctor Profiles | none | 의사 프로필 상세 |
| API-016 | POST | `/api/doctor-verifications/license` | bearer | SCH-001, SCH-003, SCH-005, SCH-013 | EXTEND | Doctor Verification | doctor_verification.license.submit | 의사 면허 검증 제출 |
| API-017 | GET | `/api/doctor-verifications/me` | bearer | SCH-001, SCH-003, SCH-005 | EXTEND | Doctor Verification | none | 내 의사 인증 상태 조회 |
| API-022 | GET | `/api/community/posts/{postId}` | optional | SCH-002, SCH-006, SCH-007, SCH-008, SCH-012 | EXTEND | Community | none | 커뮤니티 게시글 상세 |
| API-023 | POST | `/api/community/posts` | bearer | SCH-001, SCH-006, SCH-010, SCH-014, SCH-016, SCH-018 | EXTEND | Community | community.post.create | 커뮤니티 게시글 작성 |
| API-026 | GET | `/api/community/posts/{postId}/comments` | optional | SCH-007, SCH-012 | EXTEND | Community | none | 커뮤니티 게시글 댓글 목록 |
| API-027 | POST | `/api/community/comments` | bearer | SCH-001, SCH-007, SCH-014, SCH-016 | EXTEND | Community | community.comment.create | 커뮤니티 댓글 작성 |
| API-040 | POST | `/api/comment` | bearer | SCH-019, SCH-016 | EXTEND | Review Comments | review_comment.create | 리뷰 댓글 작성 |
| API-057 | PATCH | `/api/admin/doctor-verifications/{requestId}` | admin | SCH-001, SCH-003, SCH-005, SCH-013 | EXTEND | Admin | admin.doctor_verification.resolve | 의사 인증 요청 승인/반려 |
| API-096 | POST | `/api/admin/doctors/{doctorProfileId}/verification-cancel` | admin | SCH-003, SCH-005, SCH-013 | NEW | Admin | admin.doctor_verification.cancel | 의사 인증 취소 |

### FEA-010 의사 프로필, 명의 찾기, 정보 수정 요청

| API | Method | Path | Auth | Schemas | Reuse | Domain | Audit | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-010 | GET | `/api/doctors` | optional | SCH-003, SCH-002 | NEW | Doctor Profiles | none | 명의 찾기 의사 목록 |
| API-011 | GET | `/api/doctors/{doctorProfileId}` | optional | SCH-002, SCH-003, SCH-009 | NEW | Doctor Profiles | none | 의사 프로필 상세 |
| API-012 | POST | `/api/doctors/{doctorProfileId}/change-requests` | bearer | SCH-003, SCH-004, SCH-013 | NEW | Doctor Profiles | doctor_profile.change_request.create | 의사 정보 수정 요청 |
| API-034 | GET | `/api/doctors/{doctorProfileId}/reviews` | optional | SCH-003, SCH-009, SCH-010, SCH-019 | EXTEND | Doctor Reviews | none | 의사 후기 목록 |
| API-035 | POST | `/api/doctors/{doctorProfileId}/reviews` | bearer | SCH-001, SCH-003, SCH-009, SCH-010, SCH-014, SCH-016 | EXTEND | Doctor Reviews | doctor_review.create | 의사 후기 작성 |
| API-049 | POST | `/api/ai-chat/messages` | optional | SCH-003, SCH-015 | NEW | External AI Chat | external_ai_chat.message.send | 외부 AI 채팅 REST 메시지 전송 |
| API-052 | GET | `/api/admin/doctors` | admin | SCH-003, SCH-009, SCH-013 | EXTEND | Admin | none | 어드민 의사 목록 |
| API-053 | PATCH | `/api/admin/doctors/{doctorProfileId}` | admin | SCH-003, SCH-013 | NEW | Admin | admin.doctor_profile.update | 어드민 의사 프로필 운영 수정 |
| API-054 | GET | `/api/admin/doctor-profile-change-requests` | admin | SCH-003, SCH-004, SCH-013 | NEW | Admin | none | 의사 정보 수정 요청 목록 |
| API-055 | PATCH | `/api/admin/doctor-profile-change-requests/{requestId}` | admin | SCH-003, SCH-004, SCH-013 | NEW | Admin | admin.doctor_profile_change_request.resolve | 의사 정보 수정 요청 처리 |
| API-083 | GET | `/api/me/saved-doctors` | bearer | SCH-003, SCH-021 | NEW | My Page | none | 저장한 의료진 목록 |
| API-084 | POST | `/api/doctors/{doctorProfileId}/save` | bearer | SCH-003, SCH-021 | NEW | Doctor Profiles | doctor.save | 의사 프로필 저장 |
| API-085 | DELETE | `/api/doctors/{doctorProfileId}/save` | bearer | SCH-003, SCH-021 | NEW | Doctor Profiles | doctor.unsave | 의사 프로필 저장 취소 |

### FEA-011 통합 검색, 명의 찾기 검색, 입력 보안

| API | Method | Path | Auth | Schemas | Reuse | Domain | Audit | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-007 | GET | `/api/guest-limits` | optional | SCH-002 | EXTEND | Guest Limits | none | 비회원 사용 한도 조회 |
| API-008 | POST | `/api/guest-limits/events` | optional | SCH-002 | EXTEND | Guest Limits | guest.limit.event | 비회원 제한 이벤트 차감 |
| API-009 | GET | `/api/search` | optional | SCH-002, SCH-003, SCH-006 | EXTEND | Search | none | 통합 검색 |
| API-010 | GET | `/api/doctors` | optional | SCH-003, SCH-002 | NEW | Doctor Profiles | none | 명의 찾기 의사 목록 |
| API-021 | GET | `/api/community/posts` | optional | SCH-006, SCH-018, SCH-016 | EXTEND | Community | none | 커뮤니티 게시글 목록 |

### FEA-012 마이페이지, 내 활동, 고객지원, 회원탈퇴

| API | Method | Path | Auth | Schemas | Reuse | Domain | Audit | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-002 | GET | `/api/me` | bearer | SCH-001 | EXTEND | Auth & Session | none | 현재 사용자 세션과 등급 조회 |
| API-003 | PATCH | `/api/me/profile` | bearer | SCH-001 | EXTEND | Auth & Session | user.profile.update | 내 프로필 수정 |
| API-005 | POST | `/api/auth/logout` | bearer | SCH-001 | EXTEND | Auth & Session | auth.logout | 로그아웃 |
| API-006 | DELETE | `/api/me` | bearer | SCH-001, SCH-013 | EXTEND | Auth & Session | user.withdraw | 회원 탈퇴 |
| API-034 | GET | `/api/doctors/{doctorProfileId}/reviews` | optional | SCH-003, SCH-009, SCH-010, SCH-019 | EXTEND | Doctor Reviews | none | 의사 후기 목록 |
| API-037 | DELETE | `/api/reviews/{reviewId}` | bearer | SCH-009, SCH-014, SCH-013 | NEW | Doctor Reviews | doctor_review.delete | 의사 후기 삭제 |
| API-044 | GET | `/api/support/notices` | optional | SCH-017 | EXTEND | Support Content | none | 공지사항 목록 |
| API-045 | GET | `/api/support/notices/{contentId}` | optional | SCH-017 | NEW | Support Content | none | 공지사항 상세 |
| API-047 | POST | `/api/feedback` | bearer | SCH-017 | EXTEND | Support Content | feedback.submit | 의견 보내기 |
| API-082 | GET | `/api/me/activity` | bearer | SCH-006, SCH-007, SCH-009, SCH-019, SCH-021 | EXTEND | My Page | none | 내 활동 집계 조회 |
| API-083 | GET | `/api/me/saved-doctors` | bearer | SCH-003, SCH-021 | NEW | My Page | none | 저장한 의료진 목록 |
| API-084 | POST | `/api/doctors/{doctorProfileId}/save` | bearer | SCH-003, SCH-021 | NEW | Doctor Profiles | doctor.save | 의사 프로필 저장 |
| API-085 | DELETE | `/api/doctors/{doctorProfileId}/save` | bearer | SCH-003, SCH-021 | NEW | Doctor Profiles | doctor.unsave | 의사 프로필 저장 취소 |

### FEA-013 공통 UI 상태, 네비게이션, 중복 액션 방지

| API | Method | Path | Auth | Schemas | Reuse | Domain | Audit | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-001 | GET | `/api/app-context` | optional | SCH-001, SCH-002, SCH-014 | EXTEND | Auth & Session | none | 사이트 앱 컨텍스트 조회 |
| API-048 | GET | `/api/operational-policies/effective` | optional | SCH-014 | NEW | Operational Policies | none | 적용 중 운영 정책 조회 |
| API-076 | GET | `/api/admin/operational-policies` | admin | SCH-014, SCH-013 | NEW | Operational Policies | none | 운영 정책 목록 |
| API-077 | PUT | `/api/admin/operational-policies/{policyKey}` | admin | SCH-014, SCH-013 | NEW | Operational Policies | admin.operational_policy.upsert | 운영 정책 저장 |

### FEA-014 신고, 블라인드, 운영 처리

| API | Method | Path | Auth | Schemas | Reuse | Domain | Audit | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-020 | GET | `/api/community` | optional | SCH-018 | REUSE | Community | none | 커뮤니티 공간 목록 |
| API-021 | GET | `/api/community/posts` | optional | SCH-006, SCH-018, SCH-016 | EXTEND | Community | none | 커뮤니티 게시글 목록 |
| API-022 | GET | `/api/community/posts/{postId}` | optional | SCH-002, SCH-006, SCH-007, SCH-008, SCH-012 | EXTEND | Community | none | 커뮤니티 게시글 상세 |
| API-024 | PUT | `/api/community/posts/{postId}` | bearer | SCH-006, SCH-014, SCH-016 | EXTEND | Community | community.post.update | 커뮤니티 게시글 수정 |
| API-025 | DELETE | `/api/community/posts/{postId}` | bearer | SCH-006, SCH-014, SCH-013 | EXTEND | Community | community.post.delete | 커뮤니티 게시글 삭제 |
| API-026 | GET | `/api/community/posts/{postId}/comments` | optional | SCH-007, SCH-012 | EXTEND | Community | none | 커뮤니티 게시글 댓글 목록 |
| API-028 | PUT | `/api/community/comments/{commentId}` | bearer | SCH-007, SCH-014, SCH-016 | EXTEND | Community | community.comment.update | 커뮤니티 댓글 수정 |
| API-029 | DELETE | `/api/community/comments/{commentId}` | bearer | SCH-007, SCH-014, SCH-013 | EXTEND | Community | community.comment.delete | 커뮤니티 댓글 삭제 |
| API-032 | POST | `/api/community/reports` | bearer | SCH-012, SCH-016, SCH-018 | EXTEND | Moderation | community.report.create | 커뮤니티 콘텐츠 신고 |
| API-034 | GET | `/api/doctors/{doctorProfileId}/reviews` | optional | SCH-003, SCH-009, SCH-010, SCH-019 | EXTEND | Doctor Reviews | none | 의사 후기 목록 |
| API-036 | PATCH | `/api/reviews/{reviewId}` | bearer | SCH-009, SCH-014, SCH-016 | NEW | Doctor Reviews | doctor_review.update | 의사 후기 수정 |
| API-037 | DELETE | `/api/reviews/{reviewId}` | bearer | SCH-009, SCH-014, SCH-013 | NEW | Doctor Reviews | doctor_review.delete | 의사 후기 삭제 |
| API-038 | POST | `/api/reviews/{reviewId}/reports` | bearer | SCH-009, SCH-012, SCH-013 | EXTEND | Moderation | doctor_review.report.create | 의사 후기 신고 |
| API-039 | GET | `/api/comment` | optional | SCH-019 | EXTEND | Review Comments | none | 리뷰 댓글 목록 |
| API-040 | POST | `/api/comment` | bearer | SCH-019, SCH-016 | EXTEND | Review Comments | review_comment.create | 리뷰 댓글 작성 |
| API-041 | PUT | `/api/comment/{commentId}` | bearer | SCH-019, SCH-016 | EXTEND | Review Comments | review_comment.update | 리뷰 댓글 수정 |
| API-042 | DELETE | `/api/comment/{commentId}` | bearer | SCH-019, SCH-013 | EXTEND | Review Comments | review_comment.delete | 리뷰 댓글 삭제 |
| API-060 | GET | `/api/admin/community/reports` | admin | SCH-012, SCH-013, SCH-016 | EXTEND | Admin | none | 커뮤니티 신고 목록 |
| API-061 | POST | `/api/admin/community/reports/resolve` | admin | SCH-012, SCH-013, SCH-016 | EXTEND | Admin | admin.community_report.resolve | 커뮤니티 신고 처리 |
| API-062 | GET | `/api/admin/review-reports` | admin | SCH-009, SCH-012, SCH-013 | EXTEND | Admin | none | 후기 신고 목록 |
| API-063 | POST | `/api/admin/review-reports/{reportId}/resolve` | admin | SCH-009, SCH-012, SCH-013 | EXTEND | Admin | admin.review_report.resolve | 후기 신고 처리 |
| API-097 | GET | `/api/admin/content-edit-histories` | admin | SCH-006, SCH-007, SCH-009, SCH-019, SCH-026, SCH-013 | NEW | Admin | none | 콘텐츠 수정 이력 조회 |

### FEA-015 콘텐츠 안전 자동 차단

| API | Method | Path | Auth | Schemas | Reuse | Domain | Audit | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-018 | POST | `/api/medical-visit-verifications` | bearer | SCH-009, SCH-010, SCH-016 | NEW | Medical Visit Verification | medical_visit_verification.create | 병원 방문 인증 제출 |
| API-021 | GET | `/api/community/posts` | optional | SCH-006, SCH-018, SCH-016 | EXTEND | Community | none | 커뮤니티 게시글 목록 |
| API-022 | GET | `/api/community/posts/{postId}` | optional | SCH-002, SCH-006, SCH-007, SCH-008, SCH-012 | EXTEND | Community | none | 커뮤니티 게시글 상세 |
| API-023 | POST | `/api/community/posts` | bearer | SCH-001, SCH-006, SCH-010, SCH-014, SCH-016, SCH-018 | EXTEND | Community | community.post.create | 커뮤니티 게시글 작성 |
| API-024 | PUT | `/api/community/posts/{postId}` | bearer | SCH-006, SCH-014, SCH-016 | EXTEND | Community | community.post.update | 커뮤니티 게시글 수정 |
| API-026 | GET | `/api/community/posts/{postId}/comments` | optional | SCH-007, SCH-012 | EXTEND | Community | none | 커뮤니티 게시글 댓글 목록 |
| API-027 | POST | `/api/community/comments` | bearer | SCH-001, SCH-007, SCH-014, SCH-016 | EXTEND | Community | community.comment.create | 커뮤니티 댓글 작성 |
| API-028 | PUT | `/api/community/comments/{commentId}` | bearer | SCH-007, SCH-014, SCH-016 | EXTEND | Community | community.comment.update | 커뮤니티 댓글 수정 |
| API-032 | POST | `/api/community/reports` | bearer | SCH-012, SCH-016, SCH-018 | EXTEND | Moderation | community.report.create | 커뮤니티 콘텐츠 신고 |
| API-035 | POST | `/api/doctors/{doctorProfileId}/reviews` | bearer | SCH-001, SCH-003, SCH-009, SCH-010, SCH-014, SCH-016 | EXTEND | Doctor Reviews | doctor_review.create | 의사 후기 작성 |
| API-036 | PATCH | `/api/reviews/{reviewId}` | bearer | SCH-009, SCH-014, SCH-016 | NEW | Doctor Reviews | doctor_review.update | 의사 후기 수정 |
| API-040 | POST | `/api/comment` | bearer | SCH-019, SCH-016 | EXTEND | Review Comments | review_comment.create | 리뷰 댓글 작성 |
| API-041 | PUT | `/api/comment/{commentId}` | bearer | SCH-019, SCH-016 | EXTEND | Review Comments | review_comment.update | 리뷰 댓글 수정 |
| API-060 | GET | `/api/admin/community/reports` | admin | SCH-012, SCH-013, SCH-016 | EXTEND | Admin | none | 커뮤니티 신고 목록 |
| API-061 | POST | `/api/admin/community/reports/resolve` | admin | SCH-012, SCH-013, SCH-016 | EXTEND | Admin | admin.community_report.resolve | 커뮤니티 신고 처리 |
| API-064 | GET | `/api/admin/content-safety/rules` | admin | SCH-016, SCH-013 | NEW | Content Safety | none | 콘텐츠 안전 규칙 목록 |
| API-065 | POST | `/api/admin/content-safety/rules` | admin | SCH-016, SCH-013 | NEW | Content Safety | admin.content_safety_rule.create | 콘텐츠 안전 규칙 생성 |
| API-066 | PATCH | `/api/admin/content-safety/rules/{ruleId}` | admin | SCH-016, SCH-013 | NEW | Content Safety | admin.content_safety_rule.update | 콘텐츠 안전 규칙 수정 |
| API-079 | POST | `/api/files/upload-url` | bearer | SCH-020, SCH-024, SCH-025 | EXTEND | Files | file.upload_url.create | 파일 업로드 URL 생성 |
| API-080 | POST | `/api/files/confirm` | bearer | SCH-020, SCH-024, SCH-025 | EXTEND | Files | file.upload.confirm | 파일 업로드 확정 |
| API-081 | GET | `/api/files/{fileId}/signed-url` | bearer | SCH-020 | EXTEND | Files | none | 파일 signed URL 조회 |
| API-093 | GET | `/api/admin/content-safety/logs` | admin | SCH-016, SCH-024, SCH-025, SCH-013 | NEW | Content Safety | none | 콘텐츠 안전 로그 조회 |
| API-094 | GET | `/api/admin/integration-call-logs` | admin | SCH-020, SCH-025, SCH-013 | EXTEND | Integrations | none | 외부 연동 호출 로그 조회 |
| API-095 | GET | `/api/admin/integrations/status` | admin | SCH-015, SCH-024, SCH-025 | EXTEND | Integrations | none | 외부 연동 상태 조회 |

### FEA-016 홈 운영과 사용자 홈 노출

| API | Method | Path | Auth | Schemas | Reuse | Domain | Audit | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-010 | GET | `/api/doctors` | optional | SCH-003, SCH-002 | NEW | Doctor Profiles | none | 명의 찾기 의사 목록 |
| API-020 | GET | `/api/community` | optional | SCH-018 | REUSE | Community | none | 커뮤니티 공간 목록 |
| API-021 | GET | `/api/community/posts` | optional | SCH-006, SCH-018, SCH-016 | EXTEND | Community | none | 커뮤니티 게시글 목록 |
| API-033 | GET | `/api/community/feed/home` | optional | SCH-006, SCH-011, SCH-018 | EXTEND | Home Curation | none | 홈 커뮤니티 피드 조회 |
| API-043 | GET | `/api/home` | optional | SCH-003, SCH-006, SCH-011, SCH-017 | EXTEND | Home Curation | none | 홈 화면 데이터 조회 |
| API-067 | GET | `/api/admin/home-curation` | admin | SCH-011, SCH-013 | EXTEND | Home Curation | none | 홈 큐레이션 항목 목록 |
| API-068 | POST | `/api/admin/home-curation` | admin | SCH-011, SCH-013 | NEW | Home Curation | admin.home_curation.create | 홈 큐레이션 항목 생성 |
| API-069 | PATCH | `/api/admin/home-curation/{itemId}` | admin | SCH-011, SCH-013 | NEW | Home Curation | admin.home_curation.update | 홈 큐레이션 항목 수정 |
| API-070 | DELETE | `/api/admin/home-curation/{itemId}` | admin | SCH-011, SCH-013 | NEW | Home Curation | admin.home_curation.delete | 홈 큐레이션 항목 삭제 |
| API-079 | POST | `/api/files/upload-url` | bearer | SCH-020, SCH-024, SCH-025 | EXTEND | Files | file.upload_url.create | 파일 업로드 URL 생성 |
| API-080 | POST | `/api/files/confirm` | bearer | SCH-020, SCH-024, SCH-025 | EXTEND | Files | file.upload.confirm | 파일 업로드 확정 |
| API-081 | GET | `/api/files/{fileId}/signed-url` | bearer | SCH-020 | EXTEND | Files | none | 파일 signed URL 조회 |

### FEA-017 공지사항과 정책 콘텐츠 관리

| API | Method | Path | Auth | Schemas | Reuse | Domain | Audit | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-043 | GET | `/api/home` | optional | SCH-003, SCH-006, SCH-011, SCH-017 | EXTEND | Home Curation | none | 홈 화면 데이터 조회 |
| API-044 | GET | `/api/support/notices` | optional | SCH-017 | EXTEND | Support Content | none | 공지사항 목록 |
| API-045 | GET | `/api/support/notices/{contentId}` | optional | SCH-017 | NEW | Support Content | none | 공지사항 상세 |
| API-046 | GET | `/api/support/policies/{contentType}` | optional | SCH-017 | EXTEND | Support Content | none | 약관/개인정보 정책 조회 |
| API-071 | GET | `/api/admin/support-contents` | admin | SCH-017, SCH-013 | EXTEND | Support Content | none | 고객지원/정책 콘텐츠 목록 |
| API-072 | POST | `/api/admin/support-contents` | admin | SCH-017, SCH-013 | NEW | Support Content | admin.support_content.create | 고객지원/정책 콘텐츠 생성 |
| API-073 | PATCH | `/api/admin/support-contents/{contentId}` | admin | SCH-017, SCH-013 | NEW | Support Content | admin.support_content.update | 고객지원/정책 콘텐츠 수정 |

### FEA-018 의견 보내기와 운영자 종결

| API | Method | Path | Auth | Schemas | Reuse | Domain | Audit | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-047 | POST | `/api/feedback` | bearer | SCH-017 | EXTEND | Support Content | feedback.submit | 의견 보내기 |
| API-071 | GET | `/api/admin/support-contents` | admin | SCH-017, SCH-013 | EXTEND | Support Content | none | 고객지원/정책 콘텐츠 목록 |
| API-073 | PATCH | `/api/admin/support-contents/{contentId}` | admin | SCH-017, SCH-013 | NEW | Support Content | admin.support_content.update | 고객지원/정책 콘텐츠 수정 |
| API-074 | GET | `/api/admin/feedback` | admin | SCH-017, SCH-013 | EXTEND | Support Content | none | 의견 보내기 목록 |
| API-075 | PATCH | `/api/admin/feedback/{feedbackId}` | admin | SCH-017, SCH-013 | EXTEND | Support Content | admin.feedback.close | 의견 보내기 종결 |

### FEA-019 어드민 공통 운영, 권한, 감사 로그

| API | Method | Path | Auth | Schemas | Reuse | Domain | Audit | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-050 | GET | `/api/admin/dashboard` | admin | SCH-001, SCH-003, SCH-005, SCH-009, SCH-012, SCH-013, SCH-017 | EXTEND | Admin | none | 어드민 대시보드 조회 |
| API-051 | GET | `/api/admin/users` | admin | SCH-001, SCH-013 | EXTEND | Admin | none | 어드민 사용자 목록 |
| API-078 | GET | `/api/admin/audit-logs` | admin | SCH-013 | EXTEND | Admin | none | 감사 로그 조회 |
| API-087 | POST | `/api/admin/auth/login` | none | SCH-001, SCH-013, SCH-023 | EXTEND | Admin Auth | admin.auth.login | 어드민 이메일/비밀번호 로그인 |
| API-088 | POST | `/api/admin/auth/2fa/verify` | none | SCH-001, SCH-013, SCH-023 | EXTEND | Admin Auth | admin.auth.2fa.verify | 어드민 Google OTP 검증 |
| API-089 | POST | `/api/admin/auth/logout` | admin | SCH-001, SCH-013, SCH-023 | EXTEND | Admin Auth | admin.auth.logout | 어드민 로그아웃 |
| API-090 | GET | `/api/admin/auth/session` | admin | SCH-001, SCH-023 | EXTEND | Admin Auth | none | 어드민 세션 조회 |
| API-091 | POST | `/api/admin/auth/2fa/setup` | admin | SCH-001, SCH-013, SCH-023 | EXTEND | Admin Auth | admin.auth.2fa.setup | 어드민 2FA 설정 |
| API-092 | DELETE | `/api/admin/auth/2fa` | admin | SCH-001, SCH-013, SCH-023 | EXTEND | Admin Auth | admin.auth.2fa.disable | 어드민 2FA 비활성화 |

### FEA-020 어드민 사용자, 의사, 콘텐츠 관리

| API | Method | Path | Auth | Schemas | Reuse | Domain | Audit | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-012 | POST | `/api/doctors/{doctorProfileId}/change-requests` | bearer | SCH-003, SCH-004, SCH-013 | NEW | Doctor Profiles | doctor_profile.change_request.create | 의사 정보 수정 요청 |
| API-016 | POST | `/api/doctor-verifications/license` | bearer | SCH-001, SCH-003, SCH-005, SCH-013 | EXTEND | Doctor Verification | doctor_verification.license.submit | 의사 면허 검증 제출 |
| API-050 | GET | `/api/admin/dashboard` | admin | SCH-001, SCH-003, SCH-005, SCH-009, SCH-012, SCH-013, SCH-017 | EXTEND | Admin | none | 어드민 대시보드 조회 |
| API-051 | GET | `/api/admin/users` | admin | SCH-001, SCH-013 | EXTEND | Admin | none | 어드민 사용자 목록 |
| API-052 | GET | `/api/admin/doctors` | admin | SCH-003, SCH-009, SCH-013 | EXTEND | Admin | none | 어드민 의사 목록 |
| API-053 | PATCH | `/api/admin/doctors/{doctorProfileId}` | admin | SCH-003, SCH-013 | NEW | Admin | admin.doctor_profile.update | 어드민 의사 프로필 운영 수정 |
| API-054 | GET | `/api/admin/doctor-profile-change-requests` | admin | SCH-003, SCH-004, SCH-013 | NEW | Admin | none | 의사 정보 수정 요청 목록 |
| API-055 | PATCH | `/api/admin/doctor-profile-change-requests/{requestId}` | admin | SCH-003, SCH-004, SCH-013 | NEW | Admin | admin.doctor_profile_change_request.resolve | 의사 정보 수정 요청 처리 |
| API-056 | GET | `/api/admin/doctor-verifications` | admin | SCH-001, SCH-003, SCH-005, SCH-013 | EXTEND | Admin | none | 의사 인증 요청 목록 |
| API-057 | PATCH | `/api/admin/doctor-verifications/{requestId}` | admin | SCH-001, SCH-003, SCH-005, SCH-013 | EXTEND | Admin | admin.doctor_verification.resolve | 의사 인증 요청 승인/반려 |
| API-058 | GET | `/api/admin/medical-visit-verifications` | admin | SCH-010, SCH-013 | NEW | Admin | none | 병원 방문 인증 검토 목록 |
| API-059 | PATCH | `/api/admin/medical-visit-verifications/{verificationId}` | admin | SCH-010, SCH-013 | NEW | Admin | admin.medical_visit_verification.resolve | 병원 방문 인증 수동 처리 |
| API-060 | GET | `/api/admin/community/reports` | admin | SCH-012, SCH-013, SCH-016 | EXTEND | Admin | none | 커뮤니티 신고 목록 |
| API-061 | POST | `/api/admin/community/reports/resolve` | admin | SCH-012, SCH-013, SCH-016 | EXTEND | Admin | admin.community_report.resolve | 커뮤니티 신고 처리 |
| API-062 | GET | `/api/admin/review-reports` | admin | SCH-009, SCH-012, SCH-013 | EXTEND | Admin | none | 후기 신고 목록 |
| API-063 | POST | `/api/admin/review-reports/{reportId}/resolve` | admin | SCH-009, SCH-012, SCH-013 | EXTEND | Admin | admin.review_report.resolve | 후기 신고 처리 |
| API-067 | GET | `/api/admin/home-curation` | admin | SCH-011, SCH-013 | EXTEND | Home Curation | none | 홈 큐레이션 항목 목록 |
| API-068 | POST | `/api/admin/home-curation` | admin | SCH-011, SCH-013 | NEW | Home Curation | admin.home_curation.create | 홈 큐레이션 항목 생성 |
| API-069 | PATCH | `/api/admin/home-curation/{itemId}` | admin | SCH-011, SCH-013 | NEW | Home Curation | admin.home_curation.update | 홈 큐레이션 항목 수정 |
| API-070 | DELETE | `/api/admin/home-curation/{itemId}` | admin | SCH-011, SCH-013 | NEW | Home Curation | admin.home_curation.delete | 홈 큐레이션 항목 삭제 |
| API-071 | GET | `/api/admin/support-contents` | admin | SCH-017, SCH-013 | EXTEND | Support Content | none | 고객지원/정책 콘텐츠 목록 |
| API-072 | POST | `/api/admin/support-contents` | admin | SCH-017, SCH-013 | NEW | Support Content | admin.support_content.create | 고객지원/정책 콘텐츠 생성 |
| API-073 | PATCH | `/api/admin/support-contents/{contentId}` | admin | SCH-017, SCH-013 | NEW | Support Content | admin.support_content.update | 고객지원/정책 콘텐츠 수정 |
| API-074 | GET | `/api/admin/feedback` | admin | SCH-017, SCH-013 | EXTEND | Support Content | none | 의견 보내기 목록 |
| API-075 | PATCH | `/api/admin/feedback/{feedbackId}` | admin | SCH-017, SCH-013 | EXTEND | Support Content | admin.feedback.close | 의견 보내기 종결 |
| API-078 | GET | `/api/admin/audit-logs` | admin | SCH-013 | EXTEND | Admin | none | 감사 로그 조회 |
| API-096 | POST | `/api/admin/doctors/{doctorProfileId}/verification-cancel` | admin | SCH-003, SCH-005, SCH-013 | NEW | Admin | admin.doctor_verification.cancel | 의사 인증 취소 |
| API-097 | GET | `/api/admin/content-edit-histories` | admin | SCH-006, SCH-007, SCH-009, SCH-019, SCH-026, SCH-013 | NEW | Admin | none | 콘텐츠 수정 이력 조회 |

### FEA-021 운영 정책 설정

| API | Method | Path | Auth | Schemas | Reuse | Domain | Audit | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-001 | GET | `/api/app-context` | optional | SCH-001, SCH-002, SCH-014 | EXTEND | Auth & Session | none | 사이트 앱 컨텍스트 조회 |
| API-023 | POST | `/api/community/posts` | bearer | SCH-001, SCH-006, SCH-010, SCH-014, SCH-016, SCH-018 | EXTEND | Community | community.post.create | 커뮤니티 게시글 작성 |
| API-024 | PUT | `/api/community/posts/{postId}` | bearer | SCH-006, SCH-014, SCH-016 | EXTEND | Community | community.post.update | 커뮤니티 게시글 수정 |
| API-025 | DELETE | `/api/community/posts/{postId}` | bearer | SCH-006, SCH-014, SCH-013 | EXTEND | Community | community.post.delete | 커뮤니티 게시글 삭제 |
| API-027 | POST | `/api/community/comments` | bearer | SCH-001, SCH-007, SCH-014, SCH-016 | EXTEND | Community | community.comment.create | 커뮤니티 댓글 작성 |
| API-028 | PUT | `/api/community/comments/{commentId}` | bearer | SCH-007, SCH-014, SCH-016 | EXTEND | Community | community.comment.update | 커뮤니티 댓글 수정 |
| API-029 | DELETE | `/api/community/comments/{commentId}` | bearer | SCH-007, SCH-014, SCH-013 | EXTEND | Community | community.comment.delete | 커뮤니티 댓글 삭제 |
| API-035 | POST | `/api/doctors/{doctorProfileId}/reviews` | bearer | SCH-001, SCH-003, SCH-009, SCH-010, SCH-014, SCH-016 | EXTEND | Doctor Reviews | doctor_review.create | 의사 후기 작성 |
| API-036 | PATCH | `/api/reviews/{reviewId}` | bearer | SCH-009, SCH-014, SCH-016 | NEW | Doctor Reviews | doctor_review.update | 의사 후기 수정 |
| API-037 | DELETE | `/api/reviews/{reviewId}` | bearer | SCH-009, SCH-014, SCH-013 | NEW | Doctor Reviews | doctor_review.delete | 의사 후기 삭제 |
| API-048 | GET | `/api/operational-policies/effective` | optional | SCH-014 | NEW | Operational Policies | none | 적용 중 운영 정책 조회 |
| API-076 | GET | `/api/admin/operational-policies` | admin | SCH-014, SCH-013 | NEW | Operational Policies | none | 운영 정책 목록 |
| API-077 | PUT | `/api/admin/operational-policies/{policyKey}` | admin | SCH-014, SCH-013 | NEW | Operational Policies | admin.operational_policy.upsert | 운영 정책 저장 |

### FEA-022 개인정보, 접근성, 분석 이벤트

| API | Method | Path | Auth | Schemas | Reuse | Domain | Audit | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-001 | GET | `/api/app-context` | optional | SCH-001, SCH-002, SCH-014 | EXTEND | Auth & Session | none | 사이트 앱 컨텍스트 조회 |
| API-002 | GET | `/api/me` | bearer | SCH-001 | EXTEND | Auth & Session | none | 현재 사용자 세션과 등급 조회 |
| API-003 | PATCH | `/api/me/profile` | bearer | SCH-001 | EXTEND | Auth & Session | user.profile.update | 내 프로필 수정 |
| API-006 | DELETE | `/api/me` | bearer | SCH-001, SCH-013 | EXTEND | Auth & Session | user.withdraw | 회원 탈퇴 |
| API-013 | POST | `/api/identity-verifications/kcb/sessions` | optional | SCH-005 | EXTEND | Doctor Verification | identity.kcb.session.create | KCB 본인확인 세션 생성 |
| API-014 | GET | `/api/identity-verifications/kcb/sessions/{sessionId}` | optional | SCH-005 | REUSE | Doctor Verification | none | KCB 본인확인 세션 조회 |
| API-015 | POST | `/api/identity-verifications/kcb/sessions/{sessionId}/link` | bearer | SCH-001, SCH-005 | REUSE | Doctor Verification | identity.kcb.session.link | KCB 본인확인 세션 사용자 연결 |
| API-018 | POST | `/api/medical-visit-verifications` | bearer | SCH-009, SCH-010, SCH-016 | NEW | Medical Visit Verification | medical_visit_verification.create | 병원 방문 인증 제출 |
| API-019 | GET | `/api/medical-visit-verifications/{verificationId}` | bearer | SCH-010 | NEW | Medical Visit Verification | none | 병원 방문 인증 상태 조회 |
| API-023 | POST | `/api/community/posts` | bearer | SCH-001, SCH-006, SCH-010, SCH-014, SCH-016, SCH-018 | EXTEND | Community | community.post.create | 커뮤니티 게시글 작성 |
| API-024 | PUT | `/api/community/posts/{postId}` | bearer | SCH-006, SCH-014, SCH-016 | EXTEND | Community | community.post.update | 커뮤니티 게시글 수정 |
| API-025 | DELETE | `/api/community/posts/{postId}` | bearer | SCH-006, SCH-014, SCH-013 | EXTEND | Community | community.post.delete | 커뮤니티 게시글 삭제 |
| API-032 | POST | `/api/community/reports` | bearer | SCH-012, SCH-016, SCH-018 | EXTEND | Moderation | community.report.create | 커뮤니티 콘텐츠 신고 |
| API-035 | POST | `/api/doctors/{doctorProfileId}/reviews` | bearer | SCH-001, SCH-003, SCH-009, SCH-010, SCH-014, SCH-016 | EXTEND | Doctor Reviews | doctor_review.create | 의사 후기 작성 |
| API-038 | POST | `/api/reviews/{reviewId}/reports` | bearer | SCH-009, SCH-012, SCH-013 | EXTEND | Moderation | doctor_review.report.create | 의사 후기 신고 |
| API-046 | GET | `/api/support/policies/{contentType}` | optional | SCH-017 | EXTEND | Support Content | none | 약관/개인정보 정책 조회 |
| API-049 | POST | `/api/ai-chat/messages` | optional | SCH-003, SCH-015 | NEW | External AI Chat | external_ai_chat.message.send | 외부 AI 채팅 REST 메시지 전송 |
| API-051 | GET | `/api/admin/users` | admin | SCH-001, SCH-013 | EXTEND | Admin | none | 어드민 사용자 목록 |
| API-053 | PATCH | `/api/admin/doctors/{doctorProfileId}` | admin | SCH-003, SCH-013 | NEW | Admin | admin.doctor_profile.update | 어드민 의사 프로필 운영 수정 |
| API-056 | GET | `/api/admin/doctor-verifications` | admin | SCH-001, SCH-003, SCH-005, SCH-013 | EXTEND | Admin | none | 의사 인증 요청 목록 |
| API-057 | PATCH | `/api/admin/doctor-verifications/{requestId}` | admin | SCH-001, SCH-003, SCH-005, SCH-013 | EXTEND | Admin | admin.doctor_verification.resolve | 의사 인증 요청 승인/반려 |
| API-059 | PATCH | `/api/admin/medical-visit-verifications/{verificationId}` | admin | SCH-010, SCH-013 | NEW | Admin | admin.medical_visit_verification.resolve | 병원 방문 인증 수동 처리 |
| API-060 | GET | `/api/admin/community/reports` | admin | SCH-012, SCH-013, SCH-016 | EXTEND | Admin | none | 커뮤니티 신고 목록 |
| API-061 | POST | `/api/admin/community/reports/resolve` | admin | SCH-012, SCH-013, SCH-016 | EXTEND | Admin | admin.community_report.resolve | 커뮤니티 신고 처리 |
| API-062 | GET | `/api/admin/review-reports` | admin | SCH-009, SCH-012, SCH-013 | EXTEND | Admin | none | 후기 신고 목록 |
| API-063 | POST | `/api/admin/review-reports/{reportId}/resolve` | admin | SCH-009, SCH-012, SCH-013 | EXTEND | Admin | admin.review_report.resolve | 후기 신고 처리 |
| API-064 | GET | `/api/admin/content-safety/rules` | admin | SCH-016, SCH-013 | NEW | Content Safety | none | 콘텐츠 안전 규칙 목록 |
| API-065 | POST | `/api/admin/content-safety/rules` | admin | SCH-016, SCH-013 | NEW | Content Safety | admin.content_safety_rule.create | 콘텐츠 안전 규칙 생성 |
| API-066 | PATCH | `/api/admin/content-safety/rules/{ruleId}` | admin | SCH-016, SCH-013 | NEW | Content Safety | admin.content_safety_rule.update | 콘텐츠 안전 규칙 수정 |
| API-072 | POST | `/api/admin/support-contents` | admin | SCH-017, SCH-013 | NEW | Support Content | admin.support_content.create | 고객지원/정책 콘텐츠 생성 |
| API-073 | PATCH | `/api/admin/support-contents/{contentId}` | admin | SCH-017, SCH-013 | NEW | Support Content | admin.support_content.update | 고객지원/정책 콘텐츠 수정 |
| API-078 | GET | `/api/admin/audit-logs` | admin | SCH-013 | EXTEND | Admin | none | 감사 로그 조회 |
| API-079 | POST | `/api/files/upload-url` | bearer | SCH-020, SCH-024, SCH-025 | EXTEND | Files | file.upload_url.create | 파일 업로드 URL 생성 |
| API-080 | POST | `/api/files/confirm` | bearer | SCH-020, SCH-024, SCH-025 | EXTEND | Files | file.upload.confirm | 파일 업로드 확정 |
| API-081 | GET | `/api/files/{fileId}/signed-url` | bearer | SCH-020 | EXTEND | Files | none | 파일 signed URL 조회 |
| API-086 | POST | `/api/analytics/events` | optional | SCH-022 | EXTEND | Analytics | none | 분석 이벤트 수집 |
| API-087 | POST | `/api/admin/auth/login` | none | SCH-001, SCH-013, SCH-023 | EXTEND | Admin Auth | admin.auth.login | 어드민 이메일/비밀번호 로그인 |
| API-088 | POST | `/api/admin/auth/2fa/verify` | none | SCH-001, SCH-013, SCH-023 | EXTEND | Admin Auth | admin.auth.2fa.verify | 어드민 Google OTP 검증 |
| API-089 | POST | `/api/admin/auth/logout` | admin | SCH-001, SCH-013, SCH-023 | EXTEND | Admin Auth | admin.auth.logout | 어드민 로그아웃 |
| API-090 | GET | `/api/admin/auth/session` | admin | SCH-001, SCH-023 | EXTEND | Admin Auth | none | 어드민 세션 조회 |
| API-091 | POST | `/api/admin/auth/2fa/setup` | admin | SCH-001, SCH-013, SCH-023 | EXTEND | Admin Auth | admin.auth.2fa.setup | 어드민 2FA 설정 |
| API-092 | DELETE | `/api/admin/auth/2fa` | admin | SCH-001, SCH-013, SCH-023 | EXTEND | Admin Auth | admin.auth.2fa.disable | 어드민 2FA 비활성화 |
| API-093 | GET | `/api/admin/content-safety/logs` | admin | SCH-016, SCH-024, SCH-025, SCH-013 | NEW | Content Safety | none | 콘텐츠 안전 로그 조회 |
| API-094 | GET | `/api/admin/integration-call-logs` | admin | SCH-020, SCH-025, SCH-013 | EXTEND | Integrations | none | 외부 연동 호출 로그 조회 |
| API-095 | GET | `/api/admin/integrations/status` | admin | SCH-015, SCH-024, SCH-025 | EXTEND | Integrations | none | 외부 연동 상태 조회 |
| API-096 | POST | `/api/admin/doctors/{doctorProfileId}/verification-cancel` | admin | SCH-003, SCH-005, SCH-013 | NEW | Admin | admin.doctor_verification.cancel | 의사 인증 취소 |
| API-097 | GET | `/api/admin/content-edit-histories` | admin | SCH-006, SCH-007, SCH-009, SCH-019, SCH-026, SCH-013 | NEW | Admin | none | 콘텐츠 수정 이력 조회 |

### FEA-023 외부 AI 채팅 REST API 연동

| API | Method | Path | Auth | Schemas | Reuse | Domain | Audit | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-049 | POST | `/api/ai-chat/messages` | optional | SCH-003, SCH-015 | NEW | External AI Chat | external_ai_chat.message.send | 외부 AI 채팅 REST 메시지 전송 |
| API-094 | GET | `/api/admin/integration-call-logs` | admin | SCH-020, SCH-025, SCH-013 | EXTEND | Integrations | none | 외부 연동 호출 로그 조회 |
| API-095 | GET | `/api/admin/integrations/status` | admin | SCH-015, SCH-024, SCH-025 | EXTEND | Integrations | none | 외부 연동 상태 조회 |

## 5. 전체 API 목차(Global API Index)

| API | Method | Path | Actor | Reuse | Features | Schemas | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- |
| API-001 | GET | `/api/app-context` | guest_or_member | EXTEND | FEA-001, FEA-002, FEA-003, FEA-013, FEA-021, FEA-022 | SCH-001, SCH-002, SCH-014 | 사이트 앱 컨텍스트 조회 |
| API-002 | GET | `/api/me` | member | EXTEND | FEA-001, FEA-002, FEA-012, FEA-022 | SCH-001 | 현재 사용자 세션과 등급 조회 |
| API-003 | PATCH | `/api/me/profile` | member | EXTEND | FEA-002, FEA-012, FEA-022 | SCH-001 | 내 프로필 수정 |
| API-004 | POST | `/api/auth/oauth/{provider}/callback` | guest_or_member | EXTEND | FEA-002 | SCH-001 | SNS 로그인 콜백 처리 |
| API-005 | POST | `/api/auth/logout` | member | EXTEND | FEA-002, FEA-012 | SCH-001 | 로그아웃 |
| API-006 | DELETE | `/api/me` | member | EXTEND | FEA-012, FEA-022 | SCH-001, SCH-013 | 회원 탈퇴 |
| API-007 | GET | `/api/guest-limits` | guest_or_member | EXTEND | FEA-003, FEA-011 | SCH-002 | 비회원 사용 한도 조회 |
| API-008 | POST | `/api/guest-limits/events` | guest | EXTEND | FEA-003, FEA-011 | SCH-002 | 비회원 제한 이벤트 차감 |
| API-009 | GET | `/api/search` | guest_or_member | EXTEND | FEA-003, FEA-011 | SCH-002, SCH-003, SCH-006 | 통합 검색 |
| API-010 | GET | `/api/doctors` | guest_or_member | NEW | FEA-010, FEA-011, FEA-016 | SCH-003, SCH-002 | 명의 찾기 의사 목록 |
| API-011 | GET | `/api/doctors/{doctorProfileId}` | guest_or_member | NEW | FEA-003, FEA-009, FEA-010 | SCH-002, SCH-003, SCH-009 | 의사 프로필 상세 |
| API-012 | POST | `/api/doctors/{doctorProfileId}/change-requests` | member_or_verified_doctor | NEW | FEA-010, FEA-020 | SCH-003, SCH-004, SCH-013 | 의사 정보 수정 요청 |
| API-013 | POST | `/api/identity-verifications/kcb/sessions` | guest_or_member | EXTEND | FEA-008, FEA-022 | SCH-005 | KCB 본인확인 세션 생성 |
| API-014 | GET | `/api/identity-verifications/kcb/sessions/{sessionId}` | guest_or_member | REUSE | FEA-008, FEA-022 | SCH-005 | KCB 본인확인 세션 조회 |
| API-015 | POST | `/api/identity-verifications/kcb/sessions/{sessionId}/link` | member | REUSE | FEA-008, FEA-022 | SCH-001, SCH-005 | KCB 본인확인 세션 사용자 연결 |
| API-016 | POST | `/api/doctor-verifications/license` | member | EXTEND | FEA-008, FEA-009, FEA-020 | SCH-001, SCH-003, SCH-005, SCH-013 | 의사 면허 검증 제출 |
| API-017 | GET | `/api/doctor-verifications/me` | member | EXTEND | FEA-008, FEA-009 | SCH-001, SCH-003, SCH-005 | 내 의사 인증 상태 조회 |
| API-018 | POST | `/api/medical-visit-verifications` | member | NEW | FEA-006, FEA-007, FEA-015, FEA-022 | SCH-009, SCH-010, SCH-016 | 병원 방문 인증 제출 |
| API-019 | GET | `/api/medical-visit-verifications/{verificationId}` | member | NEW | FEA-007, FEA-022 | SCH-010 | 병원 방문 인증 상태 조회 |
| API-020 | GET | `/api/community` | guest_or_member | REUSE | FEA-004, FEA-014, FEA-016 | SCH-018 | 커뮤니티 공간 목록 |
| API-021 | GET | `/api/community/posts` | guest_or_member | EXTEND | FEA-004, FEA-011, FEA-014, FEA-015, FEA-016 | SCH-006, SCH-018, SCH-016 | 커뮤니티 게시글 목록 |
| API-022 | GET | `/api/community/posts/{postId}` | guest_or_member | EXTEND | FEA-003, FEA-004, FEA-009, FEA-014, FEA-015 | SCH-002, SCH-006, SCH-007, SCH-008, SCH-012 | 커뮤니티 게시글 상세 |
| API-023 | POST | `/api/community/posts` | member_or_verified_doctor | EXTEND | FEA-001, FEA-004, FEA-007, FEA-009, FEA-015, FEA-021, FEA-022 | SCH-001, SCH-006, SCH-010, SCH-014, SCH-016, SCH-018 | 커뮤니티 게시글 작성 |
| API-024 | PUT | `/api/community/posts/{postId}` | author_or_admin | EXTEND | FEA-004, FEA-014, FEA-015, FEA-021, FEA-022 | SCH-006, SCH-014, SCH-016 | 커뮤니티 게시글 수정 |
| API-025 | DELETE | `/api/community/posts/{postId}` | author_or_admin | EXTEND | FEA-004, FEA-014, FEA-021, FEA-022 | SCH-006, SCH-014, SCH-013 | 커뮤니티 게시글 삭제 |
| API-026 | GET | `/api/community/posts/{postId}/comments` | guest_or_member | EXTEND | FEA-005, FEA-009, FEA-014, FEA-015 | SCH-007, SCH-012 | 커뮤니티 게시글 댓글 목록 |
| API-027 | POST | `/api/community/comments` | member_or_verified_doctor | EXTEND | FEA-001, FEA-005, FEA-009, FEA-015, FEA-021 | SCH-001, SCH-007, SCH-014, SCH-016 | 커뮤니티 댓글 작성 |
| API-028 | PUT | `/api/community/comments/{commentId}` | author | EXTEND | FEA-005, FEA-014, FEA-015, FEA-021 | SCH-007, SCH-014, SCH-016 | 커뮤니티 댓글 수정 |
| API-029 | DELETE | `/api/community/comments/{commentId}` | author_or_admin | EXTEND | FEA-005, FEA-014, FEA-021 | SCH-007, SCH-014, SCH-013 | 커뮤니티 댓글 삭제 |
| API-030 | POST | `/api/community/votes` | member | REUSE | FEA-005 | SCH-008 | 커뮤니티 공감 등록 |
| API-031 | DELETE | `/api/community/votes` | member | REUSE | FEA-005 | SCH-008 | 커뮤니티 공감 취소 |
| API-032 | POST | `/api/community/reports` | member | EXTEND | FEA-014, FEA-015, FEA-022 | SCH-012, SCH-016, SCH-018 | 커뮤니티 콘텐츠 신고 |
| API-033 | GET | `/api/community/feed/home` | guest_or_member | EXTEND | FEA-004, FEA-016 | SCH-006, SCH-011, SCH-018 | 홈 커뮤니티 피드 조회 |
| API-034 | GET | `/api/doctors/{doctorProfileId}/reviews` | guest_or_member | EXTEND | FEA-006, FEA-007, FEA-010, FEA-012, FEA-014 | SCH-003, SCH-009, SCH-010, SCH-019 | 의사 후기 목록 |
| API-035 | POST | `/api/doctors/{doctorProfileId}/reviews` | member | EXTEND | FEA-001, FEA-006, FEA-007, FEA-010, FEA-015, FEA-021, FEA-022 | SCH-001, SCH-003, SCH-009, SCH-010, SCH-014, SCH-016 | 의사 후기 작성 |
| API-036 | PATCH | `/api/reviews/{reviewId}` | author | NEW | FEA-006, FEA-014, FEA-015, FEA-021 | SCH-009, SCH-014, SCH-016 | 의사 후기 수정 |
| API-037 | DELETE | `/api/reviews/{reviewId}` | author_or_admin | NEW | FEA-006, FEA-012, FEA-014, FEA-021 | SCH-009, SCH-014, SCH-013 | 의사 후기 삭제 |
| API-038 | POST | `/api/reviews/{reviewId}/reports` | member | EXTEND | FEA-006, FEA-014, FEA-022 | SCH-009, SCH-012, SCH-013 | 의사 후기 신고 |
| API-039 | GET | `/api/comment` | guest_or_member | EXTEND | FEA-005, FEA-006, FEA-014 | SCH-019 | 리뷰 댓글 목록 |
| API-040 | POST | `/api/comment` | member_or_verified_doctor | EXTEND | FEA-005, FEA-006, FEA-009, FEA-014, FEA-015 | SCH-019, SCH-016 | 리뷰 댓글 작성 |
| API-041 | PUT | `/api/comment/{commentId}` | author | EXTEND | FEA-005, FEA-006, FEA-014, FEA-015 | SCH-019, SCH-016 | 리뷰 댓글 수정 |
| API-042 | DELETE | `/api/comment/{commentId}` | author_or_admin | EXTEND | FEA-005, FEA-006, FEA-014 | SCH-019, SCH-013 | 리뷰 댓글 삭제 |
| API-043 | GET | `/api/home` | guest_or_member | EXTEND | FEA-016, FEA-017 | SCH-003, SCH-006, SCH-011, SCH-017 | 홈 화면 데이터 조회 |
| API-044 | GET | `/api/support/notices` | guest_or_member | EXTEND | FEA-012, FEA-017 | SCH-017 | 공지사항 목록 |
| API-045 | GET | `/api/support/notices/{contentId}` | guest_or_member | NEW | FEA-012, FEA-017 | SCH-017 | 공지사항 상세 |
| API-046 | GET | `/api/support/policies/{contentType}` | guest_or_member | EXTEND | FEA-017, FEA-022 | SCH-017 | 약관/개인정보 정책 조회 |
| API-047 | POST | `/api/feedback` | member | EXTEND | FEA-012, FEA-018 | SCH-017 | 의견 보내기 |
| API-048 | GET | `/api/operational-policies/effective` | guest_or_member | NEW | FEA-005, FEA-006, FEA-007, FEA-013, FEA-021 | SCH-014 | 적용 중 운영 정책 조회 |
| API-049 | POST | `/api/ai-chat/messages` | member_or_guest | NEW | FEA-023, FEA-010, FEA-022 | SCH-003, SCH-015 | 외부 AI 채팅 REST 메시지 전송 |
| API-050 | GET | `/api/admin/dashboard` | admin | EXTEND | FEA-019, FEA-020 | SCH-001, SCH-003, SCH-005, SCH-009, SCH-012, SCH-013, SCH-017 | 어드민 대시보드 조회 |
| API-051 | GET | `/api/admin/users` | admin | EXTEND | FEA-019, FEA-020, FEA-022 | SCH-001, SCH-013 | 어드민 사용자 목록 |
| API-052 | GET | `/api/admin/doctors` | admin | EXTEND | FEA-010, FEA-020 | SCH-003, SCH-009, SCH-013 | 어드민 의사 목록 |
| API-053 | PATCH | `/api/admin/doctors/{doctorProfileId}` | admin | NEW | FEA-010, FEA-020, FEA-022 | SCH-003, SCH-013 | 어드민 의사 프로필 운영 수정 |
| API-054 | GET | `/api/admin/doctor-profile-change-requests` | admin | NEW | FEA-010, FEA-020 | SCH-003, SCH-004, SCH-013 | 의사 정보 수정 요청 목록 |
| API-055 | PATCH | `/api/admin/doctor-profile-change-requests/{requestId}` | admin | NEW | FEA-010, FEA-020 | SCH-003, SCH-004, SCH-013 | 의사 정보 수정 요청 처리 |
| API-056 | GET | `/api/admin/doctor-verifications` | admin | EXTEND | FEA-008, FEA-020, FEA-022 | SCH-001, SCH-003, SCH-005, SCH-013 | 의사 인증 요청 목록 |
| API-057 | PATCH | `/api/admin/doctor-verifications/{requestId}` | admin | EXTEND | FEA-001, FEA-008, FEA-009, FEA-020, FEA-022 | SCH-001, SCH-003, SCH-005, SCH-013 | 의사 인증 요청 승인/반려 |
| API-058 | GET | `/api/admin/medical-visit-verifications` | admin | NEW | FEA-007, FEA-020 | SCH-010, SCH-013 | 병원 방문 인증 검토 목록 |
| API-059 | PATCH | `/api/admin/medical-visit-verifications/{verificationId}` | admin | NEW | FEA-007, FEA-020, FEA-022 | SCH-010, SCH-013 | 병원 방문 인증 수동 처리 |
| API-060 | GET | `/api/admin/community/reports` | admin | EXTEND | FEA-014, FEA-015, FEA-020, FEA-022 | SCH-012, SCH-013, SCH-016 | 커뮤니티 신고 목록 |
| API-061 | POST | `/api/admin/community/reports/resolve` | admin | EXTEND | FEA-014, FEA-015, FEA-020, FEA-022 | SCH-012, SCH-013, SCH-016 | 커뮤니티 신고 처리 |
| API-062 | GET | `/api/admin/review-reports` | admin | EXTEND | FEA-006, FEA-014, FEA-020, FEA-022 | SCH-009, SCH-012, SCH-013 | 후기 신고 목록 |
| API-063 | POST | `/api/admin/review-reports/{reportId}/resolve` | admin | EXTEND | FEA-006, FEA-014, FEA-020, FEA-022 | SCH-009, SCH-012, SCH-013 | 후기 신고 처리 |
| API-064 | GET | `/api/admin/content-safety/rules` | admin | NEW | FEA-015, FEA-022 | SCH-016, SCH-013 | 콘텐츠 안전 규칙 목록 |
| API-065 | POST | `/api/admin/content-safety/rules` | admin | NEW | FEA-015, FEA-022 | SCH-016, SCH-013 | 콘텐츠 안전 규칙 생성 |
| API-066 | PATCH | `/api/admin/content-safety/rules/{ruleId}` | admin | NEW | FEA-015, FEA-022 | SCH-016, SCH-013 | 콘텐츠 안전 규칙 수정 |
| API-067 | GET | `/api/admin/home-curation` | admin | EXTEND | FEA-016, FEA-020 | SCH-011, SCH-013 | 홈 큐레이션 항목 목록 |
| API-068 | POST | `/api/admin/home-curation` | admin | NEW | FEA-016, FEA-020 | SCH-011, SCH-013 | 홈 큐레이션 항목 생성 |
| API-069 | PATCH | `/api/admin/home-curation/{itemId}` | admin | NEW | FEA-016, FEA-020 | SCH-011, SCH-013 | 홈 큐레이션 항목 수정 |
| API-070 | DELETE | `/api/admin/home-curation/{itemId}` | admin | NEW | FEA-016, FEA-020 | SCH-011, SCH-013 | 홈 큐레이션 항목 삭제 |
| API-071 | GET | `/api/admin/support-contents` | admin | EXTEND | FEA-017, FEA-018, FEA-020 | SCH-017, SCH-013 | 고객지원/정책 콘텐츠 목록 |
| API-072 | POST | `/api/admin/support-contents` | admin | NEW | FEA-017, FEA-020, FEA-022 | SCH-017, SCH-013 | 고객지원/정책 콘텐츠 생성 |
| API-073 | PATCH | `/api/admin/support-contents/{contentId}` | admin | NEW | FEA-017, FEA-018, FEA-020, FEA-022 | SCH-017, SCH-013 | 고객지원/정책 콘텐츠 수정 |
| API-074 | GET | `/api/admin/feedback` | admin | EXTEND | FEA-018, FEA-020 | SCH-017, SCH-013 | 의견 보내기 목록 |
| API-075 | PATCH | `/api/admin/feedback/{feedbackId}` | admin | EXTEND | FEA-018, FEA-020 | SCH-017, SCH-013 | 의견 보내기 종결 |
| API-076 | GET | `/api/admin/operational-policies` | admin | NEW | FEA-005, FEA-006, FEA-007, FEA-013, FEA-021 | SCH-014, SCH-013 | 운영 정책 목록 |
| API-077 | PUT | `/api/admin/operational-policies/{policyKey}` | admin | NEW | FEA-005, FEA-006, FEA-007, FEA-013, FEA-021 | SCH-014, SCH-013 | 운영 정책 저장 |
| API-078 | GET | `/api/admin/audit-logs` | admin | EXTEND | FEA-019, FEA-020, FEA-022 | SCH-013 | 감사 로그 조회 |
| API-079 | POST | `/api/files/upload-url` | member_or_admin | EXTEND | FEA-004, FEA-006, FEA-007, FEA-015, FEA-016, FEA-022 | SCH-020, SCH-024, SCH-025 | 파일 업로드 URL 생성 |
| API-080 | POST | `/api/files/confirm` | member_or_admin | EXTEND | FEA-004, FEA-006, FEA-007, FEA-015, FEA-016, FEA-022 | SCH-020, SCH-024, SCH-025 | 파일 업로드 확정 |
| API-081 | GET | `/api/files/{fileId}/signed-url` | member_or_admin | EXTEND | FEA-006, FEA-007, FEA-015, FEA-016, FEA-022 | SCH-020 | 파일 signed URL 조회 |
| API-082 | GET | `/api/me/activity` | member | EXTEND | FEA-012, FEA-004, FEA-005, FEA-006 | SCH-006, SCH-007, SCH-009, SCH-019, SCH-021 | 내 활동 집계 조회 |
| API-083 | GET | `/api/me/saved-doctors` | member | NEW | FEA-010, FEA-012 | SCH-003, SCH-021 | 저장한 의료진 목록 |
| API-084 | POST | `/api/doctors/{doctorProfileId}/save` | member | NEW | FEA-010, FEA-012 | SCH-003, SCH-021 | 의사 프로필 저장 |
| API-085 | DELETE | `/api/doctors/{doctorProfileId}/save` | member | NEW | FEA-010, FEA-012 | SCH-003, SCH-021 | 의사 프로필 저장 취소 |
| API-086 | POST | `/api/analytics/events` | guest_or_member | EXTEND | FEA-022 | SCH-022 | 분석 이벤트 수집 |
| API-087 | POST | `/api/admin/auth/login` | admin | EXTEND | FEA-019, FEA-022 | SCH-001, SCH-013, SCH-023 | 어드민 이메일/비밀번호 로그인 |
| API-088 | POST | `/api/admin/auth/2fa/verify` | admin | EXTEND | FEA-019, FEA-022 | SCH-001, SCH-013, SCH-023 | 어드민 Google OTP 검증 |
| API-089 | POST | `/api/admin/auth/logout` | admin | EXTEND | FEA-019, FEA-022 | SCH-001, SCH-013, SCH-023 | 어드민 로그아웃 |
| API-090 | GET | `/api/admin/auth/session` | admin | EXTEND | FEA-019, FEA-022 | SCH-001, SCH-023 | 어드민 세션 조회 |
| API-091 | POST | `/api/admin/auth/2fa/setup` | admin | EXTEND | FEA-019, FEA-022 | SCH-001, SCH-013, SCH-023 | 어드민 2FA 설정 |
| API-092 | DELETE | `/api/admin/auth/2fa` | admin | EXTEND | FEA-019, FEA-022 | SCH-001, SCH-013, SCH-023 | 어드민 2FA 비활성화 |
| API-093 | GET | `/api/admin/content-safety/logs` | admin | NEW | FEA-015, FEA-022 | SCH-016, SCH-024, SCH-025, SCH-013 | 콘텐츠 안전 로그 조회 |
| API-094 | GET | `/api/admin/integration-call-logs` | admin | EXTEND | FEA-007, FEA-015, FEA-022, FEA-023 | SCH-020, SCH-025, SCH-013 | 외부 연동 호출 로그 조회 |
| API-095 | GET | `/api/admin/integrations/status` | admin | EXTEND | FEA-007, FEA-015, FEA-022, FEA-023 | SCH-015, SCH-024, SCH-025 | 외부 연동 상태 조회 |
| API-096 | POST | `/api/admin/doctors/{doctorProfileId}/verification-cancel` | admin | NEW | FEA-009, FEA-020, FEA-022 | SCH-003, SCH-005, SCH-013 | 의사 인증 취소 |
| API-097 | GET | `/api/admin/content-edit-histories` | admin | NEW | FEA-004, FEA-005, FEA-006, FEA-014, FEA-020, FEA-022 | SCH-006, SCH-007, SCH-009, SCH-019, SCH-026, SCH-013 | 콘텐츠 수정 이력 조회 |

## 6. API 상세 요약(API Detail Summary)

### API-001 GET /api/app-context

| 항목 | 내용 |
| --- | --- |
| 설명 | 사이트 앱 컨텍스트 조회 |
| 행위자 | guest_or_member |
| 인증 | optional |
| 관련 기능 | FEA-001, FEA-002, FEA-003, FEA-013, FEA-021, FEA-022 |
| 참조 스키마 | SCH-001, SCH-002, SCH-014 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | apps/server/src/app.module.ts<br>packages/features/_common/controller/user-profile.controller.ts |
| 감사 액션 | none |

### API-002 GET /api/me

| 항목 | 내용 |
| --- | --- |
| 설명 | 현재 사용자 세션과 등급 조회 |
| 행위자 | member |
| 인증 | bearer |
| 관련 기능 | FEA-001, FEA-002, FEA-012, FEA-022 |
| 참조 스키마 | SCH-001 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | apps/server/src/app.module.ts<br>packages/features/_common/controller/user-profile.controller.ts |
| 감사 액션 | none |

### API-003 PATCH /api/me/profile

| 항목 | 내용 |
| --- | --- |
| 설명 | 내 프로필 수정 |
| 행위자 | member |
| 인증 | bearer |
| 관련 기능 | FEA-002, FEA-012, FEA-022 |
| 참조 스키마 | SCH-001 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/_common/controller/user-profile.controller.ts |
| 감사 액션 | user.profile.update |

### API-004 POST /api/auth/oauth/{provider}/callback

| 항목 | 내용 |
| --- | --- |
| 설명 | SNS 로그인 콜백 처리 |
| 행위자 | guest_or_member |
| 인증 | none |
| 관련 기능 | FEA-002 |
| 참조 스키마 | SCH-001 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | apps/server/src/app.module.ts |
| 감사 액션 | auth.oauth.callback |

### API-005 POST /api/auth/logout

| 항목 | 내용 |
| --- | --- |
| 설명 | 로그아웃 |
| 행위자 | member |
| 인증 | bearer |
| 관련 기능 | FEA-002, FEA-012 |
| 참조 스키마 | SCH-001 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | apps/server/src/app.module.ts |
| 감사 액션 | auth.logout |

### API-006 DELETE /api/me

| 항목 | 내용 |
| --- | --- |
| 설명 | 회원 탈퇴 |
| 행위자 | member |
| 인증 | bearer |
| 관련 기능 | FEA-012, FEA-022 |
| 참조 스키마 | SCH-001, SCH-013 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | apps/server/src/app.module.ts<br>packages/features/_common/controller/user-profile.controller.ts |
| 감사 액션 | user.withdraw |

### API-007 GET /api/guest-limits

| 항목 | 내용 |
| --- | --- |
| 설명 | 비회원 사용 한도 조회 |
| 행위자 | guest_or_member |
| 인증 | optional |
| 관련 기능 | FEA-003, FEA-011 |
| 참조 스키마 | SCH-002 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | apps/server/src/app.module.ts |
| 감사 액션 | none |

### API-008 POST /api/guest-limits/events

| 항목 | 내용 |
| --- | --- |
| 설명 | 비회원 제한 이벤트 차감 |
| 행위자 | guest |
| 인증 | optional |
| 관련 기능 | FEA-003, FEA-011 |
| 참조 스키마 | SCH-002 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | apps/server/src/app.module.ts |
| 감사 액션 | guest.limit.event |

### API-009 GET /api/search

| 항목 | 내용 |
| --- | --- |
| 설명 | 통합 검색 |
| 행위자 | guest_or_member |
| 인증 | optional |
| 관련 기능 | FEA-003, FEA-011 |
| 참조 스키마 | SCH-002, SCH-003, SCH-006 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/community/controller/community.controller.ts |
| 감사 액션 | none |

### API-010 GET /api/doctors

| 항목 | 내용 |
| --- | --- |
| 설명 | 명의 찾기 의사 목록 |
| 행위자 | guest_or_member |
| 인증 | optional |
| 관련 기능 | FEA-010, FEA-011, FEA-016 |
| 참조 스키마 | SCH-003, SCH-002 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | packages/features/_common/controller/user-profile.controller.ts |
| 감사 액션 | none |

### API-011 GET /api/doctors/{doctorProfileId}

| 항목 | 내용 |
| --- | --- |
| 설명 | 의사 프로필 상세 |
| 행위자 | guest_or_member |
| 인증 | optional |
| 관련 기능 | FEA-003, FEA-009, FEA-010 |
| 참조 스키마 | SCH-002, SCH-003, SCH-009 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | packages/features/_common/controller/user-profile.controller.ts |
| 감사 액션 | none |

### API-012 POST /api/doctors/{doctorProfileId}/change-requests

| 항목 | 내용 |
| --- | --- |
| 설명 | 의사 정보 수정 요청 |
| 행위자 | member_or_verified_doctor |
| 인증 | bearer |
| 관련 기능 | FEA-010, FEA-020 |
| 참조 스키마 | SCH-003, SCH-004, SCH-013 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | packages/features/_common/controller/user-profile.controller.ts |
| 감사 액션 | doctor_profile.change_request.create |

### API-013 POST /api/identity-verifications/kcb/sessions

| 항목 | 내용 |
| --- | --- |
| 설명 | KCB 본인확인 세션 생성 |
| 행위자 | guest_or_member |
| 인증 | optional |
| 관련 기능 | FEA-008, FEA-022 |
| 참조 스키마 | SCH-005 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/identity-verification/controller/identity-verification.controller.ts |
| 감사 액션 | identity.kcb.session.create |

### API-014 GET /api/identity-verifications/kcb/sessions/{sessionId}

| 항목 | 내용 |
| --- | --- |
| 설명 | KCB 본인확인 세션 조회 |
| 행위자 | guest_or_member |
| 인증 | optional |
| 관련 기능 | FEA-008, FEA-022 |
| 참조 스키마 | SCH-005 |
| 재사용 판정 | REUSE |
| Base Feature API 참조 | packages/features/identity-verification/controller/identity-verification.controller.ts |
| 감사 액션 | none |

### API-015 POST /api/identity-verifications/kcb/sessions/{sessionId}/link

| 항목 | 내용 |
| --- | --- |
| 설명 | KCB 본인확인 세션 사용자 연결 |
| 행위자 | member |
| 인증 | bearer |
| 관련 기능 | FEA-008, FEA-022 |
| 참조 스키마 | SCH-001, SCH-005 |
| 재사용 판정 | REUSE |
| Base Feature API 참조 | packages/features/identity-verification/controller/identity-verification.controller.ts |
| 감사 액션 | identity.kcb.session.link |

### API-016 POST /api/doctor-verifications/license

| 항목 | 내용 |
| --- | --- |
| 설명 | 의사 면허 검증 제출 |
| 행위자 | member |
| 인증 | bearer |
| 관련 기능 | FEA-008, FEA-009, FEA-020 |
| 참조 스키마 | SCH-001, SCH-003, SCH-005, SCH-013 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/identity-verification/controller/identity-verification.controller.ts |
| 감사 액션 | doctor_verification.license.submit |

### API-017 GET /api/doctor-verifications/me

| 항목 | 내용 |
| --- | --- |
| 설명 | 내 의사 인증 상태 조회 |
| 행위자 | member |
| 인증 | bearer |
| 관련 기능 | FEA-008, FEA-009 |
| 참조 스키마 | SCH-001, SCH-003, SCH-005 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/identity-verification/controller/identity-verification.controller.ts |
| 감사 액션 | none |

### API-018 POST /api/medical-visit-verifications

| 항목 | 내용 |
| --- | --- |
| 설명 | 병원 방문 인증 제출 |
| 행위자 | member |
| 인증 | bearer |
| 관련 기능 | FEA-006, FEA-007, FEA-015, FEA-022 |
| 참조 스키마 | SCH-009, SCH-010, SCH-016 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | - |
| 감사 액션 | medical_visit_verification.create |

### API-019 GET /api/medical-visit-verifications/{verificationId}

| 항목 | 내용 |
| --- | --- |
| 설명 | 병원 방문 인증 상태 조회 |
| 행위자 | member |
| 인증 | bearer |
| 관련 기능 | FEA-007, FEA-022 |
| 참조 스키마 | SCH-010 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | - |
| 감사 액션 | none |

### API-020 GET /api/community

| 항목 | 내용 |
| --- | --- |
| 설명 | 커뮤니티 공간 목록 |
| 행위자 | guest_or_member |
| 인증 | optional |
| 관련 기능 | FEA-004, FEA-014, FEA-016 |
| 참조 스키마 | SCH-018 |
| 재사용 판정 | REUSE |
| Base Feature API 참조 | packages/features/community/controller/community.controller.ts |
| 감사 액션 | none |

### API-021 GET /api/community/posts

| 항목 | 내용 |
| --- | --- |
| 설명 | 커뮤니티 게시글 목록 |
| 행위자 | guest_or_member |
| 인증 | optional |
| 관련 기능 | FEA-004, FEA-011, FEA-014, FEA-015, FEA-016 |
| 참조 스키마 | SCH-006, SCH-018, SCH-016 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/community/controller/community.controller.ts |
| 감사 액션 | none |

### API-022 GET /api/community/posts/{postId}

| 항목 | 내용 |
| --- | --- |
| 설명 | 커뮤니티 게시글 상세 |
| 행위자 | guest_or_member |
| 인증 | optional |
| 관련 기능 | FEA-003, FEA-004, FEA-009, FEA-014, FEA-015 |
| 참조 스키마 | SCH-002, SCH-006, SCH-007, SCH-008, SCH-012 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/community/controller/community.controller.ts |
| 감사 액션 | none |

### API-023 POST /api/community/posts

| 항목 | 내용 |
| --- | --- |
| 설명 | 커뮤니티 게시글 작성 |
| 행위자 | member_or_verified_doctor |
| 인증 | bearer |
| 관련 기능 | FEA-001, FEA-004, FEA-007, FEA-009, FEA-015, FEA-021, FEA-022 |
| 참조 스키마 | SCH-001, SCH-006, SCH-010, SCH-014, SCH-016, SCH-018 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/community/controller/community.controller.ts |
| 감사 액션 | community.post.create |

### API-024 PUT /api/community/posts/{postId}

| 항목 | 내용 |
| --- | --- |
| 설명 | 커뮤니티 게시글 수정 |
| 행위자 | author_or_admin |
| 인증 | bearer |
| 관련 기능 | FEA-004, FEA-014, FEA-015, FEA-021, FEA-022 |
| 참조 스키마 | SCH-006, SCH-014, SCH-016 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/community/controller/community.controller.ts |
| 감사 액션 | community.post.update |

### API-025 DELETE /api/community/posts/{postId}

| 항목 | 내용 |
| --- | --- |
| 설명 | 커뮤니티 게시글 삭제 |
| 행위자 | author_or_admin |
| 인증 | bearer |
| 관련 기능 | FEA-004, FEA-014, FEA-021, FEA-022 |
| 참조 스키마 | SCH-006, SCH-014, SCH-013 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/community/controller/community.controller.ts |
| 감사 액션 | community.post.delete |

### API-026 GET /api/community/posts/{postId}/comments

| 항목 | 내용 |
| --- | --- |
| 설명 | 커뮤니티 게시글 댓글 목록 |
| 행위자 | guest_or_member |
| 인증 | optional |
| 관련 기능 | FEA-005, FEA-009, FEA-014, FEA-015 |
| 참조 스키마 | SCH-007, SCH-012 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/community/controller/community.controller.ts |
| 감사 액션 | none |

### API-027 POST /api/community/comments

| 항목 | 내용 |
| --- | --- |
| 설명 | 커뮤니티 댓글 작성 |
| 행위자 | member_or_verified_doctor |
| 인증 | bearer |
| 관련 기능 | FEA-001, FEA-005, FEA-009, FEA-015, FEA-021 |
| 참조 스키마 | SCH-001, SCH-007, SCH-014, SCH-016 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/community/controller/community.controller.ts |
| 감사 액션 | community.comment.create |

### API-028 PUT /api/community/comments/{commentId}

| 항목 | 내용 |
| --- | --- |
| 설명 | 커뮤니티 댓글 수정 |
| 행위자 | author |
| 인증 | bearer |
| 관련 기능 | FEA-005, FEA-014, FEA-015, FEA-021 |
| 참조 스키마 | SCH-007, SCH-014, SCH-016 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/community/controller/community.controller.ts |
| 감사 액션 | community.comment.update |

### API-029 DELETE /api/community/comments/{commentId}

| 항목 | 내용 |
| --- | --- |
| 설명 | 커뮤니티 댓글 삭제 |
| 행위자 | author_or_admin |
| 인증 | bearer |
| 관련 기능 | FEA-005, FEA-014, FEA-021 |
| 참조 스키마 | SCH-007, SCH-014, SCH-013 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/community/controller/community.controller.ts |
| 감사 액션 | community.comment.delete |

### API-030 POST /api/community/votes

| 항목 | 내용 |
| --- | --- |
| 설명 | 커뮤니티 공감 등록 |
| 행위자 | member |
| 인증 | bearer |
| 관련 기능 | FEA-005 |
| 참조 스키마 | SCH-008 |
| 재사용 판정 | REUSE |
| Base Feature API 참조 | packages/features/community/controller/community.controller.ts |
| 감사 액션 | community.vote.create |

### API-031 DELETE /api/community/votes

| 항목 | 내용 |
| --- | --- |
| 설명 | 커뮤니티 공감 취소 |
| 행위자 | member |
| 인증 | bearer |
| 관련 기능 | FEA-005 |
| 참조 스키마 | SCH-008 |
| 재사용 판정 | REUSE |
| Base Feature API 참조 | packages/features/community/controller/community.controller.ts |
| 감사 액션 | community.vote.delete |

### API-032 POST /api/community/reports

| 항목 | 내용 |
| --- | --- |
| 설명 | 커뮤니티 콘텐츠 신고 |
| 행위자 | member |
| 인증 | bearer |
| 관련 기능 | FEA-014, FEA-015, FEA-022 |
| 참조 스키마 | SCH-012, SCH-016, SCH-018 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/community/controller/community.controller.ts |
| 감사 액션 | community.report.create |

### API-033 GET /api/community/feed/home

| 항목 | 내용 |
| --- | --- |
| 설명 | 홈 커뮤니티 피드 조회 |
| 행위자 | guest_or_member |
| 인증 | optional |
| 관련 기능 | FEA-004, FEA-016 |
| 참조 스키마 | SCH-006, SCH-011, SCH-018 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/community/controller/community.controller.ts |
| 감사 액션 | none |

### API-034 GET /api/doctors/{doctorProfileId}/reviews

| 항목 | 내용 |
| --- | --- |
| 설명 | 의사 후기 목록 |
| 행위자 | guest_or_member |
| 인증 | optional |
| 관련 기능 | FEA-006, FEA-007, FEA-010, FEA-012, FEA-014 |
| 참조 스키마 | SCH-003, SCH-009, SCH-010, SCH-019 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/comment/controller/comment.controller.ts |
| 감사 액션 | none |

### API-035 POST /api/doctors/{doctorProfileId}/reviews

| 항목 | 내용 |
| --- | --- |
| 설명 | 의사 후기 작성 |
| 행위자 | member |
| 인증 | bearer |
| 관련 기능 | FEA-001, FEA-006, FEA-007, FEA-010, FEA-015, FEA-021, FEA-022 |
| 참조 스키마 | SCH-001, SCH-003, SCH-009, SCH-010, SCH-014, SCH-016 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/comment/controller/comment.controller.ts |
| 감사 액션 | doctor_review.create |

### API-036 PATCH /api/reviews/{reviewId}

| 항목 | 내용 |
| --- | --- |
| 설명 | 의사 후기 수정 |
| 행위자 | author |
| 인증 | bearer |
| 관련 기능 | FEA-006, FEA-014, FEA-015, FEA-021 |
| 참조 스키마 | SCH-009, SCH-014, SCH-016 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | - |
| 감사 액션 | doctor_review.update |

### API-037 DELETE /api/reviews/{reviewId}

| 항목 | 내용 |
| --- | --- |
| 설명 | 의사 후기 삭제 |
| 행위자 | author_or_admin |
| 인증 | bearer |
| 관련 기능 | FEA-006, FEA-012, FEA-014, FEA-021 |
| 참조 스키마 | SCH-009, SCH-014, SCH-013 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | - |
| 감사 액션 | doctor_review.delete |

### API-038 POST /api/reviews/{reviewId}/reports

| 항목 | 내용 |
| --- | --- |
| 설명 | 의사 후기 신고 |
| 행위자 | member |
| 인증 | bearer |
| 관련 기능 | FEA-006, FEA-014, FEA-022 |
| 참조 스키마 | SCH-009, SCH-012, SCH-013 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/community/controller/community-admin.controller.ts |
| 감사 액션 | doctor_review.report.create |

### API-039 GET /api/comment

| 항목 | 내용 |
| --- | --- |
| 설명 | 리뷰 댓글 목록 |
| 행위자 | guest_or_member |
| 인증 | optional |
| 관련 기능 | FEA-005, FEA-006, FEA-014 |
| 참조 스키마 | SCH-019 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/comment/controller/comment.controller.ts |
| 감사 액션 | none |

### API-040 POST /api/comment

| 항목 | 내용 |
| --- | --- |
| 설명 | 리뷰 댓글 작성 |
| 행위자 | member_or_verified_doctor |
| 인증 | bearer |
| 관련 기능 | FEA-005, FEA-006, FEA-009, FEA-014, FEA-015 |
| 참조 스키마 | SCH-019, SCH-016 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/comment/controller/comment.controller.ts |
| 감사 액션 | review_comment.create |

### API-041 PUT /api/comment/{commentId}

| 항목 | 내용 |
| --- | --- |
| 설명 | 리뷰 댓글 수정 |
| 행위자 | author |
| 인증 | bearer |
| 관련 기능 | FEA-005, FEA-006, FEA-014, FEA-015 |
| 참조 스키마 | SCH-019, SCH-016 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/comment/controller/comment.controller.ts |
| 감사 액션 | review_comment.update |

### API-042 DELETE /api/comment/{commentId}

| 항목 | 내용 |
| --- | --- |
| 설명 | 리뷰 댓글 삭제 |
| 행위자 | author_or_admin |
| 인증 | bearer |
| 관련 기능 | FEA-005, FEA-006, FEA-014 |
| 참조 스키마 | SCH-019, SCH-013 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/comment/controller/comment.controller.ts |
| 감사 액션 | review_comment.delete |

### API-043 GET /api/home

| 항목 | 내용 |
| --- | --- |
| 설명 | 홈 화면 데이터 조회 |
| 행위자 | guest_or_member |
| 인증 | optional |
| 관련 기능 | FEA-016, FEA-017 |
| 참조 스키마 | SCH-003, SCH-006, SCH-011, SCH-017 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/community/controller/community.controller.ts |
| 감사 액션 | none |

### API-044 GET /api/support/notices

| 항목 | 내용 |
| --- | --- |
| 설명 | 공지사항 목록 |
| 행위자 | guest_or_member |
| 인증 | optional |
| 관련 기능 | FEA-012, FEA-017 |
| 참조 스키마 | SCH-017 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/feedback/controller/feedback.controller.ts |
| 감사 액션 | none |

### API-045 GET /api/support/notices/{contentId}

| 항목 | 내용 |
| --- | --- |
| 설명 | 공지사항 상세 |
| 행위자 | guest_or_member |
| 인증 | optional |
| 관련 기능 | FEA-012, FEA-017 |
| 참조 스키마 | SCH-017 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | - |
| 감사 액션 | none |

### API-046 GET /api/support/policies/{contentType}

| 항목 | 내용 |
| --- | --- |
| 설명 | 약관/개인정보 정책 조회 |
| 행위자 | guest_or_member |
| 인증 | optional |
| 관련 기능 | FEA-017, FEA-022 |
| 참조 스키마 | SCH-017 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/feedback/controller/feedback.controller.ts |
| 감사 액션 | none |

### API-047 POST /api/feedback

| 항목 | 내용 |
| --- | --- |
| 설명 | 의견 보내기 |
| 행위자 | member |
| 인증 | bearer |
| 관련 기능 | FEA-012, FEA-018 |
| 참조 스키마 | SCH-017 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/feedback/controller/feedback.controller.ts |
| 감사 액션 | feedback.submit |

### API-048 GET /api/operational-policies/effective

| 항목 | 내용 |
| --- | --- |
| 설명 | 적용 중 운영 정책 조회 |
| 행위자 | guest_or_member |
| 인증 | optional |
| 관련 기능 | FEA-005, FEA-006, FEA-007, FEA-013, FEA-021 |
| 참조 스키마 | SCH-014 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | - |
| 감사 액션 | none |

### API-049 POST /api/ai-chat/messages

| 항목 | 내용 |
| --- | --- |
| 설명 | 외부 AI 채팅 REST 메시지 전송 |
| 행위자 | member_or_guest |
| 인증 | optional |
| 관련 기능 | FEA-023, FEA-010, FEA-022 |
| 참조 스키마 | SCH-003, SCH-015 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | - |
| 감사 액션 | external_ai_chat.message.send |

### API-050 GET /api/admin/dashboard

| 항목 | 내용 |
| --- | --- |
| 설명 | 어드민 대시보드 조회 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-019, FEA-020 |
| 참조 스키마 | SCH-001, SCH-003, SCH-005, SCH-009, SCH-012, SCH-013, SCH-017 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/_common/controller/admin-users.controller.ts<br>packages/features/community/controller/community-admin.controller.ts<br>packages/features/identity-verification/controller/identity-verification-admin.controller.ts |
| 감사 액션 | none |

### API-051 GET /api/admin/users

| 항목 | 내용 |
| --- | --- |
| 설명 | 어드민 사용자 목록 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-019, FEA-020, FEA-022 |
| 참조 스키마 | SCH-001, SCH-013 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/_common/controller/admin-users.controller.ts |
| 감사 액션 | none |

### API-052 GET /api/admin/doctors

| 항목 | 내용 |
| --- | --- |
| 설명 | 어드민 의사 목록 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-010, FEA-020 |
| 참조 스키마 | SCH-003, SCH-009, SCH-013 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/_common/controller/admin-users.controller.ts |
| 감사 액션 | none |

### API-053 PATCH /api/admin/doctors/{doctorProfileId}

| 항목 | 내용 |
| --- | --- |
| 설명 | 어드민 의사 프로필 운영 수정 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-010, FEA-020, FEA-022 |
| 참조 스키마 | SCH-003, SCH-013 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | - |
| 감사 액션 | admin.doctor_profile.update |

### API-054 GET /api/admin/doctor-profile-change-requests

| 항목 | 내용 |
| --- | --- |
| 설명 | 의사 정보 수정 요청 목록 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-010, FEA-020 |
| 참조 스키마 | SCH-003, SCH-004, SCH-013 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | - |
| 감사 액션 | none |

### API-055 PATCH /api/admin/doctor-profile-change-requests/{requestId}

| 항목 | 내용 |
| --- | --- |
| 설명 | 의사 정보 수정 요청 처리 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-010, FEA-020 |
| 참조 스키마 | SCH-003, SCH-004, SCH-013 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | - |
| 감사 액션 | admin.doctor_profile_change_request.resolve |

### API-056 GET /api/admin/doctor-verifications

| 항목 | 내용 |
| --- | --- |
| 설명 | 의사 인증 요청 목록 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-008, FEA-020, FEA-022 |
| 참조 스키마 | SCH-001, SCH-003, SCH-005, SCH-013 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/identity-verification/controller/identity-verification-admin.controller.ts |
| 감사 액션 | none |

### API-057 PATCH /api/admin/doctor-verifications/{requestId}

| 항목 | 내용 |
| --- | --- |
| 설명 | 의사 인증 요청 승인/반려 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-001, FEA-008, FEA-009, FEA-020, FEA-022 |
| 참조 스키마 | SCH-001, SCH-003, SCH-005, SCH-013 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/identity-verification/controller/identity-verification-admin.controller.ts |
| 감사 액션 | admin.doctor_verification.resolve |

### API-058 GET /api/admin/medical-visit-verifications

| 항목 | 내용 |
| --- | --- |
| 설명 | 병원 방문 인증 검토 목록 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-007, FEA-020 |
| 참조 스키마 | SCH-010, SCH-013 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | - |
| 감사 액션 | none |

### API-059 PATCH /api/admin/medical-visit-verifications/{verificationId}

| 항목 | 내용 |
| --- | --- |
| 설명 | 병원 방문 인증 수동 처리 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-007, FEA-020, FEA-022 |
| 참조 스키마 | SCH-010, SCH-013 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | - |
| 감사 액션 | admin.medical_visit_verification.resolve |

### API-060 GET /api/admin/community/reports

| 항목 | 내용 |
| --- | --- |
| 설명 | 커뮤니티 신고 목록 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-014, FEA-015, FEA-020, FEA-022 |
| 참조 스키마 | SCH-012, SCH-013, SCH-016 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/community/controller/community-admin.controller.ts |
| 감사 액션 | none |

### API-061 POST /api/admin/community/reports/resolve

| 항목 | 내용 |
| --- | --- |
| 설명 | 커뮤니티 신고 처리 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-014, FEA-015, FEA-020, FEA-022 |
| 참조 스키마 | SCH-012, SCH-013, SCH-016 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/community/controller/community-admin.controller.ts |
| 감사 액션 | admin.community_report.resolve |

### API-062 GET /api/admin/review-reports

| 항목 | 내용 |
| --- | --- |
| 설명 | 후기 신고 목록 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-006, FEA-014, FEA-020, FEA-022 |
| 참조 스키마 | SCH-009, SCH-012, SCH-013 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/community/controller/community-admin.controller.ts |
| 감사 액션 | none |

### API-063 POST /api/admin/review-reports/{reportId}/resolve

| 항목 | 내용 |
| --- | --- |
| 설명 | 후기 신고 처리 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-006, FEA-014, FEA-020, FEA-022 |
| 참조 스키마 | SCH-009, SCH-012, SCH-013 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/community/controller/community-admin.controller.ts |
| 감사 액션 | admin.review_report.resolve |

### API-064 GET /api/admin/content-safety/rules

| 항목 | 내용 |
| --- | --- |
| 설명 | 콘텐츠 안전 규칙 목록 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-015, FEA-022 |
| 참조 스키마 | SCH-016, SCH-013 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | - |
| 감사 액션 | none |

### API-065 POST /api/admin/content-safety/rules

| 항목 | 내용 |
| --- | --- |
| 설명 | 콘텐츠 안전 규칙 생성 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-015, FEA-022 |
| 참조 스키마 | SCH-016, SCH-013 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | - |
| 감사 액션 | admin.content_safety_rule.create |

### API-066 PATCH /api/admin/content-safety/rules/{ruleId}

| 항목 | 내용 |
| --- | --- |
| 설명 | 콘텐츠 안전 규칙 수정 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-015, FEA-022 |
| 참조 스키마 | SCH-016, SCH-013 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | - |
| 감사 액션 | admin.content_safety_rule.update |

### API-067 GET /api/admin/home-curation

| 항목 | 내용 |
| --- | --- |
| 설명 | 홈 큐레이션 항목 목록 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-016, FEA-020 |
| 참조 스키마 | SCH-011, SCH-013 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/community/controller/community-admin.controller.ts |
| 감사 액션 | none |

### API-068 POST /api/admin/home-curation

| 항목 | 내용 |
| --- | --- |
| 설명 | 홈 큐레이션 항목 생성 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-016, FEA-020 |
| 참조 스키마 | SCH-011, SCH-013 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | - |
| 감사 액션 | admin.home_curation.create |

### API-069 PATCH /api/admin/home-curation/{itemId}

| 항목 | 내용 |
| --- | --- |
| 설명 | 홈 큐레이션 항목 수정 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-016, FEA-020 |
| 참조 스키마 | SCH-011, SCH-013 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | - |
| 감사 액션 | admin.home_curation.update |

### API-070 DELETE /api/admin/home-curation/{itemId}

| 항목 | 내용 |
| --- | --- |
| 설명 | 홈 큐레이션 항목 삭제 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-016, FEA-020 |
| 참조 스키마 | SCH-011, SCH-013 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | - |
| 감사 액션 | admin.home_curation.delete |

### API-071 GET /api/admin/support-contents

| 항목 | 내용 |
| --- | --- |
| 설명 | 고객지원/정책 콘텐츠 목록 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-017, FEA-018, FEA-020 |
| 참조 스키마 | SCH-017, SCH-013 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/feedback/controller/feedback.controller.ts |
| 감사 액션 | none |

### API-072 POST /api/admin/support-contents

| 항목 | 내용 |
| --- | --- |
| 설명 | 고객지원/정책 콘텐츠 생성 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-017, FEA-020, FEA-022 |
| 참조 스키마 | SCH-017, SCH-013 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | - |
| 감사 액션 | admin.support_content.create |

### API-073 PATCH /api/admin/support-contents/{contentId}

| 항목 | 내용 |
| --- | --- |
| 설명 | 고객지원/정책 콘텐츠 수정 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-017, FEA-018, FEA-020, FEA-022 |
| 참조 스키마 | SCH-017, SCH-013 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | - |
| 감사 액션 | admin.support_content.update |

### API-074 GET /api/admin/feedback

| 항목 | 내용 |
| --- | --- |
| 설명 | 의견 보내기 목록 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-018, FEA-020 |
| 참조 스키마 | SCH-017, SCH-013 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/feedback/controller/feedback.controller.ts |
| 감사 액션 | none |

### API-075 PATCH /api/admin/feedback/{feedbackId}

| 항목 | 내용 |
| --- | --- |
| 설명 | 의견 보내기 종결 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-018, FEA-020 |
| 참조 스키마 | SCH-017, SCH-013 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/feedback/controller/feedback.controller.ts |
| 감사 액션 | admin.feedback.close |

### API-076 GET /api/admin/operational-policies

| 항목 | 내용 |
| --- | --- |
| 설명 | 운영 정책 목록 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-005, FEA-006, FEA-007, FEA-013, FEA-021 |
| 참조 스키마 | SCH-014, SCH-013 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | - |
| 감사 액션 | none |

### API-077 PUT /api/admin/operational-policies/{policyKey}

| 항목 | 내용 |
| --- | --- |
| 설명 | 운영 정책 저장 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-005, FEA-006, FEA-007, FEA-013, FEA-021 |
| 참조 스키마 | SCH-014, SCH-013 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | - |
| 감사 액션 | admin.operational_policy.upsert |

### API-078 GET /api/admin/audit-logs

| 항목 | 내용 |
| --- | --- |
| 설명 | 감사 로그 조회 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-019, FEA-020, FEA-022 |
| 참조 스키마 | SCH-013 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/_common/controller/admin-users.controller.ts |
| 감사 액션 | none |

### API-079 POST /api/files/upload-url

| 항목 | 내용 |
| --- | --- |
| 설명 | 파일 업로드 URL 생성 |
| 행위자 | member_or_admin |
| 인증 | bearer |
| 관련 기능 | FEA-004, FEA-006, FEA-007, FEA-015, FEA-016, FEA-022 |
| 참조 스키마 | SCH-020, SCH-024, SCH-025 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | apps/server/src/app.module.ts |
| 감사 액션 | file.upload_url.create |

### API-080 POST /api/files/confirm

| 항목 | 내용 |
| --- | --- |
| 설명 | 파일 업로드 확정 |
| 행위자 | member_or_admin |
| 인증 | bearer |
| 관련 기능 | FEA-004, FEA-006, FEA-007, FEA-015, FEA-016, FEA-022 |
| 참조 스키마 | SCH-020, SCH-024, SCH-025 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | apps/server/src/app.module.ts<br>apps/server/src/app.module.ts |
| 감사 액션 | file.upload.confirm |

### API-081 GET /api/files/{fileId}/signed-url

| 항목 | 내용 |
| --- | --- |
| 설명 | 파일 signed URL 조회 |
| 행위자 | member_or_admin |
| 인증 | bearer |
| 관련 기능 | FEA-006, FEA-007, FEA-015, FEA-016, FEA-022 |
| 참조 스키마 | SCH-020 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | apps/server/src/app.module.ts |
| 감사 액션 | none |

### API-082 GET /api/me/activity

| 항목 | 내용 |
| --- | --- |
| 설명 | 내 활동 집계 조회 |
| 행위자 | member |
| 인증 | bearer |
| 관련 기능 | FEA-012, FEA-004, FEA-005, FEA-006 |
| 참조 스키마 | SCH-006, SCH-007, SCH-009, SCH-019, SCH-021 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | packages/features/_common/controller/user-profile.controller.ts<br>packages/features/community/controller/community.controller.ts<br>packages/features/comment/controller/comment.controller.ts |
| 감사 액션 | none |

### API-083 GET /api/me/saved-doctors

| 항목 | 내용 |
| --- | --- |
| 설명 | 저장한 의료진 목록 |
| 행위자 | member |
| 인증 | bearer |
| 관련 기능 | FEA-010, FEA-012 |
| 참조 스키마 | SCH-003, SCH-021 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | - |
| 감사 액션 | none |

### API-084 POST /api/doctors/{doctorProfileId}/save

| 항목 | 내용 |
| --- | --- |
| 설명 | 의사 프로필 저장 |
| 행위자 | member |
| 인증 | bearer |
| 관련 기능 | FEA-010, FEA-012 |
| 참조 스키마 | SCH-003, SCH-021 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | - |
| 감사 액션 | doctor.save |

### API-085 DELETE /api/doctors/{doctorProfileId}/save

| 항목 | 내용 |
| --- | --- |
| 설명 | 의사 프로필 저장 취소 |
| 행위자 | member |
| 인증 | bearer |
| 관련 기능 | FEA-010, FEA-012 |
| 참조 스키마 | SCH-003, SCH-021 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | - |
| 감사 액션 | doctor.unsave |

### API-086 POST /api/analytics/events

| 항목 | 내용 |
| --- | --- |
| 설명 | 분석 이벤트 수집 |
| 행위자 | guest_or_member |
| 인증 | optional |
| 관련 기능 | FEA-022 |
| 참조 스키마 | SCH-022 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | apps/server/src/main.ts |
| 감사 액션 | none |

### API-087 POST /api/admin/auth/login

| 항목 | 내용 |
| --- | --- |
| 설명 | 어드민 이메일/비밀번호 로그인 |
| 행위자 | admin |
| 인증 | none |
| 관련 기능 | FEA-019, FEA-022 |
| 참조 스키마 | SCH-001, SCH-013, SCH-023 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | apps/server/src/app.module.ts |
| 감사 액션 | admin.auth.login |

### API-088 POST /api/admin/auth/2fa/verify

| 항목 | 내용 |
| --- | --- |
| 설명 | 어드민 Google OTP 검증 |
| 행위자 | admin |
| 인증 | none |
| 관련 기능 | FEA-019, FEA-022 |
| 참조 스키마 | SCH-001, SCH-013, SCH-023 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | apps/server/src/app.module.ts |
| 감사 액션 | admin.auth.2fa.verify |

### API-089 POST /api/admin/auth/logout

| 항목 | 내용 |
| --- | --- |
| 설명 | 어드민 로그아웃 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-019, FEA-022 |
| 참조 스키마 | SCH-001, SCH-013, SCH-023 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | apps/server/src/app.module.ts |
| 감사 액션 | admin.auth.logout |

### API-090 GET /api/admin/auth/session

| 항목 | 내용 |
| --- | --- |
| 설명 | 어드민 세션 조회 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-019, FEA-022 |
| 참조 스키마 | SCH-001, SCH-023 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | apps/server/src/app.module.ts |
| 감사 액션 | none |

### API-091 POST /api/admin/auth/2fa/setup

| 항목 | 내용 |
| --- | --- |
| 설명 | 어드민 2FA 설정 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-019, FEA-022 |
| 참조 스키마 | SCH-001, SCH-013, SCH-023 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | apps/server/src/app.module.ts |
| 감사 액션 | admin.auth.2fa.setup |

### API-092 DELETE /api/admin/auth/2fa

| 항목 | 내용 |
| --- | --- |
| 설명 | 어드민 2FA 비활성화 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-019, FEA-022 |
| 참조 스키마 | SCH-001, SCH-013, SCH-023 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | apps/server/src/app.module.ts |
| 감사 액션 | admin.auth.2fa.disable |

### API-093 GET /api/admin/content-safety/logs

| 항목 | 내용 |
| --- | --- |
| 설명 | 콘텐츠 안전 로그 조회 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-015, FEA-022 |
| 참조 스키마 | SCH-016, SCH-024, SCH-025, SCH-013 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | - |
| 감사 액션 | none |

### API-094 GET /api/admin/integration-call-logs

| 항목 | 내용 |
| --- | --- |
| 설명 | 외부 연동 호출 로그 조회 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-007, FEA-015, FEA-022, FEA-023 |
| 참조 스키마 | SCH-020, SCH-025, SCH-013 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | apps/server/src/app.module.ts |
| 감사 액션 | none |

### API-095 GET /api/admin/integrations/status

| 항목 | 내용 |
| --- | --- |
| 설명 | 외부 연동 상태 조회 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-007, FEA-015, FEA-022, FEA-023 |
| 참조 스키마 | SCH-015, SCH-024, SCH-025 |
| 재사용 판정 | EXTEND |
| Base Feature API 참조 | apps/server/src/app.module.ts |
| 감사 액션 | none |

### API-096 POST /api/admin/doctors/{doctorProfileId}/verification-cancel

| 항목 | 내용 |
| --- | --- |
| 설명 | 의사 인증 취소 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-009, FEA-020, FEA-022 |
| 참조 스키마 | SCH-003, SCH-005, SCH-013 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | - |
| 감사 액션 | admin.doctor_verification.cancel |

### API-097 GET /api/admin/content-edit-histories

| 항목 | 내용 |
| --- | --- |
| 설명 | 콘텐츠 수정 이력 조회 |
| 행위자 | admin |
| 인증 | admin |
| 관련 기능 | FEA-004, FEA-005, FEA-006, FEA-014, FEA-020, FEA-022 |
| 참조 스키마 | SCH-006, SCH-007, SCH-009, SCH-019, SCH-026, SCH-013 |
| 재사용 판정 | NEW |
| Base Feature API 참조 | - |
| 감사 액션 | none |

## 7. 최종 개발 산출물 상태(Final Development Artifact Status)

이 문서는 개발 투입 기준의 최종 REST API 정의서다. OpenAPI YAML이 primary contract이며, 이 Markdown은 OpenAPI 색인, feature/schema traceability, 재사용 판단, 리뷰 결과를 한 문서에서 확인하기 위한 개발용 요약이다.

### 커버리지 요약

| 항목 | 결과 |
| --- | --- |
| Primary OpenAPI | `api-definition.openapi.yaml` |
| OpenAPI JSON mirror | `api-definition.openapi.json` |
| API 수 | 97개 |
| OpenAPI tag 기준 | `FEA-### 기능명` feature tag |
| OpenAPI path 수 | 82개 |
| feature mapping | 23/23 features mapped |
| schema mapping | 26/26 schemas mapped |
| 미매핑 feature | 0개 |
| 외부 AI 채팅 범위 | `POST /api/ai-chat/messages` 외부 REST 연동만 포함, 내부 AI 생성 구현 제외 |

### 재사용 판단 요약

| 재사용 판정 | API 수 |
| --- | ---: |
| REUSE | 5 |
| EXTEND | 61 |
| NEW | 31 |

### 검증 및 리뷰 결과

| 항목 | 결과 | 산출 파일 |
| --- | --- | --- |
| 구조 검증 | pass, error 0, warning 0 | `api-definition.validation.json` |
| 자체 리뷰 | pass, error 0, warning 0, info 1 | `api-definition.review.json`, `api-definition-review.md` |
| OpenAPI YAML parser 확인 | pass, `yaml-ok` | `api-definition.openapi.yaml` |
| 보완 루프 | 완료, 남은 허용 warning 없음 | `api-definition-loop.md` |

### 개발 사용 기준

- 구현과 QA의 primary API contract는 `api-definition.openapi.yaml`이다.
- OpenAPI `tags`는 feature 단위(`FEA-### 기능명`)로 구분한다.
- 각 operation의 `x-api-code`, `x-domain-tag`, `x-feature-codes`, `x-schema-codes`, `x-base-reuse-decision`, `x-base-feature-references`, `x-audit-action`을 유지한다.
- admin mutation API는 감사 로그 액션을 반드시 구현한다.
- product-builder-base 재사용은 커뮤니티, 댓글, 본인확인, 피드백, admin user/profile controller/service/dto 참조를 우선한다.
- 외부 AI 채팅은 server/site REST integration까지만 구현하고 내부 AI 런타임은 만들지 않는다.

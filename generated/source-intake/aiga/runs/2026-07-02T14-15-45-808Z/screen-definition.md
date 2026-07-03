# 화면정의서(Screen Definition) - Aiga

이 문서는 기능정의서, 스키마 정의서, API 정의서를 화면 구현과 QA가 사용할 수 있는 화면 단위 계약으로 변환한 aggregate 산출물이다.

## 1. 산출물 요약

| 항목 | 값 |
| --- | --- |
| 프로젝트 | Aiga |
| Workflow | feature-implementation |
| 화면 수 | 31 |
| 화면 인덱스 | screen-definitions/screen-definition-index.md |
| Coverage JSON | screen-coverage.json |
| Feature mapping | 23/23 features mapped |
| API mapping | 97/97 APIs mapped |

## 2. 작성 기준

- 선행 산출물의 FEA/SCH/API 코드를 참조하고 새 계약을 만들지 않는다.
- 모든 화면은 Default, Empty, Loading, Error, Permission 상태를 검토한다.
- 모든 액션은 ACT-##, 모든 QA case는 AC-## 코드를 사용한다.
- Figma visual baseline은 figma-screen-definition.md에서 별도로 관리한다.

## 3. 화면 목록

| 화면 코드 | Surface | 화면명 | Route | 문서 | Feature | API |
| --- | --- | --- | --- | --- | --- | --- |
| SITE-SCR-001 | site | 홈 | / | screen-definitions/site/SITE-SCR-001-홈.md | FEA-001, FEA-003, FEA-011, FEA-013, FEA-016, FEA-017, FEA-022, FEA-023 | API-001, API-007, API-008, API-009, API-010, API-020, API-021, API-033, API-043, API-048, API-049, API-086 |
| SITE-SCR-002 | site | 인증 및 로그인 모달 | /auth/* modal | screen-definitions/site/SITE-SCR-002-인증-및-로그인-모달.md | FEA-001, FEA-002, FEA-003, FEA-013, FEA-022 | API-001, API-002, API-003, API-004, API-005, API-086 |
| SITE-SCR-003 | site | AIGA 채팅 | /aiga | screen-definitions/site/SITE-SCR-003-aiga-채팅.md | FEA-010, FEA-013, FEA-022, FEA-023 | API-001, API-049, API-086 |
| SITE-SCR-004 | site | 명의 찾기 목록과 검색 | /doctors | screen-definitions/site/SITE-SCR-004-명의-찾기-목록과-검색.md | FEA-003, FEA-010, FEA-011, FEA-013, FEA-016, FEA-022 | API-007, API-008, API-009, API-010, API-011, API-083, API-084, API-085, API-086 |
| SITE-SCR-005 | site | 의사 프로필 상세 | /doctors/:doctorProfileId | screen-definitions/site/SITE-SCR-005-의사-프로필-상세.md | FEA-001, FEA-003, FEA-006, FEA-007, FEA-009, FEA-010, FEA-012, FEA-014, FEA-022 | API-007, API-008, API-011, API-012, API-034, API-038, API-039, API-040, API-041, API-042, API-081, API-084, API-085, API-086 |
| SITE-SCR-006 | site | 리뷰 작성 및 수정 | /doctors/:doctorProfileId/reviews/new | screen-definitions/site/SITE-SCR-006-리뷰-작성-및-수정.md | FEA-006, FEA-007, FEA-014, FEA-015, FEA-021, FEA-022 | API-018, API-019, API-035, API-036, API-048, API-079, API-080, API-081, API-086 |
| SITE-SCR-007 | site | 병원 방문 인증 | /medical-visit-verifications/new modal | screen-definitions/site/SITE-SCR-007-병원-방문-인증.md | FEA-007, FEA-015, FEA-022 | API-018, API-019, API-079, API-080, API-081, API-094, API-095 |
| SITE-SCR-008 | site | 의사 본인 인증 | /doctor-verification | screen-definitions/site/SITE-SCR-008-의사-본인-인증.md | FEA-008, FEA-009, FEA-010, FEA-022 | API-013, API-014, API-015, API-016, API-017, API-086 |
| SITE-SCR-009 | site | 커뮤니티 피드 | /community | screen-definitions/site/SITE-SCR-009-커뮤니티-피드.md | FEA-003, FEA-004, FEA-011, FEA-014, FEA-015, FEA-016, FEA-022 | API-007, API-008, API-009, API-020, API-021, API-033, API-086 |
| SITE-SCR-010 | site | 커뮤니티 글쓰기 및 수정 | /community/posts/new | screen-definitions/site/SITE-SCR-010-커뮤니티-글쓰기-및-수정.md | FEA-001, FEA-004, FEA-007, FEA-009, FEA-015, FEA-021, FEA-022 | API-018, API-019, API-023, API-024, API-048, API-079, API-080, API-081, API-086 |
| SITE-SCR-011 | site | 커뮤니티 게시글 상세 | /community/posts/:postId | screen-definitions/site/SITE-SCR-011-커뮤니티-게시글-상세.md | FEA-003, FEA-004, FEA-005, FEA-009, FEA-014, FEA-015, FEA-021, FEA-022 | API-007, API-008, API-022, API-025, API-026, API-027, API-028, API-029, API-030, API-031, API-032, API-081, API-086 |
| SITE-SCR-012 | site | 신고 모달 | /reports/new modal | screen-definitions/site/SITE-SCR-012-신고-모달.md | FEA-014, FEA-015, FEA-022 | API-032, API-038, API-086 |
| SITE-SCR-013 | site | 마이페이지 프로필과 더보기 | /my | screen-definitions/site/SITE-SCR-013-마이페이지-프로필과-더보기.md | FEA-001, FEA-002, FEA-012, FEA-013, FEA-017, FEA-018, FEA-022 | API-001, API-002, API-003, API-005, API-044, API-045, API-046, API-047, API-082, API-086 |
| SITE-SCR-014 | site | 내 활동 | /my/activity | screen-definitions/site/SITE-SCR-014-내-활동.md | FEA-004, FEA-005, FEA-006, FEA-012, FEA-022 | API-022, API-034, API-037, API-039, API-082, API-086 |
| SITE-SCR-015 | site | 저장한 의료진 | /my/saved-doctors | screen-definitions/site/SITE-SCR-015-저장한-의료진.md | FEA-010, FEA-012 | API-011, API-083, API-084, API-085 |
| SITE-SCR-016 | site | 고객지원 공지와 정책 콘텐츠 | /support/* | screen-definitions/site/SITE-SCR-016-고객지원-공지와-정책-콘텐츠.md | FEA-012, FEA-017, FEA-022 | API-044, API-045, API-046, API-086 |
| SITE-SCR-017 | site | 의견 보내기 | /support/feedback | screen-definitions/site/SITE-SCR-017-의견-보내기.md | FEA-012, FEA-018, FEA-022 | API-047, API-086 |
| SITE-SCR-018 | site | 통합 검색 | /search | screen-definitions/site/SITE-SCR-018-통합-검색.md | FEA-003, FEA-010, FEA-011, FEA-016, FEA-022 | API-007, API-008, API-009, API-010, API-021, API-086 |
| SITE-SCR-019 | site | 회원탈퇴 | /my/withdrawal | screen-definitions/site/SITE-SCR-019-회원탈퇴.md | FEA-002, FEA-012, FEA-022 | API-002, API-006, API-086 |
| ADMIN-SCR-001 | admin | 어드민 로그인 및 2FA | /admin/login | screen-definitions/admin/ADMIN-SCR-001-어드민-로그인-및-2fa.md | FEA-019, FEA-022 | API-087, API-088, API-089, API-090, API-091, API-092 |
| ADMIN-SCR-002 | admin | 어드민 대시보드 | /admin | screen-definitions/admin/ADMIN-SCR-002-어드민-대시보드.md | FEA-019, FEA-020, FEA-022 | API-050, API-078, API-090 |
| ADMIN-SCR-003 | admin | 사용자 관리 | /admin/users | screen-definitions/admin/ADMIN-SCR-003-사용자-관리.md | FEA-019, FEA-020, FEA-022 | API-051, API-078, API-090 |
| ADMIN-SCR-004 | admin | 의사 프로필 관리 | /admin/doctors | screen-definitions/admin/ADMIN-SCR-004-의사-프로필-관리.md | FEA-010, FEA-020, FEA-022 | API-052, API-053, API-096, API-078, API-090 |
| ADMIN-SCR-005 | admin | 의사 정보 수정 요청과 인증 관리 | /admin/doctor-requests | screen-definitions/admin/ADMIN-SCR-005-의사-정보-수정-요청과-인증-관리.md | FEA-008, FEA-009, FEA-010, FEA-020, FEA-022 | API-054, API-055, API-056, API-057, API-078, API-090 |
| ADMIN-SCR-006 | admin | 병원 방문 인증 검토 | /admin/medical-visit-verifications | screen-definitions/admin/ADMIN-SCR-006-병원-방문-인증-검토.md | FEA-007, FEA-020, FEA-022 | API-058, API-059, API-078, API-090, API-094, API-095 |
| ADMIN-SCR-007 | admin | 신고와 콘텐츠 운영 큐 | /admin/reports | screen-definitions/admin/ADMIN-SCR-007-신고와-콘텐츠-운영-큐.md | FEA-014, FEA-015, FEA-020, FEA-022 | API-060, API-061, API-062, API-063, API-078, API-090, API-097 |
| ADMIN-SCR-008 | admin | 콘텐츠 안전 규칙과 로그 | /admin/content-safety | screen-definitions/admin/ADMIN-SCR-008-콘텐츠-안전-규칙과-로그.md | FEA-015, FEA-020, FEA-022 | API-064, API-065, API-066, API-078, API-090, API-093, API-094, API-095 |
| ADMIN-SCR-009 | admin | 홈 큐레이션 관리 | /admin/home-curation | screen-definitions/admin/ADMIN-SCR-009-홈-큐레이션-관리.md | FEA-016, FEA-020, FEA-022 | API-067, API-068, API-069, API-070, API-078, API-079, API-080, API-081, API-090 |
| ADMIN-SCR-010 | admin | 고객지원과 정책 콘텐츠 관리 | /admin/support-contents | screen-definitions/admin/ADMIN-SCR-010-고객지원과-정책-콘텐츠-관리.md | FEA-017, FEA-018, FEA-020, FEA-022 | API-071, API-072, API-073, API-074, API-075, API-078, API-090 |
| ADMIN-SCR-011 | admin | 운영 정책 설정 | /admin/operational-policies | screen-definitions/admin/ADMIN-SCR-011-운영-정책-설정.md | FEA-005, FEA-006, FEA-007, FEA-013, FEA-021, FEA-022 | API-048, API-076, API-077, API-078, API-090 |
| ADMIN-SCR-012 | admin | 감사 로그와 외부 연동 로그 | /admin/logs | screen-definitions/admin/ADMIN-SCR-012-감사-로그와-외부-연동-로그.md | FEA-007, FEA-015, FEA-019, FEA-020, FEA-022, FEA-023 | API-078, API-090, API-093, API-094, API-095 |

## 4. Feature-to-Screen Mapping

| Feature | 화면 |
| --- | --- |
| FEA-001 회원 등급 및 권한 정책 | SITE-SCR-001, SITE-SCR-002, SITE-SCR-005, SITE-SCR-010, SITE-SCR-013 |
| FEA-002 인증, 로그인, 세션, SNS 계정 통합 | SITE-SCR-002, SITE-SCR-013, SITE-SCR-019 |
| FEA-003 비회원 제한, 한도, 로그인 유도 | SITE-SCR-001, SITE-SCR-002, SITE-SCR-004, SITE-SCR-005, SITE-SCR-009, SITE-SCR-011, SITE-SCR-018 |
| FEA-004 커뮤니티 피드, 글쓰기, 상세, 임시저장 | SITE-SCR-009, SITE-SCR-010, SITE-SCR-011, SITE-SCR-014 |
| FEA-005 댓글, 대댓글, 공감 인터랙션 | SITE-SCR-011, SITE-SCR-014, ADMIN-SCR-011 |
| FEA-006 의사 리뷰와 후기 작성 | SITE-SCR-005, SITE-SCR-006, SITE-SCR-014, ADMIN-SCR-011 |
| FEA-007 병원 방문 인증과 증빙 뱃지 | SITE-SCR-005, SITE-SCR-006, SITE-SCR-007, SITE-SCR-010, ADMIN-SCR-006, ADMIN-SCR-011, ADMIN-SCR-012 |
| FEA-008 의사 인증 플로우와 면허번호 검증 | SITE-SCR-008, ADMIN-SCR-005 |
| FEA-009 의사 인증 표시와 실명 전환 | SITE-SCR-005, SITE-SCR-008, SITE-SCR-010, SITE-SCR-011, ADMIN-SCR-005 |
| FEA-010 의사 프로필, 명의 찾기, 정보 수정 요청 | SITE-SCR-003, SITE-SCR-004, SITE-SCR-005, SITE-SCR-008, SITE-SCR-015, SITE-SCR-018, ADMIN-SCR-004, ADMIN-SCR-005 |
| FEA-011 통합 검색, 명의 찾기 검색, 입력 보안 | SITE-SCR-001, SITE-SCR-004, SITE-SCR-009, SITE-SCR-018 |
| FEA-012 마이페이지, 내 활동, 고객지원, 회원탈퇴 | SITE-SCR-005, SITE-SCR-013, SITE-SCR-014, SITE-SCR-015, SITE-SCR-016, SITE-SCR-017, SITE-SCR-019 |
| FEA-013 공통 UI 상태, 네비게이션, 중복 액션 방지 | SITE-SCR-001, SITE-SCR-002, SITE-SCR-003, SITE-SCR-004, SITE-SCR-013, ADMIN-SCR-011 |
| FEA-014 신고, 블라인드, 운영 처리 | SITE-SCR-005, SITE-SCR-006, SITE-SCR-009, SITE-SCR-011, SITE-SCR-012, ADMIN-SCR-007 |
| FEA-015 콘텐츠 안전 자동 차단 | SITE-SCR-006, SITE-SCR-007, SITE-SCR-009, SITE-SCR-010, SITE-SCR-011, SITE-SCR-012, ADMIN-SCR-007, ADMIN-SCR-008, ADMIN-SCR-012 |
| FEA-016 홈 운영과 사용자 홈 노출 | SITE-SCR-001, SITE-SCR-004, SITE-SCR-009, SITE-SCR-018, ADMIN-SCR-009 |
| FEA-017 공지사항과 정책 콘텐츠 관리 | SITE-SCR-001, SITE-SCR-013, SITE-SCR-016, ADMIN-SCR-010 |
| FEA-018 의견 보내기와 운영자 종결 | SITE-SCR-013, SITE-SCR-017, ADMIN-SCR-010 |
| FEA-019 어드민 공통 운영, 권한, 감사 로그 | ADMIN-SCR-001, ADMIN-SCR-002, ADMIN-SCR-003, ADMIN-SCR-012 |
| FEA-020 어드민 사용자, 의사, 콘텐츠 관리 | ADMIN-SCR-002, ADMIN-SCR-003, ADMIN-SCR-004, ADMIN-SCR-005, ADMIN-SCR-006, ADMIN-SCR-007, ADMIN-SCR-008, ADMIN-SCR-009, ADMIN-SCR-010, ADMIN-SCR-012 |
| FEA-021 운영 정책 설정 | SITE-SCR-006, SITE-SCR-010, SITE-SCR-011, ADMIN-SCR-011 |
| FEA-022 개인정보, 접근성, 분석 이벤트 | SITE-SCR-001, SITE-SCR-002, SITE-SCR-003, SITE-SCR-004, SITE-SCR-005, SITE-SCR-006, SITE-SCR-007, SITE-SCR-008, SITE-SCR-009, SITE-SCR-010, SITE-SCR-011, SITE-SCR-012, SITE-SCR-013, SITE-SCR-014, SITE-SCR-016, SITE-SCR-017, SITE-SCR-018, SITE-SCR-019, ADMIN-SCR-001, ADMIN-SCR-002, ADMIN-SCR-003, ADMIN-SCR-004, ADMIN-SCR-005, ADMIN-SCR-006, ADMIN-SCR-007, ADMIN-SCR-008, ADMIN-SCR-009, ADMIN-SCR-010, ADMIN-SCR-011, ADMIN-SCR-012 |
| FEA-023 외부 AI 채팅 REST API 연동 | SITE-SCR-001, SITE-SCR-003, ADMIN-SCR-012 |

## 5. 개발 사용 기준

- 구현 task는 화면 문서의 User Actions와 QA Cases 기준으로 분해한다.
- API client와 상태 관리는 api-definition.openapi.yaml의 operation code를 기준으로 연결한다.
- admin mutation은 감사 로그와 권한 guard를 함께 구현한다.
- 외부 AI 채팅은 API-049 REST integration까지만 다루고 내부 AI runtime 화면을 만들지 않는다.

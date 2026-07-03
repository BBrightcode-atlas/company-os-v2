# Figma 화면정의서(Figma Screen Definition) - Aiga

이 문서는 Figma MCP로 직접 확인한 화면/메타데이터를 기준으로 supplied Figma nodes를 화면별 visual/layout baseline으로 매핑한 aggregate 산출물이다.

## 1. 산출물 요약

| 항목 | 값 |
| --- | --- |
| 프로젝트 | Aiga |
| Workflow | figma-baseline |
| 화면 수 | 48 |
| 화면 인덱스 | figma-screen-definitions/figma-screen-definition-index.md |
| Coverage JSON | figma-screen-coverage.json |
| Feature mapping | 21/23 features mapped, 2 explicitly unmapped |
| API mapping | 96/97 APIs mapped |

## 2. 작성 기준

- 선행 산출물의 FEA/SCH/API 코드를 참조하고 새 계약을 만들지 않는다.
- 모든 화면은 Default, Empty, Loading, Error, Permission 상태를 검토한다.
- 모든 액션은 ACT-##, 모든 QA case는 AC-## 코드를 사용한다.
- Figma MCP screenshot/metadata에서 확인한 layout/token만 baseline으로 기록한다.

## 3. Figma MCP 확인 요약

- Figma MCP authenticated as Jisu (view seat).
- get_metadata(820:13292) returned AIGA Beta design system canvas with styleGuide, mobile frames, and PC 480px extension frames.
- get_screenshot(820:13292) original 16708x6900, rendered 4096x1692; downloaded to /tmp/aiga-figma/page-overview.png.
- Typography: Pretendard, font weights Regular 400 / Medium 500 / Bold 700; visible scale includes 14, 15, 16, 17, 18, 20, 24, 32, 40, 50, 66.
- Color: Primary blue scale primary-350 #659AFF, primary-400 #4E87F4, primary-500 #3774E8; secondary-400 #00CA80; gray-25 #FCFCFC, gray-50 #F6F6F6, gray-700 #333D4B; accent-500 #DC2525; info-50 #FFF9EA.

## 4. 화면 목록

| 화면 코드 | Surface | 화면명 | Route | 문서 | Feature | API |
| --- | --- | --- | --- | --- | --- | --- |
| SITE-SCR-001 | site | home | / | figma-screen-definitions/site/SITE-SCR-001-home.md | FEA-001, FEA-003, FEA-011, FEA-013, FEA-016, FEA-017, FEA-022, FEA-023 | API-001, API-007, API-008, API-009, API-010, API-033, API-043, API-049, API-086 |
| SITE-SCR-002 | site | home-환자ㆍ의사ㆍAI가 뽑은 베스트 닥터 - 추가설명 | / | figma-screen-definitions/site/SITE-SCR-002-home-환자ㆍ의사ㆍai가-뽑은-베스트-닥터---추가설명.md | FEA-001, FEA-003, FEA-011, FEA-013, FEA-016, FEA-017, FEA-022, FEA-023 | API-001, API-007, API-008, API-009, API-010, API-033, API-043, API-049, API-086 |
| SITE-SCR-003 | site | home-검색 제한 안내: 1회 | / | figma-screen-definitions/site/SITE-SCR-003-home-검색-제한-안내-1회.md | FEA-001, FEA-003, FEA-011, FEA-013, FEA-016, FEA-017, FEA-022, FEA-023 | API-001, API-007, API-008, API-009, API-010, API-033, API-043, API-049, API-086 |
| SITE-SCR-004 | site | home-검색 제한 안내: 소진 | / | figma-screen-definitions/site/SITE-SCR-004-home-검색-제한-안내-소진.md | FEA-001, FEA-003, FEA-011, FEA-013, FEA-016, FEA-017, FEA-022, FEA-023 | API-001, API-007, API-008, API-009, API-010, API-033, API-043, API-049, API-086 |
| SITE-SCR-005 | site | 챗봇-웰컴 | /aiga | figma-screen-definitions/site/SITE-SCR-005-챗봇-웰컴.md | FEA-023, FEA-010, FEA-022 | API-049, API-086 |
| SITE-SCR-006 | site | 챗봇-대화 | /aiga | figma-screen-definitions/site/SITE-SCR-006-챗봇-대화.md | FEA-023, FEA-010, FEA-022 | API-049, API-086 |
| SITE-SCR-007 | site | 챗봇-대화목록 | /aiga | figma-screen-definitions/site/SITE-SCR-007-챗봇-대화목록.md | FEA-023, FEA-010, FEA-022 | API-049, API-086 |
| SITE-SCR-008 | site | 의사 보기 | /doctors/:doctorProfileId | figma-screen-definitions/site/SITE-SCR-008-의사-보기.md | FEA-003, FEA-006, FEA-007, FEA-009, FEA-010, FEA-012, FEA-014, FEA-022 | API-007, API-011, API-012, API-034, API-038, API-039, API-040, API-041, API-042, API-084, API-085 |
| SITE-SCR-009 | site | 명의 찾기 | /doctors | figma-screen-definitions/site/SITE-SCR-009-명의-찾기.md | FEA-003, FEA-010, FEA-011, FEA-016, FEA-022 | API-007, API-008, API-009, API-010, API-011, API-083, API-084, API-085 |
| SITE-SCR-010 | site | 명의 찾기-검색 | /doctors | figma-screen-definitions/site/SITE-SCR-010-명의-찾기-검색.md | FEA-003, FEA-010, FEA-011, FEA-016, FEA-022 | API-007, API-008, API-009, API-010, API-011, API-083, API-084, API-085 |
| SITE-SCR-011 | site | 명의 찾기-검색결과 없음 | /doctors | figma-screen-definitions/site/SITE-SCR-011-명의-찾기-검색결과-없음.md | FEA-003, FEA-010, FEA-011, FEA-016, FEA-022 | API-007, API-008, API-009, API-010, API-011, API-083, API-084, API-085 |
| SITE-SCR-012 | site | 리뷰 쓰기 | /doctors/:doctorProfileId/reviews/new | figma-screen-definitions/site/SITE-SCR-012-리뷰-쓰기.md | FEA-006, FEA-007, FEA-015, FEA-021, FEA-022 | API-018, API-019, API-035, API-079, API-080, API-081 |
| SITE-SCR-013 | site | 병원진료인증 | /medical-visit-verifications/new | figma-screen-definitions/site/SITE-SCR-013-병원진료인증.md | FEA-007, FEA-015, FEA-022 | API-018, API-019, API-079, API-080, API-081 |
| SITE-SCR-014 | site | 의사 본인 인증#1 | /doctor-verification | figma-screen-definitions/site/SITE-SCR-014-의사-본인-인증-1.md | FEA-008, FEA-009, FEA-010, FEA-022 | API-013, API-014, API-015, API-016, API-017 |
| SITE-SCR-015 | site | 의사 본인 인증#2 | /doctor-verification | figma-screen-definitions/site/SITE-SCR-015-의사-본인-인증-2.md | FEA-008, FEA-009, FEA-010, FEA-022 | API-013, API-014, API-015, API-016, API-017 |
| SITE-SCR-016 | site | 의사 본인 인증#3 | /doctor-verification | figma-screen-definitions/site/SITE-SCR-016-의사-본인-인증-3.md | FEA-008, FEA-009, FEA-010, FEA-022 | API-013, API-014, API-015, API-016, API-017 |
| SITE-SCR-017 | site | 의사 전체 보기 목록 | /doctors | figma-screen-definitions/site/SITE-SCR-017-의사-전체-보기-목록.md | FEA-003, FEA-010, FEA-011, FEA-016, FEA-022 | API-007, API-008, API-009, API-010, API-011, API-083, API-084, API-085 |
| SITE-SCR-018 | site | 의사 전체 보기 목록 - 에러 | /doctors | figma-screen-definitions/site/SITE-SCR-018-의사-전체-보기-목록---에러.md | FEA-003, FEA-010, FEA-011, FEA-016, FEA-022 | API-007, API-008, API-009, API-010, API-011, API-083, API-084, API-085 |
| SITE-SCR-019 | site | 커뮤니티-메인 | /community | figma-screen-definitions/site/SITE-SCR-019-커뮤니티-메인.md | FEA-003, FEA-004, FEA-011, FEA-014, FEA-015, FEA-016, FEA-022 | API-007, API-008, API-009, API-020, API-021, API-033 |
| SITE-SCR-020 | site | 커뮤니티-메인-검색01 | /community | figma-screen-definitions/site/SITE-SCR-020-커뮤니티-메인-검색01.md | FEA-003, FEA-004, FEA-011, FEA-014, FEA-015, FEA-016, FEA-022 | API-007, API-008, API-009, API-020, API-021, API-033 |
| SITE-SCR-021 | site | 커뮤니티-메인-검색01-chip | /community | figma-screen-definitions/site/SITE-SCR-021-커뮤니티-메인-검색01-chip.md | FEA-003, FEA-004, FEA-011, FEA-014, FEA-015, FEA-016, FEA-022 | API-007, API-008, API-009, API-020, API-021, API-033 |
| SITE-SCR-022 | site | 커뮤니티 글쓰기 | /community/posts/new | figma-screen-definitions/site/SITE-SCR-022-커뮤니티-글쓰기.md | FEA-001, FEA-004, FEA-007, FEA-009, FEA-015, FEA-021, FEA-022 | API-018, API-019, API-023, API-024, API-079, API-080, API-081 |
| SITE-SCR-023 | site | 커뮤니티 글쓰기-검색01 | /community/posts/new | figma-screen-definitions/site/SITE-SCR-023-커뮤니티-글쓰기-검색01.md | FEA-001, FEA-004, FEA-007, FEA-009, FEA-015, FEA-021, FEA-022 | API-018, API-019, API-023, API-024, API-079, API-080, API-081 |
| SITE-SCR-024 | site | 커뮤니티 글쓰기-검색02 | /community/posts/new | figma-screen-definitions/site/SITE-SCR-024-커뮤니티-글쓰기-검색02.md | FEA-001, FEA-004, FEA-007, FEA-009, FEA-015, FEA-021, FEA-022 | API-018, API-019, API-023, API-024, API-079, API-080, API-081 |
| SITE-SCR-025 | site | 커뮤니티 글쓰기-검색-진료과 수동 선택 | /community/posts/new | figma-screen-definitions/site/SITE-SCR-025-커뮤니티-글쓰기-검색-진료과-수동-선택.md | FEA-001, FEA-004, FEA-007, FEA-009, FEA-015, FEA-021, FEA-022 | API-018, API-019, API-023, API-024, API-079, API-080, API-081 |
| SITE-SCR-026 | site | 커뮤니티 글쓰기-검색-진료과 자동 선택 | /community/posts/new | figma-screen-definitions/site/SITE-SCR-026-커뮤니티-글쓰기-검색-진료과-자동-선택.md | FEA-001, FEA-004, FEA-007, FEA-009, FEA-015, FEA-021, FEA-022 | API-018, API-019, API-023, API-024, API-079, API-080, API-081 |
| SITE-SCR-027 | site | 게시글 신고 | /reports/new | figma-screen-definitions/site/SITE-SCR-027-게시글-신고.md | FEA-014, FEA-015, FEA-022 | API-032, API-038 |
| SITE-SCR-028 | site | 커뮤니티 보기 | /community/posts/:postId | figma-screen-definitions/site/SITE-SCR-028-커뮤니티-보기.md | FEA-003, FEA-004, FEA-005, FEA-009, FEA-014, FEA-015, FEA-021, FEA-022 | API-022, API-025, API-026, API-027, API-028, API-029, API-030, API-031, API-032 |
| SITE-SCR-029 | site | 마이페이지-내 활동-게시글 | /my/activity | figma-screen-definitions/site/SITE-SCR-029-마이페이지-내-활동-게시글.md | FEA-004, FEA-012, FEA-022 | API-002, API-022, API-082, API-086 |
| SITE-SCR-030 | site | 마이페이지-의사 인증 | /doctor-verification | figma-screen-definitions/site/SITE-SCR-030-마이페이지-의사-인증.md | FEA-008, FEA-009, FEA-010, FEA-022 | API-013, API-014, API-015, API-016, API-017 |
| SITE-SCR-031 | site | 의사 프로필 편집 | /my/doctor-profile/edit | figma-screen-definitions/site/SITE-SCR-031-의사-프로필-편집.md | FEA-008, FEA-009, FEA-010, FEA-012, FEA-022 | API-002, API-011, API-012, API-017, API-079, API-080, API-081, API-086 |
| SITE-SCR-032 | site | 마이페이지-내 활동-댓글 | /my/activity | figma-screen-definitions/site/SITE-SCR-032-마이페이지-내-활동-댓글.md | FEA-005, FEA-012, FEA-022 | API-026, API-039, API-082, API-086 |
| SITE-SCR-033 | site | 마이페이지-내 활동-후기 | /my/activity | figma-screen-definitions/site/SITE-SCR-033-마이페이지-내-활동-후기.md | FEA-006, FEA-012, FEA-022 | API-034, API-037, API-082, API-086 |
| SITE-SCR-034 | site | 마이페이지-내 활동-저장 | /my/saved-doctors | figma-screen-definitions/site/SITE-SCR-034-마이페이지-내-활동-저장.md | FEA-010, FEA-012 | API-083, API-084, API-085 |
| SITE-SCR-035 | site | 마이페이지-더보기 | /my/more | figma-screen-definitions/site/SITE-SCR-035-마이페이지-더보기.md | FEA-001, FEA-002, FEA-012, FEA-017, FEA-018, FEA-022 | API-001, API-002, API-005, API-006, API-044, API-045, API-046, API-047, API-086 |
| SITE-SCR-036 | site | 공지사항-목록 | /support/notices | figma-screen-definitions/site/SITE-SCR-036-공지사항-목록.md | FEA-012, FEA-017, FEA-022 | API-044, API-045, API-086 |
| SITE-SCR-037 | site | 공지사항-보기 | /support/notices | figma-screen-definitions/site/SITE-SCR-037-공지사항-보기.md | FEA-012, FEA-017, FEA-022 | API-044, API-045, API-086 |
| SITE-SCR-038 | site | 의견 보내기 | /support/feedback | figma-screen-definitions/site/SITE-SCR-038-의견-보내기.md | FEA-012, FEA-018, FEA-022 | API-047, API-086 |
| SITE-SCR-039 | site | 이용약관 | /support/policies/:contentType | figma-screen-definitions/site/SITE-SCR-039-이용약관.md | FEA-017, FEA-022 | API-046, API-086 |
| SITE-SCR-040 | site | 개인정보처리방침 | /support/policies/:contentType | figma-screen-definitions/site/SITE-SCR-040-개인정보처리방침.md | FEA-017, FEA-022 | API-046, API-086 |
| SITE-SCR-041 | site | 위치 기반 서비스 이용약관 | /support/policies/:contentType | figma-screen-definitions/site/SITE-SCR-041-위치-기반-서비스-이용약관.md | FEA-017, FEA-022 | API-046, API-086 |
| SITE-SCR-042 | site | 위치 기반 서비스 이용약관 | /support/policies/:contentType | figma-screen-definitions/site/SITE-SCR-042-위치-기반-서비스-이용약관.md | FEA-017, FEA-022 | API-046, API-086 |
| SITE-SCR-043 | site | 통합 검색 | /search | figma-screen-definitions/site/SITE-SCR-043-통합-검색.md | FEA-003, FEA-010, FEA-011, FEA-016, FEA-022 | API-007, API-008, API-009, API-010, API-021, API-086 |
| SITE-SCR-044 | site | 통합 검색 | /search | figma-screen-definitions/site/SITE-SCR-044-통합-검색.md | FEA-003, FEA-010, FEA-011, FEA-016, FEA-022 | API-007, API-008, API-009, API-010, API-021, API-086 |
| SITE-SCR-045 | site | 통합 검색 | /search | figma-screen-definitions/site/SITE-SCR-045-통합-검색.md | FEA-003, FEA-010, FEA-011, FEA-016, FEA-022 | API-007, API-008, API-009, API-010, API-021, API-086 |
| SITE-SCR-046 | site | 통합 검색-검색결과 없음 | /search | figma-screen-definitions/site/SITE-SCR-046-통합-검색-검색결과-없음.md | FEA-003, FEA-010, FEA-011, FEA-016, FEA-022 | API-007, API-008, API-009, API-010, API-021, API-086 |
| SITE-SCR-047 | site | 통합 검색-검색 결과-명의 | /doctors | figma-screen-definitions/site/SITE-SCR-047-통합-검색-검색-결과-명의.md | FEA-003, FEA-010, FEA-011, FEA-016, FEA-022 | API-007, API-008, API-009, API-010, API-011, API-083, API-084, API-085 |
| SITE-SCR-048 | site | 통합 검색-검색 결과-커뮤니티 | /community | figma-screen-definitions/site/SITE-SCR-048-통합-검색-검색-결과-커뮤니티.md | FEA-003, FEA-004, FEA-011, FEA-014, FEA-015, FEA-016, FEA-022 | API-007, API-008, API-009, API-020, API-021, API-033 |

## 5. Feature-to-Screen Mapping

| Feature | 화면 |
| --- | --- |
| FEA-001 회원 등급 및 권한 정책 | SITE-SCR-001, SITE-SCR-002, SITE-SCR-003, SITE-SCR-004, SITE-SCR-022, SITE-SCR-023, SITE-SCR-024, SITE-SCR-025, SITE-SCR-026, SITE-SCR-035 |
| FEA-002 인증, 로그인, 세션, SNS 계정 통합 | SITE-SCR-035 |
| FEA-003 비회원 제한, 한도, 로그인 유도 | SITE-SCR-001, SITE-SCR-002, SITE-SCR-003, SITE-SCR-004, SITE-SCR-008, SITE-SCR-009, SITE-SCR-010, SITE-SCR-011, SITE-SCR-017, SITE-SCR-018, SITE-SCR-019, SITE-SCR-020, SITE-SCR-021, SITE-SCR-028, SITE-SCR-043, SITE-SCR-044, SITE-SCR-045, SITE-SCR-046, SITE-SCR-047, SITE-SCR-048 |
| FEA-004 커뮤니티 피드, 글쓰기, 상세, 임시저장 | SITE-SCR-019, SITE-SCR-020, SITE-SCR-021, SITE-SCR-022, SITE-SCR-023, SITE-SCR-024, SITE-SCR-025, SITE-SCR-026, SITE-SCR-028, SITE-SCR-029, SITE-SCR-048 |
| FEA-005 댓글, 대댓글, 공감 인터랙션 | SITE-SCR-028, SITE-SCR-032 |
| FEA-006 의사 리뷰와 후기 작성 | SITE-SCR-008, SITE-SCR-012, SITE-SCR-033 |
| FEA-007 병원 방문 인증과 증빙 뱃지 | SITE-SCR-008, SITE-SCR-012, SITE-SCR-013, SITE-SCR-022, SITE-SCR-023, SITE-SCR-024, SITE-SCR-025, SITE-SCR-026 |
| FEA-008 의사 인증 플로우와 면허번호 검증 | SITE-SCR-014, SITE-SCR-015, SITE-SCR-016, SITE-SCR-030, SITE-SCR-031 |
| FEA-009 의사 인증 표시와 실명 전환 | SITE-SCR-008, SITE-SCR-014, SITE-SCR-015, SITE-SCR-016, SITE-SCR-022, SITE-SCR-023, SITE-SCR-024, SITE-SCR-025, SITE-SCR-026, SITE-SCR-028, SITE-SCR-030, SITE-SCR-031 |
| FEA-010 의사 프로필, 명의 찾기, 정보 수정 요청 | SITE-SCR-005, SITE-SCR-006, SITE-SCR-007, SITE-SCR-008, SITE-SCR-009, SITE-SCR-010, SITE-SCR-011, SITE-SCR-014, SITE-SCR-015, SITE-SCR-016, SITE-SCR-017, SITE-SCR-018, SITE-SCR-030, SITE-SCR-031, SITE-SCR-034, SITE-SCR-043, SITE-SCR-044, SITE-SCR-045, SITE-SCR-046, SITE-SCR-047 |
| FEA-011 통합 검색, 명의 찾기 검색, 입력 보안 | SITE-SCR-001, SITE-SCR-002, SITE-SCR-003, SITE-SCR-004, SITE-SCR-009, SITE-SCR-010, SITE-SCR-011, SITE-SCR-017, SITE-SCR-018, SITE-SCR-019, SITE-SCR-020, SITE-SCR-021, SITE-SCR-043, SITE-SCR-044, SITE-SCR-045, SITE-SCR-046, SITE-SCR-047, SITE-SCR-048 |
| FEA-012 마이페이지, 내 활동, 고객지원, 회원탈퇴 | SITE-SCR-008, SITE-SCR-029, SITE-SCR-031, SITE-SCR-032, SITE-SCR-033, SITE-SCR-034, SITE-SCR-035, SITE-SCR-036, SITE-SCR-037, SITE-SCR-038 |
| FEA-013 공통 UI 상태, 네비게이션, 중복 액션 방지 | SITE-SCR-001, SITE-SCR-002, SITE-SCR-003, SITE-SCR-004 |
| FEA-014 신고, 블라인드, 운영 처리 | SITE-SCR-008, SITE-SCR-019, SITE-SCR-020, SITE-SCR-021, SITE-SCR-027, SITE-SCR-028, SITE-SCR-048 |
| FEA-015 콘텐츠 안전 자동 차단 | SITE-SCR-012, SITE-SCR-013, SITE-SCR-019, SITE-SCR-020, SITE-SCR-021, SITE-SCR-022, SITE-SCR-023, SITE-SCR-024, SITE-SCR-025, SITE-SCR-026, SITE-SCR-027, SITE-SCR-028, SITE-SCR-048 |
| FEA-016 홈 운영과 사용자 홈 노출 | SITE-SCR-001, SITE-SCR-002, SITE-SCR-003, SITE-SCR-004, SITE-SCR-009, SITE-SCR-010, SITE-SCR-011, SITE-SCR-017, SITE-SCR-018, SITE-SCR-019, SITE-SCR-020, SITE-SCR-021, SITE-SCR-043, SITE-SCR-044, SITE-SCR-045, SITE-SCR-046, SITE-SCR-047, SITE-SCR-048 |
| FEA-017 공지사항과 정책 콘텐츠 관리 | SITE-SCR-001, SITE-SCR-002, SITE-SCR-003, SITE-SCR-004, SITE-SCR-035, SITE-SCR-036, SITE-SCR-037, SITE-SCR-039, SITE-SCR-040, SITE-SCR-041, SITE-SCR-042 |
| FEA-018 의견 보내기와 운영자 종결 | SITE-SCR-035, SITE-SCR-038 |
| FEA-021 운영 정책 설정 | SITE-SCR-012, SITE-SCR-022, SITE-SCR-023, SITE-SCR-024, SITE-SCR-025, SITE-SCR-026, SITE-SCR-028 |
| FEA-022 개인정보, 접근성, 분석 이벤트 | SITE-SCR-001, SITE-SCR-002, SITE-SCR-003, SITE-SCR-004, SITE-SCR-005, SITE-SCR-006, SITE-SCR-007, SITE-SCR-008, SITE-SCR-009, SITE-SCR-010, SITE-SCR-011, SITE-SCR-012, SITE-SCR-013, SITE-SCR-014, SITE-SCR-015, SITE-SCR-016, SITE-SCR-017, SITE-SCR-018, SITE-SCR-019, SITE-SCR-020, SITE-SCR-021, SITE-SCR-022, SITE-SCR-023, SITE-SCR-024, SITE-SCR-025, SITE-SCR-026, SITE-SCR-027, SITE-SCR-028, SITE-SCR-029, SITE-SCR-030, SITE-SCR-031, SITE-SCR-032, SITE-SCR-033, SITE-SCR-035, SITE-SCR-036, SITE-SCR-037, SITE-SCR-038, SITE-SCR-039, SITE-SCR-040, SITE-SCR-041, SITE-SCR-042, SITE-SCR-043, SITE-SCR-044, SITE-SCR-045, SITE-SCR-046, SITE-SCR-047, SITE-SCR-048 |
| FEA-023 외부 AI 채팅 REST API 연동 | SITE-SCR-001, SITE-SCR-002, SITE-SCR-003, SITE-SCR-004, SITE-SCR-005, SITE-SCR-006, SITE-SCR-007 |

## 명시적 미매핑 기능

| Feature | 사유 |
| --- | --- |
| FEA-019 | 공급된 Figma site/mobile node 목록에 독립 화면이 없다. feature-centered 화면정의서에서 구현 화면으로 매핑한다. |
| FEA-020 | 공급된 Figma site/mobile node 목록에 독립 화면이 없다. feature-centered 화면정의서에서 구현 화면으로 매핑한다. |

## 6. Figma Node Mapping

| 화면 코드 | Figma node | URL |
| --- | --- | --- |
| SITE-SCR-001 | home (4390:12656) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-12656&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-002 | home-환자ㆍ의사ㆍAI가 뽑은 베스트 닥터 - 추가설명 (4390:12799) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-12799&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-003 | home-검색 제한 안내: 1회 (4390:12858) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-12858&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-004 | home-검색 제한 안내: 소진 (4390:12920) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-12920&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-005 | 챗봇-웰컴 (4390:12977) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-12977&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-006 | 챗봇-대화 (4390:13007) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13007&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-007 | 챗봇-대화목록 (4390:12990) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-12990&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-008 | 의사 보기 (4390:13084) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13084&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-009 | 명의 찾기 (4390:13162) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13162&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-010 | 명의 찾기-검색 (4390:13245) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13245&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-011 | 명의 찾기-검색결과 없음 (4390:13213) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13213&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-012 | 리뷰 쓰기 (4390:13251) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13251&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-013 | 병원진료인증 (4390:13314) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13314&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-014 | 의사 본인 인증#1 (4390:13333) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13333&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-015 | 의사 본인 인증#2 (4390:13358) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13358&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-016 | 의사 본인 인증#3 (4390:13384) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13384&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-017 | 의사 전체 보기 목록 (4390:13419) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13419&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-018 | 의사 전체 보기 목록 - 에러 (4390:13454) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13454&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-019 | 커뮤니티-메인 (4390:13571) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13571&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-020 | 커뮤니티-메인-검색01 (4390:13467) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13467&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-021 | 커뮤니티-메인-검색01-chip (4390:13515) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13515&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-022 | 커뮤니티 글쓰기 (4390:13649) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13649&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-023 | 커뮤니티 글쓰기-검색01 (4390:13739) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13739&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-024 | 커뮤니티 글쓰기-검색02 (4390:13745) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13745&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-025 | 커뮤니티 글쓰기-검색-진료과 수동 선택 (4390:13672) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13672&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-026 | 커뮤니티 글쓰기-검색-진료과 자동 선택 (4390:13716) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13716&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-027 | 게시글 신고 (4390:13293) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13293&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-028 | 커뮤니티 보기 (4390:13751) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13751&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-029 | 마이페이지-내 활동-게시글 (4390:13807) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13807&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-030 | 마이페이지-의사 인증 (4390:13947) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13947&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-031 | 의사 프로필 편집 (4390:14001) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-14001&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-032 | 마이페이지-내 활동-댓글 (4390:14121) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-14121&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-033 | 마이페이지-내 활동-후기 (4390:14142) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-14142&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-034 | 마이페이지-내 활동-저장 (4390:14188) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-14188&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-035 | 마이페이지-더보기 (4390:14206) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-14206&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-036 | 공지사항-목록 (4390:14036) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-14036&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-037 | 공지사항-보기 (4390:14049) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-14049&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-038 | 의견 보내기 (4390:14064) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-14064&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-039 | 이용약관 (4390:14071) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-14071&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-040 | 개인정보처리방침 (4390:14086) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-14086&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-041 | 위치 기반 서비스 이용약관 (4390:14076) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-14076&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-042 | 위치 기반 서비스 이용약관 (4390:14081) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-14081&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-043 | 통합 검색 (4390:13877) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13877&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-044 | 통합 검색 (4390:13922) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13922&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-045 | 통합 검색 (4390:13931) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13931&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-046 | 통합 검색-검색결과 없음 (4390:13940) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13940&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-047 | 통합 검색-검색 결과-명의 (4390:13886) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13886&t=OWrLX26n9Z69PyHu-4 |
| SITE-SCR-048 | 통합 검색-검색 결과-커뮤니티 (4390:13903) | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13903&t=OWrLX26n9Z69PyHu-4 |

## 7. 개발 사용 기준

- 이 aggregate는 Figma node coverage와 visual baseline 확인용이다.
- 세부 구현 task와 API 상태 검증은 screen-definition.md를 함께 참조한다.
- 구현 전 동일 Figma node에서 asset export를 다시 확인한다.

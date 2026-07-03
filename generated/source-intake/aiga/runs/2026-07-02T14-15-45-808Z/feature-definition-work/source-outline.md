# Feature Analysis Source Outline - aiga

Source material: generated/source-intake/aiga/runs/2026-07-02T14-15-45-808Z/source-material.md

| Chunk | Lines | Level | Heading Path | Candidate Tags | Area Hints |
| --- | --- | --- | --- | --- | --- |
| CH-001 | 37-38 | H1 | Aiga 정책·화면정의서 (외주) | common-system | server, app |
| CH-002 | 39-42 | H2 | Aiga 정책·화면정의서 (외주) > 📦 외주 개발사 전달용 정책·화면정의서 패키지 | common-system | server, app |
| CH-003 | 43-50 | H3 | Aiga 정책·화면정의서 (외주) > 📦 외주 개발사 전달용 정책·화면정의서 패키지 > 포함 문서 | auth-membership, common-system | server, app |
| CH-004 | 51-56 | H1 | 사용자 등급별 정책 화면정의서 v1.0(외주) | common-system | server, app |
| CH-005 | 57-68 | H1 | 0. 사용자 등급 정의 | auth-membership, doctor-verification, community-post, review, common-system, analytics-privacy-accessibility | server, app, ai-runtime |
| CH-006 | 69-70 | H1 | 1. 게시글 정책 | community-post, common-system | server |
| CH-007 | 71-83 | H2 | 1. 게시글 정책 > 1-1. 등급별 권한 | auth-membership, doctor-verification, community-post, visit-verification, moderation-reporting | server |
| CH-008 | 84-87 | H3 | 1. 게시글 정책 > 1-1. 등급별 권한 > 1-1-1. 비회원 권한 제한 시 공통 UX | auth-membership, community-post, review, moderation-reporting, ui-feedback | server, app |
| CH-009 | 88-94 | H3 | 1. 게시글 정책 > 1-1. 등급별 권한 > 1-1-2. 비회원 게시글 열람 제한 (상세 진입 기준) | auth-membership, community-post, search, ui-feedback, analytics-privacy-accessibility | server, app |
| CH-010 | 95-104 | H3 | 1. 게시글 정책 > 1-1. 등급별 권한 > 1-1-3. 작성 정책 (컨텐츠 유형별) | community-post, review, common-system | server, app |
| CH-011 | 105-108 | H2 | 1. 게시글 정책 > 1-2. 수정 정책 | moderation-reporting, common-system | admin, server |
| CH-012 | 109-120 | H3 | 1. 게시글 정책 > 1-2. 수정 정책 > 1-2-A. 게시글 수정 | community-post, visit-verification, moderation-reporting, ui-feedback, common-system | admin, server, app |
| CH-013 | 121-129 | H3 | 1. 게시글 정책 > 1-2. 수정 정책 > 1-2-B. 댓글/대댓글 수정 | auth-membership, doctor-verification, community-post, moderation-reporting, common-system | admin, server |
| CH-014 | 130-133 | H2 | 1. 게시글 정책 > 1-3. 삭제 정책 | community-post, moderation-reporting, ui-feedback, common-system | admin, server, app |
| CH-015 | 134-143 | H3 | 1. 게시글 정책 > 1-3. 삭제 정책 > 1-3-A. 게시글 삭제 | community-post, moderation-reporting, ui-feedback, common-system | admin, server, app |
| CH-016 | 144-153 | H3 | 1. 게시글 정책 > 1-3. 삭제 정책 > 1-3-B. 댓글/대댓글 삭제 (커뮤니티 게시글 · 리뷰 공통) | community-post, review, moderation-reporting, common-system | admin, server, app |
| CH-017 | 154-163 | H2 | 1. 게시글 정책 > 1-4. 의사 인증 회원 전용 정책 | auth-membership, doctor-verification, community-post, review, common-system | server, app |
| CH-018 | 164-165 | H1 | 2. 리뷰 정책 (의사 프로필) | review, common-system | server, app |
| CH-019 | 166-179 | H2 | 2. 리뷰 정책 (의사 프로필) > 2-1. 등급별 권한 | auth-membership, doctor-verification, community-post, review, visit-verification, moderation-reporting, common-system | server, app |
| CH-020 | 180-189 | H2 | 2. 리뷰 정책 (의사 프로필) > 2-2. 수정 정책 | review, moderation-reporting, common-system | admin, server |
| CH-021 | 190-205 | H2 | 2. 리뷰 정책 (의사 프로필) > 2-3. 삭제 정책 | auth-membership, doctor-verification, community-post, review, moderation-reporting, ui-feedback, common-system | admin, server, app |
| CH-022 | 206-209 | H1 | 3. 병원 방문 인증 정책 (진료 인증) | visit-verification, ui-feedback, common-system | server, app |
| CH-023 | 210-218 | H2 | 3. 병원 방문 인증 정책 (진료 인증) > 3-1. 인증 흐름 (초기 서비스) | community-post, review, visit-verification, ui-feedback | server, app |
| CH-024 | 219-229 | H3 | 3. 병원 방문 인증 정책 (진료 인증) > 3-1. 인증 흐름 (초기 서비스) > OCR 실패 안내 팝업 | community-post, review, visit-verification, ui-feedback, common-system | server, app |
| CH-025 | 230-238 | H2 | 3. 병원 방문 인증 정책 (진료 인증) > 3-2. 인증 조건 | community-post, review, visit-verification | server |
| CH-026 | 239-248 | H2 | 3. 병원 방문 인증 정책 (진료 인증) > 3-3. 최초 등록 시 | community-post, review, visit-verification, search, common-system | server |
| CH-027 | 249-258 | H2 | 3. 병원 방문 인증 정책 (진료 인증) > 3-4. 수정 시 | community-post, review, visit-verification, ui-feedback, common-system | server, app |
| CH-028 | 259-267 | H2 | 3. 병원 방문 인증 정책 (진료 인증) > 3-5. 삭제 시 | community-post, review, moderation-reporting, common-system | server |
| CH-029 | 268-271 | H1 | 4. 신고 정책 | auth-membership, moderation-reporting, common-system | server |
| CH-030 | 272-278 | H2 | 4. 신고 정책 > 4-1. 등급별 권한 | auth-membership, doctor-verification, community-post, moderation-reporting | server |
| CH-031 | 279-285 | H2 | 4. 신고 정책 > 4-2. 신고 사유 | community-post, moderation-reporting, analytics-privacy-accessibility | - |
| CH-032 | 286-296 | H2 | 4. 신고 정책 > 4-3. 신고 처리 | auth-membership, moderation-reporting, ui-feedback, common-system | admin, server, app |
| CH-033 | 297-298 | H1 | 5. 공통 정책 요약 | common-system | server, ai-runtime |
| CH-034 | 299-304 | H2 | 5. 공통 정책 요약 > 5-0. 수정·삭제 기간 운영 정책 (SSOT) | moderation-reporting, common-system | admin, server |
| CH-035 | 305-317 | H3 | 5. 공통 정책 요약 > 5-0. 수정·삭제 기간 운영 정책 (SSOT) > 설계 요구사항 | community-post, review, moderation-reporting, ui-feedback, common-system | admin, server, app |
| CH-036 | 318-324 | H3 | 5. 공통 정책 요약 > 5-0. 수정·삭제 기간 운영 정책 (SSOT) > 별도 적용 정책 (원칙 제외) | community-post, review, moderation-reporting, common-system | server |
| CH-037 | 325-328 | H3 | 5. 공통 정책 요약 > 5-0. 수정·삭제 기간 운영 정책 (SSOT) > 추가 주의 (인증 정책과의 상호작용) | common-system | admin, server |
| CH-038 | 329-345 | H2 | 5. 공통 정책 요약 > 5-1. 기타 공통 정책 | auth-membership, community-post, review, moderation-reporting, search, common-system | admin, server, app |
| CH-039 | 346-347 | H1 | 화면 공통 정책 가이드 v1.0(외주) | common-system | server, app |
| CH-040 | 348-360 | H1 | 화면 공통 정책 가이드 | community-post, review, common-system | server, app |
| CH-041 | 361-362 | H3 | 화면 공통 정책 가이드 > 📑 목차 | - | - |
| CH-042 | 363-364 | H2 | 화면 공통 정책 가이드 > 1) 공통 API/상태 처리 정책 | common-system | server |
| CH-043 | 365-370 | H3 | 화면 공통 정책 가이드 > 1) 공통 API/상태 처리 정책 > [공통 API 응답 상태] | search, ui-feedback, common-system | server, app |
| CH-044 | 371-383 | H3 | 화면 공통 정책 가이드 > 1) 공통 API/상태 처리 정책 > [공통 API 오류 코드 대응] | auth-membership, moderation-reporting, ui-feedback, common-system, analytics-privacy-accessibility | server, app |
| CH-045 | 384-385 | H2 | 화면 공통 정책 가이드 > 2) 목록/정렬/페이지네이션 정책 | search, common-system | server |
| CH-046 | 386-391 | H3 | 화면 공통 정책 가이드 > 2) 목록/정렬/페이지네이션 정책 > [페이지네이션] | community-post, search, mypage-support, common-system | app |
| CH-047 | 392-398 | H3 | 화면 공통 정책 가이드 > 2) 목록/정렬/페이지네이션 정책 > [정렬/필터] | community-post, search | server, app |
| CH-048 | 399-400 | H2 | 화면 공통 정책 가이드 > 3) 인증/세션/회원 전환 정책 | auth-membership, common-system | server |
| CH-049 | 401-405 | H3 | 화면 공통 정책 가이드 > 3) 인증/세션/회원 전환 정책 > [세션 복원/만료] | auth-membership, ui-feedback, common-system, analytics-privacy-accessibility | app |
| CH-050 | 406-412 | H3 | 화면 공통 정책 가이드 > 3) 인증/세션/회원 전환 정책 > [SNS 계정 통합] | auth-membership, mypage-support, ui-feedback | server, app |
| CH-051 | 413-414 | H2 | 화면 공통 정책 가이드 > 4) 커뮤니티/마이페이지 운영 정책 보강 | community-post, moderation-reporting, mypage-support, common-system | admin, server, app |
| CH-052 | 415-419 | H3 | 화면 공통 정책 가이드 > 4) 커뮤니티/마이페이지 운영 정책 보강 > [신고 처리 상태 노출] | moderation-reporting, ui-feedback, common-system | admin, app |
| CH-053 | 420-426 | H3 | 화면 공통 정책 가이드 > 4) 커뮤니티/마이페이지 운영 정책 보강 > [동시성/정합성] | community-post, review, moderation-reporting, ui-feedback, common-system | server, app |
| CH-054 | 427-428 | H2 | 화면 공통 정책 가이드 > 5) 검색 정책 보강 (통합검색/명의찾기) | search, common-system | server |
| CH-055 | 429-433 | H3 | 화면 공통 정책 가이드 > 5) 검색 정책 보강 (통합검색/명의찾기) > [검색어 처리] | search, common-system | server |
| CH-056 | 434-440 | H3 | 화면 공통 정책 가이드 > 5) 검색 정책 보강 (통합검색/명의찾기) > [검색 결과 노출] | community-post, search | app, ai-runtime |
| CH-057 | 441-442 | H2 | 화면 공통 정책 가이드 > 6) 접근성/개인정보/분석 이벤트 | analytics-privacy-accessibility | - |
| CH-058 | 443-447 | H3 | 화면 공통 정책 가이드 > 6) 접근성/개인정보/분석 이벤트 > [접근성] | moderation-reporting, search, ui-feedback, analytics-privacy-accessibility | app |
| CH-059 | 448-452 | H3 | 화면 공통 정책 가이드 > 6) 접근성/개인정보/분석 이벤트 > [개인정보] | auth-membership, common-system, analytics-privacy-accessibility | server |
| CH-060 | 453-458 | H3 | 화면 공통 정책 가이드 > 6) 접근성/개인정보/분석 이벤트 > [분석 이벤트] | moderation-reporting, search, ui-feedback, common-system, analytics-privacy-accessibility | app |
| CH-061 | 459-462 | H2 | 화면 공통 정책 가이드 > 7) 템플릿 | - | app |
| CH-062 | 463-469 | H3 | 화면 공통 정책 가이드 > 7) 템플릿 > [API/예외 처리 공통 정책] | auth-membership, ui-feedback, common-system, analytics-privacy-accessibility | server, app |
| CH-063 | 470-477 | H3 | 화면 공통 정책 가이드 > 7) 템플릿 > [데이터 정합성 정책] | moderation-reporting, search, mypage-support, common-system | server, app |
| CH-064 | 478-481 | H1 | 마이페이지 화면정의서 v1.0(외주) | mypage-support | app |
| CH-065 | 482-489 | H2 | 마이페이지 화면정의서 v1.0(외주) > 문서 범위 | auth-membership, review, moderation-reporting, mypage-support, ui-feedback, common-system, analytics-privacy-accessibility | server, app, ai-runtime |
| CH-066 | 490-503 | H1 | 1. 화면 개요 | auth-membership, community-post, review, search, mypage-support, analytics-privacy-accessibility | app |
| CH-067 | 504-507 | H1 | 2. 화면 구성 — 비회원 (로그인 전) | auth-membership, mypage-support, analytics-privacy-accessibility | admin, app |
| CH-068 | 508-516 | H2 | 2. 화면 구성 — 비회원 (로그인 전) > 2-1. 구역 1 — 비회원 로그인 유도 화면 | auth-membership, ui-feedback, analytics-privacy-accessibility | app |
| CH-069 | 517-526 | H2 | 2. 화면 구성 — 비회원 (로그인 전) > 2-2. 공통 로그인 / 회원가입 플로우 (전역 정책) | auth-membership, community-post, mypage-support, ui-feedback, common-system, analytics-privacy-accessibility | server, app, ai-runtime |
| CH-070 | 527-533 | H3 | 2. 화면 구성 — 비회원 (로그인 전) > 2-2. 공통 로그인 / 회원가입 플로우 (전역 정책) > SNS 계정 통합 정책 | auth-membership, common-system, analytics-privacy-accessibility | server |
| CH-071 | 534-535 | H1 | 3. 화면 구성 — 회원 (로그인 후) | auth-membership, analytics-privacy-accessibility | app |
| CH-072 | 536-543 | H2 | 3. 화면 구성 — 회원 (로그인 후) > 3-1. M01 — 프로필 요약 | auth-membership, ui-feedback, analytics-privacy-accessibility | app, ai-runtime |
| CH-073 | 544-553 | H3 | 3. 화면 구성 — 회원 (로그인 후) > 3-1. M01 — 프로필 요약 > 로그아웃 팝업 정책 | auth-membership, ui-feedback, common-system, analytics-privacy-accessibility | server, app |
| CH-074 | 554-569 | H2 | 3. 화면 구성 — 회원 (로그인 후) > 3-2. M02 — 닉네임 | auth-membership, ui-feedback, common-system | server, app |
| CH-075 | 570-582 | H2 | 3. 화면 구성 — 회원 (로그인 후) > 3-3. M03 — 내 활동 | community-post, review, search, mypage-support | app |
| CH-076 | 583-596 | H3 | 3. 화면 구성 — 회원 (로그인 후) > 3-3. M03 — 내 활동 > 게시글 탭 | community-post, moderation-reporting, ui-feedback, common-system | admin, server, app, ai-runtime |
| CH-077 | 597-606 | H3 | 3. 화면 구성 — 회원 (로그인 후) > 3-3. M03 — 내 활동 > 댓글 탭 | community-post, moderation-reporting | admin, app |
| CH-078 | 607-620 | H3 | 3. 화면 구성 — 회원 (로그인 후) > 3-3. M03 — 내 활동 > 후기 탭 | auth-membership, community-post, review, visit-verification, moderation-reporting, ui-feedback, common-system | server, app, ai-runtime |
| CH-079 | 621-627 | H3 | 3. 화면 구성 — 회원 (로그인 후) > 3-3. M03 — 내 활동 > 저장 탭 | review, ui-feedback, common-system | app |
| CH-080 | 628-635 | H3 | 3. 화면 구성 — 회원 (로그인 후) > 3-3. M03 — 내 활동 > 다른 화면과의 연결 | review, ui-feedback | app |
| CH-081 | 636-643 | H2 | 3. 화면 구성 — 회원 (로그인 후) > 3-4. M04 — 고객지원 | mypage-support, common-system | server, app |
| CH-082 | 644-655 | H3 | 3. 화면 구성 — 회원 (로그인 후) > 3-4. M04 — 고객지원 > 공지사항 목록 페이지 정책 | search, mypage-support, common-system | server, app |
| CH-083 | 656-665 | H3 | 3. 화면 구성 — 회원 (로그인 후) > 3-4. M04 — 고객지원 > 이용약관 / 개인정보처리방침 상세 페이지 정책 | mypage-support, common-system, analytics-privacy-accessibility | server, app |
| CH-084 | 666-669 | H2 | 3. 화면 구성 — 회원 (로그인 후) > 3-5. M05 — 탈퇴하기 | auth-membership, mypage-support | app |
| CH-085 | 670-686 | H3 | 3. 화면 구성 — 회원 (로그인 후) > 3-5. M05 — 탈퇴하기 > 회원탈퇴 페이지 정책 | auth-membership, community-post, review, moderation-reporting, search, mypage-support, ui-feedback, common-system | server, app |
| CH-086 | 687-697 | H3 | 3. 화면 구성 — 회원 (로그인 후) > 3-5. M05 — 탈퇴하기 > 탈퇴 완료 팝업 | auth-membership, ui-feedback, common-system, analytics-privacy-accessibility | server, app |
| CH-087 | 698-709 | H1 | 4. 회원 / 비회원 기능 차이 요약 | auth-membership, doctor-verification, community-post, review, mypage-support | server, app, ai-runtime |
| CH-088 | 710-718 | H1 | 5. 공통 컴포넌트 연계 | community-post, review | app |
| CH-089 | 719-725 | H1 | 커뮤니티 탭 화면정의서 v1.0(외주) | community-post, common-system | app |
| CH-090 | 726-729 | H2 | 커뮤니티 탭 화면정의서 v1.0(외주) > 문서 범위 | community-post, moderation-reporting, common-system | admin, server, app |
| CH-091 | 730-733 | H2 | 커뮤니티 탭 화면정의서 v1.0(외주) > 개요 | community-post, review | app |
| CH-092 | 734-740 | H3 | 커뮤니티 탭 화면정의서 v1.0(외주) > 개요 > 핵심 가치 | doctor-verification, review, visit-verification, moderation-reporting | server |
| CH-093 | 741-746 | H2 | 커뮤니티 탭 화면정의서 v1.0(외주) > 1. 헤더 | community-post, search | app |
| CH-094 | 747-753 | H2 | 커뮤니티 탭 화면정의서 v1.0(외주) > 2. 카테고리 필터 | community-post, search | app |
| CH-095 | 754-760 | H3 | 커뮤니티 탭 화면정의서 v1.0(외주) > 2. 카테고리 필터 > 질환 검색 버튼 동작 | community-post, search, ui-feedback | app |
| CH-096 | 761-767 | H3 | 커뮤니티 탭 화면정의서 v1.0(외주) > 2. 카테고리 필터 > 검색 결과 표시 규칙 (카테고리 필터 내부) | community-post, search, common-system | server, app, ai-runtime |
| CH-097 | 768-784 | H3 | 커뮤니티 탭 화면정의서 v1.0(외주) > 2. 카테고리 필터 > 필터 결과 상태 정의 (피드 영역) | auth-membership, community-post, review, search, ui-feedback, common-system | app |
| CH-098 | 785-790 | H3 | 커뮤니티 탭 화면정의서 v1.0(외주) > 2. 카테고리 필터 > 커뮤니티 내 검색 vs 통합 검색 | community-post, search, ui-feedback | app |
| CH-099 | 791-803 | H2 | 커뮤니티 탭 화면정의서 v1.0(외주) > 3. 헤더 하단 배너 영역 | auth-membership, community-post, moderation-reporting, analytics-privacy-accessibility | app, ai-runtime |
| CH-100 | 804-812 | H2 | 커뮤니티 탭 화면정의서 v1.0(외주) > 4. 피드 목록 헤더 (총 건수 + 정렬) | community-post, search | app |
| CH-101 | 813-819 | H2 | 커뮤니티 탭 화면정의서 v1.0(외주) > 5. 유저 필터 배너 (조건부) | community-post, search, ui-feedback | app |
| CH-102 | 820-832 | H2 | 커뮤니티 탭 화면정의서 v1.0(외주) > 6. 게시글 카드 (목록) | auth-membership, community-post, visit-verification | server, app |
| CH-103 | 833-838 | H2 | 커뮤니티 탭 화면정의서 v1.0(외주) > 7. 게시글 상세 (PostDetailModal) | community-post, ui-feedback | app |
| CH-104 | 839-845 | H2 | 커뮤니티 탭 화면정의서 v1.0(외주) > 8. 글쓰기 FAB | auth-membership, community-post, ui-feedback, analytics-privacy-accessibility | app |
| CH-105 | 846-847 | H2 | 커뮤니티 탭 화면정의서 v1.0(외주) > 뱃지 시스템 | - | - |
| CH-106 | 848-852 | H3 | 커뮤니티 탭 화면정의서 v1.0(외주) > 뱃지 시스템 > 병원 진료 인증 | review, visit-verification | admin, server |
| CH-107 | 853-859 | H3 | 커뮤니티 탭 화면정의서 v1.0(외주) > 뱃지 시스템 > 의사 인증 | doctor-verification, community-post, review | server |
| CH-108 | 860-862 | H2 | 커뮤니티 탭 화면정의서 v1.0(외주) > 사용자 인터랙션 | auth-membership, ui-feedback | app |
| CH-109 | 863-866 | H3 | 커뮤니티 탭 화면정의서 v1.0(외주) > 사용자 인터랙션 > 공감해요 | auth-membership, community-post, ui-feedback | - |
| CH-110 | 867-871 | H3 | 커뮤니티 탭 화면정의서 v1.0(외주) > 사용자 인터랙션 > 댓글 | auth-membership, doctor-verification, community-post, ui-feedback, analytics-privacy-accessibility | server, app |
| CH-111 | 872-878 | H3 | 커뮤니티 탭 화면정의서 v1.0(외주) > 사용자 인터랙션 > 댓글 좋아요 / 답글 | auth-membership, community-post, ui-feedback | - |
| CH-112 | 879-887 | H2 | 커뮤니티 탭 화면정의서 v1.0(외주) > 신고 기능 | auth-membership, community-post, moderation-reporting, ui-feedback, common-system | server, app |
| CH-113 | 888-893 | H2 | 커뮤니티 탭 화면정의서 v1.0(외주) > 비회원 제한 정책 | auth-membership, community-post, moderation-reporting, search, common-system | server |
| CH-114 | 894-901 | H2 | 커뮤니티 탭 화면정의서 v1.0(외주) > 공통 컴포넌트 참조 | community-post, ui-feedback | app |
| CH-115 | 902-909 | H2 | 커뮤니티 탭 화면정의서 v1.0(외주) > 9. WritePostModal (회원) | auth-membership, community-post, visit-verification | server, ai-runtime |
| CH-116 | 910-922 | H2 | 커뮤니티 탭 화면정의서 v1.0(외주) > 10. 임시저장 (이 기기) | moderation-reporting, common-system, analytics-privacy-accessibility | server, app, ai-runtime |
| CH-117 | 923-926 | H1 | 공통 UI 컴포넌트 정의서 v1.0(외주) | - | app |
| CH-118 | 927-932 | H2 | 공통 UI 컴포넌트 정의서 v1.0(외주) > 문서 범위 | auth-membership, community-post, moderation-reporting, search, ui-feedback, common-system | server, app, ai-runtime |
| CH-119 | 933-934 | H1 | 1. 팝업 UI (모달) | ui-feedback | app |
| CH-120 | 935-946 | H2 | 1. 팝업 UI (모달) > 1-1. 의사 프로필 상세 팝업 | community-post, review, search, ui-feedback | app |
| CH-121 | 947-956 | H3 | 1. 팝업 UI (모달) > 1-1. 의사 프로필 상세 팝업 > 1-1-1. 등급별 권한 | auth-membership, doctor-verification, review, ui-feedback, common-system | server, app, ai-runtime |
| CH-122 | 957-960 | H3 | 1. 팝업 UI (모달) > 1-1. 의사 프로필 상세 팝업 > 1-1-2. 특수 상태 | review, common-system | app |
| CH-123 | 961-970 | H3 | 1. 팝업 UI (모달) > 1-1. 의사 프로필 상세 팝업 > 1-1-3. 리뷰 카드 이미지 그리드 | community-post, review, common-system | server, app |
| CH-124 | 971-982 | H2 | 1. 팝업 UI (모달) > 1-2. 커뮤니티 게시글 상세 팝업 | auth-membership, community-post, search, ui-feedback | app, ai-runtime |
| CH-125 | 983-992 | H3 | 1. 팝업 UI (모달) > 1-2. 커뮤니티 게시글 상세 팝업 > 1-2-1. 등급별 권한 | auth-membership, doctor-verification, community-post, common-system, analytics-privacy-accessibility | server, app |
| CH-126 | 993-998 | H3 | 1. 팝업 UI (모달) > 1-2. 커뮤니티 게시글 상세 팝업 > 1-2-2. 특수 상태 | community-post, common-system | app |
| CH-127 | 999-1006 | H3 | 1. 팝업 UI (모달) > 1-2. 커뮤니티 게시글 상세 팝업 > 1-2-3. PostDetailModal 화면 구성 | auth-membership, community-post, ui-feedback, common-system | app, ai-runtime |
| CH-128 | 1007-1019 | H3 | 1. 팝업 UI (모달) > 1-2. 커뮤니티 게시글 상세 팝업 > 1-2-4. ⋮ 더보기 메뉴 | auth-membership, community-post, moderation-reporting | - |
| CH-129 | 1020-1025 | H3 | 1. 팝업 UI (모달) > 1-2. 커뮤니티 게시글 상세 팝업 > 1-2-5. 첨부 이미지 | - | app |
| CH-130 | 1026-1043 | H2 | 1. 팝업 UI (모달) > 1-3. 리뷰 작성 팝업 | auth-membership, review, ui-feedback, common-system, analytics-privacy-accessibility | server, app |
| CH-131 | 1044-1051 | H2 | 1. 팝업 UI (모달) > 1-4. 통합 검색 모달 (GlobalSearchModal) | search, ui-feedback | app |
| CH-132 | 1052-1053 | H1 | 2. 알림 UI (토스트) | ui-feedback | app |
| CH-133 | 1054-1098 | H2 | 2. 알림 UI (토스트) > 2-1. 로그인 필요 모달 (LoginRequiredToast) | auth-membership, community-post, review, moderation-reporting, ui-feedback, analytics-privacy-accessibility | admin, server, app, ai-runtime |
| CH-134 | 1099-1143 | H2 | 2. 알림 UI (토스트) > 2-2. 비회원 한도 초과 모달 (GuestLimitModal) | auth-membership, community-post, search, ui-feedback | server, app |
| CH-135 | 1144-1156 | H2 | 2. 알림 UI (토스트) > 두 모달 비교 | auth-membership, ui-feedback, analytics-privacy-accessibility | server, app |
| CH-136 | 1157-1160 | H1 | 3. 데이터 상태 UI | common-system | - |
| CH-137 | 1161-1167 | H2 | 3. 데이터 상태 UI > 3-1. 로딩 | community-post, search, common-system | server, app, ai-runtime |
| CH-138 | 1168-1173 | H2 | 3. 데이터 상태 UI > 3-2. 에러 | common-system | server |
| CH-139 | 1174-1184 | H2 | 3. 데이터 상태 UI > 3-3. 데이터 없음 (Empty) | community-post, review, search, common-system | - |
| CH-140 | 1185-1186 | H1 | 4. 레이아웃 컴포넌트 | - | - |
| CH-141 | 1187-1202 | H2 | 4. 레이아웃 컴포넌트 > 4-1. 하단 탭 메뉴 (BottomTabBar) | community-post, common-system | server, app, ai-runtime |
| CH-142 | 1203-1217 | H2 | 4. 레이아웃 컴포넌트 > 4-2. 통합 검색 아이콘 (메인 뷰 우상단 고정) | community-post, search, common-system | server, app, ai-runtime |
| CH-143 | 1218-1221 | H1 | 베타 AIGA 예외 케이스 · 분기 정책 v1.0(외주) | common-system | server, ai-runtime |
| CH-144 | 1222-1229 | H2 | 베타 AIGA 예외 케이스 · 분기 정책 v1.0(외주) > 문서 범위 | common-system | server, app, ai-runtime |
| CH-145 | 1230-1231 | H1 | 1. 명의 찾기 탭 | - | app |
| CH-146 | 1232-1239 | H2 | 1. 명의 찾기 탭 > D-01. 검색 한도 차감 시점 | search | server |
| CH-147 | 1240-1247 | H2 | 1. 명의 찾기 탭 > D-02. 카테고리 필터 변경 시 한도 차감 제외 | community-post, search | server |
| CH-148 | 1248-1255 | H2 | 1. 명의 찾기 탭 > D-03. GPS 타임아웃 기준 | - | server |
| CH-149 | 1256-1265 | H2 | 1. 명의 찾기 탭 > D-04. 검색 0건 빈 상태 문구 3분기 | community-post, search, common-system | - |
| CH-150 | 1266-1274 | H2 | 1. 명의 찾기 탭 > D-05. 정렬 변경 시 스크롤 위치 | search | - |
| CH-151 | 1275-1276 | H1 | 2. 커뮤니티 탭 | community-post | app |
| CH-152 | 1277-1286 | H2 | 2. 커뮤니티 탭 > C-01. 글쓰기 완료 후 이동 위치 | community-post, search, ui-feedback, common-system | app |
| CH-153 | 1287-1296 | H2 | 2. 커뮤니티 탭 > C-02. 이미지 업로드 실패 케이스별 처리 | ui-feedback, common-system | app |
| CH-154 | 1297-1312 | H2 | 2. 커뮤니티 탭 > C-03. 삭제된 댓글 placeholder 유지 기준 | community-post, moderation-reporting, common-system | server |
| CH-155 | 1313-1322 | H2 | 2. 커뮤니티 탭 > C-04. 임시저장 데이터 파싱 실패 처리 | community-post, moderation-reporting, common-system | app |
| CH-156 | 1323-1324 | H1 | 3. 공통 컴포넌트 | - | - |
| CH-157 | 1325-1332 | H2 | 3. 공통 컴포넌트 > G-01. 로그인 후 원래 액션 자동 수행 | auth-membership, community-post, analytics-privacy-accessibility | server, app |
| CH-158 | 1333-1339 | H2 | 3. 공통 컴포넌트 > G-02. GuestLimitModal "나중에 하기" 후 동작 | search, ui-feedback, common-system | app |
| CH-159 | 1340-1349 | H2 | 3. 공통 컴포넌트 > G-03. 소셜 로그인 실패 처리 | auth-membership, ui-feedback, common-system, analytics-privacy-accessibility | server, app |
| CH-160 | 1350-1356 | H2 | 3. 공통 컴포넌트 > G-05. 탭 재터치 시 최상단 이동 | - | app |
| CH-161 | 1357-1367 | H2 | 3. 공통 컴포넌트 > G-06. 브라우저 뒤로가기 우선순위 | ui-feedback | app |
| CH-162 | 1368-1376 | H2 | 3. 공통 컴포넌트 > H-04. 홈 재진입 시 추천글 갱신 타이밍 | - | app, ai-runtime |
| CH-163 | 1377-1391 | H2 | 3. 공통 컴포넌트 > G-07. 에러 상태 UI 세부 정의 (공통 §3-2 보완) | auth-membership, ui-feedback, common-system, analytics-privacy-accessibility | server, app |
| CH-164 | 1392-1393 | H1 | 4. 통합검색 보안 · 입력 정책 | search, common-system | server |
| CH-165 | 1394-1401 | H2 | 4. 통합검색 보안 · 입력 정책 > S-01. 보안 방어 (XSS · SQL Injection) | search, analytics-privacy-accessibility | server |
| CH-166 | 1402-1409 | H2 | 4. 통합검색 보안 · 입력 정책 > S-02. 공백만 입력 시 처리 | search | server |
| CH-167 | 1410-1421 | H2 | 4. 통합검색 보안 · 입력 정책 > S-03. 검색어 최대 길이 50자 제한 | community-post, search, ui-feedback, common-system | server, app |
| CH-168 | 1422-1428 | H2 | 4. 통합검색 보안 · 입력 정책 > S-04. 탭별 결과 무한 스크롤 로드 단위 (Pagination) | common-system | admin, server, app |
| CH-169 | 1429-1436 | H2 | 4. 통합검색 보안 · 입력 정책 > S-05. 탭 전환 시 데이터·스크롤 위치 유지 (Persistence) | search, common-system | app |
| CH-170 | 1437-1446 | H2 | 4. 통합검색 보안 · 입력 정책 > S-06. 결과 로딩 중 재검색 처리 (API 중복 호출) | search, common-system | server, app |
| CH-171 | 1447-1455 | H1 | 5. 콘텐츠 안전 정책 (Content Safety) | community-post, review, moderation-reporting, common-system | admin, server, ai-runtime |
| CH-172 | 1456-1459 | H4 | 5. 콘텐츠 안전 정책 (Content Safety) > 첨부 파일: AIGA_콘텐츠모더레이션_키워드명세서_v1.0.xlsx | - | ai-runtime |
| CH-173 | 1460-1472 | H2 | 5. 콘텐츠 안전 정책 (Content Safety) > B-01. 작성 시점 금칙어 자동 차단 (텍스트) | community-post, review, search, ui-feedback, common-system, analytics-privacy-accessibility | server, app |
| CH-174 | 1473-1489 | H2 | 5. 콘텐츠 안전 정책 (Content Safety) > B-02. 카테고리별 안내 문구 (BLOCK 시 사용자 노출) | community-post, review, analytics-privacy-accessibility | admin |
| CH-175 | 1490-1499 | H2 | 5. 콘텐츠 안전 정책 (Content Safety) > B-03. 화이트리스트 예외 처리 (오탐 방지) | community-post, moderation-reporting | admin |
| CH-176 | 1500-1509 | H2 | 5. 콘텐츠 안전 정책 (Content Safety) > B-04. 의사 리뷰 조합 매칭 (명예훼손 방지) | community-post, review | app |
| CH-177 | 1510-1524 | H2 | 5. 콘텐츠 안전 정책 (Content Safety) > B-05. 이미지 콘텐츠 필터 (외부 API 자동 BLOCK) | community-post, review, visit-verification, moderation-reporting, search, ui-feedback, common-system | admin, server, app |
| CH-178 | 1525-1532 | H2 | 5. 콘텐츠 안전 정책 (Content Safety) > B-06. 자동 차단과 사용자 신고의 관계 | community-post, moderation-reporting, common-system | admin, server |
| CH-179 | 1533-1544 | H2 | 5. 콘텐츠 안전 정책 (Content Safety) > B-07. 차단 로그 및 운영 데이터 | auth-membership, community-post, moderation-reporting, common-system, analytics-privacy-accessibility | admin, server, app |
| CH-180 | 1545-1546 | H1 | 6. 중복 액션 방지 | - | - |
| CH-181 | 1547-1567 | H2 | 6. 중복 액션 방지 > P-02. 공통 중복 액션 방지 (Double Submit Prevention) | auth-membership, doctor-verification, community-post, review, moderation-reporting, ui-feedback, common-system | server, app, ai-runtime |
| CH-182 | 1568-1585 | H1 | 의사 인증 SB(화면/정책/기능정의서) v1.0(외주) | doctor-verification, common-system | admin, server, app, ai-runtime |
| CH-183 | 1586-1600 | H1 | 📋 목차 | doctor-verification, ui-feedback, common-system | server, app |
| CH-184 | 1601-1602 | H1 | A. 개요 & 정책 기반 | common-system | server |
| CH-185 | 1603-1604 | H2 | A. 개요 & 정책 기반 > 1. 개요 | - | - |
| CH-186 | 1605-1623 | H3 | A. 개요 & 정책 기반 > 1. 개요 > 1-1. 문서 범위 | auth-membership, doctor-verification, review, ui-feedback, common-system, analytics-privacy-accessibility | server, app, ai-runtime |
| CH-187 | 1624-1636 | H3 | A. 개요 & 정책 기반 > 1. 개요 > 1-2. 진입 경로 | community-post, review, search, ui-feedback, common-system | server, app, ai-runtime |
| CH-188 | 1637-1638 | H2 | A. 개요 & 정책 기반 > 2. 인증 등급 및 주체 분리 원칙 | - | server |
| CH-189 | 1639-1646 | H3 | A. 개요 & 정책 기반 > 2. 인증 등급 및 주체 분리 원칙 > 2-1. 인증 등급 (3-Tier 사용자 모델) | auth-membership, doctor-verification, review, analytics-privacy-accessibility | server, app |
| CH-190 | 1647-1661 | H3 | A. 개요 & 정책 기반 > 2. 인증 등급 및 주체 분리 원칙 > 2-2. 인증 주체 분리 원칙 | auth-membership, doctor-verification, review, common-system | server, app, ai-runtime |
| CH-191 | 1662-1679 | H3 | A. 개요 & 정책 기반 > 2. 인증 등급 및 주체 분리 원칙 > 2-3. 런칭 버전에서 발생 가능한 경우 | doctor-verification, review, common-system | server, app, ai-runtime |
| CH-192 | 1680-1683 | H2 | A. 개요 & 정책 기반 > 3. 인증 버튼 노출 규칙 (시나리오별) | doctor-verification, review, ui-feedback, common-system | server, app |
| CH-193 | 1684-1695 | H3 | A. 개요 & 정책 기반 > 3. 인증 버튼 노출 규칙 (시나리오별) > 3-1. 시나리오별 통합 매트릭스 | auth-membership, doctor-verification, ui-feedback, common-system, analytics-privacy-accessibility | server, app |
| CH-194 | 1696-1703 | H3 | A. 개요 & 정책 기반 > 3. 인증 버튼 노출 규칙 (시나리오별) > 3-2. 노출 규칙 요약 | auth-membership, doctor-verification, ui-feedback, common-system, analytics-privacy-accessibility | server, app, ai-runtime |
| CH-195 | 1704-1716 | H3 | A. 개요 & 정책 기반 > 3. 인증 버튼 노출 규칙 (시나리오별) > 3-3. 비회원 진입 시 UX 정책 | auth-membership, ui-feedback, common-system, analytics-privacy-accessibility | server, app |
| CH-196 | 1717-1718 | H1 | B. 인증 절차 | - | server |
| CH-197 | 1719-1741 | H2 | B. 인증 절차 > 4. 인증 절차 개요 | auth-membership, doctor-verification, visit-verification, ui-feedback | server, app |
| CH-198 | 1742-1743 | H2 | B. 인증 절차 > 5. VerificationFlow 모달 | ui-feedback | app |
| CH-199 | 1744-1753 | H3 | B. 인증 절차 > 5. VerificationFlow 모달 > 5-1. 모달 기본 정보 | doctor-verification, review, ui-feedback, common-system | server, app |
| CH-200 | 1754-1803 | H3 | B. 인증 절차 > 5. VerificationFlow 모달 > 5-2. 인증 시퀀스 다이어그램 | auth-membership, doctor-verification, review, visit-verification, ui-feedback, common-system | server, app |
| CH-201 | 1804-1833 | H3 | B. 인증 절차 > 5. VerificationFlow 모달 > 5-3. Step 1 — 본인인증 | ui-feedback, analytics-privacy-accessibility | server, app |
| CH-202 | 1834-1878 | H3 | B. 인증 절차 > 5. VerificationFlow 모달 > 5-4. Step 2 — 면허번호 입력 | doctor-verification, ui-feedback, common-system | server, app |
| CH-203 | 1879-1901 | H3 | B. 인증 절차 > 5. VerificationFlow 모달 > 5-5. 인증 완료 처리 | auth-membership, doctor-verification, community-post, review, visit-verification, ui-feedback, common-system | server, app |
| CH-204 | 1902-1931 | H3 | B. 인증 절차 > 5. VerificationFlow 모달 > 5-6. 오류 처리 | doctor-verification, common-system | server, ai-runtime |
| CH-205 | 1932-1933 | H1 | C. 인증 정책 | common-system | server |
| CH-206 | 1934-1935 | H2 | C. 인증 정책 > 6. 면허번호 검증 정책 | doctor-verification, common-system | server |
| CH-207 | 1936-1948 | H3 | C. 인증 정책 > 6. 면허번호 검증 정책 > 6-1. 현재 결정 사항 (런칭 베이스) | doctor-verification, common-system | server |
| CH-208 | 1949-1959 | H3 | C. 인증 정책 > 6. 면허번호 검증 정책 > 6-2. 검증 프로세스 | doctor-verification, common-system | server |
| CH-209 | 1960-1973 | H3 | C. 인증 정책 > 6. 면허번호 검증 정책 > 6-3. 미승인 사유 분류 | auth-membership, common-system | server, ai-runtime |
| CH-210 | 1974-1989 | H3 | C. 인증 정책 > 6. 면허번호 검증 정책 > 6-4. 재시도 제한 정책 | auth-membership, doctor-verification, ui-feedback, common-system, analytics-privacy-accessibility | server, app |
| CH-211 | 1990-2018 | H3 | C. 인증 정책 > 6. 면허번호 검증 정책 > 6-5. 미승인 시도 이력 저장 정책 | doctor-verification, moderation-reporting, common-system, analytics-privacy-accessibility | admin, server |
| CH-212 | 2019-2020 | H2 | C. 인증 정책 > 7. 인증 상태 관리 | common-system | server |
| CH-213 | 2021-2031 | H3 | C. 인증 정책 > 7. 인증 상태 관리 > 7-1. 인증 상태 전이 다이어그램 | doctor-verification, common-system | server |
| CH-214 | 2032-2079 | H2 | C. 인증 정책 > 8. 작성자 표시 정책 | auth-membership, doctor-verification, community-post, review, visit-verification, common-system | server, app, ai-runtime |
| CH-215 | 2080-2087 | H1 | 의사 인증 회원 — 탭별 화면 변화 정의서 v1.0(외주) | auth-membership, doctor-verification, community-post, review | server, app |
| CH-216 | 2088-2096 | H2 | 의사 인증 회원 — 탭별 화면 변화 정의서 v1.0(외주) > 📐 이 문서의 범위 | auth-membership, doctor-verification, moderation-reporting, mypage-support, ui-feedback, common-system, analytics-privacy-accessibility | server, app |
| CH-217 | 2097-2104 | H2 | 의사 인증 회원 — 탭별 화면 변화 정의서 v1.0(외주) > 핵심 원칙 두 가지 | auth-membership, doctor-verification | server, app |
| CH-218 | 2105-2121 | H2 | 의사 인증 회원 — 탭별 화면 변화 정의서 v1.0(외주) > 🎨 인증 의사 콘텐츠 시각 강조 — 디자인 토큰 (전체 탭 공통) | auth-membership, doctor-verification, community-post, review, visit-verification, common-system | server, app |
| CH-219 | 2122-2123 | H1 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 | - | server |
| CH-220 | 2124-2125 | H2 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 1. 홈 탭 | - | app |
| CH-221 | 2126-2129 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 1. 홈 탭 > 인증 의사 본인이 보는 홈 | auth-membership, community-post | server, app, ai-runtime |
| CH-222 | 2130-2137 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 1. 홈 탭 > 다른 사용자가 보는 홈 | doctor-verification, community-post | server, app, ai-runtime |
| CH-223 | 2138-2150 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 1. 홈 탭 > UX 시나리오: 일반 사용자가 인증 의사의 글을 발견하는 흐름 | doctor-verification, community-post | server, app, ai-runtime |
| CH-224 | 2151-2156 | H4 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 1. 홈 탭 > UX 시나리오: 일반 사용자가 인증 의사의 글을 발견하는 흐름 > 첨부 파일: 01_home_revision.html | - | - |
| CH-225 | 2157-2158 | H2 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 2. AI 챗봇 탭 (AIGA) | - | app, ai-runtime |
| CH-226 | 2159-2162 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 2. AI 챗봇 탭 (AIGA) > 인증 의사 본인이 보는 챗봇 | auth-membership | server, app |
| CH-227 | 2163-2168 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 2. AI 챗봇 탭 (AIGA) > AI가 의사를 추천할 때 | auth-membership, doctor-verification, common-system | server, app, ai-runtime |
| CH-228 | 2169-2185 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 2. AI 챗봇 탭 (AIGA) > UX 시나리오: 챗봇 추천 → 의사 프로필 이동 | auth-membership, doctor-verification, review, ui-feedback | server, app, ai-runtime |
| CH-229 | 2186-2191 | H4 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 2. AI 챗봇 탭 (AIGA) > UX 시나리오: 챗봇 추천 → 의사 프로필 이동 > 첨부 파일: 02_chatbot.html | - | - |
| CH-230 | 2192-2193 | H2 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 3. 명의 찾기 탭 | - | app |
| CH-231 | 2194-2201 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 3. 명의 찾기 탭 > 검색 결과 목록에서 | doctor-verification, review, search | server, app, ai-runtime |
| CH-232 | 2202-2208 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 3. 명의 찾기 탭 > 본인 프로필 카드의 인터랙션 차이 | review, search, mypage-support, ui-feedback, common-system | server, app, ai-runtime |
| CH-233 | 2209-2217 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 3. 명의 찾기 탭 > 의사 프로필 상세 화면을 열었을 때 | doctor-verification, review, mypage-support, ui-feedback | server, app |
| CH-234 | 2218-2225 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 3. 명의 찾기 탭 > UX 시나리오 1: 환자가 검색해서 의사를 찾는 흐름 | search, ui-feedback | server, app, ai-runtime |
| CH-235 | 2226-2241 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 3. 명의 찾기 탭 > UX 시나리오 2: 인증 의사 본인이 자기 프로필을 여는 흐름 | doctor-verification, search, mypage-support, ui-feedback | server, app |
| CH-236 | 2242-2245 | H2 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 4. 커뮤니티 탭 | doctor-verification, community-post | server, app |
| CH-237 | 2246-2251 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 4. 커뮤니티 탭 > 글 목록에서 | doctor-verification, community-post | server, app |
| CH-238 | 2252-2260 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 4. 커뮤니티 탭 > 글 상세 화면(댓글/대댓글)에서 | auth-membership, doctor-verification, community-post | server, app |
| CH-239 | 2261-2289 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 4. 커뮤니티 탭 > 작성자 프로필 모달 (목록에서 작성자 탭 시) | auth-membership, doctor-verification, community-post, review, ui-feedback | server, app, ai-runtime |
| CH-240 | 2290-2296 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 4. 커뮤니티 탭 > 글/댓글을 작성할 때 (인증 의사 본인 화면) | auth-membership, community-post, ui-feedback | server, app |
| CH-241 | 2297-2302 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 4. 커뮤니티 탭 > 의료법 관련 안내 문구 (검토 필요) | community-post | server |
| CH-242 | 2303-2311 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 4. 커뮤니티 탭 > UX 시나리오 1: 인증 의사가 처음 게시글을 쓰는 흐름 | auth-membership, doctor-verification, community-post, ui-feedback | server, app |
| CH-243 | 2312-2320 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 4. 커뮤니티 탭 > UX 시나리오 2: 일반 환자가 자신의 증상에 의사 답변을 받는 흐름 | doctor-verification, community-post | server, app |
| CH-244 | 2321-2333 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 4. 커뮤니티 탭 > UX 시나리오 3: 인증 의사가 환자 글에 댓글을 다는 흐름 | auth-membership, doctor-verification, community-post | server, app |
| CH-245 | 2334-2339 | H4 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 4. 커뮤니티 탭 > UX 시나리오 3: 인증 의사가 환자 글에 댓글을 다는 흐름 > 첨부 파일: 04_community.html | - | - |
| CH-246 | 2340-2343 | H2 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 5. 마이페이지 탭 | auth-membership, doctor-verification, mypage-support | server, app |
| CH-247 | 2344-2363 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 5. 마이페이지 탭 > 📸 Before / After 비교 화면 | auth-membership, doctor-verification, review, mypage-support, ui-feedback, common-system | server, app |
| CH-248 | 2364-2374 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 5. 마이페이지 탭 > 상단 프로필 영역의 차이 | auth-membership, doctor-verification, review, mypage-support, ui-feedback, common-system | server, app |
| CH-249 | 2375-2387 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 5. 마이페이지 탭 > 닉네임 카드 → 인증 정보 카드로 교체 | auth-membership, doctor-verification, review, ui-feedback, common-system | server, app |
| CH-250 | 2388-2407 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 5. 마이페이지 탭 > 내 활동 영역 | auth-membership, doctor-verification, community-post, review, mypage-support, common-system | server, app |
| CH-251 | 2408-2411 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 5. 마이페이지 탭 > 후기 탭의 특수 케이스 | community-post, review | server, app |
| CH-252 | 2412-2415 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 5. 마이페이지 탭 > 회원 탈퇴 시 | auth-membership, doctor-verification, community-post, review, moderation-reporting, mypage-support, common-system, analytics-privacy-accessibility | server, app |
| CH-253 | 2416-2422 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 5. 마이페이지 탭 > 「저장」 탭 (인증 의사 케이스) | auth-membership, mypage-support, ui-feedback | server, app, ai-runtime |
| CH-254 | 2423-2434 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 5. 마이페이지 탭 > UX 시나리오: 인증 직후 첫 마이페이지 진입 | auth-membership, doctor-verification, review, mypage-support, common-system | server, app |
| CH-255 | 2435-2440 | H2 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 6. 리뷰 탭 — 리뷰 작성 강화 · 댓글/대댓글 추가 | auth-membership, doctor-verification, community-post, review, visit-verification, moderation-reporting, common-system | server, app |
| CH-256 | 2441-2452 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 6. 리뷰 탭 — 리뷰 작성 강화 · 댓글/대댓글 추가 > 6-1. 리뷰 본문 작성 — 이미지 첨부 · 병원 진료 인증 | auth-membership, doctor-verification, community-post, review, visit-verification, ui-feedback, common-system | server, app |
| CH-257 | 2453-2470 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 6. 리뷰 탭 — 리뷰 작성 강화 · 댓글/대댓글 추가 > 6-2. 리뷰 댓글/대댓글 | auth-membership, community-post, review, moderation-reporting, common-system, analytics-privacy-accessibility | admin, server, app |
| CH-258 | 2471-2478 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 6. 리뷰 탭 — 리뷰 작성 강화 · 댓글/대댓글 추가 > 시각 강조 — 인증 의사 콘텐츠 | doctor-verification, community-post, review, common-system | server, app |
| CH-259 | 2479-2484 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 6. 리뷰 탭 — 리뷰 작성 강화 · 댓글/대댓글 추가 > 일반 회원이 보는 리뷰 탭 | auth-membership, community-post, review | app |
| CH-260 | 2485-2489 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 6. 리뷰 탭 — 리뷰 작성 강화 · 댓글/대댓글 추가 > 인증 의사가 보는 리뷰 탭 | community-post, review, visit-verification | server, app |
| CH-261 | 2490-2500 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 6. 리뷰 탭 — 리뷰 작성 강화 · 댓글/대댓글 추가 > 변경 전 / 변경 후 | auth-membership, community-post, review, visit-verification, moderation-reporting | server, app |
| CH-262 | 2501-2509 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 6. 리뷰 탭 — 리뷰 작성 강화 · 댓글/대댓글 추가 > UX 시나리오 1: 인증 의사가 본인 프로필 리뷰에 답글을 다는 흐름 | doctor-verification, community-post, review | server, app |
| CH-263 | 2510-2518 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 6. 리뷰 탭 — 리뷰 작성 강화 · 댓글/대댓글 추가 > UX 시나리오 2: 일반 환자가 다른 환자의 리뷰에 댓글을 다는 흐름 | community-post, review, visit-verification | server, app |
| CH-264 | 2519-2535 | H3 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 6. 리뷰 탭 — 리뷰 작성 강화 · 댓글/대댓글 추가 > 디자인 프로토타입 (참고) | auth-membership, doctor-verification, community-post, visit-verification, ui-feedback, common-system | server, app |
| CH-265 | 2536-2545 | H4 | 🔵 베타 단계 — 인증 완료 즉시 적용되는 변화 > 6. 리뷰 탭 — 리뷰 작성 강화 · 댓글/대댓글 추가 > 디자인 프로토타입 (참고) > 첨부 파일: indent_styled_revision.html | - | admin, app |
| CH-266 | 2546-2549 | H1 | 어드민 화면정의서 (외주) v1.2 | - | admin, app |
| CH-267 | 2550-2555 | H2 | 어드민 화면정의서 (외주) v1.2 > 개요 | community-post, review, moderation-reporting, mypage-support, common-system | admin, server, app, ai-runtime |
| CH-268 | 2556-2560 | H2 | 어드민 화면정의서 (외주) v1.2 > 사용자 정책과의 연결 (SSOT) | moderation-reporting, common-system, analytics-privacy-accessibility | admin, server, app |
| CH-269 | 2561-2565 | H2 | 어드민 화면정의서 (외주) v1.2 > 첨부 | - | app, ai-runtime |
| CH-270 | 2566-2581 | H4 | 어드민 화면정의서 (외주) v1.2 > 첨부 > 첨부 파일: AIGA_Admin_화면정의서_v1_2.docx | - | admin, app, ai-runtime |
| CH-271 | 2582-2583 | H1 | 1\. 문서 개요 | - | - |
| CH-272 | 2584-2594 | H2 | 1\. 문서 개요 > 1\.1 작성 목적 | common-system | admin, server, app, ai-runtime |
| CH-273 | 2595-2602 | H2 | 1\. 문서 개요 > 1\.2 적용 범위 | community-post, review, moderation-reporting, mypage-support, common-system | admin, server, app |
| CH-274 | 2603-2611 | H2 | 1\. 문서 개요 > 1\.3 작성 원칙 | review, visit-verification, common-system, analytics-privacy-accessibility | admin, server, app |
| CH-275 | 2612-2635 | H2 | 1\. 문서 개요 > 1\.4 사용자 권한 | auth-membership, common-system, analytics-privacy-accessibility | admin, server |
| CH-276 | 2636-2644 | H3 | 1\. 문서 개요 > 1\.4 사용자 권한 > 감사 로그 운영 정책 \(베타\) | auth-membership, doctor-verification, moderation-reporting, mypage-support, common-system, analytics-privacy-accessibility | admin, server, app |
| CH-277 | 2645-2646 | H1 | 2\. 정보 구조 \(IA\) | - | - |
| CH-278 | 2647-2784 | H2 | 2\. 정보 구조 \(IA\) > 2\.1 메뉴 구조 | auth-membership, doctor-verification, community-post, review, visit-verification, moderation-reporting, search, mypage-support, ui-feedback, common-system, analytics-privacy-accessibility | admin, server, app, ai-runtime |
| CH-279 | 2785-2788 | H2 | 2\. 정보 구조 \(IA\) > 2\.2 어드민 외부 처리 영역 | - | admin |
| CH-280 | 2789-2796 | H3 | 2\. 정보 구조 \(IA\) > 2\.2 어드민 외부 처리 영역 > 개발팀 DB 직접 처리 | doctor-verification, moderation-reporting, common-system | server |
| CH-281 | 2797-2802 | H3 | 2\. 정보 구조 \(IA\) > 2\.2 어드민 외부 처리 영역 > 외부 도구 | auth-membership | - |
| CH-282 | 2803-2810 | H3 | 2\. 정보 구조 \(IA\) > 2\.2 어드민 외부 처리 영역 > 시스템 자동 처리 \(운영자 개입 불필요\) | review, visit-verification, search | admin, server, app, ai-runtime |
| CH-283 | 2811-2840 | H2 | 2\. 정보 구조 \(IA\) > 2\.3 사용자·의사 데이터 관계 | auth-membership, doctor-verification, visit-verification, common-system | server, app, ai-runtime |
| CH-284 | 2841-2846 | H3 | 2\. 정보 구조 \(IA\) > 2\.3 사용자·의사 데이터 관계 > 어드민 동선 | doctor-verification, ui-feedback, common-system | admin, server, app |
| CH-285 | 2847-2850 | H1 | 3\. 화면 상세 정의 | moderation-reporting, common-system | admin, server, app |
| CH-286 | 2851-2852 | H2 | 3\. 화면 상세 정의 > 3\.1 대시보드 | - | - |
| CH-287 | 2853-2856 | H3 | 3\. 화면 상세 정의 > 3\.1 대시보드 > 화면 목적 | auth-membership, analytics-privacy-accessibility | admin, app |
| CH-288 | 2857-2862 | H3 | 3\. 화면 상세 정의 > 3\.1 대시보드 > 주요 컴포넌트 | moderation-reporting, common-system | admin, app |
| CH-289 | 2863-2876 | H3 | 3\. 화면 상세 정의 > 3\.1 대시보드 > 주요 액션 / 상태 | common-system | app |
| CH-290 | 2877-2881 | H3 | 3\. 화면 상세 정의 > 3\.1 대시보드 > 운영 정책 | doctor-verification, community-post, review, moderation-reporting, common-system | admin, server, app |
| CH-291 | 2882-2883 | H2 | 3\. 화면 상세 정의 > 3\.2 신고 처리 | moderation-reporting | admin |
| CH-292 | 2884-2887 | H3 | 3\. 화면 상세 정의 > 3\.2 신고 처리 > 화면 목적 | community-post, review, moderation-reporting | app |
| CH-293 | 2888-2894 | H3 | 3\. 화면 상세 정의 > 3\.2 신고 처리 > 주요 컴포넌트 | community-post, review, moderation-reporting, search, ui-feedback, common-system, analytics-privacy-accessibility | app |
| CH-294 | 2895-2906 | H3 | 3\. 화면 상세 정의 > 3\.2 신고 처리 > 행 펼침/접힘 \(UI 상세\) | auth-membership, community-post, review, visit-verification, moderation-reporting, ui-feedback, common-system | server, app |
| CH-295 | 2907-2920 | H3 | 3\. 화면 상세 정의 > 3\.2 신고 처리 > 주요 액션 | moderation-reporting, ui-feedback, analytics-privacy-accessibility | app |
| CH-296 | 2921-2927 | H3 | 3\. 화면 상세 정의 > 3\.2 신고 처리 > 운영 정책 | review, visit-verification, moderation-reporting, search, common-system | admin, server, app |
| CH-297 | 2928-2929 | H2 | 3\. 화면 상세 정의 > 3\.3 커뮤니티 관리 | community-post | app |
| CH-298 | 2930-2933 | H3 | 3\. 화면 상세 정의 > 3\.3 커뮤니티 관리 > 화면 목적 | community-post, moderation-reporting | app |
| CH-299 | 2934-2940 | H3 | 3\. 화면 상세 정의 > 3\.3 커뮤니티 관리 > 주요 컴포넌트 | community-post, search, common-system | app |
| CH-300 | 2941-2949 | H3 | 3\. 화면 상세 정의 > 3\.3 커뮤니티 관리 > 행 펼침/접힘 \(UI 상세\) | auth-membership, community-post, moderation-reporting, common-system | ai-runtime |
| CH-301 | 2950-2957 | H3 | 3\. 화면 상세 정의 > 3\.3 커뮤니티 관리 > 병원 진료 인증 배지 \(UI 상세\) | auth-membership, community-post, visit-verification, moderation-reporting | admin, server |
| CH-302 | 2958-2975 | H3 | 3\. 화면 상세 정의 > 3\.3 커뮤니티 관리 > 주요 액션 / 상태 | community-post, moderation-reporting, search, ui-feedback, common-system, analytics-privacy-accessibility | app |
| CH-303 | 2976-2982 | H3 | 3\. 화면 상세 정의 > 3\.3 커뮤니티 관리 > 운영 정책 | community-post, review, moderation-reporting, common-system, analytics-privacy-accessibility | admin, server, app |
| CH-304 | 2983-2984 | H2 | 3\. 화면 상세 정의 > 3\.4 홈탭 운영 | - | admin, app |
| CH-305 | 2985-2988 | H3 | 3\. 화면 상세 정의 > 3\.4 홈탭 운영 > 화면 목적 | community-post | app, ai-runtime |
| CH-306 | 2989-2996 | H3 | 3\. 화면 상세 정의 > 3\.4 홈탭 운영 > 화면 구조 \- 서브탭 3종 | community-post, common-system | app, ai-runtime |
| CH-307 | 2997-3000 | H3 | 3\. 화면 상세 정의 > 3\.4 홈탭 운영 > 3\.4\.1 상단 배너 | - | app |
| CH-308 | 3001-3012 | H3 | 3\. 화면 상세 정의 > 3\.4 홈탭 운영 > 화면 구성 — 좌측: 배너 카드 목록 | ui-feedback, common-system | app |
| CH-309 | 3013-3026 | H3 | 3\. 화면 상세 정의 > 3\.4 홈탭 운영 > \[\+ 배너 추가\] 모달 \(배너 작성\) | ui-feedback, common-system | app |
| CH-310 | 3027-3032 | H3 | 3\. 화면 상세 정의 > 3\.4 홈탭 운영 > \[수정\] 모달 \(배너 수정\) | moderation-reporting, search, ui-feedback, analytics-privacy-accessibility | app |
| CH-311 | 3033-3038 | H3 | 3\. 화면 상세 정의 > 3\.4 홈탭 운영 > 화면 구성 — 우측: 사용자 앱 미리보기 패널 | - | app |
| CH-312 | 3039-3044 | H3 | 3\. 화면 상세 정의 > 3\.4 홈탭 운영 > 운영 정책 | moderation-reporting, common-system | admin, server |
| CH-313 | 3045-3048 | H3 | 3\. 화면 상세 정의 > 3\.4 홈탭 운영 > 3\.4\.2 주요 질환 인기 명의 | community-post | app |
| CH-314 | 3049-3053 | H3 | 3\. 화면 상세 정의 > 3\.4 홈탭 운영 > 화면 구성 — 상단 액션 바 | community-post, ui-feedback | app |
| CH-315 | 3054-3066 | H3 | 3\. 화면 상세 정의 > 3\.4 홈탭 운영 > 화면 구성 — 질환 카드 \(각 카드\) | community-post, search, ui-feedback | server, app, ai-runtime |
| CH-316 | 3067-3081 | H3 | 3\. 화면 상세 정의 > 3\.4 홈탭 운영 > \[\+ 질환 추가\] 모달 | community-post, search, ui-feedback | app, ai-runtime |
| CH-317 | 3082-3097 | H3 | 3\. 화면 상세 정의 > 3\.4 홈탭 운영 > \[\+ 의사 추가\] 모달 \(각 질환 카드 내\) | community-post, review, search, ui-feedback | server, app, ai-runtime |
| CH-318 | 3098-3103 | H3 | 3\. 화면 상세 정의 > 3\.4 홈탭 운영 > 의사 칩 제거 \(\[×\] 버튼\) | community-post, search, ui-feedback | app |
| CH-319 | 3104-3110 | H3 | 3\. 화면 상세 정의 > 3\.4 홈탭 운영 > 질환 제거 \(\[🗑\] 버튼\) | community-post, ui-feedback, common-system | app |
| CH-320 | 3111-3117 | H3 | 3\. 화면 상세 정의 > 3\.4 홈탭 운영 > 정렬 모드 토글 \(\[수동\] / \[자동\]\) | community-post, review, search, ui-feedback | server, app |
| CH-321 | 3118-3123 | H3 | 3\. 화면 상세 정의 > 3\.4 홈탭 운영 > 운영 정책 | doctor-verification, community-post, moderation-reporting, common-system | admin, server, app, ai-runtime |
| CH-322 | 3124-3127 | H3 | 3\. 화면 상세 정의 > 3\.4 홈탭 운영 > 3\.4\.3 추천 게시글 | community-post | app, ai-runtime |
| CH-323 | 3128-3132 | H3 | 3\. 화면 상세 정의 > 3\.4 홈탭 운영 > 화면 구성 — 상단 액션 바 | community-post, search, ui-feedback | app, ai-runtime |
| CH-324 | 3133-3142 | H3 | 3\. 화면 상세 정의 > 3\.4 홈탭 운영 > 화면 구성 — 추천 게시글 테이블 | auth-membership, community-post, search, ui-feedback | server, app, ai-runtime |
| CH-325 | 3143-3157 | H3 | 3\. 화면 상세 정의 > 3\.4 홈탭 운영 > \[게시글 검색 추가\] 모달 | community-post, moderation-reporting, search, ui-feedback | server, app, ai-runtime |
| CH-326 | 3158-3163 | H3 | 3\. 화면 상세 정의 > 3\.4 홈탭 운영 > 게시글 제거 \(\[제거\] 버튼\) | community-post, ui-feedback | app, ai-runtime |
| CH-327 | 3164-3170 | H3 | 3\. 화면 상세 정의 > 3\.4 홈탭 운영 > 운영 정책 | community-post, moderation-reporting, common-system | admin, server, app |
| CH-328 | 3171-3172 | H2 | 3\. 화면 상세 정의 > 3\.5 공지사항 관리 | mypage-support | - |
| CH-329 | 3173-3176 | H3 | 3\. 화면 상세 정의 > 3\.5 공지사항 관리 > 화면 목적 | mypage-support | app |
| CH-330 | 3177-3183 | H3 | 3\. 화면 상세 정의 > 3\.5 공지사항 관리 > 화면 구성 | ui-feedback, common-system | app, ai-runtime |
| CH-331 | 3184-3215 | H3 | 3\. 화면 상세 정의 > 3\.5 공지사항 관리 > 공지 분류 4종 | moderation-reporting, mypage-support, common-system, analytics-privacy-accessibility | admin, server, ai-runtime |
| CH-332 | 3216-3233 | H3 | 3\. 화면 상세 정의 > 3\.5 공지사항 관리 > \[\+ 공지 작성\] / \[수정\] 통합 모달 | moderation-reporting, ui-feedback, common-system, analytics-privacy-accessibility | server, app, ai-runtime |
| CH-333 | 3234-3238 | H3 | 3\. 화면 상세 정의 > 3\.5 공지사항 관리 > 우측 미리보기 패널 | - | app |
| CH-334 | 3239-3276 | H3 | 3\. 화면 상세 정의 > 3\.5 공지사항 관리 > 주요 액션 요약 | moderation-reporting, search, ui-feedback, common-system | app, ai-runtime |
| CH-335 | 3277-3278 | H2 | 3\. 화면 상세 정의 > 3\.6 의견 보내기 | - | - |
| CH-336 | 3279-3282 | H3 | 3\. 화면 상세 정의 > 3\.6 의견 보내기 > 화면 목적 | - | app |
| CH-337 | 3283-3290 | H3 | 3\. 화면 상세 정의 > 3\.6 의견 보내기 > 화면 구성 | common-system | app, ai-runtime |
| CH-338 | 3291-3302 | H3 | 3\. 화면 상세 정의 > 3\.6 의견 보내기 > 행 클릭 → 의견 상세 모달 \(UI 상세\) | ui-feedback, common-system, analytics-privacy-accessibility | admin, app |
| CH-339 | 3303-3328 | H3 | 3\. 화면 상세 정의 > 3\.6 의견 보내기 > 주요 액션 | ui-feedback, common-system | app |
| CH-340 | 3329-3334 | H3 | 3\. 화면 상세 정의 > 3\.6 의견 보내기 > 운영 정책 | moderation-reporting, common-system | admin, server |
| CH-341 | 3335-3336 | H2 | 3\. 화면 상세 정의 > 3\.7 의사 후기 관리 | review | - |
| CH-342 | 3337-3340 | H3 | 3\. 화면 상세 정의 > 3\.7 의사 후기 관리 > 화면 목적 | community-post, review, moderation-reporting | app |
| CH-343 | 3341-3348 | H3 | 3\. 화면 상세 정의 > 3\.7 의사 후기 관리 > 화면 구성 | community-post, review, moderation-reporting, search, ui-feedback, common-system | server, app |
| CH-344 | 3349-3362 | H3 | 3\. 화면 상세 정의 > 3\.7 의사 후기 관리 > 행 펼침/접힘 \(UI 상세\) | doctor-verification, community-post, review, visit-verification, moderation-reporting | server, ai-runtime |
| CH-345 | 3363-3368 | H3 | 3\. 화면 상세 정의 > 3\.7 의사 후기 관리 > 신고 정보 표시 | review, moderation-reporting | - |
| CH-346 | 3369-3394 | H3 | 3\. 화면 상세 정의 > 3\.7 의사 후기 관리 > 주요 액션 | community-post, review, moderation-reporting, search, ui-feedback | server, app |
| CH-347 | 3395-3402 | H3 | 3\. 화면 상세 정의 > 3\.7 의사 후기 관리 > §3\.2 신고 처리와의 관계 | review, visit-verification, moderation-reporting, common-system, analytics-privacy-accessibility | admin, server |
| CH-348 | 3403-3404 | H2 | 3\. 화면 상세 정의 > 3\.8 의사 관리 | - | - |
| CH-349 | 3405-3408 | H3 | 3\. 화면 상세 정의 > 3\.8 의사 관리 > 화면 목적 | doctor-verification, common-system | admin, server, app |
| CH-350 | 3409-3416 | H3 | 3\. 화면 상세 정의 > 3\.8 의사 관리 > 화면 구성 | doctor-verification, search, ui-feedback, common-system | server, app |
| CH-351 | 3417-3434 | H3 | 3\. 화면 상세 정의 > 3\.8 의사 관리 > \[편집\] 모달 구조 \(5개 섹션\) | doctor-verification, community-post, review, search, ui-feedback, common-system | admin, server, app, ai-runtime |
| CH-352 | 3435-3441 | H3 | 3\. 화면 상세 정의 > 3\.8 의사 관리 > \[인증 취소\] 확인 모달 | ui-feedback, common-system | server, app |
| CH-353 | 3442-3447 | H3 | 3\. 화면 상세 정의 > 3\.8 의사 관리 > 운영 정책 | doctor-verification, review, moderation-reporting, common-system | admin, server |
| CH-354 | 3448-3449 | H2 | 3\. 화면 상세 정의 > 3\.9 의사 정보 수정 요청 | - | - |
| CH-355 | 3450-3453 | H3 | 3\. 화면 상세 정의 > 3\.9 의사 정보 수정 요청 > 화면 목적 | review | app |
| CH-356 | 3454-3463 | H3 | 3\. 화면 상세 정의 > 3\.9 의사 정보 수정 요청 > 화면 구성 — 카드 리스트 | search, ui-feedback, common-system | server, app |
| CH-357 | 3464-3499 | H3 | 3\. 화면 상세 정의 > 3\.9 의사 정보 수정 요청 > 주요 액션 3종 | doctor-verification, ui-feedback, common-system | admin, server, app |
| CH-358 | 3500-3505 | H3 | 3\. 화면 상세 정의 > 3\.9 의사 정보 수정 요청 > 운영 정책 | moderation-reporting, common-system | admin, server, app |
| CH-359 | 3506-3507 | H2 | 3\. 화면 상세 정의 > 3\.10 사용자 관리 | - | - |
| CH-360 | 3508-3511 | H3 | 3\. 화면 상세 정의 > 3\.10 사용자 관리 > 화면 목적 | auth-membership, search | app |
| CH-361 | 3512-3519 | H3 | 3\. 화면 상세 정의 > 3\.10 사용자 관리 > 화면 구성 | auth-membership, doctor-verification, visit-verification, moderation-reporting, search, common-system | server, app |
| CH-362 | 3520-3535 | H3 | 3\. 화면 상세 정의 > 3\.10 사용자 관리 > 행 클릭 → 정상 사용자 상세 모달 \(UI 상세\) | auth-membership, doctor-verification, community-post, review, visit-verification, moderation-reporting, ui-feedback, common-system, analytics-privacy-accessibility | admin, server, app |
| CH-363 | 3536-3541 | H3 | 3\. 화면 상세 정의 > 3\.10 사용자 관리 > 행 클릭 → 탈퇴 사용자 상세 모달 \(UI 상세\) | auth-membership, community-post, review, visit-verification, moderation-reporting, ui-feedback, analytics-privacy-accessibility | server, app |
| CH-364 | 3542-3548 | H3 | 3\. 화면 상세 정의 > 3\.10 사용자 관리 > 운영 정책 | auth-membership, doctor-verification, community-post, moderation-reporting, ui-feedback, common-system, analytics-privacy-accessibility | admin, server, app |
| CH-365 | 3549-3550 | H2 | 3\. 화면 상세 정의 > 3\.11 운영 정책 설정 | moderation-reporting, common-system | admin, server |
| CH-366 | 3551-3554 | H3 | 3\. 화면 상세 정의 > 3\.11 운영 정책 설정 > 화면 목적 | community-post, review, moderation-reporting, common-system | admin, server, app, ai-runtime |
| CH-367 | 3555-3560 | H3 | 3\. 화면 상세 정의 > 3\.11 운영 정책 설정 > 화면 구성 | community-post, review, moderation-reporting, ui-feedback, common-system, analytics-privacy-accessibility | admin, server, app |
| CH-368 | 3561-3566 | H3 | 3\. 화면 상세 정의 > 3\.11 운영 정책 설정 > \[저장\] 동작 | moderation-reporting, ui-feedback, common-system | admin, server, app |
| CH-369 | 3567-3572 | H3 | 3\. 화면 상세 정의 > 3\.11 운영 정책 설정 > 입력 검증 | ui-feedback | admin, app |
| CH-370 | 3573-3587 | H3 | 3\. 화면 상세 정의 > 3\.11 운영 정책 설정 > 운영 정책 | community-post, review, moderation-reporting, ui-feedback, common-system, analytics-privacy-accessibility | admin, server, app |

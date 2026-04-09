# COS v2 Checkpoint — 2026-04-09 Session 2

## Branch: master @ `07d46995`

## 이 세션에서 한 것

### 1. 사이드바 구조 개편 (`106ca2d3`)
- Routines → **Cycles** 이름 변경, Work 섹션으로 이동
- **Approvals** Work 섹션에 추가
- 팀 서브메뉴: Issues, Projects, Docs만 (Routines/Approvals 제거)
- **CLI alive 초록 점**: leader_processes 폴링 → 에이전트 online 상태 표시
- **Room 생성 모달**: 페이지 이동 → 프로젝트와 동일한 모달 패턴
- **팀 Git Repository 설정**: teams.settings.githubRepoUrl UI

### 2. 팀별 Issue 생성 수정 (`6a1c8eb8`)
- NewIssueDialog에 teamId 전달 (팀 Issues 페이지에서 만들면 해당 팀 소속)
- 전역 Issues 페이지에 Team 필터 추가 (Filter 팝오버)
- IssueViewState에 teams[] 필터 추가

### 3. Room 채팅 UX (`5ef4546a`, `b0d92061`, `07d46995`)
- 내 메시지 우측 정렬 (블록 우측, 텍스트 좌측)
- 에이전트/시스템 메시지 좌측 아바타 유지
- @멘션 파란색, 이슈 ID(DOG-1) 보라색 하이라이트

### 4. Room 동작 테스트 (코드 변경 없음)
- Cyrus CLI 응답: PASS (@멘션 → 12초 내 응답)
- Hana CLI 응답: PASS
- 동시 멘션 (@Cyrus@Hana): PASS — 둘 다 응답
- 에이전트 간 대화: PASS — Cyrus → @Hana → Hana 응답
- 이슈 조회 대화: PARTIAL — CLI에 Paperclip issue MCP 도구 미등록

## 알려진 이슈

| 이슈 | 심각도 | 설명 |
|------|--------|------|
| CLI에 issue MCP 미등록 | Medium | 에이전트가 room에서 이슈 데이터를 직접 조회 불가, 별도 MCP 서버 추가 필요 |
| sidebar New Issue는 teamId 없음 | Low | sidebar의 "New Issue" 버튼은 전역 컨텍스트라 teamId 미전달 (정상 동작이지만 UX 혼동 가능) |
| BBR-5, BBR-6 teamId=null | Low | 코드 수정 전에 만든 이슈, 수동 patch 필요 |

## 다음 작업 후보
- CLI에 Paperclip API MCP 서버 추가 (이슈 조회/업데이트)
- QA Phase A~D 본격 실행
- sidebar New Issue에 현재 팀 컨텍스트 자동 감지

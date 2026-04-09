# COS v2 QA Playbook — Playwright

> 이 문서는 Sonnet + Playwright MCP로 실행하도록 설계됐습니다.
> Opus는 설계/리뷰에, Sonnet은 반복 QA에.

## 전제 조건

1. 서버가 `http://127.0.0.1:3101`에서 동작 중 (체크: `GET /api/health`)
2. 회사 `BBrightcode Corp` (prefix `BBR`) 존재
3. 리더 에이전트 Cyrus + Hana CLI 둘 다 running 상태면 이상적 (live
   Claude 테스트용). 없으면 CLI 테스트는 skip하고 UI 렌더만 검증.
4. **Playwright MCP 도구 사용**: `mcp__plugin_playwright_playwright__browser_*`
   - `browser_navigate(url)`
   - `browser_snapshot()` — accessibility tree dump, element ref 제공
   - `browser_click(ref)`, `browser_type(ref, text)`, `browser_fill_form`
   - `browser_press_key("Enter")`
   - `browser_evaluate(function)` — JS 실행
   - `browser_take_screenshot(path)` — 문제 발생 시 증거 수집

## 원칙

1. **모든 시나리오는 브라우저에서 실행** — API 직접 호출 금지. 단,
   **상태 확인**(DB에서 값 확인)은 `curl` 혹은 `browser_evaluate(fetch)`
   허용.
2. **각 시나리오 실패 시 screenshot + 경로 기록 + 다음 시나리오 진행**
   (한 시나리오 실패로 전체 중단 금지).
3. **결과 리포트는 `docs/cos-v2/qa-report-<YYYYMMDD>.md`에 append**.
   형식:
   ```
   ## [시나리오 ID] Title
   **Status**: ✅ PASS / ❌ FAIL / ⏭ SKIP
   **Steps executed**: N/M
   **Notes**: 
   **Screenshot**: (if failed) /tmp/cos-qa-<id>-<ts>.png
   ```
4. **반복**: 전체 시나리오를 1회 완주 후, 사용자가 fix 한 것이 있으면
   재실행. 3회 이상 돌려서 intermittent 이슈도 잡기.

## 시나리오

### S01 — 서버 헬스 + 초기 탐색

1. `browser_navigate("http://127.0.0.1:3101/BBR/dashboard")`
2. `browser_snapshot()` — sidebar 존재 확인
3. 사이드바의 모든 top-level 링크 (`Dashboard`, `Inbox`, `Issues`,
   `Routines`, `Goals`, `Teams`, `Rooms`, `Projects`, `Agents`, `Org`,
   `Recruiting`, `Skills`, `Costs`, `Activity`, `Settings`) 각각 클릭
   → 페이지 로드 + 헤딩 렌더 확인 → 실패 시 screenshot
4. 팀 sidebar sub-menu: `Dogfood` 확장 → 4개 링크 (`Issues`,
   `Projects`, `Routines`, `Approvals`, `Docs`) 전부 클릭해서 로드 확인

### S02 — Team CRUD

1. 사이드바 Teams → "New team" 클릭
2. 폼에 `Name: QA Team` / `Identifier: QAT` / 설명 입력 → Create
3. `/teams/<id>/settings`로 이동
4. **Workflow Statuses**: 새 status `Review` 추가 (name + slug)
5. **Members**: 드롭다운에서 에이전트 하나 선택 → Add
6. 팀 이름 edit → "QA Dogfood Team"으로 변경 → 저장
7. 사이드바에서 `QAT` 표시 확인
8. Settings → Delete 버튼 클릭 → 확인 dialog → 삭제
9. 사이드바에서 사라진 것 확인

### S03 — Issue CRUD + 라벨 + 관계

1. `/BBR/issues` → "New Issue" 클릭
2. 폼: `Title: "QA smoke test"`, `Team: Dogfood`, `Priority: high`
3. Create → DOG-N 식별자 발급 확인
4. 생성된 이슈 클릭 → detail 페이지
5. **Status 전이**: todo → in_progress → done (각 전이 시 timeline 업데이트)
6. **Label 추가**: Properties 패널 Labels → "+" → 새 label 생성 → 붙이기
7. **Relation**: "Blocked by" → 기존 DOG-1 선택 → 추가 → detail에 표시
8. **Comment**: 본문 하단에 "QA verification" 코멘트 작성 → Comment 클릭
9. Timeline에 comment 등장 확인
10. 이슈 삭제 (팀에서 제거)

### S04 — Team Docs (Wiki)

1. `/teams/<DOG>/docs` 이동
2. "New doc" → title + key 입력 → Create
3. MDX 에디터에서 마크다운 작성 (헤딩, 리스트, 링크)
4. Save → rev 증가 확인 (`rev 1` → `rev 2`)
5. 뒤로 가서 doc 리스트에 표시 확인
6. 삭제

### S05 — Projects + Milestone + Health

1. `/BBR/projects` → "New project"
2. 이름/설명 입력 → Create
3. 상세 페이지 "Overview" 탭
4. **Teams** 섹션: 드롭다운에서 2개 팀 선택 → Add
5. **Members** 섹션: 에이전트 → Add
6. **Milestones**: 이름 + dueDate 입력 → Add → 리스트에 표시
7. **Health Updates**: 드롭다운 `on_track` 선택 → 코멘트 "Initial" → Add
   → 리스트에 표시
8. 프로젝트 Issues 탭 이동 → "New Issue" → milestone 선택 후 저장
9. 생성된 issue가 milestone에 attached 확인

### S06 — Rooms + 메시지

1. `/BBR/rooms` → "New room"
2. 이름 `qa-test-room` + 설명 → Create
3. **참여자**: 사이드바에서 에이전트 추가 → 리스트에 등장
4. **Text 메시지**: 하단 입력 → Enter → 타임라인에 등장
5. **첨부파일**: 버튼 클릭 → 파일 선택 (작은 png 추천) → upload →
   메시지 body에 이미지 나타남
6. **Reply**: 기존 메시지에 대한 reply 전송 → thread 확인
7. **Action 메시지**: type 드롭다운 action 선택 → target agent 선택 →
   body → Send → Timeline에 action 카드 + "Mark executed"/"Mark failed"
   버튼 확인
8. **Mark executed** 클릭 → status 전환 확인
9. **Action with approval**: action + "Require approval" 체크박스 체크
   → body → Send → 카드에 "⏸ awaiting approval" 배지 + Mark executed
   disabled + "View approval →" 링크 확인
10. 참여자 제거 → 사라진 것 확인
11. Room 아카이브

### S07 — Rooms: Live Claude reply (Cyrus/Hana CLI running 일 때만)

1. `/BBR/rooms/<dogfood-lounge>` 이동 (Cyrus + Hana 참여중)
2. `@Cyrus Reply with PLAYWRIGHT-QA-CY only.` 전송
3. **30초 대기** (live Claude)
4. 타임라인에 Cyrus의 "PLAYWRIGHT-QA-CY" 메시지 확인
5. `@Hana Reply with PLAYWRIGHT-QA-HN only.` 전송
6. 30초 대기 → Hana 응답 확인
7. `@Cyrus@Hana Reply ROUTE-BOTH.` 전송
8. 60초 대기 → 둘 다 응답 확인
9. 실패 시 screenshot + 스킵

### S08 — Team Routines (Cycles)

1. `/teams/<DOG>/routines` → "New routine"
2. Title "QA Daily Check", description, Owner: Cyrus (leader) → Create
3. `/routines/<id>` detail 페이지로 navigate
4. **Schedule trigger**: cron `0 9 * * *`, timezone `Asia/Seoul` → Add
5. **Run Now** 버튼 클릭 → routine run 생성
6. Linked issue 확인
7. 뒤로 돌아가서 목록에 "1 schedule, next: ..." 표시 확인

### S09 — Team Approvals

1. **Setup**: 브라우저 `browser_evaluate`로 API 호출해 hire_agent
   approval 1개 생성 (linked to DOG-1):
   ```js
   await fetch('/api/companies/<CID>/approvals', {
     method: 'POST',
     headers: {'Content-Type':'application/json'},
     body: JSON.stringify({
       type: 'hire_agent',
       payload: { name: 'QA Candidate' },
       issueIds: ['<DOG-1 uuid>']
     })
   })
   ```
2. `/teams/<DOG>/approvals` 이동
3. "Team Approvals" + "Pending N" 뱃지 확인
4. Approval card 표시 확인
5. **Approve** 버튼 클릭 → detail 페이지로 navigate 확인 (`?resolved=approved`)
6. 뒤로 → Pending 탭 N-1, All 탭에 approved 상태로 등장
7. ENG3 팀 페이지 이동 → "No pending approvals" 확인 (isolation)

### S10 — Recruiting

1. 사이드바 Company → Recruiting
2. "Propose new agent" 클릭
3. 폼: Name "QA Playwright Agent", Role "qa_bot", adapter process, budget 0
4. "Submit for approval" 클릭
5. Pending hires 리스트에 등장
6. "Recently decided"에 이전 hire가 있으면 표시
7. **Approve** 클릭 → detail 페이지
8. 뒤로 → Pending 감소, Recently decided에 approved
9. `/BBR/agents` 로 이동 → 새 에이전트가 idle 상태로 표시 확인

### S11 — GitHub PR webhook (API-driven but UI-verified)

1. `browser_evaluate`로 PR webhook POST:
   ```js
   const body = JSON.stringify({
     action: 'opened',
     pull_request: {
       number: 999, title: 'Fix DOG-1 playwright test',
       body: 'Closes DOG-1', state: 'open', merged: false,
       html_url: 'https://github.com/qa/repo/pull/999',
       user: { login: 'qa-bot' },
     },
     repository: { full_name: 'qa/repo' },
   });
   // HMAC 계산은 어려우므로 이 시나리오는 환경변수 GITHUB_WEBHOOK_SECRET 아는 경우만
   ```
2. `/BBR/issues/DOG-1` 이동
3. "Work Products" 카드 확인 — PR 링크 + "open" 배지
4. (웹훅 2) merged 이벤트 보내기
5. DOG-1 페이지 reload → 상태 `Done` 확인, Work Product badge "merged"

### S12 — Agent Detail 모든 탭

1. `/BBR/agents/cyrus/dashboard`
2. 탭 전환 — Dashboard / Instructions / Skills / Configuration /
   Runs / Budget 각각 클릭 → 로드 확인
3. Instructions 탭 → "Leader CLI Instructions" 카드 찾기
4. 8-섹션 markdown 렌더링 확인 (`# You are Cyrus`, `## 1. Your role`,
   `## 7. Rooms`, `## 8. Teams` 포함)
5. CLI Process 카드 → Start/Stop/Restart 버튼 접근 가능 확인
6. Teams 섹션 확인

### S13 — Org Chart

1. `/BBR/org`
2. 에이전트 카드들 렌더링 확인
3. Cyrus 카드에 팀 색 도트 + ENG3 identifier 뱃지 + "lead" 마커 확인

### S14 — Search / Inbox / Activity

1. `/BBR/inbox` → 리스트 렌더
2. `/BBR/activity` → 로그 렌더
3. `/BBR/costs` → 페이지 로드
4. `/BBR/goals` → 리스트
5. `/BBR/skills` → 리스트
6. 각 페이지에 heading과 empty state 또는 데이터 확인

### S15 — 반복 루프

모든 S01-S14를 1회 완주 후, 아래 변경:
1. 새 탭을 열어 **동일 시나리오 재실행** — race condition 발견
2. 브라우저 뒤로/앞으로 버튼 사용 — navigation state 검증
3. 페이지 새로고침 (F5) 후 상태 유지 확인

## QA 리포트 템플릿

```markdown
# COS v2 QA Report — YYYY-MM-DD

Environment:
- Server: http://127.0.0.1:3101
- Branch: master @ <commit>
- Cyrus CLI: running / stopped
- Hana CLI: running / stopped

Results summary: X / 15 PASS

## S01 — 서버 헬스 + 초기 탐색
Status: ✅ PASS
All 15 top-level links loaded. No console errors.

## S02 — Team CRUD
Status: ❌ FAIL
Step 5 (Add member) — dropdown options didn't load.
Screenshot: /tmp/cos-qa-s02-1712345678.png
Console error: `queryKey undefined`

...
```

## 버그 발견 시 즉시 기록 항목

1. **재현 스텝** (1, 2, 3, ... 순서대로)
2. **기대 동작** vs **실제 동작**
3. **Screenshot** (`browser_take_screenshot`)
4. **Console errors** (`browser_console_messages`)
5. **Network log** (`browser_network_requests`) — 실패한 API call 포함
6. **DB 상태** (필요 시 `browser_evaluate`로 fetch해서 확인)

버그는 `qa-report` 파일에 수집. 하드닝이 필요하면 Opus 세션으로 넘김.

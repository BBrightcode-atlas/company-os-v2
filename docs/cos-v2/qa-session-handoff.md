# COS v2 QA 세션 Handoff

> 이 문서를 읽으면 context 없이도 QA 세션을 바로 시작할 수 있다.
> 작성: 2026-04-09, Phase 5 전체 완료 직후.

## 현재 상태

### 완료된 것 (push 완료, origin/master)

| Phase | 내용 | 커밋 수 |
|-------|------|---------|
| 1 | Teams + Workflow + Sub-agents | 9 sub-unit |
| 2 | Multi-team projects + milestones + health | 4 |
| 3a/b | Mission rooms + 채팅 UI + action messages + 300ms polling | 6 |
| 팀 재설계 | Linear 패턴 (Issues/Projects/Docs/Routines/Approvals) | 5 |
| 4 | Leader CLI (PM2 + MCP channel-bridge + SSE) | 14 |
| 5.1 | Claude prompt tuning (8-섹션 instructions + sanitizer) | 2 |
| 5.2a | Multi-leader mention routing (서버 hard guard) | 2 |
| 5.2b | Team routines (cycles) — migration 0066 | 2 |
| 5.2c | Team approvals queue | 2 |
| 5.2d | GitHub PR webhook → issue auto-sync | 1 |
| 5.2e | Recruiting (hire proposal UI) | 1 |
| 5.2f | Action message ↔ approval gate — migration 0067+0068 | 1 |
| hardening | 5.2d/e/f review 10 findings | 1 |
| UI polish | requiresApproval checkbox + badge | 1 |
| docs | progress + QA playbook | 2 |

**총 16 커밋** push 완료 (`068fe737..4fd86e67`).

### 서버 환경

```
Repo: /Users/bright/Projects/company-os-v2
Branch: master
Server: pnpm dev:once → http://127.0.0.1:3101
Port: 3101 (worktree config)
DB: Embedded PostgreSQL, port 54330
Company: BBrightcode Corp (prefix BBR)
Company ID: 7ff1f5d1-d3cc-4411-a77c-442b50d50e57
```

**서버 시작 방법**:
```bash
cd /Users/bright/Projects/company-os-v2
# 1. Stale process 정리
pkill -9 -f "tsx.*company-os-v2/server/src/index" 2>/dev/null
sleep 2
rm -f paperclip-worktrees-43xupE/instances/pap-885-show-worktree-banner/db/postmaster.pid
# 2. 시작 (GitHub webhook secret 포함)
GITHUB_WEBHOOK_SECRET=testsecret123 pnpm dev:once > /tmp/paperclip-dev.log 2>&1 &
# 3. 20초 대기 후 헬스 체크
sleep 20 && curl -s http://127.0.0.1:3101/api/health
```

### CLI 리더 에이전트

| Agent | ID (앞 8자) | Adapter | Team |
|-------|-------------|---------|------|
| Cyrus | f2bfc3fa | claude_local | ENG3 Engine + DOG Dogfood + RLS Release |
| Hana | e205c2c7 | claude_local | FLT Flotter |

**CLI 시작**:
```bash
CID=7ff1f5d1-d3cc-4411-a77c-442b50d50e57
# Cyrus
curl -s -X POST "http://127.0.0.1:3101/api/companies/$CID/agents/f2bfc3fa-c0fc-4a05-9e69-38307d3689a7/cli/start" \
  -H "Content-Type: application/json" -d '{}'
# Hana
curl -s -X POST "http://127.0.0.1:3101/api/companies/$CID/agents/e205c2c7-5fab-43c6-9406-48ff0bf97f2e/cli/start" \
  -H "Content-Type: application/json" -d '{}'
```

CLI 부팅에 ~15초 소요. `pty-runner`가 workspace trust 프롬프트를 자동 Enter.

### 데이터 상태 (현재 DB)

| Entity | 예시 데이터 |
|--------|-------------|
| Teams (8) | DOG (Dogfood), ENG3 (Engine), PLT3 (Platform), GRW (Growth), QA, COM (OS), FLT (Flotter), SB (Superbuilder), RLS (Release) |
| Agents (18+) | 7 leaders (Sophia,Hana,Cyrus,Felix,LunaLead,Iris,Rex) + 11 sub-agents + dogfooding으로 추가된 hire agents |
| Rooms (3+) | engine-standup, dogfood-lounge (Cyrus+Hana 참여), + 기타 |
| Issues | DOG-1~4, RLS-1 (done), 기타 테스트 issue |
| Routines | "Daily engine standup" (DOG, cron 9am), "Weekly QA retro" (DOG), "Daily release checklist" (RLS) |
| Approvals | 여러 개 (hire_agent, action_execution) — 대부분 approved |
| Work Products | DOG-1에 GitHub PR 링크 (merged), RLS-1에 PR 링크 (merged) |

### 사이드바 구조

```
BBrightcode Corp
├── Dashboard
├── Inbox
├── Work
│   ├── Issues
│   ├── Routines (Beta)
│   └── Goals
├── Teams (각 팀마다 sub-menu)
│   ├── Issues
│   ├── Projects
│   ├── Routines
│   ├── Approvals
│   └── Docs
├── Rooms
│   ├── engine-standup
│   └── dogfood-lounge
├── Projects
├── Agents (18+)
├── Company
│   ├── Org
│   ├── Recruiting      ← Phase 5.2e
│   ├── Skills
│   ├── Costs
│   ├── Activity
│   └── Settings
```

## QA 실행 계획

### 도구

**Playwright MCP** (이미 사용 가능):
- `mcp__plugin_playwright_playwright__browser_navigate(url)`
- `mcp__plugin_playwright_playwright__browser_snapshot()` — accessibility tree, @ref 제공
- `mcp__plugin_playwright_playwright__browser_click(element="@refN")`
- `mcp__plugin_playwright_playwright__browser_type(element="@refN", text="...")`
- `mcp__plugin_playwright_playwright__browser_fill_form(...)` — 여러 필드 한 번에
- `mcp__plugin_playwright_playwright__browser_press_key(key="Enter")`
- `mcp__plugin_playwright_playwright__browser_take_screenshot()`
- `mcp__plugin_playwright_playwright__browser_console_messages()`
- `mcp__plugin_playwright_playwright__browser_network_requests()`

### 세션 분할 (4 phases)

#### Phase A: 네비게이션 + Team/Issue/Docs (S01-S04)
1. 서버 헬스 체크
2. 사이드바 모든 링크 클릭 → 로드 확인
3. Team CRUD (생성 → 설정 → 멤버 → 삭제)
4. Issue CRUD (생성 → 상태 전이 → label → relation → comment)
5. Team Docs (생성 → 편집 → revision → 삭제)

#### Phase B: Projects/Rooms/Routines (S05-S08, CLI needed)
1. Cyrus + Hana CLI 시작
2. Project CRUD + milestone + health
3. Room 생성 + 메시지 + action + approval-gated action
4. Live Claude reply (@Cyrus, @Hana, @Cyrus@Hana)
5. Team routine 생성 + schedule + manual fire

#### Phase C: Approvals/Recruiting/Webhook/Agent (S09-S12)
1. Team approvals 검증 (cross-team isolation)
2. Recruiting propose → approve → idle
3. GitHub PR webhook → work product → merge transition (API + UI 검증)
4. Agent detail 모든 탭

#### Phase D: Org/Inbox/반복 (S13-S15)
1. Org chart 렌더
2. Inbox / Activity / Costs / Goals / Skills 페이지 로드
3. 반복 루프 (뒤로/앞으로, 새로고침, race condition)

### 각 세션 시작 명령

```
# 새 세션에서:
1. /model sonnet (이미 sonnet이면 skip)
2. 이 파일 읽기: docs/cos-v2/qa-session-handoff.md
3. QA playbook 읽기: docs/cos-v2/qa-playbook.md
4. 서버 상태 확인: curl http://127.0.0.1:3101/api/health
5. Phase A/B/C/D 중 해당 phase 시나리오 실행
6. 리포트 작성: docs/cos-v2/qa-reports/YYYY-MM-DD-phaseX.md
```

### 리포트 규칙

- PASS/FAIL/SKIP per scenario
- FAIL 시: screenshot path + console errors + 재현 스텝 + 기대 vs 실제
- 완주 후 `docs/cos-v2/known-issues.md`에 누적
- 심각한 버그 → Opus 세션으로 escalate (이 handoff 문서 참조 + 버그 리포트)

### 핵심 URL

| 페이지 | URL |
|--------|-----|
| Dashboard | /BBR/dashboard |
| Issues | /BBR/issues |
| Agent Cyrus | /BBR/agents/cyrus/dashboard |
| Dogfood Issues | /BBR/teams/26edc6de-fb83-4419-a2de-1dbad83cfa9f/issues |
| Dogfood Routines | /BBR/teams/26edc6de-fb83-4419-a2de-1dbad83cfa9f/routines |
| Dogfood Approvals | /BBR/teams/26edc6de-fb83-4419-a2de-1dbad83cfa9f/approvals |
| Dogfood Docs | /BBR/teams/26edc6de-fb83-4419-a2de-1dbad83cfa9f/docs |
| dogfood-lounge Room | /BBR/rooms/a2a7df21-e013-4ffd-bb1c-2f519829cc51 |
| Recruiting | /BBR/recruiting |
| Approvals | /BBR/approvals/pending |
| Org Chart | /BBR/org |

### 핵심 ID

```
Company ID: 7ff1f5d1-d3cc-4411-a77c-442b50d50e57
Cyrus Agent ID: f2bfc3fa-c0fc-4a05-9e69-38307d3689a7
Hana Agent ID: e205c2c7-5fab-43c6-9406-48ff0bf97f2e
DOG Team ID: 26edc6de-fb83-4419-a2de-1dbad83cfa9f
ENG3 Team ID: e4beb195-482f-487b-811c-b91d729a7f79
RLS Team ID: 66b8349f-0234-4f4e-9983-e30a3a57247b
dogfood-lounge Room ID: a2a7df21-e013-4ffd-bb1c-2f519829cc51
GITHUB_WEBHOOK_SECRET: testsecret123
```

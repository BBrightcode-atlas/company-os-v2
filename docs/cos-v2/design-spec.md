# COS v2 — Mission Room 기반 에이전트 오케스트레이션

> ⚠️ **조직 변경 안내 (2026-04-16 이후)**
> 이 문서는 조직 재설계 **이전** 상태(Cyrus/Felix/Iris/LunaLead + 11 서브)를 기준으로 작성됨.
> 현재 활성 조직(Coordinator 3명 + Builder-centric cell)은 `docs/cos-v2/agent-roles.md` 참조.
> 룸/이슈 구조 및 스피커 컨트롤 설계 자체는 유효.

> 작성: 2026-04-08 · 상태: Draft (조직 섹션은 pre-refactor)

## 1. 배경 및 문제

### 현재 시스템 (COS v1)

NestJS Gateway가 9개 Slack App Socket Mode를 관리하고, 각 CLI 에이전트의 channel-bridge HTTP 서버로 메시지를 중계. CEO가 Slack 채널에서 에이전트에게 지시하고 응답받는 구조.

### 한계 (운영에서 발견된 7가지 문제)

1. **CLI/Slack/Linear 추가 어려움** — 12단계 수동 등록 절차
2. **미션별 멀티에이전트 룸 불가 (Major)** — Slack 채널 = CLI 1:1 바인딩. 엔진↔QA 같은 크로스팀 수정↔테스트 반복 사이클을 룸 형태로 묶을 수 없음
3. **Linear 이슈 누락** — 자동 연동 없이 수동 의존
4. **승인 워크플로우 부재** — PR을 직접 찾아 머지하는 게 유일한 승인
5. **워크트리 작업분(컨텍스트) 유실** — CLI 재시작 시 진행 중 작업의 맥락이 소멸
6. **에이전트 측정/보완 불가** — 업무 누락, 스킬 부족 발생 시 직접 수정하는 상황 반복
7. **에이전트 침묵 시 상태 파악 불가** — Slack 채팅 인터페이스의 표현 한계, 서버 직접 접속 필요

### 근본 원인

Slack 채팅 인터페이스의 구조적 한계. 채널 기반이라 "미션 룸" 개념이 불가능하고, 에이전트 상태 표현/관리도 제약.

## 2. 접근법: Paperclip Fork + 미션 룸 레이어

### Paperclip (github.com/paperclipai/paperclip)

"Open-source orchestration for zero-human companies" — 에이전트 조직 관리, 이슈/태스크 시스템, 승인 게이트, 세션 영속, 비용 추적이 성숙하게 구현된 오픈소스.

**Paperclip에서 재사용하는 것:**

| 기능 | Paperclip 구현 |
|------|---------------|
| 에이전트 관리 | agents 테이블 — name, role, reportsTo(계층), adapterType, adapterConfig, budget, status |
| 이슈 시스템 | issues + issue_comments, issue_relations, issue_labels, issue_work_products, issue_execution_decisions |
| 승인 | approvals + issue_approvals |
| 세션 영속 | agent_task_sessions — sessionId, taskKey로 CLI 재시작 후 재개 |
| 워크스페이스 | execution_workspaces — git worktree 전략, branch, cwd 추적 |
| 실행 이력 | heartbeat_runs — 매 실행의 usage, cost, session, log |
| 비용 추적 | cost_events, budget_incidents, budget_policies |
| 스킬 관리 | company_skills, runtime skill injection |
| 플러그인 | plugin system (webhooks, state, config) |
| 어댑터 | claude-local (Claude CLI spawn + --resume session) |

**Paperclip에 없어서 구축하는 것 (COS 확장 레이어):**

| 기능 | 설명 |
|------|------|
| **팀 구조** | 상위/하위 팀 계층, 팀 멤버(에이전트+사람), 팀별 이슈 보드 — Linear 팀 대체 |
| **미션 룸** | 리더 에이전트 + CEO/직원의 실시간 채팅 기반 조율 채널 |
| **액션 메시지** | 대화 속 지시를 버튼으로 대상 CLI에 트리거 |
| **에이전트 동적 프로비저닝** | DB 기반 에이전트 등록 → PM2 프로세스 자동 관리 |
| **채용 에이전트** | 웹 대화형으로 에이전트 생성/스킬 보완/진단 |
| **에이전트 측정** | 작업 지표 자동 수집 + 채용 에이전트 연동 진단 |

### 왜 fork인가

- Paperclip의 DB 모델과 오케스트레이션 (이슈, 에이전트, 승인, 세션, 비용)은 처음부터 만들면 수 주 소요
- Drizzle + PostgreSQL 스택이 일치 (Neon 전환 용이)
- 어댑터 시스템으로 Claude CLI 외 에이전트도 확장 가능
- 1,932 커밋, 48.8K stars — 활발한 커뮤니티

### fork 리스크와 대응

| 리스크 | 대응 |
|--------|------|
| 업스트림 충돌 | COS 확장 레이어는 별도 모듈/테이블로 격리. Paperclip 코어 수정 최소화. 단, Teams + WorkflowState는 TASKS.md 설계 방향과 일치하므로 코어 수정 감수 |
| "Not a chatbot" 철학 충돌 | 미션 룸은 Paperclip 위에 별도 레이어로 구축, 코어에 채팅 개념 주입하지 않음 |
| 실행 모델 차이 (headless vs 상시) | 상시 실행 어댑터 신규 구축 (claude-local-persistent). 유휴 시 컨텍스트 리셋 + 작업 완료 시 md 저장 |

## 3. 시스템 아키텍처

```
┌──────────────────────────────────────────────────┐
│  Web UI (Vite + React)                           │
│  ├── 미션 룸 채팅 UI                              │
│  ├── 이슈 보드                                    │
│  ├── 승인 큐                                      │
│  ├── 에이전트 대시보드                             │
│  └── 채용 에이전트 대화 UI                         │
├──────────────────────────────────────────────────┤
│                WebSocket + REST API               │
├────────────────────┬─────────────────────────────┤
│  Paperclip (fork)  │  COS 확장 레이어 (신규)      │
│  ├── 에이전트 관리   │  ├── 미션 룸 (WebSocket)     │
│  ├── 이슈 시스템     │  ├── 액션 메시지             │
│  ├── 승인 게이트     │  ├── 룸 ↔ 이슈 연결 (N:M)   │
│  ├── 세션 영속      │  ├── Agent Provisioner      │
│  ├── 워크스페이스    │  ├── 채용 에이전트           │
│  ├── 비용 추적      │  ├── 에이전트 측정           │
│  └── 플러그인       │  └── 팀 구조 (Linear 대체)   │
├────────────────────┴─────────────────────────────┤
│                WebSocket Hub                      │
├──────────────────────────────────────────────────┤
│  CLI 에이전트 (Mac Studio, PM2)                   │
│  ├── DB agents 테이블에서 동적 로드               │
│  ├── Agent Provisioner가 자동 프로비저닝           │
│  └── 하드코딩 없음 (기존 CLI_DEFINITIONS 제거)    │
├──────────────────────────────────────────────────┤
│  Neon (PostgreSQL) + Redis (필요시)               │
└──────────────────────────────────────────────────┘
```

### 기존 v1과의 관계

- **v1 (company-os)** — 현행 유지, 운영 계속
- **v2 (company-os-v2)** — 별도 repo로 신규 구축
- 이관은 v2 기능 단위로 준비되면 점진적으로 전환

## 4. 미션 룸 상세 설계

### 4.1 개요

미션 룸은 리더 에이전트 + CEO/직원이 **실시간으로 대화하며 작업을 조율**하는 채널. 이슈 코멘트가 정식 기록(PR, 테스트 결과 등)이라면, 룸 채팅은 "풀 받아서 테스트해", "수정했어, 다시 돌려봐" 같은 조율 메시지와 액션 트리거.

### 4.2 데이터 모델

```sql
-- 미션 룸
rooms (
  id              UUID PRIMARY KEY,
  company_id      UUID NOT NULL REFERENCES companies(id),
  name            TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'active',  -- active | archived
  created_by_user_id   TEXT,
  created_by_agent_id  UUID REFERENCES agents(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
)

-- 룸 참여자 (리더 에이전트 또는 사람)
room_participants (
  id              UUID PRIMARY KEY,
  room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  agent_id        UUID REFERENCES agents(id),
  user_id         TEXT,
  role            TEXT NOT NULL DEFAULT 'member',  -- owner | member
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now()
)

-- 룸 메시지
room_messages (
  id              UUID PRIMARY KEY,
  room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id),
  sender_agent_id UUID REFERENCES agents(id),
  sender_user_id  TEXT,
  type            TEXT NOT NULL,  -- text | action | status | system
  body            TEXT NOT NULL,
  action_payload  JSONB,         -- type=action: { action, targetAgentId, params }
  action_status   TEXT,          -- pending | executed | failed
  reply_to_id     UUID REFERENCES room_messages(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
)

-- 룸 ↔ 이슈 연결 (N:M)
room_issues (
  room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  issue_id        UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  linked_by_user_id   TEXT,
  linked_by_agent_id  UUID REFERENCES agents(id),
  linked_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, issue_id)
)
```

### 4.3 메시지 타입

| 타입 | 용도 | 예시 |
|------|------|------|
| `text` | 일반 대화 | "수정했어, develop에 푸시함" |
| `action` | CLI 트리거 가능한 지시 | "풀 받아서 테스트해" + [실행] 버튼 → target CLI 트리거 |
| `status` | 자동 생성 상태 업데이트 | "Cyrus가 commit 3a2f1b 푸시", "테스트 4/4 통과" |
| `system` | 시스템 이벤트 | "이슈 FLX-42 연결됨", "Iris가 룸에 참여함" |

### 4.4 액션 메시지 흐름

```
1. 에이전트/사람이 액션 메시지 전송
   body: "풀 받아서 QA 시나리오 전체 돌려줘"
   action_payload: {
     action: "pull_and_test",
     targetAgentId: "iris-uuid",
     params: { branch: "develop", scope: "all" }
   }
   action_status: "pending"

2. WebSocket Hub가 룸 참여자에게 브로드캐스트
   - Web UI: 메시지 + [실행] 버튼 렌더링
   - Target CLI(Iris): 액션 수신

3. 실행
   - 에이전트가 보낸 액션: 수신 에이전트 CLI가 자동 실행
   - 사람이 보낸 액션: 수신 에이전트 CLI가 자동 실행
   - Web UI의 [실행] 버튼: 사람이 확인 후 수동 트리거 (선택적)
   - action_status → "executed"

4. 결과
   - CLI가 룸에 text/status 메시지로 결과 보고
```

### 4.5 룸 생성 트리거

| 트리거 | 설명 |
|--------|------|
| CEO/직원 수동 | 웹 UI에서 룸 이름 + 참여 에이전트 지정하여 생성 |
| 에이전트 자동 | 리더 에이전트가 다른 리더와 협업 필요 시 룸 생성 |
| 이슈 기반 자동 | 이슈 할당 시 관련 팀 리더들로 자동 생성 (설정 가능) |

### 4.6 룸 종료

명시적 종료만. 사람이 닫거나 룸 생성자(owner)가 닫음. 자동 종료 없음. 종료 시 status → `archived`, 이력 보존.

### 4.7 참여자 규칙

- **리더 에이전트만 룸 참여 가능** (CLI = 리더 에이전트만 보유하는 룰)
- **CEO/직원도 참여** (멀티유저 인증)
- 하위 에이전트(Kai, Vera 등)는 리더를 통해 간접 참여 — 리더가 자기 팀 내부 에이전트에 위임
- 참여자 수 제한 없음 — CEO + 엔진 + 플랫폼 + QA 전원 참여 가능

### 4.8 팀 구조 (Linear 대체)

Linear의 팀 개념을 대체. Paperclip에는 팀이 없으므로 신규 구축.

```sql
-- 팀 (Linear Teams 대체)
teams (
  id              UUID PRIMARY KEY,
  company_id      UUID NOT NULL REFERENCES companies(id),
  name            TEXT NOT NULL,
  identifier      TEXT NOT NULL,                  -- 이슈 접두어 (ENG, QA, PLT 등 → ENG-42)
  description     TEXT,
  icon            TEXT,
  color           TEXT,
  parent_id       UUID REFERENCES teams(id),      -- 상위팀 (sub-teams)
  lead_agent_id   UUID REFERENCES agents(id),     -- 팀 리더 에이전트
  lead_user_id    TEXT,                            -- 또는 사람 리더
  status          TEXT NOT NULL DEFAULT 'active',  -- active | retired | deleted
  -- 팀별 자동화 설정 (워크플로우 상태는 team_workflow_statuses 테이블 참조)
  automation_config JSONB DEFAULT '{}',            -- auto-close, sub-issue auto-close, PR 자동화 규칙
  cycles_enabled   BOOLEAN DEFAULT false,          -- Cycle 활성화
  settings         JSONB DEFAULT '{}',             -- timezone, estimates 등 기타 설정
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
)

-- 팀 멤버 (에이전트 또는 사람)
team_members (
  id              UUID PRIMARY KEY,
  team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  agent_id        UUID REFERENCES agents(id),
  user_id         TEXT,
  role            TEXT NOT NULL DEFAULT 'member',  -- lead | member
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now()
)
```

**Linear 매핑:**

| Linear | COS v2 | 비고 |
|--------|--------|------|
| Team | `teams` 테이블 | |
| Team identifier (ENG, PLT) | `teams.identifier` | 이슈 번호 접두어 (ENG-42) |
| Sub-teams | `teams.parent_id` | 무한 계층 |
| Team members | `team_members` | 에이전트 + 사람 모두 |
| Team issues | `issues.team_id` | issues 테이블에 FK 추가 |
| Team projects | `project_teams` N:M | 프로젝트는 멀티팀 가능 (§8.2.3) |
| Issue statuses | `team_workflow_statuses` 테이블 | 팀별 커스텀 상태 (§8.1.1) |
| Automations | `teams.automation_config` | auto-close, PR 자동화 등 |
| Cycles | `teams.cycles_enabled` | 스프린트 사이클 |
| Team labels | `labels.team_id` | 팀 레벨 라벨 |
| Retire/Delete team | `teams.status` | active → retired → deleted |
| Private teams | 불필요 | 내부 에이전트 조직이므로 외부팀 협업 없음 |

**팀 구조 예시:**

```
BBrightCode (company)
├── OS Team (team)
│   ├── Sophia (Product Strategist) — lead
│   ├── Olivia (Ops Analyst) — member
│   └── Claire (Revenue Ops) — member
├── Flotter Team (team) — 상위팀
│   ├── Hana (Chief of Staff) — lead
│   ├── Engine Team (team) — 하위팀
│   │   ├── Cyrus (Engine Lead) — lead
│   │   ├── Orion (Architect) — member (일반 에이전트)
│   │   └── Kai (Programmer) — member (일반 에이전트)
│   ├── Platform Team (team) — 하위팀
│   │   ├── Felix (Platform Lead) — lead
│   │   └── ...
│   ├── Growth Team (team) — 하위팀
│   │   ├── Luna (Growth Lead) — lead
│   │   └── ...
│   └── QA Team (team) — 하위팀
│       ├── Iris (QA Lead) — lead
│       └── ...
└── Superbuilder Team (team)
    └── Rex (Superbuilder) — lead
```

**이슈 흐름:**
- 이슈는 팀에 소속 (`issues.team_id`)
- 팀 리더가 이슈를 팀 멤버에게 할당
- 팀 보드 뷰 — Linear처럼 팀별 이슈 보드
- 크로스팀 작업 시 미션 룸으로 조율

### 4.9 에이전트 계층 구조

```
리더 에이전트 (CLI 보유, 룸 참여 가능)
├── Sophia (Product Strategist) — CLI
├── Cyrus (Engine Lead) — CLI
│   ├── Orion (Architect) — 일반 에이전트, CLI 없음
│   ├── Kai (Programmer) — 일반 에이전트, CLI 없음
│   └── ...리더가 서브에이전트로 spawn/위임
├── Felix (Platform Lead) — CLI
├── Iris (QA Lead) — CLI
└── ...
```

- **리더 에이전트**: agents 테이블에서 `reportsTo`가 CEO 또는 상위 리더. CLI 프로세스 보유. 미션 룸 참여. adapterType = `claude_local`.
- **일반 에이전트**: 리더 하위. CLI 없음. 리더가 서브에이전트로 활용 (Claude Code의 Agent tool 등). agents 테이블에 등록되어 스킬/역할 관리됨.
- **스킬/역량 보완**: CEO가 웹 UI 또는 채용 에이전트를 통해 **리더/일반 모두** 자유롭게 수정 가능. adapterConfig, capabilities, company_skills, agent_config_revisions(변경 이력 + rollback) 활용.

### 4.10 통신 구조

```
Cyrus CLI ──WebSocket──→ Hub ──→ room_messages INSERT
                          ↓ broadcast
                    Iris CLI (WebSocket 수신)
                    Felix CLI (WebSocket 수신)
                    Web UI (CEO가 보고 있으면)

액션 메시지 실행:
  에이전트/Web UI가 [실행] →
  Hub가 action_payload 파싱 →
  targetAgent CLI에 WebSocket 명령 전달 →
  CLI 작업 시작 →
  action_status = executed
```

## 5. 에이전트 동적 프로비저닝

### 5.1 현재 (하드코딩, 불안정)

- `gateway.config.ts`의 `CLI_DEFINITIONS` 배열 — 하드코딩
- `cos-start`/`cos-fresh`의 `CLIS` 배열 — 하드코딩
- tmux + 쉘스크립트 기반 프로세스 관리 — 좀비 프로세스, 크래시 수동 복구, 로그 캡처 불안정
- 12단계 수동 등록 절차

### 5.2 v2: DB 기반 + PM2 프로세스 관리

**agents 테이블이 Source of Truth.** Agent Provisioner가 DB 변경을 감지하고, **PM2**로 CLI 프로세스를 관리.

#### CLI 프로세스 관리: PM2 + Paperclip 어댑터 (혼합)

4가지 후보를 비교 분석한 결과, PM2와 Paperclip 어댑터를 조합하는 방식이 최적.

**후보 비교:**

| | tmux+shell (현재) | PM2 (43K★) | Supervisord (9K★) | Paperclip 내장 |
|---|---|---|---|---|
| macOS | ✅ | ✅ (launchd) | ⚠️ Linux 중심 | ✅ |
| auto-restart | ❌ 수동 | ✅ | ✅ | ❌ (1회 실행 후 종료) |
| 로그 관리 | tmux pane 캡처 | ✅ rotation, JSON | ✅ | ✅ stdout/stderr |
| Programmatic API | ❌ | ✅ Node.js 네이티브 | ⚠️ XML-RPC | ✅ runChildProcess() |
| 프로세스 트리 kill | ❌ 좀비 | ✅ graceful | ✅ | ✅ SIGTERM→SIGKILL |
| 부팅 자동 시작 | launchd 별도 | `pm2 startup` 한줄 | systemd 연동 | ❌ |
| 동적 생성/삭제 | 코드 수정 | ✅ API 즉시 | conf 수정+reload | ✅ API 즉시 |

**Supervisord 제외 이유:** macOS 2순위, Python 의존, XML-RPC API (Node.js 네이티브 아님).
**Paperclip 내장 단독 사용 제외 이유:** 1회 실행(heartbeat) 모델이라 auto-restart/모니터링 없음.

**PM2 + Paperclip 어댑터 역할 분담:**

```
PM2 (프로세스 라이프사이클)           Paperclip 어댑터 (실행 로직)
├── auto-restart on crash           ├── claude --print --resume sessionId
├── 로그 관리 (rotation, stream)     ├── 프롬프트 주입 (wake prompt)
├── CPU/메모리 모니터링               ├── 세션 영속 (sessionId 관리)
├── launchd 부팅 시 자동 시작         ├── 비용 추적 (usage, cost)
├── pm2 monit (터미널 대시보드)       ├── 스킬 런타임 주입
├── graceful shutdown (SIGTERM)     ├── 결과 파싱 (JSON stream)
└── Programmatic API                └── 워크스페이스 환경변수 주입
```

#### 프로비저닝 흐름

```
agents 테이블 (Paperclip DB, Source of Truth)
  ↓ 폴링 또는 DB 이벤트
Agent Provisioner (신규)
  ↓ PM2 Programmatic API
pm2.start({
  name: "cyrus-engine",
  script: "claude",
  args: ["--print", "--resume", sessionId],
  cwd: "/path/to/worktree",
  env: { PAPERCLIP_AGENT_ID: "...", ... },
  autorestart: true,
  max_restarts: 10
})
  ↓
CLI 에이전트 프로세스 (PM2 관리)
  ├── 자동 재시작 on crash
  ├── 로그 자동 수집
  ├── CPU/메모리 모니터링
  └── pm2 list / pm2 monit로 상태 확인
```

#### 실행 모델: 상시 실행 + 유휴 리셋

Paperclip 기본은 1회 실행(heartbeat → 작업 → 종료) 모델. COS v2는 **상시 실행** — 룸에서 즉시 반응해야 하므로.

```
CLI 상시 실행 (PM2 관리)
  ├── 대기: WebSocket 연결 유지, 룸 메시지 수신 대기
  ├── 작업: 메시지/액션 수신 → 즉시 작업 시작
  ├── 완료: 작업 결과를 룸에 보고 + 컨텍스트 요약을 md로 저장
  ├── 유휴 감지: N분간 작업 없으면 유휴 판정
  ├── 리셋: graceful restart → 새 세션 시작 (컨텍스트 초기화)
  └── 재시작: 저장된 md를 참조 가능한 상태로 부팅
```

**컨텍스트 저장**: 작업 완료 시 에이전트가 수행한 내용, 결정 사항, 결과를 구조화된 md로 저장. 이슈 코멘트에도 기록. 재시작 후 해당 이슈의 md를 로드하면 맥락 이어감.

**유휴 리셋 이유**: Claude CLI 세션이 길어지면 컨텍스트 윈도우가 비효율적으로 차면서 성능 저하. 주기적 리셋으로 깨끗한 상태 유지.

**Paperclip 어댑터와의 관계**: `claude-local` 어댑터는 1회 실행용. 상시 실행은 별도 어댑터(`claude-local-persistent`) 또는 기존 어댑터를 래핑하는 PM2 스크립트로 구현.

#### 에이전트 스킬/역량 수정

CEO가 에이전트의 스킬이나 워크플로우를 수정하면:

```
CEO가 웹 UI/채용 에이전트에서 변경 요청
→ agents 테이블 또는 company_skills 업데이트
→ agent_config_revisions에 변경 이력 기록 (rollback 가능)
→ 리더 에이전트: Provisioner가 PM2로 graceful restart (새 config 반영)
→ 일반 에이전트: 리더가 다음 spawn 시 새 config 자동 적용
```

### 5.3 이관 순서

1. **Phase 0** — 기존 9개 CLI 에이전트를 agents 테이블에 시드 데이터로 등록
2. **Phase 1** — Provisioner + PM2가 DB에서 읽어 CLI 프로세스 관리 (tmux 교체)
3. **Phase 2** — 하드코딩 코드 제거 (CLI_DEFINITIONS, CLIS 배열, cos-start/cos-fresh)
4. **Phase 3** — 웹 UI/채용 에이전트에서 동적 추가/삭제/스킬 수정

## 6. 채용 에이전트

웹 UI에서 대화하며 에이전트를 생성하고 보완하는 전용 에이전트.

### 6.1 에이전트 생성 (채용)

```
사용자: "엔진팀에 성능 전문가가 필요해. 렌더링 최적화, 메모리 프로파일링 가능한 에이전트"
채용 에이전트: 역할 분석 → 필요 스킬 도출 → 워크플로우 설계 → agents 테이블 INSERT
           → Provisioner가 감지 → CLI 자동 프로비저닝
```

### 6.2 에이전트 보완 (진단/수정)

```
지표에서 "Cyrus 이슈 누락률 30%" 감지
→ 채용 에이전트와 대화: "Cyrus가 이슈 등록을 자주 빼먹어"
→ 채용 에이전트: 스킬 분석 → 워크플로우에 이슈 자동 생성 단계 추가
           → agent_config_revisions에 변경 기록 (rollback 가능)
```

## 7. 승인 워크플로우

Paperclip의 approvals 시스템을 활용. 중요 작업만 승인 큐에 올림.

### 승인 대상

| 작업 | 승인 필요 |
|------|-----------|
| PR 머지 | ✅ 승인 → 자동 상태 변경 |
| 배포 | ✅ |
| 에이전트 생성/삭제 | ✅ |
| 코드 작성, 테스트, 분석 | ❌ 자율 |
| 이슈 생성/코멘트 | ❌ 자율 |

### 승인 흐름

```
에이전트가 PR 생성 → approvals 테이블에 pending 등록
→ 웹 UI 승인 큐에 표시
→ CEO가 승인/거절
→ 승인 시 자동 머지 + 이슈 상태 변경
```

## 8. Linear 대체 — 기능별 완료 조건

이슈, 프로젝트, 팀 3가지를 Linear 수준으로 대체한다. 각 항목에 명확한 완료 조건을 정의한다.

### 8.1 이슈 (Issues)

#### 8.1.1 팀별 워크플로우 상태

신규 테이블: `team_workflow_statuses`

```sql
team_workflow_statuses (
  id          UUID PRIMARY KEY,
  team_id     UUID NOT NULL REFERENCES teams(id),
  name        TEXT NOT NULL,           -- "In Progress", "In Review" 등
  category    TEXT NOT NULL,           -- backlog | unstarted | started | completed | canceled
  color       TEXT,
  description TEXT,
  position    INTEGER NOT NULL,        -- 카테고리 내 순서
  is_default  BOOLEAN DEFAULT false,   -- 새 이슈 생성 시 기본 상태
  created_at  TIMESTAMPTZ DEFAULT now()
)
```

**전환 전략: issues.status text 유지 + team_workflow_statuses로 유효값 제한**

- `issues.status`는 text 컬럼 그대로 유지 (Paperclip 코어 수정 최소화)
- `team_workflow_statuses` 테이블이 팀별 허용 상태를 정의
- 이슈 생성/수정 시 status 값이 해당 팀의 workflow_statuses.name에 있는지 검증
- 상태 전이 로직: category 기반 매핑 함수로 확장 (started → startedAt, completed → completedAt)
- FK 정합성 대신 API 레벨 검증

**완료 조건:**
- 팀 설정에서 상태를 추가/수정/삭제/순서변경 할 수 있다
- 이슈 생성 시 해당 팀의 기본 상태(is_default)의 name이 issues.status에 저장된다
- 이슈 상태 변경 시 해당 팀의 workflow_statuses에 존재하는 name만 허용
- 각 팀이 서로 다른 워크플로우를 가질 수 있다 (Engine: Backlog→Todo→In Progress→In Review→Done, QA: Backlog→Todo→Testing→Verified→Done)
- 카테고리(backlog/unstarted/started/completed/canceled)는 고정, 카테고리 내 상태는 자유
- category 기반 전이: started 카테고리 진입 시 startedAt 설정, completed 시 completedAt 설정

#### 8.1.2 이슈 식별자

**완료 조건:**
- 이슈 생성 시 `{team.identifier}-{auto_increment}` 형태로 자동 생성 (ENG-1, ENG-2, QA-1)
- 식별자로 이슈 검색/참조 가능
- 이슈 코멘트에서 `ENG-42` 입력 시 자동 링크

#### 8.1.3 Issue Relations 확장

**완료 조건:**
- `issue_relations.type`이 blocks, blocked_by, related, duplicate 4가지 지원
- duplicate 처리 시 이슈 상태가 canceled 카테고리로 자동 변경
- blocked 이슈에 주황색 플래그, blocking 이슈에 빨간 플래그 표시
- blocking 이슈가 완료되면 blocked 이슈의 플래그가 녹색(related)으로 전환

#### 8.1.4 Labels (workspace + team 레벨)

**완료 조건:**
- labels 테이블에 `team_id` (nullable — null이면 workspace 레벨) 추가
- labels 테이블에 `parent_id` (label group) 추가
- 같은 그룹 내 라벨은 하나만 선택 가능 (단일 선택)
- 그룹이 아닌 라벨은 복수 선택 가능
- 팀 라벨은 해당 팀 이슈에만, workspace 라벨은 모든 이슈에 적용 가능

#### 8.1.5 Estimates

**완료 조건:**
- issues 테이블에 `estimate` (integer, nullable) 추가
- 팀 설정에서 estimate scale 선택 가능: Exponential(1,2,4,8,16) / Fibonacci(1,2,3,5,8) / Linear(1,2,3,4,5) / T-Shirt(XS~XL)
- 팀별로 다른 scale 사용 가능
- Cycle/Project 진행률 계산 시 estimate 값 반영

#### 8.1.6 Auto-close / Auto-archive

**완료 조건:**
- 팀 설정에서 auto_close_days (기본 off) 설정 가능
- 설정된 기간 동안 업데이트 없는 이슈 → 자동으로 canceled 상태
- 팀 설정에서 auto_archive_months (기본 off) 설정 가능
- completed/canceled 이슈가 설정 기간 후 자동 아카이브 (목록에서 숨김)

#### 8.1.7 Parent/Sub-issue 자동화

**완료 조건:**
- 팀 설정에서 parent auto-close on/off: 모든 sub-issue Done → parent도 Done
- 팀 설정에서 sub-issue auto-close on/off: parent Done → 미완료 sub-issue도 Done
- sub-issue 생성 시 parent의 project, cycle 속성 자동 복사

#### 8.1.8 GitHub PR 자동화

**완료 조건:**
- PR 생성 시 이슈 식별자(ENG-42)가 PR 제목/본문에 있으면 자동 연결
- PR open → 이슈 상태 "In Progress" 또는 "In Review" 자동 전환 (팀 설정)
- PR merge → 이슈 상태 "Done" 자동 전환 (팀 설정)
- PR close(not merge) → 상태 변경 없음
- issue_work_products에 PR 정보 저장 (url, status, reviewState)

#### 8.1.9 Custom Views

**완료 조건:**
- saved_views 테이블: filter_config(JSON), sort_config(JSON), group_config(JSON), display_type(board/list), scope(workspace/team)
- 필터: status, assignee, label, priority, estimate, project, cycle, creator, created/updated date
- 정렬: priority, created, updated, status, assignee
- 그룹: status, assignee, label, priority, project, cycle
- 뷰 저장/수정/삭제/공유(팀 또는 workspace 레벨)
- List 뷰 (Paperclip 기존 확장)

### 8.2 프로젝트 (Projects)

#### 8.2.1 프로젝트 상태 확장

**완료 조건:**
- projects.status enum: planned, in_progress, paused, completed, canceled
- 상태 변경 시 updatedAt 자동 갱신
- 상태별 프로젝트 목록 필터링 가능

#### 8.2.2 Start/Target Date + Timeframes

**완료 조건:**
- projects에 `start_date`, `target_date` (date) 추가
- `start_date_granularity`, `target_date_granularity` (day/month/quarter/half/year) 추가
- 타임라인 뷰에서 granularity에 맞게 바 렌더링

#### 8.2.3 Multi-team Projects

신규 테이블: `project_teams`

```sql
project_teams (
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  added_at    TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (project_id, team_id)
)
```

**완료 조건:**
- 프로젝트에 여러 팀 연결 가능
- 프로젝트 뷰에서 팀별 탭으로 이슈 필터링
- 팀 프로젝트 페이지에서 해당 팀이 참여한 프로젝트 목록 표시

#### 8.2.4 Project Members

신규 테이블: `project_members`

```sql
project_members (
  id          UUID PRIMARY KEY,
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  agent_id    UUID REFERENCES agents(id),
  user_id     TEXT,
  role        TEXT NOT NULL DEFAULT 'member',  -- lead | member
  joined_at   TIMESTAMPTZ DEFAULT now()
)
```

**완료 조건:**
- 프로젝트에 에이전트/사람을 멤버로 추가/제거 가능
- lead는 1명 (프로젝트 소유자), member는 복수
- 멤버는 프로젝트 알림 수신 가능

#### 8.2.5 Project Milestones

신규 테이블: `project_milestones`

```sql
project_milestones (
  id          UUID PRIMARY KEY,
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  status      TEXT NOT NULL DEFAULT 'planned',  -- planned | completed
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
)
```

**완료 조건:**
- 프로젝트에 마일스톤 추가/수정/삭제/순서변경 가능
- 이슈를 마일스톤에 연결 가능 (issues.milestone_id)
- 마일스톤별 이슈 진행률 표시
- 프로젝트 overview에서 마일스톤 목록 + 각각의 진행 상태 표시

#### 8.2.6 Project Updates (Health)

신규 테이블: `project_updates`

```sql
project_updates (
  id                  UUID PRIMARY KEY,
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  health              TEXT NOT NULL,  -- on_track | at_risk | off_track
  body                TEXT NOT NULL,
  created_by_agent_id UUID REFERENCES agents(id),
  created_by_user_id  TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
)
```

**완료 조건:**
- 프로젝트에서 상태 업데이트 작성 가능 (health + 본문)
- 최신 업데이트의 health가 프로젝트 목록에 색상으로 표시 (green/yellow/red)
- Initiative(goal) 뷰에서 하위 프로젝트들의 health 롤업 표시

#### 8.2.7 Project Progress

**완료 조건:**
- 프로젝트의 이슈 상태 기반 자동 진행률 계산 (completed / total)
- estimate 활성화 시 포인트 기반 계산
- 프로젝트 상세에서 progress 그래프 (시간 경과에 따른 완료율 변화)

#### 8.2.8 Timeline View

**완료 조건:**
- 프로젝트 목록을 타임라인(간트) 형태로 표시
- start_date ~ target_date를 수평 바로 렌더링
- 드래그로 날짜 조정 가능
- 팀별/Initiative별 필터링

### 8.3 팀 (Teams)

#### 8.3.1 팀 기본

**완료 조건:**
- 팀 생성: name, identifier(이슈 접두어), icon, color, description
- identifier는 영문 대문자 2~5자, workspace 내 유니크
- 팀 수정/삭제(soft delete)/복원 가능
- 사이드바에 참여 팀 목록 표시

#### 8.3.2 Sub-teams

**완료 조건:**
- teams.parent_id로 상위/하위 관계 설정
- 사이드바에서 계층적 표시 (Flotter > Engine, Platform, QA)
- 상위팀에서 하위팀 이슈 통합 조회 가능

#### 8.3.3 팀 멤버

**완료 조건:**
- 팀에 에이전트/사람 추가/제거 가능
- role: lead(1명 이상), member
- 팀 설정 페이지에서 멤버 목록 관리
- 팀에 속하지 않은 사용자도 해당 팀에 이슈 생성 가능 (기본 상태로 생성)

#### 8.3.4 팀별 Cycles

신규 테이블: `cycles`

```sql
cycles (
  id              UUID PRIMARY KEY,
  team_id         UUID NOT NULL REFERENCES teams(id),
  name            TEXT,                           -- "Cycle 12" 등, 자동 생성
  number          INTEGER NOT NULL,               -- 팀 내 순번
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'upcoming', -- upcoming | active | completed
  created_at      TIMESTAMPTZ DEFAULT now()
)
```

**완료 조건:**
- 팀 설정에서 cycle 활성화: duration(1~8주), 시작 요일, cooldown 기간, upcoming cycle 수
- 활성화 시 upcoming cycles 자동 생성
- 이슈를 cycle에 할당 가능 (issues.cycle_id)
- 현재 cycle 뷰: 할당된 이슈 목록 + 진행률
- cycle 완료 시 미완료 이슈 처리 옵션 (다음 cycle로 이동 / backlog로)
- cycle 히스토리: 완료된 cycle의 완료율/velocity 기록

#### 8.3.5 팀별 Templates

**완료 조건 (후순위):**
- 팀 설정에서 이슈 템플릿 생성/수정/삭제 가능
- 템플릿: title prefix, default labels, default assignee, description template
- 이슈 생성 시 템플릿 선택 가능

#### 8.3.6 팀 사이드바 페이지

**완료 조건:**
- 각 팀 사이드바에 표시: Issues, Cycles(활성화 시), Projects, Views
- Issues: All Issues, Active, Backlog 기본 뷰 + 커스텀 뷰 추가 가능
- 팀 간 전환 시 해당 팀 컨텍스트로 필터 자동 적용

### 8.4 상위 구조

#### 8.4.1 Initiatives (= Goals 확장)

**완료 조건:**
- Paperclip goals 테이블 활용, health 필드 추가
- Initiative에 프로젝트 연결 (project.goalId)
- Initiative 뷰: 이름, 요약, 소유자, 연결 팀, 프로젝트 수, target date, health
- health = 하위 프로젝트들의 최신 project_update health 롤업

### 8.5 기존 Paperclip 테이블 수정 요약

| 테이블 | 추가 컬럼 | 완료 조건 |
|--------|-----------|-----------|
| issues | team_id, estimate, cycle_id, milestone_id | 이슈가 팀에 소속된다. **status는 text 컬럼 유지** — team_workflow_statuses로 유효값만 제한. FK 전환하지 않음 (Paperclip 코어 수정 최소화). |
| labels | team_id, parent_id | 라벨이 팀 스코프를 갖고 그룹핑된다 |
| projects | start_date, start_date_granularity, target_date_granularity, status enum 확장 | 프로젝트가 시작일/종료일/granularity를 갖고 5가지 상태를 가진다 |
| goals | health | Initiative의 건강 상태가 표시된다 |
| issue_relations | type 확장 | blocks, blocked_by, related, duplicate 4가지를 지원한다 |

## 9. Paperclip 기존 기능 — 변경 없이 활용

아래 기능은 Paperclip에 이미 구현되어 있으며 (API + UI 모두), 변경 없이 그대로 활용:

| 기능 | Paperclip 구현 | UI |
|------|---------------|-----|
| 에이전트 CRUD + 채용 승인 | agents + createAgentHireSchema + Board 승인 | NewAgent.tsx, AgentDetail.tsx, Agents.tsx |
| 승인 큐 | approvals + approval_comments | Approvals.tsx, ApprovalDetail.tsx |
| 비용 추적 | cost_events + budget_incidents + budget_policies | Costs.tsx |
| Routines (반복 작업) | routines + routine_triggers + routine_runs | Routines.tsx, RoutineDetail.tsx |
| Documents | documents + document_revisions | 이슈/프로젝트 내 문서 |
| Secrets 관리 | company_secrets + company_secret_versions | CompanySettings 내 |
| Activity Log | activity_log | Activity.tsx |
| Inbox | 에이전트/사람 알림 | Inbox.tsx |
| OrgChart | agents.reportsTo 기반 SVG/PNG 렌더링 | OrgChart.tsx |
| Company Import/Export | companyPortabilityService | CompanyImport.tsx, CompanyExport.tsx |
| Skills 관리 | company_skills + runtime injection | CompanySkills.tsx |
| Agent Instructions | agentInstructionsService + 파일 기반 | AgentDetail 내 |
| Plugin 시스템 | 전체 (loader, worker, event bus, tools) | PluginManager.tsx |
| SSE Live Events | publishLiveEvent / subscribeCompanyLiveEvents | 전체 UI 실시간 갱신 |

## 10. 기술 스택

| 영역 | 기술 |
|------|------|
| 백엔드 | Paperclip fork (Node.js, pnpm monorepo) |
| 프론트엔드 | Vite + React (생산성 판단에 따라 Next.js 전환 가능) |
| DB | Embedded PostgreSQL (Paperclip 내장, Neon 전환 가능) + Redis (필요시) |
| ORM | Drizzle (Paperclip 기존) |
| 실시간 통신 | SSE (Paperclip 기존 — UI 업데이트) + WebSocket (미션 룸 채팅 + CLI 연결, 신규) |
| CLI 프로세스 관리 | PM2 (auto-restart, monitoring, log management) |
| CLI 에이전트 | Claude Code (PM2 관리, Mac Studio) |
| 인프라 | Mac Studio (Tailscale VPN) |

## 11. 핵심 시나리오

### 시나리오 1: CEO가 아이디어를 던져서 바로 착수

CEO가 룸 생성 → Cyrus(Engine) + Felix(Platform) 초대 → 아이디어 논의 → 타당성 분석 지시 → 결과 논의 → 이슈 생성 → 룸에서 계속 진행

### 시나리오 2: 개발 ↔ QA 반복 사이클

Cyrus가 룸 생성 → Iris(QA) 초대 → 이슈 FLX-42 연결 → 수정 완료 → 액션 메시지 "풀 받아서 테스트해" → Iris 테스트 → 실패 리포트 → 액션 "수정해줘" → 반복 → 전체 통과 → 이슈 상태 전환

### 시나리오 3: CEO 직접 지시 + 진행 관리

CEO가 룸 생성 → Luna(Growth) + Felix(Platform) 초대 → 랜딩 페이지 수정 지시 → 크로스팀 협업 (디자인 시스템 컴포넌트 추가 필요) → 룸에서 조율 → PR 완료 → CEO가 룸에서 직접 승인

### 시나리오 4: 대규모 미션 — CEO + 엔진 + 플랫폼 + QA

CEO가 룸 생성 → Cyrus + Felix + Iris 전원 초대 → 큰 기능 개발 전체 사이클을 한 룸에서 진행 → 설계 논의 → 분담 → 개발 → 통합 → QA → 수정 → 최종 승인

### 시나리오 5: 장애 대응

CEO가 긴급 룸 생성 → 관련 리더 전원 초대 → 원인 파악 지시 (병렬 액션) → 원인 특정 → 핫픽스 → QA 검증 → CEO 승인 → 즉시 배포

## 12. 구현 범위 (v2 repo)

별도 repo (company-os-v2)에서 진행. v1은 현행 유지.

각 Phase는 의존관계 순서. 앞 Phase가 완료되어야 다음 Phase 시작 가능.

### Phase 1: 팀 + 이슈 + 인증

> 팀이 이슈의 소속 단위. 이 둘이 없으면 나머지 전부 불가.

- Paperclip fork + Neon 연결
- 멀티유저 인증 (CEO + 빌더)
- **팀** (teams, team_members, sub-teams)
- **팀별 워크플로우** (team_workflow_statuses — 커스텀 상태, 카테고리, 순서)
- **이슈 확장** (team_id, identifier 자동생성 ENG-42, estimate, parent/sub-issue)
- **Labels** (workspace + team 레벨, label groups)
- **Issue Relations** 확장 (blocks, blocked_by, related, duplicate)
- 기본 웹 UI (팀 사이드바, 기존 이슈 List 뷰 확장, 이슈 상세)
- 기존 에이전트 시드 데이터 이관

### Phase 2: 프로젝트 + 이슈-프로젝트 연결

> 프로젝트는 이슈의 상위 묶음. 팀+이슈 위에 올라감.

- **프로젝트 상태** 확장 (planned/in_progress/paused/completed/canceled)
- **Start/Target Date** + Timeframes (granularity)
- **Multi-team Projects** (project_teams N:M)
- **Project Members** (lead + members, 에이전트+사람)
- **Project Milestones** (마일스톤 → 이슈 연결, 진행률)
- **Project Updates** (health: on_track/at_risk/off_track)
- 프로젝트 Progress 그래프 + Timeline 뷰

### Phase 3: 미션 룸 + CLI 연결

> 이슈/프로젝트가 있어야 룸에 연결 가능. CLI가 룸에서 작동해야 의미.

- WebSocket Hub 구축
- **미션 룸** CRUD + 참여자 관리 (리더 에이전트 + CEO/직원)
- 실시간 채팅 (text, system 메시지)
- **룸 ↔ 이슈 연결** (N:M)
- **액션 메시지** (action 타입 + [실행] 버튼 → target CLI 트리거)
- **CLI 에이전트 WebSocket 연결** (channel-bridge 교체)
- **Agent Provisioner + PM2** (DB → PM2 프로세스 관리, tmux 교체)
- status 메시지 자동 생성

### Phase 4: Cycles + 자동화 + 승인

> 기본 이슈/프로젝트 흐름이 돌아간 후, 반복 사이클과 자동화 추가.

- **Cycles** (팀별 설정, 이슈 할당, velocity 추적, 미완료 이슈 처리)
- **GitHub PR 자동화** (PR→이슈 상태 자동 전환)
- **Parent/Sub-issue 자동화** (auto-close 양방향)
- **Auto-close / Auto-archive** (팀별 설정)
- **승인 큐** UI + PR 머지 연동

### Phase 5: Views + Initiatives + 채용

> 데이터가 충분히 쌓인 후 뷰/분석/개선 레이어.

- **Custom Views** (saved_views — 필터/정렬/그룹, Board/List, 팀/workspace 스코프)
- **Initiatives** (goals 확장, health 롤업, 프로젝트 그룹)
- **채용 에이전트** (웹 대화형 에이전트 생성/보완)
- **에이전트 측정** 지표 수집 + 대시보드 + 자동 진단

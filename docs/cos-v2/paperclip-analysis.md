# Paperclip 완벽 분석

> 작성: 2026-04-08 · 대상: github.com/paperclipai/paperclip (v2026.403.0)
> 목적: COS v2 fork 전 Paperclip의 기능, 아키텍처, 한계를 완전히 이해

## 1. 프로젝트 개요

"Open-source orchestration for zero-human companies" — AI 에이전트로 구성된 회사를 운영하는 오케스트레이션 플랫폼.

- **Stars**: 48.8K / **Forks**: 7.9K / **Commits**: 1,932
- **라이선스**: 확인 필요 (README에 명시 안 됨)
- **핵심 철학**: "Not a chatbot. Not an agent framework. Not a workflow builder." — 에이전트가 일하는 **회사 구조**를 관리

## 2. 모노레포 구조

```
paperclip/
├── server/              — Express API 서버 (핵심)
│   ├── src/
│   │   ├── app.ts           — Express app 생성, 모든 route 마운트
│   │   ├── routes/          — REST API 엔드포인트
│   │   ├── services/        — 비즈니스 로직
│   │   ├── adapters/        — 서버 측 어댑터 브릿지
│   │   ├── middleware/      — auth, logging, validation
│   │   ├── auth/            — better-auth 설정
│   │   └── storage/         — 파일 스토리지 (로컬/S3)
│   └── package.json
├── ui/                  — Vite + React 프론트엔드
│   ├── src/
│   │   ├── pages/           — 40+ 페이지 (Issue, Agent, Project 등)
│   │   ├── components/      — UI 컴포넌트
│   │   ├── adapters/        — 어댑터별 UI (claude-local, codex 등)
│   │   ├── api/             — API 클라이언트
│   │   ├── hooks/           — React hooks
│   │   └── App.tsx          — 라우터
│   └── vite.config.ts
├── cli/                 — CLI 도구 (npx paperclipai)
│   ├── src/
│   │   ├── commands/        — onboard, configure, run, company 등
│   │   └── adapters/        — CLI 측 어댑터 (process, http)
│   └── package.json
├── packages/
│   ├── db/              — Drizzle ORM + 스키마 정의
│   │   ├── src/schema/      — 60+ 테이블 정의
│   │   └── drizzle.config.ts
│   ├── adapters/        — 에이전트 어댑터 패키지
│   │   ├── claude-local/    — Claude Code 어댑터
│   │   ├── codex-local/     — OpenAI Codex 어댑터
│   │   ├── cursor-local/    — Cursor 어댑터
│   │   ├── gemini-local/    — Gemini 어댑터
│   │   ├── openclaw-gateway/— OpenClaw 게이트웨이
│   │   ├── opencode-local/  — OpenCode 어댑터
│   │   └── pi-local/        — Pi 어댑터
│   ├── adapter-utils/   — 어댑터 공통 유틸 (runChildProcess 등)
│   ├── shared/          — 타입, 스키마, 상수 공유
│   └── plugins/         — 플러그인 SDK
├── doc/                 — 설계 문서 20+개
├── evals/               — 에이전트 평가
├── docker/              — Docker 설정
└── docs/                — Mintlify 문서 사이트
```

## 3. 기술 스택

| 계층 | 기술 |
|------|------|
| **Backend** | TypeScript + Express (REST API) |
| **Frontend** | React + Vite (SPA, 서버와 같은 포트에서 서빙) |
| **Database** | PostgreSQL + Drizzle ORM |
| **DB 모드** | Embedded PG (개발) / Docker PG / 호스팅 (Supabase/Neon) |
| **Auth** | better-auth (email/password + OAuth) |
| **Process** | Node.js child_process.spawn (어댑터) |
| **패키지 관리** | pnpm monorepo |
| **테스트** | Vitest + Playwright (E2E) |
| **빌드** | TypeScript tsc + Vite |

## 4. 데이터 모델 (DB 스키마 — 60+ 테이블)

### 4.1 핵심 엔티티

#### Companies (조직)
```
companies: id, name, description, status, issuePrefix, issueCounter,
  budgetMonthlyCents, spentMonthlyCents,
  requireBoardApprovalForNewAgents, brandColor
```
- **멀티 테넌트**: 한 인스턴스에 여러 company 운영 가능, 완전한 데이터 격리
- `issuePrefix`: 이슈 식별자 접두어 (PAP-1, PAP-2)
- `issueCounter`: 이슈 번호 자동 증가

#### Agents (에이전트)
```
agents: id, companyId, name, role, title, icon, status,
  reportsTo (self-ref), capabilities, adapterType, adapterConfig(JSONB),
  runtimeConfig(JSONB), budgetMonthlyCents, spentMonthlyCents,
  pauseReason, pausedAt, permissions(JSONB), lastHeartbeatAt, metadata
```
- `reportsTo`: 상위 에이전트 참조 (조직 계층)
- `adapterType`: "claude_local", "codex_local", "cursor" 등
- `adapterConfig`: 어댑터별 설정 (cwd, model, timeout, env 등)
- `permissions`: { canCreateAgents: true } 같은 권한
- `status`: idle, active, paused 등

#### Issues (이슈)
```
issues: id, companyId, projectId, projectWorkspaceId, goalId, parentId,
  title, description, status, priority,
  assigneeAgentId, assigneeUserId, checkoutRunId, executionRunId,
  executionAgentNameKey, executionLockedAt,
  createdByAgentId, createdByUserId, issueNumber, identifier,
  originKind, originId, originRunId, requestDepth, billingCode,
  assigneeAdapterOverrides(JSONB), executionPolicy(JSONB),
  executionState(JSONB), executionWorkspaceId,
  executionWorkspacePreference, executionWorkspaceSettings(JSONB),
  startedAt, completedAt, cancelledAt, hiddenAt
```
- `parentId`: sub-issue 계층
- `checkoutRunId`: 현재 이 이슈를 작업 중인 heartbeat run (atomic checkout)
- `executionWorkspaceId`: 이 이슈가 작업되는 git worktree
- `identifier`: "PAP-42" 형태의 고유 식별자
- `originKind`: manual, routine_execution 등 생성 출처
- `executionPolicy`: 자동 실행 규칙 (JSONB)
- **gin_trgm 인덱스**: title, identifier, description에 전문 검색

#### Projects (프로젝트)
```
projects: id, companyId, goalId, name, description, status,
  leadAgentId, targetDate, color, env(JSONB),
  pauseReason, pausedAt, executionWorkspacePolicy(JSONB), archivedAt
```
- `leadAgentId`: 프로젝트 리드 에이전트
- `goalId`: 상위 Initiative 연결
- `status`: "backlog" 기본
- ⚠️ **startDate 없음**, **멀티팀 지원 없음** (Linear 대비 갭)

#### Goals (목표/Initiative)
```
goals: id, companyId, title, description, level, status,
  parentId (self-ref), ownerAgentId
```
- `parentId`: 계층적 목표 구조
- `level`: task, project, initiative 등
- ⚠️ **health 필드 없음**

### 4.2 이슈 관련 테이블

| 테이블 | 역할 |
|--------|------|
| `issue_comments` | 코멘트 (authorAgentId/authorUserId, body, gin_trgm 검색) |
| `issue_relations` | 이슈 관계 (type: "blocks"만 현재) |
| `issue_labels` | 이슈-라벨 N:M |
| `issue_approvals` | 이슈-승인 연결 |
| `issue_work_products` | PR, 배포 등 산출물 (type, provider, url, status, reviewState, healthStatus) |
| `issue_execution_decisions` | 실행 단계별 판단 기록 (stageId, outcome, body) |
| `issue_attachments` | 첨부 파일 |
| `issue_documents` | 문서 연결 |
| `issue_read_states` | 읽음 표시 |
| `issue_inbox_archives` | 인박스 아카이브 |
| `labels` | 라벨 정의 (⚠️ team_id 없음, parent_id 없음) |

### 4.3 에이전트 실행 관련

| 테이블 | 역할 |
|--------|------|
| `heartbeat_runs` | 매 실행 기록 (agentId, status, usage, cost, session, log, pid, exitCode) |
| `agent_task_sessions` | 에이전트-태스크별 세션 영속 (sessionId, sessionParams) |
| `agent_runtime_state` | 에이전트 런타임 상태 |
| `agent_wakeup_requests` | 에이전트 깨우기 요청 큐 |
| `agent_config_revisions` | 설정 변경 이력 (rollback 가능) |
| `agent_api_keys` | 에이전트 API 키 |
| `cost_events` | 비용 이벤트 (토큰 사용량) |
| `budget_incidents` | 예산 초과 사건 |
| `budget_policies` | 예산 정책 |

### 4.4 워크스페이스

| 테이블 | 역할 |
|--------|------|
| `execution_workspaces` | 실행 워크스페이스 (mode, strategyType, cwd, repoUrl, branchName, status) |
| `project_workspaces` | 프로젝트-워크스페이스 연결 |
| `workspace_operations` | 워크스페이스 작업 이력 |
| `workspace_runtime_services` | 런타임 서비스 (dev server 등) |

### 4.5 인증/권한

| 테이블 | 역할 |
|--------|------|
| `user` (authUsers) | 사용자 (name, email, image) |
| `session` (authSessions) | 로그인 세션 |
| `account` (authAccounts) | OAuth 계정 연결 |
| `verification` | 이메일 인증 |
| `company_memberships` | 사용자-회사 소속 (principalType, principalId, membershipRole) |
| `instance_user_roles` | 인스턴스 레벨 역할 |
| `board_api_keys` | 보드(사람) API 키 |
| `cli_auth_challenges` | CLI 인증 챌린지 |
| `principal_permission_grants` | 세분화 권한 |
| `join_requests` | 회사 참여 요청 |
| `invites` | 초대 |

### 4.6 기타

| 테이블 | 역할 |
|--------|------|
| `routines` | 반복 작업 정의 (cron 스케줄, assigneeAgent, concurrencyPolicy) |
| `routine_triggers` | 트리거 (cronExpression, timezone, nextRunAt) |
| `routine_runs` | 루틴 실행 이력 |
| `approvals` | 승인 요청 (type, status, payload, decidedByUserId) |
| `approval_comments` | 승인 코멘트 |
| `company_skills` | 회사 레벨 스킬 (key, markdown, sourceType, trustLevel) |
| `company_secrets` | 비밀 저장 |
| `company_secret_versions` | 비밀 버전 관리 |
| `documents` | 문서 |
| `document_revisions` | 문서 리비전 |
| `assets` | 자산 파일 |
| `activity_log` | 활동 로그 |
| `finance_events` | 재무 이벤트 |
| `feedback_votes` | 피드백 투표 |
| `feedback_exports` | 피드백 내보내기 |
| `instance_settings` | 인스턴스 설정 |
| `plugins` | 설치된 플러그인 |
| `plugin_config` | 플러그인 설정 |
| `plugin_company_settings` | 회사별 플러그인 설정 |
| `plugin_entities` | 플러그인 엔티티 |
| `plugin_state` | 플러그인 상태 |
| `plugin_webhooks` | 플러그인 웹훅 |
| `plugin_jobs` | 플러그인 작업 |
| `plugin_logs` | 플러그인 로그 |
| `company_logos` | 회사 로고 |

## 5. 서버 아키텍처

### 5.1 Express REST API

**프레임워크**: Express (not Hono, not Fastify — "need non-TS clients" 이유로 REST 선택)

**API Routes** (app.ts에서 마운트):

| Route | 역할 |
|-------|------|
| `/api/health` | 헬스체크 |
| `/api/companies` | 회사 CRUD |
| `/api/company-skills` | 회사 스킬 관리 |
| `/api/agents` | 에이전트 CRUD, 채용, 깨우기, 조직도 |
| `/api/projects` | 프로젝트 CRUD |
| `/api/issues` | 이슈 CRUD, 코멘트, 첨부, 체크아웃 |
| `/api/routines` | 반복 작업 관리 |
| `/api/execution-workspaces` | 워크스페이스 관리 |
| `/api/goals` | 목표/Initiative |
| `/api/approvals` | 승인 요청/결정 |
| `/api/secrets` | 비밀 관리 |
| `/api/costs` | 비용 조회 |
| `/api/activity` | 활동 로그 |
| `/api/dashboard` | 대시보드 데이터 |
| `/api/sidebar-badges` | 사이드바 뱃지 |
| `/api/instance-settings` | 인스턴스 설정 |
| `/api/llms` | LLM 모델 정보 |
| `/api/assets` | 자산 파일 |
| `/api/access` | 접근 제어 |
| `/api/plugins` | 플러그인 관리 |
| `/api/adapters` | 어댑터 정보 |

### 5.2 서비스 레이어 (30+ 서비스)

핵심 서비스:

| 서비스 | 역할 |
|--------|------|
| `agentService` | 에이전트 CRUD, 채용, 권한 |
| `issueService` | 이슈 CRUD, 필터링, 상태 전환 |
| `projectService` | 프로젝트 관리 |
| `goalService` | 목표/Initiative |
| `heartbeatService` | Heartbeat 실행 관리, 에이전트 깨우기 |
| `approvalService` | 승인 워크플로우 |
| `budgetService` | 예산 관리, 초과 감지 |
| `costService` | 비용 추적 |
| `routineService` | 반복 작업 관리 |
| `executionWorkspaceService` | 워크스페이스 관리 (git worktree) |
| `workProductService` | PR 등 산출물 관리 |
| `companySkillService` | 스킬 관리 |
| `accessService` | 접근 제어 |
| `secretService` | 비밀 저장소 |
| `documentService` | 문서 관리 |
| `activityService` | 활동 로그 |
| `agentInstructionsService` | 에이전트 인스트럭션 파일 관리 |
| `companyPortabilityService` | 회사 내보내기/가져오기 |
| `publishLiveEvent` / `subscribeCompanyLiveEvents` | SSE 실시간 이벤트 |

### 5.3 미들웨어

| 미들웨어 | 역할 |
|----------|------|
| `actorMiddleware` | 요청에서 인증 정보 추출 (사람 or 에이전트) |
| `boardMutationGuard` | 보드(사람) 전용 뮤테이션 보호 |
| `privateHostnameGuard` | 호스트명 기반 접근 제한 |
| `httpLogger` | 요청 로깅 |
| `errorHandler` | 에러 핸들링 |
| `validate` | Zod 스키마 유효성 검증 |

### 5.4 인증 체계

- **better-auth**: 사람 사용자 인증 (email/password, OAuth)
- **Agent JWT**: 에이전트용 JWT 토큰 (agent_api_keys 테이블)
- **Board Auth**: 보드(관리자) API 키
- **CLI Auth Challenge**: CLI에서 브라우저 인증 흐름
- **배포 모드별 인증**:
  - `local_trusted`: 인증 없음, loopback만
  - `authenticated + private`: 로그인 필요, 내부 네트워크
  - `authenticated + public`: 로그인 필요, 공개 인터넷

## 6. 어댑터 시스템

Paperclip의 핵심 확장 포인트. 에이전트를 실제로 실행하는 방법을 추상화.

### 6.1 어댑터 타입

| 어댑터 | 설명 |
|--------|------|
| `claude_local` | Claude Code CLI를 로컬에서 spawn. `--print --resume sessionId` |
| `codex_local` | OpenAI Codex CLI |
| `cursor` | Cursor IDE |
| `gemini_local` | Gemini CLI |
| `openclaw_gateway` | OpenClaw 게이트웨이 (HTTP) |
| `opencode_local` | OpenCode CLI |
| `pi_local` | Pi CLI |
| `http` | 범용 HTTP 어댑터 |
| `process` | 범용 프로세스 어댑터 |

### 6.2 어댑터 구조 (3-tier)

각 어댑터 패키지에 3개 모듈:

```
packages/adapters/claude-local/
├── src/
│   ├── server/     — 서버 측: execute(), test(), quota()
│   │   ├── execute.ts   — Claude CLI spawn, 결과 파싱
│   │   ├── parse.ts     — JSON stream 파싱
│   │   ├── quota.ts     — quota 확인
│   │   ├── skills.ts    — 스킬 디렉토리 빌드
│   │   └── test.ts      — 연결 테스트
│   ├── cli/        — CLI 측: 실행 이벤트 포맷팅
│   │   ├── index.ts     — printClaudeStreamEvent export
│   │   └── format-event.ts
│   ├── ui/         — UI 측: 설정 폼, 로그 파싱
│   │   ├── index.ts
│   │   ├── build-config.ts
│   │   └── parse-stdout.ts
│   └── index.ts    — 어댑터 메타 (type, label, models, agentConfigurationDoc)
```

### 6.3 claude-local 실행 흐름

```
1. Heartbeat 트리거 → heartbeatService가 에이전트 깨우기
2. execute(ctx) 호출
   - buildClaudeRuntimeConfig(): cwd, env, args 조립
   - buildSkillsDir(): 스킬 파일 symlink 생성
   - renderPaperclipWakePrompt(): 깨우기 프롬프트 생성
   - buildClaudeArgs(): ["--print", "--resume", sessionId, "--dangerously-skip-permissions", ...]
3. runChildProcess(): spawn("claude", args, { cwd, env, stdin: prompt })
   - stdin으로 프롬프트 전달
   - stdout/stderr 스트리밍 캡처
   - timeout → SIGTERM → grace → SIGKILL
4. parseClaudeStreamJson(): JSON stream 파싱
   - usage (input/output tokens), sessionId, model, cost 추출
5. toAdapterResult(): 결과 정리
   - sessionId 보존 (다음 resume용)
   - 세션 없으면 retry with fresh session
   - loginUrl 감지 (인증 필요 시)
6. heartbeat_runs에 결과 기록
```

### 6.4 핵심 포인트

- **Headless 실행**: `claude --print` 모드 (비대화형)
- **세션 영속**: `--resume sessionId`로 이전 세션 이어가기
- **1회 실행 모델**: 실행 → 완료 → 프로세스 종료 → 다음 heartbeat까지 대기
- **상시 실행이 아님**: COS의 "항상 떠있는 CLI"와 근본적으로 다름

## 7. Heartbeat 시스템

에이전트 실행의 중심 메커니즘.

### 7.1 개념

"Heartbeat는 프로토콜이지 런타임이 아니다. Paperclip은 에이전트 사이클을 시작하는 방법을 정의할 뿐, 에이전트가 그 사이클에서 무엇을 하는지는 에이전트에 달려 있다."

### 7.2 트리거 방식

| 트리거 | 설명 |
|--------|------|
| Routine (Cron) | `routine_triggers.cronExpression`으로 정기 실행 |
| Wakeup Request | 이슈 할당, 코멘트, 멘션 시 에이전트 깨우기 |
| On-demand | UI/API에서 수동 실행 |
| Issue Assignment | 이슈가 에이전트에 할당되면 자동 깨우기 |

### 7.3 실행 흐름

```
트리거 → heartbeatService.wake(agentId, context)
  → agent_wakeup_requests에 큐잉
  → 어댑터 execute() 호출
  → heartbeat_runs에 기록 (queued → running → completed/failed)
  → 결과: usage, cost, sessionId, exitCode, logs
```

### 7.4 Atomic Task Checkout

```
1. 에이전트가 이슈를 in_progress로 설정 시도 (claiming)
2. DB가 atomic하게 검증 — 다른 에이전트가 이미 가져갔으면 실패
3. 이전 세션에서 같은 에이전트가 할당받았으면 resume 가능
```

## 8. 플러그인 시스템

### 8.1 아키텍처

```
Plugin Loader
├── Discovery: ~/.paperclip/plugins/ + node_modules 스캔
├── Installation: npm에서 다운로드, manifest 검증
├── Runtime Activation: entrypoint 해석, worker 프로세스 spawn
└── Shutdown: graceful worker 종료
```

### 8.2 플러그인 기능

- Worker 프로세스로 격리 실행
- 이벤트 버스 구독 (lifecycle events)
- Job 스케줄링
- Tool 등록 (에이전트가 사용 가능한 도구)
- UI 슬롯 (toolbar 버튼 등)
- Capability 기반 권한 (manifest에 선언)
- Host Services 접근 (DB 조회 등)

### 8.3 관련 테이블

plugins, plugin_config, plugin_company_settings, plugin_entities, plugin_state, plugin_webhooks, plugin_jobs, plugin_logs

## 9. 프론트엔드 (UI)

### 9.1 기술

- **Vite + React** (SPA)
- 서버와 같은 포트에서 서빙 (dev 모드에서는 HMR 별도 포트)
- Tailwind CSS 기반

### 9.2 주요 페이지 (40+)

| 페이지 | 역할 |
|--------|------|
| `Dashboard` | 메인 대시보드 |
| `Agents` / `AgentDetail` / `NewAgent` | 에이전트 목록/상세/생성 |
| `Issues` / `IssueDetail` / `MyIssues` | 이슈 목록/상세/내 이슈 |
| `Projects` / `ProjectDetail` | 프로젝트 목록/상세 |
| `Goals` / `GoalDetail` | 목표(Initiative) |
| `Approvals` / `ApprovalDetail` | 승인 큐 |
| `Routines` / `RoutineDetail` | 반복 작업 |
| `Costs` | 비용 추적 |
| `Activity` | 활동 로그 |
| `Org` / `OrgChart` | 조직도 (SVG/PNG 렌더링) |
| `CompanySettings` / `CompanySkills` | 회사 설정/스킬 |
| `CompanyImport` / `CompanyExport` | 조직 내보내기/가져오기 |
| `ExecutionWorkspaceDetail` | 워크스페이스 상세 |
| `ProjectWorkspaceDetail` | 프로젝트 워크스페이스 |
| `Inbox` | 인박스 |
| `Auth` / `CliAuth` | 인증 |
| `PluginManager` / `PluginPage` / `PluginSettings` | 플러그인 관리 |
| `AdapterManager` | 어댑터 관리 |
| `InstanceSettings` / `InstanceGeneralSettings` / `InstanceExperimentalSettings` | 인스턴스 설정 |
| `Companies` | 회사 목록 (멀티 테넌트) |
| `DesignGuide` | UI 디자인 가이드 |

### 9.3 어댑터별 UI

각 어댑터에 대응하는 설정 폼/로그 뷰어가 있음:
claude-local, codex-local, cursor, gemini-local, hermes-local, openclaw-gateway, opencode-local, pi-local, http, process

## 10. CLI (npx paperclipai)

### 10.1 명령어

| 명령 | 역할 |
|------|------|
| `onboard` | 초기 설정 (DB, 기본 에이전트 등) |
| `configure` | 설정 수정 |
| `run` | 에이전트 실행 |
| `company` | 회사 관리 (import/export/delete) |
| `agent` | 에이전트 관리 |
| `doctor` | 환경 진단 |
| `feedback` | 피드백 전송 |

### 10.2 CLI 어댑터

- `process`: 로컬 프로세스로 에이전트 실행 (child_process.spawn)
- `http`: 원격 서버의 에이전트 실행 (HTTP API 호출)

## 11. Routines (반복 작업)

COS v1의 Scheduler를 대체할 수 있는 기능.

### 11.1 구조

```
routines: 반복 작업 정의
  ├── projectId (소속 프로젝트)
  ├── goalId (소속 목표)
  ├── assigneeAgentId (담당 에이전트)
  ├── concurrencyPolicy: coalesce_if_active | allow_parallel | skip_if_active
  ├── catchUpPolicy: skip_missed | catch_up
  └── variables: JSONB (런타임 변수)

routine_triggers: 트리거 정의
  ├── kind: cron | webhook | manual
  ├── cronExpression: "0 9 * * 1-5"
  ├── timezone: "Asia/Seoul"
  └── nextRunAt

routine_runs: 실행 이력
  ├── source, status, triggeredAt
  ├── linkedIssueId (생성된 이슈 연결)
  └── idempotencyKey (중복 실행 방지)
```

## 12. 실시간 이벤트

- **SSE (Server-Sent Events)**: `publishLiveEvent` / `subscribeCompanyLiveEvents`
- 현재 WebSocket이 아닌 SSE 방식
- 에이전트 상태 변경, 이슈 업데이트 등을 실시간 전달

## 13. TASKS.md — 미구현 설계 (중요!)

Paperclip의 `doc/TASKS.md`에 **Linear 수준의 태스크 관리 데이터 모델**이 이미 설계되어 있으나, DB 스키마에 아직 구현되지 않은 항목이 있음.

### 13.1 설계는 있으나 미구현

| 기능 | TASKS.md 설계 | DB 구현 상태 |
|------|---------------|-------------|
| **Teams** | id, name, key, description | ❌ 미구현 |
| **WorkflowState** | id, name, type(카테고리), color, description, position, teamId | ❌ 미구현 (issues.status는 flat text) |
| **Milestones** | 프로젝트 내 단계 | ❌ 미구현 |
| **Initiatives** | roadmap-level objectives | ⚠️ goals로 부분 구현 |
| **Estimates** | Fibonacci/Linear/T-Shirt 스케일 | ❌ 미구현 |
| **Label Groups** | 라벨 그룹핑 | ❌ 미구현 |
| **Issue Relations 확장** | blocks, blocked_by, related, duplicate | ⚠️ "blocks"만 구현 |

### 13.2 TASKS.md의 엔티티 계층

```
Workspace
  Initiatives          (roadmap-level objectives, span quarters)
    Projects           (time-bound deliverables, can span teams)
      Milestones       (stages within a project)
        Issues         (units of work, the core entity)
          Sub-issues   (broken-down work under a parent issue)
```

### 13.3 TASKS.md 구현 우선순위 (Paperclip 자체 로드맵)

**High Value:**
1. Teams + Team scoping
2. Workflow states (per-team, categorized)
3. Issue relations (full: blocks, blocked_by, related, duplicate)
4. Labels + label groups (team + workspace scope)
5. Projects (multi-team, startDate)
6. Sub-issues (parent auto-close)

**Medium:** Transition timestamps (startedAt, completedAt)

**Lower:** Milestones, Initiatives, Estimates

→ **Paperclip 자체적으로도 Teams + WorkflowState를 최우선으로 구현 예정**. Fork하면 업스트림에서 이 기능이 올 수 있음.

## 14. COS v2에서 활용 vs 신규 구축 요약

### 14.1 그대로 활용 (변경 없이)

- 멀티 Company 구조
- Agents 관리 (계층, 설정, 권한, 예산)
- Issues 핵심 (CRUD, comments, attachments, documents, work_products)
- Approvals (승인 요청/결정)
- Session 영속 (agent_task_sessions)
- Execution Workspaces (git worktree 관리)
- Heartbeat Runs (실행 이력, usage, cost)
- Cost 추적 (events, budgets, incidents)
- Skills 관리 (company_skills, runtime injection)
- Routines (반복 작업, cron 트리거)
- Plugin 시스템 전체
- 인증 체계 (better-auth, agent JWT)
- Activity Log
- Documents + Revisions
- Secrets 관리
- 프론트엔드 40+ 페이지 전체

### 14.2 확장 필요 (Paperclip에 설계는 있으나 미구현)

- Teams + team scoping → TASKS.md에 설계 있음
- Workflow states (per-team) → TASKS.md에 설계 있음
- Issue Relations 확장 → TASKS.md에 설계 있음
- Labels + groups → TASKS.md에 설계 있음
- Milestones → TASKS.md에 설계 있음
- Estimates → TASKS.md에 설계 있음

### 14.3 완전 신규 구축

- **미션 룸** (rooms, room_participants, room_messages, room_issues)
- **액션 메시지** (action_payload, CLI 트리거)
- **WebSocket Hub** (SSE → WebSocket 전환 또는 병행)
- **Agent Provisioner + PM2** (DB → 프로세스 동적 관리)
- **채용 에이전트** (웹 대화형 생성/보완)
- **에이전트 측정** (지표 수집 + 진단)

### 14.4 COS v1 → v2 기능 매핑

| COS v1 | Paperclip 대응 |
|--------|---------------|
| NestJS Gateway | Express API 서버 |
| channel-bridge (HTTP) | WebSocket Hub (신규) |
| Slack Socket Mode | 제거 (웹 UI로 대체) |
| tmux 프로세스 관리 | PM2 + Paperclip 어댑터 |
| cos-start/cos-fresh | Agent Provisioner |
| cos-monitor | heartbeat_runs + PM2 monit |
| Redis Schedule | routines + routine_triggers |
| Slack Dispatcher | 제거 |
| CLI_DEFINITIONS 하드코딩 | agents 테이블 (DB) |
| SENDER_OVERRIDE | 제거 |

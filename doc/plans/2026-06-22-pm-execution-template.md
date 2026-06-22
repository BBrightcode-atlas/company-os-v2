# PM 실행 템플릿(PM Execution Template): AI Agent Company Control Plane V1

작성일: 2026-06-22
문서 목적: PM이 프로젝트를 실제 실행할 때 매번 동일한 구조의 산출물을 만들기 위한 단계별 표준 양식
사용 방식: 새 기능/프로젝트/릴리즈마다 이 문서를 복제하고, 각 세그먼트의 `Output` 표를 채운다.

## 0. 템플릿 계약(Template Contract)

이 문서는 자유 형식 기획서가 아니다. PM은 아래 순서대로 세그먼트를 채우고, 각 세그먼트의 산출물이 다음 세그먼트의 입력이 되게 관리한다.

| 세그먼트(Segment) | 산출물(Output) | 다음 단계 입력(Next Input) |
|---|---|---|
| 1. 프로젝트 개요(Project Brief) | 프로젝트 목적, 범위, 성공 기준 | 요구사항 정의 |
| 2. 요구사항(Requirements) | 사용자/비즈니스/시스템 요구사항 | 도메인 스키마 |
| 3. 도메인 스키마(Domain Schema) | entity, field, relation, invariant | DB/API 설계 |
| 4. REST API 계약(REST API Contract) | endpoint, request, response, error | FE/BE 구현 |
| 5. UI 흐름 계약(UI Flow Contract) | 화면, 상태, 액션, 에러 | 프론트 구현/QA |
| 6. 실행 워크플로(Execution Workflow) | 업무 상태, actor, transition | 런타임/운영 검증 |
| 7. 데이터/인증/보안(Data/Auth/Security) | 권한, scope, audit, secret | 보안/릴리즈 검수 |
| 8. 산출물 표준(Artifact Standard) | 완료 산출물, 첨부, work product | UAT/리뷰 |
| 9. 검증 계획(Verification Plan) | 테스트 범위와 명령 | 릴리즈 판단 |
| 10. 릴리즈 인수인계(Release Handoff) | 최종 체크리스트와 리스크 | 릴리즈 승인 |

공통 작성 규칙:

- 모든 entity는 `company_id` 또는 명시적 company boundary를 가진다.
- 모든 mutation은 actor, action, target, timestamp가 audit 가능해야 한다.
- 모든 API는 success response와 error response를 함께 정의한다.
- 모든 `done` 업무는 inspectable artifact 또는 명시적 non-artifact reason을 가진다.
- TBD는 릴리즈 전까지 반드시 owner/date와 함께 해소한다.

## 1. 프로젝트 개요(Project Brief)

### 목적(Purpose)

프로젝트가 해결하려는 문제와 기대 결과를 3-5문장으로 작성한다.

### 산출물(Output)

| 항목(Field) | 값(Value) |
|---|---|
| 프로젝트명(Project Name) | AI Agent Company Control Plane V1 |
| 담당 PM(Owner PM) | TBD |
| 스폰서(Sponsor) | TBD |
| 기술 리드(Tech Lead) | TBD |
| 릴리즈 오너(Release Owner) | TBD |
| 목표 릴리즈(Target Release) | TBD |
| 문제 정의(Problem Statement) | 한 명의 운영자가 AI agent 회사를 만들고 업무 실행/비용/산출물을 통제할 수 있어야 한다. |
| 비즈니스 목표(Business Goal) | 운영 가능한 V1 control plane 릴리즈 |
| 1차 사용자(Primary User) | Board operator |
| 2차 사용자(Secondary Users) | AI agent, engineering maintainer, adapter/plugin author |
| 제외 목표(Non-goals) | 일반 chat product, marketplace, enterprise RBAC, issue/project privacy |

### 성공 지표(Success Metrics)

| 지표(Metric) | 정의(Definition) | 목표(Target) | 측정 방법(Measurement) |
|---|---|---:|---|
| 첫 회사 생성 시간(Time to first company) | fresh install 후 company/root goal 생성까지 | <= 5 min | manual UAT |
| 첫 업무 실행(First task execution) | 첫 heartbeat run이 terminal state까지 도달 | 100% visible | UI/API smoke |
| 업무 추적성(Work traceability) | done issue가 goal/project/parent 및 artifact와 연결 | 100% | DB/API check |
| 회사 경계 결함(Company boundary defects) | cross-company data access bug | 0 | test/review |
| 릴리즈 검증(Release verification) | typecheck/test/build 통과 | pass | CLI |

### 종료 기준(Exit Criteria)

- PM, sponsor, tech lead가 scope와 non-goals를 승인했다.
- 주요 성공 지표에 measurement 방법이 있다.
- target release가 없으면 `TBD`가 아니라 blocker로 RAID에 등록했다.

## 2. 요구사항(Requirements)

요구사항은 `Business`, `User`, `System`, `Operational` 네 종류로 분리한다. 각 요구사항은 고유 ID를 가진다.

### 요구사항 형식(Requirement Format)

| 항목(Field) | 규칙(Rule) |
|---|---|
| ID | `REQ-###` |
| 유형(Type) | `Business`, `User`, `System`, `Operational` |
| 우선순위(Priority) | `Must`, `Should`, `Could`, `Won't` |
| 요구 문장(Statement) | 검증 가능한 문장 |
| 인수 기준(Acceptance) | 완료 판단 기준 |
| 출처(Source) | sponsor, spec, user interview, bug, compliance 등 |

### 산출물(Output)

| ID | 유형(Type) | 우선순위(Priority) | 요구 문장(Statement) | 인수 기준(Acceptance) | 출처(Source) |
|---|---|---|---|---|---|
| REQ-001 | Business | Must | 운영자는 회사를 생성하고 root goal을 정의할 수 있어야 한다. | fresh install에서 company/root goal 생성 성공 | V1 scope |
| REQ-002 | User | Must | 운영자는 agent 조직도를 만들고 CEO와 reports를 볼 수 있어야 한다. | org tree UI/API에서 동일 구조 확인 | V1 scope |
| REQ-003 | System | Must | 모든 business entity는 company boundary를 강제해야 한다. | 다른 company token/context로 접근 시 403/404 | Security |
| REQ-004 | System | Must | issue는 single assignee와 atomic checkout을 가져야 한다. | concurrent checkout 중 하나만 성공 | V1 invariant |
| REQ-005 | Operational | Must | budget hard-stop은 work를 pause하고 이유를 기록해야 한다. | pause reason과 activity log 확인 | Governance |
| REQ-006 | User | Must | done 업무는 검수 가능한 artifact/work product를 제공해야 한다. | issue detail에서 산출물 접근 가능 | Artifact |

### 요구사항 추적성(Requirement Traceability)

| 요구사항 ID(Requirement ID) | 도메인 엔티티(Domain Entity) | API | UI 화면(UI Screen) | 검증(Verification) | 릴리즈 차단 여부(Release Blocker) |
|---|---|---|---|---|---|
| REQ-001 | `companies`, `goals` | `POST /companies`, `POST /companies/:companyId/goals` | Company setup | UAT-001 | Yes |
| REQ-002 | `agents` | `POST /companies/:companyId/agents` | Agents / Org | UAT-002 | Yes |
| REQ-003 | all company-scoped entities | all company routes | all pages | SEC-001 | Yes |
| REQ-004 | `issues` | `POST /issues/:issueId/checkout` | Issue detail | INT-001 | Yes |
| REQ-005 | `cost_events`, `activity_log` | budget/cost APIs | Costs / Dashboard | INT-002 | Yes |
| REQ-006 | `assets`, `issue_attachments`, `work_products` | attachment/work-product APIs | Issue detail | UAT-006 | Yes |

## 3. 도메인 스키마(Domain Schema)

PM은 구현 언어와 무관하게 도메인 스키마를 먼저 확정한다. 이 세그먼트는 DB migration, shared types, API validators, UI form의 기준이다.

### 엔티티 카탈로그(Entity Catalog)

| 엔티티(Entity) | 목적(Purpose) | 회사 범위(Company Scoped) | 주 소유자(Primary Owner) | 비고(Notes) |
|---|---|---|---|---|
| 회사(Company) | 운영 단위 | Yes | Board | 모든 business record의 root scope |
| 목표(Goal) | 회사/팀/agent/task 목표 | Yes | Board/Agent | task traceability 기준 |
| 프로젝트(Project) | 목표 아래 실행 묶음 | Yes | Board/Agent | issue와 workspace 연결 |
| 에이전트(Agent) | AI employee | Yes | Board | org tree와 adapter config 보유 |
| 에이전트 API 키(AgentApiKey) | agent API auth | Yes | Board | plaintext one-time display |
| 이슈(Issue) | core task | Yes | Board/Agent | single assignee, checkout |
| 이슈 댓글(IssueComment) | task communication | Yes | Board/Agent | chat 대체가 아니라 work object comment |
| 하트비트 실행(HeartbeatRun) | agent execution record | Yes | System | runtime status |
| 비용 이벤트(CostEvent) | spend record | Yes | Agent/System | rollup source |
| 승인(Approval) | governed action | Yes | Board/System | hire/strategy/budget 등 |
| 활동 로그(ActivityLog) | audit trail | Yes | System | mutation 기록 |
| 자산(Asset) | uploaded file metadata | Yes | Board/Agent | local/s3 storage |
| 작업 산출물(WorkProduct) | inspectable output | Yes | Board/Agent | file/link/report/preview/PR |

### 엔티티 필드 스키마(Entity Field Schema)

#### 회사(companies)

| 필드(Field) | 타입(Type) | 필수(Required) | 기본값(Default) | 검증(Validation) | 비고(Notes) |
|---|---|---:|---|---|---|
| `id` | uuid | Yes | generated | unique | primary key |
| `name` | text | Yes | - | non-empty | display name |
| `description` | text | No | null | - | company context |
| `status` | enum | Yes | `active` | `active`, `paused`, `archived` | lifecycle |
| `pause_reason` | text | No | null | required when paused by system | audit clarity |
| `paused_at` | timestamptz | No | null | - | pause timestamp |
| `issue_prefix` | text | Yes | generated | uppercase/unique per company | issue identifier |
| `issue_counter` | int | Yes | 0 | >= 0 | sequential issue number |
| `budget_monthly_cents` | int | Yes | 0 | >= 0 | monthly budget |
| `spent_monthly_cents` | int | Yes | 0 | >= 0 | rollup/cache |
| `attachment_max_bytes` | int | Yes | config | > 0 | upload limit |
| `require_board_approval_for_new_agents` | boolean | Yes | false | - | governance |
| `brand_color` | text | No | null | valid color if set | UI branding |

#### 에이전트(agents)

| 필드(Field) | 타입(Type) | 필수(Required) | 기본값(Default) | 검증(Validation) | 비고(Notes) |
|---|---|---:|---|---|---|
| `id` | uuid | Yes | generated | unique | primary key |
| `company_id` | uuid | Yes | - | FK companies.id | company boundary |
| `name` | text | Yes | - | non-empty | agent display |
| `role` | text | Yes | - | non-empty | broad role |
| `title` | text | No | null | - | org title |
| `status` | enum | Yes | `idle` | `active`, `paused`, `idle`, `running`, `error`, `pending_approval`, `terminated` | lifecycle |
| `reports_to` | uuid | No | null | FK agents.id, same company, no cycle | org tree |
| `capabilities` | text | No | null | - | discoverability |
| `adapter_type` | text | Yes | - | registered adapter | runtime boundary |
| `adapter_config` | json | Yes | `{}` | adapter schema | no raw secrets |
| `runtime_config` | json | Yes | `{}` | runtime schema | model profiles, policies |
| `context_mode` | enum | Yes | `thin` | `thin`, `fat` | context delivery |
| `budget_monthly_cents` | int | Yes | 0 | >= 0 | agent budget |
| `spent_monthly_cents` | int | Yes | 0 | >= 0 | rollup/cache |
| `pause_reason` | text | No | null | required when system-paused | budget/board reason |
| `paused_at` | timestamptz | No | null | - | pause timestamp |
| `permissions` | json | Yes | `{}` | permission schema | V1 limited |
| `last_heartbeat_at` | timestamptz | No | null | - | activity signal |
| `metadata` | json | No | null | - | extension |

#### 이슈(issues)

| 필드(Field) | 타입(Type) | 필수(Required) | 기본값(Default) | 검증(Validation) | 비고(Notes) |
|---|---|---:|---|---|---|
| `id` | uuid | Yes | generated | unique | primary key |
| `company_id` | uuid | Yes | - | FK companies.id | company boundary |
| `project_id` | uuid | No | null | same company | project linkage |
| `goal_id` | uuid | No | null | same company | goal traceability |
| `parent_id` | uuid | No | null | same company, no cycle | hierarchy |
| `title` | text | Yes | - | non-empty | task summary |
| `description` | text | No | null | - | task details |
| `status` | enum | Yes | `todo` | `backlog`, `todo`, `in_progress`, `in_review`, `done`, `blocked`, `cancelled` | state machine |
| `priority` | enum | Yes | `medium` | `critical`, `high`, `medium`, `low` | planning |
| `assignee_agent_id` | uuid | No | null | same company | single agent assignee |
| `assignee_user_id` | text | No | null | valid user | board/human assignment |
| `checkout_run_id` | uuid/text | No | null | - | atomic checkout |
| `execution_run_id` | uuid/text | No | null | - | runtime lock |
| `execution_locked_at` | timestamptz | No | null | - | stale lock recovery |
| `created_by_agent_id` | uuid | No | null | same company | attribution |
| `created_by_user_id` | text | No | null | valid user | attribution |
| `issue_number` | int | Yes | generated | per-company unique | human identifier |
| `identifier` | text | Yes | generated | unique | e.g. `PAP-123` |
| `billing_code` | text | No | null | - | cost grouping |
| `assignee_adapter_overrides` | json | No | null | adapter schema | task-specific runtime |
| `execution_policy` | json | No | null | policy schema | runtime controls |
| `execution_state` | json | No | null | state schema | runtime details |
| `started_at` | timestamptz | No | null | set on in_progress | lifecycle |
| `completed_at` | timestamptz | No | null | set on done | lifecycle |
| `cancelled_at` | timestamptz | No | null | set on cancelled | lifecycle |

#### 하트비트 실행(heartbeat_runs)

| 필드(Field) | 타입(Type) | 필수(Required) | 기본값(Default) | 검증(Validation) | 비고(Notes) |
|---|---|---:|---|---|---|
| `id` | uuid | Yes | generated | unique | primary key |
| `company_id` | uuid | Yes | - | FK companies.id | company boundary |
| `agent_id` | uuid | Yes | - | same company | executing agent |
| `issue_id` | uuid | No | null | same company | optional task context |
| `invocation_source` | enum | Yes | `manual` | `scheduler`, `manual`, `callback` | trigger |
| `status` | enum | Yes | `queued` | `queued`, `running`, `succeeded`, `failed`, `cancelled`, `timed_out` | runtime state |
| `started_at` | timestamptz | No | null | - | start |
| `finished_at` | timestamptz | No | null | required terminal | end |
| `error` | text | No | null | required failed/timeout when available | diagnosis |
| `external_run_id` | text | No | null | adapter-specific | runtime mapping |
| `context_snapshot` | json | No | null | redacted | reproducibility |

#### 비용 이벤트(cost_events)

| 필드(Field) | 타입(Type) | 필수(Required) | 기본값(Default) | 검증(Validation) | 비고(Notes) |
|---|---|---:|---|---|---|
| `id` | uuid | Yes | generated | unique | primary key |
| `company_id` | uuid | Yes | - | FK companies.id | company boundary |
| `agent_id` | uuid | Yes | - | same company | spender |
| `issue_id` | uuid | No | null | same company | task linkage |
| `project_id` | uuid | No | null | same company | project rollup |
| `goal_id` | uuid | No | null | same company | goal rollup |
| `provider` | text | Yes | - | non-empty | model provider |
| `model` | text | Yes | - | non-empty | model id |
| `input_tokens` | int | Yes | 0 | >= 0 | usage |
| `output_tokens` | int | Yes | 0 | >= 0 | usage |
| `cost_cents` | int | Yes | - | >= 0 | source of spend |
| `occurred_at` | timestamptz | Yes | now | - | event time |

### 관계 규칙(Relationship Rules)

| 규칙 ID(Rule ID) | 규칙(Rule) |
|---|---|
| REL-001 | Every business entity must resolve to exactly one company. |
| REL-002 | Agent manager and report must belong to the same company. |
| REL-003 | Agent org tree must not contain cycles. |
| REL-004 | Issue parent/child links must stay inside the same company. |
| REL-005 | Issue must trace to company intent through `goal_id`, `project_id`, or `parent_id`. |
| REL-006 | `in_progress` issue must have exactly one assignee path. |
| REL-007 | Cost rollups are derived from `cost_events`; PM must not accept manual rollup-only changes. |
| REL-008 | Terminal issue states are `done` and `cancelled`. |
| REL-009 | Terminal heartbeat states are `succeeded`, `failed`, `cancelled`, `timed_out`. |
| REL-010 | Secret material must use secret references, not raw values in config JSON. |

### 상태 머신(State Machines)

#### 이슈 상태(Issue Status)

| 시작 상태(From) | 목표 상태(To) | 행위자(Actor) | 조건(Guard) | 감사 필요(Audit Required) |
|---|---|---|---|---|
| `backlog` | `todo` | board/agent | company access | Yes |
| `todo` | `in_progress` | agent/system | atomic checkout succeeds | Yes |
| `in_progress` | `in_review` | assignee/system | work submitted | Yes |
| `in_review` | `done` | board/assignee policy | artifact rule satisfied | Yes |
| any non-terminal | `blocked` | board/agent/system | blocker reason provided | Yes |
| any non-terminal | `cancelled` | board | cancel reason provided | Yes |
| `blocked` | `todo` | board/agent | unblock reason provided | Yes |

#### 에이전트 상태(Agent Status)

| 시작 상태(From) | 목표 상태(To) | 행위자(Actor) | 조건(Guard) | 감사 필요(Audit Required) |
|---|---|---|---|---|
| `idle` | `running` | system | heartbeat starts | Yes |
| `running` | `idle` | system | heartbeat succeeded | Yes |
| `running` | `error` | system | heartbeat failed | Yes |
| any non-terminal | `paused` | board/system | pause reason provided | Yes |
| `paused` | `idle` | board | resume allowed | Yes |
| any non-terminal | `terminated` | board | termination confirmed | Yes |

## 4. REST API 계약(REST API Contract)

PM은 API를 화면/업무 흐름과 1:1로 연결해 검수한다. 모든 API는 path company scope, actor permission, request schema, response schema, error를 가져야 한다.

### API 계약 형식(API Contract Format)

| 항목(Field) | 규칙(Rule) |
|---|---|
| 엔드포인트 ID(Endpoint ID) | `API-###` |
| 메서드(Method) | `GET`, `POST`, `PATCH`, `DELETE` |
| 경로(Path) | `/api/...` |
| 행위자(Actor) | `board`, `agent`, `system` |
| 범위 검사(Scope Check) | company membership/key ownership |
| 요청(Request) | JSON schema or multipart |
| 응답(Response) | JSON schema |
| 오류(Errors) | expected status codes |
| 감사(Audit) | activity action if mutation |

### 엔드포인트 카탈로그(Endpoint Catalog)

| ID | 메서드(Method) | 경로(Path) | 행위자(Actor) | 목적(Purpose) | 변경 여부(Mutation) | 감사 액션(Audit Action) |
|---|---|---|---|---|---:|---|
| API-001 | GET | `/api/companies` | board | list companies | No | - |
| API-002 | POST | `/api/companies` | board | create company | Yes | `company.created` |
| API-003 | PATCH | `/api/companies/:companyId` | board | update company | Yes | `company.updated` |
| API-004 | POST | `/api/companies/:companyId/archive` | board | archive company | Yes | `company.archived` |
| API-005 | GET | `/api/companies/:companyId/goals` | board/agent | list goals | No | - |
| API-006 | POST | `/api/companies/:companyId/goals` | board/agent | create goal | Yes | `goal.created` |
| API-007 | GET | `/api/companies/:companyId/agents` | board/agent | list agents | No | - |
| API-008 | POST | `/api/companies/:companyId/agents` | board | create agent | Yes | `agent.created` or `approval.requested` |
| API-009 | PATCH | `/api/agents/:agentId` | board | update agent | Yes | `agent.updated` |
| API-010 | POST | `/api/agents/:agentId/keys` | board | create agent API key | Yes | `agent_key.created` |
| API-011 | POST | `/api/agents/:agentId/heartbeat/invoke` | board/system | start heartbeat | Yes | `heartbeat.invoked` |
| API-012 | GET | `/api/companies/:companyId/issues` | board/agent | list issues | No | - |
| API-013 | POST | `/api/companies/:companyId/issues` | board/agent | create issue | Yes | `issue.created` |
| API-014 | PATCH | `/api/issues/:issueId` | board/agent | update issue | Yes | `issue.updated` |
| API-015 | POST | `/api/issues/:issueId/checkout` | agent/system | atomic checkout | Yes | `issue.checked_out` |
| API-016 | POST | `/api/issues/:issueId/release` | agent/system | release checkout | Yes | `issue.released` |
| API-017 | POST | `/api/issues/:issueId/comments` | board/agent | add comment | Yes | `issue_comment.created` |
| API-018 | POST | `/api/companies/:companyId/issues/:issueId/attachments` | board/agent | upload attachment | Yes | `attachment.created` |
| API-019 | GET | `/api/issues/:issueId/attachments` | board/agent | list attachments | No | - |
| API-020 | POST | `/api/companies/:companyId/cost-events` | agent/system | report cost | Yes | `cost_event.created` |
| API-021 | GET | `/api/companies/:companyId/costs/summary` | board | cost summary | No | - |
| API-022 | PATCH | `/api/companies/:companyId/budgets` | board | update company budget | Yes | `budget.updated` |
| API-023 | GET | `/api/companies/:companyId/activity` | board/agent | activity feed | No | - |
| API-024 | GET | `/api/companies/:companyId/dashboard` | board | dashboard summary | No | - |

### 상세 API 스키마(Detailed API Schemas)

#### API-002 `POST /api/companies`

요청(Request):

```json
{
  "name": "Acme AI Company",
  "description": "Build and operate AI-native workflows",
  "issuePrefix": "ACME",
  "budgetMonthlyCents": 50000
}
```

응답(Response) `201`:

```json
{
  "company": {
    "id": "uuid",
    "name": "Acme AI Company",
    "description": "Build and operate AI-native workflows",
    "status": "active",
    "issuePrefix": "ACME",
    "budgetMonthlyCents": 50000,
    "spentMonthlyCents": 0,
    "createdAt": "2026-06-22T00:00:00.000Z",
    "updatedAt": "2026-06-22T00:00:00.000Z"
  }
}
```

오류(Errors):

| 코드(Code) | 조건(Condition) |
|---:|---|
| 400 | invalid JSON |
| 401 | unauthenticated |
| 403 | board access required |
| 409 | issue prefix conflict |
| 422 | semantic validation failure |

#### API-008 `POST /api/companies/:companyId/agents`

요청(Request):

```json
{
  "name": "CEO Agent",
  "role": "executive",
  "title": "CEO",
  "reportsTo": null,
  "capabilities": "Breaks company goals into executable work.",
  "adapterType": "codex_local",
  "adapterConfig": {},
  "runtimeConfig": {},
  "budgetMonthlyCents": 20000
}
```

응답(Response) `201`:

```json
{
  "agent": {
    "id": "uuid",
    "companyId": "uuid",
    "name": "CEO Agent",
    "role": "executive",
    "title": "CEO",
    "status": "idle",
    "reportsTo": null,
    "adapterType": "codex_local",
    "createdAt": "2026-06-22T00:00:00.000Z"
  }
}
```

오류(Errors):

| 코드(Code) | 조건(Condition) |
|---:|---|
| 403 | no board access to company |
| 404 | company or manager not found |
| 409 | org cycle or invalid manager relation |
| 422 | adapter config invalid |

#### API-013 `POST /api/companies/:companyId/issues`

요청(Request):

```json
{
  "title": "Create first onboarding demo",
  "description": "Produce an inspectable first-run task result.",
  "projectId": "uuid",
  "goalId": "uuid",
  "parentId": null,
  "priority": "high",
  "assigneeAgentId": "uuid"
}
```

응답(Response) `201`:

```json
{
  "issue": {
    "id": "uuid",
    "companyId": "uuid",
    "identifier": "ACME-1",
    "title": "Create first onboarding demo",
    "status": "todo",
    "priority": "high",
    "assigneeAgentId": "uuid",
    "createdAt": "2026-06-22T00:00:00.000Z"
  }
}
```

오류(Errors):

| 코드(Code) | 조건(Condition) |
|---:|---|
| 403 | actor cannot create issue in company |
| 404 | referenced project/goal/parent/agent not found |
| 422 | task is not traceable to company intent |

#### API-015 `POST /api/issues/:issueId/checkout`

요청(Request):

```json
{
  "agentId": "uuid",
  "expectedStatuses": ["todo", "backlog", "blocked", "in_review"]
}
```

응답(Response) `200`:

```json
{
  "issue": {
    "id": "uuid",
    "status": "in_progress",
    "assigneeAgentId": "uuid",
    "startedAt": "2026-06-22T00:00:00.000Z",
    "checkoutRunId": "uuid"
  }
}
```

오류(Errors):

| 코드(Code) | 조건(Condition) |
|---:|---|
| 403 | agent key does not belong to issue company |
| 404 | issue not found |
| 409 | issue already owned or status changed |
| 422 | agent cannot execute issue |

#### API-020 `POST /api/companies/:companyId/cost-events`

요청(Request):

```json
{
  "agentId": "uuid",
  "issueId": "uuid",
  "projectId": "uuid",
  "provider": "openai",
  "model": "gpt-5",
  "inputTokens": 1200,
  "outputTokens": 800,
  "costCents": 42,
  "occurredAt": "2026-06-22T00:00:00.000Z"
}
```

응답(Response) `201`:

```json
{
  "costEvent": {
    "id": "uuid",
    "companyId": "uuid",
    "agentId": "uuid",
    "issueId": "uuid",
    "costCents": 42
  },
  "budgetState": {
    "companyPaused": false,
    "agentPaused": false,
    "reason": null
  }
}
```

오류(Errors):

| 코드(Code) | 조건(Condition) |
|---:|---|
| 403 | agent cannot report cost for company |
| 404 | referenced entity not found |
| 422 | cost/token values invalid |

### 공통 오류 형식(Common Error Shape)

```json
{
  "error": {
    "code": "string",
    "message": "Human readable message",
    "details": {}
  }
}
```

필수 HTTP 의미(Required HTTP semantics):

| 코드(Code) | 의미(Meaning) |
|---:|---|
| 400 | malformed request |
| 401 | unauthenticated |
| 403 | authenticated but unauthorized |
| 404 | entity not found or hidden by scope |
| 409 | state conflict |
| 422 | semantic validation failure |
| 500 | unexpected server error |

## 5. UI 흐름 계약(UI Flow Contract)

PM은 UI를 화면 목록이 아니라 업무 흐름으로 정의한다.

### 화면 카탈로그(Screen Catalog)

| 화면 ID(Screen ID) | 화면(Screen) | 주 사용자(Primary User) | 필요 데이터(Data Needed) | 주요 액션(Primary Actions) | 빈/오류 상태(Empty/Error State) |
|---|---|---|---|---|---|
| UI-001 | 회사 설정(Company Setup) | board | none or current companies | create company/root goal | setup guide, validation errors |
| UI-002 | 대시보드(Dashboard) | board | dashboard summary | inspect status, approvals, spend | loading/error/retry |
| UI-003 | 에이전트/조직도(Agents / Org) | board | agents list/tree | create, edit, pause, resume, terminate | no agents CTA |
| UI-004 | 이슈 보드/목록(Issues Board/List) | board/agent | issues | create, assign, filter, open | no issues CTA |
| UI-005 | 이슈 상세(Issue Detail) | board/agent | issue, comments, docs, attachments, work products | comment, checkout, review, complete | conflict/error visible |
| UI-006 | 하트비트 실행 상세(Heartbeat Run Detail) | board | run status/log summary | cancel, inspect, recover | failed/timeout state |
| UI-007 | 비용/예산(Costs/Budgets) | board | cost summary/rollups | update budget, inspect pause reason | no spend state |
| UI-008 | 승인(Approvals) | board | pending approvals | approve, reject, request revision | no approvals state |

### UI 상태 표준(UI State Standard)

모든 화면은 아래 상태를 정의해야 한다(Every screen must define):

- 로딩 상태(Loading state)
- 빈 상태(Empty state)
- 권한 없음 상태(Permission denied state)
- 검증 오류 상태(Validation error state)
- 네트워크/서버 오류 상태(Network/server error state)
- 성공 확인 또는 가시적 상태 전환(Success confirmation or visible state transition)

## 6. 실행 워크플로(Execution Workflow)

### 엔드투엔드 정상 흐름(End-to-End Happy Path)

| 단계(Step) | 행위자(Actor) | 액션(Action) | 시스템 결과(System Result) | 증거(Evidence) |
|---:|---|---|---|---|
| 1 | Board | Create company | company active | company detail |
| 2 | Board | Create root goal | goal active | goal list |
| 3 | Board | Create CEO agent | agent idle | org tree |
| 4 | Board | Create issue | issue todo | issue detail |
| 5 | Agent/System | Checkout issue | issue in_progress | checkout audit |
| 6 | System | Invoke heartbeat | run queued/running | run detail |
| 7 | Agent | Add comment/artifact | output visible | work product |
| 8 | Board/Policy | Mark done | issue done | done timestamp |
| 9 | System | Record cost | budget updated | cost summary |
| 10 | Board | Review dashboard | company state visible | dashboard |

### 운영 예외(Operational Exceptions)

| 시나리오(Scenario) | 기대 동작(Expected Behavior) | PM 인수 기준(PM Acceptance) |
|---|---|---|
| Concurrent checkout | one checkout succeeds, one returns 409 | no double ownership |
| Agent timeout | run becomes `timed_out`, issue remains visible | recovery path available |
| Budget exceeded | company/agent pauses with reason | activity log contains trigger |
| Missing artifact on done | completion blocked or exception reason required | no silent log-only completion |
| Invalid company access | 403 or scoped 404 | no cross-company data leak |

## 7. 데이터/인증/보안(Data, Auth, And Security)

### 권한 매트릭스(Permission Matrix)

| 액션(Action) | Board | Agent | System |
|---|---:|---:|---:|
| Create company | Yes | No | No |
| Read company work | Yes | Same company only | Yes |
| Create agent | Yes | Approval request only if allowed | No |
| Create issue | Yes | Same company only | Yes |
| Checkout issue | No | Assigned/allowed agent only | Yes |
| Approve governed action | Yes | No | No |
| Report cost | No | Self/same company only | Yes |
| Update budget | Yes | No | No |
| Upload artifact | Yes | Same company issue only | Yes |

### 감사 요구사항(Audit Requirements)

| 변경 범주(Mutation Category) | 필수 감사 필드(Required Audit Fields) |
|---|---|
| Company | actor, company, previous values, new values |
| Agent | actor, agent, status/config changes |
| Issue | actor, issue, status/assignee/priority changes |
| Heartbeat | actor/source, agent, issue, run id, terminal status |
| Budget | actor/system, previous budget, new budget, pause reason |
| Artifact | actor, issue, asset/work product id |
| Approval | requester, decider, status, decision note |

### 시크릿 처리(Secret Handling)

- Sensitive values must not be stored directly in adapter config or logs.
- Secret refs must identify company, secret, version or active alias, and target binding.
- Config read APIs must redact sensitive values.
- Activity logs must not contain raw secrets.

## 8. 산출물 표준(Artifact Standard)

PM은 `done`의 기준을 산출물 중심으로 둔다.

### 산출물 유형(Artifact Types)

| 유형(Type) | 예시(Example) | 필수 메타데이터(Required Metadata) |
|---|---|---|
| `file` | report.md, screenshot.png, demo.mp4 | filename, mime, size, attachment id |
| `document` | issue planning doc | document key, revision |
| `link` | preview URL, PR URL | URL, title |
| `workspace_file` | generated local file not uploaded | workspace-relative path, reason |
| `summary` | structured final report | body, author, timestamp |

### 완료 규칙(Completion Rule)

이슈는 아래 조건 중 하나가 참일 때만 `done`으로 표시할 수 있다(Completion Rule):

- 하나 이상의 산출물/작업 산출물(artifact/work product)이 연결되어 있다.
- 이슈 유형이 명시적으로 비산출물(non-artifact)이고 완료 요약(completion summary)이 있다.
- board가 감사 메모(audit note)와 함께 산출물 요구사항을 override했다.

### 작업 산출물 스키마(Work Product Schema)

| 필드(Field) | 타입(Type) | 필수(Required) | 비고(Notes) |
|---|---|---:|---|
| `id` | uuid | Yes | primary key |
| `company_id` | uuid | Yes | company scope |
| `issue_id` | uuid | Yes | owning issue |
| `type` | enum | Yes | `file`, `document`, `link`, `workspace_file`, `summary` |
| `title` | text | Yes | user-visible |
| `summary` | text | No | short description |
| `resource_ref` | json | Yes | attachment/document/link/path reference |
| `created_by_agent_id` | uuid | No | attribution |
| `created_by_user_id` | text | No | attribution |

## 9. 검증 계획(Verification Plan)

### 테스트 매트릭스(Test Matrix)

| 검증 ID(Verification ID) | 범위(Scope) | 방법(Method) | 명령/절차(Command / Procedure) | 릴리즈 필수(Required For Release) |
|---|---|---|---|---:|
| UAT-001 | company setup | manual/API | create company/root goal | Yes |
| UAT-002 | agent org | manual/API | create CEO and report | Yes |
| INT-001 | atomic checkout | integration | concurrent checkout test | Yes |
| INT-002 | budget hard-stop | integration | cost event exceeds budget | Yes |
| SEC-001 | company boundary | integration | cross-company access attempts | Yes |
| ART-001 | artifact completion | manual/API | done issue with work product | Yes |
| BUILD-001 | typecheck | CLI | `pnpm -r typecheck` | Yes |
| TEST-001 | unit/integration | CLI | `pnpm test:run` | Yes |
| BUILD-002 | build | CLI | `pnpm build` | Yes |

### 릴리즈 검증 명령(Release Verification Commands)

```sh
pnpm -r typecheck
pnpm test:run
pnpm build
```

Browser suites are opt-in unless touched:

```sh
pnpm test:e2e
pnpm test:release-smoke
```

## 10. 릴리즈 인수인계(Release Handoff)

### 최종 인수인계 산출물(Final Handoff Output)

| 항목(Field) | 값(Value) |
|---|---|
| 릴리즈 후보(Release Candidate) | TBD |
| 포함 범위(Scope Included) | TBD |
| 연기 범위(Scope Deferred) | TBD |
| 검증 요약(Verification Summary) | TBD |
| 미해결 리스크(Open Risks) | TBD |
| 알려진 제한사항(Known Limitations) | TBD |
| 롤백 계획(Rollback Plan) | TBD |
| 오너 승인(Owner Approval) | TBD |

### 릴리즈 체크리스트(Release Checklist)

- [ ] 세그먼트 1 프로젝트 개요(Project Brief) complete
- [ ] 세그먼트 2 요구사항(Requirements) complete
- [ ] 세그먼트 3 도메인 스키마(Domain Schema) complete
- [ ] 세그먼트 4 REST API 계약(REST API Contract) complete
- [ ] 세그먼트 5 UI 흐름 계약(UI Flow Contract) complete
- [ ] 세그먼트 6 실행 워크플로(Execution Workflow) complete
- [ ] 세그먼트 7 데이터/인증/보안(Data/Auth/Security) complete
- [ ] 세그먼트 8 산출물 표준(Artifact Standard) complete
- [ ] 세그먼트 9 검증 계획(Verification Plan) complete
- [ ] 회사 경계(Company boundary) verified
- [ ] 변경 감사(Mutation audit) verified
- [ ] 산출물 완료(Artifact completion) verified
- [ ] 예산 하드스톱(Budget hard-stop) verified
- [ ] 릴리즈 명령(Release commands) passed or exceptions approved
- [ ] PR 본문(PR body) follows `.github/PULL_REQUEST_TEMPLATE.md`

## 11. 변경 요청 템플릿(Change Request Template)

모든 범위 변경(scope change)은 아래 형식을 사용한다.

| 항목(Field) | 값(Value) |
|---|---|
| 변경 ID(Change ID) | CR-### |
| 요청자(Requested By) | TBD |
| 날짜(Date) | TBD |
| 설명(Description) | TBD |
| 사유(Reason) | TBD |
| 영향 요구사항(Affected Requirements) | TBD |
| 영향 스키마(Affected Schema) | TBD |
| 영향 API(Affected APIs) | TBD |
| 영향 UI(Affected UI) | TBD |
| 영향: 범위(Impact: Scope) | TBD |
| 영향: 시간(Impact: Time) | TBD |
| 영향: 비용(Impact: Cost) | TBD |
| 영향: 품질/리스크(Impact: Quality/Risk) | TBD |
| 결정(Decision) | Approve / Defer / Reject |
| 결정 오너(Decision Owner) | TBD |
| 결정일(Decision Date) | TBD |

## 12. RAID 로그 템플릿(RAID Log Template)

### 리스크(Risks)

| ID | 리스크(Risk) | 발생 가능성(Probability) | 영향도(Impact) | 트리거(Trigger) | 완화책(Mitigation) | 담당자(Owner) | 상태(Status) |
|---|---|---:|---:|---|---|---|---|
| R-001 | TBD | Low/Med/High | Low/Med/High | TBD | TBD | TBD | Open |

### 가정(Assumptions)

| ID | 가정(Assumption) | 검증 방법(Validation Method) | 담당자(Owner) | 상태(Status) |
|---|---|---|---|---|
| A-001 | TBD | TBD | TBD | Open |

### 이슈(Issues)

| ID | 이슈(Issue) | 영향(Impact) | 다음 액션(Next Action) | 담당자(Owner) | 기한(Due) | 상태(Status) |
|---|---|---|---|---|---|---|
| I-001 | TBD | TBD | TBD | TBD | TBD | Open |

### 의존성(Dependencies)

| ID | 의존성(Dependency) | 필요 주체(Needed By) | 담당자(Owner) | 기한(Due) | 상태(Status) |
|---|---|---|---|---|---|
| D-001 | TBD | TBD | TBD | TBD | Open |

## 13. 출처(Source References)

- PMI, Project Manager role: https://www.pmi.org/about/what-is-a-project-manager
- PMI, Process Groups: https://www.pmi.org/standards/process-groups
- PMI, project constraints model: https://www.pmi.org/learning/library/six-constraints-enhanced-model-project-control-7294
- Scrum Guide 2020: https://scrumguides.org/scrum-guide.html
- Atlassian, Risk Register: https://www.atlassian.com/work-management/project-management/risk-register
- Atlassian, Stakeholder Communications Plan: https://www.atlassian.com/team-playbook/plays/stakeholder-communications-plan

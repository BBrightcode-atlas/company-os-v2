# COS v2 Phase 1 — 서브 유닛 분해 (v2, Paperclip 실동작 확인 후)

> 각 유닛은 독립 QA 가능. 앞 유닛이 완료되어야 다음 유닛 시작 가능.
> Paperclip v0.3.1 (port 3101, embedded PG) 실동작 확인 기반.
> 기존 테스트 데이터는 삭제하고 클린 시작.

## Unit 1a: Fork + 클린 환경

**목표**: Paperclip을 company-os-v2 repo로 fork하고, Embedded PG로 클린 상태에서 서버+UI 정상 동작.

**Paperclip 현재 상태**: embedded PG로 동작 중, better-auth 인증 포함, local_trusted 모드. DB는 Embedded PG 그대로 사용 (Neon 불필요, 나중에 전환 가능).

**QA 기준**:
- company-os-v2 repo 생성 (Paperclip fork)
- 기존 데이터 삭제: `rm -rf ~/.paperclip/instances/default/db/`
- `pnpm install && pnpm build && pnpm dev` 실행 시 서버(3100) + UI 정상 접속
- onboard 완료: BBrightCode company 생성 (issuePrefix: BBR)
- 클린 상태 확인 (에이전트 0, 이슈 0)
- 기존 Paperclip 테스트 suite 통과 (`pnpm test:run`)

---

## Unit 1b: 팀 (Teams) 스키마 + API

**목표**: teams, team_members 테이블 생성 + REST API. UI는 다음 유닛.

**의존**: 1a

**신규 테이블**: `teams`, `team_members`

**Paperclip TASKS.md 참조**: Teams 설계가 이미 문서화됨 (key, name, description). 이를 기반으로 확장.

**QA 기준**:
- 마이그레이션: teams, team_members 테이블 생성
- teams: name, identifier(영문 대문자 2~5자, company 내 유니크), description, icon, color, parent_id(sub-teams), lead_agent_id, lead_user_id, status(active/retired/deleted)
- team_members: team_id, agent_id, user_id, role(lead/member)
- API 엔드포인트:
  - `GET /api/companies/:companyId/teams` — 팀 목록
  - `POST /api/companies/:companyId/teams` — 팀 생성
  - `PATCH /api/companies/:companyId/teams/:teamId` — 팀 수정
  - `DELETE /api/companies/:companyId/teams/:teamId` — 팀 삭제 (soft delete)
  - `GET /api/companies/:companyId/teams/:teamId/members` — 멤버 목록
  - `POST /api/companies/:companyId/teams/:teamId/members` — 멤버 추가
  - `DELETE /api/companies/:companyId/teams/:teamId/members/:memberId` — 멤버 제거
- identifier 중복 시 409 에러
- parent_id 설정으로 sub-team 계층 생성 가능
- lead_agent_id와 team_members.role=lead 동기화 (lead_agent_id 설정 시 자동으로 team_members에 lead role로 추가)

---

## Unit 1c: 팀 UI (사이드바 + 설정)

**목표**: 사이드바에 팀 목록 표시, 팀 설정 페이지에서 CRUD.

**의존**: 1b

**변경 대상**: 기존 Paperclip 사이드바 수정, 신규 팀 설정 페이지

**QA 기준**:
- 사이드바에 TEAMS 섹션 추가 (WORK와 PROJECTS 사이 또는 적절한 위치)
- 참여 팀 목록 표시, sub-team 계층적 표시 (Flotter > Engine, Platform, QA)
- 팀 클릭 시 해당 팀 이슈 목록으로 이동 (Unit 1e 이후 연결)
- 팀 설정 페이지: 팀 생성/수정/삭제, 멤버 관리
- + 버튼으로 팀 추가

---

## Unit 1d: 팀별 워크플로우 상태

**목표**: 팀마다 고유한 이슈 상태 세트를 가질 수 있는 상태.

**의존**: 1b

**신규 테이블**: `team_workflow_statuses`

**Paperclip TASKS.md 참조**: WorkflowState 설계가 이미 문서화됨 (name, type/category, color, position, teamId).

**전환 전략**: issues.status text 컬럼 유지. team_workflow_statuses로 유효값만 제한. FK 전환 안 함.

**Codex #10 반영**: 각 워크플로우 상태에 immutable slug 추가. rename 시 slug는 유지되어 기존 이슈가 안 깨짐.

**QA 기준**:
- team_workflow_statuses: id, team_id, name, **slug**(immutable, 생성 시 name에서 자동 생성), category(backlog/unstarted/started/completed/canceled), color, description, position, is_default
- 팀 생성 시 기본 상태 5개 자동 시드: Backlog(slug:backlog), Todo(slug:todo), In Progress(slug:in_progress), Done(slug:done), Canceled(slug:canceled)
- 카테고리는 고정, 카테고리 내 상태는 자유롭게 추가/수정/삭제
- 상태 rename 시 slug는 변경되지 않음
- 상태 삭제 시 카테고리에 최소 1개 남아야 함
- 팀 설정 페이지에서 워크플로우 상태 관리 UI
- API: GET/POST/PATCH/DELETE `/api/companies/:companyId/teams/:teamId/workflow-statuses`
- issues.status에 저장되는 값 = **slug** (name이 아닌 slug로 매칭하여 rename-safe)

---

## Unit 1e: 이슈 팀 귀속 + 식별자

**목표**: 이슈가 팀에 소속되고, 팀별 식별자(ENG-42) 자동 생성.

**의존**: 1d

**기존 테이블 수정**: `issues` — team_id(FK) 추가

**식별자 전환**: 기존 company.issuePrefix(BBR) → team.identifier(ENG, PLT, QA)

**QA 기준**:
- issues에 team_id FK 추가 (마이그레이션)
- 이슈 생성 시 team_id 필수
- 이슈 생성 시 identifier = `{team.identifier}-{팀별 auto_increment}` (ENG-1, ENG-2, QA-1)
- 팀별 카운터는 teams 테이블에 issue_counter 컬럼 추가 (atomic increment)
- 기존 company.issuePrefix/issueCounter는 하위 호환용으로 유지하되, 팀이 있으면 팀 identifier 우선
- 이슈 상태 변경 시 해당 팀의 workflow_statuses.slug에 있는 값만 허용 (API 검증)
- 이슈 생성 시 해당 팀의 기본 상태(is_default)의 slug가 status에 저장
- 이슈를 다른 팀으로 이동 시: team_id 변경 + status를 새 팀의 기본 상태로 초기화 + 식별자 유지
- 기존 Issues UI에서 팀 표시, 식별자 표시
- 사이드바에서 팀 클릭 → 해당 팀 이슈만 필터링

---

## Unit 1f: Labels 확장 (팀 + 그룹)

**목표**: 라벨이 workspace 또는 팀 스코프, 라벨 그룹 동작.

**의존**: 1e

**기존 테이블 수정**: `labels` — team_id(FK, nullable), parent_id(self-ref)

**QA 기준**:
- labels에 team_id, parent_id 추가 (마이그레이션)
- workspace 라벨: team_id = null, 모든 팀 이슈에 적용 가능
- 팀 라벨: team_id 지정, 해당 팀 이슈에만 적용
- 라벨 그룹: parent_id = null인 라벨이 그룹, 하위에 라벨 추가
- 그룹 내 라벨은 단일 선택 (이슈에 같은 그룹의 라벨 2개 부여 불가)
- workspace 라벨 설정: Settings > Labels
- 팀 라벨 설정: Team Settings > Labels
- API: labels CRUD에 team_id 필터 추가

---

## Unit 1g: Issue Relations 확장

**목표**: blocks, related, duplicate 관계 완성.

**의존**: 1e

**기존 테이블 수정**: `issue_relations.type` 확장

**Paperclip 현재**: type = "blocks"만 구현. UI에 Blocked by / Blocking이 이미 표시됨 (Issue Detail에서 확인).

**QA 기준**:
- issue_relations.type: blocks → + related, duplicate 추가
- related: 양방향 표시
- duplicate: 이슈 A를 B의 duplicate로 마킹 → A의 status가 canceled 카테고리 slug로 자동 변경
- blocking 이슈가 completed 카테고리로 전환 → blocked 이슈의 플래그가 resolved로 전환
- 이슈 상세 사이드바에 relations 섹션 (이미 있음 — Blocked by / Blocking) 확장
- API: 기존 relations API에 type 파라미터 추가

---

## Unit 1h: Estimates

**목표**: 이슈에 estimate 부여, 팀별 스케일 설정.

**의존**: 1e

**기존 테이블 수정**: `issues` — estimate(integer, nullable)

**QA 기준**:
- issues에 estimate 추가 (마이그레이션)
- 팀 settings JSONB에 estimate_scale 추가: exponential/fibonacci/linear/tshirt
- 팀별로 다른 scale 사용 가능
- 이슈 생성/수정 시 estimate 값 선택
- 이슈 목록/상세에서 estimate 표시
- API: issues 생성/수정에 estimate 필드 포함

---

## Unit 1i: 에이전트 시드 + 팀 배치 + 서브에이전트

**목표**: Flotter 팀 체계를 에이전트 + 팀으로 구현. 리더/서브 구분, 서브에이전트 스킬 기반 instructions 자동 주입.

**의존**: 1b (팀), 1d (워크플로우 상태)

**변경 대상**: 시드 스크립트 + agentInstructionsService 확장

**QA 기준**:
- 시드 스크립트로 팀 생성:
  - OS Team (identifier: COM)
  - Flotter Team (상위팀)
    - Engine Team (identifier: ENG, parent: Flotter)
    - Platform Team (identifier: PLT, parent: Flotter)
    - Growth Team (identifier: GRW, parent: Flotter)
    - QA Team (identifier: QA, parent: Flotter)
  - Superbuilder Team (identifier: SB)
- 각 팀에 기본 워크플로우 상태 자동 생성
- 리더 에이전트 시드 (adapterType = claude_local):
  - Sophia (OS Lead), Hana (Flotter CoS), Cyrus (Engine Lead), Felix (Platform Lead), Luna (Growth Lead), Iris (QA Lead), Rex (SB Lead)
- 서브 에이전트 시드 (adapterType = none 또는 sub_agent):
  - Engine: Orion(Architect), Kai(Programmer), Lux(Renderer), Vera(QA)
  - Platform: Yuna(UX), Jett(Engineer), Nova(AI)
  - QA: Remy(Code Review), Zion(UI Test), Blitz(Perf)
  - Growth: Aria(Community)
- 서브 에이전트의 capabilities에 스킬 명시
- team_members에 리더(lead) + 서브(member) 등록
- 리더의 instructions에 팀원 목록 + 스킬 자동 주입 (agentInstructionsService 확장):
  ```
  ## 팀원 (Agent tool로 spawn하여 위임)
  - Orion (Architect): 시스템 설계, 아키텍처 리뷰
  - Kai (Programmer): 구현, 코딩, 디버깅
  - Lux (Renderer): WebGL/Canvas 렌더링 전문
  - Vera (QA): 테스트 작성, 품질 검증
  ```
- OrgChart 페이지에서 전체 계층 확인 가능
- 에이전트 목록에서 리더/서브 구분 표시

---

## 의존관계 요약

```
1a (Fork + Neon)
  └→ 1b (팀 스키마 + API)
       ├→ 1c (팀 UI)
       ├→ 1d (워크플로우 상태)
       │    └→ 1e (이슈 팀 귀속 + 식별자)
       │         ├→ 1f (Labels 확장)
       │         ├→ 1g (Issue Relations)
       │         └→ 1h (Estimates)
       └→ 1i (에이전트 시드 + 팀 배치 + 서브에이전트)
```

## 예상 작업량

| Unit | 내용 | 규모 | 비고 |
|------|------|------|------|
| 1a | Fork + Neon | 소 | 환경 구축 |
| 1b | 팀 스키마 + API | 중 | 신규 테이블 2개 + API 7개 |
| 1c | 팀 UI | 중 | 사이드바 수정 + 팀 설정 페이지 |
| 1d | 워크플로우 상태 | 중 | 신규 테이블 + slug 로직 + UI |
| 1e | 이슈 팀 귀속 + 식별자 | 중-대 | 기존 이슈 확장 + 식별자 전환 + 팀 필터 |
| 1f | Labels 확장 | 소-중 | 기존 labels 수정 + 그룹 로직 |
| 1g | Issue Relations | 소 | type 확장 + 자동화 (기존 UI 있음) |
| 1h | Estimates | 소 | 필드 추가 + 팀 설정 |
| 1i | 에이전트 시드 + 서브에이전트 | 중 | 시드 스크립트 + instructions 자동 주입 |

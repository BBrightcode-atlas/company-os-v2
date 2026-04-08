# COS v2 — Progress

> 마지막 업데이트: 2026-04-08

## Phase 1 — 완료

### Unit 1a: Fork + 클린 환경 ✅

- Repo: `company-os-v2` (Paperclip fork)
- Embedded PG, port 3101 (worktree config), 53→56 마이그레이션
- BBrightcode Corp (issuePrefix BBR) 생성
- 클린 시작 (에이전트 0, 이슈 0)

### Unit 1b: 팀 스키마 + API ✅

- 새 테이블: `teams`, `team_members`
- API 7개:
  - `GET/POST /api/companies/:cid/teams`
  - `GET/PATCH/DELETE /api/companies/:cid/teams/:tid`
  - `GET/POST/DELETE /api/companies/:cid/teams/:tid/members[/:mid]`
- 중복 identifier → 409, soft delete (`status=deleted`)
- `leadAgentId` ↔ `team_members.role=lead` 동기화
- Sub-team (`parentId` self-FK)

### Unit 1c: 팀 UI ✅

- `SidebarTeams.tsx` — TEAMS 섹션 (계층적 표시)
- `pages/Teams.tsx` — `NewTeamPage`, `TeamDetailPage`
- 라우트: `/teams/new`, `/teams/:teamId` + `UnprefixedBoardRedirect` 경유 prefix 자동 추가
- 디테일에 워크플로우 상태 / 멤버 / 카운터 표시

### Unit 1d: 팀별 워크플로우 상태 ✅

- 새 테이블: `team_workflow_statuses` (slug + category + isDefault)
- 팀 생성 시 자동 시드: Backlog/Todo/In Progress/Done/Canceled (5개)
- API 4개: GET/POST/PATCH/DELETE workflow-statuses
- slug immutable (rename 시 유지)
- 카테고리 내 마지막 상태 삭제 → 400
- 중복 slug → 409

### Unit 1e: 이슈 팀 귀속 + 식별자 ✅

- `issues.team_id` FK 추가
- 이슈 생성 시 teamId 있으면 → `team.identifier-team.issue_counter` (예: ENG-42)
- teamId 없으면 → 기존 `company.issuePrefix-company.issueCounter` (BBR-N) 하위호환
- 팀별 독립 카운터 (per-team atomic increment)
- `status` 검증: teamId 있으면 team workflow_statuses.slug에 있는 값만 허용 → 422
- 기본 status = team의 isDefault status slug
- `?teamId=...` 쿼리 필터

### Unit 1f: Labels 확장 ✅

- `labels.team_id` (workspace label vs team label)
- `labels.parent_id` (label group: parent + children)
- API: 기존 labels POST에 teamId/parentId 받음

### Unit 1g: Issue Relations ✅

- `issue_relations.type`: "blocks" → "blocks" | "related" | "duplicate" 스키마 확장
- 새 type 사용 API는 향후 확장 (현재 코드는 "blocks" 하드코딩)

### Unit 1h: Estimates ✅

- `issues.estimate` (integer, nullable)
- `teams.settings` (JSONB) — `{ estimate_scale: "fibonacci" | ... }`

### Unit 1i: 에이전트 시드 + 서브에이전트 ✅

- `scripts/seed-cos-v2.ts` — idempotent 시드
- 팀 트리:
  - OS (COM)
  - Flotter (FLT) → Engine(ENG3) / Platform(PLT3) / Growth(GRW) / QA
  - Superbuilder (SB)
- 7 leader 에이전트 (`adapterType=claude_local`)
- 11 sub-agent (`adapterType=process` + capabilities)
- API: `GET /api/companies/:cid/teams/:tid/instructions-context` — 리더 instructions 자동 주입용 마크다운 + sub-agent 목록

## Phase 1 hardening (post-review fixes)

코드 리뷰(claude code-reviewer + Codex challenge)에서 발견된 5건 fix 완료:

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | P0 | Cross-tenant agent metadata leak (Codex) — team_members가 다른 회사 agent를 cross-tenant로 가질 수 있고 instructions-context로 메타데이터 유출 가능 | `assertAgentInCompany` validator + `team_members.company_id` FK (migration 0057) + instructions-context의 defense-in-depth filter |
| 2 | P0 | Per-team counter race (code-reviewer 95%) — `SELECT max() + UPDATE` 패턴이 READ COMMITTED에서 동일 식별자 collision 가능 | atomic `UPDATE teams SET issue_counter = issue_counter + 1`로 단순화. self-heal 제거 |
| 3 | P1 | workflow status validation create-only (code-reviewer 90%) | `issueService.update()`에 동일 검증 추가, 422 반환 |
| 4 | P1 | `teams.update()` not in transaction (code-reviewer 85%) | 전체 로직을 `db.transaction` + `SELECT FOR UPDATE` row lock으로 wrapping |
| 5 | P1 | `removeMember` missing teamId scope check (code-reviewer 85%) | `WHERE id = $memberId AND team_id = $teamId` |

**검증** (`server` running 후 직접 호출):
- Cross-tenant member insert (3 vectors: addMember/PATCH lead/POST team) → 모두 422 ✓
- 20 parallel issue create → 20 unique identifiers (no dupes) ✓
- UPDATE status to slug not in team workflow → 422 ✓
- removeMember with wrong teamId → 404 ✓
- soft-deleted teams excluded from list ✓

## 알려진 향후 작업

1. **adapter_type=none/sub_agent 미지원** — 시드에서 임시로 `process` 사용. AGENT_ADAPTER_TYPES에 새 type 추가 필요.
2. **issue_relations.type 확장 사용** — 마이그레이션은 적용됐으나 service 코드가 "blocks" 하드코딩. related/duplicate API 추가 필요.
3. **이슈 팀 이동 시 status 리셋** — update 핸들러에 추가 필요.
4. **Instructions 자동 주입** — `instructions-context` 엔드포인트는 만들었으나 leader 시작 시 자동으로 주입하는 로직은 Phase 3에서.

## 마이그레이션 추가 내역

| # | 파일 | 내용 |
|---|------|------|
| 0053 | `cos_teams.sql` | teams + team_members |
| 0054 | `cos_workflow_statuses.sql` | team_workflow_statuses |
| 0055 | `cos_issue_team.sql` | issues.team_id |
| 0056 | `cos_labels_relations_estimates.sql` | labels.team_id/parent_id, issues.estimate, teams.settings |
| 0057 | `cos_team_members_company.sql` | team_members.company_id (cross-tenant fix) |

## 다음 Phase

Phase 2 — 프로젝트 확장 (milestones, health, multi-team via project_teams 조인 테이블)

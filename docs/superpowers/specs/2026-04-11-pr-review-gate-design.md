# PR Review Gate — 설계 스펙

> 에이전트가 PR을 올린 후 자동 검증 → 사람 승인 → GitHub 머지까지의 워크플로우.

## 1. 문제

에이전트가 PR을 올렸다고 보고하지만, 이후 리뷰/승인/머지 프로세스가 COS 안에 없음.
사람이 GitHub에 직접 가서 확인해야 하고, 이슈가 검증 없이 Done으로 넘어갈 수 있음.

## 2. 핵심 원칙

- **승인 없이 Done 불가** — 리뷰 게이트가 활성화된 팀에서는 사람 승인 없이 이슈가 Done으로 전환되지 않음
- **교차 검증** — Claude가 작성한 코드를 Codex(다른 모델)가 독립적으로 검증하여 편향 방지
- **점진적 진화** — 팀 공통 체크리스트가 시간이 지나며 스텝 추가/커스텀으로 성장
- **기존 시스템 재사용** — 승인 게이트는 기존 `approvals` 시스템 확장, UI는 shadcn+tailwind 기반 기존 컴포넌트 활용

## 3. 전체 흐름

```
에이전트가 GitHub PR 생성 (title에 이슈 prefix 포함, e.g. ENG-42)
  → GitHub webhook 수신 (기존 Phase 5.2d)
  → issue_work_products upsert
  → 팀의 review_pipeline_template 조회
     → 없거나 enabled=false → 기존 흐름 (리뷰 게이트 없음)
     → 있으면:
        → review_run 생성
        → 이슈 상태 "in_review" 전환
        → 검증 스텝 순차 실행 (Codex + Claude)
        → 모든 스텝 완료 → approval 레코드 생성 (type: "pr_review")
        → 결과를 룸 or 에이전트에 전달
        → 사람이 COS UI에서 승인/반려
           → 승인: GitHub API로 머지 + 이슈 Done
           → 반려: 사유와 함께 이슈 started 복귀, 룸/에이전트에 전달
```

## 4. 이슈 상태 흐름 변경

```
started → in_review → done
              ↓
           (반려 시 started로 복귀)
```

- `in_review`: PR이 올라오고 리뷰 파이프라인이 시작되면 자동 전환
- `done`: 리뷰 게이트 활성화된 팀에서는 승인 시에만 전환 가능
- 리뷰 게이트 비활성 팀: 기존 흐름 유지 (PR merge → 바로 done)

## 5. 데이터 모델

### 5.1 `project_environments` (신규)

프로젝트별 GitHub 연동 + 배포 환경 정의.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| companyId | uuid | FK → companies |
| projectId | uuid | FK → projects |
| name | text | "production", "staging", "development" |
| slug | text | immutable 식별자 |
| isDefault | boolean | 기본 머지 타겟 환경 |
| config | jsonb | 환경별 설정 (아래 참조) |
| createdAt | timestamp | |
| updatedAt | timestamp | |

**config JSONB 구조:**

```json
{
  "github": {
    "owner": "BBrightcode-atlas",
    "repo": "company-os-v2",
    "baseBranch": "master",
    "webhookSecret": "whsec_xxx"
  },
  "deploy": {
    "url": "https://cos.bbrightcode.com",
    "healthEndpoint": "/api/health"
  },
  "merge": {
    "method": "squash",
    "deleteSourceBranch": true
  }
}
```

### 5.2 `review_pipeline_templates` (신규)

팀별 검증 파이프라인 정의.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| companyId | uuid | FK → companies |
| teamId | uuid | FK → teams (nullable = 전사 공통) |
| name | text | "프론트엔드 리뷰", "API 리뷰" 등 |
| isDefault | boolean | 팀 기본 파이프라인 여부 |
| enabled | boolean | 리뷰 게이트 on/off |
| steps | jsonb | 순서대로 실행할 스텝 정의 배열 |
| createdAt | timestamp | |
| updatedAt | timestamp | |

**steps JSONB 구조:**

```json
[
  {
    "slug": "code-quality",
    "name": "코드 품질 (Codex)",
    "type": "auto",
    "executor": "codex",
    "config": {
      "mode": "review",
      "prompt": "PR diff를 분석하여 코드 품질, 보안 취약점, 안티패턴을 검증하라."
    }
  },
  {
    "slug": "regression-check",
    "name": "기존 기능 영향 (Codex)",
    "type": "auto",
    "executor": "codex",
    "config": {
      "mode": "review",
      "prompt": "변경된 파일 기준으로 영향 범위와 기존 기능 회귀 가능성을 분석하라."
    }
  },
  {
    "slug": "issue-requirements",
    "name": "이슈 요구사항 충족",
    "type": "auto",
    "executor": "claude",
    "config": {
      "source": "issue"
    }
  },
  {
    "slug": "screenshot-check",
    "name": "화면 검증",
    "type": "auto",
    "executor": "builtin",
    "config": {
      "handler": "builtin:screenshot",
      "checkBlankScreen": true
    }
  }
]
```

- `type`: `"auto"` (에이전트/시스템 자동) / `"manual"` (사람이 직접 체크)
- `executor`: `"codex"` / `"claude"` / `"builtin"`
- `source: "issue"` → 이슈 요구사항에서 체크 항목 자동 추출

### 5.3 `review_runs` (신규)

PR당 파이프라인 실행 인스턴스.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| companyId | uuid | FK |
| workProductId | uuid | FK → issue_work_products |
| issueId | uuid | FK → issues |
| pipelineTemplateId | uuid | FK → review_pipeline_templates |
| status | text | `running` / `passed` / `failed` / `cancelled` |
| triggeredBy | text | `webhook` / `manual` |
| startedAt | timestamp | |
| completedAt | timestamp | |
| createdAt | timestamp | |

- PR synchronize(새 커밋 push) 시: 기존 `running`/`failed` run을 `cancelled`하고 새 run 생성

### 5.4 `review_checks` (신규)

각 스텝의 실행 결과.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| reviewRunId | uuid | FK → review_runs |
| stepSlug | text | 파이프라인 스텝 식별자 |
| stepName | text | 표시명 |
| stepType | text | auto / manual |
| executor | text | codex / claude / builtin / manual |
| status | text | `pending` / `running` / `passed` / `failed` / `skipped` |
| summary | text | 결과 요약 (사람이 읽을 수 있는 코멘트) |
| details | jsonb | 상세 결과 (diff 위치, 라인 번호 등) |
| checkedByAgentId | uuid | nullable, 자동 검증한 에이전트 |
| checkedByUserId | uuid | nullable, 수동 체크한 사람 |
| checkedAt | timestamp | |
| createdAt | timestamp | |

### 5.5 기존 시스템 확장

**approvals 테이블:**
- `type` 값에 `"pr_review"` 추가
- `payload` JSONB: `{ "reviewRunId": "...", "workProductId": "...", "issueId": "...", "prUrl": "...", "checkSummary": { "passed": 3, "failed": 1, "total": 4 } }`

**issue_approvals:**
- 기존 M:N 연결 그대로 사용하여 이슈와 pr_review approval 연결

**GitHub 인증:**
- **webhook secret**: `project_environments.config.github.webhookSecret`에 저장 (webhook 수신 검증용)
- **GitHub token**: 기존 `company_secrets` 시스템에 `github_token` 시크릿으로 저장 (머지 API 호출용)
- webhook secret은 환경별로 다를 수 있고, GitHub token은 회사 단위로 공유

## 6. 검증 파이프라인 실행

### 6.1 트리거

```
GitHub webhook (pull_request: opened/synchronize)
  → issue_work_products upsert (기존 로직)
  → 이슈의 팀 조회 → review_pipeline_template 조회
     → enabled=false or 없음 → 기존 흐름
     → enabled=true:
        → 기존 running/failed review_run이 있으면 cancelled 처리
        → 새 review_run 생성 (status: running)
        → 이슈 상태 → in_review
        → steps 배열 기준으로 review_checks 레코드 생성 (모두 pending)
        → 첫 번째 스텝 실행 시작
```

### 6.2 스텝 실행

```
스텝 실행 (순차):
  → review_check.status = running
  → executor에 따라 실행:
     - codex: Codex CLI 서브에이전트 spawn, PR diff + 프롬프트 전달
     - claude: 팀 리더 에이전트에게 검증 작업 위임
     - builtin: 내장 핸들러 실행
     - manual: 사람 입력 대기 (UI에서 체크)
  → 결과: summary + details 저장, status = passed/failed
  → 다음 스텝 실행
  → 모든 스텝 완료:
     - 전부 passed → review_run.status = passed
     - 하나라도 failed → review_run.status = failed
```

### 6.3 Codex 검증 실행

- Claude가 작성한 코드를 Codex(다른 모델)가 독립적으로 검증 → 교차 검증
- 기존 `codex:codex-rescue` 서브에이전트 패턴 활용
- GitHub API로 PR diff 조회 → Codex에 전달
- Codex 프롬프트는 팀별로 커스텀 가능 (steps[].config.prompt)

### 6.4 이슈 요구사항 검증

- Claude 에이전트가 이슈 description/acceptance criteria 파싱
- PR diff와 매칭하여 누락된 요구사항 플래그
- 결과를 체크리스트 형태로 review_check.details에 저장

### 6.5 완료 후 처리

```
review_run 완료
  → approval 레코드 생성 (type: "pr_review", status: "pending")
  → issue_approvals로 이슈 연결
  → 알림 전달:
     - passed: 승인 권한자에게 승인 큐 + 룸 알림
     - failed: 이슈 담당 룸 or 에이전트에 실패 사유 전달
```

## 7. 승인/반려 처리

### 7.1 승인

```
사람이 COS UI에서 승인 클릭
  → approval.status = approved
  → project_environment에서 GitHub 설정 조회
  → GitHub API: PUT /repos/{owner}/{repo}/pulls/{number}/merge
     - merge_method: config.merge.method (기본 squash)
  → 성공:
     - issue_work_products.status = "merged"
     - 이슈 상태 → done
     - config.merge.deleteSourceBranch=true면 소스 브랜치 삭제
     - 룸/에이전트에 머지 완료 알림
  → 실패 (충돌 등):
     - 에러 메시지 UI 표시
     - approval 상태 유지 (pending)
     - 룸/에이전트에 머지 실패 알림
```

### 7.2 반려

```
사람이 반려 클릭 + 사유 입력
  → approval.status = rejected, decisionNote = 사유
  → 이슈 상태 → started (복귀)
  → 전달:
     - 이슈에 연결된 룸이 있으면 → 룸에 반려 메시지 전달
     - 룸이 없으면 → 이슈 담당 에이전트(리더)에 전달
  → 에이전트가 수정 후 새 커밋 push → PR synchronize → 새 review_run 시작
```

## 8. PR 감지 및 환경 매칭

### 8.1 webhook 수신 흐름 변경

```
현재: webhook secret으로 company 매칭 → PR title에서 이슈 prefix 매칭
변경: webhook secret으로 project_environment 매칭
      → 해당 project의 이슈 prefix로 PR 매칭
      → base branch 검증 (타겟이 환경의 baseBranch와 일치?)
      → issue_work_products 저장
      → 리뷰 게이트 확인 → review_run 시작
```

### 8.2 실패 케이스

| 실패 상황 | 처리 |
|-----------|------|
| PR title에 이슈 prefix 없음 | work_product 생성 안됨, 무시 |
| webhook secret 불일치 | 403 반환, 로그 기록 |
| 매칭된 이슈 없음 | activity_log에 경고 |
| base branch 환경 불일치 | work_product 저장하되 환경 불일치 플래그 |
| 머지 시 충돌 | 승인 상태 유지, 에러 표시, 에이전트/룸에 알림 |

## 9. UI 설계

기존 shadcn+tailwind 기반 컴포넌트를 최대한 재사용.

### 9.1 이슈 상세 — Review 탭

이슈 상세 페이지(`IssueDetail.tsx`)의 기존 탭 구조에 "Review" 탭 추가.

**사용할 기존 컴포넌트:**
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` (shadcn)
- `Badge` — 스텝 상태 표시 (passed/failed/running/pending)
- `Button` — 승인/반려/재검증 액션
- `Card` — 각 체크 항목 카드
- `Collapsible` — 체크 상세 결과 펼침/접기
- `Dialog` — 반려 사유 입력 모달
- `ScrollArea` — 체크리스트 스크롤
- `Skeleton` — 로딩 상태

**레이아웃:**

```
[Review 탭]
  PR #127: feat: redesign login screen
  main ← feature/eng-42-login          [GitHub에서 보기 ↗]

  ── 검증 결과 (3/4 통과) ──────────────

  ✅ 코드 품질 (Codex)                    passed
     ▸ 상세 보기
  ✅ 기존 기능 영향 (Codex)               passed
     ▸ 상세 보기
  ❌ 이슈 요구사항 (Claude)               failed
     ▸ "다크모드 대응 누락 (AC #3)"
  ⏳ 화면 검증                            pending

  ── 액션 ──────────────────────────────
  [승인 + 머지]  [반려]  [재검증]
```

- 각 체크 항목은 `Card` + `Collapsible`로 구성
- 상태 아이콘: `CheckCircle2` (passed), `XCircle` (failed), `Clock` (pending), `Loader2` (running) — 기존 `ApprovalCard.tsx` 패턴 동일
- 승인/반려 버튼은 모든 auto 스텝 완료 후 활성화
- failed 상태에서도 승인 가능 (사람 판단 우선)

### 9.2 프로젝트 설정 — Environments 탭

프로젝트 설정 페이지에 탭 추가. 기존 설정 페이지 레이아웃 패턴(`max-w-2xl space-y-6`, `Field` 프리미티브) 재사용.

**레이아웃:**

```
[General] [Members] [Environments]

production ★ (default)
  ┌────────────────────────────────────┐
  │ GitHub: BBrightcode-atlas/company-os-v2
  │ Branch: master
  │ Deploy: https://cos.bbrightcode.com
  │ Merge: squash, 소스 브랜치 삭제
  │ [Edit] [Delete]
  └────────────────────────────────────┘

[+ Add Environment]
```

**사용할 기존 컴포넌트:**
- `PageTabBar` 또는 `Tabs` — 탭 전환
- `Card` — 환경 카드
- `Dialog` — 환경 추가/편집 모달
- `Input`, `Select`, `Checkbox` — 폼 필드
- `Badge` — default 환경 표시

### 9.3 팀 설정 — Review Pipeline 탭

팀 설정 페이지에 탭 추가.

**레이아웃:**

```
[Workflow] [Members] [Review Pipeline]

☑ 리뷰 게이트 활성화                  (ToggleSwitch)

── 검증 스텝 ──────────────────────────
1. 코드 품질 (Codex)        [auto] [⚙]   (drag handle)
2. 기존 기능 영향 (Codex)   [auto] [⚙]
3. 이슈 요구사항 (Claude)   [auto] [⚙]
4. 화면 검증                [auto] [⚙]

[+ 스텝 추가]

── 머지 설정 ──────────────────────────
방식: [Squash ▾]
자동 브랜치 삭제: ☑
```

**사용할 기존 컴포넌트:**
- `ToggleSwitch` — 리뷰 게이트 on/off
- `Card` — 각 스텝 카드
- `Badge` — auto/manual 타입 표시
- `Select` — 머지 방식 선택
- `Checkbox` — 브랜치 삭제 옵션
- `Dialog` — 스텝 추가/편집 모달
- `Button` — ⚙ 설정 버튼

### 9.4 승인 큐 통합

기존 `Approvals.tsx` 페이지에 `pr_review` 타입 자동 통합.
- `ApprovalCard.tsx`의 `typeIcon`/`typeLabel` 맵에 `pr_review` 추가
- 카드에 체크 요약 표시 (3/4 passed 등)
- 클릭 시 이슈 상세의 Review 탭으로 이동

## 10. 알림/전달 흐름

| 이벤트 | 전달 대상 | 방식 |
|--------|----------|------|
| 리뷰 시작 | 이슈 담당 룸 or 에이전트 | Mission Room 메시지 |
| 검증 완료 (passed) | 승인 권한자 (사람) | 승인 큐 + 룸 알림 |
| 검증 완료 (failed) | 이슈 담당 룸 or 에이전트 | 실패 사유와 함께 전달 |
| 승인 + 머지 성공 | 에이전트 + 룸 | 머지 결과 포함 |
| 반려 | 에이전트 + 룸 | 반려 사유 포함, started 복귀 |
| 머지 실패 | 승인자 + 에이전트 | 에러 메시지 (충돌 등) |

기존 `activity_log` + SSE 이벤트 시스템 활용. 새 action 타입 추가:
- `review_started`, `review_passed`, `review_failed`
- `pr_approved`, `pr_rejected`, `pr_merged`, `pr_merge_failed`

## 11. API 엔드포인트

### 프로젝트 환경

```
GET    /api/companies/:companyId/projects/:projectId/environments
POST   /api/companies/:companyId/projects/:projectId/environments
PUT    /api/companies/:companyId/projects/:projectId/environments/:envId
DELETE /api/companies/:companyId/projects/:projectId/environments/:envId
```

### 리뷰 파이프라인 템플릿

```
GET    /api/companies/:companyId/teams/:teamId/review-pipeline
PUT    /api/companies/:companyId/teams/:teamId/review-pipeline
```

### 리뷰 실행

```
GET    /api/companies/:companyId/issues/:issueId/reviews
GET    /api/companies/:companyId/issues/:issueId/reviews/:runId
POST   /api/companies/:companyId/issues/:issueId/reviews/:runId/rerun
POST   /api/companies/:companyId/issues/:issueId/reviews/:runId/approve
POST   /api/companies/:companyId/issues/:issueId/reviews/:runId/reject
```

### 리뷰 체크 (수동 스텝용)

```
PUT    /api/companies/:companyId/reviews/:runId/checks/:checkId
```

## 12. 팀/프로젝트별 설정

- **리뷰 게이트 on/off**: `review_pipeline_templates.enabled` (팀 단위)
- **리뷰 게이트 비활성 팀**: 기존 흐름 유지 (PR merge webhook → 바로 done)
- **프로젝트별 환경**: `project_environments`로 GitHub repo/branch/merge 설정 관리
- **팀별 파이프라인 커스텀**: steps 배열에 스텝 추가/제거/순서 변경

## 13. 점진적 확장 경로

### Phase 1 (MVP)
- project_environments CRUD + UI
- review_pipeline_templates CRUD + UI
- review_runs/review_checks 생성 및 실행
- Codex 코드 검증 + Claude 이슈 요구사항 검증
- 승인/반려 → GitHub 머지
- 이슈 상태 흐름 (in_review → done/started)

### Phase 2
- 커스텀 검증 스텝 (screenshot-check, E2E test 연동)
- 팀별 Codex 프롬프트 커스터마이징
- 리뷰 히스토리/통계

### Phase 3
- 자동 승인 규칙 (모든 체크 passed + 특정 조건 → 자동 머지)
- 멀티 리뷰어 (여러 사람 승인 필요)
- 리뷰 SLA 추적

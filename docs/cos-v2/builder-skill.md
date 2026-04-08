---
name: cos-v2-builder
description: COS v2 빌더 — 계획 기반 연속 실행. 현재 상태 파악 → 다음 유닛 진행 → 리뷰/QA → 반복.
user-invocable: true
---

# COS v2 Builder

Paperclip fork 기반 COS v2를 Phase 1 계획에 따라 연속 구현하는 빌더.
`/cos-v2` 실행할 때마다 현재 진행 상태를 파악하고, 다음 작업을 진행한다.

## 핵심 원칙

1. **매번 상태 파악부터** — 어디까지 됐는지 확인 후 진행
2. **유닛 단위 실행** — 한 번에 하나의 유닛만 진행
3. **유닛 완료 후 리뷰** — spec 준수 확인 + Codex 비판적 리뷰
4. **QA 통과해야 다음 유닛** — 리뷰 이슈 미해결 시 다음 유닛 진행 안 함
5. **Paperclip 기존 UI/코드에 추가하는 방식** — 재구현 아님

## 실행 흐름

```
/cos-v2 실행
  │
  ├── 1. 상태 파악
  │   ├── company-os-v2 repo 존재 여부
  │   ├── 서버 동작 여부 (port 3100)
  │   ├── DB 상태 (teams 테이블 존재 여부 등)
  │   ├── 진행 상태 파일 읽기 (docs/superpowers/plans/progress.md)
  │   └── 현재 유닛 판정
  │
  ├── 2. 현재 유닛 실행
  │   ├── 상세 구현 계획이 있으면 → subagent-driven-development로 실행
  │   ├── 상세 구현 계획이 없으면 → 먼저 계획 작성
  │   └── 실행 완료 후 QA 체크리스트 검증
  │
  ├── 3. 리뷰 (유닛 완료 시)
  │   ├── Spec 준수 확인 (Phase 1 breakdown의 QA 기준 대조)
  │   ├── Codex 비판적 리뷰 (/codex review)
  │   └── 이슈 있으면 수정 후 재리뷰
  │
  └── 4. 진행 기록 + 다음 유닛 안내
      ├── progress.md 업데이트
      └── "다음: Unit 1x — /cos-v2 실행하여 계속"
```

## 상태 파악 방법

### Step 1: repo 확인
```bash
[ -d ~/Projects/company-os-v2 ] && echo "REPO_EXISTS" || echo "REPO_MISSING"
```

### Step 2: 서버 확인
```bash
curl -s http://127.0.0.1:3100/api/health 2>/dev/null | grep -q '"ok"' && echo "SERVER_UP" || echo "SERVER_DOWN"
```

### Step 3: DB 스키마 확인 (teams 테이블 등)
```bash
# company-os-v2 서버가 떠있을 때
curl -s http://127.0.0.1:3100/api/companies 2>/dev/null | head -1
# teams API 존재 여부
COMPANY_ID=$(curl -s http://127.0.0.1:3100/api/companies 2>/dev/null | jq -r '.[0].id // empty')
[ -n "$COMPANY_ID" ] && curl -s "http://127.0.0.1:3100/api/companies/$COMPANY_ID/teams" 2>/dev/null | head -1
```

### Step 4: 진행 파일 읽기
진행 파일은 **company-os-v2 repo 안**에 존재. repo가 없으면 Unit 1a부터.
```bash
cat ~/Projects/company-os-v2/docs/cos-v2-progress.md 2>/dev/null || echo "NO_PROGRESS_FILE"
```

## 유닛 판정 로직

| 조건 | 현재 유닛 |
|------|-----------|
| repo 없음 | **1a** (Fork + 클린 환경) |
| repo 있지만 서버 안 뜸 | **1a** (환경 수정 필요) |
| 서버 뜨지만 teams API 없음 | **1b** (팀 스키마 + API) |
| teams API 있지만 UI에 팀 없음 | **1c** (팀 UI) |
| 팀 UI 있지만 workflow_statuses API 없음 | **1d** (워크플로우 상태) |
| workflow 있지만 issues에 team_id 없음 | **1e** (이슈 팀 귀속) |
| issues에 team_id 있지만 labels에 team_id 없음 | **1f** (Labels 확장) |
| labels 확장 완료 | **1g** (Issue Relations) |
| relations 확장 완료 | **1h** (Estimates) |
| estimates 완료 | **1i** (에이전트 시드 + 서브에이전트) |
| 전부 완료 | **Phase 1 완료** → Phase 2 안내 |

## 유닛별 상세 계획 위치

| 유닛 | 계획 파일 |
|------|-----------|
| 1a | `docs/superpowers/plans/2026-04-08-unit-1a-fork-setup.md` |
| 1b | 미작성 → 실행 시 자동 생성 |
| 1c | 미작성 → 실행 시 자동 생성 |
| 1d~1i | 미작성 → 실행 시 자동 생성 |

## 리뷰 프로세스

유닛 완료 후:

### 1. Spec 준수 확인
Phase 1 breakdown (`docs/superpowers/plans/2026-04-08-cos-v2-phase1-breakdown.md`)의 해당 유닛 QA 기준을 하나씩 체크.

### 2. Codex 비판적 리뷰
```
/codex review
```
diff 기반으로 Codex가 코드 리뷰. P1 이슈 있으면 수정 필수.

### 3. 결과 기록
progress.md에 기록:
```markdown
## Unit 1x: [이름]
- 상태: ✅ 완료 / 🔄 진행중 / ❌ 블로킹
- 완료일: YYYY-MM-DD
- Codex 리뷰: PASS / FAIL (이슈 N개)
- 미해결 이슈: (있으면 기록)
```

## 참조 문서

스펙/계획은 **company-os** repo에 있고, 작업은 **company-os-v2** repo에서 한다.

- 전체 스펙: `~/Projects/company-os/docs/superpowers/specs/2026-04-08-cos-v2-mission-room-design.md`
- Paperclip 분석: `~/Projects/company-os/docs/superpowers/specs/2026-04-08-paperclip-analysis.md`
- Phase 1 분해: `~/Projects/company-os/docs/superpowers/plans/2026-04-08-cos-v2-phase1-breakdown.md`
- Unit 1a 계획: `~/Projects/company-os/docs/superpowers/plans/2026-04-08-unit-1a-fork-setup.md`
- 진행 상태: `~/Projects/company-os-v2/docs/cos-v2-progress.md` (Unit 1a 완료 후 생성)
- 작업 repo: `~/Projects/company-os-v2/` (Paperclip fork)

## 주의사항

- **Paperclip 기존 코드/UI를 재구현하지 않는다** — 추가만 한다
- **기존 사이드바에 Teams 메뉴를 삽입한다** — 새 사이드바를 만들지 않는다
- **issues.status는 text 유지** — FK 전환하지 않는다, API 검증만
- **workflow status에 immutable slug 사용** — name은 변경 가능, slug는 불변
- **서브에이전트는 adapterType이 다름** — CLI 없음, 리더가 Agent tool로 spawn

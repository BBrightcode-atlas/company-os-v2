---
title: Tool Whitelist Enforcement — 설계 노트
summary: Builder/Critic/Scout/Specialist 의 tool 접근 차별을 adapter 레벨에서 물리적으로 강제하는 설계
---

# Tool Whitelist Enforcement

`agent-roles.md` 가 정의한 tool 차별 — Remy 실행 금지 / Vera Edit 금지 / Scout Write 금지 등 — 은 현재 **문서 규약** 수준. Claude / Builder 가 "안 하기로 약속" 한 것일 뿐 물리적으로 막히지 않는다.

이 문서는 그 규약을 **adapter 레벨에서 물리적 차단** 으로 끌어올리기 위한 설계. 구현은 별도 phase.

---

## 왜 필요한가

MASFT (arXiv 2503.13657) 의 핵심 실패 모드 중 하나가 `Disobey role specification`. 같은 모델에게 "너는 리뷰어야 코드 실행하지 마" 라고 프롬프트로만 시키면, 상황에 따라 규약을 어긴다 (특히 "더 나은 해결책을 찾았으니" 라는 합리화 하에).

**해결책**: 프롬프트 지시가 아니라 **tool 자체를 안 주는 것**. Remy 에게 Bash 권한을 안 주면 실행하고 싶어도 못 한다.

---

## 현재 상태 분석

### 3 레이어

| 레이어 | 어디서 실행 | tool 제어 현황 | 우리가 바꿔야 할 곳 |
|---|---|---|---|
| **1. Leader CLI (Coordinator)** | claude_local adapter → Claude Code CLI | `extraArgs` 로 `--allowedTools` / `--disallowedTools` 전달 가능. **현재 미사용** | Coordinator 는 풀 접근 유지 (변경 없음) |
| **2. Claude Code subagent** | Leader CLI 내부에서 `Agent` tool 로 spawn. subagent 정의는 YAML frontmatter 의 `tools:` 필드 | **현재 `.claude/agents/` 디렉토리 없음** — subagent 정의 자체가 없음 | Builder/Critic/Scout/Specialist 용 subagent 정의 파일 신규 작성 |
| **3. Process adapter** | 임의 child process. COS v2 seed 의 sub-agent 들이 여기 속함 | tool 제어 없음 (프로세스 내부 자유) | **사용하지 않음** — Builder/Critic 은 subagent 로 전환 |

### 현재 이슈

1. seed 는 Builder/Critic 을 `adapterType: process` 로 만들지만 실제 실행은 이루어지지 않음 (adapterConfig 기본값 `{}`). 이건 DB 에 identity 만 등록된 상태.
2. 실제 spawn 은 Coordinator(claude_local) 가 미션 중 Agent tool 로 할 예정인데, subagent 정의 파일이 아직 없음.
3. 따라서 tool whitelist 는 **문서에만 존재**.

---

## 설계: 3-Layer Enforcement

### Layer A — Coordinator (변경 최소)

- claude_local adapter 그대로 사용
- `--dangerously-skip-permissions` 유지 (헤드리스 모드)
- tool 차단 없음. Coordinator 는 모든 툴 사용 가능 (직접 구현은 정책상 금지이지만 기술적 차단은 아님)

### Layer B — Claude Code Subagent 정의 (핵심 변경)

각 pool 에이전트를 Claude Code subagent 로 정의. `.claude/agents/<name>.md` 또는 `packages/cos-agents/<name>.md`.

**디렉토리 배치 후보**:
- `.claude/agents/` — 프로젝트 단위 subagent (Claude Code 가 auto-discover)
- `packages/cos-agents/` — 패키지 형태로 배포하고 레더가 `--add-dir` 로 포함

권장: `.claude/agents/` 로 시작 (검증 쉬움). 나중에 패키지화.

**subagent YAML frontmatter 예시**:

```markdown
---
name: cos-builder
description: COS v2 Builder — 통합 구현자. 미션 brief 의 Owned scope 내에서 FE/BE/infra/design 구현.
tools: Read, Grep, Glob, Edit, Write, Bash, TodoWrite
---

당신은 COS v2 Builder (Kai) 입니다.

- Owned scope 외 파일 수정 금지 (Coordinator 가 reject)
- 모든 변경은 brief 의 Definition of done 에 명시된 기준 충족
- Bash 는 build/test 명령 한정 (rm -rf / force push 등 위험 명령 금지)
- 완료 시 return schema 준수 필수
```

**Critic — Static (Remy)**:
```yaml
---
name: cos-critic-static
description: COS v2 Critic (Static) — diff 리뷰 전용. 실행 금지.
tools: Read, Grep, Glob
---
```
`Bash`, `Edit`, `Write` 제외 → 실행/수정 물리 차단.

**Critic — Dynamic (Vera)**:
```yaml
---
name: cos-critic-dynamic
description: COS v2 Critic (Dynamic) — acceptance scenario 실행 검증 전용.
tools: Read, Grep, Glob, Bash
---
```
`Edit`, `Write` 제외 → 소스 수정 차단. Bash 는 test/curl 용도.

**Scout (Orion)**:
```yaml
---
name: cos-scout
description: COS v2 Scout — read-only 탐색.
tools: Read, Grep, Glob, WebSearch, WebFetch
---
```
`Bash`, `Edit`, `Write` 전부 제외.

**Specialist — UI Verifier (Zion)**:
```yaml
---
name: cos-ui-verifier
description: COS v2 UI Verifier — Playwright 기반 시각/인터렉션 검증.
tools: Read, Grep, mcp__plugin_playwright_playwright__*
---
```
MCP Playwright tool wildcard 허용. `Edit`/`Write` 제외.

**Specialist — Perf Checker (Blitz)**:
```yaml
---
name: cos-perf-checker
description: COS v2 Perf Checker — bench harness 기반 성능 측정.
tools: Read, Grep, Bash
---
```
Bench harness 실행용 Bash 허용. Edit 제외.

**Specialist — Infra Operator (Jett)**:
```yaml
---
name: cos-infra-operator
description: COS v2 Infra Operator — 배포/observability.
tools: Read, Grep, Bash
---
```
Build/deploy 용 Bash. Edit 제외 (Infra 설정 변경은 Builder 가 PR 로).

### Layer C — Coordinator 의 subagent 호출 규약

Coordinator 가 `Agent` tool 로 spawn 할 때:

```typescript
// Coordinator pseudo-code
Agent({
  subagent_type: "cos-builder",    // ← YAML name 과 일치
  description: "ENG3-142 drag-to-select 수정",
  prompt: formatMissionBrief(brief),  // mission-brief.template.md 11필드
})
```

- `subagent_type` 는 YAML `name` 과 정확히 일치해야 Claude Code 가 tool whitelist 적용
- 잘못된 타입 지정 시 기본 general-purpose 로 fallback → **tool 차단 우회됨**
- 이 risk 를 낮추려면 Coordinator instructions 에 "cos- prefix 만 쓰라" 고 강제

---

## 구현 로드맵

### Phase T1 — Subagent 정의 파일 생성 (최우선)
- `.claude/agents/cos-builder.md`
- `.claude/agents/cos-critic-static.md`
- `.claude/agents/cos-critic-dynamic.md`
- `.claude/agents/cos-scout.md`
- `.claude/agents/cos-ui-verifier.md`
- `.claude/agents/cos-perf-checker.md`
- `.claude/agents/cos-infra-operator.md`

각 파일은 YAML frontmatter + 역할 프롬프트 본문. Layer B 예시 참조.

검증:
- Leader CLI 실행 후 `Agent(subagent_type: "cos-critic-static", ...)` 로 spawn
- 내부에서 `Bash` tool 시도 → 차단 확인
- `Edit` tool 시도 → 차단 확인

### Phase T2 — Coordinator 프롬프트 주입
- Coordinator(Sophia/Hana/Rex) instructions bundle 에 7개 subagent 사용 규약 추가
- 미션 유형 → 어떤 subagent 호출할지 결정 트리 문서화

### Phase T3 — Agent DB 엔트리와 Subagent 이름 매핑
- `agents.metadata.subagentType` 필드에 `cos-builder` 등 저장
- 모니터링/로깅 시 DB identity ↔ 실제 실행 subagent 일치 확인

### Phase T4 — Critic violation 자동 감지
- Coordinator 세션 로그에서 Critic 이 Edit/Bash 를 시도했는데 차단된 이벤트 수집
- 월간 리포트: violation 건수 / subagent 별 distribution
- 특정 subagent 에서 반복 violation → 규약 재설계 신호

### Phase T5 — Process adapter 잔존 정리
- DB 에 남은 `adapterType: process` 인 Builder/Critic/Scout 엔트리의 adapterConfig 정리 (placeholder 임을 명시)
- 또는 adapter 자체를 `claude_subagent` 같은 새 타입으로 명시 (선택)

---

## 엣지 케이스

### MCP tool 포함 여부
- Playwright/Context-mode 등 MCP tool 은 `mcp__<server>__<tool>` 네이밍. YAML `tools` 에 wildcard 포함 가능
- UI Verifier 는 MCP Playwright 필요 → `mcp__plugin_playwright_playwright__*`

### TodoWrite / Task 툴
- 모든 subagent 가 TodoWrite 필요? Builder 는 yes. Critic 은 자체 진행 추적용으로 허용 검토
- Task(Agent) tool 은 subagent 가 또다른 subagent 를 spawn 하는 행위 — **원칙상 금지**. Coordinator 만 spawn.

### Skill 접근
- 각 subagent 는 mission brief 의 skill bundle 로만 스킬 사용
- 전역 Skill tool 자체는 subagent 에게 주되, brief 가 허용한 skill 만 invoke 하도록 프롬프트 제약
- 물리적 차단은 어려움 — 향후 Claude Code 가 per-subagent skill whitelist 제공하면 도입

### Bash 의 부분 허용
- `Bash` tool 은 all-or-nothing. "test 만 허용, rm 금지" 같은 세분화 불가
- Vera 에게 Bash 주되 프롬프트로 제약 + Coordinator 가 post-hoc 실행 로그 감사

---

## 성공 측정

| 지표 | 의미 | 목표 |
|---|---|---|
| Critic Edit/Write 시도 차단 건수 | Remy/Vera 가 규약 어기려 한 횟수 | 모니터링용 (0 이 이상적이지만 발생 = 감사 신호) |
| Subagent type 오지정 건수 | Coordinator 가 잘못된 subagent_type 사용 | 0 (발생 시 instructions 보강) |
| Builder 가 Owned scope 벗어난 수정 | scope 이탈 | PR 단계에서 Coordinator reject 로 차단 |

---

## 결정 필요 사항 (구현 전)

1. `.claude/agents/` vs 패키지화 — 어디에 subagent 정의를 둘지
2. `subagentType` 을 agents 테이블 컬럼으로 승격할지 metadata json 으로 둘지
3. Coordinator instructions bundle 수정 권한/절차 (세션 중 동적 변경 vs 배포 시점 고정)
4. Bash 세분화 제어 필요 수준 — 현재는 YAML 에서 all/nothing

---

## 참조

- `docs/cos-v2/agent-roles.md` — 역할별 tool whitelist 사양
- `docs/cos-v2/mission-brief.template.md` — 미션 brief 의 Allowed tools 필드
- `packages/adapters/claude-local/src/server/execute.ts:438-457` — claude CLI args 빌드
- MASFT (arXiv 2503.13657) — `Disobey role specification` 실패 모드 근거
- Anthropic Claude Code subagent docs — YAML frontmatter `tools:` 필드 규격

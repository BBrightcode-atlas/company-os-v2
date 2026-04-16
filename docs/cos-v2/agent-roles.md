---
title: Agent Roles — Builder-centric Cell 구조
summary: 10명 구조, tool whitelist, 병렬 규칙, Critic 독립성, 은퇴 명단
---

# Agent Roles

COS v2 에이전트 조직의 최종 설계. **Simple × Powerful** 원칙.
복잡한 11-역할 트리 (Architect/Programmer/Renderer/...) 에서
**Builder 1명 + Critic 2명 + Scout 1명 + 조건부 Specialist 3명** + Coordinator 3명 으로 축소.

## 설계 근거

공개 근거 및 옵션 비교는 `docs/cos-v2/agent-design-rationale.md`(본 커밋에서 생성되지 않음 — 필요 시 후속 PR) 또는 설계 세션 기록 참조. 요약:

- Anthropic multi-agent research: 코딩 작업은 병렬화 단위가 적음. multi-agent 는 breadth-first research 에서만 강함
- MASFT 논문 (arXiv 2503.13657): `Disobey role specification` 이 실제 측정된 실패. 같은 모델·같은 툴이면 role theater
- AgentCoder: `programmer / test-designer / executor` 최소 기능 분화가 HumanEval-ET 77.4% 로 win
- MetaGPT: 자유대화보다 **구조화된 handoff contract** 가 효율 우세
- Claude Code / Cursor / Devin / Factory: 전부 `작고 독립된 미션 · 별도 컨텍스트 · 툴 제한` 을 채택

결론: **인간 조직도 모사 ❌  ·  기능 분화 + 툴 차별성 ✅**

---

## 조직도

```
BBrightcode Corp
│
├─ 팀 버킷 (이슈 분류 전용 · 에이전트와 분리)
│   ├─ COM   (OS)
│   ├─ FLT   (Flotter)  ├─ ENG3 ├─ PLT3 ├─ GRW ├─ QA
│   └─ SB    (Superbuilder)
│
├─ Coordinator  (claude_local · CLI · 인간 접점 · 최종 승인권자)
│   ├─ Sophia   — OS
│   ├─ Hana     — Flotter (ENG3/PLT3/GRW/QA 통합)
│   └─ Rex      — SB
│
├─ Builder  (process · 통합 구현자)
│   └─ Kai     — FE/BE/infra/design 전부. skill bundle + tool whitelist 로 차별화
│
├─ Critic  (process · Builder 와 물리적 격리 · 병렬 spawn · 승인권 없음)
│   ├─ Remy    — Reviewer (static diff 리뷰)
│   └─ Vera    — QA (dynamic 실행 검증)
│
├─ Scout  (process · 값싼 read-only 조사)
│   └─ Orion   — 탐색 / 리서치 / 로그 수집
│
└─ Specialist  (조건부 · 실제 tool/권한 차이 있을 때만 spawn)
    ├─ Zion    — UI Verifier      (브라우저 / Playwright)
    ├─ Blitz   — Perf Checker     (perf harness 존재 시)
    └─ Jett    — Infra Operator   (배포 판단 필요 시)
```

총 **10명** · 상시 7 + 조건부 3

---

## 역할 명세

| 이름 | 레이어 | adapter | 입력 | Tool whitelist | 금지 | 산출물 |
|---|---|---|---|---|---|---|
| **Sophia** / **Hana** / **Rex** | Coordinator | `claude_local` | 이슈, 사용자 요청 | 전체 | 직접 구현 (예외만) | 미션 brief, fan-out 결정, 최종 승인 |
| **Kai** | Builder | `process` | 미션 brief | Read, Edit, Write, Bash, Grep + 미션별 skill bundle | `Owned scope` 외 파일 수정 | 코드 + 구현 노트 + 실행 로그 |
| **Remy** | Critic (Static) | `process` | diff + acceptance criteria | Read, Grep, lint, typecheck, security scan | **실행 금지**, **Edit 금지** | line annotation + P1/P2 findings |
| **Vera** | Critic (Dynamic) | `process` | 빌드 산출물 + scenario | test runner, curl, DB 조회, 로그 | **Edit 금지** | pass/fail + 실행 로그/스크린샷 |
| **Orion** | Scout | `process` | 탐색 범위 | Read, Grep, Glob, WebSearch, WebFetch | **Edit/Write/Bash 금지** | 조사 리포트 (markdown) |
| **Zion** | Specialist — UI | `process` | UI artifact | Playwright, browser, screenshot | **Edit 금지** | 시각 검증 리포트 + before/after |
| **Blitz** | Specialist — Perf | `process` | 벤치 대상 | perf harness, 측정 툴 | **Edit 금지** | 벤치 수치 + 회귀 baseline |
| **Jett** | Specialist — Infra | `process` | 배포 target | deploy 권한, observability | Build 외 Edit | 배포 판단 + health check |

---

## 미션 실행 흐름 (단일 규칙)

```
Coordinator 가 미션 brief 작성  (mission-brief.template.md 11필드 전부)
    ↓
Scout (필요 시) → 컨텍스트 pack 생성
    ↓
Builder (Kai) 가 brief + context pack 으로 구현
    ↓
┌─── 병렬 fan-out (Critic 간 서로 안 봄) ───┐
│                                         │
↓              ↓              ↓              ↓
Remy          Vera           Zion         Blitz
(static)      (dynamic)      (UI only)    (perf only)
│              │              │              │
└──────────────┴──── 독립 verdict ─────────────┘
    ↓
Coordinator 통합:
  · P1 any = block → Builder 재작업
  · 전부 pass = 승인
  · Critic 간 충돌 = Builder 반박 요청 (투표 금지)
  · Decisive verification 1건 직접 재실행
```

---

## Critic 독립성 규칙 (6개 · 필수 준수)

이걸 안 지키면 분리해도 rubber stamp.

1. **병렬 fan-out**: Builder 완료 → Coordinator 가 Critic 동시 spawn. 순차면 앞 Critic 결론이 뒤에 anchoring.
2. **서로 안 봄**: Critic 간 출력 공유 금지. 각자 Builder artifact + 원본 brief 만 받음.
3. **최종 승인은 Coordinator 만**: Critic 은 verdict 만 제출. `approve` 권한 없음.
4. **P1 any = block**: 한 명이라도 P1 내면 머지 금지. 다수결 금지.
5. **Tool whitelist 물리 분리**: Remy 는 실행 금지, Vera 는 Edit 금지. 서로 영역 침범 불가.
6. **Evidence 필수**: verdict 말로만 하면 무효. 로그/스크린샷/라인번호 첨부.

---

## Simple × Powerful 6원칙

1. **팀 ≠ 역할.** 팀은 이슈 버킷일 뿐.
2. **하나의 Builder.** 역할 분화는 skill bundle + tool whitelist 로.
3. **두 개의 독립 Critic.** Static(Remy) × Dynamic(Vera) · 물리적 분리.
4. **Specialist 는 tool 차이로만 정당화.** 이름만 다르면 theater.
5. **승인은 Coordinator 만.** Critic 은 verdict 만 제출.
6. **Evidence 없으면 verdict 무효.** 스크린샷 / 로그 / 라인번호 필수.

---

## 은퇴 에이전트 (기존 → 처리)

| 이름 | 원역할 | 처리 | 사유 |
|---|---|---|---|
| **Cyrus** | Engine Lead | → Hana 흡수 | 1인 sub-team lead = coordinator 중복 |
| **Felix** | Platform Lead | → Hana 흡수 | 동일 |
| **LunaLead** | Growth Lead | → Hana 흡수 | 동일 (Growth 는 코딩 체인 밖 별도 phase) |
| **Iris** | QA Lead | → Remy + Vera 로 대체 | Critic 레이어가 QA lead 역할 대체 |
| **Lux** | Renderer | → Kai + skill bundle | 같은 모델·repo — role theater |
| **Yuna** | UX Designer | → Kai + skill bundle (시각 검증은 Zion) | 시각 도구 없이는 theater |
| **Nova** | AI Engineer | → Kai + skill bundle | AI 관련 skill 로 주입 |
| **Aria** | Community Manager | → 코딩 체인 밖 seat | 비코딩 역할을 동일 execution tree 에 넣으면 theater |

**DB 정리**: 현재 seed 는 "추가만" 하는 idempotent 설계라 기존 DB 에 은퇴 에이전트가 남아있다. 정리는 별도 마이그레이션 스크립트 또는 수동 삭제.

---

## 팀 버킷 유지 이유

`ENG3-142` 같은 이슈 prefix 를 위해 ENG3/PLT3/GRW/QA 팀은 DB 에 유지. **lead 없음**. 이슈 분류 전용.

Sub-team 레벨의 coordinator 개입점이 사라지면서 handoff loss 가 줄어든다. Flotter 미션은 전부 Hana 가 owner.

---

## Real Specialization vs Role Theater

### Real (남긴다)
- **Playwright 필요** → Zion (브라우저 기반 interaction/visual 검증)
- **Perf harness 필요** → Blitz (측정 인프라가 별도)
- **배포 권한 필요** → Jett (운영 권한 차이)

### Theater (제거)
- **같은 모델 + 같은 repo + 같은 CLI** 에서 title 만 바꾼 경우
- **Renderer/AI Engineer/Platform Engineer** 처럼 capabilities 문자열만 다른 경우
- **UX Designer** 가 시각 도구 없이 프롬프트만 다른 경우
- **Community Manager** 같은 비코딩 역할

---

## Coordinator 미션 체크리스트 (매 미션 반복)

```
[ ] 미션 brief 11필드 채움                (mission-brief.template.md)
[ ] Owned scope 파일/경로 수준 명시
[ ] Critic fan-out 병렬 (Remy + Vera 기본)
[ ] Specialist 조건 확인 (UI → Zion, perf → Blitz, 배포 → Jett)
[ ] P1 any → block, 투표 금지
[ ] Decisive verification 1건 Coordinator 가 직접 재실행
[ ] Builder 자기보고 거절 · 증거로만 판단
```

---

## 성능 측정 지표

구조 변경의 win 을 측정할 북극성 지표:

- **accepted PR per 1M tokens** (주요 지표)
- first-pass green rate
- post-review defect count
- human intervention count
- lead time

최소 30 티켓 A/B 비교 권장.

---

## 참조

- `docs/cos-v2/CONTEXT.md` — 전체 컨텍스트
- `docs/cos-v2/mission-brief.template.md` — 미션 brief 11필드 템플릿
- `scripts/seed-cos-v2.ts` — 에이전트 seed 스크립트

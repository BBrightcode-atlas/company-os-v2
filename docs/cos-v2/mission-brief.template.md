---
title: Mission Brief Template
summary: Coordinator가 Builder/Critic/Scout/Specialist spawn 전에 채우는 11필드 계약서
---

# Mission Brief Template

에이전트 spawn 전에 **Coordinator**가 아래 11필드를 모두 채운다.
빠진 필드 = 미션 무효. Builder generalism 의 장점을 살리려면 brief 가 load-bearing 이다.

---

## 사용 규칙

1. Coordinator 가 작성 · 서명. Builder 는 brief 를 읽고 실행만 한다.
2. `Owned scope` 를 넘는 파일을 수정하면 자동 reject.
3. `Required evidence` 에 명시된 증거 없이 "완료" 주장은 무효.
4. `Budget` 초과 시 `Escalate if` 규칙대로 Coordinator 에게 복귀.
5. `Return schema` 를 벗어난 산출물은 재요청.

---

## 필드 정의

| # | 필드 | 설명 | 예시 |
|---|---|---|---|
| 1 | **Mission ID** | 이슈 식별자 + 하위 세그먼트 (scout/build/qa 등) | `ENG3-142` 또는 `ENG3-142-scout` |
| 2 | **Objective** | 미션의 목적. 1–2문장. Why를 포함 | `drag-to-select 에서 pointerup 후 선택 영역이 사라지는 버그 수정` |
| 3 | **Definition of done** | 승인 조건. 측정 가능한 bullet list | `pointerup 후 선택 유지` / `회귀 테스트 추가` / `pnpm build 통과` |
| 4 | **Non-goals** | 명시적으로 **안 할** 것들. Scope creep 차단 | `선택 영역 UI 디자인 변경 금지` / `PointerState 리팩터 금지` |
| 5 | **Owned scope** | 수정 허용 파일/경로. 나머지는 read-only | `engine/src/interaction/DragSelect.ts` / `engine/test/DragSelect.spec.ts` |
| 6 | **Inputs / context pack** | Scout 리포트, 재현 영상, 관련 이슈 링크 | `.coordination/ENG3-142/scout.md` |
| 7 | **Allowed tools** | 에이전트별 툴 whitelist. Critic 에겐 실행/편집 금지 명시 | `Read, Edit, Write, Bash(pnpm test), Grep` |
| 8 | **Required evidence** | 승인에 필요한 증거. 자기보고 금지 | `pnpm test 실행 로그` / `수정 전/후 스크린샷` / `diff` |
| 9 | **Verification commands** | Coordinator 가 decisive verification 에 직접 재실행할 명령 | `pnpm test engine/test/DragSelect.spec.ts` |
| 10 | **Budget / max turns** | 토큰·턴 상한. 초과 시 escalate | `30 turns` 또는 `200k tokens` |
| 11 | **Escalate if** | 복귀 트리거 조건 | `PointerState 수정이 불가피할 때` / `회귀 테스트 작성 불가할 때` |
| 12 | **Return schema** | 에이전트 산출물 JSON 형태 (free-form 금지) | `{ changedFiles: string[], testResults: string, rationale: string }` |

---

## 템플릿 (복사해서 사용)

```yaml
Mission ID:
Objective:
Definition of done:
  -
  -
Non-goals:
  -
Owned scope:
  -
Inputs / context pack:
  -
Allowed tools:
  -
Required evidence:
  -
Verification commands:
  -
Budget / max turns:
Escalate if:
  -
Return schema: |
  {
  }
```

---

## 에이전트 타입별 brief 변형 규칙

### Builder (Kai)
- `Allowed tools`: Read, Edit, Write, Bash(build/test), Grep
- `Required evidence`: 실행 로그 + diff + rationale
- `Owned scope` 은 **파일 경로까지** 명시 (디렉토리만 쓰면 거부)

### Critic — Static (Remy)
- `Allowed tools`: Read, Grep, lint, typecheck, security scan
- **금지**: Bash (실행 금지), Edit, Write
- `Required evidence`: line annotation (파일:라인) + P1/P2 구분
- `Return schema`: `{ findings: [{ severity: "P1"|"P2", file, line, message }], verdict: "block"|"ok" }`

### Critic — Dynamic (Vera)
- `Allowed tools`: test runner, curl, DB 조회, 로그 수집
- **금지**: Edit, Write (소스 수정 금지)
- `Required evidence`: 시나리오별 실행 로그 + pass/fail
- `Return schema`: `{ scenarios: [{ name, status, evidence }], verdict: "block"|"ok" }`

### Scout (Orion)
- `Allowed tools`: Read, Grep, Glob, WebSearch, WebFetch
- **금지**: Edit, Write, Bash
- `Return schema`: markdown 리포트 (파일 경로 + 라인 + 요약)

### Specialist — UI Verifier (Zion)
- `Allowed tools`: Playwright, browser, screenshot 비교
- **금지**: Edit, Write
- `Required evidence`: before/after 스크린샷 + visual diff 설명

### Specialist — Perf Checker (Blitz)
- `Allowed tools`: perf harness, bench runner
- **금지**: Edit, Write (harness 설정 수정 제외)
- `Required evidence`: 벤치 수치 + 회귀 baseline 비교

### Specialist — Infra Operator (Jett)
- `Allowed tools`: deploy 권한, observability (Grafana/logs)
- **금지**: Build 외 Edit
- `Required evidence`: 배포 후 health check 결과

---

## Fan-out 규칙

Coordinator 가 Critic 을 동시에 spawn 할 때:

- **Critic 간 서로 출력을 보지 못한다.** 각자 Builder artifact + 원본 brief 만 받는다.
- **Critic 은 서로를 승인하지 않는다.** 최종 승인은 Coordinator 만.
- **P1 any = block.** 한 명이라도 P1 내면 Builder 재작업. 다수결 금지.
- **Critic 간 충돌 시**: Coordinator 가 Builder 에게 **근거 첨부한 반박** 요청. 투표 금지.

---

## Coordinator 최종 체크리스트

```
[ ] 11필드 전부 채움
[ ] Owned scope 파일 경로 수준 명시
[ ] Required evidence 가 "자기보고" 가 아니라 "증거" 를 요구하는지
[ ] Critic 병렬 fan-out (Remy + Vera 기본, Zion/Blitz/Jett 조건부)
[ ] P1 any = block 적용 의지
[ ] Decisive verification 1건 직접 재실행 예정
```

---

## 실사용 예시

`docs/cos-v2/mission-brief.example.eng3-142.md` 참조 (canvas drag-to-select 버그 수정 walk-through).

## 참조

- `docs/cos-v2/agent-roles.md` — 에이전트 10명 구조 · 조직도
- `docs/cos-v2/CONTEXT.md` — 전체 컨텍스트

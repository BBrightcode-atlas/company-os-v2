---
title: System Stabilization Summary — 2026-04-16
summary: Stage 1/2/3 실전 검증 결과 + 발견된 이슈 + 수정 내역
---

# System Stabilization Summary

Builder-centric 조직 실전 안정화. 3 스테이지에 걸쳐 핵심 워크플로우 검증.

## 검증된 워크플로우

### Stage 1 — 이슈 → Coordinator → 미션 완료

**검증 미션**: ENG3-1 (marker file) / ENG3-2 (Vitest tests) / ENG3-3 (--list-only flag)

- ✅ 이슈 생성 → `queueIssueAssignmentWakeup` → Hana heartbeat 트리거
- ✅ Hana 가 mission brief 읽고 이해
- ✅ 파일 생성/수정/테스트 작성 품질 양호 (3/3 tests pass)
- ❌ **첫 시도: Subagent delegation 없음** — playbook 강화 후에도 Task call 0건
- ⚠️ Process lost 일부 run 에서 발생 (retry 로 복구)

### Stage 3 — 물리 tool 제약

**문제**: Stage 1 에서 prompt 만으로는 delegation 안 됨 (MASFT 재현).

**해결**:
- `scripts/enforce-coordinator-tool-whitelist.ts` 생성
- Coordinator adapterConfig.extraArgs 에 `--disallowed-tools Edit,Write,NotebookEdit` 주입
- Claude CLI 가 물리적으로 Edit/Write 차단

**검증 미션**: ENG3-4 (CONTEXT.md §7 Atlas 라인 추가)

- ✅ **Agent tool 1회 호출 → cos-builder** (첫 subagent delegation 성공!)
- ✅ Edit/Write 시도 0건 (물리 차단 유지)
- ✅ cos-builder 가 실제 파일 수정 수행
- ✅ 미션 done

### Stage 2 — 룸 기반 워크플로우

**검증 룸**: stage2-verify
**검증 미션**: @Hana 멘션 메시지 → progress.md 라인 추가

- ✅ 룸 생성 API + 참여자 추가 + coordinator 설정
- ✅ @멘션 메시지 → Coordinator 자동 반응 (heartbeat_runs 에는 기록 안 됨 — 별도 경로)
- ✅ Coordinator → Builder delegation (Stage 3 물리제약 유지)
- ✅ 작업 완료 후 룸에 결과 보고 (Hana 자체 작성)
- ✅ 파일 실수정 + verdict 보고

---

## 발견된 이슈 + 수정 내역

### 이슈 1: Subagent discovery 경로 버그 ✅ 수정됨

**문제**: Coordinator CLI 의 cwd 가 workspace 디렉토리(빈 폴더)라 repo 의
`.claude/agents/cos-*.md` 를 찾지 못함.

**수정**: `scripts/install-cos-subagents.sh` — `~/.claude/agents/` 에 symlink.
검증: Hana session init 이벤트에 7개 cos-* subagent 포함 확인.

### 이슈 2: Prompt-level delegation 강제 실패 ✅ 수정됨

**문제**: "cos-builder 에게 위임하라" HARD RULE 을 playbook 에 넣어도 Hana 가 직접 수정.
MASFT (arXiv 2503.13657) 의 "Disobey role specification" 정확히 재현.

**수정**: `scripts/enforce-coordinator-tool-whitelist.ts` — 물리 차단
(`--disallowed-tools Edit,Write,NotebookEdit` CLI flag).

**효과**: Hana 가 즉시 cos-builder delegation 채택 (ENG3-4 검증).

### 이슈 3: Process lost 간헐 발생 ⚠️ 완화됨

**현상**: 일부 run 이 `Process lost -- child pid X is no longer running` 으로 실패.
8 run 중 2 failed (process_lost). retry 는 작동함 — 최종 성공.

**추정 원인**:
- CLI restart 직후 race condition
- dev-runner watch 모드 reload 와 진행중인 run 충돌

**완화**: `reapOrphanedRuns` + 1회 자동 retry 로 심각한 영향 없음.
**후속 조사**: 프로덕션 uptime 에서 재현률 모니터링 필요.

### 이슈 4: 룸 경로 토큰 계측 누락 ⚠️ 관찰만

**현상**: Stage 2 에서 Hana 가 룸 메시지 반응으로 작업했지만 `heartbeat_runs` 에
신규 row 없음. `agent_token_usage` 훅이 heartbeat 경로에서만 작동.

**영향**: 룸 기반 활동의 토큰 소비가 집계 누락됨.
**후속 작업**: 룸 메시지 처리 경로에 agent_token_usage 훅 추가 필요 (Phase M2).

---

## 운영 상태 최종

### 활성 에이전트 11명 (ENG3-4 이후)

- **claude_local 4**: Atlas (CEO CoS 루트) + Sophia/Hana/Rex (Coordinator)
  - 전부 1 CLI running · extraArgs `--disallowed-tools Edit,Write,NotebookEdit` 주입
- **process 7**: Kai/Remy/Vera/Orion/Zion/Blitz/Jett (Pool + Specialist)
  - Claude Code subagent 정의로 `~/.claude/agents/cos-*.md` symlink 로 discoverable

### 활성 팀 8개

COM / FLT / ENG3 / PLT3 / GRW / QA / SB / RLS

### 축적된 증거 (Mac Studio prod)

- ENG3-1 ~ ENG3-4 (4건): 전부 status=done
- agent_token_usage rows: 4 (heartbeat 경로 집계)
- sub_agent_runs rows: 0 (Claude Code Agent tool 은 이 테이블에 기록 안 됨 — 별도 구조)

---

## 다음 안정화 단계 (후속)

1. **Phase M2 계측**: 룸 경로 + Claude Code subagent 경로 token 집계
2. **Process lost 재현율 모니터링**: 일주일 추적
3. **Coordinator sub_agent_runs 기록 검토**: Agent tool 호출 시 자동 row 생성 여부
4. **스트레스 테스트**: 복수 동시 미션 + 룸 메시지 부하
5. **Critic 병렬 fan-out 실전**: Builder 결과에 대해 cos-critic-static + cos-critic-dynamic 동시 spawn 검증 (지금까지 단독 Builder 만 관찰됨)

---

## 참조 커밋

- `02522602` — Stage 3 물리 tool 제약
- `43e1195d` — Stage 2 룸 워크플로우 검증
- `afea6346` — Stage 1 subagent discovery 수정 + playbook 강화
- `cea8eafa` — 초기 실전 검증 (ENG3-1)

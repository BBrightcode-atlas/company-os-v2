---
title: Agent Performance Metrics
summary: Builder-centric 조직 전환 후 성능 win 을 측정하는 지표 프레임
---

# Agent Performance Metrics

`agent-roles.md` 의 10명 구조가 기존 18명 구조보다 실제로 나은지 **측정 가능한 증거로 판정**하기 위한 지표 정의.

## 북극성 지표

### `accepted PR per 1M tokens`

> 승인된 PR 수 ÷ 전체 에이전트 토큰 사용량 (백만 단위)

단일 지표로 압축한 이유:
- **품질** (accepted — 머지된 것만 셈) 과 **비용** (token) 을 동시에 포함
- 빠름·느림은 상관없음 (lead time 은 별도 보조 지표)
- 에이전트 수가 늘어도(병렬) 지표가 개선될 수 있음 — 구조 변경의 순효과를 본다

**기대값**: 신 구조가 기존 대비 30%+ 개선되면 win 확정. 10–30% = marginal (다른 변수 조사). 10% 미만 = 구조 개편 실패.

---

## 보조 지표 (원인 추적용)

| 지표 | 의미 | 측정 소스 |
|---|---|---|
| **First-pass green rate** | Builder 산출물이 Critic 첫 라운드에서 통과한 비율 | Critic verdict 로그 |
| **P1 incidence** | 머지된 PR 중 post-merge 에서 P1 결함 발견률 | 이슈 트래킹 |
| **Rework count per mission** | Builder 재작업 횟수 | Coordinator 세션 |
| **Human intervention rate** | Coordinator 가 미션 체인에 개입한 횟수 (자동 승인 실패) | Coordinator 로그 |
| **Mission lead time** | 이슈 생성 → PR 머지까지 시간 (에이전트 시간 only) | Git + 이슈 메타 |
| **Token / role 분포** | Coordinator vs Builder vs Critic 의 토큰 점유 | adapter cost 로그 |
| **Critic disagreement rate** | Remy vs Vera verdict 가 갈리는 비율 | Critic 로그 |

### 해석 규칙

- **First-pass green rate 상승 + P1 incidence 상승** → Critic 이 rubber stamp 상태. 독립성 규칙 재점검.
- **Rework count 상승** → Coordinator brief 품질 문제. 템플릿 필드 누락 여부 감사.
- **Human intervention rate 상승** → Builder 또는 Critic 이 신뢰 구간 이탈. 툴/스킬 미스매치 의심.
- **Critic disagreement rate 하락** → Critic 이 같은 편향 공유. tool whitelist 차이가 충분한지 재점검.

---

## 측정 소스 (데이터 파이프라인)

### 1. 토큰 사용량
- adapter 레벨에서 기록 (claude_local / process). 요청/응답 토큰 수 + 모델 id.
- COS v2 의 `agents.spentMonthlyCents` 는 돈 단위 — 토큰 단위는 별도 필요.
- **TODO**: adapter_cost_logs 테이블 또는 activity log 에 `tokens_in / tokens_out / model` 필드 확보.

### 2. PR 승인/머지
- `gh pr list --state merged` + 브랜치 prefix (`ENG3-`, `COM-` 등) 로 이슈 연결.
- 또는 이슈 → PR 링크 직접 관리.

### 3. Critic verdict
- Coordinator 세션 로그에 Critic 산출물 기록.
- `.coordination/<mission-id>/critic-<name>.json` 형태로 파일 저장 권장 (Anthropic의 "filesystem 으로 telephone game 줄이기" 패턴).

### 4. Rework / Human intervention
- Coordinator 세션 로그에 이벤트 기록: `critic_blocked`, `builder_rerun`, `human_override`.

### 5. Lead time
- 이슈 `createdAt` → PR `mergedAt`.

---

## A/B 비교 프레임 (구조 전환 검증)

### 기간 분할
- **Period A (Before)**: 구 구조 (18명) 에서 생성된 N ≥ 30 미션
- **Period B (After)**: 신 구조 (10명) 에서 생성된 N ≥ 30 미션
- 동일 기간 길이, 동일 팀(FLT 만 비교 등) 로 confounder 축소

### 비교 표

```
              Period A   Period B   Δ        판정
acc PR / 1M   [x]        [x]        [+/-%]   win if +30%+
first-pass    [x]%       [x]%       ...
P1 incidence  [x]%       [x]%       ...
rework/mis    [x]        [x]        ...
human interv  [x]%       [x]%       ...
lead time     [x]h       [x]h       ...
```

### 주의사항
- **학습곡선 효과**: Period B 초기 미션은 coordinator 들이 새 brief 템플릿에 익숙하지 않아 나쁠 수 있음. 첫 5 미션 제외 권장.
- **난이도 편차**: 이슈별 난이도가 다르면 평균이 왜곡됨. 동일 난이도 태그 미션만 비교.
- **외부 변수**: 모델 업데이트 (Opus 4.6 → 4.7 등) 시점이 겹치면 분리 불가. 측정 기간 내 모델 고정.

---

## 계측 구현 로드맵 (후속 phase)

이 문서는 **설계** 이며 계측은 별도 phase.

### Phase M1 — 토큰 수집
- adapter 레벨에서 `tokens_in / tokens_out / model` 를 `agent_activities` 또는 전용 `agent_token_usage` 테이블에 기록
- 쿼리: `SELECT SUM(tokens_in + tokens_out) FROM ... WHERE agent_id IN (...)`

### Phase M2 — Coordinator 세션 로그
- Coordinator 가 미션마다 `.coordination/<id>/session.json` 작성
- 필드: `missionId`, `builder`, `critics[]`, `rework_count`, `verdicts`, `human_overrides`, `final_status`

### Phase M3 — 대시보드
- 주간 지표 롤업 뷰
- 구 구조 vs 신 구조 비교 탭

### Phase M4 — 자동 알람
- First-pass green rate 변동, P1 incidence 스파이크, Critic disagreement 하락 등 이상 신호 감지

---

## 당장 할 수 있는 최소 측정 (계측 없이)

1. **현 DB 에서 이슈 → PR 매핑 수동 수집** (25–30 미션)
2. **`gh pr list --state merged --search "merged:<date>..<date>"` 로 승인 수 추출**
3. **Claude API 청구 내역에서 기간별 토큰 총량 추출** (model 별로 분리)
4. **Period A = 2026-03-01 ~ 전환일 / Period B = 전환일 이후 30일**

이것만으로도 **accepted PR per 1M tokens** 1차 비교는 가능.

---

## 판정 기준 (go / no-go)

### 신 구조 유지
- 북극성 지표 +30% 이상, 다른 보조 지표 동반 악화 없음
- First-pass green rate 유지 또는 상승
- P1 incidence 유지 또는 하락

### 재검토 (구조 조정)
- 북극성 +10% 미만
- 또는 P1 incidence 상승
- 또는 Critic disagreement rate 30% 미만 (편향 공유 신호)

### 롤백
- 북극성 -10% 이상
- 또는 human intervention rate 2배 상승

---

## 참조

- `docs/cos-v2/agent-roles.md` — 조직 스펙
- `docs/cos-v2/mission-brief.template.md` — 미션 계약
- `scripts/migrate-agent-org.ts` — 전환 마이그레이션
- Anthropic multi-agent research — token cost 4x 관찰 (참조값)
- MASFT (arXiv 2503.13657) — verification failure 지표 정의 참조

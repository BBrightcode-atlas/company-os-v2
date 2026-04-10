# Sub-Agent Execution Tracking System

> 리더 에이전트가 서브에이전트를 spawn할 때 API로 시작/완료를 보고하고, 사람이 UI에서 결과를 평가(thumbs up/down)한다.

## 목적
서브에이전트가 얼마나 자주 쓰이고, 결과가 얼마나 좋은지 측정한다.

## 데이터 모델

```sql
CREATE TABLE sub_agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  leader_agent_id UUID NOT NULL REFERENCES agents(id),
  sub_agent_id UUID NOT NULL REFERENCES agents(id),
  issue_id UUID REFERENCES issues(id),
  status TEXT NOT NULL DEFAULT 'started', -- started | completed | failed
  task TEXT NOT NULL,
  result TEXT,
  rating TEXT, -- thumbs_up | thumbs_down | null
  rated_by_user_id TEXT,
  rated_at TIMESTAMPTZ,
  duration_ms INTEGER,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sub_agent_runs_company_idx ON sub_agent_runs(company_id);
CREATE INDEX sub_agent_runs_sub_agent_idx ON sub_agent_runs(company_id, sub_agent_id);
CREATE INDEX sub_agent_runs_leader_idx ON sub_agent_runs(company_id, leader_agent_id);
```

## API

| Method | Endpoint | Auth | 설명 |
|--------|----------|------|------|
| POST | `/companies/:companyId/sub-agent-runs` | agent | 시작 보고 |
| PATCH | `/sub-agent-runs/:id/complete` | agent | 완료 보고 |
| PATCH | `/sub-agent-runs/:id/rate` | board | 평가 |
| GET | `/companies/:companyId/sub-agent-runs` | all | 전체 목록 |
| GET | `/agents/:agentId/sub-agent-runs` | all | 에이전트별 이력 |

## UI

1. **서브에이전트 상세 → "실행 이력" 탭**: 호출된 이력 + 👍/👎 평가
2. **리더 에이전트 상세 → "위임 이력" 탭**: 위임 이력 + 서브에이전트별 성공률

## Instructions 훅

리더 에이전트 instructions에 추가:
```
서브에이전트 spawn 전: POST /api/companies/{companyId}/sub-agent-runs
서브에이전트 완료 후: PATCH /api/sub-agent-runs/{id}/complete
```

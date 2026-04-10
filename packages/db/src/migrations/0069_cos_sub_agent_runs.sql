CREATE TABLE IF NOT EXISTS sub_agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  leader_agent_id UUID NOT NULL REFERENCES agents(id),
  sub_agent_id UUID NOT NULL REFERENCES agents(id),
  issue_id UUID REFERENCES issues(id),
  status TEXT NOT NULL DEFAULT 'started',
  task TEXT NOT NULL,
  result TEXT,
  rating TEXT,
  rated_by_user_id TEXT,
  rated_at TIMESTAMPTZ,
  duration_ms INTEGER,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sub_agent_runs_company_idx ON sub_agent_runs(company_id);
CREATE INDEX IF NOT EXISTS sub_agent_runs_sub_agent_idx ON sub_agent_runs(company_id, sub_agent_id);
CREATE INDEX IF NOT EXISTS sub_agent_runs_leader_idx ON sub_agent_runs(company_id, leader_agent_id);

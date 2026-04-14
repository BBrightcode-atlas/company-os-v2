-- 0073: Auto-assignment log table for LLM-based task assignment
-- Tracks automated issue-to-agent assignments with LLM reasoning.

CREATE TABLE "auto_assignment_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" uuid NOT NULL REFERENCES "companies"("id"),
  "issue_id" uuid NOT NULL REFERENCES "issues"("id"),
  "assigned_agent_id" uuid NOT NULL REFERENCES "agents"("id"),
  "llm_reasoning" text,
  "llm_score" real,
  "candidate_agents" jsonb,
  "assignment_source" text NOT NULL DEFAULT 'auto_llm',
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "auto_assignment_log_company_created_idx" ON "auto_assignment_log" ("company_id", "created_at");
CREATE INDEX "auto_assignment_log_issue_idx" ON "auto_assignment_log" ("issue_id");

-- 0074: agent_token_usage — per-invocation token usage for agent performance metrics.
--
-- Phase M1 (docs/cos-v2/agent-performance-metrics.md 계측 로드맵).
-- 북극성 지표 "accepted PR per 1M tokens" 측정용 원천 데이터.
--
-- run_type 으로 polymorphic reference:
--   'heartbeat' → heartbeat_runs.id
--   'subagent'  → sub_agent_runs.id
--   'direct'    → adapter 직접 호출 (run_id NULL 가능)
--
-- subagent_type 은 .claude/agents/cos-*.md 의 name 필드 (cos-builder, cos-critic-static 등).
-- Coordinator 가 spawn 시 기록. subagent 가 아닌 Coordinator 본인 호출이면 NULL.

CREATE TABLE "agent_token_usage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" uuid NOT NULL REFERENCES "companies"("id"),
  "agent_id" uuid NOT NULL REFERENCES "agents"("id"),
  "run_type" text NOT NULL,
  "run_id" uuid,
  "issue_id" uuid REFERENCES "issues"("id"),
  "subagent_type" text,
  "model" text NOT NULL,
  "tokens_in" integer NOT NULL DEFAULT 0,
  "tokens_out" integer NOT NULL DEFAULT 0,
  "tokens_cache_read" integer NOT NULL DEFAULT 0,
  "tokens_cache_write" integer NOT NULL DEFAULT 0,
  "cost_cents" integer,
  "adapter_type" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "agent_token_usage_run_type_chk"
    CHECK ("run_type" IN ('heartbeat', 'subagent', 'direct'))
);

CREATE INDEX "agent_token_usage_company_created_idx"
  ON "agent_token_usage" ("company_id", "created_at");
CREATE INDEX "agent_token_usage_agent_created_idx"
  ON "agent_token_usage" ("agent_id", "created_at");
CREATE INDEX "agent_token_usage_issue_idx"
  ON "agent_token_usage" ("issue_id");
CREATE INDEX "agent_token_usage_run_idx"
  ON "agent_token_usage" ("run_type", "run_id");
CREATE INDEX "agent_token_usage_subagent_type_idx"
  ON "agent_token_usage" ("company_id", "subagent_type", "created_at");

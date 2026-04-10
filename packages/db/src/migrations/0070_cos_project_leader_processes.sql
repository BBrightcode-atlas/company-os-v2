-- 0070: Leader processes + agent sessions → project-scoped
-- An agent can now have one CLI process per project it belongs to.
-- project_id is nullable for backward compat (non-coding agents).

-- 1. Add project_id to leader_processes
ALTER TABLE "leader_processes"
  ADD COLUMN "project_id" uuid REFERENCES "projects"("id") ON DELETE CASCADE;

-- Drop the old per-agent unique constraint (constraint, not bare index)
ALTER TABLE "leader_processes" DROP CONSTRAINT IF EXISTS "leader_processes_agent_unique";

-- New composite unique: one process per (agent, project).
-- NULL project_id is treated as a single slot via COALESCE.
CREATE UNIQUE INDEX "leader_processes_agent_project_unique"
  ON "leader_processes" ("agent_id", COALESCE("project_id", '00000000-0000-0000-0000-000000000000'));

-- Index for project-based lookups
CREATE INDEX "leader_processes_project_idx"
  ON "leader_processes" ("project_id") WHERE "project_id" IS NOT NULL;

-- 2. Add project_id to agent_sessions
ALTER TABLE "agent_sessions"
  ADD COLUMN "project_id" uuid REFERENCES "projects"("id") ON DELETE CASCADE;

-- Drop the old partial unique index
DROP INDEX IF EXISTS "agent_sessions_one_active_per_agent";

-- New composite partial unique: one active session per (agent, project).
CREATE UNIQUE INDEX "agent_sessions_one_active_per_agent_project"
  ON "agent_sessions" ("agent_id", COALESCE("project_id", '00000000-0000-0000-0000-000000000000'))
  WHERE "status" = 'active';

-- Index for project-based lookups
CREATE INDEX "agent_sessions_project_idx"
  ON "agent_sessions" ("project_id") WHERE "project_id" IS NOT NULL;

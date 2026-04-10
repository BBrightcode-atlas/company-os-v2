import { pgTable, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { companies } from "./companies.js";
import { agents } from "./agents.js";
import { projects } from "./projects.js";

/**
 * Phase 4: a durable Claude CLI session for a leader agent.
 *
 * One active session per agent (partial unique index). The workspace_path
 * is stable per session, which lets Claude's ~/.claude/projects/<hash(cwd)>/
 * auto-restore conversation state across CLI restarts. Archived sessions
 * remain as history (not deleted) so users can reference prior conversations.
 *
 * @see docs/cos-v2/phase4-cli-design.md §9.2
 */
export const agentSessions = pgTable(
  "agent_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    /** Project this session is scoped to. NULL = non-coding / legacy. */
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
    /** Absolute path to the project workspace cwd (or ~/.cos-v2/leaders/<slug>/ for legacy) */
    workspacePath: text("workspace_path").notNull(),
    /** Value set as CLAUDE_PROJECT_DIR env so claude can locate its own history */
    claudeProjectDir: text("claude_project_dir"),
    status: text("status").notNull(), // 'active' | 'archived'
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    archiveReason: text("archive_reason"),
  },
  (table) => ({
    companyIdx: index("agent_sessions_company_idx").on(table.companyId),
    agentStatusIdx: index("agent_sessions_agent_status_idx").on(
      table.agentId,
      table.status,
    ),
    projectIdx: index("agent_sessions_project_idx").on(table.projectId),
    // UNIQUE INDEX "agent_sessions_one_active_per_agent_project"
    //   ON (agent_id, COALESCE(project_id, '00000000-...')) WHERE status='active'
    // Managed by raw migration 0070. Do NOT drop via drizzle-kit push.
  }),
);

export type AgentSessionRow = typeof agentSessions.$inferSelect;
export type AgentSessionInsert = typeof agentSessions.$inferInsert;

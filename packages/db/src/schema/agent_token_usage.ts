import { pgTable, uuid, text, integer, timestamp, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { companies } from "./companies.js";
import { agents } from "./agents.js";
import { issues } from "./issues.js";

/**
 * agent_token_usage — per-invocation 토큰 사용량.
 *
 * Phase M1 (docs/cos-v2/agent-performance-metrics.md).
 * 북극성 "accepted PR per 1M tokens" 측정 원천.
 *
 * run_type polymorphic:
 *   - 'heartbeat' → heartbeat_runs.id
 *   - 'subagent'  → sub_agent_runs.id
 *   - 'direct'    → adapter 직접 호출 (run_id NULL 가능)
 *
 * subagent_type: .claude/agents/cos-*.md 의 name 필드 (cos-builder 등).
 * Coordinator 본인 호출이면 NULL.
 */
export const agentTokenUsage = pgTable(
  "agent_token_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    agentId: uuid("agent_id").notNull().references(() => agents.id),
    runType: text("run_type").notNull(), // 'heartbeat' | 'subagent' | 'direct'
    runId: uuid("run_id"),
    issueId: uuid("issue_id").references(() => issues.id),
    subagentType: text("subagent_type"), // 'cos-builder', 'cos-critic-static', etc
    model: text("model").notNull(),
    tokensIn: integer("tokens_in").notNull().default(0),
    tokensOut: integer("tokens_out").notNull().default(0),
    tokensCacheRead: integer("tokens_cache_read").notNull().default(0),
    tokensCacheWrite: integer("tokens_cache_write").notNull().default(0),
    costCents: integer("cost_cents"), // optional estimate
    adapterType: text("adapter_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    companyCreatedIdx: index("agent_token_usage_company_created_idx").on(t.companyId, t.createdAt),
    agentCreatedIdx: index("agent_token_usage_agent_created_idx").on(t.agentId, t.createdAt),
    issueIdx: index("agent_token_usage_issue_idx").on(t.issueId),
    runIdx: index("agent_token_usage_run_idx").on(t.runType, t.runId),
    subagentTypeIdx: index("agent_token_usage_subagent_type_idx").on(
      t.companyId,
      t.subagentType,
      t.createdAt,
    ),
    runTypeChk: check(
      "agent_token_usage_run_type_chk",
      sql`${t.runType} IN ('heartbeat', 'subagent', 'direct')`,
    ),
  }),
);

export type AgentTokenUsageRow = typeof agentTokenUsage.$inferSelect;
export type AgentTokenUsageInsert = typeof agentTokenUsage.$inferInsert;

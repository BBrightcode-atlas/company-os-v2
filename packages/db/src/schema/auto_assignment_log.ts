import { pgTable, uuid, text, timestamp, jsonb, real, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { issues } from "./issues.js";
import { agents } from "./agents.js";

export const autoAssignmentLog = pgTable(
  "auto_assignment_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    issueId: uuid("issue_id").notNull().references(() => issues.id),
    assignedAgentId: uuid("assigned_agent_id").notNull().references(() => agents.id),
    llmReasoning: text("llm_reasoning"),
    llmScore: real("llm_score"),
    candidateAgents: jsonb("candidate_agents").$type<Array<{ agentId: string; name: string; score: number; reasoning: string }>>(),
    assignmentSource: text("assignment_source").notNull().default("auto_llm"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyCreatedIdx: index("auto_assignment_log_company_created_idx").on(table.companyId, table.createdAt),
    issueIdx: index("auto_assignment_log_issue_idx").on(table.issueId),
  }),
);

import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";
import { issues } from "./issues.js";

export const subAgentRuns = pgTable(
  "sub_agent_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    leaderAgentId: uuid("leader_agent_id")
      .notNull()
      .references(() => agents.id),
    subAgentId: uuid("sub_agent_id")
      .notNull()
      .references(() => agents.id),
    issueId: uuid("issue_id").references(() => issues.id),
    status: text("status").notNull().default("started"),
    task: text("task").notNull(),
    result: text("result"),
    rating: text("rating"),
    ratedByUserId: text("rated_by_user_id"),
    ratedAt: timestamp("rated_at", { withTimezone: true }),
    durationMs: integer("duration_ms"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("sub_agent_runs_company_idx").on(t.companyId),
    index("sub_agent_runs_sub_agent_idx").on(t.companyId, t.subAgentId),
    index("sub_agent_runs_leader_idx").on(t.companyId, t.leaderAgentId),
  ],
);

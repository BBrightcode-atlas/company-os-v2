import { pgTable, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { agents } from "./agents.js";
import { companies } from "./companies.js";

export const projectMembers = pgTable(
  "project_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    agentId: uuid("agent_id").references(() => agents.id),
    userId: text("user_id"),
    role: text("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectIdx: index("project_members_project_idx").on(table.projectId),
    companyIdx: index("project_members_company_idx").on(table.companyId),
    projectAgentUniq: uniqueIndex("project_members_project_agent_uniq").on(table.projectId, table.agentId),
    agentIdx: index("project_members_agent_idx").on(table.agentId),
  }),
);

import { pgTable, uuid, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { teams } from "./teams.js";
import { companies } from "./companies.js";

export const projectTeams = pgTable(
  "project_teams",
  {
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.projectId, table.teamId] }),
    teamIdx: index("project_teams_team_idx").on(table.teamId),
    companyIdx: index("project_teams_company_idx").on(table.companyId),
  }),
);

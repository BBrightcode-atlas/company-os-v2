import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const instanceAuditLog = pgTable(
  "instance_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id"),
    actorType: text("actor_type").notNull().default("system"),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyCreatedIdx: index("instance_audit_log_company_created_idx").on(table.companyId, table.createdAt),
    actionCreatedIdx: index("instance_audit_log_action_created_idx").on(table.action, table.createdAt),
    entityIdx: index("instance_audit_log_entity_type_id_idx").on(table.entityType, table.entityId),
  }),
);

import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { projects } from "./projects.js";
import { documents } from "./documents.js";
import { assets } from "./assets.js";

export const projectDocumentSlots = pgTable(
  "project_document_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    slotKey: text("slot_key").notNull(),
    slotGroup: text("slot_group").notNull(),
    title: text("title").notNull(),
    required: boolean("required").notNull().default(false),
    status: text("status").notNull().default("empty"),
    documentId: uuid("document_id").references(() => documents.id, { onDelete: "set null" }),
    artifactId: uuid("artifact_id").references(() => assets.id, { onDelete: "set null" }),
    contentType: text("content_type"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyProjectKeyUq: uniqueIndex("project_document_slots_company_project_key_uq")
      .on(table.companyId, table.projectId, table.slotKey),
    companyProjectIdx: index("project_document_slots_company_project_idx").on(table.companyId, table.projectId),
    projectGroupIdx: index("project_document_slots_project_group_idx").on(table.projectId, table.slotGroup),
    documentIdx: index("project_document_slots_document_idx").on(table.documentId),
    artifactIdx: index("project_document_slots_artifact_idx").on(table.artifactId),
  }),
);

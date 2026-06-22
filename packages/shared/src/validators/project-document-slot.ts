import { z } from "zod";
import {
  PROJECT_DOCUMENT_SLOT_GROUPS,
  PROJECT_DOCUMENT_SLOT_STATUSES,
} from "../project-document-slots.js";

export const projectDocumentSlotGroupSchema = z.enum(PROJECT_DOCUMENT_SLOT_GROUPS);
export const projectDocumentSlotStatusSchema = z.enum(PROJECT_DOCUMENT_SLOT_STATUSES);
export const projectDocumentSlotDocumentFormatSchema = z.enum(["markdown", "text", "html"]);

const slotMetadataSchema = z.record(z.string(), z.unknown());
const contentTypeSchema = z.string().trim().min(1).max(120);

export const upsertProjectDocumentSlotSchema = z.object({
  title: z.string().trim().min(1).max(240).optional(),
  required: z.boolean().optional(),
  status: projectDocumentSlotStatusSchema.optional(),
  documentId: z.string().uuid().nullable().optional(),
  artifactId: z.string().uuid().nullable().optional(),
  contentType: contentTypeSchema.nullable().optional(),
  metadata: slotMetadataSchema.nullable().optional(),
}).strict();

export type UpsertProjectDocumentSlot = z.infer<typeof upsertProjectDocumentSlotSchema>;

export const importProjectDocumentSlotSchema = z.object({
  documentId: z.string().uuid().optional(),
  artifactId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(240).optional(),
  format: projectDocumentSlotDocumentFormatSchema.optional().default("markdown"),
  body: z.string().min(1).optional(),
  contentType: contentTypeSchema.optional(),
  status: projectDocumentSlotStatusSchema.optional().default("ready"),
  metadata: slotMetadataSchema.nullable().optional(),
  changeSummary: z.string().trim().min(1).max(500).nullable().optional(),
}).strict().superRefine((value, ctx) => {
  const inputs = [value.documentId, value.artifactId, value.body].filter((entry) =>
    typeof entry === "string" && entry.length > 0
  );
  if (inputs.length !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide exactly one of documentId, artifactId, or body.",
      path: ["documentId"],
    });
  }
});

export type ImportProjectDocumentSlot = z.infer<typeof importProjectDocumentSlotSchema>;

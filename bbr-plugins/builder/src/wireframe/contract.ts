import type { ScreenSpecDoc } from "./screen-spec.js";
import { SCREEN_DEFINITIONS_SLOT_KEY, PRD_SLOT_KEY } from "../blueprint/contract.js";

export type { ScreenSpecDoc, ScreenSpecModel, SectionSchema, ColumnDef } from "./screen-spec.js";

export const DB_NAMESPACE = "plugin_wireframes_a96aea0e66";
export const T_WIREFRAMES = `${DB_NAMESPACE}.wireframes`;
export const T_COMMENTS = `${DB_NAMESPACE}.wireframe_comments`;

export const PLUGIN_ID = "paperclip-plugin-builder";
export const WIREFRAME_DELIVERABLE_SLOT_KEY = "deliverable.wireframe_html";
export const WIREFRAME_OUTPUT_FILE = "wireframe.html";

export const DATA = {
  getCurrent: "wireframe.getCurrent",
  getWireframe: "wireframe.getWireframe",
  listComments: "wireframe.listComments",
  projects: "wireframe.projects",
  upstreamSlots: "wireframe.upstreamSlots",
} as const;

export { SCREEN_DEFINITIONS_SLOT_KEY, PRD_SLOT_KEY };

export const ACTION = {
  createWireframe: "createWireframe",
  triggerGenerate: "triggerGenerate",
  addComment: "addComment",
  updateInputs: "updateInputs",
  deleteWireframe: "deleteWireframe",
  syncDeliverableSlot: "syncDeliverableSlot",
} as const;

export const generationChannel = (id: string) => `generation:${id}`;
export const commentsChannel = (id: string) => `comments:${id}`;

export type WireframeStatus = "draft" | "generating" | "generated" | "error";
export type WireframeDeliverableSlotStatus = "empty" | "draft" | "ready" | "approved" | "n/a";

export interface WireframeDeliverableSlotUpdate {
  slotKey: typeof WIREFRAME_DELIVERABLE_SLOT_KEY;
  slotGroup: "deliverable";
  title: string;
  required: true;
  status: WireframeDeliverableSlotStatus;
  contentType: "text/html";
  documentRefs: string[];
  artifactRef: string | null;
  wireframeId: string;
  updatedAt: string;
  metadata: {
    plugin: typeof PLUGIN_ID;
    outputFile: typeof WIREFRAME_OUTPUT_FILE;
    wireframeStatus: WireframeStatus;
    htmlLength: number;
  };
}

export interface ReferenceDoc {
  filename: string;
  text: string;
}

export interface WireframeInput {
  title: string;
  projectId?: string | null;
}

export interface WireframeProjectSummary {
  id: string;
  name: string;
  status: string | null;
}

export interface WireframeUpstreamSlot {
  slotKey: string;
  title: string;
  status: WireframeDeliverableSlotStatus;
  updatedAt: string | null;
  screenCount: number | null;
  bodyPreview: string;
  hasBody: boolean;
  included: boolean;
}

export interface WireframeUpstreamSlots {
  projectId: string | null;
  screenDefinitions: WireframeUpstreamSlot | null;
  prd: WireframeUpstreamSlot | null;
  ready: boolean;
}

export interface WireframeRecordBase {
  id: string;
  companyId: string;
  projectId: string | null;
  title: string;
  specDoc: string;
  screenDoc: string;
  screenModel: ScreenSpecDoc;
  referenceDocs: ReferenceDoc[];
  html: string | null;
  status: WireframeStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WireframeRecord extends WireframeRecordBase {
  deliverableSlot: WireframeDeliverableSlotUpdate;
}

export type CommentAuthor = "user" | "assistant" | "system";
export type CommentKind = "comment" | "revision";
export interface WireframeComment {
  id: string;
  wireframeId: string;
  authorType: CommentAuthor;
  authorUserId: string | null;
  body: string;
  kind: CommentKind;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export function buildWireframeDeliverableSlot(record: Pick<WireframeRecordBase, "id" | "status" | "html" | "updatedAt">): WireframeDeliverableSlotUpdate {
  const hasHtml = Boolean(record.html?.trim());
  const status: WireframeDeliverableSlotStatus =
    record.status === "generated" && hasHtml ? "ready" : hasHtml ? "draft" : "empty";

  return {
    slotKey: WIREFRAME_DELIVERABLE_SLOT_KEY,
    slotGroup: "deliverable",
    title: "HTML 와이어프레임(HTML Wireframe)",
    required: true,
    status,
    contentType: "text/html",
    documentRefs: hasHtml ? [WIREFRAME_OUTPUT_FILE] : [],
    artifactRef: hasHtml ? `wireframe:${record.id}:${WIREFRAME_OUTPUT_FILE}` : null,
    wireframeId: record.id,
    updatedAt: record.updatedAt,
    metadata: {
      plugin: PLUGIN_ID,
      outputFile: WIREFRAME_OUTPUT_FILE,
      wireframeStatus: record.status,
      htmlLength: record.html?.length ?? 0,
    },
  };
}

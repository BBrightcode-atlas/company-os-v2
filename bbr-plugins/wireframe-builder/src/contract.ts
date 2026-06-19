import type { ScreenSpecDoc } from "./screen-spec.js";

export type { ScreenSpecDoc, ScreenSpecModel, SectionSchema, ColumnDef } from "./screen-spec.js";

export const DB_NAMESPACE = "plugin_wireframes_dfd3295c23";
export const T_WIREFRAMES = `${DB_NAMESPACE}.wireframes`;
export const T_COMMENTS = `${DB_NAMESPACE}.wireframe_comments`;

export const PLUGIN_ID = "paperclip-plugin-wireframe-builder";

export const DATA = {
  getCurrent: "getCurrent",
  getWireframe: "getWireframe",
  listComments: "listComments",
} as const;

export const ACTION = {
  createWireframe: "createWireframe",
  triggerGenerate: "triggerGenerate",
  addComment: "addComment",
  updateInputs: "updateInputs",
  deleteWireframe: "deleteWireframe",
  extractScreenModel: "extractScreenModel",
} as const;

export const generationChannel = (id: string) => `generation:${id}`;
export const commentsChannel = (id: string) => `comments:${id}`;

export type WireframeStatus = "draft" | "generating" | "generated" | "error";

export interface ReferenceDoc {
  filename: string;
  text: string;
}

export interface WireframeInput {
  title: string;
  specDoc: string;
  screenDoc?: string;
  screenModel?: ScreenSpecDoc;
  referenceDocs?: ReferenceDoc[];
}

export interface WireframeRecord {
  id: string;
  companyId: string;
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
export type WireframeCommentEvent = WireframeComment & { _deleted?: boolean };

export interface GenerationProgressEvent {
  phase: string;
  message: string;
  at: string;
}

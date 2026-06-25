import type { SourceFormat, SourceMaterial } from "../contract.js";

export const SOURCE_INTAKE_WORKFLOW_IDS = [
  "direct_text",
  "file_upload",
  "url",
  "figma",
  "notion_shared_page",
] as const;

export type SourceIntakeWorkflowId = typeof SOURCE_INTAKE_WORKFLOW_IDS[number];

export type SourceIntakeInputKind = "text" | "file" | "url";

export type SourceIntakeWorkflowDefinition = {
  id: SourceIntakeWorkflowId;
  label: string;
  inputKind: SourceIntakeInputKind;
  format: SourceFormat;
  description: string;
};

export type SourceIntakeFetchStatus = NonNullable<SourceMaterial["fetchStatus"]>;

export type SourceIntakeResult = {
  workflowId: SourceIntakeWorkflowId;
  format: SourceFormat;
  title?: string;
  body: string;
  fetchStatus?: SourceIntakeFetchStatus;
  fetchedAt?: string;
  fetchError?: string;
  metadata?: Record<string, unknown>;
};

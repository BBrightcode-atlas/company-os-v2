import type {
  ProjectDocumentSlotGroup,
  ProjectDocumentSlotStatus,
} from "../project-document-slots.js";

export interface ProjectDocumentSlot {
  id: string;
  companyId: string;
  projectId: string;
  slotKey: string;
  slotGroup: ProjectDocumentSlotGroup;
  title: string;
  required: boolean;
  status: ProjectDocumentSlotStatus;
  documentId: string | null;
  artifactId: string | null;
  contentType: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectDocumentSlotDocumentContent {
  id: string;
  title: string | null;
  format: string;
  body: string;
  latestRevisionId: string | null;
  latestRevisionNumber: number;
  updatedAt: Date;
}

export interface ProjectDocumentSlotArtifactContent {
  artifactId: string;
  contentType: string;
  originalFilename: string | null;
  byteSize: number;
  contentPath: string;
}

export interface ProjectDocumentSlotContentResponse {
  slot: ProjectDocumentSlot;
  document: ProjectDocumentSlotDocumentContent | null;
  artifact: ProjectDocumentSlotArtifactContent | null;
}

import { and, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  assets,
  documentRevisions,
  documents,
  projectDocumentSlots,
  projects,
} from "@paperclipai/db";
import {
  DEFAULT_PROJECT_DOCUMENT_SLOT_DEFINITIONS,
  getDefaultProjectDocumentSlotDefinition,
  projectDocumentSlotSortIndex,
  type ImportProjectDocumentSlot,
  type ProjectDocumentSlot,
  type ProjectDocumentSlotContentResponse,
  type ProjectDocumentSlotDefinition,
  type ProjectDocumentSlotDocumentContent,
  type ProjectDocumentSlotGroup,
  type ProjectDocumentSlotStatus,
  type UpsertProjectDocumentSlot,
} from "@paperclipai/shared";
import { notFound, unprocessable } from "../errors.js";

type ProjectRow = { id: string; companyId: string };
type ProjectDocumentSlotRow = typeof projectDocumentSlots.$inferSelect;
type DocumentFormat = ImportProjectDocumentSlot["format"];

type DocumentActor = {
  actorType: "agent" | "user" | "system" | "plugin";
  actorId: string;
  agentId?: string | null;
  runId?: string | null;
};

function defaultSlotMetadata(definition: ProjectDocumentSlotDefinition): Record<string, unknown> | null {
  const metadata: Record<string, unknown> = {};
  if (definition.templatePath) metadata.templatePath = definition.templatePath;
  if (definition.collection) metadata.collection = true;
  if (definition.producer) metadata.producer = definition.producer;
  return Object.keys(metadata).length > 0 ? metadata : null;
}

function toSlot(row: ProjectDocumentSlotRow): ProjectDocumentSlot {
  return {
    id: row.id,
    companyId: row.companyId,
    projectId: row.projectId,
    slotKey: row.slotKey,
    slotGroup: row.slotGroup as ProjectDocumentSlotGroup,
    title: row.title,
    required: row.required,
    status: row.status as ProjectDocumentSlotStatus,
    documentId: row.documentId ?? null,
    artifactId: row.artifactId ?? null,
    contentType: row.contentType ?? null,
    metadata: row.metadata ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function sortSlots(left: ProjectDocumentSlot, right: ProjectDocumentSlot) {
  const leftIndex = projectDocumentSlotSortIndex(left.slotKey);
  const rightIndex = projectDocumentSlotSortIndex(right.slotKey);
  if (leftIndex !== rightIndex) return leftIndex - rightIndex;
  return left.slotKey.localeCompare(right.slotKey);
}

function contentTypeForFormat(format: DocumentFormat): string {
  if (format === "html") return "text/html";
  if (format === "text") return "text/plain";
  return "text/markdown";
}

function documentContent(row: typeof documents.$inferSelect): ProjectDocumentSlotDocumentContent {
  return {
    id: row.id,
    title: row.title ?? null,
    format: row.format,
    body: row.latestBody,
    latestRevisionId: row.latestRevisionId ?? null,
    latestRevisionNumber: row.latestRevisionNumber,
    updatedAt: row.updatedAt,
  };
}

export function projectDocumentSlotService(db: Db) {
  async function getProject(projectId: string): Promise<ProjectRow | null> {
    return db
      .select({ id: projects.id, companyId: projects.companyId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .then((rows) => rows[0] ?? null);
  }

  async function ensureDefaultSlots(project: ProjectRow) {
    const now = new Date();
    await db
      .insert(projectDocumentSlots)
      .values(DEFAULT_PROJECT_DOCUMENT_SLOT_DEFINITIONS.map((definition) => ({
        companyId: project.companyId,
        projectId: project.id,
        slotKey: definition.slotKey,
        slotGroup: definition.slotGroup,
        title: definition.title,
        required: definition.required,
        status: "empty",
        contentType: definition.contentType,
        metadata: defaultSlotMetadata(definition),
        createdAt: now,
        updatedAt: now,
      })))
      .onConflictDoNothing({
        target: [
          projectDocumentSlots.companyId,
          projectDocumentSlots.projectId,
          projectDocumentSlots.slotKey,
        ],
      });
  }

  async function getSlotRow(project: ProjectRow, slotKey: string): Promise<ProjectDocumentSlotRow | null> {
    const definition = getDefaultProjectDocumentSlotDefinition(slotKey);
    if (definition) {
      await ensureDefaultSlots(project);
    }
    return db
      .select()
      .from(projectDocumentSlots)
      .where(and(
        eq(projectDocumentSlots.companyId, project.companyId),
        eq(projectDocumentSlots.projectId, project.id),
        eq(projectDocumentSlots.slotKey, slotKey),
      ))
      .then((rows) => rows[0] ?? null);
  }

  async function requireUpsertSlot(project: ProjectRow, slotKey: string): Promise<{
    row: ProjectDocumentSlotRow;
    definition: ProjectDocumentSlotDefinition;
  }> {
    const definition = getDefaultProjectDocumentSlotDefinition(slotKey);
    if (!definition) {
      throw unprocessable("Unknown project document slot", { slotKey });
    }
    await ensureDefaultSlots(project);
    const row = await getSlotRow(project, slotKey);
    if (!row) {
      throw notFound("Project document slot not found");
    }
    return { row, definition };
  }

  async function assertDocumentForCompany(companyId: string, documentId: string) {
    const document = await db
      .select({ id: documents.id, companyId: documents.companyId, format: documents.format })
      .from(documents)
      .where(eq(documents.id, documentId))
      .then((rows) => rows[0] ?? null);
    if (!document) throw notFound("Document not found");
    if (document.companyId !== companyId) {
      throw unprocessable("Document belongs to another company", { documentId });
    }
    return document;
  }

  async function assertArtifactForCompany(companyId: string, artifactId: string) {
    const artifact = await db
      .select({
        id: assets.id,
        companyId: assets.companyId,
        contentType: assets.contentType,
      })
      .from(assets)
      .where(eq(assets.id, artifactId))
      .then((rows) => rows[0] ?? null);
    if (!artifact) throw notFound("Artifact not found");
    if (artifact.companyId !== companyId) {
      throw unprocessable("Artifact belongs to another company", { artifactId });
    }
    return artifact;
  }

  async function createDocument(input: {
    companyId: string;
    title: string | null;
    format: DocumentFormat;
    body: string;
    changeSummary?: string | null;
    actor: DocumentActor;
  }) {
    return db.transaction(async (tx) => {
      const now = new Date();
      const [document] = await tx
        .insert(documents)
        .values({
          companyId: input.companyId,
          title: input.title,
          format: input.format,
          latestBody: input.body,
          latestRevisionNumber: 1,
          createdByAgentId: input.actor.agentId ?? null,
          createdByUserId: input.actor.actorType === "user" ? input.actor.actorId : null,
          updatedByAgentId: input.actor.agentId ?? null,
          updatedByUserId: input.actor.actorType === "user" ? input.actor.actorId : null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      if (!document) throw new Error("Failed to create project document");

      const [revision] = await tx
        .insert(documentRevisions)
        .values({
          companyId: input.companyId,
          documentId: document.id,
          revisionNumber: 1,
          title: input.title,
          format: input.format,
          body: input.body,
          changeSummary: input.changeSummary ?? null,
          createdByAgentId: input.actor.agentId ?? null,
          createdByUserId: input.actor.actorType === "user" ? input.actor.actorId : null,
          createdByRunId: input.actor.runId ?? null,
          createdAt: now,
        })
        .returning();
      if (!revision) throw new Error("Failed to create project document revision");

      const [updated] = await tx
        .update(documents)
        .set({ latestRevisionId: revision.id })
        .where(eq(documents.id, document.id))
        .returning();
      return updated ?? { ...document, latestRevisionId: revision.id };
    });
  }

  async function updateSlot(
    project: ProjectRow,
    slotKey: string,
    input: UpsertProjectDocumentSlot,
  ): Promise<ProjectDocumentSlot> {
    const { row, definition } = await requireUpsertSlot(project, slotKey);
    const nextDocumentId = input.documentId !== undefined ? input.documentId : row.documentId ?? null;
    const nextArtifactId = input.artifactId !== undefined ? input.artifactId : row.artifactId ?? null;

    const document = nextDocumentId ? await assertDocumentForCompany(project.companyId, nextDocumentId) : null;
    const artifact = nextArtifactId ? await assertArtifactForCompany(project.companyId, nextArtifactId) : null;
    const nextContentType = input.contentType !== undefined
      ? input.contentType
      : document
        ? contentTypeForFormat(document.format as DocumentFormat)
        : artifact
          ? artifact.contentType
          : row.contentType ?? definition.contentType;

    const [updated] = await db
      .update(projectDocumentSlots)
      .set({
        slotGroup: definition.slotGroup,
        title: input.title ?? row.title ?? definition.title,
        required: definition.required ? true : input.required ?? row.required,
        status: input.status ?? (row.status as ProjectDocumentSlotStatus),
        documentId: nextDocumentId,
        artifactId: nextArtifactId,
        contentType: nextContentType,
        metadata: input.metadata === undefined ? row.metadata ?? null : input.metadata,
        updatedAt: new Date(),
      })
      .where(eq(projectDocumentSlots.id, row.id))
      .returning();
    if (!updated) throw notFound("Project document slot not found");
    return toSlot(updated);
  }

  return {
    getProject,

    ensureDefaultSlots,

    listForProject: async (project: ProjectRow): Promise<ProjectDocumentSlot[]> => {
      await ensureDefaultSlots(project);
      const rows = await db
        .select()
        .from(projectDocumentSlots)
        .where(and(
          eq(projectDocumentSlots.companyId, project.companyId),
          eq(projectDocumentSlots.projectId, project.id),
        ));
      return rows.map(toSlot).sort(sortSlots);
    },

    getByKey: async (project: ProjectRow, slotKey: string): Promise<ProjectDocumentSlot | null> => {
      const row = await getSlotRow(project, slotKey);
      return row ? toSlot(row) : null;
    },

    update: updateSlot,

    importIntoSlot: async (
      project: ProjectRow,
      slotKey: string,
      input: ImportProjectDocumentSlot,
      actor: DocumentActor,
    ): Promise<ProjectDocumentSlot> => {
      const { row, definition } = await requireUpsertSlot(project, slotKey);
      if (input.body !== undefined) {
        const document = await createDocument({
          companyId: project.companyId,
          title: input.title ?? row.title ?? definition.title,
          format: input.format,
          body: input.body,
          changeSummary: input.changeSummary ?? null,
          actor,
        });
        return updateSlot(project, slotKey, {
          documentId: document.id,
          status: input.status,
          contentType: input.contentType ?? contentTypeForFormat(input.format),
          metadata: input.metadata,
        });
      }
      if (input.documentId) {
        return updateSlot(project, slotKey, {
          documentId: input.documentId,
          status: input.status,
          contentType: input.contentType,
          metadata: input.metadata,
        });
      }
      if (input.artifactId) {
        return updateSlot(project, slotKey, {
          artifactId: input.artifactId,
          status: input.status,
          contentType: input.contentType,
          metadata: input.metadata,
        });
      }
      throw unprocessable("Project document slot import requires documentId, artifactId, or body");
    },

    getContent: async (
      project: ProjectRow,
      slotKey: string,
    ): Promise<ProjectDocumentSlotContentResponse | null> => {
      const slot = await getSlotRow(project, slotKey);
      if (!slot) return null;

      const [document] = slot.documentId
        ? await db
          .select()
          .from(documents)
          .where(and(eq(documents.companyId, project.companyId), eq(documents.id, slot.documentId)))
        : [];
      const [artifact] = slot.artifactId
        ? await db
          .select({
            id: assets.id,
            contentType: assets.contentType,
            originalFilename: assets.originalFilename,
            byteSize: assets.byteSize,
          })
          .from(assets)
          .where(and(eq(assets.companyId, project.companyId), eq(assets.id, slot.artifactId)))
        : [];

      return {
        slot: toSlot(slot),
        document: document ? documentContent(document) : null,
        artifact: artifact
          ? {
              artifactId: artifact.id,
              contentType: artifact.contentType,
              originalFilename: artifact.originalFilename ?? null,
              byteSize: artifact.byteSize,
              contentPath: `/api/assets/${artifact.id}/content`,
            }
          : null,
      };
    },
  };
}

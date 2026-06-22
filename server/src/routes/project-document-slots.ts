import { Router, type Request, type Response } from "express";
import type { Db } from "@paperclipai/db";
import {
  importProjectDocumentSlotSchema,
  upsertProjectDocumentSlotSchema,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { forbidden } from "../errors.js";
import { accessService, logActivity, projectDocumentSlotService } from "../services/index.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

type ProjectRef = { id: string; companyId: string };

export function projectDocumentSlotRoutes(db: Db) {
  const router = Router();
  const svc = projectDocumentSlotService(db);
  const access = accessService(db);

  async function assertProjectReadAllowed(req: Request, res: Response, project: ProjectRef) {
    const decision = await access.decide({
      actor: req.actor,
      action: "project:read",
      resource: { type: "project", companyId: project.companyId, projectId: project.id },
    });
    if (decision.allowed) return true;
    res.status(403).json({ error: "Project is outside this actor's authorization boundary" });
    return false;
  }

  async function loadProject(req: Request, res: Response): Promise<ProjectRef | null> {
    const projectId = req.params.projectId as string;
    const project = await svc.getProject(projectId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return null;
    }
    assertCompanyAccess(req, project.companyId);
    if (!(await assertProjectReadAllowed(req, res, project))) return null;
    return project;
  }

  function assertWriteAllowed(req: Request) {
    if (req.actor.type === "board") return;
    throw forbidden("Agent project document slot writes require producer plugin ownership");
  }

  async function logSlotActivity(req: Request, project: ProjectRef, input: {
    action: string;
    slotKey: string;
    details: Record<string, unknown>;
  }) {
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: project.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: input.action,
      entityType: "project",
      entityId: project.id,
      details: {
        slotKey: input.slotKey,
        ...input.details,
      },
    });
  }

  router.get("/projects/:projectId/document-slots", async (req, res) => {
    const project = await loadProject(req, res);
    if (!project) return;
    res.json(await svc.listForProject(project));
  });

  router.get("/projects/:projectId/document-slots/:slotKey", async (req, res) => {
    const project = await loadProject(req, res);
    if (!project) return;
    const slotKey = req.params.slotKey as string;
    const slot = await svc.getByKey(project, slotKey);
    if (!slot) {
      res.status(404).json({ error: "Project document slot not found" });
      return;
    }
    res.json(slot);
  });

  router.put(
    "/projects/:projectId/document-slots/:slotKey",
    validate(upsertProjectDocumentSlotSchema),
    async (req, res) => {
      const project = await loadProject(req, res);
      if (!project) return;
      assertWriteAllowed(req);
      const slotKey = req.params.slotKey as string;
      const slot = await svc.update(project, slotKey, req.body);
      await logSlotActivity(req, project, {
        action: "project.document_slot_updated",
        slotKey,
        details: {
          status: slot.status,
          documentId: slot.documentId,
          artifactId: slot.artifactId,
          changedKeys: Object.keys(req.body).sort(),
        },
      });
      res.json(slot);
    },
  );

  router.post(
    "/projects/:projectId/document-slots/:slotKey/import",
    validate(importProjectDocumentSlotSchema),
    async (req, res) => {
      const project = await loadProject(req, res);
      if (!project) return;
      assertWriteAllowed(req);
      const slotKey = req.params.slotKey as string;
      const actor = getActorInfo(req);
      const slot = await svc.importIntoSlot(project, slotKey, req.body, actor);
      await logSlotActivity(req, project, {
        action: "project.document_slot_imported",
        slotKey,
        details: {
          status: slot.status,
          documentId: slot.documentId,
          artifactId: slot.artifactId,
          importKind: req.body.body ? "body" : req.body.documentId ? "document" : "artifact",
        },
      });
      res.json(slot);
    },
  );

  router.get("/projects/:projectId/document-slots/:slotKey/content", async (req, res) => {
    const project = await loadProject(req, res);
    if (!project) return;
    const slotKey = req.params.slotKey as string;
    const content = await svc.getContent(project, slotKey);
    if (!content) {
      res.status(404).json({ error: "Project document slot not found" });
      return;
    }
    res.json(content);
  });

  return router;
}

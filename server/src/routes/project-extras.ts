import { Router } from "express";
import type { Db } from "@paperclipai/db";
import {
  addProjectMemberSchema,
  addProjectTeamSchema,
  createMilestoneSchema,
  createProjectUpdateSchema,
  updateMilestoneSchema,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { projectExtrasService, projectService, logActivity } from "../services/index.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

function handleErr(res: any, err: any) {
  if (err?.status === 409 || err?.status === 422 || err?.status === 404) {
    res.status(err.status).json({ error: err.message });
    return true;
  }
  return false;
}

export function projectExtrasRoutes(db: Db) {
  const router = Router();
  const svc = projectExtrasService(db);
  const projects = projectService(db);

  async function loadProject(id: string) {
    return projects.getById(id);
  }

  // ========== project teams (N:M) ==========

  router.get("/companies/:companyId/projects/:projectId/teams", async (req, res) => {
    const project = await loadProject(req.params.projectId as string);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    assertCompanyAccess(req, project.companyId);
    res.json(await svc.listTeams(project.id));
  });

  router.post(
    "/companies/:companyId/projects/:projectId/teams",
    validate(addProjectTeamSchema),
    async (req, res) => {
      const project = await loadProject(req.params.projectId as string);
      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }
      assertCompanyAccess(req, project.companyId);
      try {
        const row = await svc.addTeam(project.id, project.companyId, req.body.teamId);
        if (!row) {
          res.status(409).json({ error: "Team already linked to project" });
          return;
        }
        res.status(201).json(row);
      } catch (err: any) {
        if (handleErr(res, err)) return;
        throw err;
      }
    },
  );

  router.delete("/companies/:companyId/projects/:projectId/teams/:teamId", async (req, res) => {
    const project = await loadProject(req.params.projectId as string);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    assertCompanyAccess(req, project.companyId);
    const removed = await svc.removeTeam(project.id, req.params.teamId as string);
    if (!removed) {
      res.status(404).json({ error: "Team not linked to project" });
      return;
    }
    res.json(removed);
  });

  // ========== project members ==========

  router.get("/companies/:companyId/projects/:projectId/members", async (req, res) => {
    const project = await loadProject(req.params.projectId as string);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    assertCompanyAccess(req, project.companyId);
    res.json(await svc.listMembers(project.id));
  });

  router.post(
    "/companies/:companyId/projects/:projectId/members",
    validate(addProjectMemberSchema),
    async (req, res) => {
      const project = await loadProject(req.params.projectId as string);
      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }
      assertCompanyAccess(req, project.companyId);
      try {
        const row = await svc.addMember(project.id, project.companyId, req.body);
        if (!row) {
          res.status(409).json({ error: "Member already in project" });
          return;
        }
        res.status(201).json(row);
      } catch (err: any) {
        if (handleErr(res, err)) return;
        throw err;
      }
    },
  );

  router.delete(
    "/companies/:companyId/projects/:projectId/members/:memberId",
    async (req, res) => {
      const project = await loadProject(req.params.projectId as string);
      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }
      assertCompanyAccess(req, project.companyId);
      const removed = await svc.removeMember(project.id, req.params.memberId as string);
      if (!removed) {
        res.status(404).json({ error: "Member not found in this project" });
        return;
      }
      res.json(removed);
    },
  );

  // ========== milestones ==========

  router.get("/companies/:companyId/projects/:projectId/milestones", async (req, res) => {
    const project = await loadProject(req.params.projectId as string);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    assertCompanyAccess(req, project.companyId);
    res.json(await svc.listMilestones(project.id));
  });

  router.post(
    "/companies/:companyId/projects/:projectId/milestones",
    validate(createMilestoneSchema),
    async (req, res) => {
      const project = await loadProject(req.params.projectId as string);
      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }
      assertCompanyAccess(req, project.companyId);
      try {
        const row = await svc.createMilestone(project.id, project.companyId, req.body);
        const actor = getActorInfo(req);
        await logActivity(db, {
          companyId: project.companyId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          agentId: actor.agentId,
          action: "milestone.created",
          entityType: "milestone",
          entityId: row.id,
          details: { name: row.name, projectId: project.id },
        });
        res.status(201).json(row);
      } catch (err: any) {
        if (handleErr(res, err)) return;
        throw err;
      }
    },
  );

  router.patch(
    "/companies/:companyId/projects/:projectId/milestones/:milestoneId",
    validate(updateMilestoneSchema),
    async (req, res) => {
      const project = await loadProject(req.params.projectId as string);
      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }
      assertCompanyAccess(req, project.companyId);
      const existing = await svc.getMilestoneById(req.params.milestoneId as string);
      if (!existing || existing.projectId !== project.id) {
        res.status(404).json({ error: "Milestone not found in this project" });
        return;
      }
      const row = await svc.updateMilestone(existing.id, req.body);
      res.json(row);
    },
  );

  router.delete(
    "/companies/:companyId/projects/:projectId/milestones/:milestoneId",
    async (req, res) => {
      const project = await loadProject(req.params.projectId as string);
      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }
      assertCompanyAccess(req, project.companyId);
      const existing = await svc.getMilestoneById(req.params.milestoneId as string);
      if (!existing || existing.projectId !== project.id) {
        res.status(404).json({ error: "Milestone not found in this project" });
        return;
      }
      await svc.removeMilestone(project.id, existing.id);
      res.json(existing);
    },
  );

  // ========== project updates (health) ==========

  router.get("/companies/:companyId/projects/:projectId/updates", async (req, res) => {
    const project = await loadProject(req.params.projectId as string);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    assertCompanyAccess(req, project.companyId);
    res.json(await svc.listUpdates(project.id));
  });

  router.post(
    "/companies/:companyId/projects/:projectId/updates",
    validate(createProjectUpdateSchema),
    async (req, res) => {
      const project = await loadProject(req.params.projectId as string);
      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }
      assertCompanyAccess(req, project.companyId);
      const actor = getActorInfo(req);
      try {
        const row = await svc.createUpdate(project.id, project.companyId, {
          health: req.body.health,
          body: req.body.body,
          createdByAgentId: actor.agentId ?? null,
          createdByUserId: actor.actorType === "user" ? actor.actorId : null,
        });
        await logActivity(db, {
          companyId: project.companyId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          agentId: actor.agentId,
          action: "project_update.created",
          entityType: "project",
          entityId: project.id,
          details: { health: row.health },
        });
        res.status(201).json(row);
      } catch (err: any) {
        if (handleErr(res, err)) return;
        throw err;
      }
    },
  );

  return router;
}

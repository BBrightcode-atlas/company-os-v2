import { Router } from "express";
import type { Db } from "@paperclipai/db";
import {
  updateReviewPipelineSchema,
  rejectReviewSchema,
  updateReviewCheckSchema,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { reviewPipelineService } from "../services/index.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

export function reviewPipelineRoutes(db: Db) {
  const router = Router({ mergeParams: true });

  // GET /teams/:teamId/review-pipeline
  router.get("/teams/:teamId/review-pipeline", async (req, res) => {
    const { companyId, teamId } = req.params as { companyId: string; teamId: string };
    assertCompanyAccess(req, companyId);
    const svc = reviewPipelineService(db);
    const pipeline = await svc.getTeamPipeline(companyId, teamId);
    res.json(pipeline);
  });

  // PUT /teams/:teamId/review-pipeline
  router.put(
    "/teams/:teamId/review-pipeline",
    validate(updateReviewPipelineSchema),
    async (req, res) => {
      const { companyId, teamId } = req.params as { companyId: string; teamId: string };
      assertCompanyAccess(req, companyId);
      const svc = reviewPipelineService(db);
      const pipeline = await svc.upsertTeamPipeline(companyId, teamId, req.body);
      res.json(pipeline);
    },
  );

  // GET /issues/:issueId/reviews
  router.get("/issues/:issueId/reviews", async (req, res) => {
    const { companyId, issueId } = req.params as { companyId: string; issueId: string };
    assertCompanyAccess(req, companyId);
    const svc = reviewPipelineService(db);
    const runs = await svc.getRunsByIssue(companyId, issueId);
    res.json(runs);
  });

  // GET /issues/:issueId/reviews/:runId
  router.get("/issues/:issueId/reviews/:runId", async (req, res) => {
    const { companyId, runId } = req.params as { companyId: string; issueId: string; runId: string };
    assertCompanyAccess(req, companyId);
    const svc = reviewPipelineService(db);
    const run = await svc.getRunById(runId);
    res.json(run);
  });

  // POST /issues/:issueId/reviews/:runId/approve
  router.post("/issues/:issueId/reviews/:runId/approve", async (req, res) => {
    const { companyId, runId } = req.params as { companyId: string; issueId: string; runId: string };
    assertCompanyAccess(req, companyId);
    const actor = getActorInfo(req);
    const svc = reviewPipelineService(db);
    const approval = await svc.approveRun(runId, actor.actorId);
    res.json(approval);
  });

  // POST /issues/:issueId/reviews/:runId/reject
  router.post(
    "/issues/:issueId/reviews/:runId/reject",
    validate(rejectReviewSchema),
    async (req, res) => {
      const { companyId, runId } = req.params as { companyId: string; issueId: string; runId: string };
      assertCompanyAccess(req, companyId);
      const actor = getActorInfo(req);
      const svc = reviewPipelineService(db);
      const approval = await svc.rejectRun(runId, actor.actorId, req.body.decisionNote);
      res.json(approval);
    },
  );

  // PUT /reviews/:runId/checks/:checkId
  router.put(
    "/reviews/:runId/checks/:checkId",
    validate(updateReviewCheckSchema),
    async (req, res) => {
      const { companyId, checkId } = req.params as { companyId: string; runId: string; checkId: string };
      assertCompanyAccess(req, companyId);
      const svc = reviewPipelineService(db);
      const result = await svc.updateCheck(checkId, req.body);
      res.json(result);
    },
  );

  return router;
}

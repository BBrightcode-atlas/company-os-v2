import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { forbidden } from "../errors.js";
import { autoAssignmentService } from "../services/auto-assignment.js";
import { instanceSettingsService, secretService, heartbeatService } from "../services/index.js";

export function autoAssignmentRoutes(db: Db) {
  const router = Router();
  const svc = autoAssignmentService(db);
  const settingsSvc = instanceSettingsService(db);

  // GET /api/companies/:companyId/auto-assignment/log
  router.get("/companies/:companyId/auto-assignment/log", async (req, res) => {
    if (req.actor.type !== "board") {
      throw forbidden("Board access required");
    }
    const { companyId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Number(req.query.offset) || 0;
    const log = await svc.getLog(companyId!, limit, offset);
    res.json({ items: log, limit, offset });
  });

  // POST /api/companies/:companyId/auto-assignment/run
  router.post("/companies/:companyId/auto-assignment/run", async (req, res) => {
    if (req.actor.type !== "board") {
      throw forbidden("Board access required");
    }
    const { companyId } = req.params;

    // Get API key from secrets or env
    const anthropicApiKey = await getAnthropicApiKey(db, companyId!);
    if (!anthropicApiKey) {
      res.status(400).json({ error: "Anthropic API key not configured" });
      return;
    }

    const hbSvc = heartbeatService(db);
    const result = await svc.runTick(companyId!, hbSvc, {
      anthropicApiKey,
      scoreThreshold: svc.DEFAULT_SCORE_THRESHOLD,
      maxIssuesPerRun: svc.DEFAULT_MAX_ISSUES_PER_RUN,
      model: svc.DEFAULT_MODEL,
    });

    res.json(result);
  });

  // GET /api/companies/:companyId/auto-assignment/settings
  router.get("/companies/:companyId/auto-assignment/settings", async (req, res) => {
    if (req.actor.type !== "board") {
      throw forbidden("Board access required");
    }
    const experimental = await settingsSvc.getExperimental();
    res.json({
      enabled: experimental.enableAutoAssignment ?? false,
      scoreThreshold: svc.DEFAULT_SCORE_THRESHOLD,
      maxIssuesPerRun: svc.DEFAULT_MAX_ISSUES_PER_RUN,
      model: svc.DEFAULT_MODEL,
    });
  });

  // PATCH /api/companies/:companyId/auto-assignment/settings
  router.patch("/companies/:companyId/auto-assignment/settings", async (req, res) => {
    if (req.actor.type !== "board") {
      throw forbidden("Board access required");
    }
    if (req.actor.source !== "local_implicit" && !req.actor.isInstanceAdmin) {
      throw forbidden("Instance admin access required");
    }

    const { enabled } = req.body as { enabled?: boolean };
    if (typeof enabled === "boolean") {
      await settingsSvc.updateExperimental({ enableAutoAssignment: enabled });
    }

    const experimental = await settingsSvc.getExperimental();
    res.json({
      enabled: experimental.enableAutoAssignment ?? false,
      scoreThreshold: svc.DEFAULT_SCORE_THRESHOLD,
      maxIssuesPerRun: svc.DEFAULT_MAX_ISSUES_PER_RUN,
      model: svc.DEFAULT_MODEL,
    });
  });

  return router;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAnthropicApiKey(db: Db, companyId: string): Promise<string | null> {
  // Try environment variable first
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }

  // Try company secrets - look for a secret named ANTHROPIC_API_KEY
  try {
    const secrets = secretService(db);
    const secret = await secrets.getByName(companyId, "ANTHROPIC_API_KEY");
    if (secret) {
      const value = await secrets.resolveSecretValue(companyId, secret.id, "latest");
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

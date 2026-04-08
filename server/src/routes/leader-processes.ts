/**
 * Leader CLI lifecycle routes.
 *
 * Phase 4 HTTP surface for leaderProcessService. All endpoints require
 * board user auth (agent Bearer tokens cannot start/stop their own CLI
 * — prevents self-kill). Cross-company access is gated via the agent
 * row's companyId matching the path param.
 *
 * @see docs/cos-v2/phase4-cli-design.md §10.2
 */

import { Router } from "express";
import { eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents } from "@paperclipai/db";
import { validate } from "../middleware/validate.js";
import {
  stopLeaderProcessSchema,
  startLeaderProcessSchema,
  leaderProcessLogQuerySchema,
} from "@paperclipai/shared";
import { assertCompanyAccess } from "./authz.js";
import type { LeaderProcessService } from "../services/leader-processes.js";
import type { ProcessBackend } from "../services/process-backend.js";

interface Deps {
  db: Db;
  leaderProcess: LeaderProcessService;
  backend: ProcessBackend;
}

function requireBoard(req: import("express").Request): boolean {
  return req.actor.type === "board";
}

function sendError(
  res: import("express").Response,
  err: any,
): boolean {
  if (err?.status === 404 || err?.status === 422 || err?.status === 409 || err?.status === 403) {
    res.status(err.status).json({ error: err.message });
    return true;
  }
  return false;
}

async function resolveAgent(
  db: Db,
  req: import("express").Request,
  res: import("express").Response,
): Promise<{ companyId: string; agentId: string } | null> {
  const companyId = req.params.companyId as string;
  const agentId = req.params.agentId as string;

  const [row] = await db
    .select({ companyId: agents.companyId })
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Agent not found" });
    return null;
  }
  if (row.companyId !== companyId) {
    res.status(422).json({ error: "Agent does not belong to this company" });
    return null;
  }
  assertCompanyAccess(req, companyId);
  return { companyId, agentId };
}

export function leaderProcessRoutes(deps: Deps) {
  const router = Router();
  const { db, leaderProcess, backend } = deps;

  /**
   * POST /companies/:companyId/agents/:agentId/cli/start
   * Auth: board user only
   */
  router.post(
    "/companies/:companyId/agents/:agentId/cli/start",
    validate(startLeaderProcessSchema),
    async (req, res) => {
      if (!requireBoard(req)) {
        res.status(403).json({ error: "Board user required to start leader CLI" });
        return;
      }
      const ctx = await resolveAgent(db, req, res);
      if (!ctx) return;
      try {
        const row = await leaderProcess.start(ctx);
        res.status(202).json(row);
      } catch (err: any) {
        if (sendError(res, err)) return;
        res.status(500).json({ error: err?.message ?? "internal error" });
      }
    },
  );

  /**
   * POST /companies/:companyId/agents/:agentId/cli/stop
   */
  router.post(
    "/companies/:companyId/agents/:agentId/cli/stop",
    validate(stopLeaderProcessSchema),
    async (req, res) => {
      if (!requireBoard(req)) {
        res.status(403).json({ error: "Board user required to stop leader CLI" });
        return;
      }
      const ctx = await resolveAgent(db, req, res);
      if (!ctx) return;
      try {
        const row = await leaderProcess.stop({
          agentId: ctx.agentId,
          timeoutMs: req.body?.timeoutMs,
        });
        res.json(row);
      } catch (err: any) {
        if (sendError(res, err)) return;
        res.status(500).json({ error: err?.message ?? "internal error" });
      }
    },
  );

  /**
   * POST /companies/:companyId/agents/:agentId/cli/restart
   */
  router.post(
    "/companies/:companyId/agents/:agentId/cli/restart",
    async (req, res) => {
      if (!requireBoard(req)) {
        res.status(403).json({ error: "Board user required to restart leader CLI" });
        return;
      }
      const ctx = await resolveAgent(db, req, res);
      if (!ctx) return;
      try {
        const row = await leaderProcess.restart(ctx);
        res.json(row);
      } catch (err: any) {
        if (sendError(res, err)) return;
        res.status(500).json({ error: err?.message ?? "internal error" });
      }
    },
  );

  /**
   * GET /companies/:companyId/agents/:agentId/cli/status
   */
  router.get(
    "/companies/:companyId/agents/:agentId/cli/status",
    async (req, res) => {
      const ctx = await resolveAgent(db, req, res);
      if (!ctx) return;
      try {
        const detail = await leaderProcess.status({ agentId: ctx.agentId });
        if (!detail) {
          res.json({
            row: null,
            alive: false,
          });
          return;
        }
        res.json(detail);
      } catch (err: any) {
        res.status(500).json({ error: err?.message ?? "internal error" });
      }
    },
  );

  /**
   * GET /companies/:companyId/agents/:agentId/cli/logs?kind=out&lines=50
   * Returns a snapshot of the last N lines. For live tailing use the
   * SSE variant (/cli/logs/stream) — not implemented in MVP.
   */
  router.get(
    "/companies/:companyId/agents/:agentId/cli/logs",
    async (req, res) => {
      const ctx = await resolveAgent(db, req, res);
      if (!ctx) return;
      const parsed = leaderProcessLogQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(422).json({ error: parsed.error.message });
        return;
      }
      const { kind, lines } = parsed.data;
      const detail = await leaderProcess.status({ agentId: ctx.agentId });
      if (!detail?.row.pm2Name) {
        res.json({ lines: [] });
        return;
      }
      try {
        const out = await backend.tailLog(detail.row.pm2Name, kind, lines);
        res.json({ lines: out });
      } catch (err: any) {
        res.status(500).json({ error: err?.message ?? "internal error" });
      }
    },
  );

  /**
   * GET /companies/:companyId/leader-processes
   * Admin view: list every leader process in the company.
   */
  router.get(
    "/companies/:companyId/leader-processes",
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      try {
        const rows = await leaderProcess.list({ companyId });
        res.json(rows);
      } catch (err: any) {
        res.status(500).json({ error: err?.message ?? "internal error" });
      }
    },
  );

  return router;
}

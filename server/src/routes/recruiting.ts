/**
 * Recruiting routes — Phase 5.2e.
 *
 * "Recruiting" is the COS v2 workflow for proposing new agents via an
 * approval-gated pipeline. A human (or, in a future phase, another
 * agent) calls `POST /companies/:cid/recruiting/propose` with a
 * candidate spec (name, role, title, capabilities, adapterType). We
 * then:
 *
 *   1. Insert a new row in `agents` with status = "pending_approval".
 *   2. Create an `approvals` row of type "hire_agent" whose payload
 *      references that agent id.
 *
 * When a board user approves the approval (existing POST
 * /approvals/:id/approve endpoint), the existing hire-hook promotes
 * the agent to `status="idle"` via `agentsSvc.activatePendingApproval`.
 * Rejection terminates the agent.
 *
 * This route is intentionally tiny — all the heavy lifting (activation,
 * budget policy, notification) already exists in `approvalService` +
 * `agentService`. We're just a thin proposal-form adapter for the UI.
 */

import type { Request, Response, Router as ExpressRouter } from "express";
import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { agentService } from "../services/agents.js";
import { approvalService } from "../services/approvals.js";
import { logActivity } from "../services/activity-log.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

const proposeAgentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(80),
  title: z.string().trim().max(160).optional().nullable(),
  capabilities: z.string().trim().max(2000).optional().nullable(),
  adapterType: z.enum(["claude_local", "process", "none"]).default("process"),
  reportsTo: z.string().uuid().optional().nullable(),
  budgetMonthlyCents: z.number().int().min(0).max(100_000_00).optional().default(0),
  reason: z.string().trim().max(2000).optional().nullable(),
});

export function recruitingRoutes(db: Db): ExpressRouter {
  const router = Router();
  const agentsSvc = agentService(db);
  const approvalsSvc = approvalService(db);

  /**
   * Propose a new agent hire. Creates a pending_approval agent row
   * and a hire_agent approval in one transaction-like sequence.
   *
   * The caller must be a board user (agents cannot propose hires in
   * this phase — that would require adapter-side prompt tuning and
   * anti-runaway guards that are out of scope).
   */
  router.post(
    "/companies/:companyId/recruiting/propose",
    validate(proposeAgentSchema),
    async (req: Request, res: Response) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      if (req.actor.type !== "board") {
        res.status(403).json({ error: "Only board users can propose hires" });
        return;
      }

      const body = req.body as z.infer<typeof proposeAgentSchema>;
      const actor = getActorInfo(req);

      // 1. Create the pending agent row.
      const agent = await agentsSvc.create(companyId, {
        name: body.name,
        role: body.role,
        title: body.title ?? null,
        reportsTo: body.reportsTo ?? null,
        capabilities: body.capabilities ?? null,
        adapterType: body.adapterType,
        adapterConfig: {},
        budgetMonthlyCents: body.budgetMonthlyCents ?? 0,
        metadata: { proposedVia: "recruiting", proposalReason: body.reason ?? null },
        status: "pending_approval",
        spentMonthlyCents: 0,
        permissions: undefined,
        lastHeartbeatAt: null,
      });
      if (!agent) {
        res.status(500).json({ error: "Failed to create agent" });
        return;
      }

      // 2. Create the hire_agent approval referencing that agent id so
      // approval.approve() activates the existing row instead of
      // creating a second one.
      const approval = await approvalsSvc.create(companyId, {
        type: "hire_agent",
        status: "pending",
        requestedByUserId: actor.actorId,
        requestedByAgentId: null,
        payload: {
          agentId: agent.id,
          name: body.name,
          role: body.role,
          title: body.title ?? null,
          capabilities: body.capabilities ?? null,
          adapterType: body.adapterType,
          budgetMonthlyCents: body.budgetMonthlyCents ?? 0,
          reason: body.reason ?? null,
        },
        decisionNote: null,
        decidedByUserId: null,
        decidedAt: null,
      });

      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "recruiting.proposed",
        entityType: "agent",
        entityId: agent.id,
        details: {
          approvalId: approval.id,
          name: body.name,
          role: body.role,
          adapterType: body.adapterType,
        },
      });

      res.status(201).json({
        agent: { id: agent.id, name: agent.name, status: agent.status },
        approval: { id: approval.id, status: approval.status },
      });
    },
  );

  return router;
}

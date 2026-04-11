import { eq, and, inArray } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  reviewPipelineTemplates,
  reviewRuns,
  reviewChecks,
  approvals,
  issueApprovals,
} from "@paperclipai/db";
import type { ReviewStepConfig } from "@paperclipai/db";
import { notFound } from "../errors.js";

export function reviewPipelineService(db: Db) {
  // --- Pipeline Template ---

  async function getTeamPipeline(companyId: string, teamId: string) {
    return db
      .select()
      .from(reviewPipelineTemplates)
      .where(
        and(
          eq(reviewPipelineTemplates.companyId, companyId),
          eq(reviewPipelineTemplates.teamId, teamId),
          eq(reviewPipelineTemplates.isDefault, true),
        ),
      )
      .then((rows) => rows[0] ?? null);
  }

  async function upsertTeamPipeline(
    companyId: string,
    teamId: string,
    data: { name?: string; enabled?: boolean; steps?: ReviewStepConfig[] },
  ) {
    const existing = await getTeamPipeline(companyId, teamId);
    const now = new Date();

    if (existing) {
      return db
        .update(reviewPipelineTemplates)
        .set({
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
          ...(data.steps !== undefined ? { steps: data.steps } : {}),
          updatedAt: now,
        })
        .where(eq(reviewPipelineTemplates.id, existing.id))
        .returning()
        .then((rows) => rows[0]);
    }

    return db
      .insert(reviewPipelineTemplates)
      .values({
        companyId,
        teamId,
        name: data.name ?? "Default Pipeline",
        enabled: data.enabled ?? true,
        steps: data.steps ?? [],
        isDefault: true,
        updatedAt: now,
      })
      .returning()
      .then((rows) => rows[0]);
  }

  // --- Review Runs ---

  async function createRun(params: {
    companyId: string;
    workProductId: string;
    issueId: string;
    pipelineTemplateId: string;
    steps: ReviewStepConfig[];
    triggeredBy: string;
  }) {
    // Cancel existing running/failed runs for the same workProduct
    const existingRuns = await db
      .select()
      .from(reviewRuns)
      .where(
        and(
          eq(reviewRuns.companyId, params.companyId),
          eq(reviewRuns.workProductId, params.workProductId),
          inArray(reviewRuns.status, ["running", "failed"]),
        ),
      );

    if (existingRuns.length > 0) {
      const ids = existingRuns.map((r) => r.id);
      await db
        .update(reviewRuns)
        .set({ status: "cancelled", completedAt: new Date() })
        .where(inArray(reviewRuns.id, ids));
    }

    // Create new run
    const run = await db
      .insert(reviewRuns)
      .values({
        companyId: params.companyId,
        workProductId: params.workProductId,
        issueId: params.issueId,
        pipelineTemplateId: params.pipelineTemplateId,
        status: "running",
        triggeredBy: params.triggeredBy,
        startedAt: new Date(),
      })
      .returning()
      .then((rows) => rows[0]);

    // Create review_checks for each step
    const checks = await db
      .insert(reviewChecks)
      .values(
        params.steps.map((step) => ({
          reviewRunId: run.id,
          stepSlug: step.slug,
          stepName: step.name,
          stepType: step.type,
          executor: step.executor,
          status: "pending",
        })),
      )
      .returning();

    return { run, checks };
  }

  async function getRunsByIssue(companyId: string, issueId: string) {
    const runs = await db
      .select()
      .from(reviewRuns)
      .where(
        and(eq(reviewRuns.companyId, companyId), eq(reviewRuns.issueId, issueId)),
      )
      .orderBy(reviewRuns.createdAt);

    const runIds = runs.map((r) => r.id);
    if (runIds.length === 0) return [];

    const allChecks = await db
      .select()
      .from(reviewChecks)
      .where(inArray(reviewChecks.reviewRunId, runIds));

    return runs.map((run) => ({
      ...run,
      checks: allChecks.filter((c) => c.reviewRunId === run.id),
    }));
  }

  async function getRunById(runId: string) {
    const run = await db
      .select()
      .from(reviewRuns)
      .where(eq(reviewRuns.id, runId))
      .then((rows) => rows[0] ?? null);

    if (!run) throw notFound("Review run not found");

    const checks = await db
      .select()
      .from(reviewChecks)
      .where(eq(reviewChecks.reviewRunId, runId));

    return { ...run, checks };
  }

  // --- Check updates ---

  async function updateCheck(
    checkId: string,
    data: {
      status: string;
      summary?: string | null;
      details?: Record<string, unknown> | null;
      checkedByAgentId?: string | null;
      checkedByUserId?: string | null;
    },
  ) {
    const now = new Date();
    const check = await db
      .update(reviewChecks)
      .set({
        status: data.status,
        ...(data.summary !== undefined ? { summary: data.summary } : {}),
        ...(data.details !== undefined ? { details: data.details } : {}),
        ...(data.checkedByAgentId !== undefined
          ? { checkedByAgentId: data.checkedByAgentId }
          : {}),
        ...(data.checkedByUserId !== undefined
          ? { checkedByUserId: data.checkedByUserId }
          : {}),
        checkedAt: now,
      })
      .where(eq(reviewChecks.id, checkId))
      .returning()
      .then((rows) => rows[0] ?? null);

    if (!check) throw notFound("Review check not found");

    // Check if all checks in the run are done
    const allChecks = await db
      .select()
      .from(reviewChecks)
      .where(eq(reviewChecks.reviewRunId, check.reviewRunId));

    const doneStatuses = new Set(["passed", "failed", "skipped"]);
    const allDone = allChecks.every((c) => doneStatuses.has(c.status));

    if (!allDone) {
      return { check, runCompleted: false };
    }

    // Determine run status
    const anyFailed = allChecks.some((c) => c.status === "failed");
    const runStatus = anyFailed ? "failed" : "passed";

    // Update run
    const run = await db
      .select()
      .from(reviewRuns)
      .where(eq(reviewRuns.id, check.reviewRunId))
      .then((rows) => rows[0]);

    if (!run) throw notFound("Review run not found");

    await db
      .update(reviewRuns)
      .set({ status: runStatus, completedAt: now })
      .where(eq(reviewRuns.id, run.id));

    // Create approval record
    const approval = await db
      .insert(approvals)
      .values({
        companyId: run.companyId,
        type: "pr_review",
        status: "pending",
        payload: { reviewRunId: run.id, workProductId: run.workProductId },
        updatedAt: now,
      })
      .returning()
      .then((rows) => rows[0]);

    // Link approval to issue via issue_approvals
    await db.insert(issueApprovals).values({
      companyId: run.companyId,
      issueId: run.issueId,
      approvalId: approval.id,
    });

    return { check, runCompleted: true, runStatus, approval };
  }

  // --- Approve/Reject ---

  async function findLinkedApproval(runId: string) {
    const allApprovals = await db
      .select()
      .from(approvals)
      .where(eq(approvals.type, "pr_review"));

    const linked = allApprovals.find((a) => {
      const payload = a.payload as Record<string, unknown>;
      return payload.reviewRunId === runId;
    });

    if (!linked) throw notFound("Linked approval not found for review run");
    return linked;
  }

  async function approveRun(runId: string, userId: string) {
    const approval = await findLinkedApproval(runId);
    const now = new Date();
    return db
      .update(approvals)
      .set({
        status: "approved",
        decidedByUserId: userId,
        decidedAt: now,
        updatedAt: now,
      })
      .where(eq(approvals.id, approval.id))
      .returning()
      .then((rows) => rows[0]);
  }

  async function rejectRun(runId: string, userId: string, decisionNote: string) {
    const approval = await findLinkedApproval(runId);
    const now = new Date();
    return db
      .update(approvals)
      .set({
        status: "rejected",
        decidedByUserId: userId,
        decisionNote: decisionNote,
        decidedAt: now,
        updatedAt: now,
      })
      .where(eq(approvals.id, approval.id))
      .returning()
      .then((rows) => rows[0]);
  }

  return {
    getTeamPipeline,
    upsertTeamPipeline,
    createRun,
    getRunsByIssue,
    getRunById,
    updateCheck,
    approveRun,
    rejectRun,
  };
}

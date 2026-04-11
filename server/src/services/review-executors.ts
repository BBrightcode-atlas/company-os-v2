import type { Db } from "@paperclipai/db";
import { issues } from "@paperclipai/db";
import { eq } from "drizzle-orm";

interface ReviewStepConfig {
  slug: string;
  name: string;
  type: "auto" | "manual";
  executor: "codex" | "claude" | "builtin" | "manual";
  config?: Record<string, unknown>;
}

interface ExecutionContext {
  companyId: string;
  issueId: string;
  workProductId: string;
  prDiff?: string;
  prUrl?: string;
  prTitle?: string;
}

interface ExecutionResult {
  status: "passed" | "failed";
  summary: string;
  details: Record<string, unknown>;
}

export function reviewExecutorService(db: Db) {
  async function getIssueSummary(issueId: string): Promise<string> {
    const issue = await db
      .select()
      .from(issues)
      .where(eq(issues.id, issueId))
      .then((rows) => rows[0] ?? null);
    if (!issue) return "(issue not found)";
    return `Title: ${issue.title}\nDescription: ${issue.description ?? "(none)"}`;
  }

  async function executeCodex(
    step: ReviewStepConfig,
    ctx: ExecutionContext
  ): Promise<ExecutionResult> {
    // MVP placeholder — Codex CLI integration in Phase 2
    return {
      status: "passed",
      summary: `[Codex] ${step.name}: 검증 대기 중 (Codex CLI 연동 예정)`,
      details: { executor: "codex", stepSlug: step.slug, pending: true },
    };
  }

  async function executeClaude(
    step: ReviewStepConfig,
    ctx: ExecutionContext
  ): Promise<ExecutionResult> {
    const issueSummary = await getIssueSummary(ctx.issueId);
    // MVP placeholder — Claude agent integration in Phase 2
    return {
      status: "passed",
      summary: `[Claude] ${step.name}: 검증 대기 중 (Claude agent 연동 예정)`,
      details: {
        executor: "claude",
        stepSlug: step.slug,
        issueSummary,
        pending: true,
      },
    };
  }

  async function executeBuiltin(
    step: ReviewStepConfig,
    _ctx: ExecutionContext
  ): Promise<ExecutionResult> {
    const handler = (step.config?.handler as string) ?? "unknown";
    // MVP placeholder — builtin handlers in Phase 2
    return {
      status: "passed",
      summary: `[Builtin] ${step.name}: 검증 대기 중 (${handler})`,
      details: { executor: "builtin", handler, pending: true },
    };
  }

  return {
    execute: async (
      step: ReviewStepConfig,
      ctx: ExecutionContext
    ): Promise<ExecutionResult> => {
      switch (step.executor) {
        case "codex":
          return executeCodex(step, ctx);
        case "claude":
          return executeClaude(step, ctx);
        case "builtin":
          return executeBuiltin(step, ctx);
        case "manual":
          return {
            status: "passed",
            summary: "수동 검증 대기 중",
            details: { executor: "manual", awaitingHuman: true },
          };
        default:
          return {
            status: "failed",
            summary: `Unknown executor: ${step.executor}`,
            details: {},
          };
      }
    },
  };
}

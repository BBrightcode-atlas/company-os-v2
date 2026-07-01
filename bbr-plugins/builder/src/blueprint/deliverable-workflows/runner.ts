import type { BlueprintLlmTool, BlueprintPrd, ProjectDocumentSlotKey } from "../contract.js";
import type { BlueprintDeliverableWorkflow, BlueprintStageContext } from "./types.js";

export function orderDeliverableWorkflows(
  workflows: readonly BlueprintDeliverableWorkflow[],
): BlueprintDeliverableWorkflow[] {
  const byKey = new Map(workflows.map((workflow) => [workflow.key, workflow]));
  const visited = new Set<string>();
  const ordered: BlueprintDeliverableWorkflow[] = [];
  const visit = (workflow: BlueprintDeliverableWorkflow): void => {
    if (visited.has(workflow.key)) return;
    visited.add(workflow.key);
    for (const depKey of workflow.dependsOn) {
      const dep = byKey.get(depKey);
      if (dep) visit(dep);
    }
    ordered.push(workflow);
  };
  for (const workflow of workflows) visit(workflow);
  return ordered;
}

export type DeliverableWorkflowEffects = {
  callLlmTool: (prompt: string, tool: BlueprintLlmTool, maxTokens: number) => Promise<Record<string, unknown>>;
  commit: (assembled: BlueprintPrd, writeSlotKeys: readonly ProjectDocumentSlotKey[]) => Promise<{ aborted: boolean }>;
  log: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
  isAborted: () => Promise<boolean>;
};

export type DeliverableWorkflowStageResult = {
  key: string;
  status: "llm" | "fallback" | "aborted";
  error?: string;
};

export type DeliverableWorkflowRunResult = {
  prd: BlueprintPrd;
  usedFallback: boolean;
  stages: DeliverableWorkflowStageResult[];
};

export async function runDeliverableWorkflows(
  workflows: readonly BlueprintDeliverableWorkflow[],
  ctx: BlueprintStageContext,
  effects: DeliverableWorkflowEffects,
): Promise<DeliverableWorkflowRunResult> {
  let assembled: BlueprintPrd = ctx.fallbackPrd;
  let usedFallback = false;
  const stages: DeliverableWorkflowStageResult[] = [];

  for (const workflow of orderDeliverableWorkflows(workflows)) {
    if (await effects.isAborted()) {
      stages.push({ key: workflow.key, status: "aborted" });
      break;
    }
    let stageStatus: DeliverableWorkflowStageResult["status"] = "llm";
    let stageError: string | undefined;
    try {
      const prompt = workflow.buildPrompt(assembled, ctx);
      const toolInput = await effects.callLlmTool(prompt, workflow.tool, workflow.maxTokens);
      assembled = workflow.merge(toolInput, assembled);
    } catch (error) {
      stageStatus = "fallback";
      stageError = error instanceof Error ? error.message : String(error);
      usedFallback = true;
      assembled = workflow.applyFallback(assembled, ctx);
      await effects.log(`Blueprint staged workflow '${workflow.key}' fell back`, {
        workflow: workflow.key,
        error: stageError,
      });
    }
    const { aborted } = await effects.commit(assembled, workflow.writeSlotKeys);
    if (aborted) {
      stages.push({ key: workflow.key, status: "aborted" });
      break;
    }
    stages.push({ key: workflow.key, status: stageStatus, error: stageError });
  }

  return { prd: assembled, usedFallback, stages };
}

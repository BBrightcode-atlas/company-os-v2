import type { BlueprintPrd, ProjectDocumentSlotKey } from "../contract.js";
import type { BlueprintDeliverableWorkflow, BlueprintStageContext } from "./types.js";

// 워크플로우를 dependsOn 기준 topological 순서로 정렬(선행 deliverable이 먼저).
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

// worker가 주입하는 부수효과(LLM/JSON추출/commit·slot기록/로그/중단확인).
// 러너 자체는 순수 — host/worker 내부에 의존하지 않아 단독 테스트 가능.
export type DeliverableWorkflowEffects = {
  callLlm: (prompt: string, maxTokens: number) => Promise<string>;
  extractJson: (text: string) => unknown;
  // assembled를 state에 commit하고 writeSlotKeys만 slot으로 기록. job이 교체됐으면 aborted=true.
  commit: (assembled: BlueprintPrd, writeSlotKeys: readonly ProjectDocumentSlotKey[]) => Promise<{ aborted: boolean }>;
  log: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
  // LLM 호출 전 중단 여부(상위 job이 교체/취소됐는지).
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

// 각 워크플로우를 격리 실행: 프롬프트 → LLM → merge → commit(자기 slot만).
// 한 워크플로우 LLM 실패(타임아웃/parse/네트워크)는 그 워크플로우 fallback만 적용하고 계속.
// → 절대 무한 hang 없음(각 LLM 호출은 callLlm의 타임아웃으로 상한).
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
      const text = await effects.callLlm(prompt, workflow.maxTokens);
      assembled = workflow.merge(effects.extractJson(text), assembled);
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

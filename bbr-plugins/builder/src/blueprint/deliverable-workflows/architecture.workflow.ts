import { ARCHITECTURE_STAGE_TOOL, buildArchitectureStagePrompt, normalizePrdJson } from "../contract.js";
import type { BlueprintDeliverableWorkflow } from "./types.js";

export const architectureWorkflow: BlueprintDeliverableWorkflow = {
  key: "architecture",
  label: "아키텍처 정의서",
  dependsOn: ["drb"],
  writeSlotKeys: ["deliverable.architecture"],
  maxTokens: 6000,
  tool: ARCHITECTURE_STAGE_TOOL,
  buildPrompt: (assembled, ctx) => buildArchitectureStagePrompt({ ...ctx.base, prd: assembled }),
  merge: (rawJson, assembled) => {
    const next = normalizePrdJson(rawJson, assembled);
    return { ...assembled, architecture: next.architecture };
  },
  applyFallback: (assembled, ctx) => ({ ...assembled, architecture: ctx.fallbackPrd.architecture }),
};

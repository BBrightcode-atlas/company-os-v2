import { API_STAGE_TOOL, buildApiStagePrompt, normalizePrdJson } from "../contract.js";
import type { BlueprintDeliverableWorkflow } from "./types.js";

export const apiWorkflow: BlueprintDeliverableWorkflow = {
  key: "api",
  label: "API 정의서",
  dependsOn: ["drb", "schema"],
  writeSlotKeys: ["deliverable.api_definition"],
  maxTokens: 6000,
  tool: API_STAGE_TOOL,
  buildPrompt: (assembled, ctx) => buildApiStagePrompt({ ...ctx.base, prd: assembled }),
  merge: (rawJson, assembled) => {
    const next = normalizePrdJson(rawJson, assembled);
    return { ...assembled, apis: next.apis };
  },
  applyFallback: (assembled, ctx) => ({ ...assembled, apis: ctx.fallbackPrd.apis }),
};

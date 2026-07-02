import { DRB_STAGE_TOOL, buildDrbStagePrompt, normalizeDrbJson } from "../contract.js";
import type { BlueprintDeliverableWorkflow } from "./types.js";

export const drbWorkflow: BlueprintDeliverableWorkflow = {
  key: "drb",
  label: "개발 요구사항 브리프",
  dependsOn: [],
  writeSlotKeys: ["deliverable.prd", "deliverable.feature_files"],
  maxTokens: 8000,
  tool: DRB_STAGE_TOOL,
  buildPrompt: (_assembled, ctx) => buildDrbStagePrompt(ctx.base),
  merge: (rawJson, assembled) => {
    const next = normalizeDrbJson(rawJson, assembled);
    return {
      ...assembled,
      projectTitle: next.projectTitle,
      overview: next.overview,
      goals: next.goals,
      scope: next.scope,
      functionalRequirements: next.functionalRequirements,
      nonFunctionalRequirements: next.nonFunctionalRequirements,
      risks: next.risks,
      assumptions: next.assumptions,
    };
  },
  applyFallback: (assembled, ctx) => ({
    ...assembled,
    projectTitle: ctx.fallbackDrb.projectTitle,
    overview: ctx.fallbackDrb.overview,
    goals: ctx.fallbackDrb.goals,
    scope: ctx.fallbackDrb.scope,
    functionalRequirements: ctx.fallbackDrb.functionalRequirements,
    nonFunctionalRequirements: ctx.fallbackDrb.nonFunctionalRequirements,
    risks: ctx.fallbackDrb.risks,
    assumptions: ctx.fallbackDrb.assumptions,
  }),
};

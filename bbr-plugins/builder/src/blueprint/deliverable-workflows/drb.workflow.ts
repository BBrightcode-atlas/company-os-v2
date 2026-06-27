import { buildDrbStagePrompt, normalizePrdJson } from "../contract.js";
import type { BlueprintDeliverableWorkflow } from "./types.js";

// ① 개발 요구사항 브리프(DRB) + 기능정의서.
// overview/goals/scope/functionalRequirements/NFR/risks/assumptions를 생성하고
// deliverable.prd + deliverable.feature_files 두 slot을 채운다(기능정의서는 FR에서 렌더).
export const drbWorkflow: BlueprintDeliverableWorkflow = {
  key: "drb",
  label: "개발 요구사항 브리프",
  dependsOn: [],
  writeSlotKeys: ["deliverable.prd", "deliverable.feature_files"],
  maxTokens: 8000,
  buildPrompt: (_assembled, ctx) => buildDrbStagePrompt(ctx.base),
  merge: (rawJson, assembled) => {
    const next = normalizePrdJson(rawJson, assembled);
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
    projectTitle: ctx.fallbackPrd.projectTitle,
    overview: ctx.fallbackPrd.overview,
    goals: ctx.fallbackPrd.goals,
    scope: ctx.fallbackPrd.scope,
    functionalRequirements: ctx.fallbackPrd.functionalRequirements,
    nonFunctionalRequirements: ctx.fallbackPrd.nonFunctionalRequirements,
    risks: ctx.fallbackPrd.risks,
    assumptions: ctx.fallbackPrd.assumptions,
  }),
};

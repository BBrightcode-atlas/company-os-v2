import { buildArchitectureStagePrompt, normalizePrdJson } from "../contract.js";
import type { BlueprintDeliverableWorkflow } from "./types.js";

// ④ 아키텍처 정의서. 확정된 기능/스키마/API를 입력으로 architecture만 생성.
export const architectureWorkflow: BlueprintDeliverableWorkflow = {
  key: "architecture",
  label: "아키텍처 정의서",
  dependsOn: ["drb"],
  writeSlotKeys: ["deliverable.architecture"],
  maxTokens: 6000,
  buildPrompt: (assembled, ctx) => buildArchitectureStagePrompt({ ...ctx.base, prd: assembled }),
  merge: (rawJson, assembled) => {
    const next = normalizePrdJson(rawJson, assembled);
    return { ...assembled, architecture: next.architecture };
  },
  applyFallback: (assembled, ctx) => ({ ...assembled, architecture: ctx.fallbackPrd.architecture }),
};

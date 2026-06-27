import { buildApiStagePrompt, normalizePrdJson } from "../contract.js";
import type { BlueprintDeliverableWorkflow } from "./types.js";

// ③ API 정의서. 확정된 기능정의서 + 스키마 정의서를 입력으로 apis[]만 생성.
export const apiWorkflow: BlueprintDeliverableWorkflow = {
  key: "api",
  label: "API 정의서",
  dependsOn: ["drb", "schema"],
  writeSlotKeys: ["deliverable.api_definition"],
  maxTokens: 6000,
  buildPrompt: (assembled, ctx) => buildApiStagePrompt({ ...ctx.base, prd: assembled }),
  merge: (rawJson, assembled) => {
    const next = normalizePrdJson(rawJson, assembled);
    return { ...assembled, apis: next.apis };
  },
  applyFallback: (assembled, ctx) => ({ ...assembled, apis: ctx.fallbackPrd.apis }),
};

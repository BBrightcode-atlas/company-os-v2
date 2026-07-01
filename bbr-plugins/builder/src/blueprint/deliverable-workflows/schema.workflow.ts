import { buildSchemaStagePrompt, normalizePrdJson } from "../contract.js";
import type { BlueprintDeliverableWorkflow } from "./types.js";

// ② 스키마 정의서. 확정된 기능정의서(FR)를 입력으로 schemas[]만 생성.
export const schemaWorkflow: BlueprintDeliverableWorkflow = {
  key: "schema",
  label: "스키마 정의서",
  dependsOn: ["drb"],
  writeSlotKeys: ["deliverable.schema_definition"],
  maxTokens: 6000,
  buildPrompt: (assembled, ctx) => buildSchemaStagePrompt({ ...ctx.base, prd: assembled }),
  merge: (rawJson, assembled) => {
    const next = normalizePrdJson(rawJson, assembled);
    return { ...assembled, schemas: next.schemas };
  },
  applyFallback: (assembled, ctx) => ({ ...assembled, schemas: ctx.fallbackPrd.schemas }),
};

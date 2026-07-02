import { SCHEMA_STAGE_TOOL, buildSchemaStagePrompt, normalizeDrbJson } from "../contract.js";
import type { BlueprintDeliverableWorkflow } from "./types.js";

export const schemaWorkflow: BlueprintDeliverableWorkflow = {
  key: "schema",
  label: "스키마 정의서",
  dependsOn: ["drb"],
  writeSlotKeys: ["deliverable.schema_definition"],
  maxTokens: 6000,
  tool: SCHEMA_STAGE_TOOL,
  buildPrompt: (assembled, ctx) => buildSchemaStagePrompt({ ...ctx.base, prd: assembled }),
  merge: (rawJson, assembled) => {
    const next = normalizeDrbJson(rawJson, assembled);
    return { ...assembled, schemas: next.schemas };
  },
  applyFallback: (assembled, ctx) => ({ ...assembled, schemas: ctx.fallbackDrb.schemas }),
};

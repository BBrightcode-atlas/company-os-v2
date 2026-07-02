import type {
  BlueprintLlmTool,
  BlueprintDrb,
  BlueprintStagePromptBase,
  ProjectDocumentSlotKey,
} from "../contract.js";

export type BlueprintStageContext = {
  base: BlueprintStagePromptBase;
  fallbackDrb: BlueprintDrb;
};

export type BlueprintDeliverableWorkflow = {
  key: string;
  label: string;
  dependsOn: string[];
  writeSlotKeys: ProjectDocumentSlotKey[];
  maxTokens: number;
  tool: BlueprintLlmTool;
  buildPrompt: (assembled: BlueprintDrb, ctx: BlueprintStageContext) => string;
  merge: (rawJson: unknown, assembled: BlueprintDrb) => BlueprintDrb;
  applyFallback: (assembled: BlueprintDrb, ctx: BlueprintStageContext) => BlueprintDrb;
};

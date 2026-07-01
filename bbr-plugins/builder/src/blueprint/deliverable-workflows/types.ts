import type {
  BlueprintLlmTool,
  BlueprintPrd,
  BlueprintStagePromptBase,
  ProjectDocumentSlotKey,
} from "../contract.js";

export type BlueprintStageContext = {
  base: BlueprintStagePromptBase;
  fallbackPrd: BlueprintPrd;
};

export type BlueprintDeliverableWorkflow = {
  key: string;
  label: string;
  dependsOn: string[];
  writeSlotKeys: ProjectDocumentSlotKey[];
  maxTokens: number;
  tool: BlueprintLlmTool;
  buildPrompt: (assembled: BlueprintPrd, ctx: BlueprintStageContext) => string;
  merge: (rawJson: unknown, assembled: BlueprintPrd) => BlueprintPrd;
  applyFallback: (assembled: BlueprintPrd, ctx: BlueprintStageContext) => BlueprintPrd;
};

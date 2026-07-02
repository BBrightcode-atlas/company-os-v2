export type {
  BlueprintDeliverableWorkflow,
  BlueprintStageContext,
} from "./types.js";
export {
  orderDeliverableWorkflows,
  runDeliverableWorkflows,
  type DeliverableWorkflowEffects,
  type DeliverableWorkflowRunResult,
  type DeliverableWorkflowStageResult,
} from "./runner.js";
export { drbWorkflow } from "./drb.workflow.js";
export { schemaWorkflow } from "./schema.workflow.js";
export { apiWorkflow } from "./api.workflow.js";
export { architectureWorkflow } from "./architecture.workflow.js";

import { drbWorkflow } from "./drb.workflow.js";
import { schemaWorkflow } from "./schema.workflow.js";
import { apiWorkflow } from "./api.workflow.js";
import { architectureWorkflow } from "./architecture.workflow.js";
import type { BlueprintDeliverableWorkflow } from "./types.js";

export const DRB_STAGE_WORKFLOWS: readonly BlueprintDeliverableWorkflow[] = [
  drbWorkflow,
  schemaWorkflow,
  apiWorkflow,
  architectureWorkflow,
];

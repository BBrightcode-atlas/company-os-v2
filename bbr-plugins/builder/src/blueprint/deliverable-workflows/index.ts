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

// DRB 단계(개발 요구사항 브리프~아키텍처)의 격리 워크플로우 집합.
// 화면정의서/와이어프레임/빌드플랜은 별도 기존 흐름이 담당한다.
export const PRD_STAGE_WORKFLOWS: readonly BlueprintDeliverableWorkflow[] = [
  drbWorkflow,
  schemaWorkflow,
  apiWorkflow,
  architectureWorkflow,
];

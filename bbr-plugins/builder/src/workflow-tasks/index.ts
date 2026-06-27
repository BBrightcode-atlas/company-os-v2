// 순수(ctx 무의존) task 생성 엔진의 안정 import 표면.
//
// Phase 1: 정의는 아직 project-builder/contract.ts에 있고 여기서 re-export만 한다.
// Blueprint는 이 모듈에서만 import해 project-builder 내부 경로에 의존하지 않는다.
// Phase 6(Product Builder 폐기)에서 실제 정의를 이 디렉터리로 물리 이동하고
// project-builder 쪽을 삭제한다 — 그때 Blueprint import 경로는 불변.
//
// 여기 노출하는 심볼은 전부 LLM/ctx 의존이 없는 결정론적 엔진이다:
// feature×5단계(BE→BE QA→FE→FE QA→전체QA) + 통합 QA + Release DAG 생성과
// 그 마크다운 렌더러, 이슈 description 빌더, 고정 stage 정의/agent 키.

export {
  buildWorkflowTasks,
  resolveBuildFeatures,
  workflowAgentKeyForTask,
  workflowIssueTitle,
  issueStatusForDecision,
  isImplementationDecision,
  sharedTaskKey,
  featureStageTaskKey,
  workflowKeyPart,
  renderBuildPlanMarkdown,
  renderTaskListMarkdown,
  buildWorkflowRootDescription,
  buildFeatureParentDescription,
  buildWorkflowIssueDescription,
  FEATURE_WORKFLOW_STAGES,
  STAGE_BY_SLUG,
  INTEGRATION_QA_TASK_KEY,
  RELEASE_TASK_KEY,
  BUILDER_AGENT_KEY,
  BUILDER_BACKEND_AGENT_KEY,
  BUILDER_FRONTEND_AGENT_KEY,
  BUILDER_PLATFORM_AGENT_KEY,
  BUILDER_AI_AGENT_KEY,
  BUILDER_QA_AGENT_KEY,
  PRODUCT_BUILDER_BUILD_PLAN_SLOT_KEY,
  PRODUCT_BUILDER_TASK_LIST_SLOT_KEY,
} from "../project-builder/contract.js";

export type {
  BuildPlan,
  BuildFeatureInput,
  SharedWorkItemInput,
  StagePlanInput,
  ProductBuilderTask,
  TaskDecision,
  WorkflowRole,
  WorkflowStageSlug,
  WorkflowStageDef,
  ProductBuilderDocumentRenderInput,
  CreatedIssueSummary,
} from "../project-builder/contract.js";

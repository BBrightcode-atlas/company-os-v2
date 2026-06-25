export type BlueprintDeliverableWorkflowDefinition = {
  slotKey: string;
  label: string;
  owner: string;
  phase: "source" | "product" | "contract" | "screen" | "wireframe" | "build";
  description: string;
};

export const BLUEPRINT_DELIVERABLE_WORKFLOW_DEFINITIONS: readonly BlueprintDeliverableWorkflowDefinition[] = [
  {
    slotKey: "deliverable.prd",
    label: "PRD 기준선 workflow",
    owner: "PM Agent",
    phase: "product",
    description: "등록 자료와 내부 coverage index를 기준으로 제품 요구사항과 범위를 확정한다.",
  },
  {
    slotKey: "deliverable.feature_files",
    label: "기능정의서 workflow",
    owner: "Contract Agent",
    phase: "contract",
    description: "기능 목록 페이지, 기능별 상세 문서, project-builder-base 재사용 판정을 하나의 산출물로 정리한다.",
  },
  {
    slotKey: "deliverable.schema_definition",
    label: "데이터 계약 workflow",
    owner: "Contract Agent",
    phase: "contract",
    description: "데이터 객체, 필드, 관계, 검증 규칙을 계약화한다.",
  },
  {
    slotKey: "deliverable.api_definition",
    label: "API 계약 workflow",
    owner: "Contract Agent",
    phase: "contract",
    description: "REST endpoint와 request/response/error 계약을 정리한다.",
  },
  {
    slotKey: "deliverable.architecture",
    label: "아키텍처 workflow",
    owner: "Contract Agent",
    phase: "contract",
    description: "기술 경계, 배포, 외부 연동, 리스크를 구조화한다.",
  },
  {
    slotKey: "deliverable.screen_definitions",
    label: "화면정의 workflow",
    owner: "Screen Agent",
    phase: "screen",
    description: "PRD 확정 뒤 화면 단위 계약과 QA 기준을 작성한다.",
  },
  {
    slotKey: "deliverable.wireframe_html",
    label: "와이어프레임 workflow",
    owner: "Wireframe Agent",
    phase: "wireframe",
    description: "화면정의서를 검수 가능한 HTML 와이어프레임으로 변환한다.",
  },
  {
    slotKey: "deliverable.build_plan",
    label: "BuildPlan workflow",
    owner: "Product Builder",
    phase: "build",
    description: "기획/화면/와이어프레임을 구현 계획으로 변환한다.",
  },
  {
    slotKey: "deliverable.task_list",
    label: "Task 목록 workflow",
    owner: "Product Builder",
    phase: "build",
    description: "BuildPlan을 사람이 검토 가능한 전체 작업표로 전개한다.",
  },
] as const;

const DELIVERABLE_WORKFLOW_BY_SLOT = new Map(
  BLUEPRINT_DELIVERABLE_WORKFLOW_DEFINITIONS.map((workflow) => [workflow.slotKey, workflow]),
);

export function blueprintDeliverableWorkflowDefinition(slotKey: string): BlueprintDeliverableWorkflowDefinition | null {
  return DELIVERABLE_WORKFLOW_BY_SLOT.get(slotKey) ?? null;
}

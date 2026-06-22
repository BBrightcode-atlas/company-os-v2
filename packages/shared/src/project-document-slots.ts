export const PROJECT_DOCUMENT_SLOT_GROUPS = ["source", "deliverable", "support"] as const;
export type ProjectDocumentSlotGroup = (typeof PROJECT_DOCUMENT_SLOT_GROUPS)[number];

export const PROJECT_DOCUMENT_SLOT_STATUSES = ["empty", "draft", "ready", "approved", "n/a"] as const;
export type ProjectDocumentSlotStatus = (typeof PROJECT_DOCUMENT_SLOT_STATUSES)[number];

export type ProjectDocumentSlotProducer = "Blueprint" | "Wireframe" | "Project Builder";

export const PROJECT_DOCUMENT_SLOT_PRODUCER_PLUGIN_KEYS = {
  Blueprint: ["paperclip-plugin-cos-blueprint"],
  Wireframe: ["paperclip-plugin-wireframe-builder"],
  "Project Builder": ["paperclip-plugin-product-builder"],
} as const satisfies Record<ProjectDocumentSlotProducer, readonly string[]>;

export interface ProjectDocumentSlotDefinition {
  slotKey: string;
  slotGroup: ProjectDocumentSlotGroup;
  title: string;
  required: boolean;
  contentType: string | null;
  templatePath?: string | null;
  collection?: boolean;
  producer?: ProjectDocumentSlotProducer | null;
}

export const DEFAULT_PROJECT_DOCUMENT_SLOT_DEFINITIONS = [
  {
    slotKey: "source.customer_originals",
    slotGroup: "source",
    title: "고객 원본(Customer Originals)",
    required: false,
    contentType: "text/markdown",
    collection: true,
    producer: "Blueprint",
  },
  {
    slotKey: "source.internal_notes",
    slotGroup: "source",
    title: "내부 정리본(Internal Notes)",
    required: false,
    contentType: "text/markdown",
    collection: true,
    producer: "Blueprint",
  },
  {
    slotKey: "source.references",
    slotGroup: "source",
    title: "참고 자료(References)",
    required: false,
    contentType: "text/markdown",
    collection: true,
    producer: "Blueprint",
  },
  {
    slotKey: "support.pm_execution_procedure",
    slotGroup: "support",
    title: "PM 업무 실행 절차(PM Execution Procedure)",
    required: true,
    contentType: "text/markdown",
    templatePath: "bbr-plugins/cos-blueprint/templates/standards/pm-execution-procedure.md",
    producer: "Blueprint",
  },
  {
    slotKey: "support.screen_definition_writing_rules",
    slotGroup: "support",
    title: "화면정의서 작성 룰(Screen Definition Writing Rules)",
    required: true,
    contentType: "text/markdown",
    templatePath: "bbr-plugins/cos-blueprint/templates/standards/screen-definition-writing-rules.md",
    producer: "Blueprint",
  },
  {
    slotKey: "deliverable.standard_plan",
    slotGroup: "deliverable",
    title: "표준 기획서(Standard Plan)",
    required: true,
    contentType: "text/markdown",
    templatePath: "bbr-plugins/cos-blueprint/templates/deliverables/standard-plan.md",
    producer: "Blueprint",
  },
  {
    slotKey: "deliverable.prd",
    slotGroup: "deliverable",
    title: "PRD(Product Requirements Document)",
    required: true,
    contentType: "text/markdown",
    templatePath: "bbr-plugins/cos-blueprint/templates/deliverables/prd.md",
    producer: "Blueprint",
  },
  {
    slotKey: "deliverable.feature_index",
    slotGroup: "deliverable",
    title: "기능 정의서 목록(Feature Definition Index)",
    required: true,
    contentType: "text/markdown",
    templatePath: "bbr-plugins/cos-blueprint/templates/deliverables/feature-definition-index.md",
    producer: "Blueprint",
  },
  {
    slotKey: "deliverable.feature_files",
    slotGroup: "deliverable",
    title: "기능별 기능 정의서(Feature Definitions)",
    required: true,
    contentType: "text/markdown",
    templatePath: "bbr-plugins/cos-blueprint/templates/deliverables/feature-definition.md",
    collection: true,
    producer: "Blueprint",
  },
  {
    slotKey: "deliverable.schema_definition",
    slotGroup: "deliverable",
    title: "스키마 정의서(Schema Definition)",
    required: true,
    contentType: "text/markdown",
    templatePath: "bbr-plugins/cos-blueprint/templates/deliverables/schema-definition.md",
    producer: "Blueprint",
  },
  {
    slotKey: "deliverable.api_definition",
    slotGroup: "deliverable",
    title: "API 정의서(API Definition)",
    required: true,
    contentType: "text/markdown",
    templatePath: "bbr-plugins/cos-blueprint/templates/deliverables/api-definition.md",
    producer: "Blueprint",
  },
  {
    slotKey: "deliverable.interface_definition",
    slotGroup: "deliverable",
    title: "인터페이스 정의서(Interface Definition)",
    required: true,
    contentType: "text/markdown",
    templatePath: "bbr-plugins/cos-blueprint/templates/deliverables/interface-definition.md",
    producer: "Blueprint",
  },
  {
    slotKey: "deliverable.layout_definition",
    slotGroup: "deliverable",
    title: "공통 레이아웃 정의서(Common Layout Definition)",
    required: true,
    contentType: "text/markdown",
    templatePath: "bbr-plugins/cos-blueprint/templates/deliverables/layout-definition.md",
    producer: "Blueprint",
  },
  {
    slotKey: "deliverable.screen_definitions",
    slotGroup: "deliverable",
    title: "화면정의서(Screen Definitions)",
    required: true,
    contentType: "text/markdown",
    templatePath: "bbr-plugins/cos-blueprint/templates/deliverables/screen-definition.md",
    collection: true,
    producer: "Blueprint",
  },
  {
    slotKey: "deliverable.wireframe_html",
    slotGroup: "deliverable",
    title: "HTML 와이어프레임(HTML Wireframe)",
    required: true,
    contentType: "text/html",
    templatePath: "bbr-plugins/wireframe-builder/templates/wireframe-html-prompt.md",
    producer: "Wireframe",
  },
  {
    slotKey: "deliverable.build_plan",
    slotGroup: "deliverable",
    title: "BuildPlan",
    required: true,
    contentType: "text/markdown",
    templatePath: "bbr-plugins/product-builder/templates/build-plan.md",
    producer: "Project Builder",
  },
  {
    slotKey: "deliverable.task_list",
    slotGroup: "deliverable",
    title: "전체 Task 목록(Full Task List)",
    required: true,
    contentType: "text/markdown",
    templatePath: "bbr-plugins/product-builder/templates/task-list.md",
    producer: "Project Builder",
  },
  {
    slotKey: "deliverable.issue_graph",
    slotGroup: "deliverable",
    title: "Paperclip 이슈 그래프(Issue Graph)",
    required: true,
    contentType: null,
    producer: "Project Builder",
  },
] as const satisfies readonly ProjectDocumentSlotDefinition[];

export const DEFAULT_PROJECT_DOCUMENT_SLOT_KEYS: readonly string[] = DEFAULT_PROJECT_DOCUMENT_SLOT_DEFINITIONS
  .map((definition) => definition.slotKey);

const DEFAULT_SLOT_BY_KEY: ReadonlyMap<string, ProjectDocumentSlotDefinition> = new Map(
  DEFAULT_PROJECT_DOCUMENT_SLOT_DEFINITIONS.map((definition) => [definition.slotKey, definition]),
);

export function getDefaultProjectDocumentSlotDefinition(slotKey: string): ProjectDocumentSlotDefinition | null {
  return DEFAULT_SLOT_BY_KEY.get(slotKey) ?? null;
}

export function canPluginProduceProjectDocumentSlot(slotKey: string, pluginKey: string): boolean {
  const definition = getDefaultProjectDocumentSlotDefinition(slotKey);
  if (!definition?.producer) return false;
  const producerPluginKeys: readonly string[] = PROJECT_DOCUMENT_SLOT_PRODUCER_PLUGIN_KEYS[definition.producer];
  return producerPluginKeys.includes(pluginKey);
}

export function projectDocumentSlotSortIndex(slotKey: string): number {
  const index = DEFAULT_PROJECT_DOCUMENT_SLOT_KEYS.indexOf(slotKey);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

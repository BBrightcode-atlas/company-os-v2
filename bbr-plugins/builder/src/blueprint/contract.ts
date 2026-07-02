import { blueprintDeliverableWorkflowDefinition } from "./deliverable-workflows/registry.js";

export const PLUGIN_ID = "paperclip-plugin-builder";
export const PLUGIN_VERSION = "0.1.0";
export const PAGE_ROUTE = "cos-blueprint";
export const STATE_KEY = "cos-blueprint-state";
export const ALLOWED_COMPANY_PREFIX = "BBR";
export const ALLOWED_COMPANY_ID = "96fcd977-1d55-4697-a464-abb656dd57c2";
export const BLUEPRINT_PM_AGENT_KEY = "blueprint-pm";
export const BLUEPRINT_CONTRACT_AGENT_KEY = "blueprint-contract";
export const BLUEPRINT_SCREEN_AGENT_KEY = "blueprint-screen";
export const BLUEPRINT_AGENT_KEYS = [
  BLUEPRINT_PM_AGENT_KEY,
  BLUEPRINT_CONTRACT_AGENT_KEY,
  BLUEPRINT_SCREEN_AGENT_KEY,
] as const;

export const BLUEPRINT_PM_SKILL_KEY = "blueprint-pm-execution";
export const BLUEPRINT_CONTRACT_SKILL_KEY = "blueprint-contract-definition";
export const BLUEPRINT_SCREEN_SKILL_KEY = "blueprint-screen-definition";
export const BLUEPRINT_SKILL_KEYS = [
  BLUEPRINT_PM_SKILL_KEY,
  BLUEPRINT_CONTRACT_SKILL_KEY,
  BLUEPRINT_SCREEN_SKILL_KEY,
] as const;

export const BLUEPRINT_PRD_ROUTINE_KEY = "blueprint-prd";
export const BLUEPRINT_CONTRACT_ROUTINE_KEY = "blueprint-contract-definition";
export const BLUEPRINT_SCREEN_ROUTINE_KEY = "blueprint-screen-definition";
export const BLUEPRINT_ROUTINE_KEYS = [
  BLUEPRINT_PRD_ROUTINE_KEY,
  BLUEPRINT_CONTRACT_ROUTINE_KEY,
  BLUEPRINT_SCREEN_ROUTINE_KEY,
] as const;


export const BLUEPRINT_PROJECT_KEY = "blueprint";

export const isAllowedCompany = (
  companyId?: string | null,
  companyPrefix?: string | null,
): boolean =>
  companyId === ALLOWED_COMPANY_ID ||
  (companyPrefix ?? "").toUpperCase() === ALLOWED_COMPANY_PREFIX;

export const DATA = {
  overview: "blueprint.overview",
  projects: "blueprint.projects",
  projectDocumentSlots: "blueprint.project-document-slots",
  managedAgent: "blueprint.managed-agent",
  managedResources: "blueprint.managed-resources",
} as const;

export const ACTION = {
  saveSource: "save-source",
  registerSourceDocument: "register-source-document",
  reanalyzeSourceDocument: "reanalyze-source-document",
  deleteSourceDocument: "delete-source-document",
  probeFigmaSource: "probe-figma-source",
  // Figma 등록(외부 viewer 파일): REST export 차단을 우회하는 MCP read-path 추출 + OAuth
  registerFigmaSource: "register-figma-source",
  startFigmaAuth: "start-figma-auth",
  completeFigmaAuth: "complete-figma-auth",
  setProductBuilderBlueprint: "set-product-builder-blueprint",
  setProductBuilderBasePackages: "set-product-builder-base-packages",
  setAgentGuidelines: "set-agent-guidelines",
  // 분석 단계 ①: 개발 요구사항 브리프/계약 산출물
  runPrd: "run-prd",
  confirmPrd: "confirm-prd",
  writePrdDocs: "write-prd-docs",
  // 분석 단계 ②: 화면정의서 (확정 게이트 통과 후)
  runScreens: "run-screens",
  writeScreenDocs: "write-screen-docs",
  // task: 산출물에서 결정론적으로 task 목록 MD 생성(deliverable.task_list)
  generateTaskList: "generate-task-list",
  // task: 산출물에서 현재 프로젝트에 실제 이슈 등록(feature×5단계 + 통합 QA + Release)
  instantiateWorkflow: "instantiate-workflow",
  // 화면정의서 기준선 확정(전체 화면 승인 → slot approved → 와이어프레임 게이트 통과)
  confirmScreenPlan: "confirm-screen-plan",
  // 화면정의서 리뷰
  reviewScreen: "review-screen",
  regenerateScreen: "regenerate-screen",
  // 플러그인 전용 PM 에이전트(Managed Agent)
  reconcileManagedAgent: "reconcile-managed-agent",
  resetManagedAgent: "reset-managed-agent",
  reconcileManagedResources: "reconcile-managed-resources",
  resetManagedResources: "reset-managed-resources",
  runManagedRoutine: "run-managed-routine",
  chatWithPmAgent: "chat-with-pm-agent",
  saveProjectDocumentSlot: "save-project-document-slot",
  updateProjectDocumentSlotStatus: "update-project-document-slot-status",
  // 보관한 원본 바이너리 다운로드(파일 → base64)
  readSourceOriginal: "read-source-original",
  reset: "reset",
  purgeProject: "purge-project",
  purgeProjectDeliverables: "purge-project-deliverables",
} as const;

export const SUBMIT_BLUEPRINT_PRD_TOOL = {
  name: "submit-blueprint-prd",
  displayName: "Blueprint: 개발 요구사항 브리프 제출",
  description:
    "Blueprint PM Agent가 등록 자료를 끝까지 읽고 작성한 개발 요구사항 브리프와 후속 계약 초안을 제출한다. 브리프를 댓글로만 남기지 말고 이 도구를 호출해 Project document slot에 저장하라.",
  parametersSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "개발 요구사항 브리프를 저장할 Paperclip project id.",
      },
      requirementInventory: {
        type: "object",
        description: "선택. PM Agent가 만든 source-backed coverage index. 없으면 등록 source로 내부 추적용 inventory를 보강한다.",
      },
      prd: {
        type: "object",
        description: "필수. 개발 요구사항 브리프 payload. overview, goals, scope, functionalRequirements, nonFunctionalRequirements, schemas, apis, architecture, risks, assumptions를 포함한다.",
        properties: {
          projectTitle: { type: "string" },
          overview: { type: "string" },
          goals: { type: "array", items: { type: "string" } },
          scope: {
            type: "object",
            properties: {
              inScope: { type: "array", items: { type: "string" } },
              outOfScope: { type: "array", items: { type: "string" } },
            },
            required: ["inScope", "outOfScope"],
          },
          functionalRequirements: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                priority: { type: "string", enum: ["must", "should", "could"] },
                sourceInventoryItemIds: { type: "array", items: { type: "string" } },
              },
              required: ["title", "description"],
            },
          },
          nonFunctionalRequirements: { type: "array", items: { type: "string" } },
          schemas: { type: "array", items: { type: "object" } },
          apis: { type: "array", items: { type: "object" } },
          layouts: { type: "array", items: { type: "object" } },
          architecture: { type: "object" },
          risks: { type: "array", items: { type: "object" } },
          assumptions: { type: "array", items: { type: "string" } },
        },
        required: ["projectTitle", "overview", "goals", "scope", "functionalRequirements"],
      },
    },
    required: ["projectId", "prd"],
  },
} as const;

export const SOURCE_TYPES = ["internal-plan", "external-plan", "meeting-note", "reference", "other"] as const;

export type SourceType = typeof SOURCE_TYPES[number];

// 업로드 파일에서 추출한 원본 포맷. text = 직접 입력, url = URL 기반 입력.
export const SOURCE_FORMATS = ["text", "url", "figma", "notion", "txt", "md", "docx", "pptx", "pdf", "xlsx"] as const;
export type SourceFormat = typeof SOURCE_FORMATS[number];

export const PRODUCT_BUILDER_BLUEPRINT_OPTIONS = [
  {
    id: "online-service-standard",
    label: "웹서비스(Web Service)",
    productBuilderLabel: "온라인 서비스(Online Service)",
    description: "SEO/AEO/GEO가 필요한 공개 웹사이트, 관리자, REST API, 서비스 백엔드 중심 프로젝트.",
  },
  {
    id: "web-application-service-standard",
    label: "웹 어플리케이션(Web Application)",
    productBuilderLabel: "웹 어플리케이션 서비스(Web Application Service)",
    description: "로그인 후 반복 작업 중심의 SPA, REST API 서버, 관리자, AI 서버 중심 프로젝트.",
  },
] as const;
export type ProductBuilderBlueprintId = typeof PRODUCT_BUILDER_BLUEPRINT_OPTIONS[number]["id"];
export const DEFAULT_PRODUCT_BUILDER_BLUEPRINT_ID: ProductBuilderBlueprintId = "online-service-standard";

export function normalizeProductBuilderBlueprintId(value: unknown): ProductBuilderBlueprintId {
  return PRODUCT_BUILDER_BLUEPRINT_OPTIONS.some((option) => option.id === value)
    ? value as ProductBuilderBlueprintId
    : DEFAULT_PRODUCT_BUILDER_BLUEPRINT_ID;
}

export function productBuilderBlueprintOption(id: ProductBuilderBlueprintId) {
  return PRODUCT_BUILDER_BLUEPRINT_OPTIONS.find((option) => option.id === id) ?? PRODUCT_BUILDER_BLUEPRINT_OPTIONS[0];
}

export const PRODUCT_BUILDER_BASE_PACKAGE_OPTIONS = [
  {
    key: "server",
    label: "server",
    basePath: "apps/server",
    title: "서버(server)",
    description: "API, 인증, 데이터 처리, 외부 연동을 담당하는 필수 서버 구성.",
    required: true,
  },
  {
    key: "admin",
    label: "admin",
    basePath: "apps/admin",
    title: "관리자 사이트(admin)",
    description: "server API를 호출하는 관리자용 웹 사이트/백오피스. 운영 콘솔, 권한/검수/관리 화면이 필요할 때 선택.",
    required: false,
  },
  {
    key: "site",
    label: "site",
    basePath: "apps/site",
    title: "웹서비스(site)",
    description: "Next.js 기반 공개 웹서비스. 웹사이트에서 바로 SEO가 되고 서비스 구동이 가능해야 할 때 선택.",
    required: false,
  },
  {
    key: "ai-runtime",
    label: "ai-runtime",
    basePath: "apps/ai-runtime",
    title: "AI 런타임(ai-runtime)",
    description: "AI 실행, 스트리밍, agent/runtime orchestration, provider gateway가 필요할 때 선택.",
    required: false,
  },
  {
    key: "app",
    label: "app",
    basePath: "apps/app",
    title: "웹 애플리케이션(app)",
    description: "로그인 후 사용하는 SPA, 대시보드, 반복 업무 화면이 필요할 때 선택.",
    required: false,
  },
  {
    key: "electron",
    label: "electron",
    basePath: "apps/electron",
    title: "데스크톱 패키징(electron)",
    description: "app을 데스크톱 앱으로 패키징해야 할 때 선택.",
    required: false,
  },
  {
    key: "landing",
    label: "landing",
    basePath: "apps/landing",
    title: "랜딩페이지(landing)",
    description: "마케팅, 소개, 가격, 가입 유도 등 전환 목적의 랜딩 페이지가 필요할 때 선택.",
    required: false,
  },
] as const;
export type ProductBuilderBasePackageKey = typeof PRODUCT_BUILDER_BASE_PACKAGE_OPTIONS[number]["key"];
export type ProductBuilderBasePackageSelection = {
  key: ProductBuilderBasePackageKey;
  label: string;
  basePath: string;
  title: string;
  description: string;
  required: boolean;
  selected: boolean;
};
export const DEFAULT_PRODUCT_BUILDER_BASE_PACKAGE_KEYS: readonly ProductBuilderBasePackageKey[] = ["server"];

export function normalizeProductBuilderBasePackageKeys(value: unknown): ProductBuilderBasePackageKey[] {
  const valid = new Set<ProductBuilderBasePackageKey>(PRODUCT_BUILDER_BASE_PACKAGE_OPTIONS.map((option) => option.key));
  const raw = Array.isArray(value) ? value : [];
  const keys = raw.flatMap((item): ProductBuilderBasePackageKey[] => {
    if (typeof item === "string" && valid.has(item as ProductBuilderBasePackageKey)) return [item as ProductBuilderBasePackageKey];
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const key = record.key;
    if (typeof key !== "string" || !valid.has(key as ProductBuilderBasePackageKey)) return [];
    return record.selected === false ? [] : [key as ProductBuilderBasePackageKey];
  });
  return PRODUCT_BUILDER_BASE_PACKAGE_OPTIONS
    .map((option) => option.key)
    .filter((key) => key === "server" || keys.includes(key));
}

export function productBuilderBasePackageSelections(value: unknown): ProductBuilderBasePackageSelection[] {
  const selected = new Set(normalizeProductBuilderBasePackageKeys(value));
  return PRODUCT_BUILDER_BASE_PACKAGE_OPTIONS.map((option) => ({
    key: option.key,
    label: option.label,
    basePath: option.basePath,
    title: option.title,
    description: option.description,
    required: option.required,
    selected: option.required || selected.has(option.key),
  }));
}

export function productBuilderBasePackageMetadata(value: unknown): Record<string, unknown> {
  const selections = productBuilderBasePackageSelections(value);
  return {
    productBuilderBasePackageKeys: selections.filter((item) => item.selected).map((item) => item.key),
    productBuilderBasePackageLabels: selections.filter((item) => item.selected).map((item) => item.label),
    productBuilderBasePackagePaths: selections.filter((item) => item.selected).map((item) => item.basePath),
    productBuilderBaseRequiredPackageKeys: selections.filter((item) => item.required).map((item) => item.key),
  };
}

export type ProductBuilderBlueprintContext = {
  id: ProductBuilderBlueprintId;
  label: string;
  productBuilderLabel: string;
  description: string;
};

export const PRODUCT_BUILDER_SURFACES = ["admin", "site", "app", "landing", "shared", "undecided"] as const;
export type ProductBuilderSurface = typeof PRODUCT_BUILDER_SURFACES[number];

export function productBuilderBlueprintContext(id: ProductBuilderBlueprintId): ProductBuilderBlueprintContext {
  const option = productBuilderBlueprintOption(id);
  return {
    id: option.id,
    label: option.label,
    productBuilderLabel: option.productBuilderLabel,
    description: option.description,
  };
}

export function productBuilderBlueprintMetadata(id: ProductBuilderBlueprintId): Record<string, unknown> {
  const option = productBuilderBlueprintOption(id);
  return {
    productBuilderBlueprintId: option.id,
    productBuilderBlueprintLabel: option.label,
    productBuilderBlueprintProductLabel: option.productBuilderLabel,
    productBuilderBlueprintSelectedIn: "builder.blueprint",
  };
}

// Project document slot metadata에 남기는 논리적 documentRef prefix. workspace write 경로가 아니다.
// 새 ref는 루트 etl/ 아래에서 프로젝트와 처리 단계를 드러낸다.
export const ETL_PROJECT_ROOT_DIR = "etl/projects";
const ETL_PROJECT_FALLBACK_ID = "project-scope";
const LEGACY_BLUEPRINT_DOC_DIR = "docs/cos-blueprint";

export const SOURCE_DOC_DIR = `${ETL_PROJECT_ROOT_DIR}/${ETL_PROJECT_FALLBACK_ID}/extract/sources`;
export const SOURCE_ORIGINAL_DIR = `${ETL_PROJECT_ROOT_DIR}/${ETL_PROJECT_FALLBACK_ID}/extract/originals`;

// 기능 정의서(Feature Definition)는 기능 코드 없이 기능명 기반 slug로 분리한다.
export const FEATURE_DOC_DIR = `${ETL_PROJECT_ROOT_DIR}/${ETL_PROJECT_FALLBACK_ID}/transform/blueprint/features`;
export const FEATURE_DEFINITION_INDEX_DOC = `${ETL_PROJECT_ROOT_DIR}/${ETL_PROJECT_FALLBACK_ID}/transform/blueprint/feature-definition.md`;

// 프로젝트마다 바뀌지 않는 Blueprint 기준 문서도 프로젝트별 ETL transform 단계에 연결한다.
export const BLUEPRINT_STANDARD_DOC_DIR = `${ETL_PROJECT_ROOT_DIR}/${ETL_PROJECT_FALLBACK_ID}/transform/blueprint/standards`;
export const PM_EXECUTION_PROCEDURE_DOC = `${BLUEPRINT_STANDARD_DOC_DIR}/pm-execution-procedure.md`;
export const SCREEN_DEFINITION_WRITING_RULES_DOC = `${BLUEPRINT_STANDARD_DOC_DIR}/screen-definition-writing-rules.md`;

export const PROJECT_DOCUMENT_SLOT_STATUS = ["empty", "draft", "ready", "approved", "n/a"] as const;
export type ProjectDocumentSlotStatus = typeof PROJECT_DOCUMENT_SLOT_STATUS[number];
export type ProjectDocumentSlotGroup = "source" | "deliverable" | "support";

export const PRD_SLOT_KEY = "deliverable.prd";
export const FEATURE_FILES_SLOT_KEY = "deliverable.feature_files";
export const SCHEMA_DEFINITION_SLOT_KEY = "deliverable.schema_definition";
export const API_DEFINITION_SLOT_KEY = "deliverable.api_definition";
export const ARCHITECTURE_SLOT_KEY = "deliverable.architecture";
export const SCREEN_DEFINITIONS_SLOT_KEY = "deliverable.screen_definitions";

export const PROJECT_DOCUMENT_SLOT_KEYS = [
  "source.customer_originals",
  "source.internal_notes",
  "source.references",
  "support.pm_execution_procedure",
  "support.screen_definition_writing_rules",
  PRD_SLOT_KEY,
  FEATURE_FILES_SLOT_KEY,
  SCHEMA_DEFINITION_SLOT_KEY,
  API_DEFINITION_SLOT_KEY,
  ARCHITECTURE_SLOT_KEY,
  SCREEN_DEFINITIONS_SLOT_KEY,
] as const;
export type ProjectDocumentSlotKey = typeof PROJECT_DOCUMENT_SLOT_KEYS[number];

export type ProjectDocumentSlotDefinition = {
  slotKey: ProjectDocumentSlotKey;
  group: ProjectDocumentSlotGroup;
  title: string;
  required: boolean;
  contentType: "text/markdown";
  templatePath?: string;
  collection?: boolean;
  producer: "Blueprint";
};

export type ProjectDocumentSlotUpdate = ProjectDocumentSlotDefinition & {
  status: ProjectDocumentSlotStatus;
  documentRefs: string[];
  updatedAt: string;
};

export type ProjectDocumentSlotViewerDocument = {
  id: string;
  title: string | null;
  format: string;
  body: string;
  latestRevisionNumber: number;
  updatedAt: string | null;
};

export type ProjectDocumentSlotViewerArtifact = {
  artifactId: string;
  contentType: string;
  originalFilename: string | null;
  byteSize: number;
  contentPath: string;
};

export const BLUEPRINT_WORKFLOW_STEP_STATUSES = ["done", "active", "pending", "blocked"] as const;
export type BlueprintWorkflowStepStatus = typeof BLUEPRINT_WORKFLOW_STEP_STATUSES[number];

export type BlueprintWorkflowStep = {
  key: string;
  title: string;
  detail: string;
  status: BlueprintWorkflowStepStatus;
};

export type BlueprintWorkflowPanel = {
  workflowKey: string;
  label: string;
  title: string;
  subtitle: string;
  owner: string;
  steps: BlueprintWorkflowStep[];
  doneCount: number;
  totalCount: number;
};

export type ProjectDocumentSlotViewerRow = {
  slotKey: string;
  slotGroup: ProjectDocumentSlotGroup;
  title: string;
  required: boolean;
  status: ProjectDocumentSlotStatus;
  contentType: string | null;
  documentId: string | null;
  artifactId: string | null;
  updatedAt: string | null;
  metadata: Record<string, unknown> | null;
  document: ProjectDocumentSlotViewerDocument | null;
  artifact: ProjectDocumentSlotViewerArtifact | null;
  workflow?: BlueprintWorkflowPanel | null;
};

export type ProjectDocumentSlotsView = {
  status: "ok";
  checkedAt: string;
  projectId: string;
  slots: ProjectDocumentSlotViewerRow[];
};

export const PROJECT_DOCUMENT_SLOT_DEFINITIONS: readonly ProjectDocumentSlotDefinition[] = [
  {
    slotKey: "source.customer_originals",
    group: "source",
    title: "고객 원본(Customer Originals)",
    required: false,
    contentType: "text/markdown",
    collection: true,
    producer: "Blueprint",
  },
  {
    slotKey: "source.internal_notes",
    group: "source",
    title: "내부 정리본(Internal Notes)",
    required: false,
    contentType: "text/markdown",
    collection: true,
    producer: "Blueprint",
  },
  {
    slotKey: "source.references",
    group: "source",
    title: "참고 자료(References)",
    required: false,
    contentType: "text/markdown",
    collection: true,
    producer: "Blueprint",
  },
  {
    slotKey: "support.pm_execution_procedure",
    group: "support",
    title: "PM 업무 실행 절차(PM Execution Procedure)",
    required: true,
    contentType: "text/markdown",
    templatePath: "bbr-plugins/builder/templates/standards/pm-execution-procedure.md",
    producer: "Blueprint",
  },
  {
    slotKey: "support.screen_definition_writing_rules",
    group: "support",
    title: "화면정의서 작성 룰(Screen Definition Writing Rules)",
    required: true,
    contentType: "text/markdown",
    templatePath: "bbr-plugins/builder/templates/standards/screen-definition-writing-rules.md",
    producer: "Blueprint",
  },
  {
    slotKey: "deliverable.prd",
    group: "deliverable",
    title: "개발 요구사항 브리프(Development Requirements Brief)",
    required: true,
    contentType: "text/markdown",
    templatePath: "bbr-plugins/builder/templates/deliverables/development-requirements-brief.md",
    producer: "Blueprint",
  },
  {
    slotKey: "deliverable.feature_files",
    group: "deliverable",
    title: "기능정의서(Feature Definition)",
    required: true,
    contentType: "text/markdown",
    templatePath: "bbr-plugins/builder/templates/deliverables/feature-definition.md",
    collection: true,
    producer: "Blueprint",
  },
  {
    slotKey: "deliverable.schema_definition",
    group: "deliverable",
    title: "스키마 정의서(Schema Definition)",
    required: true,
    contentType: "text/markdown",
    templatePath: "bbr-plugins/builder/templates/deliverables/schema-definition.md",
    producer: "Blueprint",
  },
  {
    slotKey: "deliverable.api_definition",
    group: "deliverable",
    title: "API 정의서(API Definition)",
    required: true,
    contentType: "text/markdown",
    templatePath: "bbr-plugins/builder/templates/deliverables/api-definition.md",
    producer: "Blueprint",
  },
  {
    slotKey: "deliverable.architecture",
    group: "deliverable",
    title: "아키텍쳐 정의서(Architecture Definition)",
    required: true,
    contentType: "text/markdown",
    templatePath: "bbr-plugins/builder/templates/deliverables/architecture-definition.md",
    producer: "Blueprint",
  },
  {
    slotKey: "deliverable.screen_definitions",
    group: "deliverable",
    title: "화면정의서(Screen Definitions)",
    required: true,
    contentType: "text/markdown",
    templatePath: "bbr-plugins/builder/templates/deliverables/screen-definition.md",
    collection: true,
    producer: "Blueprint",
  },
];

export const OUTPUT_INVENTORY_DELIVERABLE_SLOTS = [
  "deliverable.prd",
  "deliverable.feature_files",
  "deliverable.schema_definition",
  "deliverable.api_definition",
  "deliverable.architecture",
  "deliverable.screen_definitions",
] as const;
export type OutputInventoryDeliverableSlotKey = typeof OUTPUT_INVENTORY_DELIVERABLE_SLOTS[number];

type OutputInventoryTargetDefinition = {
  slotKey: OutputInventoryDeliverableSlotKey;
  title: string;
  purpose: string;
  prefix: string;
  requiredFields: readonly string[];
  exitCriteria: readonly string[];
  dependsOn: readonly ProjectDocumentSlotKey[];
};

const OUTPUT_INVENTORY_TARGETS: readonly OutputInventoryTargetDefinition[] = [
  {
    slotKey: "deliverable.prd",
    title: "개발 요구사항 브리프(Development Requirements Brief)",
    purpose: "고객이 제공한 기획/요구사항 문서를 구현 착수 기준선으로 정규화하고 후속 기능정의서, 스키마/API, 아키텍처, 화면정의서의 입력으로 삼는다.",
    prefix: "BRIEF",
    requiredFields: ["projectContext", "implementationScope", "functionalRequirements", "flows", "dataApiIntegrationNeeds", "acceptanceCriteria", "milestones", "assumptionsAndOpenDecisions", "outOfScope"],
    exitCriteria: ["프로젝트 맥락과 구현 범위가 확인된다.", "기능/비기능 요구사항과 인수 기준이 검수 가능한 문장으로 정리된다.", "후속 산출물이 참조할 개발 기준선이 된다."],
    dependsOn: [],
  },
  {
    slotKey: "deliverable.feature_files",
    title: "기능정의서(Feature Definition)",
    purpose: "기능 목록 페이지와 기능별 상세 문서를 한 산출물 안에서 구현 가능한 기능 단위와 project-builder-base 재사용 단위로 정리한다.",
    prefix: "FEAT",
    requiredFields: ["featureIndex", "featureName", "baseSurface", "reuseDecision", "behavior", "actors", "acceptanceCriteria", "sourceRefs"],
    exitCriteria: ["목록 페이지가 기능별 상세 문서를 참조한다.", "각 기능이 전체 재사용/부분 재사용/커스터마이징/신규 중 하나로 판정된다.", "설정에서 선택된 apps/admin, apps/site, apps/app, apps/landing hard-copy 대상 surface만 명시된다.", "각 기능이 독립 구현/QA 단위로 분리된다.", "Product Builder가 기능별 작업 그래프를 만들 수 있다."],
    dependsOn: ["deliverable.prd"],
  },
  {
    slotKey: "deliverable.schema_definition",
    title: "스키마 정의서(Schema Definition)",
    purpose: "기능정의서의 feature cluster와 product-builder-base packages/drizzle 재사용 후보를 기준으로 데이터 객체, 필드, 관계, 검증 규칙을 개발 계약으로 고정한다.",
    prefix: "SCH",
    requiredFields: ["schemaCode", "name", "featureRefs", "baseDrizzleReferences", "reuseDecision", "fields", "relations", "validation", "migrationScope", "acceptanceCriteria"],
    exitCriteria: ["모든 데이터 객체가 기능정의서의 feature cluster와 연결된다.", "재사용/확장 가능한 product-builder-base packages/drizzle schema 경로가 명시된다.", "신규 테이블은 Drizzle table/export/migration scope를 가진다.", "API와 화면정의서가 schema code로 참조할 수 있다."],
    dependsOn: ["deliverable.prd", "deliverable.feature_files"],
  },
  {
    slotKey: "deliverable.api_definition",
    title: "API 정의서(API Definition)",
    purpose: "기능정의서와 스키마 정의서를 함께 읽고 product-builder-base packages/features 서버 API와 apps/server 제공 구조 기준으로 REST API 경로, actor, 인증, 입출력, 에러, 감사 액션을 고정한다.",
    prefix: "API",
    requiredFields: ["method", "path", "featureRefs", "schemaRefs", "baseFeatureReferences", "serverExposure", "reuseDecision", "actor", "auth", "input", "output", "errors", "auditAction", "customizationScope"],
    exitCriteria: ["각 API가 feature code와 schema code에 연결된다.", "재사용/수정 가능한 product-builder-base packages/features controller/service/dto/module 경로가 명시된다.", "apps/server 제공 지점과 AppModule module import 수정 여부가 드러난다.", "프론트엔드/백엔드가 같은 입출력 계약을 참조한다."],
    dependsOn: ["deliverable.feature_files", "deliverable.schema_definition"],
  },
  {
    slotKey: "deliverable.architecture",
    title: "아키텍쳐 정의서(Architecture Definition)",
    purpose: "구성요소, 기술 스택, 인프라, 외부 연동, 데이터 흐름을 정리한다.",
    prefix: "ARC",
    requiredFields: ["components", "techStack", "infrastructure", "integrations", "dataFlow"],
    exitCriteria: ["호스팅/DB/스토리지/관측성/CI-CD 선택이 설명된다.", "외부 연동과 런타임 책임이 명확하다."],
    dependsOn: ["deliverable.prd"],
  },
  {
    slotKey: "deliverable.screen_definitions",
    title: "화면정의서(Screen Definitions)",
    purpose: "각 화면의 route, 상태, action, API/schema 참조, 페이지별 layout/slot, 테스트 기준을 화면별로 정의한다.",
    prefix: "SCR",
    requiredFields: ["route", "states", "actions", "apiRefs", "schemaRefs", "layoutCode", "testIds"],
    exitCriteria: ["각 화면이 default/empty/loading/error/permission 상태를 가진다.", "각 action과 acceptance criteria가 test-id로 추적된다."],
    dependsOn: ["deliverable.schema_definition", "deliverable.api_definition"],
  },
] as const;

// Legacy original download 상한. 새 등록 플로우는 원본 바이너리를 worker action에 동봉하지 않는다.
export const MAX_ORIGINAL_BYTES = 6 * 1024 * 1024;

// Deprecated: kept for compatibility with older UI bundles.
export const REGISTER_BODY_BUDGET = 9_000_000;

// LLM 프롬프트에 넣을 source 본문 크기 상한. 입력 토큰 폭주·타임아웃 방지.
export const SOURCE_BODY_CAP = 12000;   // 자료 1건당
export const TOTAL_SOURCE_CAP = 48000;  // 전체 합산
export const REQUIREMENT_INVENTORY_PROMPT_CAP = 390_000;
const REQUIREMENT_INVENTORY_ITEM_TITLE_CAP = 84;

export type SourceMaterial = {
  id: string;
  title: string;
  type: SourceType;
  body: string;
  createdAt: string;
  fileName?: string;
  format?: SourceFormat;
  figmaFileKey?: string;
  figmaNodeId?: string;
  url?: string;
  intakeWorkflow?: string;
  fetchStatus?: "not_fetched" | "fetched" | "failed";
  fetchedAt?: string;
  fetchError?: string;
  fingerprint?: string;
  originalPath?: string;
  originalSize?: number;
  originalContentType?: string;
  originalProjectId?: string;
  links?: {
    external?: string[];
    figma?: string[];
    notionPageIds?: string[];
    notionPageUrls?: string[];
    children?: string[];
  };
};

export type SchemaField = {
  name: string;
  type: string;
  required: boolean;
  description: string;
  validation?: string;
  example?: string;
};

export const BASE_SCHEMA_REUSE_DECISIONS = ["REUSE", "EXTEND", "NEW", "N/A", "UNDECIDED"] as const;
export type BaseSchemaReuseDecision = typeof BASE_SCHEMA_REUSE_DECISIONS[number];

export type BaseDrizzleReference = {
  packagePath: string;
  exportName?: string;
  tableName?: string;
  reuseDecision?: BaseSchemaReuseDecision;
  note?: string;
};

export type BaseFeatureApiReference = {
  packagePath: string;
  moduleName?: string;
  controllerPath?: string;
  servicePath?: string;
  dtoPath?: string;
  providedBy?: string;
  reuseDecision?: BaseSchemaReuseDecision;
  customizationScope?: string;
  note?: string;
};

export type SchemaDefinition = {
  code: string;
  name: string;
  description: string;
  fields: SchemaField[];
  owner?: string;
  sourceRequirementCodes?: string[];
  featureRefs?: string[];
  relations?: string[];
  tableName?: string;
  drizzleExportName?: string;
  baseReuseDecision?: BaseSchemaReuseDecision;
  baseDrizzleReferences?: BaseDrizzleReference[];
  migrationScope?: string[];
  indexes?: string[];
  enums?: string[];
  implementationNotes?: string[];
  acceptanceCriteria?: string[];
};

export type ApiParameter = {
  name: string;
  type: string;
  required: boolean;
  description: string;
};

export type ApiDefinition = {
  code: string;
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  summary: string;
  input: ApiParameter[];
  output: ApiParameter[];
  schemas: string[];
  sourceRequirementCodes?: string[];
  featureRefs?: string[];
  baseReuseDecision?: BaseSchemaReuseDecision;
  baseFeatureReferences?: BaseFeatureApiReference[];
  serverExposure?: string;
  customizationScope?: string[];
  implementationNotes?: string[];
  actor?: "public" | "authenticated" | "admin" | "system";
  auth?: string;
  errors?: Array<{ code: string; condition: string }>;
  auditAction?: string;
  acceptanceCriteria?: string[];
};

export type LayoutSlot = {
  code: string;
  name: string;
  purpose: string;
};

export type LayoutDefinition = {
  code: string;
  name: string;
  description: string;
  slots: LayoutSlot[];
};

export type ScreenAction = {
  code: string;
  testId: string;
  trigger: string;
  description: string;
  apiCodes: string[];
  targetScreenCode?: string;
};

export type AcceptanceCriterion = {
  code: string;
  testId: string;
  description: string;
};

export type ScreenState = {
  name: "default" | "empty" | "loading" | "error" | "permission";
  description: string;
};

// 화면 접근 권한. public=비로그인 접근, authenticated=로그인 필요, admin=관리자 전용.
export const SCREEN_ACCESS = ["public", "authenticated", "admin"] as const;
export type ScreenAccess = typeof SCREEN_ACCESS[number];
export const SCREEN_ACCESS_LABEL: Record<ScreenAccess, string> = {
  public: "공개",
  authenticated: "인증 필요",
  admin: "관리자",
};

// LLM이 access를 명시했으면 그대로, 아니면 route로 추론한다. public은 명시 시에만(보수적 기본값).
export function inferScreenAccess(raw: unknown, route: string): ScreenAccess {
  if (raw === "public" || raw === "authenticated" || raw === "admin") return raw;
  // /admin 또는 /admin/... 세그먼트 경계만 매칭(/administrator 오탐 방지).
  if (/(^|\/)admin(\/|$)/.test(route)) return "admin";
  return "authenticated";
}

export type ScreenDefinition = {
  code: string;
  name: string;
  description: string;
  targetSurface: ProductBuilderSurface;
  layoutCode: string;
  layoutSlot: string;
  route: string;
  access: ScreenAccess;
  primaryTestId: string;
  schemas: string[];
  apis: string[];
  fields: string[];
  states: ScreenState[];
  actions: ScreenAction[];
  acceptanceCriteria: AcceptanceCriterion[];
};

export type FunctionalRequirement = {
  code: string;
  title: string;
  description: string;
  priority?: "must" | "should" | "could";
  targetSurfaces?: ProductBuilderSurface[];
  sourceInventoryItemIds?: string[];
  userRole?: string;
  preconditions?: string;
  doneCondition?: string;
  mainFlow?: string[];
  exceptions?: string[];
  inputSummary?: string;
  outputSummary?: string;
};

export type Risk = {
  code: string;
  description: string;
  mitigation: string;
};

export type PmWorkflowStep = {
  code: string;
  name: string;
  purpose: string;
  inputDocuments: string[];
  outputDocuments: string[];
  exitCriteria: string[];
  owner: string;
};

const STANDARD_PM_WORKFLOW: PmWorkflowStep[] = [
  {
    code: "PM-STEP-01",
    name: "자료 수집 및 정규화",
    purpose: "PM 에이전트가 내부/외부 기획 자료를 표준 분석 입력으로 정리한다.",
    inputDocuments: ["고객 기획서", "회의록", "참고 자료"],
    outputDocuments: ["source.customer_originals", "source.internal_notes", "source.references"],
    exitCriteria: ["분석 대상 자료가 Project source slot으로 등록됨", "자료 유형과 원본 파일 정보가 추적 가능함"],
    owner: "PM Agent",
  },
  {
    code: "PM-STEP-02",
    name: "개발 요구사항 브리프 확정",
    purpose: "고객 제공 자료에서 프로젝트 맥락, 구현 범위, 요구사항, 인수 기준, 전제, 오픈 결정을 개발 착수 기준선으로 고정한다.",
    inputDocuments: ["등록 자료"],
    outputDocuments: [
      "deliverable.prd",
    ],
    exitCriteria: ["포함/제외 범위가 모두 명시됨", "기능 요구사항과 인수 기준이 기능 정의서 slot으로 추적 가능함"],
    owner: "PM Agent",
  },
  {
    code: "PM-STEP-03",
    name: "기능정의서 생성",
    purpose: "개발 요구사항 브리프의 기능 요구사항을 기능 목록, 기능별 상세 문서, project-builder-base 재사용 판정으로 분리한다.",
    inputDocuments: ["개발 요구사항 브리프"],
    outputDocuments: [
      "deliverable.feature_files",
    ],
    exitCriteria: ["기능 목록이 기능별 상세 문서를 참조함", "기능별로 설정에서 선택된 apps/admin, apps/site, apps/app, apps/landing 대상 surface만 명시됨", "기능별로 전체 재사용/부분 재사용/커스터마이징/신규 판정이 있음"],
    owner: "PM Agent",
  },
  {
    code: "PM-STEP-04",
    name: "스키마/API 계약 분리",
    purpose: "개발과 QA가 참조할 데이터 스키마 정의서와 REST API 정의서를 표준 산출물로 분리한다.",
    inputDocuments: ["개발 요구사항 브리프", "기능정의서"],
    outputDocuments: [
      "deliverable.schema_definition",
      "deliverable.api_definition",
    ],
    exitCriteria: ["모든 스키마와 API가 코드로 식별됨", "API가 참조하는 스키마 코드가 존재함"],
    owner: "PM Agent",
  },
  {
    code: "PM-STEP-05",
    name: "화면정의서 생성 게이트",
    purpose: "확정된 개발 요구사항 브리프/스키마/API 계약을 기준으로 페이지별 레이아웃을 포함한 화면정의서를 생성한다.",
    inputDocuments: ["확정된 개발 요구사항 브리프", "기능정의서", "스키마 정의서", "REST API 정의서"],
    outputDocuments: ["deliverable.screen_definitions"],
    exitCriteria: ["개발 요구사항 브리프가 confirmed 상태임", "각 화면이 설정에서 선택된 apps/admin, apps/site, apps/app, apps/landing surface로만 구분됨", "각 화면이 schema/api 코드를 재정의 없이 참조하고 페이지별 layout/slot을 자체 포함함"],
    owner: "PM Agent",
  },
];

// 아키텍쳐 정의서 산출물. 대상 시스템(구축 대상)의 인프라·기술 스택·컴포넌트·연동을 정리한다.
export const ARCHITECTURE_LAYERS = ["frontend", "backend", "data", "ai", "integration", "infra"] as const;
export type ArchitectureLayer = typeof ARCHITECTURE_LAYERS[number];
export const ARCHITECTURE_LAYER_LABEL: Record<ArchitectureLayer, string> = {
  frontend: "프론트엔드",
  backend: "백엔드",
  data: "데이터",
  ai: "AI",
  integration: "연동",
  infra: "인프라",
};

export const INFRASTRUCTURE_CATEGORIES = [
  "hosting", "database", "storage", "cdn", "queue", "auth", "observability", "ci-cd", "network", "other",
] as const;
export type InfrastructureCategory = typeof INFRASTRUCTURE_CATEGORIES[number];
export const INFRASTRUCTURE_CATEGORY_LABEL: Record<InfrastructureCategory, string> = {
  hosting: "호스팅",
  database: "데이터베이스",
  storage: "스토리지",
  cdn: "CDN",
  queue: "큐/메시징",
  auth: "인증",
  observability: "관측성",
  "ci-cd": "CI/CD",
  network: "네트워크",
  other: "기타",
};

// 시스템 컴포넌트. 대상 시스템의 논리 구성 요소 1개.
export type ArchitectureComponent = {
  code: string;
  name: string;
  layer: ArchitectureLayer;
  responsibility: string;
  techStack: string[];
  dependsOn?: string[];
};

// 기술 스택 항목. 영역별 채택 기술과 채택 근거.
export type TechStackItem = {
  area: string;
  choice: string;
  rationale?: string;
};

// 인프라 구성 항목. 호스팅/DB/스토리지 등 운영 인프라 1개.
export type InfrastructureItem = {
  code: string;
  name: string;
  category: InfrastructureCategory;
  detail: string;
  provider?: string;
};

// 아키텍쳐 정의서 전체. diagram은 mermaid 소스(코드펜스 없이 본문만).
export type Architecture = {
  overview: string;
  diagram: string;
  components: ArchitectureComponent[];
  techStack: TechStackItem[];
  infrastructure: InfrastructureItem[];
  integrations: string[];
  dataFlow: string[];
};

export const REQUIREMENT_INVENTORY_CATEGORIES = [
  "functional_requirement",
  "actor_or_permission",
  "screen_candidate",
  "data_object",
  "api_or_integration",
  "admin_operation",
  "payment",
  "notification",
  "upload_or_media",
  "ai_runtime",
  "non_functional_requirement",
  "risk",
  "missing_input_or_open_question",
] as const;
export type RequirementInventoryCategory = typeof REQUIREMENT_INVENTORY_CATEGORIES[number];

export const REQUIREMENT_INVENTORY_STATUSES = [
  "candidate",
  "confirmed",
  "duplicate",
  "unclear",
  "out_of_scope",
] as const;
export type RequirementInventoryStatus = typeof REQUIREMENT_INVENTORY_STATUSES[number];

export type RequirementInventorySourceRef = {
  sourceId: string;
  sourceTitle: string;
  evidenceExcerpt: string;
};

export type RequirementInventoryItem = {
  id: string;
  category: RequirementInventoryCategory;
  targetDeliverables: OutputInventoryDeliverableSlotKey[];
  title: string;
  description: string;
  sourceRefs: RequirementInventorySourceRef[];
  confidence: number;
  status: RequirementInventoryStatus;
};

export type RequirementInventoryDeliverableUnit = {
  unitId: string;
  title: string;
  description: string;
  sourceItemIds: string[];
  sourceRefs: RequirementInventorySourceRef[];
  requiredFields: string[];
  exitCriteria: string[];
  dependsOn: ProjectDocumentSlotKey[];
  status: RequirementInventoryStatus;
};

export type RequirementInventoryDeliverable = {
  slotKey: OutputInventoryDeliverableSlotKey;
  title: string;
  purpose: string;
  units: RequirementInventoryDeliverableUnit[];
};

export type RequirementInventory = {
  deliverables: RequirementInventoryDeliverable[];
  items: RequirementInventoryItem[];
  generatedAt: string;
  sourceCount: number;
  chunkCount: number;
  llmModel?: string;
  usedFallback?: boolean;
};

// 분석 ①단계 산출물: 개발 요구사항 브리프/계약 기준선.
export type BlueprintPrd = {
  projectTitle: string;
  overview: string;
  goals: string[];
  scope: { inScope: string[]; outOfScope: string[] };
  functionalRequirements: FunctionalRequirement[];
  nonFunctionalRequirements: string[];
  schemas: SchemaDefinition[];
  apis: ApiDefinition[];
  layouts: LayoutDefinition[];
  architecture: Architecture;
  risks: Risk[];
  assumptions: string[];
  productBuilderBlueprint?: ProductBuilderBlueprintContext;
  productBuilderBasePackages?: ProductBuilderBasePackageSelection[];
  generatedAt: string;
  /** 확정 시각. null이면 미확정 → 화면정의서 단계 진입 불가(게이트). */
  confirmedAt: string | null;
  llmModel?: string;
  usedFallback?: boolean;
};

// 화면정의서 리뷰. 화면 코드별로 보관(ScreenPlan.reviews). 사람이 피드백을 남기고 LLM이 반영 재생성한다.
export const REVIEW_STATUSES = ["pending", "approved", "changes-requested"] as const;
export type ReviewStatus = typeof REVIEW_STATUSES[number];
export type ReviewComment = { id: string; body: string; createdAt: string };
export type ScreenReview = { status: ReviewStatus; comments: ReviewComment[]; updatedAt: string };

// 분석 ②단계 산출물: 화면정의서 전체. 확정된 BlueprintPrd를 입력으로 생성.
export type ScreenPlan = {
  screens: ScreenDefinition[];
  generatedAt: string;
  confirmedAt: string | null;
  /** 화면 코드별 리뷰. optional(기존 screenPlan 하위호환). 전체 재생성 시 초기화. */
  reviews?: Record<string, ScreenReview>;
  llmModel?: string;
  usedFallback?: boolean;
};

export function screenPlanAllScreensApproved(screenPlan: ScreenPlan): boolean {
  if (screenPlan.screens.length === 0) return false;
  return screenPlan.screens.every((screen) => screenPlan.reviews?.[screen.code]?.status === "approved");
}

// LLM 호출 액션은 host RPC 30s 타임아웃을 넘기므로 fire-and-forget로 돌린다.
// job은 진행/실패를 UI에 알리는 상태(완료 시 null). UI는 running 동안 폴링한다.
export type BlueprintJob = {
  jobId?: string;
  kind: "requirement-inventory" | "prd" | "screens" | "screen";
  stage?: "requirement-inventory" | "prd" | "screens" | "screen";
  status: "running" | "error";
  projectId?: string | null;
  agentId?: string | null;
  agentRunId?: string | null;
  sourceCount?: number;
  prdSourceCount?: number;
  screenCode?: string;
  message?: string;
  startedAt: string;
};

// 필수 가이드라인 역할 섹션. common(=agentGuidelinesMarkdown, 기존 필드 유지) + 6 role.
// 각 역할 섹션은 해당 역할 에이전트가 실행 전 읽는 0순위 지침이다.
export type AgentGuidelineRoleKey =
  | "orchestrator"
  | "backend"
  | "frontend"
  | "platform"
  | "ai"
  | "qa";

export type AgentRoleGuidelines = Record<AgentGuidelineRoleKey, string>;

export const AGENT_GUIDELINE_ROLE_KEYS: readonly AgentGuidelineRoleKey[] = [
  "orchestrator",
  "backend",
  "frontend",
  "platform",
  "ai",
  "qa",
];

// 하드코딩 지침(product-builder-instructions / manifest)에서 핵심 규칙만 요약한 seed 기본값.
// 원문은 에이전트 manifest instructions에 그대로 남아 있고, 여기 값은 운영자가 화면에서 편집 가능한 기본값이다.
export const DEFAULT_AGENT_GUIDELINES: { common: string } & AgentRoleGuidelines = {
  common: [
    "## 공통 (우선순위 0)",
    "- 기준 코드베이스는 product-builder-base 모노레포다. 클론해 프로젝트명으로 만든 뒤 수정한다. Flotter 등 기존 제품은 참조/비교용일 뿐 복붙 소스가 아니다.",
    "- 모든 역량은 REUSE / EXTEND / NEW / N/A 중 하나로 명시 판정한다. REUSE·N/A는 워크플로를 보존하고 하위 task를 unblock하는 완료(SKIP) 기록으로 남긴다.",
    "- REUSE는 `product-builder-base:<capability-path>@<tag-or-commit>` 형태로 검증 가능한 출처가 있을 때만 유효하다. PB-BASE-001이 repo/path/ref를 검증하지 않았으면 blocked로 두거나 EXTEND/NEW로 전환한다.",
    "- blueprint의 고정 task는 전부 생성하고 삭제하지 않는다. 산출물/코드/test-id/API/schema는 서로 추적 가능해야 한다.",
    "- 완료 게이트: 배포된 Vercel URL에서 public browse, auth modal, signup/login, 보호 기능 접근, admin 접근 통제가 검증되기 전까지 build를 완료로 표시하지 않는다.",
  ].join("\n"),
  orchestrator: [
    "## 오케스트레이터 (Orchestrator)",
    "- control-plane 에이전트로 동작한다. 실행 가능한 작업은 직접 구현하지 말고 담당 역할 에이전트에 배정한다.",
    "- feature 선택은 task를 제거하는 필터가 아니라 고정 task의 기본 decision override로 처리한다.",
    "- 도메인 범위는 domain feature card(title/description/target surface/MVP/재사용 판정)로 변환하고, 파일럿 고객 도메인을 blueprint 자체에 박지 않는다.",
    "- PB-FEAT-003은 feature 이슈 집합을 리뷰하고 scope를 lock하는 게이트다. 이슈 생성 자체가 아니다. lock 후에만 구현 task를 ready로 만든다.",
    "- 생성 작업은 Paperclip 이슈로 남겨 범위/담당/상태를 검사 가능하게 한다. intake가 불완전하면 후속 질문을 제안하고 운영자 승인 전까지 범위를 확장하지 않는다.",
  ].join("\n"),
  backend: [
    "## 백엔드 (Backend)",
    "- 스키마/API는 새 표현을 만들기보다 선행 기능 요구사항 코드(sourceRequirementCodes)에 연결한다. 모든 API는 참조 스키마 코드를 가진다.",
    "- NEW 판정 전 product-builder-base `packages/drizzle/src/schema/index.ts`, `core/*`, `features/*`에서 재사용/확장 가능한 table/export를 먼저 찾아 baseDrizzleReferences로 기록한다.",
    "- 스키마 field는 name/type/required/description을 반드시 채운다. 빈 객체·undefined·placeholder는 산출물 실패로 본다.",
    "- API는 `packages/features/{feature}` controller/service/dto/module과 `apps/server/src/app.module.ts` 노출 지점의 재사용 여부·수정 범위를 기록한다.",
    "- auth/actor/error/audit는 구현자가 바로 확인 가능하게 기술한다. 결제 등 큰 기능은 하나의 이슈로 두지 말고 provider/data/CRUD/checkout/webhook/entitlement/QA로 분할한다.",
  ].join("\n"),
  frontend: [
    "## 프론트엔드 (Frontend)",
    "- 화면 1개 = 화면정의서 1개. 화면은 schema/api를 재정의하지 않고 code로만 참조하며 페이지별 layoutCode/layoutSlot을 포함한다.",
    "- 화면 상태는 default/empty/loading/error/permission 기준으로 작성하고 data-testid는 화면/액션/인수기준 코드에서 기계적으로 파생한다.",
    "- online service의 public 페이지는 로그인 없이 열람 가능해야 한다. save/purchase/start 같은 보호 액션은 auth modal을 띄우고 로그인 후 원래 액션으로 복귀시킨다.",
    "- 사용자 영역과 관리자 영역을 한 화면에 섞지 않는다. admin은 별도 관리자 UI로 분리하고 선택된 apps/* surface 기준으로 구획을 나눈다.",
  ].join("\n"),
  platform: [
    "## 플랫폼 (Platform)",
    "- 구현 시작 전 PB-REPO-001으로 고객 납품 repo, 실행 workspace, 브랜치 전략, Vercel 프로젝트 타깃을 바인딩한다. 구현 이슈는 그 workspace에서 실행한다.",
    "- 기본 스택은 Neon Postgres + Vercel. online service는 Next.js App Router, web application service는 Vite React SPA + 별도 AI 서버 경계. REST + OpenAPI. tRPC는 도입하지 않는다.",
    "- Neon/Vercel/auth/deploy 작업은 project id, URL, env 매핑, migration 로그, health check, 스크린샷 등 구체적 환경 증거를 남긴다.",
    "- 비 Neon/Vercel 배포는 기본 워크플로에 섞지 말고 별도 porting 워크플로로 분리한다. 납품 템플릿 코드는 Flotter가 아니라 product-builder-base에 둔다.",
  ].join("\n"),
  ai: [
    "## AI",
    "- AI 서버/런타임은 web/서버와 분리된 경계로 둔다(web application service 기본값). AI 호출을 일반 REST 서버 안에 섞지 않는다.",
    "- AI job은 비동기 실행/재시도/실패 상태를 남기고, 호출 비용·토큰·rate limit을 guard한다.",
    "- 외부 모델/프로바이더 계약(모델 id, env, 비용/보안 정책)은 이슈에 명시하고 추론으로 채우지 않는다. 공식 문서/고객 계약이 없으면 blocker/follow-up으로 둔다.",
  ].join("\n"),
  qa: [
    "## QA",
    "- contract(스키마/API) 정합성, build 통과, browser E2E, 배포 readiness를 검증한다. 인수 기준(AC)과 E2E 검증은 화면정의서에 명시적으로 남긴다.",
    "- API 200 ≠ UI 동작. login / 보호 기능 접근 / admin 접근 통제를 실제 클릭 플로우로 확인한다.",
    "- PB-DEPLOY-VERIFY-001 / PB-LAUNCH-SMOKE-001이 실제 배포·로그인 증거(Vercel URL, 스크린샷 등)를 남긴 뒤에만 완료 처리한다.",
  ].join("\n"),
};

export function emptyAgentRoleGuidelines(): AgentRoleGuidelines {
  return {
    orchestrator: "",
    backend: "",
    frontend: "",
    platform: "",
    ai: "",
    qa: "",
  };
}

export type CosBlueprintState = {
  sources: SourceMaterial[];
  productBuilderBlueprintId: ProductBuilderBlueprintId;
  productBuilderBlueprintSelectedAt: string | null;
  productBuilderBasePackageKeys: ProductBuilderBasePackageKey[];
  agentGuidelinesMarkdown: string;
  agentRoleGuidelines: AgentRoleGuidelines;
  requirementInventory: RequirementInventory | null;
  prd: BlueprintPrd | null;
  screenPlan: ScreenPlan | null;
  /** "Task 생성" 결과 스냅샷. "이슈 생성"의 유일한 task 소스(재생성 없음). */
  taskListBuild: BlueprintTaskListBuildSnapshot | null;
  projectDocumentSlots: ProjectDocumentSlotUpdate[];
  job?: BlueprintJob | null;
  // staged 생성이 끝난 뒤 overview 핸들러(RPC scope)가 기록할 slot 키.
  // 전체 재생성=전 산출물, 개별 재분석=해당 산출물만 → 부분 재생성이 타 산출물 status를 깨지 않는다.
  stagedPendingSlotKeys?: ProjectDocumentSlotKey[] | null;
  updatedAt: string | null;
};

export type CosBlueprintOverview = {
  status: "ok";
  checkedAt: string;
  pluginId: string;
  version: string;
  state: CosBlueprintState;
};

// "Task 생성"이 저장하는 전체 Task 목록 스냅샷. "이슈 생성"은 재생성 없이 이 스냅샷만 소비한다
// (검토한 목록 = 등록되는 이슈). 소스 지문(prd/screenPlan 생성 시각)으로 stale 여부를 판정한다.
export type BlueprintTaskListBuildSnapshot = {
  generatedAt: string;
  prdGeneratedAt: string;
  prdConfirmedAt: string | null;
  screenPlanGeneratedAt: string | null;
  blueprintId: ProductBuilderBlueprintId;
  taskCount: number;
  /** buildBlueprintProductTasks 산출물(BlueprintProductBuild). 순환 import 회피로 여기선 구조만 보존. */
  build: unknown;
};

export type ProjectDocumentUpdateResult = {
  ok: boolean;
  projectId: string | null;
  workspacePath: string | null;
  files: string[];
  slots: ProjectDocumentSlotUpdate[];
  message: string;
};

// 프로젝트 선택용 경량 요약. 전체 Project 객체를 UI로 흘리지 않는다.
export type ProjectSummary = {
  id: string;
  name: string;
  status: string;
};

export type SourceDocumentRegisterResult = {
  ok: boolean;
  duplicate?: boolean;
  source: SourceMaterial;
  projectId: string | null;
  workspacePath: string | null;
  /** Project slot documentRef. 새 플로우는 workspace 파일을 쓰지 않는다. */
  file: string | null;
  slot: ProjectDocumentSlotUpdate | null;
  message: string;
};

export type SourceDocumentDeleteResult = {
  ok: boolean;
  removed: boolean;
  projectId: string;
  sourceId: string | null;
  documentRef: string | null;
  slot: ProjectDocumentSlotUpdate | null;
  removedBodyBlock: boolean;
  message: string;
};

// 보관한 원본 바이너리 다운로드 응답. dataBase64는 호스트 JSON 한도 안에서 전달.
export type SourceOriginalDownload = {
  ok: boolean;
  fileName: string | null;
  contentType: string | null;
  dataBase64: string | null;
  message: string;
};

export type BlueprintPmChatStreamEvent = {
  type: "pm-chat.started" | "pm-chat.done" | "pm-chat.error" | "agent.event";
  eventType?: "chunk" | "status" | "done" | "error";
  stream?: "stdout" | "stderr" | "system" | null;
  message?: string | null;
  payload?: Record<string, unknown> | null;
  runId?: string;
  sessionId?: string;
  seq?: number;
};

export function blueprintPmChatChannel(companyId: string, projectId?: string | null): string {
  return `blueprint:pm-chat:${companyId}:${projectId || "company"}`;
}

export function emptyState(): CosBlueprintState {
  return {
    sources: [],
    productBuilderBlueprintId: DEFAULT_PRODUCT_BUILDER_BLUEPRINT_ID,
    productBuilderBlueprintSelectedAt: null,
    productBuilderBasePackageKeys: [...DEFAULT_PRODUCT_BUILDER_BASE_PACKAGE_KEYS],
    agentGuidelinesMarkdown: DEFAULT_AGENT_GUIDELINES.common,
    agentRoleGuidelines: {
      orchestrator: DEFAULT_AGENT_GUIDELINES.orchestrator,
      backend: DEFAULT_AGENT_GUIDELINES.backend,
      frontend: DEFAULT_AGENT_GUIDELINES.frontend,
      platform: DEFAULT_AGENT_GUIDELINES.platform,
      ai: DEFAULT_AGENT_GUIDELINES.ai,
      qa: DEFAULT_AGENT_GUIDELINES.qa,
    },
    requirementInventory: null,
    prd: null,
    screenPlan: null,
    taskListBuild: null,
    projectDocumentSlots: [],
    job: null,
    updatedAt: null,
  };
}

const PRODUCT_BUILDER_SURFACE_PACKAGE: Record<Extract<ProductBuilderSurface, "admin" | "site" | "app" | "landing">, ProductBuilderBasePackageKey> = {
  admin: "admin",
  site: "site",
  app: "app",
  landing: "landing",
};

function productBuilderBasePackagePath(key: ProductBuilderBasePackageKey): string {
  return PRODUCT_BUILDER_BASE_PACKAGE_OPTIONS.find((option) => option.key === key)?.basePath ?? `apps/${key}`;
}

function selectedProductBuilderBasePackageKeys(value: unknown): ProductBuilderBasePackageKey[] {
  return productBuilderBasePackageSelections(value)
    .filter((item) => item.selected)
    .map((item) => item.key);
}

function unselectedProductBuilderBasePackageKeys(value: unknown): ProductBuilderBasePackageKey[] {
  return productBuilderBasePackageSelections(value)
    .filter((item) => !item.selected)
    .map((item) => item.key);
}

function allowedProductBuilderSurfaces(value: unknown): ProductBuilderSurface[] {
  const keys = new Set(selectedProductBuilderBasePackageKeys(value));
  const selectedSurfaces = (Object.entries(PRODUCT_BUILDER_SURFACE_PACKAGE) as Array<[ProductBuilderSurface, ProductBuilderBasePackageKey]>)
    .filter(([, key]) => keys.has(key))
    .map(([surface]) => surface);
  return [...selectedSurfaces, "shared", "undecided"];
}

function productBuilderSurfaceOrderForScope(value: unknown): ProductBuilderSurface[] {
  const allowed = new Set(allowedProductBuilderSurfaces(value));
  return PRODUCT_BUILDER_SURFACE_ORDER.filter((surface) => allowed.has(surface));
}

function productBuilderBasePackagePromptLines(value: unknown): string[] {
  const selectedPaths = selectedProductBuilderBasePackageKeys(value).map(productBuilderBasePackagePath);
  const blockedPaths = unselectedProductBuilderBasePackageKeys(value).map(productBuilderBasePackagePath);
  return [
    "이 설정은 등록 자료보다 우선하는 구현 대상 범위 계약이다.",
    `선택된 구현 경로(Allowed app paths): ${selectedPaths.join(", ")}`,
    `선택되지 않은 경로(Blocked app paths): ${blockedPaths.length ? blockedPaths.join(", ") : "(none)"}`,
    "기능정의서와 화면정의서는 선택된 apps/* 경로에 해당하는 표면만 확정 구현 범위로 작성한다.",
    "선택되지 않은 apps/* 경로가 자료에 등장하더라도 확정 구현 범위로 쓰지 말고 미확정/오픈 결정 또는 제외 범위로 남긴다.",
    ...productBuilderBasePackageSelections(value).map((item) => (
      `- ${item.basePath}: ${item.selected ? "사용" : "미사용"}${item.required ? " (필수)" : ""} — ${item.description}`
    )),
  ];
}

const PRODUCT_BUILDER_BASE_DRIZZLE_SCHEMA_ROOT = "product-builder-base:packages/drizzle/src/schema";
const PRODUCT_BUILDER_BASE_DRIZZLE_SCHEMA_INDEX = `${PRODUCT_BUILDER_BASE_DRIZZLE_SCHEMA_ROOT}/index.ts`;
const PRODUCT_BUILDER_BASE_FEATURES_ROOT = "product-builder-base:packages/features";
const PRODUCT_BUILDER_BASE_SERVER_ROOT = "product-builder-base:apps/server";
const PRODUCT_BUILDER_BASE_SERVER_APP_MODULE = `${PRODUCT_BUILDER_BASE_SERVER_ROOT}/src/app.module.ts`;

function productBuilderBaseDrizzleRef(
  packagePath: string,
  input: Omit<BaseDrizzleReference, "packagePath"> = {},
): BaseDrizzleReference {
  return {
    packagePath: `${PRODUCT_BUILDER_BASE_DRIZZLE_SCHEMA_ROOT}/${packagePath}`,
    ...input,
  };
}

type BaseDrizzleCapability = {
  id: string;
  label: string;
  keywords: readonly string[];
  refs: readonly BaseDrizzleReference[];
};

function productBuilderBaseFeatureApiRef(
  featurePackage: string,
  input: Omit<BaseFeatureApiReference, "packagePath"> = {},
): BaseFeatureApiReference {
  return {
    packagePath: `${PRODUCT_BUILDER_BASE_FEATURES_ROOT}/${featurePackage}`,
    providedBy: PRODUCT_BUILDER_BASE_SERVER_APP_MODULE,
    ...input,
  };
}

type BaseFeatureApiCapability = {
  id: string;
  label: string;
  keywords: readonly string[];
  refs: readonly BaseFeatureApiReference[];
};

const BASE_DRIZZLE_CAPABILITY_CATALOG: readonly BaseDrizzleCapability[] = [
  {
    id: "auth-profile-rbac",
    label: "인증/프로필/권한(Auth/Profile/RBAC)",
    keywords: ["auth", "login", "signup", "session", "user", "profile", "role", "permission", "회원", "로그인", "가입", "세션", "사용자", "프로필", "권한", "역할"],
    refs: [
      productBuilderBaseDrizzleRef("core/better-auth.ts", { exportName: "user, sessions, accounts, verifications", tableName: "users/sessions", reuseDecision: "REUSE" }),
      productBuilderBaseDrizzleRef("core/profiles.ts", { exportName: "profiles", tableName: "profiles", reuseDecision: "EXTEND" }),
      productBuilderBaseDrizzleRef("core/role-permission/index.ts", { exportName: "roles, permissions, rolePermissions, userRoles", tableName: "roles/user_roles", reuseDecision: "EXTEND" }),
    ],
  },
  {
    id: "files",
    label: "파일/첨부(File Upload)",
    keywords: ["file", "upload", "attachment", "image", "asset", "파일", "업로드", "첨부", "이미지", "에셋"],
    refs: [
      productBuilderBaseDrizzleRef("core/files.ts", { exportName: "files", tableName: "files", reuseDecision: "EXTEND" }),
    ],
  },
  {
    id: "payment",
    label: "결제/구독/쿠폰(Payment)",
    keywords: ["payment", "pay", "billing", "subscription", "order", "checkout", "coupon", "credit", "refund", "결제", "구독", "주문", "체크아웃", "쿠폰", "크레딧", "환불", "정산"],
    refs: [
      productBuilderBaseDrizzleRef("features/payment/index.ts", { exportName: "payment feature schema barrel", tableName: "payment_*", reuseDecision: "EXTEND" }),
    ],
  },
  {
    id: "community",
    label: "커뮤니티(Community)",
    keywords: ["community", "post", "comment", "vote", "reaction", "report", "moderation", "flair", "ban", "커뮤니티", "게시글", "댓글", "투표", "반응", "신고", "모더레이션", "운영자", "제재"],
    refs: [
      productBuilderBaseDrizzleRef("features/community/index.ts", { exportName: "communities, posts, comments, votes, reports", tableName: "community_*", reuseDecision: "EXTEND" }),
      productBuilderBaseDrizzleRef("features/comment/index.ts", { exportName: "comments", tableName: "comments", reuseDecision: "EXTEND" }),
      productBuilderBaseDrizzleRef("features/reaction/index.ts", { exportName: "reactions", tableName: "reactions", reuseDecision: "EXTEND" }),
    ],
  },
  {
    id: "notification-email",
    label: "알림/이메일(Notification/Email)",
    keywords: ["notification", "email", "mail", "template", "alimtalk", "message", "sms", "알림", "이메일", "메일", "템플릿", "알림톡", "문자", "발송"],
    refs: [
      productBuilderBaseDrizzleRef("features/notification/index.ts", { exportName: "notification schema", tableName: "notification_*", reuseDecision: "EXTEND" }),
      productBuilderBaseDrizzleRef("features/email/index.ts", { exportName: "email schema", tableName: "email_*", reuseDecision: "EXTEND" }),
    ],
  },
  {
    id: "project-content",
    label: "프로젝트/콘텐츠(Project/Content)",
    keywords: ["project", "workspace", "blog", "article", "프로젝트", "워크스페이스", "블로그", "아티클"],
    refs: [
      productBuilderBaseDrizzleRef("features/project/index.ts", { exportName: "project schema", tableName: "project_*", reuseDecision: "EXTEND" }),
      productBuilderBaseDrizzleRef("features/blog/index.ts", { exportName: "blog schema", tableName: "blog_*", reuseDecision: "EXTEND" }),
    ],
  },
  {
    id: "review-rating",
    label: "리뷰/평점(Review/Rating)",
    keywords: ["review", "reviews", "rating", "리뷰", "후기", "평점"],
    refs: [
      productBuilderBaseDrizzleRef("core/reviews.ts", { exportName: "reviews", tableName: "reviews", reuseDecision: "EXTEND" }),
    ],
  },
] as const;

const BASE_FEATURE_API_CAPABILITY_CATALOG: readonly BaseFeatureApiCapability[] = [
  {
    id: "auth-profile-rbac",
    label: "인증/프로필/권한(Auth/Profile/RBAC)",
    keywords: ["auth", "login", "signup", "session", "user", "profile", "role", "permission", "member", "회원", "로그인", "가입", "세션", "사용자", "프로필", "권한", "역할", "관리자"],
    refs: [
      productBuilderBaseFeatureApiRef("_common", {
        moduleName: "CommonFeatureModule",
        controllerPath: "packages/features/_common/controller/user-profile.controller.ts",
        servicePath: "packages/features/_common/service/user-profile.service.ts",
        dtoPath: "packages/features/_common/dto/index.ts",
        reuseDecision: "EXTEND",
      }),
      productBuilderBaseFeatureApiRef("_common", {
        moduleName: "CommonFeatureModule",
        controllerPath: "packages/features/_common/controller/admin-users.controller.ts",
        servicePath: "packages/features/_common/service/admin-users.service.ts",
        dtoPath: "packages/features/_common/dto/index.ts",
        reuseDecision: "EXTEND",
      }),
    ],
  },
  {
    id: "payment",
    label: "결제/구독/쿠폰(Payment)",
    keywords: ["payment", "pay", "billing", "subscription", "order", "checkout", "coupon", "credit", "refund", "결제", "구독", "주문", "체크아웃", "쿠폰", "크레딧", "환불", "정산"],
    refs: [
      productBuilderBaseFeatureApiRef("payment", {
        moduleName: "PaymentModule",
        controllerPath: "packages/features/payment/controller/payment.controller.ts",
        servicePath: "packages/features/payment/service/index.ts",
        dtoPath: "packages/features/payment/controller/payment.dto.ts",
        reuseDecision: "EXTEND",
      }),
      productBuilderBaseFeatureApiRef("payment", {
        moduleName: "PaymentModule",
        controllerPath: "packages/features/payment/controller/payment-admin.controller.ts",
        servicePath: "packages/features/payment/service/index.ts",
        dtoPath: "packages/features/payment/controller/payment.dto.ts",
        reuseDecision: "EXTEND",
        customizationScope: "admin API policy and response shape",
      }),
    ],
  },
  {
    id: "community",
    label: "커뮤니티(Community)",
    keywords: ["community", "post", "comment", "vote", "reaction", "report", "moderation", "flair", "ban", "커뮤니티", "게시글", "댓글", "투표", "반응", "신고", "모더레이션", "운영자", "제재"],
    refs: [
      productBuilderBaseFeatureApiRef("community", {
        moduleName: "CommunityModule",
        controllerPath: "packages/features/community/controller/community.controller.ts",
        servicePath: "packages/features/community/service/index.ts",
        dtoPath: "packages/features/community/dto/index.ts",
        reuseDecision: "EXTEND",
      }),
      productBuilderBaseFeatureApiRef("community", {
        moduleName: "CommunityModule",
        controllerPath: "packages/features/community/controller/community-admin.controller.ts",
        servicePath: "packages/features/community/service/index.ts",
        dtoPath: "packages/features/community/dto/index.ts",
        reuseDecision: "EXTEND",
        customizationScope: "admin moderation workflow and permission policy",
      }),
      productBuilderBaseFeatureApiRef("comment", {
        moduleName: "CommentModule",
        controllerPath: "packages/features/comment/controller/comment.controller.ts",
        servicePath: "packages/features/comment/service/index.ts",
        dtoPath: "packages/features/comment/dto/index.ts",
        reuseDecision: "EXTEND",
      }),
      productBuilderBaseFeatureApiRef("reaction", {
        moduleName: "ReactionModule",
        controllerPath: "packages/features/reaction/controller/reaction.controller.ts",
        servicePath: "packages/features/reaction/service/index.ts",
        dtoPath: "packages/features/reaction/dto/index.ts",
        reuseDecision: "EXTEND",
      }),
    ],
  },
  {
    id: "notification-email-message",
    label: "알림/이메일/문자(Notification/Email/Message)",
    keywords: ["notification", "email", "mail", "template", "alimtalk", "message", "sms", "알림", "이메일", "메일", "템플릿", "알림톡", "문자", "발송"],
    refs: [
      productBuilderBaseFeatureApiRef("notification", {
        moduleName: "NotificationModule",
        controllerPath: "packages/features/notification/controller/notification.controller.ts",
        servicePath: "packages/features/notification/service/index.ts",
        dtoPath: "packages/features/notification/dto/index.ts",
        reuseDecision: "EXTEND",
      }),
      productBuilderBaseFeatureApiRef("email", {
        moduleName: "EmailModule",
        controllerPath: "packages/features/email/controller/email.controller.ts",
        servicePath: "packages/features/email/service/index.ts",
        dtoPath: "packages/features/email/dto/index.ts",
        reuseDecision: "EXTEND",
      }),
      productBuilderBaseFeatureApiRef("message-sending", {
        moduleName: "MessageSendingModule",
        controllerPath: "packages/features/message-sending/controller/message-sending.controller.ts",
        servicePath: "packages/features/message-sending/service/index.ts",
        dtoPath: "packages/features/message-sending/dto/index.ts",
        reuseDecision: "EXTEND",
      }),
    ],
  },
  {
    id: "project-content",
    label: "프로젝트/콘텐츠(Project/Content)",
    keywords: ["project", "workspace", "blog", "article", "story", "프로젝트", "워크스페이스", "블로그", "아티클", "스토리"],
    refs: [
      productBuilderBaseFeatureApiRef("project", {
        moduleName: "ProjectModule",
        controllerPath: "packages/features/project/controller/project.controller.ts",
        servicePath: "packages/features/project/service/index.ts",
        dtoPath: "packages/features/project/dto/index.ts",
        reuseDecision: "EXTEND",
      }),
      productBuilderBaseFeatureApiRef("blog", {
        moduleName: "BlogModule",
        controllerPath: "packages/features/blog/controller/blog.controller.ts",
        servicePath: "packages/features/blog/service/index.ts",
        dtoPath: "packages/features/blog/dto/index.ts",
        reuseDecision: "EXTEND",
      }),
      productBuilderBaseFeatureApiRef("story", {
        moduleName: "StoryModule",
        controllerPath: "packages/features/story/controller/story.controller.ts",
        servicePath: "packages/features/story/service/index.ts",
        dtoPath: "packages/features/story/dto/index.ts",
        reuseDecision: "EXTEND",
      }),
      productBuilderBaseFeatureApiRef("feedback", {
        moduleName: "FeedbackModule",
        controllerPath: "packages/features/feedback/controller/feedback.controller.ts",
        servicePath: "packages/features/feedback/service/index.ts",
        dtoPath: "packages/features/feedback/dto/index.ts",
        reuseDecision: "EXTEND",
      }),
    ],
  },
  {
    id: "learning-localization-onboarding",
    label: "강의/온보딩/현지화(Learning/Onboarding/Localization)",
    keywords: ["lecture", "course", "video", "lesson", "onboarding", "language", "translation", "localization", "강의", "수강", "영상", "온보딩", "언어", "번역", "현지화"],
    refs: [
      productBuilderBaseFeatureApiRef("video-lecture", {
        moduleName: "VideoLectureModule",
        controllerPath: "packages/features/video-lecture/controller/video-lecture.controller.ts",
        servicePath: "packages/features/video-lecture/service/index.ts",
        reuseDecision: "EXTEND",
      }),
      productBuilderBaseFeatureApiRef("onboarding", {
        moduleName: "OnboardingModule",
        controllerPath: "packages/features/onboarding/controller/onboarding.controller.ts",
        servicePath: "packages/features/onboarding/service/index.ts",
        dtoPath: "packages/features/onboarding/dto/index.ts",
        reuseDecision: "EXTEND",
      }),
      productBuilderBaseFeatureApiRef("localization", {
        moduleName: "LocalizationModule",
        controllerPath: "packages/features/localization/controller/localization.controller.ts",
        servicePath: "packages/features/localization/service/index.ts",
        dtoPath: "packages/features/localization/dto/index.ts",
        reuseDecision: "EXTEND",
      }),
    ],
  },
] as const;

function normalizeBaseSchemaReuseDecision(value: unknown): BaseSchemaReuseDecision | undefined {
  return BASE_SCHEMA_REUSE_DECISIONS.includes(value as BaseSchemaReuseDecision)
    ? value as BaseSchemaReuseDecision
    : undefined;
}

function normalizeBaseDrizzleReferences(value: unknown): BaseDrizzleReference[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): BaseDrizzleReference[] => {
    if (typeof item === "string" && item.trim()) return [{ packagePath: item.trim() }];
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const packagePath = typeof record.packagePath === "string" && record.packagePath.trim()
      ? record.packagePath.trim()
      : typeof record.path === "string" && record.path.trim()
        ? record.path.trim()
        : "";
    if (!packagePath) return [];
    return [{
      packagePath,
      exportName: typeof record.exportName === "string" && record.exportName.trim() ? record.exportName.trim() : undefined,
      tableName: typeof record.tableName === "string" && record.tableName.trim() ? record.tableName.trim() : undefined,
      reuseDecision: normalizeBaseSchemaReuseDecision(record.reuseDecision ?? record.decision),
      note: typeof record.note === "string" && record.note.trim() ? record.note.trim() : undefined,
    }];
  });
}

function normalizeBaseFeatureApiReferences(value: unknown): BaseFeatureApiReference[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): BaseFeatureApiReference[] => {
    if (typeof item === "string" && item.trim()) return [{ packagePath: item.trim() }];
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const packagePath = typeof record.packagePath === "string" && record.packagePath.trim()
      ? record.packagePath.trim()
      : typeof record.path === "string" && record.path.trim()
        ? record.path.trim()
        : "";
    if (!packagePath) return [];
    return [{
      packagePath,
      moduleName: typeof record.moduleName === "string" && record.moduleName.trim() ? record.moduleName.trim() : undefined,
      controllerPath: typeof record.controllerPath === "string" && record.controllerPath.trim() ? record.controllerPath.trim() : undefined,
      servicePath: typeof record.servicePath === "string" && record.servicePath.trim() ? record.servicePath.trim() : undefined,
      dtoPath: typeof record.dtoPath === "string" && record.dtoPath.trim() ? record.dtoPath.trim() : undefined,
      providedBy: typeof record.providedBy === "string" && record.providedBy.trim() ? record.providedBy.trim() : undefined,
      reuseDecision: normalizeBaseSchemaReuseDecision(record.reuseDecision ?? record.decision),
      customizationScope: typeof record.customizationScope === "string" && record.customizationScope.trim() ? record.customizationScope.trim() : undefined,
      note: typeof record.note === "string" && record.note.trim() ? record.note.trim() : undefined,
    }];
  });
}

function stringArrayFromUnknown(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : [];
}

function meaningfulString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || /^(undefined|null|n\/a)$/i.test(trimmed)) return undefined;
    return trimmed;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

function firstMeaningfulString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const text = meaningfulString(value);
    if (text) return text;
  }
  return undefined;
}

function meaningfulStringList(...values: unknown[]): string[] | undefined {
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    const out = value
      .map((item) => meaningfulString(item))
      .filter((item): item is string => Boolean(item));
    if (out.length) return out;
  }
  return undefined;
}

function recordArrayFromUnknown(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function booleanFromUnknown(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "y", "required", "필수", "1"].includes(normalized)) return true;
    if (["false", "no", "n", "optional", "nullable", "선택", "0"].includes(normalized)) return false;
  }
  return undefined;
}

function requiredFromFieldRecord(record: Record<string, unknown>): boolean {
  const direct = booleanFromUnknown(record.required ?? record.isRequired ?? record.mandatory ?? record.notNull);
  if (direct !== undefined) return direct;
  const nullable = booleanFromUnknown(record.nullable ?? record.isNullable ?? record.optional);
  if (nullable !== undefined) return !nullable;
  return false;
}

function schemaFieldFromString(value: string): SchemaField | null {
  const text = meaningfulString(value);
  if (!text) return null;
  const match = text.match(/^`?([A-Za-z0-9_.$-]+)`?\s*(?::|\||-)\s*([^|-]+)(?:\s*(?:\||-)\s*(.+))?$/);
  if (!match) {
    const tokens = text.replace(/`/g, "").split(/\s+/).filter(Boolean);
    if (tokens.length >= 2) {
      const [name, type, ...rest] = tokens;
      const validation = rest.join(" ").trim();
      return {
        name,
        type,
        required: !/\b(nullable|optional|null|선택)\b/i.test(text),
        description: validation ? `${name} 컬럼. 제약/의미: ${validation}.` : `${name} 컬럼.`,
        validation: validation || undefined,
        example: text,
      };
    }
    return {
      name: text,
      type: "미정(Undecided)",
      required: false,
      description: "원문 문자열로 제공된 필드다. 타입과 제약 조건 보완이 필요하다.",
    };
  }
  return {
    name: match[1].trim(),
    type: match[2].trim(),
    required: !/\b(nullable|optional|null|선택)\b/i.test(text),
    description: match[3]?.trim() || `${match[1].trim()} 필드`,
  };
}

function normalizeSchemaFields(value: unknown): SchemaField[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): SchemaField[] => {
    if (typeof item === "string") {
      const field = schemaFieldFromString(item);
      return field ? [field] : [];
    }
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const name = firstMeaningfulString(
      record.name,
      record.fieldName,
      record.columnName,
      record.column,
      record.field,
      record.key,
      record.property,
      record.attribute,
    );
    const type = firstMeaningfulString(
      record.type,
      record.fieldType,
      record.columnType,
      record.dataType,
      record.dbType,
      record.drizzleType,
      record.tsType,
    );
    if (!name && !type) return [];
    const description = firstMeaningfulString(
      record.description,
      record.fieldDescription,
      record.columnDescription,
      record.comment,
      record.meaning,
      record.purpose,
      record.label,
    );
    return [{
      name: name ?? "미정(Undecided)",
      type: type ?? "미정(Undecided)",
      required: requiredFromFieldRecord(record),
      description: description ?? `${name ?? "해당"} 컬럼의 목적과 저장 값을 확정해야 한다.`,
      validation: firstMeaningfulString(record.validation, record.constraint, record.constraints, record.rule, record.rules),
      example: firstMeaningfulString(record.example, record.sample, record.sampleValue, record.defaultValue),
    }];
  });
}

type SchemaMermaidEntity = {
  schema: SchemaDefinition;
  id: string;
  fields: SchemaField[];
  aliases: string[];
};

function mermaidIdentifier(value: unknown, fallback: string): string {
  const raw = meaningfulString(value) ?? fallback;
  const identifier = raw
    .replace(/`/g, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  const safe = identifier || fallback;
  return /^[0-9]/.test(safe) ? `T_${safe}` : safe;
}

function mermaidFieldName(value: unknown, fallback: string): string {
  const raw = meaningfulString(value) ?? fallback;
  const identifier = raw
    .replace(/`/g, "")
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const safe = identifier || fallback;
  return /^[0-9]/.test(safe) ? `f_${safe}` : safe;
}

function mermaidFieldType(value: unknown): string {
  const raw = (meaningfulString(value) ?? "string").toLowerCase();
  const isArray = /\[\]|\barray\b|\blist\b/.test(raw);
  const withArray = (type: string) => isArray ? `${type}[]` : type;
  if (raw.includes("uuid")) return withArray("uuid");
  if (raw.includes("bool")) return withArray("boolean");
  if (raw.includes("int") || raw.includes("serial")) return withArray("int");
  if (raw.includes("numeric") || raw.includes("decimal") || raw.includes("float") || raw.includes("double")) return withArray("float");
  if (raw.includes("date") || raw.includes("time")) return withArray("datetime");
  if (raw.includes("json")) return withArray("json");
  if (raw.includes("text") || raw.includes("char") || raw.includes("enum") || raw.includes("string")) return withArray("string");
  if (/\s/.test(raw)) return "string";
  const normalized = raw.replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || "string";
  return withArray(normalized);
}

function relationTextForField(schema: SchemaDefinition, field: SchemaField): string {
  const fieldAliases = new Set([
    field.name.toLowerCase(),
    mermaidFieldName(field.name, "field").toLowerCase(),
    normalizedMatchText(field.name),
  ]);
  return (schema.relations ?? []).filter((relation) => {
    const arrowMatch = relation.match(/([A-Za-z0-9_.$-]+)\s*->\s*([A-Za-z0-9_.$-]+)/);
    if (!arrowMatch) return false;
    const sourceField = arrowMatch[1].split(".").filter(Boolean).pop() ?? arrowMatch[1];
    return fieldAliases.has(sourceField.toLowerCase())
      || fieldAliases.has(mermaidFieldName(sourceField, "field").toLowerCase())
      || fieldAliases.has(normalizedMatchText(sourceField));
  }).join(" ");
}

function mermaidFieldKey(field: SchemaField, schema?: SchemaDefinition): string {
  const text = [
    field.name,
    field.description,
    field.validation,
    schema ? relationTextForField(schema, field) : "",
  ].filter(Boolean).join(" ").toLowerCase();
  const keys: string[] = [];
  if ((field.required && mermaidFieldName(field.name, "field").toLowerCase() === "id") || /\bprimary\s+key\b|\bpk\b/.test(text)) keys.push("PK");
  if (/\bforeign\s+key\b|\bfk\b|->/.test(text)) keys.push("FK");
  if (/\bunique\b|\buk\b/.test(text)) keys.push("UK");
  return keys.join(", ");
}

function mermaidFieldComment(field: SchemaField): string {
  const raw = meaningfulString(field.description);
  if (!raw) return "";
  const comment = raw
    .replace(/["\\]/g, "'")
    .replace(/[{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return comment ? ` "${comment}"` : "";
}

function normalizedMermaidAlias(value: unknown): string | null {
  const raw = meaningfulString(value);
  if (!raw) return null;
  const normalized = raw.replace(/[^A-Za-z0-9]+/g, "").toLowerCase();
  return normalized || null;
}

function schemaMermaidAliases(schema: SchemaDefinition, id: string): string[] {
  const aliases = [
    schema.code,
    schema.name,
    schema.tableName,
    schema.drizzleExportName,
    id,
  ].flatMap((value) => {
    const alias = normalizedMermaidAlias(value);
    return alias ? [alias] : [];
  });
  const tableName = meaningfulString(schema.tableName);
  if (tableName) {
    for (const part of tableName.split(/[_\-\s]+/)) {
      const alias = normalizedMermaidAlias(part);
      if (alias) aliases.push(alias);
      if (alias?.endsWith("s") && alias.length > 3) aliases.push(alias.slice(0, -1));
    }
  }
  return [...new Set(aliases)];
}

function schemaMermaidEntities(plan: BlueprintPrd): SchemaMermaidEntity[] {
  const used = new Set<string>();
  return plan.schemas.map((schema, index) => {
    const baseId = mermaidIdentifier(schema.tableName ?? schema.drizzleExportName ?? schema.code, `SCHEMA_${index + 1}`);
    let id = baseId;
    let suffix = 2;
    while (used.has(id)) {
      id = `${baseId}_${suffix}`;
      suffix += 1;
    }
    used.add(id);
    return {
      schema,
      id,
      fields: normalizeSchemaFields((schema as SchemaDefinition & Record<string, unknown>).fields),
      aliases: schemaMermaidAliases(schema, id),
    };
  });
}

function resolveMermaidEntityId(
  token: string,
  aliasToId: ReadonlyMap<string, string>,
): string {
  const alias = normalizedMermaidAlias(token);
  if (alias) {
    const matched = aliasToId.get(alias);
    if (matched) return matched;
  }
  return mermaidIdentifier(token, "EXTERNAL_ENTITY");
}

function mermaidRelationSyntax(cardinality: string): string {
  switch (cardinality.toUpperCase()) {
    case "1:N":
      return "||--o{";
    case "N:1":
      return "}o--||";
    case "1:1":
      return "||--||";
    case "N:M":
    case "M:N":
      return "}o--o{";
    default:
      return "}o--||";
  }
}

type SchemaMermaidRelation = {
  from: string;
  syntax: string;
  to: string;
  label: string;
  source: string;
  cardinality: string;
  sourceSchemaCode: string;
};

function mermaidRelationLabel(value: unknown, fallback: string): string {
  const raw = meaningfulString(value) ?? fallback;
  const normalized = raw
    .replace(/[`|{}:]/g, " ")
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "");
  return (normalized || fallback).slice(0, 64);
}

function relationFieldLabel(token: string): string {
  const parts = token.split(".").filter(Boolean);
  const field = parts.length ? parts[parts.length - 1] : token;
  return mermaidRelationLabel(field, "references");
}

function mermaidCardinalityLabel(cardinality: string): string {
  switch (cardinality.toUpperCase()) {
    case "1:N":
      return "has_many";
    case "N:1":
      return "belongs_to";
    case "1:1":
      return "has_one";
    case "N:M":
    case "M:N":
      return "many_to_many";
    default:
      return "relates";
  }
}

function schemaMermaidRelations(entities: readonly SchemaMermaidEntity[]): SchemaMermaidRelation[] {
  const aliasToId = new Map<string, string>();
  for (const entity of entities) {
    for (const alias of entity.aliases) {
      if (!aliasToId.has(alias)) aliasToId.set(alias, entity.id);
    }
  }
  const seen = new Set<string>();
  const relations: SchemaMermaidRelation[] = [];
  const addRelation = (relation: SchemaMermaidRelation) => {
    const key = `${relation.from}|${relation.syntax}|${relation.to}|${relation.label}`;
    if (seen.has(key)) return;
    seen.add(key);
    relations.push(relation);
  };
  for (const entity of entities) {
    for (const relation of entity.schema.relations ?? []) {
      const arrowMatch = relation.match(/([A-Za-z0-9_.$-]+)\s*->\s*([A-Za-z0-9_.$-]+)/);
      if (arrowMatch) {
        const target = resolveMermaidEntityId(arrowMatch[2].split(".")[0], aliasToId);
        addRelation({
          from: entity.id,
          syntax: "}o--||",
          to: target,
          label: relationFieldLabel(arrowMatch[1]),
          source: relation,
          cardinality: "N:1",
          sourceSchemaCode: entity.schema.code,
        });
        continue;
      }
      const cardinalityMatch = relation.match(/^\s*([A-Za-z0-9_.$-]+)\s+(1:N|N:1|1:1|N:M|M:N)\s+([A-Za-z0-9_.$-]+)/i);
      if (cardinalityMatch) {
        const left = resolveMermaidEntityId(cardinalityMatch[1], aliasToId);
        const syntax = mermaidRelationSyntax(cardinalityMatch[2]);
        const right = resolveMermaidEntityId(cardinalityMatch[3], aliasToId);
        addRelation({
          from: left,
          syntax,
          to: right,
          label: mermaidCardinalityLabel(cardinalityMatch[2]),
          source: relation,
          cardinality: cardinalityMatch[2].toUpperCase(),
          sourceSchemaCode: entity.schema.code,
        });
      }
    }
  }
  return relations;
}

function schemaMermaidRelationEdges(
  entities: readonly SchemaMermaidEntity[],
  sourceSchemaCodes?: ReadonlySet<string>,
): string[] {
  return schemaMermaidRelations(entities)
    .filter((relation) => !sourceSchemaCodes || sourceSchemaCodes.has(relation.sourceSchemaCode))
    .map((relation) => `    ${relation.from} ${relation.syntax} ${relation.to} : ${relation.label}`);
}

function renderSchemaMermaidErDiagramFromEntities(
  entities: readonly SchemaMermaidEntity[],
  options: {
    relationSourceSchemaCodes?: ReadonlySet<string>;
    emptyEntityId?: string;
    emptyFieldName?: string;
    emptyFieldComment?: string;
  } = {},
): string {
  const lines = ["```mermaid", "erDiagram"];
  if (!entities.length) {
    const emptyEntityId = options.emptyEntityId ?? "SCHEMA_UNDECIDED";
    const fieldName = options.emptyFieldName ?? "id";
    const comment = options.emptyFieldComment
      ? ` "${options.emptyFieldComment.replace(/["\\]/g, "'").replace(/\s+/g, " ").trim().slice(0, 120)}"`
      : "";
    lines.push(`    ${emptyEntityId} {`, `        string ${fieldName}${comment}`, "    }", "```");
    return lines.join("\n");
  }
  for (const entity of entities) {
    lines.push(`    ${entity.id} {`);
    const fields = entity.fields.length
      ? entity.fields
      : [{ name: "id", type: "string", required: true, description: "임시 식별자" } satisfies SchemaField];
    for (const [index, field] of fields.entries()) {
      const type = mermaidFieldType(field.type);
      const name = mermaidFieldName(field.name, `field_${index + 1}`);
      const key = mermaidFieldKey(field, entity.schema);
      const comment = mermaidFieldComment(field);
      lines.push(`        ${type} ${name}${key ? ` ${key}` : ""}${comment}`);
    }
    lines.push("    }");
  }
  const edges = schemaMermaidRelationEdges(entities, options.relationSourceSchemaCodes);
  if (edges.length) lines.push(...edges);
  lines.push("```");
  return lines.join("\n");
}

function renderSchemaMermaidErDiagram(plan: BlueprintPrd): string {
  return renderSchemaMermaidErDiagramFromEntities(schemaMermaidEntities(plan));
}

function apiParameterFromString(value: string): ApiParameter | null {
  const text = meaningfulString(value);
  if (!text) return null;
  const match = text.match(/^`?([A-Za-z0-9_.$-]+)`?\s*(?::|\||-)\s*([^|-]+)(?:\s*(?:\||-)\s*(.+))?$/);
  if (!match) {
    const tokens = text.replace(/`/g, "").split(/\s+/).filter(Boolean);
    if (tokens.length >= 2) {
      const [name, type, ...rest] = tokens;
      const description = rest.join(" ").trim();
      return {
        name,
        type,
        required: !/\b(nullable|optional|null|선택)\b/i.test(text),
        description: description || `${name} 파라미터`,
      };
    }
    return {
      name: text,
      type: "미정(Undecided)",
      required: false,
      description: "원문 문자열로 제공된 API 파라미터다. 타입과 위치 보완이 필요하다.",
    };
  }
  return {
    name: match[1].trim(),
    type: match[2].trim(),
    required: !/\b(nullable|optional|null|선택)\b/i.test(text),
    description: match[3]?.trim() || `${match[1].trim()} 파라미터`,
  };
}

function normalizeApiParameters(value: unknown): ApiParameter[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): ApiParameter[] => {
    if (typeof item === "string") {
      const parameter = apiParameterFromString(item);
      return parameter ? [parameter] : [];
    }
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const name = firstMeaningfulString(record.name, record.fieldName, record.paramName, record.parameterName, record.key, record.property);
    const type = firstMeaningfulString(record.type, record.fieldType, record.paramType, record.dataType, record.tsType, record.schema);
    if (!name && !type) return [];
    const description = firstMeaningfulString(record.description, record.fieldDescription, record.paramDescription, record.comment, record.meaning, record.purpose);
    return [{
      name: name ?? "미정(Undecided)",
      type: type ?? "미정(Undecided)",
      required: requiredFromFieldRecord(record),
      description: description ?? `${name ?? "해당"} 파라미터의 목적과 값을 확정해야 한다.`,
    }];
  });
}

function normalizeApiErrors(value: unknown): Array<{ code: string; condition: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): Array<{ code: string; condition: string }> => {
    if (typeof item === "string") {
      const text = meaningfulString(item);
      if (!text) return [];
      const match = text.match(/^([A-Za-z0-9_.-]+)\s+(.*)$/) ?? text.match(/^([^:|-]+)(?::|-)\s*(.+)$/);
      return [{
        code: match?.[1]?.trim() || "미정(Undecided)",
        condition: match?.[2]?.trim() || text,
      }];
    }
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const code = firstMeaningfulString(record.code, record.status, record.statusCode, record.httpStatus, record.errorCode);
    const condition = firstMeaningfulString(record.condition, record.message, record.description, record.reason, record.when);
    if (!code && !condition) return [];
    return [{
      code: code ?? "미정(Undecided)",
      condition: condition ?? "오류 발생 조건을 확정해야 한다.",
    }];
  });
}

function normalizeRequirementCodeRefs(value: unknown, requirements: readonly FunctionalRequirement[]): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const byCode = new Map(requirements.map((requirement) => [requirement.code.toLowerCase(), requirement.code]));
  const byTitle = new Map(requirements.map((requirement) => [normalizedMatchText(requirement.title), requirement.code]));
  const out = new Set<string>();
  for (const item of values) {
    const raw = typeof item === "object" && item
      ? firstMeaningfulString(
        (item as Record<string, unknown>).code,
        (item as Record<string, unknown>).featureCode,
        (item as Record<string, unknown>).requirementCode,
        (item as Record<string, unknown>).title,
        (item as Record<string, unknown>).name,
      )
      : meaningfulString(item);
    if (!raw) continue;
    const exact = byCode.get(raw.toLowerCase());
    if (exact) {
      out.add(exact);
      continue;
    }
    const normalized = normalizedMatchText(raw);
    const titleMatch = byTitle.get(normalized);
    if (titleMatch) {
      out.add(titleMatch);
      continue;
    }
    for (const requirement of requirements) {
      const requirementTitle = normalizedMatchText(requirement.title);
      if (normalized.includes(requirementTitle) || requirementTitle.includes(normalized)) {
        out.add(requirement.code);
      }
    }
  }
  return [...out];
}

function normalizedMatchText(value: string): string {
  return value.toLowerCase().replace(/[\s_-]+/g, " ").trim();
}

const SCHEMA_FEATURE_MATCH_STOP_WORDS = new Set([
  "id",
  "uuid",
  "string",
  "text",
  "int",
  "date",
  "time",
  "true",
  "false",
  "null",
  "nullable",
  "not",
  "default",
  "created",
  "updated",
  "deleted",
  "at",
  "by",
  "is",
  "has",
  "and",
  "or",
  "the",
  "a",
  "an",
  "of",
  "to",
  "for",
  "with",
  "기능",
  "화면",
  "데이터",
  "컬럼",
  "제약",
  "의미",
  "저장",
  "관리",
  "기준",
  "상태",
  "정보",
]);

const MIN_SCHEMA_FEATURE_MATCH_SCORE = 9;
const MIN_SCHEMA_CLUSTER_MATCH_SCORE = 4;

const SCHEMA_FEATURE_MATCH_SYNONYMS: Record<string, string[]> = {
  user: ["users", "member", "members", "사용자", "회원"],
  users: ["user", "member", "members", "사용자", "회원"],
  member: ["user", "users", "사용자", "회원"],
  회원: ["user", "member", "사용자"],
  사용자: ["user", "member", "회원"],
  role: ["permission", "permissions", "tier", "grade", "권한", "등급"],
  permission: ["role", "tier", "권한", "등급"],
  tier: ["role", "permission", "등급", "권한"],
  권한: ["role", "permission", "tier"],
  등급: ["tier", "role", "permission"],
  auth: ["authentication", "login", "oauth", "social", "인증", "로그인"],
  authentication: ["auth", "login", "oauth", "인증", "로그인"],
  account: ["accounts", "계정"],
  accounts: ["account", "계정"],
  social: ["oauth", "소셜"],
  oauth: ["social", "auth", "소셜", "인증"],
  withdrawal: ["withdraw", "탈퇴"],
  withdraw: ["withdrawal", "탈퇴"],
  탈퇴: ["withdrawal", "withdraw"],
  community: ["communities", "post", "posts", "feed", "커뮤니티", "게시글", "피드"],
  post: ["posts", "community", "feed", "게시글", "커뮤니티"],
  posts: ["post", "community", "feed", "게시글", "커뮤니티"],
  feed: ["community", "post", "posts", "피드", "게시글"],
  커뮤니티: ["community", "post", "posts"],
  게시글: ["post", "posts", "community", "feed"],
  comment: ["comments", "reply", "replies", "댓글", "대댓글", "답글"],
  comments: ["comment", "reply", "replies", "댓글", "대댓글", "답글"],
  reply: ["comment", "comments", "댓글", "대댓글", "답글"],
  댓글: ["comment", "comments", "reply"],
  대댓글: ["reply", "comment", "comments"],
  답글: ["reply", "comment", "comments"],
  reaction: ["reactions", "like", "likes", "공감", "반응"],
  reactions: ["reaction", "like", "likes", "공감", "반응"],
  공감: ["reaction", "like"],
  report: ["reports", "신고"],
  reports: ["report", "신고"],
  신고: ["report", "reports"],
  verification: ["verify", "verified", "certification", "인증", "검증"],
  verified: ["verification", "verify", "인증", "검증"],
  verify: ["verification", "verified", "인증", "검증"],
  인증: ["verification", "verified", "auth"],
  검증: ["verification", "verify"],
  review: ["reviews", "리뷰", "후기"],
  reviews: ["review", "리뷰", "후기"],
  리뷰: ["review", "reviews"],
  favorite: ["favorites", "bookmark", "bookmarks", "즐겨찾기"],
  favorites: ["favorite", "bookmark", "bookmarks", "즐겨찾기"],
  bookmark: ["favorite", "favorites", "즐겨찾기"],
  즐겨찾기: ["favorite", "bookmark"],
  notification: ["notifications", "notice", "alert", "알림"],
  notifications: ["notification", "notice", "alert", "알림"],
  알림: ["notification", "notifications"],
  banner: ["banners", "배너"],
  banners: ["banner", "배너"],
  배너: ["banner", "banners"],
  search: ["검색"],
  filter: ["filters", "필터"],
  filters: ["filter", "필터"],
  검색: ["search"],
  필터: ["filter", "filters"],
};

type SchemaFeatureClusterCatalogEntry = {
  key: string;
  title: string;
  keywords: string[];
};

const SCHEMA_FEATURE_CLUSTER_CATALOG: readonly SchemaFeatureClusterCatalogEntry[] = [
  {
    key: "user-auth-account",
    title: "회원/인증/계정(User/Auth/Account)",
    keywords: ["회원", "사용자", "가입", "로그인", "인증", "계정", "권한", "등급", "탈퇴", "oauth", "social login", "auth", "account", "member", "permission", "tier", "withdrawal"],
  },
  {
    key: "my-page",
    title: "마이페이지(My Page)",
    keywords: ["마이페이지", "my page", "my-page", "profile", "내 정보", "프로필", "계정 설정"],
  },
  {
    key: "my-activity",
    title: "내 활동(My Activity)",
    keywords: ["내 활동", "활동", "활동 내역", "activity", "my activity", "작성글", "내 댓글", "히스토리"],
  },
  {
    key: "customer-support",
    title: "고객지원(Support)",
    keywords: ["고객지원", "고객 지원", "support", "문의", "문의하기", "faq", "help", "helpdesk", "cs"],
  },
  {
    key: "community-post",
    title: "커뮤니티/게시글(Community/Post)",
    keywords: ["커뮤니티", "게시글", "피드", "글쓰기", "community", "post", "posts", "feed"],
  },
  {
    key: "comment-reply",
    title: "댓글/답글(Comment/Reply)",
    keywords: ["댓글", "대댓글", "답글", "comment", "comments", "reply", "replies"],
  },
  {
    key: "reaction-like",
    title: "반응/공감(Reaction/Like)",
    keywords: ["반응", "공감", "좋아요", "reaction", "reactions", "like", "likes"],
  },
  {
    key: "report-moderation",
    title: "신고/검수(Report/Moderation)",
    keywords: ["신고", "검수", "차단", "금칙어", "moderation", "report", "reports", "abuse", "blocklist"],
  },
  {
    key: "review-rating",
    title: "리뷰/평점(Review/Rating)",
    keywords: ["리뷰", "후기", "review", "reviews", "rating", "평점"],
  },
  {
    key: "favorite-bookmark",
    title: "즐겨찾기/북마크(Favorite/Bookmark)",
    keywords: ["즐겨찾기", "북마크", "favorite", "favorites", "bookmark", "bookmarks", "save"],
  },
  {
    key: "search-discovery",
    title: "검색/탐색(Search/Discovery)",
    keywords: ["검색", "탐색", "필터", "찾기", "search", "discovery", "filter", "filters"],
  },
  {
    key: "home-content",
    title: "홈 콘텐츠/노출(Home Content)",
    keywords: ["홈", "메인", "콘텐츠", "배너", "추천", "노출", "home", "main", "content", "banner", "recommendation"],
  },
  {
    key: "notice-policy",
    title: "공지/정책(Notice/Policy)",
    keywords: ["공지", "알림", "정책", "약관", "notice", "notification", "policy", "terms"],
  },
  {
    key: "admin-operation",
    title: "운영 어드민/감사(Admin Operation/Audit)",
    keywords: ["관리자", "운영자", "어드민", "백오피스", "감사", "로그", "admin", "operator", "backoffice", "audit", "log"],
  },
];

type SchemaFeatureCluster = {
  key: string;
  title: string;
  labels: string[];
  requirements: FunctionalRequirement[];
  splitFromRequirement: boolean;
};

const FEATURE_ACTION_ONLY_LABEL_PATTERN = /^(?:수정|edit|삭제|delete|임시저장|draft|저장|save|작성|write|생성|create|등록|register|발행|publish|취소|cancel|복구|restore)(?:\s*\([^)]*\))?$/i;

const SCHEMA_CLUSTER_REQUIRED_MAIN_TOKENS: Record<string, string[]> = {
  "comment-reply": ["comment", "comments", "reply", "replies", "댓글", "대댓글", "답글"],
  "reaction-like": ["reaction", "reactions", "like", "likes", "반응", "공감", "좋아요"],
  "report-moderation": ["report", "reports", "moderation", "신고", "검수", "차단"],
  "review-rating": ["review", "reviews", "rating", "리뷰", "후기", "평점"],
  "favorite-bookmark": ["favorite", "favorites", "bookmark", "bookmarks", "즐겨찾기", "북마크"],
  "home-content": ["home", "homes", "banner", "banners", "content", "contents", "홈", "메인", "배너", "콘텐츠", "추천", "노출"],
  "notice-policy": ["notice", "notices", "policy", "policies", "terms", "공지", "정책", "약관"],
  "admin-operation": ["admin", "audit", "audits", "log", "logs", "관리자", "운영자", "어드민", "감사", "로그"],
};

const SCHEMA_CLUSTER_EXCLUDED_MAIN_TOKENS: Record<string, string[]> = {
  "home-content": ["audit", "admin", "감사", "관리자", "moderation", "report", "신고", "검수"],
  "admin-operation": ["home", "banner", "홈", "배너", "notice", "공지"],
  "notice-policy": ["home", "banner", "홈", "배너", "audit", "admin", "감사", "관리자"],
};

function schemaFeatureMatchTokens(value: string): Set<string> {
  const expanded = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[`"'()[\]{}<>|,.;:/\\_-]+/g, " ");
  const out = new Set<string>();
  for (const rawToken of expanded.split(/\s+/)) {
    const token = rawToken.trim();
    if (token.length < 2 || SCHEMA_FEATURE_MATCH_STOP_WORDS.has(token)) continue;
    out.add(token);
    if (/^[a-z0-9]+s$/.test(token) && token.length > 3) out.add(token.slice(0, -1));
    for (const synonym of SCHEMA_FEATURE_MATCH_SYNONYMS[token] ?? []) {
      if (!SCHEMA_FEATURE_MATCH_STOP_WORDS.has(synonym)) out.add(synonym);
    }
  }
  return out;
}

function schemaFeatureTokenOverlapScore(left: ReadonlySet<string>, right: ReadonlySet<string>): number {
  let score = 0;
  for (const token of left) {
    if (!right.has(token)) continue;
    if (/[가-힣]/.test(token)) {
      score += token.length >= 2 ? 2 : 1;
    } else {
      score += token.length >= 4 ? 2 : 1;
    }
  }
  return score;
}

function schemaFeatureCatalogMatchScore(text: string, entry: SchemaFeatureClusterCatalogEntry): number {
  const normalized = normalizedMatchText(text);
  const textTokens = schemaFeatureMatchTokens(text);
  let score = 0;
  for (const keyword of entry.keywords) {
    const normalizedKeyword = normalizedMatchText(keyword);
    if (!normalizedKeyword) continue;
    if (normalized.includes(normalizedKeyword)) score += keyword.length >= 4 ? 3 : 2;
    const keywordTokens = schemaFeatureMatchTokens(keyword);
    score += schemaFeatureTokenOverlapScore(textTokens, keywordTokens);
  }
  return score;
}

function schemaFeatureClusterCatalogForLabel(label: string): SchemaFeatureClusterCatalogEntry | null {
  const matches = SCHEMA_FEATURE_CLUSTER_CATALOG
    .map((entry) => ({ entry, score: schemaFeatureCatalogMatchScore(label, entry) }))
    .filter((item) => item.score >= 2)
    .sort((a, b) => b.score - a.score);
  return matches[0]?.entry ?? null;
}

function slugFeatureClusterLabel(label: string): string {
  const ascii = label
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return ascii || `feature-${Math.abs(hashText(label))}`;
}

function hashText(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}

function normalizeFeatureClusterLabel(label: string): string | null {
  const normalized = meaningfulString(label
    .replace(/^\s*(?:FR|REQ|FEAT)[-_]?\d+[.:)\-\s]+/i, "")
    .replace(/\s+/g, " ")
    .trim());
  if (!normalized) return null;
  if (normalized.length <= 1) return null;
  return normalized;
}

function featureLabelsForRequirement(requirement: FunctionalRequirement): { labels: string[]; split: boolean } {
  const title = normalizeFeatureClusterLabel(requirement.title);
  if (!title) return { labels: [requirement.title], split: false };
  const rawParts = title
    .split(/\s*(?:[,，、;；]|\s+\/\s+|\s+\+\s+|\s+&\s+|\s+및\s+)\s*/g)
    .map((part) => normalizeFeatureClusterLabel(part))
    .filter((part): part is string => Boolean(part));
  const parts = rawParts.filter((part) => part.length >= 2);
  if (parts.length <= 1) return { labels: [title], split: false };
  if (parts.slice(1).every((part) => FEATURE_ACTION_ONLY_LABEL_PATTERN.test(part))) {
    return { labels: [title], split: false };
  }
  return { labels: parts, split: true };
}

function buildSchemaFeatureClusters(plan: BlueprintPrd): SchemaFeatureCluster[] {
  const clusters = new Map<string, SchemaFeatureCluster>();
  for (const requirement of plan.functionalRequirements) {
    const { labels, split } = featureLabelsForRequirement(requirement);
    for (const label of labels) {
      const catalog = schemaFeatureClusterCatalogForLabel(label);
      const key = catalog?.key ?? `feature-${slugFeatureClusterLabel(label)}`;
      const title = catalog?.title ?? label;
      const existing = clusters.get(key);
      if (existing) {
        if (!existing.labels.includes(label)) existing.labels.push(label);
        if (!existing.requirements.some((candidate) => candidate.code === requirement.code)) {
          existing.requirements.push(requirement);
        }
        existing.splitFromRequirement = existing.splitFromRequirement || split;
        continue;
      }
      clusters.set(key, {
        key,
        title,
        labels: [label],
        requirements: [requirement],
        splitFromRequirement: split,
      });
    }
  }
  return [...clusters.values()];
}

function requirementRefsForFeatureCluster(cluster: SchemaFeatureCluster): string {
  return cluster.requirements
    .map((requirement) => `${requirement.code} ${requirement.title}`)
    .join("; ");
}

function targetSurfacesForFeatureCluster(
  cluster: SchemaFeatureCluster,
  productBuilderBasePackages?: readonly ProductBuilderBasePackageSelection[],
): ProductBuilderSurface[] {
  return uniqueSurfaces(cluster.requirements.flatMap((requirement) =>
    inferFunctionalRequirementSurfaces(
      requirement as FunctionalRequirement & Record<string, unknown>,
      productBuilderBasePackages,
    )));
}

// FR 링키지 해석: 일부 생성 데이터는 기능(FR) 코드를 featureRefs에, 요구사항 인벤토리(REQ) 코드를
// sourceRequirementCodes에 따로 넣는다. 추적(기능↔스키마↔API)은 두 필드의 합집합으로 본다.
function featureRefCodes(entity: { sourceRequirementCodes?: string[]; featureRefs?: string[] }): string[] {
  const out = new Set<string>();
  for (const code of entity.sourceRequirementCodes ?? []) out.add(code);
  for (const code of entity.featureRefs ?? []) out.add(code);
  return [...out];
}

function schemaClusterMatchScore(schema: SchemaDefinition, cluster: SchemaFeatureCluster): number {
  const mainTokens = schemaFeatureMatchTokens([
    schema.name,
    schema.tableName ?? "",
    schema.drizzleExportName ?? "",
  ].join(" "));
  const detailTokens = schemaFeatureMatchTokens([
    schema.description,
    ...normalizeSchemaFields((schema as SchemaDefinition & Record<string, unknown>).fields)
      .flatMap((field) => [field.name, field.description, field.validation ?? ""]),
    ...(schema.indexes ?? []),
    ...(schema.enums ?? []),
  ].join(" "));
  const clusterTokens = schemaFeatureMatchTokens([cluster.title, ...cluster.labels].join(" "));
  const requiredMainTokens = SCHEMA_CLUSTER_REQUIRED_MAIN_TOKENS[cluster.key];
  if (requiredMainTokens?.length && !requiredMainTokens.some((token) => mainTokens.has(token))) return 0;
  const excludedMainTokens = SCHEMA_CLUSTER_EXCLUDED_MAIN_TOKENS[cluster.key];
  if (excludedMainTokens?.some((token) => mainTokens.has(token))) return 0;
  if (cluster.key === "user-auth-account") {
    const hasAuthOwnerToken = ["user", "users", "member", "members", "회원", "사용자", "account", "accounts", "계정", "social", "oauth", "login", "로그인", "role", "permission", "tier", "권한", "등급"]
      .some((token) => mainTokens.has(token));
    // 인증/계정 소유 토큰이 없으면 auth 클러스터로 보지 않는다(도메인 무관 generic 가드).
    if (!hasAuthOwnerToken) return 0;
  }
  const mainScore = schemaFeatureTokenOverlapScore(mainTokens, clusterTokens) * 3;
  const detailScore = Math.min(schemaFeatureTokenOverlapScore(detailTokens, clusterTokens), 3);
  let score = mainScore + detailScore;
  const linkedRequirements = cluster.requirements.filter((requirement) =>
    featureRefCodes(schema).includes(requirement.code));
  if (linkedRequirements.length > 0) {
    if (score > 0) {
      score += cluster.splitFromRequirement ? 3 : 6;
    }
  }
  return score;
}

function schemasForFeatureCluster(plan: BlueprintPrd, cluster: SchemaFeatureCluster): SchemaDefinition[] {
  const sortByScore = (rows: { schema: SchemaDefinition; score: number }[]): SchemaDefinition[] =>
    rows
      .filter((item) => item.score >= MIN_SCHEMA_CLUSTER_MATCH_SCORE)
      .sort((a, b) => b.score - a.score || a.schema.code.localeCompare(b.schema.code))
      .map((item) => item.schema);

  // 복합 기능을 쪼갠 클러스터(split)는 여러 sub-cluster가 같은 FR 코드를 공유하므로 linkage만으로는 어느
  // schema가 어느 sub-cluster인지 구분할 수 없다. 이때는 키워드 점수(linkage 보너스 포함)로 디스앰비규에이션한다.
  if (cluster.splitFromRequirement) {
    return sortByScore(plan.schemas.map((schema) => ({ schema, score: schemaClusterMatchScore(schema, cluster) })));
  }

  // 단일 기능에서 온 클러스터(non-split): FR↔schema linkage가 모호하지 않다. LLM이 명시한 sourceRequirementCodes를
  // 키워드 점수와 무관하게 신뢰해 채택한다 — 매칭이 틀릴 때마다 키워드를 더하고 빼는 churn을 제거한다.
  const clusterRequirementCodes = new Set(cluster.requirements.map((requirement) => requirement.code));
  const linked: SchemaDefinition[] = [];
  const linkedCodes = new Set<string>();
  for (const schema of plan.schemas) {
    if (featureRefCodes(schema).some((code) => clusterRequirementCodes.has(code))) {
      linked.push(schema);
      linkedCodes.add(schema.code);
    }
  }
  // 키워드 fallback: FR 연결이 비어 있는(LLM이 연결을 안 준) schema만 휴리스틱으로 보조 매칭한다.
  const inferred = sortByScore(plan.schemas
    .filter((schema) => !linkedCodes.has(schema.code) && featureRefCodes(schema).length === 0)
    .map((schema) => ({ schema, score: schemaClusterMatchScore(schema, cluster) })));
  return [...linked, ...inferred];
}

function schemaCodesForFeatureCluster(plan: BlueprintPrd, cluster: SchemaFeatureCluster): string {
  const codes = schemasForFeatureCluster(plan, cluster).map((schema) => schema.code);
  return codes.length ? codes.join(", ") : "미정 - 기능정의서 기준으로 신규/확장 schema 확정 필요";
}

function schemaFeatureMatchScore(schema: SchemaDefinition, requirement: FunctionalRequirement): number {
  const normalizedSchemaText = normalizedMatchText([schema.name, schema.description, schema.tableName ?? "", schema.drizzleExportName ?? ""].join(" "));
  const normalizedRequirementText = normalizedMatchText(requirement.title);
  let score = 0;
  if (normalizedSchemaText.includes(normalizedMatchText(requirement.title))
    || normalizedRequirementText.includes(normalizedSchemaText)) {
    score += 6;
  }
  const mainTokens = schemaFeatureMatchTokens([
    schema.name,
    schema.description,
    schema.tableName ?? "",
    schema.drizzleExportName ?? "",
  ].join(" "));
  const detailTokens = schemaFeatureMatchTokens([
    ...normalizeSchemaFields((schema as SchemaDefinition & Record<string, unknown>).fields)
      .flatMap((field) => [field.name, field.description, field.validation ?? ""]),
    ...(schema.relations ?? []),
    ...(schema.indexes ?? []),
    ...(schema.enums ?? []),
  ].join(" "));
  const requirementTokens = schemaFeatureMatchTokens(requirement.title);
  score += schemaFeatureTokenOverlapScore(mainTokens, requirementTokens) * 2;
  score += schemaFeatureTokenOverlapScore(detailTokens, requirementTokens);
  return score;
}

function inferredFeatureRequirementsForSchema(plan: BlueprintPrd, schema: SchemaDefinition): FunctionalRequirement[] {
  const scored = plan.functionalRequirements
    .map((requirement) => ({ requirement, score: schemaFeatureMatchScore(schema, requirement) }))
    .filter((item) => item.score >= MIN_SCHEMA_FEATURE_MATCH_SCORE)
    .sort((a, b) => b.score - a.score);
  return scored.map((item) => item.requirement);
}

// 키워드 매칭을 raw substring이 아니라 토큰 경계로 한다 — `page`가 `homepage`에 오탐 매칭되는 것을 막는다.
// 멀티워드 키워드("social login")는 모든 토큰이 텍스트 토큰셋에 있을 때만 매칭.
function keywordMatchesTokens(keyword: string, textTokens: ReadonlySet<string>): boolean {
  const keywordTokens = schemaFeatureMatchTokens(keyword);
  if (!keywordTokens.size) return false;
  for (const token of keywordTokens) {
    if (!textTokens.has(token)) return false;
  }
  return true;
}

function baseDrizzleCapabilityRefsForText(text: string): BaseDrizzleReference[] {
  const textTokens = schemaFeatureMatchTokens(text);
  const refs = BASE_DRIZZLE_CAPABILITY_CATALOG
    .filter((capability) => capability.keywords.some((keyword) => keywordMatchesTokens(keyword, textTokens)))
    .flatMap((capability) => capability.refs);
  return uniqueBaseDrizzleReferences(refs);
}

function uniqueBaseDrizzleReferences(refs: readonly BaseDrizzleReference[]): BaseDrizzleReference[] {
  const seen = new Set<string>();
  const out: BaseDrizzleReference[] = [];
  for (const ref of refs) {
    const key = [ref.packagePath, ref.exportName ?? "", ref.tableName ?? ""].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ref);
  }
  return out;
}

function baseFeatureApiCapabilityRefsForText(text: string): BaseFeatureApiReference[] {
  const textTokens = schemaFeatureMatchTokens(text);
  const refs = BASE_FEATURE_API_CAPABILITY_CATALOG
    .filter((capability) => capability.keywords.some((keyword) => keywordMatchesTokens(keyword, textTokens)))
    .flatMap((capability) => capability.refs);
  return uniqueBaseFeatureApiReferences(refs);
}

function uniqueBaseFeatureApiReferences(refs: readonly BaseFeatureApiReference[]): BaseFeatureApiReference[] {
  const seen = new Set<string>();
  const out: BaseFeatureApiReference[] = [];
  for (const ref of refs) {
    const key = [ref.packagePath, ref.moduleName ?? "", ref.controllerPath ?? ""].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ref);
  }
  return out;
}

function featureRequirementsForSchema(plan: BlueprintPrd, schema: SchemaDefinition): FunctionalRequirement[] {
  const matchedByCode = new Map<string, FunctionalRequirement>();
  // linkage-first: LLM이 명시한 FR 연결(featureRefs ∪ sourceRequirementCodes)을 1순위 truth로 본다.
  const schemaFrCodes = featureRefCodes(schema);
  if (schemaFrCodes.length) {
    const codes = new Set(schemaFrCodes);
    for (const requirement of plan.functionalRequirements) {
      if (codes.has(requirement.code)) matchedByCode.set(requirement.code, requirement);
    }
    if (matchedByCode.size > 0) return [...matchedByCode.values()];
  }
  // fallback: 연결이 비었을 때만 텍스트/추론 매칭으로 보조한다.
  const schemaText = normalizedMatchText([schema.name, schema.description, schema.tableName ?? ""].join(" "));
  const matched = plan.functionalRequirements.filter((requirement) => (
    schemaText.includes(normalizedMatchText(requirement.title))
    || normalizedMatchText(requirement.title).includes(schemaText)
  ));
  for (const requirement of matched) matchedByCode.set(requirement.code, requirement);
  for (const requirement of inferredFeatureRequirementsForSchema(plan, schema)) {
    matchedByCode.set(requirement.code, requirement);
  }
  return [...matchedByCode.values()];
}

function baseDrizzleReferencesForSchema(plan: BlueprintPrd, schema: SchemaDefinition): BaseDrizzleReference[] {
  const explicit = normalizeBaseDrizzleReferences(schema.baseDrizzleReferences);
  const featureText = featureRequirementsForSchema(plan, schema)
    .map((requirement) => [requirement.title, requirement.description, formatSurfaces(requirement.targetSurfaces)].join(" "))
    .join(" ");
  const inferred = baseDrizzleCapabilityRefsForText([
    schema.name,
    schema.description,
    schema.tableName ?? "",
    featureText,
  ].join(" "));
  return uniqueBaseDrizzleReferences([...explicit, ...inferred]);
}

function baseSchemaReuseDecisionForSchema(plan: BlueprintPrd, schema: SchemaDefinition): BaseSchemaReuseDecision {
  if (schema.baseReuseDecision) return schema.baseReuseDecision;
  // 명시 판정/명시 참조만 판정 근거로 삼는다. 키워드 추론 참조만으로는 EXTEND/REUSE를 단정하지 않고
  // UNDECIDED로 남겨 LLM/검수자가 확정하게 한다(추론 참조는 표에 "후보"로만 노출).
  const explicit = normalizeBaseDrizzleReferences(schema.baseDrizzleReferences);
  if (explicit.some((ref) => ref.reuseDecision === "REUSE")) return "REUSE";
  if (explicit.some((ref) => ref.reuseDecision === "EXTEND")) return "EXTEND";
  return "UNDECIDED";
}

function formatBaseDrizzleReferences(refs: readonly BaseDrizzleReference[]): string {
  if (!refs.length) return "-";
  return refs.map((ref) => {
    const parts = [
      `\`${ref.packagePath}\``,
      ref.exportName ? `export: ${ref.exportName}` : "",
      ref.tableName ? `table: ${ref.tableName}` : "",
      ref.reuseDecision ? `decision: ${ref.reuseDecision}` : "",
      ref.note ?? "",
    ].filter(Boolean);
    return parts.join(" / ");
  }).join("<br>");
}

function schemaMermaidEntitiesForCodes(
  allEntities: readonly SchemaMermaidEntity[],
  schemaCodes: ReadonlySet<string>,
): SchemaMermaidEntity[] {
  return allEntities.filter((entity) => schemaCodes.has(entity.schema.code));
}

function featureClusterSchemaMermaidEntities(
  plan: BlueprintPrd,
  cluster: SchemaFeatureCluster,
): { entities: SchemaMermaidEntity[]; directSchemaCodes: Set<string> } {
  const allEntities = schemaMermaidEntities(plan);
  const directSchemaCodes = new Set(schemasForFeatureCluster(plan, cluster).map((schema) => schema.code));
  if (!directSchemaCodes.size) return { entities: [], directSchemaCodes };

  return {
    entities: schemaMermaidEntitiesForCodes(allEntities, directSchemaCodes),
    directSchemaCodes,
  };
}

function renderFeatureSchemaErdSections(plan: BlueprintPrd): string[] {
  const lines: string[] = [];
  const mappedSchemaCodes = new Set<string>();
  const allEntities = schemaMermaidEntities(plan);

  if (!plan.functionalRequirements.length) {
    const allSchemaCodes = new Set(plan.schemas.map((schema) => schema.code));
    const commonLines = [
      "### 2.1 기능 미확정/공통 스키마(Undecided or Common Schema)",
      "",
      plan.schemas.length
        ? "기능 요구사항 코드가 아직 없어서 전체 스키마를 공통 블록으로 표시한다."
        : "기능정의서 기준으로 확정된 테이블이 아직 없습니다.",
      "",
    ];
    if (!plan.schemas.length) return commonLines;
    return [
      ...commonLines,
      renderSchemaMermaidErDiagramFromEntities(schemaMermaidEntitiesForCodes(allEntities, allSchemaCodes), {
        relationSourceSchemaCodes: allSchemaCodes,
      }),
      "",
    ];
  }

  const clusters = buildSchemaFeatureClusters(plan);
  clusters.forEach((cluster, index) => {
    const { entities, directSchemaCodes } = featureClusterSchemaMermaidEntities(plan, cluster);
    for (const code of directSchemaCodes) mappedSchemaCodes.add(code);
    const surfaces = formatSurfaces(targetSurfacesForFeatureCluster(cluster, plan.productBuilderBasePackages));
    lines.push(
      `### 2.${index + 1} ${cluster.title}`,
      "",
      `관련 요구사항: ${requirementRefsForFeatureCluster(cluster)}`,
      "",
      `대상 surface: ${surfaces}`,
      "",
      `연결 스키마: ${schemaCodesForFeatureCluster(plan, cluster)}`,
      "",
    );
    if (entities.length) {
      lines.push(
        renderSchemaMermaidErDiagramFromEntities(entities, {
          relationSourceSchemaCodes: directSchemaCodes,
        }),
        "",
      );
    } else {
      lines.push("_연결된 테이블이 아직 없거나 기능정의서 기준 schema 보완이 필요합니다._", "");
    }
  });

  const unmappedSchemaCodes = new Set(plan.schemas
    .filter((schema) => !mappedSchemaCodes.has(schema.code))
    .map((schema) => schema.code));
  if (unmappedSchemaCodes.size > 0) {
    lines.push(
      `### 2.${clusters.length + 1} 기능 미연결/공통 스키마(Unmapped or Common Schema)`,
      "",
      "sourceRequirementCodes가 비어 있거나 특정 기능에만 귀속되지 않는 공통 테이블이다. 다음 보완 시 기능 연결을 확정한다.",
      "",
      `연결 스키마: ${[...unmappedSchemaCodes].join(", ")}`,
      "",
      renderSchemaMermaidErDiagramFromEntities(schemaMermaidEntitiesForCodes(allEntities, unmappedSchemaCodes), {
        relationSourceSchemaCodes: unmappedSchemaCodes,
      }),
      "",
    );
  }

  return lines;
}

function baseDrizzleReferencesForFeature(requirement: FunctionalRequirement): BaseDrizzleReference[] {
  return baseDrizzleCapabilityRefsForText([
    requirement.title,
    requirement.description,
    formatSurfaces(requirement.targetSurfaces),
  ].join(" "));
}

function baseDrizzleReferencesForFeatureCluster(cluster: SchemaFeatureCluster): BaseDrizzleReference[] {
  return uniqueBaseDrizzleReferences(cluster.requirements.flatMap(baseDrizzleReferencesForFeature));
}

function featureRequirementsForApi(plan: BlueprintPrd, api: ApiDefinition): FunctionalRequirement[] {
  const apiFrCodes = featureRefCodes(api);
  if (apiFrCodes.length) {
    const codes = new Set(apiFrCodes);
    const matched = plan.functionalRequirements.filter((requirement) => codes.has(requirement.code));
    if (matched.length) return matched;
  }
  const schemaFeatureCodes = new Set(plan.schemas
    .filter((schema) => api.schemas.includes(schema.code))
    .flatMap((schema) => featureRefCodes(schema)));
  if (schemaFeatureCodes.size > 0) {
    return plan.functionalRequirements.filter((requirement) => schemaFeatureCodes.has(requirement.code));
  }
  const apiText = normalizedMatchText([api.summary, api.path].join(" "));
  const matched = plan.functionalRequirements.filter((requirement) => (
    apiText.includes(normalizedMatchText(requirement.title))
    || normalizedMatchText(requirement.description).includes(apiText)
  ));
  return matched.length ? matched : [];
}

// FR별 grounding(연결된 스키마/API 코드 + 그 reuse decision들)을 역인덱스로 만든다.
// 결정론적 task 매퍼(build-plan-mapper)가 사용한다. linkage-first + 키워드 fallback인
// featureRequirementsForSchema/Api를 그대로 거치므로 schema.featureRefs가 비어도 동작한다.
export type FeatureGrounding = {
  schemaCodes: string[];
  apiCodes: string[];
  decisions: BaseSchemaReuseDecision[];
};

export function featureGrounding(plan: BlueprintPrd): Map<string, FeatureGrounding> {
  const map = new Map<string, FeatureGrounding>();
  for (const requirement of plan.functionalRequirements) {
    map.set(requirement.code, { schemaCodes: [], apiCodes: [], decisions: [] });
  }
  for (const schema of plan.schemas) {
    const decision = baseSchemaReuseDecisionForSchema(plan, schema);
    for (const requirement of featureRequirementsForSchema(plan, schema)) {
      const grounding = map.get(requirement.code);
      if (!grounding) continue;
      if (!grounding.schemaCodes.includes(schema.code)) grounding.schemaCodes.push(schema.code);
      grounding.decisions.push(decision);
    }
  }
  for (const api of plan.apis) {
    const decision: BaseSchemaReuseDecision = api.baseReuseDecision ?? "UNDECIDED";
    for (const requirement of featureRequirementsForApi(plan, api)) {
      const grounding = map.get(requirement.code);
      if (!grounding) continue;
      if (!grounding.apiCodes.includes(api.code)) grounding.apiCodes.push(api.code);
      grounding.decisions.push(decision);
    }
  }
  return map;
}

function schemaDescriptionsForApi(plan: BlueprintPrd, api: ApiDefinition): string {
  const codes = new Set(api.schemas);
  return plan.schemas
    .filter((schema) => codes.has(schema.code))
    .map((schema) => [schema.name, schema.description, schema.tableName ?? ""].join(" "))
    .join(" ");
}

function baseFeatureApiReferencesForApi(plan: BlueprintPrd, api: ApiDefinition): BaseFeatureApiReference[] {
  const explicit = normalizeBaseFeatureApiReferences(api.baseFeatureReferences);
  const featureText = featureRequirementsForApi(plan, api)
    .map((requirement) => [requirement.title, requirement.description, formatSurfaces(requirement.targetSurfaces)].join(" "))
    .join(" ");
  const inferred = baseFeatureApiCapabilityRefsForText([
    api.summary,
    api.path,
    schemaDescriptionsForApi(plan, api),
    featureText,
  ].join(" "));
  return uniqueBaseFeatureApiReferences([...explicit, ...inferred]);
}

function baseApiReuseDecisionForApi(plan: BlueprintPrd, api: ApiDefinition): BaseSchemaReuseDecision {
  if (api.baseReuseDecision) return api.baseReuseDecision;
  // 키워드 추론 참조만으로 EXTEND를 단정하지 않는다. 명시 판정/명시 참조만 근거로 삼고, 추론만 있으면 UNDECIDED.
  const explicit = normalizeBaseFeatureApiReferences(api.baseFeatureReferences);
  if (explicit.some((ref) => ref.reuseDecision === "REUSE")) return "REUSE";
  if (explicit.some((ref) => ref.reuseDecision === "EXTEND")) return "EXTEND";
  return "UNDECIDED";
}

function baseFeatureApiReferencesForFeature(requirement: FunctionalRequirement): BaseFeatureApiReference[] {
  return baseFeatureApiCapabilityRefsForText([
    requirement.title,
    requirement.description,
    formatSurfaces(requirement.targetSurfaces),
  ].join(" "));
}

function apiCodesForFeature(plan: BlueprintPrd, requirement: FunctionalRequirement): string {
  const schemaCodes = new Set(plan.schemas
    .filter((schema) => featureRefCodes(schema).includes(requirement.code))
    .map((schema) => schema.code));
  const codes = plan.apis
    .filter((api) => featureRefCodes(api).includes(requirement.code) || api.schemas.some((code) => schemaCodes.has(code)))
    .map((api) => api.code);
  return codes.length ? codes.join(", ") : "미정 - 기능정의서와 스키마 정의서 기준으로 endpoint 확정 필요";
}

function formatBaseFeatureApiReferences(refs: readonly BaseFeatureApiReference[]): string {
  if (!refs.length) return "-";
  return refs.map((ref) => {
    const parts = [
      `\`${ref.packagePath}\``,
      ref.moduleName ? `module: ${ref.moduleName}` : "",
      ref.controllerPath ? `controller: ${ref.controllerPath}` : "",
      ref.servicePath ? `service: ${ref.servicePath}` : "",
      ref.dtoPath ? `dto: ${ref.dtoPath}` : "",
      ref.providedBy ? `provided by: ${ref.providedBy}` : "",
      ref.reuseDecision ? `decision: ${ref.reuseDecision}` : "",
      ref.customizationScope ? `customize: ${ref.customizationScope}` : "",
      ref.note ?? "",
    ].filter(Boolean);
    return parts.join(" / ");
  }).join("<br>");
}

function agentGuidelinesPromptSection(value: unknown): string[] {
  if (typeof value !== "string" || value.trim().length === 0) return [];
  return [
    "## 프로젝트 에이전트 필수 가이드라인(Project Agent Guidelines - Required Reading)",
    "아래 내용은 설정 탭에서 저장한 프로젝트별 최우선 지침이다. 이 실행의 모든 판단, 산출물 생성, 수정, 응답은 이 지침을 먼저 읽고 위반하지 않아야 한다.",
    value.trim(),
    "",
  ];
}

function internalEngineeringQualityRootRulesPromptSection(): string[] {
  return [
    "## 내부 엔지니어링 품질 루트 룰(Internal Engineering Quality Root Rules - Do Not Render)",
    "이 섹션은 산출물 생성 판단에만 적용하는 최상위 내부 기준이다. Development Requirements Brief, Feature Definition, Schema Definition, API Definition, Architecture Definition, Screen Definition 본문이나 제출 JSON 필드에는 이 섹션 제목, SOLID 명칭, 각 원칙명을 쓰지 않는다.",
    "SOLID를 내부 설계 필터로 적용한다: 단일 책임으로 기능/schema/API/screen 경계를 나누고, 확장 가능하되 불필요한 수정을 줄이며, 대체 가능한 계약을 유지하고, 큰 인터페이스보다 역할별 계약을 선호하고, 구체 구현보다 추상 계약과 참조 코드에 의존한다.",
    "이 룰을 설명 문장으로 출력하지 말고, 기능 분해·schema/API 경계·재사용/수정 판정·task 후보의 응집도와 결합도를 조정하는 데만 사용한다.",
    "데이터 영속성 경계(schema 판정 필터): 약관·개인정보처리방침·이용약관·정책·공지·FAQ·이용안내 같은 정적/문서성 콘텐츠, 화면에 고정 노출되는 안내/배너 카피, 고정 enum·코드값·등급·상태·권한 상수, 환경/기능 플래그/설정값은 DB schema(테이블)로 만들지 않는다. 이런 항목은 정적 파일·상수·CMS·설정으로 표현하고, 운영자나 사용자가 런타임에 직접 생성·수정·삭제(CRUD)하고 그 변경 이력이 비즈니스적으로 의미 있을 때만 테이블로 둔다. 정책 자체를 테이블로 만들기 전에 '이게 코드 상수/설정으로 충분한가'를 먼저 판단한다.",
    "아키텍쳐 경계(architecture 판정 필터): 프로젝트는 product-builder-base를 클론해 시작하므로 호스팅·배포·CI/CD·오브젝트 스토리지·CDN·관측성 같은 인프라 provider와 백엔드/DB/인증 공통 스택은 base에 이미 고정돼 있다. 이를 프로젝트마다 새 commercial provider(Vercel/Supabase/S3/Cloudflare 등)로 추정·발명하지 않는다. 백엔드는 product-builder-base apps/server(NestJS)를 기준으로 적고, infrastructure/provider 칸은 자료에 명시된 확정값만 채우고 근거가 없으면 비워 둔다. architecture 산출물은 base 고정 전제 위에서 이 프로젝트 고유의 컴포넌트·계층 책임·핵심 데이터 흐름만 구체화한다.",
    "",
  ];
}

// 산출물이 개발자에게 즉시 구현 가능한 스펙이 되도록 데이터 완결성을 강제하는 규칙. PRD/계약 생성 프롬프트에만 주입.
function outputDataCompletenessRules(): string[] {
  return [
    "## 산출물 데이터 완결성 필수(Output Data Completeness - Required)",
    "이 산출물은 외주 개발자가 다른 설명 없이 바로 구현하는 스펙이다. 아래를 빈칸/placeholder 없이 채운다. 못 채우면 빈 배열로 두지 말고 해당 항목을 assumptions/risks에 미정으로 남긴다.",
    "1. API input/output은 이 산출물의 핵심이다. 모든 endpoint의 input과 output을 빈 배열로 두지 않는다. 참조 schemas의 fields에서 도출해 각 항목 name/type/required/description을 채운다. body가 있는 POST/PUT/PATCH는 input에 실제 요청 필드(서버 생성 id/createdAt/updatedAt/작성자/집계값은 제외한 사용자 입력 서브셋)를, 모든 endpoint는 output에 응답 필드를 명시한다. GET/DELETE는 query/path 파라미터를 input에 명시한다. 'object' 한 줄로 뭉개지 않는다. 파일 업로드는 multipart/file 파트를 명시한다.",
    "2. 추적성: schemas와 apis의 sourceRequirementCodes에는 반드시 functionalRequirements의 FR 코드(FR-001 등)를 넣어 기능↔스키마↔API가 FR 코드로 이어지게 한다. 요구사항 인벤토리(REQ) 코드만 넣고 FR 코드를 빠뜨리지 않는다.",
    "3. 커버리지: 기능정의서의 모든 headline 기능(즐겨찾기/북마크, 리뷰 작성·수정·삭제, 댓글 수정·삭제, 임시저장, 내 활동 등 포함)에 필요한 schema와 생성/조회/수정/삭제(CRUD) endpoint를 누락 없이 만든다. 기능 제목에 수정/삭제/저장 동사가 있으면 대응하는 PATCH/DELETE endpoint를 만든다. ERD 관계가 가리키는 테이블은 반드시 schema로 정의한다(유령 엔티티 금지).",
    "4. schema는 Drizzle 테이블로 바로 옮길 수 있어야 한다. fields에 PK/FK/unique/nullable/default를 validation에 명시하고, FK 컬럼을 fields에 포함한다. relations는 'sourceField -> TargetTable.column (onDelete: cascade|set null|restrict)' 화살표 형식으로 쓴다. indexes(단일/복합)와 enums(허용값)를 빠짐없이 채운다. 한 테이블의 여러 컬럼을 콤마 나열 한 줄로 뭉치지 않는다.",
    "5. 각 api는 implementationNotes(트랜잭션/멱등성/rate-limit/권한·소유권 검사/상태 전이)와 acceptanceCriteria(endpoint QA 기준)와 errors(권한 401/403, 검증 400/422, 충돌 409, 미존재 404 등 도메인 조건)를 채운다.",
    "6. architecture.integrations는 자료/요구사항에서 실제로 쓰이는 외부 의존(OAuth 제공자, 본인인증, OCR, 오브젝트 스토리지, 이미지 모더레이션, 알림/이메일/문자 등)을 추출해 명시한다. 기본 템플릿 값으로 두지 않는다.",
    "",
  ];
}

export function buildOverview(state: CosBlueprintState): CosBlueprintOverview {
  return {
    status: "ok",
    checkedAt: new Date().toISOString(),
    pluginId: PLUGIN_ID,
    version: PLUGIN_VERSION,
    state,
  };
}

type BlueprintWorkflowRow = {
  slotKey: string;
  title?: string | null;
  status?: ProjectDocumentSlotStatus;
  document?: { body?: string | null } | null;
  artifact?: unknown | null;
  metadata?: Record<string, unknown> | null;
};

function blueprintWorkflowPanel(
  input: Omit<BlueprintWorkflowPanel, "doneCount" | "totalCount">,
): BlueprintWorkflowPanel {
  return {
    ...input,
    doneCount: input.steps.filter((step) => step.status === "done").length,
    totalCount: input.steps.length,
  };
}

function blueprintWorkflowStep(input: {
  key: string;
  title: string;
  detail: string;
  done: boolean;
  active?: boolean;
  blocked?: boolean;
}): BlueprintWorkflowStep {
  return {
    key: input.key,
    title: input.title,
    detail: input.detail,
    status: input.done ? "done" : input.blocked ? "blocked" : input.active ? "active" : "pending",
  };
}

function blueprintSlotReady(row: BlueprintWorkflowRow | null | undefined): boolean {
  return Boolean(
    row
    && (row.status === "ready" || row.status === "approved" || Boolean(row.document?.body?.trim()) || Boolean(row.artifact)),
  );
}

function blueprintSlotApproved(row: BlueprintWorkflowRow | null | undefined): boolean {
  return row?.status === "approved";
}

function blueprintSlotPmRevision(row: BlueprintWorkflowRow | null | undefined): { at: string; summary: string | null } | null {
  const metadata = row?.metadata;
  if (!metadata || typeof metadata !== "object") return null;
  const at = typeof metadata.lastPmRevisionAt === "string" && metadata.lastPmRevisionAt.trim()
    ? metadata.lastPmRevisionAt.trim()
    : null;
  if (!at) return null;
  return {
    at,
    summary: typeof metadata.lastPmRevisionSummary === "string" && metadata.lastPmRevisionSummary.trim()
      ? metadata.lastPmRevisionSummary.trim()
      : null,
  };
}

export function blueprintWorkflowLabel(slotKey: string): string {
  return blueprintDeliverableWorkflowDefinition(slotKey)?.label ?? "산출물 workflow";
}

export function buildBlueprintWorkflowPanel(input: {
  slotKey?: string | null;
  slotTitle?: string | null;
  rows?: BlueprintWorkflowRow[];
  sourceCount: number;
  state?: CosBlueprintState | null;
}): BlueprintWorkflowPanel {
  const byKey = new Map((input.rows ?? []).map((row) => [row.slotKey, row]));
  const get = (key: string) => byKey.get(key) ?? null;
  const sourceReady = input.sourceCount > 0;
  const inventoryStateReady = Boolean(input.state?.requirementInventory);
  const prdStateReady = Boolean(input.state?.prd);
  const prdConfirmed = Boolean(input.state?.prd?.confirmedAt) || blueprintSlotApproved(get("deliverable.prd"));
  const screenStateReady = Boolean(input.state?.screenPlan);
  const prdReady = prdStateReady || blueprintSlotReady(get("deliverable.prd"));
  const featureFilesReady = blueprintSlotReady(get("deliverable.feature_files"));
  const schemaReady = blueprintSlotReady(get("deliverable.schema_definition"));
  const apiReady = blueprintSlotReady(get("deliverable.api_definition"));
  const screensReady = blueprintSlotReady(get("deliverable.screen_definitions"));
  const wireframeReady = blueprintSlotReady(get("deliverable.wireframe_html"));
  const taskListReady = blueprintSlotReady(get("deliverable.task_list"));

  const sourceWorkflow = blueprintWorkflowPanel({
    workflowKey: "source.analysis",
    label: "자료 분석 workflow",
    title: "등록 자료 분석 workflow",
    subtitle: "여러 포맷의 등록 자료를 source slot 기준으로 읽고 후속 산출물로 연결",
    owner: "PM Agent",
    steps: [
      blueprintWorkflowStep({
        key: "source.registered",
        title: "자료 등록 확인",
        detail: `${input.sourceCount}개 자료가 분석 입력으로 잡혀 있습니다.`,
        done: sourceReady,
        active: !sourceReady,
      }),
      blueprintWorkflowStep({
        key: "source.full_reading",
        title: "자료 전체 읽기",
        detail: "대표 섹션 요약이 아니라 등록 자료별 원문 범위와 후반부까지 확인합니다.",
        done: inventoryStateReady || prdReady,
        active: sourceReady && !inventoryStateReady && !prdReady,
        blocked: !sourceReady,
      }),
      blueprintWorkflowStep({
        key: "source.coverage_index",
        title: "내부 커버리지 점검",
        detail: "등록 자료에서 후속 산출물에 반영할 단위를 내부 coverage index로 점검합니다.",
        done: inventoryStateReady || prdReady,
        active: sourceReady && !inventoryStateReady && !prdReady,
        blocked: !sourceReady,
      }),
      blueprintWorkflowStep({
        key: "source.revision_ready",
        title: "수정 요청 반영 준비",
        detail: "추가 요청은 source slot과 내부 coverage index를 기준으로 빠르게 재생성합니다.",
        done: prdReady,
        active: sourceReady && !prdReady,
        blocked: !sourceReady,
      }),
    ],
  });

  const slotKey = input.slotKey ?? null;
  if (!slotKey) return sourceWorkflow;

  const row = get(slotKey) ?? {
    slotKey,
    title: input.slotTitle ?? slotKey,
    status: "empty" as const,
    document: null,
    artifact: null,
    metadata: null,
  };
  const rowTitle = row.title ?? input.slotTitle ?? slotKey;
  const rowReady = blueprintSlotReady(row);
  const rowApproved = blueprintSlotApproved(row);
  const revision = blueprintSlotPmRevision(row);
  const withRevisionStep = (
    panel: Omit<BlueprintWorkflowPanel, "doneCount" | "totalCount">,
  ): BlueprintWorkflowPanel => blueprintWorkflowPanel({
    ...panel,
    steps: [
      ...panel.steps,
      blueprintWorkflowStep({
        key: `${slotKey}.pm_revision`,
        title: "수정 요청 반영",
        detail: revision
          ? `PM 채팅 수정 반영됨${revision.summary ? `: ${revision.summary}` : ""}`
          : "PM 채팅에서 이 산출물의 일부 내용을 수정하면 수정본으로 저장합니다.",
        done: Boolean(revision),
        active: rowReady && !rowApproved && !revision,
        blocked: !rowReady,
      }),
    ],
  });
  const commonSlotStep = blueprintWorkflowStep({
    key: `${slotKey}.slot`,
    title: "산출물 슬롯 반영",
    detail: `${rowTitle} 문서를 Project deliverable slot에 기록합니다.`,
    done: rowReady,
    active: sourceReady && !rowReady,
    blocked: !sourceReady,
  });

  switch (slotKey) {
    case "deliverable.prd":
      return withRevisionStep({
        workflowKey: "deliverable.prd",
        label: blueprintWorkflowLabel(slotKey),
        title: "개발 요구사항 브리프(Development Requirements Brief) workflow",
        subtitle: "고객 제공 자료를 구현 착수 기준선으로 정리",
        owner: "PM Agent",
        steps: [
          blueprintWorkflowStep({
            key: "prd.source_baseline",
            title: "입력 전체 독해",
            detail: "source slot 본문과 내부 coverage index를 끝까지 읽고 후반부/부록/예외/운영 항목을 누락하지 않습니다.",
            done: sourceReady,
            active: !sourceReady,
            blocked: !sourceReady,
          }),
          blueprintWorkflowStep({
            key: "prd.problem_user_success",
            title: "문제/사용자/성공 기준 확정",
            detail: "해결할 문제, 대상/비대상 사용자, 목표, 성공 지표, 실패 신호를 자료 근거로 정리합니다.",
            done: prdStateReady,
            active: sourceReady && !prdStateReady,
            blocked: !sourceReady,
          }),
          blueprintWorkflowStep({
            key: "prd.scope_requirements",
            title: "범위/요구사항 상세화",
            detail: "포함/제외 범위와 기능/비기능 요구사항을 source-backed item 단위로 펼쳐 쓰고 검증 방법을 붙입니다.",
            done: prdStateReady,
            active: sourceReady && !prdStateReady,
            blocked: !sourceReady,
          }),
          blueprintWorkflowStep({
            key: "prd.risks_questions",
            title: "리스크/전제/open question 정리",
            detail: "확정하지 못한 항목을 생략하지 않고 리스크, 전제, 오픈 이슈로 남깁니다.",
            done: prdStateReady,
            active: sourceReady && !prdStateReady,
            blocked: !sourceReady,
          }),
          blueprintWorkflowStep({
            key: "prd.slot_review",
            title: "브리프 슬롯 기록/검토",
            detail: "Project deliverable slot에 개발 요구사항 브리프를 기록하고 확정 여부를 추적합니다.",
            done: rowReady || prdConfirmed,
            active: prdStateReady && !rowReady,
            blocked: !prdStateReady,
          }),
        ],
      });
    case "deliverable.feature_files":
      return withRevisionStep({
        workflowKey: "deliverable.feature_files",
        label: blueprintWorkflowLabel(slotKey),
        title: "기능정의서 workflow",
        subtitle: "목록 페이지와 기능별 상세 문서를 surface별로 정리",
        owner: "Contract Agent",
        steps: [
          blueprintWorkflowStep({ key: "feature_files.prd", title: "브리프 기준선 확보", detail: "기능 분해는 개발 요구사항 브리프의 범위와 요구사항을 기준으로 합니다.", done: prdReady, active: sourceReady && !prdReady, blocked: !sourceReady }),
          blueprintWorkflowStep({ key: "feature_files.base_reuse", title: "base 재사용 후보 분석", detail: "설정에서 선택된 project-builder-base apps/* 경로와 기존 feature를 기준으로 전체 재사용/부분 재사용/커스터마이징/신규를 판정합니다.", done: featureFilesReady, active: prdReady && !featureFilesReady, blocked: !prdReady }),
          blueprintWorkflowStep({ key: "feature_files.surface_split", title: "surface별 기능 구분", detail: "설정에서 선택된 apps/admin, apps/site, apps/app, apps/landing 구획만 사용하고 기능별 target surface를 명시합니다.", done: featureFilesReady, active: prdReady && !featureFilesReady, blocked: !prdReady }),
          blueprintWorkflowStep({ key: "feature_files.index", title: "목록 페이지 작성", detail: "기능 목록, 기능별 상세 문서 참조, base 재사용 판정을 surface별 목록 안에 둡니다.", done: featureFilesReady, active: prdReady && !featureFilesReady, blocked: !prdReady }),
          blueprintWorkflowStep({ key: "feature_files.behavior", title: "기능별 동작/커스터마이징 정의", detail: "각 feature의 actor, behavior, acceptance criteria와 재사용 feature의 수정 범위를 작성합니다.", done: featureFilesReady, active: prdReady && !featureFilesReady, blocked: !prdReady }),
          blueprintWorkflowStep({ key: "feature_files.traceability", title: "출처/요구사항 추적", detail: "각 기능이 등록 자료/브리프 항목과 연결되는지 확인합니다.", done: featureFilesReady, active: prdReady && !featureFilesReady, blocked: !prdReady }),
          blueprintWorkflowStep({ key: "feature_files.handoff", title: "구현 handoff 준비", detail: "Product Builder가 feature별 작업 체인을 만들 수 있는 상태로 정리합니다.", done: rowReady, active: featureFilesReady && !rowReady, blocked: !featureFilesReady }),
        ],
      });
    case "deliverable.schema_definition":
      return withRevisionStep({
        workflowKey: "deliverable.schema_definition",
        label: blueprintWorkflowLabel(slotKey),
        title: "스키마 정의서 workflow",
        subtitle: "데이터 객체, 필드, 관계, 검증 규칙을 계약화",
        owner: "Contract Agent",
        steps: [
          blueprintWorkflowStep({ key: "schema.prd", title: "브리프 데이터 요구 확인", detail: "개발 요구사항 브리프의 사용자/운영/콘텐츠 데이터를 schema 후보로 변환합니다.", done: prdReady, active: sourceReady && !prdReady, blocked: !sourceReady }),
          blueprintWorkflowStep({ key: "schema.feature_map", title: "feature cluster 기준 매핑", detail: "FR 행이 아니라 실제 기능 묶음과 target surface를 기준으로 schema 후보를 빠짐없이 연결합니다.", done: featureFilesReady, active: prdReady && !featureFilesReady, blocked: !prdReady }),
          blueprintWorkflowStep({ key: "schema.base_drizzle", title: "base Drizzle 재사용 후보 분석", detail: "product-builder-base packages/drizzle/src/schema/core/* 및 features/*에서 재사용/확장 가능한 table/export를 기록합니다.", done: schemaReady, active: featureFilesReady && !schemaReady, blocked: !featureFilesReady }),
          blueprintWorkflowStep({ key: "schema.model", title: "객체/필드/관계 설계", detail: "엔티티, Drizzle table/export, 필드 타입, 관계, 필수값, migration scope를 정의합니다.", done: schemaReady, active: featureFilesReady && !schemaReady, blocked: !featureFilesReady }),
          blueprintWorkflowStep({ key: "schema.validation", title: "검증/제약 조건 정리", detail: "API와 화면이 참조할 validation/index/enum 기준을 고정합니다.", done: schemaReady, active: featureFilesReady && !schemaReady, blocked: !featureFilesReady }),
          commonSlotStep,
        ],
      });
    case "deliverable.api_definition":
      return withRevisionStep({
        workflowKey: "deliverable.api_definition",
        label: blueprintWorkflowLabel(slotKey),
        title: "API 정의서 workflow",
        subtitle: "REST endpoint와 request/response/error 계약 정리",
        owner: "Contract Agent",
        steps: [
          blueprintWorkflowStep({ key: "api.prd", title: "브리프 기능 요구 확인", detail: "사용자 action과 운영 flow를 API 후보로 변환합니다.", done: prdReady, active: sourceReady && !prdReady, blocked: !sourceReady }),
          blueprintWorkflowStep({ key: "api.feature_schema", title: "기능정의서/Schema 의존성 확인", detail: "endpoint가 기능 코드와 schema code를 함께 참조하는지 확인합니다.", done: featureFilesReady && schemaReady, active: prdReady && (!featureFilesReady || !schemaReady), blocked: !prdReady }),
          blueprintWorkflowStep({ key: "api.base_features", title: "base Feature API 재사용 후보 분석", detail: "product-builder-base packages/features controller/service/dto/module과 apps/server AppModule 제공 지점을 기록합니다.", done: apiReady, active: featureFilesReady && schemaReady && !apiReady, blocked: !featureFilesReady || !schemaReady }),
          blueprintWorkflowStep({ key: "api.contract", title: "Endpoint 계약 작성", detail: "method/path/auth/request/response/error와 REUSE/EXTEND/NEW 수정 범위를 정의합니다.", done: apiReady, active: featureFilesReady && schemaReady && !apiReady, blocked: !featureFilesReady || !schemaReady }),
          commonSlotStep,
        ],
      });
    case "deliverable.architecture":
      return withRevisionStep({
        workflowKey: "deliverable.architecture",
        label: blueprintWorkflowLabel(slotKey),
        title: "아키텍처 정의서 workflow",
        subtitle: "기술 경계, 배포, 외부 연동, 리스크를 구조화",
        owner: "Contract Agent",
        steps: [
          blueprintWorkflowStep({ key: "architecture.contracts", title: "브리프/Schema/API 기준 확보", detail: "구현 요구, 데이터 계약, API 계약을 architecture 입력으로 사용합니다.", done: prdReady && schemaReady && apiReady, active: prdReady && (!schemaReady || !apiReady), blocked: !prdReady }),
          blueprintWorkflowStep({ key: "architecture.boundary", title: "시스템 경계 정의", detail: "프론트/백엔드/AI/외부 서비스/배포 경계를 정리합니다.", done: rowReady, active: prdReady && schemaReady && apiReady && !rowReady, blocked: !(prdReady && schemaReady && apiReady) }),
          blueprintWorkflowStep({ key: "architecture.risk", title: "리스크/운영 기준 정리", detail: "확정 불가 영역, env, 인프라, 장애 격리 기준을 남깁니다.", done: rowReady, active: prdReady && !rowReady, blocked: !prdReady }),
          commonSlotStep,
        ],
      });
    case "deliverable.screen_definitions":
      return withRevisionStep({
        workflowKey: "deliverable.screen_definitions",
        label: blueprintWorkflowLabel(slotKey),
        title: "화면정의서 workflow",
        subtitle: "개발 요구사항 브리프 확정 후 surface별 화면 계약과 QA 기준을 작성",
        owner: "Screen Agent",
        steps: [
          blueprintWorkflowStep({ key: "screens.prd_gate", title: "브리프 확정 게이트", detail: "화면정의서는 개발 요구사항 브리프 확정 뒤 생성합니다.", done: prdConfirmed || screensReady, active: prdReady && !prdConfirmed, blocked: !prdReady }),
          blueprintWorkflowStep({ key: "screens.surface_split", title: "surface별 화면 구분", detail: "설정에서 선택된 apps/admin, apps/site, apps/app, apps/landing 구획만 사용하고 각 화면의 targetSurface를 확정합니다.", done: screenStateReady, active: prdConfirmed && !screenStateReady, blocked: !prdConfirmed }),
          blueprintWorkflowStep({ key: "screens.list", title: "화면 목록 생성", detail: "screen code, route, actor, primary action을 surface별 목록으로 도출합니다.", done: screenStateReady, active: prdConfirmed && !screenStateReady, blocked: !prdConfirmed }),
          blueprintWorkflowStep({ key: "screens.write", title: "화면별 문서 작성", detail: "fields, actions, states, API/schema refs, acceptance criteria를 surface별 화면정의서에 작성합니다.", done: rowReady, active: screenStateReady && !rowReady, blocked: !screenStateReady }),
          blueprintWorkflowStep({ key: "screens.review", title: "리뷰/재생성 루프", detail: "화면별 피드백을 반영해 필요한 화면만 빠르게 재생성합니다.", done: rowApproved, active: rowReady && !rowApproved, blocked: !rowReady }),
        ],
      });
    case "deliverable.wireframe_html":
      return withRevisionStep({
        workflowKey: "deliverable.wireframe_html",
        label: blueprintWorkflowLabel(slotKey),
        title: "HTML 와이어프레임 workflow",
        subtitle: "화면정의서를 실제 검수 가능한 HTML로 변환",
        owner: "Wireframe Agent",
        steps: [
          blueprintWorkflowStep({ key: "wireframe.screens", title: "화면정의서 준비", detail: "screen definition slot이 ready/draft 상태여야 합니다.", done: screensReady, active: screenStateReady && !screensReady, blocked: !screenStateReady }),
          blueprintWorkflowStep({ key: "wireframe.html", title: "HTML 생성", detail: "화면 흐름과 주요 상태를 self-contained HTML로 만듭니다.", done: wireframeReady, active: screensReady && !wireframeReady, blocked: !screensReady }),
          blueprintWorkflowStep({ key: "wireframe.browser_review", title: "브라우저 검수", detail: "빈 화면, 겹침, 주요 CTA/상태 누락을 확인합니다.", done: rowApproved, active: wireframeReady && !rowApproved, blocked: !wireframeReady }),
          commonSlotStep,
        ],
      });
    case "deliverable.task_list":
      return withRevisionStep({
        workflowKey: "deliverable.task_list",
        label: blueprintWorkflowLabel(slotKey),
        title: "전체 Task 목록 workflow",
        subtitle: "확정된 PRD 기준 전체 task를 사람이 검토 가능한 작업표로 전개",
        owner: "Product Builder",
        steps: [
          blueprintWorkflowStep({ key: "task_list.prd", title: "개발 요구사항 브리프 기준선", detail: "확정된 PRD를 task source로 사용합니다.", done: prdReady, active: false, blocked: !prdReady }),
          blueprintWorkflowStep({ key: "task_list.stage_expand", title: "Feature별 단계 전개", detail: "BE → BE QA → FE → FE QA → 전체 QA 순서로 펼칩니다.", done: taskListReady, active: prdReady && !taskListReady, blocked: !prdReady }),
          blueprintWorkflowStep({ key: "task_list.release", title: "공통/통합/Release 작업 포함", detail: "공통 작업, 통합 QA, release handoff를 누락 없이 포함합니다.", done: taskListReady, active: prdReady && !taskListReady, blocked: !prdReady }),
          commonSlotStep,
        ],
      });
    default:
      return withRevisionStep({
        workflowKey: slotKey,
        label: blueprintWorkflowLabel(slotKey),
        title: `${rowTitle} workflow`,
        subtitle: "기본 산출물 생성/검토 흐름",
        owner: "Builder",
        steps: [
          blueprintWorkflowStep({ key: `${slotKey}.sources`, title: "등록 자료 확인", detail: `${input.sourceCount}개 자료를 기준으로 합니다.`, done: sourceReady, active: !sourceReady }),
          blueprintWorkflowStep({ key: `${slotKey}.prd`, title: "브리프 기준선 확인", detail: "공통 산출물은 개발 요구사항 브리프 기준선을 먼저 사용합니다.", done: prdReady, active: sourceReady && !prdReady, blocked: !sourceReady }),
          commonSlotStep,
          blueprintWorkflowStep({ key: `${slotKey}.review`, title: "검토", detail: "산출물 내용을 검토하고 필요한 경우 재생성합니다.", done: rowApproved, active: rowReady && !rowApproved, blocked: !rowReady }),
        ],
      });
  }
}

export function sanitizeCodePart(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "item";
}

function action(screenCode: string, index: number, input: Omit<ScreenAction, "code" | "testId">): ScreenAction {
  const code = `ACT-${String(index).padStart(2, "0")}`;
  return {
    code,
    testId: `${screenCode.toLowerCase()}-${code.toLowerCase()}`,
    ...input,
  };
}

function ac(screenCode: string, index: number, description: string): AcceptanceCriterion {
  const code = `AC-${String(index).padStart(2, "0")}`;
  return {
    code,
    testId: `${screenCode.toLowerCase()}-${code.toLowerCase()}`,
    description,
  };
}

function defaultScreenStates(access: ScreenAccess): ScreenState[] {
  return [
    { name: "default", description: "정상 데이터와 기본 UI가 표시된다." },
    { name: "empty", description: "표시할 데이터가 없을 때 빈 상태를 명확히 안내한다." },
    { name: "loading", description: "비동기 처리 중 로딩 상태를 표시한다." },
    { name: "error", description: "요청 실패 또는 검증 오류를 사용자가 복구 가능한 문구로 표시한다." },
    { name: "permission", description: access === "public" ? "권한 제한 상태 없음." : `${SCREEN_ACCESS_LABEL[access] ?? access} 권한이 없으면 접근 제한 상태를 표시한다.` },
  ];
}

// 대상 시스템 아키텍쳐 mermaid 도식(코드펜스 없이 본문만). 제품 유형·스키마에서 deterministic 생성.
function buildArchitectureMermaid(input: { isWebApp: boolean; schemas: SchemaDefinition[] }): string {
  const dataNodes = input.schemas.length
    ? input.schemas.slice(0, 6)
    : [{ code: "SCH-001", name: "CoreEntity" } as SchemaDefinition];
  const lines: string[] = ["flowchart TB"];
  lines.push("  subgraph FE[\"Frontend\"]");
  if (input.isWebApp) {
    lines.push("    fe_app[\"App SPA (authenticated)\"]");
    lines.push("    fe_admin[\"Admin Console (admin)\"]");
  } else {
    lines.push("    fe_site[\"Public Site (public, SEO/AEO/GEO)\"]");
    lines.push("    fe_admin[\"Admin Console (admin)\"]");
  }
  lines.push("  end");
  lines.push("  subgraph API[\"API Layer\"]");
  lines.push("    api_rest[\"REST API Server\"]");
  if (input.isWebApp) lines.push("    api_ai[\"AI Server\"]");
  lines.push("  end");
  lines.push("  subgraph DATA[\"Data\"]");
  lines.push("    db[(\"PostgreSQL\")]");
  dataNodes.forEach((schema, index) => lines.push(`    d${index}["${schema.name}"]`));
  lines.push("  end");
  if (input.isWebApp) {
    lines.push("  fe_app --> api_rest");
    lines.push("  fe_admin --> api_rest");
    lines.push("  api_rest --> api_ai");
  } else {
    lines.push("  fe_site --> api_rest");
    lines.push("  fe_admin --> api_rest");
  }
  lines.push("  api_rest --> db");
  dataNodes.forEach((_, index) => lines.push(`  db --- d${index}`));
  return lines.join("\n");
}

// 아키텍쳐 정의서 deterministic 안전망. 제품 유형(웹서비스/웹앱)별 인프라·기술 스택 기본값.
export function buildFallbackArchitecture(input: {
  projectTitle: string;
  productBuilderBlueprintId: ProductBuilderBlueprintId;
  schemas: SchemaDefinition[];
  apis: ApiDefinition[];
}): Architecture {
  const isWebApp = input.productBuilderBlueprintId === "web-application-service-standard";
  const productLabel = productBuilderBlueprintOption(input.productBuilderBlueprintId).label;

  const techStack: TechStackItem[] = [
    { area: "프론트엔드(Frontend)", choice: "Next.js 15 (App Router), React 19, TypeScript", rationale: "SSR/CSR 혼합, 타입 안전성, 생태계 성숙도" },
    { area: "스타일(Styling)", choice: "Tailwind CSS, shadcn/Base-UI", rationale: "일관된 디자인 토큰과 접근성 컴포넌트" },
    { area: "백엔드(Backend)", choice: "product-builder-base apps/server (NestJS REST API)", rationale: "base 클론 고정 — controller/service/dto/module 패턴 재사용" },
    { area: "데이터베이스(Database)", choice: "PostgreSQL, Drizzle ORM", rationale: "관계형 무결성, 타입 세이프 쿼리" },
    { area: "인증(Auth)", choice: isWebApp ? "세션 기반 + OAuth(Google/Kakao 등)" : "관리자 인증, 공개 페이지 비인증", rationale: "제품 유형별 접근 모델" },
    { area: "배포(Deploy)", choice: "product-builder-base 배포 구성 고정(확정 후 보정)", rationale: "base 클론이 호스팅/CI/CD를 결정 — 프로젝트별 재정의 금지" },
  ];
  if (isWebApp) {
    techStack.push({ area: "AI", choice: "LLM Gateway(REST)", rationale: "AI 서버 분리로 모델 호출 일원화" });
  }

  const infrastructure: InfrastructureItem[] = [
    { code: "ARC-INF-001", name: "앱 호스팅", category: "hosting", provider: "product-builder-base 기준(확정 후 보정)", detail: isWebApp ? "App SPA + REST API 호스팅" : "공개 웹사이트 + 관리자 호스팅" },
    { code: "ARC-INF-002", name: "데이터베이스", category: "database", provider: "PostgreSQL", detail: "주 데이터 저장소(base 고정), 자동 백업" },
    { code: "ARC-INF-003", name: "오브젝트 스토리지", category: "storage", provider: "product-builder-base 기준(확정 후 보정)", detail: "이미지·첨부 파일 저장" },
    { code: "ARC-INF-004", name: "CDN", category: "cdn", provider: "product-builder-base 기준(확정 후 보정)", detail: "정적 자산·이미지 캐싱" },
    { code: "ARC-INF-005", name: "CI/CD", category: "ci-cd", provider: "product-builder-base 기준(확정 후 보정)", detail: "테스트·빌드·배포 파이프라인" },
    { code: "ARC-INF-006", name: "관측성", category: "observability", provider: "product-builder-base 기준(확정 후 보정)", detail: "에러 추적·성능 모니터링" },
  ];

  const components: ArchitectureComponent[] = isWebApp
    ? [
      { code: "ARC-CMP-001", name: "App SPA", layer: "frontend", responsibility: "로그인 후 반복 작업 중심 화면", techStack: ["Next.js", "React", "TypeScript"], dependsOn: ["ARC-CMP-003"] },
      { code: "ARC-CMP-002", name: "Admin Console", layer: "frontend", responsibility: "운영자 관리 화면", techStack: ["Next.js", "React"], dependsOn: ["ARC-CMP-003"] },
      { code: "ARC-CMP-003", name: "REST API Server", layer: "backend", responsibility: "비즈니스 로직·인증·데이터 접근", techStack: ["NestJS", "Drizzle ORM"], dependsOn: ["ARC-CMP-005"] },
      { code: "ARC-CMP-004", name: "AI Server", layer: "ai", responsibility: "LLM 호출·추론 오케스트레이션", techStack: ["LLM Gateway"], dependsOn: ["ARC-CMP-003"] },
      { code: "ARC-CMP-005", name: "PostgreSQL", layer: "data", responsibility: "주 데이터 저장소", techStack: ["PostgreSQL"] },
    ]
    : [
      { code: "ARC-CMP-001", name: "Public Site", layer: "frontend", responsibility: "공개 웹사이트(SEO/AEO/GEO)", techStack: ["Next.js", "React", "TypeScript"], dependsOn: ["ARC-CMP-003"] },
      { code: "ARC-CMP-002", name: "Admin Console", layer: "frontend", responsibility: "운영자 관리 화면", techStack: ["Next.js", "React"], dependsOn: ["ARC-CMP-003"] },
      { code: "ARC-CMP-003", name: "REST API Server", layer: "backend", responsibility: "서비스 백엔드·관리자 API", techStack: ["NestJS", "Drizzle ORM"], dependsOn: ["ARC-CMP-004"] },
      { code: "ARC-CMP-004", name: "PostgreSQL", layer: "data", responsibility: "주 데이터 저장소", techStack: ["PostgreSQL"] },
    ];

  return {
    overview: `${input.projectTitle}의 대상 시스템 아키텍쳐다. 제품 유형은 ${productLabel}이며, 프론트엔드·REST API·데이터 계층과 운영 인프라를 정리한다. (자료가 부족해 deterministic 기본값으로 생성됨 — 실제 인프라/스택은 확정 후 보정 필요)`,
    diagram: buildArchitectureMermaid({ isWebApp, schemas: input.schemas }),
    components,
    techStack,
    infrastructure,
    integrations: isWebApp
      ? ["OAuth 제공자(Google/Kakao 등)", "이메일/알림(Resend/알림톡 등)", "결제(선택)"]
      : ["검색엔진 색인(SEO)", "이메일/알림(선택)", "분석/통계(선택)"],
    dataFlow: isWebApp
      ? [
        "사용자 → App SPA → REST API → PostgreSQL",
        "AI 기능 요청 → REST API → AI Server → LLM Gateway",
        "운영자 → Admin Console → REST API → PostgreSQL",
      ]
      : [
        "방문자 → Public Site(SSR) → REST API → PostgreSQL",
        "운영자 → Admin Console → REST API → PostgreSQL",
        "검색엔진 → Public Site(정적/SSR) 색인",
      ],
  };
}

const SOURCE_INTAKE_WORKFLOW_LABELS = [
  "direct_text",
  "file_upload",
  "url",
  "figma",
  "notion_shared_page",
  "노션 공유페이지",
  "노션공유페이지",
  "Notion Shared Page",
] as const;

const SOURCE_INTAKE_METADATA_LABELS = [
  "source_type",
  "source type",
  "sourceType",
  "자료 유형",
  "자료유형",
  "수집 워크플로우",
  "Intake Workflow",
  "intake_workflow",
  "intakeWorkflow",
  "URL 가져오기",
  "URL Fetch",
  "URL 가져온 시각",
  "Fetched At",
  "URL 가져오기 오류",
  "Fetch Error",
  "fetch_status",
  "fetchStatus",
  "자료 지문",
  "Source Fingerprint",
  "source_fingerprint",
  "sourceFingerprint",
  "원본 보관",
  "Original Archive",
  "원본 파일",
  "Original File",
  "source_format",
  "sourceFormat",
  "포맷",
  "Format",
  "가져오기 상태",
  "Fetch Status",
  "가져온 본문",
  "Fetched Body",
  "본문",
  "Body",
  "등록 메모",
  "Notes",
] as const;

const SOURCE_SECTION_HEADING_LABELS = [
  "개요",
  "소개",
  "목적",
  "배경",
  "본문",
  "Body",
  "핵심 기능",
  "주요 기능",
  "기능 목록",
  "요구사항",
  "요구 사항",
  "Features",
  "Key Features",
  "Requirements",
  "Overview",
] as const;

function stripMarkdownListAndHeading(value: string): string {
  return value
    .replace(/^#{1,6}\s*/, "")
    .replace(/^[-*•\d.)\s]+/, "")
    .trim();
}

function compactMetadataText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s_()[\]{}（）:：\-–—|/\\]+/g, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function startsWithMetadataLabel(text: string, label: string): boolean {
  return new RegExp(`^${escapeRegExp(label)}(?:\\s*\\([^)]*\\))?\\s*(?:$|[:：|\\-–—])`, "i").test(text);
}

function isSourceIntakeMetadataText(value: string): boolean {
  const text = stripMarkdownListAndHeading(value).replace(/^\|\s*/, "").trim();
  if (!text) return false;
  if (/^https?:\/\/\S+$/i.test(text)) return true;
  if (/^(?:url|source url|figma url)\s*[:：]?\s*https?:\/\/\S+$/i.test(text)) return true;
  if (/^(?:자동 가져오기 실패|fetch failed|not_fetched|fetched|failed)\b/i.test(text)) return true;

  const compact = compactMetadataText(text);
  if (SOURCE_INTAKE_WORKFLOW_LABELS.some((label) =>
    compact === compactMetadataText(label) || startsWithMetadataLabel(text, label))) return true;
  if (SOURCE_INTAKE_WORKFLOW_LABELS.some((label) =>
    compact === compactMetadataText(`수집 워크플로우 ${label}`)
    || compact === compactMetadataText(`Intake Workflow ${label}`))) return true;

  return SOURCE_INTAKE_METADATA_LABELS.some((label) => {
    const labelCompact = compactMetadataText(label);
    return compact === labelCompact || startsWithMetadataLabel(text, label);
  });
}

function isSourceSectionHeadingText(value: string): boolean {
  const compact = compactMetadataText(stripMarkdownListAndHeading(value));
  if (!compact) return false;
  return SOURCE_SECTION_HEADING_LABELS.some((label) => compact === compactMetadataText(label));
}

function isSourceTitleText(value: string, source: SourceMaterial): boolean {
  const title = source.title.trim();
  if (!title || title.length > 120) return false;
  return compactMetadataText(stripMarkdownListAndHeading(value)) === compactMetadataText(title);
}

function isSourceExtractionNoiseText(value: string, source: SourceMaterial): boolean {
  return isSourceIntakeMetadataText(value)
    || isSourceSectionHeadingText(value)
    || isSourceTitleText(value, source);
}

function stripSourceIntakeMetadataLines(body: string): string {
  return body
    .split(/\n/)
    .filter((line) => !isSourceIntakeMetadataText(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function fallbackFunctionalRequirementsFromSources(sources: SourceMaterial[], productBuilderBasePackages?: unknown): FunctionalRequirement[] {
  const requirements: FunctionalRequirement[] = [];
  const seen = new Set<string>();
  for (const source of sources) {
    const lines = stripSourceIntakeMetadataLines(source.body)
      .split(/\n+/)
      .map((line) => stripMarkdownListAndHeading(line))
      .filter((line) => line.length >= 4)
      .filter((line) => !isSourceExtractionNoiseText(line, source));
    const candidates = lines.length > 0 ? lines : [source.body.trim(), source.title].filter(Boolean);
    for (const candidate of candidates) {
      const text = candidate.replace(/\s+/g, " ").trim().slice(0, 500);
      if (!text || isSourceExtractionNoiseText(text, source)) continue;
      const key = text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      requirements.push({
        code: `FR-${String(requirements.length + 1).padStart(3, "0")}`,
        title: text.length > 80 ? `${text.slice(0, 80)}...` : text,
        description: `Source: ${source.title}. ${text}`,
        priority: "should",
        targetSurfaces: constrainProductBuilderSurfaces(surfaceMatchesFromText(text), productBuilderBasePackages),
      });
      if (requirements.length >= 20) return requirements;
    }
  }
  return requirements;
}

export function buildFallbackPrd(input: {
  title?: string;
  sources: SourceMaterial[];
  productBuilderBlueprintId?: ProductBuilderBlueprintId;
  productBuilderBasePackageKeys?: ProductBuilderBasePackageKey[];
  now?: string;
  model?: string;
}): BlueprintPrd {
  const projectTitle = input.title?.trim()
    || input.sources[0]?.title?.trim()
    || "분석 프로젝트";
  const generatedAt = input.now ?? new Date().toISOString();
  const productBuilderBlueprint = productBuilderBlueprintContext(input.productBuilderBlueprintId ?? DEFAULT_PRODUCT_BUILDER_BLUEPRINT_ID);
  const productBuilderBasePackages = productBuilderBasePackageSelections(input.productBuilderBasePackageKeys);
  const schemas: SchemaDefinition[] = [];
  const apis: ApiDefinition[] = [];
  const layouts: LayoutDefinition[] = [];
  const functionalRequirements = fallbackFunctionalRequirementsFromSources(input.sources, productBuilderBasePackages);

  return {
    projectTitle,
    overview: `${projectTitle}의 등록 자료에서 확인된 요구사항을 기준으로 개발 요구사항 브리프를 도출한다. 자료에 없는 내용은 임의로 만들지 않고 후속 검토 항목으로 남긴다.`,
    goals: [
      "등록 자료에 명시된 문제, 사용자, 범위를 누락 없이 정리한다.",
      "기능 요구사항과 비기능 요구사항을 출처 기반으로 분리한다.",
      "스키마/API/화면정의서가 참조할 개발 요구사항 브리프 기준선을 확정한다.",
    ],
    scope: {
      inScope: functionalRequirements.length
        ? functionalRequirements.map((requirement) => requirement.title)
        : ["등록 자료에 명시된 요구사항"],
      outOfScope: [
        "등록 자료에 없는 신규 요구사항 임의 생성",
        "구현 및 배포 작업",
      ],
    },
    functionalRequirements,
    nonFunctionalRequirements: [],
    schemas,
    apis,
    layouts,
    architecture: buildFallbackArchitecture({
      projectTitle,
      productBuilderBlueprintId: input.productBuilderBlueprintId ?? DEFAULT_PRODUCT_BUILDER_BLUEPRINT_ID,
      schemas,
      apis,
    }),
    risks: [
      { code: "RISK-001", description: "등록 자료에 없는 요구사항을 확정할 수 없다.", mitigation: "추가 자료를 등록하거나 미확정(Undecided)으로 표시한다." },
    ],
    assumptions: [
      "입력 자료 밖의 내용은 임의로 생성하지 않는다.",
    ],
    productBuilderBlueprint,
    productBuilderBasePackages,
    generatedAt,
    confirmedAt: null,
    llmModel: input.model,
    usedFallback: true,
  };
}

type SourceScreenCandidate = {
  name: string;
  description: string;
  route: string;
  access: ScreenAccess;
  fields: string[];
  triggers: string[];
  patterns: RegExp[];
  requires?: RegExp[];
};

const INTERNAL_BUILDER_SCREEN_NAMES = new Set([
  "기획 자료 등록",
  "브리프 기준선 검토",
  "관리자 검수",
]);

const SOURCE_SCREEN_CANDIDATES: SourceScreenCandidate[] = [
  {
    name: "홈",
    description: "서비스 진입점으로 주요 배너, 추천/주요 콘텐츠, 핵심 진입 동선을 제공한다.",
    route: "/",
    access: "public",
    fields: ["banner", "primaryActions", "recommendedItems", "highlights"],
    triggers: ["주요 액션 선택", "추천 항목 선택"],
    patterns: [/홈\s*\(Home\)/i, /홈\(Home\)/i, /홈\s*화면/i, /홈탭/i, /메인\s*화면/i, /랜딩/i, /Home/i, /Main/i],
  },
  {
    name: "로그인",
    description: "사용자가 이메일/소셜 계정으로 로그인한다.",
    route: "/login",
    access: "public",
    fields: ["email", "password", "socialLogin", "loginButton"],
    triggers: ["로그인 제출", "소셜 로그인 선택"],
    patterns: [/로그인/i, /Login/i, /Sign\s*in/i, /로그인\s*화면/i],
  },
  {
    name: "회원가입",
    description: "신규 사용자가 계정을 생성한다.",
    route: "/signup",
    access: "public",
    fields: ["email", "password", "agreements", "submitButton"],
    triggers: ["가입 제출", "약관 동의"],
    patterns: [/회원가입/i, /가입/i, /Sign\s*up/i, /Register/i],
  },
  {
    name: "통합 검색",
    description: "검색어, 필터, 결과 탭으로 콘텐츠를 탐색하고 결과 상세로 이동한다.",
    route: "/search",
    access: "public",
    fields: ["query", "resultTabs", "results", "filters"],
    triggers: ["검색어 입력", "결과 선택", "필터 변경"],
    patterns: [/통합\s*검색/i, /검색/i, /Search/i, /필터/i, /검색결과/i],
  },
  {
    name: "목록",
    description: "주요 엔티티를 카테고리/정렬/필터로 조회하고 상세로 이동한다.",
    route: "/items",
    access: "public",
    fields: ["category", "sort", "itemCards", "pagination"],
    triggers: ["카테고리 선택", "정렬 변경", "항목 선택"],
    patterns: [/목록/i, /리스트/i, /List/i, /카드\s*목록/i, /피드/i, /Feed/i],
  },
  {
    name: "상세",
    description: "선택한 항목의 상세 정보와 관련 액션을 제공한다.",
    route: "/items/:itemId",
    access: "public",
    fields: ["detail", "relatedActions", "metadata"],
    triggers: ["주요 액션 선택", "관련 항목 선택"],
    patterns: [/상세/i, /Detail/i, /상세\s*화면/i],
  },
  {
    name: "커뮤니티",
    description: "게시글을 카테고리/정렬로 조회하고 상세/작성 플로우로 진입한다.",
    route: "/community",
    access: "public",
    fields: ["category", "sort", "postCards", "writeButton"],
    triggers: ["카테고리 선택", "정렬 변경", "게시글 선택", "글쓰기 선택"],
    patterns: [/커뮤니티/i, /Community/i, /게시판/i, /게시글\s*카드/i],
  },
  {
    name: "게시글 상세",
    description: "게시글 본문, 댓글, 작성자, 신고/공유 동작을 처리한다.",
    route: "/community/posts/:postId",
    access: "public",
    fields: ["postBody", "comments", "authorProfile", "reportButton", "shareButton"],
    triggers: ["댓글 입력", "작성자 선택", "신고 선택", "공유 선택"],
    patterns: [/게시글\s*상세/i, /댓글/i, /Comment/i, /신고/i],
  },
  {
    name: "작성/편집",
    description: "회원이 콘텐츠를 작성/편집하고 비회원은 로그인 필요 상태로 분기한다.",
    route: "/items/new",
    access: "authenticated",
    fields: ["title", "body", "category", "submitButton"],
    triggers: ["저장", "작성 취소"],
    patterns: [/작성/i, /글쓰기/i, /등록/i, /편집/i, /Create/i, /Write/i, /Edit/i],
  },
  {
    name: "마이페이지",
    description: "회원 프로필, 내 활동, 저장 항목, 설정, 로그아웃/탈퇴를 관리한다.",
    route: "/my",
    access: "authenticated",
    fields: ["profile", "activityTabs", "savedItems", "settings"],
    triggers: ["프로필 수정", "내 활동 탭 선택", "저장 항목 선택", "로그아웃 선택"],
    patterns: [/마이페이지/i, /My\s*Page/i, /내\s*정보/i, /내\s*활동/i, /프로필/i],
  },
  {
    name: "Admin 로그인",
    description: "운영자가 관리자 영역에 접근하기 위해 로그인한다.",
    route: "/admin/login",
    access: "public",
    fields: ["email", "password", "loginButton"],
    triggers: ["로그인 제출"],
    patterns: [/Admin\s*로그인/i, /관리자\s*로그인/i],
  },
  {
    name: "Admin 대시보드",
    description: "운영 처리 대기 큐와 핵심 지표를 카드로 표시한다.",
    route: "/admin",
    access: "admin",
    fields: ["queues", "metrics", "shortcuts"],
    triggers: ["처리 대기 카드 선택"],
    patterns: [/대시보드/i, /Dashboard/i, /관리자\s*홈/i],
    requires: [/관리자|Admin|어드민|백오피스/i],
  },
  {
    name: "Admin 콘텐츠 관리",
    description: "콘텐츠/게시글/신고를 검색·필터하고 삭제/복원/반려로 운영한다.",
    route: "/admin/content",
    access: "admin",
    fields: ["keyword", "filter", "itemList", "decision"],
    triggers: ["검색", "삭제 처리", "복원 처리", "반려 처리"],
    patterns: [/콘텐츠\s*관리/i, /게시글\s*관리/i, /신고\s*처리/i, /운영\s*관리/i],
    requires: [/관리자|Admin|어드민|백오피스/i],
  },
  {
    name: "Admin 사용자 관리",
    description: "회원을 검색하고 가입일·활동·제재 상태를 조회/처리한다.",
    route: "/admin/users",
    access: "admin",
    fields: ["keyword", "userList", "status", "actions"],
    triggers: ["회원 검색", "회원 상세 조회", "상태 변경"],
    patterns: [/사용자\s*관리/i, /회원\s*관리/i, /User\s*management/i],
    requires: [/관리자|Admin|어드민|백오피스/i],
  },
];

function sourceCorpus(sources: SourceMaterial[]): string {
  return sources.map((source) => `${source.title}\n${source.body}`).join("\n\n");
}

function extractSourceScreenCandidates(sources: SourceMaterial[]): SourceScreenCandidate[] {
  const text = sourceCorpus(sources);
  return SOURCE_SCREEN_CANDIDATES.filter((candidate) => {
    const requirementsMet = !candidate.requires || candidate.requires.every((pattern) => pattern.test(text));
    return requirementsMet && candidate.patterns.some((pattern) => pattern.test(text));
  });
}

function inferProjectTitleFromSources(sources: SourceMaterial[], fallback: string): string {
  const text = sourceCorpus(sources);
  const projectNameMatch = text.match(/프로젝트명\s+(.{2,80}?)(?:\s+프로젝트\s*목적|\s+프로젝트\s+목적|\n|$)/);
  if (projectNameMatch?.[1]) {
    return projectNameMatch[1].trim().replace(/\s+/g, " ");
  }
  return fallback;
}

function isGenericFallbackBlueprintPrd(plan: BlueprintPrd): boolean {
  if (plan.usedFallback) return true;
  if (/COS 분석 프로젝트|아키텍쳐 정의서\(Architecture Definition\)|Architecture Definition/i.test(plan.projectTitle)) return true;
  const titles = plan.functionalRequirements.map((requirement) => requirement.title);
  return titles.some((title) => INTERNAL_BUILDER_SCREEN_NAMES.has(title));
}

export function buildScreenAwarePrd(input: {
  prd: BlueprintPrd;
  sources: SourceMaterial[];
}): BlueprintPrd {
  const candidates = extractSourceScreenCandidates(input.sources);
  if (candidates.length === 0 || !isGenericFallbackBlueprintPrd(input.prd)) {
    return input.prd;
  }

  const projectTitle = inferProjectTitleFromSources(input.sources, input.prd.projectTitle);
  const functionalRequirements: FunctionalRequirement[] = candidates.map((candidate, index) => ({
    code: `FR-${String(index + 1).padStart(3, "0")}`,
    title: candidate.name,
    description: candidate.description,
    priority: candidate.access === "admin" ? "should" : "must",
  }));

  return {
    ...input.prd,
    projectTitle,
    overview: `${projectTitle}의 등록 자료에서 확인된 사용자/관리자 화면을 기준으로 화면정의서 생성을 위한 기준선을 보정했다.`,
    goals: [
      `${projectTitle}의 핵심 사용자 화면을 누락 없이 정의한다.`,
      "관리자 운영 화면과 사용자 화면의 권한 분기를 분리한다.",
      "각 화면의 상태, 입력 필드, 사용자 액션, 검수 기준을 QA 가능한 단위로 정리한다.",
    ],
    scope: {
      inScope: candidates.map((candidate) => `${candidate.name} 화면 정의`),
      outOfScope: input.prd.scope.outOfScope.length
        ? input.prd.scope.outOfScope
        : ["실제 기능 구현", "운영 데이터 직접 이관"],
    },
    functionalRequirements,
  };
}

// 분석 ②단계 deterministic 안전망. 확정된 개발 요구사항 브리프 + 원본 자료에서 화면 템플릿을 생성.
export function buildFallbackScreenPlan(input: {
  sources: SourceMaterial[];
  prd?: BlueprintPrd;
  now?: string;
  model?: string;
}): ScreenPlan {
  const sourceDrivenCandidates = extractSourceScreenCandidates(input.sources);
  const firstSchema = input.prd?.schemas[0]?.code ?? "SCH-001";
  const schemaCodes = input.prd?.schemas.length ? input.prd.schemas.slice(0, 3).map((schema) => schema.code) : [firstSchema];
  const firstApi = input.prd?.apis[0]?.code ?? "API-001";
  const apiCodes = input.prd?.apis.length ? input.prd.apis.slice(0, 3).map((api) => api.code) : [firstApi];
  if (sourceDrivenCandidates.length > 0) {
    return {
      screens: sourceDrivenCandidates.map((candidate, index): ScreenDefinition => {
        const code = `SCR-${String(index + 1).padStart(3, "0")}`;
        return {
          code,
          name: candidate.name,
          description: candidate.description,
          targetSurface: inferScreenTargetSurface(candidate as unknown as Partial<ScreenDefinition> & Record<string, unknown>, candidate.access, candidate.route, input.prd?.productBuilderBasePackages),
          layoutCode: "LAY-001",
          layoutSlot: candidate.access === "admin" ? "SLOT-ADMIN-MAIN" : "SLOT-MAIN",
          route: candidate.route,
          access: candidate.access,
          primaryTestId: sanitizeCodePart(`${code}-${candidate.name}`),
          schemas: schemaCodes,
          apis: apiCodes,
          fields: candidate.fields,
          states: defaultScreenStates(candidate.access),
          actions: candidate.triggers.slice(0, 4).map((trigger, actionIndex) => action(code, actionIndex + 1, {
            trigger,
            description: `${candidate.name} 화면에서 '${trigger}' 동작을 수행한다.`,
            apiCodes,
          })),
          acceptanceCriteria: [
            ac(code, 1, `${candidate.name} 화면의 기본 상태와 빈 상태가 구분되어 표시된다.`),
            ac(code, 2, `${candidate.name} 화면의 주요 액션이 권한 조건에 맞게 동작한다.`),
            ac(code, 3, `${candidate.name} 화면에서 오류 발생 시 사용자가 복구 가능한 안내를 볼 수 있다.`),
          ],
        };
      }),
      generatedAt: input.now ?? new Date().toISOString(),
      confirmedAt: null,
      llmModel: input.model,
      usedFallback: true,
    };
  }

  const fallbackRequirements = (input.prd?.functionalRequirements.length
    ? input.prd.functionalRequirements
    : fallbackFunctionalRequirementsFromSources(input.sources, input.prd?.productBuilderBasePackages))
    .filter((requirement) => !isInternalBuilderRequirement(requirement))
    .slice(0, 10);

  return {
    screens: fallbackRequirements.map((requirement, index): ScreenDefinition => {
      const code = `SCR-${String(index + 1).padStart(3, "0")}`;
      const access = /관리자|admin|운영자/i.test(`${requirement.title} ${requirement.description}`) ? "admin" : "authenticated";
      const targetSurface = inferScreenTargetSurface(
        requirement as unknown as Partial<ScreenDefinition> & Record<string, unknown>,
        access,
        `/screens/${String(index + 1).padStart(3, "0")}`,
        input.prd?.productBuilderBasePackages,
      );
      return {
        code,
        name: requirement.title,
        description: requirement.description || `${requirement.title} 요구사항을 처리하는 화면 후보다.`,
        targetSurface,
        layoutCode: "LAY-001",
        layoutSlot: access === "admin" ? "SLOT-ADMIN-MAIN" : "SLOT-MAIN",
        route: `/screens/${String(index + 1).padStart(3, "0")}`,
        access,
        primaryTestId: sanitizeCodePart(`${code}-${requirement.title}`),
        schemas: schemaCodes,
        apis: apiCodes,
        fields: [],
        states: defaultScreenStates(access),
        actions: [
          action(code, 1, {
            trigger: `${requirement.title} 주요 액션`,
            description: requirement.description || `${requirement.title} 요구사항을 수행한다.`,
            apiCodes,
          }),
        ],
        acceptanceCriteria: [
          ac(code, 1, `${requirement.title} 요구사항이 자료에 명시된 조건대로 검증된다.`),
          ac(code, 2, `${requirement.title} 화면의 빈 상태, 오류 상태, 권한 조건이 구분된다.`),
        ],
      };
    }),
    generatedAt: input.now ?? new Date().toISOString(),
    confirmedAt: null,
    llmModel: input.model,
    usedFallback: true,
  };
}

function isGenericFallbackScreenPlan(screenPlan: ScreenPlan): boolean {
  if (screenPlan.usedFallback) return true;
  return screenPlan.screens.some((screen) => INTERNAL_BUILDER_SCREEN_NAMES.has(screen.name) || hasInternalBuilderContent([
    screen.code,
    screen.name,
    screen.description,
    screen.layoutCode,
    screen.layoutSlot,
    screen.route,
    screen.primaryTestId,
    ...screen.fields,
    ...screen.actions.flatMap((item) => [item.code, item.testId, item.trigger, item.description, item.targetScreenCode ?? ""]),
    ...screen.acceptanceCriteria.flatMap((item) => [item.code, item.testId, item.description]),
  ].join(" ")));
}

export function repairGenericScreenPlanFromSources(input: {
  screenPlan: ScreenPlan;
  sources: SourceMaterial[];
  prd?: BlueprintPrd;
  model?: string;
}): ScreenPlan {
  if (!isGenericFallbackScreenPlan(input.screenPlan)) {
    return input.screenPlan;
  }

  return buildFallbackScreenPlan({
    sources: input.sources,
    prd: input.prd,
    now: input.screenPlan.generatedAt,
    model: input.screenPlan.llmModel ?? input.model,
  });
}

// 아키텍쳐 정의서 정규화. LLM이 누락/부분 출력하면 fallback으로 채운다. diagram은 mermaid 펜스 제거.
export function normalizeArchitectureJson(input: unknown, fallback: Architecture): Architecture {
  const record = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const str = (value: unknown, defaultValue: string) => typeof value === "string" && value.trim() ? value.trim() : defaultValue;
  const strArr = (value: unknown, defaultValue: string[]) => Array.isArray(value)
    ? value.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim())
    : defaultValue;
  const layer = (value: unknown): ArchitectureLayer => (ARCHITECTURE_LAYERS as readonly string[]).includes(value as string) ? value as ArchitectureLayer : "backend";
  const category = (value: unknown): InfrastructureCategory => (INFRASTRUCTURE_CATEGORIES as readonly string[]).includes(value as string) ? value as InfrastructureCategory : "other";

  const components = Array.isArray(record.components) && record.components.length > 0
    ? (record.components as Record<string, unknown>[]).map((component, index) => ({
      code: str(component.code, `ARC-CMP-${String(index + 1).padStart(3, "0")}`),
      name: str(component.name, `Component ${index + 1}`),
      layer: layer(component.layer),
      responsibility: str(component.responsibility, ""),
      techStack: strArr(component.techStack, []),
      dependsOn: strArr(component.dependsOn, []),
    }))
    : fallback.components;

  const techStack = Array.isArray(record.techStack) && record.techStack.length > 0
    ? (record.techStack as Record<string, unknown>[]).map((item) => ({
      area: str(item.area, ""),
      choice: str(item.choice, ""),
      rationale: typeof item.rationale === "string" && item.rationale.trim() ? item.rationale.trim() : undefined,
    })).filter((item) => item.area || item.choice)
    : fallback.techStack;

  const infrastructure = Array.isArray(record.infrastructure) && record.infrastructure.length > 0
    ? (record.infrastructure as Record<string, unknown>[]).map((item, index) => ({
      code: str(item.code, `ARC-INF-${String(index + 1).padStart(3, "0")}`),
      name: str(item.name, `Infra ${index + 1}`),
      category: category(item.category),
      detail: str(item.detail, ""),
      provider: typeof item.provider === "string" && item.provider.trim() ? item.provider.trim() : undefined,
    }))
    : fallback.infrastructure;

  const rawDiagram = str(record.diagram, fallback.diagram);
  const diagram = rawDiagram.replace(/^```(?:mermaid)?\s*/i, "").replace(/\s*```$/i, "").trim() || fallback.diagram;

  return {
    overview: str(record.overview, fallback.overview),
    diagram,
    components: components.length ? components : fallback.components,
    techStack: techStack.length ? techStack : fallback.techStack,
    infrastructure: infrastructure.length ? infrastructure : fallback.infrastructure,
    integrations: strArr(record.integrations, fallback.integrations),
    dataFlow: strArr(record.dataFlow, fallback.dataFlow),
  };
}

export function normalizePrdJson(input: unknown, fallback: BlueprintPrd): BlueprintPrd {
  const record = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const pickString = (key: string, defaultValue: string) =>
    typeof record[key] === "string" && String(record[key]).trim() ? String(record[key]).trim() : defaultValue;
  const pickStringArray = (key: string, defaultValue: string[]) =>
    Array.isArray(record[key]) ? (record[key] as unknown[]).filter((v): v is string => typeof v === "string" && v.trim().length > 0) : defaultValue;
  const str = (value: unknown, defaultValue: string) =>
    typeof value === "string" && value.trim() ? value.trim() : defaultValue;

  const schemas = Array.isArray(record.schemas)
    ? record.schemas as SchemaDefinition[]
    : fallback.schemas;
  const apis = Array.isArray(record.apis)
    ? record.apis as ApiDefinition[]
    : fallback.apis;
  const layouts = Array.isArray(record.layouts)
    ? record.layouts as LayoutDefinition[]
    : fallback.layouts;
  const frs = Array.isArray(record.functionalRequirements)
    ? record.functionalRequirements as FunctionalRequirement[]
    : fallback.functionalRequirements;
  const risks = Array.isArray(record.risks)
    ? record.risks as Risk[]
    : fallback.risks;
  const scopeRecord = record.scope && typeof record.scope === "object" ? record.scope as Record<string, unknown> : {};
  const inScope = Array.isArray(scopeRecord.inScope)
    ? (scopeRecord.inScope as unknown[]).filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : fallback.scope.inScope;
  const outOfScope = Array.isArray(scopeRecord.outOfScope)
    ? (scopeRecord.outOfScope as unknown[]).filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : fallback.scope.outOfScope;
  const functionalRequirements = frs.map((fr, index) => {
    const r = fr as Record<string, unknown>;
    return {
      code: str(fr.code, `FR-${String(index + 1).padStart(3, "0")}`),
      title: str(fr.title, `요구사항 ${index + 1}`),
      description: str(fr.description, ""),
      priority: fr.priority === "must" || fr.priority === "should" || fr.priority === "could" ? fr.priority : undefined,
      targetSurfaces: inferFunctionalRequirementSurfaces(fr as FunctionalRequirement & Record<string, unknown>, fallback.productBuilderBasePackages),
      sourceInventoryItemIds: Array.isArray(fr.sourceInventoryItemIds)
        ? fr.sourceInventoryItemIds.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        : undefined,
      userRole: firstMeaningfulString(r.userRole, r.user, r.actor, r.primaryUser),
      preconditions: firstMeaningfulString(r.preconditions, r.precondition, r.entryCondition, r.trigger),
      doneCondition: firstMeaningfulString(r.doneCondition, r.completion, r.exitCondition, r.expectedResult),
      mainFlow: meaningfulStringList(r.mainFlow, r.flow, r.steps, r.happyPath),
      exceptions: meaningfulStringList(r.exceptions, r.exceptionFlow, r.edgeCases, r.errorCases),
      inputSummary: firstMeaningfulString(r.inputSummary, r.input, r.inputs),
      outputSummary: firstMeaningfulString(r.outputSummary, r.output, r.outputs),
    };
  }).filter((requirement) => !isInternalBuilderRequirement(requirement));
  const normalizedSchemas = schemas.map((schema, index) => {
    const record = schema as SchemaDefinition & Record<string, unknown>;
    const name = firstMeaningfulString(record.name, record.schemaName, record.entityName, record.displayName, record.tableName)
      ?? `스키마 ${index + 1}`;
    const tableName = firstMeaningfulString(record.tableName, record.table, record.dbTable, record.collectionName);
    const description = firstMeaningfulString(
      record.description,
      record.summary,
      record.purpose,
      record.schemaSummary,
      record.businessMeaning,
      record.domainDescription,
    ) ?? `${name} 데이터 구조와 저장 규칙을 정의한다.`;
    return {
      ...schema,
      code: firstMeaningfulString(record.code, record.schemaCode) || `SCH-${String(index + 1).padStart(3, "0")}`,
      name,
      description,
      fields: normalizeSchemaFields(record.fields ?? record.columns ?? record.properties ?? record.attributes),
      sourceRequirementCodes: normalizeRequirementCodeRefs(
        record.sourceRequirementCodes
          ?? record.featureCodes
          ?? record.relatedFeatureCodes
          ?? record.featureRefs
          ?? record.relatedFeatures
          ?? record.functionalRequirementCodes,
        functionalRequirements,
      ),
      relations: stringArrayFromUnknown(record.relations ?? record.relationships ?? record.foreignKeys ?? record.references),
      tableName,
      drizzleExportName: firstMeaningfulString(record.drizzleExportName, record.exportName, record.schemaExportName),
      baseReuseDecision: normalizeBaseSchemaReuseDecision(record.baseReuseDecision ?? record.reuseDecision),
      baseDrizzleReferences: normalizeBaseDrizzleReferences(record.baseDrizzleReferences ?? record.baseSchemaReferences ?? record.drizzleReferences),
      migrationScope: stringArrayFromUnknown(record.migrationScope ?? record.migrations ?? record.migrationNotes),
      indexes: stringArrayFromUnknown(record.indexes ?? record.indices),
      enums: stringArrayFromUnknown(record.enums ?? record.enumValues),
      implementationNotes: stringArrayFromUnknown(record.implementationNotes ?? record.notes),
      acceptanceCriteria: stringArrayFromUnknown(record.acceptanceCriteria),
    };
  }).filter((schema) => !isInternalBuilderSchema(schema));
  const normalizedApis = apis.map((api, index) => {
    const record = api as ApiDefinition & Record<string, unknown>;
    const method = firstMeaningfulString(record.method, record.httpMethod)?.toUpperCase();
    const normalizedMethod: ApiDefinition["method"] = method === "GET" || method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE"
      ? method
      : "GET";
    return {
      ...api,
      code: firstMeaningfulString(record.code, record.apiCode) || `API-${String(index + 1).padStart(3, "0")}`,
      method: normalizedMethod,
      path: firstMeaningfulString(record.path, record.endpoint, record.route, record.url) ?? api.path,
      summary: firstMeaningfulString(record.summary, record.description, record.purpose, record.operation, record.name) ?? api.summary,
      input: normalizeApiParameters(record.input ?? record.inputs ?? record.request ?? record.requestFields ?? record.requestBody ?? record.params ?? record.parameters),
      output: normalizeApiParameters(record.output ?? record.outputs ?? record.response ?? record.responseFields ?? record.responseBody ?? record.result),
      schemas: stringArrayFromUnknown(record.schemas ?? record.schemaCodes ?? record.relatedSchemaCodes),
      sourceRequirementCodes: normalizeRequirementCodeRefs(
        record.sourceRequirementCodes
          ?? record.featureCodes
          ?? record.relatedFeatureCodes
          ?? record.featureRefs
          ?? record.relatedFeatures
          ?? record.functionalRequirementCodes,
        functionalRequirements,
      ),
      baseReuseDecision: normalizeBaseSchemaReuseDecision(record.baseReuseDecision ?? record.reuseDecision),
      baseFeatureReferences: normalizeBaseFeatureApiReferences(record.baseFeatureReferences ?? record.baseApiReferences ?? record.featureReferences),
      serverExposure: firstMeaningfulString(record.serverExposure, record.appModuleExposure, record.providedBy),
      customizationScope: stringArrayFromUnknown(record.customizationScope),
      implementationNotes: stringArrayFromUnknown(record.implementationNotes ?? record.notes),
      errors: normalizeApiErrors(record.errors ?? record.errorCases ?? record.failures),
      acceptanceCriteria: stringArrayFromUnknown(record.acceptanceCriteria),
    };
  }).filter((api) => !isInternalBuilderApi(api));
  const normalizedLayouts = layouts.map((layout, index) => ({
    ...layout,
    code: layout.code || `LAY-${String(index + 1).padStart(3, "0")}`,
    slots: Array.isArray(layout.slots) ? layout.slots : [],
  })).filter((layout) => !isInternalBuilderLayout(layout));

  return {
    projectTitle: pickString("projectTitle", fallback.projectTitle),
    overview: pickString("overview", fallback.overview),
    goals: pickStringArray("goals", fallback.goals),
    scope: {
      inScope: inScope.length ? inScope : fallback.scope.inScope,
      outOfScope: outOfScope.length ? outOfScope : fallback.scope.outOfScope,
    },
    functionalRequirements,
    nonFunctionalRequirements: pickStringArray("nonFunctionalRequirements", fallback.nonFunctionalRequirements),
    schemas: normalizedSchemas,
    apis: normalizedApis,
    layouts: normalizedLayouts,
    architecture: sanitizeArchitecture(normalizeArchitectureJson(record.architecture, fallback.architecture), fallback.architecture),
    risks: risks.map((risk, index) => ({
      code: str(risk.code, `RISK-${String(index + 1).padStart(3, "0")}`),
      description: str(risk.description, ""),
      mitigation: str(risk.mitigation, ""),
    })),
    assumptions: pickStringArray("assumptions", fallback.assumptions),
    productBuilderBlueprint: fallback.productBuilderBlueprint,
    productBuilderBasePackages: fallback.productBuilderBasePackages,
    generatedAt: typeof record.generatedAt === "string" ? record.generatedAt : fallback.generatedAt,
    confirmedAt: null,
    llmModel: typeof record.llmModel === "string" ? record.llmModel : fallback.llmModel,
    usedFallback: false,
  };
}

// 단일 화면 정의 정규화. normalizeScreenPlanJson과 단일 화면 regen 양쪽에서 재사용.
// render가 하드 의존하는 문자열 필드는 반드시 채우고, access는 명시값 우선·route 추론 기본.
export function normalizeScreenDefinition(raw: unknown, index: number, productBuilderBasePackages?: unknown): ScreenDefinition {
  const screen = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown> & Partial<ScreenDefinition>;
  const str = (value: unknown, defaultValue: string) =>
    typeof value === "string" && value.trim() ? value.trim() : defaultValue;
  const code = str(screen.code, `SCR-${String(index + 1).padStart(3, "0")}`);
  const route = str(screen.route, "");
  const access = inferScreenAccess(screen.access, route);
  return {
    code,
    name: str(screen.name, code),
    description: str(screen.description, ""),
    targetSurface: inferScreenTargetSurface(screen, access, route, productBuilderBasePackages),
    layoutCode: str(screen.layoutCode, ""),
    layoutSlot: str(screen.layoutSlot, ""),
    route,
    access,
    primaryTestId: str(screen.primaryTestId, code.toLowerCase()),
    schemas: Array.isArray(screen.schemas) ? screen.schemas : [],
    apis: Array.isArray(screen.apis) ? screen.apis : [],
    fields: Array.isArray(screen.fields) ? screen.fields : [],
    states: Array.isArray(screen.states) && screen.states.length > 0
      ? screen.states.map((item) => ({
        name: item?.name === "empty" || item?.name === "loading" || item?.name === "error" || item?.name === "permission"
          ? item.name
          : "default",
        description: str(item?.description, ""),
      }))
      : defaultScreenStates(access),
    actions: Array.isArray(screen.actions)
      ? screen.actions.map((item, i) => {
        const codePart = str(item?.code, `ACT-${String(i + 1).padStart(2, "0")}`);
        return {
          ...item,
          code: codePart,
          testId: str(item?.testId, `${code.toLowerCase()}-${codePart.toLowerCase()}`),
          trigger: str(item?.trigger, ""),
          description: str(item?.description, ""),
          apiCodes: Array.isArray(item?.apiCodes) ? item.apiCodes : [],
        };
      })
      : [],
    acceptanceCriteria: Array.isArray(screen.acceptanceCriteria)
      ? screen.acceptanceCriteria.map((item, i) => {
        const codePart = str(item?.code, `AC-${String(i + 1).padStart(2, "0")}`);
        return {
          ...item,
          code: codePart,
          testId: str(item?.testId, `${code.toLowerCase()}-${codePart.toLowerCase()}`),
          description: str(item?.description, ""),
        };
      })
      : [],
  };
}

export function normalizeScreenPlanJson(input: unknown, fallback: ScreenPlan, productBuilderBasePackages?: unknown): ScreenPlan {
  const record = input && typeof input === "object" ? input as Record<string, unknown> : {};
  // LLM이 screens를 누락/빈배열로 주거나 요소가 객체가 아니면 fallback으로 대체하고 usedFallback 표기.
  const rawScreens = Array.isArray(record.screens)
    ? (record.screens as unknown[]).filter((s): s is ScreenDefinition => s !== null && typeof s === "object")
    : [];
  const usedFallback = rawScreens.length === 0;
  const screens = usedFallback ? fallback.screens : rawScreens;

  return {
    screens: screens.map((screen, screenIndex) => normalizeScreenDefinition(screen, screenIndex, productBuilderBasePackages)),
    generatedAt: typeof record.generatedAt === "string" ? record.generatedAt : fallback.generatedAt,
    confirmedAt: null,
    llmModel: typeof record.llmModel === "string" ? record.llmModel : fallback.llmModel,
    usedFallback,
  };
}

function normalizeInventoryCategory(value: unknown): RequirementInventoryCategory {
  return REQUIREMENT_INVENTORY_CATEGORIES.includes(value as RequirementInventoryCategory)
    ? value as RequirementInventoryCategory
    : "functional_requirement";
}

function normalizeInventoryStatus(value: unknown): RequirementInventoryStatus {
  return REQUIREMENT_INVENTORY_STATUSES.includes(value as RequirementInventoryStatus)
    ? value as RequirementInventoryStatus
    : "candidate";
}

function clampConfidence(value: unknown): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return 0.7;
  return Math.max(0, Math.min(1, numberValue));
}

function inventoryString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function isOutputInventoryDeliverableSlot(value: unknown): value is OutputInventoryDeliverableSlotKey {
  return typeof value === "string" && OUTPUT_INVENTORY_DELIVERABLE_SLOTS.includes(value as OutputInventoryDeliverableSlotKey);
}

function uniqueOutputSlots(slots: readonly OutputInventoryDeliverableSlotKey[]): OutputInventoryDeliverableSlotKey[] {
  return [...new Set(slots)];
}

function inferDeliverableTargets(category: RequirementInventoryCategory, text: string): OutputInventoryDeliverableSlotKey[] {
  const value = text.toLowerCase();
  const targets: OutputInventoryDeliverableSlotKey[] = ["deliverable.prd"];
  if ([
    "functional_requirement",
    "actor_or_permission",
    "admin_operation",
    "payment",
    "notification",
    "upload_or_media",
    "ai_runtime",
  ].includes(category)) {
    targets.push("deliverable.feature_files");
  }
  if (category === "data_object" || /db|schema|table|field|데이터|테이블|필드|스키마/.test(value)) {
    targets.push("deliverable.schema_definition");
  }
  if ([
    "api_or_integration",
    "admin_operation",
    "payment",
    "notification",
    "upload_or_media",
    "ai_runtime",
  ].includes(category) || /api|webhook|callback|endpoint|연동|외부/.test(value)) {
    targets.push("deliverable.api_definition");
  }
  if ([
    "screen_candidate",
    "actor_or_permission",
    "api_or_integration",
    "data_object",
  ].includes(category) || /화면|페이지|route|라우트|ui|ux|layout|navigation|nav|sidebar|header|footer|레이아웃|탭|메뉴/.test(value)) {
    targets.push("deliverable.screen_definitions");
  }
  if ([
    "api_or_integration",
    "ai_runtime",
    "upload_or_media",
    "payment",
    "notification",
    "non_functional_requirement",
  ].includes(category) || /infra|hosting|database|storage|cdn|queue|observability|배포|인프라|호스팅|스토리지/.test(value)) {
    targets.push("deliverable.architecture");
  }
  if (category === "risk" || category === "missing_input_or_open_question") {
    targets.push("deliverable.prd");
  }
  return uniqueOutputSlots(targets);
}

function normalizeTargetDeliverables(value: unknown, category: RequirementInventoryCategory, text: string): OutputInventoryDeliverableSlotKey[] {
  const explicit = Array.isArray(value)
    ? value.filter(isOutputInventoryDeliverableSlot)
    : [];
  return explicit.length > 0 ? uniqueOutputSlots(explicit) : inferDeliverableTargets(category, text);
}

function sourceRefFromRecord(record: Record<string, unknown>, fallbackSource: SourceMaterial | null): RequirementInventorySourceRef {
  const sourceId = inventoryString(record.sourceId, fallbackSource?.id ?? "");
  const sourceTitle = inventoryString(record.sourceTitle, fallbackSource?.title ?? "Source");
  return {
    sourceId,
    sourceTitle,
    evidenceExcerpt: inventoryString(record.evidenceExcerpt ?? record.evidence, ""),
  };
}

export function normalizeRequirementInventoryJson(
  input: unknown,
  fallback: RequirementInventory,
  fallbackSource?: SourceMaterial,
): RequirementInventory {
  const record = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const rawItems = Array.isArray(record.items) ? record.items : [];
  const items = rawItems
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item, index): RequirementInventoryItem => {
      const rawRefs = Array.isArray(item.sourceRefs) ? item.sourceRefs : [];
      const sourceRefs = rawRefs
        .filter((ref): ref is Record<string, unknown> => Boolean(ref) && typeof ref === "object")
        .map((ref) => sourceRefFromRecord(ref, fallbackSource ?? null))
        .filter((ref) => ref.sourceId || ref.sourceTitle || ref.evidenceExcerpt);
      if (sourceRefs.length === 0 && fallbackSource) {
        sourceRefs.push({
          sourceId: fallbackSource.id,
          sourceTitle: fallbackSource.title,
          evidenceExcerpt: inventoryString(item.evidenceExcerpt ?? item.evidence ?? item.description, "").slice(0, 500),
        });
      }
      const category = normalizeInventoryCategory(item.category);
      const title = inventoryString(item.title, `요구사항 ${index + 1}`);
      const description = inventoryString(item.description, "");
      return {
        id: inventoryString(item.id, `REQ-${String(index + 1).padStart(3, "0")}`),
        category,
        targetDeliverables: normalizeTargetDeliverables(item.targetDeliverables, category, `${title} ${description}`),
        title,
        description,
        sourceRefs,
        confidence: clampConfidence(item.confidence),
        status: normalizeInventoryStatus(item.status),
      };
    })
    .filter((item) => (
      (item.title.length > 0 || item.description.length > 0)
      && !isSourceIntakeMetadataText(item.title)
      && !isSourceIntakeMetadataText(item.description)
      && !isSourceSectionHeadingText(item.title)
    ));

  return {
    deliverables: items.length > 0 ? buildRequirementInventoryDeliverables(items) : fallback.deliverables,
    items: items.length > 0 ? items : fallback.items,
    generatedAt: inventoryString(record.generatedAt, fallback.generatedAt),
    sourceCount: typeof record.sourceCount === "number" ? record.sourceCount : fallback.sourceCount,
    chunkCount: typeof record.chunkCount === "number" ? record.chunkCount : fallback.chunkCount,
    llmModel: inventoryString(record.llmModel, fallback.llmModel ?? ""),
    usedFallback: items.length === 0 ? true : fallback.usedFallback,
  };
}

function buildRequirementInventoryDeliverables(items: RequirementInventoryItem[]): RequirementInventoryDeliverable[] {
  return OUTPUT_INVENTORY_TARGETS.map((target): RequirementInventoryDeliverable => {
    const targetItems = items.filter((item) =>
      item.status !== "duplicate"
      && item.status !== "out_of_scope"
      && item.targetDeliverables.includes(target.slotKey)
    );
    return {
      slotKey: target.slotKey,
      title: target.title,
      purpose: target.purpose,
      units: targetItems.map((item, index): RequirementInventoryDeliverableUnit => ({
        unitId: `${target.prefix}-${String(index + 1).padStart(3, "0")}`,
        title: item.title,
        description: item.description,
        sourceItemIds: [item.id],
        sourceRefs: item.sourceRefs,
        requiredFields: [...target.requiredFields],
        exitCriteria: [...target.exitCriteria],
        dependsOn: [...target.dependsOn],
        status: item.status,
      })),
    };
  });
}

export function canonicalizeRequirementInventory(
  inventory: RequirementInventory,
): RequirementInventory {
  const byKey = new Map<string, RequirementInventoryItem>();
  for (const item of inventory.items) {
    const key = `${item.category}:${item.title.toLowerCase().replace(/\s+/g, " ").trim()}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        ...item,
        sourceRefs: [...item.sourceRefs],
      });
      continue;
    }
    byKey.set(key, {
      ...existing,
      description: existing.description.length >= item.description.length ? existing.description : item.description,
      confidence: Math.max(existing.confidence, item.confidence),
      status: existing.status === "confirmed" || item.status === "confirmed" ? "confirmed" : existing.status,
      targetDeliverables: uniqueOutputSlots([...existing.targetDeliverables, ...item.targetDeliverables]),
      sourceRefs: [...existing.sourceRefs, ...item.sourceRefs],
    });
  }
  const items = [...byKey.values()].map((item, index) => ({
    ...item,
    id: `REQ-${String(index + 1).padStart(3, "0")}`,
    sourceRefs: item.sourceRefs.filter((ref, refIndex, refs) => (
      refs.findIndex((candidate) =>
        candidate.sourceId === ref.sourceId
        && candidate.sourceTitle === ref.sourceTitle
        && candidate.evidenceExcerpt === ref.evidenceExcerpt
      ) === refIndex
    )),
  }));
  return { ...inventory, items, deliverables: buildRequirementInventoryDeliverables(items) };
}

export function buildFallbackRequirementInventory(input: {
  sources: SourceMaterial[];
  chunkCount?: number;
  model?: string;
}): RequirementInventory {
  const items: RequirementInventoryItem[] = [];
  for (const source of input.sources) {
    const lines = stripSourceIntakeMetadataLines(source.body)
      .split(/\n+/)
      .map((line) => stripMarkdownListAndHeading(line))
      .filter((line) => line.length >= 4)
      .filter((line) => !isSourceExtractionNoiseText(line, source));
    const candidates = lines.length > 0 ? lines : [source.body.trim()].filter(Boolean);
    for (const candidate of candidates) {
      const text = candidate.slice(0, 500);
      if (isSourceExtractionNoiseText(text, source)) continue;
      const category = inferInventoryCategory(text);
      items.push({
        id: `REQ-${String(items.length + 1).padStart(3, "0")}`,
        category,
        targetDeliverables: inferDeliverableTargets(category, text),
        title: text.length > 80 ? `${text.slice(0, 80)}...` : text,
        description: text,
        sourceRefs: [{
          sourceId: source.id,
          sourceTitle: source.title,
          evidenceExcerpt: text,
        }],
        confidence: 0.55,
        status: "candidate",
      });
    }
  }
  return canonicalizeRequirementInventory({
    deliverables: [],
    items,
    generatedAt: new Date().toISOString(),
    sourceCount: input.sources.length,
    chunkCount: input.chunkCount ?? input.sources.length,
    llmModel: input.model,
    usedFallback: true,
  });
}

function inferInventoryCategory(text: string): RequirementInventoryCategory {
  const value = text.toLowerCase();
  if (/admin|관리자|운영자/.test(value)) return "admin_operation";
  if (/payment|결제|subscription|구독|inicis|billing/.test(value)) return "payment";
  if (/notify|notification|알림|메일|email|alimtalk|문자/.test(value)) return "notification";
  if (/upload|file|첨부|파일|이미지|동영상|video|media/.test(value)) return "upload_or_media";
  if (/ai|llm|챗봇|추천|생성/.test(value)) return "ai_runtime";
  if (/권한|permission|role|actor|로그인|auth/.test(value)) return "actor_or_permission";
  if (/api|연동|integration|webhook|외부/.test(value)) return "api_or_integration";
  if (/db|schema|데이터|테이블|필드/.test(value)) return "data_object";
  if (/성능|보안|가용성|운영|로그|감사|audit|performance|security/.test(value)) return "non_functional_requirement";
  if (/리스크|위험|확인 필요|미정|불명|question/.test(value)) return "missing_input_or_open_question";
  if (/화면|페이지|screen|ui|ux|라우트/.test(value)) return "screen_candidate";
  return "functional_requirement";
}

function hasInternalBuilderContent(value: string): boolean {
  return /ProjectBrief|ScreenSpec|project-briefs|\/cos-blueprint|cos-blueprint|COS Blueprint|Blueprint PM|Builder 기본|SourceMaterial|기획 자료 등록|개발 요구사항 브리프\/계약 산출물 생성|브리프 기준선 검토|관리자 검수|화면정의서 생성 기준선/.test(value);
}

const INTERNAL_ENGINEERING_QUALITY_RULE_PATTERN = /\bSOLID\b|Single Responsibility|Open\/Closed|Open-Closed|Liskov|Interface Segregation|Dependency Inversion|단일\s*책임|개방\s*폐쇄|리스코프|인터페이스\s*분리|의존성\s*역전/;

function stripInternalEngineeringQualityRules(value: string): string {
  return value
    .split("\n")
    .filter((line) => !INTERNAL_ENGINEERING_QUALITY_RULE_PATTERN.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

const INTERNAL_BUILDER_REQUIREMENT_TITLES = new Set([
  "기획 자료 등록",
  "개발 요구사항 브리프/계약 산출물 생성",
  "화면정의서 생성",
  "첨부 파일 처리",
  "관리자 검수",
  "브리프 기준선 검토",
]);

function isInternalBuilderRequirement(requirement: FunctionalRequirement): boolean {
  const text = `${requirement.title} ${requirement.description}`;
  return INTERNAL_BUILDER_REQUIREMENT_TITLES.has(requirement.title)
    || hasInternalBuilderContent(text)
    || isSourceIntakeMetadataText(requirement.title)
    || isSourceSectionHeadingText(requirement.title)
    || (isSourceIntakeMetadataText(requirement.description) && requirement.title.length <= 80);
}

function isInternalBuilderSchema(schema: SchemaDefinition): boolean {
  const text = [
    schema.code,
    schema.name,
    schema.description,
    schema.owner ?? "",
    ...(schema.fields ?? []).flatMap((item) => [item.name, item.description, item.validation ?? "", item.example ?? ""]),
    ...(schema.relations ?? []),
    ...(schema.acceptanceCriteria ?? []),
  ].join(" ");
  return schema.name === "ProjectBrief"
    || schema.name === "ScreenSpec"
    || hasInternalBuilderContent(text);
}

function isInternalBuilderApi(api: ApiDefinition): boolean {
  const text = [
    api.code,
    api.method,
    api.path,
    api.summary,
    api.actor ?? "",
    api.auth ?? "",
    api.auditAction ?? "",
    ...(api.input ?? []).flatMap((item) => [item.name, item.type, item.description]),
    ...(api.output ?? []).flatMap((item) => [item.name, item.type, item.description]),
    ...(api.errors ?? []).flatMap((item) => [item.code, item.condition]),
    ...(api.acceptanceCriteria ?? []),
  ].join(" ");
  return /^\/api\/project-briefs(?:\/|$)/.test(api.path)
    || api.auditAction?.startsWith("cos_blueprint") === true
    || hasInternalBuilderContent(text);
}

function isInternalBuilderLayout(layout: LayoutDefinition): boolean {
  const text = [
    layout.code,
    layout.name,
    layout.description,
    ...(layout.slots ?? []).flatMap((item) => [item.code, item.name, item.purpose]),
  ].join(" ");
  return /^COS-LAY/i.test(layout.code)
    || layout.name === "Workspace Layout"
    || hasInternalBuilderContent(text);
}

function sanitizeArchitecture(architecture: Architecture, fallback: Architecture): Architecture {
  const filterInternal = <T>(items: T[], fallbackItems: T[], stringify: (item: T) => string): T[] => {
    const filtered = items.filter((item) => !hasInternalBuilderContent(stringify(item)));
    return filtered.length > 0 || items.length === 0 ? filtered : fallbackItems;
  };
  return {
    overview: hasInternalBuilderContent(architecture.overview) ? fallback.overview : architecture.overview,
    diagram: hasInternalBuilderContent(architecture.diagram) ? fallback.diagram : architecture.diagram,
    components: filterInternal(architecture.components, fallback.components, (item) => [
      item.code,
      item.name,
      item.layer,
      item.responsibility,
      ...item.techStack,
      ...(item.dependsOn ?? []),
    ].join(" ")),
    techStack: filterInternal(architecture.techStack, fallback.techStack, (item) => [
      item.area,
      item.choice,
      item.rationale ?? "",
    ].join(" ")),
    infrastructure: filterInternal(architecture.infrastructure, fallback.infrastructure, (item) => [
      item.code,
      item.name,
      item.category,
      item.detail,
      item.provider ?? "",
    ].join(" ")),
    integrations: filterInternal(architecture.integrations, fallback.integrations, (item) => item),
    dataFlow: filterInternal(architecture.dataFlow, fallback.dataFlow, (item) => item),
  };
}

function inventoryContainsRequirementTitle(inventory: RequirementInventory | null | undefined, title: string): boolean {
  if (!inventory) return false;
  const normalized = title.toLowerCase().replace(/\s+/g, " ").trim();
  return inventory.items.some((item) => item.title.toLowerCase().replace(/\s+/g, " ").trim() === normalized);
}

export function ensurePrdInventoryCoverage(
  plan: BlueprintPrd,
  inventory: RequirementInventory | null | undefined,
): BlueprintPrd {
  const functionalRequirements = plan.functionalRequirements.filter((requirement) => (
    !isInternalBuilderRequirement(requirement)
    || inventoryContainsRequirementTitle(inventory, requirement.title)
  ));
  if (!inventory || inventory.items.length === 0) {
    return { ...plan, functionalRequirements };
  }
  const nonFunctionalRequirements = [...plan.nonFunctionalRequirements];
  const risks = [...plan.risks];
  let nextFr = functionalRequirements.length + 1;
  let nextRisk = risks.length + 1;

  const hasCovered = (item: RequirementInventoryItem) => {
    const title = item.title.toLowerCase();
    return functionalRequirements.some((requirement) => (
      requirement.sourceInventoryItemIds?.includes(item.id)
      || requirement.title.toLowerCase() === title
      || requirement.description.toLowerCase().includes(title)
    ));
  };

  for (const item of inventory.items) {
    if (item.status === "duplicate" || item.status === "out_of_scope") continue;
    if (isSourceIntakeMetadataText(item.title) || isSourceIntakeMetadataText(item.description)) continue;
    if (isSourceSectionHeadingText(item.title)) continue;
    const sourceNote = item.sourceRefs
      .map((ref) => `${ref.sourceTitle}: ${ref.evidenceExcerpt}`)
      .filter(Boolean)
      .join(" | ");
    if (item.category === "risk") {
      if (!risks.some((risk) => risk.description.includes(item.title))) {
        risks.push({
          code: `RISK-${String(nextRisk).padStart(3, "0")}`,
          description: `${item.title} - ${item.description}`,
          mitigation: sourceNote ? `근거를 확인하고 구현 전 대응안을 확정한다. Source: ${sourceNote}` : "구현 전 대응안을 확정한다.",
        });
        nextRisk += 1;
      }
      continue;
    }
    if (item.category === "non_functional_requirement") {
      const text = `${item.title}: ${item.description}`;
      if (!nonFunctionalRequirements.some((entry) => entry.includes(item.title))) {
        nonFunctionalRequirements.push(text);
      }
      continue;
    }
    if (!hasCovered(item)) {
      functionalRequirements.push({
        code: `FR-${String(nextFr).padStart(3, "0")}`,
        title: item.title,
        description: [
          item.description,
          `Inventory category: ${item.category}.`,
          sourceNote ? `Source: ${sourceNote}` : null,
        ].filter((line): line is string => Boolean(line)).join(" "),
        priority: item.confidence >= 0.8 ? "must" : "should",
        sourceInventoryItemIds: [item.id],
      });
      nextFr += 1;
    }
  }

  return {
    ...plan,
    functionalRequirements,
    nonFunctionalRequirements,
    risks,
  };
}

// source 본문을 cap 적용해 프롬프트용 텍스트로 직렬화. 자료당/합산 상한 초과분은 절단 표기.
function buildSourceText(sources: SourceMaterial[]): string {
  let total = 0;
  const blocks: string[] = [];
  for (let index = 0; index < sources.length; index += 1) {
    const source = sources[index];
    const cleanBody = stripSourceIntakeMetadataLines(source.body);
    let body = cleanBody.length > SOURCE_BODY_CAP
      ? `${cleanBody.slice(0, SOURCE_BODY_CAP)}\n…(truncated)`
      : cleanBody;
    if (total + body.length > TOTAL_SOURCE_CAP) {
      body = `${body.slice(0, Math.max(0, TOTAL_SOURCE_CAP - total))}\n…(truncated)`;
    }
    total += body.length;
    blocks.push([
      `## Source ${index + 1}: ${source.title}`,
      `type: ${source.type}`,
      source.url ? `url: ${source.url}` : null,
      body,
    ].filter((line): line is string => line !== null).join("\n"));
    if (total >= TOTAL_SOURCE_CAP) {
      blocks.push(`…(이하 ${sources.length - index - 1}건 자료 생략, 합산 상한 도달)`);
      break;
    }
  }
  return blocks.join("\n\n");
}

function buildRequirementInventoryText(inventory: RequirementInventory): string {
  if (inventory.items.length === 0) return "(empty output inventory)";
  const compactText = (value: string, maxChars: number) => {
    const collapsed = value.replace(/\s+/g, " ").trim();
    if (collapsed.length <= maxChars) return collapsed;
    return `${collapsed.slice(0, Math.max(0, maxChars - 12)).trimEnd()} ...(truncated)`;
  };
  const compactIdList = (ids: string[]) => {
    const unique = [...new Set(ids)].filter(Boolean);
    if (unique.length <= 80) return unique.join(", ");
    return [
      ...unique.slice(0, 60),
      `... ${unique.length - 80} omitted ...`,
      ...unique.slice(-20),
    ].join(", ");
  };
  const fitBlocks = (blocks: string[]) => {
    const joined = blocks.join("\n");
    if (joined.length <= REQUIREMENT_INVENTORY_PROMPT_CAP) return joined;

    const marker = (omitted: number) => `...(${omitted} coverage item(s) omitted due prompt budget; tail items retained below)`;
    const head: string[] = [];
    const tail: string[] = [];
    let left = 0;
    let right = blocks.length - 1;
    let total = marker(blocks.length).length + 2;
    let takeHead = true;
    while (left <= right) {
      const candidate = takeHead ? blocks[left] : blocks[right];
      const extra = candidate.length + 1;
      if (total + extra > REQUIREMENT_INVENTORY_PROMPT_CAP) break;
      if (takeHead) {
        head.push(candidate);
        left += 1;
      } else {
        tail.unshift(candidate);
        right -= 1;
      }
      total += extra;
      takeHead = !takeHead;
    }
    return [...head, marker(Math.max(0, blocks.length - head.length - tail.length)), ...tail].join("\n");
  };
  const compactTarget = (slotKey: string) => {
    switch (slotKey) {
      case "deliverable.prd": return "drb";
      case "deliverable.feature_files": return "feature";
      case "deliverable.schema_definition": return "schema";
      case "deliverable.api_definition": return "api";
      case "deliverable.architecture": return "arch";
      case "deliverable.screen_definitions": return "screen";
      default: return slotKey.replace(/^deliverable\./, "");
    }
  };
  const deliverableText = inventory.deliverables.map((deliverable) => [
    `## ${deliverable.title} — ${deliverable.slotKey}`,
    `purpose: ${deliverable.purpose}`,
    `unitCount: ${deliverable.units.length}`,
    deliverable.units.length
      ? `sourceItems: ${compactIdList(deliverable.units.flatMap((unit) => unit.sourceItemIds))}`
      : "sourceItems: (none)",
    `requiredFields: ${deliverable.units[0]?.requiredFields.join(", ") ?? "(none)"}`,
    `exitCriteria: ${deliverable.units[0]?.exitCriteria.join(" | ") ?? "(none)"}`,
  ].join("\n")).join("\n\n");
  const itemBlocks = inventory.items.map((item) =>
    `- ${item.id} [${item.category}/${item.status}/${item.confidence}] ${item.targetDeliverables.map(compactTarget).join(",")} | ${compactText(item.title, REQUIREMENT_INVENTORY_ITEM_TITLE_CAP)}`);
  return ["# Internal Coverage Index", deliverableText, "## Source-backed Items", fitBlocks(itemBlocks)].join("\n\n");
}

export type BlueprintLlmTool = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

const STRING_ARRAY = { type: "array", items: { type: "string" } };

const API_PARAM_ARRAY = {
  type: "array",
  items: {
    type: "object",
    properties: {
      name: { type: "string" },
      type: { type: "string" },
      required: { type: "boolean" },
      description: { type: "string" },
    },
    required: ["name", "type"],
  },
};

const SCREEN_ITEM_SCHEMA = {
  type: "object",
  properties: {
    code: { type: "string" },
    name: { type: "string" },
    description: { type: "string" },
    targetSurface: { type: "string" },
    layoutCode: { type: "string" },
    layoutSlot: { type: "string" },
    route: { type: "string" },
    access: { type: "string", enum: ["public", "authenticated", "admin"] },
    primaryTestId: { type: "string" },
    schemas: STRING_ARRAY,
    apis: STRING_ARRAY,
    fields: STRING_ARRAY,
    states: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", enum: ["default", "empty", "loading", "error", "permission"] },
          description: { type: "string" },
        },
        required: ["name"],
      },
    },
    actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          code: { type: "string" },
          testId: { type: "string" },
          trigger: { type: "string" },
          description: { type: "string" },
          apiCodes: STRING_ARRAY,
          targetScreenCode: { type: "string" },
        },
        required: ["code"],
      },
    },
    acceptanceCriteria: {
      type: "array",
      items: {
        type: "object",
        properties: {
          code: { type: "string" },
          testId: { type: "string" },
          description: { type: "string" },
        },
        required: ["code", "description"],
      },
    },
  },
  required: ["code", "name"],
};

export const PRD_REQUIREMENTS_TOOL: BlueprintLlmTool = {
  name: "emit_requirements_brief",
  description: "개발 요구사항 브리프의 요구사항 부분을 구조화 데이터로 반환한다.",
  input_schema: {
    type: "object",
    properties: {
      projectTitle: { type: "string" },
      overview: { type: "string" },
      goals: STRING_ARRAY,
      scope: {
        type: "object",
        properties: { inScope: STRING_ARRAY, outOfScope: STRING_ARRAY },
      },
      functionalRequirements: {
        type: "array",
        items: {
          type: "object",
          properties: {
            code: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            priority: { type: "string", enum: ["must", "should", "could"] },
            targetSurfaces: STRING_ARRAY,
          },
          required: ["code", "title", "description"],
        },
      },
      nonFunctionalRequirements: STRING_ARRAY,
      layouts: { type: "array", items: { type: "object" } },
      architecture: { type: "object" },
      risks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            code: { type: "string" },
            description: { type: "string" },
            mitigation: { type: "string" },
          },
        },
      },
      assumptions: STRING_ARRAY,
    },
    required: ["projectTitle", "overview", "functionalRequirements"],
  },
};

export const PRD_CONTRACTS_TOOL: BlueprintLlmTool = {
  name: "emit_contracts",
  description: "확정된 기능 요구사항 기준 스키마 정의서와 REST API 정의서를 구조화 데이터로 반환한다.",
  input_schema: {
    type: "object",
    properties: {
      schemas: {
        type: "array",
        items: {
          type: "object",
          properties: {
            code: { type: "string" },
            name: { type: "string" },
            description: { type: "string" },
            tableName: { type: "string" },
            sourceRequirementCodes: STRING_ARRAY,
            baseReuseDecision: { type: "string" },
            baseDrizzleReferences: { type: "array", items: { type: "object" } },
            fields: API_PARAM_ARRAY,
            relations: STRING_ARRAY,
            indexes: STRING_ARRAY,
            enums: STRING_ARRAY,
            migrationScope: STRING_ARRAY,
          },
          required: ["code", "name"],
        },
      },
      apis: {
        type: "array",
        items: {
          type: "object",
          properties: {
            code: { type: "string" },
            method: { type: "string", enum: ["GET", "POST", "PATCH", "PUT", "DELETE"] },
            path: { type: "string" },
            summary: { type: "string" },
            sourceRequirementCodes: STRING_ARRAY,
            schemas: STRING_ARRAY,
            baseReuseDecision: { type: "string" },
            baseFeatureReferences: { type: "array", items: { type: "object" } },
            serverExposure: { type: "string" },
            customizationScope: STRING_ARRAY,
            input: API_PARAM_ARRAY,
            output: API_PARAM_ARRAY,
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: { code: { type: "string" }, condition: { type: "string" } },
                required: ["code"],
              },
            },
          },
          required: ["code", "method", "path"],
        },
      },
    },
    required: ["schemas", "apis"],
  },
};

export const SCREEN_PLAN_TOOL: BlueprintLlmTool = {
  name: "emit_screen_plan",
  description: "화면정의서 전체(화면 목록)를 구조화 데이터로 반환한다.",
  input_schema: {
    type: "object",
    properties: { screens: { type: "array", items: SCREEN_ITEM_SCHEMA } },
    required: ["screens"],
  },
};

export const SCREEN_REGEN_TOOL: BlueprintLlmTool = {
  name: "emit_screen",
  description: "수정된 화면정의서 1개를 구조화 데이터로 반환한다.",
  input_schema: {
    type: "object",
    properties: { screen: SCREEN_ITEM_SCHEMA },
    required: ["screen"],
  },
};

export const REVISION_TOOL: BlueprintLlmTool = {
  name: "emit_revision",
  description: "수정된 산출물 본문을 출력한다.",
  input_schema: {
    type: "object",
    properties: { body: { type: "string", description: "수정된 전체 본문(마크다운)." } },
    required: ["body"],
  },
};

const STAGE_FR_ITEM = {
  type: "object",
  properties: {
    code: { type: "string" },
    title: { type: "string" },
    description: { type: "string" },
    priority: { type: "string", enum: ["must", "should", "could"] },
    targetSurfaces: STRING_ARRAY,
    userRole: { type: "string" },
    preconditions: { type: "string" },
    doneCondition: { type: "string" },
    mainFlow: STRING_ARRAY,
    exceptions: STRING_ARRAY,
    inputSummary: { type: "string" },
    outputSummary: { type: "string" },
    sourceInventoryItemIds: STRING_ARRAY,
  },
  required: ["title", "description"],
};

const STAGE_SCHEMA_ITEM = {
  type: "object",
  properties: {
    code: { type: "string" },
    name: { type: "string" },
    description: { type: "string" },
    tableName: { type: "string" },
    drizzleExportName: { type: "string" },
    owner: { type: "string" },
    sourceRequirementCodes: STRING_ARRAY,
    baseReuseDecision: { type: "string" },
    baseDrizzleReferences: { type: "array", items: { type: "object" } },
    fields: API_PARAM_ARRAY,
    relations: STRING_ARRAY,
    indexes: STRING_ARRAY,
    enums: STRING_ARRAY,
    migrationScope: STRING_ARRAY,
  },
  required: ["code", "name"],
};

const STAGE_API_ITEM = {
  type: "object",
  properties: {
    code: { type: "string" },
    method: { type: "string", enum: ["GET", "POST", "PATCH", "PUT", "DELETE"] },
    path: { type: "string" },
    summary: { type: "string" },
    actor: { type: "string" },
    auth: { type: "string" },
    sourceRequirementCodes: STRING_ARRAY,
    schemas: STRING_ARRAY,
    baseReuseDecision: { type: "string" },
    baseFeatureReferences: { type: "array", items: { type: "object" } },
    serverExposure: { type: "string" },
    customizationScope: STRING_ARRAY,
    input: API_PARAM_ARRAY,
    output: API_PARAM_ARRAY,
    errors: {
      type: "array",
      items: {
        type: "object",
        properties: { code: { type: "string" }, condition: { type: "string" } },
        required: ["code"],
      },
    },
  },
  required: ["code", "method", "path"],
};

const STAGE_ARCHITECTURE_SCHEMA = {
  type: "object",
  properties: {
    overview: { type: "string" },
    diagram: { type: "string" },
    components: {
      type: "array",
      items: {
        type: "object",
        properties: {
          code: { type: "string" },
          name: { type: "string" },
          layer: { type: "string" },
          responsibility: { type: "string" },
          techStack: STRING_ARRAY,
          dependsOn: STRING_ARRAY,
        },
        required: ["name"],
      },
    },
    techStack: {
      type: "array",
      items: {
        type: "object",
        properties: { area: { type: "string" }, choice: { type: "string" }, rationale: { type: "string" } },
      },
    },
    infrastructure: {
      type: "array",
      items: {
        type: "object",
        properties: {
          code: { type: "string" },
          name: { type: "string" },
          category: { type: "string" },
          detail: { type: "string" },
          provider: { type: "string" },
        },
        required: ["name"],
      },
    },
    integrations: STRING_ARRAY,
    dataFlow: STRING_ARRAY,
  },
};

export const DRB_STAGE_TOOL: BlueprintLlmTool = {
  name: "emit_drb",
  description: "개발 요구사항 브리프/기능정의서 단계 데이터를 구조화 반환한다(스키마·API·아키텍처 제외).",
  input_schema: {
    type: "object",
    properties: {
      projectTitle: { type: "string" },
      overview: { type: "string" },
      goals: STRING_ARRAY,
      scope: { type: "object", properties: { inScope: STRING_ARRAY, outOfScope: STRING_ARRAY } },
      functionalRequirements: { type: "array", items: STAGE_FR_ITEM },
      nonFunctionalRequirements: STRING_ARRAY,
      risks: {
        type: "array",
        items: {
          type: "object",
          properties: { code: { type: "string" }, description: { type: "string" }, mitigation: { type: "string" } },
        },
      },
      assumptions: STRING_ARRAY,
    },
    required: ["overview", "functionalRequirements"],
  },
};

export const SCHEMA_STAGE_TOOL: BlueprintLlmTool = {
  name: "emit_schemas",
  description: "스키마 정의서 단계 데이터(schemas[])를 구조화 반환한다.",
  input_schema: {
    type: "object",
    properties: { schemas: { type: "array", items: STAGE_SCHEMA_ITEM } },
    required: ["schemas"],
  },
};

export const API_STAGE_TOOL: BlueprintLlmTool = {
  name: "emit_apis",
  description: "REST API 정의서 단계 데이터(apis[])를 구조화 반환한다.",
  input_schema: {
    type: "object",
    properties: { apis: { type: "array", items: STAGE_API_ITEM } },
    required: ["apis"],
  },
};

export const ARCHITECTURE_STAGE_TOOL: BlueprintLlmTool = {
  name: "emit_architecture",
  description: "아키텍처 정의서 단계 데이터(architecture)를 구조화 반환한다.",
  input_schema: {
    type: "object",
    properties: { architecture: STAGE_ARCHITECTURE_SCHEMA },
    required: ["architecture"],
  },
};

export function buildPrdRequirementsPrompt(input: {
  title?: string;
  sources: SourceMaterial[];
  productBuilderBlueprintId?: ProductBuilderBlueprintId;
  productBuilderBasePackageKeys?: ProductBuilderBasePackageKey[];
  agentGuidelinesMarkdown?: string;
  requirementInventory?: RequirementInventory | null;
}): string {
  const productBuilderBlueprint = productBuilderBlueprintContext(input.productBuilderBlueprintId ?? DEFAULT_PRODUCT_BUILDER_BLUEPRINT_ID);
  return [
    "등록된 Source Material을 끝까지 읽고 개발 요구사항 브리프(Development Requirements Brief)의 '요구사항' 부분을 작성하라.",
    "이 단계에서는 스키마/API 계약은 만들지 않는다(다음 단계에서 이 요구사항을 입력으로 별도 생성한다).",
    "",
    "## 최우선 프로젝트 설정(Project Settings - Highest Priority)",
    "아래 설정은 Source Material보다 우선하는 구현 범위 계약이다. 산출물 생성, 분류, 제외 범위 판단에서 먼저 적용한다.",
    `제품 유형(Product Type): ${productBuilderBlueprint.label}`,
    `Product Builder 기준(Product Builder Basis): ${productBuilderBlueprint.productBuilderLabel}`,
    `제품 유형 설명(Product Type Description): ${productBuilderBlueprint.description}`,
    "Product Builder base 구성 선택(Component Scope):",
    ...productBuilderBasePackagePromptLines(input.productBuilderBasePackageKeys),
    ...internalEngineeringQualityRootRulesPromptSection(),
    ...agentGuidelinesPromptSection(input.agentGuidelinesMarkdown),
    "",
    "## 실행 규칙",
    "1. 모든 Source Material 본문을 처음부터 끝까지 읽고 후반부 요구사항을 누락하지 않는다.",
    "2. 자료에 없는 요구사항은 confirmed로 만들지 않는다. 불명확하면 assumptions 또는 risks에 남긴다.",
    "3. Notion 공유 페이지, source_type, intakeWorkflow, fetch_status, URL, 파일명 같은 수집 메타데이터를 기능이나 요구사항으로 승격하지 않는다.",
    "4. 내부 처리 규칙이나 입력 제외 규칙을 브리프의 assumption/out-of-scope 문장으로 쓰지 않는다.",
    "5. source-backed item을 큰 카테고리로 합쳐 생략하지 말고, 하위 bullet/예외/정책/운영 항목을 요구사항 또는 리스크/open question으로 보존한다.",
    "",
    "## 출력 형식",
    "JSON shape: { projectTitle, overview, goals, scope:{inScope,outOfScope}, functionalRequirements, nonFunctionalRequirements, layouts, architecture, risks, assumptions }",
    "- overview는 프로젝트 목적과 제품 범위를 실제 자료에 근거해 쓴다.",
    "- scope.inScope/outOfScope를 모두 채운다.",
    "- functionalRequirements는 최소 1개 이상이며, title/description이 수집 메타데이터가 아니라 제품 기능이어야 한다.",
    "- functionalRequirements 각 항목은 code(FR-001 형식), title, description, priority(must|should|could), targetSurfaces를 채운다.",
    "- functionalRequirements.targetSurfaces는 Product Builder base 기준 apps/admin, apps/site, apps/app, apps/landing 중 설정에서 선택되고 자료 근거가 있는 surface를 배열로 적는다. admin은 server API를 호출하는 관리자 사이트로 구분한다.",
    "- functionalRequirements.description은 사용자, 상황/trigger, expected behavior, business rule/edge case, 검증 방법, source 근거를 포함한 3~6문장이어야 한다.",
    "- architecture는 대상 시스템의 frontend/backend/data/ai/integration/infra 관점과 hosting/database/storage/cdn/auth/observability/ci-cd를 다룬다.",
    "- Product Builder base 구성 선택에서 apps/server는 필수 API 서버다. apps/admin은 server API를 호출하는 관리자 사이트다. apps/admin, apps/site, apps/app, apps/landing, apps/ai-runtime, apps/electron은 설정에서 선택된 경우에만 확정 구현 범위와 architecture에 포함하고, 자료 근거가 부족하면 assumptions/risks에 필요한 결정을 남긴다.",
    "- 임시 미정 약어, 할 일 표식, 더미/예시 데이터, 가벼운 배포확인식 표현은 금지한다. 미확정 항목은 미확정(Undecided)과 필요한 결정/담당/근거로 표현한다.",
    "",
    `프로젝트 제목 힌트: ${input.title || "(자료에서 추론)"}`,
    "",
    "## Internal Coverage Index",
    input.requirementInventory ? buildRequirementInventoryText(input.requirementInventory) : "(not generated)",
    "",
    "## Source Material",
    buildSourceText(input.sources),
  ].join("\n");
}

export function buildPrdContractsPrompt(input: {
  prd: BlueprintPrd;
  sources: SourceMaterial[];
  agentGuidelinesMarkdown?: string;
  requirementInventory?: RequirementInventory | null;
}): string {
  const plan = input.prd;
  const frText = plan.functionalRequirements.length
    ? plan.functionalRequirements.map((fr) => `- ${fr.code} ${fr.title}: ${fr.description ?? ""}`).join("\n")
    : "-";
  return [
    "확정된 기능 요구사항(functionalRequirements)을 기준으로 스키마 정의서와 REST API 정의서를 만든다.",
    "추가 자료를 요청하지 말고, 주어진 컨텍스트만으로 작성한다.",
    "",
    "## 실행 규칙",
    `1. 스키마 정의서는 기능정의서 기준으로 만든다. 각 schema는 sourceRequirementCodes로 functionalRequirements를 참조하고, product-builder-base Drizzle 기준(${PRODUCT_BUILDER_BASE_DRIZZLE_SCHEMA_INDEX}, core/*, features/*)의 재사용/확장 후보를 baseDrizzleReferences에 기록한다. 테이블명, 필드, PK/FK/UK, 관계를 채운다.`,
    `2. API 정의서는 기능정의서와 스키마 정의서를 함께 읽어 만든다. 각 API는 sourceRequirementCodes와 schemas를 모두 채우고, product-builder-base 서버 API 기준(${PRODUCT_BUILDER_BASE_FEATURES_ROOT}/{feature-name}, ${PRODUCT_BUILDER_BASE_SERVER_APP_MODULE})에서 재사용/수정 가능한 module/controller/service/dto를 baseFeatureReferences에 기록한다.`,
    "3. schema/API 후보 자체는 기능정의서의 기능 요구사항을 기준으로 누락하지 않는다. 확정 불가한 세부는 비우되 후보는 빠뜨리지 않는다.",
    `4. schemas 각 항목은 code(SCH-001 형식), name, description, sourceRequirementCodes, tableName, baseReuseDecision, baseDrizzleReferences, fields, relations, indexes/enums, migrationScope를 포함한다. baseDrizzleReferences는 ${PRODUCT_BUILDER_BASE_DRIZZLE_SCHEMA_INDEX} 및 core/*, features/* 경로를 우선 검토한다.`,
    "5. schemas.fields 각 항목은 name, type, required, description을 반드시 채운다. placeholder, 빈 객체, undefined/null 문자열은 금지한다.",
    `6. apis 각 항목은 code(API-001 형식), method, path, summary, sourceRequirementCodes, schemas, baseReuseDecision, baseFeatureReferences, serverExposure, customizationScope를 포함한다. baseFeatureReferences는 ${PRODUCT_BUILDER_BASE_FEATURES_ROOT}/{feature-name}/controller|service|dto|*.module.ts와 ${PRODUCT_BUILDER_BASE_SERVER_APP_MODULE} 제공 지점을 우선 검토한다.`,
    "7. apis.input/output 각 항목은 name, type, required, description을 반드시 채우고, errors 각 항목은 code와 condition을 채운다.",
    "",
    "## 출력 형식",
    "JSON shape: { schemas, apis }",
    "",
    ...internalEngineeringQualityRootRulesPromptSection(),
    ...agentGuidelinesPromptSection(input.agentGuidelinesMarkdown),
    "## 확정 기능 요구사항(functionalRequirements)",
    frText,
    "",
    "## Internal Coverage Index",
    input.requirementInventory ? buildRequirementInventoryText(input.requirementInventory) : "(not generated)",
    "",
    "## Source Material",
    buildSourceText(input.sources),
  ].join("\n");
}


export function buildRequirementInventoryPrompt(input: {
  source: SourceMaterial;
  chunkText: string;
  chunkIndex: number;
  totalChunks: number;
  productBuilderBasePackageKeys?: ProductBuilderBasePackageKey[];
  agentGuidelinesMarkdown?: string;
}): string {
  return [
    "COS Blueprint PM Agent의 내부 커버리지 인덱스(Internal Coverage Index)를 수행해 JSON 객체 하나만 출력하라.",
    "이 결과는 사용자에게 노출되는 첫 산출물이 아니라 개발 요구사항 브리프 작성 전 누락을 막는 내부 coverage baseline이다. 예쁘게 요약하지 말고 후속 산출물 누락 방지에 집중한다.",
    "작업 순서:",
    "1. 전체 읽기(Full Reading): 이 source chunk의 처음부터 끝까지 읽고, 후반부/부록/예외/운영 항목을 놓치지 않는다.",
    "2. 목록화(Listing): 입력 chunk 안의 모든 구현/기획 단위를 가능한 한 원자 단위로 후보 목록화한다. 대표 항목만 뽑지 않는다.",
    "3. 항목별 상세화(Item Detailing): 각 후보에 title, description, source-backed evidenceExcerpt, confidence, status를 붙인다.",
    "4. 산출물 배치(Deliverable Mapping): 각 단위가 들어가야 할 후속 산출물을 targetDeliverables에 배치한다.",
    "5. 누락 검증(Coverage Check): actor/permission, 화면 후보, 데이터 객체, API, 관리자 작업, 결제, 알림, 업로드/미디어, AI/runtime, 비기능, 리스크, open question이 빠졌는지 다시 확인한다.",
    "서로 다른 원문 항목은 임의로 합치지 말고 별도 item으로 남긴다. 긴 bullet list, 표, 예외 조건, 운영 정책, 금지/제외 항목도 산출물 작성 단위가 될 수 있으면 추출한다.",
    "각 item은 source-backed atomic item이어야 하며, 단순 raw list로 끝내지 말고 산출물별 작성 단위를 만들 수 있어야 한다.",
    "금지: sourceTitle, sourceType, URL, fetch status, intakeWorkflow, notion_shared_page, 노션공유페이지, file_upload 같은 수집 방식/메타데이터는 제품 기능·요구사항·화면 후보로 추출하지 않는다.",
    "카테고리(category)는 다음 중 하나만 사용한다:",
    REQUIREMENT_INVENTORY_CATEGORIES.join(", "),
    "상태(status)는 candidate, confirmed, duplicate, unclear, out_of_scope 중 하나만 사용한다.",
    "targetDeliverables는 다음 slot 중 하나 이상을 사용한다:",
    OUTPUT_INVENTORY_DELIVERABLE_SLOTS.join(", "),
    "근거가 짧더라도 evidenceExcerpt를 반드시 채운다.",
    "출력 JSON shape: { items:[{ category,targetDeliverables,title,description,sourceRefs:[{sourceId,sourceTitle,evidenceExcerpt}],confidence,status }] }",
    "",
    "## 최우선 프로젝트 설정(Project Settings - Highest Priority)",
    "아래 설정은 source 본문보다 우선하는 구현 범위 계약이다. 산출물 배치와 surface 추론에 먼저 적용한다.",
    "Product Builder base 구성 선택(Component Scope):",
    ...productBuilderBasePackagePromptLines(input.productBuilderBasePackageKeys),
    "",
    ...internalEngineeringQualityRootRulesPromptSection(),
    ...agentGuidelinesPromptSection(input.agentGuidelinesMarkdown),
    `sourceId: ${input.source.id}`,
    `sourceTitle: ${input.source.title}`,
    `sourceType: ${input.source.type}`,
    `chunk: ${input.chunkIndex + 1}/${input.totalChunks}`,
    "",
    "## Source Chunk",
    input.chunkText,
  ].join("\n");
}

// 분석 ①단계 프롬프트: 개발 요구사항 브리프/계약 기준선. screens 생성 금지.

// 분석 ①단계 프롬프트: 개발 요구사항 브리프/계약 기준선. screens 생성 금지.
export function buildPrdPrompt(input: {
  title?: string;
  sources: SourceMaterial[];
  productBuilderBlueprintId?: ProductBuilderBlueprintId;
  productBuilderBasePackageKeys?: ProductBuilderBasePackageKey[];
  agentGuidelinesMarkdown?: string;
  requirementInventory?: RequirementInventory | null;
}): string {
  const productBuilderBlueprint = productBuilderBlueprintContext(input.productBuilderBlueprintId ?? DEFAULT_PRODUCT_BUILDER_BLUEPRINT_ID);
  return [
    "COS Blueprint 개발 요구사항 브리프/계약 산출물 분석을 수행해 JSON 객체 하나만 출력하라.",
    "관점: PM 에이전트가 Blueprint 플러그인을 이용해 PM 업무를 정형화하고, 순차 게이트를 통과하며 회사 표준 산출물을 만든다.",
    "",
    "## 최우선 프로젝트 설정(Project Settings - Highest Priority)",
    "아래 설정은 source 본문보다 우선하는 구현 범위 계약이다. 산출물 생성, 분류, 제외 범위 판단에서 먼저 적용한다.",
    `제품 유형(Product Type): ${productBuilderBlueprint.label}`,
    `Product Builder 기준(Product Builder Basis): ${productBuilderBlueprint.productBuilderLabel}`,
    `제품 유형 설명(Product Type Description): ${productBuilderBlueprint.description}`,
    "Product Builder base 구성 선택(Component Scope):",
    ...productBuilderBasePackagePromptLines(input.productBuilderBasePackageKeys),
    ...internalEngineeringQualityRootRulesPromptSection(),
    ...agentGuidelinesPromptSection(input.agentGuidelinesMarkdown),
    ...outputDataCompletenessRules(),
    "목표: 내부/외부 기획 자료의 등록 source 본문과 내부 coverage index를 기준으로 개발 요구사항 브리프(Development Requirements Brief), 스키마 정의서(Schema Definition), REST API 정의서(REST API Definition)의 계약을 산출한다.",
    "공통 레이아웃 정의서(Common Layout Definition)는 별도 산출물로 만들지 않는다. 화면 구조, navigation, layout slot은 화면정의서(Screen Definition) 단계에서 페이지별로 작성한다.",
    "화면정의서(screens)는 이 단계에서 생성하지 않는다. 화면정의서는 개발 요구사항 브리프/계약 기준선 확정 후 별도 단계에서 생성한다.",
    "각 섹션 작성 지침:",
    "- overview: 프로젝트 배경과 목적을 3~5문장으로 서술한다.",
    "- goals: 측정 가능한 목표 3~6개의 문자열 배열. 단순 구호가 아니라 관찰 가능한 결과와 검증 방법이 드러나야 한다.",
    "- scope: { inScope: string[], outOfScope: string[] }. 포함 범위와 제외 범위를 모두 명시한다(제외 범위 필수). 각 항목은 이유가 드러나는 한 문장으로 쓴다.",
    "- functionalRequirements: { title, description, priority: 'must'|'should'|'could', targetSurfaces: ('admin'|'site'|'app'|'landing')[], userRole, preconditions, doneCondition, mainFlow: string[], exceptions: string[], inputSummary, outputSummary } 배열. 기능 코드는 만들지 말고, 기능명 중심으로 작성.",
    "  - userRole/preconditions/doneCondition/mainFlow/exceptions/inputSummary/outputSummary는 기능정의서가 generic 보일러플레이트가 아니라 실제 구현/검증 단위가 되도록, 자료 근거가 있으면 기능별로 채운다. 근거가 없으면 해당 필드를 생략한다(추측·더미 금지 — 비우면 렌더러가 브리프 기준 안내로 대체).",
    "  - mainFlow는 정상 흐름을 순서 있는 단계 문자열 배열로, exceptions는 권한/검증/데이터없음/외부연동실패 등 실패 상태 처리 배열로 쓴다.",
    "  - description은 한 줄 요약이 아니다. 반드시 사용자/행위자, 상황 또는 trigger, expected behavior, business rule 또는 edge case, 검증 방법, source 근거를 포함한 3~6문장으로 쓴다.",
    "  - targetSurfaces는 Product Builder base의 구현 표면 기준이다. 관리자 기능은 server API를 호출하는 관리자 사이트인 admin, 공개 웹사이트 기능은 site, 로그인 후 사용자 웹/앱 기능은 app, 마케팅/랜딩 페이지 기능은 landing으로 구분한다. 근거가 없으면 비워두고 렌더러가 미확정으로 표시한다.",
    "  - 자료에 있는 하위 bullet, 예외, 정책, 관리자 작업, 권한 차이는 대표 항목 하나로 뭉개지 말고 별도 functionalRequirements 또는 description의 세부 조건으로 보존한다.",
    "  - source title, URL, fetch status, intakeWorkflow, notion_shared_page/노션공유페이지/file_upload 같은 수집 방식이나 메타데이터를 기능명으로 쓰지 않는다.",
    "- nonFunctionalRequirements: 성능/보안/가용성/운영 등 비기능 요구사항 문자열 배열. 각 항목은 측정 또는 검수 기준을 포함한다.",
    "- schemas: 스키마 정의서의 원천 데이터. 기능정의서의 functionalRequirements를 기준으로 1개 이상의 관련 기능을 sourceRequirementCodes로 연결한다. shape: { code:'SCH-001', name, tableName, drizzleExportName, description, owner, sourceRequirementCodes:['FR-001'], baseReuseDecision:'REUSE'|'EXTEND'|'NEW'|'N/A'|'UNDECIDED', baseDrizzleReferences:[{packagePath,exportName,tableName,reuseDecision,note}], fields:[{name,type,required,description,validation,example}], relations, indexes, enums, migrationScope, implementationNotes, acceptanceCriteria }.",
    `  - product-builder-base의 Drizzle 기준은 ${PRODUCT_BUILDER_BASE_DRIZZLE_SCHEMA_INDEX}이며 core schema는 packages/drizzle/src/schema/core/*, feature schema는 packages/drizzle/src/schema/features/{feature-name}/*를 먼저 재사용/확장 후보로 본다.`,
    "  - 스키마 정의서는 PRD 요약이 아니라 기능정의서 기준 데이터 계약이다. 각 schema는 연결 기능, base Drizzle 재사용 후보, REUSE/EXTEND/NEW/N/A 판정, 신규/수정 migration scope를 가져야 한다.",
    "  - fields는 테이블 구현자가 바로 읽을 수 있는 필드 목록이다. 각 field는 반드시 name, type, required, description을 채우고, 키/제약은 validation에 남긴다. 빈 객체, undefined, 임시 placeholder는 금지한다.",
    "  - 스키마 정의서 렌더링은 Mermaid erDiagram을 최상단 기본 독해 지점으로 사용한다. 테이블명, 필드, PK/FK/UK, 관계는 전체 ERD와 기능별 ERD에서 보이게 하고, 테이블별 Markdown 필드 표로 다시 쪼개지 않는다. 참고/재활용(product-builder-base, REUSE/EXTEND/NEW/N/A, migration scope)은 ERD 아래 설명 섹션에서 읽히게 분리한다. relations에는 `A 1:N B`, `A N:1 B`, `fieldId -> target.id`처럼 ERD 관계로 변환 가능한 표현을 남긴다.",
    "- apis: REST API 정의서의 원천 데이터. 기능정의서 functionalRequirements와 스키마 정의서를 함께 읽고 endpoint 단위로 작성한다. shape: { code:'API-001', method, path, summary, actor, auth, sourceRequirementCodes:['FR-001'], schemas:['SCH-001'], baseReuseDecision:'REUSE'|'EXTEND'|'NEW'|'N/A'|'UNDECIDED', baseFeatureReferences:[{packagePath,moduleName,controllerPath,servicePath,dtoPath,providedBy,reuseDecision,customizationScope,note}], serverExposure, customizationScope, implementationNotes, input, output, errors:[{code,condition}], auditAction, acceptanceCriteria }.",
    `  - product-builder-base의 서버 API 기준은 ${PRODUCT_BUILDER_BASE_FEATURES_ROOT}/{feature-name} 패키지(controller/service/dto/module)와 ${PRODUCT_BUILDER_BASE_SERVER_APP_MODULE}의 module exposure다. API 정의서는 packages/features의 재사용/수정 가능 controller/service/dto/module을 먼저 검토한 뒤 NEW로 판정한다.`,
    "  - 프로젝트는 product-builder-base를 클론해 프로젝트 이름으로 생성한 뒤 수정한다. 따라서 API 수정 여부는 clone된 base feature package에서 hard-copy로 가져갈 범위와 customizationScope를 기준으로 쓴다.",
    "  - input/output은 API 구현자가 DTO를 만들 수 있는 필드 선언이어야 한다. 각 항목은 name, type, required, description을 채우고 errors는 code와 condition을 채운다.",
    "- architecture: 대상 시스템(구축 대상)의 아키텍쳐. 인프라와 기술 스택을 구체적으로 작성한다. shape: { overview, diagram, components:[{code:'ARC-CMP-001',name,layer,responsibility,techStack:[],dependsOn:[]}], techStack:[{area,choice,rationale}], infrastructure:[{code:'ARC-INF-001',name,category,detail,provider}], integrations:[], dataFlow:[] }.",
    "  - architecture.layer 값: 'frontend'|'backend'|'data'|'ai'|'integration'|'infra'.",
    "  - architecture.infrastructure.category 값: 'hosting'|'database'|'storage'|'cdn'|'queue'|'auth'|'observability'|'ci-cd'|'network'|'other'. 호스팅·DB·스토리지·CDN·CI/CD·관측성을 빠짐없이 다룬다.",
    "  - architecture.techStack: 프론트엔드/백엔드/DB/인증/배포/AI 등 영역별 채택 기술과 근거를 명시한다.",
    "  - architecture.diagram: mermaid 'flowchart TB' 소스를 코드펜스(``` ) 없이 본문 문자열로만 출력한다. 프론트엔드·API·데이터·AI 계층과 핵심 데이터 흐름을 표현한다.",
    "- Product Builder base 구성 선택에서 apps/server는 필수 API 서버다. apps/admin은 server API를 호출하는 관리자 사이트다. apps/admin, apps/site, apps/app, apps/landing, apps/ai-runtime, apps/electron은 설정에서 선택된 경우에만 확정 구현 범위와 architecture에 포함하고, 자료 근거가 부족하면 assumptions/risks에 필요한 결정을 남긴다.",
    "- risks: { code: 'RISK-001', description, mitigation } 배열.",
    "- assumptions: 작성 전제 문자열 배열. 불명확한 항목은 생략하지 말고 assumptions 또는 risks에 남긴다.",
    "- functionalRequirements에는 관련 inventory item id를 sourceInventoryItemIds 배열로 연결한다.",
    "내부 coverage index에 있는 candidate/confirmed/unclear item은 out_of_scope나 duplicate가 아닌 한 해당 targetDeliverables 산출물에서 누락하지 않는다.",
    "특히 기획 자료 후반부나 긴 문서 마지막 chunk에서 나온 산출물 unit도 반드시 반영한다.",
    "넓은 카테고리 한두 개로 축약하지 않는다. 개발 요구사항 브리프는 후속 기능정의서/화면정의서가 바로 이어받을 수 있을 만큼 촘촘해야 한다.",
    "임시 미정 약어, 할 일 표식, 더미/예시 데이터, 가벼운 배포확인식 표현은 쓰지 않는다. 미확정 항목은 미확정(Undecided)과 필요한 결정/담당/근거로 표현한다.",
    "출시/검증 표현은 production readiness 또는 운영 준비 검증 관점으로 쓴다.",
    "일정/마일스톤은 생성하지 않는다.",
    "출력 JSON shape: { projectTitle, overview, goals, scope, functionalRequirements, nonFunctionalRequirements, schemas, apis, architecture, risks, assumptions }",
    `프로젝트 제목 힌트: ${input.title || "(자료에서 추론)"}`,
    "",
    "## Internal Coverage Index",
    input.requirementInventory ? buildRequirementInventoryText(input.requirementInventory) : "(not generated)",
    "",
    "## Source Material",
    buildSourceText(input.sources),
  ].join("\n");
}

// ── 산출물별 staged 프롬프트 (격리된 deliverable workflow용) ──────────────
// buildPrdPrompt를 산출물 단위로 분해한다. 공유 헤더(Project Settings + 품질 룰 +
// 출처)와 산출물별 섹션 지침을 합쳐, 각 호출이 가벼운 JSON 하나만 내도록 한다.
// 추적성(FR↔SCH↔API)은 이전 단계 산출물을 입력 컨텍스트로 넘겨 보존한다.

type BlueprintStagePromptBase = {
  title?: string;
  sources: SourceMaterial[];
  productBuilderBlueprintId?: ProductBuilderBlueprintId;
  productBuilderBasePackageKeys?: ProductBuilderBasePackageKey[];
  agentGuidelinesMarkdown?: string;
  requirementInventory?: RequirementInventory | null;
};
export type { BlueprintStagePromptBase };

function blueprintStagePromptHeader(input: BlueprintStagePromptBase): string[] {
  const productBuilderBlueprint = productBuilderBlueprintContext(input.productBuilderBlueprintId ?? DEFAULT_PRODUCT_BUILDER_BLUEPRINT_ID);
  return [
    "## 최우선 프로젝트 설정(Project Settings - Highest Priority)",
    "아래 설정은 source 본문보다 우선하는 구현 범위 계약이다. 산출물 생성, 분류, 제외 범위 판단에서 먼저 적용한다.",
    `제품 유형(Product Type): ${productBuilderBlueprint.label}`,
    `Product Builder 기준(Product Builder Basis): ${productBuilderBlueprint.productBuilderLabel}`,
    `제품 유형 설명(Product Type Description): ${productBuilderBlueprint.description}`,
    "Product Builder base 구성 선택(Component Scope):",
    ...productBuilderBasePackagePromptLines(input.productBuilderBasePackageKeys),
    ...internalEngineeringQualityRootRulesPromptSection(),
    ...agentGuidelinesPromptSection(input.agentGuidelinesMarkdown),
    ...outputDataCompletenessRules(),
  ];
}

function blueprintStageSourceFooter(input: BlueprintStagePromptBase): string[] {
  return [
    "",
    "## Internal Coverage Index",
    input.requirementInventory ? buildRequirementInventoryText(input.requirementInventory) : "(not generated)",
    "",
    "## Source Material",
    buildSourceText(input.sources),
  ];
}

// 이전 단계 산출물을 다음 단계 입력으로 넘기기 위한 압축 컨텍스트.
function stageFunctionalRequirementsContext(prd: BlueprintPrd): string {
  if (!prd.functionalRequirements.length) return "(아직 기능 요구사항 없음)";
  return prd.functionalRequirements
    .map((fr) => {
      const surfaces = (fr.targetSurfaces ?? []).join(",") || "미확정";
      return `- ${fr.code} ${fr.title} [표면:${surfaces}]: ${fr.description}`;
    })
    .join("\n");
}

function stageSchemasContext(prd: BlueprintPrd): string {
  if (!prd.schemas.length) return "(아직 스키마 없음)";
  return prd.schemas
    .map((schema) => {
      const fields = (schema.fields ?? []).map((field) => field.name).filter(Boolean).join(", ");
      const frRefs = (schema.sourceRequirementCodes ?? []).join(",") || "미연결";
      return `- ${schema.code} ${schema.name}(${schema.tableName ?? ""}) FR:[${frRefs}] fields:[${fields}]`;
    })
    .join("\n");
}

// ① DRB(개발 요구사항 브리프) + 기능정의서: overview/goals/scope/functionalRequirements/NFR/risks/assumptions.
export function buildDrbStagePrompt(input: BlueprintStagePromptBase): string {
  return [
    "COS Blueprint 개발 요구사항 브리프(Development Requirements Brief) 단계 분석을 수행해 JSON 객체 하나만 출력하라.",
    "이 단계는 브리프와 기능정의서의 원천이다. schemas/apis/architecture/layouts는 이 단계에서 출력하지 않는다(후속 단계에서 생성).",
    "",
    ...blueprintStagePromptHeader(input),
    "각 섹션 작성 지침:",
    "- overview: 프로젝트 배경과 목적을 3~5문장으로 서술한다.",
    "- goals: 측정 가능한 목표 3~6개의 문자열 배열. 관찰 가능한 결과와 검증 방법이 드러나야 한다.",
    "- scope: { inScope: string[], outOfScope: string[] }. 포함/제외 범위 모두 명시(제외 범위 필수). 각 항목은 이유가 드러나는 한 문장.",
    "- functionalRequirements: { title, description, priority: 'must'|'should'|'could', targetSurfaces: ('admin'|'site'|'app'|'landing')[], userRole, preconditions, doneCondition, mainFlow: string[], exceptions: string[], inputSummary, outputSummary } 배열. 기능 코드는 만들지 말고 기능명 중심으로 작성.",
    "  - userRole/preconditions/doneCondition/mainFlow/exceptions/inputSummary/outputSummary는 기능정의서가 generic 보일러플레이트가 아니라 실제 구현/검증 단위가 되도록 자료 근거가 있으면 기능별로 채운다. 근거 없으면 생략(추측·더미 금지).",
    "  - mainFlow는 정상 흐름 순서 배열, exceptions는 권한/검증/데이터없음/외부연동실패 등 실패 처리 배열.",
    "  - description은 한 줄 요약이 아니다. 사용자/행위자, 상황/trigger, expected behavior, business rule 또는 edge case, 검증 방법, source 근거를 포함한 3~6문장.",
    "  - targetSurfaces: 관리자=admin, 공개 웹사이트=site, 로그인 후 사용자 웹/앱=app, 마케팅/랜딩=landing. 근거 없으면 비운다.",
    "  - 자료의 하위 bullet, 예외, 정책, 관리자 작업, 권한 차이는 대표 항목 하나로 뭉개지 말고 별도 functionalRequirements 또는 description 세부 조건으로 보존한다.",
    "  - source title/URL/fetch status/intakeWorkflow 같은 수집 메타데이터를 기능명으로 쓰지 않는다.",
    "  - 관련 inventory item id를 sourceInventoryItemIds 배열로 연결한다.",
    "- nonFunctionalRequirements: 성능/보안/가용성/운영 등 문자열 배열. 각 항목은 측정/검수 기준 포함.",
    "- risks: { code:'RISK-001', description, mitigation } 배열.",
    "- assumptions: 작성 전제 문자열 배열. 불명확 항목은 생략하지 말고 assumptions 또는 risks에 남긴다.",
    "내부 coverage index의 candidate/confirmed/unclear item은 out_of_scope/duplicate가 아닌 한 누락하지 않는다. 긴 문서 마지막 chunk의 unit도 반드시 반영한다. 넓은 카테고리로 축약하지 않는다.",
    "임시 미정 약어/할 일 표식/더미·예시 데이터/배포확인식 표현 금지. 미확정은 미확정(Undecided)과 필요한 결정/담당/근거로 표현한다. 일정/마일스톤은 생성하지 않는다.",
    "출력 JSON shape: { projectTitle, overview, goals, scope, functionalRequirements, nonFunctionalRequirements, risks, assumptions }",
    `프로젝트 제목 힌트: ${input.title || "(자료에서 추론)"}`,
    ...blueprintStageSourceFooter(input),
  ].join("\n");
}

// ② 스키마 정의서: 확정된 기능정의서(FR)를 입력으로 schemas[]만.
export function buildSchemaStagePrompt(input: BlueprintStagePromptBase & { prd: BlueprintPrd }): string {
  return [
    "COS Blueprint 스키마 정의서(Schema Definition) 단계 분석을 수행해 JSON 객체 하나만 출력하라.",
    "확정된 기능정의서(functionalRequirements)를 기준으로 데이터 계약을 만든다. schemas[]만 출력한다(다른 산출물 금지).",
    "",
    ...blueprintStagePromptHeader(input),
    "## 확정된 기능정의서(Functional Requirements - 입력 기준선)",
    stageFunctionalRequirementsContext(input.prd),
    "",
    "schemas 작성 지침:",
    "- 각 schema는 1개 이상의 관련 기능을 sourceRequirementCodes로 연결한다(위 FR 코드 사용). 요구사항 인벤토리(REQ) 코드만 넣고 FR 코드를 빠뜨리지 않는다.",
    "- shape: { code:'SCH-001', name, tableName, drizzleExportName, description, owner, sourceRequirementCodes:['FR-001'], baseReuseDecision:'REUSE'|'EXTEND'|'NEW'|'N/A'|'UNDECIDED', baseDrizzleReferences:[{packagePath,exportName,tableName,reuseDecision,note}], fields:[{name,type,required,description,validation,example}], relations, indexes, enums, migrationScope, implementationNotes, acceptanceCriteria }.",
    `  - product-builder-base Drizzle 기준은 ${PRODUCT_BUILDER_BASE_DRIZZLE_SCHEMA_INDEX}이며 core는 packages/drizzle/src/schema/core/*, feature는 packages/drizzle/src/schema/features/{feature-name}/*를 먼저 재사용/확장 후보로 본다.`,
    "  - 스키마 정의서는 PRD 요약이 아니라 기능정의서 기준 데이터 계약이다. 각 schema는 연결 기능, base Drizzle 재사용 후보, REUSE/EXTEND/NEW/N/A 판정, migration scope를 가진다.",
    "  - fields는 구현자가 바로 읽는 필드 목록이다. 각 field는 name, type, required, description을 채우고 키/제약은 validation에 남긴다. 빈 객체/undefined/placeholder 금지.",
    "  - relations에는 `A 1:N B`, `A N:1 B`, `fieldId -> target.id`처럼 ERD 관계로 변환 가능한 표현을 남긴다.",
    "출력 JSON shape: { schemas: [...] }",
    ...blueprintStageSourceFooter(input),
  ].join("\n");
}

// ③ API 정의서: 기능정의서 + 스키마 정의서를 입력으로 apis[]만.
export function buildApiStagePrompt(input: BlueprintStagePromptBase & { prd: BlueprintPrd }): string {
  return [
    "COS Blueprint REST API 정의서(REST API Definition) 단계 분석을 수행해 JSON 객체 하나만 출력하라.",
    "확정된 기능정의서와 스키마 정의서를 함께 읽고 endpoint 단위로 apis[]만 출력한다(다른 산출물 금지).",
    "",
    ...blueprintStagePromptHeader(input),
    "## 확정된 기능정의서(Functional Requirements - 입력 기준선)",
    stageFunctionalRequirementsContext(input.prd),
    "",
    "## 확정된 스키마 정의서(Schemas - 입력 기준선)",
    stageSchemasContext(input.prd),
    "",
    "apis 작성 지침:",
    "- endpoint 단위로 작성하고 sourceRequirementCodes(위 FR 코드)와 schemas(위 SCH 코드)를 모두 연결한다.",
    "- shape: { code:'API-001', method, path, summary, actor, auth, sourceRequirementCodes:['FR-001'], schemas:['SCH-001'], baseReuseDecision:'REUSE'|'EXTEND'|'NEW'|'N/A'|'UNDECIDED', baseFeatureReferences:[{packagePath,moduleName,controllerPath,servicePath,dtoPath,providedBy,reuseDecision,customizationScope,note}], serverExposure, customizationScope, implementationNotes, input, output, errors:[{code,condition}], auditAction, acceptanceCriteria }.",
    `  - product-builder-base 서버 API 기준은 ${PRODUCT_BUILDER_BASE_FEATURES_ROOT}/{feature-name} 패키지와 ${PRODUCT_BUILDER_BASE_SERVER_APP_MODULE}의 module exposure다. packages/features의 재사용/수정 가능 controller/service/dto/module을 먼저 검토한 뒤 NEW로 판정한다.`,
    "  - input/output은 DTO를 만들 수 있는 필드 선언이어야 한다. 각 항목은 name, type, required, description을 채우고 errors는 code와 condition을 채운다.",
    "출력 JSON shape: { apis: [...] }",
    ...blueprintStageSourceFooter(input),
  ].join("\n");
}

// ④ 아키텍처 정의서: 확정된 기능/스키마/API를 입력으로 architecture만.
export function buildArchitectureStagePrompt(input: BlueprintStagePromptBase & { prd: BlueprintPrd }): string {
  return [
    "COS Blueprint 아키텍처 정의서(Architecture Definition) 단계 분석을 수행해 JSON 객체 하나만 출력하라.",
    "대상 시스템(구축 대상)의 아키텍쳐를 인프라와 기술 스택까지 구체적으로 작성한다. architecture 객체만 출력한다(다른 산출물 금지).",
    "",
    ...blueprintStagePromptHeader(input),
    "## 확정된 기능정의서(Functional Requirements - 입력 기준선)",
    stageFunctionalRequirementsContext(input.prd),
    "",
    "## 확정된 스키마 정의서(Schemas - 입력 기준선)",
    stageSchemasContext(input.prd),
    "",
    "architecture 작성 지침:",
    "- shape: { overview, diagram, components:[{code:'ARC-CMP-001',name,layer,responsibility,techStack:[],dependsOn:[]}], techStack:[{area,choice,rationale}], infrastructure:[{code:'ARC-INF-001',name,category,detail,provider}], integrations:[], dataFlow:[] }.",
    "- layer 값: 'frontend'|'backend'|'data'|'ai'|'integration'|'infra'.",
    "- infrastructure.category 값: 'hosting'|'database'|'storage'|'cdn'|'queue'|'auth'|'observability'|'ci-cd'|'network'|'other'. 호스팅·DB·스토리지·CDN·CI/CD·관측성을 빠짐없이 다룬다.",
    "- techStack: 프론트엔드/백엔드/DB/인증/배포/AI 등 영역별 채택 기술과 근거를 명시한다.",
    "- diagram: mermaid 'flowchart TB' 소스를 코드펜스 없이 본문 문자열로만 출력한다. 프론트엔드·API·데이터·AI 계층과 핵심 데이터 흐름을 표현한다.",
    "- Product Builder base 구성 선택에서 선택된 표면만 확정 구현 범위와 architecture에 포함한다.",
    "출력 JSON shape: { architecture: { ... } }",
    `프로젝트 제목 힌트: ${input.prd.projectTitle || input.title || "(자료에서 추론)"}`,
    ...blueprintStageSourceFooter(input),
  ].join("\n");
}

export function buildBlueprintPmAgentPrdPrompt(input: {
  projectId: string;
  title?: string;
  sources: SourceMaterial[];
  productBuilderBlueprintId?: ProductBuilderBlueprintId;
  productBuilderBasePackageKeys?: ProductBuilderBasePackageKey[];
  agentGuidelinesMarkdown?: string;
  requirementInventory?: RequirementInventory | null;
}): string {
  const productBuilderBlueprint = productBuilderBlueprintContext(input.productBuilderBlueprintId ?? DEFAULT_PRODUCT_BUILDER_BLUEPRINT_ID);
  return [
    "Blueprint PM Agent 실행 요청이다.",
    "",
    "목표: 등록된 Source Material을 끝까지 읽고, 개발 요구사항 브리프(Development Requirements Brief)와 Product Builder 기준선/계약 초안을 작성한 뒤 최종 응답으로 `submit-blueprint-prd` payload JSON 객체 하나를 제출한다.",
    "",
    "## 최우선 프로젝트 설정(Project Settings - Highest Priority)",
    "아래 설정은 Source Material보다 우선하는 구현 범위 계약이다. 산출물 생성, 분류, 제외 범위 판단에서 먼저 적용한다.",
    `제품 유형(Product Type): ${productBuilderBlueprint.label}`,
    `Product Builder 기준(Product Builder Basis): ${productBuilderBlueprint.productBuilderLabel}`,
    `제품 유형 설명(Product Type Description): ${productBuilderBlueprint.description}`,
    "Product Builder base 구성 선택(Component Scope):",
    ...productBuilderBasePackagePromptLines(input.productBuilderBasePackageKeys),
    ...internalEngineeringQualityRootRulesPromptSection(),
    ...agentGuidelinesPromptSection(input.agentGuidelinesMarkdown),
    "",
    ...outputDataCompletenessRules(),
    "## 실행 규칙",
    "",
    "1. 모든 Source Material 본문을 처음부터 끝까지 읽고 후반부 요구사항을 누락하지 않는다.",
    "2. 자료에 없는 요구사항은 confirmed로 만들지 않는다. 불명확하면 assumptions 또는 risks에 남긴다.",
    "3. Notion 공유 페이지, source_type, intakeWorkflow, fetch_status, URL, 파일명 같은 수집 메타데이터를 기능이나 요구사항으로 승격하지 않는다.",
    "4. 내부 처리 규칙이나 입력 제외 규칙을 브리프의 assumption/out-of-scope 문장으로 쓰지 않는다.",
    "5. 브리프 외 별도 plan slot은 만들지 않는다. 개발 요구사항 브리프는 호환상 `deliverable.prd` slot과 `prd` payload key에 저장되고, 기능정의/스키마/API/아키텍처는 같은 payload에서 도구가 Project document slot으로 분리 저장한다.",
    "6. 기능 정의서에는 project-builder-base 재사용 판정을 반영할 수 있도록 functionalRequirements.targetSurfaces에 설정에서 선택된 apps/admin, apps/site, apps/app, apps/landing surface만 명시하고, 설명에는 reuse/customization/new-build 단서를 남긴다.",
    `7. 스키마 정의서는 기능정의서 기준으로 만들고, 산출물 상단에서는 전체 Mermaid ERD와 feature cluster별 Mermaid ERD가 먼저 보이게 한다. FR 행을 섹션 제목으로 쓰지 말고 FR 코드는 관련 요구사항 추적 정보로만 둔다. 테이블명, 필드, PK/FK/UK, 관계는 Mermaid 안에서 선언하고 테이블별 필드 표로 다시 쪼개지 않는다. 각 schema는 sourceRequirementCodes로 functionalRequirements를 참조하고, product-builder-base Drizzle 기준(${PRODUCT_BUILDER_BASE_DRIZZLE_SCHEMA_INDEX}, core/*, features/*)의 재사용/확장 후보를 baseDrizzleReferences에 기록하되 참고/재활용/migration 설명은 ERD 아래 섹션에서 읽히도록 분리한다.`,
    `8. API 정의서는 기능정의서와 스키마 정의서를 함께 읽어 만든다. 각 API는 sourceRequirementCodes와 schemas를 모두 채우고, product-builder-base 서버 API 기준(${PRODUCT_BUILDER_BASE_FEATURES_ROOT}/{feature-name}, ${PRODUCT_BUILDER_BASE_SERVER_APP_MODULE})에서 재사용/수정 가능한 module/controller/service/dto를 baseFeatureReferences에 기록한다.`,
    "9. 최종 응답은 유효한 JSON 객체 하나만 출력한다. 서론, 설명, 마크다운, 코드펜스, 일반 댓글 형식은 금지한다.",
    "10. 아래 `Source Material` 섹션과 `Internal Coverage Index`가 현재 실행의 유일한 source-backed 입력이다. Paperclip API, 이전 run log, codex-home sessions, DB binary dump, 기존 deliverable slot/payload를 찾아 과거 산출물을 복원하거나 재사용하지 않는다.",
    "11. 이 제출 계약 밖의 과거 집계 산출물이나 별도 기획서 slot은 생성, 요구, 검색, 보강 대상으로 삼지 않는다.",
    "12. 이 prompt를 받은 DRB run에서는 별도 Paperclip heartbeat/inbox checkout을 하지 않는다. PAPERCLIP_TASK_ID가 없어도 이 prompt의 Project ID, Internal Coverage Index, Source Material만으로 최종 payload를 작성한다.",
    "",
    "## 제출 형식",
    "",
    "최종 응답 JSON은 아래 `submit-blueprint-prd` payload와 정확히 같은 shape이어야 한다. Builder worker가 이 run 결과를 회수해 Project document slot에 저장한다.",
    "- projectId: 아래 Project ID",
    "- requirementInventory: 선택. source-backed coverage index를 만들었다면 items/deliverables를 포함한다.",
    "- prd: 개발 요구사항 브리프 payload. shape: { projectTitle, overview, goals, scope:{inScope,outOfScope}, functionalRequirements, nonFunctionalRequirements, schemas, apis, layouts, architecture, risks, assumptions }",
    "",
    "개발 요구사항 브리프 payload 최소 기준:",
    "- overview는 프로젝트 목적과 제품 범위를 실제 자료에 근거해 쓴다.",
    "- scope.inScope/outOfScope를 모두 채운다.",
    "- functionalRequirements는 최소 1개 이상이며, title/description이 수집 메타데이터가 아니라 제품 기능이어야 한다.",
    "- functionalRequirements.targetSurfaces는 Product Builder base 기준 apps/admin, apps/site, apps/app, apps/landing 중 설정에서 선택되고 자료 근거가 있는 surface를 배열로 적는다. admin은 server API를 호출하는 관리자 사이트로 구분한다.",
    "- functionalRequirements.description은 사용자, 상황/trigger, expected behavior, business rule/edge case, 검증 방법, source 근거를 포함한 3~6문장이어야 한다.",
    "- functionalRequirements 각 항목은 가능하면 userRole, preconditions, doneCondition, mainFlow(string[]), exceptions(string[]), inputSummary, outputSummary를 자료 근거 기반으로 채워 기능정의서가 실제 구현/검증 단위가 되게 한다. 근거 없는 필드는 생략한다(추측 금지).",
    "- source-backed item을 큰 카테고리로 합쳐 생략하지 말고, 하위 bullet/예외/정책/운영 항목을 요구사항 또는 리스크/open question으로 보존한다.",
    "- schemas/apis는 확정 가능한 범위만 작성하고, 미확정이면 assumptions/risks에 남긴다. 단, schema/API 후보 자체는 기능정의서의 기능 요구사항을 기준으로 누락하지 않는다.",
    `- schemas 각 항목은 sourceRequirementCodes, tableName, baseReuseDecision, baseDrizzleReferences, fields, relations, indexes/enums, migrationScope를 포함한다. baseDrizzleReferences는 ${PRODUCT_BUILDER_BASE_DRIZZLE_SCHEMA_INDEX} 및 core/*, features/* 경로를 우선 검토한다.`,
    "- schemas.fields 각 항목은 name, type, required, description을 반드시 채운다. LLM placeholder, 빈 객체, undefined/null 문자열은 금지한다.",
    `- apis 각 항목은 sourceRequirementCodes, schemas, baseReuseDecision, baseFeatureReferences, serverExposure, customizationScope를 포함한다. baseFeatureReferences는 ${PRODUCT_BUILDER_BASE_FEATURES_ROOT}/{feature-name}/controller|service|dto|*.module.ts와 ${PRODUCT_BUILDER_BASE_SERVER_APP_MODULE} 제공 지점을 우선 검토한다.`,
    "- apis.input/output 각 항목은 name, type, required, description을 반드시 채우고, errors 각 항목은 code와 condition을 채운다.",
    "- architecture는 대상 시스템의 frontend/backend/data/ai/integration/infra 관점과 hosting/database/storage/cdn/auth/observability/ci-cd를 다룬다.",
    "- Product Builder base 구성 선택에서 apps/server는 필수 API 서버다. apps/admin은 server API를 호출하는 관리자 사이트다. apps/admin, apps/site, apps/app, apps/landing, apps/ai-runtime, apps/electron은 설정에서 선택된 경우에만 확정 구현 범위와 architecture에 포함하고, 자료 근거가 부족하면 assumptions/risks에 필요한 결정을 남긴다.",
    "- 임시 미정 약어, 할 일 표식, 더미/예시 데이터, 가벼운 배포확인식 표현은 금지한다. 미확정 항목은 미확정(Undecided)과 필요한 결정/담당/근거로 표현한다.",
    "- 출시/검증은 production readiness 또는 운영 준비 검증 관점으로 작성한다.",
    "",
    `Project ID: ${input.projectId}`,
    `프로젝트 제목 힌트: ${input.title || "(자료에서 추론)"}`,
    "",
    "## Internal Coverage Index",
    input.requirementInventory ? buildRequirementInventoryText(input.requirementInventory) : "(not generated)",
    "",
    "## Source Material",
    buildSourceText(input.sources),
  ].join("\n");
}

// 분석 ②단계 프롬프트: 확정된 개발 요구사항 브리프/계약 기준선을 입력으로 화면정의서 전체 생성. (phase 2)
export function buildScreenPrompt(input: {
  prd: BlueprintPrd;
  sources: SourceMaterial[];
  agentGuidelinesMarkdown?: string;
  requirementInventory?: RequirementInventory | null;
}): string {
  const plan = input.prd;
  const planContext = [
    `프로젝트: ${plan.projectTitle}`,
    `제품 유형: ${plan.productBuilderBlueprint?.label ?? "-"}`,
    `Product Builder 기준: ${plan.productBuilderBlueprint?.productBuilderLabel ?? "-"}`,
    `Product Builder base 구성: ${productBuilderBasePackageSelections(plan.productBuilderBasePackages).filter((item) => item.selected).map((item) => item.basePath).join(", ")}`,
    `개요: ${plan.overview}`,
    `목표: ${plan.goals.join("; ")}`,
    `기능 요구사항: ${plan.functionalRequirements.map((fr) => fr.title).join("; ")}`,
  ].join("\n");

  // 화면 생성에 필요한 스키마/API 계약 "본문"을 코드만이 아니라 전부 포함한다.
  // (본문을 안 주면 LLM 이 본문을 찾으러 도구 호출/추가요청을 시도해 JSON 을 내지 않는다.)
  const schemaText = plan.schemas.length
    ? plan.schemas.map((s) => {
        const fields = (s.fields ?? [])
          .map((f) => `${f.name}:${f.type}(${f.required ? "필수" : "선택"}${f.validation ? `,${f.validation}` : ""}) ${f.description ?? ""}`.trim())
          .join(" | ");
        return `- ${s.code} ${s.name}${s.owner ? ` (owner:${s.owner})` : ""}: ${s.description ?? ""}\n    필드: ${fields || "-"}`;
      }).join("\n")
    : "-";

  const apiText = plan.apis.length
    ? plan.apis.map((a) => {
        const errs = (a.errors ?? []).map((e) => `${e.code}(${e.condition})`).join(", ");
        return `- ${a.code} ${a.method} ${a.path} [auth:${a.auth ?? a.actor ?? "-"}] "${a.summary ?? ""}"`
          + `${a.schemas?.length ? ` | schemas: ${a.schemas.join(",")}` : ""}`
          + `${errs ? ` | errors: ${errs}` : ""}`;
      }).join("\n")
    : "-";

  return [
    "확정된 개발 요구사항 브리프와 그 하위 산출물(스키마 정의서, REST API 정의서)을 기준으로 화면정의서 전체를 생성한다.",
    "공통 레이아웃 정의서(Common Layout Definition)는 별도 산출물로 만들지 않는다. 화면 구조, navigation, layout slot은 각 화면정의서 안에 페이지별로 포함한다.",
    "아래 '## 확정 산출물'에 스키마/REST API의 전체 계약 본문이 모두 포함되어 있다. 추가 자료를 요청하지 말고, 주어진 컨텍스트만으로 작성한다.",
    "최우선 프로젝트 설정은 개발 요구사항 브리프 컨텍스트 안의 Product Builder base 구성이다. 선택되지 않은 apps/* 경로의 화면은 확정 화면으로 만들지 않는다.",
    "화면 1개는 ScreenDefinition 1개다. 직관적이고 명료해야 한다.",
    "내부 coverage index에서 deliverable.screen_definitions 대상으로 배치된 unit과 screen_candidate, actor_or_permission, admin_operation, payment, notification, upload_or_media, ai_runtime item을 화면 후보·상태·액션 검증에 반영한다.",
    "각 screen: code(SCR-001), name, description, targetSurface, layoutCode, layoutSlot, route, access, primaryTestId, schemas, apis, fields, states, actions, acceptanceCriteria.",
    "targetSurface는 Product Builder base 기준 'admin'|'site'|'app'|'landing' 중 설정에서 선택된 apps/admin, apps/site, apps/app, apps/landing에 해당하는 값만 쓴다. 관리자 화면은 server API를 호출하는 관리자 사이트인 admin, 공개 웹사이트 화면은 site, 로그인 후 사용자 화면은 app, 마케팅/랜딩 화면은 landing으로 구분한다.",
    "access는 'public'(비로그인 접근) | 'authenticated'(로그인 필요) | 'admin'(관리자 전용) 중 하나. /admin route는 admin.",
    "schemas/apis는 아래 확정 산출물의 코드만 참조한다(재정의 금지). layoutCode/layoutSlot은 화면정의서 안의 페이지 구조 식별자로 작성한다.",
    "states는 default/empty/loading/error/permission 상태를 포함하되, 화면에 해당 없는 상태는 그 이유를 짧게 적는다.",
    "액션은 ACT-01 형식 code와 화면코드 파생 testId(예: scr-001-act-01). 인수조건은 AC-01 형식.",
    "화면 이동 액션은 targetScreenCode에 대상 화면 코드를 넣는다.",
    "출력 JSON shape: { screens: ScreenDefinition[] }",
    "",
    "## 개발 요구사항 브리프 컨텍스트",
    planContext,
    "",
    "## Product Builder base 구성 선택(Component Scope)",
    ...productBuilderBasePackagePromptLines(plan.productBuilderBasePackages),
    "",
    ...internalEngineeringQualityRootRulesPromptSection(),
    ...agentGuidelinesPromptSection(input.agentGuidelinesMarkdown),
    "## Internal Coverage Index",
    input.requirementInventory ? buildRequirementInventoryText(input.requirementInventory) : "(not generated)",
    "",
    "## 확정 산출물 — 스키마 정의서(Schema Definition)",
    schemaText,
    "",
    "## 확정 산출물 — REST API 정의서(REST API Definition)",
    apiText,
    "",
    "## 원본 자료",
    buildSourceText(input.sources),
  ].join("\n");
}

// 단일 화면 재생성 프롬프트: 현재 화면 + 리뷰 피드백을 받아 그 화면 하나만 수정해 출력.
export function buildScreenRegenPrompt(input: {
  prd: BlueprintPrd;
  sources: SourceMaterial[];
  screen: ScreenDefinition;
  feedback: string;
  agentGuidelinesMarkdown?: string;
}): string {
  const plan = input.prd;
  const planContext = [
    `프로젝트: ${plan.projectTitle}`,
    `개요: ${plan.overview}`,
    `스키마 코드: ${plan.schemas.map((s) => s.code).join(", ")}`,
    `API 코드: ${plan.apis.map((a) => a.code).join(", ")}`,
  ].join("\n");

  return [
    "아래 화면정의서 1개를 리뷰 피드백을 반영해 수정한다.",
    `화면 코드(code)는 '${input.screen.code}'로 유지한다.`,
    "최우선 프로젝트 설정은 개발 요구사항 브리프 컨텍스트 안의 Product Builder base 구성이다. 선택되지 않은 apps/* 경로의 화면으로 변경하지 않는다.",
    "schemas/apis는 확정된 스키마 정의서/REST API 정의서의 코드만 참조한다. layoutCode/layoutSlot은 화면정의서 안의 페이지 구조 식별자로 유지하거나 보정한다.",
    "targetSurface는 Product Builder base 기준 'admin'|'site'|'app'|'landing' 중 설정에서 선택된 apps/* 경로에 해당하는 값만 쓰며 기존 화면의 surface가 맞으면 유지한다.",
    "access는 'public' | 'authenticated' | 'admin' 중 하나.",
    "states는 default/empty/loading/error/permission 상태를 포함하되, 화면에 해당 없는 상태는 그 이유를 짧게 적는다.",
    "액션은 ACT-01 형식 code와 화면코드 파생 testId, 인수조건은 AC-01 형식.",
    "출력 JSON shape: { screen: ScreenDefinition }",
    "",
    "## 개발 요구사항 브리프 컨텍스트",
    planContext,
    "",
    "## Product Builder base 구성 선택(Component Scope)",
    ...productBuilderBasePackagePromptLines(plan.productBuilderBasePackages),
    "",
    ...internalEngineeringQualityRootRulesPromptSection(),
    ...agentGuidelinesPromptSection(input.agentGuidelinesMarkdown),
    "## 현재 화면 정의(JSON)",
    JSON.stringify(input.screen),
    "",
    "## 리뷰 피드백",
    input.feedback || "(피드백 없음 — 명료성과 일관성을 개선하라)",
    "",
    "## 원본 자료",
    buildSourceText(input.sources),
  ].join("\n");
}

function list(values: string[]): string {
  const filtered = values.map(meaningfulString).filter((value): value is string => Boolean(value));
  return filtered.length ? filtered.map((value) => `- ${value}`).join("\n") : "- (없음)";
}

function table(headers: string[], rows: string[][]): string {
  const cell = (value: unknown): string => {
    const text = meaningfulString(value) ?? "-";
    return text.replace(/\r?\n/g, "<br>").replace(/\|/g, "\\|");
  };
  return [
    `| ${headers.map(cell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`),
  ].join("\n");
}

const PRIORITY_LABEL: Record<NonNullable<FunctionalRequirement["priority"]>, string> = {
  must: "필수",
  should: "권장",
  could: "선택",
};

export const PRODUCT_BUILDER_SURFACE_LABEL: Record<ProductBuilderSurface, string> = {
  admin: "관리자(admin)",
  site: "웹서비스(site)",
  app: "앱(app)",
  landing: "랜딩(landing)",
  shared: "공통(shared)",
  undecided: "미확정(undecided)",
};

const PRODUCT_BUILDER_SURFACE_DESCRIPTION: Record<ProductBuilderSurface, string> = {
  admin: "관리자와 운영자가 사용하는 백오피스 영역이다. 사용자용 웹서비스(site), 앱(app), 랜딩(landing) 기능과 섞지 않는다.",
  site: "브라우저에서 접근하는 공개/사용자 웹서비스 영역이다. 비로그인 또는 일반 사용자 웹 흐름을 이 구획에 둔다.",
  app: "로그인 후 사용자가 반복적으로 사용하는 앱/대시보드 영역이다. 관리자 운영 기능과 랜딩성 페이지를 이 구획에 섞지 않는다.",
  landing: "마케팅, 소개, 가입 유도, 가격/프로모션처럼 전환 목적의 공개 페이지 영역이다.",
  shared: "여러 surface가 함께 쓰는 공통 정책, 공통 컴포넌트, 공통 기능 영역이다. 특정 surface 전용이면 해당 구획으로 옮긴다.",
  undecided: "자료만으로 구현 surface를 확정할 수 없는 항목이다. 확정 전에는 관리자/웹서비스/앱/랜딩 구획에 임의 배치하지 않는다.",
};

const PRODUCT_BUILDER_SURFACE_ORDER: readonly ProductBuilderSurface[] = [
  "admin",
  "site",
  "app",
  "landing",
  "shared",
  "undecided",
];

function productBuilderSurfaceLabel(surface: ProductBuilderSurface): string {
  return PRODUCT_BUILDER_SURFACE_LABEL[surface] ?? PRODUCT_BUILDER_SURFACE_LABEL.undecided;
}

function productBuilderSurfaceDescription(surface: ProductBuilderSurface): string {
  return PRODUCT_BUILDER_SURFACE_DESCRIPTION[surface] ?? PRODUCT_BUILDER_SURFACE_DESCRIPTION.undecided;
}

function productBuilderSurfaceSectionHeader(surface: ProductBuilderSurface, itemLabel: string): string[] {
  return [
    `## ${productBuilderSurfaceLabel(surface)}`,
    "--------------",
    "",
    `**영역 설명:** ${productBuilderSurfaceDescription(surface)}`,
    "",
    `**이 구획의 산출물:** ${itemLabel}`,
    "",
  ];
}

function productBuilderSurfacePathSegment(surface: ProductBuilderSurface): string {
  return PRODUCT_BUILDER_SURFACES.includes(surface) ? surface : "undecided";
}

function uniqueSurfaces(surfaces: ProductBuilderSurface[]): ProductBuilderSurface[] {
  return PRODUCT_BUILDER_SURFACE_ORDER.filter((surface) => surfaces.includes(surface));
}

function surfaceMatchesFromText(value: string): ProductBuilderSurface[] {
  const text = value.toLowerCase();
  const surfaces: ProductBuilderSurface[] = [];
  if (/(^|\W)admin($|\W)|관리자|운영자|어드민|백오피스|backoffice|back office/.test(text)) surfaces.push("admin");
  if (/(^|\W)site($|\W)|website|web site|웹사이트|공개\s*사이트|사용자용\s*사이트/.test(text)) surfaces.push("site");
  if (/(^|\W)app($|\W)|사용자용\s*앱|모바일\s*앱|앱|회원|로그인|마이페이지|authenticated/.test(text)) surfaces.push("app");
  if (/(^|\W)landing($|\W)|랜딩|마케팅\s*페이지|홍보\s*페이지|프로모션|pricing|가격/.test(text)) surfaces.push("landing");
  if (/(^|\W)shared($|\W)|(^|\W)common($|\W)|공통|공용|전역/.test(text)) surfaces.push("shared");
  return uniqueSurfaces(surfaces);
}

function normalizeProductBuilderSurfaces(raw: unknown, fallback: ProductBuilderSurface[] = ["undecided"]): ProductBuilderSurface[] {
  const values = Array.isArray(raw) ? raw : [raw];
  const surfaces = values.flatMap((value) => {
    if (typeof value !== "string") return [];
    const exact = value.trim().toLowerCase();
    if (PRODUCT_BUILDER_SURFACES.includes(exact as ProductBuilderSurface)) return [exact as ProductBuilderSurface];
    return surfaceMatchesFromText(value);
  });
  const unique = uniqueSurfaces(surfaces);
  return unique.length > 0 ? unique : fallback;
}

function constrainProductBuilderSurfaces(
  surfaces: ProductBuilderSurface[],
  productBuilderBasePackages: unknown,
  fallback: ProductBuilderSurface[] = ["undecided"],
): ProductBuilderSurface[] {
  const allowed = new Set(allowedProductBuilderSurfaces(productBuilderBasePackages));
  const constrained = uniqueSurfaces(surfaces.filter((surface) => allowed.has(surface)));
  return constrained.length > 0 ? constrained : fallback;
}

function surfaceInputFromRecord(record: Record<string, unknown>): unknown {
  return record.targetSurfaces ?? record.surfaces ?? record.targetSurface ?? record.surface ?? record.productBuilderSurface;
}

function inferFunctionalRequirementSurfaces(
  requirement: Partial<FunctionalRequirement> & Record<string, unknown>,
  productBuilderBasePackages?: unknown,
): ProductBuilderSurface[] {
  const explicit = normalizeProductBuilderSurfaces(surfaceInputFromRecord(requirement), []);
  if (explicit.length > 0) return constrainProductBuilderSurfaces(explicit, productBuilderBasePackages);
  const inferred = surfaceMatchesFromText(`${requirement.title ?? ""} ${requirement.description ?? ""}`);
  return constrainProductBuilderSurfaces(inferred.length > 0 ? inferred : ["undecided"], productBuilderBasePackages);
}

function inferScreenTargetSurface(
  screen: Partial<ScreenDefinition> & Record<string, unknown>,
  access: ScreenAccess,
  route: string,
  productBuilderBasePackages?: unknown,
): ProductBuilderSurface {
  const explicit = normalizeProductBuilderSurfaces(surfaceInputFromRecord(screen), []);
  if (explicit.length > 0) return constrainProductBuilderSurfaces(explicit, productBuilderBasePackages)[0] ?? "undecided";
  const text = `${screen.name ?? ""} ${screen.description ?? ""} ${route}`;
  const textMatches = surfaceMatchesFromText(text);
  if (textMatches.includes("admin")) return constrainProductBuilderSurfaces(["admin"], productBuilderBasePackages)[0] ?? "undecided";
  if (access === "admin" || /(^|\/)admin(\/|$)/.test(route)) return constrainProductBuilderSurfaces(["admin"], productBuilderBasePackages)[0] ?? "undecided";
  if (textMatches.includes("landing")) return constrainProductBuilderSurfaces(["landing"], productBuilderBasePackages)[0] ?? "undecided";
  if (textMatches.includes("site")) return constrainProductBuilderSurfaces(["site"], productBuilderBasePackages)[0] ?? "undecided";
  if (textMatches.includes("app")) return constrainProductBuilderSurfaces(["app"], productBuilderBasePackages)[0] ?? "undecided";
  if (access === "public") return constrainProductBuilderSurfaces(["site"], productBuilderBasePackages)[0] ?? "undecided";
  if (access === "authenticated") return constrainProductBuilderSurfaces(["app"], productBuilderBasePackages)[0] ?? "undecided";
  return "undecided";
}

function formatSurfaces(surfaces: readonly ProductBuilderSurface[] | undefined): string {
  const normalized = normalizeProductBuilderSurfaces(surfaces, ["undecided"]);
  return normalized.map(productBuilderSurfaceLabel).join(", ");
}

type FeatureDocumentEntry = {
  requirement: FunctionalRequirement;
  path: string;
  targetSurfaces: ProductBuilderSurface[];
};

function featureDocumentEntries(plan: BlueprintPrd, projectId?: string | null): FeatureDocumentEntry[] {
  const used = new Map<string, number>();
  return plan.functionalRequirements.map((requirement) => {
    const base = fileSlug(requirement.title);
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    const slug = count === 1 ? base : `${base}-${count}`;
    const targetSurfaces = inferFunctionalRequirementSurfaces(
      requirement as FunctionalRequirement & Record<string, unknown>,
      plan.productBuilderBasePackages,
    );
    const primarySurface = targetSurfaces[0] ?? "undecided";
    return {
      requirement,
      path: `${featureDocDir(projectId)}/${productBuilderSurfacePathSegment(primarySurface)}/${slug}.md`,
      targetSurfaces,
    };
  });
}

function relatedFeatureTitles(plan: BlueprintPrd, requirementCodes: string[] | undefined): string {
  if (!requirementCodes?.length) return "-";
  const titleByCode = new Map(plan.functionalRequirements.map((fr) => [fr.code, fr.title]));
  const labels = requirementCodes
    .map((code) => {
      const cleanCode = meaningfulString(code);
      if (!cleanCode) return null;
      const title = titleByCode.get(cleanCode);
      return title ? `${cleanCode} ${title}` : cleanCode;
    })
    .filter((label): label is string => Boolean(label));
  return [...new Set(labels)].join(", ") || BRIEF_UNDECIDED;
}

function relatedFeatureTitlesForApi(plan: BlueprintPrd, api: ApiDefinition): string {
  const direct = relatedFeatureTitles(plan, featureRefCodes(api));
  if (direct !== "-") return direct;
  const inferred = featureRequirementsForApi(plan, api).map((requirement) => requirement.title);
  return [...new Set(inferred)].join(", ") || "-";
}

const BRIEF_UNDECIDED = "미확정(Undecided) - 등록 자료에서 확인 필요";

function truncateForBrief(value: string, max = 320): string {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function briefInventoryItems(inventory: RequirementInventory | null | undefined): RequirementInventoryItem[] {
  if (!inventory) return [];
  return inventory.items.filter((item) => (
    item.targetDeliverables.includes("deliverable.prd")
    && item.status !== "duplicate"
    && item.status !== "out_of_scope"
    && !isSourceIntakeMetadataText(item.title)
    && !isSourceIntakeMetadataText(item.description)
    && !isSourceSectionHeadingText(item.title)
  ));
}

function sourceRefsText(refs: RequirementInventorySourceRef[]): string {
  return refs
    .map((ref) => `${ref.sourceTitle}: ${truncateForBrief(ref.evidenceExcerpt, 180)}`)
    .filter(Boolean)
    .join("<br>") || BRIEF_UNDECIDED;
}

function requirementEvidence(requirement: FunctionalRequirement, inventory: RequirementInventory | null | undefined): string {
  const ids = requirement.sourceInventoryItemIds ?? [];
  if (!ids.length || !inventory) return BRIEF_UNDECIDED;
  const refs = inventory.items
    .filter((item) => ids.includes(item.id))
    .flatMap((item) => item.sourceRefs);
  return sourceRefsText(refs);
}

function briefEvidenceRows(inventory: RequirementInventory | null | undefined, sources: SourceMaterial[]): string[][] {
  const items = briefInventoryItems(inventory);
  if (items.length > 0) {
    return items.map((item) => [
      item.id,
      item.category,
      item.title,
      item.description,
      sourceRefsText(item.sourceRefs),
      item.status,
    ]);
  }
  const sourceRows = sources
    .map((source, index) => {
      const cleaned = stripSourceIntakeMetadataLines(source.body)
        .split(/\n+/)
        .map((line) => stripMarkdownListAndHeading(line))
        .filter((line) => line.length >= 4)
        .slice(0, 3)
        .join(" / ");
      return [
        `SRC-${String(index + 1).padStart(3, "0")}`,
        source.type,
        source.title,
        truncateForBrief(cleaned || source.body || source.title),
        source.fileName || source.url || source.format || "-",
        "source",
      ];
    })
    .filter((row) => row[3].length > 0);
  return sourceRows.length ? sourceRows : [["-", "-", BRIEF_UNDECIDED, BRIEF_UNDECIDED, "-", "-"]];
}

function targetUserRows(inventory: RequirementInventory | null | undefined): string[][] {
  const actorItems = briefInventoryItems(inventory).filter((item) => item.category === "actor_or_permission");
  if (!actorItems.length) return [["사용자/운영자", BRIEF_UNDECIDED, "등록 자료에서 역할과 권한을 추가 확인한다.", BRIEF_UNDECIDED]];
  return actorItems.map((item) => [
    item.title,
    item.description,
    "자료에 명시된 권한/행동 범위를 기준으로 요구사항과 화면정의서에서 재사용한다.",
    sourceRefsText(item.sourceRefs),
  ]);
}

function successMetricRows(plan: BlueprintPrd): string[][] {
  const goals = plan.goals.length ? plan.goals : ["개발 요구사항 브리프 범위와 요구사항을 출처 기반으로 확정한다."];
  return goals.map((goal, index) => [
    `MET-${String(index + 1).padStart(3, "0")}`,
    goal,
    "-",
    "목표 충족 여부를 검수 가능한 상태로 정의",
    "QA/운영 검수에서 관련 요구사항과 산출물 충족 여부 확인",
  ]);
}

function failureSignalRows(plan: BlueprintPrd, inventory: RequirementInventory | null | undefined): string[][] {
  const risks = plan.risks.length ? plan.risks.map((risk) => [risk.code, risk.description, risk.mitigation]) : [];
  const unclear = briefInventoryItems(inventory)
    .filter((item) => item.status === "unclear" || item.category === "missing_input_or_open_question")
    .map((item) => [item.id, item.title, item.description]);
  const rows = [...risks, ...unclear];
  return rows.length ? rows : [["FS-001", "핵심 요구사항의 근거가 부족하거나 검증 기준이 모호함", "추가 자료 등록 또는 브리프 검토에서 확정"]];
}

function userFlowRows(plan: BlueprintPrd, inventory: RequirementInventory | null | undefined): string[][] {
  if (!plan.functionalRequirements.length) {
    return [["FLOW-001", "사용자", BRIEF_UNDECIDED, BRIEF_UNDECIDED, BRIEF_UNDECIDED]];
  }
  return plan.functionalRequirements.map((requirement, index) => [
    `FLOW-${String(index + 1).padStart(3, "0")}`,
    "사용자/운영자",
    requirement.title,
    truncateForBrief(requirement.description || BRIEF_UNDECIDED),
    requirementEvidence(requirement, inventory),
  ]);
}

function acceptanceCriteriaForRequirement(requirement: FunctionalRequirement): string {
  const behavior = requirement.description || requirement.title;
  return `${requirement.title} 요구사항은 ${truncateForBrief(behavior, 180)} 기준으로 검증 가능해야 한다.`;
}

function verificationForRequirement(requirement: FunctionalRequirement): string {
  const priority = requirement.priority === "must" ? "필수 회귀 검증" : "기능 검수";
  return `${priority}: 사용자 행동, 예외 조건, 권한/데이터 상태를 포함해 확인한다.`;
}

function dataTechnicalRows(plan: BlueprintPrd): string[][] {
  const requiredData = plan.schemas.length
    ? plan.schemas.map((schema) => `${schema.code} ${schema.name}`).join(", ")
    : BRIEF_UNDECIDED;
  const apiContracts = plan.apis.length
    ? plan.apis.map((api) => `${api.code} ${api.method} ${api.path}`).join(", ")
    : BRIEF_UNDECIDED;
  const integrations = plan.architecture.integrations.length
    ? plan.architecture.integrations.join(", ")
    : BRIEF_UNDECIDED;
  const auth = plan.apis
    .map((api) => api.auth)
    .filter(Boolean)
    .join(", ") || BRIEF_UNDECIDED;
  const tracking = plan.apis
    .map((api) => api.auditAction)
    .filter(Boolean)
    .join(", ") || "요구사항별 검수/운영 로그 기준을 후속 계약 문서에서 확정";
  return [
    ["필요한 데이터(Required Data)", requiredData],
    ["API/행동 계약(API/Action Contract)", apiContracts],
    ["외부 연동(Integration)", integrations],
    ["권한/인증(Auth)", auth],
    ["추적/로그(Tracking/Logging)", tracking],
  ];
}

function openQuestionRows(plan: BlueprintPrd, inventory: RequirementInventory | null | undefined): string[][] {
  const unclear = briefInventoryItems(inventory)
    .filter((item) => item.status === "unclear" || item.category === "missing_input_or_open_question")
    .map((item, index) => [
      `Q-${String(index + 1).padStart(3, "0")}`,
      `${item.title}: ${item.description}`,
      "브리프 확정 전",
      "PM",
      sourceRefsText(item.sourceRefs),
    ]);
  const offset = unclear.length;
  const assumptions = plan.assumptions.map((assumption, index) => [
    `Q-${String(offset + index + 1).padStart(3, "0")}`,
    assumption,
    "브리프 검토",
    "PM",
    "assumption",
  ]);
  const rows = [...unclear, ...assumptions];
  return rows.length ? rows : [["Q-001", "추가 확인이 필요한 항목 없음", "-", "PM", "-"]];
}

function deliveryUnitRows(plan: BlueprintPrd): string[][] {
  const units = plan.scope.inScope.length
    ? plan.scope.inScope
    : plan.functionalRequirements.map((requirement) => requirement.title);
  if (!units.length) {
    return [["DU-001", BRIEF_UNDECIDED, "자료에서 일정 확인 필요", "PM 확인 필요"]];
  }
  return units.map((unit, index) => [
    `DU-${String(index + 1).padStart(3, "0")}`,
    unit,
    "자료에서 일정 확인 필요",
    "관련 기능정의서, 화면정의서, 스키마/API 계약, 인수 기준 충족",
  ]);
}

function productBuilderBasePackageRows(value: unknown): string[][] {
  return productBuilderBasePackageSelections(value).map((item) => [
    item.basePath,
    item.selected ? "사용" : "미사용",
    item.required ? "필수" : "선택",
    item.description,
  ]);
}

function productBuilderBasePackageScopeSection(value: unknown, heading = "## Product Builder Base 구성 범위(Component Scope)"): string[] {
  return [
    heading,
    "",
    "설정 탭에서 선택한 product-builder-base 모노레포 구성 기준이다. `apps/server`는 모든 프로젝트의 필수 API 서버이고, `apps/admin`은 server API를 호출하는 관리자 사이트다. 나머지는 선택된 경우에만 확정 구현 범위와 아키텍처, 기능/화면 구획에 포함한다.",
    "",
    table(
      ["경로(Path)", "사용 여부(Usage)", "필수 여부(Required)", "역할(Role)"],
      productBuilderBasePackageRows(value),
    ),
    "",
  ];
}

function briefWorkflow(_prd?: BlueprintPrd): PmWorkflowStep[] {
  return STANDARD_PM_WORKFLOW;
}

function renderPmExecutionProcedure(): string {
  const steps = briefWorkflow();
  return [
    "# PM 업무 실행 절차(PM Execution Procedure)",
    "",
    "이 문서는 프로젝트마다 바뀌지 않는 고정 기준 문서다. PM 에이전트는 이 순서에 따라 산출물을 만들고, 프로젝트별 내용은 별도 산출물에만 기록한다.",
    "",
    "## 1. 순차 게이트(Sequential Gates)",
    "",
    table(
      ["단계(Step)", "업무(Task)", "목적(Purpose)", "입력 산출물(Input Documents)", "출력 산출물(Output Documents)", "종료 기준(Exit Criteria)", "담당(Owner)"],
      steps.map((step) => [
        step.code,
        step.name,
        step.purpose,
        step.inputDocuments.join("<br>"),
        step.outputDocuments.join("<br>"),
        step.exitCriteria.join("<br>"),
        step.owner,
      ]),
    ),
    "",
    "## 2. 운영 원칙(Operating Principles)",
    "",
    list([
      "개발 요구사항 브리프 확정 전에는 화면정의서를 생성하지 않는다.",
      "기능정의서는 project-builder-base를 기본 코드베이스로 전제하고 기능별 재사용 판정과 설정에서 선택된 apps/* hard-copy 대상 surface를 남긴다.",
      "스키마 정의서와 REST API 정의서는 화면정의서보다 먼저 확정한다.",
      "화면정의서는 스키마/API를 재정의하지 않고 코드만 참조하며, layout/slot은 화면별로 문서 안에 포함한다.",
      "각 산출물은 Project document slot에 등록되는 회사 표준 문서로 취급한다.",
    ]),
  ].join("\n");
}

export function renderProductRequirementsDocument(
  plan: BlueprintPrd,
  requirementInventory?: RequirementInventory | null,
  sources: SourceMaterial[] = [],
): string {
  const features = featureDocumentEntries(plan);
  const prdItems = briefInventoryItems(requirementInventory);
  const featureRows = features.length
    ? features.map(({ requirement, path }) => [
      requirement.code,
      requirement.title,
      requirement.priority ? PRIORITY_LABEL[requirement.priority] : "-",
      requirement.description || BRIEF_UNDECIDED,
      path,
      requirementEvidence(requirement, requirementInventory),
      verificationForRequirement(requirement),
    ])
    : [["FR-001", BRIEF_UNDECIDED, "-", BRIEF_UNDECIDED, "-", BRIEF_UNDECIDED, "자료 추가 확인"]];
  return [
    `# 개발 요구사항 브리프(Development Requirements Brief) - ${plan.projectTitle}`,
    "",
    "이 문서는 고객이 제공한 기획서, 요구사항 문서, 회의 메모, 레퍼런스 자료를 개발 착수 기준선으로 정리한 문서다. 제품을 새로 기획하는 문서가 아니라, 이미 받은 개발 미션에서 무엇을 구현해야 하는지와 무엇을 결정해야 하는지를 명확히 한다.",
    "",
    "## 1. 프로젝트 맥락(Project Context)",
    "",
    table(
      ["항목(Item)", "내용(Description)"],
      [
        ["프로젝트(Project)", plan.projectTitle],
        ["요약(Summary)", plan.overview],
        ["작성자(Owner)", "PM Agent"],
        ["상태(Status)", plan.confirmedAt ? "Ready" : "Draft"],
        ["기준선(Baseline)", `${features.length}개 기능 요구사항과 ${prdItems.length || plan.functionalRequirements.length}개 출처 기반 브리프 항목을 후속 산출물 입력으로 삼는다.`],
        ["다음 액션(Next Action)", plan.confirmedAt ? "기능정의서/스키마/API/화면정의서 단계로 진행" : "PM 검토 후 개발 요구사항 브리프 slot을 확정"],
      ],
    ),
    "",
    "### 1.1 해결할 문제(Problem Statement)",
    "",
    plan.overview,
    "",
    "### 1.2 목표와 성공 기준(Goals & Success Metrics)",
    "",
    table(
      ["코드(Code)", "성공 기준(Success Metric)", "현재값(Baseline)", "목표값(Target)", "확인 방법(How to Measure)"],
      successMetricRows(plan),
    ),
    "",
    "### 1.3 출처 기반 근거(Source-backed Evidence)",
    "",
    table(
      ["ID", "유형(Type)", "항목(Item)", "내용(Description)", "근거(Evidence)", "상태(Status)"],
      briefEvidenceRows(requirementInventory, sources),
    ),
    "",
    "### 1.4 Product Builder Base 적용 범위(Component Scope)",
    "",
    "설정 탭에서 선택한 product-builder-base 모노레포 구성 기준이다. `apps/server`는 모든 프로젝트의 필수 API 서버이고, `apps/admin`은 server API를 호출하는 관리자 사이트다. 나머지는 선택된 경우에만 확정 구현 범위와 아키텍처에 포함한다.",
    "",
    table(
      ["경로(Path)", "사용 여부(Usage)", "필수 여부(Required)", "역할(Role)"],
      productBuilderBasePackageRows(plan.productBuilderBasePackages),
    ),
    "",
    "## 2. 확정 구현 범위(Confirmed Implementation Scope)",
    "",
    table(
      ["코드(Code)", "구현 범위(Scope Item)", "근거/이유(Evidence or Reason)"],
      (plan.scope.inScope.length ? plan.scope.inScope : [BRIEF_UNDECIDED])
        .map((item, index) => [`IN-${String(index + 1).padStart(3, "0")}`, item, "등록 자료와 개발 요구사항 브리프에서 확인된 구현 포함 범위"]),
    ),
    "",
    "## 3. 기능 요구사항(Functional Requirements)",
    "",
    table(
      ["코드(Code)", "기능(Feature)", "우선순위(Priority)", "상세 설명(Details)", "상세 문서(Feature Definition)", "근거(Evidence)", "검증 방법(Verification)"],
      featureRows,
    ),
    "",
    "### 3.1 비기능 요구사항(Non-functional Requirements)",
    "",
    list(plan.nonFunctionalRequirements.length ? plan.nonFunctionalRequirements : [BRIEF_UNDECIDED]),
    "",
    "## 4. 사용자/관리자 흐름(User/Admin Flows)",
    "",
    "### 4.1 대상 사용자와 권한(Audience & Permissions)",
    "",
    table(
      ["사용자(User)", "상황(Context)", "핵심 니즈/Core Action", "근거(Evidence)"],
      targetUserRows(requirementInventory),
    ),
    "",
    "### 4.2 주요 흐름(Core Flows)",
    "",
    table(
      ["단계(Step)", "행위자(Actor)", "행동(Action)", "기대 결과(Expected Result)", "근거(Evidence)"],
      userFlowRows(plan, requirementInventory),
    ),
    "",
    "## 5. 데이터, API, 연동 필요사항(Data, API & Integration Needs)",
    "",
    "상세 설계가 아니라 개발 착수 전에 이미 확인된 데이터, API, 권한, 연동 필요사항만 적는다.",
    "",
    table(
      ["항목(Item)", "내용(Description)"],
      dataTechnicalRows(plan),
    ),
    "",
    "## 6. 인수 기준(Acceptance Criteria)",
    "",
    table(
      ["코드(Code)", "기준(Criteria)", "관련 요구사항(Related Requirement)"],
      plan.functionalRequirements.map((fr, index) => [
        `AC-${String(index + 1).padStart(3, "0")}`,
        acceptanceCriteriaForRequirement(fr),
        fr.title,
      ]),
    ),
    "",
    "## 7. 마일스톤/납품 단위(Milestones & Delivery Units)",
    "",
    table(
      ["단위(Unit)", "납품 범위(Delivery Scope)", "일정/시점(Timing)", "완료 기준(Done Criteria)"],
      deliveryUnitRows(plan),
    ),
    "",
    "## 8. 핵심 전제와 오픈 결정(Core Assumptions & Open Decisions)",
    "",
    "### 8.1 핵심 전제(Core Assumptions)",
    "",
    list(plan.assumptions.length ? plan.assumptions : [BRIEF_UNDECIDED]),
    "",
    "### 8.2 리스크(Risks)",
    "",
    table(
      ["코드(Code)", "리스크(Risk)", "대응(Mitigation)"],
      plan.risks.length ? plan.risks.map((risk) => [risk.code, risk.description, risk.mitigation]) : [["RISK-001", BRIEF_UNDECIDED, "자료 추가 확인"]],
    ),
    "",
    "### 8.3 오픈 결정(Open Decisions)",
    "",
    table(
      ["코드(Code)", "질문(Question)", "결정 필요 시점(Needed By)", "담당(Owner)"],
      openQuestionRows(plan, requirementInventory).map(([code, question, neededBy, owner]) => [code, question, neededBy, owner]),
    ),
    "",
    "### 8.4 실패 신호(Failure Signals)",
    "",
    table(
      ["코드(Code)", "실패 신호(Failure Signal)", "대응/확인 방법(Response)"],
      failureSignalRows(plan, requirementInventory),
    ),
    "",
    "## 9. 제외 범위(Out of Scope)",
    "",
    table(
      ["코드(Code)", "제외 범위(Out of Scope)", "제외 이유(Reason)"],
      (plan.scope.outOfScope.length ? plan.scope.outOfScope : [BRIEF_UNDECIDED])
        .map((item, index) => [`OUT-${String(index + 1).padStart(3, "0")}`, item, "이번 개발 요구사항 브리프 기준선에서 확정하지 않음"]),
    ),
  ].join("\n");
}

export function renderFeatureDefinitionIndex(plan: BlueprintPrd): string {
  const features = featureDocumentEntries(plan);
  const sections = productBuilderSurfaceOrderForScope(plan.productBuilderBasePackages).flatMap((surface) => {
    const rows = features
      .filter((entry) => entry.targetSurfaces.includes(surface))
      .map(({ requirement, path, targetSurfaces }) => [
        requirement.title,
        formatSurfaces(targetSurfaces),
        requirement.priority ? PRIORITY_LABEL[requirement.priority] : "-",
        path,
        "Product Builder에서 project-builder-base와 대조해 전체 재사용/부분 재사용/커스터마이징/신규/N/A 중 하나로 확정",
        requirement.description,
      ]);
    return [
      ...productBuilderSurfaceSectionHeader(surface, "기능정의서(Feature Definition)"),
      rows.length
        ? table(
          ["기능(Feature)", "대상 surface(Target Surface)", "우선순위(Priority)", "상세 문서 참조(Feature Definition Reference)", "Base 재사용 판정(Base Reuse Decision)", "요약(Summary)"],
          rows,
        )
        : "_해당 없음(N/A)_",
      "",
    ];
  });
  return [
    `# 기능정의서(Feature Definition) - 목록(Index) - ${plan.projectTitle}`,
    "",
    "이 페이지는 기능정의서 산출물 안의 목록 페이지다. 개발 요구사항 브리프의 기능 요구사항을 설정에서 선택된 apps/admin, apps/site, apps/app, apps/landing 구획으로 정확히 나누고, 각 구획 안에서 기능별 상세 문서와 project-builder-base 재사용 판정을 추적한다.",
    "",
    ...productBuilderBasePackageScopeSection(plan.productBuilderBasePackages),
    ...sections,
  ].join("\n");
}

export function renderFeatureDefinition(plan: BlueprintPrd, requirement: FunctionalRequirement): string {
  const targetSurfaces = inferFunctionalRequirementSurfaces(
    requirement as FunctionalRequirement & Record<string, unknown>,
    plan.productBuilderBasePackages,
  );
  const featureApiRefs = baseFeatureApiReferencesForFeature(requirement);
  const featureDrizzleRefs = baseDrizzleReferencesForFeature(requirement);
  const hasBaseCandidate = featureApiRefs.length > 0 || featureDrizzleRefs.length > 0;
  const featureSchemaCodes = plan.schemas
    .filter((schema) => featureRefCodes(schema).includes(requirement.code))
    .map((schema) => schema.code)
    .join(", ");
  const featureApiCodes = apiCodesForFeature(plan, requirement);
  return [
    `# 기능 정의서(Feature Definition) - ${requirement.title}`,
    "",
    "이 문서는 기능 1개를 실제 구현/검증 가능한 단위로 정리한 문서다. 기능 코드는 사용하지 않는다.",
    "",
    ...targetSurfaces.flatMap((surface) => productBuilderSurfaceSectionHeader(surface, "기능정의서 상세(Feature Detail)")),
    "## 1. 요약(Summary)",
    "",
    table(
      ["항목(Item)", "내용(Description)"],
      [
        ["프로젝트(Project)", plan.projectTitle],
        ["기능(Feature)", requirement.title],
        ["대상 surface(Target Surface)", formatSurfaces(targetSurfaces)],
        ["우선순위(Priority)", requirement.priority ? PRIORITY_LABEL[requirement.priority] : "-"],
        ["목적(Purpose)", requirement.description],
      ],
    ),
    "",
    "## 2. project-builder-base 재사용 검토(Project Builder Base Reuse Review)",
    "",
    "프로젝트는 project-builder-base를 hard-copy해 시작한다. 아래는 이 기능의 제목·설명에서 추론한 base 재사용 후보다. Product Builder가 실제 경로를 확인해 전체 재사용/부분 재사용/신규/N/A로 확정한다.",
    "",
    table(
      ["항목(Item)", "내용(Description)"],
      [
        ["대상 surface(Target Surface)", formatSurfaces(targetSurfaces)],
        ["base Feature API 후보(Base Feature API Candidates)", formatBaseFeatureApiReferences(featureApiRefs)],
        ["base Drizzle 스키마 후보(Base Drizzle Candidates)", formatBaseDrizzleReferences(featureDrizzleRefs)],
        ["기본 재사용 판정(Default Reuse Decision)", hasBaseCandidate ? "EXTEND/REUSE 후보 — 위 후보 경로 확인 후 확정" : "NEW 후보 — 재사용 가능한 기준 feature 미발견(확정 필요)"],
        ["커스터마이징 범위(Customization Scope)", "재사용 시 UI/schema/API/permission/workflow 중 변경 지점을 구현 계획에서 확정한다."],
      ],
    ),
    "",
    "## 3. 사용자와 조건(User & Conditions)",
    "",
    table(
      ["항목(Item)", "내용(Description)"],
      [
        ["사용자(User)", requirement.userRole ?? "⚠ 미구조화 — 개발 요구사항 브리프의 대상 사용자/권한에서 확정 필요."],
        ["진입 조건(Preconditions)", requirement.preconditions ?? "⚠ 미구조화 — 진입 권한/화면/데이터 조건을 브리프에서 확정 필요."],
        ["완료 조건(Done Condition)", requirement.doneCondition ?? `⚠ 미구조화 — ${requirement.title}의 완료 판정 기준을 확정 필요.`],
      ],
    ),
    "",
    "## 4. 주요 흐름(Main Flow)",
    "",
    requirement.mainFlow?.length
      ? list(requirement.mainFlow)
      : list(["⚠ 미구조화 — 주요 흐름이 단계로 분해되지 않았다. §1 목적·브리프 기준으로 단계를 확정하고 화면정의서 action과 정합해야 한다."]),
    "",
    "## 5. 예외 흐름(Exception Flow)",
    "",
    requirement.exceptions?.length
      ? list(requirement.exceptions)
      : list(["⚠ 미구조화(공통 기준) — 권한 없음·입력 오류·데이터 없음·외부 연동 실패·중복 요청 실패 상태를 기능별로 확정 필요."]),
    "",
    "## 6. 입력/출력(Input/Output)",
    "",
    table(
      ["구분(Type)", "내용(Description)"],
      [
        ["입력(Input)", requirement.inputSummary ?? "⚠ 미구조화 — 관련 스키마/API/화면 필드 기준으로 입력 확정 필요."],
        ["출력(Output)", requirement.outputSummary ?? `⚠ 미구조화 — ${requirement.title}의 화면 상태/저장·조회 결과/오류를 확정 필요.`],
      ],
    ),
    "",
    "## 7. 참조 산출물(References)",
    "",
    table(
      ["산출물(Output)", "참조 방식(Reference Rule)"],
      [
        ["project-builder-base", "재사용 후보 feature/module/surface 경로와 커스터마이징 범위를 연결한다."],
        ["스키마 정의서(Schema Definition)", `이 기능 연결 스키마: ${featureSchemaCodes || "⚠ 미정 — 스키마 정의서에서 확정 필요"} (\`schema-definition.md\`).`],
        ["REST API 정의서(REST API Definition)", `이 기능 연결 API: ${featureApiCodes} (\`api-definition.md\`).`],
        ["화면정의서(Screen Definition)", "관련 화면이 확정되면 `deliverable.screen_definitions` slot의 화면 문서를 연결한다."],
      ],
    ),
    "",
    "## 8. 인수 기준(Acceptance Criteria)",
    "",
    list([
      "project-builder-base 기준 재사용 판정과 대상 surface가 명시된다.",
      `${requirement.title} 기능이 목적에 맞게 동작한다.`,
      "주요 흐름과 예외 흐름이 QA에서 확인 가능하다.",
      "필요한 스키마/API/화면 참조가 누락되지 않는다.",
    ]),
    "",
    "## 9. 제외 범위(Out of Scope)",
    "",
    list(["개발 요구사항 브리프와 화면정의서에서 이 기능과 직접 연결되지 않은 기능, 데이터, 운영 정책은 포함하지 않는다."]),
  ].join("\n");
}

function schemaFeatureMappingRows(plan: BlueprintPrd): string[][] {
  const clusters = buildSchemaFeatureClusters(plan);
  if (!clusters.length) {
    return [["-", "미확정(Undecided)", "-", "-", "기능정의서 확정 후 판단", "-"]];
  }
  return clusters.map((cluster) => {
    const refs = baseDrizzleReferencesForFeatureCluster(cluster);
    return [
      cluster.title,
      requirementRefsForFeatureCluster(cluster),
      formatSurfaces(targetSurfacesForFeatureCluster(cluster, plan.productBuilderBasePackages)),
      schemaCodesForFeatureCluster(plan, cluster),
      refs.length ? "재사용 후보 — REUSE/EXTEND 검토 필요" : "신규 후보 — NEW 검토 필요",
      formatBaseDrizzleReferences(refs),
    ];
  });
}

export function renderSchemaDefinition(plan: BlueprintPrd): string {
  const schemaReuseRows = plan.schemas.length
    ? plan.schemas.map((schema) => [
      schema.code,
      schema.name,
      schema.tableName ?? "-",
      baseSchemaReuseDecisionForSchema(plan, schema),
      schema.drizzleExportName ?? "-",
      formatBaseDrizzleReferences(baseDrizzleReferencesForSchema(plan, schema)),
      schema.migrationScope?.join("<br>") || "-",
      (schema.implementationNotes ?? []).join("<br>") || "-",
      (schema.acceptanceCriteria ?? []).join("<br>") || "-",
    ])
    : [["-", "미확정(Undecided)", "-", "UNDECIDED", "-", "-", "기능정의서 기준으로 확정 필요", "-", "-"]];

  return [
    `# 스키마 정의서(Schema Definition) - ${plan.projectTitle}`,
    "",
    "이 문서의 스키마 선언은 Mermaid ERD를 기준으로 읽는다. 전체 테이블 구조를 먼저 보고, 기능별 ERD에서 해당 기능이 쓰는 테이블/필드/관계를 확인한 뒤 product-builder-base 참고와 재사용 판정을 검토한다.",
    "",
    "## 1. 전체 ERD(Mermaid Entity Relationship Diagram)",
    "",
    "아래 ERD가 스키마 정의의 기준이다. 테이블명, 필드, 키(PK/FK/UK), 관계를 이 블록에서 먼저 확인한다.",
    "",
    renderSchemaMermaidErDiagram(plan),
    "",
    "## 2. 기능별 ERD(Feature ERD)",
    "",
    "기능정의서의 FR 행을 그대로 제목으로 쓰지 않고, 제목/설명/테이블명에서 실제 feature 묶음을 추출해 관련 테이블을 모았다. FR 코드는 추적 정보로만 표시한다.",
    "",
    ...renderFeatureSchemaErdSections(plan),
    "## 3. 기능, 참고, 재사용, 마이그레이션 설명(Feature, Reference, Reuse & Migration Notes)",
    "",
    "ERD를 먼저 읽은 뒤 아래 표에서 기능 연결, product-builder-base 참고, 재사용/확장 판정, migration scope를 확인한다.",
    "",
    "### 3.1 기능 기준 스키마 매핑(Feature-to-Schema Matrix)",
    "",
    table(
      ["기능 묶음(Feature Cluster)", "관련 요구사항(Requirement Refs)", "대상 surface(Target Surface)", "연결 스키마(Schema Codes)", "기본 판정(Default Decision)", "base Drizzle 후보(Base Drizzle Candidates)"],
      schemaFeatureMappingRows(plan),
    ),
    "",
    ...productBuilderBasePackageScopeSection(plan.productBuilderBasePackages, "### 3.2 Product Builder Base 구성 범위(Component Scope)"),
    "### 3.3 기준 코드베이스(Base Drizzle Baseline)",
    "",
    table(
      ["항목(Item)", "기준(Baseline)"],
      [
        ["기준 repo(Base Repo)", "product-builder-base"],
        ["Drizzle schema barrel", `\`${PRODUCT_BUILDER_BASE_DRIZZLE_SCHEMA_INDEX}\``],
        ["Core schema", `\`${PRODUCT_BUILDER_BASE_DRIZZLE_SCHEMA_ROOT}/core/*\``],
        ["Feature schema", `\`${PRODUCT_BUILDER_BASE_DRIZZLE_SCHEMA_ROOT}/features/{feature-name}/*\``],
        ["작성 원칙(Authoring Rule)", "기능정의서의 FR 행을 그대로 표시 단위로 쓰지 않고 feature cluster별로 REUSE/EXTEND/NEW/N/A를 판정하며, 재사용 가능한 table/export가 있으면 baseDrizzleReferences에 남긴다."],
      ],
    ),
    "",
    "### 3.4 스키마별 참고/재사용/마이그레이션(Per-Schema Reference & Reuse)",
    "",
    table(
      ["코드(Code)", "엔티티(Entity)", "Drizzle Table", "재사용 판정(Reuse Decision)", "Drizzle Export", "Base Drizzle 참조(Base Drizzle References)", "Migration Scope", "구현 메모(Implementation Notes)", "인수 기준(Acceptance Criteria)"],
      schemaReuseRows,
    ),
    "",
  ].join("\n");
}

function apiFeatureMappingRows(plan: BlueprintPrd): string[][] {
  if (!plan.functionalRequirements.length) {
    return [["-", "미확정(Undecided)", "-", "-", "기능정의서 확정 후 판단", "-"]];
  }
  return plan.functionalRequirements.map((requirement) => {
    const refs = baseFeatureApiReferencesForFeature(requirement);
    return [
      requirement.code,
      requirement.title,
      formatSurfaces(inferFunctionalRequirementSurfaces(requirement as FunctionalRequirement & Record<string, unknown>, plan.productBuilderBasePackages)),
      apiCodesForFeature(plan, requirement),
      refs.length ? "재사용 후보 — REUSE/EXTEND 검토 필요" : "신규 후보 — NEW 검토 필요",
      formatBaseFeatureApiReferences(refs),
    ];
  });
}

function apiPathParameterRows(api: ApiDefinition): string[][] {
  const names = new Set<string>();
  for (const match of api.path.matchAll(/\{([A-Za-z0-9_]+)\}|:([A-Za-z0-9_]+)/g)) {
    const name = match[1] ?? match[2];
    if (name) names.add(name);
  }
  return [...names].map((name) => [
    name,
    "string",
    "Y",
    `${api.path} 경로 파라미터.`,
  ]);
}

function fallbackApiRequestRows(api: ApiDefinition, summary: string): string[][] {
  void summary;
  const pathRows = apiPathParameterRows(api);
  const schemaRef = api.schemas.length ? `참조 스키마(${api.schemas.join(", ")})` : "참조 스키마 미지정";
  if (api.method === "GET" || api.method === "DELETE") {
    return pathRows.length
      ? pathRows
      : [["⚠ SPEC GAP", "—", "—", `요청 파라미터 미정의. 검색/필터/페이지네이션이 필요하면 ${schemaRef} 기준으로 query DTO를 확정해야 한다.`]];
  }
  return [
    ...pathRows,
    ["⚠ SPEC GAP", "—", "—", `요청 body 필드 미정의 — DTO를 만들 수 없다. ${schemaRef}에서 입력 서브셋(서버 생성 id/createdAt 등 제외)을 확정해야 한다.`],
  ];
}

function fallbackApiResponseRows(api: ApiDefinition, summary: string): string[][] {
  void summary;
  const schemaRef = api.schemas.length ? `참조 스키마(${api.schemas.join(", ")})` : "참조 스키마 미지정";
  return [["⚠ SPEC GAP", "—", "—", `응답 body 필드 미정의 — DTO를 만들 수 없다. ${schemaRef}에서 응답 shape를 확정해야 한다.`]];
}

function fallbackApiErrorRows(api: ApiDefinition): string[][] {
  const rows: string[][] = [];
  const requiresAuth = Boolean(api.auth) && !/비인증|public|none|없음|anonymous/i.test(api.auth ?? "");
  if (requiresAuth) {
    rows.push(["401", "인증 토큰이 없거나 만료됨."]);
    rows.push(["403", "권한이 없는 actor의 접근."]);
  }
  if (/[{:]/.test(api.path) || ["GET", "DELETE", "PUT", "PATCH"].includes(api.method)) {
    rows.push(["404", "대상 리소스를 찾을 수 없음."]);
  }
  if (!["GET", "DELETE"].includes(api.method)) {
    rows.push(["400", "요청 body 검증 실패."]);
  }
  rows.push(["500", "예상하지 못한 서버 오류."]);
  return rows;
}

export function renderApiDefinition(plan: BlueprintPrd): string {
  const apiIndexRows = plan.apis.length
    ? plan.apis.map((api) => {
      const summary = firstMeaningfulString(api.summary) ?? `${api.method} ${api.path} endpoint contract.`;
      return [
        api.code,
        api.actor ?? "-",
        api.method,
        api.path,
        baseApiReuseDecisionForApi(plan, api),
        relatedFeatureTitlesForApi(plan, api),
        api.schemas.join(", ") || "-",
        formatBaseFeatureApiReferences(baseFeatureApiReferencesForApi(plan, api)),
        summary,
      ];
    })
    : [["-", "-", "-", "-", "UNDECIDED", "기능정의서와 스키마 정의서 기준으로 확정 필요", "-", "-", "기능정의서와 스키마 정의서를 함께 읽고 API 후보를 확정해야 한다."]];

  return [
    `# REST API 정의서(REST API Definition) - ${plan.projectTitle}`,
    "",
    "이 문서는 PM 에이전트가 기능정의서(Feature Definition)와 스키마 정의서(Schema Definition)를 함께 읽어 확정한 REST API 계약을 product-builder-base 서버 API 구조와 대조해 화면정의서, 개발, QA가 같은 기준으로 참조하도록 분리한 회사 표준 산출물이다.",
    "",
    ...productBuilderBasePackageScopeSection(plan.productBuilderBasePackages),
    "## 1. 기준 코드베이스(Base Server API Baseline)",
    "",
    table(
      ["항목(Item)", "기준(Baseline)"],
      [
        ["기준 repo(Base Repo)", "product-builder-base"],
        ["Server app", `\`${PRODUCT_BUILDER_BASE_SERVER_ROOT}\``],
        ["Server module exposure", `\`${PRODUCT_BUILDER_BASE_SERVER_APP_MODULE}\``],
        ["Feature API packages", `\`${PRODUCT_BUILDER_BASE_FEATURES_ROOT}/{feature-name}\``],
        ["Feature package pattern", "`controller/*`, `service/*`, `dto/*`, `{feature}.module.ts`, `index.ts`"],
        ["작성 원칙(Authoring Rule)", "기능정의서와 스키마 정의서를 함께 읽고 endpoint별 REUSE/EXTEND/NEW/N/A를 판정한다. 프로젝트는 product-builder-base를 클론한 뒤 프로젝트 이름으로 생성되므로, 수정 여부는 clone된 base 파일의 hard-copy 이후 변경 범위로 기록한다."],
      ],
    ),
    "",
    "## 2. 기능 기준 API 매핑(Feature-to-API Matrix)",
    "",
    table(
      ["기능 코드(Feature Code)", "기능(Feature)", "대상 surface(Target Surface)", "연결 API(API Codes)", "기본 판정(Default Decision)", "base Feature API 후보(Base Feature API Candidates)"],
      apiFeatureMappingRows(plan),
    ),
    "",
    "## 3. API 목차(API Index)",
    "",
    table(
      ["코드(Code)", "행위자(Actor)", "메서드(Method)", "경로(Path)", "재사용 판정(Reuse Decision)", "관련 기능(Related Features)", "스키마(Schema)", "Base Feature API 참조", "설명(Description)"],
      apiIndexRows,
    ),
    "",
    ...plan.apis.flatMap((api, index) => {
      const input = normalizeApiParameters((api as ApiDefinition & Record<string, unknown>).input);
      const output = normalizeApiParameters((api as ApiDefinition & Record<string, unknown>).output);
      const errors = normalizeApiErrors((api as ApiDefinition & Record<string, unknown>).errors);
      const summary = firstMeaningfulString(api.summary) ?? `${api.method} ${api.path} endpoint contract.`;
      return [
        `## 4.${index + 1}. ${api.code} ${api.method} ${api.path}`,
        "",
        table(
          ["항목(Item)", "내용(Description)"],
          [
            ["설명(Description)", summary],
            ["행위자(Actor)", api.actor ?? "-"],
            ["인증(Auth)", api.auth ?? "-"],
            ...(api.auditAction ? [["감사 액션(Audit Action)", api.auditAction]] : []),
            ["관련 기능(Related Features)", relatedFeatureTitlesForApi(plan, api)],
            ["참조 스키마(Referenced Schema)", api.schemas.join(", ") || "-"],
            ["재사용 판정(Reuse Decision)", baseApiReuseDecisionForApi(plan, api)],
            ["Base Feature API 참조(Base Feature API References)", formatBaseFeatureApiReferences(baseFeatureApiReferencesForApi(plan, api))],
            ...(api.serverExposure ? [["Server Exposure", api.serverExposure]] : []),
            ...(api.customizationScope?.length ? [["수정 범위(Customization Scope)", api.customizationScope.join("<br>")]] : []),
          ],
        ),
        "",
        "### 요청(Request)",
        "",
        table(
          ["이름(Name)", "타입(Type)", "필수(Required)", "설명(Description)"],
          input.length
            ? input.map((item) => [item.name, item.type, item.required ? "Y" : "N", item.description])
            : fallbackApiRequestRows(api, summary),
        ),
        "",
        "### 응답(Response)",
        "",
        table(
          ["이름(Name)", "타입(Type)", "필수(Required)", "설명(Description)"],
          output.length
            ? output.map((item) => [item.name, item.type, item.required ? "Y" : "N", item.description])
            : fallbackApiResponseRows(api, summary),
        ),
        "",
        "### 오류(Errors)",
        "",
        table(
          ["코드(Code)", "조건(Condition)"],
          errors.length
            ? errors.map((item) => [item.code, item.condition])
            : fallbackApiErrorRows(api),
        ),
        "",
        "### 구현 메모(Implementation Notes)",
        "",
        list(api.implementationNotes ?? []),
        "",
        "### 인수 기준(Acceptance Criteria)",
        "",
        list(api.acceptanceCriteria ?? []),
        "",
      ];
    }),
  ].join("\n");
}

export function renderScreenDefinition(screen: ScreenDefinition, projectTitle: string, productBuilderBasePackages?: unknown): string {
  const targetSurface = constrainProductBuilderSurfaces([screen.targetSurface ?? "undecided"], productBuilderBasePackages)[0] ?? "undecided";
  return [
    `# 화면정의서(Screen Definition) - ${screen.code} ${screen.name}`,
    "",
    ...productBuilderSurfaceSectionHeader(targetSurface, "화면정의서 상세(Screen Detail)"),
    "## 1. 기본 정보(Basic Information)",
    "",
    table(
      ["항목(Item)", "내용(Description)"],
      [
        ["프로젝트(Project)", projectTitle],
        ["화면 코드(Screen Code)", screen.code],
        ["화면명(Screen Name)", screen.name],
        ["대상 surface(Target Surface)", productBuilderSurfaceLabel(targetSurface)],
        ["화면 설명(Screen Description)", screen.description],
        ["경로(Route)", screen.route],
        ["인증/권한(Auth/Permission)", SCREEN_ACCESS_LABEL[screen.access] ?? screen.access],
        ["Layout", `${screen.layoutCode} / ${screen.layoutSlot}`],
      ],
    ),
    "",
    ...productBuilderBasePackageScopeSection(productBuilderBasePackages),
    "## 2. 참조 계약(Referenced Contracts)",
    "",
    table(
      ["구분(Type)", "코드(Code)"],
      [
        ["스키마(Schema)", screen.schemas.join(", ") || "(없음)"],
        ["API", screen.apis.join(", ") || "(없음)"],
      ],
    ),
    "",
    "## 3. 화면 필드(Screen Fields)",
    "",
    list(screen.fields),
    "",
    "## 4. 화면 상태(Screen States)",
    "",
    table(
      ["상태(State)", "정의(Definition)"],
      screen.states.map((state) => [state.name, state.description]),
    ),
    "",
    "## 5. 사용자 액션(User Actions)",
    "",
    table(
      ["액션(Action)", "test-id", "트리거(Trigger)", "동작 설명(Description)", "API", "이동 화면(Target Screen)"],
      screen.actions.map((item) => [
        item.code,
        item.testId,
        item.trigger,
        item.description,
        item.apiCodes.join(", "),
        item.targetScreenCode ?? "",
      ]),
    ),
    "",
    "## 6. 미확정(Undecided)",
    "",
    table(
      ["항목(Item)", "필요한 결정(Decision Needed)", "담당(Owner)"],
      [["미확정 화면 정책", "자료에서 확인되지 않은 화면 세부 정책", "PM Agent"]],
    ),
    "",
    "## 7. 화면 QA 인수 기준(Screen QA Acceptance Criteria)",
    "",
    "이 섹션은 이 화면이 구현 완료로 인정될 수 있는지 QA가 검수하는 기준이다. 제품 전체 성공 기준이 아니라, 화면 단위로 렌더링(Rendering), 권한(Permission), 입력 검증(Validation), 상태 전환(State Transition), API 연동(API Integration), 오류 처리(Error Handling)를 확인한다.",
    "",
    "### 7.1 QA 범위(QA Scope)",
    "",
    table(
      ["검수 영역(QA Area)", "확인 목적(Purpose)", "필수 여부(Required)"],
      [
        ["화면 진입(Screen Entry)", "route, 접근 권한, 초기 렌더링이 정의대로 동작하는지 확인", "Yes"],
        ["화면 상태(Screen States)", "default/empty/loading/error/permission 상태가 구분되는지 확인", "Yes"],
        ["사용자 액션(User Actions)", "주요 버튼, 링크, 탭, 모달, 제출 동작이 기대 결과를 만드는지 확인", "Yes"],
        ["입력 검증(Input Validation)", "필수값, 형식, 길이, 중복 등 사용자가 복구 가능한 검증 메시지가 보이는지 확인", screen.fields.length > 0 ? "Yes" : "Conditional"],
        ["API 연동(API Integration)", "요청 시점, 성공 응답, 실패 응답, 로딩 상태가 화면에 반영되는지 확인", screen.apis.length > 0 ? "Yes" : "Conditional"],
        ["이동/전환(Navigation/Transition)", "액션 이후 대상 화면, 모달, 탭, 뒤로가기 흐름이 맞는지 확인", screen.actions.some((action) => action.targetScreenCode) ? "Yes" : "Conditional"],
      ],
    ),
    "",
    "### 7.2 검수 케이스(QA Cases)",
    "",
    table(
      ["검수 항목(QA Case)", "사전 조건(Precondition)", "사용자 행동(User Action)", "기대 결과(Expected Result)", "확인 데이터/상태(Data or State)", "test-id", "자동화 후보(Automation Candidate)"],
      screen.acceptanceCriteria.map((item) => [
        item.code,
        `${SCREEN_ACCESS_LABEL[screen.access] ?? screen.access} 접근 조건`,
        "관련 사용자 액션(User Action) 수행",
        item.description,
        screen.apis.length > 0 ? `API: ${screen.apis.join(", ")}` : "UI state",
        item.testId,
        "Yes",
      ]),
    ),
    "",
    "### 7.3 완료 판정(Pass Criteria)",
    "",
    list([
      "화면정의서의 주요 사용자 액션(User Actions)이 모두 검수 케이스(QA Cases)에 연결되어 있다.",
      "권한이 필요한 화면은 허용/차단 케이스가 모두 있다.",
      "API를 사용하는 화면은 성공/실패/로딩 상태가 모두 확인 가능하다.",
      "입력 폼이 있는 화면은 필수값과 오류 메시지 기준이 있다.",
      "와이어프레임(Wireframe)과 구현 UI가 이 화면의 기대 결과(Expected Result)를 벗어나지 않는다.",
    ]),
  ].join("\n");
}

export function screenPlanToScreenModel(screenPlan: ScreenPlan): {
  screens: Array<{ basic: Record<string, string>; tables: Record<string, Array<Record<string, string>>> }>;
} {
  return {
    screens: screenPlan.screens.map((s) => ({
      basic: {
        screenCode: s.code,
        screenName: s.name,
        description: s.description,
        domainMenu: "",
        route: s.route,
        permission: SCREEN_ACCESS_LABEL[s.access] ?? s.access,
        access: s.access,
        targetSurface: s.targetSurface ?? "",
        layoutCode: s.layoutCode ?? "",
        layoutSlot: s.layoutSlot ?? "",
        primaryTestId: s.primaryTestId ?? "",
        states: s.states.map((st) => st.name).join(", "),
        priorPlan: "",
        priorSchemaApi: "",
        sources: "",
      },
      tables: {
        composition: [],
        fields: s.fields.map((label) => ({ label })),
        actions: s.actions.map((a) => ({
          actionCode: a.code,
          actionName: "",
          trigger: a.trigger,
          handling: a.description,
          api: a.apiCodes.join(", "),
          onSuccess: "",
          onFailure: "",
          nextScreen: a.targetScreenCode ?? "",
          testId: a.testId,
        })),
        apis: s.apis.map((apiCode) => ({ apiCode })),
        acceptance: s.acceptanceCriteria.map((c) => ({
          acCode: c.code,
          actions: "",
          condition: c.description,
          verify: "",
        })),
        undecided: [],
        docReflect: [],
      },
    })),
  };
}

type ScreenDocumentEntry = {
  screen: ScreenDefinition;
  path: string;
  targetSurface: ProductBuilderSurface;
};

function screenDocumentEntries(screenPlan: ScreenPlan, projectId?: string | null, productBuilderBasePackages?: unknown): ScreenDocumentEntry[] {
  const screenDir = `${blueprintTransformDir(projectId)}/screens`;
  const used = new Map<string, number>();
  return screenPlan.screens.map((screen): ScreenDocumentEntry => {
    const targetSurface = constrainProductBuilderSurfaces([
      screen.targetSurface ?? inferScreenTargetSurface(
        screen as ScreenDefinition & Record<string, unknown>,
        screen.access,
        screen.route,
        productBuilderBasePackages,
      ),
    ], productBuilderBasePackages)[0] ?? "undecided";
    const codeSlug = sanitizeCodePart(screen.code);
    const slug = sanitizeCodePart(screen.name);
    const base = `${productBuilderSurfacePathSegment(targetSurface)}/${codeSlug}-${slug}`;
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    const fileName = count === 1 ? `${base}.md` : `${base}-${count}.md`;
    return {
      screen,
      path: `${screenDir}/${fileName}`,
      targetSurface,
    };
  });
}

export function renderScreenDefinitionIndex(
  screenPlan: ScreenPlan,
  projectTitle: string,
  projectId?: string | null,
  productBuilderBasePackages?: unknown,
): string {
  const entries = screenDocumentEntries(screenPlan, projectId, productBuilderBasePackages);
  const sections = productBuilderSurfaceOrderForScope(productBuilderBasePackages).flatMap((surface) => {
    const rows = entries
      .filter((entry) => entry.targetSurface === surface)
      .map(({ screen, path }) => [
        screen.code,
        screen.name,
        screen.route || "-",
        SCREEN_ACCESS_LABEL[screen.access] ?? screen.access,
        path,
        screen.actions[0]?.trigger ?? "-",
      ]);
    return [
      ...productBuilderSurfaceSectionHeader(surface, "화면정의서(Screen Definition)"),
      rows.length
        ? table(
          ["화면 코드(Screen Code)", "화면명(Screen Name)", "경로(Route)", "권한(Auth)", "상세 문서(Screen Definition)", "대표 액션(Primary Action)"],
          rows,
        )
        : "_해당 없음(N/A)_",
      "",
    ];
  });
  return [
    `# 화면정의서(Screen Definitions) - 목록(Index) - ${projectTitle}`,
    "",
    "이 페이지는 화면정의서 산출물 안의 목록 페이지다. 화면을 설정에서 선택된 apps/admin, apps/site, apps/app, apps/landing 구획으로 정확히 나누고, 각 구획 안에서 route, 권한, 상세 화면정의서 문서를 추적한다.",
    "",
    ...productBuilderBasePackageScopeSection(productBuilderBasePackages),
    ...sections,
  ].join("\n");
}

export function renderWritingRules(): string {
  return [
    "# 화면정의서 작성 룰(Screen Definition Writing Rules)",
    "",
    "1. 화면 1개는 화면정의서 1개로 작성한다.",
    "2. 화면 코드는 `{AREA}-SCR-{NNN}` 형식을 사용한다.",
    "3. 각 화면은 Product Builder base surface 기준으로 `admin`, `site`, `app`, `landing` 중 하나의 `targetSurface`를 가진다.",
    "4. 설정에서 선택된 apps/admin, apps/site, apps/app, apps/landing 화면을 같은 섹션에 섞지 않는다.",
    "5. 공통 레이아웃은 별도 문서로 분리하지 않는다. 화면정의서는 페이지별 `layoutCode`와 `layoutSlot`을 자체 포함한다.",
    "6. 사용자 동작은 `ACT-01`부터 순번으로 작성한다.",
    "7. 화면 상태는 default/empty/loading/error/permission 기준으로 적는다.",
    "8. 인수 기준은 `AC-01`부터 순번으로 작성한다.",
    "9. `data-testid`는 화면코드와 action/ac code에서 파생한다. 예: `scr-001-act-01`, `scr-001-ac-01`.",
    "10. 화면 이동 액션은 대상 화면코드(`targetScreenCode`)를 반드시 적는다.",
    "11. 화면에서 쓰는 스키마/API는 선행 산출물의 code만 참조하고, layout/slot은 화면정의서에서 페이지별로 정의한다.",
    "12. 예외/빈 상태/권한 오류처럼 QA가 확인해야 하는 상태는 인수 기준에 적는다.",
  ].join("\n");
}

const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  "internal-plan": "내부 기획",
  "external-plan": "외부 기획",
  "meeting-note": "회의록",
  "reference": "참고자료",
  "other": "기타",
};

export function sourceTypeLabel(type: SourceType): string {
  return SOURCE_TYPE_LABEL[type] ?? "기타";
}

// 사람이 읽을 파일명 slug. 코드 식별자용 sanitizeCodePart와 달리 유니코드(한글 등) 글자를 보존한다.
export function fileSlug(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "source";
}

function etlProjectIdSegment(projectId?: string | null): string {
  const segment = (projectId ?? "").trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return segment || ETL_PROJECT_FALLBACK_ID;
}

export function etlProjectRoot(projectId?: string | null): string {
  return `${ETL_PROJECT_ROOT_DIR}/${etlProjectIdSegment(projectId)}`;
}

export function sourceDocDir(projectId?: string | null): string {
  return `${etlProjectRoot(projectId)}/extract/sources`;
}

export function sourceOriginalDir(projectId?: string | null): string {
  return `${etlProjectRoot(projectId)}/extract/originals`;
}

function blueprintTransformDir(projectId?: string | null): string {
  return `${etlProjectRoot(projectId)}/transform/blueprint`;
}

function featureDocDir(projectId?: string | null): string {
  return `${blueprintTransformDir(projectId)}/features`;
}

function blueprintStandardDocDir(projectId?: string | null): string {
  return `${blueprintTransformDir(projectId)}/standards`;
}

function pmExecutionProcedureDoc(projectId?: string | null): string {
  return `${blueprintStandardDocDir(projectId)}/pm-execution-procedure.md`;
}

function screenDefinitionWritingRulesDoc(projectId?: string | null): string {
  return `${blueprintStandardDocDir(projectId)}/screen-definition-writing-rules.md`;
}

function legacySourceDocPath(source: SourceMaterial): string {
  const base = source.fileName ? source.fileName.replace(/\.[^.]+$/, "") : source.title;
  return `${LEGACY_BLUEPRINT_DOC_DIR}/sources/${fileSlug(base)}-${source.id.slice(0, 12)}.md`;
}

// 등록 자료 1건을 Project source slot metadata에 연결하는 논리적 documentRef.
// slug만으로는 한글 파일명 붕괴/동일 이름 충돌로 덮어쓰기가 발생하므로 source id 접미사(48bit)로 충돌 확률을 사실상 0으로 낮춘다.
export function sourceDocPath(source: SourceMaterial, projectId?: string | null): string {
  const base = source.fileName ? source.fileName.replace(/\.[^.]+$/, "") : source.title;
  return `${sourceDocDir(projectId)}/${fileSlug(base)}-${source.id.slice(0, 12)}.md`;
}

export function sourceDocPathCandidates(source: SourceMaterial, projectId?: string | null): string[] {
  return [...new Set([sourceDocPath(source, projectId), legacySourceDocPath(source)])];
}

// 원본 바이너리로 보관을 허용하는 확장자 allowlist. 목록 밖(html/svg 등 렌더 위험)은 bin으로 정규화한다.
const SAFE_ORIGINAL_EXTENSIONS = new Set([
  "txt", "md", "markdown", "doc", "docx", "ppt", "pptx", "xls", "xlsx",
  "pdf", "hwp", "hwpx", "csv", "json", "rtf",
]);

// 원본 바이너리의 확장자. 파일명에서 우선(allowlist 통과 시), 없으면 포맷, 그래도 없으면 bin.
function originalExtension(source: SourceMaterial): string {
  const fromName = source.fileName?.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if (fromName && SAFE_ORIGINAL_EXTENSIONS.has(fromName)) return fromName;
  if (source.format && SAFE_ORIGINAL_EXTENSIONS.has(source.format)) return source.format;
  return "bin";
}

// Legacy original archive path builder. 새 등록 플로우는 원본 바이너리를 workspace에 쓰지 않는다.
export function sourceOriginalPath(source: SourceMaterial, projectId?: string | null): string {
  const base = source.fileName ? source.fileName.replace(/\.[^.]+$/, "") : source.title;
  return `${sourceOriginalDir(projectId)}/${fileSlug(base)}-${source.id.slice(0, 12)}.${originalExtension(source)}`;
}

const SLOT_DEFINITION_BY_KEY = new Map<ProjectDocumentSlotKey, ProjectDocumentSlotDefinition>(
  PROJECT_DOCUMENT_SLOT_DEFINITIONS.map((definition) => [definition.slotKey, definition]),
);

function slotDefinition(slotKey: ProjectDocumentSlotKey): ProjectDocumentSlotDefinition {
  const definition = SLOT_DEFINITION_BY_KEY.get(slotKey);
  if (!definition) throw new Error(`Unknown project document slot: ${slotKey}`);
  return definition;
}

function makeProjectDocumentSlotUpdate(input: {
  slotKey: ProjectDocumentSlotKey;
  status?: ProjectDocumentSlotStatus;
  documentRefs?: string[];
  updatedAt?: string;
}): ProjectDocumentSlotUpdate {
  return {
    ...slotDefinition(input.slotKey),
    status: input.status ?? "ready",
    documentRefs: [...new Set(input.documentRefs ?? [])],
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
}

export function mergeProjectDocumentSlotUpdates(
  existing: ProjectDocumentSlotUpdate[],
  updates: ProjectDocumentSlotUpdate[],
): ProjectDocumentSlotUpdate[] {
  const byKey = new Map<ProjectDocumentSlotKey, ProjectDocumentSlotUpdate>();
  for (const slot of existing) byKey.set(slot.slotKey, slot);
  for (const update of updates) {
    const previous = byKey.get(update.slotKey);
    byKey.set(update.slotKey, {
      ...update,
      documentRefs: [...new Set([...(previous?.documentRefs ?? []), ...update.documentRefs])],
    });
  }
  return PROJECT_DOCUMENT_SLOT_KEYS
    .map((slotKey) => byKey.get(slotKey))
    .filter((slot): slot is ProjectDocumentSlotUpdate => Boolean(slot));
}

export function sourceSlotKeyForType(type: SourceType): ProjectDocumentSlotKey {
  switch (type) {
    case "external-plan":
      return "source.customer_originals";
    case "reference":
      return "source.references";
    case "internal-plan":
    case "meeting-note":
    case "other":
    default:
      return "source.internal_notes";
  }
}

export function projectSlotUpdateForSource(
  source: SourceMaterial,
  documentRef: string | null,
): ProjectDocumentSlotUpdate {
  return makeProjectDocumentSlotUpdate({
    slotKey: sourceSlotKeyForType(source.type),
    status: documentRef ? "ready" : "draft",
    documentRefs: documentRef ? [documentRef] : [],
  });
}

function blueprintDocRelativePath(filePath: string): string | null {
  const etlMatched = /^etl\/projects\/[^/]+\/transform\/blueprint\/(.+)$/.exec(filePath);
  if (etlMatched) return etlMatched[1];
  const legacyPrefix = `${LEGACY_BLUEPRINT_DOC_DIR}/`;
  if (filePath.startsWith(legacyPrefix)) return filePath.slice(legacyPrefix.length);
  return null;
}

export function projectSlotKeyForDocumentPath(filePath: string): ProjectDocumentSlotKey | null {
  const relativePath = blueprintDocRelativePath(filePath);
  if (!relativePath) return null;
  if (relativePath === "standards/pm-execution-procedure.md" || relativePath === "_standards/pm-execution-procedure.md") {
    return "support.pm_execution_procedure";
  }
  if (relativePath === "standards/screen-definition-writing-rules.md" || relativePath === "_standards/screen-definition-writing-rules.md") {
    return "support.screen_definition_writing_rules";
  }
  if (relativePath === "development-requirements-brief.md") return "deliverable.prd";
  if (relativePath === "feature-definition.md") return "deliverable.feature_files";
  if (relativePath === "schema-definition.md") return "deliverable.schema_definition";
  if (relativePath === "api-definition.md") return "deliverable.api_definition";
  if (relativePath === "architecture-definition.md") return "deliverable.architecture";
  if (relativePath.startsWith("features/")) return "deliverable.feature_files";
  if (relativePath.startsWith("screens/")) return "deliverable.screen_definitions";
  return null;
}

export function projectSlotUpdatesForDocuments(
  docs: Record<string, string> | string[],
  status: ProjectDocumentSlotStatus = "ready",
): ProjectDocumentSlotUpdate[] {
  const files = Array.isArray(docs) ? docs : Object.keys(docs);
  const refsBySlot = new Map<ProjectDocumentSlotKey, string[]>();
  for (const file of files) {
    const slotKey = projectSlotKeyForDocumentPath(file);
    if (!slotKey) continue;
    refsBySlot.set(slotKey, [...(refsBySlot.get(slotKey) ?? []), file]);
  }
  return [...refsBySlot.entries()].map(([slotKey, documentRefs]) => makeProjectDocumentSlotUpdate({
    slotKey,
    status,
    documentRefs,
  }));
}

function stripRenderedSourceWrapper(body: string): string {
  const match = /^## 본문\(Body\)\s*$/m.exec(body);
  if (!match) return body.trim();
  return body.slice(match.index + match[0].length).replace(/^\n+/, "").trim();
}

function stripLegacyNotionPageIndexes(body: string): string {
  const lines = body.replace(/\r\n?/g, "\n").split("\n");
  const kept: string[] = [];
  let skipping = false;

  for (const line of lines) {
    if (/^#{1,6}\s+(?:전체\s+)?(?:Figma 링크|외부 링크)\([^)]*Index\)\s*$/i.test(line)
      || /^#{1,6}\s+페이지 목록\(Page Index\)\s*$/i.test(line)) {
      skipping = true;
      continue;
    }
    if (skipping && /^#{1,6}\s+\S/.test(line)) skipping = false;
    if (!skipping) kept.push(line);
  }

  return kept.join("\n");
}

export function cleanNotionSourceMarkdown(body: string): string {
  let next = stripRenderedSourceWrapper(body);
  next = next.replace(
    /^#\s+노션 공유페이지\(Notion Shared Page\)\s*\n+(?:-\s+[^\n]*(?:\n|$))+\n*/i,
    "",
  );
  next = stripLegacyNotionPageIndexes(next);
  next = next
    .replace(/^(#{1,6})\s+NOTION-\d+\.\s+/gm, "$1 ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return next;
}

// 업로드/입력 자료를 프로젝트 문서로 기록하기 위한 Markdown. 본문 원문은 그대로 보존한다.
export function renderSourceDocument(source: SourceMaterial): string {
  if (source.intakeWorkflow === "notion_shared_page" || source.format === "notion") {
    return cleanNotionSourceMarkdown(source.body);
  }

  return [
    `# 기획 자료(Source Material) - ${source.title}`,
    "",
    table(
      ["항목(Item)", "내용(Description)"],
      [
        ["제목(Title)", source.title],
        ["유형(Type)", sourceTypeLabel(source.type)],
        ["원본 파일(Original File)", source.fileName ?? "(직접 입력)"],
        ["포맷(Format)", source.format ?? "text"],
        ["수집 워크플로우(Intake Workflow)", source.intakeWorkflow ?? "-"],
        ["URL", source.url ?? "-"],
        ["URL 가져오기(URL Fetch)", source.fetchStatus ?? "-"],
        ["URL 가져온 시각(Fetched At)", source.fetchedAt ?? "-"],
        ["URL 가져오기 오류(Fetch Error)", source.fetchError ?? "-"],
        ["자료 지문(Source Fingerprint)", source.fingerprint ?? "-"],
        ["원본 보관(Original Archive)", source.originalPath ?? "-"],
        ["등록 시각(Created At)", source.createdAt],
      ],
    ),
    "",
    "## 본문(Body)",
    "",
    source.body,
  ].join("\n");
}

// 프로젝트마다 바뀌지 않는 고정 기준 문서.
export function renderBlueprintStandardDocuments(projectId?: string | null): Record<string, string> {
  return {
    [pmExecutionProcedureDoc(projectId)]: renderPmExecutionProcedure(),
    [screenDefinitionWritingRulesDoc(projectId)]: renderWritingRules(),
  };
}

// 아키텍쳐 정의서 본문. mermaid 도식 + 기술 스택 + 인프라 + 컴포넌트 + 연동 + 데이터 흐름.
function renderArchitectureDefinition(plan: BlueprintPrd): string {
  const a = plan.architecture;
  return [
    `# 아키텍쳐 정의서(Architecture Definition) - ${plan.projectTitle}`,
    "",
    a.overview,
    "",
    ...productBuilderBasePackageScopeSection(plan.productBuilderBasePackages),
    "## 시스템 아키텍쳐 다이어그램(System Architecture Diagram)",
    "",
    "```mermaid",
    a.diagram,
    "```",
    "",
    "## 기술 스택(Tech Stack)",
    "",
    a.techStack.length
      ? table(["영역(Area)", "채택(Choice)", "근거(Rationale)"], a.techStack.map((t) => [t.area, t.choice, t.rationale ?? "-"]))
      : "_해당 없음(N/A)_",
    "",
    "## 인프라 구성(Infrastructure)",
    "",
    a.infrastructure.length
      ? table(
        ["코드(Code)", "구성요소(Component)", "분류(Category)", "상세(Detail)"],
        a.infrastructure.map((n) => [n.code, n.name, INFRASTRUCTURE_CATEGORY_LABEL[n.category] ?? n.category, n.detail]),
      )
      : "_해당 없음(N/A)_",
    "",
    "## 컴포넌트(Components)",
    "",
    a.components.length
      ? table(
        ["코드(Code)", "이름(Name)", "계층(Layer)", "책임(Responsibility)", "기술(Tech)", "의존(Depends On)"],
        a.components.map((c) => [c.code, c.name, ARCHITECTURE_LAYER_LABEL[c.layer] ?? c.layer, c.responsibility, c.techStack.join(", ") || "-", (c.dependsOn ?? []).join(", ") || "-"]),
      )
      : "_해당 없음(N/A)_",
    "",
    "## 외부 연동(Integrations)",
    "",
    a.integrations.length ? a.integrations.map((item) => `- ${item}`).join("\n") : "_해당 없음(N/A)_",
    "",
    "## 핵심 데이터 흐름(Data Flow)",
    "",
    a.dataFlow.length ? a.dataFlow.map((item) => `- ${item}`).join("\n") : "_해당 없음(N/A)_",
  ].join("\n");
}

// 분석 ①단계 프로젝트별 문서: 개발 요구사항 브리프 + 기능/스키마/API/아키텍처 정의.
export function renderPrdDocuments(
  plan: BlueprintPrd,
  requirementInventory?: RequirementInventory | null,
  sources: SourceMaterial[] = [],
  projectId?: string | null,
): Record<string, string> {
  const blueprintDir = blueprintTransformDir(projectId);
  const docs: Record<string, string> = {
    [`${blueprintDir}/development-requirements-brief.md`]: renderProductRequirementsDocument(plan, requirementInventory, sources),
    [`${blueprintDir}/feature-definition.md`]: renderFeatureDefinitionIndex(plan),
    [`${blueprintDir}/schema-definition.md`]: renderSchemaDefinition(plan),
    [`${blueprintDir}/api-definition.md`]: renderApiDefinition(plan),
    [`${blueprintDir}/architecture-definition.md`]: renderArchitectureDefinition(plan),
  };
  for (const { requirement, path } of featureDocumentEntries(plan, projectId)) {
    docs[path] = renderFeatureDefinition(plan, requirement);
  }
  return Object.fromEntries(
    Object.entries(docs).map(([path, body]) => [path, stripInternalEngineeringQualityRules(body)]),
  );
}

// 분석 ②단계 프로젝트별 문서: 화면정의서 전체.
export function renderScreenDocuments(
  screenPlan: ScreenPlan,
  projectTitle: string,
  projectId?: string | null,
  productBuilderBasePackages?: unknown,
): Record<string, string> {
  const docs: Record<string, string> = {};
  const screenDir = `${blueprintTransformDir(projectId)}/screens`;
  docs[`${screenDir}/screen-definition-index.md`] = renderScreenDefinitionIndex(screenPlan, projectTitle, projectId, productBuilderBasePackages);

  for (const { screen, path } of screenDocumentEntries(screenPlan, projectId, productBuilderBasePackages)) {
    docs[path] = renderScreenDefinition(screen, projectTitle, productBuilderBasePackages);
  }

  return Object.fromEntries(
    Object.entries(docs).map(([path, body]) => [path, stripInternalEngineeringQualityRules(body)]),
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Wiki 등재 (plugin-llm-wiki 연동)
//
// 산출물(개발 요구사항 브리프/계약 ① / 화면정의서 ②)을 프로젝트 단위 wiki space에 페이지로 등재한다.
// - 등재는 UI(board 세션)에서 wiki 플러그인 apiRoute(file-as-page)를 직접 호출한다(worker 우회).
//   worker는 board/agent 인증이 없어 apiRoute를 못 부르지만, UI는 브라우저 board 세션을 가진다.
// - wiki에는 프로젝트→space 자동 매핑이 없으므로 프로젝트명 기반 slug로 space를 find-or-create 한다.
// 여기서는 네트워크 의존이 없는 순수 변환만 제공한다(테스트 가능). 실제 fetch는 ui/wiki.ts.
// ────────────────────────────────────────────────────────────────────────────

// plugin-llm-wiki 의 등록 id(키). apiRoute 경로 `/api/plugins/<id>/api/<route>` 의 <id>.
export const WIKI_PLUGIN_ID = "paperclipai.plugin-llm-wiki";

// wiki page 경로 접두어. wiki는 page 경로가 `wiki/` 로 시작 + `.md` 로 끝나야 한다(assertPagePath).
export const WIKI_PAGE_DIR = "wiki/etl";

export interface WikiPageDoc {
  // space 상대 page 경로. 반드시 `wiki/` 시작 + `.md` 종료.
  path: string;
  title: string;
  contents: string;
}

export interface WikiSpaceTarget {
  slug: string;
  displayName: string;
}

// wiki normalizeSpaceSlug 와 동일 규칙(소문자, [^a-z0-9]→-, 양끝 - 제거, 최대 64자).
// 단 wiki는 빈 결과에 throw 하지만 여기서는 빈 문자열을 반환한다(호출부가 대체 slug 결정).
// 한글 등 ASCII 외 문자만 있으면 빈 slug가 되므로 wikiSpaceForProject가 id 기반으로 대체한다.
export function normalizeWikiSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

// 프로젝트 → wiki space 매핑. slug는 wiki에 저장/조회되는 키이므로 ASCII로 보장한다.
// 프로젝트명이 ASCII slug를 못 만들면(예: 순수 한글) 프로젝트 id 기반 안정 slug로 대체한다.
export function wikiSpaceForProject(project: { id: string; name: string }): WikiSpaceTarget {
  const fromName = normalizeWikiSlug(project.name);
  const idPart = project.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toLowerCase();
  // "default"는 wiki 공용 default space 예약 slug다(create-space가 기존 공용 space 반환).
  // 이름이 "default"로 정규화되면 프로젝트가 공용 space를 오염시키므로 id 기반 slug로 대체한다.
  const slug = fromName && fromName !== "default" ? fromName : `proj-${idPart || "space"}`;
  const displayName = project.name.trim() || slug;
  return { slug, displayName };
}

// 문서 markdown의 첫 H1(`# ...`)을 페이지 제목으로 사용. 없으면 경로 파일명에서 파생.
function wikiPageTitle(markdown: string, pagePath: string): string {
  for (const line of markdown.split("\n")) {
    const matched = /^#\s+(.+?)\s*$/.exec(line);
    if (matched) return matched[1];
  }
  const base = pagePath.split("/").pop() ?? pagePath;
  return base.replace(/\.md$/, "") || "문서";
}

// etl/<rest> → wiki/etl/<rest>, legacy docs/cos-blueprint/<rest> → wiki/blueprint/<rest> 로 경로를 재매핑한다.
// 접두어가 예상과 다르면(향후 렌더러 변경 대비) 파일명을 WIKI_PAGE_DIR 하위로 강제해 wiki 규칙(wiki/ 시작)을 보장한다.
function toWikiPagePath(docPath: string): string {
  const etlMapped = docPath.replace(/^etl\//, `${WIKI_PAGE_DIR}/`);
  if (etlMapped.startsWith("wiki/")) return etlMapped;
  const legacyMapped = docPath.replace(/^docs\/cos-blueprint\//, "wiki/blueprint/");
  if (legacyMapped.startsWith("wiki/")) return legacyMapped;
  const base = legacyMapped.split("/").pop() ?? legacyMapped;
  return `${WIKI_PAGE_DIR}/${base}`;
}

// 등재할 wiki 페이지 목록을 만든다. 개발 요구사항 브리프(①)·screenPlan(②) 중 존재하는 것만 포함.
// 산출 markdown은 기존 렌더러를 재사용하므로 디스크 기록물과 1:1 동일하다.
export function buildWikiPages(
  prd: BlueprintPrd | null,
  screenPlan: ScreenPlan | null,
  projectTitle: string,
  requirementInventory?: RequirementInventory | null,
  sources: SourceMaterial[] = [],
  projectId?: string | null,
): WikiPageDoc[] {
  const pages: WikiPageDoc[] = [];
  const add = (docs: Record<string, string>) => {
    for (const [docPath, contents] of Object.entries(docs)) {
      const pagePath = toWikiPagePath(docPath);
      pages.push({ path: pagePath, title: wikiPageTitle(contents, pagePath), contents });
    }
  };
  if (prd || screenPlan) add(renderBlueprintStandardDocuments(projectId));
  if (prd) add(renderPrdDocuments(prd, requirementInventory, sources, projectId));
  if (screenPlan) add(renderScreenDocuments(screenPlan, projectTitle, projectId, prd?.productBuilderBasePackages));
  return pages;
}

// ── KB Graph (Slice 1) ──────────────────────────────────────────────
export function extractIntakeLinks(metadata: Record<string, unknown> | undefined): SourceMaterial["links"] | undefined {
  if (!metadata) return undefined;
  const arr = (key: string): string[] =>
    Array.isArray(metadata[key])
      ? (metadata[key] as unknown[]).filter((v): v is string => typeof v === "string")
      : [];
  const external = arr("externalLinks");
  const figma = arr("figmaLinks");
  const notionPageIds = arr("pageIds");
  const notionPageUrls = arr("pageUrls");
  if (!external.length && !figma.length && !notionPageIds.length && !notionPageUrls.length) return undefined;
  return { external, figma, notionPageIds, notionPageUrls };
}

export type GraphNodeKind = "source" | "deliverable";
export type GraphNodeFormat = "md" | "text" | "url" | "figma" | "notion" | "csv" | "html";
export type GraphEdgeType = "links-to" | "child-of" | "derives-from" | "references" | "flows-to" | "manual";

/** buildGraphFromState가 분석/내부 산출물 노드를 만들 때 읽는 project_documents slot의 최소 형태. */
export type GraphSlotInput = {
  slotKey: string;
  slotGroup?: string;
  status?: string;
  document?: { body?: string | null } | null;
};

export type GraphNode = {
  id: string;
  kind: GraphNodeKind;
  subtype: string;
  title: string;
  format: GraphNodeFormat;
  bodyRef: { kind: "source"; sourceId: string } | { kind: "slot"; slotKey: string };
  managedBy: "graph" | "project_documents";
  status: "draft" | "ready" | "approved";
};
export type GraphEdge = {
  id: string;
  from: string;
  to: string;
  type: GraphEdgeType;
  origin: "derived" | "stored" | "manual";
  evidence?: string;
};
export type BlueprintGraph = { nodes: GraphNode[]; edges: GraphEdge[] };

function sourceNodeFormat(source: SourceMaterial): GraphNodeFormat {
  const f = source.format;
  if (f === "url" || f === "figma" || f === "notion") return f;
  if (f === "md" || f === "txt") return "md";
  return "text";
}

// 같은 자료를 가리키는지: url 동일 또는 notion pageId/url 교집합.
function sourceMatchesLink(target: SourceMaterial, link: string): boolean {
  if (target.url && target.url === link) return true;
  const ids = target.links?.notionPageIds ?? [];
  const urls = target.links?.notionPageUrls ?? [];
  return ids.includes(link) || urls.includes(link);
}

export function buildGraphFromState(state: CosBlueprintState, slots: ReadonlyArray<GraphSlotInput> = []): BlueprintGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  // 같은 자료가 type(external/internal)·재등록으로 state.sources에 중복 적재될 수 있다.
  // 자료 1건당 1노드만 보이도록 fileName||url||id 기준으로 dedup하고, 모든 source.id를
  // 대표 노드 id(canonical)로 매핑해 dedup으로 사라진 노드를 가리키는 엣지가 깨지지 않게 한다.
  const sourceCanonicalKey = (s: SourceMaterial): string =>
    (s.fileName?.trim().toLowerCase() || s.url?.trim().toLowerCase() || s.id);
  const canonicalIdBySourceId = new Map<string, string>();
  const canonicalIdByKey = new Map<string, string>();
  // 1) source 노드 (그래프 관리, dedup된 대표만)
  for (const source of state.sources) {
    const key = sourceCanonicalKey(source);
    const existing = canonicalIdByKey.get(key);
    if (existing) {
      canonicalIdBySourceId.set(source.id, existing);
      continue;
    }
    canonicalIdByKey.set(key, source.id);
    canonicalIdBySourceId.set(source.id, source.id);
    nodes.push({
      id: source.id,
      kind: "source",
      subtype: source.type,
      title: source.title,
      format: sourceNodeFormat(source),
      bodyRef: { kind: "source", sourceId: source.id },
      managedBy: "graph",
      status: "ready",
    });
  }
  const canonical = (sourceId: string): string => canonicalIdBySourceId.get(sourceId) ?? sourceId;

  // 2) 자료↔자료 links-to (등록된 다른 source와 매칭만, canonical 매핑 + dedup)
  const linkEdgeIds = new Set<string>();
  for (const source of state.sources) {
    const links = [...(source.links?.external ?? []), ...(source.links?.figma ?? [])];
    for (const link of links) {
      const target = state.sources.find((t) => t.id !== source.id && sourceMatchesLink(t, link));
      if (!target) continue;
      const from = canonical(source.id);
      const to = canonical(target.id);
      if (from === to) continue;
      const id = `links:${from}:${to}`;
      if (linkEdgeIds.has(id)) continue;
      linkEdgeIds.add(id);
      edges.push({ id, from, to, type: "links-to", origin: "stored" });
    }
  }

  // 3) 분석 산출물 노드 = 생성된(GENERATED) deliverable slot 기준 (project_documents 참조).
  //    개발 요구사항 브리프·스키마·API·아키텍처·화면정의서는 휘발성 state가 아니라 project_documents slot에 영속되므로
  //    slot을 source-of-truth로 쓴다. "문서 하나당 한 덩어리" 입도: slot 1개 = 노드 1개.
  //    등록 자료(source)는 source 노드가 대표하고, 분석 산출물만 deliverable 노드로 둔다.
  const DELIVERABLE_NODE_LABELS: Record<string, string> = {
    "deliverable.prd": "개발 요구사항 브리프",
    "deliverable.feature_files": "기능 정의서",
    "deliverable.schema_definition": "스키마 정의서",
    "deliverable.api_definition": "API 정의서",
    "deliverable.architecture": "아키텍쳐 정의서",
    "deliverable.screen_definitions": "화면정의서",
  };
  const slotGenerated = (row: GraphSlotInput): boolean =>
    row.status === "ready" || row.status === "approved" || Boolean(row.document?.body?.trim());
  const deliverableNodeIds = new Set<string>();
  for (const row of slots) {
    const label = DELIVERABLE_NODE_LABELS[row.slotKey];
    if (!label) continue;             // 그래프에 표시할 분석/내부 산출물만(build_plan 등 제외)
    if (!slotGenerated(row)) continue; // 생성된 것만
    if (deliverableNodeIds.has(row.slotKey)) continue;
    deliverableNodeIds.add(row.slotKey);
    nodes.push({
      id: row.slotKey,
      kind: "deliverable",
      subtype: row.slotKey.replace("deliverable.", ""),
      title: label,
      format: "md",
      bodyRef: { kind: "slot", slotKey: row.slotKey },
      managedBy: "project_documents",
      status: row.status === "approved" ? "approved" : "ready",
    });
  }

  // 4) flows-to 파이프라인 엣지: 자료 → 개발 요구사항 브리프 → {기능·스키마·API·아키텍처} → 화면정의서.
  const flowEdgeIds = new Set<string>();
  const addFlow = (from: string, to: string) => {
    const id = `flow:${from}:${to}`;
    if (flowEdgeIds.has(id)) return;
    flowEdgeIds.add(id);
    edges.push({ id, from, to, type: "flows-to", origin: "derived" });
  };
  // 등록 자료 → 개발 요구사항 브리프 (브리프가 있을 때만). 자료정리본 노드가 없으므로 자료가 브리프로 직결.
  if (deliverableNodeIds.has("deliverable.prd")) {
    for (const node of nodes) {
      if (node.kind === "source") addFlow(node.id, "deliverable.prd");
    }
  }
  const FLOW_PAIRS: ReadonlyArray<readonly [string, string]> = [
    ["deliverable.prd", "deliverable.feature_files"],
    ["deliverable.prd", "deliverable.schema_definition"],
    ["deliverable.prd", "deliverable.api_definition"],
    ["deliverable.prd", "deliverable.architecture"],
    ["deliverable.schema_definition", "deliverable.api_definition"],
    ["deliverable.schema_definition", "deliverable.screen_definitions"],
    ["deliverable.api_definition", "deliverable.screen_definitions"],
  ];
  for (const [from, to] of FLOW_PAIRS) {
    if (deliverableNodeIds.has(from) && deliverableNodeIds.has(to)) addFlow(from, to);
  }

  return { nodes, edges };
}

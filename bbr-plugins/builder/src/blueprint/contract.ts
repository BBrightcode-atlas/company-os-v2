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

export const BLUEPRINT_PROJECT_KEY = "blueprint";

export const BLUEPRINT_PM_SKILL_KEY = "blueprint-pm-execution";
export const BLUEPRINT_CONTRACT_SKILL_KEY = "blueprint-contract-definition";
export const BLUEPRINT_SCREEN_SKILL_KEY = "blueprint-screen-definition";
export const BLUEPRINT_SKILL_KEYS = [
  BLUEPRINT_PM_SKILL_KEY,
  BLUEPRINT_CONTRACT_SKILL_KEY,
  BLUEPRINT_SCREEN_SKILL_KEY,
] as const;

export const BLUEPRINT_STANDARD_PLAN_ROUTINE_KEY = "blueprint-standard-plan";
export const BLUEPRINT_CONTRACT_ROUTINE_KEY = "blueprint-contract-definition";
export const BLUEPRINT_SCREEN_ROUTINE_KEY = "blueprint-screen-definition";
export const BLUEPRINT_ROUTINE_KEYS = [
  BLUEPRINT_STANDARD_PLAN_ROUTINE_KEY,
  BLUEPRINT_CONTRACT_ROUTINE_KEY,
  BLUEPRINT_SCREEN_ROUTINE_KEY,
] as const;

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
  // 분석 단계 ①: PRD/계약 산출물
  runStandardPlan: "run-standard-plan",
  confirmStandardPlan: "confirm-standard-plan",
  writeStandardPlanDocs: "write-standard-plan-docs",
  // 분석 단계 ②: 화면정의서 (확정 게이트 통과 후)
  runScreens: "run-screens",
  writeScreenDocs: "write-screen-docs",
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
  // 보관한 원본 바이너리 다운로드(파일 → base64)
  readSourceOriginal: "read-source-original",
  reset: "reset",
} as const;

export const SUBMIT_BLUEPRINT_PRD_TOOL = {
  name: "submit-blueprint-prd",
  displayName: "Blueprint: submit PRD",
  description:
    "Blueprint PM Agent가 등록 자료를 끝까지 읽고 작성한 PRD/Product Builder 기준선과 계약 초안을 제출한다. PRD를 댓글로만 남기지 말고 이 도구를 호출해 Project document slot에 저장하라.",
  parametersSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "PRD를 저장할 Paperclip project id.",
      },
      requirementInventory: {
        type: "object",
        description: "선택. PM Agent가 만든 source-backed coverage index. 없으면 등록 source로 내부 추적용 inventory를 보강한다.",
      },
      standardPlan: {
        type: "object",
        description: "필수. PRD/Product Builder 기준선. overview, goals, scope, functionalRequirements, nonFunctionalRequirements, schemas, apis, architecture, risks, assumptions를 포함한다.",
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
    required: ["projectId", "standardPlan"],
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

export type ProductBuilderBlueprintContext = {
  id: ProductBuilderBlueprintId;
  label: string;
  productBuilderLabel: string;
  description: string;
};

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

export const PROJECT_DOCUMENT_SLOT_KEYS = [
  "source.customer_originals",
  "source.internal_notes",
  "source.references",
  "support.pm_execution_procedure",
  "support.screen_definition_writing_rules",
  "deliverable.prd",
  "deliverable.feature_files",
  "deliverable.schema_definition",
  "deliverable.api_definition",
  "deliverable.architecture",
  "deliverable.screen_definitions",
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
    title: "PRD(Product Requirements Document)",
    required: true,
    contentType: "text/markdown",
    templatePath: "bbr-plugins/builder/templates/deliverables/prd.md",
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
  requiredFields: string[];
  exitCriteria: string[];
  dependsOn: ProjectDocumentSlotKey[];
};

const OUTPUT_INVENTORY_TARGETS: readonly OutputInventoryTargetDefinition[] = [
  {
    slotKey: "deliverable.prd",
    title: "PRD(Product Requirements Document)",
    purpose: "사용자 문제, 대상 actor, 성공 기준, 범위, 리스크, 제품 요구사항을 정리하고 후속 산출물의 기준선으로 삼는다.",
    prefix: "PRD",
    requiredFields: ["problem", "users", "scope", "requirements", "successCriteria", "nonFunctionalRequirements", "risks", "assumptions"],
    exitCriteria: ["프로젝트 목표와 포함/제외 범위가 확정된다.", "기능/비기능 요구사항과 성공 기준이 검수 가능하다.", "계약/기능/화면 산출물이 참조할 기준선이 된다."],
    dependsOn: [],
  },
  {
    slotKey: "deliverable.feature_files",
    title: "기능정의서(Feature Definition)",
    purpose: "기능 목록 페이지와 기능별 상세 문서를 한 산출물 안에서 구현 가능한 기능 단위와 project-builder-base 재사용 단위로 정리한다.",
    prefix: "FEAT",
    requiredFields: ["featureIndex", "featureName", "baseSurface", "reuseDecision", "behavior", "actors", "acceptanceCriteria", "sourceRefs"],
    exitCriteria: ["목록 페이지가 기능별 상세 문서를 참조한다.", "각 기능이 전체 재사용/부분 재사용/커스터마이징/신규 중 하나로 판정된다.", "admin/site/app/landing 등 hard-copy 대상 surface가 명시된다.", "각 기능이 독립 구현/QA 단위로 분리된다.", "Product Builder가 기능별 작업 그래프를 만들 수 있다."],
    dependsOn: ["deliverable.prd"],
  },
  {
    slotKey: "deliverable.schema_definition",
    title: "스키마 정의서(Schema Definition)",
    purpose: "데이터 객체, 필드, 관계, 검증 규칙을 개발 계약으로 고정한다.",
    prefix: "SCH",
    requiredFields: ["schemaCode", "name", "fields", "relations", "validation", "acceptanceCriteria"],
    exitCriteria: ["모든 데이터 객체가 필드/관계/검증 기준을 가진다.", "API와 화면정의서가 schema code로 참조할 수 있다."],
    dependsOn: ["deliverable.prd"],
  },
  {
    slotKey: "deliverable.api_definition",
    title: "API 정의서(API Definition)",
    purpose: "REST API 경로, actor, 인증, 입출력, 에러, 감사 액션을 고정한다.",
    prefix: "API",
    requiredFields: ["method", "path", "actor", "auth", "input", "output", "errors", "auditAction"],
    exitCriteria: ["각 API가 schema code와 연결된다.", "프론트엔드/백엔드가 같은 입출력 계약을 참조한다."],
    dependsOn: ["deliverable.schema_definition"],
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

export type SourceMaterial = {
  id: string;
  title: string;
  type: SourceType;
  body: string;
  createdAt: string;
  /** 업로드 원본 파일명. 직접 입력 자료는 비어 있다. */
  fileName?: string;
  /** 추출 원본 포맷. 기본 "text". */
  format?: SourceFormat;
  /** URL 기반 자료일 때 원본 URL. */
  url?: string;
  /** 자료가 들어온 논리 워크플로우. 기존 state 호환을 위해 문자열로 둔다. */
  intakeWorkflow?: string;
  /** URL 자동 가져오기 결과. URL 자료가 아니면 비어 있다. */
  fetchStatus?: "not_fetched" | "fetched" | "failed";
  /** URL 자동 가져오기 성공 시각. */
  fetchedAt?: string;
  /** URL 자동 가져오기 실패 사유. */
  fetchError?: string;
  /** 동일 Project source slot 중복 등록 방지용 안정 지문. */
  fingerprint?: string;
  /** Legacy only: 과거 보관한 원본 바이너리의 프로젝트 workspace 상대 경로. 새 등록에서는 비어 있다. */
  originalPath?: string;
  /** Legacy only: 보관한 원본 바이너리 크기(bytes). */
  originalSize?: number;
  /** Legacy only: 보관한 원본 바이너리 MIME. */
  originalContentType?: string;
  /** Legacy only: 원본을 기록한 프로젝트 id. */
  originalProjectId?: string;
  /** 자료↔자료 연결(지식베이스). intake에서 캡처. fingerprint에는 미포함(dedup 안정). */
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

export type SchemaDefinition = {
  code: string;
  name: string;
  description: string;
  fields: SchemaField[];
  owner?: string;
  sourceRequirementCodes?: string[];
  relations?: string[];
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
  sourceInventoryItemIds?: string[];
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
    name: "PRD 기준선 확정",
    purpose: "목표, 범위, 요구사항, 리스크, 전제를 PRD로 고정한다.",
    inputDocuments: ["등록 자료"],
    outputDocuments: [
      "deliverable.prd",
    ],
    exitCriteria: ["포함/제외 범위가 모두 명시됨", "기능 요구사항이 기능 정의서 slot으로 추적 가능함"],
    owner: "PM Agent",
  },
  {
    code: "PM-STEP-03",
    name: "기능정의서 생성",
    purpose: "PRD 기능 요구사항을 기능 목록, 기능별 상세 문서, project-builder-base 재사용 판정으로 분리한다.",
    inputDocuments: ["제품 요구사항 문서(PRD)"],
    outputDocuments: [
      "deliverable.feature_files",
    ],
    exitCriteria: ["기능 목록이 기능별 상세 문서를 참조함", "기능별로 admin/site/app/landing 등 대상 surface가 명시됨", "기능별로 전체 재사용/부분 재사용/커스터마이징/신규 판정이 있음"],
    owner: "PM Agent",
  },
  {
    code: "PM-STEP-04",
    name: "스키마/API 계약 분리",
    purpose: "개발과 QA가 참조할 데이터 스키마 정의서와 REST API 정의서를 표준 산출물로 분리한다.",
    inputDocuments: ["제품 요구사항 문서(PRD)", "기능정의서"],
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
    purpose: "확정된 PRD/스키마/API 계약을 기준으로 페이지별 레이아웃을 포함한 화면정의서를 생성한다.",
    inputDocuments: ["확정된 PRD", "기능정의서", "스키마 정의서", "REST API 정의서"],
    outputDocuments: ["deliverable.screen_definitions"],
    exitCriteria: ["PRD가 confirmed 상태임", "각 화면이 schema/api 코드를 재정의 없이 참조하고 페이지별 layout/slot을 자체 포함함"],
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

// 분석 ①단계 산출물: PRD/계약 기준선 (일정/마일스톤 제외).
export type StandardPlan = {
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

// 분석 ②단계 산출물: 화면정의서 전체. 확정된 StandardPlan을 입력으로 생성.
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
  kind: "requirement-inventory" | "standard-plan" | "screens" | "screen";
  stage?: "requirement-inventory" | "standard-plan" | "screens" | "screen";
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

export type CosBlueprintState = {
  sources: SourceMaterial[];
  productBuilderBlueprintId: ProductBuilderBlueprintId;
  productBuilderBlueprintSelectedAt: string | null;
  requirementInventory: RequirementInventory | null;
  standardPlan: StandardPlan | null;
  screenPlan: ScreenPlan | null;
  projectDocumentSlots: ProjectDocumentSlotUpdate[];
  job?: BlueprintJob | null;
  updatedAt: string | null;
};

export type CosBlueprintOverview = {
  status: "ok";
  checkedAt: string;
  pluginId: string;
  version: string;
  state: CosBlueprintState;
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
    requirementInventory: null,
    standardPlan: null,
    screenPlan: null,
    projectDocumentSlots: [],
    job: null,
    updatedAt: null,
  };
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
  const prdStateReady = Boolean(input.state?.standardPlan);
  const prdConfirmed = Boolean(input.state?.standardPlan?.confirmedAt) || blueprintSlotApproved(get("deliverable.prd"));
  const screenStateReady = Boolean(input.state?.screenPlan);
  const prdReady = prdStateReady || blueprintSlotReady(get("deliverable.prd"));
  const featureFilesReady = blueprintSlotReady(get("deliverable.feature_files"));
  const schemaReady = blueprintSlotReady(get("deliverable.schema_definition"));
  const apiReady = blueprintSlotReady(get("deliverable.api_definition"));
  const screensReady = blueprintSlotReady(get("deliverable.screen_definitions"));
  const wireframeReady = blueprintSlotReady(get("deliverable.wireframe_html"));
  const buildPlanReady = blueprintSlotReady(get("deliverable.build_plan"));
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
        title: "PRD(Product Requirements Document) workflow",
        subtitle: "등록 자료와 내부 coverage index를 기준선으로 제품 요구사항을 확정",
        owner: "PM Agent",
        steps: [
          blueprintWorkflowStep({
            key: "prd.source_baseline",
            title: "등록 자료 기준선",
            detail: "source slot에 등록된 자료 본문과 내부 coverage index를 PRD 입력으로 사용합니다.",
            done: sourceReady,
            active: !sourceReady,
            blocked: !sourceReady,
          }),
          blueprintWorkflowStep({
            key: "prd.write_requirements",
            title: "제품/범위/요구사항 작성",
            detail: "문제, 대상 사용자, 범위, 성공 기준, 기능/비기능 요구사항을 작성합니다.",
            done: prdStateReady,
            active: sourceReady && !prdStateReady,
            blocked: !sourceReady,
          }),
          blueprintWorkflowStep({
            key: "prd.product_builder_basis",
            title: "Product Builder 기준 연결",
            detail: "웹서비스/웹앱 등 이후 BuildPlan에서 쓸 제품 유형 기준을 반영합니다.",
            done: prdStateReady,
            active: sourceReady && !prdStateReady,
            blocked: !sourceReady,
          }),
          blueprintWorkflowStep({
            key: "prd.slot_review",
            title: "PRD 슬롯 기록/검토",
            detail: "Project deliverable slot에 PRD를 기록하고 확정 여부를 추적합니다.",
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
        subtitle: "목록 페이지와 기능별 상세 문서를 하나의 산출물로 정리",
        owner: "Contract Agent",
        steps: [
          blueprintWorkflowStep({ key: "feature_files.prd", title: "PRD 기준선 확보", detail: "기능 분해는 PRD 범위와 요구사항을 기준으로 합니다.", done: prdReady, active: sourceReady && !prdReady, blocked: !sourceReady }),
          blueprintWorkflowStep({ key: "feature_files.base_reuse", title: "base 재사용 후보 분석", detail: "project-builder-base의 admin/site/app/landing surface와 기존 feature를 기준으로 전체 재사용/부분 재사용/커스터마이징/신규를 판정합니다.", done: featureFilesReady, active: prdReady && !featureFilesReady, blocked: !prdReady }),
          blueprintWorkflowStep({ key: "feature_files.index", title: "목록 페이지 작성", detail: "기능 목록, 기능별 상세 문서 참조, base 재사용 판정을 같은 기능정의서 산출물 안에 둡니다.", done: featureFilesReady, active: prdReady && !featureFilesReady, blocked: !prdReady }),
          blueprintWorkflowStep({ key: "feature_files.behavior", title: "기능별 동작/커스터마이징 정의", detail: "각 feature의 actor, behavior, acceptance criteria와 재사용 feature의 수정 범위를 작성합니다.", done: featureFilesReady, active: prdReady && !featureFilesReady, blocked: !prdReady }),
          blueprintWorkflowStep({ key: "feature_files.traceability", title: "출처/요구사항 추적", detail: "각 기능이 등록 자료/PRD 항목과 연결되는지 확인합니다.", done: featureFilesReady, active: prdReady && !featureFilesReady, blocked: !prdReady }),
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
          blueprintWorkflowStep({ key: "schema.prd", title: "PRD 데이터 요구 확인", detail: "PRD의 사용자/운영/콘텐츠 데이터를 schema 후보로 변환합니다.", done: prdReady, active: sourceReady && !prdReady, blocked: !sourceReady }),
          blueprintWorkflowStep({ key: "schema.model", title: "객체/필드/관계 설계", detail: "엔티티, 필드 타입, 관계, 필수값을 정의합니다.", done: schemaReady, active: prdReady && !schemaReady, blocked: !prdReady }),
          blueprintWorkflowStep({ key: "schema.validation", title: "검증/제약 조건 정리", detail: "API와 화면이 참조할 validation 기준을 고정합니다.", done: schemaReady, active: prdReady && !schemaReady, blocked: !prdReady }),
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
          blueprintWorkflowStep({ key: "api.prd", title: "PRD 기능 요구 확인", detail: "사용자 action과 운영 flow를 API 후보로 변환합니다.", done: prdReady, active: sourceReady && !prdReady, blocked: !sourceReady }),
          blueprintWorkflowStep({ key: "api.schema", title: "Schema 의존성 확인", detail: "endpoint 입출력이 schema code와 연결되는지 확인합니다.", done: schemaReady, active: prdReady && !schemaReady, blocked: !prdReady }),
          blueprintWorkflowStep({ key: "api.contract", title: "Endpoint 계약 작성", detail: "method/path/auth/request/response/error를 정의합니다.", done: apiReady, active: schemaReady && !apiReady, blocked: !schemaReady }),
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
          blueprintWorkflowStep({ key: "architecture.contracts", title: "PRD/Schema/API 기준 확보", detail: "제품 요구, 데이터 계약, API 계약을 architecture 입력으로 사용합니다.", done: prdReady && schemaReady && apiReady, active: prdReady && (!schemaReady || !apiReady), blocked: !prdReady }),
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
        subtitle: "PRD 확정 후 화면 단위 계약과 QA 기준을 작성",
        owner: "Screen Agent",
        steps: [
          blueprintWorkflowStep({ key: "screens.prd_gate", title: "PRD 확정 게이트", detail: "화면정의서는 PRD 기준선 확정 뒤 생성합니다.", done: prdConfirmed || screensReady, active: prdReady && !prdConfirmed, blocked: !prdReady }),
          blueprintWorkflowStep({ key: "screens.list", title: "화면 목록 생성", detail: "screen code, route, actor, primary action을 도출합니다.", done: screenStateReady, active: prdConfirmed && !screenStateReady, blocked: !prdConfirmed }),
          blueprintWorkflowStep({ key: "screens.write", title: "화면별 문서 작성", detail: "fields, actions, states, API/schema refs, acceptance criteria를 작성합니다.", done: rowReady, active: screenStateReady && !rowReady, blocked: !screenStateReady }),
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
    case "deliverable.build_plan":
      return withRevisionStep({
        workflowKey: "deliverable.build_plan",
        label: blueprintWorkflowLabel(slotKey),
        title: "BuildPlan workflow",
        subtitle: "기획/화면/와이어프레임을 구현 계획으로 변환",
        owner: "Product Builder",
        steps: [
          blueprintWorkflowStep({ key: "build_plan.inputs", title: "상위 산출물 확인", detail: "PRD, 기능 정의서, 화면정의서, 와이어프레임을 입력으로 읽습니다.", done: prdReady && featureFilesReady && screensReady && wireframeReady, active: prdReady && featureFilesReady && screensReady && !wireframeReady, blocked: !(prdReady && featureFilesReady && screensReady) }),
          blueprintWorkflowStep({ key: "build_plan.gap_reuse", title: "gap/reuse 분석", detail: "product-builder-base 기준으로 REUSE/EXTEND/NEW/N/A를 판정합니다.", done: buildPlanReady, active: prdReady && featureFilesReady && screensReady && !buildPlanReady, blocked: !(prdReady && featureFilesReady && screensReady) }),
          blueprintWorkflowStep({ key: "build_plan.structure", title: "구조화 BuildPlan 작성", detail: "feature별 BE/BE QA/FE/FE QA/통합 QA 체인을 정의합니다.", done: buildPlanReady, active: prdReady && !buildPlanReady, blocked: !prdReady }),
          commonSlotStep,
        ],
      });
    case "deliverable.task_list":
      return withRevisionStep({
        workflowKey: "deliverable.task_list",
        label: blueprintWorkflowLabel(slotKey),
        title: "전체 Task 목록 workflow",
        subtitle: "BuildPlan을 사람이 검토 가능한 전체 작업표로 전개",
        owner: "Product Builder",
        steps: [
          blueprintWorkflowStep({ key: "task_list.build_plan", title: "BuildPlan 기준선", detail: "확정된 BuildPlan을 task source로 사용합니다.", done: buildPlanReady, active: prdReady && !buildPlanReady, blocked: !prdReady }),
          blueprintWorkflowStep({ key: "task_list.stage_expand", title: "Feature별 단계 전개", detail: "BE → BE QA → FE → FE QA → 전체 QA 순서로 펼칩니다.", done: taskListReady, active: buildPlanReady && !taskListReady, blocked: !buildPlanReady }),
          blueprintWorkflowStep({ key: "task_list.release", title: "공통/통합/Release 작업 포함", detail: "공통 작업, 통합 QA, release handoff를 누락 없이 포함합니다.", done: taskListReady, active: buildPlanReady && !taskListReady, blocked: !buildPlanReady }),
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
          blueprintWorkflowStep({ key: `${slotKey}.prd`, title: "PRD 기준선 확인", detail: "공통 산출물은 PRD 기준선을 먼저 사용합니다.", done: prdReady, active: sourceReady && !prdReady, blocked: !sourceReady }),
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
    { area: "백엔드(Backend)", choice: isWebApp ? "Node.js REST API 서버" : "Next.js Route Handlers + 서비스 백엔드", rationale: isWebApp ? "로그인 후 반복 작업·트랜잭션 처리" : "공개 페이지 + 관리자 API" },
    { area: "데이터베이스(Database)", choice: "PostgreSQL, Drizzle ORM", rationale: "관계형 무결성, 타입 세이프 쿼리" },
    { area: "인증(Auth)", choice: isWebApp ? "세션 기반 + OAuth(Google/Kakao 등)" : "관리자 인증, 공개 페이지 비인증", rationale: "제품 유형별 접근 모델" },
    { area: "배포(Deploy)", choice: "Vercel 또는 컨테이너(Docker)", rationale: "프리뷰 배포·수평 확장" },
  ];
  if (isWebApp) {
    techStack.push({ area: "AI", choice: "LLM Gateway(REST)", rationale: "AI 서버 분리로 모델 호출 일원화" });
  }

  const infrastructure: InfrastructureItem[] = [
    { code: "ARC-INF-001", name: "앱 호스팅", category: "hosting", provider: "Vercel / 컨테이너", detail: isWebApp ? "App SPA + REST API 호스팅" : "공개 웹사이트 + 관리자 호스팅" },
    { code: "ARC-INF-002", name: "데이터베이스", category: "database", provider: "PostgreSQL(Supabase 등)", detail: "주 데이터 저장소, 자동 백업" },
    { code: "ARC-INF-003", name: "오브젝트 스토리지", category: "storage", provider: "S3 호환 / Vercel Blob", detail: "이미지·첨부 파일 저장" },
    { code: "ARC-INF-004", name: "CDN", category: "cdn", provider: "Cloudflare 등", detail: "정적 자산·이미지 캐싱" },
    { code: "ARC-INF-005", name: "CI/CD", category: "ci-cd", provider: "GitHub Actions", detail: "테스트·빌드·배포 파이프라인" },
    { code: "ARC-INF-006", name: "관측성", category: "observability", provider: "로그/모니터링", detail: "에러 추적·성능 모니터링" },
  ];

  const components: ArchitectureComponent[] = isWebApp
    ? [
      { code: "ARC-CMP-001", name: "App SPA", layer: "frontend", responsibility: "로그인 후 반복 작업 중심 화면", techStack: ["Next.js", "React", "TypeScript"], dependsOn: ["ARC-CMP-003"] },
      { code: "ARC-CMP-002", name: "Admin Console", layer: "frontend", responsibility: "운영자 관리 화면", techStack: ["Next.js", "React"], dependsOn: ["ARC-CMP-003"] },
      { code: "ARC-CMP-003", name: "REST API Server", layer: "backend", responsibility: "비즈니스 로직·인증·데이터 접근", techStack: ["Node.js", "Drizzle ORM"], dependsOn: ["ARC-CMP-005"] },
      { code: "ARC-CMP-004", name: "AI Server", layer: "ai", responsibility: "LLM 호출·추론 오케스트레이션", techStack: ["LLM Gateway"], dependsOn: ["ARC-CMP-003"] },
      { code: "ARC-CMP-005", name: "PostgreSQL", layer: "data", responsibility: "주 데이터 저장소", techStack: ["PostgreSQL"] },
    ]
    : [
      { code: "ARC-CMP-001", name: "Public Site", layer: "frontend", responsibility: "공개 웹사이트(SEO/AEO/GEO)", techStack: ["Next.js", "React", "TypeScript"], dependsOn: ["ARC-CMP-003"] },
      { code: "ARC-CMP-002", name: "Admin Console", layer: "frontend", responsibility: "운영자 관리 화면", techStack: ["Next.js", "React"], dependsOn: ["ARC-CMP-003"] },
      { code: "ARC-CMP-003", name: "REST API Server", layer: "backend", responsibility: "서비스 백엔드·관리자 API", techStack: ["Next.js Route Handlers", "Drizzle ORM"], dependsOn: ["ARC-CMP-004"] },
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

function fallbackFunctionalRequirementsFromSources(sources: SourceMaterial[]): FunctionalRequirement[] {
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
      });
      if (requirements.length >= 20) return requirements;
    }
  }
  return requirements;
}

export function buildFallbackStandardPlan(input: {
  title?: string;
  sources: SourceMaterial[];
  productBuilderBlueprintId?: ProductBuilderBlueprintId;
  now?: string;
  model?: string;
}): StandardPlan {
  const projectTitle = input.title?.trim()
    || input.sources[0]?.title?.trim()
    || "분석 프로젝트";
  const generatedAt = input.now ?? new Date().toISOString();
  const productBuilderBlueprint = productBuilderBlueprintContext(input.productBuilderBlueprintId ?? DEFAULT_PRODUCT_BUILDER_BLUEPRINT_ID);
  const schemas: SchemaDefinition[] = [];
  const apis: ApiDefinition[] = [];
  const layouts: LayoutDefinition[] = [];
  const functionalRequirements = fallbackFunctionalRequirementsFromSources(input.sources);

  return {
    projectTitle,
    overview: `${projectTitle}의 등록 자료에서 확인된 요구사항을 기준으로 PRD 기준선을 도출한다. 자료에 없는 내용은 임의로 만들지 않고 후속 검토 항목으로 남긴다.`,
    goals: [
      "등록 자료에 명시된 문제, 사용자, 범위를 누락 없이 정리한다.",
      "기능 요구사항과 비기능 요구사항을 출처 기반으로 분리한다.",
      "스키마/API/화면정의서가 참조할 PRD 기준선을 확정한다.",
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
      { code: "RISK-001", description: "등록 자료에 없는 요구사항을 확정할 수 없다.", mitigation: "추가 자료를 등록하거나 TBD로 표시한다." },
    ],
    assumptions: [
      "입력 자료 밖의 내용은 임의로 생성하지 않는다.",
    ],
    productBuilderBlueprint,
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
  "PRD 기준선 검토",
  "관리자 검수",
]);

const SOURCE_SCREEN_CANDIDATES: SourceScreenCandidate[] = [
  {
    name: "홈",
    description: "서비스 진입점으로 배너, 질환별 인기 명의, 추천 커뮤니티 콘텐츠, 건강 정보 카드를 제공한다.",
    route: "/",
    access: "public",
    fields: ["banner", "popularDoctors", "recommendedPosts", "healthInfoCards"],
    triggers: ["건강 정보 카드 선택", "추천 게시글 선택", "질환별 인기 명의 선택"],
    patterns: [/홈\s*\(Home\)/i, /홈\(Home\)/i, /홈\s*화면/i, /홈탭/i, /Home/i],
  },
  {
    name: "AIGA 챗봇",
    description: "증상 입력과 위치 권한을 바탕으로 AI 명의/병원 추천 결과를 제공한다.",
    route: "/aiga-chatbot",
    access: "public",
    fields: ["symptomInput", "locationPermission", "recommendationResults"],
    triggers: ["증상 입력", "위치 정보 허용", "추천 의사 카드 선택"],
    patterns: [/AIGA\s*챗봇/i, /AI\s*챗봇/i, /명의\/병원 추천/i, /증세 체크/i],
  },
  {
    name: "통합 검색",
    description: "명의, 병원, 커뮤니티 결과를 탭으로 나누어 검색하고 결과 상세로 이동한다.",
    route: "/search",
    access: "public",
    fields: ["query", "resultTabs", "doctorResults", "hospitalResults", "communityResults"],
    triggers: ["검색어 입력", "명의 결과 선택", "병원 결과 선택", "커뮤니티 결과 선택"],
    patterns: [/통합\s*검색/i, /검색결과\s*탭/i, /검색어\s*하이라이트/i],
  },
  {
    name: "명의 찾기",
    description: "질환 카테고리, 세부 태그, 검색 자동완성, 정렬 조건으로 의사를 탐색한다.",
    route: "/doctors",
    access: "public",
    fields: ["category", "subTags", "searchKeyword", "sort", "doctorCards"],
    triggers: ["카테고리 선택", "정렬 변경", "의사 카드 선택", "거리순 정렬 선택"],
    patterns: [/명의\s*찾기/i, /질환\s*카테고리/i, /검색\s*자동완성/i, /의사\s*카드/i],
  },
  {
    name: "의사 프로필 상세",
    description: "의사 프로필, 리뷰, 즐겨찾기, 예약/전화, 리뷰 작성과 병원 방문 인증 요청을 제공한다.",
    route: "/doctors/:doctorId",
    access: "public",
    fields: ["doctorProfile", "reviews", "favoriteState", "reservationUrl", "phoneNumber"],
    triggers: ["예약 선택", "전화 선택", "저장 선택", "리뷰 작성 선택", "병원 방문 인증 요청"],
    patterns: [/의사\s*프로필/i, /의사\s*\/\s*병원\s*상세/i, /의료진\s*인증\s*요청/i],
  },
  {
    name: "병원 상세",
    description: "병원 기본 정보, 지도보기, 전화 연결을 제공하고 의사 프로필에서 연결된다.",
    route: "/hospitals/:hospitalId",
    access: "public",
    fields: ["hospitalInfo", "mapLink", "phoneNumber", "doctors"],
    triggers: ["지도보기 선택", "전화 선택", "소속 의사 선택"],
    patterns: [/병원\s*상세/i, /카카오맵/i, /지도보기/i],
  },
  {
    name: "커뮤니티",
    description: "환우 커뮤니티 게시글을 카테고리와 정렬 조건으로 조회하고 상세/작성 플로우로 진입한다.",
    route: "/community",
    access: "public",
    fields: ["category", "sort", "postCards", "writeButton"],
    triggers: ["카테고리 선택", "정렬 변경", "게시글 카드 선택", "글쓰기 선택"],
    patterns: [/커뮤니티/i, /환우\s*커뮤니티/i, /게시글\s*카드/i],
  },
  {
    name: "게시글 상세",
    description: "게시글 본문, 댓글, 작성자 프로필, 신고, 공유 동작을 처리한다.",
    route: "/community/posts/:postId",
    access: "public",
    fields: ["postBody", "comments", "authorProfile", "reportButton", "shareButton"],
    triggers: ["댓글 입력", "작성자 프로필 선택", "신고 선택", "공유 선택"],
    patterns: [/게시글\s*상세/i, /댓글\s*입력/i, /신고\s*모달/i],
  },
  {
    name: "글쓰기",
    description: "회원이 커뮤니티 게시글을 작성하고 비회원은 로그인 필요 상태로 분기한다.",
    route: "/community/write",
    access: "authenticated",
    fields: ["category", "title", "body", "submitButton"],
    triggers: ["게시글 저장", "작성 취소"],
    patterns: [/글쓰기/i, /플로팅\s*\(글쓰기/i, /게시글\/댓글/i],
  },
  {
    name: "리뷰 작성",
    description: "회원이 의사 리뷰를 작성하고 병원 방문 인증 여부에 따라 인증 뱃지를 부여한다.",
    route: "/doctors/:doctorId/reviews/new",
    access: "authenticated",
    fields: ["rating", "reviewBody", "visitProof", "submitButton"],
    triggers: ["리뷰 제출", "병원 방문 인증 자료 등록"],
    patterns: [/리뷰\s*작성/i, /의사\s*후기/i, /환자\s*리뷰/i],
  },
  {
    name: "마이페이지",
    description: "회원 프로필, 내 활동, 저장한 의료진, 고객지원, 로그아웃/탈퇴를 관리한다.",
    route: "/my",
    access: "authenticated",
    fields: ["profile", "activityTabs", "savedDoctors", "supportLinks"],
    triggers: ["닉네임 변경", "내 활동 탭 선택", "저장한 의료진 선택", "로그아웃 선택"],
    patterns: [/마이페이지/i, /내\s*활동/i, /저장한\s*의료진/i, /고객지원/i],
  },
  {
    name: "의료진 인증",
    description: "본인인증과 면허번호 입력을 통해 일반 회원을 의사 인증 회원으로 전환한다.",
    route: "/doctor-verification",
    access: "authenticated",
    fields: ["identityProvider", "licenseNumber", "agreements", "verificationStatus"],
    triggers: ["본인인증 채널 선택", "의사 인증 요청 제출", "오류 사유 확인"],
    patterns: [/의사\s*회원\s*인증/i, /의료진\s*인증/i, /면허번호/i, /본인인증/i],
  },
  {
    name: "Admin 로그인",
    description: "운영자가 관리자 영역에 접근하기 위해 로그인한다.",
    route: "/admin/login",
    access: "public",
    fields: ["email", "password", "loginButton"],
    triggers: ["로그인 제출"],
    patterns: [/Admin\s*로그인/i, /관리자\s*로그인/i, /Admin\s*로그인\s*→/i],
  },
  {
    name: "Admin 대시보드",
    description: "신고, 의사 정보 수정 요청, 의견 보내기 처리 대기 큐를 카드로 표시한다.",
    route: "/admin",
    access: "admin",
    fields: ["reportQueue", "doctorEditQueue", "feedbackQueue"],
    triggers: ["처리 대기 카드 선택"],
    patterns: [/대시보드\s*로그인\s*후\s*첫\s*화면/i, /신고·의사 정보 수정 요청·의견 보내기/i],
    requires: [/관리자|Admin|어드민/i],
  },
  {
    name: "Admin 신고 처리",
    description: "신고된 게시글, 댓글, 후기, 후기 댓글을 필터링하고 반려/삭제 처리한다.",
    route: "/admin/reports",
    access: "admin",
    fields: ["reportType", "reasonFilter", "reportedContent", "decision"],
    triggers: ["신고 행 펼침", "반려 처리", "삭제 처리"],
    patterns: [/신고\s*처리/i, /신고된\s*게시글/i, /반려\]\/\[삭제/i],
  },
  {
    name: "Admin 커뮤니티 관리",
    description: "게시글과 댓글을 검색하고 선제 삭제/복원으로 운영한다.",
    route: "/admin/community",
    access: "admin",
    fields: ["keyword", "postTree", "deleteState", "restoreWindow"],
    triggers: ["키워드 검색", "삭제 처리", "복원 처리"],
    patterns: [/커뮤니티\s*관리/i, /게시글·댓글\s*전체\s*조회/i],
    requires: [/관리자|Admin|어드민/i],
  },
  {
    name: "Admin 의사 관리",
    description: "의사 면허 인증 상태와 운영 데이터를 조회하고 편집/인증 취소를 처리한다.",
    route: "/admin/doctors",
    access: "admin",
    fields: ["licenseStatus", "doctorProfile", "visibility", "editModal"],
    triggers: ["의사 검색", "편집 선택", "인증 취소 선택"],
    patterns: [/의사\s*관리/i, /의사\s*면허\s*인증\s*상태/i],
    requires: [/관리자|Admin|어드민/i],
  },
  {
    name: "Admin 의사 정보 수정 요청",
    description: "사용자가 제보한 의사 프로필 정정 내용을 검토하고 완료/반려한다.",
    route: "/admin/doctor-edit-requests",
    access: "admin",
    fields: ["requestStatus", "requestedChanges", "reviewMemo"],
    triggers: ["의사 정보 편집", "완료 처리", "반려 처리"],
    patterns: [/의사\s*정보\s*수정\s*요청/i, /정정\s*내용\s*검토/i],
  },
  {
    name: "Admin 사용자 관리",
    description: "회원을 검색하고 가입일, 신고 누적, 병원 방문 인증 건수를 조회한다.",
    route: "/admin/users",
    access: "admin",
    fields: ["keyword", "userList", "reportCount", "visitProofCount"],
    triggers: ["회원 검색", "회원 상세 조회", "의사 관리로 이동"],
    patterns: [/사용자\s*관리/i, /회원\s*검색/i, /가입일·신고\s*누적/i],
    requires: [/관리자|Admin|어드민/i],
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
  if (/AIGA/i.test(text)) return "AIGA 정식 서비스 플랫폼 개발";
  return fallback;
}

function isGenericFallbackStandardPlan(plan: StandardPlan): boolean {
  if (plan.usedFallback) return true;
  if (/COS 분석 프로젝트|아키텍쳐 정의서\(Architecture Definition\)|Architecture Definition/i.test(plan.projectTitle)) return true;
  const titles = plan.functionalRequirements.map((requirement) => requirement.title);
  return titles.some((title) => INTERNAL_BUILDER_SCREEN_NAMES.has(title));
}

export function buildScreenAwareStandardPlan(input: {
  standardPlan: StandardPlan;
  sources: SourceMaterial[];
}): StandardPlan {
  const candidates = extractSourceScreenCandidates(input.sources);
  if (candidates.length === 0 || !isGenericFallbackStandardPlan(input.standardPlan)) {
    return input.standardPlan;
  }

  const projectTitle = inferProjectTitleFromSources(input.sources, input.standardPlan.projectTitle);
  const functionalRequirements: FunctionalRequirement[] = candidates.map((candidate, index) => ({
    code: `FR-${String(index + 1).padStart(3, "0")}`,
    title: candidate.name,
    description: candidate.description,
    priority: candidate.access === "admin" ? "should" : "must",
  }));

  return {
    ...input.standardPlan,
    projectTitle,
    overview: `${projectTitle}의 등록 자료에서 확인된 사용자/관리자 화면을 기준으로 화면정의서 생성을 위한 기준선을 보정했다.`,
    goals: [
      `${projectTitle}의 핵심 사용자 화면을 누락 없이 정의한다.`,
      "관리자 운영 화면과 사용자 화면의 권한 분기를 분리한다.",
      "각 화면의 상태, 입력 필드, 사용자 액션, 검수 기준을 QA 가능한 단위로 정리한다.",
    ],
    scope: {
      inScope: candidates.map((candidate) => `${candidate.name} 화면 정의`),
      outOfScope: input.standardPlan.scope.outOfScope.length
        ? input.standardPlan.scope.outOfScope
        : ["실제 기능 구현", "운영 데이터 직접 이관"],
    },
    functionalRequirements,
  };
}

// 분석 ②단계 deterministic 안전망. 확정된 PRD 기준선 + 원본 자료에서 화면 템플릿을 생성.
export function buildFallbackScreenPlan(input: {
  sources: SourceMaterial[];
  standardPlan?: StandardPlan;
  now?: string;
  model?: string;
}): ScreenPlan {
  const sourceDrivenCandidates = extractSourceScreenCandidates(input.sources);
  const firstSchema = input.standardPlan?.schemas[0]?.code ?? "SCH-001";
  const schemaCodes = input.standardPlan?.schemas.length ? input.standardPlan.schemas.slice(0, 3).map((schema) => schema.code) : [firstSchema];
  const firstApi = input.standardPlan?.apis[0]?.code ?? "API-001";
  const apiCodes = input.standardPlan?.apis.length ? input.standardPlan.apis.slice(0, 3).map((api) => api.code) : [firstApi];
  if (sourceDrivenCandidates.length > 0) {
    return {
      screens: sourceDrivenCandidates.map((candidate, index): ScreenDefinition => {
        const code = `SCR-${String(index + 1).padStart(3, "0")}`;
        return {
          code,
          name: candidate.name,
          description: candidate.description,
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

  const fallbackRequirements = (input.standardPlan?.functionalRequirements.length
    ? input.standardPlan.functionalRequirements
    : fallbackFunctionalRequirementsFromSources(input.sources))
    .filter((requirement) => !isInternalBuilderRequirement(requirement))
    .slice(0, 10);

  return {
    screens: fallbackRequirements.map((requirement, index): ScreenDefinition => {
      const code = `SCR-${String(index + 1).padStart(3, "0")}`;
      const access = /관리자|admin|운영자/i.test(`${requirement.title} ${requirement.description}`) ? "admin" : "authenticated";
      return {
        code,
        name: requirement.title,
        description: requirement.description || `${requirement.title} 요구사항을 처리하는 화면 후보다.`,
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
  standardPlan?: StandardPlan;
  model?: string;
}): ScreenPlan {
  if (!isGenericFallbackScreenPlan(input.screenPlan)) {
    return input.screenPlan;
  }

  return buildFallbackScreenPlan({
    sources: input.sources,
    standardPlan: input.standardPlan,
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

export function normalizeStandardPlanJson(input: unknown, fallback: StandardPlan): StandardPlan {
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
  const functionalRequirements = frs.map((fr, index) => ({
    code: str(fr.code, `FR-${String(index + 1).padStart(3, "0")}`),
    title: str(fr.title, `요구사항 ${index + 1}`),
    description: str(fr.description, ""),
    priority: fr.priority === "must" || fr.priority === "should" || fr.priority === "could" ? fr.priority : undefined,
    sourceInventoryItemIds: Array.isArray(fr.sourceInventoryItemIds)
      ? fr.sourceInventoryItemIds.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      : undefined,
  })).filter((requirement) => !isInternalBuilderRequirement(requirement));
  const normalizedSchemas = schemas.map((schema, index) => ({
    ...schema,
    code: schema.code || `SCH-${String(index + 1).padStart(3, "0")}`,
    fields: Array.isArray(schema.fields) ? schema.fields : [],
    sourceRequirementCodes: Array.isArray(schema.sourceRequirementCodes) ? schema.sourceRequirementCodes : [],
    relations: Array.isArray(schema.relations) ? schema.relations : [],
    acceptanceCriteria: Array.isArray(schema.acceptanceCriteria) ? schema.acceptanceCriteria : [],
  })).filter((schema) => !isInternalBuilderSchema(schema));
  const normalizedApis = apis.map((api, index) => ({
    ...api,
    code: api.code || `API-${String(index + 1).padStart(3, "0")}`,
    method: api.method || "GET",
    input: Array.isArray(api.input) ? api.input : [],
    output: Array.isArray(api.output) ? api.output : [],
    schemas: Array.isArray(api.schemas) ? api.schemas : [],
    errors: Array.isArray(api.errors) ? api.errors : [],
    acceptanceCriteria: Array.isArray(api.acceptanceCriteria) ? api.acceptanceCriteria : [],
  })).filter((api) => !isInternalBuilderApi(api));
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
    generatedAt: typeof record.generatedAt === "string" ? record.generatedAt : fallback.generatedAt,
    confirmedAt: null,
    llmModel: typeof record.llmModel === "string" ? record.llmModel : fallback.llmModel,
    usedFallback: false,
  };
}

// 단일 화면 정의 정규화. normalizeScreenPlanJson과 단일 화면 regen 양쪽에서 재사용.
// render가 하드 의존하는 문자열 필드는 반드시 채우고, access는 명시값 우선·route 추론 기본.
export function normalizeScreenDefinition(raw: unknown, index: number): ScreenDefinition {
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

export function normalizeScreenPlanJson(input: unknown, fallback: ScreenPlan): ScreenPlan {
  const record = input && typeof input === "object" ? input as Record<string, unknown> : {};
  // LLM이 screens를 누락/빈배열로 주거나 요소가 객체가 아니면 fallback으로 대체하고 usedFallback 표기.
  const rawScreens = Array.isArray(record.screens)
    ? (record.screens as unknown[]).filter((s): s is ScreenDefinition => s !== null && typeof s === "object")
    : [];
  const usedFallback = rawScreens.length === 0;
  const screens = usedFallback ? fallback.screens : rawScreens;

  return {
    screens: screens.map((screen, screenIndex) => normalizeScreenDefinition(screen, screenIndex)),
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
        requiredFields: target.requiredFields,
        exitCriteria: target.exitCriteria,
        dependsOn: target.dependsOn,
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
  return /ProjectBrief|ScreenSpec|project-briefs|\/cos-blueprint|cos-blueprint|COS Blueprint|Blueprint PM|Builder 기본|SourceMaterial|기획 자료 등록|PRD\/계약 산출물 생성|PRD 기준선 검토|관리자 검수|화면정의서 생성 기준선/.test(value);
}

const INTERNAL_BUILDER_REQUIREMENT_TITLES = new Set([
  "기획 자료 등록",
  "PRD/계약 산출물 생성",
  "화면정의서 생성",
  "첨부 파일 처리",
  "관리자 검수",
  "PRD 기준선 검토",
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

export function ensureStandardPlanInventoryCoverage(
  plan: StandardPlan,
  inventory: RequirementInventory | null | undefined,
): StandardPlan {
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

export function buildRequirementInventoryPrompt(input: {
  source: SourceMaterial;
  chunkText: string;
  chunkIndex: number;
  totalChunks: number;
}): string {
  return [
    "COS Blueprint PM Agent의 내부 커버리지 인덱스(Internal Coverage Index)를 수행해 JSON 객체 하나만 출력하라.",
    "이 결과는 사용자에게 노출되는 첫 산출물이 아니라 PRD 작성 전 누락을 막는 내부 coverage baseline이다. 예쁘게 요약하지 말고 후속 산출물 누락 방지에 집중한다.",
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
    `sourceId: ${input.source.id}`,
    `sourceTitle: ${input.source.title}`,
    `sourceType: ${input.source.type}`,
    `chunk: ${input.chunkIndex + 1}/${input.totalChunks}`,
    "",
    "## Source Chunk",
    input.chunkText,
  ].join("\n");
}

function buildRequirementInventoryText(inventory: RequirementInventory): string {
  if (inventory.items.length === 0) return "(empty output inventory)";
  const deliverableText = inventory.deliverables.map((deliverable) => [
    `## ${deliverable.title} — ${deliverable.slotKey}`,
    deliverable.units.length
      ? deliverable.units.map((unit) => [
        `- ${unit.unitId}: ${unit.title}`,
        `  description: ${unit.description}`,
        `  sourceItems: ${unit.sourceItemIds.join(", ")}`,
        `  requiredFields: ${unit.requiredFields.join(", ")}`,
        `  exitCriteria: ${unit.exitCriteria.join(" | ")}`,
      ].join("\n")).join("\n")
      : "- (no units yet)",
  ].join("\n")).join("\n\n");
  const itemText = inventory.items.map((item) => [
    `- ${item.id} [${item.category}/${item.status}/confidence:${item.confidence}] ${item.title}`,
    `  targetDeliverables: ${item.targetDeliverables.join(", ")}`,
    `  description: ${item.description}`,
    `  sources: ${item.sourceRefs.map((ref) => `${ref.sourceTitle}: ${ref.evidenceExcerpt}`).join(" | ")}`,
  ].join("\n")).join("\n");
  return ["# Internal Coverage Index", deliverableText, "## Source-backed Items", itemText].join("\n\n");
}

// 분석 ①단계 프롬프트: PRD/계약 기준선(일정 제외). screens 생성 금지.
export function buildStandardPlanPrompt(input: {
  title?: string;
  sources: SourceMaterial[];
  productBuilderBlueprintId?: ProductBuilderBlueprintId;
  requirementInventory?: RequirementInventory | null;
}): string {
  const productBuilderBlueprint = productBuilderBlueprintContext(input.productBuilderBlueprintId ?? DEFAULT_PRODUCT_BUILDER_BLUEPRINT_ID);
  return [
    "COS Blueprint PRD/계약 산출물 분석을 수행해 JSON 객체 하나만 출력하라.",
    "관점: PM 에이전트가 Blueprint 플러그인을 이용해 PM 업무를 정형화하고, 순차 게이트를 통과하며 회사 표준 산출물을 만든다.",
    `제품 유형(Product Type): ${productBuilderBlueprint.label}`,
    `Product Builder 기준(Product Builder Basis): ${productBuilderBlueprint.productBuilderLabel}`,
    `제품 유형 설명(Product Type Description): ${productBuilderBlueprint.description}`,
    "목표: 내부/외부 기획 자료의 등록 source 본문과 내부 coverage index를 기준으로 제품 요구사항 문서(PRD, Product Requirements Document), 스키마 정의서(Schema Definition), REST API 정의서(REST API Definition)의 계약을 산출한다.",
    "공통 레이아웃 정의서(Common Layout Definition)는 별도 산출물로 만들지 않는다. 화면 구조, navigation, layout slot은 화면정의서(Screen Definition) 단계에서 페이지별로 작성한다.",
    "화면정의서(screens)는 이 단계에서 생성하지 않는다. 화면정의서는 PRD/계약 기준선 확정 후 별도 단계에서 생성한다.",
    "각 섹션 작성 지침:",
    "- overview: 프로젝트 배경과 목적을 3~5문장으로 서술한다.",
    "- goals: 측정 가능한 목표 3~6개의 문자열 배열.",
    "- scope: { inScope: string[], outOfScope: string[] }. 포함 범위와 제외 범위를 모두 명시한다(제외 범위 필수).",
    "- functionalRequirements: { title, description, priority: 'must'|'should'|'could' } 배열. 기능 코드는 만들지 말고, 기능명 중심으로 작성.",
    "  - source title, URL, fetch status, intakeWorkflow, notion_shared_page/노션공유페이지/file_upload 같은 수집 방식이나 메타데이터를 기능명으로 쓰지 않는다.",
    "- nonFunctionalRequirements: 성능/보안/가용성/운영 등 비기능 요구사항 문자열 배열.",
    "- schemas: 스키마 정의서의 원천 데이터. { code:'SCH-001', name, description, owner, fields:[{name,type,required,description,validation,example}], relations, acceptanceCriteria }.",
    "- apis: REST API 정의서의 원천 데이터. { code:'API-001', method, path, summary, actor, auth, input, output, schemas, errors:[{code,condition}], auditAction, acceptanceCriteria }.",
    "- architecture: 대상 시스템(구축 대상)의 아키텍쳐. 인프라와 기술 스택을 구체적으로 작성한다. shape: { overview, diagram, components:[{code:'ARC-CMP-001',name,layer,responsibility,techStack:[],dependsOn:[]}], techStack:[{area,choice,rationale}], infrastructure:[{code:'ARC-INF-001',name,category,detail,provider}], integrations:[], dataFlow:[] }.",
    "  - architecture.layer 값: 'frontend'|'backend'|'data'|'ai'|'integration'|'infra'.",
    "  - architecture.infrastructure.category 값: 'hosting'|'database'|'storage'|'cdn'|'queue'|'auth'|'observability'|'ci-cd'|'network'|'other'. 호스팅·DB·스토리지·CDN·CI/CD·관측성을 빠짐없이 다룬다.",
    "  - architecture.techStack: 프론트엔드/백엔드/DB/인증/배포/AI 등 영역별 채택 기술과 근거를 명시한다.",
    "  - architecture.diagram: mermaid 'flowchart TB' 소스를 코드펜스(``` ) 없이 본문 문자열로만 출력한다. 프론트엔드·API·데이터·AI 계층과 핵심 데이터 흐름을 표현한다.",
    "- risks: { code: 'RISK-001', description, mitigation } 배열.",
    "- assumptions: 작성 전제 문자열 배열.",
    "- functionalRequirements에는 관련 inventory item id를 sourceInventoryItemIds 배열로 연결한다.",
    "내부 coverage index에 있는 candidate/confirmed/unclear item은 out_of_scope나 duplicate가 아닌 한 해당 targetDeliverables 산출물에서 누락하지 않는다.",
    "특히 기획 자료 후반부나 긴 문서 마지막 chunk에서 나온 산출물 unit도 반드시 반영한다.",
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

export function buildBlueprintPmAgentPrdPrompt(input: {
  projectId: string;
  title?: string;
  sources: SourceMaterial[];
  productBuilderBlueprintId?: ProductBuilderBlueprintId;
  requirementInventory?: RequirementInventory | null;
}): string {
  const productBuilderBlueprint = productBuilderBlueprintContext(input.productBuilderBlueprintId ?? DEFAULT_PRODUCT_BUILDER_BLUEPRINT_ID);
  return [
    "Blueprint PM Agent 실행 요청이다.",
    "",
    "목표: 등록된 Source Material을 끝까지 읽고, PRD(Product Requirements Document)와 Product Builder 기준선/계약 초안을 작성한 뒤 최종 응답으로 `submit-blueprint-prd` payload JSON 객체 하나를 제출한다.",
    "",
    "## 실행 규칙",
    "",
    "1. 모든 Source Material 본문을 처음부터 끝까지 읽고 후반부 요구사항을 누락하지 않는다.",
    "2. 자료에 없는 요구사항은 confirmed로 만들지 않는다. 불명확하면 assumptions 또는 risks에 남긴다.",
    "3. Notion 공유 페이지, source_type, intakeWorkflow, fetch_status, URL, 파일명 같은 수집 메타데이터를 기능이나 요구사항으로 승격하지 않는다.",
    "4. 내부 처리 규칙이나 입력 제외 규칙을 PRD의 assumption/out-of-scope 문장으로 쓰지 않는다.",
    "5. `deliverable.standard_plan`은 만들지 않는다. PRD는 `deliverable.prd` 기준이고, 기능정의/스키마/API/아키텍처는 같은 standardPlan payload에서 도구가 Project document slot으로 분리 저장한다.",
    "6. 기능 정의서에는 project-builder-base 재사용 판정을 반영할 수 있도록 functionalRequirements 설명에 surface(admin/site/app/landing), reuse/customization/new-build 단서를 남긴다.",
    "7. 최종 응답은 유효한 JSON 객체 하나만 출력한다. 서론, 설명, 마크다운, 코드펜스, 일반 댓글 형식은 금지한다.",
    "",
    "## 제출 형식",
    "",
    "최종 응답 JSON은 아래 `submit-blueprint-prd` payload와 정확히 같은 shape이어야 한다. Builder worker가 이 run 결과를 회수해 Project document slot에 저장한다.",
    "- projectId: 아래 Project ID",
    "- requirementInventory: 선택. source-backed coverage index를 만들었다면 items/deliverables를 포함한다.",
    "- standardPlan: { projectTitle, overview, goals, scope:{inScope,outOfScope}, functionalRequirements, nonFunctionalRequirements, schemas, apis, layouts, architecture, risks, assumptions }",
    "",
    "standardPlan 최소 기준:",
    "- overview는 프로젝트 목적과 제품 범위를 실제 자료에 근거해 쓴다.",
    "- scope.inScope/outOfScope를 모두 채운다.",
    "- functionalRequirements는 최소 1개 이상이며, title/description이 수집 메타데이터가 아니라 제품 기능이어야 한다.",
    "- schemas/apis는 확정 가능한 범위만 작성하고, 미확정이면 assumptions/risks에 남긴다.",
    "- architecture는 대상 시스템의 frontend/backend/data/ai/integration/infra 관점과 hosting/database/storage/cdn/auth/observability/ci-cd를 다룬다.",
    "",
    `Project ID: ${input.projectId}`,
    `프로젝트 제목 힌트: ${input.title || "(자료에서 추론)"}`,
    `제품 유형(Product Type): ${productBuilderBlueprint.label}`,
    `Product Builder 기준(Product Builder Basis): ${productBuilderBlueprint.productBuilderLabel}`,
    `제품 유형 설명(Product Type Description): ${productBuilderBlueprint.description}`,
    "",
    "## Internal Coverage Index",
    input.requirementInventory ? buildRequirementInventoryText(input.requirementInventory) : "(not generated)",
    "",
    "## Source Material",
    buildSourceText(input.sources),
  ].join("\n");
}

// 분석 ②단계 프롬프트: 확정된 PRD/계약 기준선을 입력으로 화면정의서 전체 생성. (phase 2)
export function buildScreenPrompt(input: {
  standardPlan: StandardPlan;
  sources: SourceMaterial[];
  requirementInventory?: RequirementInventory | null;
}): string {
  const plan = input.standardPlan;
  const planContext = [
    `프로젝트: ${plan.projectTitle}`,
    `제품 유형: ${plan.productBuilderBlueprint?.label ?? "-"}`,
    `Product Builder 기준: ${plan.productBuilderBlueprint?.productBuilderLabel ?? "-"}`,
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
    "확정된 PRD 기준선과 그 하위 산출물(스키마 정의서, REST API 정의서)을 기준으로 화면정의서 전체를 생성해 JSON 객체 하나만 출력하라.",
    "공통 레이아웃 정의서(Common Layout Definition)는 별도 산출물로 만들지 않는다. 화면 구조, navigation, layout slot은 각 화면정의서 안에 페이지별로 포함한다.",
    "아래 '## 확정 산출물'에 스키마/REST API의 전체 계약 본문이 모두 포함되어 있다. 추가 자료를 요청하거나 도구(파일시스템/검색 등)를 호출하지 말고, 주어진 컨텍스트만으로 즉시 유효한 JSON 객체 하나만 출력하라.",
    "화면 1개는 ScreenDefinition 1개다. 직관적이고 명료해야 한다.",
    "내부 coverage index에서 deliverable.screen_definitions 대상으로 배치된 unit과 screen_candidate, actor_or_permission, admin_operation, payment, notification, upload_or_media, ai_runtime item을 화면 후보·상태·액션 검증에 반영한다.",
    "각 screen: code(SCR-001), name, description, layoutCode, layoutSlot, route, access, primaryTestId, schemas, apis, fields, states, actions, acceptanceCriteria.",
    "access는 'public'(비로그인 접근) | 'authenticated'(로그인 필요) | 'admin'(관리자 전용) 중 하나. /admin route는 admin.",
    "schemas/apis는 아래 확정 산출물의 코드만 참조한다(재정의 금지). layoutCode/layoutSlot은 화면정의서 안의 페이지 구조 식별자로 작성한다.",
    "states는 default/empty/loading/error/permission 상태를 포함하되, 화면에 해당 없는 상태는 그 이유를 짧게 적는다.",
    "액션은 ACT-01 형식 code와 화면코드 파생 testId(예: scr-001-act-01). 인수조건은 AC-01 형식.",
    "화면 이동 액션은 targetScreenCode에 대상 화면 코드를 넣는다.",
    "출력 JSON shape: { screens: ScreenDefinition[] }",
    "",
    "## PRD 기준선 컨텍스트",
    planContext,
    "",
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
  standardPlan: StandardPlan;
  sources: SourceMaterial[];
  screen: ScreenDefinition;
  feedback: string;
}): string {
  const plan = input.standardPlan;
  const planContext = [
    `프로젝트: ${plan.projectTitle}`,
    `개요: ${plan.overview}`,
    `스키마 코드: ${plan.schemas.map((s) => s.code).join(", ")}`,
    `API 코드: ${plan.apis.map((a) => a.code).join(", ")}`,
  ].join("\n");

  return [
    "아래 화면정의서 1개를 리뷰 피드백을 반영해 수정하고 JSON 객체 하나만 출력하라.",
    `화면 코드(code)는 '${input.screen.code}'로 유지한다.`,
    "schemas/apis는 확정된 스키마 정의서/REST API 정의서의 코드만 참조한다. layoutCode/layoutSlot은 화면정의서 안의 페이지 구조 식별자로 유지하거나 보정한다.",
    "access는 'public' | 'authenticated' | 'admin' 중 하나.",
    "states는 default/empty/loading/error/permission 상태를 포함하되, 화면에 해당 없는 상태는 그 이유를 짧게 적는다.",
    "액션은 ACT-01 형식 code와 화면코드 파생 testId, 인수조건은 AC-01 형식.",
    "출력 JSON shape: { screen: ScreenDefinition }",
    "",
    "## PRD 기준선 컨텍스트",
    planContext,
    "",
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
  return values.length ? values.map((value) => `- ${value}`).join("\n") : "- (없음)";
}

function table(headers: string[], rows: string[][]): string {
  const cell = (value: unknown): string =>
    String(value).replace(/\r?\n/g, "<br>").replace(/\|/g, "\\|");
  return [
    `| ${headers.map(cell).join(" |")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`),
  ].join("\n");
}

const PRIORITY_LABEL: Record<NonNullable<FunctionalRequirement["priority"]>, string> = {
  must: "필수",
  should: "권장",
  could: "선택",
};

type FeatureDocumentEntry = {
  requirement: FunctionalRequirement;
  path: string;
};

function featureDocumentEntries(plan: StandardPlan, projectId?: string | null): FeatureDocumentEntry[] {
  const used = new Map<string, number>();
  return plan.functionalRequirements.map((requirement) => {
    const base = fileSlug(requirement.title);
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    const slug = count === 1 ? base : `${base}-${count}`;
    return {
      requirement,
      path: `${featureDocDir(projectId)}/${slug}.md`,
    };
  });
}

function relatedFeatureTitles(plan: StandardPlan, requirementCodes: string[] | undefined): string {
  if (!requirementCodes?.length) return "-";
  const titleByCode = new Map(plan.functionalRequirements.map((fr) => [fr.code, fr.title]));
  const titles = requirementCodes
    .map((code) => titleByCode.get(code))
    .filter((title): title is string => Boolean(title));
  return [...new Set(titles)].join(", ") || "TBD";
}

function planWorkflow(_plan?: StandardPlan): PmWorkflowStep[] {
  return STANDARD_PM_WORKFLOW;
}

function renderPmExecutionProcedure(): string {
  const steps = planWorkflow();
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
      "PRD 기준선 확정 전에는 화면정의서를 생성하지 않는다.",
      "기능정의서는 project-builder-base를 기본 코드베이스로 전제하고 기능별 재사용 판정과 hard-copy 대상 surface를 남긴다.",
      "스키마 정의서와 REST API 정의서는 화면정의서보다 먼저 확정한다.",
      "화면정의서는 스키마/API를 재정의하지 않고 코드만 참조하며, layout/slot은 화면별로 문서 안에 포함한다.",
      "각 산출물은 Project document slot에 등록되는 회사 표준 문서로 취급한다.",
    ]),
  ].join("\n");
}

export function renderProductRequirementsDocument(plan: StandardPlan): string {
  const features = featureDocumentEntries(plan);
  return [
    `# 제품 요구사항 문서(PRD, Product Requirements Document) - ${plan.projectTitle}`,
    "",
    "이 문서는 실행력 높은 팀이 바로 만들고 검증하기 위해 문제, 사용자, 성공 기준, 범위, 요구사항, 검증 방법, 다음 액션을 정리하는 제품 요구사항 문서다.",
    "",
    "## 0. 작성 원칙(Writing Rules)",
    "",
    list([
      "입력 자료에 없는 내용은 만들지 않고 TBD로 남긴다.",
      "기능보다 문제와 성공 기준을 먼저 확정한다.",
      "V1에서 하지 않을 일을 반드시 적는다.",
      "모든 요구사항은 검증 가능한 문장으로 쓴다.",
      "결정이 필요한 항목은 오픈 이슈로 남긴다.",
    ]),
    "",
    "## 1. 결정 요약(Decision Summary)",
    "",
    table(
      ["항목(Item)", "내용(Description)"],
      [
        ["제품/기능(Product or Feature)", plan.projectTitle],
        ["한 줄 요약(One-line Summary)", plan.overview],
        ["작성자(Owner)", "PM Agent"],
        ["상태(Status)", plan.confirmedAt ? "Ready" : "Draft"],
        ["이번 결정(Main Decision)", "TBD"],
        ["다음 액션(Next Action)", "TBD"],
      ],
    ),
    "",
    "## 2. 문제 정의(Problem)",
    "",
    "### 2.1 해결할 문제(Problem to Solve)",
    "",
    "TBD - 등록된 자료에서 해결할 문제를 한 문장으로 구체화한다.",
    "",
    "### 2.2 왜 지금 해야 하는가(Why Now)",
    "",
    list(plan.assumptions.length ? plan.assumptions : ["TBD"]),
    "",
    "### 2.3 근거(Evidence)",
    "",
    table(
      ["구분(Type)", "근거(Evidence)", "출처(Source)"],
      [
        ["사용자(User)", "TBD", "Source Material"],
        ["데이터(Data)", "TBD", "Source Material"],
        ["운영/사업(Ops/Business)", "TBD", "Source Material"],
      ],
    ),
    "",
    "## 3. 사용자(User)",
    "",
    "### 3.1 대상 사용자(Target User)",
    "",
    table(
      ["사용자(User)", "상황(Context)", "핵심 니즈(Core Need)"],
      [["TBD", "등록된 자료에서 사용 상황을 확정한다.", "TBD"]],
    ),
    "",
    "### 3.2 대상이 아닌 사용자(Non-target User)",
    "",
    list(["TBD"]),
    "",
    "## 4. 성공 기준(Success)",
    "",
    "### 4.1 목표(Goal)",
    "",
    list(plan.goals),
    "",
    "### 4.2 성공 지표(Success Metrics)",
    "",
    table(
      ["코드(Code)", "지표(Metric)", "현재값(Baseline)", "목표값(Target)", "확인 방법(How to Measure)"],
      [["MET-001", "TBD", "TBD", "TBD", "TBD"]],
    ),
    "",
    "### 4.3 실패 기준(Failure Signals)",
    "",
    list(["TBD"]),
    "",
    "## 5. 범위(Scope)",
    "",
    "### 5.1 이번에 하는 것(In Scope)",
    "",
    table(
      ["코드(Code)", "항목(Item)", "이유(Why)"],
      plan.scope.inScope.map((item, index) => [`IN-${String(index + 1).padStart(3, "0")}`, item, "TBD"]),
    ),
    "",
    "### 5.2 이번에 하지 않는 것(Out of Scope)",
    "",
    table(
      ["코드(Code)", "항목(Item)", "제외 이유(Reason)"],
      plan.scope.outOfScope.map((item, index) => [`OUT-${String(index + 1).padStart(3, "0")}`, item, "TBD"]),
    ),
    "",
    "## 6. 사용자 흐름(User Flow)",
    "",
    "사용자가 목표를 달성하는 최소 흐름만 적는다.",
    "",
    list(["TBD"]),
    "",
    "## 7. 요구사항(Requirements)",
    "",
    "### 7.1 기능 요구사항(Functional Requirements)",
    "",
    table(
      ["기능(Feature)", "우선순위(Priority)", "상세 문서(Feature Definition)", "검증 방법(Verification)"],
      features.map(({ requirement, path }) => [
        requirement.title,
        requirement.priority ? PRIORITY_LABEL[requirement.priority] : "-",
        path,
        requirement.description,
      ]),
    ),
    "",
    "### 7.2 비기능 요구사항(Non-functional Requirements)",
    "",
    list(plan.nonFunctionalRequirements),
    "",
    "## 8. 인수 기준(Acceptance Criteria)",
    "",
    table(
      ["코드(Code)", "기준(Criteria)", "관련 요구사항(Related Requirement)"],
      plan.functionalRequirements.map((fr, index) => [
        `AC-${String(index + 1).padStart(3, "0")}`,
        `${fr.title} 요구사항이 검증 가능한 방식으로 동작한다.`,
        fr.title,
      ]),
    ),
    "",
    "## 9. 데이터/기술 고려사항(Data & Technical Notes)",
    "",
    "상세 설계가 아니라 PRD 작성 시점에 이미 아는 제약만 적는다.",
    "",
    table(
      ["항목(Item)", "내용(Description)"],
      [
        ["필요한 데이터(Required Data)", plan.schemas.map((schema) => schema.name).join(", ") || "TBD"],
        ["외부 연동(Integration)", "TBD"],
        ["권한/인증(Auth)", "TBD"],
        ["추적/로그(Tracking/Logging)", "TBD"],
      ],
    ),
    "",
    "## 10. 출시 및 검증(Release & Validation)",
    "",
    table(
      ["항목(Item)", "내용(Description)"],
      [
        ["출시 방식(Release Type)", "TBD"],
        ["첫 검증 대상(First Validation Audience)", "TBD"],
        ["출시 전 확인(Pre-release Check)", "TBD"],
        ["롤백 기준(Rollback Criteria)", "TBD"],
      ],
    ),
    "",
    "## 11. 리스크와 오픈 이슈(Risks & Open Questions)",
    "",
    "### 11.1 리스크(Risks)",
    "",
    table(
      ["코드(Code)", "리스크(Risk)", "대응(Mitigation)"],
      plan.risks.map((risk) => [risk.code, risk.description, risk.mitigation]),
    ),
    "",
    "### 11.2 오픈 이슈(Open Questions)",
    "",
    table(
      ["코드(Code)", "질문(Question)", "결정 필요 시점(Needed By)", "담당(Owner)"],
      [["Q-001", "TBD", "TBD", "PM"]],
    ),
    "",
    "## 12. 실행 체크리스트(Execution Checklist)",
    "",
    table(
      ["코드(Code)", "기준(Criteria)"],
      [
        ["PRD-AC-01", "해결할 문제가 한 문장으로 명확하다."],
        ["PRD-AC-02", "대상 사용자와 제외 대상이 분리되어 있다."],
        ["PRD-AC-03", "성공 지표와 실패 신호가 있다."],
        ["PRD-AC-04", "모든 Must 요구사항에 검증 방법이 있다."],
        ["PRD-AC-05", "다음 액션이 명확하다."],
      ],
    ),
  ].join("\n");
}

export function renderFeatureDefinitionIndex(plan: StandardPlan): string {
  const features = featureDocumentEntries(plan);
  return [
    `# 기능정의서(Feature Definition) - 목록(Index) - ${plan.projectTitle}`,
    "",
    "이 페이지는 기능정의서 산출물 안의 목록 페이지다. PRD의 기능 요구사항을 기능별 상세 문서로 분리하고, 기능명, Project slot 문서 참조, project-builder-base 재사용 판정으로 추적한다.",
    "",
    table(
      ["기능(Feature)", "우선순위(Priority)", "상세 문서 참조(Feature Definition Reference)", "Base 재사용 판정(Base Reuse Decision)", "요약(Summary)"],
      features.map(({ requirement, path }) => [
        requirement.title,
        requirement.priority ? PRIORITY_LABEL[requirement.priority] : "-",
        path,
        "TBD - 전체 재사용/부분 재사용/커스터마이징/신규/N/A",
        requirement.description,
      ]),
    ),
  ].join("\n");
}

export function renderFeatureDefinition(plan: StandardPlan, requirement: FunctionalRequirement): string {
  return [
    `# 기능 정의서(Feature Definition) - ${requirement.title}`,
    "",
    "이 문서는 기능 1개를 실제 구현/검증 가능한 단위로 정리한 문서다. 기능 코드는 사용하지 않는다.",
    "",
    "## 1. 요약(Summary)",
    "",
    table(
      ["항목(Item)", "내용(Description)"],
      [
        ["프로젝트(Project)", plan.projectTitle],
        ["기능(Feature)", requirement.title],
        ["우선순위(Priority)", requirement.priority ? PRIORITY_LABEL[requirement.priority] : "-"],
        ["목적(Purpose)", requirement.description],
      ],
    ),
    "",
    "## 2. project-builder-base 재사용 계획(Project Builder Base Reuse Plan)",
    "",
    "프로젝트 구조 세팅은 project-builder-base를 hard-copy해서 시작한다. 이 기능은 admin/site/app/landing 등 대상 surface와 기존 feature 재사용 범위를 먼저 판정한 뒤 구현한다.",
    "",
    table(
      ["항목(Item)", "내용(Description)"],
      [
        ["대상 surface(Target Surface)", "TBD - admin/site/app/landing 중 목적에 맞게 선택"],
        ["재사용 판정(Reuse Decision)", "TBD - 전체 재사용/부분 재사용/커스터마이징/신규/N/A"],
        ["재사용 후보(Base Feature Reference)", "TBD - project-builder-base의 feature/package/module 경로"],
        ["hard-copy 범위(Hard-copy Scope)", "TBD - 통째 구조 세팅이 아니라 필요한 surface/module 범위"],
        ["커스터마이징 범위(Customization Scope)", "TBD - UI, schema, API, permission, workflow, QA 중 변경 지점"],
        ["신규 구현 사유(New Build Reason)", "TBD - 재사용하지 못하는 경우에만 작성"],
      ],
    ),
    "",
    "## 3. 사용자와 조건(User & Conditions)",
    "",
    table(
      ["항목(Item)", "내용(Description)"],
      [
        ["사용자(User)", "TBD"],
        ["진입 조건(Preconditions)", "TBD"],
        ["완료 조건(Done Condition)", "TBD"],
      ],
    ),
    "",
    "## 4. 주요 흐름(Main Flow)",
    "",
    list(["TBD"]),
    "",
    "## 5. 예외 흐름(Exception Flow)",
    "",
    list(["TBD"]),
    "",
    "## 6. 입력/출력(Input/Output)",
    "",
    table(
      ["구분(Type)", "내용(Description)"],
      [
        ["입력(Input)", "TBD"],
        ["출력(Output)", "TBD"],
      ],
    ),
    "",
    "## 7. 참조 산출물(References)",
    "",
    table(
      ["산출물(Output)", "참조 방식(Reference Rule)"],
      [
        ["project-builder-base", "재사용 후보 feature/module/surface 경로와 커스터마이징 범위를 연결한다."],
        ["스키마 정의서(Schema Definition)", "`schema-definition.md`에서 필요한 스키마를 확인한다."],
        ["REST API 정의서(REST API Definition)", "`api-definition.md`에서 필요한 API를 확인한다."],
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
    list(["TBD"]),
  ].join("\n");
}

export function renderSchemaDefinition(plan: StandardPlan): string {
  return [
    `# 스키마 정의서(Schema Definition) - ${plan.projectTitle}`,
    "",
    "이 문서는 PM 에이전트가 PRD에서 확정한 데이터 구조를 개발/QA가 검수 가능한 기준으로 분리한 회사 표준 산출물이다.",
    "",
    "## 1. 스키마 목차(Schema Index)",
    "",
    table(
      ["코드(Code)", "이름(Name)", "소유자(Owner)", "설명(Description)", "관련 기능(Related Features)"],
      plan.schemas.map((schema) => [
        schema.code,
        schema.name,
        schema.owner ?? "-",
        schema.description,
        relatedFeatureTitles(plan, schema.sourceRequirementCodes),
      ]),
    ),
    "",
    ...plan.schemas.flatMap((schema) => [
      `## ${schema.code} ${schema.name}`,
      "",
      table(
        ["항목(Item)", "내용(Description)"],
        [
          ["설명(Description)", schema.description],
          ["소유자(Owner)", schema.owner ?? "-"],
          ["관련 기능(Related Features)", relatedFeatureTitles(plan, schema.sourceRequirementCodes)],
        ],
      ),
      "",
      "### 필드(Fields)",
      "",
      table(
        ["필드(Field)", "타입(Type)", "필수(Required)", "설명(Description)", "검증(Validation)", "예시(Example)"],
        schema.fields.map((item) => [
          item.name,
          item.type,
          item.required ? "Y" : "N",
          item.description,
          item.validation ?? "-",
          item.example ?? "-",
        ]),
      ),
      "",
      "### 관계(Relations)",
      "",
      list(schema.relations ?? []),
      "",
      "### 인수 기준(Acceptance Criteria)",
      "",
      list(schema.acceptanceCriteria ?? []),
      "",
    ]),
  ].join("\n");
}

export function renderApiDefinition(plan: StandardPlan): string {
  return [
    `# REST API 정의서(REST API Definition) - ${plan.projectTitle}`,
    "",
    "이 문서는 PM 에이전트가 PRD에서 확정한 REST API 계약을 화면정의서, 개발, QA가 같은 기준으로 참조하도록 분리한 회사 표준 산출물이다.",
    "",
    "## 1. API 목차(API Index)",
    "",
    table(
      ["코드(Code)", "행위자(Actor)", "메서드(Method)", "경로(Path)", "설명(Description)", "스키마(Schema)"],
      plan.apis.map((api) => [
        api.code,
        api.actor ?? "-",
        api.method,
        api.path,
        api.summary,
        api.schemas.join(", "),
      ]),
    ),
    "",
    ...plan.apis.flatMap((api) => [
      `## ${api.code} ${api.method} ${api.path}`,
      "",
      table(
        ["항목(Item)", "내용(Description)"],
        [
          ["설명(Description)", api.summary],
          ["행위자(Actor)", api.actor ?? "-"],
          ["인증(Auth)", api.auth ?? "-"],
          ["감사 액션(Audit Action)", api.auditAction ?? "-"],
          ["참조 스키마(Referenced Schema)", api.schemas.join(", ") || "-"],
        ],
      ),
      "",
      "### 요청(Request)",
      "",
      table(
        ["이름(Name)", "타입(Type)", "필수(Required)", "설명(Description)"],
        api.input.map((item) => [item.name, item.type, item.required ? "Y" : "N", item.description]),
      ),
      "",
      "### 응답(Response)",
      "",
      table(
        ["이름(Name)", "타입(Type)", "필수(Required)", "설명(Description)"],
        api.output.map((item) => [item.name, item.type, item.required ? "Y" : "N", item.description]),
      ),
      "",
      "### 오류(Errors)",
      "",
      table(
        ["코드(Code)", "조건(Condition)"],
        (api.errors ?? []).map((item) => [item.code, item.condition]),
      ),
      "",
      "### 인수 기준(Acceptance Criteria)",
      "",
      list(api.acceptanceCriteria ?? []),
      "",
    ]),
  ].join("\n");
}

export function renderScreenDefinition(screen: ScreenDefinition, projectTitle: string): string {
  return [
    `# 화면정의서(Screen Definition) - ${screen.code} ${screen.name}`,
    "",
    "## 1. 기본 정보(Basic Information)",
    "",
    table(
      ["항목(Item)", "내용(Description)"],
      [
        ["프로젝트(Project)", projectTitle],
        ["화면 코드(Screen Code)", screen.code],
        ["화면명(Screen Name)", screen.name],
        ["화면 설명(Screen Description)", screen.description],
        ["경로(Route)", screen.route],
        ["인증/권한(Auth/Permission)", SCREEN_ACCESS_LABEL[screen.access] ?? screen.access],
        ["Layout", `${screen.layoutCode} / ${screen.layoutSlot}`],
        ["Primary test-id", screen.primaryTestId],
      ],
    ),
    "",
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
      [["TBD", "자료에서 확인되지 않은 화면 세부 정책", "PM Agent"]],
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

export function renderWritingRules(): string {
  return [
    "# 화면정의서 작성 룰(Screen Definition Writing Rules)",
    "",
    "1. 화면 1개는 화면정의서 1개로 작성한다.",
    "2. 화면 코드는 `{AREA}-SCR-{NNN}` 형식을 사용한다.",
    "3. 공통 레이아웃은 별도 문서로 분리하지 않는다. 화면정의서는 페이지별 `layoutCode`와 `layoutSlot`을 자체 포함한다.",
    "4. 사용자 동작은 `ACT-01`부터 순번으로 작성한다.",
    "5. 화면 상태는 default/empty/loading/error/permission 기준으로 적는다.",
    "6. 인수 기준은 `AC-01`부터 순번으로 작성한다.",
    "7. `data-testid`는 화면코드와 action/ac code에서 파생한다. 예: `scr-001-act-01`, `scr-001-ac-01`.",
    "8. 화면 이동 액션은 대상 화면코드(`targetScreenCode`)를 반드시 적는다.",
    "9. 화면에서 쓰는 스키마/API는 선행 산출물의 code만 참조하고, layout/slot은 화면정의서에서 페이지별로 정의한다.",
    "10. 예외/빈 상태/권한 오류처럼 QA가 확인해야 하는 상태는 인수 기준에 적는다.",
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
  if (relativePath === "product-requirements-document.md") return "deliverable.prd";
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

// 업로드/입력 자료를 프로젝트 문서로 기록하기 위한 Markdown. 본문 원문은 그대로 보존한다.
export function renderSourceDocument(source: SourceMaterial): string {
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
function renderArchitectureDefinition(plan: StandardPlan): string {
  const a = plan.architecture;
  return [
    `# 아키텍쳐 정의서(Architecture Definition) - ${plan.projectTitle}`,
    "",
    a.overview,
    "",
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
        ["코드(Code)", "구성요소(Component)", "분류(Category)", "제공자(Provider)", "상세(Detail)"],
        a.infrastructure.map((n) => [n.code, n.name, INFRASTRUCTURE_CATEGORY_LABEL[n.category] ?? n.category, n.provider ?? "-", n.detail]),
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

// 분석 ①단계 프로젝트별 문서: PRD + 기능/스키마/API/아키텍처 정의.
export function renderStandardPlanDocuments(
  plan: StandardPlan,
  _requirementInventory?: RequirementInventory | null,
  _sources: SourceMaterial[] = [],
  projectId?: string | null,
): Record<string, string> {
  const blueprintDir = blueprintTransformDir(projectId);
  const docs: Record<string, string> = {
    [`${blueprintDir}/product-requirements-document.md`]: renderProductRequirementsDocument(plan),
    [`${blueprintDir}/feature-definition.md`]: renderFeatureDefinitionIndex(plan),
    [`${blueprintDir}/schema-definition.md`]: renderSchemaDefinition(plan),
    [`${blueprintDir}/api-definition.md`]: renderApiDefinition(plan),
    [`${blueprintDir}/architecture-definition.md`]: renderArchitectureDefinition(plan),
  };
  for (const { requirement, path } of featureDocumentEntries(plan, projectId)) {
    docs[path] = renderFeatureDefinition(plan, requirement);
  }
  return docs;
}

// 분석 ②단계 프로젝트별 문서: 화면정의서 전체.
export function renderScreenDocuments(screenPlan: ScreenPlan, projectTitle: string, projectId?: string | null): Record<string, string> {
  const docs: Record<string, string> = {};
  const screenDir = `${blueprintTransformDir(projectId)}/screens`;

  for (const screen of screenPlan.screens) {
    const codeSlug = sanitizeCodePart(screen.code);
    const slug = sanitizeCodePart(screen.name);
    let key = `${screenDir}/${codeSlug}-${slug}.md`;
    // screen.code/name이 중복되거나 sanitize 후 충돌하면 문서가 조용히 덮어써지므로 접미사로 1:1 보장.
    if (docs[key]) {
      let suffix = 2;
      while (docs[`${screenDir}/${codeSlug}-${slug}-${suffix}.md`]) suffix += 1;
      key = `${screenDir}/${codeSlug}-${slug}-${suffix}.md`;
    }
    docs[key] = renderScreenDefinition(screen, projectTitle);
  }

  return docs;
}

// ────────────────────────────────────────────────────────────────────────────
// Wiki 등재 (plugin-llm-wiki 연동)
//
// 산출물(PRD/계약 ① / 화면정의서 ②)을 프로젝트 단위 wiki space에 페이지로 등재한다.
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

// 등재할 wiki 페이지 목록을 만든다. standardPlan(①)·screenPlan(②) 중 존재하는 것만 포함.
// 산출 markdown은 기존 렌더러를 재사용하므로 디스크 기록물과 1:1 동일하다.
export function buildWikiPages(
  standardPlan: StandardPlan | null,
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
  if (standardPlan || screenPlan) add(renderBlueprintStandardDocuments(projectId));
  if (standardPlan) add(renderStandardPlanDocuments(standardPlan, requirementInventory, sources, projectId));
  if (screenPlan) add(renderScreenDocuments(screenPlan, projectTitle, projectId));
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
  //    PRD·스키마·API·아키텍처·화면정의서는 휘발성 state가 아니라 project_documents slot에 영속되므로
  //    slot을 source-of-truth로 쓴다. "문서 하나당 한 덩어리" 입도: slot 1개 = 노드 1개.
  //    등록 자료(source)는 source 노드가 대표하고, 분석 산출물만 deliverable 노드로 둔다.
  const DELIVERABLE_NODE_LABELS: Record<string, string> = {
    "deliverable.prd": "PRD",
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

  // 4) flows-to 파이프라인 엣지: 자료 → PRD → {기능·스키마·API·아키텍처} → 화면정의서.
  const flowEdgeIds = new Set<string>();
  const addFlow = (from: string, to: string) => {
    const id = `flow:${from}:${to}`;
    if (flowEdgeIds.has(id)) return;
    flowEdgeIds.add(id);
    edges.push({ id, from, to, type: "flows-to", origin: "derived" });
  };
  // 등록 자료 → PRD (PRD가 있을 때만). 자료정리본 노드가 없으므로 자료가 PRD로 직결.
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

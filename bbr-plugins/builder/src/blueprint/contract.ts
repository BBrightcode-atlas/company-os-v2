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
  setProductBuilderBlueprint: "set-product-builder-blueprint",
  // 분석 단계 ①: 표준 기획서
  runStandardPlan: "run-standard-plan",
  confirmStandardPlan: "confirm-standard-plan",
  writeStandardPlanDocs: "write-standard-plan-docs",
  // 분석 단계 ②: 화면정의서 (확정 게이트 통과 후)
  runScreens: "run-screens",
  writeScreenDocs: "write-screen-docs",
  // 화면정의서 리뷰
  reviewScreen: "review-screen",
  regenerateScreen: "regenerate-screen",
  // 플러그인 전용 PM 에이전트(Managed Agent)
  reconcileManagedAgent: "reconcile-managed-agent",
  resetManagedAgent: "reset-managed-agent",
  reconcileManagedResources: "reconcile-managed-resources",
  resetManagedResources: "reset-managed-resources",
  runManagedRoutine: "run-managed-routine",
  // 보관한 원본 바이너리 다운로드(파일 → base64)
  readSourceOriginal: "read-source-original",
  reset: "reset",
} as const;

export const SOURCE_TYPES = ["internal-plan", "external-plan", "meeting-note", "reference", "other"] as const;

export type SourceType = typeof SOURCE_TYPES[number];

// 업로드 파일에서 추출한 원본 포맷. text = 직접 입력, url = URL 기반 입력.
export const SOURCE_FORMATS = ["text", "url", "txt", "md", "docx", "pptx", "pdf", "xlsx"] as const;
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

// Project document slot metadata에 남기는 논리적 문서 ref prefix. workspace write 경로가 아니다.
export const SOURCE_DOC_DIR = "docs/cos-blueprint/sources";

// Legacy state download compatibility only. 새 등록 플로우는 원본 바이너리를 workspace에 쓰지 않는다.
export const SOURCE_ORIGINAL_DIR = "docs/cos-blueprint/sources/originals";

// 기능 정의서(Feature Definition)는 기능 코드 없이 기능명 기반 slug로 분리한다.
export const FEATURE_DOC_DIR = "docs/cos-blueprint/features";
export const FEATURE_DEFINITION_INDEX_DOC = "docs/cos-blueprint/feature-definition.md";

// 프로젝트마다 바뀌지 않는 Blueprint 기준 문서를 보관하는 디렉터리.
export const BLUEPRINT_STANDARD_DOC_DIR = "docs/cos-blueprint/_standards";
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
  "deliverable.standard_plan",
  "deliverable.prd",
  "deliverable.feature_index",
  "deliverable.feature_files",
  "deliverable.schema_definition",
  "deliverable.api_definition",
  "deliverable.interface_definition",
  "deliverable.layout_definition",
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
    slotKey: "deliverable.standard_plan",
    group: "deliverable",
    title: "표준 기획서(Standard Plan)",
    required: true,
    contentType: "text/markdown",
    templatePath: "bbr-plugins/builder/templates/deliverables/standard-plan.md",
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
    slotKey: "deliverable.feature_index",
    group: "deliverable",
    title: "기능 정의서 목록(Feature Definition Index)",
    required: true,
    contentType: "text/markdown",
    templatePath: "bbr-plugins/builder/templates/deliverables/feature-definition-index.md",
    producer: "Blueprint",
  },
  {
    slotKey: "deliverable.feature_files",
    group: "deliverable",
    title: "기능별 기능 정의서(Feature Definitions)",
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
    slotKey: "deliverable.interface_definition",
    group: "deliverable",
    title: "인터페이스 정의서(Interface Definition)",
    required: true,
    contentType: "text/markdown",
    templatePath: "bbr-plugins/builder/templates/deliverables/interface-definition.md",
    producer: "Blueprint",
  },
  {
    slotKey: "deliverable.layout_definition",
    group: "deliverable",
    title: "공통 레이아웃 정의서(Common Layout Definition)",
    required: true,
    contentType: "text/markdown",
    templatePath: "bbr-plugins/builder/templates/deliverables/layout-definition.md",
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
    name: "표준 기획 기준선 확정",
    purpose: "목표, 범위, 요구사항, 리스크, 전제를 회사 표준 기획서로 고정한다.",
    inputDocuments: ["등록 자료"],
    outputDocuments: [
      "deliverable.standard_plan",
      "deliverable.prd",
    ],
    exitCriteria: ["포함/제외 범위가 모두 명시됨", "기능 요구사항이 기능 정의서 slot으로 추적 가능함"],
    owner: "PM Agent",
  },
  {
    code: "PM-STEP-03",
    name: "스키마/API 계약 분리",
    purpose: "개발과 QA가 참조할 데이터 스키마 정의서와 REST API 정의서를 표준 산출물로 분리한다.",
    inputDocuments: ["표준 기획서", "제품 요구사항 문서(PRD)"],
    outputDocuments: [
      "deliverable.schema_definition",
      "deliverable.api_definition",
      "deliverable.interface_definition",
    ],
    exitCriteria: ["모든 스키마와 API가 코드로 식별됨", "API가 참조하는 스키마 코드가 존재함"],
    owner: "PM Agent",
  },
  {
    code: "PM-STEP-04",
    name: "화면정의서 생성 게이트",
    purpose: "확정된 표준 기획/스키마/API/레이아웃 계약을 기준으로 화면정의서를 생성한다.",
    inputDocuments: ["확정된 표준 기획서", "스키마 정의서", "REST API 정의서", "공통 레이아웃 정의서"],
    outputDocuments: ["deliverable.screen_definitions"],
    exitCriteria: ["표준 기획서가 confirmed 상태임", "각 화면이 schema/api/layout 코드를 재정의 없이 참조함"],
    owner: "PM Agent",
  },
];

// 분석 ①단계 산출물: 표준 기획서 (일정/마일스톤 제외).
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
  kind: "standard-plan" | "screens" | "screen";
  stage?: "standard-plan" | "screens" | "screen";
  status: "running" | "error";
  projectId?: string | null;
  screenCode?: string;
  message?: string;
  startedAt: string;
};

export type CosBlueprintState = {
  sources: SourceMaterial[];
  productBuilderBlueprintId: ProductBuilderBlueprintId;
  productBuilderBlueprintSelectedAt: string | null;
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

// 보관한 원본 바이너리 다운로드 응답. dataBase64는 호스트 JSON 한도 안에서 전달.
export type SourceOriginalDownload = {
  ok: boolean;
  fileName: string | null;
  contentType: string | null;
  dataBase64: string | null;
  message: string;
};

export function emptyState(): CosBlueprintState {
  return {
    sources: [],
    productBuilderBlueprintId: DEFAULT_PRODUCT_BUILDER_BLUEPRINT_ID,
    productBuilderBlueprintSelectedAt: null,
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

export function sanitizeCodePart(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "item";
}

function field(name: string, type: string, required: boolean, description: string): SchemaField {
  return { name, type, required, description };
}

function param(name: string, type: string, required: boolean, description: string): ApiParameter {
  return { name, type, required, description };
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

export function buildFallbackStandardPlan(input: {
  title?: string;
  sources: SourceMaterial[];
  productBuilderBlueprintId?: ProductBuilderBlueprintId;
  now?: string;
  model?: string;
}): StandardPlan {
  const projectTitle = input.title?.trim()
    || input.sources[0]?.title?.trim()
    || "COS 분석 프로젝트";
  const text = input.sources.map((source) => `${source.title}\n${source.body}`).join("\n\n");
  const hasAdmin = /관리자|admin/i.test(text);
  const hasUpload = /파일|첨부|업로드|upload/i.test(text);
  const generatedAt = input.now ?? new Date().toISOString();
  const productBuilderBlueprint = productBuilderBlueprintContext(input.productBuilderBlueprintId ?? DEFAULT_PRODUCT_BUILDER_BLUEPRINT_ID);

  const schemas: SchemaDefinition[] = [
    {
      code: "SCH-001",
      name: "ProjectBrief",
      description: "등록된 내부/외부 기획 자료를 정규화한 프로젝트 요구사항 요약.",
      owner: "PM Agent",
      sourceRequirementCodes: ["FR-001", "FR-002"],
      fields: [
        { ...field("id", "uuid", true, "프로젝트 브리프 식별자"), validation: "UUID 형식", example: "4d6f..." },
        { ...field("title", "string", true, "프로젝트명"), validation: "1자 이상", example: projectTitle },
        { ...field("summary", "string", true, "핵심 요구사항 요약"), validation: "비어 있지 않음", example: "기획 자료 분석 프로젝트" },
        { ...field("status", "planned | analyzing | approved", true, "브리프 상태"), validation: "허용 enum", example: "planned" },
      ],
      relations: ["ProjectBrief 1개는 여러 SourceMaterial과 ScreenSpec의 기준선이 된다."],
      acceptanceCriteria: ["브리프는 프로젝트명, 요약, 상태를 반드시 가진다.", "상태 값은 정의된 enum만 허용한다."],
    },
    {
      code: "SCH-002",
      name: "ScreenSpec",
      description: "화면정의서 생성을 위한 화면 단위 메타데이터.",
      owner: "PM Agent",
      sourceRequirementCodes: ["FR-003"],
      fields: [
        { ...field("screenCode", "string", true, "화면 코드"), validation: "{AREA}-SCR-{NNN}", example: "COS-SCR-001" },
        { ...field("screenName", "string", true, "화면명"), validation: "1자 이상", example: "기획 자료 등록" },
        { ...field("layoutCode", "string", true, "사용 레이아웃 코드"), validation: "{AREA}-LAY-{NNN}", example: "COS-LAY-001" },
        { ...field("testId", "string", true, "E2E/QA 기준 primary test id"), validation: "소문자 kebab-case", example: "cos-scr-001" },
      ],
      relations: ["ScreenSpec는 LayoutDefinition을 layoutCode로 참조한다."],
      acceptanceCriteria: ["화면 코드는 중복될 수 없다.", "화면은 정의된 layoutCode만 참조한다."],
    },
  ];

  if (hasUpload) {
    schemas.push({
      code: "SCH-003",
      name: "Attachment",
      description: "기획 자료 또는 산출물에 연결되는 파일 메타데이터.",
      owner: "PM Agent",
      sourceRequirementCodes: ["FR-004"],
      fields: [
        { ...field("id", "uuid", true, "파일 식별자"), validation: "UUID 형식", example: "7f2a..." },
        { ...field("fileName", "string", true, "원본 파일명"), validation: "확장자 포함", example: "proposal.docx" },
        { ...field("mimeType", "string", true, "MIME 타입"), validation: "IANA MIME", example: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
        { ...field("documentRef", "string", true, "Project source slot 문서 참조"), validation: "source slot metadata documentRefs 항목", example: "docs/cos-blueprint/sources/proposal-7f2a.md" },
      ],
      relations: ["Attachment는 SourceMaterial 또는 WorkProduct에 연결된다."],
      acceptanceCriteria: ["원본 파일명과 Project source slot documentRef가 모두 추적 가능해야 한다."],
    });
  }

  const apis: ApiDefinition[] = [
    {
      code: "API-001",
      method: "POST",
      path: "/api/project-briefs",
      summary: "기획 자료 등록",
      input: [
        param("title", "string", true, "자료 제목"),
        param("sourceType", "internal | external | reference", true, "자료 유형"),
        param("body", "string", true, "자료 본문"),
      ],
      output: [
        param("id", "uuid", true, "생성된 브리프 ID"),
        param("status", "string", true, "생성 상태"),
      ],
      schemas: ["SCH-001"],
      actor: "authenticated",
      auth: "board session",
      errors: [
        { code: "400", condition: "필수 입력 누락 또는 본문 파싱 실패" },
        { code: "403", condition: "BBR 회사가 아닌 경우" },
      ],
      auditAction: "cos_blueprint.source_registered",
      acceptanceCriteria: ["자료 등록 후 source 목록에 즉시 표시된다.", "프로젝트 선택 시 Project source slot에 문서가 등록된다."],
    },
    {
      code: "API-002",
      method: "POST",
      path: "/api/project-briefs/{id}/standard-plan",
      summary: "표준 기획서 생성",
      input: [param("id", "uuid", true, "브리프 ID")],
      output: [
        param("schemas", "SchemaDefinition[]", true, "스키마 정의 목록"),
        param("apis", "ApiDefinition[]", true, "API 인터페이스 정의 목록"),
        param("layouts", "LayoutDefinition[]", true, "공통 레이아웃 목록"),
      ],
      schemas: ["SCH-001", "SCH-002"],
      actor: "authenticated",
      auth: "board session",
      errors: [
        { code: "400", condition: "등록 자료가 없음" },
        { code: "500", condition: "LLM 게이트웨이 실패. fallback 산출 가능" },
      ],
      auditAction: "cos_blueprint.standard_plan_generated",
      acceptanceCriteria: ["표준 기획서는 schema/api/layout 코드를 포함한다.", "생성 시 기존 화면정의서는 stale 처리된다."],
    },
    {
      code: "API-003",
      method: "GET",
      path: "/api/project-briefs/{id}/screens",
      summary: "화면정의서 목록 조회",
      input: [param("id", "uuid", true, "브리프 ID")],
      output: [param("screens", "ScreenSpec[]", true, "화면 목록")],
      schemas: ["SCH-002"],
      actor: "authenticated",
      auth: "board session",
      errors: [
        { code: "409", condition: "표준 기획서가 확정되지 않음" },
      ],
      auditAction: "cos_blueprint.screens_listed",
      acceptanceCriteria: ["확정된 표준 기획서 기준으로 생성된 화면만 반환한다."],
    },
  ];

  const layouts: LayoutDefinition[] = [
    {
      code: "COS-LAY-001",
      name: "Workspace Layout",
      description: "좌측 자료/단계 탐색, 중앙 작업 영역, 우측 산출물 요약을 배치하는 표준 업무형 레이아웃.",
      slots: [
        { code: "SLOT-NAV", name: "탐색", purpose: "단계, 자료, 산출물 목차 탐색" },
        { code: "SLOT-MAIN", name: "본문", purpose: "현재 화면의 주요 입력과 결과 확인" },
        { code: "SLOT-ASIDE", name: "요약", purpose: "상태, 다음 액션, 참조 코드 표시" },
      ],
    },
  ];

  const functionalRequirements: FunctionalRequirement[] = [
    { code: "FR-001", title: "기획 자료 등록", description: "내부/외부 기획 자료를 업로드·입력으로 등록한다.", priority: "must" },
    { code: "FR-002", title: "표준 기획서 생성", description: "등록 자료에서 목표/범위/요구사항/DB·API 개요를 도출한다.", priority: "must" },
    { code: "FR-003", title: "화면정의서 생성", description: "확정된 표준 기획서를 기준으로 화면별 정의서를 생성한다.", priority: "must" },
  ];
  if (hasUpload) {
    functionalRequirements.push({ code: "FR-004", title: "첨부 파일 처리", description: "문서 파일을 업로드·파싱해 자료 본문으로 적재한다.", priority: "should" });
  }
  if (hasAdmin) {
    functionalRequirements.push({ code: "FR-005", title: "관리자 검수", description: "관리자가 산출물의 누락 여부를 검수·승인한다.", priority: "should" });
  }

  return {
    projectTitle,
    overview: `${projectTitle}의 내부/외부 기획 자료를 분석해 표준 기획서를 도출한다. 목표·범위·기능 요구사항과 DB 스키마·API·공통 레이아웃 개요를 정의해 화면정의서 생성의 기준선을 만든다.`,
    goals: [
      "기획 자료에서 프로젝트 목표와 범위를 명확히 한다.",
      "DB 스키마와 API 인터페이스 개요를 확정한다.",
      "화면정의서 생성에 필요한 공통 레이아웃을 정의한다.",
    ],
    scope: {
      inScope: [
        "내부/외부 기획 자료 등록 및 분석",
        "표준 기획서(목표/범위/요구사항/DB·API/레이아웃) 산출",
        "화면정의서 생성 기준선 확정",
      ],
      outOfScope: [
        "실제 기능 구현 및 배포",
        "외부 시스템 연동 상세 설계",
      ],
    },
    functionalRequirements,
    nonFunctionalRequirements: [
      "산출물은 Markdown 문서로 프로젝트 워크스페이스에 기록한다.",
      "화면 코드/test-id는 E2E·QA 추적이 가능하도록 규칙을 따른다.",
      "BBR 회사 컨텍스트에서만 동작한다(권한 게이트).",
    ],
    schemas,
    apis,
    layouts,
    risks: [
      { code: "RISK-001", description: "기획 자료가 불완전하면 산출물 정확도가 낮아진다.", mitigation: "자료 추가 등록 후 표준 기획서를 재생성한다." },
      { code: "RISK-002", description: "LLM 게이트웨이 장애 시 deterministic fallback으로 품질이 저하된다.", mitigation: "게이트웨이 상태를 점검하고 재생성한다." },
    ],
    assumptions: [
      "화면정의서는 화면 1개당 문서 1개로 작성한다.",
      "공통 레이아웃은 별도 문서에서 먼저 정의하고 각 화면은 layoutCode와 slot만 참조한다.",
      "표준 기획서를 확정해야 화면정의서 단계로 진행한다.",
    ],
    productBuilderBlueprint,
    generatedAt,
    confirmedAt: null,
    llmModel: input.model,
    usedFallback: true,
  };
}

// 분석 ②단계 deterministic 안전망. 확정된 표준 기획서 + 원본 자료에서 화면 템플릿을 생성.
export function buildFallbackScreenPlan(input: {
  sources: SourceMaterial[];
  now?: string;
  model?: string;
}): ScreenPlan {
  const text = input.sources.map((source) => `${source.title}\n${source.body}`).join("\n\n");
  const hasAdmin = /관리자|admin/i.test(text);
  const generatedAt = input.now ?? new Date().toISOString();

  const screens: ScreenDefinition[] = [
    {
      code: "COS-SCR-001",
      name: "기획 자료 등록",
      description: "내부/외부 기획 자료를 등록하고 분석 대상 소스로 모은다.",
      layoutCode: "COS-LAY-001",
      layoutSlot: "SLOT-MAIN",
      route: "/cos-blueprint/sources",
      access: "authenticated",
      primaryTestId: "cos-scr-001",
      schemas: ["SCH-001"],
      apis: ["API-001"],
      fields: ["title", "sourceType", "body"],
      states: defaultScreenStates("authenticated"),
      actions: [
        action("COS-SCR-001", 1, {
          trigger: "저장 버튼 클릭",
          description: "입력한 자료를 source material로 저장한다.",
          apiCodes: ["API-001"],
        }),
        action("COS-SCR-001", 2, {
          trigger: "표준 기획서 생성 클릭",
          description: "등록 자료를 기반으로 표준 기획서를 생성한다.",
          apiCodes: ["API-002"],
          targetScreenCode: "COS-SCR-002",
        }),
      ],
      acceptanceCriteria: [
        ac("COS-SCR-001", 1, "제목과 본문이 없으면 저장할 수 없다."),
        ac("COS-SCR-001", 2, "저장 후 자료 목록에 제목, 유형, 등록 시각이 표시된다."),
      ],
    },
    {
      code: "COS-SCR-002",
      name: "표준 기획서 검토",
      description: "도출된 목표/범위/요구사항/DB·API/레이아웃을 검토하고 확정한다.",
      layoutCode: "COS-LAY-001",
      layoutSlot: "SLOT-MAIN",
      route: "/cos-blueprint/standard-plan",
      access: "authenticated",
      primaryTestId: "cos-scr-002",
      schemas: ["SCH-001", "SCH-002"],
      apis: ["API-002", "API-003"],
      fields: ["overview", "goals", "scope", "functionalRequirements", "schemas", "apis", "layouts"],
      states: defaultScreenStates("authenticated"),
      actions: [
        action("COS-SCR-002", 1, {
          trigger: "확정 버튼 클릭",
          description: "표준 기획서를 확정해 화면정의서 단계를 연다.",
          apiCodes: [],
          targetScreenCode: "COS-SCR-003",
        }),
      ],
      acceptanceCriteria: [
        ac("COS-SCR-002", 1, "표준 기획서는 목표/범위/요구사항/DB·API/레이아웃을 가진다."),
        ac("COS-SCR-002", 2, "확정 전에는 화면정의서 단계로 진행할 수 없다."),
      ],
    },
  ];

  if (hasAdmin) {
    screens.push({
      code: "COS-SCR-003",
      name: "관리자 검수",
      description: "관리자가 산출된 기획/화면/API 문서의 누락 여부를 검수한다.",
      layoutCode: "COS-LAY-001",
      layoutSlot: "SLOT-MAIN",
      route: "/admin/cos-blueprint/review",
      access: "admin",
      primaryTestId: "cos-scr-003",
      schemas: ["SCH-001", "SCH-002"],
      apis: ["API-003"],
      fields: ["reviewStatus", "reviewComment"],
      states: defaultScreenStates("admin"),
      actions: [
        action("COS-SCR-003", 1, {
          trigger: "승인 버튼 클릭",
          description: "검수 상태를 approved로 전환한다.",
          apiCodes: [],
        }),
      ],
      acceptanceCriteria: [
        ac("COS-SCR-003", 1, "필수 산출물이 없으면 승인할 수 없다."),
      ],
    });
  }

  return {
    screens,
    generatedAt,
    confirmedAt: null,
    llmModel: input.model,
    usedFallback: true,
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

  const schemas = Array.isArray(record.schemas) && record.schemas.length > 0
    ? record.schemas as SchemaDefinition[]
    : fallback.schemas;
  const apis = Array.isArray(record.apis) && record.apis.length > 0
    ? record.apis as ApiDefinition[]
    : fallback.apis;
  const layouts = Array.isArray(record.layouts) && record.layouts.length > 0
    ? record.layouts as LayoutDefinition[]
    : fallback.layouts;
  const frs = Array.isArray(record.functionalRequirements) && record.functionalRequirements.length > 0
    ? record.functionalRequirements as FunctionalRequirement[]
    : fallback.functionalRequirements;
  const risks = Array.isArray(record.risks) && record.risks.length > 0
    ? record.risks as Risk[]
    : fallback.risks;
  const scopeRecord = record.scope && typeof record.scope === "object" ? record.scope as Record<string, unknown> : {};
  const inScope = Array.isArray(scopeRecord.inScope)
    ? (scopeRecord.inScope as unknown[]).filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : fallback.scope.inScope;
  const outOfScope = Array.isArray(scopeRecord.outOfScope)
    ? (scopeRecord.outOfScope as unknown[]).filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : fallback.scope.outOfScope;

  return {
    projectTitle: pickString("projectTitle", fallback.projectTitle),
    overview: pickString("overview", fallback.overview),
    goals: pickStringArray("goals", fallback.goals),
    scope: {
      inScope: inScope.length ? inScope : fallback.scope.inScope,
      outOfScope: outOfScope.length ? outOfScope : fallback.scope.outOfScope,
    },
    functionalRequirements: frs.map((fr, index) => ({
      code: str(fr.code, `FR-${String(index + 1).padStart(3, "0")}`),
      title: str(fr.title, `요구사항 ${index + 1}`),
      description: str(fr.description, ""),
      priority: fr.priority === "must" || fr.priority === "should" || fr.priority === "could" ? fr.priority : undefined,
    })),
    nonFunctionalRequirements: pickStringArray("nonFunctionalRequirements", fallback.nonFunctionalRequirements),
    schemas: schemas.map((schema, index) => ({
      ...schema,
      code: schema.code || `SCH-${String(index + 1).padStart(3, "0")}`,
      fields: Array.isArray(schema.fields) ? schema.fields : [],
      sourceRequirementCodes: Array.isArray(schema.sourceRequirementCodes) ? schema.sourceRequirementCodes : [],
      relations: Array.isArray(schema.relations) ? schema.relations : [],
      acceptanceCriteria: Array.isArray(schema.acceptanceCriteria) ? schema.acceptanceCriteria : [],
    })),
    apis: apis.map((api, index) => ({
      ...api,
      code: api.code || `API-${String(index + 1).padStart(3, "0")}`,
      method: api.method || "GET",
      input: Array.isArray(api.input) ? api.input : [],
      output: Array.isArray(api.output) ? api.output : [],
      schemas: Array.isArray(api.schemas) ? api.schemas : [],
      errors: Array.isArray(api.errors) ? api.errors : [],
      acceptanceCriteria: Array.isArray(api.acceptanceCriteria) ? api.acceptanceCriteria : [],
    })),
    layouts: layouts.map((layout, index) => ({
      ...layout,
      code: layout.code || `COS-LAY-${String(index + 1).padStart(3, "0")}`,
      slots: Array.isArray(layout.slots) ? layout.slots : [],
    })),
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
  const code = str(screen.code, `COS-SCR-${String(index + 1).padStart(3, "0")}`);
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

// source 본문을 cap 적용해 프롬프트용 텍스트로 직렬화. 자료당/합산 상한 초과분은 절단 표기.
function buildSourceText(sources: SourceMaterial[]): string {
  let total = 0;
  const blocks: string[] = [];
  for (let index = 0; index < sources.length; index += 1) {
    const source = sources[index];
    let body = source.body.length > SOURCE_BODY_CAP
      ? `${source.body.slice(0, SOURCE_BODY_CAP)}\n…(truncated)`
      : source.body;
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

// 분석 ①단계 프롬프트: 표준 기획서(일정 제외). screens 생성 금지.
export function buildStandardPlanPrompt(input: { title?: string; sources: SourceMaterial[]; productBuilderBlueprintId?: ProductBuilderBlueprintId }): string {
  const productBuilderBlueprint = productBuilderBlueprintContext(input.productBuilderBlueprintId ?? DEFAULT_PRODUCT_BUILDER_BLUEPRINT_ID);
  return [
    "COS Blueprint 표준 기획서 분석을 수행해 JSON 객체 하나만 출력하라.",
    "관점: PM 에이전트가 Blueprint 플러그인을 이용해 PM 업무를 정형화하고, 순차 게이트를 통과하며 회사 표준 산출물을 만든다.",
    `제품 유형(Product Type): ${productBuilderBlueprint.label}`,
    `Product Builder 기준(Product Builder Basis): ${productBuilderBlueprint.productBuilderLabel}`,
    `제품 유형 설명(Product Type Description): ${productBuilderBlueprint.description}`,
    "목표: 내부/외부 기획 자료에서 표준 기획서(Standard Plan), 제품 요구사항 문서(PRD, Product Requirements Document), 스키마 정의서(Schema Definition), REST API 정의서(REST API Definition), 인터페이스 정의서(Interface Definition), 레이아웃 정의서(Layout Definition)의 계약을 산출한다.",
    "화면정의서(screens)는 이 단계에서 생성하지 않는다. 화면정의서는 표준 기획서 확정 후 별도 단계에서 생성한다.",
    "각 섹션 작성 지침:",
    "- overview: 프로젝트 배경과 목적을 3~5문장으로 서술한다.",
    "- goals: 측정 가능한 목표 3~6개의 문자열 배열.",
    "- scope: { inScope: string[], outOfScope: string[] }. 포함 범위와 제외 범위를 모두 명시한다(제외 범위 필수).",
    "- functionalRequirements: { title, description, priority: 'must'|'should'|'could' } 배열. 기능 코드는 만들지 말고, 기능명 중심으로 작성.",
    "- nonFunctionalRequirements: 성능/보안/가용성/운영 등 비기능 요구사항 문자열 배열.",
    "- schemas: 스키마 정의서의 원천 데이터. { code:'SCH-001', name, description, owner, fields:[{name,type,required,description,validation,example}], relations, acceptanceCriteria }.",
    "- apis: REST API 정의서의 원천 데이터. { code:'API-001', method, path, summary, actor, auth, input, output, schemas, errors:[{code,condition}], auditAction, acceptanceCriteria }.",
    "- layouts: 공통 레이아웃. { code: 'COS-LAY-001', name, description, slots:[{code,name,purpose}] }.",
    "- risks: { code: 'RISK-001', description, mitigation } 배열.",
    "- assumptions: 작성 전제 문자열 배열.",
    "일정/마일스톤은 생성하지 않는다.",
    "출력 JSON shape: { projectTitle, overview, goals, scope, functionalRequirements, nonFunctionalRequirements, schemas, apis, layouts, risks, assumptions }",
    `프로젝트 제목 힌트: ${input.title || "(자료에서 추론)"}`,
    "",
    buildSourceText(input.sources),
  ].join("\n");
}

// 분석 ②단계 프롬프트: 확정된 표준 기획서를 입력으로 화면정의서 전체 생성. (phase 2)
export function buildScreenPrompt(input: { standardPlan: StandardPlan; sources: SourceMaterial[] }): string {
  const plan = input.standardPlan;
  const planContext = [
    `프로젝트: ${plan.projectTitle}`,
    `제품 유형: ${plan.productBuilderBlueprint?.label ?? "-"}`,
    `Product Builder 기준: ${plan.productBuilderBlueprint?.productBuilderLabel ?? "-"}`,
    `개요: ${plan.overview}`,
    `목표: ${plan.goals.join("; ")}`,
    `기능 요구사항: ${plan.functionalRequirements.map((fr) => fr.title).join("; ")}`,
    `스키마 코드: ${plan.schemas.map((s) => s.code).join(", ")}`,
    `API 코드: ${plan.apis.map((a) => a.code).join(", ")}`,
    `레이아웃 코드: ${plan.layouts.map((l) => l.code).join(", ")}`,
  ].join("\n");

  return [
    "확정된 표준 기획서와 그 하위 산출물(스키마 정의서, REST API 정의서, 공통 레이아웃 정의서)을 기준으로 화면정의서 전체를 생성해 JSON 객체 하나만 출력하라.",
    "화면 1개는 ScreenDefinition 1개다. 직관적이고 명료해야 한다.",
    "각 screen: code(COS-SCR-001), name, description, layoutCode, layoutSlot, route, access, primaryTestId, schemas, apis, fields, states, actions, acceptanceCriteria.",
    "access는 'public'(비로그인 접근) | 'authenticated'(로그인 필요) | 'admin'(관리자 전용) 중 하나. /admin route는 admin.",
    "schemas/apis/layoutCode는 확정된 스키마 정의서/REST API 정의서/레이아웃 정의서의 코드만 참조한다(재정의 금지).",
    "states는 default/empty/loading/error/permission 상태를 포함하되, 화면에 해당 없는 상태는 그 이유를 짧게 적는다.",
    "액션은 ACT-01 형식 code와 화면코드 파생 testId(예: cos-scr-001-act-01). 인수조건은 AC-01 형식.",
    "화면 이동 액션은 targetScreenCode에 대상 화면 코드를 넣는다.",
    "출력 JSON shape: { screens: ScreenDefinition[] }",
    "",
    "## 표준 기획서 컨텍스트",
    planContext,
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
    `레이아웃 코드: ${plan.layouts.map((l) => l.code).join(", ")}`,
  ].join("\n");

  return [
    "아래 화면정의서 1개를 리뷰 피드백을 반영해 수정하고 JSON 객체 하나만 출력하라.",
    `화면 코드(code)는 '${input.screen.code}'로 유지한다.`,
    "schemas/apis/layoutCode는 확정된 스키마 정의서/REST API 정의서/레이아웃 정의서의 코드만 참조한다.",
    "access는 'public' | 'authenticated' | 'admin' 중 하나.",
    "states는 default/empty/loading/error/permission 상태를 포함하되, 화면에 해당 없는 상태는 그 이유를 짧게 적는다.",
    "액션은 ACT-01 형식 code와 화면코드 파생 testId, 인수조건은 AC-01 형식.",
    "출력 JSON shape: { screen: ScreenDefinition }",
    "",
    "## 표준 기획서 컨텍스트",
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

function featureDocumentEntries(plan: StandardPlan): FeatureDocumentEntry[] {
  const used = new Map<string, number>();
  return plan.functionalRequirements.map((requirement) => {
    const base = fileSlug(requirement.title);
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    const slug = count === 1 ? base : `${base}-${count}`;
    return {
      requirement,
      path: `${FEATURE_DOC_DIR}/${slug}.md`,
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
      "표준 기획서 확정 전에는 화면정의서를 생성하지 않는다.",
      "스키마 정의서와 REST API 정의서는 화면정의서보다 먼저 확정한다.",
      "화면정의서는 스키마/API/레이아웃을 재정의하지 않고 코드만 참조한다.",
      "각 산출물은 Project document slot에 등록되는 회사 표준 문서로 취급한다.",
    ]),
  ].join("\n");
}

export function renderStandardPlan(plan: StandardPlan): string {
  const features = featureDocumentEntries(plan);
  return [
    `# 표준 기획서(Standard Plan) - ${plan.projectTitle}`,
    "",
    "이 문서는 PM 에이전트가 후속 산출물을 일관되게 만들기 위한 실행 기준선이다. PRD는 제품 요구사항을 다루고, 이 표준 기획서는 산출물 생성 순서와 참조 계약을 고정한다.",
    "",
    "## 0. 문서 관리(Document Control)",
    "",
    table(
      ["항목(Item)", "내용(Description)"],
      [
        ["프로젝트(Project)", plan.projectTitle],
        ["제품 유형(Product Type)", plan.productBuilderBlueprint?.label ?? "-"],
        ["Product Builder 기준(Product Builder Basis)", plan.productBuilderBlueprint?.productBuilderLabel ?? "-"],
        ["생성일(Created At)", plan.generatedAt],
        ["상태(Status)", plan.confirmedAt ? `확정(${plan.confirmedAt})` : "미확정"],
        ["생성 모델(Model)", plan.llmModel ? `${plan.llmModel}${plan.usedFallback ? " (fallback)" : ""}` : "-"],
        ["문서 역할(Document Role)", "후속 PRD/스키마/REST API/레이아웃/화면정의서 생성을 위한 기준선"],
      ],
    ),
    "",
    "## 1. 개요(Overview)",
    "",
    plan.overview,
    "",
    "## 2. 목표(Goals)",
    "",
    list(plan.goals),
    "",
    "## 3. 범위(Scope)",
    "",
    "### 포함 범위(In Scope)",
    "",
    list(plan.scope.inScope),
    "",
    "### 제외 범위(Out of Scope)",
    "",
    list(plan.scope.outOfScope),
    "",
    "## 4. 기능 요구사항(Functional Requirements)",
    "",
    table(
      ["기능(Feature)", "우선순위(Priority)", "상세 문서(Feature Definition)", "설명(Description)"],
      features.map(({ requirement, path }) => [
        requirement.title,
        requirement.priority ? PRIORITY_LABEL[requirement.priority] : "-",
        path,
        requirement.description,
      ]),
    ),
    "",
    "## 5. 비기능 요구사항(Non-functional Requirements)",
    "",
    list(plan.nonFunctionalRequirements),
    "",
    "## 6. 고정 기준 문서(Standard References)",
    "",
    table(
      ["문서(Document)", "Slot", "용도(Purpose)"],
      [
        ["PM 업무 실행 절차(PM Execution Procedure)", "support.pm_execution_procedure", "PM 에이전트의 고정 실행 순서"],
        ["화면정의서 작성 룰(Screen Definition Writing Rules)", "support.screen_definition_writing_rules", "화면 문서 작성 시 고정 규칙"],
      ],
    ),
    "",
    "## 7. 참조 계약 인덱스(Contract Index)",
    "",
    "### DB 스키마 개요(DB Schema Overview)",
    "",
    table(
      ["코드(Code)", "이름(Name)", "설명(Description)"],
      plan.schemas.map((schema) => [schema.code, schema.name, schema.description]),
    ),
    "",
    "### REST API 개요(REST API Overview)",
    "",
    table(
      ["코드(Code)", "메서드(Method)", "경로(Path)", "설명(Description)"],
      plan.apis.map((api) => [api.code, api.method, api.path, api.summary]),
    ),
    "",
    "### 공통 레이아웃(Common Layouts)",
    "",
    table(
      ["코드(Code)", "이름(Name)", "설명(Description)"],
      plan.layouts.map((layout) => [layout.code, layout.name, layout.description]),
    ),
    "",
    "## 8. 리스크(Risks)",
    "",
    table(
      ["코드(Code)", "리스크(Risk)", "완화 방안(Mitigation)"],
      plan.risks.map((risk) => [risk.code, risk.description, risk.mitigation]),
    ),
    "",
    "## 9. 전제(Assumptions)",
    "",
    list(plan.assumptions),
  ].filter((line): line is string => line !== null).join("\n");
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
    `# 기능 정의서 목록(Feature Definition Index) - ${plan.projectTitle}`,
    "",
    "이 문서는 PRD의 기능 요구사항을 기능별 상세 문서로 분리하기 위한 목차다. 기능 코드는 사용하지 않고 기능명과 Project slot 문서 참조로 추적한다.",
    "",
    table(
      ["기능(Feature)", "우선순위(Priority)", "상세 문서 참조(Feature Definition Reference)", "요약(Summary)"],
      features.map(({ requirement, path }) => [
        requirement.title,
        requirement.priority ? PRIORITY_LABEL[requirement.priority] : "-",
        path,
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
    "## 2. 사용자와 조건(User & Conditions)",
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
    "## 3. 주요 흐름(Main Flow)",
    "",
    list(["TBD"]),
    "",
    "## 4. 예외 흐름(Exception Flow)",
    "",
    list(["TBD"]),
    "",
    "## 5. 입력/출력(Input/Output)",
    "",
    table(
      ["구분(Type)", "내용(Description)"],
      [
        ["입력(Input)", "TBD"],
        ["출력(Output)", "TBD"],
      ],
    ),
    "",
    "## 6. 참조 산출물(References)",
    "",
    table(
      ["산출물(Output)", "참조 방식(Reference Rule)"],
      [
        ["스키마 정의서(Schema Definition)", "`schema-definition.md`에서 필요한 스키마를 확인한다."],
        ["REST API 정의서(REST API Definition)", "`api-definition.md`에서 필요한 API를 확인한다."],
        ["화면정의서(Screen Definition)", "관련 화면이 확정되면 `deliverable.screen_definitions` slot의 화면 문서를 연결한다."],
      ],
    ),
    "",
    "## 7. 인수 기준(Acceptance Criteria)",
    "",
    list([
      `${requirement.title} 기능이 목적에 맞게 동작한다.`,
      "주요 흐름과 예외 흐름이 QA에서 확인 가능하다.",
      "필요한 스키마/API/화면 참조가 누락되지 않는다.",
    ]),
    "",
    "## 8. 제외 범위(Out of Scope)",
    "",
    list(["TBD"]),
  ].join("\n");
}

export function renderSchemaDefinition(plan: StandardPlan): string {
  return [
    `# 스키마 정의서(Schema Definition) - ${plan.projectTitle}`,
    "",
    "이 문서는 PM 에이전트가 표준 기획서에서 확정한 데이터 구조를 개발/QA가 검수 가능한 기준으로 분리한 회사 표준 산출물이다.",
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
    "이 문서는 PM 에이전트가 표준 기획서에서 확정한 REST API 계약을 화면정의서, 개발, QA가 같은 기준으로 참조하도록 분리한 회사 표준 산출물이다.",
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

export function renderInterfaceDefinition(plan: StandardPlan): string {
  return [
    `# 인터페이스 정의서(Interface Definition) - ${plan.projectTitle}`,
    "",
    "이 문서는 스키마 정의서와 REST API 정의서 사이의 참조 관계를 한눈에 확인하기 위한 요약 산출물이다. 상세 필드와 검수 기준은 `schema-definition.md`, `api-definition.md`를 기준으로 한다.",
    "",
    "## 스키마/API 추적성(Schema/API Traceability)",
    "",
    table(
      ["스키마(Schema)", "스키마 이름(Schema Name)", "참조 API(Referenced APIs)", "관련 기능(Related Features)"],
      plan.schemas.map((schema) => {
        const apis = plan.apis.filter((api) => api.schemas.includes(schema.code)).map((api) => api.code);
        return [
          schema.code,
          schema.name,
          apis.join(", ") || "-",
          relatedFeatureTitles(plan, schema.sourceRequirementCodes),
        ];
      }),
    ),
    "",
    "## API/Schema 연결(API/Schema Mapping)",
    "",
    table(
      ["API", "메서드(Method)", "경로(Path)", "행위자(Actor)", "스키마(Schema)", "감사(Audit)"],
      plan.apis.map((api) => [
        api.code,
        api.method,
        api.path,
        api.actor ?? "-",
        api.schemas.join(", "),
        api.auditAction ?? "-",
      ]),
    ),
  ].join("\n");
}

export function renderLayoutDefinition(plan: StandardPlan): string {
  return [
    `# 공통 화면 레이아웃 정의서(Common Layout Definition) - ${plan.projectTitle}`,
    "",
    ...plan.layouts.flatMap((layout) => [
      `## ${layout.code} ${layout.name}`,
      "",
      layout.description,
      "",
      table(
        ["슬롯 코드(Slot Code)", "슬롯 이름(Slot Name)", "목적(Purpose)"],
        layout.slots.map((slot) => [slot.code, slot.name, slot.purpose]),
      ),
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
    "3. 공통 레이아웃은 `{AREA}-LAY-{NNN}` 문서에서 먼저 정의하고, 화면정의서는 `layoutCode`와 `layoutSlot`만 참조한다.",
    "4. 사용자 동작은 `ACT-01`부터 순번으로 작성한다.",
    "5. 화면 상태는 default/empty/loading/error/permission 기준으로 적는다.",
    "6. 인수 기준은 `AC-01`부터 순번으로 작성한다.",
    "7. `data-testid`는 화면코드와 action/ac code에서 파생한다. 예: `cos-scr-001-act-01`, `cos-scr-001-ac-01`.",
    "8. 화면 이동 액션은 대상 화면코드(`targetScreenCode`)를 반드시 적는다.",
    "9. 화면에서 쓰는 스키마/API는 선행 인터페이스 정의서의 코드만 참조하고, 화면정의서에서 재정의하지 않는다.",
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

// 등록 자료 1건을 Project source slot metadata에 연결하는 논리적 documentRef.
// slug만으로는 한글 파일명 붕괴/동일 이름 충돌로 덮어쓰기가 발생하므로 source id 접미사(48bit)로 충돌 확률을 사실상 0으로 낮춘다.
export function sourceDocPath(source: SourceMaterial): string {
  const base = source.fileName ? source.fileName.replace(/\.[^.]+$/, "") : source.title;
  return `${SOURCE_DOC_DIR}/${fileSlug(base)}-${source.id.slice(0, 12)}.md`;
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
export function sourceOriginalPath(source: SourceMaterial): string {
  const base = source.fileName ? source.fileName.replace(/\.[^.]+$/, "") : source.title;
  return `${SOURCE_ORIGINAL_DIR}/${fileSlug(base)}-${source.id.slice(0, 12)}.${originalExtension(source)}`;
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

export function projectSlotKeyForDocumentPath(filePath: string): ProjectDocumentSlotKey | null {
  if (filePath === PM_EXECUTION_PROCEDURE_DOC) return "support.pm_execution_procedure";
  if (filePath === SCREEN_DEFINITION_WRITING_RULES_DOC) return "support.screen_definition_writing_rules";
  if (filePath === "docs/cos-blueprint/standard-plan.md") return "deliverable.standard_plan";
  if (filePath === "docs/cos-blueprint/product-requirements-document.md") return "deliverable.prd";
  if (filePath === FEATURE_DEFINITION_INDEX_DOC) return "deliverable.feature_index";
  if (filePath === "docs/cos-blueprint/schema-definition.md") return "deliverable.schema_definition";
  if (filePath === "docs/cos-blueprint/api-definition.md") return "deliverable.api_definition";
  if (filePath === "docs/cos-blueprint/interface-definition.md") return "deliverable.interface_definition";
  if (filePath === "docs/cos-blueprint/layout-definition.md") return "deliverable.layout_definition";
  if (filePath.startsWith(`${FEATURE_DOC_DIR}/`)) return "deliverable.feature_files";
  if (filePath.startsWith("docs/cos-blueprint/screens/")) return "deliverable.screen_definitions";
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
export function renderBlueprintStandardDocuments(): Record<string, string> {
  return {
    [PM_EXECUTION_PROCEDURE_DOC]: renderPmExecutionProcedure(),
    [SCREEN_DEFINITION_WRITING_RULES_DOC]: renderWritingRules(),
  };
}

// 분석 ①단계 프로젝트별 문서: 표준 기획서 + PRD + 스키마/API/인터페이스/레이아웃 정의.
export function renderStandardPlanDocuments(plan: StandardPlan): Record<string, string> {
  const docs: Record<string, string> = {
    "docs/cos-blueprint/standard-plan.md": renderStandardPlan(plan),
    "docs/cos-blueprint/product-requirements-document.md": renderProductRequirementsDocument(plan),
    [FEATURE_DEFINITION_INDEX_DOC]: renderFeatureDefinitionIndex(plan),
    "docs/cos-blueprint/schema-definition.md": renderSchemaDefinition(plan),
    "docs/cos-blueprint/api-definition.md": renderApiDefinition(plan),
    "docs/cos-blueprint/interface-definition.md": renderInterfaceDefinition(plan),
    "docs/cos-blueprint/layout-definition.md": renderLayoutDefinition(plan),
  };
  for (const { requirement, path } of featureDocumentEntries(plan)) {
    docs[path] = renderFeatureDefinition(plan, requirement);
  }
  return docs;
}

// 분석 ②단계 프로젝트별 문서: 화면정의서 전체.
export function renderScreenDocuments(screenPlan: ScreenPlan, projectTitle: string): Record<string, string> {
  const docs: Record<string, string> = {};

  for (const screen of screenPlan.screens) {
    const codeSlug = sanitizeCodePart(screen.code);
    const slug = sanitizeCodePart(screen.name);
    let key = `docs/cos-blueprint/screens/${codeSlug}-${slug}.md`;
    // screen.code/name이 중복되거나 sanitize 후 충돌하면 문서가 조용히 덮어써지므로 접미사로 1:1 보장.
    if (docs[key]) {
      let suffix = 2;
      while (docs[`docs/cos-blueprint/screens/${codeSlug}-${slug}-${suffix}.md`]) suffix += 1;
      key = `docs/cos-blueprint/screens/${codeSlug}-${slug}-${suffix}.md`;
    }
    docs[key] = renderScreenDefinition(screen, projectTitle);
  }

  return docs;
}

// ────────────────────────────────────────────────────────────────────────────
// Wiki 등재 (plugin-llm-wiki 연동)
//
// 산출물(표준 기획서 ① / 화면정의서 ②)을 프로젝트 단위 wiki space에 페이지로 등재한다.
// - 등재는 UI(board 세션)에서 wiki 플러그인 apiRoute(file-as-page)를 직접 호출한다(worker 우회).
//   worker는 board/agent 인증이 없어 apiRoute를 못 부르지만, UI는 브라우저 board 세션을 가진다.
// - wiki에는 프로젝트→space 자동 매핑이 없으므로 프로젝트명 기반 slug로 space를 find-or-create 한다.
// 여기서는 네트워크 의존이 없는 순수 변환만 제공한다(테스트 가능). 실제 fetch는 ui/wiki.ts.
// ────────────────────────────────────────────────────────────────────────────

// plugin-llm-wiki 의 등록 id(키). apiRoute 경로 `/api/plugins/<id>/api/<route>` 의 <id>.
export const WIKI_PLUGIN_ID = "paperclipai.plugin-llm-wiki";

// wiki page 경로 접두어. wiki는 page 경로가 `wiki/` 로 시작 + `.md` 로 끝나야 한다(assertPagePath).
export const WIKI_PAGE_DIR = "wiki/blueprint";

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

// docs/cos-blueprint/<rest> → wiki/blueprint/<rest> 로 경로를 재매핑한다.
// 접두어가 예상과 다르면(향후 렌더러 변경 대비) 파일명을 WIKI_PAGE_DIR 하위로 강제해 wiki 규칙(wiki/ 시작)을 보장한다.
function toWikiPagePath(docPath: string): string {
  const mapped = docPath.replace(/^docs\/cos-blueprint\//, `${WIKI_PAGE_DIR}/`);
  if (mapped.startsWith("wiki/")) return mapped;
  const base = mapped.split("/").pop() ?? mapped;
  return `${WIKI_PAGE_DIR}/${base}`;
}

// 등재할 wiki 페이지 목록을 만든다. standardPlan(①)·screenPlan(②) 중 존재하는 것만 포함.
// 산출 markdown은 기존 렌더러를 재사용하므로 디스크 기록물과 1:1 동일하다.
export function buildWikiPages(
  standardPlan: StandardPlan | null,
  screenPlan: ScreenPlan | null,
  projectTitle: string,
): WikiPageDoc[] {
  const pages: WikiPageDoc[] = [];
  const add = (docs: Record<string, string>) => {
    for (const [docPath, contents] of Object.entries(docs)) {
      const pagePath = toWikiPagePath(docPath);
      pages.push({ path: pagePath, title: wikiPageTitle(contents, pagePath), contents });
    }
  };
  if (standardPlan || screenPlan) add(renderBlueprintStandardDocuments());
  if (standardPlan) add(renderStandardPlanDocuments(standardPlan));
  if (screenPlan) add(renderScreenDocuments(screenPlan, projectTitle));
  return pages;
}

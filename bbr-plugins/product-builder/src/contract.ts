export const PLUGIN_ID = "paperclip-plugin-product-builder";
export const PLUGIN_VERSION = "0.2.0";
export const PROJECT_KEY = "product-builder";
export const BUILDER_AGENT_KEY = "product-builder-orchestrator";
export const BUILDER_BACKEND_AGENT_KEY = "product-builder-backend";
export const BUILDER_FRONTEND_AGENT_KEY = "product-builder-frontend";
export const BUILDER_PLATFORM_AGENT_KEY = "product-builder-platform";
export const BUILDER_AI_AGENT_KEY = "product-builder-ai-runtime";
export const BUILDER_QA_AGENT_KEY = "product-builder-qa";
export const BUILDER_SKILL_KEY = "product-builder";
export const PAGE_ROUTE = "product-builder";

export const DATA = {
  overview: "overview",
  blueprint: "blueprint",
} as const;

export const ACTION = {
  instantiateBuild: "instantiate-build",
  instantiateBuildPlan: "instantiate-build-plan",
} as const;

export const INITIAL_SUPER_ADMIN_EMAIL = "first@super.local";
export const INITIAL_SUPER_ADMIN_PASSWORD = "q1w2e3r4t5!$";
export const INICIS_STDPAY_PC_MANUAL_URL = "https://manual.inicis.com/pay/stdpay_pc.html";
export const INICIS_BILLING_MANUAL_URL = "https://manual.inicis.com/pay/bill.html";
export const VERCEL_BLOB_DOCS_URL = "https://vercel.com/docs/vercel-blob";
export const VERCEL_BLOB_CLIENT_UPLOAD_DOCS_URL = "https://vercel.com/docs/vercel-blob/client-upload";
export const VERCEL_BLOB_SERVER_UPLOAD_DOCS_URL = "https://vercel.com/docs/vercel-blob/server-upload";
export const CLOUDFLARE_STREAM_DOCS_URL = "https://developers.cloudflare.com/stream/";
export const CLOUDFLARE_STREAM_DIRECT_UPLOADS_DOCS_URL = "https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/";
export const CLOUDFLARE_STREAM_TUS_UPLOADS_DOCS_URL = "https://developers.cloudflare.com/stream/uploading-videos/resumable-uploads/";
export const CLOUDFLARE_STREAM_SIGNED_URLS_DOCS_URL = "https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/";
export const CLOUDFLARE_STREAM_WEBHOOKS_DOCS_URL = "https://developers.cloudflare.com/stream/manage-video-library/using-webhooks/";
export const KCB_OKNAME_SERVICE_URL = "https://www.ok-name.co.kr/";
export const KCB_SERVICE_INTRO_URL = "https://datastore.koreacb.com/site/kcbserviceIntro.do";
export const RAILWAY_JAVA_DEPLOY_DOCS_URL = "https://docs.railway.com/guides/spring-boot";
export const RAILWAY_DEPLOYMENTS_DOCS_URL = "https://docs.railway.com/deployments/reference";
export const RAILWAY_VARIABLES_DOCS_URL = "https://docs.railway.com/variables";
export const RAILWAY_PRIVATE_NETWORKING_DOCS_URL = "https://docs.railway.com/networking/private-networking";
export const PRODUCT_BUILDER_BASE_REPO = "product-builder-base";
export const PRODUCT_BUILDER_BASE_LOCAL_PATH = "/Users/bright/Projects/product-builder-base";
export const PRODUCT_BUILDER_BASE_GITHUB_URL = "https://github.com/BBrightcode-atlas/product-builder-base";
export const PRODUCT_BUILDER_BASE_DEFAULT_BRANCH = "develop";
export const PRODUCT_BUILDER_BASE_REF_PLACEHOLDER = "<base-ref>";

function productBuilderBaseSource(path: string, note = "PB-BASE-001 must verify repo/path/ref before REUSE closes"): string {
  return `${PRODUCT_BUILDER_BASE_REPO}:${path}@${PRODUCT_BUILDER_BASE_REF_PLACEHOLDER} (${note})`;
}

export const PRODUCT_BUILDER_BASE_REUSE_SOURCES = {
  capabilityRegistry: productBuilderBaseSource("capabilities/registry.json", "product-builder-base is prepared; Flotter is reference only"),
  repoRoot: productBuilderBaseSource(".", "source-of-truth base repo; Flotter is not copied directly into customer delivery repos"),
  authSessionCore: productBuilderBaseSource("packages/features/auth/session-core"),
  authEmail: productBuilderBaseSource("packages/features/auth/email"),
  authSignupPolicyProfile: productBuilderBaseSource("packages/features/auth/signup-policy-profile"),
  authZoneRbac: productBuilderBaseSource("packages/features/auth/zone-rbac"),
  authAccountSettings: productBuilderBaseSource("packages/features/auth/account-settings"),
  authAccountProfile: productBuilderBaseSource("packages/features/auth/account-profile"),
  authEmailChange: productBuilderBaseSource("packages/features/auth/email-change"),
  authPasswordChange: productBuilderBaseSource("packages/features/auth/password-change"),
  authSessionManagement: productBuilderBaseSource("packages/features/auth/session-management"),
  authAccountLifecycle: productBuilderBaseSource("packages/features/auth/account-lifecycle"),
  authQaChecklist: productBuilderBaseSource("tests/auth/reusable-checklist"),
  authPublicActionModal: productBuilderBaseSource("packages/features/auth/public-action-modal"),
  fileUploadCore: productBuilderBaseSource("packages/features/file-upload/vercel-blob"),
  fileUploadDataModel: productBuilderBaseSource("packages/features/file-upload/schema"),
  fileUploadApi: productBuilderBaseSource("packages/features/file-upload/rest-api"),
  fileUploadUi: productBuilderBaseSource("packages/features/file-upload/ui"),
  fileUploadAdmin: productBuilderBaseSource("apps/admin/features/file-upload"),
  fileUploadQaChecklist: productBuilderBaseSource("tests/file-upload/reusable-checklist"),
  videoLectureCore: productBuilderBaseSource("packages/features/video-lecture/cloudflare-stream"),
  videoLectureDataModel: productBuilderBaseSource("packages/features/video-lecture/schema"),
  videoLectureApi: productBuilderBaseSource("packages/features/video-lecture/rest-api"),
  videoLecturePlayerUi: productBuilderBaseSource("packages/features/video-lecture/player-ui"),
  videoLectureAdmin: productBuilderBaseSource("apps/admin/features/video-lecture"),
  videoLectureQaChecklist: productBuilderBaseSource("tests/video-lecture/reusable-checklist"),
  identityVerificationKcbCore: productBuilderBaseSource("packages/features/identity-verification/kcb"),
  identityVerificationKcbJarBridge: productBuilderBaseSource("packages/features/identity-verification/kcb-jar-bridge"),
  identityVerificationDataModel: productBuilderBaseSource("packages/features/identity-verification/schema"),
  identityVerificationApi: productBuilderBaseSource("packages/features/identity-verification/rest-api"),
  identityVerificationUi: productBuilderBaseSource("packages/features/identity-verification/ui"),
  identityVerificationAdmin: productBuilderBaseSource("apps/admin/features/identity-verification"),
  identityVerificationQaChecklist: productBuilderBaseSource("tests/identity-verification/reusable-checklist"),
  adminUserManagement: productBuilderBaseSource("apps/admin/features/user-management"),
  adminUserManagementQa: productBuilderBaseSource("tests/admin/user-management-checklist"),
} as const;

export type TaskDecision = "NEW" | "EXTEND" | "REUSE" | "N/A";
export type TaskPriority = "low" | "medium" | "high" | "critical";
export type TaskCategory =
  | "planning"
  | "foundation"
  | "reuse-audit"
  | "backend"
  | "frontend"
  | "admin"
  | "ai"
  | "content"
  | "qa"
  | "ops";

export type TaskSurface =
  | "planning"
  | "base"
  | "shared"
  | "api"
  | "landing"
  | "app"
  | "admin"
  | "ai-server"
  | "qa"
  | "ops";

export const TASK_SURFACE_LABELS: Record<TaskSurface, string> = {
  planning: "기획/결정",
  base: "기준 코드베이스",
  shared: "공통 패키지",
  api: "서버/API",
  landing: "랜딩페이지",
  app: "어플리케이션",
  admin: "관리자",
  "ai-server": "AI 서버",
  qa: "QA",
  ops: "배포/운영",
};

export const TASK_SURFACE_TARGET_PATHS: Record<TaskSurface, string> = {
  planning: "intake / doc/plans",
  base: "product-builder-base",
  shared: "packages/*",
  api: "apps/api",
  landing: "apps/web",
  app: "apps/app",
  admin: "apps/admin",
  "ai-server": "apps/ai-server",
  qa: "tests / QA checklist",
  ops: "Neon / Vercel",
};

export type ProductBuilderIntake = {
  productName: string;
  customerName: string;
  referenceService: string;
  productSummary: string;
  targetUsers: string;
  customNotes: string;
};

export type ProductBuilderFeatureSelection = {
  auth: {
    enabled: boolean;
    email: boolean;
    oauthGoogle: boolean;
    oauthKakao: boolean;
    oauthNaver: boolean;
  };
  payment: {
    enabled: boolean;
    oneTime: boolean;
    subscription: boolean;
    polar: boolean;
    inicis: boolean;
  };
  notification: {
    emailResend: boolean;
    alimtalk: boolean;
  };
  community: {
    enabled: boolean;
  };
  fileUpload: {
    vercelBlob: boolean;
  };
  videoLecture: {
    cloudflareStream: boolean;
  };
  identityVerification: {
    kcb: boolean;
  };
  admin: {
    userManagement: boolean;
    paymentManagement: boolean;
  };
};

export type ProductBuilderFeatureSelectionInput = {
  auth?: Partial<ProductBuilderFeatureSelection["auth"]>;
  payment?: Partial<ProductBuilderFeatureSelection["payment"]>;
  notification?: Partial<ProductBuilderFeatureSelection["notification"]>;
  community?: Partial<ProductBuilderFeatureSelection["community"]>;
  fileUpload?: Partial<ProductBuilderFeatureSelection["fileUpload"]>;
  videoLecture?: Partial<ProductBuilderFeatureSelection["videoLecture"]>;
  identityVerification?: Partial<ProductBuilderFeatureSelection["identityVerification"]>;
  admin?: Partial<ProductBuilderFeatureSelection["admin"]>;
};

export type ProductBuilderDomainFeature = {
  id: string;
  title: string;
  description: string;
  surfaces: TaskSurface[];
  decision: TaskDecision;
  mvp: boolean;
  notes: string;
};

export type ProductBuilderDomainFeatureInput = Partial<ProductBuilderDomainFeature>;

export type ProductBuilderTask = {
  key: string;
  phase: string;
  title: string;
  description: string;
  surfaces: TaskSurface[];
  targetPaths: string[];
  decision: TaskDecision;
  category: TaskCategory;
  priority: TaskPriority;
  capabilityKey?: string;
  reuseSource?: string;
  agentRole: string;
  dependsOn?: string[];
  deliverables: string[];
  acceptanceCriteria: string[];
  /** Feature-isolated workflow metadata (set only on BuildPlan-generated tasks). */
  workflowRole?: WorkflowRole;
  featureId?: string;
  stageSlug?: WorkflowStageSlug;
  stageOrder?: number;
};

export type ProductBuilderBlueprint = {
  id: string;
  displayName: string;
  shortName: string;
  description: string;
  productClass: string;
  baseRepository: {
    name: string;
    role: string;
    status: string;
    seedSource: string;
    readinessGate: string;
  };
  defaultStack: {
    web: string;
    api: string;
    database: string;
    deploy: string;
    auth: string;
    contract: string;
    ai?: string;
  };
  constraints: string[];
  defaultIntake: ProductBuilderIntake;
  defaultFeatureSelection: ProductBuilderFeatureSelection;
  defaultDomainFeatures: ProductBuilderDomainFeature[];
  tasks: ProductBuilderTask[];
};

export type ProductBuilderOverview = {
  status: "ok";
  checkedAt: string;
  pluginId: string;
  version: string;
  blueprints: Array<{
    id: string;
    displayName: string;
    description: string;
    productClass: string;
    taskCount: number;
    implementationCount: number;
    reuseCount: number;
    skippedCount: number;
    defaultIntake: ProductBuilderIntake;
    defaultFeatureSelection: ProductBuilderFeatureSelection;
    defaultDomainFeatures: ProductBuilderDomainFeature[];
  }>;
  lastBuild: ProductBuilderBuildSummary | null;
};

export type InstantiateBuildInput = {
  companyId: string;
  blueprintId?: string;
  intake?: Partial<ProductBuilderIntake>;
  featureSelection?: ProductBuilderFeatureSelectionInput;
  domainFeatures?: ProductBuilderDomainFeatureInput[];
  decisionOverrides?: Record<string, TaskDecision>;
};

export type CreatedIssueSummary = {
  taskKey: string;
  issueId: string;
  title: string;
  decision: TaskDecision;
  status: string;
  workflowRole?: WorkflowRole;
  featureId?: string;
  stageSlug?: WorkflowStageSlug;
  stageOrder?: number;
  parentIssueId?: string;
};

export type ProductBuilderBuildSummary = {
  buildId: string;
  blueprintId: string;
  productName: string;
  projectId: string | null;
  rootIssueId: string;
  createdAt: string;
  counts: {
    total: number;
    implementation: number;
    reuse: number;
    skipped: number;
  };
  issues: CreatedIssueSummary[];
};

export const DEFAULT_INTAKE: ProductBuilderIntake = {
  productName: "",
  customerName: "",
  referenceService: "",
  productSummary: "",
  targetUsers: "",
  customNotes: "",
};

export const WEB_APPLICATION_SERVICE_INTAKE: ProductBuilderIntake = {
  productName: "",
  customerName: "",
  referenceService: "",
  productSummary: "",
  targetUsers: "",
  customNotes: "",
};

export const DEFAULT_FEATURE_SELECTION: ProductBuilderFeatureSelection = {
  auth: {
    enabled: true,
    email: true,
    oauthGoogle: false,
    oauthKakao: false,
    oauthNaver: false,
  },
  payment: {
    enabled: false,
    oneTime: false,
    subscription: false,
    polar: false,
    inicis: false,
  },
  notification: {
    emailResend: true,
    alimtalk: false,
  },
  community: {
    enabled: false,
  },
  fileUpload: {
    vercelBlob: true,
  },
  videoLecture: {
    cloudflareStream: false,
  },
  identityVerification: {
    kcb: false,
  },
  admin: {
    userManagement: true,
    paymentManagement: false,
  },
};

export const DOMAIN_FEATURE_SURFACES = ["landing", "app", "admin", "ai-server"] as const satisfies readonly TaskSurface[];

export const DEFAULT_DOMAIN_FEATURES: ProductBuilderDomainFeature[] = [
  {
    id: "domain-detail",
    title: "도메인 상세 경험",
    description: "핵심 리소스의 상세 조회, 상태, 전환 CTA, 관련 콘텐츠를 공개/앱/관리자 흐름에 맞게 정의한다.",
    surfaces: ["landing", "app", "admin"],
    decision: "NEW",
    mvp: true,
    notes: "",
  },
  {
    id: "domain-catalog",
    title: "도메인 목록/탐색",
    description: "핵심 리소스를 탐색, 검색, 필터링하고 SEO 공개 목록 또는 앱 목록으로 제공한다.",
    surfaces: ["landing", "app", "admin"],
    decision: "NEW",
    mvp: true,
    notes: "",
  },
  {
    id: "user-progress",
    title: "사용자 진행/상태",
    description: "사용자별 진행률, 보관함, 이력, 권한 상태처럼 로그인 후 경험에 필요한 상태 기능을 정의한다.",
    surfaces: ["app", "admin"],
    decision: "NEW",
    mvp: true,
    notes: "",
  },
  {
    id: "operations-workflow",
    title: "운영 관리 워크플로우",
    description: "운영자가 도메인 리소스를 등록, 검수, 노출, 비노출, 추천, 정렬하는 관리 흐름을 정의한다.",
    surfaces: ["admin"],
    decision: "NEW",
    mvp: true,
    notes: "",
  },
];

export const WEB_APPLICATION_DOMAIN_FEATURES: ProductBuilderDomainFeature[] = [
  {
    id: "core-workflow",
    title: "핵심 작업 흐름",
    description: "사용자가 로그인 후 반복적으로 수행하는 핵심 작업, 입력/검토/완료 상태를 정의한다.",
    surfaces: ["app", "admin"],
    decision: "NEW",
    mvp: true,
    notes: "",
  },
  {
    id: "work-history",
    title: "작업 이력/상태",
    description: "사용자별 작업 이력, 상태 변경, 결과 조회, 재실행 또는 복구 흐름을 정의한다.",
    surfaces: ["app", "admin"],
    decision: "NEW",
    mvp: true,
    notes: "",
  },
  {
    id: "ai-assisted-workflow",
    title: "AI 보조 기능",
    description: "AI 서버가 필요한 입력, 작업 생성, 결과 저장, 실패/재시도, 비용 보호 흐름을 정의한다.",
    surfaces: ["app", "admin", "ai-server"],
    decision: "NEW",
    mvp: true,
    notes: "",
  },
];

function pbTask(input: {
  key: string;
  phase: string;
  title: string;
  description: string;
  category: TaskCategory;
  agentRole: string;
  surfaces?: TaskSurface[];
  targetPaths?: string[];
  decision?: TaskDecision;
  priority?: TaskPriority;
  capabilityKey?: string;
  reuseSource?: string;
  dependsOn?: string[];
  deliverables?: string[];
  acceptanceCriteria?: string[];
}): ProductBuilderTask {
  const surfaces = input.surfaces ?? inferTaskSurfaces(input);
  return {
    decision: "NEW",
    priority: "high",
    deliverables: [
      "결정값과 근거",
      "NEW/EXTEND이면 실행 산출물",
      "REUSE/N/A이면 SKIP 사유와 참조 링크",
    ],
    acceptanceCriteria: [
      "이 task는 Product Builder 고정 템플릿에서 삭제하지 않는다.",
      "해당하지 않는 경우 task 제거가 아니라 REUSE 또는 N/A로 SKIP 처리한다.",
      "REUSE/N/A 이슈는 완료 상태로 닫혀 downstream blocker를 막지 않는다.",
    ],
    ...input,
    surfaces,
    targetPaths: input.targetPaths ?? targetPathsForSurfaces(surfaces),
  };
}

function targetPathsForSurfaces(surfaces: TaskSurface[]): string[] {
  return [...new Set(surfaces.map((surface) => TASK_SURFACE_TARGET_PATHS[surface]))];
}

function inferTaskSurfaces(input: {
  key: string;
  category: TaskCategory;
  capabilityKey?: string;
}): TaskSurface[] {
  const key = input.key;

  if (key.startsWith("PB-PLAN") || key.startsWith("PB-FEAT") || key === "PB-DECIDE-001" || key === "PB-REUSE-001" || key === "PB-AI-001") {
    return ["planning"];
  }
  if (key === "PB-BASE-001") return ["base"];
  if (key === "PB-REPO-001") return ["base", "ops"];
  if (key === "PB-FOUND-001") return ["shared", "landing", "app", "admin"];
  if (key === "PB-UI-001") return ["shared", "landing", "app", "admin"];
  if (key.startsWith("PB-INFRA") || key.startsWith("PB-DEPLOY") || key.startsWith("PB-LAUNCH") || key.startsWith("PB-OPS") || key.startsWith("PB-PORT")) return ["ops"];
  if (key === "PB-API-001" || key.startsWith("PB-DATA") || key.startsWith("PB-DOMAIN")) return ["api"];
  if (key.startsWith("PB-AUTH")) return key === "PB-AUTH-002" ? ["api", "app", "admin"] : ["api", "app"];
  if (key.startsWith("PB-FILE-ADMIN")) return ["admin"];
  if (key.startsWith("PB-FILE-QA")) return ["qa", "ops"];
  if (key.startsWith("PB-FILE-UI")) return ["shared", "app", "admin"];
  if (key.startsWith("PB-FILE")) return ["api"];
  if (key.startsWith("PB-VIDEO-ADMIN")) return ["admin"];
  if (key.startsWith("PB-VIDEO-QA")) return ["qa", "ops"];
  if (key.startsWith("PB-VIDEO-PLAYER")) return ["landing", "app"];
  if (key.startsWith("PB-VIDEO")) return ["api"];
  if (key.startsWith("PB-IDV-KCB-ADMIN")) return ["admin"];
  if (key.startsWith("PB-IDV-KCB-QA")) return ["qa", "ops"];
  if (key.startsWith("PB-IDV-KCB-UI")) return ["landing", "app"];
  if (key.startsWith("PB-IDV-KCB")) return ["api"];
  if (key.startsWith("PB-SET")) return ["app"];
  if (key === "PB-WEB-001") return ["landing"];
  if (key === "PB-WEB-002") return ["app"];
  if (key === "PB-PAY-003") return ["landing", "app"];
  if (key.startsWith("PB-PAY")) return ["api"];
  if (key.startsWith("PB-COMM-ADMIN")) return ["admin"];
  if (key.startsWith("PB-COMM-QA")) return ["qa"];
  if (key.startsWith("PB-COMM-UI")) return ["app"];
  if (key.startsWith("PB-COMM")) return ["api"];
  if (key.startsWith("PB-NOTI")) return ["api"];
  if (key.startsWith("PB-LOG")) return ["api", "ops"];
  if (key.startsWith("PB-ADMIN")) return ["admin"];
  if (key.startsWith("PB-AISRV")) return ["ai-server"];
  if (key.startsWith("PB-QA")) return ["qa"];

  switch (input.category) {
    case "admin":
      return ["admin"];
    case "frontend":
      return ["app"];
    case "backend":
      return ["api"];
    case "ai":
      return ["ai-server"];
    case "ops":
      return ["ops"];
    case "qa":
      return ["qa"];
    case "planning":
    case "reuse-audit":
      return ["planning"];
    case "foundation":
      return ["shared"];
    default:
      return ["shared"];
  }
}

export const ONLINE_SERVICE_BLUEPRINT: ProductBuilderBlueprint = {
  id: "online-service-standard",
  displayName: "온라인 서비스",
  shortName: "Online Service Standard",
  productClass: "SEO/AEO/GEO가 필요한 웹사이트 + 관리자 + 서비스 백엔드",
  description:
    "Next.js 기반 공개 서비스, 관리자, REST API, Neon, Vercel을 기본값으로 하는 온라인 서비스 제작 워크플로우.",
  baseRepository: {
    name: "product-builder-base",
    role: "BBR 외주 납품용 온라인 서비스 기준 모노레포",
    status: "ready",
    seedSource: `${PRODUCT_BUILDER_BASE_GITHUB_URL} (${PRODUCT_BUILDER_BASE_LOCAL_PATH}, ${PRODUCT_BUILDER_BASE_DEFAULT_BRANCH})`,
    readinessGate: "PB-BASE-001에서 base repo URL/path, branch, tag/commit, capability registry를 검증해야 REUSE issue를 완료로 본다.",
  },
  defaultStack: {
    web: "Next.js App Router",
    api: "REST + OpenAPI",
    database: "Neon Postgres",
    deploy: "Vercel",
    auth: "Auth.js or hosted auth adapter",
    contract: "OpenAPI first, no tRPC",
  },
  constraints: [
    "SEO/AEO/GEO 요구가 있으므로 공개 페이지는 Next.js를 기본으로 한다.",
    "기본 DB와 배포 환경은 Neon + Vercel로 고정한다.",
    "tRPC는 Product Builder 표준 워크플로우에서 제외한다.",
    "온라인 서비스형의 큰 task는 매번 고정 생성한다.",
    "해당하지 않는 task는 삭제하지 않고 REUSE 또는 N/A로 SKIP 처리한다.",
    "Feature 선택은 task 삭제가 아니라 관련 task의 기본 결정값(NEW/EXTEND/REUSE/N/A)으로 반영한다.",
    "Email(Resend)과 알림톡은 재사용 가능한 알림 feature로 선택하고, 선택되지 않으면 관련 task를 N/A SKIP으로 남긴다.",
    "파일 업로드는 Vercel Blob 기반 기본 feature로 제공하고, BLOB_READ_WRITE_TOKEN/env, client upload, metadata, 삭제/권한/QA task를 고정 생성한다.",
    "온라인 영상 강의는 Cloudflare Stream 기반 선택 feature로 제공하고, 선택되지 않으면 관련 task를 N/A SKIP으로 남긴다.",
    "KCB 본인확인은 선택 feature로 제공하고, 로그인 대체가 아니라 보호 액션/결제/성인/권한 확인에서 필요한 identity gate로 분리한다.",
    "커뮤니티는 재사용 가능한 선택 feature이며, 선택 시 커뮤니티 CRUD, 멤버십, 게시글/댓글 CRUD, 리액션, 투표, 피드 랭킹, karma, 신고/차단/숨김/필터, 규칙/flair, 제재/이의제기, 사용자 UI, 관리자 모더레이션/통계 task를 EXTEND로 실행한다.",
    "사용자 생성 콘텐츠가 있는 커뮤니티 feature는 Apple App Store와 Google Play의 UGC/커뮤니티 안전 요구를 준수해야 한다.",
    "재사용 판정(REUSE/EXTEND)과 신규 구현(NEW)은 issue에서 명시적으로 분리한다.",
    "공개 사이트는 비로그인 사용자도 탐색 가능해야 하며, 저장/구매/이용 시작/개인화 같은 액션에서 로그인 모달을 띄운다.",
    "실제 납품 완료는 Vercel 배포 URL에서 공개 탐색, 로그인 모달, 가입/로그인, 보호 기능 진입이 검증되어야 한다.",
    "실제 구현 기준 코드베이스는 product-builder-base로 둔다.",
    `product-builder-base repo는 ${PRODUCT_BUILDER_BASE_GITHUB_URL} / ${PRODUCT_BUILDER_BASE_LOCAL_PATH} 를 기준으로 한다.`,
    "Flotter의 기존 기능은 복사 대상이 아니라 product-builder-base capability를 보강하기 위한 reference로만 추적한다.",
  ],
  defaultIntake: DEFAULT_INTAKE,
  defaultFeatureSelection: DEFAULT_FEATURE_SELECTION,
  defaultDomainFeatures: DEFAULT_DOMAIN_FEATURES,
  tasks: [
    pbTask({
      key: "PB-PLAN-001",
      phase: "00 기획/결정",
      title: "서비스 빌드 브리프 확정",
      description: "참고 서비스, 고객 목적, MVP 범위, 제외 범위, 성공 기준, 운영 가정을 하나의 빌드 브리프로 고정한다.",
      category: "planning",
      priority: "critical",
      agentRole: "Product Planner",
      deliverables: ["제품 브리프", "MVP/Out-of-scope 목록", "콘텐츠/운영 플로우 초안"],
      acceptanceCriteria: [
        "참고 서비스와 차별점이 분리되어 있다.",
        "MVP에 포함할 공개/서비스/관리자 흐름이 체크리스트로 정리되어 있다.",
        "후속 task가 참조할 build assumptions가 명시되어 있다.",
      ],
    }),
    pbTask({
      key: "PB-PLAN-002",
      phase: "00 기획/결정",
      title: "기획 폼/운영 intake 구조 설계",
      description: "외주 제작 반복에 필요한 질문지와 고객 답변 구조를 Product Builder intake로 정리한다.",
      category: "planning",
      priority: "medium",
      capabilityKey: "product-builder.intake-form",
      agentRole: "Product Planner",
      dependsOn: ["PB-PLAN-001"],
      deliverables: ["고객 입력 폼 스키마", "필수/선택 질문", "에이전트 보강 질문 목록"],
      acceptanceCriteria: [
        "고객이 답해야 할 질문과 에이전트가 추론해도 되는 질문이 분리되어 있다.",
        "입력값이 issue template 생성에 직접 매핑된다.",
      ],
    }),
    pbTask({
      key: "PB-REUSE-001",
      phase: "00 기획/결정",
      title: "기존 capability 감사",
      description: `product-builder-base(${PRODUCT_BUILDER_BASE_GITHUB_URL}, ${PRODUCT_BUILDER_BASE_LOCAL_PATH})와 Flotter 등 회사 제품 reference의 인증, 앱 구조, 서버, 관리자, 결제, 알림 기능을 capability 단위로 감사하고 REUSE/EXTEND/NEW/N/A를 판정한다.`,
      decision: "REUSE",
      category: "reuse-audit",
      priority: "high",
      capabilityKey: "company.capability-registry",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.capabilityRegistry,
      agentRole: "Solution Architect",
      dependsOn: ["PB-PLAN-001"],
      deliverables: ["Capability decision board", "재사용 근거", "확장 필요 기능 목록"],
      acceptanceCriteria: [
        "동일 기능은 새 구현 issue가 아니라 REUSE 또는 EXTEND로 표시된다.",
        "각 REUSE task는 product-builder-base의 capability path와 base tag/commit을 가진다.",
        "Flotter는 reference로만 기록하고 고객 납품 repo의 직접 재사용 source로 쓰지 않는다.",
        "재사용 근거와 불가 사유가 issue 본문에 남아 있다.",
      ],
    }),
    pbTask({
      key: "PB-DECIDE-001",
      phase: "00 기획/결정",
      title: "provider/운영 결정값 확정",
      description: "ORM, 인증 provider, 결제 provider, 알림 채널, 로그 sink, admin 역할 모델, 배포 승인 gate 같은 선택값을 확정한다.",
      category: "planning",
      priority: "critical",
      capabilityKey: "workflow.decision-dashboard",
      agentRole: "Delivery Lead",
      dependsOn: ["PB-PLAN-001"],
      deliverables: ["결정 대시보드", "선택되지 않은 task의 N/A 판정", "EXTEND/REUSE 근거"],
      acceptanceCriteria: [
        "선택값이 비어 있으면 관련 downstream task를 ready로 보지 않는다.",
        "선택되지 않은 provider task는 삭제하지 않고 N/A로 SKIP 처리한다.",
      ],
    }),
    pbTask({
      key: "PB-FEAT-001",
      phase: "00 기획/결정",
      title: "도메인 기능 발굴",
      description: "고객 intake와 참고 서비스를 바탕으로 이 프로젝트에 반드시 필요한 도메인 기능 후보를 기능 카드로 발굴한다.",
      category: "planning",
      priority: "critical",
      capabilityKey: "domain.feature-discovery",
      agentRole: "Product Planner",
      dependsOn: ["PB-PLAN-001", "PB-PLAN-002"],
      deliverables: ["도메인 기능 후보 목록", "MVP/후순위 구분", "공개/앱/관리자/AI 영역 매핑", "REUSE/EXTEND/NEW/N/A 초안"],
      acceptanceCriteria: [
        "CRUD만으로 설명되지 않는 제품 고유 기능이 카드 단위로 드러나 있다.",
        "각 기능 카드가 대상 영역과 사용자 가치를 가진다.",
        "특정 고객 구현 내용은 blueprint 자체가 아니라 기능 카드 입력값에만 남긴다.",
      ],
    }),
    pbTask({
      key: "PB-FEAT-002",
      phase: "00 기획/결정",
      title: "기능 카드 확정",
      description: "발굴된 도메인 기능 카드를 operator가 승인할 수 있는 수준으로 정리하고 구현 여부와 decision을 확정한다.",
      category: "planning",
      priority: "critical",
      capabilityKey: "domain.feature-card-approval",
      agentRole: "Delivery Lead",
      dependsOn: ["PB-FEAT-001", "PB-REUSE-001", "PB-DECIDE-001"],
      deliverables: ["승인된 기능 카드", "기능별 decision", "기능별 target surface", "MVP 범위"],
      acceptanceCriteria: [
        "승인되지 않은 기능은 구현 issue로 확장하지 않는다.",
        "각 기능 카드에 DATA/API/화면/Admin/AI/QA 중 필요한 확장 단위가 결정되어 있다.",
        "기능 카드의 decision은 생성되는 반복 issue에 전파된다.",
      ],
    }),
    pbTask({
      key: "PB-FEAT-003",
      phase: "00 기획/결정",
      title: "기능별 issue 확장 결과 검수/락",
      description: "확정된 기능 카드에서 파생된 DATA, API, 공개/앱/관리자/AI 화면, QA issue 목록을 검수하고 구현 착수 전 scope를 잠근다.",
      category: "planning",
      priority: "critical",
      capabilityKey: "domain.feature-issue-lock",
      agentRole: "Product Builder Orchestrator",
      dependsOn: ["PB-FEAT-002"],
      deliverables: ["기능별 확장 issue 검수 결과", "누락/중복 조정 내역", "구현 착수 scope lock"],
      acceptanceCriteria: [
        "기능별 issue는 고정 task catalog와 분리된 추가 issue로 생성되어 있다.",
        "REUSE/N/A 기능 issue는 완료된 SKIP 기록으로 생성된다.",
        "생성된 issue는 해당 영역과 target path를 명시한다.",
        "검수 완료 전에는 도메인 데이터/API/화면 구현을 ready로 보지 않는다.",
      ],
    }),
    pbTask({
      key: "PB-BASE-001",
      phase: "01 기준 코드베이스",
      title: "product-builder-base 기준 코드베이스 검증",
      description: `외주 납품용 온라인 서비스의 실제 구현 기준이 되는 product-builder-base repo 상태를 확인한다. 기준 원격은 ${PRODUCT_BUILDER_BASE_GITHUB_URL}, 로컬 path는 ${PRODUCT_BUILDER_BASE_LOCAL_PATH}, 기본 branch는 ${PRODUCT_BUILDER_BASE_DEFAULT_BRANCH}다. PB-BASE-001은 base repo URL/path/ref와 capability registry를 검증하는 gate이며, Flotter는 보강 reference로만 사용한다.`,
      decision: "EXTEND",
      category: "foundation",
      priority: "critical",
      capabilityKey: "base.product-builder-base",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.repoRoot,
      agentRole: "Solution Architect",
      dependsOn: ["PB-REUSE-001", "PB-DECIDE-001"],
      deliverables: [
        "base repo readiness report",
        `product-builder-base repo URL/path: ${PRODUCT_BUILDER_BASE_GITHUB_URL} / ${PRODUCT_BUILDER_BASE_LOCAL_PATH}`,
        "base tag/commit/version",
        "capability registry source map",
        "reference/import 범위",
        "고객별 파생 전략",
      ],
      acceptanceCriteria: [
        "product-builder-base가 실제 구현 source-of-truth인지 확인되어 있다.",
        `base repo URL이 ${PRODUCT_BUILDER_BASE_GITHUB_URL}로 기록되어 있다.`,
        `local base path가 ${PRODUCT_BUILDER_BASE_LOCAL_PATH}로 기록되어 있다.`,
        `default branch가 ${PRODUCT_BUILDER_BASE_DEFAULT_BRANCH}로 기록되어 있다.`,
        "base repo URL/path, default branch, tag 또는 commit SHA가 기록되어 있다.",
        "auth/session-core, auth/email, auth/signup-policy-profile, auth/account-settings, auth/public-action-modal, file-upload/vercel-blob, video-lecture/cloudflare-stream, admin/user-management capability path가 registry에 기록되어 있다.",
        "각 REUSE task는 `product-builder-base:<path>@<tag-or-commit>` 형식의 출처를 가진다.",
        "출처 path/ref를 증명하지 못한 REUSE task는 완료 처리하지 않고 EXTEND/NEW 또는 base 준비 blocker로 전환한다.",
        "Flotter는 직접 납품 repo가 아니라 reference로만 쓰인다.",
      ],
    }),
    pbTask({
      key: "PB-REPO-001",
      phase: "01 기준 코드베이스",
      title: "고객 납품 repo/workspace 연결",
      description: "product-builder-base에서 파생될 실제 고객 납품 repo, Paperclip execution workspace, branch 전략, PR/배포 연결을 확정한다.",
      category: "foundation",
      priority: "critical",
      capabilityKey: "delivery.repo-workspace-binding",
      agentRole: "Delivery Lead",
      surfaces: ["base", "ops"],
      targetPaths: ["customer delivery repo", "Paperclip execution workspace"],
      dependsOn: ["PB-BASE-001"],
      deliverables: ["고객 repo URL", "execution workspace 경로", "branch/PR 전략", "Vercel 연결 대상"],
      acceptanceCriteria: [
        "실행 에이전트가 작업할 repo/workspace가 명시되어 있다.",
        "고객 납품 repo와 product-builder-base의 관계가 문서화되어 있다.",
        "후속 구현 issue가 fallback cwd가 아니라 이 workspace를 기준으로 실행될 수 있다.",
      ],
    }),
    pbTask({
      key: "PB-FOUND-001",
      phase: "01 프로젝트 기반",
      title: "Next.js 온라인 서비스 프로젝트 세팅",
      description: "product-builder-base를 기준으로 SEO/AEO/GEO 대응 Next.js App Router 공개 서비스, private 앱 영역, 관리자 진입점을 구성한다.",
      category: "foundation",
      priority: "high",
      capabilityKey: "stack.nextjs-service",
      agentRole: "Frontend Foundation",
      dependsOn: ["PB-REPO-001"],
      deliverables: ["Next.js 앱", "라우팅/레이아웃", "환경변수 구조", "기본 품질 게이트", "Vercel 기본 설정"],
      acceptanceCriteria: [
        "공개 페이지가 SSR/metadata를 사용할 수 있다.",
        "빌드/타입체크/린트 명령이 문서화되어 있다.",
        "고객별 구현은 product-builder-base에서 파생되는 구조다.",
        "Vercel 배포를 전제로 한 env naming이 정리되어 있다.",
      ],
    }),
    pbTask({
      key: "PB-INFRA-001",
      phase: "01 프로젝트 기반",
      title: "Neon/Vercel 환경 연결",
      description: "Product Builder 표준 환경인 Neon Postgres와 Vercel 배포 환경을 연결한다.",
      category: "ops",
      priority: "high",
      capabilityKey: "environment.neon-vercel",
      agentRole: "Platform Engineer",
      dependsOn: ["PB-FOUND-001"],
      deliverables: ["Neon 프로젝트/브랜치", "Vercel 프로젝트", "env mapping", "배포 체크리스트"],
      acceptanceCriteria: [
        "Neon project id, database branch, Vercel project id가 issue에 남아 있다.",
        "DATABASE_URL 등 필수 env가 Production/Preview/Development별로 정의되어 있다.",
        "Vercel Preview/Production env에 필요한 key가 누락 없이 매핑되어 있다.",
        "Neon/Vercel 외 환경은 별도 porting workflow로 분리되어 있다.",
      ],
    }),
    pbTask({
      key: "PB-API-001",
      phase: "02 API/계약",
      title: "REST/OpenAPI 계약 설계",
      description: "공개 서비스, 인증 사용자 기능, 관리자 기능이 공유할 REST + OpenAPI 계약을 정의한다. tRPC는 사용하지 않는다.",
      category: "backend",
      priority: "critical",
      capabilityKey: "api.rest-openapi",
      agentRole: "Backend Architect",
      dependsOn: ["PB-DECIDE-001", "PB-REUSE-001"],
      deliverables: ["OpenAPI spec", "API error contract", "auth scope rules"],
      acceptanceCriteria: [
        "핵심 리소스와 HTTP status/error code가 정의되어 있다.",
        "프론트엔드가 타입 안전성을 얻는 생성 경로가 있다.",
        "tRPC 의존이 없다.",
      ],
    }),
    pbTask({
      key: "PB-UI-001",
      phase: "03 디자인/쉘",
      title: "디자인 시스템과 앱 셸",
      description: "공개 페이지, 로그인 후 서비스 앱, 관리자 앱에서 공유할 디자인 토큰, 컴포넌트, 레이아웃 shell을 구성한다.",
      category: "frontend",
      priority: "high",
      capabilityKey: "ui.design-system-shell",
      agentRole: "Design Engineer",
      dependsOn: ["PB-FOUND-001"],
    }),
    pbTask({
      key: "PB-AUTH-001",
      phase: "04 인증",
      title: "인증/세션 capability 재사용",
      description: "product-builder-base의 사용자, 세션, 토큰, auth error contract, 서버/API/UI 세션 검증 기반을 재사용한다. 신규 구현하지 않고 고객별 차이는 provider/env/정책 task에서만 처리한다.",
      decision: "REUSE",
      category: "backend",
      priority: "high",
      capabilityKey: "auth.session-core",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.authSessionCore,
      agentRole: "Auth Engineer",
      dependsOn: ["PB-API-001"],
      deliverables: ["auth/session 모델", "세션 검증", "auth error contract", "공통 auth client/server helpers"],
      acceptanceCriteria: [
        "인증 상태가 서버/API/UI에서 일관되게 검증된다.",
        "기존 인증 패턴 재사용 부분과 신규 확장 부분이 분리되어 있다.",
        "선택되지 않은 인증 provider는 별도 provider task에서 N/A로 남긴다.",
      ],
    }),
    pbTask({
      key: "PB-AUTH-EMAIL-001",
      phase: "04 인증",
      title: "Email 인증 재사용",
      description: "product-builder-base의 email/password 또는 email link 기반 회원가입, 로그인, 이메일 확인, 비밀번호 재설정 흐름을 재사용한다.",
      decision: "REUSE",
      category: "backend",
      priority: "high",
      capabilityKey: "auth.email",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.authEmail,
      agentRole: "Auth Engineer",
      dependsOn: ["PB-AUTH-001"],
      deliverables: ["email 가입/로그인", "이메일 확인", "비밀번호 재설정", "email auth UI/API"],
      acceptanceCriteria: [
        "email 인증 선택 시 가입, 로그인, 확인, 재설정 흐름이 모두 연결되어 있다.",
        "온라인 서비스 공개 페이지 전체를 로그인 wall로 막지 않는다.",
        "email 인증 미선택 시 N/A 완료 issue로 남고 downstream을 막지 않는다.",
      ],
    }),
    pbTask({
      key: "PB-AUTH-SIGNUP-POLICY-001",
      phase: "04 인증",
      title: "가입 정책/동의/프로필 bootstrap",
      description: "회원가입 시 필수 약관, 개인정보 처리방침, 선택 마케팅 수신 동의, 가입 출처, 기본 프로필 생성, 고객별 가입 제한 조건을 인증 흐름에 연결한다.",
      decision: "REUSE",
      category: "backend",
      priority: "high",
      capabilityKey: "auth.signup-policy-profile",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.authSignupPolicyProfile,
      agentRole: "Auth Engineer",
      surfaces: ["api", "app", "admin"],
      dependsOn: ["PB-AUTH-EMAIL-001"],
      deliverables: ["가입 동의 모델", "필수/선택 동의 validation", "기본 프로필 생성 hook", "가입 출처/정책 audit field"],
      acceptanceCriteria: [
        "필수 약관과 개인정보 동의 없이는 회원가입이 완료되지 않는다.",
        "선택 마케팅 수신 동의는 필수 동의와 분리되어 저장된다.",
        "가입 완료 시 사용자 기본 프로필과 운영에 필요한 최소 메타데이터가 생성된다.",
        "고객별 가입 제한 조건이 있으면 hardcoded UI가 아니라 policy로 분리된다.",
      ],
    }),
    pbTask({
      key: "PB-AUTH-OAUTH-GOOGLE-001",
      phase: "04 인증",
      title: "Google OAuth 인증",
      description: "Google OAuth provider, callback URL, env/secrets, 로그인 버튼, 계정 연결 처리를 구현한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "medium",
      capabilityKey: "auth.oauth.google",
      reuseSource: "선택되지 않은 OAuth provider",
      agentRole: "Auth Engineer",
      dependsOn: ["PB-AUTH-001"],
      deliverables: ["Google provider 설정", "callback/env 문서", "Google 로그인 UI", "계정 연결 처리"],
      acceptanceCriteria: [
        "Google OAuth 선택 시 callback과 env 이름이 문서화되어 있다.",
        "미선택 시 N/A 완료 issue로 남는다.",
      ],
    }),
    pbTask({
      key: "PB-AUTH-OAUTH-KAKAO-001",
      phase: "04 인증",
      title: "Kakao OAuth 인증",
      description: "Kakao OAuth provider, callback URL, env/secrets, 로그인 버튼, 계정 연결 처리를 구현한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "medium",
      capabilityKey: "auth.oauth.kakao",
      reuseSource: "선택되지 않은 OAuth provider",
      agentRole: "Auth Engineer",
      dependsOn: ["PB-AUTH-001"],
      deliverables: ["Kakao provider 설정", "callback/env 문서", "Kakao 로그인 UI", "계정 연결 처리"],
      acceptanceCriteria: [
        "Kakao OAuth 선택 시 callback과 env 이름이 문서화되어 있다.",
        "미선택 시 N/A 완료 issue로 남는다.",
      ],
    }),
    pbTask({
      key: "PB-AUTH-OAUTH-NAVER-001",
      phase: "04 인증",
      title: "Naver OAuth 인증",
      description: "Naver OAuth provider, callback URL, env/secrets, 로그인 버튼, 계정 연결 처리를 구현한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "medium",
      capabilityKey: "auth.oauth.naver",
      reuseSource: "선택되지 않은 OAuth provider",
      agentRole: "Auth Engineer",
      dependsOn: ["PB-AUTH-001"],
      deliverables: ["Naver provider 설정", "callback/env 문서", "Naver 로그인 UI", "계정 연결 처리"],
      acceptanceCriteria: [
        "Naver OAuth 선택 시 callback과 env 이름이 문서화되어 있다.",
        "미선택 시 N/A 완료 issue로 남는다.",
      ],
    }),
    pbTask({
      key: "PB-AUTH-002",
      phase: "04 인증",
      title: "권한/존 분리 재사용",
      description: "product-builder-base의 public/private/admin 영역과 사용자/운영자/admin role guard 패턴을 재사용한다.",
      decision: "REUSE",
      category: "backend",
      priority: "high",
      capabilityKey: "auth.zone-rbac",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.authZoneRbac,
      agentRole: "Auth Engineer",
      dependsOn: [
        "PB-AUTH-001",
        "PB-AUTH-EMAIL-001",
        "PB-AUTH-SIGNUP-POLICY-001",
        "PB-AUTH-OAUTH-GOOGLE-001",
        "PB-AUTH-OAUTH-KAKAO-001",
        "PB-AUTH-OAUTH-NAVER-001",
        "PB-UI-001",
      ],
      deliverables: ["public/private/admin zone map", "guest/user/admin/super_admin role matrix", "API guard policy", "redirect/modal policy"],
      acceptanceCriteria: [
        "공개 페이지는 로그인 wall로 막지 않고 보호 액션만 인증을 요구한다.",
        "guest/user/admin/super_admin 역할별 접근 가능 route와 API scope가 명시되어 있다.",
        "비관리자는 관리자 route와 admin API에 접근할 수 없다.",
        "선택되지 않은 OAuth provider task가 N/A여도 zone/RBAC task를 막지 않는다.",
      ],
    }),
    pbTask({
      key: "PB-SET-001",
      phase: "04 인증",
      title: "사용자 설정/계정 관리 재사용",
      description: "프로필, 이메일 변경, 비밀번호 변경, 소셜 계정 연결, 계정 삭제, 전체 세션 로그아웃 같은 사용자 계정 관리 흐름을 product-builder-base에서 재사용한다.",
      decision: "REUSE",
      category: "frontend",
      priority: "medium",
      capabilityKey: "auth.account-settings",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.authAccountSettings,
      agentRole: "Full-stack Engineer",
      dependsOn: ["PB-AUTH-001", "PB-AUTH-002", "PB-UI-001"],
      deliverables: ["계정 설정 UI", "계정 변경 API", "민감 작업 재인증", "세션 정리"],
      acceptanceCriteria: [
        "민감 작업은 재인증 또는 동등한 보호 장치를 거친다.",
        "사용자 계정 변경이 auth/session 상태와 일관되게 반영된다.",
      ],
    }),
    pbTask({
      key: "PB-AUTH-PROFILE-READ-001",
      phase: "04 인증",
      title: "내 프로필 조회 API/UI",
      description: "로그인 사용자의 프로필, 이메일 인증 상태, 연결된 소셜 계정 요약, 서비스 권한 요약을 조회하는 REST/OpenAPI endpoint와 설정 화면 read state를 구현한다.",
      decision: "REUSE",
      category: "backend",
      priority: "medium",
      capabilityKey: "auth.account.profile.read",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.authAccountProfile,
      agentRole: "Full-stack Engineer",
      surfaces: ["api", "app"],
      dependsOn: ["PB-SET-001"],
      deliverables: ["GET /me/profile", "설정 화면 read state", "OpenAPI schema", "권한 테스트"],
      acceptanceCriteria: [
        "사용자는 자기 프로필과 계정 상태만 조회할 수 있다.",
        "응답에는 민감한 provider token이나 내부 인증 secret이 포함되지 않는다.",
      ],
    }),
    pbTask({
      key: "PB-AUTH-PROFILE-UPDATE-001",
      phase: "04 인증",
      title: "내 프로필 수정 API/UI",
      description: "이름, 표시명, 프로필 이미지, 선택 프로필 필드를 수정하는 REST/OpenAPI endpoint와 설정 화면 update flow를 구현한다.",
      decision: "REUSE",
      category: "backend",
      priority: "medium",
      capabilityKey: "auth.account.profile.update",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.authAccountProfile,
      agentRole: "Full-stack Engineer",
      surfaces: ["api", "app"],
      dependsOn: ["PB-AUTH-PROFILE-READ-001"],
      deliverables: ["PATCH /me/profile", "입력 validation", "설정 화면 form", "API/UI 테스트"],
      acceptanceCriteria: [
        "허용된 프로필 필드만 수정할 수 있다.",
        "수정 후 session/user cache가 일관되게 갱신된다.",
      ],
    }),
    pbTask({
      key: "PB-AUTH-EMAIL-CHANGE-001",
      phase: "04 인증",
      title: "이메일 변경/재인증 API/UI",
      description: "사용자 이메일 변경 요청, 확인 메일 발송, 토큰 검증, 기존/신규 이메일 상태 전이를 REST/OpenAPI와 설정 화면에 연결한다.",
      decision: "REUSE",
      category: "backend",
      priority: "high",
      capabilityKey: "auth.account.email.change",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.authEmailChange,
      agentRole: "Auth Engineer",
      surfaces: ["api", "app"],
      dependsOn: ["PB-AUTH-EMAIL-001", "PB-AUTH-PROFILE-READ-001", "PB-NOTI-EMAIL-RESEND-001"],
      deliverables: ["POST /me/email-change", "confirm endpoint", "재인증/토큰 검증", "설정 화면 flow"],
      acceptanceCriteria: [
        "이메일 변경은 확인 전까지 로그인 식별자를 안전하게 유지한다.",
        "확인 메일 발송 실패와 만료 token이 사용자에게 명확히 표시된다.",
      ],
    }),
    pbTask({
      key: "PB-AUTH-PASSWORD-CHANGE-001",
      phase: "04 인증",
      title: "비밀번호 변경 API/UI",
      description: "현재 비밀번호 확인, 새 비밀번호 정책 검증, 다른 세션 revoke 옵션, 오류 메시지 매핑을 REST/OpenAPI와 설정 화면에 연결한다.",
      decision: "REUSE",
      category: "backend",
      priority: "high",
      capabilityKey: "auth.account.password.change",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.authPasswordChange,
      agentRole: "Auth Engineer",
      surfaces: ["api", "app"],
      dependsOn: ["PB-AUTH-EMAIL-001", "PB-AUTH-PROFILE-READ-001"],
      deliverables: ["POST /me/password", "password policy validation", "session revoke option", "API/UI 테스트"],
      acceptanceCriteria: [
        "비밀번호 변경은 민감 작업 보호를 거친다.",
        "변경 후 기존 세션 유지/해제 정책이 명확히 적용된다.",
      ],
    }),
    pbTask({
      key: "PB-AUTH-SESSIONS-LIST-001",
      phase: "04 인증",
      title: "내 세션/기기 목록 조회 API/UI",
      description: "현재 로그인 세션과 다른 기기 세션 목록, 생성/최근 사용 시각, user agent, IP 요약을 조회하는 REST/OpenAPI endpoint와 설정 화면을 구현한다.",
      decision: "REUSE",
      category: "backend",
      priority: "medium",
      capabilityKey: "auth.account.sessions.read",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.authSessionManagement,
      agentRole: "Auth Engineer",
      surfaces: ["api", "app"],
      dependsOn: ["PB-AUTH-PROFILE-READ-001"],
      deliverables: ["GET /me/sessions", "기기 목록 UI", "민감정보 redaction", "권한 테스트"],
      acceptanceCriteria: [
        "사용자는 자기 세션만 조회할 수 있다.",
        "session token 원문이나 민감한 식별자는 응답하지 않는다.",
      ],
    }),
    pbTask({
      key: "PB-AUTH-SESSIONS-REVOKE-001",
      phase: "04 인증",
      title: "세션 해제/전체 로그아웃 API/UI",
      description: "특정 세션 해제, 다른 모든 세션 로그아웃, 현재 세션 로그아웃 후 상태 정리를 REST/OpenAPI와 설정 화면에 연결한다.",
      decision: "REUSE",
      category: "backend",
      priority: "high",
      capabilityKey: "auth.account.sessions.revoke",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.authSessionManagement,
      agentRole: "Auth Engineer",
      surfaces: ["api", "app"],
      dependsOn: ["PB-AUTH-SESSIONS-LIST-001"],
      deliverables: ["DELETE /me/sessions/:id", "POST /me/sessions/revoke-others", "설정 화면 action", "회귀 테스트"],
      acceptanceCriteria: [
        "다른 사용자의 session id를 해제할 수 없다.",
        "현재 세션 해제와 다른 세션 해제의 redirect/cache 정리가 일관된다.",
      ],
    }),
    pbTask({
      key: "PB-AUTH-ACCOUNT-DELETE-001",
      phase: "04 인증",
      title: "계정 탈퇴/비활성 API/UI",
      description: "사용자 계정 탈퇴 요청, 재인증, 데이터 보존/익명화 정책, 세션 종료, 관리자 감사 로그를 REST/OpenAPI와 설정 화면에 연결한다.",
      decision: "REUSE",
      category: "backend",
      priority: "high",
      capabilityKey: "auth.account.delete",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.authAccountLifecycle,
      agentRole: "Auth Engineer",
      surfaces: ["api", "app", "admin"],
      dependsOn: ["PB-AUTH-PROFILE-READ-001", "PB-AUTH-SESSIONS-REVOKE-001"],
      deliverables: ["DELETE /me/account", "재인증", "데이터 보존/익명화 정책", "탈퇴 UI", "감사 로그"],
      acceptanceCriteria: [
        "탈퇴는 실수 방지 확인과 민감 작업 보호를 거친다.",
        "법적/운영 보존 데이터와 삭제/익명화 데이터가 분리되어 있다.",
      ],
    }),
    pbTask({
      key: "PB-AUTH-QA-001",
      phase: "04 인증",
      title: "재사용 인증 통합 QA",
      description: "재사용한 email 인증, OAuth 선택 provider, 로그인 모달, 프로필 read/update, 이메일/비밀번호 변경, 세션 list/revoke, 계정 탈퇴가 고객 납품 repo와 배포 환경에서 동작하는지 E2E와 API 테스트로 검증한다.",
      decision: "NEW",
      category: "qa",
      priority: "high",
      capabilityKey: "auth.account.qa",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.authQaChecklist,
      agentRole: "QA Engineer",
      surfaces: ["qa"],
      dependsOn: [
        "PB-AUTH-003",
        "PB-AUTH-SIGNUP-POLICY-001",
        "PB-AUTH-PROFILE-UPDATE-001",
        "PB-AUTH-EMAIL-CHANGE-001",
        "PB-AUTH-PASSWORD-CHANGE-001",
        "PB-AUTH-SESSIONS-REVOKE-001",
        "PB-AUTH-ACCOUNT-DELETE-001",
      ],
      deliverables: ["인증 E2E 결과", "계정 CRUD 테스트", "세션 revoke 증거", "잔여 리스크"],
      acceptanceCriteria: [
        "기본 email 인증과 선택 OAuth provider별 성공/실패 흐름이 검증된다.",
        "프로필 조회/수정, 세션 조회/해제, 계정 탈퇴가 개별 증거로 남는다.",
      ],
    }),
    pbTask({
      key: "PB-AUTH-003",
      phase: "04 인증",
      title: "공개 사이트 액션 기반 로그인 모달 재사용",
      description: "온라인 서비스의 공개 페이지는 비로그인 상태로 탐색 가능하게 두고, 저장/구매/이용 시작/개인화/내 공간 진입 같은 액션에서 로그인/회원가입 모달을 띄우는 product-builder-base 패턴을 재사용한다.",
      decision: "REUSE",
      category: "frontend",
      priority: "high",
      capabilityKey: "auth.public-action-modal",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.authPublicActionModal,
      agentRole: "Frontend Engineer",
      surfaces: ["landing", "app"],
      targetPaths: ["apps/web", "apps/app"],
      dependsOn: ["PB-AUTH-002", "PB-WEB-001"],
      deliverables: ["auth modal shell", "gated action hook", "로그인/회원가입 전환", "public browse regression"],
      acceptanceCriteria: [
        "홈/목록/상세 등 공개 페이지는 비로그인 상태에서도 볼 수 있다.",
        "보호가 필요한 CTA와 기능 액션은 페이지 이동 차단이 아니라 auth modal을 연다.",
        "로그인 성공 후 사용자가 시도한 액션 또는 목적지로 복귀한다.",
        "이 패턴은 product-builder-base 템플릿 기본값으로 들어가고 고객별 문구/CTA만 조정한다.",
      ],
    }),
    pbTask({
      key: "PB-DATA-001",
      phase: "05 도메인 기반",
      title: "서비스 도메인 데이터 모델",
      description: "선택된 서비스 유형의 핵심 리소스, 사용자 소유 데이터, 상태값, 공개/비공개 필드, 인덱스를 Neon schema로 설계한다.",
      category: "backend",
      priority: "high",
      capabilityKey: "domain.service-schema",
      agentRole: "Data Engineer",
      dependsOn: ["PB-API-001", "PB-AUTH-002", "PB-FEAT-003"],
      deliverables: ["DB schema", "migration", "seed data", "ERD", "도메인 resource map"],
      acceptanceCriteria: [
        "공개 조회와 관리자 편집에 필요한 인덱스가 포함되어 있다.",
        "public/private/admin에서 보는 필드와 상태가 분리되어 있다.",
      ],
    }),
    pbTask({
      key: "PB-INFRA-002",
      phase: "05 도메인 기반",
      title: "Neon migration/DB smoke 검증",
      description: "Neon 개발/스테이징 브랜치에 migration과 seed를 적용하고, 앱 서버가 실제 DATABASE_URL로 연결되는지 smoke query로 검증한다.",
      category: "ops",
      priority: "high",
      capabilityKey: "environment.neon-migration-smoke",
      agentRole: "Platform Engineer",
      surfaces: ["api", "ops"],
      targetPaths: ["apps/api", "Neon / Vercel"],
      dependsOn: ["PB-INFRA-001", "PB-DATA-001", "PB-FEAT-003"],
      deliverables: ["migration 적용 로그", "seed 결과", "DB health check", "rollback note"],
      acceptanceCriteria: [
        "Neon branch에 migration이 실제 적용되어 있다.",
        "앱 서버가 Vercel/로컬 env의 DATABASE_URL로 DB health check를 통과한다.",
        "실패 시 rollback 또는 재적용 절차가 issue에 남아 있다.",
      ],
    }),
    pbTask({
      key: "PB-DOMAIN-001",
      phase: "05 도메인 기반",
      title: "핵심 서비스 REST API",
      description: "선택된 도메인의 핵심 리소스 CRUD/조회/상태 변경 API를 OpenAPI 계약에 맞춰 구현한다.",
      category: "backend",
      priority: "high",
      capabilityKey: "domain.service-api",
      agentRole: "Backend Engineer",
      dependsOn: ["PB-DATA-001", "PB-INFRA-002", "PB-AUTH-002"],
    }),
    pbTask({
      key: "PB-FILE-001",
      phase: "05 파일 업로드",
      title: "Vercel Blob 파일 업로드 capability 범위",
      description: `파일 업로드를 Product Builder 기본 제공 feature로 고정하고, product-builder-base 구현 작업에 이 issue 묶음을 전달한다. 기본 provider는 Vercel Blob이며 최초 구현은 공식 문서 ${VERCEL_BLOB_DOCS_URL}, client upload 문서 ${VERCEL_BLOB_CLIENT_UPLOAD_DOCS_URL}, server upload 문서 ${VERCEL_BLOB_SERVER_UPLOAD_DOCS_URL}를 기준으로 한다. BLOB_READ_WRITE_TOKEN, 공개/비공개 접근 정책, 파일 타입/크기 제한, 삭제/정리 정책을 확정한다.`,
      decision: "EXTEND",
      category: "reuse-audit",
      priority: "critical",
      capabilityKey: "file-upload.vercel-blob.scope",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.fileUploadCore,
      agentRole: "Solution Architect",
      surfaces: ["planning", "api", "ops"],
      dependsOn: ["PB-BASE-001", "PB-INFRA-001", "PB-DECIDE-001"],
      deliverables: ["파일 업로드 capability 범위", "Vercel Blob store/env checklist", "접근/보존/삭제 정책", "base 구현 전달 issue 목록"],
      acceptanceCriteria: [
        "파일 업로드는 선택형 도메인 카드가 아니라 Product Builder 기본 feature로 분류되어 있다.",
        `공식 Vercel Blob 문서 URL이 issue에 남아 있다: ${VERCEL_BLOB_DOCS_URL}`,
        `client upload 구현 기준 URL이 issue에 남아 있다: ${VERCEL_BLOB_CLIENT_UPLOAD_DOCS_URL}`,
        `server upload 구현 기준 URL이 issue에 남아 있다: ${VERCEL_BLOB_SERVER_UPLOAD_DOCS_URL}`,
        "`BLOB_READ_WRITE_TOKEN`을 Vercel Development/Preview/Production env에 어떻게 넣는지 기록되어 있다.",
        "파일 타입, 최대 크기, 소유자/대상 리소스, 공개 URL 허용 여부, 삭제/retention 정책이 구현 전 확정되어 있다.",
        "product-builder-base에 구현할 때 PB-FILE-* issue 묶음을 그대로 전달할 수 있다.",
      ],
    }),
    pbTask({
      key: "PB-FILE-DATA-001",
      phase: "05 파일 업로드",
      title: "파일 metadata/권한 데이터 모델",
      description: "업로드 파일의 owner, target resource, pathname/blob url, content type, size, checksum, visibility, status, scan/review state, deletedAt, audit fields를 Neon schema와 OpenAPI schema로 구현한다. product-builder-base 구현 작업에 이 issue를 전달한다.",
      decision: "EXTEND",
      category: "backend",
      priority: "high",
      capabilityKey: "file-upload.data-model",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.fileUploadDataModel,
      agentRole: "Data Engineer",
      dependsOn: ["PB-FILE-001", "PB-DATA-001"],
      deliverables: ["file_assets schema", "target resource relation", "visibility/status enum", "migration", "OpenAPI schema"],
      acceptanceCriteria: [
        "파일 메타데이터는 Blob URL만 저장하지 않고 소유자, 대상 리소스, 상태, 크기, MIME type, 삭제 상태를 가진다.",
        "사용자 업로드 파일과 관리자/시스템 생성 파일을 구분할 수 있다.",
        "클라이언트가 보낸 MIME type/size만 신뢰하지 않고 서버 검증 결과를 저장한다.",
        "삭제된 파일은 감사와 정리 작업을 위해 상태와 deletedAt을 남길 수 있다.",
      ],
    }),
    pbTask({
      key: "PB-FILE-API-CREATE-001",
      phase: "05 파일 업로드",
      title: "파일 업로드 생성/token API",
      description: `사용자가 파일 업로드를 시작할 때 대상 리소스, 파일명, MIME type, 크기, visibility를 검증하고 Vercel Blob client upload 흐름에 필요한 서버 endpoint/token/metadata draft를 생성한다. 최초 구현은 ${VERCEL_BLOB_CLIENT_UPLOAD_DOCS_URL}를 기준으로 하며 업로드 토큰, callback, pathname 정책을 추론하지 않는다.`,
      decision: "EXTEND",
      category: "backend",
      priority: "critical",
      capabilityKey: "file-upload.api.create",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.fileUploadApi,
      agentRole: "Backend Engineer",
      dependsOn: ["PB-FILE-DATA-001", "PB-AUTH-002"],
      deliverables: ["POST /files/uploads", "upload authorization", "pathname policy", "pending metadata", "OpenAPI schema", "API 테스트"],
      acceptanceCriteria: [
        "인증/권한이 없는 사용자는 업로드 토큰 또는 업로드 시작 정보를 받을 수 없다.",
        "허용되지 않은 MIME type, 확장자, 크기는 422 또는 정책 오류로 거부된다.",
        "Blob pathname은 충돌/추측이 어려운 서버 정책으로 생성된다.",
        `Vercel Blob client upload 파라미터와 callback 흐름은 공식 문서 ${VERCEL_BLOB_CLIENT_UPLOAD_DOCS_URL} 기준으로 검증된다.`,
      ],
    }),
    pbTask({
      key: "PB-FILE-API-COMPLETE-001",
      phase: "05 파일 업로드",
      title: "파일 업로드 완료 확정 API",
      description: "Vercel Blob 업로드 완료 후 blob URL/pathname, size, content type, client payload, 대상 리소스 연결을 서버에서 재검증하고 file metadata를 active 상태로 확정한다. 실패/취소/중복 callback은 idempotent하게 처리한다.",
      decision: "EXTEND",
      category: "backend",
      priority: "critical",
      capabilityKey: "file-upload.api.complete",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.fileUploadApi,
      agentRole: "Backend Engineer",
      dependsOn: ["PB-FILE-API-CREATE-001"],
      deliverables: ["POST /files/uploads/complete", "idempotent completion", "metadata activation", "orphan rollback policy", "API 테스트"],
      acceptanceCriteria: [
        "업로드 완료 요청은 pending metadata와 매칭되어야 하며 임의 Blob URL을 주입할 수 없다.",
        "중복 완료/callback 요청은 같은 file asset으로 수렴한다.",
        "완료 실패 또는 취소된 업로드의 orphan 정리 정책이 있다.",
        "client upload 결과만 믿지 않고 서버 상태와 권한을 다시 확인한다.",
      ],
    }),
    pbTask({
      key: "PB-FILE-API-LIST-001",
      phase: "05 파일 업로드",
      title: "파일 목록 조회 API",
      description: "사용자/관리자/대상 리소스별 파일 목록, 필터, pagination, status, visibility를 조회하는 REST/OpenAPI endpoint를 구현한다.",
      decision: "EXTEND",
      category: "backend",
      priority: "high",
      capabilityKey: "file-upload.api.list",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.fileUploadApi,
      agentRole: "Backend Engineer",
      dependsOn: ["PB-FILE-API-COMPLETE-001"],
      deliverables: ["GET /files", "GET /admin/files", "target resource filter", "pagination", "권한 테스트"],
      acceptanceCriteria: [
        "사용자는 자기 소유 또는 접근 허용된 파일만 조회할 수 있다.",
        "관리자는 owner, target, status, visibility, MIME type 기준으로 필터링할 수 있다.",
        "삭제/숨김/검토중 파일의 노출 정책이 일관된다.",
      ],
    }),
    pbTask({
      key: "PB-FILE-API-READ-001",
      phase: "05 파일 업로드",
      title: "파일 상세/접근 URL API",
      description: "파일 상세 metadata, 접근 가능 여부, 공개 URL 또는 제한된 접근 URL 정책을 REST/OpenAPI endpoint로 구현한다. private 파일은 권한 확인 없이 Blob URL만 노출하지 않는다.",
      decision: "EXTEND",
      category: "backend",
      priority: "high",
      capabilityKey: "file-upload.api.read",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.fileUploadApi,
      agentRole: "Backend Engineer",
      dependsOn: ["PB-FILE-API-LIST-001"],
      deliverables: ["GET /files/:id", "access policy", "public/private response contract", "권한 테스트"],
      acceptanceCriteria: [
        "공개 파일과 private 파일의 응답 필드/URL 정책이 분리되어 있다.",
        "권한 없는 사용자는 파일 존재 여부를 과도하게 추론할 수 없다.",
        "대상 도메인 리소스 권한과 파일 접근 권한이 같이 검증된다.",
      ],
    }),
    pbTask({
      key: "PB-FILE-API-UPDATE-001",
      phase: "05 파일 업로드",
      title: "파일 metadata 수정 API",
      description: "파일 표시명, alt text, target resource 연결, visibility, sort order, review status 같은 metadata를 수정하는 REST/OpenAPI endpoint를 구현한다.",
      decision: "EXTEND",
      category: "backend",
      priority: "medium",
      capabilityKey: "file-upload.api.update",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.fileUploadApi,
      agentRole: "Backend Engineer",
      dependsOn: ["PB-FILE-API-READ-001"],
      deliverables: ["PATCH /files/:id", "metadata validation", "visibility policy", "audit log", "API 테스트"],
      acceptanceCriteria: [
        "파일 binary 자체 교체와 metadata 수정이 구분되어 있다.",
        "visibility 변경은 권한과 대상 리소스 정책을 통과해야 한다.",
        "관리자 변경과 사용자 변경이 감사 로그에서 구분된다.",
      ],
    }),
    pbTask({
      key: "PB-FILE-API-DELETE-001",
      phase: "05 파일 업로드",
      title: "파일 삭제/Blob 정리 API",
      description: "파일 soft delete/archive, Vercel Blob 삭제 또는 정리 job, orphan cleanup, 관리자 강제 삭제, 감사 로그를 REST/OpenAPI endpoint와 운영 작업으로 구현한다.",
      decision: "EXTEND",
      category: "backend",
      priority: "high",
      capabilityKey: "file-upload.api.delete",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.fileUploadApi,
      agentRole: "Backend Engineer",
      surfaces: ["api", "ops"],
      dependsOn: ["PB-FILE-API-LIST-001"],
      deliverables: ["DELETE /files/:id", "soft delete policy", "Vercel Blob cleanup", "orphan cleanup job", "감사 로그", "API 테스트"],
      acceptanceCriteria: [
        "사용자는 자기 권한 밖의 파일을 삭제할 수 없다.",
        "DB metadata 삭제/비활성화와 Blob object 삭제 실패 사이 보정 정책이 있다.",
        "orphan Blob 또는 pending metadata 정리 기준이 운영 task로 남는다.",
        "삭제 이후 목록/상세/도메인 리소스 참조가 깨지지 않는다.",
      ],
    }),
    pbTask({
      key: "PB-FILE-UI-001",
      phase: "05 파일 업로드",
      title: "재사용 파일 업로드 UI 컴포넌트",
      description: "product-builder-base에서 재사용할 파일 업로드 컴포넌트, drag/drop, 진행률, 취소/재시도, preview, validation 오류, 대상 리소스 연결 props를 구현한다. 보호된 업로드 액션은 auth modal 패턴을 따른다.",
      decision: "EXTEND",
      category: "frontend",
      priority: "high",
      capabilityKey: "file-upload.ui.component",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.fileUploadUi,
      agentRole: "Frontend Engineer",
      surfaces: ["shared", "app", "admin"],
      dependsOn: ["PB-FILE-API-CREATE-001", "PB-FILE-API-COMPLETE-001", "PB-UI-001", "PB-AUTH-003"],
      deliverables: ["Upload component", "progress/cancel/retry state", "preview state", "validation error UI", "Storybook 또는 component test"],
      acceptanceCriteria: [
        "업로드 전 client validation과 서버 validation 오류를 모두 표시한다.",
        "비로그인 사용자가 보호된 업로드 액션을 시도하면 로그인 페이지 강제 이동이 아니라 auth modal이 열린다.",
        "진행률/취소/실패/재시도/완료 상태가 레이아웃을 흔들지 않는다.",
        "도메인별 form에서 target resource와 허용 파일 정책을 props로 주입할 수 있다.",
      ],
    }),
    pbTask({
      key: "PB-FILE-ADMIN-001",
      phase: "05 파일 업로드",
      title: "파일 관리자/감사 UI",
      description: "관리자에서 파일 목록/상세, owner/target/status 필터, metadata 수정, 삭제/복구, Blob cleanup 결과, 업로드 실패 로그를 확인하고 조치하는 화면을 구현한다.",
      decision: "EXTEND",
      category: "admin",
      priority: "medium",
      capabilityKey: "file-upload.admin-ui",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.fileUploadAdmin,
      agentRole: "Admin Engineer",
      surfaces: ["admin"],
      dependsOn: ["PB-FILE-API-LIST-001", "PB-FILE-API-READ-001", "PB-FILE-API-UPDATE-001", "PB-FILE-API-DELETE-001", "PB-ADMIN-001"],
      deliverables: ["파일 목록/상세 UI", "필터/검색", "metadata 수정", "삭제/복구 action", "cleanup/audit view"],
      acceptanceCriteria: [
        "관리자만 파일 관리 화면에 접근할 수 있다.",
        "파일 owner, target resource, status, visibility, size, createdAt을 확인할 수 있다.",
        "삭제/복구/metadata 변경 작업이 감사 로그로 추적된다.",
      ],
    }),
    pbTask({
      key: "PB-FILE-QA-001",
      phase: "05 파일 업로드",
      title: "파일 업로드 E2E/보안/운영 검증",
      description: "Vercel Blob env, 업로드 시작/완료/list/read/update/delete API, 사용자 UI, 관리자 UI, 권한 오류, 크기/타입 validation, orphan cleanup을 검증한다.",
      decision: "EXTEND",
      category: "qa",
      priority: "critical",
      capabilityKey: "file-upload.qa",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.fileUploadQaChecklist,
      agentRole: "QA Engineer",
      surfaces: ["qa", "ops"],
      dependsOn: ["PB-FILE-UI-001", "PB-FILE-ADMIN-001", "PB-FILE-API-DELETE-001"],
      deliverables: ["업로드 E2E 증거", "권한/validation 테스트", "관리자 파일 관리 테스트", "Vercel Blob env 증거", "orphan cleanup 결과"],
      acceptanceCriteria: [
        "`BLOB_READ_WRITE_TOKEN`이 Development/Preview/Production env에 실제로 존재하는지 확인되어 있다.",
        "허용 파일 업로드 성공, 초과 크기 거부, 금지 MIME type 거부, 권한 없는 접근/삭제 거부가 검증되어 있다.",
        "업로드 완료 후 metadata와 Blob object가 일관되고 삭제/cleanup 후에도 깨진 참조가 없다.",
        "Vercel 배포 URL에서 업로드 UI와 관리자 파일 관리가 동작한다.",
        "base 구현 전이면 이 issue는 product-builder-base 작업 backlog로 전달되어야 하며, 고객별 임시 구현으로 완료 처리하지 않는다.",
      ],
    }),
    pbTask({
      key: "PB-VIDEO-001",
      phase: "05 영상 강의",
      title: "Cloudflare Stream 영상 강의 capability 범위",
      description: `온라인 영상 강의를 Product Builder 선택 feature로 정의하고, provider는 Cloudflare Stream으로 고정한다. product-builder-base 구현 작업에 이 issue 묶음을 전달한다. 최초 구현은 공식 문서 ${CLOUDFLARE_STREAM_DOCS_URL}, direct creator uploads ${CLOUDFLARE_STREAM_DIRECT_UPLOADS_DOCS_URL}, 대용량/재개 업로드 ${CLOUDFLARE_STREAM_TUS_UPLOADS_DOCS_URL}, signed playback ${CLOUDFLARE_STREAM_SIGNED_URLS_DOCS_URL}, webhooks ${CLOUDFLARE_STREAM_WEBHOOKS_DOCS_URL}를 기준으로 하며 추론 구현하지 않는다. 미선택 시 N/A로 SKIP한다.`,
      decision: "N/A",
      category: "reuse-audit",
      priority: "critical",
      capabilityKey: "video-lecture.cloudflare-stream.scope",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.videoLectureCore,
      agentRole: "Solution Architect",
      surfaces: ["planning", "api", "ops"],
      dependsOn: ["PB-BASE-001", "PB-INFRA-001", "PB-DECIDE-001"],
      deliverables: ["영상 강의 feature 범위", "Cloudflare Stream env checklist", "업로드/재생/보안 정책", "base 구현 전달 issue 목록", "미선택 시 N/A 사유"],
      acceptanceCriteria: [
        "영상 강의는 일반 파일 업로드가 아니라 streaming provider feature로 분리되어 있다.",
        `Cloudflare Stream 공식 문서 URL이 issue에 남아 있다: ${CLOUDFLARE_STREAM_DOCS_URL}`,
        `direct creator uploads 기준 URL이 issue에 남아 있다: ${CLOUDFLARE_STREAM_DIRECT_UPLOADS_DOCS_URL}`,
        `대용량/재개 업로드 기준 URL이 issue에 남아 있다: ${CLOUDFLARE_STREAM_TUS_UPLOADS_DOCS_URL}`,
        `signed playback 기준 URL이 issue에 남아 있다: ${CLOUDFLARE_STREAM_SIGNED_URLS_DOCS_URL}`,
        `webhook 기준 URL이 issue에 남아 있다: ${CLOUDFLARE_STREAM_WEBHOOKS_DOCS_URL}`,
        "Cloudflare account id, Stream API token, webhook secret, playback 보안 정책, 영상 보존/삭제 정책이 구현 전 확정되어 있다.",
        "Cloudflare Stream feature 미선택 시 PB-VIDEO-* task는 삭제되지 않고 N/A 완료 issue로 남는다.",
      ],
    }),
    pbTask({
      key: "PB-VIDEO-DATA-001",
      phase: "05 영상 강의",
      title: "영상 강의 metadata/권한 데이터 모델",
      description: "강의/레슨과 Cloudflare Stream asset을 연결하는 metadata schema를 구현한다. course/lesson id, provider asset id, playback uid, upload status, duration, thumbnail, caption/subtitle state, visibility, entitlement requirement, progress aggregation, deletedAt/audit fields를 Neon schema와 OpenAPI schema로 정의한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "critical",
      capabilityKey: "video-lecture.data-model",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.videoLectureDataModel,
      agentRole: "Data Engineer",
      dependsOn: ["PB-VIDEO-001", "PB-DATA-001", "PB-AUTH-002"],
      deliverables: ["video_lessons schema", "provider asset mapping", "processing status enum", "entitlement relation", "progress summary fields", "migration"],
      acceptanceCriteria: [
        "영상 원본 파일은 앱 서버나 Vercel Blob에 저장하지 않고 Cloudflare Stream asset id로 참조한다.",
        "강의/레슨 도메인과 영상 asset metadata가 분리되어 재사용 가능하다.",
        "무료 미리보기, 구매/구독 필요, 관리자 비공개 같은 visibility와 entitlement 정책을 표현할 수 있다.",
        "processing, ready, failed, archived/deleted 상태가 구분된다.",
      ],
    }),
    pbTask({
      key: "PB-VIDEO-API-UPLOAD-001",
      phase: "05 영상 강의",
      title: "영상 direct upload 생성 API",
      description: `관리자 또는 권한 있는 운영자가 강의 영상을 업로드할 수 있도록 Cloudflare Stream direct creator upload 또는 tus 업로드 세션 생성 REST/OpenAPI endpoint를 구현한다. 최초 구현은 ${CLOUDFLARE_STREAM_DIRECT_UPLOADS_DOCS_URL}와 ${CLOUDFLARE_STREAM_TUS_UPLOADS_DOCS_URL}를 기준으로 하며 upload URL, creator, maxDurationSeconds, expiry, metadata, tus 흐름을 추론하지 않는다. 미선택 시 N/A로 SKIP한다.`,
      decision: "N/A",
      category: "backend",
      priority: "critical",
      capabilityKey: "video-lecture.api.upload",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.videoLectureApi,
      agentRole: "Backend Engineer",
      dependsOn: ["PB-VIDEO-DATA-001", "PB-ADMIN-001"],
      deliverables: ["POST /admin/video-lectures/uploads", "Cloudflare upload session", "pending asset metadata", "upload policy validation", "API 테스트"],
      acceptanceCriteria: [
        "관리자 또는 영상 업로드 권한 사용자만 upload session을 만들 수 있다.",
        "허용 영상 형식, 최대 길이, 최대 크기, 업로드 만료 시간이 서버 정책으로 검증된다.",
        `Cloudflare direct upload와 tus upload 흐름은 공식 문서 ${CLOUDFLARE_STREAM_DIRECT_UPLOADS_DOCS_URL}, ${CLOUDFLARE_STREAM_TUS_UPLOADS_DOCS_URL} 기준으로 검증된다.`,
        "업로드 URL이나 Stream API token이 클라이언트에 과도하게 노출되지 않는다.",
      ],
    }),
    pbTask({
      key: "PB-VIDEO-WEBHOOK-001",
      phase: "05 영상 강의",
      title: "Cloudflare Stream 처리 webhook",
      description: `Cloudflare Stream 영상 처리 완료/실패 webhook을 수신해 asset status, duration, thumbnail, playback id, error state를 동기화한다. 최초 구현은 ${CLOUDFLARE_STREAM_WEBHOOKS_DOCS_URL}를 기준으로 하며 event payload, signature/secret, retry behavior를 추론하지 않는다. 미선택 시 N/A로 SKIP한다.`,
      decision: "N/A",
      category: "backend",
      priority: "critical",
      capabilityKey: "video-lecture.webhook",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.videoLectureApi,
      agentRole: "Backend Engineer",
      dependsOn: ["PB-VIDEO-API-UPLOAD-001"],
      deliverables: ["POST /webhooks/cloudflare-stream", "webhook verification", "processing state sync", "idempotency", "failure log"],
      acceptanceCriteria: [
        "webhook secret 또는 Cloudflare가 제공하는 검증 수단이 적용되어 있다.",
        "중복/지연 webhook은 idempotent하게 처리된다.",
        "processing failed 상태와 운영자 재업로드/대체 절차가 남는다.",
        `webhook payload와 검증 방식은 공식 문서 ${CLOUDFLARE_STREAM_WEBHOOKS_DOCS_URL} 기준으로 확인된다.`,
      ],
    }),
    pbTask({
      key: "PB-VIDEO-API-LIST-001",
      phase: "05 영상 강의",
      title: "영상 강의 목록 API",
      description: "공개/사용자/관리자 영역에서 사용할 영상 강의 목록과 상태를 조회하는 REST/OpenAPI endpoint를 구현한다. 무료 미리보기, 구매 필요, 비공개, 처리중/실패 상태를 응답 contract에 반영한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "video-lecture.api.list",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.videoLectureApi,
      agentRole: "Backend Engineer",
      dependsOn: ["PB-VIDEO-DATA-001", "PB-VIDEO-WEBHOOK-001"],
      deliverables: ["GET /video-lectures", "GET /admin/video-lectures", "status/visibility filter", "pagination", "권한 테스트"],
      acceptanceCriteria: [
        "공개 목록은 공개/미리보기 가능한 영상 metadata만 노출한다.",
        "관리자 목록은 처리중/실패/비공개 영상과 provider asset 상태를 확인할 수 있다.",
        "사용자 entitlement 상태에 따라 재생 가능/구매 필요 상태가 분리되어 응답된다.",
      ],
    }),
    pbTask({
      key: "PB-VIDEO-API-READ-001",
      phase: "05 영상 강의",
      title: "영상 강의 상세/status API",
      description: "영상 강의 상세, 처리 상태, duration, thumbnail, caption state, 구매/구독 필요 여부, 내 진행률 요약을 조회하는 REST/OpenAPI endpoint를 구현한다. 실제 재생 token은 별도 playback API에서만 발급한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "video-lecture.api.read",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.videoLectureApi,
      agentRole: "Backend Engineer",
      dependsOn: ["PB-VIDEO-API-LIST-001"],
      deliverables: ["GET /video-lectures/:id", "GET /admin/video-lectures/:id", "viewer entitlement state", "status contract", "권한 테스트"],
      acceptanceCriteria: [
        "재생 권한이 없어도 공개 가능한 설명/커리큘럼 metadata와 재생 token이 분리되어 있다.",
        "processing/failed/private 영상은 사용자에게 재생 가능한 상태로 노출되지 않는다.",
        "관리자는 provider asset id와 상태를 확인할 수 있지만 일반 사용자는 내부 provider id를 과도하게 볼 수 없다.",
      ],
    }),
    pbTask({
      key: "PB-VIDEO-API-UPDATE-001",
      phase: "05 영상 강의",
      title: "영상 강의 metadata 수정 API",
      description: "영상 제목, 설명, 강의/레슨 연결, 무료 미리보기 여부, visibility, 정렬, 썸네일 override, caption/subtitle metadata를 수정하는 REST/OpenAPI endpoint를 구현한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "medium",
      capabilityKey: "video-lecture.api.update",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.videoLectureApi,
      agentRole: "Backend Engineer",
      dependsOn: ["PB-VIDEO-API-READ-001"],
      deliverables: ["PATCH /admin/video-lectures/:id", "visibility/preview policy", "lesson mapping validation", "audit log", "API 테스트"],
      acceptanceCriteria: [
        "영상 binary 교체와 metadata 수정이 구분되어 있다.",
        "무료 미리보기/유료 강의 전환은 entitlement 정책과 충돌하지 않는다.",
        "관리자 수정은 감사 로그에 남는다.",
      ],
    }),
    pbTask({
      key: "PB-VIDEO-API-DELETE-001",
      phase: "05 영상 강의",
      title: "영상 강의 archive/delete API",
      description: "영상 강의 비활성/archive, Cloudflare Stream asset 삭제 또는 보존 정책, 진행률/구매 이력 보존, 관리자 강제 삭제, 감사 로그를 REST/OpenAPI endpoint로 구현한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "video-lecture.api.delete",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.videoLectureApi,
      agentRole: "Backend Engineer",
      surfaces: ["api", "ops"],
      dependsOn: ["PB-VIDEO-API-LIST-001"],
      deliverables: ["DELETE /admin/video-lectures/:id", "archive/delete policy", "Cloudflare asset cleanup", "history preservation", "API 테스트"],
      acceptanceCriteria: [
        "구매/수강 이력이 있는 영상의 삭제/비공개 정책이 명확하다.",
        "Cloudflare asset 삭제 실패와 DB 상태 변경 사이 보정 정책이 있다.",
        "삭제/비공개 이후 기존 커리큘럼, 진행률, entitlement 참조가 깨지지 않는다.",
      ],
    }),
    pbTask({
      key: "PB-VIDEO-API-PLAYBACK-001",
      phase: "05 영상 강의",
      title: "영상 signed playback 권한 API",
      description: `사용자가 영상을 재생하려 할 때 로그인, 구매/구독/권한, 무료 미리보기 상태를 확인한 뒤 Cloudflare Stream signed playback URL/token 또는 재생 가능 정보를 발급하는 REST/OpenAPI endpoint를 구현한다. 최초 구현은 ${CLOUDFLARE_STREAM_SIGNED_URLS_DOCS_URL} 기준으로 하며 token claim, 만료, playback id 노출 정책을 추론하지 않는다. 미선택 시 N/A로 SKIP한다.`,
      decision: "N/A",
      category: "backend",
      priority: "critical",
      capabilityKey: "video-lecture.api.playback",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.videoLectureApi,
      agentRole: "Backend Engineer",
      surfaces: ["api", "app"],
      dependsOn: ["PB-VIDEO-API-READ-001", "PB-AUTH-003", "PB-PAY-ENTITLEMENT-001"],
      deliverables: ["POST /video-lectures/:id/playback", "entitlement check", "signed playback response", "expiry policy", "API 테스트"],
      acceptanceCriteria: [
        "권한 없는 사용자는 재생 token을 받을 수 없고 auth modal 또는 구매 CTA로 이어질 상태를 받는다.",
        "token 만료 시간과 재생 권한 범위가 issue에 명시되어 있다.",
        `Cloudflare signed playback은 공식 문서 ${CLOUDFLARE_STREAM_SIGNED_URLS_DOCS_URL} 기준으로 검증된다.`,
        "무료 미리보기와 유료 전체 재생 권한이 분리되어 있다.",
      ],
    }),
    pbTask({
      key: "PB-VIDEO-API-PROGRESS-001",
      phase: "05 영상 강의",
      title: "영상 시청 진행률/완강 API",
      description: "사용자별 재생 위치, 마지막 시청 시각, 구간 progress, 완강 기준, 이어보기, 관리자 학습 현황 조회에 필요한 REST/OpenAPI endpoint와 저장 정책을 구현한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "video-lecture.api.progress",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.videoLectureApi,
      agentRole: "Backend Engineer",
      dependsOn: ["PB-VIDEO-API-PLAYBACK-001"],
      deliverables: ["POST /video-lectures/:id/progress", "GET /me/video-progress", "completion policy", "resume state", "rate/idempotency guard"],
      acceptanceCriteria: [
        "진행률 저장은 과도한 호출을 방지하고 idempotent하게 처리된다.",
        "완강 기준은 duration 대비 비율 또는 운영 정책으로 명시된다.",
        "사용자는 이어보기 위치를 복구할 수 있다.",
        "관리자는 사용자별/강의별 진행 상태를 조회할 수 있는 기반을 가진다.",
      ],
    }),
    pbTask({
      key: "PB-VIDEO-PLAYER-UI-001",
      phase: "05 영상 강의",
      title: "영상 강의 player UI",
      description: "공개 상세/로그인 사용자 앱에서 Cloudflare Stream 영상을 재생하는 player UI, 로딩/처리중/권한 없음/구매 필요/오류 상태, 이어보기, 진행률 저장, 자막/썸네일 표시를 구현한다. 보호된 재생 액션은 auth modal 패턴을 따른다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "frontend",
      priority: "critical",
      capabilityKey: "video-lecture.player-ui",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.videoLecturePlayerUi,
      agentRole: "Frontend Engineer",
      surfaces: ["landing", "app"],
      dependsOn: ["PB-VIDEO-API-PLAYBACK-001", "PB-VIDEO-API-PROGRESS-001", "PB-WEB-001", "PB-WEB-002"],
      deliverables: ["video player component", "auth/purchase gate states", "resume/progress integration", "caption/thumbnail UI", "responsive player"],
      acceptanceCriteria: [
        "비로그인 사용자가 보호된 강의 재생을 시도하면 로그인 페이지 강제 이동이 아니라 auth modal이 열린다.",
        "구매/구독 권한이 없으면 player가 token을 요청하지 않고 구매 CTA 상태를 표시한다.",
        "처리중/실패/비공개 영상 상태가 사용자에게 일관되게 표시된다.",
        "모바일/데스크톱에서 player 비율과 controls가 안정적으로 유지된다.",
      ],
    }),
    pbTask({
      key: "PB-VIDEO-ADMIN-001",
      phase: "05 영상 강의",
      title: "영상 강의 관리자 UI",
      description: "관리자에서 영상 업로드 세션 생성, 업로드 상태 확인, 강의/레슨 연결, metadata 수정, preview/visibility 설정, 처리 실패 재시도/대체, archive/delete, 진행률 요약 조회 화면을 구현한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "admin",
      priority: "high",
      capabilityKey: "video-lecture.admin-ui",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.videoLectureAdmin,
      agentRole: "Admin Engineer",
      surfaces: ["admin"],
      dependsOn: [
        "PB-VIDEO-API-UPLOAD-001",
        "PB-VIDEO-API-LIST-001",
        "PB-VIDEO-API-UPDATE-001",
        "PB-VIDEO-API-DELETE-001",
        "PB-VIDEO-API-PROGRESS-001",
      ],
      deliverables: ["영상 업로드 UI", "processing status UI", "lesson mapping UI", "visibility/preview controls", "archive/delete action", "progress summary"],
      acceptanceCriteria: [
        "관리자 UI에서 영상 업로드부터 레슨 연결, 공개/비공개 전환까지 수행할 수 있다.",
        "Cloudflare processing 상태와 실패 사유가 운영자에게 보인다.",
        "삭제/비공개/metadata 변경 작업이 감사 로그에 남는다.",
      ],
    }),
    pbTask({
      key: "PB-VIDEO-QA-001",
      phase: "05 영상 강의",
      title: "영상 강의 E2E/권한/운영 검증",
      description: "Cloudflare Stream env, direct upload/tus upload, processing webhook, signed playback, 권한 없는 재생 차단, 무료 미리보기, 구매/구독 권한 재생, 진행률/이어보기, 관리자 영상 관리, 배포 URL player 동작을 검증한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "qa",
      priority: "critical",
      capabilityKey: "video-lecture.qa",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.videoLectureQaChecklist,
      agentRole: "QA Engineer",
      surfaces: ["qa", "ops"],
      dependsOn: ["PB-VIDEO-PLAYER-UI-001", "PB-VIDEO-ADMIN-001", "PB-VIDEO-API-DELETE-001"],
      deliverables: ["영상 업로드 E2E 증거", "webhook 처리 증거", "signed playback 권한 테스트", "진행률/이어보기 테스트", "관리자 UI 증거", "Cloudflare/Vercel env 증거"],
      acceptanceCriteria: [
        "Cloudflare account id, Stream API token, webhook secret이 Development/Preview/Production env에 실제로 존재하는지 확인되어 있다.",
        "권한 없는 사용자는 signed playback을 받을 수 없고, 권한 있는 사용자는 배포 URL에서 재생할 수 있다.",
        "업로드 후 processing 완료 webhook이 DB 상태와 관리자 UI에 반영된다.",
        "진행률 저장과 이어보기가 실제 player 이벤트 기준으로 검증된다.",
        "base 구현 전이면 이 issue는 product-builder-base 작업 backlog로 전달되어야 하며, 고객별 임시 구현으로 완료 처리하지 않는다.",
      ],
    }),
    pbTask({
      key: "PB-IDV-KCB-001",
      phase: "05 본인확인",
      title: "KCB 본인확인 provider/계약 범위",
      description: `KCB 본인확인을 Product Builder 선택 feature로 정의한다. KCB 본인확인 모듈은 JAR 기반으로 제공되는 전제를 둔다. 공개 서비스 소개는 ${KCB_OKNAME_SERVICE_URL}, ${KCB_SERVICE_INTRO_URL}를 기록하되 최초 구현은 고객의 KCB/Ok-name 계약, 연동가이드, 테스트 계정, 서비스 코드/site code, JAR 파일/버전/checksum, JVM 요구사항, 암복호화/서명 방식, callback/return URL, 결과 코드표로 확인된 내용만 사용한다. 문서나 상점/서비스 설정으로 확인되지 않은 파라미터, hash, 암호화, redirect/callback payload는 추론 구현하지 않는다. 미선택 시 N/A로 SKIP한다.`,
      decision: "N/A",
      category: "reuse-audit",
      priority: "critical",
      capabilityKey: "identity-verification.kcb.scope",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.identityVerificationKcbCore,
      agentRole: "Solution Architect",
      surfaces: ["planning", "api", "ops"],
      dependsOn: ["PB-BASE-001", "PB-INFRA-001", "PB-DECIDE-001"],
      deliverables: ["KCB 본인확인 feature 범위", "KCB 계약/연동 문서 체크리스트", "KCB JAR 파일/버전/checksum 기록", "테스트/운영 env 목록", "개인정보 최소 저장 정책", "미선택 시 N/A 사유"],
      acceptanceCriteria: [
        "KCB/Ok-name 계약 상태, 테스트 계정, 운영 전환 절차, 서비스 코드/site code, callback/return URL이 구현 전 확정되어 있다.",
        "KCB가 제공한 JAR 파일명, 버전, checksum, 배포 가능 범위, JVM 요구사항이 issue에 남아 있다.",
        `공개 서비스 소개 URL이 issue에 남아 있다: ${KCB_OKNAME_SERVICE_URL}`,
        `KCB 서비스 소개 URL이 issue에 남아 있다: ${KCB_SERVICE_INTRO_URL}`,
        "암복호화, 서명/hash, 요청/응답 필드는 공식 계약/연동 문서 또는 KCB 제공 테스트 자료로 확인된 값만 사용한다.",
        "기본 Vercel Node runtime에서 JAR을 직접 실행할 수 있다고 가정하지 않고 PB-IDV-KCB-JAR-001에서 실행 경계를 결정한다.",
        "본인확인은 로그인 자체가 아니라 보호 액션, 결제/성인/권한 확인 등 필요한 지점에서 호출되는 reusable capability로 분리되어 있다.",
        "KCB feature 미선택 시 PB-IDV-KCB-* task는 삭제되지 않고 N/A 완료 issue로 남는다.",
      ],
    }),
    pbTask({
      key: "PB-IDV-KCB-JAR-001",
      phase: "05 본인확인",
      title: "KCB JAR 실행 경계/JVM adapter",
      description: `KCB 본인확인 JAR 모듈을 Product Builder 표준 REST 서버에서 어떻게 호출할지 결정하고 구현한다. 기본 Neon + Vercel/Node 경계에서는 JAR 직접 실행을 가정하지 않는다. Railway는 가능한 JVM adapter 배포 후보로 둔다. Railway를 선택하면 Java service deploy ${RAILWAY_JAVA_DEPLOY_DOCS_URL}, deployment reference ${RAILWAY_DEPLOYMENTS_DOCS_URL}, variables ${RAILWAY_VARIABLES_DOCS_URL}, private networking ${RAILWAY_PRIVATE_NETWORKING_DOCS_URL}를 기준으로 별도 Java/JVM adapter service를 띄우고 Vercel/Node API가 내부 또는 보호된 endpoint로 호출한다. 다른 선택지는 Java sidecar/service, 별도 JVM adapter API, Java 지원 serverless/runtime, 또는 고객 인프라 포팅 workflow이며, 결정된 방식의 배포/비밀/env/health check/장애 격리 정책을 남긴다. 미선택 시 N/A로 SKIP한다.`,
      decision: "N/A",
      category: "backend",
      priority: "critical",
      capabilityKey: "identity-verification.kcb.jar-bridge",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.identityVerificationKcbJarBridge,
      agentRole: "Platform Engineer",
      surfaces: ["api", "ops"],
      dependsOn: ["PB-IDV-KCB-001", "PB-INFRA-001", "PB-PORT-001"],
      deliverables: ["JAR 실행 방식 결정", "Railway/JVM runtime 후보 검토", "JVM runtime/adapter", "adapter REST contract", "secret/env mapping", "health check", "배포 제약/포팅 필요 여부"],
      acceptanceCriteria: [
        "KCB JAR은 Node/Next/Vercel 함수 안에서 바로 실행된다고 가정하지 않는다.",
        `Railway를 선택하는 경우 공식 Railway Java 배포 문서가 issue에 남아 있다: ${RAILWAY_JAVA_DEPLOY_DOCS_URL}`,
        `Railway variables/private networking 기준 URL이 issue에 남아 있다: ${RAILWAY_VARIABLES_DOCS_URL}, ${RAILWAY_PRIVATE_NETWORKING_DOCS_URL}`,
        "Railway를 선택하는 경우 별도 Java/JVM adapter service, service variables, health check, Vercel/Node API와의 통신 방식이 검증되어 있다.",
        "선택한 JVM 실행 위치와 배포 대상, 네트워크 경계, timeout/retry 정책이 명시되어 있다.",
        "Node REST API와 JAR adapter 사이의 내부 contract가 OpenAPI 또는 명시적 DTO로 정의되어 있다.",
        "KCB JAR 파일은 저장소에 무단 커밋하지 않고 라이선스/배포 허용 범위와 secret/artifact 관리 위치가 정리되어 있다.",
        "JVM adapter health check, 로그 마스킹, 장애 시 사용자/운영자 오류 상태가 정의되어 있다.",
        "Neon/Vercel 기본 환경만으로 불가능하면 별도 포팅 workflow 또는 외부 JVM 서비스 blocker가 남아 있다.",
      ],
    }),
    pbTask({
      key: "PB-IDV-KCB-DATA-001",
      phase: "05 본인확인",
      title: "KCB 본인확인 결과/동의 데이터 모델",
      description: "KCB 본인확인 요청, 결과, 동의, 재시도, 감사 로그를 Neon schema와 OpenAPI schema로 정의한다. 주민등록번호, 원문 인증 payload, 불필요한 민감정보는 저장하지 않고, CI/DI, 생년월일/성별/내외국인 여부 등 실제 서비스에 필요한 최소 필드만 보존 정책과 함께 정의한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "critical",
      capabilityKey: "identity-verification.data-model",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.identityVerificationDataModel,
      agentRole: "Data Engineer",
      dependsOn: ["PB-IDV-KCB-001", "PB-DATA-001", "PB-AUTH-002"],
      deliverables: ["identity_verifications schema", "verification_attempts schema", "consent/audit fields", "retention/delete policy", "migration"],
      acceptanceCriteria: [
        "주민등록번호와 KCB 원문 민감 payload를 DB에 저장하지 않는다.",
        "CI/DI 등 식별값은 암호화/마스킹/접근권한 정책과 함께 정의되어 있다.",
        "본인확인 성공/실패/취소/만료/재시도 상태가 구분된다.",
        "개인정보 보존 기간, 삭제/익명화, 감사 로그 보존 정책이 issue에 남아 있다.",
      ],
    }),
    pbTask({
      key: "PB-IDV-KCB-API-SESSION-001",
      phase: "05 본인확인",
      title: "KCB 본인확인 세션 생성 API",
      description: "사용자가 보호 액션에서 본인확인을 시작할 수 있도록 KCB 요청 세션을 생성하는 REST/OpenAPI endpoint를 구현한다. 요청 payload 암호화/서명은 PB-IDV-KCB-JAR-001에서 결정된 KCB JAR adapter를 통해 처리한다. redirect/팝업/모바일 webview 방식, 요청 payload, 암호화/서명, returnUrl/callbackUrl, nonce/state, 만료 시간은 KCB/Ok-name 연동 문서와 고객 계약 설정으로 확인된 값만 사용한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "critical",
      capabilityKey: "identity-verification.kcb.api.session",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.identityVerificationApi,
      agentRole: "Backend Engineer",
      surfaces: ["api", "app"],
      dependsOn: ["PB-IDV-KCB-JAR-001", "PB-IDV-KCB-DATA-001", "PB-AUTH-003"],
      deliverables: ["POST /identity-verifications/kcb/sessions", "nonce/state 저장", "KCB 요청 payload 생성", "OpenAPI contract", "API 테스트"],
      acceptanceCriteria: [
        "로그인 사용자 또는 임시 보호 액션 context와 본인확인 세션이 연결된다.",
        "nonce/state와 만료 시간이 있어 callback 위조와 replay를 방지한다.",
        "KCB 요청 payload와 암호화/서명 방식은 계약/연동 문서에서 확인된 항목만 사용한다.",
        "KCB JAR 호출 실패, timeout, adapter health failure가 사용자 상태와 운영 로그로 분리된다.",
        "KCB 서비스 코드/site code, 운영/테스트 endpoint, callback/return URL은 env로 분리되어 있다.",
      ],
    }),
    pbTask({
      key: "PB-IDV-KCB-CALLBACK-001",
      phase: "05 본인확인",
      title: "KCB callback/결과 검증 API",
      description: "KCB 본인확인 완료/실패/취소/만료 callback 또는 return 응답을 수신하고, PB-IDV-KCB-JAR-001에서 결정된 KCB JAR adapter로 복호화/서명/nonce/state를 검증한 뒤 내부 verification 상태를 갱신하는 REST/OpenAPI endpoint를 구현한다. 응답 code table과 성공 기준은 KCB/Ok-name 연동 문서와 테스트 결과로 확인한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "critical",
      capabilityKey: "identity-verification.kcb.callback",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.identityVerificationApi,
      agentRole: "Backend Engineer",
      surfaces: ["api", "ops"],
      dependsOn: ["PB-IDV-KCB-API-SESSION-001"],
      deliverables: ["POST/GET /identity-verifications/kcb/callback", "signature/decrypt 검증", "state/nonce 검증", "결과 code mapping", "idempotency"],
      acceptanceCriteria: [
        "callback/return 응답은 서명, 암호화, nonce/state, 만료 시간을 모두 검증한다.",
        "복호화/서명 검증은 임의 구현이 아니라 KCB JAR 또는 KCB가 승인한 adapter 경계에서 수행된다.",
        "중복 callback은 idempotent하게 처리된다.",
        "성공/실패/취소/만료/공급자 오류 상태가 내부 상태와 사용자 메시지로 분리된다.",
        "KCB 응답 원문 중 민감정보는 로그와 DB에 남기지 않거나 마스킹된다.",
      ],
    }),
    pbTask({
      key: "PB-IDV-KCB-API-STATUS-001",
      phase: "05 본인확인",
      title: "KCB 본인확인 상태/재시도 API",
      description: "사용자와 서버가 본인확인 상태를 조회하고 실패/취소/만료 후 재시도할 수 있는 REST/OpenAPI endpoint를 구현한다. 보호 액션은 본인확인 완료 후 원래 액션으로 복귀해야 하며, 과도한 재시도와 abuse를 제한한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "identity-verification.kcb.api.status",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.identityVerificationApi,
      agentRole: "Backend Engineer",
      surfaces: ["api", "app", "admin"],
      dependsOn: ["PB-IDV-KCB-DATA-001", "PB-IDV-KCB-CALLBACK-001"],
      deliverables: ["GET /me/identity-verification", "POST /identity-verifications/kcb/retry", "protected action resume state", "rate limit", "API 테스트"],
      acceptanceCriteria: [
        "사용자는 본인확인 완료/필요/진행중/실패/만료 상태를 조회할 수 있다.",
        "보호 액션 context가 보존되어 본인확인 완료 후 원래 액션으로 복귀한다.",
        "실패/취소/만료 재시도 정책과 rate limit이 적용되어 있다.",
        "관리자/운영자 조회용 상태와 사용자 노출 메시지가 분리되어 있다.",
      ],
    }),
    pbTask({
      key: "PB-IDV-KCB-UI-001",
      phase: "05 본인확인",
      title: "KCB 본인확인 보호 액션 UI",
      description: "공개 사이트/앱에서 본인확인이 필요한 보호 액션을 수행할 때 KCB 본인확인 모달 또는 팝업/redirect 흐름을 제공한다. 로그인 wall이 아니라 필요한 액션에서만 본인확인 gate가 열리고, 완료 후 원래 액션으로 복귀한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "frontend",
      priority: "high",
      capabilityKey: "identity-verification.kcb.ui",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.identityVerificationUi,
      agentRole: "Frontend Engineer",
      surfaces: ["landing", "app"],
      dependsOn: ["PB-IDV-KCB-API-SESSION-001", "PB-IDV-KCB-API-STATUS-001", "PB-AUTH-003", "PB-WEB-001", "PB-WEB-002"],
      deliverables: ["본인확인 gate component", "modal/popup/redirect state", "완료 후 resume flow", "실패/취소/만료 UI", "모바일 대응"],
      acceptanceCriteria: [
        "공개 페이지 진입은 막지 않고 본인확인이 필요한 액션에서만 gate가 열린다.",
        "성공, 실패, 취소, 만료, 재시도 상태가 사용자에게 명확하게 표시된다.",
        "모바일 브라우저와 데스크톱에서 popup/redirect 흐름이 깨지지 않는다.",
        "본인확인 완료 후 사용자는 원래 시도한 저장/구매/수강/성인확인 액션으로 복귀한다.",
      ],
    }),
    pbTask({
      key: "PB-IDV-KCB-ADMIN-001",
      phase: "05 본인확인",
      title: "KCB 본인확인 관리자 조회/운영 UI",
      description: "관리자에서 사용자별 본인확인 상태, 최근 시도, 실패 사유, provider 오류, 재시도/초기화 필요 여부, 개인정보 보존/삭제 상태를 확인하는 운영 UI를 구현한다. 원문 민감정보는 관리자 UI에도 노출하지 않는다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "admin",
      priority: "medium",
      capabilityKey: "identity-verification.kcb.admin-ui",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.identityVerificationAdmin,
      agentRole: "Admin Engineer",
      surfaces: ["admin"],
      dependsOn: ["PB-IDV-KCB-API-STATUS-001", "PB-ADMIN-001", "PB-ADMIN-USERS-READ-001"],
      deliverables: ["본인확인 상태 UI", "시도 이력 UI", "provider 오류 표시", "보존/삭제 상태 표시", "권한 제한"],
      acceptanceCriteria: [
        "관리자만 본인확인 상태와 시도 이력을 조회할 수 있다.",
        "CI/DI 등 식별값은 마스킹되거나 필요한 권한자에게만 제한적으로 노출된다.",
        "원문 KCB payload와 주민등록번호는 관리자 UI에 노출되지 않는다.",
        "운영자가 실패/공급자 장애/재시도 필요 상태를 구분할 수 있다.",
      ],
    }),
    pbTask({
      key: "PB-IDV-KCB-QA-001",
      phase: "05 본인확인",
      title: "KCB 본인확인 E2E/개인정보/운영 검증",
      description: "KCB 테스트/운영 env, JAR/JVM adapter health, 세션 생성, callback 검증, 성공/실패/취소/만료, nonce/state replay 방지, 개인정보 최소 저장, 보호 액션 복귀, 관리자 조회, 배포 URL 동작을 검증한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "qa",
      priority: "critical",
      capabilityKey: "identity-verification.kcb.qa",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.identityVerificationQaChecklist,
      agentRole: "QA Engineer",
      surfaces: ["qa", "ops"],
      dependsOn: ["PB-IDV-KCB-JAR-001", "PB-IDV-KCB-UI-001", "PB-IDV-KCB-ADMIN-001", "PB-IDV-KCB-CALLBACK-001"],
      deliverables: ["KCB 테스트 계정 증거", "JAR/JVM adapter health 증거", "성공/실패/취소/만료 E2E", "callback 보안 테스트", "개인정보 저장 검증", "관리자 UI 증거", "배포 URL smoke"],
      acceptanceCriteria: [
        "KCB 테스트/운영 site code, secret/key, callback/return URL env가 Development/Preview/Production에 실제로 존재하는지 확인되어 있다.",
        "KCB JAR 파일/버전/checksum, JVM runtime, adapter 배포 URL 또는 내부 endpoint, health check 결과가 검증되어 있다.",
        "JAR adapter timeout, 장애, 응답 파싱 실패가 사용자 오류 상태와 운영 알림/로그로 분리된다.",
        "성공, 실패, 취소, 만료, provider 오류 케이스가 각각 검증되어 있다.",
        "nonce/state replay와 위조 callback이 거부된다.",
        "주민등록번호와 원문 KCB 민감 payload가 DB, 로그, 관리자 UI에 저장/노출되지 않는 것이 확인되어 있다.",
        "보호 액션에서 본인확인 완료 후 원래 액션으로 복귀하는 흐름이 배포 URL에서 검증되어 있다.",
        "base 구현 전이면 이 issue는 product-builder-base 작업 backlog로 전달되어야 하며, 고객별 임시 구현으로 완료 처리하지 않는다.",
      ],
    }),
    pbTask({
      key: "PB-WEB-001",
      phase: "06 공개 서비스",
      title: "SEO 공개 페이지 구현",
      description: "홈, 목록/상세, 소개/브랜드, 가격/전환 페이지 등 검색 유입용 공개 페이지를 Next.js metadata와 구조화 데이터로 구현한다.",
      category: "frontend",
      priority: "high",
      capabilityKey: "web.seo-pages",
      agentRole: "Frontend Engineer",
      dependsOn: ["PB-DOMAIN-001", "PB-UI-001"],
      deliverables: ["홈", "목록/상세 페이지", "소개/브랜드 페이지", "metadata", "JSON-LD"],
      acceptanceCriteria: [
        "공개 페이지는 비로그인 상태에서 탐색 가능하며 전체 사이트 auth wall을 만들지 않는다.",
        "각 공개 페이지에 title/description/canonical/open graph가 있다.",
        "도메인에 맞는 구조화 데이터가 포함된다.",
        "모바일/데스크톱에서 첫 화면이 실제 서비스 가치를 보여준다.",
        "보호된 기능으로 이어지는 CTA는 로그인 페이지 강제 이동이 아니라 auth modal trigger와 연결된다.",
      ],
    }),
    pbTask({
      key: "PB-WEB-002",
      phase: "07 서비스 앱",
      title: "로그인 사용자 서비스 흐름",
      description: "로그인 후 핵심 기능, 내 페이지, 상태/진행률/이력, 권한 없음/로딩/에러 상태를 구현한다.",
      category: "frontend",
      priority: "medium",
      capabilityKey: "web.private-service-flow",
      agentRole: "Frontend Engineer",
      dependsOn: ["PB-AUTH-002", "PB-AUTH-003", "PB-SET-001", "PB-DOMAIN-001", "PB-WEB-001"],
      deliverables: ["private route", "내 페이지", "핵심 기능 UI", "로딩/에러/권한 상태"],
      acceptanceCriteria: [
        "비로그인/로그인/권한 없음 상태가 명확히 분기된다.",
        "공개 페이지에서 보호 기능 액션을 시도한 사용자가 로그인 후 원래 의도로 복귀한다.",
        "핵심 사용자 상태가 API contract와 연결된다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 feature 재사용 범위 확정",
      description: "커뮤니티 생성/수정/삭제, 가입/탈퇴, 멤버/모더레이터, 게시글, 댓글, 리액션, 투표, 피드 랭킹, karma, 신고, 작성자 차단, 숨김, 필터, 규칙/flair, 제재/이의제기, 관리자 모더레이션으로 구성된 커뮤니티 capability의 재사용/확장 범위를 확정한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "reuse-audit",
      priority: "high",
      capabilityKey: "community.capability-scope",
      reuseSource: "Flotter community feature reference; product-builder-base community capability when available",
      agentRole: "Solution Architect",
      surfaces: ["planning", "api", "app", "admin"],
      dependsOn: ["PB-REUSE-001", "PB-DECIDE-001", "PB-WEB-002"],
      deliverables: ["커뮤니티 feature 범위", "재사용/확장 판정", "UGC 안전 요구 체크리스트", "미선택 시 N/A 사유"],
      acceptanceCriteria: [
        "커뮤니티는 프로젝트별 도메인 기능 카드가 아니라 선택 가능한 재사용 feature로 분류되어 있다.",
        "커뮤니티 CRUD, 멤버십, 게시글/댓글/리액션/투표/신고/작성자 차단/숨김/필터/관리자 모더레이션 포함 여부가 명시되어 있다.",
        "Apple App Store와 Google Play의 UGC/커뮤니티 안전 요구 준수 항목이 구현 task로 추적된다.",
        "미선택 시 커뮤니티 task가 삭제되지 않고 N/A 완료 issue로 남는다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-DATA-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 데이터/정책 모델",
      description: "커뮤니티, 멤버십, 모더레이터, 게시글, 댓글, 리액션, 투표, 피드 랭킹, karma, 신고, 차단, 숨김, 필터, 규칙/flair, 제재/이의제기, 모더레이션 상태와 감사 로그를 Neon schema와 OpenAPI contract로 모델링한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "community.data-policy-model",
      reuseSource: "Flotter community schema/API reference after REST/OpenAPI conversion",
      agentRole: "Backend Engineer",
      surfaces: ["shared", "api", "admin"],
      dependsOn: ["PB-COMM-001", "PB-DATA-001", "PB-AUTH-002"],
      deliverables: ["community schema", "membership/moderator schema", "post/comment/reaction/poll schema", "karma/feed ranking model", "policy/status enum", "report/block/hide/filter model", "sanction/appeal model", "moderation audit model"],
      acceptanceCriteria: [
        "사용자 생성 콘텐츠와 운영자 조치 이력이 분리되어 저장된다.",
        "신고 대상은 게시글/댓글/작성자 등 확장 가능한 target model을 가진다.",
        "작성자 차단, 콘텐츠 숨김, 필터 결과가 사용자별/전역 정책으로 구분된다.",
        "REUSE/N/A 결정이면 SKIP 사유와 참조 링크를 남긴다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-SPACE-API-LIST-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 목록/상세 API",
      description: "커뮤니티 목록, 인기 커뮤니티, slug/id 상세, 공개/비공개/멤버십 상태, 내 가입 상태를 REST/OpenAPI endpoint로 구현하거나 기존 capability를 확장한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "community.space.api.list-read",
      reuseSource: "Flotter community list/popular/slug reference",
      agentRole: "Backend Engineer",
      surfaces: ["api"],
      dependsOn: ["PB-COMM-DATA-001", "PB-AUTH-002"],
      deliverables: ["GET /communities", "GET /communities/:slug", "popular communities", "membership viewer state", "API 테스트"],
      acceptanceCriteria: [
        "비로그인/로그인/관리자 조회 필드가 분리되어 있다.",
        "내 가입/구독/차단/제재 상태가 viewer state로 응답된다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-SPACE-API-CREATE-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 생성 API",
      description: "커뮤니티 생성, slug 중복 검증, 공개/비공개 정책, 기본 규칙/역할/bootstrap moderator 생성을 REST/OpenAPI endpoint로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "community.space.api.create",
      reuseSource: "Flotter community create reference",
      agentRole: "Backend Engineer",
      surfaces: ["api"],
      dependsOn: ["PB-COMM-SPACE-API-LIST-001"],
      deliverables: ["POST /communities", "slug validation", "default rules", "creator moderator bootstrap", "API 테스트"],
      acceptanceCriteria: [
        "커뮤니티 생성 권한과 제한 정책이 명확하다.",
        "생성자는 초기 owner/moderator 권한을 가진다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-SPACE-API-UPDATE-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 수정/설정 API",
      description: "커뮤니티 이름, 설명, 공개 상태, 규칙, flair/카테고리, 가입 정책, 노출 설정을 REST/OpenAPI endpoint로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "community.space.api.update",
      reuseSource: "Flotter community update/settings reference",
      agentRole: "Backend Engineer",
      surfaces: ["api", "admin"],
      dependsOn: ["PB-COMM-SPACE-API-CREATE-001"],
      deliverables: ["PATCH /communities/:id", "settings validation", "role guard", "audit log", "API 테스트"],
      acceptanceCriteria: [
        "owner/moderator/admin 권한별 수정 가능 필드가 분리되어 있다.",
        "설정 변경은 감사 로그에 남는다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-SPACE-API-DELETE-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 삭제/archive API",
      description: "커뮤니티 실제 삭제 대신 archive/비공개, 게시글/댓글/멤버십 보존, 복구 가능 여부, 관리자 강제 조치를 REST/OpenAPI endpoint로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "medium",
      capabilityKey: "community.space.api.delete",
      reuseSource: "Flotter community delete/archive reference",
      agentRole: "Backend Engineer",
      surfaces: ["api", "admin"],
      dependsOn: ["PB-COMM-SPACE-API-LIST-001"],
      deliverables: ["DELETE/archive /communities/:id", "data retention policy", "restore policy", "audit log", "API 테스트"],
      acceptanceCriteria: [
        "archive 이후 목록/상세/피드 노출 정책이 명확하다.",
        "커뮤니티 삭제와 콘텐츠/신고/감사 이력 보존 정책이 분리되어 있다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-MEMBERSHIP-API-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 가입/탈퇴/구독 API",
      description: "커뮤니티 가입, 탈퇴, 내 멤버십, 구독/알림 설정, rules accept/onboarding 상태를 REST/OpenAPI endpoint로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "community.membership.api",
      reuseSource: "Flotter community join/leave/myMembership/mySubscriptions reference",
      agentRole: "Backend Engineer",
      surfaces: ["api", "app"],
      dependsOn: ["PB-COMM-SPACE-API-LIST-001", "PB-AUTH-002"],
      deliverables: ["POST /communities/:id/join", "POST /communities/:id/leave", "myMembership", "mySubscriptions", "rules accept", "API 테스트"],
      acceptanceCriteria: [
        "제재/차단/비공개 커뮤니티 가입 제한이 반영된다.",
        "탈퇴 후 게시글/댓글/신고/감사 이력 보존 정책이 명확하다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-MEMBER-API-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 멤버/모더레이터 조회 API",
      description: "커뮤니티 멤버, 모더레이터, banned user, 역할/상태 검색과 페이지네이션을 REST/OpenAPI endpoint로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "medium",
      capabilityKey: "community.member.api",
      reuseSource: "Flotter community members/moderators reference",
      agentRole: "Backend Engineer",
      surfaces: ["api", "admin"],
      dependsOn: ["PB-COMM-MEMBERSHIP-API-001"],
      deliverables: ["GET /communities/:id/members", "GET /communities/:id/moderators", "role/status filters", "권한 테스트"],
      acceptanceCriteria: [
        "공개 멤버 정보와 관리자/모더레이터용 운영 정보가 분리된다.",
        "banned/left/deleted 사용자의 노출 정책이 정의되어 있다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-MODERATOR-API-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 모더레이터 초대/권한 API",
      description: "모더레이터 초대, 수락/거절, 권한 변경, 해제, owner 양도 정책을 REST/OpenAPI endpoint로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "community.moderator.api",
      reuseSource: "Flotter moderator invite/remove/role reference",
      agentRole: "Backend Engineer",
      surfaces: ["api", "admin"],
      dependsOn: ["PB-COMM-MEMBER-API-001"],
      deliverables: ["moderator invite/remove", "role policy", "owner transfer policy", "audit log", "API 테스트"],
      acceptanceCriteria: [
        "모더레이터 권한 변경은 권한 있는 사용자만 수행한다.",
        "모든 모더레이터 조치는 감사 로그와 알림/초대 상태를 가진다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-POST-API-LIST-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 게시글 목록/검색 API",
      description: "게시글 피드, 목록, 검색, 필터, 페이지네이션, 차단/숨김/신고 상태 반영 조회 API를 REST/OpenAPI로 구현하거나 기존 capability를 확장한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "community.post.api.list",
      reuseSource: "Flotter community feed/list API reference after REST/OpenAPI conversion",
      agentRole: "Backend Engineer",
      surfaces: ["api"],
      dependsOn: ["PB-COMM-DATA-001", "PB-AUTH-002"],
      deliverables: ["GET /community/posts", "검색/필터/페이지네이션", "차단/숨김 반영", "API 테스트"],
      acceptanceCriteria: [
        "차단한 작성자와 숨김 처리된 콘텐츠가 사용자 피드에서 제외된다.",
        "공개/로그인/관리자 조회 필드가 분리되어 있다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-POST-API-READ-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 게시글 상세 API",
      description: "게시글 상세, 작성자 요약, 댓글/리액션 요약, 사용자별 신고/숨김/차단 상태를 조회하는 REST/OpenAPI endpoint를 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "community.post.api.read",
      reuseSource: "Flotter community detail API reference after REST/OpenAPI conversion",
      agentRole: "Backend Engineer",
      surfaces: ["api"],
      dependsOn: ["PB-COMM-POST-API-LIST-001"],
      deliverables: ["GET /community/posts/:id", "viewer state", "권한/노출 테스트"],
      acceptanceCriteria: [
        "신고/숨김/차단/삭제 상태에 따라 상세 접근 결과가 일관된다.",
        "비로그인 공개 상세이 필요한 경우 보호 액션만 auth modal로 연결할 수 있다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-POST-API-CREATE-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 게시글 생성 API",
      description: "게시글 작성, 첨부/본문 validation, 정책 필터 사전 검사, 작성자 권한, rate limit을 REST/OpenAPI endpoint로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "community.post.api.create",
      reuseSource: "Flotter community post create reference",
      agentRole: "Backend Engineer",
      surfaces: ["api"],
      dependsOn: ["PB-COMM-DATA-001", "PB-AUTH-002"],
      deliverables: ["POST /community/posts", "본문/첨부 validation", "정책 필터", "API 테스트"],
      acceptanceCriteria: [
        "인증 사용자만 게시글을 작성할 수 있다.",
        "금칙어/정책 위반 후보는 필터 또는 검토 상태로 분리된다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-POST-API-UPDATE-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 게시글 수정 API",
      description: "게시글 작성자 또는 관리자 권한 기반 수정, revision/audit, 정책 필터 재검사를 REST/OpenAPI endpoint로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "medium",
      capabilityKey: "community.post.api.update",
      reuseSource: "Flotter community post update reference",
      agentRole: "Backend Engineer",
      surfaces: ["api"],
      dependsOn: ["PB-COMM-POST-API-READ-001", "PB-COMM-POST-API-CREATE-001"],
      deliverables: ["PATCH /community/posts/:id", "권한 검증", "revision/audit", "API 테스트"],
      acceptanceCriteria: [
        "작성자와 관리자 수정 권한이 분리되어 있다.",
        "수정 이력 또는 감사 로그가 남는다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-POST-API-DELETE-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 게시글 삭제/숨김 API",
      description: "게시글 삭제 대신 soft delete/archive, 작성자 삭제, 관리자 숨김, 복구 가능 상태를 REST/OpenAPI endpoint로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "medium",
      capabilityKey: "community.post.api.delete",
      reuseSource: "Flotter community post delete/hide reference",
      agentRole: "Backend Engineer",
      surfaces: ["api"],
      dependsOn: ["PB-COMM-POST-API-READ-001"],
      deliverables: ["DELETE /community/posts/:id", "soft delete/archive", "복구 정책", "API 테스트"],
      acceptanceCriteria: [
        "삭제된 게시글의 댓글/신고/감사 로그 보존 정책이 명확하다.",
        "관리자 숨김과 작성자 삭제가 상태값으로 구분된다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-COMMENT-API-LIST-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 댓글 목록 API",
      description: "게시글별 댓글 목록, 대댓글이 필요한 경우 계층/정렬, 차단/숨김/신고 상태 반영 조회 API를 REST/OpenAPI로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "community.comment.api.list",
      reuseSource: "Flotter community comment list reference",
      agentRole: "Backend Engineer",
      surfaces: ["api"],
      dependsOn: ["PB-COMM-POST-API-READ-001"],
      deliverables: ["GET /community/posts/:id/comments", "정렬/페이지네이션", "차단/숨김 반영", "API 테스트"],
      acceptanceCriteria: [
        "차단/숨김/신고 상태가 댓글 노출에도 반영된다.",
        "댓글 수와 실제 노출 댓글이 정책에 맞게 일관된다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-COMMENT-API-CREATE-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 댓글 생성 API",
      description: "댓글 작성, 본문 validation, 정책 필터, 작성 권한, rate limit을 REST/OpenAPI endpoint로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "community.comment.api.create",
      reuseSource: "Flotter community comment create reference",
      agentRole: "Backend Engineer",
      surfaces: ["api"],
      dependsOn: ["PB-COMM-COMMENT-API-LIST-001"],
      deliverables: ["POST /community/posts/:id/comments", "본문 validation", "정책 필터", "API 테스트"],
      acceptanceCriteria: [
        "인증 사용자만 댓글을 작성할 수 있다.",
        "숨김/잠김/삭제된 게시글에는 댓글 작성이 차단된다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-COMMENT-API-UPDATE-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 댓글 수정 API",
      description: "댓글 작성자 또는 관리자 권한 기반 수정, revision/audit, 정책 필터 재검사를 REST/OpenAPI endpoint로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "medium",
      capabilityKey: "community.comment.api.update",
      reuseSource: "Flotter community comment update reference",
      agentRole: "Backend Engineer",
      surfaces: ["api"],
      dependsOn: ["PB-COMM-COMMENT-API-CREATE-001"],
      deliverables: ["PATCH /community/comments/:id", "권한 검증", "revision/audit", "API 테스트"],
      acceptanceCriteria: [
        "작성자와 관리자 수정 권한이 분리되어 있다.",
        "수정 이력이 감사 가능하게 남는다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-COMMENT-API-DELETE-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 댓글 삭제/숨김 API",
      description: "댓글 soft delete/archive, 작성자 삭제, 관리자 숨김/복구 상태를 REST/OpenAPI endpoint로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "medium",
      capabilityKey: "community.comment.api.delete",
      reuseSource: "Flotter community comment delete/hide reference",
      agentRole: "Backend Engineer",
      surfaces: ["api"],
      dependsOn: ["PB-COMM-COMMENT-API-LIST-001"],
      deliverables: ["DELETE /community/comments/:id", "soft delete/archive", "복구 정책", "API 테스트"],
      acceptanceCriteria: [
        "댓글 삭제 후 게시글 댓글 수와 알림/신고 이력이 일관된다.",
        "관리자 숨김과 작성자 삭제가 상태값으로 구분된다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-POST-OPS-API-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 게시글 운영 액션 API",
      description: "게시글 pin, lock, remove, crosspost, 관리자/모더레이터 조치 사유와 감사 로그를 REST/OpenAPI endpoint로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "community.post.ops-api",
      reuseSource: "Flotter community post pin/lock/remove/crosspost reference",
      agentRole: "Backend Engineer",
      surfaces: ["api", "admin"],
      dependsOn: ["PB-COMM-POST-API-READ-001", "PB-COMM-MODERATOR-API-001"],
      deliverables: ["pin/lock/remove/crosspost endpoints", "moderator role guard", "audit log", "API 테스트"],
      acceptanceCriteria: [
        "pin/lock/remove/crosspost 상태가 피드와 상세 API에 일관되게 반영된다.",
        "모더레이터/관리자 조치 사유와 전후 상태가 감사 로그에 남는다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-COMMENT-OPS-API-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 댓글 운영 액션 API",
      description: "댓글 remove, sticky, distinguish, 대댓글 depth 제한, 모더레이터 조치 사유와 감사 로그를 REST/OpenAPI endpoint로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "community.comment.ops-api",
      reuseSource: "Flotter community comment remove/sticky/distinguish reference",
      agentRole: "Backend Engineer",
      surfaces: ["api", "admin"],
      dependsOn: ["PB-COMM-COMMENT-API-LIST-001", "PB-COMM-MODERATOR-API-001"],
      deliverables: ["comment remove/sticky/distinguish endpoints", "reply depth policy", "audit log", "API 테스트"],
      acceptanceCriteria: [
        "sticky/distinguish/remove 상태가 댓글 목록과 관리자 큐에 일관되게 반영된다.",
        "대댓글 depth 제한과 정렬 정책이 contract에 명시된다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-POLL-API-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 투표 API",
      description: "게시글 투표 생성/조회, 투표 cast/remove, 중복 투표 방지, 종료/공개 결과 정책을 REST/OpenAPI endpoint로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "medium",
      capabilityKey: "community.poll.api",
      reuseSource: "Flotter poll cast/remove reference",
      agentRole: "Backend Engineer",
      surfaces: ["api", "app"],
      dependsOn: ["PB-COMM-POST-API-CREATE-001"],
      deliverables: ["poll schema/API", "cast/remove", "result visibility policy", "API 테스트"],
      acceptanceCriteria: [
        "한 사용자는 동일 투표에 중복 투표할 수 없다.",
        "투표 종료/삭제/숨김/차단 상태가 게시글 정책과 일관된다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-FEED-RANKING-API-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 피드 랭킹 API",
      description: "home/all/popular 피드와 hot/new/top/rising/controversial 정렬, 차단/숨김/제재/필터 상태 반영을 REST/OpenAPI endpoint로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "community.feed-ranking.api",
      reuseSource: "Flotter community home/all/popular hot/new/top/rising/controversial reference",
      agentRole: "Backend Engineer",
      surfaces: ["api", "app"],
      dependsOn: ["PB-COMM-POST-API-LIST-001", "PB-COMM-REACTION-API-LIST-001"],
      deliverables: ["feed ranking contract", "hot/new/top/rising/controversial", "blocked/hidden filtering", "API 테스트"],
      acceptanceCriteria: [
        "각 정렬 방식의 기준과 시간 창이 문서화되어 있다.",
        "차단/숨김/신고/필터 상태가 모든 피드 정렬에 동일하게 적용된다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-KARMA-API-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 karma API",
      description: "게시글/댓글/리액션/신고/모더레이션 결과에 따른 사용자 karma 조회, batch 조회, 점수 반영 정책과 어뷰징 방지를 REST/OpenAPI endpoint와 서버 정책으로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "medium",
      capabilityKey: "community.karma.api",
      reuseSource: "Flotter karma get/getBatch reference",
      agentRole: "Backend Engineer",
      surfaces: ["api", "app", "admin"],
      dependsOn: ["PB-COMM-REACTION-API-SET-001", "PB-COMM-REPORT-API-CREATE-001"],
      deliverables: ["karma get/getBatch", "score policy", "anti-abuse guard", "API 테스트"],
      acceptanceCriteria: [
        "karma는 단순 표시가 아니라 신뢰도/스팸 제한 정책과 연결 가능하다.",
        "점수 반영/차감/복구 기준과 어뷰징 방지 조건이 명시된다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-RULES-FLAIR-API-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 규칙/flair/금칙어 API",
      description: "커뮤니티 rules, flair, banned words, 작성 전 규칙 동의, 필터 연동을 REST/OpenAPI endpoint와 관리자/모더레이터 정책으로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "community.rules-flair.api",
      reuseSource: "Flotter community rules/flair/banned words reference",
      agentRole: "Backend Engineer",
      surfaces: ["api", "admin"],
      dependsOn: ["PB-COMM-SPACE-API-UPDATE-001", "PB-COMM-FILTER-API-001"],
      deliverables: ["rules API", "flair API", "banned words API", "rules acceptance", "API 테스트"],
      acceptanceCriteria: [
        "게시글/댓글 작성 시 규칙 동의와 금칙어 정책이 적용된다.",
        "flair와 rules는 커뮤니티별로 관리되고 감사 로그에 남는다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-SANCTION-APPEAL-API-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 제재/이의제기 API",
      description: "사용자 ban/unban, 제재 부과/이력, appeal 생성/처리, 제재 중 작성/리액션/신고 제한을 REST/OpenAPI endpoint로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "critical",
      capabilityKey: "community.sanction-appeal.api",
      reuseSource: "Flotter sanction impose/history/appeal/resolve reference",
      agentRole: "Backend Engineer",
      surfaces: ["api", "app", "admin"],
      dependsOn: ["PB-COMM-MODERATION-API-ACTION-001"],
      deliverables: ["ban/unban", "sanction history", "appeal create/resolve", "permission restrictions", "API 테스트"],
      acceptanceCriteria: [
        "제재 상태는 게시글/댓글/리액션/신고/가입 액션 제한에 반영된다.",
        "이의제기 처리 결과와 사유가 사용자/관리자 화면과 감사 로그에 남는다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-TIER-ONBOARDING-API-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 티어/onboarding API",
      description: "커뮤니티별 사용자 tier, onboarding status, rules accept, tier refresh, 권한 unlock 정책을 REST/OpenAPI endpoint로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "medium",
      capabilityKey: "community.tier-onboarding.api",
      reuseSource: "Flotter community tier/onboardingStatus/acceptRules reference",
      agentRole: "Backend Engineer",
      surfaces: ["api", "app"],
      dependsOn: ["PB-COMM-MEMBERSHIP-API-001", "PB-COMM-KARMA-API-001", "PB-COMM-RULES-FLAIR-API-001"],
      deliverables: ["myTier", "refreshTier", "onboardingStatus", "acceptRules", "API 테스트"],
      acceptanceCriteria: [
        "tier/onboarding 상태가 작성/첨부/모더레이션 후보 같은 권한 정책과 연결 가능하다.",
        "rules accept 상태가 커뮤니티별로 추적된다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-REACTION-API-LIST-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 리액션 조회 API",
      description: "게시글/댓글 리액션 count, 내 리액션 상태, 지원 reaction type 목록을 REST/OpenAPI endpoint로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "medium",
      capabilityKey: "community.reaction.api.list",
      reuseSource: "Flotter reaction widget/API reference",
      agentRole: "Backend Engineer",
      surfaces: ["api"],
      dependsOn: ["PB-COMM-POST-API-READ-001", "PB-COMM-COMMENT-API-LIST-001"],
      deliverables: ["GET reaction summary", "viewer reaction state", "OpenAPI schema", "API 테스트"],
      acceptanceCriteria: [
        "게시글과 댓글 모두 리액션 count와 내 상태를 조회할 수 있다.",
        "숨김/삭제된 대상에는 리액션 상태가 노출되지 않는다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-REACTION-API-SET-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 리액션 생성/변경 API",
      description: "게시글/댓글 리액션 생성, 타입 변경, 중복 방지, idempotency를 REST/OpenAPI endpoint로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "medium",
      capabilityKey: "community.reaction.api.set",
      reuseSource: "Flotter reaction mutation reference",
      agentRole: "Backend Engineer",
      surfaces: ["api"],
      dependsOn: ["PB-COMM-REACTION-API-LIST-001"],
      deliverables: ["PUT /community/reactions", "중복 방지", "타입 변경", "API 테스트"],
      acceptanceCriteria: [
        "한 사용자가 한 대상에 중복 리액션을 만들지 않는다.",
        "차단/숨김/삭제 대상에는 리액션을 추가할 수 없다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-REACTION-API-DELETE-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 리액션 삭제 API",
      description: "게시글/댓글 리액션 취소, count 재계산 또는 원자적 감소, idempotent delete를 REST/OpenAPI endpoint로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "medium",
      capabilityKey: "community.reaction.api.delete",
      reuseSource: "Flotter reaction delete reference",
      agentRole: "Backend Engineer",
      surfaces: ["api"],
      dependsOn: ["PB-COMM-REACTION-API-LIST-001"],
      deliverables: ["DELETE /community/reactions", "count sync", "idempotent delete", "API 테스트"],
      acceptanceCriteria: [
        "리액션 삭제가 여러 번 호출되어도 count가 깨지지 않는다.",
        "권한 없는 사용자는 다른 사용자의 리액션을 삭제할 수 없다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-REPORT-API-CREATE-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 콘텐츠/작성자 신고 API",
      description: "게시글, 댓글, 작성자 신고 생성, 신고 사유, 중복 신고 정책, 신고자 보호, 관리자 큐 연결을 REST/OpenAPI endpoint로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "critical",
      capabilityKey: "community.safety.report.create",
      reuseSource: "Flotter report API reference",
      agentRole: "Backend Engineer",
      surfaces: ["api"],
      dependsOn: ["PB-COMM-POST-API-READ-001", "PB-COMM-COMMENT-API-LIST-001"],
      deliverables: ["POST /community/reports", "target model", "중복 신고 정책", "API 테스트"],
      acceptanceCriteria: [
        "사용자가 콘텐츠와 작성자를 신고할 수 있다.",
        "신고자 정보는 피신고자에게 노출되지 않는다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-BLOCK-API-CREATE-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 작성자 차단 API",
      description: "사용자가 작성자를 차단하고 피드/상세/댓글/알림 노출에서 제외하는 REST/OpenAPI endpoint와 정책을 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "critical",
      capabilityKey: "community.safety.block.create",
      reuseSource: "Flotter author block reference",
      agentRole: "Backend Engineer",
      surfaces: ["api"],
      dependsOn: ["PB-COMM-POST-API-READ-001"],
      deliverables: ["POST /community/blocks", "노출 제외 정책", "알림 차단 정책", "API 테스트"],
      acceptanceCriteria: [
        "차단한 작성자의 콘텐츠와 상호작용이 사용자 화면에서 제한된다.",
        "자기 자신 또는 시스템 계정 차단 같은 예외 정책이 정의되어 있다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-BLOCK-API-DELETE-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 작성자 차단 해제 API",
      description: "사용자별 작성자 차단 해제, 피드/상세 노출 복구, 감사 로그를 REST/OpenAPI endpoint로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "medium",
      capabilityKey: "community.safety.block.delete",
      reuseSource: "Flotter author unblock reference",
      agentRole: "Backend Engineer",
      surfaces: ["api"],
      dependsOn: ["PB-COMM-BLOCK-API-CREATE-001"],
      deliverables: ["DELETE /community/blocks/:authorId", "노출 복구 정책", "API 테스트"],
      acceptanceCriteria: [
        "차단 해제 후 피드/상세 노출 정책이 일관되게 복구된다.",
        "다른 사용자의 차단 목록은 수정할 수 없다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-HIDE-API-CREATE-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 콘텐츠 숨김 API",
      description: "사용자별 콘텐츠 숨김, 관리자 전역 숨김, 숨김 사유, 노출 제외 정책을 REST/OpenAPI endpoint로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "critical",
      capabilityKey: "community.safety.hide.create",
      reuseSource: "Flotter content hide reference",
      agentRole: "Backend Engineer",
      surfaces: ["api"],
      dependsOn: ["PB-COMM-POST-API-READ-001", "PB-COMM-COMMENT-API-LIST-001"],
      deliverables: ["POST /community/hidden-content", "사용자별/전역 숨김", "노출 제외 정책", "API 테스트"],
      acceptanceCriteria: [
        "사용자별 숨김과 관리자 전역 숨김이 구분된다.",
        "숨김 콘텐츠는 목록/상세/리액션/댓글 정책에 반영된다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-HIDE-API-DELETE-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 콘텐츠 숨김 해제 API",
      description: "사용자별 콘텐츠 숨김 해제, 관리자 복구, 노출 복구 정책과 감사 로그를 REST/OpenAPI endpoint로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "medium",
      capabilityKey: "community.safety.hide.delete",
      reuseSource: "Flotter content unhide/restore reference",
      agentRole: "Backend Engineer",
      surfaces: ["api"],
      dependsOn: ["PB-COMM-HIDE-API-CREATE-001"],
      deliverables: ["DELETE /community/hidden-content/:id", "복구 정책", "감사 로그", "API 테스트"],
      acceptanceCriteria: [
        "숨김 해제 후 목록/상세 노출 정책이 일관되게 복구된다.",
        "관리자 전역 숨김은 일반 사용자 API로 해제할 수 없다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-FILTER-API-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 정책 필터 API",
      description: "금칙어, URL/첨부 정책, 자동 숨김 후보, 수동 검토 큐 연결, 필터 로그를 REST/OpenAPI와 서버 정책으로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "critical",
      capabilityKey: "community.safety.filter",
      reuseSource: "Flotter moderation filter reference",
      agentRole: "Backend Engineer",
      surfaces: ["api", "admin"],
      dependsOn: ["PB-COMM-POST-API-CREATE-001", "PB-COMM-COMMENT-API-CREATE-001"],
      deliverables: ["filter policy", "검토 큐 연결", "filter log", "API 테스트"],
      acceptanceCriteria: [
        "정책 위반 후보가 자동 공개되지 않도록 상태 전이가 정의되어 있다.",
        "필터 조치와 관리자 검토 결과가 감사 가능하게 남는다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-MODERATION-API-LIST-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 모더레이션 큐 조회 API",
      description: "관리자가 신고, 필터 후보, 숨김/차단 이력, 처리 상태를 검색/필터/페이지네이션으로 조회하는 REST/OpenAPI endpoint를 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "community.moderation.api.list",
      reuseSource: "Flotter moderation admin API reference",
      agentRole: "Backend Engineer",
      surfaces: ["api", "admin"],
      dependsOn: ["PB-COMM-REPORT-API-CREATE-001", "PB-COMM-FILTER-API-001"],
      deliverables: ["GET /admin/community/moderation", "검색/필터", "권한 테스트", "API 테스트"],
      acceptanceCriteria: [
        "관리자만 모더레이션 큐를 조회할 수 있다.",
        "신고/필터/숨김/차단 상태가 한 화면에서 추적 가능한 형태로 응답된다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-MODERATION-API-ACTION-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 모더레이션 조치 API",
      description: "관리자 신고 해결/기각, 콘텐츠 숨김/복구, 작성자 제한, 필터 후보 승인/거절, 조치 사유와 감사 로그를 REST/OpenAPI endpoint로 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "critical",
      capabilityKey: "community.moderation.api.action",
      reuseSource: "Flotter moderation action API reference",
      agentRole: "Backend Engineer",
      surfaces: ["api", "admin"],
      dependsOn: ["PB-COMM-MODERATION-API-LIST-001", "PB-COMM-HIDE-API-CREATE-001"],
      deliverables: ["POST /admin/community/moderation/:id/actions", "조치 사유", "감사 로그", "API 테스트"],
      acceptanceCriteria: [
        "관리자 조치가 콘텐츠/작성자 상태와 감사 로그에 원자적으로 반영된다.",
        "Apple/Google UGC 요구에 필요한 신고 처리와 부적절 콘텐츠 조치 경로가 검증 가능하다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-API-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 REST API 통합 검수",
      description: "커뮤니티 게시글 CRUD, 댓글 CRUD, 리액션, 신고, 차단, 숨김, 필터, 모더레이션 API가 REST + OpenAPI 계약과 구현에서 일관되는지 검수하고 누락을 보강한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "community.rest-api",
      reuseSource: "Flotter community routes/hooks reference after REST/OpenAPI conversion",
      agentRole: "Backend Engineer",
      surfaces: ["api"],
      dependsOn: [
        "PB-COMM-SPACE-API-LIST-001",
        "PB-COMM-SPACE-API-CREATE-001",
        "PB-COMM-SPACE-API-UPDATE-001",
        "PB-COMM-SPACE-API-DELETE-001",
        "PB-COMM-MEMBERSHIP-API-001",
        "PB-COMM-MEMBER-API-001",
        "PB-COMM-MODERATOR-API-001",
        "PB-COMM-POST-API-LIST-001",
        "PB-COMM-POST-API-READ-001",
        "PB-COMM-POST-API-CREATE-001",
        "PB-COMM-POST-API-UPDATE-001",
        "PB-COMM-POST-API-DELETE-001",
        "PB-COMM-POST-OPS-API-001",
        "PB-COMM-COMMENT-API-LIST-001",
        "PB-COMM-COMMENT-API-CREATE-001",
        "PB-COMM-COMMENT-API-UPDATE-001",
        "PB-COMM-COMMENT-API-DELETE-001",
        "PB-COMM-COMMENT-OPS-API-001",
        "PB-COMM-REACTION-API-LIST-001",
        "PB-COMM-REACTION-API-SET-001",
        "PB-COMM-REACTION-API-DELETE-001",
        "PB-COMM-POLL-API-001",
        "PB-COMM-FEED-RANKING-API-001",
        "PB-COMM-KARMA-API-001",
        "PB-COMM-REPORT-API-CREATE-001",
        "PB-COMM-BLOCK-API-CREATE-001",
        "PB-COMM-BLOCK-API-DELETE-001",
        "PB-COMM-HIDE-API-CREATE-001",
        "PB-COMM-HIDE-API-DELETE-001",
        "PB-COMM-FILTER-API-001",
        "PB-COMM-RULES-FLAIR-API-001",
        "PB-COMM-MODERATION-API-LIST-001",
        "PB-COMM-MODERATION-API-ACTION-001",
        "PB-COMM-SANCTION-APPEAL-API-001",
        "PB-COMM-TIER-ONBOARDING-API-001",
      ],
      deliverables: ["community OpenAPI path matrix", "CRUD/API coverage report", "membership/moderator coverage", "feed/karma/poll coverage", "permission checks", "feed pagination/filtering"],
      acceptanceCriteria: [
        "커뮤니티, 게시글, 댓글은 list/read/create/update/delete 단위가 각각 검증 가능하다.",
        "멤버십, 모더레이터, 리액션, 투표, karma, 신고, 차단, 숨김, 필터, 제재/이의제기, 모더레이션 API가 인증/권한/차단/숨김 상태를 반영한다.",
        "피드 조회는 신고/숨김/차단/필터 상태에 따라 사용자에게 노출되는 콘텐츠를 제한한다.",
        "tRPC 없이 REST + OpenAPI 계약으로 노출된다.",
        "REUSE/N/A 결정이면 SKIP 사유와 참조 링크를 남긴다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-SAFETY-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 신고/차단/숨김/필터 정책",
      description: "콘텐츠/작성자 신고, 작성자 차단, 콘텐츠 숨김, 금칙어/정책 필터, 관리자 조치, 사용자 안전 안내를 Apple/Google UGC 요구에 맞춰 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "backend",
      priority: "critical",
      capabilityKey: "community.safety-moderation-policy",
      reuseSource: "Flotter moderation/report/block/filter reference",
      agentRole: "Backend Engineer",
      surfaces: ["api", "app", "admin"],
      dependsOn: ["PB-COMM-API-001", "PB-COMM-SANCTION-APPEAL-API-001", "PB-COMM-RULES-FLAIR-API-001"],
      deliverables: ["report/block/hide API", "filter policy", "rules/flair/banned words policy", "sanction/appeal policy", "moderation action policy", "UGC guideline checklist"],
      acceptanceCriteria: [
        "사용자가 콘텐츠와 작성자를 신고할 수 있다.",
        "사용자가 작성자를 차단하고 콘텐츠를 숨길 수 있다.",
        "금칙어/정책 필터와 관리자 검토 큐가 연결된다.",
        "제재/이의제기와 커뮤니티 규칙 수락 흐름이 사용자 안전 정책에 연결된다.",
        "Apple/Google UGC 요구에 필요한 신고, 차단, 모더레이션, 부적절 콘텐츠 처리 흐름이 누락되지 않는다.",
        "REUSE/N/A 결정이면 SKIP 사유와 참조 링크를 남긴다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-UI-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 사용자 UI",
      description: "커뮤니티 목록/상세, 가입/탈퇴, 멤버/모더레이터 표시, 피드, 게시글 상세, 댓글, 리액션, 투표, 작성/수정, 신고, 작성자 차단, 숨김, 필터 결과, 제재/이의제기, rules accept 상태를 사용자 앱 또는 공개/앱 영역에 구현한다.",
      decision: "N/A",
      category: "frontend",
      priority: "high",
      capabilityKey: "community.user-ui",
      reuseSource: "Flotter community pages/components and reaction widget reference",
      agentRole: "Frontend Engineer",
      surfaces: ["landing", "app"],
      dependsOn: ["PB-COMM-API-001", "PB-COMM-SAFETY-001", "PB-COMM-TIER-ONBOARDING-API-001", "PB-WEB-002"],
      deliverables: ["community list/detail UI", "membership UI", "post/comment/reaction/poll UI", "report/block/hide controls", "rules accept/onboarding UI", "filtered/hidden states"],
      acceptanceCriteria: [
        "리액션 UI가 게시글과 댓글에 연결된다.",
        "커뮤니티 가입/탈퇴, rules accept, 투표, 피드 정렬, karma/tier 상태가 사용자 UI에 반영된다.",
        "신고/차단/숨김 액션이 사용자에게 찾기 쉬운 위치에 있고 상태 피드백을 제공한다.",
        "차단/숨김/필터된 콘텐츠의 노출 상태가 API 정책과 일치한다.",
        "비로그인 공개 노출이 필요한 경우 탐색은 가능하되 작성/리액션/신고 같은 보호 액션은 auth modal로 게이트한다.",
        "REUSE/N/A 결정이면 SKIP 사유와 참조 링크를 남긴다.",
      ],
    }),
    pbTask({
      key: "PB-PAY-001",
      phase: "08 결제",
      title: "결제 범위/provider 결정",
      description: "단건/구독 범위, Polar/INICIS provider 선택, 고객 사업자/PG 계약 상태, 상품/주문/권한/환불/webhook 모델의 기준을 확정한다. 결제 미선택 시 N/A로 SKIP한다.",
      category: "backend",
      priority: "critical",
      capabilityKey: "payment.provider-entitlement",
      agentRole: "Payment Engineer",
      dependsOn: ["PB-DECIDE-001", "PB-DATA-001", "PB-AUTH-002"],
      deliverables: ["결제 provider 결정", "단건/구독 범위", "PG 계약/심사 상태", "상품/권한 모델", "webhook/환불 모델", "결제 제외 시 N/A 사유"],
      acceptanceCriteria: [
        "결제 선택 시 단건/구독 task 중 최소 하나가 실행 대상이다.",
        "결제 선택 시 Polar 또는 INICIS provider task 중 최소 하나가 실행 대상이다.",
        "INICIS 선택 시 고객 사업자와 KG이니시스 계약/심사/상점키 선행조건이 별도 task로 추적된다.",
        "결제 미선택 시 결제 관련 task가 삭제되지 않고 N/A 완료 issue로 남는다.",
      ],
    }),
    pbTask({
      key: "PB-PAY-REUSE-AUDIT-001",
      phase: "08 결제",
      title: "Flotter 결제 capability 재사용 감사",
      description: "Flotter의 `packages/features/payment`, `packages/drizzle/src/schema/features/payment`, `apps/app/src/features/payment`, `apps/admin/src/features/payment`를 조사해 product-builder-base로 재사용/확장할 Polar 결제 capability와 REST 전환 gap을 판정한다. 결제 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "reuse-audit",
      priority: "critical",
      capabilityKey: "payment.flotter-reuse-audit",
      reuseSource: "Flotter payment domain: Polar adapter, webhook dispatcher, 16-table schema, subscription/credit/top-up/admin UI",
      agentRole: "Solution Architect",
      surfaces: ["planning", "base", "api", "app", "admin"],
      dependsOn: ["PB-PAY-001", "PB-REUSE-001"],
      deliverables: ["Flotter 결제 파일/문서 조사", "REUSE/EXTEND/NEW 판정표", "tRPC→REST/OpenAPI 전환 gap", "product-builder-base 이관 후보"],
      acceptanceCriteria: [
        "Polar adapter/webhook/schema/app/admin 각 영역별 재사용 가능 여부가 분리되어 있다.",
        "Flotter의 tRPC router 의존성과 Product Builder의 REST/OpenAPI 표준 사이 gap이 기록되어 있다.",
        "재사용 가능하다고 판단한 코드는 그대로 복사하지 않고 product-builder-base 이관 전략으로 남긴다.",
      ],
    }),
    pbTask({
      key: "PB-PAY-DATA-001",
      phase: "08 결제",
      title: "결제 공통 데이터 모델",
      description: "provider-neutral 상품, 가격, 주문, 구독, 결제 고객, entitlement, webhook event, 환불, 감사 로그 schema를 Neon/Drizzle 기준으로 설계한다. product-builder-base를 구현 기준으로 두고, Flotter schema는 결제 capability 보강 reference로만 검토한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "payment.data-model",
      reuseSource: "Flotter payment 16-table schema reference",
      agentRole: "Data Engineer",
      dependsOn: ["PB-PAY-REUSE-AUDIT-001", "PB-DATA-001"],
      deliverables: ["payment schema", "provider mapping fields", "entitlement schema", "webhook event idempotency table", "migration"],
      acceptanceCriteria: [
        "provider-specific id는 provider-neutral 주문/구독 모델에서 분리되어 있다.",
        "webhook idempotency와 audit log가 schema에 포함된다.",
        "단건/구독/환불/권한 부여를 모두 표현할 수 있다.",
      ],
    }),
    pbTask({
      key: "PB-PAY-ONETIME-001",
      phase: "08 결제",
      title: "단건 결제 상품/주문 모델",
      description: "단건 구매 상품, 주문 생성, checkout 결과 검증, 구매 완료/실패 상태, entitlement 반영 기준을 구현한다. 미선택 시 N/A로 SKIP한다.",
      category: "backend",
      priority: "high",
      capabilityKey: "payment.one-time",
      agentRole: "Payment Engineer",
      dependsOn: ["PB-PAY-DATA-001"],
      deliverables: ["단건 상품 모델", "주문 상태 모델", "결제 검증 규칙", "구매 완료 entitlement"],
      acceptanceCriteria: [
        "단건 결제 선택 시 결제 금액/상태 위변조 검증이 포함되어 있다.",
        "미선택 시 N/A 완료 issue로 남는다.",
      ],
    }),
    pbTask({
      key: "PB-PAY-SUBSCRIPTION-001",
      phase: "08 결제",
      title: "구독 결제 월간/연간 플랜",
      description: "월간/연간 기본 구독 플랜, 구독 checkout, 갱신/취소 상태, entitlement 동기화를 구현한다. 미선택 시 N/A로 SKIP한다.",
      category: "backend",
      priority: "high",
      capabilityKey: "payment.subscription",
      agentRole: "Payment Engineer",
      dependsOn: ["PB-PAY-DATA-001"],
      deliverables: ["월간/연간 플랜", "구독 checkout", "구독 상태 동기화", "취소/갱신 처리"],
      acceptanceCriteria: [
        "구독 결제 선택 시 월간/연간 플랜이 기본으로 정의되어 있다.",
        "미선택 시 N/A 완료 issue로 남는다.",
      ],
    }),
    pbTask({
      key: "PB-PAY-CATALOG-API-LIST-001",
      phase: "08 결제",
      title: "결제 상품/플랜 조회 API",
      description: "공개 가격표와 관리자에서 사용할 결제 상품/플랜 목록, 상세, provider mapping, 활성 상태 조회 REST/OpenAPI endpoint를 구현한다. 결제 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "payment.catalog.api.read",
      agentRole: "Payment Engineer",
      dependsOn: ["PB-PAY-DATA-001"],
      deliverables: ["GET /payment/products", "GET /admin/payment/products", "OpenAPI schema", "권한 테스트"],
      acceptanceCriteria: [
        "공개 API는 구매 가능한 상품/플랜만 노출한다.",
        "관리자 API는 비활성 상품과 provider mapping 상태를 조회할 수 있다.",
      ],
    }),
    pbTask({
      key: "PB-PAY-CATALOG-API-CREATE-001",
      phase: "08 결제",
      title: "결제 상품/플랜 생성 API",
      description: "관리자가 단건 상품, 월간/연간 구독 플랜, provider product/price id mapping을 생성하는 REST/OpenAPI endpoint를 구현한다. 결제 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "payment.catalog.api.create",
      agentRole: "Payment Engineer",
      dependsOn: ["PB-PAY-CATALOG-API-LIST-001"],
      deliverables: ["POST /admin/payment/products", "request validation", "provider mapping validation", "API 테스트"],
      acceptanceCriteria: [
        "단건/구독 상품 타입별 필수 필드를 검증한다.",
        "provider product/price id 중복을 방지한다.",
      ],
    }),
    pbTask({
      key: "PB-PAY-CATALOG-API-UPDATE-001",
      phase: "08 결제",
      title: "결제 상품/플랜 수정 API",
      description: "상품명, 가격 노출, 활성 상태, provider mapping, 구독 플랜 월간/연간 설정을 수정하는 REST/OpenAPI endpoint를 구현한다. 결제 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "payment.catalog.api.update",
      agentRole: "Payment Engineer",
      dependsOn: ["PB-PAY-CATALOG-API-CREATE-001"],
      deliverables: ["PATCH /admin/payment/products/:id", "plan version/change policy", "API 테스트"],
      acceptanceCriteria: [
        "이미 결제된 상품의 가격/권한 변경 정책이 명확하다.",
        "provider mapping 변경은 audit log에 남는다.",
      ],
    }),
    pbTask({
      key: "PB-PAY-CATALOG-API-DELETE-001",
      phase: "08 결제",
      title: "결제 상품/플랜 비활성 API",
      description: "실제 삭제 대신 상품/플랜 비활성, archive, 신규 checkout 차단, 기존 주문/구독 이력 보존 REST/OpenAPI endpoint를 구현한다. 결제 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "medium",
      capabilityKey: "payment.catalog.api.delete",
      agentRole: "Payment Engineer",
      dependsOn: ["PB-PAY-CATALOG-API-LIST-001"],
      deliverables: ["DELETE/archive endpoint", "history preservation", "checkout guard", "API 테스트"],
      acceptanceCriteria: [
        "비활성 상품은 신규 checkout에 사용되지 않는다.",
        "기존 주문/구독/정산 이력은 보존된다.",
      ],
    }),
    pbTask({
      key: "PB-PAY-CHECKOUT-API-001",
      phase: "08 결제",
      title: "Checkout 생성 API",
      description: "선택된 provider로 단건/구독 checkout을 생성하고 success/cancel URL, idempotency key, coupon/discount, 사용자/조직 metadata를 연결하는 REST/OpenAPI endpoint를 구현한다.",
      decision: "N/A",
      category: "backend",
      priority: "critical",
      capabilityKey: "payment.checkout-api",
      agentRole: "Payment Engineer",
      dependsOn: ["PB-PAY-CATALOG-API-LIST-001", "PB-PAY-ONETIME-001", "PB-PAY-SUBSCRIPTION-001"],
      deliverables: ["POST /payment/checkouts", "idempotency guard", "provider dispatch", "success/cancel URL policy", "API 테스트"],
      acceptanceCriteria: [
        "빠른 중복 클릭으로 중복 checkout/order가 생성되지 않는다.",
        "provider별 checkout 응답을 공통 response로 정규화한다.",
      ],
    }),
    pbTask({
      key: "PB-PAY-WEBHOOK-API-001",
      phase: "08 결제",
      title: "결제 webhook 공통 처리",
      description: "provider webhook 수신, 서명 검증 위임, event idempotency, event type 정규화, 실패/deferred event logging, 재처리 정책을 구현한다.",
      decision: "N/A",
      category: "backend",
      priority: "critical",
      capabilityKey: "payment.webhook-core",
      agentRole: "Payment Engineer",
      dependsOn: ["PB-PAY-DATA-001"],
      deliverables: ["webhook event table", "event dispatcher", "idempotency", "retry/deferred log", "provider event normalization"],
      acceptanceCriteria: [
        "provider event id 기준 중복 처리가 보장된다.",
        "실패 이벤트는 운영자가 재처리할 수 있도록 남는다.",
      ],
    }),
    pbTask({
      key: "PB-PAY-ENTITLEMENT-001",
      phase: "08 결제",
      title: "결제 권한/entitlement 동기화",
      description: "결제 완료, 구독 활성/만료/해지, 환불, 관리자 조정에 따라 사용자 또는 조직 entitlement를 부여/회수하는 서비스와 API를 구현한다.",
      decision: "N/A",
      category: "backend",
      priority: "critical",
      capabilityKey: "payment.entitlement",
      agentRole: "Payment Engineer",
      dependsOn: ["PB-PAY-WEBHOOK-API-001", "PB-AUTH-002"],
      deliverables: ["entitlement service", "권한 조회 API", "상태 전이", "회귀 테스트"],
      acceptanceCriteria: [
        "결제 성공 전 보호 기능 권한이 열리지 않는다.",
        "환불/해지/만료 시 권한 회수 정책이 일관된다.",
      ],
    }),
    pbTask({
      key: "PB-PAY-ORDER-API-001",
      phase: "08 결제",
      title: "결제 주문/내역 API",
      description: "사용자 결제 내역, 관리자 주문 검색, provider order id 검색, 영수증/상태 조회 REST/OpenAPI endpoint를 구현한다. 결제 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "payment.order-api",
      agentRole: "Payment Engineer",
      dependsOn: ["PB-PAY-DATA-001", "PB-PAY-WEBHOOK-API-001"],
      deliverables: ["GET /payment/orders", "GET /admin/payment/orders", "provider id search", "권한 테스트"],
      acceptanceCriteria: [
        "사용자는 자기 결제 내역만 볼 수 있다.",
        "관리자는 provider order id와 내부 order id로 검색할 수 있다.",
      ],
    }),
    pbTask({
      key: "PB-PAY-REFUND-API-001",
      phase: "08 결제",
      title: "환불/취소 API",
      description: "사용자 환불 요청, 관리자 환불 승인/거절, provider refund/cancel 호출, 권한 회수, audit log REST/OpenAPI endpoint를 구현한다. 결제 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "payment.refund-api",
      agentRole: "Payment Engineer",
      dependsOn: ["PB-PAY-ORDER-API-001", "PB-PAY-ENTITLEMENT-001"],
      deliverables: ["환불 요청 API", "관리자 환불 API", "provider refund dispatch", "audit log", "권한 회수"],
      acceptanceCriteria: [
        "환불 가능 기간/부분환불/중복환불 정책이 명시되어 있다.",
        "provider 환불 성공과 DB 업데이트 사이 실패 보정 방안이 있다.",
      ],
    }),
    pbTask({
      key: "PB-PAY-POLAR-001",
      phase: "08 결제",
      title: "Polar.sh provider 이식/확장",
      description: "Flotter의 PolarAdapter, config, webhook controller/dispatcher, checkout, refund, subscription sync 구현을 product-builder-base의 REST/OpenAPI 구조로 이식하거나 확장한다. Polar 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "payment.provider.polar",
      reuseSource: "Flotter PolarAdapter, PolarWebhookController, payment webhooks, payment config",
      agentRole: "Payment Engineer",
      dependsOn: ["PB-PAY-REUSE-AUDIT-001", "PB-PAY-DATA-001"],
      deliverables: ["Polar provider adapter", "env/config", "REST/OpenAPI boundary", "sandbox/live mode policy"],
      acceptanceCriteria: [
        "Flotter Polar 구현의 재사용 가능 부분과 재작성 부분이 issue에 명확하다.",
        "tRPC 의존 없이 REST/OpenAPI 서버에서 provider를 호출한다.",
      ],
    }),
    pbTask({
      key: "PB-PAY-POLAR-CHECKOUT-001",
      phase: "08 결제",
      title: "Polar checkout/session 연결",
      description: "Polar hosted checkout 생성, product/price id mapping, success URL placeholder, idempotency key, coupon/discount 전달을 구현한다. Polar 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "payment.provider.polar.checkout",
      reuseSource: "Flotter PolarAdapter.createCheckout and checkout hooks",
      agentRole: "Payment Engineer",
      dependsOn: ["PB-PAY-POLAR-001", "PB-PAY-CHECKOUT-API-001"],
      deliverables: ["Polar checkout adapter", "success URL policy", "idempotency", "coupon/discount mapping", "sandbox test"],
      acceptanceCriteria: [
        "Polar checkout URL로 이동하고 success callback이 내부 주문과 연결된다.",
        "Polar API snake_case/placeholder 규칙이 테스트로 보호된다.",
      ],
    }),
    pbTask({
      key: "PB-PAY-POLAR-WEBHOOK-001",
      phase: "08 결제",
      title: "Polar webhook/signature 처리",
      description: "Polar standard webhook HMAC 서명, timestamp tolerance, raw body 검증, subscription/order/refund event dispatcher를 구현한다. Polar 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "critical",
      capabilityKey: "payment.provider.polar.webhook",
      reuseSource: "Flotter PolarWebhookController and PolarWebhookDispatcher",
      agentRole: "Payment Engineer",
      dependsOn: ["PB-PAY-POLAR-001", "PB-PAY-WEBHOOK-API-001"],
      deliverables: ["raw body route", "HMAC/timestamp verification", "event dispatcher", "idempotency tests"],
      acceptanceCriteria: [
        "서명 실패/타임스탬프 초과/중복 event가 안전하게 거부 또는 무시된다.",
        "subscription/order/refund event가 내부 주문/구독/권한으로 동기화된다.",
      ],
    }),
    pbTask({
      key: "PB-PAY-POLAR-REFUND-001",
      phase: "08 결제",
      title: "Polar 환불/구독 변경/해지 동기화",
      description: "Polar refundOrder, updateSubscription, cancel/uncancel, plan change, past_due/reconcile 흐름을 provider-neutral 환불/권한 정책에 연결한다. Polar 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "payment.provider.polar.refund-subscription",
      reuseSource: "Flotter SubscriptionService, Dunning/Reconcile cron, refund admin route",
      agentRole: "Payment Engineer",
      dependsOn: ["PB-PAY-POLAR-WEBHOOK-001", "PB-PAY-REFUND-API-001"],
      deliverables: ["refund adapter", "subscription update adapter", "reconcile policy", "admin refund test"],
      acceptanceCriteria: [
        "provider 호출 성공 후 DB 실패 시 webhook/reconcile 보정 정책이 있다.",
        "환불/해지 결과가 entitlement에 반영된다.",
      ],
    }),
    pbTask({
      key: "PB-PAY-INICIS-001",
      phase: "08 결제",
      title: "KG이니시스 상점 계약/env 선행작업",
      description: `고객 사업자와 KG이니시스 계약/심사, MID, signKey, API key, 가상계좌 사용 여부, 모바일/PC 표준결제 방식, 테스트/운영 상점 설정을 확정한다. 최초 개발 시 일반결제는 공식 매뉴얼 ${INICIS_STDPAY_PC_MANUAL_URL}, 정기결제는 공식 매뉴얼 ${INICIS_BILLING_MANUAL_URL}을 기준으로 하고 추론/블로그/샘플 기억 기반 구현을 금지한다. INICIS 미선택 시 N/A로 SKIP한다.`,
      decision: "N/A",
      category: "ops",
      priority: "critical",
      capabilityKey: "payment.provider.inicis.prerequisite",
      reuseSource: "Flotter docs reference mentions INICIS, but current payment source checkout shows no Inicis implementation",
      agentRole: "Payment Engineer",
      surfaces: ["api", "ops"],
      dependsOn: ["PB-PAY-001"],
      deliverables: ["KG이니시스 계약/심사 상태", "MID/signKey/API key env", "테스트 상점 정보", "운영 전환 checklist"],
      acceptanceCriteria: [
        "고객 사업자와 KG이니시스 계약/심사 상태가 issue에 명확히 남아 있다.",
        `일반결제 공식 매뉴얼 URL이 issue에 남아 있다: ${INICIS_STDPAY_PC_MANUAL_URL}`,
        `정기결제 공식 매뉴얼 URL이 issue에 남아 있다: ${INICIS_BILLING_MANUAL_URL}`,
        "공식 매뉴얼과 계약/상점 설정으로 확인되지 않은 필드는 추론해서 구현하지 않고 blocker 또는 follow-up으로 남긴다.",
        "상점키가 없으면 구현 완료가 아니라 외부 blocker로 표시된다.",
        "테스트/운영 env와 callback/webhook URL이 구분되어 있다.",
      ],
    }),
    pbTask({
      key: "PB-PAY-INICIS-CHECKOUT-001",
      phase: "08 결제",
      title: "INICIS 표준결제 checkout 요청",
      description: `KG이니시스 모바일/PC 표준결제 요청 form/redirect, oid 생성, 금액 위변조 방지 hash, buyer 정보, returnUrl/P_NEXT_URL을 구현한다. 최초 개발은 일반결제 공식 매뉴얼 ${INICIS_STDPAY_PC_MANUAL_URL}의 요청 파라미터/인증 흐름을 기준으로 하며, 문서에 없는 파라미터나 hash 계산은 추론하지 않는다. INICIS 미선택 시 N/A로 SKIP한다.`,
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "payment.provider.inicis.checkout",
      agentRole: "Payment Engineer",
      dependsOn: ["PB-PAY-INICIS-001", "PB-PAY-CHECKOUT-API-001"],
      deliverables: ["INICIS checkout request builder", "oid/idempotency", "hash generation", "redirect/form response", "sandbox test"],
      acceptanceCriteria: [
        `표준결제 요청 파라미터는 공식 일반결제 매뉴얼 ${INICIS_STDPAY_PC_MANUAL_URL} 기준으로 검증된다.`,
        "주문 금액/상품명/oid가 서버 원장 기준으로 생성된다.",
        "클라이언트 입력으로 금액을 신뢰하지 않는다.",
        "공식 매뉴얼로 확인되지 않은 필드는 임의 기본값을 넣지 않고 blocker/follow-up으로 남긴다.",
      ],
    }),
    pbTask({
      key: "PB-PAY-INICIS-APPROVAL-001",
      phase: "08 결제",
      title: "INICIS 승인 callback/P_NEXT_URL",
      description: `INICIS 인증 결과 callback을 받고 승인 API를 호출해 tid, 승인 금액, 결과 코드, 주문 상태, redirect 결과를 저장한다. 최초 개발은 일반결제 공식 매뉴얼 ${INICIS_STDPAY_PC_MANUAL_URL}의 인증결과/승인요청/승인결과 흐름을 기준으로 하며, callback/P_NEXT_URL 처리와 승인 API payload를 추론하지 않는다. INICIS 미선택 시 N/A로 SKIP한다.`,
      decision: "N/A",
      category: "backend",
      priority: "critical",
      capabilityKey: "payment.provider.inicis.approval",
      agentRole: "Payment Engineer",
      dependsOn: ["PB-PAY-INICIS-CHECKOUT-001", "PB-PAY-WEBHOOK-API-001"],
      deliverables: ["POST /payment/inicis/callback", "approval API client", "tid/order mapping", "success/fail redirect", "API 테스트"],
      acceptanceCriteria: [
        `인증결과, 승인요청, 승인결과 처리는 공식 일반결제 매뉴얼 ${INICIS_STDPAY_PC_MANUAL_URL} 기준으로 검증된다.`,
        "승인 callback 중복 수신이 idempotent하게 처리된다.",
        "승인 실패와 사용자 취소 상태가 주문 상태에 분리되어 남는다.",
        "공식 매뉴얼에서 확인되지 않은 응답 코드/필드는 임의로 성공 처리하지 않는다.",
      ],
    }),
    pbTask({
      key: "PB-PAY-INICIS-WEBHOOK-001",
      phase: "08 결제",
      title: "INICIS 가상계좌/입금통보 webhook",
      description: `KG이니시스 가상계좌 발급/입금/만료 통보 webhook을 수신하고 주문 상태와 entitlement를 동기화한다. 최초 개발은 일반결제 공식 매뉴얼 ${INICIS_STDPAY_PC_MANUAL_URL}과 KG이니시스 계약/상점 설정에서 확인되는 통보 URL/필드만 사용하며, 입금통보 payload를 추론하지 않는다. INICIS 또는 가상계좌 미선택 시 N/A로 SKIP한다.`,
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "payment.provider.inicis.webhook",
      agentRole: "Payment Engineer",
      dependsOn: ["PB-PAY-INICIS-APPROVAL-001", "PB-PAY-WEBHOOK-API-001"],
      deliverables: ["POST /webhook/inicis", "가상계좌 event parser", "입금 상태 동기화", "idempotency test"],
      acceptanceCriteria: [
        `가상계좌/입금통보 처리 근거는 공식 일반결제 매뉴얼 ${INICIS_STDPAY_PC_MANUAL_URL} 또는 KG이니시스 상점 설정 증거로 남긴다.`,
        "입금 전/후 권한 부여 시점이 명확하다.",
        "가상계좌 event 중복/지연 수신을 안전하게 처리한다.",
        "통보 payload나 서명 검증 방식이 공식 문서/상점 설정에서 확인되지 않으면 구현 완료로 보지 않는다.",
      ],
    }),
    pbTask({
      key: "PB-PAY-INICIS-CANCEL-001",
      phase: "08 결제",
      title: "INICIS Cancel API V2 환불",
      description: `KG이니시스 Cancel API V2 JSON 취소/부분취소, 취소 hash, 환불 가능 상태 검증, 실패 보정, 관리자 환불 UI 연동을 구현한다. 결제 생성/승인 context는 일반결제 공식 매뉴얼 ${INICIS_STDPAY_PC_MANUAL_URL} 기준으로 연결하고, Cancel API V2 상세는 공식 문서/계약 자료가 확보되지 않으면 추론 구현하지 않는다. INICIS 미선택 시 N/A로 SKIP한다.`,
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "payment.provider.inicis.cancel-refund",
      agentRole: "Payment Engineer",
      dependsOn: ["PB-PAY-INICIS-APPROVAL-001", "PB-PAY-REFUND-API-001"],
      deliverables: ["INICIS cancel API client", "partial refund policy", "refund idempotency", "audit log", "sandbox test"],
      acceptanceCriteria: [
        `환불 대상 거래 식별자는 공식 일반결제 매뉴얼 ${INICIS_STDPAY_PC_MANUAL_URL}의 승인 결과와 서버 원장 기준으로 매핑된다.`,
        "취소/부분취소 가능 상태와 금액이 서버에서 검증된다.",
        "환불 결과가 주문/권한/audit log에 반영된다.",
        "Cancel API V2 hash/payload가 공식 문서로 확인되지 않으면 blocker로 남기고 추론 구현하지 않는다.",
      ],
    }),
    pbTask({
      key: "PB-PAY-INICIS-COMPAT-001",
      phase: "08 결제",
      title: "INICIS 구독/정기결제 gap 판정",
      description: `선택한 INICIS 방식이 구독/정기결제를 지원하는지 확인하고, 월간/연간 구독이 필요한 경우 빌링키/정기과금 별도 계약 또는 N/A/대체 provider 판단을 남긴다. 최초 개발은 정기결제 공식 매뉴얼 ${INICIS_BILLING_MANUAL_URL}의 빌링키 발급/빌링승인 흐름을 기준으로 하며, 일반결제 ${INICIS_STDPAY_PC_MANUAL_URL}만으로 정기결제를 추론하지 않는다. INICIS 미선택 시 N/A로 SKIP한다.`,
      decision: "N/A",
      category: "planning",
      priority: "high",
      capabilityKey: "payment.provider.inicis.subscription-gap",
      agentRole: "Solution Architect",
      surfaces: ["planning", "api", "ops"],
      dependsOn: ["PB-PAY-INICIS-001", "PB-PAY-SUBSCRIPTION-001"],
      deliverables: ["정기결제 지원 여부", "빌링키 계약 필요 여부", "구독 scope decision", "provider 대체안"],
      acceptanceCriteria: [
        `정기결제 가능 여부는 공식 정기결제 매뉴얼 ${INICIS_BILLING_MANUAL_URL} 기준으로 판정된다.`,
        "구독 결제 선택 + INICIS 선택 시 정기결제 가능 여부가 명시되어 있다.",
        "빌링키 발급, 빌링승인, 월간/연간 과금 스케줄의 계약/상점 설정 증거가 없으면 구현 완료가 아니라 blocker로 남긴다.",
        "일반결제 공식 매뉴얼만 보고 정기결제를 추론하지 않는다.",
        "계약/심사 미확정이면 launch blocker로 남긴다.",
      ],
    }),
    pbTask({
      key: "PB-PAY-002",
      phase: "08 결제",
      title: "결제 REST API 통합 검수",
      description: "상품/플랜 CRUD, checkout, webhook, entitlement, 주문/내역, 환불 API가 REST/OpenAPI 계약과 구현에서 일관되는지 검수하고 누락을 보강한다.",
      category: "backend",
      priority: "high",
      capabilityKey: "payment.rest-api",
      agentRole: "Payment Engineer",
      dependsOn: [
        "PB-PAY-CATALOG-API-LIST-001",
        "PB-PAY-CATALOG-API-CREATE-001",
        "PB-PAY-CATALOG-API-UPDATE-001",
        "PB-PAY-CATALOG-API-DELETE-001",
        "PB-PAY-CHECKOUT-API-001",
        "PB-PAY-WEBHOOK-API-001",
        "PB-PAY-ENTITLEMENT-001",
        "PB-PAY-ORDER-API-001",
        "PB-PAY-REFUND-API-001",
      ],
    }),
    pbTask({
      key: "PB-PAY-003",
      phase: "08 결제",
      title: "결제 UI와 구매 전환",
      description: "가격/플랜, checkout 진입, 결제 완료/실패, 결제 내역, 구독/환불 요청, 권한 반영 UI를 구현한다.",
      category: "frontend",
      priority: "high",
      capabilityKey: "payment.purchase-ui",
      agentRole: "Frontend Engineer",
      dependsOn: ["PB-PAY-002", "PB-PAY-ENTITLEMENT-001", "PB-WEB-001", "PB-WEB-002"],
      deliverables: ["가격/플랜 UI", "checkout CTA", "결제 성공/실패 화면", "내 결제 내역", "구독/환불 요청 UI"],
      acceptanceCriteria: [
        "비로그인 구매 CTA는 auth modal 이후 원래 checkout 의도로 복귀한다.",
        "provider별 실패/취소 상태가 사용자에게 명확히 표시된다.",
      ],
    }),
    pbTask({
      key: "PB-PAY-QA-001",
      phase: "08 결제",
      title: "결제 E2E/운영 검증",
      description: "선택된 provider sandbox에서 상품 CRUD, checkout, webhook, 권한 부여, 결제 내역, 환불/취소, 관리자 결제 관리, 배포 env를 검증한다. 결제 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "qa",
      priority: "critical",
      capabilityKey: "payment.qa",
      agentRole: "QA Engineer",
      surfaces: ["qa", "ops"],
      dependsOn: ["PB-PAY-003", "PB-ADMIN-PAY-QA-001"],
      deliverables: ["provider sandbox 결제 증거", "webhook 수신 로그", "권한 부여/회수 검증", "환불/취소 검증", "env checklist"],
      acceptanceCriteria: [
        "선택 provider별 sandbox 결제 성공/실패/취소 흐름이 검증되어 있다.",
        "webhook 없이 성공 처리되는 false positive가 없다.",
        "Vercel env와 provider callback/webhook URL이 실제로 일치한다.",
      ],
    }),
    pbTask({
      key: "PB-PAY-ALT-001",
      phase: "08 결제",
      title: "대체 결제 provider 어댑터",
      description: "기본 결제 provider 외 추가 provider가 필요한 경우 어댑터를 구현한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "low",
      capabilityKey: "payment.adapter.optional",
      reuseSource: "선택되지 않은 provider",
      agentRole: "Payment Engineer",
      dependsOn: ["PB-PAY-001"],
    }),
    pbTask({
      key: "PB-NOTI-001",
      phase: "09 알림",
      title: "알림 서비스 기반",
      description: "가입/인증, 비밀번호 재설정, 결제, 주요 서비스 이벤트에 필요한 공통 NotificationService 포트, 채널 라우팅, 템플릿 키 네이밍, 발송 이력, 재시도 정책을 구현하거나 기존 capability를 확장한다.",
      decision: "EXTEND",
      category: "backend",
      priority: "medium",
      capabilityKey: "notification.core",
      reuseSource: "기존 NotificationService capability 확장",
      agentRole: "Backend Engineer",
      dependsOn: ["PB-AUTH-001", "PB-PAY-002"],
      deliverables: ["NotificationService 포트", "템플릿 키 레지스트리", "채널 라우팅", "발송 이력/재시도 정책"],
      acceptanceCriteria: [
        "신규 알림 추가는 템플릿 키와 채널 설정으로 확장할 수 있다.",
        "Email(Resend)과 알림톡 feature 선택값이 채널 task decision에 반영된다.",
        "발송 이력과 실패 재시도 정책이 정의되어 있다.",
      ],
    }),
    pbTask({
      key: "PB-NOTI-EMAIL-RESEND-001",
      phase: "09 알림",
      title: "Email(Resend) provider 연결",
      description: "Resend 기반 이메일 발송 provider, API key/env, 발신 도메인 인증(SPF/DKIM/DMARC), bounce/complaint 처리, Better Auth 메일 훅을 구현하거나 기존 capability를 확장한다. email 인증 필수이므로 기본 실행 대상이다.",
      decision: "EXTEND",
      category: "backend",
      priority: "high",
      capabilityKey: "notification.email.resend",
      reuseSource: "기존 SES/Resend email notification capability",
      agentRole: "Backend Engineer",
      dependsOn: ["PB-NOTI-001", "PB-INFRA-001", "PB-AUTH-EMAIL-001"],
      deliverables: ["Resend adapter", "SPF/DKIM/DMARC 체크", "bounce/complaint 처리", "Better Auth email hook"],
      acceptanceCriteria: [
        "Resend API key/env와 발신 도메인 인증 상태가 issue에 남아 있다.",
        "회원가입/확인/비밀번호 재설정 메일이 NotificationService EMAIL 채널로 라우팅된다.",
        "Email(Resend)은 email 인증 필수 조건으로 기본 실행 대상이다.",
      ],
    }),
    pbTask({
      key: "PB-NOTI-EMAIL-DATA-001",
      phase: "09 알림",
      title: "이메일 템플릿/발송 데이터 모델",
      description: "이메일 템플릿, 버전, 변수 스키마, 발송 요청, provider message id, 발송 상태, 실패 사유, 재시도 횟수를 저장할 Neon schema와 migration을 구현한다.",
      decision: "EXTEND",
      category: "backend",
      priority: "high",
      capabilityKey: "notification.email.data-model",
      reuseSource: "기존 이메일 템플릿/발송 이력 schema capability",
      agentRole: "Backend Engineer",
      dependsOn: ["PB-NOTI-001", "PB-DATA-001"],
      deliverables: ["email_templates schema", "email_template_versions schema", "email_send_logs schema", "migration", "seed template keys"],
      acceptanceCriteria: [
        "템플릿 키와 버전을 구분해 롤백/검증할 수 있다.",
        "발송 로그에는 수신자, provider message id, 상태, 실패 사유, 재시도 정보가 남는다.",
        "인증/비밀번호 재설정/트랜잭션 메일 seed key가 정의되어 있다.",
      ],
    }),
    pbTask({
      key: "PB-NOTI-EMAIL-TEMPLATE-001",
      phase: "09 알림",
      title: "이메일 템플릿 렌더링/검증",
      description: "시스템에서 이메일 템플릿 키, 변수 스키마, subject/body 렌더링, 미리보기 payload, 변수 누락 검증, locale/브랜드 기본값을 관리하는 기능을 구현하거나 기존 capability를 확장한다.",
      decision: "EXTEND",
      category: "backend",
      priority: "high",
      capabilityKey: "notification.email.template-manager",
      reuseSource: "기존 이메일 템플릿/발송 관리 capability",
      agentRole: "Backend Engineer",
      dependsOn: ["PB-NOTI-EMAIL-DATA-001", "PB-NOTI-EMAIL-RESEND-001"],
      deliverables: ["템플릿 키/변수 스키마", "subject/body renderer", "템플릿 미리보기 payload", "변수 검증", "기본 시스템 템플릿"],
      acceptanceCriteria: [
        "회원가입/인증/비밀번호 재설정/주요 트랜잭션 이메일 템플릿이 시스템에서 관리된다.",
        "템플릿 변수 누락 또는 타입 불일치를 발송 전에 검증한다.",
        "동일 템플릿 키의 draft/published 상태를 구분할 수 있다.",
      ],
    }),
    pbTask({
      key: "PB-NOTI-EMAIL-API-LIST-001",
      phase: "09 알림",
      title: "이메일 템플릿 조회 API",
      description: "관리자에서 이메일 템플릿 목록, 상세, 버전, 변수 스키마, 발송 상태 요약을 조회하는 REST/OpenAPI endpoint를 구현한다.",
      decision: "EXTEND",
      category: "backend",
      priority: "medium",
      capabilityKey: "notification.email.api.read",
      reuseSource: "기존 이메일 템플릿 read API capability",
      agentRole: "Backend Engineer",
      dependsOn: ["PB-NOTI-EMAIL-TEMPLATE-001"],
      deliverables: ["GET /admin/email-templates", "GET /admin/email-templates/:id", "OpenAPI schema", "권한 테스트"],
      acceptanceCriteria: [
        "관리자 권한 사용자만 템플릿 목록/상세를 조회할 수 있다.",
        "목록은 템플릿 키, 상태, updatedAt, 마지막 발송 상태 요약을 제공한다.",
      ],
    }),
    pbTask({
      key: "PB-NOTI-EMAIL-API-CREATE-001",
      phase: "09 알림",
      title: "이메일 템플릿 생성 API",
      description: "관리자가 이메일 템플릿 키, subject/body, 변수 스키마, 설명을 생성하는 REST/OpenAPI endpoint와 validation을 구현한다.",
      decision: "EXTEND",
      category: "backend",
      priority: "medium",
      capabilityKey: "notification.email.api.create",
      reuseSource: "기존 이메일 템플릿 create API capability",
      agentRole: "Backend Engineer",
      dependsOn: ["PB-NOTI-EMAIL-TEMPLATE-001"],
      deliverables: ["POST /admin/email-templates", "request validation", "중복 키 처리", "API 테스트"],
      acceptanceCriteria: [
        "중복 템플릿 키와 잘못된 변수 스키마를 422로 거부한다.",
        "생성된 템플릿은 draft 상태와 버전 정보를 가진다.",
      ],
    }),
    pbTask({
      key: "PB-NOTI-EMAIL-API-UPDATE-001",
      phase: "09 알림",
      title: "이메일 템플릿 수정/발행 API",
      description: "이메일 템플릿 subject/body/변수 스키마 수정, preview 검증, draft 발행, 버전 생성 REST/OpenAPI endpoint를 구현한다.",
      decision: "EXTEND",
      category: "backend",
      priority: "medium",
      capabilityKey: "notification.email.api.update",
      reuseSource: "기존 이메일 템플릿 update/publish API capability",
      agentRole: "Backend Engineer",
      dependsOn: ["PB-NOTI-EMAIL-API-LIST-001", "PB-NOTI-EMAIL-API-CREATE-001"],
      deliverables: ["PATCH /admin/email-templates/:id", "POST /admin/email-templates/:id/publish", "versioning", "API 테스트"],
      acceptanceCriteria: [
        "수정은 기존 published 버전을 깨지 않고 새 draft/version으로 관리된다.",
        "발행 전 변수 스키마와 preview payload 검증이 통과해야 한다.",
      ],
    }),
    pbTask({
      key: "PB-NOTI-EMAIL-API-DELETE-001",
      phase: "09 알림",
      title: "이메일 템플릿 삭제/비활성 API",
      description: "실제 삭제 대신 시스템 템플릿 보호, 비활성화, archive, 복구 가능 상태를 제공하는 REST/OpenAPI endpoint를 구현한다.",
      decision: "EXTEND",
      category: "backend",
      priority: "medium",
      capabilityKey: "notification.email.api.delete",
      reuseSource: "기존 이메일 템플릿 archive API capability",
      agentRole: "Backend Engineer",
      dependsOn: ["PB-NOTI-EMAIL-API-LIST-001"],
      deliverables: ["DELETE /admin/email-templates/:id 또는 archive endpoint", "system template guard", "복구 정책", "API 테스트"],
      acceptanceCriteria: [
        "필수 시스템 템플릿은 삭제되지 않고 보호된다.",
        "archive된 템플릿은 신규 발송에 사용되지 않지만 이력 조회는 가능하다.",
      ],
    }),
    pbTask({
      key: "PB-NOTI-EMAIL-SEND-001",
      phase: "09 알림",
      title: "이메일 미리보기/테스트/실발송 API",
      description: "이메일 템플릿 preview, 테스트 발송, 실제 트랜잭션 발송, idempotency key, rate limit, 발송 로그 기록 API를 구현한다.",
      decision: "EXTEND",
      category: "backend",
      priority: "high",
      capabilityKey: "notification.email.send-api",
      reuseSource: "기존 이메일 발송 API capability",
      agentRole: "Backend Engineer",
      dependsOn: ["PB-NOTI-EMAIL-RESEND-001", "PB-NOTI-EMAIL-TEMPLATE-001", "PB-NOTI-EMAIL-API-UPDATE-001"],
      deliverables: ["POST /admin/email-templates/:id/preview", "POST /admin/email-templates/:id/test-send", "transactional send service", "발송 로그", "rate limit"],
      acceptanceCriteria: [
        "운영자가 테스트 발송과 미리보기를 수행할 수 있다.",
        "실제 발송 결과, provider message id, 실패 사유가 발송 이력에 남는다.",
        "중복 발송 방지를 위한 idempotency 또는 equivalent guard가 있다.",
      ],
    }),
    pbTask({
      key: "PB-NOTI-EMAIL-ADMIN-001",
      phase: "09 알림",
      title: "이메일 템플릿 관리자 UI",
      description: "관리자에서 이메일 템플릿 목록/상세/생성/수정/발행/archive/미리보기/테스트 발송/발송 이력 조회 화면을 구현한다.",
      decision: "EXTEND",
      category: "admin",
      priority: "medium",
      capabilityKey: "notification.email.admin-ui",
      reuseSource: "기존 이메일 템플릿 관리자 UI capability",
      agentRole: "Admin Engineer",
      surfaces: ["admin"],
      dependsOn: [
        "PB-NOTI-EMAIL-API-LIST-001",
        "PB-NOTI-EMAIL-API-CREATE-001",
        "PB-NOTI-EMAIL-API-UPDATE-001",
        "PB-NOTI-EMAIL-API-DELETE-001",
        "PB-NOTI-EMAIL-SEND-001",
      ],
      deliverables: ["템플릿 목록/상세 UI", "생성/수정 form", "발행/archive action", "preview/test-send UI", "발송 이력 UI"],
      acceptanceCriteria: [
        "관리자 UI에서 이메일 템플릿 CRUD와 테스트 발송이 가능하다.",
        "실패 상태와 validation 오류가 사용자에게 명확히 표시된다.",
      ],
    }),
    pbTask({
      key: "PB-NOTI-EMAIL-QA-001",
      phase: "09 알림",
      title: "이메일 알림 검증",
      description: "회원가입/인증/비밀번호 재설정/테스트 발송/실패 재시도/발송 이력/관리자 CRUD 회귀 테스트를 수행한다.",
      decision: "EXTEND",
      category: "qa",
      priority: "medium",
      capabilityKey: "notification.email.qa",
      reuseSource: "기존 이메일 알림 QA checklist",
      agentRole: "QA Engineer",
      surfaces: ["qa"],
      dependsOn: ["PB-NOTI-EMAIL-ADMIN-001"],
      deliverables: ["이메일 알림 테스트 결과", "템플릿 CRUD 테스트", "발송 이력 증거", "실패/재시도 검증"],
      acceptanceCriteria: [
        "필수 이메일 flow가 실제 provider 또는 sandbox에서 발송까지 검증된다.",
        "CRUD/API/UI/발송 로그 증거가 issue에 남는다.",
      ],
    }),
    pbTask({
      key: "PB-NOTI-ALIMTALK-001",
      phase: "09 알림",
      title: "알림톡 provider/승인 선행작업",
      description: "Solapi/NHN/NCP 계열 provider 선택, 카카오 비즈채널/pfId, 발신 프로필, 템플릿 사전 승인 절차, SMS 대체발송 정책을 구현하거나 기존 capability를 확장한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "notification.alimtalk",
      reuseSource: "기존 알림톡/SMS notification capability",
      agentRole: "Backend Engineer",
      dependsOn: ["PB-NOTI-001", "PB-INFRA-001"],
      deliverables: ["provider/pfId 설정", "알림톡 템플릿 승인 목록", "templateId 매핑", "SMS 대체발송 정책"],
      acceptanceCriteria: [
        "알림톡 feature 선택 시 카카오 비즈채널, 발신 프로필, 템플릿 승인 선행작업이 issue에 추적된다.",
        "templateKey와 provider templateId 매핑이 NotificationService에 연결된다.",
        "알림톡 실패 시 SMS 대체발송 정책 또는 N/A 사유가 명시된다.",
        "미선택 시 N/A 완료 issue로 남는다.",
      ],
    }),
    pbTask({
      key: "PB-NOTI-ALIMTALK-DATA-001",
      phase: "09 알림",
      title: "알림톡 템플릿/발송 데이터 모델",
      description: "알림톡 템플릿 키, provider templateId, 승인 상태, 변수 스키마, SMS fallback 설정, 발송 요청/상태/실패 사유를 저장할 Neon schema와 migration을 구현한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "notification.alimtalk.data-model",
      reuseSource: "기존 알림톡 템플릿/발송 이력 schema capability",
      agentRole: "Backend Engineer",
      dependsOn: ["PB-NOTI-ALIMTALK-001", "PB-DATA-001"],
      deliverables: ["alimtalk_templates schema", "approval status model", "fallback policy fields", "send log schema", "migration"],
      acceptanceCriteria: [
        "카카오 승인 상태와 provider templateId를 템플릿 키별로 추적한다.",
        "SMS fallback 여부와 발송 로그가 감사 가능하게 남는다.",
        "미선택 시 N/A 완료 issue로 남는다.",
      ],
    }),
    pbTask({
      key: "PB-NOTI-ALIMTALK-API-LIST-001",
      phase: "09 알림",
      title: "알림톡 템플릿 조회 API",
      description: "관리자에서 알림톡 템플릿 목록, 상세, 승인 상태, provider templateId, 변수 스키마, fallback 정책을 조회하는 REST/OpenAPI endpoint를 구현한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "medium",
      capabilityKey: "notification.alimtalk.api.read",
      reuseSource: "기존 알림톡 read API capability",
      agentRole: "Backend Engineer",
      dependsOn: ["PB-NOTI-ALIMTALK-DATA-001"],
      deliverables: ["GET /admin/alimtalk-templates", "GET /admin/alimtalk-templates/:id", "OpenAPI schema", "권한 테스트"],
      acceptanceCriteria: [
        "관리자만 알림톡 템플릿과 승인 상태를 조회할 수 있다.",
        "미선택 시 N/A 완료 issue로 남는다.",
      ],
    }),
    pbTask({
      key: "PB-NOTI-ALIMTALK-API-CREATE-001",
      phase: "09 알림",
      title: "알림톡 템플릿 생성 API",
      description: "알림톡 템플릿 키, 본문, 변수 스키마, fallback 메시지, 승인 요청 메타데이터를 생성하는 REST/OpenAPI endpoint를 구현한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "medium",
      capabilityKey: "notification.alimtalk.api.create",
      reuseSource: "기존 알림톡 create API capability",
      agentRole: "Backend Engineer",
      dependsOn: ["PB-NOTI-ALIMTALK-DATA-001"],
      deliverables: ["POST /admin/alimtalk-templates", "request validation", "provider approval payload", "API 테스트"],
      acceptanceCriteria: [
        "중복 템플릿 키와 승인 불가한 변수/본문 형식을 거부한다.",
        "생성된 템플릿은 승인 대기 상태로 추적된다.",
        "미선택 시 N/A 완료 issue로 남는다.",
      ],
    }),
    pbTask({
      key: "PB-NOTI-ALIMTALK-API-UPDATE-001",
      phase: "09 알림",
      title: "알림톡 템플릿 수정/승인상태 동기화 API",
      description: "알림톡 템플릿 수정, provider templateId 매핑, 승인 상태 동기화, 재승인 요청 REST/OpenAPI endpoint를 구현한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "medium",
      capabilityKey: "notification.alimtalk.api.update",
      reuseSource: "기존 알림톡 update/sync API capability",
      agentRole: "Backend Engineer",
      dependsOn: ["PB-NOTI-ALIMTALK-API-LIST-001", "PB-NOTI-ALIMTALK-API-CREATE-001"],
      deliverables: ["PATCH /admin/alimtalk-templates/:id", "approval sync endpoint", "provider templateId mapping", "API 테스트"],
      acceptanceCriteria: [
        "승인 완료 전 템플릿은 실제 발송 대상에서 제외된다.",
        "provider 승인 상태가 시스템 상태와 동기화된다.",
        "미선택 시 N/A 완료 issue로 남는다.",
      ],
    }),
    pbTask({
      key: "PB-NOTI-ALIMTALK-API-DELETE-001",
      phase: "09 알림",
      title: "알림톡 템플릿 삭제/비활성 API",
      description: "알림톡 템플릿을 실제 삭제 대신 비활성/archive 처리하고 발송 이력을 보존하는 REST/OpenAPI endpoint를 구현한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "medium",
      capabilityKey: "notification.alimtalk.api.delete",
      reuseSource: "기존 알림톡 archive API capability",
      agentRole: "Backend Engineer",
      dependsOn: ["PB-NOTI-ALIMTALK-API-LIST-001"],
      deliverables: ["DELETE /admin/alimtalk-templates/:id 또는 archive endpoint", "발송 이력 보존", "비활성 정책", "API 테스트"],
      acceptanceCriteria: [
        "archive된 템플릿은 신규 발송에 사용되지 않는다.",
        "기존 발송 이력과 provider templateId 기록은 보존된다.",
        "미선택 시 N/A 완료 issue로 남는다.",
      ],
    }),
    pbTask({
      key: "PB-NOTI-ALIMTALK-SEND-001",
      phase: "09 알림",
      title: "알림톡 발송/SMS fallback API",
      description: "승인된 알림톡 템플릿으로 실제 발송, 테스트 발송, idempotency, rate limit, 실패 시 SMS fallback, 발송 로그 기록을 구현한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "high",
      capabilityKey: "notification.alimtalk.send-api",
      reuseSource: "기존 알림톡/SMS 발송 API capability",
      agentRole: "Backend Engineer",
      dependsOn: [
        "PB-NOTI-ALIMTALK-001",
        "PB-NOTI-ALIMTALK-API-UPDATE-001",
        "PB-NOTI-ALIMTALK-API-DELETE-001",
      ],
      deliverables: ["알림톡 send service", "test send endpoint", "SMS fallback", "발송 로그", "rate limit/idempotency"],
      acceptanceCriteria: [
        "승인된 템플릿만 발송된다.",
        "실패/차단/템플릿 불일치 시 fallback 또는 실패 정책이 발송 이력에 남는다.",
        "미선택 시 N/A 완료 issue로 남는다.",
      ],
    }),
    pbTask({
      key: "PB-NOTI-ALIMTALK-ADMIN-001",
      phase: "09 알림",
      title: "알림톡 관리자 UI",
      description: "관리자에서 알림톡 템플릿 목록/상세/생성/수정/archive/승인상태 동기화/테스트 발송/발송 이력 조회 화면을 구현한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "admin",
      priority: "medium",
      capabilityKey: "notification.alimtalk.admin-ui",
      reuseSource: "기존 알림톡 관리자 UI capability",
      agentRole: "Admin Engineer",
      surfaces: ["admin"],
      dependsOn: [
        "PB-NOTI-ALIMTALK-API-LIST-001",
        "PB-NOTI-ALIMTALK-API-CREATE-001",
        "PB-NOTI-ALIMTALK-API-UPDATE-001",
        "PB-NOTI-ALIMTALK-API-DELETE-001",
        "PB-NOTI-ALIMTALK-SEND-001",
      ],
      deliverables: ["템플릿 CRUD UI", "승인 상태 UI", "테스트 발송 UI", "fallback 설정 UI", "발송 이력 UI"],
      acceptanceCriteria: [
        "관리자 UI에서 알림톡 템플릿 CRUD와 승인 상태 확인이 가능하다.",
        "선택되지 않으면 N/A 완료 issue로 남는다.",
      ],
    }),
    pbTask({
      key: "PB-NOTI-ALIMTALK-QA-001",
      phase: "09 알림",
      title: "알림톡 검증",
      description: "알림톡 템플릿 CRUD API, 관리자 UI, 승인 상태 동기화, 테스트 발송, SMS fallback, 발송 이력 검증을 수행한다. 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "qa",
      priority: "medium",
      capabilityKey: "notification.alimtalk.qa",
      reuseSource: "기존 알림톡 QA checklist",
      agentRole: "QA Engineer",
      surfaces: ["qa"],
      dependsOn: ["PB-NOTI-ALIMTALK-ADMIN-001"],
      deliverables: ["알림톡 CRUD 테스트", "승인 상태 테스트", "발송/fallback 테스트", "관리자 UI 증거", "잔여 외부 승인 리스크"],
      acceptanceCriteria: [
        "CRUD 4개 API와 발송 API가 각각 검증되어 있다.",
        "카카오 비즈채널/템플릿 승인 같은 외부 선행조건이 issue에 남아 있다.",
        "미선택 시 N/A 완료 issue로 남는다.",
      ],
    }),
    pbTask({
      key: "PB-NOTI-ALT-001",
      phase: "09 알림",
      title: "SMS/푸시 기타 선택 채널",
      description: "프로젝트가 요구하는 경우 SMS, LMS, push 등 추가 채널과 승인 선행작업을 구현한다. 알림톡은 별도 feature task에서 다루며, 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "backend",
      priority: "low",
      capabilityKey: "notification.optional-channel",
      reuseSource: "선택되지 않은 알림 채널",
      agentRole: "Backend Engineer",
      dependsOn: ["PB-NOTI-001", "PB-NOTI-ALIMTALK-001"],
    }),
    pbTask({
      key: "PB-LOG-001",
      phase: "10 로그/관측",
      title: "앱 로그/에러 관측",
      description: "request id, 구조화 로그, Sentry 또는 동급 에러 관측, 결제/인증/관리자 이벤트 로깅을 구현한다.",
      category: "ops",
      priority: "medium",
      capabilityKey: "observability.app",
      agentRole: "Platform Engineer",
      dependsOn: ["PB-API-001", "PB-AUTH-001", "PB-SET-001", "PB-PAY-002"],
    }),
    pbTask({
      key: "PB-ADMIN-SUPER-ACCOUNT-001",
      phase: "11 관리자",
      title: "최초 슈퍼 계정 bootstrap",
      description: `최초 운영 진입과 검증을 위해 슈퍼 관리자 계정 \`${INITIAL_SUPER_ADMIN_EMAIL}\` / \`${INITIAL_SUPER_ADMIN_PASSWORD}\`을 seed 또는 bootstrap command로 생성한다. 이 기본 비밀번호는 알려진 값이므로 production 인수 전 반드시 교체 또는 비활성 처리한다.`,
      decision: "NEW",
      category: "admin",
      priority: "critical",
      capabilityKey: "admin.super-account-bootstrap",
      agentRole: "Admin Engineer",
      surfaces: ["api", "admin", "ops"],
      targetPaths: ["apps/api", "apps/admin", "Neon / Vercel"],
      dependsOn: ["PB-AUTH-002", "PB-INFRA-002"],
      deliverables: ["super admin seed/command", "초기 계정 생성 로그", "관리자 로그인 검증", "운영 전환 전 비밀번호 교체/비활성 절차"],
      acceptanceCriteria: [
        `초기 슈퍼 계정 email은 \`${INITIAL_SUPER_ADMIN_EMAIL}\`이다.`,
        `초기 슈퍼 계정 password는 \`${INITIAL_SUPER_ADMIN_PASSWORD}\`이다.`,
        "계정은 admin/super_admin 권한으로 관리자 앱에 접근할 수 있다.",
        "seed/command는 idempotent해야 하며 같은 계정을 중복 생성하지 않는다.",
        "production 인수 전 기본 비밀번호 교체, 계정 비활성, 또는 고객 소유 관리자 계정으로 권한 이전 여부가 issue에 기록되어 있다.",
        "실패 시 관리자 접근 검증을 완료로 보지 않는다.",
      ],
    }),
    pbTask({
      key: "PB-ADMIN-001",
      phase: "11 관리자",
      title: "관리자 앱/접근 제어",
      description: "관리자 전용 라우트, role guard, 관리자 shell, 비관리자 차단, 감사 로그 기반을 구현한다.",
      category: "admin",
      priority: "high",
      capabilityKey: "admin.shell-rbac",
      agentRole: "Admin Engineer",
      dependsOn: ["PB-AUTH-002", "PB-UI-001", "PB-LOG-001", "PB-ADMIN-SUPER-ACCOUNT-001"],
      deliverables: ["관리자 shell", "role guard", "감사 로그", "비관리자 차단"],
      acceptanceCriteria: [
        "관리자 권한 없이는 접근할 수 없다.",
        `최초 슈퍼 계정 \`${INITIAL_SUPER_ADMIN_EMAIL}\`으로 관리자 접근을 검증할 수 있다.`,
        "관리자 변경 작업이 감사 로그에 남는다.",
      ],
    }),
    pbTask({
      key: "PB-ADMIN-002",
      phase: "11 관리자",
      title: "도메인 운영 관리자 범위/권한",
      description: "서비스 핵심 리소스의 관리자 CRUD, 공개 상태 관리, 운영 필드, 검색/필터/페이지네이션 범위와 권한 경계를 확정한다.",
      category: "admin",
      priority: "high",
      capabilityKey: "admin.domain-management",
      agentRole: "Admin Engineer",
      dependsOn: ["PB-ADMIN-001", "PB-DOMAIN-001"],
      deliverables: ["도메인 관리자 resource map", "권한/감사 로그 정책", "CRUD 화면/API 범위", "운영 상태값"],
      acceptanceCriteria: [
        "관리자가 다룰 도메인 리소스와 금지된 작업이 구분되어 있다.",
        "후속 CRUD task가 각자 검증 가능한 acceptance path를 가진다.",
      ],
    }),
    pbTask({
      key: "PB-ADMIN-DOMAIN-LIST-001",
      phase: "11 관리자",
      title: "도메인 리소스 목록/검색 관리자",
      description: "관리자에서 핵심 도메인 리소스 목록, 검색, 필터, 정렬, 페이지네이션, 공개/비공개 상태 표시를 구현한다.",
      category: "admin",
      priority: "high",
      capabilityKey: "admin.domain.list",
      agentRole: "Admin Engineer",
      dependsOn: ["PB-ADMIN-002"],
      deliverables: ["관리자 목록 화면", "검색/필터", "페이지네이션", "권한 테스트"],
      acceptanceCriteria: [
        "관리자는 핵심 리소스를 검색/필터링해 찾을 수 있다.",
        "목록에는 운영에 필요한 상태와 최근 변경 정보가 표시된다.",
      ],
    }),
    pbTask({
      key: "PB-ADMIN-DOMAIN-READ-001",
      phase: "11 관리자",
      title: "도메인 리소스 상세 관리자",
      description: "관리자에서 핵심 도메인 리소스 상세, 공개 필드와 운영 필드, 관련 사용자/결제/콘텐츠 연결 정보를 조회하는 화면을 구현한다.",
      category: "admin",
      priority: "high",
      capabilityKey: "admin.domain.read",
      agentRole: "Admin Engineer",
      dependsOn: ["PB-ADMIN-DOMAIN-LIST-001"],
      deliverables: ["관리자 상세 화면", "운영 필드 표시", "관련 정보 링크", "권한 테스트"],
      acceptanceCriteria: [
        "관리자는 리소스 상세와 운영 상태를 확인할 수 있다.",
        "민감 정보는 권한에 맞게 마스킹 또는 숨김 처리된다.",
      ],
    }),
    pbTask({
      key: "PB-ADMIN-DOMAIN-CREATE-001",
      phase: "11 관리자",
      title: "도메인 리소스 생성 관리자",
      description: "관리자에서 핵심 도메인 리소스를 생성하고 draft/검수/공개 전 상태로 저장하는 form, validation, 감사 로그를 구현한다.",
      category: "admin",
      priority: "high",
      capabilityKey: "admin.domain.create",
      agentRole: "Admin Engineer",
      dependsOn: ["PB-ADMIN-DOMAIN-READ-001"],
      deliverables: ["생성 form", "validation", "draft 상태", "감사 로그"],
      acceptanceCriteria: [
        "필수 운영 필드와 공개 필드 validation이 분리되어 있다.",
        "생성 작업은 감사 로그에 남는다.",
      ],
    }),
    pbTask({
      key: "PB-ADMIN-DOMAIN-UPDATE-001",
      phase: "11 관리자",
      title: "도메인 리소스 수정/상태 관리자",
      description: "관리자에서 핵심 도메인 리소스 수정, 공개/비공개/추천/정렬/검수 상태 변경, 변경 이력 표시를 구현한다.",
      category: "admin",
      priority: "high",
      capabilityKey: "admin.domain.update",
      agentRole: "Admin Engineer",
      dependsOn: ["PB-ADMIN-DOMAIN-CREATE-001"],
      deliverables: ["수정 form", "상태 변경 action", "변경 이력", "감사 로그"],
      acceptanceCriteria: [
        "상태 변경은 허용된 전이만 가능하다.",
        "수정/상태 변경 작업은 감사 로그에 남는다.",
      ],
    }),
    pbTask({
      key: "PB-ADMIN-DOMAIN-DELETE-001",
      phase: "11 관리자",
      title: "도메인 리소스 비활성/archive 관리자",
      description: "관리자에서 핵심 도메인 리소스를 실제 삭제 대신 비활성/archive 처리하고 공개 노출과 연결 데이터를 안전하게 정리하는 흐름을 구현한다.",
      category: "admin",
      priority: "medium",
      capabilityKey: "admin.domain.delete",
      agentRole: "Admin Engineer",
      dependsOn: ["PB-ADMIN-DOMAIN-READ-001"],
      deliverables: ["archive action", "노출 차단", "연결 데이터 보존 정책", "감사 로그"],
      acceptanceCriteria: [
        "archive된 리소스는 공개/앱 노출에서 제외된다.",
        "기존 주문/이력/감사 데이터는 보존된다.",
      ],
    }),
    pbTask({
      key: "PB-ADMIN-DOMAIN-QA-001",
      phase: "11 관리자",
      title: "도메인 운영 관리자 QA",
      description: "도메인 리소스 목록/상세/생성/수정/비활성, 검색/필터, 권한, 감사 로그를 관리자 E2E와 API 연결 증거로 검증한다.",
      category: "qa",
      priority: "medium",
      capabilityKey: "admin.domain.qa",
      agentRole: "QA Engineer",
      surfaces: ["qa"],
      dependsOn: [
        "PB-ADMIN-DOMAIN-LIST-001",
        "PB-ADMIN-DOMAIN-READ-001",
        "PB-ADMIN-DOMAIN-CREATE-001",
        "PB-ADMIN-DOMAIN-UPDATE-001",
        "PB-ADMIN-DOMAIN-DELETE-001",
      ],
      deliverables: ["관리자 CRUD 테스트", "권한 검증", "감사 로그 증거", "잔여 리스크"],
      acceptanceCriteria: [
        "CRUD 각 작업의 성공/실패/권한 없는 접근이 검증되어 있다.",
        "관리자 변경 작업 감사 로그가 확인된다.",
      ],
    }),
    pbTask({
      key: "PB-ADMIN-USERS-001",
      phase: "11 관리자",
      title: "사용자 관리 범위/권한",
      description: "기본 관리자 기능으로 사용자 검색, 상세, 초대/생성, role 변경, 계정 상태, 세션/정지/삭제, 임퍼소네이트 정책 범위와 권한 경계를 확정한다.",
      category: "admin",
      priority: "high",
      capabilityKey: "admin.user-management",
      agentRole: "Admin Engineer",
      dependsOn: ["PB-ADMIN-001", "PB-AUTH-002"],
      deliverables: ["사용자 목록/검색", "사용자 상세", "role/status 변경", "감사 로그"],
      acceptanceCriteria: [
        "사용자 관리는 온라인 서비스형 관리자 기본 task로 항상 생성된다.",
        "관리자 변경 작업은 감사 로그에 남는다.",
      ],
    }),
    pbTask({
      key: "PB-ADMIN-USERS-LIST-001",
      phase: "11 관리자",
      title: "사용자 목록/검색 관리자",
      description: "관리자에서 사용자 목록, 검색, 필터, 가입/최근활동/상태/role 기준 정렬과 페이지네이션을 구현한다.",
      decision: "EXTEND",
      category: "admin",
      priority: "high",
      capabilityKey: "admin.users.list",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.adminUserManagement,
      agentRole: "Admin Engineer",
      dependsOn: ["PB-ADMIN-USERS-001"],
      deliverables: ["사용자 목록 화면", "검색/필터", "페이지네이션", "권한 테스트"],
      acceptanceCriteria: [
        "관리자는 사용자 목록을 검색/필터링해 찾을 수 있다.",
        "민감 정보는 목록에서 마스킹 또는 제외된다.",
      ],
    }),
    pbTask({
      key: "PB-ADMIN-USERS-READ-001",
      phase: "11 관리자",
      title: "사용자 상세 관리자",
      description: "관리자에서 사용자 상세, 인증 provider, 이메일 인증 상태, 결제/권한 요약, 세션/활동 요약, 감사 로그를 조회하는 화면을 구현한다.",
      decision: "EXTEND",
      category: "admin",
      priority: "high",
      capabilityKey: "admin.users.read",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.adminUserManagement,
      agentRole: "Admin Engineer",
      dependsOn: ["PB-ADMIN-USERS-LIST-001"],
      deliverables: ["사용자 상세 화면", "인증/권한 요약", "활동/감사 로그", "권한 테스트"],
      acceptanceCriteria: [
        "관리자는 사용자의 운영 상태와 관련 이력을 확인할 수 있다.",
        "세션 token, provider secret 같은 민감 정보는 노출되지 않는다.",
      ],
    }),
    pbTask({
      key: "PB-ADMIN-USERS-CREATE-001",
      phase: "11 관리자",
      title: "사용자 초대/생성 관리자",
      description: "관리자에서 사용자 초대 또는 운영자 계정 생성을 처리하고, 이메일 발송, 초기 role, 만료/재초대 정책을 구현한다.",
      decision: "EXTEND",
      category: "admin",
      priority: "medium",
      capabilityKey: "admin.users.create",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.adminUserManagement,
      agentRole: "Admin Engineer",
      dependsOn: ["PB-ADMIN-USERS-READ-001", "PB-NOTI-EMAIL-RESEND-001"],
      deliverables: ["초대/생성 form", "초대 메일", "초기 role 정책", "감사 로그"],
      acceptanceCriteria: [
        "중복 이메일과 잘못된 role은 validation으로 차단된다.",
        "초대/생성 작업은 감사 로그에 남는다.",
      ],
    }),
    pbTask({
      key: "PB-ADMIN-USERS-UPDATE-001",
      phase: "11 관리자",
      title: "사용자 프로필/메타 수정 관리자",
      description: "관리자에서 사용자 운영 메모, 표시명, 고객별 메타데이터 등 허용된 필드를 수정하는 화면과 API 연결을 구현한다.",
      decision: "EXTEND",
      category: "admin",
      priority: "medium",
      capabilityKey: "admin.users.update",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.adminUserManagement,
      agentRole: "Admin Engineer",
      dependsOn: ["PB-ADMIN-USERS-READ-001"],
      deliverables: ["수정 form", "허용 필드 validation", "감사 로그", "API 테스트"],
      acceptanceCriteria: [
        "관리자가 수정할 수 있는 필드와 사용자가 직접 수정해야 하는 필드가 구분된다.",
        "수정 작업은 감사 로그에 남는다.",
      ],
    }),
    pbTask({
      key: "PB-ADMIN-USERS-STATUS-001",
      phase: "11 관리자",
      title: "사용자 role/status 변경 관리자",
      description: "관리자에서 사용자 role, 정지/해제, 이메일 인증 상태 보정, 임퍼소네이트 허용 여부 같은 계정 상태 변경을 구현한다.",
      decision: "EXTEND",
      category: "admin",
      priority: "high",
      capabilityKey: "admin.users.status",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.adminUserManagement,
      agentRole: "Admin Engineer",
      dependsOn: ["PB-ADMIN-USERS-READ-001"],
      deliverables: ["role/status action", "정지/해제", "임퍼소네이트 정책", "감사 로그"],
      acceptanceCriteria: [
        "권한 상승/강등은 허용된 관리자만 수행할 수 있다.",
        "정지된 사용자는 보호 기능과 결제/커뮤니티 액션이 제한된다.",
      ],
    }),
    pbTask({
      key: "PB-ADMIN-USERS-DELETE-001",
      phase: "11 관리자",
      title: "사용자 비활성/삭제 관리자",
      description: "관리자에서 사용자 계정 비활성, 삭제 요청 처리, 데이터 보존/익명화, 세션 revoke를 구현한다.",
      decision: "EXTEND",
      category: "admin",
      priority: "high",
      capabilityKey: "admin.users.delete",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.adminUserManagement,
      agentRole: "Admin Engineer",
      dependsOn: ["PB-ADMIN-USERS-READ-001", "PB-AUTH-ACCOUNT-DELETE-001"],
      deliverables: ["비활성/delete action", "데이터 보존 정책", "세션 revoke", "감사 로그"],
      acceptanceCriteria: [
        "삭제/비활성은 되돌릴 수 있는 작업과 되돌릴 수 없는 작업이 구분된다.",
        "계정 처리 후 세션과 권한 상태가 일관되게 정리된다.",
      ],
    }),
    pbTask({
      key: "PB-ADMIN-USERS-QA-001",
      phase: "11 관리자",
      title: "사용자 관리 QA",
      description: "사용자 목록/상세/초대/수정/role-status/비활성, 권한, 감사 로그를 관리자 E2E와 API 연결 증거로 검증한다.",
      decision: "EXTEND",
      category: "qa",
      priority: "medium",
      capabilityKey: "admin.users.qa",
      reuseSource: PRODUCT_BUILDER_BASE_REUSE_SOURCES.adminUserManagementQa,
      agentRole: "QA Engineer",
      surfaces: ["qa"],
      dependsOn: [
        "PB-ADMIN-USERS-LIST-001",
        "PB-ADMIN-USERS-READ-001",
        "PB-ADMIN-USERS-CREATE-001",
        "PB-ADMIN-USERS-UPDATE-001",
        "PB-ADMIN-USERS-STATUS-001",
        "PB-ADMIN-USERS-DELETE-001",
      ],
      deliverables: ["사용자 관리 CRUD 테스트", "권한 검증", "감사 로그 증거", "잔여 리스크"],
      acceptanceCriteria: [
        "사용자 관리 CRUD/상태 변경이 각각 검증되어 있다.",
        "비관리자 접근과 권한 없는 관리자 작업이 차단된다.",
      ],
    }),
    pbTask({
      key: "PB-ADMIN-PAY-001",
      phase: "08 결제",
      title: "결제 관리 범위/권한",
      description: "결제 선택 시 결제 내역, entitlement, 환불, 구독 변경, 정산/매출 리포트 관리 기능의 관리자 범위와 권한 경계를 확정한다. 결제 미선택 시 N/A로 SKIP한다.",
      category: "admin",
      priority: "high",
      capabilityKey: "admin.payment-management",
      agentRole: "Admin Engineer",
      dependsOn: ["PB-ADMIN-001", "PB-PAY-002"],
      deliverables: ["결제 내역", "entitlement 관리", "환불/구독 변경", "결제 감사 로그"],
      acceptanceCriteria: [
        "결제 선택 시 결제/환불/구독 관리 흐름이 관리자에 연결된다.",
        "결제 미선택 시 N/A 완료 issue로 남고 관리자 대시보드를 막지 않는다.",
      ],
    }),
    pbTask({
      key: "PB-ADMIN-PAY-LIST-001",
      phase: "08 결제",
      title: "결제 주문/구독 목록 관리자",
      description: "관리자에서 결제 주문, 구독, provider id, 사용자, 상태, 기간, 금액 기준 검색/필터/페이지네이션을 구현한다. 결제 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "admin",
      priority: "high",
      capabilityKey: "admin.payment.list",
      agentRole: "Admin Engineer",
      dependsOn: ["PB-ADMIN-PAY-001", "PB-PAY-ORDER-API-001"],
      deliverables: ["결제 목록 화면", "검색/필터", "provider id 검색", "권한 테스트"],
      acceptanceCriteria: [
        "관리자는 주문/구독을 상태와 provider id로 찾을 수 있다.",
        "결제 민감 정보는 마스킹되고 필요한 운영 정보만 노출된다.",
      ],
    }),
    pbTask({
      key: "PB-ADMIN-PAY-READ-001",
      phase: "08 결제",
      title: "결제 주문/구독 상세 관리자",
      description: "관리자에서 결제 주문/구독 상세, webhook event, entitlement, 환불 이력, provider 원장 연결 정보를 조회하는 화면을 구현한다.",
      decision: "N/A",
      category: "admin",
      priority: "high",
      capabilityKey: "admin.payment.read",
      agentRole: "Admin Engineer",
      dependsOn: ["PB-ADMIN-PAY-LIST-001"],
      deliverables: ["결제 상세 화면", "webhook/event timeline", "entitlement 상태", "권한 테스트"],
      acceptanceCriteria: [
        "관리자는 결제 상태와 권한 부여 상태의 차이를 확인할 수 있다.",
        "provider event와 내부 주문 상태가 함께 표시된다.",
      ],
    }),
    pbTask({
      key: "PB-ADMIN-PAY-REFUND-001",
      phase: "08 결제",
      title: "관리자 환불/취소 처리",
      description: "관리자에서 환불 가능 여부 확인, 전액/부분환불, 승인/거절, provider refund dispatch, 권한 회수와 감사 로그를 구현한다.",
      decision: "N/A",
      category: "admin",
      priority: "high",
      capabilityKey: "admin.payment.refund",
      agentRole: "Admin Engineer",
      dependsOn: ["PB-ADMIN-PAY-READ-001", "PB-PAY-REFUND-API-001"],
      deliverables: ["환불 action UI", "부분환불 정책", "권한 회수 표시", "감사 로그"],
      acceptanceCriteria: [
        "환불 가능 기간/금액/중복환불 정책이 화면과 API에서 일치한다.",
        "환불 조치와 권한 회수 결과가 감사 로그에 남는다.",
      ],
    }),
    pbTask({
      key: "PB-ADMIN-PAY-ENTITLEMENT-001",
      phase: "08 결제",
      title: "관리자 entitlement 조정",
      description: "관리자에서 결제 권한 상태 조회, 수동 조정, 만료/회수, 보정 사유, 사용자 영향 표시와 감사 로그를 구현한다.",
      decision: "N/A",
      category: "admin",
      priority: "high",
      capabilityKey: "admin.payment.entitlement",
      agentRole: "Admin Engineer",
      dependsOn: ["PB-ADMIN-PAY-READ-001", "PB-PAY-ENTITLEMENT-001"],
      deliverables: ["entitlement 조정 UI", "보정 사유", "권한 회수/부여", "감사 로그"],
      acceptanceCriteria: [
        "수동 entitlement 조정은 권한 있는 관리자만 수행할 수 있다.",
        "조정 사유와 전후 상태가 감사 로그에 남는다.",
      ],
    }),
    pbTask({
      key: "PB-ADMIN-PAY-REPORT-001",
      phase: "08 결제",
      title: "결제 매출/정산 리포트 관리자",
      description: "관리자에서 매출, 환불, 구독 상태, provider별 성공/실패, 정산 참고 데이터를 조회하는 운영 리포트를 구현한다.",
      decision: "N/A",
      category: "admin",
      priority: "medium",
      capabilityKey: "admin.payment.report",
      agentRole: "Admin Engineer",
      dependsOn: ["PB-ADMIN-PAY-LIST-001"],
      deliverables: ["매출/환불 리포트", "provider별 상태", "CSV/export 필요 여부", "권한 테스트"],
      acceptanceCriteria: [
        "결제/환불/구독 주요 운영 지표가 확인 가능하다.",
        "정산 확정값이 아닌 참고 리포트인 경우 한계가 명시된다.",
      ],
    }),
    pbTask({
      key: "PB-ADMIN-PAY-QA-001",
      phase: "08 결제",
      title: "결제 관리 QA",
      description: "결제 목록/상세/환불/entitlement/리포트, 권한, 감사 로그를 선택 provider sandbox 결과와 함께 검증한다. 결제 미선택 시 N/A로 SKIP한다.",
      decision: "N/A",
      category: "qa",
      priority: "medium",
      capabilityKey: "admin.payment.qa",
      agentRole: "QA Engineer",
      surfaces: ["qa"],
      dependsOn: [
        "PB-ADMIN-PAY-LIST-001",
        "PB-ADMIN-PAY-READ-001",
        "PB-ADMIN-PAY-REFUND-001",
        "PB-ADMIN-PAY-ENTITLEMENT-001",
        "PB-ADMIN-PAY-REPORT-001",
      ],
      deliverables: ["결제 관리자 테스트", "환불/권한 조정 증거", "감사 로그 증거", "잔여 리스크"],
      acceptanceCriteria: [
        "관리자 결제 조회/환불/권한 조정이 각각 검증되어 있다.",
        "결제 미선택 시 N/A 완료 issue로 남는다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-ADMIN-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 신고/모더레이션 관리자",
      description: "관리자에서 신고 큐, 콘텐츠/작성자 조치, 차단/해제, 숨김/복구, 필터 로그, 모더레이션 감사 로그를 처리하는 운영 화면을 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "admin",
      priority: "high",
      capabilityKey: "community.admin-moderation",
      reuseSource: "Flotter community reports/admin/moderation pages reference",
      agentRole: "Admin Engineer",
      surfaces: ["admin"],
      dependsOn: ["PB-ADMIN-001", "PB-ADMIN-USERS-READ-001", "PB-COMM-SAFETY-001", "PB-COMM-MODERATION-API-ACTION-001"],
      deliverables: ["신고 큐", "모더레이션 상세", "차단/숨김/복구 액션", "필터/감사 로그"],
      acceptanceCriteria: [
        "관리자는 신고 대상과 신고자, 조치 상태, 조치 이력을 확인할 수 있다.",
        "차단/해제, 숨김/복구, 신고 해결/기각이 감사 로그에 남는다.",
        "커뮤니티 feature 미선택 시 N/A 완료 issue로 남고 기본 관리자 task를 막지 않는다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-ADMIN-STATS-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 운영 통계 관리자",
      description: "관리자에서 커뮤니티 목록, 삭제/archive, 전체 통계, 신고 통계, SLA 초과 신고, 제재/appeal 현황, 운영 지표를 조회하는 화면을 구현하거나 기존 capability를 확장한다.",
      decision: "N/A",
      category: "admin",
      priority: "medium",
      capabilityKey: "community.admin-stats",
      reuseSource: "product-builder-base apps/admin community stats/reports reference",
      agentRole: "Admin Engineer",
      surfaces: ["admin"],
      dependsOn: ["PB-COMM-ADMIN-001", "PB-COMM-KARMA-API-001", "PB-COMM-SANCTION-APPEAL-API-001"],
      deliverables: ["community list/admin stats", "report stats", "SLA overdue queue", "sanction/appeal dashboard", "운영 지표 QA"],
      acceptanceCriteria: [
        "관리자는 커뮤니티별/전체 게시글, 댓글, 멤버, 신고, 처리 SLA를 확인할 수 있다.",
        "제재와 이의제기 현황이 신고/모더레이션 큐와 연결된다.",
        "커뮤니티 feature 미선택 시 N/A 완료 issue로 남는다.",
      ],
    }),
    pbTask({
      key: "PB-ADMIN-004",
      phase: "11 관리자",
      title: "관리자 대시보드",
      description: "가입, 활성, 결제, 핵심 도메인 지표를 보여주는 운영 대시보드를 구현한다.",
      category: "admin",
      priority: "medium",
      capabilityKey: "admin.dashboard",
      agentRole: "Admin Engineer",
      dependsOn: ["PB-ADMIN-DOMAIN-QA-001", "PB-ADMIN-USERS-QA-001", "PB-ADMIN-PAY-QA-001", "PB-COMM-ADMIN-STATS-001"],
    }),
    pbTask({
      key: "PB-AI-001",
      phase: "12 에이전트 연동",
      title: "기획 보강 에이전트 연동",
      description: "고객 intake가 부족할 때 에이전트가 추가 질문, 범위 리스크, 구현 task 보강안을 제안한다.",
      decision: "EXTEND",
      category: "ai",
      priority: "medium",
      capabilityKey: "agent.planning-assistant",
      reuseSource: "Paperclip managed agent/session APIs",
      agentRole: "AI Integration Engineer",
      dependsOn: ["PB-PLAN-002"],
      deliverables: ["질문 생성 prompt", "보강안 저장 구조", "operator approval gate"],
      acceptanceCriteria: [
        "에이전트 제안은 자동 반영되지 않고 operator 확인을 거친다.",
        "제안이 생성 issue 본문 또는 후속 issue에 추적된다.",
      ],
    }),
    pbTask({
      key: "PB-COMM-QA-001",
      phase: "08 커뮤니티",
      title: "커뮤니티 가이드라인/모더레이션 QA",
      description: "게시글/댓글/리액션, 신고, 작성자 차단, 숨김, 필터, 관리자 모더레이션, Apple/Google UGC 요구 충족 여부를 E2E와 정책 체크리스트로 검증한다.",
      decision: "N/A",
      category: "qa",
      priority: "critical",
      capabilityKey: "community.moderation-qa",
      reuseSource: "Flotter community moderation flow reference",
      agentRole: "QA Engineer",
      surfaces: ["qa"],
      dependsOn: ["PB-COMM-UI-001", "PB-COMM-ADMIN-001", "PB-COMM-ADMIN-STATS-001"],
      deliverables: ["community E2E 결과", "UGC guideline checklist", "membership/moderator evidence", "sanction/appeal evidence", "admin stats evidence", "잔여 리스크"],
      acceptanceCriteria: [
        "사용자가 커뮤니티 가입/탈퇴, 게시글/댓글 작성, 리액션, 투표를 수행할 수 있다.",
        "신고, 작성자 차단, 콘텐츠 숨김, 필터 상태가 사용자 화면과 API에서 일관된다.",
        "관리자가 rules/flair/금칙어, 신고 큐, 제재/이의제기, 감사 로그, 운영 통계를 확인할 수 있다.",
        "모더레이터 초대/권한, 게시글 pin/lock/remove, 댓글 sticky/distinguish/remove가 권한과 감사 로그 기준으로 검증되어 있다.",
        "Apple/Google UGC 요구에 필요한 사용자 안전/신고/차단/모더레이션 경로가 검증되어 있다.",
        "미선택 시 N/A 완료 issue로 남는다.",
      ],
    }),
    pbTask({
      key: "PB-QA-001",
      phase: "13 QA",
      title: "품질/계약 검증",
      description: "빌드, 타입체크, lint, OpenAPI 계약, migration, 핵심 API/권한 테스트를 검증한다.",
      category: "qa",
      priority: "high",
      capabilityKey: "qa.contract-build",
      agentRole: "QA Engineer",
      dependsOn: ["PB-DOMAIN-001", "PB-AUTH-QA-001", "PB-PAY-002", "PB-ADMIN-DOMAIN-QA-001", "PB-ADMIN-USERS-QA-001", "PB-ADMIN-PAY-QA-001", "PB-COMM-QA-001"],
      deliverables: ["검증 체크리스트", "자동/수동 테스트 결과", "잔여 리스크"],
      acceptanceCriteria: [
        "빌드/타입체크/lint가 통과한다.",
        "OpenAPI contract와 구현이 동기화되어 있다.",
        "권한/결제/관리자 주요 흐름이 검증된다.",
      ],
    }),
    pbTask({
      key: "PB-QA-002",
      phase: "13 QA",
      title: "E2E/SEO 검증",
      description: "가입→로그인→핵심 기능→결제→관리자 변경→로그아웃 흐름과 SEO metadata/structured data/accessibility를 검증한다.",
      category: "qa",
      priority: "high",
      capabilityKey: "qa.e2e-seo",
      agentRole: "QA Engineer",
      dependsOn: ["PB-WEB-001", "PB-AUTH-003", "PB-WEB-002", "PB-PAY-003", "PB-ADMIN-USERS-QA-001", "PB-ADMIN-PAY-QA-001"],
      deliverables: ["E2E 테스트 결과", "SEO metadata 검증", "public browse/auth modal 검증", "접근성 결과"],
      acceptanceCriteria: [
        "비로그인 사용자가 공개 페이지를 탐색할 수 있다.",
        "보호 기능 CTA가 auth modal을 열고 로그인 후 원래 액션으로 복귀한다.",
        "가입→로그인→핵심 기능→로그아웃 흐름이 통과한다.",
      ],
    }),
    pbTask({
      key: "PB-OPS-001",
      phase: "14 배포/운영",
      title: "스테이징/프로덕션 배포",
      description: "Vercel 배포, Neon 운영, env/secrets, auth callback, 결제 sandbox/live 전환, 승인 gate를 처리한다.",
      category: "ops",
      priority: "medium",
      capabilityKey: "ops.deploy",
      agentRole: "Delivery Lead",
      dependsOn: ["PB-QA-001", "PB-QA-002", "PB-INFRA-001", "PB-INFRA-002"],
      deliverables: ["스테이징 배포", "프로덕션 승인 gate", "배포 체크리스트", "rollback 계획"],
      acceptanceCriteria: [
        "Neon/Vercel 기준의 운영 절차가 있다.",
        "프로덕션 배포 전 승인 gate가 남아 있다.",
      ],
    }),
    pbTask({
      key: "PB-DEPLOY-VERIFY-001",
      phase: "14 배포/운영",
      title: "Vercel/Neon 배포 연결 검증",
      description: "Vercel Preview/Production URL, Neon 연결, env/secrets, auth callback URL, health endpoint가 실제 배포 환경에서 맞물리는지 검증한다.",
      category: "ops",
      priority: "critical",
      capabilityKey: "ops.vercel-neon-deploy-verify",
      agentRole: "Platform Engineer",
      dependsOn: ["PB-OPS-001"],
      deliverables: ["Preview URL", "Production URL", "Vercel env diff", "Neon connection proof", "health check 결과"],
      acceptanceCriteria: [
        "Preview와 Production URL이 issue에 기록되어 있다.",
        "Vercel 환경변수와 Neon DATABASE_URL 연결이 실제 배포에서 확인되어 있다.",
        "auth callback URL이 Preview/Production 도메인과 일치한다.",
        "배포 URL의 health check 또는 동등한 smoke endpoint가 통과한다.",
      ],
    }),
    pbTask({
      key: "PB-LAUNCH-SMOKE-001",
      phase: "14 배포/운영",
      title: "실서비스 로그인 smoke 검증",
      description: "최종 배포 URL에서 공개 탐색, auth modal, 회원가입/로그인, 보호 기능 진입, 관리자 접근 제어를 실제 브라우저로 검증한다.",
      category: "qa",
      priority: "critical",
      capabilityKey: "qa.production-login-smoke",
      agentRole: "QA Engineer",
      surfaces: ["landing", "app", "admin", "qa", "ops"],
      targetPaths: ["Vercel Production URL", "apps/web", "apps/app", "apps/admin", "tests / QA checklist"],
      dependsOn: ["PB-DEPLOY-VERIFY-001"],
      deliverables: ["브라우저 smoke 결과", "로그인 계정/테스트 데이터", "스크린샷 또는 녹화", "잔여 이슈"],
      acceptanceCriteria: [
        "비로그인 상태에서 공개 페이지가 열리고 핵심 콘텐츠가 보인다.",
        "보호 기능 CTA를 누르면 로그인/회원가입 모달이 뜬다.",
        "회원가입 또는 테스트 계정 로그인 후 보호 기능 화면에 진입한다.",
        `관리자 URL은 비관리자에게 차단되고 최초 슈퍼 계정 \`${INITIAL_SUPER_ADMIN_EMAIL}\`으로 접근 가능하다.`,
        "운영 전환 전 기본 슈퍼 계정 비밀번호 교체/비활성/권한 이전 상태가 확인되어 있다.",
        "검증 증거가 issue에 남아 있고 실패 항목은 launch blocker로 분리된다.",
      ],
    }),
    pbTask({
      key: "PB-OPS-002",
      phase: "14 배포/운영",
      title: "운영 인수인계",
      description: "런북, 모니터링, 백업/복구, 관리자 계정, 시크릿 관리, 고객 인수인계 문서를 정리한다.",
      category: "ops",
      priority: "medium",
      capabilityKey: "ops.launch-handoff",
      agentRole: "Delivery Lead",
      dependsOn: ["PB-LAUNCH-SMOKE-001"],
      deliverables: ["런북", "운영 인수인계", "모니터링 체크리스트", "고객 전달 문서"],
    }),
    pbTask({
      key: "PB-PORT-001",
      phase: "15 포팅",
      title: "Neon/Vercel 외 환경 포팅",
      description: "Supabase, RDS, Railway, self-host 등 다른 DB/배포 환경으로 옮기는 작업은 온라인 서비스형 기본 생성 범위에서 제외하고 별도 workflow로 실행한다.",
      decision: "N/A",
      category: "ops",
      priority: "low",
      capabilityKey: "ops.environment-porting",
      reuseSource: "별도 porting workflow",
      agentRole: "Platform Engineer",
      dependsOn: ["PB-OPS-002"],
      acceptanceCriteria: [
        "다른 DB/배포 환경 전환은 별도 porting workflow로 명시되어 있다.",
        "기본 온라인 서비스형 issue graph에서는 N/A 완료 issue로 남는다.",
      ],
    }),
  ],
};

function withExtraDependency(task: ProductBuilderTask, dependency: string): ProductBuilderTask {
  return {
    ...task,
    dependsOn: [...(task.dependsOn ?? []), dependency],
  };
}

function webApplicationTask(task: ProductBuilderTask): ProductBuilderTask {
  switch (task.key) {
    case "PB-BASE-001":
      return {
        ...task,
        description:
          `외주 납품용 웹 어플리케이션 서비스의 실제 구현 기준이 되는 product-builder-base repo 상태를 확인한다. 기준 원격은 ${PRODUCT_BUILDER_BASE_GITHUB_URL}, 로컬 path는 ${PRODUCT_BUILDER_BASE_LOCAL_PATH}, 기본 branch는 ${PRODUCT_BUILDER_BASE_DEFAULT_BRANCH}다. Flotter는 보강 reference로만 사용한다.`,
      };
    case "PB-FOUND-001":
      return {
        ...task,
        title: "Vite React SPA 프로젝트 세팅",
        description:
          "product-builder-base를 기준으로 SEO가 필요없는 Vite React SPA, REST API 서버 연결, 관리자 진입점, AI 서버 연동 기반을 구성한다.",
        surfaces: ["shared", "app", "admin", "api", "ai-server"],
        targetPaths: targetPathsForSurfaces(["shared", "app", "admin", "api", "ai-server"]),
        capabilityKey: "stack.vite-react-spa",
        deliverables: ["Vite React 앱", "SPA 라우팅/레이아웃", "환경변수 구조", "기본 품질 게이트", "Vercel 기본 설정"],
        acceptanceCriteria: [
          "SPA 라우팅과 로그인 후 앱 shell이 준비되어 있다.",
          "빌드/타입체크/린트 명령이 문서화되어 있다.",
          "고객별 구현은 product-builder-base에서 파생되는 구조다.",
          "Vercel 배포를 전제로 한 env naming이 정리되어 있다.",
        ],
      };
    case "PB-API-001":
      return {
        ...task,
        title: "REST/OpenAPI + AI 서버 계약 설계",
        description:
          "SPA, 관리자, API 서버, AI 서버가 공유할 REST + OpenAPI 계약을 정의한다. tRPC는 사용하지 않는다.",
        surfaces: ["shared", "api", "ai-server"],
        targetPaths: targetPathsForSurfaces(["shared", "api", "ai-server"]),
        deliverables: ["OpenAPI spec", "API error contract", "auth scope rules", "AI server boundary contract"],
      };
    case "PB-AUTH-003":
      return {
        ...task,
        title: "SPA 로그인 진입/세션 게이트",
        description:
          "로그인 전에는 제품 소개/진입 화면을 보여주고, 핵심 작업 시작/저장/AI 요청 같은 보호 액션에서 로그인/회원가입 모달 또는 SPA auth flow를 띄운다.",
        surfaces: ["app"],
        targetPaths: targetPathsForSurfaces(["app"]),
        capabilityKey: "auth.spa-action-gate",
        deliverables: ["SPA auth modal/flow", "gated action hook", "로그인/회원가입 전환", "session redirect regression"],
        acceptanceCriteria: [
          "로그인 전 사용자가 제품의 진입 화면과 가치 제안을 볼 수 있다.",
          "핵심 보호 액션은 세션 확인 후 auth flow를 띄운다.",
          "로그인 성공 후 사용자가 시도한 작업 또는 목적지로 복귀한다.",
        ],
      };
    case "PB-UI-001":
      return {
        ...task,
        title: "SPA 디자인 시스템과 앱 셸",
        description:
          "로그인 후 SPA, 관리자 앱, AI 기능 상태 화면에서 공유할 디자인 토큰, 컴포넌트, 레이아웃 shell을 구성한다.",
        surfaces: ["shared", "app", "admin"],
        targetPaths: targetPathsForSurfaces(["shared", "app", "admin"]),
      };
    case "PB-DATA-001":
      return {
        ...task,
        title: "웹 어플리케이션 데이터 모델",
        description:
          "선택된 웹 어플리케이션의 핵심 리소스, 사용자 소유 데이터, AI 작업/결과 상태, 관리자 운영 필드, 인덱스를 Neon schema로 설계한다.",
      };
    case "PB-DOMAIN-001":
      return {
        ...task,
        title: "앱 서비스 REST API",
        description:
          "선택된 웹 어플리케이션의 핵심 리소스 CRUD/조회/상태 변경 API를 OpenAPI 계약에 맞춰 구현한다.",
      };
    case "PB-WEB-001":
      return {
        ...task,
        phase: "06 SPA 앱",
        title: "SPA 어플리케이션 화면 구현",
        description:
          "검색 유입용 공개 페이지가 아니라 로그인 전/후 SPA 화면, 주요 작업 화면, 상태/로딩/에러/빈 상태, 접근성을 구현한다.",
        surfaces: ["app"],
        targetPaths: targetPathsForSurfaces(["app"]),
        capabilityKey: "web.spa-app",
        deliverables: ["SPA route", "주요 작업 화면", "상태/로딩/에러/빈 상태", "반응형/접근성"],
        acceptanceCriteria: [
          "검색 유입용 metadata보다 앱 사용 흐름과 상태 처리를 우선한다.",
          "인증 전/후 화면 전환이 명확하다.",
          "핵심 작업 화면이 API contract와 연결될 준비가 되어 있다.",
        ],
      };
    case "PB-WEB-002":
      return {
        ...task,
        phase: "07 서비스 앱",
        title: "로그인 사용자 앱 흐름",
        description:
          "로그인 후 핵심 업무 흐름, 내 페이지, 작업 상태, AI 결과/이력, 권한 없음/로딩/에러 상태를 구현한다.",
        deliverables: ["private route", "내 페이지", "핵심 업무 UI", "AI 결과/이력 UI", "로딩/에러/권한 상태"],
      };
    case "PB-AI-001":
      return {
        ...task,
        title: "AI 기능 기획 보강",
        description:
          "고객 intake가 부족할 때 AI 기능의 사용자 가치, 입력/출력, 모델 경계, 비용/안전 리스크, 구현 task 보강안을 제안한다.",
      };
    case "PB-QA-001":
      return withExtraDependency({
        ...task,
        description:
          "빌드, 타입체크, lint, OpenAPI 계약, migration, 핵심 API/권한/AI 서버 테스트를 검증한다.",
        deliverables: ["검증 체크리스트", "자동/수동 테스트 결과", "AI 서버 테스트 결과", "잔여 리스크"],
      }, "PB-AISRV-003");
    case "PB-QA-002":
      return withExtraDependency({
        ...task,
        title: "E2E/SPA/AI 검증",
        description:
          "가입→로그인→핵심 앱 기능→AI 요청/결과→결제→관리자 변경→로그아웃 흐름과 SPA 접근성/상태 처리를 검증한다.",
        capabilityKey: "qa.e2e-spa-ai",
      }, "PB-AISRV-002");
    case "PB-OPS-001":
      return {
        ...task,
        description:
          "Vercel 배포, Neon 운영, env/secrets, auth callback, AI provider secrets, 결제 sandbox/live 전환, 승인 gate를 처리한다.",
        deliverables: ["스테이징 배포", "프로덕션 승인 gate", "AI server env 체크리스트", "배포 체크리스트", "rollback 계획"],
      };
    default:
      return task;
  }
}

const AI_SERVER_TASKS: ProductBuilderTask[] = [
  pbTask({
    key: "PB-AISRV-001",
    phase: "12 AI 서버",
    title: "AI 서버 경계/런타임 설계",
    description:
      "AI 기능을 별도 서버/런타임 경계로 분리하고 model provider, prompt/runtime, secrets, 비용, 로그, timeout/retry 정책을 설계한다.",
    category: "ai",
    priority: "critical",
    capabilityKey: "ai.server-runtime",
    agentRole: "AI Runtime Engineer",
    dependsOn: ["PB-API-001", "PB-DATA-001", "PB-LOG-001"],
    deliverables: ["AI server boundary", "model/provider config", "prompt/runtime contract", "cost/logging policy"],
    acceptanceCriteria: [
      "AI 서버는 SPA/API 서버와 계약으로 분리되어 있다.",
      "provider secret과 모델 설정이 환경별로 분리되어 있다.",
      "timeout, retry, rate limit, cost guard가 정의되어 있다.",
    ],
  }),
  pbTask({
    key: "PB-AISRV-002",
    phase: "12 AI 서버",
    title: "AI 기능 API/작업 처리",
    description:
      "AI 요청 생성, 작업 상태 조회, 결과 저장/조회, 실패/재시도, 사용자별 권한/사용량 제한을 REST API와 서버 런타임에 연결한다.",
    category: "ai",
    priority: "high",
    capabilityKey: "ai.job-api",
    agentRole: "AI Runtime Engineer",
    dependsOn: ["PB-AISRV-001", "PB-DOMAIN-001", "PB-WEB-002"],
    deliverables: ["AI request API", "job/status model", "result persistence", "usage guard"],
    acceptanceCriteria: [
      "사용자가 AI 요청 상태와 결과를 조회할 수 있다.",
      "실패/재시도/timeout 상태가 API contract에 반영되어 있다.",
      "사용량 제한 또는 비용 보호 장치가 있다.",
    ],
  }),
  pbTask({
    key: "PB-AISRV-003",
    phase: "12 AI 서버",
    title: "AI 서버 관측/비용/안전장치",
    description:
      "AI 요청 로그, 비용 추적, 입력/출력 redaction, 정책 위반 처리, 운영 알림을 구현한다.",
    category: "ai",
    priority: "high",
    capabilityKey: "ai.observability-safety",
    agentRole: "AI Runtime Engineer",
    dependsOn: ["PB-AISRV-002", "PB-LOG-001"],
    deliverables: ["AI request logs", "cost tracking", "redaction policy", "safety/error handling"],
    acceptanceCriteria: [
      "AI 요청/응답 로그에서 민감정보가 보호된다.",
      "비용과 실패율을 운영자가 확인할 수 있다.",
      "정책 위반/오류 상태가 사용자와 관리자에게 일관되게 표시된다.",
    ],
  }),
];

const WEB_APPLICATION_TASKS = ONLINE_SERVICE_BLUEPRINT.tasks
  .map(webApplicationTask)
  .flatMap((task) => (task.key === "PB-AI-001" ? [task, ...AI_SERVER_TASKS] : [task]));

export const WEB_APPLICATION_SERVICE_BLUEPRINT: ProductBuilderBlueprint = {
  id: "web-application-service-standard",
  displayName: "웹 어플리케이션 서비스",
  shortName: "Web Application Service Standard",
  productClass: "SEO가 필요없는 SPA + REST 서버 + 관리자 + AI 서버",
  description:
    "Vite React SPA, REST API 서버, 관리자, AI 서버, Neon, Vercel을 기본값으로 하는 웹 어플리케이션 제작 워크플로우.",
  baseRepository: {
    ...ONLINE_SERVICE_BLUEPRINT.baseRepository,
    role: "BBR 외주 납품용 웹 어플리케이션 기준 모노레포",
  },
  defaultStack: {
    web: "Vite React SPA",
    api: "REST + OpenAPI API server",
    database: "Neon Postgres",
    deploy: "Vercel",
    auth: "Auth.js or hosted auth adapter",
    contract: "OpenAPI first, no tRPC",
    ai: "Separate AI server / runtime boundary",
  },
  constraints: [
    "SEO/AEO/GEO가 핵심이 아니므로 SPA 어플리케이션을 기본으로 한다.",
    "웹 어플리케이션 서비스는 SPA, REST API 서버, 관리자, AI 서버를 큰 축으로 분리한다.",
    "기본 DB와 배포 환경은 Neon + Vercel로 고정한다.",
    "tRPC는 Product Builder 표준 워크플로우에서 제외한다.",
    "로그인 전에는 제품 진입 화면을 보여주고, 보호된 앱 작업을 시작할 때 auth flow를 띄운다.",
    "실제 납품 완료는 Vercel 배포 URL에서 로그인, 보호 기능, 관리자 접근 제어, AI 서버 smoke가 검증되어야 한다.",
    "웹 어플리케이션 서비스의 큰 task는 매번 고정 생성한다.",
    "해당하지 않는 task는 삭제하지 않고 REUSE 또는 N/A로 SKIP 처리한다.",
    "Feature 선택은 task 삭제가 아니라 관련 task의 기본 결정값(NEW/EXTEND/REUSE/N/A)으로 반영한다.",
    "파일 업로드는 Vercel Blob 기반 기본 feature로 제공하고, BLOB_READ_WRITE_TOKEN/env, client upload, metadata, 삭제/권한/QA task를 고정 생성한다.",
    "온라인 영상 강의는 Cloudflare Stream 기반 선택 feature로 제공하고, 선택되지 않으면 관련 task를 N/A SKIP으로 남긴다.",
    "커뮤니티는 재사용 가능한 선택 feature이며, 선택 시 커뮤니티 CRUD, 멤버십, 게시글/댓글 CRUD, 리액션, 투표, 피드 랭킹, karma, 신고/차단/숨김/필터, 규칙/flair, 제재/이의제기, 사용자 UI, 관리자 모더레이션/통계 task를 EXTEND로 실행한다.",
    "재사용 판정(REUSE/EXTEND)과 신규 구현(NEW)은 issue에서 명시적으로 분리한다.",
    "실제 구현 기준 코드베이스는 product-builder-base로 둔다.",
    `product-builder-base repo는 ${PRODUCT_BUILDER_BASE_GITHUB_URL} / ${PRODUCT_BUILDER_BASE_LOCAL_PATH} 를 기준으로 한다.`,
    "Flotter의 기존 기능은 복사 대상이 아니라 product-builder-base capability를 보강하기 위한 reference로만 추적한다.",
  ],
  defaultIntake: WEB_APPLICATION_SERVICE_INTAKE,
  defaultFeatureSelection: DEFAULT_FEATURE_SELECTION,
  defaultDomainFeatures: WEB_APPLICATION_DOMAIN_FEATURES,
  tasks: WEB_APPLICATION_TASKS,
};

export const BLUEPRINTS = [ONLINE_SERVICE_BLUEPRINT, WEB_APPLICATION_SERVICE_BLUEPRINT] as const;

export function getBlueprint(blueprintId: string | undefined): ProductBuilderBlueprint {
  const id = blueprintId || ONLINE_SERVICE_BLUEPRINT.id;
  const blueprint = BLUEPRINTS.find((entry) => entry.id === id);
  if (!blueprint) throw new Error(`Unknown Product Builder blueprint: ${id}`);
  return blueprint;
}

export function mergeIntake(
  input?: Partial<ProductBuilderIntake>,
  base: ProductBuilderIntake = DEFAULT_INTAKE,
): ProductBuilderIntake {
  return {
    ...base,
    ...(input ?? {}),
  };
}

function isTaskDecision(value: unknown): value is TaskDecision {
  return value === "NEW" || value === "EXTEND" || value === "REUSE" || value === "N/A";
}

function normalizeDomainFeature(
  input: ProductBuilderDomainFeatureInput,
  index: number,
): ProductBuilderDomainFeature | null {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) return null;

  const surfaces = Array.isArray(input.surfaces)
    ? input.surfaces.filter((surface): surface is TaskSurface => {
      return (DOMAIN_FEATURE_SURFACES as readonly string[]).includes(surface);
    })
    : [];

  return {
    id: typeof input.id === "string" && input.id.trim() ? input.id.trim() : `feature-${index + 1}`,
    title,
    description: typeof input.description === "string" ? input.description.trim() : "",
    surfaces: surfaces.length > 0 ? [...new Set(surfaces)] : ["app"],
    decision: isTaskDecision(input.decision) ? input.decision : "NEW",
    mvp: typeof input.mvp === "boolean" ? input.mvp : true,
    notes: typeof input.notes === "string" ? input.notes.trim() : "",
  };
}

export function mergeDomainFeatures(
  input?: ProductBuilderDomainFeatureInput[],
  base: ProductBuilderDomainFeature[] = DEFAULT_DOMAIN_FEATURES,
): ProductBuilderDomainFeature[] {
  const source = input ?? base;
  return source
    .map((feature, index) => normalizeDomainFeature(feature, index))
    .filter((feature): feature is ProductBuilderDomainFeature => Boolean(feature));
}

function slugForFeature(feature: ProductBuilderDomainFeature, index: number, used: Set<string>): string {
  const raw = feature.id || feature.title || `feature-${index + 1}`;
  const normalized = raw
    .normalize("NFKD")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const fallback = `F${String(index + 1).padStart(2, "0")}`;
  const base = normalized || fallback;
  let slug = base;
  let suffix = 2;
  while (used.has(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(slug);
  return slug;
}

function blueprintHasTask(blueprint: ProductBuilderBlueprint, taskKey: string): boolean {
  return blueprint.tasks.some((task) => task.key === taskKey);
}

function domainFeatureScope(feature: ProductBuilderDomainFeature): string {
  const surfaces = feature.surfaces.map((surface) => TASK_SURFACE_LABELS[surface]).join(", ");
  const description = feature.description ? `\n\n기능 설명: ${feature.description}` : "";
  const notes = feature.notes ? `\n\n메모: ${feature.notes}` : "";
  const mvp = feature.mvp ? "MVP 포함" : "후순위 후보";
  return `도메인 기능 카드 "${feature.title}" (${mvp}, 영역: ${surfaces})를 기준으로 실행한다.${description}${notes}`;
}

export function expandDomainFeatureTasks(
  blueprint: ProductBuilderBlueprint,
  featuresInput?: ProductBuilderDomainFeatureInput[],
): ProductBuilderTask[] {
  const features = mergeDomainFeatures(featuresInput, blueprint.defaultDomainFeatures);
  const used = new Set<string>();
  return features.flatMap((feature, index) => {
    const slug = slugForFeature(feature, index, used);
    const dataKey = `FEAT-${slug}-DATA`;
    const apiListKey = `FEAT-${slug}-API-LIST`;
    const apiReadKey = `FEAT-${slug}-API-READ`;
    const apiCreateKey = `FEAT-${slug}-API-CREATE`;
    const apiUpdateKey = `FEAT-${slug}-API-UPDATE`;
    const apiDeleteKey = `FEAT-${slug}-API-DELETE`;
    const apiKeys = [apiListKey, apiReadKey, apiCreateKey, apiUpdateKey, apiDeleteKey];
    const generatedKeys = [dataKey, ...apiKeys];
    const scope = domainFeatureScope(feature);
    const tasks: ProductBuilderTask[] = [
      pbTask({
        key: dataKey,
        phase: "05 도메인 기능",
        title: `${feature.title} 데이터 모델`,
        description: `${scope}\n\n이 기능에 필요한 테이블, 필드, 상태값, 인덱스, seed 데이터를 설계한다.`,
        decision: feature.decision,
        category: "backend",
        priority: feature.mvp ? "high" : "medium",
        capabilityKey: `domain.feature.${slug.toLowerCase()}.data`,
        agentRole: "Data Engineer",
        surfaces: ["api"],
        dependsOn: ["PB-FEAT-003", "PB-DATA-001"],
        deliverables: ["기능 데이터 모델", "migration", "seed data", "상태/권한 필드"],
        acceptanceCriteria: [
          "기능 카드의 공개/앱/관리자 요구를 지원하는 데이터 구조가 있다.",
          "공개 필드와 private/admin 필드가 분리되어 있다.",
          "REUSE/N/A 결정이면 SKIP 사유와 참조 링크를 남긴다.",
        ],
      }),
      ...[
        {
          key: apiListKey,
          title: `${feature.title} 목록/검색 API`,
          description: "목록, 검색, 필터, 정렬, 페이지네이션, 공개/비공개 필드 분리를 REST/OpenAPI 계약에 맞춰 구현한다.",
          capability: "api.list",
          dependsOn: [dataKey, "PB-DOMAIN-001"],
          deliverables: ["GET list endpoint", "검색/필터/페이지네이션", "OpenAPI schema", "API 테스트"],
          acceptance: [
            "목록 응답은 공개/사용자/관리자 권한에 따라 필드와 필터가 분리되어 있다.",
            "검색/필터/페이지네이션이 QA에서 독립 검증 가능하다.",
          ],
        },
        {
          key: apiReadKey,
          title: `${feature.title} 상세 조회 API`,
          description: "상세 조회, viewer state, 권한 없는 상태, 없는 리소스/비공개 리소스 오류를 REST/OpenAPI 계약에 맞춰 구현한다.",
          capability: "api.read",
          dependsOn: [apiListKey],
          deliverables: ["GET detail endpoint", "viewer state", "권한/404/403 처리", "API 테스트"],
          acceptance: [
            "상세 조회는 공개/사용자/관리자 권한에 따라 접근 결과가 명확하다.",
            "없는 리소스와 권한 없는 리소스의 오류 contract가 정의되어 있다.",
          ],
        },
        {
          key: apiCreateKey,
          title: `${feature.title} 생성 API`,
          description: "기능 리소스 생성, 입력 validation, 초기 상태, 소유자/운영자 권한, 감사 로그를 REST/OpenAPI 계약에 맞춰 구현한다.",
          capability: "api.create",
          dependsOn: [dataKey, "PB-DOMAIN-001"],
          deliverables: ["POST endpoint", "request validation", "초기 상태", "API 테스트"],
          acceptance: [
            "필수 필드와 권한 없는 생성 요청이 검증된다.",
            "생성 결과가 목록/상세 조회에 일관되게 반영된다.",
          ],
        },
        {
          key: apiUpdateKey,
          title: `${feature.title} 수정/상태 변경 API`,
          description: "기능 리소스 수정, 상태 변경, 부분 업데이트, 권한 검증, 변경 이력을 REST/OpenAPI 계약에 맞춰 구현한다.",
          capability: "api.update",
          dependsOn: [apiReadKey, apiCreateKey],
          deliverables: ["PATCH endpoint", "상태 변경 action", "변경 이력", "API 테스트"],
          acceptance: [
            "허용된 필드와 상태 전이만 수정할 수 있다.",
            "변경 후 목록/상세/관리자 화면의 상태가 일관된다.",
          ],
        },
        {
          key: apiDeleteKey,
          title: `${feature.title} 삭제/archive API`,
          description: "기능 리소스 삭제 대신 soft delete/archive, 노출 차단, 연결 데이터 보존, 복구 가능 여부를 REST/OpenAPI 계약에 맞춰 구현한다.",
          capability: "api.delete",
          dependsOn: [apiReadKey],
          deliverables: ["DELETE/archive endpoint", "노출 차단", "연결 데이터 보존 정책", "API 테스트"],
          acceptance: [
            "삭제/archive 후 공개/앱/관리자 노출 정책이 명확하다.",
            "기존 결제/이력/감사 데이터 보존 정책이 깨지지 않는다.",
          ],
        },
      ].map((definition) => pbTask({
        key: definition.key,
        phase: "05 도메인 기능",
        title: definition.title,
        description: `${scope}\n\n${definition.description}`,
        decision: feature.decision,
        category: "backend",
        priority: feature.mvp ? "high" : "medium",
        capabilityKey: `domain.feature.${slug.toLowerCase()}.${definition.capability}`,
        agentRole: "Backend Engineer",
        surfaces: ["api"],
        dependsOn: definition.dependsOn,
        deliverables: definition.deliverables,
        acceptanceCriteria: [
          ...definition.acceptance,
          "OpenAPI 계약과 구현이 동기화되어 있다.",
          "REUSE/N/A 결정이면 SKIP 사유와 참조 링크를 남긴다.",
        ],
      })),
    ];

    if (feature.surfaces.includes("landing")) {
      const key = `FEAT-${slug}-LANDING`;
      generatedKeys.push(key);
      tasks.push(pbTask({
        key,
        phase: "06 공개 서비스",
        title: `${feature.title} 공개 화면`,
        description: `${scope}\n\n이 기능을 공개 페이지, 상세/목록, 전환 CTA, metadata/structured data에 연결한다.`,
        decision: feature.decision,
        category: "frontend",
        priority: feature.mvp ? "high" : "medium",
        capabilityKey: `domain.feature.${slug.toLowerCase()}.landing`,
        agentRole: "Frontend Engineer",
        surfaces: ["landing"],
        dependsOn: [apiListKey, apiReadKey, "PB-WEB-001"],
        deliverables: ["공개 화면", "metadata", "structured data", "전환 CTA"],
        acceptanceCriteria: [
          "공개 화면은 SEO/AEO/GEO 요구에 맞는 metadata를 가진다.",
          "실제 도메인 데이터와 API 계약에 연결된다.",
          "REUSE/N/A 결정이면 SKIP 사유와 참조 링크를 남긴다.",
        ],
      }));
    }

    if (feature.surfaces.includes("app")) {
      const key = `FEAT-${slug}-APP`;
      generatedKeys.push(key);
      tasks.push(pbTask({
        key,
        phase: "07 서비스 앱",
        title: `${feature.title} 앱 화면`,
        description: `${scope}\n\n로그인 사용자 앱에서 이 기능의 입력, 조회, 상태, 빈/로딩/에러/권한 없음 화면을 구현한다.`,
        decision: feature.decision,
        category: "frontend",
        priority: feature.mvp ? "high" : "medium",
        capabilityKey: `domain.feature.${slug.toLowerCase()}.app`,
        agentRole: "Frontend Engineer",
        surfaces: ["app"],
        dependsOn: [apiListKey, apiReadKey, apiCreateKey, apiUpdateKey, "PB-WEB-002"],
        deliverables: ["앱 화면", "상태 처리", "API 연결", "권한 없음/빈 상태"],
        acceptanceCriteria: [
          "로그인/권한 상태에 따라 화면이 분기된다.",
          "API contract와 UI 상태가 일관된다.",
          "REUSE/N/A 결정이면 SKIP 사유와 참조 링크를 남긴다.",
        ],
      }));
    }

    if (feature.surfaces.includes("admin")) {
      const key = `FEAT-${slug}-ADMIN`;
      generatedKeys.push(key);
      tasks.push(pbTask({
        key,
        phase: "11 관리자",
        title: `${feature.title} 관리자 기능`,
        description: `${scope}\n\n관리자에서 이 기능의 검색, 상세, 생성/수정, 노출/상태 관리, 감사 로그를 구현한다.`,
        decision: feature.decision,
        category: "admin",
        priority: feature.mvp ? "high" : "medium",
        capabilityKey: `domain.feature.${slug.toLowerCase()}.admin`,
        agentRole: "Admin Engineer",
        surfaces: ["admin"],
        dependsOn: [...apiKeys, "PB-ADMIN-002"],
        deliverables: ["관리자 목록/상세", "상태/노출 관리", "감사 로그", "검색/필터"],
        acceptanceCriteria: [
          "관리자 변경 작업은 감사 로그에 남는다.",
          "운영자가 기능 데이터를 관리할 수 있다.",
          "REUSE/N/A 결정이면 SKIP 사유와 참조 링크를 남긴다.",
        ],
      }));
    }

    if (feature.surfaces.includes("ai-server")) {
      const key = `FEAT-${slug}-AI`;
      const aiDependency = blueprintHasTask(blueprint, "PB-AISRV-001") ? "PB-AISRV-001" : "PB-AI-001";
      generatedKeys.push(key);
      tasks.push(pbTask({
        key,
        phase: "12 AI 서버",
        title: `${feature.title} AI 처리`,
        description: `${scope}\n\n이 기능에 필요한 AI 입력/출력, job 상태, 결과 저장, 비용/안전장치를 API와 AI 서버 경계에 연결한다.`,
        decision: feature.decision,
        category: "ai",
        priority: feature.mvp ? "high" : "medium",
        capabilityKey: `domain.feature.${slug.toLowerCase()}.ai`,
        agentRole: "AI Runtime Engineer",
        surfaces: ["ai-server"],
        dependsOn: [apiReadKey, apiCreateKey, aiDependency],
        deliverables: ["AI input/output contract", "job/status flow", "result persistence", "cost/safety guard"],
        acceptanceCriteria: [
          "AI 서버 경계와 REST 계약이 분리되어 있다.",
          "비용, timeout, 실패 상태가 정의되어 있다.",
          "REUSE/N/A 결정이면 SKIP 사유와 참조 링크를 남긴다.",
        ],
      }));
    }

    tasks.push(pbTask({
      key: `FEAT-${slug}-QA`,
      phase: "05 도메인 기능",
      title: `${feature.title} 기능 QA`,
      description: `${scope}\n\n이 기능의 API, 화면, 권한, 관리자, AI 흐름을 선택된 surface에 맞춰 검증한다.`,
      decision: feature.decision,
      category: "qa",
      priority: feature.mvp ? "high" : "medium",
      capabilityKey: `domain.feature.${slug.toLowerCase()}.qa`,
      agentRole: "QA Engineer",
      surfaces: ["qa"],
      dependsOn: generatedKeys,
      deliverables: ["기능 테스트 결과", "권한/상태 검증", "잔여 리스크"],
      acceptanceCriteria: [
        "기능 카드의 acceptance path가 검증되어 있다.",
        "공개/앱/관리자/AI 중 선택된 영역별 주요 흐름이 확인되어 있다.",
        "REUSE/N/A 결정이면 SKIP 사유와 참조 링크를 남긴다.",
      ],
    }));

    return tasks;
  });
}

export function mergeFeatureSelection(input?: ProductBuilderFeatureSelectionInput): ProductBuilderFeatureSelection {
  const auth = {
    ...DEFAULT_FEATURE_SELECTION.auth,
    ...(input?.auth ?? {}),
  };
  const payment = {
    ...DEFAULT_FEATURE_SELECTION.payment,
    ...(input?.payment ?? {}),
  };
  const notification = {
    ...DEFAULT_FEATURE_SELECTION.notification,
    ...(input?.notification ?? {}),
  };
  const community = {
    ...DEFAULT_FEATURE_SELECTION.community,
    ...(input?.community ?? {}),
  };
  const fileUpload = {
    ...DEFAULT_FEATURE_SELECTION.fileUpload,
    ...(input?.fileUpload ?? {}),
  };
  const videoLecture = {
    ...DEFAULT_FEATURE_SELECTION.videoLecture,
    ...(input?.videoLecture ?? {}),
  };
  const identityVerification = {
    ...DEFAULT_FEATURE_SELECTION.identityVerification,
    ...(input?.identityVerification ?? {}),
  };

  auth.enabled = true;
  auth.email = true;

  if (!payment.enabled) {
    payment.oneTime = false;
    payment.subscription = false;
    payment.polar = false;
    payment.inicis = false;
  }
  if (payment.enabled && !payment.oneTime && !payment.subscription) {
    payment.oneTime = true;
  }
  if (payment.enabled && !payment.polar && !payment.inicis) {
    payment.polar = true;
  }
  notification.emailResend = true;
  fileUpload.vercelBlob = true;

  return {
    auth,
    payment,
    notification,
    community,
    fileUpload,
    videoLecture,
    identityVerification,
    admin: {
      userManagement: true,
      paymentManagement: payment.enabled,
    },
  };
}

function setDecisionIfTaskExists(
  blueprint: ProductBuilderBlueprint,
  overrides: Record<string, TaskDecision>,
  taskKey: string,
  decision: TaskDecision,
): void {
  if (blueprint.tasks.some((task) => task.key === taskKey)) {
    overrides[taskKey] = decision;
  }
}

export function decisionOverridesFromFeatures(
  selectionInput: ProductBuilderFeatureSelectionInput | undefined,
  blueprint: ProductBuilderBlueprint = ONLINE_SERVICE_BLUEPRINT,
): Record<string, TaskDecision> {
  const selection = mergeFeatureSelection(selectionInput ?? blueprint.defaultFeatureSelection);
  const overrides: Record<string, TaskDecision> = {};

  const authTaskKeys = [
    "PB-AUTH-001",
    "PB-AUTH-EMAIL-001",
    "PB-AUTH-SIGNUP-POLICY-001",
    "PB-AUTH-OAUTH-GOOGLE-001",
    "PB-AUTH-OAUTH-KAKAO-001",
    "PB-AUTH-OAUTH-NAVER-001",
    "PB-AUTH-002",
    "PB-AUTH-003",
    "PB-SET-001",
    "PB-AUTH-PROFILE-READ-001",
    "PB-AUTH-PROFILE-UPDATE-001",
    "PB-AUTH-EMAIL-CHANGE-001",
    "PB-AUTH-PASSWORD-CHANGE-001",
    "PB-AUTH-SESSIONS-LIST-001",
    "PB-AUTH-SESSIONS-REVOKE-001",
    "PB-AUTH-ACCOUNT-DELETE-001",
    "PB-AUTH-QA-001",
    "PB-WEB-002",
  ];

  if (!selection.auth.enabled) {
    for (const key of authTaskKeys) {
      setDecisionIfTaskExists(blueprint, overrides, key, "N/A");
    }
  } else {
    setDecisionIfTaskExists(blueprint, overrides, "PB-AUTH-001", "REUSE");
    setDecisionIfTaskExists(blueprint, overrides, "PB-AUTH-EMAIL-001", selection.auth.email ? "REUSE" : "N/A");
    setDecisionIfTaskExists(blueprint, overrides, "PB-AUTH-SIGNUP-POLICY-001", "REUSE");
    setDecisionIfTaskExists(blueprint, overrides, "PB-AUTH-OAUTH-GOOGLE-001", selection.auth.oauthGoogle ? "EXTEND" : "N/A");
    setDecisionIfTaskExists(blueprint, overrides, "PB-AUTH-OAUTH-KAKAO-001", selection.auth.oauthKakao ? "EXTEND" : "N/A");
    setDecisionIfTaskExists(blueprint, overrides, "PB-AUTH-OAUTH-NAVER-001", selection.auth.oauthNaver ? "EXTEND" : "N/A");
    setDecisionIfTaskExists(blueprint, overrides, "PB-AUTH-002", "REUSE");
    setDecisionIfTaskExists(blueprint, overrides, "PB-AUTH-003", "REUSE");
    setDecisionIfTaskExists(blueprint, overrides, "PB-SET-001", "REUSE");
    for (const key of [
      "PB-AUTH-PROFILE-READ-001",
      "PB-AUTH-PROFILE-UPDATE-001",
      "PB-AUTH-EMAIL-CHANGE-001",
      "PB-AUTH-PASSWORD-CHANGE-001",
      "PB-AUTH-SESSIONS-LIST-001",
      "PB-AUTH-SESSIONS-REVOKE-001",
      "PB-AUTH-ACCOUNT-DELETE-001",
    ]) {
      setDecisionIfTaskExists(blueprint, overrides, key, "REUSE");
    }
    setDecisionIfTaskExists(blueprint, overrides, "PB-AUTH-QA-001", "NEW");
  }

  const paymentTaskKeys = [
    "PB-PAY-001",
    "PB-PAY-REUSE-AUDIT-001",
    "PB-PAY-DATA-001",
    "PB-PAY-ONETIME-001",
    "PB-PAY-SUBSCRIPTION-001",
    "PB-PAY-CATALOG-API-LIST-001",
    "PB-PAY-CATALOG-API-CREATE-001",
    "PB-PAY-CATALOG-API-UPDATE-001",
    "PB-PAY-CATALOG-API-DELETE-001",
    "PB-PAY-CHECKOUT-API-001",
    "PB-PAY-WEBHOOK-API-001",
    "PB-PAY-ENTITLEMENT-001",
    "PB-PAY-ORDER-API-001",
    "PB-PAY-REFUND-API-001",
    "PB-PAY-POLAR-001",
    "PB-PAY-POLAR-CHECKOUT-001",
    "PB-PAY-POLAR-WEBHOOK-001",
    "PB-PAY-POLAR-REFUND-001",
    "PB-PAY-INICIS-001",
    "PB-PAY-INICIS-CHECKOUT-001",
    "PB-PAY-INICIS-APPROVAL-001",
    "PB-PAY-INICIS-WEBHOOK-001",
    "PB-PAY-INICIS-CANCEL-001",
    "PB-PAY-INICIS-COMPAT-001",
    "PB-PAY-002",
    "PB-PAY-003",
    "PB-PAY-QA-001",
    "PB-PAY-ALT-001",
    "PB-ADMIN-PAY-001",
    "PB-ADMIN-PAY-LIST-001",
    "PB-ADMIN-PAY-READ-001",
    "PB-ADMIN-PAY-REFUND-001",
    "PB-ADMIN-PAY-ENTITLEMENT-001",
    "PB-ADMIN-PAY-REPORT-001",
    "PB-ADMIN-PAY-QA-001",
  ];
  const paymentCoreTaskKeys = [
    "PB-PAY-001",
    "PB-PAY-REUSE-AUDIT-001",
    "PB-PAY-DATA-001",
    "PB-PAY-CATALOG-API-LIST-001",
    "PB-PAY-CATALOG-API-CREATE-001",
    "PB-PAY-CATALOG-API-UPDATE-001",
    "PB-PAY-CATALOG-API-DELETE-001",
    "PB-PAY-CHECKOUT-API-001",
    "PB-PAY-WEBHOOK-API-001",
    "PB-PAY-ENTITLEMENT-001",
    "PB-PAY-ORDER-API-001",
    "PB-PAY-REFUND-API-001",
    "PB-PAY-002",
    "PB-PAY-003",
    "PB-PAY-QA-001",
    "PB-ADMIN-PAY-001",
    "PB-ADMIN-PAY-LIST-001",
    "PB-ADMIN-PAY-READ-001",
    "PB-ADMIN-PAY-REFUND-001",
    "PB-ADMIN-PAY-ENTITLEMENT-001",
    "PB-ADMIN-PAY-REPORT-001",
    "PB-ADMIN-PAY-QA-001",
  ];
  const paymentPolarTaskKeys = [
    "PB-PAY-POLAR-001",
    "PB-PAY-POLAR-CHECKOUT-001",
    "PB-PAY-POLAR-WEBHOOK-001",
    "PB-PAY-POLAR-REFUND-001",
  ];
  const paymentInicisTaskKeys = [
    "PB-PAY-INICIS-001",
    "PB-PAY-INICIS-CHECKOUT-001",
    "PB-PAY-INICIS-APPROVAL-001",
    "PB-PAY-INICIS-WEBHOOK-001",
    "PB-PAY-INICIS-CANCEL-001",
    "PB-PAY-INICIS-COMPAT-001",
  ];

  if (!selection.payment.enabled) {
    for (const key of paymentTaskKeys) {
      setDecisionIfTaskExists(blueprint, overrides, key, "N/A");
    }
  } else {
    for (const key of paymentCoreTaskKeys) {
      setDecisionIfTaskExists(blueprint, overrides, key, "NEW");
    }
    setDecisionIfTaskExists(blueprint, overrides, "PB-PAY-REUSE-AUDIT-001", "EXTEND");
    setDecisionIfTaskExists(blueprint, overrides, "PB-PAY-DATA-001", "EXTEND");
    setDecisionIfTaskExists(blueprint, overrides, "PB-PAY-ONETIME-001", selection.payment.oneTime ? "NEW" : "N/A");
    setDecisionIfTaskExists(blueprint, overrides, "PB-PAY-SUBSCRIPTION-001", selection.payment.subscription ? "NEW" : "N/A");
    for (const key of paymentPolarTaskKeys) {
      setDecisionIfTaskExists(blueprint, overrides, key, selection.payment.polar ? "EXTEND" : "N/A");
    }
    for (const key of paymentInicisTaskKeys) {
      setDecisionIfTaskExists(blueprint, overrides, key, selection.payment.inicis ? "NEW" : "N/A");
    }
    setDecisionIfTaskExists(blueprint, overrides, "PB-PAY-ALT-001", "N/A");
  }

  const notificationTaskKeys = [
    "PB-NOTI-001",
    "PB-NOTI-EMAIL-RESEND-001",
    "PB-NOTI-EMAIL-DATA-001",
    "PB-NOTI-EMAIL-TEMPLATE-001",
    "PB-NOTI-EMAIL-API-LIST-001",
    "PB-NOTI-EMAIL-API-CREATE-001",
    "PB-NOTI-EMAIL-API-UPDATE-001",
    "PB-NOTI-EMAIL-API-DELETE-001",
    "PB-NOTI-EMAIL-SEND-001",
    "PB-NOTI-EMAIL-ADMIN-001",
    "PB-NOTI-EMAIL-QA-001",
    "PB-NOTI-ALIMTALK-001",
    "PB-NOTI-ALIMTALK-DATA-001",
    "PB-NOTI-ALIMTALK-API-LIST-001",
    "PB-NOTI-ALIMTALK-API-CREATE-001",
    "PB-NOTI-ALIMTALK-API-UPDATE-001",
    "PB-NOTI-ALIMTALK-API-DELETE-001",
    "PB-NOTI-ALIMTALK-SEND-001",
    "PB-NOTI-ALIMTALK-ADMIN-001",
    "PB-NOTI-ALIMTALK-QA-001",
    "PB-NOTI-ALT-001",
  ];
  const emailNotificationTaskKeys = [
    "PB-NOTI-EMAIL-RESEND-001",
    "PB-NOTI-EMAIL-DATA-001",
    "PB-NOTI-EMAIL-TEMPLATE-001",
    "PB-NOTI-EMAIL-API-LIST-001",
    "PB-NOTI-EMAIL-API-CREATE-001",
    "PB-NOTI-EMAIL-API-UPDATE-001",
    "PB-NOTI-EMAIL-API-DELETE-001",
    "PB-NOTI-EMAIL-SEND-001",
    "PB-NOTI-EMAIL-ADMIN-001",
    "PB-NOTI-EMAIL-QA-001",
  ];
  const alimtalkNotificationTaskKeys = [
    "PB-NOTI-ALIMTALK-001",
    "PB-NOTI-ALIMTALK-DATA-001",
    "PB-NOTI-ALIMTALK-API-LIST-001",
    "PB-NOTI-ALIMTALK-API-CREATE-001",
    "PB-NOTI-ALIMTALK-API-UPDATE-001",
    "PB-NOTI-ALIMTALK-API-DELETE-001",
    "PB-NOTI-ALIMTALK-SEND-001",
    "PB-NOTI-ALIMTALK-ADMIN-001",
    "PB-NOTI-ALIMTALK-QA-001",
  ];
  const hasNotification = selection.notification.emailResend || selection.notification.alimtalk;

  if (!hasNotification) {
    for (const key of notificationTaskKeys) {
      setDecisionIfTaskExists(blueprint, overrides, key, "N/A");
    }
  } else {
    setDecisionIfTaskExists(blueprint, overrides, "PB-NOTI-001", "EXTEND");
    for (const key of emailNotificationTaskKeys) {
      setDecisionIfTaskExists(blueprint, overrides, key, selection.notification.emailResend ? "EXTEND" : "N/A");
    }
    for (const key of alimtalkNotificationTaskKeys) {
      setDecisionIfTaskExists(blueprint, overrides, key, selection.notification.alimtalk ? "EXTEND" : "N/A");
    }
    setDecisionIfTaskExists(blueprint, overrides, "PB-NOTI-ALT-001", "N/A");
  }

  const communityTaskKeys = [
    "PB-COMM-001",
    "PB-COMM-DATA-001",
    "PB-COMM-SPACE-API-LIST-001",
    "PB-COMM-SPACE-API-CREATE-001",
    "PB-COMM-SPACE-API-UPDATE-001",
    "PB-COMM-SPACE-API-DELETE-001",
    "PB-COMM-MEMBERSHIP-API-001",
    "PB-COMM-MEMBER-API-001",
    "PB-COMM-MODERATOR-API-001",
    "PB-COMM-POST-API-LIST-001",
    "PB-COMM-POST-API-READ-001",
    "PB-COMM-POST-API-CREATE-001",
    "PB-COMM-POST-API-UPDATE-001",
    "PB-COMM-POST-API-DELETE-001",
    "PB-COMM-POST-OPS-API-001",
    "PB-COMM-COMMENT-API-LIST-001",
    "PB-COMM-COMMENT-API-CREATE-001",
    "PB-COMM-COMMENT-API-UPDATE-001",
    "PB-COMM-COMMENT-API-DELETE-001",
    "PB-COMM-COMMENT-OPS-API-001",
    "PB-COMM-REACTION-API-LIST-001",
    "PB-COMM-REACTION-API-SET-001",
    "PB-COMM-REACTION-API-DELETE-001",
    "PB-COMM-POLL-API-001",
    "PB-COMM-FEED-RANKING-API-001",
    "PB-COMM-KARMA-API-001",
    "PB-COMM-REPORT-API-CREATE-001",
    "PB-COMM-BLOCK-API-CREATE-001",
    "PB-COMM-BLOCK-API-DELETE-001",
    "PB-COMM-HIDE-API-CREATE-001",
    "PB-COMM-HIDE-API-DELETE-001",
    "PB-COMM-FILTER-API-001",
    "PB-COMM-RULES-FLAIR-API-001",
    "PB-COMM-MODERATION-API-LIST-001",
    "PB-COMM-MODERATION-API-ACTION-001",
    "PB-COMM-SANCTION-APPEAL-API-001",
    "PB-COMM-TIER-ONBOARDING-API-001",
    "PB-COMM-API-001",
    "PB-COMM-SAFETY-001",
    "PB-COMM-UI-001",
    "PB-COMM-ADMIN-001",
    "PB-COMM-ADMIN-STATS-001",
    "PB-COMM-QA-001",
  ];

  for (const key of communityTaskKeys) {
    setDecisionIfTaskExists(blueprint, overrides, key, selection.community.enabled ? "EXTEND" : "N/A");
  }

  const fileUploadTaskKeys = [
    "PB-FILE-001",
    "PB-FILE-DATA-001",
    "PB-FILE-API-CREATE-001",
    "PB-FILE-API-COMPLETE-001",
    "PB-FILE-API-LIST-001",
    "PB-FILE-API-READ-001",
    "PB-FILE-API-UPDATE-001",
    "PB-FILE-API-DELETE-001",
    "PB-FILE-UI-001",
    "PB-FILE-ADMIN-001",
    "PB-FILE-QA-001",
  ];

  for (const key of fileUploadTaskKeys) {
    setDecisionIfTaskExists(blueprint, overrides, key, selection.fileUpload.vercelBlob ? "EXTEND" : "N/A");
  }

  const videoLectureTaskKeys = [
    "PB-VIDEO-001",
    "PB-VIDEO-DATA-001",
    "PB-VIDEO-API-UPLOAD-001",
    "PB-VIDEO-WEBHOOK-001",
    "PB-VIDEO-API-LIST-001",
    "PB-VIDEO-API-READ-001",
    "PB-VIDEO-API-UPDATE-001",
    "PB-VIDEO-API-DELETE-001",
    "PB-VIDEO-API-PLAYBACK-001",
    "PB-VIDEO-API-PROGRESS-001",
    "PB-VIDEO-PLAYER-UI-001",
    "PB-VIDEO-ADMIN-001",
    "PB-VIDEO-QA-001",
  ];

  for (const key of videoLectureTaskKeys) {
    setDecisionIfTaskExists(blueprint, overrides, key, selection.videoLecture.cloudflareStream ? "EXTEND" : "N/A");
  }

  const identityVerificationKcbTaskKeys = [
    "PB-IDV-KCB-001",
    "PB-IDV-KCB-JAR-001",
    "PB-IDV-KCB-DATA-001",
    "PB-IDV-KCB-API-SESSION-001",
    "PB-IDV-KCB-CALLBACK-001",
    "PB-IDV-KCB-API-STATUS-001",
    "PB-IDV-KCB-UI-001",
    "PB-IDV-KCB-ADMIN-001",
    "PB-IDV-KCB-QA-001",
  ];

  for (const key of identityVerificationKcbTaskKeys) {
    setDecisionIfTaskExists(blueprint, overrides, key, selection.identityVerification.kcb ? "EXTEND" : "N/A");
  }

  for (const key of [
    "PB-ADMIN-USERS-001",
    "PB-ADMIN-USERS-LIST-001",
    "PB-ADMIN-USERS-READ-001",
    "PB-ADMIN-USERS-CREATE-001",
    "PB-ADMIN-USERS-UPDATE-001",
    "PB-ADMIN-USERS-STATUS-001",
    "PB-ADMIN-USERS-DELETE-001",
    "PB-ADMIN-USERS-QA-001",
  ]) {
    setDecisionIfTaskExists(blueprint, overrides, key, "EXTEND");
  }

  return overrides;
}

export function applyDecisionOverrides(
  blueprint: ProductBuilderBlueprint,
  overrides?: Record<string, TaskDecision>,
  featureSelection?: ProductBuilderFeatureSelectionInput,
): ProductBuilderTask[] {
  const featureOverrides = decisionOverridesFromFeatures(featureSelection, blueprint);
  const mergedOverrides = {
    ...featureOverrides,
    ...(overrides ?? {}),
  };
  return blueprint.tasks.map((task) => ({
    ...task,
    decision: mergedOverrides[task.key] ?? task.decision,
  }));
}

function domainTaskAnchor(task: ProductBuilderTask, blueprint: ProductBuilderBlueprint): string | null {
  if (task.key.endsWith("-DATA")) return "PB-DATA-001";
  if (/-API-(LIST|READ|CREATE|UPDATE|DELETE)$/.test(task.key) || task.key.endsWith("-API")) return "PB-DOMAIN-001";
  if (task.key.endsWith("-LANDING")) return "PB-WEB-001";
  if (task.key.endsWith("-APP")) return "PB-WEB-002";
  if (task.key.endsWith("-ADMIN")) return "PB-ADMIN-002";
  if (task.key.endsWith("-AI")) {
    return blueprintHasTask(blueprint, "PB-AISRV-002") ? "PB-AISRV-002" : "PB-AI-001";
  }
  return null;
}

function insertDomainTasksInWorkflowOrder(
  blueprint: ProductBuilderBlueprint,
  fixedTasks: ProductBuilderTask[],
  domainTasks: ProductBuilderTask[],
): ProductBuilderTask[] {
  const after = new Map<string, ProductBuilderTask[]>();
  const before = new Map<string, ProductBuilderTask[]>();
  const trailing: ProductBuilderTask[] = [];

  for (const task of domainTasks) {
    if (task.key.endsWith("-QA")) {
      const bucket = before.get("PB-FEAT-003") ?? [];
      bucket.push(task);
      before.set("PB-FEAT-003", bucket);
      continue;
    }

    const anchor = domainTaskAnchor(task, blueprint);
    if (!anchor || !fixedTasks.some((fixedTask) => fixedTask.key === anchor)) {
      trailing.push(task);
      continue;
    }
    const bucket = after.get(anchor) ?? [];
    bucket.push(task);
    after.set(anchor, bucket);
  }

  const ordered: ProductBuilderTask[] = [];
  for (const task of fixedTasks) {
    ordered.push(...(before.get(task.key) ?? []));
    ordered.push(task);
    ordered.push(...(after.get(task.key) ?? []));
  }
  ordered.push(...trailing);
  return ordered;
}

export function buildProductBuilderTasks(
  blueprint: ProductBuilderBlueprint,
  input?: {
    overrides?: Record<string, TaskDecision>;
    featureSelection?: ProductBuilderFeatureSelectionInput;
    domainFeatures?: ProductBuilderDomainFeatureInput[];
  },
): ProductBuilderTask[] {
  const fixedTasks = applyDecisionOverrides(blueprint, input?.overrides, input?.featureSelection);
  const domainTasks = expandDomainFeatureTasks(blueprint, input?.domainFeatures).map((task) => ({
    ...task,
    decision: input?.overrides?.[task.key] ?? task.decision,
  }));
  return insertDomainTasksInWorkflowOrder(blueprint, fixedTasks, domainTasks);
}

export function featureSelectionSummaryLines(selectionInput?: ProductBuilderFeatureSelectionInput): string[] {
  const selection = mergeFeatureSelection(selectionInput);
  const authMethods = [
    selection.auth.email ? "email" : null,
    selection.auth.oauthGoogle ? "OAuth-google" : null,
    selection.auth.oauthKakao ? "OAuth-kakao" : null,
    selection.auth.oauthNaver ? "OAuth-naver" : null,
  ].filter((item): item is string => Boolean(item));
  const paymentTypes = [
    selection.payment.oneTime ? "단건결제" : null,
    selection.payment.subscription ? "구독결제(월간/연간)" : null,
  ].filter((item): item is string => Boolean(item));
  const paymentProviders = [
    selection.payment.polar ? "Polar.sh" : null,
    selection.payment.inicis ? "KG이니시스(INICIS)" : null,
  ].filter((item): item is string => Boolean(item));
  const notificationTypes = [
    selection.notification.emailResend ? "Email(Resend)" : null,
    selection.notification.alimtalk ? "알림톡" : null,
  ].filter((item): item is string => Boolean(item));

  return [
    `- 인증: ${selection.auth.enabled ? authMethods.join(", ") : "N/A"}`,
    `- 결제: ${selection.payment.enabled ? `${paymentTypes.join(", ")} / ${paymentProviders.join(", ")}` : "N/A"}`,
    `- 알림: ${notificationTypes.length > 0 ? notificationTypes.join(", ") : "N/A"}`,
    `- 파일 업로드: ${selection.fileUpload.vercelBlob ? "Vercel Blob" : "N/A"}`,
    `- 영상 강의: ${selection.videoLecture.cloudflareStream ? "Cloudflare Stream" : "N/A"}`,
    `- 본인확인: ${selection.identityVerification.kcb ? "KCB" : "N/A"}`,
    `- 커뮤니티: ${selection.community.enabled ? "CRUD/멤버십/게시글/댓글/리액션/투표/피드/karma/신고/차단/숨김/필터/규칙/flair/제재/관리자" : "N/A"}`,
    `- 관리자: 사용자 관리 ${selection.admin.userManagement ? "기본" : "N/A"}, 결제 관리 ${selection.admin.paymentManagement ? "포함" : "N/A"}`,
  ];
}

export function domainFeatureSummaryLines(featuresInput?: ProductBuilderDomainFeatureInput[]): string[] {
  const features = mergeDomainFeatures(featuresInput);
  if (features.length === 0) {
    return ["- none"];
  }
  return features.map((feature) => {
    const surfaces = feature.surfaces.map((surface) => TASK_SURFACE_LABELS[surface]).join(", ");
    const mvp = feature.mvp ? "MVP" : "Later";
    const description = feature.description ? ` - ${feature.description}` : "";
    return `- [${feature.decision}] ${feature.title} (${mvp}; ${surfaces})${description}`;
  });
}

export function isImplementationDecision(decision: TaskDecision): boolean {
  return decision === "NEW" || decision === "EXTEND";
}

export function issueStatusForDecision(decision: TaskDecision): "todo" | "done" {
  return isImplementationDecision(decision) ? "todo" : "done";
}

export function buildIssueDescription(input: {
  blueprint: ProductBuilderBlueprint;
  intake: ProductBuilderIntake;
  task: ProductBuilderTask;
  buildId: string;
}): string {
  const { blueprint, intake, task, buildId } = input;
  const dependsOn = task.dependsOn?.length ? task.dependsOn.join(", ") : "none";
  const reuse = task.reuseSource ? task.reuseSource : "none";
  const sourceContract =
    task.reuseSource && (task.decision === "REUSE" || task.decision === "EXTEND")
      ? [
          "",
          task.decision === "REUSE" ? "## Reuse Contract" : "## Source/Extension Contract",
          "",
          `- Source of truth: ${task.reuseSource}`,
          "- `PB-BASE-001` must record the base repo URL/path, tag or commit SHA, capability path, and compatibility notes before this source can be treated as reusable.",
          task.decision === "REUSE"
            ? "- If the source path/ref cannot be proven, this issue is not a valid REUSE issue; change it to EXTEND/NEW or keep the base-preparation blocker open."
            : "- EXTEND means reuse the verified base capability and implement only the missing customer/provider-specific delta.",
        ]
      : [];
  const skipHandling = isImplementationDecision(task.decision)
    ? "Executable work item. Agent should implement or extend the target capability."
    : "SKIP record. This issue is generated and closed to preserve the fixed workflow without blocking downstream tasks.";
  return [
    `# ${task.title}`,
    "",
    `Product Builder build: \`${buildId}\``,
    `Blueprint: \`${blueprint.displayName}\` (${blueprint.id})`,
    "",
    "## Decision",
    "",
    `- Decision: \`${task.decision}\``,
    `- Handling: ${skipHandling}`,
    `- Area: ${task.surfaces.map((surface) => TASK_SURFACE_LABELS[surface]).join(", ")}`,
    `- Target paths: ${task.targetPaths.join(", ")}`,
    `- Capability: \`${task.capabilityKey ?? "none"}\``,
    `- Reuse source: ${reuse}`,
    `- Agent role: ${task.agentRole}`,
    `- Depends on: ${dependsOn}`,
    "",
    "## Execution Requirements",
    "",
    "- Work in the customer delivery repo/workspace selected by `PB-REPO-001`; do not implement from an unspecified fallback cwd.",
    "- For Neon/Vercel/auth/deploy tasks, leave concrete environment evidence such as project ids, URLs, env names, migration logs, health checks, screenshots, or smoke-test output.",
    "- For online service UI work, keep public pages browsable without login and gate protected actions with the auth modal pattern.",
    ...sourceContract,
    "",
    "## Product Context",
    "",
    `- Product: ${intake.productName}`,
    `- Customer: ${intake.customerName}`,
    `- Reference: ${intake.referenceService}`,
    `- Target users: ${intake.targetUsers}`,
    "",
    "## Scope",
    "",
    task.description,
    "",
    "## Deliverables",
    "",
    ...task.deliverables.map((item) => `- ${item}`),
    "",
    "## Acceptance Criteria",
    "",
    ...task.acceptanceCriteria.map((item) => `- ${item}`),
    "",
    "## Workflow Rules",
    "",
    ...blueprint.constraints.map((item) => `- ${item}`),
  ].join("\n");
}

export function buildRootIssueDescription(input: {
  blueprint: ProductBuilderBlueprint;
  intake: ProductBuilderIntake;
  featureSelection?: ProductBuilderFeatureSelectionInput;
  domainFeatures?: ProductBuilderDomainFeatureInput[];
  buildId: string;
  tasks: ProductBuilderTask[];
}): string {
  const implementationCount = input.tasks.filter((task) => isImplementationDecision(task.decision)).length;
  const reuseCount = input.tasks.filter((task) => task.decision === "REUSE").length;
  const skippedCount = input.tasks.filter((task) => task.decision === "N/A").length;
  return [
    `# Product Builder Build: ${input.intake.productName}`,
    "",
    `Build ID: \`${input.buildId}\``,
    `Blueprint: \`${input.blueprint.displayName}\` (${input.blueprint.id})`,
    "",
    "## Intake",
    "",
    `- Customer: ${input.intake.customerName}`,
    `- Reference service: ${input.intake.referenceService}`,
    `- Summary: ${input.intake.productSummary}`,
    `- Target users: ${input.intake.targetUsers}`,
    `- Notes: ${input.intake.customNotes || "none"}`,
    "",
    "## Feature Selection",
    "",
    ...featureSelectionSummaryLines(input.featureSelection ?? input.blueprint.defaultFeatureSelection),
    "",
    "## Domain Features",
    "",
    ...domainFeatureSummaryLines(input.domainFeatures ?? input.blueprint.defaultDomainFeatures),
    "",
    "## Standard Stack",
    "",
    `- Base repository: ${input.blueprint.baseRepository.name}`,
    `- Base role: ${input.blueprint.baseRepository.role}`,
    `- Base status: ${input.blueprint.baseRepository.status}`,
    `- Seed source: ${input.blueprint.baseRepository.seedSource}`,
    `- Readiness gate: ${input.blueprint.baseRepository.readinessGate}`,
    "",
    `- Web: ${input.blueprint.defaultStack.web}`,
    `- API: ${input.blueprint.defaultStack.api}`,
    `- Database: ${input.blueprint.defaultStack.database}`,
    `- Deploy: ${input.blueprint.defaultStack.deploy}`,
    `- Auth: ${input.blueprint.defaultStack.auth}`,
    `- Contract: ${input.blueprint.defaultStack.contract}`,
    ...(input.blueprint.defaultStack.ai ? [`- AI: ${input.blueprint.defaultStack.ai}`] : []),
    "",
    "## Initial Super Account",
    "",
    `- Email: \`${INITIAL_SUPER_ADMIN_EMAIL}\``,
    `- Password: \`${INITIAL_SUPER_ADMIN_PASSWORD}\``,
    "- This is a known bootstrap credential. Production hand-off must record password rotation, account deactivation, or transfer to a customer-owned admin account.",
    "",
    "## Delivery Gates",
    "",
    "- PB-REPO-001 must bind the real customer delivery repo/workspace before implementation work proceeds.",
    "- PB-ADMIN-SUPER-ACCOUNT-001 must create and verify the initial super admin account before admin access QA is considered ready.",
    "- PB-INFRA-002 must prove Neon migrations and DB connectivity before domain API work is considered ready.",
    "- PB-DEPLOY-VERIFY-001 must record real Vercel/Neon deployment evidence.",
    "- PB-LAUNCH-SMOKE-001 must prove public browse, auth modal, login, protected app access, and admin access control on the deployed URL.",
    "",
    "## Generated Task Counts",
    "",
    `- Total: ${input.tasks.length}`,
    `- Implementation NEW/EXTEND: ${implementationCount}`,
    `- Reuse decisions: ${reuseCount}`,
    `- N/A decisions: ${skippedCount}`,
    "",
    "## Core Rule",
    "",
    `This build always generates the fixed ${input.blueprint.displayName} task list, then expands approved domain feature cards into repeated DATA/API/surface/QA issues. REUSE/N/A issues are generated as completed SKIP decision records; NEW/EXTEND issues are generated as executable work.`,
  ].join("\n");
}

// ============================================================================
// Feature-isolated workflow generation (BuildPlan → ordered issue tree)
//
// 업스트림(분석/기획/와이어프레임)은 별도 프로젝트에서 수행되어 3양식
// (기획서·화면정의서·와이어프레임) 산출물을 만든다. product-builder는 그 산출물을
// 입력으로 받아 "실제 구현 항목"을 생성한다. 각 feature는 고정 5단계 격리 체인
// (BE → BE QA → FE → FE QA → 전체 QA) 으로, 제품 단위 통합 QA 1회 → 통합 Release
// 1회 게이트로 마무리된다.
//
// host 코어 무수정: 순서는 blocked-by 의존으로만 강제하고(이슈는 워크플로우 순서로
// 순차 생성되어 issueNumber 오름차순 = 워크플로우 순서), 단계 식별은 title 접두사 +
// body 마커(`<!-- pb:stage=... -->`) + 불변 slug 로 표현한다(host 워크플로우 status/
// label 미사용).
// ============================================================================

export type WorkflowRole = "feature-stage" | "shared" | "integration-qa" | "release";
export type WorkflowStageSlug = "be" | "be-qa" | "fe" | "fe-qa" | "full-qa";

export type WorkflowStageDef = {
  slug: WorkflowStageSlug;
  ko: string;
  order: number;
  agentKey: string;
  category: TaskCategory;
  surfaces: TaskSurface[];
  agentRole: string;
};

/** 고정 5단계. 순서는 이 배열의 order/index 로 불변. rename-safe slug. */
export const FEATURE_WORKFLOW_STAGES: readonly WorkflowStageDef[] = [
  { slug: "be", ko: "BE", order: 1, agentKey: BUILDER_BACKEND_AGENT_KEY, category: "backend", surfaces: ["api"], agentRole: "Backend Engineer" },
  { slug: "be-qa", ko: "BE QA", order: 2, agentKey: BUILDER_QA_AGENT_KEY, category: "qa", surfaces: ["qa"], agentRole: "QA Engineer" },
  { slug: "fe", ko: "FE", order: 3, agentKey: BUILDER_FRONTEND_AGENT_KEY, category: "frontend", surfaces: ["app"], agentRole: "Frontend Engineer" },
  { slug: "fe-qa", ko: "FE QA", order: 4, agentKey: BUILDER_QA_AGENT_KEY, category: "qa", surfaces: ["qa"], agentRole: "QA Engineer" },
  { slug: "full-qa", ko: "전체 QA", order: 5, agentKey: BUILDER_QA_AGENT_KEY, category: "qa", surfaces: ["qa"], agentRole: "QA Engineer" },
] as const;

export const STAGE_BY_SLUG: Record<WorkflowStageSlug, WorkflowStageDef> = Object.fromEntries(
  FEATURE_WORKFLOW_STAGES.map((stage) => [stage.slug, stage]),
) as Record<WorkflowStageSlug, WorkflowStageDef>;

export const INTEGRATION_QA_TASK_KEY = "INTEGRATION-QA-001";
export const RELEASE_TASK_KEY = "RELEASE-001";
export const INTEGRATION_QA_KO = "통합 QA";
export const RELEASE_KO = "통합 Release";
export const SHARED_KO = "공통";

export type StagePlanInput = {
  decision?: TaskDecision;
  reuseRef?: string;
  title?: string;
  description?: string;
  items?: string[];
};

export type BuildFeatureInput = {
  id: string;
  title: string;
  /** 미지정 stage 의 기본 decision. 기본값 NEW. */
  featureDecision?: TaskDecision;
  description?: string;
  /** stage 단위 override. */
  stages?: Partial<Record<WorkflowStageSlug, StagePlanInput>>;
  /** 이 feature 의 FE 단계가 선행으로 의존하는 공통(shared) item id 들. */
  dependsOnShared?: string[];
};

export type SharedWorkItemInput = {
  id: string;
  title: string;
  /** "layout" | "shell" | "infra" 등. infra 계열은 platform 담당. */
  kind?: string;
  decision?: TaskDecision;
  description?: string;
  items?: string[];
};

export type BuildPlan = {
  blueprintId?: string;
  productName?: string;
  features: BuildFeatureInput[];
  shared?: SharedWorkItemInput[];
};

export type InstantiateBuildPlanInput = {
  companyId: string;
  plan: BuildPlan;
  /** 3양식 document 가 첨부된 build-root 이슈 id (선택; 입력 추적용). */
  documentIssueId?: string;
};

export type ResolvedBuildFeature = { fid: string; feature: BuildFeatureInput };

/**
 * feature id 를 정규화하면서 충돌을 disambiguate 한다. 서로 다른 두 feature 의 id 가
 * 같은 key 로 정규화되면(예: "feat a" 와 "feat-a" → "FEAT-A") 데이터 손실 없이
 * suffix(-2, -3 …)로 고유화한다. (기존 slugForFeature 의 used-Set 패턴과 동일.)
 */
export function resolveBuildFeatures(features: BuildFeatureInput[]): ResolvedBuildFeature[] {
  const used = new Set<string>();
  return features.map((feature) => {
    const base = workflowKeyPart(feature.id || feature.title);
    let fid = base;
    let n = 2;
    while (used.has(fid)) {
      fid = `${base}-${n}`;
      n += 1;
    }
    used.add(fid);
    return { fid, feature };
  });
}

const STAGE_PLAN_SCHEMA = {
  type: "object",
  properties: {
    decision: { type: "string", enum: ["NEW", "EXTEND", "REUSE", "N/A"] },
    reuseRef: { type: "string", description: "product-builder-base:<capability-path>@<ref>" },
    title: { type: "string" },
    description: { type: "string" },
    items: { type: "array", items: { type: "string" }, description: "stage 하위 구현 항목(BE: DATA/API/webhook, FE: surface/admin UI 등)" },
  },
};

/** instantiate-build-plan 에이전트 도구 선언 (manifest.tools + ctx.tools.register 공유). */
export const INSTANTIATE_BUILD_PLAN_TOOL = {
  name: ACTION.instantiateBuildPlan,
  displayName: "Product Builder: instantiate build plan",
  description:
    "업스트림 3양식(기획서/화면정의서/와이어프레임)과 product-builder-base 갭/reuse 판정 결과를 구조화한 BuildPlan을 받아, feature별 고정 5단계(BE→BE QA→FE→FE QA→전체 QA) 격리 체인 + 제품 통합 QA + 통합 Release를 Paperclip 이슈 그래프로 결정론적으로 생성한다. 이슈를 직접 만들지 말고 이 도구를 호출하라.",
  parametersSchema: {
    type: "object",
    properties: {
      plan: {
        type: "object",
        properties: {
          blueprintId: { type: "string" },
          productName: { type: "string" },
          features: {
            type: "array",
            description: "각 feature는 BE→BE QA→FE→FE QA→전체 QA 5단계 격리 체인이 된다.",
            items: {
              type: "object",
              properties: {
                id: { type: "string", description: "feature 고유 id (정규화 충돌 시 자동 suffix)" },
                title: { type: "string" },
                featureDecision: { type: "string", enum: ["NEW", "EXTEND", "REUSE", "N/A"], description: "미지정 stage 의 기본 decision" },
                description: { type: "string" },
                stages: {
                  type: "object",
                  description: "stage 단위 override.",
                  properties: {
                    be: STAGE_PLAN_SCHEMA,
                    "be-qa": STAGE_PLAN_SCHEMA,
                    fe: STAGE_PLAN_SCHEMA,
                    "fe-qa": STAGE_PLAN_SCHEMA,
                    "full-qa": STAGE_PLAN_SCHEMA,
                  },
                },
                dependsOnShared: { type: "array", items: { type: "string" }, description: "이 feature FE 단계가 선행 의존하는 shared item id 들" },
              },
              required: ["id", "title"],
            },
          },
          shared: {
            type: "array",
            description: "feature 밖 공통 작업(레이아웃/쉘/공통 인프라).",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                kind: { type: "string", description: "layout | shell | infra 등" },
                decision: { type: "string", enum: ["NEW", "EXTEND", "REUSE", "N/A"] },
                description: { type: "string" },
                items: { type: "array", items: { type: "string" } },
              },
              required: ["id", "title"],
            },
          },
        },
        required: ["features"],
      },
      documentIssueId: { type: "string", description: "3양식 document 가 첨부된 build-root 이슈 id (선택)" },
    },
    required: ["plan"],
  },
};

export function workflowKeyPart(id: string): string {
  const cleaned = id.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned.length > 0 ? cleaned : "X";
}

export function sharedTaskKey(id: string): string {
  return `SHARED-${workflowKeyPart(id)}`;
}

export function featureStageTaskKey(featureId: string, slug: WorkflowStageSlug): string {
  return `FEAT-${workflowKeyPart(featureId)}-${slug.toUpperCase()}`;
}

export function resolveStageDecision(feature: BuildFeatureInput, slug: WorkflowStageSlug): TaskDecision {
  return feature.stages?.[slug]?.decision ?? feature.featureDecision ?? "NEW";
}

function workflowTask(input: {
  key: string;
  phase: string;
  title: string;
  description: string;
  decision: TaskDecision;
  category: TaskCategory;
  surfaces: TaskSurface[];
  agentRole: string;
  priority?: TaskPriority;
  dependsOn?: string[];
  deliverables?: string[];
  acceptanceCriteria?: string[];
  reuseSource?: string;
  capabilityKey?: string;
  workflowRole: WorkflowRole;
  featureId?: string;
  stageSlug?: WorkflowStageSlug;
  stageOrder?: number;
}): ProductBuilderTask {
  return {
    key: input.key,
    phase: input.phase,
    title: input.title,
    description: input.description,
    surfaces: input.surfaces,
    targetPaths: input.surfaces.map((surface) => TASK_SURFACE_TARGET_PATHS[surface]),
    decision: input.decision,
    category: input.category,
    priority: input.priority ?? "medium",
    capabilityKey: input.capabilityKey,
    reuseSource: input.reuseSource,
    agentRole: input.agentRole,
    dependsOn: input.dependsOn && input.dependsOn.length > 0 ? input.dependsOn : undefined,
    deliverables: input.deliverables ?? [],
    acceptanceCriteria: input.acceptanceCriteria ?? [],
    workflowRole: input.workflowRole,
    featureId: input.featureId,
    stageSlug: input.stageSlug,
    stageOrder: input.stageOrder,
  };
}

/**
 * BuildPlan → 워크플로우 순서로 정렬된 ProductBuilderTask[].
 *
 * 생성 순서(= 이슈 생성 순서 = issueNumber 오름차순 = 워크플로우 순서):
 *   1) 공통(shared) item 들
 *   2) feature 별 5단계 (BE → BE QA → FE → FE QA → 전체 QA), feature 끼리 격리
 *   3) 제품 통합 QA (전 feature full-qa + 전 shared 가 blocker)
 *   4) 통합 Release (통합 QA 가 blocker)
 *
 * 격리 불변식: 서로 다른 feature 의 stage 끼리는 blocker 가 없다. 허용되는 cross-edge =
 * 공통 → feature-FE, feature full-qa → 통합 QA, 통합 QA → Release.
 */
export function buildWorkflowTasks(plan: BuildPlan): ProductBuilderTask[] {
  const tasks: ProductBuilderTask[] = [];
  const sharedItems = plan.shared ?? [];
  const sharedKeys: string[] = [];

  for (const item of sharedItems) {
    const key = sharedTaskKey(item.id);
    if (sharedKeys.includes(key)) continue;
    sharedKeys.push(key);
    const isInfra = (item.kind ?? "").toLowerCase().includes("infra");
    tasks.push(workflowTask({
      key,
      phase: SHARED_KO,
      title: item.title,
      description: item.description ?? `${item.title} — feature 횡단 공통 작업${item.kind ? ` (${item.kind})` : ""}.`,
      decision: item.decision ?? "NEW",
      category: isInfra ? "ops" : "frontend",
      surfaces: isInfra ? ["ops"] : ["shared"],
      agentRole: isInfra ? "Platform Engineer" : "Frontend Engineer",
      priority: "high",
      deliverables: item.items ?? [],
      workflowRole: "shared",
    }));
  }

  const fullQaKeys: string[] = [];
  for (const { fid, feature } of resolveBuildFeatures(plan.features ?? [])) {
    const missingShared = (feature.dependsOnShared ?? []).filter(
      (sharedId) => !sharedKeys.includes(sharedTaskKey(sharedId)),
    );
    if (missingShared.length > 0) {
      throw new Error(
        `feature "${feature.id || feature.title}" dependsOnShared references unknown shared id(s): ${missingShared.join(", ")}`,
      );
    }
    const featureSharedDeps = (feature.dependsOnShared ?? []).map((sharedId) => sharedTaskKey(sharedId));

    let prevKey: string | null = null;
    for (const stage of FEATURE_WORKFLOW_STAGES) {
      const key = featureStageTaskKey(fid, stage.slug);
      const stagePlan = feature.stages?.[stage.slug];
      const decision = stagePlan?.decision ?? feature.featureDecision ?? "NEW";
      const dependsOn: string[] = [];
      if (prevKey) dependsOn.push(prevKey);
      if (stage.slug === "fe") dependsOn.push(...featureSharedDeps);
      tasks.push(workflowTask({
        key,
        phase: feature.title,
        title: stagePlan?.title ?? feature.title,
        description:
          stagePlan?.description ??
          `${feature.title} — ${stage.ko} 단계.${feature.description ? ` ${feature.description}` : ""}`,
        decision,
        category: stage.category,
        surfaces: stage.surfaces,
        agentRole: stage.agentRole,
        priority: "medium",
        reuseSource: stagePlan?.reuseRef,
        dependsOn,
        deliverables: stagePlan?.items ?? [],
        workflowRole: "feature-stage",
        featureId: fid,
        stageSlug: stage.slug,
        stageOrder: stage.order,
      }));
      if (stage.slug === "full-qa") fullQaKeys.push(key);
      prevKey = key;
    }
  }

  // 빈 plan(피처·공통 모두 없음)은 게이트도 만들지 않는다.
  if (fullQaKeys.length === 0 && sharedKeys.length === 0) {
    return tasks;
  }

  tasks.push(workflowTask({
    key: INTEGRATION_QA_TASK_KEY,
    phase: INTEGRATION_QA_KO,
    title: "제품 통합 QA",
    description: "전 feature 를 합친 제품 단위 cross-feature 통합·회귀 QA. 배포 직전 게이트.",
    decision: "NEW",
    category: "qa",
    surfaces: ["qa"],
    agentRole: "QA Engineer",
    priority: "high",
    dependsOn: [...new Set([...fullQaKeys, ...sharedKeys])],
    deliverables: ["cross-feature 통합 시나리오", "회귀 테스트", "배포 전 스모크"],
    workflowRole: "integration-qa",
  }));

  tasks.push(workflowTask({
    key: RELEASE_TASK_KEY,
    phase: RELEASE_KO,
    title: "main 머지 + release Tag",
    description: "통합 QA 통과 후 제품을 main 에 머지하고 release tag 를 발행한다.",
    decision: "NEW",
    category: "ops",
    surfaces: ["ops"],
    agentRole: "Release Manager",
    priority: "high",
    dependsOn: [INTEGRATION_QA_TASK_KEY],
    deliverables: ["main 머지", "release tag", "배포 검증 evidence"],
    workflowRole: "release",
  }));

  return tasks;
}

export function workflowAgentKeyForTask(task: ProductBuilderTask): string {
  if (task.workflowRole === "feature-stage" && task.stageSlug) {
    return STAGE_BY_SLUG[task.stageSlug].agentKey;
  }
  if (task.workflowRole === "integration-qa") return BUILDER_QA_AGENT_KEY;
  if (task.workflowRole === "release") return BUILDER_AGENT_KEY;
  if (task.workflowRole === "shared") {
    return task.category === "ops" ? BUILDER_PLATFORM_AGENT_KEY : BUILDER_FRONTEND_AGENT_KEY;
  }
  return BUILDER_AGENT_KEY;
}

export function workflowIssueTitle(task: ProductBuilderTask): string {
  if (task.workflowRole === "feature-stage" && task.stageSlug) {
    return `[${STAGE_BY_SLUG[task.stageSlug].ko}] ${task.title}`;
  }
  if (task.workflowRole === "shared") return `[${SHARED_KO}] ${task.title}`;
  if (task.workflowRole === "integration-qa") return `[${INTEGRATION_QA_KO}] ${task.title}`;
  if (task.workflowRole === "release") return `[${RELEASE_KO}] ${task.title}`;
  return task.title;
}

export function workflowStageMarker(task: ProductBuilderTask): string {
  if (task.workflowRole === "feature-stage") {
    return `<!-- pb:stage=${task.stageSlug} feature=${task.featureId} order=${task.stageOrder ?? 0} -->`;
  }
  return `<!-- pb:role=${task.workflowRole ?? "task"} -->`;
}

export function buildWorkflowIssueDescription(input: {
  task: ProductBuilderTask;
  buildId: string;
  productName: string;
  featureTitle?: string;
}): string {
  const { task, buildId, productName, featureTitle } = input;
  const skip = isImplementationDecision(task.decision)
    ? "Executable work item."
    : "SKIP record (REUSE/N/A) — generated as done to preserve the fixed workflow chain without blocking downstream stages.";
  const lines = [
    workflowStageMarker(task),
    `# ${task.title}`,
    "",
    `Product Builder workflow build: \`${buildId}\``,
    `Product: ${productName}`,
    "",
    "## Workflow",
    "",
    `- Role: \`${task.workflowRole ?? "task"}\``,
    ...(task.featureId ? [`- Feature: \`${task.featureId}\`${featureTitle ? ` (${featureTitle})` : ""}`] : []),
    ...(task.stageSlug ? [`- Stage: \`${task.stageSlug}\` (order ${task.stageOrder})`] : []),
    `- Decision: \`${task.decision}\``,
    `- Handling: ${skip}`,
    `- Depends on: ${task.dependsOn?.length ? task.dependsOn.join(", ") : "none"}`,
    `- Agent role: ${task.agentRole}`,
    ...(task.reuseSource
      ? [
          `- Reuse source: ${task.reuseSource}`,
          "- `PB-BASE-001` must verify the base repo/path/ref before a REUSE stage is treated as truly done; otherwise convert to EXTEND/NEW.",
        ]
      : []),
    "",
    "## Scope",
    "",
    task.description,
  ];
  if (task.deliverables.length > 0) {
    lines.push("", "## Deliverables", "", ...task.deliverables.map((item) => `- ${item}`));
  }
  return lines.join("\n");
}

export function buildFeatureParentDescription(input: {
  featureId: string;
  title: string;
  buildId: string;
  decision: TaskDecision;
  description?: string;
}): string {
  return [
    `<!-- pb:role=feature feature=${input.featureId} -->`,
    `# [Feature] ${input.title}`,
    "",
    `Product Builder workflow build: \`${input.buildId}\``,
    `- Feature id: \`${input.featureId}\``,
    `- Default decision: \`${input.decision}\``,
    "",
    input.description ?? "이 feature 의 고정 5단계(BE → BE QA → FE → FE QA → 전체 QA) 격리 워크플로우 부모 이슈.",
    "",
    "격리 불변식: 이 feature 의 단계는 다른 feature 의 단계를 막지 않는다.",
  ].join("\n");
}

export function buildWorkflowRootDescription(input: {
  plan: BuildPlan;
  buildId: string;
  tasks: ProductBuilderTask[];
  documentIssueId?: string;
}): string {
  const featureCount = (input.plan.features ?? []).length;
  const sharedCount = (input.plan.shared ?? []).length;
  const stageCount = input.tasks.filter((task) => task.workflowRole === "feature-stage").length;
  return [
    `<!-- pb:role=workflow-root -->`,
    `# Product Builder Workflow Build: ${input.plan.productName ?? "(unnamed)"}`,
    "",
    `Build ID: \`${input.buildId}\``,
    ...(input.plan.blueprintId ? [`Blueprint: \`${input.plan.blueprintId}\``] : []),
    ...(input.documentIssueId ? [`Input documents issue: \`${input.documentIssueId}\``] : []),
    "",
    "## 입력",
    "",
    "- 업스트림(분석/기획) 산출물 3양식(기획서·화면정의서·와이어프레임)을 토대로 생성됨.",
    "- product-builder-base 와의 갭/reuse 판정 결과가 stage decision 에 반영됨.",
    "",
    "## 워크플로우 구조",
    "",
    `- Feature: ${featureCount}개 (각 고정 5단계 BE → BE QA → FE → FE QA → 전체 QA, feature 격리)`,
    `- 공통(shared) 작업: ${sharedCount}개 (feature 밖 cross-cutting)`,
    `- Feature stage 이슈: ${stageCount}개`,
    "- 제품 통합 QA 1개 → 통합 Release 1개 (main 머지 + release tag)",
    "",
    "## 순서/격리 메커니즘",
    "",
    "- 순서: 이슈가 워크플로우 순서로 순차 생성됨(issueNumber 오름차순) + blocked-by 의존으로 실행 순서 강제.",
    "- 격리: 서로 다른 feature 의 stage 끼리는 blocker 없음. 공통 → feature-FE, feature 전체 QA → 통합 QA, 통합 QA → Release 만 연결.",
    "- 단계 식별: title 접두사 + body `pb:stage` 마커 + 불변 slug.",
  ].join("\n");
}

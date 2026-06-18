export const PLUGIN_ID = "paperclip-plugin-cos-blueprint";
export const PLUGIN_VERSION = "0.1.0";
export const PAGE_ROUTE = "cos-blueprint";
export const STATE_KEY = "cos-blueprint-state";
export const ALLOWED_COMPANY_PREFIX = "BBR";
export const ALLOWED_COMPANY_ID = "96fcd977-1d55-4697-a464-abb656dd57c2";

export const isAllowedCompany = (
  companyId?: string | null,
  companyPrefix?: string | null,
): boolean =>
  companyId === ALLOWED_COMPANY_ID ||
  (companyPrefix ?? "").toUpperCase() === ALLOWED_COMPANY_PREFIX;

export const DATA = {
  overview: "overview",
  projects: "projects",
} as const;

export const ACTION = {
  saveSource: "save-source",
  registerSourceDocument: "register-source-document",
  // 분석 단계 ①: 표준 기획서
  runStandardPlan: "run-standard-plan",
  confirmStandardPlan: "confirm-standard-plan",
  writeStandardPlanDocs: "write-standard-plan-docs",
  // 분석 단계 ②: 화면정의서 (확정 게이트 통과 후)
  runScreens: "run-screens",
  writeScreenDocs: "write-screen-docs",
  reset: "reset",
} as const;

export const SOURCE_TYPES = ["internal-plan", "external-plan", "meeting-note", "reference", "other"] as const;

export type SourceType = typeof SOURCE_TYPES[number];

// 업로드 파일에서 추출한 원본 포맷. text = 직접 입력.
export const SOURCE_FORMATS = ["text", "txt", "md", "docx", "pptx"] as const;
export type SourceFormat = typeof SOURCE_FORMATS[number];

// 등록한 기획 자료를 프로젝트 문서로 적재하는 디렉터리.
export const SOURCE_DOC_DIR = "docs/cos-blueprint/sources";

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
};

export type SchemaField = {
  name: string;
  type: string;
  required: boolean;
  description: string;
};

export type SchemaDefinition = {
  code: string;
  name: string;
  description: string;
  fields: SchemaField[];
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

export type ScreenDefinition = {
  code: string;
  name: string;
  description: string;
  layoutCode: string;
  layoutSlot: string;
  route: string;
  primaryTestId: string;
  schemas: string[];
  apis: string[];
  fields: string[];
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
  generatedAt: string;
  /** 확정 시각. null이면 미확정 → 화면정의서 단계 진입 불가(게이트). */
  confirmedAt: string | null;
  llmModel?: string;
  usedFallback?: boolean;
};

// 분석 ②단계 산출물: 화면정의서 전체. 확정된 StandardPlan을 입력으로 생성.
export type ScreenPlan = {
  screens: ScreenDefinition[];
  generatedAt: string;
  confirmedAt: string | null;
  llmModel?: string;
  usedFallback?: boolean;
};

export type CosBlueprintState = {
  sources: SourceMaterial[];
  standardPlan: StandardPlan | null;
  screenPlan: ScreenPlan | null;
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
  source: SourceMaterial;
  projectId: string | null;
  workspacePath: string | null;
  /** 프로젝트 workspace에 기록한 문서 경로. 미기록 시 null. */
  file: string | null;
  message: string;
};

export function emptyState(): CosBlueprintState {
  return {
    sources: [],
    standardPlan: null,
    screenPlan: null,
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

export function buildFallbackStandardPlan(input: {
  title?: string;
  sources: SourceMaterial[];
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

  const schemas: SchemaDefinition[] = [
    {
      code: "SCH-001",
      name: "ProjectBrief",
      description: "등록된 내부/외부 기획 자료를 정규화한 프로젝트 요구사항 요약.",
      fields: [
        field("id", "uuid", true, "프로젝트 브리프 식별자"),
        field("title", "string", true, "프로젝트명"),
        field("summary", "string", true, "핵심 요구사항 요약"),
        field("status", "planned | analyzing | approved", true, "브리프 상태"),
      ],
    },
    {
      code: "SCH-002",
      name: "ScreenSpec",
      description: "화면정의서 생성을 위한 화면 단위 메타데이터.",
      fields: [
        field("screenCode", "string", true, "화면 코드"),
        field("screenName", "string", true, "화면명"),
        field("layoutCode", "string", true, "사용 레이아웃 코드"),
        field("testId", "string", true, "E2E/QA 기준 primary test id"),
      ],
    },
  ];

  if (hasUpload) {
    schemas.push({
      code: "SCH-003",
      name: "Attachment",
      description: "기획 자료 또는 산출물에 연결되는 파일 메타데이터.",
      fields: [
        field("id", "uuid", true, "파일 식별자"),
        field("fileName", "string", true, "원본 파일명"),
        field("mimeType", "string", true, "MIME 타입"),
        field("storageKey", "string", true, "저장소 key"),
      ],
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
    },
    {
      code: "API-003",
      method: "GET",
      path: "/api/project-briefs/{id}/screens",
      summary: "화면정의서 목록 조회",
      input: [param("id", "uuid", true, "브리프 ID")],
      output: [param("screens", "ScreenSpec[]", true, "화면 목록")],
      schemas: ["SCH-002"],
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
      primaryTestId: "cos-scr-001",
      schemas: ["SCH-001"],
      apis: ["API-001"],
      fields: ["title", "sourceType", "body"],
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
      primaryTestId: "cos-scr-002",
      schemas: ["SCH-001", "SCH-002"],
      apis: ["API-002", "API-003"],
      fields: ["overview", "goals", "scope", "functionalRequirements", "schemas", "apis", "layouts"],
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
      primaryTestId: "cos-scr-003",
      schemas: ["SCH-001", "SCH-002"],
      apis: ["API-003"],
      fields: ["reviewStatus", "reviewComment"],
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
    })),
    apis: apis.map((api, index) => ({
      ...api,
      code: api.code || `API-${String(index + 1).padStart(3, "0")}`,
      method: api.method || "GET",
      input: Array.isArray(api.input) ? api.input : [],
      output: Array.isArray(api.output) ? api.output : [],
      schemas: Array.isArray(api.schemas) ? api.schemas : [],
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
    generatedAt: typeof record.generatedAt === "string" ? record.generatedAt : fallback.generatedAt,
    confirmedAt: null,
    llmModel: typeof record.llmModel === "string" ? record.llmModel : fallback.llmModel,
    usedFallback: false,
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
  const str = (value: unknown, defaultValue: string) =>
    typeof value === "string" && value.trim() ? value.trim() : defaultValue;

  return {
    screens: screens.map((screen, screenIndex) => {
      const code = str(screen.code, `COS-SCR-${String(screenIndex + 1).padStart(3, "0")}`);
      return {
        ...screen,
        code,
        // render(renderScreenDocuments/renderScreenDefinition)가 하드 의존하는 문자열 필드는 반드시 채운다.
        name: str(screen.name, code),
        description: str(screen.description, ""),
        layoutCode: str(screen.layoutCode, ""),
        layoutSlot: str(screen.layoutSlot, ""),
        route: str(screen.route, ""),
        primaryTestId: str(screen.primaryTestId, code.toLowerCase()),
        schemas: Array.isArray(screen.schemas) ? screen.schemas : [],
        apis: Array.isArray(screen.apis) ? screen.apis : [],
        fields: Array.isArray(screen.fields) ? screen.fields : [],
        actions: Array.isArray(screen.actions)
          ? screen.actions.map((item, index) => {
            const codePart = str(item?.code, `ACT-${String(index + 1).padStart(2, "0")}`);
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
          ? screen.acceptanceCriteria.map((item, index) => {
            const codePart = str(item?.code, `AC-${String(index + 1).padStart(2, "0")}`);
            return {
              ...item,
              code: codePart,
              testId: str(item?.testId, `${code.toLowerCase()}-${codePart.toLowerCase()}`),
              description: str(item?.description, ""),
            };
          })
          : [],
      };
    }),
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
    blocks.push([`## Source ${index + 1}: ${source.title}`, `type: ${source.type}`, body].join("\n"));
    if (total >= TOTAL_SOURCE_CAP) {
      blocks.push(`…(이하 ${sources.length - index - 1}건 자료 생략, 합산 상한 도달)`);
      break;
    }
  }
  return blocks.join("\n\n");
}

// 분석 ①단계 프롬프트: 표준 기획서(일정 제외). screens 생성 금지.
export function buildStandardPlanPrompt(input: { title?: string; sources: SourceMaterial[] }): string {
  return [
    "COS Blueprint 표준 기획서 분석을 수행해 JSON 객체 하나만 출력하라.",
    "목표: 내부/외부 기획 자료에서 '표준 기획서'를 산출한다. 화면정의서(screens)는 이 단계에서 생성하지 않는다.",
    "각 섹션 작성 지침:",
    "- overview: 프로젝트 배경과 목적을 3~5문장으로 서술한다.",
    "- goals: 측정 가능한 목표 3~6개의 문자열 배열.",
    "- scope: { inScope: string[], outOfScope: string[] }. 포함 범위와 제외 범위를 모두 명시한다(제외 범위 필수).",
    "- functionalRequirements: { code: 'FR-001' 형식, title, description, priority: 'must'|'should'|'could' } 배열. 기획 자료에서 도출한 기능 요구사항.",
    "- nonFunctionalRequirements: 성능/보안/가용성/운영 등 비기능 요구사항 문자열 배열.",
    "- schemas: DB 스키마 개요. { code: 'SCH-001', name, description, fields:[{name,type,required,description}] }.",
    "- apis: API 인터페이스 개요. { code: 'API-001', method, path, summary, input, output, schemas }.",
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
    `개요: ${plan.overview}`,
    `목표: ${plan.goals.join("; ")}`,
    `기능 요구사항: ${plan.functionalRequirements.map((fr) => `${fr.code} ${fr.title}`).join("; ")}`,
    `스키마 코드: ${plan.schemas.map((s) => s.code).join(", ")}`,
    `API 코드: ${plan.apis.map((a) => a.code).join(", ")}`,
    `레이아웃 코드: ${plan.layouts.map((l) => l.code).join(", ")}`,
  ].join("\n");

  return [
    "확정된 표준 기획서를 기준으로 화면정의서 전체를 생성해 JSON 객체 하나만 출력하라.",
    "화면 1개는 ScreenDefinition 1개다. 직관적이고 명료해야 한다.",
    "각 screen: code(COS-SCR-001), name, description, layoutCode, layoutSlot, route, primaryTestId, schemas, apis, fields, actions, acceptanceCriteria.",
    "schemas/apis/layoutCode는 표준 기획서에 정의된 코드만 참조한다(재정의 금지).",
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

export function renderStandardPlan(plan: StandardPlan): string {
  return [
    `# 표준 기획서 - ${plan.projectTitle}`,
    "",
    `생성일: ${plan.generatedAt}`,
    plan.llmModel ? `모델: ${plan.llmModel}${plan.usedFallback ? " (fallback)" : ""}` : null,
    `상태: ${plan.confirmedAt ? `확정(${plan.confirmedAt})` : "미확정"}`,
    "",
    "## 1. 개요",
    "",
    plan.overview,
    "",
    "## 2. 목표",
    "",
    list(plan.goals),
    "",
    "## 3. 범위",
    "",
    "### 포함 범위",
    "",
    list(plan.scope.inScope),
    "",
    "### 제외 범위",
    "",
    list(plan.scope.outOfScope),
    "",
    "## 4. 기능 요구사항",
    "",
    table(
      ["코드", "기능", "우선순위", "설명"],
      plan.functionalRequirements.map((fr) => [
        fr.code,
        fr.title,
        fr.priority ? PRIORITY_LABEL[fr.priority] : "-",
        fr.description,
      ]),
    ),
    "",
    "## 5. 비기능 요구사항",
    "",
    list(plan.nonFunctionalRequirements),
    "",
    "## 6. DB 스키마 개요",
    "",
    table(
      ["코드", "이름", "설명"],
      plan.schemas.map((schema) => [schema.code, schema.name, schema.description]),
    ),
    "",
    "## 7. API 개요",
    "",
    table(
      ["코드", "Method", "Path", "설명"],
      plan.apis.map((api) => [api.code, api.method, api.path, api.summary]),
    ),
    "",
    "## 8. 공통 레이아웃",
    "",
    table(
      ["코드", "이름", "설명"],
      plan.layouts.map((layout) => [layout.code, layout.name, layout.description]),
    ),
    "",
    "## 9. 리스크",
    "",
    table(
      ["코드", "리스크", "완화 방안"],
      plan.risks.map((risk) => [risk.code, risk.description, risk.mitigation]),
    ),
    "",
    "## 10. 전제",
    "",
    list(plan.assumptions),
  ].filter((line): line is string => line !== null).join("\n");
}

export function renderInterfaceDefinition(plan: StandardPlan): string {
  return [
    `# DB 스키마/API 인터페이스 정의 - ${plan.projectTitle}`,
    "",
    "## 스키마 목차",
    "",
    table(
      ["코드", "이름", "설명", "필드"],
      plan.schemas.map((schema) => [
        schema.code,
        schema.name,
        schema.description,
        schema.fields.map((item) => `${item.name}:${item.type}${item.required ? "*" : ""}`).join("<br>"),
      ]),
    ),
    "",
    "## API 인터페이스",
    "",
    table(
      ["코드", "Method", "Path", "설명", "입력", "출력", "Schema"],
      plan.apis.map((api) => [
        api.code,
        api.method,
        api.path,
        api.summary,
        api.input.map((item) => `${item.name}:${item.type}${item.required ? "*" : ""}`).join("<br>"),
        api.output.map((item) => `${item.name}:${item.type}${item.required ? "*" : ""}`).join("<br>"),
        api.schemas.join(", "),
      ]),
    ),
  ].join("\n");
}

export function renderLayoutDefinition(plan: StandardPlan): string {
  return [
    `# 공통 화면 레이아웃 정의 - ${plan.projectTitle}`,
    "",
    ...plan.layouts.flatMap((layout) => [
      `## ${layout.code} ${layout.name}`,
      "",
      layout.description,
      "",
      table(
        ["Slot 코드", "Slot 이름", "목적"],
        layout.slots.map((slot) => [slot.code, slot.name, slot.purpose]),
      ),
      "",
    ]),
  ].join("\n");
}

export function renderScreenDefinition(screen: ScreenDefinition, projectTitle: string): string {
  return [
    `# 화면정의서 - ${screen.code} ${screen.name}`,
    "",
    "## 1. 기본 정보",
    "",
    table(
      ["항목", "내용"],
      [
        ["프로젝트", projectTitle],
        ["화면 코드", screen.code],
        ["화면명", screen.name],
        ["화면 설명", screen.description],
        ["Route", screen.route],
        ["Layout", `${screen.layoutCode} / ${screen.layoutSlot}`],
        ["Primary test-id", screen.primaryTestId],
      ],
    ),
    "",
    "## 2. 참조 계약",
    "",
    table(
      ["구분", "코드"],
      [
        ["Schema", screen.schemas.join(", ") || "(없음)"],
        ["API", screen.apis.join(", ") || "(없음)"],
      ],
    ),
    "",
    "## 3. 화면 필드",
    "",
    list(screen.fields),
    "",
    "## 4. 사용자 인터랙션",
    "",
    table(
      ["Action", "test-id", "Trigger", "동작 설명", "API", "이동 화면"],
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
    "## 5. 인수 기준",
    "",
    table(
      ["AC", "test-id", "설명"],
      screen.acceptanceCriteria.map((item) => [item.code, item.testId, item.description]),
    ),
  ].join("\n");
}

export function renderWritingRules(): string {
  return [
    "# 화면정의서 작성 룰",
    "",
    "1. 화면 1개는 화면정의서 1개로 작성한다.",
    "2. 화면 코드는 `{AREA}-SCR-{NNN}` 형식을 사용한다.",
    "3. 공통 레이아웃은 `{AREA}-LAY-{NNN}` 문서에서 먼저 정의하고, 화면정의서는 `layoutCode`와 `layoutSlot`만 참조한다.",
    "4. 사용자 동작은 `ACT-01`부터 순번으로 작성한다.",
    "5. 인수 기준은 `AC-01`부터 순번으로 작성한다.",
    "6. `data-testid`는 화면코드와 action/ac code에서 파생한다. 예: `cos-scr-001-act-01`, `cos-scr-001-ac-01`.",
    "7. 화면 이동 액션은 대상 화면코드(`targetScreenCode`)를 반드시 적는다.",
    "8. 화면에서 쓰는 스키마/API는 선행 인터페이스 정의서의 코드만 참조하고, 화면정의서에서 재정의하지 않는다.",
    "9. 예외/빈 상태/권한 오류처럼 QA가 확인해야 하는 상태는 인수 기준에 적는다.",
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

// 등록 자료 1건이 적재될 프로젝트 문서 경로.
// slug만으로는 한글 파일명 붕괴/동일 이름 충돌로 덮어쓰기가 발생하므로 source id 접미사(48bit)로 충돌 확률을 사실상 0으로 낮춘다.
export function sourceDocPath(source: SourceMaterial): string {
  const base = source.fileName ? source.fileName.replace(/\.[^.]+$/, "") : source.title;
  return `${SOURCE_DOC_DIR}/${fileSlug(base)}-${source.id.slice(0, 12)}.md`;
}

// 업로드/입력 자료를 프로젝트 문서로 기록하기 위한 Markdown. 본문 원문은 그대로 보존한다.
export function renderSourceDocument(source: SourceMaterial): string {
  return [
    `# 기획 자료 - ${source.title}`,
    "",
    table(
      ["항목", "내용"],
      [
        ["제목", source.title],
        ["유형", sourceTypeLabel(source.type)],
        ["원본 파일", source.fileName ?? "(직접 입력)"],
        ["포맷", source.format ?? "text"],
        ["등록 시각", source.createdAt],
      ],
    ),
    "",
    "## 본문",
    "",
    source.body,
  ].join("\n");
}

// 분석 ①단계 문서: 표준 기획서 + 인터페이스 정의 + 레이아웃 정의 (차례대로 산출의 1번).
export function renderStandardPlanDocuments(plan: StandardPlan): Record<string, string> {
  return {
    "docs/cos-blueprint/standard-plan.md": renderStandardPlan(plan),
    "docs/cos-blueprint/interface-definition.md": renderInterfaceDefinition(plan),
    "docs/cos-blueprint/layout-definition.md": renderLayoutDefinition(plan),
  };
}

// 분석 ②단계 문서: 작성 룰 + 화면정의서 전체 (차례대로 산출의 2번). (phase 2)
export function renderScreenDocuments(screenPlan: ScreenPlan, projectTitle: string): Record<string, string> {
  const docs: Record<string, string> = {
    "docs/cos-blueprint/screen-definition-writing-rules.md": renderWritingRules(),
  };

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

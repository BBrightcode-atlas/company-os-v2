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
} as const;

export const ACTION = {
  saveSource: "save-source",
  runAnalysis: "run-analysis",
  updateProjectDocuments: "update-project-documents",
  reset: "reset",
} as const;

export const SOURCE_TYPES = ["internal-plan", "external-plan", "meeting-note", "reference", "other"] as const;

export type SourceType = typeof SOURCE_TYPES[number];

export type SourceMaterial = {
  id: string;
  title: string;
  type: SourceType;
  body: string;
  createdAt: string;
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

export type BlueprintAnalysis = {
  projectTitle: string;
  summary: string;
  assumptions: string[];
  standardPlan: string[];
  schemas: SchemaDefinition[];
  apis: ApiDefinition[];
  layouts: LayoutDefinition[];
  screens: ScreenDefinition[];
  generatedAt: string;
  llmModel?: string;
  usedFallback?: boolean;
};

export type CosBlueprintState = {
  sources: SourceMaterial[];
  analysis: BlueprintAnalysis | null;
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

export function emptyState(): CosBlueprintState {
  return {
    sources: [],
    analysis: null,
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

export function sanitizeCodePart(value: string): string {
  return value
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

export function buildFallbackAnalysis(input: {
  title?: string;
  sources: SourceMaterial[];
  now?: string;
  model?: string;
}): BlueprintAnalysis {
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
      path: "/api/project-briefs/{id}/analysis",
      summary: "LLM 분석 실행",
      input: [param("id", "uuid", true, "브리프 ID")],
      output: [
        param("schemas", "SchemaDefinition[]", true, "스키마 정의 목록"),
        param("apis", "ApiDefinition[]", true, "API 인터페이스 정의 목록"),
        param("screens", "ScreenDefinition[]", true, "화면 정의 목록"),
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
          trigger: "분석 실행 버튼 클릭",
          description: "등록 자료를 기반으로 LLM 분석을 시작한다.",
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
      name: "분석 결과 검토",
      description: "LLM이 도출한 스키마, API 인터페이스, 레이아웃, 화면 목록을 검토한다.",
      layoutCode: "COS-LAY-001",
      layoutSlot: "SLOT-MAIN",
      route: "/cos-blueprint/analysis",
      primaryTestId: "cos-scr-002",
      schemas: ["SCH-001", "SCH-002"],
      apis: ["API-002", "API-003"],
      fields: ["summary", "schemas", "apis", "layouts", "screens"],
      actions: [
        action("COS-SCR-002", 1, {
          trigger: "프로젝트 문서 업데이트 클릭",
          description: "표준 기획서, 인터페이스 정의서, 레이아웃 정의서, 화면정의서를 프로젝트 문서에 기록한다.",
          apiCodes: [],
        }),
      ],
      acceptanceCriteria: [
        ac("COS-SCR-002", 1, "각 화면은 화면코드, 화면명, 설명, layoutCode, primaryTestId를 가진다."),
        ac("COS-SCR-002", 2, "화면 액션은 ACT 코드와 동일 규칙의 testId를 가진다."),
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
    projectTitle,
    summary: `${projectTitle}의 기획 자료를 기준으로 스키마, API 인터페이스, 공통 레이아웃, 화면정의서 초안을 생성했다.`,
    assumptions: [
      "화면정의서는 화면 1개당 문서 1개로 작성한다.",
      "공통 레이아웃은 별도 문서에서 먼저 정의하고 각 화면은 layoutCode와 slot만 참조한다.",
      "ACT 코드와 testId는 동일 화면 코드에서 파생해 E2E/QA 추적성을 맞춘다.",
    ],
    standardPlan: [
      "기획 자료 등록 및 분석 범위 확정",
      "DB 스키마 목차와 API 인터페이스 정의",
      "공통 레이아웃 정의",
      "화면별 화면정의서 생성",
      "E2E/QA 기준 test-id 검수",
      "프로젝트 문서 반영",
    ],
    schemas,
    apis,
    layouts,
    screens,
    generatedAt,
    llmModel: input.model,
    usedFallback: true,
  };
}

export function normalizeAnalysisJson(input: unknown, fallback: BlueprintAnalysis): BlueprintAnalysis {
  const record = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const pickString = (key: string, defaultValue: string) =>
    typeof record[key] === "string" && String(record[key]).trim() ? String(record[key]).trim() : defaultValue;
  const pickStringArray = (key: string, defaultValue: string[]) =>
    Array.isArray(record[key]) ? (record[key] as unknown[]).filter((v): v is string => typeof v === "string" && v.trim().length > 0) : defaultValue;

  const schemas = Array.isArray(record.schemas) && record.schemas.length > 0
    ? record.schemas as SchemaDefinition[]
    : fallback.schemas;
  const apis = Array.isArray(record.apis) && record.apis.length > 0
    ? record.apis as ApiDefinition[]
    : fallback.apis;
  const layouts = Array.isArray(record.layouts) && record.layouts.length > 0
    ? record.layouts as LayoutDefinition[]
    : fallback.layouts;
  const screens = Array.isArray(record.screens) && record.screens.length > 0
    ? record.screens as ScreenDefinition[]
    : fallback.screens;

  return {
    projectTitle: pickString("projectTitle", fallback.projectTitle),
    summary: pickString("summary", fallback.summary),
    assumptions: pickStringArray("assumptions", fallback.assumptions),
    standardPlan: pickStringArray("standardPlan", fallback.standardPlan),
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
    screens: screens.map((screen, screenIndex) => {
      const code = screen.code || `COS-SCR-${String(screenIndex + 1).padStart(3, "0")}`;
      return {
        ...screen,
        code,
        primaryTestId: screen.primaryTestId || code.toLowerCase(),
        schemas: Array.isArray(screen.schemas) ? screen.schemas : [],
        apis: Array.isArray(screen.apis) ? screen.apis : [],
        fields: Array.isArray(screen.fields) ? screen.fields : [],
        actions: Array.isArray(screen.actions)
          ? screen.actions.map((item, index) => {
            const codePart = item.code || `ACT-${String(index + 1).padStart(2, "0")}`;
            return {
              ...item,
              code: codePart,
              testId: item.testId || `${code.toLowerCase()}-${codePart.toLowerCase()}`,
              apiCodes: Array.isArray(item.apiCodes) ? item.apiCodes : [],
            };
          })
          : [],
        acceptanceCriteria: Array.isArray(screen.acceptanceCriteria)
          ? screen.acceptanceCriteria.map((item, index) => {
            const codePart = item.code || `AC-${String(index + 1).padStart(2, "0")}`;
            return {
              ...item,
              code: codePart,
              testId: item.testId || `${code.toLowerCase()}-${codePart.toLowerCase()}`,
            };
          })
          : [],
      };
    }),
    generatedAt: typeof record.generatedAt === "string" ? record.generatedAt : fallback.generatedAt,
    llmModel: typeof record.llmModel === "string" ? record.llmModel : fallback.llmModel,
    usedFallback: false,
  };
}

export function buildAnalysisPrompt(input: { title?: string; sources: SourceMaterial[] }): string {
  const sourceText = input.sources.map((source, index) => [
    `## Source ${index + 1}: ${source.title}`,
    `type: ${source.type}`,
    source.body,
  ].join("\n")).join("\n\n");

  return [
    "COS Blueprint 분석을 수행해 JSON 객체 하나만 출력하라.",
    "목표: 내부/외부 기획 자료에서 DB 스키마 목차, API 인터페이스 정의, 표준 기획서, 공통 레이아웃 정의, 화면별 화면정의서를 산출한다.",
    "화면정의서는 직관적이고 명료해야 하며, 화면 1개는 ScreenDefinition 1개다.",
    "공통 레이아웃은 layouts에 먼저 정의하고, screens는 layoutCode와 layoutSlot만 참조한다.",
    "각 screen에는 code, name, description, layoutCode, layoutSlot, route, primaryTestId, schemas, apis, fields, actions, acceptanceCriteria가 필요하다.",
    "액션은 ACT-01 형식 code와 화면코드에서 파생된 testId를 사용한다. 예: cos-scr-001-act-01.",
    "인수조건은 AC-01 형식 code와 화면코드에서 파생된 testId를 사용한다. 예: cos-scr-001-ac-01.",
    "화면 이동 액션은 targetScreenCode에 대상 화면 코드를 넣는다.",
    "API는 code, method, path, summary, input, output, schemas를 포함한다.",
    "스키마는 code, name, description, fields를 포함한다.",
    "출력 JSON shape: { projectTitle, summary, assumptions, standardPlan, schemas, apis, layouts, screens }",
    `프로젝트 제목 힌트: ${input.title || "(자료에서 추론)"}`,
    "",
    sourceText,
  ].join("\n");
}

function list(values: string[]): string {
  return values.length ? values.map((value) => `- ${value}`).join("\n") : "- (없음)";
}

function table(headers: string[], rows: string[][]): string {
  return [
    `| ${headers.join(" |")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell).replace(/\n/g, "<br>")).join(" | ")} |`),
  ].join("\n");
}

export function renderStandardPlan(analysis: BlueprintAnalysis): string {
  return [
    `# 표준 기획서 - ${analysis.projectTitle}`,
    "",
    `생성일: ${analysis.generatedAt}`,
    analysis.llmModel ? `모델: ${analysis.llmModel}${analysis.usedFallback ? " (fallback)" : ""}` : null,
    "",
    "## 1. 요약",
    "",
    analysis.summary,
    "",
    "## 2. 전제",
    "",
    list(analysis.assumptions),
    "",
    "## 3. 진행 단계",
    "",
    analysis.standardPlan.map((step, index) => `${index + 1}. ${step}`).join("\n"),
  ].filter((line): line is string => line !== null).join("\n");
}

export function renderInterfaceDefinition(analysis: BlueprintAnalysis): string {
  return [
    `# DB 스키마/API 인터페이스 정의 - ${analysis.projectTitle}`,
    "",
    "## 스키마 목차",
    "",
    table(
      ["코드", "이름", "설명", "필드"],
      analysis.schemas.map((schema) => [
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
      analysis.apis.map((api) => [
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

export function renderLayoutDefinition(analysis: BlueprintAnalysis): string {
  return [
    `# 공통 화면 레이아웃 정의 - ${analysis.projectTitle}`,
    "",
    ...analysis.layouts.flatMap((layout) => [
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

export function renderScreenDefinition(screen: ScreenDefinition, analysis: BlueprintAnalysis): string {
  return [
    `# 화면정의서 - ${screen.code} ${screen.name}`,
    "",
    "## 1. 기본 정보",
    "",
    table(
      ["항목", "내용"],
      [
        ["프로젝트", analysis.projectTitle],
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

export function renderProjectDocuments(analysis: BlueprintAnalysis): Record<string, string> {
  const docs: Record<string, string> = {
    "docs/cos-blueprint/standard-plan.md": renderStandardPlan(analysis),
    "docs/cos-blueprint/interface-definition.md": renderInterfaceDefinition(analysis),
    "docs/cos-blueprint/layout-definition.md": renderLayoutDefinition(analysis),
    "docs/cos-blueprint/screen-definition-writing-rules.md": renderWritingRules(),
  };

  for (const screen of analysis.screens) {
    const slug = sanitizeCodePart(screen.name);
    docs[`docs/cos-blueprint/screens/${screen.code.toLowerCase()}-${slug}.md`] = renderScreenDefinition(screen, analysis);
  }

  return docs;
}

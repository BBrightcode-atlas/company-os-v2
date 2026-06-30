export type SectionKind = "fields" | "table";

export interface ColumnDef {
  key: string;
  label: string;
}

export interface SectionSchema {
  id: string;
  no: number;
  title: string;
  kind: SectionKind;
  columns: ColumnDef[];
}

export interface ScreenSpecModel {
  _id: string;
  basic: Record<string, string>;
  tables: Record<string, Array<Record<string, string>>>;
}

export interface ScreenSpecDoc {
  screens: ScreenSpecModel[];
}

export const SCREEN_SPEC_SCHEMA: readonly SectionSchema[] = [
  {
    id: "basic",
    no: 1,
    title: "화면 기본 정보",
    kind: "fields",
    columns: [
      { key: "screenCode", label: "화면 코드" },
      { key: "screenName", label: "화면명" },
      { key: "description", label: "화면 설명" },
      { key: "domainMenu", label: "도메인/메뉴" },
      { key: "route", label: "URL/Route" },
      { key: "permission", label: "권한" },
      { key: "states", label: "주요 상태" },
      { key: "priorPlan", label: "선행 기획서" },
      { key: "priorSchemaApi", label: "선행 스키마/API 정의서" },
      { key: "sources", label: "근거 자료" },
    ],
  },
  {
    id: "composition",
    no: 2,
    title: "화면 구성",
    kind: "table",
    columns: [
      { key: "areaCode", label: "영역 코드" },
      { key: "areaName", label: "영역명" },
      { key: "desc", label: "설명" },
      { key: "condition", label: "표시 조건" },
      { key: "testId", label: "테스트 ID" },
    ],
  },
  {
    id: "fields",
    no: 3,
    title: "필드",
    kind: "table",
    columns: [
      { key: "fieldCode", label: "필드 코드" },
      { key: "label", label: "라벨" },
      { key: "dataKey", label: "데이터 키" },
      { key: "type", label: "타입" },
      { key: "required", label: "필수" },
      { key: "rule", label: "표시/입력 규칙" },
      { key: "schema", label: "연결 스키마" },
      { key: "testId", label: "테스트 ID" },
    ],
  },
  {
    id: "actions",
    no: 4,
    title: "액션",
    kind: "table",
    columns: [
      { key: "actionCode", label: "액션 코드" },
      { key: "actionName", label: "액션명" },
      { key: "trigger", label: "트리거" },
      { key: "handling", label: "처리 내용" },
      { key: "api", label: "사용 API" },
      { key: "onSuccess", label: "성공 결과" },
      { key: "onFailure", label: "실패 결과" },
      { key: "nextScreen", label: "이동 대상 화면" },
      { key: "testId", label: "테스트 ID" },
    ],
  },
  {
    id: "apis",
    no: 5,
    title: "사용 API",
    kind: "table",
    columns: [
      { key: "apiCode", label: "API 코드" },
      { key: "method", label: "Method" },
      { key: "endpoint", label: "Endpoint" },
      { key: "actions", label: "연결 액션" },
      { key: "request", label: "요청" },
      { key: "response", label: "응답" },
    ],
  },
  {
    id: "acceptance",
    no: 6,
    title: "검수 조건",
    kind: "table",
    columns: [
      { key: "acCode", label: "검수 코드" },
      { key: "actions", label: "연결 액션" },
      { key: "condition", label: "조건" },
      { key: "verify", label: "확인 방법" },
    ],
  },
  {
    id: "undecided",
    no: 7,
    title: "미확정",
    kind: "table",
    columns: [
      { key: "item", label: "항목" },
      { key: "detail", label: "내용" },
      { key: "decision", label: "필요한 결정" },
    ],
  },
  {
    id: "docReflect",
    no: 8,
    title: "프로젝트 문서 반영",
    kind: "table",
    columns: [
      { key: "targetDoc", label: "대상 문서" },
      { key: "method", label: "반영 방식" },
      { key: "status", label: "상태" },
    ],
  },
];

const BASIC_SECTION = SCREEN_SPEC_SCHEMA.find((s) => s.id === "basic") as SectionSchema;
const TABLE_SECTIONS = SCREEN_SPEC_SCHEMA.filter((s) => s.kind === "table");

const genId = (): string => {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return "r-" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
};

const asString = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

const safeJson = (s: string): unknown => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const extractJson = (text: string): string => {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  return start >= 0 && end > start ? body.slice(start, end + 1) : body;
};

const NEXTSCREEN_NONE = /^(?:-+|—+|–+|n\/?a|none|없음|미정|해당\s*없음|tbd|x)$/i;
const cleanCell = (key: string, v: string): string =>
  key === "nextScreen" && NEXTSCREEN_NONE.test(v.trim()) ? "" : v;

const normalizeRow = (section: SectionSchema, raw: unknown): Record<string, string> => {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    _id: asString(obj._id) || genId(),
    ...Object.fromEntries(section.columns.map((c) => [c.key, cleanCell(c.key, asString(obj[c.key]))])),
  };
};

const normalizeScreen = (raw: unknown): ScreenSpecModel => {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const basicRaw = obj.basic && typeof obj.basic === "object" ? (obj.basic as Record<string, unknown>) : {};
  const tablesRaw = obj.tables && typeof obj.tables === "object" ? (obj.tables as Record<string, unknown>) : {};
  return {
    _id: asString(obj._id) || genId(),
    basic: Object.fromEntries(BASIC_SECTION.columns.map((c) => [c.key, asString(basicRaw[c.key])])),
    tables: Object.fromEntries(
      TABLE_SECTIONS.map((s) => {
        const rows = Array.isArray(tablesRaw[s.id]) ? (tablesRaw[s.id] as unknown[]) : [];
        return [s.id, rows.map((r) => normalizeRow(s, r))];
      }),
    ),
  };
};

export const normalizeScreenDoc = (raw: unknown): ScreenSpecDoc => {
  const parsed = typeof raw === "string" ? safeJson(raw) : raw;
  const obj = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  const screens = Array.isArray(obj.screens) ? obj.screens : [];
  return { screens: screens.map(normalizeScreen) };
};

export const validateScreenModelSection = (sectionText: string): string[] => {
  const parsed = safeJson(extractJson(sectionText));
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return ["화면 정의서 모델 JSON 을 파싱하지 못했습니다."];
  }
  if (!Array.isArray((parsed as Record<string, unknown>).screens)) {
    return ["화면 정의서 모델에 screens 배열이 없습니다."];
  }
  return [];
};

export const fromLlmJson = (sectionText: string): ScreenSpecDoc =>
  normalizeScreenDoc(extractJson(sectionText));

const stripIds = (doc: ScreenSpecDoc): unknown => ({
  screens: doc.screens.map((s) => ({
    basic: s.basic,
    tables: Object.fromEntries(
      Object.entries(s.tables).map(([id, rows]) => [
        id,
        rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== "_id"))),
      ]),
    ),
  })),
});

export const toLlmJson = (doc: ScreenSpecDoc): string => JSON.stringify(stripIds(doc), null, 2);

const escapeCell = (v: string): string => v.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>").trim();

const renderFields = (section: SectionSchema, basic: Record<string, string>): string =>
  [
    "| 항목 | 내용 |",
    "|---|---|",
    ...section.columns.map((c) => `| ${c.label} | ${escapeCell(basic[c.key] ?? "")} |`),
  ].join("\n");

const renderTable = (section: SectionSchema, rows: Array<Record<string, string>>): string =>
  [
    `| ${section.columns.map((c) => c.label).join(" | ")} |`,
    `|${section.columns.map(() => "---").join("|")}|`,
    ...rows.map((r) => `| ${section.columns.map((c) => escapeCell(r[c.key] ?? "")).join(" | ")} |`),
  ].join("\n");

export const renderScreen = (screen: ScreenSpecModel, index: number): string => {
  const name = (screen.basic.screenName ?? "").trim() || `화면 ${index + 1}`;
  const sections = SCREEN_SPEC_SCHEMA.map((s) => {
    const block =
      s.kind === "fields" ? renderFields(s, screen.basic) : renderTable(s, screen.tables[s.id] ?? []);
    return `## ${s.no}. ${s.title}\n\n${block}`;
  });
  return [`# 화면 정의서: ${name}`, ...sections].join("\n\n");
};

export const renderScreenDoc = (doc: ScreenSpecDoc): string =>
  doc.screens.map(renderScreen).join("\n\n---\n\n");

export const screenCodeOf = (s: ScreenSpecModel, index: number): string =>
  (s.basic.screenCode || "").trim() || `SCR-${String(index + 1).padStart(3, "0")}`;
export const screenNameOf = (s: ScreenSpecModel, index: number): string =>
  (s.basic.screenName || "").trim() || `화면 ${index + 1}`;

export const screenCoverageKeys = (screen: ScreenSpecModel): string[] => {
  const keys: string[] = [];
  const pick = (rows: Array<Record<string, string>> | undefined, codeKey: string): void => {
    for (const r of rows ?? []) {
      const k = (r.testId || r[codeKey] || "").trim();
      if (k) keys.push(k);
    }
  };
  pick(screen.tables.composition, "areaCode");
  pick(screen.tables.fields, "fieldCode");
  pick(screen.tables.actions, "actionCode");
  return Array.from(new Set(keys));
};

export const renderScreenMap = (doc: ScreenSpecDoc): string =>
  doc.screens
    .map((s, i) => {
      const code = screenCodeOf(s, i);
      const name = screenNameOf(s, i);
      const nexts = Array.from(
        new Set((s.tables.actions ?? []).map((a) => (a.nextScreen || "").trim()).filter(Boolean)),
      );
      return `- ${code} ${name}${nexts.length ? ` → ${nexts.join(", ")}` : ""}`;
    })
    .join("\n");

const normTestId = (s: string): string =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export const canonicalizeScreen = (screen: ScreenSpecModel, index: number): ScreenSpecModel => {
  const code = screenCodeOf(screen, index);
  const fill = (rows: Array<Record<string, string>> | undefined, sectionId: string, codeKey: string): Array<Record<string, string>> =>
    (rows ?? []).map((r, i) => ({
      ...r,
      testId: normTestId(r.testId || "") || normTestId(r[codeKey] || "") || suggestTestId(code, sectionId, i),
    }));
  return {
    ...screen,
    tables: {
      ...screen.tables,
      composition: fill(screen.tables.composition, "composition", "areaCode"),
      fields: fill(screen.tables.fields, "fields", "fieldCode"),
      actions: fill(screen.tables.actions, "actions", "actionCode"),
    },
  };
};

export const contentScore = (doc: ScreenSpecDoc): number =>
  doc.screens.reduce(
    (sum, s) =>
      sum +
      Object.values(s.basic).filter((v) => v.trim().length > 0).length +
      Object.values(s.tables).reduce(
        (t, rows) =>
          t +
          rows.reduce(
            (r, row) => r + Object.entries(row).filter(([k, v]) => k !== "_id" && v.trim().length > 0).length,
            0,
          ),
        0,
      ),
    0,
  );

export const hasContent = (doc: ScreenSpecDoc): boolean => contentScore(doc) > 0;

export const schemaForPrompt = (): string =>
  SCREEN_SPEC_SCHEMA.map((s) => {
    const cols = s.columns.map((c) => `${c.key}(${c.label})`).join(", ");
    const shape = s.kind === "fields" ? "객체(키:값)" : "행 객체 배열";
    return `- ${s.id} = §${s.no} ${s.title} [${shape}]: ${cols}`;
  }).join("\n");

const SECTION_ABBR: Record<string, string> = {
  composition: "sec",
  fields: "fld",
  actions: "act",
  apis: "api",
  acceptance: "ac",
  undecided: "tbd",
  docReflect: "doc",
};

export const suggestTestId = (screenCode: string, sectionId: string, index: number): string => {
  const base =
    (screenCode ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "scr";
  const abbr = SECTION_ABBR[sectionId] ?? sectionId;
  return `${base}-${abbr}-${String(index + 1).padStart(2, "0")}`;
};

const aliasKey = (k: string): string => k.toLowerCase().replace(/[^a-z0-9]/g, "");

const BASIC_ALIASES: Record<string, string[]> = {
  screenCode: ["code", "id", "screenid"],
  screenName: ["name", "title"],
  description: ["desc", "summary"],
  domainMenu: ["domain", "menu"],
  route: ["path", "url", "uri"],
  permission: ["role", "auth", "permissions"],
  states: ["state"],
  priorPlan: ["plan"],
  priorSchemaApi: ["schemaapi", "apidef", "apidefinition"],
  sources: ["source", "refs", "references"],
};

const COLUMN_ALIASES: Record<string, string[]> = {
  fieldCode: ["code", "id"],
  actionCode: ["code", "id"],
  areaCode: ["code", "id"],
  apiCode: ["code", "id"],
  acCode: ["code", "id"],
  label: ["name", "title"],
  actionName: ["name", "title", "action"],
  areaName: ["name", "title", "area"],
  dataKey: ["key", "field", "name"],
  type: ["datatype"],
  required: ["mandatory", "req"],
  rule: ["validation", "rules", "constraint"],
  schema: ["schemaref"],
  trigger: ["event", "on"],
  handling: ["handle", "behavior", "processing", "desc", "description", "action"],
  api: ["apis", "usedapi"],
  onSuccess: ["success"],
  onFailure: ["failure", "onerror", "error"],
  nextScreen: ["next", "goto", "navigateto", "target", "targetscreen"],
  method: ["httpmethod", "verb"],
  endpoint: ["url", "path"],
  request: ["req", "body", "params"],
  response: ["res", "returns", "result"],
  condition: ["cond", "criteria"],
  verify: ["verification", "check", "how"],
  item: ["name", "title"],
  detail: ["details", "desc", "description", "content"],
  decision: ["needed", "required", "todo"],
  targetDoc: ["doc", "document", "file", "path"],
  status: ["state"],
  testId: ["test", "testcaseid", "testcase"],
};

const pickAlias = (obj: Record<string, unknown>, key: string, aliases: string[]): unknown => {
  const map = new Map(Object.keys(obj).map((k) => [aliasKey(k), k]));
  for (const a of [key, ...aliases]) {
    const real = map.get(aliasKey(a));
    if (real !== undefined) return obj[real];
  }
  return undefined;
};

const coerceCell = (v: unknown, isRequired: boolean): string => {
  if (isRequired) {
    if (v === true) return "Y";
    if (v === false) return "N";
    const s = asString(v).trim();
    if (/^(y|yes|true|필수|required|o)$/i.test(s)) return "Y";
    if (/^(n|no|false|선택|optional|x)$/i.test(s)) return "N";
    return s;
  }
  return asString(v);
};

export const coerceLooseDoc = (raw: unknown): ScreenSpecDoc => {
  const parsed = typeof raw === "string" ? safeJson(extractJson(raw)) : raw;
  const root = parsed as Record<string, unknown> | unknown[] | null;
  const screensRaw: unknown[] = Array.isArray((root as Record<string, unknown>)?.screens)
    ? ((root as Record<string, unknown>).screens as unknown[])
    : Array.isArray(root)
      ? (root as unknown[])
      : root && typeof root === "object"
        ? [root]
        : [];
  const screens = screensRaw.map((s) => {
    const obj = s && typeof s === "object" ? (s as Record<string, unknown>) : {};
    const nested = obj.basic && typeof obj.basic === "object" ? (obj.basic as Record<string, unknown>) : {};
    const basicSrc = { ...obj, ...nested };
    const tablesObj = obj.tables && typeof obj.tables === "object" ? (obj.tables as Record<string, unknown>) : {};
    const basic = Object.fromEntries(
      BASIC_SECTION.columns.map((c) => [c.key, asString(pickAlias(basicSrc, c.key, BASIC_ALIASES[c.key] ?? []))]),
    );
    const tables = Object.fromEntries(
      TABLE_SECTIONS.map((sec) => {
        const rowsRaw = Array.isArray(tablesObj[sec.id])
          ? (tablesObj[sec.id] as unknown[])
          : Array.isArray(obj[sec.id])
            ? (obj[sec.id] as unknown[])
            : [];
        const rows = rowsRaw.map((r) => {
          const row = r && typeof r === "object" ? (r as Record<string, unknown>) : {};
          return Object.fromEntries(
            sec.columns.map((c) => [c.key, coerceCell(pickAlias(row, c.key, COLUMN_ALIASES[c.key] ?? []), c.key === "required")]),
          );
        });
        return [sec.id, rows];
      }),
    );
    return { basic, tables };
  });
  return normalizeScreenDoc({ screens });
};

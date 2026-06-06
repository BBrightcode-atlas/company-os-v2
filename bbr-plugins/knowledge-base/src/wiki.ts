// 지식베이스(LLM Wiki) 플러그인 전역 계약: DB namespace, 테이블, 데이터/액션/스트림 키, 타입.
// worker / ui / lib 가 모두 이 파일을 기준으로 통신한다.
//
// karpathy "LLM Wiki" 패턴: raw sources → LLM 이 유지하는 wiki(페이지/링크) → schema(유지 규칙=skill).
// RAG 아님 — 소스를 읽어 기존 위키에 점진 통합(엔티티/개념 페이지 갱신, 모순 플래그). 누적·복리.

// manifest.id = "paperclip-plugin-knowledge-base", namespaceSlug = "wiki"
// derivePluginDatabaseNamespace = plugin_${slug}_${sha256(id).slice(0,10)}
// = plugin_wiki_de619b9165  (node crypto 로 검증됨)
export const DB_NAMESPACE = "plugin_wiki_de619b9165";
export const T_PAGES = `${DB_NAMESPACE}.pages`;
export const T_LINKS = `${DB_NAMESPACE}.links`;
export const T_SOURCES = `${DB_NAMESPACE}.sources`;

export const PLUGIN_ID = "paperclip-plugin-knowledge-base";
export const sessionTaskKey = (suffix: string) => `plugin:${PLUGIN_ID}:session:${suffix}`;

// === UI ↔ worker bridge keys ===
export const DATA = {
  listPages: "listPages",
  getPage: "getPage",
  getGraph: "getGraph",
  listSources: "listSources",
  getSource: "getSource",
  listTags: "listTags",
  stats: "stats",
  getSchema: "getSchema",
} as const;

export const ACTION = {
  createPage: "createPage",
  updatePage: "updatePage",
  deletePage: "deletePage",
  addSource: "addSource",
  ingestSource: "ingestSource", // LLM: raw 소스를 위키에 통합
  applyIngest: "applyIngest", // 검토된 제안 적용
  rejectIngest: "rejectIngest", // 제안 폐기(pending 복귀)
  deleteSource: "deleteSource",
  ask: "ask", // LLM: 위키 기반 질문 답변(+제안 편집)
  saveAnswer: "saveAnswer", // ask 답변을 위키 페이지로 환원(복리)
  suggestLinks: "suggestLinks", // LLM: 페이지에 추가할 [[링크]] 제안
  setSchema: "setSchema", // maintainer skill md 갱신 + reconcile
} as const;

// 자동유지 시스템 페이지(사용자/그래프/카운트에서 제외, 진입점으로만 노출).
export const SLUG_INDEX = "index";
export const SLUG_LOG = "log";
export const SYSTEM_SLUGS = [SLUG_INDEX, SLUG_LOG];
export const isSystemSlug = (slug: string) => SYSTEM_SLUGS.includes(slug);

// stream channel: 소스 ingest 진행 로그 (per source)
export const ingestChannel = (sourceId: string) => `ingest:${sourceId}`;

// === 페이지 ===
// kind: 위키 페이지 분류. LLM/사용자가 지정.
//  note=일반, entity=인물/조직/제품 등 개체, concept=개념/주제,
//  overview=상위 개요, synthesis=종합/결론, moc=Map of Content(허브)
export type PageKind = "note" | "entity" | "concept" | "overview" | "synthesis" | "moc" | "source";
export const PAGE_KINDS: PageKind[] = ["note", "entity", "concept", "overview", "synthesis", "moc", "source"];
export const pageKindLabel = (k: PageKind | string | null | undefined): string =>
  ({ note: "노트", entity: "개체", concept: "개념", overview: "개요", synthesis: "종합", moc: "허브", source: "소스" } as Record<string, string>)[
    (k as string) || "note"
  ] ?? "노트";
// 사용자가 폼에서 고를 수 있는 kind(자동생성 전용 제외).
export const USER_PAGE_KINDS: PageKind[] = ["note", "entity", "concept", "overview", "synthesis", "moc"];

export type PageAuthor = "user" | "agent" | "system";

export interface WikiPage {
  id: string;
  companyId: string;
  slug: string; // 회사 내 unique (소문자/하이픈)
  title: string;
  kind: PageKind;
  body: string; // markdown ([[wikilink]] 포함)
  tags: string[];
  author: PageAuthor;
  sourceCount: number;
  createdAt: string;
  updatedAt: string;
}

// 링크(엣지). source page → target slug([[...]]), 미해결이면 targetPageId=null.
export interface WikiLink {
  id: string;
  companyId: string;
  sourcePageId: string;
  targetSlug: string;
  targetPageId: string | null;
}

// getPage 응답: 페이지 + 백링크(나를 가리킴) + 아웃바운드(내가 가리킴) + 미해결.
export interface PageDetail {
  page: WikiPage;
  backlinks: Array<{ id: string; slug: string; title: string }>;
  outbound: Array<{ slug: string; title: string | null; resolved: boolean }>;
}

// 그래프 데이터.
export interface GraphNode {
  id: string; // page id
  slug: string;
  title: string;
  kind: PageKind;
  degree: number; // 연결 수(in+out)
}
export interface GraphEdge {
  source: string; // page id
  target: string; // page id
}
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// === 소스(raw 계층) ===
export type SourceStatus = "pending" | "integrating" | "review" | "integrated" | "error";
export interface WikiSource {
  id: string;
  companyId: string;
  title: string;
  url: string | null;
  rawMd: string;
  status: SourceStatus;
  summary: string | null; // 통합 요약(LLM)
  errorMessage: string | null;
  ingestLog: IngestLogEntry[]; // 통합 시 무엇을 만들/고쳤는지
  proposed: ProposedPlan | null; // 검토 모드: 적용 대기 중인 제안(status=review)
  integratedAt: string | null;
  createdAt: string;
}
export interface IngestLogEntry {
  op: "create" | "update";
  slug: string;
  title: string;
  note?: string; // 모순/주의 메모
}
// 검토 모드에서 LLM 이 제안한 통합 계획(적용 전).
export interface ProposedPlan {
  summary: string;
  pages: Array<{ op: "create" | "update"; slug: string; title: string; kind: PageKind; body: string; note?: string }>;
}

// === ingest/ask 입력 ===
export interface CreatePageInput {
  slug?: string; // 없으면 title 로 slugify
  title: string;
  kind?: PageKind;
  body?: string;
  tags?: string[];
  author?: PageAuthor;
}
export interface AddSourceInput {
  title: string;
  url?: string | null;
  rawMd: string;
}

// ask 결과
export interface AskResult {
  answer: string; // markdown
  usedSlugs: string[]; // 근거 페이지
  suggestedEdits: Array<{ slug: string; title: string; rationale: string }>;
}

// === slug 유틸 (worker/ui/llm 공통 규칙) ===
// 한글 보존 + 공백→하이픈 + 위험문자 제거. 빈 결과면 "page".
export function slugify(input: string): string {
  const s = (input || "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/\[\[|\]\]/g, "")
    .replace(/[/\\#?%*:|"<>().]/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s || "page";
}

// 본문에서 [[target]] / [[target|label]] 추출 → target slug 목록.
export function extractWikiTargets(body: string): string[] {
  const out: string[] = [];
  const re = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body || "")) !== null) {
    const t = slugify(m[1]);
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

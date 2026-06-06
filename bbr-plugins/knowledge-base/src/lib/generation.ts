// LLM 프롬프트 빌더 + 응답 파서. worker 가 vibeproxy(callLlmJson)로 호출.
// 모든 LLM 출력은 JSON 객체 하나. body 는 markdown 문자열로 JSON 안에 담는다.

import type { AskResult, PageKind, WikiPage, WikiSource } from "../wiki.js";
import { PAGE_KINDS, slugify } from "../wiki.js";

// ── 공통: 응답에서 JSON 객체 추출(코드펜스/서론 방어) ──────────────────────
export function parseJsonObject(raw: string): Record<string, unknown> {
  let s = (raw || "").trim();
  // ```json ... ``` 펜스 제거
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("LLM 응답에서 JSON 객체를 찾지 못했습니다.");
  const slice = s.slice(start, end + 1);
  return JSON.parse(slice) as Record<string, unknown>;
}

const asStr = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const normKind = (v: unknown): PageKind => {
  const k = asStr(v).trim() as PageKind;
  return PAGE_KINDS.includes(k) ? k : "note";
};

function pageDigest(p: Pick<WikiPage, "slug" | "title" | "kind" | "tags" | "body">, maxBody = 1600): string {
  const body = p.body.length > maxBody ? p.body.slice(0, maxBody) + "\n…(생략)" : p.body;
  const tags = p.tags?.length ? ` [tags: ${p.tags.join(", ")}]` : "";
  return `### [[${p.slug}]] — ${p.title} (${p.kind})${tags}\n${body}`;
}

// ── 1. ingest: raw 소스를 위키에 통합 ───────────────────────────────────────
export interface IngestPlan {
  summary: string;
  pages: Array<{ op: "create" | "update"; slug: string; title: string; kind: PageKind; body: string; note?: string }>;
}

export function buildIngestPrompt(source: WikiSource, candidates: WikiPage[]): string {
  const existing = candidates.length
    ? candidates.map((p) => pageDigest(p)).join("\n\n")
    : "(아직 관련 페이지 없음)";
  return [
    "# 새 소스를 위키에 통합",
    "",
    "아래 raw 소스를 읽고, 핵심 지식을 추출해 **기존 위키 페이지에 통합**하라.",
    "단순 요약/색인이 아니라, 엔티티·개념 페이지를 만들거나 갱신하고, 서로 [[링크]]로 연결하라.",
    "기존 내용과 모순되면 해당 페이지 본문에 명시하고 note 에도 적어라.",
    "한 소스가 여러 페이지에 기여할 수 있다. 페이지는 초점을 좁게(개체 1개/개념 1개) 유지하라.",
    "",
    "## 소스",
    `제목: ${source.title}`,
    source.url ? `출처: ${source.url}` : "",
    "내용:",
    "```",
    source.rawMd.slice(0, 24000),
    "```",
    "",
    "## 관련 기존 페이지(있으면 갱신 대상)",
    existing,
    "",
    "## 출력(JSON 한 객체만)",
    "{",
    '  "summary": "이 소스가 위키에 기여한 바 1~2문장",',
    '  "pages": [',
    '    { "op": "create" | "update", "slug": "kebab-소문자(한글 가능)", "title": "...", "kind": "note|entity|concept|overview|synthesis|moc", "body": "전체 markdown 본문([[링크]] 적극)", "note": "모순/병합 메모(선택)" }',
    "  ]",
    "}",
    "- op=update 면 body 는 기존 내용을 보존·병합한 **새 전체 본문**(부분 패치 아님).",
    "- 기존 slug 를 그대로 쓰면 갱신, 새 slug 면 생성.",
    "- 본문 안에서 다른 페이지는 [[slug]] 또는 [[slug|표시명]]으로 링크.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function parseIngestPlan(raw: string): IngestPlan {
  const o = parseJsonObject(raw);
  const pages = asArr(o.pages)
    .map((p) => {
      const r = p as Record<string, unknown>;
      const title = asStr(r.title).trim();
      const slug = slugify(asStr(r.slug) || title);
      if (!title || !slug) return null;
      const op: "create" | "update" = asStr(r.op) === "update" ? "update" : "create";
      return { op, slug, title, kind: normKind(r.kind), body: asStr(r.body), note: asStr(r.note) || undefined };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
  return { summary: asStr(o.summary).trim(), pages };
}

// ── 2. ask: 위키 기반 질문 답변 ─────────────────────────────────────────────
// pass A: 인덱스 카탈로그에서 질문 관련 페이지 slug 선택(drill-in 대상).
export function buildSelectPrompt(question: string, indexCatalog: string): string {
  return [
    "# 인덱스에서 관련 페이지 고르기",
    "",
    "아래는 위키 전체 인덱스(페이지 목록+요약)다. 질문에 답하려면 어떤 페이지를 펼쳐 읽어야 하는지 slug 만 골라라.",
    "넉넉히 고르되(최대 12개) 무관한 건 제외. 인덱스가 비어있으면 빈 배열.",
    "",
    "## 질문",
    question,
    "",
    "## 인덱스",
    indexCatalog || "(비어 있음)",
    "",
    '## 출력(JSON 한 객체만): { "slugs": ["..."] }',
  ].join("\n");
}
export function parseSelectSlugs(raw: string): string[] {
  const o = parseJsonObject(raw);
  return asArr(o.slugs).map((s) => slugify(asStr(s))).filter(Boolean);
}

export function buildAskPrompt(question: string, candidates: WikiPage[]): string {
  const ctx = candidates.length
    ? candidates.map((p) => pageDigest(p, 2400)).join("\n\n")
    : "(관련 페이지 없음 — 위키에 아직 정보가 부족하다고 답하라)";
  return [
    "# 위키 기반 질문 답변",
    "",
    "아래 위키 페이지들만 근거로 질문에 답하라. 추측 금지, 근거 페이지를 [[slug]]로 인용하라.",
    "비교·목록·수치는 markdown 표나 불릿으로 구조화하면 좋다. 위키에 정보가 부족하면 그렇다고 말하고, 어떤 페이지를 만들/보강하면 좋은지 suggestedEdits 에 제안하라.",
    "",
    "## 질문",
    question,
    "",
    "## 위키 페이지",
    ctx,
    "",
    "## 출력(JSON 한 객체만)",
    "{",
    '  "answer": "markdown 답변([[slug]] 인용 포함)",',
    '  "usedSlugs": ["근거로 쓴 페이지 slug"],',
    '  "suggestedEdits": [{ "slug": "...", "title": "...", "rationale": "왜 만들/보강해야 하는지" }]',
    "}",
  ].join("\n");
}

export function parseAskResult(raw: string): AskResult {
  const o = parseJsonObject(raw);
  const usedSlugs = asArr(o.usedSlugs).map((s) => slugify(asStr(s))).filter(Boolean);
  const suggestedEdits = asArr(o.suggestedEdits)
    .map((e) => {
      const r = e as Record<string, unknown>;
      const title = asStr(r.title).trim();
      const slug = slugify(asStr(r.slug) || title);
      if (!slug) return null;
      return { slug, title: title || slug, rationale: asStr(r.rationale) };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
  return { answer: asStr(o.answer).trim() || "(답변 없음)", usedSlugs, suggestedEdits };
}

// ── 4. maintain: 위키 점검(lint) ───────────────────────────────────────────
export function buildMaintainPrompt(indexCatalog: string, structural: string): string {
  return [
    "# 위키 점검(lint)",
    "",
    "아래 위키 인덱스(전체 페이지+요약)와 구조 지표를 보고 **유지보수가 필요한 문제**를 찾아라.",
    "유형: duplicate(같은 개체/개념이 중복 페이지로 분산), contradiction(상충 서술), missing(있어야 할 허브/개요 페이지 누락), stale(오래되어 갱신 필요), split(한 페이지에 너무 많은 주제 → 분할).",
    "각 문제는 관련 slug 와 구체적 조치(병합/분할/생성/수정)를 제시. 문제 없으면 빈 배열. 최대 12건.",
    "",
    "## 구조 지표",
    structural,
    "",
    "## 인덱스",
    indexCatalog || "(비어 있음)",
    "",
    "## 출력(JSON 한 객체만)",
    "{",
    '  "findings": [',
    '    { "type": "duplicate|contradiction|missing|stale|split", "severity": "high|medium|low", "title": "한 줄 요약", "detail": "설명", "pages": ["slug"], "suggestion": "구체 조치" }',
    "  ]",
    "}",
  ].join("\n");
}
export function parseMaintainFindings(raw: string): import("../wiki.js").MaintainFinding[] {
  const o = parseJsonObject(raw);
  const TYPES = ["duplicate", "contradiction", "missing", "stale", "split"];
  const SEV = ["high", "medium", "low"];
  return asArr(o.findings)
    .map((f) => {
      const r = f as Record<string, unknown>;
      const type = TYPES.includes(asStr(r.type)) ? asStr(r.type) : "missing";
      const severity = SEV.includes(asStr(r.severity)) ? asStr(r.severity) : "low";
      const title = asStr(r.title).trim();
      if (!title) return null;
      const pages = asArr(r.pages).map((s) => slugify(asStr(s))).filter(Boolean);
      return { type, severity, title, detail: asStr(r.detail), pages, suggestion: asStr(r.suggestion) };
    })
    .filter((x): x is NonNullable<typeof x> => x != null) as import("../wiki.js").MaintainFinding[];
}


export interface LinkSuggestion {
  slug: string;
  title: string;
  reason: string;
}
export function buildSuggestLinksPrompt(page: WikiPage, others: WikiPage[]): string {
  const list = others.map((p) => `- [[${p.slug}]] ${p.title} (${p.kind})`).join("\n") || "(다른 페이지 없음)";
  return [
    "# 링크 제안",
    "",
    `아래 "현재 페이지" 본문에서 자연스럽게 [[링크]]로 연결하면 좋은 다른 위키 페이지를 골라라.`,
    "이미 본문에 [[...]]로 링크된 것은 제외. 실제로 관련 있는 것만.",
    "",
    "## 현재 페이지",
    `[[${page.slug}]] — ${page.title}`,
    page.body.slice(0, 4000),
    "",
    "## 다른 페이지 목록",
    list,
    "",
    "## 출력(JSON 한 객체만)",
    '{ "suggestions": [{ "slug": "...", "title": "...", "reason": "연결 근거 한 줄" }] }',
  ].join("\n");
}
export function parseSuggestLinks(raw: string): LinkSuggestion[] {
  const o = parseJsonObject(raw);
  return asArr(o.suggestions)
    .map((s) => {
      const r = s as Record<string, unknown>;
      const slug = slugify(asStr(r.slug) || asStr(r.title));
      if (!slug) return null;
      return { slug, title: asStr(r.title) || slug, reason: asStr(r.reason) };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
}

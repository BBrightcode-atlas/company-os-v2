// analyzer 프롬프트 빌더 + 응답 JSON 파서.
// 순수 함수만. 외부 의존성 없음. analyzer 에이전트가 반환하는 AnalysisResult 를
// 안전하게 검증/보정해 worker 가 신뢰하고 쓸 수 있게 한다.

import type {
  QuoteInput,
  AnalysisResult,
  StandardItem,
  DiscountItem,
  PricingSummary,
  RiskItem,
  ResearchItem,
  ScopeBlock,
  CaseItem,
  ReferenceDoc,
} from "../contract.js";
import { STANDARD_BASELINE_MD } from "./standard-baseline.js";

// 첨부 참고자료(요구사항 문서)를 프롬프트용 텍스트로 직렬화한다.
// 총량 예산(budget)을 두어 프롬프트 폭주를 막는다(초과분은 절단 표기).
function formatReferenceDocs(docs: ReferenceDoc[] | undefined, budget = 120_000): string {
  if (!docs || docs.length === 0) return "(첨부 자료 없음)";
  const parts: string[] = [];
  let used = 0;
  for (let i = 0; i < docs.length; i++) {
    const d = docs[i]!;
    const head = `### 첨부 ${i + 1}: ${d.filename}`;
    let body = (d.text ?? "").trim();
    if (used + body.length > budget) {
      body = body.slice(0, Math.max(0, budget - used));
      if (body.length > 0) parts.push(`${head}\n${indentBlock(body)}\n(…이하 생략: 길이 제한)`);
      parts.push(`(첨부 ${docs.length - i - 1}건 추가 생략: 길이 제한)`);
      break;
    }
    used += body.length;
    parts.push(`${head}\n${indentBlock(body)}`);
  }
  return parts.join("\n\n");
}

// 참고 단가표 한 행 (worker 가 reference_rates 테이블에서 조회해 넘겨줌)
export interface RateRow {
  category: string;
  standardPrice: number;
  note: string | null;
}

// ============================================================
// 1. buildAnalyzerPrompt — analyzer 에이전트에 보낼 입력 프롬프트
// ============================================================

/**
 * analyzer 에이전트에 보낼 프롬프트를 만든다.
 *
 * 산정 지침/세부 규칙은 에이전트의 AGENTS.md 에 이미 정의돼 있으므로,
 * 여기서는 (1) 견적 요청 입력 데이터 전달 + (2) 참고 단가표 제시 +
 * (3) "AnalysisResult JSON 한 덩어리로만 출력" 출력형식 재확인에 집중한다.
 */
export function buildAnalyzerPrompt(
  input: QuoteInput,
  rates: RateRow[],
  baselineMd: string = STANDARD_BASELINE_MD,
  pastQuotesMd: string = "(내부 과거 견적 사례 없음 — cases[] 는 빈 배열로 둘 것)",
  marketRefsMd: string = "(외부 시세 참고 자료 없음 — research[] 는 빈 배열로 둘 것)",
): string {
  const vatMode = input.vatMode ?? "별도";
  const webResearch = input.enableWebResearch ? "사용 (외부 시세/사례 리서치 수행)" : "미사용";

  // 입력값 정규화: 빈 문자열/누락은 "(미입력)" 으로 표기해 모호함 제거
  const fmt = (v: string | null | undefined): string => {
    const t = (v ?? "").trim();
    return t.length > 0 ? t : "(미입력)";
  };
  const fmtNum = (v: number | null | undefined): string =>
    typeof v === "number" && Number.isFinite(v) ? `${v.toLocaleString("ko-KR")}원` : "(미입력)";

  // 참고 단가표를 표 형태 텍스트로 직렬화
  const rateLines =
    rates.length > 0
      ? rates
          .map((r) => {
            const price = Number.isFinite(r.standardPrice)
              ? `${Number(r.standardPrice).toLocaleString("ko-KR")}원`
              : "(미정)";
            const note = (r.note ?? "").trim();
            return `- ${r.category}: ${price}${note ? ` — ${note}` : ""}`;
          })
          .join("\n")
      : "(참고 단가표 없음)";

  return [
    "# 견적 산정 요청",
    "",
    "아래 견적 요청을 분석해 구조화된 산정 결과를 만들어라.",
    "산정 방법·할인 규칙·리스크 평가 기준 등 세부 지침은 너의 AGENTS.md 를 따른다.",
    "",
    "## 입력 데이터",
    `- 고객사: ${fmt(input.clientName)}`,
    `- 고객 요구사항(스토리보드/요건):\n${indentBlock(fmt(input.requirements))}`,
    `- 업무 내용:\n${indentBlock(fmt(input.workScope))}`,
    `- 예상 가격(앵커, 참고용 — 끼워맞추기 금지): ${fmtNum(input.expectedPrice)}`,
    `- 대상 플랫폼: ${fmt(input.platform)}`,
    `- VAT 모드: ${vatMode}`,
    `- 웹 리서치: ${webResearch}`,
    "",
    "## 첨부 자료 (고객 제공 요구사항 문서)",
    "고객이 업로드한 요구사항 문서(스토리보드/요건/기획서 등)의 추출 텍스트다. 산정 근거(evidence)·범위(scope)에 적극 반영하라.",
    formatReferenceDocs(input.referenceDocs),
    "",
    "## 단가 산정 기준표 (회사 표준 기준선)",
    baselineMd,
    "",
    "## 내부 과거 견적 사례 (cases[] 의 유일한 근거 · 실데이터)",
    "우리 회사의 실제 과거 견적이다. cases[] 는 여기서 유사한 것만 quoteId 와 함께 인용한다. 유사한 게 없으면 빈 배열.",
    pastQuotesMd,
    "",
    "## 외부 시세 참고 자료 (research[] 의 유일한 근거 · 위시켓 등 실수집)",
    "실제 수집한 외부 프로젝트/시세다. research[] 는 여기 있는 항목만 url 을 원문 그대로 인용한다. 없으면 빈 배열. url 을 지어내지 마라.",
    marketRefsMd,
    "",
    "## 참고 단가표 (보조 단가)",
    rateLines,
    "",
    "## 출력 형식 (필수 준수)",
    "- 반드시 contract 의 `AnalysisResult` 형태의 **JSON 한 덩어리로만** 출력한다.",
    "- JSON 외의 설명 문장, 머리말, 맺음말, 추가 텍스트를 절대 붙이지 않는다.",
    "- 코드펜스를 쓸 경우 ```json 펜스 한 개 안에만 JSON 을 넣는다.",
    "- 필수 키: summary, standardItems, discounts, pricing, risks, research, scope, cases.",
    `- pricing.vatMode 는 "${vatMode}" 로 설정한다.`,
    "- 숫자 필드(standardPrice / adjust / standardSupply / proposedSupply / vat / total / amount)는 단위 없는 순수 숫자(원)로 출력한다.",
  ].join("\n");
}

// 여러 줄 텍스트를 2칸 들여쓰기 (프롬프트 가독성용)
function indentBlock(text: string): string {
  return text
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
}

// ============================================================
// 1b. buildReplyPrompt — 사용자 댓글 의도 판단(보완 vs 답변) + 결과 생성
// ============================================================

/**
 * 기존 분석 결과 + 사용자 댓글을 받아, LLM 이 **댓글 의도를 스스로 판단**하게 한다.
 * - 견적을 바꾸라는 요청이면 action="revise" + 수정된 analysis 를 출력.
 * - 단순 질문/의견/잡담이면 action="reply" + 한국어 답변 message 만 출력.
 *
 * (체크박스 없이 댓글만으로 보완/대화가 자연스럽게 갈리도록.)
 */
export function buildReplyPrompt(
  input: QuoteInput,
  current: AnalysisResult,
  instruction: string,
  rates: RateRow[],
  baselineMd: string = STANDARD_BASELINE_MD,
): string {
  const vatMode = input.vatMode ?? "별도";
  const fmt = (v: string | null | undefined): string => {
    const t = (v ?? "").trim();
    return t.length > 0 ? t : "(미입력)";
  };
  const rateLines =
    rates.length > 0
      ? rates
          .map((r) => {
            const price = Number.isFinite(r.standardPrice)
              ? `${Number(r.standardPrice).toLocaleString("ko-KR")}원`
              : "(미정)";
            const note = (r.note ?? "").trim();
            return `- ${r.category}: ${price}${note ? ` — ${note}` : ""}`;
          })
          .join("\n")
      : "(참고 단가표 없음)";

  return [
    "# 견적 댓글 처리",
    "",
    "아래는 (1) 원래 견적 요청, (2) 현재 확정된 산정 결과 JSON, (3) 사용자가 남긴 댓글이다.",
    "**먼저 댓글의 의도를 판단**하라. 댓글이 견적 내용/금액/범위/항목을 바꾸라는 요청이면 견적을 수정하고,",
    "단순 질문·의견·확인·잡담이면 견적을 건드리지 말고 짧게 답하라.",
    "",
    "## 출력 형식 (둘 중 하나, JSON 한 덩어리로만)",
    "- 수정 요청일 때:",
    '  { "action": "revise", "message": "무엇을 어떻게 바꿨는지 한국어 1~2문장", "analysis": { …수정된 AnalysisResult… } }',
    "- 질문/의견/잡담일 때:",
    '  { "action": "reply", "message": "한국어로 1~3문장 답변" }',
    "",
    "## 수정(revise) 규칙",
    "- 댓글이 명시적으로 바꾸라고 한 부분만 수정한다. 무관한 항목/문구/금액/리스크는 그대로 유지한다.",
    "- 금액이 바뀌면 pricing 정합성 재계산: proposedSupply = standardSupply + 할인 adjust 합계, vatMode 기준 vat/total 재계산.",
    "- 항목 추가/삭제 시 standardItems 의 no 를 1부터 다시 매긴다.",
    "- analysis 는 contract 의 AnalysisResult 스키마와 정확히 일치. 숫자는 단위 없는 정수(원).",
    `- pricing.vatMode 는 "${vatMode}" 로 유지.`,
    "- 산정 원칙(목표금액 끼워맞추기 금지, 표준가 먼저·할인 분리)은 AGENTS.md 를 따른다.",
    "",
    "## (1) 원래 견적 요청",
    `- 고객사: ${fmt(input.clientName)}`,
    `- 고객 요구사항:\n${indentBlock(fmt(input.requirements))}`,
    `- 업무 내용:\n${indentBlock(fmt(input.workScope))}`,
    `- 대상 플랫폼: ${fmt(input.platform)}`,
    `- VAT 모드: ${vatMode}`,
    "",
    "## 첨부 자료 (고객 제공 요구사항 문서)",
    formatReferenceDocs(input.referenceDocs),
    "",
    "## 단가 산정 기준표 (회사 표준 기준선)",
    baselineMd,
    "",
    "## 참고 단가표 (보조 단가)",
    rateLines,
    "",
    "## (2) 현재 산정 결과 JSON",
    JSON.stringify(current),
    "",
    "## (3) 사용자 댓글",
    indentBlock(fmt(instruction)),
    "",
    "출력은 위 두 형식 중 하나의 JSON 객체 하나뿐. 설명·머리말·꼬리말·코드펜스 금지.",
  ].join("\n");
}

/** buildReplyPrompt 응답 파싱 결과. */
export type ReplyDecision =
  | { action: "revise"; message: string; analysis: AnalysisResult }
  | { action: "reply"; message: string };

/**
 * buildReplyPrompt 의 응답을 파싱한다. action 으로 분기:
 * - "revise": 중첩된 analysis 를 parseAnalysis 로 검증해 반환.
 * - "reply": message 만 반환.
 * action 이 없거나 잘못되면, analysis 키가 있으면 revise 로, 없으면 reply 로 관대하게 보정한다.
 */
export function parseReplyDecision(raw: string): ReplyDecision {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new Error("parseReplyDecision: 응답이 비어 있습니다.");
  }
  const jsonText = extractJson(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`parseReplyDecision: JSON 파싱 실패 — ${msg}`);
  }
  if (!isObject(parsed)) {
    throw new Error("parseReplyDecision: 최상위 JSON 이 객체가 아닙니다.");
  }
  const obj = parsed as Record<string, unknown>;
  const message =
    typeof obj.message === "string" && obj.message.trim().length > 0
      ? obj.message.trim()
      : "";

  const wantsRevise = obj.action === "revise" || (obj.action == null && isObject(obj.analysis));
  if (wantsRevise) {
    if (!isObject(obj.analysis)) {
      throw new Error("parseReplyDecision: action='revise' 인데 'analysis' 객체가 없습니다.");
    }
    const analysis = parseAnalysis(JSON.stringify(obj.analysis));
    return { action: "revise", message: message || "견적을 보완했습니다.", analysis };
  }
  return { action: "reply", message: message || "확인했습니다." };
}

// ============================================================
// 2. parseAnalysis — 에이전트 응답 → 검증된 AnalysisResult
// ============================================================

/**
 * analyzer 응답 텍스트에서 JSON 을 추출/파싱하고 AnalysisResult 형태로 검증한다.
 * - 코드펜스(```json ... ```) 제거, 안 되면 첫 `{` ~ 마지막 `}` 슬라이스 폴백
 * - 필수 필드 존재/타입 검증, 숫자 필드는 Number 강제 변환
 * - pricing.vat / pricing.total 누락·0 이면 proposedSupply + vatMode 기준 재계산
 * - 문제가 있으면 어떤 필드가 잘못됐는지 명시한 Error throw
 */
export function parseAnalysis(raw: string): AnalysisResult {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new Error("parseAnalysis: 응답이 비어 있습니다(raw 가 빈 문자열).");
  }

  const jsonText = extractJson(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`parseAnalysis: JSON 파싱 실패 — ${msg}`);
  }

  if (!isObject(parsed)) {
    throw new Error("parseAnalysis: 최상위 JSON 이 객체가 아닙니다.");
  }
  const obj = parsed as Record<string, unknown>;

  // --- summary ---
  if (typeof obj.summary !== "string" || obj.summary.trim().length === 0) {
    throw new Error("parseAnalysis: 'summary' 필드가 없거나 비어 있는 문자열입니다.");
  }
  const summary = obj.summary;

  // --- groupTitle / period (선택, 견적서 그리드용. 없으면 null → 템플릿이 fallback) ---
  const groupTitle = optionalString(obj.groupTitle, "groupTitle");
  const period = optionalString(obj.period, "period");

  // --- standardItems ---
  const standardItems = parseStandardItems(obj.standardItems);
  // --- discounts ---
  const discounts = parseDiscounts(obj.discounts);
  // --- risks ---
  const risks = parseRisks(obj.risks);
  // --- research ---
  const research = parseResearch(obj.research);
  // --- scope ---
  const scope = parseScope(obj.scope);
  // --- cases ---
  const cases = parseCases(obj.cases);
  // --- pricing (standardItems 합 + discounts 합으로 결정론적 계산) ---
  const pricing = parsePricing(obj.pricing, standardItems, discounts);

  return {
    summary,
    groupTitle,
    period,
    standardItems,
    discounts,
    pricing,
    risks,
    research,
    scope,
    cases,
  };
}

// ------------------------------------------------------------
// JSON 추출
// ------------------------------------------------------------

// 코드펜스 제거 후, 안 되면 첫 { ~ 마지막 } 슬라이스로 폴백
function extractJson(raw: string): string {
  let text = raw.trim();

  // 1) ```json ... ``` 또는 ``` ... ``` 펜스 안의 본문 추출
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1].trim().length > 0) {
    text = fenceMatch[1].trim();
  } else {
    // 펜스가 없으면, 잔여 백틱만 제거
    text = text.replace(/```(?:json)?/gi, "").trim();
  }

  // 2) 첫 { ~ 마지막 } 슬라이스 폴백 (앞뒤 잡설 제거)
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("parseAnalysis: 응답에서 JSON 객체({ ... })를 찾지 못했습니다.");
  }
  return text.slice(start, end + 1);
}

// ------------------------------------------------------------
// 타입/숫자 검증 헬퍼
// ------------------------------------------------------------

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// 숫자 강제 변환. 문자열 숫자("12,000" / "12000")도 허용. 실패 시 Error.
function toNumber(v: unknown, field: string): number {
  if (typeof v === "number") {
    if (!Number.isFinite(v)) {
      throw new Error(`parseAnalysis: '${field}' 가 유효한 숫자가 아닙니다(${v}).`);
    }
    return v;
  }
  if (typeof v === "string") {
    // 통화 기호·콤마·'원'·공백 제거 후 변환
    const cleaned = v.replace(/[,\s원₩]/g, "");
    if (cleaned.length === 0) {
      throw new Error(`parseAnalysis: '${field}' 가 빈 문자열입니다.`);
    }
    const n = Number(cleaned);
    if (!Number.isFinite(n)) {
      throw new Error(`parseAnalysis: '${field}' 를 숫자로 변환할 수 없습니다("${v}").`);
    }
    return n;
  }
  throw new Error(`parseAnalysis: '${field}' 가 숫자(또는 숫자 문자열)가 아닙니다(type=${typeof v}).`);
}


function requireString(v: unknown, field: string): string {
  if (typeof v !== "string") {
    throw new Error(`parseAnalysis: '${field}' 가 문자열이 아닙니다(type=${typeof v}).`);
  }
  return v;
}

// nullable 문자열: string | null | undefined → string | null
function optionalString(v: unknown, field: string): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") {
    throw new Error(`parseAnalysis: '${field}' 가 문자열 또는 null 이 아닙니다(type=${typeof v}).`);
  }
  return v;
}

function requireArray(v: unknown, field: string): unknown[] {
  if (!Array.isArray(v)) {
    throw new Error(`parseAnalysis: '${field}' 가 배열이 아닙니다(type=${typeof v}).`);
  }
  return v;
}

// string[] 검증 (각 원소 문자열 강제)
function requireStringArray(v: unknown, field: string): string[] {
  const arr = requireArray(v, field);
  return arr.map((el, i) => {
    if (typeof el !== "string") {
      throw new Error(`parseAnalysis: '${field}[${i}]' 가 문자열이 아닙니다(type=${typeof el}).`);
    }
    return el;
  });
}

// ------------------------------------------------------------
// 섹션별 파서
// ------------------------------------------------------------

function parseStandardItems(v: unknown): StandardItem[] {
  const arr = requireArray(v, "standardItems");
  return arr.map((el, i) => {
    if (!isObject(el)) {
      throw new Error(`parseAnalysis: 'standardItems[${i}]' 가 객체가 아닙니다.`);
    }
    return {
      no: toNumber(el.no, `standardItems[${i}].no`),
      category: requireString(el.category, `standardItems[${i}].category`),
      item: requireString(el.item, `standardItems[${i}].item`),
      scopeBasis: requireString(el.scopeBasis, `standardItems[${i}].scopeBasis`),
      evidence: requireString(el.evidence, `standardItems[${i}].evidence`),
      standardPrice: toNumber(el.standardPrice, `standardItems[${i}].standardPrice`),
    };
  });
}

function parseDiscounts(v: unknown): DiscountItem[] {
  const arr = requireArray(v, "discounts");
  return arr.map((el, i) => {
    if (!isObject(el)) {
      throw new Error(`parseAnalysis: 'discounts[${i}]' 가 객체가 아닙니다.`);
    }
    return {
      type: requireString(el.type, `discounts[${i}].type`),
      desc: requireString(el.desc, `discounts[${i}].desc`),
      adjust: toNumber(el.adjust, `discounts[${i}].adjust`),
    };
  });
}

function parseRisks(v: unknown): RiskItem[] {
  const arr = requireArray(v, "risks");
  const allowed: RiskItem["level"][] = ["high", "med", "low"];
  return arr.map((el, i) => {
    if (!isObject(el)) {
      throw new Error(`parseAnalysis: 'risks[${i}]' 가 객체가 아닙니다.`);
    }
    const level = requireString(el.level, `risks[${i}].level`) as RiskItem["level"];
    if (!allowed.includes(level)) {
      throw new Error(
        `parseAnalysis: 'risks[${i}].level' 값이 ${JSON.stringify(allowed)} 중 하나가 아닙니다("${level}").`,
      );
    }
    return {
      level,
      title: requireString(el.title, `risks[${i}].title`),
      detail: requireString(el.detail, `risks[${i}].detail`),
      mitigation: requireString(el.mitigation, `risks[${i}].mitigation`),
    };
  });
}

function parseResearch(v: unknown): ResearchItem[] {
  const arr = requireArray(v, "research");
  return arr.map((el, i) => {
    if (!isObject(el)) {
      throw new Error(`parseAnalysis: 'research[${i}]' 가 객체가 아닙니다.`);
    }
    return {
      source: requireString(el.source, `research[${i}].source`),
      url: optionalString(el.url, `research[${i}].url`),
      insight: requireString(el.insight, `research[${i}].insight`),
      priceRange: optionalString(el.priceRange, `research[${i}].priceRange`),
    };
  });
}

function parseScope(v: unknown): ScopeBlock {
  if (!isObject(v)) {
    throw new Error("parseAnalysis: 'scope' 가 객체가 아닙니다.");
  }
  return {
    included: requireStringArray(v.included, "scope.included"),
    excluded: requireStringArray(v.excluded, "scope.excluded"),
    assumptions: requireStringArray(v.assumptions, "scope.assumptions"),
    externalCosts: requireStringArray(v.externalCosts, "scope.externalCosts"),
  };
}

function parseCases(v: unknown): CaseItem[] {
  const arr = requireArray(v, "cases");
  return arr.map((el, i) => {
    if (!isObject(el)) {
      throw new Error(`parseAnalysis: 'cases[${i}]' 가 객체가 아닙니다.`);
    }
    return {
      quoteId: optionalString(el.quoteId, `cases[${i}].quoteId`),
      client: requireString(el.client, `cases[${i}].client`),
      amount: toNumber(el.amount, `cases[${i}].amount`),
      similarity: requireString(el.similarity, `cases[${i}].similarity`),
    };
  });
}

function parsePricing(
  v: unknown,
  standardItems: StandardItem[],
  discounts: DiscountItem[],
): PricingSummary {
  if (!isObject(v)) {
    throw new Error("parseAnalysis: 'pricing' 가 객체가 아닙니다.");
  }

  // vatMode 검증 (기본 '별도'). 항목 단가는 공급가(VAT 별도) 기준이므로
  // vatMode 는 표기 라벨일 뿐, 산식은 동일하게 공급가 기준으로 계산한다.
  let vatMode: PricingSummary["vatMode"];
  if (v.vatMode === undefined || v.vatMode === null) {
    vatMode = "별도";
  } else if (v.vatMode === "별도" || v.vatMode === "포함") {
    vatMode = v.vatMode;
  } else {
    throw new Error(`parseAnalysis: 'pricing.vatMode' 값이 '별도'|'포함' 이 아닙니다("${String(v.vatMode)}").`);
  }

  // 결정론적 산식 — LLM 이 보고한 standardSupply/proposedSupply/vat/total 은 신뢰하지 않는다.
  // 표준 공급가는 standardItems 합과 정확히 일치해야 하고(표준가 부풀리기 방지),
  // 제안 공급가는 거기에 할인 합(음수)을 더해 산출한다(산술 오류 방지).
  const standardSupply = standardItems.reduce(
    (sum, it) => sum + (Number.isFinite(it.standardPrice) ? it.standardPrice : 0),
    0,
  );
  const discountSum = discounts.reduce(
    (sum, d) => sum + (Number.isFinite(d.adjust) ? d.adjust : 0),
    0,
  );
  const proposedSupply = Math.max(0, standardSupply + discountSum);

  // 공급가 기준 VAT 10% 산출(별도/포함 동일 산식, 라벨만 다름)
  const vat = Math.round(proposedSupply * 0.1);
  const total = proposedSupply + vat;

  const contractTerms = optionalString(v.contractTerms, "pricing.contractTerms");

  return {
    standardSupply,
    proposedSupply,
    vat,
    total,
    vatMode,
    contractTerms,
  };
}

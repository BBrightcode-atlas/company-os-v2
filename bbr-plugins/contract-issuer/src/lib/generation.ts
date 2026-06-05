// 계약 생성 프롬프트 빌더 + 응답 JSON 파서. 순수 함수. 외부 의존 없음.

import type { ContractData, ContractInput } from "../contract.js";
import { contractTypeLabel } from "../contract.js";

// ============================================================
// 1. buildGeneratePrompt — 계약 데이터 생성 프롬프트
// ============================================================

function fmt(v: string | null | undefined): string {
  const t = (v ?? "").trim();
  return t.length > 0 ? t : "(미입력)";
}
function fmtNum(v: number | null | undefined): string {
  return typeof v === "number" && Number.isFinite(v) && v > 0
    ? `${v.toLocaleString("ko-KR")}원`
    : "(미입력)";
}
function indentBlock(text: string): string {
  return text
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
}

const DATA_SCHEMA_HINT = `{
  "gabCompany": "갑 회사명",
  "gabCeo": "갑 대표자명(없으면 \\"\\")",
  "gabBizNo": "갑 사업자등록번호(없으면 \\"\\")",
  "gabAddress": "갑 주소(없으면 \\"\\")",
  "projectName": "프로젝트/서비스명",
  "scopeItems": ["도급업무 범위 항목 3~5개"],
  "periodStart": "YYYY-MM-DD 또는 \\"\\"",
  "periodEnd": "YYYY-MM-DD 또는 자유문구(예: 완료시까지) 또는 \\"\\"",
  "monthlyAmount": 0,
  "totalAmount": 0,
  "vatMode": "별도",
  "jurisdiction": null,
  "contractDate": "YYYY-MM-DD",
  "summary": "생성 관점 1~2줄"
}`;

export function buildGeneratePrompt(input: ContractInput): string {
  const vatMode = input.vatMode ?? "별도";
  const typeWord = contractTypeLabel(input.contractType); // "개발" | "유지보수"
  const isMaint = input.contractType === "maintenance";
  return [
    `# ${typeWord} 도급계약서 생성 요청`,
    "",
    `아래 입력으로 표준 도급계약서의 빈칸을 채운 ContractData JSON 을 만들어라. (계약 유형: ${typeWord})`,
    "법조항은 고정이므로 만들지 말고, 채울 값만 산출한다. '을'은 항상 (주)비브라이트코드.",
    "",
    "## 입력 데이터",
    `- 계약 유형: ${typeWord}`,
    `- 갑 회사명: ${fmt(input.gabCompany)}`,
    `- 갑 대표자: ${fmt(input.gabCeo)}`,
    `- 갑 사업자등록번호: ${fmt(input.gabBizNo)}`,
    `- 갑 주소: ${fmt(input.gabAddress)}`,
    `- 프로젝트/서비스명: ${fmt(input.projectName)}`,
    `- 프로젝트 설명(자유서술):\n${indentBlock(fmt(input.projectDesc))}`,
    `- 계약기간: ${fmt(input.periodStart)} ~ ${fmt(input.periodEnd)}`,
    `- 월 계약금액: ${fmtNum(input.monthlyAmount)}`,
    `- 총 계약금액: ${fmtNum(input.totalAmount)}`,
    `- VAT 모드: ${vatMode}`,
    `- 관할법원: ${fmt(input.jurisdiction)}`,
    `- 계약일자: ${fmt(input.contractDate)}`,
    "",
    "## 출력 형식 (필수)",
    "- ContractData 형태의 JSON 한 덩어리로만 출력. 설명/머리말/꼬리말/코드펜스 금지.",
    `- pricing 없음. vatMode 는 "${vatMode}" 로 설정.`,
    "- scopeItems 는 projectDesc/projectName 기반 3~5개의 구체 과업 항목.",
    isMaint
      ? "- 유지보수 계약이므로 scopeItems 는 운영·장애대응·버그수정·보안패치·모니터링·경미한 개선 중심으로 작성."
      : "- 개발 계약이므로 scopeItems 는 신규/기능 개발·관리도구 개발·관련 버그수정/성능/보안 중심으로 작성.",
    "- 입력에 있는 값은 그대로, 없는 선택값은 \"\"/0/null.",
    "",
    "### 스키마",
    DATA_SCHEMA_HINT,
  ].join("\n");
}

// ============================================================
// 1b. buildReplyPrompt — 댓글 의도 판단(보완 vs 답변)
// ============================================================

export function buildReplyPrompt(current: ContractData, instruction: string): string {
  return [
    "# 계약서 댓글 처리",
    "",
    "아래는 (1) 현재 계약 데이터 JSON, (2) 사용자가 남긴 댓글이다.",
    "**먼저 댓글 의도를 판단**하라. 계약 내용/금액/기간/과업/갑 정보/관할 등을 바꾸라는 요청이면 수정하고,",
    "단순 질문·의견·확인·잡담이면 계약을 건드리지 말고 짧게 답하라.",
    "",
    "## 출력 형식 (둘 중 하나, JSON 한 덩어리로만)",
    '- 수정 요청: { "action": "revise", "message": "무엇을 바꿨는지 1~2문장", "data": { …수정된 ContractData… } }',
    '- 질문/의견/잡담: { "action": "reply", "message": "한국어 1~3문장 답변" }',
    "",
    "## 수정(revise) 규칙",
    "- 댓글이 명시적으로 바꾸라고 한 부분만 수정. 무관한 필드는 그대로 유지.",
    "- data 는 ContractData 스키마와 정확히 일치. 금액은 단위 없는 정수(원), 날짜는 YYYY-MM-DD.",
    "- '을'은 항상 (주)비브라이트코드(생성기가 채우지 않음).",
    "",
    "## (1) 현재 계약 데이터 JSON",
    JSON.stringify(current),
    "",
    "## (2) 사용자 댓글",
    indentBlock(fmt(instruction)),
    "",
    "출력은 위 두 형식 중 하나의 JSON 객체 하나뿐. 설명·코드펜스 금지.",
  ].join("\n");
}

// ============================================================
// 2. parseContractData
// ============================================================

function extractJson(raw: string): string {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1].trim().length > 0) text = fence[1].trim();
  else text = text.replace(/```(?:json)?/gi, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("parseContractData: 응답에서 JSON 객체를 찾지 못했습니다.");
  }
  return text.slice(start, end + 1);
}
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function asStr(v: unknown): string {
  if (typeof v === "string") return v;
  if (v === null || v === undefined) return "";
  return String(v);
}
function asOptStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = asStr(v).trim();
  return s.length > 0 ? s : null;
}
function asNum(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(/[,\s원₩]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
function asStrArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => asStr(x).trim()).filter((s) => s.length > 0);
}

export function parseContractData(raw: string): ContractData {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new Error("parseContractData: 응답이 비어 있습니다.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`parseContractData: JSON 파싱 실패 — ${msg}`);
  }
  if (!isObject(parsed)) throw new Error("parseContractData: 최상위 JSON 이 객체가 아닙니다.");
  const o = parsed as Record<string, unknown>;

  const vatMode: ContractData["vatMode"] = o.vatMode === "포함" ? "포함" : "별도";
  const gabCompany = asStr(o.gabCompany).trim();
  if (!gabCompany) throw new Error("parseContractData: 'gabCompany'(갑 회사명)가 비어 있습니다.");

  return {
    gabCompany,
    gabCeo: asStr(o.gabCeo),
    gabBizNo: asStr(o.gabBizNo),
    gabAddress: asStr(o.gabAddress),
    projectName: asStr(o.projectName).trim(),
    scopeItems: asStrArray(o.scopeItems),
    periodStart: asStr(o.periodStart).trim(),
    periodEnd: asStr(o.periodEnd).trim(),
    monthlyAmount: asNum(o.monthlyAmount),
    totalAmount: asNum(o.totalAmount),
    vatMode,
    jurisdiction: asOptStr(o.jurisdiction),
    contractDate: asStr(o.contractDate).trim(),
    summary: asStr(o.summary).trim() || "입력값 기준으로 계약서 빈칸을 채웠습니다.",
  };
}

// ============================================================
// 2b. parseReplyDecision
// ============================================================

export type ReplyDecision =
  | { action: "revise"; message: string; data: ContractData }
  | { action: "reply"; message: string };

export function parseReplyDecision(raw: string): ReplyDecision {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new Error("parseReplyDecision: 응답이 비어 있습니다.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`parseReplyDecision: JSON 파싱 실패 — ${msg}`);
  }
  if (!isObject(parsed)) throw new Error("parseReplyDecision: 최상위 JSON 이 객체가 아닙니다.");
  const o = parsed as Record<string, unknown>;
  const message = asStr(o.message).trim();
  const wantsRevise = o.action === "revise" || (o.action == null && isObject(o.data));
  if (wantsRevise) {
    if (!isObject(o.data)) {
      throw new Error("parseReplyDecision: action='revise' 인데 'data' 객체가 없습니다.");
    }
    const data = parseContractData(JSON.stringify(o.data));
    return { action: "revise", message: message || "계약서를 보완했습니다.", data };
  }
  return { action: "reply", message: message || "확인했습니다." };
}

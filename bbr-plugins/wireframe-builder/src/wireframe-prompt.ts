import type { WireframeInput } from "./contract.js";

const LLM_BASE = (process.env.ANTHROPIC_BASE_URL || "http://localhost:8317").replace(/\/+$/, "");
const LLM_KEY = process.env.ANTHROPIC_API_KEY || "no-key-required";
const LLM_MODEL = process.env.SCREEN_DESIGN_MODEL || "claude-opus-4-8";
const MAX_REPAIR_ATTEMPTS = 3;

export function stripControlChars(s: string): string {
  let out = "";
  const str = String(s ?? "");
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c === 9 || c === 10 || c === 13 || c >= 32) out += str[i];
  }
  return out;
}

async function callLlm(system: string, user: string): Promise<string> {
  const res = await fetch(`${LLM_BASE}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": LLM_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: 32000,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`LLM 호출 실패 (${res.status}): ${t.slice(0, 300)}`);
  }
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = (data.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("");
  if (!text.trim()) throw new Error("LLM 응답이 비어 있습니다.");
  return text;
}

const WIREFRAME_SYSTEM = [
  "너는 제품 기획서와 화면설계서를 입력받아, 즉시 조작 가능한 고충실도 와이어프레임을 '단일 HTML 문서' 하나로만 출력하는 순수 함수다. 대화형 에이전트가 아니다.",
  "너에게는 파일시스템·도구·웹·외부 컨텍스트가 전혀 없다. 무엇을 찾거나 읽으려 하지 마라. 필요한 모든 정보는 user 메시지 안에 있다.",
  "",
  "[출력 형식]",
  "- 출력은 완전한 HTML 문서 하나뿐이다. 첫 줄은 <!DOCTYPE html>, 마지막은 </html>.",
  "- 서론·설명·코드펜스·마크다운·도구호출 금지. HTML 외의 텍스트를 절대 쓰지 마라.",
  "",
  "[스택 / 비주얼]",
  '- <head> 안에 <script src="https://cdn.tailwindcss.com"></script> 를 포함하고 Tailwind 유틸리티 클래스로 스타일링하라.',
  "- 고충실도 목업이다. 적절한 색상·여백·라운드·그림자·타이포·아이콘을 써서 실제 출시 앱처럼 보이게 하라. 회색 박스 저충실도 와이어프레임이 아니다.",
  "- 아이콘은 인라인 SVG 또는 이모지로 표현하라. 외부 이미지·폰트·아이콘 CDN 은 쓰지 말고, 이미지가 필요하면 단색 박스 + 레이블 placeholder 로 대체하라.",
  "- 한국어 UI 로 작성하라. 디바이스(모바일/데스크톱)는 화면설계서를 따르고, 미지정 시 중앙 정렬된 단일 컬럼 앱 레이아웃으로 하라.",
  "",
  "[구조 / 동작]",
  '- 화면설계서의 모든 화면을 하나의 HTML 안에 각각 <section data-screen="화면id"> 로 담아라. 초기 화면만 보이고 나머지는 숨겨라.',
  "- 화면 전환·탭·모달·토글·목록 추가/삭제/수정·입력·유효성 검사 등 모든 상호작용을 <body> 끝의 인라인 <script> 로 '실제로 동작'하게 구현하라. 정적인 가짜 화면 금지.",
  "- 화면설계서에 '[버튼] → 어느 화면/무슨 동작' 처럼 적힌 이동·동작 디스크립션을 하나도 빠뜨리지 말고 구현하라.",
  "- 화면설계서에 나온 어떤 UI 든(캘린더·차트·드래그앤드롭·스텝퍼·지도·평점 등) 고정된 위젯 집합에 얽매이지 말고 자유롭게 HTML/CSS/JS 로 표현하라.",
  "- 데이터는 JS 메모리 상태(배열/객체)로 관리하고 추가/삭제/수정이 화면에 즉시 반영되게 하라. 새로고침 시 초기화되어도 무방하다.",
  "",
  "[제약]",
  "- self-contained 단일 파일. Tailwind CDN 외 외부 의존 없음.",
  "- 시연용 와이어프레임이다. 실제 서버·네트워크 호출 대신 클라이언트 상태로 동작을 흉내 내라.",
].join("\n");

function refsBlock(input: WireframeInput): string {
  const refs = (input.referenceDocs ?? [])
    .map((d, i) => `--- 참고자료 ${i + 1} (${d.filename}) ---\n${d.text}`)
    .join("\n\n");
  return refs ? "\n===== 참고자료 =====\n" + refs : "";
}

function buildGenerateUser(input: WireframeInput): string {
  return [
    "아래 개발 기획서와 화면설계서를 읽고, 조작 가능한 고충실도 와이어프레임 HTML 한 개를 생성하라.",
    "화면설계서는 '어느 화면의 어디에 어떤 요소가 있고 각 요소가 무슨 동작/이동을 하는지'를 기술한 네비게이션 명세다. 그 의도를 충실히 구현하라.",
    "",
    "===== 개발 기획서 =====",
    input.specDoc || "(비어 있음)",
    "",
    "===== 화면설계서 =====",
    input.screenDoc || "(비어 있음)",
    refsBlock(input),
    "",
    "(완전한 HTML 문서 하나만 출력. <!DOCTYPE html> 로 시작해서 </html> 로 끝낸다.)",
  ].join("\n");
}

function buildRepairUser(prevHtml: string, issues: string[]): string {
  return [
    "직전 출력이 올바른 HTML 문서가 아니었다. 아래 문제를 고쳐 완전한 HTML 문서 하나를 다시 출력하라.",
    "",
    "===== 문제 =====",
    ...issues.map((i) => `- ${i}`),
    "",
    "===== 직전 출력 앞부분 =====",
    prevHtml.slice(0, 4000),
    "",
    "(<!DOCTYPE html> 로 시작하는 완전한 HTML 하나만. 설명·코드펜스 금지.)",
  ].join("\n");
}

function buildReviseUser(currentHtml: string, instruction: string): string {
  return [
    "아래는 현재 와이어프레임 HTML 과 사용자의 수정 요청이다. 요청을 반영해 전체 HTML 문서를 다시 출력하라.",
    "기존 구조·화면·동작은 최대한 보존하고 요청한 부분만 바꿔라.",
    "",
    "===== 사용자 수정 요청 =====",
    instruction,
    "",
    "===== 현재 HTML =====",
    currentHtml,
    "",
    "(<!DOCTYPE html> 로 시작하는 완전한 HTML 하나만. 설명·코드펜스 금지.)",
  ].join("\n");
}

export function extractHtml(text: string): string {
  let s = stripControlChars(text);
  const fence = s.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fence && /<html[\s>]|<!doctype/i.test(fence[1])) s = fence[1];
  const start = s.search(/<!doctype html|<html[\s>]/i);
  if (start >= 0) s = s.slice(start);
  const end = s.toLowerCase().lastIndexOf("</html>");
  if (end >= 0) s = s.slice(0, end + 7);
  return s.trim();
}

export function validateHtml(html: string): string[] {
  const issues: string[] = [];
  if (!html || html.trim().length < 200) issues.push("HTML 이 비었거나 너무 짧습니다.");
  if (!/<html[\s>]/i.test(html)) issues.push("<html> 루트 태그가 없습니다.");
  if (!/<body[\s>]/i.test(html)) issues.push("<body> 태그가 없습니다.");
  if (!/<\/html>\s*$/i.test(html)) issues.push("문서가 </html> 로 끝나지 않습니다(잘렸을 수 있음).");
  return issues;
}

export async function generateHtml(input: WireframeInput): Promise<string> {
  let user = buildGenerateUser(input);
  let last = "";
  for (let attempt = 0; attempt < MAX_REPAIR_ATTEMPTS; attempt++) {
    const raw = await callLlm(WIREFRAME_SYSTEM, user);
    last = raw;
    const html = extractHtml(raw);
    const issues = validateHtml(html);
    if (issues.length === 0) return html;
    user = buildRepairUser(html, issues);
  }
  throw new Error(`와이어프레임 생성 실패 (repair ${MAX_REPAIR_ATTEMPTS}회 소진). 마지막 출력 일부: ${last.slice(0, 200)}`);
}

export interface ReviseResult {
  html: string;
  summary: string;
}

export async function reviseHtml(currentHtml: string, instruction: string): Promise<ReviseResult> {
  const raw = await callLlm(WIREFRAME_SYSTEM, buildReviseUser(currentHtml, instruction));
  const html = extractHtml(raw);
  const issues = validateHtml(html);
  if (issues.length > 0) throw new Error("수정 결과가 유효한 HTML 이 아닙니다: " + issues.join("; "));
  return { html, summary: "요청을 반영해 와이어프레임을 수정했습니다." };
}

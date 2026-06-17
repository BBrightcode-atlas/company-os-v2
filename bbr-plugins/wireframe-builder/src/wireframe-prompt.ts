import type { WireframeInput } from "./contract.js";

const LLM_BASE = (process.env.ANTHROPIC_BASE_URL || "http://localhost:8317").replace(/\/+$/, "");
const LLM_KEY = process.env.ANTHROPIC_API_KEY || "no-key-required";
const LLM_MODEL = process.env.SCREEN_DESIGN_MODEL || "claude-opus-4-8";
const MAX_REPAIR_ATTEMPTS = 3;

export const stripControlChars = (s: string): string =>
  [...String(s ?? "")].filter((ch) => {
    const c = ch.charCodeAt(0);
    return c === 9 || c === 10 || c === 13 || c >= 32;
  }).join("");

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

const HTML_QUALITY_RULES = [
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

const WIREFRAME_SYSTEM = [
  "너는 제품 기획서와 화면설계서를 입력받아, 즉시 조작 가능한 고충실도 와이어프레임을 '단일 HTML 문서' 하나로만 출력하는 순수 함수다. 대화형 에이전트가 아니다.",
  "너에게는 파일시스템·도구·웹·외부 컨텍스트가 전혀 없다. 무엇을 찾거나 읽으려 하지 마라. 필요한 모든 정보는 user 메시지 안에 있다.",
  "",
  "[출력 형식]",
  "- 출력은 완전한 HTML 문서 하나뿐이다. 첫 줄은 <!DOCTYPE html>, 마지막은 </html>.",
  "- 서론·설명·코드펜스·마크다운·도구호출 금지. HTML 외의 텍스트를 절대 쓰지 마라.",
  "",
  HTML_QUALITY_RULES,
].join("\n");

const REVISE_MARKERS = {
  spec: "===WF_SPEC_DOC===",
  screen: "===WF_SCREEN_DOC===",
  summary: "===WF_SUMMARY===",
  html: "===WF_HTML===",
} as const;

const REVISE_SYSTEM = [
  "너는 기존 와이어프레임 프로젝트(개발 기획서 + 화면설계서 + 와이어프레임 HTML)와 사용자의 수정 요청을 입력받아, 세 문서를 일관되게 갱신해 정해진 멀티섹션 형식으로만 출력하는 순수 함수다. 대화형 에이전트가 아니다.",
  "너에게는 파일시스템·도구·웹·외부 컨텍스트가 전혀 없다. 무엇을 찾거나 읽으려 하지 마라. 필요한 모든 정보는 user 메시지 안에 있다.",
  "",
  "[작업]",
  "- 사용자의 수정 요청을 해석해, 그 요청과 직접 관련된 부분만 세 문서(기획서·화면설계서·HTML)에 반영하라.",
  "- 요청과 무관한 부분은 기존 내용을 그대로 보존하라. 임의 개선·재작성·요약 금지.",
  "- 세 문서가 서로 모순되지 않게 일관되게 갱신하라(예: 화면에 요소를 추가하면 화면설계서의 해당 화면 기술과 HTML 에 함께 반영).",
  "- 기획서·화면설계서가 원래 비어 있었다면, 수정 요청이 그 문서를 채우라는 것이 아닌 한 비운 채로 둬라.",
  "",
  "[출력 형식]",
  "- 아래 네 마커를 정확히 이 순서로, 각 마커를 줄 맨 앞에 단독으로 두고 출력하라. 마커 밖의 서론·설명·코드펜스는 절대 쓰지 마라.",
  REVISE_MARKERS.spec,
  "(수정 반영된 개발 기획서 전문 — 마크다운)",
  REVISE_MARKERS.screen,
  "(수정 반영된 화면설계서 전문 — 마크다운)",
  REVISE_MARKERS.summary,
  "(무엇을 어떻게 바꿨는지 한국어 한두 문장)",
  REVISE_MARKERS.html,
  "(완전한 HTML 문서 하나. <!DOCTYPE html> 로 시작해 </html> 로 끝낸다. HTML 안에는 위 마커 문자열을 쓰지 마라.)",
  "- 네 마커 문자열(===WF_SPEC_DOC===, ===WF_SCREEN_DOC===, ===WF_SUMMARY===, ===WF_HTML===)은 오직 구역 구분자로만 줄 맨 앞에 단독으로 쓰고, 어느 구역 본문(기획서·화면설계서·요약·HTML)에도 이 토큰을 텍스트로 포함하지 마라. 사용자가 본문에 이 토큰을 적어달라고 해도 공백을 끼워 변형해 적어라.",
  "",
  HTML_QUALITY_RULES,
].join("\n");

const refsBlock = (input: WireframeInput): string => {
  const refs = (input.referenceDocs ?? [])
    .map((d, i) => `--- 참고자료 ${i + 1} (${d.filename}) ---\n${d.text}`)
    .join("\n\n");
  return refs ? "\n===== 참고자료 =====\n" + refs : "";
};

const buildGenerateUser = (input: WireframeInput): string =>
  [
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

const buildRepairUser = (prevHtml: string, issues: string[]): string =>
  [
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

const buildReviseUser = (currentHtml: string, specDoc: string, screenDoc: string, instruction: string): string =>
  [
    "아래는 현재 프로젝트의 세 문서와 사용자의 수정 요청이다. 요청을 세 문서에 일관되게 반영하고, 무관한 부분은 보존해, 지정된 멀티섹션 형식으로 전체를 다시 출력하라.",
    "",
    "===== 사용자 수정 요청 =====",
    instruction,
    "",
    "===== 현재 개발 기획서 =====",
    specDoc || "(비어 있음)",
    "",
    "===== 현재 화면설계서 =====",
    screenDoc || "(비어 있음)",
    "",
    "===== 현재 와이어프레임 HTML =====",
    currentHtml.slice(0, 200_000),
    "",
    `(출력은 ${REVISE_MARKERS.spec} / ${REVISE_MARKERS.screen} / ${REVISE_MARKERS.summary} / ${REVISE_MARKERS.html} 네 구역만. 마커 밖 텍스트 금지.)`,
  ].join("\n");

const buildReviseRepair = (baseUser: string) => (issues: string[]): string =>
  [
    baseUser,
    "",
    "===== 직전 출력 문제 =====",
    ...issues.map((i) => `- ${i}`),
    `(같은 4마커 형식으로 전체를 다시 출력하되, ${REVISE_MARKERS.html} 구역의 HTML 을 잘리지 않게 완전히 끝내라.)`,
  ].join("\n");

export const extractHtml = (text: string): string => {
  const unfence = (s: string): string => {
    const fence = s.match(/```(?:html)?\s*([\s\S]*?)```/i);
    return fence && /<html[\s>]|<!doctype/i.test(fence[1]) ? fence[1] : s;
  };
  const fromDoctype = (s: string): string => {
    const start = s.search(/<!doctype html|<html[\s>]/i);
    return start >= 0 ? s.slice(start) : s;
  };
  const toHtmlClose = (s: string): string => {
    const end = s.toLowerCase().lastIndexOf("</html>");
    return end >= 0 ? s.slice(0, end + 7) : s;
  };
  return [stripControlChars, unfence, fromDoctype, toHtmlClose].reduce((s, step) => step(s), text).trim();
};

export const validateHtml = (html: string): string[] => {
  const lower = html.toLowerCase();
  const lastHtmlClose = lower.lastIndexOf("</html>");
  const lastBodyClose = lower.lastIndexOf("</body>");
  const checks: ReadonlyArray<readonly [boolean, string]> = [
    [!html || html.trim().length < 200, "HTML 이 비었거나 너무 짧습니다."],
    [!/<html[\s>]/i.test(html), "<html> 루트 태그가 없습니다."],
    [!/<body[\s>]/i.test(html), "<body> 태그가 없습니다."],
    [!/<\/html>\s*$/i.test(html), "문서가 </html> 로 끝나지 않습니다(잘렸을 수 있음)."],
    [lastHtmlClose >= 0 && (lastBodyClose < 0 || lastBodyClose > lastHtmlClose), "</body> 없이 </html> 로 끝납니다(임베디드 </html> 뒤에서 잘렸을 수 있음)."],
  ];
  return checks.filter(([failed]) => failed).map(([, message]) => message);
};

const findLineMarker = (text: string, marker: string, from = 0): number => {
  const esc = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?:^|\\n)[ \\t]*${esc}[ \\t]*(?=\\r?\\n|$)`, "g");
  re.lastIndex = from;
  const m = re.exec(text);
  return m === null ? -1 : m.index + m[0].indexOf(marker);
};

const sliceBetween = (text: string, startMarker: string, endMarkers: string[]): string | null => {
  const start = findLineMarker(text, startMarker);
  if (start < 0) return null;
  const afterStart = start + startMarker.length;
  const end = endMarkers.reduce((acc, m) => {
    const idx = findLineMarker(text, m, afterStart);
    return idx >= 0 && idx < acc ? idx : acc;
  }, text.length);
  return text.slice(afterStart, end);
};

const cutBeforeHtml = (s: string): string => {
  const i = s.search(/<!doctype html|<html[\s>]/i);
  return i >= 0 ? s.slice(0, i) : s;
};

interface RepairResult {
  raw: string;
  html: string;
}

const callWithRepair = async (
  system: string,
  initialUser: string,
  buildRepair: (issues: string[], prevHtml: string) => string,
  extract: (raw: string) => string,
): Promise<RepairResult> => {
  const attempt = async (n: number, user: string): Promise<RepairResult> => {
    const raw = await callLlm(system, user);
    const html = extract(raw);
    const issues = validateHtml(html);
    if (issues.length === 0) return { raw, html };
    if (n + 1 >= MAX_REPAIR_ATTEMPTS) {
      throw new Error(`유효한 HTML 을 생성하지 못했습니다 (repair ${MAX_REPAIR_ATTEMPTS}회 소진): ${issues.join("; ")}`);
    }
    return attempt(n + 1, buildRepair(issues, html));
  };
  return attempt(0, initialUser);
};

export const generateHtml = async (input: WireframeInput): Promise<string> =>
  (await callWithRepair(
    WIREFRAME_SYSTEM,
    buildGenerateUser(input),
    (issues, prevHtml) => buildRepairUser(prevHtml, issues),
    extractHtml,
  )).html;

export interface ReviseResult {
  html: string;
  specDoc: string;
  screenDoc: string;
  summary: string;
}

const extractRevisedHtml = (raw: string): string =>
  extractHtml(sliceBetween(raw, REVISE_MARKERS.html, []) ?? raw);

export const reviseAll = async (
  currentHtml: string,
  specDoc: string,
  screenDoc: string,
  instruction: string,
): Promise<ReviseResult> => {
  const baseUser = buildReviseUser(currentHtml, specDoc, screenDoc, instruction);
  const { raw, html } = await callWithRepair(REVISE_SYSTEM, baseUser, buildReviseRepair(baseUser), extractRevisedHtml);

  const specRaw = sliceBetween(raw, REVISE_MARKERS.spec, [REVISE_MARKERS.screen, REVISE_MARKERS.summary, REVISE_MARKERS.html]);
  const screenRaw = sliceBetween(raw, REVISE_MARKERS.screen, [REVISE_MARKERS.summary, REVISE_MARKERS.html]);
  const summaryRaw = sliceBetween(raw, REVISE_MARKERS.summary, [REVISE_MARKERS.html]);

  if (specRaw === null && screenRaw === null) {
    throw new Error("수정 결과에 기획서/화면설계서 구역(===WF_SPEC_DOC===/===WF_SCREEN_DOC===)이 없어 3문서 동기화를 보장할 수 없습니다.");
  }

  const cleanSection = (sec: string | null): string =>
    sec === null ? "" : stripControlChars(cutBeforeHtml(sec)).trim();

  return {
    html,
    specDoc: cleanSection(specRaw) || specDoc,
    screenDoc: cleanSection(screenRaw) || screenDoc,
    summary: cleanSection(summaryRaw) || "요청을 반영해 수정했습니다.",
  };
};

import type { ReferenceDoc } from "./contract.js";
import SHELL_HTML from "./shell.html";
import { DAISYUI_CORE_DOCS, DAISYUI_MORE_COMPONENTS } from "./daisyui-skill/index.js";
import { extractJsonObject } from "../shared/json.js";
import {
  canonicalizeScreen,
  coerceLooseDoc,
  contentScore,
  fromLlmJson,
  hasContent,
  renderScreen,
  renderScreenMap,
  schemaForPrompt,
  screenCodeOf,
  screenCoverageKeys,
  screenNameOf,
  toLlmJson,
  validateScreenModelSection,
  type ScreenSpecDoc,
  type ScreenSpecModel,
} from "./screen-spec.js";

const LLM_BASE = (process.env.ANTHROPIC_BASE_URL || "http://localhost:8317").replace(/\/+$/, "");
const LLM_KEY = process.env.ANTHROPIC_API_KEY || "no-key-required";
const LLM_MODEL = process.env.SCREEN_DESIGN_MODEL || "claude-opus-4-8";
const MAX_REPAIR_ATTEMPTS = 3;
const MAX_OUTPUT_TOKENS = 100000;
const MAX_INPUT_CHARS = 200_000;
const MIN_GUARD_CONTENT = 6;
const MAX_CONTENT_LOSS_RATIO = 0.25;

export const stripControlChars = (s: string): string =>
  String(s ?? "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

async function callLlm(system: string, user: string, maxTokens: number = MAX_OUTPUT_TOKENS): Promise<string> {
  const res = await fetch(`${LLM_BASE}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": LLM_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: maxTokens,
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

async function callLlmTool(system: string, user: string, tool: { name: string; description?: string; input_schema?: Record<string, unknown> }, maxTokens = 2000): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${LLM_BASE}/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": LLM_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`LLM 도구 호출 실패 (${res.status}): ${t.slice(0, 200)}`);
  }
  const data = (await res.json()) as { content?: Array<{ type: string; input?: Record<string, unknown> }> };
  const tu = (data.content ?? []).find((b) => b.type === "tool_use");
  return tu?.input ?? null;
}

const HTML_QUALITY_RULES = [
  "[스택 / 비주얼]",
  '- <head> 안에 <script src="https://cdn.tailwindcss.com"></script> 를 포함하고 Tailwind 유틸리티 클래스로 스타일링하라.',
  "- 고충실도 목업이다. 적절한 색상·여백·라운드·그림자·타이포·아이콘을 써서 실제 출시 앱처럼 보이게 하라. 회색 박스 저충실도 와이어프레임이 아니다.",
  "- 아이콘은 인라인 SVG 또는 이모지로 표현하라. 외부 이미지·폰트·아이콘 CDN 은 쓰지 말고, 이미지가 필요하면 단색 박스 + 레이블 placeholder 로 대체하라.",
  "- 한국어 UI 로 작성하라. 디바이스(모바일/데스크톱)는 화면 정의서를 따르고, 미지정 시 중앙 정렬된 단일 컬럼 앱 레이아웃으로 하라.",
  "",
  "[구조 / 동작]",
  '- 화면 정의서의 모든 화면(§1 화면명/화면 코드로 식별)을 하나의 HTML 안에 각각 <section data-screen="화면코드"> 로 담아라. 초기 화면만 보이고 나머지는 숨겨라.',
  "- §2 화면 구성·§3 필드·§4 액션 표를 구현 명세로 삼아라. 특히 §4 액션 표의 트리거·처리 내용·이동 대상 화면을 하나도 빠뜨리지 말고 '실제로 동작'하게 구현하라(화면 전환·탭·모달·토글·목록 추가/삭제/수정·입력·유효성 검사 등). 정적인 가짜 화면 금지.",
  "- 표에 명시된 어떤 UI 든(캘린더·차트·드래그앤드롭·스텝퍼·지도·평점 등) 고정된 위젯 집합에 얽매이지 말고 자유롭게 HTML/CSS/JS 로 표현하라.",
  "- 데이터는 JS 메모리 상태(배열/객체)로 관리하고 추가/삭제/수정이 화면에 즉시 반영되게 하라. 새로고침 시 초기화되어도 무방하다.",
  "",
  "[제약]",
  "- self-contained 단일 파일. Tailwind CDN 외 외부 의존 없음.",
  "- 시연용 와이어프레임이다. 실제 서버·네트워크 호출 대신 클라이언트 상태로 동작을 흉내 내라.",
  "- <script> 안의 JavaScript 는 반드시 문법적으로 유효해야 한다(문법 오류 1개면 스크립트 전체가 죽어 화면 전환·탭·클릭이 전부 작동하지 않는다).",
  "- 특히 템플릿 리터럴(백틱) 안에서 HTML 을 만들 때, 속성값은 큰따옴표(\")로 감싸라. 작은따옴표 문자열 안에 또 작은따옴표를 넣으려고 \\' 처럼 중첩 이스케이프하지 마라(문자열이 조기 종료되어 SyntaxError 가 난다). 예: `<span class=\"badge\">` 처럼 큰따옴표를 쓸 것.",
].join("\n");

const WIREFRAME_SYSTEM = [
  "너는 제품 기획서와 화면 정의서를 입력받아, 즉시 조작 가능한 고충실도 와이어프레임을 '단일 HTML 문서' 하나로만 출력하는 순수 함수다. 대화형 에이전트가 아니다.",
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
  screenModel: "===WF_SCREEN_MODEL===",
  summary: "===WF_SUMMARY===",
  html: "===WF_HTML===",
} as const;

const REVISE_DOCS_SYSTEM = [
  "너는 기존 와이어프레임 프로젝트의 두 문서(개발 기획서 + 화면 정의서)와 사용자의 수정 요청을 입력받아, 두 문서를 일관되게 갱신해 정해진 멀티섹션 형식으로만 출력하는 순수 함수다. 대화형 에이전트가 아니다.",
  "너에게는 파일시스템·도구·웹·외부 컨텍스트가 전혀 없다. 무엇을 찾거나 읽으려 하지 마라. 필요한 모든 정보는 user 메시지 안에 있다.",
  "이 단계에서는 HTML 을 출력하지 않는다. 문서만 갱신한다.",
  "",
  "[작업]",
  "- 사용자의 수정 요청을 해석해, 그 요청과 직접 관련된 부분만 두 문서(기획서·화면 정의서)에 반영하라.",
  "- 요청과 무관한 부분은 기존 내용을 그대로 보존하라(셀·행·문장을 글자 그대로 복사). 임의 개선·재작성·요약 금지.",
  "- 두 문서가 서로 모순되지 않게 일관되게 갱신하라(예: 화면에 요소를 추가하면 화면 정의서의 해당 섹션에 반영하고, 기능 수준 변경이면 기획서에도 반영).",
  "- 기획서가 원래 비어 있었다면, 수정 요청이 그것을 채우라는 것이 아닌 한 비운 채로 둬라.",
  "",
  "[화면 정의서 모델 — 고정 스키마]",
  "- 화면 정의서는 아래 고정 스키마를 따르는 JSON 모델이다. 섹션 키와 컬럼 키를 추가·삭제·이름변경하지 마라. 셀 값만 채우고, 요청상 필요하면 표 섹션에 새 행을 추가하라(코드·테스트 ID 명명 규칙을 기존 행과 일관되게).",
  '- JSON 형태: {"screens":[{"basic":{...},"tables":{"composition":[...],"fields":[...],"actions":[...],"apis":[...],"acceptance":[...],"undecided":[...],"docReflect":[...]}}]}',
  "- 각 섹션의 컬럼 키:",
  schemaForPrompt(),
  "- basic 은 객체(키:값), 나머지 섹션은 행 객체의 배열이다. screens 배열의 모든 화면은 이 8개 섹션을 모두 가진다.",
  "",
  "[출력 형식]",
  "- 아래 세 마커를 정확히 이 순서로, 각 마커를 줄 맨 앞에 단독으로 두고 출력하라. 마커 밖의 서론·설명·코드펜스는 절대 쓰지 마라.",
  REVISE_MARKERS.spec,
  "(수정 반영된 개발 기획서 전문 — 마크다운)",
  REVISE_MARKERS.screenModel,
  "(수정 반영된 화면 정의서 — 위 스키마를 따르는 JSON 한 개. 코드펜스 없이 순수 JSON. 8개 섹션을 모두 포함하라.)",
  REVISE_MARKERS.summary,
  "(무엇을 어떻게 바꿨는지 한국어 한두 문장)",
  "- 세 마커 문자열(===WF_SPEC_DOC===, ===WF_SCREEN_MODEL===, ===WF_SUMMARY===)은 오직 구역 구분자로만 줄 맨 앞에 단독으로 쓰고, 어느 구역 본문에도 이 토큰을 텍스트로 포함하지 마라. HTML 은 절대 출력하지 마라.",
].join("\n");

const REVISE_HTML_SYSTEM = [
  "너는 기존 와이어프레임 HTML 과 사용자의 수정 요청(및 갱신된 화면 정의서)을 입력받아, 그 요청만 반영한 완전한 HTML 문서 하나로만 출력하는 순수 함수다. 대화형 에이전트가 아니다.",
  "너에게는 파일시스템·도구·웹·외부 컨텍스트가 전혀 없다. 무엇을 찾거나 읽으려 하지 마라. 필요한 모든 정보는 user 메시지 안에 있다.",
  "",
  "[반드시 지킬 핵심 규칙]",
  "- MUST DO: 기존 HTML 의 <head>(스타일·테마·스크립트 로더·CDN), <script> 코어(window.App 등), data-theme, 모든 <section data-screen=...> 화면을 그대로 보존한다.",
  "- DO NOT: 새 CSS/JS 스택을 도입하거나(특히 cdn.tailwindcss.com) <head>·App 코어·화면을 교체·삭제하지 마라. → 대신 기존 골격 안에서 수정 요청 부분만 바꾼다.",
  "",
  "[작업]",
  "- 사용자의 수정 요청과 직접 관련된 부분만 수정한다. 무관한 화면·레이아웃·목업·스크립트는 기존 HTML 을 그대로 둔다. 추가/수정 요소도 기존과 동일한 CSS 프레임워크·클래스 체계·동작 패턴을 따른다.",
  "",
  "[출력 형식]",
  "- 출력은 완전한 HTML 문서 하나뿐이다(첫 줄 <!DOCTYPE html>, 마지막 </html>). 서론·설명·코드펜스·마크다운은 출력하지 않는다.",
].join("\n");

export interface GenerateHtmlInput {
  title: string;
  specDoc: string;
  screenDoc: string;
  referenceDocs: ReferenceDoc[];
}

const refsBlock = (input: GenerateHtmlInput): string => {
  const refs = (input.referenceDocs ?? [])
    .map((d, i) => `--- 참고자료 ${i + 1} (${d.filename}) ---\n${d.text}`)
    .join("\n\n");
  if (!refs) return "";
  return [
    "",
    "===== 참고자료(레이아웃 가이드) =====",
    "아래 참고자료는 Figma 등에서 추출한 화면 레이아웃이다. 각 화면의 요소를 들여쓰기 트리로 나열하며, 각 줄에서 WxH 는 크기, @(x,y) 는 좌표, (가로:좌→우) 표시는 그 요소의 자식들이 가로로 배치됨을 뜻한다.",
    "이 자료는 요소의 배치·구성·계층을 잡는 '배치 가이드'로만 쓴다. 화면 정의서(기능)가 정답지이며 충돌 시 화면 정의서를 우선한다 — 참고자료에 없더라도 화면 정의서에 있는 필드·액션·API 는 반드시 구현하고, 참고자료에만 있는 장식 요소는 생략해도 된다.",
    "목록의 줄 순서는 시각적 읽기 순서(위→아래, 같은 행은 왼쪽→오른쪽)다. 그 순서를 그대로 배치 순서로 삼아라(왼쪽 요소를 오른쪽에 두지 마라).",
    "참고자료의 화면과 화면 정의서의 화면은 이름으로 대응시켜라. 화면 정의서에 있는 화면은 참고자료에 없어도 모두 만들어라.",
    refs,
  ].join("\n");
};

const buildGenerateUser = (input: GenerateHtmlInput): string =>
  [
    "아래 개발 기획서와 화면 정의서를 읽고, 조작 가능한 고충실도 와이어프레임 HTML 한 개를 생성하라.",
    "화면 정의서는 화면별 8섹션 표(화면 기본 정보·화면 구성·필드·액션·사용 API·검수 조건·미확정·문서 반영)로 기술된 명세다. 특히 §4 액션 표의 트리거·처리 내용·이동 대상 화면이 네비게이션 명세다. 그 의도를 충실히 구현하라.",
    "",
    "===== 개발 기획서 =====",
    input.specDoc || "(비어 있음)",
    "",
    "===== 화면 정의서 =====",
    input.screenDoc || "(비어 있음)",
    refsBlock(input),
    "",
    "(완전한 HTML 문서 하나만 출력. <!DOCTYPE html> 로 시작해서 </html> 로 끝낸다.)",
  ].join("\n");

const issueLines = (issues: string[]): string[] => issues.map((i) => `- ${i}`);

const buildRepairFromBase = (baseUser: string, tail: string) => (issues: string[]): string =>
  [baseUser, "", "===== 직전 출력 문제 =====", ...issueLines(issues), tail].join("\n");

const buildRepairUser = (prevHtml: string, issues: string[]): string =>
  [
    "직전 출력이 올바른 HTML 문서가 아니었다. 아래 문제를 고쳐 완전한 HTML 문서 하나를 다시 출력하라.",
    "",
    "===== 문제 =====",
    ...issueLines(issues),
    "",
    "===== 직전 출력 앞부분 =====",
    prevHtml.slice(0, 4000),
    "",
    "(<!DOCTYPE html> 로 시작하는 완전한 HTML 하나만. 설명·코드펜스 금지.)",
  ].join("\n");

const buildReviseDocsUser = (specDoc: string, screenModel: ScreenSpecDoc, instruction: string): string =>
  [
    "아래는 현재 프로젝트의 두 문서와 사용자의 수정 요청이다. 요청을 두 문서에 일관되게 반영하고, 무관한 부분은 보존해, 지정된 멀티섹션 형식으로 다시 출력하라. HTML 은 출력하지 마라.",
    "",
    "===== 사용자 수정 요청 =====",
    instruction,
    "",
    "===== 현재 개발 기획서 (마크다운) =====",
    specDoc || "(비어 있음)",
    "",
    "===== 현재 화면 정의서 (JSON 모델) =====",
    toLlmJson(screenModel),
    "",
    `(출력은 ${REVISE_MARKERS.spec} / ${REVISE_MARKERS.screenModel} / ${REVISE_MARKERS.summary} 세 구역만. HTML·다른 마커 금지.)`,
  ].join("\n");

const buildReviseHtmlUser = (currentHtml: string, screenModel: ScreenSpecDoc, instruction: string, summary: string): string =>
  [
    "아래 기존 와이어프레임 HTML 에 사용자의 수정 요청을 반영해 완전한 HTML 문서 하나를 다시 출력하라.",
    "요청과 무관한 부분(다른 화면·레이아웃·목업 데이터·스크립트 로직)은 기존 HTML 을 그대로 보존하라.",
    "",
    "===== 사용자 수정 요청 =====",
    instruction,
    summary ? `\n===== 변경 요약 =====\n${summary}` : "",
    "",
    "===== 갱신된 화면 정의서 (JSON, 참고용) =====",
    toLlmJson(screenModel).slice(0, 40000),
    "",
    "===== 현재 와이어프레임 HTML =====",
    currentHtml.slice(0, MAX_INPUT_CHARS),
    "",
    "(<!DOCTYPE html> 로 시작해 </html> 로 끝나는 완전한 HTML 하나만. 설명·코드펜스 금지.)",
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

export const validateScriptSyntax = (html: string): string[] => {
  const issues: string[] = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1] || "";
    const body = m[2] || "";
    n += 1;
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const type = (attrs.match(/type\s*=\s*["']([^"']+)["']/i) || [])[1]?.toLowerCase();
    if (type && type !== "text/javascript" && type !== "application/javascript") continue;
    if (!body.trim()) continue;
    try {
      new Function(body); // eslint-disable-line no-new-func
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      issues.push(`인라인 <script> #${n} 에 JavaScript 문법 오류가 있어 화면 전환·탭·클릭 등 모든 동작이 작동하지 않습니다(스크립트 전체가 실행되지 않음): ${msg}. 문자열 따옴표 이스케이프를 점검하고(템플릿 리터럴 내 HTML 속성은 큰따옴표 사용) 유효한 JS 로 다시 출력하라.`);
    }
  }
  return issues;
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
  const structural = checks.filter(([failed]) => failed).map(([, message]) => message);
  if (structural.length > 0) return structural;
  return validateScriptSyntax(html);
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

const callWithRepair = async (
  system: string,
  initialUser: string,
  validate: (raw: string) => string[],
  buildRepair: (issues: string[], prevRaw: string) => string,
  opts: { maxTokens?: number } = {},
): Promise<string> => {
  const maxTokens = opts.maxTokens ?? MAX_OUTPUT_TOKENS;
  const attempt = async (n: number, user: string): Promise<string> => {
    const raw = await callLlm(system, user, maxTokens);
    const issues = validate(raw);
    if (issues.length === 0) return raw;
    if (n + 1 >= MAX_REPAIR_ATTEMPTS) {
      throw new Error(`유효한 출력을 생성하지 못했습니다 (repair ${MAX_REPAIR_ATTEMPTS}회 소진): ${issues.join("; ")}`);
    }
    return attempt(n + 1, buildRepair(issues, raw));
  };
  return attempt(0, initialUser);
};

export const generateHtml = async (input: GenerateHtmlInput): Promise<string> => {
  const raw = await callWithRepair(
    WIREFRAME_SYSTEM,
    buildGenerateUser(input),
    (r) => validateHtml(extractHtml(r)),
    (issues, prevRaw) => buildRepairUser(extractHtml(prevRaw), issues),
  );
  return extractHtml(raw);
};

const FRAGMENT_MAX_TOKENS = 16000;
const SHELL_THEME = "corporate";
const SCREENS_MARKER = "<!--SCREENS-->";

const DAISYUI_GUIDE = [
  `[시각 규약 — DaisyUI 5 단일 테마(data-theme="${SHELL_THEME}"). 아래 "DaisyUI 5 공식 컴포넌트 문서"의 클래스·구조·Syntax 예시를 그대로 따른다. 단 다음 3가지는 그 문서보다 이 규칙이 우선한다:]`,
  "1) 색: 테마 변수만 — bg-base-100/200/300, text-base-content(투명도 text-base-content/70 등), primary/secondary/accent/neutral/info/success/warning/error 와 그 -content. 임의 색 유틸(bg-blue-500, text-red-600 등) 금지. 이미지는 외부 URL(picsum 등) 대신 단색 박스 + 레이블 placeholder.",
  "2) 상호작용: 인라인 onclick·showModal() 금지. 동작은 요소의 data-action + <script> 의 App.on('이름', fn), 모달은 App.openModal('id')/App.closeModal('id'), 화면 전환은 data-nav. (스킬 문서의 인라인 JS 예시는 이 방식으로 옮겨라.)",
  "3) 셸: 하단 탭바·뒤로가기 헤더는 공용 셸이 담당한다. dock/btm-nav 등 전역 하단 네비를 직접 만들지 마라.",
  "",
  `[그 외 사용 가능 컴포넌트(필요시 동일 규약으로): ${DAISYUI_MORE_COMPONENTS}. 이 목록·아래 문서에 없는 위젯(차트·지도·드래그앤드롭 등)만 Tailwind 로 커스텀하되 색은 테마 변수.]`,
  "",
  "===== DaisyUI 5 공식 컴포넌트 문서(핵심) =====",
  DAISYUI_CORE_DOCS,
].join("\n");

const FRAGMENT_EXAMPLE = [
  "<example>",
  "다음은 body 안에 들어갈 화면 section 의 예시다(주문 목록). 이 정도의 충실도(DaisyUI navbar·card·btn + 목업 데이터 2~4건)와 규약(전환은 data-nav, 커스텀 동작은 data-action+App.on, 각 영역/필드/액션에 data-testid)을 따르되, 내용은 복사하지 말고 user 의 화면 정의서로 채운다.",
  '<section id="EX-001" data-screen="EX-001" class="min-h-screen bg-base-200 p-4 max-w-md mx-auto">',
  '  <div class="navbar bg-base-100 rounded-box shadow mb-4" data-testid="ex-001-sec-01">',
  '    <span class="flex-1 px-2 text-lg font-bold">주문 목록</span>',
  '    <button class="btn btn-primary btn-sm" data-nav="EX-002" data-testid="ex-001-act-01">+ 새 주문</button>',
  "  </div>",
  '  <div class="space-y-3" data-testid="ex-001-sec-02">',
  '    <div class="card bg-base-100 shadow"><div class="card-body flex-row items-center justify-between p-4">',
  '      <div><h2 class="card-title text-base" data-testid="ex-001-fld-01">아메리카노 2잔</h2><p class="text-sm text-base-content/60">12,000원 · 결제완료</p></div>',
  '      <button class="btn btn-ghost btn-sm text-error" data-action="delOrder" data-testid="ex-001-act-02">삭제</button>',
  "    </div></div>",
  '    <div class="card bg-base-100 shadow"><div class="card-body flex-row items-center justify-between p-4">',
  '      <div><h2 class="card-title text-base">카페라떼 1잔</h2><p class="text-sm text-base-content/60">5,500원 · 준비중</p></div>',
  '      <button class="btn btn-ghost btn-sm text-error" data-action="delOrder">삭제</button>',
  "    </div></div>",
  "  </div>",
  "  <script>",
  '    App.on("delOrder", function (el) { el.closest(".card").remove(); });',
  "  </script>",
  "</section>",
  "</example>",
].join("\n");

const FRAGMENT_RULES = [
  "너는 숙련된 제품 UI 디자이너다. 화면 정의서 하나를 받아, 그 화면을 '실제 출시된 앱'처럼 보이는 고충실도 화면으로 디자인한다.",
  "파일시스템·도구·웹·외부 컨텍스트가 없다. 필요한 정보는 user 메시지 안에 있다. 무엇을 찾거나 읽으려 하지 마라.",
  "",
  "[반드시 지킬 핵심 규칙]",
  '- MUST DO: 완전한 HTML 문서 하나를 출력하고, <body> 안에는 <section id="{화면코드}" data-screen="{화면코드}" class="min-h-screen …"> 를 정확히 하나만 둔다(이 section 만 추출돼 공용 셸에 조립된다).',
  "- DO NOT: 인라인 style 속성을 쓰지 마라. → 대신 모든 스타일을 DaisyUI/Tailwind 클래스로만 준다(이 화면은 DaisyUI 5 + Tailwind v4 가 이미 로드돼 클래스가 100% 동작한다).",
  "- DO NOT: 목록·표를 '데이터 없음' 빈 상태나 빈 컨테이너+JS 로 두지 마라. → 대신 예시 항목 2~4건을 정적 HTML 로 채워 초기 로드에 바로 보이게 한다.",
  "- DO NOT: 인라인 이벤트 속성(onclick·oninput·onchange·onsubmit 등)과 인라인 <script> 안의 top-level 전역 선언(const·let·class·function·var)을 쓰지 마라. → 대신 동작은 요소의 data-action + <script> 의 App.on('이름', function(el,e){…}) 으로, 변수·헬퍼는 그 콜백 함수 안에 지역으로 둔다(여러 화면 스크립트가 한 문서로 합쳐질 때 전역 이름이 충돌하면 스크립트 전체가 죽는다).",
  "",
  "[디자인 지침]",
  '- <head> 에 DaisyUI 5(daisyui@5 + daisyui@5/themes.css)와 @tailwindcss/browser@4 를 로드하고 <html data-theme="corporate"> 로 둔다.',
  "- DaisyUI 컴포넌트로 화면을 풍부하게 디자인한다: 상단 navbar/헤더·card·목록·표·폼·버튼 + 적절한 여백·라운드·그림자·타이포·아이콘(인라인 SVG/이모지). 실제 서비스 화면처럼 보이게 한다.",
  "- 화면 정의서 표의 모든 구성영역·필드·액션을 '동작하는' UI 로 빠짐없이 구현하고, 각 요소에 data-testid=\"{그 행의 testId 값 그대로}\" 를 붙인다(자동 검증되며 누락 시 거부).",
  "- 다른 화면으로의 전환만 그 버튼/링크에 data-nav=\"{대상화면코드}\"(또는 <a href=\"#{대상화면코드}\">) 로 만든다. data-nav 값은 반드시 screen_map 의 화면 코드를 그대로 쓰고(예: data-nav=\"COS-SCR-005\"), 영문 슬러그·화면 이름·임의 문자열을 쓰지 마라. 화면 안에서 끝나는 전환(상태 토글·탭 전환·아코디언 등)은 data-nav 가 아니라 data-action 으로 한다(data-nav 는 화면 자체를 바꾸므로 오용하면 화면이 사라진다).",
  "- 헤더의 뒤로가기 버튼(‹·<·← 아이콘 또는 aria-label=\"뒤로\")은 어느 화면에서 들어왔는지에 따라 돌아갈 곳이 달라지는 '동적' 버튼이다. 고정 data-nav 코드나 data-action=\"back\" 을 붙이지 말고, 오직 data-back 속성만 붙여라(예: <button class=\"btn btn-ghost btn-circle\" data-back aria-label=\"뒤로\">‹</button>). App 이 방문 이력으로 직전 화면을 복원한다. 고정 코드로 두면 다른 경로로 들어왔을 때 엉뚱한 화면으로 가 이동 루프가 끊긴다.",
  "- 식별 속성은 data-screen·data-action·data-testid·data-nav 만 쓴다. <section> 중첩은 피하고(내부 영역은 <div>), section 밖에 서론·설명·코드펜스·마크다운은 출력하지 않는다.",
  "",
  "[상호작용]",
  "- 추가/삭제/수정/검증·탭 전환·상태 토글 등 모든 동작: 요소에 data-action=\"이름\" + 화면 끝 인라인 <script> 에서 App.on('이름', function(el, e){ ... }) 등록(인라인 onclick 금지). 동작에 필요한 변수·헬퍼·목업 데이터는 이 콜백 함수 안에 지역으로 둔다(전역 선언 금지). 공유 상태는 App.state.<키>, 목록 갱신은 App.onRender(function(){ ... })+App.render(). 모달은 <dialog id=\"...\" class=\"modal\"><div class=\"modal-box\"> ... </div></dialog> + App.openModal('id')/App.closeModal('id').",
  "- 인라인 <script> 의 JS 는 문법적으로 완전히 유효해야 한다(오류 1개면 그 스크립트가 죽는다). 템플릿 리터럴 내 HTML 속성은 큰따옴표를 쓴다.",
  "",
  DAISYUI_GUIDE,
  "",
  FRAGMENT_EXAMPLE,
].join("\n");

const buildAnchorSystem = (prd: string, screenMap: string): string =>
  [
    FRAGMENT_RULES,
    "",
    `테마: data-theme="${SHELL_THEME}" 고정. 색은 이 테마의 시맨틱 변수만 쓴다.`,
    "",
    "<screen_map>",
    "이 와이어프레임의 모든 화면과 이동 관계다. data-nav 의 대상은 반드시 여기 있는 화면 코드여야 한다(네비게이션 일관성).",
    screenMap || "(없음)",
    "</screen_map>",
    "",
    "<prd>",
    "제품 기획서 전역 맥락(요약 아님 — 그대로). 화면 디자인의 배경으로 삼되, 이 화면의 구체 명세는 user 의 화면 정의서를 따른다.",
    prd && prd.trim() ? prd : "(비어 있음)",
    "</prd>",
  ].join("\n");

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const figmaChunks = (referenceDocs: ReferenceDoc[]): string[] =>
  (referenceDocs ?? [])
    .map((d) => d.text)
    .join("\n\n---\n\n")
    .split(/\n\n---\n\n/)
    .map((s) => s.trim())
    .filter(Boolean);

const figmaForScreen = (chunks: string[], name: string): string =>
  name ? (chunks.find((c) => c.includes(name)) ?? "") : "";

const extractSection = (raw: string, code: string): string => {
  const s = stripControlChars(raw);
  const fence = s.match(/```(?:html)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1] : s;
  const re = new RegExp(`<section\\b[^>]*data-screen\\s*=\\s*["']${escapeRe(code)}["'][\\s\\S]*?<\\/section>`, "i");
  const m = body.match(re) || body.match(/<section\b[\s\S]*?<\/section>/i);
  return (m ? m[0] : body).trim();
};

const DEVICE_WIDTH_HINT: Record<string, string> = {
  mobile: "모바일 폭 'max-w-md mx-auto'",
  tablet: "태블릿 폭 'max-w-3xl mx-auto'",
  desktop: "데스크톱 폭 'max-w-6xl mx-auto'",
};

const tagDeviceAttr = (section: string, device: string): string =>
  section.replace(/<section\b/i, `<section data-device="${device}"`);

const buildFragmentUser = (screen: ScreenSpecModel, index: number, figmaChunk: string, device: string, chrome?: ShellScreen): string => {
  const code = screenCodeOf(screen, index);
  const name = screenNameOf(screen, index);
  const widthHint = `최상위 <section> 컨테이너는 ${DEVICE_WIDTH_HINT[device] ?? DEVICE_WIDTH_HINT.mobile} 로 두고 그 폭에 맞춰 디자인한다(같은 기기로 분류된 화면은 모두 같은 폭이어야 한다 — 임의로 더 넓거나 좁게 하지 마라).`;
  const shellApplied = !!chrome && (chrome.backHeader || chrome.tabbar);
  const shellNote = shellApplied
    ? `\n<app_shell>\n이 화면은 공용 앱 셸 안에서 표시된다. ${[chrome!.backHeader ? `상단 '뒤로가기 헤더'${chrome!.title ? `(제목: ${chrome!.title})` : ""}` : "", chrome!.tabbar ? "하단 '탭바'" : ""].filter(Boolean).join(" 와 ")} 는 셸이 자동으로 제공한다. 너는 그 사이 '콘텐츠 영역'만 디자인하라. 하단 탭바·전역 네비게이션 바·뒤로가기 헤더·앱 제목 헤더를 직접 만들지 마라(셸과 중복되어 깨진다). 화면 정의서에 '하단 네비/탭바/상단 헤더/뒤로가기' 영역이 있어도 그것은 셸이 담당하니 콘텐츠에서 빼고, 나머지 구성·필드·액션은 빠짐없이 구현하라.\n</app_shell>`
    : "";
  const navLinks = (screen.tables.actions ?? [])
    .map((a) => ({ trig: (a.trigger || a.actionName || "").toString().trim(), to: (a.nextScreen || "").trim() }))
    .filter((l) => l.trig && l.to);
  const navBlock = navLinks.length
    ? `\n<navigation>\n아래 요소는 클릭 시 지정한 화면으로 이동해야 한다. 해당 UI 요소(버튼·카드·목록항목)에 data-nav="대상코드" 를 붙여라(다른 함수·실제 경로 금지):\n${navLinks.map((l) => `- '${l.trig}' → data-nav="${l.to}"`).join("\n")}\n그 밖에도 다른 화면으로 연결되는 요소가 있으면 screen_map 의 화면 코드로 data-nav 를 붙인다.\n</navigation>`
    : "";
  return [
    `'${name}'(${code}) 화면을 실제 출시 앱처럼 DaisyUI 로 디자인해, body 안에 <section id="${code}" data-screen="${code}"> 하나만 담은 완전한 HTML 문서로 출력하라.`,
    "아래 화면 정의서의 모든 표(화면 구성·필드·액션)를 빠짐없이 '동작하는' UI 로 구현한다(무손실).",
    widthHint,
    shellNote,
    "",
    "<screen_spec>",
    renderScreen(screen, index),
    "</screen_spec>",
    navBlock,
    figmaChunk
      ? `\n<layout_reference>\n요소 배치·계층만 참고하는 Figma 배치 가이드다. 충돌 시 위 화면 정의서를 우선한다.\n${figmaChunk}\n</layout_reference>`
      : "",
    "",
    `출력: 완전한 HTML 문서 하나. body 안에 <section id="${code}" data-screen="${code}" class="min-h-screen ..."> 하나만 두고 DaisyUI 클래스로 디자인한다. 설명·코드펜스는 쓰지 않는다.`,
  ].join("\n");
};

const hasTestId = (section: string, k: string): boolean =>
  new RegExp(`data-testid\\s*=\\s*["']?${escapeRe(k)}["']?(?![\\w-])`, "i").test(section);

const navPresent = (section: string, t: string): boolean =>
  new RegExp(`App\\.go\\(\\s*["']${escapeRe(t)}["']`).test(section) ||
  new RegExp(`data-(?:nav|target|goto)\\s*=\\s*["']${escapeRe(t)}["']`, "i").test(section) ||
  new RegExp(`href\\s*=\\s*["']#${escapeRe(t)}["']`, "i").test(section);

const validateFragmentHard = (section: string, code: string): string[] => {
  const issues: string[] = [];
  if (!new RegExp(`data-screen\\s*=\\s*["']${escapeRe(code)}["']`, "i").test(section)) {
    issues.push(`<section data-screen="${code}"> 가 없습니다. 정확히 이 속성을 가진 section 하나만 출력하라.`);
  }
  const opens = (section.match(/<section\b/gi) || []).length;
  const closes = (section.match(/<\/section>/gi) || []).length;
  if (opens !== 1 || closes !== 1) {
    issues.push("section 태그가 정확히 1쌍이 아닙니다(중첩 <section> 금지 — 내부 영역은 <div> 로). 절단·중첩 없이 균형 잡힌 화면 하나만 출력하라.");
  }
  if (!/<\/section>\s*$/.test(section)) {
    issues.push("조각이 </section> 로 끝나지 않습니다(출력이 잘렸을 수 있음). 완전한 화면을 처음부터 다시 출력하라.");
  }
  issues.push(...validateScriptSyntax(section));
  return issues;
};

const validateFragmentSoft = (section: string, screen: ScreenSpecModel, codes: Set<string>, excludeKeys: Set<string> = new Set()): string[] => {
  const issues: string[] = [];
  const missing = screenCoverageKeys(screen).filter((k) => !excludeKeys.has(k) && !hasTestId(section, k));
  if (missing.length > 0) {
    issues.push(`화면정의서의 다음 요소가 누락되었습니다(각 행을 data-testid 로 마킹해 빠짐없이 구현하라): ${missing.join(", ")}`);
  }
  const navTargets = Array.from(
    new Set((screen.tables.actions ?? []).map((a) => (a.nextScreen || "").trim()).filter((t) => t && codes.has(t))),
  );
  const noNav = navTargets.filter((t) => !navPresent(section, t));
  if (noNav.length > 0) {
    issues.push(`다음 이동 대상으로의 화면전환이 빠졌습니다(해당 버튼/링크에 data-nav="코드" 또는 href="#코드" 추가): ${noNav.join(", ")}`);
  }
  const inlineHandlers = section.match(/\son[a-z]+\s*=\s*["']/gi) || [];
  if (inlineHandlers.length > 0) {
    issues.push(`인라인 이벤트 핸들러(${inlineHandlers.length}개: onclick 등)가 남아 있습니다. 조립 시 격리 실행되어 동작하지 않으니, 그 동작을 요소의 data-action="이름" + 화면 끝 <script> 의 App.on('이름', function(el,e){…}) 으로 옮기고 인라인 on* 속성은 제거하라.`);
  }
  return issues;
};

const validateFragment = (raw: string, screen: ScreenSpecModel, index: number, codes: Set<string>, excludeKeys?: Set<string>): string[] => {
  const code = screenCodeOf(screen, index);
  const section = extractSection(raw, code);
  return [...validateFragmentHard(section, code), ...validateFragmentSoft(section, screen, codes, excludeKeys)];
};

const placeholderFragment = (screen: ScreenSpecModel, index: number): string => {
  const code = screenCodeOf(screen, index);
  const name = screenNameOf(screen, index);
  const keys = screenCoverageKeys(screen);
  const list = keys.length ? ` 누락 요소: ${keys.join(", ")}.` : "";
  return `<section id="${code}" data-screen="${code}" class="min-h-screen p-6 max-w-md mx-auto"><div class="alert alert-warning mt-6"><span>⚠ 화면 '${name}'(${code}) 자동 생성에 실패했습니다.${list}</span></div></section>`;
};

const generateScreenFragment = async (
  screen: ScreenSpecModel,
  index: number,
  systemText: string,
  figmaChunk: string,
  codes: Set<string>,
  device: string,
  chrome?: ShellScreen,
): Promise<string> => {
  const code = screenCodeOf(screen, index);
  const shellApplied = !!chrome && (chrome.backHeader || chrome.tabbar);
  const baseUser = buildFragmentUser(screen, index, figmaChunk, device, chrome);
  const excludeKeys = shellApplied ? shellOwnedTestIds(screen) : new Set<string>();
  let lastSection = "";
  let user = baseUser;
  for (let n = 0; n < MAX_REPAIR_ATTEMPTS; n++) {
    const raw = await callLlm(systemText, user, FRAGMENT_MAX_TOKENS);
    lastSection = extractSection(raw, code);
    const issues = validateFragment(raw, screen, index, codes, excludeKeys);
    if (issues.length === 0) return lastSection;
    user = [baseUser, "", "===== 직전 출력 문제(고쳐서 같은 화면 하나만 다시 출력) =====", ...issues.map((i) => `- ${i}`)].join("\n");
  }
  const hard = validateFragmentHard(lastSection, code);
  if (hard.length === 0) return lastSection;
  throw new Error(`화면 ${code} 생성 실패(구조 결함): ${hard.join("; ")}`);
};

const buildNameToCode = (screens: ScreenSpecModel[]): Map<string, string> => {
  const m = new Map<string, string>();
  screens.forEach((s, i) => {
    const n = (s.basic.screenName || "").trim();
    if (n) m.set(n, screenCodeOf(s, i));
  });
  return m;
};

const normalizeNav = (screen: ScreenSpecModel, nameToCode: Map<string, string>, codes: Set<string>): ScreenSpecModel => ({
  ...screen,
  tables: {
    ...screen.tables,
    actions: (screen.tables.actions ?? []).map((a) => {
      const t = (a.nextScreen || "").trim();
      return { ...a, nextScreen: codes.has(t) ? t : nameToCode.get(t) ?? t };
    }),
  },
});

export interface SplitResult {
  html: string;
  gaps: string[];
}

const isolateFragmentScripts = (html: string): string =>
  html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (m, attrs: string, body: string) => {
    if (/\bsrc\s*=/i.test(attrs)) return m;
    const type = (attrs.match(/type\s*=\s*["']([^"']+)["']/i) || [])[1]?.toLowerCase();
    if (type && type !== "text/javascript" && type !== "application/javascript") return m;
    if (!body.trim()) return m;
    if (/\bwindow\.App\s*=/.test(body)) return m;
    if (/^\s*[(!]\s*function\b/.test(body) || /^\s*\(\s*\(\s*\)\s*=>/.test(body)) return m;
    return `<script${attrs}>(function(){\n${body}\n})();</script>`;
  });

const BACK_ARIA = /aria-label\s*=\s*["'][^"']*(?:뒤로|go\s*back|\bback\b)[^"']*["']/i;
const BACK_GLYPH = /(?:‹|⟨|〈|◀|◁|←|⬅|&lsaquo;|&larr;|&#8249;|&#8592;|arrow_back(?:_ios)?|chevron[_-]?left)/i;
const isBackControl = (attrs: string, inner: string): boolean => {
  if (BACK_ARIA.test(attrs)) return true;
  if (/\bdata-action\s*=\s*["'](?:back|goback|goBack|navigateBack|prev|previous)["']/i.test(attrs)) return true;
  if (/\bdata-action\s*=/i.test(attrs)) return false;
  const text = inner.replace(/<[^>]*>/g, "").replace(/&[a-z#0-9]+;/gi, "").trim();
  return BACK_GLYPH.test(inner) && text.length <= 8;
};
const normalizeBackControls = (html: string): string =>
  html.replace(/<(button|a)\b([^>]*)>([\s\S]*?)<\/\1>/gi, (m, tag: string, attrs: string, inner: string) => {
    if (/\bdata-back\b/i.test(attrs)) return m;
    if (!isBackControl(attrs, inner)) return m;
    const cleaned = attrs
      .replace(/\sdata-(?:nav|target|goto)\s*=\s*["'][^"']*["']/gi, "")
      .replace(/\shref\s*=\s*["']#[^"']*["']/gi, "")
      .replace(/\sdata-action\s*=\s*["'](?:back|goback|goBack|navigateBack|prev|previous)["']/gi, "")
      .replace(/\s+$/, "");
    return `<${tag}${cleaned} data-back>${inner}</${tag}>`;
  });

const canonicalNavCode = (val: string, nameToCode: Map<string, string>, codes: Set<string>): string => {
  const v = val.trim();
  if (!v || codes.has(v)) return val;
  const byName = nameToCode.get(v);
  if (byName) return byName;
  const up = v.toUpperCase();
  const ends = [...codes].filter((c) => c.toUpperCase().endsWith(up) || up.endsWith(c.toUpperCase()));
  return ends.length === 1 ? ends[0] : val;
};

const normalizeNavCodes = (section: string, nameToCode: Map<string, string>, codes: Set<string>): string =>
  section
    .replace(/(data-(?:nav|target|goto)\s*=\s*")([^"]*)(")/gi, (_m, p: string, val: string, q: string) => p + canonicalNavCode(val, nameToCode, codes) + q)
    .replace(/(href\s*=\s*"#)([^"]*)(")/gi, (_m, p: string, val: string, q: string) => p + canonicalNavCode(val, nameToCode, codes) + q);

// ponytail: 화면 전환 배선을 LLM 자발성 → 코드 소유로. screen_model 의 (testId,nextScreen) 으로
// 조립 단계에서 data-nav 를 결정적으로 박는다(testId↔data-testid 는 canonicalizeScreen 이 보장).
// 이미 data-nav/data-back 인 요소는 보존(back 버튼·모델 자발 배선 존중). 같은 testId 가 여러 요소면(목록 N건) 전부 배선.
export const injectNavByTestId = (section: string, screen: ScreenSpecModel, codes: Set<string>): string => {
  let out = section;
  for (const a of screen.tables.actions ?? []) {
    const to = (a.nextScreen || "").trim();
    const tid = (a.testId || "").trim();
    if (!to || !tid || !codes.has(to)) continue;
    out = out.replace(
      new RegExp(`<[a-z][a-z0-9]*\\b[^>]*\\bdata-testid\\s*=\\s*["']?${escapeRe(tid)}["']?(?![\\w-])[^>]*?/?>`, "gi"),
      (tag) => (/\bdata-(?:nav|back)\b/i.test(tag) ? tag : tag.replace(/(\/?>)$/, ` data-nav="${to}"$1`)),
    );
  }
  return out;
};

const NAV_GRAPH_SYSTEM = [
  "너는 와이어프레임 화면들 사이의 '클릭 이동'을 추론하는 분석기다. 대화형 에이전트가 아니다. 도구·웹·파일이 없다.",
  "입력은 전체 화면 목록(코드·이름)과 각 화면의 액션 트리거 목록(앞에 1부터의 번호)이다.",
  "각 화면의 액션 중 '다른 화면으로 이동'하는 것만 edge 로 출력한다.",
  "- 이동(edge): 목록·카드·항목을 선택/탭해 상세 화면으로 가기, 글쓰기·작성·추가로 작성 화면 가기, 로그인·더보기·전체보기로 다른 화면 가기.",
  "- 이동 아님(반드시 제외): 정렬 변경, 필터·카테고리·정렬 선택, 탭 전환, 검색어 입력·검색 실행, 토글·즐겨찾기·좋아요·삭제·저장, 입력/유효성 검사 등 한 화면 안에서 끝나는 동작.",
  "- 뒤로 가기·이전 화면·닫기도 반드시 제외하라(직전 화면 복귀는 진입 경로에 따라 달라지는 동적 이동이라 고정 edge 로 만들 수 없다 — 별도 메커니즘이 처리한다).",
  "- 한 화면의 모든 액션이 이동일 필요는 없다. 대부분은 제자리 동작이다. 애매하면 넣지 마라(거짓 이동보다 누락이 낫다).",
  "from·to 코드는 반드시 <screens> 목록의 코드여야 한다. action 에는 그 액션 앞에 적힌 번호(1부터의 정수) 또는 그 트리거 텍스트를 넣는다.",
  "<actions> 에는 이동 대상이 적혀 있지 않다 — 화면 이름과 트리거의 의미로 어디로 가는지 추론하는 것이 너의 일이다.",
  "",
  "emit_nav_edges 도구를 호출해 결과를 내라. 각 edge 는 from(출발 화면 코드), action(출발 화면 액션의 1부터의 번호), to(도착 화면 코드) 세 필드를 반드시 모두 포함해야 한다. action 을 절대 생략하지 마라.",
  "이동이 전혀 없으면 edges 를 빈 배열로 호출하라.",
].join("\n");

// ponytail: 모델이 자유 JSON 이면 action 번호를 자주 누락(코드펜스도 추가) → resolveActionIdx(-1) 로 전 edge 폐기됨.
// tool_use(input_schema required)로 action 을 강제해 구조화 출력 보장. [[builder-wireframe-app-shell-ownership]]
const NAV_GRAPH_TOOL = {
  name: "emit_nav_edges",
  description: "화면 사이의 클릭 이동 edge 목록을 출력한다.",
  input_schema: {
    type: "object",
    properties: {
      edges: {
        type: "array",
        description: "화면 간 이동 edge. 없으면 빈 배열.",
        items: {
          type: "object",
          properties: {
            from: { type: "string", description: "출발 화면 코드(예: SCR-004)" },
            action: { type: "integer", description: "출발 화면 액션 목록에서 그 액션 앞에 적힌 1부터의 번호" },
            to: { type: "string", description: "도착 화면 코드(예: SCR-005)" },
          },
          required: ["from", "action", "to"],
        },
      },
    },
    required: ["edges"],
  },
} as const;

const buildNavGraphUser = (screens: ScreenSpecModel[]): string => {
  const lines: string[] = ["<screens>"];
  screens.forEach((s, i) => lines.push(`- ${screenCodeOf(s, i)} : ${screenNameOf(s, i)}`));
  lines.push("</screens>", "", "<actions>");
  screens.forEach((s, i) => {
    const acts = s.tables.actions ?? [];
    if (!acts.length) return;
    lines.push(`[${screenCodeOf(s, i)}]`);
    acts.forEach((a, j) => {
      const trig = (a.trigger || a.actionName || "").toString().trim() || `(액션 ${j + 1})`;
      lines.push(`  ${j + 1}: ${trig}`);
    });
  });
  lines.push("</actions>", "", "위 <screens> 의 코드만 대상으로 edges JSON 하나만 출력하라.");
  return lines.join("\n");
};

const resolveActionIdx = (actionField: number | string | undefined, acts: Array<Record<string, string>>): number => {
  const raw = String(actionField ?? "").trim();
  if (!raw) return -1;
  if (/^(?:act[-_ ]?|액션\s*)?\d{1,3}$/i.test(raw)) {
    const n = parseInt(raw.replace(/\D/g, ""), 10);
    if (n >= 1 && n <= acts.length) return n - 1;
  }
  const norm = (s: string): string => s.toString().trim().toLowerCase().replace(/\s+/g, "");
  const target = norm(raw);
  if (!target) return -1;
  const label = (a: Record<string, string>): string => norm(a.trigger || a.actionName || "");
  let idx = acts.findIndex((a) => label(a) === target);
  if (idx < 0) idx = acts.findIndex((a) => { const t = label(a); return !!t && (t.includes(target) || target.includes(t)); });
  return idx;
};

const inferNavGraph = async (screens: ScreenSpecModel[], codes: Set<string>): Promise<Map<string, Map<number, string>>> => {
  const byCode = new Map<string, ScreenSpecModel>();
  screens.forEach((s, i) => byCode.set(screenCodeOf(s, i), s));
  if (!screens.some((s) => (s.tables.actions ?? []).length > 0)) return new Map();
  for (let attempt = 0; attempt < 3; attempt++) {
    const out = new Map<string, Map<number, string>>();
    let parsed: { edges?: Array<{ from?: string; action?: number | string; to?: string }> } | null;
    try {
      parsed = (await callLlmTool(NAV_GRAPH_SYSTEM, buildNavGraphUser(screens), NAV_GRAPH_TOOL, 6000)) as typeof parsed;
    } catch {
      parsed = null;
    }
    for (const e of parsed?.edges ?? []) {
      const from = (e.from ?? "").toString().trim();
      const to = (e.to ?? "").toString().trim();
      if (!codes.has(from) || !codes.has(to) || from === to) continue;
      const acts = byCode.get(from)?.tables.actions ?? [];
      const idx = resolveActionIdx(e.action, acts);
      if (idx < 0 || idx >= acts.length) continue;
      let m = out.get(from);
      if (!m) { m = new Map(); out.set(from, m); }
      if (!m.has(idx)) m.set(idx, to);
    }
    if (out.size > 0) return out;
  }
  return new Map();
};

const applyInferredNav = async (screens: ScreenSpecModel[], codes: Set<string>): Promise<ScreenSpecModel[]> => {
  const graph = await inferNavGraph(screens, codes).catch(() => new Map<string, Map<number, string>>());
  if (graph.size === 0) return screens;
  return screens.map((s, i) => {
    const byAction = graph.get(screenCodeOf(s, i));
    if (!byAction || byAction.size === 0) return s;
    return {
      ...s,
      tables: {
        ...s.tables,
        actions: (s.tables.actions ?? []).map((a, j) => {
          const target = byAction.get(j);
          return target && !(a.nextScreen || "").trim() ? { ...a, nextScreen: target } : a;
        }),
      },
    };
  });
};

const DEVICE_SYSTEM = [
  "너는 화면 목록을 입력받아, 각 화면이 주로 열리는 기기를 분류해 JSON 객체 하나만 반환하는 순수 함수다. 대화형 에이전트가 아니다. 질문·해설·서론·인사를 절대 출력하지 마라.",
  "각 화면을 mobile / tablet / desktop 중 하나로 분류한다.",
  "- mobile: 고객·일반 사용자용 모바일 앱 화면(하단 탭, 좁은 폭).",
  "- desktop: 관리자·백오피스·대시보드·데이터 표 위주의 넓은 화면, 또는 PC 웹 화면.",
  "- tablet: 그 중간이 명확할 때만.",
  "한 기획서에 고객·관리자·협력업체 화면과 서로 다른 기기가 섞일 수 있다. 같은 성격(같은 사용자군·기기)의 화면은 같은 값으로 일관 분류하라.",
  "출력: 화면 코드를 키, 기기를 값으로 하는 JSON 객체 하나뿐(코드펜스·설명 금지).",
  '예: {"COS-SCR-001":"mobile","COS-SCR-013":"desktop","COS-SCR-014":"desktop"}',
].join("\n");

const buildDeviceUser = (screens: ScreenSpecModel[]): string => {
  const lines: string[] = ["<screens>"];
  screens.forEach((s, i) => {
    const b = s.basic ?? {};
    const route = (b.route || "").toString().trim();
    const desc = (b.description || "").toString().trim().replace(/\s+/g, " ").slice(0, 80);
    lines.push(`- ${screenCodeOf(s, i)} : ${screenNameOf(s, i)}${route ? ` | route=${route}` : ""}${desc ? ` | ${desc}` : ""}`);
  });
  lines.push("</screens>", "", "화면 코드를 키로, 기기를 값으로 하는 JSON 객체 하나만 출력하라.");
  return lines.join("\n");
};

const inferScreenDevices = async (screens: ScreenSpecModel[], codes: Set<string>): Promise<Map<string, string>> => {
  const valid = new Set(["mobile", "tablet", "desktop"]);
  for (let attempt = 0; attempt < 2; attempt++) {
    const out = new Map<string, string>();
    let parsed: Record<string, unknown> | null;
    try {
      const raw = await callLlm(DEVICE_SYSTEM, buildDeviceUser(screens), 4000);
      parsed = extractJsonObject(stripControlChars(raw)) as Record<string, unknown>;
    } catch {
      parsed = null;
    }
    if (parsed && typeof parsed === "object") {
      for (const [code, dev] of Object.entries(parsed)) {
        const key = code.trim();
        const val = String(dev).trim().toLowerCase();
        if (codes.has(key) && valid.has(val)) out.set(key, val);
      }
    }
    if (out.size > 0) return out;
  }
  return new Map();
};

interface ShellTab { label: string; icon: string; target: string; }
interface ShellScreen { tabbar: boolean; backHeader: boolean; title: string; }
interface AppShell { tabs: ShellTab[]; roots: Set<string>; }

const emptyShell = (): AppShell => ({ tabs: [], roots: new Set() });

const TAB_ICONS: Array<[RegExp, string]> = [
  [/홈|home/i, "🏠"], [/검색|찾|search/i, "🔍"], [/의사|명의|닥터|doctor/i, "👨‍⚕️"],
  [/커뮤니|community|글|게시/i, "💬"], [/마이|내\s|프로필|profile|account|my/i, "👤"],
  [/예약|booking|calendar|일정/i, "📅"], [/채팅|메시지|chat|message|aiga/i, "💬"],
  [/알림|notif/i, "🔔"], [/설정|setting/i, "⚙️"], [/병원|hospital|클리닉/i, "🏥"],
];
const iconFor = (label: string): string => {
  for (const [re, ic] of TAB_ICONS) if (re.test(label)) return ic;
  return "•";
};

const SHELL_SYSTEM =
  "너는 화면 목록을 보고 모바일 앱의 하단 탭바를 설계하는 도구다. set_tabbar 도구를 반드시 호출해 결과를 반환하라. permission(권한)·domainMenu(메뉴)·route 로 고객 모바일 화면을 식별하고, 관리자/백오피스/데스크톱 전용 화면은 탭바에 넣지 마라. 모바일 앱 성격이 전혀 없으면 tabs 를 빈 배열로 둔다.";

const SHELL_TOOL = {
  name: "set_tabbar",
  description: "모바일 앱의 하단 전역 탭바를 정의한다.",
  input_schema: {
    type: "object",
    properties: {
      tabs: {
        type: "array",
        description: "하단 탭 3~5개(최대 5개). 모바일 앱 성격이 없으면 빈 배열.",
        items: {
          type: "object",
          properties: {
            label: { type: "string", description: "짧은 한국어 탭 이름" },
            icon: { type: "string", description: "이모지 1글자" },
            target: { type: "string", description: "탭을 누르면 가는 화면 코드(반드시 목록에 있는 코드)" },
          },
          required: ["label", "target"],
        },
      },
      showOn: {
        type: "array",
        description: "하단 탭바가 보여야 하는 화면 코드들(각 탭 target + 같은 성격의 메인 화면). 상세·작성·로그인 등 하위 화면은 제외(그 화면엔 뒤로가기 헤더가 자동으로 붙는다).",
        items: { type: "string" },
      },
    },
    required: ["tabs"],
  },
} as const;

const buildShellUser = (screens: ScreenSpecModel[]): string => {
  const lines: string[] = ["<screens>"];
  screens.forEach((s, i) => {
    const b = s.basic ?? {};
    const meta = [
      (b.permission || "").trim() && `권한=${(b.permission || "").trim()}`,
      (b.domainMenu || "").trim() && `메뉴=${(b.domainMenu || "").trim()}`,
      (b.route || "").trim() && `route=${(b.route || "").trim()}`,
    ].filter(Boolean).join(" | ");
    const desc = (b.description || "").toString().trim().replace(/\s+/g, " ").slice(0, 70);
    lines.push(`- ${screenCodeOf(s, i)} : ${screenNameOf(s, i)}${meta ? ` | ${meta}` : ""}${desc ? ` | ${desc}` : ""}`);
    const trigs = (s.tables.actions ?? []).map((a) => (a.trigger || a.actionName || "").toString().trim()).filter(Boolean).slice(0, 6);
    if (trigs.length) lines.push(`    액션: ${trigs.join(", ")}`);
  });
  lines.push("</screens>", "", "위 목록의 화면 코드만 대상으로 앱 셸 JSON 하나만 출력하라.");
  return lines.join("\n");
};

const inferAppShell = async (screens: ScreenSpecModel[], codes: Set<string>): Promise<AppShell> => {
  if (process.env.WIREFRAME_SHELL === "0") return emptyShell();
  for (let attempt = 0; attempt < 2; attempt++) {
    let input: Record<string, unknown> | null;
    try {
      input = await callLlmTool(SHELL_SYSTEM, buildShellUser(screens), SHELL_TOOL, 2000);
    } catch {
      input = null;
    }
    if (input) {
      const tabsRaw = Array.isArray(input.tabs) ? (input.tabs as Array<Record<string, unknown>>) : [];
      const tabs: ShellTab[] = tabsRaw
        .map((t) => {
          const label = String(t.label ?? "").trim();
          const target = String(t.target ?? "").trim();
          return { label, icon: String(t.icon ?? "").trim() || iconFor(label), target };
        })
        .filter((t) => t.label && codes.has(t.target))
        .slice(0, 5);
      const showRaw = Array.isArray(input.showOn) ? (input.showOn as unknown[]) : tabs.map((t) => t.target);
      const roots = new Set<string>();
      for (const c of showRaw) {
        const k = String(c).trim();
        if (codes.has(k)) roots.add(k);
      }
      tabs.forEach((t) => roots.add(t.target));
      if (tabs.length > 0) return { tabs, roots };
    }
  }
  return emptyShell();
};

const shellEsc = (s: string): string =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const renderShellHeader = (title: string): string =>
  `<header class="sticky top-0 z-30 flex items-center gap-2 bg-base-100 border-b border-base-200 px-3 py-2"><button class="btn btn-ghost btn-circle btn-sm" data-back aria-label="뒤로"><span class="text-xl leading-none">‹</span></button>${title ? `<span class="font-bold text-base">${shellEsc(title)}</span>` : ""}</header>`;

const renderShellTabbar = (tabs: ShellTab[], code: string): string =>
  `<nav class="sticky bottom-0 z-30 mt-auto flex justify-around bg-base-100 border-t border-base-200">${tabs
    .map((t) => {
      const active = t.target === code;
      return `<button data-nav="${shellEsc(t.target)}" class="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs ${active ? "text-primary font-semibold" : "text-base-content/60"}"><span class="text-lg leading-none">${shellEsc(t.icon)}</span><span>${shellEsc(t.label)}</span></button>`;
    })
    .join("")}</nav>`;

const renderShell = (section: string, chrome: ShellScreen | undefined, tabs: ShellTab[], code: string): string => {
  if (!chrome) return section;
  const wantTabbar = chrome.tabbar && tabs.length > 0;
  if (!chrome.backHeader && !wantTabbar) return section;
  const m = section.match(/^([\s\S]*?<section\b[^>]*>)([\s\S]*?)(<\/section>\s*)$/i);
  if (!m) return section;
  let openTag = m[1];
  const inner = m[2];
  const closeTag = m[3];
  openTag = openTag.replace(/<section\b([^>]*)>/i, (_mm, attrs: string) =>
    /class\s*=\s*"/.test(attrs)
      ? `<section${attrs.replace(/class\s*=\s*"([^"]*)"/i, (_c, cls: string) => `class="${cls} flex flex-col"`)}>`
      : `<section${attrs} class="flex flex-col">`,
  );
  const header = chrome.backHeader ? renderShellHeader(chrome.title) : "";
  const tabbar = wantTabbar ? renderShellTabbar(tabs, code) : "";
  const content = `<div class="flex-1 min-h-0">${inner}</div>`;
  return `${openTag}${header}${content}${tabbar}${closeTag}`;
};

const SHELL_AREA_RE = /하단\s*(?:네비|탭|메뉴|바)|탭\s*바|tab\s*bar|bottom\s*nav|글로벌\s*네비|전역\s*네비|상단\s*헤더|app\s*bar|뒤로\s*가기/i;
const shellOwnedTestIds = (screen: ScreenSpecModel): Set<string> => {
  const out = new Set<string>();
  for (const r of screen.tables.composition ?? []) {
    const hay = `${r.areaName || ""} ${r.desc || ""}`;
    if (SHELL_AREA_RE.test(hay)) {
      const k = (r.testId || r.areaCode || "").trim();
      if (k) out.add(k);
    }
  }
  return out;
};

export const generateHtmlSplit = async (
  input: GenerateHtmlInput,
  rawScreens: ScreenSpecModel[],
): Promise<SplitResult> => {
  const codes = new Set(rawScreens.map((s, i) => screenCodeOf(s, i)));
  const nameToCode = buildNameToCode(rawScreens);
  const prepared = rawScreens.map((s, i) => canonicalizeScreen(normalizeNav(s, nameToCode, codes), i));
  const [screens, shell, deviceMap] = await Promise.all([
    applyInferredNav(prepared, codes),
    inferAppShell(prepared, codes),
    inferScreenDevices(prepared, codes),
  ]);
  const deviceOf = (s: ScreenSpecModel, i: number): string => deviceMap.get(screenCodeOf(s, i)) ?? "mobile";
  const systemText = buildAnchorSystem(input.specDoc || "", renderScreenMap({ screens }));
  const chunks = figmaChunks(input.referenceDocs);
  const gaps: string[] = [];
  const fragments = await Promise.all(
    screens.map(async (s, i) => {
      const code = screenCodeOf(s, i);
      try {
        const device = deviceOf(s, i);
        const chrome: ShellScreen | undefined =
          device === "mobile" && shell.tabs.length > 0
            ? shell.roots.has(code)
              ? { tabbar: true, backHeader: false, title: "" }
              : { tabbar: false, backHeader: true, title: screenNameOf(s, i) }
            : undefined;
        const frag = await generateScreenFragment(s, i, systemText, figmaForScreen(chunks, screenNameOf(s, i)), codes, device, chrome);
        const shelled = renderShell(frag, chrome, shell.tabs, code);
        const wired = injectNavByTestId(normalizeBackControls(normalizeNavCodes(shelled, nameToCode, codes)), s, codes);
        return tagDeviceAttr(isolateFragmentScripts(wired), device);
      } catch {
        gaps.push(code);
        return placeholderFragment(s, i);
      }
    }),
  );
  const html = SHELL_HTML.replace(SCREENS_MARKER, () => `\n${fragments.join("\n")}\n`);
  return { html, gaps };
};

export interface ReviseResult {
  html: string;
  specDoc: string;
  screenModel: ScreenSpecDoc;
  summary: string;
}

const cleanSection = (sec: string | null): string =>
  sec === null ? "" : stripControlChars(cutBeforeHtml(sec)).trim();

export const reviseAll = async (
  currentHtml: string,
  specDoc: string,
  currentScreenModel: ScreenSpecDoc,
  instruction: string,
): Promise<ReviseResult> => {
  const beforeScore = contentScore(currentScreenModel);
  const reductionAllowed = /삭제|지워|지우|빼|제거|없애|비워|비우|초기화|리셋|클리어|간소화|줄여|남겨|remove|delete|clear|reset/i.test(instruction);

  const docsUser = buildReviseDocsUser(specDoc, currentScreenModel, instruction);
  const docsValidate = (raw: string): string[] => {
    const section = sliceBetween(raw, REVISE_MARKERS.screenModel, [REVISE_MARKERS.summary]);
    if (section === null) return ["화면 정의서 모델 구역(===WF_SCREEN_MODEL===)이 없습니다."];
    const structIssues = validateScreenModelSection(section);
    if (structIssues.length > 0) return structIssues;
    const afterScore = contentScore(fromLlmJson(section));
    const regressed = !reductionAllowed && beforeScore >= MIN_GUARD_CONTENT && afterScore < beforeScore * MAX_CONTENT_LOSS_RATIO;
    return regressed
      ? [`기존 화면 정의서 내용이 대부분 사라졌습니다(보존 셀 ${afterScore}/${beforeScore}). 요청과 무관한 행과 셀은 한 글자도 빠짐없이 그대로 복사해 8섹션 스키마대로 다시 출력하라.`]
      : [];
  };
  const docsRaw = await callWithRepair(
    REVISE_DOCS_SYSTEM,
    docsUser,
    docsValidate,
    buildRepairFromBase(docsUser, "(같은 3마커 형식으로 다시 출력하라. HTML 은 출력하지 마라.)"),
  );
  const specRaw = sliceBetween(docsRaw, REVISE_MARKERS.spec, [REVISE_MARKERS.screenModel, REVISE_MARKERS.summary]);
  const modelSection = sliceBetween(docsRaw, REVISE_MARKERS.screenModel, [REVISE_MARKERS.summary]);
  const summaryRaw = sliceBetween(docsRaw, REVISE_MARKERS.summary, []);
  const newSpec = cleanSection(specRaw) || specDoc;
  const newModel = modelSection === null ? currentScreenModel : fromLlmJson(modelSection);
  const summary = cleanSection(summaryRaw) || "요청을 반영해 수정했습니다.";

  const reviseHtmlValidate = (r: string): string[] => {
    const html = extractHtml(r);
    const issues = validateHtml(html);
    if (/data-theme\s*=/.test(currentHtml) && !/data-theme\s*=/.test(html)) {
      issues.push("기존 data-theme 가 사라졌습니다. <html data-theme=...> 를 그대로 보존하라.");
    }
    if (/window\.App\b/.test(currentHtml) && !/window\.App\b/.test(html)) {
      issues.push("App 코어(window.App)가 사라졌습니다. 기존 <head> 의 App 스크립트를 그대로 보존하라.");
    }
    if (!/cdn\.tailwindcss\.com/.test(currentHtml) && /cdn\.tailwindcss\.com/.test(html)) {
      issues.push("기존에 없던 cdn.tailwindcss.com 을 추가하지 마라. 기존 CSS 스택(DaisyUI/Tailwind browser 등)을 유지하라.");
    }
    const curScreens = (currentHtml.match(/data-screen\s*=/gi) || []).length;
    const newScreens = (html.match(/data-screen\s*=/gi) || []).length;
    if (curScreens > 0 && newScreens < curScreens) {
      issues.push(`화면(<section data-screen>)이 ${curScreens}개에서 ${newScreens}개로 줄었습니다. 모든 화면을 보존하라.`);
    }
    return issues;
  };
  const htmlRaw = await callWithRepair(
    REVISE_HTML_SYSTEM,
    buildReviseHtmlUser(currentHtml, newModel, instruction, summary),
    reviseHtmlValidate,
    (issues, prevRaw) => buildRepairUser(extractHtml(prevRaw), issues),
  );

  return {
    html: isolateFragmentScripts(normalizeBackControls(extractHtml(htmlRaw))),
    specDoc: newSpec,
    screenModel: newModel,
    summary,
  };
};

const EXTRACT_SYSTEM = [
  "너는 임의의 화면 정의서·기획 문서(마크다운·표·자유 텍스트)를 입력받아, 고정된 8섹션 스키마의 JSON 모델로 매핑하는 추출기다. 대화형 에이전트가 아니다.",
  "너에게는 파일시스템·도구·웹·외부 컨텍스트가 전혀 없다. 필요한 모든 정보는 user 메시지의 문서 안에 있다.",
  "",
  "[작업]",
  "- 문서에서 화면과 각 화면의 정보를 최대한 정확히 추출하라. 문서에 없는 값은 빈 문자열로 둬라. 내용을 지어내지 마라.",
  "- 여러 화면이 있으면 screens 배열에 각각 담아라.",
  "",
  "[구조 — 반드시 준수]",
  "- 각 화면 객체는 정확히 두 키만 가진다: basic(객체)과 tables(객체). 화면 속성을 화면 객체 최상위에 두지 말고 전부 basic 안에 넣어라.",
  "- tables 는 정확히 이 8개 키를 가진다: composition, fields, actions, apis, acceptance, undecided, docReflect. 각 값은 '행 객체'의 배열이다(없으면 []).",
  "- 모든 키는 아래에 명시된 영문 key 를 그대로 써라. 한국어 라벨이나 다른 이름(name, code, path, role 등)을 키로 쓰지 마라.",
  "- 모든 값은 문자열이다(불리언·숫자·null 금지, 없으면 \"\"). 필수(required)는 'Y' 또는 'N' 문자열로 적어라.",
  "",
  "[각 섹션의 영문 key]",
  schemaForPrompt(),
  "",
  "[예시] (형식만 참고 — 내용은 입력 문서에서 추출)",
  '{"screens":[{"basic":{"screenCode":"SCR-001","screenName":"상품 목록","description":"상품을 둘러본다","domainMenu":"","route":"/products","permission":"사용자","states":"","priorPlan":"","priorSchemaApi":"","sources":""},"tables":{"composition":[],"fields":[{"fieldCode":"FLD-01","label":"상품명","dataKey":"name","type":"string","required":"Y","rule":"","schema":"","testId":""}],"actions":[{"actionCode":"ACT-01","actionName":"상세 이동","trigger":"카드 클릭","handling":"상세 화면으로 이동","api":"","onSuccess":"","onFailure":"","nextScreen":"","testId":""}],"apis":[],"acceptance":[],"undecided":[],"docReflect":[]}}]}',
  "",
  "[출력] 위 형식을 따르는 JSON 한 개만 출력하라. 코드펜스·설명·마커 금지. 순수 JSON.",
].join("\n");

const buildExtractUser = (text: string): string =>
  [
    "아래 문서에서 화면 정의 데이터를 추출해 지정된 JSON 모델로만 출력하라.",
    "",
    "===== 문서 =====",
    text || "(비어 있음)",
    "",
    "(위 스키마를 따르는 JSON 한 개만 출력. 설명·코드펜스 금지.)",
  ].join("\n");

export const extractScreenSpec = async (text: string): Promise<ScreenSpecDoc> => {
  const baseUser = buildExtractUser(text.slice(0, MAX_INPUT_CHARS));
  const raw = await callWithRepair(
    EXTRACT_SYSTEM,
    baseUser,
    (r) => (hasContent(coerceLooseDoc(r)) ? [] : ["문서에서 화면 정보를 추출하지 못했습니다. 화면·필드·액션 등을 스키마 JSON 으로 채워 다시 출력하라."]),
    buildRepairFromBase(baseUser, "(같은 JSON 스키마로 순수 JSON 하나만 다시 출력하라.)"),
  );
  return coerceLooseDoc(raw);
};

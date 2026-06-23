import type { ReferenceDoc } from "./contract.js";
import {
  coerceLooseDoc,
  contentScore,
  fromLlmJson,
  hasContent,
  schemaForPrompt,
  toLlmJson,
  validateScreenModelSection,
  type ScreenSpecDoc,
} from "./screen-spec.js";

const LLM_BASE = (process.env.ANTHROPIC_BASE_URL || "http://localhost:8317").replace(/\/+$/, "");
const LLM_KEY = process.env.ANTHROPIC_API_KEY || "no-key-required";
const LLM_MODEL = process.env.SCREEN_DESIGN_MODEL || "claude-opus-4-8";
const MAX_REPAIR_ATTEMPTS = 3;
// 게이트웨이가 수용하는 상한까지 올린다(probe 결과 100000까지 200). revise 를 2단계로 쪼개도
// HTML 단독 출력이 큰 앱에서 커질 수 있어 넉넉한 상한을 둔다.
const MAX_OUTPUT_TOKENS = 64000;
const MAX_INPUT_CHARS = 200_000;
const MIN_GUARD_CONTENT = 6;
const MAX_CONTENT_LOSS_RATIO = 0.25;

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
      max_tokens: MAX_OUTPUT_TOKENS,
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
  "[작업]",
  "- 사용자의 수정 요청과 갱신된 화면 정의서를 기존 HTML 에 반영하라.",
  "- 요청과 무관한 부분(다른 화면·레이아웃·목업 데이터·스크립트 로직)은 기존 HTML 을 그대로 보존하라. 임의 재작성·재디자인 금지.",
  "- 변경으로 추가/수정된 요소도 기존과 동일한 스타일·동작 패턴(화면 전환 함수, 탭, 모달 등)을 따르게 하라.",
  "",
  "[출력 형식]",
  "- 출력은 완전한 HTML 문서 하나뿐이다. 첫 줄은 <!DOCTYPE html>, 마지막은 </html>.",
  "- 서론·설명·코드펜스·마크다운·도구호출 금지. HTML 외의 텍스트를 절대 쓰지 마라.",
  "",
  HTML_QUALITY_RULES,
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
  return refs ? "\n===== 참고자료 =====\n" + refs : "";
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

// 인라인 <script> 의 JavaScript 문법을 검증한다. 문법 오류 1개면 스크립트 전체가 실행되지 않아
// go()/이벤트 리스너가 정의되지 않고 화면 전환·클릭이 전부 죽는다(저충실 정적 페이지로 전락).
export const validateScriptSyntax = (html: string): string[] => {
  const issues: string[] = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1] || "";
    const body = m[2] || "";
    n += 1;
    if (/\bsrc\s*=/i.test(attrs)) continue; // 외부 스크립트(예: Tailwind CDN)는 본문 없음
    const type = (attrs.match(/type\s*=\s*["']([^"']+)["']/i) || [])[1]?.toLowerCase();
    // 일반 JS 만 검증. module(import/export)·JSON·템플릿 등은 new Function 으로 검증 불가하므로 스킵.
    if (type && type !== "text/javascript" && type !== "application/javascript") continue;
    if (!body.trim()) continue;
    try {
      // 구문만 검증(실행하지 않음). new Function 은 body 를 파싱만 한다.
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
  // 구조가 깨졌으면(잘림 등) script 검증은 무의미하므로 구조 이슈를 우선 반환.
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
): Promise<string> => {
  const attempt = async (n: number, user: string): Promise<string> => {
    const raw = await callLlm(system, user);
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

export interface ReviseResult {
  html: string;
  specDoc: string;
  screenModel: ScreenSpecDoc;
  summary: string;
}

const cleanSection = (sec: string | null): string =>
  sec === null ? "" : stripControlChars(cutBeforeHtml(sec)).trim();

// revise 는 2단계로 분리한다: 한 번에 spec+screenModel+html 을 전부 출력하면 합산이 출력 토큰 한도를
// 넘어 HTML 이 절단되어 매번 실패한다. ① 문서(기획서+화면정의서)만 갱신 → ② 갱신 문서를 반영해 기존 HTML 편집.
export const reviseAll = async (
  currentHtml: string,
  specDoc: string,
  currentScreenModel: ScreenSpecDoc,
  instruction: string,
): Promise<ReviseResult> => {
  const beforeScore = contentScore(currentScreenModel);
  const reductionAllowed = /삭제|지워|지우|빼|제거|없애|비워|비우|초기화|리셋|클리어|간소화|줄여|남겨|remove|delete|clear|reset/i.test(instruction);

  // ① 문서 갱신(HTML 미포함 — 작은 출력)
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

  // ② 갱신된 문서를 반영해 기존 HTML 편집(HTML 만 출력 — 한도 내)
  const htmlRaw = await callWithRepair(
    REVISE_HTML_SYSTEM,
    buildReviseHtmlUser(currentHtml, newModel, instruction, summary),
    (r) => validateHtml(extractHtml(r)),
    (issues, prevRaw) => buildRepairUser(extractHtml(prevRaw), issues),
  );

  return {
    html: extractHtml(htmlRaw),
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

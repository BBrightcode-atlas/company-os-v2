import { createHash, randomBytes } from "node:crypto";

// Figma 등록(외부 viewer 파일) 전용 MCP 추출기.
//
// 왜 REST 가 아니라 MCP 인가:
//   외부 클라이언트 소유 + viewer 권한 파일은 Figma REST(/v1/files, /nodes)가
//   403 "File not exportable" 로 영구 차단된다(본인 PAT 로도). 반면 원격 Figma MCP
//   (mcp.figma.com)의 read-path 는 OAuth 계정 컨텍스트로 문서 트리를 읽어 우회된다.
//   PoC 로 워커와 동일한 raw fetch + Bearer 토큰이 get_metadata 268KB 레이아웃을
//   받아냄을 실증(stateless, 세션ID·SDK 불필요).
//
// 이 모듈은 (1) MCP get_metadata 호출, (2) 그 XML 을 화면별 레이아웃으로 정규화
// (styleGuide 제외, mobile/PC 화면 프레임만) 두 가지를 제공한다.

export const FIGMA_MCP_URL = "https://mcp.figma.com/mcp";
const MCP_PROTOCOL_VERSION = "2025-06-18";
const FIGMA_MCP_TIMEOUT_MS = 30_000;
const NORM_MAX_LINES = 1_400;
const NORM_MAX_DEPTH = 8;

export type FigmaMcpReason =
  | "no_token"
  | "auth_required" // 401: 토큰 만료/무효 → 재인증 필요
  | "invalid_url"
  | "not_found"
  | "rate_limited"
  | "mcp_error"
  | "network";

export function figmaMcpError(reason: FigmaMcpReason, message: string): Error & { figmaMcpReason: FigmaMcpReason } {
  const err = new Error(message) as Error & { figmaMcpReason: FigmaMcpReason };
  err.figmaMcpReason = reason;
  return err;
}

export function figmaMcpReasonMessage(reason: FigmaMcpReason, fallback?: string): string {
  switch (reason) {
    case "no_token":
    case "auth_required":
      return "Figma 인증 토큰이 필요합니다. 승인된 클라이언트(Claude Code/Codex)의 mcp:connect access 토큰을 토큰칸에 입력한 뒤 다시 등록하세요.";
    case "invalid_url":
      return "유효한 Figma 파일 URL 이 아닙니다.";
    case "not_found":
      return "Figma 파일/노드를 찾을 수 없습니다(접근 권한 확인).";
    case "rate_limited":
      return "Figma 요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.";
    default:
      return fallback ?? "Figma MCP 추출에 실패했습니다.";
  }
}

// figma.com 디자인 URL 에서 fileKey 와 (있으면) nodeId 추출.
export function parseFigmaTarget(value: string): { fileKey: string; nodeId: string | null } {
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    throw figmaMcpError("invalid_url", "Figma URL 을 해석할 수 없습니다.");
  }
  if (!/(^|\.)figma\.com$/i.test(u.hostname)) {
    throw figmaMcpError("invalid_url", "figma.com URL 이 아닙니다.");
  }
  const match = u.pathname.match(/\/(?:design|file)\/([A-Za-z0-9]+)/);
  if (!match) throw figmaMcpError("invalid_url", "Figma 파일 키를 URL 에서 찾을 수 없습니다.");
  const raw = u.searchParams.get("node-id");
  const nodeId = raw ? raw.replace(/-/g, ":") : null;
  return { fileKey: match[1], nodeId };
}

// SSE("data: {...}") 또는 순수 JSON 응답에서 JSON-RPC 메시지들을 뽑는다.
function parseMcpBody(text: string, contentType: string): Array<Record<string, unknown>> {
  if (contentType.includes("text/event-stream")) {
    const out: Array<Record<string, unknown>> = [];
    for (const line of text.split(/\r?\n/)) {
      if (!line.startsWith("data:")) continue;
      try {
        out.push(JSON.parse(line.slice(5).trim()) as Record<string, unknown>);
      } catch {
        /* 비-JSON data 라인 무시 */
      }
    }
    return out;
  }
  try {
    return [JSON.parse(text) as Record<string, unknown>];
  } catch {
    return [];
  }
}

async function mcpRpc(
  token: string,
  body: Record<string, unknown>,
  extraHeaders: Record<string, string> = {},
): Promise<{ status: number; sessionId: string | null; messages: Array<Record<string, unknown>>; raw: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FIGMA_MCP_TIMEOUT_MS);
  try {
    const res = await fetch(FIGMA_MCP_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        authorization: `Bearer ${token}`,
        "mcp-protocol-version": MCP_PROTOCOL_VERSION,
        ...extraHeaders,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return {
      status: res.status,
      sessionId: res.headers.get("mcp-session-id"),
      messages: parseMcpBody(text, res.headers.get("content-type") ?? ""),
      raw: text.slice(0, 300),
    };
  } catch (error) {
    throw figmaMcpError("network", error instanceof Error ? error.message : String(error));
  } finally {
    clearTimeout(timer);
  }
}

// 원격 Figma MCP 의 get_metadata 를 호출해 노드의 레이아웃 XML 을 가져온다.
// nodeId 가 없으면 파일 루트(0:1)를 대상으로 한다.
export async function figmaMcpGetMetadata(
  token: string,
  fileKey: string,
  nodeId: string | null,
): Promise<string> {
  if (!token) throw figmaMcpError("no_token", "Figma 토큰이 없습니다.");

  // 1) initialize (Figma MCP 는 stateless 라 세션ID 가 없을 수 있다)
  const init = await mcpRpc(token, {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "cos-blueprint-figma", version: "0.1.0" },
    },
  });
  if (init.status === 401) throw figmaMcpError("auth_required", "Figma 토큰이 만료/무효합니다.");
  if (init.status !== 200) throw figmaMcpError("network", `initialize HTTP ${init.status}: ${init.raw}`);
  const sessionHeaders: Record<string, string> = init.sessionId ? { "mcp-session-id": init.sessionId } : {};

  // 2) initialized 알림(있으면 예의상)
  await mcpRpc(token, { jsonrpc: "2.0", method: "notifications/initialized" }, sessionHeaders).catch(() => null);

  // 3) tools/call get_metadata
  const call = await mcpRpc(token, {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "get_metadata",
      arguments: {
        fileKey,
        nodeId: nodeId ?? "0:1",
        clientLanguages: "typescript",
        clientFrameworks: "react",
      },
    },
  }, sessionHeaders);

  if (call.status === 401) throw figmaMcpError("auth_required", "Figma 토큰이 만료/무효합니다.");
  if (call.status === 429) throw figmaMcpError("rate_limited", "rate limited");
  if (call.status !== 200) throw figmaMcpError("network", `get_metadata HTTP ${call.status}: ${call.raw}`);

  const result = call.messages.find((m) => m.id === 3);
  const err = result?.error as { message?: string } | undefined;
  if (err) {
    if (/not found|no such|cannot find/i.test(err.message ?? "")) throw figmaMcpError("not_found", err.message ?? "not found");
    throw figmaMcpError("mcp_error", err.message ?? "MCP error");
  }
  const content = ((result?.result as { content?: Array<{ type: string; text?: string }> } | undefined)?.content) ?? [];
  const xml = content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n").trim();
  if (!xml) throw figmaMcpError("mcp_error", "get_metadata 응답이 비어 있습니다.");
  return xml;
}

// ── 정규화: get_metadata XML → 화면별 레이아웃 ──────────────────────────────

type MetaNode = {
  tag: string;
  attrs: Record<string, string>;
  children: MetaNode[];
};

// get_metadata XML(잘 구성된 태그 트리)을 가벼운 노드 트리로 파싱한다.
function parseMetaXml(xml: string): MetaNode | null {
  const tagRe = /<(\/?)([a-zA-Z][\w-]*)((?:\s+[\w-]+="[^"]*")*)\s*(\/?)>/g;
  const attrRe = /([\w-]+)="([^"]*)"/g;
  const root: MetaNode = { tag: "#root", attrs: {}, children: [] };
  const stack: MetaNode[] = [root];
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(xml)) !== null) {
    const [, closing, tag, attrStr, selfClose] = m;
    if (closing) {
      if (stack.length > 1) stack.pop();
      continue;
    }
    const attrs: Record<string, string> = {};
    let a: RegExpExecArray | null;
    while ((a = attrRe.exec(attrStr)) !== null) attrs[a[1]] = a[2];
    const node: MetaNode = { tag, attrs, children: [] };
    stack[stack.length - 1].children.push(node);
    if (!selfClose) stack.push(node);
  }
  return root.children[0] ?? null;
}

function num(attrs: Record<string, string>, key: string): number {
  const v = Number(attrs[key]);
  return Number.isFinite(v) ? Math.round(v) : 0;
}

// 자식을 시각적 읽기 순서(상→하, 같은 행은 좌→우)로 재정렬한다.
//
// 왜: get_metadata 의 children 은 Figma z-order(겹침 순서)라 시각 위치와 무관하다.
// 그대로 나열하면 저해상도 와이어프레임에서 왼쪽 요소가 오른쪽으로 갈 수 있다(좌/우
// 정보가 @(x,y) 숫자에만 있어 LLM 이 재정렬 안 하면 뒤바뀜). 세로 범위가 겹치는
// 형제는 같은 행으로 묶고(x 오름차순) 행은 위에서 아래로 정렬해, 리스트 순서 자체가
// 읽기 순서가 되게 한다. 좌표가 없는 형제 집합은 원래 순서를 유지한다.
function sortChildrenReadingOrder(children: MetaNode[]): { sorted: MetaNode[]; rowCount: number } {
  if (children.length <= 1) return { sorted: children, rowCount: children.length };
  const items = children.map((node) => ({
    node,
    x: num(node.attrs, "x"),
    y: num(node.attrs, "y"),
    h: num(node.attrs, "height"),
  }));
  // 모든 형제가 좌표를 가질 때만 정렬(하나라도 없으면 신뢰 불가 → 원래 순서).
  const hasGeo = items.every((it) => it.x !== 0 || it.y !== 0 || it.h !== 0);
  if (!hasGeo) return { sorted: children, rowCount: 0 };
  items.sort((a, b) => a.y - b.y);
  const rows: Array<Array<(typeof items)[number]>> = [];
  let rowBottom = -Infinity;
  for (const it of items) {
    if (rows.length === 0 || it.y >= rowBottom) {
      rows.push([it]);
      rowBottom = it.y + Math.max(it.h, 1);
    } else {
      rows[rows.length - 1].push(it);
      rowBottom = Math.max(rowBottom, it.y + Math.max(it.h, 1));
    }
  }
  const sorted: MetaNode[] = [];
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
    for (const it of row) sorted.push(it.node);
  }
  return { sorted, rowCount: rows.length };
}

function outlineNode(node: MetaNode, lines: string[], depth: number): void {
  if (lines.length >= NORM_MAX_LINES || depth > NORM_MAX_DEPTH) return;
  const name = (node.attrs.name ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  const w = num(node.attrs, "width");
  const h = num(node.attrs, "height");
  const x = num(node.attrs, "x");
  const y = num(node.attrs, "y");
  const geo = w || h ? ` ${w}x${h}@(${x},${y})` : "";
  const text = node.attrs.characters ? ` ="${node.attrs.characters.replace(/\s+/g, " ").trim().slice(0, 80)}"` : "";
  const { sorted, rowCount } = sortChildrenReadingOrder(node.children);
  // 가로 배치 힌트: auto-layout 가로이거나 자식이 한 행에 2개 이상이면 좌→우 나열.
  const horizontal = (node.attrs.layoutMode ?? "").toUpperCase() === "HORIZONTAL" || (rowCount === 1 && sorted.length >= 2);
  const layHint = horizontal ? " (가로:좌→우)" : "";
  lines.push(`${"  ".repeat(depth)}- [${node.tag}] ${name}${geo}${layHint}${text}`.trimEnd());
  for (const child of sorted) {
    if (lines.length >= NORM_MAX_LINES) break;
    outlineNode(child, lines, depth + 1);
  }
}

export type FigmaScreen = { section: string; name: string; width: number; height: number; outline: string };

export type FigmaNormalized = {
  fileName: string;
  sections: string[];
  screenCount: number;
  screens: FigmaScreen[];
  body: string; // source 본문에 그대로 넣을 마크다운
};

// 캔버스 XML → 화면별 레이아웃. styleGuide(디자인 토큰 문서)는 제외하고
// mobile/PC 등 화면 섹션의 직속 프레임을 "화면"으로 본다.
export function normalizeFigmaMetadata(xml: string): FigmaNormalized {
  const root = parseMetaXml(xml);
  if (!root) {
    return { fileName: "Figma", sections: [], screenCount: 0, screens: [], body: xml.slice(0, 4000) };
  }
  const fileName = (root.attrs.name ?? "Figma").trim();
  // 캔버스 직속 섹션들. 섹션이 없으면 캔버스 직속 프레임을 화면으로 본다.
  const sectionNodes = root.children.filter((c) => c.tag === "section");
  const containers = sectionNodes.length > 0 ? sectionNodes : [root];

  const screens: FigmaScreen[] = [];
  const sectionNames: string[] = [];
  for (const section of containers) {
    const sectionName = (section.attrs.name ?? "").trim();
    if (sectionNodes.length > 0) sectionNames.push(sectionName || "(unnamed)");
    // 디자인 토큰/스타일 가이드 섹션은 와이어프레임 배치와 무관하므로 제외.
    if (/style\s*guide|design\s*system|토큰|token/i.test(sectionName)) continue;
    const frames = section.children.filter((c) => c.tag === "frame" || c.tag === "group" || c.tag === "instance");
    for (const frame of frames) {
      const lines: string[] = [];
      outlineNode(frame, lines, 0);
      screens.push({
        section: sectionName || "(canvas)",
        name: (frame.attrs.name ?? "(unnamed)").trim().slice(0, 60),
        width: num(frame.attrs, "width"),
        height: num(frame.attrs, "height"),
        outline: lines.join("\n"),
      });
    }
  }

  const bodyParts: string[] = [
    `## Figma 파일`,
    `${fileName}`,
    sectionNames.length ? `## 섹션\n${sectionNames.map((s) => `- ${s}`).join("\n")}` : null,
    `## 화면 레이아웃 (${screens.length}개, styleGuide 제외)`,
    ...screens.map((s) => `### [${s.section}] ${s.name} (${s.width}x${s.height})\n${s.outline}`),
  ].filter((p): p is string => p !== null);

  return {
    fileName,
    sections: sectionNames,
    screenCount: screens.length,
    screens,
    body: bodyParts.join("\n\n"),
  };
}

// ── 추출 오케스트레이션: bare 파일 URL(노드 미지정) 처리 ────────────────────
//
// Figma MCP get_metadata 는 문서 루트("0:1")를 거부하고 "Top-level pages" 안내를
// 돌려준다. 그래서 노드 미지정 시: 페이지 목록을 파싱 → 페이지별 get_metadata →
// 정규화 결과를 병합한다. 노드 지정 시엔 단일 추출.

function isInvalidNodeNotice(text: string): boolean {
  return /node ID provided was invalid|Top-level pages of the document/i.test(text);
}

function parseFigmaPageList(text: string): Array<{ id: string; name: string }> {
  const out: Array<{ id: string; name: string }> = [];
  for (const m of text.matchAll(/-\s*(\d+:\d+)\s*:\s*([^\n]*)/g)) {
    out.push({ id: m[1], name: (m[2] ?? "").trim() });
  }
  return out;
}

export async function figmaMcpExtract(
  token: string,
  fileKey: string,
  nodeId: string | null,
): Promise<FigmaNormalized> {
  // 노드 지정: 단일 추출(검증된 경로).
  if (nodeId) {
    const xml = await figmaMcpGetMetadata(token, fileKey, nodeId);
    if (isInvalidNodeNotice(xml)) {
      throw figmaMcpError("not_found", "지정한 노드를 찾을 수 없습니다. Figma 에서 프레임 선택 후 'Copy link to selection' URL 을 쓰세요.");
    }
    return normalizeFigmaMetadata(xml);
  }

  // bare 파일 URL: 루트가 페이지 목록 안내를 돌려준다 → 페이지별 추출 후 병합.
  const probe = await figmaMcpGetMetadata(token, fileKey, "0:1");
  if (!isInvalidNodeNotice(probe)) return normalizeFigmaMetadata(probe);

  const pages = parseFigmaPageList(probe);
  if (pages.length === 0) throw figmaMcpError("not_found", "문서에서 페이지를 찾지 못했습니다.");

  const screens: FigmaScreen[] = [];
  const sectionNames: string[] = [];
  for (const page of pages) {
    const xml = await figmaMcpGetMetadata(token, fileKey, page.id).catch(() => null);
    if (!xml || isInvalidNodeNotice(xml)) continue;
    const n = normalizeFigmaMetadata(xml);
    for (const s of n.screens) screens.push({ ...s, section: s.section === "(canvas)" ? page.name : s.section });
    sectionNames.push(page.name);
  }

  const fileName = pages.length === 1 ? (pages[0].name || "Figma") : `Figma (${pages.length} pages)`;
  const body = [
    `## Figma 파일`,
    `${fileName}`,
    sectionNames.length ? `## 페이지\n${sectionNames.map((s) => `- ${s}`).join("\n")}` : null,
    `## 화면 레이아웃 (${screens.length}개, styleGuide 제외)`,
    ...screens.map((s) => `### [${s.section}] ${s.name} (${s.width}x${s.height})\n${s.outline}`),
  ].filter((p): p is string => p !== null).join("\n\n");

  return { fileName, sections: sectionNames, screenCount: screens.length, screens, body };
}


//
// 원격 Figma MCP 는 OAuth 전용(PAT 불가). authorization-server 메타데이터로 확인:
//   authorize  = https://www.figma.com/oauth/mcp
//   token      = https://api.figma.com/v1/oauth/token
//   register   = https://api.figma.com/v1/oauth/mcp/register (DCR)
//   PKCE S256, scope mcp:connect, refresh_token 지원.

const FIGMA_OAUTH_AUTHORIZE = "https://www.figma.com/oauth/mcp";
const FIGMA_OAUTH_TOKEN = "https://api.figma.com/v1/oauth/token";
const FIGMA_OAUTH_REGISTER = "https://api.figma.com/v1/oauth/mcp/register";
const FIGMA_OAUTH_SCOPE = "mcp:connect";
const FIGMA_MCP_RESOURCE = "https://mcp.figma.com/mcp";

export type FigmaOAuthClient = { clientId: string; clientSecret?: string };
export type FigmaToken = { accessToken: string; refreshToken?: string; expiresAt?: number };

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function randomState(): string {
  return b64url(randomBytes(16));
}

// Dynamic Client Registration: redirect_uri 를 등록하고 client_id(/secret)를 받는다.
export async function registerFigmaOAuthClient(redirectUri: string): Promise<FigmaOAuthClient> {
  const res = await fetch(FIGMA_OAUTH_REGISTER, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_name: "Company OS — Blueprint",
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "client_secret_post",
      scope: FIGMA_OAUTH_SCOPE,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw figmaMcpError("network", `DCR HTTP ${res.status}: ${text.slice(0, 200)}`);
  const j = JSON.parse(text) as { client_id?: string; client_secret?: string };
  if (!j.client_id) throw figmaMcpError("network", "DCR 응답에 client_id 가 없습니다.");
  return { clientId: j.client_id, clientSecret: j.client_secret };
}

export function buildFigmaAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  challenge: string;
  state: string;
}): string {
  const u = new URL(FIGMA_OAUTH_AUTHORIZE);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", input.clientId);
  u.searchParams.set("redirect_uri", input.redirectUri);
  u.searchParams.set("code_challenge", input.challenge);
  u.searchParams.set("code_challenge_method", "S256");
  u.searchParams.set("state", input.state);
  u.searchParams.set("scope", FIGMA_OAUTH_SCOPE);
  u.searchParams.set("resource", FIGMA_MCP_RESOURCE);
  return u.toString();
}

function parseTokenResponse(text: string, status: number): FigmaToken {
  if (status !== 200) throw figmaMcpError("auth_required", `token HTTP ${status}: ${text.slice(0, 200)}`);
  const j = JSON.parse(text) as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!j.access_token) throw figmaMcpError("auth_required", "토큰 응답에 access_token 이 없습니다.");
  return {
    accessToken: j.access_token,
    refreshToken: j.refresh_token,
    expiresAt: j.expires_in ? Date.now() + j.expires_in * 1000 : undefined,
  };
}

export async function exchangeFigmaCode(input: {
  client: FigmaOAuthClient;
  code: string;
  verifier: string;
  redirectUri: string;
}): Promise<FigmaToken> {
  const form = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: input.client.clientId,
    code_verifier: input.verifier,
  });
  if (input.client.clientSecret) form.set("client_secret", input.client.clientSecret);
  const res = await fetch(FIGMA_OAUTH_TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  return parseTokenResponse(await res.text(), res.status);
}

export async function refreshFigmaToken(input: {
  client: FigmaOAuthClient;
  refreshToken: string;
}): Promise<FigmaToken> {
  const form = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
    client_id: input.client.clientId,
  });
  if (input.client.clientSecret) form.set("client_secret", input.client.clientSecret);
  const res = await fetch(FIGMA_OAUTH_TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const token = parseTokenResponse(await res.text(), res.status);
  // refresh 응답에 refresh_token 이 없으면 기존 것을 유지한다.
  if (!token.refreshToken) token.refreshToken = input.refreshToken;
  return token;
}

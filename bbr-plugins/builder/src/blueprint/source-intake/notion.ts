import { Buffer } from "node:buffer";
import { createRequire } from "node:module";
import type { SourceIntakeResult } from "./types.js";
import { decodeBasicHtmlEntities, extractUrlText, fetchRawUrl } from "./url.js";

const require = createRequire(import.meta.url);

const NOTION_MAX_DEPTH = 5;
const NOTION_MAX_PAGES = 50;
const NOTION_API_URL = "https://www.notion.so/api/v3/loadPageChunk";
const NOTION_SIGNED_FILE_URLS_API_URL = "https://www.notion.so/api/v3/getSignedFileUrls";
const NOTION_API_CHUNK_LIMIT = 100;
const NOTION_API_MAX_CHUNKS = 25;
const NOTION_API_MAX_BLOCK_HYDRATION_REQUESTS = 75;
const NOTION_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;

type MammothMarkdownResult = {
  value: string;
  messages?: Array<{ type?: string; message?: string }>;
};

type MammothModule = {
  convertToMarkdown(input: { buffer: Buffer }, options?: Record<string, unknown>): Promise<MammothMarkdownResult>;
};

const mammoth = require("mammoth") as MammothModule;

type NotionPageResult = {
  url: string;
  title: string;
  depth: number;
  source: "api" | "html";
  status: "fetched" | "failed";
  pageId?: string;
  httpStatus?: number;
  contentType?: string;
  text: string;
  childUrls: string[];
  externalLinks: string[];
  figmaLinks: string[];
  partial?: boolean;
  error?: string;
};

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

export function normalizeNotionPageId(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const compact = value.replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(compact)) return undefined;
  return [
    compact.slice(0, 8),
    compact.slice(8, 12),
    compact.slice(12, 16),
    compact.slice(16, 20),
    compact.slice(20),
  ].join("-");
}

export function notionPageIdFromUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    const path = decodeURIComponent(url.pathname);
    const uuid = path.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
    if (uuid) return normalizeNotionPageId(uuid);
    const compact = path.match(/[0-9a-f]{32}/i)?.[0];
    return normalizeNotionPageId(compact);
  } catch {
    return undefined;
  }
}

export function notionPageUrl(pageId: string): string {
  return `https://www.notion.so/${pageId.replace(/-/g, "")}`;
}

function notionCrawlKey(value: string): string {
  const pageId = notionPageIdFromUrl(value);
  return pageId ? `page:${pageId}` : normalizeNotionPageUrl(value);
}

export function isNotionSharedPageUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = normalizeHost(url.hostname);
    if (url.pathname.startsWith("/api/")) return false;
    if (host === "app.notion.com" || host === "notion.com") return Boolean(notionPageIdFromUrl(value));
    return host === "notion.so"
      || host.endsWith(".notion.so")
      || host === "notion.site"
      || host.endsWith(".notion.site");
  } catch {
    return false;
  }
}

function normalizeNotionPageUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  url.search = "";
  return url.toString();
}

function sameCrawlScope(rootUrl: string, candidateUrl: string): boolean {
  const root = new URL(rootUrl);
  const candidate = new URL(candidateUrl);
  const rootHost = normalizeHost(root.hostname);
  const candidateHost = normalizeHost(candidate.hostname);
  if (notionPageIdFromUrl(rootUrl) && notionPageIdFromUrl(candidateUrl)) {
    return true;
  }
  if (rootHost.endsWith(".notion.site") || rootHost === "notion.site") {
    return candidateHost === rootHost;
  }
  if (rootHost.endsWith(".notion.so") || rootHost === "notion.so") {
    return candidateHost.endsWith(".notion.so") || candidateHost === "notion.so";
  }
  return candidateHost === rootHost;
}

function htmlAttribute(tag: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(new RegExp(`\\b${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function metaContent(raw: string, names: string[]): string | null {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  for (const match of raw.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const key = htmlAttribute(tag, "property") ?? htmlAttribute(tag, "name");
    if (!key || !wanted.has(key.toLowerCase())) continue;
    const content = htmlAttribute(tag, "content");
    if (content) return decodeBasicHtmlEntities(content).trim();
  }
  return null;
}

function titleFromHtml(raw: string): string | null {
  const metaTitle = metaContent(raw, ["og:title", "twitter:title", "title"]);
  if (metaTitle) return metaTitle.replace(/\s+\|\s+Notion$/i, "").trim();
  const title = raw.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (!title) return null;
  return decodeBasicHtmlEntities(title.replace(/<[^>]+>/g, " "))
    .replace(/\s+\|\s+Notion$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeResolvedUrl(value: string, baseUrl?: string): string | null {
  const raw = decodeBasicHtmlEntities(value).trim();
  if (!raw || raw.startsWith("#") || /^[a-z]+:/i.test(raw) && !/^https?:/i.test(raw)) return null;
  try {
    const url = new URL(raw, baseUrl);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function isFigmaLinkUrl(value: string): boolean {
  try {
    const host = normalizeHost(new URL(value).hostname);
    return host === "figma.com" || host.endsWith(".figma.com") || host === "figma.site" || host.endsWith(".figma.site");
  } catch {
    return false;
  }
}

function splitLinksByKind(links: string[], rootUrl: string): {
  notionLinks: string[];
  externalLinks: string[];
  figmaLinks: string[];
} {
  const notionLinks: string[] = [];
  const externalLinks: string[] = [];
  const figmaLinks: string[] = [];
  for (const link of unique(links)) {
    if (isNotionSharedPageUrl(link)) {
      const normalized = normalizeNotionPageUrl(link);
      if (sameCrawlScope(rootUrl, normalized)) notionLinks.push(normalized);
      continue;
    }
    externalLinks.push(link);
    if (isFigmaLinkUrl(link)) figmaLinks.push(link);
  }
  return {
    notionLinks: unique(notionLinks),
    externalLinks: unique(externalLinks),
    figmaLinks: unique(figmaLinks),
  };
}

function extractRawUrls(value: string): string[] {
  const links: string[] = [];
  for (const match of value.matchAll(/https?:\/\/[^\s<>"'`)]+/gi)) {
    const normalized = normalizeResolvedUrl(match[0].replace(/[.,;:!?]+$/g, ""));
    if (normalized) links.push(normalized);
  }
  return unique(links);
}

function extractHtmlLinks(raw: string, baseUrl: string): string[] {
  const links: string[] = [];
  for (const match of raw.matchAll(/<a\b[^>]*\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
    const normalized = normalizeResolvedUrl(match[2] ?? match[3] ?? match[4] ?? "", baseUrl);
    if (normalized) links.push(normalized);
  }
  links.push(...extractRawUrls(raw));
  return unique(links);
}

function fallbackTitle(url: string): string {
  const parsed = new URL(url);
  const segment = decodeURIComponent(parsed.pathname.split("/").filter(Boolean).at(-1) ?? parsed.hostname);
  return segment.replace(/[-_]+/g, " ").trim() || parsed.hostname;
}

type NotionRichText = unknown[];

type NotionBlock = {
  id: string;
  type: string;
  properties?: Record<string, unknown>;
  content?: string[] | null;
  format?: Record<string, unknown> | null;
};

type NotionRecordMap = {
  block: Record<string, unknown>;
};

type NotionRenderContext = {
  rootUrl: string;
  currentPageId: string;
  childUrls: string[];
  externalLinks: string[];
  figmaLinks: string[];
  attachments: NotionAttachmentRef[];
};

type NotionAttachmentRef = {
  blockId: string;
  type: string;
  title: string;
  source: string;
  fileName: string;
};

function blockFromRecordMap(recordMap: NotionRecordMap, id: string): NotionBlock | null {
  const entry = asRecord(recordMap.block[id]);
  const block = asRecord(asRecord(entry.value).value);
  const type = stringValue(block.type);
  if (!type) return null;
  return {
    id: stringValue(block.id) ?? id,
    type,
    properties: asRecord(block.properties),
    content: Array.isArray(block.content) ? stringArray(block.content) : null,
    format: Object.keys(asRecord(block.format)).length > 0 ? asRecord(block.format) : null,
  };
}

function propertyRichText(block: NotionBlock, key: string): NotionRichText | undefined {
  const value = block.properties?.[key];
  return Array.isArray(value) ? value : undefined;
}

function richTextLinks(value: NotionRichText | undefined): string[] {
  if (!value) return [];
  const links: string[] = [];
  for (const part of value) {
    if (!Array.isArray(part)) continue;
    const text = typeof part[0] === "string" ? part[0] : "";
    links.push(...extractRawUrls(text));
    const annotations = Array.isArray(part[1]) ? part[1] : [];
    for (const annotation of annotations) {
      if (!Array.isArray(annotation) || annotation[0] !== "a" || typeof annotation[1] !== "string") continue;
      const normalized = normalizeResolvedUrl(annotation[1]);
      if (normalized) links.push(normalized);
    }
  }
  return unique(links);
}

function richTextToMarkdown(value: NotionRichText | undefined): string {
  if (!value) return "";
  return value.map((part) => {
    if (!Array.isArray(part)) return "";
    const text = typeof part[0] === "string" ? part[0] : "";
    const annotations = Array.isArray(part[1]) ? part[1] : [];
    const link = annotations.find((annotation) => Array.isArray(annotation) && annotation[0] === "a" && typeof annotation[1] === "string");
    const href = Array.isArray(link) ? normalizeResolvedUrl(String(link[1])) : null;
    return href ? `${text} (${href})` : text;
  }).join("");
}

function blockText(block: NotionBlock): string {
  return richTextToMarkdown(propertyRichText(block, "title"))
    || richTextToMarkdown(propertyRichText(block, "caption"))
    || richTextToMarkdown(propertyRichText(block, "source"));
}

function attachmentMarker(blockId: string): string {
  return `[[NOTION_ATTACHMENT:${blockId}]]`;
}

function fileNameFromAttachmentSource(source: string, fallback: string): string {
  const raw = source.split(":").at(-1) ?? fallback;
  try {
    return decodeURIComponent(raw).trim() || fallback;
  } catch {
    return raw.trim() || fallback;
  }
}

function attachmentRefFromBlock(block: NotionBlock, title: string): NotionAttachmentRef | null {
  const source = richTextToMarkdown(propertyRichText(block, "source"))
    || stringValue(block.format?.source)
    || stringValue(block.format?.display_source)
    || "";
  if (!source.startsWith("attachment:")) return null;
  return {
    blockId: block.id,
    type: block.type,
    title: title || source,
    source,
    fileName: fileNameFromAttachmentSource(source, title || block.id),
  };
}

function collectBlockLinks(block: NotionBlock, ctx: NotionRenderContext): void {
  const links: string[] = [];
  for (const value of Object.values(block.properties ?? {})) {
    if (Array.isArray(value)) links.push(...richTextLinks(value));
  }
  const format = block.format ?? {};
  for (const key of ["display_source", "source", "link"] as const) {
    const normalized = normalizeResolvedUrl(stringValue(format[key]) ?? "");
    if (normalized) links.push(normalized);
  }
  const split = splitLinksByKind(links, ctx.rootUrl);
  for (const link of split.notionLinks) {
    if (notionPageIdFromUrl(link) !== ctx.currentPageId) ctx.childUrls.push(link);
  }
  ctx.externalLinks.push(...split.externalLinks);
  ctx.figmaLinks.push(...split.figmaLinks);
}

function pageBlockUrl(block: NotionBlock): string {
  return notionPageUrl(normalizeNotionPageId(block.id) ?? block.id);
}

function markdownTableCell(value: string): string {
  return value.replace(/\r?\n/g, "<br>").replace(/\|/g, "\\|").trim() || " ";
}

function renderTable(block: NotionBlock, recordMap: NotionRecordMap): string[] {
  const rowBlocks = (block.content ?? [])
    .map((id) => blockFromRecordMap(recordMap, id))
    .filter((row): row is NotionBlock => row !== null && row.type === "table_row");
  if (rowBlocks.length === 0) return [];

  const configuredColumns = stringArray(block.format?.table_block_column_order);
  const columns = configuredColumns.length > 0 ? configuredColumns : Object.keys(rowBlocks[0]?.properties ?? {});
  if (columns.length === 0) return [];

  const rows = rowBlocks.map((row) => columns.map((column) => richTextToMarkdown(propertyRichText(row, column))));
  const hasHeader = block.format?.table_block_column_header === true;
  const header = hasHeader ? rows.shift() ?? [] : columns.map((_, index) => `Column ${index + 1}`);
  const separator = header.map(() => "---");
  const renderRow = (row: string[]) => `| ${row.map(markdownTableCell).join(" | ")} |`;
  return [
    renderRow(header),
    renderRow(separator),
    ...rows.map(renderRow),
    "",
  ];
}

function renderChildren(ids: string[] | null | undefined, recordMap: NotionRecordMap, ctx: NotionRenderContext): string[] {
  const lines: string[] = [];
  for (const id of ids ?? []) {
    const block = blockFromRecordMap(recordMap, id);
    if (!block) continue;
    lines.push(...renderBlock(block, recordMap, ctx));
  }
  return lines;
}

function renderBlock(block: NotionBlock, recordMap: NotionRecordMap, ctx: NotionRenderContext): string[] {
  collectBlockLinks(block, ctx);
  if (block.type === "table") return renderTable(block, recordMap);
  if (block.type === "table_row") return [];

  const text = blockText(block);
  const lines: string[] = [];
  switch (block.type) {
    case "page": {
      if (normalizeNotionPageId(block.id) !== ctx.currentPageId) {
        const url = pageBlockUrl(block);
        if (sameCrawlScope(ctx.rootUrl, url)) ctx.childUrls.push(url);
        lines.push(`- 하위 페이지: ${text || block.id} (${url})`);
        return [...lines, ""];
      }
      break;
    }
    case "header":
      if (text) lines.push(`# ${text}`, "");
      break;
    case "sub_header":
      if (text) lines.push(`## ${text}`, "");
      break;
    case "sub_sub_header":
      if (text) lines.push(`### ${text}`, "");
      break;
    case "quote":
      if (text) lines.push(`> ${text}`, "");
      break;
    case "bulleted_list":
      if (text) lines.push(`- ${text}`);
      break;
    case "numbered_list":
      if (text) lines.push(`1. ${text}`);
      break;
    case "to_do":
      if (text) lines.push(`- [ ] ${text}`);
      break;
    case "divider":
      lines.push("---", "");
      break;
    case "image": {
      const source = stringValue(block.format?.display_source) ?? stringValue(block.format?.source);
      const attachment = attachmentRefFromBlock(block, text);
      if (attachment) {
        ctx.attachments.push(attachment);
        lines.push(attachmentMarker(block.id), "");
      } else if (source) {
        lines.push(renderMarkdownImage(text || source, source), "");
      } else if (text) {
        lines.push(text, "");
      }
      break;
    }
    case "file":
    case "pdf":
    case "video": {
      const source = stringValue(block.format?.display_source) ?? stringValue(block.format?.source);
      const attachment = attachmentRefFromBlock(block, text);
      lines.push(`- ${block.type}: ${text || attachment?.fileName || source || block.id}`);
      if (attachment) {
        ctx.attachments.push(attachment);
        lines.push(`  - Attachment: ${attachment.fileName}`, "", attachmentMarker(block.id), "");
      } else if (source) {
        lines.push(`  - Source: ${source}`);
      }
      break;
    }
    case "callout": {
      const icon = stringValue(block.format?.page_icon);
      if (text || icon) lines.push(`> ${icon ? `${icon} ` : ""}${text}`.trim(), "");
      break;
    }
    default:
      if (text) lines.push(text, "");
      break;
  }

  const childLines = renderChildren(block.content, recordMap, ctx);
  if (childLines.length > 0) lines.push(...childLines);
  return lines;
}

function renderNotionApiPage(recordMap: NotionRecordMap, pageId: string, rootUrl: string, url: string): {
  title: string;
  text: string;
  childUrls: string[];
  externalLinks: string[];
  figmaLinks: string[];
  attachments: NotionAttachmentRef[];
} {
  const rootBlock = blockFromRecordMap(recordMap, pageId);
  if (!rootBlock) throw new Error("Notion API response did not include the requested page block");
  const title = blockText(rootBlock) || fallbackTitle(url);
  const ctx: NotionRenderContext = {
    rootUrl,
    currentPageId: pageId,
    childUrls: [],
    externalLinks: [],
    figmaLinks: [],
    attachments: [],
  };
  collectBlockLinks(rootBlock, ctx);
  const text = [
    `# ${title}`,
    "",
    ...renderChildren(rootBlock.content, recordMap, ctx),
  ].join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return {
    title,
    text,
    childUrls: unique(ctx.childUrls).filter((link) => normalizeNotionPageUrl(link) !== normalizeNotionPageUrl(url)),
    externalLinks: unique(ctx.externalLinks),
    figmaLinks: unique(ctx.figmaLinks),
    attachments: ctx.attachments,
  };
}

function mergeNotionRecordMaps(target: NotionRecordMap, source: unknown): void {
  const sourceBlock = asRecord(asRecord(source).block);
  target.block = { ...target.block, ...sourceBlock };
}

function notionCursorHasMore(cursor: unknown): boolean {
  const stack = asRecord(cursor).stack;
  return Array.isArray(stack) && stack.length > 0;
}

async function fetchNotionApiRecordMapChunks(pageId: string): Promise<{ recordMap: NotionRecordMap; partial: boolean }> {
  const recordMap: NotionRecordMap = { block: {} };
  let cursor: unknown = { stack: [] };
  for (let chunkNumber = 0; chunkNumber < NOTION_API_MAX_CHUNKS; chunkNumber += 1) {
    const response = await fetch(NOTION_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "user-agent": "Paperclip-COS-Blueprint/0.1 (+https://paperclip.local)",
      },
      body: JSON.stringify({
        pageId,
        limit: NOTION_API_CHUNK_LIMIT,
        cursor,
        chunkNumber,
        verticalColumns: false,
      }),
    });
    if (!response.ok) throw new Error(`Notion API HTTP ${response.status}`);
    const json = await response.json() as unknown;
    const chunkRecordMap = asRecord(json).recordMap;
    if (!chunkRecordMap) throw new Error("Notion API response did not include a recordMap");
    mergeNotionRecordMaps(recordMap, chunkRecordMap);
    cursor = asRecord(json).cursor ?? { stack: [] };
    if (!notionCursorHasMore(cursor)) return { recordMap, partial: false };
  }
  return { recordMap, partial: true };
}

function hydratableBlockId(block: NotionBlock): string | null {
  if (block.type === "page") return null;
  return normalizeNotionPageId(block.id) ?? null;
}

function findBlocksWithMissingChildren(recordMap: NotionRecordMap, attemptedBlockIds: ReadonlySet<string>): string[] {
  const ids: string[] = [];
  for (const id of Object.keys(recordMap.block)) {
    const block = blockFromRecordMap(recordMap, id);
    if (!block?.content?.length) continue;
    const blockId = hydratableBlockId(block);
    if (!blockId || attemptedBlockIds.has(blockId)) continue;
    if (block.content.some((childId) => !recordMap.block[childId])) ids.push(blockId);
  }
  return unique(ids);
}

async function hydrateMissingNotionBlockChildren(recordMap: NotionRecordMap, rootPageId: string): Promise<boolean> {
  const attemptedBlockIds = new Set<string>([rootPageId]);
  let partial = false;

  for (let requestCount = 0; requestCount < NOTION_API_MAX_BLOCK_HYDRATION_REQUESTS; requestCount += 1) {
    const nextBlockId = findBlocksWithMissingChildren(recordMap, attemptedBlockIds)[0];
    if (!nextBlockId) return partial;
    attemptedBlockIds.add(nextBlockId);

    try {
      const hydrated = await fetchNotionApiRecordMapChunks(nextBlockId);
      mergeNotionRecordMaps(recordMap, hydrated.recordMap);
      if (hydrated.partial) partial = true;
    } catch {
      partial = true;
    }
  }

  return true;
}

async function fetchNotionApiRecordMap(pageId: string): Promise<{ recordMap: NotionRecordMap; partial: boolean }> {
  const fetched = await fetchNotionApiRecordMapChunks(pageId);
  const hydrationPartial = await hydrateMissingNotionBlockChildren(fetched.recordMap, pageId);
  return { recordMap: fetched.recordMap, partial: fetched.partial || hydrationPartial };
}

async function extractDocxAttachment(buffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.convertToMarkdown({ buffer: Buffer.from(buffer) });
  return result.value
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extensionFromFileName(fileName: string): string {
  return fileName.toLowerCase().split(".").pop() ?? "";
}

function isSupportedNotionAttachmentExtension(ext: string): boolean {
  return ext === "txt" || ext === "md" || ext === "markdown" || ext === "docx";
}

function isImageNotionAttachmentExtension(ext: string): boolean {
  return ["avif", "bmp", "gif", "jpeg", "jpg", "png", "svg", "webp"].includes(ext);
}

function markdownAltText(value: string): string {
  return value.replace(/\r?\n/g, " ").replace(/]/g, "\\]").trim() || "Notion image";
}

function markdownUrlTarget(value: string): string {
  return `<${value.replace(/>/g, "%3E")}>`;
}

function renderMarkdownImage(alt: string, source: string): string {
  return `![${markdownAltText(alt)}](${markdownUrlTarget(source)})`;
}

async function fetchNotionSignedFileUrl(ref: NotionAttachmentRef): Promise<string> {
  const response = await fetch(NOTION_SIGNED_FILE_URLS_API_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "user-agent": "Paperclip-COS-Blueprint/0.1 (+https://paperclip.local)",
    },
    body: JSON.stringify({
      urls: [{
        url: ref.source,
        permissionRecord: { table: "block", id: ref.blockId },
      }],
    }),
  });
  if (!response.ok) throw new Error(`Notion signed file URL HTTP ${response.status}`);
  const json = await response.json() as unknown;
  const signedUrls = asRecord(json).signedUrls;
  const signedUrl = Array.isArray(signedUrls) ? signedUrls[0] : null;
  if (typeof signedUrl !== "string" || !signedUrl) throw new Error("Notion signed file URL response was empty");
  return signedUrl;
}

async function fetchNotionAttachmentText(ref: NotionAttachmentRef): Promise<string> {
  const ext = extensionFromFileName(ref.fileName);
  if (!isSupportedNotionAttachmentExtension(ext)) {
    throw new Error(`Unsupported Notion attachment format: ${ext || ref.type}`);
  }

  const signedUrl = await fetchNotionSignedFileUrl(ref);
  const response = await fetch(signedUrl, {
    headers: {
      "user-agent": "Paperclip-COS-Blueprint/0.1 (+https://paperclip.local)",
    },
  });
  if (!response.ok) throw new Error(`Notion attachment HTTP ${response.status}`);
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > NOTION_ATTACHMENT_MAX_BYTES) {
    throw new Error(`Notion attachment is too large (${contentLength} bytes)`);
  }

  if (ext === "txt" || ext === "md" || ext === "markdown") {
    return (await response.text()).trim();
  }
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > NOTION_ATTACHMENT_MAX_BYTES) {
    throw new Error(`Notion attachment is too large (${buffer.byteLength} bytes)`);
  }
  if (ext === "docx") return extractDocxAttachment(buffer);
  throw new Error(`Unsupported Notion attachment format: ${ext || ref.type}`);
}

async function hydrateNotionAttachmentMarkers(text: string, attachments: NotionAttachmentRef[]): Promise<string> {
  let next = text;
  const uniqueAttachments = new Map(attachments.map((attachment) => [attachment.blockId, attachment]));
  for (const ref of uniqueAttachments.values()) {
    const marker = attachmentMarker(ref.blockId);
    if (!next.includes(marker)) continue;
    let replacement: string;
    try {
      const ext = extensionFromFileName(ref.fileName);
      if (isImageNotionAttachmentExtension(ext)) {
        replacement = renderMarkdownImage(ref.title || ref.fileName, await fetchNotionSignedFileUrl(ref));
      } else {
        const attachmentText = await fetchNotionAttachmentText(ref);
        replacement = [
          `#### 첨부 파일: ${ref.fileName}`,
          "",
          attachmentText || "_첨부 파일에서 텍스트를 추출하지 못했습니다._",
        ].join("\n").trim();
      }
    } catch (error) {
      const ext = extensionFromFileName(ref.fileName);
      replacement = isImageNotionAttachmentExtension(ext)
        ? renderMarkdownImage(ref.title || ref.fileName, ref.source)
        : [
          `#### 첨부 파일: ${ref.fileName}`,
          "",
          `_첨부 파일 본문을 가져오지 못했습니다: ${error instanceof Error ? error.message : String(error)}_`,
        ].join("\n").trim();
    }
    next = next.split(marker).join(replacement);
  }
  return next;
}

async function fetchNotionApiPage(url: string, rootUrl: string, depth: number, pageId: string): Promise<NotionPageResult> {
  const { recordMap, partial } = await fetchNotionApiRecordMap(pageId);
  const rendered = renderNotionApiPage(recordMap, pageId, rootUrl, url);
  const text = await hydrateNotionAttachmentMarkers(rendered.text, rendered.attachments);
  return {
    url,
    title: rendered.title,
    depth,
    source: "api",
    status: text ? "fetched" : "failed",
    pageId,
    text,
    childUrls: rendered.childUrls,
    externalLinks: rendered.externalLinks,
    figmaLinks: rendered.figmaLinks,
    partial,
    error: text
      ? partial ? `Notion API pagination reached ${NOTION_API_MAX_CHUNKS} chunks; output may be partial` : undefined
      : "empty Notion API body",
  };
}

function isNotionAppShell(raw: string, title: string | null, text: string): boolean {
  return /<div\s+id=["']notion-app["']/i.test(raw)
    && /window\.__notion_boot_data\s*=\s*null/i.test(raw)
    && (/^Notion(\s+\|.*)?$/i.test(title ?? "") || /JavaScript must be enabled in order to use Notion/i.test(text));
}

function requiredRedirectPageId(raw: string): string | undefined {
  const match = raw.match(/requiredRedirectMetadata",\s*(\{[^<]+?\})\s*\)/i);
  if (!match) return undefined;
  try {
    const parsed = JSON.parse(match[1]) as unknown;
    return normalizeNotionPageId(stringValue(asRecord(parsed).pageId));
  } catch {
    return undefined;
  }
}

async function fetchNotionPage(url: string, rootUrl: string, depth: number): Promise<NotionPageResult> {
  const pageId = notionPageIdFromUrl(url);
  let apiError: string | undefined;
  if (pageId) {
    try {
      return await fetchNotionApiPage(url, rootUrl, depth, pageId);
    } catch (error) {
      apiError = error instanceof Error ? error.message : String(error);
    }
  }

  try {
    const fetched = await fetchRawUrl(url);
    const finalUrl = normalizeNotionPageUrl(fetched.finalUrl || url);
    const text = extractUrlText(fetched.raw, fetched.contentType, { maxChars: 0 });
    const title = titleFromHtml(fetched.raw) ?? fallbackTitle(finalUrl);
    const redirectPageId = pageId ?? requiredRedirectPageId(fetched.raw);
    const htmlLinks = extractHtmlLinks(fetched.raw, finalUrl);
    const split = splitLinksByKind(htmlLinks, rootUrl);
    if (isNotionAppShell(fetched.raw, title, text)) {
      return {
        url: finalUrl,
        title: title === "Notion" ? fallbackTitle(finalUrl) : title,
        depth,
        source: "html",
        status: "failed",
        pageId: redirectPageId,
        httpStatus: fetched.status,
        contentType: fetched.contentType,
        text: "",
        childUrls: split.notionLinks.filter((link) => link !== finalUrl),
        externalLinks: split.externalLinks,
        figmaLinks: split.figmaLinks,
        error: [
          "Notion returned a JavaScript app shell without static page body",
          redirectPageId ? `pageId: ${redirectPageId}` : null,
          apiError ? `Notion API failed: ${apiError}` : null,
        ].filter((line): line is string => line !== null).join("; "),
      };
    }
    return {
      url: finalUrl,
      title,
      depth,
      source: "html",
      status: text ? "fetched" : "failed",
      pageId: redirectPageId,
      httpStatus: fetched.status,
      contentType: fetched.contentType,
      text,
      childUrls: split.notionLinks.filter((link) => link !== finalUrl),
      externalLinks: split.externalLinks,
      figmaLinks: split.figmaLinks,
      error: text ? undefined : "empty extracted body",
    };
  } catch (error) {
    return {
      url,
      title: fallbackTitle(url),
      depth,
      source: pageId ? "api" : "html",
      status: "failed",
      pageId,
      text: "",
      childUrls: [],
      externalLinks: [],
      figmaLinks: [],
      error: [apiError, error instanceof Error ? error.message : String(error)].filter(Boolean).join("; "),
    };
  }
}

type NotionPageEntry = { page: NotionPageResult; index: number };

function notionPageResultKey(page: NotionPageResult): string {
  return page.pageId ? `page:${page.pageId}` : notionCrawlKey(page.url);
}

function buildNotionPageLookup(pages: NotionPageResult[]): Map<string, NotionPageEntry> {
  const lookup = new Map<string, NotionPageEntry>();
  pages.forEach((page, index) => {
    const keys = [
      notionCrawlKey(page.url),
      page.pageId ? `page:${page.pageId}` : null,
      page.pageId ? notionCrawlKey(notionPageUrl(page.pageId)) : null,
    ].filter((key): key is string => key !== null);
    for (const key of unique(keys)) lookup.set(key, { page, index });
  });
  return lookup;
}

function childPageUrlFromRenderedLine(line: string): string | null {
  return line.match(/^\s*-\s+하위 페이지:\s+.+?\s+\((https?:\/\/[^)]+)\)\s*$/)?.[1] ?? null;
}

function renderExpandedNotionPage(
  entry: NotionPageEntry,
  lookup: Map<string, NotionPageEntry>,
  stack: Set<string>,
  rendered: Set<string>,
): string {
  const key = notionPageResultKey(entry.page);
  if (stack.has(key)) return "_순환 참조로 이미 펼친 상위 페이지입니다._";
  if (rendered.has(key)) return "_이 하위 페이지 본문은 위에서 이미 펼쳤습니다._";

  rendered.add(key);
  const nextStack = new Set(stack);
  nextStack.add(key);
  const expandedLines: string[] = [];
  const lines = (entry.page.text || "_추출된 본문 없음_").split(/\r?\n/);

  for (const line of lines) {
    expandedLines.push(line);
    const childUrl = childPageUrlFromRenderedLine(line);
    if (!childUrl) continue;
    const child = lookup.get(notionCrawlKey(childUrl));
    if (!child) continue;
    expandedLines.push("", renderExpandedNotionPage(child, lookup, nextStack, rendered), "");
  }

  const statusLines = entry.page.status === "failed" || entry.page.error || entry.page.partial
    ? [
      `- Fetch Status: ${entry.page.status}`,
      entry.page.error ? `- Fetch Error: ${entry.page.error}` : null,
      entry.page.partial ? "- Partial: true" : null,
      "",
    ].filter((line): line is string => line !== null)
    : [];

  return [
    ...statusLines,
    expandedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
  ].filter((section) => section.trim().length > 0).join("\n\n").trim();
}

function renderNotionBody(pages: NotionPageResult[]): string {
  const lookup = buildNotionPageLookup(pages);
  const rendered = new Set<string>();
  const rootEntry = pages[0] ? { page: pages[0], index: 0 } : null;
  const sections = [
    rootEntry ? renderExpandedNotionPage(rootEntry, lookup, new Set(), rendered) : null,
    ...pages.slice(1)
      .map((page, index) => ({ page, index: index + 1 }))
      .filter((entry) => !rendered.has(notionPageResultKey(entry.page)))
      .map((entry) => renderExpandedNotionPage(entry, lookup, new Set(), rendered)),
  ].filter((section): section is string => section !== null && section.trim().length > 0);
  return sections.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function fetchNotionSharedPageSource(
  url: string,
  options?: { token?: string },
): Promise<SourceIntakeResult> {
  if (!isNotionSharedPageUrl(url)) {
    throw new Error("Notion shared page URL is required");
  }

  // 공식 Notion API integration token 이 있으면 notion-to-md v4 경로(테이블/중첩/하위 페이지 정확 파싱)를 우선 사용한다.
  // 토큰이 없거나 공식 API 가 실패하면(페이지가 integration 에 미연결 등) 기존 tokenless 공개 스크랩으로 폴백한다.
  const token = options?.token?.trim() || process.env.COS_BLUEPRINT_NOTION_TOKEN?.trim();
  if (token) {
    try {
      const { fetchNotionViaOfficialApi } = await import("./notion-official.js");
      return await fetchNotionViaOfficialApi(url, token);
    } catch (error) {
      console.warn(
        `[notion] 공식 API 경로 실패, 공개 스크랩으로 폴백: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const rootUrl = normalizeNotionPageUrl(url);
  const fetchedAt = new Date().toISOString();
  const pages: NotionPageResult[] = [];
  const visited = new Set<string>();
  const queued = new Set<string>([notionCrawlKey(rootUrl)]);
  const queue: Array<{ url: string; depth: number }> = [{ url: rootUrl, depth: 0 }];

  while (queue.length > 0 && pages.length < NOTION_MAX_PAGES) {
    const next = queue.shift();
    if (!next) continue;
    const crawlKey = notionCrawlKey(next.url);
    if (visited.has(crawlKey)) continue;
    visited.add(crawlKey);

    const page = await fetchNotionPage(next.url, rootUrl, next.depth);
    pages.push(page);

    if (page.depth >= NOTION_MAX_DEPTH || pages.length >= NOTION_MAX_PAGES) continue;
    for (const childUrl of page.childUrls) {
      const childKey = notionCrawlKey(childUrl);
      if (visited.has(childKey) || queued.has(childKey)) continue;
      if (pages.length + queue.length >= NOTION_MAX_PAGES) break;
      queued.add(childKey);
      queue.push({ url: childUrl, depth: page.depth + 1 });
    }
  }

  const rootPage = pages[0];
  const failedPages = pages.filter((page) => page.status === "failed");
  const rootFailed = !rootPage || rootPage.status === "failed";
  const fetchError = rootFailed
    ? rootPage?.error ?? "root page fetch failed"
    : failedPages.length > 0 ? `${failedPages.length} child page(s) failed` : undefined;

  return {
    workflowId: "notion_shared_page",
    format: "notion",
    title: rootPage?.title,
    body: renderNotionBody(pages),
    fetchStatus: rootFailed ? "failed" : "fetched",
    fetchedAt,
    fetchError,
    metadata: {
      rootUrl,
      pageCount: pages.length,
      fetchedPageCount: pages.length - failedPages.length,
      failedPageCount: failedPages.length,
      pageUrls: pages.map((page) => page.url),
      pageIds: pages.map((page) => page.pageId).filter(Boolean),
      externalLinks: unique(pages.flatMap((page) => page.externalLinks)),
      figmaLinks: unique(pages.flatMap((page) => page.figmaLinks)),
    },
  };
}

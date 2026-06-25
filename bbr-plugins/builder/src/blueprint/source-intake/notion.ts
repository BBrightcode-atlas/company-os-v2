import type { SourceIntakeResult } from "./types.js";
import { decodeBasicHtmlEntities, extractUrlText, fetchRawUrl } from "./url.js";

const NOTION_MAX_DEPTH = 1;
const NOTION_MAX_PAGES = 12;

type NotionPageResult = {
  url: string;
  title: string;
  depth: number;
  status: "fetched" | "failed";
  httpStatus?: number;
  contentType?: string;
  text: string;
  childUrls: string[];
  error?: string;
};

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

export function isNotionSharedPageUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = normalizeHost(url.hostname);
    if (url.pathname.startsWith("/api/")) return false;
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

function extractNotionLinks(raw: string, baseUrl: string, rootUrl: string): string[] {
  const links: string[] = [];
  for (const match of raw.matchAll(/<a\b[^>]*\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
    const rawHref = decodeBasicHtmlEntities(match[2] ?? match[3] ?? match[4] ?? "").trim();
    if (!rawHref || rawHref.startsWith("#") || /^[a-z]+:/i.test(rawHref) && !/^https?:/i.test(rawHref)) continue;
    let url: URL;
    try {
      url = new URL(rawHref, baseUrl);
    } catch {
      continue;
    }
    const normalized = normalizeNotionPageUrl(url.toString());
    if (!isNotionSharedPageUrl(normalized)) continue;
    if (!sameCrawlScope(rootUrl, normalized)) continue;
    links.push(normalized);
  }
  return [...new Set(links)];
}

function fallbackTitle(url: string): string {
  const parsed = new URL(url);
  const segment = decodeURIComponent(parsed.pathname.split("/").filter(Boolean).at(-1) ?? parsed.hostname);
  return segment.replace(/[-_]+/g, " ").trim() || parsed.hostname;
}

async function fetchNotionPage(url: string, rootUrl: string, depth: number): Promise<NotionPageResult> {
  try {
    const fetched = await fetchRawUrl(url);
    const finalUrl = normalizeNotionPageUrl(fetched.finalUrl || url);
    const text = extractUrlText(fetched.raw, fetched.contentType, { maxChars: 0 });
    const title = titleFromHtml(fetched.raw) ?? fallbackTitle(finalUrl);
    return {
      url: finalUrl,
      title,
      depth,
      status: text ? "fetched" : "failed",
      httpStatus: fetched.status,
      contentType: fetched.contentType,
      text,
      childUrls: extractNotionLinks(fetched.raw, finalUrl, rootUrl).filter((link) => link !== finalUrl),
      error: text ? undefined : "empty extracted body",
    };
  } catch (error) {
    return {
      url,
      title: fallbackTitle(url),
      depth,
      status: "failed",
      text: "",
      childUrls: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function renderNotionBody(rootUrl: string, pages: NotionPageResult[]): string {
  const fetchedCount = pages.filter((page) => page.status === "fetched").length;
  const failedCount = pages.length - fetchedCount;
  const pageIndex = pages.map((page, index) => [
    `- NOTION-${String(index + 1).padStart(3, "0")} ${page.title}`,
    `  - URL: ${page.url}`,
    `  - Depth: ${page.depth}`,
    `  - Status: ${page.status}${page.error ? ` (${page.error})` : ""}`,
  ].join("\n"));
  const sections = pages.flatMap((page, index) => [
    `## NOTION-${String(index + 1).padStart(3, "0")}. ${page.title}`,
    "",
    `- URL: ${page.url}`,
    `- Depth: ${page.depth}`,
    `- Fetch Status: ${page.status}`,
    `- HTTP Status: ${page.httpStatus ?? "-"}`,
    `- Content Type: ${page.contentType ?? "-"}`,
    `- Child Notion Links: ${page.childUrls.length}`,
    page.error ? `- Fetch Error: ${page.error}` : null,
    "",
    "### 추출 본문 전체(Full Extracted Body)",
    "",
    page.text || "_추출된 본문 없음_",
    "",
    page.childUrls.length
      ? ["### 발견한 하위 노션 페이지(Discovered Child Pages)", "", ...page.childUrls.map((link) => `- ${link}`), ""].join("\n")
      : null,
    "---",
    "",
  ].filter((line): line is string => line !== null));

  return [
    "# 노션 공유페이지(Notion Shared Page)",
    "",
    `- Root URL: ${rootUrl}`,
    `- Pages: ${pages.length}`,
    `- Fetched Pages: ${fetchedCount}`,
    `- Failed Pages: ${failedCount}`,
    `- Crawl Depth Limit: ${NOTION_MAX_DEPTH}`,
    `- Page Limit: ${NOTION_MAX_PAGES}`,
    "",
    "## 페이지 목록(Page Index)",
    "",
    ...pageIndex,
    "",
    ...sections,
  ].join("\n");
}

export async function fetchNotionSharedPageSource(url: string): Promise<SourceIntakeResult> {
  if (!isNotionSharedPageUrl(url)) {
    throw new Error("Notion shared page URL is required");
  }

  const rootUrl = normalizeNotionPageUrl(url);
  const fetchedAt = new Date().toISOString();
  const pages: NotionPageResult[] = [];
  const visited = new Set<string>();
  const queued = new Set<string>([rootUrl]);
  const queue: Array<{ url: string; depth: number }> = [{ url: rootUrl, depth: 0 }];

  while (queue.length > 0 && pages.length < NOTION_MAX_PAGES) {
    const next = queue.shift();
    if (!next || visited.has(next.url)) continue;
    visited.add(next.url);

    const page = await fetchNotionPage(next.url, rootUrl, next.depth);
    pages.push(page);

    if (page.depth >= NOTION_MAX_DEPTH || pages.length >= NOTION_MAX_PAGES) continue;
    for (const childUrl of page.childUrls) {
      if (visited.has(childUrl) || queued.has(childUrl)) continue;
      if (pages.length + queue.length >= NOTION_MAX_PAGES) break;
      queued.add(childUrl);
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
    body: renderNotionBody(rootUrl, pages),
    fetchStatus: rootFailed ? "failed" : "fetched",
    fetchedAt,
    fetchError,
    metadata: {
      rootUrl,
      pageCount: pages.length,
      fetchedPageCount: pages.length - failedPages.length,
      failedPageCount: failedPages.length,
      pageUrls: pages.map((page) => page.url),
    },
  };
}

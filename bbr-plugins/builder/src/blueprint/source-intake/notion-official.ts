import { Client } from "@notionhq/client";
import { NotionConverter } from "notion-to-md";
import { MDXRenderer } from "notion-to-md/plugins/renderer";
import type { SourceIntakeResult } from "./types.js";
import {
  isFigmaLinkUrl,
  normalizeNotionPageId,
  notionPageIdFromUrl,
  notionPageUrl,
} from "./notion.js";

// 공식 Notion API(@notionhq/client) + notion-to-md v4 로 공유 페이지 본문을 가져온다.
// tokenless private API(loadPageChunk) 대비 테이블/중첩 블록/하위 페이지를 정확히 파싱한다.
// 전제: integration token + 대상 페이지가 해당 integration 에 연결(Add connections)되어 있어야 한다.

const NOTION_OFFICIAL_VERSION = "2022-06-28";

type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as AnyRecord : {};
}

/** n2m / NotionConverter 가 console.debug/info 로 블록마다 로그를 쏟아내므로 변환 동안만 묵음 처리. */
async function withQuietLogs<T>(fn: () => Promise<T>): Promise<T> {
  const debug = console.debug;
  const info = console.info;
  console.debug = () => {};
  console.info = () => {};
  try {
    return await fn();
  } finally {
    console.debug = debug;
    console.info = info;
  }
}

function fallbackTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const segment = decodeURIComponent(parsed.pathname.split("/").filter(Boolean).at(-1) ?? parsed.hostname);
    return segment.replace(/-[0-9a-f]{32}$/i, "").replace(/[-_]+/g, " ").trim() || parsed.hostname;
  } catch {
    return "Notion Page";
  }
}

/** blockTree.properties 에서 title 타입 속성의 평문 제목을 추출. */
export function titleFromNotionProperties(properties: unknown): string | undefined {
  const props = asRecord(properties);
  for (const value of Object.values(props)) {
    const prop = asRecord(value);
    if (prop.type === "title" && Array.isArray(prop.title)) {
      const text = (prop.title as unknown[])
        .map((part) => (typeof asRecord(part).plain_text === "string" ? asRecord(part).plain_text as string : ""))
        .join("")
        .trim();
      if (text) return text;
    }
  }
  return undefined;
}

/** 본문 마크다운에서 외부 링크/Figma 링크를 추출(노션 내부 링크는 제외). */
export function scanContentLinks(text: string): { external: string[]; figma: string[] } {
  const external = new Set<string>();
  const figma = new Set<string>();
  for (const match of text.matchAll(/https?:\/\/[^\s<>"'`)\]]+/gi)) {
    const url = match[0].replace(/[.,;:!?]+$/g, "");
    let host: string;
    try {
      host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      continue;
    }
    if (host === "notion.so" || host.endsWith(".notion.so") || host === "notion.site" || host.endsWith(".notion.site")) {
      continue;
    }
    external.add(url);
    if (isFigmaLinkUrl(url)) figma.add(url);
  }
  return { external: [...external], figma: [...figma] };
}

/**
 * 기본 MDXRenderer 는 child_page 를 링크 한 줄로만 렌더한다.
 * child_page 트랜스포머를 덮어써서 `## 제목` + 하위 블록을 재귀로 인라인 → 본문 전체가 한 문서로 펼쳐진다.
 * child_page 는 포함(트리)이라 순환이 없고, link_to_page(참조)는 링크로만 남아 무한루프가 없다.
 */
function buildRecursiveRenderer(childPageIds: string[]): MDXRenderer {
  const renderer = new MDXRenderer();
  // n2m v4 alpha 타입(TypedRendererContext)이 엄격해 context 는 any 로 받아 처리한다.
  renderer.createBlockTransformer("child_page", {
    transform: async (context: any): Promise<string> => {
      const block = asRecord(context?.block);
      const utils = asRecord(context?.utils);
      const processBlock = utils.processBlock as ((b: unknown) => Promise<string>) | undefined;
      const rawId = typeof block.id === "string" ? block.id : "";
      const normalizedId = normalizeNotionPageId(rawId) ?? rawId;
      if (normalizedId) childPageIds.push(normalizedId);
      const childPage = asRecord(block.child_page);
      const title = typeof childPage.title === "string" && childPage.title.trim() ? childPage.title.trim() : "하위 페이지";
      const children = Array.isArray(block.children) ? block.children : [];
      const parts = processBlock ? await Promise.all(children.map((child) => processBlock(child))) : [];
      const body = parts.join("").trim();
      return `\n## ${title}\n\n${body}\n\n`;
    },
  });
  return renderer;
}

export async function fetchNotionViaOfficialApi(url: string, token: string): Promise<SourceIntakeResult> {
  const pageId = notionPageIdFromUrl(url);
  if (!pageId) {
    throw new Error("Notion 공유 URL 에서 페이지 ID 를 찾지 못했습니다");
  }

  const fetchedAt = new Date().toISOString();
  const childPageIds: string[] = [];

  // 생성자(NotionConverter/MDXRenderer)도 console.debug 로 설정을 덤프하므로 생성+변환 전체를 묵음 처리.
  const result = await withQuietLogs(() => {
    const client = new Client({ auth: token, notionVersion: NOTION_OFFICIAL_VERSION });
    const renderer = buildRecursiveRenderer(childPageIds);
    const converter = new NotionConverter(client).withRenderer(renderer);
    return converter.convert(pageId);
  });
  const rawContent = typeof result?.content === "string" ? result.content : "";
  const title = titleFromNotionProperties(result?.blockTree?.properties) ?? fallbackTitleFromUrl(url);

  const normalized = rawContent
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const body = normalized ? `# ${title}\n\n${normalized}` : "";

  const { external, figma } = scanContentLinks(normalized);
  const pageIds = [pageId, ...childPageIds.map((id) => normalizeNotionPageId(id) ?? id)]
    .filter((value, index, all) => value && all.indexOf(value) === index);

  return {
    workflowId: "notion_shared_page",
    format: "notion",
    title,
    body,
    fetchStatus: body ? "fetched" : "failed",
    fetchedAt,
    fetchError: body ? undefined : "Notion 공식 API 응답 본문이 비어 있습니다",
    metadata: {
      rootUrl: url,
      source: "official_api",
      pageCount: pageIds.length,
      pageIds,
      pageUrls: pageIds.map((id) => notionPageUrl(id)),
      externalLinks: external,
      figmaLinks: figma,
    },
  };
}

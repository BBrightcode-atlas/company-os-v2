const SOURCE_URL_FETCH_TIMEOUT_MS = 10_000;
const SOURCE_URL_BODY_CAP = 120_000;

export type RawUrlFetchResult = {
  raw: string;
  contentType: string;
  status: number;
  finalUrl: string;
};

export type UrlTextFetchResult = {
  text: string;
  contentType: string;
  status: number;
  finalUrl: string;
};

export type UrlFetchOptions = {
  timeoutMs?: number;
  headers?: Record<string, string>;
};

export type ExtractUrlTextOptions = {
  maxChars?: number;
};

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export function normalizeSourceUrl(value: unknown): string | undefined {
  const raw = stringValue(value);
  if (!raw) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("url must be a valid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("url must use http or https");
  }
  parsed.hash = "";
  return parsed.toString();
}

export function decodeBasicHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/g, "'");
}

export function extractUrlText(raw: string, contentType: string, options: ExtractUrlTextOptions = {}): string {
  const looksHtml = /html/i.test(contentType) || /<html[\s>]/i.test(raw) || /<body[\s>]/i.test(raw);
  const text = looksHtml
    ? raw
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|section|article|li|h[1-6]|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
    : raw;
  const normalized = decodeBasicHtmlEntities(text)
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const maxChars = options.maxChars ?? SOURCE_URL_BODY_CAP;
  return maxChars > 0 ? normalized.slice(0, maxChars) : normalized;
}

export async function fetchRawUrl(url: string, options: UrlFetchOptions = {}): Promise<RawUrlFetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? SOURCE_URL_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        accept: "text/html,text/plain,application/xhtml+xml,application/json;q=0.8,*/*;q=0.5",
        "user-agent": "Paperclip-COS-Blueprint/0.1 (+https://paperclip.local)",
        ...options.headers,
      },
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const raw = await response.text();
    return {
      raw,
      contentType,
      status: response.status,
      finalUrl: response.url || url,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchUrlSource(url: string): Promise<UrlTextFetchResult> {
  const fetched = await fetchRawUrl(url);
  const text = extractUrlText(fetched.raw, fetched.contentType);
  if (!text) throw new Error("empty response body");
  return {
    text,
    contentType: fetched.contentType,
    status: fetched.status,
    finalUrl: fetched.finalUrl,
  };
}

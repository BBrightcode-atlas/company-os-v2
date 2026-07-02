export const WIREFRAME_HTML_DELIVERABLE_SLOT_KEY = "deliverable.wireframe_html";

function fencedHtmlBody(value: string): string | null {
  const exact = value.match(/^```(?:html)?\s*\n([\s\S]*?)\n```\s*$/i);
  if (exact) return exact[1]?.trim() || null;

  const firstHtmlBlock = value.match(/```html\s*\n([\s\S]*?)\n```/i);
  return firstHtmlBlock?.[1]?.trim() || null;
}

function looksLikeHtmlDocument(value: string): boolean {
  return /^\s*<!doctype\s+html\b/i.test(value) || /<html(?:\s|>)/i.test(value);
}

export function htmlDocumentForIframePreview(slotKey: string, body: string | null | undefined): string | null {
  if (slotKey !== WIREFRAME_HTML_DELIVERABLE_SLOT_KEY) return null;
  const trimmed = body?.trim();
  if (!trimmed) return null;

  const candidate = fencedHtmlBody(trimmed) ?? trimmed;
  return looksLikeHtmlDocument(candidate) ? candidate : null;
}

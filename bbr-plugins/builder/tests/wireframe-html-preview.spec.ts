import { describe, expect, it } from "vitest";
import {
  WIREFRAME_HTML_DELIVERABLE_SLOT_KEY,
  htmlDocumentForIframePreview,
} from "../src/blueprint/ui/wireframeHtmlPreview.js";

describe("wireframe HTML preview", () => {
  it("uses raw wireframe HTML documents as iframe srcDoc", () => {
    const html = "<!DOCTYPE html><html><body>wireframe</body></html>";

    expect(htmlDocumentForIframePreview(WIREFRAME_HTML_DELIVERABLE_SLOT_KEY, html)).toBe(html);
  });

  it("extracts a fenced HTML document from the wireframe slot", () => {
    expect(htmlDocumentForIframePreview(
      WIREFRAME_HTML_DELIVERABLE_SLOT_KEY,
      "```html\n<html><body>wireframe</body></html>\n```",
    )).toBe("<html><body>wireframe</body></html>");
  });

  it("keeps non-wireframe and non-document HTML on the markdown path", () => {
    expect(htmlDocumentForIframePreview("deliverable.prd", "<!DOCTYPE html><html></html>")).toBeNull();
    expect(htmlDocumentForIframePreview(WIREFRAME_HTML_DELIVERABLE_SLOT_KEY, "<button>snippet</button>")).toBeNull();
  });
});

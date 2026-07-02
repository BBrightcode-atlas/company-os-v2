import { describe, expect, it, vi } from "vitest";
import { writeBlueprintFigmaReferenceDocument } from "../src/blueprint/worker.js";

function figmaSource(url: string, title: string): any {
  return { id: title, title, type: "external-plan", body: "", createdAt: "", format: "figma", url, intakeWorkflow: "figma" };
}

describe("writeBlueprintFigmaReferenceDocument", () => {
  it("lists registered Figma root URLs deduped by fileKey", async () => {
    const importFn = vi.fn(async () => ({}));
    const ctx: any = { projects: { documentSlots: { import: importFn } } };
    const state: any = {
      sources: [
        figmaSource("https://www.figma.com/design/ABC123/File-One?node-id=1-2", "Figma: File One"),
        figmaSource("https://www.figma.com/design/ABC123/File-One", "Figma: File One dup"),
        figmaSource("https://www.figma.com/design/XYZ789/File-Two", "Figma: File Two"),
        { id: "x", title: "web", format: "url", url: "https://example.com" },
      ],
    };

    const result = await writeBlueprintFigmaReferenceDocument(ctx, "co", "proj", state);

    expect(result.ok).toBe(true);
    expect(result.count).toBe(2);
    expect(importFn).toHaveBeenCalledTimes(1);
    const call = importFn.mock.calls[0] as any[];
    const payload = call[2];
    expect(call[1]).toBe("deliverable.figma");
    expect(payload.body).toContain("ABC123");
    expect(payload.body).toContain("XYZ789");
    expect(payload.body).toContain("File One");
    expect(payload.body).not.toContain("example.com");
  });

  it("returns ok:false and writes nothing when no Figma source is registered", async () => {
    const importFn = vi.fn(async () => ({}));
    const ctx: any = { projects: { documentSlots: { import: importFn } } };

    const result = await writeBlueprintFigmaReferenceDocument(ctx, "co", "proj", { sources: [] } as any);

    expect(result.ok).toBe(false);
    expect(result.count).toBe(0);
    expect(importFn).not.toHaveBeenCalled();
  });
});

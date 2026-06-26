import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROJECT_DOCUMENT_SLOT_DEFINITIONS,
  canPluginProduceProjectDocumentSlot,
} from "./project-document-slots.js";

describe("project document slot producer ownership", () => {
  it("allows the unified Builder plugin to produce every Blueprint/Wireframe/Project Builder slot", () => {
    for (const slotKey of [
      "source.customer_originals",
      "source.internal_notes",
      "source.references",
      "support.pm_execution_procedure",
      "support.screen_definition_writing_rules",
      "deliverable.requirement_inventory",
      "deliverable.prd",
      "deliverable.feature_files",
      "deliverable.schema_definition",
      "deliverable.api_definition",
      "deliverable.architecture",
      "deliverable.screen_definitions",
      "deliverable.wireframe_html",
      "deliverable.build_plan",
      "deliverable.task_list",
      "deliverable.issue_graph",
    ]) {
      expect(canPluginProduceProjectDocumentSlot(slotKey, "paperclip-plugin-builder")).toBe(true);
    }
  });

  it("rejects removed split plugin producer permissions", () => {
    expect(canPluginProduceProjectDocumentSlot("deliverable.prd", "paperclip-plugin-cos-blueprint")).toBe(false);
    expect(canPluginProduceProjectDocumentSlot("deliverable.wireframe_html", "paperclip-plugin-wireframe-builder")).toBe(false);
    expect(canPluginProduceProjectDocumentSlot("deliverable.build_plan", "paperclip-plugin-product-builder")).toBe(false);
  });

  it("uses Builder template paths for canonical fixed deliverables", () => {
    const templatePaths = DEFAULT_PROJECT_DOCUMENT_SLOT_DEFINITIONS.flatMap((definition): string[] =>
      "templatePath" in definition && definition.templatePath ? [definition.templatePath] : [],
    );

    expect(templatePaths.length).toBeGreaterThan(0);
    expect(templatePaths.every((path) => path.startsWith("bbr-plugins/builder/templates/"))).toBe(true);
  });
});

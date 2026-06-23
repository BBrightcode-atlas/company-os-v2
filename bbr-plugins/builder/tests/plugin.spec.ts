import { existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createTestHarness } from "@paperclipai/plugin-sdk/testing";
import manifest from "../src/manifest.js";
import builderPlugin from "../src/worker.js";
import { ACTION as BLUEPRINT_ACTION, DATA as BLUEPRINT_DATA } from "../src/blueprint/contract.js";
import { ACTION as WIREFRAME_ACTION, DATA as WIREFRAME_DATA, DB_NAMESPACE } from "../src/wireframe/contract.js";
import { ACTION as PROJECT_BUILDER_ACTION, DATA as PROJECT_BUILDER_DATA } from "../src/project-builder/contract.js";
import { FILE_ACCEPT, formatFromFileName } from "../src/blueprint/ui/parse.js";

const COMPANY_ID = "96fcd977-1d55-4697-a464-abb656dd57c2";
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";

describe("Builder plugin", () => {
  it("packages Blueprint, Wireframe, and Project Builder as one plugin", () => {
    expect(manifest.id).toBe("paperclip-plugin-builder");
    expect(manifest.displayName).toBe("Builder");
    expect(manifest.database?.namespaceSlug).toBe("wireframes");

    const slots = manifest.ui?.slots ?? [];
    expect(slots.map((slot: { id: string }) => slot.id)).toEqual([
      "cos-blueprint-page",
      "cos-blueprint-sidebar",
      "wireframes-page",
      "wireframes-sidebar",
      "wireframes-route-sidebar",
      "product-builder-page",
      "product-builder-sidebar",
    ]);
    expect(slots
      .filter((slot: { type: string }) => slot.type === "sidebar")
      .map((slot: { displayName: string }) => slot.displayName)).toEqual([
      "Blueprint",
      "Wireframe",
      "Project Builder",
    ]);
  });

  it("keeps module data keys isolated inside the single action namespace", () => {
    const dataKeys = [
      ...Object.values(BLUEPRINT_DATA),
      ...Object.values(WIREFRAME_DATA),
      ...Object.values(PROJECT_BUILDER_DATA),
    ];
    expect(new Set(dataKeys).size).toBe(dataKeys.length);
    expect(BLUEPRINT_DATA.overview).toBe("blueprint.overview");
    expect(WIREFRAME_DATA.projects).toBe("wireframe.projects");
    expect(PROJECT_BUILDER_DATA.overview).toBe("project-builder.overview");

    const actionKeys = [
      ...Object.values(BLUEPRINT_ACTION),
      ...Object.values(WIREFRAME_ACTION),
      ...Object.values(PROJECT_BUILDER_ACTION),
    ];
    expect(new Set(actionKeys).size).toBe(actionKeys.length);
  });

  it("uses the Builder plugin id derived Wireframe namespace", () => {
    expect(DB_NAMESPACE).toBe("plugin_wireframes_a96aea0e66");
  });

  it("accepts the standard Blueprint intake file formats", () => {
    expect(FILE_ACCEPT).toBe(".txt,.md,.docx,.pptx,.pdf,.xlsx");
    expect(formatFromFileName("brief.md")).toBe("md");
    expect(formatFromFileName("proposal.docx")).toBe("docx");
    expect(formatFromFileName("storyboard.pptx")).toBe("pptx");
    expect(formatFromFileName("requirements.pdf")).toBe("pdf");
    expect(formatFromFileName("data.xlsx")).toBe("xlsx");
  });

  it("registers Blueprint source documents into Project slots without writing workspace files", async () => {
    const workspace = mkdtempSync(path.join(os.tmpdir(), "builder-blueprint-source-"));
    try {
      const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
      harness.seed({
        companies: [{ id: COMPANY_ID, name: "BBR", status: "active", issuePrefix: "BBR" } as any],
        projects: [{
          id: PROJECT_ID,
          companyId: COMPANY_ID,
          name: "Builder Project",
          status: "in_progress",
          description: null,
          goalId: null,
          leadAgentId: null,
          targetDate: null,
          env: null,
        } as any],
        projectWorkspaces: [{
          id: "33333333-3333-4333-8333-333333333333",
          projectId: PROJECT_ID,
          name: "primary",
          path: workspace,
          repoUrl: null,
          repoRef: null,
          defaultRef: null,
          isPrimary: true,
          createdAt: "2026-06-22T00:00:00.000Z",
          updatedAt: "2026-06-22T00:00:00.000Z",
        } as any],
      });
      await builderPlugin.definition.setup(harness.ctx);

      const result = await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        title: "고객 요구사항",
        type: "external-plan",
        body: "로그인과 결제 요구사항",
        fileName: "requirements.md",
        format: "md",
        originalBase64: Buffer.from("legacy-original").toString("base64"),
      });

      expect(result.ok).toBe(true);
      expect(result.workspacePath).toBeNull();
      expect(result.source.originalPath).toBeUndefined();
      expect(existsSync(path.join(workspace, result.file))).toBe(false);

      const slot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "source.customer_originals", COMPANY_ID);
      expect(slot?.document?.body).toContain("로그인과 결제 요구사항");
      expect(slot?.slot.metadata).toMatchObject({
        plugin: "paperclip-plugin-builder",
        sourceFormat: "md",
        fileName: "requirements.md",
        documentRefs: [result.file],
      });

      const secondResult = await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        title: "고객 추가 요구사항",
        type: "external-plan",
        body: "커뮤니티와 관리자 요구사항",
        fileName: "requirements-2.pdf",
        format: "pdf",
      });

      const updatedSlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "source.customer_originals", COMPANY_ID);
      expect(secondResult.ok).toBe(true);
      expect(updatedSlot?.document?.body).toContain("로그인과 결제 요구사항");
      expect(updatedSlot?.document?.body).toContain("커뮤니티와 관리자 요구사항");
      expect(updatedSlot?.slot.metadata).toMatchObject({
        plugin: "paperclip-plugin-builder",
        sourceFormat: "pdf",
        fileName: "requirements-2.pdf",
        documentRefs: [result.file, secondResult.file],
        sources: [
          expect.objectContaining({ sourceId: result.source.id, fileName: "requirements.md" }),
          expect.objectContaining({ sourceId: secondResult.source.id, fileName: "requirements-2.pdf" }),
        ],
      });
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("exposes one combined worker definition", async () => {
    const health = await builderPlugin.definition.onHealth?.();
    expect(health?.status).toBe("ok");
    expect(health?.details?.pluginId).toBe("paperclip-plugin-builder");
    expect((health?.details?.modules as Array<{ module: string }>).map((entry) => entry.module)).toEqual([
      "blueprint",
      "wireframe",
      "project-builder",
    ]);
  });
});

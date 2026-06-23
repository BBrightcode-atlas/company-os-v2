import { existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createTestHarness } from "@paperclipai/plugin-sdk/testing";
import manifest from "../src/manifest.js";
import builderPlugin from "../src/worker.js";
import { ACTION as BLUEPRINT_ACTION, DATA as BLUEPRINT_DATA, STATE_KEY as BLUEPRINT_STATE_KEY } from "../src/blueprint/contract.js";
import { ACTION as WIREFRAME_ACTION, DATA as WIREFRAME_DATA, DB_NAMESPACE } from "../src/wireframe/contract.js";
import { ACTION as PROJECT_BUILDER_ACTION, DATA as PROJECT_BUILDER_DATA } from "../src/project-builder/contract.js";
import { FILE_ACCEPT, formatFromFileName } from "../src/blueprint/ui/parse.js";

const COMPANY_ID = "96fcd977-1d55-4697-a464-abb656dd57c2";
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const SECOND_PROJECT_ID = "44444444-4444-4444-8444-444444444444";

async function waitFor<T>(read: () => Promise<T>, ready: (value: T) => boolean): Promise<T> {
  let latest: T;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    latest = await read();
    if (ready(latest)) return latest;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return latest!;
}

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
          expect.objectContaining({
            sourceId: result.source.id,
            fileName: "requirements.md",
            documentRef: result.file,
            sourceFingerprint: expect.any(String),
          }),
          expect.objectContaining({
            sourceId: secondResult.source.id,
            fileName: "requirements-2.pdf",
            documentRef: secondResult.file,
            sourceFingerprint: expect.any(String),
          }),
        ],
      });

      const bodyBeforeDuplicate = updatedSlot?.document?.body;
      const duplicateResult = await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        title: "고객 추가 요구사항 재업로드",
        type: "external-plan",
        body: "커뮤니티와 관리자 요구사항",
        fileName: "requirements-2.pdf",
        format: "pdf",
      });
      const duplicateSlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "source.customer_originals", COMPANY_ID);
      expect(duplicateResult.ok).toBe(true);
      expect(duplicateResult.duplicate).toBe(true);
      expect(duplicateResult.file).toBe(secondResult.file);
      expect(duplicateSlot?.document?.body).toBe(bodyBeforeDuplicate);
      expect((duplicateSlot?.slot.metadata?.sources as unknown[])).toHaveLength(2);

      const batchResults = [];
      for (let index = 3; index <= 10; index += 1) {
        batchResults.push(await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
          companyId: COMPANY_ID,
          projectId: PROJECT_ID,
          title: `고객 요구사항 ${index}`,
          type: "external-plan",
          body: `배치 요구사항 ${index}`,
          fileName: `requirements-${index}.pdf`,
          format: "pdf",
        }));
      }
      const tenDocSlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "source.customer_originals", COMPANY_ID);
      expect(batchResults.every((entry) => entry.ok && !entry.duplicate)).toBe(true);
      expect(tenDocSlot?.document?.body).toContain("로그인과 결제 요구사항");
      expect(tenDocSlot?.document?.body).toContain("배치 요구사항 10");
      expect(tenDocSlot?.slot.metadata?.documentRefs).toHaveLength(10);
      expect(tenDocSlot?.slot.metadata?.sources).toHaveLength(10);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("keeps Blueprint state project-scoped and writes deliverable slots", async () => {
    const previousDisableLlm = process.env.COS_BLUEPRINT_DISABLE_LLM;
    process.env.COS_BLUEPRINT_DISABLE_LLM = "true";
    const workspace = mkdtempSync(path.join(os.tmpdir(), "builder-blueprint-deliverables-"));
    try {
      const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
      harness.seed({
        companies: [{ id: COMPANY_ID, name: "BBR", status: "active", issuePrefix: "BBR" } as any],
        projects: [
          {
            id: PROJECT_ID,
            companyId: COMPANY_ID,
            name: "A Project",
            status: "in_progress",
            description: null,
            goalId: null,
            leadAgentId: null,
            targetDate: null,
            env: null,
          } as any,
          {
            id: SECOND_PROJECT_ID,
            companyId: COMPANY_ID,
            name: "B Project",
            status: "in_progress",
            description: null,
            goalId: null,
            leadAgentId: null,
            targetDate: null,
            env: null,
          } as any,
        ],
        projectWorkspaces: [
          {
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
          } as any,
          {
            id: "55555555-5555-4555-8555-555555555555",
            projectId: SECOND_PROJECT_ID,
            name: "primary",
            path: workspace,
            repoUrl: null,
            repoRef: null,
            defaultRef: null,
            isPrimary: true,
            createdAt: "2026-06-22T00:00:00.000Z",
            updatedAt: "2026-06-22T00:00:00.000Z",
          } as any,
        ],
      });
      await builderPlugin.definition.setup(harness.ctx);

      await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        title: "A 프로젝트 요구사항",
        type: "external-plan",
        body: "A 프로젝트는 결제와 관리자 기능이 필요하다.",
        fileName: "a-requirements.md",
        format: "md",
      });
      await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
        companyId: COMPANY_ID,
        projectId: SECOND_PROJECT_ID,
        title: "B 프로젝트 요구사항",
        type: "external-plan",
        body: "B 프로젝트는 커뮤니티와 알림 기능이 필요하다.",
        fileName: "b-requirements.md",
        format: "md",
      });

      const firstOverview = await harness.getData<any>(BLUEPRINT_DATA.overview, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });
      const secondOverview = await harness.getData<any>(BLUEPRINT_DATA.overview, {
        companyId: COMPANY_ID,
        projectId: SECOND_PROJECT_ID,
      });
      expect(firstOverview.state.sources).toHaveLength(1);
      expect(firstOverview.state.sources[0].body).toContain("결제와 관리자");
      expect(secondOverview.state.sources).toHaveLength(1);
      expect(secondOverview.state.sources[0].body).toContain("커뮤니티와 알림");

      await harness.performAction<any>(BLUEPRINT_ACTION.runStandardPlan, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        title: "A 프로젝트",
      });
      await waitFor(
        () => harness.getData<any>(BLUEPRINT_DATA.overview, { companyId: COMPANY_ID, projectId: PROJECT_ID }),
        (overview) => Boolean(overview.state.standardPlan) && !overview.state.job,
      );
      const secondAfterFirstPlan = await harness.getData<any>(BLUEPRINT_DATA.overview, {
        companyId: COMPANY_ID,
        projectId: SECOND_PROJECT_ID,
      });
      expect(secondAfterFirstPlan.state.standardPlan).toBeNull();
      expect(secondAfterFirstPlan.state.screenPlan).toBeNull();
      expect(secondAfterFirstPlan.state.sources).toHaveLength(1);
      expect(secondAfterFirstPlan.state.sources[0].body).toContain("커뮤니티와 알림");
      await harness.performAction<any>(BLUEPRINT_ACTION.confirmStandardPlan, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });

      const standardDocs = await harness.performAction<any>(BLUEPRINT_ACTION.writeStandardPlanDocs, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });
      expect(standardDocs.ok).toBe(true);
      expect(standardDocs.slots.map((slot: any) => slot.slotKey)).toEqual(expect.arrayContaining([
        "support.pm_execution_procedure",
        "support.screen_definition_writing_rules",
        "deliverable.standard_plan",
        "deliverable.prd",
        "deliverable.feature_index",
        "deliverable.feature_files",
        "deliverable.schema_definition",
        "deliverable.api_definition",
        "deliverable.interface_definition",
        "deliverable.layout_definition",
      ]));

      const standardSlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.standard_plan", COMPANY_ID);
      const prdSlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.prd", COMPANY_ID);
      const featureSlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.feature_files", COMPANY_ID);
      expect(standardSlot?.slot.status).toBe("ready");
      expect(standardSlot?.document?.body).toContain("A 프로젝트");
      expect(standardSlot?.slot.metadata).toMatchObject({ phase: "standard-plan" });
      expect(prdSlot?.document?.body).toContain("PRD");
      expect(featureSlot?.slot.metadata?.documentRefs).toEqual(expect.arrayContaining([
        expect.stringContaining("docs/cos-blueprint/features/"),
      ]));

      await harness.performAction<any>(BLUEPRINT_ACTION.runScreens, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });
      const screenOverview = await waitFor(
        () => harness.getData<any>(BLUEPRINT_DATA.overview, { companyId: COMPANY_ID, projectId: PROJECT_ID }),
        (overview) => Boolean(overview.state.screenPlan) && !overview.state.job,
      );
      const screenDocs = await harness.performAction<any>(BLUEPRINT_ACTION.writeScreenDocs, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });
      expect(screenDocs.ok).toBe(true);
      const screenSlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.screen_definitions", COMPANY_ID);
      expect(screenSlot?.slot.status).toBe("draft");
      expect(screenSlot?.slot.metadata).toMatchObject({ phase: "screen-definitions" });
      expect(screenSlot?.slot.metadata?.documentRefs).toHaveLength(screenOverview.state.screenPlan.screens.length);
      expect(screenSlot?.document?.body).toContain("화면정의서");
    } finally {
      if (previousDisableLlm === undefined) delete process.env.COS_BLUEPRINT_DISABLE_LLM;
      else process.env.COS_BLUEPRINT_DISABLE_LLM = previousDisableLlm;
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("migrates legacy Blueprint state only for projects with matching source slots", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    harness.seed({
      companies: [{ id: COMPANY_ID, name: "BBR", status: "active", issuePrefix: "BBR" } as any],
      projects: [
        {
          id: PROJECT_ID,
          companyId: COMPANY_ID,
          name: "A Project",
          status: "in_progress",
          description: null,
          goalId: null,
          leadAgentId: null,
          targetDate: null,
          env: null,
        } as any,
        {
          id: SECOND_PROJECT_ID,
          companyId: COMPANY_ID,
          name: "B Project",
          status: "in_progress",
          description: null,
          goalId: null,
          leadAgentId: null,
          targetDate: null,
          env: null,
        } as any,
      ],
    });
    await builderPlugin.definition.setup(harness.ctx);

    await harness.ctx.state.set({
      scopeKind: "company",
      scopeId: COMPANY_ID,
      stateKey: BLUEPRINT_STATE_KEY,
    }, {
      sources: [{
        id: "legacy-source-0001",
        title: "레거시 고객 요구사항",
        type: "external-plan",
        body: "레거시 A 프로젝트 자료 본문",
        createdAt: "2026-06-22T00:00:00.000Z",
        fileName: "legacy-a.md",
        format: "md",
        fingerprint: "legacy-fingerprint-a",
      }],
      productBuilderBlueprintId: "online-service-standard",
      productBuilderBlueprintSelectedAt: null,
      standardPlan: {
        projectTitle: "회사 단위 레거시 기획서",
        overview: "프로젝트에 그대로 승계되면 안 되는 레거시 산출물",
        goals: [],
        scope: { inScope: [], outOfScope: [] },
        functionalRequirements: [],
        nonFunctionalRequirements: [],
        schemas: [],
        apis: [],
        layouts: [],
        risks: [],
        assumptions: [],
        generatedAt: "2026-06-22T00:00:00.000Z",
        confirmedAt: null,
      },
      screenPlan: null,
      projectDocumentSlots: [],
      job: null,
      updatedAt: "2026-06-22T00:00:00.000Z",
    });
    await harness.ctx.projects.documentSlots.import(PROJECT_ID, "source.customer_originals", {
      title: "고객 원본(Customer Originals)",
      format: "markdown",
      body: "레거시 A 프로젝트 자료 본문",
      status: "ready",
      contentType: "text/markdown",
      metadata: {
        plugin: "paperclip-plugin-builder",
        documentRefs: ["docs/cos-blueprint/sources/legacy-a.md"],
        sources: [{
          sourceFingerprint: "legacy-fingerprint-a",
          documentRef: "docs/cos-blueprint/sources/legacy-a.md",
        }],
      },
    }, COMPANY_ID);

    const firstOverview = await harness.getData<any>(BLUEPRINT_DATA.overview, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
    });
    const secondOverview = await harness.getData<any>(BLUEPRINT_DATA.overview, {
      companyId: COMPANY_ID,
      projectId: SECOND_PROJECT_ID,
    });

    expect(firstOverview.state.sources).toHaveLength(1);
    expect(firstOverview.state.sources[0].body).toContain("레거시 A 프로젝트");
    expect(firstOverview.state.standardPlan).toBeNull();
    expect(secondOverview.state.sources).toHaveLength(0);
    expect(secondOverview.state.standardPlan).toBeNull();
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

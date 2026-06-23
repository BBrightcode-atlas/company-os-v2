import { existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createTestHarness } from "@paperclipai/plugin-sdk/testing";
import manifest from "../src/manifest.js";
import builderPlugin from "../src/worker.js";
import { ACTION as BLUEPRINT_ACTION, DATA as BLUEPRINT_DATA, STATE_KEY as BLUEPRINT_STATE_KEY } from "../src/blueprint/contract.js";
import { ACTION as WIREFRAME_ACTION, DATA as WIREFRAME_DATA, DB_NAMESPACE, T_WIREFRAMES } from "../src/wireframe/contract.js";
import {
  ACTION as PROJECT_BUILDER_ACTION,
  DATA as PROJECT_BUILDER_DATA,
  PRODUCT_BUILDER_REQUIRED_UPSTREAM_SLOT_KEYS,
  BLUEPRINT_STANDARD_PLAN_SLOT_KEY,
  WIREFRAME_HTML_SLOT_KEY,
  type ProductBuilderBuildSummary,
  type ProductBuilderOverview,
} from "../src/project-builder/contract.js";
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

function seedCompanyProjects(harness: ReturnType<typeof createTestHarness>) {
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
}

function minimalScreenModel() {
  return {
    screens: [{
      basic: {
        screenCode: "SCR-001",
        screenName: "홈",
        description: "홈 화면",
        domainMenu: "",
        route: "/",
        permission: "public",
        states: "",
        priorPlan: "",
        priorSchemaApi: "",
        sources: "",
      },
      tables: {
        composition: [],
        fields: [],
        actions: [],
        apis: [],
        acceptance: [],
        undecided: [],
        docReflect: [],
      },
    }],
  };
}

async function importProductBuilderReadySlots(harness: ReturnType<typeof createTestHarness>, projectId: string, productName: string) {
  for (const slotKey of PRODUCT_BUILDER_REQUIRED_UPSTREAM_SLOT_KEYS) {
    const isStandardPlan = slotKey === BLUEPRINT_STANDARD_PLAN_SLOT_KEY;
    const isWireframe = slotKey === WIREFRAME_HTML_SLOT_KEY;
    await harness.ctx.projects.documentSlots.import(projectId, slotKey as any, {
      title: slotKey,
      format: isWireframe ? "html" : "markdown",
      body: isWireframe ? "<!DOCTYPE html><html><body>wireframe</body></html>" : `# ${productName}\n\n${slotKey}`,
      status: "ready",
      contentType: isWireframe ? "text/html" : "text/markdown",
      metadata: isStandardPlan
        ? {
          plugin: "paperclip-plugin-builder",
          productBuilderBlueprintId: "online-service-standard",
          productBuilderBlueprintSelectedAt: "2026-06-23T00:00:00.000Z",
        }
        : { plugin: "paperclip-plugin-builder" },
    }, COMPANY_ID);
  }
}

async function ctxImportScreenSlot(harness: ReturnType<typeof createTestHarness>, projectId: string) {
  await harness.ctx.projects.documentSlots.import(projectId, "deliverable.screen_definitions" as any, {
    title: "화면정의서(Screen Definitions)",
    format: "markdown",
    body: JSON.stringify(minimalScreenModel()),
    status: "ready",
    contentType: "text/markdown",
    metadata: { plugin: "paperclip-plugin-builder" },
  }, COMPANY_ID);
}

type WireframeDbRow = {
  id: string;
  company_id: string;
  project_id: string | null;
  title: string;
  spec_doc: string;
  screen_doc: string;
  screen_model: unknown;
  reference_docs: unknown[];
  html: string | null;
  status: string;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
};

function installWireframeMemoryDb(harness: ReturnType<typeof createTestHarness>) {
  const rows: WireframeDbRow[] = [];
  const comments: Array<{ company_id: string; wireframe_id: string }> = [];
  const sortNewest = (items: WireframeDbRow[]) =>
    [...items].sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  const removeRows = (predicate: (row: WireframeDbRow) => boolean): number => {
    let removed = 0;
    for (let index = rows.length - 1; index >= 0; index -= 1) {
      if (predicate(rows[index])) {
        rows.splice(index, 1);
        removed += 1;
      }
    }
    return removed;
  };

  harness.ctx.db.query = (async (sql: string, params: unknown[] = []) => {
    const compact = sql.replace(/\s+/g, " ");
    const companyId = String(params[0] ?? "");
    if (compact.includes(`FROM ${T_WIREFRAMES}`) && compact.includes("WHERE company_id=$1 AND id=$2")) {
      const id = String(params[1] ?? "");
      return rows.filter((row) => row.company_id === companyId && row.id === id).slice(0, 1);
    }
    if (compact.includes(`FROM ${T_WIREFRAMES}`) && compact.includes("project_id=$2") && compact.includes("status='generating'")) {
      const projectId = String(params[1] ?? "");
      return sortNewest(rows.filter((row) => row.company_id === companyId && row.project_id === projectId && row.status === "generating")).slice(0, 1);
    }
    if (compact.includes(`FROM ${T_WIREFRAMES}`) && compact.includes("project_id IS NULL") && compact.includes("status='generating'")) {
      return sortNewest(rows.filter((row) => row.company_id === companyId && row.project_id === null && row.status === "generating")).slice(0, 1);
    }
    if (compact.includes(`FROM ${T_WIREFRAMES}`) && compact.includes("project_id=$2")) {
      const projectId = String(params[1] ?? "");
      return sortNewest(rows.filter((row) => row.company_id === companyId && row.project_id === projectId)).slice(0, 1);
    }
    if (compact.includes(`FROM ${T_WIREFRAMES}`) && compact.includes("WHERE company_id=$1 ORDER BY")) {
      return sortNewest(rows.filter((row) => row.company_id === companyId)).slice(0, 1);
    }
    return [];
  }) as typeof harness.ctx.db.query;

  harness.ctx.db.execute = (async (sql: string, params: unknown[] = []) => {
    const compact = sql.replace(/\s+/g, " ");
    if (compact.includes(`INSERT INTO ${T_WIREFRAMES}`)) {
      const now = new Date();
      rows.push({
        id: String(params[0]),
        company_id: String(params[1]),
        project_id: typeof params[2] === "string" ? params[2] : null,
        title: String(params[3] ?? ""),
        spec_doc: String(params[4] ?? ""),
        screen_doc: String(params[5] ?? ""),
        screen_model: JSON.parse(String(params[6] ?? "{\"screens\":[]}")),
        reference_docs: JSON.parse(String(params[7] ?? "[]")),
        html: null,
        status: "draft",
        error_message: null,
        created_at: now,
        updated_at: now,
      });
      return { rowCount: 1 };
    }
    if (compact.includes(`DELETE FROM ${T_WIREFRAMES}`) && compact.includes("project_id=$2")) {
      const companyId = String(params[0] ?? "");
      const projectId = String(params[1] ?? "");
      return { rowCount: removeRows((row) => row.company_id === companyId && row.project_id === projectId) };
    }
    if (compact.includes(`DELETE FROM ${T_WIREFRAMES}`) && compact.includes("project_id IS NULL")) {
      const companyId = String(params[0] ?? "");
      return { rowCount: removeRows((row) => row.company_id === companyId && row.project_id === null) };
    }
    if (compact.includes(`DELETE FROM ${T_WIREFRAMES}`) && compact.includes("id=$2")) {
      const companyId = String(params[0] ?? "");
      const id = String(params[1] ?? "");
      return { rowCount: removeRows((row) => row.company_id === companyId && row.id === id) };
    }
    if (compact.includes(`DELETE FROM`) && compact.includes("wireframe_id=$2")) {
      const companyId = String(params[0] ?? "");
      const wireframeId = String(params[1] ?? "");
      let removed = 0;
      for (let index = comments.length - 1; index >= 0; index -= 1) {
        if (comments[index].company_id === companyId && comments[index].wireframe_id === wireframeId) {
          comments.splice(index, 1);
          removed += 1;
        }
      }
      return { rowCount: removed };
    }
    return { rowCount: 0 };
  }) as typeof harness.ctx.db.execute;

  return { rows };
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

  it("keeps Blueprint jobs project-scoped, rejects duplicate stage runs, and ignores stale completion after reset", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    seedCompanyProjects(harness);
    await builderPlugin.definition.setup(harness.ctx);

    await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      title: "A 요구사항",
      type: "external-plan",
      body: "A 프로젝트 요구사항",
      fileName: "a.md",
      format: "md",
    });
    await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
      companyId: COMPANY_ID,
      projectId: SECOND_PROJECT_ID,
      title: "B 요구사항",
      type: "external-plan",
      body: "B 프로젝트 요구사항",
      fileName: "b.md",
      format: "md",
    });

    const originalFetch = globalThis.fetch;
    let releaseFetch!: () => void;
    const fetchGate = new Promise<void>((resolve) => {
      releaseFetch = resolve;
    });
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      await fetchGate;
      return new Response(JSON.stringify({ content: [{ type: "text", text: "{}" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    try {
      const firstStart = await harness.performAction<any>(BLUEPRINT_ACTION.runStandardPlan, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        title: "A 프로젝트",
      });
      const secondStart = await harness.performAction<any>(BLUEPRINT_ACTION.runStandardPlan, {
        companyId: COMPANY_ID,
        projectId: SECOND_PROJECT_ID,
        title: "B 프로젝트",
      });
      expect(firstStart.started).toBe(true);
      expect(secondStart.started).toBe(true);

      await waitFor(() => Promise.resolve(fetchCalls), (count) => count === 2);
      const firstRunning = await harness.getData<any>(BLUEPRINT_DATA.overview, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });
      const secondRunning = await harness.getData<any>(BLUEPRINT_DATA.overview, {
        companyId: COMPANY_ID,
        projectId: SECOND_PROJECT_ID,
      });
      expect(firstRunning.state.job).toMatchObject({
        status: "running",
        stage: "standard-plan",
        projectId: PROJECT_ID,
      });
      expect(secondRunning.state.job).toMatchObject({
        status: "running",
        stage: "standard-plan",
        projectId: SECOND_PROJECT_ID,
      });
      expect(firstRunning.state.job.jobId).not.toBe(secondRunning.state.job.jobId);

      const duplicate = await harness.performAction<any>(BLUEPRINT_ACTION.runStandardPlan, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        title: "A 프로젝트 중복",
      });
      expect(duplicate.started).toBe(false);
      expect(duplicate.reason).toBe("same-stage-running");
      expect(duplicate.job.jobId).toBe(firstRunning.state.job.jobId);
      expect(fetchCalls).toBe(2);

      await harness.performAction<any>(BLUEPRINT_ACTION.reset, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });
      releaseFetch();

      const secondDone = await waitFor(
        () => harness.getData<any>(BLUEPRINT_DATA.overview, { companyId: COMPANY_ID, projectId: SECOND_PROJECT_ID }),
        (overview) => Boolean(overview.state.standardPlan) && !overview.state.job,
      );
      expect(secondDone.state.standardPlan?.projectTitle).toBeTruthy();

      await new Promise((resolve) => setTimeout(resolve, 30));
      const firstAfterReset = await harness.getData<any>(BLUEPRINT_DATA.overview, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });
      expect(firstAfterReset.state.sources).toHaveLength(0);
      expect(firstAfterReset.state.standardPlan).toBeNull();
      expect(firstAfterReset.state.job).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("scopes Wireframe reads by project and protects generating records from replacement or deletion", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    seedCompanyProjects(harness);
    await builderPlugin.definition.setup(harness.ctx);
    const wireframeDb = installWireframeMemoryDb(harness);

    await ctxImportScreenSlot(harness, PROJECT_ID);
    await ctxImportScreenSlot(harness, SECOND_PROJECT_ID);
    const now = new Date();
    wireframeDb.rows.push(
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        company_id: COMPANY_ID,
        project_id: PROJECT_ID,
        title: "A Wireframe",
        spec_doc: "A spec",
        screen_doc: "A screen",
        screen_model: minimalScreenModel(),
        reference_docs: [],
        html: null,
        status: "generating",
        error_message: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        company_id: COMPANY_ID,
        project_id: SECOND_PROJECT_ID,
        title: "B Wireframe",
        spec_doc: "B spec",
        screen_doc: "B screen",
        screen_model: minimalScreenModel(),
        reference_docs: [],
        html: null,
        status: "draft",
        error_message: null,
        created_at: new Date(now.getTime() + 1),
        updated_at: new Date(now.getTime() + 1),
      },
    );

    const first = await harness.getData<any>(WIREFRAME_DATA.getCurrent, { companyId: COMPANY_ID, projectId: PROJECT_ID });
    const second = await harness.getData<any>(WIREFRAME_DATA.getCurrent, { companyId: COMPANY_ID, projectId: SECOND_PROJECT_ID });
    expect(first.title).toBe("A Wireframe");
    expect(first.status).toBe("generating");
    expect(second.title).toBe("B Wireframe");

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(JSON.stringify({
      content: [{ type: "text", text: JSON.stringify(minimalScreenModel()) }],
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;
    try {
      await expect(harness.performAction(WIREFRAME_ACTION.createWireframe, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        input: {
          title: "A Replacement",
          specDoc: "A replacement",
        },
      })).rejects.toThrow(/생성 중/);
      await expect(harness.performAction(WIREFRAME_ACTION.deleteWireframe, {
        companyId: COMPANY_ID,
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      })).rejects.toThrow(/생성 중/);

      const created = await harness.performAction<any>(WIREFRAME_ACTION.createWireframe, {
        companyId: COMPANY_ID,
        projectId: SECOND_PROJECT_ID,
        input: {
          title: "B Replacement",
          specDoc: "B replacement",
        },
      });
      expect(created.id).toBeTruthy();
      const secondAfterCreate = await harness.getData<any>(WIREFRAME_DATA.getCurrent, {
        companyId: COMPANY_ID,
        projectId: SECOND_PROJECT_ID,
      });
      expect(secondAfterCreate.title).toBe("B Replacement");
      const firstAfterCreate = await harness.getData<any>(WIREFRAME_DATA.getCurrent, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });
      expect(firstAfterCreate.title).toBe("A Wireframe");
      expect(firstAfterCreate.status).toBe("generating");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("stores Project Builder lastBuild per project and blocks duplicate same-project builds", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    seedCompanyProjects(harness);
    await builderPlugin.definition.setup(harness.ctx);
    await importProductBuilderReadySlots(harness, PROJECT_ID, "A Product");
    await importProductBuilderReadySlots(harness, SECOND_PROJECT_ID, "B Product");

    const firstBuild = await harness.performAction<ProductBuilderBuildSummary>(PROJECT_BUILDER_ACTION.instantiateBuild, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      intake: { productName: "A Product", customerName: "BBR" },
    });
    const firstOverview = await harness.getData<ProductBuilderOverview>(PROJECT_BUILDER_DATA.overview, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
    });
    const secondOverviewBefore = await harness.getData<ProductBuilderOverview>(PROJECT_BUILDER_DATA.overview, {
      companyId: COMPANY_ID,
      projectId: SECOND_PROJECT_ID,
    });
    expect(firstOverview.lastBuild?.buildId).toBe(firstBuild.buildId);
    expect(firstOverview.buildJob).toBeNull();
    expect(secondOverviewBefore.lastBuild).toBeNull();

    const secondBuild = await harness.performAction<ProductBuilderBuildSummary>(PROJECT_BUILDER_ACTION.instantiateBuild, {
      companyId: COMPANY_ID,
      projectId: SECOND_PROJECT_ID,
      intake: { productName: "B Product", customerName: "BBR" },
    });
    const firstOverviewAfterSecond = await harness.getData<ProductBuilderOverview>(PROJECT_BUILDER_DATA.overview, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
    });
    const secondOverview = await harness.getData<ProductBuilderOverview>(PROJECT_BUILDER_DATA.overview, {
      companyId: COMPANY_ID,
      projectId: SECOND_PROJECT_ID,
    });
    expect(firstOverviewAfterSecond.lastBuild?.buildId).toBe(firstBuild.buildId);
    expect(secondOverview.lastBuild?.buildId).toBe(secondBuild.buildId);

    let releaseIssueCreate!: () => void;
    const issueCreateGate = new Promise<void>((resolve) => {
      releaseIssueCreate = resolve;
    });
    let rootCreateStarted!: () => void;
    const rootCreateStartedPromise = new Promise<void>((resolve) => {
      rootCreateStarted = resolve;
    });
    const originalCreate = harness.ctx.issues.create.bind(harness.ctx.issues);
    let delayed = false;
    harness.ctx.issues.create = (async (...args: Parameters<typeof harness.ctx.issues.create>) => {
      if (!delayed) {
        delayed = true;
        rootCreateStarted();
        await issueCreateGate;
      }
      return originalCreate(...args);
    }) as typeof harness.ctx.issues.create;

    try {
      const runningBuild = harness.performAction<ProductBuilderBuildSummary>(PROJECT_BUILDER_ACTION.instantiateBuild, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        intake: { productName: "A Product Running", customerName: "BBR" },
      });
      await rootCreateStartedPromise;
      const runningOverview = await harness.getData<ProductBuilderOverview>(PROJECT_BUILDER_DATA.overview, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });
      expect(runningOverview.buildJob).toMatchObject({ status: "running", projectId: PROJECT_ID });

      await expect(harness.performAction(PROJECT_BUILDER_ACTION.instantiateBuild, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        intake: { productName: "Duplicate", customerName: "BBR" },
      })).rejects.toThrow(/이미 진행 중/);

      const otherProjectBuild = await harness.performAction<ProductBuilderBuildSummary>(PROJECT_BUILDER_ACTION.instantiateBuild, {
        companyId: COMPANY_ID,
        projectId: SECOND_PROJECT_ID,
        intake: { productName: "B Parallel Product", customerName: "BBR" },
      });
      expect(otherProjectBuild.projectId).toBe(SECOND_PROJECT_ID);

      releaseIssueCreate();
      const finished = await runningBuild;
      expect(finished.projectId).toBe(PROJECT_ID);
      const finalOverview = await harness.getData<ProductBuilderOverview>(PROJECT_BUILDER_DATA.overview, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });
      expect(finalOverview.buildJob).toBeNull();
      expect(finalOverview.lastBuild?.buildId).toBe(finished.buildId);
    } finally {
      harness.ctx.issues.create = originalCreate as typeof harness.ctx.issues.create;
      releaseIssueCreate();
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

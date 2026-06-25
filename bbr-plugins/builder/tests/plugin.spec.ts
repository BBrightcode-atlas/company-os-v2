import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createTestHarness } from "@paperclipai/plugin-sdk/testing";
import manifest from "../src/manifest.js";
import builderPlugin from "../src/worker.js";
import {
  ACTION as BLUEPRINT_ACTION,
  BLUEPRINT_AGENT_KEYS,
  BLUEPRINT_OUTPUT_INVENTORY_SKILL_KEY,
  BLUEPRINT_PM_AGENT_KEY,
  BLUEPRINT_PM_SKILL_KEY,
  DATA as BLUEPRINT_DATA,
  PLUGIN_ID as BLUEPRINT_PLUGIN_ID,
  STATE_KEY as BLUEPRINT_STATE_KEY,
  buildScreenPrompt,
  buildWikiPages,
  renderSourceMaterialsMarkdown,
} from "../src/blueprint/contract.js";
import { ACTION as WIREFRAME_ACTION, DATA as WIREFRAME_DATA, DB_NAMESPACE, T_WIREFRAMES } from "../src/wireframe/contract.js";
import { validateHtml as validateWireframeHtml } from "../src/wireframe/wireframe-prompt.js";
import {
  ACTION as PROJECT_BUILDER_ACTION,
  BUILDER_AGENT_KEYS as PROJECT_BUILDER_AGENT_KEYS,
  BLUEPRINT_REQUIREMENT_INVENTORY_SLOT_KEY,
  BLUEPRINT_PRD_SLOT_KEY,
  DATA as PROJECT_BUILDER_DATA,
  PRODUCT_BUILDER_REQUIRED_UPSTREAM_SLOT_KEYS,
  WIREFRAME_HTML_SLOT_KEY,
  type ProductBuilderBuildSummary,
  type ProductBuilderOverview,
} from "../src/project-builder/contract.js";
import {
  ACTION as BUILDER_ACTION,
  BUILDER_MANAGED_AGENT_ADAPTER_TYPE,
  BUILDER_MANAGED_AGENT_MODEL,
  BUILDER_MANAGED_AGENT_MODEL_REASONING_EFFORT,
  DATA as BUILDER_DATA,
} from "../src/managed-resources.js";
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

function seedBlueprintPmAgent(harness: ReturnType<typeof createTestHarness>, instructionsPath: string) {
  harness.seed({
    agents: [
      {
        id: "66666666-6666-4666-8666-666666666666",
        companyId: COMPANY_ID,
        name: "Blueprint PM Agent",
        urlKey: "blueprint-pm-agent",
        role: "pm",
        title: "표준 산출물 PM 에이전트(Standard Output PM Agent)",
        icon: "target",
        status: "idle",
        reportsTo: null,
        capabilities: "기획 자료와 산출물을 관리한다.",
        adapterType: BUILDER_MANAGED_AGENT_ADAPTER_TYPE,
        adapterConfig: { instructionsFilePath: instructionsPath },
        runtimeConfig: {},
        budgetMonthlyCents: 0,
        spentMonthlyCents: 0,
        pauseReason: null,
        pausedAt: null,
        permissions: { canCreateAgents: false },
        lastHeartbeatAt: null,
        metadata: {
          paperclipManagedResource: {
            pluginKey: manifest.id,
            resourceKind: "agent",
            resourceKey: BLUEPRINT_PM_AGENT_KEY,
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
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
    const isPrd = slotKey === BLUEPRINT_PRD_SLOT_KEY;
    const isWireframe = slotKey === WIREFRAME_HTML_SLOT_KEY;
    await harness.ctx.projects.documentSlots.import(projectId, slotKey as any, {
      title: slotKey,
      format: isWireframe ? "html" : "markdown",
      body: isWireframe ? "<!DOCTYPE html><html><body>wireframe</body></html>" : `# ${productName}\n\n${slotKey}`,
      status: "ready",
      contentType: isWireframe ? "text/html" : "text/markdown",
      metadata: isPrd
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

  it("declares every Builder managed agent on the fixed Codex xhigh policy", () => {
    const expectedAgentKeys = [
      ...BLUEPRINT_AGENT_KEYS,
      ...PROJECT_BUILDER_AGENT_KEYS,
    ];
    const agents = manifest.agents ?? [];
    expect(agents.map((agent) => agent.agentKey)).toEqual(expectedAgentKeys);
    expect(expectedAgentKeys).not.toContain("blueprint-requirement-analyst");

    const pmAgent = agents.find((agent) => agent.agentKey === BLUEPRINT_PM_AGENT_KEY);
    expect(pmAgent?.capabilities).toContain("전체 독해");
    expect(pmAgent?.instructions?.content).toContain("전체 읽기(Full Reading)");
    expect(pmAgent?.adapterConfig).toMatchObject({
      paperclipSkillSync: {
        desiredSkills: [
          `plugin/${BLUEPRINT_PLUGIN_ID}/${BLUEPRINT_OUTPUT_INVENTORY_SKILL_KEY}`,
          `plugin/${BLUEPRINT_PLUGIN_ID}/${BLUEPRINT_PM_SKILL_KEY}`,
        ],
      },
    });

    for (const agent of agents) {
      expect(agent.adapterType).toBe(BUILDER_MANAGED_AGENT_ADAPTER_TYPE);
      expect(agent.adapterPreference).toEqual([BUILDER_MANAGED_AGENT_ADAPTER_TYPE]);
      expect(agent.adapterConfig).toMatchObject({
        model: BUILDER_MANAGED_AGENT_MODEL,
        modelReasoningEffort: BUILDER_MANAGED_AGENT_MODEL_REASONING_EFFORT,
      });
      expect(agent.adapterConfig).not.toHaveProperty("fastMode");
    }
  });

  it("ensures all Builder managed agents in one bootstrap action", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    seedCompanyProjects(harness);
    await builderPlugin.definition.setup(harness.ctx);

    const before = await harness.getData<any>(BUILDER_DATA.managedResources, { companyId: COMPANY_ID });
    expect(before.managedAgents.map((entry: any) => entry.status)).toEqual(
      Array(BLUEPRINT_AGENT_KEYS.length + PROJECT_BUILDER_AGENT_KEYS.length).fill("missing"),
    );

    const legacyAnalystAgentId = "55555555-5555-4555-8555-555555555555";
    harness.seed({
      agents: [
        {
          id: legacyAnalystAgentId,
          companyId: COMPANY_ID,
          name: "Legacy Blueprint Inventory Agent",
          urlKey: "legacy-blueprint-inventory-agent",
          role: "analyst",
          title: "자료 정리 에이전트(Source Material Agent)",
          icon: "list-checks",
          status: "paused",
          reportsTo: null,
          capabilities: "Legacy analyst agent",
          adapterType: BUILDER_MANAGED_AGENT_ADAPTER_TYPE,
          adapterConfig: {},
          runtimeConfig: {},
          budgetMonthlyCents: 0,
          spentMonthlyCents: 0,
          pauseReason: null,
          pausedAt: null,
          permissions: { canCreateAgents: false },
          lastHeartbeatAt: null,
          metadata: {
            paperclipManagedResource: {
              pluginKey: manifest.id,
              resourceKind: "agent",
              resourceKey: "blueprint-requirement-analyst",
            },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
      ],
    });

    const resolved = await harness.performAction<any>(BUILDER_ACTION.ensureBuilderResources, {
      companyId: COMPANY_ID,
    });
    expect(resolved.managedAgents.map((entry: any) => entry.resourceKey)).toEqual([
      ...BLUEPRINT_AGENT_KEYS,
      ...PROJECT_BUILDER_AGENT_KEYS,
    ]);
    expect(resolved.managedAgents.every((entry: any) => entry.status === "created")).toBe(true);
    expect(resolved.retiredManagedAgents).toEqual([
      expect.objectContaining({
        resourceKey: "blueprint-requirement-analyst",
        agentId: legacyAnalystAgentId,
        status: "retired",
        agent: expect.objectContaining({ status: "terminated" }),
      }),
    ]);
    expect(["created", "resolved"]).toContain(resolved.managedProject.status);
    expect(resolved.managedSkills.every((entry: any) => entry.status === "created")).toBe(true);
    expect(resolved.managedRoutines.every((entry: any) => entry.status === "created")).toBe(true);

    const after = await harness.getData<any>(BUILDER_DATA.managedResources, { companyId: COMPANY_ID });
    expect(after.managedAgents.every((entry: any) => entry.status === "resolved")).toBe(true);
    for (const entry of after.managedAgents) {
      expect(entry.agent?.adapterType).toBe(BUILDER_MANAGED_AGENT_ADAPTER_TYPE);
      expect(entry.agent?.adapterConfig).toMatchObject({
        model: BUILDER_MANAGED_AGENT_MODEL,
        modelReasoningEffort: BUILDER_MANAGED_AGENT_MODEL_REASONING_EFFORT,
      });
    }

    const driftedAgent = after.managedAgents[0].agent;
    driftedAgent.adapterType = "claude_local";
    driftedAgent.adapterConfig = { model: "old-model", modelReasoningEffort: "low" };

    const reset = await harness.performAction<any>(BUILDER_ACTION.resetBuilderResources, {
      companyId: COMPANY_ID,
    });
    expect(reset.managedAgents[0].status).toBe("reset");
    expect(reset.managedAgents[0].agent?.adapterType).toBe(BUILDER_MANAGED_AGENT_ADAPTER_TYPE);
    expect(reset.managedAgents[0].agent?.adapterConfig).toMatchObject({
      model: BUILDER_MANAGED_AGENT_MODEL,
      modelReasoningEffort: BUILDER_MANAGED_AGENT_MODEL_REASONING_EFFORT,
    });
  });

  it("keeps module data keys isolated inside the single action namespace", () => {
    const dataKeys = [
      ...Object.values(BUILDER_DATA),
      ...Object.values(BLUEPRINT_DATA),
      ...Object.values(WIREFRAME_DATA),
      ...Object.values(PROJECT_BUILDER_DATA),
    ];
    expect(new Set(dataKeys).size).toBe(dataKeys.length);
    expect(BUILDER_DATA.managedResources).toBe("builder.managed-resources");
    expect(BLUEPRINT_DATA.overview).toBe("blueprint.overview");
    expect(WIREFRAME_DATA.projects).toBe("wireframe.projects");
    expect(PROJECT_BUILDER_DATA.overview).toBe("project-builder.overview");

    const actionKeys = [
      ...Object.values(BUILDER_ACTION),
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

  it("requires the Blueprint output inventory before Product Builder runs", () => {
    expect(PRODUCT_BUILDER_REQUIRED_UPSTREAM_SLOT_KEYS[0]).toBe(BLUEPRINT_REQUIREMENT_INVENTORY_SLOT_KEY);
    expect(PRODUCT_BUILDER_REQUIRED_UPSTREAM_SLOT_KEYS).toContain(BLUEPRINT_PRD_SLOT_KEY);
  });

  it("builds source material markdown before the standard plan and carries late source items", async () => {
    const previousDisableLlm = process.env.COS_BLUEPRINT_DISABLE_LLM;
    process.env.COS_BLUEPRINT_DISABLE_LLM = "true";
    try {
      const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
      seedCompanyProjects(harness);
      await builderPlugin.definition.setup(harness.ctx);

      await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        title: "긴 요구사항 문서",
        type: "external-plan",
        body: `${"반복 배경 설명\n".repeat(9000)}\n관리자는 쿠폰 발급 정책을 설정한다.`,
        fileName: "long-requirements.md",
        format: "md",
      });

      await harness.performAction<any>(BLUEPRINT_ACTION.runStandardPlan, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        title: "긴 요구사항 프로젝트",
      });
      const done = await waitFor(
        () => harness.getData<any>(BLUEPRINT_DATA.overview, { companyId: COMPANY_ID, projectId: PROJECT_ID }),
        (overview) => Boolean(overview.state.standardPlan) && !overview.state.job,
      );

      expect(done.state.requirementInventory?.items.some((item: any) =>
        `${item.title} ${item.description}`.includes("쿠폰 발급"),
      )).toBe(true);
      expect(done.state.requirementInventory?.items.some((item: any) =>
        `${item.title} ${item.description}`.includes("쿠폰 발급")
        && item.targetDeliverables.includes("deliverable.feature_files")
        && item.targetDeliverables.includes("deliverable.api_definition"),
      )).toBe(true);
      expect(done.state.requirementInventory?.deliverables.some((deliverable: any) =>
        deliverable.slotKey === "deliverable.feature_files"
        && deliverable.units.some((unit: any) => `${unit.title} ${unit.description}`.includes("쿠폰 발급")),
      )).toBe(true);
      expect(done.state.standardPlan.functionalRequirements.some((requirement: any) =>
        `${requirement.title} ${requirement.description}`.includes("쿠폰 발급"),
      )).toBe(true);

      const docs = await harness.performAction<any>(BLUEPRINT_ACTION.writeStandardPlanDocs, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });
      expect(docs.slots.map((slot: any) => slot.slotKey)).toContain("deliverable.requirement_inventory");
      const inventorySlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.requirement_inventory", COMPANY_ID);
      expect(inventorySlot?.document?.body).toContain("자료 정리본(Source Material Markdown)");
      expect(inventorySlot?.document?.body).toContain("추출 본문 전체(Full Extracted Body)");
      expect(inventorySlot?.document?.body).toContain("```text\n");
      expect(inventorySlot?.document?.body).toContain("쿠폰 발급");

      const wikiPages = buildWikiPages(
        done.state.standardPlan,
        null,
        done.state.standardPlan.projectTitle,
        done.state.requirementInventory,
        done.state.sources,
      );
      const inventoryPage = wikiPages.find((page) => page.path.endsWith("/source-materials.md"));
      expect(inventoryPage?.contents).toContain("자료 정리본(Source Material Markdown)");
      expect(inventoryPage?.contents).toContain("```text\n");
      expect(inventoryPage?.contents).toContain("쿠폰 발급");
    } finally {
      if (previousDisableLlm === undefined) delete process.env.COS_BLUEPRINT_DISABLE_LLM;
      else process.env.COS_BLUEPRINT_DISABLE_LLM = previousDisableLlm;
    }
  });

  it("renders source material full bodies as fenced text without losing backticks", () => {
    const body = "A  line with spacing\n\nB line\n```inner fence```";
    const markdown = renderSourceMaterialsMarkdown([{
      id: "source-1",
      type: "external-plan",
      title: "원본 PDF",
      format: "pdf",
      fileName: "source.pdf",
      body,
      createdAt: "2026-06-24T00:00:00.000Z",
    }], { generatedAt: "2026-06-24T01:00:00.000Z" });

    expect(markdown).toContain("### 추출 본문 전체(Full Extracted Body)");
    expect(markdown).toContain("````text\nA  line with spacing\n\nB line\n```inner fence```\n````");
    expect(markdown).toContain(`본문 길이(Characters) | ${body.length}`);
  });

  it("adds display line breaks to sparse PDF extraction text without dropping content", () => {
    const body = `${"서론 ".repeat(220)}1. 프로젝트 소개 ${"내용 ".repeat(60)}• 핵심 항목 ${"설명 ".repeat(60)}① 첫 번째 가치`;
    const markdown = renderSourceMaterialsMarkdown([{
      id: "source-1",
      type: "external-plan",
      title: "줄바꿈 없는 PDF",
      format: "pdf",
      fileName: "source.pdf",
      body,
      createdAt: "2026-06-24T00:00:00.000Z",
    }], { generatedAt: "2026-06-24T01:00:00.000Z" });

    expect(markdown).toContain("\n\n1. 프로젝트 소개");
    expect(markdown).toContain("\n• 핵심 항목");
    expect(markdown).toContain("\n① 첫 번째 가치");
    expect(markdown.replace(/\s/g, "")).toContain(body.replace(/\s/g, ""));
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
        "deliverable.requirement_inventory",
        "deliverable.prd",
        "deliverable.feature_index",
        "deliverable.feature_files",
        "deliverable.schema_definition",
        "deliverable.api_definition",
        "deliverable.architecture",
      ]));

      const architectureSlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.architecture", COMPANY_ID);
      expect(architectureSlot?.slot.status).toBe("ready");
      expect(architectureSlot?.document?.body).toContain("아키텍쳐 정의서");
      expect(architectureSlot?.document?.body).toContain("```mermaid");
      expect(architectureSlot?.document?.body).toContain("기술 스택");
      expect(architectureSlot?.document?.body).toContain("인프라 구성");

      const prdSlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.prd", COMPANY_ID);
      const featureSlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.feature_files", COMPANY_ID);
      expect(prdSlot?.document?.body).toContain("PRD");
      expect(prdSlot?.document?.body).toContain("A 프로젝트");
      expect(prdSlot?.slot.metadata).toMatchObject({ phase: "standard-plan" });
      expect(standardDocs.files).not.toContain("docs/cos-blueprint/standard-plan.md");
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

  it("revises the selected Blueprint deliverable through PM chat and marks workflow revision state", async () => {
    const workspace = mkdtempSync(path.join(os.tmpdir(), "builder-blueprint-pm-chat-"));
    const instructionsPath = path.join(workspace, "AGENTS.md");
    writeFileSync(instructionsPath, "# Blueprint PM Agent\n\n전체 읽기(Full Reading)를 수행한다.\n", "utf8");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      content: [{
        type: "text",
        text: JSON.stringify({
          body: [
            "# PRD",
            "",
            "기존 결제 정책",
            "",
            "## 환불 기준",
            "- 결제 후 7일 이내 환불 요청을 접수한다.",
          ].join("\n"),
          changeSummary: "환불 기준 섹션을 추가했습니다.",
        }),
      }],
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    try {
      const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
      seedCompanyProjects(harness);
      seedBlueprintPmAgent(harness, instructionsPath);
      await builderPlugin.definition.setup(harness.ctx);
      await harness.ctx.projects.documentSlots.import(PROJECT_ID, "deliverable.prd", {
        title: "PRD(Product Requirements Document)",
        format: "markdown",
        body: "# PRD\n\n기존 결제 정책",
        status: "ready",
        contentType: "text/markdown",
        metadata: { plugin: "paperclip-plugin-builder", documentRefs: ["docs/cos-blueprint/product-requirements-document.md"] },
      }, COMPANY_ID);
      const beforeSlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.prd", COMPANY_ID);

      const result = await harness.performAction<any>(BLUEPRINT_ACTION.chatWithPmAgent, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        message: "결제 정책에 환불 기준을 추가해줘.",
        activeWorkspaceTab: "deliverables",
        targetDeliverableSlotKey: "deliverable.prd",
        targetDeliverableTitle: "PRD(Product Requirements Document)",
      });

      expect(result.ok).toBe(true);
      expect(result.mode).toBe("deliverable-command");
      expect(result.payload).toMatchObject({
        action: "revise-deliverable-document",
        slotKey: "deliverable.prd",
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
      expect(requestBody.messages[0].content).toContain("결제 정책에 환불 기준을 추가해줘.");
      expect(requestBody.messages[0].content).toContain("기존 결제 정책");

      const slot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.prd", COMPANY_ID);
      expect(slot?.document?.body).toContain("## 환불 기준");
      expect(slot?.document?.id).not.toBe(beforeSlot?.document?.id);
      expect(slot?.document?.latestRevisionNumber).toBe(1);
      expect(slot?.slot.metadata).toMatchObject({
        lastPmRevisionRequest: "결제 정책에 환불 기준을 추가해줘.",
        lastPmRevisionSummary: "환불 기준 섹션을 추가했습니다.",
      });

      const view = await harness.getData<any>(BLUEPRINT_DATA.projectDocumentSlots, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });
      const prd = view.slots.find((row: any) => row.slotKey === "deliverable.prd");
      expect(prd.workflow.steps).toEqual(expect.arrayContaining([
        expect.objectContaining({
          key: "deliverable.prd.pm_revision",
          title: "수정 요청 반영",
          status: "done",
        }),
      ]));
    } finally {
      fetchMock.mockRestore();
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("prioritizes explicit regeneration over PM chat revision keywords", async () => {
    const workspace = mkdtempSync(path.join(os.tmpdir(), "builder-blueprint-pm-regenerate-"));
    const instructionsPath = path.join(workspace, "AGENTS.md");
    writeFileSync(instructionsPath, "# Blueprint PM Agent\n", "utf8");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      content: [{ type: "text", text: JSON.stringify({ body: "# PRD\n\n수정됨" }) }],
    }), { status: 200, headers: { "content-type": "application/json" } }));

    try {
      const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
      seedCompanyProjects(harness);
      seedBlueprintPmAgent(harness, instructionsPath);
      await builderPlugin.definition.setup(harness.ctx);
      await harness.ctx.projects.documentSlots.import(PROJECT_ID, "deliverable.prd", {
        title: "PRD(Product Requirements Document)",
        format: "markdown",
        body: "# PRD\n\n기존 결제 정책",
        status: "ready",
        contentType: "text/markdown",
        metadata: { plugin: "paperclip-plugin-builder", documentRefs: ["docs/cos-blueprint/product-requirements-document.md"] },
      }, COMPANY_ID);

      const result = await harness.performAction<any>(BLUEPRINT_ACTION.chatWithPmAgent, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        message: "결제 정책에 환불 기준을 추가해서 재생성해줘.",
        activeWorkspaceTab: "deliverables",
        targetDeliverableSlotKey: "deliverable.prd",
        targetDeliverableTitle: "PRD(Product Requirements Document)",
      });

      expect(result.ok).toBe(false);
      expect(result.mode).toBe("deliverable-command");
      expect(result.error).toContain("at least one source material is required");
      expect(fetchMock).not.toHaveBeenCalled();
      const slot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.prd", COMPANY_ID);
      expect(slot?.slot.metadata).not.toHaveProperty("lastPmRevisionAt");
    } finally {
      fetchMock.mockRestore();
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("regenerates and writes the Screen Definitions deliverable from PM chat", async () => {
    const previousDisableLlm = process.env.COS_BLUEPRINT_DISABLE_LLM;
    process.env.COS_BLUEPRINT_DISABLE_LLM = "true";
    const workspace = mkdtempSync(path.join(os.tmpdir(), "builder-blueprint-pm-screens-"));
    const instructionsPath = path.join(workspace, "AGENTS.md");
    writeFileSync(instructionsPath, "# Blueprint PM Agent\n\n화면정의서를 산출물 슬롯에 기록한다.\n", "utf8");

    try {
      const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
      seedCompanyProjects(harness);
      seedBlueprintPmAgent(harness, instructionsPath);
      await builderPlugin.definition.setup(harness.ctx);

      await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        title: "AIGA 요구사항",
        type: "external-plan",
        body: "AIGA는 관리자 대시보드, 회원 관리, 결제 내역 화면이 필요하다.",
        fileName: "aiga-requirements.md",
        format: "md",
      });
      await harness.performAction<any>(BLUEPRINT_ACTION.runStandardPlan, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        title: "AIGA",
      });
      await waitFor(
        () => harness.getData<any>(BLUEPRINT_DATA.overview, { companyId: COMPANY_ID, projectId: PROJECT_ID }),
        (overview) => Boolean(overview.state.standardPlan) && !overview.state.job,
      );
      await harness.performAction<any>(BLUEPRINT_ACTION.confirmStandardPlan, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });

      const result = await harness.performAction<any>(BLUEPRINT_ACTION.chatWithPmAgent, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        message: "화면정의서(Screen Definitions)을 재분석하고 다시 생성해줘.",
        activeWorkspaceTab: "deliverables",
        targetDeliverableSlotKey: "deliverable.screen_definitions",
        targetDeliverableTitle: "화면정의서(Screen Definitions)",
      });

      expect(result.ok).toBe(true);
      expect(result.mode).toBe("deliverable-command");
      expect(result.message).toContain("자동 기록");
      expect(result.payload).toMatchObject({
        action: "run-screens",
        slotKey: "deliverable.screen_definitions",
      });

      const overview = await waitFor(
        () => harness.getData<any>(BLUEPRINT_DATA.overview, { companyId: COMPANY_ID, projectId: PROJECT_ID }),
        (value) => Boolean(value.state.screenPlan) && !value.state.job,
      );
      const screenSlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.screen_definitions", COMPANY_ID);
      expect(screenSlot?.slot.status).toBe("draft");
      expect(screenSlot?.slot.metadata).toMatchObject({ phase: "screen-definitions" });
      expect(screenSlot?.slot.metadata?.documentRefs).toHaveLength(overview.state.screenPlan.screens.length);
      expect(screenSlot?.document?.body).toContain("화면정의서");
      expect(screenSlot?.document?.body).toContain("AIGA");
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

  it("recovers stale Blueprint jobs after the worker can no longer finish them", async () => {
    const previousDisableLlm = process.env.COS_BLUEPRINT_DISABLE_LLM;
    process.env.COS_BLUEPRINT_DISABLE_LLM = "true";
    try {
      const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
      seedCompanyProjects(harness);
      await builderPlugin.definition.setup(harness.ctx);

      await harness.ctx.state.set({
        scopeKind: "project",
        scopeId: PROJECT_ID,
        namespace: `company:${COMPANY_ID}`,
        stateKey: BLUEPRINT_STATE_KEY,
      }, {
        sources: [{
          id: "interrupted-source-0001",
          title: "재시작 유실 요구사항",
          type: "external-plan",
          body: "재시작 이후에도 산출물 분해 재실행이 가능해야 한다.",
          createdAt: "2026-06-22T00:00:00.000Z",
          fileName: "interrupted.md",
          format: "md",
        }],
        productBuilderBlueprintId: "online-service-standard",
        productBuilderBlueprintSelectedAt: null,
        requirementInventory: null,
        standardPlan: null,
        screenPlan: null,
        projectDocumentSlots: [],
        job: {
          kind: "requirement-inventory",
          stage: "requirement-inventory",
          status: "running",
          projectId: PROJECT_ID,
          jobId: "lost-job-after-restart",
          startedAt: "2000-01-01T00:00:00.000Z",
        },
        updatedAt: "2026-06-22T00:00:00.000Z",
      });

      const overview = await harness.getData<any>(BLUEPRINT_DATA.overview, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });
      expect(overview.state.job).toMatchObject({
        status: "error",
        kind: "requirement-inventory",
        jobId: "lost-job-after-restart",
      });
      expect(overview.state.job.message).toContain("10분 안에 완료되지 않아 중단");

      const restart = await harness.performAction<any>(BLUEPRINT_ACTION.runRequirementInventory, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });
      expect(restart.started).toBe(true);
      expect(restart.job.jobId).not.toBe("lost-job-after-restart");
      await waitFor(
        () => harness.getData<any>(BLUEPRINT_DATA.overview, { companyId: COMPANY_ID, projectId: PROJECT_ID }),
        (nextOverview) => !nextOverview.state.job,
      );
      const sourceMarkdownSlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.requirement_inventory", COMPANY_ID);
      expect(sourceMarkdownSlot?.document?.body).toContain("자료 정리본(Source Material Markdown)");
      expect(sourceMarkdownSlot?.document?.body).toContain("재시작 이후에도 산출물 분해 재실행이 가능해야 한다.");
    } finally {
      if (previousDisableLlm === undefined) delete process.env.COS_BLUEPRINT_DISABLE_LLM;
      else process.env.COS_BLUEPRINT_DISABLE_LLM = previousDisableLlm;
    }
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

  it("recovers code-fenced and truncated LLM JSON instead of falling back to a generic plan", async () => {
    async function runWithMockedLlm(projectId: string, title: string, llmText: string) {
      const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
      seedCompanyProjects(harness);
      await builderPlugin.definition.setup(harness.ctx);
      await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
        companyId: COMPANY_ID,
        projectId,
        title: "AIGA 기획",
        type: "external-plan",
        body: "AIGA 의료정보 플랫폼: 명의 검색, AI 챗봇, 커뮤니티",
        fileName: "aiga.md",
        format: "md",
      });
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async () => new Response(
        JSON.stringify({ content: [{ type: "text", text: llmText }], stop_reason: "end_turn" }),
        { status: 200, headers: { "content-type": "application/json" } },
      )) as typeof fetch;
      try {
        await harness.performAction<any>(BLUEPRINT_ACTION.runStandardPlan, { companyId: COMPANY_ID, projectId, title });
        const done = await waitFor(
          () => harness.getData<any>(BLUEPRINT_DATA.overview, { companyId: COMPANY_ID, projectId }),
          (o) => Boolean(o.state.standardPlan) && !o.state.job,
        );
        return done.state.standardPlan;
      } finally {
        globalThis.fetch = originalFetch;
      }
    }

    // 1) ```json 코드펜스로 감싼 응답(SYSTEM_GUARD 위반) — strip 후 정상 파싱, fallback 아님.
    const fenced = "```json\n" + JSON.stringify({
      projectTitle: "AIGA 코드펜스 플랜",
      overview: "명의/병원 검색과 AI 상담",
      goals: ["접근성", "상담 만족도"],
      scope: { inScope: ["검색"], outOfScope: ["예약"] },
      functionalRequirements: [{ title: "명의 검색", description: "필터/랭킹", priority: "must" }],
      nonFunctionalRequirements: ["모바일 최적화"],
      schemas: [], apis: [], layouts: [], risks: [], assumptions: [],
    }) + "\n```";
    const fencedPlan = await runWithMockedLlm(PROJECT_ID, "AIGA 코드펜스", fenced);
    expect(fencedPlan.usedFallback).toBeFalsy();
    expect(fencedPlan.projectTitle).toBe("AIGA 코드펜스 플랜");
    expect(fencedPlan.functionalRequirements.map((f: any) => f.title)).toContain("명의 검색");

    // 2) max_tokens 절단으로 배열 한가운데서 끊긴 응답 — repair 후 핵심 내용 보존, fallback 아님.
    const truncated = '{\n  "projectTitle": "AIGA 절단 플랜",\n  "overview": "명의/병원 검색",\n  "goals": ["g1", "g2"],\n  "schemas": [\n    { "code": "SCH-001", "name": "User", "fields": [\n      { "name": "id", "type": "uuid", "required": true },\n      { "name": "email", "type": "';
    const repairedPlan = await runWithMockedLlm(SECOND_PROJECT_ID, "AIGA 절단", truncated);
    expect(repairedPlan.usedFallback).toBeFalsy();
    expect(repairedPlan.projectTitle).toBe("AIGA 절단 플랜");
    expect(repairedPlan.goals).toContain("g1");
  });

  it("buildScreenPrompt embeds full schema/api contract bodies and keeps layout page-local", () => {
    const plan: any = {
      projectTitle: "AIGA",
      overview: "의료 정보 플랫폼",
      goals: ["g1"],
      functionalRequirements: [{ title: "명의 찾기", description: "", priority: "must" }],
      schemas: [{ code: "SCH-001", name: "User", description: "사용자", owner: "Backend", fields: [
        { name: "nickname", type: "string", required: true, validation: "2~10자", description: "닉네임" },
      ] }],
      apis: [{ code: "API-001", method: "GET", path: "/api/search", summary: "통합 검색", input: [], output: [], schemas: ["SCH-001"], auth: "optional", errors: [{ code: "429", condition: "한도 초과" }] }],
      layouts: [{ code: "COS-LAY-001", name: "공통 레이아웃", description: "", slots: [
        { code: "SLOT-TABBAR", name: "하단 탭바", purpose: "홈·명의찾기·커뮤니티 탭 전환" },
      ] }],
    };
    const prompt = buildScreenPrompt({ standardPlan: plan, sources: [] });
    // 계약 "본문"이 들어있어야 한다(코드만 X).
    expect(prompt).toContain("nickname");
    expect(prompt).toContain("2~10자");
    expect(prompt).toContain("GET /api/search");
    expect(prompt).toContain("429(한도 초과)");
    expect(prompt).toContain("layoutCode/layoutSlot");
    expect(prompt).toContain("별도 산출물로 만들지 않는다");
    expect(prompt).not.toContain("## 확정 산출물 — 공통 레이아웃 정의서");
    expect(prompt).not.toContain("하단 탭바");
    expect(prompt).not.toContain("홈·명의찾기·커뮤니티 탭 전환");
    // 도구 호출/추가요청 금지 가드.
    expect(prompt).toMatch(/도구.*호출하지 말고|추가 자료를 요청하지/);
  });

  it("validateHtml flags an inline <script> with a JS syntax error (broken navigation) and passes valid JS", () => {
    // 실제 버그와 같은 에러 클래스: 배열 요소 사이 누락으로 'Unexpected identifier'.
    const broken = [
      '<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script></head><body>',
      '<section data-screen="s1">홈</section>',
      "<script>",
      "function go(id){ document.getElementById(id).classList.add('active'); }",
      "const data = [{n:'김명의' badge:true}];", // ← 콤마 누락 → SyntaxError
      "</script></body></html>",
    ].join("\n");
    const brokenIssues = validateWireframeHtml(broken);
    expect(brokenIssues.length).toBeGreaterThan(0);
    expect(brokenIssues.join(" ")).toMatch(/문법 오류|작동하지 않습니다/);

    const ok = [
      '<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script></head><body>',
      '<section class="screen active" data-screen="s1">홈</section>',
      '<section class="screen" data-screen="s2">명의찾기</section>',
      "<script>",
      "function go(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); document.getElementById(id).classList.add('active'); }",
      "document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));",
      "</script></body></html>",
    ].join("\n");
    expect(validateWireframeHtml(ok)).toEqual([]);
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

  it("exposes Blueprint upstream slots to the Wireframe input page via upstreamSlots", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    seedCompanyProjects(harness);
    await builderPlugin.definition.setup(harness.ctx);

    // 직접입력 모드(projectId 없음) → 빈 묶음, ready=false
    const noProject = await harness.getData<any>(WIREFRAME_DATA.upstreamSlots, { companyId: COMPANY_ID });
    expect(noProject.projectId).toBeNull();
    expect(noProject.ready).toBe(false);
    expect(noProject.screenDefinitions).toBeNull();
    expect(noProject.prd).toBeNull();

    // 화면정의서 ready + screenCount metadata, PRD approved
    await harness.ctx.projects.documentSlots.import(PROJECT_ID, "deliverable.screen_definitions" as any, {
      title: "화면정의서(Screen Definitions)",
      format: "markdown",
      body: "# 화면정의서\n\n## SCR-001 상품 목록\n둘러보기 화면",
      status: "ready",
      contentType: "text/markdown",
      metadata: { plugin: "paperclip-plugin-builder", screenCount: 3 },
    }, COMPANY_ID);
    await harness.ctx.projects.documentSlots.import(PROJECT_ID, "deliverable.prd" as any, {
      title: "PRD(Product Requirements Document)",
      format: "markdown",
      body: "# PRD\n\n실행 기준선",
      status: "approved",
      contentType: "text/markdown",
      metadata: { plugin: "paperclip-plugin-builder" },
    }, COMPANY_ID);

    const ready = await harness.getData<any>(WIREFRAME_DATA.upstreamSlots, { companyId: COMPANY_ID, projectId: PROJECT_ID });
    expect(ready.ready).toBe(true);
    expect(ready.screenDefinitions.status).toBe("ready");
    expect(ready.screenDefinitions.included).toBe(true);
    expect(ready.screenDefinitions.hasBody).toBe(true);
    expect(ready.screenDefinitions.screenCount).toBe(3);
    expect(ready.screenDefinitions.bodyPreview).toContain("화면정의서");
    expect(ready.prd.status).toBe("approved");
    expect(ready.prd.included).toBe(true);

    // draft 화면정의서 → 생성 불가(ready=false), included=false
    await harness.ctx.projects.documentSlots.import(SECOND_PROJECT_ID, "deliverable.screen_definitions" as any, {
      title: "화면정의서(Screen Definitions)",
      format: "markdown",
      body: "# 화면정의서 초안",
      status: "draft",
      contentType: "text/markdown",
      metadata: { plugin: "paperclip-plugin-builder", screenCount: 2 },
    }, COMPANY_ID);

    const draft = await harness.getData<any>(WIREFRAME_DATA.upstreamSlots, { companyId: COMPANY_ID, projectId: SECOND_PROJECT_ID });
    expect(draft.ready).toBe(false);
    expect(draft.screenDefinitions.status).toBe("draft");
    expect(draft.screenDefinitions.included).toBe(false);
    expect(draft.screenDefinitions.screenCount).toBe(2);
  });

  it("requires a project and rejects creation without one (direct input mode removed)", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    seedCompanyProjects(harness);
    await builderPlugin.definition.setup(harness.ctx);
    await expect(harness.performAction(WIREFRAME_ACTION.createWireframe, {
      companyId: COMPANY_ID,
      input: { title: "프로젝트 없이 생성" },
    })).rejects.toThrow(/프로젝트를 선택/);
  });

  it("records the wireframe deliverable slot via a synchronous action (scope-safe)", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    seedCompanyProjects(harness);
    await builderPlugin.definition.setup(harness.ctx);
    const wireframeDb = installWireframeMemoryDb(harness);
    const now = new Date();
    wireframeDb.rows.push({
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      company_id: COMPANY_ID,
      project_id: PROJECT_ID,
      title: "WF",
      spec_doc: "",
      screen_doc: "",
      screen_model: minimalScreenModel(),
      reference_docs: [],
      html: "<!DOCTYPE html><html><body>wf</body></html>",
      status: "generated",
      error_message: null,
      created_at: now,
      updated_at: now,
    });

    const res = await harness.performAction<any>(WIREFRAME_ACTION.syncDeliverableSlot, {
      companyId: COMPANY_ID,
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    });
    expect(res.ok).toBe(true);
    const slot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.wireframe_html", COMPANY_ID);
    expect(slot?.slot.status).toBe("ready");
    expect(slot?.document?.body).toContain("<!DOCTYPE html>");

    // 생성 완료 전(draft/generating)이면 기록을 건너뛴다.
    wireframeDb.rows[0].status = "draft";
    const skip = await harness.performAction<any>(WIREFRAME_ACTION.syncDeliverableSlot, {
      companyId: COMPANY_ID,
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    });
    expect(skip.ok).toBe(false);
    expect(skip.skipped).toBe(true);
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

import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import { createTestHarness } from "@paperclipai/plugin-sdk/testing";
import manifest from "../src/manifest.js";
import builderPlugin from "../src/worker.js";
import { reconcileManagedSkillResettingDrift } from "../src/managed-skill-sync.js";
import {
  ACTION as BLUEPRINT_ACTION,
  BLUEPRINT_AGENT_KEYS,
  BLUEPRINT_PM_AGENT_KEY,
  BLUEPRINT_PM_SKILL_KEY,
  DATA as BLUEPRINT_DATA,
  PLUGIN_ID as BLUEPRINT_PLUGIN_ID,
  PROJECT_DOCUMENT_SLOT_DEFINITIONS,
  SOURCE_FORMATS,
  STATE_KEY as BLUEPRINT_STATE_KEY,
  SUBMIT_BLUEPRINT_PRD_TOOL,
  buildFallbackRequirementInventory,
  buildFallbackPrd,
  buildBlueprintPmAgentPrdPrompt,
  buildScreenPrompt,
  buildPrdPrompt,
  buildWikiPages,
  renderPrdDocuments,
  renderScreenDocuments,
} from "../src/blueprint/contract.js";
import { SOURCE_INTAKE_WORKFLOW_DEFINITIONS } from "../src/blueprint/source-intake/registry.js";
import { fetchNotionSharedPageSource, isNotionSharedPageUrl } from "../src/blueprint/source-intake/notion.js";
import { ACTION as WIREFRAME_ACTION, DATA as WIREFRAME_DATA, DB_NAMESPACE, T_WIREFRAMES } from "../src/wireframe/contract.js";
import { validateHtml as validateWireframeHtml } from "../src/wireframe/wireframe-prompt.js";
import {
  ACTION as PROJECT_BUILDER_ACTION,
  BUILDER_AGENT_KEYS as PROJECT_BUILDER_AGENT_KEYS,
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
import { FILE_ACCEPT, formatFromFileName, parseFile, sourceBodyForRenderedSourceItem } from "../src/blueprint/ui/parse.js";

const COMPANY_ID = "96fcd977-1d55-4697-a464-abb656dd57c2";
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const SECOND_PROJECT_ID = "44444444-4444-4444-8444-444444444444";
const INTERNAL_BUILDER_OUTPUT_MARKERS = [
  "기획 자료 등록",
  "브리프 기준선 검토",
  "관리자 검수",
  "ProjectBrief",
  "ScreenSpec",
  "/api/project-briefs",
  "project-briefs",
  "COS Blueprint 운영",
  "COS-SCR",
  "COS-LAY",
];

async function waitFor<T>(read: () => Promise<T>, ready: (value: T) => boolean): Promise<T> {
  let latest: T;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    latest = await read();
    if (ready(latest)) return latest;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return latest!;
}

function testPrdSources(sources: any[]): any[] {
  return sources
    .filter((source) => (
      source.format !== "figma"
      && source.intakeWorkflow !== "figma"
      && !/figma\.(com|site)/i.test(String(source.url ?? ""))
    ))
    .map((source) => ({
      ...source,
      body: String(source.body ?? "")
        .split(/\n/)
        .filter((line) => !/https?:\/\/[^\s)]+figma\.(?:com|site)/i.test(line))
        .join("\n")
        .trim(),
    }))
    .filter((source) => source.body.length > 0);
}

async function submitBlueprintPrdForTest(
  harness: ReturnType<typeof createTestHarness>,
  projectId: string,
  title: string,
  options: {
    prd?: Record<string, unknown>;
    requirementInventory?: Record<string, unknown>;
  } = {},
) {
  const overview = await harness.getData<any>(BLUEPRINT_DATA.overview, {
    companyId: COMPANY_ID,
    projectId,
  });
  const sources = testPrdSources(overview.state.sources);
  const requirementInventory = options.requirementInventory ?? buildFallbackRequirementInventory({
    sources,
    chunkCount: Math.max(1, sources.length),
  });
  const basePrd = buildFallbackPrd({
    title,
    sources,
    productBuilderBlueprintId: overview.state.productBuilderBlueprintId,
  });
  const toolResult = await harness.executeTool<any>(SUBMIT_BLUEPRINT_PRD_TOOL.name, {
    projectId,
    requirementInventory,
    prd: {
      ...basePrd,
      ...(options.prd ?? {}),
    },
  }, {
    companyId: COMPANY_ID,
    projectId,
    agentId: "66666666-6666-4666-8666-666666666666",
    runId: overview.state.job?.agentRunId ?? "test-run",
  });
  if (toolResult.error) throw new Error(toolResult.error);
  return toolResult.data;
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

async function makeDocxBytes(text: string): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const xmlText = (value: string) => value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const paragraph = (value: string, styleId?: string) => [
    "<w:p>",
    styleId ? `<w:pPr><w:pStyle w:val="${styleId}"/></w:pPr>` : "",
    `<w:r><w:t>${xmlText(value)}</w:t></w:r>`,
    "</w:p>",
  ].join("");
  zip.file("[Content_Types].xml", [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>',
    "</Types>",
  ].join(""));
  zip.file("_rels/.rels", [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
    "</Relationships>",
  ].join(""));
  zip.file("word/_rels/document.xml.rels", [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
    "</Relationships>",
  ].join(""));
  zip.file("word/styles.xml", [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style>',
    '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/></w:style>',
    "</w:styles>",
  ].join(""));
  zip.file("word/document.xml", [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    "<w:body>",
    paragraph("AIGA Admin", "Heading1"),
    paragraph("1. 문서 개요", "Heading2"),
    paragraph(text),
    "<w:tbl>",
    "<w:tr>",
    `<w:tc>${paragraph("화면")}</w:tc>`,
    `<w:tc>${paragraph("정책")}</w:tc>`,
    "</w:tr>",
    "<w:tr>",
    `<w:tc>${paragraph("신고 처리")}</w:tc>`,
    `<w:tc>${paragraph("승인/반려 상태 관리")}</w:tc>`,
    "</w:tr>",
    "</w:tbl>",
    "<w:sectPr/>",
    "</w:body>",
    "</w:document>",
  ].join(""));
  const bytes = await zip.generateAsync({ type: "uint8array" });
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
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

function surfaceScreen(code: string, name: string, route: string, access: string, targetSurface: string) {
  return {
    code,
    name,
    description: `${name} 화면`,
    targetSurface,
    layoutCode: "LAY-001",
    layoutSlot: targetSurface === "admin" ? "SLOT-ADMIN-MAIN" : "SLOT-MAIN",
    route,
    access,
    primaryTestId: code.toLowerCase(),
    schemas: [],
    apis: [],
    fields: [],
    states: [
      { name: "default", description: "기본 상태" },
      { name: "empty", description: "빈 상태" },
      { name: "loading", description: "로딩 상태" },
      { name: "error", description: "오류 상태" },
      { name: "permission", description: "권한 상태" },
    ],
    actions: [{
      code: "ACT-01",
      testId: `${code.toLowerCase()}-act-01`,
      trigger: "진입",
      description: `${name} 화면에 진입한다.`,
      apiCodes: [],
    }],
    acceptanceCriteria: [{
      code: "AC-01",
      testId: `${code.toLowerCase()}-ac-01`,
      description: `${name} 화면이 표시된다.`,
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
        extraArgs: ["--skip-git-repo-check"],
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
        extraArgs: ["--skip-git-repo-check"],
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
      extraArgs: ["--skip-git-repo-check"],
    });
  });

  it("resets a managed skill when reconcile reports manifest drift", async () => {
    const reconcile = vi.fn(async () => ({
      defaultDrift: { changedFiles: ["SKILL.md"] },
      status: "resolved",
    }));
    const reset = vi.fn(async () => ({
      defaultDrift: null,
      status: "reset",
    }));

    const result = await reconcileManagedSkillResettingDrift({
      skills: { managed: { reconcile, reset } },
    }, BLUEPRINT_PM_SKILL_KEY, COMPANY_ID);

    expect(result).toMatchObject({ status: "reset" });
    expect(reconcile).toHaveBeenCalledWith(BLUEPRINT_PM_SKILL_KEY, COMPANY_ID);
    expect(reset).toHaveBeenCalledWith(BLUEPRINT_PM_SKILL_KEY, COMPANY_ID);
  });

  it("resets a drifted Blueprint PM skill before invoking Development Requirements Brief generation", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    seedCompanyProjects(harness);
    await builderPlugin.definition.setup(harness.ctx);

    const originalReconcile = harness.ctx.skills.managed.reconcile.bind(harness.ctx.skills.managed);
    const resetSpy = vi.spyOn(harness.ctx.skills.managed, "reset");
    vi.spyOn(harness.ctx.skills.managed, "reconcile").mockImplementation(async (skillKey, companyId) => {
      const resolved = await originalReconcile(skillKey, companyId);
      if (skillKey !== BLUEPRINT_PM_SKILL_KEY) return resolved;
      return { ...resolved, defaultDrift: { changedFiles: ["SKILL.md"] } };
    });

    await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      title: "고객 요구사항",
      type: "customer-brief",
      body: "개발 요구사항 브리프에는 사용자 로그인과 관리자 승인 기능을 포함한다.",
      format: "md",
    });
    await harness.performAction<any>(BLUEPRINT_ACTION.runPrd, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      title: "DRB drift reset",
    });

    expect(resetSpy).toHaveBeenCalledWith(BLUEPRINT_PM_SKILL_KEY, COMPANY_ID);
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
    expect(SOURCE_FORMATS).toContain("notion");
    expect(formatFromFileName("brief.md")).toBe("md");
    expect(formatFromFileName("proposal.docx")).toBe("docx");
    expect(formatFromFileName("storyboard.pptx")).toBe("pptx");
    expect(formatFromFileName("requirements.pdf")).toBe("pdf");
    expect(formatFromFileName("data.xlsx")).toBe("xlsx");
  });

  it("parses uploaded docx files through Mammoth markdown conversion", async () => {
    const docxBytes = await makeDocxBytes("어드민 신고 처리 화면 상세 정의와 사용자 관리 화면 상세 정의");
    const file = new File([docxBytes], "AIGA_Admin_화면정의서_v1_2.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const parsed = await parseFile(file);

    expect(parsed.format).toBe("docx");
    expect(parsed.text).toContain("# AIGA Admin");
    expect(parsed.text).toContain("## 1\\. 문서 개요");
    expect(parsed.text).toContain("어드민 신고 처리 화면 상세 정의와 사용자 관리 화면 상세 정의");
  });

  it("keeps Notion page content after markdown dividers in the selected source body", () => {
    const notionBlock = [
      "# 기획 자료(Source Material) - Aiga 정책·화면정의서 (외주)",
      "",
      "## 본문(Body)",
      "",
      "## NOTION-001. Aiga 정책·화면정의서 (외주)",
      "",
      "- 하위 페이지: 사용자 등급별 정책 화면정의서 v1.0(외주) (https://www.notion.so/36d426e29161817e9609c9c0e5a58a51)",
      "",
      "---",
      "",
      "### NOTION-002. 사용자 등급별 정책 화면정의서 v1.0(외주)",
      "",
      "사용자 등급별 정책 본문",
      "",
      "## 페이지 목록(Page Index)",
      "",
      "- NOTION-001 Aiga 정책·화면정의서 (외주)",
      "  - URL: https://www.notion.so/36d426e29161818d8bc1e859f782d870",
      "  - Page ID: 36d426e2-9161-818d-8bc1-e859f782d870",
      "  - Depth: 0",
      "  - Source: Notion API",
      "  - Status: fetched",
    ].join("\n");
    const otherBlock = [
      "# 기획 자료(Source Material) - 다른 자료",
      "",
      "## 본문(Body)",
      "",
      "다른 자료 본문",
    ].join("\n");

    const selected = sourceBodyForRenderedSourceItem(
      `${notionBlock}\n\n---\n\n${otherBlock}`,
      "Aiga 정책·화면정의서 (외주)",
      undefined,
      { format: "notion", intakeWorkflow: "notion_shared_page" },
    );

    expect(selected).toContain("### 사용자 등급별 정책 화면정의서 v1.0(외주)");
    expect(selected).toContain("사용자 등급별 정책 본문");
    expect(selected).not.toContain("페이지 목록(Page Index)");
    expect(selected).not.toContain("Page ID:");
    expect(selected).not.toContain("NOTION-001");
    expect(selected).not.toContain("## 본문(Body)");
    expect(selected).not.toContain("# 기획 자료(Source Material) - 다른 자료");
  });

  it("keeps Blueprint source intake workflows registered separately from deliverable workflows", () => {
    expect(SOURCE_INTAKE_WORKFLOW_DEFINITIONS.map((workflow) => workflow.id)).toEqual([
      "direct_text",
      "file_upload",
      "url",
      "figma",
      "notion_shared_page",
    ]);
    expect(isNotionSharedPageUrl("https://app.notion.com/p/Aiga-36d426e29161818d8bc1e859f782d870?source=copy_link")).toBe(true);
    expect(isNotionSharedPageUrl("https://www.notion.com/Aiga-36d426e29161818d8bc1e859f782d870")).toBe(true);
    expect(isNotionSharedPageUrl("https://workspace.notion.site/AIGA-921df4f05d35129789b7a496f812e361")).toBe(true);
    expect(isNotionSharedPageUrl("https://www.notion.so/AIGA-921df4f05d35129789b7a496f812e361")).toBe(true);
    expect(isNotionSharedPageUrl("https://www.notion.com/help")).toBe(false);
    expect(isNotionSharedPageUrl("https://example.com/notion")).toBe(false);
  });

  it("does not promote Notion intake metadata to brief features", async () => {
    const previousDisableLlm = process.env.COS_BLUEPRINT_DISABLE_LLM;
    process.env.COS_BLUEPRINT_DISABLE_LLM = "true";
    try {
      const source = {
        id: "src-aiga-notion",
        title: "AIGA",
        type: "external-plan",
        body: [
          "# AIGA",
          "source_type: notion_shared_page",
          "자료 유형: 노션 공유페이지",
          "https://www.notion.com/AIGA-921df4f05d35129789b7a496f812e361",
          "fetch_status: fetched",
          "## 노션 공유페이지(Notion Shared Page)",
          "수집 워크플로우(Intake Workflow): notion_shared_page",
          "URL 가져오기(URL Fetch): fetched",
          "",
          "## 핵심 기능",
          "명의/병원 추천 챗봇",
          "환우 커뮤니티",
          "치료 여정 기록",
        ].join("\n"),
        createdAt: "2026-06-25T00:00:00.000Z",
        format: "notion",
        intakeWorkflow: "notion_shared_page",
        url: "https://www.notion.com/AIGA-921df4f05d35129789b7a496f812e361",
      } as const;

      const inventory = buildFallbackRequirementInventory({ sources: [source], chunkCount: 1 });
      const plan = buildFallbackPrd({
        title: "AIGA",
        sources: [source],
        productBuilderBlueprintId: "online-service-standard",
      });
      const fallbackText = JSON.stringify({ inventory, plan });
      expect(fallbackText).toContain("명의/병원 추천 챗봇");
      expect(fallbackText).toContain("환우 커뮤니티");
      expect(fallbackText).not.toContain("notion_shared_page");
      expect(fallbackText).not.toContain("노션 공유페이지");
      const fallbackRequirementTitles = plan.functionalRequirements.map((item) => item.title);
      expect(fallbackRequirementTitles).not.toEqual(expect.arrayContaining([
        "AIGA",
        "source_type: notion_shared_page",
        "자료 유형: 노션 공유페이지",
        "fetch_status: fetched",
        "핵심 기능",
        "노션 공유페이지(Notion Shared Page)",
      ]));
      const inventoryTitles = inventory.items.map((item) => item.title);
      expect(inventoryTitles).not.toEqual(expect.arrayContaining([
        "AIGA",
        "source_type: notion_shared_page",
        "자료 유형: 노션 공유페이지",
        "fetch_status: fetched",
        "핵심 기능",
        "노션 공유페이지(Notion Shared Page)",
      ]));

      const prompt = buildPrdPrompt({
        title: "AIGA",
        sources: [source],
        productBuilderBlueprintId: "online-service-standard",
        requirementInventory: inventory,
      });
      expect(prompt).toContain("수집 방식이나 메타데이터를 기능명으로 쓰지 않는다");
      const sourcePrompt = prompt.split("## Source Material").at(-1) ?? "";
      expect(sourcePrompt).not.toContain("notion_shared_page");
      expect(sourcePrompt).not.toContain("노션 공유페이지");

      const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
      seedCompanyProjects(harness);
      await builderPlugin.definition.setup(harness.ctx);
      const invokeCalls: Array<Parameters<typeof harness.ctx.agents.invoke>> = [];
      const originalInvoke = harness.ctx.agents.invoke;
      harness.ctx.agents.invoke = (async (...args: Parameters<typeof harness.ctx.agents.invoke>) => {
        invokeCalls.push(args);
        return originalInvoke(...args);
      }) as typeof harness.ctx.agents.invoke;

      await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        title: "AIGA",
        type: "external-plan",
        body: [
          "# AIGA",
          "source_type: notion_shared_page",
          "자료 유형: 노션 공유페이지",
          "url: https://www.notion.com/AIGA-921df4f05d35129789b7a496f812e361",
          "fetch_status: fetched",
          "",
          "## 핵심 기능",
          "- 명의/병원 추천 챗봇",
          "- 환우 커뮤니티",
          "- 치료 여정 기록",
        ].join("\n"),
        url: "https://www.notion.com/AIGA-921df4f05d35129789b7a496f812e361",
        intakeWorkflow: "notion_shared_page",
        fetchUrl: false,
      });
      await harness.performAction<any>(BLUEPRINT_ACTION.runPrd, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        title: "AIGA",
      });
      expect(invokeCalls[0]?.[2]).toMatchObject({ forceFreshSession: true });
      await submitBlueprintPrdForTest(harness, PROJECT_ID, "AIGA");
      const done = await waitFor(
        () => harness.getData<any>(BLUEPRINT_DATA.overview, { companyId: COMPANY_ID, projectId: PROJECT_ID }),
        (overview) => Boolean(overview.state.prd) && !overview.state.job,
      );
      const generatedText = JSON.stringify({
        inventory: done.state.requirementInventory,
        plan: done.state.prd,
      });
      expect(generatedText).toContain("명의/병원 추천 챗봇");
      expect(generatedText).toContain("환우 커뮤니티");
      expect(generatedText).not.toContain("notion_shared_page");
      expect(generatedText).not.toContain("노션 공유페이지");
      expect(done.state.prd.functionalRequirements.map((item: any) => item.title)).not.toEqual(expect.arrayContaining([
        "AIGA",
        "source_type: notion_shared_page",
        "자료 유형: 노션 공유페이지",
        "fetch_status: fetched",
        "핵심 기능",
        "노션 공유페이지(Notion Shared Page)",
      ]));
    } finally {
      if (previousDisableLlm === undefined) delete process.env.COS_BLUEPRINT_DISABLE_LLM;
      else process.env.COS_BLUEPRINT_DISABLE_LLM = previousDisableLlm;
    }
  });

  it("renders Development Requirements Brief workflow output with source-backed detail instead of placeholder summaries", () => {
    const source = {
      id: "src-aiga-prd",
      title: "AIGA 상세 기획",
      type: "external-plan",
      body: "환자는 지역, 진료과, 질환명으로 명의를 검색한다. 검색 결과는 필터, 랭킹 근거, 병원 정보를 함께 보여준다.",
      createdAt: "2026-06-25T00:00:00.000Z",
      format: "md",
    } as const;
    const inventory = {
      deliverables: [],
      items: [
        {
          id: "REQ-001",
          category: "feature",
          targetDeliverables: ["deliverable.prd", "deliverable.feature_files"],
          title: "명의 검색",
          description: "환자가 지역, 진료과, 질환명으로 명의를 찾고 필터와 랭킹 근거를 확인한다.",
          sourceRefs: [{ sourceId: source.id, sourceTitle: source.title, evidenceExcerpt: "지역, 진료과, 질환명으로 명의를 검색한다" }],
          confidence: 0.95,
          status: "confirmed",
        },
        {
          id: "REQ-002",
          category: "actor_or_permission",
          targetDeliverables: ["deliverable.prd"],
          title: "환자",
          description: "의료 정보를 찾는 일반 사용자.",
          sourceRefs: [{ sourceId: source.id, sourceTitle: source.title, evidenceExcerpt: "환자는 지역, 진료과, 질환명으로 명의를 검색한다" }],
          confidence: 0.9,
          status: "confirmed",
        },
        {
          id: "REQ-003",
          category: "missing_input_or_open_question",
          targetDeliverables: ["deliverable.prd"],
          title: "랭킹 기준",
          description: "명의 랭킹 산정 기준은 추가 확인이 필요하다.",
          sourceRefs: [{ sourceId: source.id, sourceTitle: source.title, evidenceExcerpt: "랭킹 근거" }],
          confidence: 0.5,
          status: "unclear",
        },
      ],
      generatedAt: "2026-06-25T00:00:00.000Z",
      sourceCount: 1,
      chunkCount: 1,
    };
    const plan = {
      ...buildFallbackPrd({
        title: "AIGA",
        sources: [source],
        productBuilderBlueprintId: "online-service-standard",
        now: "2026-06-25T00:00:00.000Z",
      }),
      overview: "환자가 신뢰할 수 있는 의료 전문가를 빠르게 찾지 못하는 문제를 해결한다.",
      goals: ["환자가 조건에 맞는 명의를 검색하고 선택 근거를 확인할 수 있다."],
      scope: { inScope: ["명의 검색과 랭킹 근거 표시"], outOfScope: ["진료 예약 결제"] },
      functionalRequirements: [{
        code: "FR-001",
        title: "명의 검색",
        description: "환자는 지역, 진료과, 질환명을 입력해 명의를 검색한다. 검색 결과는 필터 상태와 랭킹 근거를 함께 보여준다. 랭킹 기준이 불명확하면 open question으로 남기고 임의 확정하지 않는다. 이 요구사항은 검색 입력, 필터 조합, 결과 근거 노출을 기준으로 검증한다.",
        priority: "must" as const,
        sourceInventoryItemIds: ["REQ-001"],
      }],
      risks: [{ code: "RISK-001", description: "랭킹 기준이 불명확하면 신뢰도가 낮아질 수 있다.", mitigation: "랭킹 기준을 브리프 검토에서 확정한다." }],
      assumptions: ["공개 자료만으로 랭킹 기준을 확정하지 않는다."],
    };

    const docs = renderPrdDocuments(plan, inventory as any, [source as any]);
    const prd = docs["etl/projects/project-scope/transform/blueprint/development-requirements-brief.md"];
    const rendered = Object.values(docs).join("\n\n---\n\n");
    const placeholderToken = ["T", "BD"].join("");
    const lightweightReleaseToken = ["sm", "oke"].join("");
    expect(prd).toContain("출처 기반 근거(Source-backed Evidence)");
    expect(prd).toContain("지역, 진료과, 질환명으로 명의를 검색한다");
    expect(prd).toContain("FLOW-001");
    expect(prd).toContain("환자는 지역, 진료과, 질환명을 입력해 명의를 검색한다");
    expect(prd).toContain("랭킹 기준");
    expect(prd).not.toContain("작성 원칙(Writing Rules)");
    expect(prd).not.toContain("실행 체크리스트(Execution Checklist)");
    expect(rendered).not.toContain(placeholderToken);
    expect(rendered.toLowerCase()).not.toContain(lightweightReleaseToken);
  });

  it("starts Product Builder required upstream slots from the Development Requirements Brief", () => {
    expect(PRODUCT_BUILDER_REQUIRED_UPSTREAM_SLOT_KEYS[0]).toBe(BLUEPRINT_PRD_SLOT_KEY);
    expect(PRODUCT_BUILDER_REQUIRED_UPSTREAM_SLOT_KEYS).not.toContain("deliverable.requirement_inventory");
    expect(PRODUCT_BUILDER_REQUIRED_UPSTREAM_SLOT_KEYS).toContain(BLUEPRINT_PRD_SLOT_KEY);
  });

  it("builds internal coverage before the Development Requirements Brief and carries late source items", async () => {
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

      await harness.performAction<any>(BLUEPRINT_ACTION.runPrd, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        title: "긴 요구사항 프로젝트",
      });
      await submitBlueprintPrdForTest(harness, PROJECT_ID, "긴 요구사항 프로젝트", {
        requirementInventory: {
          items: [{
            id: "REQ-001",
            category: "functional_requirement",
            targetDeliverables: ["deliverable.prd", "deliverable.feature_files", "deliverable.api_definition"],
            title: "쿠폰 발급 정책",
            description: "관리자는 쿠폰 발급 정책을 설정한다.",
            sourceRefs: [{
              sourceId: "long-requirements",
              sourceTitle: "긴 요구사항 문서",
              evidenceExcerpt: "관리자는 쿠폰 발급 정책을 설정한다.",
            }],
            confidence: 0.95,
            status: "confirmed",
          }],
        },
        prd: {
          functionalRequirements: [{
            title: "쿠폰 발급 정책",
            description: "관리자는 쿠폰 발급 정책을 설정한다.",
            priority: "must",
            sourceInventoryItemIds: ["REQ-001"],
          }],
          scope: { inScope: ["쿠폰 발급 정책"], outOfScope: ["등록 자료에 없는 구현 작업"] },
        },
      });
      const done = await waitFor(
        () => harness.getData<any>(BLUEPRINT_DATA.overview, { companyId: COMPANY_ID, projectId: PROJECT_ID }),
        (overview) => Boolean(overview.state.prd) && !overview.state.job,
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
      expect(done.state.prd.functionalRequirements.some((requirement: any) =>
        `${requirement.title} ${requirement.description}`.includes("쿠폰 발급"),
      )).toBe(true);

      const docs = await harness.performAction<any>(BLUEPRINT_ACTION.writePrdDocs, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });
      expect(docs.slots.map((slot: any) => slot.slotKey)).not.toContain("deliverable.requirement_inventory");
      const prdSlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.prd", COMPANY_ID);
      expect(prdSlot?.document?.body).toContain("쿠폰 발급");

      const wikiPages = buildWikiPages(
        done.state.prd,
        null,
        done.state.prd.projectTitle,
        done.state.requirementInventory,
        done.state.sources,
        PROJECT_ID,
      );
      expect(wikiPages.some((page) => page.path.endsWith("/source-materials.md"))).toBe(false);
      expect(wikiPages.some((page) => page.path.endsWith("/development-requirements-brief.md"))).toBe(true);
      expect(wikiPages.some((page) =>
        page.path.startsWith(`wiki/etl/projects/${PROJECT_ID}/transform/blueprint/`),
      )).toBe(true);
    } finally {
      if (previousDisableLlm === undefined) delete process.env.COS_BLUEPRINT_DISABLE_LLM;
      else process.env.COS_BLUEPRINT_DISABLE_LLM = previousDisableLlm;
    }
  });

  it("excludes Figma sources from Development Requirements Brief generation inputs", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    seedCompanyProjects(harness);
    await builderPlugin.definition.setup(harness.ctx);

    await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      title: "문서 요구사항",
      type: "external-plan",
      body: "결제 정책은 문서 자료에서 확정한다.\nFigma 링크: https://www.figma.com/design/ABC123/AIGA",
      fileName: "requirements.md",
      format: "md",
    });
    await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      title: "Figma 화면",
      type: "reference",
      body: "Figma 전용 화면 요구사항은 개발 요구사항 브리프에서 보지 않는다.",
      format: "figma",
    });

    const beforeRun = await harness.getData<any>(BLUEPRINT_DATA.overview, { companyId: COMPANY_ID, projectId: PROJECT_ID });
    const prdSources = testPrdSources(beforeRun.state.sources);
    const prompt = buildBlueprintPmAgentPrdPrompt({
      projectId: PROJECT_ID,
      title: "Figma 제외 브리프",
      sources: prdSources,
      productBuilderBlueprintId: beforeRun.state.productBuilderBlueprintId,
    });
    expect(beforeRun.state.sources).toHaveLength(2);
    expect(beforeRun.state.sources.some((source: any) => source.format === "figma")).toBe(true);
    expect(prompt).toContain("결제 정책은 문서 자료");
    expect(prompt).not.toContain("Figma 전용 화면 요구사항");
    expect(prompt).not.toContain("figma.com/design/ABC123");
    expect(prompt).toContain("이전 run log");
    expect(prompt).toContain("DB binary dump");
    expect(prompt).toContain("standardPlan");
    expect(prompt).toContain("legacy aggregate");
    expect(prompt).toContain("heartbeat/inbox checkout");
    expect(prompt).toContain("PAPERCLIP_TASK_ID");

    await harness.performAction<any>(BLUEPRINT_ACTION.runPrd, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      title: "Figma 제외 브리프",
    });
    const running = await waitFor(
      () => harness.getData<any>(BLUEPRINT_DATA.overview, { companyId: COMPANY_ID, projectId: PROJECT_ID }),
      (overview) => Boolean(overview.state.job?.agentRunId),
    );
    expect(running.state.job).toMatchObject({ sourceCount: 2, prdSourceCount: 1 });

    await submitBlueprintPrdForTest(harness, PROJECT_ID, "Figma 제외 브리프", {
      prd: {
        projectTitle: "문서 기반 개발 요구사항 브리프",
        overview: "문서 자료만 기준으로 작성한 개발 요구사항 브리프",
        goals: ["결제 정책 확정"],
        scope: { inScope: ["결제 정책"], outOfScope: ["등록 자료에 없는 화면 해석"] },
        functionalRequirements: [{ title: "결제 정책", description: "문서 자료 기준", priority: "must", sourceInventoryItemIds: ["REQ-001"] }],
        nonFunctionalRequirements: [],
        schemas: [],
        apis: [],
        layouts: [],
        risks: [],
        assumptions: [],
      },
    });
    const done = await harness.getData<any>(BLUEPRINT_DATA.overview, { companyId: COMPANY_ID, projectId: PROJECT_ID });
    expect(JSON.stringify(done.state.requirementInventory)).not.toContain("Figma 전용 화면 요구사항");
    expect(JSON.stringify(done.state.prd)).not.toContain("Figma 전용 화면 요구사항");
  });

  it("keeps Development Requirements Brief direct prompts bounded for large coverage indexes", () => {
    const body = Array.from({ length: 2_100 }, (_, index) => (
      `후반부 요구사항 ${String(index + 1).padStart(4, "0")}: 사용자 등급, 권한, 화면 상태, API 검증 기준을 구현 단위로 보존한다.`
    )).join("\n");
    const source = {
      id: "large-source",
      title: "대형 정책 자료",
      type: "external-plan",
      body,
      createdAt: "2026-06-26T00:00:00.000Z",
      format: "md",
    } as const;
    const inventory = buildFallbackRequirementInventory({ sources: [source], chunkCount: 1 });
    const prompt = buildBlueprintPmAgentPrdPrompt({
      projectId: PROJECT_ID,
      title: "대형 자료 개발 요구사항 브리프",
      sources: [source],
      productBuilderBlueprintId: "online-service-standard",
      requirementInventory: inventory,
    });

    expect(inventory.items).toHaveLength(2_100);
    expect(prompt.length).toBeLessThan(500_000);
    expect(prompt).toContain("후반부 요구사항 1050");
    expect(prompt).toContain("후반부 요구사항 2100");
    expect(prompt).toContain("## Source Material");
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
      expect(result.file).toMatch(new RegExp(`^etl/projects/${PROJECT_ID}/extract/sources/requirements-.+\\.md$`));
      expect(result.file).not.toContain("docs/cos-blueprint");
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
      expect((tenDocSlot?.slot.metadata?.documentRefs as string[]).every((ref) =>
        ref.startsWith(`etl/projects/${PROJECT_ID}/extract/sources/`),
      )).toBe(true);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("reanalyzes registered Blueprint source documents through the original intake workflow", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    seedCompanyProjects(harness);
    await builderPlugin.definition.setup(harness.ctx);

    const registered = await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      title: "재분석 요구사항",
      type: "external-plan",
      body: "파일 등록 workflow로 추출된 로그인과 결제 요구사항",
      fileName: "reanalyze-me.md",
      format: "md",
    });

    const seededOverview = await harness.getData<any>(BLUEPRINT_DATA.overview, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
    });
    await harness.ctx.state.set({
      scopeKind: "project",
      scopeId: PROJECT_ID,
      namespace: `company:${COMPANY_ID}`,
      stateKey: BLUEPRINT_STATE_KEY,
    }, {
      ...seededOverview.state,
      requirementInventory: {
        deliverables: [],
        items: [],
        generatedAt: "2026-06-25T00:00:00.000Z",
        sourceCount: 1,
        chunkCount: 1,
        usedFallback: false,
      },
      prd: { projectTitle: "재분석 테스트", overview: "stale" },
      screenPlan: { projectTitle: "재분석 테스트", screens: [], reviews: {}, generatedAt: "2026-06-25T00:00:00.000Z" },
    });

    const result = await harness.performAction<any>(BLUEPRINT_ACTION.reanalyzeSourceDocument, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      sourceId: registered.source.id,
      documentRef: registered.file,
      sourceFingerprint: registered.source.fingerprint,
      slotKey: "source.customer_originals",
    });

    expect(result.ok).toBe(true);
    expect(result.reanalyzed).toBe(true);
    expect(result.source.id).not.toBe(registered.source.id);
    expect(result.source.intakeWorkflow).toBe("file_upload");
    expect(result.source.body).toBe("파일 등록 workflow로 추출된 로그인과 결제 요구사항");

    const slot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "source.customer_originals", COMPANY_ID);
    expect(slot?.document?.body).toContain("파일 등록 workflow로 추출된 로그인과 결제 요구사항");
    expect(slot?.document?.body).not.toContain(registered.file);
    expect(slot?.slot.metadata?.documentRefs).toEqual([result.file]);
    expect(slot?.slot.metadata?.sources).toEqual([
      expect.objectContaining({
        sourceId: result.source.id,
        sourceIntakeWorkflow: "file_upload",
        documentRef: result.file,
      }),
    ]);

    const overview = await harness.getData<any>(BLUEPRINT_DATA.overview, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
    });
    expect(overview.state.sources.map((source: any) => source.id)).toEqual([result.source.id]);
    expect(overview.state.requirementInventory).toBeNull();
    expect(overview.state.prd).toBeNull();
    expect(overview.state.screenPlan).toBeNull();
  });

  it("replaces same uploaded Blueprint source instead of accumulating stale source documents", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    seedCompanyProjects(harness);
    await builderPlugin.definition.setup(harness.ctx);

    const first = await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      title: "고객 요구사항",
      type: "external-plan",
      body: "이전 로그인 요구사항은 폐기되어야 한다.",
      fileName: "same-requirements.md",
      format: "md",
    });
    const second = await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      title: "고객 요구사항 수정본",
      type: "external-plan",
      body: "최신 결제 요구사항만 읽어야 한다.",
      fileName: "same-requirements.md",
      format: "md",
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(second.duplicate).not.toBe(true);

    const afterReplaceSlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "source.customer_originals", COMPANY_ID);
    const afterReplaceBody = afterReplaceSlot?.document?.body ?? "";
    expect(afterReplaceBody).toContain("최신 결제 요구사항만 읽어야 한다.");
    expect(afterReplaceBody).not.toContain("이전 로그인 요구사항은 폐기되어야 한다.");
    expect(afterReplaceBody.match(/# 기획 자료\(Source Material\)/g)).toHaveLength(1);
    expect(afterReplaceSlot?.slot.metadata?.documentRefs).toEqual([second.file]);
    expect(afterReplaceSlot?.slot.metadata?.sources).toEqual([
      expect.objectContaining({
        sourceId: second.source.id,
        fileName: "same-requirements.md",
        documentRef: second.file,
      }),
    ]);

    const overviewAfterReplace = await harness.getData<any>(BLUEPRINT_DATA.overview, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
    });
    expect(overviewAfterReplace.state.sources.map((source: any) => source.id)).toEqual([second.source.id]);

    const firstReanalysis = await harness.performAction<any>(BLUEPRINT_ACTION.reanalyzeSourceDocument, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      sourceId: second.source.id,
      documentRef: second.file,
      sourceFingerprint: second.source.fingerprint,
      slotKey: "source.customer_originals",
    });
    const secondReanalysis = await harness.performAction<any>(BLUEPRINT_ACTION.reanalyzeSourceDocument, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      sourceId: firstReanalysis.source.id,
      documentRef: firstReanalysis.file,
      sourceFingerprint: firstReanalysis.source.fingerprint,
      slotKey: "source.customer_originals",
    });

    const afterReanalyzeSlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "source.customer_originals", COMPANY_ID);
    const afterReanalyzeBody = afterReanalyzeSlot?.document?.body ?? "";
    expect(afterReanalyzeBody).toContain("최신 결제 요구사항만 읽어야 한다.");
    expect(afterReanalyzeBody).not.toContain("이전 로그인 요구사항은 폐기되어야 한다.");
    expect(afterReanalyzeBody.match(/# 기획 자료\(Source Material\)/g)).toHaveLength(1);
    expect(afterReanalyzeSlot?.slot.metadata?.documentRefs).toEqual([secondReanalysis.file]);
    expect(afterReanalyzeSlot?.slot.metadata?.sources).toEqual([
      expect.objectContaining({
        sourceId: secondReanalysis.source.id,
        fileName: "same-requirements.md",
        documentRef: secondReanalysis.file,
      }),
    ]);
  });

  it("replaces same URL Blueprint source instead of accumulating stale fetched documents", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    seedCompanyProjects(harness);
    await builderPlugin.definition.setup(harness.ctx);

    const sourceUrl = "https://example.test/aiga-prd";
    const bodies = [
      "이전 URL 요구사항은 폐기되어야 한다.",
      "최신 URL 요구사항만 읽어야 한다.",
    ];
    let fetchCount = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      const body = bodies[Math.min(fetchCount, bodies.length - 1)];
      fetchCount += 1;
      return new Response(`<html><body><main>${body}</main></body></html>`, {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    }) as typeof fetch;

    try {
      const first = await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        title: "AIGA URL",
        type: "external-plan",
        url: sourceUrl,
        format: "url",
        fetchUrl: true,
      });
      const second = await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        title: "AIGA URL 수정본",
        type: "external-plan",
        url: sourceUrl,
        format: "url",
        fetchUrl: true,
      });

      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      expect(second.duplicate).not.toBe(true);

      const slot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "source.customer_originals", COMPANY_ID);
      const slotBody = slot?.document?.body ?? "";
      expect(slotBody).toContain("최신 URL 요구사항만 읽어야 한다.");
      expect(slotBody).not.toContain("이전 URL 요구사항은 폐기되어야 한다.");
      expect(slotBody.match(/# 기획 자료\(Source Material\)/g)).toHaveLength(1);
      expect(slot?.slot.metadata?.documentRefs).toEqual([second.file]);
      expect(slot?.slot.metadata?.sources).toEqual([
        expect.objectContaining({
          sourceId: second.source.id,
          sourceUrl: sourceUrl,
          documentRef: second.file,
        }),
      ]);

      const overview = await harness.getData<any>(BLUEPRINT_DATA.overview, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });
      expect(overview.state.sources.map((source: any) => source.id)).toEqual([second.source.id]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("does not delete another Blueprint source just because the source title matches", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    seedCompanyProjects(harness);
    await builderPlugin.definition.setup(harness.ctx);

    const first = await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      title: "고객 요구사항",
      type: "external-plan",
      body: "삭제할 로그인 요구사항",
      fileName: "same-title-a.md",
      format: "md",
    });
    const second = await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      title: "고객 요구사항",
      type: "external-plan",
      body: "남겨야 할 결제 요구사항",
      fileName: "same-title-b.md",
      format: "md",
    });

    const deleted = await harness.performAction<any>(BLUEPRINT_ACTION.deleteSourceDocument, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      sourceId: first.source.id,
      documentRef: first.file,
      sourceFingerprint: first.source.fingerprint,
      slotKey: "source.customer_originals",
    });

    expect(deleted.ok).toBe(true);
    const slot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "source.customer_originals", COMPANY_ID);
    const slotBody = slot?.document?.body ?? "";
    expect(slotBody).not.toContain("삭제할 로그인 요구사항");
    expect(slotBody).toContain("남겨야 할 결제 요구사항");
    expect(slotBody.match(/# 기획 자료\(Source Material\)/g)).toHaveLength(1);
    expect(slot?.slot.metadata?.documentRefs).toEqual([second.file]);
    expect(slot?.slot.metadata?.sources).toEqual([
      expect.objectContaining({
        sourceId: second.source.id,
        documentRef: second.file,
      }),
    ]);
  });

  it("replaces same Figma Blueprint source when using the dedicated Figma action", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    seedCompanyProjects(harness);
    await builderPlugin.definition.setup(harness.ctx);

    const figmaUrl = "https://www.figma.com/design/ABC123/AIGA?node-id=1-2";
    const xmlFor = (label: string) => [
      `<canvas name="AIGA ${label}">`,
      `<section name="mobile">`,
      `<frame name="${label} Home" width="390" height="844" x="0" y="0">`,
      `<text name="Headline" characters="${label} 화면 요구사항" width="200" height="32" x="16" y="24" />`,
      `</frame>`,
      `</section>`,
      `</canvas>`,
    ].join("");
    const xmlBodies = [xmlFor("OLD"), xmlFor("NEW")];
    let metadataFetchCount = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { id?: number; method?: string };
      if (body.method === "initialize") {
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: body.id, result: {} }), {
          status: 200,
          headers: { "content-type": "application/json", "mcp-session-id": "test-session" },
        });
      }
      if (body.method === "notifications/initialized") {
        return new Response(JSON.stringify({ jsonrpc: "2.0", result: {} }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (body.method === "tools/call") {
        const text = xmlBodies[Math.min(metadataFetchCount, xmlBodies.length - 1)];
        metadataFetchCount += 1;
        return new Response(JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: { content: [{ type: "text", text }] },
        }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    try {
      const first = await harness.performAction<any>(BLUEPRINT_ACTION.registerFigmaSource, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        url: figmaUrl,
        token: "test-token",
      });
      const second = await harness.performAction<any>(BLUEPRINT_ACTION.registerFigmaSource, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        url: figmaUrl,
        token: "test-token",
      });

      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      const slot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "source.customer_originals", COMPANY_ID);
      const slotBody = slot?.document?.body ?? "";
      expect(slotBody).toContain("NEW 화면 요구사항");
      expect(slotBody).not.toContain("OLD 화면 요구사항");
      expect(slotBody.match(/# 기획 자료\(Source Material\)/g)).toHaveLength(1);
      expect(slot?.slot.metadata?.documentRefs).toEqual([second.file]);
      expect(slot?.slot.metadata?.sources).toEqual([
        expect.objectContaining({
          sourceFormat: "figma",
          sourceIntakeWorkflow: "figma",
          sourceUrl: figmaUrl,
          documentRef: second.file,
        }),
      ]);

      const overview = await harness.getData<any>(BLUEPRINT_DATA.overview, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });
      expect(overview.state.sources).toHaveLength(1);
      expect(overview.state.sources[0].url).toBe(figmaUrl);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("deletes registered Blueprint source documents from state and Project slots", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    seedCompanyProjects(harness);
    await builderPlugin.definition.setup(harness.ctx);

    const firstResult = await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      title: "삭제할 요구사항",
      type: "external-plan",
      body: "로그인 요구사항은 삭제 대상이다.",
      fileName: "delete-me.md",
      format: "md",
    });
    const secondResult = await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      title: "남길 요구사항",
      type: "external-plan",
      body: "결제 요구사항은 남아야 한다.",
      fileName: "keep-me.md",
      format: "md",
    });

    const seededOverview = await harness.getData<any>(BLUEPRINT_DATA.overview, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
    });
    await harness.ctx.state.set({
      scopeKind: "project",
      scopeId: PROJECT_ID,
      namespace: `company:${COMPANY_ID}`,
      stateKey: BLUEPRINT_STATE_KEY,
    }, {
      ...seededOverview.state,
      requirementInventory: {
        deliverables: [],
        items: [],
        generatedAt: "2026-06-25T00:00:00.000Z",
        sourceCount: 2,
        chunkCount: 1,
        usedFallback: false,
      },
      prd: { projectTitle: "삭제 테스트", overview: "stale" },
      screenPlan: { projectTitle: "삭제 테스트", screens: [], reviews: {}, generatedAt: "2026-06-25T00:00:00.000Z" },
    });

    const deleteFirst = await harness.performAction<any>(BLUEPRINT_ACTION.deleteSourceDocument, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      sourceId: firstResult.source.id,
      documentRef: firstResult.file,
      sourceFingerprint: firstResult.source.fingerprint,
      slotKey: "source.customer_originals",
    });

    expect(deleteFirst.ok).toBe(true);
    expect(deleteFirst.removed).toBe(true);
    expect(deleteFirst.removedBodyBlock).toBe(true);

    const updatedSlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "source.customer_originals", COMPANY_ID);
    expect(updatedSlot?.document?.body).not.toContain("로그인 요구사항은 삭제 대상이다.");
    expect(updatedSlot?.document?.body).toContain("결제 요구사항은 남아야 한다.");
    expect(updatedSlot?.slot.metadata?.documentRefs).toEqual([secondResult.file]);
    expect(updatedSlot?.slot.metadata?.sourceId).toBe(secondResult.source.id);
    expect(updatedSlot?.slot.metadata?.sources).toEqual([
      expect.objectContaining({
        sourceId: secondResult.source.id,
        documentRef: secondResult.file,
      }),
    ]);

    const overviewAfterFirstDelete = await harness.getData<any>(BLUEPRINT_DATA.overview, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
    });
    expect(overviewAfterFirstDelete.state.sources.map((source: any) => source.id)).toEqual([secondResult.source.id]);
    expect(overviewAfterFirstDelete.state.requirementInventory).toBeNull();
    expect(overviewAfterFirstDelete.state.prd).toBeNull();
    expect(overviewAfterFirstDelete.state.screenPlan).toBeNull();

    const deleteSecond = await harness.performAction<any>(BLUEPRINT_ACTION.deleteSourceDocument, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      sourceId: secondResult.source.id,
      documentRef: secondResult.file,
      sourceFingerprint: secondResult.source.fingerprint,
      slotKey: "source.customer_originals",
    });
    expect(deleteSecond.ok).toBe(true);

    const emptySlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "source.customer_originals", COMPANY_ID);
    expect((emptySlot?.document?.body ?? "").trim()).toBe("");
    expect(emptySlot?.slot.metadata?.documentRefs).toEqual([]);
    expect(emptySlot?.slot.metadata?.sources).toEqual([]);

    const overviewAfterSecondDelete = await harness.getData<any>(BLUEPRINT_DATA.overview, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
    });
    expect(overviewAfterSecondDelete.state.sources).toHaveLength(0);
    expect(overviewAfterSecondDelete.state.projectDocumentSlots.some((slot: any) => slot.slotKey === "source.customer_originals")).toBe(false);
  });

  it("registers a Notion shared page and accessible child pages as source material", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    seedCompanyProjects(harness);
    await builderPlugin.definition.setup(harness.ctx);

    const rootUrl = "https://app.notion.com/p/Aiga-36d426e29161818d8bc1e859f782d870?source=copy_link";
    const rootId = "36d426e2-9161-818d-8bc1-e859f782d870";
    const childId = "36d426e2-9161-817e-9609-c9c0e5a58a51";
    const grandchildId = "36d426e2-9161-81f8-b267-d613e40609b5";
    const greatGrandchildId = "36d426e2-9161-810a-b4ba-c8b7dbc6dc93";
    const apiUrl = "https://www.notion.so/api/v3/loadPageChunk";
    const signedFileUrlApi = "https://www.notion.so/api/v3/getSignedFileUrls";
    const signedDocxUrl = "https://file.notion.test/aiga-admin.docx";
    const docxBytes = await makeDocxBytes("어드민 신고 처리 화면 상세 정의와 사용자 관리 화면 상세 정의");
    const notionEntry = (value: Record<string, unknown>) => ({ value: { value } });
    const rootRecordMap = {
      block: {
        [rootId]: notionEntry({
          id: rootId,
          type: "page",
          properties: { title: [["Aiga 정책·화면정의서 (외주)"]] },
          content: ["root-intro", "root-figma", childId],
        }),
        "root-intro": notionEntry({
          id: "root-intro",
          type: "text",
          properties: { title: [["명의 검색과 AI 상담 요구사항."]] },
        }),
        "root-figma": notionEntry({
          id: "root-figma",
          type: "text",
          properties: {
            title: [
              ["Figma 원형: "],
              ["AIGA 디자인", [["a", "https://www.figma.com/design/ABC123/AIGA"]]],
            ],
          },
        }),
        [childId]: notionEntry({
          id: childId,
          type: "page",
          properties: { title: [["예약 플로우"]] },
        }),
        [grandchildId]: notionEntry({
          id: grandchildId,
          type: "page",
          properties: { title: [["예약 예외 케이스"]] },
        }),
      },
    };
    const childRecordMap = {
      block: {
        [childId]: notionEntry({
          id: childId,
          type: "page",
          properties: { title: [["예약 플로우"]] },
          content: ["child-summary", "child-file", "child-table", rootId, grandchildId],
        }),
        [rootId]: notionEntry({
          id: rootId,
          type: "page",
          properties: { title: [["Aiga 정책·화면정의서 (외주)"]] },
        }),
        "child-summary": notionEntry({
          id: "child-summary",
          type: "text",
          properties: { title: [["예약 화면, 결제, 알림 정책을 정의한다."]] },
        }),
        "child-file": notionEntry({
          id: "child-file",
          type: "file",
          properties: {
            title: [["AIGA_Admin_화면정의서_v1_2.docx"]],
            source: [["attachment:file-1:AIGA_Admin_화면정의서_v1_2.docx"]],
            size: [["48.8 KiB"]],
          },
          file_ids: ["file-1"],
        }),
        "child-table": notionEntry({
          id: "child-table",
          type: "table",
          content: ["child-row-1", "child-row-2"],
          format: {
            table_block_column_order: ["screen", "policy"],
            table_block_column_header: true,
          },
        }),
        "child-row-1": notionEntry({
          id: "child-row-1",
          type: "table_row",
          properties: {
            screen: [["화면"]],
            policy: [["정책"]],
          },
        }),
        "child-row-2": notionEntry({
          id: "child-row-2",
          type: "table_row",
          properties: {
            screen: [["예약 확인"]],
            policy: [["결제 성공 후 알림 발송"]],
          },
        }),
        [grandchildId]: notionEntry({
          id: grandchildId,
          type: "page",
          properties: { title: [["예약 예외 케이스"]] },
        }),
      },
    };
    const grandchildRecordMap = {
      block: {
        [grandchildId]: notionEntry({
          id: grandchildId,
          type: "page",
          properties: { title: [["예약 예외 케이스"]] },
          content: ["grandchild-summary", greatGrandchildId],
        }),
        "grandchild-summary": notionEntry({
          id: "grandchild-summary",
          type: "text",
          properties: { title: [["노쇼, 환불, 예약 변경 예외 흐름을 별도 정의한다."]] },
        }),
        [greatGrandchildId]: notionEntry({
          id: greatGrandchildId,
          type: "page",
          properties: { title: [["환불 상세 정책"]] },
        }),
      },
    };
    const greatGrandchildRecordMap = {
      block: {
        [greatGrandchildId]: notionEntry({
          id: greatGrandchildId,
          type: "page",
          properties: { title: [["환불 상세 정책"]] },
          content: ["great-grandchild-summary"],
        }),
        "great-grandchild-summary": notionEntry({
          id: "great-grandchild-summary",
          type: "text",
          properties: { title: [["결제 취소 수수료와 환불 승인 조건을 정의한다."]] },
        }),
      },
    };
    const originalFetch = globalThis.fetch;
    const fetchedPageIds: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === apiUrl) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { pageId?: string };
        fetchedPageIds.push(body.pageId ?? "");
        if (body.pageId === rootId) {
          return new Response(JSON.stringify({ cursor: { stack: [] }, recordMap: rootRecordMap }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        if (body.pageId === childId) {
          return new Response(JSON.stringify({ cursor: { stack: [] }, recordMap: childRecordMap }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        if (body.pageId === grandchildId) {
          return new Response(JSON.stringify({ cursor: { stack: [] }, recordMap: grandchildRecordMap }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        if (body.pageId === greatGrandchildId) {
          return new Response(JSON.stringify({ cursor: { stack: [] }, recordMap: greatGrandchildRecordMap }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
      }
      if (url === signedFileUrlApi) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { urls?: Array<{ url?: string; permissionRecord?: { id?: string } }> };
        expect(body.urls?.[0]?.url).toBe("attachment:file-1:AIGA_Admin_화면정의서_v1_2.docx");
        expect(body.urls?.[0]?.permissionRecord?.id).toBe("child-file");
        return new Response(JSON.stringify({ signedUrls: [signedDocxUrl] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url === signedDocxUrl) {
        return new Response(docxBytes, {
          status: 200,
          headers: { "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
        });
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    try {
      const result = await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        title: "AIGA Notion",
        type: "external-plan",
        url: rootUrl,
        format: "notion",
        intakeWorkflow: "notion_shared_page",
        fetchUrl: true,
      });

      expect(result.ok).toBe(true);
      expect(result.source.title).toBe("Aiga 정책·화면정의서 (외주)");
      expect(result.source.format).toBe("notion");
      expect(result.source.intakeWorkflow).toBe("notion_shared_page");
      expect(result.source.fetchStatus).toBe("fetched");
      expect(fetchedPageIds).toEqual([rootId, childId, grandchildId, greatGrandchildId]);

      const slot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "source.customer_originals", COMPANY_ID);
      const slotBody = slot?.document?.body ?? "";
      expect(slotBody).not.toContain("항목(Item)");
      expect(slotBody).not.toContain("URL 가져오기(URL Fetch)");
      expect(slotBody).not.toContain("노션 공유페이지(Notion Shared Page)");
      expect(slotBody).toContain("Aiga 정책·화면정의서 (외주)");
      expect(slotBody).not.toContain("Crawl Depth Limit: 5");
      expect(slotBody).not.toContain("Notion API");
      expect(slotBody).not.toContain("페이지 본문(Page Bodies)");
      expect(slotBody).not.toContain("페이지 목록(Page Index)");
      const childLinkIndex = slotBody.indexOf("- 하위 페이지: 예약 플로우");
      const childHeadingIndex = slotBody.indexOf("# 예약 플로우");
      expect(childHeadingIndex).toBeGreaterThan(childLinkIndex);
      expect(childHeadingIndex - childLinkIndex).toBeLessThan(250);
      expect(slotBody).toContain("명의 검색과 AI 상담 요구사항");
      expect(slotBody).toContain("예약 플로우");
      expect(slotBody).toContain("예약 화면, 결제, 알림 정책");
      expect(slotBody).toContain("#### 첨부 파일: AIGA_Admin_화면정의서_v1_2.docx");
      expect(slotBody).toContain("# AIGA Admin");
      expect(slotBody).toContain("## 1\\. 문서 개요");
      expect(slotBody).toContain("어드민 신고 처리 화면 상세 정의와 사용자 관리 화면 상세 정의");
      expect(slotBody).toContain("신고 처리");
      expect(slotBody).toContain("승인/반려 상태 관리");
      expect(slotBody).toContain("예약 예외 케이스");
      expect(slotBody).toContain("노쇼, 환불, 예약 변경 예외 흐름");
      expect(slotBody).toContain("환불 상세 정책");
      expect(slotBody).toContain("결제 취소 수수료와 환불 승인 조건");
      expect(slotBody).toContain("| 화면 | 정책 |");
      expect(slotBody).toContain("| 예약 확인 | 결제 성공 후 알림 발송 |");
      expect(slotBody).toContain("https://www.figma.com/design/ABC123/AIGA");
      expect(slotBody).not.toContain("전체 Figma 링크(Figma Link Index)");
      expect(slot?.slot.metadata).toMatchObject({
        plugin: "paperclip-plugin-builder",
        sourceFormat: "notion",
        sourceIntakeWorkflow: "notion_shared_page",
        sourceFetchStatus: "fetched",
        sourceUrl: rootUrl,
      });

      const duplicateFromGenericUrl = await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        title: "AIGA generic URL",
        type: "external-plan",
        url: rootUrl,
        format: "url",
        fetchUrl: true,
      });
      expect(duplicateFromGenericUrl.ok).toBe(true);
      expect(duplicateFromGenericUrl.duplicate).toBe(true);
      expect(duplicateFromGenericUrl.source.format).toBe("notion");
      expect(duplicateFromGenericUrl.source.intakeWorkflow).toBe("notion_shared_page");
      expect(duplicateFromGenericUrl.file).toBe(result.file);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("hydrates collapsed Notion block children into the same source material", async () => {
    const rootUrl = "https://modoosasoo.notion.site/37cbf1a2759980aeb0e7e31438179e0e";
    const rootId = "37cbf1a2-7599-80ae-b0e7-e31438179e0e";
    const toggleId = "37dbf1a2-7599-800f-8672-e9d38970376e";
    const hiddenTextId = "381bf1a2-7599-808c-be72-de7379d0f25c";
    const apiUrl = "https://www.notion.so/api/v3/loadPageChunk";
    const notionEntry = (value: Record<string, unknown>) => ({ value: { value } });
    const rootRecordMap = {
      block: {
        [rootId]: notionEntry({
          id: rootId,
          type: "page",
          properties: { title: [["모두의 사수 홈페이지 기획서"]] },
          content: [toggleId],
        }),
        [toggleId]: notionEntry({
          id: toggleId,
          type: "toggle",
          properties: { title: [["첫화면"]] },
          content: [hiddenTextId],
        }),
      },
    };
    const toggleRecordMap = {
      block: {
        [toggleId]: notionEntry({
          id: toggleId,
          type: "toggle",
          properties: { title: [["첫화면"]] },
          content: [hiddenTextId],
        }),
        [hiddenTextId]: notionEntry({
          id: hiddenTextId,
          type: "bulleted_list",
          properties: { title: [["접힌 토글 안쪽 핵심 문구"]] },
        }),
      },
    };
    const originalFetch = globalThis.fetch;
    const fetchedPageIds: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === apiUrl) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { pageId?: string };
        fetchedPageIds.push(body.pageId ?? "");
        if (body.pageId === rootId) {
          return new Response(JSON.stringify({ cursor: { stack: [] }, recordMap: rootRecordMap }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        if (body.pageId === toggleId) {
          return new Response(JSON.stringify({ cursor: { stack: [] }, recordMap: toggleRecordMap }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    try {
      const result = await fetchNotionSharedPageSource(rootUrl);
      expect(result.fetchStatus).toBe("fetched");
      expect(result.metadata?.pageCount).toBe(1);
      expect(fetchedPageIds).toEqual([rootId, toggleId]);
      expect(result.body).toContain("모두의 사수 홈페이지 기획서");
      expect(result.body).toContain("첫화면");
      expect(result.body).toContain("접힌 토글 안쪽 핵심 문구");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("preserves Notion image attachments without downloading image bytes", async () => {
    const rootUrl = "https://modoosasoo.notion.site/37cbf1a2759980aeb0e7e31438179e0e";
    const rootId = "37cbf1a2-7599-80ae-b0e7-e31438179e0e";
    const imageBlockId = "381bf1a2-7599-808c-be72-de7379d0f25c";
    const apiUrl = "https://www.notion.so/api/v3/loadPageChunk";
    const signedFileUrlApi = "https://www.notion.so/api/v3/getSignedFileUrls";
    const signedImageUrl = "https://file.notion.test/screenshot.png";
    const notionEntry = (value: Record<string, unknown>) => ({ value: { value } });
    const rootRecordMap = {
      block: {
        [rootId]: notionEntry({
          id: rootId,
          type: "page",
          properties: { title: [["모두의 사수 홈페이지 기획서"]] },
          content: [imageBlockId],
        }),
        [imageBlockId]: notionEntry({
          id: imageBlockId,
          type: "image",
          properties: {
            title: [["스크린샷.png"]],
            source: [["attachment:file-1:스크린샷.png"]],
          },
        }),
      },
    };
    const originalFetch = globalThis.fetch;
    let signedUrlRequested = false;
    let imageDownloaded = false;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === apiUrl) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { pageId?: string };
        expect(body.pageId).toBe(rootId);
        return new Response(JSON.stringify({ cursor: { stack: [] }, recordMap: rootRecordMap }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url === signedFileUrlApi) {
        signedUrlRequested = true;
        const body = JSON.parse(String(init?.body ?? "{}")) as { urls?: Array<{ url?: string; permissionRecord?: { id?: string } }> };
        expect(body.urls?.[0]?.url).toBe("attachment:file-1:스크린샷.png");
        expect(body.urls?.[0]?.permissionRecord?.id).toBe(imageBlockId);
        return new Response(JSON.stringify({ signedUrls: [signedImageUrl] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url === signedImageUrl) {
        imageDownloaded = true;
        return new Response("unexpected image download", { status: 500 });
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    try {
      const result = await fetchNotionSharedPageSource(rootUrl);
      expect(result.fetchStatus).toBe("fetched");
      expect(signedUrlRequested).toBe(true);
      expect(imageDownloaded).toBe(false);
      expect(result.body).toContain("![스크린샷.png](<https://file.notion.test/screenshot.png>)");
      expect(result.body).not.toContain("Unsupported Notion attachment format: png");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("keeps a failed Notion shared page fetch inspectable in registered source material", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    seedCompanyProjects(harness);
    await builderPlugin.definition.setup(harness.ctx);

    const rootUrl = "https://aiga.notion.site/Private-921df4f05d35129789b7a496f812e361";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response("forbidden", {
      status: 403,
      headers: { "content-type": "text/html" },
    })) as typeof fetch;

    try {
      const result = await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        title: "Private Notion",
        type: "external-plan",
        url: rootUrl,
        format: "notion",
        intakeWorkflow: "notion_shared_page",
        fetchUrl: true,
      });

      expect(result.ok).toBe(true);
      expect(result.source.format).toBe("notion");
      expect(result.source.fetchStatus).toBe("failed");
      expect(result.source.fetchError).toContain("HTTP 403");

      const slot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "source.customer_originals", COMPANY_ID);
      expect(slot?.document?.body).not.toContain("노션 공유페이지(Notion Shared Page)");
      expect(slot?.document?.body).not.toContain("항목(Item)");
      expect(slot?.document?.body).toContain("Fetch Status: failed");
      expect(slot?.document?.body).toContain("HTTP 403");
      expect(slot?.slot.metadata).toMatchObject({
        sourceFormat: "notion",
        sourceIntakeWorkflow: "notion_shared_page",
        sourceFetchStatus: "failed",
      });
    } finally {
      globalThis.fetch = originalFetch;
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

      await harness.performAction<any>(BLUEPRINT_ACTION.runPrd, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        title: "A 프로젝트",
      });
      await submitBlueprintPrdForTest(harness, PROJECT_ID, "A 프로젝트");
      await waitFor(
        () => harness.getData<any>(BLUEPRINT_DATA.overview, { companyId: COMPANY_ID, projectId: PROJECT_ID }),
        (overview) => Boolean(overview.state.prd) && !overview.state.job,
      );
      const secondAfterFirstPlan = await harness.getData<any>(BLUEPRINT_DATA.overview, {
        companyId: COMPANY_ID,
        projectId: SECOND_PROJECT_ID,
      });
      expect(secondAfterFirstPlan.state.prd).toBeNull();
      expect(secondAfterFirstPlan.state.screenPlan).toBeNull();
      expect(secondAfterFirstPlan.state.sources).toHaveLength(1);
      expect(secondAfterFirstPlan.state.sources[0].body).toContain("커뮤니티와 알림");
      await harness.performAction<any>(BLUEPRINT_ACTION.confirmPrd, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });

      const prdDocs = await harness.performAction<any>(BLUEPRINT_ACTION.writePrdDocs, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });
      expect(prdDocs.ok).toBe(true);
      expect(prdDocs.slots.map((slot: any) => slot.slotKey)).toEqual(expect.arrayContaining([
        "support.pm_execution_procedure",
        "support.screen_definition_writing_rules",
        "deliverable.prd",
        "deliverable.feature_files",
        "deliverable.schema_definition",
        "deliverable.api_definition",
        "deliverable.architecture",
      ]));
      expect(prdDocs.slots.map((slot: any) => slot.slotKey)).not.toContain("deliverable.requirement_inventory");
      expect(prdDocs.slots.map((slot: any) => slot.slotKey)).not.toContain("deliverable.feature_index");

      const architectureSlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.architecture", COMPANY_ID);
      expect(architectureSlot?.slot.status).toBe("ready");
      expect(architectureSlot?.document?.body).toContain("아키텍쳐 정의서");
      expect(architectureSlot?.document?.body).toContain("```mermaid");
      expect(architectureSlot?.document?.body).toContain("기술 스택");
      expect(architectureSlot?.document?.body).toContain("인프라 구성");

      const prdSlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.prd", COMPANY_ID);
      const featureSlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.feature_files", COMPANY_ID);
      expect(prdSlot?.document?.body).toContain("개발 요구사항 브리프");
      expect(prdSlot?.document?.body).toContain("A 프로젝트");
      expect(prdSlot?.slot.metadata).toMatchObject({ phase: "prd" });
      expect(prdDocs.files).not.toContain("docs/cos-blueprint/prd.md");
      expect(prdDocs.files.some((file: string) => file.startsWith("docs/cos-blueprint/"))).toBe(false);
      expect(featureSlot?.slot.metadata?.documentRefs).toEqual(expect.arrayContaining([
        `etl/projects/${PROJECT_ID}/transform/blueprint/feature-definition.md`,
        expect.stringContaining(`etl/projects/${PROJECT_ID}/transform/blueprint/features/`),
      ]));
      expect(featureSlot?.document?.body).toContain("기능정의서(Feature Definition) - 목록(Index)");
      expect(featureSlot?.document?.body).toContain("Base 재사용 판정(Base Reuse Decision)");
      expect(featureSlot?.document?.body).toContain("전체 재사용/부분 재사용/커스터마이징/신규/N/A");

      await harness.performAction<any>(BLUEPRINT_ACTION.runScreens, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });
      await waitFor(
        () => harness.getData<any>(BLUEPRINT_DATA.overview, { companyId: COMPANY_ID, projectId: PROJECT_ID }),
        (overview) => Boolean(overview.state.screenPlan) && overview.state.job?.kind === "screens" && overview.state.job.status === "running",
      );
      const screenDocs = await harness.performAction<any>(BLUEPRINT_ACTION.writeScreenDocs, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });
      expect(screenDocs.ok).toBe(true);
      const screenOverview = await harness.getData<any>(BLUEPRINT_DATA.overview, { companyId: COMPANY_ID, projectId: PROJECT_ID });
      expect(screenOverview.state.job).toBeNull();
      const screenSlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.screen_definitions", COMPANY_ID);
      expect(screenSlot?.slot.status).toBe("draft");
      expect(screenSlot?.slot.metadata).toMatchObject({ phase: "screen-definitions" });
      expect(screenSlot?.slot.metadata?.documentRefs).toHaveLength(screenOverview.state.screenPlan.screens.length + 1);
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
            "# 개발 요구사항 브리프",
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
        title: "개발 요구사항 브리프(Development Requirements Brief)",
        format: "markdown",
        body: "# 개발 요구사항 브리프\n\n기존 결제 정책",
        status: "ready",
        contentType: "text/markdown",
        metadata: { plugin: "paperclip-plugin-builder", documentRefs: ["etl/projects/test/transform/blueprint/development-requirements-brief.md"] },
      }, COMPANY_ID);
      const beforeSlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.prd", COMPANY_ID);

      const result = await harness.performAction<any>(BLUEPRINT_ACTION.chatWithPmAgent, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        message: "결제 정책에 환불 기준을 추가해줘.",
        activeWorkspaceTab: "deliverables",
        targetDeliverableSlotKey: "deliverable.prd",
        targetDeliverableTitle: "개발 요구사항 브리프(Development Requirements Brief)",
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
      content: [{ type: "text", text: JSON.stringify({ body: "# 개발 요구사항 브리프\n\n수정됨" }) }],
    }), { status: 200, headers: { "content-type": "application/json" } }));

    try {
      const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
      seedCompanyProjects(harness);
      seedBlueprintPmAgent(harness, instructionsPath);
      await builderPlugin.definition.setup(harness.ctx);
      await harness.ctx.projects.documentSlots.import(PROJECT_ID, "deliverable.prd", {
        title: "개발 요구사항 브리프(Development Requirements Brief)",
        format: "markdown",
        body: "# 개발 요구사항 브리프\n\n기존 결제 정책",
        status: "ready",
        contentType: "text/markdown",
        metadata: { plugin: "paperclip-plugin-builder", documentRefs: ["etl/projects/test/transform/blueprint/development-requirements-brief.md"] },
      }, COMPANY_ID);

      const result = await harness.performAction<any>(BLUEPRINT_ACTION.chatWithPmAgent, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        message: "결제 정책에 환불 기준을 추가해서 재생성해줘.",
        activeWorkspaceTab: "deliverables",
        targetDeliverableSlotKey: "deliverable.prd",
        targetDeliverableTitle: "개발 요구사항 브리프(Development Requirements Brief)",
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
        body: "AIGA는 홈(Home), 명의 찾기, 커뮤니티, 관리자 신고 처리 화면이 필요하다.",
        fileName: "aiga-requirements.md",
        format: "md",
      });
      await harness.performAction<any>(BLUEPRINT_ACTION.runPrd, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        title: "AIGA",
      });
      await submitBlueprintPrdForTest(harness, PROJECT_ID, "AIGA");
      await waitFor(
        () => harness.getData<any>(BLUEPRINT_DATA.overview, { companyId: COMPANY_ID, projectId: PROJECT_ID }),
        (overview) => Boolean(overview.state.prd) && !overview.state.job,
      );
      await harness.performAction<any>(BLUEPRINT_ACTION.confirmPrd, {
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
        (value) => Boolean(value.state.screenPlan) && value.state.job?.kind === "screens" && value.state.job.status === "running",
      );
      const writeResult = await harness.performAction<any>(BLUEPRINT_ACTION.writeScreenDocs, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });
      expect(writeResult.ok).toBe(true);
      const syncedOverview = await harness.getData<any>(BLUEPRINT_DATA.overview, { companyId: COMPANY_ID, projectId: PROJECT_ID });
      expect(syncedOverview.state.job).toBeNull();
      const screenSlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.screen_definitions", COMPANY_ID);
      expect(screenSlot?.slot.status).toBe("draft");
      expect(screenSlot?.slot.metadata).toMatchObject({ phase: "screen-definitions" });
      expect(screenSlot?.slot.metadata?.documentRefs).toHaveLength(overview.state.screenPlan.screens.length + 1);
      expect(screenSlot?.document?.body).toContain("화면정의서");
      expect(screenSlot?.document?.body).toContain("AIGA");
      expect(screenSlot?.document?.body).toContain("홈");
      expect(screenSlot?.document?.body).toContain("명의 찾기");
      expect(screenSlot?.document?.body).toContain("커뮤니티");
      expect(screenSlot?.document?.body).not.toContain("기획 자료 등록");
    } finally {
      if (previousDisableLlm === undefined) delete process.env.COS_BLUEPRINT_DISABLE_LLM;
      else process.env.COS_BLUEPRINT_DISABLE_LLM = previousDisableLlm;
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("regenerates Screen Definitions when the Development Requirements Brief slot is ready but state confirmation is missing", async () => {
    const previousDisableLlm = process.env.COS_BLUEPRINT_DISABLE_LLM;
    process.env.COS_BLUEPRINT_DISABLE_LLM = "true";
    const workspace = mkdtempSync(path.join(os.tmpdir(), "builder-blueprint-pm-screens-slot-"));
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
        body: "프로젝트명 AIGA 정식 서비스 개발 프로젝트 프로젝트 목적 AIGA는 홈(Home), 명의 찾기, 커뮤니티, 관리자 신고 처리 화면이 필요하다.",
        fileName: "aiga-requirements.md",
        format: "md",
      });
      await harness.performAction<any>(BLUEPRINT_ACTION.runPrd, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        title: "AIGA",
      });
      await submitBlueprintPrdForTest(harness, PROJECT_ID, "AIGA");
      const unconfirmed = await waitFor(
        () => harness.getData<any>(BLUEPRINT_DATA.overview, { companyId: COMPANY_ID, projectId: PROJECT_ID }),
        (overview) => Boolean(overview.state.prd) && !overview.state.prd.confirmedAt && !overview.state.job,
      );
      await harness.ctx.projects.documentSlots.import(PROJECT_ID, "deliverable.prd" as any, {
        title: "개발 요구사항 브리프(Development Requirements Brief)",
        format: "markdown",
        body: "# 개발 요구사항 브리프\n\nAIGA 실행 기준선",
        status: "ready",
        contentType: "text/markdown",
        metadata: {
          plugin: "paperclip-plugin-builder",
          phase: "prd",
          generatedAt: unconfirmed.state.prd.generatedAt,
        },
      }, COMPANY_ID);
      await harness.ctx.projects.documentSlots.import(PROJECT_ID, "deliverable.screen_definitions" as any, {
        title: "화면정의서(Screen Definitions)",
        format: "markdown",
        body: "# 이전 화면정의서\n\n재분석 전 초안",
        status: "draft",
        contentType: "text/markdown",
        metadata: { plugin: "paperclip-plugin-builder", phase: "screen-definitions" },
      }, COMPANY_ID);

      const result = await harness.performAction<any>(BLUEPRINT_ACTION.chatWithPmAgent, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        message: "화면정의서(Screen Definitions)을 재분석하고 다시 생성해줘.",
        activeWorkspaceTab: "deliverables",
        targetDeliverableSlotKey: "deliverable.screen_definitions",
        targetDeliverableTitle: "화면정의서(Screen Definitions)",
      });

      expect(result.ok).toBe(true);
      expect(result.message).toContain("자동 기록");
      expect(result.payload).toMatchObject({
        action: "run-screens",
        slotKey: "deliverable.screen_definitions",
      });

      const overview = await waitFor(
        () => harness.getData<any>(BLUEPRINT_DATA.overview, { companyId: COMPANY_ID, projectId: PROJECT_ID }),
        (value) => Boolean(value.state.prd?.confirmedAt) && Boolean(value.state.screenPlan) && value.state.job?.kind === "screens" && value.state.job.status === "running",
      );
      const writeResult = await harness.performAction<any>(BLUEPRINT_ACTION.writeScreenDocs, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });
      expect(writeResult.ok).toBe(true);
      const syncedOverview = await harness.getData<any>(BLUEPRINT_DATA.overview, { companyId: COMPANY_ID, projectId: PROJECT_ID });
      expect(syncedOverview.state.job).toBeNull();
      const screenSlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.screen_definitions", COMPANY_ID);
      expect(screenSlot?.slot.status).toBe("draft");
      expect(screenSlot?.slot.metadata).toMatchObject({ phase: "screen-definitions" });
      expect(screenSlot?.slot.metadata?.documentRefs).toHaveLength(overview.state.screenPlan.screens.length + 1);
      expect(screenSlot?.document?.body).toContain("화면정의서");
      expect(screenSlot?.document?.body).toContain("AIGA");
      expect(screenSlot?.document?.body).toContain("홈");
      expect(screenSlot?.document?.body).toContain("명의 찾기");
      expect(screenSlot?.document?.body).toContain("커뮤니티");
      expect(screenSlot?.document?.body).not.toContain("기획 자료 등록");
    } finally {
      if (previousDisableLlm === undefined) delete process.env.COS_BLUEPRINT_DISABLE_LLM;
      else process.env.COS_BLUEPRINT_DISABLE_LLM = previousDisableLlm;
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("repairs generic LLM Screen Definitions with source-backed screens", async () => {
    const previousDisableLlm = process.env.COS_BLUEPRINT_DISABLE_LLM;
    delete process.env.COS_BLUEPRINT_DISABLE_LLM;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      content: [{
        type: "text",
        text: JSON.stringify({
          screens: [{
            code: "COS-SCR-001",
            name: "기획 자료 등록",
            description: "내부 Builder 기본 화면",
            route: "/cos-blueprint/sources",
          }],
          generatedAt: "2026-06-25T00:00:00.000Z",
        }),
      }],
    }), { headers: { "content-type": "application/json" } }));

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
          id: "aiga-source-0001",
          title: "AIGA 서비스 기획서.pdf",
          type: "external-plan",
          body: "AIGA 서비스 기획서 3. 핵심 기능 1 홈 (Home) 2 통합 검색 3 명의 찾기 4 커뮤니티 5 관리자 신고 처리",
          createdAt: "2026-06-25T00:00:00.000Z",
          fileName: "aiga.pdf",
          format: "pdf",
        }],
        productBuilderBlueprintId: "web-application-service-standard",
        productBuilderBlueprintSelectedAt: "2026-06-25T00:00:00.000Z",
        requirementInventory: null,
        prd: {
          projectTitle: "아키텍쳐 정의서(Architecture Definition)",
          overview: "Generic fallback",
          goals: [],
          scope: { inScope: [], outOfScope: [] },
          functionalRequirements: [
            { code: "FR-001", title: "기획 자료 등록", description: "내부 Builder 기본 기능" },
          ],
          nonFunctionalRequirements: [],
          schemas: [{ code: "SCH-001", name: "ProjectBrief", description: "", fields: [] }],
          apis: [{ code: "API-001", method: "POST", path: "/api/project-briefs", summary: "", input: [], output: [], schemas: ["SCH-001"] }],
          layouts: [{ code: "COS-LAY-001", name: "Workspace Layout", description: "", slots: [{ code: "SLOT-MAIN", name: "Main", purpose: "" }] }],
          architecture: {
            overview: "",
            diagram: "",
            components: [],
            techStack: [],
            infrastructure: [],
            integrations: [],
            dataFlow: [],
          },
          risks: [],
          assumptions: [],
          generatedAt: "2026-06-25T00:00:00.000Z",
          confirmedAt: "2026-06-25T00:00:00.000Z",
          usedFallback: true,
        },
        screenPlan: null,
        projectDocumentSlots: [],
        job: null,
        updatedAt: "2026-06-25T00:00:00.000Z",
      });

      const result = await harness.performAction<any>(BLUEPRINT_ACTION.runScreens, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });
      expect(result.started).toBe(true);

      const overview = await waitFor(
        () => harness.getData<any>(BLUEPRINT_DATA.overview, { companyId: COMPANY_ID, projectId: PROJECT_ID }),
        (value) => Boolean(value.state.screenPlan) && value.state.job?.kind === "screens" && value.state.job.status === "running",
      );
      expect(overview.state.screenPlan.screens.map((screen: any) => screen.name)).toEqual(
        expect.arrayContaining(["홈", "통합 검색", "명의 찾기", "커뮤니티", "Admin 신고 처리"]),
      );
      expect(overview.state.screenPlan.screens.map((screen: any) => screen.name)).not.toContain("기획 자료 등록");

      const writeResult = await harness.performAction<any>(BLUEPRINT_ACTION.writeScreenDocs, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });
      expect(writeResult.ok).toBe(true);
      const screenSlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.screen_definitions", COMPANY_ID);
      expect(screenSlot?.document?.body).toContain("홈");
      expect(screenSlot?.document?.body).toContain("명의 찾기");
      expect(screenSlot?.document?.body).toContain("커뮤니티");
      expect(screenSlot?.document?.body).not.toContain("기획 자료 등록");
    } finally {
      fetchMock.mockRestore();
      if (previousDisableLlm === undefined) delete process.env.COS_BLUEPRINT_DISABLE_LLM;
      else process.env.COS_BLUEPRINT_DISABLE_LLM = previousDisableLlm;
    }
  });

  it("does not create Builder workflow screens when Screen Definition fallback has no source screen candidates", async () => {
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
          id: "coupon-source-0001",
          title: "쿠폰 정책 문서",
          type: "external-plan",
          body: "쿠폰 발급 정책을 설정한다.",
          createdAt: "2026-06-25T00:00:00.000Z",
          fileName: "coupon.md",
          format: "md",
        }],
        productBuilderBlueprintId: "web-application-service-standard",
        productBuilderBlueprintSelectedAt: "2026-06-25T00:00:00.000Z",
        requirementInventory: null,
        prd: {
          projectTitle: "쿠폰 프로젝트",
          overview: "쿠폰 정책",
          goals: ["쿠폰 정책 확정"],
          scope: { inScope: ["쿠폰 발급"], outOfScope: [] },
          functionalRequirements: [
            { code: "FR-001", title: "쿠폰 발급", description: "쿠폰 발급 정책을 설정한다.", priority: "must" },
          ],
          nonFunctionalRequirements: [],
          schemas: [],
          apis: [],
          layouts: [],
          architecture: {
            overview: "",
            diagram: "",
            components: [],
            techStack: [],
            infrastructure: [],
            integrations: [],
            dataFlow: [],
          },
          risks: [],
          assumptions: [],
          generatedAt: "2026-06-25T00:00:00.000Z",
          confirmedAt: "2026-06-25T00:00:00.000Z",
        },
        screenPlan: null,
        projectDocumentSlots: [],
        job: null,
        updatedAt: "2026-06-25T00:00:00.000Z",
      });

      const result = await harness.performAction<any>(BLUEPRINT_ACTION.runScreens, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });
      expect(result.started).toBe(true);
      const overview = await waitFor(
        () => harness.getData<any>(BLUEPRINT_DATA.overview, { companyId: COMPANY_ID, projectId: PROJECT_ID }),
        (value) => Boolean(value.state.screenPlan) && value.state.job?.kind === "screens" && value.state.job.status === "running",
      );

      expect(overview.state.screenPlan.screens.map((screen: any) => screen.name)).toContain("쿠폰 발급");
      expect(overview.state.screenPlan.screens.map((screen: any) => screen.name)).not.toEqual(
        expect.arrayContaining(["기획 자료 등록", "브리프 기준선 검토", "관리자 검수"]),
      );
      expect(JSON.stringify(overview.state.screenPlan)).not.toContain("cos-blueprint");
      expect(JSON.stringify(overview.state.screenPlan)).not.toContain("project-briefs");
    } finally {
      if (previousDisableLlm === undefined) delete process.env.COS_BLUEPRINT_DISABLE_LLM;
      else process.env.COS_BLUEPRINT_DISABLE_LLM = previousDisableLlm;
    }
  });

  it("repairs Builder workflow screens from the LLM even when source screen candidates are missing", async () => {
    const previousDisableLlm = process.env.COS_BLUEPRINT_DISABLE_LLM;
    delete process.env.COS_BLUEPRINT_DISABLE_LLM;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      content: [{
        type: "text",
        text: JSON.stringify({
          screens: [{
            code: "COS-SCR-001",
            name: "기획 자료 등록",
            description: "내부 Builder 기본 화면에서 source material을 저장한다.",
            layoutCode: "COS-LAY-001",
            route: "/cos-blueprint/sources",
            primaryTestId: "cos-scr-001",
            actions: [{ code: "ACT-01", testId: "cos-scr-001-act-01", trigger: "저장", description: "ProjectBrief 저장" }],
          }],
          generatedAt: "2026-06-25T00:00:00.000Z",
        }),
      }],
    }), { headers: { "content-type": "application/json" } }));

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
          id: "coupon-source-0001",
          title: "쿠폰 정책 문서",
          type: "external-plan",
          body: "쿠폰 발급 정책을 설정한다.",
          createdAt: "2026-06-25T00:00:00.000Z",
          fileName: "coupon.md",
          format: "md",
        }],
        productBuilderBlueprintId: "web-application-service-standard",
        productBuilderBlueprintSelectedAt: "2026-06-25T00:00:00.000Z",
        requirementInventory: null,
        prd: {
          projectTitle: "쿠폰 프로젝트",
          overview: "쿠폰 정책",
          goals: ["쿠폰 정책 확정"],
          scope: { inScope: ["쿠폰 발급"], outOfScope: [] },
          functionalRequirements: [
            { code: "FR-001", title: "쿠폰 발급", description: "쿠폰 발급 정책을 설정한다.", priority: "must" },
          ],
          nonFunctionalRequirements: [],
          schemas: [],
          apis: [],
          layouts: [],
          architecture: {
            overview: "",
            diagram: "",
            components: [],
            techStack: [],
            infrastructure: [],
            integrations: [],
            dataFlow: [],
          },
          risks: [],
          assumptions: [],
          generatedAt: "2026-06-25T00:00:00.000Z",
          confirmedAt: "2026-06-25T00:00:00.000Z",
        },
        screenPlan: null,
        projectDocumentSlots: [],
        job: null,
        updatedAt: "2026-06-25T00:00:00.000Z",
      });

      const result = await harness.performAction<any>(BLUEPRINT_ACTION.runScreens, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });
      expect(result.started).toBe(true);
      const overview = await waitFor(
        () => harness.getData<any>(BLUEPRINT_DATA.overview, { companyId: COMPANY_ID, projectId: PROJECT_ID }),
        (value) => Boolean(value.state.screenPlan) && value.state.job?.kind === "screens" && value.state.job.status === "running",
      );

      expect(overview.state.screenPlan.screens.map((screen: any) => screen.name)).toContain("쿠폰 발급");
      const serializedScreenPlan = JSON.stringify(overview.state.screenPlan);
      for (const marker of INTERNAL_BUILDER_OUTPUT_MARKERS) {
        expect(serializedScreenPlan).not.toContain(marker);
      }
      expect(serializedScreenPlan).not.toContain("cos-blueprint");
    } finally {
      fetchMock.mockRestore();
      if (previousDisableLlm === undefined) delete process.env.COS_BLUEPRINT_DISABLE_LLM;
      else process.env.COS_BLUEPRINT_DISABLE_LLM = previousDisableLlm;
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
      prd: {
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
    expect(firstOverview.state.prd).toBeNull();
    expect(secondOverview.state.sources).toHaveLength(0);
    expect(secondOverview.state.prd).toBeNull();
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
        prd: null,
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

      const restart = await harness.performAction<any>(BLUEPRINT_ACTION.runPrd, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        title: "재시작 유실 요구사항",
      });
      expect(restart.started).toBe(true);
      expect(restart.job.jobId).not.toBe("lost-job-after-restart");
      await submitBlueprintPrdForTest(harness, PROJECT_ID, "재시작 유실 요구사항", {
        requirementInventory: {
          items: [{
            id: "REQ-001",
            category: "functional_requirement",
            targetDeliverables: ["deliverable.prd", "deliverable.feature_files"],
            title: "산출물 분해 재실행",
            description: "산출물 분해 재실행 요구사항",
            sourceRefs: [{
              sourceId: "restart",
              sourceTitle: "재시작 요구사항",
              evidenceExcerpt: "산출물 분해 재실행",
            }],
            confidence: 0.95,
            status: "confirmed",
          }],
        },
        prd: {
          functionalRequirements: [{
            title: "산출물 분해 재실행",
            description: "산출물 분해 재실행 요구사항",
            priority: "must",
            sourceInventoryItemIds: ["REQ-001"],
          }],
          scope: { inScope: ["산출물 분해 재실행"], outOfScope: ["등록 자료에 없는 신규 범위"] },
        },
      });
      const recovered = await waitFor(
        () => harness.getData<any>(BLUEPRINT_DATA.overview, { companyId: COMPANY_ID, projectId: PROJECT_ID }),
        (nextOverview) => Boolean(nextOverview.state.prd) && !nextOverview.state.job,
      );
      expect(recovered.state.requirementInventory?.items.some((item: any) =>
        `${item.title} ${item.description}`.includes("산출물 분해 재실행"),
      )).toBe(true);
      expect(recovered.state.prd.functionalRequirements.some((requirement: any) =>
        `${requirement.title} ${requirement.description}`.includes("산출물 분해 재실행"),
      )).toBe(true);
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

    const firstStart = await harness.performAction<any>(BLUEPRINT_ACTION.runPrd, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      title: "A 프로젝트",
    });
    const secondStart = await harness.performAction<any>(BLUEPRINT_ACTION.runPrd, {
      companyId: COMPANY_ID,
      projectId: SECOND_PROJECT_ID,
      title: "B 프로젝트",
    });
    expect(firstStart.started).toBe(true);
    expect(secondStart.started).toBe(true);

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
      stage: "prd",
      projectId: PROJECT_ID,
    });
    expect(secondRunning.state.job).toMatchObject({
      status: "running",
      stage: "prd",
      projectId: SECOND_PROJECT_ID,
    });
    expect(firstRunning.state.job.jobId).not.toBe(secondRunning.state.job.jobId);

    const duplicate = await harness.performAction<any>(BLUEPRINT_ACTION.runPrd, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      title: "A 프로젝트 중복",
    });
    expect(duplicate.started).toBe(false);
    expect(duplicate.reason).toBe("same-stage-running");
    expect(duplicate.job.jobId).toBe(firstRunning.state.job.jobId);

    await harness.performAction<any>(BLUEPRINT_ACTION.reset, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
    });

    await submitBlueprintPrdForTest(harness, SECOND_PROJECT_ID, "B 프로젝트");
    const secondDone = await waitFor(
      () => harness.getData<any>(BLUEPRINT_DATA.overview, { companyId: COMPANY_ID, projectId: SECOND_PROJECT_ID }),
      (overview) => Boolean(overview.state.prd) && !overview.state.job,
    );
    expect(secondDone.state.prd?.projectTitle).toBeTruthy();

    const firstAfterReset = await harness.getData<any>(BLUEPRINT_DATA.overview, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
    });
    expect(firstAfterReset.state.sources).toHaveLength(0);
    expect(firstAfterReset.state.prd).toBeNull();
    expect(firstAfterReset.state.job).toBeNull();
  });

  it("purges registered Blueprint sources and generated Project document slots for a project", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    seedCompanyProjects(harness);
    await builderPlugin.definition.setup(harness.ctx);

    const source = await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      title: "초기화 대상 요구사항",
      type: "external-plan",
      body: "초기화 후 사라져야 할 등록 자료",
      fileName: "purge-me.md",
      format: "md",
    });
    await harness.ctx.projects.documentSlots.import(PROJECT_ID, "deliverable.prd", {
      title: "개발 요구사항 브리프(Development Requirements Brief)",
      format: "markdown",
      body: "# 개발 요구사항 브리프\n\n초기화 후 사라져야 할 브리프",
      status: "ready",
      contentType: "text/markdown",
      metadata: { plugin: "paperclip-plugin-builder", documentRefs: ["etl/projects/test/transform/blueprint/development-requirements-brief.md"] },
    }, COMPANY_ID);
    await harness.ctx.projects.documentSlots.import(PROJECT_ID, "deliverable.screen_definitions", {
      title: "화면정의서(Screen Definitions)",
      format: "markdown",
      body: "# 화면정의서\n\n초기화 후 사라져야 할 화면정의서",
      status: "ready",
      contentType: "text/markdown",
      metadata: { plugin: "paperclip-plugin-builder", screenCount: 1 },
    }, COMPANY_ID);

    const seededOverview = await harness.getData<any>(BLUEPRINT_DATA.overview, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
    });
    await harness.ctx.state.set({
      scopeKind: "project",
      scopeId: PROJECT_ID,
      namespace: `company:${COMPANY_ID}`,
      stateKey: BLUEPRINT_STATE_KEY,
    }, {
      ...seededOverview.state,
      requirementInventory: {
        deliverables: [],
        items: [{ id: "REQ-001", title: "초기화 대상" }],
        generatedAt: "2026-06-26T00:00:00.000Z",
        sourceCount: 1,
        chunkCount: 1,
        usedFallback: false,
      },
      prd: { projectTitle: "초기화 테스트", overview: "stale" },
      screenPlan: { projectTitle: "초기화 테스트", screens: [], reviews: {}, generatedAt: "2026-06-26T00:00:00.000Z" },
    });

    const result = await harness.performAction<any>(BLUEPRINT_ACTION.purgeProject, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
    });

    expect(source.ok).toBe(true);
    expect(result).toMatchObject({
      ok: true,
      projectId: PROJECT_ID,
      clearedSlotCount: PROJECT_DOCUMENT_SLOT_DEFINITIONS.length,
    });
    expect(result.clearedSlotKeys).toEqual(PROJECT_DOCUMENT_SLOT_DEFINITIONS.map((definition) => definition.slotKey));

    const overview = await harness.getData<any>(BLUEPRINT_DATA.overview, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
    });
    expect(overview.state.sources).toEqual([]);
    expect(overview.state.requirementInventory).toBeNull();
    expect(overview.state.prd).toBeNull();
    expect(overview.state.screenPlan).toBeNull();
    expect(overview.state.projectDocumentSlots).toEqual([]);
    expect(overview.state.job).toBeNull();

    const slots = await harness.ctx.projects.documentSlots.list(PROJECT_ID, COMPANY_ID);
    const blueprintSlots = slots.filter((slot: any) =>
      PROJECT_DOCUMENT_SLOT_DEFINITIONS.some((definition) => definition.slotKey === slot.slotKey)
    );
    expect(blueprintSlots).toHaveLength(PROJECT_DOCUMENT_SLOT_DEFINITIONS.length);
    for (const slot of blueprintSlots) {
      expect(slot.status).toBe("empty");
      expect(slot.documentId).toBeNull();
      expect(slot.artifactId).toBeNull();
      expect(slot.metadata).toBeNull();
    }
    const sourceSlotContent = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "source.customer_originals", COMPANY_ID);
    const prdSlotContent = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.prd", COMPANY_ID);
    expect(sourceSlotContent?.document).toBeNull();
    expect(prdSlotContent?.document).toBeNull();
  });

  it("saves edited deliverable Markdown into the selected Project document slot", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    seedCompanyProjects(harness);
    await builderPlugin.definition.setup(harness.ctx);

    await harness.ctx.projects.documentSlots.import(PROJECT_ID, "deliverable.prd", {
      title: "개발 요구사항 브리프(Development Requirements Brief)",
      format: "markdown",
      body: "# 개발 요구사항 브리프\n\nBefore edit",
      status: "approved",
      contentType: "text/markdown",
      metadata: { plugin: "paperclip-plugin-builder", documentRefs: ["etl/projects/test/transform/blueprint/development-requirements-brief.md"] },
    }, COMPANY_ID);

    const result = await harness.performAction<any>(BLUEPRINT_ACTION.saveProjectDocumentSlot, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      slotKey: "deliverable.prd",
      body: "# 개발 요구사항 브리프\n\nEdited in TipTap",
    });

    expect(result).toMatchObject({
      ok: true,
      projectId: PROJECT_ID,
      slotKey: "deliverable.prd",
      status: "ready",
    });

    const content = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.prd", COMPANY_ID);
    expect(content?.document?.body).toBe("# 개발 요구사항 브리프\n\nEdited in TipTap");
    expect(content?.slot.status).toBe("ready");
    expect(content?.slot.metadata).toMatchObject({
      plugin: "paperclip-plugin-builder",
      documentRefs: ["etl/projects/test/transform/blueprint/development-requirements-brief.md"],
    });

    const overview = await harness.getData<any>(BLUEPRINT_DATA.overview, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
    });
    expect(overview.state.projectDocumentSlots).toEqual(expect.arrayContaining([
      expect.objectContaining({ slotKey: "deliverable.prd", status: "ready" }),
    ]));
  });

  it("updates deliverable draft/approved status without rewriting the document body", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    seedCompanyProjects(harness);
    await builderPlugin.definition.setup(harness.ctx);

    await harness.ctx.projects.documentSlots.import(PROJECT_ID, "deliverable.feature_files", {
      title: "기능 정의서(Feature Definition)",
      format: "markdown",
      body: "# Feature Definition\n\nBefore status change",
      status: "ready",
      contentType: "text/markdown",
      metadata: { plugin: "paperclip-plugin-builder", documentRefs: ["etl/projects/test/transform/blueprint/feature-definition.md"] },
    }, COMPANY_ID);

    const before = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.feature_files", COMPANY_ID);
    const approved = await harness.performAction<any>(BLUEPRINT_ACTION.updateProjectDocumentSlotStatus, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      slotKey: "deliverable.feature_files",
      status: "approved",
    });

    expect(approved).toMatchObject({
      ok: true,
      projectId: PROJECT_ID,
      slotKey: "deliverable.feature_files",
      status: "approved",
      previousStatus: "ready",
    });

    const afterApproved = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.feature_files", COMPANY_ID);
    expect(afterApproved?.document?.id).toBe(before?.document?.id);
    expect(afterApproved?.document?.body).toBe("# Feature Definition\n\nBefore status change");
    expect(afterApproved?.slot.status).toBe("approved");
    expect(afterApproved?.slot.metadata).toMatchObject({
      plugin: "paperclip-plugin-builder",
      documentRefs: ["etl/projects/test/transform/blueprint/feature-definition.md"],
      statusUpdatedFrom: "ready",
      statusUpdatedTo: "approved",
    });

    const draft = await harness.performAction<any>(BLUEPRINT_ACTION.updateProjectDocumentSlotStatus, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      slotKey: "deliverable.feature_files",
      status: "draft",
    });
    expect(draft).toMatchObject({
      ok: true,
      slotKey: "deliverable.feature_files",
      status: "draft",
      previousStatus: "approved",
    });

    const afterDraft = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.feature_files", COMPANY_ID);
    expect(afterDraft?.document?.id).toBe(before?.document?.id);
    expect(afterDraft?.document?.body).toBe("# Feature Definition\n\nBefore status change");
    expect(afterDraft?.slot.status).toBe("draft");

    const overview = await harness.getData<any>(BLUEPRINT_DATA.overview, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
    });
    expect(overview.state.projectDocumentSlots).toEqual(expect.arrayContaining([
      expect.objectContaining({ slotKey: "deliverable.feature_files", status: "draft" }),
    ]));
  });

  it("syncs Development Requirements Brief slot status changes with the confirmation gate", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    seedCompanyProjects(harness);
    await builderPlugin.definition.setup(harness.ctx);

    await harness.ctx.projects.documentSlots.import(PROJECT_ID, "deliverable.prd", {
      title: "개발 요구사항 브리프(Development Requirements Brief)",
      format: "markdown",
      body: "# 개발 요구사항 브리프\n\nReady for gate sync",
      status: "ready",
      contentType: "text/markdown",
      metadata: { plugin: "paperclip-plugin-builder", documentRefs: ["etl/projects/test/transform/blueprint/development-requirements-brief.md"] },
    }, COMPANY_ID);

    const initialOverview = await harness.getData<any>(BLUEPRINT_DATA.overview, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
    });
    const prdDefinition = PROJECT_DOCUMENT_SLOT_DEFINITIONS.find((definition) => definition.slotKey === "deliverable.prd");
    expect(prdDefinition).toBeTruthy();
    await harness.ctx.state.set({
      scopeKind: "project",
      scopeId: PROJECT_ID,
      namespace: `company:${COMPANY_ID}`,
      stateKey: BLUEPRINT_STATE_KEY,
    }, {
      ...initialOverview.state,
      prd: {
        ...buildFallbackPrd({
          title: "Gate Sync",
          sources: [],
          productBuilderBlueprintId: initialOverview.state.productBuilderBlueprintId,
        }),
        confirmedAt: null,
      },
      projectDocumentSlots: [{
        ...prdDefinition!,
        status: "ready",
        documentRefs: ["etl/projects/test/transform/blueprint/development-requirements-brief.md"],
        updatedAt: "2026-06-26T00:00:00.000Z",
      }],
    });

    const approved = await harness.performAction<any>(BLUEPRINT_ACTION.updateProjectDocumentSlotStatus, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      slotKey: "deliverable.prd",
      status: "approved",
    });
    expect(approved.status).toBe("approved");

    const approvedOverview = await harness.getData<any>(BLUEPRINT_DATA.overview, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
    });
    expect(approvedOverview.state.prd.confirmedAt).toBe(approved.updatedAt);
    expect(approvedOverview.state.projectDocumentSlots).toEqual(expect.arrayContaining([
      expect.objectContaining({ slotKey: "deliverable.prd", status: "approved", updatedAt: approved.updatedAt }),
    ]));

    const draft = await harness.performAction<any>(BLUEPRINT_ACTION.updateProjectDocumentSlotStatus, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      slotKey: "deliverable.prd",
      status: "draft",
    });
    expect(draft.status).toBe("draft");

    const draftOverview = await harness.getData<any>(BLUEPRINT_DATA.overview, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
    });
    expect(draftOverview.state.prd.confirmedAt).toBeNull();
    expect(draftOverview.state.projectDocumentSlots).toEqual(expect.arrayContaining([
      expect.objectContaining({ slotKey: "deliverable.prd", status: "draft", updatedAt: draft.updatedAt }),
    ]));
    const draftContent = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.prd", COMPANY_ID);
    expect(draftContent?.slot.status).toBe("draft");
    expect(draftContent?.slot.metadata).toMatchObject({
      confirmedAt: null,
      statusUpdatedTo: "draft",
    });
  });

  it("saves one edited source Markdown block without dropping other registered source blocks", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    seedCompanyProjects(harness);
    await builderPlugin.definition.setup(harness.ctx);

    const first = await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      title: "첫 번째 자료",
      type: "external-plan",
      body: "첫 번째 원문",
      fileName: "first.md",
      format: "md",
    });
    const second = await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      title: "두 번째 자료",
      type: "external-plan",
      body: "두 번째 원문",
      fileName: "second.md",
      format: "md",
    });
    const seededOverview = await harness.getData<any>(BLUEPRINT_DATA.overview, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
    });
    await harness.ctx.state.set({
      scopeKind: "project",
      scopeId: PROJECT_ID,
      namespace: `company:${COMPANY_ID}`,
      stateKey: BLUEPRINT_STATE_KEY,
    }, {
      ...seededOverview.state,
      requirementInventory: { deliverables: [], items: [], generatedAt: "2026-06-26T00:00:00.000Z", sourceCount: 2, chunkCount: 0, usedFallback: false },
      prd: { projectTitle: "stale", overview: "stale" },
      screenPlan: { projectTitle: "stale", screens: [], reviews: {}, generatedAt: "2026-06-26T00:00:00.000Z" },
    });

    const before = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "source.customer_originals", COMPANY_ID);
    const firstBlock = sourceBodyForRenderedSourceItem(before?.document?.body ?? "", "첫 번째 자료", first.file);
    expect(firstBlock).toContain("첫 번째 원문");
    expect(before?.document?.body).toContain("두 번째 원문");

    const editedBlock = firstBlock.replace("첫 번째 원문", "첫 번째 원문 - 편집됨");
    const result = await harness.performAction<any>(BLUEPRINT_ACTION.saveProjectDocumentSlot, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      slotKey: "source.customer_originals",
      body: editedBlock,
      sourceId: first.source.id,
      documentRef: first.file,
      sourceFingerprint: first.source.fingerprint,
    });

    expect(second.ok).toBe(true);
    expect(result).toMatchObject({
      ok: true,
      projectId: PROJECT_ID,
      slotKey: "source.customer_originals",
      sourceId: first.source.id,
      documentRef: first.file,
    });

    const after = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "source.customer_originals", COMPANY_ID);
    const firstAfter = sourceBodyForRenderedSourceItem(after?.document?.body ?? "", "첫 번째 자료", first.file);
    expect(firstAfter).toContain("첫 번째 원문 - 편집됨");
    expect(after?.document?.body).toContain("두 번째 원문");
    expect(after?.document?.body).not.toContain("첫 번째 원문\n");

    const overview = await harness.getData<any>(BLUEPRINT_DATA.overview, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
    });
    const editedSource = overview.state.sources.find((source: any) => source.id === first.source.id);
    expect(editedSource?.body).toBe("첫 번째 원문 - 편집됨");
    expect(overview.state.requirementInventory).toBeNull();
    expect(overview.state.prd).toBeNull();
    expect(overview.state.screenPlan).toBeNull();
  });

  it("stores PM Agent submitted brief payloads without falling back to Builder internals", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    seedCompanyProjects(harness);
    await builderPlugin.definition.setup(harness.ctx);
    await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      title: "AIGA 기획",
      type: "external-plan",
      body: "AIGA 의료정보 플랫폼: 명의 검색, AI 챗봇, 커뮤니티",
      fileName: "aiga.md",
      format: "md",
    });
    await harness.performAction<any>(BLUEPRINT_ACTION.runPrd, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      title: "AIGA",
    });
    await submitBlueprintPrdForTest(harness, PROJECT_ID, "AIGA", {
      prd: {
      projectTitle: "AIGA 코드펜스 브리프",
      overview: "명의/병원 검색과 AI 상담",
      goals: ["접근성", "상담 만족도"],
      scope: { inScope: ["검색"], outOfScope: ["예약"] },
      functionalRequirements: [
        { title: "명의 검색", description: "필터/랭킹", priority: "must" },
        { title: "기획 자료 등록", description: "내부 Builder 기본 기능", priority: "must" },
      ],
      nonFunctionalRequirements: ["모바일 최적화"],
      schemas: [{ code: "SCH-001", name: "ProjectBrief", description: "COS Blueprint 자료", fields: [] }],
      apis: [{ code: "API-001", method: "POST", path: "/api/project-briefs", summary: "기획 자료 등록", input: [], output: [], schemas: ["SCH-001"] }],
      layouts: [{ code: "COS-LAY-001", name: "Workspace Layout", description: "좌측 자료/단계 탐색", slots: [] }],
      architecture: {
        overview: "COS Blueprint 운영 아키텍쳐",
        diagram: "flowchart TB\n  pb[ProjectBrief]",
        components: [{ code: "ARC-CMP-001", name: "ProjectBrief", layer: "data", responsibility: "COS Blueprint", techStack: [], dependsOn: [] }],
        techStack: [],
        infrastructure: [],
        integrations: ["cos-blueprint"],
        dataFlow: ["/api/project-briefs"],
      },
      risks: [],
      assumptions: [],
      },
    });
    const done = await harness.getData<any>(BLUEPRINT_DATA.overview, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
    });
    const fencedPrd = done.state.prd;
    expect(fencedPrd.usedFallback).toBeFalsy();
    expect(fencedPrd.projectTitle).toBe("AIGA 코드펜스 브리프");
    expect(fencedPrd.functionalRequirements.map((f: any) => f.title)).toContain("명의 검색");
    expect(fencedPrd.functionalRequirements.map((f: any) => f.title)).not.toContain("기획 자료 등록");
    expect(fencedPrd.schemas).toEqual([]);
    expect(fencedPrd.apis).toEqual([]);
    expect(fencedPrd.layouts).toEqual([]);
    expect(JSON.stringify(fencedPrd.architecture)).not.toContain("ProjectBrief");
    expect(JSON.stringify(fencedPrd.architecture)).not.toContain("project-briefs");
    const renderedPrdDocs = Object.values(renderPrdDocuments(fencedPrd)).join("\n\n---\n\n");
    for (const marker of INTERNAL_BUILDER_OUTPUT_MARKERS) {
      expect(renderedPrdDocs).not.toContain(marker);
    }
    expect(renderedPrdDocs).toContain("명의 검색");
    expect(renderedPrdDocs).toContain("기능 정의서(Feature Definition) - 명의 검색");

    const rejected = await harness.executeTool<any>(SUBMIT_BLUEPRINT_PRD_TOOL.name, {
      projectId: PROJECT_ID,
      prd: {
        projectTitle: "빈 브리프",
        overview: "기능 요구사항이 없는 브리프",
        goals: ["g1"],
        scope: { inScope: ["x"], outOfScope: ["y"] },
        functionalRequirements: [],
      },
    }, { companyId: COMPANY_ID, projectId: PROJECT_ID });
    expect(rejected.error).toContain("at least one functional requirement");
  });

  it("imports completed PM Agent final JSON payloads from run results", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    seedCompanyProjects(harness);
    await builderPlugin.definition.setup(harness.ctx);

    await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      title: "AIGA 노션 자료",
      type: "external-plan",
      body: [
        "# AIGA",
        "source_type: notion_shared_page",
        "fetch_status: fetched",
        "## 노션 공유페이지(Notion Shared Page)",
        "",
        "## 핵심 기능",
        "- 명의/병원 검색",
        "- 환우 커뮤니티",
        "- 복약 관리",
      ].join("\n"),
      format: "notion",
      intakeWorkflow: "notion_shared_page",
    });

    let invokedRunId = "";
    const originalInvoke = harness.ctx.agents.invoke;
    harness.ctx.agents.invoke = (async (...args: Parameters<typeof harness.ctx.agents.invoke>) => {
      const result = await originalInvoke(...args);
      invokedRunId = result.runId;
      return result;
    }) as typeof harness.ctx.agents.invoke;

    await harness.performAction<any>(BLUEPRINT_ACTION.runPrd, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      title: "AIGA",
    });
    expect(invokedRunId).toBeTruthy();

    const finalPayload = {
      projectId: PROJECT_ID,
      prd: {
        projectTitle: "AIGA 의료정보 플랫폼",
        overview: "명의/병원 검색, 환우 커뮤니티, 복약 관리를 제공한다.",
        goals: ["신뢰 가능한 의료정보 탐색", "환우 경험 공유"],
        scope: { inScope: ["명의/병원 검색", "환우 커뮤니티", "복약 관리"], outOfScope: ["자료에 없는 예약 대행"] },
        functionalRequirements: [
          { title: "명의/병원 검색", description: "증상과 진료과 기준으로 명의와 병원을 탐색한다.", priority: "must" },
          { title: "환우 커뮤니티", description: "환우가 치료 경험을 공유하고 보호자가 확인한다.", priority: "must" },
          { title: "복약 관리", description: "치료 여정에서 복약 일정을 기록한다.", priority: "should" },
        ],
        nonFunctionalRequirements: ["모바일 접근성"],
        schemas: [],
        apis: [],
        layouts: [],
        architecture: { overview: "서버 권위형 웹서비스", components: [], techStack: [], infrastructure: [], integrations: [], dataFlow: [] },
        risks: [],
        assumptions: [],
      },
    };
    const originalRunGet = harness.ctx.agents.runs.get;
    harness.ctx.agents.runs.get = (async (runId, companyId, agentId) => {
      if (runId !== invokedRunId) return originalRunGet(runId, companyId, agentId);
      const now = new Date().toISOString();
      return {
        id: runId,
        companyId,
        agentId: agentId ?? "66666666-6666-4666-8666-666666666666",
        status: "succeeded",
        invocationSource: "automation",
        triggerDetail: "system",
        startedAt: now,
        finishedAt: now,
        createdAt: now,
        updatedAt: now,
        error: null,
        errorCode: null,
        usageJson: null,
        resultJson: {
          stdout: JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: JSON.stringify(finalPayload) } }),
        },
        stdoutExcerpt: null,
        stderrExcerpt: null,
      };
    }) as typeof harness.ctx.agents.runs.get;

    const done = await harness.getData<any>(BLUEPRINT_DATA.overview, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
    });
    expect(done.state.job).toBeNull();
    expect(done.state.prd?.projectTitle).toBe("AIGA 의료정보 플랫폼");
    const renderedDocs = Object.values(renderPrdDocuments(done.state.prd)).join("\n\n---\n\n");
    expect(renderedDocs).toContain("명의/병원 검색");
    expect(renderedDocs).toContain("환우 커뮤니티");
    expect(renderedDocs).toContain("복약 관리");
    expect(renderedDocs).not.toContain("notion_shared_page");
    expect(renderedDocs).not.toContain("fetch_status");
    expect(renderedDocs).not.toContain("노션 공유페이지");
    const prdSlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.prd", COMPANY_ID);
    expect(prdSlot?.slot.status).toBe("draft");
    expect(prdSlot?.document?.body).toContain("AIGA 의료정보 플랫폼");
  });

  it("imports PM Agent final JSON payloads from process-loss retry runs", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    seedCompanyProjects(harness);
    await builderPlugin.definition.setup(harness.ctx);

    await harness.performAction<any>(BLUEPRINT_ACTION.registerSourceDocument, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      title: "AIGA 노션 자료",
      type: "external-plan",
      body: "AIGA 의료정보 플랫폼: 명의 검색, AI 챗봇, 커뮤니티",
      format: "notion",
      intakeWorkflow: "notion_shared_page",
    });

    let invokedRunId = "";
    const originalInvoke = harness.ctx.agents.invoke;
    harness.ctx.agents.invoke = (async (...args: Parameters<typeof harness.ctx.agents.invoke>) => {
      const result = await originalInvoke(...args);
      invokedRunId = result.runId;
      return result;
    }) as typeof harness.ctx.agents.invoke;

    await harness.performAction<any>(BLUEPRINT_ACTION.runPrd, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
      title: "AIGA",
    });
    expect(invokedRunId).toBeTruthy();

    const retryRunId = "77777777-7777-4777-8777-777777777777";
    const finalPayload = {
      projectId: PROJECT_ID,
      prd: {
        projectTitle: "AIGA 재시도 브리프",
        overview: "명의 검색, AI 상담, 커뮤니티를 제공한다.",
        goals: ["정식 서비스 기준선 확정"],
        scope: { inScope: ["명의 검색", "AI 상담", "커뮤니티"], outOfScope: ["자료에 없는 예약 대행"] },
        functionalRequirements: [
          { title: "명의 검색", description: "사용자는 진료과와 증상으로 명의를 탐색한다.", priority: "must" },
          { title: "AI 상담", description: "사용자는 기존 AI 서버 기반 상담을 이용한다.", priority: "must" },
          { title: "커뮤니티", description: "사용자는 환우 경험을 공유한다.", priority: "should" },
        ],
        nonFunctionalRequirements: ["모바일 접근성"],
        schemas: [],
        apis: [],
        layouts: [],
        architecture: { overview: "서버 권위형 웹서비스", components: [], techStack: [], infrastructure: [], integrations: [], dataFlow: [] },
        risks: [],
        assumptions: [],
      },
    };
    const originalRunGet = harness.ctx.agents.runs.get;
    harness.ctx.agents.runs.get = (async (runId, companyId, agentId) => {
      const now = new Date().toISOString();
      if (runId === invokedRunId) {
        return {
          id: runId,
          companyId,
          agentId: agentId ?? "66666666-6666-4666-8666-666666666666",
          retryRunId,
          status: "failed",
          invocationSource: "automation",
          triggerDetail: "system",
          startedAt: now,
          finishedAt: now,
          createdAt: now,
          updatedAt: now,
          error: "Process lost -- child pid 1234 is no longer running; retrying once",
          errorCode: "process_lost",
          usageJson: null,
          resultJson: null,
          stdoutExcerpt: null,
          stderrExcerpt: null,
        };
      }
      if (runId === retryRunId) {
        return {
          id: runId,
          companyId,
          agentId: agentId ?? "66666666-6666-4666-8666-666666666666",
          retryOfRunId: invokedRunId,
          status: "succeeded",
          invocationSource: "automation",
          triggerDetail: "system",
          startedAt: now,
          finishedAt: now,
          createdAt: now,
          updatedAt: now,
          error: null,
          errorCode: null,
          usageJson: null,
          resultJson: {
            stdout: JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: JSON.stringify(finalPayload) } }),
          },
          stdoutExcerpt: null,
          stderrExcerpt: null,
        };
      }
      return originalRunGet(runId, companyId, agentId);
    }) as typeof harness.ctx.agents.runs.get;

    const done = await harness.getData<any>(BLUEPRINT_DATA.overview, {
      companyId: COMPANY_ID,
      projectId: PROJECT_ID,
    });
    expect(done.state.job).toBeNull();
    expect(done.state.prd?.projectTitle).toBe("AIGA 재시도 브리프");
    expect(done.state.prd?.functionalRequirements.map((item: any) => item.title)).toEqual([
      "명의 검색",
      "AI 상담",
      "커뮤니티",
    ]);
    const prdSlot = await harness.ctx.projects.documentSlots.content(PROJECT_ID, "deliverable.prd", COMPANY_ID);
    expect(prdSlot?.document?.body).toContain("AIGA 재시도 브리프");
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
    const prompt = buildScreenPrompt({ prd: plan, sources: [] });
    // 계약 "본문"이 들어있어야 한다(코드만 X).
    expect(prompt).toContain("nickname");
    expect(prompt).toContain("2~10자");
    expect(prompt).toContain("GET /api/search");
    expect(prompt).toContain("429(한도 초과)");
    expect(prompt).toContain("targetSurface");
    expect(prompt).toContain("layoutCode/layoutSlot");
    expect(prompt).toContain("별도 산출물로 만들지 않는다");
    expect(prompt).not.toContain("## 확정 산출물 — 공통 레이아웃 정의서");
    expect(prompt).not.toContain("하단 탭바");
    expect(prompt).not.toContain("홈·명의찾기·커뮤니티 탭 전환");
    // 도구 호출/추가요청 금지 가드.
    expect(prompt).toMatch(/도구.*호출하지 말고|추가 자료를 요청하지/);
  });

  it("renders feature and screen definition outputs by Product Builder surface", () => {
    const plan: any = {
      projectTitle: "Surface 구분 프로젝트",
      overview: "관리자와 사용자가 분리된 서비스",
      goals: ["관리자와 사용자 기능을 분리해 구현한다."],
      scope: { inScope: ["관리자 회원 관리", "사용자 검색", "마이페이지", "랜딩"], outOfScope: ["자료에 없는 기능"] },
      functionalRequirements: [
        { code: "FR-001", title: "관리자 회원 관리", description: "관리자가 회원을 검색하고 상태를 변경한다.", priority: "must", targetSurfaces: ["admin"] },
        { code: "FR-002", title: "명의 검색", description: "방문자가 공개 사이트에서 명의를 검색한다.", priority: "must", targetSurfaces: ["site"] },
        { code: "FR-003", title: "마이페이지", description: "로그인 사용자가 본인 정보를 확인한다.", priority: "should", targetSurfaces: ["app"] },
        { code: "FR-004", title: "랜딩 CTA", description: "비회원 방문자가 랜딩에서 가입 CTA를 확인한다.", priority: "could", targetSurfaces: ["landing"] },
      ],
      nonFunctionalRequirements: [],
      schemas: [],
      apis: [],
      layouts: [],
      architecture: { overview: "", diagram: "flowchart TB\n  A-->B", components: [], techStack: [], infrastructure: [], integrations: [], dataFlow: [] },
      risks: [],
      assumptions: [],
      generatedAt: "2026-06-26T00:00:00.000Z",
      confirmedAt: null,
    };

    const featureDocs = renderPrdDocuments(plan, null, [], PROJECT_ID);
    const featureIndex = featureDocs[`etl/projects/${PROJECT_ID}/transform/blueprint/feature-definition.md`];
    expect(featureIndex).toContain("## 관리자(admin)\n--------------");
    expect(featureIndex).toContain("## 웹서비스(site)\n--------------");
    expect(featureIndex).toContain("## 앱(app)\n--------------");
    expect(featureIndex).toContain("## 랜딩(landing)\n--------------");
    expect(featureIndex).toContain("**영역 설명:** 관리자와 운영자가 사용하는 백오피스 영역이다.");
    expect(featureIndex).toContain("**이 구획의 산출물:** 기능정의서(Feature Definition)");
    expect(featureIndex).toMatch(/## 관리자\(admin\)[\s\S]*관리자 회원 관리/);
    expect(featureIndex).toMatch(/## 웹서비스\(site\)[\s\S]*명의 검색/);
    expect(featureIndex).toMatch(/## 앱\(app\)[\s\S]*마이페이지/);
    expect(featureIndex).toMatch(/## 랜딩\(landing\)[\s\S]*랜딩 CTA/);
    expect(Object.keys(featureDocs)).toEqual(expect.arrayContaining([
      expect.stringContaining(`/features/admin/`),
      expect.stringContaining(`/features/site/`),
      expect.stringContaining(`/features/app/`),
      expect.stringContaining(`/features/landing/`),
    ]));
    const adminFeatureDoc = Object.entries(featureDocs).find(([path]) => path.includes("/features/admin/"))?.[1];
    expect(adminFeatureDoc).toContain("## 관리자(admin)\n--------------");
    expect(adminFeatureDoc).toContain("**영역 설명:** 관리자와 운영자가 사용하는 백오피스 영역이다.");
    expect(adminFeatureDoc).toContain("**이 구획의 산출물:** 기능정의서 상세(Feature Detail)");

    const screenPlan: any = {
      screens: [
        surfaceScreen("SCR-001", "관리자 회원 목록", "/admin/users", "admin", "admin"),
        surfaceScreen("SCR-002", "명의 검색", "/doctors", "public", "site"),
        surfaceScreen("SCR-003", "마이페이지", "/app/me", "authenticated", "app"),
        surfaceScreen("SCR-004", "랜딩", "/landing", "public", "landing"),
      ],
      generatedAt: "2026-06-26T00:00:00.000Z",
      confirmedAt: null,
    };
    const screenDocs = renderScreenDocuments(screenPlan, "Surface 구분 프로젝트", PROJECT_ID);
    const screenIndex = screenDocs[`etl/projects/${PROJECT_ID}/transform/blueprint/screens/screen-definition-index.md`];
    expect(screenIndex).toContain("## 관리자(admin)\n--------------");
    expect(screenIndex).toContain("## 웹서비스(site)\n--------------");
    expect(screenIndex).toContain("## 앱(app)\n--------------");
    expect(screenIndex).toContain("## 랜딩(landing)\n--------------");
    expect(screenIndex).toContain("**영역 설명:** 브라우저에서 접근하는 공개/사용자 웹서비스 영역이다.");
    expect(screenIndex).toContain("**이 구획의 산출물:** 화면정의서(Screen Definition)");
    expect(screenIndex).toMatch(/## 관리자\(admin\)[\s\S]*관리자 회원 목록/);
    expect(screenIndex).toMatch(/## 웹서비스\(site\)[\s\S]*명의 검색/);
    expect(screenIndex).toMatch(/## 앱\(app\)[\s\S]*마이페이지/);
    expect(screenIndex).toMatch(/## 랜딩\(landing\)[\s\S]*랜딩/);
    expect(Object.keys(screenDocs)).toEqual(expect.arrayContaining([
      expect.stringContaining(`/screens/admin/`),
      expect.stringContaining(`/screens/site/`),
      expect.stringContaining(`/screens/app/`),
      expect.stringContaining(`/screens/landing/`),
    ]));
    const siteScreenDoc = Object.entries(screenDocs).find(([path]) => path.includes("/screens/site/"))?.[1];
    expect(siteScreenDoc).toContain("## 웹서비스(site)\n--------------");
    expect(siteScreenDoc).toContain("**영역 설명:** 브라우저에서 접근하는 공개/사용자 웹서비스 영역이다.");
    expect(siteScreenDoc).toContain("**이 구획의 산출물:** 화면정의서 상세(Screen Detail)");
    expect(Object.values(screenDocs).join("\n")).toContain("대상 surface(Target Surface)");
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

    // 화면정의서 ready + screenCount metadata, 개발 요구사항 브리프 approved
    await harness.ctx.projects.documentSlots.import(PROJECT_ID, "deliverable.screen_definitions" as any, {
      title: "화면정의서(Screen Definitions)",
      format: "markdown",
      body: "# 화면정의서\n\n## SCR-001 상품 목록\n둘러보기 화면",
      status: "ready",
      contentType: "text/markdown",
      metadata: { plugin: "paperclip-plugin-builder", screenCount: 3 },
    }, COMPANY_ID);
    await harness.ctx.projects.documentSlots.import(PROJECT_ID, "deliverable.prd" as any, {
      title: "개발 요구사항 브리프(Development Requirements Brief)",
      format: "markdown",
      body: "# 개발 요구사항 브리프\n\n실행 기준선",
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

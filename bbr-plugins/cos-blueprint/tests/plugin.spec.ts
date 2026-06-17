import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createTestHarness } from "@paperclipai/plugin-sdk/testing";
import {
  ACTION,
  DATA,
  STATE_KEY,
  buildFallbackAnalysis,
  renderProjectDocuments,
  type BlueprintAnalysis,
  type CosBlueprintOverview,
  type ProjectDocumentUpdateResult,
  type SourceMaterial,
} from "../src/contract.js";
import manifest from "../src/manifest.js";
import plugin from "../src/worker.js";

const COMPANY_ID = "96fcd977-1d55-4697-a464-abb656dd57c2";
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";

describe("COS Blueprint plugin", () => {
  it("declares the BBR plugin UI and minimal capabilities", () => {
    expect(manifest.id).toBe("paperclip-plugin-cos-blueprint");
    expect(manifest.displayName).toBe("COS Blueprint");
    expect(manifest.capabilities).toEqual(expect.arrayContaining([
      "companies.read",
      "projects.read",
      "project.workspaces.read",
      "plugin.state.read",
      "plugin.state.write",
      "activity.log.write",
      "ui.page.register",
      "ui.sidebar.register",
    ]));
    expect(manifest.ui?.slots?.map((slot) => slot.id)).toEqual([
      "cos-blueprint-page",
      "cos-blueprint-sidebar",
    ]);
  });

  it("keeps action codes and test ids aligned in fallback analysis", () => {
    const analysis = buildFallbackAnalysis({
      title: "고객 포털",
      now: "2026-06-17T00:00:00.000Z",
      sources: [{
        id: "src-1",
        title: "요구사항",
        type: "internal-plan",
        body: "관리자와 파일 업로드가 필요하다.",
        createdAt: "2026-06-17T00:00:00.000Z",
      }],
    });

    expect(analysis.layouts[0]?.code).toBe("COS-LAY-001");
    expect(analysis.screens.length).toBeGreaterThanOrEqual(3);
    for (const screen of analysis.screens) {
      expect(screen.code).toMatch(/^COS-SCR-\d{3}$/);
      expect(screen.primaryTestId).toBe(screen.code.toLowerCase());
      for (const item of screen.actions) {
        expect(item.code).toMatch(/^ACT-\d{2}$/);
        expect(item.testId).toBe(`${screen.code.toLowerCase()}-${item.code.toLowerCase()}`);
      }
      for (const item of screen.acceptanceCriteria) {
        expect(item.code).toMatch(/^AC-\d{2}$/);
        expect(item.testId).toBe(`${screen.code.toLowerCase()}-${item.code.toLowerCase()}`);
      }
    }
  });

  it("renders standard project documents and one file per screen", () => {
    const analysis = buildFallbackAnalysis({
      title: "COS 샘플",
      now: "2026-06-17T00:00:00.000Z",
      sources: [{
        id: "src-1",
        title: "요구사항",
        type: "external-plan",
        body: "기획 자료 등록과 분석이 필요하다.",
        createdAt: "2026-06-17T00:00:00.000Z",
      }],
    });
    const docs = renderProjectDocuments(analysis);
    const screenDocs = Object.keys(docs).filter((file) => file.startsWith("docs/cos-blueprint/screens/"));

    expect(docs["docs/cos-blueprint/standard-plan.md"]).toContain("# 표준 기획서");
    expect(docs["docs/cos-blueprint/interface-definition.md"]).toContain("## API 인터페이스");
    expect(docs["docs/cos-blueprint/layout-definition.md"]).toContain("COS-LAY-001");
    expect(docs["docs/cos-blueprint/screen-definition-writing-rules.md"]).toContain("화면 1개는 화면정의서 1개");
    expect(screenDocs).toHaveLength(analysis.screens.length);
  });

  it("saves sources, runs analysis through mocked LLM, and updates project docs", async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "cos-blueprint-"));
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{
          type: "text",
          text: JSON.stringify({
            projectTitle: "LLM 산출 프로젝트",
            summary: "LLM 결과",
            assumptions: ["화면 1개당 문서 1개"],
            standardPlan: ["자료 등록", "분석", "문서 업데이트"],
            schemas: [{
              code: "SCH-101",
              name: "Brief",
              description: "브리프",
              fields: [{ name: "title", type: "string", required: true, description: "제목" }],
            }],
            apis: [{
              code: "API-101",
              method: "POST",
              path: "/api/briefs",
              summary: "브리프 생성",
              input: [{ name: "title", type: "string", required: true, description: "제목" }],
              output: [{ name: "id", type: "uuid", required: true, description: "ID" }],
              schemas: ["SCH-101"],
            }],
            layouts: [{
              code: "COS-LAY-101",
              name: "기본",
              description: "기본 레이아웃",
              slots: [{ code: "SLOT-MAIN", name: "본문", purpose: "본문" }],
            }],
            screens: [{
              code: "COS-SCR-101",
              name: "브리프 등록",
              description: "브리프 등록 화면",
              layoutCode: "COS-LAY-101",
              layoutSlot: "SLOT-MAIN",
              route: "/briefs/new",
              primaryTestId: "cos-scr-101",
              schemas: ["SCH-101"],
              apis: ["API-101"],
              fields: ["title"],
              actions: [{
                code: "ACT-01",
                testId: "cos-scr-101-act-01",
                trigger: "저장",
                description: "저장한다",
                apiCodes: ["API-101"],
              }],
              acceptanceCriteria: [{
                code: "AC-01",
                testId: "cos-scr-101-ac-01",
                description: "저장된다",
              }],
            }],
          }),
        }],
      }),
    } as unknown as Response);

    try {
      const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
      harness.seed({
        companies: [{ id: COMPANY_ID, name: "BBR", status: "active", issuePrefix: "BBR" } as any],
        projects: [{
          id: PROJECT_ID,
          companyId: COMPANY_ID,
          name: "COS",
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
          path: tmp,
          repoUrl: null,
          repoRef: null,
          defaultRef: null,
          isPrimary: true,
          createdAt: "2026-06-17T00:00:00.000Z",
          updatedAt: "2026-06-17T00:00:00.000Z",
        }],
      });
      await plugin.definition.setup(harness.ctx);

      const source = await harness.performAction<SourceMaterial>(ACTION.saveSource, {
        companyId: COMPANY_ID,
        title: "기획서",
        type: "internal-plan",
        body: "화면정의서 자동 생성",
      });
      expect(source.title).toBe("기획서");

      const analysis = await harness.performAction<BlueprintAnalysis>(ACTION.runAnalysis, {
        companyId: COMPANY_ID,
        title: "LLM 산출 프로젝트",
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(analysis.projectTitle).toBe("LLM 산출 프로젝트");
      expect(analysis.usedFallback).toBe(false);

      const result = await harness.performAction<ProjectDocumentUpdateResult>(ACTION.updateProjectDocuments, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
      });
      expect(result.ok).toBe(true);
      expect(result.files).toContain("docs/cos-blueprint/standard-plan.md");
      expect(result.files.some((file) => file.startsWith("docs/cos-blueprint/screens/cos-scr-101"))).toBe(true);
      expect(readFileSync(path.join(tmp, "docs/cos-blueprint/interface-definition.md"), "utf8")).toContain("API-101");

      const overview = await harness.getData<CosBlueprintOverview>(DATA.overview, { companyId: COMPANY_ID });
      expect(overview.state.sources).toHaveLength(1);
      expect(overview.state.analysis?.screens).toHaveLength(1);
      expect(harness.getState({ scopeKind: "company", scopeId: COMPANY_ID, stateKey: STATE_KEY })).toBeTruthy();
    } finally {
      fetchMock.mockRestore();
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

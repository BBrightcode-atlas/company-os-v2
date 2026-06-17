import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createTestHarness } from "@paperclipai/plugin-sdk/testing";
import {
  ACTION,
  DATA,
  SOURCE_DOC_DIR,
  STATE_KEY,
  buildFallbackAnalysis,
  renderProjectDocuments,
  renderSourceDocument,
  type BlueprintAnalysis,
  type CosBlueprintOverview,
  type ProjectDocumentUpdateResult,
  type SourceDocumentRegisterResult,
  type SourceMaterial,
} from "../src/contract.js";
import manifest from "../src/manifest.js";
import plugin from "../src/worker.js";
import { parseFile } from "../src/ui/parse.js";

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

  it("lists projects and registers a source document into the project workspace", async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "cos-blueprint-src-"));
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

      const projects = await harness.getData<Array<{ id: string; name: string; status: string }>>(
        DATA.projects,
        { companyId: COMPANY_ID },
      );
      expect(projects).toHaveLength(1);
      expect(projects[0]).toMatchObject({ id: PROJECT_ID, name: "COS" });

      const result = await harness.performAction<SourceDocumentRegisterResult>(ACTION.registerSourceDocument, {
        companyId: COMPANY_ID,
        projectId: PROJECT_ID,
        title: "고객 기획서.docx",
        type: "external-plan",
        body: "첫 줄\n둘째 줄",
        fileName: "고객 기획서.docx",
        format: "docx",
      });
      expect(result.ok).toBe(true);
      expect(result.file?.startsWith(`${SOURCE_DOC_DIR}/`)).toBe(true);

      const written = readFileSync(path.join(tmp, result.file as string), "utf8");
      expect(written).toContain("# 기획 자료 - 고객 기획서.docx");
      expect(written).toContain("외부 기획");
      expect(written).toContain("첫 줄");

      const overview = await harness.getData<CosBlueprintOverview>(DATA.overview, { companyId: COMPANY_ID });
      expect(overview.state.sources).toHaveLength(1);
      expect(overview.state.sources[0]?.format).toBe("docx");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("registers multiple files without losing documents on slug collision", async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "cos-blueprint-multi-"));
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

      const uploads = [
        { fileName: "기획서.docx", format: "docx", body: "기획서 본문" },
        { fileName: "요구사항.pptx", format: "pptx", body: "요구사항 본문" },
        { fileName: "plan.docx", format: "docx", body: "plan docx 본문" },
        { fileName: "plan.pptx", format: "pptx", body: "plan pptx 본문" },
      ];
      const files: string[] = [];
      for (const upload of uploads) {
        const result = await harness.performAction<SourceDocumentRegisterResult>(ACTION.registerSourceDocument, {
          companyId: COMPANY_ID,
          projectId: PROJECT_ID,
          title: upload.fileName,
          type: "external-plan",
          body: upload.body,
          fileName: upload.fileName,
          format: upload.format,
        });
        expect(result.ok).toBe(true);
        files.push(result.file as string);
      }

      expect(new Set(files).size).toBe(4);
      for (let i = 0; i < uploads.length; i += 1) {
        expect(readFileSync(path.join(tmp, files[i]), "utf8")).toContain(uploads[i].body);
      }

      const overview = await harness.getData<CosBlueprintOverview>(DATA.overview, { companyId: COMPANY_ID });
      expect(overview.state.sources).toHaveLength(4);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("registers a source without a project as state-only", async () => {
    const harness = createTestHarness({ manifest, capabilities: manifest.capabilities });
    harness.seed({
      companies: [{ id: COMPANY_ID, name: "BBR", status: "active", issuePrefix: "BBR" } as any],
    });
    await plugin.definition.setup(harness.ctx);

    const result = await harness.performAction<SourceDocumentRegisterResult>(ACTION.registerSourceDocument, {
      companyId: COMPANY_ID,
      title: "메모",
      type: "meeting-note",
      body: "직접 입력 본문",
    });
    expect(result.ok).toBe(false);
    expect(result.file).toBeNull();

    const overview = await harness.getData<CosBlueprintOverview>(DATA.overview, { companyId: COMPANY_ID });
    expect(overview.state.sources).toHaveLength(1);
  });

  it("renders a source document with body preserved", () => {
    const doc = renderSourceDocument({
      id: "s1",
      title: "기획",
      type: "internal-plan",
      body: "본문 1\n본문 2",
      createdAt: "2026-06-17T00:00:00.000Z",
      fileName: "plan.pptx",
      format: "pptx",
    });
    expect(doc).toContain("# 기획 자료 - 기획");
    expect(doc).toContain("plan.pptx");
    expect(doc).toContain("본문 1");
    expect(doc).toContain("본문 2");
  });

  it("escapes pipe characters in document metadata tables", () => {
    const doc = renderSourceDocument({
      id: "s1",
      title: "결제 | v2 | 긴급",
      type: "internal-plan",
      body: "본문",
      createdAt: "2026-06-17T00:00:00.000Z",
      fileName: "결제 | v2.docx",
      format: "docx",
    });
    expect(doc).toContain("\\|");
    // 이스케이프된 행은 헤더와 동일하게 2열 구조를 유지한다(파이프로 분해되지 않음).
    const metaRow = doc.split("\n").find((line) => line.includes("결제 \\| v2 \\| 긴급"));
    expect(metaRow).toBeTruthy();
  });

  it("does not overwrite screen docs when screen.code repeats", () => {
    const base = buildFallbackAnalysis({
      title: "중복 코드",
      now: "2026-06-17T00:00:00.000Z",
      sources: [{
        id: "src-1",
        title: "요구사항",
        type: "internal-plan",
        body: "관리자와 파일 업로드가 필요하다.",
        createdAt: "2026-06-17T00:00:00.000Z",
      }],
    });
    const dup: BlueprintAnalysis = {
      ...base,
      screens: base.screens.map((screen) => ({ ...screen, code: "COS-SCR-001", name: "동일 화면" })),
    };
    const docs = renderProjectDocuments(dup);
    const screenDocs = Object.keys(docs).filter((file) => file.startsWith("docs/cos-blueprint/screens/"));
    expect(screenDocs).toHaveLength(dup.screens.length);
    expect(new Set(screenDocs).size).toBe(dup.screens.length);
  });
});

describe("COS Blueprint file parsing", () => {
  async function zipToFile(files: Record<string, string>, name: string): Promise<File> {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const [filePath, contents] of Object.entries(files)) zip.file(filePath, contents);
    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    return new File([buffer], name);
  }

  it("reads txt and md natively", async () => {
    const txt = await parseFile(new File(["plain text"], "note.txt"));
    expect(txt).toMatchObject({ format: "txt", text: "plain text" });
    const md = await parseFile(new File(["# 제목\n본문"], "note.md"));
    expect(md.format).toBe("md");
    expect(md.text).toContain("# 제목");
  });

  it("extracts text from a docx (OOXML paragraphs to lines)", async () => {
    const docXml = "<w:document><w:body>"
      + "<w:p><w:r><w:t>첫 문단</w:t></w:r></w:p>"
      + "<w:p><w:r><w:t>둘째 문단</w:t></w:r></w:p>"
      + "</w:body></w:document>";
    const file = await zipToFile({ "word/document.xml": docXml }, "plan.docx");
    const parsed = await parseFile(file);
    expect(parsed.format).toBe("docx");
    expect(parsed.text).toBe("첫 문단\n둘째 문단");
  });

  it("extracts text from a pptx across ordered slides", async () => {
    const slide = (text: string) => `<p:sld><p:cSld><p:spTree><a:p><a:r><a:t>${text}</a:t></a:r></a:p></p:spTree></p:cSld></p:sld>`;
    const file = await zipToFile({
      "ppt/slides/slide1.xml": slide("표지"),
      "ppt/slides/slide2.xml": slide("개요"),
    }, "deck.pptx");
    const parsed = await parseFile(file);
    expect(parsed.format).toBe("pptx");
    expect(parsed.text).toContain("## Slide 1");
    expect(parsed.text).toContain("표지");
    expect(parsed.text.indexOf("표지")).toBeLessThan(parsed.text.indexOf("개요"));
  });

  it("rejects unsupported formats", async () => {
    await expect(parseFile(new File(["x"], "image.png"))).rejects.toThrow(/지원하지 않는/);
  });

  it("keeps tab-separated fields distinct in docx (w:tab not dropped)", async () => {
    const docXml = "<w:document><w:body>"
      + "<w:p><w:r><w:t>이름</w:t></w:r><w:tab/><w:r><w:t>홍길동</w:t></w:r></w:p>"
      + "</w:body></w:document>";
    const file = await zipToFile({ "word/document.xml": docXml }, "kv.docx");
    const parsed = await parseFile(file);
    expect(parsed.text).not.toContain("이름홍길동");
    expect(parsed.text).toContain("이름\t홍길동");
  });

  it("extracts docx header/footer text, not just the body", async () => {
    const file = await zipToFile({
      "word/document.xml": "<w:document><w:body><w:p><w:r><w:t>본문</w:t></w:r></w:p></w:body></w:document>",
      "word/header1.xml": "<w:hdr><w:p><w:r><w:t>머리글 정보</w:t></w:r></w:p></w:hdr>",
      "word/footer1.xml": "<w:ftr><w:p><w:r><w:t>바닥글 정보</w:t></w:r></w:p></w:ftr>",
    }, "withheader.docx");
    const parsed = await parseFile(file);
    expect(parsed.text).toContain("본문");
    expect(parsed.text).toContain("머리글 정보");
    expect(parsed.text).toContain("바닥글 정보");
  });

  it("extracts pptx speaker notes alongside the slide", async () => {
    const slide = "<p:sld><p:cSld><p:spTree><a:p><a:r><a:t>슬라이드 본문</a:t></a:r></a:p></p:spTree></p:cSld></p:sld>";
    const notes = "<p:notes><p:cSld><p:spTree><a:p><a:r><a:t>발표자 노트</a:t></a:r></a:p></p:spTree></p:cSld></p:notes>";
    const file = await zipToFile({
      "ppt/slides/slide1.xml": slide,
      "ppt/notesSlides/notesSlide1.xml": notes,
    }, "withnotes.pptx");
    const parsed = await parseFile(file);
    expect(parsed.text).toContain("슬라이드 본문");
    expect(parsed.text).toContain("### Notes");
    expect(parsed.text).toContain("발표자 노트");
  });
});

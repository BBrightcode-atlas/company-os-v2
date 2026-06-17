import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import {
  ACTION,
  DATA,
  PLUGIN_ID,
  PLUGIN_VERSION,
  SOURCE_TYPES,
  STATE_KEY,
  buildAnalysisPrompt,
  buildFallbackAnalysis,
  buildOverview,
  emptyState,
  isAllowedCompany,
  normalizeAnalysisJson,
  renderProjectDocuments,
  type BlueprintAnalysis,
  type CosBlueprintState,
  type ProjectDocumentUpdateResult,
  type SourceMaterial,
  type SourceType,
} from "./contract.js";

type AnyCtx = Parameters<NonNullable<Parameters<typeof definePlugin>[0]["setup"]>>[0];

const LLM_BASE = (process.env.ANTHROPIC_BASE_URL || "http://localhost:8317").replace(/\/+$/, "");
const LLM_KEY = process.env.ANTHROPIC_API_KEY || "no-key-required";
const LLM_MODEL = process.env.COS_BLUEPRINT_MODEL || "claude-opus-4-8";

const SYSTEM_GUARD = [
  "너는 COS Blueprint 산출물을 JSON 으로만 출력하는 순수 함수다.",
  "너에게는 파일시스템, 도구, 웹, AGENTS.md 가 없다.",
  "모든 근거는 user 메시지 안의 기획 자료뿐이다.",
  "출력은 유효한 JSON 객체 하나뿐이다. 첫 글자 '{', 마지막 글자 '}'.",
  "서론, 설명, 마크다운, 코드펜스, 도구 호출은 금지한다.",
].join("\n");

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function companyIdFromParams(params: Record<string, unknown>): string {
  const companyId = stringValue(params.companyId);
  if (!companyId) throw new Error("companyId is required");
  if (!isAllowedCompany(companyId)) throw new Error("COS Blueprint is only available for the BBR company");
  return companyId;
}

function sourceType(value: unknown): SourceType {
  return SOURCE_TYPES.includes(value as SourceType) ? value as SourceType : "other";
}

async function readState(ctx: AnyCtx, companyId: string): Promise<CosBlueprintState> {
  const value = await ctx.state.get({ scopeKind: "company", scopeId: companyId, stateKey: STATE_KEY });
  const state = value && typeof value === "object" ? value as Partial<CosBlueprintState> : {};
  return {
    sources: Array.isArray(state.sources) ? state.sources : [],
    analysis: state.analysis ?? null,
    updatedAt: state.updatedAt ?? null,
  };
}

async function writeState(ctx: AnyCtx, companyId: string, state: CosBlueprintState): Promise<void> {
  await ctx.state.set({ scopeKind: "company", scopeId: companyId, stateKey: STATE_KEY }, {
    ...state,
    updatedAt: new Date().toISOString(),
  });
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return JSON.parse(trimmed);
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
  throw new Error("LLM response did not contain a JSON object");
}

async function callBlueprintLlm(prompt: string): Promise<string> {
  const res = await fetch(`${LLM_BASE}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": LLM_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: 16000,
      system: SYSTEM_GUARD,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`COS Blueprint LLM call failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json() as { content?: Array<{ type: string; text?: string }> };
  const text = (data.content ?? [])
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text as string)
    .join("");
  if (!text.trim()) throw new Error("COS Blueprint LLM response is empty");
  return text;
}

async function runAnalysis(input: { title?: string; sources: SourceMaterial[] }): Promise<BlueprintAnalysis> {
  const fallback = buildFallbackAnalysis({ title: input.title, sources: input.sources, model: LLM_MODEL });
  if (process.env.COS_BLUEPRINT_DISABLE_LLM === "true") return fallback;

  try {
    const prompt = buildAnalysisPrompt(input);
    const text = await callBlueprintLlm(prompt);
    return {
      ...normalizeAnalysisJson(extractJsonObject(text), fallback),
      llmModel: LLM_MODEL,
    };
  } catch (error) {
    return {
      ...fallback,
      summary: `${fallback.summary}\n\nLLM 분석 호출에 실패해 deterministic fallback 산출물을 생성했다: ${error instanceof Error ? error.message : String(error)}`,
      usedFallback: true,
    };
  }
}

function assertInside(root: string, target: string): void {
  const rootResolved = path.resolve(root);
  const targetResolved = path.resolve(target);
  const rel = path.relative(rootResolved, targetResolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Refusing to write outside workspace: ${target}`);
  }
}

function writeDocsToWorkspace(workspacePath: string, docs: Record<string, string>): string[] {
  const written: string[] = [];
  for (const [relativePath, contents] of Object.entries(docs)) {
    const filePath = path.resolve(workspacePath, relativePath);
    assertInside(workspacePath, filePath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, `${contents.trimEnd()}\n`, "utf8");
    written.push(relativePath);
  }
  return written;
}

const plugin = definePlugin({
  async setup(ctx) {
    ctx.data.register(DATA.overview, async (params) => {
      const companyId = stringValue(params.companyId);
      const state = companyId ? await readState(ctx, companyId) : emptyState();
      return buildOverview(state);
    });

    ctx.actions.register(ACTION.saveSource, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const title = stringValue(record.title);
      const body = stringValue(record.body);
      if (!title) throw new Error("title is required");
      if (!body) throw new Error("body is required");

      const state = await readState(ctx, companyId);
      const source: SourceMaterial = {
        id: randomUUID(),
        title,
        type: sourceType(record.type),
        body,
        createdAt: new Date().toISOString(),
      };
      await writeState(ctx, companyId, {
        ...state,
        sources: [source, ...state.sources],
      });
      await ctx.activity.log({
        companyId,
        message: `COS Blueprint source saved: ${title}`,
        entityType: "plugin",
        entityId: PLUGIN_ID,
        metadata: { sourceId: source.id, type: source.type },
      });
      return source;
    });

    ctx.actions.register(ACTION.runAnalysis, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const state = await readState(ctx, companyId);
      if (state.sources.length === 0) throw new Error("at least one source material is required");

      const analysis = await runAnalysis({
        title: stringValue(record.title),
        sources: state.sources,
      });
      await writeState(ctx, companyId, { ...state, analysis });
      await ctx.activity.log({
        companyId,
        message: `COS Blueprint analysis generated for ${analysis.projectTitle}`,
        entityType: "plugin",
        entityId: PLUGIN_ID,
        metadata: {
          schemaCount: analysis.schemas.length,
          apiCount: analysis.apis.length,
          layoutCount: analysis.layouts.length,
          screenCount: analysis.screens.length,
          usedFallback: analysis.usedFallback === true,
        },
      });
      return analysis;
    });

    ctx.actions.register(ACTION.updateProjectDocuments, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      const state = await readState(ctx, companyId);
      if (!state.analysis) throw new Error("analysis is required before updating project documents");

      const docs = renderProjectDocuments(state.analysis);
      if (!projectId) {
        return {
          ok: false,
          projectId: null,
          workspacePath: null,
          files: Object.keys(docs),
          message: "projectId가 없어 문서 미리보기 목록만 반환했습니다.",
        } satisfies ProjectDocumentUpdateResult;
      }

      const workspace = await ctx.projects.getPrimaryWorkspace(projectId, companyId);
      if (!workspace?.path) {
        return {
          ok: false,
          projectId,
          workspacePath: null,
          files: Object.keys(docs),
          message: "프로젝트 primary workspace가 없어 문서 미리보기 목록만 반환했습니다.",
        } satisfies ProjectDocumentUpdateResult;
      }

      const files = writeDocsToWorkspace(workspace.path, docs);
      await ctx.activity.log({
        companyId,
        message: `COS Blueprint wrote ${files.length} project documents`,
        entityType: "project",
        entityId: projectId,
        metadata: { plugin: PLUGIN_ID, files },
      });
      return {
        ok: true,
        projectId,
        workspacePath: workspace.path,
        files,
        message: `${files.length}개 문서를 프로젝트 워크스페이스에 업데이트했습니다.`,
      } satisfies ProjectDocumentUpdateResult;
    });

    ctx.actions.register(ACTION.reset, async (params) => {
      const companyId = companyIdFromParams(asRecord(params));
      await writeState(ctx, companyId, emptyState());
      await ctx.activity.log({
        companyId,
        message: "COS Blueprint state reset",
        entityType: "plugin",
        entityId: PLUGIN_ID,
      });
      return { ok: true };
    });
  },

  async onHealth() {
    return {
      status: "ok",
      message: "COS Blueprint plugin worker is running",
      details: {
        pluginId: PLUGIN_ID,
        version: PLUGIN_VERSION,
        model: LLM_MODEL,
      },
    };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);

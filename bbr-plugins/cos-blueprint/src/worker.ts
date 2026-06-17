import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import {
  ACTION,
  DATA,
  PLUGIN_ID,
  PLUGIN_VERSION,
  SOURCE_FORMATS,
  SOURCE_TYPES,
  STATE_KEY,
  buildFallbackStandardPlan,
  buildOverview,
  buildStandardPlanPrompt,
  emptyState,
  isAllowedCompany,
  normalizeStandardPlanJson,
  renderSourceDocument,
  renderStandardPlanDocuments,
  sourceDocPath,
  type CosBlueprintState,
  type ProjectDocumentUpdateResult,
  type ProjectSummary,
  type SourceDocumentRegisterResult,
  type SourceFormat,
  type SourceMaterial,
  type SourceType,
  type StandardPlan,
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

function sourceFormat(value: unknown): SourceFormat {
  return SOURCE_FORMATS.includes(value as SourceFormat) ? value as SourceFormat : "text";
}

async function readState(ctx: AnyCtx, companyId: string): Promise<CosBlueprintState> {
  const value = await ctx.state.get({ scopeKind: "company", scopeId: companyId, stateKey: STATE_KEY });
  const state = value && typeof value === "object" ? value as Partial<CosBlueprintState> : {};
  // 레거시 `analysis` 키는 무시하고 sources만 승계한다(스키마 마이그레이션).
  return {
    sources: Array.isArray(state.sources) ? state.sources : [],
    standardPlan: state.standardPlan ?? null,
    screenPlan: state.screenPlan ?? null,
    updatedAt: state.updatedAt ?? null,
  };
}

async function writeState(ctx: AnyCtx, companyId: string, state: CosBlueprintState): Promise<void> {
  await ctx.state.set({ scopeKind: "company", scopeId: companyId, stateKey: STATE_KEY }, {
    ...state,
    updatedAt: new Date().toISOString(),
  });
}

// ctx.state는 CAS/트랜잭션이 없는 단일 KV다. 같은 회사에서 register/save/run/reset가 동시에
// read-modify-write 하면 마지막 writeState만 남아 source/analysis가 유실된다.
// worker 프로세스 내 companyId별 직렬화 큐로 read→write 한 단위를 보호한다.
const stateLocks = new Map<string, Promise<unknown>>();
function withStateLock<T>(companyId: string, fn: () => Promise<T>): Promise<T> {
  const prev = stateLocks.get(companyId) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  stateLocks.set(companyId, next.then(() => undefined, () => undefined));
  return next;
}

// 핵심 부수효과(state/문서 쓰기) 완료 후의 감사 로그 실패가 액션 전체를 reject 시켜
// 클라이언트 재시도→중복 등록을 유발하지 않도록 best-effort로 처리한다.
async function safeLog(ctx: AnyCtx, entry: Parameters<AnyCtx["activity"]["log"]>[0]): Promise<void> {
  try {
    await ctx.activity.log(entry);
  } catch (error) {
    ctx.logger?.info?.(`COS Blueprint activity.log failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return JSON.parse(trimmed);
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
  throw new Error("LLM response did not contain a JSON object");
}

async function callBlueprintLlm(prompt: string, maxTokens = 16000): Promise<string> {
  const res = await fetch(`${LLM_BASE}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": LLM_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: maxTokens,
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

// 분석 ①단계: 표준 기획서 생성. screens 미포함이라 max_tokens는 작게.
async function generateStandardPlan(input: { title?: string; sources: SourceMaterial[] }): Promise<StandardPlan> {
  const fallback = buildFallbackStandardPlan({ title: input.title, sources: input.sources, model: LLM_MODEL });
  if (process.env.COS_BLUEPRINT_DISABLE_LLM === "true") return fallback;

  try {
    const prompt = buildStandardPlanPrompt(input);
    const text = await callBlueprintLlm(prompt, 8000);
    return {
      ...normalizeStandardPlanJson(extractJsonObject(text), fallback),
      llmModel: LLM_MODEL,
    };
  } catch (error) {
    return {
      ...fallback,
      overview: `${fallback.overview}\n\nLLM 호출에 실패해 deterministic fallback 표준 기획서를 생성했다: ${error instanceof Error ? error.message : String(error)}`,
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

    ctx.data.register(DATA.projects, async (params) => {
      const companyId = stringValue(params.companyId);
      if (!companyId || !isAllowedCompany(companyId)) return [] as ProjectSummary[];
      // archived 제외 후에도 누락이 없도록 limit에 도달하면 다음 페이지를 계속 받는다.
      const pageSize = 200;
      const summaries: ProjectSummary[] = [];
      for (let offset = 0; offset < 5000; offset += pageSize) {
        const page = await ctx.projects.list({ companyId, limit: pageSize, offset });
        for (const project of page) {
          if (project.archivedAt) continue;
          summaries.push({
            id: project.id,
            name: project.name,
            status: String(project.status ?? ""),
          });
        }
        if (page.length < pageSize) break;
      }
      return summaries;
    });

    ctx.actions.register(ACTION.saveSource, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const title = stringValue(record.title);
      const body = stringValue(record.body);
      if (!title) throw new Error("title is required");
      if (!body) throw new Error("body is required");

      const source: SourceMaterial = {
        id: randomUUID(),
        title,
        type: sourceType(record.type),
        body,
        createdAt: new Date().toISOString(),
      };
      await withStateLock(companyId, async () => {
        const state = await readState(ctx, companyId);
        await writeState(ctx, companyId, { ...state, sources: [source, ...state.sources] });
      });
      await safeLog(ctx, {
        companyId,
        message: `COS Blueprint source saved: ${title}`,
        entityType: "plugin",
        entityId: PLUGIN_ID,
        metadata: { sourceId: source.id, type: source.type },
      });
      return source;
    });

    ctx.actions.register(ACTION.registerSourceDocument, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const title = stringValue(record.title);
      const body = stringValue(record.body);
      if (!title) throw new Error("title is required");
      if (!body) throw new Error("body is required");
      const projectId = stringValue(record.projectId);

      const source: SourceMaterial = {
        id: randomUUID(),
        title,
        type: sourceType(record.type),
        body,
        createdAt: new Date().toISOString(),
        fileName: stringValue(record.fileName),
        format: sourceFormat(record.format),
      };

      // 회사 state RMW + 문서 쓰기를 한 단위로 직렬화한다.
      // 문서 쓰기를 state 저장보다 먼저 수행 → 쓰기 실패 시 state에 orphan source가 남지 않아
      // 클라이언트 재시도가 깨끗하게 동작한다(부분 저장 불일치 제거).
      const result = await withStateLock(companyId, async (): Promise<SourceDocumentRegisterResult> => {
        const appendSource = async () => {
          const state = await readState(ctx, companyId);
          await writeState(ctx, companyId, { ...state, sources: [source, ...state.sources] });
        };

        if (!projectId) {
          await appendSource();
          return {
            ok: false,
            source,
            projectId: null,
            workspacePath: null,
            file: null,
            message: "프로젝트를 선택하지 않아 자료만 저장하고 문서는 기록하지 않았습니다.",
          };
        }

        const workspace = await ctx.projects.getPrimaryWorkspace(projectId, companyId);
        if (!workspace?.path) {
          await appendSource();
          return {
            ok: false,
            source,
            projectId,
            workspacePath: null,
            file: null,
            message: "프로젝트 primary workspace가 없어 자료만 저장했습니다.",
          };
        }

        const [file] = writeDocsToWorkspace(workspace.path, { [sourceDocPath(source)]: renderSourceDocument(source) });
        await appendSource();
        return {
          ok: true,
          source,
          projectId,
          workspacePath: workspace.path,
          file,
          message: `기획 자료를 프로젝트 문서(${file})에 등록했습니다.`,
        };
      });

      await safeLog(ctx, result.ok
        ? {
          companyId,
          message: `COS Blueprint registered source document: ${result.file}`,
          entityType: "project",
          entityId: projectId as string,
          metadata: { plugin: PLUGIN_ID, sourceId: source.id, file: result.file, format: source.format },
        }
        : {
          companyId,
          message: `COS Blueprint source registered (no document): ${title}`,
          entityType: "plugin",
          entityId: PLUGIN_ID,
          metadata: { sourceId: source.id, type: source.type, format: source.format },
        });

      return result;
    });

    ctx.actions.register(ACTION.runStandardPlan, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const initial = await readState(ctx, companyId);
      if (initial.sources.length === 0) throw new Error("at least one source material is required");

      // LLM 호출은 느리므로 락 밖에서 수행. 결과 반영은 락 안 fresh 재읽기로 standardPlan만 패치.
      const standardPlan = await generateStandardPlan({
        title: stringValue(record.title),
        sources: initial.sources,
      });
      await withStateLock(companyId, async () => {
        const fresh = await readState(ctx, companyId);
        // 표준 기획서가 바뀌면 기존 화면정의서는 stale → 무효화.
        await writeState(ctx, companyId, { ...fresh, standardPlan, screenPlan: null });
      });
      await safeLog(ctx, {
        companyId,
        message: `COS Blueprint standard plan generated for ${standardPlan.projectTitle}`,
        entityType: "plugin",
        entityId: PLUGIN_ID,
        metadata: {
          schemaCount: standardPlan.schemas.length,
          apiCount: standardPlan.apis.length,
          layoutCount: standardPlan.layouts.length,
          frCount: standardPlan.functionalRequirements.length,
          usedFallback: standardPlan.usedFallback === true,
        },
      });
      return standardPlan;
    });

    ctx.actions.register(ACTION.confirmStandardPlan, async (params) => {
      const companyId = companyIdFromParams(asRecord(params));
      const confirmed = await withStateLock(companyId, async (): Promise<StandardPlan> => {
        const fresh = await readState(ctx, companyId);
        if (!fresh.standardPlan) throw new Error("표준 기획서를 먼저 생성하세요.");
        const standardPlan: StandardPlan = { ...fresh.standardPlan, confirmedAt: new Date().toISOString() };
        await writeState(ctx, companyId, { ...fresh, standardPlan });
        return standardPlan;
      });
      await safeLog(ctx, {
        companyId,
        message: `COS Blueprint standard plan confirmed: ${confirmed.projectTitle}`,
        entityType: "plugin",
        entityId: PLUGIN_ID,
        metadata: { confirmedAt: confirmed.confirmedAt },
      });
      return confirmed;
    });

    ctx.actions.register(ACTION.writeStandardPlanDocs, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      const state = await readState(ctx, companyId);
      if (!state.standardPlan) throw new Error("표준 기획서를 먼저 생성하세요.");

      const docs = renderStandardPlanDocuments(state.standardPlan);
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
      await safeLog(ctx, {
        companyId,
        message: `COS Blueprint wrote ${files.length} standard-plan documents`,
        entityType: "project",
        entityId: projectId,
        metadata: { plugin: PLUGIN_ID, files },
      });
      return {
        ok: true,
        projectId,
        workspacePath: workspace.path,
        files,
        message: `표준 기획서 문서 ${files.length}건을 프로젝트에 기록했습니다.`,
      } satisfies ProjectDocumentUpdateResult;
    });

    // 분석 ②단계 게이트. 표준 기획서 확정 전에는 화면정의서 생성을 막는다. 실제 생성은 다음 작업.
    ctx.actions.register(ACTION.runScreens, async (params) => {
      const companyId = companyIdFromParams(asRecord(params));
      const state = await readState(ctx, companyId);
      if (!state.standardPlan) throw new Error("표준 기획서를 먼저 생성하세요.");
      if (!state.standardPlan.confirmedAt) {
        throw new Error("표준 기획서가 확정되지 않아 화면정의서를 생성할 수 없습니다.");
      }
      throw new Error("화면정의서 생성은 다음 단계에서 구현됩니다.");
    });

    ctx.actions.register(ACTION.reset, async (params) => {
      const companyId = companyIdFromParams(asRecord(params));
      await withStateLock(companyId, async () => {
        await writeState(ctx, companyId, emptyState());
      });
      await safeLog(ctx, {
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

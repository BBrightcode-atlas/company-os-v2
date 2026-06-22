import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import {
  ACTION,
  BLUEPRINT_AGENT_KEYS,
  BLUEPRINT_PM_AGENT_KEY,
  BLUEPRINT_PROJECT_KEY,
  BLUEPRINT_ROUTINE_KEYS,
  BLUEPRINT_SKILL_KEYS,
  DATA,
  MAX_ORIGINAL_BYTES,
  PLUGIN_ID,
  PLUGIN_VERSION,
  SOURCE_FORMATS,
  SOURCE_TYPES,
  STATE_KEY,
  buildFallbackScreenPlan,
  buildFallbackStandardPlan,
  buildOverview,
  buildScreenPrompt,
  buildScreenRegenPrompt,
  buildStandardPlanPrompt,
  emptyState,
  isAllowedCompany,
  normalizeScreenDefinition,
  normalizeScreenPlanJson,
  normalizeStandardPlanJson,
  mergeProjectDocumentSlotUpdates,
  projectSlotUpdateForSource,
  projectSlotUpdatesForDocuments,
  renderBlueprintStandardDocuments,
  renderScreenDocuments,
  renderSourceDocument,
  renderStandardPlanDocuments,
  sourceDocPath,
  sourceOriginalPath,
  type BlueprintJob,
  type CosBlueprintState,
  type ProjectDocumentUpdateResult,
  type ProjectDocumentSlotsView,
  type ProjectDocumentSlotUpdate,
  type ProjectDocumentSlotViewerRow,
  type ProjectSummary,
  type ScreenDefinition,
  type ScreenPlan,
  type ScreenReview,
  type SourceDocumentRegisterResult,
  type SourceFormat,
  type SourceMaterial,
  type SourceOriginalDownload,
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

function dateValue(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.length > 0) return value;
  return null;
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

function blueprintRoutineKey(value: unknown): typeof BLUEPRINT_ROUTINE_KEYS[number] {
  const routineKey = stringValue(value);
  if (!routineKey || !(BLUEPRINT_ROUTINE_KEYS as readonly string[]).includes(routineKey)) {
    throw new Error(`routineKey is required; valid values: ${BLUEPRINT_ROUTINE_KEYS.join(", ")}`);
  }
  return routineKey as typeof BLUEPRINT_ROUTINE_KEYS[number];
}

async function readState(ctx: AnyCtx, companyId: string): Promise<CosBlueprintState> {
  const value = await ctx.state.get({ scopeKind: "company", scopeId: companyId, stateKey: STATE_KEY });
  const state = value && typeof value === "object" ? value as Partial<CosBlueprintState> : {};
  // 레거시 `analysis` 키는 무시하고 sources만 승계한다(스키마 마이그레이션).
  return {
    sources: Array.isArray(state.sources) ? state.sources : [],
    standardPlan: state.standardPlan ?? null,
    screenPlan: state.screenPlan ?? null,
    projectDocumentSlots: Array.isArray(state.projectDocumentSlots) ? state.projectDocumentSlots as ProjectDocumentSlotUpdate[] : [],
    job: state.job ?? null,
    updatedAt: state.updatedAt ?? null,
  };
}

// LLM 액션을 RPC 30s 타임아웃 밖에서 돌린다. job=running을 먼저 기록(await)한 뒤 즉시 반환하고,
// 백그라운드 bg()가 LLM 실행 + 최종 커밋(job=null)을 책임진다. bg가 throw하면 job=error.
async function startJob(ctx: AnyCtx, companyId: string, job: BlueprintJob, bg: () => Promise<void>): Promise<void> {
  await withStateLock(companyId, async () => {
    const fresh = await readState(ctx, companyId);
    await writeState(ctx, companyId, { ...fresh, job });
  });
  void (async () => {
    try {
      await bg();
    } catch (error) {
      await withStateLock(companyId, async () => {
        const fresh = await readState(ctx, companyId);
        await writeState(ctx, companyId, {
          ...fresh,
          job: { ...job, status: "error", message: error instanceof Error ? error.message : String(error) },
        });
      }).catch(() => {});
    }
  })().catch(() => {});
}

async function writeState(ctx: AnyCtx, companyId: string, state: CosBlueprintState): Promise<void> {
  await ctx.state.set({ scopeKind: "company", scopeId: companyId, stateKey: STATE_KEY }, {
    ...state,
    updatedAt: new Date().toISOString(),
  });
}

function renderSlotDocumentBody(slot: ProjectDocumentSlotUpdate, docs: Record<string, string>): string {
  const entries = slot.documentRefs
    .map((file) => ({ file, body: docs[file] }))
    .filter((entry): entry is { file: string; body: string } => typeof entry.body === "string");
  if (entries.length === 1) return entries[0].body;
  return [
    `# ${slot.title}`,
    "",
    ...entries.flatMap((entry) => [
      `## 문서(Document): ${entry.file}`,
      "",
      entry.body,
      "",
      "---",
      "",
    ]),
  ].join("\n").trimEnd();
}

async function importProjectDocumentSlot(
  ctx: AnyCtx,
  companyId: string,
  projectId: string,
  slot: ProjectDocumentSlotUpdate,
  body: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await ctx.projects.documentSlots.import(projectId, slot.slotKey, {
    title: slot.title,
    format: "markdown",
    body,
    status: slot.status,
    contentType: slot.contentType,
    metadata: {
      plugin: PLUGIN_ID,
      documentRefs: slot.documentRefs,
      collection: slot.collection === true,
      ...metadata,
    },
  }, companyId);
}

async function importProjectDocumentsToSlots(
  ctx: AnyCtx,
  companyId: string,
  projectId: string,
  docs: Record<string, string>,
  slots: ProjectDocumentSlotUpdate[],
  metadata: Record<string, unknown>,
): Promise<void> {
  for (const slot of slots) {
    await importProjectDocumentSlot(
      ctx,
      companyId,
      projectId,
      slot,
      renderSlotDocumentBody(slot, docs),
      metadata,
    );
  }
}

async function readProjectDocumentSlotsView(
  ctx: AnyCtx,
  companyId: string,
  projectId: string,
): Promise<ProjectDocumentSlotsView> {
  const slots = await ctx.projects.documentSlots.list(projectId, companyId);
  const rows = await Promise.all(slots.map(async (listedSlot): Promise<ProjectDocumentSlotViewerRow> => {
    const content = await ctx.projects.documentSlots.content(projectId, listedSlot.slotKey, companyId);
    const slot = content?.slot ?? listedSlot;
    return {
      slotKey: slot.slotKey,
      slotGroup: slot.slotGroup,
      title: slot.title,
      required: slot.required,
      status: slot.status,
      contentType: slot.contentType,
      documentId: slot.documentId,
      artifactId: slot.artifactId,
      updatedAt: dateValue(slot.updatedAt),
      metadata: slot.metadata,
      document: content?.document
        ? {
          id: content.document.id,
          title: content.document.title,
          format: content.document.format,
          body: content.document.body,
          latestRevisionNumber: content.document.latestRevisionNumber,
          updatedAt: dateValue(content.document.updatedAt),
        }
        : null,
      artifact: content?.artifact
        ? {
          artifactId: content.artifact.artifactId,
          contentType: content.artifact.contentType,
          originalFilename: content.artifact.originalFilename,
          byteSize: content.artifact.byteSize,
          contentPath: content.artifact.contentPath,
        }
        : null,
    };
  }));
  return {
    status: "ok",
    checkedAt: new Date().toISOString(),
    projectId,
    slots: rows,
  };
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

async function getBlueprintManagedResources(ctx: AnyCtx, companyId: string) {
  const [managedAgents, managedProject, managedSkills, managedRoutines] = await Promise.all([
    Promise.all(BLUEPRINT_AGENT_KEYS.map((agentKey) => ctx.agents.managed.get(agentKey, companyId))),
    ctx.projects.managed.get(BLUEPRINT_PROJECT_KEY, companyId),
    Promise.all(BLUEPRINT_SKILL_KEYS.map((skillKey) => ctx.skills.managed.get(skillKey, companyId))),
    Promise.all(BLUEPRINT_ROUTINE_KEYS.map((routineKey) => ctx.routines.managed.get(routineKey, companyId))),
  ]);
  return { managedAgents, managedProject, managedSkills, managedRoutines };
}

async function reconcileBlueprintManagedResources(ctx: AnyCtx, companyId: string, mode: "reconcile" | "reset") {
  const reconcileOrResetProject = mode === "reset"
    ? ctx.projects.managed.reset(BLUEPRINT_PROJECT_KEY, companyId)
    : ctx.projects.managed.reconcile(BLUEPRINT_PROJECT_KEY, companyId);
  const [managedProject, managedAgents, managedSkills] = await Promise.all([
    reconcileOrResetProject,
    Promise.all(BLUEPRINT_AGENT_KEYS.map((agentKey) => (
      mode === "reset"
        ? ctx.agents.managed.reset(agentKey, companyId)
        : ctx.agents.managed.reconcile(agentKey, companyId)
    ))),
    Promise.all(BLUEPRINT_SKILL_KEYS.map((skillKey) => (
      mode === "reset"
        ? ctx.skills.managed.reset(skillKey, companyId)
        : ctx.skills.managed.reconcile(skillKey, companyId)
    ))),
  ]);
  const managedRoutines = await Promise.all(
    BLUEPRINT_ROUTINE_KEYS.map((routineKey) => (
      mode === "reset"
        ? ctx.routines.managed.reset(routineKey, companyId)
        : ctx.routines.managed.reconcile(routineKey, companyId)
    )),
  );
  return { managedAgents, managedProject, managedSkills, managedRoutines };
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

// 분석 ②단계: 확정된 표준 기획서를 입력으로 화면정의서 전체 생성. screens 포함이라 max_tokens 크게.
async function generateScreenPlan(input: { standardPlan: StandardPlan; sources: SourceMaterial[] }): Promise<ScreenPlan> {
  const fallback = buildFallbackScreenPlan({ sources: input.sources, model: LLM_MODEL });
  if (process.env.COS_BLUEPRINT_DISABLE_LLM === "true") return fallback;

  try {
    const prompt = buildScreenPrompt(input);
    const text = await callBlueprintLlm(prompt, 16000);
    return {
      ...normalizeScreenPlanJson(extractJsonObject(text), fallback),
      llmModel: LLM_MODEL,
    };
  } catch {
    return {
      ...fallback,
      usedFallback: true,
    };
  }
}

// 단일 화면 재생성: 리뷰 피드백을 반영해 화면 1개만 LLM 수정. 실패/DISABLE_LLM 시 원본 유지.
async function generateSingleScreen(input: {
  standardPlan: StandardPlan;
  sources: SourceMaterial[];
  screen: ScreenDefinition;
  feedback: string;
}): Promise<ScreenDefinition> {
  if (process.env.COS_BLUEPRINT_DISABLE_LLM === "true") return input.screen;

  try {
    const prompt = buildScreenRegenPrompt(input);
    const text = await callBlueprintLlm(prompt, 6000);
    const record = extractJsonObject(text) as Record<string, unknown>;
    const normalized = normalizeScreenDefinition(record?.screen, 0);
    // code는 원본을 강제(LLM이 바꿔도 교체 대상 식별 유지).
    return { ...normalized, code: input.screen.code };
  } catch {
    return input.screen;
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

// 원본 바이너리를 workspace에 그대로 기록(텍스트 변환 없음). 경로탈출 방어 재사용.
function writeBinaryToWorkspace(workspacePath: string, relativePath: string, data: Buffer): void {
  const filePath = path.resolve(workspacePath, relativePath);
  assertInside(workspacePath, filePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, data);
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

    ctx.data.register(DATA.projectDocumentSlots, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      if (!projectId) {
        return {
          status: "ok",
          checkedAt: new Date().toISOString(),
          projectId: "",
          slots: [],
        } satisfies ProjectDocumentSlotsView;
      }
      return readProjectDocumentSlotsView(ctx, companyId, projectId);
    });

    ctx.data.register(DATA.managedAgent, async (params) => {
      const companyId = stringValue(params.companyId);
      if (!companyId || !isAllowedCompany(companyId)) return null;
      return ctx.agents.managed.get(BLUEPRINT_PM_AGENT_KEY, companyId);
    });

    ctx.data.register(DATA.managedResources, async (params) => {
      const companyId = stringValue(params.companyId);
      if (!companyId || !isAllowedCompany(companyId)) return null;
      return getBlueprintManagedResources(ctx, companyId);
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
      const originalBase64 = stringValue(record.originalBase64);
      const originalContentType = stringValue(record.originalContentType);
      const declaredOriginalSize = Number(record.originalSize) || 0;

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
        const appendSource = async (slot: ProjectDocumentSlotUpdate | null = null) => {
          const state = await readState(ctx, companyId);
          await writeState(ctx, companyId, {
            ...state,
            sources: [source, ...state.sources],
            projectDocumentSlots: slot
              ? mergeProjectDocumentSlotUpdates(state.projectDocumentSlots, [slot])
              : state.projectDocumentSlots,
          });
        };

        if (!projectId) {
          await appendSource();
          return {
            ok: false,
            source,
            projectId: null,
            workspacePath: null,
            file: null,
            slot: null,
            message: "프로젝트를 선택하지 않아 자료만 저장하고 문서는 기록하지 않았습니다.",
          };
        }

        const workspace = await ctx.projects.getPrimaryWorkspace(projectId, companyId);
        const workspacePath = workspace?.path ?? null;

        // 원본 바이너리 보관(있을 때). 크기 초과/디코드 실패/전송 손상은 텍스트 등록을 막지 않는다.
        let originalNote = "";
        if (originalBase64 && workspacePath) {
          const buffer = Buffer.from(originalBase64, "base64");
          if (buffer.byteLength === 0) {
            originalNote = " 원본 디코드에 실패해 텍스트만 보관했습니다.";
          } else if (buffer.byteLength > MAX_ORIGINAL_BYTES) {
            originalNote = ` 원본(${buffer.byteLength.toLocaleString()}B)이 한도(${MAX_ORIGINAL_BYTES.toLocaleString()}B)를 넘어 텍스트만 보관했습니다.`;
          } else if (declaredOriginalSize && buffer.byteLength !== declaredOriginalSize) {
            // base64는 부분 손상 시에도 일부만 디코드되어 조용히 잘린다. 선언 크기와 다르면 손상으로 보고 보관하지 않는다.
            originalNote = " 원본 크기 불일치(전송 손상)로 텍스트만 보관했습니다.";
          } else {
            const relPath = sourceOriginalPath(source);
            writeBinaryToWorkspace(workspacePath, relPath, buffer);
            source.originalPath = relPath;
            source.originalSize = buffer.byteLength;
            source.originalProjectId = projectId;
            if (originalContentType) source.originalContentType = originalContentType;
          }
        } else if (originalBase64) {
          originalNote = " primary workspace가 없어 원본 바이너리는 보관하지 않고 추출문만 Project slot에 등록했습니다.";
        }

        const file = sourceDocPath(source);
        const body = renderSourceDocument(source);
        if (workspacePath) writeDocsToWorkspace(workspacePath, { [file]: body });
        const slot = projectSlotUpdateForSource(source, file);
        await importProjectDocumentSlot(ctx, companyId, projectId, slot, body, {
          sourceId: source.id,
          sourceType: source.type,
          sourceFormat: source.format,
          fileName: source.fileName ?? null,
          originalPath: source.originalPath ?? null,
        });
        await appendSource(slot);
        return {
          ok: true,
          source,
          projectId,
          workspacePath,
          file,
          slot,
          message: `기획 자료를 Project source slot(${slot.slotKey})에 등록했습니다.${workspacePath ? ` 호환 파일: ${file}.` : ""}${source.originalPath ? ` 원본 보관: ${source.originalPath}.` : originalNote}`,
        };
      });

      await safeLog(ctx, result.ok
        ? {
          companyId,
          message: `COS Blueprint registered source document: ${result.file}`,
          entityType: "project",
          entityId: projectId as string,
          metadata: { plugin: PLUGIN_ID, sourceId: source.id, file: result.file, slotKey: result.slot?.slotKey, format: source.format },
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
      const title = stringValue(record.title);
      const initial = await readState(ctx, companyId);
      if (initial.sources.length === 0) throw new Error("at least one source material is required");

      // LLM 생성은 30s RPC 타임아웃을 넘기므로 fire-and-forget. UI는 job 상태를 폴링한다.
      await startJob(ctx, companyId, { kind: "standard-plan", status: "running", startedAt: new Date().toISOString() }, async () => {
        const standardPlan = await generateStandardPlan({ title, sources: initial.sources });
        await withStateLock(companyId, async () => {
          const fresh = await readState(ctx, companyId);
          // 표준 기획서가 바뀌면 기존 화면정의서는 stale → 무효화.
          await writeState(ctx, companyId, { ...fresh, standardPlan, screenPlan: null, job: null });
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
      });
      return { started: true };
    });

    ctx.actions.register(ACTION.confirmStandardPlan, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      const confirmed = await withStateLock(companyId, async (): Promise<StandardPlan> => {
        const fresh = await readState(ctx, companyId);
        if (!fresh.standardPlan) throw new Error("표준 기획서를 먼저 생성하세요.");
        const standardPlan: StandardPlan = { ...fresh.standardPlan, confirmedAt: new Date().toISOString() };
        await writeState(ctx, companyId, {
          ...fresh,
          standardPlan,
          projectDocumentSlots: fresh.projectDocumentSlots.map((slot) => (
            slot.slotKey === "deliverable.standard_plan"
              ? { ...slot, status: "approved", updatedAt: standardPlan.confirmedAt as string }
              : slot
          )),
        });
        return standardPlan;
      });
      if (projectId) {
        await ctx.projects.documentSlots.update(projectId, "deliverable.standard_plan", {
          status: "approved",
          metadata: {
            plugin: PLUGIN_ID,
            confirmedAt: confirmed.confirmedAt,
            projectTitle: confirmed.projectTitle,
          },
        }, companyId);
      }
      await safeLog(ctx, {
        companyId,
        message: `COS Blueprint standard plan confirmed: ${confirmed.projectTitle}`,
        entityType: "plugin",
        entityId: projectId ?? PLUGIN_ID,
        metadata: { confirmedAt: confirmed.confirmedAt, projectId: projectId ?? null },
      });
      return confirmed;
    });

    ctx.actions.register(ACTION.writeStandardPlanDocs, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      const state = await readState(ctx, companyId);
      if (!state.standardPlan) throw new Error("표준 기획서를 먼저 생성하세요.");

      const docs = {
        ...renderBlueprintStandardDocuments(),
        ...renderStandardPlanDocuments(state.standardPlan),
      };
      const slots = projectSlotUpdatesForDocuments(docs, state.standardPlan.confirmedAt ? "ready" : "draft");
      if (!projectId) {
        return {
          ok: false,
          projectId: null,
          workspacePath: null,
          files: Object.keys(docs),
          slots,
          message: "projectId가 없어 문서 미리보기 목록만 반환했습니다.",
        } satisfies ProjectDocumentUpdateResult;
      }

      const workspace = await ctx.projects.getPrimaryWorkspace(projectId, companyId);
      const files = workspace?.path ? writeDocsToWorkspace(workspace.path, docs) : Object.keys(docs);
      await importProjectDocumentsToSlots(ctx, companyId, projectId, docs, slots, {
        phase: "standard-plan",
        projectTitle: state.standardPlan.projectTitle,
        confirmedAt: state.standardPlan.confirmedAt ?? null,
        generatedAt: state.standardPlan.generatedAt,
      });
      await withStateLock(companyId, async () => {
        const fresh = await readState(ctx, companyId);
        await writeState(ctx, companyId, {
          ...fresh,
          projectDocumentSlots: mergeProjectDocumentSlotUpdates(fresh.projectDocumentSlots, slots),
        });
      });
      await safeLog(ctx, {
        companyId,
        message: `COS Blueprint wrote ${files.length} standard/reference and project output documents`,
        entityType: "project",
        entityId: projectId,
        metadata: { plugin: PLUGIN_ID, files, slotKeys: slots.map((slot) => slot.slotKey), coreSlots: true },
      });
      return {
        ok: true,
        projectId,
        workspacePath: workspace?.path ?? null,
        files,
        slots,
        message: `고정 기준 문서와 프로젝트 산출물 ${files.length}건을 Project document slot에 기록했습니다.`,
      } satisfies ProjectDocumentUpdateResult;
    });

    // 분석 ②단계. 표준 기획서 확정 후에만 화면정의서 전체를 생성한다. (fire-and-forget)
    ctx.actions.register(ACTION.runScreens, async (params) => {
      const companyId = companyIdFromParams(asRecord(params));
      const initial = await readState(ctx, companyId);
      if (!initial.standardPlan) throw new Error("표준 기획서를 먼저 생성하세요.");
      if (!initial.standardPlan.confirmedAt) {
        throw new Error("표준 기획서가 확정되지 않아 화면정의서를 생성할 수 없습니다.");
      }
      const standardPlan = initial.standardPlan;
      const pinnedGeneratedAt = standardPlan.generatedAt;

      await startJob(ctx, companyId, { kind: "screens", status: "running", startedAt: new Date().toISOString() }, async () => {
        const screenPlan = await generateScreenPlan({ standardPlan, sources: initial.sources });
        const committed = await withStateLock(companyId, async (): Promise<boolean> => {
          const fresh = await readState(ctx, companyId);
          // LLM 호출 동안 표준 기획서가 재생성/무효화됐으면 stale screenPlan을 되살리지 않는다.
          if (!fresh.standardPlan?.confirmedAt || fresh.standardPlan.generatedAt !== pinnedGeneratedAt) {
            return false;
          }
          await writeState(ctx, companyId, { ...fresh, screenPlan: { ...screenPlan, reviews: {} }, job: null });
          return true;
        });
        if (!committed) {
          throw new Error("표준 기획서가 변경되어 화면정의서 생성을 취소했습니다. 다시 시도하세요.");
        }
        await safeLog(ctx, {
          companyId,
          message: `COS Blueprint screens generated for ${standardPlan.projectTitle}`,
          entityType: "plugin",
          entityId: PLUGIN_ID,
          metadata: { screenCount: screenPlan.screens.length, usedFallback: screenPlan.usedFallback === true },
        });
      });
      return { started: true };
    });

    ctx.actions.register(ACTION.writeScreenDocs, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      const state = await readState(ctx, companyId);
      if (!state.standardPlan) throw new Error("표준 기획서를 먼저 생성하세요.");
      if (!state.standardPlan.confirmedAt) {
        throw new Error("표준 기획서가 확정되지 않아 화면정의서 문서를 산출할 수 없습니다.");
      }
      if (!state.screenPlan) throw new Error("화면정의서를 먼저 생성하세요.");

      const docs = renderScreenDocuments(state.screenPlan, state.standardPlan.projectTitle);
      const slots = projectSlotUpdatesForDocuments(docs, "ready");
      if (!projectId) {
        return {
          ok: false,
          projectId: null,
          workspacePath: null,
          files: Object.keys(docs),
          slots,
          message: "projectId가 없어 문서 미리보기 목록만 반환했습니다.",
        } satisfies ProjectDocumentUpdateResult;
      }

      const workspace = await ctx.projects.getPrimaryWorkspace(projectId, companyId);
      const files = workspace?.path ? writeDocsToWorkspace(workspace.path, docs) : Object.keys(docs);
      await importProjectDocumentsToSlots(ctx, companyId, projectId, docs, slots, {
        phase: "screen-definitions",
        projectTitle: state.standardPlan.projectTitle,
        screenCount: state.screenPlan.screens.length,
      });
      await withStateLock(companyId, async () => {
        const fresh = await readState(ctx, companyId);
        await writeState(ctx, companyId, {
          ...fresh,
          projectDocumentSlots: mergeProjectDocumentSlotUpdates(fresh.projectDocumentSlots, slots),
        });
      });
      await safeLog(ctx, {
        companyId,
        message: `COS Blueprint wrote ${files.length} screen documents`,
        entityType: "project",
        entityId: projectId,
        metadata: { plugin: PLUGIN_ID, files, slotKeys: slots.map((slot) => slot.slotKey), coreSlots: true },
      });
      return {
        ok: true,
        projectId,
        workspacePath: workspace?.path ?? null,
        files,
        slots,
        message: `화면정의서 문서 ${files.length}건을 Project document slot에 기록했습니다.`,
      } satisfies ProjectDocumentUpdateResult;
    });

    // 화면정의서 리뷰: 화면별 피드백 코멘트/상태 기록 (LLM 없음).
    ctx.actions.register(ACTION.reviewScreen, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const screenCode = stringValue(record.screenCode);
      if (!screenCode) throw new Error("screenCode is required");
      const comment = stringValue(record.comment);
      const rawStatus = stringValue(record.status);
      const status = rawStatus === "pending" || rawStatus === "approved" || rawStatus === "changes-requested"
        ? rawStatus
        : undefined;

      const review = await withStateLock(companyId, async (): Promise<ScreenReview> => {
        const fresh = await readState(ctx, companyId);
        if (!fresh.screenPlan) throw new Error("화면정의서를 먼저 생성하세요.");
        if (!fresh.screenPlan.screens.some((s) => s.code === screenCode)) {
          throw new Error(`화면 코드를 찾을 수 없습니다: ${screenCode}`);
        }
        const reviews = { ...(fresh.screenPlan.reviews ?? {}) };
        const prev = reviews[screenCode] ?? { status: "pending" as const, comments: [], updatedAt: "" };
        const now = new Date().toISOString();
        const updated: ScreenReview = {
          status: status ?? (comment ? "changes-requested" : prev.status),
          comments: comment ? [...prev.comments, { id: randomUUID(), body: comment, createdAt: now }] : prev.comments,
          updatedAt: now,
        };
        reviews[screenCode] = updated;
        await writeState(ctx, companyId, { ...fresh, screenPlan: { ...fresh.screenPlan, reviews } });
        return updated;
      });
      await safeLog(ctx, {
        companyId,
        message: `COS Blueprint screen reviewed: ${screenCode} (${review.status})`,
        entityType: "plugin",
        entityId: PLUGIN_ID,
        metadata: { screenCode, status: review.status },
      });
      return review;
    });

    // 화면정의서 단일 화면 재생성: 리뷰 피드백을 반영해 해당 화면만 LLM 수정.
    ctx.actions.register(ACTION.regenerateScreen, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const screenCode = stringValue(record.screenCode);
      if (!screenCode) throw new Error("screenCode is required");
      const feedback = stringValue(record.feedback) ?? "";

      const initial = await readState(ctx, companyId);
      if (!initial.standardPlan?.confirmedAt) {
        throw new Error("표준 기획서가 확정되지 않아 화면을 재생성할 수 없습니다.");
      }
      if (!initial.screenPlan) throw new Error("화면정의서를 먼저 생성하세요.");
      const target = initial.screenPlan.screens.find((s) => s.code === screenCode);
      if (!target) throw new Error(`화면 코드를 찾을 수 없습니다: ${screenCode}`);

      const pinnedGeneratedAt = initial.screenPlan.generatedAt;
      const standardPlan = initial.standardPlan;

      // 단일 화면 LLM 재생성도 30s를 넘길 수 있어 fire-and-forget.
      await startJob(ctx, companyId, { kind: "screen", status: "running", screenCode, startedAt: new Date().toISOString() }, async () => {
        const newScreen = await generateSingleScreen({ standardPlan, sources: initial.sources, screen: target, feedback });
        const committed = await withStateLock(companyId, async (): Promise<boolean> => {
          const fresh = await readState(ctx, companyId);
          if (!fresh.standardPlan?.confirmedAt || !fresh.screenPlan
            || fresh.screenPlan.generatedAt !== pinnedGeneratedAt
            || !fresh.screenPlan.screens.some((s) => s.code === screenCode)) {
            return false;
          }
          const screens = fresh.screenPlan.screens.map((s) => (s.code === screenCode ? newScreen : s));
          const reviews = { ...(fresh.screenPlan.reviews ?? {}) };
          const prev = reviews[screenCode] ?? { status: "pending" as const, comments: [], updatedAt: "" };
          reviews[screenCode] = { ...prev, status: "pending", updatedAt: new Date().toISOString() };
          await writeState(ctx, companyId, { ...fresh, screenPlan: { ...fresh.screenPlan, screens, reviews }, job: null });
          return true;
        });
        if (!committed) {
          throw new Error("화면정의서가 변경되어 재생성을 취소했습니다. 다시 시도하세요.");
        }
        await safeLog(ctx, {
          companyId,
          message: `COS Blueprint screen regenerated: ${screenCode}`,
          entityType: "plugin",
          entityId: PLUGIN_ID,
          metadata: { screenCode },
        });
      });
      return { started: true };
    });

    ctx.actions.register(ACTION.reconcileManagedAgent, async (params) => {
      const companyId = companyIdFromParams(asRecord(params));
      const resolved = await ctx.agents.managed.reconcile(BLUEPRINT_PM_AGENT_KEY, companyId);
      await safeLog(ctx, {
        companyId,
        message: `COS Blueprint managed agent reconciled: ${BLUEPRINT_PM_AGENT_KEY}`,
        entityType: "plugin",
        entityId: PLUGIN_ID,
        metadata: { agentKey: BLUEPRINT_PM_AGENT_KEY, agentId: resolved.agentId, status: resolved.status },
      });
      return resolved;
    });

    ctx.actions.register(ACTION.resetManagedAgent, async (params) => {
      const companyId = companyIdFromParams(asRecord(params));
      const resolved = await ctx.agents.managed.reset(BLUEPRINT_PM_AGENT_KEY, companyId);
      await safeLog(ctx, {
        companyId,
        message: `COS Blueprint managed agent reset: ${BLUEPRINT_PM_AGENT_KEY}`,
        entityType: "plugin",
        entityId: PLUGIN_ID,
        metadata: { agentKey: BLUEPRINT_PM_AGENT_KEY, agentId: resolved.agentId, status: resolved.status },
      });
      return resolved;
    });

    ctx.actions.register(ACTION.reconcileManagedResources, async (params) => {
      const companyId = companyIdFromParams(asRecord(params));
      const resolved = await reconcileBlueprintManagedResources(ctx, companyId, "reconcile");
      await safeLog(ctx, {
        companyId,
        message: "COS Blueprint managed resources reconciled",
        entityType: "plugin",
        entityId: PLUGIN_ID,
        metadata: {
          agentKeys: BLUEPRINT_AGENT_KEYS,
          projectKey: BLUEPRINT_PROJECT_KEY,
          skillKeys: BLUEPRINT_SKILL_KEYS,
          routineKeys: BLUEPRINT_ROUTINE_KEYS,
        },
      });
      return resolved;
    });

    ctx.actions.register(ACTION.resetManagedResources, async (params) => {
      const companyId = companyIdFromParams(asRecord(params));
      const resolved = await reconcileBlueprintManagedResources(ctx, companyId, "reset");
      await safeLog(ctx, {
        companyId,
        message: "COS Blueprint managed resources reset",
        entityType: "plugin",
        entityId: PLUGIN_ID,
        metadata: {
          agentKeys: BLUEPRINT_AGENT_KEYS,
          projectKey: BLUEPRINT_PROJECT_KEY,
          skillKeys: BLUEPRINT_SKILL_KEYS,
          routineKeys: BLUEPRINT_ROUTINE_KEYS,
        },
      });
      return resolved;
    });

    ctx.actions.register(ACTION.runManagedRoutine, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const routineKey = blueprintRoutineKey(record.routineKey);
      await reconcileBlueprintManagedResources(ctx, companyId, "reconcile");
      const run = await ctx.routines.managed.run(routineKey, companyId);
      await safeLog(ctx, {
        companyId,
        message: `COS Blueprint managed routine queued: ${routineKey}`,
        entityType: "plugin",
        entityId: PLUGIN_ID,
        metadata: { routineKey, routineRunId: run.id, routineId: run.routineId },
      });
      return run;
    });

    ctx.actions.register(ACTION.readSourceOriginal, async (params): Promise<SourceOriginalDownload> => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      const sourceId = stringValue(record.sourceId);
      if (!sourceId) throw new Error("sourceId is required");

      const state = await readState(ctx, companyId);
      const source = state.sources.find((entry) => entry.id === sourceId);
      const miss = (message: string): SourceOriginalDownload => ({
        ok: false,
        fileName: source?.fileName ?? null,
        contentType: source?.originalContentType ?? null,
        dataBase64: null,
        message,
      });
      if (!source?.originalPath) return miss("보관된 원본이 없습니다.");
      // 등록 당시 프로젝트 workspace에서 읽는다(현재 선택 프로젝트가 달라도 무방). 레거시 자료는 파라미터 fallback.
      const targetProjectId = source.originalProjectId ?? projectId;
      if (!targetProjectId) return miss("프로젝트 정보가 없어 원본을 읽을 수 없습니다.");

      const workspace = await ctx.projects.getPrimaryWorkspace(targetProjectId, companyId);
      if (!workspace?.path) return miss("프로젝트 workspace가 없어 원본을 읽을 수 없습니다.");

      const filePath = path.resolve(workspace.path, source.originalPath);
      assertInside(workspace.path, filePath);
      if (!existsSync(filePath)) return miss("원본 파일을 찾을 수 없습니다(이동/미보관).");

      // assertInside는 경로 문자열만 검사한다. workspace가 agent가 쓰는 git repo이므로
      // 심링크가 심어졌을 가능성에 대비해 실제 경로(realpath)로 봉쇄를 재확인한 뒤 읽는다.
      const realRoot = realpathSync(workspace.path);
      const realFile = realpathSync(filePath);
      const realRel = path.relative(realRoot, realFile);
      if (realRel.startsWith("..") || path.isAbsolute(realRel)) {
        return miss("원본 경로 검증에 실패했습니다.");
      }

      const buffer = readFileSync(filePath);
      if (buffer.byteLength > MAX_ORIGINAL_BYTES) return miss("원본이 너무 커서 다운로드할 수 없습니다.");

      return {
        ok: true,
        fileName: source.fileName ?? path.basename(source.originalPath),
        contentType: source.originalContentType ?? "application/octet-stream",
        dataBase64: buffer.toString("base64"),
        message: "ok",
      };
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

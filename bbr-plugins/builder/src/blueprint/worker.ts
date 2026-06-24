import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { definePlugin } from "@paperclipai/plugin-sdk";
import { BUILDER_MANAGED_AGENT_MODEL } from "../managed-resources.js";
import {
  ACTION,
  BLUEPRINT_AGENT_KEYS,
  BLUEPRINT_PM_AGENT_KEY,
  BLUEPRINT_PROJECT_KEY,
  BLUEPRINT_ROUTINE_KEYS,
  BLUEPRINT_SKILL_KEYS,
  DATA,
  DEFAULT_PRODUCT_BUILDER_BLUEPRINT_ID,
  MAX_ORIGINAL_BYTES,
  PLUGIN_ID,
  PLUGIN_VERSION,
  PROJECT_DOCUMENT_SLOT_DEFINITIONS,
  SOURCE_FORMATS,
  SOURCE_TYPES,
  STATE_KEY,
  buildFallbackScreenPlan,
  buildFallbackRequirementInventory,
  buildFallbackStandardPlan,
  buildOverview,
  buildRequirementInventoryPrompt,
  buildScreenPrompt,
  buildScreenRegenPrompt,
  buildStandardPlanPrompt,
  canonicalizeRequirementInventory,
  emptyState,
  ensureStandardPlanInventoryCoverage,
  isAllowedCompany,
  normalizeRequirementInventoryJson,
  normalizeScreenDefinition,
  normalizeScreenPlanJson,
  normalizeStandardPlanJson,
  normalizeProductBuilderBlueprintId,
  mergeProjectDocumentSlotUpdates,
  productBuilderBlueprintMetadata,
  productBuilderBlueprintOption,
  projectSlotUpdateForSource,
  projectSlotUpdatesForDocuments,
  renderBlueprintStandardDocuments,
  renderScreenDocuments,
  renderSourceDocument,
  renderStandardPlanDocuments,
  screenPlanAllScreensApproved,
  sourceDocPath,
  type BlueprintJob,
  type CosBlueprintState,
  type ProjectDocumentSlotKey,
  type ProjectDocumentUpdateResult,
  type ProjectDocumentSlotsView,
  type ProjectDocumentSlotUpdate,
  type ProjectDocumentSlotViewerRow,
  type ProjectSummary,
  type ProductBuilderBlueprintId,
  type RequirementInventory,
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
const LLM_MODEL = process.env.COS_BLUEPRINT_MODEL || BUILDER_MANAGED_AGENT_MODEL;
const SOURCE_URL_FETCH_TIMEOUT_MS = 10_000;
const SOURCE_URL_BODY_CAP = 120_000;
const REQUIREMENT_INVENTORY_CHUNK_CHARS = 30_000;

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

function productBuilderBlueprintId(value: unknown): ProductBuilderBlueprintId {
  return normalizeProductBuilderBlueprintId(value);
}

function normalizeSourceUrl(value: unknown): string | undefined {
  const raw = stringValue(value);
  if (!raw) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("url must be a valid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("url must use http or https");
  }
  parsed.hash = "";
  return parsed.toString();
}

function decodeBasicHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/g, "'");
}

function extractUrlText(raw: string, contentType: string): string {
  const looksHtml = /html/i.test(contentType) || /<html[\s>]/i.test(raw) || /<body[\s>]/i.test(raw);
  const text = looksHtml
    ? raw
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|section|article|li|h[1-6]|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
    : raw;
  return decodeBasicHtmlEntities(text)
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, SOURCE_URL_BODY_CAP);
}

async function fetchUrlSource(url: string): Promise<{ text: string; contentType: string; status: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SOURCE_URL_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        accept: "text/html,text/plain,application/xhtml+xml,application/json;q=0.8,*/*;q=0.5",
        "user-agent": "Paperclip-COS-Blueprint/0.1 (+https://paperclip.local)",
      },
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const raw = await response.text();
    const text = extractUrlText(raw, contentType);
    if (!text) throw new Error("empty response body");
    return { text, contentType, status: response.status };
  } finally {
    clearTimeout(timer);
  }
}

const FIGMA_API_BASE = "https://api.figma.com";
const FIGMA_FETCH_TIMEOUT_MS = 15_000;
const FIGMA_MAX_TEXTS = 400;
const FIGMA_MAX_LINES = 1_200;

type FigmaProbeReason =
  | "no_token"
  | "invalid_url"
  | "unauthorized"
  | "forbidden_export"
  | "not_found"
  | "rate_limited"
  | "network";

type FigmaNode = {
  id?: string;
  name?: string;
  type?: string;
  characters?: string;
  layoutMode?: string;
  children?: FigmaNode[];
};

function figmaError(reason: FigmaProbeReason, message: string): Error & { figmaReason: FigmaProbeReason } {
  const err = new Error(message) as Error & { figmaReason: FigmaProbeReason };
  err.figmaReason = reason;
  return err;
}

function isFigmaUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const u = new URL(value);
    return /(^|\.)figma\.com$/i.test(u.hostname) && /\/(design|file)\//.test(u.pathname);
  } catch {
    return false;
  }
}

function parseFigmaUrl(value: string): { fileKey: string; nodeIds: string[] } {
  const u = new URL(value);
  const match = u.pathname.match(/\/(?:design|file)\/([A-Za-z0-9]+)/);
  if (!match) throw figmaError("invalid_url", "Figma 파일 키를 URL 에서 찾을 수 없습니다.");
  const raw = u.searchParams.get("node-id");
  const nodeIds = raw ? [raw.replace(/-/g, ":")] : [];
  return { fileKey: match[1], nodeIds };
}

function figmaReasonFromStatus(status: number, errText: string): FigmaProbeReason {
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limited";
  if (status === 401) return "unauthorized";
  if (status === 403) return /not exportable/i.test(errText) ? "forbidden_export" : "unauthorized";
  return "network";
}

function figmaProbeMessage(reason: FigmaProbeReason, fallback?: string): string {
  switch (reason) {
    case "no_token":
      return "Figma 액세스 토큰을 함께 입력하세요.";
    case "invalid_url":
      return "유효한 Figma 파일 URL 이 아닙니다.";
    case "unauthorized":
      return "토큰이 유효하지 않습니다(스코프 file_content:read 확인).";
    case "forbidden_export":
      return "이 파일은 viewer 권한에서 내보내기가 차단돼 있습니다. 소유자에게 공유(또는 editor) 권한이나 export 허용을 요청하세요.";
    case "not_found":
      return "파일을 찾을 수 없거나 접근 권한이 없습니다.";
    case "rate_limited":
      return "Figma 요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.";
    default:
      return fallback ?? "Figma 연결에 실패했습니다.";
  }
}

async function figmaApi(
  pathWithQuery: string,
  token: string,
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> | null; errText: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FIGMA_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${FIGMA_API_BASE}${pathWithQuery}`, {
      headers: { "X-Figma-Token": token },
      signal: controller.signal,
    });
    const text = await res.text();
    let json: Record<string, unknown> | null = null;
    try {
      json = text ? (JSON.parse(text) as Record<string, unknown>) : null;
    } catch {
      json = null;
    }
    const errText = typeof json?.err === "string" ? json.err : text.slice(0, 200);
    return { ok: res.ok, status: res.status, json, errText };
  } catch (error) {
    throw figmaError("network", error instanceof Error ? error.message : String(error));
  } finally {
    clearTimeout(timer);
  }
}

function serializeFigmaNode(node: FigmaNode, lines: string[], depth: number, counters: { texts: number }): void {
  if (lines.length >= FIGMA_MAX_LINES) return;
  const indent = "  ".repeat(Math.min(depth, 8));
  const type = node.type ?? "NODE";
  const name = (node.name ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  let label = `${indent}- [${type}] ${name}`.trimEnd();
  if (type === "TEXT" && typeof node.characters === "string" && node.characters.trim() && counters.texts < FIGMA_MAX_TEXTS) {
    label += ` = "${node.characters.replace(/\s+/g, " ").trim().slice(0, 120)}"`;
    counters.texts += 1;
  }
  if (node.layoutMode && node.layoutMode !== "NONE") label += ` (layout: ${node.layoutMode})`;
  lines.push(label);
  for (const child of node.children ?? []) {
    if (lines.length >= FIGMA_MAX_LINES) break;
    serializeFigmaNode(child, lines, depth + 1, counters);
  }
}

function summarizeFigmaDocument(doc: FigmaNode): { screenCount: number; text: string } {
  const topScreens = doc.type === "CANVAS" || doc.type === "DOCUMENT" ? (doc.children ?? []) : [doc];
  const lines: string[] = [];
  const counters = { texts: 0 };
  for (const screen of topScreens) {
    if (lines.length >= FIGMA_MAX_LINES) break;
    serializeFigmaNode(screen, lines, 0, counters);
  }
  return { screenCount: topScreens.length, text: lines.join("\n") };
}

async function fetchFigmaSource(
  url: string,
  token: string,
): Promise<{ fileName: string; screenCount: number; body: string }> {
  const { fileKey, nodeIds } = parseFigmaUrl(url);

  const meta = await figmaApi(`/v1/files/${fileKey}/meta`, token).catch(() => null);
  const metaFile = asRecord(meta?.json?.file);
  const fileName = stringValue(metaFile.name) ?? stringValue(meta?.json?.name) ?? fileKey;

  let documents: FigmaNode[] = [];
  if (nodeIds.length > 0) {
    const ids = nodeIds.map(encodeURIComponent).join(",");
    const r = await figmaApi(`/v1/files/${fileKey}/nodes?ids=${ids}&depth=6`, token);
    if (!r.ok) throw figmaError(figmaReasonFromStatus(r.status, r.errText), r.errText || `HTTP ${r.status}`);
    const nodesMap = asRecord(r.json?.nodes);
    documents = Object.values(nodesMap)
      .map((entry) => asRecord(entry).document as FigmaNode | undefined)
      .filter((d): d is FigmaNode => Boolean(d));
  } else {
    const r = await figmaApi(`/v1/files/${fileKey}?depth=2`, token);
    if (!r.ok) throw figmaError(figmaReasonFromStatus(r.status, r.errText), r.errText || `HTTP ${r.status}`);
    const doc = r.json?.document as FigmaNode | undefined;
    if (doc) documents = [doc];
  }
  if (documents.length === 0) throw figmaError("not_found", "Figma 노드를 찾을 수 없습니다.");

  let screenCount = 0;
  const parts: string[] = [];
  for (const doc of documents) {
    const summary = summarizeFigmaDocument(doc);
    screenCount += summary.screenCount;
    if (summary.text) parts.push(summary.text);
  }
  const body = parts.join("\n\n").slice(0, SOURCE_URL_BODY_CAP);
  return { fileName, screenCount, body };
}

function blueprintRoutineKey(value: unknown): typeof BLUEPRINT_ROUTINE_KEYS[number] {
  const routineKey = stringValue(value);
  if (!routineKey || !(BLUEPRINT_ROUTINE_KEYS as readonly string[]).includes(routineKey)) {
    throw new Error(`routineKey is required; valid values: ${BLUEPRINT_ROUTINE_KEYS.join(", ")}`);
  }
  return routineKey as typeof BLUEPRINT_ROUTINE_KEYS[number];
}

type BlueprintStateScope = {
  companyId: string;
  projectId?: string | null;
};

type ProjectBlueprintStateScope = {
  companyId: string;
  projectId: string;
};

type StartedBlueprintJob = BlueprintJob & { jobId: string };
type StartJobResult = {
  started: boolean;
  job: BlueprintJob;
  reason?: string;
};

const WORKER_STARTED_AT = new Date();
const INTERRUPTED_JOB_MESSAGE = "작업이 서버 또는 플러그인 worker 재시작으로 중단되었습니다. 다시 실행하세요.";

function stateScopeKey(scope: BlueprintStateScope) {
  return scope.projectId
    ? { scopeKind: "project" as const, scopeId: scope.projectId, namespace: `company:${scope.companyId}`, stateKey: STATE_KEY }
    : { scopeKind: "company" as const, scopeId: scope.companyId, stateKey: STATE_KEY };
}

function stateLockKey(scope: BlueprintStateScope): string {
  return `${scope.companyId}|${scope.projectId ?? "company"}`;
}

function jobStage(job: BlueprintJob): BlueprintJob["kind"] {
  return job.stage ?? job.kind;
}

function isCurrentJob(state: CosBlueprintState, job: StartedBlueprintJob): boolean {
  return state.job?.status === "running" && state.job.jobId === job.jobId;
}

function recoverInterruptedJob(job: BlueprintJob | null | undefined): BlueprintJob | null {
  if (!job) return null;
  const normalized = { ...job, stage: job.stage ?? job.kind };
  if (normalized.status !== "running") return normalized;

  const startedAtMs = Date.parse(normalized.startedAt);
  if (!Number.isFinite(startedAtMs) || startedAtMs >= WORKER_STARTED_AT.getTime()) {
    return normalized;
  }

  return {
    ...normalized,
    status: "error",
    message: INTERRUPTED_JOB_MESSAGE,
  };
}

function normalizeState(value: unknown): CosBlueprintState {
  const state = value && typeof value === "object" ? value as Partial<CosBlueprintState> : {};
  const sources = Array.isArray(state.sources) ? state.sources : [];
  const requirementInventory = state.requirementInventory && typeof state.requirementInventory === "object"
    ? normalizeRequirementInventoryJson(state.requirementInventory, {
      deliverables: [],
      items: [],
      generatedAt: new Date().toISOString(),
      sourceCount: sources.length,
      chunkCount: 0,
      usedFallback: false,
    })
    : null;
  // 레거시 `analysis` 키는 무시하고 sources만 승계한다(스키마 마이그레이션).
  return {
    sources,
    productBuilderBlueprintId: normalizeProductBuilderBlueprintId(state.productBuilderBlueprintId),
    productBuilderBlueprintSelectedAt: typeof state.productBuilderBlueprintSelectedAt === "string" ? state.productBuilderBlueprintSelectedAt : null,
    requirementInventory,
    standardPlan: state.standardPlan ?? null,
    screenPlan: state.screenPlan ?? null,
    projectDocumentSlots: Array.isArray(state.projectDocumentSlots) ? state.projectDocumentSlots as ProjectDocumentSlotUpdate[] : [],
    job: recoverInterruptedJob(state.job),
    updatedAt: state.updatedAt ?? null,
  };
}

function stateHasContent(state: CosBlueprintState): boolean {
  return state.sources.length > 0
    || Boolean(state.requirementInventory)
    || Boolean(state.standardPlan)
    || Boolean(state.screenPlan)
    || state.projectDocumentSlots.length > 0
    || Boolean(state.job);
}

const SOURCE_SLOT_KEYS = PROJECT_DOCUMENT_SLOT_DEFINITIONS
  .filter((definition) => definition.group === "source")
  .map((definition) => definition.slotKey);

async function readLegacyProjectState(ctx: AnyCtx, scope: ProjectBlueprintStateScope): Promise<CosBlueprintState | null> {
  const legacy = normalizeState(await ctx.state.get(stateScopeKey({ companyId: scope.companyId })));
  if (!stateHasContent(legacy)) return null;

  const sourceRefs = new Set<string>();
  const sourceFingerprints = new Set<string>();
  const sourceBodies: string[] = [];
  for (const slotKey of SOURCE_SLOT_KEYS) {
    const content = await ctx.projects.documentSlots
      .content(scope.projectId, slotKey as ProjectDocumentSlotKey, scope.companyId)
      .catch(() => null);
    const metadata = asRecord(content?.slot?.metadata);
    for (const ref of stringList(metadata.documentRefs)) sourceRefs.add(ref);
    for (const entry of objectList(metadata.sources)) {
      const fingerprint = stringValue(entry.sourceFingerprint);
      const documentRef = sourceEntryDocumentRef(entry);
      if (fingerprint) sourceFingerprints.add(fingerprint);
      if (documentRef) sourceRefs.add(documentRef);
    }
    if (typeof content?.document?.body === "string") sourceBodies.push(content.document.body);
  }

  if (sourceRefs.size === 0 && sourceFingerprints.size === 0 && sourceBodies.length === 0) return null;
  const joinedBody = sourceBodies.join("\n\n");
  const sources = legacy.sources.filter((source) => {
    if (source.fingerprint && sourceFingerprints.has(source.fingerprint)) return true;
    if (sourceRefs.has(sourceDocPath(source))) return true;
    return source.body.length > 0 && joinedBody.includes(source.body);
  });
  if (sources.length === 0) return null;

  return {
    ...legacy,
    sources,
    requirementInventory: null,
    standardPlan: null,
    screenPlan: null,
    projectDocumentSlots: legacy.projectDocumentSlots.filter((slot) => SOURCE_SLOT_KEYS.includes(slot.slotKey)),
    job: null,
  };
}

async function readState(ctx: AnyCtx, scope: BlueprintStateScope): Promise<CosBlueprintState> {
  const rawState = await ctx.state.get(stateScopeKey(scope));
  const state = normalizeState(rawState);
  if (scope.projectId && rawState == null && !stateHasContent(state)) {
    const legacy = await readLegacyProjectState(ctx, { companyId: scope.companyId, projectId: scope.projectId });
    if (legacy) return legacy;
  }
  return state;
}

async function updatePrdSlotProductBuilderMetadata(
  ctx: AnyCtx,
  companyId: string,
  projectId: string,
  blueprintId: ProductBuilderBlueprintId,
  selectedAt: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const content = await ctx.projects.documentSlots.content(projectId, "deliverable.prd", companyId);
    const existing = content?.slot?.metadata && typeof content.slot.metadata === "object"
      ? content.slot.metadata as Record<string, unknown>
      : {};
    await ctx.projects.documentSlots.update(projectId, "deliverable.prd", {
      metadata: {
        ...existing,
        plugin: PLUGIN_ID,
        ...productBuilderBlueprintMetadata(blueprintId),
        productBuilderBlueprintSelectedAt: selectedAt,
      },
    }, companyId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// LLM 액션을 RPC 30s 타임아웃 밖에서 돌린다. job=running을 먼저 기록(await)한 뒤 즉시 반환하고,
// 백그라운드 bg()가 LLM 실행 + 최종 커밋(job=null)을 책임진다. bg가 throw하면 job=error.
async function startJob(
  ctx: AnyCtx,
  scope: BlueprintStateScope,
  input: Omit<BlueprintJob, "jobId" | "projectId" | "stage"> & Partial<Pick<BlueprintJob, "stage">>,
  bg: (job: StartedBlueprintJob) => Promise<void>,
): Promise<StartJobResult> {
  const result = await withStateLock(scope, async (): Promise<StartJobResult> => {
    const fresh = await readState(ctx, scope);
    if (fresh.job?.status === "running") {
      return {
        started: false,
        job: fresh.job,
        reason: jobStage(fresh.job) === (input.stage ?? input.kind)
          ? "same-stage-running"
          : "project-job-running",
      };
    }
    const job: StartedBlueprintJob = {
      ...input,
      stage: input.stage ?? input.kind,
      projectId: scope.projectId ?? null,
      jobId: randomUUID(),
    };
    await writeState(ctx, scope, { ...fresh, job });
    return { started: true, job };
  });
  if (!result.started || !result.job.jobId) return result;

  const job = result.job as StartedBlueprintJob;
  void (async () => {
    try {
      await bg(job);
    } catch (error) {
      await withStateLock(scope, async () => {
        const fresh = await readState(ctx, scope);
        if (!isCurrentJob(fresh, job)) return;
        await writeState(ctx, scope, {
          ...fresh,
          job: { ...job, status: "error", message: error instanceof Error ? error.message : String(error) },
        });
      }).catch(() => {});
    }
  })().catch(() => {});
  return result;
}

async function writeState(ctx: AnyCtx, scope: BlueprintStateScope, state: CosBlueprintState): Promise<void> {
  await ctx.state.set(stateScopeKey(scope), {
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
      collection: slot.collection === true,
      ...metadata,
      documentRefs: slot.documentRefs,
    },
  }, companyId);
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

function objectList(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry));
}

function normalizeFingerprintPart(value: string | undefined): string {
  return (value ?? "").trim().replace(/\r\n?/g, "\n");
}

function sourceFingerprint(input: {
  type: SourceType;
  format?: SourceFormat;
  fileName?: string;
  url?: string;
  body: string;
}): string {
  const payload = {
    type: input.type,
    format: input.format ?? "text",
    fileName: normalizeFingerprintPart(input.fileName).toLowerCase(),
    url: normalizeFingerprintPart(input.url),
    body: normalizeFingerprintPart(input.body),
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function sourceEntryDocumentRef(entry: Record<string, unknown>): string | null {
  return stringValue(entry.documentRef) ?? stringValue(entry.file) ?? null;
}

function sourceEntryMatchesLegacyBody(
  entry: Record<string, unknown>,
  source: SourceMaterial,
  currentBody: string,
): boolean {
  if (stringValue(entry.sourceType) !== source.type) return false;
  if ((stringValue(entry.sourceFormat) ?? "text") !== (source.format ?? "text")) return false;
  if ((stringValue(entry.sourceUrl) ?? "") !== (source.url ?? "")) return false;
  if ((stringValue(entry.fileName) ?? "") !== (source.fileName ?? "")) return false;
  if (typeof entry.bodyLength === "number" && entry.bodyLength !== source.body.length) return false;
  return source.body.length > 0 && currentBody.includes(source.body);
}

function findDuplicateSourceEntry(input: {
  entries: Record<string, unknown>[];
  source: SourceMaterial;
  fingerprint: string;
  currentBody: string;
}): { entry: Record<string, unknown>; documentRef: string | null } | null {
  for (const entry of input.entries) {
    if (stringValue(entry.sourceFingerprint) === input.fingerprint) {
      return { entry, documentRef: sourceEntryDocumentRef(entry) };
    }
  }
  for (const entry of input.entries) {
    if (sourceEntryMatchesLegacyBody(entry, input.source, input.currentBody)) {
      return { entry, documentRef: sourceEntryDocumentRef(entry) };
    }
  }
  return null;
}

async function importProjectSourceDocumentSlot(
  ctx: AnyCtx,
  companyId: string,
  projectId: string,
  slot: ProjectDocumentSlotUpdate,
  body: string,
  metadata: Record<string, unknown>,
): Promise<ProjectDocumentSlotUpdate> {
  const current = await ctx.projects.documentSlots.content(projectId, slot.slotKey, companyId);
  const currentMetadata = asRecord(current?.slot?.metadata);
  const documentRefs = [...new Set([...stringList(currentMetadata.documentRefs), ...slot.documentRefs])];
  const sourceEntries = [...objectList(currentMetadata.sources), metadata];
  const currentBody = typeof current?.document?.body === "string" ? current.document.body.trim() : "";
  const nextBody = currentBody ? `${currentBody}\n\n---\n\n${body}` : body;
  const nextSlot = { ...slot, documentRefs };

  await importProjectDocumentSlot(ctx, companyId, projectId, nextSlot, nextBody, {
    ...currentMetadata,
    ...metadata,
    sources: sourceEntries,
  });

  return nextSlot;
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

// ctx.state는 CAS/트랜잭션이 없는 단일 KV다. 같은 프로젝트에서 register/save/run/reset가 동시에
// read-modify-write 하면 마지막 writeState만 남아 source/analysis가 유실된다.
// worker 프로세스 내 company/project별 직렬화 큐로 read→write 한 단위를 보호한다.
const stateLocks = new Map<string, Promise<unknown>>();
function withStateLock<T>(scope: BlueprintStateScope, fn: () => Promise<T>): Promise<T> {
  const key = stateLockKey(scope);
  const prev = stateLocks.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  stateLocks.set(key, next.then(() => undefined, () => undefined));
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

// LLM 이 SYSTEM_GUARD("코드펜스 금지")를 어기고 ```json … ``` 으로 감싸는 경우가 관찰되어 방어한다.
function stripCodeFence(text: string): string {
  let t = text.trim();
  const closed = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t);
  if (closed) return closed[1].trim();
  // 닫힘 펜스가 잘려나간 경우(절단)도 대비해 여는/닫는 펜스 잔재만 제거.
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  return t.trim();
}

// max_tokens 절단 등으로 배열/객체 중간에서 끊긴 JSON 을 best-effort 복구한다.
// 마지막으로 "완결된 요소" 경계까지 자르고 열린 컨테이너를 닫는다. 복구 불가면 null.
function repairTruncatedJson(input: string): string | null {
  let inStr = false;
  let esc = false;
  const stack: Array<"{" | "["> = [];
  let cutEnd = -1; // 이 인덱스까지(포함) 자르면 안전한 경계
  let cutStack: Array<"{" | "["> | null = null;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === "\"") inStr = false;
      continue;
    }
    if (c === "\"") { inStr = true; continue; }
    if (c === "{" || c === "[") { stack.push(c); continue; }
    if (c === "}" || c === "]") {
      stack.pop();
      cutEnd = i;            // 완결된 하위 구조 직후 = 안전 경계
      cutStack = [...stack];
      continue;
    }
    if (c === ",") {
      cutEnd = i - 1;        // 콤마 직전 = 완결된 요소의 끝
      cutStack = [...stack];
    }
  }
  if (cutEnd < 0 || !cutStack) return null;
  let out = input.slice(0, cutEnd + 1).replace(/[\s,]+$/, "");
  for (let k = cutStack.length - 1; k >= 0; k--) out += cutStack[k] === "{" ? "}" : "]";
  return out;
}

function extractJsonObject(text: string): unknown {
  const cleaned = stripCodeFence(text);
  const start = cleaned.indexOf("{");
  if (start < 0) throw new Error("LLM response did not contain a JSON object");
  const end = cleaned.lastIndexOf("}");
  // 닫는 '}' 가 없으면(절단) 시작부터 끝까지 후보로 둔다.
  const candidate = end > start ? cleaned.slice(start, end + 1) : cleaned.slice(start);
  try {
    return JSON.parse(candidate);
  } catch (parseError) {
    const repaired = repairTruncatedJson(candidate);
    if (repaired) {
      try { return JSON.parse(repaired); } catch { /* 복구 실패 시 원본 에러를 던진다 */ }
    }
    throw parseError instanceof Error ? parseError : new Error(String(parseError));
  }
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

function sourceChunks(source: SourceMaterial): string[] {
  const body = source.body.trim();
  if (!body) return [];
  const chunks: string[] = [];
  for (let start = 0; start < body.length; start += REQUIREMENT_INVENTORY_CHUNK_CHARS) {
    chunks.push(body.slice(start, start + REQUIREMENT_INVENTORY_CHUNK_CHARS));
  }
  return chunks;
}

async function generateRequirementInventory(input: { sources: SourceMaterial[] }): Promise<RequirementInventory> {
  const chunkPlan = input.sources.flatMap((source) => (
    sourceChunks(source).map((chunkText) => ({ source, chunkText }))
  ));
  const fallback = buildFallbackRequirementInventory({
    sources: input.sources,
    chunkCount: Math.max(1, chunkPlan.length),
    model: LLM_MODEL,
  });
  if (process.env.COS_BLUEPRINT_DISABLE_LLM === "true") return fallback;

  const items: RequirementInventory["items"] = [];
  let usedFallback = false;
  for (let index = 0; index < chunkPlan.length; index += 1) {
    const chunk = chunkPlan[index];
    const chunkFallback = buildFallbackRequirementInventory({
      sources: [{ ...chunk.source, body: chunk.chunkText }],
      chunkCount: 1,
      model: LLM_MODEL,
    });
    // LLMs tend to summarize dense source chunks. Keep a deterministic source-backed
    // coverage floor, then canonicalize with richer LLM items so raw source units
    // are not silently dropped.
    items.push(...chunkFallback.items);
    usedFallback = true;
    try {
      const prompt = buildRequirementInventoryPrompt({
        source: chunk.source,
        chunkText: chunk.chunkText,
        chunkIndex: index,
        totalChunks: chunkPlan.length,
      });
      const text = await callBlueprintLlm(prompt, 12000);
      const normalized = normalizeRequirementInventoryJson(extractJsonObject(text), chunkFallback, chunk.source);
      items.push(...normalized.items);
      usedFallback = usedFallback || normalized.usedFallback === true;
    } catch {
      items.push(...chunkFallback.items);
      usedFallback = true;
    }
  }

  return canonicalizeRequirementInventory({
    deliverables: [],
    items: items.length > 0 ? items : fallback.items,
    generatedAt: new Date().toISOString(),
    sourceCount: input.sources.length,
    chunkCount: Math.max(1, chunkPlan.length),
    llmModel: LLM_MODEL,
    usedFallback,
  });
}

// 분석 ①단계: PRD/계약 산출물 생성. 풍부한 자료에서 schemas/apis 가 많으면 출력이 길어 8000 토큰으로는 절단되므로 16000 으로 둔다.
async function generateStandardPlan(input: {
  title?: string;
  sources: SourceMaterial[];
  productBuilderBlueprintId: ProductBuilderBlueprintId;
  requirementInventory?: RequirementInventory | null;
}): Promise<StandardPlan> {
  const fallback = buildFallbackStandardPlan({
    title: input.title,
    sources: input.sources,
    productBuilderBlueprintId: input.productBuilderBlueprintId,
    model: LLM_MODEL,
  });
  if (process.env.COS_BLUEPRINT_DISABLE_LLM === "true") {
    return ensureStandardPlanInventoryCoverage(fallback, input.requirementInventory);
  }

  try {
    const prompt = buildStandardPlanPrompt(input);
    const text = await callBlueprintLlm(prompt, 16000);
    return ensureStandardPlanInventoryCoverage({
      ...normalizeStandardPlanJson(extractJsonObject(text), fallback),
      llmModel: LLM_MODEL,
    }, input.requirementInventory);
  } catch (error) {
    return ensureStandardPlanInventoryCoverage({
      ...fallback,
      overview: `${fallback.overview}\n\nLLM 호출에 실패해 deterministic fallback PRD/계약 산출물을 생성했다: ${error instanceof Error ? error.message : String(error)}`,
      usedFallback: true,
    }, input.requirementInventory);
  }
}

// 분석 ②단계: 확정된 PRD 기준선을 입력으로 화면정의서 전체 생성. screens 포함이라 max_tokens 크게.
async function generateScreenPlan(input: {
  standardPlan: StandardPlan;
  sources: SourceMaterial[];
  requirementInventory?: RequirementInventory | null;
}): Promise<ScreenPlan> {
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

const plugin = definePlugin({
  async setup(ctx) {
    ctx.data.register(DATA.overview, async (params) => {
      const companyId = stringValue(params.companyId);
      const projectId = stringValue(params.projectId);
      const state = companyId ? await readState(ctx, { companyId, projectId }) : emptyState();
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
      const projectId = stringValue(record.projectId);
      const scope = { companyId, projectId };
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
      await withStateLock(scope, async () => {
        const state = await readState(ctx, scope);
        await writeState(ctx, scope, {
          ...state,
          sources: [source, ...state.sources],
          requirementInventory: null,
          standardPlan: null,
          screenPlan: null,
        });
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
      const url = normalizeSourceUrl(record.url);
      const bodyInput = stringValue(record.body);
      if (!title) throw new Error("title is required");
      if (!bodyInput && !url) throw new Error("body or url is required");
      const projectId = stringValue(record.projectId);
      const scope = { companyId, projectId };
      const format = sourceFormat(record.format ?? (url ? (isFigmaUrl(url) ? "figma" : "url") : undefined));
      let body = bodyInput ?? "";
      let fetchStatus: SourceMaterial["fetchStatus"] | undefined;
      let fetchedAt: string | undefined;
      let fetchError: string | undefined;

      if (url && isFigmaUrl(url)) {
        const figmaToken = stringValue(record.figmaToken);
        if (!figmaToken) {
          fetchStatus = "failed";
          fetchError = figmaProbeMessage("no_token");
          body = [
            body || null,
            "## Figma URL",
            url,
            "## 가져오기 상태(Fetch Status)",
            `자동 가져오기 실패: ${fetchError}`,
          ].filter((line): line is string => line !== null).join("\n\n");
        } else {
          try {
            const figma = await fetchFigmaSource(url, figmaToken);
            fetchStatus = "fetched";
            fetchedAt = new Date().toISOString();
            body = [
              body ? "## 등록 메모(Notes)" : null,
              body || null,
              "## Figma URL",
              url,
              "## Figma 파일",
              `${figma.fileName} (화면 ${figma.screenCount}개)`,
              "## Figma 화면 구조",
              figma.body,
            ].filter((line): line is string => line !== null).join("\n\n");
          } catch (error) {
            const reason = (error as { figmaReason?: FigmaProbeReason }).figmaReason;
            fetchStatus = "failed";
            fetchError = reason ? figmaProbeMessage(reason) : error instanceof Error ? error.message : String(error);
            body = [
              body || null,
              "## Figma URL",
              url,
              "## 가져오기 상태(Fetch Status)",
              `자동 가져오기 실패: ${fetchError}`,
            ].filter((line): line is string => line !== null).join("\n\n");
          }
        }
      } else if (url) {
        const shouldFetch = record.fetchUrl !== false;
        if (shouldFetch) {
          try {
            const fetched = await fetchUrlSource(url);
            fetchStatus = "fetched";
            fetchedAt = new Date().toISOString();
            body = [
              body ? "## 등록 메모(Notes)" : null,
              body || null,
              "## URL",
              url,
              "## 가져온 본문(Fetched Body)",
              fetched.text,
            ].filter((line): line is string => line !== null).join("\n\n");
          } catch (error) {
            fetchStatus = "failed";
            fetchError = error instanceof Error ? error.message : String(error);
            body = [
              body || null,
              "## URL",
              url,
              "## 가져오기 상태(Fetch Status)",
              `자동 가져오기 실패: ${fetchError}`,
            ].filter((line): line is string => line !== null).join("\n\n");
          }
        } else {
          fetchStatus = "not_fetched";
          body = [
            body || null,
            "## URL",
            url,
          ].filter((line): line is string => line !== null).join("\n\n");
        }
      }

      const source: SourceMaterial = {
        id: randomUUID(),
        title,
        type: sourceType(record.type),
        body,
        createdAt: new Date().toISOString(),
        fileName: stringValue(record.fileName),
        format,
        url,
        fetchStatus,
        fetchedAt,
        fetchError,
      };
      const fingerprint = sourceFingerprint(source);
      source.fingerprint = fingerprint;

      // 회사 state RMW + 문서 쓰기를 한 단위로 직렬화한다.
      // 문서 쓰기를 state 저장보다 먼저 수행 → 쓰기 실패 시 state에 orphan source가 남지 않아
      // 클라이언트 재시도가 깨끗하게 동작한다(부분 저장 불일치 제거).
      const result = await withStateLock(scope, async (): Promise<SourceDocumentRegisterResult> => {
        const appendSource = async (slot: ProjectDocumentSlotUpdate | null = null) => {
          const state = await readState(ctx, scope);
          await writeState(ctx, scope, {
            ...state,
            sources: [source, ...state.sources],
            requirementInventory: null,
            standardPlan: null,
            screenPlan: null,
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

        const file = sourceDocPath(source);
        const body = renderSourceDocument(source);
        const slot = projectSlotUpdateForSource(source, file);
        const current = await ctx.projects.documentSlots.content(projectId, slot.slotKey, companyId);
        const currentMetadata = asRecord(current?.slot?.metadata);
        const currentBody = typeof current?.document?.body === "string" ? current.document.body : "";
        const currentDocumentRefs = stringList(currentMetadata.documentRefs);
        const duplicate = findDuplicateSourceEntry({
          entries: objectList(currentMetadata.sources),
          source,
          fingerprint,
          currentBody,
        });
        if (duplicate) {
          const existingSlot = {
            ...slot,
            documentRefs: currentDocumentRefs.length > 0
              ? currentDocumentRefs
              : duplicate.documentRef ? [duplicate.documentRef] : [],
          };
          return {
            ok: true,
            duplicate: true,
            source,
            projectId,
            workspacePath: null,
            file: duplicate.documentRef,
            slot: existingSlot,
            message: `이미 등록된 기획 자료라 Project source slot(${slot.slotKey})에 중복 기록하지 않았습니다.`,
          };
        }
        const updatedSlot = await importProjectSourceDocumentSlot(ctx, companyId, projectId, slot, body, {
          sourceId: source.id,
          sourceTitle: source.title,
          sourceType: source.type,
          sourceFormat: source.format,
          sourceFingerprint: fingerprint,
          bodyLength: source.body.length,
          sourceUrl: source.url ?? null,
          sourceFetchStatus: source.fetchStatus ?? null,
          sourceFetchedAt: source.fetchedAt ?? null,
          fileName: source.fileName ?? null,
          documentRef: file,
          originalPath: source.originalPath ?? null,
        });
        await appendSource(updatedSlot);
        return {
          ok: true,
          source,
          projectId,
          workspacePath: null,
          file,
          slot: updatedSlot,
          message: `기획 자료를 Project source slot(${updatedSlot.slotKey})에 등록했습니다.`,
        };
      });

      let logEntry: Parameters<AnyCtx["activity"]["log"]>[0];
      if (result.duplicate) {
        logEntry = {
          companyId,
          message: `COS Blueprint skipped duplicate source document: ${result.file ?? title}`,
          entityType: projectId ? "project" : "plugin",
          entityId: projectId ?? PLUGIN_ID,
          metadata: { plugin: PLUGIN_ID, sourceId: source.id, file: result.file, slotKey: result.slot?.slotKey, format: source.format, duplicate: true },
        };
      } else if (result.ok) {
        logEntry = {
          companyId,
          message: `COS Blueprint registered source document: ${result.file}`,
          entityType: "project",
          entityId: projectId as string,
          metadata: { plugin: PLUGIN_ID, sourceId: source.id, file: result.file, slotKey: result.slot?.slotKey, format: source.format },
        };
      } else {
        logEntry = {
          companyId,
          message: `COS Blueprint source registered (no document): ${title}`,
          entityType: "plugin",
          entityId: PLUGIN_ID,
          metadata: { sourceId: source.id, type: source.type, format: source.format },
        };
      }
      await safeLog(ctx, logEntry);

      return result;
    });

    ctx.actions.register(ACTION.probeFigmaSource, async (params) => {
      const record = asRecord(params);
      companyIdFromParams(record);
      let url: string | undefined;
      try {
        url = normalizeSourceUrl(record.url);
      } catch {
        url = undefined;
      }
      if (!url || !isFigmaUrl(url)) {
        return { ok: false, reason: "invalid_url", message: figmaProbeMessage("invalid_url") };
      }
      const token = stringValue(record.token) ?? stringValue(record.figmaToken);
      if (!token) {
        return { ok: false, reason: "no_token", message: figmaProbeMessage("no_token") };
      }
      try {
        const figma = await fetchFigmaSource(url, token);
        return {
          ok: true,
          fileName: figma.fileName,
          screenCount: figma.screenCount,
          preview: figma.body.slice(0, 1500),
        };
      } catch (error) {
        const reason = (error as { figmaReason?: FigmaProbeReason }).figmaReason ?? "network";
        return {
          ok: false,
          reason,
          message: figmaProbeMessage(reason, error instanceof Error ? error.message : undefined),
        };
      }
    });

    ctx.actions.register(ACTION.setProductBuilderBlueprint, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const blueprintId = productBuilderBlueprintId(record.blueprintId);
      const projectId = stringValue(record.projectId);
      const scope = { companyId, projectId };
      const selectedAt = new Date().toISOString();
      await withStateLock(scope, async () => {
        const state = await readState(ctx, scope);
        await writeState(ctx, scope, {
          ...state,
          productBuilderBlueprintId: blueprintId,
          productBuilderBlueprintSelectedAt: selectedAt,
        });
      });
      const metadataUpdate = projectId
        ? await updatePrdSlotProductBuilderMetadata(ctx, companyId, projectId, blueprintId, selectedAt)
        : { ok: false, error: "projectId not provided" };
      const option = productBuilderBlueprintOption(blueprintId);
      await safeLog(ctx, {
        companyId,
        message: `COS Blueprint Product Builder blueprint selected: ${option.label}`,
        entityType: projectId ? "project" : "plugin",
        entityId: projectId ?? PLUGIN_ID,
        metadata: {
          plugin: PLUGIN_ID,
          projectId: projectId ?? null,
          ...productBuilderBlueprintMetadata(blueprintId),
          slotMetadataUpdated: metadataUpdate.ok,
          slotMetadataError: metadataUpdate.ok ? null : metadataUpdate.error,
        },
      });
      return {
        ok: true,
        projectId: projectId ?? null,
        blueprintId,
        label: option.label,
        selectedAt,
        slotMetadataUpdated: metadataUpdate.ok,
        message: metadataUpdate.ok
          ? "Product Builder 제품 유형을 저장하고 Project document slot metadata를 갱신했습니다."
          : "Product Builder 제품 유형을 저장했습니다. PRD 문서 산출 시 Project document slot metadata에 반영됩니다.",
      };
    });

    ctx.actions.register(ACTION.runRequirementInventory, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      const scope = { companyId, projectId };
      const initial = await readState(ctx, scope);
      if (initial.sources.length === 0) throw new Error("at least one source material is required");

      const jobResult = await startJob(ctx, scope, { kind: "requirement-inventory", status: "running", startedAt: new Date().toISOString() }, async (job) => {
        const requirementInventory = await generateRequirementInventory({ sources: initial.sources });
        const committed = await withStateLock(scope, async (): Promise<boolean> => {
          const fresh = await readState(ctx, scope);
          if (!isCurrentJob(fresh, job)) return false;
          await writeState(ctx, scope, {
            ...fresh,
            requirementInventory,
            standardPlan: null,
            screenPlan: null,
            job: null,
          });
          return true;
        });
        if (!committed) return;
        await safeLog(ctx, {
          companyId,
          message: `COS Blueprint output inventory generated: ${requirementInventory.deliverables.length} deliverables / ${requirementInventory.items.length} source-backed items`,
          entityType: "plugin",
          entityId: projectId ?? PLUGIN_ID,
          metadata: {
            projectId: projectId ?? null,
            itemCount: requirementInventory.items.length,
            deliverableCount: requirementInventory.deliverables.length,
            deliverableUnitCount: requirementInventory.deliverables.reduce((sum, deliverable) => sum + deliverable.units.length, 0),
            sourceCount: requirementInventory.sourceCount,
            chunkCount: requirementInventory.chunkCount,
            usedFallback: requirementInventory.usedFallback === true,
          },
        });
      });
      return jobResult;
    });

    ctx.actions.register(ACTION.runStandardPlan, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      const scope = { companyId, projectId };
      const title = stringValue(record.title);
      const initial = await readState(ctx, scope);
      if (initial.sources.length === 0) throw new Error("at least one source material is required");

      // LLM 생성은 30s RPC 타임아웃을 넘기므로 fire-and-forget. UI는 job 상태를 폴링한다.
      const jobResult = await startJob(ctx, scope, { kind: "standard-plan", status: "running", startedAt: new Date().toISOString() }, async (job) => {
        const requirementInventory = initial.requirementInventory
          ?? await generateRequirementInventory({ sources: initial.sources });
        const standardPlan = await generateStandardPlan({
          title,
          sources: initial.sources,
          productBuilderBlueprintId: initial.productBuilderBlueprintId,
          requirementInventory,
        });
        const committed = await withStateLock(scope, async (): Promise<boolean> => {
          const fresh = await readState(ctx, scope);
          if (!isCurrentJob(fresh, job)) return false;
          // PRD/계약 기준선이 바뀌면 기존 화면정의서는 stale → 무효화.
          await writeState(ctx, scope, { ...fresh, requirementInventory, standardPlan, screenPlan: null, job: null });
          return true;
        });
        if (!committed) return;
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
            requirementInventoryItemCount: requirementInventory.items.length,
            outputInventoryUnitCount: requirementInventory.deliverables.reduce((sum, deliverable) => sum + deliverable.units.length, 0),
            usedFallback: standardPlan.usedFallback === true,
          },
        });
      });
      return jobResult;
    });

    ctx.actions.register(ACTION.confirmStandardPlan, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      const scope = { companyId, projectId };
      let selectedProductBuilderBlueprintId = DEFAULT_PRODUCT_BUILDER_BLUEPRINT_ID;
      let selectedProductBuilderBlueprintSelectedAt: string | null = null;
      const confirmed = await withStateLock(scope, async (): Promise<StandardPlan> => {
        const fresh = await readState(ctx, scope);
        if (!fresh.standardPlan) throw new Error("PRD/계약 산출물을 먼저 생성하세요.");
        selectedProductBuilderBlueprintId = fresh.productBuilderBlueprintId;
        selectedProductBuilderBlueprintSelectedAt = fresh.productBuilderBlueprintSelectedAt;
        const standardPlan: StandardPlan = { ...fresh.standardPlan, confirmedAt: new Date().toISOString() };
        await writeState(ctx, scope, {
          ...fresh,
          standardPlan,
          projectDocumentSlots: fresh.projectDocumentSlots.map((slot) => (
            slot.slotKey === "deliverable.prd"
              ? { ...slot, status: "approved", updatedAt: standardPlan.confirmedAt as string }
              : slot
          )),
        });
        return standardPlan;
      });
      if (projectId) {
        await ctx.projects.documentSlots.update(projectId, "deliverable.prd", {
          status: "approved",
          metadata: {
            plugin: PLUGIN_ID,
            ...productBuilderBlueprintMetadata(selectedProductBuilderBlueprintId),
            productBuilderBlueprintSelectedAt: selectedProductBuilderBlueprintSelectedAt ?? confirmed.generatedAt,
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
      const scope = { companyId, projectId };
      const state = await readState(ctx, scope);
      if (!state.standardPlan) throw new Error("PRD/계약 산출물을 먼저 생성하세요.");

      const docs = {
        ...renderBlueprintStandardDocuments(),
        ...renderStandardPlanDocuments(state.standardPlan, state.requirementInventory),
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

      const files = Object.keys(docs);
      await importProjectDocumentsToSlots(ctx, companyId, projectId, docs, slots, {
        phase: "standard-plan",
        projectTitle: state.standardPlan.projectTitle,
        confirmedAt: state.standardPlan.confirmedAt ?? null,
        generatedAt: state.standardPlan.generatedAt,
        ...productBuilderBlueprintMetadata(state.productBuilderBlueprintId),
        productBuilderBlueprintSelectedAt: state.productBuilderBlueprintSelectedAt ?? state.standardPlan.generatedAt,
      });
      await withStateLock(scope, async () => {
        const fresh = await readState(ctx, scope);
        await writeState(ctx, scope, {
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
        workspacePath: null,
        files,
        slots,
        message: `고정 기준 문서와 프로젝트 산출물 ${files.length}건을 Project document slot에 기록했습니다.`,
      } satisfies ProjectDocumentUpdateResult;
    });

    // 분석 ②단계. PRD 기준선 확정 후에만 화면정의서 전체를 생성한다. (fire-and-forget)
    ctx.actions.register(ACTION.runScreens, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      const scope = { companyId, projectId };
      const initial = await readState(ctx, scope);
      if (!initial.standardPlan) throw new Error("PRD/계약 산출물을 먼저 생성하세요.");
      if (!initial.standardPlan.confirmedAt) {
        throw new Error("PRD 기준선이 확정되지 않아 화면정의서를 생성할 수 없습니다.");
      }
      const standardPlan = initial.standardPlan;
      const pinnedGeneratedAt = standardPlan.generatedAt;

      const jobResult = await startJob(ctx, scope, { kind: "screens", status: "running", startedAt: new Date().toISOString() }, async (job) => {
        const screenPlan = await generateScreenPlan({
          standardPlan,
          sources: initial.sources,
          requirementInventory: initial.requirementInventory,
        });
        const commitStatus = await withStateLock(scope, async (): Promise<"committed" | "stale-data" | "stale-job"> => {
          const fresh = await readState(ctx, scope);
          if (!isCurrentJob(fresh, job)) return "stale-job";
          // LLM 호출 동안 PRD/계약 기준선이 재생성/무효화됐으면 stale screenPlan을 되살리지 않는다.
          if (!fresh.standardPlan?.confirmedAt || fresh.standardPlan.generatedAt !== pinnedGeneratedAt) {
            return "stale-data";
          }
          await writeState(ctx, scope, { ...fresh, screenPlan: { ...screenPlan, reviews: {} }, job: null });
          return "committed";
        });
        if (commitStatus === "stale-job") return;
        if (commitStatus === "stale-data") {
          throw new Error("PRD/계약 기준선이 변경되어 화면정의서 생성을 취소했습니다. 다시 시도하세요.");
        }
        await safeLog(ctx, {
          companyId,
          message: `COS Blueprint screens generated for ${standardPlan.projectTitle}`,
          entityType: "plugin",
          entityId: PLUGIN_ID,
          metadata: { screenCount: screenPlan.screens.length, usedFallback: screenPlan.usedFallback === true },
        });
      });
      return jobResult;
    });

    ctx.actions.register(ACTION.writeScreenDocs, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      const scope = { companyId, projectId };
      const state = await readState(ctx, scope);
      if (!state.standardPlan) throw new Error("PRD/계약 산출물을 먼저 생성하세요.");
      if (!state.standardPlan.confirmedAt) {
        throw new Error("PRD 기준선이 확정되지 않아 화면정의서 문서를 산출할 수 없습니다.");
      }
      if (!state.screenPlan) throw new Error("화면정의서를 먼저 생성하세요.");

      const docs = renderScreenDocuments(state.screenPlan, state.standardPlan.projectTitle);
      const allScreensApproved = screenPlanAllScreensApproved(state.screenPlan);
      const screenDocsStatus = allScreensApproved ? "ready" : "draft";
      const screenPlanConfirmedAt = allScreensApproved
        ? state.screenPlan.confirmedAt ?? new Date().toISOString()
        : state.screenPlan.confirmedAt;
      const slots = projectSlotUpdatesForDocuments(docs, screenDocsStatus);
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

      const files = Object.keys(docs);
      await importProjectDocumentsToSlots(ctx, companyId, projectId, docs, slots, {
        phase: "screen-definitions",
        projectTitle: state.standardPlan.projectTitle,
        screenCount: state.screenPlan.screens.length,
        screenReviewStatus: allScreensApproved ? "approved" : "draft",
        confirmedAt: screenPlanConfirmedAt,
      });
      await withStateLock(scope, async () => {
        const fresh = await readState(ctx, scope);
        await writeState(ctx, scope, {
          ...fresh,
          screenPlan: fresh.screenPlan && allScreensApproved
            ? { ...fresh.screenPlan, confirmedAt: screenPlanConfirmedAt }
            : fresh.screenPlan,
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
        workspacePath: null,
        files,
        slots,
        message: `화면정의서 문서 ${files.length}건을 Project document slot에 기록했습니다.`,
      } satisfies ProjectDocumentUpdateResult;
    });

    // 화면정의서 리뷰: 화면별 피드백 코멘트/상태 기록 (LLM 없음).
    ctx.actions.register(ACTION.reviewScreen, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      const scope = { companyId, projectId };
      const screenCode = stringValue(record.screenCode);
      if (!screenCode) throw new Error("screenCode is required");
      const comment = stringValue(record.comment);
      const rawStatus = stringValue(record.status);
      const status = rawStatus === "pending" || rawStatus === "approved" || rawStatus === "changes-requested"
        ? rawStatus
        : undefined;

      const review = await withStateLock(scope, async (): Promise<ScreenReview> => {
        const fresh = await readState(ctx, scope);
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
        await writeState(ctx, scope, { ...fresh, screenPlan: { ...fresh.screenPlan, reviews } });
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
      const projectId = stringValue(record.projectId);
      const scope = { companyId, projectId };
      const screenCode = stringValue(record.screenCode);
      if (!screenCode) throw new Error("screenCode is required");
      const feedback = stringValue(record.feedback) ?? "";

      const initial = await readState(ctx, scope);
      if (!initial.standardPlan?.confirmedAt) {
        throw new Error("PRD 기준선이 확정되지 않아 화면을 재생성할 수 없습니다.");
      }
      if (!initial.screenPlan) throw new Error("화면정의서를 먼저 생성하세요.");
      const target = initial.screenPlan.screens.find((s) => s.code === screenCode);
      if (!target) throw new Error(`화면 코드를 찾을 수 없습니다: ${screenCode}`);

      const pinnedGeneratedAt = initial.screenPlan.generatedAt;
      const standardPlan = initial.standardPlan;

      // 단일 화면 LLM 재생성도 30s를 넘길 수 있어 fire-and-forget.
      const jobResult = await startJob(ctx, scope, { kind: "screen", status: "running", screenCode, startedAt: new Date().toISOString() }, async (job) => {
        const newScreen = await generateSingleScreen({ standardPlan, sources: initial.sources, screen: target, feedback });
        const commitStatus = await withStateLock(scope, async (): Promise<"committed" | "stale-data" | "stale-job"> => {
          const fresh = await readState(ctx, scope);
          if (!isCurrentJob(fresh, job)) return "stale-job";
          if (!fresh.standardPlan?.confirmedAt || !fresh.screenPlan
            || fresh.screenPlan.generatedAt !== pinnedGeneratedAt
            || !fresh.screenPlan.screens.some((s) => s.code === screenCode)) {
            return "stale-data";
          }
          const screens = fresh.screenPlan.screens.map((s) => (s.code === screenCode ? newScreen : s));
          const reviews = { ...(fresh.screenPlan.reviews ?? {}) };
          const prev = reviews[screenCode] ?? { status: "pending" as const, comments: [], updatedAt: "" };
          reviews[screenCode] = { ...prev, status: "pending", updatedAt: new Date().toISOString() };
          await writeState(ctx, scope, { ...fresh, screenPlan: { ...fresh.screenPlan, screens, reviews }, job: null });
          return "committed";
        });
        if (commitStatus === "stale-job") return;
        if (commitStatus === "stale-data") {
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
      return jobResult;
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

      const state = await readState(ctx, { companyId, projectId });
      const source = state.sources.find((entry) => entry.id === sourceId);
      const miss = (message: string): SourceOriginalDownload => ({
        ok: false,
        fileName: source?.fileName ?? null,
        contentType: source?.originalContentType ?? null,
        dataBase64: null,
        message,
      });
      if (!source?.originalPath) return miss("보관된 원본이 없습니다.");
      // Legacy original archive only: old sources may still point at a project workspace file.
      // New registrations store extracted text in Project document slots and leave originalPath empty.
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
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      const scope = { companyId, projectId };
      await withStateLock(scope, async () => {
        await writeState(ctx, scope, emptyState());
      });
      await safeLog(ctx, {
        companyId,
        message: "COS Blueprint state reset",
        entityType: "plugin",
        entityId: PLUGIN_ID,
        metadata: { projectId: projectId ?? null },
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

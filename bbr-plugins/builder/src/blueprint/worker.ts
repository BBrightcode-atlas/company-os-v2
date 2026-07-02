import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { definePlugin, type PluginAgentRun } from "@paperclipai/plugin-sdk";
import { BUILDER_MANAGED_AGENT_ADAPTER_TYPE, BUILDER_MANAGED_AGENT_MODEL, reconcileBuilderAgentApplyingDrift } from "../managed-resources.js";
import { reconcileManagedSkillResettingDrift } from "../managed-skill-sync.js";
import { buildBlueprintProductTasks, buildClassicPlan, agentKeyForTask, assigneeForTask, roleKeyForTask, type BlueprintProductBuild } from "./build-plan-mapper.js";
import {
  issueStatusForDecision,
  renderTaskListMarkdown,
  buildIssueDescription,
  buildRootIssueDescription,
  PRODUCT_BUILDER_TASK_LIST_SLOT_KEY,
  BUILDER_AGENT_KEY,
  BUILDER_BACKEND_AGENT_KEY,
  BUILDER_FRONTEND_AGENT_KEY,
  BUILDER_PLATFORM_AGENT_KEY,
  BUILDER_AI_AGENT_KEY,
  BUILDER_QA_AGENT_KEY,
  type CreatedIssueSummary,
} from "../workflow-tasks/index.js";
import {
  PRD_STAGE_WORKFLOWS,
  runDeliverableWorkflows,
  type BlueprintStageContext,
  type DeliverableWorkflowEffects,
} from "./deliverable-workflows/index.js";
import {
  ACTION,
  BLUEPRINT_AGENT_KEYS,
  BLUEPRINT_PM_AGENT_KEY,
  BLUEPRINT_PM_SKILL_KEY,
  BLUEPRINT_PROJECT_KEY,
  BLUEPRINT_ROUTINE_KEYS,
  BLUEPRINT_SKILL_KEYS,
  DATA,
  DEFAULT_PRODUCT_BUILDER_BLUEPRINT_ID,
  DEFAULT_PRODUCT_BUILDER_BASE_PACKAGE_KEYS,
  DEFAULT_AGENT_GUIDELINES,
  AGENT_GUIDELINE_ROLE_KEYS,
  emptyAgentRoleGuidelines,
  MAX_ORIGINAL_BYTES,
  PLUGIN_ID,
  PLUGIN_VERSION,
  PROJECT_DOCUMENT_SLOT_DEFINITIONS,
  SOURCE_FORMATS,
  SOURCE_TYPES,
  STATE_KEY,
  SUBMIT_BLUEPRINT_PRD_TOOL,
  buildFallbackScreenPlan,
  buildFallbackRequirementInventory,
  buildFallbackPrd,
  buildBlueprintWorkflowPanel,
  buildOverview,
  buildBlueprintPmAgentPrdPrompt,
  buildScreenAwarePrd,
  buildScreenPrompt,
  buildScreenRegenPrompt,
  blueprintPmChatChannel,
  canonicalizeRequirementInventory,
  emptyState,
  isAllowedCompany,
  normalizeRequirementInventoryJson,
  normalizeScreenDefinition,
  normalizeScreenPlanJson,
  normalizePrdJson,
  normalizeProductBuilderBlueprintId,
  normalizeProductBuilderBasePackageKeys,
  mergeProjectDocumentSlotUpdates,
  productBuilderBasePackageMetadata,
  productBuilderBasePackageSelections,
  productBuilderBlueprintMetadata,
  productBuilderBlueprintOption,
  projectSlotUpdateForSource,
  projectSlotUpdatesForDocuments,
  repairGenericScreenPlanFromSources,
  renderBlueprintStandardDocuments,
  renderScreenDocuments,
  renderSourceDocument,
  renderPrdDocuments,
  REVISION_TOOL,
  screenPlanAllScreensApproved,
  screenPlanToScreenModel,
  SCREEN_PLAN_TOOL,
  SCREEN_REGEN_TOOL,
  sourceDocPath,
  sourceDocPathCandidates,
  type BlueprintJob,
  type BlueprintLlmTool,
  type BlueprintPmChatStreamEvent,
  type CosBlueprintState,
  type BlueprintTaskListBuildSnapshot,
  type AgentRoleGuidelines,
  type AgentGuidelineRoleKey,
  type ProjectDocumentSlotKey,
  type ProjectDocumentUpdateResult,
  type ProjectDocumentSlotsView,
  type ProjectDocumentSlotUpdate,
  type ProjectDocumentSlotViewerRow,
  type ProjectSummary,
  type ProductBuilderBlueprintId,
  type ProductBuilderBasePackageKey,
  type RequirementInventory,
  type ScreenDefinition,
  type ScreenPlan,
  type ScreenReview,
  type SourceDocumentDeleteResult,
  type SourceDocumentRegisterResult,
  extractIntakeLinks,
  type SourceFormat,
  type SourceMaterial,
  type SourceOriginalDownload,
  type SourceType,
  type BlueprintPrd,
} from "./contract.js";
import {
  buildDeliverableRevisionPrompt,
  buildPmRevisionMetadata,
  isPmChatDeliverableGenerationRequest,
  isPmChatDeliverableRevisionRequest,
  isRegenerationRequest,
  normalizeRevisionOutput,
} from "./pm-revision.js";
import { fetchNotionSharedPageSource, isNotionSharedPageUrl } from "./source-intake/notion.js";
import { resolveSourceIntakeWorkflow } from "./source-intake/registry.js";
import { fetchUrlSource, normalizeSourceUrl } from "./source-intake/url.js";
import {
  buildFigmaAuthorizeUrl,
  exchangeFigmaCode,
  figmaMcpExtract,
  figmaMcpReasonMessage,
  generatePkce,
  parseFigmaTarget,
  randomState,
  refreshFigmaToken,
  registerFigmaOAuthClient,
  type FigmaMcpReason,
  type FigmaOAuthClient,
  type FigmaToken,
} from "./figma-mcp.js";

type AnyCtx = Parameters<NonNullable<Parameters<typeof definePlugin>[0]["setup"]>>[0];

type FigmaSession = { token: FigmaToken; client?: FigmaOAuthClient };
const figmaSessions = new Map<string, FigmaSession>();
const figmaPendingAuth = new Map<string, { verifier: string; client: FigmaOAuthClient; redirectUri: string; companyId: string }>();

async function resolveFigmaToken(companyId: string): Promise<string | null> {
  const session = figmaSessions.get(companyId);
  if (session) {
    const { token, client } = session;
    const expired = token.expiresAt !== undefined && token.expiresAt < Date.now() + 30_000;
    if (!expired) return token.accessToken;
    if (token.refreshToken && client) {
      try {
        const next = await refreshFigmaToken({ client, refreshToken: token.refreshToken });
        figmaSessions.set(companyId, { token: next, client });
        return next.accessToken;
      } catch {
        figmaSessions.delete(companyId);
      }
    } else {
      figmaSessions.delete(companyId);
    }
  }
  const envToken = process.env.COS_FIGMA_TOKEN;
  return envToken && envToken.trim() ? envToken.trim() : null;
}

const LLM_BASE = (process.env.ANTHROPIC_BASE_URL || "http://localhost:8317").replace(/\/+$/, "");
const LLM_KEY = process.env.ANTHROPIC_API_KEY || "no-key-required";
const LLM_MODEL = BUILDER_MANAGED_AGENT_MODEL;
const BLUEPRINT_LLM_TIMEOUT_MS = boundedIntegerFromEnv("COS_BLUEPRINT_LLM_TIMEOUT_MS", 20_000, 5_000, 28_000);
const BLUEPRINT_STAGED_LLM_TIMEOUT_MS = boundedIntegerFromEnv("COS_BLUEPRINT_STAGED_LLM_TIMEOUT_MS", 170_000, 30_000, 300_000);
const STAGED_PRD_SLOTS_PENDING_MESSAGE = "COS_BLUEPRINT_STAGED_PRD_SLOTS_PENDING";
const BLUEPRINT_JOB_STALE_MS = boundedIntegerFromEnv("COS_BLUEPRINT_JOB_STALE_MS", 10 * 60_000, 60_000, 60 * 60_000);
const PM_CHAT_LLM_TIMEOUT_MS = boundedIntegerFromEnv("COS_BLUEPRINT_PM_CHAT_TIMEOUT_MS", 24_000, 5_000, 28_000);
const PM_CHAT_MAX_TOKENS = boundedIntegerFromEnv("COS_BLUEPRINT_PM_CHAT_MAX_TOKENS", 1200, 256, 4096);
const PM_REVISION_BODY_MAX_CHARS = boundedIntegerFromEnv("COS_BLUEPRINT_PM_REVISION_BODY_MAX_CHARS", 45_000, 8_000, 120_000);
const PM_REVISION_SOURCE_BODY_MAX_CHARS = boundedIntegerFromEnv("COS_BLUEPRINT_PM_REVISION_SOURCE_BODY_MAX_CHARS", 18_000, 2_000, 48_000);
const PM_REVISION_MAX_TOKENS = boundedIntegerFromEnv("COS_BLUEPRINT_PM_REVISION_MAX_TOKENS", 16000, 4000, 24000);

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

function boundedIntegerFromEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
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

function productBuilderBasePackageKeys(value: unknown): ProductBuilderBasePackageKey[] {
  return normalizeProductBuilderBasePackageKeys(value);
}

function markdownValue(value: unknown): string {
  return typeof value === "string" ? value.replace(/\r\n/g, "\n").trim() : "";
}

const FIGMA_API_BASE = "https://api.figma.com";
const FIGMA_FETCH_TIMEOUT_MS = 15_000;
const FIGMA_MAX_TEXTS = 400;
const FIGMA_MAX_LINES = 1_200;
const FIGMA_SOURCE_BODY_CAP = 120_000;

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
  const body = parts.join("\n\n").slice(0, FIGMA_SOURCE_BODY_CAP);
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
const STALE_JOB_MESSAGE = `작업이 ${Math.round(BLUEPRINT_JOB_STALE_MS / 60_000)}분 안에 완료되지 않아 중단된 것으로 표시했습니다. 다시 실행하세요.`;
const ACTIVE_PROJECT_DOCUMENT_SLOT_KEYS = new Set(PROJECT_DOCUMENT_SLOT_DEFINITIONS.map((definition) => definition.slotKey));

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
  if (!Number.isFinite(startedAtMs)) return { ...normalized, status: "error", message: INTERRUPTED_JOB_MESSAGE };
  if (Date.now() - startedAtMs > BLUEPRINT_JOB_STALE_MS) {
    return { ...normalized, status: "error", message: STALE_JOB_MESSAGE };
  }
  if (stringValue(normalized.agentRunId)) {
    return normalized;
  }
  if (startedAtMs >= WORKER_STARTED_AT.getTime()) {
    return normalized;
  }

  return {
    ...normalized,
    status: "error",
    message: INTERRUPTED_JOB_MESSAGE,
  };
}

function normalizeAgentRoleGuidelines(value: unknown): AgentRoleGuidelines {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const result = emptyAgentRoleGuidelines();
  for (const role of AGENT_GUIDELINE_ROLE_KEYS) {
    const saved = markdownValue(record[role]);
    result[role] = saved.length > 0 ? saved : DEFAULT_AGENT_GUIDELINES[role];
  }
  return result;
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
  return {
    sources,
    productBuilderBlueprintId: normalizeProductBuilderBlueprintId(state.productBuilderBlueprintId),
    productBuilderBlueprintSelectedAt: typeof state.productBuilderBlueprintSelectedAt === "string" ? state.productBuilderBlueprintSelectedAt : null,
    productBuilderBasePackageKeys: normalizeProductBuilderBasePackageKeys(state.productBuilderBasePackageKeys ?? DEFAULT_PRODUCT_BUILDER_BASE_PACKAGE_KEYS),
    agentGuidelinesMarkdown: markdownValue(state.agentGuidelinesMarkdown),
    agentRoleGuidelines: normalizeAgentRoleGuidelines(state.agentRoleGuidelines),
    requirementInventory,
    prd: state.prd ?? null,
    screenPlan: state.screenPlan ?? null,
    taskListBuild: state.taskListBuild ?? null,
    projectDocumentSlots: Array.isArray(state.projectDocumentSlots)
      ? (state.projectDocumentSlots as ProjectDocumentSlotUpdate[]).filter((slot) => ACTIVE_PROJECT_DOCUMENT_SLOT_KEYS.has(slot.slotKey))
      : [],
    job: recoverInterruptedJob(state.job),
    stagedPendingSlotKeys: Array.isArray(state.stagedPendingSlotKeys)
      ? (state.stagedPendingSlotKeys as unknown[]).filter(
          (key): key is ProjectDocumentSlotKey => ACTIVE_PROJECT_DOCUMENT_SLOT_KEYS.has(key as ProjectDocumentSlotKey),
        )
      : null,
    updatedAt: state.updatedAt ?? null,
  };
}

function stateHasContent(state: CosBlueprintState): boolean {
  return state.sources.length > 0
    || Boolean(state.agentGuidelinesMarkdown.trim())
    || Boolean(state.requirementInventory)
    || Boolean(state.prd)
    || Boolean(state.screenPlan)
    || state.projectDocumentSlots.length > 0
    || Boolean(state.job);
}

const SOURCE_SLOT_KEYS = PROJECT_DOCUMENT_SLOT_DEFINITIONS
  .filter((definition) => definition.group === "source")
  .map((definition) => definition.slotKey);

const DELIVERABLE_SLOT_KEYS = PROJECT_DOCUMENT_SLOT_DEFINITIONS
  .filter((definition) => definition.group === "deliverable")
  .map((definition) => definition.slotKey);

const SOURCE_ENTRY_METADATA_KEYS = [
  "sourceId",
  "sourceTitle",
  "sourceType",
  "sourceFormat",
  "sourceIntakeWorkflow",
  "sourceFingerprint",
  "bodyLength",
  "sourceUrl",
  "sourceFetchStatus",
  "sourceFetchedAt",
  "fileName",
  "documentRef",
  "originalPath",
] as const;

function sourceSlotKeyFromValue(value: unknown): ProjectDocumentSlotKey | null {
  const slotKey = stringValue(value);
  if (!slotKey || !SOURCE_SLOT_KEYS.includes(slotKey as ProjectDocumentSlotKey)) return null;
  return slotKey as ProjectDocumentSlotKey;
}

function projectDocumentSlotKeyFromValue(value: unknown): ProjectDocumentSlotKey | null {
  const slotKey = stringValue(value);
  if (!slotKey || !ACTIVE_PROJECT_DOCUMENT_SLOT_KEYS.has(slotKey as ProjectDocumentSlotKey)) return null;
  return slotKey as ProjectDocumentSlotKey;
}

function deliverableSlotKeyFromValue(value: unknown): ProjectDocumentSlotKey | null {
  const slotKey = projectDocumentSlotKeyFromValue(value);
  if (!slotKey || !DELIVERABLE_SLOT_KEYS.includes(slotKey)) return null;
  return slotKey;
}

function deliverableStatusFromValue(value: unknown): "draft" | "approved" | null {
  return value === "draft" || value === "approved" ? value : null;
}

function statusForManualDocumentSave(status: unknown): ProjectDocumentSlotUpdate["status"] {
  if (status === "ready" || status === "approved") return "ready";
  if (status === "empty" || status === "n/a") return "draft";
  return "draft";
}

function extractSourceBodyFromRenderedMarkdown(value: string): string {
  const match = /^## 본문\(Body\)\s*$/m.exec(value);
  if (!match) return value.trim();
  return value.slice(match.index + match[0].length).replace(/^\n+/, "").trim();
}

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
    if (sourceDocPathCandidates(source, scope.projectId).some((ref) => sourceRefs.has(ref))) return true;
    return source.body.length > 0 && joinedBody.includes(source.body);
  });
  if (sources.length === 0) return null;

  return {
    ...legacy,
    sources,
    requirementInventory: null,
    prd: null,
    screenPlan: null,
    taskListBuild: null,
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
  basePackageKeys: readonly ProductBuilderBasePackageKey[],
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
        ...productBuilderBasePackageMetadata(basePackageKeys),
        productBuilderBlueprintSelectedAt: selectedAt,
      },
    }, companyId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

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

async function prepareSourceMaterialFromWorkflowInput(
  record: Record<string, unknown>,
  companyId: string,
): Promise<{ source: SourceMaterial; fingerprint: string; metadata: Record<string, unknown> }> {
  let title = stringValue(record.title);
  const url = normalizeSourceUrl(record.url);
  const bodyInput = stringValue(record.body);
  if (!title) throw new Error("title is required");
  if (!bodyInput && !url) throw new Error("body or url is required");

  const requestedFormat = sourceFormat(record.format ?? (url ? (isFigmaUrl(url) ? "figma" : isNotionSharedPageUrl(url) ? "notion" : "url") : undefined));
  const intakeWorkflow = resolveSourceIntakeWorkflow({
    requestedWorkflow: record.intakeWorkflow,
    format: requestedFormat,
    url,
    fileName: stringValue(record.fileName),
    hasBody: Boolean(bodyInput),
  });
  const format = intakeWorkflow.id === "notion_shared_page" || intakeWorkflow.id === "figma"
    ? intakeWorkflow.format
    : requestedFormat;
  let body = bodyInput ?? "";
  let fetchStatus: SourceMaterial["fetchStatus"] | undefined;
  let fetchedAt: string | undefined;
  let fetchError: string | undefined;
  let intakeLinks: SourceMaterial["links"] | undefined;
  let extraMetadata: Record<string, unknown> = {};
  let figmaFileKey: string | undefined;
  let figmaNodeId: string | undefined;

  if (url && intakeWorkflow.id === "figma") {
    const token = stringValue(record.figmaToken) ?? await resolveFigmaToken(companyId);
    if (!token) {
      throw new Error(figmaMcpReasonMessage("auth_required"));
    }
    let target: { fileKey: string; nodeId: string | null };
    try {
      target = parseFigmaTarget(url);
    } catch (error) {
      const reason = (error as { figmaMcpReason?: FigmaMcpReason }).figmaMcpReason ?? "invalid_url";
      throw new Error(figmaMcpReasonMessage(reason, error instanceof Error ? error.message : undefined));
    }
    let normalized: Awaited<ReturnType<typeof figmaMcpExtract>>;
    try {
      normalized = await figmaMcpExtract(token, target.fileKey, target.nodeId);
    } catch (error) {
      const reason = (error as { figmaMcpReason?: FigmaMcpReason }).figmaMcpReason ?? "mcp_error";
      if (reason === "auth_required") figmaSessions.delete(companyId);
      throw new Error(figmaMcpReasonMessage(reason, error instanceof Error ? error.message : undefined));
    }
    if (normalized.screenCount === 0) {
      throw new Error("Figma 에서 화면(프레임)을 찾지 못했습니다. 파일에 프레임이 있는지, 또는 특정 프레임 링크로 다시 시도하세요.");
    }
    title = `Figma: ${normalized.fileName}`.slice(0, 120);
    fetchStatus = "fetched";
    fetchedAt = new Date().toISOString();
    body = [`## Figma URL`, url, normalized.body].join("\n\n");
    extraMetadata = {
      figmaScreenCount: normalized.screenCount,
      figmaSections: normalized.sections,
    };
    figmaFileKey = target.fileKey;
    figmaNodeId = target.nodeId ?? undefined;
  } else if (url && intakeWorkflow.id === "notion_shared_page") {
    const shouldFetch = record.fetchUrl !== false;
    if (shouldFetch) {
      const notion = await fetchNotionSharedPageSource(url);
      if (notion.title) title = notion.title;
      fetchStatus = notion.fetchStatus;
      fetchedAt = notion.fetchedAt;
      fetchError = notion.fetchError;
      intakeLinks = extractIntakeLinks(notion.metadata);
      body = [
        body ? "## 등록 메모(Notes)" : null,
        body || null,
        notion.body,
      ].filter((line): line is string => line !== null).join("\n\n");
    } else {
      fetchStatus = "not_fetched";
      body = [
        body || null,
        "## 노션 공유페이지(Notion Shared Page)",
        url,
      ].filter((line): line is string => line !== null).join("\n\n");
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
    intakeWorkflow: intakeWorkflow.id,
    fetchStatus,
    fetchedAt,
    fetchError,
    figmaFileKey,
    figmaNodeId,
  };
  const fingerprint = sourceFingerprint(source);
  source.fingerprint = fingerprint;
  if (intakeLinks) source.links = intakeLinks;
  return { source, fingerprint, metadata: extraMetadata };
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

type SourceReplacementKey = {
  kind: "url" | "file";
  value: string;
  sourceType: SourceType;
};

function normalizeSourceFileName(value: string | undefined): string | null {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized || null;
}

function safeNormalizeSourceUrl(value: unknown): string | null {
  try {
    return normalizeSourceUrl(value) ?? null;
  } catch {
    return null;
  }
}

function sourceReplacementKey(source: SourceMaterial): SourceReplacementKey | null {
  const url = safeNormalizeSourceUrl(source.url);
  if (url) return { kind: "url", value: url, sourceType: source.type };
  const fileName = normalizeSourceFileName(source.fileName);
  if (fileName) return { kind: "file", value: fileName, sourceType: source.type };
  return null;
}

function sourceEntryMatchesReplacementSource(entry: Record<string, unknown>, source: SourceMaterial): boolean {
  const key = sourceReplacementKey(source);
  if (!key) return false;
  if (stringValue(entry.sourceType) !== key.sourceType) return false;
  if (key.kind === "url") return safeNormalizeSourceUrl(entry.sourceUrl) === key.value;
  return normalizeSourceFileName(stringValue(entry.fileName)) === key.value && !safeNormalizeSourceUrl(entry.sourceUrl);
}

function sourceMatchesReplacementSource(candidate: SourceMaterial, source: SourceMaterial): boolean {
  const candidateKey = sourceReplacementKey(candidate);
  const sourceKey = sourceReplacementKey(source);
  return Boolean(candidateKey && sourceKey
    && candidateKey.kind === sourceKey.kind
    && candidateKey.value === sourceKey.value
    && candidateKey.sourceType === sourceKey.sourceType);
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

function createSourceDeletionTarget(input?: {
  sourceId?: string | null;
  documentRef?: string | null;
  fingerprint?: string | null;
}): SourceDeletionTarget {
  return {
    sourceIds: new Set(input?.sourceId ? [input.sourceId] : []),
    documentRefs: new Set(input?.documentRef ? [input.documentRef] : []),
    fingerprints: new Set(input?.fingerprint ? [input.fingerprint] : []),
    bodies: [],
  };
}

type SourceDeletionTarget = {
  sourceIds: Set<string>;
  documentRefs: Set<string>;
  fingerprints: Set<string>;
  bodies: string[];
};

function addSourceToDeletionTarget(target: SourceDeletionTarget, source: SourceMaterial, projectId?: string | null): void {
  target.sourceIds.add(source.id);
  for (const documentRef of sourceDocPathCandidates(source, projectId)) target.documentRefs.add(documentRef);
  if (source.fingerprint) target.fingerprints.add(source.fingerprint);
  if (source.body) target.bodies.push(source.body);
}

function addSourceEntryToDeletionTarget(target: SourceDeletionTarget, entry: Record<string, unknown>): void {
  const sourceId = stringValue(entry.sourceId);
  const documentRef = sourceEntryDocumentRef(entry);
  const fingerprint = stringValue(entry.sourceFingerprint);
  if (sourceId) target.sourceIds.add(sourceId);
  if (documentRef) target.documentRefs.add(documentRef);
  if (fingerprint) target.fingerprints.add(fingerprint);
}

function sourceDeletionTargetHasAnyIdentifier(target: SourceDeletionTarget): boolean {
  return target.sourceIds.size > 0
    || target.documentRefs.size > 0
    || target.fingerprints.size > 0
    || target.bodies.length > 0;
}

function buildReplacementTargetForSource(input: {
  source: SourceMaterial;
  projectId: string;
  entries: Record<string, unknown>[];
  sources: SourceMaterial[];
}): SourceDeletionTarget | null {
  if (!sourceReplacementKey(input.source)) return null;
  const target = createSourceDeletionTarget();
  for (const entry of input.entries) {
    if (sourceEntryMatchesReplacementSource(entry, input.source)) addSourceEntryToDeletionTarget(target, entry);
  }
  for (const existingSource of input.sources) {
    if (sourceMatchesReplacementSource(existingSource, input.source)) {
      addSourceToDeletionTarget(target, existingSource, input.projectId);
    }
  }
  return sourceDeletionTargetHasAnyIdentifier(target) ? target : null;
}

function sourceEntryMatchesDeletionTarget(
  entry: Record<string, unknown>,
  target: SourceDeletionTarget,
): boolean {
  const sourceId = stringValue(entry.sourceId);
  if (sourceId && target.sourceIds.has(sourceId)) return true;
  const documentRef = sourceEntryDocumentRef(entry);
  if (documentRef && target.documentRefs.has(documentRef)) return true;
  const fingerprint = stringValue(entry.sourceFingerprint);
  if (fingerprint && target.fingerprints.has(fingerprint)) return true;
  return false;
}

function sourceMatchesDeletionTarget(source: SourceMaterial, target: SourceDeletionTarget, projectId?: string | null): boolean {
  if (target.sourceIds.has(source.id)) return true;
  if (source.fingerprint && target.fingerprints.has(source.fingerprint)) return true;
  return sourceDocPathCandidates(source, projectId).some((documentRef) => target.documentRefs.has(documentRef));
}

function splitSourceDocumentBlocks(body: string): string[] {
  const trimmed = body.trim();
  if (!trimmed) return [];
  return trimmed.split(/\n\n---\n\n(?=# 기획 자료\(Source Material\) - )/g);
}

function sourceDocumentBlockHasStrongDeletionMatch(block: string, target: SourceDeletionTarget): boolean {
  for (const fingerprint of target.fingerprints) {
    if (block.includes(fingerprint)) return true;
  }
  for (const documentRef of target.documentRefs) {
    if (block.includes(documentRef)) return true;
  }
  return false;
}

function sourceDocumentBlockHasBodyFallbackMatch(block: string, target: SourceDeletionTarget): boolean {
  for (const body of target.bodies) {
    if (body && block.includes(body)) return true;
  }
  return false;
}

function removeExactSourceBodyFromBody(
  body: string,
  target: SourceDeletionTarget,
): { body: string; removedBodyBlock: boolean } | null {
  const current = body.trim();
  if (!current) return null;
  const separator = "\n\n---\n\n";
  const candidates = [...target.bodies]
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .sort((a, b) => b.length - a.length);

  for (const candidate of candidates) {
    if (current === candidate) return { body: "", removedBodyBlock: true };
    if (current.startsWith(`${candidate}${separator}`)) {
      return { body: current.slice(candidate.length + separator.length).trim(), removedBodyBlock: true };
    }
    if (current.endsWith(`${separator}${candidate}`)) {
      return { body: current.slice(0, current.length - candidate.length - separator.length).trim(), removedBodyBlock: true };
    }

    const middle = `${separator}${candidate}${separator}`;
    const middleIndex = current.indexOf(middle);
    if (middleIndex >= 0) {
      return {
        body: `${current.slice(0, middleIndex)}${separator}${current.slice(middleIndex + middle.length)}`.trim(),
        removedBodyBlock: true,
      };
    }
  }

  return null;
}

function removeSourceBlocksFromBody(
  body: string,
  target: SourceDeletionTarget,
): { body: string; removedBodyBlock: boolean } {
  const blocks = splitSourceDocumentBlocks(body);
  if (blocks.length === 0) return { body: "", removedBodyBlock: false };
  const exactBodyRemoval = removeExactSourceBodyFromBody(body, target);
  if (exactBodyRemoval) return exactBodyRemoval;

  const remainingStrong = blocks.filter((block) => !sourceDocumentBlockHasStrongDeletionMatch(block, target));
  if (remainingStrong.length !== blocks.length) {
    return {
      body: remainingStrong.join("\n\n---\n\n").trim(),
      removedBodyBlock: true,
    };
  }

  const bodyFallbackMatches = blocks
    .map((block, index) => ({ block, index }))
    .filter((entry) => sourceDocumentBlockHasBodyFallbackMatch(entry.block, target));
  if (bodyFallbackMatches.length !== 1) return { body: blocks.join("\n\n---\n\n").trim(), removedBodyBlock: false };
  const bodyMatchIndex = bodyFallbackMatches[0].index;
  const remaining = blocks.filter((_, index) => index !== bodyMatchIndex);
  return {
    body: remaining.join("\n\n---\n\n").trim(),
    removedBodyBlock: true,
  };
}

type SourceSlotMutationInput = {
  currentBody: string;
  currentMetadata: Record<string, unknown>;
  target?: SourceDeletionTarget | null;
  append?: {
    body: string;
    entry: Record<string, unknown>;
    documentRefs: string[];
  };
};

type SourceSlotMutationResult = {
  body: string;
  documentRefs: string[];
  sourceEntries: Record<string, unknown>[];
  removedEntries: Record<string, unknown>[];
  removedBodyBlock: boolean;
  removedDocumentRef: boolean;
};

function sourceEntryRefs(entries: Record<string, unknown>[]): string[] {
  return entries
    .map((entry) => sourceEntryDocumentRef(entry))
    .filter((ref): ref is string => Boolean(ref));
}

function applySourceSlotMutation(input: SourceSlotMutationInput): SourceSlotMutationResult {
  const currentBody = input.currentBody.trim();
  const currentEntries = objectList(input.currentMetadata.sources);
  const currentRefs = stringList(input.currentMetadata.documentRefs);
  const target = input.target && sourceDeletionTargetHasAnyIdentifier(input.target)
    ? input.target
    : null;

  const removedEntries = target
    ? currentEntries.filter((entry) => sourceEntryMatchesDeletionTarget(entry, target))
    : [];
  const retainedEntries = target
    ? currentEntries.filter((entry) => !sourceEntryMatchesDeletionTarget(entry, target))
    : currentEntries;
  const removedBody = target
    ? removeSourceBlocksFromBody(currentBody, target)
    : { body: currentBody, removedBodyBlock: false };
  const retainedEntryRefs = sourceEntryRefs(retainedEntries);
  const retainedRefs = target
    ? [...new Set([
      ...currentRefs.filter((ref) => !target.documentRefs.has(ref)),
      ...retainedEntryRefs,
    ])]
    : currentRefs;

  const sourceEntries = input.append
    ? [...retainedEntries, input.append.entry]
    : retainedEntries;
  const documentRefs = input.append
    ? [...new Set([...retainedRefs, ...input.append.documentRefs])]
    : currentEntries.length > 0 && retainedEntries.length === 0
      ? []
      : retainedRefs;
  const body = input.append
    ? removedBody.body.trim()
      ? `${removedBody.body.trim()}\n\n---\n\n${input.append.body}`
      : input.append.body
    : currentEntries.length > 0 && retainedEntries.length === 0
      ? ""
      : removedBody.body;

  return {
    body,
    documentRefs,
    sourceEntries,
    removedEntries,
    removedBodyBlock: removedBody.removedBodyBlock,
    removedDocumentRef: Boolean(target && currentRefs.some((ref) => target.documentRefs.has(ref))),
  };
}

function sourceDocumentEntry(
  source: SourceMaterial,
  fingerprint: string,
  documentRef: string,
  extraMetadata: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    sourceId: source.id,
    sourceTitle: source.title,
    sourceType: source.type,
    sourceFormat: source.format,
    figmaFileKey: source.figmaFileKey ?? null,
    figmaNodeId: source.figmaNodeId ?? null,
    sourceIntakeWorkflow: source.intakeWorkflow ?? null,
    sourceFingerprint: fingerprint,
    bodyLength: source.body.length,
    sourceUrl: source.url ?? null,
    sourceFetchStatus: source.fetchStatus ?? null,
    sourceFetchedAt: source.fetchedAt ?? null,
    fileName: source.fileName ?? null,
    documentRef,
    originalPath: source.originalPath ?? null,
    ...extraMetadata,
  };
}

function stripSourceEntryMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const next = { ...metadata };
  for (const key of SOURCE_ENTRY_METADATA_KEYS) delete next[key];
  return next;
}

function projectSlotUpdateForKey(
  slotKey: ProjectDocumentSlotKey,
  documentRefs: string[],
  status: ProjectDocumentSlotUpdate["status"],
): ProjectDocumentSlotUpdate {
  const definition = PROJECT_DOCUMENT_SLOT_DEFINITIONS.find((entry) => entry.slotKey === slotKey);
  if (!definition) throw new Error(`Unknown project document slot: ${slotKey}`);
  return {
    ...definition,
    status,
    documentRefs: [...new Set(documentRefs)],
    updatedAt: new Date().toISOString(),
  };
}

function replaceProjectDocumentSlotUpdate(
  existing: ProjectDocumentSlotUpdate[],
  update: ProjectDocumentSlotUpdate,
): ProjectDocumentSlotUpdate[] {
  const byKey = new Map<ProjectDocumentSlotKey, ProjectDocumentSlotUpdate>();
  for (const slot of existing) byKey.set(slot.slotKey, slot);
  if (update.status === "empty" && update.documentRefs.length === 0) {
    byKey.delete(update.slotKey);
  } else {
    byKey.set(update.slotKey, update);
  }
  return PROJECT_DOCUMENT_SLOT_DEFINITIONS
    .map((definition) => byKey.get(definition.slotKey))
    .filter((slot): slot is ProjectDocumentSlotUpdate => Boolean(slot));
}

async function clearProjectDocumentSlots(
  ctx: AnyCtx,
  companyId: string,
  projectId: string,
  slotKeys: readonly ProjectDocumentSlotKey[] = PROJECT_DOCUMENT_SLOT_DEFINITIONS.map((definition) => definition.slotKey),
): Promise<ProjectDocumentSlotKey[]> {
  const cleared: ProjectDocumentSlotKey[] = [];
  for (const slotKey of slotKeys) {
    await ctx.projects.documentSlots.update(projectId, slotKey, {
      status: "empty",
      documentId: null,
      artifactId: null,
      metadata: null,
    }, companyId);
    cleared.push(slotKey);
  }
  return cleared;
}

async function importProjectSourceDocumentSlot(
  ctx: AnyCtx,
  companyId: string,
  projectId: string,
  slot: ProjectDocumentSlotUpdate,
  body: string,
  metadata: Record<string, unknown>,
  options: { replaceTarget?: SourceDeletionTarget | null } = {},
): Promise<ProjectDocumentSlotUpdate> {
  const current = await ctx.projects.documentSlots.content(projectId, slot.slotKey, companyId);
  const currentMetadata = asRecord(current?.slot?.metadata);
  const currentBody = typeof current?.document?.body === "string" ? current.document.body.trim() : "";
  const mutation = applySourceSlotMutation({
    currentBody,
    currentMetadata,
    target: options.replaceTarget,
    append: {
      body,
      entry: metadata,
      documentRefs: slot.documentRefs,
    },
  });
  const nextSlot = { ...slot, documentRefs: mutation.documentRefs };

  await importProjectDocumentSlot(ctx, companyId, projectId, nextSlot, mutation.body, {
    ...currentMetadata,
    ...metadata,
    sources: mutation.sourceEntries,
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

async function writeBlueprintPrdDocumentsToSlots(
  ctx: AnyCtx,
  companyId: string,
  projectId: string | null | undefined,
  state: CosBlueprintState,
  options: { onlySlotKeys?: readonly ProjectDocumentSlotKey[] } = {},
): Promise<ProjectDocumentUpdateResult> {
  if (!state.prd) throw new Error("개발 요구사항 브리프/계약 산출물을 먼저 생성하세요.");

  const docs = {
    ...renderBlueprintStandardDocuments(projectId),
    ...renderPrdDocuments(state.prd, state.requirementInventory, state.sources, projectId),
  };
  const allSlots = projectSlotUpdatesForDocuments(docs, state.prd.confirmedAt ? "ready" : "draft");
  const onlySlotKeys = new Set(options.onlySlotKeys ?? []);
  const slots = onlySlotKeys.size > 0
    ? allSlots.filter((slot) => onlySlotKeys.has(slot.slotKey))
    : allSlots;
  const files = [...new Set(slots.flatMap((slot) => slot.documentRefs))];
  if (!projectId) {
    return {
      ok: false,
      projectId: null,
      workspacePath: null,
      files,
      slots,
      message: "projectId가 없어 문서 미리보기 목록만 반환했습니다.",
    } satisfies ProjectDocumentUpdateResult;
  }

  await importProjectDocumentsToSlots(ctx, companyId, projectId, docs, slots, {
    phase: "prd",
    projectTitle: state.prd.projectTitle,
    confirmedAt: state.prd.confirmedAt ?? null,
    generatedAt: state.prd.generatedAt,
    ...productBuilderBlueprintMetadata(state.productBuilderBlueprintId),
    ...productBuilderBasePackageMetadata(state.productBuilderBasePackageKeys),
    productBuilderBlueprintSelectedAt: state.productBuilderBlueprintSelectedAt ?? state.prd.generatedAt,
  });
  await withStateLock({ companyId, projectId }, async () => {
    const fresh = await readState(ctx, { companyId, projectId });
    await writeState(ctx, { companyId, projectId }, {
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
}

function blueprintFigmaAvailable(state: CosBlueprintState): boolean {
  return (state.sources ?? []).some((s) => s.format === "figma" || (s.links?.figma?.length ?? 0) > 0);
}

function blueprintFigmaRef(state: CosBlueprintState): { fileKey?: string; nodeId?: string } {
  const figma = (state.sources ?? []).find((s) => s.format === "figma" && s.figmaFileKey);
  return { fileKey: figma?.figmaFileKey, nodeId: figma?.figmaNodeId };
}

async function blueprintWireframeAvailable(
  ctx: AnyCtx,
  companyId: string,
  projectId: string,
): Promise<boolean> {
  try {
    const slots = await ctx.projects.documentSlots.list(projectId, companyId);
    return slots.some(
      (slot) => slot.slotKey === "deliverable.wireframe_html" && slot.status !== "empty" && slot.status !== "n/a",
    );
  } catch {
    return false;
  }
}

async function blueprintTaskOptions(
  ctx: AnyCtx,
  companyId: string,
  projectId: string,
  state: CosBlueprintState,
): Promise<Parameters<typeof buildBlueprintProductTasks>[2]> {
  return {
    screenModel: state.screenPlan ? screenPlanToScreenModel(state.screenPlan) : undefined,
    architecture: state.prd?.architecture,
    figmaAvailable: blueprintFigmaAvailable(state),
    figmaFileKey: blueprintFigmaRef(state).fileKey,
    figmaNodeId: blueprintFigmaRef(state).nodeId,
    wireframeAvailable: await blueprintWireframeAvailable(ctx, companyId, projectId),
  };
}

async function writeBlueprintTaskListDocuments(
  ctx: AnyCtx,
  companyId: string,
  projectId: string | null | undefined,
  state: CosBlueprintState,
): Promise<{ ok: boolean; taskCount: number; slotKeys: string[]; message: string }> {
  if (!state.prd) throw new Error("개발 요구사항 브리프(prd)를 먼저 생성해야 task 목록을 만들 수 있습니다.");
  if (!projectId) throw new Error("projectId가 필요합니다.");
  const prd = state.prd;
  const build = buildBlueprintProductTasks(prd, state.productBuilderBlueprintId, await blueprintTaskOptions(ctx, companyId, projectId, state));
  const generatedAt = new Date().toISOString();
  const snapshot: BlueprintTaskListBuildSnapshot = {
    generatedAt,
    prdGeneratedAt: prd.generatedAt,
    prdConfirmedAt: prd.confirmedAt,
    screenPlanGeneratedAt: state.screenPlan?.generatedAt ?? null,
    blueprintId: state.productBuilderBlueprintId,
    taskCount: build.tasks.length,
    build,
  };
  await withStateLock({ companyId, projectId }, async () => {
    const fresh = await readState(ctx, { companyId, projectId });
    await writeState(ctx, { companyId, projectId }, { ...fresh, taskListBuild: snapshot, updatedAt: generatedAt });
  });
  const renderInput = {
    buildId: `bp-${randomUUID()}`,
    blueprintId: build.blueprint.id,
    productName: build.productName,
    rootIssueId: "",
    createdAt: generatedAt,
    plan: buildClassicPlan(build),
    tasks: build.tasks,
    issues: [],
  };
  const taskListMarkdown = renderTaskListMarkdown(renderInput);
  const metadata = { plugin: PLUGIN_ID, producer: "Blueprint", taskCount: build.tasks.length, taskListGeneratedAt: generatedAt };
  await ctx.projects.documentSlots.import(projectId, PRODUCT_BUILDER_TASK_LIST_SLOT_KEY, {
    title: "전체 Task 목록(Full Task List)",
    format: "markdown",
    body: taskListMarkdown,
    status: "ready",
    contentType: "text/markdown",
    metadata,
  }, companyId);
  return {
    ok: true,
    taskCount: build.tasks.length,
    slotKeys: [PRODUCT_BUILDER_TASK_LIST_SLOT_KEY],
    message: `산출물에서 task ${build.tasks.length}건(기반 + capability + 기능별 DATA/API/화면/QA)을 생성해 Task 목록 slot에 기록했습니다. 검토 후 "이슈 생성"이 이 목록 그대로 이슈를 등록합니다.`,
  };
}

function requireFreshTaskListBuild(state: CosBlueprintState): BlueprintProductBuild {
  const snapshot = state.taskListBuild;
  if (!snapshot || !snapshot.build) {
    throw new Error("전체 Task 목록을 먼저 생성하세요. \"Task 생성\" 실행 후 목록을 검토하고 이슈를 등록할 수 있습니다.");
  }
  const prd = state.prd;
  if (!prd) throw new Error("개발 요구사항 브리프(prd)를 먼저 생성해야 이슈를 등록할 수 있습니다.");
  const staleReasons: string[] = [];
  if (snapshot.prdGeneratedAt !== prd.generatedAt) staleReasons.push("개발 요구사항 브리프");
  if (snapshot.screenPlanGeneratedAt !== (state.screenPlan?.generatedAt ?? null)) staleReasons.push("화면정의서");
  if (snapshot.blueprintId !== state.productBuilderBlueprintId) staleReasons.push("blueprint 선택");
  if (staleReasons.length > 0) {
    throw new Error(`전체 Task 목록 생성 이후 ${staleReasons.join(", ")}이(가) 변경되었습니다. "Task 생성"으로 목록을 다시 만들어 검토한 뒤 이슈를 등록하세요.`);
  }
  return snapshot.build as BlueprintProductBuild;
}

const blueprintInstantiateLocks = new Map<string, Promise<unknown>>();
function withInstantiateLock<T>(companyId: string, projectId: string, fn: () => Promise<T>): Promise<T> {
  const key = `${companyId}|${projectId}`;
  const prev = blueprintInstantiateLocks.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  blueprintInstantiateLocks.set(key, next.then(() => undefined, () => undefined));
  return next;
}

function workflowAgentIdFromResolution(resolution: unknown): string | undefined {
  const record = asRecord(resolution);
  const details = asRecord(record.details);
  const agent = asRecord(record.agent);
  return stringValue(record.agentId) ?? stringValue(details.id) ?? stringValue(agent.id) ?? undefined;
}

async function instantiateWorkflowIssues(
  ctx: AnyCtx,
  companyId: string,
  projectId: string | null | undefined,
  state: CosBlueprintState,
): Promise<{ ok: boolean; rootIssueId: string; issueCount: number; taskCount: number; message: string }> {
  if (!state.prd) throw new Error("개발 요구사항 브리프(prd)를 먼저 생성해야 이슈를 등록할 수 있습니다.");
  if (!projectId) throw new Error("projectId가 필요합니다.");
  const buildProjectId = projectId;

  return withInstantiateLock(companyId, buildProjectId, async () => {
    const build = requireFreshTaskListBuild(state);
    const tasks = build.tasks;
    const productName = build.productName;
    const guidelinesCommon = state.agentGuidelinesMarkdown;
    const roleGuidelines = state.agentRoleGuidelines;

    const agentKeys = [
      BUILDER_AGENT_KEY,
      BUILDER_BACKEND_AGENT_KEY,
      BUILDER_FRONTEND_AGENT_KEY,
      BUILDER_PLATFORM_AGENT_KEY,
      BUILDER_AI_AGENT_KEY,
      BUILDER_QA_AGENT_KEY,
    ];
    const agentIdsByKey: Record<string, string | undefined> = {};
    for (const key of agentKeys) {
      agentIdsByKey[key] = workflowAgentIdFromResolution(await reconcileBuilderAgentApplyingDrift(ctx, key, companyId));
    }
    const orchestratorId = agentIdsByKey[BUILDER_AGENT_KEY];

    const buildId = `bp-${randomUUID()}`;
    const billingCode = `blueprint:${build.blueprint.id}`;

    const root = await ctx.issues.create({
      companyId,
      projectId: buildProjectId,
      title: `[Builder] ${productName}`,
      description: buildRootIssueDescription({
        blueprint: build.blueprint,
        intake: build.intake,
        featureSelection: build.featureSelection,
        domainFeatures: build.domainFeatures,
        buildId,
        tasks,
        guidelines: { common: guidelinesCommon, role: roleGuidelines?.orchestrator },
      }),
      status: "in_progress",
      priority: "high",
      assigneeAgentId: orchestratorId,
      billingCode,
      originKind: `plugin:${PLUGIN_ID}:build`,
      originId: `${buildId}:root`,
    });

    const createdByTask = new Map<string, string>();
    const created: CreatedIssueSummary[] = [];
    for (const task of tasks) {
      const status = issueStatusForDecision(task.decision);
      const issue = await ctx.issues.create({
        companyId,
        projectId: buildProjectId,
        parentId: root.id,
        title: `[${task.key}] ${task.title}`,
        description: buildIssueDescription({
          blueprint: build.blueprint,
          intake: build.intake,
          task,
          buildId,
          guidelines: { common: guidelinesCommon, role: roleGuidelines?.[roleKeyForTask(task)] },
        }),
        status,
        priority: task.priority,
        assigneeAgentId: assigneeForTask(task, agentIdsByKey, orchestratorId),
        billingCode,
        originKind: `plugin:${PLUGIN_ID}:task`,
        originId: `${buildId}:${task.key}`,
      });
      createdByTask.set(task.key, issue.id);
      created.push({
        taskKey: task.key,
        issueId: issue.id,
        title: issue.title,
        decision: task.decision,
        status: issue.status,
        parentIssueId: root.id,
      });
    }

    for (const task of tasks) {
      const issueId = createdByTask.get(task.key);
      if (!issueId || !task.dependsOn?.length) continue;
      const blockedByIssueIds = task.dependsOn
        .map((key) => createdByTask.get(key))
        .filter((id): id is string => Boolean(id));
      if (blockedByIssueIds.length === 0) continue;
      await ctx.issues.update(issueId, { blockedByIssueIds }, companyId);
    }

    const renderInput = {
      buildId,
      blueprintId: build.blueprint.id,
      productName,
      rootIssueId: root.id,
      createdAt: new Date().toISOString(),
      plan: buildClassicPlan(build),
      tasks,
      issues: created,
    };
    const metadata = { plugin: PLUGIN_ID, producer: "Blueprint", buildId, rootIssueId: root.id, taskCount: tasks.length };
    await ctx.projects.documentSlots.import(buildProjectId, PRODUCT_BUILDER_TASK_LIST_SLOT_KEY, {
      title: "전체 Task 목록(Full Task List)", format: "markdown", body: renderTaskListMarkdown(renderInput), status: "ready", contentType: "text/markdown", metadata,
    }, companyId);

    await safeLog(ctx, {
      companyId,
      message: `Blueprint product build for "${productName}"`,
      entityType: "issue",
      entityId: root.id,
      metadata: { plugin: PLUGIN_ID, buildId, rootIssueId: root.id, taskCount: tasks.length, issueCount: created.length + 1 },
    });

    return {
      ok: true,
      rootIssueId: root.id,
      issueCount: created.length + 1,
      taskCount: tasks.length,
      message: `현재 프로젝트에 이슈 ${created.length + 1}건(root 1 + task ${created.length})을 등록했습니다.`,
    };
  });
}

async function writeScreenDocumentsToSlots(
  ctx: AnyCtx,
  companyId: string,
  projectId: string | null | undefined,
  state: CosBlueprintState,
): Promise<ProjectDocumentUpdateResult> {
  if (!state.prd) throw new Error("개발 요구사항 브리프/계약 산출물을 먼저 생성하세요.");
  if (!state.prd.confirmedAt) {
    throw new Error("개발 요구사항 브리프 기준선이 확정되지 않아 화면정의서 문서를 산출할 수 없습니다.");
  }
  if (!state.screenPlan) throw new Error("화면정의서를 먼저 생성하세요.");

  const docs = renderScreenDocuments(state.screenPlan, state.prd.projectTitle, projectId, state.prd.productBuilderBasePackages);
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
    projectTitle: state.prd.projectTitle,
    screenCount: state.screenPlan.screens.length,
    screenModel: screenPlanToScreenModel(state.screenPlan),
    screenReviewStatus: allScreensApproved ? "approved" : "draft",
    confirmedAt: screenPlanConfirmedAt,
  });
  await withStateLock({ companyId, projectId }, async () => {
    const fresh = await readState(ctx, { companyId, projectId });
    await writeState(ctx, { companyId, projectId }, {
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
}

async function readProjectDocumentSlotsView(
  ctx: AnyCtx,
  companyId: string,
  projectId: string,
  state?: CosBlueprintState | null,
): Promise<ProjectDocumentSlotsView> {
  const retiredSlotKeys = new Set([
    "deliverable.requirement_inventory",
    "deliverable.interface_definition",
    "deliverable.layout_definition",
    "deliverable.feature_index",
    "deliverable.issue_graph",
    "deliverable.standard_plan",
  ]);
  const slots = (await ctx.projects.documentSlots.list(projectId, companyId))
    .filter((slot) => !retiredSlotKeys.has(slot.slotKey));
  const rows = await Promise.all(slots.map(async (listedSlot): Promise<ProjectDocumentSlotViewerRow> => {
    const content = await ctx.projects.documentSlots.content(projectId, listedSlot.slotKey, companyId);
    const slot = content?.slot ?? listedSlot;
    const currentDefinition = PROJECT_DOCUMENT_SLOT_DEFINITIONS.find((definition) => definition.slotKey === slot.slotKey);
    const documentBody = content?.document?.body;
    return {
      slotKey: slot.slotKey,
      slotGroup: slot.slotGroup,
      title: currentDefinition?.title ?? slot.title,
      required: currentDefinition?.required ?? slot.required,
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
          body: documentBody ?? content.document.body,
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
  const sourceSlotCount = rows.filter((row) => row.slotGroup === "source").flatMap(sourceTitlesFromSlot).length;
  const sourceCount = sourceSlotCount || state?.sources.length || 0;
  const rowsWithWorkflow = rows.map((row): ProjectDocumentSlotViewerRow => ({
    ...row,
    workflow: row.slotGroup === "deliverable"
      ? buildBlueprintWorkflowPanel({
        slotKey: row.slotKey,
        slotTitle: row.title,
        rows,
        sourceCount,
        state,
      })
      : null,
  }));
  return {
    status: "ok",
    checkedAt: new Date().toISOString(),
    projectId,
    slots: rowsWithWorkflow,
  };
}

function sourceTitlesFromSlot(row: ProjectDocumentSlotViewerRow): string[] {
  const metadata = asRecord(row.metadata);
  const metadataTitles = objectList(metadata.sources)
    .map((source) => stringValue(source.sourceTitle) ?? stringValue(source.fileName) ?? stringValue(source.documentRef))
    .filter((title): title is string => Boolean(title));
  if (metadataTitles.length > 0) return metadataTitles;

  const body = row.document?.body ?? "";
  const titles = [...body.matchAll(/^# 기획 자료\(Source Material\) - (.+)$/gm)]
    .map((match) => match[1]?.trim())
    .filter((title): title is string => Boolean(title));
  if (titles.length > 0) return titles;

  return row.document ? [row.title] : [];
}

type BlueprintPmChatActiveContext = {
  activeWorkspaceTab: "deliverables" | "sources" | "unknown";
  targetDeliverableSlotKey: string | null;
  targetDeliverableTitle: string | null;
  targetSourceId: string | null;
  targetSourceTitle: string | null;
  targetSourceSlotKey: string | null;
  targetSourceDocumentRef: string | null;
};

function pmChatActiveContextFromParams(params: Record<string, unknown>): BlueprintPmChatActiveContext {
  const tab = stringValue(params.activeWorkspaceTab);
  return {
    activeWorkspaceTab: tab === "deliverables" || tab === "sources" ? tab : "unknown",
    targetDeliverableSlotKey: stringValue(params.targetDeliverableSlotKey) ?? null,
    targetDeliverableTitle: stringValue(params.targetDeliverableTitle) ?? null,
    targetSourceId: stringValue(params.targetSourceId) ?? null,
    targetSourceTitle: stringValue(params.targetSourceTitle) ?? null,
    targetSourceSlotKey: stringValue(params.targetSourceSlotKey) ?? null,
    targetSourceDocumentRef: stringValue(params.targetSourceDocumentRef) ?? null,
  };
}

function buildPmChatActiveContextLines(
  activeContext: BlueprintPmChatActiveContext,
  slots: ProjectDocumentSlotsView | null,
): string[] {
  const lines = [`- activeWorkspaceTab: ${activeContext.activeWorkspaceTab}`];
  const selectedDeliverable = activeContext.targetDeliverableSlotKey
    ? slots?.slots.find((slot) => slot.slotKey === activeContext.targetDeliverableSlotKey) ?? null
    : null;

  if (activeContext.activeWorkspaceTab === "deliverables") {
    lines.push(`- selectedDeliverableSlot: ${activeContext.targetDeliverableSlotKey ?? "none"}`);
    lines.push(`- selectedDeliverableTitle: ${selectedDeliverable?.title ?? activeContext.targetDeliverableTitle ?? "none"}`);
    if (selectedDeliverable) {
      lines.push(`- selectedDeliverableStatus: ${selectedDeliverable.status}${selectedDeliverable.document ? " / has document" : ""}`);
      if (selectedDeliverable.workflow) {
        lines.push(`- selectedDeliverableWorkflow: ${selectedDeliverable.workflow.label} ${selectedDeliverable.workflow.doneCount}/${selectedDeliverable.workflow.totalCount}`);
      }
    }
    return lines;
  }

  if (activeContext.activeWorkspaceTab === "sources") {
    lines.push(`- selectedSourceId: ${activeContext.targetSourceId ?? "none"}`);
    lines.push(`- selectedSourceTitle: ${activeContext.targetSourceTitle ?? "none"}`);
    lines.push(`- selectedSourceSlot: ${activeContext.targetSourceSlotKey ?? "none"}`);
    lines.push(`- selectedSourceDocumentRef: ${activeContext.targetSourceDocumentRef ?? "none"}`);
    return lines;
  }

  lines.push("- selectedItem: none");
  return lines;
}

function buildPmChatPrompt(input: {
  message: string;
  state: CosBlueprintState;
  slots: ProjectDocumentSlotsView | null;
  pmContext: BlueprintPmAgentRuntimeContext;
  projectId?: string | null;
  activeContext: BlueprintPmChatActiveContext;
}): string {
  const sourceTitles = input.slots?.slots
    .filter((slot) => slot.slotGroup === "source")
    .flatMap(sourceTitlesFromSlot) ?? [];
  const deliverableLines = input.slots?.slots
    .filter((slot) => slot.slotGroup === "deliverable")
    .map((slot) => {
      const workflow = slot.workflow
        ? ` / ${slot.workflow.label} ${slot.workflow.doneCount}/${slot.workflow.totalCount}`
        : "";
      return `- ${slot.slotKey}: ${slot.title} / ${slot.status}${slot.document ? " / has document" : ""}${workflow}`;
    })
    .slice(0, 32) ?? [];
  const stateSourceLines = input.state.sources
    .map((source) => `- ${source.title} (${source.type}, ${source.format ?? "text"})`)
    .slice(0, 40);
  const registeredSourceCount = sourceTitles.length || input.state.sources.length;
  const hasPrd = Boolean(input.state.prd);

  return [
    "=== Loaded PM Agent AGENTS.md ===",
    `source: ${input.pmContext.instructionsPath}`,
    input.pmContext.instructions,
    "",
    "=== Loaded PM Agent Skills ===",
    ...input.pmContext.skills.flatMap((skill) => [
      `--- ${skill.skillKey} (${skill.skillName}) ---`,
      skill.markdown,
      "",
    ]),
    "=== Chat Request ===",
    "너는 Blueprint PM Agent다. 사용자는 Builder > Blueprint 화면의 왼쪽 PM 채팅에서 말하고 있다.",
    "답변은 현재 프로젝트의 등록 자료와 산출물 상태를 기준으로 짧고 실행 가능하게 한다.",
    "사용자가 현재 선택 항목을 물으면 Active workspace selection을 우선 기준으로 답한다.",
    "자료가 충분하면 다음 분석/산출 단계로 무엇을 하면 되는지 말하고, 부족하면 필요한 자료를 명확히 요청한다.",
    "",
    "Authoritative current facts. Do not contradict these facts:",
    `- registeredSourceCount: ${registeredSourceCount}`,
    `- prdPresent: ${hasPrd ? "yes" : "no"}`,
    `- nextRecommendedStep: ${
      registeredSourceCount > 0 && !hasPrd
        ? "등록 자료가 있으므로 새 자료 요청이 아니라 개발 요구사항 브리프를 생성/검토한다."
        : registeredSourceCount === 0
          ? "등록 자료가 없으므로 자료 등록을 요청한다."
          : "현재 산출물 상태에 맞는 다음 누락 산출물을 정리한다."
    }`,
    "",
    `Project ID: ${input.projectId ?? "company-scope"}`,
    "",
    "Project Agent Guidelines (required reading):",
    input.state.agentGuidelinesMarkdown.trim() || "(none)",
    "",
    "Active workspace selection:",
    ...buildPmChatActiveContextLines(input.activeContext, input.slots),
    "",
    "Registered source materials from Blueprint state:",
    ...(stateSourceLines.length ? stateSourceLines : ["- none"]),
    "",
    "Registered source entries from Project document slots:",
    ...(sourceTitles.length ? sourceTitles.map((title) => `- ${title}`) : ["- none"]),
    "",
    "Deliverable slots:",
    ...(deliverableLines.length ? deliverableLines : ["- none"]),
    "",
    "Current workflow state:",
    `- registeredSources: ${registeredSourceCount}`,
    `- internalCoverageIndex: ${input.state.requirementInventory ? "present" : "missing"}`,
    `- developmentRequirementsBrief/prd: ${input.state.prd ? (input.state.prd.confirmedAt ? "confirmed" : "draft") : "missing"}`,
    `- screenPlan: ${input.state.screenPlan ? `${input.state.screenPlan.screens.length} screens` : "missing"}`,
    `- runningJob: ${input.state.job?.status === "running" ? `${input.state.job.kind} / ${input.state.job.message ?? ""}` : "none"}`,
    "",
    "User message:",
    input.message,
  ].join("\n");
}

const stateLocks = new Map<string, Promise<unknown>>();
function withStateLock<T>(scope: BlueprintStateScope, fn: () => Promise<T>): Promise<T> {
  const key = stateLockKey(scope);
  const prev = stateLocks.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  stateLocks.set(key, next.then(() => undefined, () => undefined));
  return next;
}

async function safeLog(ctx: AnyCtx, entry: Parameters<AnyCtx["activity"]["log"]>[0]): Promise<void> {
  try {
    await ctx.activity.log(entry);
  } catch (error) {
    ctx.logger?.info?.(`COS Blueprint activity.log failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

type BlueprintPmAgentRuntimeContext = {
  instructionsPath: string;
  instructions: string;
  skills: Array<{
    skillKey: string;
    skillName: string;
    markdown: string;
  }>;
};

function readPmAgentInstructions(agent: unknown): { instructionsPath: string; instructions: string } {
  const agentRecord = asRecord(agent);
  const adapterConfig = asRecord(agentRecord.adapterConfig);
  const configuredPath = stringValue(adapterConfig.instructionsFilePath);
  if (!configuredPath) {
    throw new Error("Blueprint PM Agent AGENTS.md 경로가 adapterConfig.instructionsFilePath에 없습니다.");
  }

  const instructionsPath = existsSync(configuredPath) ? realpathSync(configuredPath) : configuredPath;
  if (!existsSync(instructionsPath)) {
    throw new Error(`Blueprint PM Agent AGENTS.md 파일을 찾을 수 없습니다: ${configuredPath}`);
  }

  const instructions = readFileSync(instructionsPath, "utf8").trim();
  if (!instructions) {
    throw new Error(`Blueprint PM Agent AGENTS.md 파일이 비어 있습니다: ${instructionsPath}`);
  }
  return { instructionsPath, instructions };
}

async function loadPmManagedSkill(
  ctx: AnyCtx,
  companyId: string,
  skillKey: string,
): Promise<BlueprintPmAgentRuntimeContext["skills"][number]> {
  const resolved = await ctx.skills.managed.get(skillKey, companyId);
  const skill = asRecord(resolved?.skill);
  const markdown = stringValue(skill.markdown);
  if (!markdown) {
    throw new Error(`Blueprint PM Agent 스킬 markdown을 찾을 수 없습니다: ${skillKey}`);
  }
  return {
    skillKey,
    skillName: stringValue(skill.name) ?? stringValue(skill.displayName) ?? skillKey,
    markdown,
  };
}

async function loadBlueprintPmAgentRuntimeContext(
  ctx: AnyCtx,
  companyId: string,
  agent: unknown,
): Promise<BlueprintPmAgentRuntimeContext> {
  const instructions = readPmAgentInstructions(agent);
  const skills = await Promise.all([
    loadPmManagedSkill(ctx, companyId, BLUEPRINT_PM_SKILL_KEY),
  ]);
  return { ...instructions, skills };
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
        : reconcileManagedSkillResettingDrift(ctx, skillKey, companyId)
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

function stripCodeFence(text: string): string {
  let t = text.trim();
  const closed = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t);
  if (closed) return closed[1].trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  return t.trim();
}

function repairTruncatedJson(input: string): string | null {
  let inStr = false;
  let esc = false;
  const stack: Array<"{" | "["> = [];
  let cutEnd = -1;
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
      cutEnd = i;
      cutStack = [...stack];
      continue;
    }
    if (c === ",") {
      cutEnd = i - 1;
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

async function callBlueprintLlmTool(
  prompt: string,
  tool: BlueprintLlmTool,
  maxTokens = 16000,
  timeoutMs = BLUEPRINT_LLM_TIMEOUT_MS,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${LLM_BASE}/v1/messages`, {
      method: "POST",
      signal: controller.signal,
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
        tools: [tool],
        tool_choice: { type: "tool", name: tool.name },
      }),
    });
  } catch (error) {
    if (timedOut || (error instanceof Error && error.name === "AbortError")) {
      throw new Error(`COS Blueprint LLM tool call timed out after ${Math.round(timeoutMs / 1000)} seconds`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`COS Blueprint LLM tool call failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json() as {
    stop_reason?: string;
    content?: Array<{ type: string; input?: Record<string, unknown> }>;
  };
  if (data.stop_reason === "max_tokens") {
    throw new Error(`COS Blueprint LLM tool call truncated (stop_reason=max_tokens, tool=${tool.name})`);
  }
  const block = (data.content ?? []).find((b) => b.type === "tool_use");
  const input = block?.input;
  if (!input || typeof input !== "object") {
    throw new Error(`COS Blueprint LLM tool call returned no tool_use input (tool=${tool.name})`);
  }
  return input;
}

async function callBlueprintPmChatLlm(
  prompt: string,
  options: { signal?: AbortSignal; maxTokens?: number } = {},
): Promise<string> {
  const res = await fetch(`${LLM_BASE}/v1/messages`, {
    method: "POST",
    signal: options.signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": LLM_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: options.maxTokens ?? PM_CHAT_MAX_TOKENS,
      messages: [
        {
          role: "user",
          content: [
            prompt,
            "",
            "=== PM Chat Response Rules ===",
            "지금은 Builder > Blueprint 왼쪽 PM Agent 채팅이다.",
            "Codex heartbeat, adapter 실행, 파일 수정, git 작업을 실행한다고 말하지 마라.",
            "답변은 한국어로, 현재 자료/산출물 상태에 근거해 3~5문장으로 짧고 실행 가능하게 한다.",
          ].join("\n"),
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Blueprint PM chat LLM call failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json() as { content?: Array<{ type: string; text?: string }> };
  const text = (data.content ?? [])
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text as string)
    .join("\n")
    .trim();
  if (!text) throw new Error("Blueprint PM chat response is empty");
  return text;
}

function createPmChatTimeout(timeoutMs: number): {
  signal: AbortSignal;
  clear: () => void;
  didTimeout: () => boolean;
} {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
    didTimeout: () => timedOut,
  };
}

function pmChatErrorMessage(error: unknown, didTimeout: boolean): string {
  if (didTimeout || (error instanceof Error && error.name === "AbortError")) {
    return `PM Agent 응답이 ${Math.round(PM_CHAT_LLM_TIMEOUT_MS / 1000)}초 안에 완료되지 않았습니다. 요청은 실패로 정리했고 채팅은 계속 사용할 수 있습니다. 질문을 더 짧게 보내거나 특정 산출물을 선택한 뒤 다시 요청하세요.`;
  }
  return error instanceof Error ? error.message : String(error);
}

const BRIEF_BASELINE_DELIVERABLE_SLOTS = new Set([
  "deliverable.prd",
  "deliverable.feature_files",
  "deliverable.schema_definition",
  "deliverable.api_definition",
  "deliverable.architecture",
]);

function jobStartMessage(result: StartJobResult, label: string): string {
  if (result.started) {
    return `${label} 생성 작업을 시작했습니다. 작업상황 패널에서 진행 상태를 확인하세요. 완료되면 Project document slot에 자동 기록됩니다.`;
  }
  return `${label} 생성 작업을 시작하지 않았습니다. 현재 ${result.job.kind} 작업이 이미 실행 중입니다. reason=${result.reason ?? "running"}`;
}

function unsupportedDeliverableMessage(slotKey: string, title: string | null): string {
  if (slotKey === "deliverable.wireframe_html") {
    return `${title ?? slotKey}은 Blueprint가 아니라 Wireframe 플러그인 산출물입니다. Wireframe 화면에서 HTML 와이어프레임 생성 workflow로 실행해야 합니다.`;
  }
  return `${title ?? slotKey}은 현재 Blueprint PM 채팅에서 직접 생성할 수 있는 산출물이 아닙니다.`;
}

async function reviseDeliverableDocumentFromPmChat(input: {
  ctx: AnyCtx;
  companyId: string;
  projectId: string | null;
  message: string;
  state: CosBlueprintState;
  slotKey: string;
  title: string;
}): Promise<{ handled: boolean; message: string; payload: Record<string, unknown> }> {
  if (!input.projectId) throw new Error("프로젝트를 선택해야 산출물 수정본을 저장할 수 있습니다.");
  if (process.env.COS_BLUEPRINT_DISABLE_LLM === "true") {
    throw new Error("LLM 비활성화 상태에서는 PM 산출물 부분 수정을 실행할 수 없습니다.");
  }

  const current = await input.ctx.projects.documentSlots.content(input.projectId, input.slotKey, input.companyId);
  const currentBody = typeof current?.document?.body === "string" ? current.document.body : "";
  if (!currentBody.trim()) {
    return {
      handled: true,
      message: `${input.title}은 아직 문서 본문이 없습니다. 먼저 “분석” 또는 “생성”으로 산출물을 만든 뒤 수정 요청을 보내세요.`,
      payload: { mode: "deliverable-command", slotKey: input.slotKey, action: "revision-missing-document" },
    };
  }
  if (currentBody.length > PM_REVISION_BODY_MAX_CHARS) {
    throw new Error(`${input.title} 본문이 ${PM_REVISION_BODY_MAX_CHARS.toLocaleString("ko-KR")}자를 넘어 전체 재작성 방식의 부분 수정이 안전하지 않습니다. 수정할 섹션을 더 좁히거나 재생성을 사용하세요.`);
  }

  const prompt = buildDeliverableRevisionPrompt({
    title: input.title,
    slotKey: input.slotKey,
    currentBody,
    request: input.message,
    sources: input.state.sources,
    sourceBodyMaxChars: PM_REVISION_SOURCE_BODY_MAX_CHARS,
    agentGuidelinesMarkdown: input.state.agentGuidelinesMarkdown,
  });
  const revision = normalizeRevisionOutput(await callBlueprintLlmTool(prompt, REVISION_TOOL, PM_REVISION_MAX_TOKENS));
  const now = new Date().toISOString();
  await input.ctx.projects.documentSlots.import(input.projectId, input.slotKey, {
    title: input.title,
    format: "markdown",
    body: revision.body,
    status: "ready",
    contentType: "text/markdown",
    changeSummary: revision.changeSummary,
    metadata: {
      ...buildPmRevisionMetadata({
        existingMetadata: current?.slot?.metadata,
        request: input.message,
        revision,
        model: LLM_MODEL,
        now,
        previousDocument: current?.document ?? null,
      }),
      plugin: PLUGIN_ID,
    },
  }, input.companyId);

  await safeLog(input.ctx, {
    companyId: input.companyId,
    message: `COS Blueprint deliverable revised from PM chat: ${input.slotKey}`,
    entityType: "plugin",
    entityId: input.projectId,
    metadata: {
      projectId: input.projectId,
      slotKey: input.slotKey,
      previousDocumentId: current?.document?.id ?? null,
      previousRevisionNumber: current?.document?.latestRevisionNumber ?? null,
      changeSummary: revision.changeSummary,
    },
  });

  return {
    handled: true,
    message: `${input.title} 수정 요청을 반영해 Project document slot에 수정본으로 저장했습니다. 변경 요약: ${revision.changeSummary}`,
    payload: {
      mode: "deliverable-command",
      slotKey: input.slotKey,
      action: "revise-deliverable-document",
      revision: {
        changedAt: now,
        changeSummary: revision.changeSummary,
        previousDocumentId: current?.document?.id ?? null,
        previousRevisionNumber: current?.document?.latestRevisionNumber ?? null,
      },
    },
  };
}

async function startScreensAndWriteJob(
  ctx: AnyCtx,
  scope: BlueprintStateScope,
  initial: CosBlueprintState,
): Promise<StartJobResult> {
  const screenReadyState = await ensureScreenBaselineReady(ctx, scope, initial);
  const baselinePlan = screenReadyState.prd;
  if (!baselinePlan) throw new Error("개발 요구사항 브리프/계약 산출물을 먼저 생성하세요.");
  const prd = buildScreenAwarePrd({
    prd: baselinePlan,
    sources: screenReadyState.sources,
  });
  const pinnedGeneratedAt = baselinePlan.generatedAt;
  return startJob(ctx, scope, { kind: "screens", status: "running", startedAt: new Date().toISOString() }, async (job) => {
    const screenPlan = await generateScreenPlan({
      prd,
      sources: screenReadyState.sources,
      agentGuidelinesMarkdown: screenReadyState.agentGuidelinesMarkdown,
      requirementInventory: screenReadyState.requirementInventory,
    });
    const nextScreenPlan = { ...screenPlan, reviews: {} };
    const commitStatus = await withStateLock(scope, async (): Promise<"committed" | "stale-data" | "stale-job"> => {
      const fresh = await readState(ctx, scope);
      if (!isCurrentJob(fresh, job)) return "stale-job";
      if (!fresh.prd?.confirmedAt || fresh.prd.generatedAt !== pinnedGeneratedAt) {
        return "stale-data";
      }
      const freshBlueprintPrd = buildScreenAwarePrd({
        prd: fresh.prd,
        sources: fresh.sources,
      });
      await writeState(ctx, scope, {
        ...fresh,
        prd: freshBlueprintPrd,
        screenPlan: nextScreenPlan,
        job: {
          ...job,
          status: "running",
          message: "화면정의서 생성이 완료되어 Project document slot 기록을 대기 중입니다.",
        },
      });
      return "committed";
    });
    if (commitStatus === "stale-job") return;
    if (commitStatus === "stale-data") {
      throw new Error("개발 요구사항 브리프/계약 기준선이 변경되어 화면정의서 생성을 취소했습니다. 다시 시도하세요.");
    }
    await safeLog(ctx, {
      companyId: scope.companyId,
      message: `COS Blueprint screens generated from PM chat and queued screen document slot write for ${prd.projectTitle}`,
      entityType: "plugin",
      entityId: scope.projectId ?? PLUGIN_ID,
      metadata: {
        screenCount: screenPlan.screens.length,
        usedFallback: screenPlan.usedFallback === true,
        slotKey: "deliverable.screen_definitions",
      },
    });
  });
}

async function ensureScreenBaselineReady(
  ctx: AnyCtx,
  scope: BlueprintStateScope,
  initial: CosBlueprintState,
): Promise<CosBlueprintState> {
  if (!initial.prd) throw new Error("개발 요구사항 브리프/계약 산출물을 먼저 생성하세요.");
  if (initial.prd.confirmedAt) return initial;
  if (!scope.projectId) {
    throw new Error("개발 요구사항 브리프 기준선이 확정되지 않아 화면정의서를 생성할 수 없습니다.");
  }

  const prdSlot = await ctx.projects.documentSlots
    .content(scope.projectId, "deliverable.prd", scope.companyId)
    .catch(() => null);
  const status = String(prdSlot?.slot?.status ?? "");
  const hasUsablePrdSlot = status === "ready" || status === "approved";
  if (!hasUsablePrdSlot) {
    throw new Error("개발 요구사항 브리프 기준선이 확정되지 않아 화면정의서를 생성할 수 없습니다.");
  }

  const metadata = asRecord(prdSlot?.slot?.metadata);
  const confirmedAt = stringValue(metadata.confirmedAt)
    || stringValue(prdSlot?.slot?.updatedAt)
    || new Date().toISOString();
  const generatedAt = initial.prd.generatedAt;

  return withStateLock(scope, async (): Promise<CosBlueprintState> => {
    const fresh = await readState(ctx, scope);
    if (!fresh.prd) throw new Error("개발 요구사항 브리프/계약 산출물을 먼저 생성하세요.");
    if (fresh.prd.confirmedAt) return fresh;
    if (fresh.prd.generatedAt !== generatedAt) {
      throw new Error("개발 요구사항 브리프/계약 기준선이 변경되어 화면정의서 생성을 취소했습니다. 다시 시도하세요.");
    }
    const next: CosBlueprintState = {
      ...fresh,
      prd: {
        ...fresh.prd,
        confirmedAt,
      },
    };
    await writeState(ctx, scope, next);
    return next;
  });
}

async function handlePmChatDeliverableCommand(input: {
  ctx: AnyCtx;
  companyId: string;
  projectId: string | null;
  message: string;
  state: CosBlueprintState;
  activeContext: BlueprintPmChatActiveContext;
  slots: ProjectDocumentSlotsView | null;
}): Promise<{ handled: boolean; message: string; payload?: Record<string, unknown> } | null> {
  if (input.activeContext.activeWorkspaceTab !== "deliverables") return null;
  const revisionRequest = isPmChatDeliverableRevisionRequest(input.message);
  const generationRequest = isPmChatDeliverableGenerationRequest(input.message);
  if (!revisionRequest && !generationRequest) return null;
  const slotKey = input.activeContext.targetDeliverableSlotKey;
  if (!slotKey) return null;

  const slot = input.slots?.slots.find((row) => row.slotKey === slotKey) ?? null;
  const title = slot?.title ?? input.activeContext.targetDeliverableTitle ?? slotKey;
  const scope = { companyId: input.companyId, projectId: input.projectId ?? undefined };
  const regenerate = isRegenerationRequest(input.message);
  if (revisionRequest && !regenerate) {
    return reviseDeliverableDocumentFromPmChat({
      ctx: input.ctx,
      companyId: input.companyId,
      projectId: input.projectId,
      message: input.message,
      state: input.state,
      slotKey,
      title,
    });
  }

  const existingStatus = slot?.status ?? "empty";
  const hasExistingOutput = Boolean(slot?.document || slot?.artifact || (existingStatus !== "empty" && existingStatus !== "n/a"));

  if (!regenerate && hasExistingOutput) {
    return {
      handled: true,
      message: `${title}은 이미 Project document slot에 ${existingStatus} 상태로 준비되어 있습니다. 다시 만들려면 “재생성”이라고 요청하세요.`,
      payload: { mode: "deliverable-command", slotKey, action: "already-ready", status: existingStatus },
    };
  }

  if (BRIEF_BASELINE_DELIVERABLE_SLOTS.has(slotKey)) {
    if (input.state.prd && !regenerate) {
      const result = await writeBlueprintPrdDocumentsToSlots(input.ctx, input.companyId, input.projectId, input.state, {
        onlySlotKeys: [slotKey as ProjectDocumentSlotKey],
      });
      return {
        handled: true,
        message: `${title}을 Project document slot에 기록했습니다. ${result.message}`,
        payload: { mode: "deliverable-command", slotKey, action: "write-prd-docs", result },
      };
    }
    if (input.state.job?.status === "running") {
      return {
        handled: true,
        message: jobStartMessage({ started: false, job: input.state.job, reason: "project-job-running" }, title),
        payload: { mode: "deliverable-command", slotKey, action: "job-running", job: input.state.job },
      };
    }
    const prdMode = (process.env.COS_BUILDER_PRD_MODE ?? "staged").trim().toLowerCase();
    const targetWorkflow = PRD_STAGE_WORKFLOWS.find((workflow) =>
      (workflow.writeSlotKeys as readonly string[]).includes(slotKey),
    );
    let result: StartJobResult;
    if (prdMode === "agent") {
      result = await startBlueprintPmPrdJob({
        ctx: input.ctx,
        companyId: input.companyId,
        projectId: input.projectId,
        title,
        state: input.state,
      });
    } else if (targetWorkflow && input.state.prd) {
      result = await startBlueprintStagedPrdJob({
        ctx: input.ctx,
        companyId: input.companyId,
        projectId: input.projectId,
        title,
        state: input.state,
        onlyWorkflowKeys: [targetWorkflow.key],
      });
    } else {
      result = await startBlueprintStagedPrdJob({
        ctx: input.ctx,
        companyId: input.companyId,
        projectId: input.projectId,
        title,
        state: input.state,
      });
    }
    return {
      handled: true,
      message: jobStartMessage(result, title),
      payload: { mode: "deliverable-command", slotKey, action: "run-prd", result },
    };
  }

  if (slotKey === "deliverable.screen_definitions") {
    if (input.state.screenPlan && !regenerate) {
      const result = await writeScreenDocumentsToSlots(input.ctx, input.companyId, input.projectId, input.state);
      return {
        handled: true,
        message: `${title}을 Project document slot에 기록했습니다. ${result.message}`,
        payload: { mode: "deliverable-command", slotKey, action: "write-screen-docs", result },
      };
    }
    const result = await startScreensAndWriteJob(input.ctx, scope, input.state);
    return {
      handled: true,
      message: jobStartMessage(result, title),
      payload: { mode: "deliverable-command", slotKey, action: "run-screens", result },
    };
  }

  if (slotKey === PRODUCT_BUILDER_TASK_LIST_SLOT_KEY) {
    if (!input.state.prd) {
      return {
        handled: true,
        message: `${title}은 개발 요구사항 브리프(prd)를 먼저 생성한 뒤 만들 수 있습니다.`,
        payload: { mode: "deliverable-command", slotKey, action: "prd-missing" },
      };
    }
    const result = await writeBlueprintTaskListDocuments(input.ctx, input.companyId, input.projectId, input.state);
    return {
      handled: true,
      message: result.message,
      payload: { mode: "deliverable-command", slotKey, action: "generate-task-list", result },
    };
  }

  return {
    handled: true,
    message: unsupportedDeliverableMessage(slotKey, title),
    payload: { mode: "deliverable-command", slotKey, action: "unsupported" },
  };
}

function isFigmaSourceMaterial(source: SourceMaterial): boolean {
  return source.format === "figma"
    || source.intakeWorkflow === "figma"
    || isFigmaUrl(source.url);
}

function stripFigmaReferencesForPrd(body: string): string {
  const lines = body.split(/\n/);
  const kept: string[] = [];
  let skippingFigmaSection = false;
  for (const line of lines) {
    const heading = /^#{1,6}\s+/.test(line);
    if (heading && /figma/i.test(line)) {
      skippingFigmaSection = true;
      continue;
    }
    if (heading && skippingFigmaSection) skippingFigmaSection = false;
    if (skippingFigmaSection) continue;
    if (/https?:\/\/[^\s)]+figma\.(?:com|site)/i.test(line)) continue;
    kept.push(line);
  }
  return kept.join("\n").trim();
}

function sourcesForPrd(sources: SourceMaterial[]): SourceMaterial[] {
  return sources
    .filter((source) => !isFigmaSourceMaterial(source))
    .map((source) => ({ ...source, body: stripFigmaReferencesForPrd(source.body) }))
    .filter((source) => source.body.trim().length > 0);
}

function assertHasPrdSources(allSources: SourceMaterial[], prdSources: SourceMaterial[]): void {
  if (allSources.length === 0) throw new Error("at least one source material is required");
  if (prdSources.length === 0) {
    throw new Error("개발 요구사항 브리프 생성에는 Figma 자료를 제외합니다. 문서, 텍스트, URL, Notion 자료를 하나 이상 등록하세요.");
  }
}

function isInternalBriefRoutingNote(value: string): boolean {
  const compact = value.replace(/\s+/g, "");
  if (!compact) return false;
  if (/개발요구사항브리프(?:생성)?입력/.test(compact)) return true;
  return /(Figma|피그마)/i.test(value)
    && /(개발 요구사항 브리프|브리프|입력|참고|자료)/i.test(value)
    && /(제외|화면정의서|와이어프레임|단계)/.test(value);
}

function sanitizePrdText(value: string): string {
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !isInternalBriefRoutingNote(line))
    .join("\n\n")
    .trim();
}

function sanitizePrdStringArray(values: string[]): string[] {
  return values
    .map((value) => sanitizePrdText(value))
    .filter((value) => value.length > 0);
}

function validateSubmittedBlueprintPrdPayload(rawPlan: Record<string, unknown>): void {
  if (!stringValue(rawPlan.overview)) {
    throw new Error("submit-blueprint-prd requires prd.overview");
  }
  const scope = asRecord(rawPlan.scope);
  if (!Array.isArray(scope.inScope) || !Array.isArray(scope.outOfScope)) {
    throw new Error("submit-blueprint-prd requires prd.scope.inScope and prd.scope.outOfScope");
  }
  if (!Array.isArray(rawPlan.functionalRequirements) || rawPlan.functionalRequirements.length === 0) {
    throw new Error("submit-blueprint-prd requires at least one functional requirement from source material");
  }
}

function normalizeSubmittedBlueprintPrd(input: {
  rawPlan: Record<string, unknown>;
  title?: string;
  sources: SourceMaterial[];
  productBuilderBlueprintId: ProductBuilderBlueprintId;
  productBuilderBasePackageKeys: readonly ProductBuilderBasePackageKey[];
}): BlueprintPrd {
  validateSubmittedBlueprintPrdPayload(input.rawPlan);
  const fallback = buildFallbackPrd({
    title: input.title,
    sources: input.sources,
    productBuilderBlueprintId: input.productBuilderBlueprintId,
    productBuilderBasePackageKeys: [...input.productBuilderBasePackageKeys],
    model: BUILDER_MANAGED_AGENT_MODEL,
  });
  const normalized = normalizePrdJson(input.rawPlan, fallback);
  const sanitized: BlueprintPrd = {
    ...normalized,
    overview: sanitizePrdText(normalized.overview) || normalized.overview,
    goals: sanitizePrdStringArray(normalized.goals),
    scope: {
      inScope: sanitizePrdStringArray(normalized.scope.inScope),
      outOfScope: sanitizePrdStringArray(normalized.scope.outOfScope),
    },
    nonFunctionalRequirements: sanitizePrdStringArray(normalized.nonFunctionalRequirements),
    assumptions: sanitizePrdStringArray(normalized.assumptions),
    generatedAt: new Date().toISOString(),
    confirmedAt: null,
    llmModel: BUILDER_MANAGED_AGENT_MODEL,
    usedFallback: false,
  };
  if (sanitized.functionalRequirements.length === 0) {
    throw new Error("submit-blueprint-prd rejected the Development Requirements Brief because functionalRequirements were empty or only contained source metadata");
  }
  return sanitized;
}

function rawBlueprintPrdFromToolParams(record: Record<string, unknown>): Record<string, unknown> {
  const explicit = asRecord(record.prd);
  if (Object.keys(explicit).length > 0) return explicit;
  const plan = asRecord(record.plan);
  if (Object.keys(plan).length > 0) return plan;
  return record;
}

function parseJsonRecordText(value: unknown): Record<string, unknown> {
  if (typeof value !== "string" || value.trim().length === 0) return {};
  try {
    return asRecord(JSON.parse(value));
  } catch {
    return {};
  }
}

function submittedPrdPayloadFromRecord(record: Record<string, unknown>): Record<string, unknown> | null {
  if (Object.keys(asRecord(record.prd)).length > 0) return record;

  const data = asRecord(record.data);
  if (Object.keys(data).length > 0) {
    const fromData = submittedPrdPayloadFromRecord(data);
    if (fromData) return fromData;
  }

  const payload = asRecord(record.payload);
  if (Object.keys(payload).length > 0) {
    const fromPayload = submittedPrdPayloadFromRecord(payload);
    if (fromPayload) return fromPayload;
  }

  const parameters = asRecord(record.parameters);
  if (Object.keys(parameters).length > 0) {
    const fromParameters = submittedPrdPayloadFromRecord(parameters);
    if (fromParameters) return fromParameters;
  }

  const argumentsRecord = asRecord(record.arguments);
  if (Object.keys(argumentsRecord).length > 0) {
    const fromArguments = submittedPrdPayloadFromRecord(argumentsRecord);
    if (fromArguments) return fromArguments;
  }

  const parametersJson = parseJsonRecordText(record.parametersJson ?? record.argumentsJson);
  if (Object.keys(parametersJson).length > 0) {
    const fromParametersJson = submittedPrdPayloadFromRecord(parametersJson);
    if (fromParametersJson) return fromParametersJson;
  }

  return null;
}

function submittedPrdPayloadFromText(text: string): Record<string, unknown> | null {
  try {
    return submittedPrdPayloadFromRecord(asRecord(extractJsonObject(text)));
  } catch {
    return null;
  }
}

function codexAgentMessagesFromStdout(stdout: string): string[] {
  const messages: string[] = [];
  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith("{")) continue;
    let event: Record<string, unknown>;
    try {
      event = asRecord(JSON.parse(line));
    } catch {
      continue;
    }
    const item = asRecord(event.item);
    if (stringValue(item.type) === "agent_message") {
      const text = stringValue(item.text);
      if (text) messages.push(text);
    }
    const message = asRecord(event.message);
    const content = Array.isArray(message.content) ? message.content : [];
    for (const block of content) {
      const blockRecord = asRecord(block);
      const text = stringValue(blockRecord.text);
      if (text) messages.push(text);
    }
  }
  return messages;
}

function submittedPrdPayloadFromRun(run: PluginAgentRun, expectedProjectId: string): Record<string, unknown> | null {
  const result = asRecord(run.resultJson);
  const candidates: string[] = [];
  for (const key of ["summary", "result", "message"] as const) {
    const value = stringValue(result[key]);
    if (value) candidates.push(value);
  }
  const stdout = stringValue(result.stdout);
  if (stdout) candidates.push(...codexAgentMessagesFromStdout(stdout).reverse());
  const stdoutExcerpt = stringValue(run.stdoutExcerpt);
  if (stdoutExcerpt) candidates.push(...codexAgentMessagesFromStdout(stdoutExcerpt).reverse());
  for (const key of ["stdout", "stderr"] as const) {
    const value = stringValue(result[key]);
    if (value) candidates.push(value);
  }
  for (const candidate of candidates) {
    const payload = submittedPrdPayloadFromText(candidate);
    if (!payload) continue;
    const payloadProjectId = stringValue(payload.projectId);
    if (payloadProjectId && payloadProjectId !== expectedProjectId) continue;
    return { ...payload, projectId: payloadProjectId ?? expectedProjectId };
  }
  return null;
}

const TERMINAL_AGENT_RUN_STATUSES = new Set(["succeeded", "failed", "cancelled", "timed_out"]);

function retryRunIdFromRun(run: PluginAgentRun): string | undefined {
  return stringValue(asRecord(run).retryRunId);
}

async function updateBlueprintPmJobRunId(input: {
  ctx: AnyCtx;
  companyId: string;
  projectId: string;
  currentRunId: string;
  retryRun: PluginAgentRun;
}): Promise<void> {
  await withStateLock({ companyId: input.companyId, projectId: input.projectId }, async () => {
    const fresh = await readState(input.ctx, { companyId: input.companyId, projectId: input.projectId });
    if (fresh.job?.status !== "running" || fresh.job.agentRunId !== input.currentRunId) return;
    await writeState(input.ctx, { companyId: input.companyId, projectId: input.projectId }, {
      ...fresh,
      job: {
        ...fresh.job,
        agentRunId: input.retryRun.id,
        message: `Blueprint PM Agent process-loss retry를 추적합니다. runId=${input.retryRun.id}`,
      },
    });
  });
}

async function syncBlueprintPmPrdJob(input: {
  ctx: AnyCtx;
  companyId: string;
  projectId: string;
  state: CosBlueprintState;
}): Promise<CosBlueprintState> {
  const job = input.state.job;
  const runId = stringValue(job?.agentRunId);
  if (!job || job.status !== "running" || jobStage(job) !== "prd" || !runId) return input.state;
  const agentId = stringValue(job.agentId);
  let run = await input.ctx.agents.runs.get(runId, input.companyId, agentId).catch(() => null);
  if (!run || !TERMINAL_AGENT_RUN_STATUSES.has(run.status)) return input.state;

  const retryRunId = retryRunIdFromRun(run);
  if (run.status !== "succeeded" && retryRunId) {
    const retryRun = await input.ctx.agents.runs.get(retryRunId, input.companyId, agentId).catch(() => null);
    if (retryRun) {
      if (!TERMINAL_AGENT_RUN_STATUSES.has(retryRun.status)) {
        await updateBlueprintPmJobRunId({
          ctx: input.ctx,
          companyId: input.companyId,
          projectId: input.projectId,
          currentRunId: runId,
          retryRun,
        });
        return readState(input.ctx, { companyId: input.companyId, projectId: input.projectId });
      }
      run = retryRun;
    }
  }

  if (run.status === "succeeded") {
    const payload = submittedPrdPayloadFromRun(run, input.projectId);
    if (payload) {
      await submitBlueprintPrdFromTool(input.ctx, payload, {
        companyId: input.companyId,
        projectId: input.projectId,
        agentId: agentId ?? run.agentId,
        runId: run.id,
      });
      return readState(input.ctx, { companyId: input.companyId, projectId: input.projectId });
    }
  }

  const message = run.status === "succeeded"
    ? "Blueprint PM Agent가 완료됐지만 최종 submit-blueprint-prd JSON payload를 찾지 못했습니다."
    : `Blueprint PM Agent run이 ${run.status} 상태로 종료됐습니다.${run.error ? ` ${run.error}` : ""}`;
  await withStateLock({ companyId: input.companyId, projectId: input.projectId }, async () => {
    const fresh = await readState(input.ctx, { companyId: input.companyId, projectId: input.projectId });
    if (fresh.job?.status !== "running" || fresh.job.agentRunId !== runId) return;
    await writeState(input.ctx, { companyId: input.companyId, projectId: input.projectId }, {
      ...fresh,
      job: { ...fresh.job, status: "error", message },
    });
  });
  return readState(input.ctx, { companyId: input.companyId, projectId: input.projectId });
}

async function submitBlueprintPrdFromTool(
  ctx: AnyCtx,
  params: unknown,
  runCtx: { companyId: string; projectId?: string | null; agentId?: string | null; runId?: string | null },
): Promise<ProjectDocumentUpdateResult & { prd: BlueprintPrd; requirementInventory: RequirementInventory }> {
  const record = asRecord(params);
  const companyId = runCtx.companyId;
  const projectId = stringValue(record.projectId) ?? stringValue(runCtx.projectId);
  if (!projectId) throw new Error("projectId is required");
  if (!isAllowedCompany(companyId)) throw new Error("Builder is only available for the BBR company");

  const scope = { companyId, projectId };
  const initial = await readState(ctx, scope);
  const prdSources = sourcesForPrd(initial.sources);
  assertHasPrdSources(initial.sources, prdSources);
  const fallbackInventory = buildFallbackRequirementInventory({
    sources: prdSources,
    chunkCount: Math.max(1, prdSources.length),
    model: BUILDER_MANAGED_AGENT_MODEL,
  });
  const requirementInventory = canonicalizeRequirementInventory(
    normalizeRequirementInventoryJson(record.requirementInventory, fallbackInventory),
  );
  const rawPlan = rawBlueprintPrdFromToolParams(record);
  const prd = normalizeSubmittedBlueprintPrd({
    rawPlan,
    title: stringValue(rawPlan.projectTitle),
    sources: prdSources,
    productBuilderBlueprintId: initial.productBuilderBlueprintId,
    productBuilderBasePackageKeys: initial.productBuilderBasePackageKeys,
  });

  const nextState = await withStateLock(scope, async (): Promise<CosBlueprintState> => {
    const fresh = await readState(ctx, scope);
    const next: CosBlueprintState = {
      ...fresh,
      requirementInventory,
      prd,
      screenPlan: null,
      taskListBuild: null,
      job: null,
    };
    await writeState(ctx, scope, next);
    return next;
  });
  const result = await writeBlueprintPrdDocumentsToSlots(ctx, companyId, projectId, nextState);
  await safeLog(ctx, {
    companyId,
    message: `COS Blueprint Development Requirements Brief submitted by PM Agent for ${prd.projectTitle}`,
    entityType: "project",
    entityId: projectId,
    metadata: {
      plugin: PLUGIN_ID,
      agentId: runCtx.agentId ?? null,
      runId: runCtx.runId ?? null,
      schemaCount: prd.schemas.length,
      apiCount: prd.apis.length,
      frCount: prd.functionalRequirements.length,
      requirementInventoryItemCount: requirementInventory.items.length,
      usedFallback: false,
    },
  });
  return { ...result, prd, requirementInventory };
}

async function syncStagedPrdSlots(input: {
  ctx: AnyCtx;
  companyId: string;
  projectId: string;
  state: CosBlueprintState;
}): Promise<CosBlueprintState> {
  const job = input.state.job;
  if (!job || job.status !== "running" || jobStage(job) !== "prd"
    || job.message !== STAGED_PRD_SLOTS_PENDING_MESSAGE || !input.state.prd) {
    return input.state;
  }
  const scope = { companyId: input.companyId, projectId: input.projectId };
  const pending = input.state.stagedPendingSlotKeys;
  const writeOptions = pending && pending.length > 0 ? { onlySlotKeys: pending } : {};
  try {
    await writeBlueprintPrdDocumentsToSlots(input.ctx, input.companyId, input.projectId, input.state, writeOptions);
  } catch (error) {
    await withStateLock(scope, async () => {
      const fresh = await readState(input.ctx, scope);
      if (fresh.job?.message !== STAGED_PRD_SLOTS_PENDING_MESSAGE) return;
      await writeState(input.ctx, scope, {
        ...fresh,
        job: { ...fresh.job, status: "error", message: error instanceof Error ? error.message : String(error) },
      });
    }).catch(() => {});
    return readState(input.ctx, scope);
  }
  await withStateLock(scope, async () => {
    const fresh = await readState(input.ctx, scope);
    if (fresh.job?.message !== STAGED_PRD_SLOTS_PENDING_MESSAGE) return;
    await writeState(input.ctx, scope, { ...fresh, job: null, stagedPendingSlotKeys: null });
  });
  return readState(input.ctx, scope);
}

async function startBlueprintPmPrdJob(input: {
  ctx: AnyCtx;
  companyId: string;
  projectId: string | null | undefined;
  title?: string;
  state: CosBlueprintState;
}): Promise<StartJobResult> {
  const projectId = input.projectId;
  if (!projectId) throw new Error("projectId is required");
  const scope = { companyId: input.companyId, projectId };
  const prdSources = sourcesForPrd(input.state.sources);
  assertHasPrdSources(input.state.sources, prdSources);
  const startedAt = new Date().toISOString();
  const job: StartedBlueprintJob = {
    kind: "prd",
    stage: "prd",
    status: "running",
    projectId,
    jobId: randomUUID(),
    startedAt,
    sourceCount: input.state.sources.length,
    prdSourceCount: prdSources.length,
    message: "Blueprint PM Agent 실행 준비 중입니다.",
  };
  const startResult = await withStateLock(scope, async (): Promise<StartJobResult> => {
    const fresh = await readState(input.ctx, scope);
    if (fresh.job?.status === "running") {
      return {
        started: false,
        job: fresh.job,
        reason: jobStage(fresh.job) === "prd" ? "same-stage-running" : "project-job-running",
      };
    }
    await writeState(input.ctx, scope, { ...fresh, job });
    return { started: true, job };
  });
  if (!startResult.started) return startResult;

  try {
    await reconcileManagedSkillResettingDrift(input.ctx, BLUEPRINT_PM_SKILL_KEY, input.companyId);
    let resolved = await input.ctx.agents.managed.reconcile(BLUEPRINT_PM_AGENT_KEY, input.companyId);
    const currentAdapter = (resolved.agent as { adapterType?: string | null } | null)?.adapterType ?? null;
    const adapterDrift = Boolean(resolved.agent) && currentAdapter !== BUILDER_MANAGED_AGENT_ADAPTER_TYPE;
    if (adapterDrift || (resolved.defaultDrift?.changedFiles ?? []).length > 0) {
      resolved = await input.ctx.agents.managed.reset(BLUEPRINT_PM_AGENT_KEY, input.companyId);
    }
    if (!resolved.agentId) throw new Error("Blueprint PM Agent를 resolve하지 못했습니다.");
    await input.ctx.agents.resume(resolved.agentId, input.companyId);
    const requirementInventory = buildFallbackRequirementInventory({
      sources: prdSources,
      chunkCount: Math.max(1, prdSources.length),
      model: BUILDER_MANAGED_AGENT_MODEL,
    });
    const prompt = buildBlueprintPmAgentPrdPrompt({
      projectId,
      title: input.title,
      sources: prdSources,
      productBuilderBlueprintId: input.state.productBuilderBlueprintId,
      productBuilderBasePackageKeys: input.state.productBuilderBasePackageKeys,
      agentGuidelinesMarkdown: input.state.agentGuidelinesMarkdown,
      requirementInventory,
    });
    const invoked = await input.ctx.agents.invoke(resolved.agentId, input.companyId, {
      prompt,
      reason: `Generate Blueprint Development Requirements Brief for project ${projectId} as a final ${SUBMIT_BLUEPRINT_PRD_TOOL.name} JSON payload`,
      forceFreshSession: true,
    });
    const invokedJob: StartedBlueprintJob = {
      ...job,
      agentId: resolved.agentId,
      agentRunId: invoked.runId,
      message: `Blueprint PM Agent를 호출했습니다. runId=${invoked.runId}. 완료되면 Builder가 최종 JSON payload를 검증해 개발 요구사항 브리프를 저장합니다.`,
    };
    await withStateLock(scope, async () => {
      const fresh = await readState(input.ctx, scope);
      if (!isCurrentJob(fresh, job)) return;
      await writeState(input.ctx, scope, { ...fresh, job: invokedJob });
    });
    await safeLog(input.ctx, {
      companyId: input.companyId,
      message: `COS Blueprint PM Agent invoked for Development Requirements Brief: ${resolved.agentId}`,
      entityType: "project",
      entityId: projectId,
      metadata: {
        plugin: PLUGIN_ID,
        agentId: resolved.agentId,
        agentRunId: invoked.runId,
        model: BUILDER_MANAGED_AGENT_MODEL,
        submissionContract: SUBMIT_BLUEPRINT_PRD_TOOL.name,
      },
    });
    return { started: true, job: invokedJob };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await withStateLock(scope, async () => {
      const fresh = await readState(input.ctx, scope);
      if (!isCurrentJob(fresh, job)) return;
      await writeState(input.ctx, scope, { ...fresh, job: { ...job, status: "error", message } });
    }).catch(() => {});
    throw error;
  }
}

async function startBlueprintStagedPrdJob(input: {
  ctx: AnyCtx;
  companyId: string;
  projectId: string | null | undefined;
  title?: string;
  state: CosBlueprintState;
  onlyWorkflowKeys?: readonly string[];
}): Promise<StartJobResult> {
  const projectId = input.projectId;
  if (!projectId) throw new Error("projectId is required");
  const scope = { companyId: input.companyId, projectId };
  const prdSources = sourcesForPrd(input.state.sources);
  assertHasPrdSources(input.state.sources, prdSources);

  const fallbackInventory = buildFallbackRequirementInventory({
    sources: prdSources,
    chunkCount: Math.max(1, prdSources.length),
    model: LLM_MODEL,
  });
  const fallbackPrd = buildFallbackPrd({
    title: input.title,
    sources: prdSources,
    productBuilderBlueprintId: input.state.productBuilderBlueprintId,
    productBuilderBasePackageKeys: [...input.state.productBuilderBasePackageKeys],
    model: LLM_MODEL,
  });

  const selectedWorkflows = input.onlyWorkflowKeys?.length
    ? PRD_STAGE_WORKFLOWS.filter((workflow) => input.onlyWorkflowKeys!.includes(workflow.key))
    : PRD_STAGE_WORKFLOWS;
  if (selectedWorkflows.length === 0) {
    throw new Error(`알 수 없는 산출물 워크플로우: ${input.onlyWorkflowKeys?.join(",")}`);
  }
  const isSubset = selectedWorkflows.length < PRD_STAGE_WORKFLOWS.length;
  const seedPrd = isSubset && input.state.prd ? input.state.prd : fallbackPrd;
  const seedInventory = isSubset && input.state.requirementInventory ? input.state.requirementInventory : fallbackInventory;
  const pendingSlotKeys: ProjectDocumentSlotKey[] | null = isSubset
    ? [...new Set(selectedWorkflows.flatMap((workflow) => workflow.writeSlotKeys))]
    : null;

  const stageCtx: BlueprintStageContext = {
    base: {
      title: input.title,
      sources: prdSources,
      productBuilderBlueprintId: input.state.productBuilderBlueprintId,
      productBuilderBasePackageKeys: [...input.state.productBuilderBasePackageKeys],
      agentGuidelinesMarkdown: input.state.agentGuidelinesMarkdown,
      requirementInventory: seedInventory,
    },
    fallbackPrd: seedPrd,
  };

  const llmDisabled = process.env.COS_BLUEPRINT_DISABLE_LLM === "true";
  const stagedChannel = `blueprint:staged-prd:${input.companyId}:${projectId}`;
  const emitStaged = (phase: string, message: string): void => {
    try {
      input.ctx.streams.emit(stagedChannel, { phase, message, at: new Date().toISOString() });
    } catch {
      /* streams 미연결 무시 */
    }
  };

  return startJob(input.ctx, scope, {
    kind: "prd",
    status: "running",
    startedAt: new Date().toISOString(),
    sourceCount: input.state.sources.length,
    prdSourceCount: prdSources.length,
    message: isSubset
      ? `${selectedWorkflows.map((workflow) => workflow.label).join(", ")} 산출물을 재생성합니다.`
      : "산출물별 생성을 순차 진행합니다.",
  }, async (job) => {
    try {
      input.ctx.streams.open(stagedChannel, input.companyId);
    } catch {
      /* ignore */
    }
    emitStaged("start", "산출물별 생성을 시작합니다.");
    const effects: DeliverableWorkflowEffects = {
      callLlmTool: async (prompt, tool, maxTokens) => {
        if (llmDisabled) throw new Error("COS_BLUEPRINT_DISABLE_LLM");
        return callBlueprintLlmTool(prompt, tool, maxTokens, BLUEPRINT_STAGED_LLM_TIMEOUT_MS);
      },
      isAborted: async () => {
        const fresh = await readState(input.ctx, scope);
        return !isCurrentJob(fresh, job);
      },
      log: async (message, metadata) => {
        input.ctx.logger?.info?.(`[blueprint-staged] ${message} ${JSON.stringify(metadata ?? {})}`);
        await safeLog(input.ctx, {
          companyId: input.companyId,
          message,
          entityType: "project",
          entityId: projectId,
          metadata: { plugin: PLUGIN_ID, ...(metadata ?? {}) },
        });
      },
      commit: async (assembled, writeSlotKeys) => {
        const ok = await withStateLock(scope, async (): Promise<boolean> => {
          const fresh = await readState(input.ctx, scope);
          if (!isCurrentJob(fresh, job)) return false;
          await writeState(input.ctx, scope, { ...fresh, prd: assembled, requirementInventory: seedInventory });
          return true;
        });
        if (ok) emitStaged("stage", `산출물 생성 진행: ${[...writeSlotKeys].join(",")}`);
        return { aborted: !ok };
      },
    };

    const result = await runDeliverableWorkflows(selectedWorkflows, stageCtx, effects);

    await withStateLock(scope, async () => {
      const fresh = await readState(input.ctx, scope);
      if (!isCurrentJob(fresh, job)) return;
      const finalPrd: BlueprintPrd = {
        ...result.prd,
        generatedAt: new Date().toISOString(),
        confirmedAt: null,
        usedFallback: result.usedFallback,
        llmModel: LLM_MODEL,
      };
      await writeState(input.ctx, scope, {
        ...fresh,
        prd: finalPrd,
        requirementInventory: seedInventory,
        stagedPendingSlotKeys: pendingSlotKeys,
        job: { ...job, status: "running", message: STAGED_PRD_SLOTS_PENDING_MESSAGE },
      });
    });

    input.ctx.logger?.info?.(`[blueprint-staged] complete usedFallback=${result.usedFallback} stages=${JSON.stringify(result.stages)}`);
    await safeLog(input.ctx, {
      companyId: input.companyId,
      message: `COS Blueprint staged deliverable generation complete for ${result.prd.projectTitle}`,
      entityType: "project",
      entityId: projectId,
      metadata: { plugin: PLUGIN_ID, stages: result.stages, usedFallback: result.usedFallback },
    });
    emitStaged("done", `생성 완료(usedFallback=${result.usedFallback})`);
    try {
      input.ctx.streams.close(stagedChannel);
    } catch {
      /* ignore */
    }
  });
}

async function generateScreenPlan(input: {
  prd: BlueprintPrd;
  sources: SourceMaterial[];
  agentGuidelinesMarkdown?: string;
  requirementInventory?: RequirementInventory | null;
}): Promise<ScreenPlan> {
  const fallback = buildFallbackScreenPlan({ sources: input.sources, prd: input.prd, model: LLM_MODEL });
  if (process.env.COS_BLUEPRINT_DISABLE_LLM === "true") return fallback;

  try {
    const prompt = buildScreenPrompt(input);
    const planInput = await callBlueprintLlmTool(prompt, SCREEN_PLAN_TOOL, 16000);
    return repairGenericScreenPlanFromSources({
      screenPlan: {
        ...normalizeScreenPlanJson(planInput, fallback, input.prd.productBuilderBasePackages),
        llmModel: LLM_MODEL,
      },
      sources: input.sources,
      prd: input.prd,
      model: LLM_MODEL,
    });
  } catch (e) {
    console.error("[blueprint] generateScreenPlan 실패 → fallback:", e instanceof Error ? e.message : e);
    return {
      ...fallback,
      usedFallback: true,
    };
  }
}

async function generateSingleScreen(input: {
  prd: BlueprintPrd;
  sources: SourceMaterial[];
  screen: ScreenDefinition;
  feedback: string;
  agentGuidelinesMarkdown?: string;
}): Promise<ScreenDefinition> {
  if (process.env.COS_BLUEPRINT_DISABLE_LLM === "true") return input.screen;

  try {
    const prompt = buildScreenRegenPrompt(input);
    const record = await callBlueprintLlmTool(prompt, SCREEN_REGEN_TOOL, 6000);
    const normalized = normalizeScreenDefinition(record?.screen, 0, input.prd.productBuilderBasePackages);
    return { ...normalized, code: input.screen.code };
  } catch (e) {
    console.error("[blueprint] generateSingleScreen 실패 → 원본 유지:", e instanceof Error ? e.message : e);
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
    const { name: submitBlueprintPrdToolName, ...submitBlueprintPrdToolDecl } = SUBMIT_BLUEPRINT_PRD_TOOL;
    ctx.tools.register(submitBlueprintPrdToolName, submitBlueprintPrdToolDecl, async (params, runCtx) => {
      try {
        const result = await submitBlueprintPrdFromTool(ctx, params, runCtx);
        return {
          content: `Blueprint 개발 요구사항 브리프 저장 완료: ${result.prd.projectTitle}. slots=${result.slots.map((slot) => slot.slotKey).join(", ")}`,
          data: result,
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
      }
    });

    ctx.data.register(DATA.overview, async (params) => {
      const companyId = stringValue(params.companyId);
      const projectId = stringValue(params.projectId);
      let state = companyId ? await readState(ctx, { companyId, projectId }) : emptyState();
      if (companyId && projectId) {
        state = await syncBlueprintPmPrdJob({ ctx, companyId, projectId, state });
        state = await syncStagedPrdSlots({ ctx, companyId, projectId, state });
      }
      return buildOverview(state);
    });

    ctx.data.register(DATA.projects, async (params) => {
      const companyId = stringValue(params.companyId);
      if (!companyId || !isAllowedCompany(companyId)) return [] as ProjectSummary[];
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
      let state = await readState(ctx, { companyId, projectId });
      state = await syncBlueprintPmPrdJob({ ctx, companyId, projectId, state });
      state = await syncStagedPrdSlots({ ctx, companyId, projectId, state });
      return readProjectDocumentSlotsView(ctx, companyId, projectId, state);
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
          prd: null,
          screenPlan: null,
          taskListBuild: null,
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
      let title = stringValue(record.title);
      const url = normalizeSourceUrl(record.url);
      const bodyInput = stringValue(record.body);
      if (!title) throw new Error("title is required");
      if (!bodyInput && !url) throw new Error("body or url is required");
      const projectId = stringValue(record.projectId);
      const scope = { companyId, projectId };
      const requestedFormat = sourceFormat(record.format ?? (url ? (isFigmaUrl(url) ? "figma" : isNotionSharedPageUrl(url) ? "notion" : "url") : undefined));
      const intakeWorkflow = resolveSourceIntakeWorkflow({
        requestedWorkflow: record.intakeWorkflow,
        format: requestedFormat,
        url,
        fileName: stringValue(record.fileName),
        hasBody: Boolean(bodyInput),
      });
      const format = intakeWorkflow.id === "notion_shared_page" || intakeWorkflow.id === "figma"
        ? intakeWorkflow.format
        : requestedFormat;
      let body = bodyInput ?? "";
      let fetchStatus: SourceMaterial["fetchStatus"] | undefined;
      let fetchedAt: string | undefined;
      let fetchError: string | undefined;
      let intakeLinks: SourceMaterial["links"] | undefined;

      if (url && intakeWorkflow.id === "notion_shared_page") {
        const shouldFetch = record.fetchUrl !== false;
        if (shouldFetch) {
          const notion = await fetchNotionSharedPageSource(url);
          if (notion.title) title = notion.title;
          fetchStatus = notion.fetchStatus;
          fetchedAt = notion.fetchedAt;
          fetchError = notion.fetchError;
          intakeLinks = extractIntakeLinks(notion.metadata);
          body = [
            body ? "## 등록 메모(Notes)" : null,
            body || null,
            notion.body,
          ].filter((line): line is string => line !== null).join("\n\n");
        } else {
          fetchStatus = "not_fetched";
          body = [
            body || null,
            "## 노션 공유페이지(Notion Shared Page)",
            url,
          ].filter((line): line is string => line !== null).join("\n\n");
        }
      } else if (url && isFigmaUrl(url)) {
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
        intakeWorkflow: intakeWorkflow.id,
        fetchStatus,
        fetchedAt,
        fetchError,
      };
      const fingerprint = sourceFingerprint(source);
      source.fingerprint = fingerprint;
      if (intakeLinks) source.links = intakeLinks;

      const result = await withStateLock(scope, async (): Promise<SourceDocumentRegisterResult> => {
        const persistRegisteredSource = async (
          slot: ProjectDocumentSlotUpdate | null = null,
          replaceTarget: SourceDeletionTarget | null = null,
          baseState?: CosBlueprintState,
        ) => {
          const state = baseState ?? await readState(ctx, scope);
          const retainedSources = replaceTarget && projectId
            ? state.sources.filter((entry) => !sourceMatchesDeletionTarget(entry, replaceTarget, projectId))
            : state.sources;
          await writeState(ctx, scope, {
            ...state,
            sources: [source, ...retainedSources],
            requirementInventory: null,
            prd: null,
            screenPlan: null,
            taskListBuild: null,
            projectDocumentSlots: slot
              ? mergeProjectDocumentSlotUpdates(state.projectDocumentSlots, [slot])
              : state.projectDocumentSlots,
          });
        };

        if (!projectId) {
          await persistRegisteredSource();
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

        const file = sourceDocPath(source, projectId);
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
        const stateBeforeImport = await readState(ctx, scope);
        const replacementTarget = buildReplacementTargetForSource({
          source,
          projectId,
          entries: objectList(currentMetadata.sources),
          sources: stateBeforeImport.sources,
        });
        const updatedSlot = await importProjectSourceDocumentSlot(
          ctx,
          companyId,
          projectId,
          slot,
          body,
          sourceDocumentEntry(source, fingerprint, file),
          { replaceTarget: replacementTarget },
        );
        await persistRegisteredSource(updatedSlot, replacementTarget, stateBeforeImport);
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

    ctx.actions.register(ACTION.reanalyzeSourceDocument, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      if (!projectId) throw new Error("projectId is required");

      const sourceId = stringValue(record.sourceId);
      const documentRef = stringValue(record.documentRef) ?? stringValue(record.file);
      const sourceFingerprint = stringValue(record.sourceFingerprint);
      const requestedSlotKey = sourceSlotKeyFromValue(record.slotKey);
      if (!sourceId && !documentRef && !sourceFingerprint) {
        throw new Error("sourceId, documentRef, or sourceFingerprint is required");
      }

      const scope = { companyId, projectId };
      const result = await withStateLock(scope, async () => {
        const fresh = await readState(ctx, scope);
        const target = createSourceDeletionTarget({ sourceId, documentRef, fingerprint: sourceFingerprint });

        const existingSource = fresh.sources.find((source) => sourceMatchesDeletionTarget(source, target, projectId));
        if (!existingSource) {
          throw new Error("재분석할 등록 자료를 찾을 수 없습니다.");
        }
        addSourceToDeletionTarget(target, existingSource, projectId);

        const oldSlotKey = requestedSlotKey ?? projectSlotUpdateForSource(existingSource, null).slotKey;
        const content = await ctx.projects.documentSlots.content(projectId, oldSlotKey, companyId).catch(() => null);
        const metadata = asRecord(content?.slot?.metadata);
        const entries = objectList(metadata.sources);
        const matchedEntries = entries.filter((entry) => sourceEntryMatchesDeletionTarget(entry, target));
        for (const entry of matchedEntries) addSourceEntryToDeletionTarget(target, entry);

        const reFetchFromOriginalLocation = Boolean(existingSource.url)
          && (
            existingSource.intakeWorkflow === "url"
            || existingSource.intakeWorkflow === "notion_shared_page"
            || existingSource.intakeWorkflow === "figma"
            || existingSource.format === "url"
            || existingSource.format === "notion"
            || existingSource.format === "figma"
          );
        const prepared = await prepareSourceMaterialFromWorkflowInput({
          title: existingSource.title,
          type: existingSource.type,
          body: reFetchFromOriginalLocation ? undefined : existingSource.body,
          url: existingSource.url,
          fileName: existingSource.fileName,
          format: existingSource.format,
          intakeWorkflow: existingSource.intakeWorkflow,
          fetchUrl: true,
        }, companyId);

        const source = prepared.source;
        const file = sourceDocPath(source, projectId);
        const renderedBody = renderSourceDocument(source);
        const sourceEntry = sourceDocumentEntry(source, prepared.fingerprint, file, prepared.metadata);
        const currentBody = typeof content?.document?.body === "string" ? content.document.body : "";
        const mutation = applySourceSlotMutation({
          currentBody,
          currentMetadata: metadata,
          target,
          append: {
            body: renderedBody,
            entry: sourceEntry,
            documentRefs: [file],
          },
        });
        const nextSlot = projectSlotUpdateForKey(oldSlotKey, mutation.documentRefs, "ready");

        await importProjectDocumentSlot(ctx, companyId, projectId, nextSlot, mutation.body, {
          ...stripSourceEntryMetadata(metadata),
          ...sourceEntry,
          sources: mutation.sourceEntries,
        });

        let replaced = false;
        const nextSources = fresh.sources.flatMap((entry) => {
          if (!sourceMatchesDeletionTarget(entry, target, projectId)) return [entry];
          if (replaced) return [];
          replaced = true;
          return [source];
        });
        if (!replaced) nextSources.unshift(source);

        await writeState(ctx, scope, {
          ...fresh,
          sources: nextSources,
          requirementInventory: null,
          prd: null,
          screenPlan: null,
          taskListBuild: null,
          projectDocumentSlots: replaceProjectDocumentSlotUpdate(fresh.projectDocumentSlots, nextSlot),
        });

        return {
          ok: true,
          reanalyzed: true,
          source,
          projectId,
          file,
          slot: nextSlot,
          replacedSourceId: existingSource.id,
          replacedDocumentRef: documentRef ?? sourceDocPath(existingSource, projectId),
          message: "등록 자료를 기존 source intake workflow로 다시 분석했습니다. 자료 기준이 바뀌어 분석 산출물 상태를 초기화했습니다.",
        };
      });

      await safeLog(ctx, {
        companyId,
        message: `COS Blueprint reanalyzed source document: ${result.file}`,
        entityType: "project",
        entityId: projectId,
        metadata: {
          plugin: PLUGIN_ID,
          sourceId: result.source.id,
          replacedSourceId: result.replacedSourceId,
          file: result.file,
          replacedDocumentRef: result.replacedDocumentRef,
          slotKey: result.slot.slotKey,
          format: result.source.format,
        },
      });

      return result;
    });

    ctx.actions.register(ACTION.deleteSourceDocument, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      if (!projectId) throw new Error("projectId is required");

      const sourceId = stringValue(record.sourceId);
      const documentRef = stringValue(record.documentRef) ?? stringValue(record.file);
      const sourceFingerprint = stringValue(record.sourceFingerprint);
      const requestedSlotKey = sourceSlotKeyFromValue(record.slotKey);
      if (!sourceId && !documentRef && !sourceFingerprint) {
        throw new Error("sourceId, documentRef, or sourceFingerprint is required");
      }

      const scope = { companyId, projectId };
      const result = await withStateLock(scope, async (): Promise<SourceDocumentDeleteResult> => {
        const fresh = await readState(ctx, scope);
        const target = createSourceDeletionTarget({ sourceId, documentRef, fingerprint: sourceFingerprint });

        for (const source of fresh.sources) {
          if (sourceMatchesDeletionTarget(source, target, projectId)) addSourceToDeletionTarget(target, source, projectId);
        }

        const slotKeys = requestedSlotKey
          ? [requestedSlotKey]
          : SOURCE_SLOT_KEYS as ProjectDocumentSlotKey[];
        let selected: {
          slotKey: ProjectDocumentSlotKey;
          content: Awaited<ReturnType<AnyCtx["projects"]["documentSlots"]["content"]>> | null;
          metadata: Record<string, unknown>;
          entries: Record<string, unknown>[];
        } | null = null;

        for (const slotKey of slotKeys) {
          const content = await ctx.projects.documentSlots.content(projectId, slotKey, companyId).catch(() => null);
          const metadata = asRecord(content?.slot?.metadata);
          const entries = objectList(metadata.sources);
          const matchedEntries = entries.filter((entry) => sourceEntryMatchesDeletionTarget(entry, target));
          if (matchedEntries.length === 0 && requestedSlotKey !== slotKey) continue;
          for (const entry of matchedEntries) addSourceEntryToDeletionTarget(target, entry);
          selected = { slotKey, content, metadata, entries };
          break;
        }

        if (!selected) {
          const fallbackSource = fresh.sources.find((source) => sourceMatchesDeletionTarget(source, target, projectId));
          if (fallbackSource) {
            const fallbackSlotKey = requestedSlotKey ?? projectSlotUpdateForSource(fallbackSource, null).slotKey;
            const content = await ctx.projects.documentSlots.content(projectId, fallbackSlotKey, companyId).catch(() => null);
            selected = {
              slotKey: fallbackSlotKey,
              content,
              metadata: asRecord(content?.slot?.metadata),
              entries: objectList(content?.slot?.metadata?.sources),
            };
          }
        }

        if (!selected) {
          return {
            ok: false,
            removed: false,
            projectId,
            sourceId: sourceId ?? null,
            documentRef: documentRef ?? null,
            slot: null,
            removedBodyBlock: false,
            message: "삭제할 등록 자료를 찾을 수 없습니다.",
          };
        }

        const matchedEntries = selected.entries.filter((entry) => sourceEntryMatchesDeletionTarget(entry, target));
        for (const entry of matchedEntries) addSourceEntryToDeletionTarget(target, entry);
        const currentBody = typeof selected.content?.document?.body === "string" ? selected.content.document.body : "";
        const mutation = applySourceSlotMutation({
          currentBody,
          currentMetadata: selected.metadata,
          target,
        });
        const nextSlot = projectSlotUpdateForKey(
          selected.slotKey,
          mutation.documentRefs,
          mutation.documentRefs.length > 0 || mutation.body.trim() ? "ready" : "empty",
        );
        const nextSources = fresh.sources.filter((source) => !sourceMatchesDeletionTarget(source, target, projectId));
        const removed = mutation.removedEntries.length > 0
          || mutation.removedBodyBlock
          || mutation.removedDocumentRef
          || nextSources.length !== fresh.sources.length;

        if (!removed) {
          return {
            ok: false,
            removed: false,
            projectId,
            sourceId: sourceId ?? null,
            documentRef: documentRef ?? null,
            slot: nextSlot,
            removedBodyBlock: false,
            message: "삭제할 등록 자료를 찾을 수 없습니다.",
          };
        }

        const lastRemainingEntry = mutation.sourceEntries.at(-1);
        await importProjectDocumentSlot(ctx, companyId, projectId, nextSlot, mutation.body || "\n", {
          ...stripSourceEntryMetadata(selected.metadata),
          ...(lastRemainingEntry ?? {}),
          sources: mutation.sourceEntries,
        });

        await writeState(ctx, scope, {
          ...fresh,
          sources: nextSources,
          requirementInventory: null,
          prd: null,
          screenPlan: null,
          taskListBuild: null,
          projectDocumentSlots: replaceProjectDocumentSlotUpdate(fresh.projectDocumentSlots, nextSlot),
        });

        return {
          ok: true,
          removed: true,
          projectId,
          sourceId: sourceId ?? matchedEntries.map((entry) => stringValue(entry.sourceId)).find(Boolean) ?? null,
          documentRef: documentRef ?? matchedEntries.map((entry) => sourceEntryDocumentRef(entry)).find(Boolean) ?? null,
          slot: nextSlot,
          removedBodyBlock: mutation.removedBodyBlock || currentBody.trim().length > 0 && mutation.body.trim().length === 0,
          message: "등록 자료를 삭제했습니다. 자료 기준이 바뀌어 분석 산출물 상태를 초기화했습니다.",
        };
      });

      await safeLog(ctx, {
        companyId,
        message: result.removed
          ? `COS Blueprint deleted source document: ${result.documentRef ?? result.sourceId ?? "unknown"}`
          : "COS Blueprint source document delete skipped: not found",
        entityType: "project",
        entityId: projectId,
        metadata: {
          plugin: PLUGIN_ID,
          sourceId: result.sourceId,
          documentRef: result.documentRef,
          slotKey: result.slot?.slotKey,
          removed: result.removed,
        },
      });

      return result;
    });

    ctx.actions.register(ACTION.registerFigmaSource, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      const url = stringValue(record.url);
      if (!url) throw new Error("url is required");
      if (!projectId) throw new Error("projectId is required");

      let target: { fileKey: string; nodeId: string | null };
      try {
        target = parseFigmaTarget(url);
      } catch (error) {
        const reason = (error as { figmaMcpReason?: FigmaMcpReason }).figmaMcpReason ?? "invalid_url";
        return { ok: false, reason, message: figmaMcpReasonMessage(reason, error instanceof Error ? error.message : undefined) };
      }

      const providedToken = stringValue(record.token);
      if (providedToken) figmaSessions.set(companyId, { token: { accessToken: providedToken } });
      const token = await resolveFigmaToken(companyId);
      if (!token) {
        return { ok: false, reason: "auth_required" as FigmaMcpReason, message: figmaMcpReasonMessage("auth_required") };
      }

      let normalized: Awaited<ReturnType<typeof figmaMcpExtract>>;
      try {
        normalized = await figmaMcpExtract(token, target.fileKey, target.nodeId);
      } catch (error) {
        const reason = (error as { figmaMcpReason?: FigmaMcpReason }).figmaMcpReason ?? "mcp_error";
        if (reason === "auth_required") figmaSessions.delete(companyId);
        return { ok: false, reason, message: figmaMcpReasonMessage(reason, error instanceof Error ? error.message : undefined) };
      }
      if (normalized.screenCount === 0) {
        return { ok: false, reason: "not_found" as FigmaMcpReason, message: "Figma 에서 화면(프레임)을 찾지 못했습니다. 파일에 프레임이 있는지, 또는 특정 프레임 링크로 다시 시도하세요." };
      }

      const title = `Figma: ${normalized.fileName}`.slice(0, 120);
      const source: SourceMaterial = {
        id: randomUUID(),
        title,
        type: sourceType(record.type ?? "external-plan"),
        body: [`## Figma URL`, url, normalized.body].join("\n\n"),
        createdAt: new Date().toISOString(),
        fileName: undefined,
        format: "figma" as SourceFormat,
        url,
        intakeWorkflow: "figma",
        fetchStatus: "fetched",
        fetchedAt: new Date().toISOString(),
        fetchError: undefined,
      };
      const fingerprint = sourceFingerprint(source);
      source.fingerprint = fingerprint;

      const file = sourceDocPath(source, projectId);
      const slot = projectSlotUpdateForSource(source, file);
      const renderedBody = renderSourceDocument(source);
      const scope = { companyId, projectId };
      const updatedSlot = await withStateLock(scope, async () => {
        const state = await readState(ctx, scope);
        const current = await ctx.projects.documentSlots.content(projectId, slot.slotKey, companyId);
        const currentMetadata = asRecord(current?.slot?.metadata);
        const replacementTarget = buildReplacementTargetForSource({
          source,
          projectId,
          entries: objectList(currentMetadata.sources),
          sources: state.sources,
        });
        const us = await importProjectSourceDocumentSlot(
          ctx,
          companyId,
          projectId,
          slot,
          renderedBody,
          sourceDocumentEntry(source, fingerprint, file, {
            figmaScreenCount: normalized.screenCount,
            figmaSections: normalized.sections,
          }),
          { replaceTarget: replacementTarget },
        );
        const retainedSources = replacementTarget
          ? state.sources.filter((entry) => !sourceMatchesDeletionTarget(entry, replacementTarget, projectId))
          : state.sources;
        await writeState(ctx, scope, {
          ...state,
          sources: [source, ...retainedSources],
          requirementInventory: null,
          prd: null,
          screenPlan: null,
          taskListBuild: null,
          projectDocumentSlots: mergeProjectDocumentSlotUpdates(state.projectDocumentSlots, [us]),
        });
        return us;
      });

      await safeLog(ctx, {
        companyId,
        message: `COS Blueprint registered Figma source: ${normalized.fileName} (${normalized.screenCount} screens)`,
        entityType: "project",
        entityId: projectId,
        metadata: { plugin: PLUGIN_ID, sourceId: source.id, slotKey: updatedSlot.slotKey, format: "figma", screenCount: normalized.screenCount },
      });

      return {
        ok: true,
        slot: updatedSlot,
        file,
        screenCount: normalized.screenCount,
        sections: normalized.sections,
        message: `Figma "${normalized.fileName}"에서 화면 ${normalized.screenCount}개를 추출해 등록했습니다.`,
      };
    });

    ctx.actions.register(ACTION.startFigmaAuth, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const redirectUri = stringValue(record.redirectUri);
      if (!redirectUri) throw new Error("redirectUri is required");
      try {
        const client = await registerFigmaOAuthClient(redirectUri);
        const { verifier, challenge } = generatePkce();
        const state = randomState();
        figmaPendingAuth.set(state, { verifier, client, redirectUri, companyId });
        return { ok: true, authorizeUrl: buildFigmaAuthorizeUrl({ clientId: client.clientId, redirectUri, challenge, state }), state };
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : String(error) };
      }
    });

    ctx.actions.register(ACTION.completeFigmaAuth, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const code = stringValue(record.code);
      const state = stringValue(record.state);
      if (!code || !state) throw new Error("code and state are required");
      const pending = figmaPendingAuth.get(state);
      if (!pending) return { ok: false, message: "인증 세션을 찾을 수 없습니다(만료). 다시 시도하세요." };
      if (pending.companyId !== companyId) return { ok: false, message: "회사 컨텍스트가 일치하지 않습니다." };
      try {
        const token = await exchangeFigmaCode({ client: pending.client, code, verifier: pending.verifier, redirectUri: pending.redirectUri });
        figmaSessions.set(companyId, { token, client: pending.client });
        figmaPendingAuth.delete(state);
        return { ok: true, message: "Figma 인증이 완료되었습니다. 다시 등록하세요." };
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : String(error) };
      }
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
      let selectedBasePackageKeys: ProductBuilderBasePackageKey[] = [...DEFAULT_PRODUCT_BUILDER_BASE_PACKAGE_KEYS];
      await withStateLock(scope, async () => {
        const state = await readState(ctx, scope);
        selectedBasePackageKeys = state.productBuilderBasePackageKeys;
        await writeState(ctx, scope, {
          ...state,
          productBuilderBlueprintId: blueprintId,
          productBuilderBlueprintSelectedAt: selectedAt,
        });
      });
      const metadataUpdate = projectId
        ? await updatePrdSlotProductBuilderMetadata(ctx, companyId, projectId, blueprintId, selectedBasePackageKeys, selectedAt)
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
          : "Product Builder 제품 유형을 저장했습니다. 개발 요구사항 브리프 산출 시 Project document slot metadata에 반영됩니다.",
      };
    });

    ctx.actions.register(ACTION.setProductBuilderBasePackages, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      const scope = { companyId, projectId };
      const basePackageKeys = productBuilderBasePackageKeys(record.packageKeys);
      const selectedAt = new Date().toISOString();
      let selectedBlueprintId = DEFAULT_PRODUCT_BUILDER_BLUEPRINT_ID;
      await withStateLock(scope, async () => {
        const state = await readState(ctx, scope);
        selectedBlueprintId = state.productBuilderBlueprintId;
        await writeState(ctx, scope, {
          ...state,
          productBuilderBasePackageKeys: basePackageKeys,
          prd: state.prd
            ? {
              ...state.prd,
              productBuilderBasePackages: productBuilderBasePackageSelections(basePackageKeys),
            }
            : null,
          updatedAt: selectedAt,
        });
      });
      const metadataUpdate = projectId
        ? await updatePrdSlotProductBuilderMetadata(ctx, companyId, projectId, selectedBlueprintId, basePackageKeys, selectedAt)
        : { ok: false, error: "projectId not provided" };
      await safeLog(ctx, {
        companyId,
        message: `COS Blueprint Product Builder base package scope selected: ${basePackageKeys.join(", ")}`,
        entityType: projectId ? "project" : "plugin",
        entityId: projectId ?? PLUGIN_ID,
        metadata: {
          plugin: PLUGIN_ID,
          projectId: projectId ?? null,
          ...productBuilderBasePackageMetadata(basePackageKeys),
          slotMetadataUpdated: metadataUpdate.ok,
          slotMetadataError: metadataUpdate.ok ? null : metadataUpdate.error,
        },
      });
      return {
        ok: true,
        projectId: projectId ?? null,
        packageKeys: basePackageKeys,
        selectedAt,
        slotMetadataUpdated: metadataUpdate.ok,
        message: metadataUpdate.ok
          ? "Product Builder base 구성 범위를 저장하고 Project document slot metadata를 갱신했습니다."
          : "Product Builder base 구성 범위를 저장했습니다. 개발 요구사항 브리프 산출 시 Project document slot metadata에 반영됩니다.",
      };
    });

    ctx.actions.register(ACTION.setAgentGuidelines, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      const scope = { companyId, projectId };
      const guidelinesMarkdown = markdownValue(record.guidelinesMarkdown);
      const rawSection = stringValue(record.section) ?? "";
      const roleSection = (AGENT_GUIDELINE_ROLE_KEYS as readonly string[]).includes(rawSection)
        ? (rawSection as AgentGuidelineRoleKey)
        : null;
      const section: "common" | AgentGuidelineRoleKey = roleSection ?? "common";
      const savedAt = new Date().toISOString();
      await withStateLock(scope, async () => {
        const state = await readState(ctx, scope);
        if (roleSection) {
          await writeState(ctx, scope, {
            ...state,
            agentRoleGuidelines: {
              ...state.agentRoleGuidelines,
              [roleSection]: guidelinesMarkdown,
            },
            updatedAt: savedAt,
          });
        } else {
          await writeState(ctx, scope, {
            ...state,
            agentGuidelinesMarkdown: guidelinesMarkdown,
            updatedAt: savedAt,
          });
        }
      });
      await safeLog(ctx, {
        companyId,
        message: "COS Blueprint agent guidelines saved",
        entityType: projectId ? "project" : "plugin",
        entityId: projectId ?? PLUGIN_ID,
        metadata: {
          plugin: PLUGIN_ID,
          projectId: projectId ?? null,
          section,
          hasAgentGuidelines: guidelinesMarkdown.length > 0,
          agentGuidelinesLength: guidelinesMarkdown.length,
        },
      });
      return {
        ok: true,
        projectId: projectId ?? null,
        section,
        guidelinesMarkdown,
        savedAt,
        message: guidelinesMarkdown
          ? "에이전트 필수 가이드라인을 저장했습니다."
          : "에이전트 필수 가이드라인을 비웠습니다.",
      };
    });

    ctx.actions.register(ACTION.runPrd, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      const title = stringValue(record.title);
      const initial = await readState(ctx, { companyId, projectId });
      const mode = (process.env.COS_BUILDER_PRD_MODE ?? "staged").trim().toLowerCase();
      return mode === "agent"
        ? startBlueprintPmPrdJob({ ctx, companyId, projectId, title, state: initial })
        : startBlueprintStagedPrdJob({ ctx, companyId, projectId, title, state: initial });
    });

    ctx.actions.register(ACTION.confirmPrd, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      const scope = { companyId, projectId };
      let selectedProductBuilderBlueprintId = DEFAULT_PRODUCT_BUILDER_BLUEPRINT_ID;
      let selectedProductBuilderBlueprintSelectedAt: string | null = null;
      let selectedBasePackageKeys: ProductBuilderBasePackageKey[] = [...DEFAULT_PRODUCT_BUILDER_BASE_PACKAGE_KEYS];
      const confirmed = await withStateLock(scope, async (): Promise<BlueprintPrd> => {
        const fresh = await readState(ctx, scope);
        if (!fresh.prd) throw new Error("개발 요구사항 브리프/계약 산출물을 먼저 생성하세요.");
        selectedProductBuilderBlueprintId = fresh.productBuilderBlueprintId;
        selectedProductBuilderBlueprintSelectedAt = fresh.productBuilderBlueprintSelectedAt;
        selectedBasePackageKeys = fresh.productBuilderBasePackageKeys;
        const prd: BlueprintPrd = { ...fresh.prd, confirmedAt: new Date().toISOString() };
        await writeState(ctx, scope, {
          ...fresh,
          prd,
          projectDocumentSlots: fresh.projectDocumentSlots.map((slot) => (
            slot.slotKey === "deliverable.prd"
              ? { ...slot, status: "approved", updatedAt: prd.confirmedAt as string }
              : slot
          )),
        });
        return prd;
      });
      if (projectId) {
        await ctx.projects.documentSlots.update(projectId, "deliverable.prd", {
          status: "approved",
          metadata: {
            plugin: PLUGIN_ID,
            ...productBuilderBlueprintMetadata(selectedProductBuilderBlueprintId),
            ...productBuilderBasePackageMetadata(selectedBasePackageKeys),
            productBuilderBlueprintSelectedAt: selectedProductBuilderBlueprintSelectedAt ?? confirmed.generatedAt,
            confirmedAt: confirmed.confirmedAt,
            projectTitle: confirmed.projectTitle,
          },
        }, companyId);
      }
      await safeLog(ctx, {
        companyId,
        message: `COS Blueprint Development Requirements Brief confirmed: ${confirmed.projectTitle}`,
        entityType: "plugin",
        entityId: projectId ?? PLUGIN_ID,
        metadata: { confirmedAt: confirmed.confirmedAt, projectId: projectId ?? null },
      });
      return confirmed;
    });

    ctx.actions.register(ACTION.confirmScreenPlan, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      const scope = { companyId, projectId };
      let screenCount = 0;
      let projectTitle = "";
      const confirmedAt = await withStateLock(scope, async (): Promise<string> => {
        const fresh = await readState(ctx, scope);
        if (!fresh.screenPlan) throw new Error("화면정의서를 먼저 생성하세요.");
        const now = new Date().toISOString();
        const reviews: Record<string, ScreenReview> = { ...(fresh.screenPlan.reviews ?? {}) };
        for (const screen of fresh.screenPlan.screens) {
          const prev = reviews[screen.code];
          reviews[screen.code] = { status: "approved", comments: prev?.comments ?? [], updatedAt: now };
        }
        screenCount = fresh.screenPlan.screens.length;
        projectTitle = fresh.prd?.projectTitle ?? "";
        await writeState(ctx, scope, {
          ...fresh,
          screenPlan: { ...fresh.screenPlan, reviews, confirmedAt: now },
          projectDocumentSlots: fresh.projectDocumentSlots.map((slot) => (
            slot.slotKey === "deliverable.screen_definitions"
              ? { ...slot, status: "approved", updatedAt: now }
              : slot
          )),
        });
        return now;
      });
      if (projectId) {
        const current = await ctx.projects.documentSlots
          .content(projectId, "deliverable.screen_definitions", companyId)
          .catch(() => null);
        const currentMeta = asRecord(current?.slot?.metadata);
        await ctx.projects.documentSlots.update(projectId, "deliverable.screen_definitions", {
          status: "approved",
          metadata: {
            ...currentMeta,
            plugin: PLUGIN_ID,
            screenReviewStatus: "approved",
            confirmedAt,
            screenCount,
            projectTitle,
          },
        }, companyId);
      }
      await safeLog(ctx, {
        companyId,
        message: `COS Blueprint screen plan confirmed: ${projectTitle || projectId}`,
        entityType: "plugin",
        entityId: projectId ?? PLUGIN_ID,
        metadata: { confirmedAt, projectId: projectId ?? null, screenCount },
      });
      return { ok: true, confirmedAt, screenCount };
    });

    ctx.actions.register(ACTION.writePrdDocs, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      const scope = { companyId, projectId };
      const state = await readState(ctx, scope);
      return writeBlueprintPrdDocumentsToSlots(ctx, companyId, projectId, state);
    });

    ctx.actions.register(ACTION.generateTaskList, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      const scope = { companyId, projectId };
      const state = await readState(ctx, scope);
      return writeBlueprintTaskListDocuments(ctx, companyId, projectId, state);
    });

    ctx.actions.register(ACTION.instantiateWorkflow, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      const scope = { companyId, projectId };
      const state = await readState(ctx, scope);
      return instantiateWorkflowIssues(ctx, companyId, projectId, state);
    });

    ctx.actions.register(ACTION.runScreens, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      const scope = { companyId, projectId };
      const initial = await readState(ctx, scope);
      return startScreensAndWriteJob(ctx, scope, initial);
    });

    ctx.actions.register(ACTION.writeScreenDocs, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      const scope = { companyId, projectId };
      const state = await readState(ctx, scope);
      const result = await writeScreenDocumentsToSlots(ctx, companyId, projectId, state);
      await withStateLock(scope, async () => {
        const fresh = await readState(ctx, scope);
        if (fresh.job?.kind !== "screens" || fresh.job.status !== "running") return;
        if (!fresh.screenPlan) return;
        await writeState(ctx, scope, { ...fresh, job: null });
      });
      return result;
    });

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

    ctx.actions.register(ACTION.regenerateScreen, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      const scope = { companyId, projectId };
      const screenCode = stringValue(record.screenCode);
      if (!screenCode) throw new Error("screenCode is required");
      const feedback = stringValue(record.feedback) ?? "";

      const initial = await readState(ctx, scope);
      if (!initial.prd?.confirmedAt) {
        throw new Error("개발 요구사항 브리프 기준선이 확정되지 않아 화면을 재생성할 수 없습니다.");
      }
      if (!initial.screenPlan) throw new Error("화면정의서를 먼저 생성하세요.");
      const target = initial.screenPlan.screens.find((s) => s.code === screenCode);
      if (!target) throw new Error(`화면 코드를 찾을 수 없습니다: ${screenCode}`);

      const pinnedGeneratedAt = initial.screenPlan.generatedAt;
      const prd = initial.prd;

      const jobResult = await startJob(ctx, scope, { kind: "screen", status: "running", screenCode, startedAt: new Date().toISOString() }, async (job) => {
        const newScreen = await generateSingleScreen({
          prd,
          sources: initial.sources,
          screen: target,
          feedback,
          agentGuidelinesMarkdown: initial.agentGuidelinesMarkdown,
        });
        const commitStatus = await withStateLock(scope, async (): Promise<"committed" | "stale-data" | "stale-job"> => {
          const fresh = await readState(ctx, scope);
          if (!isCurrentJob(fresh, job)) return "stale-job";
          if (!fresh.prd?.confirmedAt || !fresh.screenPlan
            || fresh.screenPlan.generatedAt !== pinnedGeneratedAt
            || !fresh.screenPlan.screens.some((s) => s.code === screenCode)) {
            return "stale-data";
          }
          const screens = fresh.screenPlan.screens.map((s) => (s.code === screenCode ? newScreen : s));
          const reviews = { ...(fresh.screenPlan.reviews ?? {}) };
          const prev = reviews[screenCode] ?? { status: "pending" as const, comments: [], updatedAt: "" };
          reviews[screenCode] = { ...prev, status: "pending", updatedAt: new Date().toISOString() };
          await writeState(ctx, scope, { ...fresh, screenPlan: { ...fresh.screenPlan, screens, reviews }, taskListBuild: null, job: null });
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

    ctx.actions.register(ACTION.chatWithPmAgent, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId) ?? null;
      const message = stringValue(record.message);
      if (!message) throw new Error("message is required");

      await reconcileBlueprintManagedResources(ctx, companyId, "reconcile");
      const resolved = await ctx.agents.managed.get(BLUEPRINT_PM_AGENT_KEY, companyId);
      if (!resolved.agentId || !resolved.agent) {
        throw new Error("Blueprint PM Agent를 찾을 수 없습니다. 관리 리소스를 다시 준비하세요.");
      }
      if (resolved.agent.status === "terminated" || resolved.agent.status === "pending_approval") {
        throw new Error(`Blueprint PM Agent 상태가 ${resolved.agent.status}라서 채팅을 시작할 수 없습니다.`);
      }

      const scope = { companyId, projectId: projectId ?? undefined };
      const state = await readState(ctx, scope);
      const slots = projectId
        ? await readProjectDocumentSlotsView(ctx, companyId, projectId, state).catch(() => null)
        : null;
      const pmContext = await loadBlueprintPmAgentRuntimeContext(ctx, companyId, resolved.agent);
      const activeContext = pmChatActiveContextFromParams(record);
      const channel = blueprintPmChatChannel(companyId, projectId);
      const emit = (event: BlueprintPmChatStreamEvent) => ctx.streams.emit(channel, event);
      ctx.streams.open(channel, companyId);
      emit({
        type: "pm-chat.started",
        sessionId: `direct-${randomUUID()}`,
      });

      try {
        const commandResult = await handlePmChatDeliverableCommand({
          ctx,
          companyId,
          projectId,
          message,
          state,
          activeContext,
          slots,
        });
        if (commandResult) {
          emit({
            type: "agent.event",
            eventType: "chunk",
            stream: "stdout",
            message: commandResult.message,
            payload: commandResult.payload ?? null,
            seq: 1,
          });
          emit({
            type: "pm-chat.done",
            message: commandResult.message,
            payload: commandResult.payload ?? { mode: "deliverable-command" },
            seq: 2,
          });
          ctx.streams.close(channel);
          return { ok: true, channel, message: commandResult.message, mode: "deliverable-command", payload: commandResult.payload ?? null };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        emit({
          type: "pm-chat.error",
          message: errorMessage,
        });
        ctx.streams.close(channel);
        return { ok: false, channel, error: errorMessage, mode: "deliverable-command" };
      }

      const timeout = createPmChatTimeout(PM_CHAT_LLM_TIMEOUT_MS);
      try {
        const reply = await callBlueprintPmChatLlm(
          buildPmChatPrompt({ message, state, slots, pmContext, projectId, activeContext }),
          { signal: timeout.signal, maxTokens: PM_CHAT_MAX_TOKENS },
        );
        emit({
          type: "agent.event",
          eventType: "chunk",
          stream: "stdout",
          message: reply,
          payload: null,
          seq: 1,
        });
        emit({
          type: "pm-chat.done",
          message: reply,
          payload: { mode: "direct-llm" },
          seq: 2,
        });
        ctx.streams.close(channel);
        return { ok: true, channel, message: reply, mode: "direct-llm" };
      } catch (error) {
        const message = pmChatErrorMessage(error, timeout.didTimeout());
        emit({
          type: "pm-chat.error",
          message,
        });
        ctx.streams.close(channel);
        return { ok: false, channel, error: message, mode: "direct-llm" };
      } finally {
        timeout.clear();
      }
    });

    ctx.actions.register(ACTION.saveProjectDocumentSlot, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      if (!projectId) throw new Error("projectId is required");
      const slotKey = projectDocumentSlotKeyFromValue(record.slotKey);
      if (!slotKey) throw new Error("valid slotKey is required");
      if (typeof record.body !== "string") throw new Error("body is required");
      const body = record.body;
      const scope = { companyId, projectId };

      const result = await withStateLock(scope, async () => {
        const fresh = await readState(ctx, scope);
        const current = await ctx.projects.documentSlots.content(projectId, slotKey, companyId).catch(() => null);
        const metadata = asRecord(current?.slot?.metadata);
        const currentStatus = current?.slot?.status;
        const nextStatus = statusForManualDocumentSave(currentStatus);
        const editedAt = new Date().toISOString();

        if (SOURCE_SLOT_KEYS.includes(slotKey)) {
          const sourceId = stringValue(record.sourceId);
          const documentRef = stringValue(record.documentRef) ?? stringValue(record.file);
          const sourceFingerprintValue = stringValue(record.sourceFingerprint);
          if (!sourceId && !documentRef && !sourceFingerprintValue) {
            throw new Error("sourceId, documentRef, or sourceFingerprint is required for source slot save");
          }

          const target = createSourceDeletionTarget({ sourceId, documentRef, fingerprint: sourceFingerprintValue });
          const existingSource = fresh.sources.find((source) => sourceMatchesDeletionTarget(source, target, projectId));
          if (existingSource) addSourceToDeletionTarget(target, existingSource, projectId);

          const entries = objectList(metadata.sources);
          const matchedEntries = entries.filter((entry) => sourceEntryMatchesDeletionTarget(entry, target));
          for (const entry of matchedEntries) addSourceEntryToDeletionTarget(target, entry);
          if (!existingSource && matchedEntries.length === 0) {
            throw new Error("저장할 등록 자료를 찾을 수 없습니다.");
          }

          const matchedEntry = matchedEntries[0] ?? null;
          const editedBody = extractSourceBodyFromRenderedMarkdown(body);
          const baseSource: SourceMaterial = existingSource ?? {
            id: sourceId ?? stringValue(matchedEntry?.sourceId) ?? randomUUID(),
            title: stringValue(matchedEntry?.sourceTitle)
              ?? stringValue(matchedEntry?.fileName)
              ?? stringValue(matchedEntry?.documentRef)
              ?? "등록 자료",
            type: sourceType(matchedEntry?.sourceType),
            body: editedBody,
            createdAt: new Date().toISOString(),
            fileName: stringValue(matchedEntry?.fileName) ?? undefined,
            format: sourceFormat(matchedEntry?.sourceFormat),
            url: stringValue(matchedEntry?.sourceUrl) ?? undefined,
            intakeWorkflow: stringValue(matchedEntry?.sourceIntakeWorkflow) ?? undefined,
            fetchStatus: (stringValue(matchedEntry?.sourceFetchStatus) as SourceMaterial["fetchStatus"] | null) ?? undefined,
            fetchedAt: stringValue(matchedEntry?.sourceFetchedAt) ?? undefined,
          };
          const nextSourceBase: SourceMaterial = {
            ...baseSource,
            body: editedBody,
          };
          const nextFingerprint = sourceFingerprint(nextSourceBase);
          const nextSource: SourceMaterial = {
            ...nextSourceBase,
            fingerprint: nextFingerprint,
          };
          const nextDocumentRef = documentRef
            ?? sourceEntryDocumentRef(matchedEntry ?? {})
            ?? sourceDocPath(nextSource, projectId);
          target.documentRefs.add(nextDocumentRef);

          const currentBody = typeof current?.document?.body === "string" ? current.document.body : "";
          const sourceEntry = sourceDocumentEntry(
            nextSource,
            nextFingerprint,
            nextDocumentRef,
            {
              ...stripSourceEntryMetadata(matchedEntry ?? {}),
              manuallyEditedAt: editedAt,
            },
          );
          const mutation = applySourceSlotMutation({
            currentBody,
            currentMetadata: metadata,
            target,
            append: {
              body,
              entry: sourceEntry,
              documentRefs: [nextDocumentRef],
            },
          });
          const nextSlot = projectSlotUpdateForKey(slotKey, mutation.documentRefs, nextStatus);

          await importProjectDocumentSlot(ctx, companyId, projectId, nextSlot, mutation.body, {
            ...stripSourceEntryMetadata(metadata),
            ...sourceEntry,
            manuallyEditedAt: editedAt,
            sources: mutation.sourceEntries,
          });

          let replaced = false;
          const nextSources = fresh.sources.flatMap((source) => {
            if (!sourceMatchesDeletionTarget(source, target, projectId)) return [source];
            if (replaced) return [];
            replaced = true;
            return [nextSource];
          });
          if (!replaced) nextSources.unshift(nextSource);

          await writeState(ctx, scope, {
            ...fresh,
            sources: nextSources,
            requirementInventory: null,
            prd: null,
            screenPlan: null,
            taskListBuild: null,
            projectDocumentSlots: replaceProjectDocumentSlotUpdate(fresh.projectDocumentSlots, nextSlot),
          });

          return {
            ok: true,
            projectId,
            slotKey,
            status: nextSlot.status,
            sourceId: nextSource.id,
            documentRef: nextDocumentRef,
            sourceFingerprint: nextFingerprint,
            message: "등록 자료 Markdown을 저장했습니다. 자료 기준이 바뀌어 분석 산출물 상태를 초기화했습니다.",
          };
        }

        const documentRefs = stringList(metadata.documentRefs);
        const nextSlot = projectSlotUpdateForKey(slotKey, documentRefs, nextStatus);
        const nextMetadata: Record<string, unknown> = {
          ...metadata,
          manuallyEditedAt: editedAt,
        };
        if (slotKey === "deliverable.prd") {
          Object.assign(
            nextMetadata,
            productBuilderBlueprintMetadata(fresh.productBuilderBlueprintId),
            productBuilderBasePackageMetadata(fresh.productBuilderBasePackageKeys),
            {
              productBuilderBlueprintSelectedAt: fresh.productBuilderBlueprintSelectedAt ?? fresh.prd?.generatedAt ?? editedAt,
              projectTitle: fresh.prd?.projectTitle ?? null,
            },
          );
        }
        await importProjectDocumentSlot(ctx, companyId, projectId, nextSlot, body, {
          ...nextMetadata,
        });
        await writeState(ctx, scope, {
          ...fresh,
          projectDocumentSlots: replaceProjectDocumentSlotUpdate(fresh.projectDocumentSlots, nextSlot),
        });

        return {
          ok: true,
          projectId,
          slotKey,
          status: nextSlot.status,
          message: "Markdown 문서를 저장했습니다.",
        };
      });

      await safeLog(ctx, {
        companyId,
        message: `COS Blueprint saved document slot: ${slotKey}`,
        entityType: "project",
        entityId: projectId,
        metadata: {
          plugin: PLUGIN_ID,
          projectId,
          slotKey,
          status: result.status,
          sourceId: "sourceId" in result ? result.sourceId : null,
          documentRef: "documentRef" in result ? result.documentRef : null,
        },
      });

      return result;
    });

    ctx.actions.register(ACTION.updateProjectDocumentSlotStatus, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      if (!projectId) throw new Error("projectId is required");
      const slotKey = deliverableSlotKeyFromValue(record.slotKey);
      if (!slotKey) throw new Error("deliverable slotKey is required");
      const targetStatus = deliverableStatusFromValue(record.status);
      if (!targetStatus) throw new Error("status must be draft or approved");
      const scope = { companyId, projectId };

      const result = await withStateLock(scope, async () => {
        const fresh = await readState(ctx, scope);
        const current = await ctx.projects.documentSlots.content(projectId, slotKey, companyId).catch(() => null);
        const currentMetadata = asRecord(current?.slot?.metadata);
        const stateSlot = fresh.projectDocumentSlots.find((slot) => slot.slotKey === slotKey) ?? null;
        const documentRefs = stringList(currentMetadata.documentRefs).length > 0
          ? stringList(currentMetadata.documentRefs)
          : stateSlot?.documentRefs ?? [];
        const hasContent = Boolean(current?.document?.body?.trim() || current?.artifact);
        if (targetStatus === "approved" && !hasContent) {
          throw new Error("확정할 산출물 문서가 없습니다. 먼저 분석 또는 편집 저장으로 문서를 생성하세요.");
        }

        const now = new Date().toISOString();
        const previousStatus = current?.slot?.status ?? stateSlot?.status ?? "empty";
        const nextSlot = {
          ...projectSlotUpdateForKey(slotKey, documentRefs, targetStatus),
          updatedAt: now,
        };
        const nextMetadata: Record<string, unknown> = {
          ...currentMetadata,
          plugin: PLUGIN_ID,
          documentRefs,
          manuallyStatusUpdatedAt: now,
          statusUpdatedAt: now,
          statusUpdatedFrom: previousStatus,
          statusUpdatedTo: targetStatus,
          approvedAt: targetStatus === "approved" ? now : null,
        };

        let nextBlueprintPrd = fresh.prd;
        if (slotKey === "deliverable.prd" && fresh.prd) {
          nextBlueprintPrd = {
            ...fresh.prd,
            confirmedAt: targetStatus === "approved" ? now : null,
          };
          Object.assign(
            nextMetadata,
            productBuilderBlueprintMetadata(fresh.productBuilderBlueprintId),
            productBuilderBasePackageMetadata(fresh.productBuilderBasePackageKeys),
            {
              productBuilderBlueprintSelectedAt: fresh.productBuilderBlueprintSelectedAt ?? fresh.prd.generatedAt,
            },
          );
          nextMetadata.confirmedAt = targetStatus === "approved" ? now : null;
          nextMetadata.projectTitle = fresh.prd.projectTitle;
        }

        let nextScreenPlan = fresh.screenPlan;
        if (slotKey === "deliverable.screen_definitions" && fresh.screenPlan) {
          const reviews: Record<string, ScreenReview> = { ...(fresh.screenPlan.reviews ?? {}) };
          for (const screen of fresh.screenPlan.screens) {
            const previousReview = reviews[screen.code];
            reviews[screen.code] = {
              status: targetStatus === "approved" ? "approved" : "pending",
              comments: previousReview?.comments ?? [],
              updatedAt: now,
            };
          }
          nextScreenPlan = {
            ...fresh.screenPlan,
            confirmedAt: targetStatus === "approved" ? now : null,
            reviews,
          };
          nextMetadata.confirmedAt = targetStatus === "approved" ? now : null;
          nextMetadata.screenReviewStatus = targetStatus === "approved" ? "approved" : "draft";
          nextMetadata.screenCount = fresh.screenPlan.screens.length;
        }

        await ctx.projects.documentSlots.update(projectId, slotKey, {
          status: targetStatus,
          metadata: nextMetadata,
        }, companyId);

        await writeState(ctx, scope, {
          ...fresh,
          prd: nextBlueprintPrd,
          screenPlan: nextScreenPlan,
          projectDocumentSlots: replaceProjectDocumentSlotUpdate(fresh.projectDocumentSlots, nextSlot),
        });

        return {
          ok: true,
          projectId,
          slotKey,
          status: targetStatus,
          previousStatus,
          updatedAt: now,
          message: targetStatus === "approved" ? "산출물을 확정했습니다." : "산출물을 초안으로 변경했습니다.",
        };
      });

      await safeLog(ctx, {
        companyId,
        message: `COS Blueprint updated document slot status: ${slotKey} -> ${targetStatus}`,
        entityType: "project",
        entityId: projectId,
        metadata: {
          plugin: PLUGIN_ID,
          projectId,
          slotKey,
          status: targetStatus,
          previousStatus: result.previousStatus,
        },
      });

      return result;
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
      const targetProjectId = source.originalProjectId ?? projectId;
      if (!targetProjectId) return miss("프로젝트 정보가 없어 원본을 읽을 수 없습니다.");

      const workspace = await ctx.projects.getPrimaryWorkspace(targetProjectId, companyId);
      if (!workspace?.path) return miss("프로젝트 workspace가 없어 원본을 읽을 수 없습니다.");

      const filePath = path.resolve(workspace.path, source.originalPath);
      assertInside(workspace.path, filePath);
      if (!existsSync(filePath)) return miss("원본 파일을 찾을 수 없습니다(이동/미보관).");

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

    ctx.actions.register(ACTION.purgeProject, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      if (!projectId) throw new Error("projectId is required");
      const scope = { companyId, projectId };

      const clearedSlotKeys = await withStateLock(scope, async () => {
        const cleared = await clearProjectDocumentSlots(ctx, companyId, projectId);
        await writeState(ctx, scope, emptyState());
        return cleared;
      });

      await safeLog(ctx, {
        companyId,
        message: "COS Blueprint project data purged",
        entityType: "project",
        entityId: projectId,
        metadata: {
          plugin: PLUGIN_ID,
          projectId,
          clearedSlotKeys,
          clearedSlotCount: clearedSlotKeys.length,
        },
      });
      return {
        ok: true,
        projectId,
        clearedSlotKeys,
        clearedSlotCount: clearedSlotKeys.length,
        message: "등록 자료와 분석 산출물을 모두 초기화했습니다.",
      };
    });

    ctx.actions.register(ACTION.purgeProjectDeliverables, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      const projectId = stringValue(record.projectId);
      if (!projectId) throw new Error("projectId is required");
      const scope = { companyId, projectId };

      const clearedSlotKeys = await withStateLock(scope, async () => {
        const cleared = await clearProjectDocumentSlots(ctx, companyId, projectId, DELIVERABLE_SLOT_KEYS);
        const state = await readState(ctx, scope);
        await writeState(ctx, scope, {
          ...state,
          requirementInventory: null,
          prd: null,
          screenPlan: null,
          taskListBuild: null,
          job: null,
          projectDocumentSlots: state.projectDocumentSlots.filter(
            (slot) => !DELIVERABLE_SLOT_KEYS.includes(slot.slotKey),
          ),
          updatedAt: new Date().toISOString(),
        });
        return cleared;
      });

      await safeLog(ctx, {
        companyId,
        message: "COS Blueprint project deliverables purged",
        entityType: "project",
        entityId: projectId,
        metadata: {
          plugin: PLUGIN_ID,
          projectId,
          clearedSlotKeys,
          clearedSlotCount: clearedSlotKeys.length,
        },
      });
      return {
        ok: true,
        projectId,
        clearedSlotKeys,
        clearedSlotCount: clearedSlotKeys.length,
        message: "분석 산출물을 모두 초기화했습니다. 등록 자료는 유지됩니다.",
      };
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

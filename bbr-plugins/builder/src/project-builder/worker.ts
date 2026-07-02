import { randomUUID } from "node:crypto";
import { definePlugin } from "@paperclipai/plugin-sdk";
import { reconcileManagedSkillResettingDrift } from "../managed-skill-sync.js";
import {
  ACTION,
  BLUEPRINT_PRD_SLOT_KEY,
  BLUEPRINT_SCREEN_DEFINITIONS_SLOT_KEY,
  BLUEPRINTS,
  BUILDER_AI_AGENT_KEY,
  BUILDER_AGENT_KEY,
  BUILDER_BACKEND_AGENT_KEY,
  BUILDER_FRONTEND_AGENT_KEY,
  BUILDER_PLATFORM_AGENT_KEY,
  BUILDER_QA_AGENT_KEY,
  BUILDER_SKILL_KEY,
  DATA,
  INSTANTIATE_BUILD_PLAN_TOOL,
  PLUGIN_ID,
  PLUGIN_VERSION,
  PRODUCT_BUILDER_REQUIRED_UPSTREAM_SLOT_KEYS,
  PRODUCT_BUILDER_BUILD_PLAN_SLOT_KEY,
  PRODUCT_BUILDER_TASK_LIST_SLOT_KEY,
  WIREFRAME_HTML_SLOT_KEY,
  buildFeatureParentDescription,
  buildIssueDescription,
  buildProductBuilderTasks,
  buildRootIssueDescription,
  buildWorkflowIssueDescription,
  buildWorkflowRootDescription,
  buildProductBuilderDeliverableSlots,
  buildScreenInputs,
  buildWorkflowTasks,
  getBlueprint,
  isImplementationDecision,
  issueStatusForDecision,
  mergeDomainFeatures,
  mergeFeatureSelection,
  mergeIntake,
  renderBuildPlanMarkdown,
  renderTaskListMarkdown,
  resolveBuildFeatures,
  workflowAgentKeyForTask,
  workflowIssueTitle,
  type BuildFeatureInput,
  type BuildPlan,
  type CreatedIssueSummary,
  type InstantiateBuildPlanInput,
  type ProductBuilderBuildJob,
  type ProductBuilderDomainFeatureInput,
  type ProductBuilderFeatureSelectionInput,
  type InstantiateBuildInput,
  type ProductBuilderBuildSummary,
  type ProductBuilderProjectBlueprintSelection,
  type ProductBuilderOverview,
  type ProductBuilderTask,
  type ProductBuilderUpstreamReadiness,
  type ProductBuilderUpstreamSlotKey,
  type ProductBuilderUpstreamSlotReadiness,
  type SharedWorkItemInput,
  type StagePlanInput,
  type TaskCategory,
  type TaskDecision,
  type WorkflowStageSlug,
} from "./contract.js";

type AnyCtx = Parameters<NonNullable<Parameters<typeof definePlugin>[0]["setup"]>>[0];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function upstreamSlotStatus(value: unknown): ProductBuilderUpstreamSlotReadiness["status"] {
  return value === "empty" || value === "draft" || value === "ready" || value === "approved" || value === "n/a"
    ? value
    : "missing";
}

function upstreamSlotRequirement(slotKey: ProductBuilderUpstreamSlotKey): ProductBuilderUpstreamSlotReadiness["requiredStatus"] {
  return slotKey === WIREFRAME_HTML_SLOT_KEY ? "ready-or-approved" : "ready-approved-or-na";
}

function isUpstreamSlotReady(
  slotKey: ProductBuilderUpstreamSlotKey,
  status: ProductBuilderUpstreamSlotReadiness["status"],
  hasContent: boolean,
): boolean {
  if (!hasContent) return false;
  if (slotKey === WIREFRAME_HTML_SLOT_KEY) return status === "ready" || status === "approved";
  return status === "ready" || status === "approved" || status === "n/a";
}

function emptyUpstreamReadiness(projectId: string | null = null): ProductBuilderUpstreamReadiness {
  return { projectId, ready: false, checkedAt: new Date().toISOString(), slots: [] };
}

async function readProjectUpstreamReadiness(
  ctx: AnyCtx,
  companyId: string,
  projectId: string | undefined,
): Promise<ProductBuilderUpstreamReadiness> {
  const checkedAt = new Date().toISOString();
  if (!projectId) {
    return { ...emptyUpstreamReadiness(null), checkedAt };
  }

  const slots: ProductBuilderUpstreamSlotReadiness[] = [];
  for (const slotKey of PRODUCT_BUILDER_REQUIRED_UPSTREAM_SLOT_KEYS) {
    try {
        const content = await ctx.projects.documentSlots.content(projectId, slotKey, companyId);
        const status = upstreamSlotStatus(content?.slot?.status);
        const title = stringValue(content?.slot?.title) ?? slotKey;
        const hasContent = Boolean(content?.artifact) || Boolean(content?.document?.body?.trim());
        slots.push({
          slotKey,
          title,
          status,
          requiredStatus: upstreamSlotRequirement(slotKey),
          hasContent,
          ready: isUpstreamSlotReady(slotKey, status, hasContent),
          checkedAt,
        });
      } catch {
        slots.push({
          slotKey,
          title: slotKey,
          status: "missing",
          requiredStatus: upstreamSlotRequirement(slotKey),
          hasContent: false,
          ready: false,
          checkedAt,
        });
      }
    }

    return {
      projectId,
      ready: slots.every((slot) => slot.ready),
      checkedAt,
      slots,
    };
  }

  function describeUnreadySlot(slot: ProductBuilderUpstreamSlotReadiness): string {
    const contentState = slot.hasContent ? "" : ", content empty";
    return `${slot.title}(${slot.slotKey}: ${slot.status}${contentState})`;
  }

  function assertBuildInputsReady(input: {
    projectId: string | null;
    projectBlueprint: ProductBuilderProjectBlueprintSelection | null;
    upstreamReadiness: ProductBuilderUpstreamReadiness;
  }): asserts input is {
    projectId: string;
    projectBlueprint: ProductBuilderProjectBlueprintSelection;
    upstreamReadiness: ProductBuilderUpstreamReadiness;
  } {
    if (!input.projectId) {
      throw new Error("Product Builder는 고객 Project context에서 실행해야 합니다.");
    }
    if (!input.projectBlueprint) {
      throw new Error("Blueprint에서 제품 유형을 먼저 선택하세요.");
    }
    if (!input.upstreamReadiness.ready) {
      const unready = input.upstreamReadiness.slots.filter((slot) => !slot.ready);
      throw new Error(`Product Builder 실행 전 필수 산출물 slot을 준비하세요: ${unready.map(describeUnreadySlot).join(", ")}`);
    }
  }

  function parseDecisionOverrides(value: unknown): Record<string, TaskDecision> | undefined {
    const input = asRecord(value);
    const out: Record<string, TaskDecision> = {};
    for (const [key, decision] of Object.entries(input)) {
      if (decision === "NEW" || decision === "EXTEND" || decision === "REUSE" || decision === "N/A") {
        out[key] = decision;
      }
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }

  async function readProjectBlueprintSelection(
    ctx: AnyCtx,
    companyId: string,
    projectId: string | undefined,
  ): Promise<ProductBuilderProjectBlueprintSelection | null> {
    if (!projectId) return null;
    try {
      const content = await ctx.projects.documentSlots.content(projectId, BLUEPRINT_PRD_SLOT_KEY, companyId);
      const metadata = content?.slot?.metadata && typeof content.slot.metadata === "object"
        ? content.slot.metadata as Record<string, unknown>
        : {};
      const rawBlueprintId = stringValue(metadata.productBuilderBlueprintId);
      if (!rawBlueprintId) return null;
      const blueprint = BLUEPRINTS.find((entry) => entry.id === rawBlueprintId);
      if (!blueprint) return null;
      return {
        projectId,
        blueprintId: blueprint.id,
        displayName: blueprint.displayName,
        sourcePlugin: stringValue(metadata.plugin) ?? null,
        sourceSlotKey: BLUEPRINT_PRD_SLOT_KEY,
        selectedAt: stringValue(metadata.productBuilderBlueprintSelectedAt) ?? null,
        checkedAt: new Date().toISOString(),
      };
  } catch {
    return null;
  }
}

function parseFeatureSelection(value: unknown): ProductBuilderFeatureSelectionInput | undefined {
  const record = asRecord(value);
  const authRecord = asRecord(record.auth);
  const paymentRecord = asRecord(record.payment);
  const notificationRecord = asRecord(record.notification);
  const communityRecord = asRecord(record.community);
  const fileUploadRecord = asRecord(record.fileUpload);
  const videoLectureRecord = asRecord(record.videoLecture);
  const identityVerificationRecord = asRecord(record.identityVerification);
  const adminRecord = asRecord(record.admin);
  const auth: ProductBuilderFeatureSelectionInput["auth"] = {};
  const payment: ProductBuilderFeatureSelectionInput["payment"] = {};
  const notification: ProductBuilderFeatureSelectionInput["notification"] = {};
  const community: ProductBuilderFeatureSelectionInput["community"] = {};
  const fileUpload: ProductBuilderFeatureSelectionInput["fileUpload"] = {};
  const videoLecture: ProductBuilderFeatureSelectionInput["videoLecture"] = {};
  const identityVerification: ProductBuilderFeatureSelectionInput["identityVerification"] = {};
  const admin: ProductBuilderFeatureSelectionInput["admin"] = {};

  if (typeof authRecord.enabled === "boolean") auth.enabled = authRecord.enabled;
  if (typeof authRecord.email === "boolean") auth.email = authRecord.email;
  if (typeof authRecord.oauthGoogle === "boolean") auth.oauthGoogle = authRecord.oauthGoogle;
  if (typeof authRecord.oauthKakao === "boolean") auth.oauthKakao = authRecord.oauthKakao;
  if (typeof authRecord.oauthNaver === "boolean") auth.oauthNaver = authRecord.oauthNaver;

  if (typeof paymentRecord.enabled === "boolean") payment.enabled = paymentRecord.enabled;
  if (typeof paymentRecord.oneTime === "boolean") payment.oneTime = paymentRecord.oneTime;
  if (typeof paymentRecord.subscription === "boolean") payment.subscription = paymentRecord.subscription;
  if (typeof paymentRecord.polar === "boolean") payment.polar = paymentRecord.polar;
  if (typeof paymentRecord.inicis === "boolean") payment.inicis = paymentRecord.inicis;

  if (typeof notificationRecord.emailResend === "boolean") notification.emailResend = notificationRecord.emailResend;
  if (typeof notificationRecord.alimtalk === "boolean") notification.alimtalk = notificationRecord.alimtalk;

  if (typeof communityRecord.enabled === "boolean") community.enabled = communityRecord.enabled;

  if (typeof fileUploadRecord.vercelBlob === "boolean") fileUpload.vercelBlob = fileUploadRecord.vercelBlob;

  if (typeof videoLectureRecord.cloudflareStream === "boolean") {
    videoLecture.cloudflareStream = videoLectureRecord.cloudflareStream;
  }

  if (typeof identityVerificationRecord.kcb === "boolean") {
    identityVerification.kcb = identityVerificationRecord.kcb;
  }

  if (typeof adminRecord.userManagement === "boolean") admin.userManagement = adminRecord.userManagement;
  if (typeof adminRecord.paymentManagement === "boolean") admin.paymentManagement = adminRecord.paymentManagement;

  const out: ProductBuilderFeatureSelectionInput = {};
  if (Object.keys(auth).length > 0) out.auth = auth;
  if (Object.keys(payment).length > 0) out.payment = payment;
  if (Object.keys(notification).length > 0) out.notification = notification;
  if (Object.keys(community).length > 0) out.community = community;
  if (Object.keys(fileUpload).length > 0) out.fileUpload = fileUpload;
  if (Object.keys(videoLecture).length > 0) out.videoLecture = videoLecture;
  if (Object.keys(identityVerification).length > 0) out.identityVerification = identityVerification;
  if (Object.keys(admin).length > 0) out.admin = admin;
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseSurfaceList(value: unknown): ProductBuilderDomainFeatureInput["surfaces"] | undefined {
  if (!Array.isArray(value)) return undefined;
  const surfaces = value.filter((item) => {
    return item === "landing" || item === "app" || item === "admin" || item === "ai-server";
  });
  return surfaces.length > 0 ? surfaces as ProductBuilderDomainFeatureInput["surfaces"] : undefined;
}

function parseDomainFeatures(value: unknown): ProductBuilderDomainFeatureInput[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const features: ProductBuilderDomainFeatureInput[] = [];
  for (const item of value) {
    const record = asRecord(item);
    const title = stringValue(record.title);
    if (!title) continue;
    const decision = record.decision;
    features.push({
      id: stringValue(record.id),
      title,
      description: stringValue(record.description),
      surfaces: parseSurfaceList(record.surfaces),
      decision: decision === "NEW" || decision === "EXTEND" || decision === "REUSE" || decision === "N/A" ? decision : undefined,
      mvp: typeof record.mvp === "boolean" ? record.mvp : undefined,
      notes: stringValue(record.notes),
    });
  }
  return features.length > 0 ? features : undefined;
}

function parseDecision(value: unknown): TaskDecision | undefined {
  return value === "NEW" || value === "EXTEND" || value === "REUSE" || value === "N/A" ? value : undefined;
}

function parseStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
  return out.length > 0 ? out : undefined;
}

function parseStagePlan(value: unknown): StagePlanInput | undefined {
  const record = asRecord(value);
  const out: StagePlanInput = {};
  const decision = parseDecision(record.decision);
  if (decision) out.decision = decision;
  const reuseRef = stringValue(record.reuseRef);
  if (reuseRef) out.reuseRef = reuseRef;
  const title = stringValue(record.title);
  if (title) out.title = title;
  const description = stringValue(record.description);
  if (description) out.description = description;
  const items = parseStringArray(record.items);
  if (items) out.items = items;
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseStages(value: unknown): BuildFeatureInput["stages"] | undefined {
  const record = asRecord(value);
  const slugs: WorkflowStageSlug[] = ["be", "be-qa", "fe", "fe-qa", "full-qa"];
  const out: NonNullable<BuildFeatureInput["stages"]> = {};
  for (const slug of slugs) {
    const stagePlan = parseStagePlan(record[slug]);
    if (stagePlan) out[slug] = stagePlan;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseBuildFeatures(value: unknown): BuildFeatureInput[] {
  if (!Array.isArray(value)) return [];
  const features: BuildFeatureInput[] = [];
  for (const item of value) {
    const record = asRecord(item);
    const title = stringValue(record.title);
    const id = stringValue(record.id) ?? title;
    if (!title || !id) continue;
    const feature: BuildFeatureInput = { id, title };
    const decision = parseDecision(record.featureDecision ?? record.decision);
    if (decision) feature.featureDecision = decision;
    const description = stringValue(record.description);
    if (description) feature.description = description;
    const stages = parseStages(record.stages);
    if (stages) feature.stages = stages;
    const dependsOnShared = parseStringArray(record.dependsOnShared);
    if (dependsOnShared) feature.dependsOnShared = dependsOnShared;
    features.push(feature);
  }
  return features;
}

function parseSharedItems(value: unknown): SharedWorkItemInput[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: SharedWorkItemInput[] = [];
  for (const item of value) {
    const record = asRecord(item);
    const title = stringValue(record.title);
    const id = stringValue(record.id) ?? title;
    if (!title || !id) continue;
    const shared: SharedWorkItemInput = { id, title };
    const kind = stringValue(record.kind);
    if (kind) shared.kind = kind;
    const decision = parseDecision(record.decision);
    if (decision) shared.decision = decision;
    const description = stringValue(record.description);
    if (description) shared.description = description;
    const items = parseStringArray(record.items);
    if (items) shared.items = items;
    out.push(shared);
  }
  return out.length > 0 ? out : undefined;
}

function parseBuildPlan(value: unknown): BuildPlan {
  const record = asRecord(value);
  const plan: BuildPlan = { features: parseBuildFeatures(record.features) };
  const blueprintId = stringValue(record.blueprintId);
  if (blueprintId) plan.blueprintId = blueprintId;
  const projectId = stringValue(record.projectId);
  if (projectId) plan.projectId = projectId;
  const productName = stringValue(record.productName);
  if (productName) plan.productName = productName;
  const shared = parseSharedItems(record.shared);
  if (shared) plan.shared = shared;
  return plan;
}

function companyIdFromParams(params: Record<string, unknown>): string {
  const companyId = stringValue(params.companyId);
  if (!companyId) throw new Error("companyId is required");
  return companyId;
}

function agentIdFromResolution(resolution: unknown): string | null {
  const record = asRecord(resolution);
  const details = asRecord(record.details);
  const agent = asRecord(record.agent);
  return stringValue(record.agentId) ?? stringValue(details.id) ?? stringValue(agent.id) ?? null;
}

function buildCounts(tasks: ProductBuilderTask[]) {
  return {
    total: tasks.length,
    implementation: tasks.filter((task) => isImplementationDecision(task.decision)).length,
    reuse: tasks.filter((task) => task.decision === "REUSE").length,
    skipped: tasks.filter((task) => task.decision === "N/A").length,
  };
}

function buildPlanFromClassicInput(input: {
  blueprintId: string;
  productName: string;
  domainFeatures: Array<{ id?: string; title: string; description: string; decision: TaskDecision }>;
}): BuildPlan {
  return {
    blueprintId: input.blueprintId,
    productName: input.productName,
    features: input.domainFeatures.map((feature) => ({
      id: feature.id || feature.title,
      title: feature.title,
      description: feature.description,
      featureDecision: feature.decision,
    })),
  };
}

type ProductBuilderManagedAssignments = {
  agentId: string | null;
  agentIdsByKey: Record<string, string | null>;
};

const LAST_BUILD_STATE_KEY = "last-build";
const BUILD_JOB_STATE_KEY = "build-job";
const buildStateLocks = new Map<string, Promise<unknown>>();

function builderStateScope(companyId: string, projectId: string | null, stateKey: string) {
  return projectId
    ? { scopeKind: "project" as const, scopeId: projectId, namespace: `company:${companyId}`, stateKey }
    : { scopeKind: "company" as const, scopeId: companyId, stateKey };
}

function buildLockKey(companyId: string, projectId: string): string {
  return `${companyId}|${projectId}`;
}

function withBuildStateLock<T>(companyId: string, projectId: string, fn: () => Promise<T>): Promise<T> {
  const key = buildLockKey(companyId, projectId);
  const prev = buildStateLocks.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  buildStateLocks.set(key, next.then(() => undefined, () => undefined));
  return next;
}

function agentKeyForTask(task: ProductBuilderTask): string {
  if (task.key === "PB-REPO-001") return BUILDER_PLATFORM_AGENT_KEY;
  if (task.key === "PB-BASE-001") return BUILDER_AGENT_KEY;
  const byCategory: Partial<Record<TaskCategory, string>> = {
    backend: BUILDER_BACKEND_AGENT_KEY,
    frontend: BUILDER_FRONTEND_AGENT_KEY,
    admin: BUILDER_FRONTEND_AGENT_KEY,
    foundation: BUILDER_FRONTEND_AGENT_KEY,
    ops: BUILDER_PLATFORM_AGENT_KEY,
    ai: BUILDER_AI_AGENT_KEY,
    qa: BUILDER_QA_AGENT_KEY,
    planning: BUILDER_AGENT_KEY,
    "reuse-audit": BUILDER_AGENT_KEY,
    content: BUILDER_FRONTEND_AGENT_KEY,
  };
  return byCategory[task.category] ?? BUILDER_AGENT_KEY;
}

function assigneeForTask(task: ProductBuilderTask, managed: ProductBuilderManagedAssignments): string | undefined {
  if (!isImplementationDecision(task.decision)) return undefined;
  const agentKey = agentKeyForTask(task);
  return managed.agentIdsByKey[agentKey] ?? managed.agentId ?? undefined;
}

async function reconcileManagedAssignments(ctx: AnyCtx, companyId: string): Promise<ProductBuilderManagedAssignments> {
  const agent = await ctx.agents.managed.reconcile(BUILDER_AGENT_KEY, companyId);
  const backendAgent = await ctx.agents.managed.reconcile(BUILDER_BACKEND_AGENT_KEY, companyId);
  const frontendAgent = await ctx.agents.managed.reconcile(BUILDER_FRONTEND_AGENT_KEY, companyId);
  const platformAgent = await ctx.agents.managed.reconcile(BUILDER_PLATFORM_AGENT_KEY, companyId);
  const aiAgent = await ctx.agents.managed.reconcile(BUILDER_AI_AGENT_KEY, companyId);
  const qaAgent = await ctx.agents.managed.reconcile(BUILDER_QA_AGENT_KEY, companyId);
  await reconcileManagedSkillResettingDrift(ctx, BUILDER_SKILL_KEY, companyId);
  return {
    agentId: agentIdFromResolution(agent),
    agentIdsByKey: {
      [BUILDER_AGENT_KEY]: agentIdFromResolution(agent),
      [BUILDER_BACKEND_AGENT_KEY]: agentIdFromResolution(backendAgent),
      [BUILDER_FRONTEND_AGENT_KEY]: agentIdFromResolution(frontendAgent),
      [BUILDER_PLATFORM_AGENT_KEY]: agentIdFromResolution(platformAgent),
      [BUILDER_AI_AGENT_KEY]: agentIdFromResolution(aiAgent),
      [BUILDER_QA_AGENT_KEY]: agentIdFromResolution(qaAgent),
    },
  };
}

async function readLastBuild(
  ctx: AnyCtx,
  companyId: string,
  projectId: string | null,
): Promise<ProductBuilderBuildSummary | null> {
  return await ctx.state.get(builderStateScope(companyId, projectId, LAST_BUILD_STATE_KEY)) as ProductBuilderBuildSummary | null;
}

async function writeLastBuild(
  ctx: AnyCtx,
  companyId: string,
  projectId: string,
  summary: ProductBuilderBuildSummary,
): Promise<void> {
  await ctx.state.set(builderStateScope(companyId, projectId, LAST_BUILD_STATE_KEY), summary);
}

async function readBuildJob(
  ctx: AnyCtx,
  companyId: string,
  projectId: string | null,
): Promise<ProductBuilderBuildJob | null> {
  return await ctx.state.get(builderStateScope(companyId, projectId, BUILD_JOB_STATE_KEY)) as ProductBuilderBuildJob | null;
}

async function beginBuildJob(
  ctx: AnyCtx,
  companyId: string,
  projectId: string,
  kind: ProductBuilderBuildJob["kind"],
): Promise<{ started: true; job: ProductBuilderBuildJob } | { started: false; job: ProductBuilderBuildJob }> {
  return withBuildStateLock(companyId, projectId, async () => {
    const current = await readBuildJob(ctx, companyId, projectId);
    if (current?.status === "running") return { started: false, job: current };
    const job: ProductBuilderBuildJob = {
      jobId: randomUUID(),
      kind,
      status: "running",
      projectId,
      startedAt: new Date().toISOString(),
    };
    await ctx.state.set(builderStateScope(companyId, projectId, BUILD_JOB_STATE_KEY), job);
    return { started: true, job };
  });
}

async function finishBuildJob(
  ctx: AnyCtx,
  companyId: string,
  projectId: string,
  jobId: string,
): Promise<void> {
  await withBuildStateLock(companyId, projectId, async () => {
    const current = await readBuildJob(ctx, companyId, projectId);
    if (current?.jobId === jobId) {
      await ctx.state.set(builderStateScope(companyId, projectId, BUILD_JOB_STATE_KEY), null);
    }
  });
}

async function failBuildJob(
  ctx: AnyCtx,
  companyId: string,
  projectId: string,
  job: ProductBuilderBuildJob,
  error: unknown,
): Promise<void> {
  await withBuildStateLock(companyId, projectId, async () => {
    const current = await readBuildJob(ctx, companyId, projectId);
    if (current?.jobId !== job.jobId) return;
    await ctx.state.set(builderStateScope(companyId, projectId, BUILD_JOB_STATE_KEY), {
      ...job,
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  });
}

function targetProjectId(inputProjectId: string | undefined, planProjectId: string | undefined): string | null {
  return inputProjectId ?? planProjectId ?? null;
}

async function importProductBuilderSlots(
  ctx: AnyCtx,
  companyId: string,
  projectId: string | null,
  summary: ProductBuilderBuildSummary,
): Promise<void> {
  if (!projectId) return;
  const metadata = {
    plugin: PLUGIN_ID,
    producer: "Project Builder",
    buildId: summary.buildId,
    rootIssueId: summary.rootIssueId,
    issueRefs: [summary.rootIssueId, ...summary.issues.map((issue) => issue.issueId)],
  };
  await ctx.projects.documentSlots.import(projectId, PRODUCT_BUILDER_BUILD_PLAN_SLOT_KEY, {
    title: "BuildPlan",
    format: "markdown",
    body: summary.documents.buildPlanMarkdown,
    contentType: "text/markdown",
    status: "ready",
    metadata,
  }, companyId);
  await ctx.projects.documentSlots.import(projectId, PRODUCT_BUILDER_TASK_LIST_SLOT_KEY, {
    title: "전체 Task 목록(Full Task List)",
    format: "markdown",
    body: summary.documents.taskListMarkdown,
    contentType: "text/markdown",
    status: "ready",
    metadata,
  }, companyId);
}

async function instantiateBuild(ctx: AnyCtx, input: InstantiateBuildInput): Promise<ProductBuilderBuildSummary> {
  const companyId = input.companyId;
  const projectId = targetProjectId(input.projectId, undefined);
  const projectBlueprint = await readProjectBlueprintSelection(ctx, companyId, projectId ?? undefined);
  const upstreamReadiness = await readProjectUpstreamReadiness(ctx, companyId, projectId ?? undefined);
  const buildInputs = { projectId, projectBlueprint, upstreamReadiness };
  assertBuildInputsReady(buildInputs);
  const buildProjectId = buildInputs.projectId;

  const buildJobResult = await beginBuildJob(ctx, companyId, buildProjectId, "classic");
  if (!buildJobResult.started) {
    throw new Error("현재 프로젝트의 Project Builder 빌드가 이미 진행 중입니다.");
  }
  const buildJob = buildJobResult.job;

  try {
    const blueprint = getBlueprint(buildInputs.projectBlueprint.blueprintId);
    const intake = mergeIntake(input.intake, blueprint.defaultIntake);
    const featureSelection = mergeFeatureSelection(input.featureSelection ?? blueprint.defaultFeatureSelection);
    const domainFeatures = mergeDomainFeatures(input.domainFeatures, blueprint.defaultDomainFeatures);
    const tasks = buildProductBuilderTasks(blueprint, {
      overrides: input.decisionOverrides,
      featureSelection,
      domainFeatures,
    });
    const managed = await reconcileManagedAssignments(ctx, companyId);
    const buildId = `pb-${randomUUID()}`;
    const billingCode = `product-builder:${blueprint.id}`;
    const root = await ctx.issues.create({
      companyId,
      projectId: buildProjectId,
      title: `[Product Builder] ${intake.productName}`,
      description: buildRootIssueDescription({ blueprint, intake, featureSelection, domainFeatures, buildId, tasks }),
      status: "in_progress",
      priority: "high",
      assigneeAgentId: managed.agentId ?? undefined,
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
        description: buildIssueDescription({ blueprint, intake, task, buildId }),
        status,
        priority: task.priority,
        assigneeAgentId: assigneeForTask(task, managed),
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

    const createdAt = new Date().toISOString();
    const planForDocuments = buildPlanFromClassicInput({
      blueprintId: blueprint.id,
      productName: intake.productName,
      domainFeatures,
    });
    const documentInput = {
      buildId,
      blueprintId: blueprint.id,
      productName: intake.productName,
      rootIssueId: root.id,
      createdAt,
      plan: planForDocuments,
      tasks,
      issues: created,
    };
    const documents = {
      buildPlanMarkdown: renderBuildPlanMarkdown(documentInput),
      taskListMarkdown: renderTaskListMarkdown(documentInput),
    };
    const summary: ProductBuilderBuildSummary = {
      buildId,
      blueprintId: blueprint.id,
      productName: intake.productName,
      projectId: buildProjectId,
      rootIssueId: root.id,
      createdAt,
      counts: buildCounts(tasks),
      issues: created,
      slots: buildProductBuilderDeliverableSlots({
        buildId,
        rootIssueId: root.id,
        issues: created,
        updatedAt: createdAt,
      }),
      documents,
    };

    await importProductBuilderSlots(ctx, companyId, buildProjectId, summary);
    await writeLastBuild(ctx, companyId, buildProjectId, summary);
    await ctx.activity.log({
      companyId,
      entityType: "issue",
      entityId: root.id,
      message: `Product Builder instantiated ${blueprint.displayName} for "${intake.productName}"`,
      metadata: {
        plugin: PLUGIN_ID,
        buildId,
        blueprintId: blueprint.id,
        counts: summary.counts,
        featureSelection,
        domainFeatures,
      },
    });
    await finishBuildJob(ctx, companyId, buildProjectId, buildJob.jobId);
    return summary;
  } catch (error) {
    await failBuildJob(ctx, companyId, buildProjectId, buildJob, error);
    throw error;
  }
}

const FIGMA_SOURCE_SLOT_KEYS = ["source.customer_originals", "source.references", "source.internal_notes"] as const;

type FigmaLayoutRef = { body: string; fileKey?: string; nodeId?: string };

async function loadFigmaLayoutBody(ctx: AnyCtx, companyId: string, projectId: string): Promise<FigmaLayoutRef> {
  for (const slotKey of FIGMA_SOURCE_SLOT_KEYS) {
    const content = await ctx.projects.documentSlots.content(projectId, slotKey, companyId).catch(() => null);
    const sources = (content?.slot?.metadata as Record<string, unknown> | undefined)?.sources;
    const figma = Array.isArray(sources)
      ? (sources.find((s) => (s as Record<string, unknown> | null)?.sourceFormat === "figma") as Record<string, unknown> | undefined)
      : undefined;
    if (figma && content?.document?.body) {
      return {
        body: content.document.body,
        fileKey: typeof figma.figmaFileKey === "string" ? figma.figmaFileKey : undefined,
        nodeId: typeof figma.figmaNodeId === "string" ? figma.figmaNodeId : undefined,
      };
    }
  }
  return { body: "" };
}

async function instantiateBuildPlan(ctx: AnyCtx, input: InstantiateBuildPlanInput): Promise<ProductBuilderBuildSummary> {
  const companyId = input.companyId;
  const plan = input.plan;
  const projectId = targetProjectId(input.projectId, plan.projectId);
  const projectBlueprint = await readProjectBlueprintSelection(ctx, companyId, projectId ?? undefined);
  const upstreamReadiness = await readProjectUpstreamReadiness(ctx, companyId, projectId ?? undefined);
  const buildInputs = { projectId, projectBlueprint, upstreamReadiness };
  assertBuildInputsReady(buildInputs);
  const buildProjectId = buildInputs.projectId;

  const buildJobResult = await beginBuildJob(ctx, companyId, buildProjectId, "workflow");
  if (!buildJobResult.started) {
    throw new Error("현재 프로젝트의 Project Builder 빌드가 이미 진행 중입니다.");
  }
  const buildJob = buildJobResult.job;

  try {
    const screenContent = await ctx.projects.documentSlots
      .content(buildProjectId, BLUEPRINT_SCREEN_DEFINITIONS_SLOT_KEY, companyId)
      .catch(() => null);
    const wireframeContent = await ctx.projects.documentSlots
      .content(buildProjectId, WIREFRAME_HTML_SLOT_KEY, companyId)
      .catch(() => null);
    const screenModel = (screenContent?.slot?.metadata as Record<string, unknown> | undefined)?.screenModel ?? null;
    const wireframeBody = wireframeContent?.document?.body ?? "";
    const figma = await loadFigmaLayoutBody(ctx, companyId, buildProjectId);
    const screens = buildScreenInputs(screenModel, wireframeBody, figma.body, { fileKey: figma.fileKey, nodeId: figma.nodeId });
    const tasks = buildWorkflowTasks(plan, screens);
    const managed = await reconcileManagedAssignments(ctx, companyId);
    const buildId = `pb-${randomUUID()}`;
    const billingCode = "product-builder:workflow";

    const root = await ctx.issues.create({
      companyId,
      projectId: buildProjectId,
      title: `[Product Builder] ${plan.productName ?? "Workflow Build"}`,
      description: buildWorkflowRootDescription({ plan, buildId, tasks, documentIssueId: input.documentIssueId }),
      status: "in_progress",
      priority: "high",
      assigneeAgentId: managed.agentId ?? undefined,
      billingCode,
      originKind: `plugin:${PLUGIN_ID}:workflow-build`,
      originId: `${buildId}:root`,
    });

    const featureTitleByKey = new Map<string, string>();
    const featureDecisionByKey = new Map<string, TaskDecision>();
    const featureDescByKey = new Map<string, string | undefined>();
    for (const { fid, feature } of resolveBuildFeatures(plan.features ?? [])) {
      featureTitleByKey.set(fid, feature.title);
      featureDecisionByKey.set(fid, feature.featureDecision ?? "NEW");
      featureDescByKey.set(fid, feature.description);
    }

    const createdByTask = new Map<string, string>();
    const created: CreatedIssueSummary[] = [];
    const featureParentId = new Map<string, string>();

    async function ensureFeatureParent(fid: string): Promise<string> {
      const existing = featureParentId.get(fid);
      if (existing) return existing;
      const title = featureTitleByKey.get(fid) ?? fid;
      const decision = featureDecisionByKey.get(fid) ?? "NEW";
      const issue = await ctx.issues.create({
        companyId,
        projectId: buildProjectId,
        parentId: root.id,
        title: `[Feature] ${title}`,
        description: buildFeatureParentDescription({
          featureId: fid,
          title,
          buildId,
          decision,
          description: featureDescByKey.get(fid),
        }),
        status: "in_progress",
        assigneeAgentId: managed.agentId ?? undefined,
        priority: "medium",
        billingCode,
        originKind: `plugin:${PLUGIN_ID}:feature`,
        originId: `${buildId}:feat:${fid}`,
      });
      featureParentId.set(fid, issue.id);
      created.push({
        taskKey: `FEATURE:${fid}`,
        issueId: issue.id,
        title: issue.title,
        decision,
        status: issue.status,
        featureId: fid,
        parentIssueId: root.id,
      });
      return issue.id;
    }

    for (const task of tasks) {
      let parentId = root.id;
      if (task.workflowRole === "feature-stage" && task.featureId) {
        parentId = await ensureFeatureParent(task.featureId);
      }
      const status = issueStatusForDecision(task.decision);
      const agentKey = workflowAgentKeyForTask(task);
      const assigneeAgentId = isImplementationDecision(task.decision)
        ? managed.agentIdsByKey[agentKey] ?? managed.agentId ?? undefined
        : undefined;
      const issue = await ctx.issues.create({
        companyId,
        projectId: buildProjectId,
        parentId,
        title: workflowIssueTitle(task),
        description: buildWorkflowIssueDescription({
          task,
          buildId,
          productName: plan.productName ?? "(unnamed)",
          featureTitle: task.featureId ? featureTitleByKey.get(task.featureId) : undefined,
        }),
        status,
        priority: task.priority,
        assigneeAgentId,
        billingCode,
        originKind: `plugin:${PLUGIN_ID}:workflow-task`,
        originId: `${buildId}:${task.key}`,
      });
      createdByTask.set(task.key, issue.id);
      created.push({
        taskKey: task.key,
        issueId: issue.id,
        title: issue.title,
        decision: task.decision,
        status: issue.status,
        workflowRole: task.workflowRole,
        featureId: task.featureId,
        stageSlug: task.stageSlug,
        stageOrder: task.stageOrder,
        parentIssueId: parentId,
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

    const createdAt = new Date().toISOString();
    const documentInput = {
      buildId,
      blueprintId: plan.blueprintId ?? "workflow",
      productName: plan.productName ?? "(unnamed)",
      rootIssueId: root.id,
      createdAt,
      plan,
      tasks,
      issues: created,
    };
    const documents = {
      buildPlanMarkdown: renderBuildPlanMarkdown(documentInput),
      taskListMarkdown: renderTaskListMarkdown(documentInput),
    };
    const summary: ProductBuilderBuildSummary = {
      buildId,
      blueprintId: plan.blueprintId ?? "workflow",
      productName: plan.productName ?? "(unnamed)",
      projectId: buildProjectId,
      rootIssueId: root.id,
      createdAt,
      counts: buildCounts(tasks),
      issues: created,
      slots: buildProductBuilderDeliverableSlots({
        buildId,
        rootIssueId: root.id,
        issues: created,
        updatedAt: createdAt,
      }),
      documents,
    };

    await importProductBuilderSlots(ctx, companyId, buildProjectId, summary);
    await writeLastBuild(ctx, companyId, buildProjectId, summary);
    await ctx.activity.log({
      companyId,
      entityType: "issue",
      entityId: root.id,
      message: `Product Builder workflow build for "${plan.productName ?? "(unnamed)"}"`,
      metadata: {
        plugin: PLUGIN_ID,
        buildId,
        blueprintId: summary.blueprintId,
        counts: summary.counts,
        featureCount: (plan.features ?? []).length,
        sharedCount: (plan.shared ?? []).length,
      },
    });
    await finishBuildJob(ctx, companyId, buildProjectId, buildJob.jobId);
    return summary;
  } catch (error) {
    await failBuildJob(ctx, companyId, buildProjectId, buildJob, error);
    throw error;
  }
}

const plugin = definePlugin({
  async setup(ctx) {
    ctx.data.register(DATA.overview, async (params) => {
      const companyId = stringValue(params.companyId);
      const projectId = stringValue(params.projectId);
      let lastBuild: ProductBuilderBuildSummary | null = null;
      let buildJob: ProductBuilderBuildJob | null = null;
      let projectBlueprint: ProductBuilderProjectBlueprintSelection | null = null;
      let upstreamReadiness = emptyUpstreamReadiness(projectId ?? null);
      if (companyId) {
        lastBuild = await readLastBuild(ctx, companyId, projectId ?? null);
        buildJob = await readBuildJob(ctx, companyId, projectId ?? null);
        projectBlueprint = await readProjectBlueprintSelection(ctx, companyId, projectId);
        upstreamReadiness = await readProjectUpstreamReadiness(ctx, companyId, projectId);
      }
      const overview: ProductBuilderOverview = {
        status: "ok",
        checkedAt: new Date().toISOString(),
        pluginId: PLUGIN_ID,
        version: PLUGIN_VERSION,
        projectBlueprint,
        upstreamReadiness,
        buildJob,
        blueprints: BLUEPRINTS.map((blueprint) => {
          const defaultTasks = buildProductBuilderTasks(blueprint, {
            featureSelection: blueprint.defaultFeatureSelection,
            domainFeatures: blueprint.defaultDomainFeatures,
          });
          return {
            id: blueprint.id,
            displayName: blueprint.displayName,
            description: blueprint.description,
            productClass: blueprint.productClass,
            taskCount: defaultTasks.length,
            implementationCount: defaultTasks.filter((task) => isImplementationDecision(task.decision)).length,
            reuseCount: defaultTasks.filter((task) => task.decision === "REUSE").length,
            skippedCount: defaultTasks.filter((task) => task.decision === "N/A").length,
            defaultIntake: blueprint.defaultIntake,
            defaultFeatureSelection: blueprint.defaultFeatureSelection,
            defaultDomainFeatures: blueprint.defaultDomainFeatures,
          };
        }),
        lastBuild,
      };
      return overview;
    });

    ctx.data.register(DATA.blueprint, async (params) => {
      return getBlueprint(stringValue(params.blueprintId));
    });

    ctx.actions.register(ACTION.instantiateBuild, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      return instantiateBuild(ctx, {
        companyId,
        projectId: stringValue(record.projectId),
        blueprintId: stringValue(record.blueprintId),
        intake: asRecord(record.intake),
        featureSelection: parseFeatureSelection(record.featureSelection),
        domainFeatures: parseDomainFeatures(record.domainFeatures),
        decisionOverrides: parseDecisionOverrides(record.decisionOverrides),
      });
    });

    ctx.actions.register(ACTION.instantiateBuildPlan, async (params) => {
      const record = asRecord(params);
      const companyId = companyIdFromParams(record);
      return instantiateBuildPlan(ctx, {
        companyId,
        projectId: stringValue(record.projectId),
        plan: parseBuildPlan(record.plan),
        documentIssueId: stringValue(record.documentIssueId),
      });
    });

    const { name: instantiateBuildPlanToolName, ...instantiateBuildPlanToolDecl } = INSTANTIATE_BUILD_PLAN_TOOL;
    ctx.tools.register(instantiateBuildPlanToolName, instantiateBuildPlanToolDecl, async (params, runCtx) => {
      const record = asRecord(params);
      try {
        const summary = await instantiateBuildPlan(ctx, {
          companyId: runCtx.companyId,
          projectId: stringValue(record.projectId) ?? runCtx.projectId,
          plan: parseBuildPlan(record.plan),
          documentIssueId: stringValue(record.documentIssueId),
        });
        return {
          content: `Workflow build 생성: feature ${(summary.issues.filter((issue) => Boolean(issue.featureId && issue.stageSlug)).length) / 5}개 × 5단계, 총 ${summary.issues.length} issue. slots=${summary.slots.map((slot) => slot.slotKey).join(", ")}. root issue=${summary.rootIssueId}`,
          data: summary,
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
      }
    });
  },

  async onHealth() {
    return {
      status: "ok",
      message: "Product Builder plugin worker is running",
      details: {
        blueprints: BLUEPRINTS.map((blueprint) => blueprint.id),
      },
    };
  },
});

export default plugin;

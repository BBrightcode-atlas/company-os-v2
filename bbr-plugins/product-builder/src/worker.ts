import { randomUUID } from "node:crypto";
import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import {
  ACTION,
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
  PRODUCT_BUILDER_BUILD_PLAN_SLOT_KEY,
  PRODUCT_BUILDER_ISSUE_GRAPH_SLOT_KEY,
  PRODUCT_BUILDER_TASK_LIST_SLOT_KEY,
  PROJECT_KEY,
  buildFeatureParentDescription,
  buildIssueDescription,
  buildProductBuilderTasks,
  buildRootIssueDescription,
  buildWorkflowIssueDescription,
  buildWorkflowRootDescription,
  buildProductBuilderDeliverableSlots,
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
  type ProductBuilderDomainFeatureInput,
  type ProductBuilderFeatureSelectionInput,
  type InstantiateBuildInput,
  type ProductBuilderBuildSummary,
  type ProductBuilderOverview,
  type ProductBuilderTask,
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

function projectIdFromResolution(resolution: unknown): string | null {
  const record = asRecord(resolution);
  const details = asRecord(record.details);
  const project = asRecord(record.project);
  return stringValue(record.projectId) ?? stringValue(details.id) ?? stringValue(project.id) ?? null;
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

type ProductBuilderManagedResources = {
  project: unknown;
  agent: unknown;
  skill: unknown;
  projectId: string | null;
  agentId: string | null;
  agentIdsByKey: Record<string, string | null>;
};

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

function assigneeForTask(task: ProductBuilderTask, managed: ProductBuilderManagedResources): string | undefined {
  if (!isImplementationDecision(task.decision)) return undefined;
  const agentKey = agentKeyForTask(task);
  return managed.agentIdsByKey[agentKey] ?? managed.agentId ?? undefined;
}

async function reconcileManagedResources(ctx: AnyCtx, companyId: string): Promise<ProductBuilderManagedResources> {
  const project = await ctx.projects.managed.reconcile(PROJECT_KEY, companyId);
  const agent = await ctx.agents.managed.reconcile(BUILDER_AGENT_KEY, companyId);
  const backendAgent = await ctx.agents.managed.reconcile(BUILDER_BACKEND_AGENT_KEY, companyId);
  const frontendAgent = await ctx.agents.managed.reconcile(BUILDER_FRONTEND_AGENT_KEY, companyId);
  const platformAgent = await ctx.agents.managed.reconcile(BUILDER_PLATFORM_AGENT_KEY, companyId);
  const aiAgent = await ctx.agents.managed.reconcile(BUILDER_AI_AGENT_KEY, companyId);
  const qaAgent = await ctx.agents.managed.reconcile(BUILDER_QA_AGENT_KEY, companyId);
  const skill = await ctx.skills.managed.reconcile(BUILDER_SKILL_KEY, companyId);
  return {
    project,
    agent,
    skill,
    projectId: projectIdFromResolution(project),
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

async function readLastBuild(ctx: AnyCtx, companyId: string): Promise<ProductBuilderBuildSummary | null> {
  return await ctx.state.get({ scopeKind: "company", scopeId: companyId, stateKey: "last-build" }) as ProductBuilderBuildSummary | null;
}

async function writeLastBuild(ctx: AnyCtx, companyId: string, summary: ProductBuilderBuildSummary): Promise<void> {
  await ctx.state.set({ scopeKind: "company", scopeId: companyId, stateKey: "last-build" }, summary);
}

function targetProjectId(inputProjectId: string | undefined, planProjectId: string | undefined, managedProjectId: string | null): string | null {
  return inputProjectId ?? planProjectId ?? managedProjectId;
}

async function importProductBuilderSlots(
  ctx: AnyCtx,
  companyId: string,
  projectId: string | null,
  summary: ProductBuilderBuildSummary,
): Promise<void> {
  if (!projectId) return;
  const issueGraph = {
    buildId: summary.buildId,
    rootIssueId: summary.rootIssueId,
    issues: summary.issues,
    slots: summary.slots,
  };
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
  await ctx.projects.documentSlots.import(projectId, PRODUCT_BUILDER_ISSUE_GRAPH_SLOT_KEY, {
    title: "Paperclip 이슈 그래프(Issue Graph)",
    format: "text",
    body: JSON.stringify(issueGraph, null, 2),
    contentType: "application/vnd.paperclip.issue-graph+json",
    status: "ready",
    metadata,
  }, companyId);
}

async function instantiateBuild(ctx: AnyCtx, input: InstantiateBuildInput): Promise<ProductBuilderBuildSummary> {
  const companyId = input.companyId;
  const blueprint = getBlueprint(input.blueprintId);
  const intake = mergeIntake(input.intake, blueprint.defaultIntake);
  const featureSelection = mergeFeatureSelection(input.featureSelection ?? blueprint.defaultFeatureSelection);
  const domainFeatures = mergeDomainFeatures(input.domainFeatures, blueprint.defaultDomainFeatures);
  const tasks = buildProductBuilderTasks(blueprint, {
    overrides: input.decisionOverrides,
    featureSelection,
    domainFeatures,
  });
  const managed = await reconcileManagedResources(ctx, companyId);
  const projectId = targetProjectId(input.projectId, undefined, managed.projectId);
  const buildId = `pb-${randomUUID()}`;
  const billingCode = `product-builder:${blueprint.id}`;
  const root = await ctx.issues.create({
    companyId,
    projectId: projectId ?? undefined,
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
      projectId: projectId ?? undefined,
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
    projectId,
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

  await importProductBuilderSlots(ctx, companyId, projectId, summary);
  await writeLastBuild(ctx, companyId, summary);
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
  return summary;
}

async function instantiateBuildPlan(ctx: AnyCtx, input: InstantiateBuildPlanInput): Promise<ProductBuilderBuildSummary> {
  const companyId = input.companyId;
  const plan = input.plan;
  const tasks = buildWorkflowTasks(plan);
  const managed = await reconcileManagedResources(ctx, companyId);
  const projectId = targetProjectId(input.projectId, plan.projectId, managed.projectId);
  const buildId = `pb-${randomUUID()}`;
  const billingCode = "product-builder:workflow";

  const root = await ctx.issues.create({
    companyId,
    projectId: projectId ?? undefined,
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
      projectId: projectId ?? undefined,
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
      projectId: projectId ?? undefined,
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
    projectId,
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

  await importProductBuilderSlots(ctx, companyId, projectId, summary);
  await writeLastBuild(ctx, companyId, summary);
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
  return summary;
}

const plugin = definePlugin({
  async setup(ctx) {
    ctx.data.register(DATA.overview, async (params) => {
      const companyId = stringValue(params.companyId);
      let lastBuild: ProductBuilderBuildSummary | null = null;
      if (companyId) {
        lastBuild = await readLastBuild(ctx, companyId);
      }
      const overview: ProductBuilderOverview = {
        status: "ok",
        checkedAt: new Date().toISOString(),
        pluginId: PLUGIN_ID,
        version: PLUGIN_VERSION,
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
runWorker(plugin, import.meta.url);

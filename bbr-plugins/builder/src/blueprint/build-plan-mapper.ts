// Blueprint 산출물(prd)에서 "기존 Product Builder"의 comprehensive task 생성기를 구동한다.
// blueprint 고정 task(foundation/auth/upload/admin/deploy + capability 분할) + feature별 전개
// (DATA + CRUD API 5종 + landing/app/admin + QA)를 생성 → 실제 프로젝트 규모의 task 목록.
//
// prd → { blueprint, intake, domainFeatures, tasks }:
// - blueprint: getBlueprint(productBuilderBlueprintId) (기본 online-service-standard)
// - featureSelection: prd 텍스트에서 capability 감지(community/payment/upload/auth/...)
// - domainFeatures: functionalRequirements → feature card(surfaces/decision/mvp)
// - tasks: buildProductBuilderTasks(blueprint, {featureSelection, domainFeatures})

import { featureGrounding, type BlueprintDrb, type Architecture, type AgentGuidelineRoleKey } from "./contract.js";
import {
  buildProductBuilderTasks,
  getBlueprint,
  mergeFeatureSelection,
  mergeIntake,
  isImplementationDecision,
  BUILDER_AGENT_KEY,
  BUILDER_BACKEND_AGENT_KEY,
  BUILDER_FRONTEND_AGENT_KEY,
  BUILDER_PLATFORM_AGENT_KEY,
  BUILDER_AI_AGENT_KEY,
  BUILDER_QA_AGENT_KEY,
  type ProductBuilderTask,
  type ProductBuilderBlueprint,
  type ProductBuilderIntake,
  type ProductBuilderDomainFeatureInput,
  type ProductBuilderFeatureSelectionInput,
  type TaskCategory,
  type TaskDecision,
  type TaskSurface,
  type BuildPlan,
} from "../workflow-tasks/index.js";

// prd 텍스트에서 capability를 감지해 featureSelection을 구성한다(없는 것도 N/A task로 생성됨).
function detectFeatureSelection(drb: BlueprintDrb): ProductBuilderFeatureSelectionInput {
  const text = [
    drb.overview ?? "",
    ...drb.functionalRequirements.flatMap((fr) => [fr.title, fr.description]),
    ...drb.apis.map((api) => `${api.path} ${api.summary}`),
    ...drb.schemas.map((schema) => `${schema.name} ${schema.description}`),
  ].join(" ").toLowerCase();
  const has = (...keywords: string[]): boolean => keywords.some((keyword) => text.includes(keyword.toLowerCase()));

  return {
    auth: {
      enabled: true,
      email: true,
      oauthGoogle: has("google", "구글"),
      oauthKakao: has("kakao", "카카오"),
      oauthNaver: has("naver", "네이버"),
    },
    payment: {
      enabled: has("결제", "구독", "payment", "subscription", "billing", "결제수단"),
      oneTime: has("단건", "one-time", "단건결제"),
      subscription: has("구독", "subscription", "정기결제"),
    },
    notification: {
      emailResend: has("이메일", "email", "알림", "notification", "메일"),
      alimtalk: has("알림톡", "alimtalk", "카카오 알림"),
    },
    community: { enabled: has("커뮤니티", "게시글", "댓글", "community", "post", "comment", "게시판") },
    fileUpload: { vercelBlob: has("업로드", "파일", "이미지", "upload", "file", "media", "첨부") },
    videoLecture: { cloudflareStream: has("영상", "강의", "비디오", "video", "stream", "lecture", "강좌") },
    identityVerification: { kcb: has("본인확인", "본인인증", "실명", "kcb", "identity verification") },
    admin: { userManagement: true, paymentManagement: has("결제", "payment") },
  };
}

const DOMAIN_SURFACE_MAP: Record<string, TaskSurface | undefined> = {
  admin: "admin",
  site: "landing",
  app: "app",
  landing: "landing",
};

function aggregateDecision(decisions: readonly string[]): TaskDecision {
  const signal = decisions.filter((d) => d === "NEW" || d === "EXTEND" || d === "REUSE");
  if (signal.length === 0) return "NEW";
  if (signal.includes("NEW")) return "NEW";
  if (signal.includes("EXTEND")) return "EXTEND";
  return "REUSE";
}

// API path에서 리소스 기준(엔티티) 추출: /community/posts/{postId} → community/posts.
function apiResourceBase(path: string): string {
  return path.split("/").filter((seg) => seg && !seg.startsWith("{") && !seg.startsWith(":")).join("/");
}

// 제목에서 엔티티 후보 토큰 추출(액션/일반어 제거). "커뮤니티 게시글 작성" → [커뮤니티, 게시글].
// 제목에서 엔티티 후보 토큰 추출(범용 액션/구조어 제거 → 명사형 엔티티 토큰만 남김).
const TITLE_STOPWORDS = new Set([
  "작성", "수정", "삭제", "조회", "열람", "등록", "관리", "생성", "변경", "추가", "제거", "발행",
  "처리", "승인", "적용", "설정", "검색", "목록", "상세", "기능", "화면", "정의",
  "create", "read", "update", "delete", "list", "manage", "view", "api",
]);
function entityTokens(title: string): string[] {
  return title
    .split(/[\s/,()·]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !TITLE_STOPWORDS.has(token.toLowerCase()));
}

// FR을 "엔티티" 단위로 묶는다(union-find). 같은 엔티티(스키마/API 리소스/제목 엔티티 토큰)를
// 공유하는 액션 FR(작성/수정/삭제/열람)이 1 feature가 되어 CRUD가 1세트만 생성된다.
// 업스트림 schema/api 링크가 불완전해도 제목 토큰 신호로 보강한다.
function domainFeaturesFromDrb(drb: BlueprintDrb): ProductBuilderDomainFeatureInput[] {
  const grounding = featureGrounding(drb);
  const apiByCode = new Map(drb.apis.map((api) => [api.code, api]));
  type Fr = BlueprintDrb["functionalRequirements"][number];
  const frs = drb.functionalRequirements;

  // union-find
  const parent = new Map<string, string>(frs.map((fr) => [fr.code, fr.code]));
  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let cur = x;
    while (parent.get(cur) !== root) { const next = parent.get(cur)!; parent.set(cur, root); cur = next; }
    return root;
  };
  const union = (a: string, b: string): void => { const ra = find(a); const rb = find(b); if (ra !== rb) parent.set(ra, rb); };

  // 신호별 버킷(공유 시 union). 스키마/API 링크는 한 스키마가 무관한 FR을 다수 연결하는
  // 노이즈가 커서(텍스트 fallback + LLM 오링크) 엔티티 경계를 뭉갠다. 제목 엔티티 토큰만 신호로 쓴다.
  const buckets = new Map<string, string[]>();
  const addSignal = (signal: string, frCode: string): void => {
    const list = buckets.get(signal) ?? [];
    list.push(frCode);
    buckets.set(signal, list);
  };
  for (const fr of frs) {
    for (const token of entityTokens(fr.title)) addSignal(`tok:${token.toLowerCase()}`, fr.code);
  }
  for (const list of buckets.values()) {
    for (let i = 1; i < list.length; i += 1) union(list[0], list[i]);
  }

  // 컴포넌트(엔티티) 묶기.
  const components = new Map<string, Fr[]>();
  for (const fr of frs) {
    const root = find(fr.code);
    const list = components.get(root) ?? [];
    list.push(fr);
    components.set(root, list);
  }

  return [...components.values()].map((cluster) => {
    // feature 제목 = 클러스터 전 FR에 공통으로 등장하는 엔티티 토큰(있으면), 없으면 첫 FR 제목.
    const tokenCounts = new Map<string, number>();
    for (const fr of cluster) for (const token of entityTokens(fr.title)) tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
    const commonToken = [...tokenCounts.entries()].filter(([, n]) => n === cluster.length).sort((a, b) => b[0].length - a[0].length)[0]?.[0];
    const mapped = cluster
      .flatMap((fr) => fr.targetSurfaces ?? [])
      .map((surface) => DOMAIN_SURFACE_MAP[surface])
      .filter((surface): surface is TaskSurface => Boolean(surface));
    const surfaces = mapped.length > 0 ? Array.from(new Set(mapped)) : (["app"] as TaskSurface[]);
    const decisions = cluster.flatMap((fr) => grounding.get(fr.code)?.decisions ?? []);
    return {
      id: cluster[0].code,
      title: commonToken ?? cluster[0].title,
      description: cluster.map((fr) => fr.title).join(" / "),
      surfaces,
      decision: aggregateDecision(decisions),
      mvp: cluster.some((fr) => fr.priority === "must" || fr.priority === undefined),
    } satisfies ProductBuilderDomainFeatureInput;
  });
}

export type BlueprintProductBuild = {
  blueprint: ProductBuilderBlueprint;
  intake: ProductBuilderIntake;
  featureSelection: ReturnType<typeof mergeFeatureSelection>;
  domainFeatures: ProductBuilderDomainFeatureInput[];
  tasks: ProductBuilderTask[];
  productName: string;
};

// screenPlanToScreenModel(contract.ts) 반환 shape. 산출물 반영에 필요한 최소 필드만 요구한다.
export type ScreenModelForTasks = {
  screens: Array<{ basic: Record<string, string>; tables: Record<string, Array<Record<string, string>>> }>;
};

export type BlueprintProductTaskOptions = {
  screenModel?: ScreenModelForTasks;
  architecture?: Architecture;
  figmaAvailable?: boolean;
  wireframeAvailable?: boolean;
  figmaFileKey?: string;
  figmaNodeId?: string;
};

// 시각 소스 정답 순서: Figma(definitive) > Wireframe > Spec.
function screenSourceMarker(opts: { figmaAvailable?: boolean; wireframeAvailable?: boolean }): string {
  if (opts.figmaAvailable) return "[Figma]";
  if (opts.wireframeAvailable) return "[Wireframe]";
  return "[Spec]";
}

// 화면정의서의 각 화면을 대상 feature의 FE task(category frontend)에 매핑해 items(deliverables)에
// "화면명 — <소스마커>"를 추가한다. 신규 task는 만들지 않는다. 매칭은 domainFeaturesFromDrb와 동일한
// 엔티티 토큰 grounding 방식(제목/설명 토큰 overlap)을 쓴다. FE task가 없는 feature/무매칭 화면은 skip.
function applyScreenModelToFeTasks(
  tasks: ProductBuilderTask[],
  domainFeatures: ProductBuilderDomainFeatureInput[],
  screenModel: ScreenModelForTasks,
  marker: string,
): void {
  const featureEntries = domainFeatures
    .map((feature) => {
      const title = feature.title ?? "";
      const tokens = new Set(
        [...entityTokens(title), ...entityTokens(feature.description ?? "")].map((token) => token.toLowerCase()),
      );
      // FE task 제목은 `${feature.title} 공개/앱 화면`(category frontend)으로 생성됨.
      const feTasks = title
        ? tasks.filter((task) => task.category === "frontend" && task.title.startsWith(`${title} `))
        : [];
      return { tokens, feTasks };
    })
    .filter((entry) => entry.feTasks.length > 0 && entry.tokens.size > 0);
  if (featureEntries.length === 0) return;

  for (const screen of screenModel.screens) {
    const name = screen.basic.screenName?.trim() || screen.basic.screenCode?.trim() || "";
    if (!name) continue;
    const screenTokens = new Set(
      [...entityTokens(name), ...entityTokens(screen.basic.description ?? "")].map((token) => token.toLowerCase()),
    );
    if (screenTokens.size === 0) continue;
    const surface = (screen.basic.targetSurface ?? "").toLowerCase();
    const item = `${name} — ${marker}`;
    for (const entry of featureEntries) {
      if (![...screenTokens].some((token) => entry.tokens.has(token))) continue;
      // 화면 targetSurface에 맞는 FE task 우선(site는 landing에 대응), 없으면 feature의 모든 FE task.
      const surfaceTasks = surface
        ? entry.feTasks.filter((task) => task.surfaces.some((s) => s === surface || (surface === "site" && s === "landing")))
        : [];
      const targets = surfaceTasks.length > 0 ? surfaceTasks : entry.feTasks;
      for (const task of targets) {
        if (!task.deliverables.includes(item)) task.deliverables.push(item);
      }
    }
  }
}

// 아키텍처 산출물을 platform 계열 task(PB-REPO-001 또는 category ops)의 description에 context 블록으로 병합.
function architectureContextBlock(architecture: Architecture): string | null {
  const lines: string[] = [];
  if (architecture.overview?.trim()) lines.push(`- 개요: ${architecture.overview.trim()}`);
  const tech = (architecture.techStack ?? []).map((t) => `${t.area}: ${t.choice}`.trim()).filter((s) => s.length > 2);
  if (tech.length > 0) lines.push(`- 기술 스택/경계: ${tech.join(" / ")}`);
  const infra = (architecture.infrastructure ?? [])
    .map((i) => `${i.name}${i.provider ? `(${i.provider})` : ""}`.trim())
    .filter(Boolean);
  if (infra.length > 0) lines.push(`- 인프라/배포: ${infra.join(" / ")}`);
  const integrations = (architecture.integrations ?? []).map((s) => s.trim()).filter(Boolean);
  if (integrations.length > 0) lines.push(`- 외부 연동: ${integrations.join(" / ")}`);
  const flow = (architecture.dataFlow ?? []).map((s) => s.trim()).filter(Boolean);
  if (flow.length > 0) lines.push(`- 데이터 흐름: ${flow.join(" → ")}`);
  if (lines.length === 0) return null;
  return ["## 아키텍처 컨텍스트", ...lines].join("\n");
}

function applyArchitectureToPlatformTasks(tasks: ProductBuilderTask[], architecture: Architecture): void {
  const block = architectureContextBlock(architecture);
  if (!block) return;
  for (const task of tasks) {
    const isPlatform = task.key === "PB-REPO-001" || task.category === "ops";
    if (!isPlatform) continue;
    if (task.description.includes("## 아키텍처 컨텍스트")) continue;
    task.description = `${task.description}\n\n${block}`;
  }
}

function figmaContextBlock(fileKey: string, nodeId?: string): string {
  const lines = ["## Figma 원본 (진실의 원천)", `- 파일 key: \`${fileKey}\``];
  if (nodeId) lines.push(`- 시작 노드: \`${nodeId}\``);
  lines.push(
    "이 화면은 Figma에 연결되어 있다. 색·폰트·간격·레이아웃 값은 추측하지 말고 Figma MCP로 직접 조회해 그 수치대로 픽셀 퍼펙트하게 구현하라(get_design_context = 스타일·레이아웃, get_variable_defs = 디자인 토큰). 파일 전체를 조회할 수 있으며, 시작 노드가 있으면 거기서 출발한다.",
    "Figma MCP 도구를 쓸 수 없거나 호출이 실패하면(미설치·미인증·권한 거부) 추측으로 구현하지 말고 paperclipAskUserQuestions 로 ① Figma 없이 화면정의서·와이어프레임 기준 추정 구현 진행 ② Figma MCP 연결·인증 후 진행 중 무엇을 원하는지 물어라. 답이 올 때까지 이 화면 구현을 멈춘다.",
  );
  return lines.join("\n");
}

function applyFigmaToFeTasks(tasks: ProductBuilderTask[], fileKey: string, nodeId?: string): void {
  const block = figmaContextBlock(fileKey, nodeId);
  for (const task of tasks) {
    if (task.category !== "frontend") continue;
    if (task.description.includes("## Figma 원본")) continue;
    task.description = `${task.description}\n\n${block}`;
  }
}

export function buildBlueprintProductTasks(
  drb: BlueprintDrb,
  blueprintId?: string,
  opts?: BlueprintProductTaskOptions,
): BlueprintProductBuild {
  const blueprint = getBlueprint(blueprintId);
  const featureSelection = mergeFeatureSelection(detectFeatureSelection(drb));
  const domainFeatures = domainFeaturesFromDrb(drb);
  const intake = mergeIntake({ productName: drb.projectTitle }, blueprint.defaultIntake);
  const tasks = buildProductBuilderTasks(blueprint, { featureSelection, domainFeatures });
  if (opts?.screenModel && opts.screenModel.screens.length > 0) {
    applyScreenModelToFeTasks(tasks, domainFeatures, opts.screenModel, screenSourceMarker(opts));
  }
  if (opts?.architecture) {
    applyArchitectureToPlatformTasks(tasks, opts.architecture);
  }
  if (opts?.figmaFileKey) {
    applyFigmaToFeTasks(tasks, opts.figmaFileKey, opts.figmaNodeId);
  }
  return { blueprint, intake, featureSelection, domainFeatures, tasks, productName: drb.projectTitle };
}

// task → 필수 가이드라인 역할 섹션 키. agentKeyForTask(BUILDER_*_AGENT_KEY) → guideline role.
export function roleKeyForTask(task: ProductBuilderTask): AgentGuidelineRoleKey {
  switch (agentKeyForTask(task)) {
    case BUILDER_BACKEND_AGENT_KEY:
      return "backend";
    case BUILDER_FRONTEND_AGENT_KEY:
      return "frontend";
    case BUILDER_PLATFORM_AGENT_KEY:
      return "platform";
    case BUILDER_AI_AGENT_KEY:
      return "ai";
    case BUILDER_QA_AGENT_KEY:
      return "qa";
    default:
      return "orchestrator";
  }
}

// classic 렌더러 입력용 BuildPlan(feature 행). 전체 task는 tasks에서 온다.
export function buildClassicPlan(build: BlueprintProductBuild): BuildPlan {
  return {
    blueprintId: build.blueprint.id,
    productName: build.productName,
    features: build.domainFeatures.map((feature) => ({
      id: feature.id || feature.title || "feature",
      title: feature.title ?? "feature",
      description: feature.description,
      featureDecision: feature.decision,
    })),
  };
}

// task category → 담당 managed agent key (classic 배정 규칙).
export function agentKeyForTask(task: ProductBuilderTask): string {
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

// 실행 작업(NEW/EXTEND)만 담당 배정. REUSE/N/A는 SKIP 레코드라 미배정.
export function assigneeForTask(
  task: ProductBuilderTask,
  agentIdsByKey: Record<string, string | undefined>,
  fallbackAgentId: string | undefined,
): string | undefined {
  if (!isImplementationDecision(task.decision)) return undefined;
  return agentIdsByKey[agentKeyForTask(task)] ?? fallbackAgentId;
}

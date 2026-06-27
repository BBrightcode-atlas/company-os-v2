// Blueprint 산출물(prd)에서 "기존 Product Builder"의 comprehensive task 생성기를 구동한다.
// blueprint 고정 task(foundation/auth/upload/admin/deploy + capability 분할) + feature별 전개
// (DATA + CRUD API 5종 + landing/app/admin + QA)를 생성 → 실제 프로젝트 규모의 task 목록.
//
// prd → { blueprint, intake, domainFeatures, tasks }:
// - blueprint: getBlueprint(productBuilderBlueprintId) (기본 online-service-standard)
// - featureSelection: prd 텍스트에서 capability 감지(community/payment/upload/auth/...)
// - domainFeatures: functionalRequirements → feature card(surfaces/decision/mvp)
// - tasks: buildProductBuilderTasks(blueprint, {featureSelection, domainFeatures})

import { featureGrounding, type BlueprintPrd } from "./contract.js";
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
function detectFeatureSelection(prd: BlueprintPrd): ProductBuilderFeatureSelectionInput {
  const text = [
    prd.overview ?? "",
    ...prd.functionalRequirements.flatMap((fr) => [fr.title, fr.description]),
    ...prd.apis.map((api) => `${api.path} ${api.summary}`),
    ...prd.schemas.map((schema) => `${schema.name} ${schema.description}`),
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

function domainFeaturesFromPrd(prd: BlueprintPrd): ProductBuilderDomainFeatureInput[] {
  const grounding = featureGrounding(prd);
  return prd.functionalRequirements.map((fr) => {
    const mapped = (fr.targetSurfaces ?? [])
      .map((surface) => DOMAIN_SURFACE_MAP[surface])
      .filter((surface): surface is TaskSurface => Boolean(surface));
    const surfaces = mapped.length > 0 ? Array.from(new Set(mapped)) : (["app"] as TaskSurface[]);
    return {
      id: fr.code,
      title: fr.title,
      description: fr.description,
      surfaces,
      decision: aggregateDecision(grounding.get(fr.code)?.decisions ?? []),
      mvp: fr.priority === "must" || fr.priority === undefined,
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

export function buildBlueprintProductTasks(prd: BlueprintPrd, blueprintId?: string): BlueprintProductBuild {
  const blueprint = getBlueprint(blueprintId);
  const featureSelection = mergeFeatureSelection(detectFeatureSelection(prd));
  const domainFeatures = domainFeaturesFromPrd(prd);
  const intake = mergeIntake({ productName: prd.projectTitle }, blueprint.defaultIntake);
  const tasks = buildProductBuilderTasks(blueprint, { featureSelection, domainFeatures });
  return { blueprint, intake, featureSelection, domainFeatures, tasks, productName: prd.projectTitle };
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

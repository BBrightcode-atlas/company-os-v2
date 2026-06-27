// 결정론적: Blueprint 산출물(prd.functionalRequirements + schemas/apis)에서
// task 엔진 입력(BuildPlan)을 만든다. LLM/에이전트 없음.
//
// 규칙:
// - 각 functionalRequirement = 1 feature(고정 5단계 BE→BE QA→FE→FE QA→전체QA).
// - featureDecision = FR에 연결된 schema/api의 reuse decision 집계(featureGrounding).
//   NEW/신호없음→NEW, EXTEND 섞임→EXTEND, 전부 REUSE→REUSE (UNDECIDED는 신호 없음).
// - BE/BE QA: FR에 연결된 schema·api가 하나도 없으면 N/A. BE items=연결된 SCH/API 코드.
// - FE/FE QA: FR surface에 UI 면(admin/site/app/landing)이 없으면 N/A.
// - 전체 QA: 구현 면(BE 또는 FE)이 있으면 NEW(검증), 없으면 N/A.
// - shared 트랙: Blueprint는 아직 feature 밖 공통 인프라 항목을 별도 모델링하지 않음 → []
//   (모든 FR이 feature). buildWorkflowTasks가 통합 QA + Release 게이트를 붙인다.

import { featureGrounding, type BlueprintPrd } from "./contract.js";
import type {
  BuildFeatureInput,
  BuildPlan,
  StagePlanInput,
  TaskDecision,
  WorkflowStageSlug,
} from "../workflow-tasks/index.js";

const UI_SURFACES = new Set(["admin", "site", "app", "landing"]);

// reuse decision 집계: UNDECIDED는 신호 없음으로 무시. 신호 없으면 실행 작업(NEW) 기본.
function aggregateDecision(decisions: readonly string[]): TaskDecision {
  const signal = decisions.filter((d) => d === "NEW" || d === "EXTEND" || d === "REUSE");
  if (signal.length === 0) return "NEW";
  if (signal.includes("NEW")) return "NEW";
  if (signal.includes("EXTEND")) return "EXTEND";
  return "REUSE";
}

export function deliverablesToBuildPlan(prd: BlueprintPrd): BuildPlan {
  const grounding = featureGrounding(prd);
  const features: BuildFeatureInput[] = prd.functionalRequirements.map((requirement) => {
    const g = grounding.get(requirement.code) ?? { schemaCodes: [], apiCodes: [], decisions: [] };
    const featureDecision = aggregateDecision(g.decisions);
    const hasBe = g.schemaCodes.length > 0 || g.apiCodes.length > 0;
    const hasUi = (requirement.targetSurfaces ?? []).some((surface) => UI_SURFACES.has(surface));
    const beItems = [...g.schemaCodes, ...g.apiCodes];

    const stages: Partial<Record<WorkflowStageSlug, StagePlanInput>> = {
      be: hasBe ? { decision: featureDecision, items: beItems } : { decision: "N/A" },
      "be-qa": hasBe ? { decision: featureDecision } : { decision: "N/A" },
      fe: hasUi ? { decision: featureDecision } : { decision: "N/A" },
      "fe-qa": hasUi ? { decision: featureDecision } : { decision: "N/A" },
      "full-qa": (hasBe || hasUi) ? { decision: "NEW" } : { decision: "N/A" },
    };

    return {
      id: requirement.code,
      title: requirement.title,
      featureDecision,
      description: requirement.description,
      stages,
    } satisfies BuildFeatureInput;
  });

  return {
    productName: prd.projectTitle,
    features,
    shared: [],
  } satisfies BuildPlan;
}

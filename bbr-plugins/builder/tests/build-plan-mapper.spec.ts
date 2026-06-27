import { describe, it, expect } from "vitest";
import { deliverablesToBuildPlan } from "../src/blueprint/build-plan-mapper.js";
import { buildWorkflowTasks } from "../src/workflow-tasks/index.js";
import type { BlueprintPrd } from "../src/blueprint/contract.js";

// 매퍼/grounding가 읽는 필드만 채운 AIGA형 fixture. 나머지 필수 필드는 최소값.
function makePrd(): BlueprintPrd {
  return {
    projectTitle: "AIGA",
    overview: "",
    goals: [],
    scope: { inScope: [], outOfScope: [] },
    functionalRequirements: [
      { code: "FR-001", title: "사용자 등급별 권한 정책", description: "등급별 권한", targetSurfaces: ["admin", "site"] },
      { code: "FR-002", title: "비회원 게시글 열람 한도", description: "비회원 열람 한도", targetSurfaces: ["site"] },
      { code: "FR-003", title: "공통 약관 정책", description: "공통 약관", targetSurfaces: ["shared"] },
    ],
    nonFunctionalRequirements: [],
    schemas: [
      { code: "SCH-001", name: "권한", description: "권한 테이블", fields: [], featureRefs: ["FR-001"], baseReuseDecision: "EXTEND" },
      { code: "SCH-002", name: "게시글", description: "게시글 테이블", fields: [], featureRefs: ["FR-002"], baseReuseDecision: "NEW" },
    ],
    apis: [
      { code: "API-001", method: "GET", path: "/perm", summary: "권한 조회", input: [], output: [], schemas: ["SCH-001"], featureRefs: ["FR-001"], baseReuseDecision: "EXTEND" },
    ],
    layouts: [],
    architecture: { components: [], diagram: "" },
    risks: [],
    assumptions: [],
    generatedAt: "",
    confirmedAt: null,
  } as unknown as BlueprintPrd;
}

describe("deliverablesToBuildPlan (결정론 매퍼)", () => {
  it("FR마다 feature 생성 + reuse decision 집계 + BE/FE N/A 규칙", () => {
    const plan = deliverablesToBuildPlan(makePrd());
    expect(plan.features.map((f) => f.id)).toEqual(["FR-001", "FR-002", "FR-003"]);

    // FR-001: SCH+API 모두 EXTEND → EXTEND. BE items에 코드 인용. admin/site → FE in-scope.
    const f1 = plan.features[0];
    expect(f1.featureDecision).toBe("EXTEND");
    expect(f1.stages?.be?.decision).toBe("EXTEND");
    expect(f1.stages?.be?.items).toEqual(expect.arrayContaining(["SCH-001", "API-001"]));
    expect(f1.stages?.fe?.decision).toBe("EXTEND");

    // FR-002: SCH NEW → NEW.
    const f2 = plan.features[1];
    expect(f2.featureDecision).toBe("NEW");
    expect(f2.stages?.be?.decision).toBe("NEW");

    // FR-003: 링크된 schema/api 없음 → BE/BE QA N/A; shared-only surface → FE/FE QA N/A; 구현 면 없음 → 전체 QA N/A.
    const f3 = plan.features[2];
    expect(f3.stages?.be?.decision).toBe("N/A");
    expect(f3.stages?.["be-qa"]?.decision).toBe("N/A");
    expect(f3.stages?.fe?.decision).toBe("N/A");
    expect(f3.stages?.["full-qa"]?.decision).toBe("N/A");
  });

  it("buildWorkflowTasks가 feature×5단계 + 통합 QA + Release DAG를 만든다", () => {
    const tasks = buildWorkflowTasks(deliverablesToBuildPlan(makePrd()));
    expect(tasks.length).toBe(3 * 5 + 2); // 3 features × 5 stages + 통합 QA + Release
    expect(tasks.some((t) => t.key === "INTEGRATION-QA-001")).toBe(true);
    expect(tasks.some((t) => t.key === "RELEASE-001")).toBe(true);
    // feature 격리: 각 feature의 BE는 같은 feature의 이전 stage만 의존(다른 feature 미참조).
    const f1be = tasks.find((t) => t.featureId === "FR-001" && t.stageSlug === "be");
    expect(f1be?.dependsOn ?? []).toEqual([]);
  });

  it("featureRefs가 비어도(키워드 fallback) feature가 grounding된다", () => {
    const prd = makePrd();
    // 링크 제거 → featureRequirementsForSchema/Api의 텍스트 fallback 경유.
    for (const s of prd.schemas) delete (s as { featureRefs?: string[] }).featureRefs;
    for (const a of prd.apis) delete (a as { featureRefs?: string[] }).featureRefs;
    const plan = deliverablesToBuildPlan(prd);
    expect(plan.features).toHaveLength(3);
    // 매퍼는 절대 throw하지 않고 결정론적 결과를 낸다.
    expect(buildWorkflowTasks(plan).length).toBeGreaterThanOrEqual(3 * 5);
  });
});

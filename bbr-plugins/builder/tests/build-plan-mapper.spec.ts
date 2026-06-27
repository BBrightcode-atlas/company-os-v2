import { describe, it, expect } from "vitest";
import { buildDeliverableTaskPlan, renderDeliverableTaskListMarkdown } from "../src/blueprint/build-plan-mapper.js";
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

describe("buildDeliverableTaskPlan (artifact 단위 결정론 전개)", () => {
  it("API 1개=task 1개, 스키마 1개=task 1개, feature 단위 그룹, BE/FE/QA 분리", () => {
    const plan = buildDeliverableTaskPlan(makePrd());

    expect(plan.features.map((f) => f.id)).toEqual(["FR-001", "FR-002", "FR-003"]);

    const be = plan.tasks.filter((t) => t.stageSlug === "be");
    const fe = plan.tasks.filter((t) => t.stageSlug === "fe");
    const qa = plan.tasks.filter((t) => t.stageSlug === "full-qa");

    // BE: SCH-001, API-001(FR-001) + SCH-002(FR-002) = 3.
    expect(be).toHaveLength(3);
    expect(be.some((t) => t.title.includes("API GET /perm"))).toBe(true);
    // FE: FR-001 admin/site(2) + FR-002 site(1) = 3. FR-003은 shared-only라 FE 없음.
    expect(fe).toHaveLength(3);
    // QA: FR-001, FR-002 (FR-003은 작업 없음) = 2.
    expect(qa).toHaveLength(2);

    expect(be.every((t) => t.agentRole === "Backend Engineer")).toBe(true);
    expect(fe.every((t) => t.agentRole === "Frontend Engineer")).toBe(true);

    const sch001 = be.find((t) => t.key.endsWith("SCH-001"));
    expect(sch001?.decision).toBe("EXTEND");

    const api001 = be.find((t) => t.title.includes("API GET /perm"));
    expect(api001?.dependsOn).toEqual(expect.arrayContaining([expect.stringContaining("SCH-001")]));

    expect(plan.tasks.some((t) => t.key === "INTEGRATION-QA-001")).toBe(true);
    expect(plan.tasks.some((t) => t.key === "RELEASE-001")).toBe(true);
    expect(plan.tasks.filter((t) => t.featureId === "FR-003")).toHaveLength(0);
  });

  it("각 artifact는 primary FR에 1회만 배정(중복 task 없음)", () => {
    const prd = makePrd();
    (prd.schemas[0] as { featureRefs?: string[] }).featureRefs = ["FR-001", "FR-003"];
    const plan = buildDeliverableTaskPlan(prd);
    const sch001Tasks = plan.tasks.filter((t) => t.key.endsWith("SCH-001"));
    expect(sch001Tasks).toHaveLength(1);
    expect(sch001Tasks[0].featureId).toBe("FR-001");
  });

  it("렌더: feature 단위 + BE/FE/QA 섹션으로 MD 생성", () => {
    const md = renderDeliverableTaskListMarkdown(buildDeliverableTaskPlan(makePrd()));
    expect(md).toContain("기능별 Task");
    expect(md).toContain("#### BE");
    expect(md).toContain("#### FE");
    expect(md).toContain("사용자 등급별 권한 정책");
  });
});

import { describe, it, expect } from "vitest";
import { buildBlueprintProductTasks, buildClassicPlan } from "../src/blueprint/build-plan-mapper.js";
import { renderTaskListMarkdown } from "../src/workflow-tasks/index.js";
import type { BlueprintPrd } from "../src/blueprint/contract.js";

function makePrd(): BlueprintPrd {
  return {
    projectTitle: "AIGA",
    overview: "의료 추천 커뮤니티 서비스. 게시글/댓글, 결제 구독, 파일 업로드 포함.",
    goals: [],
    scope: { inScope: [], outOfScope: [] },
    functionalRequirements: [
      { code: "FR-001", title: "사용자 등급별 권한 정책", description: "등급별 권한", targetSurfaces: ["admin", "site"] },
      { code: "FR-002", title: "비회원 게시글 열람 한도", description: "비회원 게시글 열람", targetSurfaces: ["site"] },
      { code: "FR-003", title: "커뮤니티 게시글 작성", description: "게시글 작성/댓글", targetSurfaces: ["app", "site"] },
    ],
    nonFunctionalRequirements: [],
    schemas: [
      { code: "SCH-001", name: "권한", description: "권한 테이블", fields: [], featureRefs: ["FR-001"], baseReuseDecision: "EXTEND" },
      { code: "SCH-002", name: "게시글", description: "게시글 테이블", fields: [], featureRefs: ["FR-003"], baseReuseDecision: "NEW" },
    ],
    apis: [
      { code: "API-001", method: "POST", path: "/community/posts", summary: "게시글 작성", input: [], output: [], schemas: ["SCH-002"], featureRefs: ["FR-003"], baseReuseDecision: "NEW" },
    ],
    layouts: [],
    architecture: { components: [], diagram: "" },
    risks: [],
    assumptions: [],
    generatedAt: "",
    confirmedAt: null,
  } as unknown as BlueprintPrd;
}

describe("buildBlueprintProductTasks (comprehensive Product Builder 생성)", () => {
  it("blueprint 고정 task + capability + feature 전개로 대량 task 생성", () => {
    const build = buildBlueprintProductTasks(makePrd());
    // foundation/capability + feature별 전개 → 수십 개 이상.
    expect(build.tasks.length).toBeGreaterThan(30);
    // 기반(PB-*) task 포함.
    expect(build.tasks.some((t) => t.key.startsWith("PB-"))).toBe(true);
    // feature 전개(FEAT-*) 포함.
    expect(build.tasks.some((t) => t.key.startsWith("FEAT-"))).toBe(true);
    // BE/FE/QA category 분포.
    expect(build.tasks.some((t) => t.category === "backend")).toBe(true);
    expect(build.tasks.some((t) => t.category === "frontend")).toBe(true);
    expect(build.tasks.some((t) => t.category === "qa")).toBe(true);
  });

  it("prd 키워드로 capability 감지(커뮤니티/결제/업로드)", () => {
    const build = buildBlueprintProductTasks(makePrd());
    expect(build.featureSelection.community.enabled).toBe(true);
    expect(build.featureSelection.payment.enabled).toBe(true);
    expect(build.featureSelection.fileUpload.vercelBlob).toBe(true);
  });

  it("classic 렌더가 전체 task를 MD로 출력", () => {
    const build = buildBlueprintProductTasks(makePrd());
    const md = renderTaskListMarkdown({
      buildId: "b", blueprintId: build.blueprint.id, productName: build.productName,
      rootIssueId: "", createdAt: "2026-01-01", plan: buildClassicPlan(build), tasks: build.tasks, issues: [],
    });
    expect(md.length).toBeGreaterThan(500);
    expect(md).toContain("Task");
  });
});

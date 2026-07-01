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
      { code: "FR-003", title: "커뮤니티 게시글 작성", description: "게시글 작성", targetSurfaces: ["app", "site"] },
      { code: "FR-004", title: "커뮤니티 게시글 수정", description: "게시글 수정", targetSurfaces: ["app"] },
      { code: "FR-005", title: "커뮤니티 게시글 삭제", description: "게시글 삭제", targetSurfaces: ["app"] },
    ],
    nonFunctionalRequirements: [],
    schemas: [
      { code: "SCH-001", name: "권한", description: "권한 테이블", fields: [], featureRefs: ["FR-001"], baseReuseDecision: "EXTEND" },
      // 게시글 엔티티: 작성/수정/삭제 FR이 모두 이 스키마를 공유 → 1 feature로 묶여야 함.
      { code: "SCH-002", name: "게시글", description: "게시글 테이블", fields: [], featureRefs: ["FR-002", "FR-003", "FR-004", "FR-005"], baseReuseDecision: "NEW" },
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

  it("같은 엔티티(스키마) 액션 FR(작성/수정/삭제)은 1 feature로 묶여 CRUD 1세트만 생성", () => {
    const build = buildBlueprintProductTasks(makePrd());
    // 게시글 엔티티 feature는 하나 → FEAT-{게시글 cluster}-API-CREATE 등 1세트만.
    const apiCreateTasks = build.tasks.filter((t) => /^FEAT-.*-API-CREATE$/.test(t.key));
    // 권한(SCH-001) + 게시글(SCH-002) = feature 2개 → API-CREATE 2개(엔티티당 1). 5개 FR이 아님.
    expect(apiCreateTasks.length).toBe(2);
    // 게시글 작성/수정/삭제가 각각 별도 feature로 중복 CRUD 생성하지 않는다.
    expect(apiCreateTasks.length).toBeLessThan(5);
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

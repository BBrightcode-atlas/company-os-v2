import { describe, it, expect } from "vitest";
import { buildBlueprintProductTasks, buildClassicPlan } from "../src/blueprint/build-plan-mapper.js";
import { renderTaskListMarkdown, buildIssueDescription } from "../src/workflow-tasks/index.js";
import type { BlueprintDrb } from "../src/blueprint/contract.js";

function makeDrb(): BlueprintDrb {
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
  } as unknown as BlueprintDrb;
}

describe("buildBlueprintProductTasks (comprehensive Product Builder 생성)", () => {
  it("blueprint 고정 task + capability + feature 전개로 대량 task 생성", () => {
    const build = buildBlueprintProductTasks(makeDrb());
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
    const build = buildBlueprintProductTasks(makeDrb());
    // 게시글 엔티티 feature는 하나 → FEAT-{게시글 cluster}-API-CREATE 등 1세트만.
    const apiCreateTasks = build.tasks.filter((t) => /^FEAT-.*-API-CREATE$/.test(t.key));
    // 권한(SCH-001) + 게시글(SCH-002) = feature 2개 → API-CREATE 2개(엔티티당 1). 5개 FR이 아님.
    expect(apiCreateTasks.length).toBe(2);
    // 게시글 작성/수정/삭제가 각각 별도 feature로 중복 CRUD 생성하지 않는다.
    expect(apiCreateTasks.length).toBeLessThan(5);
  });

  it("prd 키워드로 capability 감지(커뮤니티/결제/업로드)", () => {
    const build = buildBlueprintProductTasks(makeDrb());
    expect(build.featureSelection.community.enabled).toBe(true);
    expect(build.featureSelection.payment.enabled).toBe(true);
    expect(build.featureSelection.fileUpload.vercelBlob).toBe(true);
  });

  it("classic 렌더가 전체 task를 MD로 출력", () => {
    const build = buildBlueprintProductTasks(makeDrb());
    const md = renderTaskListMarkdown({
      buildId: "b", blueprintId: build.blueprint.id, productName: build.productName,
      rootIssueId: "", createdAt: "2026-01-01", plan: buildClassicPlan(build), tasks: build.tasks, issues: [],
    });
    expect(md.length).toBeGreaterThan(500);
    expect(md).toContain("Task");
  });
});

function screenModel(name: string, surface: string, description = "") {
  return { screens: [{ basic: { screenCode: "SCR-1", screenName: name, description, targetSurface: surface }, tables: {} }] };
}

describe("Part B — 산출물 반영(화면정의서/아키텍처)", () => {
  it("opts 미전달 시 기존 task 수/구조 불변(회귀)", () => {
    const base = buildBlueprintProductTasks(makeDrb());
    const withEmpty = buildBlueprintProductTasks(makeDrb(), undefined, {});
    expect(withEmpty.tasks.length).toBe(base.tasks.length);
    // deliverables 총합 불변(화면/아키텍처 미주입).
    const sum = (b: typeof base) => b.tasks.reduce((n, t) => n + t.deliverables.length, 0);
    expect(sum(withEmpty)).toBe(sum(base));
  });

  it("화면정의서 → 매칭 feature FE task items에 [Figma] 마커(definitive)", () => {
    const build = buildBlueprintProductTasks(makeDrb(), undefined, {
      screenModel: screenModel("게시글 목록", "app", "커뮤니티 게시글 목록"),
      figmaAvailable: true,
      wireframeAvailable: true, // Figma가 있으면 wireframe 무시(정답 순서).
    });
    const marked = build.tasks.filter((t) => t.category === "frontend" && t.deliverables.some((d) => d.includes("게시글 목록 — [Figma]")));
    expect(marked.length).toBeGreaterThan(0);
  });

  it("Figma 없고 wireframe 있으면 [Wireframe], 둘 다 없으면 [Spec]", () => {
    const wf = buildBlueprintProductTasks(makeDrb(), undefined, {
      screenModel: screenModel("게시글 목록", "app", "커뮤니티 게시글 목록"),
      wireframeAvailable: true,
    });
    expect(wf.tasks.some((t) => t.deliverables.some((d) => d.includes("게시글 목록 — [Wireframe]")))).toBe(true);

    const spec = buildBlueprintProductTasks(makeDrb(), undefined, {
      screenModel: screenModel("게시글 목록", "app", "커뮤니티 게시글 목록"),
    });
    expect(spec.tasks.some((t) => t.deliverables.some((d) => d.includes("게시글 목록 — [Spec]")))).toBe(true);
  });

  it("아키텍처 → platform task(PB-REPO-001) description에 컨텍스트 병합", () => {
    const architecture = {
      overview: "모놀리식",
      diagram: "",
      components: [],
      techStack: [{ area: "web", choice: "Next.js" }],
      infrastructure: [{ code: "i1", name: "Neon", category: "database" as const, detail: "pg", provider: "Neon" }],
      integrations: ["Toss"],
      dataFlow: ["A→B"],
    };
    const build = buildBlueprintProductTasks(makeDrb(), undefined, { architecture });
    const repo = build.tasks.find((t) => t.key === "PB-REPO-001");
    expect(repo?.description).toContain("## 아키텍처 컨텍스트");
    expect(repo?.description).toContain("Neon");
  });
});

describe("Part B — 필수 가이드라인 0순위 주입(buildIssueDescription)", () => {
  it("guidelines 전달 시 본문 최상단에 '필수 가이드라인' 블록", () => {
    const build = buildBlueprintProductTasks(makeDrb());
    const task = build.tasks[0];
    const out = buildIssueDescription({
      blueprint: build.blueprint, intake: build.intake, task, buildId: "b",
      guidelines: { common: "공통 규칙 CMN", role: "백엔드 규칙 ROLE" },
    });
    expect(out.startsWith("## 필수 가이드라인 (우선순위 0)")).toBe(true);
    expect(out).toContain("공통 규칙 CMN");
    expect(out).toContain("백엔드 규칙 ROLE");
    // 가이드라인 블록이 기존 제목보다 앞선다.
    expect(out.indexOf("## 필수 가이드라인")).toBeLessThan(out.indexOf(`# ${task.title}`));
  });

  it("guidelines 미전달 시 기존 동작 불변(제목이 최상단)", () => {
    const build = buildBlueprintProductTasks(makeDrb());
    const task = build.tasks[0];
    const out = buildIssueDescription({ blueprint: build.blueprint, intake: build.intake, task, buildId: "b" });
    expect(out.startsWith(`# ${task.title}`)).toBe(true);
    expect(out).not.toContain("필수 가이드라인");
  });

  it("빈 문자열 섹션은 생략(공백 role → 블록 미생성)", () => {
    const build = buildBlueprintProductTasks(makeDrb());
    const task = build.tasks[0];
    const out = buildIssueDescription({
      blueprint: build.blueprint, intake: build.intake, task, buildId: "b",
      guidelines: { common: "", role: "   " },
    });
    expect(out.startsWith(`# ${task.title}`)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  buildScreenInputs,
  buildWorkflowTasks,
  buildWorkflowIssueDescription,
  workflowIssueTitle,
  type BuildPlan,
} from "../src/project-builder/contract.js";

const screenModel = {
  screens: [
    {
      basic: {
        screenCode: "SCR-001",
        screenName: "홈",
        route: "/",
        access: "public",
        permission: "공개",
        targetSurface: "site",
        layoutSlot: "home-main",
        states: "default, empty",
      },
      tables: {
        fields: [{ label: "banner" }, { label: "popularDoctors" }],
        apis: [{ apiCode: "API-001" }],
        actions: [
          {
            actionCode: "ACT-01",
            testId: "scr-001-act-01",
            trigger: "질환별 인기 명의 선택",
            handling: "명의 상세로 이동",
            api: "API-001",
            nextScreen: "SCR-005",
          },
        ],
        acceptance: [{ acCode: "AC-01", condition: "홈이 배너/인기명의/커뮤니티/건강정보 카드로 렌더된다" }],
      },
    },
    {
      basic: {
        screenCode: "SCR-019",
        screenName: "Admin 사용자 관리",
        route: "/admin/users",
        access: "admin",
        permission: "관리자",
        targetSurface: "admin",
        states: "default",
      },
      tables: {
        fields: [],
        apis: [],
        actions: [
          { actionCode: "ACT-01", testId: "scr-019-act-01", trigger: "정지", handling: "사용자 정지", api: "", nextScreen: "" },
        ],
        acceptance: [],
      },
    },
  ],
};

const wireframeBody = [
  "<!doctype html><html data-theme=\"corporate\"><body>",
  '<section id="SCR-001" data-screen="SCR-001" class="min-h-screen"><h1>홈</h1><button data-testid="scr-001-act-01">명의</button></section>',
  '<section id="SCR-019" data-screen="SCR-019" class="min-h-screen"><h1>Admin</h1></section>',
  "</body></html>",
].join("\n");

const figmaBody = [
  "## 화면 레이아웃",
  "",
  "### [Page 1] 홈 (390x844)",
  "- [frame] Hero 390x200@(0,0)",
  '- [text] "믿을 수 있는 의사"',
  "",
  "### [Page 1] 기타 (390x844)",
  "- [list] Misc",
].join("\n");

const plan: BuildPlan = {
  productName: "AIGA",
  features: [{ id: "user", title: "사용자", featureDecision: "NEW" }],
};

describe("screen-driven FE issues", () => {
  it("buildScreenInputs extracts spec + per-screen wireframe fragment", () => {
    const screens = buildScreenInputs(screenModel, wireframeBody, figmaBody);
    expect(screens).toHaveLength(2);
    expect(screens[0].code).toBe("SCR-001");
    expect(screens[0].targetSurface).toBe("site");
    expect(screens[0].actions[0].testId).toBe("scr-001-act-01");
    expect(screens[0].wireframeFragment).toContain('data-screen="SCR-001"');
    expect(screens[0].wireframeFragment).toContain("scr-001-act-01");
    expect(screens[0].wireframeFragment).not.toContain("SCR-019");
    expect(screens[0].figmaLayout).toContain("믿을 수 있는 의사");
    expect(screens[1].figmaLayout).toBe("");
  });

  it("generates one FE issue per screen, routed to the screen's target app", () => {
    const screens = buildScreenInputs(screenModel, wireframeBody, figmaBody);
    const tasks = buildWorkflowTasks(plan, screens);
    const screenTasks = tasks.filter((t) => t.workflowRole === "screen-fe");
    expect(screenTasks).toHaveLength(2);

    const home = screenTasks.find((t) => t.screen?.code === "SCR-001")!;
    expect(home.surfaces).toEqual(["site"]);
    expect(home.targetPaths).toContain("apps/site");
    expect(workflowIssueTitle(home)).toBe("[FE] SCR-001 홈");

    const admin = screenTasks.find((t) => t.screen?.code === "SCR-019")!;
    expect(admin.surfaces).toEqual(["admin"]);
    expect(admin.targetPaths).toContain("apps/admin");

    const gate = tasks.find((t) => t.workflowRole === "integration-qa")!;
    expect(gate.dependsOn).toContain("SCREEN-SCR-001");
    expect(gate.dependsOn).toContain("SCREEN-SCR-019");
  });

  it("injects the screen spec + wireframe fragment into the issue body", () => {
    const screens = buildScreenInputs(screenModel, wireframeBody, figmaBody);
    const tasks = buildWorkflowTasks(plan, screens);
    const home = tasks.find((t) => t.screen?.code === "SCR-001")!;
    const body = buildWorkflowIssueDescription({ task: home, buildId: "b1", productName: "AIGA" });
    expect(body).toContain("## 화면 명세");
    expect(body).toContain("`/`");
    expect(body).toContain("scr-001-act-01");
    expect(body).toContain("apps/site");
    expect(body).toContain("## 와이어프레임");
    expect(body).toContain('data-screen="SCR-001"');
    expect(body).toContain("## Figma 레이아웃");
    expect(body).toContain("믿을 수 있는 의사");
  });

  it("is backward compatible when no screens are provided", () => {
    const tasks = buildWorkflowTasks(plan);
    expect(tasks.filter((t) => t.workflowRole === "screen-fe")).toHaveLength(0);
  });
});

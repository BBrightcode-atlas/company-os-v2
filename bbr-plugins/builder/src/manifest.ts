import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";
import { BUILD_WATCHDOG_JOB_KEY } from "./build-watchdog.js";
import blueprintManifest from "./blueprint/manifest.js";
import wireframeManifest from "./wireframe/manifest.js";
import projectBuilderManifest from "./project-builder/manifest.js";

export const PLUGIN_ID = "paperclip-plugin-builder";
export const PLUGIN_VERSION = "0.1.0";

function unique<T>(values: readonly T[] | undefined): T[] {
  return Array.from(new Set(values ?? []));
}

type ManifestCapabilities = NonNullable<PaperclipPluginManifestV1["capabilities"]>;

const capabilities: ManifestCapabilities = unique<ManifestCapabilities[number]>([
  ...(blueprintManifest.capabilities ?? []),
  ...(wireframeManifest.capabilities ?? []),
  ...(projectBuilderManifest.capabilities ?? []),
  // build watchdog: 스톨된 순차 체인 복구용 스케줄 job + 이슈 재-wake
  "jobs.schedule",
  "issues.wakeup",
]);

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Builder",
  description:
    "Blueprint -> Wireframe -> Project Builder 순서로 프로젝트 구현 산출물과 실행 이슈를 생성하는 BBR 전용 Builder 플러그인.",
  author: "BBrightCode",
  categories: ["ui", "automation"],
  capabilities,
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
  database: wireframeManifest.database,
  agents: [
    ...(blueprintManifest.agents ?? []),
    ...(projectBuilderManifest.agents ?? []),
  ],
  projects: blueprintManifest.projects,
  skills: [
    ...(blueprintManifest.skills ?? []),
    ...(projectBuilderManifest.skills ?? []),
  ],
  routines: blueprintManifest.routines,
  jobs: [
    {
      jobKey: BUILD_WATCHDOG_JOB_KEY,
      displayName: "Build Progress Watchdog",
      description:
        "Builder 이슈 체인의 스톨을 복구한다: blocker가 모두 완료됐는데 blocked로 주차된 이슈를 todo로 되돌려 재-wake하고, ready 상태로 방치된 이슈를 넛지한다.",
      schedule: "*/5 * * * *",
    },
  ],
  tools: [
    ...(blueprintManifest.tools ?? []),
    ...(projectBuilderManifest.tools ?? []),
  ],
  ui: {
    slots: [
      {
        type: "page",
        id: "cos-blueprint-page",
        displayName: "Blueprint",
        exportName: "CosBlueprintPage",
        routePath: "cos-blueprint",
        order: 31,
      },
      {
        type: "sidebar",
        id: "cos-blueprint-sidebar",
        displayName: "Blueprint",
        exportName: "CosBlueprintSidebarItem",
        order: 31,
      },
      {
        type: "page",
        id: "wireframes-page",
        displayName: "Wireframe",
        exportName: "WireframesPage",
        routePath: "wireframes",
        order: 32,
      },
      {
        type: "sidebar",
        id: "wireframes-sidebar",
        displayName: "Wireframe",
        exportName: "WireframesSidebarItem",
        order: 32,
      },
      {
        type: "routeSidebar",
        id: "wireframes-route-sidebar",
        displayName: "Wireframe",
        exportName: "WireframesRouteSidebar",
        routePath: "wireframes",
      },
      {
        type: "page",
        id: "product-builder-page",
        displayName: "Project Builder",
        exportName: "ProductBuilderPage",
        routePath: "product-builder",
        order: 33,
      },
      {
        type: "sidebar",
        id: "product-builder-sidebar",
        displayName: "Project Builder",
        exportName: "ProductBuilderSidebarItem",
        order: 33,
      },
    ],
  },
};

export default manifest;

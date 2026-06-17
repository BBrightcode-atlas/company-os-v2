import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";
import { PAGE_ROUTE, PLUGIN_ID, PLUGIN_VERSION } from "./contract.js";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "COS Blueprint",
  description: "기획 자료를 분석해 DB/API 목차, 표준 기획서, 공통 레이아웃, 화면정의서를 생성하는 BBR 전용 플러그인.",
  author: "BBrightCode",
  categories: ["ui", "automation"],
  capabilities: [
    "companies.read",
    "projects.read",
    "project.workspaces.read",
    "plugin.state.read",
    "plugin.state.write",
    "activity.log.write",
    "ui.page.register",
    "ui.sidebar.register",
  ],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
  ui: {
    slots: [
      {
        type: "page",
        id: "cos-blueprint-page",
        displayName: "COS Blueprint",
        exportName: "CosBlueprintPage",
        routePath: PAGE_ROUTE,
        order: 36,
      },
      {
        type: "sidebar",
        id: "cos-blueprint-sidebar",
        displayName: "COS Blueprint",
        exportName: "CosBlueprintSidebarItem",
        order: 36,
      },
    ],
  },
};

export default manifest;

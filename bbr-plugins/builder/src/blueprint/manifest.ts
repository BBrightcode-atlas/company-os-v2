import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";
import {
  BLUEPRINT_PROJECT_KEY,
  PAGE_ROUTE,
  PLUGIN_ID,
  PLUGIN_VERSION,
} from "./contract.js";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "COS Blueprint",
  description: "기획 자료를 분석해 개발 요구사항 브리프, DB/API 목차, 화면정의서를 생성하는 BBR 전용 플러그인.",
  author: "BBrightCode",
  categories: ["ui", "automation"],
  capabilities: [
    "companies.read",
    "projects.read",
    "project.document-slots.read",
    "project.document-slots.write",
    "project.workspaces.read",
    "projects.managed",
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
  projects: [
    {
      projectKey: BLUEPRINT_PROJECT_KEY,
      displayName: "COS Blueprint",
      description: "Builder 매니지드 에이전트 작업을 추적하는 플러그인 관리 프로젝트.",
      status: "in_progress",
      color: "#0f766e",
    },
  ],
  ui: {
    slots: [
      {
        type: "page",
        id: "cos-blueprint-page",
        displayName: "COS Blueprint",
        exportName: "CosBlueprintPage",
        routePath: PAGE_ROUTE,
        order: 31,
      },
      {
        type: "sidebar",
        id: "cos-blueprint-sidebar",
        displayName: "Blueprint",
        exportName: "CosBlueprintSidebarItem",
        order: 31,
      },
    ],
  },
};

export default manifest;

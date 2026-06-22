import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const manifest: PaperclipPluginManifestV1 = {
  id: "paperclip-plugin-wireframe-builder",
  apiVersion: 1,
  version: "0.1.0",
  displayName: "Wireframe Builder",
  description:
    "정제된 개발 기획서·화면설계서로부터 조작 가능한 와이어프레임을 생성·반복하며 화면 워크플로우를 검증한다 (생성은 vibeproxy 직접 호출 + LLM 이 HTML 직접 생성)",
  author: "BBrightCode",
  categories: ["ui"],
  capabilities: [
    "database.namespace.migrate",
    "database.namespace.read",
    "database.namespace.write",
    "projects.read",
    "project.document-slots.read",
    "project.document-slots.write",
    "http.outbound",
    "ui.page.register",
    "ui.sidebar.register",
    "events.subscribe",
    "plugin.state.read",
    "plugin.state.write",
  ],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
  database: {
    namespaceSlug: "wireframes",
    migrationsDir: "migrations",
    coreReadTables: ["companies"],
  },
  ui: {
    slots: [
      {
        type: "page",
        id: "wireframes-page",
        displayName: "Wireframe",
        exportName: "WireframesPage",
        routePath: "wireframes",
        order: 35,
      },
      {
        type: "sidebar",
        id: "wireframes-sidebar",
        displayName: "Wireframe",
        exportName: "WireframesSidebarItem",
        order: 35,
      },
      {
        type: "routeSidebar",
        id: "wireframes-route-sidebar",
        displayName: "Wireframe",
        exportName: "WireframesRouteSidebar",
        routePath: "wireframes",
      },
    ],
  },
};

export default manifest;

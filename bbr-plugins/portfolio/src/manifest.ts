import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";
import { PAGE_ROUTE, PLUGIN_ID, PLUGIN_VERSION } from "./contract.js";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Portfolio",
  description: "A project portfolio view that compares project progress, schedule state, and active assignees.",
  author: "BBrightCode",
  categories: ["ui"],
  capabilities: [
    "companies.read",
    "projects.read",
    "issues.read",
    "agents.read",
    "ui.page.register"
  ],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
  ui: {
    slots: [
      {
        type: "page",
        id: "portfolio-page",
        displayName: "Portfolio",
        exportName: "PortfolioPage",
        routePath: PAGE_ROUTE,
        order: 5,
      },
    ],
  },
};

export default manifest;

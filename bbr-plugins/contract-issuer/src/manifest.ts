import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const manifest: PaperclipPluginManifestV1 = {
  id: "paperclip-plugin-contract-issuer",
  apiVersion: 1,
  version: "0.1.0",
  displayName: "계약서 발행",
  description:
    "표준 도급계약서 양식 기반 계약서 생성·발행. 갑(고객) 정보·과업·기간·금액 입력 → AI 가 빈칸을 채워 계약서 HTML 생성, 댓글로 보완.",
  author: "BBrightCode",
  categories: ["ui"],
  capabilities: [
    "database.namespace.migrate",
    "database.namespace.read",
    "database.namespace.write",
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
    namespaceSlug: "contracts",
    migrationsDir: "migrations",
    coreReadTables: ["companies", "issues", "projects", "agents"],
  },
  ui: {
    slots: [
      {
        type: "page",
        id: "contracts-page",
        displayName: "계약",
        exportName: "ContractsPage",
        routePath: "contracts",
        order: 31,
      },
      {
        type: "sidebar",
        id: "contracts-sidebar",
        displayName: "계약",
        exportName: "ContractsSidebarItem",
        order: 31,
      },
    ],
  },
  // 을(공급자=비브라이트코드) 정보. 운영자가 회사별로 덮어쓸 수 있음.
  instanceConfigSchema: {
    type: "object",
    properties: {
      eulCompanyName: { type: "string", title: "을 회사명", default: "(주)비브라이트코드" },
      eulCeo: { type: "string", title: "을 대표", default: "김대환" },
      eulBizNo: { type: "string", title: "을 사업자등록번호", default: "111-87-03249" },
      eulAddress: {
        type: "string",
        title: "을 주소",
        default: "경기 김포시 김포한강8로 386 센트럴프라자2차 901호 오피스맨",
      },
    },
  },
};

export default manifest;

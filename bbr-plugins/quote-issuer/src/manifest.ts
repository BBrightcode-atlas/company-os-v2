import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";
import { ANALYZER_INSTRUCTIONS } from "./agent/analyzer-instructions.js";

const manifest: PaperclipPluginManifestV1 = {
  id: "paperclip-plugin-quote-issuer",
  apiVersion: 1,
  version: "0.2.0",
  displayName: "견적서 발행",
  description:
    "고객 입력 기반 리스크 분석·경쟁력 가격 산출·엑셀급 HTML 견적서 발행 (분석은 managed Claude 에이전트 위임)",
  author: "BBrightCode",
  categories: ["ui"],
  capabilities: [
    "database.namespace.migrate",
    "database.namespace.read",
    "database.namespace.write",
    "agents.managed",
    "agents.read",
    "agent.sessions.create",
    "agent.sessions.list",
    "agent.sessions.send",
    "agent.sessions.close",
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
    namespaceSlug: "quotes",
    migrationsDir: "migrations",
    coreReadTables: ["companies", "issues", "projects", "agents"],
  },
  agents: [
    {
      agentKey: "quote-analyzer",
      displayName: "견적 분석가",
      role: "general",
      title: "Quote Analyzer",
      adapterType: "claude_local",
      adapterPreference: ["claude_local", "codex_local"],
      status: "idle",
      instructions: { content: ANALYZER_INSTRUCTIONS },
    },
  ],
  ui: {
    slots: [
      {
        type: "page",
        id: "quotes-page",
        displayName: "견적",
        exportName: "QuotesPage",
        routePath: "quotes",
        order: 30,
      },
      // 사이드바 nav 항목. host Work 섹션 안에 inline 마운트되어 네이티브 메뉴와
      // 동일 클래스/아이콘/active 로 렌더(launcher 는 아이콘·active 미지원이라 slot 사용).
      {
        type: "sidebar",
        id: "quotes-sidebar",
        displayName: "견적",
        exportName: "QuotesSidebarItem",
        order: 30,
      },
    ],
  },
  // 공급자 정보(견적서 하단). 운영자가 회사별로 덮어쓸 수 있음.
  instanceConfigSchema: {
    type: "object",
    properties: {
      supplierCompanyName: { type: "string", title: "공급자 회사명", default: "(주)비브라이트코드" },
      supplierCeo: { type: "string", title: "대표", default: "김대환" },
      supplierBizNo: { type: "string", title: "사업자번호", default: "111-87-03249" },
      supplierAddress: {
        type: "string",
        title: "주소",
        default: "서울 마포구 마포대로 12 한신오피스텔 805호",
      },
      supplierPhone: { type: "string", title: "연락처", default: "010-6622-5361" },
      supplierBizType: { type: "string", title: "업태", default: "정보통신업" },
      supplierBizItem: {
        type: "string",
        title: "종목",
        default: "응용소프트웨어개발및 공급업",
      },
    },
  },
};

export default manifest;

import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";
import { DEFAULT_SCHEMA_MD } from "./agent/instructions.js";

const manifest: PaperclipPluginManifestV1 = {
  id: "paperclip-plugin-knowledge-base",
  apiVersion: 1,
  version: "0.1.0",
  displayName: "지식베이스",
  description:
    "LLM 이 유지하는 영속 위키. 소스를 넣으면 AI 가 읽고 기존 위키에 통합(엔티티/개념 페이지·[[링크]]·모순 플래그). Obsidian 식 백링크·그래프뷰. 사용자도 마크다운으로 편집, 플랫폼 에이전트도 도구로 읽고 쓴다.",
  author: "BBrightCode",
  categories: ["ui"],
  capabilities: [
    "database.namespace.migrate",
    "database.namespace.read",
    "database.namespace.write",
    "http.outbound",
    "agent.tools.register",
    "skills.managed",
    "ui.page.register",
    "ui.sidebar.register",
    "plugin.state.read",
    "plugin.state.write",
  ],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
  database: {
    namespaceSlug: "wiki",
    migrationsDir: "migrations",
    coreReadTables: ["companies", "issues", "projects", "agents"],
  },
  ui: {
    slots: [
      {
        type: "page",
        id: "wiki-page",
        displayName: "지식베이스",
        exportName: "WikiPage",
        routePath: "wiki",
        order: 33,
      },
      {
        type: "sidebar",
        id: "wiki-sidebar",
        displayName: "지식베이스",
        exportName: "WikiSidebarItem",
        order: 33,
      },
    ],
  },
  // 플랫폼 코딩 에이전트가 위키를 읽고 쓰는 도구. 런타임에 plugin id 로 네임스페이스됨(wiki:*).
  tools: [
    {
      name: "searchPages",
      displayName: "Wiki: search",
      description: "지식베이스 위키 페이지를 제목/태그/본문으로 검색한다. 답을 알거나 글을 쓰기 전 먼저 위키를 확인하라.",
      parametersSchema: {
        type: "object",
        properties: { query: { type: "string", description: "검색어" }, limit: { type: "number" } },
        required: ["query"],
      },
    },
    {
      name: "readPage",
      displayName: "Wiki: read page",
      description: "slug 로 위키 페이지 본문(markdown)을 읽는다.",
      parametersSchema: {
        type: "object",
        properties: { slug: { type: "string" } },
        required: ["slug"],
      },
    },
    {
      name: "listPages",
      displayName: "Wiki: list pages",
      description: "위키 페이지 목록(slug/title/kind)을 가져온다.",
      parametersSchema: {
        type: "object",
        properties: { kind: { type: "string" } },
      },
    },
    {
      name: "upsertPage",
      displayName: "Wiki: upsert page",
      description: "위키 페이지를 생성하거나 갱신한다. 작업 중 알게 된 사실을 위키에 누적하라. 본문에서 다른 페이지는 [[slug]]로 링크.",
      parametersSchema: {
        type: "object",
        properties: {
          slug: { type: "string" },
          title: { type: "string" },
          body: { type: "string", description: "markdown 본문([[링크]] 포함)" },
          kind: { type: "string", enum: ["note", "entity", "concept", "overview", "synthesis", "moc"] },
        },
        required: ["title", "body"],
      },
    },
    {
      name: "addSource",
      displayName: "Wiki: add source",
      description: "raw 소스(원문)를 지식베이스에 추가한다. 이후 사람이 ingest 하면 위키로 통합된다.",
      parametersSchema: {
        type: "object",
        properties: { title: { type: "string" }, rawMd: { type: "string" }, url: { type: "string" } },
        required: ["title", "rawMd"],
      },
    },
  ],
  // karpathy "schema" 계층: 위키 유지 규칙을 코딩 에이전트가 읽는 스킬로 제공.
  skills: [
    {
      skillKey: "maintainer",
      displayName: "지식베이스 유지 규칙",
      description: "이 회사 지식베이스(위키) 관리 규칙과 wiki:* 도구 사용법.",
      markdown: DEFAULT_SCHEMA_MD,
    },
  ],
};

export default manifest;

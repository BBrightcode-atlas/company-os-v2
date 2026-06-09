import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const manifest: PaperclipPluginManifestV1 = {
  id: "flotter.agent-chat",
  apiVersion: 1,
  version: "0.1.0",
  displayName: "Agent Chat",
  description: "1:1 DM chat with company agents (live streaming, plugin-DB history).",
  author: "Flotter",
  categories: ["automation"],
  capabilities: [
    "agents.read",
    // grounding reads — the agent answers about REAL project/issue/code state
    "companies.read",
    "projects.read",
    "project.workspaces.read",
    "execution.workspaces.read",
    "issues.read",
    "issue.subtree.read",
    "issue.comments.read",
    "issues.orchestration.read",
    "goals.read",
    // writes — conversation → backlog (always behind a human confirm gate)
    "issues.create",
    "issue.relations.write",
    "goals.create",
    "activity.log.write",
    // plugin DB + UI
    "database.namespace.migrate",
    "database.namespace.read",
    "database.namespace.write",
    "ui.sidebar.register",
    "ui.page.register",
  ],
  database: { migrationsDir: "migrations", coreReadTables: ["heartbeat_runs"] },
  entrypoints: { worker: "./dist/worker.js", ui: "./dist/ui" },
  ui: {
    slots: [
      // CHAT section (heading + agent DM list) rendered INSIDE the host sidebar,
      // alongside the normal Paperclip nav — Slack-style DM list. Not routeSidebar,
      // which would replace the whole sidebar and hide global nav.
      { type: "sidebar", id: "chat-dms", displayName: "Chat", exportName: "ChatSidebar" },
      // The 1:1 thread view (main content area).
      { type: "page", id: "chat-page", displayName: "Chat", exportName: "ChatPage", routePath: "chat" },
      // The multi-agent room view (roadmap / standup / brainstorm).
      { type: "page", id: "chat-room", displayName: "Room", exportName: "RoomPage", routePath: "room" },
    ],
  },
};

export default manifest;

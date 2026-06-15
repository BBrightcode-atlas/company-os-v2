// @vitest-environment jsdom

import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PortfolioPage } from "../src/ui/index.js";

const mockNavigate = vi.hoisted(() => vi.fn());
const pageContext = {
  companyId: "company-1",
  companyPrefix: "POR",
  projectId: null,
  entityId: null,
  entityType: null,
  userId: null,
};

vi.mock("@paperclipai/plugin-sdk/ui", () => ({
  useHostContext: () => ({
    companyId: "company-1",
    companyPrefix: "POR",
  }),
  useHostNavigation: () => ({
    navigate: mockNavigate,
    linkProps: (href: string) => ({ href }),
  }),
}));

async function flushReact() {
  for (let index = 0; index < 5; index += 1) {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }
}

describe("PortfolioPage", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const path = String(input);
      if (path === "/api/companies/company-1/projects") {
        return Response.json([
          {
            id: "project-1",
            urlKey: "mission-control",
            name: "Mission Control",
            status: "in_progress",
            targetDate: null,
            updatedAt: "2026-06-15T00:00:00Z",
            archivedAt: null,
          },
        ]);
      }
      if (path === "/api/companies/company-1/issues?limit=5000") {
        return Response.json([
          {
            id: "issue-1",
            projectId: "project-1",
            parentId: null,
            identifier: "POR-1",
            title: "Plan launch",
            status: "todo",
            assigneeAgentId: null,
            updatedAt: "2026-06-15T00:00:00Z",
          },
        ]);
      }
      if (path === "/api/companies/company-1/agents") {
        return Response.json([]);
      }
      return new Response("Not found", { status: 404 });
    });
  });

  afterEach(() => {
    root.unmount();
    container.remove();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    mockNavigate.mockClear();
  });

  it("uses English empty-state copy when an expanded project has no active work", async () => {
    root.render(<PortfolioPage context={pageContext} />);
    await flushReact();

    container.querySelector<HTMLButtonElement>('button[aria-label="Expand Mission Control"]')?.click();
    await flushReact();

    expect(container.textContent).toContain("No issues currently in progress.");
    expect(container.textContent).not.toContain("현재 작업 중인 이슈 없음");
  });
});

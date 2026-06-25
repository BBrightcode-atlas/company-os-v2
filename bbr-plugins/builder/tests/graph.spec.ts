import { describe, expect, it } from "vitest";
import { buildGraphFromState, emptyState, extractIntakeLinks, type CosBlueprintState, type SourceMaterial } from "../src/blueprint/contract.js";

function src(partial: Partial<SourceMaterial> & { id: string }): SourceMaterial {
  return { type: "external-plan", body: "", createdAt: "2026-01-01T00:00:00.000Z", title: partial.id, ...partial };
}

describe("buildGraphFromState", () => {
  it("empty state → no nodes/edges", () => {
    const g = buildGraphFromState(emptyState());
    expect(g.nodes).toEqual([]);
    expect(g.edges).toEqual([]);
  });

  it("dedups same material (same fileName) registered under different types into one node", () => {
    const state: CosBlueprintState = {
      ...emptyState(),
      sources: [
        src({ id: "a1", type: "external-plan", fileName: "기획서.pdf", title: "기획서" }),
        src({ id: "a2", type: "internal-plan", fileName: "기획서.pdf", title: "기획서(내부)" }),
        src({ id: "b1", type: "external-plan", url: "https://notion.so/x", title: "노션" }),
      ],
    };
    const g = buildGraphFromState(state);
    const sourceNodes = g.nodes.filter((n) => n.kind === "source");
    expect(sourceNodes).toHaveLength(2); // 기획서.pdf 1 + 노션 1 (a2 deduped into a1)
    expect(sourceNodes.map((n) => n.id).sort()).toEqual(["a1", "b1"]);
  });

  it("sources become source nodes with id = source.id", () => {
    const state: CosBlueprintState = { ...emptyState(), sources: [src({ id: "s1", title: "기획서", format: "md" })] };
    const g = buildGraphFromState(state);
    const n = g.nodes.find((x) => x.id === "s1");
    expect(n).toBeTruthy();
    expect(n!.kind).toBe("source");
    expect(n!.managedBy).toBe("graph");
    expect(n!.bodyRef).toEqual({ kind: "source", sourceId: "s1" });
  });

  it("source.links external → links-to edge between two registered sources matched by url", () => {
    const state: CosBlueprintState = {
      ...emptyState(),
      sources: [
        src({ id: "s1", url: "https://a.com", links: { external: ["https://b.com"] } }),
        src({ id: "s2", url: "https://b.com" }),
      ],
    };
    const g = buildGraphFromState(state);
    expect(g.edges).toContainEqual(expect.objectContaining({ from: "s1", to: "s2", type: "links-to", origin: "stored" }));
  });

  it("screen.apis / screen.schemas → references edges; deliverable nodes are project_documents refs", () => {
    const state: CosBlueprintState = {
      ...emptyState(),
      standardPlan: {
        projectTitle: "P", overview: "", goals: [], scope: { inScope: [], outScope: [] },
        functionalRequirements: [], nonFunctionalRequirements: [],
        schemas: [{ code: "SCH-1", name: "User", description: "", fields: [] }],
        apis: [{ code: "API-1", method: "GET", path: "/u", summary: "", input: [], output: [], schemas: ["SCH-1"] }],
        layouts: [], generatedAt: "2026-01-01T00:00:00.000Z", confirmedAt: null,
      } as unknown as CosBlueprintState["standardPlan"],
      screenPlan: {
        screens: [{ code: "SCR-1", name: "로그인", description: "", layoutCode: "L1", layoutSlot: "main", route: "/login", access: "public", primaryTestId: "t", schemas: ["SCH-1"], apis: ["API-1"] }],
        generatedAt: "2026-01-01T00:00:00.000Z", confirmedAt: null,
      } as unknown as CosBlueprintState["screenPlan"],
    };
    const g = buildGraphFromState(state);
    expect(g.nodes.find((n) => n.id === "SCR-1")?.managedBy).toBe("project_documents");
    expect(g.edges).toContainEqual(expect.objectContaining({ from: "SCR-1", to: "API-1", type: "references" }));
    expect(g.edges).toContainEqual(expect.objectContaining({ from: "SCR-1", to: "SCH-1", type: "references" }));
    expect(g.edges).toContainEqual(expect.objectContaining({ from: "API-1", to: "SCH-1", type: "references" }));
  });
});

describe("extractIntakeLinks", () => {
  it("maps notion metadata link arrays to SourceMaterial.links", () => {
    const links = extractIntakeLinks({
      externalLinks: ["https://b.com"],
      figmaLinks: ["https://figma.com/x"],
      pageIds: ["pid-1"],
      pageUrls: ["https://n.so/p"],
      pageCount: 3, // non-link noise ignored
    });
    expect(links).toEqual({
      external: ["https://b.com"],
      figma: ["https://figma.com/x"],
      notionPageIds: ["pid-1"],
      notionPageUrls: ["https://n.so/p"],
    });
  });

  it("returns undefined when no link arrays present", () => {
    expect(extractIntakeLinks({ pageCount: 1 })).toBeUndefined();
    expect(extractIntakeLinks(undefined)).toBeUndefined();
    expect(extractIntakeLinks({ externalLinks: [] })).toBeUndefined();
  });
});

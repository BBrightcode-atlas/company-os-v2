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

  it("generated deliverable slots → analyzed doc nodes + flows-to pipeline edges", () => {
    const state: CosBlueprintState = { ...emptyState(), sources: [src({ id: "s1", fileName: "기획서.pdf", title: "기획서" })] };
    const slots = [
      { slotKey: "deliverable.requirement_inventory", slotGroup: "deliverable", status: "ready", document: { body: "정리본 본문" } },
      { slotKey: "deliverable.prd", slotGroup: "deliverable", status: "ready" },
      { slotKey: "deliverable.schema_definition", slotGroup: "deliverable", status: "approved" },
      { slotKey: "deliverable.screen_definitions", slotGroup: "deliverable", status: "empty" }, // 미생성 → 노드 없음
      { slotKey: "deliverable.build_plan", slotGroup: "deliverable", status: "ready" }, // 그래프 표시 대상 아님 → 노드 없음
    ];
    const g = buildGraphFromState(state, slots);
    const ids = g.nodes.map((n) => n.id);
    expect(ids).not.toContain("deliverable.requirement_inventory"); // 자료정리본은 노드로 두지 않음(등록자료가 대표)
    expect(ids).toContain("deliverable.prd");
    expect(ids).toContain("deliverable.schema_definition");
    expect(ids).not.toContain("deliverable.screen_definitions"); // empty
    expect(ids).not.toContain("deliverable.build_plan"); // not graphed
    expect(g.nodes.find((n) => n.id === "deliverable.prd")?.managedBy).toBe("project_documents");
    // flows: 자료 → PRD → 스키마 (자료정리본 노드 없이 자료가 PRD로 직결)
    expect(g.edges).toContainEqual(expect.objectContaining({ from: "s1", to: "deliverable.prd", type: "flows-to" }));
    expect(g.edges).toContainEqual(expect.objectContaining({ from: "deliverable.prd", to: "deliverable.schema_definition", type: "flows-to" }));
    expect(g.edges.some((e) => e.to === "deliverable.requirement_inventory" || e.from === "deliverable.requirement_inventory")).toBe(false);
  });

  it("no slots → only source nodes (분석 산출물은 slot이 있어야 등장)", () => {
    const state: CosBlueprintState = { ...emptyState(), sources: [src({ id: "s1" })] };
    const g = buildGraphFromState(state);
    expect(g.nodes.length).toBeGreaterThan(0);
    expect(g.nodes.every((n) => n.kind === "source")).toBe(true);
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

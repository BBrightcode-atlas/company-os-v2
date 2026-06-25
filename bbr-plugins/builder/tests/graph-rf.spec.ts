import { describe, expect, it } from "vitest";
import { toRfElements } from "../src/blueprint/ui/graph-rf.js";
import type { BlueprintGraph } from "../src/blueprint/contract.js";

const graph: BlueprintGraph = {
  nodes: [
    {
      id: "s1",
      kind: "source",
      subtype: "external-plan",
      title: "기획서",
      format: "md",
      bodyRef: { kind: "source", sourceId: "s1" },
      managedBy: "graph",
      status: "ready",
    },
    {
      id: "SCR-1",
      kind: "deliverable",
      subtype: "screen",
      title: "로그인",
      format: "md",
      bodyRef: { kind: "slot", slotKey: "deliverable.screen_definitions" },
      managedBy: "project_documents",
      status: "ready",
    },
  ],
  edges: [{ id: "e1", from: "SCR-1", to: "s1", type: "derives-from", origin: "derived" }],
};

describe("toRfElements", () => {
  it("maps nodes/edges and assigns numeric positions via dagre", () => {
    const { rfNodes, rfEdges } = toRfElements(graph);
    expect(rfNodes).toHaveLength(2);
    const n = rfNodes.find((x) => x.id === "s1")!;
    expect(typeof n.position.x).toBe("number");
    expect(typeof n.position.y).toBe("number");
    expect(n.type).toBe("blueprint");
    expect(n.data.kind).toBe("source");
    expect(rfEdges).toHaveLength(1);
    expect(rfEdges[0]).toMatchObject({ source: "SCR-1", target: "s1" });
  });
});

import dagre from "@dagrejs/dagre";
import { MarkerType, type Edge as RFEdge, type Node as RFNode } from "@xyflow/react";
import reactFlowStyles from "@xyflow/react/dist/style.css";
import type { BlueprintGraph, GraphEdgeType, GraphNodeKind } from "../contract.js";

export type BlueprintNodeData = { label: string; kind: GraphNodeKind; subtype: string };

const NODE_W = 220;
const NODE_H = 56;

const EDGE_COLOR: Record<GraphEdgeType, string> = {
  "links-to": "#64748b",
  "child-of": "#64748b",
  "derives-from": "#2563eb",
  references: "#0d9488",
  "flows-to": "#2563eb",
  manual: "#a855f7",
};

export function toRfElements(graph: BlueprintGraph): {
  rfNodes: RFNode<BlueprintNodeData>[];
  rfEdges: RFEdge[];
} {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 24, ranksep: 80, marginx: 16, marginy: 16 });

  for (const n of graph.nodes) {
    g.setNode(n.id, { width: NODE_W, height: NODE_H });
  }
  for (const e of graph.edges) {
    g.setEdge(e.from, e.to);
  }
  dagre.layout(g);

  const rfNodes: RFNode<BlueprintNodeData>[] = graph.nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      id: n.id,
      type: "blueprint",
      position: { x: (pos?.x ?? 0) - NODE_W / 2, y: (pos?.y ?? 0) - NODE_H / 2 },
      data: { label: n.title, kind: n.kind, subtype: n.subtype },
    };
  });

  const rfEdges: RFEdge[] = graph.edges.map((e) => ({
    id: e.id,
    source: e.from,
    target: e.to,
    style: { stroke: EDGE_COLOR[e.type] },
    markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR[e.type] },
  }));

  return { rfNodes, rfEdges };
}

let stylesInjected = false;

export function ensureBlueprintRfStyles(): void {
  if (stylesInjected || typeof document === "undefined") return;
  if (document.querySelector("style[data-rf-styles]")) {
    stylesInjected = true;
    return;
  }
  // 정적 import(esbuild .css → text 로더)로 RF 기본 스타일을 주입한다.
  // (동적 import는 배포 번들에서 해결되지 않아 엣지가 렌더되지 않음 — wireframe 패턴과 동일하게 정적으로.)
  const tag = document.createElement("style");
  tag.setAttribute("data-rf-styles", "true");
  tag.textContent = reactFlowStyles;
  document.head.appendChild(tag);
  stylesInjected = true;
}

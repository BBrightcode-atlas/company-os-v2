import { useEffect, useMemo } from "react";
import {
  Background,
  ConnectionLineType,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type { BlueprintGraph } from "../contract.js";
import {
  ensureBlueprintRfStyles,
  toRfElements,
  type BlueprintNodeData,
} from "./graph-rf.js";

function BlueprintNode({ data }: NodeProps<Node<BlueprintNodeData>>) {
  const isSource = data.kind === "source";
  return (
    <div
      style={{
        width: 220,
        minHeight: 56,
        borderRadius: 8,
        padding: "8px 12px",
        border: `1px solid ${isSource ? "#cbd5e1" : "#99f6e4"}`,
        background: isSource ? "#f8fafc" : "#f0fdfa",
        fontSize: 12,
      }}
      data-testid={`graph-node-${data.kind}`}
    >
      <div style={{ fontSize: 10, color: "#64748b" }}>
        {isSource ? "자료" : "산출물"} · {data.subtype}
      </div>
      <div style={{ fontWeight: 600, marginTop: 2 }}>{data.label}</div>
    </div>
  );
}

const nodeTypes = { blueprint: BlueprintNode };

export function BlueprintGraphView(props: {
  graph: BlueprintGraph;
  onSourceClick: (sourceId: string) => void;
  onDeliverableClick: (slotKey: string) => void;
}) {
  useEffect(() => {
    ensureBlueprintRfStyles();
  }, []);

  const { rfNodes, rfEdges } = useMemo(() => toRfElements(props.graph), [props.graph]);
  const [nodes, , onNodesChange] = useNodesState(rfNodes);
  const [edges, , onEdgesChange] = useEdgesState(rfEdges);

  const byId = useMemo(
    () => new Map(props.graph.nodes.map((n) => [n.id, n])),
    [props.graph],
  );

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable
        nodesConnectable={false}
        onNodeClick={(_, node) => {
          const meta = byId.get(node.id);
          if (!meta) return;
          if (meta.bodyRef.kind === "source") {
            props.onSourceClick(meta.bodyRef.sourceId);
          } else {
            props.onDeliverableClick(meta.bodyRef.slotKey);
          }
        }}
        attributionPosition="bottom-right"
        style={{ width: "100%", height: "100%" }}
      >
        <Background />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable position="top-right" />
      </ReactFlow>
    </div>
  );
}

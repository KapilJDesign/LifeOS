import type { Node, Edge } from "@xyflow/react";
import type { GraphData, GraphNodeKind } from "./graph-builder";

export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  kind: GraphNodeKind;
  refId: string;
  weight: number;
  topicIds: string[];
  platform?: string;
}

export type FlowNode = Node<FlowNodeData, GraphNodeKind>;

/** Converts headless graph data to React Flow nodes/edges. Node `type` equals the node kind, so screens register one custom node per kind. */
export function toReactFlow(graph: GraphData): { nodes: FlowNode[]; edges: Edge[] } {
  return {
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      type: node.kind,
      position: node.position,
      data: {
        label: node.label,
        kind: node.kind,
        refId: node.refId,
        weight: node.weight,
        topicIds: node.topicIds,
        platform: node.platform,
      },
    })),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      data: { kind: edge.kind, relationship: edge.relationship },
    })),
  };
}

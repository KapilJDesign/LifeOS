import type {
  KnowledgeConcept,
  KnowledgeItem,
  KnowledgeRelationship,
  PlatformKey,
  RelationshipType,
  SourceType,
  TopicCollection,
} from "../../types/knowledge";
import { findLexiconEntry } from "../ai/lexicon";
import { defaultIdGenerator, type IdGenerator } from "../ids";
import { createConceptIndex, resolveConcept } from "./concepts";

export type GraphNodeKind = "concept" | "item" | "journal" | "topic";
export type GraphEdgeKind = "mentions" | "relationship" | "topic";

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  label: string;
  /** Id of the underlying item, concept or topic. */
  refId: string;
  /** Number of connections; screens can scale node size with it. */
  weight: number;
  topicIds: string[];
  sourceType?: SourceType;
  platform?: PlatformKey;
  position: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: GraphEdgeKind;
  relationship?: RelationshipType;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface KnowledgeState {
  items: readonly KnowledgeItem[];
  concepts: readonly KnowledgeConcept[];
  relationships: readonly KnowledgeRelationship[];
  topics: readonly TopicCollection[];
}

export interface GraphOptions {
  /** Include saved items and journal entries as nodes. Default true. */
  includeItems?: boolean;
  /** Include topic hub nodes. Default true. */
  includeTopics?: boolean;
  /** Restrict the graph to one topic collection: its concepts, linked items and the topic node. */
  topicId?: string;
  /** Include items that have not finished processing. Default false. */
  includeUnprocessed?: boolean;
  layout?: boolean;
  width?: number;
  height?: number;
}

export const graphNodeId = {
  concept: (id: string) => `concept:${id}`,
  item: (id: string) => `item:${id}`,
  topic: (id: string) => `topic:${id}`,
};

function endpointNodeId(kind: "item" | "concept", id: string): string {
  return kind === "item" ? graphNodeId.item(id) : graphNodeId.concept(id);
}

export function buildGraph(state: KnowledgeState, options: GraphOptions = {}): GraphData {
  const includeItems = options.includeItems ?? true;
  const includeTopics = options.includeTopics ?? true;
  const topicFilter = options.topicId ? state.topics.find((topic) => topic.id === options.topicId) : undefined;
  const allowedConcepts = topicFilter ? new Set(topicFilter.conceptIds) : undefined;

  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();
  const topicsByConcept = new Map<string, string[]>();
  for (const topic of state.topics) {
    for (const conceptId of topic.conceptIds) {
      topicsByConcept.set(conceptId, [...(topicsByConcept.get(conceptId) ?? []), topic.id]);
    }
  }

  const addEdge = (edge: Omit<GraphEdge, "id">) => {
    if (!nodes.has(edge.source) || !nodes.has(edge.target) || edge.source === edge.target) return;
    const [a, b] = [edge.source, edge.target].sort();
    const id = `${edge.kind}:${a}|${b}${edge.relationship ? `:${edge.relationship}` : ""}`;
    if (!edges.has(id)) edges.set(id, { ...edge, id });
  };

  for (const concept of state.concepts) {
    if (allowedConcepts && !allowedConcepts.has(concept.id)) continue;
    nodes.set(graphNodeId.concept(concept.id), {
      id: graphNodeId.concept(concept.id),
      kind: "concept",
      label: concept.name,
      refId: concept.id,
      weight: 0,
      topicIds: topicsByConcept.get(concept.id) ?? [],
      position: { x: 0, y: 0 },
    });
  }

  if (includeItems) {
    for (const item of state.items) {
      if (!options.includeUnprocessed && (item.status === "pending" || item.status === "processing")) continue;
      const linked = item.concepts.filter((id) => nodes.has(graphNodeId.concept(id)));
      if (allowedConcepts && linked.length === 0) continue;
      const topicIds = [...new Set(linked.flatMap((id) => topicsByConcept.get(id) ?? []))];
      nodes.set(graphNodeId.item(item.id), {
        id: graphNodeId.item(item.id),
        kind: item.sourceType === "journal" ? "journal" : "item",
        label: item.title,
        refId: item.id,
        weight: 0,
        topicIds,
        sourceType: item.sourceType,
        platform: item.platform,
        position: { x: 0, y: 0 },
      });
      for (const conceptId of linked) {
        addEdge({ source: graphNodeId.item(item.id), target: graphNodeId.concept(conceptId), kind: "mentions" });
      }
    }
  }

  if (includeTopics) {
    for (const topic of state.topics) {
      if (topicFilter && topic.id !== topicFilter.id) continue;
      const members = topic.conceptIds.filter((id) => nodes.has(graphNodeId.concept(id)));
      if (members.length === 0) continue;
      nodes.set(graphNodeId.topic(topic.id), {
        id: graphNodeId.topic(topic.id),
        kind: "topic",
        label: topic.name,
        refId: topic.id,
        weight: 0,
        topicIds: [topic.id],
        position: { x: 0, y: 0 },
      });
      for (const conceptId of members) {
        addEdge({ source: graphNodeId.topic(topic.id), target: graphNodeId.concept(conceptId), kind: "topic" });
      }
    }
  }

  for (const relation of state.relationships) {
    addEdge({
      source: endpointNodeId(relation.sourceKind, relation.sourceId),
      target: endpointNodeId(relation.targetKind, relation.targetId),
      kind: "relationship",
      relationship: relation.relationship,
    });
  }

  const edgeList = [...edges.values()];
  const degree = new Map<string, number>();
  for (const edge of edgeList) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }
  let nodeList = [...nodes.values()].map((node) => ({ ...node, weight: degree.get(node.id) ?? 0 }));

  if (options.layout !== false) {
    nodeList = layoutGraph(nodeList, edgeList, { width: options.width, height: options.height });
  }
  return { nodes: nodeList, edges: edgeList };
}

export interface LayoutOptions {
  width?: number;
  height?: number;
  iterations?: number;
}

/** Deterministic seeded start (topics inside, concepts middle, items outside) followed by a force-directed relaxation. */
export function layoutGraph(nodes: GraphNode[], edges: GraphEdge[], options: LayoutOptions = {}): GraphNode[] {
  if (nodes.length === 0) return nodes;
  const count = nodes.length;
  const width = options.width ?? Math.max(900, Math.sqrt(count) * 260);
  const height = options.height ?? Math.max(640, Math.sqrt(count) * 200);
  const iterations = options.iterations ?? 300;
  const ordered = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const ringScale: Record<GraphNodeKind, number> = { topic: 0.25, concept: 0.55, item: 0.95, journal: 0.95 };

  const position = new Map<string, { x: number; y: number }>();
  const perKindIndex = new Map<GraphNodeKind, number>();
  const perKindTotal = new Map<GraphNodeKind, number>();
  for (const node of ordered) perKindTotal.set(node.kind, (perKindTotal.get(node.kind) ?? 0) + 1);
  for (const node of ordered) {
    const index = perKindIndex.get(node.kind) ?? 0;
    perKindIndex.set(node.kind, index + 1);
    const total = perKindTotal.get(node.kind) ?? 1;
    const angle = (index / total) * Math.PI * 2 + (node.kind === "item" || node.kind === "journal" ? 0.4 : 0);
    position.set(node.id, {
      x: width / 2 + Math.cos(angle) * ringScale[node.kind] * (width / 2),
      y: height / 2 + Math.sin(angle) * ringScale[node.kind] * (height / 2),
    });
  }

  const area = width * height;
  const k = Math.sqrt(area / count) * 0.8;
  let temperature = Math.min(width, height) / 8;
  const cooling = temperature / (iterations + 1);

  for (let step = 0; step < iterations; step += 1) {
    const displacement = new Map<string, { x: number; y: number }>();
    for (const node of ordered) displacement.set(node.id, { x: 0, y: 0 });

    for (let i = 0; i < ordered.length; i += 1) {
      for (let j = i + 1; j < ordered.length; j += 1) {
        const a = position.get(ordered[i].id)!;
        const b = position.get(ordered[j].id)!;
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let distance = Math.hypot(dx, dy);
        if (distance < 0.01) {
          dx = (i - j) * 0.1;
          dy = 0.1;
          distance = Math.hypot(dx, dy);
        }
        const force = (k * k) / distance;
        const da = displacement.get(ordered[i].id)!;
        const db = displacement.get(ordered[j].id)!;
        da.x += (dx / distance) * force;
        da.y += (dy / distance) * force;
        db.x -= (dx / distance) * force;
        db.y -= (dy / distance) * force;
      }
    }

    for (const edge of edges) {
      const a = position.get(edge.source);
      const b = position.get(edge.target);
      if (!a || !b) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const distance = Math.max(Math.hypot(dx, dy), 0.01);
      const force = (distance * distance) / k;
      const da = displacement.get(edge.source)!;
      const db = displacement.get(edge.target)!;
      da.x -= (dx / distance) * force;
      da.y -= (dy / distance) * force;
      db.x += (dx / distance) * force;
      db.y += (dy / distance) * force;
    }

    for (const node of ordered) {
      const point = position.get(node.id)!;
      const move = displacement.get(node.id)!;
      const length = Math.max(Math.hypot(move.x, move.y), 0.01);
      const limited = Math.min(length, temperature);
      point.x += (move.x / length) * limited;
      point.y += (move.y / length) * limited;
      point.x = Math.min(width, Math.max(0, point.x));
      point.y = Math.min(height, Math.max(0, point.y));
    }
    temperature -= cooling;
  }

  const xs = [...position.values()].map((p) => p.x);
  const ys = [...position.values()].map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return nodes.map((node) => {
    const point = position.get(node.id)!;
    return { ...node, position: { x: Math.round(point.x - minX), y: Math.round(point.y - minY) } };
  });
}

/** The node, its neighbours within `depth` hops, and the edges between them. */
export function getNeighborhood(graph: GraphData, nodeId: string, depth = 1): GraphData {
  const adjacency = new Map<string, Set<string>>();
  for (const edge of graph.edges) {
    adjacency.set(edge.source, (adjacency.get(edge.source) ?? new Set()).add(edge.target));
    adjacency.set(edge.target, (adjacency.get(edge.target) ?? new Set()).add(edge.source));
  }
  const keep = new Set<string>([nodeId]);
  let frontier = [nodeId];
  for (let level = 0; level < depth; level += 1) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const neighbour of adjacency.get(id) ?? []) {
        if (!keep.has(neighbour)) {
          keep.add(neighbour);
          next.push(neighbour);
        }
      }
    }
    frontier = next;
  }
  return {
    nodes: graph.nodes.filter((node) => keep.has(node.id)),
    edges: graph.edges.filter((edge) => keep.has(edge.source) && keep.has(edge.target)),
  };
}

export interface LinkResult {
  /** The item with `concepts` set to resolved concept ids. */
  item: KnowledgeItem;
  /** Concepts that are new or changed and must be upserted. */
  concepts: KnowledgeConcept[];
  /** Relationships that did not exist before. */
  relationships: KnowledgeRelationship[];
  /** Topics whose membership grew. */
  topics: TopicCollection[];
  createdConceptIds: string[];
  /** Concept ids that already existed and were matched. */
  matchedConceptIds: string[];
}

export interface LinkOptions {
  idGenerator?: IdGenerator;
  /** Maximum hub-and-spoke links created between the concepts of one capture. */
  maxConceptLinks?: number;
}

function hasConceptRelationship(
  relationships: readonly KnowledgeRelationship[],
  a: string,
  b: string,
): boolean {
  return relationships.some(
    (rel) =>
      rel.sourceKind === "concept" &&
      rel.targetKind === "concept" &&
      ((rel.sourceId === a && rel.targetId === b) || (rel.sourceId === b && rel.targetId === a)),
  );
}

/**
 * Links a freshly processed item into the graph: matches its concept names to existing concepts
 * (by name or alias), creates the ones that are new, updates concept → item indexes, connects the
 * item's concepts to each other and to related topics, and places new concepts into the best topic.
 */
export function linkNewCapture(
  state: KnowledgeState,
  item: KnowledgeItem,
  conceptNames: readonly string[],
  relatedTopicNames: readonly string[] = [],
  options: LinkOptions = {},
): LinkResult {
  const makeId = options.idGenerator ?? defaultIdGenerator;
  const working = new Map(state.concepts.map((concept) => [concept.id, concept]));
  const touched = new Set<string>();
  const createdConceptIds: string[] = [];
  const matchedConceptIds: string[] = [];
  const conceptIds: string[] = [];
  // Rebuilt per lookup so a concept created earlier in this capture can be matched by later names.
  const resolve = (name: string) => resolveConcept(createConceptIndex([...working.values()]), name);

  for (const name of conceptNames) {
    const { concept, isNew } = resolve(name);
    if (conceptIds.includes(concept.id)) continue;
    conceptIds.push(concept.id);
    if (isNew) createdConceptIds.push(concept.id);
    else matchedConceptIds.push(concept.id);
    const current = working.get(concept.id) ?? concept;
    working.set(
      concept.id,
      current.itemIds.includes(item.id) ? current : { ...current, itemIds: [...current.itemIds, item.id] },
    );
    touched.add(concept.id);
  }

  const newRelationships: KnowledgeRelationship[] = [];
  const allRelationships = [...state.relationships];
  const addRelationship = (relationship: Omit<KnowledgeRelationship, "id">) => {
    const created = { ...relationship, id: makeId("rel") };
    newRelationships.push(created);
    allRelationships.push(created);
  };

  const maxLinks = options.maxConceptLinks ?? 4;
  const [hub, ...spokes] = conceptIds;
  let linksAdded = 0;
  for (const spoke of spokes) {
    if (linksAdded >= maxLinks) break;
    if (hasConceptRelationship(allRelationships, hub, spoke)) continue;
    addRelationship({
      sourceId: hub,
      sourceKind: "concept",
      targetId: spoke,
      targetKind: "concept",
      relationship: "related",
      origin: "ai",
    });
    linksAdded += 1;
  }

  // A brand-new concept captured on its own still needs a way into the graph: use the lexicon's known neighbours.
  for (const id of createdConceptIds) {
    const touchedConcept = working.get(id)!;
    const connected = allRelationships.some(
      (rel) => (rel.sourceKind === "concept" && rel.sourceId === id) || (rel.targetKind === "concept" && rel.targetId === id),
    );
    if (connected) continue;
    const neighbour = findLexiconEntry(touchedConcept.name)
      ?.related.map((name) => resolve(name))
      .find((candidate) => !candidate.isNew);
    if (neighbour) {
      addRelationship({
        sourceId: id,
        sourceKind: "concept",
        targetId: neighbour.concept.id,
        targetKind: "concept",
        relationship: "related",
        origin: "ai",
      });
    }
  }

  for (const name of relatedTopicNames) {
    const { concept, isNew } = resolve(name);
    if (isNew || conceptIds.includes(concept.id)) continue;
    const exists = allRelationships.some(
      (rel) => rel.sourceKind === "item" && rel.sourceId === item.id && rel.targetKind === "concept" && rel.targetId === concept.id,
    );
    if (!exists) {
      addRelationship({
        sourceId: item.id,
        sourceKind: "item",
        targetId: concept.id,
        targetKind: "concept",
        relationship: "related",
        origin: "ai",
      });
    }
  }

  const changedTopics: TopicCollection[] = [];
  for (const id of createdConceptIds) {
    const alreadyPlaced = state.topics.some((topic) => topic.conceptIds.includes(id));
    if (alreadyPlaced) continue;
    const others = new Set(conceptIds.filter((other) => other !== id));
    const best = state.topics
      .map((topic) => ({ topic, overlap: topic.conceptIds.filter((cid) => others.has(cid)).length }))
      .filter((entry) => entry.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap)[0];
    if (best) {
      const current = changedTopics.find((t) => t.id === best.topic.id) ?? best.topic;
      const updated = { ...current, conceptIds: [...current.conceptIds, id] };
      const position = changedTopics.findIndex((t) => t.id === updated.id);
      if (position === -1) changedTopics.push(updated);
      else changedTopics[position] = updated;
    }
  }

  return {
    item: { ...item, concepts: conceptIds },
    concepts: [...touched].map((id) => working.get(id)!),
    relationships: newRelationships,
    topics: changedTopics,
    createdConceptIds,
    matchedConceptIds,
  };
}

import { describe, expect, it } from "vitest";
import { createDemoKnowledge } from "../../data/demo-knowledge";
import { createSequentialIdGenerator } from "../ids";
import { applyProcessingResult, processCapture } from "../ai/processor";
import { ingestCapture } from "../capture/inbound";
import { createConceptIndex, reconcileConceptItemIds, resolveConcept } from "./concepts";
import { buildGraph, getNeighborhood, graphNodeId, layoutGraph, linkNewCapture, type KnowledgeState } from "./graph-builder";
import { findRelatedItems } from "./related";
import { toReactFlow } from "./react-flow";

const NOW = new Date("2026-11-22T10:00:00.000Z");

function state(): KnowledgeState {
  const demo = createDemoKnowledge(NOW);
  return { items: demo.items, concepts: demo.concepts, relationships: demo.relationships, topics: demo.topics };
}

describe("demo knowledge", () => {
  it("is large and connected enough to make the product feel alive", () => {
    const demo = createDemoKnowledge(NOW);
    expect(demo.items.length).toBeGreaterThanOrEqual(12);
    expect(demo.items.length).toBeLessThanOrEqual(15);
    expect(demo.concepts.length).toBeGreaterThanOrEqual(12);
    expect(demo.concepts.length).toBeLessThanOrEqual(20);
    expect(demo.topics.length).toBeGreaterThanOrEqual(5);
    expect(demo.items.map((item) => item.sourceType)).toEqual(expect.arrayContaining(["journal", "voice", "youtube", "instagram", "website", "podcast", "text"]));
    expect(demo.reminders.length).toBeGreaterThan(0);
    // Every concept id on an item exists, and the inverse index agrees.
    const ids = new Set(demo.concepts.map((concept) => concept.id));
    for (const item of demo.items) {
      for (const conceptId of item.concepts) {
        expect(ids.has(conceptId)).toBe(true);
        expect(demo.concepts.find((c) => c.id === conceptId)!.itemIds).toContain(item.id);
      }
    }
    expect(reconcileConceptItemIds(demo.concepts, demo.items)).toEqual(demo.concepts);
  });
});

describe("buildGraph", () => {
  it("creates concept, item, journal and topic nodes with edges", () => {
    const graph = buildGraph(state());
    const kinds = new Set(graph.nodes.map((node) => node.kind));
    expect(kinds).toEqual(new Set(["concept", "item", "journal", "topic"]));
    expect(graph.edges.some((edge) => edge.kind === "mentions")).toBe(true);
    expect(graph.edges.some((edge) => edge.kind === "relationship")).toBe(true);
    expect(graph.edges.some((edge) => edge.kind === "topic")).toBe(true);
    const ids = new Set(graph.nodes.map((node) => node.id));
    for (const edge of graph.edges) {
      expect(ids.has(edge.source) && ids.has(edge.target)).toBe(true);
    }
    expect(new Set(graph.edges.map((edge) => edge.id)).size).toBe(graph.edges.length);
  });

  it("connects AI Agents to MCP, Automation and Context Engineering", () => {
    const graph = buildGraph(state(), { includeItems: false, includeTopics: false });
    const agents = graphNodeId.concept("ai-agents");
    const neighbours = getNeighborhood(graph, agents, 1).nodes.map((node) => node.label);
    expect(neighbours).toEqual(expect.arrayContaining(["MCP", "Automation", "Context Engineering"]));
  });

  it("supports a concepts-only overview sized for 12 to 20 nodes", () => {
    const graph = buildGraph(state(), { includeItems: false, includeTopics: false });
    expect(graph.nodes.length).toBeGreaterThanOrEqual(12);
    expect(graph.nodes.length).toBeLessThanOrEqual(20);
  });

  it("filters to one topic", () => {
    const graph = buildGraph(state(), { topicId: "product-design" });
    const labels = graph.nodes.filter((node) => node.kind === "concept").map((node) => node.label);
    expect(labels.sort()).toEqual(["Design Quality", "Design Systems", "Product Design", "User Research"]);
    expect(graph.nodes.some((node) => node.kind === "topic" && node.refId === "product-design")).toBe(true);
    expect(graph.nodes.every((node) => node.kind !== "concept" || !node.label.includes("Agents"))).toBe(true);
  });

  it("skips items that are still pending unless asked", () => {
    const base = state();
    const { item } = ingestCapture({ origin: "in-app", text: "Pending thought about agents." }, { now: () => NOW });
    const withPending = { ...base, items: [...base.items, item] };
    expect(buildGraph(withPending).nodes.some((node) => node.refId === item.id)).toBe(false);
    expect(buildGraph(withPending, { includeUnprocessed: true }).nodes.some((node) => node.refId === item.id)).toBe(true);
  });

  it("converts to React Flow nodes typed by kind", () => {
    const flow = toReactFlow(buildGraph(state()));
    expect(flow.nodes.every((node) => ["concept", "item", "journal", "topic"].includes(node.type!))).toBe(true);
    expect(flow.edges.length).toBeGreaterThan(0);
  });
});

describe("layoutGraph", () => {
  it("is deterministic, finite and keeps 12 to 20 nodes from overlapping", () => {
    const graph = buildGraph(state(), { includeItems: false, includeTopics: false });
    const again = buildGraph(state(), { includeItems: false, includeTopics: false });
    expect(again.nodes.map((n) => n.position)).toEqual(graph.nodes.map((n) => n.position));

    for (const node of graph.nodes) {
      expect(Number.isFinite(node.position.x) && Number.isFinite(node.position.y)).toBe(true);
      expect(node.position.x).toBeGreaterThanOrEqual(0);
      expect(node.position.y).toBeGreaterThanOrEqual(0);
    }
    let closest = Infinity;
    for (let i = 0; i < graph.nodes.length; i += 1) {
      for (let j = i + 1; j < graph.nodes.length; j += 1) {
        const a = graph.nodes[i].position;
        const b = graph.nodes[j].position;
        closest = Math.min(closest, Math.hypot(a.x - b.x, a.y - b.y));
      }
    }
    expect(closest).toBeGreaterThan(50);
  });

  it("handles empty and single-node graphs", () => {
    expect(layoutGraph([], [])).toEqual([]);
    const single = buildGraph({ items: [], concepts: [{ id: "a", name: "A", description: "", aliases: [], itemIds: [] }], relationships: [], topics: [] });
    expect(single.nodes).toHaveLength(1);
    expect(Number.isFinite(single.nodes[0].position.x)).toBe(true);
  });
});

describe("concept resolution", () => {
  it("matches names, aliases and plurals to existing concepts", () => {
    const index = createConceptIndex(createDemoKnowledge(NOW).concepts);
    expect(resolveConcept(index, "Model Context Protocol")).toMatchObject({ isNew: false, concept: { id: "mcp" } });
    expect(resolveConcept(index, "AI Agent").concept.id).toBe("ai-agents");
    expect(resolveConcept(index, "design system").concept.id).toBe("design-systems");
    expect(resolveConcept(index, "Beekeeping")).toMatchObject({ isNew: true, concept: { id: "beekeeping" } });
  });
});

describe("linkNewCapture", () => {
  it("links a new YouTube capture about AI agents to existing concepts and reuses them", async () => {
    const base = state();
    const ids = createSequentialIdGenerator();
    const { item } = ingestCapture(
      { origin: "extension", url: "https://www.youtube.com/watch?v=lifeos-demo-agents" },
      { now: () => NOW, idGenerator: ids },
    );
    const result = await processCapture({ content: "", type: "url", url: item.sourceUrl, title: item.title });
    const processed = applyProcessingResult(item, result, NOW);
    const link = linkNewCapture(base, processed, result.output.concepts, result.output.related_topics, { idGenerator: ids });

    expect(link.item.concepts).toEqual(expect.arrayContaining(["ai-agents", "tool-calling", "mcp", "context-engineering", "automation"]));
    expect(link.createdConceptIds).toEqual([]);
    expect(link.matchedConceptIds).toEqual(expect.arrayContaining(["ai-agents", "mcp"]));
    for (const concept of link.concepts) expect(concept.itemIds).toContain(item.id);
    // "AI Workflows" and "Developer Tools" come from related_topics and become item-to-concept links.
    expect(link.relationships.filter((rel) => rel.sourceKind === "item" && rel.sourceId === item.id).map((rel) => rel.targetId)).toEqual(
      expect.arrayContaining(["ai-workflows", "developer-tools"]),
    );

    const next: KnowledgeState = {
      items: [...base.items, link.item],
      concepts: base.concepts.map((c) => link.concepts.find((n) => n.id === c.id) ?? c),
      relationships: [...base.relationships, ...link.relationships],
      topics: base.topics,
    };
    const graph = buildGraph(next);
    const newNode = graph.nodes.find((node) => node.refId === item.id)!;
    expect(newNode).toBeDefined();
    const neighbourhood = getNeighborhood(graph, newNode.id, 1).nodes.map((node) => node.label);
    expect(neighbourhood).toEqual(expect.arrayContaining(["AI Agents", "MCP", "Automation", "Context Engineering"]));
  });

  it("creates a new concept, hooks it into the graph and places it in the best topic", () => {
    const base = state();
    const ids = createSequentialIdGenerator();
    const { item } = ingestCapture({ origin: "in-app", text: "Beekeeping and productivity notes" }, { now: () => NOW, idGenerator: ids });
    const link = linkNewCapture(base, { ...item, status: "ready" }, ["Beekeeping", "Productivity"], [], { idGenerator: ids });

    expect(link.createdConceptIds).toEqual(["beekeeping"]);
    expect(link.concepts.find((c) => c.id === "beekeeping")).toMatchObject({ name: "Beekeeping", itemIds: [item.id] });
    expect(link.relationships).toEqual([
      expect.objectContaining({ sourceId: "beekeeping", targetId: "productivity", relationship: "related", origin: "ai" }),
    ]);
    const productivityTopics = link.topics.map((topic) => topic.id);
    expect(productivityTopics.length).toBeGreaterThan(0);
    expect(link.topics.every((topic) => topic.conceptIds.includes("beekeeping"))).toBe(true);
  });

  it("is idempotent for concept ids and does not duplicate relationships", () => {
    const base = state();
    const ids = createSequentialIdGenerator();
    const { item } = ingestCapture({ origin: "in-app", text: "MCP and tool calling" }, { now: () => NOW, idGenerator: ids });
    const first = linkNewCapture(base, item, ["MCP", "Tool Calling", "MCP"], [], { idGenerator: ids });
    expect(first.item.concepts).toEqual(["mcp", "tool-calling"]);
    // mcp -> tool-calling already exists in the seed, so no new relationship is created.
    expect(first.relationships).toEqual([]);
  });
});

describe("findRelatedItems", () => {
  it("ranks items that share concepts and includes explicit links", () => {
    const { items, concepts, relationships } = state();
    const agents = items.find((item) => item.id === "item-ai-agents")!;
    const related = findRelatedItems(agents, items, concepts, relationships);
    expect(related.map((entry) => entry.item.id)).toEqual(expect.arrayContaining(["item-mcp", "item-context-engineering"]));
    expect(related[0].reason).toMatch(/^Shares /);
    expect(related.some((entry) => entry.item.id === agents.id)).toBe(false);
  });
});

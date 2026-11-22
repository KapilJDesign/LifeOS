import { describe, expect, it } from "vitest";
import { createDemoKnowledge } from "../../data/demo-knowledge";
import type { KnowledgeItem } from "../../types/knowledge";
import { applyFilters, searchItems, stem, suggestQueries, tokenize } from "./search";

const NOW = new Date("2026-11-22T10:00:00.000Z");
const demo = createDemoKnowledge(NOW);
const search = (query: string, options = {}) => searchItems(demo.items, demo.concepts, query, { topics: demo.topics, ...options });
const ids = (results: { item: KnowledgeItem }[]) => results.map((result) => result.item.id);

describe("tokenize", () => {
  it("lowercases, drops stopwords and stems", () => {
    expect(tokenize("The Agents are building tools")).toEqual(["agent", "build", "tool"]);
    expect(stem("policies")).toBe("policy");
  });
});

describe("searchItems ranking", () => {
  it("puts the item titled for the query first", () => {
    const results = search("model context protocol");
    expect(results[0].item.id).toBe("item-mcp");
  });

  it("ranks title and concept matches above incidental content mentions", () => {
    const results = search("design systems");
    expect(ids(results).slice(0, 2)).toEqual(expect.arrayContaining(["item-enterprise-design-systems"]));
    const top = results[0];
    expect(top.matchedFields).toEqual(expect.arrayContaining(["title"]));
    expect(top.score).toBeGreaterThan(results[results.length - 1].score);
  });

  it("matches concept aliases, so MCP finds the Model Context Protocol item and vice versa", () => {
    expect(ids(search("mcp"))).toContain("item-mcp");
    expect(ids(search("Model Context Protocol"))).toContain("item-mcp");
  });

  it("searches across tags, sources and content", () => {
    expect(ids(search("privacy"))).toEqual(expect.arrayContaining(["item-local-llms"]));
    expect(ids(search("instagram"))).toContain("item-ai-assisted-dev");
    expect(ids(search("Ollama"))).toContain("item-local-llms");
    expect(ids(search("deep work"))).toContain("item-daily-journal");
  });

  it("matches a partial last word while typing", () => {
    expect(ids(search("autom"))).toEqual(expect.arrayContaining(["item-business-automation"]));
  });

  it("returns every result with a snippet and a positive score, and nothing for unrelated queries", () => {
    for (const result of search("agents")) {
      expect(result.score).toBeGreaterThan(0);
      expect(result.snippet.length).toBeGreaterThan(0);
    }
    expect(search("quantum gardening")).toEqual([]);
  });

  it("is stable for equal input", () => {
    expect(ids(search("ai"))).toEqual(ids(search("ai")));
  });
});

describe("filters and sort", () => {
  it("filters by source type, content kind, tag, concept, topic, favourites and status", () => {
    expect(ids(search("", { filters: { sourceTypes: ["journal"] } }))).toEqual(["item-daily-journal"]);
    expect(search("", { filters: { contentKinds: ["video"] } }).every((r) => r.item.contentKind === "video")).toBe(true);
    expect(ids(search("", { filters: { tags: ["privacy"] } }))).toContain("item-local-llms");
    expect(ids(search("", { filters: { conceptIds: ["tool-calling"] } }))).toEqual(expect.arrayContaining(["item-mcp", "item-ai-agents"]));
    expect(search("", { filters: { favoritesOnly: true } }).every((r) => r.item.isFavorite)).toBe(true);
    const designTopic = search("", { filters: { topicId: "product-design" } });
    expect(designTopic.length).toBeGreaterThanOrEqual(4);
    expect(designTopic.every((r) => r.item.concepts.some((c) => ["design-systems", "product-design", "design-quality", "user-research"].includes(c)))).toBe(true);
    expect(applyFilters(demo.items, { status: ["pending"] })).toEqual([]);
  });

  it("combines a query with filters", () => {
    const results = search("agents", { filters: { sourceTypes: ["youtube"] } });
    expect(ids(results)).toEqual(["item-ai-agents"]);
  });

  it("sorts by recent, oldest, title and topic", () => {
    const recent = search("", { sort: "recent" }).map((r) => r.item.createdAt);
    expect([...recent].sort().reverse()).toEqual(recent);
    const oldest = search("", { sort: "oldest" }).map((r) => r.item.createdAt);
    expect([...oldest].sort()).toEqual(oldest);
    const titles = search("", { sort: "title" }).map((r) => r.item.title);
    expect([...titles].sort((a, b) => a.localeCompare(b))).toEqual(titles);
    const byTopic = search("", { sort: "topic" });
    expect(byTopic).toHaveLength(demo.items.length);
    expect(byTopic[0].item.concepts.some((id) => demo.topics[0].conceptIds.includes(id))).toBe(true);
  });

  it("respects the limit", () => {
    expect(search("ai", { limit: 3 })).toHaveLength(3);
  });
});

describe("suggestQueries", () => {
  it("suggests concept names and tags by prefix first", () => {
    expect(suggestQueries(demo.items, demo.concepts, "des")[0].toLowerCase().startsWith("des")).toBe(true);
    expect(suggestQueries(demo.items, demo.concepts, "x")).toEqual([]);
  });
});

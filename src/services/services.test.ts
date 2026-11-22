import { describe, expect, it, vi } from "vitest";
import { createDemoKnowledge } from "../data/demo-knowledge";
import type { AIProvider } from "../lib/ai/types";
import { createSequentialIdGenerator } from "../lib/ids";
import { MemoryRepository } from "../lib/storage/memory-repository";
import { createLifeOSStore } from "../store/lifeos-store";
import { createLocalRuntime, type LocalServicesOptions } from "./local";

const NOW = new Date("2026-11-22T10:00:00.000Z");

async function setup(options: LocalServicesOptions = {}) {
  const runtime = await createLocalRuntime({
    repository: new MemoryRepository(),
    now: () => NOW,
    idGenerator: createSequentialIdGenerator(),
    shareEnv: { navigator: { clipboard: { writeText: async () => {} } } },
    ...options,
  });
  return runtime;
}

describe("local services: capture to retrieval loop", () => {
  it("saves a pending item immediately, then processes, links and persists it", async () => {
    const { services } = await setup();
    const before = await services.knowledge.listItems();

    const result = await services.capture.capture({
      origin: "extension",
      url: "https://www.youtube.com/watch?v=lifeos-demo-agents",
      title: "Agents video",
    });
    expect(result.duplicate).toBe(false);
    expect(result.item.status).toBe("pending");
    expect((await services.knowledge.listItems()).length).toBe(before.length + 1);

    const processed = await result.processed!;
    expect(processed).toMatchObject({ status: "ready", sourceUrl: "https://www.youtube.com/watch?v=lifeos-demo-agents", origin: "extension" });
    expect(processed.concepts).toEqual(expect.arrayContaining(["ai-agents", "mcp"]));
    expect(processed.summary.length).toBeGreaterThan(0);

    const detail = await services.knowledge.getItemDetail(processed.id);
    expect(detail?.relatedItems.map((entry) => entry.item.id)).toEqual(expect.arrayContaining(["item-ai-agents"]));
    expect(detail?.concepts.find((concept) => concept.id === "ai-agents")?.itemIds).toContain(processed.id);

    const graph = await services.graph.getGraph();
    expect(graph.nodes.some((node) => node.refId === processed.id)).toBe(true);

    const found = await services.search.search("how ai agents actually work");
    expect(found[0].item.id).toBe(processed.id);

    const answer = await services.chat.ask("What did I save about AI agents?");
    expect(answer.citations.map((citation) => citation.itemId)).toContain(processed.id);
    expect((await services.chat.getHistory()).map((entry) => entry.id)).toContain(answer.id);
  });

  it("returns the existing item for a duplicate capture and does not process twice", async () => {
    const { services } = await setup();
    const first = await services.capture.capture({ origin: "in-app", url: "https://youtu.be/dupe-1" });
    await first.processed;
    const second = await services.capture.capture({ origin: "extension", url: "https://www.youtube.com/watch?v=dupe-1&feature=share" });
    expect(second).toMatchObject({ duplicate: true });
    expect(second.item.id).toBe(first.item.id);
    expect(second.processed).toBeUndefined();
  });

  it("captures from a share-target query string", async () => {
    const { services } = await setup();
    const result = await services.capture.captureFromQuery("?title=Post&text=Look%20at%20this%20https%3A%2F%2Fexample.com%2Fpost");
    expect(result?.item).toMatchObject({ origin: "share-target", sourceUrl: "https://example.com/post", title: "Post" });
    expect(await services.capture.captureFromQuery("")).toBeNull();
    await result!.processed;
  });

  it("never blocks saving when the AI provider fails: it falls back to the mock", async () => {
    const broken: AIProvider = { name: "llm", process: async () => { throw new Error("offline"); } };
    const { services } = await setup({ aiProvider: broken });
    const result = await services.capture.capture({ origin: "in-app", text: "Idea: weekly digest for my saved items." });
    const processed = await result.processed!;
    expect(processed.status).toBe("ready");
    expect(processed.processing).toMatchObject({ usedFallback: true, provider: "mock" });
    expect(processed.content).toBe("Idea: weekly digest for my saved items.");
  });

  it("marks an item failed (still saved) when there is no fallback, then retries successfully", async () => {
    let healthy = false;
    const flaky: AIProvider = {
      name: "llm",
      process: async (request) => {
        if (!healthy) throw new Error("offline");
        return {
          title: "Retry works",
          content_type: "note",
          source: request.platform,
          summary: "It worked on retry.",
          concepts: ["Productivity"],
          tags: ["Test"],
        };
      },
    };
    const { services } = await setup({ aiProvider: flaky, fallbackProvider: false });
    const result = await services.capture.capture({ origin: "in-app", text: "Retry me please, this is a note." });
    const failed = await result.processed!;
    expect(failed.status).toBe("failed");
    expect(failed.processing?.error).toMatch(/offline/);
    expect(await services.knowledge.getItem(failed.id)).toBeDefined();

    healthy = true;
    const retried = await services.capture.processPending();
    expect(retried.map((item) => item.status)).toEqual(["ready"]);
    expect(retried[0]).toMatchObject({ title: "Retry works", concepts: ["productivity"] });
    expect(retried[0].processing?.attempts).toBe(2);
  });

  it("saves without processing when asked (offline queue) and processes later", async () => {
    const { services } = await setup();
    const result = await services.capture.capture({ origin: "in-app", text: "Offline thought about privacy." }, { process: false });
    expect(result.processed).toBeUndefined();
    expect((await services.knowledge.getItem(result.item.id))?.status).toBe("pending");
    await services.capture.processPending();
    expect((await services.knowledge.getItem(result.item.id))?.status).toBe("ready");
  });

  it("creates a reminder for a reminder capture, with a parsed due date", async () => {
    const { services } = await setup();
    const result = await services.capture.capture({ origin: "in-app", kind: "reminder", text: "Explore building a local AI agent this weekend" });
    await result.processed;
    expect(result.reminder).toMatchObject({ title: "Explore building a local AI agent this weekend", completed: false, confirmed: true });
    expect(new Date(result.reminder!.dueAt!).getDay()).toBe(6);
  });
});

describe("local services: other contracts", () => {
  it("lists items, concepts and collections with counts", async () => {
    const { services } = await setup();
    const demo = createDemoKnowledge(NOW);
    expect((await services.knowledge.listItems()).length).toBe(demo.items.length);
    const collections = await services.knowledge.listCollections();
    expect(collections.length).toBe(demo.topics.length);
    const ai = collections.find((entry) => entry.topic.id === "ai-emerging-tech")!;
    expect(ai.itemCount).toBeGreaterThanOrEqual(7);
    expect(ai.recentItems.length).toBeGreaterThan(0);
    expect(ai.recentItems[0].createdAt >= ai.recentItems[ai.recentItems.length - 1].createdAt).toBe(true);
    const concept = await services.knowledge.getConceptDetail("ai-agents");
    expect(concept?.relatedConcepts.map((entry) => entry.concept.id)).toEqual(expect.arrayContaining(["mcp", "automation"]));
  });

  it("edits an item, re-links concepts by name, and deletes cleanly", async () => {
    const { services } = await setup();
    const edited = await services.knowledge.updateItem("item-mcp", { title: "  MCP, edited  ", tags: ["Edited"], conceptNames: ["MCP", "Privacy"] });
    expect(edited).toMatchObject({ title: "MCP, edited", tags: ["Edited"], concepts: ["mcp", "privacy"] });
    expect((await services.knowledge.getConceptDetail("privacy"))?.items.map((i) => i.id)).toContain("item-mcp");
    expect((await services.knowledge.getConceptDetail("tool-calling"))?.items.map((i) => i.id)).not.toContain("item-mcp");

    const unchanged = await services.knowledge.updateItem("item-mcp", { title: undefined });
    expect(unchanged.title).toBe("MCP, edited");

    const favorite = await services.knowledge.toggleFavorite("item-mcp");
    expect(favorite.isFavorite).toBe(true);

    await services.knowledge.deleteItem("item-mcp");
    expect(await services.knowledge.getItem("item-mcp")).toBeUndefined();
    expect((await services.graph.getGraph()).nodes.some((node) => node.refId === "item-mcp")).toBe(false);
    expect((await services.knowledge.getConceptDetail("mcp"))?.items.map((i) => i.id)).not.toContain("item-mcp");
    expect((await services.reminders.list()).find((reminder) => reminder.id === "reminder-read-mcp")?.sourceItemId).toBeUndefined();
    await expect(services.knowledge.updateItem("item-mcp", { title: "x" })).rejects.toThrow(/not found/i);
  });

  it("tracks revisits, history and progress through the discovery service", async () => {
    const { services } = await setup();
    const before = await services.discovery.getProgress();
    const unseen = (await services.discovery.getExploreDeck("new"))[0];
    expect((await services.discovery.getExploreDeck("for-you"))[0].id).toBe(unseen.id);

    const review = await services.discovery.recordView(unseen.id, "explore");
    expect(review.viewCount).toBe(1);
    await services.discovery.recordView(unseen.id, "detail");

    const after = await services.discovery.getProgress();
    expect(after.seen).toBe(before.seen + 1);
    expect(after.revisited).toBe(before.revisited + 1);
    const history = await services.discovery.getHistory(5);
    expect(history[0].item.id).toBe(unseen.id);
    expect(history[0].entry.via).toBe("detail");
  });

  it("keeps Today's Discovery stable when the user opens items during the day", async () => {
    const { services } = await setup();
    const first = await services.discovery.getDailyDiscovery();
    await services.discovery.recordView(first.revisit!.item.id, "discovery");
    await services.discovery.recordView(first.pastInsight!.item.id, "discovery");
    const second = await services.discovery.getDailyDiscovery();
    expect(second.pastInsight?.item.id).toBe(first.pastInsight?.item.id);
    expect(second.revisit?.item.id).toBe(first.revisit?.item.id);
    expect(second.connectedConcept?.concept.id).toBe(first.connectedConcept?.concept.id);
  });

  it("manages reminders: create, confirm an AI suggestion, complete, remove and suggest from an item", async () => {
    const { services } = await setup();
    const created = await services.reminders.create({ title: "Read paper", sourceItemId: "item-mcp" });
    expect(created).toMatchObject({ completed: false, confirmed: true });

    const suggested = (await services.reminders.list({ confirmed: false })).map((r) => r.id);
    expect(suggested).toContain("reminder-quality-bar");
    const confirmed = await services.reminders.confirm("reminder-quality-bar", { title: "Write the quality bar" });
    expect(confirmed).toMatchObject({ confirmed: true, title: "Write the quality bar" });

    const done = await services.reminders.setCompleted(created.id, true);
    expect(done.completedAt).toBe(NOW.toISOString());
    expect((await services.reminders.list({ completed: false })).some((r) => r.id === created.id)).toBe(false);
    expect((await services.reminders.setCompleted(created.id, false)).completedAt).toBeUndefined();

    await services.reminders.remove(created.id);
    expect((await services.reminders.list()).some((r) => r.id === created.id)).toBe(false);

    const suggestions = await services.reminders.suggestFromItem("item-ai-agents");
    expect(suggestions[0].title).toBe("Build a tiny agent with one tool");
  });

  it("shares items and collections through the share service", async () => {
    const writeText = vi.fn(async () => {});
    const { services } = await setup({ shareEnv: { navigator: { clipboard: { writeText } } } });
    expect(services.share.canShareNatively()).toBe(false);
    const result = await services.share.share({ kind: "collection", topicId: "product-design" });
    expect(result).toMatchObject({ ok: true, method: "clipboard" });
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Product Design"));
    expect((await services.share.buildPayload({ kind: "card", itemId: "item-mcp" })).title).toBe("Model Context Protocol (MCP)");
    await expect(services.share.share({ kind: "item", itemId: "nope" })).rejects.toThrow(/not found/i);
  });

  it("exports everything and resets to the demo data", async () => {
    const { services } = await setup();
    await services.capture.capture({ origin: "in-app", text: "A user note that will be wiped by reset." }, { process: false });
    const bundle = await services.data.exportAll();
    expect(bundle.items.length).toBe(createDemoKnowledge(NOW).items.length + 1);
    await services.data.resetToDemo();
    expect((await services.knowledge.listItems()).length).toBe(createDemoKnowledge(NOW).items.length);
  });

  it("persists across service instances sharing a repository (refresh)", async () => {
    const repository = new MemoryRepository();
    const first = await createLocalRuntime({ repository, now: () => NOW });
    const result = await first.services.capture.capture({ origin: "in-app", text: "A thought about local-first apps and privacy." });
    await result.processed;
    const second = await createLocalRuntime({ repository, now: () => NOW });
    const items = await second.services.knowledge.listItems();
    expect(items.find((item) => item.id === result.item.id)).toMatchObject({ status: "ready" });
    expect(items.length).toBe(createDemoKnowledge(NOW).items.length + 1);
  });
});

describe("zustand store", () => {
  it("initialises, refreshes on changes and tracks processing ids", async () => {
    const store = createLifeOSStore(async () => (await setup()).services);
    await store.getState().init();
    expect(store.getState().status).toBe("ready");
    expect(store.getState().items.length).toBe(createDemoKnowledge(NOW).items.length);
    expect(store.getState().collections.length).toBeGreaterThan(0);

    const result = await store.getState().capture({ origin: "in-app", text: "Store capture about design quality." });
    expect(store.getState().items.some((item) => item.id === result.item.id)).toBe(true);
    await result.processed;
    await vi.waitFor(() => {
      expect(store.getState().items.find((item) => item.id === result.item.id)?.status).toBe("ready");
      expect(store.getState().processingIds).toEqual([]);
    });
  });

  it("reports an error state when services fail to start", async () => {
    const store = createLifeOSStore(async () => {
      throw new Error("db blocked");
    });
    await store.getState().init();
    expect(store.getState()).toMatchObject({ status: "error", error: "db blocked" });
  });
});

import { describe, expect, it } from "vitest";
import { createDemoKnowledge } from "../../data/demo-knowledge";
import type { AnswerComposer } from "../ai/llm-provider";
import { createSequentialIdGenerator } from "../ids";
import { askKnowledge, validateCitations } from "./answer";

const NOW = new Date("2026-11-22T10:00:00.000Z");
const demo = createDemoKnowledge(NOW);
const ask = (question: string, composer?: AnswerComposer | null) =>
  askKnowledge(question, {
    items: demo.items,
    concepts: demo.concepts,
    topics: demo.topics,
    composer,
    now: () => NOW,
    idGenerator: createSequentialIdGenerator(),
  });

describe("askKnowledge", () => {
  it("answers from saved items with numbered citations that point at real items", async () => {
    const answer = await ask("What did I save about AI agents?");
    expect(answer.grounded).toBe(true);
    expect(answer.provider).toBe("mock");
    expect(answer.citations.length).toBeGreaterThanOrEqual(2);
    expect(answer.citations.map((c) => c.n)).toEqual(answer.citations.map((_, i) => i + 1));

    const itemIds = new Set(demo.items.map((item) => item.id));
    for (const citation of answer.citations) {
      expect(itemIds.has(citation.itemId)).toBe(true);
      expect(citation.title).toBe(demo.items.find((i) => i.id === citation.itemId)!.title);
      expect(citation.snippet.length).toBeGreaterThan(0);
      expect(answer.answer).toContain(`[${citation.n}]`);
    }
    expect(answer.citations[0].itemId).toBe("item-ai-agents");
    expect(answer.relatedConcepts).toContain("AI Agents");
    expect(answer.followUps.length).toBeGreaterThan(0);
  });

  it("only cites markers that exist, and only items that are about the question", async () => {
    const answer = await ask("What have I learned about design systems?");
    const markers = [...answer.answer.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1]));
    expect(markers.length).toBeGreaterThan(0);
    for (const marker of markers) expect(answer.citations.some((c) => c.n === marker)).toBe(true);
    const cited = answer.citations.map((c) => demo.items.find((item) => item.id === c.itemId)!);
    expect(cited.map((item) => item.id)).toContain("item-enterprise-design-systems");
    expect(cited.every((item) => item.concepts.includes("design-systems"))).toBe(true);
    expect(answer.answer).toMatch(/^You have \d+ saved items? on design systems/);
  });

  it("says it found nothing, cites nothing and does not invent an answer when nothing is relevant", async () => {
    const answer = await ask("What did I save about quantum gardening?");
    expect(answer.grounded).toBe(false);
    expect(answer.citations).toEqual([]);
    expect(answer.answer).toMatch(/couldn't find anything .* "quantum gardening"/i);
    expect(answer.answer).not.toMatch(/\[\d+\]/);
    expect(answer.followUps.length).toBeGreaterThan(0);
  });

  it("handles an empty question and an empty library", async () => {
    expect((await ask("   ")).grounded).toBe(false);
    const empty = await askKnowledge("anything about agents?", { items: [], concepts: [] });
    expect(empty).toMatchObject({ grounded: false, citations: [] });
  });

  it("finds connections between two topics and cites both sides", async () => {
    const answer = await ask("Find connections between AI and product design");
    expect(answer.grounded).toBe(true);
    expect(answer.answer).toMatch(/Connections between AI and product design/);
    const cited = answer.citations.map((c) => c.itemId);
    expect(cited).toContain("item-ai-product-design");
    expect(answer.citations.length).toBeGreaterThanOrEqual(2);
  });

  it("does not use items that are still pending", async () => {
    const pending = { ...demo.items[0], id: "pending-1", title: "Zebra migration", status: "pending" as const, summary: "", content: "zebra zebra", concepts: [] };
    const answer = await askKnowledge("zebra", { items: [...demo.items, pending], concepts: demo.concepts });
    expect(answer.grounded).toBe(false);
  });

  describe("LLM composer", () => {
    const composerFor = (text: string | (() => Promise<string>)): AnswerComposer => ({
      name: "llm",
      compose: async () => (typeof text === "string" ? text : text()),
    });

    it("keeps a valid LLM answer, strips invalid markers and renumbers citations", async () => {
      const answer = await ask("What did I save about AI agents?", composerFor("Agents plan and use tools [2]. A bogus claim [9]."));
      expect(answer.provider).toBe("llm");
      expect(answer.answer).toBe("Agents plan and use tools [1]. A bogus claim.");
      expect(answer.citations).toHaveLength(1);
      expect(answer.citations[0].n).toBe(1);
    });

    it("falls back to the grounded mock answer when the LLM cites nothing valid or throws", async () => {
      const uncited = await ask("What did I save about AI agents?", composerFor("Agents are great."));
      expect(uncited.provider).toBe("mock");
      expect(uncited.citations.length).toBeGreaterThan(0);

      const failing = await ask("What did I save about AI agents?", composerFor(async () => { throw new Error("boom"); }));
      expect(failing.provider).toBe("mock");
      expect(failing.grounded).toBe(true);
    });
  });
});

describe("validateCitations", () => {
  const citations = [1, 2, 3].map((n) => ({ n, itemId: `i${n}`, title: `T${n}`, snippet: "s" }));

  it("removes unknown markers and renumbers in order of first use", () => {
    const result = validateCitations("A [3] B [1] C [3] D [7]", citations);
    expect(result.answer).toBe("A [1] B [2] C [1] D");
    expect(result.citations.map((c) => c.itemId)).toEqual(["i3", "i1"]);
  });
});

import { describe, expect, it, vi } from "vitest";
import { DEMO_CAPTURE_URLS } from "./demo-urls";
import { LlmAIProvider, LlmClient, readLlmConfig, resolveAIProvider } from "./llm-provider";
import { MockAIProvider, mockProcess } from "./mock-processor";
import { ProcessingError, applyProcessingResult, buildProcessRequest, processCapture } from "./processor";
import { extractJson, parseProcessingOutput } from "./schema";
import type { AIProvider } from "./types";
import { ingestCapture } from "../capture/inbound";

const NOW = new Date("2026-11-22T10:00:00.000Z");

const validOutput = {
  title: "Understanding AI Agents",
  content_type: "video",
  source: "youtube",
  url: "https://youtube.com/example",
  summary: "An introduction to autonomous AI agents.",
  key_takeaways: ["Agents can plan and execute tasks", "Tools extend agent capabilities"],
  concepts: ["AI Agents", "Tool Calling"],
  tags: ["AI", "#Automation"],
  actions: ["Explore agent frameworks"],
  related_topics: ["MCP"],
};

const provider = (name: string, impl: AIProvider["process"]): AIProvider => ({ name, process: impl });

describe("schema validation", () => {
  it("accepts the brief's example output and normalises tags", () => {
    const parsed = parseProcessingOutput(validOutput);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.data.tags).toEqual(["AI", "Automation"]);
  });

  it("parses JSON wrapped in prose and code fences", () => {
    expect(extractJson('Here you go:\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseProcessingOutput(`Sure! ${JSON.stringify(validOutput)}`).ok).toBe(true);
  });

  it("maps an unknown content_type to a safe kind instead of failing", () => {
    const parsed = parseProcessingOutput({ ...validOutput, content_type: "Tutorial video" });
    expect(parsed.ok && parsed.data.content_type).toBe("video");
    const odd = parseProcessingOutput({ ...validOutput, content_type: "hologram" });
    expect(odd.ok && odd.data.content_type).toBe("link");
  });

  it.each([
    ["missing title", { ...validOutput, title: "" }],
    ["missing summary", { ...validOutput, summary: undefined }],
    ["no concepts", { ...validOutput, concepts: [] }],
    ["concepts not an array", { ...validOutput, concepts: "AI Agents" }],
    ["not JSON", "I cannot help with that"],
    ["null", null],
  ])("rejects %s", (_label, value) => {
    expect(parseProcessingOutput(value).ok).toBe(false);
  });
});

describe("processCapture", () => {
  it("uses the primary provider when its output is valid and pins the original URL and source", async () => {
    const llm = provider("llm", async () => ({ ...validOutput, url: "https://evil.example/changed", source: "somewhere" }));
    const result = await processCapture(
      { content: "", type: "url", url: "https://www.youtube.com/watch?v=abc" },
      { provider: llm },
    );
    expect(result).toMatchObject({ provider: "llm", usedFallback: false });
    expect(result.output.url).toBe("https://www.youtube.com/watch?v=abc");
    expect(result.output.source).toBe("youtube");
  });

  it("falls back to the mock when the provider returns invalid JSON", async () => {
    const result = await processCapture(
      { content: "Notes on agents and tool calling for automation.", type: "text" },
      { provider: provider("llm", async () => ({ title: "only a title" })) },
    );
    expect(result.usedFallback).toBe(true);
    expect(result.provider).toBe("mock");
    expect(result.error).toMatch(/Invalid output from llm/);
    expect(result.output.concepts).toContain("AI Agents");
  });

  it("falls back when the provider throws or times out", async () => {
    const throwing = provider("llm", async () => {
      throw new Error("network down");
    });
    expect((await processCapture({ content: "Idea about SaaS pricing.", type: "text" }, { provider: throwing })).error).toMatch(/network down/);

    vi.useFakeTimers();
    const slow = provider("llm", () => new Promise(() => {}));
    const pending = processCapture({ content: "Idea about SaaS pricing.", type: "text" }, { provider: slow, timeoutMs: 50 });
    await vi.advanceTimersByTimeAsync(60);
    const result = await pending;
    vi.useRealTimers();
    expect(result.usedFallback).toBe(true);
    expect(result.error).toMatch(/timed out/);
  });

  it("surfaces the failure when fallback is disabled", async () => {
    await expect(
      processCapture(
        { content: "x", type: "text" },
        { provider: provider("llm", async () => "nope"), fallback: false },
      ),
    ).rejects.toBeInstanceOf(ProcessingError);
  });

  it("applyProcessingResult never touches the original content, URL, capture time or origin", async () => {
    const { item } = ingestCapture(
      { origin: "extension", url: "https://www.youtube.com/watch?v=lifeos-demo-agents", text: "Original selection about agents." },
      { now: () => NOW },
    );
    const result = await processCapture({ content: item.content, type: item.sourceType, url: item.sourceUrl, title: item.title });
    const processed = applyProcessingResult(item, result, new Date(NOW.getTime() + 1000));
    expect(processed).toMatchObject({
      content: item.content,
      sourceUrl: item.sourceUrl,
      createdAt: item.createdAt,
      origin: "extension",
      status: "ready",
    });
    expect(processed.summary.length).toBeGreaterThan(0);
    expect(processed.processing).toMatchObject({ attempts: 1, usedFallback: false, provider: "mock" });
  });
});

describe("mock processor", () => {
  it("is deterministic", () => {
    const request = buildProcessRequest({ content: "Explore building a local AI agent with Ollama this weekend.", type: "text" });
    expect(mockProcess(request)).toEqual(mockProcess(request));
  });

  it("returns curated metadata for every known demo URL", () => {
    for (const demo of DEMO_CAPTURE_URLS) {
      const output = mockProcess(buildProcessRequest({ content: "", type: "url", url: demo.url }));
      expect(output.concepts.length).toBeGreaterThanOrEqual(3);
      expect(output.key_takeaways).toHaveLength(3);
      expect(output.url).toBe(demo.url);
    }
    const agents = mockProcess(buildProcessRequest({ content: "", type: "url", url: DEMO_CAPTURE_URLS[0].url }));
    expect(agents.title).toBe("How AI Agents Actually Work: Plan, Act, Reflect");
    expect(agents.concepts).toEqual(expect.arrayContaining(["AI Agents", "MCP"]));
  });

  it("extracts concepts, tags, takeaways and actions heuristically from free text", () => {
    const output = mockProcess(
      buildProcessRequest({
        content:
          "Local LLMs run on a laptop with Ollama and keep notes private. Quantised models trade quality for cost. I should try a local model for summaries this weekend.",
        type: "text",
      }),
    );
    expect(output.concepts[0]).toBe("Local LLMs");
    expect(output.concepts).toContain("Privacy");
    expect(output.tags).toEqual(expect.arrayContaining(["AI"]));
    expect(output.actions.some((action) => /try a local model/i.test(action))).toBe(true);
    expect(output.key_takeaways.length).toBeGreaterThan(0);
  });

  it("reuses an existing user-created concept by its exact name", () => {
    const output = mockProcess(
      buildProcessRequest({
        content: "Sourdough starters need regular feeding.",
        type: "text",
        existingConcepts: [{ id: "sourdough", name: "Sourdough", aliases: [] }],
      }),
    );
    expect(output.concepts).toEqual(["Sourdough"]);
  });

  it("always yields a valid result, even for a bare unknown URL or odd text", () => {
    for (const request of [
      buildProcessRequest({ content: "", type: "url", url: "https://example.org/some-thing-here" }),
      buildProcessRequest({ content: "?!", type: "text" }),
      buildProcessRequest({ content: "", type: "text", title: "Only a title" }),
    ]) {
      expect(parseProcessingOutput(mockProcess(request)).ok).toBe(true);
    }
  });

  it("does not claim to have read a page it never fetched", () => {
    const output = mockProcess(buildProcessRequest({ content: "", type: "url", url: "https://example.org/some-thing-here" }));
    expect(output.summary).toMatch(/original link is kept/i);
  });
});

describe("LLM provider (off by default)", () => {
  it("is disabled without VITE_AI_PROVIDER=llm and a key", () => {
    expect(readLlmConfig({})).toBeNull();
    expect(readLlmConfig({ VITE_AI_PROVIDER: "llm" })).toBeNull();
    expect(readLlmConfig({ VITE_AI_PROVIDER: "mock", VITE_LLM_API_KEY: "k" })).toBeNull();
    expect(resolveAIProvider({})).toBeInstanceOf(MockAIProvider);
  });

  it("calls an OpenAI-compatible endpoint with JSON mode and returns the message content", async () => {
    const config = readLlmConfig({ VITE_AI_PROVIDER: "llm", VITE_LLM_API_KEY: "test-key", VITE_LLM_MODEL: "m" });
    expect(config).toMatchObject({ model: "m", endpoint: expect.stringContaining("chat/completions") });
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(validOutput) } }] })));
    const llm = new LlmAIProvider(new LlmClient(config!, fetchMock as unknown as typeof fetch));
    const result = await processCapture({ content: "", type: "url", url: "https://youtu.be/q" }, { provider: llm });
    expect(result).toMatchObject({ provider: "llm", usedFallback: false });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string).response_format).toEqual({ type: "json_object" });
  });

  it("falls back to the mock on an HTTP error", async () => {
    const config = readLlmConfig({ VITE_AI_PROVIDER: "llm", VITE_LLM_API_KEY: "k" })!;
    const llm = new LlmAIProvider(new LlmClient(config, (async () => new Response("no", { status: 429 })) as unknown as typeof fetch));
    const result = await processCapture({ content: "Notes about design systems.", type: "text" }, { provider: llm });
    expect(result).toMatchObject({ usedFallback: true });
    expect(result.error).toMatch(/429/);
  });
});

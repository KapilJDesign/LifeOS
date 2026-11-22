import { describe, expect, it, vi } from "vitest";
import { createDemoKnowledge } from "../../data/demo-knowledge";
import { buildSharePayload, canShareNatively, shareContent } from "./share";

const NOW = new Date("2026-11-22T10:00:00.000Z");
const demo = createDemoKnowledge(NOW);
const item = demo.items.find((entry) => entry.id === "item-ai-agents")!;
const topic = demo.topics[0];

describe("buildSharePayload", () => {
  it("builds item text with summary, takeaways, source URL and a signature", () => {
    const payload = buildSharePayload({ kind: "item", item });
    expect(payload.title).toBe(item.title);
    expect(payload.url).toBe(item.sourceUrl);
    expect(payload.text).toContain(item.summary);
    expect(payload.text).toContain(`• ${item.keyTakeaways[0]}`);
    expect(payload.text).toContain(`Source: ${item.sourceUrl}`);
    expect(payload.text).toContain("Saved with Life OS");
  });

  it("builds a compact card with the lead insight and hashtags", () => {
    const payload = buildSharePayload({ kind: "card", item });
    expect(payload.text).toContain(item.keyTakeaways[0]);
    expect(payload.text).toContain("#AI");
    expect(payload.text).not.toContain("Key takeaways");
  });

  it("builds a collection with a capped list of titles and a count", () => {
    const items = demo.items.slice(0, 10);
    const payload = buildSharePayload({ kind: "collection", topic, items });
    expect(payload.title).toBe(topic.name);
    expect(payload.text).toContain("(10 saved items)");
    expect(payload.text).toContain("…and 2 more");
    expect(payload.url).toBeUndefined();
  });

  it("builds copy-only payloads for summary and source link", () => {
    expect(buildSharePayload({ kind: "summary", item }).text).toBe(`${item.title}\n\n${item.summary}`);
    expect(buildSharePayload({ kind: "source-link", item }).text).toBe(item.sourceUrl);
  });
});

describe("shareContent", () => {
  it("uses the native share sheet when available", async () => {
    const share = vi.fn(async () => {});
    const writeText = vi.fn(async () => {});
    const result = await shareContent({ kind: "card", item }, { navigator: { share, clipboard: { writeText } } });
    expect(result).toMatchObject({ ok: true, method: "native" });
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: item.title, url: item.sourceUrl }));
    expect(writeText).not.toHaveBeenCalled();
  });

  it("falls back to the clipboard when the Web Share API is missing", async () => {
    const writeText = vi.fn(async () => {});
    const result = await shareContent({ kind: "item", item }, { navigator: { clipboard: { writeText } } });
    expect(result).toMatchObject({ ok: true, method: "clipboard" });
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining(item.summary));
  });

  it("falls back to the clipboard when canShare rejects the data or share throws a non-abort error", async () => {
    const writeText = vi.fn(async () => {});
    const rejected = await shareContent(
      { kind: "item", item },
      { navigator: { share: vi.fn(async () => {}), canShare: () => false, clipboard: { writeText } } },
    );
    expect(rejected.method).toBe("clipboard");

    const failing = await shareContent(
      { kind: "item", item },
      { navigator: { share: vi.fn(async () => { throw new Error("denied"); }), clipboard: { writeText } } },
    );
    expect(failing.method).toBe("clipboard");
  });

  it("treats a dismissed share sheet as cancelled, not as an error, and does not copy", async () => {
    const writeText = vi.fn(async () => {});
    const abort = Object.assign(new Error("cancelled"), { name: "AbortError" });
    const result = await shareContent(
      { kind: "item", item },
      { navigator: { share: vi.fn(async () => { throw abort; }), clipboard: { writeText } } },
    );
    expect(result).toMatchObject({ ok: false, cancelled: true, method: "native" });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copy-only targets skip the share sheet", async () => {
    const share = vi.fn(async () => {});
    const writeText = vi.fn(async () => {});
    const result = await shareContent({ kind: "source-link", item }, { navigator: { share, clipboard: { writeText } } });
    expect(result.method).toBe("clipboard");
    expect(share).not.toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith(item.sourceUrl);
  });

  it("uses the legacy copy path when the Clipboard API is unavailable (insecure origin)", async () => {
    const area = { value: "", setAttribute: vi.fn(), select: vi.fn(), style: {} as Record<string, string> };
    const doc = {
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
      createElement: vi.fn(() => area),
      execCommand: vi.fn(() => true),
    };
    const result = await shareContent({ kind: "summary", item }, { navigator: {}, document: doc as never });
    expect(result).toMatchObject({ ok: true, method: "clipboard" });
    expect(area.value).toContain(item.summary);
    expect(doc.execCommand).toHaveBeenCalledWith("copy");
  });

  it("reports failure when nothing can share or copy, or when there is nothing to copy", async () => {
    expect(await shareContent({ kind: "item", item }, { navigator: {}, document: { body: null } as never })).toMatchObject({ ok: false, method: "none" });
    const noUrl = { ...item, sourceUrl: undefined };
    expect(await shareContent({ kind: "source-link", item: noUrl }, { navigator: { clipboard: { writeText: async () => {} } } })).toMatchObject({
      ok: false,
      error: "Nothing to copy",
    });
  });

  it("detects native share support", () => {
    expect(canShareNatively({ navigator: { share: async () => {} } })).toBe(true);
    expect(canShareNatively({ navigator: {} })).toBe(false);
  });
});

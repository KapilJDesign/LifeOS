import { describe, expect, it } from "vitest";
// The extension is plain JS; this keeps its deep-link format in sync with the app's parser.
import { buildCaptureUrl, normalizeAppUrl, DEFAULT_APP_URL } from "../../../extension/capture-link.js";
import { createSequentialIdGenerator } from "../ids";
import type { KnowledgeItem } from "../../types/knowledge";
import { suggestFromClipboard, readClipboardText, fingerprint } from "./clipboard";
import {
  EmptyCaptureError,
  buildCaptureDeepLink,
  ingestCapture,
  ingestFromClipboard,
  ingestFromQuery,
  looksLikeAiConversation,
  parseCaptureQuery,
} from "./inbound";

const NOW = new Date("2026-11-22T10:00:00.000Z");
const context = () => ({ now: () => NOW, idGenerator: createSequentialIdGenerator() });

describe("ingestCapture", () => {
  it("creates a pending item from in-app text and never marks it processed", () => {
    const { item, duplicate } = ingestCapture(
      { origin: "in-app", text: "Idea: a weekly digest of everything I saved. It should group items by topic." },
      context(),
    );
    expect(duplicate).toBe(false);
    expect(item).toMatchObject({
      id: "item_1",
      status: "pending",
      origin: "in-app",
      sourceType: "text",
      contentKind: "note",
      summary: "",
      createdAt: NOW.toISOString(),
    });
    expect(item.title).toBe("Idea: a weekly digest of everything I saved");
    expect(item.content).toContain("group items by topic");
  });

  it("creates a URL item from an in-app URL and keeps the original URL", () => {
    const { item } = ingestCapture({ origin: "in-app", text: "https://www.youtube.com/watch?v=abc&utm_source=x" }, context());
    expect(item.sourceType).toBe("youtube");
    expect(item.platform).toBe("youtube");
    expect(item.sourceUrl).toBe("https://www.youtube.com/watch?v=abc&utm_source=x");
    expect(item.content).toBe("");
  });

  it("handles the Chrome extension payload: url, page title, selection and note", () => {
    const { item } = ingestCapture(
      {
        origin: "extension",
        url: "https://example.com/post",
        title: "A great post",
        text: "The selected paragraph.",
        note: "Use in the design review",
      },
      context(),
    );
    expect(item).toMatchObject({ origin: "extension", title: "A great post", sourceType: "website", sourceUrl: "https://example.com/post" });
    expect(item.content).toBe("The selected paragraph.\n\nNote: Use in the design review");
  });

  it("handles a share target that puts the URL inside the text field", () => {
    const input = parseCaptureQuery("?title=Agents&text=Loved%20this%20https%3A%2F%2Fyoutu.be%2Fabc123");
    const { item } = ingestCapture(input!, context());
    expect(input?.origin).toBe("share-target");
    expect(item.sourceType).toBe("youtube");
    expect(item.sourceUrl).toBe("https://youtu.be/abc123");
    expect(item.content).toBe("Loved this");
    expect(item.title).toBe("Agents");
  });

  it("handles clipboard text that is a URL and clipboard text that is a thought", () => {
    expect(ingestFromClipboard("https://example.com/a", context()).item).toMatchObject({ origin: "clipboard", sourceType: "website" });
    expect(ingestFromClipboard("Remember to compare local models for privacy.", context()).item).toMatchObject({
      origin: "clipboard",
      sourceType: "text",
    });
  });

  it("recognises a pasted AI conversation and an AI chat share link", () => {
    const transcript = "You: What is MCP?\nChatGPT: A protocol for connecting tools.\nYou: Why does it matter?";
    expect(looksLikeAiConversation(transcript)).toBe(true);
    expect(ingestCapture({ origin: "in-app", text: transcript }, context()).item).toMatchObject({ sourceType: "chat", contentKind: "conversation" });
    expect(ingestCapture({ origin: "in-app", url: "https://claude.ai/share/abc" }, context()).item.sourceType).toBe("chat");
  });

  it("honours an explicit kind (journal, voice) even when the text contains a URL", () => {
    const journal = ingestCapture({ origin: "in-app", kind: "journal", text: "Read https://example.com today and felt inspired." }, context()).item;
    expect(journal).toMatchObject({ sourceType: "journal", contentKind: "journal" });
    expect(journal.sourceUrl).toBeUndefined();
    expect(ingestCapture({ origin: "voice", kind: "voice", text: "a spoken idea about agents" }, context()).item.sourceType).toBe("voice");
  });

  it("keeps an invalid URL value as text instead of dropping it", () => {
    const { item } = ingestCapture({ origin: "shortcut", url: "not a url", title: "Oops" }, context());
    expect(item.sourceUrl).toBeUndefined();
    expect(item.content).toBe("not a url");
  });

  it("rejects an empty capture", () => {
    expect(() => ingestCapture({ origin: "in-app", text: "   " }, context())).toThrow(EmptyCaptureError);
  });

  it("returns the existing item for a duplicate URL regardless of tracking params", () => {
    const first = ingestCapture({ origin: "in-app", url: "https://youtu.be/dup1" }, context()).item;
    const again = ingestCapture(
      { origin: "extension", url: "https://www.youtube.com/watch?v=dup1&feature=share" },
      { ...context(), existingItems: [first as KnowledgeItem] },
    );
    expect(again.duplicate).toBe(true);
    expect(again.item.id).toBe(first.id);
  });
});

describe("capture query and deep link", () => {
  it("round-trips through buildCaptureDeepLink and parseCaptureQuery", () => {
    const link = buildCaptureDeepLink("https://app.example.com", {
      origin: "bookmarklet",
      url: "https://example.com/a?b=1&c=2",
      title: "Title & more",
      text: "Quote with ünïcode and \"quotes\"",
    });
    expect(link.startsWith("https://app.example.com/capture?")).toBe(true);
    const parsed = parseCaptureQuery(new URL(link).searchParams);
    expect(parsed).toMatchObject({
      origin: "bookmarklet",
      url: "https://example.com/a?b=1&c=2",
      title: "Title & more",
      text: 'Quote with ünïcode and "quotes"',
    });
  });

  it("returns null for an empty query and ignores unknown src or kind values", () => {
    expect(parseCaptureQuery("")).toBeNull();
    expect(parseCaptureQuery("?src=extension")).toBeNull();
    expect(parseCaptureQuery("?url=https%3A%2F%2Fa.com&src=evil&kind=drop")).toMatchObject({ origin: "share-target", kind: undefined });
    expect(ingestFromQuery("", context())).toBeNull();
  });

  it("supports a sub-path app URL", () => {
    expect(buildCaptureDeepLink("https://host.example/lifeos/", { origin: "shortcut", url: "https://a.com" })).toBe(
      "https://host.example/lifeos/capture?url=https%3A%2F%2Fa.com&src=shortcut",
    );
  });
});

describe("Chrome extension contract", () => {
  it("produces links that parseCaptureQuery and ingestCapture accept", () => {
    const link = buildCaptureUrl("http://localhost:5173/", {
      url: "https://example.com/post",
      title: "Post",
      text: "Selected",
      note: "Why",
    });
    expect(link.startsWith("http://localhost:5173/capture?")).toBe(true);
    const result = ingestFromQuery(new URL(link).search, context());
    expect(result?.item).toMatchObject({ origin: "extension", title: "Post", sourceUrl: "https://example.com/post" });
    expect(result?.item.content).toBe("Selected\n\nNote: Why");
  });

  it("matches buildCaptureDeepLink and normalises the configured app URL", () => {
    const payload = { url: "https://example.com/x", title: "X" };
    expect(buildCaptureUrl("http://localhost:5173", payload)).toBe(
      buildCaptureDeepLink("http://localhost:5173", { origin: "extension", ...payload }),
    );
    expect(normalizeAppUrl("")).toBe(DEFAULT_APP_URL);
    expect(normalizeAppUrl("javascript:alert(1)")).toBe(DEFAULT_APP_URL);
    expect(normalizeAppUrl(" https://life.example.com/app/ ")).toBe("https://life.example.com/app");
  });
});

describe("clipboard detection", () => {
  it("suggests URLs and substantial text, ignores short text and values already offered", () => {
    const url = suggestFromClipboard("https://youtu.be/abc");
    expect(url).toMatchObject({ kind: "url", platform: "youtube", input: { origin: "clipboard", kind: "url" } });
    expect(suggestFromClipboard("ok")).toBeNull();
    expect(suggestFromClipboard("   ")).toBeNull();
    expect(suggestFromClipboard("https://youtu.be/abc", [fingerprint("https://youtu.be/abc")])).toBeNull();
    expect(suggestFromClipboard("A thought worth keeping about local models.")?.kind).toBe("text");
  });

  it("reports unsupported, denied, empty and ok reads", async () => {
    expect(await readClipboardText({})).toEqual({ status: "unsupported" });
    expect(await readClipboardText({ readText: async () => { throw new Error("denied"); } })).toEqual({ status: "denied" });
    expect(await readClipboardText({ readText: async () => "  " })).toEqual({ status: "empty" });
    expect(await readClipboardText({ readText: async () => "hello there" })).toEqual({ status: "ok", text: "hello there" });
  });
});

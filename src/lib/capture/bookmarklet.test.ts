import { describe, expect, it, vi } from "vitest";
import { BOOKMARKLET_TEMPLATE, buildBookmarklet } from "./bookmarklet";
import { ingestFromQuery } from "./inbound";

function run(bookmarklet: string, page: { href: string; title: string; selection?: string }) {
  const code = decodeURIComponent(bookmarklet.replace(/^javascript:/, ""));
  const open = vi.fn(() => ({}) as Window);
  const fakeWindow = { getSelection: () => page.selection ?? "", open };
  const fakeDocument = { title: page.title };
  const fakeLocation = { href: page.href };
  new Function("window", "document", "location", code)(fakeWindow, fakeDocument, fakeLocation);
  return open;
}

describe("bookmarklet", () => {
  it("is a javascript: URL with no raw spaces or double quotes, so it survives copy and paste", () => {
    const bookmarklet = buildBookmarklet("https://app.example.com/");
    expect(bookmarklet.startsWith("javascript:")).toBe(true);
    expect(bookmarklet).not.toMatch(/ /);
    expect(bookmarklet).not.toContain('"');
    expect(BOOKMARKLET_TEMPLATE).not.toContain('"');
  });

  it("opens the capture deep link with page URL, title and selection", () => {
    const open = run(buildBookmarklet("https://app.example.com"), {
      href: "https://example.com/article?id=7&utm_source=news",
      title: "An article & more",
      selection: "Quoted passage",
    });
    expect(open).toHaveBeenCalledTimes(1);
    const [opened] = open.mock.calls[0] as unknown as [string, string];
    expect(opened.startsWith("https://app.example.com/capture?src=bookmarklet")).toBe(true);

    const result = ingestFromQuery(new URL(opened).search);
    expect(result?.item).toMatchObject({
      origin: "bookmarklet",
      title: "An article & more",
      sourceUrl: "https://example.com/article?id=7&utm_source=news",
      content: "Quoted passage",
    });
  });

  it("omits the text param when nothing is selected", () => {
    const open = run(buildBookmarklet("https://app.example.com/lifeos"), { href: "https://example.com/", title: "Home" });
    const [opened] = open.mock.calls[0] as unknown as [string];
    expect(opened.startsWith("https://app.example.com/lifeos/capture?")).toBe(true);
    expect(new URL(opened).searchParams.has("text")).toBe(false);
  });
});

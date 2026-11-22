import { describe, expect, it } from "vitest";
import { detectUrl, extractFirstUrl, isUrl, normalizeUrl, urlsMatch } from "./url-detector";

describe("detectUrl", () => {
  it.each([
    ["https://www.youtube.com/watch?v=abc123&utm_source=x", "youtube", "youtube", "video", "YouTube"],
    ["https://youtu.be/abc123?si=tracking", "youtube", "youtube", "video", "YouTube"],
    ["https://www.instagram.com/reel/Cxyz/?igsh=1", "instagram", "instagram", "reel", "Instagram"],
    ["https://www.instagram.com/p/Cxyz/", "instagram", "instagram", "link", "Instagram"],
    ["https://open.spotify.com/episode/123", "spotify", "podcast", "podcast", "Spotify"],
    ["https://open.spotify.com/track/123", "spotify", "website", "link", "Spotify"],
    ["https://podcasts.apple.com/us/podcast/x/id1", "apple-podcasts", "podcast", "podcast", "Apple Podcasts"],
    ["https://someone.substack.com/p/post", "substack", "website", "article", "Substack"],
    ["https://github.com/org/repo", "github", "website", "link", "GitHub"],
    ["https://x.com/user/status/1", "x", "website", "link", "X"],
    ["https://claude.ai/share/abc", "chat", "chat", "conversation", "AI chat"],
    ["https://example.org/blog/post", "website", "website", "link", "example.org"],
  ])("classifies %s", (url, platform, sourceType, contentKind, sourceName) => {
    const detected = detectUrl(url);
    expect(detected).toMatchObject({ platform, sourceType, contentKind, sourceName });
  });

  it("returns null for plain text and non-http schemes", () => {
    expect(detectUrl("remember to buy milk")).toBeNull();
    expect(detectUrl("ftp://example.com/file")).toBeNull();
    expect(detectUrl("javascript:alert(1)")).toBeNull();
    expect(detectUrl("notes.md")).toBeNull();
  });

  it("accepts a scheme-less URL only for www or known platforms", () => {
    expect(detectUrl("www.example.com/post")?.platform).toBe("website");
    expect(detectUrl("youtube.com/watch?v=1")?.platform).toBe("youtube");
    expect(detectUrl("example.com/post")).toBeNull();
  });
});

describe("normalizeUrl", () => {
  it("makes equivalent YouTube links identical", () => {
    const canonical = "https://youtube.com/watch?v=abc123";
    expect(normalizeUrl("https://www.youtube.com/watch?v=abc123&t=30s&feature=share")).toBe(canonical);
    expect(normalizeUrl("https://youtu.be/abc123")).toBe(canonical);
    expect(normalizeUrl("https://m.youtube.com/watch?v=abc123")).toBe(canonical);
  });

  it("strips tracking params, fragments and trailing slashes but keeps meaningful params in a stable order", () => {
    expect(normalizeUrl("https://Example.com/a/?b=2&utm_campaign=x&a=1#top")).toBe("https://example.com/a?a=1&b=2");
  });

  it("drops all Instagram query params and maps /reels/ to /reel/", () => {
    expect(normalizeUrl("https://instagram.com/reels/Cxyz/?igsh=abc")).toBe("https://instagram.com/reel/Cxyz");
  });

  it("urlsMatch compares normalised forms", () => {
    expect(urlsMatch("https://youtu.be/q1", "https://www.youtube.com/watch?v=q1&si=z")).toBe(true);
    expect(urlsMatch("https://a.com/x", "https://a.com/y")).toBe(false);
    expect(urlsMatch(undefined, "https://a.com")).toBe(false);
  });
});

describe("extractFirstUrl", () => {
  it("finds a URL inside share-sheet text and returns the rest", () => {
    expect(extractFirstUrl("Great talk on agents https://youtu.be/abc123")).toEqual({
      url: "https://youtu.be/abc123",
      rest: "Great talk on agents",
    });
  });

  it("strips trailing punctuation", () => {
    expect(extractFirstUrl("see (https://example.com/page).")?.url).toBe("https://example.com/page");
  });

  it("returns null when there is no URL", () => {
    expect(extractFirstUrl("just a thought")).toBeNull();
  });

  it("isUrl is false for sentences containing a URL", () => {
    expect(isUrl("read https://example.com later")).toBe(false);
  });
});

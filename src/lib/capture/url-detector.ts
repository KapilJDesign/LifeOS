import type { ContentKind, PlatformKey, SourceType } from "../../types/knowledge";

export interface DetectedUrl {
  /** The URL as captured (trimmed, scheme added if it was missing). */
  url: string;
  /** Canonical form used for duplicate detection. */
  normalizedUrl: string;
  hostname: string;
  platform: PlatformKey;
  sourceType: SourceType;
  contentKind: ContentKind;
  /** Human-readable source label, e.g. "YouTube" or the hostname. */
  sourceName: string;
}

interface PlatformRule {
  platform: PlatformKey;
  sourceType: SourceType;
  sourceName: string;
  contentKind: ContentKind;
  hosts: (string | RegExp)[];
  /** Optional path-based refinement of the content kind. */
  refine?: (path: string) => { contentKind?: ContentKind; sourceType?: SourceType } | undefined;
}

const PLATFORM_RULES: PlatformRule[] = [
  {
    platform: "youtube",
    sourceType: "youtube",
    sourceName: "YouTube",
    contentKind: "video",
    hosts: ["youtube.com", "youtu.be", "music.youtube.com", "youtube-nocookie.com"],
  },
  {
    platform: "instagram",
    sourceType: "instagram",
    sourceName: "Instagram",
    contentKind: "link",
    hosts: ["instagram.com", "instagr.am"],
    refine: (path) => (/^\/(reel|reels)\//.test(path) ? { contentKind: "reel" } : undefined),
  },
  {
    platform: "tiktok",
    sourceType: "website",
    sourceName: "TikTok",
    contentKind: "reel",
    hosts: ["tiktok.com", "vm.tiktok.com"],
  },
  {
    platform: "x",
    sourceType: "website",
    sourceName: "X",
    contentKind: "link",
    hosts: ["x.com", "twitter.com"],
  },
  {
    platform: "linkedin",
    sourceType: "website",
    sourceName: "LinkedIn",
    contentKind: "link",
    hosts: ["linkedin.com", "lnkd.in"],
  },
  {
    platform: "reddit",
    sourceType: "website",
    sourceName: "Reddit",
    contentKind: "link",
    hosts: ["reddit.com", "redd.it"],
  },
  {
    platform: "github",
    sourceType: "website",
    sourceName: "GitHub",
    contentKind: "link",
    hosts: ["github.com", "gist.github.com"],
  },
  {
    platform: "medium",
    sourceType: "website",
    sourceName: "Medium",
    contentKind: "article",
    hosts: ["medium.com", /\.medium\.com$/],
  },
  {
    platform: "substack",
    sourceType: "website",
    sourceName: "Substack",
    contentKind: "article",
    hosts: [/\.substack\.com$/, "substack.com"],
  },
  {
    platform: "spotify",
    sourceType: "website",
    sourceName: "Spotify",
    contentKind: "link",
    hosts: ["open.spotify.com", "spotify.link"],
    refine: (path) =>
      /^\/(episode|show)\//.test(path) ? { contentKind: "podcast", sourceType: "podcast" } : undefined,
  },
  {
    platform: "apple-podcasts",
    sourceType: "podcast",
    sourceName: "Apple Podcasts",
    contentKind: "podcast",
    hosts: ["podcasts.apple.com"],
  },
  {
    platform: "chat",
    sourceType: "chat",
    sourceName: "AI chat",
    contentKind: "conversation",
    hosts: ["chatgpt.com", "chat.openai.com", "gemini.google.com", "claude.ai", "perplexity.ai", "copilot.microsoft.com"],
  },
  {
    platform: "podcast",
    sourceType: "podcast",
    sourceName: "",
    contentKind: "podcast",
    hosts: ["overcast.fm", "pca.st", "castro.fm", "podcasts.google.com"],
  },
];

const TRACKING_PARAMS = /^(utm_.+|fbclid|gclid|igshid|igsh|si|feature|ref|ref_src|mc_cid|mc_eid|spm|share_id)$/i;

const URL_IN_TEXT = /(?:https?:\/\/|www\.)[^\s<>"'`]+/i;

const TRAILING_PUNCTUATION = /[)\]}.,;:!?'"”’]+$/;

function stripWww(host: string): string {
  return host.replace(/^(www|m|mobile)\./, "");
}

function hostMatches(host: string, hosts: (string | RegExp)[]): boolean {
  return hosts.some((entry) =>
    typeof entry === "string" ? host === entry || host.endsWith(`.${entry}`) : entry.test(host),
  );
}

function parse(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (!parsed.hostname.includes(".")) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** A bare domain such as "example.com/post" is only treated as a URL when it carries a scheme, "www.", or a known platform host. */
function looksLikeUrl(input: string): boolean {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed)) return true;
  const parsed = parse(trimmed);
  if (!parsed) return false;
  const host = stripWww(parsed.hostname.toLowerCase());
  return PLATFORM_RULES.some((rule) => hostMatches(host, rule.hosts));
}

export function normalizeUrl(input: string): string | null {
  const parsed = parse(input);
  if (!parsed) return null;

  let host = stripWww(parsed.hostname.toLowerCase());
  let path = parsed.pathname.replace(/\/{2,}/g, "/");
  const params = new URLSearchParams(parsed.search);

  if (host === "youtu.be") {
    const id = path.split("/").filter(Boolean)[0];
    host = "youtube.com";
    path = "/watch";
    params.set("v", id ?? "");
  } else if (host === "music.youtube.com" || host === "youtube-nocookie.com") {
    host = "youtube.com";
  }

  if (host === "youtube.com" && path === "/watch") {
    const v = params.get("v");
    params.forEach((_, key) => {
      if (key !== "v") params.delete(key);
    });
    if (v) params.set("v", v);
  }

  if (host === "instagram.com") {
    path = path.replace(/^\/reels\//, "/reel/");
    params.forEach((_, key) => params.delete(key));
  }

  for (const key of [...params.keys()]) {
    if (TRACKING_PARAMS.test(key)) params.delete(key);
  }
  params.sort();

  if (path.length > 1) path = path.replace(/\/+$/, "");
  const query = params.toString();
  return `https://${host}${path === "/" ? "" : path}${query ? `?${query}` : ""}`;
}

export function isUrl(input: string): boolean {
  return looksLikeUrl(input) && parse(input) !== null;
}

export function detectUrl(input: string): DetectedUrl | null {
  if (!looksLikeUrl(input)) return null;
  const parsed = parse(input);
  const normalizedUrl = normalizeUrl(input);
  if (!parsed || !normalizedUrl) return null;

  const hostname = stripWww(parsed.hostname.toLowerCase());
  const url = /^https?:\/\//i.test(input.trim()) ? input.trim() : parsed.toString();
  const rule = PLATFORM_RULES.find((entry) => hostMatches(hostname, entry.hosts));

  if (!rule) {
    return {
      url,
      normalizedUrl,
      hostname,
      platform: "website",
      sourceType: "website",
      contentKind: "link",
      sourceName: hostname,
    };
  }

  const refined = rule.refine?.(parsed.pathname);
  return {
    url,
    normalizedUrl,
    hostname,
    platform: rule.platform,
    sourceType: refined?.sourceType ?? rule.sourceType,
    contentKind: refined?.contentKind ?? rule.contentKind,
    sourceName: rule.sourceName || hostname,
  };
}

/** Finds the first URL in free text and returns the remaining text. Handles share sheets that put the URL inside `text`. */
export function extractFirstUrl(text: string): { url: string; rest: string } | null {
  const match = URL_IN_TEXT.exec(text);
  if (!match) return null;
  const url = match[0].replace(TRAILING_PUNCTUATION, "");
  if (!isUrl(url)) return null;
  const rest = (text.slice(0, match.index) + text.slice(match.index + url.length))
    .replace(/\s+/g, " ")
    .trim();
  return { url, rest };
}

export function urlsMatch(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const left = normalizeUrl(a);
  return left !== null && left === normalizeUrl(b);
}

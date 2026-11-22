import type {
  CaptureInput,
  CaptureKind,
  CaptureOrigin,
  ContentKind,
  KnowledgeItem,
  PlatformKey,
  SourceType,
} from "../../types/knowledge";
import { defaultIdGenerator, type IdGenerator } from "../ids";
import { detectUrl, extractFirstUrl, type DetectedUrl } from "./url-detector";

export class EmptyCaptureError extends Error {
  constructor() {
    super("Nothing to capture: no text, URL or note was provided.");
    this.name = "EmptyCaptureError";
  }
}

export interface IngestContext {
  /** Existing items, used for duplicate detection. */
  existingItems?: readonly KnowledgeItem[];
  now?: () => Date;
  idGenerator?: IdGenerator;
}

export interface IngestResult {
  item: KnowledgeItem;
  /** True when an equivalent item already exists; `item` is then the existing one and nothing new was created. */
  duplicate: boolean;
}

const MAX_TITLE_LENGTH = 80;
/** A URL plus this much surrounding text is still treated as "a link with a note". */
const MAX_NOTE_AROUND_URL = 600;

const AI_CHAT_SPEAKER = /^\s*(you|user|human|me|chatgpt|assistant|gemini|claude|copilot|ai)\s*[:：]/im;

const INBOUND_ORIGINS: readonly CaptureOrigin[] = [
  "in-app",
  "voice",
  "extension",
  "share-target",
  "bookmarklet",
  "shortcut",
  "clipboard",
  "import",
];

export function looksLikeAiConversation(text: string): boolean {
  const lines = text.split(/\r?\n/).filter((line) => AI_CHAT_SPEAKER.test(line));
  return lines.length >= 2;
}

function clean(value: string | undefined): string {
  return (value ?? "").replace(/\r\n/g, "\n").trim();
}

function titleFromText(text: string): string {
  const firstLine = text.split("\n").find((line) => line.trim()) ?? text;
  const sentence = /^(.{12,}?[.!?])(\s|$)/.exec(firstLine.trim())?.[1] ?? firstLine.trim();
  if (sentence.length <= MAX_TITLE_LENGTH) return sentence.replace(/[.!?]+$/, "") || sentence;
  const cut = sentence.slice(0, MAX_TITLE_LENGTH);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

function titleFromUrl(detected: DetectedUrl): string {
  const segments = new URL(detected.normalizedUrl).pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  if (!last || last.length < 4) return `${detected.sourceName} link`;
  const pretty = decodeURIComponent(last).replace(/[-_]+/g, " ").replace(/\.\w{2,5}$/, "").trim();
  return /^[a-z0-9]{8,}$/i.test(pretty) ? `${detected.sourceName} link` : pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

function resolveKind(input: CaptureInput, hasUrl: boolean, text: string, detected: DetectedUrl | null): CaptureKind {
  if (input.kind) return input.kind;
  if (detected?.sourceType === "chat") return "chat";
  if (hasUrl) return "url";
  if (looksLikeAiConversation(text)) return "chat";
  return "text";
}

function sourceFor(kind: CaptureKind, detected: DetectedUrl | null): {
  sourceType: SourceType;
  contentKind: ContentKind;
  platform: PlatformKey;
  sourceName?: string;
} {
  if (detected && (kind === "url" || kind === "chat")) {
    return {
      sourceType: detected.sourceType,
      contentKind: detected.contentKind,
      platform: detected.platform,
      sourceName: detected.sourceName,
    };
  }
  switch (kind) {
    case "voice":
      return { sourceType: "voice", contentKind: "voice_note", platform: "voice", sourceName: "Voice note" };
    case "journal":
      return { sourceType: "journal", contentKind: "journal", platform: "journal", sourceName: "Journal" };
    case "chat":
      return { sourceType: "chat", contentKind: "conversation", platform: "chat", sourceName: "AI chat" };
    default:
      return { sourceType: "text", contentKind: "note", platform: "text", sourceName: "Note" };
  }
}

/**
 * The single inbound function. Every channel (in-app capture bar, Chrome extension deep link,
 * PWA share target, bookmarklet, iOS Shortcut, clipboard) produces a `CaptureInput` and calls this.
 * It is pure: it returns a pending item and does not persist or process anything.
 */
export function ingestCapture(input: CaptureInput, context: IngestContext = {}): IngestResult {
  const now = (context.now ?? (() => new Date()))();
  const makeId = context.idGenerator ?? defaultIdGenerator;

  let text = clean(input.text);
  const note = clean(input.note);
  let urlCandidate = clean(input.url);
  const explicitTitle = clean(input.title);
  const freeform = input.kind === "journal" || input.kind === "voice" || input.kind === "chat";

  if (!urlCandidate && text && !freeform) {
    const extracted = extractFirstUrl(text);
    if (extracted && extracted.rest.length <= MAX_NOTE_AROUND_URL) {
      urlCandidate = extracted.url;
      text = extracted.rest;
    }
  }

  let detected = urlCandidate ? detectUrl(urlCandidate) : null;
  if (urlCandidate && !detected) {
    // The "URL" was not valid; keep what the user gave us rather than dropping it.
    text = [urlCandidate, text].filter(Boolean).join("\n");
    urlCandidate = "";
    detected = null;
  }

  if (!detected && !text && !note && !explicitTitle) throw new EmptyCaptureError();

  const content = [text, note && text ? `Note: ${note}` : note].filter(Boolean).join("\n\n");
  const kind = resolveKind(input, Boolean(detected), content, detected);
  const source = sourceFor(kind, detected);

  const existing = context.existingItems;
  if (existing) {
    const duplicate = detected
      ? existing.find((item) => item.sourceUrl && detectUrl(item.sourceUrl)?.normalizedUrl === detected.normalizedUrl)
      : existing.find(
          (item) => !item.sourceUrl && item.content.trim().toLowerCase() === content.toLowerCase() && content.length > 0,
        );
    if (duplicate) return { item: duplicate, duplicate: true };
  }

  const timestamp = clean(input.capturedAt) || now.toISOString();
  const title =
    explicitTitle || (content ? titleFromText(content) : detected ? titleFromUrl(detected) : "Untitled capture");

  const item: KnowledgeItem = {
    id: makeId("item"),
    title,
    content,
    summary: "",
    sourceType: source.sourceType,
    contentKind: source.contentKind,
    platform: source.platform,
    sourceUrl: detected?.url,
    sourceName: source.sourceName,
    tags: [],
    concepts: [],
    keyTakeaways: [],
    actions: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    isFavorite: false,
    status: "pending",
    origin: input.origin,
    review: { viewCount: 0 },
  };
  return { item, duplicate: false };
}

/**
 * Parses the deep-link / share-target query string: `?url=&title=&text=&note=&src=&kind=`.
 * Returns null when the link carries nothing capturable (for example the user opened `/capture` directly).
 * A missing or unknown `src` means the browser launched us as an OS share target, which cannot add its own params.
 */
export function parseCaptureQuery(search: string | URLSearchParams): CaptureInput | null {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const get = (key: string) => params.get(key)?.trim() || undefined;

  const url = get("url");
  const title = get("title");
  const text = get("text");
  const note = get("note");
  if (!url && !title && !text && !note) return null;

  const src = get("src") as CaptureOrigin | undefined;
  const origin: CaptureOrigin = src && INBOUND_ORIGINS.includes(src) ? src : "share-target";
  const kind = get("kind") as CaptureKind | undefined;
  const allowedKinds: CaptureKind[] = ["text", "url", "voice", "journal", "chat", "reminder"];

  return {
    origin,
    url,
    title,
    text,
    note,
    kind: kind && allowedKinds.includes(kind) ? kind : undefined,
  };
}

/** Inverse of `parseCaptureQuery`; used by the extension, the bookmarklet and Shortcut instructions. */
export function buildCaptureDeepLink(appUrl: string, input: Omit<CaptureInput, "capturedAt">): string {
  const base = new URL(appUrl);
  const path = base.pathname.replace(/\/+$/, "");
  const link = new URL(`${path}/capture`, base.origin);
  const set = (key: string, value: string | undefined) => {
    if (value?.trim()) link.searchParams.set(key, value.trim());
  };
  set("url", input.url);
  set("title", input.title);
  set("text", input.text);
  set("note", input.note);
  set("kind", input.kind);
  link.searchParams.set("src", input.origin);
  return link.toString();
}

export function ingestFromQuery(search: string | URLSearchParams, context?: IngestContext): IngestResult | null {
  const input = parseCaptureQuery(search);
  return input ? ingestCapture(input, context) : null;
}

export function ingestFromClipboard(text: string, context?: IngestContext): IngestResult {
  return ingestCapture({ origin: "clipboard", text }, context);
}

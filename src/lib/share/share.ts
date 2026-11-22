import type { KnowledgeItem, TopicCollection } from "../../types/knowledge";

export type ShareTarget =
  | { kind: "item"; item: KnowledgeItem }
  | { kind: "card"; item: KnowledgeItem }
  | { kind: "collection"; topic: TopicCollection; items: readonly KnowledgeItem[] }
  /** Clipboard-only actions. */
  | { kind: "summary"; item: KnowledgeItem }
  | { kind: "source-link"; item: KnowledgeItem };

export interface SharePayload {
  title: string;
  text: string;
  url?: string;
}

export type ShareMethod = "native" | "clipboard" | "none";

export interface ShareResult {
  ok: boolean;
  method: ShareMethod;
  /** The user dismissed the native share sheet. Not an error. */
  cancelled?: boolean;
  payload: SharePayload;
  error?: string;
}

export interface ShareEnv {
  navigator?: {
    share?: (data: ShareData) => Promise<void>;
    canShare?: (data?: ShareData) => boolean;
    clipboard?: { writeText?: (text: string) => Promise<void> };
  };
  /** Used for the legacy copy fallback on insecure origins (for example the dev server opened by LAN IP on a phone). */
  document?: Pick<Document, "createElement" | "body" | "execCommand">;
}

const SIGNATURE = "Saved with Life OS";
const COLLECTION_ITEM_LIMIT = 8;

function bullets(values: readonly string[]): string {
  return values.map((value) => `• ${value}`).join("\n");
}

export function buildSharePayload(target: ShareTarget): SharePayload {
  switch (target.kind) {
    case "item": {
      const { item } = target;
      const parts = [item.title, item.summary, item.keyTakeaways.length ? `Key takeaways:\n${bullets(item.keyTakeaways)}` : "", item.sourceUrl ? `Source: ${item.sourceUrl}` : "", SIGNATURE];
      return { title: item.title, text: parts.filter(Boolean).join("\n\n"), url: item.sourceUrl };
    }
    case "card": {
      const { item } = target;
      const insight = item.keyTakeaways[0] ?? item.summary;
      const parts = [item.title, insight, item.tags.length ? item.tags.map((tag) => `#${tag.replace(/\s+/g, "")}`).join(" ") : "", SIGNATURE];
      return { title: item.title, text: parts.filter(Boolean).join("\n\n"), url: item.sourceUrl };
    }
    case "collection": {
      const { topic, items } = target;
      const shown = items.slice(0, COLLECTION_ITEM_LIMIT).map((item) => item.title);
      const more = items.length > COLLECTION_ITEM_LIMIT ? `\n…and ${items.length - COLLECTION_ITEM_LIMIT} more` : "";
      const text = [`${topic.name} (${items.length} saved ${items.length === 1 ? "item" : "items"})`, topic.description, `${bullets(shown)}${more}`, SIGNATURE]
        .filter(Boolean)
        .join("\n\n");
      return { title: topic.name, text };
    }
    case "summary":
      return { title: target.item.title, text: `${target.item.title}\n\n${target.item.summary}` };
    case "source-link":
      return { title: target.item.title, text: target.item.sourceUrl ?? "", url: target.item.sourceUrl };
  }
}

function resolveNavigator(env: ShareEnv): NonNullable<ShareEnv["navigator"]> {
  return env.navigator ?? (typeof navigator !== "undefined" ? (navigator as NonNullable<ShareEnv["navigator"]>) : {});
}

export function canShareNatively(env: ShareEnv = {}): boolean {
  return typeof resolveNavigator(env).share === "function";
}

function clipboardText(payload: SharePayload): string {
  return payload.url && !payload.text.includes(payload.url) ? `${payload.text}\n${payload.url}` : payload.text;
}

function legacyCopy(text: string, doc: ShareEnv["document"]): boolean {
  const target = doc ?? (typeof document !== "undefined" ? document : undefined);
  if (!target?.body) return false;
  const area = target.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.insetBlockStart = "0";
  area.style.opacity = "0";
  target.body.appendChild(area);
  area.select();
  try {
    return target.execCommand("copy");
  } finally {
    target.body.removeChild(area);
  }
}

async function copy(payload: SharePayload, env: ShareEnv): Promise<ShareResult> {
  const text = clipboardText(payload);
  if (!text) return { ok: false, method: "none", payload, error: "Nothing to copy" };
  const writeText = resolveNavigator(env).clipboard?.writeText;
  try {
    if (writeText) {
      await writeText.call(resolveNavigator(env).clipboard, text);
      return { ok: true, method: "clipboard", payload };
    }
  } catch {
    // Fall through to the legacy path.
  }
  return legacyCopy(text, env.document)
    ? { ok: true, method: "clipboard", payload }
    : { ok: false, method: "none", payload, error: "Sharing is not available in this browser" };
}

/**
 * Web Share API when available (Android Chrome, iOS Safari, desktop Safari and Edge),
 * otherwise the clipboard. Copy-only targets never open the share sheet.
 */
export async function shareContent(target: ShareTarget, env: ShareEnv = {}): Promise<ShareResult> {
  const payload = buildSharePayload(target);
  if (target.kind === "summary" || target.kind === "source-link") return copy(payload, env);

  const nav = resolveNavigator(env);
  const data: ShareData = { title: payload.title, text: payload.text, ...(payload.url ? { url: payload.url } : {}) };
  if (typeof nav.share === "function" && (nav.canShare?.(data) ?? true)) {
    try {
      await nav.share(data);
      return { ok: true, method: "native", payload };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return { ok: false, method: "native", cancelled: true, payload };
      }
      if (error && typeof error === "object" && (error as { name?: string }).name === "AbortError") {
        return { ok: false, method: "native", cancelled: true, payload };
      }
    }
  }
  return copy(payload, env);
}

import type { CaptureInput } from "../../types/knowledge";
import { detectUrl } from "./url-detector";

/** A short, stable fingerprint so a clipboard value is only offered once. */
export function fingerprint(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return `${text.length}:${(hash >>> 0).toString(36)}`;
}

export interface ClipboardSuggestion {
  kind: "url" | "text";
  /** Ready to pass to `ingestCapture` when the user accepts. */
  input: CaptureInput;
  fingerprint: string;
  /** Short preview for the "Save what you copied?" prompt. */
  preview: string;
  platform?: string;
}

const MIN_TEXT_LENGTH = 12;
const MAX_TEXT_LENGTH = 20_000;

/**
 * Decides whether clipboard text is worth offering as a capture.
 * URLs always qualify; free text must be long enough to be a thought rather than a stray word.
 * Returns null for empty values and for anything already offered or dismissed (`seenFingerprints`).
 */
export function suggestFromClipboard(
  text: string | null | undefined,
  seenFingerprints: ReadonlySet<string> | readonly string[] = [],
): ClipboardSuggestion | null {
  const value = text?.trim();
  if (!value || value.length > MAX_TEXT_LENGTH) return null;

  const key = fingerprint(value);
  const seen = seenFingerprints instanceof Set ? seenFingerprints : new Set(seenFingerprints);
  if (seen.has(key)) return null;

  const detected = detectUrl(value);
  if (detected) {
    return {
      kind: "url",
      input: { origin: "clipboard", kind: "url", url: detected.url },
      fingerprint: key,
      preview: detected.url,
      platform: detected.platform,
    };
  }

  if (value.length < MIN_TEXT_LENGTH) return null;
  return {
    kind: "text",
    input: { origin: "clipboard", text: value },
    fingerprint: key,
    preview: value.length > 120 ? `${value.slice(0, 117)}…` : value,
  };
}

export type ClipboardReadResult =
  | { status: "ok"; text: string }
  | { status: "empty" }
  | { status: "denied" }
  | { status: "unsupported" };

interface ClipboardLike {
  readText?: () => Promise<string>;
}

/**
 * Reads the clipboard. Must be called from a user gesture on iOS Safari, which also shows its own
 * "Paste" confirmation; desktop Chrome and Android Chrome ask for the clipboard-read permission once.
 */
export async function readClipboardText(clipboard?: ClipboardLike): Promise<ClipboardReadResult> {
  const source = clipboard ?? (typeof navigator !== "undefined" ? navigator.clipboard : undefined);
  if (!source?.readText) return { status: "unsupported" };
  try {
    const text = await source.readText();
    return text.trim() ? { status: "ok", text } : { status: "empty" };
  } catch {
    return { status: "denied" };
  }
}

// Shared by the popup, the service worker and the options page. Plain ES module, no build step.

export const DEFAULT_APP_URL = "http://localhost:5173";
export const MAX_TEXT_LENGTH = 2000;

/**
 * Returns the app's base URL (origin plus optional sub-path, no trailing slash).
 * Falls back to the default for empty or non-http(s) values.
 */
export function normalizeAppUrl(value) {
  try {
    const parsed = new URL(String(value ?? "").trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return DEFAULT_APP_URL;
    return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
  } catch {
    return DEFAULT_APP_URL;
  }
}

/**
 * Builds the deep link the Life OS app understands: /capture?src=extension&url=&title=&text=&note=
 * The app side is `parseCaptureQuery` in src/lib/capture/inbound.ts; a test keeps the two in sync.
 */
export function buildCaptureUrl(appUrl, { url, title, text, note } = {}) {
  const link = new URL(`${normalizeAppUrl(appUrl)}/capture`);
  const set = (key, value, max) => {
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (trimmed) link.searchParams.set(key, max ? trimmed.slice(0, max) : trimmed);
  };
  set("url", url);
  set("title", title, 300);
  set("text", text, MAX_TEXT_LENGTH);
  set("note", note, MAX_TEXT_LENGTH);
  link.searchParams.set("src", "extension");
  return link.toString();
}

/** Browser-internal pages (chrome://, the Web Store, new tab) cannot be scripted or meaningfully saved. */
export function isCapturablePage(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    return parsed.hostname !== "chrome.google.com" && parsed.hostname !== "chromewebstore.google.com";
  } catch {
    return false;
  }
}

export async function getAppUrl() {
  const stored = await chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL });
  return normalizeAppUrl(stored.appUrl);
}

export async function getOpenInTab() {
  const stored = await chrome.storage.sync.get({ openInTab: false });
  return Boolean(stored.openInTab);
}

/** Opens the capture deep link in a small popup window (default) or a new tab. */
export async function openCapture(payload) {
  const [appUrl, openInTab] = await Promise.all([getAppUrl(), getOpenInTab()]);
  const url = buildCaptureUrl(appUrl, payload);
  if (openInTab) return chrome.tabs.create({ url });
  return chrome.windows.create({ url, type: "popup", width: 440, height: 720 });
}

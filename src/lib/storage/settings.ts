export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type ThemePreference = "system" | "light" | "dark";

export interface AppSettings {
  schemaVersion: number;
  /** Where deep links and the bookmarklet point. Defaults to the current origin. */
  appUrl: string;
  theme: ThemePreference;
  /** Offer to save a copied link or text when the app regains focus. */
  clipboardPrompt: boolean;
  /** Fingerprints of clipboard values already offered, so the same value is never offered twice. */
  seenClipboard: string[];
}

export const SETTINGS_KEY = "lifeos.settings";
export const SETTINGS_VERSION = 1;
const MAX_SEEN_CLIPBOARD = 25;

export function defaultSettings(appUrl = typeof location !== "undefined" ? location.origin : "http://localhost:5173"): AppSettings {
  return { schemaVersion: SETTINGS_VERSION, appUrl, theme: "system", clipboardPrompt: true, seenClipboard: [] };
}

function safeStorage(): KeyValueStorage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

/** Small preferences live in localStorage; everything else is in IndexedDB. Corrupt or newer data falls back to defaults. */
export function loadSettings(storage: KeyValueStorage | undefined = safeStorage(), appUrl?: string): AppSettings {
  const defaults = defaultSettings(appUrl);
  const raw = storage?.getItem(SETTINGS_KEY);
  if (!raw) return defaults;
  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    if (typeof parsed !== "object" || parsed === null) return defaults;
    return {
      schemaVersion: SETTINGS_VERSION,
      appUrl: typeof parsed.appUrl === "string" && parsed.appUrl ? parsed.appUrl : defaults.appUrl,
      theme: parsed.theme === "light" || parsed.theme === "dark" || parsed.theme === "system" ? parsed.theme : defaults.theme,
      clipboardPrompt: typeof parsed.clipboardPrompt === "boolean" ? parsed.clipboardPrompt : defaults.clipboardPrompt,
      seenClipboard: Array.isArray(parsed.seenClipboard) ? parsed.seenClipboard.filter((v) => typeof v === "string") : [],
    };
  } catch {
    return defaults;
  }
}

export function saveSettings(settings: AppSettings, storage: KeyValueStorage | undefined = safeStorage()): void {
  try {
    storage?.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...settings, seenClipboard: settings.seenClipboard.slice(-MAX_SEEN_CLIPBOARD) }),
    );
  } catch {
    // Storage can be full or blocked; settings then last for this session only.
  }
}

export function updateSettings(patch: Partial<AppSettings>, storage?: KeyValueStorage): AppSettings {
  const next = { ...loadSettings(storage), ...patch };
  saveSettings(next, storage);
  return next;
}

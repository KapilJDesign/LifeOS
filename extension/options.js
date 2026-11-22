import { DEFAULT_APP_URL, normalizeAppUrl } from "./capture-link.js";

const appUrl = document.getElementById("app-url");
const openInTab = document.getElementById("open-in-tab");
const status = document.getElementById("status");

async function load() {
  const stored = await chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL, openInTab: false });
  appUrl.value = stored.appUrl;
  openInTab.checked = Boolean(stored.openInTab);
}

async function save() {
  const normalized = normalizeAppUrl(appUrl.value);
  await chrome.storage.sync.set({ appUrl: normalized, openInTab: openInTab.checked });
  appUrl.value = normalized;
  status.textContent = "Saved.";
}

document.getElementById("save").addEventListener("click", save);
load();

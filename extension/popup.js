import { MAX_TEXT_LENGTH, isCapturablePage, openCapture } from "./capture-link.js";

const els = {
  title: document.getElementById("page-title"),
  url: document.getElementById("page-url"),
  selectionBlock: document.getElementById("selection-block"),
  selection: document.getElementById("selection-text"),
  note: document.getElementById("note"),
  status: document.getElementById("status"),
  save: document.getElementById("save"),
  settings: document.getElementById("settings"),
};

let page = { url: "", title: "", selection: "" };

async function readSelection(tabId) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.getSelection()?.toString() ?? "",
    });
    return (result?.result ?? "").trim().slice(0, MAX_TEXT_LENGTH);
  } catch {
    return "";
  }
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !isCapturablePage(tab.url)) {
    els.title.textContent = "This page can't be saved";
    els.url.textContent = "Open a regular web page and try again.";
    return;
  }

  const selection = await readSelection(tab.id);
  page = { url: tab.url, title: tab.title ?? "", selection };
  els.title.textContent = page.title || page.url;
  els.url.textContent = page.url;
  if (selection) {
    els.selection.textContent = selection;
    els.selectionBlock.hidden = false;
  }
  els.save.disabled = false;
  els.note.focus();
}

async function save() {
  els.save.disabled = true;
  els.status.textContent = "Opening Life OS…";
  try {
    await openCapture({ url: page.url, title: page.title, text: page.selection, note: els.note.value });
    window.close();
  } catch (error) {
    els.status.textContent = `Could not open Life OS: ${error instanceof Error ? error.message : error}`;
    els.save.disabled = false;
  }
}

els.save.addEventListener("click", save);
els.settings.addEventListener("click", () => chrome.runtime.openOptionsPage());
els.note.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !els.save.disabled) save();
});

init();

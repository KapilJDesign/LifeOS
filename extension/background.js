import { isCapturablePage, openCapture } from "./capture-link.js";

const MENU = {
  selection: "lifeos-save-selection",
  link: "lifeos-save-link",
  page: "lifeos-save-page",
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: MENU.selection, title: "Save selection to Life OS", contexts: ["selection"] });
    chrome.contextMenus.create({ id: MENU.link, title: "Save link to Life OS", contexts: ["link"] });
    chrome.contextMenus.create({ id: MENU.page, title: "Save page to Life OS", contexts: ["page"] });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const pageUrl = info.pageUrl ?? tab?.url ?? "";
  switch (info.menuItemId) {
    case MENU.selection:
      return openCapture({ url: pageUrl, title: tab?.title, text: info.selectionText });
    case MENU.link:
      return openCapture({ url: info.linkUrl, text: info.selectionText });
    case MENU.page:
      if (isCapturablePage(pageUrl)) return openCapture({ url: pageUrl, title: tab?.title });
      return undefined;
    default:
      return undefined;
  }
});

/**
 * Bookmarklet for browsers without an extension or share target (notably iOS Safari).
 * It opens the Life OS `/capture` deep link with the current page URL, title and any selected text.
 * The handler in `inbound.ts#parseCaptureQuery` is the other half of this contract.
 */

const APP_PLACEHOLDER = "__LIFEOS_APP__";

/** Minified template. Single quotes only so the result can sit inside an HTML attribute. */
export const BOOKMARKLET_TEMPLATE =
  "(function(){var w=window,d=document,s=w.getSelection?String(w.getSelection()):'';" +
  `var u='${APP_PLACEHOLDER}/capture?src=bookmarklet&url='+encodeURIComponent(location.href)` +
  "+'&title='+encodeURIComponent(d.title);" +
  "if(s)u+='&text='+encodeURIComponent(s.slice(0,2000));" +
  "w.open(u,'_blank')||(location.href=u)})()";

function appBase(appUrl: string): string {
  const parsed = new URL(appUrl);
  return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
}

/** Returns the `javascript:` URL to save as a bookmark. Spaces are percent-encoded so it survives copy and paste. */
export function buildBookmarklet(appUrl: string): string {
  const code = BOOKMARKLET_TEMPLATE.replace(APP_PLACEHOLDER, appBase(appUrl));
  return `javascript:${code.replace(/ /g, "%20")}`;
}

// Layout audit: horizontal overflow, undersized touch targets, console errors, clipped text, per route and width.
import { chromium } from "playwright-core";
const BASE = process.env.BASE || "http://127.0.0.1:8791/index.html";
const routes = ["#/home", "#/explore", "#/graph", "#/library", "#/item/i01", "#/ask", "#/infographic/i01", "#/reminders", "#/journal", "#/settings", "#/welcome", "#/share-target", "#/states"];
const widths = [[320, 568], [390, 844], [768, 1024], [1024, 768], [1440, 900]];
const browser = await chromium.launch({ channel: "chrome" });
let bad = 0;
for (const [w, h] of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 768 });
  for (const r of routes) {
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push("pageerror " + e.message));
    page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    await page.goto(BASE + r);
    await page.waitForTimeout(r.includes("share-target") ? 3200 : 700);
    const res = await page.evaluate(() => {
      const out = { overflow: null, small: [], clipped: [] };
      const de = document.documentElement;
      if (de.scrollWidth > de.clientWidth + 1) {
        const offenders = [];
        document.querySelectorAll("body *").forEach((el) => { const b = el.getBoundingClientRect(); if (b.width && b.right > de.clientWidth + 1 && getComputedStyle(el).position !== "fixed" && !el.closest(".rail, .chips.scroll, .det-actions, .tablist, .cap-tabs, .gr-svg, .gr-canvas, .film, .askrail")) offenders.push(el.tagName.toLowerCase() + "." + String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).split(" ")[0] + ":" + Math.round(b.right)); });
        out.overflow = { sw: de.scrollWidth, cw: de.clientWidth, offenders: offenders.slice(0, 4) };
      }
      const vis = (el) => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 0 && b.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && b.bottom > 0 && b.top < innerHeight + 4000; };
      document.querySelectorAll("a[href], button, input:not([type=hidden]):not([type=checkbox]), select, textarea, [role=button], [role=radio], [role=tab], [role=switch]").forEach((el) => {
        if (!vis(el)) return;
        if (el.closest(".node, .gr-svg") ) return;
        if (el.closest("p, li.steps, .read, .steps, .ans-p, .insights") && el.tagName === "A") return;
        let b = el.getBoundingClientRect(); let w = b.width, h = b.height;
        const cs = getComputedStyle(el);
        const aft = getComputedStyle(el, "::after");
        if (aft.position === "absolute" && aft.content !== "none") { const ins = ["top", "right", "bottom", "left"].map((k) => parseFloat(aft[k]) || 0); w = b.width - Math.min(0, ins[3]) * 0 + Math.max(0, -ins[1]) + Math.max(0, -ins[3]); h = b.height + Math.max(0, -ins[0]) + Math.max(0, -ins[2]); }
        if (el.type === "checkbox") return;
        if (w < 43.5 || h < 43.5) { const lbl = (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 28); out.small.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} ${Math.round(w)}x${Math.round(h)} "${lbl}"`); }
      });
      document.querySelectorAll("h1,h2,h3,.row-title,.kcard-title,.coll-n,.btn,.chip,.bn-label,.sb-label,.recent-title").forEach((el) => { if (!vis(el)) return; if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== "visible" && !el.classList.contains("chip") && !el.closest(".chips.scroll")) out.clipped.push(el.className + ":" + (el.textContent || "").trim().slice(0, 24)); });
      return out;
    });
    const issues = [];
    if (res.overflow) issues.push("OVERFLOW " + JSON.stringify(res.overflow));
    if (res.small.length) issues.push("SMALL(" + res.small.length + ") " + [...new Set(res.small)].slice(0, 6).join("; "));
    if (res.clipped.length) issues.push("CLIPPED " + res.clipped.slice(0, 3).join("; "));
    if (errs.length) issues.push("ERR " + errs.slice(0, 2).join("; "));
    if (issues.length) { bad++; console.log(`[${w}] ${r}\n   ` + issues.join("\n   ")); }
    await page.close();
  }
  await ctx.close();
}
await browser.close();
console.log(bad ? `\n${bad} route/width combinations with findings` : "\nAll clear");

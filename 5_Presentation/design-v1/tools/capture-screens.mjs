// Captures every key screen of the Life OS prototype at phone (390x844) and desktop (1440x900).
// Usage: node capture-screens.mjs            (all)   ONLY=explore node capture-screens.mjs   (filter by slug substring)
// Env: OUT=<dir> output folder, BASE=<url> prototype URL, TS=<YYYYMMDD-HHMMSS> shared timestamp prefix.
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE || "http://127.0.0.1:8791/index.html";
const OUT = process.env.OUT || path.resolve("../../../2_version_History");
const TS = process.env.TS || new Date().toISOString().replace(/[-:T]/g, "").replace(/\..*/, "").replace(/^(\d{8})(\d{6})$/, "$1-$2");
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
fs.mkdirSync(OUT, { recursive: true });

const M = { w: 390, h: 844 }, D = { w: 1440, h: 900 };
const TEXT = "Read the MCP overview this weekend and try building a tiny server. Context matters more than clever prompts.";
const wait = (p, ms) => p.waitForTimeout(ms);

const shots = [
  // ---- phone ----
  { slug: "home-mobile", vp: M, hash: "#/home" },
  { slug: "home-mobile-dark", vp: M, hash: "#/home", theme: "dark" },
  { slug: "capture-note-mobile", vp: M, hash: "#/home", steps: async (p) => { await p.click(".bn-capture"); await p.fill("#capText", TEXT); await wait(p, 300); } },
  { slug: "capture-link-mobile", vp: M, hash: "#/home", steps: async (p) => { await p.click(".bn-capture"); await p.click("#tab-link"); await p.click('[data-cap="ex"][data-k="youtube"]'); await wait(p, 300); } },
  { slug: "capture-voice-mobile", vp: M, hash: "#/home", steps: async (p) => { await p.click(".bn-capture"); await p.click("#tab-voice"); await p.click('[data-cap="rec"]'); await wait(p, 2800); } },
  { slug: "capture-journal-mobile", vp: M, hash: "#/home", steps: async (p) => { await p.click(".bn-capture"); await p.click("#tab-journal"); await p.click('[data-cap="prompt"]'); await wait(p, 300); } },
  { slug: "capture-reminder-mobile", vp: M, hash: "#/home", steps: async (p) => { await p.click(".bn-capture"); await p.click("#tab-reminder"); await p.fill("#capText", "Explore building a local AI agent this weekend"); await wait(p, 300); } },
  { slug: "capture-aichat-mobile", vp: M, hash: "#/home", steps: async (p) => { await p.click(".bn-capture"); await p.click("#tab-chat"); await p.click('[data-cap="sample-chat"]'); await wait(p, 300); } },
  { slug: "capture-processing-mobile", vp: M, hash: "#/home", steps: async (p) => { await p.click(".bn-capture"); await p.fill("#capText", TEXT); await p.press("#capText", "Enter"); await wait(p, 1300); } },
  { slug: "capture-result-mobile", vp: M, hash: "#/home", steps: async (p) => { await p.click(".bn-capture"); await p.fill("#capText", TEXT); await p.press("#capText", "Enter"); await p.waitForSelector(".res", { timeout: 8000 }); await wait(p, 500); } },
  { slug: "explore-mobile", vp: M, hash: "#/explore" },
  { slug: "explore-mobile-dark", vp: M, hash: "#/explore", theme: "dark" },
  { slug: "explore-next-mobile", vp: M, hash: "#/explore", steps: async (p) => { await p.click('[data-x="next"]'); await wait(p, 700); } },
  { slug: "explore-details-mobile", vp: M, hash: "#/explore", steps: async (p) => { await p.click('[data-x="details"]'); await wait(p, 700); } },
  { slug: "explore-history-mobile", vp: M, hash: "#/explore", steps: async (p) => { await p.click('[data-x="next"]'); await wait(p, 500); await p.click('[data-x="next"]'); await wait(p, 500); await p.click(".xp-hist"); await wait(p, 700); } },
  { slug: "graph-mobile", vp: M, hash: "#/graph" },
  { slug: "graph-items-mobile", vp: M, hash: "#/graph", steps: async (p) => { await p.click("#grItems"); await wait(p, 700); } },
  { slug: "graph-node-mobile", vp: M, hash: "#/graph", steps: async (p) => { await p.click('.node[data-id="c:agents"]'); await wait(p, 900); } },
  { slug: "graph-list-mobile", vp: M, hash: "#/graph", steps: async (p) => { await p.click('[data-g-m="list"]'); await wait(p, 400); } },
  { slug: "library-mobile", vp: M, hash: "#/library" },
  { slug: "library-mobile-dark", vp: M, hash: "#/library", theme: "dark" },
  { slug: "library-search-mobile", vp: M, hash: "#/library", steps: async (p) => { await p.fill("#libQ", "agents"); await wait(p, 400); } },
  { slug: "library-empty-mobile", vp: M, hash: "#/library", steps: async (p) => { await p.fill("#libQ", "kubernetes"); await wait(p, 400); } },
  { slug: "knowledge-detail-mobile", vp: M, hash: "#/item/i01" },
  { slug: "knowledge-detail-mobile-dark", vp: M, hash: "#/item/i01", theme: "dark" },
  { slug: "ask-mobile", vp: M, hash: "#/ask" },
  { slug: "ask-answer-mobile", vp: M, hash: "#/ask", steps: async (p) => { await p.click(".sugg-b >> nth=0"); await p.waitForSelector(".ans-src", { timeout: 9000 }); await wait(p, 500); } },
  { slug: "ask-answer-mobile-dark", vp: M, hash: "#/ask", theme: "dark", steps: async (p) => { await p.click(".sugg-b >> nth=0"); await p.waitForSelector(".ans-src", { timeout: 9000 }); await wait(p, 500); } },
  { slug: "ask-source-mobile", vp: M, hash: "#/ask", steps: async (p) => { await p.click(".sugg-b >> nth=0"); await p.waitForSelector(".ans-src", { timeout: 9000 }); await p.click(".ans-p .cite >> nth=1"); await wait(p, 700); } },
  { slug: "infographic-mobile", vp: M, hash: "#/infographic/i01" },
  { slug: "reminders-mobile", vp: M, hash: "#/reminders" },
  { slug: "journal-mobile", vp: M, hash: "#/journal" },
  { slug: "settings-mobile", vp: M, hash: "#/settings" },
  { slug: "settings-mobile-dark", vp: M, hash: "#/settings", theme: "dark" },
  { slug: "install-onboarding-mobile", vp: M, hash: "#/welcome" },
  { slug: "install-share-iphone-mobile", vp: M, hash: "#/welcome", steps: async (p) => { await p.click("#cap-iphone"); await wait(p, 300); } },
  { slug: "install-extension-mobile", vp: M, hash: "#/welcome?tab=extension" },
  { slug: "share-target-mobile", vp: M, hash: "#/share-target?from=Chrome&title=Three%20prompts%20that%20make%20AI%20answers%20sharper&url=https%3A%2F%2Fwww.instagram.com%2Freel%2Flifeos-prompts-demo%2F", steps: async (p) => { await wait(p, 3200); } },
  { slug: "states-mobile", vp: M, hash: "#/states" },
  { slug: "share-dialog-mobile", vp: M, hash: "#/item/i01", steps: async (p) => { await p.click('[data-d="share"]'); await wait(p, 600); } },
  // ---- desktop ----
  { slug: "home-desktop", vp: D, hash: "#/home" },
  { slug: "home-desktop-dark", vp: D, hash: "#/home", theme: "dark" },
  { slug: "capture-palette-desktop", vp: D, hash: "#/home", steps: async (p) => { await p.keyboard.press("Control+k"); await p.fill("#capText", TEXT); await wait(p, 400); } },
  { slug: "capture-result-desktop", vp: D, hash: "#/home", steps: async (p) => { await p.keyboard.press("Control+k"); await p.fill("#capText", TEXT); await p.press("#capText", "Enter"); await p.waitForSelector(".res", { timeout: 8000 }); await wait(p, 500); } },
  { slug: "explore-desktop", vp: D, hash: "#/explore" },
  { slug: "explore-desktop-dark", vp: D, hash: "#/explore", theme: "dark" },
  { slug: "explore-history-desktop", vp: D, hash: "#/explore", steps: async (p) => { await p.keyboard.press("ArrowRight"); await wait(p, 500); await p.keyboard.press("ArrowRight"); await wait(p, 500); await p.click('[data-tab="history"]'); await wait(p, 400); } },
  { slug: "graph-desktop", vp: D, hash: "#/graph" },
  { slug: "graph-node-desktop", vp: D, hash: "#/graph", steps: async (p) => { await p.click('.node[data-id="c:agents"]'); await wait(p, 900); } },
  { slug: "graph-node-desktop-dark", vp: D, hash: "#/graph", theme: "dark", steps: async (p) => { await p.click('.node[data-id="c:agents"]'); await wait(p, 900); } },
  { slug: "library-desktop", vp: D, hash: "#/library" },
  { slug: "knowledge-detail-desktop", vp: D, hash: "#/item/i01" },
  { slug: "knowledge-detail-desktop-dark", vp: D, hash: "#/item/i01", theme: "dark" },
  { slug: "ask-desktop", vp: D, hash: "#/ask", steps: async (p) => { await p.click(".sugg-b >> nth=2"); await p.waitForSelector(".ans-src", { timeout: 9000 }); await wait(p, 600); } },
  { slug: "ask-desktop-dark", vp: D, hash: "#/ask", theme: "dark", steps: async (p) => { await p.click(".sugg-b >> nth=2"); await p.waitForSelector(".ans-src", { timeout: 9000 }); await wait(p, 600); } },
  { slug: "ask-panel-desktop", vp: D, hash: "#/library", steps: async (p) => { await p.keyboard.press("Control+j"); await p.click("#askRail .sugg-b >> nth=0"); await p.waitForSelector("#askRail .ans-src", { timeout: 9000 }); await wait(p, 600); } },
  { slug: "infographic-desktop", vp: D, hash: "#/infographic/i01" },
  { slug: "reminders-desktop", vp: D, hash: "#/reminders" },
  { slug: "journal-desktop", vp: D, hash: "#/journal" },
  { slug: "settings-desktop", vp: D, hash: "#/settings" },
  { slug: "install-onboarding-desktop", vp: D, hash: "#/welcome" },
  { slug: "install-extension-desktop", vp: D, hash: "#/welcome?tab=extension" },
  { slug: "share-target-desktop", vp: D, hash: "#/share-target", steps: async (p) => { await wait(p, 3200); } },
  { slug: "states-desktop", vp: D, hash: "#/states" },
  { slug: "tablet-home-768", vp: { w: 768, h: 1024 }, hash: "#/home" },
  { slug: "tablet-library-1024", vp: { w: 1024, h: 768 }, hash: "#/library" },
  { slug: "small-phone-explore-320", vp: { w: 320, h: 568 }, hash: "#/explore" },
  { slug: "small-phone-home-320", vp: { w: 320, h: 568 }, hash: "#/home" }
];

const browser = await chromium.launch({ channel: "chrome" });
let n = 0;
for (const s of shots) {
  if (ONLY && !ONLY.some((o) => s.slug.includes(o))) continue;
  const ctx = await browser.newContext({ viewport: { width: s.vp.w, height: s.vp.h }, deviceScaleFactor: 2, hasTouch: s.vp.w < 768, reducedMotion: "no-preference", permissions: ["clipboard-read", "clipboard-write"] });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await page.addInitScript((t) => { try { const s = JSON.parse(localStorage.getItem("lifeos.proto.v1") || "{}"); s.theme = t; localStorage.setItem("lifeos.proto.v1", JSON.stringify(s)); } catch (e) {} }, s.theme || "light");
  await page.goto(BASE + s.hash);
  await wait(page, 900);
  try { if (s.steps) await s.steps(page); } catch (e) { errs.push("STEP FAILED: " + e.message.split("\n")[0]); }
  await wait(page, 300);
  const file = path.join(OUT, `${TS}-${s.slug}.png`);
  await page.screenshot({ path: file, fullPage: s.full === true });
  n++;
  console.log((errs.length ? "WARN " : "ok   ") + s.slug + (errs.length ? "  " + errs.join(" | ") : ""));
  await ctx.close();
}
await browser.close();
console.log(n + " screenshots in " + OUT + " with prefix " + TS);

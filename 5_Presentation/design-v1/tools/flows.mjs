// End-to-end interaction checks for the clickable prototype. Fails loudly on any broken control.
import { chromium } from "playwright-core";
const BASE = process.env.BASE || "http://127.0.0.1:8791/index.html";
const browser = await chromium.launch({ channel: "chrome" });
let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };

async function fresh(vp, hash, opts) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 768, permissions: ["clipboard-read", "clipboard-write"] });
  if (!(opts && opts.firstRun)) await ctx.addInitScript(() => { try { if (!localStorage.getItem("lifeos.proto.v1")) localStorage.setItem("lifeos.proto.v1", JSON.stringify({ welcomed: true })); } catch (e) {} });
  const p = await ctx.newPage();
  p.errs = [];
  p.on("pageerror", (e) => p.errs.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") p.errs.push(m.text()); });
  await p.goto(BASE + hash); await p.waitForTimeout(600);
  return p;
}
const hash = (p) => p.evaluate(() => location.hash);

/* ---------------- phone ---------------- */
let p = await fresh({ width: 390, height: 844 }, "#/home");
ok(await p.isVisible("#bottomnav"), "phone: bottom nav visible");
ok(!(await p.isVisible("#sidebar")), "phone: sidebar hidden");
for (const [n, h] of [["Explore", "#/explore"], ["Graph", "#/graph"], ["Library", "#/library"], ["Home", "#/home"]]) {
  await p.click(`#bottomnav a[data-nav="${n.toLowerCase()}"]`); await p.waitForTimeout(250);
  ok((await hash(p)).startsWith(h), "phone: bottom nav -> " + n);
}
await p.click("#bottomnav .bn-capture"); await p.waitForTimeout(400);
ok(await p.isVisible(".sheet"), "phone: capture button opens sheet");
await p.fill("#capText", "Try the new context engineering checklist tomorrow. It might make agents more reliable.");
await p.press("#capText", "Enter");
await p.waitForSelector(".proc", { timeout: 3000 }); ok(true, "capture: processing state shown");
await p.waitForSelector(".res", { timeout: 9000 }); ok(true, "capture: structured result shown");
const title = await p.inputValue("#rTitle"); ok(title.length > 3, "capture: result has editable title (" + title + ")");
await p.fill("#rTitle", "My edited title"); await p.click('[data-cap="close"]'); await p.waitForTimeout(400);
ok(!(await p.isVisible(".sheet")), "capture: sheet closes on Done");
await p.click('#bottomnav a[data-nav="library"]'); await p.waitForTimeout(400);
ok((await p.textContent("#libResults")).includes("My edited title"), "capture: edited item appears first in library");
await p.reload(); await p.waitForTimeout(500);
ok((await p.textContent("#libResults")).includes("My edited title"), "capture: persists after refresh");

// library search and filter
await p.fill("#libQ", "design systems"); await p.waitForTimeout(250);
ok((await p.$$("#libResults a.row")).length >= 1, "library: search returns results");
await p.fill("#libQ", ""); await p.click('[data-lib-f="videos"]'); await p.waitForTimeout(250);
const vids = await p.$$eval("#libResults a.row", (r) => r.length); ok(vids >= 2 && vids <= 4, "library: Videos filter (" + vids + ")");
await p.selectOption("#libSort", "oldest"); await p.waitForTimeout(150); ok(true, "library: sort changes");
await p.click('[data-lib-v="grid"]'); await p.waitForTimeout(150); ok(await p.isVisible(".ggrid"), "library: grid view");
await p.fill("#libQ", "zzzzz"); await p.waitForTimeout(250); ok(await p.isVisible(".empty"), "library: empty state");
await p.fill("#libQ", ""); await p.click('[data-lib-f="all"]'); await p.click('[data-lib-v="list"]');
await p.click("#libResults a.row >> nth=0"); await p.waitForTimeout(300);
ok((await hash(p)).startsWith("#/item/"), "library: row opens detail"); 
await p.click('[data-d="fav"]'); await p.waitForTimeout(200); ok((await p.getAttribute('[data-d="fav"]', "aria-pressed")) === "true", "detail: favourite toggles");
await p.click('[data-d="share"]'); await p.waitForTimeout(400); ok(await p.isVisible(".sheet .share-opts"), "detail: share dialog opens"); await p.keyboard.press("Escape"); await p.waitForTimeout(350);
await p.click('[data-d="edit"]'); await p.fill("#dSum", "A changed summary."); await p.click('[data-d="save"]'); await p.waitForTimeout(200);
ok((await p.textContent(".det .read")).includes("A changed summary"), "detail: edit summary saves");
await p.click(".tb-back"); await p.waitForTimeout(300); ok((await hash(p)).startsWith("#/library"), "detail: back returns to library");

// explore
await p.goto(BASE + "#/explore"); await p.waitForTimeout(500);
const t0 = await p.textContent(".kcard.top .kcard-title");
await p.click('[data-x="next"]'); await p.waitForTimeout(700);
const t1 = await p.textContent(".kcard.top .kcard-title"); ok(t0 !== t1, "explore: next moves to a new card");
await p.click('[data-x="back"]'); await p.waitForTimeout(700);
ok((await p.textContent(".kcard.top .kcard-title")) === t0, "explore: back returns to previous card");
await p.click('[data-x="fav"]'); await p.waitForTimeout(150); ok((await p.getAttribute('[data-x="fav"]', "aria-pressed")) === "true", "explore: favourite");
await p.click('[data-x="details"]'); await p.waitForTimeout(500); ok(await p.isVisible(".sheet .xd"), "explore: details sheet"); await p.keyboard.press("Escape"); await p.waitForTimeout(350);
await p.click('[data-x="share"]'); await p.waitForTimeout(400); ok(await p.isVisible(".sheet .share-opts"), "explore: share dialog"); await p.keyboard.press("Escape"); await p.waitForTimeout(350);
// swipe gesture
const box = await (await p.$(".kcard.top")).boundingBox();
const before = await p.textContent(".kcard.top .kcard-title");
await p.mouse.move(box.x + box.width / 2, box.y + 150); await p.mouse.down(); await p.mouse.move(box.x + box.width / 2 - 60, box.y + 150, { steps: 4 }); await p.mouse.move(box.x + 20, box.y + 150, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(700);
ok((await p.textContent(".kcard.top .kcard-title")) !== before, "explore: swipe left advances");
await p.click(".xp-hist"); await p.waitForTimeout(500); ok(await p.isVisible(".sheet .xh"), "explore: history sheet"); await p.keyboard.press("Escape"); await p.waitForTimeout(350);
// reach end
for (let i = 0; i < 14; i++) { const b = await p.$('[data-x="next"]:not([disabled])'); if (!b) break; await b.click(); await p.waitForTimeout(260); }
ok(await p.isVisible(".endcard"), "explore: end-of-deck card"); await p.click('[data-x="restart"]'); await p.waitForTimeout(500); ok(!(await p.isVisible(".endcard")), "explore: start again");

// graph
await p.goto(BASE + "#/graph"); await p.waitForTimeout(700);
await p.click('.node[data-id="c:agents"]'); await p.waitForTimeout(700);
ok((await p.textContent("#grPanel")).includes("AI Agents"), "graph: node opens detail panel");
ok((await p.$$("#grPanel .gp-items a.row")).length >= 3, "graph: panel lists connected saved items");
await p.click('#grPanel [data-g-sel="c:mcp"]'); await p.waitForTimeout(600); ok((await p.textContent("#grPanel")).includes("Model Context Protocol"), "graph: navigate between connected concepts");
await p.click('[data-g-f="design"]'); await p.waitForTimeout(400); ok(await p.$$eval(".node.dim", (n) => n.length) > 3, "graph: topic filter dims others");
await p.click('[data-g="zin"]'); await p.click('[data-g="zout"]'); await p.click('[data-g="fit"]'); ok(true, "graph: zoom controls");
await p.click('[data-g-m="list"]'); await p.waitForTimeout(300); ok(await p.isVisible(".gr-list"), "graph: list view");
await p.click('.gr-list [data-g-sel="c:dsys"]'); await p.waitForTimeout(700); ok(await p.isVisible(".gr-svg"), "graph: list item selects node and returns to map");
await p.click("#grItems"); await p.waitForTimeout(300); ok((await p.getAttribute("#grItems", "aria-checked")) === "true", "graph: toggle saved items");

// ask
await p.goto(BASE + "#/ask"); await p.waitForTimeout(500);
await p.click(".sugg-b >> nth=0"); await p.waitForSelector(".ans-src", { timeout: 9000 });
const cites = await p.$$eval(".ans-p .cite", (c) => c.length); ok(cites >= 4, "ask: consolidated answer with numbered citation chips (" + cites + ")");
await p.click(".ans-p .cite >> nth=0"); await p.waitForTimeout(500); ok(await p.isVisible(".sheet .prev"), "ask: citation opens source preview");
await p.click('.sheet [data-c="open"]'); await p.waitForTimeout(400); ok((await hash(p)).startsWith("#/item/"), "ask: preview opens source item");
await p.goto(BASE + "#/ask"); await p.waitForTimeout(400); await p.fill(".cq", "what about kubernetes?"); await p.press(".cq", "Enter"); await p.waitForSelector(".ans .muted", { timeout: 9000 }); ok(true, "ask: no-result state");

// infographic, reminders, journal, settings, welcome, share target
await p.goto(BASE + "#/infographic/i01"); await p.waitForTimeout(500);
ok(await p.isVisible("#infFrame svg"), "infographic: rendered");
await p.click('[data-i-tone="sand"]'); await p.click('[data-i-mode="dark"]'); await p.waitForTimeout(200); ok(true, "infographic: colour and mode");
const dl = p.waitForEvent("download", { timeout: 8000 }).catch(() => null);
await p.click('[data-i="png"]'); const d = await dl; ok(!!d, "infographic: Save as image downloads a PNG" + (d ? " (" + d.suggestedFilename() + ")" : ""));
await p.goto(BASE + "#/reminders"); await p.waitForTimeout(400);
const open0 = await p.$$eval(".rem-list .check input:not(:checked)", (c) => c.length);
await p.click(".rem-list .check >> nth=0"); await p.waitForTimeout(600);
ok((await p.$$eval(".rem-list .check input:not(:checked)", (c) => c.length)) === open0 - 1, "reminders: complete one");
await p.fill("#remIn", "Call the designer tomorrow"); await p.press("#remIn", "Enter"); await p.waitForTimeout(500); ok((await p.textContent(".rem-page")).includes("Call the designer"), "reminders: add");
await p.goto(BASE + "#/journal"); await p.waitForTimeout(400); await p.fill("#jrText", "Today I learned that quality is a habit."); await p.click("#jrSave"); await p.waitForTimeout(3500);
ok((await p.textContent(".entries")).toLowerCase().includes("today i learned"), "journal: entry saved and organised");
await p.goto(BASE + "#/settings"); await p.waitForTimeout(400);
await p.click('[data-pick="dark"]'); await p.waitForTimeout(200); ok((await p.getAttribute("html", "data-theme")) === "dark", "settings: dark theme");
await p.click('[data-pick="light"]'); ok((await p.getAttribute("html", "data-theme")) === "light", "settings: light theme");
await p.click("#swMotion"); ok((await p.getAttribute("html", "data-motion")) === "reduce", "settings: reduce motion"); await p.click("#swMotion");
await p.click("#btnReset"); await p.waitForTimeout(400); await p.click('.sheet [data-dlg="1"]'); await p.waitForTimeout(500); ok(true, "settings: reset demo data dialog");
await p.goto(BASE + "#/welcome"); await p.waitForTimeout(400);
for (const t of ["inst-and", "inst-desk", "cap-iphone", "cap-ext", "cap-clip", "cap-android"]) { await p.click("#" + t); }
ok(await p.isVisible("#cap-p-android"), "welcome: tabs switch (Android share panel)");
await p.goto(BASE + "#/states"); await p.waitForTimeout(400); ok(await p.isVisible(".st-box"), "states gallery renders");
await p.goto(BASE + "#/home?offline=1"); await p.waitForTimeout(500); ok(await p.isVisible("#offlineBar"), "offline banner shows");
await p.goto(BASE + "#/home"); await p.waitForTimeout(500);
await p.fill("#qb", "https://www.youtube.com/watch?v=abc"); await p.press("#qb", "Enter"); await p.waitForTimeout(500); ok(await p.isVisible(".toast"), "home quick bar: saves a pasted link and shows toast");
await p.click('[data-act="capture"][data-mode="voice"]'); await p.waitForTimeout(500); await p.click('[data-cap="rec"]'); await p.waitForTimeout(1800); await p.click('[data-cap="rec"]'); await p.waitForTimeout(300);
ok((await p.inputValue("#capTranscript")).length > 10, "voice: mock transcription appears"); 
ok(p.errs.length === 0, "phone: no console errors " + p.errs.join(" | "));
await p.context().close();

/* ---------------- desktop ---------------- */
p = await fresh({ width: 1440, height: 900 }, "#/home");
ok(await p.isVisible("#sidebar"), "desktop: sidebar visible");
ok(!(await p.isVisible("#bottomnav")), "desktop: bottom nav hidden");
await p.keyboard.press("Control+k"); await p.waitForTimeout(400); ok(await p.isVisible(".sheet .cap"), "desktop: Ctrl/Cmd+K opens capture palette");
await p.keyboard.press("Escape"); await p.waitForTimeout(350);
await p.goto(BASE + "#/library"); await p.waitForTimeout(500);
ok(await p.isVisible(".lib-detail"), "desktop: library has detail pane");
await p.click("#libResults a.row >> nth=1"); await p.waitForTimeout(400);
ok((await p.$$("#libResults a.row")).length > 5 && (await p.textContent(".lib-detail")).length > 200, "desktop: list + detail pane together");
await p.keyboard.press("Control+j"); await p.waitForTimeout(400); ok(await p.isVisible("#askRail"), "desktop: Ask panel toggles");
await p.click("#askRail .sugg-b >> nth=1"); await p.waitForSelector("#askRail .ans-src", { timeout: 9000 }); ok(true, "desktop: Ask panel answers");
await p.click("#askRail .ans-p .cite >> nth=0"); await p.waitForTimeout(500); ok(await p.isVisible(".sheet .prev"), "desktop: panel citation opens preview"); await p.keyboard.press("Escape"); await p.waitForTimeout(350);
await p.keyboard.press("Control+j");
await p.goto(BASE + "#/explore"); await p.waitForTimeout(500);
ok(await p.isVisible(".xp-side") && await p.isVisible(".xp-rail"), "desktop: explore three-pane");
const a = await p.textContent(".kcard.top .kcard-title"); await p.keyboard.press("ArrowRight"); await p.waitForTimeout(700);
ok((await p.textContent(".kcard.top .kcard-title")) !== a, "desktop: arrow key advances");
await p.keyboard.press("ArrowLeft"); await p.waitForTimeout(700); ok((await p.textContent(".kcard.top .kcard-title")) === a, "desktop: left arrow goes back");
await p.click('[data-tab="history"]'); await p.waitForTimeout(200); ok(await p.isVisible(".xh"), "desktop: history tab");
await p.goto(BASE + "#/graph"); await p.waitForTimeout(700); await p.click('.node[data-id="c:agents"]'); await p.waitForTimeout(600);
ok(await p.isVisible(".gr-panel") && (await p.textContent(".gr-panel")).includes("AI Agents"), "desktop: graph side panel");
await p.fill("#tbQ", "design systems"); await p.press("#tbQ", "Enter"); await p.waitForTimeout(400); ok((await hash(p)).includes("#/library?q=design"), "desktop: top search -> library");
await p.fill("#tbQ", "What did I save about AI agents?"); await p.click('[data-act="ask-submit"]'); await p.waitForSelector("#askRail .ans-src", { timeout: 9000 }); ok(true, "desktop: top Ask button -> panel answer");
await p.keyboard.press("Escape");
ok(p.errs.length === 0, "desktop: no console errors " + p.errs.join(" | "));
await p.context().close();

/* ---------------- first-run onboarding ---------------- */
p = await fresh({ width: 390, height: 844 }, "#/home", { firstRun: true });
ok((await hash(p)).startsWith("#/onboarding"), "onboarding: first visit to Home redirects");
ok(!(await p.isVisible("#bottomnav")), "onboarding: app shell hidden");
await p.click('[data-ob="next"]'); await p.waitForTimeout(300);
ok((await hash(p)).includes("step=1") && (await p.isVisible("#obText")), "onboarding: step 2 shows the capture field");
ok(await p.isVisible("#obNext") && (await p.textContent("#obNext")).trim() === "Skip for now", "onboarding: capture step can be skipped");
await p.click("#obSave"); await p.waitForSelector(".ob-card", { timeout: 9000 });
ok((await p.textContent(".ob-card")).includes("Build an AI agent"), "onboarding: first capture is organised");
ok((await p.textContent("#obNext")).trim() === "Continue", "onboarding: continue after saving");
await p.click("#obNext"); await p.waitForTimeout(300);
ok(await p.isVisible('[data-tabs="obd"]'), "onboarding: save-from-anywhere step");
await p.click('[data-tab="desk"]'); await p.waitForTimeout(150);
ok(await p.isVisible("#obd-p-desk"), "onboarding: device tabs switch");
await p.click("#obClip"); ok((await p.getAttribute("#obClip", "aria-checked")) === "false", "onboarding: clipboard switch toggles");
await p.click("#obNext"); await p.waitForTimeout(300);
await p.click('.ob-topic[data-topic="design"]'); ok((await p.getAttribute('.ob-topic[data-topic="design"]', "aria-pressed")) === "true", "onboarding: topic toggles on");
await p.click('[data-ob="back"]'); await p.waitForTimeout(250);
ok((await hash(p)).includes("step=2"), "onboarding: back goes to previous step");
await p.click("#obNext"); await p.waitForTimeout(250);
ok((await p.getAttribute('.ob-topic[data-topic="design"]', "aria-pressed")) === "true", "onboarding: picks survive navigation");
await p.click("#obNext"); await p.waitForTimeout(500);
ok((await hash(p)).startsWith("#/home"), "onboarding: finish lands on Home");
ok((await p.textContent(".colls .coll-n")).includes("Product Design"), "onboarding: chosen topic is first on Home");
await p.reload(); await p.waitForTimeout(500);
ok((await hash(p)).startsWith("#/home"), "onboarding: not shown again after finishing");
ok(p.errs.length === 0, "onboarding: no console errors " + p.errs.join(" | "));
await p.context().close();

p = await fresh({ width: 390, height: 844 }, "#/home", { firstRun: true });
await p.click('[data-ob="skip"]'); await p.waitForTimeout(400);
ok((await hash(p)).startsWith("#/home") && (await p.isVisible("#bottomnav")), "onboarding: skip goes straight to Home");
await p.goto(BASE + "#/settings"); await p.waitForTimeout(300);
await p.click('a[href="#/onboarding"]'); await p.waitForTimeout(300);
ok((await hash(p)).startsWith("#/onboarding"), "onboarding: replay from Settings");
await p.context().close();

p = await fresh({ width: 1440, height: 900 }, "#/home", { firstRun: true });
ok(await p.isVisible(".ob-visual") && !(await p.isVisible("#sidebar")), "onboarding: desktop two-column, no sidebar");
await p.context().close();
await browser.close();

console.log(fails ? `\n${fails} FAILED` : "\nAll flows pass");
process.exit(fails ? 1 : 0);

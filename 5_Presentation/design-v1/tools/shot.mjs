// Ad hoc screenshot helper: node shot.mjs "<hash>" <w> <h> <theme> <out> [fullPage] [script]
import { chromium } from "playwright-core";
const [hash, w, h, theme, out, full, script] = process.argv.slice(2);
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, hasTouch: +w < 768, isMobile: false });
const page = await ctx.newPage();
const errs = [];
page.on("console", (m) => { if (["error", "warning"].includes(m.type())) errs.push(m.type() + ": " + m.text()); });
page.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));
await page.goto("http://127.0.0.1:8791/index.html?theme=" + theme + hash);
await page.evaluate((t) => { const s = JSON.parse(localStorage.getItem("lifeos.proto.v1") || "{}"); s.theme = t; localStorage.setItem("lifeos.proto.v1", JSON.stringify(s)); }, theme);
await page.reload();
await page.waitForTimeout(700);
if (script) { await page.evaluate(script); await page.waitForTimeout(900); }
await page.screenshot({ path: out, fullPage: full === "1" });
console.log(errs.join("\n") || "ok");
await browser.close();

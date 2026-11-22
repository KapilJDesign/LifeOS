import { chromium } from "playwright-core";
const [hash, w, h, sel] = process.argv.slice(2);
const browser = await chromium.launch({ channel: "chrome" });
const page = await (await browser.newContext({ viewport: { width: +w, height: +h } })).newPage();
await page.goto("http://127.0.0.1:8791/index.html" + hash);
await page.waitForTimeout(600);
const r = await page.evaluate((sel) => Array.from(document.querySelectorAll(sel)).slice(0, 4).map((e) => { const cs = getComputedStyle(e); const b = e.getBoundingClientRect(); return { cls: e.className, w: Math.round(b.width), h: Math.round(b.height), display: cs.display, flex: cs.flex, width: cs.width, minW: cs.minWidth, maxW: cs.maxWidth, pad: cs.padding, gcol: cs.gridTemplateColumns, parent: e.parentElement.className, pdisplay: getComputedStyle(e.parentElement).display }; }), sel);
console.log(JSON.stringify(r, null, 1));
await browser.close();

import { chromium } from "playwright-core";
const [hash, w, h] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome" });
const p = await (await b.newContext({ viewport: { width: +w, height: +h } })).newPage();
await p.goto("http://127.0.0.1:8791/index.html" + hash); await p.waitForTimeout(700);
console.log(JSON.stringify(await p.evaluate(() => { const cw = document.documentElement.clientWidth; const o = []; document.querySelectorAll("body *").forEach((e) => { const r = e.getBoundingClientRect(); if (r.width && r.right > cw + 0.5 && getComputedStyle(e).position !== "fixed") o.push(e.tagName + "." + String(e.className.baseVal ?? e.className).slice(0, 30) + " right=" + r.right.toFixed(1)); }); return { sw: document.documentElement.scrollWidth, cw, o: o.slice(0, 8) }; }), null, 1));
await b.close();

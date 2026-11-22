import { chromium } from "playwright-core";
const [hash, w, h] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome" });
const p = await (await b.newContext({ viewport: { width: +w, height: +h } })).newPage();
await p.goto("http://127.0.0.1:8791/index.html" + hash); await p.waitForTimeout(700);
console.log(await p.evaluate(() => { const de = document.documentElement; const res = []; for (const sel of ["#sidebar", "#topbar", "#askRail", "#offlineBar", ".toasts", ".skip", "#main"]) { const e = document.querySelector(sel); if (!e) continue; const prev = e.style.display; e.style.display = "none"; const sw = de.scrollWidth; e.style.display = prev; res.push(sel + " -> " + sw); } return res.join("\n"); }));
await b.close();

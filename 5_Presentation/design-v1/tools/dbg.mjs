import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome" });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
p.on("pageerror", (e) => console.log("ERR", e.message));
await p.goto("http://127.0.0.1:8791/index.html#/settings"); await p.waitForTimeout(500);
await p.click("#swMotion"); await p.waitForTimeout(100);
console.log(await p.evaluate(() => [document.documentElement.dataset.motion, LO.state.reduceMotion, document.getElementById("swMotion").getAttribute("aria-checked")]));
await b.close();

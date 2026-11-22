/* Life OS prototype — Share dialog, Infographic, Install/onboarding, Share-to-app preview, States gallery. */
(function () {
  const LO = window.LO;
  const { $, $$, esc } = LO;

  /* ================= SHARE (outbound) ================= */
  LO.shareDialog = function (it) {
    const opts = [
      { k: "native", ic: "share", t: "Share\u2026", d: "Send to another app or person" },
      { k: "copy", ic: "copy", t: "Copy summary", d: "Title, summary and takeaways as text" }
    ];
    if (it.sourceUrl) opts.push({ k: "link", ic: "link", t: "Copy source link", d: esc(it.sourceUrl) });
    LO.dialog({
      title: "Share",
      body: `<div class="share-prev" data-tone="${LO.tone(it)}"><span class="share-art">${LO.art(it.art)}</span><span class="share-b"><span class="share-t">${esc(it.title)}</span><span class="share-s">${esc(it.insight)}</span></span></div>
        <ul class="share-opts">${opts.map((o) => `<li><button class="share-opt" type="button" data-s="${o.k}">${LO.icon(o.ic, 22)}<span><span class="so-t">${o.t}</span><span class="so-d">${o.d}</span></span></button></li>`).join("")}<li><a class="share-opt" href="#/infographic/${it.id}" data-s="info">${LO.icon("infographic", 22)}<span><span class="so-t">Create an infographic</span><span class="so-d">A shareable image built from this note</span></span></a></li></ul>`,
      actions: [{ label: "Close", kind: "primary", autofocus: true }]
    });
    $(".share-opts", LO.sheet.el).addEventListener("click", async (e) => {
      const b = e.target.closest("[data-s]"); if (!b) return;
      const k = b.dataset.s;
      if (k === "info") { LO.sheet.close(true); return; }
      if (k === "copy") { LO.sheet.close(); LO.copy(LO.itemText(it), "Summary copied"); }
      else if (k === "link") { LO.sheet.close(); LO.copy(it.sourceUrl, "Link copied"); }
      else if (k === "native") {
        if (navigator.share) { try { await navigator.share({ title: it.title, text: it.insight, url: it.sourceUrl || undefined }); LO.sheet.close(); } catch (err) { /* cancelled */ } }
        else { LO.sheet.close(); LO.copy(LO.itemText(it), "Sharing isn't available in this browser. Summary copied instead."); }
      }
    });
  };

  /* ================= INFOGRAPHIC ================= */
  const PAL = {
    violet: { light: { bg: "#ece8ff", ink: "#17142b", acc: "#5b3df5", soft: "#cfc6ff", paper: "#fcfbf8", fg2: "#4a4660" }, dark: { bg: "#241e4f", ink: "#ece8f8", acc: "#8f7cff", soft: "#3a3080", paper: "#1c1a21", fg2: "#c3bed0" } },
    steel: { light: { bg: "#dce6f2", ink: "#17142b", acc: "#4c77a6", soft: "#bfd0e4", paper: "#fcfbf8", fg2: "#4a4660" }, dark: { bg: "#1e2d42", ink: "#ece8f8", acc: "#7fa6d1", soft: "#2c4262", paper: "#1c1a21", fg2: "#c3bed0" } },
    sand: { light: { bg: "#f2e6c8", ink: "#17142b", acc: "#b9842b", soft: "#e6d3a3", paper: "#fcfbf8", fg2: "#4a4660" }, dark: { bg: "#392f18", ink: "#ece8f8", acc: "#d7a64a", soft: "#54451f", paper: "#1c1a21", fg2: "#c3bed0" } },
    rose: { light: { bg: "#f2dcdd", ink: "#17142b", acc: "#b04f63", soft: "#e6bfc4", paper: "#fcfbf8", fg2: "#4a4660" }, dark: { bg: "#3b2227", ink: "#ece8f8", acc: "#d98496", soft: "#583038", paper: "#1c1a21", fg2: "#c3bed0" } }
  };
  const FONT_D = "'Bricolage Grotesque','Avenir Next Condensed','Helvetica Neue',Arial,sans-serif";
  const FONT_R = "'Newsreader','Iowan Old Style','Palatino Linotype',Georgia,serif";
  const wrap = (text, max, lines) => {
    const words = String(text).split(/\s+/), out = [];
    let cur = "";
    words.forEach((w) => { if ((cur + " " + w).trim().length > max && cur) { out.push(cur); cur = w; } else cur = (cur + " " + w).trim(); });
    if (cur) out.push(cur);
    if (lines && out.length > lines) { const keep = out.slice(0, lines); keep[lines - 1] = keep[lines - 1].replace(/[.,;:]?\s*\S*$/, "") + "\u2026"; return keep; }
    return out;
  };
  const tsp = (lines, x, lh) => lines.map((l, i) => `<tspan x="${x}" dy="${i ? lh : 0}">${esc(l)}</tspan>`).join("");

  LO.infographicSVG = function (it, tone, mode, fontCss) {
    const p = PAL[tone][mode];
    const cs = (it.cids || []).map((id) => LO.concept(id)).filter(Boolean);
    const names = cs.map((c) => c.short || c.name);
    const center = names[0] || (it.tags || [])[0] || "Idea";
    const left = names[1] || (it.tags || [])[1] || "Context";
    const right = names[2] || (it.tags || [])[2] || "Action";
    const title = wrap(it.title, 22, 2);
    const ins = wrap(it.insight, 46, 3);
    const tk = (it.takeaways || []).slice(0, 3);
    const marks = ["circle", "square", "tri"];
    const cols = tk.map((t, i) => {
      const x = 72 + i * 322;
      const m = marks[i];
      const mk = m === "circle" ? `<circle cx="${x + 20}" cy="1040" r="20" fill="${p.acc}"/>` : m === "square" ? `<rect x="${x}" y="1020" width="40" height="40" rx="12" fill="${p.acc}"/>` : `<path d="M${x} 1060L${x + 40} 1060L${x + 40} 1020Z" fill="${p.acc}"/>`;
      const lead = t.split(/[,:;]| and | but /)[0];
      return `${mk}<text x="${x}" y="1120" class="tk" font-size="29" fill="${p.ink}">${tsp(wrap(t, 19, 6), x, 38)}</text>`;
    }).join("");
    const chips = names.slice(0, 3).concat((it.tags || []).slice(0, Math.max(0, 3 - names.length))).slice(0, 4);
    let cx = 72;
    const chipSvg = chips.map((c) => { const w = c.length * 15 + 44; const out = `<rect x="${cx}" y="1262" width="${w}" height="46" rx="23" fill="${p.soft}"/><text x="${cx + w / 2}" y="1293" text-anchor="middle" font-size="24" fill="${p.ink}" class="ui">${esc(c)}</text>`; cx += w + 12; return out; }).join("");
    const art = LO.art(it.art).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
    const bubble = (x, y, r, label, strong) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${strong ? p.acc : p.paper}" stroke="${p.ink}" stroke-width="3"/><text x="${x}" y="${y + r + 40}" text-anchor="middle" font-size="26" class="ui" fill="${p.ink}">${esc(wrap(label, 16, 1)[0])}</text>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" class="ig" viewBox="0 0 1080 1350" width="1080" height="1350" role="img" aria-labelledby="igT">
      <title id="igT">Infographic: ${esc(it.title)}</title>
      <style>${fontCss || ""}
        .ig text{font-family:${FONT_D}} .ig .ui{font-weight:600} .ig .ttl{font-weight:700;font-stretch:84%;letter-spacing:-1px} .ig .rd{font-family:${FONT_R}} .ig .tk{font-family:${FONT_R};font-weight:500}
        .ig .s{fill:none;stroke:${p.ink};stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round} .ig .t{stroke-width:1.5} .ig .d{stroke-dasharray:2 7}
        .ig .f{fill:${p.ink};stroke:none} .ig .fa{fill:${p.acc};stroke:none} .ig .fs{fill:${p.soft};stroke:none} .ig .fp{fill:${p.paper};stroke:${p.ink};stroke-width:2.5} .ig .sa{fill:none;stroke:${p.acc};stroke-width:2.5;stroke-linecap:round}
      </style>
      <rect width="1080" height="1350" fill="${p.bg}"/>
      <rect x="72" y="52" width="44" height="44" rx="14" fill="#5b3df5"/><circle cx="94" cy="74" r="10" fill="none" stroke="#fff" stroke-width="3.4"/><circle cx="103" cy="67" r="4.4" fill="#fff"/>
      <text x="130" y="84" font-size="30" font-weight="700" class="ui" fill="${p.ink}">Life OS</text>
      <text x="1008" y="82" text-anchor="end" font-size="26" class="ui" fill="${p.fg2}">${esc(it.sourceName || "")}</text>
      <clipPath id="igc"><rect x="72" y="124" width="936" height="276" rx="40"/></clipPath>
      <rect x="72" y="124" width="936" height="276" rx="40" fill="${p.soft}" opacity=".55"/>
      <svg x="72" y="124" width="936" height="276" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" clip-path="url(#igc)">${art.replace(/var\(--lifeosArtPaper\)/g, p.paper).replace(/var\(--lifeosArtInk\)/g, p.ink)}</svg>
      <text x="72" y="486" class="ttl" font-size="82" fill="${p.ink}">${tsp(title, 72, 84)}</text>
      <text x="72" y="${486 + (title.length - 1) * 84 + 62}" class="rd" font-size="35" fill="${p.fg2}">${tsp(ins, 72, 47)}</text>
      <text x="72" y="826" class="ui" font-size="26" fill="${p.fg2}">How it connects</text>
      <path d="M252 900H410M670 900H828" stroke="${p.ink}" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M398 888l14 12-14 12M816 888l14 12-14 12" stroke="${p.ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      ${bubble(180, 900, 56, left, false)}${bubble(540, 900, 84, center, true)}${bubble(900, 900, 56, right, false)}
      <text x="72" y="990" class="ui" font-size="26" fill="${p.fg2}">What to remember</text>
      ${cols}
      ${chipSvg}
      <text x="1008" y="1293" text-anchor="end" font-size="22" class="ui" fill="${p.fg2}">Saved with Life OS</text>
    </svg>`;
  };

  let fontCssCache = null;
  async function fontCss() {
    if (fontCssCache !== null) return fontCssCache;
    try {
      const b64 = async (u) => { const r = await fetch(u); const b = await r.blob(); return await new Promise((res) => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(b); }); };
      const [a, b, c] = await Promise.all([b64("fonts/bricolage-grotesque-latin-wdth-normal.woff2"), b64("fonts/newsreader-latin-wght-normal.woff2"), b64("fonts/newsreader-latin-wght-italic.woff2")]);
      fontCssCache = `@font-face{font-family:'Bricolage Grotesque';src:url(${a}) format('woff2');font-weight:200 800;font-stretch:75% 100%}@font-face{font-family:'Newsreader';src:url(${b}) format('woff2');font-weight:200 800}@font-face{font-family:'Newsreader';font-style:italic;src:url(${c}) format('woff2');font-weight:200 800}`;
    } catch (e) { fontCssCache = ""; }
    return fontCssCache;
  }
  async function exportPng(it, tone, mode) {
    const svg = LO.infographicSVG(it, tone, mode, await fontCss());
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    try {
      const img = new Image(); img.decoding = "sync";
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      const cv = document.createElement("canvas"); cv.width = 1080 * 1.5; cv.height = 1350 * 1.5;
      const ctx = cv.getContext("2d"); ctx.scale(1.5, 1.5); ctx.drawImage(img, 0, 0, 1080, 1350);
      const blob = await new Promise((r) => cv.toBlob(r, "image/png"));
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = it.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-infographic.png";
      document.body.appendChild(a); a.click(); a.remove();
      LO.toast("Image saved", { icon: "download" });
    } catch (e) { LO.toast("Couldn't create the image in this browser. Copying the summary instead.", { icon: "info" }); LO.copy(LO.itemText(it)); }
    finally { URL.revokeObjectURL(url); }
  }

  LO.routes.infographic = {
    title: (a) => "Infographic", barTitle: () => "Infographic",
    render(args) {
      const it = LO.item(args[0]);
      if (!it) return `<div class="empty"><h2 class="empty-h">That item is no longer available</h2><a class="btn primary" href="#/library">Back to library</a></div>`;
      const tone = LO.tone(it);
      return `<div class="inf" data-id="${it.id}">
        <header class="page-head"><h1 class="title">Infographic</h1><p class="lede">Built from your note, not a screenshot of it. Change the note and the graphic follows.</p></header>
        <div class="inf-grid">
          <div class="inf-stage"><div class="inf-frame" id="infFrame">${LO.infographicSVG(it, tone, "light")}</div></div>
          <aside class="inf-opts" aria-label="Infographic options">
            <h2 class="side-h" id="stL">Colour</h2>
            <div class="swatches" role="radiogroup" aria-labelledby="stL">${Object.keys(PAL).map((k) => `<button type="button" role="radio" class="sw" data-tone="${k}" aria-checked="${k === tone}" data-i-tone="${k}" aria-label="${k}"><span></span></button>`).join("")}</div>
            <h2 class="side-h" id="mdL">Mode</h2>
            <div class="seg" role="radiogroup" aria-labelledby="mdL"><button type="button" role="radio" aria-checked="true" data-i-mode="light">${LO.icon("sun", 18)}<span>Light</span></button><button type="button" role="radio" aria-checked="false" data-i-mode="dark">${LO.icon("moon", 18)}<span>Dark</span></button></div>
            <div class="inf-act"><button class="btn primary lg" type="button" data-i="png">${LO.icon("download", 20)}Save as image</button><button class="btn outline lg" type="button" data-i="share">${LO.icon("share", 20)}Share</button><button class="btn subtle lg" type="button" data-i="copy">${LO.icon("copy", 20)}Copy summary</button></div>
            <p class="muted sm">Image is 1080 by 1350 pixels, sized for stories and posts.</p>
          </aside>
        </div></div>`;
    },
    mount(root, args) {
      const it = LO.item(args[0]); if (!it) return;
      let tone = LO.tone(it), mode = "light";
      const repaint = async () => { $("#infFrame", root).innerHTML = LO.infographicSVG(it, tone, mode); };
      root.addEventListener("click", (e) => {
        const t = e.target.closest("[data-i-tone]"); if (t) { tone = t.dataset.iTone; $$("[data-i-tone]", root).forEach((b) => b.setAttribute("aria-checked", b === t)); repaint(); return; }
        const m = e.target.closest("[data-i-mode]"); if (m) { mode = m.dataset.iMode; $$("[data-i-mode]", root).forEach((b) => b.setAttribute("aria-checked", b === m)); repaint(); return; }
        const a = e.target.closest("[data-i]"); if (!a) return;
        if (a.dataset.i === "png") exportPng(it, tone, mode);
        else if (a.dataset.i === "share") LO.shareDialog(it);
        else if (a.dataset.i === "copy") LO.copy(LO.itemText(it), "Summary copied");
      });
    }
  };

  /* ================= tabs helper ================= */
  function tabs(root) {
    $$("[data-tabs]", root).forEach((list) => {
      const tabsEl = $$("[role=tab]", list);
      const panels = $$(`[data-panel-of="${list.dataset.tabs}"]`, root);
      const show = (id) => { tabsEl.forEach((t) => { const on = t.dataset.tab === id; t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1; }); panels.forEach((p) => (p.hidden = p.dataset.panel !== id)); };
      list.addEventListener("click", (e) => { const t = e.target.closest("[role=tab]"); if (t) show(t.dataset.tab); });
      list.addEventListener("keydown", (e) => {
        const i = tabsEl.indexOf(document.activeElement); if (i < 0) return;
        let n = null; if (e.key === "ArrowRight") n = (i + 1) % tabsEl.length; else if (e.key === "ArrowLeft") n = (i - 1 + tabsEl.length) % tabsEl.length; else if (e.key === "Home") n = 0; else if (e.key === "End") n = tabsEl.length - 1;
        if (n !== null) { e.preventDefault(); tabsEl[n].focus(); show(tabsEl[n].dataset.tab); }
      });
    });
  }
  const tabList = (name, label, list, def) => `<div class="tablist" role="tablist" aria-label="${label}" data-tabs="${name}">${list.map(([id, l, ic]) => `<button class="tab" role="tab" type="button" id="${name}-${id}" data-tab="${id}" aria-selected="${id === def}" tabindex="${id === def ? 0 : -1}" aria-controls="${name}-p-${id}">${ic ? LO.icon(ic, 18) : ""}<span>${l}</span></button>`).join("")}</div>`;
  const panel = (name, id, def, html) => `<div class="tabpanel" role="tabpanel" id="${name}-p-${id}" aria-labelledby="${name}-${id}" data-panel-of="${name}" data-panel="${id}" ${id === def ? "" : "hidden"} tabindex="0">${html}</div>`;
  const steps = (arr) => `<ol class="steps">${arr.map((s) => `<li>${s}</li>`).join("")}</ol>`;
  LO.ui = { tabs, tabList, panel, steps };

  /* ================= WELCOME: install + capture everywhere ================= */
  LO.routes.welcome = {
    title: () => "Set up capture", barTitle: () => "Set up capture",
    render(args, q) {
      const origin = location.origin && location.origin !== "null" ? location.origin : "https://your-life-os.example";
      const shortcutUrl = origin + "/#/share-target?url=";
      const bookmarklet = `javascript:(function(){location.href='${origin}/#/share-target?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title)})()`;
      const ext = q.tab === "extension" ? "ext" : null;
      const capDef = q.tab === "extension" ? "ext" : "android";
      return `<div class="page wel">
        <header class="page-head"><h1 class="title">Save from anywhere</h1><p class="lede">Life OS works best when saving takes a few seconds, wherever you are. Set up the ways you will actually use.</p></header>

        <section class="wel-sec" aria-labelledby="w1"><h2 class="sec-h" id="w1">1. Install the app</h2>
          ${tabList("inst", "Choose your device", [["ios", "iPhone", "phone"], ["and", "Android", "phone"], ["desk", "Desktop", "desktop"]], "ios")}
          ${panel("inst", "ios", "ios", `<div class="wel-grid"><div>${steps(["Open Life OS in <strong>Safari</strong>.", "Tap the <strong>Share</strong> button " + LO.icon("share", 16) + " in the toolbar.", "Scroll and choose <strong>Add to Home Screen</strong>.", "Tap <strong>Add</strong>. Open Life OS from your home screen like any app."])}<p class="note">${LO.icon("info", 16)}<span>iPhone installs the app full screen, but iOS does not list web apps in the share sheet. Use the Shortcut or bookmark in step 2.</span></p></div>${deviceMock("ios")}</div>`)}
          ${panel("inst", "and", "ios", `<div class="wel-grid"><div>${steps(["Open Life OS in <strong>Chrome</strong>.", "Tap the menu " + LO.icon("more", 16) + " and choose <strong>Install app</strong>. You may also see an install banner.", "Confirm with <strong>Install</strong>."])}<p class="note">${LO.icon("check", 16)}<span>After installing, Life OS appears in the Android share sheet automatically.</span></p></div>${deviceMock("android")}</div>`)}
          ${panel("inst", "desk", "ios", `<div class="wel-grid"><div>${steps(["Open Life OS in <strong>Chrome</strong> or <strong>Edge</strong>.", "Click the install icon at the right of the address bar.", "Choose <strong>Install</strong>. Life OS opens in its own window."])}</div>${deviceMock("desktop")}</div>`)}
        </section>

        <section class="wel-sec" aria-labelledby="w2"><h2 class="sec-h" id="w2">2. Save from other apps</h2>
          ${tabList("cap", "Capture method", [["android", "Android share", "share"], ["iphone", "iPhone", "phone"], ["ext", "Chrome extension", "puzzle"], ["clip", "Copied links", "copy"]], capDef)}
          ${panel("cap", "android", capDef, `<div class="wel-grid"><div>${steps(["In any app, tap <strong>Share</strong>.", "Choose <strong>Life OS</strong> from the share sheet.", "It is saved instantly. Organising happens in the background."])}<div class="wel-cta"><a class="btn primary" href="#/share-target?title=${encodeURIComponent("Three prompts that make AI answers sharper")}&url=${encodeURIComponent(LO.samples.instagram.url)}">${LO.icon("share", 18)}Preview what you will see</a></div></div>${shareSheetMock()}</div>`)}
          ${panel("cap", "iphone", capDef, `<div class="wel-grid"><div>
            <h3 class="det-h">Option A: a Shortcut</h3>
            ${steps(["Open <strong>Shortcuts</strong> and create a shortcut called <strong>Save to Life OS</strong>.", "Add <strong>Receive input from Share Sheet</strong> (URLs and text).", "Add <strong>Open URL</strong> and paste the link below, then insert <em>Shortcut Input</em> at the end.", "Turn on <strong>Show in Share Sheet</strong>."])}
            <div class="copyrow"><code id="scUrl">${esc(shortcutUrl)}</code><button class="btn outline sm" type="button" data-w="copy-sc">${LO.icon("copy", 16)}Copy</button></div>
            <h3 class="det-h">Option B: copy, then open</h3><p class="read sm">Copy any link, open Life OS, and tap <strong>Save it</strong> when it offers. Nothing is read in the background.</p>
            <h3 class="det-h">Option C: a bookmark (Safari or Chrome desktop)</h3><p class="read sm">Drag this to your bookmarks bar. Click it on any page to save that page.</p>
            <a class="btn outline bm" href="${esc(bookmarklet)}" draggable="true" data-w="bm">${LO.icon("link", 18)}Save to Life OS</a>
          </div>${deviceMock("ios-share")}</div>`)}
          ${panel("cap", "ext", capDef, `<div class="wel-grid"><div>${steps(["Open <code>chrome://extensions</code> and turn on <strong>Developer mode</strong>.", "Choose <strong>Load unpacked</strong> and select the <code>extension</code> folder.", "Pin <strong>Life OS</strong> to the toolbar.", "On any page, click the toolbar button, press <kbd class=\"kbd\">Alt</kbd> <kbd class=\"kbd\">Shift</kbd> <kbd class=\"kbd\">L</kbd>, or right-click and choose <strong>Save to Life OS</strong>. Selected text is saved with the page."])}</div>${extPopupMock()}</div>`)}
          ${panel("cap", "clip", capDef, `<div class="wel-grid"><div><p class="read">When you open Life OS with a link on your clipboard, it asks once whether to save it. It only checks when you open the app, never in the background.</p>
            <div class="set-card inline"><div class="set-row"><div class="set-t"><label for="swClip2" class="set-l">Offer to save copied links</label></div><button class="switch" type="button" role="switch" id="swClip2" aria-checked="${LO.state.clipboardOffer}"><span class="knob"></span></button></div></div>
            <div class="wel-cta"><button class="btn outline" type="button" data-w="clip-demo">${LO.icon("link", 18)}Preview the prompt</button></div></div>${deviceMock("clip")}</div>`)}
        </section>

        <section class="wel-sec wel-done"><h2 class="sec-h">3. You're ready</h2><p class="read">Everything lands in one inbox and is organised the same way, whichever route it took.</p><div class="wel-cta"><a class="btn primary lg" href="#/home" data-w="finish">Open Life OS</a></div></section>
      </div>`;
    },
    mount(root) {
      tabs(root);
      root.addEventListener("click", (e) => {
        const b = e.target.closest("[data-w]"); if (!b) return;
        const k = b.dataset.w;
        if (k === "copy-sc") LO.copy($("#scUrl", root).textContent, "Shortcut link copied");
        else if (k === "bm") { e.preventDefault(); LO.toast("Drag this to your bookmarks bar. Clicking it here does nothing.", { icon: "info", duration: 5000 }); }
        else if (k === "clip-demo") LO.toast("A link is on your clipboard.", { icon: "link", duration: 8000, action: { label: "Save it", fn: () => LO.quickSave(LO.samples.youtube.url) } });
        else if (k === "ext-save") { LO.quickSave("https://quality-notes.example/design-review-checklist"); }
        else if (k === "finish") { LO.state.welcomed = true; LO.save(); }
      });
      root.addEventListener("click", (e) => { const s = e.target.closest("#swClip2"); if (s) { const on = s.getAttribute("aria-checked") !== "true"; s.setAttribute("aria-checked", on); LO.state.clipboardOffer = on; LO.save(); } });
    }
  };
  function deviceMock(kind) {
    const labels = { ios: ["Add to Home Screen", "Life OS", "plus"], android: ["Install app", "Life OS", "download"], desktop: ["Install Life OS?", "lifeos.app", "desktop"], "ios-share": ["Shortcuts", "Save to Life OS", "share"], clip: ["Life OS", "A link is on your clipboard", "link"] };
    const l = labels[kind] || labels.ios;
    return `<div class="dev" aria-hidden="true"><div class="dev-bar"><i></i><i></i><i></i></div><div class="dev-body"><div class="dev-ic">${LO.mark(48)}</div><p class="dev-t">${l[1]}</p><div class="dev-btn">${LO.icon(l[2], 16)}<span>${l[0]}</span></div></div></div>`;
  }
  function shareSheetMock() {
    const apps = ["Messages", "Mail", "Notes", "Life OS", "Drive", "More"];
    return `<div class="dev share-sheet" aria-hidden="true"><div class="dev-bar"><i></i><i></i><i></i></div><div class="dev-body"><p class="dev-t sm">Share link</p><div class="ss-grid">${apps.map((a) => `<div class="ss-app ${a === "Life OS" ? "on" : ""}"><span class="ss-ic">${a === "Life OS" ? LO.mark(40) : `<i></i>`}</span><span>${a}</span></div>`).join("")}</div></div></div>`;
  }
  function extPopupMock() {
    return `<div class="ext" role="group" aria-label="Extension preview">
      <div class="ext-h">${LO.mark(24)}<strong>Life OS</strong><span class="ext-k">Alt Shift L</span></div>
      <div class="ext-page">${LO.srcGlyph("website", 16)}<div><p class="ext-t">Why design reviews need a checklist</p><p class="ext-u">quality-notes.example</p></div></div>
      <label class="vh" for="extNote">Add a note</label><input id="extNote" class="field" placeholder="Add a note (optional)" />
      <button class="btn primary" type="button" data-w="ext-save">Save to Life OS</button></div>`;
  }

  /* ================= SHARE TARGET (inbound) ================= */
  LO.routes["share-target"] = {
    title: () => "Saving", barTitle: () => "Saving to Life OS",
    render(args, q) {
      const url = q.url || LO.samples.youtube.url;
      const d = LO.detectUrl(url) || { host: "", type: "website" };
      const title = q.title || (d.sample ? d.sample.title : d.host);
      return `<div class="st"><div class="st-card"><div class="st-head"><span class="st-mark">${LO.mark(32)}</span><div><h1 class="st-h">Saving to Life OS</h1><p class="st-from">Shared from ${esc(q.from || "another app")}</p></div></div>
        <div class="st-prev">${LO.srcGlyph(d.type, 20)}<div><p class="st-t">${esc(title)}</p><p class="st-u">${esc(d.host)}</p></div></div>
        <div class="st-state" id="stState" aria-live="polite"><p class="st-ok">${LO.icon("check", 18)}<strong>Saved.</strong></p><ol class="proc-steps" id="stSteps"></ol></div>
        <label class="lbl" for="stNote">Add a note <span class="opt">optional</span></label><textarea id="stNote" class="field" rows="2" placeholder="Why does this matter to you?"></textarea>
        <div class="st-actions" id="stActions"></div></div>
        <p class="muted st-foot">This is the screen the share sheet opens. It saves first, then organises, so it never makes you wait.</p></div>`;
    },
    async mount(root, args, q) {
      const url = q.url || LO.samples.youtube.url;
      const d = LO.detectUrl(url);
      const inp = { type: "link", text: q.title || "", url: d ? d.url : url, sample: d ? d.sample : null, urlType: d ? d.type : "website" };
      const item = LO.capture.create(Object.assign({}, inp, { text: inp.url }));
      item.sourceType = inp.urlType;
      const list = $("#stSteps", root);
      const names = ["Reading the source", "Summarising", "Finding concepts", "Linking to what you have saved"];
      list.innerHTML = names.map((n, i) => `<li data-s="${i}"><span class="ps-ic"></span><span>${n}</span></li>`).join("");
      $("#stActions", root).innerHTML = `<a class="btn subtle" href="#/home">Done</a>`;
      $("#stNote", root).addEventListener("input", (e) => { item.note = e.target.value; LO.save(); });
      await LO.capture.process(item, inp, (i) => { $$("li", list).forEach((li, k) => { li.className = k < i ? "done" : k === i ? "active" : ""; $(".ps-ic", li).innerHTML = k < i ? LO.icon("check", 14) : ""; }); });
      if (!document.body.contains(list)) return;
      $("#stState", root).innerHTML = `<p class="st-ok">${LO.icon("check", 18)}<strong>Organised.</strong></p><p class="st-res"><strong>${esc(item.title)}</strong></p><div class="chips">${(item.cids || []).map((c) => `<span class="tag">${esc((LO.concept(c) || {}).short || (LO.concept(c) || {}).name)}</span>`).join("")}</div>`;
      $("#stActions", root).innerHTML = `<a class="btn primary lg" href="#/item/${item.id}">Open in Life OS</a><a class="btn subtle lg" href="#/home">Done</a>`;
    }
  };

  /* ================= STATES GALLERY (review aid) ================= */
  LO.routes.states = {
    title: () => "States", barTitle: () => "States gallery",
    render() {
      const sample = LO.item("i01");
      return `<div class="page states">
        <header class="page-head"><h1 class="title">States gallery</h1><p class="lede">Every non-happy path, in one place. Prototype review only.</p></header>
        <div class="st-grid">
          <section class="st-box" aria-labelledby="g1"><h2 class="side-h" id="g1">Empty: library</h2><div class="empty"><div class="empty-art" data-tone="violet">${LO.art("research")}</div><h3 class="empty-h">Nothing here yet</h3><p class="empty-p">Capture a thought, a link or a voice note and it will show up here, already organised.</p><div class="empty-a"><button class="btn primary" type="button" data-act="capture">${LO.icon("plus", 18)}Capture something</button></div></div></section>
          <section class="st-box" aria-labelledby="g2"><h2 class="side-h" id="g2">Loading</h2><div class="skel-list" aria-busy="true" aria-label="Loading">${Array.from({ length: 3 }, () => `<div class="row skel-row"><span class="thumb skel-box"></span><span class="row-body"><i class="shimmer-line"></i><i class="shimmer-line s"></i></span></div>`).join("")}</div></section>
          <section class="st-box" aria-labelledby="g3"><h2 class="side-h" id="g3">Organising</h2><div class="proc"><p class="proc-saved">${LO.icon("check", 18)}<span><strong>Saved.</strong> You can close this. Organising carries on in the background.</span></p><ol class="proc-steps"><li class="done"><span class="ps-ic">${LO.icon("check", 14)}</span><span>Reading the source</span></li><li class="done"><span class="ps-ic">${LO.icon("check", 14)}</span><span>Summarising</span></li><li class="active"><span class="ps-ic"></span><span>Finding concepts</span></li><li><span class="ps-ic"></span><span>Linking to what you have saved</span></li></ol></div></section>
          <section class="st-box" aria-labelledby="g4"><h2 class="side-h" id="g4">Error: organising failed</h2><div class="msgbar err" role="group" aria-label="Error example">${LO.icon("info", 20)}<div><p class="mb-t">We saved it, but couldn't organise it</p><p class="mb-s">Your original is safe. Try again, or edit the summary yourself.</p></div><div class="mb-a"><button class="btn outline sm" type="button" data-s-toast="retry">Try again</button><button class="btn subtle sm" type="button" data-s-toast="edit">Edit manually</button></div></div></section>
          <section class="st-box" aria-labelledby="g5"><h2 class="side-h" id="g5">Offline</h2><div class="msgbar warn" role="group" aria-label="Offline example">${LO.icon("wifiOff", 20)}<div><p class="mb-t">You are offline</p><p class="mb-s">Captures are saved on this device and organised when you reconnect. Search still works.</p></div></div><p class="muted sm">Preview the live banner: <a href="#/home?offline=1">turn on offline view</a>.</p></section>
          <section class="st-box" aria-labelledby="g6"><h2 class="side-h" id="g6">Microphone blocked</h2><div class="msgbar warn" role="group" aria-label="Microphone example">${LO.icon("mic", 20)}<div><p class="mb-t">Life OS can't hear you</p><p class="mb-s">Allow microphone access in your browser, or type your note instead.</p></div><div class="mb-a"><button class="btn outline sm" type="button" data-act="capture" data-mode="note">Type instead</button></div></div></section>
          <section class="st-box" aria-labelledby="g7"><h2 class="side-h" id="g7">Toast and undo</h2><div class="btn-row2"><button class="btn outline" type="button" data-s-toast="saved">Show saved toast</button><button class="btn outline" type="button" data-s-toast="undo">Show toast with undo</button></div></section>
          <section class="st-box" aria-labelledby="g8"><h2 class="side-h" id="g8">Recently captured: organising card</h2><div class="rail">${recentLike(sample, true)}${recentLike(sample, false)}</div></section>
        </div></div>`;
    },
    mount(root) {
      root.addEventListener("click", (e) => {
        const b = e.target.closest("[data-s-toast]"); if (!b) return;
        const k = b.dataset.sToast;
        if (k === "saved") LO.toast("Saved. Organising it now.");
        else if (k === "undo") LO.toast("Marked done", { action: { label: "Undo", fn: () => LO.toast("Restored", { icon: "undo", duration: 1500 }) } });
        else if (k === "retry") LO.toast("Trying again\u2026", { icon: "reset", duration: 1800 });
        else if (k === "edit") LO.toast("Open any saved item and choose Edit.", { icon: "edit" });
      });
    }
  };
  function recentLike(it, proc) {
    return `<div class="recent ${proc ? "is-proc" : ""}" data-tone="${LO.tone(it)}"><span class="recent-art">${LO.art(it.art)}</span><span class="recent-body"><span class="recent-src">${LO.srcGlyph(it.sourceType, 14)}<span>${esc(it.sourceName)}</span></span><span class="recent-title">${proc ? '<span class="shimmer-line"></span><span class="shimmer-line s"></span>' : esc(it.title)}</span><span class="recent-time">${proc ? "Organising\u2026" : "3 h ago"}</span></span></div>`;
  }
})();

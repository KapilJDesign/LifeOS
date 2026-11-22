/* Life OS prototype — first-run onboarding: welcome, try a capture, save from anywhere, pick topics. */
(function () {
  const LO = window.LO;
  const { $, $$, esc } = LO;
  const { tabs, tabList, panel, steps } = LO.ui;

  const TOTAL = 4;
  const ob = { text: LO.samples.youtube.url, itemId: null, busy: false, picked: null };
  const ua = navigator.userAgent;
  const device = /Android/i.test(ua) ? "and" : /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ? "ios" : "desk";
  const ART = ["network", "context", "mcp", "journal"];
  const TONE = ["violet", "steel", "sand", "rose"];

  const stepOf = (q) => Math.min(TOTAL - 1, Math.max(0, parseInt(q.step, 10) || 0));
  const finish = (to) => {
    LO.state.welcomed = true;
    if (ob.picked) LO.state.interests = ob.picked.slice();
    LO.save();
    LO.go(to || "#/home");
  };

  function copyFor(n) {
    if (n === 0) {
      const pts = [
        ["plus", "Save in seconds", "Paste a link, type a thought or speak. No folders and no forms."],
        ["spark", "It organises itself", "Summaries, key ideas and tags appear on their own, and you can edit any of them."],
        ["ask", "Ask and get sources", "Questions are answered from your own notes, with citations you can open."]
      ];
      return `<p class="ob-eyebrow">Welcome to Life OS</p>
        <h1 class="ob-h" id="obH" tabindex="-1">Everything you save, finally understood.</h1>
        <p class="ob-p">Life OS keeps what you read, watch and think in one place, organises it for you, and brings it back when it matters.</p>
        <ul class="ob-points">${pts.map((p) => `<li><span class="ob-pic" aria-hidden="true">${LO.icon(p[0], 22)}</span><span><strong>${p[1]}</strong><span class="ob-pd">${p[2]}</span></span></li>`).join("")}</ul>`;
    }
    if (n === 1) {
      return `<p class="ob-eyebrow">Try it</p>
        <h1 class="ob-h" id="obH" tabindex="-1">Save your first thing</h1>
        <p class="ob-p">We filled in a link to try. Swap it for your own link or a thought if you like.</p>
        <label class="lbl" for="obText">A link or a thought</label>
        <div class="inputrow"><input id="obText" class="field" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(ob.text)}" /><button class="btn primary" type="button" id="obSave">Save</button></div>
        <div id="obOut" class="ob-out" aria-live="polite"></div>`;
    }
    if (n === 2) {
      return `<p class="ob-eyebrow">Save from anywhere</p>
        <h1 class="ob-h" id="obH" tabindex="-1">Capture without opening the app</h1>
        <p class="ob-p">Pick the device you use most. You can set up the others later.</p>
        ${tabList("obd", "Choose your device", [["ios", "iPhone", "phone"], ["and", "Android", "phone"], ["desk", "Desktop", "desktop"]], device)}
        ${panel("obd", "ios", device, `${steps(["Open Life OS in <strong>Safari</strong>, tap <strong>Share</strong> " + LO.icon("share", 16) + ", then <strong>Add to Home Screen</strong>.", "Add the <strong>Save to Life OS</strong> shortcut so it appears when you share from any app.", "Or copy a link and open Life OS. It offers to save it."])}<p class="note">${LO.icon("info", 16)}<span>iPhone does not list web apps in the share sheet, so the shortcut does that job. The guide has a copy-paste recipe.</span></p>`)}
        ${panel("obd", "and", device, `${steps(["Open Life OS in <strong>Chrome</strong>, tap the menu " + LO.icon("more", 16) + ", then <strong>Install app</strong>.", "In any app, tap <strong>Share</strong> and choose <strong>Life OS</strong>.", "It is saved at once. Organising happens in the background."])}`)}
        ${panel("obd", "desk", device, `${steps([`Press <kbd class="kbd">${esc(LO.modKey)}</kbd> <kbd class="kbd">K</kbd> anywhere in Life OS to open quick capture.`, "Add the <strong>Chrome extension</strong> to save any page in one click, or press <kbd class=\"kbd\">Alt</kbd> <kbd class=\"kbd\">Shift</kbd> <kbd class=\"kbd\">L</kbd>.", "Paste a link into the quick bar on Home."])}`)}
        <div class="set-card inline ob-sw"><div class="set-row"><div class="set-t"><label for="obClip" class="set-l">Offer to save links I have copied</label><p class="set-d" id="obClip-d">Checked only when you open Life OS, never in the background.</p></div><button class="switch" type="button" role="switch" id="obClip" aria-checked="${LO.state.clipboardOffer}" aria-describedby="obClip-d"><span class="knob"></span></button></div></div>
        <p class="ob-more"><a class="link" href="#/welcome" data-ob="guide">Open the full setup guide</a></p>`;
    }
    const on = (ob.picked || LO.state.interests || []);
    return `<p class="ob-eyebrow">Make it yours</p>
      <h1 class="ob-h" id="obH" tabindex="-1">What do you want to keep?</h1>
      <p class="ob-p">Pick any that fit. We will put them first on Home. You can skip this.</p>
      <div class="ob-topics" role="group" aria-label="Topics">${LO.topics.map((t) => `<button class="ob-topic" type="button" data-topic="${t.id}" data-tone="${t.tone}" aria-pressed="${on.includes(t.id)}"><span class="ob-tart">${LO.art(t.art)}</span><span class="ob-tb"><span class="ob-tn">${esc(t.name)}</span><span class="ob-td">${esc(t.desc)}</span></span><span class="ob-tick" aria-hidden="true">${LO.icon("check", 16)}</span></button>`).join("")}</div>`;
  }

  function resultHTML(item) {
    const chips = (item.cids || []).map((c) => { const k = LO.concept(c) || {}; return `<span class="tag">${esc(k.short || k.name || "")}</span>`; }).join("");
    return `<div class="ob-result"><p class="st-ok">${LO.icon("check", 18)}<strong>Saved and organised.</strong></p>
      <article class="ob-card" data-tone="${LO.tone(item)}"><span class="ob-card-art">${LO.art(item.art || "network")}</span>
        <div class="ob-card-b"><p class="ob-card-src">${LO.srcGlyph(item.sourceType, 14)}<span>${esc(item.sourceName || "")}</span></p><h2 class="ob-card-t">${esc(item.title)}</h2><p class="ob-card-i">${esc(item.insight || item.summary || "")}</p>${chips ? `<div class="chips">${chips}</div>` : ""}</div></article>
      <p class="muted sm">You only gave us the link. The title, summary and concepts were found for you, and you can edit them any time.</p></div>`;
  }

  LO.routes.onboarding = {
    title: () => "Welcome", barTitle: () => "Welcome",
    render(args, q) {
      const n = stepOf(q);
      const last = n === TOTAL - 1;
      return `<div class="ob" data-step="${n}">
        <header class="ob-top"><span class="ob-brand">${LO.mark(28)}<span>Life OS</span></span>
          <div class="ob-prog" role="img" aria-label="Step ${n + 1} of ${TOTAL}">${Array.from({ length: TOTAL }, (_, i) => `<span class="ob-bar ${i <= n ? "on" : ""}"></span>`).join("")}</div>
          <button class="btn subtle" type="button" data-ob="skip">Skip</button></header>
        <div class="ob-body"><div class="ob-copy">${copyFor(n)}</div>
          <div class="ob-visual ${n === 0 ? "" : "minor"}" data-tone="${TONE[n]}" aria-hidden="true">${LO.art(ART[n])}</div></div>
        <footer class="ob-foot"><div class="ob-foot-in">
          <button class="btn subtle lg ob-back" type="button" data-ob="back" ${n === 0 ? "hidden" : ""}>${LO.icon("back", 18)}Back</button>
          <button class="btn primary lg ob-next" type="button" data-ob="next" id="obNext">${n === 0 ? "Get started" : last ? "Open Life OS" : n === 1 && !(ob.itemId && LO.item(ob.itemId)) ? "Skip for now" : "Continue"}</button>
        </div></footer></div>`;
    },
    mount(root, args, q) {
      const n = stepOf(q);
      const h = $("#obH", root);
      if (h) setTimeout(() => h.focus({ preventScroll: true }), 0);
      if (n === 2) tabs(root);
      if (n === 1) mountTry(root);

      const el = $(".ob", root);
      el.addEventListener("click", (e) => {
        const b = e.target.closest("[data-ob]");
        if (b) {
          const k = b.dataset.ob;
          if (k === "next") { if (n === TOTAL - 1) finish("#/home"); else LO.go("#/onboarding?step=" + (n + 1)); }
          else if (k === "back") LO.go("#/onboarding?step=" + (n - 1));
          else if (k === "skip") finish("#/home");
          else if (k === "guide") { LO.state.welcomed = true; LO.save(); }
          return;
        }
        const t = e.target.closest(".ob-topic");
        if (t) {
          if (!ob.picked) ob.picked = (LO.state.interests || []).slice();
          const on = t.getAttribute("aria-pressed") !== "true";
          t.setAttribute("aria-pressed", on);
          ob.picked = on ? ob.picked.concat(t.dataset.topic) : ob.picked.filter((x) => x !== t.dataset.topic);
          return;
        }
        const sw = e.target.closest("#obClip");
        if (sw) { const on = sw.getAttribute("aria-checked") !== "true"; sw.setAttribute("aria-checked", on); LO.state.clipboardOffer = on; LO.save(); }
      });
    }
  };

  function mountTry(root) {
    const input = $("#obText", root), out = $("#obOut", root), save = $("#obSave", root), next = $("#obNext", root);
    const existing = ob.itemId && LO.item(ob.itemId);
    if (existing && !existing.processing) { out.innerHTML = resultHTML(existing); save.textContent = "Saved"; save.disabled = true; input.disabled = true; return; }
    input.addEventListener("input", () => { ob.text = input.value; });
    const run = async () => {
      const text = input.value.trim();
      if (ob.busy) return;
      if (text.length < 2) { out.innerHTML = `<p class="ob-err" role="alert">${LO.icon("info", 16)}<span>Type a thought or paste a link first.</span></p>`; input.focus(); return; }
      ob.busy = true; ob.text = text;
      save.disabled = true; input.disabled = true; next.disabled = true;
      const url = LO.detectUrl(text);
      const inp = { type: url ? "link" : "note", text: url ? "" : text, url: url ? url.url : "", sample: url ? url.sample : null };
      const item = LO.capture.create(Object.assign({}, inp, { text: url ? url.url : text }));
      ob.itemId = item.id;
      const names = ["Reading the source", "Summarising", "Finding concepts", "Linking to what you have saved"];
      out.innerHTML = `<p class="st-ok">${LO.icon("check", 18)}<strong>Saved.</strong> Organising it now.</p><ol class="proc-steps" id="obSteps">${names.map((nm) => `<li><span class="ps-ic"></span><span>${nm}</span></li>`).join("")}</ol>`;
      const list = $("#obSteps", root);
      await LO.capture.process(item, inp, (i) => {
        $$("li", list).forEach((li, k) => { li.className = k < i ? "done" : k === i ? "active" : ""; $(".ps-ic", li).innerHTML = k < i ? LO.icon("check", 14) : ""; });
      });
      ob.busy = false;
      if (!document.body.contains(out)) return;
      out.innerHTML = resultHTML(item);
      save.textContent = "Saved";
      next.disabled = false; next.textContent = "Continue"; next.focus();
    };
    save.addEventListener("click", run);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); run(); } });
  }
})();

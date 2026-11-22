/* Life OS prototype — Ask: consolidated answers with numbered citations that open the source. */
(function () {
  const LO = window.LO;
  const { $, $$, esc } = LO;

  const A = (LO.ask = { thread: [], open: false, queue: null, active: null, timer: null });
  const mounts = new Set();
  const STOP = new Set("what did i save about the and for with from that this have has was were show find all my me connections between ideas learned how do does should which of to in on a an is are it".split(" "));

  /* ---------- answer generation (mock of the real retrieval service) ---------- */
  function norm(s) { return (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim(); }
  function answerFor(q) {
    const seed = LO.askSeed.find((s) => norm(s.q) === norm(q) || (norm(q).length > 14 && norm(s.q).includes(norm(q))));
    if (seed) return { paras: seed.paras, followups: seed.followups, matched: true };
    const words = norm(q).split(" ").filter((w) => w.length > 2 && !STOP.has(w));
    const hits = LO.search(words.join(" ") || q).filter((i) => !i.processing).slice(0, 4);
    if (!hits.length) return { paras: [], empty: true, followups: ["What did I save about AI agents?", "What have I learned about design systems?"] };
    const topic = words.slice(0, 3).join(" ") || "that";
    const lead = hits[0];
    const paras = [
      [`You have ${hits.length} saved ${hits.length === 1 ? "item" : "items"} that touch on ${topic}. The closest is `, { c: lead.id }, `: ${lead.insight.charAt(0).toLowerCase() + lead.insight.slice(1)}`]
    ];
    if (hits.length > 1) {
      const seg = ["Related notes add to this. "];
      hits.slice(1).forEach((h, i) => { seg.push(`${i === 0 ? "" : " "}${h.insight}`, " ", { c: h.id }); });
      paras.push(seg);
    }
    return { paras, followups: ["What should I read next?", "Show how these connect"] };
  }
  function citesOf(paras) {
    const out = [];
    paras.forEach((p) => p.forEach((s) => { if (s && s.c && !out.includes(s.c)) out.push(s.c); }));
    return out;
  }
  function tokensOf(paras) { return paras.map((p) => p.flatMap((s) => (typeof s === "string" ? s.split(/(\s+)/).filter(Boolean) : [s]))); }
  function excerptFor(q, it) {
    const w = norm(q).split(" ").filter((x) => x.length > 2 && !STOP.has(x));
    const best = (it.takeaways || []).map((t) => ({ t, s: w.filter((x) => norm(t).includes(x)).length })).sort((a, b) => b.s - a.s)[0];
    return (best && best.t) || it.insight;
  }

  /* ---------- rendering ---------- */
  function turnHTML(t, idx) {
    const cites = t.cites || [];
    const num = (id) => cites.indexOf(id) + 1;
    let body = "";
    if (t.status === "searching") {
      body = `<ol class="ans-steps" aria-label="Working on your answer"><li class="${t.step > 0 ? "done" : "active"}"><span class="ps-ic">${t.step > 0 ? LO.icon("check", 14) : ""}</span><span>Searching ${LO.state.items.length} saved items</span></li><li class="${t.step > 1 ? "done" : t.step === 1 ? "active" : ""}"><span class="ps-ic">${t.step > 1 ? LO.icon("check", 14) : ""}</span><span>Reading the best matches</span></li><li class="${t.step === 2 ? "active" : ""}"><span class="ps-ic"></span><span>Writing your answer</span></li></ol>`;
    } else if (t.status === "error") {
      body = `<div class="msgbar err" role="alert">${LO.icon("wifiOff", 20)}<div><p class="mb-t">Can't reach the assistant</p><p class="mb-s">You are offline. Your saved items are still searchable on this device.</p></div><div class="mb-a"><button class="btn outline sm" type="button" data-c="retry" data-i="${idx}">Try again</button><a class="btn subtle sm" href="#/library?q=${encodeURIComponent(t.q)}">Search library</a></div></div>`;
    } else if (t.empty) {
      body = `<p class="ans-p">I couldn't find anything about that in your ${LO.state.items.length} saved items.</p><p class="ans-p muted">Try different words, or capture something on the topic and ask again.</p><div class="ans-follow"><button class="btn outline sm" type="button" data-act="capture">${LO.icon("plus", 16)}Capture something</button></div>`;
    } else {
      const toks = tokensOf(t.paras);
      let n = t.shown == null ? Infinity : t.shown;
      const paras = toks.map((p) => {
        const parts = [];
        for (const s of p) { if (n <= 0) break; n--; parts.push(typeof s === "string" ? esc(s) : `<button class="cite" type="button" data-c="cite" data-id="${s.c}" data-i="${idx}" aria-label="Source ${num(s.c)}: ${esc((LO.item(s.c) || {}).title || "")}">${num(s.c)}</button>`); }
        return parts.length ? `<p class="ans-p">${parts.join("")}</p>` : "";
      }).join("");
      const done = t.shown == null || t.shown >= toks.reduce((a, p) => a + p.length, 0);
      body = `<div class="ans-text ${done ? "" : "typing"}">${paras}</div>`;
      if (done) {
        body += `<div class="ans-src"><h3 class="ans-h">Sources</h3><ol class="src-list">${cites.map((id, k) => { const it = LO.item(id); return it ? `<li><button class="src-row ${A.active === id ? "on" : ""}" type="button" data-c="cite" data-id="${id}" data-i="${idx}"><span class="cite static" aria-hidden="true">${k + 1}</span>${LO.thumb(it)}<span class="src-b"><span class="src-t">${esc(it.title)}</span><span class="src-m">${LO.srcGlyph(it.sourceType, 14)}<span>${esc(it.sourceName || "")}</span></span></span>${LO.icon("chevR", 16)}</button></li>` : ""; }).join("")}</ol></div>
          <div class="ans-tools"><button class="btn subtle sm" type="button" data-c="copy" data-i="${idx}">${LO.icon("copy", 16)}Copy</button><button class="btn subtle sm" type="button" data-c="save" data-i="${idx}">${LO.icon("note", 16)}Save as note</button></div>
          ${(t.followups || []).length ? `<div class="ans-follow" aria-label="Follow-up questions">${t.followups.map((f) => `<button class="chip" type="button" data-c="ask" data-q="${esc(f)}">${esc(f)}</button>`).join("")}</div>` : ""}`;
      }
    }
    return `<div class="turn"><p class="q"><span class="vh">You asked: </span>${esc(t.q)}</p><div class="ans" data-tone="violet"><span class="ans-mark" aria-hidden="true">${LO.icon("spark", 16)}</span><div class="ans-body">${body}</div></div></div>`;
  }
  function introHTML() {
    const sugg = [...LO.askSeed.map((s) => s.q), "What should I revisit this week?"];
    return `<div class="chat-intro"><div class="intro-art" data-tone="violet">${LO.art("chat")}</div>
      <h2 class="intro-h">Ask your knowledge</h2>
      <p class="intro-p">Get one consolidated answer from everything you have saved, with numbered sources that open the original note.</p>
      <ul class="sugg">${sugg.map((q) => `<li><button class="sugg-b" type="button" data-c="ask" data-q="${esc(q)}">${LO.icon("spark", 18)}<span>${esc(q)}</span></button></li>`).join("")}</ul></div>`;
  }
  function threadHTML() { return A.thread.length ? A.thread.map(turnHTML).join("") : introHTML(); }

  function chatHTML(ctx) {
    return `<div class="chat" data-ctx="${ctx}">
      ${ctx === "rail" ? `<header class="chat-head"><h2 class="chat-t">${LO.icon("ask", 20)}Ask your knowledge</h2><button class="iconbtn" type="button" data-act="ask-toggle" aria-label="Close Ask panel">${LO.icon("close", 20)}</button></header>` : ""}
      <div class="chat-thread" role="log" aria-live="polite" aria-relevant="additions" tabindex="-1">${threadHTML()}</div>
      <form class="composer" data-c-form>
        <label class="vh" for="cq-${ctx}">Ask a question about your saved items</label>
        <textarea id="cq-${ctx}" class="cq" rows="1" placeholder="Ask anything you have saved" enterkeyhint="send"></textarea>
        <button class="iconbtn" type="button" data-c="mic" aria-label="Dictate a question">${LO.icon("mic", 22)}</button>
        <button class="btn primary send" type="submit" aria-label="Send">${LO.icon("arrowU", 20)}</button>
      </form>
    </div>`;
  }

  function sourcesPaneHTML() {
    const last = [...A.thread].reverse().find((t) => t.cites && t.cites.length && t.status === "done");
    const id = A.active || (last && last.cites[0]);
    if (!last) return `<div class="pane-empty"><div class="pane-empty-art" data-tone="violet">${LO.art("network")}</div><h2>Sources appear here</h2><p>Every claim in an answer links to the note it came from. Pick a number to read the original.</p></div>`;
    const it = LO.item(id);
    const q = last.q;
    return `<div class="sp"><h2 class="sp-h">Sources</h2>
      <ol class="sp-tabs">${last.cites.map((c, k) => `<li><button type="button" class="sp-n ${c === id ? "on" : ""}" data-c="cite" data-id="${c}" aria-label="Source ${k + 1}: ${esc((LO.item(c) || {}).title)}" ${c === id ? 'aria-current="true"' : ""}>${k + 1}</button></li>`).join("")}</ol>
      ${it ? previewHTML(it, q, last.cites.indexOf(id) + 1) : ""}</div>`;
  }
  function previewHTML(it, q, n) {
    return `<article class="prev" data-tone="${LO.tone(it)}"><div class="prev-art">${LO.art(it.art)}</div>
      <p class="prev-src">${n ? `<span class="cite static" aria-hidden="true">${n}</span>` : ""}${LO.srcGlyph(it.sourceType, 16)}<span>${esc(it.sourceName || "")}</span><span class="sep" aria-hidden="true"></span><span>${LO.timeAgo(it.createdAt)}</span></p>
      <h3 class="prev-t">${esc(it.title)}</h3>
      <p class="prev-k">Why it matched</p><blockquote class="prev-q">${esc(excerptFor(q, it))}</blockquote>
      <p class="read sm">${esc(it.summary)}</p>
      <div class="prev-a"><a class="btn primary" href="#/item/${it.id}" data-c="open">${LO.icon("note", 18)}Open note</a>${it.sourceUrl ? `<a class="btn outline" href="${esc(it.sourceUrl)}" data-c="source" rel="noopener">${LO.icon("external", 18)}Original</a>` : ""}</div></article>`;
  }

  function refresh() {
    mounts.forEach((m) => {
      if (!document.body.contains(m.el)) { mounts.delete(m); return; }
      const th = $(".chat-thread", m.el);
      const atBottom = th.scrollHeight - th.scrollTop - th.clientHeight < 80;
      th.innerHTML = threadHTML();
      if (atBottom) th.scrollTop = th.scrollHeight;
      if (m.pane) { const p = $(m.pane); if (p) p.innerHTML = sourcesPaneHTML(); }
    });
  }

  async function ask(q) {
    q = (q || "").trim();
    if (!q) return;
    clearInterval(A.timer);
    const t = { q, status: "searching", step: 0, paras: [], cites: [], followups: [] };
    A.thread.push(t); A.active = null;
    refresh();
    scrollEnd();
    if (!LO.online()) { await LO.sleep(500); t.status = "error"; refresh(); return; }
    await LO.sleep(LO.reduced() ? 250 : 650); t.step = 1; refresh();
    await LO.sleep(LO.reduced() ? 250 : 700); t.step = 2; refresh();
    await LO.sleep(LO.reduced() ? 150 : 450);
    const a = answerFor(q);
    t.paras = a.paras; t.empty = a.empty; t.followups = a.followups; t.cites = citesOf(a.paras); t.status = "done";
    if (a.empty) { t.shown = null; refresh(); return; }
    const total = tokensOf(a.paras).reduce((s, p) => s + p.length, 0);
    if (LO.reduced()) { t.shown = null; refresh(); A.active = t.cites[0]; refresh(); return; }
    t.shown = 0;
    A.timer = setInterval(() => {
      t.shown += 3;
      if (t.shown >= total) { clearInterval(A.timer); t.shown = null; A.active = t.cites[0]; }
      refresh(); scrollEnd();
    }, 34);
  }
  function scrollEnd() { mounts.forEach((m) => { const th = $(".chat-thread", m.el); if (th) th.scrollTop = th.scrollHeight; }); }
  LO.askQuestion = function (q) {
    A.queue = q || null;
    if (LO.wide() && LO.parseHash().name !== "ask") { A.open = true; LO.syncAskRail(); flush(); }
    else if (LO.parseHash().name !== "ask") LO.go("#/ask");
    else flush();
  };
  function flush() { if (A.queue) { const q = A.queue; A.queue = null; ask(q); } }

  function bind(el, pane) {
    const m = { el, pane };
    mounts.add(m);
    const form = $("[data-c-form]", el), ta = $(".cq", el);
    const grow = () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 140) + "px"; };
    ta.addEventListener("input", grow);
    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } });
    form.addEventListener("submit", (e) => { e.preventDefault(); const v = ta.value; ta.value = ""; grow(); ask(v); });
    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-c]");
      if (!b) return;
      const k = b.dataset.c, i = +b.dataset.i;
      if (k === "ask") ask(b.dataset.q);
      else if (k === "cite") {
        const it = LO.item(b.dataset.id); const t = A.thread[i] || A.thread[A.thread.length - 1];
        A.active = it.id;
        if (pane && LO.wide()) { refresh(); const sp = $(pane); if (sp) sp.scrollIntoView({ block: "nearest" }); }
        else LO.sheet.open({ title: "Source", html: previewHTML(it, t.q, t.cites.indexOf(it.id) + 1), onMount: (s) => s.addEventListener("click", (ev) => { if (ev.target.closest("[data-c=open]")) LO.sheet.close(true); if (ev.target.closest("[data-c=source]")) { ev.preventDefault(); LO.toast("In the app this opens the original in a new tab.", { icon: "external" }); } }) });
      }
      else if (k === "copy") { const t = A.thread[i]; LO.copy(t.paras.map((p) => p.map((s) => (typeof s === "string" ? s : `[${t.cites.indexOf(s.c) + 1}]`)).join("")).join("\n\n") + "\n\nSources:\n" + t.cites.map((c, n) => `[${n + 1}] ${LO.item(c).title}`).join("\n"), "Answer copied with sources"); }
      else if (k === "save") {
        const t = A.thread[i];
        const text = t.paras.map((p) => p.map((s) => (typeof s === "string" ? s : "")).join("")).join(" ").replace(/\s+/g, " ");
        const item = LO.capture.create({ type: "note", text: "Answer: " + t.q });
        Object.assign(item, { title: "Answer: " + t.q.replace(/\?$/, ""), summary: text.slice(0, 260), insight: text.slice(0, 110), takeaways: t.cites.map((c) => LO.item(c).title), cids: Array.from(new Set(t.cites.flatMap((c) => LO.item(c).cids))).slice(0, 4), tags: ["Answer"], art: "chat", topic: "pk", sourceType: "text", sourceName: "Saved answer", meta: "From Ask", processing: false, original: text });
        LO.save(); LO.emit("items"); LO.toast("Saved to your library", { icon: "check", action: { label: "Open", fn: () => LO.go("#/item/" + item.id) } });
      }
      else if (k === "retry") { const q = A.thread[i].q; A.thread.splice(i, 1); ask(q); }
      else if (k === "mic") { b.classList.add("rec"); b.setAttribute("aria-pressed", "true"); setTimeout(() => { b.classList.remove("rec"); b.removeAttribute("aria-pressed"); ta.value = "What did I save about AI agents?"; grow(); ta.focus(); }, 1300); }
      else if (k === "source") { e.preventDefault(); LO.toast("In the app this opens the original in a new tab.", { icon: "external" }); }
    });
    return m;
  }

  /* ---------- rail (desktop) ---------- */
  LO.toggleAsk = function () {
    if (!LO.wide()) { LO.go("#/ask"); return; }
    if (LO.parseHash().name === "ask") return;
    A.open = !A.open; LO.syncAskRail();
    if (A.open) { const q = $("#askRail .cq"); if (q) q.focus(); }
  };
  LO.syncAskRail = function () {
    const rail = $("#askRail"); if (!rail) return;
    const show = A.open && LO.wide() && LO.parseHash().name !== "ask";
    rail.hidden = !show;
    document.body.dataset.rail = show ? "open" : "closed";
    const b = $(".tb-askbtn"); if (b) b.setAttribute("aria-pressed", String(show));
    if (show && !rail.dataset.ready) { rail.innerHTML = chatHTML("rail"); bind($(".chat", rail), null); rail.dataset.ready = "1"; }
    if (show) { refresh(); }
  };

  /* ---------- page ---------- */
  LO.routes.ask = {
    title: () => "Ask", barTitle: () => "Ask",
    render() { return `<div class="askpage"><section class="ask-main" aria-label="Conversation">${chatHTML("page")}</section><aside class="ask-sources" id="askSources" aria-label="Sources">${sourcesPaneHTML()}</aside></div>`; },
    mount(root) {
      A.open = false; LO.syncAskRail();
      bind($(".chat", root), "#askSources");
      refresh();
      const q = $(".cq", root);
      if (A.queue) flush(); else if (LO.wide() || window.innerWidth >= 768) q.focus({ preventScroll: true });
    }
  };
})();

/* Life OS prototype — Explore: swipeable cards, back/forward history, revisit tracking. */
(function () {
  const LO = window.LO;
  const { $, $$, esc } = LO;
  let lastPrev = null; // seen record before the current card was shown
  let sideTab = "details";

  const xp = () => LO.state.xp;
  const deckItems = () => LO.state.deck.map(LO.item).filter(Boolean);
  const cur = () => deckItems()[xp().pos] || null;
  const week = () => Date.now() - 7 * 864e5;
  const isSeen = (id) => LO.state.seen[id] && LO.state.seen[id].at >= week();

  function mark() {
    const it = cur();
    if (!it) { lastPrev = null; return; }
    lastPrev = LO.state.seen[it.id] ? Object.assign({}, LO.state.seen[it.id]) : null;
    const s = LO.state.seen[it.id] || { n: 0 };
    LO.state.seen[it.id] = { n: s.n + 1, at: Date.now() };
    LO.save();
  }

  function cardHTML(it, role, idx, total) {
    const topic = LO.topicById(it.topic) || LO.topics[3];
    const pill = role === "top" ? (lastPrev ? `Last seen ${LO.timeAgo(lastPrev.at)}` : "New to you") : "";
    return `<article class="kcard ${role}" data-tone="${topic.tone}" data-id="${it.id}" ${role === "top" ? `aria-roledescription="slide" aria-label="${idx + 1} of ${total}: ${esc(it.title)}"` : 'aria-hidden="true"'}>
      <div class="kcard-art">${LO.art(it.art)}
        <span class="kcard-topic">${esc(topic.short)}</span>
        ${pill ? `<span class="kcard-seen ${lastPrev ? "again" : ""}">${LO.icon(lastPrev ? "history" : "spark", 14)}${esc(pill)}</span>` : ""}
      </div>
      <div class="kcard-body">
        <h2 class="kcard-title">${esc(it.title)}</h2>
        <p class="kcard-insight">${esc(it.insight)}</p>
        <div class="kcard-take"><span class="kt-k">Key takeaway</span><p>${esc(it.takeaways[0] || "")}</p></div>
        <div class="kcard-foot">${LO.srcGlyph(it.sourceType, 16)}<span class="kf-src">${esc(it.sourceName || "")}</span><span class="kf-tags">${(it.tags || []).slice(0, 2).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</span></div>
      </div></article>`;
  }
  function endHTML(total) {
    const seen = LO.weekSeen();
    return `<article class="kcard top endcard" data-tone="sage" aria-label="End of deck">
      <div class="kcard-art">${LO.art("reminder")}</div>
      <div class="kcard-body"><h2 class="kcard-title">You're all caught up</h2>
      <p class="kcard-insight">${seen} of ${total} cards revisited this week. Fresh captures will appear here first.</p>
      <div class="end-actions"><button class="btn primary lg" type="button" data-x="restart">${LO.icon("undo", 18)}Start again</button><button class="btn outline lg" type="button" data-act="capture">${LO.icon("plus", 18)}Capture something</button><a class="btn subtle lg" href="#/ask">${LO.icon("spark", 18)}Ask about what you saw</a></div></div></article>`;
  }

  function deckHTML() {
    const items = deckItems();
    const p = xp().pos, n = items.length;
    if (p >= n) return endHTML(n);
    let out = "";
    if (items[p + 2]) out += cardHTML(items[p + 2], "third", p + 2, n);
    if (items[p + 1]) out += cardHTML(items[p + 1], "next", p + 1, n);
    out += cardHTML(items[p], "top", p, n);
    return out;
  }
  function progHTML() {
    const items = deckItems(), p = xp().pos;
    return items.map((it, i) => `<i class="${isSeen(it.id) ? "seen" : ""} ${i === p ? "now" : ""}"></i>`).join("");
  }

  /* detail body reused by the sheet (phone) and the side pane (desktop) */
  function detailBody(it) {
    const rel = LO.related(it, 3);
    const cons = (it.cids || []).map((id) => LO.concept(id)).filter(Boolean);
    return `<div class="xd" data-tone="${LO.tone(it)}">
      <h2 class="xd-title">${esc(it.title)}</h2>
      <p class="xd-src">${LO.srcGlyph(it.sourceType, 16)}<span>${esc(it.sourceName || "")}</span><span class="sep" aria-hidden="true"></span><span>${esc(it.meta || "")}</span></p>
      <h3 class="det-h">Explanation</h3><p class="read">${esc(it.summary)}</p>
      <h3 class="det-h">Key takeaways</h3><ul class="insights">${it.takeaways.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      <h3 class="det-h">Related concepts</h3><div class="chips">${cons.map((c) => `<a class="chip link-chip" href="#/graph/${c.id}">${LO.icon("graph", 16)}${esc(c.short || c.name)}</a>`).join("")}</div>
      ${rel.length ? `<h3 class="det-h">Also saved</h3><div class="rel">${rel.map((r) => `<a class="row" href="#/item/${r.id}">${LO.thumb(r)}<span class="row-body"><span class="row-title">${esc(r.title)}</span><span class="row-meta">${LO.srcGlyph(r.sourceType, 14)}<span>${LO.timeAgo(r.createdAt)}</span></span></span></a>`).join("")}</div>` : ""}
      <div class="xd-actions"><a class="btn primary" href="#/item/${it.id}">${LO.icon("note", 18)}Open full note</a><a class="btn outline" href="#/infographic/${it.id}">${LO.icon("infographic", 18)}Infographic</a>${it.sourceUrl ? `<a class="btn outline" href="${esc(it.sourceUrl)}" data-x="source" rel="noopener">${LO.icon("external", 18)}Open source</a>` : ""}</div>
    </div>`;
  }
  function historyBody() {
    const ids = Object.entries(LO.state.seen).sort((a, b) => b[1].at - a[1].at).filter(([id]) => LO.item(id));
    const deck = LO.state.deck;
    return `<div class="xh">
      <p class="xh-sum"><strong>${LO.weekSeen()} of ${deck.length}</strong> cards revisited this week.</p>
      <ol class="xh-list">${ids.slice(0, 12).map(([id, v]) => { const it = LO.item(id); const inDeck = deck.includes(id); return `<li><${inDeck ? "button" : "a"} class="row xh-row" ${inDeck ? `type="button" data-x="jump" data-id="${id}"` : `href="#/item/${id}"`}>${LO.thumb(it)}<span class="row-body"><span class="row-title">${esc(it.title)}</span><span class="row-meta"><span>Seen ${v.n} ${v.n === 1 ? "time" : "times"}</span><span class="sep" aria-hidden="true"></span><span>${LO.timeAgo(v.at)}</span></span></span>${LO.icon("chevR", 18)}</${inDeck ? "button" : "a"}></li>`; }).join("")}</ol></div>`;
  }
  function sideHTML() {
    const it = cur();
    return `<div class="xs-tabs" role="tablist" aria-label="Card information">
        <button role="tab" type="button" id="xsT1" aria-selected="${sideTab === "details"}" aria-controls="xsP" data-x="tab" data-tab="details">Details</button>
        <button role="tab" type="button" id="xsT2" aria-selected="${sideTab === "history"}" aria-controls="xsP" data-x="tab" data-tab="history">History</button></div>
      <div class="xs-panel" id="xsP" role="tabpanel" aria-labelledby="${sideTab === "details" ? "xsT1" : "xsT2"}" tabindex="0">${sideTab === "details" ? (it ? detailBody(it) : '<p class="muted">Nothing selected.</p>') : historyBody()}</div>`;
  }
  function railHTML() {
    const items = deckItems(), p = xp().pos;
    return `<h2 class="side-h">Today's deck</h2><ol class="film">${items.map((it, i) => `<li><button type="button" class="film-item ${i === p ? "now" : ""} ${isSeen(it.id) ? "seen" : ""}" data-x="jump-i" data-i="${i}" ${i === p ? 'aria-current="true"' : ""}>${LO.thumb(it)}<span class="film-t">${esc(it.title)}</span>${isSeen(it.id) ? `<span class="film-ck" aria-label="Revisited">${LO.icon("check", 14)}</span>` : ""}</button></li>`).join("")}</ol>`;
  }

  function actionsHTML() {
    const it = cur(), p = xp().pos, n = LO.state.deck.length;
    const canBack = xp().trail.length > 0;
    return `<button class="xa" type="button" data-x="back" ${canBack ? "" : "disabled"} aria-label="Back to the previous card">${LO.icon("arrowL", 22)}<span>Back</span></button>
      <button class="xa" type="button" data-x="fav" aria-pressed="${!!(it && it.isFavorite)}" ${it ? "" : "disabled"}>${LO.heart(!!(it && it.isFavorite), 22)}<span>${it && it.isFavorite ? "Saved" : "Favourite"}</span></button>
      <button class="xa xa-detail" type="button" data-x="details" ${it ? "" : "disabled"}>${LO.icon("chevU", 22)}<span>Details</span></button>
      <button class="xa" type="button" data-x="share" ${it ? "" : "disabled"}>${LO.icon("share", 22)}<span>Share</span></button>
      <button class="xa xa-next" type="button" data-x="next" ${p >= n ? "disabled" : ""} aria-label="Next card">${LO.icon("arrowR", 22)}<span>Next</span></button>`;
  }

  function exploreHTML() {
    const n = LO.state.deck.length;
    return `<div class="xp">
      <aside class="xp-rail" id="xpRail" aria-label="Deck overview">${railHTML()}</aside>
      <section class="xp-stage" aria-labelledby="xp-h">
        <h1 class="vh" id="xp-h">Explore your knowledge</h1>
        <header class="xp-head">
          <div class="xp-prog" id="xpProg" role="progressbar" aria-label="Cards revisited this week" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${LO.weekSeen()}">${progHTML()}</div>
          <p class="xp-count" id="xpCount" aria-live="polite"></p>
          <button class="iconbtn xp-hist" type="button" data-x="history" aria-label="Open history">${LO.icon("history", 22)}</button>
        </header>
        <div class="deck" id="deck" tabindex="0" role="group" aria-roledescription="carousel" aria-label="Knowledge cards. Use left and right arrow keys to move, space for details.">${deckHTML()}</div>
        <div class="xp-actions" id="xpActions">${actionsHTML()}</div>
        <p class="xp-hint"><span class="hint-touch">Swipe left for the next card, right to go back</span><span class="hint-keys">Use the \u2190 and \u2192 keys to move, Space for details</span></p>
      </section>
      <aside class="xp-side" id="xpSide" aria-label="Card details">${sideHTML()}</aside>
    </div>`;
  }

  function refreshChrome() {
    const n = LO.state.deck.length, p = xp().pos;
    $("#xpProg").innerHTML = progHTML();
    $("#xpProg").setAttribute("aria-valuenow", LO.weekSeen());
    $("#xpCount").textContent = p >= n ? "All caught up" : `${p + 1} of ${n}`;
    $("#xpActions").innerHTML = actionsHTML();
    $("#xpSide").innerHTML = sideHTML();
    $("#xpRail").innerHTML = railHTML();
    const f = $(".film-item.now"); if (f && f.scrollIntoView) f.scrollIntoView({ block: "nearest" });
  }
  function paint(dir) {
    const deck = $("#deck");
    deck.innerHTML = deckHTML();
    if (dir && !LO.reduced()) { const top = $(".kcard.top", deck); if (top) top.classList.add(dir === "back" ? "enter-left" : "enter-right"); }
    refreshChrome();
  }

  /* ---- navigation: browser-style trail + forward stack ---- */
  function go(kind, arg, flyDir) {
    const s = xp(), n = LO.state.deck.length;
    let moved = false;
    if (kind === "next") {
      if (s.pos >= n) return;
      s.trail.push(s.pos);
      if (s.fwd.length) s.pos = s.fwd.pop(); else s.pos = s.pos + 1;
      moved = true;
    } else if (kind === "back") {
      if (!s.trail.length) return;
      s.fwd.push(s.pos); s.pos = s.trail.pop(); moved = true;
    } else if (kind === "jump") {
      if (arg === s.pos) return;
      s.trail.push(s.pos); s.fwd = []; s.pos = arg; moved = true;
    }
    if (!moved) return;
    LO.save();
    mark();
    paint(kind === "back" ? "back" : "next");
    const live = $("#xpCount"); if (live) live.textContent = s.pos >= n ? "All caught up" : `${s.pos + 1} of ${n}`;
  }
  function flyThen(kind) {
    const top = $(".kcard.top", $("#deck"));
    const canMove = kind === "next" ? xp().pos < LO.state.deck.length : xp().trail.length > 0;
    if (!canMove) { if (top) bump(top, kind); return; }
    if (!top || LO.reduced() || top.classList.contains("endcard")) { go(kind); return; }
    top.classList.add("fly", kind === "next" ? "fly-l" : "fly-r");
    setTimeout(() => go(kind), 210);
  }
  function bump(el, kind) { el.animate([{ transform: "translateX(0)" }, { transform: `translateX(${kind === "next" ? -14 : 14}px)` }, { transform: "translateX(0)" }], { duration: 220, easing: "ease-out" }); }

  function openDetailSheet() {
    const it = cur(); if (!it) return;
    if (LO.wide()) { sideTab = "details"; $("#xpSide").innerHTML = sideHTML(); const p = $("#xsP"); if (p) p.focus({ preventScroll: true }); return; }
    LO.sheet.open({ title: "Details", size: "tall", html: detailBody(it), onMount: (s) => s.addEventListener("click", (e) => { if (e.target.closest("a[href^='#']")) LO.sheet.close(true); if (e.target.closest("[data-x=source]")) { e.preventDefault(); LO.toast("In the app this opens " + it.sourceName + " in a new tab.", { icon: "external" }); } }) });
  }
  function openHistorySheet() {
    LO.sheet.open({ title: "Revisit history", size: "tall", html: historyBody(), onMount: (s) => s.addEventListener("click", (e) => { const j = e.target.closest("[data-x=jump]"); if (j) { LO.sheet.close(true); go("jump", LO.state.deck.indexOf(j.dataset.id)); } if (e.target.closest("a[href^='#']")) LO.sheet.close(true); }) });
  }

  function mount(root, args) {
    if (args[0] && LO.state.deck.includes(args[0])) { xp().pos = LO.state.deck.indexOf(args[0]); xp().trail = []; xp().fwd = []; }
    if (xp().pos > LO.state.deck.length) xp().pos = 0;
    mark();
    $("#deck").innerHTML = deckHTML();
    $("#xpCount").textContent = xp().pos >= LO.state.deck.length ? "All caught up" : `${xp().pos + 1} of ${LO.state.deck.length}`;
    refreshChrome();

    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-x]");
      if (!b) { return; }
      const k = b.dataset.x;
      if (k === "next") flyThen("next");
      else if (k === "back") flyThen("back");
      else if (k === "fav") { const it = cur(); it.isFavorite = !it.isFavorite; LO.save(); $("#xpActions").innerHTML = actionsHTML(); LO.toast(it.isFavorite ? "Added to favourites" : "Removed from favourites", { icon: "heart", duration: 1500 }); const f = $('[data-x="fav"]'); if (f) f.focus(); }
      else if (k === "share") LO.shareDialog(cur());
      else if (k === "details") openDetailSheet();
      else if (k === "history") { if (LO.wide()) { sideTab = "history"; $("#xpSide").innerHTML = sideHTML(); const t = $("#xsT2"); if (t) t.focus(); } else openHistorySheet(); }
      else if (k === "tab") { sideTab = b.dataset.tab; $("#xpSide").innerHTML = sideHTML(); $(`[data-tab="${sideTab}"]`).focus(); }
      else if (k === "jump") go("jump", LO.state.deck.indexOf(b.dataset.id));
      else if (k === "jump-i") go("jump", +b.dataset.i);
      else if (k === "restart") { xp().pos = 0; xp().trail = []; xp().fwd = []; LO.save(); mark(); paint("back"); }
      else if (k === "source") { e.preventDefault(); LO.toast("In the app this opens the original in a new tab.", { icon: "external" }); }
    });

    /* swipe */
    const deck = $("#deck");
    let drag = null;
    deck.addEventListener("pointerdown", (e) => {
      const top = e.target.closest(".kcard.top");
      if (!top || top.classList.contains("endcard") || e.target.closest("a, button")) return;
      drag = { x: e.clientX, y: e.clientY, t: Date.now(), dx: 0, el: top, id: e.pointerId, moved: false };
      top.setPointerCapture(e.pointerId);
      top.classList.add("dragging");
    });
    deck.addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag.dx = e.clientX - drag.x;
      if (Math.abs(drag.dx) > 6) drag.moved = true;
      drag.el.style.transform = `translateX(${drag.dx}px) rotate(${drag.dx / 22}deg)`;
      drag.el.style.setProperty("--drag", Math.max(-1, Math.min(1, drag.dx / 140)));
    });
    const end = (e) => {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      const { dx, el, t, moved } = drag;
      drag = null;
      el.classList.remove("dragging");
      const v = Math.abs(dx) / Math.max(1, Date.now() - t);
      if (!moved) { el.style.transform = ""; if (!LO.wide() || true) openDetailSheet(); return; }
      if (Math.abs(dx) > 90 || v > 0.55) {
        const kind = dx < 0 ? "next" : "back";
        const can = kind === "next" ? true : xp().trail.length > 0;
        if (can) {
          if (LO.reduced()) { el.style.transform = ""; go(kind); return; }
          el.style.transition = "transform 200ms ease-in, opacity 200ms";
          el.style.transform = `translateX(${dx < 0 ? -140 : 140}%) rotate(${dx < 0 ? -12 : 12}deg)`; el.style.opacity = "0";
          setTimeout(() => go(kind), 190);
          return;
        }
      }
      el.style.transition = "transform 260ms var(--lifeosCurveSpring)";
      el.style.transform = ""; el.style.removeProperty("--drag");
      setTimeout(() => (el.style.transition = ""), 280);
    };
    deck.addEventListener("pointerup", end);
    deck.addEventListener("pointercancel", end);

    /* keyboard */
    const onKey = (e) => {
      if (document.body.classList.contains("has-sheet")) return;
      const t = e.target; const tag = (t.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || (e.target.closest && e.target.closest("[role=tablist]"))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") { e.preventDefault(); flyThen("next"); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); flyThen("back"); }
      else if ((e.key === " " || e.key === "Enter") && (t === deck || t === document.body || t.id === "main")) { e.preventDefault(); openDetailSheet(); }
      else if (e.key.toLowerCase() === "f" && cur()) { const it = cur(); it.isFavorite = !it.isFavorite; LO.save(); $("#xpActions").innerHTML = actionsHTML(); LO.toast(it.isFavorite ? "Added to favourites" : "Removed from favourites", { icon: "heart", duration: 1400 }); }
    };
    document.addEventListener("keydown", onKey);
    LO.onLeave(() => document.removeEventListener("keydown", onKey));
    const off = LO.on("items", () => { if (LO.parseHash().name === "explore" && !document.body.classList.contains("has-sheet")) { $("#deck").innerHTML = deckHTML(); refreshChrome(); } });
    LO.onLeave(off);
  }

  LO.routes.explore = { title: () => "Explore", render: exploreHTML, mount };
})();

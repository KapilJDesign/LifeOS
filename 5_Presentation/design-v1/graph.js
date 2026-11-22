/* Life OS prototype — Knowledge graph: pan, zoom, filter, select, detail panel, list alternative. */
(function () {
  const LO = window.LO;
  const { $, $$, esc } = LO;
  const NS = "http://www.w3.org/2000/svg";
  const TOPIC_POS = { ai: [110, 80], design: [700, 80], biz: [700, 660], pk: [110, 680] };
  const G = { sel: null, filter: "all", items: true, mode: "map", v: { x: 0, y: 0, k: 1 }, nodes: [], edges: [], byId: {}, fresh: null };

  function build() {
    const nodes = [], edges = [];
    LO.topics.forEach((t) => nodes.push({ id: "t:" + t.id, type: "topic", label: t.name, short: t.short, x: TOPIC_POS[t.id][0], y: TOPIC_POS[t.id][1], topic: t.id, ref: t.id }));
    const extraIdx = {};
    LO.allConcepts().forEach((c) => {
      let x = c.x, y = c.y;
      if (x == null) { const tp = TOPIC_POS[c.topic] || [500, 400]; const i = (extraIdx[c.topic] = (extraIdx[c.topic] || 0) + 1); x = tp[0] + 160 + i * 20; y = tp[1] + 120 + i * 40; }
      nodes.push({ id: "c:" + c.id, type: "concept", label: c.short || c.name, x, y, topic: c.topic, ref: c.id, isNew: !!c.isNew });
      edges.push({ a: "t:" + c.topic, b: "c:" + c.id, r: "part_of", w: "topic" });
    });
    LO.rels.forEach((r) => edges.push({ a: "c:" + r.s, b: "c:" + r.t, r: r.r, w: "concept" }));
    const primaries = {};
    LO.state.items.forEach((it) => { if (it.processing) return; const first = (it.cids || [])[0]; (primaries[first || "_" + it.topic] = primaries[first || "_" + it.topic] || []).push(it); });
    const byC = Object.fromEntries(nodes.filter((n) => n.type === "concept").map((n) => [n.ref, n]));
    Object.entries(primaries).forEach(([cid, list]) => {
      const base = byC[cid] || nodes.find((n) => n.id === "t:" + cid.replace("_", "")) || nodes[0];
      const center = [420, 380];
      const outward = Math.atan2(base.y - center[1], base.x - center[0]);
      list.forEach((it, i) => {
        const spread = list.length > 1 ? (i / (list.length - 1) - 0.5) * 2.3 : 0;
        const ang = outward + spread + (cid.length % 3) * 0.12;
        const rad = 92 + (i % 2) * 20;
        nodes.push({ id: "n:" + it.id, type: it.sourceType === "journal" || it.sourceType === "voice" ? "personal" : "item", label: it.title, x: base.x + Math.cos(ang) * rad, y: base.y + Math.sin(ang) * rad, topic: it.topic, ref: it.id, isNew: !!it.isNew });
      });
    });
    /* nudge saved items off topic pills and other nodes so labels stay readable */
    const topicBox = (n) => ({ rx: Math.max(96, n.label.length * 8.6 + 34) / 2 + 16, ry: 34 });
    for (let pass = 0; pass < 40; pass++) {
      nodes.filter((n) => n.type === "item" || n.type === "personal").forEach((a) => {
        nodes.forEach((b) => {
          if (a === b) return;
          let dx = a.x - b.x, dy = a.y - b.y;
          if (b.type === "topic") { const t = topicBox(b); const e = Math.hypot(dx / t.rx, dy / t.ry); if (e < 1.15) { a.x += (dx / (e || 1)) * 4 * (1.15 - e) + 0.5; a.y += (dy / (e || 1)) * 4 * (1.15 - e) + 0.5; } return; }
          const min = b.type === "concept" ? 46 : 34; const d = Math.hypot(dx, dy) || 1;
          if (d < min) { const push = (min - d) / 2; a.x += (dx / d) * push; a.y += (dy / d) * push; if (b.type === "item" || b.type === "personal") { b.x -= (dx / d) * push; b.y -= (dy / d) * push; } }
        });
      });
    }
    LO.state.items.forEach((it) => { if (it.processing) return; (it.cids || []).forEach((cid) => edges.push({ a: "n:" + it.id, b: "c:" + cid, r: "related", w: "item" })); });
    G.nodes = nodes; G.edges = edges.filter((e) => nodes.find((n) => n.id === e.a) && nodes.find((n) => n.id === e.b));
    G.byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    G.deg = {};
    G.edges.forEach((e) => { G.deg[e.a] = (G.deg[e.a] || 0) + 1; G.deg[e.b] = (G.deg[e.b] || 0) + 1; });
  }
  const nbrs = (id) => G.edges.filter((e) => e.a === id || e.b === id).map((e) => (e.a === id ? e.b : e.a));
  const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + "\u2026" : s);
  const visible = (n) => (G.items || (n.type !== "item" && n.type !== "personal")) && true;
  const inFilter = (n) => G.filter === "all" || n.topic === G.filter;

  function nodeSVG(n) {
    const lbl = n.type === "topic" ? n.label : trunc(n.label, n.type === "concept" ? 22 : 30);
    const common = `class="node ${n.type} ${n.isNew ? "isnew" : ""}" data-id="${n.id}" transform="translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})" tabindex="0" role="button"`;
    const label = { topic: "Collection", concept: "Concept", item: "Saved item", personal: "Personal entry" }[n.type];
    const aria = `aria-label="${label}: ${esc(n.label)}, ${G.deg[n.id] || 0} connections"`;
    if (n.type === "topic") { const w = Math.max(96, lbl.length * 8.6 + 34); return `<g ${common} ${aria}><rect x="${-w / 2}" y="-19" width="${w}" height="38" rx="19"/><text class="lbl" text-anchor="middle" dy="5">${esc(lbl)}</text></g>`; }
    if (n.type === "concept") { const r = 15 + Math.min(10, (G.deg[n.id] || 0) * 1.1); return `<g ${common} ${aria}><circle class="halo" r="${r + 7}"/><circle class="core" r="${r}"/><text class="lbl" text-anchor="middle" y="${r + 19}">${esc(lbl)}</text></g>`; }
    if (n.type === "personal") return `<g ${common} ${aria}><rect class="core" x="-9" y="-9" width="18" height="18" rx="4" transform="rotate(45)"/><text class="lbl" text-anchor="middle" y="26">${esc(lbl)}</text></g>`;
    return `<g ${common} ${aria}><rect class="core" x="-9" y="-9" width="18" height="18" rx="6"/><text class="lbl" text-anchor="middle" y="26">${esc(lbl)}</text></g>`;
  }
  function edgeSVG(e) {
    const a = G.byId[e.a], b = G.byId[e.b];
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const dx = b.x - a.x, dy = b.y - a.y;
    const bend = e.w === "concept" ? 0.12 : 0;
    const cx = mx - dy * bend, cy = my + dx * bend;
    return `<path class="edge r-${e.r} w-${e.w}" data-a="${e.a}" data-b="${e.b}" d="M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}"/>`;
  }

  function filtersHTML() {
    const chips = [{ id: "all", name: "All topics", tone: "" }].concat(LO.topics.map((t) => ({ id: t.id, name: t.short, tone: t.tone })));
    return chips.map((c) => `<button class="chip" type="button" role="radio" aria-checked="${G.filter === c.id}" data-g-f="${c.id}">${c.tone ? `<span class="dot" data-tone="${c.tone}"></span>` : ""}${esc(c.name)}</button>`).join("");
  }

  function graphHTML() {
    return `<div class="gr" data-mode="${G.mode}" data-items="${G.items}">
      <header class="gr-top">
        <div class="gr-title"><h1 class="title">Knowledge graph</h1><p class="count" id="grCount"></p></div>
        <div class="gr-tools">
          <div class="chips scroll" role="radiogroup" aria-label="Filter by topic">${filtersHTML()}</div>
          <div class="gr-toggles">
            <button class="switch-row" type="button" role="switch" aria-checked="${G.items}" id="grItems"><span class="switch"><span class="knob"></span></span><span>Saved items</span></button>
            <div class="seg" role="radiogroup" aria-label="View"><button type="button" role="radio" aria-checked="${G.mode === "map"}" data-g-m="map">${LO.icon("graph", 18)}<span>Map</span></button><button type="button" role="radio" aria-checked="${G.mode === "list"}" data-g-m="list">${LO.icon("list", 18)}<span>List</span></button></div>
          </div>
        </div>
      </header>
      <div class="gr-body">
        <div class="gr-canvas" id="grCanvas">
          <svg id="grSvg" class="gr-svg" tabindex="0" role="application" aria-label="Knowledge graph. Drag to pan, scroll or pinch to zoom. Tab to move between nodes, Enter to open one." focusable="true">
            <defs><pattern id="grDots" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" class="dotp"/></pattern></defs>
            <g id="grWorld"><rect x="-1600" y="-1200" width="4200" height="3200" fill="url(#grDots)" class="bgdots"/>
              <g class="edges">${G.edges.map(edgeSVG).join("")}</g>
              <g class="nodes">${G.nodes.map(nodeSVG).join("")}</g>
            </g>
          </svg>
          <div class="gr-ctl" role="group" aria-label="Zoom controls">
            <button class="iconbtn solid" type="button" data-g="zin" aria-label="Zoom in">${LO.icon("zoomIn", 22)}</button>
            <button class="iconbtn solid" type="button" data-g="zout" aria-label="Zoom out">${LO.icon("zoomOut", 22)}</button>
            <button class="iconbtn solid" type="button" data-g="fit" aria-label="Fit to screen">${LO.icon("fit", 22)}</button>
          </div>
          <ul class="gr-legend" aria-label="Legend">
            <li><i class="lgd topic"></i>Collection</li><li><i class="lgd concept"></i>Concept</li><li><i class="lgd item"></i>Saved item</li><li><i class="lgd personal"></i>Journal or voice</li>
          </ul>
        </div>
        <div class="gr-list" id="grList"></div>
        <aside class="gr-panel" id="grPanel" aria-label="Details" aria-live="polite"></aside>
      </div>
    </div>`;
  }

  /* ---------- panel ---------- */
  function panelHTML() {
    const n = G.sel && G.byId[G.sel];
    if (!n) {
      const concepts = G.nodes.filter((x) => x.type === "concept").sort((a, b) => (G.deg[b.id] || 0) - (G.deg[a.id] || 0)).slice(0, 5);
      const nItems = LO.state.items.length;
      return `<div class="gp gp-home"><h2 class="gp-h">Your knowledge, connected</h2>
        <p class="gp-s">${G.nodes.filter((x) => x.type === "concept").length} concepts link ${nItems} saved items. Pick a node to see what connects to it.</p>
        <h3 class="det-h">Most connected</h3>
        <ul class="gp-list">${concepts.map((c) => `<li><button type="button" class="gp-row" data-g-sel="${c.id}"><span class="gp-dot concept"></span><span class="gp-t">${esc(c.label)}</span><span class="gp-n">${G.deg[c.id]}</span></button></li>`).join("")}</ul></div>`;
    }
    const topic = LO.topicById(n.topic);
    const close = `<button class="iconbtn gp-x" type="button" data-g="close" aria-label="Close details">${LO.icon("close", 20)}</button>`;
    const nbrNodes = nbrs(n.id).map((id) => G.byId[id]);
    const edgeLabel = (other) => { const e = G.edges.find((x) => (x.a === n.id && x.b === other.id) || (x.b === n.id && x.a === other.id)); if (!e) return "Related to"; if (e.r === "part_of" && e.w === "topic") return other.type === "topic" ? "Collection" : "Contains"; const out = e.a === n.id; if (e.r === "supports") return out ? "Supports" : "Supported by"; if (e.r === "part_of") return out ? "Part of" : "Includes"; if (e.r === "inspired_by") return out ? "Inspired by" : "Inspired"; return "Related to"; };
    if (n.type === "topic") {
      const concepts = nbrNodes.filter((x) => x.type === "concept");
      const count = LO.state.items.filter((i) => i.topic === n.ref).length;
      return `<div class="gp" data-tone="${topic.tone}"><div class="gp-head"><span class="gp-kind">Collection</span>${close}</div><h2 class="gp-h">${esc(topic.name)}</h2><p class="gp-s">${esc(topic.desc)}</p>
        <h3 class="det-h">Concepts</h3><ul class="gp-list">${concepts.map((c) => `<li><button type="button" class="gp-row" data-g-sel="${c.id}"><span class="gp-dot concept"></span><span class="gp-t">${esc(c.label)}</span><span class="gp-n">${G.deg[c.id]}</span></button></li>`).join("")}</ul>
        <div class="gp-actions"><a class="btn primary" href="#/library?topic=${n.ref}">${LO.icon("library", 18)}Open ${count} saved</a></div></div>`;
    }
    if (n.type === "concept") {
      const c = LO.concept(n.ref);
      const items = LO.itemsOf(n.ref);
      const conc = nbrNodes.filter((x) => x.type === "concept" || x.type === "topic");
      return `<div class="gp" data-tone="${topic ? topic.tone : "violet"}"><div class="gp-head"><span class="gp-kind">Concept</span>${close}</div><h2 class="gp-h">${esc(c.name)}</h2><p class="gp-s">${esc(c.desc)}</p>
        ${conc.length ? `<h3 class="det-h">Connected</h3><ul class="gp-list">${conc.map((o) => `<li><button type="button" class="gp-row" data-g-sel="${o.id}"><span class="gp-dot ${o.type}"></span><span class="gp-rel">${edgeLabel(o)}</span><span class="gp-t">${esc(o.label)}</span>${LO.icon("chevR", 16)}</button></li>`).join("")}</ul>` : ""}
        <h3 class="det-h">Saved items <span class="count-pill">${items.length}</span></h3>
        <ul class="gp-items">${items.map((it) => `<li><a class="row" href="#/item/${it.id}">${LO.thumb(it)}<span class="row-body"><span class="row-title">${esc(it.title)}</span><span class="row-meta">${LO.srcGlyph(it.sourceType, 14)}<span>${LO.timeAgo(it.createdAt)}</span></span></span></a></li>`).join("") || '<li class="muted">Nothing saved yet.</li>'}</ul>
        <div class="gp-actions"><a class="btn outline" href="#/library?q=${encodeURIComponent(c.name)}">${LO.icon("library", 18)}Filter library</a><button class="btn outline" type="button" data-g="ask" data-q="What have I saved about ${esc(c.name)}?">${LO.icon("spark", 18)}Ask about this</button></div></div>`;
    }
    const it = LO.item(n.ref);
    const cons = nbrNodes.filter((x) => x.type === "concept");
    return `<div class="gp" data-tone="${LO.tone(it)}"><div class="gp-head"><span class="gp-kind">${LO.sourceMeta[it.sourceType].label}</span>${close}</div><h2 class="gp-h">${esc(it.title)}</h2><p class="gp-s">${esc(it.insight)}</p>
      <p class="gp-src">${LO.srcGlyph(it.sourceType, 16)}<span>${esc(it.sourceName || "")}</span><span class="sep" aria-hidden="true"></span><span>${LO.timeAgo(it.createdAt)}</span></p>
      <h3 class="det-h">Linked concepts</h3><ul class="gp-list">${cons.map((o) => `<li><button type="button" class="gp-row" data-g-sel="${o.id}"><span class="gp-dot concept"></span><span class="gp-t">${esc(o.label)}</span>${LO.icon("chevR", 16)}</button></li>`).join("")}</ul>
      <div class="gp-actions"><a class="btn primary" href="#/item/${it.id}">${LO.icon("note", 18)}Open note</a><a class="btn outline" href="#/explore/${it.id}">${LO.icon("explore", 18)}View as card</a></div></div>`;
  }

  /* ---------- list alternative (non-visual access to the same graph) ---------- */
  function listHTML() {
    return LO.topics.filter((t) => G.filter === "all" || t.id === G.filter).map((t) => {
      const cs = G.nodes.filter((n) => n.type === "concept" && n.topic === t.id);
      return `<section class="gl-g" data-tone="${t.tone}"><h2 class="gl-h"><span class="dot" data-tone="${t.tone}"></span>${esc(t.name)}</h2>
        <ul class="gl-c">${cs.map((c) => { const items = LO.itemsOf(c.ref); const links = nbrs(c.id).map((id) => G.byId[id]).filter((o) => o.type === "concept"); return `<li><button type="button" class="gl-cn" data-g-sel="${c.id}">${esc(c.label)}<span class="gp-n">${G.deg[c.id] || 0}</span></button><p class="gl-links">${links.length ? "Connects to " + links.map((o) => esc(o.label)).join(", ") : "No links to other concepts yet"}</p><ul class="gl-i">${items.map((it) => `<li><a href="#/item/${it.id}">${LO.srcGlyph(it.sourceType, 14)}<span>${esc(it.title)}</span></a></li>`).join("")}</ul></li>`; }).join("")}</ul></section>`;
    }).join("");
  }

  /* ---------- view transform ---------- */
  function apply() {
    const w = $("#grWorld"); if (!w) return;
    w.setAttribute("transform", `translate(${G.v.x.toFixed(2)} ${G.v.y.toFixed(2)}) scale(${G.v.k.toFixed(4)})`);
    const gr = $(".gr"); if (gr) gr.dataset.zoom = G.v.k >= 1.35 ? "hi" : G.v.k < 0.8 ? "lo" : "mid";
  }
  function fit(animated) {
    const cv = $("#grCanvas"); if (!cv) return;
    const r = cv.getBoundingClientRect();
    const pool = G.nodes.filter((n) => visible(n) && inFilter(n));
    if (!pool.length || !r.width) return;
    const xs = pool.map((n) => n.x), ys = pool.map((n) => n.y);
    const pad = LO.phone() ? 28 : 56;
    const ext = (n) => (n.type === "topic" ? Math.max(96, n.label.length * 8.6 + 34) / 2 + 12 : n.type === "concept" ? Math.max(40, n.label.length * 3.6 + 12) : 34);
    const minX = Math.min(...pool.map((n) => n.x - ext(n))), maxX = Math.max(...pool.map((n) => n.x + ext(n))), minY = Math.min(...ys) - 40, maxY = Math.max(...ys) + 64;
    const panelW = LO.wide() && G.mode === "map" ? 0 : 0;
    const k = Math.max(0.35, Math.min(1.6, Math.min((r.width - pad * 2 - panelW) / (maxX - minX), (r.height - pad * 2) / (maxY - minY))));
    const target = { k, x: r.width / 2 - ((minX + maxX) / 2) * k, y: r.height / 2 - ((minY + maxY) / 2) * k };
    tween(target, animated);
  }
  let raf = null;
  function tween(t, animated) {
    cancelAnimationFrame(raf);
    if (!animated || LO.reduced()) { G.v = t; apply(); return; }
    const s = Object.assign({}, G.v), t0 = performance.now(), d = 380;
    const step = (now) => { const p = Math.min(1, (now - t0) / d), e = 1 - Math.pow(1 - p, 3); G.v = { x: s.x + (t.x - s.x) * e, y: s.y + (t.y - s.y) * e, k: s.k + (t.k - s.k) * e }; apply(); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  }
  function zoomAt(f, cx, cy) {
    const cv = $("#grCanvas"), r = cv.getBoundingClientRect();
    const px = (cx == null ? r.width / 2 : cx - r.left), py = (cy == null ? r.height / 2 : cy - r.top);
    const k = Math.max(0.3, Math.min(3.2, G.v.k * f)), real = k / G.v.k;
    tween({ k, x: px - (px - G.v.x) * real, y: py - (py - G.v.y) * real }, false);
  }
  function centerOn(n, k) {
    const cv = $("#grCanvas"), r = cv.getBoundingClientRect();
    const kk = k || Math.max(G.v.k, 1.05);
    const offY = !LO.wide() && G.sel ? -r.height * 0.14 : 0;
    tween({ k: kk, x: r.width / 2 - n.x * kk, y: r.height / 2 - n.y * kk + offY }, true);
  }

  function paintSel() {
    const svg = $("#grSvg"); if (!svg) return;
    const sel = G.sel, nb = sel ? new Set(nbrs(sel)) : new Set();
    $$(".node", svg).forEach((el) => {
      const id = el.dataset.id, n = G.byId[id];
      const hidden = !visible(n);
      el.classList.toggle("hide", hidden);
      el.classList.toggle("sel", id === sel);
      el.classList.toggle("nb", sel ? nb.has(id) : false);
      el.classList.toggle("dim", (sel && id !== sel && !nb.has(id)) || (!sel && !inFilter(n)) || (sel && !inFilter(n) && id !== sel && !nb.has(id)));
      if (id === sel) el.setAttribute("aria-pressed", "true"); else el.removeAttribute("aria-pressed");
    });
    $$(".edge", svg).forEach((el) => {
      const a = G.byId[el.dataset.a], b = G.byId[el.dataset.b];
      const hid = !visible(a) || !visible(b);
      const hot = sel && (el.dataset.a === sel || el.dataset.b === sel);
      el.classList.toggle("hide", hid);
      el.classList.toggle("hot", !!hot);
      el.classList.toggle("dim", !!sel ? !hot : !(inFilter(a) && inFilter(b)));
    });
    const gr = $(".gr"); if (gr) { gr.dataset.sel = sel ? "1" : "0"; gr.dataset.items = G.items; }
    const vis = G.nodes.filter((n) => visible(n));
    $("#grCount").textContent = `${vis.length} nodes, ${G.edges.filter((e) => visible(G.byId[e.a]) && visible(G.byId[e.b])).length} links`;
    $("#grPanel").innerHTML = panelHTML();
    $("#grList").innerHTML = listHTML();
  }
  function select(id, opts) {
    G.sel = id;
    paintSel();
    if (id && !(opts && opts.quiet)) centerOn(G.byId[id]);
    if (id) history.replaceState(null, "", "#/graph/" + id.replace(/^[a-z]:/, ""));
    else history.replaceState(null, "", "#/graph");
    if (id && opts && opts.focusPanel) { const p = $("#grPanel .gp-h"); if (p) { p.setAttribute("tabindex", "-1"); p.focus({ preventScroll: true }); } }
  }

  function mount(root, args) {
    build();
    $("#grCount").textContent = "";
    const stage = $("#grCanvas");
    if (!G.init) { G.items = LO.wide(); G.init = true; }
    if (args[0]) { const id = (LO.concept(args[0]) ? "c:" : LO.item(args[0]) ? "n:" : "") + args[0]; if (G.byId[id]) { G.sel = id; if (G.byId[id].type !== "concept" && G.byId[id].type !== "topic") G.items = true; } }
    $("#grItems").setAttribute("aria-checked", G.items); $(".gr").dataset.items = G.items;
    paintSel();
    requestAnimationFrame(() => { fit(false); if (G.sel) setTimeout(() => centerOn(G.byId[G.sel]), 60); });

    root.addEventListener("click", (e) => {
      const f = e.target.closest("[data-g-f]");
      if (f) { G.filter = f.dataset.gF; $$("[data-g-f]", root).forEach((b) => b.setAttribute("aria-checked", b === f)); if (G.sel && !inFilter(G.byId[G.sel])) G.sel = null; paintSel(); fit(true); return; }
      const m = e.target.closest("[data-g-m]");
      if (m) { G.mode = m.dataset.gM; $$("[data-g-m]", root).forEach((b) => b.setAttribute("aria-checked", b === m)); $(".gr").dataset.mode = G.mode; if (G.mode === "map") requestAnimationFrame(() => fit(false)); return; }
      const s = e.target.closest("[data-g-sel]"); if (s) { select(s.dataset.gSel, { focusPanel: false }); if (G.mode === "list") { G.mode = "map"; $$("[data-g-m]", root).forEach((b) => b.setAttribute("aria-checked", b.dataset.gM === "map")); $(".gr").dataset.mode = "map"; requestAnimationFrame(() => centerOn(G.byId[s.dataset.gSel])); } return; }
      const a = e.target.closest("[data-g]");
      if (a) { const k = a.dataset.g; if (k === "zin") zoomAt(1.3); else if (k === "zout") zoomAt(1 / 1.3); else if (k === "fit") fit(true); else if (k === "close") { select(null); fit(true); const n = $(".node:focus"); } else if (k === "ask") LO.askQuestion(a.dataset.q); return; }
      const sw = e.target.closest("#grItems");
      if (sw) { G.items = sw.getAttribute("aria-checked") !== "true"; sw.setAttribute("aria-checked", G.items); if (!G.items && G.sel && ["item", "personal"].includes(G.byId[G.sel].type)) G.sel = null; paintSel(); fit(true); return; }
    });

    /* pointer: pan, pinch, node select */
    const svg = $("#grSvg");
    const ptrs = new Map();
    let pan = null, pinch = null, moved = 0;
    svg.addEventListener("pointerdown", (e) => {
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      svg.setPointerCapture(e.pointerId);
      moved = 0;
      if (ptrs.size === 1) pan = { x: e.clientX, y: e.clientY, vx: G.v.x, vy: G.v.y, node: e.target.closest(".node") };
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: G.v.k, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; pan = null; }
    });
    svg.addEventListener("pointermove", (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); zoomAt((pinch.k * d / pinch.d) / G.v.k, (a.x + b.x) / 2, (a.y + b.y) / 2); moved = 99; return; }
      if (pan) { const dx = e.clientX - pan.x, dy = e.clientY - pan.y; moved = Math.max(moved, Math.abs(dx) + Math.abs(dy)); if (moved > 5) { G.v.x = pan.vx + dx; G.v.y = pan.vy + dy; apply(); svg.classList.add("panning"); } }
    });
    const up = (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.delete(e.pointerId); svg.classList.remove("panning");
      if (ptrs.size < 2) pinch = null;
      if (pan && moved <= 5) { const node = pan.node; if (node) { select(node.dataset.id, { focusPanel: false }); } else if (G.sel) select(null); }
      if (ptrs.size === 0) pan = null;
    };
    svg.addEventListener("pointerup", up); svg.addEventListener("pointercancel", up);
    svg.addEventListener("wheel", (e) => { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY); }, { passive: false });
    svg.addEventListener("keydown", (e) => {
      const node = e.target.closest(".node");
      if (node && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); select(node.dataset.id, { focusPanel: true }); return; }
      if (e.key === "Escape" && G.sel) { select(null); return; }
      const step = 48;
      if (e.target === svg) {
        if (e.key === "ArrowLeft") { G.v.x += step; apply(); e.preventDefault(); }
        else if (e.key === "ArrowRight") { G.v.x -= step; apply(); e.preventDefault(); }
        else if (e.key === "ArrowUp") { G.v.y += step; apply(); e.preventDefault(); }
        else if (e.key === "ArrowDown") { G.v.y -= step; apply(); e.preventDefault(); }
        else if (e.key === "+" || e.key === "=") zoomAt(1.2); else if (e.key === "-") zoomAt(1 / 1.2); else if (e.key === "0") fit(true);
      }
    });
    svg.addEventListener("focusin", (e) => { const node = e.target.closest && e.target.closest(".node"); if (node) { const cv = $("#grCanvas").getBoundingClientRect(); const n = G.byId[node.dataset.id]; const sx = n.x * G.v.k + G.v.x, sy = n.y * G.v.k + G.v.y; if (sx < 20 || sy < 20 || sx > cv.width - 20 || sy > cv.height - 20) centerOn(n, G.v.k); } });
    const onResize = () => { if (G.mode === "map") fit(false); };
    window.addEventListener("resize", onResize); LO.onLeave(() => { window.removeEventListener("resize", onResize); cancelAnimationFrame(raf); });
    const off = LO.on("items", () => { if (LO.parseHash().name === "graph") { build(); $("#grSvg .edges").innerHTML = G.edges.map(edgeSVG).join(""); $("#grSvg .nodes").innerHTML = G.nodes.map(nodeSVG).join(""); paintSel(); } });
    LO.onLeave(off);
  }

  LO.routes.graph = {
    title: () => "Knowledge graph",
    render() { build(); return graphHTML(); },
    mount
  };
})();

/* Life OS prototype — Home, Library, Knowledge detail, Journal, Reminders, Settings. */
(function () {
  const LO = window.LO;
  const { $, $$, esc } = LO;

  /* ---------- shared builders ---------- */
  LO.tone = (it) => (LO.topicById(it.topic) || LO.topics[3]).tone;
  LO.thumb = (it, cls) => `<span class="thumb ${cls || ""}" data-tone="${LO.tone(it)}">${LO.art(it.art)}</span>`;
  LO.heart = (on, size) => `<svg class="ic heart ${on ? "on" : ""}" width="${size || 20}" height="${size || 20}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="${on ? "currentColor" : "none"}"><path d="M12 20s-7.5-4.6-7.5-10.3A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z"/></svg>`;
  LO.ring = function (pct, size, stroke, label) {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r;
    return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--colorNeutralStroke2)" stroke-width="${stroke}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--colorBrandBackground)" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c * pct} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
  };
  const weekSeen = () => {
    const cut = Date.now() - 7 * 864e5;
    return LO.state.deck.filter((id) => LO.state.seen[id] && LO.state.seen[id].at >= cut).length;
  };
  LO.weekSeen = weekSeen;
  const unseenItems = () => LO.state.deck.map(LO.item).filter((i) => i && !i.processing && !(LO.state.seen[i.id] && LO.state.seen[i.id].at >= Date.now() - 7 * 864e5));

  const recentCard = (it) => `<a class="recent ${it.processing ? "is-proc" : ""}" href="#/item/${it.id}" data-tone="${LO.tone(it)}">
      <span class="recent-art">${LO.art(it.art)}${it.isNew && !it.processing ? '<span class="badge-new">New</span>' : ""}</span>
      <span class="recent-body">
        <span class="recent-src">${LO.srcGlyph(it.sourceType, 14)}<span>${esc(it.sourceName || LO.sourceMeta[it.sourceType].label)}</span></span>
        <span class="recent-title">${it.processing ? '<span class="shimmer-line"></span><span class="shimmer-line s"></span>' : esc(it.title)}</span>
        <span class="recent-time">${it.processing ? "Organising\u2026" : LO.timeAgo(it.createdAt)}</span>
      </span></a>`;

  /* ================= HOME (Today) ================= */
  const clock = (ts) => new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const spanLabel = (m) => (m < 60 ? m + " min" : m % 60 ? Math.floor(m / 60) + " h " + (m % 60) + " min" : m / 60 + " h");

  /* "Recently captured" is what you saved: calendar, email and health syncs live in Today and Library instead. */
  const isRecent = (i) => i.processing || (i.sourceType !== "journal" && (!LO.isLife(i) || i.isNew));

  function scheduleHTML(t) {
    if (!t.schedule.length) return `<p class="ag-empty">${LO.icon("calendar", 20)}<span>Nothing scheduled today. <a href="#/settings">Connect your calendar</a> to see meetings here.</span></p>`;
    const now = Date.now();
    return `<ol class="ag-list">${t.schedule.map(({ item, state }) => {
      const mins = Math.round((item.endsAt - item.startsAt) / 60000);
      const badge = state === "now" ? "Now" : state === "next" ? "In " + spanLabel(Math.max(1, Math.round((item.startsAt - now) / 60000))) : state === "done" ? "Done" : "";
      const who = (item.people || []).length ? "with " + item.people.join(", ") : item.sourceName || "";
      return `<li class="ag" data-state="${state}">
        <span class="ag-time"><b>${clock(item.startsAt)}</b><small>${spanLabel(mins)}</small></span>
        <a class="ag-body" href="#/item/${item.id}"><span class="ag-t">${esc(item.title)}</span><span class="ag-m">${LO.srcGlyph(item.sourceType, 14)}<span>${esc(who)}</span></span></a>
        ${badge ? `<span class="ag-badge">${esc(badge)}</span>` : ""}</li>`;
    }).join("")}</ol>`;
  }

  const priRow = (p) => {
    const body = `<span class="pri-t">${esc(p.title)}</span><span class="pri-w">${p.src ? LO.srcGlyph(p.src.sourceType, 14) : ""}<span>${esc(p.why)}</span></span>`;
    return `<li class="pri"><label class="check pri-check"><input type="checkbox" data-pri="${p.key}" /><span class="box" aria-hidden="true">${LO.icon("check", 14)}</span><span class="vh">Mark done: ${esc(p.title)}</span></label>${p.src ? `<a class="pri-body" href="#/item/${p.src.id}">${body}</a>` : `<span class="pri-body">${body}</span>`}</li>`;
  };
  function prioritiesHTML(t) {
    if (!t.priorities.length) return `<p class="ag-empty">${LO.icon("check", 20)}<span>You are clear. Nothing is waiting on you.</span></p>`;
    return `<ul class="pri-list">${t.top.map(priRow).join("")}</ul>${t.more.length ? `<details class="pri-more"><summary><span>${t.more.length} more</span>${LO.icon("chevD", 16)}</summary><ul class="pri-list">${t.more.map(priRow).join("")}</ul></details>` : ""}`;
  }

  function healthHTML(t, cls) {
    const seen = new Set();
    const meters = t.health.filter((h) => (seen.has(h.metric.label) ? false : seen.add(h.metric.label))).slice(0, 2);
    if (!meters.length && !t.appointment) return "";
    const a = t.appointment;
    return `<section class="side-sec hl ${cls}" aria-labelledby="hl-h-${cls}"><div class="side-head"><h2 class="side-h" id="hl-h-${cls}">Health</h2><a class="link" href="#/library?f=health">All health</a></div>
      <ul class="hl-list">${meters.map((h) => { const pct = Math.round(Math.min(1, h.metric.pct) * 100); return `<li><a href="#/item/${h.id}"><span class="hl-top"><span class="hl-l">${esc(h.metric.label)}</span><span class="hl-v">${esc(h.metric.value)}<small> of ${esc(h.metric.goal)}</small></span></span><span class="meter" role="img" aria-label="${pct} percent of goal"><i style="width:${pct}%"></i></span></a></li>`; }).join("")}</ul>
      ${a ? `<a class="hl-appt" href="#/item/${a.id}">${LO.icon("calendar", 16)}<span>${esc(a.title)}, ${new Date(a.startsAt).toLocaleDateString(undefined, { weekday: "short" })} ${clock(a.startsAt)}</span></a>` : ""}</section>`;
  }

  function homeHTML() {
    const s = LO.state;
    const h = new Date().getHours();
    const greet = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    const ready = unseenItems().length;
    const t = LO.today();
    const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
    const feat = LO.item("i10") || s.items[0];
    const unseen = unseenItems().filter((i) => i.id !== feat.id).sort((a, b) => a.createdAt - b.createdAt)[0] || s.items[s.items.length - 1];
    const ft = LO.topicById(feat.topic);
    const seenN = weekSeen();
    const total = s.deck.length;
    const recents = s.items.filter(isRecent).slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);
    const openRem = s.reminders.filter((r) => !r.completed).sort((a, b) => a.dueAt - b.dueAt);
    const journals = s.items.filter((i) => i.sourceType === "journal").length;
    const days = Array.from({ length: 7 }, (_, k) => {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - k));
      const on = Object.values(s.seen).some((v) => v.at >= d.getTime() && v.at < d.getTime() + 864e5);
      return { on, label: d.toLocaleDateString(undefined, { weekday: "narrow" }), full: d.toLocaleDateString(undefined, { weekday: "long" }) };
    });
    const cA = LO.concept("context"), cB = LO.concept("knowsys");

    const revisitCard = `<section class="rev" aria-labelledby="rv-h">
        <div class="rev-ring">${LO.ring(seenN / total, 76, 8, `${seenN} of ${total} cards revisited this week`)}<span class="rev-n">${seenN}<small>/${total}</small></span></div>
        <div><h2 class="side-h" id="rv-h">Revisited this week</h2>
          <p class="rev-t">${seenN === total ? "You have seen every card. Add something new." : `${total - seenN} cards are waiting for you.`}</p>
          <ul class="rev-days" aria-label="Days you revisited knowledge">${days.map((d) => `<li class="${d.on ? "on" : ""}"><span class="vh">${d.full}${d.on ? ", revisited" : ""}</span><i aria-hidden="true"></i><b aria-hidden="true">${d.label}</b></li>`).join("")}</ul></div>
      </section>`;

    const healthSide = healthHTML(t, "hl-side");
    const healthSmall = healthHTML(t, "hl-small");
    const todayDate = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

    const banner = s.bannerDismissed ? "" : `<section class="setup" aria-labelledby="su-h">
        <div class="setup-ic">${LO.icon("share", 22)}</div>
        <div class="setup-b"><h2 class="setup-h" id="su-h">Save from anywhere</h2><p>Add Life OS to your home screen, share into it from any app, or install the Chrome extension.</p>
        <div class="setup-a"><a class="btn primary" href="#/welcome">Set up capture</a><button class="btn subtle" type="button" data-act="dismiss-banner">Not now</button></div></div></section>`;

    return `<div class="home">
      <section class="home-hero"><h1 class="display">${greet}, Kapil</h1><p class="lede">${plural(t.left, "meeting", "meetings")} left, ${plural(t.owed, "reply", "replies")} owed, ${ready} ${ready === 1 ? "card" : "cards"} to revisit.</p></section>

      <form class="quickbar" id="quickbar" aria-label="Quick capture">
        <label class="vh" for="qb">Quick capture</label>
        <input id="qb" class="qb-in" type="text" autocomplete="off" placeholder="What's on your mind?" enterkeyhint="send" />
        <button class="iconbtn" type="button" data-act="capture" data-mode="voice" aria-label="Record a voice note">${LO.icon("mic", 22)}</button>
        <button class="iconbtn" type="button" data-act="capture" data-mode="link" aria-label="Save a link">${LO.icon("link", 22)}</button>
        <button class="qb-go" type="submit" aria-label="Save">${LO.icon("plus", 22)}</button>
      </form>

      <div class="home-grid">
        <div class="home-main">
          <section aria-labelledby="h-today">
            <div class="sec-head"><h2 class="sec-h" id="h-today">Today</h2><span class="sec-sub">${todayDate}</span></div>
            <div id="agenda">${scheduleHTML(t)}</div>
          </section>

          <section aria-labelledby="h-pri">
            <div class="sec-head"><h2 class="sec-h" id="h-pri">Priorities</h2><span class="sec-sub">${t.priorities.length} open</span></div>
            <div id="priorities">${prioritiesHTML(t)}</div>
          </section>
          ${healthSmall}

          <section aria-labelledby="h-disc">
            <h2 class="sec-h" id="h-disc">Worth a second look</h2>
            <article class="disc" data-tone="${ft.tone}">
              <div class="disc-art">${LO.art(feat.art)}</div>
              <div class="disc-body">
                <p class="disc-from">${LO.srcGlyph(feat.sourceType, 16)}<span>Saved ${LO.timeAgo(feat.createdAt).replace(" ago", "")} ago</span></p>
                <h3 class="disc-title"><a href="#/item/${feat.id}">${esc(feat.title)}</a></h3>
                <p class="disc-insight">${esc(feat.insight)}</p>
                <div class="disc-actions"><a class="btn primary lg" href="#/explore">${LO.icon("explore", 20)}Swipe through today's ${total}</a><a class="btn subtle lg" href="#/infographic/${feat.id}">${LO.icon("infographic", 20)}Infographic</a></div>
              </div>
            </article>
            <div class="disc-pair">
              <a class="mini" href="#/graph/${cA.id}" data-tone="mint"><span class="mini-ic">${LO.icon("graph", 20)}</span><span class="mini-b"><span class="mini-k">A connection to explore</span><span class="mini-t">${esc(cA.name)} inspired ${esc(cB.name)}</span></span></a>
              <a class="mini" href="#/item/${unseen.id}" data-tone="${LO.tone(unseen)}"><span class="mini-ic">${LO.icon("history", 20)}</span><span class="mini-b"><span class="mini-k">Not opened in ${Math.max(1, Math.round((Date.now() - unseen.createdAt) / 864e5))} days</span><span class="mini-t">${esc(unseen.title)}</span></span></a>
            </div>
          </section>

          <section aria-labelledby="h-rec">
            <div class="sec-head"><h2 class="sec-h" id="h-rec">Recently captured</h2><a class="link" href="#/library">See all</a></div>
            <div class="rail" id="recentRail" tabindex="-1">${recents.map(recentCard).join("")}</div>
          </section>

          <section aria-labelledby="h-top">
            <h2 class="sec-h" id="h-top">Explore your knowledge</h2>
            <div class="colls">${LO.topics.slice().sort((a, b) => (s.interests.includes(b.id) ? 1 : 0) - (s.interests.includes(a.id) ? 1 : 0)).map((t) => {
              const n = s.items.filter((i) => i.topic === t.id).length;
              return `<a class="coll" href="#/library?topic=${t.id}" data-tone="${t.tone}"><span class="coll-art">${LO.art(t.art)}</span><span class="coll-b"><span class="coll-n">${esc(t.name)}</span><span class="coll-c">${n} saved</span><span class="coll-d">${esc(t.desc)}</span></span></a>`;
            }).join("")}</div>
          </section>

          <section class="qa-small" aria-labelledby="h-qa">
            <h2 class="sec-h" id="h-qa">Quick access</h2>
            <ul class="qa">
              <li><a href="#/graph"><span class="qa-ic">${LO.icon("graph", 22)}</span><span class="qa-t">Knowledge graph</span><span class="qa-s">${LO.allConcepts().length} concepts</span>${LO.icon("chevR", 18)}</a></li>
              <li><a href="#/journal"><span class="qa-ic">${LO.icon("journal", 22)}</span><span class="qa-t">Journal</span><span class="qa-s">${journals} entries</span>${LO.icon("chevR", 18)}</a></li>
              <li><a href="#/reminders"><span class="qa-ic">${LO.icon("bell", 22)}</span><span class="qa-t">Reminders</span><span class="qa-s">${openRem.length} open</span>${LO.icon("chevR", 18)}</a></li>
            </ul>
          </section>
          <div class="setup-small">${banner}</div>
        </div>

        <aside class="home-side" aria-label="Your week">
          ${revisitCard}
          ${healthSide}
          <section class="side-sec jr" aria-labelledby="jr-h"><div class="side-head"><h2 class="side-h" id="jr-h">Journal</h2><a class="link" href="#/journal">Open journal</a></div>
            <p class="jr-q">${esc(LO.journalPrompts[new Date().getDate() % LO.journalPrompts.length])}</p>
            <button class="btn outline" type="button" data-act="capture" data-mode="journal">${LO.icon("edit", 18)}Write an entry</button></section>
          <div class="setup-wide">${banner}</div>
        </aside>
      </div>
    </div>`;
  }
  function homeMount(root) {
    const form = $("#quickbar", root);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = $("#qb", root).value.trim();
      if (!v) { LO.openCapture({}); return; }
      $("#qb", root).value = "";
      LO.quickSave(v);
    });
    root.addEventListener("change", (e) => {
      const c = e.target.closest("[data-rem]");
      if (c) completeReminder(c.dataset.rem, c.checked);
      const p = e.target.closest("[data-pri]");
      if (p) resolvePriority(p.dataset.pri, p.checked);
    });
    if (LO.state.clipboardOffer && !sessionStorage.getItem("lo.clipoffer") && LO.parseHash().q.clip === "1") {
      sessionStorage.setItem("lo.clipoffer", "1");
      LO.toast("A link is on your clipboard.", { icon: "link", duration: 8000, action: { label: "Save it", fn: () => LO.quickSave(LO.samples.youtube.url) } });
    }
    const off = LO.on("items", () => { const rail = $("#recentRail"); if (!rail) return; const recents = LO.state.items.filter(isRecent).slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 8); rail.innerHTML = recents.map(recentCard).join(""); });
    LO.onLeave(off);
  }
  LO.completeReminder = completeReminder;
  /* A priority is either a reminder ("rem:id") or something waiting on a reply or callback ("item:id"). */
  function resolvePriority(key, on) {
    const [kind, id] = key.split(":");
    if (kind === "rem") { completeReminder(id, on); return; }
    const it = LO.item(id);
    if (!it) return;
    it.needsReply = !on; LO.save();
    if (on) LO.toast("Marked done", { icon: "check", action: { label: "Undo", fn: () => { it.needsReply = true; LO.save(); LO.render(); } } });
    setTimeout(() => { if (["home", "item", "library"].includes(LO.parseHash().name)) LO.render(); }, on ? 280 : 0);
  }
  LO.resolvePriority = resolvePriority;
  function completeReminder(id, on) {
    const r = LO.state.reminders.find((x) => x.id === id);
    if (!r) return;
    r.completed = !!on; LO.save(); LO.refreshCounts();
    if (on) LO.toast("Marked done", { icon: "check", action: { label: "Undo", fn: () => { r.completed = false; LO.save(); LO.refreshCounts(); LO.render(); } } });
    setTimeout(() => { if (["home", "reminders"].includes(LO.parseHash().name)) LO.render(); }, on ? 280 : 0);
  }
  LO.routes.home = { render: homeHTML, mount: homeMount, title: () => "Home" };

  /* ================= LIBRARY + DETAIL ================= */
  const LF = { all: () => true, meetings: (i) => i.sourceType === "meeting", emails: (i) => i.sourceType === "email", calls: (i) => i.sourceType === "call", health: (i) => i.sourceType === "health", articles: (i) => i.sourceType === "website", videos: (i) => ["youtube", "instagram"].includes(i.sourceType), voice: (i) => i.sourceType === "voice", journal: (i) => i.sourceType === "journal", ideas: (i) => i.sourceType === "text", chats: (i) => i.sourceType === "chat" };
  const LFL = [["all", "All"], ["meetings", "Meetings"], ["emails", "Emails"], ["calls", "Calls"], ["health", "Health"], ["articles", "Articles"], ["videos", "Videos"], ["voice", "Voice notes"], ["journal", "Journal"], ["ideas", "Ideas"], ["chats", "AI chats"]];
  const lib = { q: "", f: "all", s: "recent", view: "list", topic: "" };
  let editing = false;

  const rowHTML = (it, q, sel) => `<a class="row ${it.processing ? "is-proc" : ""}" href="#/item/${it.id}" ${sel ? 'aria-current="true"' : ""} data-id="${it.id}">
      ${LO.thumb(it)}
      <span class="row-body">
        <span class="row-title">${it.processing ? "Organising\u2026" : LO.hl(it.title, q)}</span>
        <span class="row-sum">${it.processing ? esc(it.original.slice(0, 90)) : LO.hl(it.insight, q)}</span>
        <span class="row-meta">${LO.srcGlyph(it.sourceType, 14)}<span>${esc(it.sourceName || "")}</span><span class="sep" aria-hidden="true"></span><span>${LO.timeAgo(it.createdAt)}</span>${it.needsReply ? `<span class="pill warn">${it.sourceType === "call" ? "Call back" : "Reply needed"}</span>` : ""}${it.isFavorite ? `<span class="row-fav" aria-label="Favourite">${LO.heart(true, 14)}</span>` : ""}</span>
      </span></a>`;
  const gridHTML = (it, q, sel) => `<a class="gcard" href="#/item/${it.id}" ${sel ? 'aria-current="true"' : ""} data-tone="${LO.tone(it)}"><span class="gcard-art">${LO.art(it.art)}</span><span class="gcard-b"><span class="row-title">${LO.hl(it.title, q)}</span><span class="row-meta">${LO.srcGlyph(it.sourceType, 14)}<span>${LO.timeAgo(it.createdAt)}</span></span></span></a>`;

  function libResults(selId) {
    let list = LO.search(lib.q).filter(LF[lib.f]);
    if (lib.topic) list = list.filter((i) => i.topic === lib.topic);
    if (!lib.q) {
      if (lib.s === "oldest") list.sort((a, b) => a.createdAt - b.createdAt);
      else if (lib.s === "topic") list.sort((a, b) => LO.topics.findIndex((t) => t.id === a.topic) - LO.topics.findIndex((t) => t.id === b.topic) || b.createdAt - a.createdAt);
      else list.sort((a, b) => b.createdAt - a.createdAt);
    }
    const state = LO.parseHash().q.state;
    if (state === "loading") return { n: 0, html: `<div class="skel-list" aria-busy="true" aria-label="Loading your library">${Array.from({ length: 5 }, () => `<div class="row skel-row"><span class="thumb skel-box"></span><span class="row-body"><i class="shimmer-line"></i><i class="shimmer-line s"></i></span></div>`).join("")}</div>` };
    if (!list.length) {
      return { n: 0, html: `<div class="empty"><div class="empty-art" data-tone="mint">${LO.art("research")}</div><h2 class="empty-h">${lib.q ? `Nothing matches \u201C${esc(lib.q)}\u201D` : "Nothing here yet"}</h2><p class="empty-p">${lib.q ? "Try fewer words, or ask your knowledge a question instead." : "Capture a thought, a link or a voice note and it will show up here, already organised."}</p><div class="empty-a">${lib.q ? `<button class="btn primary" type="button" data-lib="ask">${LO.icon("spark", 18)}Ask instead</button>` : `<button class="btn primary" type="button" data-act="capture">${LO.icon("plus", 18)}Capture something</button>`}<button class="btn subtle" type="button" data-lib="clear">Clear filters</button></div></div>` };
    }
    let html = "";
    if (lib.view === "grid") html = `<div class="ggrid">${list.map((i) => gridHTML(i, lib.q, i.id === selId)).join("")}</div>`;
    else if (lib.s === "topic" && !lib.q) {
      html = LO.topics.map((t) => { const g = list.filter((i) => i.topic === t.id); return g.length ? `<h3 class="grp">${esc(t.name)} <span>${g.length}</span></h3>${g.map((i) => rowHTML(i, lib.q, i.id === selId)).join("")}` : ""; }).join("");
    } else html = list.map((i) => rowHTML(i, lib.q, i.id === selId)).join("");
    return { n: list.length, html };
  }

  function libraryShell(selId, detailHTMLStr) {
    const topic = lib.topic ? LO.topicById(lib.topic) : null;
    const res = libResults(selId);
    return `<div class="lib ${selId ? "has-detail" : ""}">
      <section class="lib-list" aria-labelledby="lib-h">
        <header class="lib-head"><h1 class="title" id="lib-h">Library</h1><p class="count" id="libCount">${res.n} ${res.n === 1 ? "item" : "items"}</p></header>
        <div class="lib-tools">
          <form class="searchbox" role="search" id="libSearch"><span class="sb-ic">${LO.icon("search", 20)}</span><label class="vh" for="libQ">Search your knowledge</label><input id="libQ" type="search" autocomplete="off" placeholder="Search your knowledge" value="${esc(lib.q)}" /></form>
          <div class="chips scroll" role="radiogroup" aria-label="Filter by type">${LFL.map(([k, l]) => `<button class="chip" type="button" role="radio" aria-checked="${lib.f === k}" data-lib-f="${k}">${l}</button>`).join("")}</div>
          <div class="lib-row2">
            ${topic ? `<button class="chip on-topic" type="button" data-lib="clear-topic" aria-label="Clear collection filter: ${esc(topic.name)}"><span class="dot" data-tone="${topic.tone}"></span>${esc(topic.name)}${LO.icon("close", 14)}</button>` : "<span></span>"}
            <div class="lib-ctl">
              <label class="select"><span class="vh">Sort by</span>${LO.icon("sort", 16)}<select id="libSort" aria-label="Sort by"><option value="recent" ${lib.s === "recent" ? "selected" : ""}>Recent</option><option value="oldest" ${lib.s === "oldest" ? "selected" : ""}>Oldest</option><option value="topic" ${lib.s === "topic" ? "selected" : ""}>Topic</option></select>${LO.icon("chevD", 14)}</label>
              <div class="seg" role="radiogroup" aria-label="Layout"><button type="button" role="radio" aria-checked="${lib.view === "list"}" data-lib-v="list" aria-label="List">${LO.icon("list", 18)}</button><button type="button" role="radio" aria-checked="${lib.view === "grid"}" data-lib-v="grid" aria-label="Grid">${LO.icon("grid", 18)}</button></div>
            </div>
          </div>
        </div>
        <div class="lib-results" id="libResults" aria-live="polite">${res.html}</div>
      </section>
      <section class="lib-detail" id="libDetail" aria-label="Item details">${detailHTMLStr || `<div class="pane-empty"><div class="pane-empty-art" data-tone="mint">${LO.art("network")}</div><h2>Pick something to read</h2><p>Your notes open here, with their summary, key insights and connections.</p></div>`}</section>
    </div>`;
  }

  function libMount(root, selId) {
    const upd = () => {
      const r = libResults(selId);
      $("#libResults", root).innerHTML = r.html;
      $("#libCount", root).textContent = r.n + (r.n === 1 ? " item" : " items");
      $$("[data-lib-f]", root).forEach((b) => b.setAttribute("aria-checked", b.dataset.libF === lib.f));
      $$("[data-lib-v]", root).forEach((b) => b.setAttribute("aria-checked", b.dataset.libV === lib.view));
      const u = new URLSearchParams(); if (lib.q) u.set("q", lib.q); if (lib.topic) u.set("topic", lib.topic); if (lib.f !== "all") u.set("f", lib.f);
      if (!selId) history.replaceState(null, "", "#/library" + (u.toString() ? "?" + u : ""));
    };
    $("#libSearch", root).addEventListener("submit", (e) => e.preventDefault());
    $("#libQ", root).addEventListener("input", (e) => { lib.q = e.target.value; upd(); });
    $("#libSort", root).addEventListener("change", (e) => { lib.s = e.target.value; upd(); });
    root.addEventListener("click", (e) => {
      const f = e.target.closest("[data-lib-f]"); if (f) { lib.f = f.dataset.libF; upd(); return; }
      const v = e.target.closest("[data-lib-v]"); if (v) { lib.view = v.dataset.libV; upd(); return; }
      const a = e.target.closest("[data-lib]");
      if (a) {
        if (a.dataset.lib === "ask") LO.askQuestion(lib.q);
        else if (a.dataset.lib === "clear") { lib.q = ""; lib.f = "all"; lib.topic = ""; $("#libQ", root).value = ""; upd(); }
        else if (a.dataset.lib === "clear-topic") { lib.topic = ""; LO.go("#/library"); }
      }
    });
    const off = LO.on("items", () => { if (LO.parseHash().name === "library" || LO.parseHash().name === "item") { const q = $("#libResults"); if (q) { const r = libResults(selId); q.innerHTML = r.html; $("#libCount").textContent = r.n + (r.n === 1 ? " item" : " items"); } } });
    LO.onLeave(off);
  }

  LO.routes.library = {
    title: () => "Library",
    render(args, q) {
      lib.q = q.q || ""; lib.topic = q.topic || ""; lib.f = LF[q.f] ? q.f : "all"; editing = false;
      return libraryShell(null, "");
    },
    mount(root, args, q) { libMount(root, null); if (q.focus === "1") $("#libQ").focus(); }
  };

  /* Context line for life items: when, who, how much, and whether something is owed. */
  function factsHTML(it) {
    const f = [];
    if (it.startsAt) f.push(`${LO.icon("calendar", 16)}<span>${new Date(it.startsAt).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}, ${clock(it.startsAt)} to ${clock(it.endsAt)}</span>`);
    if ((it.people || []).length) f.push(`${LO.icon("user", 16)}<span>${esc(it.people.join(", "))}</span>`);
    if (it.metric) f.push(`${LO.icon("pulse", 16)}<span>${esc(it.metric.value)} of ${esc(it.metric.goal)}</span>`);
    if (it.needsReply) f.push(`<span class="pill warn">${it.sourceType === "call" ? "Call back needed" : "Reply needed"}</span>`);
    return f.length ? `<ul class="facts" aria-label="Details">${f.map((x) => `<li>${x}</li>`).join("")}</ul>` : "";
  }

  /* ---------- knowledge detail ---------- */
  function detailHTML(it, pane) {
    const topic = LO.topicById(it.topic) || LO.topics[3];
    const rel = LO.related(it, 3);
    const cons = (it.cids || []).map((id) => LO.concept(id)).filter(Boolean);
    const act = it.actions && it.actions[0];
    const ed = editing;
    return `<article class="det" data-tone="${topic.tone}" data-id="${it.id}">
      <div class="det-art">${LO.art(it.art)}<a class="det-topic" href="#/library?topic=${topic.id}">${esc(topic.short)}</a></div>
      <header class="det-head">
        <p class="det-src">${LO.srcGlyph(it.sourceType, 16)}<span>${it.sourceUrl ? `<a href="${esc(it.sourceUrl)}" data-d="open-original" rel="noopener">${esc(it.sourceName)}</a>` : esc(it.sourceName || LO.sourceMeta[it.sourceType].label)}</span><span class="sep" aria-hidden="true"></span><span>${esc(it.meta || "")}</span><span class="sep" aria-hidden="true"></span><span>Saved ${LO.timeAgo(it.createdAt)}</span></p>
        ${ed ? `<label class="vh" for="dTitle">Title</label><input id="dTitle" class="field det-title-in" value="${esc(it.title)}" />` : `<h1 class="det-title" id="dTitle">${esc(it.title)}</h1>`}
        <p class="det-insight">${esc(it.insight)}</p>
        ${factsHTML(it)}
      </header>
      <div class="det-actions" role="toolbar" aria-label="Item actions">
        ${ed ? `<button class="btn primary" type="button" data-d="save">${LO.icon("check", 18)}Save changes</button><button class="btn outline" type="button" data-d="cancel">Cancel</button>` : `
        ${it.needsReply ? `<button class="btn primary" type="button" data-d="resolve">${LO.icon("check", 18)}<span>Mark as done</span></button>` : ""}
        <button class="btn outline" type="button" data-d="fav" aria-pressed="${!!it.isFavorite}">${LO.heart(!!it.isFavorite, 18)}<span>${it.isFavorite ? "Favourited" : "Favourite"}</span></button>
        <button class="btn outline" type="button" data-d="share">${LO.icon("share", 18)}<span>Share</span></button>
        <a class="btn outline" href="#/infographic/${it.id}">${LO.icon("infographic", 18)}<span>Infographic</span></a>
        <button class="btn outline" type="button" data-d="remind">${LO.icon("bell", 18)}<span>Remind me</span></button>
        <button class="btn subtle" type="button" data-d="edit">${LO.icon("edit", 18)}<span>Edit</span></button>
        <button class="btn subtle" type="button" data-d="ask">${LO.icon("spark", 18)}<span>Ask about this</span></button>`}
      </div>
      <section class="det-sec"><h2 class="det-h">Summary</h2>${ed ? `<label class="vh" for="dSum">Summary</label><textarea id="dSum" class="field" rows="5">${esc(it.summary)}</textarea>` : `<p class="read">${esc(it.summary)}</p>`}</section>
      <section class="det-sec"><h2 class="det-h">Key insights</h2><ul class="insights">${(it.takeaways || []).map((t) => `<li>${esc(t)}</li>`).join("")}</ul></section>
      ${act ? `<section class="det-sec"><div class="act-card"><span class="act-ic">${LO.icon("target", 22)}</span><div class="act-b"><p class="act-k">Suggested action</p><p class="act-t">${esc(act)}</p></div><button class="btn primary" type="button" data-d="remind">Convert to reminder</button></div></section>` : ""}
      <section class="det-sec"><h2 class="det-h">Concepts</h2><div class="chips">${cons.map((c) => `<a class="chip link-chip" href="#/graph/${c.id}">${LO.icon("graph", 16)}${esc(c.short || c.name)}</a>`).join("") || '<span class="muted">No concepts yet</span>'}</div></section>
      ${rel.length ? `<section class="det-sec"><h2 class="det-h">Related saved items</h2><div class="rel">${rel.map((r) => rowHTML(r, "", false)).join("")}</div></section>` : ""}
      <section class="det-sec"><h2 class="det-h">Tags</h2><div class="chips">${(it.tags || []).map((t) => `<a class="chip" href="#/library?q=${encodeURIComponent(t)}">${esc(t)}</a>`).join("")}</div></section>
      <section class="det-sec"><details class="orig"><summary><span>Original capture</span>${LO.icon("chevD", 18)}</summary><blockquote>${esc(it.original).replace(/\n/g, "<br>")}</blockquote><p class="orig-note">${LO.icon("lock", 14)}Life OS never overwrites what you saved. Edits only change the summary layer.</p>${it.sourceUrl ? `<a class="btn outline" href="${esc(it.sourceUrl)}" data-d="open-original" rel="noopener">${LO.icon("external", 18)}Open original</a>` : ""}</details></section>
    </article>`;
  }
  LO.detailHTML = detailHTML;

  function bindDetail(root, id) {
    const it = LO.item(id);
    const repaint = () => { const pane = root.querySelector("#libDetail"); const host = pane || root.querySelector(".det-page"); host.innerHTML = detailHTML(it, !!pane); };
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-d]");
      if (!b) return;
      const k = b.dataset.d;
      if (k === "fav") { it.isFavorite = !it.isFavorite; LO.save(); repaint(); LO.toast(it.isFavorite ? "Added to favourites" : "Removed from favourites", { icon: "heart", duration: 1800 }); const nb = $('[data-d="fav"]'); if (nb) nb.focus(); }
      else if (k === "share") LO.shareDialog(it);
      else if (k === "edit") { editing = true; repaint(); $("#dTitle").focus(); }
      else if (k === "cancel") { editing = false; repaint(); }
      else if (k === "save") { it.title = $("#dTitle").value.trim() || it.title; it.summary = $("#dSum").value.trim() || it.summary; editing = false; LO.save(); repaint(); LO.toast("Changes saved", { duration: 1800 }); LO.emit("items"); }
      else if (k === "ask") LO.askQuestion(`What connects to \u201C${it.title}\u201D in my notes?`);
      else if (k === "remind") remindDialog(it);
      else if (k === "resolve") LO.resolvePriority("item:" + it.id, true);
      else if (k === "open-original") { e.preventDefault(); LO.toast(`In the app this opens ${it.sourceName} in a new tab. Links are simulated in the prototype.`, { icon: "external", duration: 4500 }); }
    });
  }
  function remindDialog(it) {
    const act = (it.actions && it.actions[0]) || "Revisit: " + it.title;
    let key = "weekend";
    const when = (k) => LO.parseWhen(LO.whenOptions.find((w) => w.key === k).text).ts;
    LO.dialog({
      title: "Convert to reminder",
      body: `<label class="lbl" for="rmT">Remind me to</label><input id="rmT" class="field" value="${esc(act)}" data-autofocus /><p class="lbl" id="rmW">When</p><div class="chips" role="radiogroup" aria-labelledby="rmW">${LO.whenOptions.map((w) => `<button class="chip" type="button" role="radio" aria-checked="${w.key === key}" data-w="${w.key}">${w.label}</button>`).join("")}</div>`,
      actions: [{ label: "Cancel" }, { label: "Add reminder", kind: "primary", onClick: () => { const t = ($("#rmT") || {}).value; } }]
    });
    const sheet = LO.sheet.el;
    sheet.addEventListener("click", (e) => { const c = e.target.closest("[data-w]"); if (c) { key = c.dataset.w; $$("[data-w]", sheet).forEach((x) => x.setAttribute("aria-checked", x === c)); } });
    /* replace the default primary handler so we can read the field before the sheet closes */
    const primary = $('[data-dlg="1"]', sheet);
    primary.addEventListener("click", () => {
      const title = $("#rmT", sheet).value.trim() || act;
      LO.state.reminders.unshift({ id: "r" + Date.now().toString(36), title, dueAt: when(key), sourceItemId: it.id, completed: false });
      LO.save(); LO.refreshCounts();
      LO.toast("Reminder added for " + LO.dueLabel(when(key)), { icon: "bell", action: { label: "View", fn: () => LO.go("#/reminders") } });
    }, true);
  }

  LO.routes.item = {
    title: (a) => (LO.item(a[0]) || {}).title || "Item",
    barTitle: () => "Knowledge",
    render(args, q) {
      const it = LO.item(args[0]);
      editing = false;
      if (!it) return `<div class="empty"><h2 class="empty-h">That item is no longer in your library</h2><a class="btn primary" href="#/library">Back to library</a></div>`;
      if (LO.wide()) { lib.q = ""; lib.topic = ""; return libraryShell(it.id, detailHTML(it, true)); }
      return `<div class="det-page">${detailHTML(it, false)}</div>`;
    },
    mount(root, args) {
      const it = LO.item(args[0]);
      if (!it) return;
      if (LO.wide()) libMount(root, it.id);
      bindDetail(root, it.id);
      const sel = $(`.row[data-id="${it.id}"]`, root); if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: "nearest" });
    }
  };

  /* ================= JOURNAL ================= */
  LO.routes.journal = {
    title: () => "Journal", barTitle: () => "Journal",
    render() {
      const entries = LO.state.items.filter((i) => i.sourceType === "journal").sort((a, b) => b.createdAt - a.createdAt);
      const themes = {};
      entries.forEach((e) => (e.cids || []).forEach((c) => { const n = (LO.concept(c) || {}).name; if (n) themes[n] = (themes[n] || 0) + 1; }));
      const th = Object.entries(themes).sort((a, b) => b[1] - a[1]).slice(0, 5);
      return `<div class="page jr-page">
        <header class="page-head"><h1 class="title">Journal</h1><p class="lede">A few lines a day. Themes surface on their own.</p></header>
        <div class="jr-grid">
        <section class="jr-write" aria-labelledby="jw-h"><h2 class="vh" id="jw-h">New entry</h2>
          <p class="jr-date">${LO.fmtDate(Date.now())}</p>
          <label class="vh" for="jrText">Journal entry</label>
          <textarea id="jrText" class="field cap-text" rows="5" placeholder="What did I learn today?"></textarea>
          <div class="chips">${LO.journalPrompts.map((p) => `<button class="chip" type="button" data-p="${esc(p)}">${esc(p)}</button>`).join("")}</div>
          <div class="jr-save"><button class="btn primary lg" type="button" id="jrSave" disabled>Save entry</button></div>
        </section>
        <div class="jr-side">
          <section aria-labelledby="th-h"><h2 class="side-h" id="th-h">Recurring themes</h2>${th.length ? `<div class="chips">${th.map(([n, c]) => `<a class="chip" href="#/library?q=${encodeURIComponent(n)}">${esc(n)}<span class="chip-n">${c}</span></a>`).join("")}</div>` : '<p class="muted">Write a few entries to see themes.</p>'}</section>
        </div></div>
        <section aria-labelledby="en-h"><h2 class="sec-h" id="en-h">Past entries</h2>
          <ul class="entries">${entries.map((e) => { const d = new Date(e.createdAt); return `<li><a href="#/item/${e.id}"><span class="en-date"><b>${d.getDate()}</b><small>${d.toLocaleDateString(undefined, { month: "short" })}</small></span><span class="en-b"><span class="en-t">${esc(e.title)}</span><span class="en-s">${esc(e.insight)}</span></span>${LO.icon("chevR", 18)}</a></li>`; }).join("")}</ul></section>
      </div>`;
    },
    mount(root) {
      const ta = $("#jrText", root), btn = $("#jrSave", root);
      ta.addEventListener("input", () => (btn.disabled = ta.value.trim().length < 2));
      root.addEventListener("click", (e) => { const p = e.target.closest("[data-p]"); if (p) { ta.value = (ta.value ? ta.value + "\n\n" : "") + p.dataset.p + " "; ta.focus(); btn.disabled = false; } });
      btn.addEventListener("click", async () => { const v = ta.value.trim(); ta.value = ""; btn.disabled = true; await LO.quickSave(v, { type: "journal" }); if (LO.parseHash().name === "journal") LO.render(); });
    }
  };

  /* ================= REMINDERS ================= */
  LO.routes.reminders = {
    title: () => "Reminders", barTitle: () => "Reminders",
    render() {
      const rs = LO.state.reminders.slice().sort((a, b) => a.dueAt - b.dueAt);
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const day = (r) => Math.floor((r.dueAt - start.getTime()) / 864e5);
      const open = rs.filter((r) => !r.completed);
      const groups = [["Overdue", open.filter((r) => day(r) < 0)], ["Today", open.filter((r) => day(r) === 0)], ["This week", open.filter((r) => day(r) > 0 && day(r) < 7)], ["Later", open.filter((r) => day(r) >= 7)], ["Done", rs.filter((r) => r.completed)]].filter((g) => g[1].length);
      const li = (r) => { const src = r.sourceItemId && LO.item(r.sourceItemId); return `<li class="${r.completed ? "done" : ""}"><label class="check"><input type="checkbox" data-rem="${r.id}" ${r.completed ? "checked" : ""} /><span class="box" aria-hidden="true">${LO.icon("check", 14)}</span><span class="check-t">${esc(r.title)}</span></label><span class="rem-meta"><span class="due ${day(r) < 0 && !r.completed ? "over" : ""}">${LO.icon("calendar", 14)}${LO.dueLabel(r.dueAt)}</span>${src ? `<a class="rem-src" href="#/item/${src.id}">${LO.srcGlyph(src.sourceType, 14)}<span>${esc(src.title)}</span></a>` : ""}</span></li>`; };
      return `<div class="page rem-page">
        <header class="page-head"><h1 class="title">Reminders</h1><p class="lede">${open.length} open. Turn anything you save into an action.</p></header>
        <form class="rem-add" id="remAdd"><label class="vh" for="remIn">Add a reminder</label><input id="remIn" class="field" placeholder="Remind me to\u2026 (try \u201Ctomorrow\u201D or \u201Cthis weekend\u201D)" autocomplete="off" /><button class="btn primary" type="submit">Add</button></form>
        ${groups.map(([n, l]) => `<section class="rem-g" aria-labelledby="g-${n.replace(/\W/g, "")}"><h2 class="sec-h" id="g-${n.replace(/\W/g, "")}">${n}</h2><ul class="rem-list">${l.map(li).join("")}</ul></section>`).join("") || `<div class="empty"><h2 class="empty-h">No reminders</h2><p class="empty-p">Add one above, or convert a key insight into an action from any saved item.</p></div>`}
      </div>`;
    },
    mount(root) {
      root.addEventListener("change", (e) => { const c = e.target.closest("[data-rem]"); if (c) completeReminder(c.dataset.rem, c.checked); });
      $("#remAdd", root).addEventListener("submit", (e) => {
        e.preventDefault();
        const v = $("#remIn", root).value.trim(); if (!v) return;
        const w = LO.parseWhen(v) || LO.parseWhen("tomorrow");
        LO.state.reminders.unshift({ id: "r" + Date.now().toString(36), title: v.replace(/\s*(today|tomorrow|tonight|this weekend|next week)\.?$/i, ""), dueAt: w.ts, sourceItemId: "", completed: false });
        LO.save(); LO.refreshCounts(); LO.render(); LO.toast("Reminder added for " + LO.dueLabel(w.ts), { icon: "bell", duration: 2400 });
      });
    }
  };

  /* ================= SETTINGS ================= */
  LO.routes.settings = {
    title: () => "Settings", barTitle: () => "Settings",
    render() {
      const s = LO.state;
      const sw = (id, label, desc, on) => `<div class="set-row"><div class="set-t"><label for="${id}" class="set-l">${label}</label><p class="set-d" id="${id}-d">${desc}</p></div><button class="switch" type="button" role="switch" id="${id}" aria-checked="${on}" aria-describedby="${id}-d"><span class="knob"></span></button></div>`;
      return `<div class="page set-page">
        <header class="page-head"><h1 class="title">Settings</h1></header>
        <section class="set-card profile"><span class="avatar lg" aria-hidden="true">K</span><div><p class="prof-n">Kapil</p><p class="muted">Prototype account. Everything stays on this device.</p></div></section>
        <section class="set-sec" aria-labelledby="s-ap"><h2 class="sec-h" id="s-ap">Appearance</h2>
          <div class="set-card">
            <div class="set-row col"><p class="set-l" id="thL">Theme</p>
              <div class="theme-pick" role="radiogroup" aria-labelledby="thL">${[["system", "System", "desktop"], ["light", "Light", "sun"], ["dark", "Dark", "moon"]].map(([k, l, ic]) => `<button type="button" role="radio" aria-checked="${s.theme === k}" data-pick="${k}" class="tp" data-tone="${k === "dark" ? "ink" : "mint"}"><span class="tp-swatch tp-${k}"><i></i><i></i><i></i></span><span class="tp-l">${LO.icon(ic, 16)}${l}</span></button>`).join("")}</div>
              <p class="set-d">High contrast follows your operating system. Turn on a contrast theme in Windows or macOS and Life OS adapts.</p></div>
            ${sw("swMotion", "Reduce motion", "Replace sliding and flying animations with simple fades. Follows your system setting automatically.", s.reduceMotion)}
          </div></section>
        <section class="set-sec" aria-labelledby="s-cp"><h2 class="sec-h" id="s-cp">Capture</h2>
          <div class="set-card">
            <a class="set-row link" href="#/onboarding"><div class="set-t"><p class="set-l">Replay the welcome tour</p><p class="set-d">A short walk-through of capturing, saving from anywhere and choosing your topics.</p></div>${LO.icon("chevR", 20)}</a>
            <a class="set-row link" href="#/welcome"><div class="set-t"><p class="set-l">Capture from anywhere</p><p class="set-d">Install the app, share from your phone, add the Chrome extension.</p></div>${LO.icon("chevR", 20)}</a>
            ${sw("swClip", "Offer to save copied links", "When you open Life OS with a link on your clipboard, offer to save it.", s.clipboardOffer)}
          </div></section>
        <section class="set-sec" aria-labelledby="s-cn"><h2 class="sec-h" id="s-cn">Connections</h2>
          <div class="set-card">
            ${[["calendar", "calendar", "Calendar", "Meetings and appointments show up in Today."], ["mail", "email", "Email", "Messages waiting on a reply become priorities."], ["call", "calls", "Calls", "Call logs and voicemails are saved with a summary."], ["pulse", "health", "Health", "Sleep, steps and appointments appear as a quiet strip."]].map(([ic, k, l, d]) => `<div class="set-row"><div class="set-t"><p class="set-l">${LO.icon(ic, 18)} ${l}</p><p class="set-d">${d}</p></div><button class="btn outline" type="button" data-connect="${k}">Connect</button></div>`).join("")}
            <p class="set-d set-note">Connections stay off the main screens. The prototype shows sample data; the real app asks you to sign in to each source and only reads what you allow.</p>
          </div></section>
        <section class="set-sec" aria-labelledby="s-dt"><h2 class="sec-h" id="s-dt">Your data</h2>
          <div class="set-card">
            <div class="set-row"><div class="set-t"><p class="set-l">Export everything</p><p class="set-d">Download all saved items, with originals, as one file.</p></div><button class="btn outline" type="button" id="btnExport">${LO.icon("download", 18)}Export</button></div>
            <div class="set-row"><div class="set-t"><p class="set-l">Reset demo data</p><p class="set-d">Remove what you added and restore the seeded examples.</p></div><button class="btn outline danger" type="button" id="btnReset">${LO.icon("reset", 18)}Reset</button></div>
          </div></section>
        <section class="set-sec" aria-labelledby="s-rv"><h2 class="sec-h" id="s-rv">Design review</h2>
          <div class="set-card">
            <a class="set-row link" href="#/states"><div class="set-t"><p class="set-l">States gallery</p><p class="set-d">Empty, loading, organising, error and offline states in one place.</p></div>${LO.icon("chevR", 20)}</a>
            <a class="set-row link" href="#/share-target?title=${encodeURIComponent("Three prompts that make AI answers sharper")}&url=${encodeURIComponent(LO.samples.instagram.url)}"><div class="set-t"><p class="set-l">Preview the share-to-app screen</p><p class="set-d">What you see after sharing a link into Life OS.</p></div>${LO.icon("chevR", 20)}</a>
            <button class="set-row link btn-row" type="button" data-act="shortcuts"><div class="set-t"><p class="set-l">Keyboard shortcuts</p><p class="set-d">Capture, search and navigate without a mouse.</p></div>${LO.icon("keyboard", 20)}</button>
          </div></section>
        <p class="muted about">Life OS design prototype v1. Seeded content only; nothing leaves this device.</p>
      </div>`;
    },
    mount(root) {
      root.addEventListener("click", (e) => {
        const t = e.target.closest("[data-pick]");
        if (t) { LO.setTheme(t.dataset.pick); $$("[data-pick]", root).forEach((x) => x.setAttribute("aria-checked", x === t)); return; }
        const cn = e.target.closest("[data-connect]");
        if (cn) { LO.toast(`In the app this signs you in to ${cn.dataset.connect}. The prototype already shows sample ${cn.dataset.connect} data.`, { icon: "link", duration: 5000 }); return; }
        const sw = e.target.closest(".switch");
        if (sw) { const on = sw.getAttribute("aria-checked") !== "true"; sw.setAttribute("aria-checked", on); if (sw.id === "swMotion") { LO.state.reduceMotion = on; LO.save(); LO.applyTheme(); } if (sw.id === "swClip") { LO.state.clipboardOffer = on; LO.save(); } }
      });
      $("#btnExport", root).addEventListener("click", () => {
        const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), items: LO.state.items, reminders: LO.state.reminders }, null, 2)], { type: "application/json" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "life-os-export.json"; document.body.appendChild(a); a.click(); a.remove();
        LO.toast("Export downloaded", { icon: "download" });
      });
      $("#btnReset", root).addEventListener("click", () => LO.dialog({ title: "Reset demo data?", body: "<p>Items, reminders and favourites you added will be removed and the seeded examples restored. This cannot be undone.</p>", actions: [{ label: "Cancel" }, { label: "Reset data", kind: "primary danger", onClick: () => { LO.reset(); LO.renderShell(); LO.render(); LO.toast("Demo data restored", { icon: "reset" }); } }] }));
    }
  };
})();

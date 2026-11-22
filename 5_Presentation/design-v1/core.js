/* Life OS prototype — core: state, router, shell, sheets, toasts, theme, mock pipeline. */
(function () {
  const LO = (window.LO = window.LO || {});
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  LO.$ = $;
  LO.$$ = $$;
  LO.esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const esc = LO.esc;
  LO.wide = () => window.matchMedia("(min-width: 1024px)").matches;
  LO.phone = () => window.matchMedia("(max-width: 767px)").matches;
  LO.reduced = () => document.documentElement.dataset.motion === "reduce" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  LO.isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  LO.modKey = LO.isMac ? "\u2318" : "Ctrl";
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  LO.sleep = sleep;

  /* ---------------- event bus ---------------- */
  const bus = {};
  LO.on = (e, f) => ((bus[e] = bus[e] || []).push(f), () => (bus[e] = bus[e].filter((x) => x !== f)));
  LO.emit = (e, d) => (bus[e] || []).slice().forEach((f) => f(d));

  /* ---------------- state ---------------- */
  /* Demo clock: seeded events are placed around "now" (clamped to 09:00-18:00) so Today always
     has a realistic mix of done, next and later. Real events would come from a calendar connector. */
  LO.slotTimes = function (slot, now) {
    now = now || Date.now();
    if (slot.days != null) {
      const d = new Date(now); d.setDate(d.getDate() + slot.days); d.setHours(slot.hour, 0, 0, 0);
      return { startsAt: d.getTime(), endsAt: d.getTime() + slot.dur * 60000 };
    }
    const lo = new Date(now); lo.setHours(9, 0, 0, 0);
    const hi = new Date(now); hi.setHours(18, 0, 0, 0);
    const anchor = Math.min(Math.max(now, lo.getTime()), hi.getTime());
    const step = 5 * 60000;
    const startsAt = Math.round((anchor + slot.at * 60000) / step) * step;
    return { startsAt, endsAt: startsAt + slot.dur * 60000 };
  };

  const KEY = "lifeos.proto.v1";
  function seedState() {
    const now = Date.now();
    return {
      theme: "system",
      reduceMotion: false,
      clipboardOffer: true,
      welcomed: false,
      interests: [],
      bannerDismissed: false,
      lifeSeeded: true,
      items: LO.seedItems.map((i) => Object.assign({}, i, { createdAt: now - (i.ago != null ? i.ago : 2 * 3600e3), processing: false, isFavorite: LO.seedFavorites.includes(i.id) }, i.slot ? LO.slotTimes(i.slot, now) : {})),
      extraConcepts: [],
      deck: LO.seedDeck.slice(),
      seen: Object.fromEntries(Object.entries(LO.seedSeen).map(([id, v]) => [id, { n: v[0], at: now - v[1] * 3600e3 }])),
      reminders: LO.seedReminders.map((r) => ({ id: r.id, title: r.title, dueAt: now + r.dueIn * 3600e3, sourceItemId: r.sourceItemId, completed: r.done })),
      xp: { pos: 0, trail: [], fwd: [] },
      ask: { thread: [] }
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const st = Object.assign(seedState(), JSON.parse(raw));
        if (!JSON.parse(raw).lifeSeeded) {
          /* Saved before meetings, emails, calls and health existed: add the new seeds once. */
          const fresh = seedState();
          const have = new Set(st.items.map((i) => i.id));
          fresh.items.forEach((i) => { if (!have.has(i.id)) st.items.push(i); });
          const haveR = new Set(st.reminders.map((r) => r.id));
          fresh.reminders.forEach((r) => { if (!haveR.has(r.id)) st.reminders.push(r); });
          st.lifeSeeded = true;
        }
        st.items.forEach((i) => { if (i.slot) Object.assign(i, LO.slotTimes(i.slot)); });
        return st;
      }
    } catch (e) {}
    return seedState();
  }
  LO.state = load();
  LO.save = function () {
    try {
      const s = Object.assign({}, LO.state, { ask: { thread: [] } });
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch (e) {}
  };
  LO.reset = function () {
    const keep = LO.state && LO.state.welcomed;
    try { localStorage.removeItem(KEY); } catch (e) {}
    LO.state = seedState();
    LO.state.welcomed = !!keep;
    LO.save();
  };

  LO.item = (id) => LO.state.items.find((i) => i.id === id);
  LO.allConcepts = () => LO.concepts.concat(LO.state.extraConcepts);
  LO.concept = (id) => LO.allConcepts().find((c) => c.id === id);
  LO.itemsOf = (cid) => LO.state.items.filter((i) => (i.cids || []).includes(cid));
  LO.related = function (item, n) {
    const mine = new Set(item.cids || []);
    return LO.state.items
      .filter((o) => o.id !== item.id && !o.processing)
      .map((o) => ({ o, s: (o.cids || []).filter((c) => mine.has(c)).length + (o.topic === item.topic ? 0.5 : 0) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || b.o.createdAt - a.o.createdAt)
      .slice(0, n || 3)
      .map((x) => x.o);
  };

  /* ---------------- Today: schedule + priorities, derived from items and reminders ---------------- */
  LO.dueWhy = function (ts) {
    const label = LO.dueLabel(ts);
    if (label === "Overdue") return "Overdue";
    if (/^Today, /.test(label)) return "Due today, " + label.slice(7);
    return "Due " + label.charAt(0).toLowerCase() + label.slice(1);
  };
  LO.today = function () {
    const now = Date.now();
    const s = LO.state;
    const sod = new Date(now); sod.setHours(0, 0, 0, 0);
    const eod = sod.getTime() + 864e5;
    const items = s.items.filter((i) => !i.processing);

    const schedule = items
      .filter((i) => i.startsAt >= sod.getTime() && i.startsAt < eod)
      .sort((a, b) => a.startsAt - b.startsAt)
      .map((item) => ({ item, state: item.endsAt <= now ? "done" : item.startsAt <= now ? "now" : "later" }));
    const nextUp = schedule.find((e) => e.state === "later");
    if (nextUp) nextUp.state = "next";

    /* Priorities: open reminders plus anything waiting on a reply, ranked. Knowledge reminders rank below life ones. */
    const tracked = new Set(s.reminders.filter((r) => !r.completed && r.sourceItemId).map((r) => r.sourceItemId));
    const priorities = [];
    s.reminders.filter((r) => !r.completed).forEach((r) => {
      const src = r.sourceItemId ? LO.item(r.sourceItemId) : null;
      const hrs = (r.dueAt - now) / 36e5;
      let score = hrs < 0 ? 95 : hrs < 24 ? Math.max(40, 90 - hrs * 8) : hrs < 72 ? 30 : 10;
      if (src && !LO.isLife(src)) score -= 25;
      priorities.push({ key: "rem:" + r.id, kind: "reminder", title: r.title, src, score, why: LO.dueWhy(r.dueAt) });
    });
    items.filter((i) => i.needsReply && !tracked.has(i.id)).forEach((i) => {
      const who = (i.people || [])[0] || "";
      const call = i.sourceType === "call";
      const days = Math.max(0, (now - i.createdAt) / 864e5);
      priorities.push({
        key: "item:" + i.id, kind: call ? "callback" : "reply", src: i,
        title: call ? "Call back " + who : "Reply to " + who + ": " + i.title.replace(/^Re:\s*/, ""),
        score: 55 + Math.min(days, 3) * 5 + (i.priority === "high" ? 15 : 0),
        why: (call ? "Missed " : "Received ") + LO.timeAgo(i.createdAt).toLowerCase()
      });
    });
    priorities.sort((a, b) => b.score - a.score);
    /* Far-off reminders from saved reading stay in Reminders; Today only lists what needs attention soon. */
    const urgent = priorities.filter((p) => p.score >= 30);

    const health = items.filter((i) => i.sourceType === "health" && i.metric).sort((a, b) => b.createdAt - a.createdAt);
    const appointment = items.filter((i) => i.sourceType === "health" && i.startsAt > now).sort((a, b) => a.startsAt - b.startsAt)[0] || null;
    return {
      schedule, priorities: urgent, top: urgent.slice(0, 3), more: urgent.slice(3),
      left: schedule.filter((e) => e.state !== "done").length,
      owed: items.filter((i) => i.needsReply).length,
      health, appointment
    };
  };

  /* ---------------- time ---------------- */
  LO.timeAgo = function (ts) {
    const d = Date.now() - ts;
    const m = Math.round(d / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return m + " min ago";
    const h = Math.round(m / 60);
    if (h < 24) return h + " h ago";
    const days = Math.floor(d / 86400000);
    if (days === 1) return "Yesterday";
    if (days < 7) return days + " days ago";
    if (days < 60) return Math.round(days / 7) + (Math.round(days / 7) === 1 ? " week ago" : " weeks ago");
    return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  };
  LO.fmtDate = (ts) => new Date(ts).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  LO.dueLabel = function (ts) {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const days = Math.floor((ts - start.getTime()) / 86400000);
    const time = new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    if (days < 0) return "Overdue";
    if (days === 0) return "Today, " + time;
    if (days === 1) return "Tomorrow";
    return new Date(ts).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  };
  LO.parseWhen = function (text) {
    const t = (text || "").toLowerCase();
    const d = new Date();
    const set = (dt, h) => { dt.setHours(h, 0, 0, 0); return dt.getTime(); };
    if (/tonight/.test(t)) return { key: "tonight", ts: set(new Date(), 20) };
    if (/tomorrow/.test(t)) { d.setDate(d.getDate() + 1); return { key: "tomorrow", ts: set(d, 9) }; }
    if (/weekend|saturday/.test(t)) { d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); return { key: "weekend", ts: set(d, 10) }; }
    if (/next week|monday/.test(t)) { d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); return { key: "next", ts: set(d, 9) }; }
    if (/today/.test(t)) return { key: "today", ts: set(new Date(), 18) };
    return null;
  };
  LO.whenOptions = [
    { key: "today", label: "Today", text: "today" },
    { key: "tomorrow", label: "Tomorrow", text: "tomorrow" },
    { key: "weekend", label: "This weekend", text: "this weekend" },
    { key: "next", label: "Next week", text: "next week" }
  ];

  /* ---------------- search ---------------- */
  LO.search = function (q, pool) {
    const items = pool || LO.state.items;
    const toks = (q || "").toLowerCase().split(/\s+/).filter((t) => t.length > 1);
    if (!toks.length) return items.slice();
    return items
      .map((it) => {
        const concepts = (it.cids || []).map((c) => (LO.concept(c) || {}).name || "").join(" ");
        const f = (s, w) => ((s || "").toLowerCase());
        const hay = { t: f(it.title), g: f((it.tags || []).join(" ")) + " " + f(concepts), s: f(it.summary + " " + it.insight), o: f((it.takeaways || []).join(" ") + " " + it.original + " " + it.sourceName + " " + it.sourceUrl) };
        let score = 0;
        let hit = 0;
        toks.forEach((tk) => {
          let h = 0;
          if (hay.t.includes(tk)) h += 4;
          if (hay.g.includes(tk)) h += 3;
          if (hay.s.includes(tk)) h += 2;
          if (hay.o.includes(tk)) h += 1;
          if (h) hit++;
          score += h;
        });
        return { it, score: hit === toks.length ? score + 5 : score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || b.it.createdAt - a.it.createdAt)
      .map((x) => x.it);
  };
  LO.hl = function (text, q) {
    const safe = esc(text);
    const toks = (q || "").split(/\s+/).filter((t) => t.length > 1).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    if (!toks.length) return safe;
    return safe.replace(new RegExp("(" + toks.join("|") + ")", "ig"), "<mark>$1</mark>");
  };

  /* ---------------- theme ---------------- */
  LO.applyTheme = function () {
    const pref = LO.state.theme;
    const dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.dataset.motion = LO.state.reduceMotion ? "reduce" : "";
    const m = $('meta[name="theme-color"]');
    if (m) m.setAttribute("content", dark ? "#131216" : "#f4f2ed");
    const b = $("#themeBtn");
    if (b) {
      b.innerHTML = LO.icon(dark ? "sun" : "moon", 20);
      b.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    }
  };
  LO.setTheme = function (pref) {
    LO.state.theme = pref;
    LO.save();
    LO.applyTheme();
  };
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", LO.applyTheme);

  /* ---------------- toasts ---------------- */
  LO.toast = function (msg, opts) {
    opts = opts || {};
    const host = $("#toasts");
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<span class="toast-ic">${LO.icon(opts.icon || "check", 18)}</span><span class="toast-msg">${esc(msg)}</span>${opts.action ? `<button class="btn subtle toast-act" type="button">${esc(opts.action.label)}</button>` : ""}`;
    host.appendChild(el);
    const kill = () => { el.classList.add("out"); setTimeout(() => el.remove(), 220); };
    if (opts.action) $(".toast-act", el).addEventListener("click", () => { opts.action.fn(); kill(); });
    setTimeout(kill, opts.duration || 4200);
    return el;
  };

  /* ---------------- sheets and dialogs ---------------- */
  let activeSheet = null;
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  LO.sheet = {
    open(opts) {
      if (activeSheet) LO.sheet.close(true);
      const layer = document.createElement("div");
      layer.className = "layer";
      layer.innerHTML = `<div class="scrim" data-sheet-scrim></div>
        <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle" data-variant="${opts.variant || "sheet"}" data-size="${opts.size || "auto"}">
          <div class="sheet-grab" aria-hidden="true"></div>
          <header class="sheet-head">
            <h2 class="sheet-title" id="sheetTitle">${opts.title || ""}</h2>
            ${opts.noClose ? "" : `<button class="iconbtn" type="button" data-sheet-close aria-label="Close">${LO.icon("close", 20)}</button>`}
          </header>
          <div class="sheet-body">${opts.html || ""}</div>
          ${opts.footer ? `<footer class="sheet-foot">${opts.footer}</footer>` : ""}
        </div>`;
      document.body.appendChild(layer);
      const sheet = $(".sheet", layer);
      const prev = document.activeElement;
      activeSheet = { layer, sheet, prev, opts };
      $("#app").inert = true;
      document.body.classList.add("has-sheet");
      layer.addEventListener("click", (e) => {
        if (e.target.closest("[data-sheet-scrim]") && !opts.persistent) LO.sheet.close();
        if (e.target.closest("[data-sheet-close]")) LO.sheet.close();
      });
      layer.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !opts.persistent) { e.stopPropagation(); LO.sheet.close(); }
        if (e.key === "Tab") {
          const f = $$(FOCUSABLE, sheet).filter((x) => x.offsetParent !== null);
          if (!f.length) return;
          const first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });
      if (opts.onMount) opts.onMount(sheet, layer);
      requestAnimationFrame(() => {
        layer.classList.add("in");
        const t = opts.focus ? $(opts.focus, sheet) : null;
        (t || $("[data-autofocus]", sheet) || $(FOCUSABLE.replace("a[href], ", ""), $(".sheet-body", sheet)) || $("[data-sheet-close]", sheet) || sheet).focus({ preventScroll: true });
      });
      return sheet;
    },
    update(html) { if (activeSheet) $(".sheet-body", activeSheet.sheet).innerHTML = html; },
    setTitle(t) { if (activeSheet) $("#sheetTitle", activeSheet.sheet).innerHTML = t; },
    setFooter(html) {
      if (!activeSheet) return;
      let f = $(".sheet-foot", activeSheet.sheet);
      if (!html) { if (f) f.remove(); return; }
      if (!f) { f = document.createElement("footer"); f.className = "sheet-foot"; activeSheet.sheet.appendChild(f); }
      f.innerHTML = html;
    },
    get el() { return activeSheet && activeSheet.sheet; },
    close(silent) {
      if (!activeSheet) return;
      const { layer, prev, opts } = activeSheet;
      activeSheet = null;
      $("#app").inert = false;
      document.body.classList.remove("has-sheet");
      const done = () => { layer.remove(); if (!silent && prev && prev.focus && document.contains(prev)) prev.focus({ preventScroll: true }); };
      if (silent || LO.reduced()) done();
      else { layer.classList.remove("in"); layer.classList.add("out"); setTimeout(done, 200); }
      if (opts.onClose) opts.onClose();
    }
  };
  /* Fluent anatomy: title, optional body, actions ordered by ascending priority (primary right-most). */
  LO.dialog = function (o) {
    const foot = o.actions.map((a, i) => `<button class="btn ${a.kind || "outline"}" type="button" data-dlg="${i}" ${a.autofocus ? "data-autofocus" : ""}>${esc(a.label)}</button>`).join("");
    LO.sheet.open({
      title: esc(o.title), html: `<div class="dlg-body">${o.body || ""}</div>`, footer: foot, variant: "dialog", noClose: o.actions.some((a) => /cancel|close|done/i.test(a.label)), persistent: !!o.persistent,
      onMount: (sheet) => sheet.addEventListener("click", (e) => {
        const b = e.target.closest("[data-dlg]");
        if (!b) return;
        const a = o.actions[+b.dataset.dlg];
        LO.sheet.close();
        if (a.onClick) a.onClick();
      })
    });
  };

  /* ---------------- clipboard / share helpers ---------------- */
  LO.copy = async function (text, msg) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (_) {}
      ta.remove();
    }
    LO.toast(msg || "Copied", { icon: "copy" });
  };
  LO.itemText = (it) => `${it.title}\n\n${it.summary}\n\nKey takeaways:\n${(it.takeaways || []).map((t) => "- " + t).join("\n")}${it.sourceUrl ? "\n\nSource: " + it.sourceUrl : ""}\n\nSaved with Life OS`;

  /* ---------------- mock processing (brief §11: deterministic fallback) ---------------- */
  const DICT = [
    { re: /\bmcp\b|model context protocol/i, cid: "mcp", topic: "ai", art: "mcp", tags: ["AI", "Developer tools"] },
    { re: /agent|autonom|tool[- ]?call/i, cid: "agents", topic: "ai", art: "agents", tags: ["AI", "Automation"] },
    { re: /context (window|engineer)|prompt/i, cid: "context", topic: "ai", art: "context", tags: ["AI", "Context"] },
    { re: /local (llm|model)|ollama|on-device|offline model/i, cid: "local", topic: "ai", art: "local", tags: ["AI", "Privacy"] },
    { re: /design system|token|component library|figma/i, cid: "dsys", topic: "design", art: "design", tags: ["Design", "Design systems"] },
    { re: /quality|polish|empty state|details?\b/i, cid: "quality", topic: "design", art: "quality", tags: ["Design", "Quality"] },
    { re: /research|interview|usability|feedback/i, cid: "research", topic: "design", art: "research", tags: ["Research"] },
    { re: /saas|subscription|pricing|seats?\b|startup/i, cid: "saas", topic: "biz", art: "saas", tags: ["Business", "SaaS"] },
    { re: /automat|workflow|zap/i, cid: "automation", topic: "biz", art: "automation", tags: ["Business", "Automation"] },
    { re: /journal|today i|reflect|grateful|learned/i, cid: "reflection", topic: "pk", art: "journal", tags: ["Journal", "Reflection"] },
    { re: /second brain|knowledge|notes?\b|remember/i, cid: "knowsys", topic: "pk", art: "network", tags: ["Knowledge"] }
  ];
  const sentences = (t) => (t.replace(/\s+/g, " ").match(/[^.!?]+[.!?]*/g) || [t]).map((s) => s.trim()).filter(Boolean);
  const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "\u2026" : s);
  LO.detectUrl = function (text) {
    const m = (text || "").trim().match(/^(https?:\/\/[^\s]+|(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s]*)?)$/i);
    if (!m) return null;
    let url = m[1]; if (!/^https?:/i.test(url)) url = "https://" + url;
    let host = "";
    try { host = new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return null; }
    const type = /youtube\.com|youtu\.be/.test(host) ? "youtube" : /instagram\.com/.test(host) ? "instagram" : "website";
    return { url, host, type, sample: type === "youtube" ? LO.samples.youtube : type === "instagram" ? LO.samples.instagram : /quality-notes\.example/.test(host) ? LO.samples.website : null };
  };
  LO.looksLikeChat = (t) => /(^|\n)\s*(you|user|human|me|chatgpt|assistant|gemini|claude|ai)\s*(said)?\s*:/i.test(t || "") && (t || "").split("\n").length >= 2;
  /* Pasted or dictated text that is really an email, meeting, call or health note. */
  LO.detectLife = function (text) {
    const t = text || "";
    if (/(^|\n)\s*(from|subject)\s*:/i.test(t)) return { type: "email", name: "Email", meta: "Email", tag: "Email", reply: /\b(please (reply|confirm|let me know)|can you|could you|let me know|by (today|tomorrow|eod|end of day))\b/i.test(t) };
    if (/\b(missed call|voicemail|call (with|from)|spoke (to|with)|on the call)\b/i.test(t)) return { type: "call", name: "Phone", meta: "Call", tag: "Call", reply: /\b(missed call|call (me )?back)\b/i.test(t) };
    if (/\b(meeting|minutes|attendees|agenda|1:1|stand-?up)\b/i.test(t)) return { type: "meeting", name: "Meeting notes", meta: "Meeting", tag: "Meeting", reply: false };
    if (/\b(slept|sleep|steps|workout|blood pressure|dentist|doctor|medicine|gym)\b/i.test(t)) return { type: "health", name: "Health", meta: "Health note", tag: "Health", reply: false };
    return null;
  };
  LO.mockProcess = function (inp) {
    const text = (inp.text || "").trim();
    let base;
    if (inp.sample) base = Object.assign({}, inp.sample);
    else {
      const ss = sentences(text);
      const hits = DICT.filter((d) => d.re.test(text + " " + (inp.url || "")));
      const first = hits[0] || (inp.type === "journal" ? DICT.find((d) => d.cid === "reflection") : { cid: "knowsys", topic: "pk", art: "network", tags: ["Idea"] });
      const first60 = clip(ss[0] || "Untitled capture", 64).replace(/[.!?]+$/, "");
      let title = first60.charAt(0).toUpperCase() + first60.slice(1);
      let host = "";
      if (inp.url) { try { host = new URL(inp.url).hostname.replace(/^www\./, ""); } catch (e) {} title = text && text !== inp.url ? title : (inp.title || host.replace(/\.(com|org|net|io|dev|example)$/, "") + ": saved page"); }
      if (inp.type === "journal") title = new Date().toLocaleDateString(undefined, { weekday: "long" }) + ": " + title.toLowerCase();
      base = {
        title,
        insight: clip(ss[0] || title, 110),
        summary: ss.length > 1 ? clip(ss.slice(0, 2).join(" "), 240) : clip(`A saved ${inp.type === "voice" ? "voice note" : inp.type === "journal" ? "journal entry" : inp.url ? "page" : "note"} about ${(LO.concept(first.cid) || {}).name || "your ideas"}. ${ss[0] || ""}`, 240),
        takeaways: ss.length >= 3 ? ss.slice(0, 3).map((s) => clip(s, 90)) : [clip(ss[0] || title, 90), `Connects to ${(LO.concept(first.cid) || {}).name || "your ideas"}.`],
        concepts: hits.slice(0, 3).map((h) => LO.concept(h.cid).name).concat(hits.length ? [] : [LO.concept(first.cid).name]),
        tags: Array.from(new Set(hits.flatMap((h) => h.tags).concat(inp.type === "voice" ? ["Voice"] : inp.type === "journal" ? ["Journal"] : []))).slice(0, 4),
        actions: /\b(should|need to|todo|remember to|explore|try|read|call|email)\b/i.test(text) ? [clip((ss.find((s) => /\b(should|need to|todo|remember to|explore|try|read|call|email)\b/i.test(s)) || ss[0]).replace(/[.!?]+$/, ""), 80)] : [],
        topic: first.topic, art: first.art,
        sourceType: inp.type === "voice" ? "voice" : inp.type === "journal" ? "journal" : inp.type === "chat" ? "chat" : inp.url ? (inp.urlType || "website") : "text",
        sourceName: inp.url ? host : inp.type === "voice" ? "Voice note" : inp.type === "journal" ? "Journal" : inp.type === "chat" ? "AI conversation" : "Note",
        meta: inp.type === "voice" ? "Voice note" : inp.type === "chat" ? sentences(text).length + " turns" : inp.type === "journal" ? "Journal entry" : inp.url ? "Link" : "Idea"
      };
      if (!base.tags.length) base.tags = ["Idea"];
      const life = !inp.url && !["chat", "journal"].includes(inp.type) ? LO.detectLife(text) : null;
      if (life) {
        Object.assign(base, { sourceType: life.type, sourceName: life.name, meta: life.meta, tags: Array.from(new Set([life.tag].concat(base.tags))).slice(0, 4) });
        if (life.reply) base.needsReply = true;
        base.tags = base.tags.filter((g) => g !== "Idea");
        const subject = life.type === "email" && text.match(/^\s*subject\s*:\s*(.+)$/im);
        if (subject) base.title = clip(subject[1].trim(), 64);
      }
    }
    base.cids = (base.concepts || []).map((n) => {
      const c = LO.allConcepts().find((x) => x.name.toLowerCase() === n.toLowerCase() || (x.short || "").toLowerCase() === n.toLowerCase());
      return c ? c.id : null;
    });
    base.newConcepts = (base.concepts || []).filter((n, i) => !base.cids[i]);
    base.cids = base.cids.filter(Boolean);
    return base;
  };

  /* Create a saved item immediately, then organise it in the background. */
  LO.capture = {
    create(inp) {
      const id = "n" + Date.now().toString(36) + Math.floor(Math.random() * 99);
      const isUrl = !!inp.url;
      const item = {
        id, title: clip((inp.text || inp.url || "Untitled").split("\n")[0], 60), topic: "pk", sourceType: inp.type === "link" ? inp.urlType || "website" : inp.type === "note" ? "text" : inp.type,
        sourceName: isUrl ? (LO.detectUrl(inp.url) || {}).host || "" : "", sourceUrl: inp.url || "", meta: "Organising\u2026", art: "network",
        insight: "", summary: "", takeaways: [], cids: [], tags: [], original: inp.text || inp.url || "", actions: [],
        createdAt: Date.now(), processing: true, isFavorite: false, isNew: true
      };
      LO.state.items.unshift(item);
      LO.state.deck.unshift(id);
      LO.state.xp.pos = 0; LO.state.xp.trail = []; LO.state.xp.fwd = [];
      LO.save();
      LO.emit("items");
      return item;
    },
    async process(item, inp, onStep) {
      const steps = ["Reading the source", "Summarising", "Finding concepts", "Linking to what you have saved"];
      for (let i = 0; i < steps.length; i++) {
        if (onStep) onStep(i, steps);
        await sleep(i === 0 ? 520 : 560);
      }
      const out = LO.mockProcess(Object.assign({}, inp, { urlType: item.sourceType }));
      const concepts = out.newConcepts.map((n) => {
        const cid = n.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        if (!LO.concept(cid)) LO.state.extraConcepts.push({ id: cid, name: n, topic: out.topic, desc: "New concept found in your latest capture.", isNew: true });
        return cid;
      });
      Object.assign(item, {
        title: out.title, insight: out.insight, summary: out.summary, takeaways: out.takeaways, tags: out.tags, actions: out.actions, topic: out.topic, art: out.art,
        cids: out.cids.concat(concepts), meta: out.meta, sourceName: out.sourceName || item.sourceName, sourceType: out.sourceType || item.sourceType, processing: false
      });
      if (out.needsReply) item.needsReply = true;
      if (out.sample && !item.sourceUrl) item.sourceUrl = out.url;
      LO.save();
      LO.emit("items");
      if (onStep) onStep(steps.length, steps);
      return item;
    }
  };

  /* ---------------- router ---------------- */
  LO.routes = {};
  let cleanups = [];
  LO.onLeave = (f) => cleanups.push(f);
  LO.parseHash = function () {
    const h = location.hash.replace(/^#\/?/, "");
    const [path, qs] = h.split("?");
    const parts = (path || "").split("/").filter(Boolean);
    return { name: parts[0] || "home", args: parts.slice(1), q: Object.fromEntries(new URLSearchParams(qs || "")) };
  };
  LO.go = (h) => { if (location.hash === h) LO.render(); else location.hash = h; };
  LO.route = null;
  LO.render = function () {
    cleanups.forEach((f) => { try { f(); } catch (e) {} });
    cleanups = [];
    const r = LO.parseHash();
    if (r.name === "home" && !LO.state.welcomed && LO.routes.onboarding) { location.replace("#/onboarding"); return; }
    const def = LO.routes[r.name] || LO.routes.home;
    LO.route = r;
    document.body.dataset.route = def === LO.routes[r.name] ? r.name : "home";
    const view = $("#view");
    view.innerHTML = def.render(r.args, r.q) || "";
    view.classList.remove("enter"); void view.offsetWidth; view.classList.add("enter");
    document.title = (def.title ? def.title(r.args, r.q) + " \u2013 " : "") + "Life OS";
    LO.updateShell(r, def);
    if (def.mount) def.mount($("#view"), r.args, r.q);
    const main = $("#main");
    main.scrollTop = 0; window.scrollTo(0, 0);
    if (!LO.firstRender) main.focus({ preventScroll: true });
    LO.firstRender = false;
    LO.emit("route", r);
  };
  LO.firstRender = true;
  window.addEventListener("hashchange", LO.render);

  /* ---------------- shell ---------------- */
  LO.navItems = [
    { id: "home", label: "Today", icon: "home" },
    { id: "explore", label: "Explore", icon: "explore" },
    { id: "capture", label: "Capture", icon: "plus", action: "capture" },
    { id: "graph", label: "Graph", icon: "graph" },
    { id: "library", label: "Library", icon: "library" }
  ];
  const ROOT_ROUTES = ["home", "explore", "graph", "library", "ask"];
  LO.renderShell = function () {
    const side = $("#sidebar");
    const dueCount = LO.state.reminders.filter((r) => !r.completed).length;
    side.innerHTML = `
      <a class="sb-brand" href="#/home" aria-label="Life OS, your second brain, home">${LO.mark(32)}<span class="sb-word">Life OS<small class="sb-tag">Your second brain</small></span></a>
      <button class="btn primary sb-capture" type="button" data-act="capture">${LO.icon("plus", 20)}<span class="sb-label">Capture</span><kbd class="kbd sb-kbd">${LO.modKey} K</kbd></button>
      <nav class="sb-nav" aria-label="Primary">
        ${["home", "explore", "graph", "library", "ask"].map((id) => {
          const n = { home: ["Today", "home"], explore: ["Explore", "explore"], graph: ["Graph", "graph"], library: ["Library", "library"], ask: ["Ask", "ask"] }[id];
          return `<a class="sb-link" href="#/${id}" data-nav="${id}">${LO.icon(n[1], 22)}<span class="sb-label">${n[0]}</span></a>`;
        }).join("")}
      </nav>
      <div class="sb-group"><h2 class="sb-h">Collections</h2>
        <nav class="sb-nav" aria-label="Collections">
          ${LO.topics.map((t) => `<a class="sb-link sb-coll" href="#/library?topic=${t.id}" data-topic="${t.id}"><span class="dot" data-tone="${t.tone}"></span><span class="sb-label">${esc(t.name)}</span><span class="sb-count" data-count="${t.id}"></span></a>`).join("")}
        </nav>
      </div>
      <div class="sb-group"><h2 class="sb-h">Personal</h2>
        <nav class="sb-nav" aria-label="Personal">
          <a class="sb-link" href="#/journal" data-nav="journal">${LO.icon("journal", 22)}<span class="sb-label">Journal</span></a>
          <a class="sb-link" href="#/reminders" data-nav="reminders">${LO.icon("bell", 22)}<span class="sb-label">Reminders</span><span class="sb-count" id="remCount">${dueCount || ""}</span></a>
        </nav>
      </div>
      <div class="sb-foot">
        <a class="sb-link" href="#/settings" data-nav="settings">${LO.icon("settings", 22)}<span class="sb-label">Settings</span></a>
      </div>`;

    const nav = $("#bottomnav");
    nav.innerHTML = LO.navItems.map((n) => n.action
      ? `<button class="bn-item bn-capture" type="button" data-act="capture" aria-label="Capture"><span class="bn-ic">${LO.icon("plus", 26)}</span><span class="bn-label">Capture</span></button>`
      : `<a class="bn-item" href="#/${n.id}" data-nav="${n.id}"><span class="bn-ic">${LO.icon(n.icon, 24)}</span><span class="bn-label">${n.label}</span></a>`).join("");

    $("#topbar").innerHTML = `
      <div class="tb-left">
        <button class="iconbtn tb-back" type="button" data-act="back" aria-label="Back">${LO.icon("back", 22)}</button>
        <a class="tb-brand" href="#/home" aria-label="Life OS, home">${LO.mark(30)}<span class="tb-word">Life OS</span></a>
        <p class="tb-title" id="tbTitle"></p>
      </div>
      <form class="tb-search" role="search" id="tbSearch">
        ${LO.icon("search", 18)}
        <label class="vh" for="tbQ">Search your knowledge or ask a question</label>
        <input id="tbQ" class="tb-q" type="search" autocomplete="off" placeholder="Search your knowledge or ask a question" />
        <kbd class="kbd">/</kbd>
        <button class="btn subtle tb-ask" type="button" data-act="ask-submit">${LO.icon("spark", 16)}<span>Ask</span></button>
      </form>
      <div class="tb-right">
        <button class="btn primary tb-capture" type="button" data-act="capture">${LO.icon("plus", 18)}<span>Capture</span></button>
        <button class="iconbtn tb-askbtn" type="button" data-act="ask-toggle" aria-label="Ask your knowledge" aria-pressed="false">${LO.icon("ask", 22)}</button>
        <button class="iconbtn tb-theme" id="themeBtn" type="button" data-act="theme-toggle" aria-label="Switch theme"></button>
        <a class="avatar" href="#/settings" aria-label="Settings and profile">K</a>
      </div>`;
    LO.applyTheme();
    LO.refreshCounts();
  };
  LO.refreshCounts = function () {
    LO.topics.forEach((t) => {
      const el = $(`[data-count="${t.id}"]`);
      if (el) el.textContent = LO.state.items.filter((i) => i.topic === t.id).length;
    });
    const rc = $("#remCount");
    if (rc) rc.textContent = LO.state.reminders.filter((r) => !r.completed).length || "";
  };
  LO.updateShell = function (r, def) {
    const nm = r.name;
    const rootish = ROOT_ROUTES.includes(nm) || !LO.routes[nm];
    const activeNav = nm === "item" ? "library" : nm === "infographic" ? "library" : ["journal", "reminders", "settings"].includes(nm) ? nm : nm;
    $$("[data-nav]").forEach((a) => {
      const on = a.dataset.nav === activeNav;
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    $$("[data-topic]").forEach((a) => { if (nm === "library" && r.q.topic === a.dataset.topic) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    const bar = $("#topbar");
    bar.dataset.sub = rootish ? "false" : "true";
    $("#tbTitle").textContent = rootish ? "" : (def.barTitle ? def.barTitle(r.args, r.q) : "");
    bar.dataset.route = nm;
    document.body.classList.toggle("ask-page", nm === "ask");
    LO.syncAskRail();
    LO.refreshCounts();
  };

  /* ---------------- global actions ---------------- */
  LO.history = [];
  LO.back = function () {
    const r = LO.parseHash();
    const fallback = { item: "#/library", infographic: "#/library", reminders: "#/home", journal: "#/home", settings: "#/home", welcome: "#/settings", ask: "#/home", states: "#/settings", "share-target": "#/home" }[r.name] || "#/home";
    if (LO.navCount > 1 && history.length > 1) history.back(); else location.hash = fallback;
  };
  LO.navCount = 0;
  window.addEventListener("hashchange", () => { LO.navCount++; });

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-act]");
    if (!t) return;
    const act = t.dataset.act;
    const h = LO.actions[act];
    if (h) { h(t, e); }
  });
  LO.actions = {
    back: () => LO.back(),
    capture: (t) => LO.openCapture(t && t.dataset.mode ? { mode: t.dataset.mode } : {}),
    "theme-toggle": () => LO.setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"),
    "ask-toggle": () => LO.toggleAsk(),
    "ask-submit": () => { const q = $("#tbQ"); LO.askQuestion(q.value.trim()); q.value = ""; },
    "go": (t) => LO.go(t.dataset.href),
    "shortcuts": () => LO.showShortcuts(),
    "dismiss-banner": () => { LO.state.bannerDismissed = true; LO.save(); LO.render(); }
  };

  LO.showShortcuts = function () {
    const rows = [
      [`${LO.modKey} K`, "Open quick capture"], ["/", "Search or ask"], [`${LO.modKey} J`, "Show or hide the Ask panel"],
      ["\u2190 \u2192", "Previous or next card in Explore"], ["Space", "Open details for the current card"], ["F", "Favourite the current card"], ["Esc", "Close the open panel"], ["?", "Show this list"]
    ];
    LO.dialog({ title: "Keyboard shortcuts", body: `<dl class="kbd-list">${rows.map((r) => `<div><dt><kbd class="kbd">${r[0]}</kbd></dt><dd>${r[1]}</dd></div>`).join("")}</dl>`, actions: [{ label: "Close", kind: "primary", autofocus: true }] });
  };

  document.addEventListener("keydown", (e) => {
    const tag = (e.target.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); LO.openCapture({}); return; }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") { e.preventDefault(); LO.toggleAsk(); return; }
    if (typing || e.metaKey || e.ctrlKey || e.altKey || document.body.classList.contains("has-sheet")) return;
    if (e.key === "/") { e.preventDefault(); const q = LO.wide() || window.innerWidth >= 768 ? $("#tbQ") : null; if (q) q.focus(); else LO.go("#/library?focus=1"); }
    if (e.key === "?") { e.preventDefault(); LO.showShortcuts(); }
  });

  /* top bar search: Enter searches the library, the Ask button asks the question */
  document.addEventListener("submit", (e) => {
    if (e.target.id !== "tbSearch") return;
    e.preventDefault();
    const q = $("#tbQ").value.trim();
    if (/\?$/.test(q)) { LO.askQuestion(q); $("#tbQ").value = ""; }
    else LO.go("#/library" + (q ? "?q=" + encodeURIComponent(q) : ""));
  });

  /* offline banner (works for real and via ?offline=1 for review) */
  LO.online = () => navigator.onLine && LO.parseHash().q.offline !== "1";
  function syncOnline() {
    const b = $("#offlineBar");
    if (b) b.hidden = LO.online();
  }
  window.addEventListener("online", syncOnline);
  window.addEventListener("offline", syncOnline);
  LO.syncOnline = syncOnline;
  window.addEventListener("hashchange", syncOnline);
})();

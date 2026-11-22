/* Life OS prototype — first-run onboarding v2.
   Eight one-idea screens. Each shows the product doing its job in a small looping scene
   (capture, auto-organising, connecting, asking with citations, swiping, setup, topics).
   Scenes are plain DOM whose resting state is the finished picture; the Web Animations API
   plays the story on top. With reduced motion nothing plays and the finished picture stays. */
(function () {
  const LO = window.LO;
  const { $, $$, esc } = LO;

  const TOTAL = 8;
  const EASE = "cubic-bezier(.2,.8,.2,1)";
  const SPRING = "cubic-bezier(.16,1,.3,1)";
  const reduced = () => !!LO.state.reduceMotion || matchMedia("(prefers-reduced-motion: reduce)").matches;

  const STEPS = [
    { tone: "violet", eyebrow: "Welcome", h: "Everything you save, *finally understood.*", p: "Videos, reels, articles, voice notes, meetings and emails. Life OS pulls them into one place and makes sense of them for you." },
    { tone: "steel", eyebrow: "Capture", h: "Save it in *five seconds.*", p: "Share a link from your phone, click once in Chrome, paste it, or say it out loud. No folders, no forms." },
    { tone: "sand", eyebrow: "Organise", h: "No folders. | *It organises itself.*", p: "Title, summary, topics, people and next steps appear on their own. You can edit any of it." },
    { tone: "rose", eyebrow: "Connect", h: "Ideas *find each other.*", p: "Every new save is linked to what you already know, so patterns show up without you hunting for them." },
    { tone: "violet", eyebrow: "Ask", h: "Ask anything. | *Get answers with receipts.*", p: "Questions are answered from your own notes, and every claim links back to the item it came from." },
    { tone: "steel", eyebrow: "Rediscover", h: "Swipe through *what you know.*", p: "Short visual cards bring old ideas back at the right moment. Go back any time, and see what you have already revisited." },
    { tone: "sand", eyebrow: "Set up", h: "Save from *anywhere.*", p: "Set it up once on the device you use most. It takes under a minute, and you can skip it for now." },
    { tone: "rose", eyebrow: "Make it yours", h: "What do you *want to keep?*", p: "Pick any that fit and Home will lead with them. You can change this later." }
  ];

  const ua = navigator.userAgent;
  const detected = /Android/i.test(ua) ? "and" : /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ? "ios" : "desk";
  const ob = { dev: detected, picked: null };

  const stepOf = (q) => Math.min(TOTAL - 1, Math.max(0, parseInt(q.step, 10) || 0));
  const finish = (to) => {
    LO.state.welcomed = true;
    if (ob.picked) LO.state.interests = ob.picked.slice();
    LO.save();
    LO.go(to || "#/home");
  };

  /* ---------------- tiny animation toolkit ---------------- */
  function player() {
    const anims = [], timers = [];
    const P = {
      a(el, frames, o) {
        if (!el || !el.animate) return null;
        const an = el.animate(frames, Object.assign({ duration: 520, fill: "both", easing: EASE }, o));
        anims.push(an);
        return an;
      },
      all(root, sel, frames, o, stagger) {
        $$(sel, root).forEach((el, i) => P.a(el, frames, Object.assign({}, o, { delay: (o && o.delay || 0) + i * (stagger || 0) })));
      },
      type(el, delay, dur) {
        if (!el) return;
        P.a(el, [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }], { delay, duration: dur, easing: `steps(${Math.max(8, el.textContent.length)}, end)` });
      },
      at(ms, fn) { timers.push(setTimeout(fn, ms)); },
      clear() { anims.splice(0).forEach((a) => a.cancel()); timers.splice(0).forEach(clearTimeout); }
    };
    return P;
  }
  const rise = (y) => [{ opacity: 0, transform: `translateY(${y == null ? 10 : y}px)` }, { opacity: 1, transform: "translateY(0)" }];
  const pop = [{ opacity: 0, transform: "scale(.55)" }, { opacity: 1, transform: "scale(1)" }];
  /* Replays `build` forever, fading the scene out between runs. */
  function loop(sc, P, len, build) {
    const run = () => {
      P.clear();
      build();
      P.at(len - 420, () => P.a(sc, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: "ease-in" }));
      P.at(len, run);
    };
    run();
  }

  const art = (k) => LO.art(k);
  const gl = (t) => LO.srcGlyph(t, 12);
  const tag = (t, cls) => `<span class="fc ${cls || ""}">${esc(t)}</span>`;

  /* ================= scene 1: everything you save, in one place ================= */
  const WALL = [
    { t: "Build an AI agent in 20 minutes", s: "youtube", n: "YouTube", a: "agents", tone: "violet" },
    { t: "Three prompts that make AI answers sharper", s: "instagram", n: "Instagram", a: "context", tone: "steel" },
    { t: "Why design reviews need a checklist", s: "website", n: "Article", a: "quality", tone: "sand" },
    { t: "A weekly recall quiz", s: "voice", n: "Voice note", a: "journal", tone: "rose" },
    { t: "Design review with Arjun", s: "meeting", n: "Meeting", a: "design", tone: "steel" },
    { t: "Re: pricing for the pilot", s: "email", n: "Email", a: "saas", tone: "sand" },
    { t: "What I learned this week", s: "journal", n: "Journal", a: "network", tone: "violet" }
  ];
  const SCAT = [[-31, -27, -9], [31, -30, 8], [-37, 6, -6], [37, 4, 9], [-26, 36, 7], [27, 38, -7], [0, -4, 3]];
  const stackT = (i) => `translate(${(i - 3) * 3.4}cqmin, ${5 + Math.abs(i - 3) * 1.5}cqmin) rotate(${(i - 3) * 4.5}deg) scale(1.28)`;
  const mc = (c, style) => `<div class="mc" data-tone="${c.tone}" style="${style || ""}"><span class="mc-art">${art(c.a)}</span><span class="mc-b"><span class="mc-src">${gl(c.s)}<span>${c.n}</span></span><span class="mc-t">${esc(c.t)}</span></span></div>`;
  const S1 = {
    html: () => `<div class="sc sc1"><span class="s1-mark">${LO.mark(44)}</span>${WALL.map((c, i) => mc(c, `transform:${stackT(i)}`)).join("")}<span class="s1-chip">${LO.icon("layers", 14)}One inbox</span></div>`,
    play(sc, P) {
      $$(".mc", sc).forEach((el, i) => {
        const sp = SCAT[i], ang = Math.atan2(sp[1] || 1, sp[0] || 1);
        const far = `translate(${Math.cos(ang) * 96}cqmin, ${Math.sin(ang) * 96}cqmin) rotate(${sp[2] * 3}deg) scale(.8)`;
        const mid = `translate(${sp[0]}cqmin, ${sp[1]}cqmin) rotate(${sp[2]}deg)`;
        P.a(el, [{ transform: far, opacity: 0 }, { transform: mid, opacity: 1, offset: 0.38 }, { transform: mid, opacity: 1, offset: 0.6 }, { transform: stackT(i), opacity: 1 }], { duration: 3700, delay: i * 120 });
      });
      P.a($(".s1-mark", sc), [{ opacity: 0, transform: "translateX(-50%) scale(.4)" }, { opacity: 1, transform: "translateX(-50%) scale(1)" }], { delay: 3300, duration: 650, easing: SPRING });
      P.a($(".s1-chip", sc), [{ opacity: 0, transform: "translate(-50%, 10px)" }, { opacity: 1, transform: "translate(-50%, 0)" }], { delay: 3700, duration: 500 });
    }
  };

  /* ================= scene 2: capture ================= */
  const S2 = {
    html: () => `<div class="sc sc2">
      <div class="ph">
        <span class="ph-notch"></span>
        <p class="ph-h">Capture</p>
        <div class="ph-field"><span class="ph-ic">${LO.icon("link", 14)}</span><span class="ph-url"><span id="o2url">youtu.be/a1b2</span></span><span class="ph-save" id="o2save">Save</span></div>
        <p class="ph-l">Inbox</p>
        <div class="ph-list">
          <div class="ph-row"><span class="ph-th" data-tone="violet">${art("agents")}</span><span class="ph-rb"><span class="ph-rt" id="o2real">Build an AI agent in 20 minutes</span><span class="ph-sk" id="o2sk"><i></i><i></i></span><span class="ph-tags" id="o2tags">${tag("AI Agents")}${tag("Tool Calling")}</span></span></div>
          <div class="ph-row dim"><span class="ph-th" data-tone="sand">${art("quality")}</span><span class="ph-rb"><span class="ph-rt">Why design reviews need a checklist</span><span class="ph-rs">Article · 2 h ago</span></span></div>
          <div class="ph-row dim"><span class="ph-th" data-tone="rose">${art("journal")}</span><span class="ph-rb"><span class="ph-rt">A weekly recall quiz</span><span class="ph-rs">Voice note · yesterday</span></span></div>
        </div>
        <div class="ph-toast" id="o2toast">${LO.icon("check", 14)}<span>Saved</span></div>
      </div>
      <span class="chn c1">${LO.icon("share", 14)}Share sheet</span>
      <span class="chn c2">${LO.icon("puzzle", 14)}Chrome</span>
      <span class="chn c3">${LO.icon("mic", 14)}Voice</span>
      <span class="chn c4">${LO.icon("copy", 14)}Paste</span>
    </div>`,
    play(sc, P) {
      loop(sc, P, 8200, () => {
        P.a($(".ph", sc), [{ opacity: 0, transform: "translate(-50%, -46%) scale(.94)" }, { opacity: 1, transform: "translate(-50%, -50%) scale(1)" }], { duration: 650 });
        $$(".chn", sc).forEach((c, i) => {
          P.a(c, pop, { delay: 500 + i * 150, duration: 520, easing: SPRING });
          P.a(c, [{ boxShadow: "0 0 0 0 color-mix(in srgb, var(--colorBrandBackground) 45%, transparent)" }, { boxShadow: "0 0 0 2.4cqmin transparent" }], { delay: 1400 + i * 260, duration: 800, fill: "none", easing: "ease-out" });
        });
        P.type($("#o2url", sc), 1500, 1500);
        P.a($("#o2save", sc), [{ transform: "scale(1)" }, { transform: "scale(.88)", offset: 0.4 }, { transform: "scale(1)" }], { delay: 3200, duration: 380, fill: "none" });
        P.a($("#o2toast", sc), [{ opacity: 0, transform: "translate(-50%, 140%)" }, { opacity: 1, transform: "translate(-50%, 0)", offset: 0.14 }, { opacity: 1, transform: "translate(-50%, 0)", offset: 0.82 }, { opacity: 0, transform: "translate(-50%, 140%)" }], { delay: 3350, duration: 2200 });
        const row = $(".ph-row", sc);
        P.a(row, [{ opacity: 0, transform: "translateY(-14px) scale(.96)" }, { opacity: 1, transform: "translateY(0) scale(1)" }], { delay: 3500, duration: 560 });
        P.a($("#o2sk", sc), [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.86 }, { opacity: 0 }], { delay: 3500, duration: 1500 });
        P.a($("#o2real", sc), rise(4), { delay: 4950, duration: 420 });
        P.all(sc, "#o2tags .fc", pop, { delay: 5250, duration: 420, easing: SPRING }, 160);
      });
    }
  };

  /* ================= scene 3: it organises itself ================= */
  const KINDS = [
    { pill: "Videos", type: "Video", ti: "video", tone: "violet", a: "agents", s: "youtube", src: "youtube.com", title: "Build an AI agent in 20 minutes", meta: "21 min video", sum: "Start with two precisely described tools, then let the agent check its own work.", chips: [["AI Agents", "c"], ["Tool Calling", "c"], ["AI & Tech", "t"], ["try this weekend", "i"]], act: "Explore agent frameworks", when: "Sat" },
    { pill: "Voice notes", type: "Voice note", ti: "mic", tone: "rose", a: "journal", s: "voice", src: "Voice note", title: "A weekly recall quiz", meta: "0:42 voice note", sum: "Once a week, ask me one question about something I saved last month.", chips: [["Spaced repetition", "c"], ["Knowledge Systems", "c"], ["Personal", "t"], ["product idea", "i"]], act: "Sketch the quiz flow", when: "Mon" },
    { pill: "Meetings", type: "Meeting", ti: "calendar", tone: "steel", a: "design", s: "meeting", src: "Calendar", title: "Design review with Arjun", meta: "30 min · 3 people", sum: "Agreed to add a visual quality checklist before every review.", chips: [["Arjun", "p"], ["Meera", "p"], ["Design Quality", "c"], ["follow up", "i"]], act: "Send the checklist", when: "Fri" }
  ];
  const kindHTML = (k) => `<div class="oc" data-tone="${k.tone}">
    <span class="oc-type">${LO.icon(k.ti, 13)}${k.type}</span>
    <span class="oc-art">${art(k.a)}</span>
    <div class="oc-b">
      <p class="oc-src">${gl(k.s)}<span>${k.src}</span><span class="oc-dot"></span><span>${k.meta}</span></p>
      <p class="oc-t"><span class="oc-tt">${esc(k.title)}</span><span class="oc-sk"><i></i><i class="s"></i></span></p>
      <p class="oc-sum"><span>${esc(k.sum)}</span></p>
      <div class="oc-chips">${k.chips.map((c) => `<span class="fc ${c[1]}">${c[1] === "i" ? "# " : ""}${esc(c[0])}</span>`).join("")}</div>
      <p class="oc-act"><span class="oc-bell">${LO.icon("bell", 13)}</span><span>${esc(k.act)}</span><b>${k.when}</b></p>
    </div></div>`;
  const S3 = {
    html: () => `<div class="sc sc3"><div class="oc-slot" id="ocSlot">${kindHTML(KINDS[0])}</div><div class="oc-pills" role="group" aria-label="Examples">${KINDS.map((k, i) => `<button class="oc-pill" type="button" data-oc="${i}" aria-pressed="${i === 0}">${k.pill}</button>`).join("")}</div></div>`,
    play(sc, P) {
      const slot = $("#ocSlot", sc);
      let cur = 0, auto = true, tm = null;
      const show = (i, instant) => {
        cur = i;
        P.clear(); clearTimeout(tm);
        slot.innerHTML = kindHTML(KINDS[i]);
        $$(".oc-pill", sc).forEach((b, k) => b.setAttribute("aria-pressed", k === i));
        if (instant || reduced()) return;
        const card = $(".oc", slot);
        P.a(card, [{ opacity: 0, transform: "translateY(3cqmin) scale(.96)" }, { opacity: 1, transform: "translateY(0) scale(1)" }], { duration: 560 });
        P.a($(".oc-art", slot), [{ opacity: 0.2 }, { opacity: 1 }], { delay: 150, duration: 700 });
        P.a($(".oc-sk", slot), [{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { delay: 300, duration: 1500 });
        P.type($(".oc-tt", slot), 1000, 900);
        P.a($(".oc-sum", slot), rise(6), { delay: 1700, duration: 520 });
        P.a($(".oc-type", slot), [{ opacity: 0, transform: "scale(.4) rotate(-8deg)" }, { opacity: 1, transform: "scale(1) rotate(0)" }], { delay: 2000, duration: 560, easing: SPRING });
        $$(".fc", slot).forEach((c, j) => {
          const dx = [-26, 24, -18, 28][j % 4], dy = [-16, -22, 20, 14][j % 4];
          P.a(c, [{ opacity: 0, transform: `translate(${dx}cqmin, ${dy}cqmin) scale(.7)` }, { opacity: 1, transform: "translate(0,0) scale(1)" }], { delay: 2400 + j * 220, duration: 620, easing: SPRING });
        });
        P.a($(".oc-act", slot), rise(8), { delay: 3500, duration: 520 });
        P.a($(".oc-bell", slot), [{ transform: "rotate(0)" }, { transform: "rotate(-18deg)", offset: 0.25 }, { transform: "rotate(14deg)", offset: 0.5 }, { transform: "rotate(-8deg)", offset: 0.75 }, { transform: "rotate(0)" }], { delay: 4000, duration: 700, fill: "none" });
        if (auto) tm = setTimeout(() => show((cur + 1) % KINDS.length), 6400);
      };
      sc.addEventListener("click", (e) => {
        const b = e.target.closest("[data-oc]");
        if (!b) return;
        auto = false;
        show(+b.dataset.oc);
      });
      if (reduced()) { show(0, true); auto = false; return; }
      show(0);
      P.stopExtra = () => clearTimeout(tm);
    }
  };

  /* ================= scene 4: ideas find each other ================= */
  const GN = [
    { id: "ai", t: "AI Agents", x: 50, y: 47, big: true, hot: true },
    { id: "mcp", t: "MCP", x: 20, y: 33 },
    { id: "ctx", t: "Context Engineering", x: 78, y: 31, hot: true },
    { id: "aut", t: "Automation", x: 22, y: 68 },
    { id: "wf", t: "Workflows", x: 52, y: 78 },
    { id: "prod", t: "Productivity", x: 82, y: 62 },
    { id: "note", t: "Note · March", x: 17, y: 15, item: true, hot: true }
  ];
  const GE = [["ai", "mcp"], ["ai", "ctx"], ["ai", "aut"], ["aut", "wf"], ["wf", "prod"], ["ctx", "prod"], ["mcp", "note"]];
  const GH = [["new", "ai"], ["new", "ctx"], ["new", "note"]];
  const gpos = (id) => (id === "new" ? { x: 60, y: 12 } : GN.find((n) => n.id === id));
  const line = (a, b, cls) => { const p = gpos(a), q = gpos(b); return `<line class="${cls}" x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" pathLength="1" />`; };
  const S4 = {
    html: () => `<div class="sc sc4"><div class="gbox">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${GE.map((e) => line(e[0], e[1], "ge")).join("")}${GH.map((e) => line(e[0], e[1], "ge hot")).join("")}</svg>
      ${GN.map((n) => `<span class="gn ${n.big ? "big" : ""} ${n.item ? "item" : ""} ${n.hot ? "hot" : ""}" data-id="${n.id}" style="left:${n.x}%;top:${n.y}%">${n.item ? LO.icon("journal", 12) : '<i class="gd"></i>'}${esc(n.t)}</span>`).join("")}
      <span class="gn item neww" style="left:60%;top:12%"><i class="rip"></i>${LO.icon("video", 12)}New: AI agents video</span>
      <span class="g-badge">${LO.icon("spark", 14)}<span>Linked to 2 concepts and your note from March</span></span>
    </div></div>`,
    play(sc, P) {
      loop(sc, P, 9600, () => {
        $$(".ge:not(.hot)", sc).forEach((l, i) => P.a(l, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { delay: 150 + i * 150, duration: 700 }));
        $$(".gn:not(.neww)", sc).forEach((n, i) => P.a(n, [{ opacity: 0, transform: "translate(-50%,-50%) scale(.5)" }, { opacity: 0.62, transform: "translate(-50%,-50%) scale(1)" }], { delay: i * 120, duration: 560, easing: SPRING }));
        const nw = $(".neww", sc);
        P.a(nw, [{ opacity: 0, transform: "translate(-50%, -260%) scale(.8)" }, { opacity: 1, transform: "translate(-50%, -50%) scale(1)" }], { delay: 2000, duration: 800, easing: SPRING });
        P.a($(".rip", sc), [{ transform: "scale(.4)", opacity: 0.6 }, { transform: "scale(3.2)", opacity: 0 }], { delay: 2700, duration: 1000, easing: "ease-out" });
        $$(".ge.hot", sc).forEach((l, i) => P.a(l, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { delay: 3000 + i * 420, duration: 700 }));
        $$(".gn.hot", sc).forEach((n, i) => P.a(n, [{ opacity: 0.62, transform: "translate(-50%,-50%) scale(1)" }, { opacity: 1, transform: "translate(-50%,-50%) scale(1.12)", offset: 0.4 }, { opacity: 1, transform: "translate(-50%,-50%) scale(1)" }], { delay: 3500 + i * 420, duration: 900 }));
        P.a($(".g-badge", sc), [{ opacity: 0, transform: "translate(-50%, 14px)" }, { opacity: 1, transform: "translate(-50%, 0)" }], { delay: 5000, duration: 600 });
      });
    }
  };

  /* ================= scene 5: ask, with receipts ================= */
  const SRC5 = [
    { t: "Build an AI agent in 20 minutes", s: "youtube", n: "YouTube", a: "agents", tone: "violet" },
    { t: "Three prompts that make AI answers sharper", s: "instagram", n: "Instagram", a: "context", tone: "steel" },
    { t: "Note: keep the context short", s: "text", n: "Note · March", a: "network", tone: "sand" }
  ];
  const cite = (n) => `<sup class="ct" data-n="${n}">${n}</sup>`;
  const S5 = {
    html: () => `<div class="sc sc5">
      <div class="q5"><span id="o5q">What did I save about AI agents?</span></div>
      <div class="dots5" id="o5dots"><i></i><i></i><i></i></div>
      <div class="a5" id="o5a">
        <p class="a5-h">${LO.icon("spark", 13)}<span>3 saved items match</span></p>
        <p class="a5-t"><span class="s5">Start with two well-described tools and let the agent check its own work ${cite(1)}.</span> <span class="s5">Pasting a short checklist into the prompt helps too ${cite(2)}.</span> <span class="s5">Your March note adds: keep the context short ${cite(3)}.</span></p>
        <div class="src5">${SRC5.map((c, i) => `<span class="sr" data-tone="${c.tone}"><b>${i + 1}</b><span class="sr-art">${art(c.a)}</span><span class="sr-t">${esc(c.t)}</span><span class="sr-s">${gl(c.s)}<span>${c.n}</span></span></span>`).join("")}</div>
      </div></div>`,
    play(sc, P) {
      loop(sc, P, 11200, () => {
        P.a($(".q5", sc), [{ opacity: 0, transform: "translateY(8px) scale(.96)" }, { opacity: 1, transform: "translateY(0) scale(1)" }], { duration: 480 });
        P.type($("#o5q", sc), 450, 1300);
        P.a($("#o5dots", sc), [{ opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 1, offset: 0.88 }, { opacity: 0 }], { delay: 2000, duration: 1100 });
        $$("#o5dots i", sc).forEach((d, i) => P.a(d, [{ transform: "translateY(0)" }, { transform: "translateY(-1.2cqmin)", offset: 0.5 }, { transform: "translateY(0)" }], { delay: 2000 + i * 140, duration: 640, iterations: 2, fill: "none" }));
        P.a($("#o5a", sc), [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "translateY(0)" }], { delay: 3100, duration: 520 });
        $$(".s5", sc).forEach((s, i) => P.a(s, [{ opacity: 0, filter: "blur(4px)" }, { opacity: 1, filter: "blur(0)" }], { delay: 3500 + i * 1050, duration: 700 }));
        $$(".ct", sc).forEach((c, i) => P.a(c, pop, { delay: 4300 + i * 1050, duration: 480, easing: SPRING }));
        $$(".sr", sc).forEach((s, i) => P.a(s, [{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "translateY(0)" }], { delay: 6900 + i * 180, duration: 560 }));
        P.a($(".sr", sc), [{ boxShadow: "0 0 0 0 var(--colorBrandBackground)" }, { boxShadow: "0 0 0 .5cqmin var(--colorBrandBackground)" }, { boxShadow: "0 0 0 0 var(--colorBrandBackground)" }], { delay: 8200, duration: 1100, fill: "none" });
      });
    }
  };

  /* ================= scene 6: swipe through what you know ================= */
  const DECK = [
    { t: "Two tools beat ten", i: "A small agent with two well-described tools beats a big one with ten vague ones.", topic: "AI & Tech", a: "agents", tone: "violet", s: "youtube", n: "YouTube" },
    { t: "Say who it is for", i: "Name the reader, what good looks like and what to leave out.", topic: "AI & Tech", a: "context", tone: "steel", s: "instagram", n: "Instagram" },
    { t: "Polish is a habit", i: "The last ten percent is states, details and care that earn trust.", topic: "Design", a: "quality", tone: "sand", s: "website", n: "Article" },
    { t: "Ask before you automate", i: "Do it by hand three times first, then decide what is worth a workflow.", topic: "Business", a: "automation", tone: "rose", s: "text", n: "Note" }
  ];
  const rankT = (r) => (r === 0 ? "translate(0,0) scale(1)" : r === 1 ? "translate(0, 3.4cqmin) scale(.95)" : r === 2 ? "translate(0, 6.6cqmin) scale(.9)" : "translate(0, 9cqmin) scale(.86)");
  const S6 = {
    html: () => `<div class="sc sc6">
      <div class="deck" id="o6deck">${DECK.map((c, i) => `<div class="kc" data-i="${i}" data-tone="${c.tone}" style="transform:${rankT(i)};z-index:${9 - i};opacity:${i > 2 ? 0 : 1}"><span class="kc-art">${art(c.a)}</span><span class="kc-b"><span class="kc-top"><span class="fc t">${c.topic}</span><span class="kc-src">${gl(c.s)}<span>${c.n}</span></span></span><span class="kc-t">${esc(c.t)}</span><span class="kc-i">${esc(c.i)}</span></span><span class="kc-heart">${LO.icon("heart", 15)}</span></div>`).join("")}</div>
      <div class="prog6"><span class="pg-l"><b id="o6n">3</b> of 12 revisited</span><span class="pg-bars">${Array.from({ length: 12 }, (_, i) => `<i class="${i < 3 ? "on" : ""}"></i>`).join("")}</span></div>
      <span class="back6" id="o6back" aria-hidden="true">${LO.icon("undo", 14)}Back</span>
    </div>`,
    play(sc, P) {
      const cards = $$(".kc", sc), bars = $$(".pg-bars i", sc), num = $("#o6n", sc), backEl = $("#o6back", sc);
      let order = [0, 1, 2, 3], gone = [];
      const place = (anim) => cards.forEach((el) => {
        const i = +el.dataset.i, r = order.indexOf(i);
        el.style.transition = anim ? "transform .6s cubic-bezier(.2,.8,.2,1), opacity .45s" : "none";
        if (gone.includes(i)) { el.style.transform = "translate(-62cqmin, -2cqmin) rotate(-16deg)"; el.style.opacity = "0"; }
        else { el.style.transform = rankT(r); el.style.opacity = r > 2 ? "0" : "1"; }
        el.style.zIndex = gone.includes(i) ? 20 : 9 - r;
      });
      const setProg = (n) => { num.textContent = n; bars.forEach((b, k) => b.classList.toggle("on", k < n)); };
      const swipe = () => { const top = order.find((i) => !gone.includes(i)); gone.push(top); order = order.filter((i) => i !== top); place(true); };
      const goBack = () => { const last = gone.pop(); order.unshift(last); cards[last].style.transition = "none"; cards[last].style.transform = "translate(-62cqmin, -2cqmin) rotate(-16deg)"; cards[last].style.opacity = "0"; void cards[last].offsetWidth; place(true); };
      loop(sc, P, 10400, () => {
        order = [0, 1, 2, 3]; gone = []; place(false); setProg(3);
        P.a($("#o6deck", sc), [{ opacity: 0, transform: "translate(-50%, -45%)" }, { opacity: 1, transform: "translate(-50%, -50%)" }], { duration: 600 });
        P.a($(".prog6", sc), [{ opacity: 0, transform: "translate(-50%, 10px)" }, { opacity: 1, transform: "translate(-50%, 0)" }], { delay: 300, duration: 500 });
        P.at(1500, () => { swipe(); setProg(4); });
        P.at(3000, () => { swipe(); setProg(5); });
        P.at(4600, () => { backEl.style.opacity = "1"; backEl.style.transform = "translateX(-50%) scale(1)"; });
        P.at(5000, () => { goBack(); });
        P.at(5900, () => { backEl.style.opacity = "0"; backEl.style.transform = "translateX(-50%) scale(.9)"; });
        P.at(6600, () => { const k = cards[order[0]]; P.a($(".kc-heart", k), [{ transform: "scale(1)", color: "var(--colorNeutralForeground3)" }, { transform: "scale(1.55)", color: "var(--colorStatusDangerForeground1)", offset: 0.4 }, { transform: "scale(1.15)", color: "var(--colorStatusDangerForeground1)" }], { duration: 700 }); });
      });
    }
  };

  /* ================= scene 7: save from anywhere ================= */
  const DEV = {
    ios: { label: "iPhone", icon: "phone", steps: ["Tap <strong>Share</strong> in any app.", "Choose <strong>Save to Life OS</strong> from the list.", "Done. It is saved and organised within seconds."], note: "iPhone does not list web apps in the share sheet, so a one-time Shortcut does that job. The full guide has a copy-and-paste recipe." },
    and: { label: "Android", icon: "phone", steps: ["In Chrome, open the menu and tap <strong>Install app</strong>.", "In any app, tap <strong>Share</strong> and pick <strong>Life OS</strong>.", "Done. It is saved at once and organised in the background."], note: "" },
    desk: { label: "Desktop", icon: "desktop", steps: ["Add the <strong>Chrome extension</strong> from the setup guide.", "On any page, click <strong>Life OS</strong> in the toolbar, or press Alt Shift L.", "Done. Press " + LO.modKey + " K inside Life OS to capture by typing."], note: "" }
  };
  const pageMock = `<span class="pg-art" data-tone="sand">${art("quality")}</span><p class="pg-t">Why design reviews need a checklist</p><span class="pg-sk"><i></i><i></i><i class="s"></i></span>`;
  const toast7 = `<span class="ph-toast t7">${LO.icon("check", 14)}<span>Saved to Life OS</span></span>`;
  function s7html(dev) {
    if (dev === "desk") {
      return `<div class="sc sc7" data-dev="desk"><div class="bw"><div class="bw-bar"><i></i><i></i><i></i><span class="bw-url">quality-notes.example</span><span class="bw-ext" id="o7ext">${LO.icon("puzzle", 14)}</span></div>
        <div class="bw-page">${pageMock}</div>
        <div class="bw-pop" id="o7pop"><p class="bp-h">${LO.mark(18)}<b>Life OS</b></p><p class="bp-t">Why design reviews need a checklist</p><span class="bp-n">Add a note (optional)</span><span class="bp-b" id="o7btn">Save to Life OS</span></div>
        ${toast7}</div></div>`;
    }
    const apps = dev === "and"
      ? ["Messages", "Mail", "Notes", "Life OS"].map((a) => `<span class="ap ${a === "Life OS" ? "me" : ""}"><span class="ap-i">${a === "Life OS" ? LO.mark(26) : "<i></i>"}</span><span>${a}</span></span>`).join("")
      : ["Messages", "Mail", "Notes", "More"].map((a) => `<span class="ap"><span class="ap-i"><i></i></span><span>${a}</span></span>`).join("");
    return `<div class="sc sc7" data-dev="${dev}"><div class="ph ph7"><span class="ph-notch"></span><div class="pg">${pageMock}</div><span class="pg-share" id="o7share">${LO.icon("share", 16)}</span>
      <div class="sheet7" id="o7sheet"><p class="sh-h">Share</p><div class="sh-apps">${apps}</div>${dev === "ios" ? `<div class="sh-act me" id="o7act">${LO.mark(20)}<span>Save to Life OS</span></div><div class="sh-act"><span class="sh-g">${LO.icon("copy", 16)}</span><span>Copy</span></div>` : ""}</div>
      ${toast7}</div></div>`;
  }
  const S7 = {
    html: () => s7html(ob.dev),
    play(sc, P, stepsEl) {
      const dev = ob.dev;
      stepsEl.classList.add("live");
      const lit = (k) => $$("li", stepsEl).forEach((li, i) => li.classList.toggle("on", i === k));
      const t7 = () => $(".t7", sc);
      loop(sc, P, 8000, () => {
        lit(0);
        if (dev === "desk") {
          P.a($(".bw", sc), [{ opacity: 0, transform: "translate(-50%, -47%) scale(.97)" }, { opacity: 1, transform: "translate(-50%, -50%) scale(1)" }], { duration: 600 });
          P.a($("#o7ext", sc), [{ transform: "scale(1)" }, { transform: "scale(1.35)", offset: 0.4 }, { transform: "scale(1)" }], { delay: 1300, duration: 600, fill: "none" });
          P.at(1300, () => lit(1));
          P.a($("#o7pop", sc), [{ opacity: 0, transform: "translateY(-2cqmin) scale(.94)" }, { opacity: 1, transform: "translateY(0) scale(1)" }, { opacity: 1, transform: "translateY(0) scale(1)", offset: 0.7 }, { opacity: 0, transform: "translateY(-1cqmin) scale(.96)" }], { delay: 1800, duration: 3200 });
          P.a($("#o7btn", sc), [{ transform: "scale(1)" }, { transform: "scale(.93)", offset: 0.4 }, { transform: "scale(1)" }], { delay: 3500, duration: 420, fill: "none" });
          P.at(3700, () => lit(2));
          P.a(t7(), [{ opacity: 0, transform: "translate(-50%, -140%)" }, { opacity: 1, transform: "translate(-50%, 0)", offset: 0.12 }, { opacity: 1, transform: "translate(-50%, 0)", offset: 0.85 }, { opacity: 0, transform: "translate(-50%, -140%)" }], { delay: 3700, duration: 3000 });
        } else {
          P.a($(".ph", sc), [{ opacity: 0, transform: "translate(-50%, -46%) scale(.94)" }, { opacity: 1, transform: "translate(-50%, -50%) scale(1)" }], { duration: 650 });
          P.a($("#o7share", sc), [{ transform: "scale(1)" }, { transform: "scale(1.4)", offset: 0.4 }, { transform: "scale(1)" }], { delay: 1000, duration: 600, fill: "none" });
          P.at(1000, () => lit(0));
          P.a($("#o7sheet", sc), [{ transform: "translateY(105%)" }, { transform: "translateY(0)", offset: 0.14 }, { transform: "translateY(0)", offset: 0.72 }, { transform: "translateY(105%)" }], { delay: 1700, duration: 3600 });
          P.at(2300, () => lit(1));
          const target = $("#o7act", sc) || $(".ap.me", sc);
          P.a(target, [{ transform: "scale(1)" }, { transform: "scale(.94)", offset: 0.4 }, { transform: "scale(1)" }], { delay: 3400, duration: 450, fill: "none" });
          P.at(4400, () => lit(2));
          P.a(t7(), [{ opacity: 0, transform: "translate(-50%, -140%)" }, { opacity: 1, transform: "translate(-50%, 0)", offset: 0.12 }, { opacity: 1, transform: "translate(-50%, 0)", offset: 0.85 }, { opacity: 0, transform: "translate(-50%, -140%)" }], { delay: 4600, duration: 2800 });
        }
      });
    }
  };

  /* ================= scene 8: make it yours ================= */
  const S8 = {
    html: () => {
      const on = ob.picked || LO.state.interests || [];
      return `<div class="sc sc8"><div class="tiles" id="obTiles" role="group" aria-label="Topics">${LO.topics.map((t) => `<button class="tl" type="button" data-topic="${t.id}" data-tone="${t.tone}" aria-pressed="${on.includes(t.id)}"><span class="tl-art">${art(t.art)}</span><span class="tl-n">${esc(t.name)}</span><span class="tl-tick" aria-hidden="true">${LO.icon("check", 14)}</span></button>`).join("")}</div>
        <p class="tl-hint" id="obHint" aria-live="polite"></p></div>`;
    },
    play(sc, P) {
      const grid = $("#obTiles", sc), hint = $("#obHint", sc);
      const sync = (animate) => {
        const on = ob.picked || LO.state.interests || [];
        const tiles = $$(".tl", grid);
        const before = new Map(tiles.map((t) => [t, t.getBoundingClientRect()]));
        const ordered = LO.topics.slice().sort((a, b) => (on.includes(b.id) ? 1 : 0) - (on.includes(a.id) ? 1 : 0));
        ordered.forEach((t) => grid.appendChild($(`.tl[data-topic="${t.id}"]`, grid)));
        tiles.forEach((t) => t.setAttribute("aria-pressed", on.includes(t.dataset.topic)));
        hint.textContent = on.length ? "Home will lead with: " + ordered.filter((t) => on.includes(t.id)).map((t) => t.name).join(", ") + "." : "No picks yet. Home shows every topic in its usual order.";
        if (!animate || reduced()) return;
        tiles.forEach((t) => {
          const a = before.get(t), b = t.getBoundingClientRect();
          const dx = a.left - b.left, dy = a.top - b.top;
          if (dx || dy) P.a(t, [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0,0)" }], { duration: 520, fill: "none" });
        });
      };
      grid.addEventListener("click", (e) => {
        const t = e.target.closest(".tl");
        if (!t) return;
        const cur = (ob.picked || (LO.state.interests || [])).slice();
        const id = t.dataset.topic;
        ob.picked = cur.includes(id) ? cur.filter((x) => x !== id) : cur.concat(id);
        sync(true);
        P.a($(".tl-tick", t), [{ transform: "scale(.4)" }, { transform: "scale(1.2)", offset: 0.6 }, { transform: "scale(1)" }], { duration: 380, fill: "none", easing: SPRING });
      });
      sync(false);
      if (reduced()) return;
      P.all(sc, ".tl", [{ opacity: 0, transform: "translateY(18px) scale(.94)" }, { opacity: 1, transform: "translateY(0) scale(1)" }], { duration: 620, easing: SPRING }, 110);
      P.a(hint, rise(6), { delay: 650, duration: 420 });
    }
  };

  const SCENES = [S1, S2, S3, S4, S5, S6, S7, S8];

  /* ---------------- copy helpers ---------------- */
  function words(src, base) {
    let i = base || 0, inEm = false;
    return src.split(/(\*)|(\s+)/).filter((x) => x !== undefined && x !== "").map((tok) => {
      if (tok === "*") { inEm = !inEm; return ""; }
      if (tok === "|") return "<br>";
      if (/^\s+$/.test(tok)) return " ";
      return `<span class="w${inEm ? " em" : ""}" style="--i:${i++}">${esc(tok)}</span>`;
    }).join("");
  }
  function setupCopy() {
    const d = DEV[ob.dev];
    return `<div class="ob-seg" role="tablist" aria-label="Choose your device">${Object.keys(DEV).map((k) => `<button class="ob-segb" type="button" role="tab" data-dev="${k}" aria-selected="${k === ob.dev}" tabindex="${k === ob.dev ? 0 : -1}">${LO.icon(DEV[k].icon, 16)}<span>${DEV[k].label}</span></button>`).join("")}</div>
      <ol class="steps ob-steps" id="obSteps">${d.steps.map((s) => `<li>${s}</li>`).join("")}</ol>
      <p class="note ob-note" id="obNote" ${d.note ? "" : "hidden"}>${LO.icon("info", 16)}<span>${d.note}</span></p>
      <div class="set-card inline ob-sw"><div class="set-row"><div class="set-t"><label for="obClip" class="set-l">Offer to save links I have copied</label><p class="set-d" id="obClip-d">Checked only when you open Life OS, never in the background.</p></div><button class="switch" type="button" role="switch" id="obClip" aria-checked="${LO.state.clipboardOffer}" aria-describedby="obClip-d"><span class="knob"></span></button></div></div>
      <p class="ob-more"><a class="link" href="#/welcome" data-ob="guide">Open the full setup guide</a></p>`;
  }

  /* ---------------- persistent background ---------------- */
  function ensureBg(n) {
    let bg = $("#obBg");
    if (!bg) {
      bg = document.createElement("div");
      bg.id = "obBg"; bg.className = "ob-bg"; bg.setAttribute("aria-hidden", "true");
      bg.innerHTML = '<i class="b b1"></i><i class="b b2"></i><i class="b b3"></i><i class="grain"></i>';
      document.body.insertBefore(bg, document.body.firstChild);
      void bg.offsetWidth;
    }
    bg.dataset.tone = STEPS[n].tone;
    bg.style.setProperty("--s", n);
    return bg;
  }

  LO.routes.onboarding = {
    title: () => "Welcome", barTitle: () => "Welcome",
    render(args, q) {
      const n = stepOf(q), S = STEPS[n], last = n === TOTAL - 1;
      return `<div class="ob" data-step="${n}">
        <header class="ob-top"><span class="ob-brand">${LO.mark(28)}<span>Life OS</span></span>
          <div class="ob-prog" role="img" aria-label="Step ${n + 1} of ${TOTAL}">${Array.from({ length: TOTAL }, (_, i) => `<span class="ob-bar ${i < n ? "done" : i === n ? "now" : ""}"></span>`).join("")}</div>
          <button class="btn subtle" type="button" data-ob="skip">Skip</button></header>
        <div class="ob-main">
          <div class="ob-stage" id="obStage" data-tone="${S.tone}" ${n === 7 ? "" : 'aria-hidden="true"'}>${SCENES[n].html()}</div>
          <div class="ob-copy" id="obCopy">
            <p class="ob-eyebrow">${S.eyebrow}</p>
            <h1 class="ob-h" id="obH" tabindex="-1">${words(S.h)}</h1>
            <p class="ob-p">${S.p}</p>
            ${n === 6 ? `<div class="ob-x" id="obX">${setupCopy()}</div>` : ""}
          </div>
        </div>
        <footer class="ob-foot"><div class="ob-foot-in">
          <button class="btn subtle lg ob-back" type="button" data-ob="back" ${n === 0 ? "hidden" : ""}>${LO.icon("back", 18)}Back</button>
          <span class="ob-count" aria-hidden="true">${n + 1} / ${TOTAL}</span>
          <button class="btn primary lg ob-next" type="button" data-ob="next" id="obNext">${last ? "Open Life OS" : n === 0 ? "Get started" : "Next"}${last ? "" : LO.icon("arrowR", 18)}</button>
        </div></footer></div>`;
    },
    mount(root, args, q) {
      const n = stepOf(q);
      ensureBg(n);
      const ob$ = $(".ob", root), stage = $("#obStage", root), sc = $(".sc", stage);
      const h = $("#obH", root);
      if (h) setTimeout(() => h.focus({ preventScroll: true }), 0);

      const P = player();
      const go = (to) => LO.go(to);
      const next = () => { if (n === TOTAL - 1) { if (reduced()) finish("#/home"); else { ob$.classList.add("leaving"); setTimeout(() => finish("#/home"), 320); } } else go("#/onboarding?step=" + (n + 1)); };
      const back = () => { if (n > 0) go("#/onboarding?step=" + (n - 1)); };

      const startScene = () => {
        if (n === 2 || n === 7) SCENES[n].play(sc, P);
        else if (reduced()) return;
        else if (n === 6) SCENES[6].play(sc, P, $("#obSteps", root));
        else SCENES[n].play(sc, P);
      };
      startScene();

      const onKey = (e) => {
        const tag = (e.target.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea" || e.metaKey || e.ctrlKey || e.altKey || document.body.classList.contains("has-sheet")) return;
        if (e.key === "ArrowRight") { e.preventDefault(); next(); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); back(); }
      };
      document.addEventListener("keydown", onKey);
      LO.onLeave(() => {
        P.clear(); if (P.stopExtra) P.stopExtra();
        document.removeEventListener("keydown", onKey);
        if (LO.parseHash().name !== "onboarding") { const bg = $("#obBg"); if (bg) bg.remove(); }
      });

      ob$.addEventListener("click", (e) => {
        const b = e.target.closest("[data-ob]");
        if (b) {
          const k = b.dataset.ob;
          if (k === "next") next();
          else if (k === "back") back();
          else if (k === "skip") finish("#/home");
          else if (k === "guide") { LO.state.welcomed = true; LO.save(); }
          return;
        }
        const seg = e.target.closest("[data-dev]");
        if (seg && n === 6) {
          ob.dev = seg.dataset.dev;
          const d = DEV[ob.dev];
          $$(".ob-segb", root).forEach((s) => { const on = s.dataset.dev === ob.dev; s.setAttribute("aria-selected", on); s.tabIndex = on ? 0 : -1; });
          $("#obSteps", root).innerHTML = d.steps.map((s) => `<li>${s}</li>`).join("");
          const note = $("#obNote", root); note.hidden = !d.note; $("span", note).innerHTML = d.note;
          P.clear();
          stage.innerHTML = s7html(ob.dev);
          if (!reduced()) SCENES[6].play($(".sc", stage), P, $("#obSteps", root));
          return;
        }
        const sw = e.target.closest("#obClip");
        if (sw) { const on = sw.getAttribute("aria-checked") !== "true"; sw.setAttribute("aria-checked", on); LO.state.clipboardOffer = on; LO.save(); }
      });
      const seg = $(".ob-seg", root);
      if (seg) seg.addEventListener("keydown", (e) => {
        const tabsEl = $$(".ob-segb", seg), i = tabsEl.indexOf(document.activeElement);
        if (i < 0) return;
        let k = null;
        if (e.key === "ArrowRight") k = (i + 1) % tabsEl.length; else if (e.key === "ArrowLeft") k = (i - 1 + tabsEl.length) % tabsEl.length;
        if (k !== null) { e.preventDefault(); e.stopPropagation(); tabsEl[k].focus(); tabsEl[k].click(); }
      });
    }
  };
})();

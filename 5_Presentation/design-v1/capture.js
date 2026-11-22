/* Life OS prototype — capture sheet (compose → saved/processing → editable result). */
(function () {
  const LO = window.LO;
  const { $, $$, esc } = LO;

  const MODES = [
    { id: "note", label: "Note", icon: "note" },
    { id: "link", label: "Link", icon: "link" },
    { id: "voice", label: "Voice", icon: "mic" },
    { id: "journal", label: "Journal", icon: "journal" },
    { id: "reminder", label: "Reminder", icon: "bell" },
    { id: "chat", label: "AI chat", icon: "chat" }
  ];
  const VOICE_TEXT = "Idea: what if once a week Life OS asked me one question about something I saved last month. If I get it right it waits longer, and if I miss it comes back sooner.";

  LO.quickSave = async function (text, extra) {
    const url = LO.detectUrl(text);
    const inp = Object.assign({ type: url ? "link" : "note", text: url ? "" : text, url: url ? url.url : "", sample: url ? url.sample : null }, extra || {});
    if (url) { inp.text = ""; }
    const item = LO.capture.create(Object.assign({}, inp, { text: url ? url.url : text }));
    LO.toast("Saved. Organising it now.", { icon: "check", duration: 2600 });
    await LO.capture.process(item, Object.assign({}, inp, { text: url ? "" : text, url: url ? url.url : "" }));
    LO.toast("Organised: " + item.title, { icon: "spark", duration: 6000, action: { label: "Review", fn: () => LO.openCapture({ review: item.id }) } });
    return item;
  };

  LO.openCapture = function (opts) {
    opts = opts || {};
    const st = {
      mode: opts.mode || "note", phase: opts.review ? "result" : "compose",
      text: opts.text || "", url: opts.url || "", note: "", whenKey: null, whenTs: null, custom: "",
      rec: false, sec: 0, transcript: "", itemId: opts.review || null, step: -1, timer: null, typer: null
    };
    if (opts.url) st.mode = "link";
    let remMsg = null;

    const sheet = LO.sheet.open({
      title: st.phase === "result" ? "Review" : "Capture", variant: "palette", size: "tall", html: "", persistent: false,
      onMount: (el) => { el.addEventListener("click", onClick); el.addEventListener("input", onInput); el.addEventListener("keydown", onKey); el.addEventListener("change", onChange); },
      onClose: () => { clearInterval(st.timer); clearInterval(st.typer); LO.emit("capture-closed"); }
    });

    function valid() {
      if (st.mode === "link") return !!LO.detectUrl(st.url);
      if (st.mode === "voice") return st.transcript.trim().length > 3 && !st.rec;
      if (st.mode === "reminder") return st.text.trim().length > 1 && !!st.whenTs;
      return st.text.trim().length > 1;
    }

    /* ---------- compose ---------- */
    function composeHTML() {
      const tabs = MODES.map((m) => `<button class="cap-tab" role="tab" type="button" id="tab-${m.id}" aria-selected="${st.mode === m.id}" aria-controls="capPanel" tabindex="${st.mode === m.id ? 0 : -1}" data-mode="${m.id}">${LO.icon(m.icon, 18)}<span>${m.label}</span></button>`).join("");
      return `<div class="cap"><div class="cap-tabs" role="tablist" aria-label="What are you capturing?">${tabs}</div><div class="cap-panel" id="capPanel" role="tabpanel" aria-labelledby="tab-${st.mode}">${panelHTML()}</div></div>`;
    }
    function panelHTML() {
      switch (st.mode) {
        case "link": {
          const d = LO.detectUrl(st.url);
          return `<label class="lbl" for="capUrl">Link</label>
            <div class="inputrow"><input id="capUrl" class="field" type="url" inputmode="url" autocomplete="off" placeholder="Paste a link from anywhere" value="${esc(st.url)}" data-autofocus /><button class="btn outline" type="button" data-cap="paste">Paste</button></div>
            <div class="cap-detect" id="capDetect" aria-live="polite">${detectHTML()}</div>
            <p class="cap-ex-h">Try an example</p>
            <div class="chips"><button class="chip" type="button" data-cap="ex" data-k="youtube">${LO.icon("video", 16)}Video</button><button class="chip" type="button" data-cap="ex" data-k="instagram">${LO.icon("reel", 16)}Reel</button><button class="chip" type="button" data-cap="ex" data-k="website">${LO.icon("globe", 16)}Article</button></div>
            <label class="lbl" for="capNote">Add a note <span class="opt">optional</span></label>
            <textarea id="capNote" class="field" rows="2" placeholder="Why does this matter to you?">${esc(st.note)}</textarea>`;
        }
        case "voice":
          return `<div class="cap-voice">
            <button class="mic-btn ${st.rec ? "rec" : ""}" type="button" data-cap="rec" aria-pressed="${st.rec}" aria-label="${st.rec ? "Stop recording" : "Start recording"}" data-autofocus>${LO.icon(st.rec ? "stop" : "mic", 30)}</button>
            <div class="wave ${st.rec ? "on" : ""}" aria-hidden="true">${Array.from({ length: 28 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</div>
            <p class="cap-time" id="capTime" role="timer">${fmtSec(st.sec)}</p>
            <p class="cap-vhint" id="capVhint" aria-live="polite">${st.rec ? "Listening. Tap to stop." : st.transcript ? "Edit the transcript if anything is off." : "Tap to record. Your words are transcribed as you speak."}</p>
            <label class="vh" for="capTranscript">Transcript</label>
            <textarea id="capTranscript" class="field" rows="4" placeholder="Your words will appear here" ${st.transcript || st.rec ? "" : "hidden"}>${esc(st.transcript)}</textarea>
          </div>`;
        case "journal":
          return `<p class="cap-date">${LO.fmtDate(Date.now())}</p>
            <label class="vh" for="capText">Journal entry</label>
            <textarea id="capText" class="field cap-text" rows="6" placeholder="Write freely. Life OS will pick out the themes." data-autofocus>${esc(st.text)}</textarea>
            <p class="cap-ex-h">Need a nudge?</p>
            <div class="chips">${LO.journalPrompts.map((p) => `<button class="chip" type="button" data-cap="prompt" data-p="${esc(p)}">${esc(p)}</button>`).join("")}</div>`;
        case "reminder":
          return `<label class="lbl" for="capText">Remind me to</label>
            <textarea id="capText" class="field" rows="2" placeholder="Explore building a local AI agent this weekend" data-autofocus>${esc(st.text)}</textarea>
            <p class="lbl" id="whenLbl">When</p>
            <div class="chips" role="radiogroup" aria-labelledby="whenLbl">${LO.whenOptions.map((w) => `<button class="chip" type="button" role="radio" aria-checked="${st.whenKey === w.key}" data-cap="when" data-k="${w.key}">${w.label}</button>`).join("")}</div>
            <label class="lbl" for="capDate">Or pick a date</label>
            <input id="capDate" class="field field-date" type="date" value="${esc(st.custom)}" />
            <div class="cap-detect" id="capDetect" aria-live="polite">${detectHTML()}</div>`;
        case "chat":
          return `<label class="lbl" for="capText">Conversation</label>
            <textarea id="capText" class="field cap-text" rows="7" placeholder="Paste a conversation from ChatGPT, Gemini, Claude or any assistant" data-autofocus>${esc(st.text)}</textarea>
            <div class="row"><button class="btn outline" type="button" data-cap="paste">${LO.icon("copy", 18)}Paste from clipboard</button><button class="btn subtle" type="button" data-cap="sample-chat">Use a sample</button></div>
            <div class="cap-detect" id="capDetect" aria-live="polite">${detectHTML()}</div>`;
        default:
          return `<label class="vh" for="capText">Note</label>
            <textarea id="capText" class="field cap-text" rows="5" placeholder="What's on your mind?" data-autofocus>${esc(st.text)}</textarea>
            <div class="cap-detect" id="capDetect" aria-live="polite">${detectHTML()}</div>
            <p class="cap-help">Type a thought, or paste a link. Life OS works out the rest.</p>`;
      }
    }
    function detectHTML() {
      if (st.mode === "link") {
        const d = LO.detectUrl(st.url);
        if (!st.url) return "";
        if (!d) return `<span class="detect warn">${LO.icon("info", 16)}That doesn't look like a link yet.</span>`;
        const nice = { youtube: "Video", instagram: "Reel", website: "Web page" }[d.type];
        return `<span class="detect ok">${LO.srcGlyph(d.type, 16)}<span><strong>${nice}</strong> from ${esc(d.host)}${d.sample ? ". Preview: " + esc(d.sample.title) : ""}</span></span>`;
      }
      if (st.mode === "reminder") {
        return st.whenTs ? `<span class="detect ok">${LO.icon("calendar", 16)}<span>Due <strong>${esc(LO.dueLabel(st.whenTs))}</strong></span></span>` : "";
      }
      if (st.mode === "chat") {
        const turns = (st.text.match(/(^|\n)\s*(you|user|human|me|chatgpt|assistant|gemini|claude|ai)\s*(said)?\s*:/gi) || []).length;
        return st.text.trim() ? `<span class="detect ${turns ? "ok" : "warn"}">${LO.icon(turns ? "check" : "info", 16)}<span>${turns ? `<strong>${turns} turns</strong> detected` : "No speaker labels found. It will be saved as one note."}</span></span>` : "";
      }
      if (st.mode === "note" && st.text.trim()) {
        const u = LO.detectUrl(st.text.trim());
        if (u) return `<button class="detect suggest" type="button" data-cap="as-link">${LO.srcGlyph(u.type, 16)}<span>This looks like a link. <strong>Save it as a link</strong></span></button>`;
        if (LO.looksLikeChat(st.text)) return `<button class="detect suggest" type="button" data-cap="as-chat">${LO.icon("chat", 16)}<span>This looks like an AI chat. <strong>Import it as a conversation</strong></span></button>`;
        const w = LO.parseWhen(st.text);
        if (w && /\b(remind|remember to|explore|try|call|email|read|buy)\b/i.test(st.text)) return `<button class="detect suggest" type="button" data-cap="as-reminder">${LO.icon("bell", 16)}<span>Sounds like a reminder. <strong>Set it for ${esc(LO.dueLabel(w.ts))}</strong></span></button>`;
      }
      return "";
    }
    const fmtSec = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");

    function footerCompose() {
      return `<span class="cap-hint">${st.mode === "note" || st.mode === "reminder" ? `<kbd class="kbd">Enter</kbd> to save` : `<kbd class="kbd">${LO.modKey}</kbd> <kbd class="kbd">Enter</kbd> to save`}</span><button class="btn primary lg" type="button" data-cap="save" ${valid() ? "" : "disabled"}>Save</button>`;
    }

    /* ---------- processing ---------- */
    function procHTML(item, steps) {
      const names = steps || ["Reading the source", "Summarising", "Finding concepts", "Linking to what you have saved"];
      const excerpt = esc((item.original || "").slice(0, 160));
      return `<div class="proc">
        <p class="proc-saved">${LO.icon("check", 18)}<span><strong>Saved.</strong> You can close this. Organising carries on in the background.</span></p>
        <div class="proc-card" data-tone="violet">
          <div class="proc-meta">${LO.srcGlyph(item.sourceType, 16)}<span>${esc(item.sourceName || "Your capture")}</span></div>
          <p class="proc-orig">${excerpt || "&nbsp;"}${(item.original || "").length > 160 ? "\u2026" : ""}</p>
          <div class="skel" aria-hidden="true"><i></i><i></i><i></i></div>
        </div>
        <ol class="proc-steps" aria-label="Progress">${names.map((n, i) => `<li data-s="${i}" class="${i < st.step ? "done" : i === st.step ? "active" : ""}"><span class="ps-ic">${i < st.step ? LO.icon("check", 14) : ""}</span><span>${n}</span></li>`).join("")}</ol>
      </div>`;
    }

    /* ---------- result (editable) ---------- */
    function resultHTML(item) {
      const topic = LO.topicById(item.topic) || LO.topics[3];
      const rel = LO.related(item, 3);
      const cnames = (item.cids || []).map((id) => ({ id, c: LO.concept(id) })).filter((x) => x.c);
      const hasAct = item.actions && item.actions[0];
      const rem = item.reminderId && LO.state.reminders.find((r) => r.id === item.reminderId);
      const when = hasAct ? LO.parseWhen(item.actions[0]) || { ts: Date.now() + 2 * 864e5 } : null;
      return `<div class="res" data-tone="${topic.tone}">
        <div class="res-top"><div class="res-thumb" data-tone="${topic.tone}">${LO.art(item.art)}</div>
          <div><p class="res-saved">${LO.icon("check", 16)}Organised into <a href="#/library?topic=${topic.id}" data-sheet-close>${esc(topic.name)}</a></p><p class="res-orig">${LO.icon("lock", 14)}Your original is kept untouched.</p></div></div>
        <label class="lbl" for="rTitle">Title</label>
        <input id="rTitle" class="field" value="${esc(item.title)}" data-f="title" />
        <label class="lbl" for="rSum">Summary</label>
        <textarea id="rSum" class="field" rows="4" data-f="summary">${esc(item.summary)}</textarea>
        <p class="lbl" id="tkL">Key takeaways</p>
        <ul class="edit-list" aria-labelledby="tkL">${(item.takeaways || []).map((t, i) => `<li><label class="vh" for="tk${i}">Takeaway ${i + 1}</label><input id="tk${i}" class="field" value="${esc(t)}" data-f="tk" data-i="${i}" /><button class="iconbtn" type="button" data-cap="rm-tk" data-i="${i}" aria-label="Remove takeaway ${i + 1}">${LO.icon("close", 18)}</button></li>`).join("")}</ul>
        <button class="btn subtle sm" type="button" data-cap="add-tk">${LO.icon("plus", 16)}Add a takeaway</button>
        <p class="lbl" id="cnL">Concepts found</p>
        <div class="chips" aria-labelledby="cnL">${cnames.map((x) => `<span class="tagc ${x.c.isNew ? "new" : ""}" title="${x.c.isNew ? "New concept added to your graph" : "Linked to an existing concept"}"><span>${esc(x.c.short || x.c.name)}</span>${x.c.isNew ? '<em>New</em>' : ""}<button type="button" data-cap="rm-c" data-id="${x.id}" aria-label="Remove ${esc(x.c.name)}">${LO.icon("close", 14)}</button></span>`).join("") || '<span class="muted">None found</span>'}</div>
        <p class="lbl" id="tgL">Tags</p>
        <div class="chips" aria-labelledby="tgL">${(item.tags || []).map((t, i) => `<span class="tagc"><span>${esc(t)}</span><button type="button" data-cap="rm-t" data-i="${i}" aria-label="Remove tag ${esc(t)}">${LO.icon("close", 14)}</button></span>`).join("")}
          <form class="tag-add" data-cap-form="tag"><label class="vh" for="newTag">Add a tag</label><input id="newTag" class="tag-in" placeholder="Add tag" maxlength="24" /></form></div>
        ${hasAct ? `<div class="res-act"><label class="check"><input type="checkbox" data-cap="rem" ${rem ? "checked" : ""} /><span class="box" aria-hidden="true">${LO.icon("check", 14)}</span><span class="check-t"><strong>Remind me:</strong> ${esc(item.actions[0])} <em>${esc(LO.dueLabel(rem ? rem.dueAt : when.ts))}</em></span></label></div>` : ""}
        ${rel.length ? `<p class="lbl">Connected to what you already saved</p><ul class="mini-list">${rel.map((r) => `<li><a href="#/item/${r.id}" data-sheet-close>${LO.srcGlyph(r.sourceType, 16)}<span>${esc(r.title)}</span>${LO.icon("chevR", 16)}</a></li>`).join("")}</ul>` : ""}
      </div>`;
    }

    /* ---------- render ---------- */
    function render() {
      const body = $(".sheet-body", sheet);
      if (st.phase === "compose") { LO.sheet.setTitle("Capture"); body.innerHTML = composeHTML(); LO.sheet.setFooter(footerCompose()); }
      else if (st.phase === "processing") { LO.sheet.setTitle("Saved"); body.innerHTML = procHTML(LO.item(st.itemId)); LO.sheet.setFooter(""); }
      else if (st.phase === "reminder") {
        LO.sheet.setTitle("Reminder set");
        body.innerHTML = `<div class="res-done"><span class="big-check">${LO.icon("check", 32)}</span><p class="res-done-t">${esc(remMsg.title)}</p><p class="res-done-s">${LO.icon("calendar", 16)}${esc(LO.dueLabel(remMsg.dueAt))}</p></div>`;
        LO.sheet.setFooter(`<a class="btn outline" href="#/reminders" data-sheet-close>See reminders</a><button class="btn primary" type="button" data-cap="close">Done</button>`);
      } else {
        const item = LO.item(st.itemId);
        LO.sheet.setTitle("Review");
        body.innerHTML = resultHTML(item);
        LO.sheet.setFooter(`<a class="btn outline" href="#/item/${item.id}" data-sheet-close>Open item</a><button class="btn primary" type="button" data-cap="close" data-autofocus>Done</button>`);
      }
    }
    function refreshSave() { const b = $("[data-cap=save]", sheet); if (b) b.disabled = !valid(); }
    function setDetect() { const d = $("#capDetect", sheet); if (d) d.innerHTML = detectHTML(); }

    function readFields() {
      const g = (id) => { const e = $(id, sheet); return e ? e.value : null; };
      if (st.phase !== "compose") return;
      if (st.mode === "link") { const u = g("#capUrl"); if (u !== null) st.url = u; const n = g("#capNote"); if (n !== null) st.note = n; }
      else if (st.mode === "voice") { const t = g("#capTranscript"); if (t !== null) st.transcript = t; }
      else { const t = g("#capText"); if (t !== null) st.text = t; }
    }

    /* ---------- save ---------- */
    async function save() {
      readFields();
      if (!valid()) return;
      if (st.mode === "reminder") {
        const rem = { id: "r" + Date.now().toString(36), title: st.text.trim().replace(/\s*(today|tomorrow|tonight|this weekend|next week)\.?$/i, ""), dueAt: st.whenTs, sourceItemId: "", completed: false };
        LO.state.reminders.unshift(rem); LO.save(); LO.refreshCounts(); LO.emit("items");
        remMsg = rem; st.phase = "reminder"; render(); return;
      }
      let inp;
      if (st.mode === "link") { const d = LO.detectUrl(st.url); inp = { type: "link", text: st.note, url: d.url, sample: d.sample, urlType: d.type }; }
      else if (st.mode === "voice") inp = { type: "voice", text: st.transcript.trim() };
      else if (st.mode === "journal") inp = { type: "journal", text: st.text.trim() };
      else if (st.mode === "chat") inp = { type: "chat", text: st.text.trim() };
      else inp = { type: "note", text: st.text.trim() };
      const created = LO.capture.create(Object.assign({}, inp, { text: inp.type === "link" ? inp.url : inp.text }));
      if (inp.type === "link") created.sourceType = inp.urlType;
      st.itemId = created.id; st.phase = "processing"; st.step = 0; render();
      const done = LO.capture.process(created, Object.assign({}, inp), (i) => {
        st.step = i;
        if (st.phase !== "processing") return;
        $$(".proc-steps li", sheet).forEach((li, k) => {
          li.className = k < i ? "done" : k === i ? "active" : "";
          $(".ps-ic", li).innerHTML = k < i ? LO.icon("check", 14) : "";
        });
      });
      const wasOpen = () => document.body.contains(sheet);
      await done;
      if (wasOpen() && st.phase === "processing") { st.phase = "result"; render(); const f = $("#rTitle", sheet); if (f) f.focus({ preventScroll: true }); }
      else LO.toast("Organised: " + created.title, { icon: "spark", duration: 6000, action: { label: "Review", fn: () => LO.openCapture({ review: created.id }) } });
    }

    /* ---------- events ---------- */
    function onClick(e) {
      const tab = e.target.closest(".cap-tab");
      if (tab) { readFields(); st.mode = tab.dataset.mode; if (st.rec) stopRec(); render(); const a = $("[data-autofocus]", sheet); if (a) a.focus({ preventScroll: true }); return; }
      const b = e.target.closest("[data-cap]");
      if (!b) return;
      const k = b.dataset.cap;
      if (k === "save") save();
      else if (k === "close") LO.sheet.close();
      else if (k === "paste") paste();
      else if (k === "ex") { const s = LO.samples[b.dataset.k]; st.url = s.url; render(); $("#capUrl", sheet).focus({ preventScroll: true }); refreshSave(); }
      else if (k === "prompt") { const t = $("#capText", sheet); t.value = (t.value ? t.value + "\n\n" : "") + b.dataset.p + " "; st.text = t.value; t.focus(); refreshSave(); }
      else if (k === "when") { st.whenKey = b.dataset.k; const o = LO.whenOptions.find((w) => w.key === st.whenKey); st.whenTs = LO.parseWhen(o.text).ts; st.custom = ""; $$("[data-cap=when]", sheet).forEach((c) => c.setAttribute("aria-checked", c === b)); const d = $("#capDate", sheet); if (d) d.value = ""; setDetect(); refreshSave(); }
      else if (k === "rec") (st.rec ? stopRec : startRec)();
      else if (k === "sample-chat") { st.text = LO.samples.chat.text; render(); refreshSave(); }
      else if (k === "as-link") { const u = st.text.trim(); st.mode = "link"; st.url = u; st.text = ""; render(); refreshSave(); }
      else if (k === "as-chat") { st.mode = "chat"; render(); refreshSave(); }
      else if (k === "as-reminder") { const w = LO.parseWhen(st.text); st.mode = "reminder"; st.whenKey = w.key; st.whenTs = w.ts; render(); refreshSave(); }
      /* result edits */
      else if (st.phase === "result") resultClick(k, b);
    }
    function resultClick(k, b) {
      const item = LO.item(st.itemId);
      if (k === "rm-tk") item.takeaways.splice(+b.dataset.i, 1);
      else if (k === "add-tk") { item.takeaways.push(""); }
      else if (k === "rm-c") item.cids = item.cids.filter((c) => c !== b.dataset.id);
      else if (k === "rm-t") item.tags.splice(+b.dataset.i, 1);
      else if (k === "rem") return;
      else return;
      LO.save(); render();
      if (k === "add-tk") { const ins = $$("[data-f=tk]", sheet); ins[ins.length - 1].focus(); }
    }
    function onChange(e) {
      if (e.target.matches("#capDate")) { const v = e.target.value; if (v) { st.custom = v; st.whenKey = "custom"; const d = new Date(v + "T09:00:00"); st.whenTs = d.getTime(); $$("[data-cap=when]", sheet).forEach((c) => c.setAttribute("aria-checked", "false")); setDetect(); refreshSave(); } }
      if (e.target.matches("[data-cap=rem]")) {
        const item = LO.item(st.itemId);
        if (e.target.checked) {
          const w = LO.parseWhen(item.actions[0]) || { ts: Date.now() + 2 * 864e5 };
          const r = { id: "r" + Date.now().toString(36), title: item.actions[0], dueAt: w.ts, sourceItemId: item.id, completed: false };
          LO.state.reminders.unshift(r); item.reminderId = r.id; LO.toast("Reminder added", { icon: "bell", duration: 2200 });
        } else { LO.state.reminders = LO.state.reminders.filter((r) => r.id !== item.reminderId); item.reminderId = null; }
        LO.save(); LO.refreshCounts();
      }
    }
    function onInput(e) {
      const t = e.target;
      if (st.phase === "compose") {
        if (t.matches("#capText")) { st.text = t.value; if (st.mode === "reminder") { const w = LO.parseWhen(st.text); if (w && !st.custom) { st.whenKey = w.key; st.whenTs = w.ts; $$("[data-cap=when]", sheet).forEach((c) => c.setAttribute("aria-checked", c.dataset.k === w.key)); } } setDetect(); refreshSave(); }
        else if (t.matches("#capUrl")) { st.url = t.value; setDetect(); refreshSave(); }
        else if (t.matches("#capNote")) st.note = t.value;
        else if (t.matches("#capTranscript")) { st.transcript = t.value; refreshSave(); }
      } else if (st.phase === "result") {
        const item = LO.item(st.itemId);
        if (t.dataset.f === "title") item.title = t.value;
        else if (t.dataset.f === "summary") item.summary = t.value;
        else if (t.dataset.f === "tk") item.takeaways[+t.dataset.i] = t.value;
        LO.save();
      }
    }
    function onKey(e) {
      if (e.target.matches(".cap-tab")) {
        const tabs = $$(".cap-tab", sheet); const i = tabs.indexOf(e.target);
        let n = null;
        if (e.key === "ArrowRight") n = (i + 1) % tabs.length; else if (e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length; else if (e.key === "Home") n = 0; else if (e.key === "End") n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); tabs[n].focus(); tabs[n].click(); tabs[n].focus(); }
        return;
      }
      if (e.target.matches("#newTag") && e.key === "Enter") {
        e.preventDefault();
        const v = e.target.value.trim();
        if (v) { const item = LO.item(st.itemId); item.tags.push(v); LO.save(); render(); const n = $("#newTag", sheet); if (n) n.focus(); }
        return;
      }
      if (st.phase !== "compose") return;
      const multi = e.target.matches("textarea");
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        const quick = (st.mode === "note" || st.mode === "reminder") && multi;
        const mod = e.metaKey || e.ctrlKey;
        if ((quick || mod || e.target.matches("#capUrl")) && !e.target.matches("button")) { e.preventDefault(); readFields(); if (valid()) save(); }
      }
    }
    async function paste() {
      try {
        const t = await navigator.clipboard.readText();
        if (!t) throw new Error("empty");
        if (st.mode === "link") { st.url = t.trim(); } else { st.text = t; }
        render(); refreshSave();
      } catch (e) {
        LO.toast(`Clipboard access was blocked. Press ${LO.modKey}+V to paste instead.`, { icon: "info" });
        const f = $("#capUrl, #capText", sheet); if (f) f.focus();
      }
    }
    function startRec() {
      st.rec = true; st.sec = 0; st.transcript = "";
      render();
      let n = 0;
      st.timer = setInterval(() => { st.sec++; const t = $("#capTime", sheet); if (t) t.textContent = fmtSec(st.sec); }, 1000);
      st.typer = setInterval(() => {
        n += 3; st.transcript = VOICE_TEXT.slice(0, n);
        const ta = $("#capTranscript", sheet); if (ta) { ta.hidden = false; ta.value = st.transcript; }
        if (n >= VOICE_TEXT.length) { clearInterval(st.typer); }
      }, 90);
    }
    function stopRec() {
      clearInterval(st.timer); clearInterval(st.typer);
      st.rec = false;
      if (!st.transcript) st.transcript = VOICE_TEXT.slice(0, 60);
      render(); refreshSave();
    }

    if (opts.text && st.mode === "note") { /* prefilled from quick bar */ }
    render();
    if (opts.when) { const w = LO.parseWhen(opts.when); if (w) { st.whenKey = w.key; st.whenTs = w.ts; } }
    return sheet;
  };

  /* Mic and link buttons on the Home bar jump straight into the right mode. */
})();

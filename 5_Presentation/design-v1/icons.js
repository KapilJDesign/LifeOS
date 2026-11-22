/* Life OS prototype — icon set.
   Original 24px stroke glyphs drawn for this prototype. The production build
   uses @fluentui/react-icons; the Fluent equivalent is noted per glyph.
   Platform glyphs are deliberately generic (no brand logos). */
(function () {
  const LO = (window.LO = window.LO || {});

  const P = {
    home: '<path d="M3.5 11.2 12 4l8.5 7.2"/><path d="M5.8 9.8v9.7a.5.5 0 0 0 .5.5h11.4a.5.5 0 0 0 .5-.5V9.8"/><path d="M10 20v-5h4v5"/>', // Home24Regular
    explore: '<rect x="6.5" y="4.5" width="11" height="15" rx="3"/><path d="M3.5 8.5v7M20.5 8.5v7"/>', // Cards24Regular (custom)
    plus: '<path d="M12 5v14M5 12h14"/>', // Add24Regular
    graph: '<circle cx="6" cy="7" r="2.2"/><circle cx="18" cy="6" r="2.2"/><circle cx="12" cy="17.5" r="2.2"/><path d="M7.7 8.6 10.7 15.5M16.6 8 13.3 15.6M8.2 7h7.6"/>', // Diagram24Regular
    library: '<rect x="4" y="4.5" width="6.5" height="15" rx="1.8"/><rect x="13.5" y="4.5" width="6.5" height="6.7" rx="1.8"/><rect x="13.5" y="13.8" width="6.5" height="5.7" rx="1.8"/>', // Library24Regular
    ask: '<path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5h-6.2l-4.3 3.2V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5Z"/><path d="M12 8.7v4.2M9.9 10.8h4.2"/>', // ChatSparkle24Regular
    search: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/>', // Search24Regular
    mic: '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5"/>', // Mic24Regular
    link: '<path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-.8.8"/><path d="M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l.8-.8"/>', // Link24Regular
    close: '<path d="M6 6l12 12M18 6 6 18"/>', // Dismiss24Regular
    back: '<path d="m14.5 5.5-6.5 6.5 6.5 6.5"/>', // ChevronLeft24Regular
    chevR: '<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>', // ChevronRight24Regular
    chevD: '<path d="m5.5 9.5 6.5 6.5 6.5-6.5"/>', // ChevronDown24Regular
    chevU: '<path d="m5.5 14.5 6.5-6.5 6.5 6.5"/>', // ChevronUp24Regular
    arrowR: '<path d="M5 12h14m-5.5-5.5L19 12l-5.5 5.5"/>', // ArrowRight24Regular
    arrowL: '<path d="M19 12H5m5.5-5.5L5 12l5.5 5.5"/>', // ArrowLeft24Regular
    arrowU: '<path d="M12 19V5m-5.5 5.5L12 5l5.5 5.5"/>', // ArrowUp24Regular
    heart: '<path d="M12 20s-7.5-4.6-7.5-10.3A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z"/>', // Heart24Regular / Filled
    share: '<path d="M12 15V4M8 7.5l4-4 4 4M5.5 11v7.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V11"/>', // Share24Regular
    external: '<path d="M13.5 4.5h6v6M19.5 4.5 11 13M18 14v4.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1H10"/>', // Open24Regular
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.2"/><path d="M15.5 8.5V6.7a2.2 2.2 0 0 0-2.2-2.2H6.7a2.2 2.2 0 0 0-2.2 2.2v6.6a2.2 2.2 0 0 0 2.2 2.2h1.8"/>', // Copy24Regular
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', // Checkmark24Regular
    history: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 8.8"/><path d="M4.5 4.5v4.3h4.3M12 8v4.2l2.8 1.8"/>', // History24Regular
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15L6 16.5Z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>', // Alert24Regular
    journal: '<path d="M12 6.5C10 5 7.5 4.5 4.5 5v13c3-.5 5.5 0 7.5 1.5 2-1.5 4.5-2 7.5-1.5V5c-3-.5-5.5 0-7.5 1.5ZM12 6.5v13"/>', // Book24Regular
    sun: '<circle cx="12" cy="12" r="3.8"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M6 18l1.4-1.4M16.6 7.4 18 6"/>', // WeatherSunny24Regular
    moon: '<path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10Z"/>', // WeatherMoon24Regular
    settings: '<path d="M4 7h9M19 7h1M4 17h1M11 17h9"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/>', // Settings24Regular
    more: '<circle cx="5.5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor"/>', // MoreHorizontal24Regular
    edit: '<path d="m4.5 19.5 1-4L16 5a2 2 0 0 1 3 3L8.5 18.5l-4 1Z"/><path d="m14 7 3 3"/>', // Edit24Regular
    infographic: '<rect x="4" y="4" width="16" height="16" rx="3.2"/><path d="M4 10h16M10 10v10"/>', // DataBarVertical24Regular (custom)
    zoomIn: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5M10.5 8v5M8 10.5h5"/>', // ZoomIn24Regular
    zoomOut: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5M8 10.5h5"/>', // ZoomOut24Regular
    fit: '<path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15"/>', // FullScreenMaximize24Regular
    filter: '<path d="M4 7h16M7 12h10M10 17h4"/>', // Filter24Regular
    sort: '<path d="M8 5v14m0 0-3-3m3 3 3-3M16 19V5m0 0-3 3m3-3 3 3"/>', // ArrowSort24Regular
    list: '<path d="M9 7h11M9 12h11M9 17h11"/><circle cx="5" cy="7" r=".9" fill="currentColor"/><circle cx="5" cy="12" r=".9" fill="currentColor"/><circle cx="5" cy="17" r=".9" fill="currentColor"/>', // TextBulletList24Regular
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8"/>', // Grid24Regular
    spark: '<path d="M12 3.5c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7Z"/><path d="M18.5 16.5v3M17 18h3"/>', // Sparkle24Regular
    wifiOff: '<path d="M3.5 9.5a13 13 0 0 1 4-2.6M20.5 9.5a13 13 0 0 0-8.5-3M6.5 13a8 8 0 0 1 3-1.8M17.5 13a8 8 0 0 0-3.5-2M9.5 16.5a4 4 0 0 1 5 0M12 20h.01M4 4l16 16"/>', // WifiOff24Regular
    download: '<path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 19.5h14"/>', // ArrowDownload24Regular
    keyboard: '<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/>', // Keyboard24Regular
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.01"/>', // Info24Regular
    note: '<rect x="5" y="3.5" width="14" height="17" rx="2.4"/><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4"/>', // Note24Regular
    chat: '<path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5h-6.2l-4.3 3.2V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5Z"/>', // Chat24Regular
    video: '<rect x="3.5" y="6" width="17" height="12" rx="3.4"/><path d="m10.4 9.5 4.2 2.5-4.2 2.5Z" fill="currentColor"/>', // Video24Regular
    reel: '<rect x="6.5" y="3.5" width="11" height="17" rx="3.4"/><path d="m10.6 9.6 3.6 2.4-3.6 2.4Z" fill="currentColor"/>', // PhoneVerticalScroll24Regular (generic short-form glyph)
    globe: '<circle cx="12" cy="12" r="8.2"/><path d="M3.8 12h16.4M12 3.8c2.3 2.3 3.4 5 3.4 8.2s-1.1 5.9-3.4 8.2c-2.3-2.3-3.4-5-3.4-8.2S9.7 6.1 12 3.8Z"/>', // Globe24Regular
    voice: '<path d="M5 10v4M8.5 7v10M12 4.5v15M15.5 8v8M19 10.5v3"/>', // Mic24Regular / waveform
    calendar: '<rect x="4" y="5.5" width="16" height="14" rx="2.6"/><path d="M4 10h16M8.5 3.5v3.5M15.5 3.5v3.5"/>', // Calendar24Regular
    tag: '<path d="M4 12.6V5.5a1 1 0 0 1 1-1h7.1l8 8-7.6 7.6Z"/><circle cx="8.6" cy="9" r="1" fill="currentColor"/>', // Tag24Regular
    reset: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 8.8"/><path d="M4.5 4.5v4.3h4.3"/>', // ArrowReset24Regular
    phone: '<rect x="7" y="3" width="10" height="18" rx="2.8"/><path d="M11 18h2"/>', // Phone24Regular
    desktop: '<rect x="3.5" y="4.5" width="17" height="11.5" rx="2.4"/><path d="M9 20h6M12 16v4"/>', // Desktop24Regular
    puzzle: '<path d="M10 4.5h4a1 1 0 0 1 1 1V8h1.5a2 2 0 0 1 0 4H15v2.5a1 1 0 0 1-1 1h-2.5V14a2 2 0 0 0-4 0v1.5h-2a1 1 0 0 1-1-1v-4h1.5a2 2 0 0 0 0-4H4.5v-1a1 1 0 0 1 1-1H10Z"/>', // PuzzlePiece24Regular
    stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2.6" fill="currentColor"/>', // Stop24Filled
    layers: '<path d="m12 4 8.5 4.5L12 13 3.5 8.5 12 4Z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16l8.5 4.5 8.5-4.5"/>', // Layer24Regular
    target: '<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".9" fill="currentColor"/>', // Target24Regular
    undo: '<path d="M9 6.5 4.5 11 9 15.5"/><path d="M5 11h9.5a4.5 4.5 0 0 1 0 9H11"/>', // ArrowUndo24Regular
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.7"/><path d="m4 17.5 5-4.2 3.6 3 2.6-2.2 5 3.4"/>', // Image24Regular
    sliders: '<path d="M4 7h9M19 7h1M4 17h1M11 17h9"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/>',
    user: '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c.6-3.7 3.4-5.6 7-5.6s6.4 1.9 7 5.6"/>', // Person24Regular
    text: '<path d="M5 6.5h14M12 6.5V19M9 19h6"/>', // TextT24Regular
    lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2.4"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>', // LockClosed24Regular
    sidebar: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M9.5 4.5v15"/>', // PanelLeft24Regular
    panelRight: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M14.5 4.5v15"/>' // PanelRight24Regular
  };

  LO.icon = function (name, size, cls, label) {
    const body = P[name];
    if (!body) return "";
    const s = size || 20;
    const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"';
    return `<svg class="ic ${cls || ""}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${body}</svg>`;
  };
  LO.hasIcon = (n) => !!P[n];

  /* Generic platform glyphs keyed by KnowledgeItem.sourceType */
  LO.sourceMeta = {
    youtube: { icon: "video", label: "Video" },
    instagram: { icon: "reel", label: "Reel" },
    website: { icon: "globe", label: "Article" },
    text: { icon: "note", label: "Note" },
    voice: { icon: "voice", label: "Voice note" },
    journal: { icon: "journal", label: "Journal" },
    chat: { icon: "chat", label: "AI chat" }
  };
  LO.srcGlyph = function (type, size) {
    const m = LO.sourceMeta[type] || LO.sourceMeta.text;
    return `<span class="srcglyph" data-src="${type}" title="${m.label}">${LO.icon(m.icon, size || 16)}</span>`;
  };

  /* Brand mark: a ring with one orbiting node. Original, not derived from any logo. */
  LO.mark = function (size) {
    const s = size || 28;
    return `<svg class="mark" width="${s}" height="${s}" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><rect width="32" height="32" rx="10" fill="var(--colorBrandBackground)"/><circle cx="16" cy="16" r="7.2" fill="none" stroke="#fff" stroke-width="2.4"/><circle cx="22.3" cy="11.2" r="3.1" fill="#fff"/></svg>`;
  };
})();

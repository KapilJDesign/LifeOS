/* Life OS prototype — boot. */
(function () {
  const LO = window.LO;
  LO.renderShell();
  LO.syncOnline();

  /* Crossing the desktop breakpoint swaps panes for sheets, so re-render the screens that differ. */
  window.matchMedia("(min-width: 1024px)").addEventListener("change", () => {
    LO.syncAskRail();
    if (["item", "library", "explore", "ask", "graph"].includes(LO.parseHash().name) && !document.body.classList.contains("has-sheet")) LO.render();
  });

  LO.render();
})();

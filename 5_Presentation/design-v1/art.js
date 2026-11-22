/* Life OS prototype — generative card illustrations.
   One visual language: a single ink line weight, flat tone fields, circles and
   rounded squares as the only primitives. Every motif is built from the
   topic's tone (see [data-tone] in tokens.css), so dark mode and high contrast
   are handled by CSS variables, not by separate artwork. */
(function () {
  const LO = (window.LO = window.LO || {});

  const range = (n) => Array.from({ length: n }, (_, i) => i);

  const M = {
    agents() {
      const tools = [
        [305, 188],
        [114, 222],
        [181, 40]
      ];
      return `
        <circle class="s d" cx="200" cy="150" r="112"/>
        <circle class="s" cx="200" cy="150" r="68"/>
        <path class="s t" d="${tools.map((p) => `M200 150L${p[0]} ${p[1]}`).join("")}"/>
        <circle class="f" cx="223" cy="214" r="6"/><circle class="f" cx="136" cy="127" r="6"/><circle class="f" cx="252" cy="106" r="6"/>
        <circle class="fa" cx="200" cy="150" r="32"/>
        <circle class="fp" cx="200" cy="150" r="11"/>
        ${tools.map((p) => `<rect class="fp" x="${p[0] - 16}" y="${p[1] - 16}" width="32" height="32" rx="9"/>`).join("")}
        <circle class="fs" cx="86" cy="86" r="9"/><circle class="fs" cx="330" cy="82" r="6"/><circle class="fs" cx="330" cy="236" r="10"/>`;
    },
    mcp() {
      return `
        <path class="s" d="M144 150h32"/>
        <path class="s" d="M224 150c18 0 14-62 32-62M224 150h32M224 150c18 0 14 62 32 62"/>
        <rect class="fp" x="56" y="102" width="88" height="96" rx="22"/>
        <path class="s t" d="M76 130h48M76 150h34M76 170h44"/>
        <rect class="fa" x="176" y="124" width="48" height="52" rx="14"/>
        <circle class="fp" cx="200" cy="150" r="8"/>
        <rect class="fp" x="256" y="62" width="88" height="52" rx="16"/>
        <rect class="fp" x="256" y="124" width="88" height="52" rx="16"/>
        <rect class="fp" x="256" y="186" width="88" height="52" rx="16"/>
        <circle class="fs" cx="282" cy="88" r="9"/><circle class="fs" cx="282" cy="150" r="9"/><circle class="fs" cx="282" cy="212" r="9"/>
        <path class="s t" d="M302 88h24M302 150h24M302 212h24"/>
        <circle class="f" cx="144" cy="150" r="5"/><circle class="f" cx="256" cy="88" r="5"/><circle class="f" cx="256" cy="150" r="5"/><circle class="f" cx="256" cy="212" r="5"/>`;
    },
    context() {
      return `
        <rect class="fs" x="112" y="52" width="214" height="152" rx="24"/>
        <rect class="fp" x="94" y="76" width="214" height="152" rx="24"/>
        <rect class="fp" x="76" y="100" width="214" height="152" rx="24"/>
        <rect class="fa" x="92" y="146" width="182" height="28" rx="10"/>
        <path class="s" d="M96 128h92M96 198h120M96 220h72"/>
        <path class="s t" d="M114 160h84" style="stroke:var(--lifeosArtPaper)"/>
        <circle class="f" cx="286" cy="160" r="6"/>
        <path class="s t d" d="M292 160h42"/>`;
    },
    local() {
      const pins = range(4).map((i) => 152 + i * 32);
      return `
        <path class="s" d="${pins.map((x) => `M${x} 80V54M${x} 220v26`).join("")}${pins.map((y) => `M130 ${y - 50}H104M270 ${y - 50}h26`).join("")}"/>
        <rect class="fp" x="130" y="80" width="140" height="140" rx="30"/>
        <rect class="fa" x="164" y="114" width="72" height="72" rx="18"/>
        <circle class="fp" cx="200" cy="150" r="13"/>
        <circle class="fs" cx="78" cy="58" r="8"/><circle class="fs" cx="326" cy="244" r="9"/><circle class="fs" cx="332" cy="70" r="5"/>`;
    },
    design() {
      const x = [73, 139, 205, 271];
      const y = [56, 122, 188];
      const c = (i, j) => [x[i], y[j]];
      const tile = (i, j, k) => {
        const [px, py] = c(i, j);
        const cx = px + 28;
        const cy = py + 28;
        switch (k) {
          case "circ-a": return `<circle class="fa" cx="${cx}" cy="${cy}" r="27"/>`;
          case "sq-p": return `<rect class="fp" x="${px + 2}" y="${py + 2}" width="52" height="52" rx="14"/>`;
          case "quart": return `<path class="fs" d="M${px} ${py}h56a56 56 0 0 1-56 56z"/>`;
          case "ring": return `<circle class="s" cx="${cx}" cy="${cy}" r="24"/>`;
          case "half": return `<path class="f" d="M${px} ${py + 56}a28 28 0 0 1 56 0z"/>`;
          case "sq-s": return `<rect class="fs" x="${px}" y="${py}" width="56" height="56" rx="12"/>`;
          case "circ-p": return `<circle class="fp" cx="${cx}" cy="${cy}" r="25"/>`;
          case "tri": return `<path class="fa" d="M${px} ${py + 56}L${px + 56} ${py + 56}L${px + 56} ${py}z" />`;
          case "sq-a": return `<rect class="fa" x="${px}" y="${py}" width="56" height="56" rx="18"/>`;
          case "circ-s": return `<circle class="fs" cx="${cx}" cy="${cy}" r="27"/>`;
          case "bars": return `<path class="s" d="M${px + 8} ${py + 12}h40M${px + 8} ${py + 28}h40M${px + 8} ${py + 44}h24"/>`;
          default: return "";
        }
      };
      const layout = [
        ["circ-a", "sq-p", "quart", "ring"],
        ["half", "sq-s", "circ-p", "tri"],
        ["sq-a", "bars", "circ-s", "sq-p"]
      ];
      return layout.map((row, j) => row.map((k, i) => tile(i, j, k)).join("")).join("");
    },
    saas() {
      const bars = [
        [86, 54, "fs"],
        [132, 86, "fp"],
        [178, 118, "fs"],
        [224, 150, "fa"]
      ];
      const dots = [[286, 214], [304, 196], [284, 176], [310, 160], [292, 140], [318, 126], [300, 108], [326, 96], [306, 78]];
      return `
        <path class="s" d="M70 232H340"/>
        ${bars.map((b) => `<rect class="${b[2]}" x="${b[0]}" y="${232 - b[1]}" width="38" height="${b[1]}" rx="11"/>`).join("")}
        ${dots.map((d, i) => `<circle class="${i % 3 === 0 ? "fa" : "f"}" cx="${d[0]}" cy="${d[1]}" r="${i % 3 === 0 ? 7 : 4.5}"/>`).join("")}
        <path class="s t d" d="M100 150c44-8 94-34 142-84"/>`;
    },
    journal() {
      return `
        <path class="fa" d="M130 150a70 70 0 0 1 140 0z"/>
        <path class="s" d="M62 150h276"/>
        <path class="s t" d="M200 52v16M128 74l10 11M272 74l-10 11M92 118l14 6M308 118l-14 6"/>
        <path class="s" d="M96 180h208M96 204h144M96 228h176"/>
        <circle class="fp" cx="200" cy="150" r="0"/>`;
    },
    voice() {
      const h = [26, 50, 84, 120, 76, 148, 98, 60, 130, 88, 46, 104, 64, 34, 20];
      return h
        .map((v, i) => {
          const x = 84 + i * 16.4;
          const acc = i >= 4 && i <= 6;
          return `<path class="${acc ? "sa" : "s"}" style="stroke-width:9;${acc ? "" : ""}" d="M${x} ${150 - v / 2}v${v}"/>`;
        })
        .join("");
    },
    reminder() {
      return `
        <circle class="s" cx="200" cy="150" r="78"/>
        <path class="sa" style="stroke-width:14" d="M200 72A78 78 0 1 1 186.5 226.8"/>
        <path class="s t" d="M200 46v14M200 240v14M96 150h14M290 150h14"/>
        <path class="s" style="stroke-width:7" d="m172 152 18 18 36-36"/>
        <circle class="fs" cx="92" cy="62" r="8"/><circle class="fs" cx="318" cy="246" r="10"/>`;
    },
    network() {
      const n = [
        [200, 150, 24, "fa"], [118, 98, 13, "fp"], [292, 92, 15, "fs"], [84, 196, 9, "f"], [150, 238, 14, "fp"],
        [262, 226, 12, "fa"], [334, 168, 9, "f"], [232, 52, 9, "fp"], [66, 140, 7, "fs"], [340, 238, 6, "f"]
      ];
      const e = [[0, 1], [0, 2], [0, 4], [0, 5], [0, 7], [1, 3], [1, 8], [2, 6], [2, 7], [4, 3], [5, 6], [5, 9], [1, 7]];
      return `
        <path class="s t" d="${e.map(([a, b]) => `M${n[a][0]} ${n[a][1]}L${n[b][0]} ${n[b][1]}`).join("")}"/>
        ${n.map((p) => `<circle class="${p[3]}" cx="${p[0]}" cy="${p[1]}" r="${p[2]}"/>`).join("")}`;
    },
    aidesign() {
      return `
        <defs><clipPath id="ai-clip"><circle cx="168" cy="150" r="78"/></clipPath></defs>
        <circle class="fs" cx="168" cy="150" r="78"/>
        <rect class="fp" x="176" y="86" width="132" height="128" rx="30"/>
        <rect class="fa" x="176" y="86" width="132" height="128" rx="30" clip-path="url(#ai-clip)"/>
        <circle class="s" cx="168" cy="150" r="78"/>
        <path class="s t" d="M214 120h60M214 150h40M214 180h52" style="stroke:var(--lifeosArtInk)"/>
        <circle class="f" cx="76" cy="66" r="6"/><circle class="fs" cx="334" cy="250" r="9"/>`;
    },
    quality() {
      return `
        <circle class="s t d" cx="200" cy="150" r="104"/>
        <circle class="s" cx="200" cy="150" r="76"/>
        <circle class="s" cx="200" cy="150" r="50"/>
        <circle class="fa" cx="200" cy="150" r="24"/>
        <path class="s t" d="M200 30v50M200 220v50M80 150h50M270 150h50"/>
        <circle class="fp" cx="248" cy="118" r="9"/>
        <circle class="f" cx="200" cy="150" r="5" style="fill:var(--lifeosArtPaper)"/>`;
    },
    research() {
      const dots = [];
      for (let r = 0; r < 6; r++) for (let c = 0; c < 9; c++) dots.push([80 + c * 30, 66 + r * 34]);
      const hi = [[170, 100], [230, 134], [200, 168], [260, 168], [290, 100], [140, 168]];
      return `
        ${dots.map((d) => `<circle class="f" style="opacity:.3" cx="${d[0]}" cy="${d[1]}" r="3.5"/>`).join("")}
        <path class="sa" style="stroke-width:3" d="M${hi.map((h) => `${h[0]} ${h[1]}`).join("L")}"/>
        ${hi.map((h, i) => `<circle class="${i % 2 ? "fp" : "fa"}" cx="${h[0]}" cy="${h[1]}" r="${i % 2 ? 11 : 9}"/>`).join("")}`;
    },
    automation() {
      const xs = [92, 200, 308];
      return `
        <path class="s" d="M128 120h36M236 120h36"/>
        <path class="s" d="m158 112 8 8-8 8M266 112l8 8-8 8"/>
        <path class="s t" d="M308 156c0 64-216 64-216 0"/>
        <path class="s t" d="m84 164 8-8 8 8"/>
        ${xs.map((x, i) => `<rect class="${i === 1 ? "fa" : "fp"}" x="${x - 32}" y="88" width="64" height="64" rx="18"/>`).join("")}
        <circle class="f" cx="92" cy="120" r="7"/><path class="s" d="M184 120h32M200 104v32" style="stroke:var(--lifeosArtPaper)"/><rect class="fs" x="290" y="102" width="36" height="36" rx="10"/>`;
    },
    chat() {
      return `
        <path class="fp" d="M76 66h176a22 22 0 0 1 22 22v44a22 22 0 0 1-22 22H132l-34 26v-26H76a22 22 0 0 1-22-22V88a22 22 0 0 1 22-22Z" transform="translate(0 -2)"/>
        <path class="s t" d="M82 98h120M82 120h84"/>
        <path class="fa" d="M148 168h176a22 22 0 0 1 22 22v28a22 22 0 0 1-22 22h-22v26l-34-26h-120a22 22 0 0 1-22-22v-28a22 22 0 0 1 22-22Z" transform="translate(0 6)"/>
        <path class="s t" d="M170 206h120M170 226h76" style="stroke:var(--lifeosArtPaper)"/>`;
    }
  };

  LO.artKinds = Object.keys(M);

  LO.art = function (kind, cls) {
    const fn = M[kind] || M.network;
    return `<svg class="art ${cls || ""}" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${fn()}</svg>`;
  };
})();

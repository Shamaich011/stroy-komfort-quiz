// Схематичная визуализация комнаты и санузла по выбранной отделке (SVG).
(function () {
  const W = 400, H = 260;
  // Перспектива: задняя стена (100,60)-(300,190), углы картинки — ближние углы комнаты.
  const rightTop = (x) => 60 - (x - 300) * 0.6;
  const rightBot = (x) => 190 + (x - 300) * 0.7;
  const leftTop = (x) => 60 - (100 - x) * 0.6;
  const leftBot = (x) => 190 + (100 - x) * 0.7;

  function shade(hex, amt) {
    const n = parseInt((hex || '#cccccc').slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + 255 * amt)));
    const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
    return `rgb(${r},${g},${b})`;
  }
  const pts = (arr) => arr.map((p) => p.join(',')).join(' ');

  function shell(c, wallFill, leftFill, rightFill, floorFill) {
    return `
      <polygon points="${pts([[0, 0], [400, 0], [300, 60], [100, 60]])}" fill="${c.ceiling}"/>
      <polygon points="${pts([[0, 0], [400, 0], [300, 60], [100, 60]])}" fill="url(#ceilShade)"/>
      <rect x="100" y="60" width="200" height="130" fill="${wallFill}"/>
      <polygon points="${pts([[0, 0], [100, 60], [100, 190], [0, 260]])}" fill="${leftFill}"/>
      <polygon points="${pts([[400, 0], [300, 60], [300, 190], [400, 260]])}" fill="${rightFill}"/>
      <polygon points="${pts([[0, 260], [100, 190], [300, 190], [400, 260]])}" fill="${floorFill}"/>
      <polygon points="${pts([[0, 260], [100, 190], [300, 190], [400, 260]])}" fill="url(#floorShade)"/>`;
  }

  function spotsSvg(c) {
    const n = Math.max(0, Math.min(c.spots ?? 6, 12));
    if (!n) return '';
    const rows = n <= 4 ? 1 : n <= 8 ? 2 : 3;
    const perRow = Math.ceil(n / rows);
    let out = '', k = 0;
    for (let r = 0; r < rows; r++) {
      const y = rows === 1 ? 32 : 14 + (r * 38) / (rows - 1);
      const half = 200 - (100 * y) / 60 - 18; // ширина потолка на этой глубине
      for (let i = 0; i < perRow && k < n; i++, k++) {
        const x = 200 - half + ((i + 0.5) * 2 * half) / perRow;
        const rx = 3 + (60 - y) / 20;
        out += `<ellipse cx="${x}" cy="${y}" rx="${rx + 4}" ry="${(rx + 4) * 0.45}" fill="#fff7cf" opacity=".7"/>
          <ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${rx * 0.45}" fill="${c.spot === '#1e1e22' ? '#1e1e22' : '#ffffff'}" stroke="#bbb" stroke-width=".5"/>
          <ellipse cx="${x}" cy="${y}" rx="${rx * 0.5}" ry="${rx * 0.22}" fill="#fffbe6"/>`;
      }
    }
    return out;
  }

  const defs = (extra = '') => `
    <defs>
      <linearGradient id="ceilShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".04"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
      <linearGradient id="floorShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity=".06"/></linearGradient>
      ${extra}
    </defs>`;

  function socket(x, y, color, w = 9) {
    const dark = color === '#1e1e22';
    return `<rect x="${x}" y="${y}" width="${w}" height="${w}" rx="1.5" fill="${color}" stroke="${dark ? '#000' : '#c9c9c9'}" stroke-width=".6"/>
      <circle cx="${x + w / 2 - 1.6}" cy="${y + w / 2}" r=".8" fill="${dark ? '#666' : '#999'}"/><circle cx="${x + w / 2 + 1.6}" cy="${y + w / 2}" r=".8" fill="${dark ? '#666' : '#999'}"/>`;
  }

  function room(c) {
    let planks = '';
    for (let i = 0; i <= 12; i++) {
      const xb = 100 + (200 * i) / 12, xf = (400 * i) / 12;
      planks += `<line x1="${xb}" y1="190" x2="${xf}" y2="260" stroke="${shade(c.floor, -0.12)}" stroke-width=".7"/>`;
    }
    for (let j = 1; j <= 5; j++) {
      const t = (j / 6) ** 1.6, y = 190 + 70 * t, xl = 100 - 100 * t, xr = 300 + 100 * t;
      for (let i = 0; i < 12; i++) {
        if ((i + j) % 3) continue;
        const x = xl + ((xr - xl) * (i + 0.5)) / 12;
        planks += `<line x1="${x - 4 - 4 * t}" y1="${y}" x2="${x + 4 + 4 * t}" y2="${y}" stroke="${shade(c.floor, -0.12)}" stroke-width=".6"/>`;
      }
    }
    // Дверь на правой стене
    const dx1 = 322, dx2 = 362;
    const dTop = (x) => rightBot(x) - 0.8 * (rightBot(x) - rightTop(x));
    const door = `<polygon points="${pts([[dx1 - 3, dTop(dx1 - 3) - 3], [dx2 + 3, dTop(dx2 + 3) - 3], [dx2 + 3, rightBot(dx2 + 3)], [dx1 - 3, rightBot(dx1 - 3)]])}" fill="${shade(c.door, -0.08)}"/>
      <polygon points="${pts([[dx1, dTop(dx1)], [dx2, dTop(dx2)], [dx2, rightBot(dx2)], [dx1, rightBot(dx1)]])}" fill="${c.door}" stroke="${shade(c.door, -0.2)}" stroke-width=".8"/>
      <rect x="${dx2 - 8}" y="${(dTop(dx2) + rightBot(dx2)) / 2}" width="5" height="2" fill="#222"/>`;
    const plinth = `<polyline points="${pts([[0, 257], [100, 188], [300, 188], [400, 257]])}" fill="none" stroke="#fff" stroke-width="3"/>`;
    const win = `<rect x="148" y="78" width="104" height="82" fill="#fff"/><rect x="153" y="83" width="45" height="72" fill="#cfe6f5"/><rect x="202" y="83" width="45" height="72" fill="#cfe6f5"/>
      <rect x="153" y="130" width="94" height="25" fill="#bcd9b0" opacity=".7"/><rect x="144" y="160" width="112" height="4" fill="#fff"/>`;
    const sockets = socket(118, 172, c.electric) + socket(270, 172, c.electric) + socket(130, 118, c.electric, 8);
    return `<svg class="viz" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Визуализация комнаты">
      ${defs()}${shell(c, c.wall, shade(c.wall, -0.06), shade(c.wall, -0.03), c.floor)}
      ${planks}${plinth}${win}${door}${sockets}${spotsSvg(c)}
    </svg>`;
  }

  function bath(c) {
    const tilePat = (id, color, w, h) => `<pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse">
      <rect width="${w}" height="${h}" fill="${color}"/><path d="M0 0H${w}M0 0V${h}" stroke="${shade(color, -0.14)}" stroke-width=".8"/></pattern>`;
    const extra = tilePat('tw', c.tileWall, 22, 14) + tilePat('twL', shade(c.tileWall, -0.05), 22, 14) + tilePat('twR', shade(c.tileWall, -0.03), 22, 14) + tilePat('tf', c.tileFloor, 26, 26);
    let fixture = '';
    if (c.bathKind === 'bathtub') {
      fixture = `<rect x="104" y="150" width="120" height="44" fill="url(#tw)" stroke="${shade(c.tileWall, -0.2)}" stroke-width=".6"/>
        <rect x="100" y="146" width="128" height="8" rx="3" fill="#fff" stroke="#ccc" stroke-width=".6"/>
        <path d="M150 112 v-30 h6" stroke="#aaa" stroke-width="2" fill="none"/><circle cx="160" cy="80" r="5" fill="#ccc"/>
        <rect x="140" y="128" width="16" height="4" rx="2" fill="#bbb"/>`;
    } else if (c.bathKind === 'tray') {
      fixture = `<polygon points="${pts([[102, 192], [170, 192], [155, 214], [80, 214]])}" fill="#fff" stroke="#ccc" stroke-width=".8"/>
        <line x1="170" y1="70" x2="170" y2="192" stroke="#9fb6c2" stroke-width="2"/><polygon points="${pts([[170, 70], [170, 192], [155, 214], [155, 84]])}" fill="#d9eef7" opacity=".45" stroke="#9fb6c2" stroke-width="1"/>
        <path d="M130 112 v-34 h6" stroke="#aaa" stroke-width="2" fill="none"/><circle cx="140" cy="76" r="6" fill="#ccc"/>`;
    } else {
      fixture = `<line x1="104" y1="200" x2="160" y2="200" stroke="#888" stroke-width="3"/>
        <line x1="172" y1="64" x2="172" y2="190" stroke="#9fb6c2" stroke-width="2"/><polygon points="${pts([[172, 64], [172, 190], [158, 210], [158, 78]])}" fill="#d9eef7" opacity=".45" stroke="#9fb6c2" stroke-width="1"/>
        <path d="M134 112 v-36 h6" stroke="#aaa" stroke-width="2" fill="none"/><rect x="132" y="68" width="22" height="5" rx="2" fill="#ccc"/>`;
    }
    const sink = c.sinkCabinet
      ? `<rect x="234" y="150" width="56" height="38" fill="#fff" stroke="#ccc" stroke-width=".8"/><line x1="262" y1="152" x2="262" y2="186" stroke="#ddd"/>
         <rect x="230" y="140" width="64" height="11" rx="4" fill="#fff" stroke="#ccc" stroke-width=".8"/>`
      : `<rect x="236" y="140" width="52" height="12" rx="5" fill="#fff" stroke="#ccc" stroke-width=".8"/><rect x="258" y="152" width="8" height="26" fill="#eee"/>`;
    const mirror = `<rect x="238" y="80" width="48" height="50" rx="2" fill="#e8f1f6" stroke="#bbb" stroke-width=".8"/><path d="M262 140 v-6 h5" stroke="#aaa" stroke-width="2" fill="none"/>`;
    // Унитаз у левой стены
    const toilet = c.toiletKind === 'installation'
      ? `<rect x="38" y="120" width="16" height="11" rx="1.5" fill="#fff" stroke="#bbb" stroke-width=".6"/>
         <path d="M30 170 q12 -6 34 0 l-2 14 q-14 8 -30 0 z" fill="#fff" stroke="#bbb" stroke-width=".8"/>`
      : `<rect x="28" y="140" width="34" height="26" rx="3" fill="#fff" stroke="#bbb" stroke-width=".8"/>
         <path d="M24 172 q18 -8 44 0 l-4 22 q-18 10 -36 0 z" fill="#fff" stroke="#bbb" stroke-width=".8"/>
         <rect x="34" y="194" width="22" height="16" fill="#fff" stroke="#bbb" stroke-width=".8"/>`;
    let rail = '';
    for (let i = 0; i < 5; i++) {
      const y1 = rightTop(330) + 40 + i * 12, y2 = rightTop(352) + 40 + i * 12;
      rail += `<line x1="330" y1="${y1}" x2="352" y2="${y2}" stroke="#b8bcc0" stroke-width="2.4"/>`;
    }
    rail += `<line x1="330" y1="${rightTop(330) + 36}" x2="330" y2="${rightTop(330) + 92}" stroke="#a8acb0" stroke-width="2.6"/>
      <line x1="352" y1="${rightTop(352) + 36}" x2="352" y2="${rightTop(352) + 92}" stroke="#a8acb0" stroke-width="2.6"/>`;
    return `<svg class="viz" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Визуализация санузла">
      ${defs(extra)}${shell(c, 'url(#tw)', 'url(#twL)', 'url(#twR)', 'url(#tf)')}
      ${fixture}${mirror}${sink}${toilet}${rail}${socket(296, 120, c.electric, 8)}${spotsSvg({ ...c, spots: Math.min(c.spots ?? 4, 4) })}
    </svg>`;
  }

  window.Viz = { room, bath, leftTop, leftBot };
})();

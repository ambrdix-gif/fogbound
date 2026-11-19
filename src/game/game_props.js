
/* ---------- procedural prop sprites (placeholders until the GPT versions arrive): cart, boat, tree, snag, gate bars ---------- */
const PC = { INK: '#091c20', D1: '#112829', D2: '#15322f', D3: '#1e2527', D4: '#272c2b', T1: '#1d3e37', T2: '#214439', T3: '#2f5249', T4: '#406458', T5: '#5a7b6f', T6: '#7a988c',
  W0: '#2d241d', W1: '#49362e', W2: '#5e553f', W3: '#7e6643', W4: '#9a7e52', S0: '#484d35', S1: '#5b5032', S2: '#6d6034', M1: '#4a5d3a', M2: '#62773a', A1: '#e1a440', A2: '#cc8c35', A4: '#e47325' };
const PROP = {};
let pseed = 11; const prr = () => { pseed = (pseed * 16807) % 2147483647; return pseed / 2147483647; };
function mkCv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; }
const R_ = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
function woodFill(g, x, y, w, h, base, dark, light, horiz) {
  R_(g, base, x, y, w, h);
  for (let i = 0; i < w * h * 0.28; i++) R_(g, prr() < 0.5 ? dark : light, x + prr() * w, y + prr() * h, horiz ? 3 : 1, horiz ? 1 : 3);
}
function buildProps() {
  // ---------- cart body (wheel drawn live) ----------
  { const [c, g] = mkCv(78, 40);
    woodFill(g, 12, 10, 58, 18, PC.W2, PC.W1, PC.W3, true);
    for (const y of [15, 21]) R_(g, PC.W0, 12, y, 58, 1);
    for (const x of [12, 30, 48, 68]) R_(g, PC.W0, x, 10, 2, 18);
    R_(g, PC.W3, 11, 8, 60, 3); R_(g, PC.W4, 11, 8, 60, 1); R_(g, PC.W0, 11, 11, 60, 1);
    R_(g, PC.W0, 10, 27, 62, 2);
    for (let i = 0; i < 9; i++) R_(g, PC.M1, 12 + prr() * 56, 9 + prr() * 3, 3, 2);
    // handles
    for (let i = 0; i <= 16; i++) { R_(g, PC.W3, 12 - i * 0.7, 16 + i * 0.28, 3, 2); R_(g, PC.W1, 12 - i * 0.7, 18 + i * 0.28, 3, 1); }
    R_(g, PC.W4, 0, 20, 3, 2);
    // cargo: a couple of sacks + reeds
    R_(g, PC.S1, 22, 3, 14, 8); R_(g, PC.S2, 24, 3, 8, 3); R_(g, PC.W0, 22, 10, 14, 1); R_(g, PC.S0, 26, 1, 4, 3);
    R_(g, PC.S0, 40, 5, 12, 6); R_(g, PC.S2, 42, 4, 6, 2);
    for (const x of [54, 57, 60]) R_(g, PC.M1, x, 0 + (x % 3), 1, 10);
    PROP.cart = c; }
  // wheel: 8 rotation frames (4 spokes)
  PROP.wheel = [];
  for (let f = 0; f < 8; f++) {
    const [c, g] = mkCv(26, 26), ph = f / 8 * (Math.PI / 2);
    for (let y = 0; y < 26; y++) for (let x = 0; x < 26; x++) {
      const dx = x - 12.5, dy = y - 12.5, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      if (r > 12.4) continue;
      if (r > 10) R_(g, r > 11.5 ? PC.W0 : PC.W1, x, y, 1, 1);
      else if (r > 8.6) R_(g, PC.W3, x, y, 1, 1);
      else if (r < 3) R_(g, r < 1.6 ? PC.A2 : PC.W3, x, y, 1, 1);
      else if (Math.abs(Math.sin(2 * (a - ph))) < 0.2 + 0.4 / r) R_(g, PC.W2, x, y, 1, 1);
      else if (r > 3) R_(g, PC.D1, x, y, 1, 1);
    }
    PROP.wheel.push(c);
  }
  // ---------- boat hull ----------
  { const W = 92, H = 38, [c, g] = mkCv(W, H);
    for (let x = 0; x < W; x++) {
      const u = (x - 45.5) / 46, top = 12 - Math.round(7 * u * u * u * u + 5 * u * u), bot = Math.round(top + 20 * (1 - Math.pow(Math.abs(u), 3.2)) + 2);
      for (let y = top; y < Math.min(H, bot); y++) {
        const k = (y - top) / Math.max(1, bot - top);
        let col = k < 0.12 ? PC.W4 : k < 0.3 ? PC.W3 : k < 0.62 ? PC.W2 : k < 0.85 ? PC.W1 : PC.W0;
        if ((y - top) % 5 === 4) col = PC.W0;
        if (prr() < 0.07) col = prr() < 0.5 ? PC.W0 : PC.W3;
        R_(g, col, x, y, 1, 1);
      }
    }
    for (let i = 0; i < 18; i++) R_(g, PC.M1, 6 + prr() * 80, 16 + prr() * 12, 3, 1);
    for (const x of [14, 34, 58, 78]) { const u = (x - 45.5) / 46, top = 12 - Math.round(7 * u * u * u * u + 5 * u * u); R_(g, PC.W0, x, top + 1, 2, 5); }
    R_(g, PC.A2, 3, 2, 2, 2);
    PROP.boat = c; }
  // ---------- dead tree (upright, pivot = bottom centre) ----------
  { const W = 72, H = 286, [c, g] = mkCv(W, H), cx = 36;
    for (let y = 0; y < H; y++) {
      const fl = y > H - 24 ? (y - (H - 24)) * 0.9 : 0, hw = 12 + fl;
      for (let x = Math.round(cx - hw); x < Math.round(cx + hw); x++) {
        const k = (x - (cx - hw)) / (hw * 2);
        let col = k < 0.18 ? PC.W3 : k < 0.5 ? PC.W2 : k < 0.8 ? PC.W1 : PC.W0;
        if ((x + ((y / 40) | 0) * 3) % 5 === 0) col = k < 0.5 ? PC.W1 : PC.W0;
        const n = prr(); if (n < 0.05) col = PC.W0; else if (n < 0.08) col = PC.S1;
        R_(g, col, x, y, 1, 1);
      }
    }
    for (let i = 0; i < 70; i++) { const y = prr() * (H - 10), x = cx - 11 + prr() * 22; R_(g, prr() < 0.6 ? PC.M1 : PC.S0, x, y, 2 + prr() * 3, 1 + prr() * 2); }
    for (let i = 0; i < 14; i++) { const y = 12 + prr() * (H - 60), x = cx - 8 + prr() * 16; R_(g, PC.INK, x, y, 1, 4 + prr() * 8); }
    const branch = (y, dir, len, th) => { for (let i = 0; i < len; i++) { const bx = cx + dir * (10 + i), by = y - i * 0.55 - (i * i) / (len * 5); const t = Math.max(1, th - (i / len) * th); R_(g, PC.W1, bx, by, 1, t); R_(g, PC.W2, bx, by, 1, 1); } };
    branch(64, -1, 26, 5); branch(48, 1, 22, 4); branch(132, 1, 24, 5); branch(176, -1, 20, 4); branch(224, 1, 16, 3);
    for (const [y, d] of [[60, -1], [128, 1]]) for (let i = 0; i < 5; i++) R_(g, PC.M1, cx + d * (14 + i * 4), y + 2 + i, 1, 6 + (i % 2) * 3);
    for (let i = 0; i < 3; i++) { R_(g, PC.W1, cx - 18 + i * 17, H - 8, 3, 8); } // root toes
    PROP.tree = c; }
  // ---------- floating snag (tangle of dead branches) ----------
  { const [c, g] = mkCv(40, 28);
    for (let i = 0; i < 16; i++) { const x0 = 4 + prr() * 32, y0 = 24, a = -Math.PI / 2 + (prr() - 0.5) * 2.2, L = 8 + prr() * 15; for (let k = 0; k < L; k++) R_(g, prr() < 0.3 ? PC.W1 : PC.W0, x0 + Math.cos(a) * k, y0 + Math.sin(a) * k, 2, 2); }
    for (let i = 0; i < 24; i++) R_(g, prr() < 0.5 ? PC.W2 : PC.M1, 5 + prr() * 30, 10 + prr() * 14, 2, 1);
    for (let i = 0; i < 6; i++) R_(g, PC.INK, 4 + prr() * 32, 12 + prr() * 12, 2, 2);
    PROP.snag = c; }
  // ---------- gate bars ----------
  { const [c, g] = mkCv(14, 126);
    for (const x of [0, 4, 8, 12]) { R_(g, PC.W1, x, 0, 2, 118); R_(g, PC.W3, x, 0, 1, 118); for (let y = 118; y < 126; y++) R_(g, PC.W0, x, y, y > 121 ? 1 : 2, 1); }
    for (const y of [22, 58, 94]) { R_(g, PC.W0, 0, y, 14, 3); R_(g, PC.W2, 0, y, 14, 1); }
    PROP.gate = c; }
}
/* painted sprites replace the placeholders above */
function useSprites() {
  PROP.cart = IMG.cart; PROP.boat = IMG.boat; PROP.tree = IMG.tree; PROP.snag = IMG.snag; PROP.gate = IMG.gate;
  PROP.wheel = [];
  for (let f = 0; f < 16; f++) {
    const [c, g] = mkCv(26, 26); g.translate(13, 13); g.rotate(f / 16 * Math.PI * 2); g.drawImage(IMG.wheel, -13, -13); PROP.wheel.push(c);
  }
}

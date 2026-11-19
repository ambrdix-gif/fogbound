
/* ---------- lighting ---------- */
const lightBuf = new Float32Array(VW * VH), vign = new Float32Array(VW * VH);
for (let y = 0; y < VH; y++) for (let x = 0; x < VW; x++) {
  const dx = (x - VW / 2) / (VW / 2), dy = (y - VH / 2) / (VH / 2);
  vign[y * VW + x] = Math.min(0.3, dx * dx * 0.16 + dy * dy * 0.14);
}
const lc = document.createElement('canvas'); lc.width = VW; lc.height = VH;
const lg = lc.getContext('2d'); const lImg = lg.createImageData(VW, VH); const l32 = new Uint32Array(lImg.data.buffer);
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16);
const px = (r, g, b, a) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
const DARK = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => i === 0 ? 0 : px(3, 9, 8, Math.round(i / 8 * 235)));
const AMBER = px(255, 150, 50, 34);
function addLight(cx, cy, R, k) {
  const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(VW, Math.ceil(cx + R));
  const y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(VH, Math.ceil(cy + R));
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const ddx = x - cx, ddy = y - cy, d = Math.sqrt(ddx * ddx + ddy * ddy) / R; if (d >= 1) continue;
    let v = 1 - d; v = v * v * (3 - 2 * v) * k;
    const i = y * VW + x; if (v > lightBuf[i]) lightBuf[i] = v;
  }
}
function renderLight(cam) {
  lightBuf.fill(0);
  const p = S.p, lp = lanternWorld();
  const flick = 1 + Math.sin(S.t * 9) * 0.025 + Math.sin(S.t * 23.7) * 0.015;
  let R = (20 + 104 * p.litK) * flick * Math.min(1, S.lightT) * (p.climb ? 0.62 : 1);
  if (p.dead) R *= Math.max(0, 1 - S.deadT * 0.9) * 0.5;
  if (S.death && S.death.kind === 'water') R = 0;
  if (S.death && S.death.kind === 'eaten') R *= 0.3;
  if (S.dark > 0) R *= 0.35;
  if (R > 1) addLight(lp.x - cam, lp.y, R, 1);
  for (const tx of TORCHES) if (Math.abs(tx - cam - VW / 2) < VW / 2 + 80) addLight(tx - cam, GY - 30, 62 + Math.sin(S.t * 8 + tx) * 3, 0.95);
  if (STALK && (S.stalk.st === 'approach' || S.stalk.st === 'look' || S.stalk.st === 'leave')) addLight(S.stalk.x - cam, GY - 110 - S.stalk.look * 30, 34 + S.stalk.look * 60, 0.35 + 0.35 * S.stalk.look); if (STALK && (S.stalk.st === 'approach' || S.stalk.st === 'look' || S.stalk.st === 'leave')) addLight(S.stalk.x - cam, GY - 50, 96, 0.85);
  if (LOGB && S.logb.burn > 0 && S.logb.state === 0) addLight(LOGB.rope.x + 17 - cam, LOGB.rope.y + 24, 40, 0.8);
  for (const t of S.thorns) if (t.st === 1) addLight(t.x - cam, t.y - 24, 58, 0.9);
  if (EEL && (S.eel.st === 'hunt' || S.eel.st === 'circle')) addLight(S.eel.x + S.eel.dir * 4 - cam, GY + 14, 30, 0.55);
  if (S.flameLight > 0 && !p.dead) addLight(lp.x - cam, lp.y, 60 + 90 * (S.flameLight / 0.3), 1);
  S.lamps.forEach(l => { if (l.lit) addLight(l.x - cam, l.y - 22, 70 + Math.sin(S.t * 7 + l.x) * 2, 0.9); });
  S.huts.forEach(h => { if (!h.looted && Math.abs(h.x - cam - VW / 2) < VW / 2 + 90) addLight(h.x - cam, h.y - 40, 66 + Math.sin(S.t * 5 + h.x) * 2, 0.9); });
  { const sp = S.spider; if (SPIDER && sp.st !== 'off' && sp.st !== 'lurk') addLight(sp.x - cam, sp.y, 70, 0.75); for (const w of S.webs) if (w.st === 1) addLight(w.x - cam, w.y - 36, 60, 0.9); }
  ch5Light(cam);
  if (S.plate.down) addLight(S.plate.x - cam, GY - 4, 26, 0.5);
  S.snags.forEach(g => { if (g.st === 1) addLight(g.x - cam, GY - 4, 44, 0.9); });
  if (S.tree.state === 0 && S.tree.burn > 0.02) addLight(ROPE.x + 20 - cam, ROPE.y + 30, 40, 0.9);
  S.mos.forEach(m => { if (m.burn > 0) addLight(m.x - cam, m.y, 40, 0.95); });
  const cr = S.cr;
  if (cr && cr.act && cr.st !== 'frozen') {
    const k = cr.alpha, E = crPt(149, 30), hot = cr.st === 'tele' || cr.st === 'spit' || cr.st === 'grab' || cr.flare > 0;
    addLight(cr.cx - cam - 12, 175, 150, (0.2 + 0.32 * S.intensity + (hot ? 0.15 : 0)) * k);
    addLight(E.x - cam, E.y, 64, (0.5 + (hot ? 0.3 : 0.1)) * k);
  }
  S.spits.forEach(s => addLight(s.x - cam, s.y, 28, 0.65));
  S.puddles.forEach(q => addLight(q.x - cam, q.y - 3, 32, 0.4 * Math.min(1, q.t / 0.8)));
  if (cr && cr.act && cr.st === 'tele' && cr.t > 0.1) addLight(cr.tx - cam, cr.sy - 3, 34, 0.45);
  const base = 0.44 + 0.14 * S.intensity + (S.dark > 0 ? 0.3 * Math.min(1, S.dark * 2) : 0);
  for (let y = 0; y < VH; y++) {
    const by = (y & 3) * 4;
    for (let x = 0; x < VW; x++) {
      const i = y * VW + x, L = lightBuf[i], thr = B4[by + (x & 3)];
      const dark = (base + vign[i]) * (1 - L * 0.94);
      const lvl = Math.floor(dark * 8 + thr);
      const tint = (L - 0.45) * 0.8;
      if (tint > 0 && Math.floor(tint * 4 + thr) >= 1) l32[i] = AMBER;
      else l32[i] = DARK[Math.max(0, Math.min(8, lvl))];
    }
  }
  lg.putImageData(lImg, 0, 0);
  ctx.drawImage(lc, 0, 0);
}

/* ---------- fog + fireflies ---------- */
function makeFog(w, h, seed) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), id = g.createImageData(w, h), d = new Uint32Array(id.data.buffer);
  const T = 2 * Math.PI / w;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = (Math.sin(x * T * 2 + seed) + Math.sin(x * T * 3 + y * 0.09 + seed * 2) * 0.7 + Math.sin(x * T * 5 - y * 0.15 + seed * 3) * 0.4) / 2.1;
    const env = Math.sin(Math.PI * y / h);
    const v = (n * 0.5 + 0.5) * env;
    const lvl = Math.floor(Math.max(0, (v - 0.28)) * 7 + B4[(y & 3) * 4 + (x & 3)]);
    const a = [0, 26, 52, 80][Math.max(0, Math.min(3, lvl))];
    d[y * w + x] = a ? px(150, 182, 166, a) : 0;
  }
  g.putImageData(id, 0, 0); return c;
}
let FOG1, FOG2;
function drawFog(c, speed, y, a, par) {
  const w = c.width, off = ((S.t * speed + S.camR * par) % w + w) % w;
  ctx.globalAlpha = a;
  for (let x = -off; x < VW; x += w) ctx.drawImage(c, Math.round(x), y);
  ctx.globalAlpha = 1;
}
let seed = 7; const srnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const FF = []; for (let i = 0; i < 34; i++) FF.push({ x: srnd() * 700, y: 110 + srnd() * 200, ph: srnd() * 6.28, sp: 0.3 + srnd() * 0.7, r: 5 + srnd() * 14 });
function drawFireflies() {
  for (const f of FF) {
    const sx = (((f.x - S.camR * 0.85) % 700) + 700) % 700 - 30, sy = f.y + Math.sin(S.t * f.sp + f.ph) * f.r;
    const b = Math.sin(S.t * 1.6 * f.sp + f.ph * 2);
    if (b < -0.1) continue;
    ctx.globalAlpha = 0.22 * (0.5 + b * 0.5); ctx.fillStyle = '#ffb347'; ctx.fillRect(Math.round(sx) - 1, Math.round(sy) - 1, 3, 3);
    ctx.globalAlpha = 1; ctx.fillStyle = '#ffd98a'; ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
  }
}

/* ---------- render: world ---------- */
const WOOD = '#3a3322', WOOD2 = '#242014';
function sprite(name, x, y) { const im = IMG[name]; if (im) ctx.drawImage(im, Math.round(x), Math.round(y)); }
function drawWorld(cam) {
  const G = IMG.ground, gm = META.ground;
  drawWater(cam);
  grounds.forEach(g => {
    if (g[1] - cam < 0 || g[0] - cam > VW) return;
    ctx.save(); ctx.beginPath(); ctx.rect(g[0] - cam, 0, g[1] - g[0], VH); ctx.clip();
    for (let x = g[0] - 2; x < g[1]; x += 60) { if (x - cam > VW) break; if (x - cam > -70) ctx.drawImage(G, Math.round(x - cam), GY - gm.surf); }
    ctx.restore();
  });
  pits.forEach(pt => { for (let x = pt[0] - 1; x < pt[1] - 20; x += 62) sprite('spikes', x - cam, GY - META.spikes.surf + 5); });
  const PL = IMG.plank, pm = META.plank;
  piers.forEach(pr => {
    ctx.fillStyle = WOOD2;
    for (let x = pr[0] + 10; x < pr[1] - 4; x += 72) ctx.fillRect(Math.round(x - cam), PIER_Y + 20, 4, WATER_Y - PIER_Y - 14);
    ctx.save(); ctx.beginPath(); ctx.rect(pr[0] - cam, 0, pr[1] - pr[0], VH); ctx.clip();
    for (let x = pr[0] - 2; x < pr[1]; x += 50) ctx.drawImage(PL, Math.round(x - cam), PIER_Y - pm.surf);
    ctx.restore();
  });
  ctx.fillStyle = WOOD2;
  [8, 56, 106].forEach(o => ctx.fillRect(Math.round(PLAT.x + o - cam), PLAT.y + 58, 4, GY + 30 - PLAT.y - 58));
  sprite('stilt', PLAT.x - cam, PLAT.y - META.stilt.surf);
  KENT.forEach(kx => sprite('kentongan', kx - cam, GY - META.kentongan.h + 2));
  drawPoolBeds(cam); drawMud(cam); drawSwampProps(cam); drawForest(cam); drawSlopes(cam); drawThrone(cam);
  S.huts.forEach(h => { if (h.shrine) { const m = META['shrine_' + h.need]; ctx.drawImage(IMG['shrine_' + h.need], Math.round(h.x - cam - m.ax), Math.round(h.y - m.ay)); if (!h.looted) { ctx.globalAlpha = 0.55 + 0.25 * Math.sin(S.t * 3 + h.x); ctx.fillStyle = SHRINE_COL[h.need]; ctx.fillRect(Math.round(h.x - cam) - 1, h.y - m.ay - 6, 2, 4); ctx.globalAlpha = 1; } } else sprite(h.looted ? 'hut_off' : 'hut_on', h.x - 61 - cam, h.y - 91); });
  drawTree(cam);
  S.lamps.forEach(l => sprite(l.lit ? 'lamp' : 'lamp_off', l.x - 9 - cam, l.y - META.lamp.h + 1));
  traps.forEach(t => sprite('trap', t.x - 25 - cam, t.y - META.trap.h + 3));
  sprite('crate', S.crate.x - 15.5 - cam, GY - META.crate.h + 1);
  drawPlate(cam); drawCart(cam); drawGate(cam);
  S.snags.forEach(g => drawSnag(g, cam));
  drawBoat(cam);
  saws.forEach((s, si) => {
    const sp = sawPos(si, S.t);
    ctx.fillStyle = WOOD; ctx.fillRect(Math.round(s.px - cam) - 14, SAW.py - 5, 28, 5);
    ctx.fillStyle = '#4a4636';
    for (let y = SAW.py; y < sp.y; y += 4) ctx.fillRect(Math.round(sp.x - cam) - 1, y, 2, 3);
    ctx.save(); ctx.translate(Math.round(sp.x - cam), Math.round(sp.y)); ctx.rotate(S.t * (si ? -9 : 9));
    ctx.drawImage(IMG.saw, -IMG.saw.width / 2, -IMG.saw.height / 2); ctx.restore();
  });
  drawEel(cam, false);
  drawPlayer(cam);
  drawHides(cam);
  drawPoolWater(cam);
  drawEel(cam, true);
  drawBoatFront(cam);
  S.mos.forEach(m => drawMos(m, cam));
  drawSpits(cam);
  for (const q of S.parts) { ctx.globalAlpha = Math.min(1, q.life * 3); ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x - cam), Math.round(q.y), q.sz, q.sz); }
  ctx.globalAlpha = 1;
  drawReeds(cam);
}
/* ---- chapter 2: pools, mud, torches, sluice, the thing under the water ---- */
function drawValley(cam) {            // far valley walls closing in on both sides
  const sc = cam * 0.13;
  for (let x = 0; x < VW; x += 4) {
    const wx = x + sc, h1 = 96 + Math.sin(wx * 0.0052) * 46 + Math.sin(wx * 0.017 + 2) * 16 + Math.sin(wx * 0.049) * 5;
    ctx.fillStyle = '#0f2a2b'; ctx.globalAlpha = 0.5; ctx.fillRect(x, Math.round(h1), 4, 250 - Math.round(h1));
    const wx2 = x + cam * 0.2 + 900, h2 = 150 + Math.sin(wx2 * 0.0071) * 40 + Math.sin(wx2 * 0.023 + 1) * 12;
    ctx.fillStyle = '#0a1f20'; ctx.globalAlpha = 0.55; ctx.fillRect(x, Math.round(h2), 4, 260 - Math.round(h2));
  }
  ctx.globalAlpha = 1;
}
function drawPoolBeds(cam) {
  const G = IMG.ground, gm = META.ground;
  for (const q of POOLS) {
    if (q.x1 - cam < -4 || q.x0 - cam > VW + 4) continue;
    const a = Math.max(q.x0, Math.floor(cam / 2) * 2), b = Math.min(q.x1, cam + VW + 2);
    for (let x = a; x < b; x += 2) {
      const d = dipAt(q, x + 1), y = Math.round(GY + d), sx = Math.round(x - cam);
      const tx = (((x - q.x0 + 2) % 60) + 60) % 60;      // the same turf as the banks, bent down into the dip
      ctx.drawImage(G, tx, 0, 2, G.height, sx, y - gm.surf, 2, G.height);
      if (q.hill) { const bot = y - gm.surf + G.height - 2; ctx.fillStyle = '#122624'; ctx.fillRect(sx, bot, 2, GY + 20 - bot); if (((x * 13) % 97) < 3) { ctx.fillStyle = '#1b3330'; ctx.fillRect(sx, bot + 6 + (x * 7) % 40, 2, 3); } }
    }
    for (const rx of q.rocks) { const bx = Math.round(rx - cam); if (bx > -40 && bx < VW + 40) ctx.drawImage(IMG.boulder, bx - 30, GY - 8); }      // boulders standing out of the water
  }
}
function drawPoolWater(cam) {
  const p = S.p;
  for (const q of POOLS) {
    if (q.x1 - cam < -4 || q.x0 - cam > VW + 4) continue;
    const sy = Math.round(surfY(q)), a = Math.max(q.x0, Math.floor(cam / 2) * 2), b = Math.min(q.x1, cam + VW + 2);
    let run = null; const runs = [];
    for (let x = a; x < b; x += 2) { const dd = dipAt(q, x + 1), wet = !q.hill && (GY + dd > sy + 0.5 || (dd < -1 && sy < GY + 12 && x > q.x0 + 40 && x < q.x1 - 40)); if (wet) { if (!run) run = [x, x + 2]; else run[1] = x + 2; } else if (run) { runs.push(run); run = null; } }
    if (run) runs.push(run);
    for (const r of runs) {
      const x0 = Math.round(r[0] - cam), w = r[1] - r[0];
      ctx.globalAlpha = 0.46; ctx.fillStyle = '#1d5953'; ctx.fillRect(x0, sy, w, VH - sy);
      ctx.globalAlpha = 0.2; ctx.fillStyle = '#04100f'; ctx.fillRect(x0, sy + 16, w, VH - sy - 16);
      ctx.globalAlpha = 0.9; ctx.fillStyle = '#7fb3a6'; ctx.fillRect(x0, sy, w, 1); ctx.globalAlpha = 0.45; ctx.fillStyle = '#3f7a70'; ctx.fillRect(x0, sy + 1, w, 2);
      ctx.globalAlpha = 0.55; ctx.fillStyle = '#8ab8ac';
      for (let k = 0; k < 3; k++) { const sp = 9 + k * 6, off = (((S.t * sp * (k % 2 ? 1 : -1) + k * 31) % 52) + 52) % 52;
        for (let x = r[0] - 52 + off + ((r[0] / 52) | 0) * 0; x < r[1]; x += 52) { const xx = Math.max(r[0], x), ww = Math.min(r[1], x + 9 + k * 3) - xx; if (ww > 0) ctx.fillRect(Math.round(xx - cam), sy + 1 + k * 3, ww, 1); } }
      if (q.leech) { ctx.globalAlpha = 0.7; ctx.fillStyle = '#0a0606'; for (let x = r[0] + 9; x < r[1] - 4; x += 23) { const ph = S.t * 3 + x; ctx.fillRect(Math.round(x + Math.sin(ph) * 5 - cam), sy + 5 + ((x * 3) % 9) + Math.round(Math.sin(ph * 1.3)), 3, 1); } }
      ctx.globalAlpha = 1;
    }
    if (p && !p.dead && p.wet > 2 && p.x >= q.x0 && p.x <= q.x1) {       // ripples around the legs
      const cx = Math.round(p.x - cam), mv = Math.abs(p.vx) > 8;
      ctx.fillStyle = '#c9e4da';
      for (let k = 0; k < 2; k++) { const ph = (S.t * (mv ? 1.6 : 0.6) + k * 0.5) % 1, rr = 5 + ph * (mv ? 16 : 9); ctx.globalAlpha = 0.6 * (1 - ph); ctx.fillRect(cx - Math.round(rr), sy, 3, 1); ctx.fillRect(cx + Math.round(rr) - 3, sy, 3, 1); }
      ctx.globalAlpha = 1;
    }
    if (q.drain) {                                        // sluice gate at the far end of the pool
      const gx = Math.round(q.x1 - 22 - cam), k = S.sluice.k;
      ctx.drawImage(IMG.sluice_board, gx + 7, GY - 30 + 11 - Math.round(k * 13)); ctx.drawImage(IMG.sluice_frame, gx, GY - 30);
    }
  }
}
function drawMud(cam) {
  for (const m of MUDS) {
    const x0 = Math.round(m[0] - cam), w = m[1] - m[0]; if (x0 > VW || x0 + w < 0) continue;
    R_(ctx, '#241a12', x0, GY - 1, w, 12); R_(ctx, '#3a2d20', x0 + 2, GY - 2, w - 4, 2); R_(ctx, '#17100b', x0, GY + 7, w, 5);
    for (let x = m[0] + 6; x < m[1] - 6; x += 17) { const ph = (S.t * 0.7 + x * 0.37) % 1; if (ph < 0.6) { const r = 1 + Math.round(ph * 3); R_(ctx, '#4d3d2a', x - r - cam, GY - 2 - (ph > 0.45 ? 1 : 0), r * 2, 1); } }
    for (let x = m[0] + 12; x < m[1] - 8; x += 31) R_(ctx, '#4d3d2a', x - cam, GY + 2 + ((x * 5) % 4), 5, 1);
  }
}
function drawSwampProps(cam) {
  for (const tx of TORCHES) {
    const x = Math.round(tx - cam); if (x < -30 || x > VW + 30) continue;
    ctx.drawImage(IMG.torch, x - 8, GY - 36);
    const f = Math.floor(S.t * 9 + tx) % 3;                                  // the painted flame flickers
    R_(ctx, '#f08a2a', x - 2 + (f - 1), GY - 39 - f, 3, 3); R_(ctx, '#ffd36a', x - 1, GY - 37 - (f ? 1 : 0), 2, 3);
  }
  for (const q of POSTS) {
    const x = Math.round(q.x - cam); if (x > VW + 40 || x + q.w < -40) continue;
    if (q.plat) ctx.drawImage(IMG.lookout, x - 2, q.y - 22);
    else if (q.h > 50) ctx.drawImage(IMG.stump_hi, x + (q.w >> 1) - 26, q.y - 3);
    else ctx.drawImage(IMG.stump_lo, x + (q.w >> 1) - 17, q.y - 3);
  }
  if (LEVER) {
    const x = Math.round(LEVER.x - cam);
    if (x > -30 && x < VW + 30) ctx.drawImage(S.sluice.pulled ? MIR.lever : IMG.lever, x - 13, LEVER.y - 25);
  }
}
function drawEel(cam, top) {
  const e = S.eel; if (!EEL || (e.st !== 'hunt' && e.st !== 'circle' && e.st !== 'flee')) return;
  const q = POOLS.find(o => o.eel); if (!q) return;
  const sy = surfY(q), hx = e.x - cam, d = e.dir;
  if (hx < -160 || hx > VW + 160) return;
  if (e.st === 'flee' && (e.x <= EEL.x0 + 16 || e.x >= EEL.x1 - 16)) return;      // dived out of sight
  if (!top) {
    for (let i = 15; i >= 0; i--) {                       // long body snaking just under the surface
      const x = hx - d * (6 + i * 7), y = sy + 10 + Math.sin(e.wig * 7 - i * 0.7) * 3, r = Math.max(1.5, 4.5 - i * 0.2);
      ctx.fillStyle = i % 3 ? '#050d0c' : '#0c1a17'; ctx.fillRect(Math.round(x - 4), Math.round(y - r), 8, Math.round(r * 2));
      if (i % 4 === 1) { ctx.fillStyle = '#050d0c'; ctx.fillRect(Math.round(x - 1), Math.round(y - r - 3), 3, 3); }    // dorsal spines
    }
    ctx.fillStyle = '#050d0c'; ctx.fillRect(Math.round(hx - (d > 0 ? 8 : 4)), Math.round(sy + 6), 12, 8); ctx.fillRect(Math.round(hx + (d > 0 ? 4 : -9)), Math.round(sy + 8), 5, 5);
  } else {
    const f = e.st === 'flee' ? 0.5 : 1;
    ctx.fillStyle = '#ffb347'; ctx.globalAlpha = f; ctx.fillRect(Math.round(hx + d * 4), Math.round(sy + 8), 2, 2); ctx.fillRect(Math.round(hx), Math.round(sy + 8), 2, 2);
    ctx.fillStyle = '#c9e4da';                           // V-shaped wake on the surface
    for (let i = 0; i < 8; i++) { ctx.globalAlpha = 0.85 * f * (1 - i / 8); ctx.fillRect(Math.round(hx - d * (i * 9) - 3), Math.round(sy) - (i < 2 ? 1 : 0), 7 - (i > 4 ? 3 : 0), i < 2 ? 2 : 1); }
    ctx.globalAlpha = 1;
  }
}
/* ---- chapter 3: trunks, branches, thorns, swing, hanging log, the stalker; plus the ropes down from high places in every chapter ---- */
function tileH(img, x, y, w) { for (let o = 0; o < w; o += img.width) { const ww = Math.min(img.width, w - o); ctx.drawImage(img, 0, 0, ww, img.height, Math.round(x + o), Math.round(y), ww, img.height); } }
function tileV(img, x, y, h) { for (let o = 0; o < h; o += img.height) { const hh = Math.min(img.height, h - o); ctx.drawImage(img, 0, 0, img.width, hh, Math.round(x), Math.round(y + o), img.width, hh); } }
function drawForest(cam) {
  if (!CLIMBS.length && !BRANCHES.length) return;
  const on = (x, w) => x - cam < VW + 60 && x + w - cam > -60;
  for (const h of HIDES) if (on(h.x - 14, h.w + 28)) { ctx.globalAlpha = 0.8; ctx.drawImage(tinted('clump', '#0b1716'), Math.round(h.x + h.w / 2 - cam) - 42, h.y - 39); ctx.globalAlpha = 1; }     // the dark back of each hiding clump
  for (const tk of THICKETS) if (on(tk[0], tk[1] - tk[0])) { const a = Math.max(tk[0], tk[0] + Math.floor((cam - 120 - tk[0]) / 114) * 114), b = Math.min(tk[1], cam + VW + 120); if (b > a) tileH(IMG.thicket, a - cam, GY - 16, b - a); }
  for (const w of WALLS) if (on(w.x, w.w)) ctx.drawImage(IMG.rootwall, Math.round(w.x - cam) - 2, w.y);
  for (const k of CLIMBS) {
    const x = Math.round(k.x - cam);
    if (k.rope) {                                // a knotted rope hanging from the edge of a high place
      if (!on(k.x - 20, 40)) continue;
      R_(ctx, '#3a3322', x - k.side * 12 - 2, k.y1 - 7, 4, 8); R_(ctx, '#7e6643', x - k.side * 12 - 1, k.y1 - 7, 2, 2);
      for (let i = 0; i <= 5; i++) R_(ctx, i % 2 ? '#5b5032' : '#8b7355', x - k.side * (12 - i * 2.4) - 1, k.y1 - 5 + (i > 3 ? 1 : 0), 3, 2);
      tileV(IMG.ropev, x - 4, k.y1 - 4, k.y0 - k.y1 - 8); R_(ctx, '#8b7355', x - 2, k.y0 - 13, 5, 4); R_(ctx, '#5b5032', x - 1, k.y0 - 9, 1, 4); R_(ctx, '#5b5032', x + 1, k.y0 - 9, 1, 3);
      continue;
    }
    if (!on(k.x - 45, 90)) continue;             // climbable trunks: the dead-tree art, with a pale vine that marks where hands can grip
    const T = IMG.tree, cut = k.y0 < GY ? 42 : 0;
    ctx.drawImage(T, 0, 0, T.width, T.height - cut, x - (T.width >> 1), k.y0 + 8 - (T.height - cut), T.width, T.height - cut);
    for (let y = k.y0 - 6; y > k.y1 - 4; y -= 4) { const o = Math.round(Math.sin(y * 0.17 + k.x) * 5); R_(ctx, ((y >> 2) % 3) ? '#7fa08c' : '#a9c4b0', x + o - 1, y, 2, 4); if ((y >> 2) % 5 === 0) R_(ctx, '#7fa08c', x + o + 1, y + 1, 3, 1); }
  }
  if (LOGB && on(LOGB.x, LOGB.w)) {              // hanging log / fallen bridge
    const x = Math.round(LOGB.x - cam), L = S.logb, y = Math.round(L.y);
    if (L.state === 0) { for (const rx of [LOGB.x + 30, LOGB.x + LOGB.w - 30]) tileV(IMG.ropev, Math.round(rx - cam) - 4, LOGB.rope.y + 44, y - LOGB.rope.y - 48); }
    R_(ctx, '#2d241d', x - 6, y - 6, LOGB.w + 12, 18); R_(ctx, '#49362e', x - 6, y - 6, LOGB.w + 12, 4); R_(ctx, '#7e6643', x - 4, y - 6, LOGB.w + 8, 1); R_(ctx, '#1e1813', x - 6, y + 8, LOGB.w + 12, 4);
    for (let i = 8; i < LOGB.w; i += 22) { R_(ctx, '#1e1813', x + i, y - 2, 9, 1); R_(ctx, '#4a5d3a', x + i + 6, y - 6, 7, 2); }
    R_(ctx, '#5b5032', x - 8, y - 4, 3, 14); R_(ctx, '#5b5032', x + LOGB.w + 5, y - 4, 3, 14);
    if (L.state === 0) { const r = LOGB.rope, rx = Math.round(r.x + r.w / 2 - cam) + (L.burn > 0 ? Math.round(Math.sin(S.t * 40)) : 0); tileV(IMG.ropev, rx - 4, r.y + 4, r.h - 8); R_(ctx, '#c9a24a', rx - 4, r.y + r.h - 8, 9, 5); }
  }
  for (const b of BRANCHES) if (!b.brittle && on(b.x, b.w)) {
    const x = Math.round(b.x - cam); tileH(IMG.branch, x - 4, b.y - 2, b.w + 8);
    ctx.drawImage(IMG.clump_s, x - 12, b.y - 7); if (b.w > 100) ctx.drawImage(IMG.clump_s, x + b.w - 38, b.y - 7);
  }
  for (const b of S.branches) if (!b.gone && on(b.x, b.w)) { const sh = b.t >= 0 ? Math.round(Math.sin(S.t * 60) * 1.5) : 0; tileH(IMG.twig, Math.round(b.x - cam) - 2 + sh, b.y - 1 + (b.t >= 0 ? 1 : 0), b.w + 4); }
  for (const sw of SWINGS) if (on(sw.ax - 160, 320)) {           // swinging root
    const e = swingEnd(sw, S.t), ax = Math.round(sw.ax - cam), ang = Math.atan2(e.x - sw.ax, e.y - sw.ay);
    tileH(IMG.branch, ax - 150, sw.ay - 12, 300);
    ctx.save(); ctx.translate(ax, sw.ay - 2); ctx.rotate(-ang); ctx.drawImage(IMG.vine, -(IMG.vine.width >> 1), 0); ctx.restore();
  }
  S.thorns.forEach((t, i) => {
    if (!on(t.x - 30, 60)) return; const x = Math.round(t.x - cam);
    if (t.st === 2) { R_(ctx, '#17100b', x - 16, t.y - 3, 32, 3); R_(ctx, '#2d241d', x - 9, t.y - 6, 4, 4); R_(ctx, '#2d241d', x + 5, t.y - 5, 3, 3); return; }
    ctx.drawImage(IMG.thorn, x - (IMG.thorn.width >> 1), t.y - IMG.thorn.height + 1);
    if (t.st === 1) for (let k = 0; k < 10; k++) { const fx = x - 20 + k * 4 + Math.sin(S.t * 18 + k) * 1.5, fh = 8 + ((S.t * 16 + k * 5) % 14); ctx.fillStyle = ['#d9481f', '#f08a2a', '#ffd36a'][k % 3]; ctx.fillRect(Math.round(fx), Math.round(t.y - 16 - fh), 3, Math.round(fh)); }
  });
  drawStalk(cam);
}
function drawHides(cam) {              // leafy clumps are drawn over the player: that is what hides him
  for (const h of HIDES) { const x = Math.round(h.x + h.w / 2 - cam); if (x > VW + 60 || x < -60) continue; ctx.drawImage(IMG.clump, x - 42, h.y - 33); }
}
function stalkPose(e) {                 // everything that moves on the stalker, from its state
  const walking = e.st === 'approach' || e.st === 'leave', ph = e.walk * 6, t = S.t, look = e.look;
  const s = Math.sin(ph), c = Math.cos(ph), idle = Math.sin(t * 1.4);
  const scan = Math.sin(t * 1.9) + 0.35 * Math.sin(t * 5.3);                         // slow sweep with small jerks on top
  return {
    bob: walking ? Math.abs(s) * 3 : idle * 0.8, lean: walking ? 0.08 : 0.02 * idle,
    legL: walking ? s * 0.42 : 0.03 * idle, legR: walking ? -s * 0.42 : -0.03 * idle,
    liftL: walking ? Math.max(0, c) * 4 : 0, liftR: walking ? Math.max(0, -c) * 4 : 0,
    armL: walking ? -s * 0.32 + 0.05 : 0.1 * Math.sin(t * 1.1) + look * 0.25 * Math.sin(t * 3.1), armR: walking ? s * 0.32 - 0.05 : -0.1 * Math.sin(t * 1.3 + 1) - look * 0.2 * Math.sin(t * 2.7),
    neckLen: 16 + Math.round(look * 34), neckAng: walking ? s * 0.07 : look * 0.16 * Math.sin(t * 1.9 - 0.7),
    skullAng: walking ? 0.25 + c * 0.12 : (1 - look) * 0.25 + look * (-0.15 + 0.38 * scan),
    flip: look > 0.6 && Math.sin(t * 1.05) < -0.25 ? -1 : 1                         // every so often it snaps its head round to check the other side
  };
}
function drawStalk(cam) {
  const e = S.stalk; if (!STALK || e.st === 'off' || e.st === 'done' || e.st === 'wait') return;
  const x = Math.round(e.x - cam); if (x < -120 || x > VW + 120) return;
  const d = e.st === 'leave' ? -e.side : e.dir, q = stalkPose(e), OX = -28, OY = -92;
  const part = (name, ang, dx, dy) => { const m = META[name]; ctx.save(); ctx.translate(OX + m.ox + m.px + (dx || 0), OY + m.oy + m.py + (dy || 0)); ctx.rotate(ang); ctx.drawImage(IMG[name], -Math.round(m.px), -Math.round(m.py)); ctx.restore(); };
  ctx.save(); ctx.translate(x, GY + 2 - Math.round(q.bob)); if (d < 0) ctx.scale(-1, 1); if (q.lean) ctx.transform(1, 0, -q.lean, 1, 0, 0);
  part('stalk_armL', q.armL); part('stalk_legL', q.legL, 0, Math.round(q.bob) - Math.round(q.liftL));
  const N = IMG.stalk_neck, nm = META.stalk_neck, K = IMG.stalk_skull, km = META.stalk_skull;
  ctx.save(); ctx.translate(0, OY + 6); ctx.rotate(q.neckAng);                        // the neck slides up out of the stump, the skull turns on top of it
  ctx.drawImage(N, 0, 0, N.width, q.neckLen, -Math.round(nm.cx), -q.neckLen, N.width, q.neckLen);
  ctx.translate(0, -q.neckLen + 2); ctx.scale(q.flip, 1); ctx.rotate(q.skullAng); ctx.drawImage(K, -Math.round(km.jx), -Math.round(km.jy));
  ctx.restore();
  part('stalk_torso', 0); part('stalk_legR', q.legR, 0, Math.round(q.bob) - Math.round(q.liftR)); part('stalk_armR', q.armR);
  ctx.restore();
  if (e.look > 0.2) {                                                                // its gaze follows the skull across the branches
    const ex = x + d * (q.flip * 8 + Math.sin(q.neckAng) * q.neckLen), ey = GY - 92 - q.neckLen - 8, dirx = d * q.flip, sw = (20 + q.skullAng * -70) * dirx;
    ctx.globalAlpha = 0.11 * e.look; ctx.fillStyle = '#ffb347';
    for (let i = 0; i < 12; i++) { const u = i / 12; ctx.fillRect(Math.round(ex + sw * u - 5 - u * 34), Math.round(ey - u * 84), Math.round(10 + u * 68), 8); }
    ctx.globalAlpha = 1;
  }
}
/* ---- new props / puzzle drawing ---- */
const WSURF = GY + 12;
function drawWater(cam) {
  for (const [a, b] of WATER_GAPS) {
    const x0 = Math.max(0, Math.round(a - cam)), x1 = Math.min(VW, Math.round(b - cam)); if (x1 <= x0) continue;
    const w = x1 - x0;
    ctx.fillStyle = '#112829'; ctx.fillRect(x0, WSURF, w, VH - WSURF);
    ctx.fillStyle = '#1d3e37'; ctx.fillRect(x0, WSURF, w, 10);
    ctx.fillStyle = '#15322f'; ctx.fillRect(x0, WSURF + 10, w, 14);
    ctx.fillStyle = '#091c20'; ctx.fillRect(x0, WSURF + 38, w, VH);
    for (let k = 0; k < 7; k++) {
      const y = WSURF + 2 + k * 6, sp = 14 + k * 5, off = (S.t * sp * (k % 2 ? 1 : -1) + k * 37) % 46;
      ctx.fillStyle = k < 2 ? '#406458' : '#2f5249'; ctx.globalAlpha = 0.65 - k * 0.07;
      for (let x = x0 - 46 + (((off % 46) + 46) % 46); x < x1; x += 46) { const xx = Math.max(x0, x), ww = Math.min(x1, x + 11 + (k % 3) * 4) - xx; if (ww > 0) ctx.fillRect(xx, y, ww, 1); }
    }
    ctx.globalAlpha = 1;
  }
}
function drawTree(cam) {
  const t = S.tree, px = Math.round(t.x - cam), py = GY - 12;
  if (px < -300 || px > VW + 300) return;
  // rope holding the tree back from the stake
  const sx = Math.round(ROPE.x + 4 - cam);
  R_(ctx, '#2d241d', sx - 1, GY - 26, 5, 26); R_(ctx, '#5e553f', sx, GY - 26, 2, 26); R_(ctx, '#7e6643', sx - 1, GY - 28, 5, 3);
  if (t.state === 0) {
    const tx = px - 12, ty = GY - 124, hot = t.burn > 0.02;
    for (let i = 0; i <= 28; i++) { const u = i / 28; R_(ctx, hot && Math.random() < t.burn * 1.6 ? '#ffd36a' : (i % 3 ? '#8a7048' : '#5e553f'), sx + 1 + (tx - sx - 1) * u, GY - 26 + (ty - GY + 26) * u + Math.sin(u * Math.PI) * 4, 2, 2); }
  } else { for (let i = 0; i < 9; i++) R_(ctx, '#5e553f', sx + 1 + Math.sin(i * 0.5) * 2, GY - 24 + i * 2.4, 2, 2); }
  ctx.save(); ctx.translate(px, py); ctx.rotate(t.state === 0 ? 0.05 : t.ang);
  ctx.drawImage(PROP.tree, -40, -286); ctx.restore();
}
function drawPlate(cam) {
  const pl = S.plate, x = Math.round(pl.x - 23 - cam);
  if (x > VW || x + 46 < 0) return;
  ctx.drawImage(IMG.plate, x, GY - 6 + (pl.down ? 2 : 0));
  if (pl.down) { ctx.globalAlpha = 0.6 + 0.3 * Math.sin(S.t * 6); R_(ctx, '#ffd98a', x + 17, GY - 2, 12, 1); ctx.globalAlpha = 1; }
  R_(ctx, '#272c2b', STOPPER.x - cam, STOPPER.y, STOPPER.w, STOPPER.h); R_(ctx, '#5e553f', STOPPER.x - cam + 1, STOPPER.y, STOPPER.w - 2, 3); R_(ctx, '#49362e', STOPPER.x - cam + 3, STOPPER.y + 3, 3, STOPPER.h - 3);
}
function drawCart(cam) {
  const c = S.cart, x = Math.round(c.x - cam);
  if (x < -110 || x > VW + 110) return;
  const rx = -31, f = ((Math.floor(c.wheel / 13 / (Math.PI * 2) * 16) % 16) + 16) % 16, base = Math.round(terrY(c.x));
  ctx.save(); ctx.translate(x, base); ctx.rotate(Math.atan(slopeAt(c.x)));              // it sits on the slope it is rolling down
  ctx.drawImage(PROP.wheel[(f + 5) % 16], rx + 3, -27);                 // far-side wheels peek out behind
  ctx.drawImage(PROP.cart, rx - 1, -10 - PROP.cart.height);
  ctx.drawImage(PROP.wheel[f], rx + 15 - 13, -26); ctx.drawImage(PROP.wheel[(f + 3) % 16], rx + 48 - 13, -26);
  ctx.restore();
}
const LEG_ROT = [0.05, 0.4, 0.75, 1.1];
function drawSpiderLeg(ox, oy, rot, sd, hitT) {
  const m = META.spider_leg;
  ctx.save(); ctx.translate(ox, oy); if (sd < 0) ctx.scale(-1, 1); ctx.rotate(rot);
  if (hitT > 0) { ctx.drawImage(tinted('spider_leg', '#c0392b'), -m.px, -m.py); } else ctx.drawImage(IMG.spider_leg, -m.px, -m.py);
  ctx.restore();
}
function drawSlopes(cam) {
  for (const L of S.logs) {                               // rolling logs, end-on
    const x = Math.round(L.x - cam), y = Math.round(terrY(L.x)) - 10; if (x < -30 || x > VW + 30) continue;
    const m = META.log_end; ctx.save(); ctx.translate(x, y); ctx.rotate(L.rot); ctx.drawImage(IMG.log_end, -m.ax, -m.ay); ctx.restore();
  }
  for (const w of S.webs) {
    const x = Math.round(w.x - cam); if (x < -40 || x > VW + 40 || w.st === 2) continue;
    const img = w.thick ? IMG.web_cocoon : IMG.web_curtain, m = w.thick ? META.web_cocoon : META.web_curtain;
    const H = WEB_H + 6, dw = Math.round(m.w * H / m.h), y0 = w.y - H;             // scaled down to match the WEB_H hitbox, so the obstacle reads clearly
    ctx.globalAlpha = w.st === 1 ? 0.5 : 1;
    ctx.drawImage(img, 0, 0, m.w, m.h, x - Math.round(dw / 2), y0, dw, H);
    ctx.globalAlpha = 0.9; ctx.fillStyle = '#eef3ea'; ctx.fillRect(x - Math.round(dw / 2), y0, dw, 1);   // bright top rim: the ledge to clear
    ctx.globalAlpha = 1;
  }
  const sp = S.spider;
  if (SPIDER && sp.st !== 'off') {
    const x = Math.round(sp.x - cam), y = Math.round(sp.y);
    if (sp.blob) {
      const b = sp.blob, bx = Math.round(b.x - cam), by = Math.round(b.y), m = META.web_blob, dir = (b.x1 >= b.x0) ? 1 : -1;
      ctx.save(); ctx.translate(bx, by); if (dir < 0) ctx.scale(-1, 1); ctx.drawImage(IMG.web_blob, -m.ax, -m.ay); ctx.restore();
    }
    if (sp.st === 'tele') { ctx.globalAlpha = 0.7; for (let yy = 0; yy < terrY(sp.tx) - 26; yy += 4) R_(ctx, '#d9e6dc', Math.round(sp.tx - cam) + Math.round(Math.sin(yy * 0.1 + S.t * 9)), yy, 1, 3); ctx.globalAlpha = 1; }
    if (x > -70 && x < VW + 70 && y > -40) {
      if (sp.st !== 'dead') { ctx.globalAlpha = 0.7; for (let yy = 0; yy < y - 30; yy += 4) R_(ctx, '#d9e6dc', x, yy, 1, 3); ctx.globalAlpha = 1; }
      const curl = sp.st === 'dead' ? 0.4 : 1;
      for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) {
        const wob = sp.st === 'dead' ? 0 : Math.sin(sp.leg * 9 + i * 1.7 + sd) * 0.1;
        drawSpiderLeg(x + sd * 5, y - 14 + i * 9, (LEG_ROT[i] + wob) * curl, sd, sp.hitT);
      }
      const bm = META.spider_body, bimg = sp.hitT > 0 ? tinted('spider_body', '#c0392b') : IMG.spider_body;
      ctx.drawImage(bimg, x - bm.ax, y - bm.ay);
    }
  }
}

function drawGate(cam) {
  const g = S.gate, x = Math.round(g.x - cam);
  if (x < -40 || x > VW + 40) return;
  const top = GY - 118 - g.open * 124;
  ctx.save(); ctx.beginPath(); ctx.rect(x - 16, GY - 144, 32, 144 + 4); ctx.clip();
  ctx.drawImage(PROP.gate, x - 13, top);
  ctx.restore();
  R_(ctx, '#2d241d', x - 18, GY - 150, 8, 150); R_(ctx, '#5e553f', x - 17, GY - 150, 3, 150); R_(ctx, '#2d241d', x + 10, GY - 150, 8, 150); R_(ctx, '#5e553f', x + 11, GY - 150, 3, 150);
  R_(ctx, '#49362e', x - 20, GY - 150, 40, 8); R_(ctx, '#7e6643', x - 20, GY - 150, 40, 2); R_(ctx, '#2d241d', x - 20, GY - 143, 40, 1);
  for (let i = 0; i < 6; i++) R_(ctx, '#4a5d3a', x - 18 + i * 7, GY - 142, 2, 4 + (i % 3) * 3);
  if (g.open > 0.02 && g.open < 0.98) { ctx.globalAlpha = 0.5; R_(ctx, '#8aa294', x - 3 + Math.sin(S.t * 30) * 2, GY - 140, 1, 4); ctx.globalAlpha = 1; }
}
function drawSnag(g, cam) {
  if (g.st === 2) return;
  const x = Math.round(g.x - cam); if (x < -40 || x > VW + 40) return;
  const bob = Math.round(Math.sin(S.t * 1.6 + g.x) * 1);
  ctx.save(); ctx.beginPath(); ctx.rect(x - 34, 0, 68, GY + 14); ctx.clip();
  ctx.drawImage(PROP.snag, x - 31, GY - 17 + bob);
  ctx.restore();
  if (g.st === 1) for (let i = 0; i < 7; i++) { const fx = x - 12 + i * 4 + Math.sin(S.t * 18 + i) * 1.5, fh = 6 + ((S.t * 14 + i * 5) % 9); ctx.fillStyle = ['#d9481f', '#f08a2a', '#ffd36a'][i % 3]; ctx.fillRect(Math.round(fx), Math.round(GY + 1 - fh), 3, Math.round(fh)); }
  R_(ctx, '#1d3e37', x - 22, GY + 11 + bob, 44, 2);
}
const BOAT_WL = GY + 14;
function boatBob() { return Math.round(Math.sin(S.boat.bob * 2.2) * 1 + Math.min(2, Math.abs(S.boat.v) * 0.02)); }
function drawBoat(cam) {
  const b = S.boat, x = Math.round(b.x - cam - 46), y = BOAT_Y - 12 + boatBob();
  if (x > VW + 10 || x < -110) return;
  ctx.save(); ctx.beginPath(); ctx.rect(x - 10, 0, 116, BOAT_WL + 1); ctx.clip();
  ctx.drawImage(PROP.boat, x - 6, y);
  if (!(S.p && S.p.poleK > 0.5)) { R_(ctx, POLEC, x + 12, y + 10, 62, 1); R_(ctx, POLED, x + 12, y + 11, 62, 1); }   // the pole lies along the gunwale until it is picked up
  ctx.restore();
}
function drawBoatFront(cam) {
  const b = S.boat, x = Math.round(b.x - cam - 46); if (x > VW + 10 || x < -110) return;
  const p = S.p;
  ctx.globalAlpha = 0.8; R_(ctx, '#406458', x + 2, BOAT_WL - 1, 88, 1); R_(ctx, '#2f5249', x + 6, BOAT_WL, 80, 1); ctx.globalAlpha = 1;
  if (Math.abs(b.v) > 8) { ctx.globalAlpha = 0.5; for (let i = 0; i < 4; i++) R_(ctx, '#8aa294', x + (b.v > 0 ? 0 : 88) - Math.sign(b.v) * i * 5, BOAT_WL + 1 + (i % 2), 4, 1); ctx.globalAlpha = 1; }
}
/* foreground reeds make the dense-swamp zones feel closed in */
const REEDS = [];
function buildReeds() {
  let sd = 5; const rr = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  REEDS.length = 0;
  ZONES.forEach((z, zi) => { for (let x = z.x0 + 10; x < z.x1; x += 30 + rr() * 40) {
    const onWater = CHAPTER === 1 && zi === 1; if (CHAPTER === 1 && zi === 0 && x > 2540) continue;
    REEDS.push({ x, h: onWater ? 16 + rr() * 20 : 18 + rr() * 24, n: 2 + ((rr() * 3) | 0), ph: rr() * 6, y: onWater ? WSURF + 26 + rr() * 8 : (CHAPTER === 1 ? GY + 8 : GY + 50) + rr() * 8, lean: (rr() - 0.5) * 8 });
  } });
}
function drawReeds(cam) {
  if (S.zoneK < 0.03) return;
  ctx.globalAlpha = Math.min(0.95, 0.3 + S.zoneK);
  for (const r of REEDS) {
    const bx = Math.round(r.x - cam); if (bx < -40 || bx > VW + 40) continue;
    const im = r.n % 2 ? IMG.reeds : MIR.reeds, sc = 0.7 + Math.min(1, r.h / 42) * 0.45, w = Math.round(im.width * sc), h = Math.round(im.height * sc);
    ctx.drawImage(im, bx - (w >> 1) + Math.round(Math.sin(S.t * 1.1 + r.ph)), Math.round(r.y) - h + 3, w, h);
  }
  ctx.globalAlpha = 1;
}
const WALK = ['p_walkA', 'p_walkB', 'p_walkA', 'p_walkB'];
const POLEC = '#7e6643', POLED = '#5b5032';
function pxLine(x0, y0, x1, y1, col, w) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))); ctx.fillStyle = col;
  for (let i = 0; i <= n; i++) { const u = i / n; ctx.fillRect(Math.round(x0 + (x1 - x0) * u), Math.round(y0 + (y1 - y0) * u), w, w); }
}
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function drawPlayer(cam) {
  const p = S.p; if (!p) return;
  let name;
  if (p.dead) name = 'p_dead';
  else if (p.swing) name = 'p_swing';
  else if (p.climb) name = Math.floor(p.y / 8) % 2 ? 'p_climbB' : 'p_climb';
  else if (p.hidden && p.ground) name = 'p_hide';
  else if (p.ground && p.standOn && p.standOn.o === S.cart) name = 'p_hide';     // sitting, braced, while the cart rolls
  else if (!p.ground && !p.grab) name = 'p_jump';
  else if (p.landT > 0) name = 'p_land';
  else if (Math.abs(p.vx) > 8) name = WALK[Math.floor(p.anim * 7) % 4];
  else name = 'p_idle';
  const step = Math.floor(p.anim * 7) % 2;
  let pose = '';
  if (!p.dead && (name === 'p_idle' || name.startsWith('p_walk'))) {       // both hands busy: pushing, punting, or holding the lantern out of the water
    if (p.poleK > 0.5) { name = 'p_poleA'; pose = 'pole'; }
    else if (p.pushK > 0.5) { name = step ? 'p_pushB' : 'p_pushA'; pose = 'push'; }
    else if (p.raiseK > 0.5) { name = 'p_wade'; pose = 'wade'; }
  }
  S.frame = name;
  if (S.death && (S.death.kind === 'water' || S.death.kind === 'eaten')) return;
  if (p.inv > 0 && !p.dead && Math.floor(S.t * 18) % 3 === 0) return;
  const u = ((p.poleT % 1) + 1) % 1, stroke = sstep(0.1, 0.6, u) * (1 - sstep(0.6, 0.95, u));    // 0 = pole planted ahead, 1 = pushed right through
  const lean = pose === 'pole' ? 0.04 + 0.16 * stroke : 0, back = pose === 'push' ? PUSH_BACK : 0;
  const img = (!p.lit && IMG[name + '_off']) ? name + '_off' : name;
  const m = META[name], moving = Math.abs(p.vx) > 8, bob = ((name.startsWith('p_walk') || (pose === 'wade' && moving)) && step === 1) ? -1 : 0;
  const shake = p.grab ? (Math.random() < 0.5 ? -1 : 1) : 0, sink = Math.round(p.sink || 0);
  const cd = p.climb ? (p.climb.rope ? -p.climb.side : 1) : 0, se = p.swing ? swingEnd(p.swing, S.t) : null;
  const AX = se ? m.hx : m.ax;
  const px = se ? Math.round(se.x - cam) : Math.round(p.x - cam) + shake - back * p.dir - cd * 9, py = se ? Math.round(se.y) + Math.round(m.ay - m.hy) : Math.round(p.y) + bob + sink, d = cd || p.dir;
  if (pose === 'pole') {                         // the lantern waits on the deck
    const lb = lantBase(); ctx.drawImage(p.lit ? IMG.lant : tinted('lant', '#1c2624'), Math.round(lb.x - cam) - 2, Math.round(lb.y) - 7);
  }
  ctx.save();
  if (sink > 0) { ctx.beginPath(); ctx.rect(px - 40, 0, 80, GY + 1); ctx.clip(); }      // swallowed by the mud
  ctx.translate(px, py);
  if (d < 0) ctx.scale(-1, 1);
  if (lean) ctx.transform(1, 0, -lean, 1, 0, 0);
  ctx.drawImage(IMG[img], -Math.round(AX), -Math.round(m.ay));
  if (p.goo > 0 && !p.dead) { ctx.globalAlpha = Math.min(0.5, p.goo * 0.5); ctx.drawImage(tinted(img, '#5fae3c'), -Math.round(AX), -Math.round(m.ay)); ctx.globalAlpha = 1; }
  if (p.inv > 1.0 && !p.dead) { ctx.globalAlpha = 0.55; ctx.drawImage(tinted(img, '#c0392b'), -Math.round(AX), -Math.round(m.ay)); ctx.globalAlpha = 1; }
  if (p.leech > 0 && !p.dead) { ctx.fillStyle = '#140808'; const LP = [[-3, -9], [3, -15], [-1, -22]]; for (let i = 0; i < p.leech; i++) { const w = Math.floor(S.t * 6 + i * 2) % 2; ctx.fillRect(LP[i][0], LP[i][1] + w, 2, 4); ctx.fillRect(LP[i][0] + (w ? 1 : -1), LP[i][1] + 3, 2, 2); } }
  ctx.restore();
  if (pose === 'pole') {
    // punting pole threaded through the fist: planted ahead, pushed back along the boat, lifted and swung forward again
    const fh = m.ay - m.hy, gx = px + d * (m.hx - m.ax + lean * fh), gy = py - fh;
    const rec = u >= 0.6 ? sstep(0.6, 1.0, u) : 0, lift = u >= 0.6 ? Math.sin((u - 0.6) / 0.4 * Math.PI) : 0;
    const tipX = px + d * lerp(14, -16, u < 0.6 ? sstep(0.1, 0.6, u) : 1 - rec), tipY = BOAT_WL + 15 - lift * 22;
    const L = Math.hypot(gx - tipX, gy - tipY) || 1, ux = (gx - tipX) / L, uy = (gy - tipY) / L;
    const topX = gx + ux * 16, topY = gy + uy * 16;
    const wl = clamp((BOAT_WL - topY) / ((tipY - topY) || 1), 0, 1), wx = lerp(topX, tipX, wl), wy = lerp(topY, tipY, wl);
    pxLine(topX, topY, wx, wy, POLEC, 2); pxLine(topX + 1, topY, wx + 1, wy, POLED, 1);
    if (wl < 1) { ctx.globalAlpha = 0.4; pxLine(wx, wy, tipX, tipY, POLED, 2); ctx.globalAlpha = 1; }
    ctx.fillStyle = '#cc8c35'; ctx.fillRect(Math.round(gx) - 1, Math.round(gy) - 1, 3, 3);       // the fist stays on top of the pole
  }
}
function drawMos(m, cam) {
  if (m.t < 0) return;
  const frame = m.st === 'frozen' ? 'mos1' : (Math.floor(S.t * 22 + m.seed * 5) % 2 ? 'mos0' : 'mos1');
  let sx = Math.round(m.x - cam), sy = Math.round(m.y);
  if (m.st === 'tele') sx += Math.random() < 0.5 ? -1 : 1;
  if (sx < -60 || sx > VW + 60) return;
  ctx.save(); ctx.translate(sx, sy); if (m.face > 0) ctx.scale(-1, 1);
  ctx.drawImage(IMG[frame], -26, -22);
  let tc = null, ta = 0;
  if (m.hit > 0) { tc = '#ffffff'; ta = 0.85; }
  else if (m.frozen > 0) { tc = '#9fd8ee'; ta = 0.62; }
  else if (m.burn > 0) { tc = Math.floor(S.t * 20) % 2 ? '#ff8a2a' : '#ffd36a'; ta = 0.6; }
  if (tc) { ctx.globalAlpha = ta; ctx.drawImage(tinted(frame, tc), -26, -22); ctx.globalAlpha = 1; }
  if (m.st === 'tele') { ctx.fillStyle = '#ffd36a'; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(m.t * 40); ctx.fillRect(-15, -2, 4, 4); ctx.globalAlpha = 1; }
  ctx.restore();
}
function blobRows(cx, cy, rx, ry, col) {
  ctx.fillStyle = col;
  for (let dy = -ry; dy <= ry; dy++) { const h = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry + 0.5)))); if (h > 0) ctx.fillRect(Math.round(cx - h), Math.round(cy + dy), h * 2, 1); }
}
function drawSpits(cam) {
  const cr = S.cr; if (!cr) return;
  // landing-spot marker + dotted arc while the monster winds up
  if (cr.act && cr.st === 'tele') {
    const k = Math.min(1, cr.t / 0.25), pulse = 0.5 + 0.5 * Math.sin(cr.t * 26), lock = cr.t > 0.62;
    const mx = cr.tx - cam, my = cr.sy - 1, rr = (lock ? 17 : 21) + Math.round(pulse * 2);
    ctx.globalAlpha = k * (lock ? 0.8 : 0.35 + 0.25 * pulse); blobRows(mx, my, rr, 4, lock ? '#5fb03e' : '#3d8a35');
    ctx.globalAlpha = k * (lock ? 0.95 : 0.55 + 0.3 * pulse); blobRows(mx, my, rr - 5, 2, lock ? '#c4f08a' : '#8fd35f');
    const M = crPt(150, 46);
    ctx.globalAlpha = k * 0.6; ctx.fillStyle = '#9be07a';
    for (let u = 0.07; u < 0.97; u += 0.07) { const x = lerp(M.x, cr.tx, u), y = lerp(M.y, cr.sy - 2, u) - 4 * spitArc(cr.tx - M.x) * u * (1 - u); ctx.fillRect(Math.round(x - cam), Math.round(y), 2, 2); }
    ctx.globalAlpha = 1;
  }
  for (const q of S.puddles) {
    const f = Math.min(1, q.t / 0.8), x = q.x - cam, y = q.y - 2, w = q.w / 2;
    ctx.globalAlpha = 0.95 * f;
    blobRows(x, y, w, 3, '#1f4a22'); blobRows(x, y - 1, w - 3, 2, '#3a8a35'); blobRows(x - 4, y - 1, Math.max(3, w * 0.4), 1, '#7fcf5a');
    ctx.fillStyle = '#c4f08a';
    const bt = (S.t * 2 + q.seed) % 1; ctx.fillRect(Math.round(x + Math.sin(q.seed * 3) * w * 0.5), Math.round(y - 2 - bt * 3), 1, 1);
    ctx.globalAlpha = 1;
  }
  for (const s of S.spits) {
    const x = Math.round(s.x - cam), y = Math.round(s.y);
    blobRows(x, y, 4, 3, '#2f7d32'); blobRows(x, y, 3, 2, '#6bbf4a'); ctx.fillStyle = '#c4f08a'; ctx.fillRect(x - 2, y - 2, 2, 1);
  }
}
// ---- creature walk rig: legs / arm / body are separate sprites drawn about their pivots ----
const CR_ORDER = ['cr_leg1', 'cr_leg2', 'cr_arm', 'cr_body'];
function crPose() {
  const cr = S.cr, w = cr.walk, ph = cr.phase;
  const leg = off => {
    const u = (ph + off) % 1;
    if (u < 0.5) return { a: -WALK_A + 4 * WALK_A * u, sy: 1, st: true };
    const s = (u - 0.5) * 2, e = s * s * (3 - 2 * s);
    return { a: WALK_A - 2 * WALK_A * e, sy: 1 - 0.09 * Math.sin(Math.PI * s), st: false };
  };
  const l1 = leg(0), l2 = leg(0.5), st = l1.st ? l1 : l2;
  const up = LEGLEN * (Math.cos(st.a * w) - Math.cos(WALK_A * w));
  const sway = 0.014 * Math.sin(Math.PI * 2 * ph) * w;
  const armSwing = 0.09 * Math.sin(Math.PI * 2 * ph + 0.6) * w;
  return { a1: l1.a * w, s1: 1 - (1 - l1.sy) * w, a2: l2.a * w, s2: 1 - (1 - l2.sy) * w, dy: -up, body: cr.lean + sway, arm: cr.arm + armSwing };
}
function crParts(g, x0, y0, P) {
  const M = META;
  for (const nm of CR_ORDER) {
    const im = IMG[nm]; g.save();
    if (nm === 'cr_leg1' || nm === 'cr_leg2') {
      const m = M[nm], a = nm === 'cr_leg1' ? P.a1 : P.a2, sy = nm === 'cr_leg1' ? P.s1 : P.s2;
      g.translate(x0 + m.px, y0 + P.dy + m.py); g.rotate(a); g.scale(1, sy); g.drawImage(im, -m.px, -m.py);
    } else {
      g.translate(x0 + 58, y0 + P.dy + 150); g.rotate(P.body);
      if (nm === 'cr_arm') { const m = M[nm]; g.translate(m.px - 58, m.py - 150); g.rotate(P.arm); g.drawImage(im, -m.px, -m.py); }
      else g.drawImage(im, -58, -150);
    }
    g.restore();
  }
}
// the posed monster is composed once per frame into small buffers (body + a tinted copy for the rim halo)
const CRB_W = 280, CRB_H = 380, CRB_X = 70, CRB_Y = 20;
let CRB = null, CRH = null;
function crCompose(P, frz) {
  if (!CRB) { CRB = document.createElement('canvas'); CRH = document.createElement('canvas'); CRB.width = CRH.width = CRB_W; CRB.height = CRH.height = CRB_H; }
  const g = CRB.getContext('2d'), h = CRH.getContext('2d'); g.imageSmoothingEnabled = false; h.imageSmoothingEnabled = false;
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, CRB_W, CRB_H);
  crParts(g, CRB_X, CRB_Y, P);
  g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.5; g.fillStyle = '#03100d'; g.fillRect(0, 0, CRB_W, CRB_H);
  if (frz) { g.globalAlpha = 0.3; g.fillStyle = '#9fd8ee'; g.fillRect(0, 0, CRB_W, CRB_H); }
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  h.globalCompositeOperation = 'source-over'; h.globalAlpha = 1; h.clearRect(0, 0, CRB_W, CRB_H); h.drawImage(CRB, 0, 0);
  h.globalCompositeOperation = 'source-atop'; h.fillStyle = frz ? '#8fc8dc' : '#7fb8a4'; h.fillRect(0, 0, CRB_W, CRB_H); h.globalCompositeOperation = 'source-over';
}
function drawCreature(cam, eyesOnly) {
  const cr = S.cr; if (!cr || !cr.act || cr.alpha <= 0.01) return;
  const x0 = Math.round(cr.cx - cam - 140 + CR_VIS), y0 = 18;
  if (x0 > VW || x0 + 165 < 0) return;
  const P = crPose();
  if (!eyesOnly) {
    crCompose(P, cr.st === 'frozen');
    const ox = x0 - CRB_X, oy = y0 - CRB_Y;
    ctx.globalAlpha = (0.3 + 0.2 * S.intensity) * cr.alpha;
    ctx.drawImage(CRH, ox - 1, oy); ctx.drawImage(CRH, ox + 1, oy); ctx.drawImage(CRH, ox, oy - 1); ctx.drawImage(CRH, ox, oy + 1);
    ctx.globalAlpha = 0.97 * cr.alpha; ctx.drawImage(CRB, ox, oy);
    ctx.globalAlpha = 1; return;
  }
  const hot = cr.st === 'tele' || cr.st === 'spit' || cr.st === 'grab' || cr.flare > 0;
  if (cr.st === 'frozen') return;
  if (!hot && (S.t % 5.3) > 5.15) return;
  ctx.save(); ctx.translate(x0 + 58, y0 + P.dy + 150); ctx.rotate(P.body);
  const ex = e => e[0] - 58, ey = e => e[1] - 150;
  ctx.globalAlpha = (0.7 + 0.3 * S.intensity) * cr.alpha * (cr.st === 'rise' ? Math.max(0, Math.min(1, (cr.t - 0.9) / 0.8)) : 1); ctx.fillStyle = hot ? '#ffe08a' : '#ffb347';
  for (const e of META.creature.eyes) ctx.fillRect(ex(e), ey(e), 1, 1);
  ctx.globalAlpha = ((hot ? 0.45 : 0.18) + 0.12 * S.intensity) * cr.alpha * (cr.st === 'rise' ? Math.max(0, Math.min(1, (cr.t - 0.9) / 0.8)) : 1); ctx.fillStyle = '#ffb347';
  const k = hot ? 2 : 1;
  for (const e of META.creature.eyes) ctx.fillRect(ex(e) - k, ey(e) - k, 1 + 2 * k, 1 + 2 * k);
  ctx.restore(); ctx.globalAlpha = 1;
}
function hint(str, wx, y, range) {
  const p = S.p; if (!p || p.dead || S.modal) return;
  const d = Math.abs(p.x - wx); if (d > range) return;
  ctx.globalAlpha = Math.min(1, (range - d) / 40);
  txt(str, Math.round(wx - S.camR), y, 1, '#c9d8cd', 'c');
  ctx.globalAlpha = 1;
}

/* ---------- render: HUD ---------- */
function flameIcon(x, y, full) {
  const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
  const c1 = full ? '#e2762a' : '#26332f', c2 = full ? '#ffd36a' : '#18221f';
  R(3, 0, 2, 2, c1); R(2, 2, 4, 2, c1); R(1, 4, 6, 3, c1); R(2, 7, 4, 2, c1); R(3, 5, 2, 3, c2);
}
function bookSprite(id, x, y, empty, sc) {
  const im = IMG['bki_' + id]; if (!im) return;
  sc = sc || 1;
  if (empty) { ctx.globalAlpha = 0.9; ctx.drawImage(tinted('bki_' + id, '#0b1513'), x, y, Math.round(im.width * sc), Math.round(im.height * sc)); ctx.globalAlpha = 1; }
  else ctx.drawImage(im, x, y, Math.round(im.width * sc), Math.round(im.height * sc));
}
function drawHUD() {
  for (let i = 0; i < S.maxHp; i++) flameIcon(10 + i * 11, 8, i < S.hp);
  if (S.buff.type) {
    const B = BOOKS[S.buff.type];
    bookSprite(S.buff.type, 8, 19);
    txt(B.short, 38, 25, 1, '#d9e6dc');
    ctx.fillStyle = '#10201d'; ctx.fillRect(38, 34, 46, 3);
    ctx.fillStyle = S.buff.t < 8 && Math.floor(S.t * 4) % 2 ? '#c0392b' : B.col; ctx.fillRect(38, 34, Math.round(46 * S.buff.t / BUFF_T), 3);
  } else txt('API TIPIS', 10, 24, 1, '#5d7469');
  { const pp = S.p; if (pp && !pp.dead) {
    let yy = 42;
    if (!pp.lit) { if (Math.floor(S.t * 3) % 2) txt('LENTERA PADAM', 10, yy, 1, '#c0392b'); yy += 9; }
    if (pp.leech > 0) { txt('LINTAH ' + pp.leech + '/3', 10, yy, 1, pp.leech >= 3 ? '#c0392b' : '#c9a24a'); yy += 9; }
    if (pp.air < 2.45) { txt('NAPAS', 10, yy, 1, '#9fd8ee'); ctx.fillStyle = '#10201d'; ctx.fillRect(34, yy + 1, 40, 3); ctx.fillStyle = pp.air < 0.9 ? '#c0392b' : '#9fd8ee'; ctx.fillRect(34, yy + 1, Math.round(40 * pp.air / 2.5), 3); yy += 9; }
    if (pp.sink > 4) txt('TENGGELAM! SPASI!', VW / 2, 84, 2, Math.floor(S.t * 6) % 2 ? '#ffd36a' : '#e66228', 'c');
  } }
  txt('KITAB', VW - 10, 8, 1, '#5d7469', 'r');
  for (let i = 0; i < 5; i++) { const sp = SPECIALS[i], has = S.specials.includes(sp.id); bookSprite(sp.id, VW - 8 - (5 - i) * 27, 15, !has); }
  if (S.toast) { ctx.globalAlpha = Math.min(1, S.toast.t * 2); txt(S.toast.s, VW / 2, 36, 1, '#e8a63a', 'c'); ctx.globalAlpha = 1; }
  ch5HUD();
  if (S.warn > 0) { ctx.globalAlpha = Math.min(1, S.warn * 2); txt('NYAMUK RAKSASA!', VW / 2, 60, 2, '#e66228', 'c'); ctx.globalAlpha = 1; }
  const p = S.p;
  if (p && p.grab && !p.dead) {
    txt('LEPASKAN! SPASI / E BERKALI-KALI', VW / 2, 90, 2, '#ffd36a', 'c');
    ctx.fillStyle = '#10201d'; ctx.fillRect(VW / 2 - 40, 112, 80, 5);
    ctx.fillStyle = '#e8a63a'; ctx.fillRect(VW / 2 - 40, 112, Math.round(80 * Math.min(1, p.grab.got / 3)), 5);
    ctx.fillStyle = '#c0392b'; ctx.fillRect(VW / 2 - 40, 119, Math.round(80 * (1 - S.cr.t / 1.5)), 2);
  }
}
const GLOW = { brown: '255,170,70', orange: '255,120,40', white: '190,230,255', ungu: '190,110,255', merah: '255,60,60', hijau: '120,255,120', kuning: '255,230,90', emas: '255,210,80' };
function glow(cx, cy, r, rgb, a) {
  const gr = ctx.createRadialGradient(cx, cy, 2, cx, cy, r); gr.addColorStop(0, 'rgba(' + rgb + ',1)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.fillStyle = gr; ctx.fillRect(cx - r, cy - r, r * 2, r * 2); ctx.restore();
}
function drawModal() {
  const m = S.modal, hu = m.h, blink = Math.floor(S.t * 1.8) % 2 === 0;
  ctx.drawImage(IMG.interior, 0, 0);
  const id = m.stage === 2 ? hu.special : hu.book, B = BOOKS[hu.book], img = IMG['bk_' + id], rgb = GLOW[id];
  const u = m.stage === 0 ? 0 : Math.min(1, m.t / 0.8), e = u * u * (3 - 2 * u);
  const sc = lerp(1, 1.7, e), w = Math.round(img.width * sc), h = Math.round(img.height * sc);
  const cx = 320, cy = lerp(128, 104, e) + Math.sin(S.t * 2.1) * 3;
  const pulse = 0.5 + 0.5 * Math.sin(S.t * 3);
  glow(cx, cy + 4, 70 + 34 * e, rgb, 0.32 + 0.14 * pulse + 0.4 * e);
  glow(cx, 176, 90, rgb, 0.1 + 0.08 * pulse + 0.15 * e);                 // pool of light on the table
  if (e > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.12 * e; ctx.fillStyle = 'rgb(' + rgb + ')'; for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.2 + Math.sin(S.t * 0.7 + i) * 0.04; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a - 0.04) * 220, cy + Math.sin(a - 0.04) * 220); ctx.lineTo(cx + Math.cos(a + 0.04) * 220, cy + Math.sin(a + 0.04) * 220); ctx.fill(); } ctx.restore(); }
  ctx.drawImage(img, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
  for (let i = 0; i < 14; i++) { const t = (S.t * 0.25 + i * 0.37) % 1, x = 60 + ((i * 97) % 520) + Math.sin(S.t * 0.6 + i) * 8, y = 270 - t * 230; ctx.globalAlpha = Math.sin(t * Math.PI) * 0.4; ctx.fillStyle = '#c9d8cd'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
  ctx.globalAlpha = 1;
  if (m.flash > 0) { ctx.globalAlpha = Math.min(0.7, m.flash * 2); ctx.fillStyle = '#fff2c8'; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
  // text panel in the dark band of the picture
  const py = m.stage === 2 ? 288 : 298;
  ctx.fillStyle = 'rgba(2,8,7,0.78)'; ctx.fillRect(60, py, 520, 354 - py);
  ctx.fillStyle = '#7a5220'; ctx.fillRect(60, py, 520, 1); ctx.fillRect(60, 353, 520, 1); ctx.fillRect(60, py, 1, 354 - py); ctx.fillRect(579, py, 1, 354 - py);
  if (m.stage === 0) {
    txt(hu.lore[0], VW / 2, 306, 1, '#9fb5a8', 'c'); txt(hu.lore[1], VW / 2, 318, 1, '#9fb5a8', 'c');
    if (blink) txt('E : BACA KITAB', VW / 2, 333, 2, '#e8a63a', 'c');
  } else if (m.stage === 1) {
    txt(B.name, VW / 2, 304, 2, '#f1d88a', 'c'); txt(B.desc, VW / 2, 321, 1, '#d9e6dc', 'c');
    txt('BERTAHAN ' + BUFF_T + ' DETIK, ATAU SAMPAI KITAB BERIKUTNYA DITEMUKAN', VW / 2, 332, 1, '#7f9b8e', 'c');
    if (blink && m.t > 0.5) txt('E : LANJUT', VW / 2, 343, 1, '#e8a63a', 'c');
  } else {
    const sp = SPEC[hu.special];
    txt('KITAB KHUSUS DITEMUKAN!', VW / 2, 294, 2, '#e8a63a', 'c');
    txt(sp.name + ' : ' + sp.sub, VW / 2, 311, 1, '#f1d88a', 'c');
    txt(S.specials.length + ' DARI 5 TERKUMPUL. DIBUTUHKAN UNTUK MENGALAHKAN SANG RAJA', VW / 2, 322, 1, '#7f9b8e', 'c');
    for (let i = 0; i < 5; i++) bookSprite(SPECIALS[i].id, VW / 2 - 70 + i * 29, 253, !S.specials.includes(SPECIALS[i].id));
    if (blink && m.t > 0.5) txt('E : LANJUT', VW / 2, 340, 1, '#e8a63a', 'c');
  }
}

/* ---------- render: frame ---------- */
function render() { TQ.length = 0; renderGame(); present(); }
function renderGame() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (S.mode === 'title') return renderTitle();
  if (S.mode === 'intro') return renderIntro();
  if (S.mode === 'end') return renderEnd();
  if (S.mode === 'card') return renderCard();
  if (S.modal) { drawModal(); if (S.fade > 0) { ctx.globalAlpha = S.fade; ctx.fillStyle = '#020605'; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; } return; }
  const cam = Math.round(S.cam); S.camR = cam;
  const sh = S.shake > 0 ? (Math.random() < 0.5 ? -1 : 1) : 0;
  ctx.save(); if (sh) ctx.translate(sh, 0);
  drawTiled(S.chapter === 3 ? 'far3' : S.chapter === 4 ? 'far4' : S.chapter === 5 ? 'far5' : 'far', cam * 0.06, 0);
  if (S.chapter === 2) drawValley(cam);
  drawTiled(S.chapter === 3 ? 'mid3' : S.chapter === 2 ? 'mid2' : S.chapter === 4 ? 'mid4' : S.chapter === 5 ? 'mid5' : 'mid', cam * 0.28, 0);
  drawCreature(cam, false);
  drawCreature(cam, true);
  drawWorld(cam);
  drawTiled('near_top', cam * 1.3, 0);
  drawTiled('near_bot', cam * 1.3, 256);
  drawFog(FOG2, 4, 230, 0.55 + 0.3 * S.zoneK, 0.45);
  drawFog(FOG1, 9, 70, 0.42 + 0.28 * S.zoneK, 0.2);
  if (S.zoneK > 0.05) drawFog(FOG2, 6, 150, 0.32 * S.zoneK, 0.3);
  drawFireflies();
  renderLight(cam);
  ctx.restore();
  if (S.flash > 0) { ctx.globalAlpha = Math.min(0.45, S.flash * 1.5); ctx.fillStyle = '#7a1410'; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
  HINTS.forEach(h => { const t = touchHint(h[0]); if (t) hint(t, h[1], h[2], h[3]); });
  hint('BAKAR RANTING ITU', S.snags.find(g => g.st === 0) ? S.snags.find(g => g.st === 0).x - 70 : -999, 214, 60);
  S.huts.forEach(h => { if (!h.looted) hint(h.shrine ? 'E : BACA ALTAR' : 'E : MASUK', h.x, h.y - (h.shrine ? 60 : 104), 70); });
  if (LEVER && !S.sluice.pulled) hint('E : TARIK TUAS', LEVER.x, LEVER.y - 52, 60);
  if (S.stalk.st !== 'off' && S.stalk.st !== 'done') HIDES.forEach(h => hint('TAHAN E : SEMBUNYI', h.x + h.w / 2, h.y - 62, 46));
  drawHUD();
  if (S.fade > 0) { ctx.globalAlpha = S.fade; ctx.fillStyle = '#020605'; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
}
function keyBg(a) {
  ctx.fillStyle = '#020605'; ctx.fillRect(0, 0, VW, VH);
  ctx.drawImage(IMG.keyart, 0, -34, 640, 427);
  ctx.globalAlpha = a; ctx.fillStyle = '#020605'; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1;
}
const TITLE_BTN = [1, 2, 3, 4, 5].map(ch => ({ ch, x: 14 + (ch - 1) * 124, y: 304, w: 116, h: 34 }));
function lockIcon(x, y) {                       // a tiny padlock, drawn at display resolution
  rectHi(x + 2, y, 6, 1, '#9fb5a8'); rectHi(x + 1, y + 1, 1, 4, '#9fb5a8'); rectHi(x + 8, y + 1, 1, 4, '#9fb5a8');
  rectHi(x, y + 4, 10, 7, '#9fb5a8'); rectHi(x + 4, y + 6, 2, 3, '#06100f');
}
function renderTitle() {
  ctx.fillStyle = '#020605'; ctx.fillRect(0, 0, VW, VH);
  const bw = VW, bh = Math.round(VW * IMG.banner.height / IMG.banner.width);
  drawHi(IMG.banner, 0, Math.round((VH - bh) / 2) - 6, bw, bh, 1);
  for (let i = 0; i < 9; i++) rectHi(0, 270 + i * 10, VW, 10, '#020605', 0.08 + i * 0.07);       // the bottom fades into a dark band for the buttons
  txt('V2.2', VW - 8, 6, 1, '#9fb5a8', 'r');
  TITLE_BTN.forEach(b => {
    const open = chUnlocked(b.ch), done = (S.progress || 0) >= b.ch;
    rectHi(b.x, b.y, b.w, b.h, '#06100f', 0.78);
    const edge = open ? (done ? '#7f9b8e' : '#e8a63a') : '#3a4a44';
    rectHi(b.x, b.y, b.w, 1, edge); rectHi(b.x, b.y + b.h - 1, b.w, 1, edge); rectHi(b.x, b.y, 1, b.h, edge); rectHi(b.x + b.w - 1, b.y, 1, b.h, edge);
    if (open) { txt('BAB ' + b.ch, b.x + b.w / 2, b.y + 4, 2, '#d9e6dc', 'c'); txt(CH[b.ch].name, b.x + b.w / 2, b.y + 19, 1, done ? '#7f9b8e' : '#9fb5a8', 'c'); }
    else { lockIcon(b.x + b.w / 2 - 5, b.y + 4); txt('TERKUNCI', b.x + b.w / 2, b.y + 18, 1, '#5d7469', 'c'); }
  });
  if (S.titleMsg && S.titleMsg.t > 0) { S.titleMsg.t -= 1 / 60; txt(S.titleMsg.s, VW / 2, 284, 1, '#e8a63a', 'c'); }
  else if (Math.floor(S.t * 1.6) % 2 === 0) txt(S.progress ? 'PILIH BAB YANG SUDAH TERBUKA' : 'TEKAN BAB 1 UNTUK MULAI', VW / 2, 284, 1, '#d9e6dc', 'c');
}
function renderCard() {
  const c = S.card, C = CH[c.ch], a = Math.min(1, c.t / 0.8);
  keyBg(0.9);
  ctx.globalAlpha = a;
  txt('BAB ' + c.ch, VW / 2, 116, 2, '#e8a63a', 'c');
  txt(C.name, VW / 2, 138, 4, '#d9e6dc', 'c');
  ctx.fillStyle = '#e8a63a'; ctx.fillRect(VW / 2 - 60, 170, 120, 1);
  C.sub.forEach((l, i) => { ctx.globalAlpha = clamp((c.t - 0.9 - i * 0.7) / 0.7, 0, 1); txt(l, VW / 2, 186 + i * 14, 1, '#9fb5a8', 'c'); });
  ctx.globalAlpha = 1;
  if (c.t > 1.6 && Math.floor(S.t * 1.6) % 2 === 0) txt('TEKAN APA SAJA UNTUK LANJUT', VW / 2, 318, 1, '#d9e6dc', 'c');
}
const INTRO = [
  ['DESA INI DULU RAMAI.', 'KINI HANYA KABUT, RAWA,', 'DAN MAKHLUK DARI ALAM LAIN.'],
  ['SEMUA ORANG SUDAH LARI.', 'SEBAGIAN TAK PERNAH SAMPAI.'],
  ['DI UJUNG DESA, ISTANA RAJA MASIH BERDIRI.', 'KABARNYA PUTRINYA MASIH DI DALAM:', 'DIKEKANG AYAHNYA SENDIRI, TAK SEMPAT LARI.'],
  ['ADAM, SEORANG KSATRIA, BERANGKAT SENDIRIAN', 'DENGAN SEBUAH LENTERA.', 'SESUATU DI DALAM KABUT MULAI MEMPERHATIKANNYA.'],
  ['A D : JALAN      SPASI : LOMPAT', 'E : SEMBURKAN API LENTERA', 'E DI DEPAN GUBUK : MASUK DAN BACA KITAB']
];
const introTotal = i => INTRO[i].reduce((a, l) => a + l.length, 0);
const PGC = (() => { const c = document.createElement('canvas'); c.width = VW; c.height = VH; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; })();
function withCtx(g, fn) { const old = ctx; ctx = g; try { fn(); } finally { ctx = old; } }
function pageFrame() {                       // leather-bound page edge + brass corners
  ctx.fillStyle = '#0b1513'; ctx.fillRect(0, 0, VW, 3); ctx.fillRect(0, VH - 3, VW, 3); ctx.fillRect(0, 0, 3, VH); ctx.fillRect(VW - 3, 0, 3, VH);
  ctx.fillStyle = '#7a5220'; ctx.fillRect(3, 3, VW - 6, 1); ctx.fillRect(3, VH - 4, VW - 6, 1); ctx.fillRect(3, 3, 1, VH - 6); ctx.fillRect(VW - 4, 3, 1, VH - 6);
  ctx.fillStyle = '#cc8c35';
  for (const [x, y, dx, dy] of [[4, 4, 1, 1], [VW - 5, 4, -1, 1], [4, VH - 5, 1, -1], [VW - 5, VH - 5, -1, -1]]) { for (let i = 0; i < 12; i++) { ctx.fillRect(x + dx * i - (dx < 0 ? 0 : 0), y, 1, 1); ctx.fillRect(x, y + dy * i, 1, 1); } ctx.fillRect(x + dx, y + dy, 2, 2); }
}
function drawIntroPage(i, typed, tt) {
  const T = tt === undefined ? S.introT : tt;
  if (i === 4) {                              // controls card: text over the key art
    keyBg(0.9);
    const lines = INTRO[4]; let shown = typed ? Math.floor(T * 42) : 999;
    lines.forEach((l, k) => { const n = Math.max(0, Math.min(l.length, shown)); shown -= l.length; txt(l, VW / 2, 130 + k * 28, 2, '#e8a63a', 'c', n); });
    return;
  }
  ctx.drawImage(IMG['page' + (i + 1)], 0, 0);
  const lines = INTRO[i];
  ctx.fillStyle = 'rgba(2,8,7,0.5)'; ctx.fillRect(0, 294, VW, 66);
  let shown = typed ? Math.floor(T * 42) : 999;
  const y0 = lines.length === 3 ? 301 : 309;
  const a = typed ? Math.min(1, T / 0.6) : 1; ctx.globalAlpha = a;
  lines.forEach((l, k) => { const n = Math.max(0, Math.min(l.length, shown)); shown -= l.length; txt(l, VW / 2, y0 + k * 15, 2, '#d9e6dc', 'c', n); });
  ctx.globalAlpha = 1;
  pageFrame();
}
function renderCover() {
  ctx.fillStyle = '#020605'; ctx.fillRect(0, 0, VW, VH);
  ctx.drawImage(IMG.keyart, 0, -34, 640, 427); ctx.fillStyle = 'rgba(2,6,5,0.88)'; ctx.fillRect(0, 0, VW, VH);
  drawFireflies();
  const cv0 = IMG.cover, T = S.opening ? S.openT : 0, pulse = 0.5 + 0.5 * Math.sin(S.t * 2);
  let sc = 1, cxx = VW / 2, cyy = VH / 2 + Math.sin(S.t * 1.3) * 2 - (S.opening ? 0 : 0);
  let squeeze = 1, fade = 1, pageA = 0;
  if (S.opening) {
    const u1 = clamp(T / 0.55, 0, 1), e1 = u1 * u1 * (3 - 2 * u1); sc = lerp(1, 1.72, e1);
    const u2 = clamp((T - 0.55) / 0.85, 0, 1), e2 = u2 * u2 * (3 - 2 * u2);
    squeeze = 1 - e2; pageA = e2; fade = 1 - Math.max(0, (u2 - 0.55) / 0.45);
  }
  glow(cxx, cyy, 150 * sc, '255,150,50', (0.2 + 0.1 * pulse) * (S.opening ? 1 - pageA : 1));
  if (pageA > 0) { ctx.globalAlpha = pageA; ctx.drawImage(IMG.page1, 0, 0); ctx.globalAlpha = 1; }
  const w = Math.round(cv0.width * sc), h = Math.round(cv0.height * sc), lx = Math.round(cxx - w / 2), ty = Math.round(cyy - h / 2);
  if (squeeze > 0.02 && fade > 0) {
    ctx.globalAlpha = fade; ctx.drawImage(cv0, lx, ty, Math.max(1, Math.round(w * squeeze)), h);
    if (squeeze > 0.1) { ctx.fillStyle = 'rgba(2,8,7,' + (0.55 * (1 - squeeze)) + ')'; ctx.fillRect(lx, ty, Math.round(w * squeeze), h); }
    if (T < 0.5) {                         // title stamped into the empty cartouche
      const ta = 1 - T / 0.5, tx = lx + Math.round(w * 0.455), tyy = ty + Math.round(h * 0.5);
      ctx.globalAlpha = ta; txt('FOGBOUND', tx, tyy - 6, 2, '#e8a63a', 'c');
    }
    ctx.globalAlpha = 1;
  }
  if (!S.opening && Math.floor(S.t * 1.6) % 2 === 0) txt('TEKAN APA SAJA UNTUK MEMBUKA BUKU', VW / 2, 336, 1, '#9fb5a8', 'c');
}
function renderIntro() {
  if (S.intro === -1) return renderCover();
  if (S.turn) {
    const u = clamp(S.turn.t / S.turn.dur, 0, 1), e = u * u * (3 - 2 * u);
    drawIntroPage(S.turn.to, true, 0);
    withCtx(PGC[1], () => { PGC[1].clearRect(0, 0, VW, VH); drawIntroPage(S.intro, false); });
    const w = Math.max(1, Math.round(VW * (1 - e)));
    ctx.drawImage(PGC[0], 0, 0, VW, VH, 0, 0, w, VH);
    ctx.fillStyle = 'rgba(2,8,7,' + (0.62 * e) + ')'; ctx.fillRect(0, 0, w, VH);
    ctx.fillStyle = 'rgba(201,185,138,' + (0.9 * (1 - e)) + ')'; ctx.fillRect(w - 2, 0, 2, VH);
    ctx.fillStyle = 'rgba(2,8,7,' + (0.5 * (1 - e)) + ')'; ctx.fillRect(w, 0, 10, VH);
    return;
  }
  drawIntroPage(S.intro, true);
  if (S.introT * 42 > introTotal(S.intro) + 8 && Math.floor(S.t * 1.8) % 2 === 0) txt(S.intro === 4 ? 'TEKAN APA SAJA UNTUK MULAI' : 'TEKAN APA SAJA >', VW - 12, 347, 1, '#9fb5a8', 'r');
  txt((S.intro + 1) + '/' + INTRO.length, 12, 347, 1, '#7f9b8e');
}
function startIntro() { S.mode = 'intro'; S.intro = -1; S.introT = 0; S.turn = null; S.opening = false; S.openT = 0; }
function introAdvance() {
  if (S.turn || S.opening) return;
  if (S.intro === -1) { S.opening = true; S.openT = 0; sfx('bookopen'); return; }
  if (S.introT * 42 < introTotal(S.intro) + 2) { S.introT = 99; return; }
  if (S.intro >= INTRO.length - 1) { startGame(); return; }
  S.turn = { t: 0, dur: 0.75, to: S.intro + 1 }; sfx('page');
}
const ENDL = [[1.0, 'SANG RAJA KABUT TELAH RUNTUH.'], [3.6, 'DI UJUNG AULA, SEBUAH PINTU TERBUKA LEBAR.'], [6.4, 'PUTRI YANG LAMA DIKURUNG AKHIRNYA MELANGKAH KELUAR.']];
function renderEnd() {
  ctx.fillStyle = '#020605'; ctx.fillRect(0, 0, VW, VH);
  const e = Math.min(1, S.endT / 2.2);
  ctx.globalAlpha = e; ctx.drawImage(IMG.ending5, 0, 0); ctx.globalAlpha = 1;
  if (e < 1) { ctx.globalAlpha = 1 - e; ctx.fillStyle = '#020605'; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
  ctx.fillStyle = 'rgba(2,8,7,0.55)'; ctx.fillRect(0, 294, VW, 66);
  ENDL.forEach(([t, s], i) => { if (S.endT > t) { ctx.globalAlpha = Math.min(1, (S.endT - t) * 1.2); txt(s, VW / 2, 302 + i * 15, 1, i === 2 ? '#e8a63a' : '#d9e6dc', 'c'); ctx.globalAlpha = 1; } });
  if (S.endT > 9) {
    txt('TAMAT', VW / 2, 120, 4, '#e8a63a', 'c');
    txt('KITAB KHUSUS TERKUMPUL: ' + S.specials.length + ' DARI 5', VW / 2, 150, 1, '#9fb5a8', 'c');
    for (let i = 0; i < 5; i++) bookSprite(SPECIALS[i].id, VW / 2 - 72 + i * 29, 162, !S.specials.includes(SPECIALS[i].id));
    if (S.endT > 11.5 && Math.floor(S.t * 1.6) % 2 === 0) txt('TEKAN APA SAJA UNTUK MAIN LAGI', VW / 2, 334, 1, '#d9e6dc', 'c');
  }
}

/* ---------- input ---------- */
const MOVEK = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'jump', ArrowDown: 'down', s: 'down', S: 'down' };
const FIREK = { j: 1, J: 1, k: 1, K: 1, x: 1, X: 1, f: 1, F: 1 };
const INTK = { e: 1, E: 1, Enter: 1 };
function uiAdvance(pt, key) {
  if (S.mode === 'title') {
    let ch = key === '5' ? 5 : key === '4' ? 4 : key === '3' ? 3 : key === '2' ? 2 : 1;
    if (pt) { const b = TITLE_BTN.find(b => pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h); if (b) ch = b.ch; else if (pt.y > 296) return true; }
    if (!chUnlocked(ch)) { S.titleMsg = { s: 'BAB ' + ch + ' MASIH TERKUNCI. SELESAIKAN BAB ' + (ch - 1) + ' DULU', t: 2.6 }; sfx('dud'); return true; }
    if (ch === 1) startIntro(); else showCard(ch, false);
    return true;
  }
  if (S.mode === 'intro') { introAdvance(); return true; }
  if (S.mode === 'card') { if (S.card.t > 1.0) startGame(S.card.ch, S.card.keep); return true; }
  if (S.mode === 'end') { if (S.endT > 12) { S.mode = 'title'; S.t = 0; } return true; }
  if (S.modal) { modalAdvance(); return true; }
  return false;
}
const act = rep => { keys.fire = 1; if (!rep) { keys.firePressed = 1; keys.interactPressed = 1; } };
window.addEventListener('keydown', e => {
  audioStart();
  if (e.key === 'm' || e.key === 'M') { setMuted(!A.muted); return; }
  if (S.mode !== 'play') { if (!e.repeat) uiAdvance(null, e.key); e.preventDefault(); return; }
  if (S.modal) { if (!e.repeat && (INTK[e.key] || e.key === ' ' || e.key === 'ArrowUp' || FIREK[e.key])) modalAdvance(); e.preventDefault(); return; }
  if (e.key === 'r' || e.key === 'R') { if (S.p && !S.p.dead) respawn(true); return; }
  const k = MOVEK[e.key];
  if (k) { if (!keys[k] && k === 'jump') keys.jumpPressed = 1; keys[k] = 1; e.preventDefault(); return; }
  if (FIREK[e.key] || INTK[e.key]) { act(e.repeat); e.preventDefault(); }      // one action key: E (J, K, X, F, S and Enter do the same)
});
window.addEventListener('keyup', e => {
  const k = MOVEK[e.key]; if (k) { keys[k] = 0; e.preventDefault(); }
  if (FIREK[e.key] || INTK[e.key]) { keys.fire = 0; e.preventDefault(); }
});
window.addEventListener('blur', () => { keys.left = keys.right = keys.jump = keys.fire = keys.down = 0; });
const ROOT = document.getElementById('root') || document.body;
let ROT = false;
function toCanvas(e) {                          // screen point -> game pixel, also when the whole game is turned sideways
  let u = e.clientX, v = e.clientY;
  if (ROT) { u = e.clientY; v = innerWidth - e.clientX; }
  const L = ROT ? { x: cv.offsetLeft, y: cv.offsetTop } : (() => { const r = cv.getBoundingClientRect(); return { x: r.left, y: r.top }; })();
  return { x: (u - L.x) / cv.offsetWidth * VW, y: (v - L.y) / cv.offsetHeight * VH };
}
let wentFull = false;
function goLandscape() {                         // phones: full screen, locked sideways (Android); iPhone falls back to turning the page
  if (wentFull || TEST || !document.body.classList.contains('touch')) return; wentFull = true;
  const el = document.documentElement, rq = el.requestFullscreen || el.webkitRequestFullscreen;
  try { const pr = rq && rq.call(el, { navigationUI: 'hide' }); if (pr && pr.then) pr.then(() => { try { const o = screen.orientation; if (o && o.lock) o.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => {}); } catch (e) {}
}
cv.addEventListener('pointerdown', e => { audioStart(); goLandscape(); uiAdvance(toCanvas(e)); });
// on phones the keyboard words become the on-screen button symbols
function touchHint(t) {
  if (!document.body.classList.contains('touch')) return t;
  if (t.startsWith('R :')) return '';
  return t.replace('A D / PANAH : JALAN     SPASI : LOMPAT', 'JOYSTICK KANAN : JALAN     DORONG KE ATAS : LOMPAT').replace('TAHAN SPASI : NAIK     S : TURUN', 'JOYSTICK ATAS : NAIK     BAWAH : TURUN').replace(/SPASI BERKALI-KALI/g, 'LOMPAT BERKALI-KALI').replace(/SPASI/g, 'LOMPAT');
}
function bindBtn(id, down, up) {
  const b = document.getElementById(id); if (!b) return;
  const on = e => { e.preventDefault(); audioStart(); goLandscape(); if (uiAdvance()) return; down(); };
  const off = e => { e.preventDefault(); up(); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
}
// right thumb: one joystick. sideways = walk, up = jump (diagonal = running jump), down = climb down
const JOY = document.getElementById('joy'), JB = document.getElementById('jb'), JK = document.getElementById('jk');
let joy = null;
function joyPt(e) { return ROT ? { x: e.clientY, y: innerWidth - e.clientX } : { x: e.clientX, y: e.clientY }; }
function joySet(dx, dy) {
  const R = JB.offsetWidth * 0.42, d = Math.hypot(dx, dy), k = d > R ? R / d : 1;
  JK.style.transform = 'translate(' + (dx * k).toFixed(1) + 'px,' + (dy * k).toFixed(1) + 'px)';
  const nx = dx / R, ny = dy / R;
  keys.left = nx < -0.3 ? 1 : 0; keys.right = nx > 0.3 ? 1 : 0;
  const up = ny < -0.5 && ny < -Math.abs(nx) * 0.45;          // pushed up (straight or diagonal)
  if (up && !keys.jump) keys.jumpPressed = 1;
  keys.jump = up ? 1 : 0;
  keys.down = ny > 0.55 && ny > Math.abs(nx) * 0.8 ? 1 : 0;
}
function joyEnd(e) {
  if (!joy || e.pointerId !== joy.id) return;
  joy = null; keys.left = keys.right = keys.jump = keys.down = 0;
  JK.style.transform = ''; JB.classList.remove('on');
}
if (JOY) {
  JOY.addEventListener('pointerdown', e => {
    e.preventDefault(); audioStart(); goLandscape(); if (uiAdvance()) return;
    if (joy) return;
    const p = joyPt(e); joy = { id: e.pointerId, x: p.x, y: p.y };   // the stick centres wherever the thumb lands
    try { JOY.setPointerCapture(e.pointerId); } catch (_) {}
    JB.classList.add('on'); joySet(0, 0);
  });
  JOY.addEventListener('pointermove', e => { if (!joy || e.pointerId !== joy.id) return; e.preventDefault(); const p = joyPt(e); joySet(p.x - joy.x, p.y - joy.y); });
  JOY.addEventListener('pointerup', joyEnd); JOY.addEventListener('pointercancel', joyEnd);
}
bindBtn('bf', () => act(false), () => keys.fire = 0);

/* ---------- boot ---------- */
function fit() {
  const touch = document.body.classList.contains('touch');
  ROT = touch && innerHeight > innerWidth;                // held upright: play sideways anyway
  const W = ROT ? innerHeight : innerWidth, H = ROT ? innerWidth : innerHeight;
  ROOT.classList.toggle('rot', ROT); ROOT.style.width = W + 'px'; ROOT.style.height = H + 'px';
  ROOT.style.setProperty('--u', (W / 100).toFixed(2) + 'px'); ROOT.style.setProperty('--b', Math.round(Math.min(W * 0.095, H * 0.16, 62)) + 'px');
  let s = Math.min(W / VW, H / VH);
  if (s >= 2) s = Math.floor(s);
  cv.style.width = Math.round(VW * s) + 'px'; cv.style.height = Math.round(VH * s) + 'px';
  const k = Math.max(1, Math.min(4, Math.round(s * (window.devicePixelRatio || 1))));       // whole-number blow-up keeps the pixel art even
  cv.width = VW * k; cv.height = VH * k;
}
addEventListener('resize', fit); addEventListener('orientationchange', () => setTimeout(fit, 120));
document.addEventListener('visibilitychange', () => { if (A.ctx && !TEST) { if (document.hidden) A.ctx.suspend(); else A.ctx.resume(); } });
if (matchMedia('(pointer:coarse)').matches) document.body.classList.add('touch');
fit();

loadChapter(1); initWorld();
window.__g = { CH, terrY, slopeAt, spiderHurt, kingHurt, readShrine, reveal, startMirage, dropStone, get KING() { return KING; }, get C5() { return C5; }, get SPIDER() { return SPIDER; }, get LOGS() { return LOGS; }, CLIMBS, BRANCHES, HIDES, SWINGS, swingEnd, L1, L2, tryClimb, updateStalk, get STALK() { return STALK; }, get LOGB() { return LOGB; }, POOLS, MUDS, TORCHES, loadChapter, floorAt, surfY, wetDepth, poolAt, douse, relight, pullLever, showCard, uiAdvance, get LEVER() { return LEVER; }, get EEL() { return EEL; }, PROP, S, keys, ZONES, MON, REEDS, updateBoat, updatePuzzles, cutRope, startMonster, introAdvance, startIntro, rectOf, dynSolids, canPush, boatRect, gateRect, BOAT_MIN, BOAT_MAX, CART0, PLATE_X, GATE_X, TREE_X, ROPE, SNAG_X, STOPPER, update, render, startGame, solids, sawPos, saws, SAW, circleHit, hb, ov, grounds, piers, PLAT, traps, pits, kill, respawn, tryFire, spawnMos, openModal, modalAdvance, hitMos, hitCreature, A, SFX, AMB, audioBuild, audioTick, sfx, BOOKS, BASE_FIRE, SPECIALS, hutDefs, ambDefs, curFire, lanternWorld, SPIT_RANGE, crPt, crPose, GY, PIER_Y, END_X, TEST };
loadAll(() => loadFont(() => {
  ['far', 'mid', 'mid2', 'mid3', 'far3', 'far4', 'mid4', 'far5', 'mid5', 'near_top', 'near_bot', 'reeds', 'lever'].forEach(mirror);
  buildProps(); useSprites();
  FOG1 = makeFog(320, 90, 1.3); FOG2 = makeFog(256, 70, 4.1);
  S.camR = 0;
  window.__g.ready = true;
  if (TEST) return;
  let last = performance.now(), acc = 0;
  function frame(now) {
    const dtf = Math.min(0.1, (now - last) / 1000); acc += dtf; last = now;
    while (acc >= 1 / 60) { update(1 / 60); acc -= 1 / 60; }
    audioTick(dtf);
    render(); requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}));

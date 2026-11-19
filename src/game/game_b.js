
/* ---------- physics ---------- */
const hb = p => ({ x: p.x - HW, y: p.y - PH, w: HW * 2, h: PH });
const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const rectOf = o => ({ x: o.x - o.w / 2, y: terrY(o.x) - o.h, w: o.w, h: o.h });
const pushables = () => [S.crate, S.cart];
const BOAT_Y = GY + 4;
const boatRect = () => ({ x: S.boat.x - BOAT_HW, y: BOAT_Y, w: BOAT_HW * 2, h: 12, boat: true });
const gateRect = () => ({ x: S.gate.x - 6, y: GY - 118 - S.gate.open * 124, w: 12, h: 118 });
function dynSolids() {
  const L = [];
  if (S.gate.open < 0.96) L.push(gateRect());
  const t = S.tree;
  if (t.state === 0) L.push({ x: t.x - 13, y: GY - 420, w: 26, h: 420 });
  else if (t.state === 2) L.push({ x: t.x, y: GY - 24, w: t.L, h: 24 });
  L.push(boatRect());
  for (const b of S.branches) if (!b.gone) L.push(b);
  for (const t of S.thorns) if (t.st < 2) L.push(t.rect);
  if (S.logb.state === 2) L.push(S.logb.rect);
  for (const w of S.webs) if (w.st < 2) L.push(w.rect);
  ch5Solids(L);
  return L;
}
function canPush(o, nx) {
  const r = { x: nx - o.w / 2, y: terrY(nx) - o.h, w: o.w, h: o.h };
  for (const s of solids) if (ov(r, s)) return false;
  for (const s of dynSolids()) if (ov(r, s)) return false;
  for (const q of pushables()) if (q !== o && ov(r, rectOf(q))) return false;
  return grounds.some(g => nx >= g[0] + 4 && nx <= g[1] - 4) || !!(poolAt(nx) || poolAt(nx - 5) || poolAt(nx + 5));
}
function moveX(p, dx) {
  p.x += dx; let pushing = null;
  const all = solids.concat(dynSolids());
  for (const s of all) {
    if (ov(hb(p), s)) {
      const d = p.y - s.y;
      if (d > 0 && d <= 8 && !p.dead) p.y = s.y;
      else { p.x = dx > 0 ? s.x - HW : s.x + s.w + HW; p.vx = 0; }
    }
  }
  if (p.ground && !p.dead) { const f = floorAt(p.x); if (f !== null && Math.abs(p.y - f) <= 12) p.y = f; }      // follow the pool bed up and down
  for (const o of pushables()) {
    const cr = rectOf(o), h = hb(p);
    if (ov(h, cr) && p.y - cr.y > 0 && p.y - cr.y <= 8) p.y = cr.y;
    else if (ov(h, cr)) {
      const pen = dx > 0 ? (h.x + h.w - cr.x) : (cr.x + cr.w - h.x);
      const d = Math.sign(dx) * pen;
      if (dx !== 0 && canPush(o, o.x + d)) { o.x += d; pushing = o; }
      else { p.x = dx > 0 ? cr.x - HW : cr.x + cr.w + HW; p.vx = 0; }
    }
  }
  return pushing;
}
function moveY(p, dy) {
  p.y += dy; p.ground = false; p.standOn = null;
  // pushables are inset 1.5px per side so a player pressed against one is never snapped onto its roof by float error
  const list = solids.concat(dynSolids(), pushables().map(o => { const r = rectOf(o); return { x: r.x + 1.5, y: r.y, w: r.w - 3, h: r.h, o }; }));
  for (const s of list) {
    if (ov(hb(p), s)) {
      if (dy > 0) { p.y = s.y; p.vy = 0; p.ground = true; p.standOn = s; }
      else if (dy < 0) { p.y = s.y + s.h + PH; p.vy = 0; }
    }
  }
  const fl = floorAt(p.x);
  if (fl !== null && dy >= 0 && p.y >= fl) { p.y = fl; p.vy = 0; p.ground = true; p.standOn = null; }
  p.onBoat = !!(p.ground && p.standOn && p.standOn.boat);
}
function sawPos(i, t) {
  const s = saws[i], u = (((t / SAW.T + s.ph) % 1) + 1) % 1;
  const ease = v => v * v * (3 - 2 * v);
  let y;
  if (u < 0.42) y = SAW.hi;
  else if (u < 0.52) y = SAW.hi + (SAW.lo - SAW.hi) * ease((u - 0.42) / 0.10);
  else if (u < 0.74) y = SAW.lo;
  else y = SAW.lo + (SAW.hi - SAW.lo) * ease((u - 0.74) / 0.26);
  return { x: s.px + Math.sin(t * 1.3 + i) * 2, y };
}
function circleHit(c, r, rect) {
  const nx = Math.max(rect.x, Math.min(c.x, rect.x + rect.w)), ny = Math.max(rect.y, Math.min(c.y, rect.y + rect.h));
  return (c.x - nx) ** 2 + (c.y - ny) ** 2 < r * r;
}

/* ---------- combat helpers ---------- */
/* where the lantern is: in whichever hand the current pose holds it, or set down on the boat deck while punting */
function lantBase() { const p = S.p; return { x: S.boat.x + p.lantX, y: BOAT_Y + 1 }; }
function lanternWorld(raw) {
  const p = S.p;
  if (!raw && !p.dead && p.poleK > 0.5) return { x: S.boat.x + p.lantX, y: BOAT_Y - 4 };
  let f = S.frame; if (raw || !META[f] || f === 'p_poleA') f = (raw && META[f] && f !== 'p_poleA' && !f.startsWith('p_push')) ? f : 'p_idle';
  const m = META[f], back = f.startsWith('p_push') ? PUSH_BACK * p.pushK : 0;
  return { x: p.x + (m.lx - m.ax - back) * p.dir, y: p.y + (m.ly - m.ay) };
}
const PUSH_BACK = 17;        // the push pose stands this far behind the hitbox so the palms meet the cart
const curFire = () => S.buff.type ? BOOKS[S.buff.type] : BASE_FIRE;
function toast(s, t) { S.toast = { s, t: t || 2.4, max: t || 2.4 }; }
function hurtPlayer(dmg, src) {
  const p = S.p; if (p.dead || p.inv > 0) return false;
  S.hp -= dmg; p.inv = 1.25; S.flash = 0.3; S.shake = 0.25; sfx('hurt'); S.lastHurt = src;
  if (src === 'mosquito') S.stats.bites++; if (src === 'goo') S.stats.goo++;
  burstParts(p.x, p.y - 20, 8, ['#8e2a22', '#c0392b'], 120, 120);
  if (S.hp <= 0) { S.hp = 0; kill('hp'); }
  return true;
}
function killMos(m, how) {
  if (m.dead) return; m.dead = true; S.stats.kills++;
  if (how === 'shatter') { sfx('shatter'); burstParts(m.x, m.y, 24, ['#bfe3f0', '#ffffff', '#7fb6d6'], 220, 200, { life: 0.7 }); }
  else if (how === 'burn') { sfx('pop'); burstParts(m.x, m.y, 22, ['#ff8a2a', '#ffd36a', '#1e2527'], 200, 180, { life: 0.8 }); }
  else { sfx('pop'); burstParts(m.x, m.y, 14, ['#406458', '#e66228', '#1e2527'], 180, 160); }
}
function hitMos(m, F) {
  if (m.dead || m.burn > 0) return;
  m.hit = 0.14;
  if (m.frozen > 0) { killMos(m, 'shatter'); return; }
  const dir = Math.sign(m.x - S.p.x) || 1;
  if (F.kind === 'freeze') { m.frozen = 2.8; m.st = 'frozen'; m.fv = 0; sfx('freeze'); burstParts(m.x, m.y, 10, ['#bfe3f0', '#ffffff'], 120, 60, { g: 100 }); return; }
  if (F.kind === 'burn') { m.burn = 0.85; m.st = 'burn'; m.t = 0; sfx('pop'); return; }
  m.hp -= F.dmg;
  if (m.hp <= 0) { killMos(m, 'fire'); return; }
  m.vx = dir * 170; m.vy = -60; sfx('pop');
  if (m.st === 'dive' || m.st === 'tele') { m.st = 'recover'; m.t = 0; }
  m.cool = Math.max(m.cool, 0.6);
}
function releaseGrab(hurt) {
  const p = S.p, cr = S.cr; p.grab = null;
  if (hurt) hurtPlayer(1, 'claw');
  p.inv = Math.max(p.inv, 1.4); sfx('free');
  cr.cx = Math.min(cr.cx, p.x - 150); cr.cd = 2.6;
  if (cr.st !== 'frozen') { cr.st = 'recover'; cr.t = 0; }
}
function hitCreature(F) {
  const cr = S.cr, p = S.p;
  if (F.kind === 'freeze') { cr.st = 'frozen'; cr.t = 2.8; sfx('freeze'); if (p.grab) releaseGrab(false); return; }
  if (cr.st === 'grab' || cr.st === 'frozen') return;
  cr.cx -= F.kind === 'burn' ? 38 : F.dmg > 1 ? 28 : 14;
  if (cr.st === 'tele' || cr.st === 'spit') { cr.st = 'recover'; cr.t = 0.1; cr.cd = 1.8; }
  if (F.kind === 'burn') cr.flare = 1.4;
  burstParts(cr.cx + 18, p.y - 26, 8, F.fl, 100, 60, { g: -30 });
}
function tryFire() {
  const p = S.p; if (!p || p.dead || S.fireCd > 0 || S.modal || p.climb || p.swing || p.hidden) return false;
  if (!p.lit) { S.fireCd = 0.5; sfx('dud'); if (!S.toast) toast('LENTERA PADAM. CARI OBOR BATU', 1.6); return false; }
  const F = curFire(); S.fireCd = 0.34;
  if (p.raiseK < 0.5) p.fireT = 0.45;                 // the lantern comes back to the hand to shoot
  const L = lanternWorld(p.raiseK < 0.5);
  if (p.webbed > 0) { p.webbed = 0; burstParts(p.x, p.y - 16, 12, ['#d9e6dc', '#ff8a2a', '#8aa294'], 110, 90, { life: 0.5 }); sfx('webburn'); toast('JARING TERBAKAR LEPAS', 1.2); }
  if (p.leech > 0) { burstParts(p.x, p.y - 12, 6 + p.leech * 4, ['#ff8a2a', '#3a1210', '#120a0a'], 110, 90, { life: 0.5 }); p.leech = 0; p.leechT = 0; p.leechDmg = 0; sfx('sizzle'); toast('LINTAH TERBAKAR LEPAS', 1.2); }
  S.flames.push({ x: L.x, y: L.y, dir: p.dir, t: 0, life: 0.26, F, hit: new Set(), cHit: false });
  sfx('fire', F.kind === 'freeze' ? 'white' : F.kind === 'burn' ? 'orange' : F.dmg > 1 ? 'brown' : 'base'); S.flameLight = 0.3;
  if (p.grab) { if (F.kind === 'freeze') hitCreature(F); else p.grab.got += F.kind === 'burn' ? 2 : F.dmg > 1 ? 1.5 : 1; }
  return true;
}
function updateFlames(dt) {
  const p = S.p, cr = S.cr;
  for (const f of S.flames) {
    f.t += dt;
    if (!p.dead) { const L = lanternWorld(); f.x = L.x; f.y = L.y; }
    const r = f.F.reach * Math.min(1, f.t / 0.09);
    const R = { x: f.dir > 0 ? f.x : f.x - r, y: f.y - 22, w: r + 2, h: 36 };
    for (const m of S.mos) if (m.t >= 0 && !m.dead && !f.hit.has(m) && circleHit({ x: m.x, y: m.y }, 11, R)) { f.hit.add(m); hitMos(m, f.F); }
    if (!f.cHit && cr.act && cr.st !== 'rise' && cr.st !== 'leave' && ov(R, { x: cr.cx - 90 + CR_VIS, y: 0, w: 125, h: VH })) { f.cHit = true; hitCreature(f.F); }
    if (S.tree.state === 0 && ov(R, ROPE)) { S.tree.burn += dt; if (Math.random() < 0.8) S.parts.push({ x: ROPE.x + 8 + Math.random() * 24, y: ROPE.y + 6 + Math.random() * 40, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 30, life: 0.35, col: ['#ff8a2a', '#ffd36a', '#d9481f'][(Math.random() * 3) | 0], g: -40, sz: 2 }); if (S.tree.burn > 0.32) cutRope(); }
    for (const g of S.snags) if (g.st === 0 && ov(R, { x: g.x - 15, y: GY - 34, w: 30, h: 50 })) { g.st = 1; g.t = 0; sfx('burnwood'); }
    for (const w of S.webs) if (w.st === 0 && ov(R, { x: w.rect.x - 6, y: w.rect.y, w: w.rect.w + 12, h: w.rect.h })) { if (w.thick && S.spider.st !== 'dead') { if (!S.toast) toast('JARING INI TERLALU TEBAL. PENENUNNYA MASIH HIDUP', 2); } else { w.burn += dt; if (w.burn > 0.14) { w.st = 1; w.t = 0; sfx('webburn'); } } }
    { const sp = S.spider; if (SPIDER && (sp.st === 'down' || sp.st === 'drop') && sp.hitT <= 0 && ov(R, { x: sp.x - 18, y: sp.y - 16, w: 36, h: 30 })) spiderHurt(); }
    ch5Flame(R, dt);
    for (const t of S.thorns) if (t.st === 0 && ov(R, t.rect)) { t.burn += dt; if (t.burn > 0.25) { t.st = 1; t.t = 0; sfx('burnwood'); } }
    if (LOGB && S.logb.state === 0 && ov(R, LOGB.rope)) { S.logb.burn += dt; if (Math.random() < 0.8) S.parts.push({ x: LOGB.rope.x + 8 + Math.random() * 18, y: LOGB.rope.y + 6 + Math.random() * 34, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 30, life: 0.4, col: Math.random() < 0.5 ? '#ff8a2a' : '#ffd36a', g: -40, sz: 2 }); if (S.logb.burn > 0.32) { S.logb.state = 1; S.logb.vy = 0; sfx('rope'); toast('TALI PUTUS. BATANG JATUH', 2); } }
    for (let i = 0; i < 4; i++) {
      const d = Math.random() * r * Math.min(1, f.t / 0.09 + 0.2);
      S.parts.push({ x: f.x + f.dir * (6 + d), y: f.y + (Math.random() - 0.5) * (6 + d * 0.18), vx: f.dir * (40 + Math.random() * 90), vy: -Math.random() * 46, life: 0.2 + Math.random() * 0.22, col: f.F.fl[(Math.random() * 3) | 0], g: -70, sz: Math.random() < 0.5 ? 3 : 2 });
    }
  }
  S.flames = S.flames.filter(f => f.t < f.life);
}

/* ---------- mosquitoes ---------- */
function spawnMos(n, grp) {
  for (let i = 0; i < n; i++) S.mos.push({ grp, x: S.cam + VW + 30 + i * 36, y: 30 + Math.random() * 50, vx: 0, vy: 0, hp: 4, st: 'enter', t: -i * 0.6, face: -1, hit: 0, burn: 0, frozen: 0, seed: Math.random() * 6.28, cool: 0.6 + Math.random() * 0.6, dead: false, wt: 0, fv: 0, dvx: 0, dvy: 0, travel: 0, maxTravel: 0 });
  S.warn = 1.8; sfx('whine');
}
function updateMos(dt) {
  const p = S.p;
  for (const m of S.mos) {
    m.t += dt; if (m.t < 0) continue;
    m.wt += dt; if (m.hit > 0) m.hit -= dt;
    m.face = (p.x - m.x) >= 0 ? 1 : -1;
    m.x += m.vx * dt; m.y += m.vy * dt; const dr = Math.pow(0.03, dt); m.vx *= dr; m.vy *= dr;
    if (m.st === 'enter') {
      const ax = p.x + p.dir * 70, ay = Math.max(40, p.y - 82), dx = ax - m.x, dy = ay - m.y, d = Math.hypot(dx, dy) || 1;
      if (d < 16 || m.t > 3.5) { m.st = 'hover'; m.t = 0; } else { m.x += dx / d * 215 * dt; m.y += dy / d * 215 * dt; }
    } else if (m.st === 'hover') {
      const ax = p.x + p.dir * (60 + Math.sin(m.seed + S.t * 0.8) * 34), ay = Math.max(34, p.y - 56 + Math.sin(S.t * 1.9 + m.seed) * 10);
      m.x += (ax - m.x) * Math.min(1, dt * 2.6); m.y += (ay - m.y) * Math.min(1, dt * 2.6);
      m.cool -= dt;
      if (p.hidden) m.cool = Math.max(m.cool, 0.8);          // they hunt the light: a covered lantern gives them nothing to dive at
      if (m.cool <= 0 && !p.dead) {
        if (S.mos.filter(o => o !== m && !o.dead && (o.st === 'tele' || o.st === 'dive')).length >= (S.mos.length >= 3 ? 2 : 1)) m.cool = 0.5;
        else { m.st = 'tele'; m.t = 0; sfx('whine'); }
      }
    } else if (m.st === 'tele') {
      m.x += (Math.random() - 0.5) * 1.4; m.y += (Math.random() - 0.5) * 1.4 - 8 * dt;
      if (m.t >= 0.55) {
        const dx = p.x - m.x, dy = p.y - 18 - m.y, d = Math.hypot(dx, dy) || 1;
        m.dvx = dx / d * 235; m.dvy = dy / d * 235; m.travel = 0; m.maxTravel = d + 60; m.st = 'dive'; m.t = 0;
      }
    } else if (m.st === 'dive') {
      m.x += m.dvx * dt; m.y += m.dvy * dt; m.travel += 235 * dt;
      m.y = Math.min(m.y, (onPier(m.x) ? PIER_Y : GY) - 8);
      if (!p.dead && p.inv <= 0 && circleHit({ x: m.x, y: m.y }, 10, hb(p))) { hurtPlayer(1, 'mosquito'); m.st = 'recover'; m.t = 0; }
      else if (m.travel >= m.maxTravel || m.t > 1.1) { m.st = 'recover'; m.t = 0; }
    } else if (m.st === 'recover') {
      const ax = p.x + p.dir * 60, ay = Math.max(34, p.y - 90), dx = ax - m.x, dy = ay - m.y, d = Math.hypot(dx, dy) || 1;
      if (d < 22 || m.t > 1.4) { m.st = 'hover'; m.t = 0; m.cool = 0.5 + Math.random() * 0.6; }
      else { m.x += dx / d * 175 * dt; m.y += dy / d * 175 * dt; }
    } else if (m.st === 'frozen') {
      m.frozen -= dt; m.fv += 700 * dt; m.y += m.fv * dt;
      const ly = (onPier(m.x) ? PIER_Y : GY) - 14; if (m.y > ly) { m.y = ly; m.fv = 0; }
      if (m.frozen <= 0) { m.st = 'recover'; m.t = 0; m.fv = 0; }
    } else if (m.st === 'burn') {
      m.burn -= dt; m.x += Math.cos(m.t * 25 + m.seed) * 80 * dt; m.y += Math.sin(m.t * 31) * 80 * dt + 30 * dt;
      S.parts.push({ x: m.x + (Math.random() - 0.5) * 14, y: m.y + (Math.random() - 0.5) * 10, vx: 0, vy: -30, life: 0.3, col: ['#ff8a2a', '#ffd36a', '#d9481f'][(Math.random() * 3) | 0], g: -50, sz: 2 });
      if (m.burn <= 0) killMos(m, 'burn');
    }
  }
  S.mos = S.mos.filter(m => !m.dead);
  S.amb.forEach((a, i) => { if (a.done && !a.cleared && !S.mos.some(m => m.grp === i)) { a.cleared = true; } });
}

/* ---------- puzzles: cart + plate + gate, burnable rope + falling tree, boat + snags ---------- */
function cutRope() {
  const t = S.tree; if (t.state !== 0) return;
  t.state = 1; t.ft = 0; sfx('rope'); burstParts(ROPE.x + 20, ROPE.y + 30, 10, ['#ff8a2a', '#ffd36a', '#3a3322'], 140, 120);
}
function updatePuzzles(dt) {
  const p = S.p, cart = S.cart, pl = S.plate, g = S.gate;
  { const q = poolAt(cart.x);                       // on a hillside the cart rolls by itself, and carries whoever stands on it
    if ((q && q.hill) || Math.abs(cart.v) > 2) {            // (it keeps rolling a little way onto the flat)
      const sl = q && q.hill ? slopeAt(cart.x) : 0, x0 = cart.x; cart.coast = 0;
      cart.v += 1250 * sl * dt; cart.v *= Math.exp(-(q && q.hill ? (Math.abs(sl) < 0.02 ? 4 : 0.3) : 1.4) * dt); cart.v = clamp(cart.v, -270, 270);
      const nx = cart.x + cart.v * dt;
      if (Math.abs(cart.v) > 2 && canPush(cart, nx)) { cart.x = nx; cart.wheel += cart.v * dt; if (Math.abs(cart.v) > 60) { S.pushT -= dt; if (S.pushT <= 0) { sfx('cart'); S.pushT = 0.22; } } } else { if (Math.abs(cart.v) > 90) { sfx('loghit'); S.shake = 0.3; } cart.v = 0; }
      if (p && !p.dead && p.standOn && p.standOn.o === cart) { p.x += cart.x - x0; p.y = rectOf(cart).y; p.gy = p.y; }
    } else cart.v = 0; }
  // cart: coasts a little after it is let go, wheels turn with distance
  if (cart.coast) {
    const nx = cart.x + cart.coast * dt;
    if (Math.abs(cart.coast) > 3 && canPush(cart, nx)) { cart.wheel += cart.coast * dt; cart.x = nx; } else cart.coast = 0;
    cart.coast *= Math.exp(-7 * dt);
  }
  // plate + gate
  const down = KING ? (S.king && S.king.st === 'dead') : Math.abs(cart.x - pl.x) < 14;
  if (down !== pl.down) {
    pl.down = down; sfx('plate'); S.shake = Math.max(S.shake, 0.12);
    burstParts(pl.x, GY - 2, 8, ['#8aa294', '#4a4636'], 80, 50, { g: 200 });
  }
  const go = down ? 1 : 0, was = g.open;
  g.open += clamp(go - g.open, -dt * 1.6, dt * 0.55);
  if (g.open > 0.01 && g.open < 0.99 && Math.floor(g.open * 10) !== Math.floor(was * 10) && Math.random() < 0.7) sfx('gate', g.open);
  // tree
  const t = S.tree;
  if (t.state === 1) {
    t.ft = Math.min(1, t.ft + dt / 1.3); t.ang = lerp(0.05, Math.PI / 2, Math.pow(t.ft, 2.3));
    if (Math.random() < 0.4) burstParts(TREE_X + Math.sin(t.ang) * 120, GY - Math.cos(t.ang) * 120 - 20, 1, ['#3a3322', '#242014'], 60, 20, { g: 300 });
    if (t.ft >= 1) {
      t.state = 2; t.ang = Math.PI / 2; sfx('treefall'); S.shake = 0.7;
      burstParts(TREE_X + t.L, GY + 8, 26, ['#a8c4b6', '#6f8f84', '#ffffff'], 260, 260, { life: 0.8 });
      burstParts(TREE_X, GY - 10, 14, ['#6b5a3a', '#3a3322', '#8aa294'], 160, 120);
    }
  }
  // snags burn away
  for (const sg of S.snags) if (sg.st === 1) {
    sg.t += dt;
    if (Math.random() < 0.9) S.parts.push({ x: sg.x + (Math.random() - 0.5) * 26, y: GY + 2 - Math.random() * 18, vx: 0, vy: -26, life: 0.4, col: ['#ff8a2a', '#ffd36a', '#d9481f'][(Math.random() * 3) | 0], g: -60, sz: Math.random() < 0.5 ? 3 : 2 });
    if (sg.t > 0.95) { sg.st = 2; sfx('pop'); burstParts(sg.x, GY, 14, ['#3a3322', '#242014', '#ff8a2a'], 160, 120); }
  }
}
function updateBoat(dt) {
  const b = S.boat, p = S.p, on = p && !p.dead && p.onBoat && !S.modal;
  let hi = BOAT_MAX; for (const sg of S.snags) if (sg.st !== 2) hi = Math.min(hi, sg.x - 15 - BOAT_HW - 1);
  let tv = 0;
  if (on) {
    const mx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    const dockWalk = (mx > 0 && b.x >= BOAT_MAX - 0.5) || (mx < 0 && b.x <= BOAT_MIN + 0.5);
    p.boatDrive = mx && !dockWalk ? mx : 0;
    tv = p.boatDrive * 58;
  } else if (p) p.boatDrive = 0;
  b.v += clamp(tv - b.v, -75 * dt, 75 * dt);
  const nx = clamp(b.x + b.v * dt, BOAT_MIN, hi), dx = nx - b.x;
  if (Math.abs(dx) < Math.abs(b.v * dt) * 0.5) b.v *= 0.5;
  b.x = nx; b.bob += dt;
  if (on && dx) p.x += dx;
  if (on && p.boatDrive) p.x += (b.x + p.dir * 14 - p.x) * Math.min(1, dt * 4);   // drift to the bow side so the flame reaches what blocks the boat
  if (Math.abs(b.v) > 10 && on) { b.padT -= dt; if (b.padT <= 0) { sfx('paddle'); b.padT = 0.62; } } else b.padT = 0.2;
}

/* ---------- creature ---------- */
// map a point in creature-sprite coordinates to world coordinates (body leans about the hips)
function crPt(sx, sy) {
  const cr = S.cr, c = Math.cos(cr.lean), s = Math.sin(cr.lean), dx = sx - 58, dy = sy - 150;
  return { x: cr.cx - 140 + CR_VIS + 58 + dx * c - dy * s, y: 18 + 150 + dx * s + dy * c };
}
function gooHit(x, y) {
  const p = S.p; p.goo = Math.max(p.goo, 2.2); sfx('splat');
  burstParts(x, y, 14, ['#6bbf4a', '#2f7d32', '#9be07a'], 160, 130, { life: 0.6, g: 500 });
  hurtPlayer(1, 'goo');
}
const SPIT_LEAD = 1.2;     // seconds of lead on a running player: a flat-out runner is clipped, someone who slows, stops or jumps is not
const spitArc = d => clamp(30 + d * 0.14, 50, 92), spitT = d => 0.6 + d / 900;
function updateSpits(dt) {
  const p = S.p;
  for (const s of S.spits) {
    s.t += dt; const u = Math.min(1, s.t / s.T);
    s.x = lerp(s.x0, s.x1, u); s.y = lerp(s.y0, s.y1, u) - 4 * s.h * u * (1 - u);
    if (Math.random() < 0.8) S.parts.push({ x: s.x, y: s.y, vx: (Math.random() - 0.5) * 24, vy: 10, life: 0.4, col: Math.random() < 0.5 ? '#6bbf4a' : '#2f7d32', g: 260, sz: 2 });
    if (!p.dead && p.inv <= 0 && circleHit({ x: s.x, y: s.y }, 6, hb(p))) { s.done = true; gooHit(s.x, s.y); }
    else if (u >= 1) {
      s.done = true; sfx('splat');
      const onGround = s.y1 >= GY - 2 ? grounds.some(g => s.x1 > g[0] + 4 && s.x1 < g[1] - 4) : onPier(s.x1);
      burstParts(s.x1, s.y1, 12, ['#6bbf4a', '#2f7d32', '#9be07a'], 150, 110, { life: 0.55, g: 500 });
      if (onGround) S.puddles.push({ x: s.x1, y: s.y1 + 2, w: 38, t: 3.6, max: 3.6, seed: Math.random() * 6 });
    }
  }
  S.spits = S.spits.filter(s => !s.done);
  for (const q of S.puddles) {
    q.t -= dt;
    if (!p.dead && !p.grab && ov(hb(p), { x: q.x - q.w / 2, y: q.y - 10, w: q.w, h: 12 })) { p.goo = Math.max(p.goo, 1.6); if (p.inv <= 0) gooHit(p.x, p.y - 4); }
  }
  S.puddles = S.puddles.filter(q => q.t > 0);
}
function startMonster() {
  const p = S.p, cr = S.cr; S.mon = 'active';
  Object.assign(cr, newCreature(p.x), { act: true, st: 'rise', t: 0, alpha: 0, cx: p.x - 230, pcx: p.x - 230, cd: 0.5 });
  sfx('monrise'); S.shake = 0.9; S.flash = 0;
}
function updateCreature(dt) {
  const cr = S.cr, p = S.p;
  if (S.mon === 'idle' && !p.dead && p.x >= MON.trigger) startMonster();
  if (!cr.act) { S.intensity += (0 - S.intensity) * Math.min(1, dt * 3); return; }
  if (S.mon === 'active' && p.x >= MON.end && cr.st !== 'leave' && cr.st !== 'grab') { cr.st = 'leave'; cr.t = 0; sfx('monleave'); }
  const e = clamp((p.x - MON.trigger) / (MON.end - MON.trigger), 0, 1);
  const cap = lerp(270, 210, e);          // set-piece pace: it keeps a spitting distance behind a runner, closes on a hesitating player
  const spd = 50 + e * 12;
  if (cr.cd > 0) cr.cd -= dt; if (cr.flare > 0) cr.flare -= dt;
  const g = p.x - cr.cx;
  let tv = 0;
  if (g < 60 && !p.dead && !p.grab && p.inv <= 0 && (cr.st === 'chase' || cr.st === 'tele' || cr.st === 'recover' || cr.st === 'spit')) { cr.st = 'grab'; cr.t = 0; p.grab = { got: 0 }; p.vx = 0; p.vy = 0; S.stats.grabs++; sfx('grab'); S.shake = 0.3; }
  switch (cr.st) {
    case 'chase':
      cr.catchUp = Math.min(12, cr.catchUp + dt * 3);
      tv = spd + (g > cap ? Math.min((g - cap) * cr.catchUp, 110) : 0);
      if (g < SPIT_RANGE && cr.cd <= 0 && !p.dead && !p.grab) { cr.st = 'tele'; cr.t = 0; cr.sy = clamp(p.y, 100, GY); cr.tx = p.x; sfx('roar'); }
      break;
    case 'tele': {
      cr.t += dt; tv = spd * 0.25;
      if (cr.t < 0.62) { cr.sy = clamp(p.y, 100, GY); cr.tx = clamp(p.x + p.vx * SPIT_LEAD, cr.cx + 120, cr.cx + 440); }
      if (Math.random() < 0.6) { const M = crPt(150, 46); S.parts.push({ x: M.x, y: M.y + 2, vx: (Math.random() - 0.3) * 14, vy: 20, life: 0.5, col: Math.random() < 0.5 ? '#6bbf4a' : '#9be07a', g: 320, sz: 2 }); }
      if (cr.t >= 0.95) {
        const M = crPt(150, 46);
        S.spits.push({ x: M.x, y: M.y, x0: M.x, y0: M.y, x1: cr.tx, y1: cr.sy - 2, t: 0, T: spitT(cr.tx - M.x), h: spitArc(cr.tx - M.x), done: false });
        cr.st = 'spit'; cr.t = 0; cr.cd = 1.7 + Math.random() * 0.8; sfx('spit');
      }
      break;
    }
    case 'spit':
      cr.t += dt; tv = spd * 0.4;
      if (cr.t > 0.45) cr.st = 'chase';
      break;
    case 'recover':
      cr.t += dt; tv = spd * 0.5;
      if (cr.t > 0.7) { cr.st = 'chase'; cr.cd = Math.max(cr.cd, 1.6) + Math.random() * 0.8; }
      break;
    case 'rise':
      cr.t += dt; cr.alpha = clamp(cr.t / 0.8, 0, 1); tv = spd * 0.6; cr.lean = 0.02 + 0.1 * Math.sin(Math.min(1, cr.t / 1.0) * Math.PI);
      if (cr.t < 1.6) S.shake = Math.max(S.shake, 0.08);
      if (cr.t >= 1.0) { cr.st = 'chase'; cr.cd = 0.5; }
      break;
    case 'leave':
      cr.t += dt; tv = 0; cr.alpha = clamp(1 - cr.t / 2.6, 0, 1);
      if (cr.alpha <= 0) { cr.act = false; S.mon = 'done'; }
      break;
    case 'grab': {
      cr.t += dt; cr.cx += ((p.x - 110) - cr.cx) * Math.min(1, dt * 1.2); cr.v = 0;
      const M = crPt(150, 46), T = 0.5, tx = p.x - M.x, ty = p.y - 22 - M.y;
      for (let i = 0; i < 3; i++) S.parts.push({ x: M.x, y: M.y, vx: tx / T + (Math.random() - 0.5) * 30, vy: (ty - 0.5 * 320 * T * T) / T + (Math.random() - 0.5) * 30, life: T * 0.95, col: ['#6bbf4a', '#2f7d32', '#9be07a'][(Math.random() * 3) | 0], g: 320, sz: Math.random() < 0.4 ? 3 : 2 });
      p.goo = Math.max(p.goo, 0.5);
      if (cr.t > 1.5 && !p.dead) kill('eaten');
      break;
    }
    case 'frozen':
      cr.t -= dt; cr.v = 0;
      if (cr.t <= 0) { cr.st = 'chase'; cr.cd = 1.5; cr.catchUp = 1.2; }
      break;
  }
  if (cr.st !== 'grab' && cr.st !== 'frozen') { cr.v += clamp(tv - cr.v, -70 * dt, 70 * dt); cr.cx += cr.v * dt; }
  // walk animation: leg phase follows the distance actually travelled (no foot sliding)
  const mv = cr.cx - cr.pcx; cr.pcx = cr.cx;
  if (mv > 0 && cr.st !== 'frozen') cr.phase = (cr.phase + mv / (2 * STRIDE)) % 1;
  if (cr.st !== 'frozen') cr.walk += ((mv > 0.02 ? 1 : 0) - cr.walk) * Math.min(1, dt * 3);
  const si = Math.floor(cr.phase * 2);
  if (si !== cr.stIdx) {            // a foot just planted: heavy thud, nearer = louder
    if (cr.stIdx !== undefined && cr.walk > 0.5 && cr.st !== 'frozen' && !p.dead) { const near = clamp(1 - (p.x - cr.cx - 40) / 420, 0.12, 1); sfx('stomp', near); if (near > 0.5) S.shake = Math.max(S.shake, 0.06); }
    cr.stIdx = si;
  }
  let lt = 0.05;
  if (cr.st === 'tele') lt = 0.05 + 0.2 * Math.min(1, cr.t / 0.55);
  else if (cr.st === 'spit') lt = -0.1 * (1 - cr.t / 0.45);
  else if (cr.st === 'grab') lt = 0.34;
  else if (cr.st === 'frozen') lt = 0.02;
  cr.lean += (lt - cr.lean) * Math.min(1, dt * (cr.st === 'spit' ? 18 : 7));
  const at = cr.st === 'grab' ? -0.6 : cr.st === 'tele' ? -0.18 : 0;
  cr.arm += (at - cr.arm) * Math.min(1, dt * 6);
  const gg = p.x - cr.cx;
  S.intensity += (clamp(1 - (gg - 60) / 230, 0, 1) - S.intensity) * Math.min(1, dt * 3);
}

/* ---------- chapter 2: water, mud, leeches, lantern, sluice, the thing under the water ---------- */
function douse() {
  const p = S.p; if (!p.lit) return;
  p.lit = false; sfx('hiss'); toast('LENTERA PADAM! CARI OBOR BATU ATAU LAMPU', 2.6);
  const L = lanternWorld(); burstParts(L.x, L.y, 12, ['#c9d8cd', '#8aa294', '#ffffff'], 60, 110, { life: 0.9, g: -60 });
}
function relight() {
  const p = S.p; if (p.lit) return;
  p.lit = true; sfx('relight'); toast('LENTERA MENYALA LAGI', 1.6);
  const L = lanternWorld(); burstParts(L.x, L.y, 10, ['#ff8a2a', '#ffd36a'], 80, 90, { life: 0.5, g: -40 });
}
function pullLever() {
  if (S.sluice.pulled) return;
  S.sluice.pulled = true; sfx('lever'); sfx('drain'); S.shake = 0.5; toast('PINTU AIR TERBUKA. AIR MULAI SURUT', 2.6);
}
function updateSluice(dt) {
  const s = S.sluice; if (!s.pulled || s.k >= 1) return;
  s.k = Math.min(1, s.k + dt / 4.2);
  const q = LEVER ? POOLS[LEVER.pool] : null;
  if (q && Math.random() < 0.7) { const x = q.x1 - 14 + Math.random() * 10; S.parts.push({ x, y: surfY(q) - 2, vx: 30 + Math.random() * 40, vy: -20 - Math.random() * 40, life: 0.5, col: Math.random() < 0.5 ? '#a8c4b6' : '#6f8f84', g: 400, sz: 2 }); }
}
function updateSwamp(dt, wd, inMud) {
  const p = S.p; if (p.dead) return;
  const q = poolAt(p.x);
  // lantern: a deep plunge or water over the raised arm puts it out; stone torches light it again
  if (wd > 33) douse();
  for (const tx of TORCHES) if (!p.lit && Math.abs(p.x - tx) < 22 && Math.abs(p.y - GY) < 30) relight();
  // air: head under water
  if (wd > 31) { p.air -= dt; if (Math.random() < 0.3) S.parts.push({ x: p.x + (Math.random() - 0.5) * 6, y: p.y - 30, vx: 0, vy: -30, life: 0.5, col: '#a8c4b6', g: -40, sz: 2 }); if (p.air <= 0) { kill('water'); return; } }
  else p.air = Math.min(2.5, p.air + dt * 1.5);
  // quicksand
  if (inMud) { p.sink += 15 * dt; if (Math.random() < 0.1) S.parts.push({ x: p.x + (Math.random() - 0.5) * 16, y: GY - 1, vx: 0, vy: -14, life: 0.4, col: '#4a3a28', g: 60, sz: 2 }); if (p.sink > 30) { kill('mud'); return; } }
  else if (p.sink > 0) p.sink = Math.max(0, p.sink - 70 * dt);
  // leeches: they find you when you stand still in their water
  if (q && q.leech && wd > 3 && p.leech < 3) {
    p.leechT += dt * (Math.abs(p.vx) < 15 ? 1.25 : 0.3);
    if (p.leechT >= 1) { p.leechT = 0; p.leech++; sfx('leech'); toast(p.lit ? 'LINTAH! TEKAN E UNTUK MEMBAKARNYA' : 'LINTAH MENEMPEL!', 1.8); }
  }
  if (p.leech >= 3) { p.leechDmg += dt; if (p.leechDmg > 3.2) { p.leechDmg = 0; hurtPlayer(1, 'leech'); } }
}
function updateEel(dt) {
  const e = S.eel, p = S.p; if (!EEL || e.st === 'done' || p.dead) return;
  const wet = wetDepth() > 3;
  if (e.st === 'off') {
    if (p.x > EEL.x0 + 36 && p.x < EEL.x1 - 20 && wet) { e.st = 'lurk'; e.t = 1.7; e.side = 1; toast('ADA YANG BERGERAK DI BAWAH AIR. NAIK KE BATU!', 3.2); sfx('eelwarn'); S.shake = 0.3; }
    return;
  }
  if (p.x >= EEL.x1 + 4) { e.st = 'done'; sfx('monleave'); toast('RIAK ITU MENJAUH', 2); return; }
  if (p.x < EEL.x0 - 30) { e.st = 'off'; return; }
  e.wig += dt;
  const bite = () => { if (hurtPlayer(2, 'eel')) { sfx('eelbite'); p.vx = e.dir * 60; douse(); burstParts(p.x, p.y - wetDepth(), 16, ['#a8c4b6', '#8e2a22', '#ffffff'], 170, 200, { life: 0.6 }); } e.st = 'flee'; e.t = 1.7; };
  if (e.st === 'lurk') {
    e.t -= dt;
    if (e.t <= 0) {
      e.side = -e.side; let sx = p.x + e.side * 270;
      if (sx < EEL.x0 + 20 || sx > EEL.x1 - 20) { e.side = -e.side; sx = clamp(p.x + e.side * 270, EEL.x0 + 20, EEL.x1 - 20); }
      e.x = sx; e.st = 'hunt'; sfx('eelwarn');
    }
  } else if (e.st === 'hunt') {
    const d = p.x - e.x; e.dir = Math.sign(d) || 1; e.x += e.dir * (EEL.spd + (Math.sign(p.vx) === e.dir && Math.abs(p.vx) > 20 ? 75 : 0)) * dt;     // it swims you down from behind
    if (Math.abs(d) < 14) { if (wet) bite(); else { e.st = 'circle'; e.t = 1.3; sfx('eelbump'); S.shake = 0.25; } }
  } else if (e.st === 'circle') {
    e.t -= dt; e.x = p.x + Math.sin(e.wig * 5) * 24;
    if (wet && p.inv <= 0) bite(); else if (e.t <= 0) { e.st = 'flee'; e.t = 1.7; }
  } else if (e.st === 'flee') {
    e.x = clamp(e.x + e.dir * 170 * dt, EEL.x0 + 14, EEL.x1 - 14); e.t -= dt;
    if (e.t <= 0) { e.st = 'lurk'; e.t = 1.0; }
  }
  if (e.st === 'hunt' || e.st === 'circle') S.intensity = Math.max(S.intensity, clamp(1 - (Math.abs(p.x - e.x) - 30) / 220, 0, 1));
}

/* ---------- chapter 3: climbing, swinging, brittle branches, thorns, hiding, the thing that walks under the canopy ---------- */
function tryClimb() {
  const p = S.p;
  for (const c of CLIMBS) if (Math.abs(p.x - c.x) < 13 && p.y <= c.y0 + 1 && p.y > c.y1 + 3) {
    p.climb = c; p.x = c.x; p.vx = p.vy = 0; p.ground = false; p.onBoat = false; p.hopArm = false; p.dir = 1; sfx('grabrope'); return true;
  }
  return false;
}
function updateHang(dt) {
  const p = S.p, mx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  if (!mx) p.hopArm = true;
  p.ground = false; p.standOn = null; p.hangT += dt;
  if (p.climb) {
    const c = p.climb, y0 = p.y;
    if (keys.jump) p.y -= 60 * dt; else if (c.rope || keys.down) p.y += (keys.down ? 135 : 92) * dt;      // a rope lets you slide; a trunk has to be climbed down
    if (Math.floor(y0 / 9) !== Math.floor(p.y / 9)) sfx('climb');
    p.vx = p.vy = 0; keys.jumpPressed = 0;
    if (p.y <= c.y1) { p.y = c.y1; p.climb = null; p.ground = true; p.coyote = 0.1; if (c.rope) { p.x = c.x - c.side * 13; p.dir = -c.side; } }     // over the top, onto the branch / ledge
    else if (p.y >= c.y0) { p.y = c.y0; p.climb = null; p.gy = p.y; if (c.rope) p.dir = c.side; }
    else if (mx && p.hopArm) { p.climb = null; p.dir = mx; p.vx = mx * 110; p.vy = -190; p.gy = p.y; sfx('jump'); }
  } else {
    const sw = p.swing, e = swingEnd(sw, S.t), e0 = swingEnd(sw, S.t - dt);
    p.x = e.x; p.y = e.y + 26; p.vx = p.vy = 0; if (mx) p.dir = mx;
    if (keys.jumpPressed) {                                                                               // let go: keep the swing's speed, plus a kick
      keys.jumpPressed = 0; p.swing = null; p.swingCd = 0.5; p.gy = Math.max(p.y, GY - 30);
      p.vx = clamp((e.x - e0.x) / dt * 1.05, -260, 260); p.vy = Math.min((e.y - e0.y) / dt, 0) - 210; sfx('jump');
    }
  }
}
function updateForest(dt, inThick) {
  const p = S.p;
  for (const b of S.branches) {
    if (b.gone) { b.regen -= dt; if (b.regen <= 0 && Math.abs(p.x - (b.x + b.w / 2)) > 100) { b.gone = false; b.t = -1; } continue; }
    if (b.t >= 0) { b.t -= dt; if (b.t <= 0) { b.gone = true; b.regen = 5; sfx('snap'); burstParts(b.x + b.w / 2, b.y + 4, 14, ['#49362e', '#7e6643', '#2d241d'], 120, 60, { life: 0.9 }); } }
  }
  for (const t of S.thorns) {
    if (t.st === 2) continue;
    if (t.st === 1) { t.t += dt; if (Math.random() < 0.7) S.parts.push({ x: t.x + (Math.random() - 0.5) * t.w, y: t.y - 8 - Math.random() * 34, vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 40, life: 0.45, col: Math.random() < 0.5 ? '#ff8a2a' : '#ffd36a', g: -50, sz: 2 }); if (t.t > 1.1) { t.st = 2; burstParts(t.x, t.y - 10, 12, ['#2d241d', '#17100b', '#ff8a2a'], 90, 80); } }
    const h = hb(p);
    if (!p.dead && ov({ x: h.x - 3, y: h.y, w: h.w + 6, h: h.h }, t.rect) && hurtPlayer(1, 'thorn')) { p.vx = (p.x < t.x ? -1 : 1) * 140; p.vy = -110; p.climb = null; sfx('thorn'); }
  }
  if (inThick && !p.dead && hurtPlayer(1, 'thorn')) { sfx('thorn'); if (!S.toast) toast('BELUKAR DURI! NAIK KE POHON', 2); }
  const L = S.logb;
  if (LOGB && L.state === 1) { L.vy += 900 * dt; L.y += L.vy * dt; if (L.y >= GY - 8) { L.y = GY - 8; L.state = 2; S.shake = 0.6; sfx('treefall'); burstParts(LOGB.x + LOGB.w / 2, GY, 20, ['#8aa294', '#49362e'], 220, 120); } }
}
function updateStalk(dt) {
  const e = S.stalk, p = S.p; if (!STALK || e.st === 'done' || p.dead) return;
  const up = p.y < GY - 60;
  if (e.st === 'off') {
    if (p.x > STALK.x0 && p.x < STALK.x1 - 30 && up) { e.st = 'wait'; e.t = 2.4; e.n = 0; e.side = 1; S.shake = 0.5; sfx('stomp'); toast('TANAH BERGETAR. SEMBUNYI DI RIMBUN DAUN SAAT IA MENDONGAK', 3.6); }
    return;
  }
  if (p.x >= STALK.x1) { e.st = 'done'; sfx('monleave'); toast('LANGKAH ITU MENJAUH', 2); return; }
  if (p.x < STALK.x0 - 40) { e.st = 'off'; return; }
  const strike = () => { if (hurtPlayer(3, 'stalk')) { sfx('stalkhit'); S.shake = 0.7; p.climb = null; p.swing = null; p.vy = -160; p.vx = -e.dir * 90; } e.st = 'leave'; e.t = 1.7; };
  if (e.st === 'wait') {
    e.t -= dt;
    if (e.t <= 0) { e.side = -e.side; e.x = p.x + e.side * 300; e.st = 'approach'; e.t = 0; e.stepT = 0.3; sfx('stalkroar'); S.shake = Math.max(S.shake, 0.45); }
  } else if (e.st === 'approach') {
    e.t += dt; const d = p.x - e.x; e.dir = Math.sign(d) || 1; e.x += e.dir * 150 * dt; e.walk += dt;
    e.stepT -= dt; if (e.stepT <= 0) { e.stepT = Math.PI / 6; sfx('stomp'); S.shake = Math.max(S.shake, 0.18); }      // one thud per footfall of the walk cycle
    if (Math.abs(d) < 46 || e.t > 2.6) { e.st = 'look'; e.t = 0; sfx('stalklook'); }      // it stops beside you and lifts its head to branch height
  } else if (e.st === 'look') {
    e.t += dt; e.look = Math.min(1, e.look + dt * 2.2);
    if (e.t > 0.7 && !p.hidden && Math.abs(p.x - e.x) < 190) strike();           // it sees any light, and anything on the ground
    else if (e.t > 2.4) { e.st = 'leave'; e.t = 1.7; }
  } else if (e.st === 'leave') {
    e.t -= dt; e.look = Math.max(0, e.look - dt * 2.5); e.x += -e.side * 120 * dt; e.walk += dt;
    e.stepT -= dt; if (e.stepT <= 0) { e.stepT = Math.PI / 6; sfx('stomp'); }
    if (e.t <= 0) { e.st = 'wait'; e.t = Math.max(1.5, 3.0 - e.n * 0.5); e.n++; }
  }
  if (e.st === 'approach' || e.st === 'look') S.intensity = Math.max(S.intensity, 0.9);
}

/* ---------- chapter 4: rolling logs, webs, the weaver ---------- */
function updateSlopes(dt) {
  const p = S.p;
  if (p.webbed > 0) { p.webbed -= dt; if (!S.toast) toast('TERJERAT JARING! TEKAN E UNTUK MEMBAKARNYA', 1.4); }
  if (LOGS) {
    if (p.x > LOGS.x0 && p.x < LOGS.x1 && !p.dead) { S.logT -= dt; if (S.logT <= 0) { S.logT = LOGS.every; S.logs.push({ x: LOGS.x, v: -40, rot: 0, dead: false }); sfx('logroll'); } }
    for (const L of S.logs) {
      L.v = Math.max(-185, L.v - 150 * dt); L.x += L.v * dt; L.rot += L.v * dt / 10; const y = terrY(L.x);
      if (!p.dead && Math.abs(p.x - L.x) < 14 && p.y > y - 17 && p.y < y + 4) { if (hurtPlayer(2, 'log')) { sfx('loghit'); p.vx = -230; p.vy = -170; p.ground = false; } }
      if (L.x < LOGS.x0 - 16) { L.dead = true; burstParts(L.x, y - 8, 12, ['#49362e', '#7e6643', '#2d241d'], 130, 90, { life: 0.7 }); sfx('snap'); }
    }
    S.logs = S.logs.filter(L => !L.dead);
  }
  for (const w of S.webs) if (w.st === 1) { w.t += dt; if (Math.random() < 0.8) S.parts.push({ x: w.x + (Math.random() - 0.5) * 12, y: w.y - Math.random() * 70, vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 30, life: 0.4, col: Math.random() < 0.5 ? '#ff8a2a' : '#ffd36a', g: -50, sz: 2 }); if (w.t > 0.45) w.st = 2; }
}
function spiderHurt() {
  const sp = S.spider; sp.hp--; sp.hitT = 0.5; sfx('spiderhit'); S.shake = 0.3;
  burstParts(sp.x, sp.y, 16, ['#ff8a2a', '#ffd36a', '#1b0d0d'], 150, 120, { life: 0.6 });
  if (sp.hp <= 0) { sp.st = 'dead'; sp.t = 0; sfx('spiderdie'); S.shake = 0.8; S.stats.kills++; toast('PENENUN ITU TERBAKAR. JARING TEBALNYA KINI RAPUH', 3); }
  else { sp.st = 'up'; sp.t = 0; }
}
function updateSpider(dt) {
  const sp = S.spider, p = S.p; if (!SPIDER || p.dead) return;
  sp.leg += dt; if (sp.hitT > 0) sp.hitT -= dt; if (sp.biteT > 0) sp.biteT -= dt;
  const fy = terrY(sp.x);
  if (sp.st === 'dead') { if (sp.y < fy - 10) sp.y = Math.min(fy - 10, sp.y + 420 * dt); return; }
  const inside = p.x > SPIDER.x0 && p.x < SPIDER.x1;
  if (sp.st === 'off') { if (inside) { sp.st = 'lurk'; sp.t = 1.6; sp.n = 0; sp.y = -40; sfx('spiderdrop'); S.shake = 0.3; toast('SESUATU BERGERAK DI ATAS. BAKAR SAAT IA TURUN', 3.2); } return; }
  if (!inside && sp.st === 'lurk') { sp.st = 'off'; return; }
  if (sp.blob) {                                        // a ball of web on its way down
    const b = sp.blob; b.t += dt; const u = Math.min(1, b.t / 0.5); b.x = b.x0 + (b.x1 - b.x0) * u; b.y = b.y0 + (b.y1 - b.y0) * u * u;
    if (u >= 1) { if (Math.abs(p.x - b.x1) < 18 && Math.abs(p.y - b.y1) < 30) { p.webbed = 2.4; sfx('webstick'); } burstParts(b.x1, b.y1 - 6, 10, ['#d9e6dc', '#8aa294'], 90, 60, { life: 0.5 }); sp.blob = null; }
  }
  if (sp.st === 'lurk') {
    sp.t -= dt; sp.x += clamp(p.x - sp.x, -70 * dt, 70 * dt); sp.x = clamp(sp.x, SPIDER.x0 + 20, SPIDER.x1 - 20); sp.y = -40;
    if (sp.t <= 0) {
      sp.n++;
      if (sp.n % 3 === 2 && !sp.blob) { sp.blob = { x0: sp.x, y0: 6, x1: p.x + p.vx * 0.3, y1: p.y, x: sp.x, y: 6, t: 0 }; sfx('webshot'); sp.t = 0.9; }
      else { sp.st = 'tele'; sp.t = 0.7; sp.tx = p.x; sfx('spiderdrop'); }
    }
  } else if (sp.st === 'tele') {                        // a thread comes down first: that is where it will land
    sp.t -= dt; sp.x += (sp.tx - sp.x) * Math.min(1, dt * 6); if (sp.t <= 0) { sp.st = 'drop'; sp.x = sp.tx; }
  } else if (sp.st === 'drop') {
    sp.y += 560 * dt; if (sp.y >= fy - 22) { sp.y = fy - 22; sp.st = 'down'; sp.t = 1.5 + sp.hp * 0.08; S.shake = 0.3; sfx('land'); }
  } else if (sp.st === 'down') {
    sp.t -= dt; sp.x += clamp(p.x - sp.x, -34 * dt, 34 * dt); sp.x = clamp(sp.x, SPIDER.x0 + 20, SPIDER.x1 - 20); sp.y = terrY(sp.x) - 22;
    if (sp.t <= 0) { sp.st = 'up'; sp.t = 0; }
  } else if (sp.st === 'up') {
    sp.y -= 300 * dt; if (sp.y <= -40) { sp.st = 'lurk'; sp.t = 0.8 + sp.hp * 0.12; }
  }
  if ((sp.st === 'drop' || sp.st === 'down') && sp.biteT <= 0 && Math.abs(p.x - sp.x) < 22 && Math.abs(p.y - 14 - sp.y) < 26) { sp.biteT = 1.1; if (hurtPlayer(2, 'spider')) { sfx('eelbite'); p.vx = (p.x < sp.x ? -1 : 1) * 170; p.vy = -120; } }
  if (sp.st !== 'lurk') S.intensity = Math.max(S.intensity, 0.85);
}

/* ---------- huts / modal ---------- */
function openModal(h) {
  S.modal = { kind: 'book', h, stage: 0, t: 0, flash: 0 }; S.fade = 1; sfx('door');
  keys.left = keys.right = 0; keys.jumpPressed = 0; keys.interactPressed = 0; keys.firePressed = 0;
  S.p.vx = 0;
}
const SHRINE_COL = { ungu: '#b388ff', merah: '#ff6b5b', hijau: '#7be27b', kuning: '#ffe06a' };
function readShrine(h) {
  h.looted = true; sfx('special'); toast(h.lore[0] + '  ' + h.lore[1], 5.2);
  burstParts(h.x, h.y - 40, 14, [SHRINE_COL[h.need] || '#f1d88a'], 90, 90, { life: 0.8 });
}
function closeModal() {
  S.modal = null; if (S.cr.act) S.cr.cx = Math.min(S.cr.cx + 28, S.p.x - 70); S.fade = Math.max(S.fade, 0.5);
  keys.jumpPressed = 0; keys.interactPressed = 0; keys.firePressed = 0;
}
function modalAdvance() {
  const m = S.modal; if (!m || m.t < 0.4) return;
  if (m.stage === 0) {
    const h = m.h; S.buff = { type: h.book, t: BUFF_T }; S.hp = Math.min(S.maxHp, S.hp + 1); h.looted = true; sfx('read');
    m.stage = 1; m.t = 0; m.flash = 0.5;
  } else if (m.stage === 1) {
    const h = m.h;
    if (h.special && !S.specials.includes(h.special)) { S.specials.push(h.special); m.stage = 2; m.t = 0; m.flash = 0.5; sfx('special'); }
    else closeModal();
  } else closeModal();
}

/* ---------- update ---------- */
function kill(kind) {
  const p = S.p; if (p.dead) return;
  p.dead = true; S.death = { kind }; S.deadT = 0; track('mati-bab' + S.chapter + '-' + kind);
  if (kind === 'water') { sfx('splash'); burstParts(p.x, Math.min(p.y, WATER_Y), 16, '#a8c4b6', 110, 190); }
  else if (kind === 'mud') { sfx('death', 'mud'); sfx('mud'); }
  else if (kind === 'eaten') { sfx('death', 'eaten'); burstParts(p.x, p.y - 20, 14, ['#8e2a22', '#1e2527'], 140, 140); }
  else { sfx('death', kind); if (kind === 'spikes') p.y = Math.min(p.y, GY + 22); }
  p.vx = 0; p.vy = 0;
}
function clearEdge() { keys.jumpPressed = 0; keys.firePressed = 0; keys.interactPressed = 0; }
function update(dt) {
  S.t += dt;
  if (S.mode === 'title') { clearEdge(); return; }
  if (S.mode === 'intro') {
    S.introT += dt;
    if (S.opening) { S.openT += dt; if (S.openT >= 1.45) { S.opening = false; S.intro = 0; S.introT = 0; } }
    if (S.turn) { S.turn.t += dt; if (S.turn.t >= S.turn.dur) { S.intro = S.turn.to; S.turn = null; S.introT = 0; } }
    clearEdge(); return;
  }
  if (S.mode === 'end') { S.endT += dt; clearEdge(); return; }
  if (S.mode === 'card') { S.card.t += dt; clearEdge(); return; }
  const p = S.p;
  S.fade = Math.max(0, S.fade - dt * 2.2);
  S.lightT = Math.min(1, S.lightT + dt * 1.3);
  if (S.flash > 0) S.flash -= dt; if (S.shake > 0) S.shake -= dt; if (S.flameLight > 0) S.flameLight -= dt; if (S.warn > 0) S.warn -= dt;
  if (S.toast) { S.toast.t -= dt; if (S.toast.t <= 0) S.toast = null; }
  updateParts(dt);
  { let z = 0; if (S.p) for (const q of ZONES) z = Math.max(z, clamp((Math.min(S.p.x - q.x0, q.x1 - S.p.x) + 90) / 180, 0, 1)); S.zoneK += (z - S.zoneK) * Math.min(1, dt * 1.6); }
  if (S.modal) { S.modal.t += dt; if (S.modal.flash > 0) S.modal.flash -= dt; clearEdge(); return; }

  if (p.dead) {
    S.deadT += dt; updateMos(dt); updateBoat(dt); updatePuzzles(dt); updateSluice(dt);
    if (S.deadT > 1.6) S.fade = Math.min(1, (S.deadT - 1.6) / 0.45);
    if (S.deadT > 2.1) respawn();
    clearEdge(); return;
  }
  if (p.inv > 0) p.inv -= dt;
  updateBoat(dt); updatePuzzles(dt);
  if (p.goo > 0) { p.goo -= dt; if (Math.random() < 0.5) S.parts.push({ x: p.x + (Math.random() - 0.5) * 10, y: p.y - 12 - Math.random() * 20, vx: 0, vy: 10, life: 0.35, col: '#6bbf4a', g: 300, sz: 2 }); }
  if (S.fireCd > 0) S.fireCd -= dt;
  if (S.buff.type) { S.buff.t -= dt; if (S.buff.t <= 0) { S.buff = { type: null, t: 0 }; toast('EFEK KITAB HABIS. API KEMBALI TIPIS'); } }

  // one action button: next to something usable it uses it, otherwise it breathes fire
  S.near = null;
  if (p.ground && !p.grab) {
    for (const h of S.huts) if (!h.looted && Math.abs(p.x - h.x) < 24 && Math.abs(p.y - h.y) < 2) S.near = { kind: 'hut', h };
    if (LEVER && !S.sluice.pulled && Math.abs(p.x - LEVER.x) < 22 && Math.abs(p.y - LEVER.y) < 3) S.near = { kind: 'lever' };
  }
  if (p.ground && !p.grab && !S.near) for (const h of HIDES) if (Math.abs(p.y - h.y) < 2 && p.x >= h.x && p.x <= h.x + h.w) S.near = { kind: 'hide' };
  S.nearHut = S.near && S.near.kind === 'hut' ? S.near.h : null;
  if (!keys.fire) S.actLock = false;
  if (keys.interactPressed) {
    keys.interactPressed = 0;
    if (S.near && S.near.kind !== 'hide') { S.actLock = true; if (S.near.kind === 'hut') { if (S.near.h.shrine) readShrine(S.near.h); else openModal(S.near.h); return; } pullLever(); }
  }
  const inHide = !!(S.near && S.near.kind === 'hide') || !!(S.mir && S.mir.type === 'hijau' && p.ground);
  const fireHeld = keys.fire && !S.actLock && !inHide;
  { const was = p.hidden; p.hidden = inHide && !!keys.fire && !p.grab; if (p.hidden && !was) sfx('hide'); }       // in a leafy clump the action button covers the lantern
  const inThick = p.ground && p.y >= GY - 0.5 && thickAt(p.x);
  if (p.swingCd > 0) p.swingCd -= dt;
  const wd = wetDepth(), inMud = p.ground && p.y >= GY - 0.5 && p.y <= GY + 0.5 && mudAt(p.x);
  p.wet = wd;

  if (p.grab) {
    p.vx = 0; p.vy = 0;
    if (keys.jumpPressed) { p.grab.got += 1; keys.jumpPressed = 0; }
    if (fireHeld) tryFire();
    if (p.grab && p.grab.got >= 3) releaseGrab(true);
    S.frame = 'p_idle';
  } else if (p.climb || p.swing) {
    updateHang(dt);
  } else {
    const mx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (mx) p.dir = mx;
    if (keys.jumpPressed && tryClimb()) keys.jumpPressed = 0;
    let slow = 1;
    if (p.ground && mx) for (const o of pushables()) if (Math.abs(p.x + mx * 12 - o.x) < o.w / 2 + 10 && p.y > GY - 8 && (mx > 0 ? p.x < o.x : p.x > o.x)) slow = Math.min(slow, o.slow);
    const wf = clamp(1 - (wd - 3) * 0.028, 0.3, 1), jf = wd < 6 ? 1 : clamp(1 - (wd - 6) * 0.045, 0, 1);      // deeper water = heavier legs, weaker jump
    const gm = (p.goo > 0 ? 0.45 : 1) * wf * (inMud || p.sink > 2 ? 0.4 : 1) * (1 - 0.13 * p.leech) * (p.hidden ? 0.3 : 1) * (inThick ? 0.5 : 1);
    const riding = p.onBoat && p.boatDrive;
    const hq = poolAt(p.x), sl = p.ground && hq && hq.hill && !(p.standOn && p.standOn.o) ? slopeAt(p.x) : 0, steep = Math.abs(sl) > 0.8;      // hills: slower up, faster down; too steep and you slide
    const hillF = clamp(1 + 0.45 * mx * sl, 0.6, 1.3) * (p.webbed > 0 ? 0.15 : 1);
    if (steep) { if (p.slide <= 0) sfx('slide'); p.slide = 0.55; p.slideDir = Math.sign(sl); p.dir = p.slideDir; } else if (p.slide > 0) p.slide -= dt;
    const target = riding ? 0 : steep ? Math.sign(sl) * 200 : (p.slide > 0 && mx !== -p.slideDir) ? p.slideDir * (120 + 150 * p.slide) : gm * mx * MOVE * slow * hillF;      // you keep the speed of a slide for a moment after it
    const acc = p.ground ? (S.slick > 0 ? 240 : 1800) : 1200;
    p.vx += Math.max(-acc * dt, Math.min(acc * dt, target - p.vx));

    if (keys.jumpPressed && p.sink > 3) { keys.jumpPressed = 0; p.sink = Math.max(0, p.sink - 11); sfx('mud'); burstParts(p.x, GY, 5, ['#3a2d20', '#241a12'], 70, 90, { g: 500 }); }   // wrench a leg out of the mud
    if (keys.jumpPressed) { p.buf = 0.11; keys.jumpPressed = 0; } else p.buf -= dt;
    if (jf < 0.25 || p.webbed > 0) p.buf = 0;
    if (p.ground) p.coyote = 0.1; else p.coyote -= dt;
    if (p.buf > 0 && p.coyote > 0) { p.vy = -JUMP * (p.goo > 0 ? 0.82 : 1) * (0.45 + 0.55 * jf) * (inMud ? 0.8 : 1); if (p.onBoat) p.vx = S.boat.v; p.ground = false; p.onBoat = false; p.coyote = 0; p.buf = 0; sfx('jump'); }
    if (!keys.jump && p.vy < -190) p.vy = -190;
    p.vy = Math.min(720, p.vy + GRAV * dt);

    const wasGround = p.ground, vyBefore = p.vy;
    const pushed = p.climb ? null : moveX(p, p.vx * dt);
    if (!p.climb) moveY(p, p.vy * dt);
    if (p.standOn && p.standOn.brittle && p.standOn.t < 0) { p.standOn.t = 0.85; sfx('crack'); }
    if (wasGround && !p.ground && p.vy >= 0) for (const c of CLIMBS) if (c.rope && Math.abs(p.x - c.x) < 10 && Math.abs(p.y - c.y1) < 9) {      // stepped off beside a rope: take it
      p.climb = c; p.x = c.x; p.y = c.y1 + 5; p.vx = p.vy = 0; p.hopArm = false; p.hangT = 0; sfx('grabrope'); break;
    }
    if (p.ground && !wasGround && !p.climb) {                 // a long drop without a rope hurts
      const h = p.y - p.gy;
      if (h > 80 && wetDepth() <= 6 && !p.onBoat && hurtPlayer(h > 135 ? 2 : 1, 'fall')) { sfx('land'); S.shake = 0.4; if (!S.fallTip) { S.fallTip = true; toast('JATUH DARI KETINGGIAN MELUKAIMU. TURUN LEWAT TALI', 3); } }
    }
    if (p.ground) p.gy = p.y;
    if (!p.ground && !p.climb && p.swingCd <= 0) for (const sw of SWINGS) { const e = swingEnd(sw, S.t); if (Math.hypot(p.x - e.x, p.y - 26 - e.y) < 17) { p.swing = sw; p.vx = p.vy = 0; p.hopArm = false; sfx('grabrope'); break; } }
    if (p.ground && !wasGround && wetDepth() > 6) {            // dropped into water
      const d2 = wetDepth(); sfx('plunge', Math.min(1, vyBefore / 500)); burstParts(p.x, p.y - d2, 10 + Math.round(d2 * 0.6), ['#a8c4b6', '#6f8f84', '#ffffff'], 150, 190, { life: 0.6 });
      if (vyBefore > 280 && d2 > 13) douse();
    }
    if (p.ground && !wasGround) { p.landT = vyBefore > 260 ? 0.12 : 0; if (vyBefore > 200 && wetDepth() <= 6) { sfx(p.onBoat ? 'boatland' : 'land'); burstParts(p.x, p.y, 4, p.onBoat ? '#a8c4b6' : '#8aa294', 50, 40); } }
    if (p.landT > 0) p.landT -= dt;
    if (pushed) { p.pushO = pushed; p.pushHold = 0.14; } else { p.pushHold -= dt; if (p.pushHold <= 0) p.pushO = null; }
    if (pushed) {
      S.pushT -= dt; if (S.pushT <= 0) { sfx(pushed === S.cart ? 'cart' : 'push'); S.pushT = pushed === S.cart ? 0.34 : 0.28; }
      if (pushed === S.cart) { S.cart.wheel += p.vx * dt; S.cart.coast = p.vx * 0.95; }
    }

    if ((p.ground && Math.abs(p.vx) > 8) || (p.onBoat && p.boatDrive)) {
      p.anim += dt;
      const idx = Math.floor(p.anim * 7) % 4;
      if (idx !== S.stepIdx) { S.stepIdx = idx; if (idx % 2 === 0 && !p.onBoat) { if (wd > 3) { sfx('wade', Math.min(1, wd / 24)); burstParts(p.x + p.dir * 4, p.y - wd, 3, ['#a8c4b6', '#6f8f84'], 50, 70, { life: 0.35 }); } else if (inMud) sfx('mud'); else sfx('step', p.y < GY - 30); } }
    } else { p.anim = 0; S.stepIdx = -1; }

    if (fireHeld) tryFire();
  }

  // body poses: both hands on the cart / on the punting pole
  if (p.fireT > 0) p.fireT -= dt;
  if (!p.onBoat || p.fireT > 0 || p.dead || p.grab) p.pole = false;
  else if (p.boatDrive) { if (!p.pole) { p.pole = true; p.lantX = clamp(p.x - S.boat.x + p.dir * 14, -30, 30); } }
  else if (keys.left || keys.right) p.pole = false;
  if (p.pole && Math.abs(S.boat.v) > 3) p.poleT += dt / 1.1;
  const pushing = p.pushHold > 0 && p.ground && p.fireT <= 0 && !p.grab && !p.dead ? 1 : 0;
  p.pushK += (pushing - p.pushK) * Math.min(1, dt * 14);
  p.poleK += ((p.pole ? 1 : 0) - p.poleK) * Math.min(1, dt * 9);
  p.raiseK += ((wd > 11 && !p.dead && !p.grab ? 1 : 0) - p.raiseK) * Math.min(1, dt * 8);
  p.litK += ((p.lit && !p.hidden ? 1 : 0) - p.litK) * Math.min(1, dt * (p.lit && !p.hidden ? 3 : 7));

  updateSwamp(dt, wd, inMud);
  updateForest(dt, inThick);
  updateSlopes(dt);

  // hazards
  if (p.y > WATER_Y + 14) kill('water');
  for (const pt of pits) if (ov(hb(p), { x: pt[0] + 6, y: GY + 16, w: pt[1] - pt[0] - 12, h: 50 })) kill('spikes');
  for (const t of traps) if (ov(hb(p), { x: t.x - 12, y: t.y - 11, w: 24, h: 11 })) kill('trap');
  for (let i = 0; i < saws.length; i++) if (circleHit(sawPos(i, S.t), SAW.r, hb(p))) kill('saw');

  // ambushes
  S.amb.forEach((a, i) => { if (!a.done && p.x >= a.x) { a.done = true; spawnMos(a.n, i); } });

  // combat
  updateFlames(dt); updateMos(dt); updateCreature(dt); updateSpits(dt); updateEel(dt); updateSluice(dt); updateStalk(dt); updateSpider(dt); updateKing(dt); updateCh5(dt);

  // checkpoints
  S.lamps.forEach(l => {
    if (!l.lit && Math.abs(p.x - l.x) < 26 && Math.abs(p.y - l.y) < 40) {
      l.lit = true; S.hp = S.maxHp; takeSnap(l.x - 14, l.y); sfx('lamp'); toast('LAMPU MENYALA. NYAWA PULIH', 1.8);
    }
    if (l.lit && !p.lit && Math.abs(p.x - l.x) < 26 && Math.abs(p.y - l.y) < 40) relight();
  });
  if (p.x > END_X) { track('selesai-bab' + S.chapter); saveProg(S.chapter); if (CH[S.chapter + 1]) showCard(S.chapter + 1, true); else { S.mode = 'end'; S.endT = 0; S.fade = 0; } return; }

  const tx = Math.max(0, Math.min(LEVEL_W - VW, p.x - 250 + p.dir * 40));
  S.cam += (tx - S.cam) * Math.min(1, dt * 5);
  keys.firePressed = 0;
}

/* ===== chapter 5: four memory chambers, then the fog king ===== */
const C5_IDS = ['ungu', 'merah', 'hijau', 'kuning'];
const has5 = id => S.specials.includes(id);
const REVEAL = {
  ungu: ['RAJA: "AKU SELALU MEMBAGI PANEN UNTUK RAKYATKU."', 'DI BAWAH LANTAI: GANDUM BUSUK YANG IA TIMBUN SAAT DESA KELAPARAN.'],
  merah: ['RAJA: "TAK SEORANG PUN KUBIARKAN TENGGELAM."', 'DI DASAR AIR: ORANG-ORANG LEMBAH. IA SENDIRI YANG MEMBUKA PINTU AIR.'],
  hijau: ['RAJA: "AKU TAK PERNAH TAKUT PADA APA PUN."', 'BAYANGANNYA GEMETAR, LALU MENUNJUK TOPENG PUTRI YANG IA SEMBUNYIKAN.'],
  kuning: ['RAJA: "AKU MEMIKUL SEMUA BEBAN INI SENDIRIAN."', 'RANTAINYA PUTUS. SELAMA INI PUTRINYALAH YANG IA RANTAI.']
};
const MIR_NAME = { ungu: 'PETI BAYANGAN! LOMPATI', merah: 'LANTAI BANJIR! LICIN', hijau: 'GELAP! TAHAN E, TUTUP LENTERA', kuning: 'BATU JATUH! MENGHINDAR' };
const KING_LINES = ['RAJA: "CAHAYA ITU... MENYAKITKAN."', 'RAJA: "BUKAN... AKU TIDAK MENIMBUN APA PUN..."', 'RAJA: "AIR ITU... BUKAN AKU YANG MEMBUKANYA..."', 'RAJA: "PUTRIKU... AKU HANYA INGIN IA TETAP DI SINI..."'];
function banner(lines, dur) { S.banner = { lines: Array.isArray(lines) ? lines : [lines], t: 0, dur: dur || 5 }; }

/* ---------- state ---------- */
function initKing(sn) {
  const dead = !!(sn && sn.kingDead);
  S.king = KING ? { st: dead ? 'dead' : 'off', x: KING.throne, dir: -1, t: 0, hp: dead ? 0 : KING.hp, hitT: 0, snuffCd: 2.6, vulnT: 0, stage: 0, mirCd: 5, mirNext: null, lastMir: null, alpha: dead ? 1 : 0, sink: dead ? 1 : 0, noHitT: 0, swipeCd: 1.5, sw: 0 } : null;
  S.ktorch = KING ? KING.torchL.concat(KING.torchR).map(x => ({ x, lit: true, burn: 0, flick: 0 })) : [];
  S.mir = null; S.slick = 0; S.dark = 0; S.phantoms = []; S.stones = []; S.shards = [];
  if (!sn) S.banner = null;
  initCh5(sn);
}
function initCh5(sn) {
  if (!C5) { S.c5 = null; return; }
  const keep = sn && S.c5 ? S.c5.done : null, d = sn && sn.c5done ? sn.c5done : {};
  const done = {}; C5_IDS.forEach(id => done[id] = !!(d[id] || (keep && keep[id])));      // a truth, once seen, stays seen
  S.c5 = { done, slabT: 0, lastCx: null, wrong: {}, standT: 0, standX: null, sh: { st: 'wait', t: 2.5, x: C5.hijau.from, dir: -1, cued: false }, cue: 0, rock: 0, swings: 0, lastSide: 0, kStoneCd: 1.5, fade: {}, hintT: 0 };
}
const blockRect = () => ({ x: C5.kuning.block - 22, y: GY - 44, w: 44, h: 44 });
function ch5Solids(L) {
  if (C5 && S.c5) {
    for (const id of C5_IDS) if (!S.c5.done[id]) L.push({ x: C5[id].wall - 6, y: GY - 240, w: 12, h: 240 });
    if (!S.c5.done.kuning) L.push(blockRect());
  }
  if (KING && S.king && S.king.st !== 'off' && S.king.st !== 'dead') L.push({ x: KING.x0 - 44, y: GY - 240, w: 12, h: 240 });     // no running from the throne room
}

/* ---------- the chambers ---------- */
function reveal(id) {
  const c = S.c5; if (c.done[id]) return;
  c.done[id] = true; c.fade[id] = 1;
  banner(REVEAL[id], 6); sfx('special'); sfx('shatter'); S.shake = 0.4; S.stones = [];
  burstParts(C5[id].alt - 50, GY - 60, 34, [SHRINE_COL[id], '#d9e6dc', '#9fb5a8'], 220, 170, { life: 0.9 });
  if (C5_IDS.every(k => c.done[k])) toast('EMPAT KEBOHONGAN TERBONGKAR. KABUT SANG RAJA MULAI RETAK', 4.5);
}
function dropStone(x, delay) { S.stones.push({ x, y: -20, t: -(delay || 0.85), vy: 0, hit: false, done: false }); }
function updateStones(dt) {
  const p = S.p;
  for (const s of S.stones) {
    s.t += dt; if (s.t < 0) continue;
    s.vy += 1500 * dt; s.y += s.vy * dt;
    if (!s.hit && !p.dead && Math.abs(p.x - s.x) < 13 && s.y > p.y - PH - 8 && s.y < p.y + 2) { s.hit = true; if (hurtPlayer(1, 'stone')) { p.vx = (p.x < s.x ? -1 : 1) * 150; p.vy = -90; } }
    if (s.y >= GY - 5) { s.done = true; sfx('land'); burstParts(s.x, GY - 4, 10, ['#5e553f', '#3a3322', '#8aa294'], 150, 100); S.shake = Math.max(S.shake, 0.12); }
  }
  S.stones = S.stones.filter(s => !s.done);
}
function updateCh5(dt) {
  if (S.banner) { S.banner.t += dt; if (S.banner.t > S.banner.dur) S.banner = null; }
  if (!C5 || !S.c5) return;
  const c = S.c5, p = S.p;
  for (const k in c.fade) if (c.fade[k] > 0) c.fade[k] = Math.max(0, c.fade[k] - dt * 0.7);
  if (c.cue > 0) c.cue -= dt;
  updateStones(dt);
  if (p.dead) return;
  // UNGU: shove the crate onto the slab that hides the hoard
  const u = C5.ungu;
  if (!c.done.ungu) {
    const cx = S.crate.x, still = c.lastCx !== null && Math.abs(cx - c.lastCx) < 0.05; c.lastCx = cx;
    const slab = u.slabs.find(s => Math.abs(cx - s) < 10);
    if (slab !== undefined && still) {
      c.slabT += dt;
      if (c.slabT > 0.45) {
        if (slab === u.ok) reveal('ungu');
        else if (!c.wrong[slab]) { c.wrong[slab] = 1; sfx('crack'); S.shake = 0.15; toast('LANTAINYA KOKOH. BUKAN DI SINI', 2); }
      }
    } else c.slabT = 0;
  }
  // MERAH: lantern raised over the drowned one the king lies about
  const m = C5.merah;
  if (!c.done.merah) {
    const fig = m.figs.find(f => Math.abs(p.x - f) < 16 && !c.wrong['f' + f]);
    if (fig !== undefined && !p.lit && !c.wrong.lit) { c.wrong.lit = 1; toast('LENTERAMU PADAM. NYALAKAN LAGI DI LAMPU TEPI KOLAM', 3); }
    if (fig !== undefined && p.raiseK > 0.7 && p.lit) {
      if (c.standX !== fig) { c.standX = fig; c.standT = 0; }
      c.standT += dt;
      if (c.standT > 1.3) {
        if (fig === m.ok) reveal('merah');
        else { c.wrong['f' + fig] = 1; c.fade['f' + fig] = 1; sfx('pop'); toast('HANYA BAYANGAN AIR. BUKAN DIA', 2); c.standT = 0; }
      }
    } else { c.standT = 0; c.standX = null; }
  }
  // HIJAU: hide by the altar as the frightened shadow walks past
  const h = C5.hijau, sh = c.sh, inRoom = p.x > h.x0 - 30 && p.x < h.wall;
  if (!c.done.hijau && inRoom) {
    S.intensity = Math.max(S.intensity, 0.7);
    const hd = HIDES[h.hide], inGood = p.hidden && p.x >= hd.x && p.x <= hd.x + hd.w;
    if (sh.st === 'wait') {
      sh.t -= dt;
      if (has5('hijau') && sh.t < 1.4 && !sh.cued) { sh.cued = true; c.cue = 1.4; sfx('stalklook'); }
      if (sh.t <= 0) { sh.st = 'walk'; sh.x = h.from; sh.dir = -1; sh.cued = false; }
    } else if (sh.st === 'walk') {
      sh.x -= 78 * dt;
      const d = Math.abs(sh.x - p.x);
      if (d < 40 && inGood) { sh.st = 'stop'; sh.t = 1.7; sfx('stalklook'); }
      else if (d < 22 && !p.hidden) { sh.st = 'flee'; sh.t = 0.7; sfx('stalkroar'); if (hurtPlayer(1, 'shadow')) { p.vx = -170; p.vy = -130; } toast('IA MELIHAT CAHAYAMU. TUTUP LENTERA SAAT IA LEWAT', 2.6); }
      else if (d < 30 && p.hidden && !inGood && !c.wrong.hide) { c.wrong.hide = 1; toast('IA LEWAT BEGITU SAJA. SEMBUNYILAH LEBIH DEKAT KE ALTAR', 2.6); }
      if (sh.x < h.to) { sh.st = 'wait'; sh.t = 3.5; }
    } else if (sh.st === 'stop') { sh.t -= dt; sh.dir = 1; if (sh.t <= 0) { sh.st = 'gone'; reveal('hijau'); } }
    else if (sh.st === 'flee') { sh.t -= dt; sh.x += 160 * dt; if (sh.t <= 0) { sh.st = 'wait'; sh.t = 3.5; } }
  }
  // KUNING: rock the chained weight from one side, then the other
  const k = C5.kuning;
  if (!c.done.kuning) {
    const bx = k.block, need = has5('kuning') ? 4 : 8, onFloor = p.ground && Math.abs(p.y - GY) < 1;
    const push = !onFloor ? 0 : (keys.right && p.x < bx && (bx - 22) - (p.x + HW) < 1.5) ? 1 : (keys.left && p.x > bx && (p.x - HW) - (bx + 22) < 1.5) ? -1 : 0;
    if (push) { c.rock = clamp(c.rock + push * dt * 1.5, -1, 1); p.pushHold = 0.14; S.pushT -= dt; if (S.pushT <= 0) { sfx('push'); S.pushT = 0.3; } }
    else c.rock += (0 - c.rock) * Math.min(1, dt * 2.2);
    const side = c.rock >= 0.98 ? 1 : c.rock <= -0.98 ? -1 : 0;
    if (side && side !== c.lastSide) {
      c.lastSide = side; c.swings++; sfx('loghit'); S.shake = 0.3; burstParts(bx, GY - 46, 10, ['#5e553f', '#3a3322', '#c9a24a'], 130, 90);
      if (c.swings >= need) reveal('kuning'); else toast('BEBAN BERGOYANG ' + c.swings + '/' + need + '. SEKARANG DORONG DARI SISI LAIN', 2.2);
    }
    if (c.swings > 0 && p.x > k.x0 && p.x < k.wall) { c.kStoneCd -= dt; if (c.kStoneCd <= 0) { dropStone(clamp(p.x + (Math.random() - 0.5) * 110, k.x0 + 30, k.wall - 30)); c.kStoneCd = 1.6; } }
  }
}

/* ---------- the fog king ---------- */
function snuffTorch(t) { t.lit = false; t.burn = 0; t.flick = 0; sfx('hiss'); burstParts(t.x, GY - 42, 8, ['#2d241d', '#17100b', '#5d7469'], 70, 60); }
function fogBurst(n) {
  const k = S.king, near = S.ktorch.filter(t => t.lit).sort((a, b) => Math.abs(a.x - k.x) - Math.abs(b.x - k.x)).slice(0, n);
  near.forEach(snuffTorch); burstParts(k.x, GY - 50, 26, ['#a8c4b6', '#5d7469', '#1e2527'], 260, 120, { life: 0.8, g: -40 });
}
function startMirage(type) {
  const k = S.king, p = S.p, n = 1 + k.stage;
  S.mir = { type, t: 0, dur: type === 'hijau' ? 3.2 : 4 };
  if (type === 'ungu') for (let i = 0; i < n; i++) S.phantoms.push({ x: k.x, dir: Math.sign(p.x - k.x) || 1, t: -i * 0.75, hit: false });
  else if (type === 'merah') S.slick = 4;
  else if (type === 'hijau') S.dark = 3.2;
  else for (let i = 0; i < 3 + k.stage; i++) dropStone(clamp(p.x + (i - (2 + k.stage) / 2) * 34 + (Math.random() - 0.5) * 12, KING.x0 + 20, KING.x1 - 20), 0.75 + i * 0.12);
  sfx('roar');
}
function kingHurt() {
  const k = S.king; k.hp--; k.hitT = 0.6; k.stage++; sfx('spiderhit'); S.shake = 0.5;
  burstParts(k.x, GY - 90, 18, ['#e8a63a', '#ffd36a', '#1e2527'], 180, 160, { life: 0.7 });
  if (k.hp <= 0) {
    k.st = 'dying'; k.t = 2.6; sfx('spiderdie'); S.shake = 1; S.stats.kills++; S.mir = null; S.slick = 0; S.dark = 0; S.phantoms = []; S.stones = [];
    S.ktorch.forEach(t => { t.lit = true; t.flick = 0; }); banner('MAHKOTA ITU PECAH. KABUT LEPAS DARI TUBUH SANG RAJA.', 5);
  } else { S.shards.push({ x: clamp(k.x - k.dir * 20, KING.x0 - 10, KING.x1 + 10), y: GY - 100, vy: -120, t: 0 }); k.st = 'stagger'; k.t = 1.0; banner(KING_LINES[KING.hp - k.hp - 1] || KING_LINES[0], 4); }
}
function updateKing(dt) {
  const k = S.king, p = S.p; if (!k) return;
  if (k.hitT > 0) k.hitT -= dt;
  if (k.noHitT > 0) k.noHitT -= dt;
  for (const t of S.ktorch) if (t.flick > 0) { t.flick -= dt; if (t.flick <= 0 && t.lit) snuffTorch(t); }
  if (k.st === 'dying') { k.t -= dt; k.sink = Math.min(1, k.sink + dt / 2.2); if (Math.random() < 0.6) burstParts(k.x + (Math.random() - 0.5) * 60, GY - 20 - Math.random() * 70, 1, ['#a8c4b6', '#5d7469'], 40, 40, { g: -60, life: 0.9 }); if (k.t <= 0) k.st = 'dead'; return; }
  if (k.st === 'dead' || p.dead) return;
  if (k.st === 'off') {
    if (p.x >= KING.trigger) { k.st = 'rise'; k.t = 2.4; k.x = KING.throne; k.alpha = 0; S.mos.forEach(m => { if (!m.dead) { m.dead = true; burstParts(m.x, m.y, 8, ['#a8c4b6', '#5d7469'], 120, 60); } }); S.amb.forEach(a => { a.done = true; a.cleared = true; }); sfx('monrise'); S.shake = 0.6; banner('RAJA: "KAU MEMBAWA KITAB-KITAB ITU... TAPI KABUT INI MILIKKU."', 4.5); }
    return;
  }
  if (k.st === 'rise') { k.t -= dt; k.alpha = Math.min(1, k.alpha + dt / 1.8); if (k.t <= 1.2 && S.ktorch.some(t => t.lit)) { S.ktorch.forEach(t => { if (t.lit) snuffTorch(t); }); toast('IA MEMADAMKAN SEMUA OBOR. NYALAKAN LAGI DENGAN API', 3); } if (k.t <= 0) { k.st = 'patrol'; k.alpha = 1; banner(['CARA MENGALAHKANNYA:', '1. NYALAKAN 2 OBOR BERSEBELAHAN (TANDA PANAH)   2. PANCING RAJA KE ANTARANYA', '3. SAAT IA BERCAHAYA PUCAT, SEMBURKAN API'], 8); } return; }
  S.intensity = Math.max(S.intensity, 0.7);
  // mirage in progress
  if (S.mir) {
    S.mir.t += dt;
    if (S.mir.t >= S.mir.dur) {
      if (S.mir.type === 'hijau' && !p.hidden && hurtPlayer(1, 'dark')) toast('IA MENEMUKANMU DALAM GELAP. TUTUP LENTERA (TAHAN E)', 2.8);
      S.mir = null;
    }
  }
  if (S.slick > 0) S.slick -= dt; if (S.dark > 0) S.dark -= dt;
  for (const ph of S.phantoms) {
    ph.t += dt; if (ph.t < 0) continue;
    ph.x += ph.dir * 165 * dt;
    if (!ph.hit && Math.abs(p.x - ph.x) < 18 && p.y > GY - 24) { ph.hit = true; if (hurtPlayer(1, 'phantom')) { p.vx = ph.dir * 170; p.vy = -140; } }
  }
  S.phantoms = S.phantoms.filter(ph => ph.x > KING.x0 && ph.x < KING.x1);
  for (const sd of S.shards) {                                           // a shard of the cracked crown: warm light that mends you
    sd.t += dt; sd.vy = Math.min(300, sd.vy + 700 * dt); sd.y = Math.min(GY - 6, sd.y + sd.vy * dt);
    if (Math.abs(p.x - sd.x) < 14 && p.y - 30 < sd.y && !sd.got) { sd.got = true; S.hp = Math.min(S.maxHp, S.hp + 1); sfx('lamp'); burstParts(sd.x, sd.y, 12, ['#ffd36a', '#fff2c8'], 90, 90, { g: -60 }); toast('SERPIHAN MAHKOTA. NYAWA PULIH 1', 1.8); }
  }
  S.shards = S.shards.filter(sd => !sd.got && sd.t < 12);
  // the king himself
  const litN = S.ktorch.filter(t => t.lit).length;
  k.darkT = litN === 0 ? (k.darkT || 0) + dt : 0;
  const enraged = k.darkT > 6;                                           // a hall left fully dark for long feeds him
  if (enraged && !k.rageTip) { k.rageTip = true; toast('SEMUA OBOR PADAM TERLALU LAMA. IA MENGAMUK!', 2.6); }
  if (k.st === 'stagger') { k.t -= dt; if (k.t <= 0) { k.st = 'patrol'; fogBurst(1 + (k.stage >> 1)); } }
  else if (k.st === 'tele') { k.t -= dt; if (k.t <= 0) { startMirage(k.mirNext); k.lastMir = k.mirNext; k.st = 'patrol'; } }
  else if (k.st === 'swipe') {                                            // the claw comes up first: that is the tell
    k.t -= dt; k.sw = Math.min(1, k.sw + dt * 3);
    if (k.t <= 0) {
      k.st = 'patrol'; k.sw = 0; k.swipeCd = Math.max(1.1, 1.8 - k.stage * 0.15); sfx('stomp', 1); S.shake = 0.25;
      burstParts(k.x + k.dir * 40, GY - 30, 12, ['#a8c4b6', '#5d7469', '#1e2527'], 200, 80, { life: 0.5 });
      if (!p.hidden && Math.abs(p.x - k.x) < 66 && p.y > GY - 70 && hurtPlayer(enraged ? 2 : 1, 'king')) { p.vx = Math.sign(p.x - k.x || 1) * 210; p.vy = -170; k.swipeCd = 2.6; }
    }
  }
  if (k.swipeCd > 0) k.swipeCd -= dt;
  if (k.st === 'patrol' || k.st === 'vuln') {
    const spd = (58 + k.stage * 12) * (enraged ? 1.8 : 1) * (k.st === 'vuln' ? 0.15 : 1) * (p.hidden ? 0.25 : 1), dx = p.x - k.x;
    if (Math.abs(dx) > 26 && !p.hidden) k.dir = Math.sign(dx);           // he follows the light, and only the light
    const ox = k.x; k.x = clamp(k.x + k.dir * spd * dt, KING.x0 - 30, KING.x1 + 22); k.walk = (k.walk || 0) + Math.abs(k.x - ox);
    const st = Math.floor(k.walk * 0.075 / Math.PI); if (st !== k.stepN) { k.stepN = st; burstParts(k.x + k.dir * 22, GY - 3, 4, ['#a8c4b6', '#5d7469'], 70, 30, { g: -20, life: 0.6 }); if (Math.abs(S.p.x - k.x) < 260) sfx('stomp', 0.25); }          // he reaches every corner: there is nowhere to wait him out
  }
  if (k.st === 'patrol') {
    k.snuffCd -= dt;
    if (k.snuffCd <= 0) {
      const t = S.ktorch.filter(t => t.lit && !t.flick && Math.abs(t.x - k.x) < 230 && Math.abs(t.x - p.x) > 40).sort((a, b) => Math.abs(a.x - k.x) - Math.abs(b.x - k.x))[0];
      if (t) t.flick = 0.7;                                               // the flame gutters first: that is his tell
      k.snuffCd = Math.max(2.8, 4.6 - k.stage * 0.35);
    }
    k.mirCd -= dt;
    if (k.mirCd <= 0 && !S.mir) {
      const pool = C5_IDS.filter(id => id !== k.lastMir); k.mirNext = pool[(Math.random() * pool.length) | 0];
      k.st = 'tele'; k.t = has5(k.mirNext) ? 1.3 : 0.8; k.mirCd = Math.max(6, 11 - k.stage * 1.1);
    }
  }
  // two lit torches on either side of him: the fog cannot hold, the crown shows
  const all = KING.torchL.concat(KING.torchR);
  let flank = null;
  for (let i = 0; i < all.length - 1; i++) {
    const a = all[i], b = all[i + 1]; if (k.x <= a + 14 || k.x >= b - 14) continue;
    const ta = S.ktorch[i], tb = S.ktorch[i + 1];
    if (ta.lit && tb.lit && !ta.flick && !tb.flick) flank = [ta, tb];
    break;
  }
  if (flank && k.st === 'patrol') { k.st = 'vuln'; k.vulnT = 3.0; sfx('freeze'); }
  else if (k.st === 'vuln') {
    k.vulnT -= dt;
    if (!flank) k.st = 'patrol';
    else if (k.vulnT <= 0) { k.st = 'patrol'; snuffTorch(flank[k.dir > 0 ? 1 : 0]); }     // too slow: he slips out and kills one of them
  }
  if (k.st === 'patrol' && k.swipeCd <= 0 && !p.hidden && Math.abs(p.x - k.x) < 62) { k.st = 'swipe'; k.t = enraged ? 0.55 : 0.85 - Math.min(0.2, k.stage * 0.05); k.dir = Math.sign(p.x - k.x) || k.dir; k.sw = 0; sfx('stalkroar'); }
}
function ch5Flame(R, dt) {
  if (!KING || !S.king) return;
  const k = S.king;
  if (k.st !== 'off' && k.st !== 'rise' && k.st !== 'dying' && k.st !== 'dead' && k.hitT <= 0 && ov(R, { x: k.x - 18, y: GY - 100, w: 36, h: 100 })) {
    if (k.st === 'vuln') kingHurt();
    else if (k.noHitT <= 0) { k.noHitT = 2.5; burstParts(k.x, GY - 60, 10, ['#a8c4b6', '#5d7469'], 80, 60, { g: -40 }); toast('APINYA TERTELAN KABUT. JEBAK IA DI ANTARA DUA OBOR MENYALA', 2.4); }
  }
  for (const kt of S.ktorch) if (!kt.lit && ov(R, { x: kt.x - 10, y: GY - 46, w: 20, h: 46 })) { kt.burn += dt; if (kt.burn > 0.2) { kt.lit = true; kt.burn = 0; sfx('lamp'); } }
}

/* ---------- drawing ---------- */
function fogWall(x) {
  for (let y = GY - 240; y < GY; y += 3) {
    const w = 8 + Math.round(Math.sin(y * 0.07 + S.t * 2 + x) * 4);
    ctx.globalAlpha = 0.18 + 0.1 * Math.sin(y * 0.05 - S.t * 3); ctx.fillStyle = '#a8c4b6'; ctx.fillRect(x - w, y, w * 2, 3);
    ctx.globalAlpha = 0.35; ctx.fillStyle = '#d9e6dc'; ctx.fillRect(x - 1 + Math.round(Math.sin(y * 0.11 + S.t * 4) * 2), y, 2, 2);
  }
  ctx.globalAlpha = 1;
}
function ghostKing(x, a, dir, scale, col) {
  const m = META.king_body, img = tinted('king_body', col || '#9fc9bb'), s = scale || 1;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(Math.round(x), GY); if (dir < 0) ctx.scale(-1, 1);
  ctx.drawImage(img, Math.round(-m.ax * s), Math.round(-m.ay * s), Math.round(m.w * s), Math.round(m.h * s)); ctx.restore();
}
function drawChambers(cam) {
  const c = S.c5, on = (x, w) => x - cam > -w && x - cam < VW + w;
  for (const id of C5_IDS) {
    const D = C5[id], am = META['shrine_' + id], ax = Math.round(D.alt - cam);
    if (on(D.alt, 80)) {
      ctx.drawImage(IMG['shrine_' + id], ax - am.ax, GY - am.ay);
      if (!c.done[id]) { ctx.globalAlpha = 0.45; ctx.drawImage(tinted('shrine_' + id, '#06100f'), ax - am.ax, GY - am.ay); ctx.globalAlpha = 1; }
      else { ctx.globalAlpha = 0.5 + 0.3 * Math.sin(S.t * 2 + D.alt); R_(ctx, SHRINE_COL[id], ax - 1, GY - am.ay - 8, 2, 5); ctx.globalAlpha = 1; }
      if (id !== 'hijau' && (!c.done[id] || c.fade[id] > 0)) {        // the king's lie, standing proud by the altar
        const a = c.done[id] ? c.fade[id] * 0.6 : 0.42 + 0.1 * Math.sin(S.t * 1.7 + D.alt);
        ghostKing(D.alt - 64 - cam + (c.done[id] ? (1 - c.fade[id]) * -20 : 0), a, 1, 0.8, '#d6ebe2');
      }
    }
    if (!c.done[id] && on(D.wall, 30)) fogWall(Math.round(D.wall - cam));
  }
  // ungu slabs
  const U = C5.ungu;
  U.slabs.forEach(s => {
    const x = Math.round(s - cam); if (x < -40 || x > VW + 40) return;
    const broken = c.done.ungu && s === U.ok;
    if (broken) { R_(ctx, '#0b0806', x - 18, GY - 1, 36, 6); for (let i = 0; i < 7; i++) R_(ctx, i % 2 ? '#6b5a3a' : '#3a2d20', x - 15 + i * 4, GY + 1 + (i % 3), 3, 2); }
    else {
      R_(ctx, '#2d3533', x - 18, GY - 2, 36, 3); R_(ctx, '#5d7469', x - 18, GY - 2, 36, 1);
      if (c.wrong[s]) { R_(ctx, '#0b1513', x - 6, GY - 2, 1, 3); R_(ctx, '#0b1513', x + 4, GY - 2, 1, 3); }
      if (!c.done.ungu && s === U.ok && has5('ungu')) { ctx.globalAlpha = 0.45 + 0.35 * Math.sin(S.t * 3); R_(ctx, '#b388ff', x - 16, GY - 3, 32, 1); ctx.globalAlpha = 1; }
    }
  });
  // merah: the drowned, on the bottom of the pool
  const M = C5.merah, fm = META.p_swing, drowned = tinted('p_swing', '#0a1513');
  M.figs.forEach((f, i) => {
    const x = Math.round(f - cam); if (x < -40 || x > VW + 40) return;
    const gone = c.wrong['f' + f] ? c.fade['f' + f] : 1; if (gone <= 0) return;
    const by = GY + 26, bob = Math.round(Math.sin(S.t * 1.3 + i * 2) * 1.5);
    ctx.globalAlpha = 0.75 * gone; ctx.drawImage(drowned, x - Math.round(fm.ax), by - fm.h + 4 + bob); ctx.globalAlpha = 1;
    if (!c.done.merah && f === M.ok && has5('merah')) { ctx.globalAlpha = 0.4 + 0.3 * Math.sin(S.t * 2.6); R_(ctx, '#ff6b5b', x - 7, GY + 3, 14, 1); R_(ctx, '#ff6b5b', x - 3, GY + 5, 6, 1); ctx.globalAlpha = 1; }
    if (c.standX === f && c.standT > 0) { ctx.globalAlpha = 0.8; R_(ctx, '#d9e6dc', x - 10, GY - 50, Math.round(20 * Math.min(1, c.standT / 1.3)), 2); ctx.globalAlpha = 1; }
  });
  if (c.done.merah && c.fade.merah > 0) { const x = Math.round(M.ok - cam); ctx.globalAlpha = c.fade.merah; R_(ctx, '#ff6b5b', x - 10, GY + 2, 20, 2); ctx.globalAlpha = 1; }
  // hijau: the frightened shadow of the king
  const sh = c.sh;
  if (!c.done.hijau && (sh.st === 'walk' || sh.st === 'stop' || sh.st === 'flee') && on(sh.x, 80)) ghostKing(sh.x - cam, sh.st === 'stop' ? 0.95 : 0.85, sh.dir, 0.66, '#050b0a');
  if (c.done.hijau && c.fade.hijau > 0) ghostKing(C5.hijau.alt - 70 - cam, c.fade.hijau * 0.7, 1, 0.66, '#050b0a');
  if (c.cue > 0) { ctx.globalAlpha = Math.min(1, c.cue) * 0.5; for (let y = GY - 90; y < GY; y += 5) R_(ctx, '#7be27b', Math.round(C5.hijau.from - cam) + Math.round(Math.sin(y * 0.2 + S.t * 9) * 3), y, 1, 3); ctx.globalAlpha = 1; }
  // kuning: the chained weight
  const K = C5.kuning, bx = Math.round(K.block - cam);
  if (bx > -80 && bx < VW + 80) {
    if (!c.done.kuning) {
      for (const cx of [-14, 14]) for (let y = GY - 200; y < GY - 40; y += 6) R_(ctx, (y >> 1) % 2 ? '#6b4a2a' : '#8a6438', bx + cx - 1 + Math.round(c.rock * (y - (GY - 200)) * 0.05), y, 3, 4);
      ctx.save(); ctx.translate(bx + Math.round(c.rock * 4), GY); ctx.rotate(c.rock * 0.1);
      R_(ctx, '#2d3533', -22, -44, 44, 44); R_(ctx, '#4a5550', -22, -44, 44, 3); R_(ctx, '#1b2120', -22, -6, 44, 6);
      R_(ctx, '#8a6438', -24, -30, 48, 3); R_(ctx, '#8a6438', -24, -16, 48, 3); R_(ctx, '#c9a24a', -3, -32, 6, 7);
      ctx.restore();
    } else { R_(ctx, '#2d3533', bx - 30, GY - 14, 60, 14); R_(ctx, '#4a5550', bx - 30, GY - 14, 60, 2); for (let i = 0; i < 9; i++) R_(ctx, '#6b4a2a', bx - 34 + i * 8, GY - 3 - (i % 2) * 2, 5, 3); }
  }
}
function drawStones(cam) {
  for (const s of S.stones) {
    const x = Math.round(s.x - cam); if (x < -20 || x > VW + 20) continue;
    if (s.t < 0) { const u = clamp(1 + s.t / 0.9, 0, 1); ctx.globalAlpha = 0.25 + 0.5 * u; R_(ctx, '#020605', x - 4 - Math.round(u * 5), GY - 1, 8 + Math.round(u * 10), 2); ctx.globalAlpha = 1; }
    else { R_(ctx, '#3a3322', x - 6, Math.round(s.y) - 10, 12, 11); R_(ctx, '#5e553f', x - 6, Math.round(s.y) - 10, 12, 2); }
  }
}
function drawTorchFlame(x, y, lit, flick) {
  if (!lit) { R_(ctx, '#17100b', x - 2, y - 2, 4, 3); return; }
  if (flick > 0 && Math.floor(S.t * 20) % 2) { R_(ctx, '#5d7469', x - 1, y - 2, 2, 2); return; }
  const f = Math.floor(S.t * 9 + x) % 3;
  R_(ctx, '#f08a2a', x - 2 + (f - 1), y - 3 - f, 3, 3); R_(ctx, '#ffd36a', x - 1, y - 1 - (f ? 1 : 0), 2, 3);
}
function drawThrone(cam) {
  if (C5 && S.c5) drawChambers(cam);
  drawStones(cam);
  if (!KING) return;
  if (S.slick > 0) {                                                       // the hall floods ankle-deep
    ctx.globalAlpha = Math.min(1, S.slick) * 0.7; R_(ctx, '#2a7a70', KING.x0 - cam, GY - 3, KING.x1 - KING.x0, 5);
    ctx.globalAlpha = Math.min(1, S.slick) * 0.8; for (let x = KING.x0; x < KING.x1; x += 37) R_(ctx, '#8ab8ac', Math.round(x - cam + ((S.t * 30) % 37)), GY - 2, 8, 1); ctx.globalAlpha = 1;
  }
  for (const kt of S.ktorch) {
    const x = Math.round(kt.x - cam) + (kt.flick > 0 ? Math.round(Math.sin(S.t * 50)) : 0); if (x < -30 || x > VW + 30) continue;
    R_(ctx, '#2d241d', x - 3, GY - 40, 6, 40); R_(ctx, '#49362e', x - 4, GY - 42, 8, 4);
    drawTorchFlame(x, GY - 44, kt.lit, kt.flick);
  }
  for (const sd of S.shards) { const x = Math.round(sd.x - cam), y = Math.round(sd.y), a = sd.t > 9 ? (Math.floor(sd.t * 8) % 2) : 1; if (!a) continue; glow(x, y, 16, '255,200,90', 0.4); R_(ctx, '#ffd36a', x - 2, y - 3, 4, 6); R_(ctx, '#fff2c8', x - 1, y - 2, 2, 3); }
  for (const ph of S.phantoms) if (ph.t >= 0) { const x = Math.round(ph.x - cam); ctx.globalAlpha = 0.65; ctx.drawImage(tinted('crate', '#7b4fb0'), x - 15, GY - META.crate.h + 1); ctx.globalAlpha = 1; }
  drawTorchGuide(cam);
  const k = S.king; if (k.st === 'off') return;
  const x = Math.round(k.x - cam); if (x < -90 || x > VW + 90) return;
  drawKing(x, k);
}
/* the king, drawn in thin strips so his robe can sway and trail as he walks */
const KCRACK = [[[66, 34], [65, 36], [66, 40], [63, 42], [65, 44], [64, 48], [61, 52], [59, 54]], [[76, 46], [74, 50], [76, 54], [75, 58], [73, 62], [71, 64], [72, 68], [70, 70]], [[58, 58], [55, 61], [56, 63], [54, 65], [56, 68], [53, 72], [50, 74], [53, 78]], [[72, 70], [74, 72], [76, 76], [77, 78], [75, 80], [77, 82], [76, 85], [74, 89]], [[50, 84], [47, 88], [46, 92], [49, 94], [46, 98], [44, 101]]];
const KEYES = [[76, 10], [81, 10]];
function kingPose(k) {
  const dead = k.st === 'dead' || k.st === 'dying', lost = KING.hp - Math.max(0, k.hp);
  const moving = (k.st === 'patrol' || k.st === 'vuln') && !dead;
  const ph = k.walk * 0.075;                                                  // one step every ~42px walked
  return {
    dead, lost, moving, ph,
    bob: dead ? 0 : moving ? -Math.abs(Math.sin(ph)) * 3.5 : Math.sin(S.t * 1.8) * 1.2,
    lean: dead ? 0 : (moving ? 0.07 : 0.02) + lost * 0.025 + (k.st === 'swipe' ? -0.2 * k.sw : 0) + (k.hitT > 0 ? -0.12 * k.hitT / 0.6 : 0) + (k.st === 'vuln' ? -0.06 : 0),
    squash: 1 - lost * 0.025 - (dead ? k.sink * 0.15 : 0),
    shake: k.st === 'vuln' ? Math.round(Math.sin(S.t * 47)) : k.hitT > 0 ? Math.round(Math.sin(S.t * 60) * 2) : 0
  };
}
function drawKing(x, k) {
  const bm = META.king_body, q = kingPose(k), sink = Math.round(k.sink * 46);
  const img = k.hitT > 0 && Math.floor(k.hitT * 20) % 2 ? tinted('king_body', '#ffe8a8') : k.st === 'vuln' ? tinted('king_body', '#c9b88a') : IMG.king_body;
  if (k.st === 'swipe') glow(x + k.dir * 18, GY - 96, 30 + k.sw * 22, '255,70,40', 0.25 + 0.45 * k.sw);
  if (k.st === 'tele') glow(x + k.dir * 18, GY - 95, 46 + 10 * Math.sin(S.t * 14), GLOW[k.mirNext], has5(k.mirNext) ? 0.55 : 0.2);
  ctx.save(); ctx.beginPath(); ctx.rect(x - 100, 0, 200, GY + 1); ctx.clip();
  ctx.translate(x + q.shake, GY + sink); if (k.dir < 0) ctx.scale(-1, 1);
  ctx.transform(1, 0, -q.lean, q.squash, 0, 0);
  ctx.globalAlpha = k.alpha * (k.st === 'dying' ? 1 - k.sink * 0.35 : 1);
  const top = -bm.ay + q.bob, H = bm.h;
  for (let sy = 0; sy < H; sy += 3) {                                          // robe strips: the hem trails and swings with each step
    const u = sy / H, sway = q.moving ? Math.sin(q.ph * 2 - u * 2.6) * u * u * 4 - u * u * 3 : Math.sin(S.t * 1.3 - u * 2) * u * u * 1.5;
    ctx.drawImage(img, 0, sy, bm.w, Math.min(3, H - sy), Math.round(-bm.ax + sway), Math.round(top + sy), bm.w, Math.min(3, H - sy));
  }
  if (k.st === 'vuln') { ctx.globalAlpha = 0.5; ctx.drawImage(IMG.king_body, Math.round(-bm.ax), Math.round(top)); ctx.globalAlpha = k.alpha; }
  // the cracks the light has opened in him: one more for every crown stage lost
  for (let c = 0; c < Math.min(q.lost, KCRACK.length); c++) {
    const fl = 0.6 + 0.4 * Math.sin(S.t * 9 + c * 2); ctx.fillStyle = q.dead ? '#5d4a2a' : c === q.lost - 1 && k.hitT > 0 ? '#fff2c8' : '#ffb347';
    ctx.globalAlpha = k.alpha * (q.dead ? 0.5 : fl);
    const P = KCRACK[c];
    for (let i = 1; i < P.length; i++) { const [x0, y0] = P[i - 1], [x1, y1] = P[i], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let t = 0; t <= n; t++) ctx.fillRect(Math.round(x0 + (x1 - x0) * t / n - bm.ax), Math.round(y0 + (y1 - y0) * t / n + top), 1, 1); }
  }
  ctx.globalAlpha = k.alpha;
  drawKingEyes(k, -bm.ax, top);
  if (!q.dead) {
    const hx = -bm.ax + bm.nx, hy = top + bm.ny, br = k.hp <= 3, cm = br ? META.king_crown_x : META.king_crown;
    const cx = Math.round(hx - cm.ax) + (k.hp <= 1 ? Math.round(Math.sin(S.t * 30)) : 0), cy = Math.round(hy - cm.ay + 7);
    ctx.drawImage(br ? IMG.king_crown_x : IMG.king_crown, cx, cy);
    if (k.hp <= 2) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(S.t * 11); ctx.fillStyle = '#ffd36a'; ctx.fillRect(cx + 12, cy + 4, 1, 6); ctx.fillRect(cx + 21, cy + 6, 1, 5); ctx.globalAlpha = k.alpha; }
  }
  ctx.restore(); ctx.globalAlpha = 1;
  if (q.dead) { const cm = META.king_crown_x; ctx.drawImage(IMG.king_crown_x, x + 34 - Math.round(cm.ax), GY - Math.round(cm.ay) + 2); }
  if (!q.dead && q.lost > 0 && Math.random() < 0.08 * q.lost) { const c = KCRACK[(Math.random() * Math.min(q.lost, KCRACK.length)) | 0][3]; burstParts(k.x + (c[0] - bm.ax) * (k.dir < 0 ? -1 : 1), GY + c[1] - bm.ay, 1, ['#a8c4b6', '#5d7469'], 30, 30, { g: -50, life: 0.9 }); }   // fog leaking out of the cracks
  if (k.st === 'vuln') { ctx.globalAlpha = 0.45 + 0.3 * Math.sin(S.t * 12); R_(ctx, '#ffe8a8', x - 1, GY - 128, 2, 120); ctx.globalAlpha = 1; }
  if (k.st === 'tele') { ctx.globalAlpha = has5(k.mirNext) ? 1 : 0.35; bookSprite(k.mirNext, x - 13, GY - 156, false); ctx.globalAlpha = 1; }
}
/* his face is only two lights in the hood, so they carry every mood */
function drawKingEyes(k, ox, oy) {
  const enr = (k.darkT || 0) > 6, blink = k.st === 'patrol' && (S.t % 3.4) < 0.12;
  let col = enr ? '#ff3a28' : '#ffb347', w = 2, h = 1, tilt = 0, a = 1;
  if (k.st === 'rise') { a = clamp((k.alpha - 0.6) / 0.4, 0, 1); }
  else if (k.st === 'tele') { col = SHRINE_COL[k.mirNext]; h = 2; }
  else if (k.st === 'swipe') { col = '#ff3a28'; w = 3; tilt = 1; }                    // narrowed, slanted: rage
  else if (k.st === 'vuln') { col = '#fff2c8'; h = 3; }                              // wide open: caught in the light, afraid
  else if (k.hitT > 0 || k.st === 'stagger') { col = '#fff2c8'; w = 3; h = 1; a = 0.7; }   // squeezed shut in pain
  else if (k.st === 'dying' || k.st === 'dead') { a = k.st === 'dead' ? 0 : 1 - k.sink; col = '#8a6438'; }
  if (blink) h = 0;
  if (a <= 0 || h <= 0) return;
  const pa = ctx.globalAlpha;
  KEYES.forEach(([ex, ey], i) => {
    const gx = ox + ex, gy = oy + ey + (k.st === 'dying' ? Math.round(k.sink * 3) : 0);
    ctx.globalAlpha = pa * a * 0.35; ctx.fillStyle = col; ctx.fillRect(gx - 1, gy - 1, w + 2, h + 2);
    ctx.globalAlpha = pa * a; ctx.fillRect(gx, gy + (tilt && i === 0 ? 1 : 0) - (k.st === 'vuln' ? 1 : 0), w, h);
    if (tilt) ctx.fillRect(gx + (i === 0 ? w - 1 : 0), gy - 1 + (i === 0 ? 1 : 0), 1, 1);
  });
  ctx.globalAlpha = pa;
}
/* which two torches trap him right now, and what the player should do about it */
function kingGap() {
  const k = S.king, T = S.ktorch;
  for (let i = 0; i < T.length - 1; i++) if (k.x > T[i].x && k.x < T[i + 1].x) return [T[i], T[i + 1]];
  const near = T.slice().sort((a, b) => Math.abs(a.x - k.x) - Math.abs(b.x - k.x)); const a = near[0], i = T.indexOf(a);
  return i === 0 ? [T[0], T[1]] : [T[i - 1], T[i]];
}
function drawTorchGuide(cam) {
  const k = S.king; if (!k || k.st === 'off' || k.st === 'rise' || k.st === 'dead' || k.st === 'dying') return;
  const g = kingGap();
  if (g[0].lit && g[1].lit) {                                                   // the trap is set: a line of light on the floor between them
    ctx.globalAlpha = 0.35 + 0.2 * Math.sin(S.t * 5); R_(ctx, '#ffb347', Math.round(g[0].x - cam), GY - 1, Math.round(g[1].x - g[0].x), 1); ctx.globalAlpha = 1;
  }
  for (const t of g) if (!t.lit) {
    const x = Math.round(t.x - cam), y = GY - 62 + Math.round(Math.abs(Math.sin(S.t * 5)) * -5);
    ctx.fillStyle = '#ffd36a'; for (let r = 0; r < 4; r++) ctx.fillRect(x - 3 + r, y + r, 7 - r * 2, 1);
    ctx.globalAlpha = 0.6; R_(ctx, '#ffd36a', x - 1, y - 5, 2, 4); ctx.globalAlpha = 1;
  }
}

function ch5Light(cam) {
  if (C5 && S.c5) {
    for (const id of C5_IDS) if (S.c5.done[id]) addLight(C5[id].alt - cam, GY - 40, 60, 0.6);
    const sh = S.c5.sh; if (!S.c5.done.hijau && sh.st === 'stop') addLight(sh.x - cam, GY - 50, 40, 0.5);
  }
  if (!KING) return;
  const dk = S.dark > 0;
  for (const kt of S.ktorch) if (kt.lit) addLight(kt.x - cam, GY - 36, (dk ? 20 : 58) + Math.sin(S.t * 8 + kt.x) * 3, kt.flick > 0 ? 0.5 : 0.95);
  const k = S.king;
  if (k.st === 'vuln') addLight(k.x - cam, GY - 70, 90, 0.6);
  if (k.st === 'tele') addLight(k.x - cam, GY - 95, 60, 0.6);
}
function ch5HUD() {
  const b = S.banner;
  if (b) {
    const a = Math.min(1, b.t * 2, (b.dur - b.t) * 1.5); ctx.globalAlpha = a * 0.7; ctx.fillStyle = '#020605'; ctx.fillRect(40, 92, VW - 80, 14 + b.lines.length * 15); ctx.globalAlpha = a;
    b.lines.forEach((l, i) => txt(l, VW / 2, 97 + i * 15, 1, i === 0 && l.startsWith('RAJA') ? '#e8a63a' : '#d9e6dc', 'c')); ctx.globalAlpha = 1;
  }
  const k = S.king;
  if (KING && k && k.st !== 'off' && k.st !== 'dead' && k.st !== 'dying') {
    txt('RAJA KABUT', VW / 2, 326, 1, '#9fb5a8', 'c');
    const n = KING.hp, x0 = VW / 2 - n * 15;
    for (let i = 0; i < n; i++) { const img = i < k.hp ? IMG.king_crown : IMG.king_crown_x; ctx.globalAlpha = i < k.hp ? 1 : 0.3; ctx.drawImage(img, Math.round(x0 + i * 30 + 15 - img.width * 0.35), 338, Math.round(img.width * 0.7), Math.round(img.height * 0.7)); }
    ctx.globalAlpha = 1;
    if (!S.mir && k.st !== 'tele' && k.st !== 'rise') {                     // one plain instruction at a time
      const g = kingGap(), lit = g.filter(t => t.lit).length;
      const tip = k.st === 'vuln' ? ['SEKARANG! SEMBURKAN API KE RAJA', '#ffe8a8'] : k.st === 'swipe' ? ['IA AKAN MENCAKAR! MUNDUR', '#ff6b5b'] : lit < 2 ? ['NYALAKAN OBOR YANG DITANDAI PANAH (' + lit + '/2)', '#ffd36a'] : ['PANCING RAJA KE ANTARA DUA OBOR ITU', '#ffd36a'];
      if (k.st !== 'vuln' || Math.floor(S.t * 6) % 2) txt(tip[0], VW / 2, 306, 1, tip[1], 'c');
    }
    ctx.globalAlpha = 1;
    if (k.st === 'tele' || S.mir) {
      const id = k.st === 'tele' ? k.mirNext : S.mir.type, show = has5(id);
      if (Math.floor(S.t * 6) % 2 || !show) txt(show ? MIR_NAME[id] : '???', VW / 2, 66, 2, SHRINE_COL[id], 'c');
    }
  }
  if (C5 && S.c5 && S.p) {
    const p = S.p, c = S.c5;
    if (!c.done.kuning && c.swings > 0 && Math.abs(p.x - C5.kuning.block) < 120) { const need = has5('kuning') ? 4 : 8; txt('BEBAN ' + c.swings + '/' + need, VW / 2, 66, 1, '#ffe06a', 'c'); }
  }
}

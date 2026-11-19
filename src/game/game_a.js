/* ===== Nusantara Berkabut — prototype v0.7 (Fogbound) ===== */
const VW = 640, VH = 360, GY = 280, PIER_Y = 196, WATER_Y = 316;
let LEVEL_W = 4700, END_X = 4640;
const MOVE = 118, JUMP = 470, GRAV = 1500, HW = 6, PH = 34, WEB_H = 50;
const TEST = new URLSearchParams(location.search).has('test');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

const cv = document.getElementById('c');          // what the player sees: full display resolution (crisp text + logo)
const gb = document.createElement('canvas');      // the game itself: 640x360 pixel art, blown up onto cv every frame
gb.width = VW; gb.height = VH;
let ctx = gb.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = false;
const MAINCTX = ctx, vctx = cv.getContext('2d', { alpha: false });
cv.width = VW; cv.height = VH;

/* ---------- assets ---------- */
const IMG = {}, MIR = {}, TINT = {};
function loadAll(done) {
  const keys = Object.keys(ASSETS); let n = keys.length;
  keys.forEach(k => {
    const im = new Image();
    im.onload = () => { if (--n === 0) done(); };
    im.src = ASSETS[k]; IMG[k] = im;
  });
}
function mirror(name) {
  const im = IMG[name], c = document.createElement('canvas');
  c.width = im.width; c.height = im.height;
  const g = c.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(im, 0, 0);
  MIR[name] = c;
}
function tinted(name, col) {
  const key = name + col; if (TINT[key]) return TINT[key];
  const im = IMG[name], c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const g = c.getContext('2d'); g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
  return (TINT[key] = c);
}
function drawTiled(name, scroll, y) {
  const im = IMG[name], m = MIR[name], w = im.width;
  const k0 = Math.floor(scroll / w);
  for (let k = k0; ; k++) {
    const x = k * w - scroll;
    if (x >= VW) break;
    ctx.drawImage(((k % 2) + 2) % 2 === 0 ? im : m, Math.round(x), y);
  }
}

/* ---------- tiny 3x5 pixel font ---------- */
const GL = {
A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',F:'111100110100100',G:'011100101101011',H:'101101111101101',I:'111010010010111',J:'001001001101010',K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'110101101101101',O:'010101101101010',P:'110101110100100',Q:'010101101110011',R:'110101110101101',S:'011100010001110',T:'111010010010010',U:'101101101101111',V:'101101101101010',W:'101101111111101',X:'101101010101101',Y:'101101010010010',Z:'111001010100111',
'0':'111101101101111','1':'010110010010111','2':'110001010100111','3':'110001010001110','4':'101101111001001','5':'111100110001110','6':'011100111101111','7':'111001010010010','8':'111101111101111','9':'111101111001110',
'.':'000000000000010',',':'000000000010100','-':'000000111000000','!':'010010010000010','?':'110001010000010',':':'000010000010000','/':'001001010100100','<':'001010100010001','>':'100010001010100','+':'000010111010000',' ':'000000000000000',
"'":'010010000000000','(':'010100100100010',')':'010001001001010','=':'000111000111000','%':'101001010100101','*':'000101010101000'
};
function txtPix(s, x, y, sc, col, align) {
  s = s.toUpperCase();
  const w = (s.length * 4 - 1) * sc;
  if (align === 'c') x -= w / 2; else if (align === 'r') x -= w;
  ctx.fillStyle = col;
  for (let i = 0; i < s.length; i++) {
    const g = GL[s[i]]; if (!g) continue;
    for (let k = 0; k < 15; k++) if (g[k] === '1')
      ctx.fillRect(Math.round(x + (i * 4 + (k % 3)) * sc), Math.round(y + ((k / 3) | 0) * sc), sc, sc);
  }
}
/* ---------- text: Gaegu, drawn at display resolution on top of the pixel art ---------- */
let FONT_OK = false;
const TQ = [];                                     // this frame's text + hi-res images, drawn after the pixel art is scaled up
const FSIZE = [0, 12, 17, 23, 30];
function nice(s) {                                 // game strings are written in capitals; show them in sentence case
  let o = s.toLowerCase().replace(/(^|[.!?:>]\s+)([a-z])/g, (m, a, b) => a + b.toUpperCase());
  o = o.replace(/\b[a-z]\b/g, c => c.toUpperCase());
  return o.replace(/\b(adam|bab|spasi|fogbound|nusantara|panah)\b/g, w => w[0].toUpperCase() + w.slice(1));
}
function txt(s, x, y, sc, col, align, nch) {
  if (!FONT_OK) { if (ctx === MAINCTX || ctx !== MAINCTX) txtPix(nch === undefined ? s : s.slice(0, nch), x, y, sc, col, align); return; }
  if (ctx !== MAINCTX) return;                     // off-screen passes (a page mid-turn) carry no text
  let t = nice(String(s)); if (nch !== undefined) t = t.slice(0, nch);
  if (!t) return;
  TQ.push({ t, x, y: y + 5 * sc + 1, px: FSIZE[sc] || 11 * sc, col, align: align === 'c' ? 'center' : align === 'r' ? 'right' : 'left', a: ctx.globalAlpha });
}
function drawHi(img, x, y, w, h, a) { TQ.push({ img, x, y, w, h, a: a === undefined ? ctx.globalAlpha : a }); }
function rectHi(x, y, w, h, col, a) { TQ.push({ rect: true, x, y, w, h, col, a: a === undefined ? 1 : a }); }
function present() {
  vctx.setTransform(1, 0, 0, 1, 0, 0); vctx.imageSmoothingEnabled = false; vctx.globalAlpha = 1;
  vctx.drawImage(gb, 0, 0, cv.width, cv.height);
  const k = cv.width / VW, fade = S.mode === 'play' ? 1 - Math.min(1, S.fade) : 1;
  for (const q of TQ) {
    const a = q.a * fade; if (a <= 0.01) continue;
    if (q.rect) { vctx.globalAlpha = a; vctx.fillStyle = q.col; vctx.fillRect(q.x * k, q.y * k, q.w * k, q.h * k); continue; }
    if (q.img) { vctx.imageSmoothingEnabled = true; vctx.globalAlpha = a; vctx.drawImage(q.img, q.x * k, q.y * k, q.w * k, q.h * k); vctx.imageSmoothingEnabled = false; continue; }
    vctx.font = '700 ' + (q.px * k).toFixed(1) + 'px Gaegu, sans-serif'; vctx.textAlign = q.align; vctx.textBaseline = 'alphabetic';
    const o = Math.max(1, k * 0.7);
    vctx.globalAlpha = a * 0.75; vctx.fillStyle = '#020605'; vctx.fillText(q.t, q.x * k + o, q.y * k + o);
    vctx.globalAlpha = a; vctx.fillStyle = q.col; vctx.fillText(q.t, q.x * k, q.y * k);
  }
  vctx.globalAlpha = 1; TQ.length = 0;
}
function loadFont(done) {
  try {
    const f = new FontFace('Gaegu', 'url(' + FONT_GAEGU + ')', { weight: '700' });
    f.load().then(ff => { document.fonts.add(ff); FONT_OK = true; done(); }, () => done());
  } catch (e) { done(); }
}

/* ---------- level (filled per chapter by loadChapter) ---------- */
const grounds = [], piers = [], pits = [], traps = [], saws = [], lampDefs = [], solids = [], ZONES = [], hutDefs = [], ambDefs = [];
const WATER_GAPS = [], KENT = [], POOLS = [], MUDS = [], TORCHES = [], POSTS = [], HINTS = [];
const CLIMBS = [], BRANCHES = [], THORNS = [], THICKETS = [], SWINGS = [], HIDES = [], WALLS = [];
const L1 = GY - 96, L2 = GY - 152;       // canopy levels of chapter 3: both out of jumping reach from the level below
let STALK = null, LOGB = null, LOGS = null, SPIDER = null, KING = null, C5 = null; const WEBS = [];
const PLAT = { x: 850, w: 116, y: PIER_Y };
const SAW = { py: 48, hi: 88, lo: 176, T: 3.0, r: 14 };
const STOPPER = { x: 2361, y: GY - 18, w: 12, h: 18 };     // low post: the cart stops exactly on the plate
const onPier = x => piers.some(p => x >= p[0] && x <= p[1]) || (x >= PLAT.x && x <= PLAT.x + PLAT.w);
let CART0 = 1990, PLATE_X = 2330, GATE_X = 2440, CRATE0 = 700;
let TREE_X = 2540, TREE_L = 270; const ROPE = { x: 2486, y: GY - 62, w: 40, h: 60 };
let BOAT_MIN = 3083, BOAT_MAX = 3655, SNAG_X = [3290, 3470, 3625]; const BOAT_HW = 42;
const MON = { trigger: 3960, end: 4560 };
let LEVER = null, EEL = null, CHAPTER = 1;
const OFF = -20000;       // "not in this chapter": parked far outside the level
const hump = (cx, d) => [[cx - 30, d], [cx - 12, -5], [cx + 12, -5], [cx + 30, d]];
const CH = {
  1: {
    name: 'DESA TENGGELAM', sub: ['KABUT MENELAN DESA DI TEPI RAWA.', 'JALAN KE ISTANA MASIH SANGAT JAUH.'], W: 4700, END: 4640,
    grounds: [[0, 560], [624, 930], [1500, 1800], [1864, 2560], [2800, 3040], [3700, 4110], [4174, 4700]],
    piers: [[966, 1096], [1152, 1500]], platX: 850, pits: [[560, 624], [1800, 1864], [4110, 4174]],
    traps: [{ x: 1235, y: PIER_Y }, { x: 3990, y: GY }, { x: 4330, y: GY }, { x: 4490, y: GY }],
    saws: [{ px: 1340, ph: 0 }, { px: 1430, ph: 0.5 }],
    lamps: [{ x: 640, y: GY }, { x: 1175, y: PIER_Y }, { x: 1545, y: GY }, { x: 1900, y: GY }, { x: 2470, y: GY }, { x: 2850, y: GY }, { x: 3725, y: GY }, { x: 4195, y: GY }, { x: 4580, y: GY }],
    zones: [{ x0: 1864, x1: 2560 }, { x0: 3040, x1: 3700 }], waterGaps: [[2560, 2800], [3040, 3700]], kent: [150, 1745, 4060],
    ropes: [{ x: 1507, y0: GY, y1: PIER_Y, side: 1 }],
    cart0: 1990, plateX: 2330, stopX: 2361, gateX: 2440, crate0: 700, treeX: 2540, ropeX: 2486, boat: [3083, 3655], snags: [3290, 3470, 3625], mon: [3960, 4560],
    huts: [
      { x: 300, book: 'brown', lore: ['GUBUK KOSONG. PENGHUNINYA SUDAH LAMA PERGI.', 'SEBUAH KITAB TERTINGGAL DI ATAS MEJA.'] },
      { x: 1620, book: 'orange', lore: ['COREKAN DI DINDING: NYAMUK ITU MENGEJAR CAHAYA.', 'JANGAN BERHENTI TERLALU LAMA DI KEGELAPAN.'] },
      { x: 2930, book: 'white', lore: ['SOBEKAN KERTAS: RAJA TAK PERNAH KELUAR ISTANA.', 'KATANYA IA TAK LAGI MAKAN, TAK LAGI TIDUR.'] },
      { x: 3810, book: 'orange', special: 'ungu', lore: ['TULISAN TERAKHIR: PUTRI MENANGIS DI MENARA TIAP MALAM.', 'LALU SUARANYA BERHENTI.'] }
    ],
    amb: [{ x: 1930, n: 2 }, { x: 2260, n: 2 }, { x: 3110, n: 3 }, { x: 3440, n: 3 }],
    hints: [['A D / PANAH : JALAN     SPASI : LOMPAT', 190, 60, 220], ['E : SEMBURKAN API LENTERA', 380, 60, 110], ['DORONG PETI-NYA', 790, 232, 150], ['R : ULANG DARI LAMPU', 80, 78, 90],
      ['GEROBAK TUA. DORONG KE PELAT', 2090, 214, 150], ['API BISA MEMBAKAR TALI', 2440, 196, 70], ['NAIK PERAHU. A D : MENDAYUNG', 3070, 220, 90]]
  },
  2: {
    name: 'LEMBAH RAWA', sub: ['JALAN MENURUN KE LEMBAH YANG TERGENANG.', 'DI SINI AIR LEBIH BERBAHAYA DARIPADA KABUT.'], W: 4700, END: 4640,
    grounds: [[0, 430], [900, 1290], [1900, 2330], [2790, 3350], [4150, 4380], [4444, 4700]],
    piers: [], platX: OFF, pits: [[4380, 4444]],
    traps: [{ x: 1180, y: GY }, { x: 3250, y: GY }],
    saws: [],
    lamps: [{ x: 1235, y: GY }, { x: 1985, y: GY }, { x: 2860, y: GY }, { x: 3320, y: GY }, { x: 4185, y: GY }, { x: 4580, y: GY }],
    zones: [{ x0: 1290, x1: 1900 }, { x0: 3350, x1: 4150 }], waterGaps: [], kent: [],
    cart0: OFF, plateX: OFF - 500, stopX: OFF - 900, gateX: OFF - 1300, crate0: OFF - 1700, treeX: OFF - 2100, ropeX: OFF - 2100, boat: [OFF - 3000, OFF - 3000], snags: [], mon: [1e9, 2e9],
    pools: [
      { x0: 430, x1: 900, pts: [[430, 0], [500, 9], [600, 12], [680, 22], [800, 22], [850, 10], [900, 0]] },
      { x0: 1290, x1: 1900, leech: true, pts: [[1290, 0], [1350, 20], [1466, 22]].concat(hump(1490, 22), [[1680, 24]], hump(1706, 23), [[1840, 18], [1900, 0]]) },
      { x0: 2330, x1: 2790, drain: 28, pts: [[2330, 0], [2400, 30], [2450, 46], [2680, 46], [2730, 26], [2790, 0]] },
      { x0: 3350, x1: 4150, eel: true, pts: [[3350, 0], [3400, 22]].concat(hump(3475, 22), hump(3590, 22), hump(3700, 23), hump(3860, 23), hump(3965, 22), hump(4070, 22), [[4105, 20], [4150, 0]]) }
    ],
    muds: [[1010, 1130], [3000, 3170]], torches: [950, 1935, 2815],
    posts: [{ x: 2140, y: GY - 36, w: 24, h: 36 }, { x: 2190, y: GY - 70, w: 24, h: 70 }, { x: 2240, y: GY - 100, w: 84, h: 10, plat: true }],
    ropes: [{ x: 2331, y0: GY, y1: GY - 100, side: 1 }],
    lever: { x: 2290, y: GY - 100, pool: 2 }, eel: { x0: 3350, x1: 4150, spd: 125 },
    huts: [
      { x: 260, book: 'brown', lore: ['POS JAGA DI BIBIR LEMBAH. PENJAGANYA TAK PERNAH KEMBALI.', 'DI MEJA: JANGAN BIARKAN LENTERAMU TENGGELAM.'] },
      { x: 2060, book: 'white', lore: ['CATATAN PENJAGA PINTU AIR: TUAS DI ATAS PANGGUNG.', 'KALAU AIR TAK DISURUTKAN, TAK ADA YANG BISA MENYEBERANG.'] },
      { x: 4270, book: 'orange', special: 'merah', lore: ['GORESAN KUKU DI LANTAI: IA MENDENGAR SETIAP RIAK.', 'YANG DIAM DI ATAS BATU, SELAMAT.'] }
    ],
    amb: [{ x: 1400, n: 2 }, { x: 3030, n: 2 }],
    hints: [['AIR MEMBUAT LANGKAHMU BERAT', 470, 214, 90], ['MAKIN DALAM MAKIN LAMBAT. JANGAN TERJUN: LENTERA BISA PADAM', 690, 206, 80], ['OBOR BATU MENYALAKAN LENTERA YANG PADAM', 950, 214, 70],
      ['LUMPUR HISAP! SPASI BERKALI-KALI', 1040, 214, 90], ['AIR INI PENUH LINTAH. JANGAN DIAM', 1330, 206, 90],
      ['AIRNYA TERLALU DALAM. CARI TUAS PINTU AIR', 2180, 150, 110], ['HATI-HATI LUMPUR', 2980, 214, 70], ['BERHENTI DI ATAS BATU SAAT IA DATANG', 3380, 206, 90]]
  },
  3: {
    name: 'HUTAN BELANTARA', sub: ['POHON-POHON DI SINI MENUTUP LANGIT.', 'YANG BERJALAN DI BAWAHNYA MENCARI CAHAYA.'], W: 4700, END: 4640,
    grounds: [[0, 2000], [2190, 2520], [2700, 4700]],
    piers: [], platX: OFF, pits: [[2000, 2190], [2520, 2700]],
    traps: [{ x: 2850, y: GY }], saws: [],
    lamps: [{ x: 690, y: GY }, { x: 1010, y: GY }, { x: 1810, y: GY }, { x: 2225, y: GY }, { x: 2760, y: GY }, { x: 3330, y: GY }, { x: 4175, y: GY }, { x: 4580, y: GY }],
    zones: [{ x0: 1040, x1: 1780 }, { x0: 3350, x1: 4140 }], waterGaps: [], kent: [],
    cart0: OFF, plateX: OFF - 500, stopX: OFF - 900, gateX: OFF - 1300, crate0: OFF - 1700, treeX: OFF - 2100, ropeX: OFF - 2100, boat: [OFF - 3000, OFF - 3000], snags: [], mon: [1e9, 2e9],
    walls: [{ x: 556, y: GY - 84, w: 60, h: 84 }],
    ropes: [{ x: 657, y0: GY, y1: L1, side: 1 }, { x: 1775, y0: GY, y1: L2, side: 1 }, { x: 2643, y0: GY - 8, y1: L2, side: 1 }, { x: 4135, y0: GY, y1: L1, side: 1 }],
    climbs: [{ x: 470, y0: GY, y1: L1 }, { x: 1060, y0: GY, y1: L1 }, { x: 1430, y0: L1, y1: L2 }, { x: 2380, y0: GY, y1: L2 },
      { x: 3380, y0: GY, y1: L1 }, { x: 3660, y0: GY, y1: L1 }, { x: 3866, y0: GY, y1: L1 }, { x: 4070, y0: GY, y1: L1 }],
    branches: [{ x: 450, y: L1, w: 200 },
      { x: 1040, y: L1, w: 150 }, { x: 1210, y: L1, w: 56, brittle: true }, { x: 1294, y: L1, w: 56, brittle: true }, { x: 1376, y: L1, w: 120 },
      { x: 1410, y: L2, w: 150 }, { x: 1586, y: L2, w: 56, brittle: true }, { x: 1668, y: L2, w: 100 },
      { x: 2360, y: L2, w: 120 }, { x: 2500, y: L2, w: 50, brittle: true }, { x: 2566, y: L2, w: 70 },
      { x: 3360, y: L1, w: 150 }, { x: 3530, y: L1, w: 56, brittle: true }, { x: 3606, y: L1, w: 110 }, { x: 3736, y: L1, w: 56, brittle: true },
      { x: 3812, y: L1, w: 110 }, { x: 3942, y: L1, w: 56, brittle: true }, { x: 4018, y: L1, w: 110 }],
    thorns: [{ x: 820, w: 40, y: GY }, { x: 1716, w: 30, y: L2 }, { x: 3000, w: 40, y: GY }, { x: 3120, w: 40, y: GY }],
    thickets: [[1110, 1740], [3420, 4090]],
    swings: [{ ax: 2095, ay: GY - 175, len: 125, amp: 0.72, T: 2.6, ph: 0 }],
    hides: [{ x: 3250, w: 62, y: GY }, { x: 3438, w: 60, y: L1 }, { x: 3640, w: 62, y: L1 }, { x: 3846, w: 62, y: L1 }, { x: 4050, w: 62, y: L1 }],
    logb: { x: 2510, w: 200, hang: L2 + 46, rope: { x: 2594, y: L2 - 46, w: 34, h: 46 } },
    stalk: { x0: 3400, x1: 4132 },
    huts: [
      { x: 250, book: 'brown', lore: ['PONDOK PEMBURU DI TEPI HUTAN. BUSURNYA MASIH TERGANTUNG.', 'DI DINDING: NAIK. JANGAN PERNAH LEWAT BAWAH.'] },
      { x: 1900, book: 'white', lore: ['CATATAN PEMBURU: DAHAN TUA TAK KUAT MENAHAN LAMA.', 'JANGAN BERDIRI DIAM DI ATASNYA.'] },
      { x: 4290, book: 'orange', special: 'hijau', lore: ['UKIRAN DI TIANG: IA TAK MELIHAT YANG GELAP DAN DIAM.', 'TUTUP CAHAYAMU, TAHAN NAPASMU.'] }
    ],
    amb: [{ x: 760, n: 2 }, { x: 1640, n: 2 }, { x: 3040, n: 3 }],
    hints: [['SPASI DI BATANG BERSULUR : MEMANJAT', 430, 214, 100], ['TAHAN SPASI : NAIK     S : TURUN', 470, 150, 60], ['SEMAK BERDURI. BAKAR DULU', 780, 206, 90],
      ['DAHAN RETAK TIDAK MENUNGGU', 1200, 130, 90], ['LOMPAT KE AKAR GANTUNG. SPASI : LEPAS', 1950, 190, 110], ['BAKAR TALINYA DARI ATAS', 2380, 214, 90],
      ['RIMBUN DAUN. TAHAN E : SEMBUNYI', 3270, 206, 80], ['TALI. JALAN KE TEPINYA UNTUK TURUN', 610, 130, 70]]
  },
  4: {
    name: 'LERENG ISTANA', sub: ['TANAH MULAI NAIK DAN TURUN.', 'DI SINI YANG DIAM AKAN TERLINDAS, YANG LAMBAT AKAN TERKEJAR.'], W: 4700, END: 4640,
    grounds: [[0, 320], [860, 960], [1260, 1275], [1335, 1420], [4260, 4700]],
    piers: [], platX: OFF, pits: [[1275, 1335]], traps: [], saws: [],
    lamps: [{ x: 900, y: GY }, { x: 1360, y: GY }, { x: 1950, y: GY - 120 }, { x: 2815, y: GY - 130 }, { x: 4400, y: GY }],
    zones: [], waterGaps: [], kent: [],
    cart0: 3000, plateX: OFF - 500, stopX: 4372, gateX: OFF - 1300, crate0: OFF - 1700, treeX: OFF - 2100, ropeX: OFF - 2100, boat: [OFF - 3000, OFF - 3000], snags: [], mon: [3090, 4300],
    pools: [
      { x0: 320, x1: 860, hill: true, pts: [[320, 0], [520, -60], [640, -60], [860, 0]] },
      { x0: 960, x1: 1260, hill: true, pts: [[960, 0], [1090, -90], [1150, -90], [1244, 0], [1260, 0]] },
      { x0: 1420, x1: 4260, hill: true, pts: [[1420, 0], [1900, -120], [1990, -120], [2060, -96], [2720, -96], [2800, -130], [3060, -130], [4260, 0]] }
    ],
    logs: { x: 1892, x0: 1440, x1: 1880, every: 2.6 },
    webs: [{ x: 2180 }, { x: 2664, thick: true }, { x: 3400 }, { x: 3700 }, { x: 4000 }],
    spider: { x0: 2210, x1: 2640, hp: 6 },
    huts: [
      { x: 150, book: 'brown', lore: ['POS PENJAGA LERENG. TOMBAKNYA PATAH JADI DUA.', 'DI MEJA: JANGAN BERHENTI DI TENGAH TANJAKAN.'] },
      { x: 2890, book: 'white', special: 'kuning', lore: ['KEPOMPONG-KEPOMPONG ITU DULU PENJAGA ISTANA.', 'IA MENENUN SEJAK RAJA BERHENTI BICARA.'] }
    ],
    amb: [{ x: 600, n: 2 }, { x: 2090, n: 2 }],
    hints: [['TANJAKAN MEMPERLAMBAT, TURUNAN MEMPERCEPAT', 380, 200, 100], ['LERENG CURAM: KAU MEROSOT. LOMPAT DI UJUNGNYA', 1090, 150, 90], ['BATANG MENGGELINDING! LOMPATI', 1470, 214, 90],
      ['JARING LABA-LABA. BAKAR', 2130, 130, 70], ['DORONG GEROBAK KE LERENG, LALU NAIK', 2960, 96, 80]]
  },
  5: {
    name: 'TAKHTA KABUT', sub: ['EMPAT BILIK INGATAN MENJAGA JALAN KE TAKHTA.', 'KABUT SANG RAJA HANYA RETAK OLEH KEBENARAN.'], W: 4950, END: 4890,
    grounds: [[0, 1300], [1800, 4950]], piers: [], platX: OFF, pits: [], traps: [], saws: [],
    pools: [{ x0: 1300, x1: 1800, pts: [[1300, 0], [1350, 18], [1400, 26], [1700, 26], [1750, 18], [1800, 0]] }],
    lamps: [{ x: 330, y: GY }, { x: 1230, y: GY }, { x: 1995, y: GY }, { x: 2760, y: GY }, { x: 3500, y: GY }, { x: 3945, y: GY }],
    zones: [{ x0: 2020, x1: 2700 }], waterGaps: [], kent: [],
    cart0: OFF, plateX: OFF - 500, stopX: OFF - 900, gateX: 4840, crate0: 600, treeX: OFF - 2100, ropeX: OFF - 2100, boat: [OFF - 3000, OFF - 3000], snags: [], mon: [1e9, 2e9],
    hides: [{ x: 2200, w: 62, y: GY }, { x: 2460, w: 62, y: GY }],
    huts: [{ x: 180, book: 'orange', special: 'emas', lore: ['DI GERBANG ISTANA: SEBUAH KITAB EMAS BERDEBU.', 'RAHASIA MAHKOTA SANG RAJA ADA DI DALAMNYA.'] }],
    c5: {
      ungu: { x0: 450, wall: 1170, alt: 1095, slabs: [740, 840, 940], ok: 840 },
      merah: { x0: 1200, wall: 1960, alt: 1885, figs: [1420, 1550, 1680], ok: 1550 },
      hijau: { x0: 2000, wall: 2720, alt: 2615, hide: 1, from: 2700, to: 2030 },
      kuning: { x0: 2750, wall: 3460, alt: 3365, block: 3120 }
    },
    amb: [{ x: 3620, n: 3 }],
    king: { x0: 4000, x1: 4800, trigger: 3995, throne: 4400, torchL: [4070, 4170, 4270], torchR: [4530, 4630, 4730], hp: 5 },
    hints: [['KITAB EMAS. E : MASUK', 180, 150, 90], ['BILIK UNGU. DORONG PETI KE LANTAI YANG BENAR', 520, 200, 130],
      ['BILIK MERAH. ANGKAT LENTERA DI AIR DALAM, CARI SIAPA YANG TENGGELAM', 1260, 200, 140],
      ['BILIK HIJAU. SESUATU LEWAT DI SINI. SEMBUNYI DI DEKAT ALTAR', 2060, 200, 140],
      ['BILIK KUNING. GOYANGKAN BEBAN ITU DARI DUA SISI', 2800, 200, 130],
      ['RUANG TAKHTA. JEBAK RAJA DI ANTARA DUA OBOR MENYALA', 3880, 180, 140]]
  }
};
function loadChapter(n) {
  const c = CH[n]; CHAPTER = n; LEVEL_W = c.W; END_X = c.END;
  const fill = (arr, src) => { arr.length = 0; (src || []).forEach(v => arr.push(v)); };
  fill(grounds, c.grounds); fill(piers, c.piers); fill(pits, c.pits); fill(traps, c.traps); fill(saws, c.saws); fill(lampDefs, c.lamps);
  fill(ZONES, c.zones); fill(hutDefs, c.huts); fill(ambDefs, c.amb); fill(WATER_GAPS, c.waterGaps); fill(KENT, c.kent);
  fill(POOLS, c.pools); fill(MUDS, c.muds); fill(TORCHES, c.torches); fill(POSTS, c.posts); fill(HINTS, c.hints);
  PLAT.x = c.platX; STOPPER.x = c.stopX; CART0 = c.cart0; PLATE_X = c.plateX; GATE_X = c.gateX; CRATE0 = c.crate0; TREE_X = c.treeX; ROPE.x = c.ropeX;
  BOAT_MIN = c.boat[0]; BOAT_MAX = c.boat[1]; SNAG_X = c.snags; MON.trigger = c.mon[0]; MON.end = c.mon[1];
  LEVER = c.lever || null; EEL = c.eel || null; STALK = c.stalk || null; LOGB = c.logb || null; LOGS = c.logs || null; SPIDER = c.spider || null; KING = c.king || null; C5 = c.c5 || null; fill(WEBS, c.webs);
  fill(CLIMBS, c.climbs); (c.ropes || []).forEach(r => CLIMBS.push({ x: r.x, y0: r.y0, y1: r.y1, rope: true, side: r.side })); fill(BRANCHES, c.branches); fill(THORNS, c.thorns); fill(THICKETS, c.thickets); fill(SWINGS, c.swings); fill(HIDES, c.hides); fill(WALLS, c.walls);
  POOLS.forEach(q => { q.rocks = []; if (!q.hill) for (let i = 1; i < q.pts.length; i++) if (q.pts[i][1] < 0 && q.pts[i - 1][1] < 0) q.rocks.push((q.pts[i][0] + q.pts[i - 1][0]) / 2); });
  solids.length = 0;
  grounds.forEach(g => solids.push({ x: g[0], y: GY, w: g[1] - g[0], h: 60 }));
  piers.forEach(p => solids.push({ x: p[0], y: PIER_Y, w: p[1] - p[0], h: 16 }));
  solids.push({ x: PLAT.x, y: PLAT.y, w: PLAT.w, h: 16 }); solids.push(STOPPER);
  POSTS.forEach(p => solids.push(p)); WALLS.forEach(w => solids.push(w));
  BRANCHES.forEach(b => { if (!b.brittle) solids.push({ x: b.x, y: b.y, w: b.w, h: 8 }); });
  buildReeds();
}
/* ---- chapter 2 terrain: pools are dips in the ground filled with water; the player walks down into them ---- */
const poolAt = x => { for (const q of POOLS) if (x >= q.x0 && x <= q.x1) return q; return null; };
function dipAt(q, x) {
  const P = q.pts; if (x <= P[0][0]) return P[0][1];
  for (let i = 1; i < P.length; i++) if (x <= P[i][0]) { const a = P[i - 1], b = P[i], u = (x - a[0]) / ((b[0] - a[0]) || 1); return a[1] + (b[1] - a[1]) * (q.hill ? u : 0.5 - 0.5 * Math.cos(Math.PI * u)); }      // hillsides are straight ramps, pool beds are rounded
  return P[P.length - 1][1];
}
const floorAt = x => { const q = poolAt(x); return q ? GY + dipAt(q, x) : null; };
const surfY = q => GY + 3 + (q.drain ? q.drain * S.sluice.k : 0);
function wetDepth() { const p = S.p; if (!p) return 0; const q = poolAt(p.x); return q ? Math.max(0, p.y - surfY(q)) : 0; }
const mudAt = x => MUDS.some(m => x >= m[0] && x <= m[1]);
const terrY = x => { const f = floorAt(x); return f === null ? GY : f; };
const slopeAt = x => poolAt(x) ? (terrY(x + 4) - terrY(x - 4)) / 8 : 0;          // > 0: the ground falls away to the right
const thickAt = x => THICKETS.some(m => x >= m[0] && x <= m[1]);
function swingEnd(sw, t) { const a = sw.amp * Math.sin(2 * Math.PI * (t / sw.T) + sw.ph); return { x: sw.ax + sw.len * Math.sin(a), y: sw.ay + sw.len * Math.cos(a) }; }

/* ---------- books ---------- */
const BUFF_T = 40;
const BASE_FIRE = { kind: 'base', dmg: 1, reach: 50, fl: ['#c0501e', '#e8892c', '#ffd98a'] };
const BOOKS = {
  brown:  { name: 'KITAB COKELAT', short: 'API 2X', desc: 'API LENTERA 2X LIPAT', col: '#8b5a2b', kind: 'dmg', dmg: 2, reach: 58, fl: ['#a9622a', '#d08a3a', '#f2c46e'] },
  orange: { name: 'KITAB ORANGE', short: 'MEMBAKAR', desc: 'API MEMBAKAR LANGSUNG', col: '#e2762a', kind: 'burn', dmg: 1, reach: 66, fl: ['#d9481f', '#f08a2a', '#ffd36a'] },
  white:  { name: 'KITAB PUTIH', short: 'BEKU', desc: 'MEMBEKUKAN, SERANGAN KEDUA MEMATIKAN', col: '#d8e6ea', kind: 'freeze', dmg: 1, reach: 60, fl: ['#7fb6d6', '#bfe3f0', '#ffffff'] }
};
const SPECIALS = [
  { id: 'ungu', name: 'KITAB UNGU', sub: 'RAHASIA BAYANGAN', col: '#7b4fb0' },
  { id: 'merah', name: 'KITAB MERAH', sub: 'RAHASIA DARAH', col: '#b5382e' },
  { id: 'hijau', name: 'KITAB HIJAU', sub: 'RAHASIA AKAR', col: '#3f8f55' },
  { id: 'kuning', name: 'KITAB KUNING', sub: 'RAHASIA CAHAYA', col: '#d9bd3a' },
  { id: 'emas', name: 'KITAB EMAS', sub: 'RAHASIA MAHKOTA', col: '#f0c24a' }
];
const SPEC = {}; SPECIALS.forEach(s => SPEC[s.id] = s);
/* ---------- state ---------- */
const keys = { left: 0, right: 0, jump: 0, jumpPressed: 0, fire: 0, firePressed: 0, interactPressed: 0 };
const S = {
  mode: 'title', chapter: 1, card: null, sluice: { pulled: false, k: 0 }, eel: { st: 'off', x: 0, t: 0, side: 1, dir: 1, wig: 0 }, near: null, actLock: false, t: 0, cam: 0, camR: 0, p: null, crate: { x: 700, w: 30, h: 26, slow: 0.6 }, cart: null, plate: null, gate: null, tree: null, boat: null, snags: [], mon: 'idle', snap: null,
  lamps: [], huts: [], amb: [], mos: [], flames: [], parts: [], spits: [], puddles: [], cr: null,
  hp: 5, maxHp: 5, buff: { type: null, t: 0 }, specials: [], modal: null, fireCd: 0, toast: null,
  intro: -1, introT: 0, turn: null, opening: false, openT: 0, fade: 1, deadT: 0, death: null, intensity: 0, shake: 0, endT: 0, lightT: 1,
  stepT: 0, pushT: 0, frame: 'p_idle', flash: 0, flameLight: 0, warn: 0, zoneK: 0, stats: { bites: 0, grabs: 0, kills: 0, deaths: 0, goo: 0 }
};
function newPlayer(x, y) {
  return { x, y, vx: 0, vy: 0, dir: 1, ground: false, coyote: 0, buf: 0, anim: 0, landT: 0, air: 0, dead: false, inv: 0, grab: null, goo: 0, onBoat: false, standOn: null, pushK: 0, pushO: null, pushHold: 0, pole: false, poleK: 0, poleT: 0.1, lantX: 20, fireT: 0, lit: true, litK: 1, raiseK: 0, sink: 0, leech: 0, leechT: 0, leechDmg: 0, air: 2.5, wet: 0, webbed: 0, slide: 0, gy: y, climb: null, swing: null, swingCd: 0, hopArm: false, hidden: false, hangT: 0 };
}
const CR_VIS = 50, SPIT_RANGE = 340, LEGLEN = 172, WALK_A = 0.33, STRIDE = 2 * LEGLEN * Math.sin(WALK_A);
function newCreature(px) { return { act: false, alpha: 1, cx: px - 340, pcx: px - 340, st: 'chase', t: 0, cd: 3, sy: GY, tx: 0, flare: 0, catchUp: 12, v: 16, phase: 0, lean: 0.05, walk: 0, arm: 0 }; }
function initWorld() {
  S.lamps = lampDefs.map(l => ({ x: l.x, y: l.y, lit: false }));
  S.huts = hutDefs.map(h => Object.assign({ looted: false, y: terrY(h.x) }, h));
  S.amb = ambDefs.map(a => Object.assign({ done: false, cleared: false }, a));
  S.crate = { x: CRATE0, w: 30, h: 26, slow: 0.6 };
  S.cart = { x: CART0, w: 62, h: 38, slow: 0.5, wheel: 0, coast: 0, v: 0 };
  S.plate = { x: PLATE_X, w: 46, down: false };
  S.gate = { x: GATE_X, open: 0 };
  S.tree = { x: TREE_X, L: TREE_L, state: 0, ang: 0.05, ft: 0, burn: 0 };
  S.boat = { x: BOAT_MIN, v: 0, bob: 0, padT: 0 };
  S.snags = SNAG_X.map(x => ({ x, st: 0, t: 0 }));
  S.mon = 'idle';
  S.sluice = { pulled: false, k: 0 }; S.eel = { st: 'off', x: 0, t: 0, side: 1, dir: 1, wig: 0 };
  initForest(null); initSlopes(null); initKing(null);
}
function initSlopes(sn) {
  S.logs = []; S.logT = 1.2;
  S.webs = WEBS.map((w, i) => { const y = terrY(w.x); return { x: w.x, y, thick: !!w.thick, st: sn && sn.webs[i] ? 2 : 0, t: 0, burn: 0, rect: { x: w.x - 5, y: y - WEB_H, w: 10, h: WEB_H } }; });
  const dead = !!(sn && sn.spider);
  S.spider = { st: dead ? 'dead' : 'off', x: SPIDER ? (SPIDER.x0 + SPIDER.x1) / 2 : 0, y: -40, hp: SPIDER ? SPIDER.hp : 0, t: 0, n: 0, tx: 0, hitT: 0, biteT: 0, blob: null, leg: 0 };
}
function initForest(sn) {
  S.branches = BRANCHES.filter(b => b.brittle).map(b => ({ x: b.x, y: b.y, w: b.w, h: 8, brittle: true, t: -1, gone: false, regen: 0 }));
  S.thorns = THORNS.map((t, i) => ({ x: t.x, y: t.y, w: t.w, st: sn && sn.thorns[i] ? 2 : 0, t: 0, burn: 0, rect: { x: t.x - t.w / 2, y: t.y - 46, w: t.w, h: 46 } }));
  const down = !!(sn && sn.logb);
  S.logb = { state: down ? 2 : 0, y: LOGB ? (down ? GY - 8 : LOGB.hang) : 0, vy: 0, burn: 0, rect: LOGB ? { x: LOGB.x, y: GY - 8, w: LOGB.w, h: 8 } : null };
  S.stalk = { st: sn && sn.stalk ? 'done' : 'off', x: 0, t: 0, n: 0, look: 0, side: 1, dir: 1, walk: 0, stepT: 0 };
}
function takeSnap(x, y) {
  S.snap = { x, y, crateX: S.crate.x, cartX: S.cart.x, tree: S.tree.state === 0 ? 0 : 2, boatX: S.boat.x, snags: S.snags.map(g => g.st === 2), mon: S.mon === 'done' ? 'done' : S.mon === 'active' ? 'active' : 'idle', sluice: S.sluice.pulled, eel: S.eel.st === 'done', thorns: S.thorns.map(t => t.st === 2), logb: S.logb.state !== 0, stalk: S.stalk.st === 'done', webs: S.webs.map(w => w.st === 2), spider: S.spider.st === 'dead',
    buff: { type: S.buff.type, t: S.buff.t }, specials: S.specials.slice(), looted: S.huts.map(h => h.looted), amb: S.amb.map(a => a.done), lamps: S.lamps.map(l => l.lit), kingDead: S.king && S.king.st === 'dead', c5done: S.c5 ? Object.assign({}, S.c5.done) : null };
}
function applyWorldSnap(sn) {
  S.crate.x = sn.crateX; S.cart.x = sn.cartX; S.cart.coast = 0;
  S.tree = { x: TREE_X, L: TREE_L, state: sn.tree, ang: sn.tree ? Math.PI / 2 : 0.05, ft: sn.tree ? 1 : 0, burn: 0 };
  S.plate.down = Math.abs(S.cart.x - PLATE_X) < 14; S.gate.open = (S.plate.down || sn.kingDead) ? 1 : 0;
  S.boat = { x: sn.boatX, v: 0, bob: 0, padT: 0 };
  S.snags = SNAG_X.map((x, i) => ({ x, st: sn.snags[i] ? 2 : 0, t: 0 }));
  S.mon = sn.mon;
  S.sluice = { pulled: sn.sluice, k: sn.sluice ? 1 : 0 }; S.eel = { st: sn.eel ? 'done' : 'off', x: 0, t: 0, side: 1, dir: 1, wig: 0 };
  initForest(sn); initSlopes(sn); initKing(sn);
  S.huts.forEach((h, i) => h.looted = sn.looted[i]);
  S.amb.forEach((a, i) => a.done = sn.amb[i] || a.cleared);
}
function startGame(ch, keep) {
  ch = ch || 1; loadChapter(ch); S.chapter = ch; track('mulai-bab' + ch);
  initWorld();
  const x0 = 60;
  S.mode = 'play'; S.p = newPlayer(x0, GY); S.hp = S.maxHp; S.buff = { type: null, t: 0 };
  if (!keep) S.specials = ['ungu', 'merah', 'hijau', 'kuning'].slice(0, ch - 1);          // starting straight at a later chapter: you own what the earlier ones give
  S.mos = []; S.flames = []; S.parts = []; S.spits = []; S.puddles = []; S.modal = null; S.toast = null; S.cr = newCreature(x0); S.card = null;
  S.fade = 1; S.death = null; S.deadT = 0; S.endT = 0; S.intensity = 0; S.lightT = 0.2; S.cam = 0; S.fireCd = 0; S.flash = 0; S.warn = 0; S.zoneK = 0; S.near = null;
  if (!keep) S.stats = { bites: 0, grabs: 0, kills: 0, deaths: 0, goo: 0 };
  takeSnap(x0, GY);
}
/* ---------- progress: a chapter opens only once the one before it is finished ---------- */
const PROG_KEY = 'fogbound_progress_v1';
function loadProg() { try { const v = JSON.parse(localStorage.getItem(PROG_KEY) || '{}'); return clamp(v.done | 0, 0, 5); } catch (e) { return 0; } }
function saveProg(n) { S.progress = Math.max(S.progress || 0, n); try { localStorage.setItem(PROG_KEY, JSON.stringify({ done: S.progress })); } catch (e) {} }
const chUnlocked = ch => ch === 1 || (S.progress || 0) >= ch - 1;
S.progress = TEST ? 5 : loadProg();
// anonymous play counts (GoatCounter, no cookies); silent when the analytics script isn't on the page
function track(name) { if (TEST) return; try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: name, title: name, event: true }); } catch (e) {} }
function showCard(ch, keep) { S.mode = 'card'; S.card = { ch, keep: !!keep, t: 0 }; S.fade = 0; }
function respawn(manual) {
  const sn = S.snap;
  S.p = newPlayer(sn.x, sn.y); S.hp = S.maxHp; S.buff = { type: sn.buff.type, t: sn.buff.t };
  S.specials = sn.specials.slice(); applyWorldSnap(sn);
  S.mos = []; S.flames = []; S.parts.length = 0; S.spits = []; S.puddles = []; S.modal = null; S.cr = newCreature(sn.x); S.cr.cd = 4;
  if (S.mon === 'active') { S.cr.act = true; S.cr.cx = sn.x - 380; S.cr.pcx = S.cr.cx; S.cr.cd = 3.2; }
  S.death = null; S.deadT = 0; S.fade = 1; S.lightT = 0; S.fireCd = 0; S.flash = 0; if (!manual) S.stats.deaths++;
}

/* ---------- particles ---------- */
function burstParts(x, y, n, col, spd, up, o) {
  o = o || {};
  for (let i = 0; i < n; i++) S.parts.push({ x, y, vx: (Math.random() - 0.5) * spd, vy: -Math.random() * up, life: (o.life || 0.5) * (0.6 + Math.random() * 0.8), col: Array.isArray(col) ? col[(Math.random() * col.length) | 0] : col, g: o.g === undefined ? 700 : o.g, sz: o.sz || 2 });
}
function updateParts(dt) {
  for (const q of S.parts) { q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; }
  S.parts = S.parts.filter(q => q.life > 0);
}

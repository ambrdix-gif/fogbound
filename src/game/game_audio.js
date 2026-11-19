/* ===== audio engine: reverb bus, layered synth SFX, procedural forest-village ambience ===== */
const A = { ctx: null, master: null, dry: null, verb: null, vsend: null, ambIn: null, ambSend: null, nz: null, curve: null,
  muted: false, simT: undefined, ambLevel: 1, rumble: null, breath: null, pad: null, buzz: null, tm: null, hbT: 0 };
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const aNow = () => (A.simT !== undefined ? A.simT : A.ctx.currentTime);

function noiseBuf(c, secs) {
  const b = c.createBuffer(1, Math.floor(c.sampleRate * secs), c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b;
}
function makeIR(c, secs, pw) {            // dark, decaying stereo impulse: forest-in-fog tail
  const n = Math.floor(c.sampleRate * secs), b = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch); let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n, k = 0.1 + 0.84 * t;
      lp += ((Math.random() * 2 - 1) - lp) * (1 - k);
      d[i] = lp * Math.pow(1 - t, pw) * (i < 300 ? i / 300 : 1) * 2.2;
    }
  }
  return b;
}
function distCurve(k) {
  const n = 1025, cu = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = i * 2 / (n - 1) - 1; cu[i] = (1 + k) * x / (1 + k * Math.abs(x)); } return cu;
}

/* routing: dry bus + reverb send; ambience has its own (duckable) bus */
function route(node, o) {
  const c = A.ctx; let n = node;
  if (o.pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = o.pan; n.connect(p); n = p; }
  n.connect(o.amb ? A.ambIn : A.dry);
  if (o.wet) { const w = c.createGain(); w.gain.value = o.wet; n.connect(w); w.connect(o.amb ? A.ambSend : A.vsend); }
}
function filt(n, f, t0, dur) {            // f = [type, freq, Q, freqEnd]
  const c = A.ctx, b = c.createBiquadFilter(); b.type = f[0]; b.frequency.setValueAtTime(f[1], t0);
  if (f[3]) b.frequency.exponentialRampToValueAtTime(f[3], t0 + dur);
  b.Q.value = f[2] || 0.7; n.connect(b); return b;
}
function amod(n, am, t0, dur) {           // amplitude modulation [rate, depth]
  const c = A.ctx, g = c.createGain(); g.gain.value = 1 - am[1] / 2;
  const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = am[0]; lg.gain.value = am[1] / 2;
  l.connect(lg); lg.connect(g.gain); l.start(t0); l.stop(t0 + dur + 0.05); n.connect(g); return g;
}
function osc(type, f0, f1, t0, dur, g, o) {
  o = o || {}; const c = A.ctx, s = c.createOscillator(); s.type = type;
  s.frequency.setValueAtTime(f0, t0); if (f1 && f1 !== f0) s.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg); lg.connect(s.frequency); l.start(t0); l.stop(t0 + dur + 0.05); }
  let n = s;
  if (o.dist) { const w = c.createWaveShaper(); w.curve = A.curve; n.connect(w); n = w; }
  if (o.f) n = filt(n, o.f, t0, dur);
  if (o.trem) n = amod(n, o.trem, t0, dur);
  const e = c.createGain(), atk = o.atk || 0.005;
  e.gain.value = 0; e.gain.setValueAtTime(0.0001, t0); e.gain.linearRampToValueAtTime(g, t0 + atk); if (o.hold) e.gain.setValueAtTime(g, t0 + Math.max(atk + 0.001, dur * o.hold)); e.gain.exponentialRampToValueAtTime(0.0001, Math.max(t0 + dur, t0 + atk + 0.02));
  n.connect(e); s.start(t0); s.stop(t0 + dur + 0.05); route(e, o);
}
function nz(t0, dur, g, o) {
  o = o || {}; const c = A.ctx, s = c.createBufferSource(); s.buffer = A.nz; s.loop = true;
  s.start(t0, Math.random() * 3); s.stop(t0 + dur + 0.05);
  let n = s;
  if (o.f) n = filt(n, o.f, t0, dur);
  if (o.f2) n = filt(n, o.f2, t0, dur);
  if (o.am) n = amod(n, o.am, t0, dur);
  const e = c.createGain(), atk = o.atk || 0.004;
  e.gain.value = 0; e.gain.setValueAtTime(0.0001, t0); e.gain.linearRampToValueAtTime(g, t0 + atk); if (o.hold) e.gain.setValueAtTime(g, t0 + Math.max(atk + 0.001, dur * o.hold)); e.gain.exponentialRampToValueAtTime(0.0001, Math.max(t0 + dur, t0 + atk + 0.02));
  n.connect(e); route(e, o);
}
function bubble(t, g, o) {                // liquid "bloop": quick rising sine
  o = o || {}; const f0 = rnd(200, 540);
  osc('sine', f0, f0 * rnd(1.7, 2.6), t, rnd(0.05, 0.1), g, { atk: 0.004, f: ['bandpass', f0 * 1.6, 3], wet: o.wet === undefined ? 0.25 : o.wet, pan: rnd(-0.25, 0.25), amb: o.amb });
}
function bell(t, f, g, wet, o) {          // inharmonic bell partials
  o = o || {};
  [[1, 1, 1.8], [2.76, 0.38, 1.0], [5.4, 0.14, 0.55], [0.5, 0.3, 2.2]].forEach(p => osc('sine', f * p[0], f * p[0], t, p[2], g * p[1], { atk: 0.003, wet: wet, pan: o.pan, amb: o.amb }));
}

/* ---------- one-shot SFX ---------- */
const SFX = {
  step(t, wood) {
    if (wood) { osc('triangle', 175, 105, t, 0.07, 0.10, { f: ['lowpass', 900] }); nz(t, 0.05, 0.07, { f: ['bandpass', 1100, 1.2] }); }
    else { nz(t, 0.09, 0.11, { f: ['lowpass', rnd(240, 420)] }); nz(t, 0.03, 0.035, { f: ['highpass', 2600] }); }
  },
  jump(t) { nz(t, 0.12, 0.06, { f: ['bandpass', 500, 1, 1100] }); osc('sine', 180, 330, t, 0.11, 0.05); },
  land(t) { osc('sine', 115, 52, t, 0.13, 0.17); nz(t, 0.1, 0.12, { f: ['lowpass', 300] }); },
  push(t) { nz(t, 0.13, 0.09, { f: ['bandpass', 190, 1.4] }); osc('sawtooth', 72, 60, t, 0.12, 0.03, { f: ['lowpass', 220] }); },
  splash(t) {
    nz(t, 0.7, 0.30, { f: ['bandpass', 1000, 0.9, 260], wet: 0.4 }); osc('sine', 300, 55, t, 0.5, 0.14, { wet: 0.3 });
    for (let i = 0; i < 7; i++) bubble(t + 0.12 + i * rnd(0.05, 0.1), 0.06);
  },
  death(t, kind) {
    osc('triangle', 150, 30, t, 1.2, 0.24, { wet: 0.5 });
    osc('sine', 196, 196, t + 0.05, 1.8, 0.05, { atk: 0.4, wet: 0.8, hold: 0.3 }); osc('sine', 207.7, 207.7, t + 0.05, 1.8, 0.05, { atk: 0.4, wet: 0.8, hold: 0.3 });
    nz(t, 0.45, 0.18, { f: ['lowpass', 420, 0.7, 120], wet: 0.3 });
    if (kind === 'eaten') { osc('sine', 230, 70, t + 0.08, 0.28, 0.2, { wet: 0.2 }); for (let i = 0; i < 4; i++) nz(t + 0.25 + i * 0.09, 0.07, 0.14, { f: ['bandpass', 1500, 2] }); }
    else if (kind === 'trap' || kind === 'spikes' || kind === 'saw') { nz(t, 0.09, 0.14, { f: ['highpass', 2200] }); osc('square', 620, 190, t, 0.1, 0.07, { f: ['lowpass', 1800] }); }
  },
  lamp(t) {
    nz(t, 0.3, 0.1, { atk: 0.05, f: ['bandpass', 300, 1, 1600], wet: 0.3 }); osc('sine', 90, 55, t, 0.25, 0.1, { wet: 0.2 });
    bell(t + 0.06, 523, 0.06, 0.55); bell(t + 0.2, 784, 0.045, 0.6);
  },
  fire(t, k) {
    const v = rnd(0.93, 1.07), heavy = k === 'brown', hot = k === 'orange', ice = k === 'white';
    osc('sine', (heavy ? 98 : 135) * v, 38, t, heavy ? 0.3 : 0.2, heavy ? 0.30 : 0.2, { wet: 0.25 });
    nz(t, 0.44, ice ? 0.17 : 0.24, { atk: 0.04, f: ['bandpass', (heavy ? 260 : hot ? 560 : 420) * v, 1.1, ice ? 3800 : hot ? 3000 : 2200], wet: 0.3 });
    nz(t, 0.32, 0.09, { atk: 0.02, f: ['lowpass', 900] });
    const nc = heavy ? 8 : hot ? 20 : ice ? 0 : 12;
    for (let i = 0; i < nc; i++) nz(t + rnd(0.02, 0.42), rnd(0.006, 0.02), rnd(0.05, 0.13), { f: ['highpass', rnd(1800, 4500)] });
    if (ice) { for (let i = 0; i < 6; i++) osc('sine', rnd(3600, 7800), 0, t + rnd(0.03, 0.4), 0.14, 0.028, { atk: 0.002, wet: 0.5, pan: rnd(-0.3, 0.3) }); osc('sine', 2300, 2600, t, 0.4, 0.03, { atk: 0.06, vib: [9, 30], wet: 0.5 }); }
    else osc('sawtooth', 62 * v, 46, t, 0.34, 0.07, { f: ['lowpass', 420], trem: [hot ? 31 : 22, 0.7] });
    if (hot) nz(t + 0.05, 0.5, 0.05, { f: ['highpass', 5200], am: [40, 0.8] });
    if (heavy) osc('sawtooth', 56, 38, t, 0.32, 0.1, { dist: 1, f: ['lowpass', 300], wet: 0.2 });
  },
  hurt(t) {
    nz(t, 0.2, 0.2, { f: ['bandpass', 900, 1, 380] }); osc('square', 230, 70, t, 0.2, 0.09, { f: ['lowpass', 800] });
    osc('sine', 72, 40, t, 0.15, 0.28); osc('sine', 66, 38, t + 0.15, 0.15, 0.2);
  },
  whine(t) { osc('sawtooth', 380, 1100, t, 0.5, 0.05, { atk: 0.08, f: ['bandpass', 900, 2], trem: [38, 0.8], wet: 0.2 }); },
  pop(t) { osc('sine', 700, 160, t, 0.09, 0.13); nz(t, 0.07, 0.12, { f: ['bandpass', 1400, 1.4] }); nz(t + 0.02, 0.2, 0.05, { f: ['highpass', 3000], wet: 0.2 }); },
  shatter(t) {
    nz(t, 0.3, 0.2, { f: ['highpass', 2400], wet: 0.3 });
    for (let i = 0; i < 10; i++) osc('sine', rnd(2000, 7000), 0, t + rnd(0, 0.35), rnd(0.15, 0.3), 0.04, { atk: 0.002, wet: 0.5, pan: rnd(-0.4, 0.4) });
  },
  freeze(t) {
    osc('sine', 2400, 1300, t, 0.45, 0.05, { atk: 0.01, wet: 0.5 }); osc('sine', 2430, 1330, t, 0.45, 0.04, { atk: 0.01, wet: 0.5 });
    nz(t, 0.15, 0.1, { f: ['highpass', 4000], wet: 0.4 }); osc('sine', 200, 90, t, 0.07, 0.15);
    for (let i = 0; i < 5; i++) osc('sine', rnd(3500, 8000), 0, t + 0.05 + i * 0.07, 0.2, 0.03, { atk: 0.002, wet: 0.6, pan: rnd(-0.4, 0.4) });
  },
  read(t) {
    for (let i = 0; i < 6; i++) nz(t + i * 0.07, 0.05, 0.08, { f: ['bandpass', rnd(2800, 4200), 1.5], pan: rnd(-0.2, 0.2) });
    [392, 494, 587, 784].forEach(f => osc('triangle', f, f, t + 0.3, 1.8, 0.04, { atk: 0.4, vib: [5, 3], wet: 0.7, hold: 0.3 }));
    bell(t + 0.5, 1568, 0.04, 0.7);
  },
  grab(t) {
    osc('sine', 100, 38, t, 0.9, 0.3, { wet: 0.3 }); nz(t, 0.5, 0.25, { f: ['lowpass', 350] });
    osc('sawtooth', 72, 45, t, 0.9, 0.12, { dist: 1, f: ['lowpass', 320], trem: [16, 0.7], wet: 0.45 });
  },
  free(t) { nz(t, 0.25, 0.18, { f: ['bandpass', 1500, 1, 400] }); osc('sine', 400, 800, t, 0.15, 0.06); },
  roar(t) {          // wind-up: guttural growl + liquid gurgle + inhale
    osc('sawtooth', 58, 46, t, 1.05, 0.2, { atk: 0.35, dist: 1, f: ['lowpass', 260, 1.2, 520], trem: [13, 0.65], wet: 0.45, hold: 0.6 });
    osc('sawtooth', 87, 64, t + 0.05, 0.95, 0.07, { atk: 0.4, f: ['bandpass', 300, 3, 700], trem: [17, 0.7], wet: 0.4, hold: 0.6 });
    nz(t + 0.1, 0.8, 0.16, { atk: 0.6, f: ['bandpass', 600, 2.2, 1500], am: [9, 0.6], wet: 0.3, hold: 0.6 });
    for (let tt = 0.05; tt < 0.9; tt += rnd(0.1, 0.19) * (1.05 - tt * 0.5)) bubble(t + tt, rnd(0.05, 0.09) * (0.6 + tt));
  },
  spit(t) {          // the heave: retching rattle + blorp + spray
    nz(t, 0.4, 0.32, { atk: 0.01, f: ['bandpass', 650, 1.4, 180], am: [30, 0.85], wet: 0.4 });
    osc('sine', 230, 52, t, 0.3, 0.3, { wet: 0.3 });
    osc('sawtooth', 110, 38, t, 0.6, 0.12, { dist: 1, f: ['lowpass', 380], wet: 0.5 });
    nz(t + 0.05, 0.3, 0.14, { f: ['highpass', 1800], wet: 0.3 });
    for (let i = 0; i < 4; i++) bubble(t + 0.08 + i * 0.06, 0.07);
  },
  splat(t) {
    nz(t, 0.14, 0.26, { f: ['bandpass', 700, 1.2, 240], wet: 0.3 }); osc('sine', 170, 50, t, 0.16, 0.26);
    nz(t + 0.03, 0.4, 0.08, { atk: 0.01, f: ['highpass', 2600], wet: 0.2 });
    for (let i = 0; i < 5; i++) bubble(t + 0.08 + i * rnd(0.04, 0.08), 0.05);
  },
  stomp(t, a) {      // giant footstep: sub boom + wet slosh; a = proximity 0..1
    osc('sine', 72, 30, t, 0.5, 0.5 * a, { wet: 0.4 }); nz(t, 0.35, 0.34 * a, { f: ['lowpass', 150, 0.7, 70] });
    nz(t + 0.02, 0.3, 0.07 * a, { f: ['bandpass', 520, 1], wet: 0.4 });
  },
  heart(t) { osc('sine', 64, 42, t, 0.16, 0.3, { wet: 0.1 }); osc('sine', 58, 40, t + 0.17, 0.16, 0.2, { wet: 0.1 }); },
  /* ---- v0.5: storybook, hut, puzzles, boat, monster set piece ---- */
  door(t) {
    osc('sawtooth', 130, 190, t, 0.55, 0.045, { atk: 0.12, vib: [12, 6], f: ['lowpass', 520], hold: 0.45, wet: 0.4 });
    nz(t + 0.5, 0.06, 0.1, { f: ['bandpass', 900, 2] }); osc('sine', 90, 55, t + 0.52, 0.15, 0.12);
  },
  page(t) {
    nz(t, 0.3, 0.15, { atk: 0.04, hold: 0.35, f: ['bandpass', 3000, 0.8, 1300], wet: 0.15, pan: -0.2 });
    nz(t + 0.06, 0.12, 0.09, { f: ['highpass', 4500], pan: 0.2 }); osc('sine', 130, 70, t + 0.34, 0.12, 0.06, { wet: 0.15 });
  },
  bookopen(t) {
    osc('sine', 92, 44, t, 0.45, 0.3, { wet: 0.4 }); nz(t, 0.2, 0.14, { f: ['lowpass', 380] });
    osc('sawtooth', 150, 230, t + 0.1, 0.7, 0.05, { atk: 0.15, vib: [10, 8], f: ['lowpass', 600], hold: 0.5, wet: 0.5 });
    for (let i = 0; i < 9; i++) nz(t + 0.45 + i * 0.05, 0.05, 0.07, { f: ['bandpass', rnd(2500, 4500), 1.5], pan: rnd(-0.3, 0.3) });
    [392, 494, 587].forEach(f => osc('triangle', f, f, t + 0.7, 2.0, 0.035, { atk: 0.5, vib: [5, 3], wet: 0.8, hold: 0.3 }));
    bell(t + 0.9, 784, 0.05, 0.7); bell(t + 1.15, 1175, 0.035, 0.7);
  },
  special(t) {
    [523, 659, 784, 1047, 1319].forEach((f, i) => bell(t + i * 0.13, f, 0.05, 0.75));
    osc('sine', 392, 392, t, 2.4, 0.05, { atk: 0.7, wet: 0.8, hold: 0.3 }); osc('sine', 588, 588, t, 2.4, 0.03, { atk: 0.7, wet: 0.8, hold: 0.3 });
  },
  cart(t) {
    nz(t, 0.32, 0.11, { f: ['bandpass', 240, 1.3] }); osc('sawtooth', 95, 78, t, 0.3, 0.04, { f: ['lowpass', 300], vib: [22, 10] });
    osc('square', rnd(1300, 1700), 1200, t + rnd(0, 0.15), 0.07, 0.012, { atk: 0.01, f: ['bandpass', 1500, 3], wet: 0.2 });
  },
  plate(t) {
    osc('sine', 130, 55, t, 0.25, 0.28, { wet: 0.3 }); nz(t, 0.07, 0.2, { f: ['bandpass', 1800, 2] });
    osc('square', 900, 480, t + 0.03, 0.06, 0.05, { f: ['lowpass', 2000] }); bell(t + 0.1, 659, 0.04, 0.6);
  },
  gate(t, open) {
    for (let i = 0; i < 3; i++) nz(t + i * 0.04, 0.03, 0.07, { f: ['bandpass', rnd(2000, 3500), 3], wet: 0.2 });
    osc('sawtooth', 100 + (open || 0) * 70, 110 + (open || 0) * 70, t, 0.28, 0.03, { atk: 0.06, vib: [16, 8], f: ['lowpass', 420], wet: 0.3 }); nz(t, 0.3, 0.05, { f: ['lowpass', 160] });
  },
  rope(t) {
    for (let i = 0; i < 9; i++) nz(t + rnd(0, 0.3), rnd(0.01, 0.025), rnd(0.05, 0.11), { f: ['highpass', rnd(1800, 4200)] });
    nz(t, 0.35, 0.09, { atk: 0.05, f: ['bandpass', 600, 1, 2400] });
    nz(t + 0.32, 0.05, 0.22, { f: ['bandpass', 1400, 2] }); osc('triangle', 620, 190, t + 0.32, 0.1, 0.1);
    osc('sawtooth', 62, 112, t + 0.4, 1.1, 0.08, { atk: 0.35, vib: [8, 6], f: ['lowpass', 420], hold: 0.5, wet: 0.5 });
    for (let i = 0; i < 5; i++) nz(t + 0.5 + i * 0.16, 0.05, 0.1, { f: ['bandpass', rnd(700, 1600), 2.5], wet: 0.3 });
  },
  treefall(t) {
    osc('sine', 62, 24, t, 1.5, 0.55, { wet: 0.5 }); nz(t, 1.1, 0.42, { f: ['lowpass', 300, 0.7, 70], wet: 0.5 });
    for (let i = 0; i < 6; i++) nz(t + i * 0.03, 0.045, 0.22, { f: ['bandpass', rnd(700, 2600), 2] });
    nz(t + 0.05, 1.0, 0.26, { f: ['bandpass', 900, 0.9, 200], wet: 0.4 }); osc('sine', 300, 55, t + 0.04, 0.6, 0.15, { wet: 0.3 });
    for (let i = 0; i < 9; i++) bubble(t + 0.15 + i * rnd(0.06, 0.12), 0.06);
    osc('sawtooth', 48, 34, t + 0.05, 1.8, 0.1, { atk: 0.1, dist: 1, f: ['lowpass', 240], wet: 0.6 });
  },
  burnwood(t) {
    for (let i = 0; i < 12; i++) nz(t + rnd(0, 0.7), rnd(0.01, 0.03), rnd(0.05, 0.12), { f: ['highpass', rnd(1500, 4000)] });
    nz(t, 0.6, 0.12, { atk: 0.06, f: ['bandpass', 500, 1, 2500], wet: 0.2 });
  },
  paddle(t) {
    nz(t, 0.28, 0.1, { atk: 0.05, f: ['bandpass', 700, 0.8, 300], wet: 0.3 }); bubble(t + 0.1, 0.05); osc('sine', 160, 110, t, 0.05, 0.06);
  },
  boatland(t) { osc('sine', 100, 60, t, 0.16, 0.16); nz(t, 0.3, 0.12, { f: ['bandpass', 600, 1, 250], wet: 0.3 }); },
  monrise(t) {          // the one-time reveal: something huge wades up out of the fog
    osc('sine', 28, 46, t, 3.2, 0.4, { atk: 1.3, wet: 0.6, hold: 0.5 });
    osc('sawtooth', 52, 38, t + 0.4, 2.8, 0.22, { atk: 1.0, dist: 1, f: ['lowpass', 240, 1.2, 480], trem: [11, 0.7], wet: 0.6, hold: 0.5 });
    osc('sawtooth', 79, 55, t + 0.6, 2.4, 0.07, { atk: 1.1, f: ['bandpass', 300, 3, 700], trem: [15, 0.7], wet: 0.5, hold: 0.5 });
    nz(t, 2.6, 0.2, { atk: 1.0, f: ['lowpass', 180], wet: 0.5, hold: 0.4 }); nz(t + 0.2, 1.8, 0.12, { atk: 0.6, f: ['bandpass', 400, 0.8, 150], wet: 0.5 });
    for (let i = 0; i < 16; i++) bubble(t + 0.3 + i * rnd(0.08, 0.16), rnd(0.04, 0.08));
    [0.3, 1.0, 1.7].forEach((d, i) => SFX.stomp(t + d, 0.7 + i * 0.12));
    for (let i = 0; i < 7; i++) osc('triangle', 196 * (1 + i * 0.003), 196, t + 1.2, 2.2, 0.012, { atk: 0.9, wet: 0.9, hold: 0.3 });
  },
  /* ---- chapter 2: water, mud, leeches, sluice, the thing under the water ---- */
  wade(t, d) {            // a leg dragged through water; d = how deep 0..1
    d = d || 0.4;
    nz(t, 0.26 + d * 0.14, 0.07 + d * 0.07, { atk: 0.04, f: ['bandpass', 900 - d * 450, 0.8, 320], wet: 0.3, pan: rnd(-0.2, 0.2) });
    osc('sine', 150 - d * 50, 80, t, 0.12, 0.05 + d * 0.04);
    bubble(t + 0.08, 0.035 + d * 0.03); if (d > 0.5) bubble(t + 0.17, 0.04);
  },
  plunge(t, a) {
    a = a || 0.6;
    nz(t, 0.8, 0.22 + a * 0.16, { f: ['bandpass', 1200, 0.8, 220], wet: 0.45 }); osc('sine', 240, 45, t, 0.55, 0.16 + a * 0.1, { wet: 0.3 });
    nz(t + 0.05, 0.4, 0.1, { f: ['highpass', 2400], wet: 0.3 });
    for (let i = 0; i < 9; i++) bubble(t + 0.14 + i * rnd(0.05, 0.11), 0.07);
  },
  hiss(t) {               // the lantern drowning: steam, then a low sad tone
    nz(t, 1.1, 0.26, { atk: 0.01, f: ['highpass', 2600, 0.7, 900], wet: 0.4 });
    nz(t, 0.5, 0.1, { f: ['bandpass', 5200, 2], wet: 0.2 });
    osc('sine', 392, 196, t + 0.1, 1.3, 0.07, { atk: 0.05, wet: 0.8 }); osc('sine', 233, 110, t + 0.25, 1.4, 0.06, { atk: 0.1, wet: 0.8 });
  },
  relight(t) {
    nz(t, 0.35, 0.16, { atk: 0.02, f: ['bandpass', 400, 0.9, 2400], wet: 0.3 }); osc('sine', 70, 120, t, 0.25, 0.1);
    bell(t + 0.08, 659, 0.05, 0.6); bell(t + 0.22, 988, 0.035, 0.6);
    for (let i = 0; i < 6; i++) nz(t + 0.1 + rnd(0, 0.5), rnd(0.01, 0.03), rnd(0.03, 0.07), { f: ['highpass', rnd(1800, 4000)] });
  },
  dud(t) { nz(t, 0.09, 0.08, { f: ['bandpass', 2400, 2] }); osc('square', 180, 120, t, 0.07, 0.03, { f: ['lowpass', 700] }); },
  leech(t) {              // wet little suck
    osc('sine', 520, 140, t, 0.16, 0.1, { f: ['bandpass', 500, 4] }); nz(t, 0.12, 0.08, { f: ['bandpass', 1500, 3, 500] }); bubble(t + 0.09, 0.06);
    osc('sawtooth', 96, 80, t, 0.3, 0.04, { atk: 0.05, f: ['lowpass', 300], wet: 0.4 });
  },
  sizzle(t) {
    nz(t, 0.5, 0.2, { atk: 0.01, f: ['highpass', 3000, 0.8, 1400], am: [38, 0.6] });
    for (let i = 0; i < 5; i++) osc('sine', rnd(900, 1500), rnd(300, 500), t + i * 0.05, 0.09, 0.035);
  },
  mud(t) {                // thick squelch
    nz(t, 0.24, 0.16, { atk: 0.03, f: ['lowpass', 520, 2, 160] }); osc('sine', 130, 58, t, 0.2, 0.13);
    osc('sawtooth', 210, 90, t + 0.03, 0.14, 0.035, { f: ['bandpass', 380, 5, 150] }); bubble(t + 0.13, 0.05, { wet: 0.1 });
  },
  lever(t) {
    osc('square', 150, 60, t, 0.2, 0.09, { f: ['lowpass', 900] }); nz(t, 0.1, 0.14, { f: ['bandpass', 1300, 2] });
    for (let i = 0; i < 5; i++) { nz(t + 0.18 + i * 0.09, 0.03, 0.1, { f: ['bandpass', 2300, 5] }); osc('triangle', 240 - i * 14, 170, t + 0.18 + i * 0.09, 0.05, 0.05); }
    osc('sine', 62, 40, t + 0.6, 0.7, 0.22, { wet: 0.5 }); nz(t + 0.6, 0.5, 0.14, { f: ['lowpass', 260], wet: 0.4 });
  },
  drain(t) {              // a pool emptying through the sluice
    nz(t + 0.5, 4.2, 0.2, { atk: 0.7, f: ['bandpass', 700, 0.6, 320], am: [7, 0.3], wet: 0.5, hold: 0.6 });
    nz(t + 0.5, 4.0, 0.1, { atk: 0.8, f: ['lowpass', 220], wet: 0.4, hold: 0.6 });
    for (let i = 0; i < 26; i++) bubble(t + 0.6 + i * rnd(0.1, 0.19), rnd(0.03, 0.07));
    osc('sine', 110, 52, t + 3.6, 1.4, 0.1, { atk: 0.3, wet: 0.6 });
  },
  eelwarn(t) {            // something big displacing water, far off
    osc('sine', 44, 70, t, 1.5, 0.3, { atk: 0.5, wet: 0.6, hold: 0.4 }); osc('sawtooth', 58, 41, t + 0.2, 1.3, 0.1, { atk: 0.4, dist: 1, f: ['lowpass', 200], trem: [8, 0.6], wet: 0.6 });
    nz(t, 1.4, 0.1, { atk: 0.5, f: ['bandpass', 380, 0.8, 140], wet: 0.5 });
    for (let i = 0; i < 8; i++) bubble(t + 0.3 + i * rnd(0.09, 0.17), rnd(0.04, 0.07));
    for (let i = 0; i < 5; i++) osc('triangle', 208 * (1 + i * 0.004), 196, t + 0.4, 1.3, 0.012, { atk: 0.5, wet: 0.9, hold: 0.3 });
  },
  eelbump(t) { osc('sine', 80, 38, t, 0.4, 0.3, { wet: 0.4 }); nz(t, 0.5, 0.18, { f: ['bandpass', 500, 0.8, 180], wet: 0.4 }); for (let i = 0; i < 6; i++) bubble(t + 0.1 + i * rnd(0.05, 0.1), 0.06); },
  eelbite(t) {
    nz(t, 0.5, 0.3, { f: ['bandpass', 1400, 0.8, 300], wet: 0.4 }); osc('sawtooth', 190, 52, t, 0.36, 0.2, { dist: 1, f: ['lowpass', 900, 1, 240], wet: 0.3 });
    for (let i = 0; i < 4; i++) nz(t + 0.08 + i * 0.07, 0.05, 0.16, { f: ['bandpass', 1900, 3] });
    for (let i = 0; i < 8; i++) bubble(t + 0.2 + i * rnd(0.04, 0.09), 0.07);
  },
  /* ---- chapter 4 ---- */
  slide(t) { nz(t, 0.7, 0.16, { atk: 0.05, f: ['bandpass', 700, 0.9, 1800], am: [40, 0.5] }); nz(t, 0.6, 0.08, { f: ['lowpass', 300] }); },
  logroll(t) { osc('sine', 70, 48, t, 1.4, 0.22, { atk: 0.2, trem: [11, 0.7], wet: 0.4, hold: 0.5 }); nz(t, 1.3, 0.12, { atk: 0.2, f: ['lowpass', 420], am: [13, 0.8], wet: 0.3, hold: 0.5 }); for (let i = 0; i < 5; i++) osc('square', rnd(120, 190), 80, t + 0.2 + i * 0.22, 0.05, 0.07, { f: ['lowpass', 700] }); },
  loghit(t) { osc('sine', 110, 40, t, 0.35, 0.4, { wet: 0.3 }); nz(t, 0.2, 0.3, { f: ['bandpass', 600, 1, 180] }); osc('square', 220, 70, t, 0.12, 0.12, { f: ['lowpass', 900] }); },
  webburn(t) { nz(t, 0.45, 0.2, { atk: 0.01, f: ['highpass', 2600, 0.8, 900], am: [46, 0.6] }); for (let i = 0; i < 6; i++) osc('sine', rnd(1400, 2600), rnd(500, 900), t + i * 0.04, 0.06, 0.03); },
  webshot(t) { nz(t, 0.25, 0.16, { f: ['bandpass', 2400, 2, 600] }); osc('sine', 900, 240, t, 0.3, 0.08); },
  webstick(t) { nz(t, 0.3, 0.2, { f: ['bandpass', 900, 2, 300] }); osc('sawtooth', 300, 90, t, 0.25, 0.07, { f: ['bandpass', 500, 5] }); bubble(t + 0.1, 0.06); },
  spiderdrop(t) { for (let i = 0; i < 10; i++) osc('square', rnd(1500, 2600), 1200, t + i * 0.045, 0.02, 0.05, { f: ['bandpass', 2200, 6] }); osc('sawtooth', 130, 70, t, 0.7, 0.1, { atk: 0.2, dist: 1, f: ['lowpass', 420], trem: [19, 0.7], wet: 0.6 }); nz(t, 0.6, 0.07, { atk: 0.2, f: ['highpass', 3200], wet: 0.5 }); },
  spiderhit(t) { osc('sawtooth', 1400, 500, t, 0.35, 0.16, { dist: 2, f: ['bandpass', 1800, 3, 700], trem: [34, 0.7], wet: 0.4 }); osc('square', 2100, 900, t, 0.3, 0.07, { f: ['bandpass', 2600, 4], wet: 0.4 }); nz(t, 0.3, 0.16, { f: ['highpass', 2400] }); },
  spiderdie(t) { for (let k = 0; k < 3; k++) osc('sawtooth', 1500 - k * 300, 180, t + k * 0.22, 0.6, 0.15, { dist: 2, f: ['bandpass', 1500, 2.5, 300], trem: [30 - k * 6, 0.7], wet: 0.6 }); nz(t, 1.4, 0.2, { f: ['bandpass', 1200, 0.8, 200], wet: 0.5 }); osc('sine', 90, 30, t + 0.6, 0.9, 0.3, { wet: 0.4 }); for (let i = 0; i < 12; i++) osc('square', rnd(900, 1800), 500, t + 0.3 + i * 0.07, 0.025, 0.05, { f: ['bandpass', 1600, 5] }); },
  /* ---- chapter 3 ---- */
  climb(t) { nz(t, 0.07, 0.07, { f: ['bandpass', 900, 2, 500] }); osc('triangle', 170, 120, t, 0.06, 0.04); },
  grabrope(t) { nz(t, 0.12, 0.13, { f: ['bandpass', 700, 1.5, 300] }); osc('sine', 150, 90, t, 0.12, 0.09); osc('sawtooth', 300, 200, t + 0.02, 0.2, 0.03, { f: ['bandpass', 500, 6], trem: [14, 0.6] }); },
  crack(t) { for (let i = 0; i < 4; i++) { nz(t + i * 0.07 + rnd(0, 0.02), 0.035, 0.16, { f: ['bandpass', rnd(1400, 2600), 4] }); osc('square', rnd(300, 500), 120, t + i * 0.07, 0.04, 0.05, { f: ['lowpass', 1400] }); } },
  snap(t) { nz(t, 0.12, 0.3, { f: ['bandpass', 1800, 1.2, 400] }); osc('square', 420, 60, t, 0.16, 0.14, { f: ['lowpass', 1600, 1, 300] }); nz(t + 0.1, 0.5, 0.12, { f: ['lowpass', 500], wet: 0.4 }); osc('sine', 90, 40, t + 0.25, 0.3, 0.14, { wet: 0.3 }); },
  thorn(t) { for (let i = 0; i < 5; i++) nz(t + i * 0.025, 0.03, 0.12, { f: ['highpass', rnd(2500, 4500)] }); osc('sawtooth', 240, 150, t, 0.1, 0.06, { f: ['bandpass', 900, 3] }); },
  hide(t) { nz(t, 0.35, 0.1, { atk: 0.05, f: ['bandpass', 2600, 0.8, 900], am: [22, 0.5] }); osc('sine', 300, 180, t, 0.25, 0.03); },
  stomp(t) { osc('sine', 62, 30, t, 0.5, 0.42, { wet: 0.5 }); nz(t, 0.3, 0.22, { f: ['lowpass', 180], wet: 0.5 }); nz(t + 0.04, 0.2, 0.06, { f: ['bandpass', 900, 1], wet: 0.5 }); },
  stalkroar(t) {          // its call before it comes: a hollow shriek that breaks and falls, over a wooden groan
    for (const [dt, f0, f1, d, v] of [[0, 190, 560, 0.55, 0.2], [0.5, 560, 610, 0.5, 0.22], [0.95, 610, 150, 1.1, 0.2]]) {
      osc('sawtooth', f0, f1, t + dt, d, v, { atk: 0.06, dist: 2, f: ['bandpass', 1100, 2.2, 700], trem: [27, 0.5], wet: 0.6, hold: 0.5 });
      osc('square', f0 * 1.51, f1 * 1.49, t + dt, d, v * 0.35, { atk: 0.08, f: ['bandpass', 1900, 3], trem: [31, 0.6], wet: 0.7, hold: 0.5 });
    }
    nz(t, 2.0, 0.16, { atk: 0.2, f: ['bandpass', 1600, 1.2, 500], am: [29, 0.6], wet: 0.6, hold: 0.5 });
    osc('sawtooth', 62, 44, t + 0.2, 2.2, 0.2, { atk: 0.5, dist: 1, f: ['lowpass', 240], trem: [9, 0.5], wet: 0.6, hold: 0.4 });
    osc('sine', 48, 34, t, 2.4, 0.3, { atk: 0.4, wet: 0.5, hold: 0.4 });
    for (let i = 0; i < 9; i++) osc('square', 90 + i * 4, 70, t + 1.5 + i * 0.07, 0.035, 0.07, { f: ['bandpass', 800, 5] });       // dry rattle at the end
  },
  stalklook(t) {          // a long dry breath in, with a rattle
    nz(t, 1.6, 0.18, { atk: 0.7, f: ['bandpass', 500, 1.2, 1500], wet: 0.6, hold: 0.3 });
    for (let i = 0; i < 14; i++) osc('square', 70 + i * 3, 60, t + 0.3 + i * 0.075, 0.03, 0.06, { f: ['bandpass', 700, 5] });
    for (let i = 0; i < 4; i++) osc('triangle', 233 * (1 + i * 0.006), 220, t + 0.2, 1.8, 0.014, { atk: 0.6, wet: 0.9, hold: 0.3 });
  },
  stalkhit(t) { nz(t, 0.5, 0.36, { f: ['bandpass', 900, 0.8, 200], wet: 0.4 }); osc('sawtooth', 160, 40, t, 0.5, 0.26, { dist: 1, f: ['lowpass', 800, 1, 200], wet: 0.4 }); osc('sine', 70, 30, t, 0.6, 0.4, { wet: 0.3 }); for (let i = 0; i < 5; i++) nz(t + 0.05 + i * 0.05, 0.04, 0.18, { f: ['bandpass', 2200, 3] }); },
  monleave(t) {
    osc('sawtooth', 70, 32, t, 3.4, 0.14, { atk: 0.6, dist: 1, f: ['lowpass', 200], trem: [9, 0.6], wet: 0.9, hold: 0.3 });
    nz(t, 3, 0.08, { atk: 0.8, f: ['lowpass', 160], wet: 0.8, hold: 0.3 });
  },
};
function sfx(kind, arg) {
  const c = A.ctx; if (!c || A.muted) return;
  const fn = SFX[kind]; if (!fn) return;
  try { fn(aNow(), arg); } catch (e) {}
}

/* ---------- ambient events (forest village at night) ---------- */
function hoot(t, f, dur, g, o) {
  const r = { atk: 0.07, wet: o.wet, pan: o.pan, amb: 1 };
  osc('sine', f * 1.06, f, t, dur, g, Object.assign({ vib: [5.5, f * 0.012], f: ['lowpass', f * 3] }, r));
  osc('sine', f * 2.01, f * 1.9, t, dur * 0.8, g * 0.18, r);
  nz(t, dur, g * 0.12, { atk: 0.07, f: ['bandpass', f * 1.2, 4], wet: o.wet, pan: o.pan, amb: 1 });
}
const AMB = {
  owl(t) {
    const pan = rnd(-0.8, 0.8), f = rnd(330, 400), far = Math.random() < 0.5, o = { wet: far ? 0.9 : 0.55, pan }, g = far ? 0.05 : 0.08;
    hoot(t, f, 0.28, g, o); hoot(t + 0.42, f, 0.28, g, o); hoot(t + 0.9, f * 0.93, 0.8, g * 1.1, o);
    if (Math.random() < 0.7) { const o2 = { wet: 1.0, pan: -pan * 0.7 }, f2 = f * 1.22, d = rnd(1.8, 2.6); hoot(t + d, f2, 0.3, 0.03, o2); hoot(t + d + 0.5, f2 * 0.94, 0.7, 0.032, o2); }
  },
  frogs(t) {
    const n = 4 + ((Math.random() * 5) | 0), base = rnd(150, 210), pan0 = rnd(-0.9, 0.9); let tt = 0;
    for (let i = 0; i < n; i++) {
      tt += rnd(0.12, 0.34); const f = base * rnd(0.9, 1.15), o = { atk: 0.01, f: ['bandpass', f * 2.2, 3, f * 1.4], trem: [48, 0.9], pan: pan0 + rnd(-0.15, 0.15), wet: 0.4, amb: 1 };
      osc('sawtooth', f * 1.25, f, t + tt, 0.11, 0.06, o); if (Math.random() < 0.4) osc('sawtooth', f * 1.35, f * 1.05, t + tt + 0.12, 0.09, 0.04, o);
    }
    if (Math.random() < 0.4) for (let i = 0; i < 9; i++) osc('sine', 2300, 2100, t + 0.2 + i * 0.045, 0.03, 0.014, { atk: 0.003, pan: -pan0, wet: 0.4, amb: 1 });
  },
  crickets(t) {
    const f = rnd(4300, 5200), pan = rnd(-0.9, 0.9), n = 6 + ((Math.random() * 10) | 0); let tt = 0;
    for (let i = 0; i < n; i++) { for (let k = 0; k < 3; k++) osc('sine', f, f, t + tt + k * 0.028, 0.018, 0.012, { atk: 0.003, pan, wet: 0.25, amb: 1 }); tt += rnd(0.11, 0.15); }
  },
  bird(t) {
    const pan = rnd(-0.9, 0.9), o = { atk: 0.04, vib: [7, 25], wet: 0.9, pan, amb: 1 };
    osc('sine', 1900, 1500, t, 0.3, 0.035, o); osc('sine', 1900, 1450, t + 0.42, 0.3, 0.035, o); osc('sine', 1750, 1300, t + 0.95, 0.4, 0.03, o);
  },
  tokek(t) {
    const pan = rnd(-0.8, 0.8); let tt = 0, gap = 0.085;
    osc('square', 520, 430, t, 0.13, 0.05, { atk: 0.01, f: ['bandpass', 900, 2], pan, wet: 0.7, amb: 1 }); osc('square', 480, 380, t + 0.3, 0.16, 0.05, { atk: 0.01, f: ['bandpass', 800, 2], pan, wet: 0.7, amb: 1 });
    tt = 0.7; for (let i = 0; i < 7; i++) { osc('square', 700 - i * 14, 580 - i * 14, t + tt, 0.05, 0.04, { atk: 0.004, f: ['bandpass', 900, 2], pan, wet: 0.7, amb: 1 }); tt += gap; gap *= 1.1; }
  },
  kentongan(t) {
    const pan = rnd(-0.9, 0.9), f = rnd(380, 520), pat = pick([[0, 0.5, 1, 1.5, 2], [0, 0.9, 1.8, 2.1, 2.4, 2.7, 3], [0, 0.4, 0.8, 1.6, 2]]);
    pat.forEach((d, i) => { const g = i === 0 ? 0.065 : 0.05, o = { pan, wet: 0.85, amb: 1 };
      osc('sine', f * 1.1, f, t + d, 0.2, g, Object.assign({ atk: 0.002 }, o)); osc('triangle', f * 2.4, f * 2.3, t + d, 0.08, g * 0.4, Object.assign({ atk: 0.002 }, o));
      nz(t + d, 0.05, g * 0.8, { f: ['bandpass', 1400, 2], pan, wet: 0.8, amb: 1 }); });
  },
  drip(t) {
    const f = rnd(900, 1800), pan = rnd(-0.8, 0.8);
    [[0, 1], [0.22, 0.4], [0.42, 0.18]].forEach(p => osc('sine', f, f * 0.7, t + p[0], 0.09, 0.02 * p[1], { atk: 0.002, wet: 0.8, pan, amb: 1 }));
  },
  creak(t) { osc('sawtooth', 180, 240, t, 0.55, 0.022, { atk: 0.1, hold: 0.4, vib: [14, 8], f: ['lowpass', 500], wet: 0.5, pan: rnd(-0.8, 0.8), amb: 1 }); },
  rustle(t) { nz(t, 0.9, 0.022, { atk: 0.25, hold: 0.5, f: ['highpass', 2500], am: [11, 0.5], pan: rnd(-0.8, 0.8), wet: 0.2, amb: 1 }); },
  bellow(t) {
    osc('sawtooth', 70, 40, t, 2.2, 0.06, { atk: 0.7, dist: 1, f: ['lowpass', 220], trem: [11, 0.5], wet: 0.95, amb: 1, hold: 0.3 });
    nz(t, 2, 0.04, { atk: 0.7, hold: 0.3, f: ['lowpass', 200], wet: 0.9, amb: 1 });
  },
};
// [name, min gap, max gap, first delay, allowed()]
const AMB_SCHED = [
  ['crickets', 2.5, 6, 0.5, i => i < 0.7], ['frogs', 3, 9, 1.5, i => i < 0.8], ['owl', 7, 17, 4, i => i < 0.55],
  ['drip', 2.5, 7, 2.5, () => true], ['rustle', 6, 14, 5, i => i < 0.8], ['bird', 14, 32, 9, i => i < 0.5],
  ['kentongan', 38, 80, 18, i => i < 0.4], ['tokek', 45, 100, 28, i => i < 0.4], ['creak', 20, 45, 12, () => true],
  ['bellow', 45, 90, 30, i => i < 0.35],
];

/* ---------- build / start / tick ---------- */
function audioBuild(c) {
  A.ctx = c;
  A.master = c.createGain(); A.master.gain.value = A.muted ? 0 : 0.85;
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.2;
  A.master.connect(comp); comp.connect(c.destination);
  A.dry = c.createGain(); A.dry.connect(A.master);
  A.verb = c.createConvolver(); A.verb.buffer = makeIR(c, 2.6, 2.4);
  const vg = c.createGain(); vg.gain.value = 0.9; A.verb.connect(vg); vg.connect(A.master);
  A.vsend = c.createGain(); A.vsend.connect(A.verb);
  A.ambIn = c.createGain(); A.ambIn.connect(A.dry);
  A.ambSend = c.createGain(); A.ambSend.connect(A.verb);
  A.nz = noiseBuf(c, 4); A.curve = distCurve(40);
  const loopNoise = () => { const s = c.createBufferSource(); s.buffer = A.nz; s.loop = true; s.start(0, Math.random() * 3); return s; };
  // ambience beds (duckable): low swamp drone + two slow wind bands
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 150; lp.connect(A.ambIn);
  const dg = c.createGain(); dg.gain.value = 0.045; dg.connect(lp);
  [48, 48.45, 72.2].forEach(f => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(dg); o.start(); });
  const lfo = c.createOscillator(); lfo.frequency.value = 0.07; const lg = c.createGain(); lg.gain.value = 60; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
  [[-0.6, 420, 0.071], [0.6, 560, 0.093]].forEach(w => {
    const s = loopNoise(), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = w[1]; bp.Q.value = 0.6;
    const fl = c.createOscillator(), fg = c.createGain(); fl.frequency.value = w[2]; fg.gain.value = w[1] * 0.45; fl.connect(fg); fg.connect(bp.frequency); fl.start();
    const g = c.createGain(); g.gain.value = 0.03; const gl = c.createOscillator(), glg = c.createGain(); gl.frequency.value = w[2] * 1.7; glg.gain.value = 0.017; gl.connect(glg); glg.connect(g.gain); gl.start();
    s.connect(bp); bp.connect(g); if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = w[0]; g.connect(p); p.connect(A.ambIn); } else g.connect(A.ambIn);
  });
  // danger layers (not ducked): sub rumble, breathing, dissonant pad; mosquito buzz
  const ro = c.createOscillator(); ro.type = 'triangle'; ro.frequency.value = 38; const rg = c.createGain(); rg.gain.value = 0; ro.connect(rg); rg.connect(A.dry); ro.start(); A.rumble = rg;
  const bs = loopNoise(), bl = c.createBiquadFilter(); bl.type = 'lowpass'; bl.frequency.value = 260; const bg = c.createGain(); bg.gain.value = 0;
  const bm = c.createOscillator(), bmg = c.createGain(); bm.frequency.value = 0.32; bmg.gain.value = 0.5; const bm2 = c.createGain(); bm2.gain.value = 0.5; bm.connect(bmg); bmg.connect(bm2.gain);
  bs.connect(bl); bl.connect(bm2); bm2.connect(bg); bg.connect(A.dry); bm.start(); A.breath = bg;
  const pg = c.createGain(); pg.gain.value = 0; const pl = c.createBiquadFilter(); pl.type = 'lowpass'; pl.frequency.value = 400;
  [110, 116.5, 164.8].forEach(f => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(pl); o.start(); }); pl.connect(pg); pg.connect(A.dry); A.pad = pg;
  const bo = c.createOscillator(); bo.type = 'sawtooth'; bo.frequency.value = 232;
  const bf = c.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 700; bf.Q.value = 1.4; const bug = c.createGain(); bug.gain.value = 0;
  const vo = c.createOscillator(); vo.frequency.value = 31; const vg2 = c.createGain(); vg2.gain.value = 22; vo.connect(vg2); vg2.connect(bo.frequency);
  bo.connect(bf); bf.connect(bug); bug.connect(A.dry); bo.start(); vo.start(); A.buzz = bug;
  A.tm = AMB_SCHED.map(e => ({ n: e[0], lo: e[1], hi: e[2], t: e[3], ok: e[4] }));
}
function audioStart() {
  if (TEST) return;
  try {
    if (A.ctx) { A.ctx.resume(); return; }
    audioBuild(new (window.AudioContext || window.webkitAudioContext)());
  } catch (e) { A.ctx = null; }
}
function setMuted(m) { A.muted = m; if (A.master) A.master.gain.value = m ? 0 : 0.85; }
function audioTick(dt) {
  const c = A.ctx; if (!c) return;
  const t = aNow(), m = S.mode, play = m === 'play' && S.p, inten = play ? S.intensity : 0, sm = (p, v, k) => p.setTargetAtTime(v, t, k || 0.1);
  const lvl = (m === 'end' ? 0.5 : m === 'title' || m === 'intro' ? 0.8 : 1) * (1 - 0.78 * inten) * (S.modal ? 0.6 : 1);
  sm(A.ambIn.gain, lvl, 0.25); sm(A.ambSend.gain, lvl, 0.25);
  sm(A.rumble.gain, 0.02 + 0.15 * inten); sm(A.breath.gain, 0.13 * inten * inten, 0.3); sm(A.pad.gain, 0.03 * inten, 0.4);
  let near = 1e9; if (play) for (const mm of S.mos) if (mm.t >= 0) near = Math.min(near, Math.hypot(mm.x - S.p.x, mm.y - S.p.y));
  sm(A.buzz.gain, 0.05 * Math.max(0, Math.min(1, 1 - near / 320)));
  if (play && !S.p.dead && (S.hp <= 1 || S.p.grab)) { A.hbT -= dt; if (A.hbT <= 0) { SFX.heart(t); A.hbT = S.p.grab ? 0.6 : 0.9; } } else A.hbT = 0;
  if (m !== 'end') for (const e of A.tm) { e.t -= dt; if (e.t <= 0) { if (e.ok(inten)) { try { AMB[e.n](t); } catch (er) {} } e.t = rnd(e.lo, e.hi); } }
}

// Suoni segnaposto generati al volo. Vengono usati solo quando la cartella
// audio corrispondente è vuota.
const TAU = Math.PI * 2;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const rnd = () => Math.random() * 2 - 1;

function wave(type, ph) {
  const x = TAU * ph;
  switch (type) {
    case 'sine': return Math.sin(x);
    case 'tri': return 2 / Math.PI * Math.asin(Math.sin(x));
    case 'sq': return Math.tanh(2.5 * Math.sin(x));
    default: return .6 * (Math.sin(x) + Math.sin(2 * x) / 2 + Math.sin(3 * x) / 3 + Math.sin(4 * x) / 4);
  }
}

const SC = { maj: [0, 2, 4, 5, 7, 9, 11], min: [0, 2, 3, 5, 7, 8, 10], hmin: [0, 2, 3, 5, 7, 8, 11], pen: [0, 2, 4, 7, 9], whole: [0, 2, 4, 6, 8, 10] };
const semi = (sc, dg) => { const L = sc.length, o = Math.floor(dg / L); return sc[((dg % L) + L) % L] + 12 * o; };
const _ = null;
const MCFG = {
  neutro: { bpm: 112, sc: 'maj', root: 57, w: 'tri', dec: 5, bdec: 1.2, pat: [0, 2, 4, 2, 0, 4, 2, 4, 3, 2, 1, 2, 4, 5, 4, 2], bass: [0, 0, 3, 4] },
  mistero: { bpm: 66, sc: 'whole', root: 52, w: 'sine', dec: 2.2, bdec: .5, pat: [0, _, 3, _, 5, _, 2, _, 4, _, 1, _, 6, _, 3, _], bass: [0, 0, 1, 0], trem: 1 },
  conflitto: { bpm: 150, sc: 'hmin', root: 52, w: 'saw', dec: 9, bdec: 7, pat: [0, 0, 7, 0, 6, 0, 5, 4, 0, 0, 7, 0, 8, 7, 6, 4], bass: [0, 0, 5, 4] },
  suspense: { bpm: 84, sc: 'hmin', root: 50, w: 'tri', dec: 5, bdec: .4, pat: [0, _, 1, _, 0, _, 7, _, 0, _, 1, _, 5, _, 4, _], bass: [0, 0, 0, -1], trem: 1 },
  love: { bpm: 72, sc: 'maj', root: 60, w: 'sine', dec: 2.5, bdec: .8, pat: [0, 4, 6, 9, 7, 4, 2, 4, 3, 5, 7, 9, 8, 5, 4, 2], bass: [0, 3, 5, 4] },
  comedy: { bpm: 152, sc: 'maj', root: 62, w: 'sq', dec: 12, bdec: 6, pat: [0, _, 4, _, 2, 4, 7, _, 5, _, 3, _, 1, 3, 4, _], bass: [0, 4, 0, 4] },
  calma: { bpm: 60, sc: 'pen', root: 55, w: 'sine', dec: 1.8, bdec: .5, pat: [0, 2, 4, _, 3, _, 2, _, 5, _, 4, _, 2, _, 1, _], bass: [0, 0, 3, 3] },
  triste: { bpm: 60, sc: 'min', root: 57, w: 'tri', dec: 1.5, bdec: .6, pat: [7, _, 6, _, 5, _, 4, _, 5, _, 4, _, 2, _, 4, _], bass: [0, 5, 3, 4] }
};

export function createSynth(ctx) {
  function render(dur, fn, peak) {
    const sr = ctx.sampleRate, n = Math.max(1, Math.floor(dur * sr)), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0), dt = 1 / sr;
    let mx = 0;
    for (let i = 0; i < n; i++) { const v = fn(i * dt, dt); d[i] = v; const a = v < 0 ? -v : v; if (a > mx) mx = a; }
    if (mx > 0) { const k = (peak || .85) / mx; for (let i = 0; i < n; i++) d[i] *= k; }
    const f = Math.min(n >> 1, Math.floor(sr * .004));
    for (let i = 0; i < f; i++) { d[i] *= i / f; d[n - 1 - i] *= i / f; }
    return b;
  }
  function stab(t, st, len, ch, dec) {
    const lt = t - st; if (lt < 0 || lt > len) return 0;
    const e = Math.min(1, lt / .01) * Math.exp(-lt * dec) * Math.min(1, (len - lt) / .05);
    let s = .4 * Math.sin(TAU * mtof(ch[0] - 24) * lt);
    for (const m of ch) s += .3 * wave('saw', mtof(m) * lt);
    return s * e;
  }

  return {
    music(id, v) {
      const c = MCFG[id], sc = SC[c.sc], root = c.root + [0, 3, -2][v % 3], pat = c.pat.slice(v * 2).concat(c.pat.slice(0, v * 2));
      const st = 60 / c.bpm / 2, N = pat.length * 2, bst = st * 4;
      return render(st * N, t => {
        const k = Math.floor(t / st), lt = t - k * st, dg = pat[k % pat.length];
        let s = 0;
        if (dg !== null) { const f = mtof(root + 12 + semi(sc, dg)); s += .5 * wave(c.w, f * t) * Math.min(1, lt / .006) * Math.exp(-lt * c.dec) * Math.min(1, (st - lt) / .008); }
        const bk = Math.floor(t / bst), blt = t - bk * bst, bf = mtof(root - 12 + semi(sc, c.bass[bk % c.bass.length]));
        s += .35 * Math.sin(TAU * bf * t) * Math.min(1, blt / .01) * Math.exp(-blt * c.bdec) * Math.min(1, (bst - blt) / .01);
        if (c.trem) s += .07 * Math.sin(TAU * mtof(root + 25) * t) * (.5 + .5 * Math.sin(TAU * 6 * t));
        return s;
      }, .7);
    },
    taglio() {
      let lp = 0;
      return render(1.8, t => { const n = rnd(); lp += .15 * (n - lp); return .9 * Math.sin(TAU * 50 * t + 18 * (1 - Math.exp(-t * 25))) * Math.exp(-t * 3.5) + .6 * lp * Math.exp(-t * 14) + .3 * (wave('saw', 110 * t) + wave('saw', 116.5 * t)) * Math.exp(-t * 2.5); });
    },
    drama() {
      return render(3.4, t => stab(t, 0, .3, [55, 58, 62], 6) + stab(t, .38, .3, [55, 58, 62], 6) + stab(t, .78, 2.6, [51, 55, 58, 63], 1.2));
    },
    crescendo() {
      let ph = 0, ph2 = 0, lp = 0; const D = 3.2;
      return render(D, (t, dt) => { const p = t / D, f = 90 * Math.pow(2, p * 3.2); ph += f * dt; ph2 += f * 1.505 * dt; lp += (.02 + .3 * p) * (rnd() - lp); return p * p * (.45 * wave('saw', ph) + .3 * wave('saw', ph2) + .5 * lp * (1 + p)); });
    },
    battuta(i) {
      if (i % 3 === 0) {
        let lp = 0;
        const tom = (t, st, f) => { const lt = t - st; return lt < 0 ? 0 : Math.sin(TAU * f * lt + 6 * (1 - Math.exp(-lt * 20))) * Math.exp(-lt * 12); };
        return render(1.6, t => { let s = tom(t, 0, 190) + tom(t, .17, 130); const lt = t - .4; if (lt >= 0) { const n = rnd(); lp += .2 * (n - lp); s += .6 * (n - lp) * Math.exp(-lt * 3); } return s; });
      }
      let ph = 0;
      if (i % 3 === 1) return render(1.1, (t, dt) => { const f = 1500 * Math.pow(.3, Math.min(t, .9) / .9) * (1 + .02 * Math.sin(TAU * 7 * t)); ph += f * dt; return Math.sin(TAU * ph) * Math.min(1, t / .03) * Math.min(1, (1.1 - t) / .15); });
      return render(1.3, (t, dt) => { const f = 180 * (1 + .5 * t) * (1 + .6 * Math.sin(TAU * 9 * t) * Math.exp(-t * 2.5)); ph += f * dt; return (Math.sin(TAU * ph) + .3 * Math.sin(TAU * 2 * ph)) * Math.exp(-t * 2) * Math.min(1, t / .005); });
    },
    cavalli(v) {
      v %= 3;
      const beat = 60 / [150, 168, 138][v], key = [60, 62, 58][v], D = 5.5, mot = [[0, 4, 7, 12], [7, 7, 12, 16], [0, 7, 4, 12]][v];
      let lp = 0;
      return render(D, t => {
        let s = 0; const bt = t % beat; lp += .3 * (rnd() - lp);
        for (const o of [0, .2, .4]) { const lt = bt - o * beat; if (lt >= 0 && lt < .12) s += .5 * Math.sin(TAU * (120 + v * 20) * lt) * Math.exp(-lt * 40); if (lt >= 0 && lt < .05) s += .35 * lp * Math.exp(-lt * 80); }
        const ft = t - .4;
        if (ft >= 0) {
          const L = mot.length, idx = Math.min(L - 1, Math.floor(ft / beat)), last = idx === L - 1, lt = ft - idx * beat, len = last ? D - .4 - (L - 1) * beat : beat, f = mtof(key + mot[idx]);
          s += .35 * (wave('saw', f * lt) + .5 * wave('sq', f * .5 * lt)) * Math.min(1, lt / .02) * Math.min(1, (len - lt) / .05) * Math.exp(-lt * (last ? .5 : 2));
        }
        if (t > D - .6) s *= (D - t) / .6;
        return s;
      });
    },
    extra(i) {
      const ty = i % 5, p = Math.floor(i / 5);
      let ph = 0, lp = 0;
      if (ty === 0) return render(.7, (t, dt) => { ph += (300 + p * 120) * Math.pow(3, t / .7) * dt; return Math.sin(TAU * ph) * Math.exp(-t * 3) * Math.min(1, t / .01); });
      if (ty === 1) return render(.8, (t, dt) => { ph += (1400 + p * 200) * Math.pow(.25, t / .8) * dt; return wave('tri', ph) * Math.exp(-t * 2.5); });
      if (ty === 2) { const f = 380 + p * 170; return render(2.2, t => (Math.sin(TAU * f * t) + .5 * Math.sin(TAU * f * 2.76 * t) * Math.exp(-t * 2) + .3 * Math.sin(TAU * f * 5.4 * t) * Math.exp(-t * 4)) * Math.exp(-t * 2.2) * Math.min(1, t / .003)); }
      if (ty === 3) { const a = .04 + p * .06; return render(1.4, t => { lp += a * (rnd() - lp); const e = Math.sin(Math.PI * t / 1.4); return lp * e * e; }); }
      const f = 700 + p * 220, cnt = 3 + p;
      return render(.12 * cnt + .1, t => { const k = Math.floor(t / .12), lt = t - k * .12; if (k >= cnt || lt > .08) return 0; return wave('sq', f * (1 + .12 * k) * t) * Math.min(1, lt / .003) * Math.min(1, (.08 - lt) / .005); });
    },
    ambiente() {
      // brusio di sala, qualche nota di pianoforte e un bicchiere: 8 secondi in loop
      const D = 8, notes = [[.2, 64], [.55, 67], [.9, 72], [1.6, 69], [2.4, 65], [2.75, 69], [3.1, 72], [3.9, 71], [4.6, 67], [4.95, 71], [5.3, 74], [6.1, 72], [6.5, 60]];
      let lp = 0, lp2 = 0;
      return render(D, t => {
        lp += .02 * (rnd() - lp); lp2 += .08 * (lp - lp2);
        let s = 3 * lp2 * (.7 + .3 * Math.sin(TAU * 2 * t / D));
        for (const [st, m] of notes) {
          const lt = t - st;
          if (lt >= 0 && lt < 1.2) { const f = mtof(m); s += .18 * (wave('tri', f * lt) + .5 * wave('tri', f * 1.004 * lt)) * Math.exp(-lt * 3) * Math.min(1, lt / .004) * Math.min(1, (1.2 - lt) / .05); }
        }
        for (const st of [1.3, 5.7]) { const lt = t - st; if (lt >= 0 && lt < .4) s += .12 * Math.sin(TAU * 3200 * lt) * Math.exp(-lt * 18); }
        return s;
      }, .6);
    }
  };
}

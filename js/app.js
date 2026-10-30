import { createSynth } from './synth.js';
import { listRecs, saveRec, deleteRec } from './store.js';

/* ================= dati ================= */
const MUSIC = [
  // riga 1: tensione
  { id: 'neutro', label: 'Neutro', c: '#E8833A' },
  { id: 'mistero', label: 'Mistero', c: '#8496AE' },
  { id: 'suspense', label: 'Suspense', c: '#8E7FF7' },
  { id: 'conflitto', label: 'Conflitto', c: '#E0533B' },
  // riga 2: emozioni
  { id: 'love', label: 'Love', c: '#EC6A88' },
  { id: 'comedy', label: 'Comedy', c: '#9BD35A' },
  { id: 'calma', label: 'Calma', c: '#4FB6A8' },
  { id: 'triste', label: 'Triste', c: '#6A98F0' }
];
const BOLT = 'M13 2L5 13h6l-1 9 8-11h-6z';
const BOLT2 = 'M8.5 3L3.5 11.5H7l-1 8 5.5-9H8z M17.5 3l-5 8.5H16l-1 8 5.5-9H17z';
const VOL_HI = 'M4 9h4l5-4v14l-5-4H4z M16 8.5a5 5 0 0 1 0 7 M18.8 6a8.5 8.5 0 0 1 0 12';
const VOL_LO = 'M4 9h4l5-4v14l-5-4H4z M16 9.5a3.5 3.5 0 0 1 0 5';
const ACC = [
  { id: 'volume', label: 'Volume', icon: VOL_HI },
  { id: 'tan', label: 'Tan!', icon: BOLT },
  { id: 'drama', label: 'Drama', icon: BOLT2 },
  { id: 'crescendo', label: 'Crescendo', icon: 'M3 12l18-7 M3 12l18 7' },
  { id: 'battuta', label: 'Battuta', icon: 'M4 15c0-2 3.6-3.5 8-3.5s8 1.5 8 3.5-3.6 3.5-8 3.5-8-1.5-8-3.5z M4 15v3c0 2 3.6 3.5 8 3.5s8-1.5 8-3.5v-3 M9 10L6 3 M15 10l3-7' },
  { id: 'jolly', label: 'Chiamate', icon: 'M6.6 3.5h3l1.6 4.2-2 1.4a11.5 11.5 0 0 0 5.7 5.7l1.4-2 4.2 1.6v3a2 2 0 0 1-2.1 2A17 17 0 0 1 4.5 5.6a2 2 0 0 1 2.1-2.1z' }
];
const Q = 'M8.8 9a3.3 3.3 0 1 1 4.6 3c-.9.4-1.4 1.2-1.4 2.1V15 M12 19h.01';
const N_SYNTH_EXTRA = 20, JOLLY_MAX = 3, MAX_REC = 50, MAX_SEC = 30;
const VOL_LOW = .22;           // opzione "volume basso": musica al 22%
const VOL_FADE = 1.5;          // dissolvenza del selettore volume, in secondi
const DUCK = .35;              // durante "?" audio e Chiamate la musica scende al 35%
const AMB_GAIN = 1.5;          // volume dell'ambiente del saloon (schermata 2)

const svg = (d, s, w) => '<svg width="' + (s || 24) + '" height="' + (s || 24) + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="' + (w || 1.8) + '" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const rndInt = n => Math.floor(Math.random() * n);
const pickFrom = arr => arr[rndInt(arr.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rndInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const $ = id => document.getElementById(id);

/* ================= stato ================= */
let phase = 'title';           // title → lobby → story
let paused = false, musicId = null, musicVoice = null, ambVoice = null;
// stato della singola storia (si azzera con Riavvia)
let xUsed, xKinds, xClipsUsed, hintsUsed, jollyCount, jollyUsed, volLow, aiutoUsed = false;
function resetSession() {
  xUsed = [false, false, false, false];
  xKinds = shuffle(['audio', 'audio', 'hint', 'hint']);   // 2 tasti audio, 2 suggerimenti, in ordine casuale
  xClipsUsed = new Set(); hintsUsed = new Set();
  jollyCount = 0; jollyUsed = new Set();
  volLow = true; duck = 0;      // la musica parte su "basso"
}

let recs = [], files = {};
let aiutini = ['Un personaggio scopre di avere un fratello gemello.'];
let suggerimenti = ['Qualcuno bussa alla porta.'];

const readLines = t => t.split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'));
fetch('audio-manifest.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : {}).then(m => { files = m || {}; warmCache(); }).catch(() => { });
fetch('aiutini.txt', { cache: 'no-cache' }).then(r => r.ok ? r.text() : '').then(t => { const l = readLines(t); if (l.length) aiutini = l; }).catch(() => { });
fetch('suggerimenti.txt', { cache: 'no-cache' }).then(r => r.ok ? r.text() : '').then(t => { const l = readLines(t); if (l.length) suggerimenti = l; }).catch(() => { });
listRecs().then(r => {
  recs = r.sort((a, b) => a.created - b.created);
  // i vecchi titoli automatici "Imprevisto N" diventano "Chiamata N"
  recs.forEach(x => { const m = x.title.match(/^Imprevisto (\d+)$/); if (m) { x.title = 'Chiamata ' + m[1]; saveRec(x).catch(() => { }); } });
  draw(); drawRec();
}).catch(() => { });

/* ================= motore audio ================= */
let ctx = null, master = null, synth = null, needRebuild = false;
const voices = new Set();

/* Il telefono può "addormentare" l'audio quando l'app resta in background a lungo
   (soprattutto su iPhone). Se dopo il ritorno l'audio non riparte, al tocco successivo
   l'app ricrea da capo il motore audio invece di restare muta. */
function buildCtx() {
  if (ctx) { try { ctx.close(); } catch (e) { } }
  voices.clear(); decoded.clear(); synthCache.clear(); recDecoded.clear();
  musicVoice = null; musicId = null; ambVoice = null; mTok++; duck = 0;
  const C = window.AudioContext || window.webkitAudioContext;
  ctx = new C();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -10; comp.ratio.value = 3; comp.connect(ctx.destination);
  master = ctx.createGain(); master.gain.value = .9; master.connect(comp);
  synth = createSynth(ctx);
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { }
  // sblocco per iPhone: un istante di silenzio suonato dentro il tocco
  try { const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, ctx.sampleRate); s.connect(ctx.destination); s.start(0); } catch (e) { }
  needRebuild = false;
  if (typeof draw === 'function') draw();
}
function checkAlive(delay) {
  const c = ctx;
  setTimeout(() => { if (c && c === ctx && ctx.state !== 'running' && !paused) needRebuild = true; }, delay);
}
function ac() {
  if (!ctx || needRebuild || ctx.state === 'closed' || ctx.state === 'interrupted') buildCtx();
  if (paused) { paused = false; draw(); }
  if (ctx.state !== 'running') { ctx.resume().catch(() => { }); checkAlive(600); }
  return ctx;
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !ctx || paused) return;
  ctx.resume().catch(() => { });
  checkAlive(800);
});
window.addEventListener('pageshow', e => { if (e.persisted && ctx && !paused && ctx.state !== 'running') needRebuild = true; });
function play(buffer, o) {
  o = o || {};
  // o.at: istante di partenza (sull'orologio audio); o.dest: dove mandare il suono (es. il filtro telefono)
  const now = Math.max(ctx.currentTime, o.at || 0), src = ctx.createBufferSource(), g = ctx.createGain();
  src.buffer = buffer; src.loop = !!o.loop;
  const lvl = o.gain == null ? 1 : o.gain;
  if (o.fadeIn) { g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(lvl, now + o.fadeIn); } else g.gain.value = lvl;
  src.connect(g); g.connect(o.dest || master);
  const v = { src, g, endAt: now + (o.loop ? 1e9 : buffer.duration) };
  voices.add(v);
  src.onended = () => {
    voices.delete(v);
    if (v === musicVoice) { musicVoice = null; musicId = null; draw(); }
    if (v === ambVoice) ambVoice = null;
    if (o.onEnd) o.onEnd(v, ctx.currentTime >= v.endAt - .06);
  };
  src.start(now);
  return v;
}
function fade(v, secs) {
  const now = ctx.currentTime;
  try {
    v.g.gain.cancelScheduledValues(now);
    v.g.gain.setValueAtTime(v.g.gain.value, now);
    v.g.gain.linearRampToValueAtTime(0, now + secs);
    v.src.stop(now + secs + .05);
  } catch (e) { }
}
const fadeAll = (secs, except) => voices.forEach(v => { if (v !== except) fade(v, secs); });
// stacco netto ritardato: l'accento parte subito, il resto si ferma un attimo dopo,
// così non si sente il vuoto dovuto alla latenza del telefono
const STOP_DELAY = .2;
function cutAllAfter(delay, except) {
  const now = ctx.currentTime, at = now + delay;
  voices.forEach(v => {
    if (v === except) return;
    try {
      const g = v.g.gain, val = g.value;
      g.cancelScheduledValues(now); g.setValueAtTime(val, now); g.setValueAtTime(val, at);
      g.linearRampToValueAtTime(0, at + .04);
      v.src.stop(at + .06);
    } catch (e) { }
  });
}
let mTok = 0;
function clearMusic() { musicVoice = null; musicId = null; mTok++; }

/* ---- livello della musica: selettore volume e abbassamento sotto "?" e Jolly ---- */
let duck = 0;
const musicLevel = () => (volLow ? VOL_LOW : 1) * (duck > 0 ? DUCK : 1);
function applyMusicLevel(secs) {
  if (!musicVoice) return;
  const now = ctx.currentTime, g = musicVoice.g.gain;
  try { g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(musicLevel(), now + secs); } catch (e) { }
}
function playOver(buffer) {
  duck++; applyMusicLevel(.25);
  play(buffer, { onEnd: () => { duck = Math.max(0, duck - 1); applyMusicLevel(.6); } });
}

/* ---- file dalle cartelle audio, con ripiego sui segnaposto ---- */
const decoded = new Map(), synthCache = new Map(), pinned = new Set();
function decode(ab) { return new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)); }
function loadUrl(url, pin) {
  if (pin) pinned.add(url);
  if (decoded.has(url)) { const p = decoded.get(url); decoded.delete(url); decoded.set(url, p); return p; }
  const p = fetch(encodeURI(url)).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(decode);
  decoded.set(url, p);
  p.catch(() => decoded.delete(url));
  // tiene in memoria al massimo 16 clip, ma non scarta mai gli accenti (devono partire all'istante)
  while (decoded.size > 16) { const k = [...decoded.keys()].find(x => !pinned.has(x)); if (!k) break; decoded.delete(k); }
  return p;
}
// prepara in anticipo accenti e Ai cavalli!, così al tocco partono senza attese
function preloadInstant() {
  ['accenti/tan', 'accenti/drama', 'accenti/battuta', 'accenti/crescendo', 'cavalli'].forEach(f => (files[f] || []).forEach(u => loadUrl(u, true).catch(() => { })));
  const pre = (k, make) => { if (!synthCache.has(k)) synthCache.set(k, make()); };
  setTimeout(() => {
    if (!(files['accenti/tan'] || []).length) pre('tan0', () => synth.taglio());
    if (!(files['accenti/drama'] || []).length) pre('drama0', () => synth.drama());
    if (!(files['accenti/battuta'] || []).length) [0, 1, 2].forEach(i => pre('battuta' + i, () => synth.battuta(i)));
  }, 2600);
}
// which: indice preciso, oppure -1 per uno a caso
async function getSound(folder, which, fbKey, fbCount, fbMake) {
  const list = files[folder];
  if (list && list.length) {
    const i = which < 0 ? rndInt(list.length) : which;
    if (i < list.length) { try { return await loadUrl(list[i]); } catch (e) { } }
  }
  const i = which < 0 ? rndInt(fbCount) : Math.min(which, fbCount - 1);
  const k = fbKey + i;
  if (!synthCache.has(k)) synthCache.set(k, fbMake(i));
  return synthCache.get(k);
}
function warmCache() {
  const all = Object.values(files).flat();
  let i = 0;
  const next = () => { if (i >= all.length) return; fetch(encodeURI(all[i++])).catch(() => { }).finally(() => setTimeout(next, 50)); };
  setTimeout(next, 1500);
}
const sMusic = id => getSound('musiche/' + id, -1, 'm.' + id + '.', 3, i => synth.music(id, i));

/* ================= schermata 1 → schermata 2 ================= */
function swap(from, to, ms) {
  const a = $(from), b = $(to);
  a.classList.add('fade-out');
  setTimeout(() => {
    a.hidden = true; a.classList.remove('fade-out');
    b.hidden = false; b.classList.remove('fade-in'); void b.offsetWidth; b.classList.add('fade-in');
    window.scrollTo(0, 0);
  }, ms);
}
$('titleTap').addEventListener('click', () => {
  if (phase !== 'title') return;
  phase = 'lobby';
  ac();                      // il tocco sblocca l'audio del telefono
  startAmbient();
  swap('screen-title', 'screen-lobby', 500);
});

/* ================= schermata 2: saloon ================= */
let ambPending = false;
async function startAmbient() {
  if (phase !== 'lobby' || ambVoice || ambPending || location.hash === '#registrazioni') return;
  ambPending = true;
  ac();
  const b = await getSound('ambiente', -1, 'amb', 1, () => synth.ambiente());
  ambPending = false;
  if (phase !== 'lobby' || ambVoice || location.hash === '#registrazioni') return;
  ambVoice = play(b, { loop: true, fadeIn: 1.5, gain: AMB_GAIN });
}
function stopAmbient(secs) { if (ambVoice && ctx) { fade(ambVoice, secs); ambVoice = null; } }

$('aiuto').addEventListener('click', () => {
  if (aiutoUsed) return;
  aiutoUsed = true;
  const box = $('aiutoBox');
  box.textContent = pickFrom(aiutini); box.hidden = false;
  draw();
});

function enterStory() {
  if (phase !== 'lobby') return;
  ac();
  phase = 'story'; resetSession(); preloadInstant();
  fadeAll(1.5); ambVoice = null; clearMusic();
  getSound('inizio', -1, 'inizio', 1, () => synth.cavalli(1)).then(b => { if (phase === 'story') play(b, { fadeIn: .4 }); });
  // dissolvenza luminosa di 2,5 s: il saloon si accende di luce, poi emerge la storia
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fl = $('flare'), lobby = $('screen-lobby');
  if (!reduce) lobby.classList.add('glow');
  fl.classList.remove('run'); void fl.offsetWidth; fl.classList.add('run');
  setTimeout(() => {
    lobby.classList.remove('glow');
    $('aiutoBox').hidden = true;
    route();
  }, 1250);
  setTimeout(() => fl.classList.remove('run'), 2550);
}
const cavStart = $('cavStart');
cavStart.addEventListener('click', enterStory);
$('screen-lobby').addEventListener('pointerdown', () => { if (phase === 'lobby' && !ambVoice) { ac(); startAmbient(); } });

/* ================= azioni della storia ================= */
async function doMusic(id) {
  ac();
  if (musicId === id && musicVoice) { fade(musicVoice, .5); clearMusic(); draw(); return; }
  const tok = ++mTok; musicId = id; draw();
  const b = await sMusic(id);
  if (tok !== mTok) return;
  if (musicVoice) fade(musicVoice, .6);
  musicVoice = play(b, { loop: true, fadeIn: .6, gain: musicLevel() });
  musicId = id; draw();
}

async function doAccent(id, el) {
  ac();
  if (id === 'volume') {
    volLow = !volLow; applyMusicLevel(VOL_FADE); draw(); return;
  }
  // Tan!, Drama e Battuta: l'accento parte subito e un istante dopo (STOP_DELAY) tutto il resto si ferma
  if (id === 'tan' || id === 'drama' || id === 'battuta') {
    const b = id === 'tan' ? await getSound('accenti/tan', -1, 'tan', 1, () => synth.taglio())
      : id === 'drama' ? await getSound('accenti/drama', -1, 'drama', 1, () => synth.drama())
      : await getSound('accenti/battuta', -1, 'battuta', 3, i => synth.battuta(i));
    const v = play(b);
    cutAllAfter(STOP_DELAY, v); clearMusic(); draw();
    return;
  }
  if (id === 'crescendo') {
    const b = await getSound('accenti/crescendo', -1, 'crescendo', 1, () => synth.crescendo());
    play(b, { onEnd: (v, natural) => { if (natural) { voices.forEach(o => { if (o !== v) fade(o, .03); }); clearMusic(); draw(); } } });
  } else if (id === 'jolly') {
    doJolly();
  }
}

// Chiamate: una chiamata registrata a caso, senza ripetizioni, fino a 3 volte per storia.
// Sequenza: suoneria 2 s → clic → voce col filtro telefono → clic → occupato 2 s. La musica resta bassa per tutto il tempo.
async function doJolly() {
  const pool = recs.filter(r => !jollyUsed.has(r.id));
  if (phase !== 'story' || jollyCount >= JOLLY_MAX || !pool.length) return;
  const r = pickFrom(pool);
  jollyCount++; jollyUsed.add(r.id); draw();
  let voice;
  try { voice = await loadRec(r); } catch (e) { return; }
  const ring = await getSound('chiamata/squillo', -1, 'ring', 1, () => synth.squillo());
  const click = await getSound('chiamata/clic', -1, 'click', 1, () => synth.clic());
  const busy = await getSound('chiamata/occupato', -1, 'busy', 1, () => synth.occupato());
  playCall(voice, ring, click, busy);
}
// filtro "telefono", a metà tra una linea pulita e un apparecchio d'epoca
function phoneChain() {
  const inp = ctx.createGain();
  const hp1 = ctx.createBiquadFilter(); hp1.type = 'highpass'; hp1.frequency.value = 320; hp1.Q.value = .7;
  const hp2 = ctx.createBiquadFilter(); hp2.type = 'highpass'; hp2.frequency.value = 320; hp2.Q.value = .7;
  const mid = ctx.createBiquadFilter(); mid.type = 'peaking'; mid.frequency.value = 1700; mid.Q.value = .9; mid.gain.value = 5;
  const lp1 = ctx.createBiquadFilter(); lp1.type = 'lowpass'; lp1.frequency.value = 3300; lp1.Q.value = .7;
  const lp2 = ctx.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 3300; lp2.Q.value = .7;
  const sat = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; curve[i] = Math.tanh(2.2 * x) / Math.tanh(2.2); }
  sat.curve = curve; sat.oversample = '2x';
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -24; comp.ratio.value = 4; comp.attack.value = .005; comp.release.value = .15;
  const out = ctx.createGain(); out.gain.value = 2.2;   // recupera il volume tolto dal filtro
  inp.connect(hp1); hp1.connect(hp2); hp2.connect(mid); mid.connect(lp1); lp1.connect(lp2); lp2.connect(sat); sat.connect(comp); comp.connect(out); out.connect(master);
  return inp;
}
let lineNoiseBuf = null;
function lineNoise() {
  if (lineNoiseBuf && lineNoiseBuf.sampleRate === ctx.sampleRate) return lineNoiseBuf;
  const n = ctx.sampleRate * 2, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  let lp = 0;
  for (let i = 0; i < n; i++) { lp += .3 * ((Math.random() * 2 - 1) - lp); d[i] = lp * .5 + (Math.random() < .0004 ? (Math.random() * 2 - 1) * .8 : 0); }
  return (lineNoiseBuf = b);
}
function playCall(voice, ring, click, busy) {
  ac();
  const tel = phoneChain();
  const t0 = ctx.currentTime + .05;
  const tPick = t0 + Math.min(ring.duration, 2);
  const tVoice = tPick + click.duration * .6;
  const tEnd = tVoice + voice.duration;
  const tBusy = tEnd + click.duration + .1;
  duck++; applyMusicLevel(.25);
  const ringV = play(ring, { at: t0 }); try { ringV.src.stop(tPick); } catch (e) { }
  play(click, { at: tPick, dest: tel, gain: .9 });
  play(voice, { at: tVoice, dest: tel });
  const nz = play(lineNoise(), { at: tVoice, dest: tel, loop: true, gain: .035 }); try { nz.src.stop(tEnd); } catch (e) { }
  play(click, { at: tEnd + .02, dest: tel, gain: .9 });
  const busyV = play(busy, { at: tBusy, dest: tel, gain: .8, onEnd: () => { duck = Math.max(0, duck - 1); applyMusicLevel(.6); } });
  try { busyV.src.stop(tBusy + Math.min(busy.duration, 2)); } catch (e) { }
}

// tasti "?": in ogni storia 2 danno una clip audio e 2 un suggerimento, in ordine casuale
async function doExtra(i) {
  if (phase !== 'story' || xUsed[i]) return;
  ac();
  xUsed[i] = true; draw();
  if (xKinds[i] === 'hint') {
    const free = suggerimenti.filter(s => !hintsUsed.has(s));
    const s = pickFrom(free.length ? free : suggerimenti);
    hintsUsed.add(s); showHint(s);
    return;
  }
  const list = files['extra'];
  const n = list && list.length ? list.length : N_SYNTH_EXTRA;
  const free = [];
  for (let k = 0; k < n; k++) if (!xClipsUsed.has(k)) free.push(k);
  if (!free.length) return;
  const k = pickFrom(free); xClipsUsed.add(k);
  playOver(await getSound('extra', k, 'x', N_SYNTH_EXTRA, j => synth.extra(j)));
}

const hintCard = $('hintCard');
function showHint(text) { hintCard.textContent = text; hintCard.hidden = false; hintCard.style.animation = 'none'; void hintCard.offsetWidth; hintCard.style.animation = ''; }
function hideHint() { hintCard.hidden = true; }
hintCard.addEventListener('click', hideHint);
// toccando qualsiasi altro punto il suggerimento si chiude (e un eventuale tasto fa il suo lavoro)
document.addEventListener('pointerdown', e => { if (!hintCard.hidden && !hintCard.contains(e.target)) hideHint(); }, true);

// which: 0 = clip 1 (tocco normale), 1 = clip 2 (tenuto premuto 1,5 s, con lo schermo che si illumina)
async function doCavalli(which) {
  ac();
  fadeAll(1.5); clearMusic(); draw();
  const b = await getSound('cavalli', which, 'cav', 2, i => synth.cavalli(i));
  if (which === 1) {
    const v = play(b, { fadeIn: 1.2, onEnd: vv => { if (vv === flareVoice) { flareVoice = null; flareStop(false); } } });
    flareVoice = v; flareStart(b.duration);
  } else {
    play(b, { fadeIn: 1.2 });
  }
}

/* luce della clip 2: sale come nella transizione d'ingresso, pulsa piano e si spegne a fine clip */
let flareAnim = null, flareTimer = null, flareVoice = null;
function flareStart(durSec) {
  const fl = $('flare'), reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  flareStop(true);
  fl.style.visibility = 'visible';
  const a = fl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1150, easing: 'ease-in', fill: 'forwards' });
  flareAnim = a;
  a.onfinish = () => {
    if (flareAnim !== a || reduce) return;
    flareAnim = fl.animate([{ opacity: 1 }, { opacity: .75 }], { duration: 1300, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
  };
  flareTimer = setTimeout(() => flareStop(false), Math.max(1.4, durSec - .9) * 1000);
}
function flareStop(instant) {
  clearTimeout(flareTimer);
  const fl = $('flare');
  if (!flareAnim) { if (instant) fl.style.visibility = ''; return; }
  const cur = parseFloat(getComputedStyle(fl).opacity) || 0;
  flareAnim.cancel(); flareAnim = null;
  if (instant) { fl.style.visibility = ''; return; }
  const out = fl.animate([{ opacity: cur }, { opacity: 0 }], { duration: 900, easing: 'ease-out', fill: 'forwards' });
  out.onfinish = () => { if (!flareAnim) { fl.style.visibility = ''; out.cancel(); } };
}

/* icona del tasto Ai cavalli!: se c'è img/icona-cavalli.png prende il posto del ferro di cavallo */
document.querySelectorAll('.title-ic').forEach(img => {
  const show = () => { img.hidden = false; };
  if (img.complete && img.naturalWidth) show(); else img.addEventListener('load', show);
});
document.querySelectorAll('.cav-ic').forEach(img => {
  const show = () => { img.hidden = false; const s = img.parentNode.querySelector('.cav-svg'); if (s) s.style.display = 'none'; };
  if (img.complete && img.naturalWidth) show(); else img.addEventListener('load', show);
});

function togglePause() {
  if (!ctx) return;
  if (paused) { paused = false; ctx.resume().catch(() => { }); }
  else { paused = true; ctx.suspend().catch(() => { }); }
  draw();
}
function restart() {
  if (ctx) {
    voices.forEach(v => { try { v.src.stop(); } catch (e) { } });
    voices.clear();
    if (paused) { paused = false; ctx.resume().catch(() => { }); }
  }
  clearMusic(); ambVoice = null; hideHint();
  phase = 'lobby'; resetSession(); aiutoUsed = false;
  $('aiutoBox').hidden = true; $('aiutoBox').textContent = '';
  route();
  startAmbient();
}

/* ================= interfaccia della storia ================= */
const musicEl = $('music'), accEl = $('acc');
function flash(el) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); setTimeout(() => el.classList.remove('hit'), 350); }

MUSIC.forEach(m => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'm pad'; b.style.setProperty('--c', m.c); b.dataset.id = m.id;
  b.innerHTML = '<span class="top"><span class="dot"></span><span class="eq" aria-hidden="true"><i></i><i></i><i></i></span></span><span class="lab">' + m.label + '</span>';
  b.addEventListener('click', () => doMusic(m.id));
  musicEl.appendChild(b);
});
let jollyBtn = null, volBtn = null;
ACC.forEach(a => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'a pad'; b.dataset.id = a.id;
  b.innerHTML = '<span class="ic">' + svg(a.icon) + '</span><span class="lab">' + a.label + '</span>' +
    (a.id === 'jolly' ? '<span class="pips" aria-hidden="true"><i></i><i></i><i></i></span>' : '') +
    (a.id === 'volume' ? '<span class="tag" aria-hidden="true"></span>' : '');
  b.addEventListener('click', () => { if (b.disabled) return; if (a.id !== 'volume') flash(b); doAccent(a.id, b); });
  if (a.id === 'jolly') jollyBtn = b;
  if (a.id === 'volume') volBtn = b;
  accEl.appendChild(b);
});
const xs = [...document.querySelectorAll('.x')];
xs.forEach((el, i) => {
  el.innerHTML = svg(Q, 26, 2.4);
  el.addEventListener('click', () => { if (el.disabled) return; flash(el); doExtra(i); });
});

/* Tasto centrale nella storia: tocco normale → clip 1; tenuto premuto 1,5 s → clip 2 */
const cavEl = $('cav');
const LONG_MS = 1500;
let holdTimer = null, fired = false, pointerUsed = false, pressing = false;
cavEl.addEventListener('pointerdown', e => {
  if (phase !== 'story') return;
  pointerUsed = true; pressing = true; fired = false;
  try { cavEl.setPointerCapture(e.pointerId); } catch (_) { }
  cavEl.classList.remove('charging'); void cavEl.offsetWidth; cavEl.classList.add('charging');
  clearTimeout(holdTimer);
  holdTimer = setTimeout(() => {
    if (!pressing) return;
    fired = true; cavEl.classList.remove('charging');
    try { navigator.vibrate && navigator.vibrate(25); } catch (_) { }
    flash(cavEl); doCavalli(1);
  }, LONG_MS);
});
function endPress(cancelled) {
  if (!pressing) return;
  pressing = false; clearTimeout(holdTimer); cavEl.classList.remove('charging');
  if (fired) return;
  if (!cancelled) { flash(cavEl); doCavalli(0); }
}
cavEl.addEventListener('pointerup', () => endPress(false));
cavEl.addEventListener('pointercancel', () => endPress(true));
cavEl.addEventListener('contextmenu', e => e.preventDefault());
cavEl.addEventListener('click', () => {
  if (pointerUsed) { pointerUsed = false; return; }
  flash(cavEl); doCavalli(0); // tastiera
});

$('stop').addEventListener('click', () => {
  if (!ctx) return;
  if (paused) { paused = false; ctx.resume().catch(() => { }); }
  fadeAll(.3); clearMusic(); draw();
});
$('pp').addEventListener('click', togglePause);
$('restart').addEventListener('click', restart);

function draw() {
  document.querySelectorAll('.m').forEach(b => {
    const on = b.dataset.id === musicId;
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  if (xUsed) xs.forEach((el, i) => {
    el.disabled = xUsed[i];
    el.setAttribute('aria-label', 'Sorpresa ' + (i + 1) + (xUsed[i] ? ', già usata' : ''));
  });
  if (volBtn) {
    volBtn.classList.toggle('low', !!volLow);
    volBtn.querySelector('.ic').innerHTML = svg(volLow ? VOL_LO : VOL_HI);
    volBtn.querySelector('.tag').textContent = volLow ? 'basso' : 'alto';
    volBtn.setAttribute('aria-pressed', volLow ? 'true' : 'false');
    volBtn.setAttribute('aria-label', 'Volume musica: ' + (volLow ? 'basso' : 'alto'));
  }
  if (jollyBtn && jollyUsed) {
    const left = JOLLY_MAX - jollyCount, avail = recs.some(r => !jollyUsed.has(r.id));
    jollyBtn.disabled = left <= 0 || !avail;
    jollyBtn.querySelectorAll('.pips i').forEach((p, k) => p.classList.toggle('spent', k >= left));
    jollyBtn.setAttribute('aria-label', 'Chiamate, ' + (recs.length ? left + ' rimaste' : 'nessuna chiamata registrata'));
  }
  $('aiuto').disabled = aiutoUsed;
  $('pp').innerHTML = paused ? svg('M7 5l12 7-12 7z', 18, 2) + 'Riprendi' : svg('M8 5v14 M16 5v14', 18, 2.4) + 'Pausa';
  document.body.classList.toggle('paused', paused);
}

/* ================= registrazioni ================= */
const recBtn = $('rec'), listEl = $('list'), msgEl = $('recMsg');
const recDecoded = new Map();
function loadRec(r) {
  if (!recDecoded.has(r.id)) {
    const p = r.blob.arrayBuffer().then(decode);
    recDecoded.set(r.id, p); p.catch(() => recDecoded.delete(r.id));
  }
  return recDecoded.get(r.id);
}
function showMsg(t) { msgEl.textContent = t; msgEl.hidden = !t; }
const fmt = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

let recording = null;
function pickType() {
  if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
  for (const t of ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/aac']) if (MediaRecorder.isTypeSupported(t)) return t;
  return '';
}
function setSession(type) { try { if (navigator.audioSession) navigator.audioSession.type = type; } catch (e) { } }
function micHelp(e) {
  const code = ' (codice: ' + (e && e.name || 'sconosciuto') + ')';
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (e && e.name === 'NotFoundError') return 'Non trovo nessun microfono su questo dispositivo.' + code;
  if (ios) return 'Il microfono è bloccato. Su iPhone: Impostazioni → Safari → Microfono → Chiedi. Poi chiudi del tutto l\'app e riaprila. Se l\'hai aperta da WhatsApp, apri invece il link in Safari.' + code;
  return 'Il microfono è bloccato. Su Android: Impostazioni → App → Chrome → Autorizzazioni → Microfono → Consenti. Poi riapri l\'app. Se l\'hai aperta da WhatsApp, apri invece il link in Chrome.' + code;
}
async function startRec() {
  showMsg('');
  if (recs.length >= MAX_REC) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
    showMsg('Questo browser non permette di registrare. Apri l\'app dal suo indirizzo https con Safari o Chrome aggiornati.');
    return;
  }
  stopPreview();
  let stream;
  // su iPhone la modalità audio "solo riproduzione" esclude il microfono: per registrare si passa a "riproduco e registro"
  setSession('play-and-record');
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch (e) { setSession('playback'); showMsg(micHelp(e)); return; }
  const type = pickType();
  let mr;
  try { mr = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream); }
  catch (e) { stream.getTracks().forEach(t => t.stop()); setSession('playback'); showMsg('Non riesco ad avviare la registrazione su questo telefono. (codice: ' + (e && e.name || 'sconosciuto') + ')'); return; }
  const chunks = [], t0 = performance.now();
  mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  mr.onstop = async () => {
    stream.getTracks().forEach(t => t.stop());
    setSession('playback');
    clearInterval(recording && recording.timer);
    recording = null;
    const dur = (performance.now() - t0) / 1000;
    const blob = new Blob(chunks, { type: mr.mimeType || type || 'audio/webm' });
    if (blob.size < 500 || dur < .4) { drawRec(); return; }
    const n = recs.reduce((m, r) => { const k = parseInt((r.title.match(/^(?:Registrazione|Imprevisto|Chiamata) (\d+)$/) || [])[1], 10); return k > m ? k : m; }, 0) + 1;
    const r = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: 'Chiamata ' + n, created: Date.now(), dur, blob };
    recs.push(r);
    try { await saveRec(r); } catch (e) { showMsg('Non sono riuscito a salvare la chiamata sul telefono. Controlla lo spazio libero.'); }
    drawRec(); draw();
  };
  mr.start();
  recording = { mr, t0, timer: setInterval(tick, 200) };
  drawRec();
}
function stopRec() { if (recording && recording.mr.state !== 'inactive') recording.mr.stop(); }
function tick() {
  if (!recording) return;
  const s = (performance.now() - recording.t0) / 1000;
  $('recState').textContent = 'In registrazione · ' + fmt(s);
  if (s >= MAX_SEC) stopRec();
}
recBtn.addEventListener('click', () => { recording ? stopRec() : startRec(); });

let preview = null;
function stopPreview() { if (preview) { try { preview.voice.src.stop(); } catch (e) { } preview = null; markPreview(); } }
function markPreview() {
  listEl.querySelectorAll('.play').forEach(b => {
    const on = preview && b.dataset.id === preview.id;
    b.classList.toggle('on', !!on);
    b.innerHTML = on ? svg('M7 6h10v12H7z', 18, 2.2) : svg('M8 5l11 7-11 7z', 18, 2.2);
    b.setAttribute('aria-label', (on ? 'Ferma ' : 'Ascolta ') + (b.dataset.title || ''));
  });
}
async function togglePreview(r) {
  if (preview && preview.id === r.id) { stopPreview(); return; }
  stopPreview(); ac();
  try {
    const b = await loadRec(r);
    // l'ascolto di prova passa già dal filtro telefono, come uscirà dal tasto Chiamate
    const v = play(b, { dest: phoneChain(), onEnd: () => { if (preview && preview.voice === v) { preview = null; markPreview(); } } });
    preview = { id: r.id, voice: v }; markPreview();
  } catch (e) { showMsg('Questa chiamata non si riesce a riprodurre su questo telefono.'); }
}

function drawRec() {
  $('count').textContent = recs.length + '/' + MAX_REC;
  const full = recs.length >= MAX_REC;
  recBtn.disabled = full && !recording;
  recBtn.classList.toggle('on', !!recording);
  recBtn.setAttribute('aria-label', recording ? 'Ferma la registrazione' : 'Registra una chiamata');
  if (!recording) {
    $('recState').textContent = full ? 'Hai 50 chiamate' : 'Registra una chiamata';
    $('recHint').textContent = full ? 'Cancellane una per registrarne un\'altra.' : 'Tocca il pulsante, di\' la frase, tocca di nuovo per fermare. Massimo 30 secondi.';
  } else {
    $('recHint').textContent = 'Tocca di nuovo per fermare e salvare.';
    tick();
  }
  $('empty').hidden = recs.length > 0;
  listEl.innerHTML = '';
  recs.slice().reverse().forEach(r => {
    const li = document.createElement('li'); li.className = 'row';
    const pb = document.createElement('button'); pb.type = 'button'; pb.className = 'play'; pb.dataset.id = r.id; pb.dataset.title = r.title;
    pb.addEventListener('click', () => togglePreview(r));
    const inp = document.createElement('input'); inp.className = 'title'; inp.type = 'text'; inp.value = r.title; inp.id = 'title-' + r.id;
    inp.setAttribute('aria-label', 'Titolo della chiamata'); inp.maxLength = 60;
    inp.addEventListener('change', () => { const v = inp.value.trim(); if (v) { r.title = v; pb.dataset.title = v; saveRec(r).catch(() => { }); } else inp.value = r.title; });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
    const du = document.createElement('span'); du.className = 'dur'; du.textContent = fmt(r.dur || 0);
    const del = document.createElement('button'); del.type = 'button'; del.className = 'del';
    const trash = svg('M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13', 18, 1.9);
    del.innerHTML = trash; del.setAttribute('aria-label', 'Elimina ' + r.title);
    let t = null;
    del.addEventListener('click', async () => {
      if (!del.classList.contains('confirm')) {
        del.classList.add('confirm'); del.textContent = 'Elimina'; del.setAttribute('aria-label', 'Conferma eliminazione di ' + r.title);
        t = setTimeout(() => { del.classList.remove('confirm'); del.innerHTML = trash; del.setAttribute('aria-label', 'Elimina ' + r.title); }, 3000);
        return;
      }
      clearTimeout(t);
      if (preview && preview.id === r.id) stopPreview();
      recs = recs.filter(x => x.id !== r.id); recDecoded.delete(r.id);
      try { await deleteRec(r.id); } catch (e) { }
      drawRec(); draw();
    });
    li.append(pb, inp, du, del);
    listEl.appendChild(li);
  });
  markPreview();
}

/* ================= navigazione ================= */
function route() {
  const rec = location.hash === '#registrazioni' && phase === 'lobby';
  $('screen-title').hidden = phase !== 'title';
  $('screen-lobby').hidden = phase !== 'lobby' || rec;
  $('screen-main').hidden = phase !== 'story';
  $('screen-rec').hidden = !rec;
  if (rec) { stopAmbient(.5); drawRec(); }
  else { stopRec(); stopPreview(); showMsg(''); if (phase === 'lobby' && ctx) startAmbient(); }
  draw();
  window.scrollTo(0, 0);
}
$('toRec').addEventListener('click', () => { location.hash = 'registrazioni'; });
$('back').addEventListener('click', () => { if (history.length > 1 && location.hash === '#registrazioni') history.back(); else location.hash = ''; });
window.addEventListener('hashchange', route);

// all'apertura si parte sempre dalla schermata 1
if (location.hash) history.replaceState(null, '', location.pathname + location.search);
resetSession(); draw(); drawRec(); route();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
}

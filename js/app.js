import { createSynth } from './synth.js';
import { listRecs, saveRec, deleteRec } from './store.js';

/* ================= dati ================= */
const MUSIC = [
  { id: 'avventura', label: 'Avventura', c: '#E8833A' },
  { id: 'suspense', label: 'Suspense', c: '#8E7FF7' },
  { id: 'love', label: 'Love', c: '#EC6A88' },
  { id: 'comedy', label: 'Comedy', c: '#9BD35A' },
  { id: 'calma', label: 'Calma', c: '#4FB6A8' },
  { id: 'triste', label: 'Triste', c: '#6A98F0' }
];
const ACC = [
  { id: 'silenzio', label: 'Silenzio', icon: 'M4 9h4l5-4v14l-5-4H4z M16 9l5 6 M21 9l-5 6' },
  { id: 'taglio', label: 'Taglio', icon: 'M6 4l12 16 M18 4L6 20 M3 12h3 M18 12h3' },
  { id: 'drama', label: 'Drama', icon: 'M13 2L5 13h6l-1 9 8-11h-6z' },
  { id: 'crescendo', label: 'Crescendo', icon: 'M3 12l18-7 M3 12l18 7' },
  { id: 'battuta', label: 'Battuta', icon: 'M4 15c0-2 3.6-3.5 8-3.5s8 1.5 8 3.5-3.6 3.5-8 3.5-8-1.5-8-3.5z M4 15v3c0 2 3.6 3.5 8 3.5s8-1.5 8-3.5v-3 M9 10L6 3 M15 10l3-7' },
  { id: 'jolly', label: 'Jolly', icon: 'M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z' }
];
const Q = 'M8.8 9a3.3 3.3 0 1 1 4.6 3c-.9.4-1.4 1.2-1.4 2.1V15 M12 19h.01';
const N_SYNTH_EXTRA = 20, JOLLY_MAX = 3, MAX_REC = 50, MAX_SEC = 30;
const MUSIC_GAIN = .8, DUCK = .35;           // durante "?" e Jolly la musica scende al 35%
const AIUTINI_FALLBACK = ['Un personaggio scopre di avere un fratello gemello.'];

const svg = (d, s, w) => '<svg width="' + (s || 24) + '" height="' + (s || 24) + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="' + (w || 1.8) + '" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const rndInt = n => Math.floor(Math.random() * n);
const pickFrom = arr => arr[rndInt(arr.length)];
const $ = id => document.getElementById(id);

/* ================= stato ================= */
let story = false, paused = false, musicId = null, musicVoice = null, ambVoice = null;
// stato della singola storia (si azzera con Riavvia)
let xUsed = [false, false, false, false];   // i 4 tasti "?"
let xClipsUsed = new Set();                 // clip della cartella extra già suonate
let jollyCount = 0, jollyUsed = new Set();  // registrazioni già suonate dal Jolly
let aiutoUsed = false;

let recs = [];
let files = {};
let aiutini = AIUTINI_FALLBACK;

fetch('audio-manifest.json', { cache: 'no-cache' })
  .then(r => r.ok ? r.json() : {})
  .then(m => { files = m || {}; warmCache(); })
  .catch(() => { });
fetch('aiutini.txt', { cache: 'no-cache' })
  .then(r => r.ok ? r.text() : '')
  .then(t => { const l = t.split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#')); if (l.length) aiutini = l; })
  .catch(() => { });
listRecs().then(r => { recs = r.sort((a, b) => a.created - b.created); draw(); drawRec(); }).catch(() => { });

/* ================= motore audio ================= */
let ctx = null, master = null, synth = null;
const voices = new Set();

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    ctx = new C();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = .85; master.connect(comp);
    synth = createSynth(ctx);
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { }
  }
  if (paused) { paused = false; draw(); }
  if (ctx.state !== 'running') ctx.resume().catch(() => { });
  return ctx;
}

function play(buffer, o) {
  o = o || {};
  const now = ctx.currentTime, src = ctx.createBufferSource(), g = ctx.createGain();
  src.buffer = buffer; src.loop = !!o.loop;
  const lvl = o.gain == null ? 1 : o.gain;
  if (o.fadeIn) { g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(lvl, now + o.fadeIn); } else g.gain.value = lvl;
  src.connect(g); g.connect(master);
  const v = { src, g, endAt: now + buffer.duration };
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
let mTok = 0;
function clearMusic() { musicVoice = null; musicId = null; mTok++; }

/* ---- abbassamento della musica sotto "?" e Jolly ---- */
let duck = 0;
const musicLevel = () => MUSIC_GAIN * (duck > 0 ? DUCK : 1);
function applyDuck() {
  if (!musicVoice) return;
  const now = ctx.currentTime, g = musicVoice.g.gain;
  try { g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(musicLevel(), now + (duck > 0 ? .25 : .6)); } catch (e) { }
}
function playOver(buffer) {
  duck++; applyDuck();
  play(buffer, { onEnd: () => { duck = Math.max(0, duck - 1); applyDuck(); } });
}

/* ---- caricamento dei file dalle cartelle audio, con ripiego sui segnaposto ---- */
const decoded = new Map(), synthCache = new Map();
function decode(ab) { return new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)); }
function loadUrl(url) {
  if (decoded.has(url)) { const p = decoded.get(url); decoded.delete(url); decoded.set(url, p); return p; }
  const p = fetch(encodeURI(url)).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(decode);
  decoded.set(url, p);
  p.catch(() => decoded.delete(url));
  while (decoded.size > 16) decoded.delete(decoded.keys().next().value);
  return p;
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

/* ================= schermata iniziale ================= */
let ambPending = false;
async function startAmbient() {
  if (story || ambVoice || ambPending || location.hash === '#registrazioni') return;
  ambPending = true;
  ac();
  $('hint').classList.add('off');
  const b = await getSound('ambiente', -1, 'amb', 1, () => synth.ambiente());
  ambPending = false;
  if (story || ambVoice || location.hash === '#registrazioni') return;
  ambVoice = play(b, { loop: true, fadeIn: 1.5, gain: .9 });
}
function stopAmbient(secs) { if (ambVoice && ctx) { fade(ambVoice, secs); ambVoice = null; } }

$('screen-start').addEventListener('pointerdown', e => {
  if (e.target.closest('#toRec') || e.target.closest('#cavStart')) return;
  startAmbient();
});

$('aiuto').addEventListener('click', () => {
  if (aiutoUsed) return;
  aiutoUsed = true;
  const box = $('aiutoBox');
  box.textContent = pickFrom(aiutini); box.hidden = false;
  draw();
});

function enterStory() {
  ac();
  story = true; resetSession();
  fadeAll(1.5); ambVoice = null; clearMusic();
  getSound('cavalli', 1, 'cav', 2, i => synth.cavalli(i)).then(b => { if (story) play(b, { fadeIn: 1.2 }); });
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cur = $('curtain'), r = $('cavStart').getBoundingClientRect();
  cur.style.setProperty('--cx', (r.left + r.width / 2) + 'px');
  cur.style.setProperty('--cy', (r.top + r.height / 2) + 'px');
  cur.classList.remove('run'); void cur.offsetWidth; cur.classList.add('run');
  setTimeout(() => { $('aiutoBox').hidden = true; route(); }, reduce ? 380 : 520);
  setTimeout(() => cur.classList.remove('run'), reduce ? 950 : 1350);
}
// il tasto iniziale fa partire sempre la clip 2, comunque lo si prema
const cavStart = $('cavStart');
let startPointer = false;
cavStart.addEventListener('pointerdown', () => { startPointer = true; });
cavStart.addEventListener('pointerup', () => { if (startPointer && !story) enterStory(); });
cavStart.addEventListener('pointercancel', () => { startPointer = false; });
cavStart.addEventListener('contextmenu', e => e.preventDefault());
cavStart.addEventListener('click', () => { if (startPointer) { startPointer = false; return; } if (!story) enterStory(); });

function resetSession() {
  xUsed = [false, false, false, false]; xClipsUsed = new Set();
  jollyCount = 0; jollyUsed = new Set(); duck = 0;
}

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

async function doAccent(id) {
  ac();
  if (id === 'silenzio') { fadeAll(3); clearMusic(); draw(); return; }
  if (id === 'taglio') {
    voices.forEach(v => fade(v, .02)); clearMusic(); draw();
    play(await getSound('accenti/taglio', -1, 'taglio', 1, () => synth.taglio()));
  } else if (id === 'drama') {
    play(await getSound('accenti/drama', -1, 'drama', 1, () => synth.drama()));
  } else if (id === 'crescendo') {
    const b = await getSound('accenti/crescendo', -1, 'crescendo', 1, () => synth.crescendo());
    play(b, { onEnd: (v, natural) => { if (natural) { voices.forEach(o => { if (o !== v) fade(o, .03); }); clearMusic(); draw(); } } });
  } else if (id === 'battuta') {
    play(await getSound('accenti/battuta', -1, 'battuta', 3, i => synth.battuta(i)));
  } else if (id === 'jolly') {
    doJolly();
  }
}

// Jolly: una registrazione a caso, senza ripetizioni, fino a 3 volte per storia
async function doJolly() {
  const pool = recs.filter(r => !jollyUsed.has(r.id));
  if (!story || jollyCount >= JOLLY_MAX || !pool.length) return;
  const r = pickFrom(pool);
  jollyCount++; jollyUsed.add(r.id); draw();
  try { playOver(await loadRec(r)); } catch (e) { }
}

// tasti "?": pescano tutti dalla cartella extra, senza ripetere una clip nella stessa storia
async function doExtra(i) {
  if (!story || xUsed[i]) return;
  ac();
  xUsed[i] = true; draw();
  const list = files['extra'];
  const n = list && list.length ? list.length : N_SYNTH_EXTRA;
  const free = [];
  for (let k = 0; k < n; k++) if (!xClipsUsed.has(k)) free.push(k);
  if (!free.length) return;
  const k = pickFrom(free); xClipsUsed.add(k);
  playOver(await getSound('extra', k, 'x', N_SYNTH_EXTRA, j => synth.extra(j)));
}

// which: 0 = clip 1 (tocco normale), 1 = clip 2 (tenuto premuto 1,5 s)
async function doCavalli(which) {
  ac();
  fadeAll(1.5); clearMusic(); draw();
  play(await getSound('cavalli', which, 'cav', 2, i => synth.cavalli(i)), { fadeIn: 1.2 });
}

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
  clearMusic(); ambVoice = null;
  story = false; resetSession(); aiutoUsed = false;
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
let jollyBtn = null;
ACC.forEach(a => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'a pad'; b.dataset.id = a.id;
  b.innerHTML = svg(a.icon) + '<span class="lab">' + a.label + '</span>' + (a.id === 'jolly' ? '<span class="pips" aria-hidden="true"><i></i><i></i><i></i></span>' : '');
  b.addEventListener('click', () => { if (b.disabled) return; flash(b); doAccent(a.id); });
  if (a.id === 'jolly') jollyBtn = b;
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
  if (!story) return;
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
  xs.forEach((el, i) => {
    el.disabled = xUsed[i];
    el.setAttribute('aria-label', 'Suono a sorpresa ' + (i + 1) + (xUsed[i] ? ', già usato' : ''));
  });
  if (jollyBtn) {
    const left = JOLLY_MAX - jollyCount, avail = recs.some(r => !jollyUsed.has(r.id));
    jollyBtn.disabled = left <= 0 || !avail;
    jollyBtn.querySelectorAll('.pips i').forEach((p, k) => p.classList.toggle('spent', k >= left));
    jollyBtn.setAttribute('aria-label', 'Jolly, ' + (recs.length ? left + ' rimasti' : 'nessuna registrazione'));
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
async function startRec() {
  showMsg('');
  if (recs.length >= MAX_REC) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
    showMsg('Questo browser non permette di registrare. Apri l\'app dal suo indirizzo https con Safari o Chrome aggiornati.');
    return;
  }
  stopPreview();
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch (e) { showMsg('Il microfono è bloccato. Consenti l\'accesso al microfono per questo sito nelle impostazioni del browser, poi riprova.'); return; }
  const type = pickType();
  let mr;
  try { mr = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream); }
  catch (e) { stream.getTracks().forEach(t => t.stop()); showMsg('Non riesco ad avviare la registrazione su questo telefono.'); return; }
  const chunks = [], t0 = performance.now();
  mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  mr.onstop = async () => {
    stream.getTracks().forEach(t => t.stop());
    clearInterval(recording && recording.timer);
    recording = null;
    const dur = (performance.now() - t0) / 1000;
    const blob = new Blob(chunks, { type: mr.mimeType || type || 'audio/webm' });
    if (blob.size < 500 || dur < .4) { drawRec(); return; }
    const n = recs.reduce((m, r) => { const k = parseInt((r.title.match(/^Registrazione (\d+)$/) || [])[1], 10); return k > m ? k : m; }, 0) + 1;
    const r = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: 'Registrazione ' + n, created: Date.now(), dur, blob };
    recs.push(r);
    try { await saveRec(r); } catch (e) { showMsg('Non sono riuscito a salvare la registrazione sul telefono. Controlla lo spazio libero.'); }
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
    const v = play(b, { onEnd: () => { if (preview && preview.voice === v) { preview = null; markPreview(); } } });
    preview = { id: r.id, voice: v }; markPreview();
  } catch (e) { showMsg('Questa registrazione non si riesce a riprodurre su questo telefono.'); }
}

function drawRec() {
  $('count').textContent = recs.length + '/' + MAX_REC;
  const full = recs.length >= MAX_REC;
  recBtn.disabled = full && !recording;
  recBtn.classList.toggle('on', !!recording);
  recBtn.setAttribute('aria-label', recording ? 'Ferma la registrazione' : 'Registra');
  if (!recording) {
    $('recState').textContent = full ? 'Hai 50 registrazioni' : 'Registra';
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
    inp.setAttribute('aria-label', 'Titolo della registrazione'); inp.maxLength = 60;
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
  const rec = location.hash === '#registrazioni' && !story;
  $('screen-start').hidden = story || rec;
  $('screen-main').hidden = !story;
  $('screen-rec').hidden = !rec;
  if (rec) { stopAmbient(.5); drawRec(); }
  else { stopRec(); stopPreview(); showMsg(''); if (!story && ctx && ctx.state === 'running') startAmbient(); }
  draw();
  window.scrollTo(0, 0);
}
$('toRec').addEventListener('click', () => { location.hash = 'registrazioni'; });
$('back').addEventListener('click', () => { if (history.length > 1 && location.hash === '#registrazioni') history.back(); else location.hash = ''; });
window.addEventListener('hashchange', route);

draw(); drawRec(); route();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
}

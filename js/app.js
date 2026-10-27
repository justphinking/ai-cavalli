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
// Icone segnaposto delle 20 opzioni Extra (nell'ordine dei file audio/extra/01…20)
const ICONS = [
  'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16z', 'M5 5h14v14H5z', 'M12 4l8 15H4z', 'M12 3l8 9-8 9-8-9z',
  'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7z',
  'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  'M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z M10 21h4', 'M13 2L5 13h6l-1 9 8-11h-6z',
  'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M4.9 4.9L7 7 M17 17l2.1 2.1 M4.9 19.1L7 17 M17 7l2.1-2.1',
  'M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z', 'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z',
  'M12 21a6 6 0 0 0 6-6c0-4-3-6-4-10-1 3-3 4-3 4s-1-2-1-4c-2 2-4 5-4 10a6 6 0 0 0 6 6z',
  'M2 12c2.5-4 5-4 7.5 0s5 4 7.5 0 3.5-2 5-1', 'M5 19C5 10 11 5 20 4c-1 9-6 15-15 15z M5 19l8-8',
  'M8 15a3.5 3.5 0 1 0 0-7a3.5 3.5 0 1 0 0 7z M11.5 11.5H21 M18 11.5v3 M21 11.5v2',
  'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z',
  'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M12 7v5l3 2', 'M6 21V4h12v17 M3 21h18 M14 12h1',
  'M9 18V5l10-2v13 M6.5 15.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5z M16.5 13.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5z'
];
const Q = 'M8.8 9a3.3 3.3 0 1 1 4.6 3c-.9.4-1.4 1.2-1.4 2.1V15 M12 19h.01';
const N_EXTRA = 3, MAX_REC = 50, MAX_SEC = 30;
const svg = (d, s, w) => '<svg width="' + (s || 24) + '" height="' + (s || 24) + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="' + (w || 1.8) + '" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const rndInt = n => Math.floor(Math.random() * n);
const $ = id => document.getElementById(id);

/* ================= stato ================= */
const KEY = 'aicavalli.extras.v2';
let extras = Array(N_EXTRA).fill(null);
try {
  const s = JSON.parse(localStorage.getItem(KEY));
  if (Array.isArray(s) && s.length === N_EXTRA) extras = s.map(x => Number.isInteger(x) && x >= 0 && x < ICONS.length ? x : null);
} catch (e) { }
const saveExtras = () => { try { localStorage.setItem(KEY, JSON.stringify(extras)); } catch (e) { } };

let story = false, paused = false, menuFor = null, musicId = null, musicVoice = null, impUsed = false;
let recs = [];
let files = {};

fetch('audio-manifest.json', { cache: 'no-cache' })
  .then(r => r.ok ? r.json() : {})
  .then(m => { files = m || {}; warmCache(); })
  .catch(() => { });

listRecs().then(r => { recs = r.sort((a, b) => a.created - b.created); draw(); drawImp(); }).catch(() => { });

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
  const i = which < 0 ? rndInt(fbCount) : which;
  const k = fbKey + i;
  if (!synthCache.has(k)) synthCache.set(k, fbMake(i));
  return synthCache.get(k);
}
// scarica in anticipo i file, così sono pronti anche senza rete
function warmCache() {
  const all = Object.values(files).flat();
  let i = 0;
  const next = () => { if (i >= all.length) return; fetch(encodeURI(all[i++])).catch(() => { }).finally(() => setTimeout(next, 50)); };
  setTimeout(next, 1500);
}
const sMusic = id => getSound('musiche/' + id, -1, 'm.' + id + '.', 3, i => synth.music(id, i));
const sExtra = j => getSound('extra', j, 'x', ICONS.length, i => synth.extra(i));

/* ================= azioni ================= */
async function doMusic(id) {
  ac();
  if (musicId === id && musicVoice) { fade(musicVoice, .5); clearMusic(); draw(); return; }
  const tok = ++mTok; musicId = id; draw();
  const b = await sMusic(id);
  if (tok !== mTok) return;
  if (musicVoice) fade(musicVoice, .6);
  musicVoice = play(b, { loop: true, fadeIn: .6, gain: .8 });
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
    const pool = [];
    for (let i = 0; i < ICONS.length; i++) if (!extras.includes(i)) pool.push(i);
    if (pool.length) play(await sExtra(pool[rndInt(pool.length)]));
  }
}

async function playExtra(j) { ac(); play(await sExtra(j)); }

async function doCavalli() {
  ac();
  if (!story) { startStory(); return; }
  fadeAll(1.5); clearMusic(); draw();
  play(await getSound('cavalli', -1, 'cav', 3, i => synth.cavalli(i)), { fadeIn: 1.2 });
}

function startStory() {
  story = true; impUsed = false; menuFor = null;
  getSound('jingle', -1, 'jingle', 1, () => synth.jingle()).then(b => play(b));
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cur = $('curtain'), r = $('cav').getBoundingClientRect();
  cur.style.setProperty('--cx', (r.left + r.width / 2) + 'px');
  cur.style.setProperty('--cy', (r.top + r.height / 2) + 'px');
  cur.classList.remove('run'); void cur.offsetWidth; cur.classList.add('run');
  setTimeout(draw, reduce ? 400 : 560);
  setTimeout(() => cur.classList.remove('run'), reduce ? 1700 : 2100);
}

async function doImprevisto() {
  if (!story || impUsed || !recs.length) return;
  impUsed = true; draw();
  ac();
  voices.forEach(v => fade(v, .03)); clearMusic(); draw();
  const rec = recs[rndInt(recs.length)];
  const voiceP = loadRec(rec);
  const door = await getSound('porta-saloon', -1, 'door', 1, () => synth.door());
  play(door, {
    onEnd: async (v, natural) => {
      if (!natural) return;
      try { play(await voiceP, { gain: 1 }); } catch (e) { }
    }
  });
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
  clearMusic(); story = false; impUsed = false; draw();
}

/* ================= schermata principale ================= */
const musicEl = $('music'), accEl = $('acc'), menuEl = $('menu'), scrim = $('scrim'), middle = $('middle');
function flash(el) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); setTimeout(() => el.classList.remove('hit'), 350); }

MUSIC.forEach(m => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'm pad'; b.style.setProperty('--c', m.c); b.dataset.id = m.id;
  b.innerHTML = '<span class="top"><span class="dot"></span><span class="eq" aria-hidden="true"><i></i><i></i><i></i></span></span><span class="lab">' + m.label + '</span>';
  b.addEventListener('click', () => doMusic(m.id));
  musicEl.appendChild(b);
});
ACC.forEach(a => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'a pad';
  b.innerHTML = svg(a.icon) + '<span class="lab">' + a.label + '</span>';
  b.addEventListener('click', () => { flash(b); doAccent(a.id); });
  accEl.appendChild(b);
});
const xs = [...document.querySelectorAll('.x')];
ICONS.forEach((d, j) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'opt'; b.setAttribute('aria-label', 'Suono ' + (j + 1)); b.innerHTML = svg(d);
  b.addEventListener('click', () => {
    if (menuFor === null) return;
    const i = menuFor;
    extras[i] = j; saveExtras(); closeMenu();
    flash(xs[i]); playExtra(j);
  });
  menuEl.appendChild(b);
});
xs.forEach((el, i) => {
  let timer = null, long = false;
  el.addEventListener('pointerdown', () => {
    long = false; clearTimeout(timer);
    if (story) return;
    timer = setTimeout(() => { long = true; openMenu(i); try { navigator.vibrate && navigator.vibrate(15); } catch (e) { } }, 500);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => el.addEventListener(ev, () => clearTimeout(timer)));
  el.addEventListener('contextmenu', e => e.preventDefault());
  el.addEventListener('click', () => {
    if (long) { long = false; return; }
    if (extras[i] === null) { if (!story) openMenu(i); return; }
    flash(el); playExtra(extras[i]);
  });
});
function openMenu(i) { menuFor = i; draw(); }
function closeMenu() { menuFor = null; draw(); }
scrim.addEventListener('click', closeMenu);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && menuFor !== null) closeMenu(); });
$('cav').addEventListener('click', () => { flash($('cav')); doCavalli(); });
$('imp').addEventListener('click', () => { flash($('imp')); doImprevisto(); });
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
    const ic = extras[i];
    el.innerHTML = svg(ic === null ? Q : ICONS[ic], 26, ic === null ? 2.4 : 2);
    el.classList.toggle('open', menuFor === i);
    el.disabled = story && ic === null;
    el.setAttribute('aria-label', 'Extra ' + (i + 1) + (ic === null ? ', da assegnare' : ''));
    el.setAttribute('aria-expanded', menuFor === i ? 'true' : 'false');
  });
  const imp = $('imp'), impReady = story && !impUsed && recs.length > 0;
  imp.disabled = !impReady; imp.classList.toggle('ready', impReady);
  imp.setAttribute('aria-label', !story ? 'Imprevisto, disponibile a storia iniziata' : impUsed ? 'Imprevisto già usato' : recs.length ? 'Imprevisto' : 'Imprevisto, nessuna frase registrata');

  const open = menuFor !== null;
  menuEl.hidden = !open; scrim.hidden = !open; middle.classList.toggle('open', open);
  if (open) {
    menuEl.setAttribute('aria-label', 'Scegli il suono per Extra ' + (menuFor + 1));
    [...menuEl.children].forEach((b, j) => {
      const sel = extras[menuFor] === j;
      b.classList.toggle('sel', sel); b.setAttribute('aria-pressed', sel ? 'true' : 'false');
      b.classList.toggle('used', !sel && extras.includes(j));
    });
  }
  $('cavLab').textContent = story ? 'Ai cavalli!' : 'Inizia la storia';
  $('cav').classList.toggle('story', story);
  $('transport').hidden = !story;
  $('toImp').hidden = story;
  $('pp').innerHTML = paused ? svg('M7 5l12 7-12 7z', 18, 2) + 'Riprendi' : svg('M8 5v14 M16 5v14', 18, 2.4) + 'Pausa';
  document.body.classList.toggle('paused', paused);
}

/* ================= schermata imprevisti ================= */
const recBtn = $('rec'), listEl = $('list'), msgEl = $('impMsg');
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
    if (blob.size < 500 || dur < .4) { drawImp(); return; }
    const n = recs.reduce((m, r) => { const k = parseInt((r.title.match(/^Imprevisto (\d+)$/) || [])[1], 10); return k > m ? k : m; }, 0) + 1;
    const r = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: 'Imprevisto ' + n, created: Date.now(), dur, blob };
    recs.push(r);
    try { await saveRec(r); } catch (e) { showMsg('Non sono riuscito a salvare la registrazione sul telefono. Controlla lo spazio libero.'); }
    drawImp(); draw();
  };
  mr.start();
  recording = { mr, t0, timer: setInterval(tick, 200) };
  drawImp();
}
function stopRec() { if (recording && recording.mr.state !== 'inactive') recording.mr.stop(); }
function tick() {
  if (!recording) return;
  const s = (performance.now() - recording.t0) / 1000;
  $('recState').textContent = 'In registrazione · ' + fmt(s);
  if (s >= MAX_SEC) stopRec();
}
recBtn.addEventListener('click', () => { recording ? stopRec() : startRec(); });

let preview = null; // { id, voice }
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

function drawImp() {
  $('count').textContent = recs.length + '/' + MAX_REC;
  const full = recs.length >= MAX_REC;
  recBtn.disabled = full && !recording;
  recBtn.classList.toggle('on', !!recording);
  recBtn.setAttribute('aria-label', recording ? 'Ferma la registrazione' : 'Registra un imprevisto');
  if (!recording) {
    $('recState').textContent = full ? 'Hai 50 imprevisti' : 'Registra un imprevisto';
    $('recHint').textContent = full ? 'Cancellane uno per registrarne un altro.' : 'Tocca il pulsante, di\' la frase, tocca di nuovo per fermare. Massimo 30 secondi.';
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
    inp.setAttribute('aria-label', 'Titolo dell\'imprevisto'); inp.maxLength = 60;
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
      drawImp(); draw();
    });
    li.append(pb, inp, du, del);
    listEl.appendChild(li);
  });
  markPreview();
}

/* ================= navigazione ================= */
function route() {
  const imp = location.hash === '#imprevisti' && !story;
  $('screen-main').hidden = imp; $('screen-imp').hidden = !imp;
  if (!imp) { stopRec(); stopPreview(); showMsg(''); }
  else { menuFor = null; draw(); drawImp(); }
  window.scrollTo(0, 0);
}
$('toImp').addEventListener('click', () => { location.hash = 'imprevisti'; });
$('back').addEventListener('click', () => { if (history.length > 1 && location.hash === '#imprevisti') history.back(); else location.hash = ''; });
window.addEventListener('hashchange', route);

draw(); drawImp(); route();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
}

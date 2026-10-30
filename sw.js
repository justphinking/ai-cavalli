// Tiene l'app disponibile anche senza rete.
const CACHE = 'aicavalli-__BUILD__';
const SHELL = ['./', 'index.html', 'styles.css', 'js/app.js', 'js/synth.js', 'js/store.js', 'audio-manifest.json', 'aiutini.txt', 'suggerimenti.txt', 'manifest.webmanifest', 'icons/icon-192.png', 'img/sfondo-1.jpg', 'img/sfondo-2.jpg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => { })))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const isPage = req.mode === 'navigate';
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: isPage });
    const net = fetch(req).then(r => {
      if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone());
      return r;
    }).catch(() => hit || (isPage ? c.match('index.html') : undefined));
    // pagina e file dell'app: prima la rete (aggiornamenti subito), poi la copia salvata
    if (isPage || /\.(html|css|js|json|txt|webmanifest)$/.test(new URL(req.url).pathname)) return net.then(r => r || hit);
    // audio, icone e font: prima la copia salvata
    return hit || net;
  }));
});

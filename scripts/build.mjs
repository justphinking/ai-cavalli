// Prepara la cartella dist/ per Vercel e crea l'elenco dei file audio presenti.
import fs from 'node:fs';
import path from 'node:path';

const out = 'dist';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);

for (const f of ['index.html', 'styles.css', 'manifest.webmanifest', 'aiutini.txt']) fs.copyFileSync(f, path.join(out, f));
for (const d of ['js', 'icons', 'audio']) if (fs.existsSync(d)) fs.cpSync(d, path.join(out, d), { recursive: true });

const AUDIO = /\.(mp3|m4a|aac|wav|ogg|oga|opus|webm|flac)$/i;
const manifest = {};
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (AUDIO.test(e.name)) {
      const key = path.relative('audio', dir).split(path.sep).join('/').toLowerCase();
      (manifest[key] ||= []).push(p.split(path.sep).join('/'));
    }
  }
}
if (fs.existsSync('audio')) walk('audio');
for (const k in manifest) manifest[k].sort((a, b) => a.localeCompare(b, 'it', { numeric: true }));
fs.writeFileSync(path.join(out, 'audio-manifest.json'), JSON.stringify(manifest, null, 2));

const sw = fs.readFileSync('sw.js', 'utf8').replace('__BUILD__', Date.now().toString(36));
fs.writeFileSync(path.join(out, 'sw.js'), sw);

const n = Object.values(manifest).reduce((a, l) => a + l.length, 0);
console.log(`Build pronta: ${n} file audio in ${Object.keys(manifest).length} cartelle.`);
for (const [k, l] of Object.entries(manifest)) console.log(`  ${k}: ${l.length}`);

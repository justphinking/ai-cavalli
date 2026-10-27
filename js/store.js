// Archivio degli imprevisti registrati, sul telefono (IndexedDB).
const DB = 'aicavalli', STORE = 'imprevisti';
let dbp = null;

function open() {
  if (!dbp) {
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => { r.result.createObjectStore(STORE, { keyPath: 'id' }); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  return dbp;
}

function tx(mode, fn) {
  return open().then(db => new Promise((res, rej) => {
    const t = db.transaction(STORE, mode), s = t.objectStore(STORE);
    const out = fn(s);
    t.oncomplete = () => res(out && 'result' in out ? out.result : undefined);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  }));
}

export const listRecs = () => tx('readonly', s => s.getAll()).then(r => r || []);
export const saveRec = rec => tx('readwrite', s => { s.put(rec); });
export const deleteRec = id => tx('readwrite', s => { s.delete(id); });

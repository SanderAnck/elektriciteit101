// Local storage layer: a tiny promise wrapper around IndexedDB.
// All data stays on this device: no account, no server, no tracking.

const DB_NAME = 'stroomkringen';
const DB_VERSION = 1;

// Store name -> key path.
export const STORES = {
  settings: 'id', // one record, id 'app'
  profiles: 'id', // { id, name, icon, createdAt }
  progress: 'id', // id `${profileId}:${lessonId}` -> { profileId, lessonId, done, stars, tries, hints }
  circuits: 'id', // saved sandbox circuits { id, profileId, name, data, savedAt }
  drafts: 'id', // work in progress, id `${profileId}:${place}`
};

let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const [name, keyPath] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function run(storeName, mode, fn) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const result = fn(tx.objectStore(storeName));
        tx.oncomplete = () => resolve(result && 'result' in result ? result.result : result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

export const db = {
  get: (store, key) => run(store, 'readonly', (s) => s.get(key)),
  getAll: (store) => run(store, 'readonly', (s) => s.getAll()),
  put: (store, value) => run(store, 'readwrite', (s) => s.put(value)),
  delete: (store, key) => run(store, 'readwrite', (s) => s.delete(key)),
  clear: (store) => run(store, 'readwrite', (s) => s.clear()),

  /** Dump every store into one plain object (backup file). */
  async exportAll() {
    const data = {};
    for (const name of Object.keys(STORES)) data[name] = await db.getAll(name);
    return { app: 'stroomkringen', kind: 'backup', version: self.APP_VERSION, exportedAt: new Date().toISOString(), data };
  },

  /** Replace all stores with the contents of a backup made by exportAll(). */
  async importAll(backup) {
    if (!backup || backup.app !== 'stroomkringen' || backup.kind !== 'backup' || typeof backup.data !== 'object') {
      throw new Error('Dit is geen geldig back-upbestand van Stroomkringen.');
    }
    for (const name of Object.keys(STORES)) {
      await db.clear(name);
      for (const row of backup.data[name] || []) await db.put(name, row);
    }
  },
};

/** Ask the browser not to evict our data when storage runs low. */
export async function requestPersistentStorage() {
  try {
    return await navigator.storage?.persist?.();
  } catch {
    return false;
  }
}

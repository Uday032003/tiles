const DB_NAME = 'dm_tiles_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'mutation_queue';
const FALLBACK_KEY = 'dm_tiles_offline_queue';

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function notifyQueueChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dm-tiles:offline-queue-changed'));
  }
}

function readFallback() {
  try {
    return JSON.parse(localStorage.getItem(FALLBACK_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeFallback(items) {
  try {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(items));
  } catch {
    // ignore storage quota errors
  }
}

export async function enqueueMutation({ method, url, data, label }) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    method: String(method || 'POST').toUpperCase(),
    url,
    data,
    label: label || 'Offline change',
    createdAt: new Date().toISOString(),
  };

  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    const list = readFallback();
    list.push(entry);
    writeFallback(list);
  }

  notifyQueueChange();
  return entry;
}

export async function listQueuedMutations() {
  try {
    const db = await openDb();
    const items = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return readFallback();
  }
}

export async function removeQueuedMutation(id) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    writeFallback(readFallback().filter((item) => item.id !== id));
  }
  notifyQueueChange();
}


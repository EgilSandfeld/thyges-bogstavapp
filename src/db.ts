import type { SavedState } from './types';

const DB_NAME = 'thyges-bogstavvaerksted';
const STORE_NAME = 'app';
const STATE_KEY = 'state';
const FALLBACK_KEY = 'thyges-bogstavvaerksted-state';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME))
        database.createObjectStore(STORE_NAME);
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadState(): Promise<unknown> {
  try {
    const database = await openDatabase();
    const value = await new Promise<unknown>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(STATE_KEY);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return value;
  } catch {
    const fallback = localStorage.getItem(FALLBACK_KEY);
    return fallback ? JSON.parse(fallback) as unknown : null;
  }
}

export async function saveState(state: SavedState): Promise<void> {
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(state, STATE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  } catch {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(state));
  }
}

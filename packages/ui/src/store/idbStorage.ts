/**
 * Minimal IndexedDB-backed key/value store used as the persistence layer
 * for the template Zustand store. Moved off of localStorage in GH #11 —
 * a single real-world photo's data URL (a ~5 MB base-64 string) already
 * exceeds the ~5 MB localStorage quota. IndexedDB's default quota is on
 * the order of gigabytes, so the template + its backgrounds fit
 * comfortably.
 *
 * No dependency added: everything here uses the built-in IndexedDB API.
 * Kept deliberately tiny (one store, three operations, one open).
 */

const DB_NAME = 'template-goblin'
const STORE_NAME = 'kv'
const DB_VERSION = 1

let _dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (_dbPromise) return _dbPromise
  _dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return _dbPromise
}

async function runTx<T>(
  mode: IDBTransactionMode,
  op: (store: IDBObjectStore) => IDBRequest<T> | undefined,
): Promise<T | undefined> {
  const db = await openDb()
  return await new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode)
    const store = tx.objectStore(STORE_NAME)
    const req = op(store)
    tx.oncomplete = () => resolve(req?.result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

/** Read a value from the IDB kv store. Returns undefined when absent. */
export async function idbGet<T>(key: string): Promise<T | undefined> {
  return (await runTx<T>('readonly', (s) => s.get(key) as IDBRequest<T>)) as T | undefined
}

/** Write a value to the IDB kv store. */
export async function idbSet<T>(key: string, value: T): Promise<void> {
  await runTx('readwrite', (s) => s.put(value, key) as IDBRequest<IDBValidKey>)
}

/** Remove a value from the IDB kv store. */
export async function idbDelete(key: string): Promise<void> {
  await runTx('readwrite', (s) => s.delete(key) as IDBRequest<undefined>)
}

/**
 * Best-effort one-time migration: if the legacy localStorage entry is
 * present for `key` and IDB has no value yet, copy it over and clear
 * localStorage so subsequent writes go straight to IDB. Safe to call
 * multiple times — a second call sees the IDB entry and is a no-op.
 */
export async function migrateFromLocalStorage(key: string): Promise<void> {
  if (typeof localStorage === 'undefined') return
  const raw = localStorage.getItem(key)
  if (!raw) return
  const existing = await idbGet<string>(key)
  if (existing !== undefined) {
    localStorage.removeItem(key)
    return
  }
  try {
    await idbSet(key, raw)
    localStorage.removeItem(key)
  } catch (err) {
    console.warn('[idbStorage] migration from localStorage failed:', err)
  }
}

import { ReminderState, emptyReminderState } from "./reminderCore";

// ponytail: one blob under one key. IndexedDB (not localStorage) only because
// it is the sole storage both the window and the service worker can reach.
const DB_NAME = "leyaana-reminders";
const STORE = "state";
const KEY = "current";

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runRequest<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  makeRequest: (store: IDBObjectStore) => IDBRequest<T>,
) {
  return new Promise<T>((resolve, reject) => {
    const request = makeRequest(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function readReminderState(): Promise<ReminderState> {
  const db = await openDb();
  try {
    const stored = await runRequest<ReminderState | undefined>(
      db,
      "readonly",
      (store) => store.get(KEY),
    );
    return stored ?? emptyReminderState;
  } finally {
    db.close();
  }
}

export async function writeReminderState(state: ReminderState) {
  const db = await openDb();
  try {
    await runRequest(db, "readwrite", (store) => store.put(state, KEY));
  } finally {
    db.close();
  }
}

// lastShown is written from both the page and the worker, so always fold onto
// the freshest stored copy rather than a snapshot the caller read earlier.
export async function updateReminderState(
  change: (current: ReminderState) => ReminderState,
) {
  const next = change(await readReminderState());
  await writeReminderState(next);
  return next;
}

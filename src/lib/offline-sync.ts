import { openDB } from 'idb';

const DB_NAME = 'medcore-offline-db';
const STORE_NAME = 'offline-shifts';

export async function initDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

export async function saveOfflineAction(action: { type: 'CREATE' | 'UPDATE' | 'DELETE', payload: any }) {
  const db = await initDB();
  await db.add(STORE_NAME, {
    ...action,
    timestamp: Date.now(),
  });
}

export async function getOfflineActions() {
  const db = await initDB();
  return db.getAll(STORE_NAME);
}

export async function removeOfflineAction(id: number) {
  const db = await initDB();
  return db.delete(STORE_NAME, id);
}

export async function syncOfflineActions() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  const actions = await getOfflineActions();
  if (actions.length === 0) return;

  for (const action of actions) {
    try {
      const { type, payload } = action;
      let method = 'POST';
      let url = '/api/shifts';

      if (type === 'UPDATE') method = 'PUT';
      if (type === 'DELETE') {
        method = 'DELETE';
        url = `/api/shifts?id=${payload.id}`;
      }

      await fetch(url, {
        method,
        headers: type !== 'DELETE' ? { 'Content-Type': 'application/json' } : {},
        body: type !== 'DELETE' ? JSON.stringify(payload) : undefined,
      });

      // Always remove action from queue if request didn't throw network error
      await removeOfflineAction(action.id);
    } catch (e) {
      console.error('Failed to sync offline action', e);
      break; 
    }
  }
}

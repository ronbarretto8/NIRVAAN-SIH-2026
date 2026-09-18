import type { GameSessionResult } from '@/types';
import { supabase } from '@/lib/supabase';

const DB_NAME = 'nirvaan-offline-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('game_sessions')) {
        const store = db.createObjectStore('game_sessions', { keyPath: 'id' });
        store.createIndex('played_at', 'played_at', { unique: false });
        store.createIndex('synced', 'synced', { unique: false });
      }

      if (!db.objectStoreNames.contains('reminder_logs')) {
        const store = db.createObjectStore('reminder_logs', { keyPath: 'id' });
        store.createIndex('logged_at', 'logged_at', { unique: false });
      }

      if (!db.objectStoreNames.contains('pending_sync')) {
        const store = db.createObjectStore('pending_sync', { keyPath: 'id', autoIncrement: true });
        store.createIndex('table_name', 'table_name', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

// ─── Game Sessions ──────────────────────────────────────────────────────────

export async function saveGameSession(session: Omit<GameSessionResult, 'id' | 'synced'>): Promise<string> {
  const db = await openDB();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const record: GameSessionResult = { ...session, id, synced: false };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('game_sessions', 'readwrite');
    const store = tx.objectStore('game_sessions');
    const req = store.add(record);
    req.onsuccess = () => resolve(id);
    req.onerror = () => reject(req.error);
  });
}

export async function getGameSessions(limit = 50): Promise<GameSessionResult[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('game_sessions', 'readonly');
    const store = tx.objectStore('game_sessions');
    const index = store.index('played_at');
    const req = index.getAll();
    req.onsuccess = () => {
      const all = (req.result as GameSessionResult[]).sort(
        (a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime()
      );
      resolve(all.slice(0, limit));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getUnsyncedSessions(): Promise<GameSessionResult[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('game_sessions', 'readonly');
    const store = tx.objectStore('game_sessions');
    const index = store.index('synced');
    const req = index.getAll(IDBKeyRange.only(false));
    req.onsuccess = () => resolve(req.result as GameSessionResult[]);
    req.onerror = () => reject(req.error);
  });
}

async function markSessionSynced(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('game_sessions', 'readwrite');
    const store = tx.objectStore('game_sessions');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const record = getReq.result as GameSessionResult;
      if (!record) { resolve(); return; }
      record.synced = true;
      const putReq = store.put(record);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

// ─── Auto-sync ───────────────────────────────────────────────────────────────

export async function flushPendingToSupabase(): Promise<number> {
  if (!navigator.onLine) return 0;
  const unsynced = await getUnsyncedSessions();
  if (unsynced.length === 0) return 0;

  let count = 0;
  for (const session of unsynced) {
    try {
      const { error } = await supabase.from('game_scores').insert({
        game_type: session.game_type,
        score: Math.round(session.accuracy),
        moves: session.errors,
        duration_seconds: session.duration_seconds,
        difficulty_level: session.level,
        errors: session.errors,
        accuracy: session.accuracy,
        played_at: session.played_at,
      });
      if (!error) {
        await markSessionSynced(session.id);
        count++;
      }
    } catch {
      // skip on network failure
    }
  }
  return count;
}

export async function getPendingSyncCount(): Promise<number> {
  try {
    const unsynced = await getUnsyncedSessions();
    return unsynced.length;
  } catch {
    return 0;
  }
}

// ─── Network listener ────────────────────────────────────────────────────────

export function setupSyncListener(onSync?: (count: number) => void): () => void {
  const handler = async () => {
    if (navigator.onLine) {
      const count = await flushPendingToSupabase();
      if (count > 0 && onSync) onSync(count);
    }
  };
  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}

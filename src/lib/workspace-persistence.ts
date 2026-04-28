/**
 * Persists workspace state and file handle using IndexedDB.
 *
 * Two things are stored:
 * 1. fileHandle — the FileSystemFileHandle for Save to disk
 * 2. workspaceState — the full workspace JSON, auto-saved on every change
 *
 * On restore, workspaceState takes priority over the file on disk,
 * so unsaved changes survive page reloads.
 */

import type { WorkspaceFile } from '@/lib/file-workspace';

const DB_NAME = 'c4-diagramming-platform';
const DB_VERSION = 2;
const STORE_NAME = 'workspace';
const HANDLE_KEY = 'fileHandle';
const STATE_KEY = 'workspaceState';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      // Another tab has the DB open with an older version — still try to resolve
      console.warn('[auto-save] IndexedDB upgrade blocked by another tab');
    };
  });
}

// --- File handle persistence ---

export async function saveFileHandle(
  handle: FileSystemFileHandle
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(handle, HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadFileHandle(): Promise<FileSystemFileHandle | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(HANDLE_KEY);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function verifyFilePermission(
  handle: FileSystemFileHandle
): Promise<boolean> {
  const options = { mode: 'readwrite' as const };
  if ((await handle.queryPermission(options)) === 'granted') return true;
  if ((await handle.requestPermission(options)) === 'granted') return true;
  return false;
}

export async function clearFileHandle(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

// --- Workspace state persistence (auto-save) ---

export async function saveWorkspaceState(
  workspace: WorkspaceFile
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(JSON.stringify(workspace), STATE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadWorkspaceState(): Promise<WorkspaceFile | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(STATE_KEY);
      request.onsuccess = () => {
        const raw = request.result;
        if (!raw) {
          resolve(null);
          return;
        }
        try {
          resolve(JSON.parse(raw));
        } catch {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function clearWorkspaceState(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(STATE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

import type { AppState } from '@/types';
import type { StorageEngine, StorageEngineType } from './types';
import { getDefaultState } from '../defaults';
import { migrateIfNeeded, toAppState, toPersistedData } from './migration';

const LS_BACKUP_KEY = 'taskmind-data-fs-backup';

const DB_NAME = 'taskmind';
const DB_VERSION = 1;
const STORE_NAME = 'handles';
const HANDLE_KEY = 'datafile';

async function openDB(): Promise<IDBDatabase> {
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
  });
}

async function saveHandleToIndexedDB(handle: FileSystemFileHandle): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getHandleFromIndexedDB(): Promise<FileSystemFileHandle | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export class FileSystemEngine implements StorageEngine {
  private handle: FileSystemFileHandle | null = null;
  private lastState: AppState | null = null;

  async init(): Promise<void> {
    this.handle = await this.tryRestoreHandle();
    if (!this.handle) {
      this.handle = await this.promptForFile();
    }
  }

  async load(): Promise<AppState> {
    if (!this.handle) throw new Error('No file handle available');
    try {
      const file = await this.handle.getFile();
      const text = await file.text();
      if (!text || text.trim() === '') {
        // Empty file — try localStorage backup before returning defaults
        return this.loadFromBackup();
      }
      const data = JSON.parse(text);
      const migrated = migrateIfNeeded(data);
      this.lastState = toAppState(migrated);
      return this.lastState;
    } catch (err) {
      console.error('Failed to load data file:', err);
      // Try localStorage backup before returning empty defaults
      return this.loadFromBackup();
    }
  }

  async save(state: AppState): Promise<void> {
    if (!this.handle) throw new Error('No file handle available');
    const data = toPersistedData(state);
    const json = JSON.stringify(data, null, 2);

    // Validate JSON before writing to prevent corruption
    JSON.parse(json);

    const writable = await this.handle.createWritable();
    await writable.write(json);
    await writable.close();
    this.lastState = state;

    // Mirror to localStorage as a safety net
    try {
      localStorage.setItem(LS_BACKUP_KEY, json);
    } catch {
      // localStorage full or unavailable — non-fatal
    }
  }

  async exportToFile(): Promise<void> {
    if (!this.lastState) return;
    const data = toPersistedData(this.lastState);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'taskmind-data.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async importFromFile(file: File): Promise<AppState> {
    const text = await file.text();
    const data = JSON.parse(text);
    const migrated = migrateIfNeeded(data);
    const state = toAppState(migrated);
    this.lastState = state;
    return state;
  }

  getEngineType(): StorageEngineType {
    return 'file-system';
  }

  private loadFromBackup(): AppState {
    try {
      const raw = localStorage.getItem(LS_BACKUP_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        const migrated = migrateIfNeeded(data);
        const state = toAppState(migrated);
        if (state.tasks.length > 0 || state.chatHistory.length > 0 || state.settings.apiKey) {
          console.warn('[TaskMind] Restored data from localStorage backup');
          this.lastState = state;
          return state;
        }
      }
    } catch {
      console.warn('[TaskMind] localStorage backup also failed');
    }
    this.lastState = getDefaultState();
    return this.lastState;
  }

  private async tryRestoreHandle(): Promise<FileSystemFileHandle | null> {
    const handle = await getHandleFromIndexedDB();
    if (!handle) return null;

    const permission = await handle.queryPermission({ mode: 'readwrite' });
    if (permission === 'granted') return handle;

    const requested = await handle.requestPermission({ mode: 'readwrite' });
    if (requested === 'granted') return handle;

    return null;
  }

  private async promptForFile(): Promise<FileSystemFileHandle> {
    // First try to open an existing data file (preserves data across rebuilds)
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{
          description: 'TaskMind Data',
          accept: { 'application/json': ['.json'] },
        }],
      });
      await saveHandleToIndexedDB(handle);
      return handle;
    } catch {
      // User cancelled the open dialog — offer to create a new file
    }

    const handle = await window.showSaveFilePicker({
      suggestedName: 'taskmind-data.json',
      types: [{
        description: 'TaskMind Data',
        accept: { 'application/json': ['.json'] },
      }],
    });
    await saveHandleToIndexedDB(handle);
    return handle;
  }
}

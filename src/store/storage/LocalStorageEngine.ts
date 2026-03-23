import type { AppState } from '@/types';
import type { StorageEngine, StorageEngineType } from './types';
import { getDefaultState } from '../defaults';
import { migrateIfNeeded, toAppState, toPersistedData } from './migration';

const STORAGE_KEY = 'taskmind-data';
const BACKUP_KEY = 'taskmind-data-backup';

export class LocalStorageEngine implements StorageEngine {
  private lastState: AppState | null = null;

  async init(): Promise<void> {
    // No setup required for localStorage
  }

  async load(): Promise<AppState> {
    // Try primary, then backup, then defaults
    for (const key of [STORAGE_KEY, BACKUP_KEY, 'taskmind-data-fs-backup']) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const data = JSON.parse(raw);
        const migrated = migrateIfNeeded(data);
        const state = toAppState(migrated);
        // Only accept if it has real data (tasks or chat history)
        if (state.tasks.length > 0 || state.chatHistory.length > 0) {
          if (key === BACKUP_KEY) {
            console.warn('[TaskMind] Primary data corrupt/missing, restored from backup');
          }
          this.lastState = state;
          return this.lastState;
        }
      } catch {
        console.warn(`[TaskMind] Failed to parse ${key}, trying next`);
      }
    }
    this.lastState = getDefaultState();
    return this.lastState;
  }

  async save(state: AppState): Promise<void> {
    const data = toPersistedData(state);
    const json = JSON.stringify(data);
    // Backup current data before overwriting
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) {
      localStorage.setItem(BACKUP_KEY, existing);
    }
    localStorage.setItem(STORAGE_KEY, json);
    this.lastState = state;
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
    return 'local-storage';
  }
}

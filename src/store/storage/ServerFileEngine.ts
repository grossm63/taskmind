import type { AppState } from '@/types';
import type { StorageEngine, StorageEngineType } from './types';
import { getDefaultState } from '../defaults';
import { migrateIfNeeded, toAppState, toPersistedData } from './migration';

export class ServerFileEngine implements StorageEngine {
  private lastState: AppState | null = null;

  async init(): Promise<void> {
    // No setup needed
  }

  async load(): Promise<AppState> {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) {
        this.lastState = getDefaultState();
        return this.lastState;
      }
      const data = await res.json();
      if (!data.version) {
        this.lastState = getDefaultState();
        return this.lastState;
      }
      const migrated = migrateIfNeeded(data);
      this.lastState = toAppState(migrated);
      return this.lastState;
    } catch {
      this.lastState = getDefaultState();
      return this.lastState;
    }
  }

  async save(state: AppState): Promise<void> {
    const data = toPersistedData(state);
    await fetch('/api/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data, null, 2),
    });
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
    return 'file-system';
  }
}

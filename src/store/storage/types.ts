import type { AppState } from '@/types';

export type StorageEngineType = 'file-system' | 'local-storage';

export interface StorageEngine {
  init(): Promise<void>;
  load(): Promise<AppState>;
  save(state: AppState): Promise<void>;
  exportToFile(): Promise<void>;
  importFromFile(file: File): Promise<AppState>;
  getEngineType(): StorageEngineType;
}

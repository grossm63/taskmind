import type { StorageEngine } from './types';
import { FileSystemEngine } from './FileSystemEngine';
import { LocalStorageEngine } from './LocalStorageEngine';

export type { StorageEngine, StorageEngineType } from './types';
export { FileSystemEngine } from './FileSystemEngine';
export { LocalStorageEngine } from './LocalStorageEngine';

export function supportsFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window;
}

export function createStorageEngine(): StorageEngine {
  if (supportsFileSystemAccess()) {
    return new FileSystemEngine();
  }
  return new LocalStorageEngine();
}

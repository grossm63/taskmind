import { describe, it, expect, vi } from 'vitest';
import { supportsFileSystemAccess, createStorageEngine } from '../index';
import { FileSystemEngine } from '../FileSystemEngine';
import { LocalStorageEngine } from '../LocalStorageEngine';

describe('storage auto-detection', () => {
  describe('supportsFileSystemAccess', () => {
    it('returns true when showSaveFilePicker is available', () => {
      Object.defineProperty(window, 'showSaveFilePicker', { value: vi.fn(), configurable: true });
      expect(supportsFileSystemAccess()).toBe(true);
    });

    it('returns false when showSaveFilePicker is not available', () => {
      const original = Object.getOwnPropertyDescriptor(window, 'showSaveFilePicker');
      delete (window as any).showSaveFilePicker;
      expect(supportsFileSystemAccess()).toBe(false);
      if (original) Object.defineProperty(window, 'showSaveFilePicker', original);
    });
  });

  describe('createStorageEngine', () => {
    it('creates FileSystemEngine when API is available', () => {
      Object.defineProperty(window, 'showSaveFilePicker', { value: vi.fn(), configurable: true });
      const engine = createStorageEngine();
      expect(engine).toBeInstanceOf(FileSystemEngine);
    });

    it('creates LocalStorageEngine as fallback', () => {
      const original = Object.getOwnPropertyDescriptor(window, 'showSaveFilePicker');
      delete (window as any).showSaveFilePicker;
      const engine = createStorageEngine();
      expect(engine).toBeInstanceOf(LocalStorageEngine);
      if (original) Object.defineProperty(window, 'showSaveFilePicker', original);
    });
  });
});

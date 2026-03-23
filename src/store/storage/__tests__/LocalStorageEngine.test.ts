import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalStorageEngine } from '../LocalStorageEngine';
import { CURRENT_VERSION } from '../migration';
import type { PersistedData } from '@/types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock URL.createObjectURL / revokeObjectURL
globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
globalThis.URL.revokeObjectURL = vi.fn();

describe('LocalStorageEngine', () => {
  let engine: LocalStorageEngine;

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    engine = new LocalStorageEngine();
  });

  it('returns engine type "local-storage"', () => {
    expect(engine.getEngineType()).toBe('local-storage');
  });

  describe('init', () => {
    it('initializes without error', async () => {
      await expect(engine.init()).resolves.toBeUndefined();
    });
  });

  describe('load', () => {
    it('returns default state when localStorage is empty', async () => {
      const state = await engine.load();
      expect(state.tasks).toEqual([]);
      expect(state.categories).toHaveLength(5); // 5 default categories
      expect(state.settings.theme).toBe('light');
    });

    it('loads and parses existing data', async () => {
      const data: PersistedData = {
        version: CURRENT_VERSION,
        lastModified: '2026-01-01T00:00:00.000Z',
        tasks: [{ id: 't1', title: 'Saved task' } as any],
        categories: [],
        settings: { theme: 'dark', voiceOutputEnabled: false, apiKey: '' },
        chatHistory: [],
      };
      localStorageMock.setItem('taskmind-data', JSON.stringify(data));
      const state = await engine.load();
      expect(state.tasks).toHaveLength(1);
      expect(state.tasks[0].title).toBe('Saved task');
    });

    it('returns default state on malformed JSON', async () => {
      localStorageMock.setItem('taskmind-data', 'not-json!!!');
      const state = await engine.load();
      expect(state.tasks).toEqual([]);
      expect(state.categories).toHaveLength(5);
    });
  });

  describe('save', () => {
    it('saves state to localStorage', async () => {
      const state = {
        tasks: [{ id: 't1', title: 'Test' } as any],
        categories: [],
        settings: { theme: 'light' as const, voiceOutputEnabled: false, apiKey: '' },
        chatHistory: [],
      };
      await engine.save(state);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'taskmind-data',
        expect.stringContaining('"version"')
      );
      const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(saved.version).toBe(CURRENT_VERSION);
      expect(saved.tasks).toHaveLength(1);
    });
  });

  describe('importFromFile', () => {
    it('imports data from a File object', async () => {
      const data: PersistedData = {
        version: 1,
        lastModified: '2026-01-01T00:00:00.000Z',
        tasks: [{ id: 'imported', title: 'Imported task' } as any],
        categories: [],
        settings: { theme: 'dark', voiceOutputEnabled: false, apiKey: '' },
        chatHistory: [],
      };
      const file = new File([JSON.stringify(data)], 'import.json', { type: 'application/json' });
      const state = await engine.importFromFile(file);
      expect(state.tasks).toHaveLength(1);
      expect(state.tasks[0].id).toBe('imported');
    });

    it('throws on invalid JSON file', async () => {
      const file = new File(['bad json'], 'import.json');
      await expect(engine.importFromFile(file)).rejects.toThrow();
    });
  });

  describe('exportToFile', () => {
    it('does nothing if no state has been loaded', async () => {
      await engine.exportToFile();
      expect(URL.createObjectURL).not.toHaveBeenCalled();
    });

    it('creates a download link after loading state', async () => {
      const clickSpy = vi.fn();
      vi.spyOn(document, 'createElement').mockReturnValue({ click: clickSpy, href: '', download: '' } as any);

      await engine.load(); // sets lastState
      await engine.exportToFile();
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
    });
  });
});

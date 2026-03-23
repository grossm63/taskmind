import { describe, it, expect } from 'vitest';
import { migrateIfNeeded, toPersistedData, toAppState, CURRENT_VERSION } from '../migration';
import { getDefaultState } from '../../defaults';
import type { PersistedData } from '@/types';

describe('migration', () => {
  describe('migrateIfNeeded', () => {
    it('sets version to CURRENT_VERSION if missing', () => {
      const data = { tasks: [], categories: [], settings: {}, chatHistory: [] } as unknown as PersistedData;
      const result = migrateIfNeeded(data);
      expect(result.version).toBe(CURRENT_VERSION);
    });

    it('preserves valid data through migration', () => {
      const data: PersistedData = {
        version: 1,
        lastModified: '2026-01-01T00:00:00.000Z',
        tasks: [{ id: 't1', title: 'Test' } as any],
        categories: [],
        settings: { theme: 'dark', voiceOutputEnabled: false, apiKey: '' },
        chatHistory: [],
      };
      const result = migrateIfNeeded(data);
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].title).toBe('Test');
    });
  });

  describe('toPersistedData', () => {
    it('converts AppState to PersistedData with version and lastModified', () => {
      const state = getDefaultState();
      const result = toPersistedData(state);
      expect(result.version).toBe(CURRENT_VERSION);
      expect(result.lastModified).toBeDefined();
      expect(result.tasks).toEqual(state.tasks);
      expect(result.categories).toEqual(state.categories);
    });

    it('limits chatHistory to last 50 messages', () => {
      const state = getDefaultState();
      state.chatHistory = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        role: 'user' as const,
        content: `Message ${i}`,
        actions: [],
        timestamp: new Date().toISOString(),
      }));
      const result = toPersistedData(state);
      expect(result.chatHistory).toHaveLength(50);
      expect(result.chatHistory[0].id).toBe('msg-50');
    });
  });

  describe('toAppState', () => {
    it('converts PersistedData to AppState', () => {
      const data: PersistedData = {
        version: 1,
        lastModified: '2026-01-01T00:00:00.000Z',
        tasks: [],
        categories: [{ id: 'c1', name: 'Work', color: '#000', icon: '💼', sortOrder: 0 }],
        settings: { theme: 'dark', voiceOutputEnabled: true, apiKey: 'key' },
        chatHistory: [],
      };
      const state = toAppState(data);
      expect(state.categories).toHaveLength(1);
      expect(state.settings.theme).toBe('dark');
    });

    it('provides defaults for missing fields', () => {
      const data = { version: 1, lastModified: '' } as unknown as PersistedData;
      const state = toAppState(data);
      expect(state.tasks).toEqual([]);
      expect(state.categories).toEqual([]);
      expect(state.settings.theme).toBe('light');
    });
  });
});

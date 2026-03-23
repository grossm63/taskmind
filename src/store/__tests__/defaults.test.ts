import { describe, it, expect } from 'vitest';
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, getDefaultState } from '../defaults';

describe('defaults', () => {
  describe('DEFAULT_CATEGORIES', () => {
    it('has exactly 5 categories', () => {
      expect(DEFAULT_CATEGORIES).toHaveLength(5);
    });

    it('includes Inbox as first category', () => {
      expect(DEFAULT_CATEGORIES[0].name).toBe('Inbox');
      expect(DEFAULT_CATEGORIES[0].id).toBe('cat-inbox');
      expect(DEFAULT_CATEGORIES[0].sortOrder).toBe(0);
    });

    it('includes Work, Personal, Health, Finance', () => {
      const names = DEFAULT_CATEGORIES.map(c => c.name);
      expect(names).toContain('Work');
      expect(names).toContain('Personal');
      expect(names).toContain('Health');
      expect(names).toContain('Finance');
    });

    it('all categories have required fields', () => {
      for (const cat of DEFAULT_CATEGORIES) {
        expect(cat.id).toBeTruthy();
        expect(cat.name).toBeTruthy();
        expect(cat.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(cat.icon).toBeTruthy();
        expect(typeof cat.sortOrder).toBe('number');
      }
    });

    it('all categories have unique IDs', () => {
      const ids = DEFAULT_CATEGORIES.map(c => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('DEFAULT_SETTINGS', () => {
    it('defaults to light theme', () => {
      expect(DEFAULT_SETTINGS.theme).toBe('light');
    });

    it('defaults to voice output disabled', () => {
      expect(DEFAULT_SETTINGS.voiceOutputEnabled).toBe(false);
    });

    it('defaults to empty API key', () => {
      expect(DEFAULT_SETTINGS.apiKey).toBe('');
    });
  });

  describe('getDefaultState', () => {
    it('returns a fresh state with defaults', () => {
      const state = getDefaultState();
      expect(state.tasks).toEqual([]);
      expect(state.categories).toEqual(DEFAULT_CATEGORIES);
      expect(state.settings).toEqual(DEFAULT_SETTINGS);
      expect(state.chatHistory).toEqual([]);
    });

    it('returns a new object each time (not shared reference)', () => {
      const a = getDefaultState();
      const b = getDefaultState();
      expect(a).not.toBe(b);
      expect(a.categories).not.toBe(b.categories);
      expect(a.settings).not.toBe(b.settings);
    });
  });
});

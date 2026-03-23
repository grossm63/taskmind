import type { PersistedData } from '@/types';

export const CURRENT_VERSION = 1;

export function migrateIfNeeded(data: PersistedData): PersistedData {
  let migrated = { ...data };

  if (!migrated.version) {
    migrated.version = 1;
  }

  // Future migrations go here:
  // if (migrated.version === 1) { migrated = migrateV1ToV2(migrated); }

  migrated.version = CURRENT_VERSION;
  return migrated;
}

export function toPersistedData(state: import('@/types').AppState): PersistedData {
  return {
    version: CURRENT_VERSION,
    lastModified: new Date().toISOString(),
    tasks: state.tasks,
    categories: state.categories,
    settings: state.settings,
    chatHistory: state.chatHistory.slice(-50),
  };
}

export function toAppState(data: PersistedData): import('@/types').AppState {
  return {
    tasks: data.tasks ?? [],
    categories: data.categories ?? [],
    settings: data.settings ?? { theme: 'light', voiceOutputEnabled: false, apiKey: '' },
    chatHistory: data.chatHistory ?? [],
  };
}

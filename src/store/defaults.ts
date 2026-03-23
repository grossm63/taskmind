import type { AppState, Category, UserSettings } from '@/types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-inbox', name: 'Inbox', color: '#555555', icon: '\u{1F4E5}', sortOrder: 0 },
  { id: 'cat-work', name: 'Work', color: '#0055FF', icon: '\u{1F4BC}', sortOrder: 1 },
  { id: 'cat-personal', name: 'Personal', color: '#00AA22', icon: '\u{1F3E0}', sortOrder: 2 },
  { id: 'cat-health', name: 'Health', color: '#FF0000', icon: '\u{1F3CB}\uFE0F', sortOrder: 3 },
  { id: 'cat-finance', name: 'Finance', color: '#FF6600', icon: '\u{1F4B0}', sortOrder: 4 },
];

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'light',
  voiceOutputEnabled: false,
  apiKey: '',
};

export function getDefaultState(): AppState {
  return {
    tasks: [],
    categories: [...DEFAULT_CATEGORIES],
    settings: { ...DEFAULT_SETTINGS },
    chatHistory: [],
  };
}

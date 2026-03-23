// === Data Model Types ===

export interface Task {
  id: string;
  title: string;
  notes: string;
  priority: Priority;
  status: TaskStatus;
  category: string;
  tags: string[];
  deadline: string | null;
  deadlineType: DeadlineType;
  effort: number | null;
  actualEffort: number | null;
  energyType: EnergyType;
  parentId: string | null;
  dependencies: string[];
  recurrence: RecurrenceRule | null;
  snoozedUntil: string | null;
  createdAt: string;
  completedAt: string | null;
  updatedAt: string;
  sortOrder: number;
}

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'deferred' | 'snoozed';
export type DeadlineType = 'hard' | 'soft';
export type EnergyType = 'deep_focus' | 'routine' | 'quick_win';

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  voiceOutputEnabled: boolean;
  apiKey: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions: TaskAction[];
  timestamp: string;
}

export interface TaskAction {
  type: 'create' | 'update' | 'delete' | 'complete' | 'defer' | 'snooze' | 'decompose' | 'create_category';
  taskId?: string;
  data?: Partial<Task> & Partial<Category>;
  subtasks?: Partial<Task>[];
}

export interface AppState {
  tasks: Task[];
  categories: Category[];
  settings: UserSettings;
  chatHistory: ChatMessage[];
}

export interface PersistedData {
  version: number;
  lastModified: string;
  tasks: Task[];
  categories: Category[];
  settings: UserSettings;
  chatHistory: ChatMessage[];
}

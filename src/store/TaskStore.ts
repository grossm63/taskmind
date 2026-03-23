import { v4 as uuidv4 } from 'uuid';
import type { AppState, Task, Category, ChatMessage, TaskAction, UserSettings } from '@/types';
import { getDefaultState } from './defaults';

export type SaveStatus = 'saved' | 'saving' | 'unsaved';

type Listener = () => void;
type SaveStatusListener = (status: SaveStatus) => void;

export class TaskStore {
  private state: AppState;
  private listeners: Set<Listener> = new Set();
  private saveStatusListeners: Set<SaveStatusListener> = new Set();
  private undoStack: AppState[] = [];
  private saveStatus: SaveStatus = 'saved';
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private saveFn: ((state: AppState) => Promise<void>) | null = null;

  constructor(initialState?: AppState) {
    this.state = initialState ?? getDefaultState();
  }

  // --- State access ---

  getState(): AppState {
    return this.state;
  }

  getTasks(): Task[] {
    return this.state.tasks;
  }

  getCategories(): Category[] {
    return this.state.categories;
  }

  getSettings(): UserSettings {
    return this.state.settings;
  }

  getChatHistory(): ChatMessage[] {
    return this.state.chatHistory;
  }

  getSaveStatus(): SaveStatus {
    return this.saveStatus;
  }

  // --- Subscriptions ---

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onSaveStatus(listener: SaveStatusListener): () => void {
    this.saveStatusListeners.add(listener);
    return () => this.saveStatusListeners.delete(listener);
  }

  // --- Save wiring ---

  setSaveFn(fn: (state: AppState) => Promise<void>): void {
    this.saveFn = fn;
  }

  // --- Task CRUD ---

  createTask(partial: Partial<Task>): Task {
    const now = new Date().toISOString();
    const task: Task = {
      id: uuidv4(),
      title: partial.title ?? '',
      notes: partial.notes ?? '',
      priority: partial.priority ?? 'medium',
      status: partial.status ?? 'todo',
      category: partial.category ?? 'Inbox',
      tags: partial.tags ?? [],
      deadline: partial.deadline ?? null,
      deadlineType: partial.deadlineType ?? 'soft',
      effort: partial.effort ?? null,
      actualEffort: partial.actualEffort ?? null,
      energyType: partial.energyType ?? 'routine',
      parentId: partial.parentId ?? null,
      dependencies: partial.dependencies ?? [],
      recurrence: partial.recurrence ?? null,
      snoozedUntil: partial.snoozedUntil ?? null,
      createdAt: partial.createdAt ?? now,
      completedAt: partial.completedAt ?? null,
      updatedAt: now,
      sortOrder: partial.sortOrder ?? this.state.tasks.length,
    };
    this.pushUndo();
    this.state = { ...this.state, tasks: [...this.state.tasks, task] };
    this.notify();
    return task;
  }

  updateTask(taskId: string, changes: Partial<Task>): Task | null {
    const index = this.state.tasks.findIndex(t => t.id === taskId);
    if (index === -1) return null;
    this.pushUndo();
    const updated = {
      ...this.state.tasks[index],
      ...changes,
      updatedAt: new Date().toISOString(),
    };
    const tasks = [...this.state.tasks];
    tasks[index] = updated;
    this.state = { ...this.state, tasks };
    this.notify();
    return updated;
  }

  deleteTask(taskId: string): boolean {
    const index = this.state.tasks.findIndex(t => t.id === taskId);
    if (index === -1) return false;
    this.pushUndo();
    this.state = {
      ...this.state,
      tasks: this.state.tasks.filter(t => t.id !== taskId),
    };
    this.notify();
    return true;
  }

  completeTask(taskId: string, actualEffort?: number): Task | null {
    const task = this.state.tasks.find(t => t.id === taskId);
    const result = this.updateTask(taskId, {
      status: 'done',
      completedAt: new Date().toISOString(),
      actualEffort: actualEffort ?? null,
    });

    // Handle recurrence — create next instance
    if (task?.recurrence) {
      const nextDeadline = this.computeNextRecurrence(task.deadline, task.recurrence);
      this.createTask({
        title: task.title,
        notes: task.notes,
        priority: task.priority,
        category: task.category,
        tags: [...task.tags],
        deadline: nextDeadline,
        deadlineType: task.deadlineType,
        effort: task.effort,
        energyType: task.energyType,
        recurrence: { ...task.recurrence },
      });
    }

    return result;
  }

  private computeNextRecurrence(currentDeadline: string | null, recurrence: import('@/types').RecurrenceRule): string {
    if (!currentDeadline) {
      const now = new Date();
      currentDeadline = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    // Parse as plain date parts to avoid timezone issues
    const [year, month, day] = currentDeadline.split('-').map(Number);
    const base = new Date(year, month - 1, day);
    const interval = recurrence.interval || 1;

    switch (recurrence.frequency) {
      case 'daily':
        base.setDate(base.getDate() + interval);
        break;
      case 'weekly':
        base.setDate(base.getDate() + 7 * interval);
        break;
      case 'monthly':
        base.setMonth(base.getMonth() + interval);
        break;
    }

    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, '0');
    const d = String(base.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  snoozeTask(taskId: string, until: string): Task | null {
    return this.updateTask(taskId, {
      status: 'snoozed',
      snoozedUntil: until,
    });
  }

  deferTask(taskId: string, newDeadline: string): Task | null {
    return this.updateTask(taskId, {
      deadline: newDeadline,
      status: 'todo',
    });
  }

  decomposeTask(taskId: string, subtaskPartials: Partial<Task>[]): Task[] {
    this.pushUndo();
    const subtasks: Task[] = [];
    const parent = this.state.tasks.find(t => t.id === taskId);
    const now = new Date().toISOString();

    for (const partial of subtaskPartials) {
      const subtask: Task = {
        id: uuidv4(),
        title: partial.title ?? '',
        notes: partial.notes ?? '',
        priority: partial.priority ?? parent?.priority ?? 'medium',
        status: partial.status ?? 'todo',
        category: partial.category ?? parent?.category ?? 'Inbox',
        tags: partial.tags ?? parent?.tags ?? [],
        deadline: partial.deadline ?? parent?.deadline ?? null,
        deadlineType: partial.deadlineType ?? parent?.deadlineType ?? 'soft',
        effort: partial.effort ?? null,
        actualEffort: null,
        energyType: partial.energyType ?? 'routine',
        parentId: taskId,
        dependencies: partial.dependencies ?? [],
        recurrence: null,
        snoozedUntil: null,
        createdAt: now,
        completedAt: null,
        updatedAt: now,
        sortOrder: this.state.tasks.length + subtasks.length,
      };
      subtasks.push(subtask);
    }

    this.state = { ...this.state, tasks: [...this.state.tasks, ...subtasks] };
    this.notify();
    return subtasks;
  }

  getTaskById(taskId: string): Task | null {
    return this.state.tasks.find(t => t.id === taskId) ?? null;
  }

  getSubtasks(parentId: string): Task[] {
    return this.state.tasks.filter(t => t.parentId === parentId);
  }

  // --- Category CRUD ---

  createCategory(partial: Partial<Category>): Category {
    const category: Category = {
      id: partial.id ?? uuidv4(),
      name: partial.name ?? 'New Category',
      color: partial.color ?? '#6B6B6B',
      icon: partial.icon ?? '\u{1F4C1}',
      sortOrder: partial.sortOrder ?? this.state.categories.length,
    };
    this.pushUndo();
    this.state = { ...this.state, categories: [...this.state.categories, category] };
    this.notify();
    return category;
  }

  updateCategory(categoryId: string, changes: Partial<Category>): Category | null {
    const index = this.state.categories.findIndex(c => c.id === categoryId);
    if (index === -1) return null;
    this.pushUndo();
    const updated = { ...this.state.categories[index], ...changes };
    const categories = [...this.state.categories];
    categories[index] = updated;
    this.state = { ...this.state, categories };
    this.notify();
    return updated;
  }

  deleteCategory(categoryId: string): boolean {
    if (categoryId === 'cat-inbox') return false; // Cannot delete Inbox
    const index = this.state.categories.findIndex(c => c.id === categoryId);
    if (index === -1) return false;
    const catName = this.state.categories[index].name;
    this.pushUndo();
    // Move tasks in this category to Inbox
    const tasks = this.state.tasks.map(t =>
      t.category === catName ? { ...t, category: 'Inbox', updatedAt: new Date().toISOString() } : t
    );
    this.state = {
      ...this.state,
      tasks,
      categories: this.state.categories.filter(c => c.id !== categoryId),
    };
    this.notify();
    return true;
  }

  // --- Chat ---

  addChatMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const chatMessage: ChatMessage = {
      ...message,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    };
    this.state = {
      ...this.state,
      chatHistory: [...this.state.chatHistory, chatMessage],
    };
    this.notify();
    return chatMessage;
  }

  // --- Settings ---

  updateSettings(changes: Partial<UserSettings>): void {
    this.pushUndo();
    this.state = {
      ...this.state,
      settings: { ...this.state.settings, ...changes },
    };
    this.notify();
  }

  // --- Action Execution (from AI responses) ---

  executeAction(action: TaskAction): void {
    switch (action.type) {
      case 'create':
        if (action.data) this.createTask(action.data as Partial<Task>);
        break;
      case 'update':
        if (action.taskId && action.data) this.updateTask(action.taskId, action.data as Partial<Task>);
        break;
      case 'delete':
        if (action.taskId) this.deleteTask(action.taskId);
        break;
      case 'complete':
        if (action.taskId) this.completeTask(action.taskId, action.data?.actualEffort ?? undefined);
        break;
      case 'defer':
        if (action.taskId && action.data?.deadline) this.deferTask(action.taskId, action.data.deadline);
        break;
      case 'snooze':
        if (action.taskId && action.data?.snoozedUntil) this.snoozeTask(action.taskId, action.data.snoozedUntil);
        break;
      case 'decompose':
        if (action.taskId && action.subtasks) this.decomposeTask(action.taskId, action.subtasks);
        break;
      case 'create_category':
        if (action.data) this.createCategory(action.data as Partial<Category>);
        break;
    }
  }

  // --- Undo ---

  undo(): boolean {
    if (this.undoStack.length === 0) return false;
    this.state = this.undoStack.pop()!;
    this.notifyListeners();
    this.debouncedSave();
    return true;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  // --- State replacement (for import) ---

  replaceState(state: AppState): void {
    this.pushUndo();
    this.state = state;
    this.notify();
  }

  // --- Internals ---

  private pushUndo(): void {
    this.undoStack.push(structuredClone(this.state));
    if (this.undoStack.length > 10) {
      this.undoStack.shift();
    }
  }

  private notify(): void {
    this.notifyListeners();
    this.debouncedSave();
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private debouncedSave(): void {
    if (!this.saveFn) return;
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.setSaveStatus('unsaved');
    this.saveTimeout = setTimeout(() => {
      this.performSave();
    }, 1000);
  }

  async forceSave(): Promise<void> {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    await this.performSave();
  }

  private async performSave(): Promise<void> {
    if (!this.saveFn) return;
    this.setSaveStatus('saving');
    try {
      await this.saveFn(this.state);
      this.setSaveStatus('saved');
    } catch {
      this.setSaveStatus('unsaved');
    }
  }

  private setSaveStatus(status: SaveStatus): void {
    this.saveStatus = status;
    for (const listener of this.saveStatusListeners) {
      listener(status);
    }
  }
}

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskStore } from '../TaskStore';
import { getDefaultState } from '../defaults';
import type { AppState, Task } from '@/types';

describe('TaskStore', () => {
  let store: TaskStore;

  beforeEach(() => {
    store = new TaskStore();
  });

  // --- Initialization ---

  describe('constructor', () => {
    it('initializes with default state', () => {
      const state = store.getState();
      expect(state.tasks).toEqual([]);
      expect(state.categories).toHaveLength(5);
      expect(state.settings.theme).toBe('light');
    });

    it('accepts initial state', () => {
      const custom: AppState = {
        ...getDefaultState(),
        tasks: [{ id: 'x', title: 'Existing' } as Task],
      };
      const s = new TaskStore(custom);
      expect(s.getTasks()).toHaveLength(1);
    });
  });

  // --- Task CRUD ---

  describe('createTask', () => {
    it('creates a task with defaults', () => {
      const task = store.createTask({ title: 'Buy milk' });
      expect(task.id).toBeDefined();
      expect(task.title).toBe('Buy milk');
      expect(task.priority).toBe('medium');
      expect(task.status).toBe('todo');
      expect(task.category).toBe('Inbox');
      expect(task.tags).toEqual([]);
      expect(task.deadline).toBeNull();
      expect(task.effort).toBeNull();
      expect(task.createdAt).toBeDefined();
      expect(store.getTasks()).toHaveLength(1);
    });

    it('applies provided fields', () => {
      const task = store.createTask({
        title: 'Report',
        priority: 'critical',
        category: 'Work',
        effort: 120,
        energyType: 'deep_focus',
        deadline: '2026-04-01',
        deadlineType: 'hard',
        tags: ['q1'],
      });
      expect(task.priority).toBe('critical');
      expect(task.category).toBe('Work');
      expect(task.effort).toBe(120);
      expect(task.energyType).toBe('deep_focus');
      expect(task.deadline).toBe('2026-04-01');
      expect(task.deadlineType).toBe('hard');
      expect(task.tags).toEqual(['q1']);
    });

    it('assigns incrementing sortOrder', () => {
      const t1 = store.createTask({ title: 'A' });
      const t2 = store.createTask({ title: 'B' });
      expect(t1.sortOrder).toBe(0);
      expect(t2.sortOrder).toBe(1);
    });
  });

  describe('updateTask', () => {
    it('updates task fields', () => {
      const task = store.createTask({ title: 'Old' });
      const updated = store.updateTask(task.id, { title: 'New', priority: 'high' });
      expect(updated?.title).toBe('New');
      expect(updated?.priority).toBe('high');
      expect(updated?.updatedAt).toBeDefined();
    });

    it('returns null for non-existent task', () => {
      expect(store.updateTask('nope', { title: 'X' })).toBeNull();
    });

    it('does not mutate other tasks', () => {
      const t1 = store.createTask({ title: 'A' });
      store.createTask({ title: 'B' });
      store.updateTask(t1.id, { title: 'A2' });
      expect(store.getTasks()[1].title).toBe('B');
    });
  });

  describe('deleteTask', () => {
    it('removes a task', () => {
      const task = store.createTask({ title: 'Delete me' });
      expect(store.deleteTask(task.id)).toBe(true);
      expect(store.getTasks()).toHaveLength(0);
    });

    it('returns false for non-existent task', () => {
      expect(store.deleteTask('nope')).toBe(false);
    });
  });

  describe('completeTask', () => {
    it('marks task as done with completedAt', () => {
      const task = store.createTask({ title: 'Finish me' });
      const done = store.completeTask(task.id);
      expect(done?.status).toBe('done');
      expect(done?.completedAt).toBeDefined();
    });

    it('records actualEffort', () => {
      const task = store.createTask({ title: 'Timed task', effort: 60 });
      const done = store.completeTask(task.id, 90);
      expect(done?.actualEffort).toBe(90);
    });
  });

  describe('snoozeTask', () => {
    it('sets status to snoozed with snoozedUntil date', () => {
      const task = store.createTask({ title: 'Later' });
      const snoozed = store.snoozeTask(task.id, '2026-04-01');
      expect(snoozed?.status).toBe('snoozed');
      expect(snoozed?.snoozedUntil).toBe('2026-04-01');
    });
  });

  describe('deferTask', () => {
    it('updates deadline and resets status to todo', () => {
      const task = store.createTask({ title: 'Push it', status: 'deferred' });
      const deferred = store.deferTask(task.id, '2026-05-01');
      expect(deferred?.deadline).toBe('2026-05-01');
      expect(deferred?.status).toBe('todo');
    });
  });

  describe('decomposeTask', () => {
    it('creates subtasks linked to parent', () => {
      const parent = store.createTask({ title: 'Big project', category: 'Work', priority: 'high' });
      const subtasks = store.decomposeTask(parent.id, [
        { title: 'Step 1', effort: 30 },
        { title: 'Step 2', effort: 60 },
      ]);
      expect(subtasks).toHaveLength(2);
      expect(subtasks[0].parentId).toBe(parent.id);
      expect(subtasks[1].parentId).toBe(parent.id);
      expect(subtasks[0].category).toBe('Work'); // Inherited
      expect(subtasks[0].priority).toBe('high'); // Inherited
      expect(store.getTasks()).toHaveLength(3); // parent + 2 subtasks
    });
  });

  describe('getTaskById', () => {
    it('returns the task', () => {
      const task = store.createTask({ title: 'Find me' });
      expect(store.getTaskById(task.id)?.title).toBe('Find me');
    });

    it('returns null for missing ID', () => {
      expect(store.getTaskById('nope')).toBeNull();
    });
  });

  describe('getSubtasks', () => {
    it('returns subtasks of a parent', () => {
      const parent = store.createTask({ title: 'Parent' });
      store.decomposeTask(parent.id, [{ title: 'Child 1' }, { title: 'Child 2' }]);
      const subtasks = store.getSubtasks(parent.id);
      expect(subtasks).toHaveLength(2);
    });

    it('returns empty array for task with no subtasks', () => {
      const task = store.createTask({ title: 'Leaf' });
      expect(store.getSubtasks(task.id)).toEqual([]);
    });
  });

  // --- Category CRUD ---

  describe('createCategory', () => {
    it('creates a category', () => {
      const cat = store.createCategory({ name: 'Renovation', color: '#FF0000', icon: '🔨' });
      expect(cat.name).toBe('Renovation');
      expect(store.getCategories()).toHaveLength(6); // 5 default + 1
    });
  });

  describe('updateCategory', () => {
    it('updates category fields', () => {
      const updated = store.updateCategory('cat-work', { name: 'Office' });
      expect(updated?.name).toBe('Office');
    });

    it('returns null for non-existent category', () => {
      expect(store.updateCategory('nope', { name: 'X' })).toBeNull();
    });
  });

  describe('deleteCategory', () => {
    it('deletes a category and moves its tasks to Inbox', () => {
      store.createTask({ title: 'Work task', category: 'Work' });
      expect(store.deleteCategory('cat-work')).toBe(true);
      expect(store.getCategories().find(c => c.id === 'cat-work')).toBeUndefined();
      expect(store.getTasks()[0].category).toBe('Inbox');
    });

    it('cannot delete Inbox', () => {
      expect(store.deleteCategory('cat-inbox')).toBe(false);
    });

    it('returns false for non-existent category', () => {
      expect(store.deleteCategory('nope')).toBe(false);
    });
  });

  // --- Chat ---

  describe('addChatMessage', () => {
    it('adds a message with generated id and timestamp', () => {
      const msg = store.addChatMessage({ role: 'user', content: 'Hello', actions: [] });
      expect(msg.id).toBeDefined();
      expect(msg.timestamp).toBeDefined();
      expect(store.getChatHistory()).toHaveLength(1);
    });
  });

  // --- Settings ---

  describe('updateSettings', () => {
    it('merges setting changes', () => {
      store.updateSettings({ theme: 'dark' });
      expect(store.getSettings().theme).toBe('dark');
      expect(store.getSettings().voiceOutputEnabled).toBe(false); // Unchanged
    });
  });

  // --- Undo ---

  describe('undo', () => {
    it('reverts the last operation', () => {
      store.createTask({ title: 'Keep' });
      store.createTask({ title: 'Undo this' });
      expect(store.getTasks()).toHaveLength(2);
      expect(store.undo()).toBe(true);
      expect(store.getTasks()).toHaveLength(1);
      expect(store.getTasks()[0].title).toBe('Keep');
    });

    it('returns false when stack is empty', () => {
      expect(store.undo()).toBe(false);
    });

    it('limits undo stack to 10 entries', () => {
      for (let i = 0; i < 15; i++) {
        store.createTask({ title: `Task ${i}` });
      }
      // Should be able to undo at most 10 times
      let undoCount = 0;
      while (store.undo()) undoCount++;
      expect(undoCount).toBe(10);
    });

    it('canUndo returns correct state', () => {
      expect(store.canUndo()).toBe(false);
      store.createTask({ title: 'A' });
      expect(store.canUndo()).toBe(true);
    });
  });

  // --- Action Execution ---

  describe('executeAction', () => {
    it('executes create action', () => {
      store.executeAction({ type: 'create', data: { title: 'From AI' } });
      expect(store.getTasks()).toHaveLength(1);
      expect(store.getTasks()[0].title).toBe('From AI');
    });

    it('executes update action', () => {
      const task = store.createTask({ title: 'Original' });
      store.executeAction({ type: 'update', taskId: task.id, data: { title: 'Updated' } });
      expect(store.getTaskById(task.id)?.title).toBe('Updated');
    });

    it('executes delete action', () => {
      const task = store.createTask({ title: 'Bye' });
      store.executeAction({ type: 'delete', taskId: task.id });
      expect(store.getTasks()).toHaveLength(0);
    });

    it('executes complete action', () => {
      const task = store.createTask({ title: 'Done' });
      store.executeAction({ type: 'complete', taskId: task.id, data: { actualEffort: 45 } });
      expect(store.getTaskById(task.id)?.status).toBe('done');
      expect(store.getTaskById(task.id)?.actualEffort).toBe(45);
    });

    it('executes defer action', () => {
      const task = store.createTask({ title: 'Defer me' });
      store.executeAction({ type: 'defer', taskId: task.id, data: { deadline: '2026-06-01' } });
      expect(store.getTaskById(task.id)?.deadline).toBe('2026-06-01');
    });

    it('executes snooze action', () => {
      const task = store.createTask({ title: 'Snooze me' });
      store.executeAction({ type: 'snooze', taskId: task.id, data: { snoozedUntil: '2026-04-15' } });
      expect(store.getTaskById(task.id)?.status).toBe('snoozed');
    });

    it('executes decompose action', () => {
      const task = store.createTask({ title: 'Big one' });
      store.executeAction({
        type: 'decompose',
        taskId: task.id,
        subtasks: [{ title: 'Part 1' }, { title: 'Part 2' }],
      });
      expect(store.getSubtasks(task.id)).toHaveLength(2);
    });

    it('executes create_category action', () => {
      store.executeAction({
        type: 'create_category',
        data: { name: 'AI Created', color: '#123456', icon: '🤖' },
      });
      expect(store.getCategories().find(c => c.name === 'AI Created')).toBeDefined();
    });
  });

  // --- Subscriptions ---

  describe('subscribe', () => {
    it('notifies listeners on state change', () => {
      const listener = vi.fn();
      store.subscribe(listener);
      store.createTask({ title: 'Trigger' });
      expect(listener).toHaveBeenCalled();
    });

    it('unsubscribe stops notifications', () => {
      const listener = vi.fn();
      const unsub = store.subscribe(listener);
      unsub();
      store.createTask({ title: 'No trigger' });
      expect(listener).not.toHaveBeenCalled();
    });
  });

  // --- Save status ---

  describe('save status', () => {
    it('starts as saved', () => {
      expect(store.getSaveStatus()).toBe('saved');
    });

    it('transitions to unsaved on change when saveFn is set', () => {
      store.setSaveFn(vi.fn());
      const statusListener = vi.fn();
      store.onSaveStatus(statusListener);
      store.createTask({ title: 'Trigger save' });
      expect(statusListener).toHaveBeenCalledWith('unsaved');
    });

    it('transitions to saving then saved on debounce completion', async () => {
      const saveFn = vi.fn().mockResolvedValue(undefined);
      store.setSaveFn(saveFn);
      store.createTask({ title: 'Trigger' });
      // Force save instead of waiting for debounce
      await store.forceSave();
      expect(saveFn).toHaveBeenCalled();
      expect(store.getSaveStatus()).toBe('saved');
    });

    it('sets unsaved on save failure', async () => {
      const saveFn = vi.fn().mockRejectedValue(new Error('fail'));
      store.setSaveFn(saveFn);
      store.createTask({ title: 'Trigger' });
      await store.forceSave();
      expect(store.getSaveStatus()).toBe('unsaved');
    });
  });

  // --- Replace state (import) ---

  describe('replaceState', () => {
    it('replaces entire state', () => {
      store.createTask({ title: 'Old' });
      const newState: AppState = {
        ...getDefaultState(),
        tasks: [{ id: 'imported', title: 'Imported' } as Task],
      };
      store.replaceState(newState);
      expect(store.getTasks()).toHaveLength(1);
      expect(store.getTasks()[0].title).toBe('Imported');
    });

    it('is undoable', () => {
      store.createTask({ title: 'Original' });
      store.replaceState({ ...getDefaultState(), tasks: [] });
      expect(store.getTasks()).toHaveLength(0);
      store.undo();
      expect(store.getTasks()).toHaveLength(1);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { TaskStore } from '@/store/TaskStore';
import { getDefaultState } from '@/store/defaults';
import { scoreTask, getTopTasks } from '@/engine/priority';
import { parseAIResponse } from '@/engine/ai';

describe('Integration: End-to-end task management flows', () => {
  it('creates tasks via AI action, scores them, and recommends the right one', () => {
    const store = new TaskStore();

    // Simulate AI creating tasks
    const aiResponse = parseAIResponse(JSON.stringify({
      message: 'Added your tasks!',
      actions: [
        { type: 'create', data: { title: 'Buy groceries', priority: 'low', deadline: '2026-03-25', effort: 45, energyType: 'routine' } },
        { type: 'create', data: { title: 'Board presentation', priority: 'critical', deadline: '2026-03-22', effort: 120, energyType: 'deep_focus' } },
        { type: 'create', data: { title: 'Reply to email', priority: 'medium', effort: 10, energyType: 'quick_win' } },
      ],
    }));

    for (const action of aiResponse.actions) {
      store.executeAction(action);
    }

    expect(store.getTasks()).toHaveLength(3);

    // Priority scoring should rank critical + soon deadline highest
    const top = getTopTasks(store.getTasks(), 1);
    expect(top[0].title).toBe('Board presentation');
  });

  it('completes a recurring task and creates the next instance', () => {
    const store = new TaskStore();
    const task = store.createTask({
      title: 'Weekly standup',
      deadline: '2026-03-21',
      recurrence: { frequency: 'weekly', interval: 1 },
      category: 'Work',
      priority: 'high',
    });

    store.completeTask(task.id);
    const tasks = store.getTasks();
    expect(tasks).toHaveLength(2);

    const completed = tasks.find(t => t.status === 'done')!;
    const next = tasks.find(t => t.status === 'todo')!;
    expect(completed.title).toBe('Weekly standup');
    expect(next.title).toBe('Weekly standup');
    expect(next.deadline).toBe('2026-03-28');
    expect(next.category).toBe('Work');
    expect(next.priority).toBe('high');
  });

  it('decomposes a task and tracks subtask progress', () => {
    const store = new TaskStore();
    const parent = store.createTask({ title: 'Website redesign', effort: 1200, category: 'Work' });
    const subtasks = store.decomposeTask(parent.id, [
      { title: 'Wireframes', effort: 180 },
      { title: 'Visual design', effort: 360 },
      { title: 'Implementation', effort: 600 },
    ]);

    expect(subtasks).toHaveLength(3);
    expect(store.getSubtasks(parent.id)).toHaveLength(3);

    // Complete first subtask
    store.completeTask(subtasks[0].id);
    const completed = store.getSubtasks(parent.id).filter(t => t.status === 'done');
    expect(completed).toHaveLength(1);
  });

  it('undo reverses multiple operations correctly', () => {
    const store = new TaskStore();
    store.createTask({ title: 'Task A' });
    store.createTask({ title: 'Task B' });
    store.createTask({ title: 'Task C' });

    expect(store.getTasks()).toHaveLength(3);
    store.undo(); // Remove Task C
    expect(store.getTasks()).toHaveLength(2);
    store.undo(); // Remove Task B
    expect(store.getTasks()).toHaveLength(1);
    expect(store.getTasks()[0].title).toBe('Task A');
  });

  it('deleting a category moves tasks to Inbox', () => {
    const store = new TaskStore();
    store.createTask({ title: 'Work task 1', category: 'Work' });
    store.createTask({ title: 'Work task 2', category: 'Work' });
    store.createTask({ title: 'Personal task', category: 'Personal' });

    store.deleteCategory('cat-work');
    const tasks = store.getTasks();
    expect(tasks.filter(t => t.category === 'Inbox')).toHaveLength(2);
    expect(tasks.filter(t => t.category === 'Personal')).toHaveLength(1);
  });

  it('snooze hides task then restore maintains deadline', () => {
    const store = new TaskStore();
    const task = store.createTask({ title: 'Clean garage', deadline: '2026-04-01' });
    store.snoozeTask(task.id, '2026-03-28');

    const snoozed = store.getTaskById(task.id)!;
    expect(snoozed.status).toBe('snoozed');
    expect(snoozed.snoozedUntil).toBe('2026-03-28');
    expect(snoozed.deadline).toBe('2026-04-01'); // Deadline preserved

    // Unsnoozed (simulated by update)
    store.updateTask(task.id, { status: 'todo', snoozedUntil: null });
    const restored = store.getTaskById(task.id)!;
    expect(restored.status).toBe('todo');
    expect(restored.deadline).toBe('2026-04-01');
  });

  it('defer changes the deadline', () => {
    const store = new TaskStore();
    const task = store.createTask({ title: 'Tax filing', deadline: '2026-04-15' });
    store.deferTask(task.id, '2026-04-30');

    const deferred = store.getTaskById(task.id)!;
    expect(deferred.deadline).toBe('2026-04-30');
    expect(deferred.status).toBe('todo');
  });

  it('dependency blocking reduces priority score', () => {
    const store = new TaskStore();
    const dep = store.createTask({ title: 'Install dependencies', priority: 'high' });
    const blocked = store.createTask({ title: 'Run tests', priority: 'critical', dependencies: [dep.id] });

    const now = new Date('2026-03-21');
    const tasks = store.getTasks();
    const depScore = scoreTask(dep, tasks, now);
    const blockedScore = scoreTask(blocked, tasks, now);

    // Blocked task should score lower despite higher priority
    expect(blockedScore).toBeLessThan(depScore);
  });

  it('full state replacement via import is undoable', () => {
    const store = new TaskStore();
    store.createTask({ title: 'Original task' });

    const importedState = {
      ...getDefaultState(),
      tasks: [
        { id: 'imp-1', title: 'Imported task 1' } as any,
        { id: 'imp-2', title: 'Imported task 2' } as any,
      ],
    };

    store.replaceState(importedState);
    expect(store.getTasks()).toHaveLength(2);
    expect(store.getTasks()[0].title).toBe('Imported task 1');

    store.undo();
    expect(store.getTasks()).toHaveLength(1);
    expect(store.getTasks()[0].title).toBe('Original task');
  });

  it('chat history accumulates and settings persist', () => {
    const store = new TaskStore();
    store.addChatMessage({ role: 'user', content: 'Hello', actions: [] });
    store.addChatMessage({ role: 'assistant', content: 'Hi there!', actions: [] });
    expect(store.getChatHistory()).toHaveLength(2);

    store.updateSettings({ theme: 'dark', apiKey: 'sk-test' });
    expect(store.getSettings().theme).toBe('dark');
    expect(store.getSettings().apiKey).toBe('sk-test');
  });
});

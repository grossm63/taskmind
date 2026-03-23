import { describe, it, expect } from 'vitest';
import { TaskStore } from '../TaskStore';

describe('Recurring tasks', () => {
  it('creates next instance when completing a recurring daily task', () => {
    const store = new TaskStore();
    const task = store.createTask({
      title: 'Daily standup',
      deadline: '2026-03-21',
      recurrence: { frequency: 'daily', interval: 1 },
    });
    store.completeTask(task.id);

    const tasks = store.getTasks();
    expect(tasks).toHaveLength(2);

    const completed = tasks.find(t => t.id === task.id);
    expect(completed?.status).toBe('done');

    const next = tasks.find(t => t.id !== task.id);
    expect(next?.title).toBe('Daily standup');
    expect(next?.deadline).toBe('2026-03-22');
    expect(next?.status).toBe('todo');
    expect(next?.recurrence?.frequency).toBe('daily');
  });

  it('creates next instance for weekly recurrence', () => {
    const store = new TaskStore();
    const task = store.createTask({
      title: 'Weekly review',
      deadline: '2026-03-21',
      recurrence: { frequency: 'weekly', interval: 1 },
    });
    store.completeTask(task.id);

    const next = store.getTasks().find(t => t.id !== task.id);
    expect(next?.deadline).toBe('2026-03-28');
  });

  it('creates next instance for monthly recurrence', () => {
    const store = new TaskStore();
    const task = store.createTask({
      title: 'Monthly report',
      deadline: '2026-03-21',
      recurrence: { frequency: 'monthly', interval: 1 },
    });
    store.completeTask(task.id);

    const next = store.getTasks().find(t => t.id !== task.id);
    expect(next?.deadline).toBe('2026-04-21');
  });

  it('respects interval for daily recurrence', () => {
    const store = new TaskStore();
    const task = store.createTask({
      title: 'Every 3 days',
      deadline: '2026-03-21',
      recurrence: { frequency: 'daily', interval: 3 },
    });
    store.completeTask(task.id);

    const next = store.getTasks().find(t => t.id !== task.id);
    expect(next?.deadline).toBe('2026-03-24');
  });

  it('does not create next instance for non-recurring task', () => {
    const store = new TaskStore();
    const task = store.createTask({ title: 'One-time task' });
    store.completeTask(task.id);
    expect(store.getTasks()).toHaveLength(1);
  });

  it('inherits properties from parent recurring task', () => {
    const store = new TaskStore();
    const task = store.createTask({
      title: 'Recurring',
      priority: 'high',
      category: 'Work',
      tags: ['standup'],
      effort: 15,
      energyType: 'quick_win',
      recurrence: { frequency: 'daily', interval: 1 },
      deadline: '2026-03-21',
    });
    store.completeTask(task.id);

    const next = store.getTasks().find(t => t.id !== task.id)!;
    expect(next.priority).toBe('high');
    expect(next.category).toBe('Work');
    expect(next.tags).toEqual(['standup']);
    expect(next.effort).toBe(15);
    expect(next.energyType).toBe('quick_win');
  });
});

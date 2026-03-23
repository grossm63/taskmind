import { describe, it, expect } from 'vitest';
import { scoreTask, getTopTasks } from '../priority';
import type { Task } from '@/types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: overrides.id ?? 'task-1',
    title: overrides.title ?? 'Test',
    notes: '',
    priority: overrides.priority ?? 'medium',
    status: overrides.status ?? 'todo',
    category: 'Inbox',
    tags: [],
    deadline: overrides.deadline ?? null,
    deadlineType: 'soft',
    effort: overrides.effort ?? null,
    actualEffort: null,
    energyType: overrides.energyType ?? 'routine',
    parentId: null,
    dependencies: overrides.dependencies ?? [],
    recurrence: null,
    snoozedUntil: null,
    createdAt: overrides.createdAt ?? '2026-03-01T00:00:00.000Z',
    completedAt: null,
    updatedAt: '2026-03-01T00:00:00.000Z',
    sortOrder: 0,
  };
}

const NOW = new Date('2026-03-21T12:00:00.000Z');

describe('scoreTask', () => {
  it('returns -Infinity for done tasks', () => {
    const task = makeTask({ status: 'done' });
    expect(scoreTask(task, [], NOW)).toBe(-Infinity);
  });

  it('returns -Infinity for snoozed tasks', () => {
    const task = makeTask({ status: 'snoozed' });
    expect(scoreTask(task, [], NOW)).toBe(-Infinity);
  });

  it('scores overdue tasks highest for deadline urgency', () => {
    const overdue = makeTask({ deadline: '2026-03-20' });
    const today = makeTask({ deadline: '2026-03-21' });
    const tomorrow = makeTask({ deadline: '2026-03-22' });
    expect(scoreTask(overdue, [], NOW)).toBeGreaterThan(scoreTask(today, [], NOW));
    expect(scoreTask(today, [], NOW)).toBeGreaterThan(scoreTask(tomorrow, [], NOW));
  });

  it('scores critical priority higher than low', () => {
    const critical = makeTask({ priority: 'critical' });
    const low = makeTask({ priority: 'low' });
    expect(scoreTask(critical, [], NOW)).toBeGreaterThan(scoreTask(low, [], NOW));
  });

  it('adds staleness points up to 10', () => {
    const fresh = makeTask({ createdAt: '2026-03-21T00:00:00.000Z' });
    const stale = makeTask({ createdAt: '2026-03-01T00:00:00.000Z' }); // 20 days old
    expect(scoreTask(stale, [], NOW)).toBeGreaterThan(scoreTask(fresh, [], NOW));
  });

  it('caps staleness at 10', () => {
    const s20 = makeTask({ createdAt: '2026-03-01T00:00:00.000Z' }); // 20 days
    const s30 = makeTask({ createdAt: '2026-02-19T00:00:00.000Z' }); // 30 days
    // Both should have staleness=10 (capped), so equal scores
    expect(scoreTask(s20, [], NOW)).toBe(scoreTask(s30, [], NOW));
  });

  it('adds energy match bonus for matching energy', () => {
    const deepFocus = makeTask({ energyType: 'deep_focus' });
    const withMatch = scoreTask(deepFocus, [], NOW, 'high');
    const withoutMatch = scoreTask(deepFocus, [], NOW);
    expect(withMatch).toBe(withoutMatch + 3);
  });

  it('adds energy match bonus for low energy + quick win', () => {
    const quickWin = makeTask({ energyType: 'quick_win' });
    const withMatch = scoreTask(quickWin, [], NOW, 'low');
    const withoutMatch = scoreTask(quickWin, [], NOW);
    expect(withMatch).toBe(withoutMatch + 3);
  });

  it('penalizes tasks with incomplete dependencies', () => {
    const dep = makeTask({ id: 'dep-1', status: 'todo' });
    const blocked = makeTask({ dependencies: ['dep-1'] });
    const score = scoreTask(blocked, [dep, blocked], NOW);
    expect(score).toBeLessThan(0);
  });

  it('does not penalize tasks with completed dependencies', () => {
    const dep = makeTask({ id: 'dep-1', status: 'done' });
    const unblocked = makeTask({ dependencies: ['dep-1'] });
    const score = scoreTask(unblocked, [dep, unblocked], NOW);
    expect(score).toBeGreaterThan(0);
  });

  it('gives moderate urgency to tasks with no deadline', () => {
    const noDeadline = makeTask({ deadline: null });
    const thisWeek = makeTask({ deadline: '2026-03-25' });
    // No deadline = 6, this week = 12; so no-deadline scores lower on urgency
    expect(scoreTask(noDeadline, [], NOW)).toBeLessThan(scoreTask(thisWeek, [], NOW));
  });
});

describe('getTopTasks', () => {
  it('returns the N highest-scored active tasks', () => {
    const tasks = [
      makeTask({ id: '1', priority: 'low', status: 'todo' }),
      makeTask({ id: '2', priority: 'critical', status: 'todo' }),
      makeTask({ id: '3', priority: 'high', status: 'todo' }),
      makeTask({ id: '4', priority: 'medium', status: 'done' }),
    ];
    const top = getTopTasks(tasks, 2, NOW);
    expect(top).toHaveLength(2);
    expect(top[0].id).toBe('2'); // critical first
    expect(top[1].id).toBe('3'); // high second
  });

  it('excludes done and snoozed tasks', () => {
    const tasks = [
      makeTask({ id: '1', status: 'done' }),
      makeTask({ id: '2', status: 'snoozed' }),
      makeTask({ id: '3', status: 'todo' }),
    ];
    const top = getTopTasks(tasks, 5, NOW);
    expect(top).toHaveLength(1);
    expect(top[0].id).toBe('3');
  });

  it('returns empty array when no active tasks', () => {
    const tasks = [makeTask({ status: 'done' })];
    expect(getTopTasks(tasks, 5, NOW)).toEqual([]);
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskStore } from '@/store/TaskStore';
import { TaskStoreProvider } from '@/store/TaskStoreContext';
import { TaskCard } from '../TaskCard';
import type { Task } from '@/types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test Task',
    notes: '',
    priority: 'medium',
    status: 'todo',
    category: 'Inbox',
    tags: [],
    deadline: null,
    deadlineType: 'soft',
    effort: null,
    actualEffort: null,
    energyType: 'routine',
    parentId: null,
    dependencies: [],
    recurrence: null,
    snoozedUntil: null,
    createdAt: '2026-03-21T00:00:00.000Z',
    completedAt: null,
    updatedAt: '2026-03-21T00:00:00.000Z',
    sortOrder: 0,
    ...overrides,
  };
}

function renderCard(task: Task, subtasks?: Task[], store?: TaskStore) {
  const s = store ?? new TaskStore();
  s.createTask(task);
  return render(
    <TaskStoreProvider store={s}>
      <TaskCard task={task} subtasks={subtasks} />
    </TaskStoreProvider>
  );
}

describe('TaskCard', () => {
  it('renders the task title', () => {
    renderCard(makeTask({ title: 'Buy groceries' }));
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
  });

  it('renders the priority dot', () => {
    const { container } = renderCard(makeTask({ priority: 'critical' }));
    const dot = container.querySelector('.bg-\\[var\\(--priority-critical\\)\\]');
    expect(dot).toBeInTheDocument();
  });

  it('renders effort when provided', () => {
    renderCard(makeTask({ effort: 120 }));
    expect(screen.getByText(/2h/)).toBeInTheDocument();
  });

  it('renders effort in minutes when under 60', () => {
    renderCard(makeTask({ effort: 30 }));
    expect(screen.getByText(/30m/)).toBeInTheDocument();
  });

  it('renders deadline', () => {
    const today = new Date().toISOString().slice(0, 10);
    renderCard(makeTask({ deadline: today }));
    expect(screen.getByText(/Today/)).toBeInTheDocument();
  });

  it('shows overdue label for past deadlines', () => {
    renderCard(makeTask({ deadline: '2020-01-01' }));
    expect(screen.getByText(/overdue/)).toBeInTheDocument();
  });

  it('renders category tag when not Inbox', () => {
    renderCard(makeTask({ category: 'Work' }));
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  it('does not render category tag for Inbox', () => {
    renderCard(makeTask({ category: 'Inbox' }));
    expect(screen.queryByText('Inbox')).not.toBeInTheDocument();
  });

  it('renders tags', () => {
    renderCard(makeTask({ tags: ['urgent', 'q1'] }));
    expect(screen.getByText('urgent')).toBeInTheDocument();
    expect(screen.getByText('q1')).toBeInTheDocument();
  });

  it('renders subtask summary', () => {
    const parent = makeTask({ id: 'parent' });
    const subtasks = [
      makeTask({ id: 'sub1', title: 'Step 1', parentId: 'parent', status: 'done' }),
      makeTask({ id: 'sub2', title: 'Step 2', parentId: 'parent', status: 'todo' }),
    ];
    renderCard(parent, subtasks);
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('1/2 subtasks complete')).toBeInTheDocument();
  });

  it('shows done styling for completed tasks', () => {
    const { container } = renderCard(makeTask({ status: 'done' }));
    expect(container.querySelector('.opacity-60')).toBeInTheDocument();
  });

  it('expands edit form on click', async () => {
    renderCard(makeTask());
    const card = screen.getByText('Test Task').closest('[class*="cursor-pointer"]')!;
    await userEvent.click(card);
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Delete task')).toBeInTheDocument();
  });
});

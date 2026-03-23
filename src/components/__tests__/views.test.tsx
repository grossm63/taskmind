import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskStore } from '@/store/TaskStore';
import { TaskStoreProvider } from '@/store/TaskStoreContext';
import { TodayView } from '../views/TodayView';
import { UpcomingView } from '../views/UpcomingView';
import { ProjectsView } from '../views/ProjectsView';
import { AllTasksView } from '../views/AllTasksView';

function renderWithStore(ui: React.ReactElement, store?: TaskStore) {
  const s = store ?? new TaskStore();
  return { ...render(<TaskStoreProvider store={s}>{ui}</TaskStoreProvider>), store: s };
}

const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

describe('TodayView', () => {
  it('shows empty state when no tasks', () => {
    renderWithStore(<TodayView />);
    expect(screen.getByText('Nothing scheduled for today!')).toBeInTheDocument();
  });

  it('shows tasks due today', () => {
    const store = new TaskStore();
    store.createTask({ title: 'Due today', deadline: today });
    renderWithStore(<TodayView />, store);
    expect(screen.getByText('Due today')).toBeInTheDocument();
  });

  it('shows overdue tasks', () => {
    const store = new TaskStore();
    store.createTask({ title: 'Overdue task', deadline: '2020-01-01' });
    renderWithStore(<TodayView />, store);
    expect(screen.getByText('Overdue task')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  it('shows progress bar', () => {
    const store = new TaskStore();
    store.createTask({ title: 'Task 1', deadline: today });
    const t2 = store.createTask({ title: 'Task 2', deadline: today });
    store.completeTask(t2.id);
    renderWithStore(<TodayView />, store);
    expect(screen.getByText(/1 of 2 tasks complete/)).toBeInTheDocument();
  });
});

describe('UpcomingView', () => {
  it('shows empty state when no tasks', () => {
    renderWithStore(<UpcomingView />);
    expect(screen.getByText('No upcoming tasks')).toBeInTheDocument();
  });

  it('groups tasks by date', () => {
    const store = new TaskStore();
    store.createTask({ title: 'Tomorrow task', deadline: tomorrow });
    store.createTask({ title: 'Next week task', deadline: nextWeek });
    renderWithStore(<UpcomingView />, store);
    expect(screen.getByText('Tomorrow task')).toBeInTheDocument();
    expect(screen.getByText('Next week task')).toBeInTheDocument();
  });

  it('shows effort totals per day', () => {
    const store = new TaskStore();
    store.createTask({ title: 'Task A', deadline: tomorrow, effort: 60 });
    store.createTask({ title: 'Task B', deadline: tomorrow, effort: 90 });
    renderWithStore(<UpcomingView />, store);
    expect(screen.getByText('2h 30m of work')).toBeInTheDocument();
  });

  it('shows no-deadline section', () => {
    const store = new TaskStore();
    store.createTask({ title: 'No deadline task' });
    renderWithStore(<UpcomingView />, store);
    expect(screen.getByText('No Deadline')).toBeInTheDocument();
    expect(screen.getByText('No deadline task')).toBeInTheDocument();
  });
});

describe('ProjectsView', () => {
  it('shows all default categories', () => {
    renderWithStore(<ProjectsView />);
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
  });

  it('shows task counts per category', () => {
    const store = new TaskStore();
    store.createTask({ title: 'Work task 1', category: 'Work' });
    store.createTask({ title: 'Work task 2', category: 'Work' });
    renderWithStore(<ProjectsView />, store);
    expect(screen.getByText('2 tasks')).toBeInTheDocument();
  });

  it('expands category to show tasks on click', async () => {
    const store = new TaskStore();
    store.createTask({ title: 'Work task', category: 'Work' });
    renderWithStore(<ProjectsView />, store);
    const workBtn = screen.getByText('Work').closest('button')!;
    await userEvent.click(workBtn);
    expect(screen.getByText('Work task')).toBeInTheDocument();
  });
});

describe('AllTasksView', () => {
  it('shows all tasks', () => {
    const store = new TaskStore();
    store.createTask({ title: 'Task A' });
    store.createTask({ title: 'Task B' });
    renderWithStore(<AllTasksView />, store);
    expect(screen.getByText('Task A')).toBeInTheDocument();
    expect(screen.getByText('Task B')).toBeInTheDocument();
    expect(screen.getByText('2 tasks')).toBeInTheDocument();
  });

  it('filters tasks by search text', async () => {
    const store = new TaskStore();
    store.createTask({ title: 'Buy groceries' });
    store.createTask({ title: 'Fix bug' });
    renderWithStore(<AllTasksView />, store);
    const search = screen.getByPlaceholderText('Search tasks...');
    await userEvent.type(search, 'groceries');
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    expect(screen.queryByText('Fix bug')).not.toBeInTheDocument();
    expect(screen.getByText('1 tasks')).toBeInTheDocument();
  });

  it('shows empty message when no tasks match filter', async () => {
    const store = new TaskStore();
    store.createTask({ title: 'Task A' });
    renderWithStore(<AllTasksView />, store);
    const search = screen.getByPlaceholderText('Search tasks...');
    await userEvent.type(search, 'zzzzz');
    expect(screen.getByText('No tasks match your filters')).toBeInTheDocument();
  });

  it('filters by status', async () => {
    const store = new TaskStore();
    store.createTask({ title: 'Active task' });
    const done = store.createTask({ title: 'Done task' });
    store.completeTask(done.id);
    renderWithStore(<AllTasksView />, store);
    const statusSelect = screen.getAllByRole('combobox')[0];
    await userEvent.selectOptions(statusSelect, 'done');
    expect(screen.queryByText('Active task')).not.toBeInTheDocument();
    expect(screen.getByText('Done task')).toBeInTheDocument();
  });

  it('filters by priority', async () => {
    const store = new TaskStore();
    store.createTask({ title: 'Critical task', priority: 'critical' });
    store.createTask({ title: 'Low task', priority: 'low' });
    renderWithStore(<AllTasksView />, store);
    const prioritySelect = screen.getAllByRole('combobox')[1];
    await userEvent.selectOptions(prioritySelect, 'critical');
    expect(screen.getByText('Critical task')).toBeInTheDocument();
    expect(screen.queryByText('Low task')).not.toBeInTheDocument();
  });
});

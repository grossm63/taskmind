import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskStore } from '@/store/TaskStore';
import { TaskStoreProvider } from '@/store/TaskStoreContext';
import { AppShell } from '../AppShell';

function renderWithStore(store?: TaskStore) {
  const s = store ?? new TaskStore();
  return render(
    <TaskStoreProvider store={s}>
      <AppShell />
    </TaskStoreProvider>
  );
}

describe('AppShell', () => {
  it('renders the header with TaskMind title', () => {
    renderWithStore();
    expect(screen.getByText('TaskMind')).toBeInTheDocument();
  });

  it('renders the save indicator', () => {
    renderWithStore();
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('renders the theme toggle button', () => {
    renderWithStore();
    expect(screen.getByLabelText('Toggle theme')).toBeInTheDocument();
  });

  it('renders mobile tab buttons', () => {
    renderWithStore();
    expect(screen.getByRole('button', { name: 'Chat' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tasks' })).toBeInTheDocument();
  });

  it('renders dashboard view tabs', () => {
    renderWithStore();
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upcoming' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Projects' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
  });

  it('toggles theme on button click', async () => {
    const store = new TaskStore();
    renderWithStore(store);
    const btn = screen.getByLabelText('Toggle theme');
    await userEvent.click(btn);
    expect(store.getSettings().theme).toBe('dark');
  });
});

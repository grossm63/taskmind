import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskStore } from '@/store/TaskStore';
import { TaskStoreProvider } from '@/store/TaskStoreContext';
import { UndoToast, triggerUndo } from '../UndoToast';

function renderToast(store?: TaskStore) {
  const s = store ?? new TaskStore();
  return { ...render(<TaskStoreProvider store={s}><UndoToast /></TaskStoreProvider>), store: s };
}

describe('UndoToast', () => {
  it('does not render when no undo event', () => {
    const { container } = renderToast();
    expect(container.textContent).toBe('');
  });

  it('shows toast when triggerUndo is called', () => {
    renderToast();
    act(() => { triggerUndo('Task deleted'); });
    expect(screen.getByText('Task deleted')).toBeInTheDocument();
    expect(screen.getByText('Undo')).toBeInTheDocument();
  });

  it('dismisses toast on dismiss button click', async () => {
    renderToast();
    act(() => { triggerUndo('Something happened'); });
    expect(screen.getByText('Something happened')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Dismiss'));
    expect(screen.queryByText('Something happened')).not.toBeInTheDocument();
  });

  it('calls store.undo when Undo is clicked', async () => {
    const store = new TaskStore();
    store.createTask({ title: 'Task 1' });
    store.createTask({ title: 'Task 2' });
    expect(store.getTasks()).toHaveLength(2);

    renderToast(store);
    act(() => { triggerUndo('Created Task 2'); });
    await userEvent.click(screen.getByText('Undo'));
    expect(store.getTasks()).toHaveLength(1);
  });
});

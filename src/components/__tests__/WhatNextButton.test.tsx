import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskStore } from '@/store/TaskStore';
import { TaskStoreProvider } from '@/store/TaskStoreContext';
import { WhatNextButton } from '../WhatNextButton';

function renderButton(store?: TaskStore) {
  const s = store ?? new TaskStore();
  return { ...render(<TaskStoreProvider store={s}><WhatNextButton /></TaskStoreProvider>), store: s };
}

describe('WhatNextButton', () => {
  it('renders the button', () => {
    renderButton();
    expect(screen.getByLabelText("What should I do next?")).toBeInTheDocument();
  });

  it('shows "all clear" when no active tasks', async () => {
    const store = new TaskStore();
    renderButton(store);
    await userEvent.click(screen.getByLabelText("What should I do next?"));
    const history = store.getChatHistory();
    expect(history).toHaveLength(1);
    expect(history[0].content).toMatch(/all clear/i);
  });

  it('provides local recommendation without API key', async () => {
    const store = new TaskStore();
    store.createTask({ title: 'Important task', priority: 'critical', deadline: '2026-03-25' });
    renderButton(store);
    await userEvent.click(screen.getByLabelText("What should I do next?"));
    const history = store.getChatHistory();
    expect(history).toHaveLength(1);
    expect(history[0].content).toMatch(/Important task/);
  });

  it('recommends the highest priority task', async () => {
    const store = new TaskStore();
    store.createTask({ title: 'Low task', priority: 'low' });
    store.createTask({ title: 'Critical task', priority: 'critical' });
    renderButton(store);
    await userEvent.click(screen.getByLabelText("What should I do next?"));
    const history = store.getChatHistory();
    expect(history[0].content).toMatch(/Critical task/);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskStore } from '@/store/TaskStore';
import { TaskStoreProvider } from '@/store/TaskStoreContext';
import { ChatPanel } from '../ChatPanel';

function renderChat(store?: TaskStore) {
  const s = store ?? new TaskStore();
  return { ...render(<TaskStoreProvider store={s}><ChatPanel /></TaskStoreProvider>), store: s };
}

describe('ChatPanel', () => {
  it('shows welcome message when no chat history', () => {
    renderChat();
    expect(screen.getByText(/I'm TaskMind/)).toBeInTheDocument();
  });

  it('renders the input field', () => {
    renderChat();
    expect(screen.getByPlaceholderText('Type or speak...')).toBeInTheDocument();
  });

  it('renders the send button', () => {
    renderChat();
    expect(screen.getByLabelText('Send message')).toBeInTheDocument();
  });

  it('renders quick action chips when no history', () => {
    renderChat();
    expect(screen.getByText("What's next?")).toBeInTheDocument();
    expect(screen.getByText('Morning briefing')).toBeInTheDocument();
    expect(screen.getByText('Show overdue')).toBeInTheDocument();
  });

  it('shows API key prompt when sending without key', async () => {
    const store = new TaskStore();
    renderChat(store);
    const input = screen.getByPlaceholderText('Type or speak...');
    await userEvent.type(input, 'Hello');
    await userEvent.click(screen.getByLabelText('Send message'));
    expect(screen.getByText(/API key/i)).toBeInTheDocument();
  });

  it('adds user message to chat history', async () => {
    const store = new TaskStore();
    renderChat(store);
    const input = screen.getByPlaceholderText('Type or speak...');
    await userEvent.type(input, 'Buy groceries');
    await userEvent.click(screen.getByLabelText('Send message'));
    expect(store.getChatHistory()).toHaveLength(2); // user + assistant API key prompt
    expect(store.getChatHistory()[0].content).toBe('Buy groceries');
    expect(store.getChatHistory()[0].role).toBe('user');
  });

  it('clears input after sending', async () => {
    renderChat();
    const input = screen.getByPlaceholderText('Type or speak...') as HTMLInputElement;
    await userEvent.type(input, 'Hello');
    await userEvent.click(screen.getByLabelText('Send message'));
    expect(input.value).toBe('');
  });

  it('renders existing chat messages', () => {
    const store = new TaskStore();
    store.addChatMessage({ role: 'user', content: 'Hello there', actions: [] });
    store.addChatMessage({ role: 'assistant', content: 'Hi! How can I help?', actions: [] });
    renderChat(store);
    expect(screen.getByText('Hello there')).toBeInTheDocument();
    expect(screen.getByText('Hi! How can I help?')).toBeInTheDocument();
  });

  it('renders action previews in AI messages', () => {
    const store = new TaskStore();
    store.addChatMessage({
      role: 'assistant',
      content: 'Created!',
      actions: [{ type: 'create', data: { title: 'New task', priority: 'high' } }],
    });
    renderChat(store);
    expect(screen.getByText(/Created: New task/)).toBeInTheDocument();
  });

  it('does not send empty messages', async () => {
    const store = new TaskStore();
    renderChat(store);
    await userEvent.click(screen.getByLabelText('Send message'));
    expect(store.getChatHistory()).toHaveLength(0);
  });
});

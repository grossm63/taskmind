import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskStore } from '@/store/TaskStore';
import { TaskStoreProvider } from '@/store/TaskStoreContext';
import { SettingsModal } from '../SettingsModal';

function renderSettings(store?: TaskStore, onClose?: () => void) {
  const s = store ?? new TaskStore();
  const close = onClose ?? vi.fn();
  return { ...render(<TaskStoreProvider store={s}><SettingsModal onClose={close} /></TaskStoreProvider>), store: s, close };
}

// Mock URL methods
globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
globalThis.URL.revokeObjectURL = vi.fn();

describe('SettingsModal', () => {
  it('renders settings title', () => {
    renderSettings();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders API key input', () => {
    renderSettings();
    expect(screen.getByPlaceholderText('sk-ant-...')).toBeInTheDocument();
  });

  it('renders voice output toggle', () => {
    renderSettings();
    expect(screen.getByText('Voice Output')).toBeInTheDocument();
    expect(screen.getByLabelText('Toggle voice output')).toBeInTheDocument();
  });

  it('renders data export/import buttons', () => {
    renderSettings();
    expect(screen.getByText('Download My Data')).toBeInTheDocument();
    expect(screen.getByText('Load Data File')).toBeInTheDocument();
  });

  it('saves API key and voice output setting', async () => {
    const store = new TaskStore();
    const close = vi.fn();
    renderSettings(store, close);

    const input = screen.getByPlaceholderText('sk-ant-...');
    await userEvent.type(input, 'sk-test-key');

    // Toggle voice output on
    await userEvent.click(screen.getByLabelText('Toggle voice output'));

    await userEvent.click(screen.getByText('Save'));
    expect(store.getSettings().apiKey).toBe('sk-test-key');
    expect(store.getSettings().voiceOutputEnabled).toBe(true);
    expect(close).toHaveBeenCalled();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const close = vi.fn();
    renderSettings(undefined, close);
    await userEvent.click(screen.getByText('Cancel'));
    expect(close).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const close = vi.fn();
    const { container } = renderSettings(undefined, close);
    const backdrop = container.firstChild as HTMLElement;
    await userEvent.click(backdrop);
    expect(close).toHaveBeenCalled();
  });
});

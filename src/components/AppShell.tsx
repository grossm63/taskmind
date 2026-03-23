import { useState } from 'react';
import { useSaveStatus, useSettings, useStore } from '@/store/TaskStoreContext';
import { Dashboard } from './Dashboard';
import { ChatPanel } from './ChatPanel';
import { SettingsModal } from './SettingsModal';
import { WhatNextButton } from './WhatNextButton';
import { UndoToast } from './UndoToast';

type MobileTab = 'chat' | 'tasks';

export function AppShell() {
  const [mobileTab, setMobileTab] = useState<MobileTab>('tasks');
  const [showSettings, setShowSettings] = useState(false);
  const saveStatus = useSaveStatus();
  const settings = useSettings();
  const store = useStore();
  const isDark = settings.theme === 'dark';

  const toggleTheme = () => {
    store.updateSettings({ theme: isDark ? 'light' : 'dark' });
  };

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-[Inter,system-ui,sans-serif] flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--bg-secondary)]">
          <h1 className="text-xl font-semibold tracking-tight">TaskMind</h1>
          <div className="flex items-center gap-3">
            <SaveIndicator status={saveStatus} />
            <button
              onClick={() => setShowSettings(true)}
              className="w-9 h-9 rounded-md flex items-center justify-center hover:bg-[var(--bg-secondary)] transition-colors"
              aria-label="Settings"
            >
              {'\u2699\uFE0F'}
            </button>
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-md flex items-center justify-center hover:bg-[var(--bg-secondary)] transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? '\u2600\uFE0F' : '\u{1F319}'}
            </button>
          </div>
        </header>

        {/* Mobile tab bar - visible below md */}
        <div className="flex md:hidden border-b border-[var(--bg-secondary)]">
          <button
            onClick={() => setMobileTab('chat')}
            className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
              mobileTab === 'chat'
                ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setMobileTab('tasks')}
            className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
              mobileTab === 'tasks'
                ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            Tasks
          </button>
        </div>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Chat panel — pastel violet */}
          <div className={`${mobileTab === 'chat' ? 'flex' : 'hidden'} md:flex flex-col overflow-hidden shrink-0`} style={{ backgroundColor: '#C0A8FF', flex: '0 0 40%', minWidth: 0 }}>
            <ChatPanel />
          </div>
          {/* Divider */}
          <div className="hidden md:block w-[3px] bg-gray-400 shrink-0" />
          {/* Dashboard panel */}
          <div className={`${mobileTab === 'tasks' ? 'flex' : 'hidden'} md:flex flex-col overflow-hidden`} style={{ backgroundColor: '#F5ECD7', flex: '1 1 60%', minWidth: 0 }}>
            <Dashboard />
          </div>
        </div>
      </div>
      <WhatNextButton />
      <UndoToast />
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function SaveIndicator({ status }: { status: string }) {
  const label = status === 'saved' ? 'Saved' : status === 'saving' ? 'Saving...' : 'Unsaved';
  const color = status === 'saved' ? 'text-[var(--status-done)]' : status === 'saving' ? 'text-[var(--text-muted)]' : 'text-[var(--status-overdue)]';
  return <span className={`text-xs ${color}`}>{label}</span>;
}

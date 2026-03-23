import { useState } from 'react';
import { useSettings, useStore } from '@/store/TaskStoreContext';
import { TodayView } from './views/TodayView';
import { UpcomingView } from './views/UpcomingView';
import { ProjectsView } from './views/ProjectsView';
import { AllTasksView } from './views/AllTasksView';
import { CompletedView } from './views/CompletedView';

type ViewTab = 'today' | 'upcoming' | 'projects' | 'all' | 'completed';

const TABS: { key: ViewTab; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'projects', label: 'Categories' },
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
];

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<ViewTab>('today');
  const settings = useSettings();
  const store = useStore();
  const voiceOn = settings.voiceOutputEnabled;

  return (
    <div className="flex flex-col h-full">
      {/* View tabs */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-2">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-[var(--accent-primary)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <div className="ml-auto">
          <button
            onClick={() => store.updateSettings({ voiceOutputEnabled: !voiceOn })}
            className={`w-9 h-9 rounded-md flex items-center justify-center transition-colors ${
              voiceOn
                ? 'bg-[var(--accent-primary)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
            }`}
            aria-label={voiceOn ? 'Disable voice output' : 'Enable voice output'}
            title={voiceOn ? 'Voice output on' : 'Voice output off'}
          >
            {voiceOn ? '\u{1F50A}' : '\u{1F507}'}
          </button>
        </div>
      </div>

      {/* Active view */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {activeTab === 'today' && <TodayView />}
        {activeTab === 'upcoming' && <UpcomingView />}
        {activeTab === 'projects' && <ProjectsView />}
        {activeTab === 'all' && <AllTasksView />}
        {activeTab === 'completed' && <CompletedView />}
      </div>
    </div>
  );
}

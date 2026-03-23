import { useState, useRef } from 'react';
import { useStore, useSettings } from '@/store/TaskStoreContext';
import { toPersistedData } from '@/store/storage/migration';

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const store = useStore();
  const settings = useSettings();
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [voiceOutput, setVoiceOutput] = useState(settings.voiceOutputEnabled);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    store.updateSettings({ apiKey, voiceOutputEnabled: voiceOutput });
    onClose();
  };

  const handleExport = () => {
    const data = toPersistedData(store.getState());
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'taskmind-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate structure before replacing state
      if (!data || typeof data !== 'object') throw new Error('Invalid format');
      const tasks = Array.isArray(data.tasks) ? data.tasks : [];
      const categories = Array.isArray(data.categories) ? data.categories : [];
      const chatHistory = Array.isArray(data.chatHistory) ? data.chatHistory : [];

      // Validate tasks have required fields
      for (const t of tasks) {
        if (!t.id || typeof t.title !== 'string') throw new Error('Invalid task data');
      }
      // Validate categories have required fields
      for (const c of categories) {
        if (!c.id || typeof c.name !== 'string') throw new Error('Invalid category data');
      }

      // Cap sizes to prevent memory abuse
      if (tasks.length > 10_000 || chatHistory.length > 1_000) {
        throw new Error('Data file is too large');
      }

      store.replaceState({
        tasks,
        categories,
        settings: data.settings && typeof data.settings === 'object' ? { ...settings, ...data.settings, apiKey: settings.apiKey } : settings,
        chatHistory,
      });
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Invalid data file');
    }
  };

  const btnClass = 'px-3 py-2 text-sm rounded-[var(--radius-sm)] border border-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[var(--bg-card)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">Settings</h2>

        <div className="space-y-5">
          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Claude API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full rounded-[var(--radius-sm)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
            />
            <p className="text-[var(--font-size-xs)] text-[var(--text-muted)] mt-1">
              Your key is stored locally and never sent to any server except Anthropic's API.
            </p>
          </div>

          {/* Voice Output Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Voice Output</p>
              <p className="text-[var(--font-size-xs)] text-[var(--text-muted)]">Read AI responses aloud</p>
            </div>
            <button
              onClick={() => setVoiceOutput(!voiceOutput)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                voiceOutput ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-secondary)]'
              }`}
              role="switch"
              aria-checked={voiceOutput}
              aria-label="Toggle voice output"
            >
              <span className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform absolute top-0.5 ${
                voiceOutput ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Data Management */}
          <div>
            <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">Data</p>
            <div className="flex gap-2">
              <button onClick={handleExport} className={btnClass}>
                Download My Data
              </button>
              <button onClick={() => fileInputRef.current?.click()} className={btnClass}>
                Load Data File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-[var(--radius-sm)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

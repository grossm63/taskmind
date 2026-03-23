import { useMemo, useState } from 'react';
import { useTaskStore } from '@/store/TaskStoreContext';
import { TaskCard } from '../TaskCard';
import type { Task } from '@/types';
import { toPersistedData } from '@/store/storage/migration';

export function CompletedView() {
  const { tasks, store } = useTaskStore();
  const [search, setSearch] = useState('');

  const subtasksMap = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasks) {
      if (t.parentId) {
        const arr = m.get(t.parentId) ?? [];
        arr.push(t);
        m.set(t.parentId, arr);
      }
    }
    return m;
  }, [tasks]);

  const completedTasks = useMemo(() => {
    const q = search.toLowerCase();
    return tasks
      .filter(t => !t.parentId && t.status === 'done')
      .filter(t => !q || t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  }, [tasks, search]);

  const exportData = () => {
    const state = store.getState();
    const data = toPersistedData(state);
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `taskmind-export-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search completed..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 rounded-[var(--radius-md)] border border-[var(--bg-secondary)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
        />
        <button
          onClick={exportData}
          className="px-3 py-2 text-sm rounded-[var(--radius-md)] bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] transition-colors whitespace-nowrap"
        >
          Export All Data
        </button>
      </div>

      <p className="text-[var(--font-size-xs)] text-[var(--text-muted)]">
        {completedTasks.length} completed task{completedTasks.length !== 1 ? 's' : ''}
      </p>

      <div className="space-y-2">
        {completedTasks.map(t => (
          <TaskCard key={t.id} task={t} subtasks={subtasksMap.get(t.id)} />
        ))}
      </div>

      {completedTasks.length === 0 && (
        <p className="text-sm text-[var(--text-muted)] text-center py-8">No completed tasks yet</p>
      )}
    </div>
  );
}

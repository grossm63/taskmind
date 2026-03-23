import { useMemo, useState } from 'react';
import { useTasks, useCategories } from '@/store/TaskStoreContext';
import { TaskCard } from '../TaskCard';

export function ProjectsView() {
  const tasks = useTasks();
  const categories = useCategories();
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const categoryStats = useMemo(() => {
    return categories.map(cat => {
      const catTasks = tasks.filter(t => t.category === cat.name && !t.parentId);
      const total = catTasks.length;
      const done = catTasks.filter(t => t.status === 'done').length;
      const overdue = catTasks.filter(t => {
        if (t.status === 'done') return false;
        if (!t.deadline) return false;
        return t.deadline < new Date().toISOString().slice(0, 10);
      }).length;
      const active = catTasks.filter(t => t.status !== 'done');
      return { cat, tasks: active, total, done, overdue };
    });
  }, [tasks, categories]);

  const subtasksMap = useMemo(() => {
    const m = new Map<string, typeof tasks>();
    for (const t of tasks) {
      if (t.parentId) {
        const arr = m.get(t.parentId) ?? [];
        arr.push(t);
        m.set(t.parentId, arr);
      }
    }
    return m;
  }, [tasks]);

  return (
    <div className="space-y-3">
      {categoryStats.map(({ cat, tasks: catTasks, total, done, overdue }) => {
        const isExpanded = expandedCat === cat.id;
        const health = overdue > 3 ? 'overdue-many' : overdue > 0 ? 'overdue' : 'ok';

        return (
          <div key={cat.id} className="rounded-[var(--radius-md)] shadow-[var(--shadow-sm)]" style={{ backgroundColor: cat.color + '80' }}>
            <button
              onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-[var(--bg-secondary)] rounded-[var(--radius-md)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>{cat.icon}</span>
                <span className="font-medium text-sm">{cat.name}</span>
                <span className="text-[var(--font-size-xs)] text-[var(--text-muted)]">
                  {total} tasks
                </span>
              </div>
              <div className="flex items-center gap-2">
                {health === 'overdue-many' && <span className="text-[var(--font-size-xs)] text-[var(--status-overdue)]">{overdue} overdue</span>}
                {health === 'overdue' && <span className="text-[var(--font-size-xs)] text-[var(--priority-high)]">{overdue} overdue</span>}
                {total > 0 && (
                  <span className="text-[var(--font-size-xs)] text-[var(--text-muted)]">
                    {done}/{total}
                  </span>
                )}
                <span className="text-[var(--text-muted)] text-xs">{isExpanded ? '\u25B2' : '\u25BC'}</span>
              </div>
            </button>
            {isExpanded && (
              <div className="px-3 pb-3 space-y-2">
                {catTasks.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] py-2">No active tasks</p>
                ) : (
                  catTasks.map(t => (
                    <TaskCard key={t.id} task={t} subtasks={subtasksMap.get(t.id)} />
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

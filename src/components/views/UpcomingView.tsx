import { useMemo } from 'react';
import { useTasks } from '@/store/TaskStoreContext';
import { TaskCard } from '../TaskCard';

function formatEffort(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

import type { Task } from '@/types';

interface DayGroup {
  date: string;
  label: string;
  tasks: Task[];
  totalEffort: number;
}

export function UpcomingView() {
  const tasks = useTasks();

  const { dayGroups, noDeadline } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const grouped = new Map<string, typeof tasks>();
    const noDl: typeof tasks = [];

    for (const t of tasks) {
      if (t.parentId || t.status === 'done') continue;
      if (t.status === 'snoozed' && t.snoozedUntil && t.snoozedUntil > todayStr) continue;
      if (!t.deadline) {
        noDl.push(t);
        continue;
      }
      if (t.deadline < todayStr) continue; // Skip overdue (shown in Today)
      const key = t.deadline <= twoWeeksOut ? t.deadline : 'later';
      const arr = grouped.get(key) ?? [];
      arr.push(t);
      grouped.set(key, arr);
    }

    const days: DayGroup[] = [];
    const sortedKeys = [...grouped.keys()].filter(k => k !== 'later').sort();
    for (const key of sortedKeys) {
      const dayTasks = grouped.get(key)!;
      days.push({
        date: key,
        label: formatDayLabel(key),
        tasks: dayTasks,
        totalEffort: dayTasks.reduce((sum, t) => sum + (t.effort ?? 0), 0),
      });
    }

    const laterTasks = grouped.get('later');
    if (laterTasks) {
      days.push({
        date: 'later',
        label: 'Later',
        tasks: laterTasks,
        totalEffort: laterTasks.reduce((sum, t) => sum + (t.effort ?? 0), 0),
      });
    }

    return { dayGroups: days, noDeadline: noDl };
  }, [tasks]);

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

  if (dayGroups.length === 0 && noDeadline.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium">No upcoming tasks</p>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Add tasks via the chat panel.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {dayGroups.map(group => (
        <div key={group.date}>
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">{group.label}</h2>
            {group.totalEffort > 0 && (
              <span className="text-[var(--font-size-xs)] text-[var(--text-muted)]">
                {formatEffort(group.totalEffort)} of work
              </span>
            )}
          </div>
          <div className="space-y-2">
            {group.tasks.map(t => (
              <TaskCard key={t.id} task={t} subtasks={subtasksMap.get(t.id)} />
            ))}
          </div>
        </div>
      ))}

      {noDeadline.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-muted)] mb-2">No Deadline</h2>
          <div className="space-y-2">
            {noDeadline.map(t => (
              <TaskCard key={t.id} task={t} subtasks={subtasksMap.get(t.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

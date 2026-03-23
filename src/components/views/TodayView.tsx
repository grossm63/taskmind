import { useMemo } from 'react';
import { useTasks } from '@/store/TaskStoreContext';
import { TaskCard } from '../TaskCard';
import { scoreTask } from '@/engine/priority';

export function TodayView() {
  const tasks = useTasks();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const { todayTasks, overdueTasks, doneTodayTasks } = useMemo(() => {
    const today: typeof tasks = [];
    const overdue: typeof tasks = [];
    const doneToday: typeof tasks = [];

    for (const t of tasks) {
      if (t.parentId) continue; // Skip subtasks from top-level
      if (t.status === 'snoozed') {
        if (t.snoozedUntil && t.snoozedUntil > todayStr) continue;
      }
      if (t.status === 'done') {
        if (t.completedAt && t.completedAt.slice(0, 10) === todayStr) doneToday.push(t);
        continue;
      }
      if (t.deadline) {
        if (t.deadline < todayStr) overdue.push(t);
        else if (t.deadline === todayStr) today.push(t);
      }
    }

    const sortByScore = (a: typeof tasks[0], b: typeof tasks[0]) =>
      scoreTask(b, tasks, now) - scoreTask(a, tasks, now);
    today.sort(sortByScore);
    overdue.sort(sortByScore);

    return { todayTasks: today, overdueTasks: overdue, doneTodayTasks: doneToday };
  }, [tasks, todayStr]);

  const totalActive = todayTasks.length + overdueTasks.length;
  const totalDone = doneTodayTasks.length;
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

  if (totalActive === 0 && totalDone === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-[var(--text-primary)]">Nothing scheduled for today!</p>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Use the chat to add tasks or pull from upcoming.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      {(totalActive > 0 || totalDone > 0) && (
        <div>
          <p className="text-sm text-[var(--text-secondary)] mb-1.5">
            {totalDone} of {totalActive + totalDone} tasks complete
          </p>
          <div className="h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent-primary)] rounded-full transition-all duration-500"
              style={{ width: `${totalActive + totalDone > 0 ? (totalDone / (totalActive + totalDone)) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Overdue */}
      {overdueTasks.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--status-overdue)] mb-2">Overdue</h2>
          <div className="space-y-2">
            {overdueTasks.map(t => (
              <TaskCard key={t.id} task={t} subtasks={subtasksMap.get(t.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Today's tasks */}
      {todayTasks.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Due Today</h2>
          <div className="space-y-2">
            {todayTasks.map(t => (
              <TaskCard key={t.id} task={t} subtasks={subtasksMap.get(t.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Done today */}
      {doneTodayTasks.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-muted)] mb-2">Completed Today</h2>
          <div className="space-y-2">
            {doneTodayTasks.map(t => (
              <TaskCard key={t.id} task={t} subtasks={subtasksMap.get(t.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

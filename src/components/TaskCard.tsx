import { useState } from 'react';
import type { Task } from '@/types';
import { useStore, useCategories } from '@/store/TaskStoreContext';
import { TaskEditForm } from './TaskEditForm';

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-[var(--priority-critical)]',
  high: 'bg-[var(--priority-high)]',
  medium: 'bg-[var(--priority-medium)]',
  low: 'bg-[var(--priority-low)]',
};

const ENERGY_LABELS: Record<string, string> = {
  deep_focus: 'Deep Focus',
  routine: 'Routine',
  quick_win: 'Quick Win',
};

function formatEffort(minutes: number | null): string {
  if (minutes === null) return '';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDeadline(deadline: string | null): string {
  if (!deadline) return '';
  const d = new Date(deadline + 'T12:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff <= 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface TaskCardProps {
  task: Task;
  subtasks?: Task[];
}

export function TaskCard({ task, subtasks = [] }: TaskCardProps) {
  const store = useStore();
  const categories = useCategories();
  const [expanded, setExpanded] = useState(false);
  const [completing, setCompleting] = useState(false);
  const isDone = task.status === 'done';
  const deadlineStr = formatDeadline(task.deadline);
  const isOverdue = task.deadline && !isDone && deadlineStr.includes('overdue');

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDone) {
      store.updateTask(task.id, { status: 'todo', completedAt: null });
      return;
    }
    setCompleting(true);
    setTimeout(() => {
      store.completeTask(task.id);
      setCompleting(false);
    }, 300);
  };

  const completedSubtasks = subtasks.filter(s => s.status === 'done').length;
  const catColor = categories.find(c => c.name === task.category)?.color;

  return (
    <div
      style={catColor ? { backgroundColor: catColor + '80' } : undefined}
      className={`group rounded-[var(--radius-md)] ${catColor ? '' : 'bg-[var(--bg-card)]'} shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-200 cursor-pointer ${
        isDone ? 'opacity-60' : ''
      } ${completing ? 'scale-[0.98]' : ''}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-3">
        {/* Top row: checkbox + title + priority */}
        <div className="flex items-start gap-2.5">
          <button
            onClick={handleComplete}
            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-300 ${
              isDone
                ? 'bg-[var(--status-done)] border-[var(--status-done)]'
                : 'border-[var(--text-muted)] hover:border-[var(--accent-primary)]'
            }`}
            aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
          >
            {isDone && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="text-white">
                <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-[var(--font-size-md)] font-medium leading-snug ${isDone ? 'line-through text-[var(--text-muted)]' : ''}`}>
              {task.title}
            </p>
          </div>
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${PRIORITY_COLORS[task.priority]}`} />
        </div>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 ml-[30px] text-[var(--font-size-xs)] text-[var(--text-secondary)]">
          {deadlineStr && (
            <span className={isOverdue ? 'text-[var(--status-overdue)] font-medium' : ''}>
              {'\u{1F4C5}'} {deadlineStr}
            </span>
          )}
          {task.effort !== null && <span>{'\u23F1'} {formatEffort(task.effort)}</span>}
          {task.energyType && <span>{ENERGY_LABELS[task.energyType]}</span>}
        </div>

        {/* Category & tags */}
        {(task.category !== 'Inbox' || task.tags.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5 ml-[30px]">
            {task.category !== 'Inbox' && (
              <span
                className="text-[var(--font-size-xs)] px-1.5 py-0.5 rounded font-medium text-white"
                style={{ backgroundColor: catColor ?? 'var(--bg-secondary)' }}
              >
                {task.category}
              </span>
            )}
            {task.tags.map(tag => (
              <span key={tag} className="text-[var(--font-size-xs)] px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Subtasks summary */}
        {subtasks.length > 0 && (
          <div className="mt-2 ml-[30px]">
            {subtasks.map(st => (
              <div key={st.id} className="flex items-center gap-1.5 text-[var(--font-size-xs)] text-[var(--text-secondary)] py-0.5">
                <span>{st.status === 'done' ? '\u2705' : '\u2610'}</span>
                <span className={st.status === 'done' ? 'line-through text-[var(--text-muted)]' : ''}>{st.title}</span>
                {st.effort !== null && <span className="text-[var(--text-muted)]">({formatEffort(st.effort)})</span>}
              </div>
            ))}
            <p className="text-[var(--font-size-xs)] text-[var(--text-muted)] mt-1">
              {completedSubtasks}/{subtasks.length} subtasks complete
            </p>
          </div>
        )}
      </div>

      {/* Expanded edit form */}
      {expanded && (
        <div className="border-t border-[var(--bg-secondary)] p-3" onClick={e => e.stopPropagation()}>
          <TaskEditForm task={task} onClose={() => setExpanded(false)} />
        </div>
      )}
    </div>
  );
}

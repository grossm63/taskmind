import { useMemo, useState } from 'react';
import { useTasks, useCategories } from '@/store/TaskStoreContext';
import { TaskCard } from '../TaskCard';
import { scoreTask } from '@/engine/priority';
import type { Task, Priority, TaskStatus, EnergyType } from '@/types';

type SortKey = 'score' | 'deadline' | 'created' | 'title';

export function AllTasksView() {
  const tasks = useTasks();
  const categories = useCategories();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [energyFilter, setEnergyFilter] = useState<EnergyType | ''>('');
  const [sortBy, setSortBy] = useState<SortKey>('score');

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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = tasks.filter(t => !t.parentId);

    if (q) {
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.notes.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q)) ||
        t.category.toLowerCase().includes(q)
      );
    }
    if (statusFilter) result = result.filter(t => t.status === statusFilter);
    if (priorityFilter) result = result.filter(t => t.priority === priorityFilter);
    if (categoryFilter) result = result.filter(t => t.category === categoryFilter);
    if (energyFilter) result = result.filter(t => t.energyType === energyFilter);

    const now = new Date();
    switch (sortBy) {
      case 'score':
        result.sort((a, b) => scoreTask(b, tasks, now) - scoreTask(a, tasks, now));
        break;
      case 'deadline':
        result.sort((a, b) => {
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return a.deadline.localeCompare(b.deadline);
        });
        break;
      case 'created':
        result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return result;
  }, [tasks, search, statusFilter, priorityFilter, categoryFilter, energyFilter, sortBy]);

  const selectClass = 'rounded-[var(--radius-sm)] border border-[var(--bg-secondary)] bg-[var(--bg-card)] px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none';

  return (
    <div className="space-y-3">
      {/* Search */}
      <input
        type="text"
        placeholder="Search tasks..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full rounded-[var(--radius-md)] border border-[var(--bg-secondary)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select className={selectClass} value={statusFilter} onChange={e => setStatusFilter(e.target.value as TaskStatus | '')}>
          <option value="">All Status</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
          <option value="deferred">Deferred</option>
          <option value="snoozed">Snoozed</option>
        </select>
        <select className={selectClass} value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as Priority | '')}>
          <option value="">All Priority</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select className={selectClass} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
        <select className={selectClass} value={energyFilter} onChange={e => setEnergyFilter(e.target.value as EnergyType | '')}>
          <option value="">All Energy</option>
          <option value="deep_focus">Deep Focus</option>
          <option value="routine">Routine</option>
          <option value="quick_win">Quick Win</option>
        </select>
        <select className={selectClass} value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)}>
          <option value="score">Sort: Priority Score</option>
          <option value="deadline">Sort: Deadline</option>
          <option value="created">Sort: Newest</option>
          <option value="title">Sort: Title</option>
        </select>
      </div>

      {/* Results */}
      <p className="text-[var(--font-size-xs)] text-[var(--text-muted)]">{filtered.length} tasks</p>
      <div className="space-y-2">
        {filtered.map(t => (
          <TaskCard key={t.id} task={t} subtasks={subtasksMap.get(t.id)} />
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-sm text-[var(--text-muted)] text-center py-8">No tasks match your filters</p>
      )}
    </div>
  );
}

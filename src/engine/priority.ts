import type { Task } from '@/types';

function diffDays(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

export function scoreTask(task: Task, allTasks: Task[], now: Date = new Date(), userEnergy?: string): number {
  if (task.status === 'done' || task.status === 'snoozed') return -Infinity;

  // Normalize to start of day for consistent date comparisons
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let score = 0;

  // Deadline urgency (weight: 3x)
  if (task.deadline) {
    const daysUntil = diffDays(new Date(task.deadline + 'T00:00:00'), today);
    if (daysUntil < 0) score += 30;
    else if (daysUntil === 0) score += 24;
    else if (daysUntil === 1) score += 18;
    else if (daysUntil <= 7) score += 12;
    else score += 3;
  } else {
    score += 6;
  }

  // Priority (weight: 2x)
  const priorityScores: Record<string, number> = { critical: 20, high: 14, medium: 8, low: 2 };
  score += priorityScores[task.priority] ?? 8;

  // Staleness (weight: 1x)
  const daysSinceCreated = diffDays(today, new Date(task.createdAt));
  score += Math.min(Math.max(daysSinceCreated, 0), 10);

  // Energy match (weight: 1x)
  if (userEnergy && task.energyType) {
    if (userEnergy === 'low' && task.energyType === 'quick_win') score += 3;
    if (userEnergy === 'high' && task.energyType === 'deep_focus') score += 3;
  }

  // Dependency penalty
  if (task.dependencies.length > 0) {
    const allDepsComplete = task.dependencies.every(depId =>
      allTasks.find(t => t.id === depId)?.status === 'done'
    );
    if (!allDepsComplete) score -= 100;
  }

  return score;
}

export function getTopTasks(tasks: Task[], count: number = 5, now?: Date, userEnergy?: string): Task[] {
  const activeTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'snoozed');
  const scored = activeTasks.map(t => ({ task: t, score: scoreTask(t, tasks, now, userEnergy) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map(s => s.task);
}

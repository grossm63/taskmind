import { useState } from 'react';
import type { Task, Priority, EnergyType } from '@/types';
import { useStore, useCategories } from '@/store/TaskStoreContext';

interface TaskEditFormProps {
  task: Task;
  onClose: () => void;
}

export function TaskEditForm({ task, onClose }: TaskEditFormProps) {
  const store = useStore();
  const categories = useCategories();
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [category, setCategory] = useState(task.category);
  const [deadline, setDeadline] = useState(task.deadline ?? '');
  const [effort, setEffort] = useState(task.effort?.toString() ?? '');
  const [energyType, setEnergyType] = useState<EnergyType>(task.energyType);
  const [tags, setTags] = useState(task.tags.join(', '));

  const handleSave = () => {
    store.updateTask(task.id, {
      title,
      notes,
      priority,
      category,
      deadline: deadline || null,
      effort: effort ? parseInt(effort, 10) : null,
      energyType,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    });
    onClose();
  };

  const handleDelete = () => {
    store.deleteTask(task.id);
    onClose();
  };

  const fieldClass = 'w-full rounded-[var(--radius-sm)] border border-[var(--bg-secondary)] bg-[var(--bg-card)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]';
  const labelClass = 'block text-[var(--font-size-xs)] font-medium text-[var(--text-secondary)] mb-1';

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Title</label>
        <input className={fieldClass} value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Notes</label>
        <textarea className={`${fieldClass} resize-none`} rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Priority</label>
          <select className={fieldClass} value={priority} onChange={e => setPriority(e.target.value as Priority)}>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Category</label>
          <select className={fieldClass} value={category} onChange={e => setCategory(e.target.value)}>
            {categories.map(c => (
              <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Deadline</label>
          <input type="date" className={fieldClass} value={deadline} onChange={e => setDeadline(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Effort (min)</label>
          <input type="number" className={fieldClass} value={effort} onChange={e => setEffort(e.target.value)} min="0" />
        </div>
        <div>
          <label className={labelClass}>Energy Type</label>
          <select className={fieldClass} value={energyType} onChange={e => setEnergyType(e.target.value as EnergyType)}>
            <option value="deep_focus">Deep Focus</option>
            <option value="routine">Routine</option>
            <option value="quick_win">Quick Win</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Tags (comma-sep)</label>
          <input className={fieldClass} value={tags} onChange={e => setTags(e.target.value)} placeholder="tag1, tag2" />
        </div>
      </div>
      <div className="flex justify-between pt-1">
        <button
          onClick={handleDelete}
          className="text-sm text-[var(--status-overdue)] hover:underline"
        >
          Delete task
        </button>
        <div className="flex gap-2">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
            Cancel
          </button>
          <button onClick={handleSave} className="text-sm px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)]">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

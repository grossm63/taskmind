import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/store/TaskStoreContext';

interface UndoEvent {
  id: number;
  description: string;
}

let nextId = 0;
const listeners = new Set<(event: UndoEvent) => void>();

export function triggerUndo(description: string) {
  const event: UndoEvent = { id: nextId++, description };
  for (const listener of listeners) {
    listener(event);
  }
}

export function UndoToast() {
  const store = useStore();
  const [toast, setToast] = useState<UndoEvent | null>(null);

  useEffect(() => {
    const handler = (event: UndoEvent) => setToast(event);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleUndo = useCallback(() => {
    store.undo();
    setToast(null);
  }, [store]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[var(--bg-card)] shadow-[var(--shadow-lg)] rounded-[var(--radius-md)] px-4 py-3 flex items-center gap-3 z-50 border border-[var(--bg-secondary)] animate-[slideUp_200ms_ease-out]">
      <span className="text-sm text-[var(--text-primary)]">{toast.description}</span>
      <button
        onClick={handleUndo}
        className="text-sm font-medium text-[var(--accent-primary)] hover:underline"
      >
        Undo
      </button>
      <button
        onClick={() => setToast(null)}
        className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] ml-1"
        aria-label="Dismiss"
      >
        {'\u2715'}
      </button>
    </div>
  );
}

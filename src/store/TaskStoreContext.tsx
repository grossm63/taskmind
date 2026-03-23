import { createContext, useContext, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { TaskStore, type SaveStatus } from './TaskStore';
import type { AppState, Task, Category, UserSettings, ChatMessage } from '@/types';

const TaskStoreContext = createContext<TaskStore | null>(null);

export function TaskStoreProvider({ store, children }: { store: TaskStore; children: ReactNode }) {
  const storeRef = useRef(store);
  return (
    <TaskStoreContext.Provider value={storeRef.current}>
      {children}
    </TaskStoreContext.Provider>
  );
}

function useStore(): TaskStore {
  const store = useContext(TaskStoreContext);
  if (!store) throw new Error('useStore must be used within TaskStoreProvider');
  return store;
}

export function useTaskStore(): AppState & { store: TaskStore } {
  const store = useStore();
  const state = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.getState()
  );
  return { ...state, store };
}

export function useTasks(): Task[] {
  const store = useStore();
  return useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.getTasks()
  );
}

export function useCategories(): Category[] {
  const store = useStore();
  return useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.getCategories()
  );
}

export function useSettings(): UserSettings {
  const store = useStore();
  return useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.getSettings()
  );
}

export function useChatHistory(): ChatMessage[] {
  const store = useStore();
  return useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.getChatHistory()
  );
}

export function useSaveStatus(): SaveStatus {
  const store = useStore();
  return useSyncExternalStore(
    (cb) => store.onSaveStatus(cb),
    () => store.getSaveStatus()
  );
}

export { useStore };

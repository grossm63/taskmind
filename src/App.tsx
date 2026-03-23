import { Component, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { TaskStore } from '@/store/TaskStore';
import { TaskStoreProvider } from '@/store/TaskStoreContext';
import { createStorageEngine } from '@/store/storage';
import { LocalStorageEngine } from '@/store/storage/LocalStorageEngine';
import { AppShell } from '@/components/AppShell';

// Error boundary to prevent white-screen crashes
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-8">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Something went wrong</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-4">{this.state.error.message}</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="px-4 py-2 text-sm rounded bg-[var(--accent-primary)] text-white"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const storeRef = useRef<TaskStore | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const engine = createStorageEngine();
        await engine.init();
        const state = await engine.load();
        const store = new TaskStore(state);
        store.setSaveFn((s) => engine.save(s));

        // Save periodically to avoid data loss on crash
        const interval = setInterval(() => store.forceSave(), 30_000);

        // Best-effort save on window close
        const onUnload = () => {
          clearInterval(interval);
          store.forceSave();
        };
        window.addEventListener('beforeunload', onUnload);

        storeRef.current = store;
        setReady(true);
      } catch {
        // If FileSystem API permission denied, fall back to localStorage
        const fallback = new LocalStorageEngine();
        await fallback.init();
        const state = await fallback.load();
        const store = new TaskStore(state);
        store.setSaveFn((s) => fallback.save(s));
        storeRef.current = store;
        setReady(true);
      }
    };
    init();
  }, []);

  if (!ready || !storeRef.current) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-[var(--text-secondary)]">Loading TaskMind...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <TaskStoreProvider store={storeRef.current}>
        <AppShell />
      </TaskStoreProvider>
    </ErrorBoundary>
  );
}

export default App

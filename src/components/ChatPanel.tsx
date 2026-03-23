import { useState, useRef, useEffect, useCallback } from 'react';
import { useTaskStore, useChatHistory } from '@/store/TaskStoreContext';
import { callAI } from '@/engine/ai';
import { VoiceInput } from './VoiceInput';
import { useVoiceOutput } from './VoiceOutput';
import type { TaskAction } from '@/types';

const QUICK_ACTIONS = [
  "What's next?",
  'Morning briefing',
  'Show overdue',
];

const PRIORITY_DOT: Record<string, string> = {
  critical: '\u{1F534}',
  high: '\u{1F7E0}',
  medium: '\u{1F535}',
  low: '\u26AA',
};

export function ChatPanel() {
  const { tasks, categories, settings, store } = useTaskStore();
  const chatHistory = useChatHistory();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { speak, stop: stopSpeech } = useVoiceOutput();

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory.length, scrollToBottom]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setInput('');
    setError(null);

    // Add user message
    store.addChatMessage({ role: 'user', content: text.trim(), actions: [] });

    if (!settings.apiKey) {
      store.addChatMessage({
        role: 'assistant',
        content: 'Please set your Claude API key in settings to enable AI features. Click the gear icon in the header.',
        actions: [],
      });
      return;
    }

    setLoading(true);
    try {
      const response = await callAI(settings.apiKey, tasks, categories, chatHistory, text.trim());

      // Execute actions
      for (const action of response.actions) {
        store.executeAction(action);
      }

      // Add AI message
      store.addChatMessage({
        role: 'assistant',
        content: response.message,
        actions: response.actions,
      });

      // Voice output
      if (response.message) speak(response.message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      store.addChatMessage({
        role: 'assistant',
        content: "I'm having trouble thinking right now. Try again in a moment.",
        actions: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-3">
          {/* Welcome message if no history */}
          {chatHistory.length === 0 && (
            <div className="self-start max-w-[85%] rounded-[var(--radius-lg)] bg-[var(--bg-chat-ai)] px-4 py-3 text-[var(--font-size-base)]">
              <p>Hey! I'm TaskMind — your intelligent task manager.</p>
              <p className="mt-2 text-[var(--text-secondary)]">
                Tell me what's on your plate and I'll help you organize it.
                Try something like: "I need to finish my presentation by Friday,
                buy groceries tomorrow, and eventually clean the garage."
              </p>
            </div>
          )}

          {chatHistory.map(msg => (
            <div
              key={msg.id}
              className={`max-w-[85%] rounded-[var(--radius-lg)] px-4 py-3 text-[var(--font-size-base)] ${
                msg.role === 'user'
                  ? 'self-end bg-[var(--bg-chat-user)]'
                  : 'self-start bg-[var(--bg-chat-ai)]'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {/* Inline action previews */}
              {msg.actions.length > 0 && (
                <div className="mt-2 space-y-1">
                  {msg.actions.map((action, i) => (
                    <ActionPreview key={i} action={action} />
                  ))}
                </div>
              )}
              <span className="block text-[var(--font-size-xs)] text-[var(--text-muted)] mt-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="self-start max-w-[85%] rounded-[var(--radius-lg)] bg-[var(--bg-chat-ai)] px-4 py-3 text-[var(--font-size-base)] text-[var(--text-secondary)]">
              <span className="inline-flex gap-1">
                TaskMind is thinking
                <span className="animate-pulse">...</span>
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="self-start max-w-[85%] rounded-[var(--radius-lg)] bg-red-50 dark:bg-red-900/20 px-4 py-2 text-sm text-[var(--status-overdue)]">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick action chips */}
      {chatHistory.length === 0 && (
        <div className="flex gap-2 px-4 pb-2 flex-wrap">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action}
              onClick={() => sendMessage(action)}
              className="text-xs px-3 py-1.5 rounded-full border border-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              {action}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="p-3 border-t border-[var(--bg-secondary)]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); stopSpeech(); }}
            onKeyDown={handleKeyDown}
            placeholder="Type or speak..."
            disabled={loading}
            className="flex-1 rounded-[var(--radius-md)] border border-[var(--bg-secondary)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] disabled:opacity-50"
          />
          <VoiceInput
            onTranscript={(text) => sendMessage(text)}
            onInterim={(text) => setInput(text)}
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="w-9 h-9 rounded-[var(--radius-sm)] bg-[var(--accent-primary)] text-white flex items-center justify-center hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            aria-label="Send message"
          >
            {'\u27A4'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionPreview({ action }: { action: TaskAction }) {
  const label = (() => {
    switch (action.type) {
      case 'create':
        return `${PRIORITY_DOT[action.data?.priority ?? 'medium'] ?? '\u{1F535}'} Created: ${action.data?.title ?? 'task'}`;
      case 'update':
        return `\u270F\uFE0F Updated task`;
      case 'complete':
        return `\u2705 Completed task`;
      case 'delete':
        return `\u{1F5D1}\uFE0F Deleted task`;
      case 'defer':
        return `\u23ED\uFE0F Deferred to ${action.data?.deadline ?? ''}`;
      case 'snooze':
        return `\u{1F4A4} Snoozed until ${action.data?.snoozedUntil ?? ''}`;
      case 'decompose':
        return `\u{1F4CB} Broken into ${action.subtasks?.length ?? 0} subtasks`;
      case 'create_category':
        return `\u{1F4C1} Created category: ${action.data?.name ?? ''}`;
      default:
        return action.type;
    }
  })();

  return (
    <div className="text-[var(--font-size-xs)] px-2 py-1 rounded bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--bg-secondary)]">
      {label}
    </div>
  );
}

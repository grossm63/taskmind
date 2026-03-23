import { useState, useEffect } from 'react';
import { useTasks, useTaskStore } from '@/store/TaskStoreContext';
import { getTopTasks } from '@/engine/priority';
import { callAI } from '@/engine/ai';

export function WhatNextButton() {
  const tasks = useTasks();
  const { categories, settings, store } = useTaskStore();
  const [idle, setIdle] = useState(false);
  const [loading, setLoading] = useState(false);

  // Track idle time for pulse animation
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const resetIdle = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), 5 * 60 * 1000);
    };
    resetIdle();
    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
    };
  }, []);

  const handleClick = async () => {
    const topTasks = getTopTasks(tasks, 3);
    if (topTasks.length === 0) {
      store.addChatMessage({
        role: 'assistant',
        content: "You're all clear! No active tasks to work on.",
        actions: [],
      });
      return;
    }

    const topTask = topTasks[0];
    const prompt = `The user clicked "What should I do next?". Based on the current task list, recommend the most important task to work on right now and briefly explain why. The top scored task is "${topTask.title}" (priority: ${topTask.priority}, deadline: ${topTask.deadline ?? 'none'}, effort: ${topTask.effort ?? 'unknown'}min). Keep your recommendation to 2-3 sentences.`;

    if (!settings.apiKey) {
      // Fallback: local recommendation without AI
      store.addChatMessage({
        role: 'assistant',
        content: `I'd recommend starting with "${topTask.title}" — it's your highest priority task right now.${topTask.deadline ? ` It's due ${topTask.deadline}.` : ''}${topTask.effort ? ` Estimated effort: ${topTask.effort} minutes.` : ''}`,
        actions: [],
      });
      return;
    }

    setLoading(true);
    try {
      const chatHistory = store.getChatHistory();
      const response = await callAI(settings.apiKey, tasks, categories, chatHistory, prompt);
      store.addChatMessage({
        role: 'assistant',
        content: response.message,
        actions: response.actions,
      });
      for (const action of response.actions) {
        store.executeAction(action);
      }
    } catch {
      const top = topTasks[0];
      store.addChatMessage({
        role: 'assistant',
        content: `I'd suggest working on "${top.title}" next — it scores highest on your priority list.`,
        actions: [],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`fixed bottom-6 right-6 bg-[var(--accent-primary)] text-white px-5 py-3 rounded-full shadow-[var(--shadow-lg)] hover:bg-[var(--accent-hover)] transition-all text-sm font-medium flex items-center gap-2 disabled:opacity-70 z-40 ${
        idle ? 'animate-[pulse_2s_ease-in-out_infinite]' : ''
      }`}
      aria-label="What should I do next?"
    >
      {'\u{1F3AF}'} {loading ? 'Thinking...' : "What's next?"}
    </button>
  );
}

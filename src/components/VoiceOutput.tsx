import { useCallback } from 'react';
import { useSettings } from '@/store/TaskStoreContext';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

export function useVoiceOutput() {
  const settings = useSettings();
  const enabled = settings.voiceOutputEnabled;

  const speak = useCallback((text: string) => {
    if (!synth || !enabled) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    synth.speak(utterance);
  }, [enabled]);

  const stop = useCallback(() => {
    if (synth?.speaking) synth.cancel();
  }, []);

  return { speak, stop, supported: !!synth };
}

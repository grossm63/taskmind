import { useState, useRef, useCallback } from 'react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  disabled?: boolean;
}

const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export function useVoiceSupport() {
  return !!SpeechRecognitionAPI;
}

export function VoiceInput({ onTranscript, onInterim, disabled }: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI || listening) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';

    recognition.onresult = (event: any) => {
      const result = event.results[0];
      const transcript = result[0].transcript;
      if (result.isFinal) {
        onTranscript(transcript);
        setListening(false);
      } else {
        onInterim?.(transcript);
      }
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening, onTranscript, onInterim]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (listening) stopListening();
    else startListening();
  }, [listening, startListening, stopListening]);

  if (!SpeechRecognitionAPI) return null;

  return (
    <button
      onClick={toggle}
      disabled={disabled}
      className={`w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center transition-all ${
        listening
          ? 'bg-[var(--status-overdue)] text-white animate-pulse'
          : 'hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
      } disabled:opacity-50`}
      aria-label={listening ? 'Stop listening' : 'Start voice input'}
    >
      {'\u{1F3A4}'}
    </button>
  );
}

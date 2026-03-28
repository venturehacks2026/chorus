'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'unsupported';

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  lang?: string;
}

export function useVoiceInput({ onTranscript, onInterimTranscript, lang = 'en-US' }: UseVoiceInputOptions) {
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const stoppedManuallyRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition =
      (typeof window !== 'undefined') &&
      (window.SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition);

    if (!SpeechRecognition) {
      setState('unsupported');
    }
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const start = useCallback(() => {
    if (state === 'unsupported') return;
    if (state === 'listening') {
      // Stop manually
      stoppedManuallyRef.current = true;
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognition) { setState('unsupported'); return; }

    setError(null);
    stoppedManuallyRef.current = false;

    const rec = new SpeechRecognition();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    let finalTranscript = '';

    rec.onstart = () => setState('listening');

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      onInterimTranscript?.(interim);
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      setError(event.error === 'not-allowed'
        ? 'Microphone access denied. Allow it in your browser settings.'
        : `Voice error: ${event.error}`
      );
      setState('idle');
    };

    rec.onend = () => {
      setState('idle');
      if (finalTranscript.trim()) {
        onTranscript(finalTranscript.trim());
      }
      finalTranscript = '';
    };

    recognitionRef.current = rec;
    rec.start();
  }, [state, lang, onTranscript, onInterimTranscript]);

  const stop = useCallback(() => {
    stoppedManuallyRef.current = true;
    recognitionRef.current?.stop();
  }, []);

  return { state, error, start, stop };
}

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'unsupported';

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  lang?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecognition = any;

function getSpeechRecognition(): (new () => AnyRecognition) | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useVoiceInput({ onTranscript, onInterimTranscript, lang = 'en-US' }: UseVoiceInputOptions) {
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<AnyRecognition>(null);
  const stoppedManuallyRef = useRef(false);

  useEffect(() => {
    if (!getSpeechRecognition()) {
      setState('unsupported');
    }
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const start = useCallback(() => {
    if (state === 'unsupported') return;
    if (state === 'listening') {
      stoppedManuallyRef.current = true;
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = getSpeechRecognition();
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

    rec.onresult = (event: AnyRecognition) => {
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

    rec.onerror = (event: AnyRecognition) => {
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

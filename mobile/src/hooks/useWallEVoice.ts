import { useCallback, useEffect, useRef, useState } from 'react';
import { requireOptionalNativeModule } from 'expo-modules-core';

type SpeechNative = {
  start: (opts: Record<string, unknown>) => void;
  stop: () => void;
  abort: () => void;
  isRecognitionAvailable: () => boolean;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  addListener: (event: string, cb: (payload: unknown) => void) => { remove: () => void };
};

function getSpeechNative(): SpeechNative | null {
  try {
    return requireOptionalNativeModule('ExpoSpeechRecognition') as SpeechNative | null;
  } catch {
    return null;
  }
}

export function isWallEVoiceSupported(): boolean {
  const mod = getSpeechNative();
  if (!mod) return false;
  try {
    return !!mod.isRecognitionAvailable?.();
  } catch {
    return false;
  }
}

type Options = {
  onFinal: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
  onError?: (message: string) => void;
  /** Restart mic after each utterance (ambient Валли). */
  autoRestart?: boolean;
};

/**
 * Safe voice helper — works only in a native build with expo-speech-recognition.
 * In Expo Go the native module is missing; callers must fall back to text.
 */
export function useWallEVoice({ onFinal, onInterim, onError, autoRestart = true }: Options) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => isWallEVoiceSupported());
  const onFinalRef = useRef(onFinal);
  const onInterimRef = useRef(onInterim);
  const onErrorRef = useRef(onError);
  const pausedRef = useRef(false);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  onFinalRef.current = onFinal;
  onInterimRef.current = onInterim;
  onErrorRef.current = onError;

  const clearRestart = () => {
    if (restartTimer.current) {
      clearTimeout(restartTimer.current);
      restartTimer.current = null;
    }
  };

  const startListening = useCallback(async () => {
    const mod = getSpeechNative();
    if (!mod) {
      onErrorRef.current?.(
        'Голос доступен после установки через Xcode (не Expo Go)'
      );
      return;
    }
    if (pausedRef.current) return;
    try {
      try {
        mod.abort?.();
      } catch {
        // ignore
      }
      const perm = await mod.requestPermissionsAsync();
      if (!perm.granted) {
        onErrorRef.current?.('Нужен доступ к микрофону и распознаванию речи');
        return;
      }
      if (!mod.isRecognitionAvailable()) {
        onErrorRef.current?.(
          'Голос доступен после установки через Xcode (не Expo Go)'
        );
        return;
      }
      mod.start({
        lang: 'ru-RU',
        interimResults: true,
        continuous: false,
        addsPunctuation: false,
      });
      setListening(true);
    } catch {
      setListening(false);
      onErrorRef.current?.(
        'Не удалось запустить распознавание речи'
      );
    }
  }, []);

  const scheduleRestart = useCallback(() => {
    if (!autoRestart || pausedRef.current) return;
    clearRestart();
    restartTimer.current = setTimeout(() => {
      startListening();
    }, 700);
  }, [autoRestart, startListening]);

  useEffect(() => {
    const mod = getSpeechNative();
    if (!mod?.addListener) return;

    const subs = [
      mod.addListener('start', () => setListening(true)),
      mod.addListener('end', () => {
        setListening(false);
        scheduleRestart();
      }),
      mod.addListener('result', (event: unknown) => {
        const e = event as {
          isFinal?: boolean;
          results?: { transcript?: string }[];
        };
        const text = e.results?.[0]?.transcript ?? '';
        if (!text) return;
        if (e.isFinal) onFinalRef.current(text);
        else onInterimRef.current?.(text);
      }),
      mod.addListener('error', (event: unknown) => {
        setListening(false);
        const e = event as { error?: string; message?: string };
        // no-speech / aborted — quietly keep listening
        if (e.error === 'not-allowed') {
          onErrorRef.current?.('Нет разрешения на микрофон / речь');
          return;
        }
        if (e.error === 'no-speech' || e.error === 'aborted' || e.error === 'client') {
          scheduleRestart();
          return;
        }
        scheduleRestart();
      }),
    ];
    return () => {
      clearRestart();
      subs.forEach((s) => s.remove());
    };
  }, [scheduleRestart]);

  const stopListening = useCallback(() => {
    clearRestart();
    const mod = getSpeechNative();
    try {
      mod?.abort?.();
    } catch {
      // ignore
    }
    setListening(false);
  }, []);

  /** Pause ambient loop (e.g. leaving Home). */
  const pauseAmbient = useCallback(() => {
    pausedRef.current = true;
    stopListening();
  }, [stopListening]);

  /** Resume ambient loop. */
  const resumeAmbient = useCallback(() => {
    pausedRef.current = false;
    startListening();
  }, [startListening]);

  return {
    listening,
    supported,
    startListening,
    stopListening,
    pauseAmbient,
    resumeAmbient,
  };
}

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
  onEnd?: () => void;
  onError?: (message: string) => void;
  /** Restart mic after each utterance (ambient Валли). */
  autoRestart?: boolean;
};

const RESTART_MS = 1400;
const START_GAP_MS = 220;

/**
 * Safe voice helper — works only in a native build with expo-speech-recognition.
 * In Expo Go the native module is missing; callers must fall back to text.
 */
export function useWallEVoice({ onFinal, onInterim, onEnd, onError, autoRestart = true }: Options) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => isWallEVoiceSupported());
  const onFinalRef = useRef(onFinal);
  const onInterimRef = useRef(onInterim);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);
  const pausedRef = useRef(false);
  const listeningRef = useRef(false);
  const startingRef = useRef(false);
  const interimRef = useRef('');
  const finalSeenRef = useRef(false);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartGen = useRef(0);
  useEffect(() => {
    onFinalRef.current = onFinal;
    onInterimRef.current = onInterim;
    onEndRef.current = onEnd;
    onErrorRef.current = onError;
  }, [onFinal, onInterim, onEnd, onError]);

  const clearRestart = useCallback(() => {
    restartGen.current += 1;
    if (restartTimer.current) {
      clearTimeout(restartTimer.current);
      restartTimer.current = null;
    }
  }, []);

  const startListening = useCallback(async (opts?: { force?: boolean }) => {
    const mod = getSpeechNative();
    if (!mod) {
      onErrorRef.current?.(
        'Голос доступен после установки через Xcode (не Expo Go)'
      );
      return;
    }
    if (opts?.force) {
      pausedRef.current = false;
    }
    if (pausedRef.current) return;
    if (startingRef.current || listeningRef.current) return;

    startingRef.current = true;
    clearRestart();
    try {
      try {
        mod.stop?.();
      } catch {
        // ignore
      }
      await new Promise((r) => setTimeout(r, START_GAP_MS));
      if (pausedRef.current) return;

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
      if (pausedRef.current) return;

      mod.start({
        lang: 'ru-RU',
        interimResults: true,
        continuous: false,
        addsPunctuation: false,
      });
      listeningRef.current = true;
      setListening(true);
    } catch {
      listeningRef.current = false;
      setListening(false);
      onErrorRef.current?.('Не удалось запустить распознавание речи');
    } finally {
      startingRef.current = false;
    }
  }, [clearRestart]);

  const scheduleRestart = useCallback(() => {
    if (!autoRestart || pausedRef.current) return;
    const gen = restartGen.current + 1;
    restartGen.current = gen;
    if (restartTimer.current) clearTimeout(restartTimer.current);
    restartTimer.current = setTimeout(() => {
      if (gen !== restartGen.current || pausedRef.current) return;
      void startListening();
    }, RESTART_MS);
  }, [autoRestart, startListening]);

  useEffect(() => {
    const mod = getSpeechNative();
    if (!mod?.addListener) return;

    const subs = [
      mod.addListener('start', () => {
        listeningRef.current = true;
        interimRef.current = '';
        finalSeenRef.current = false;
        setListening(true);
      }),
      mod.addListener('end', () => {
        listeningRef.current = false;
        setListening(false);
        // Some iOS sessions end after interim text without emitting isFinal.
        if (!pausedRef.current && !finalSeenRef.current && interimRef.current.trim()) {
          finalSeenRef.current = true;
          onFinalRef.current(interimRef.current.trim());
        }
        interimRef.current = '';
        onEndRef.current?.();
        scheduleRestart();
      }),
      mod.addListener('result', (event: unknown) => {
        const e = event as {
          isFinal?: boolean;
          results?: { transcript?: string }[];
        };
        const text = e.results?.[0]?.transcript ?? '';
        if (!text) return;
        if (e.isFinal) {
          if (finalSeenRef.current) return;
          finalSeenRef.current = true;
          interimRef.current = '';
          onFinalRef.current(text);
        } else if (!finalSeenRef.current) {
          interimRef.current = text;
          onInterimRef.current?.(text);
        }
      }),
      mod.addListener('error', (event: unknown) => {
        listeningRef.current = false;
        interimRef.current = '';
        setListening(false);
        const e = event as { error?: string; message?: string };
        if (e.error === 'not-allowed') {
          onErrorRef.current?.('Нет разрешения на микрофон / речь');
          return;
        }
        // Quietly recover — don't spam the UI on no-speech / aborted
        if (
          e.error === 'no-speech' ||
          e.error === 'aborted' ||
          e.error === 'client' ||
          e.error === 'busy'
        ) {
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
  }, [clearRestart, scheduleRestart]);

  const stopListening = useCallback(() => {
    clearRestart();
    const mod = getSpeechNative();
    try {
      mod?.stop?.();
    } catch {
      // ignore
    }
    listeningRef.current = false;
    setListening(false);
  }, [clearRestart]);

  /** Pause ambient loop (e.g. leaving Home / while API runs). */
  const pauseAmbient = useCallback(() => {
    pausedRef.current = true;
    stopListening();
  }, [stopListening]);

  /** Resume ambient loop — always clears pause so the mic button works. */
  const resumeAmbient = useCallback(() => {
    pausedRef.current = false;
    if (listeningRef.current || startingRef.current) return;
    void startListening({ force: true });
  }, [startListening]);

  return {
    listening,
    supported,
    startListening: () => startListening({ force: true }),
    stopListening,
    pauseAmbient,
    resumeAmbient,
  };
}

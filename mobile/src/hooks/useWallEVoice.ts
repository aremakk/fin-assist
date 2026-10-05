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
};

/**
 * Safe voice helper — works only in a native build with expo-speech-recognition.
 * In Expo Go the native module is missing; callers must fall back to text.
 */
export function useWallEVoice({ onFinal, onInterim, onError }: Options) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => isWallEVoiceSupported());
  const onFinalRef = useRef(onFinal);
  const onInterimRef = useRef(onInterim);
  const onErrorRef = useRef(onError);
  onFinalRef.current = onFinal;
  onInterimRef.current = onInterim;
  onErrorRef.current = onError;

  useEffect(() => {
    const mod = getSpeechNative();
    if (!mod?.addListener) return;

    const subs = [
      mod.addListener('start', () => setListening(true)),
      mod.addListener('end', () => setListening(false)),
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
        if (e.error === 'not-allowed') {
          onErrorRef.current?.('Нет разрешения на микрофон / речь');
        }
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  const stopListening = useCallback(() => {
    const mod = getSpeechNative();
    try {
      mod?.abort?.();
    } catch {
      // ignore
    }
    setListening(false);
  }, []);

  const startListening = useCallback(async () => {
    const mod = getSpeechNative();
    if (!mod) {
      onErrorRef.current?.(
        'Голос доступен после установки через Xcode (не Expo Go)'
      );
      return;
    }
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
        'Голос доступен после установки через Xcode (не Expo Go)'
      );
    }
  }, []);

  return { listening, supported, startListening, stopListening };
}

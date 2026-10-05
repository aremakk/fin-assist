import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAssistant } from '../store/AssistantContext';

/** Loads Валли hints + proactive alerts; on Home starts listening when voice is available. */
export function useAssistantScreen(screen: string) {
  const { loadHints, refreshProactive, startListening, stopListening, voiceAvailable } =
    useAssistant();

  useFocusEffect(
    useCallback(() => {
      loadHints(screen);
      refreshProactive();
      if (screen === 'Home' && voiceAvailable) {
        const t = setTimeout(() => {
          startListening();
        }, 500);
        return () => {
          clearTimeout(t);
          stopListening();
        };
      }
      return () => stopListening();
    }, [loadHints, refreshProactive, screen, startListening, stopListening, voiceAvailable])
  );
}

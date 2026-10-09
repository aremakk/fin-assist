import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAssistant } from '../store/AssistantContext';

/** Loads Валли hints + proactive alerts; ambient listen on Home. */
export function useAssistantScreen(screen: string) {
  const { loadHints, refreshProactive, pauseAmbient, resumeAmbient, voiceAvailable } =
    useAssistant();

  useFocusEffect(
    useCallback(() => {
      loadHints(screen);
      refreshProactive();
      if (screen === 'Home' && voiceAvailable) {
        const t = setTimeout(() => resumeAmbient(), 400);
        return () => {
          clearTimeout(t);
          pauseAmbient();
        };
      }
      pauseAmbient();
      return () => pauseAmbient();
    }, [loadHints, refreshProactive, screen, resumeAmbient, pauseAmbient, voiceAvailable])
  );
}

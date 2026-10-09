import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { CommonActions, NavigationContainerRef } from '@react-navigation/native';
import { insightsApi } from '../api';
import type { AssistAction, ProactiveAlert, TransactionDraft } from '../types';
import type { RootStackParamList } from '../navigation/types';
import { getErrorMessage } from '../utils/format';
import { lightHaptic, successHaptic } from '../utils/haptics';
import {
  looksLikeTransactionCommand,
  parseWallECommand,
  toAssistRecordMessage,
} from '../utils/wallE';
import { useWallEVoice } from '../hooks/useWallEVoice';

export type { TransactionDraft };

type PendingConfirm = {
  draft: TransactionDraft;
};

type AssistOptions = {
  autoConfirm?: boolean;
};

type AssistantContextValue = {
  screen: string;
  setScreen: (screen: string) => void;
  hints: string[];
  reply: string | null;
  alerts: ProactiveAlert[];
  pendingConfirm: PendingConfirm | null;
  composerOpen: boolean;
  busy: boolean;
  error: string | null;
  listening: boolean;
  wallEActive: boolean;
  manualVoiceActive: boolean;
  transcript: string;
  voiceAvailable: boolean;
  setNavigationRef: (ref: NavigationContainerRef<RootStackParamList> | null) => void;
  refreshProactive: () => Promise<void>;
  loadHints: (screen: string) => Promise<void>;
  runAssist: (message: string, opts?: AssistOptions) => Promise<void>;
  confirmCreate: () => Promise<void>;
  dismissConfirm: () => void;
  dismissAlert: (id: string) => void;
  setComposerOpen: (open: boolean) => void;
  applyAction: (action: AssistAction) => void;
  startListening: () => Promise<void>;
  stopListening: () => void;
  pauseAmbient: () => void;
  resumeAmbient: () => void;
  /** Mic button: hard stop ambient + wake session. */
  stopVoice: () => void;
  /** Mic button: start listening again. */
  startVoice: () => void;
};

const AssistantContext = createContext<AssistantContextValue | null>(null);

const TAB_ROUTES = new Set(['Home', 'Transactions', 'Stats', 'Insights', 'Profile']);
const STACK_ROUTES = new Set(['TransactionForm', 'Wallets', 'Categories']);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const navRef = useRef<NavigationContainerRef<RootStackParamList> | null>(null);
  const [screen, setScreen] = useState('Home');
  const [hints, setHints] = useState<string[]>([]);
  const [reply, setReply] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<ProactiveAlert[]>([]);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallEActive, setWallEActive] = useState(false);
  const [manualVoiceActive, setManualVoiceActive] = useState(false);
  const [transcript, setTranscript] = useState('');
  const dismissed = useRef<Set<string>>(new Set());
  const wallEActiveRef = useRef(false);
  const manualVoiceRef = useRef(false);
  const wakeHapticPendingRef = useRef(false);
  const handlingRef = useRef(false);
  const busyRef = useRef(false);
  const screenRef = useRef(screen);
  useEffect(() => {
    screenRef.current = screen;
    wallEActiveRef.current = wallEActive;
    busyRef.current = busy;
  }, [screen, wallEActive, busy]);

  const setNavigationRef = useCallback((ref: NavigationContainerRef<RootStackParamList> | null) => {
    navRef.current = ref;
  }, []);

  const navigateTo = useCallback((route: string) => {
    const nav = navRef.current;
    if (!nav) return;
    if (TAB_ROUTES.has(route)) {
      nav.dispatch(
        CommonActions.navigate({
          name: 'MainTabs',
          params: { screen: route },
        })
      );
      return;
    }
    if (STACK_ROUTES.has(route)) {
      if (route === 'TransactionForm') nav.navigate('TransactionForm', {});
      else if (route === 'Wallets') nav.navigate('Wallets');
      else if (route === 'Categories') nav.navigate('Categories');
    }
  }, []);

  const applyAction = useCallback(
    (action: AssistAction) => {
      if (action.type === 'NAVIGATE' && action.route) {
        navigateTo(action.route);
      } else if (action.type === 'CREATE_TRANSACTION' && action.draft) {
        setPendingConfirm({ draft: action.draft });
      } else if (action.type === 'TIP' && action.text) {
        setHints((prev) => [action.text!, ...prev].slice(0, 3));
      }
    },
    [navigateTo]
  );

  const refreshProactive = useCallback(async () => {
    try {
      const res = await insightsApi.proactive();
      setAlerts((res.alerts || []).filter((a) => !dismissed.current.has(a.id)));
    } catch {
      // soft-fail
    }
  }, []);

  const loadHints = useCallback(async (nextScreen: string) => {
    setScreen(nextScreen);
    try {
      const res = await insightsApi.assist({ screen: nextScreen });
      setHints(res.hints?.length ? res.hints : res.reply ? [res.reply] : []);
      setReply(res.reply || null);
      (res.actions || [])
        .filter((a) => a.type === 'TIP')
        .slice(0, 1)
        .forEach((a) => {
          if (a.text) {
            setHints((prev) => Array.from(new Set([a.text!, ...prev])).slice(0, 3));
          }
        });
    } catch {
      // soft-fail
    }
  }, []);

  const confirmDraft = useCallback(async (draft: TransactionDraft) => {
    const amount = Number(draft.amount);
    if (!Number.isFinite(amount) || amount < 0.01) {
      throw new Error('Не поняла сумму');
    }
    const res = await insightsApi.confirmAssist({
      type: 'CREATE_TRANSACTION',
      draft: {
        amount,
        type: draft.type || 'EXPENSE',
        note: draft.note || undefined,
        categoryId: draft.categoryId || undefined,
        walletId: draft.walletId || undefined,
      },
    });
    setReply(res.reply);
    setHints([res.reply]);
    setPendingConfirm(null);
    void successHaptic();
    await refreshProactive();
  }, [refreshProactive]);

  const runAssist = useCallback(
    async (message: string, opts?: AssistOptions) => {
      const text = message.trim();
      if (!text || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setError(null);
      try {
        const primary = opts?.autoConfirm ? toAssistRecordMessage(text) : text;
        let res = await insightsApi.assist({ message: primary, screen: screenRef.current });
        let actions = res.actions || [];

        // Voice: if model/backend skipped CREATE, retry once with explicit «запиши»
        if (
          opts?.autoConfirm &&
          looksLikeTransactionCommand(text) &&
          !actions.some((a) => a.type === 'CREATE_TRANSACTION' && a.draft)
        ) {
          const retryMsg = primary.startsWith('запиши') ? primary : `запиши ${text}`;
          if (retryMsg !== primary) {
            res = await insightsApi.assist({ message: retryMsg, screen: screenRef.current });
            actions = res.actions || [];
          }
        }

        setReply(res.reply);
        if (res.hints?.length) setHints(res.hints);
        if (actions.length === 0 && res.reply) {
          setHints([res.reply]);
        }

        let created = false;
        for (const action of actions) {
          if (opts?.autoConfirm && action.type === 'CREATE_TRANSACTION' && action.draft) {
            await confirmDraft(action.draft);
            created = true;
          } else {
            applyAction(action);
          }
        }

        if (opts?.autoConfirm && looksLikeTransactionCommand(text) && !created) {
          setError(
            'Услышала, но не записала. Проверьте кошелёк или скажите: «Валли, запиши 2000 на такси»'
          );
        }
        setComposerOpen(false);
      } catch (e) {
        setError(getErrorMessage(e));
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [applyAction, confirmDraft]
  );

  const confirmCreate = useCallback(async () => {
    if (!pendingConfirm || busy) return;
    setBusy(true);
    setError(null);
    try {
      await confirmDraft(pendingConfirm.draft);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [busy, confirmDraft, pendingConfirm]);

  const dismissConfirm = useCallback(() => setPendingConfirm(null), []);

  const dismissAlert = useCallback((id: string) => {
    dismissed.current.add(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleSpokenRef = useRef<(spoken: string) => void>(() => {});
  const pauseAmbientRef = useRef(() => {});
  const resumeAmbientRef = useRef(() => {});

  const {
    listening,
    supported,
    startListening,
    stopListening,
    pauseAmbient,
    resumeAmbient,
  } = useWallEVoice({
    onFinal: (text) => {
      setTranscript(text);
      handleSpokenRef.current(text);
    },
    onInterim: setTranscript,
    onEnd: () => {
      if (wakeHapticPendingRef.current) {
        wakeHapticPendingRef.current = false;
        void lightHaptic();
      }
    },
    onError: setError,
    autoRestart: true,
  });

  useEffect(() => {
    pauseAmbientRef.current = pauseAmbient;
    resumeAmbientRef.current = resumeAmbient;
  }, [pauseAmbient, resumeAmbient]);

  const handleSpoken = useCallback(
    async (spoken: string) => {
      if (handlingRef.current || busyRef.current) return;
      const trimmed = spoken.trim();
      if (!trimmed) return;

      const { woke, command } = parseWallECommand(trimmed);
      const money = looksLikeTransactionCommand(trimmed) || looksLikeTransactionCommand(command);
      const active = wallEActiveRef.current || manualVoiceRef.current;

      // Ambient without wake: still accept clear money phrases (was the main “hears but ignores” bug)
      if (!woke && !active && !money) return;

      handlingRef.current = true;
      pauseAmbientRef.current();
      try {
        if (woke && !command && !money) {
          setWallEActive(true);
          wallEActiveRef.current = true;
          setReply('Слушаю, Валли на связи.');
          setHints(['Скажите сумму: «2000 на такси»']);
          setError(null);
          // Haptic after mic fully stopped (iOS blocks taptic during capture)
          setTimeout(() => void lightHaptic(), 280);
          setTimeout(() => {
            if (screenRef.current === 'Home') resumeAmbientRef.current();
          }, 600);
          return;
        }

        const payload = (command || trimmed).trim();
        if (payload.length < 2) {
          if (screenRef.current === 'Home') resumeAmbientRef.current();
          return;
        }

        if (!looksLikeTransactionCommand(payload) && !active && !woke) {
          if (screenRef.current === 'Home') resumeAmbientRef.current();
          return;
        }

        if (!looksLikeTransactionCommand(payload) && (active || woke)) {
          setHints(['Не расслышала сумму. Например: 2000 на такси']);
          setError(null);
          if (screenRef.current === 'Home') resumeAmbientRef.current();
          return;
        }

        setWallEActive(true);
        wallEActiveRef.current = true;
        await runAssist(payload, { autoConfirm: true });
        manualVoiceRef.current = false;
        setManualVoiceActive(false);
        setWallEActive(false);
        wallEActiveRef.current = false;
        setTimeout(() => void lightHaptic(), 200);
        if (screenRef.current === 'Home') resumeAmbientRef.current();
      } catch (e) {
        setError(getErrorMessage(e));
        if (screenRef.current === 'Home') resumeAmbientRef.current();
      } finally {
        handlingRef.current = false;
      }
    },
    [runAssist]
  );

  useEffect(() => {
    handleSpokenRef.current = handleSpoken;
  }, [handleSpoken]);

  const stopVoice = useCallback(() => {
    manualVoiceRef.current = false;
    setManualVoiceActive(false);
    wakeHapticPendingRef.current = false;
    setWallEActive(false);
    wallEActiveRef.current = false;
    setTranscript('');
    pauseAmbient();
  }, [pauseAmbient]);

  const startVoice = useCallback(() => {
    manualVoiceRef.current = true;
    setManualVoiceActive(true);
    resumeAmbient();
  }, [resumeAmbient]);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active' && screenRef.current === 'Home' && supported) {
        resumeAmbient();
      } else if (state !== 'active') {
        pauseAmbient();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [pauseAmbient, resumeAmbient, supported]);

  const value = useMemo(
    () => ({
      screen,
      setScreen,
      hints,
      reply,
      alerts,
      pendingConfirm,
      composerOpen,
      busy,
      error,
      listening,
      wallEActive,
      manualVoiceActive,
      transcript,
      voiceAvailable: supported,
      setNavigationRef,
      refreshProactive,
      loadHints,
      runAssist,
      confirmCreate,
      dismissConfirm,
      dismissAlert,
      setComposerOpen,
      applyAction,
      startListening,
      stopListening,
      pauseAmbient,
      resumeAmbient,
      stopVoice,
      startVoice,
    }),
    [
      screen,
      hints,
      reply,
      alerts,
      pendingConfirm,
      composerOpen,
      busy,
      error,
      listening,
      wallEActive,
      manualVoiceActive,
      transcript,
      supported,
      setNavigationRef,
      refreshProactive,
      loadHints,
      runAssist,
      confirmCreate,
      dismissConfirm,
      dismissAlert,
      applyAction,
      startListening,
      stopListening,
      pauseAmbient,
      resumeAmbient,
      stopVoice,
      startVoice,
    ]
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error('useAssistant must be used within AssistantProvider');
  return ctx;
}

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
import { parseWallECommand } from '../utils/wallE';
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
  const [transcript, setTranscript] = useState('');
  const dismissed = useRef<Set<string>>(new Set());
  const wallEActiveRef = useRef(false);
  const handlingRef = useRef(false);
  const screenRef = useRef(screen);
  screenRef.current = screen;
  wallEActiveRef.current = wallEActive;

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
    const res = await insightsApi.confirmAssist({
      type: 'CREATE_TRANSACTION',
      draft: {
        amount: Number(draft.amount),
        type: draft.type,
        note: draft.note || undefined,
        categoryId: draft.categoryId || undefined,
        walletId: draft.walletId || undefined,
      },
    });
    setReply(res.reply);
    setHints([res.reply]);
    setPendingConfirm(null);
    await refreshProactive();
  }, [refreshProactive]);

  const runAssist = useCallback(
    async (message: string, opts?: AssistOptions) => {
      const text = message.trim();
      if (!text || busy) return;
      setBusy(true);
      setError(null);
      try {
        const res = await insightsApi.assist({ message: text, screen: screenRef.current });
        setReply(res.reply);
        if (res.hints?.length) setHints(res.hints);
        const actions = res.actions || [];
        if (actions.length === 0 && res.reply) {
          setHints([res.reply]);
        }
        for (const action of actions) {
          if (opts?.autoConfirm && action.type === 'CREATE_TRANSACTION' && action.draft) {
            await confirmDraft(action.draft);
          } else {
            applyAction(action);
          }
        }
        setComposerOpen(false);
      } catch (e) {
        setError(getErrorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [applyAction, busy, confirmDraft]
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

  const handleSpoken = useCallback(
    async (spoken: string) => {
      if (handlingRef.current) return;
      const { woke, command } = parseWallECommand(spoken);
      if (!woke && !wallEActiveRef.current) return;

      handlingRef.current = true;
      try {
        if (woke) {
          setWallEActive(true);
          wallEActiveRef.current = true;
          if (!command) {
            setReply('Слушаю, Валли на связи.');
            setHints(['Скажите, что записать. Например: 2000 на такси']);
            return;
          }
          await runAssist(command, { autoConfirm: true });
          setWallEActive(false);
          wallEActiveRef.current = false;
          return;
        }
        if (wallEActiveRef.current && spoken.trim()) {
          await runAssist(spoken.trim(), { autoConfirm: true });
          setWallEActive(false);
          wallEActiveRef.current = false;
        }
      } finally {
        handlingRef.current = false;
      }
    },
    [runAssist]
  );

  const { listening, supported, startListening, stopListening } = useWallEVoice({
    onFinal: (text) => {
      setTranscript(text);
      handleSpoken(text);
    },
    onInterim: setTranscript,
    onError: setError,
  });

  // After wake-only «Валли», listen again for the command
  useEffect(() => {
    if (wallEActive && !listening && !busy && reply === 'Слушаю, Валли на связи.') {
      const t = setTimeout(() => {
        startListening();
      }, 450);
      return () => clearTimeout(t);
    }
  }, [wallEActive, listening, busy, reply, startListening]);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active' && screenRef.current === 'Home' && supported) {
        setTimeout(() => startListening(), 600);
      } else if (state !== 'active') {
        stopListening();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [startListening, stopListening, supported]);

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
    ]
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error('useAssistant must be used within AssistantProvider');
  return ctx;
}

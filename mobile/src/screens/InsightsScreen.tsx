import React, { useCallback, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { insightsApi } from '../api';
import { ErrorText, Loading, Screen } from '../components/ui';
import type { AnalyzeInsight } from '../types';
import { getErrorMessage, monthRange } from '../utils/format';
import { colors, spacing } from '../utils/theme';

type ChatItem = { id: string; role: 'user' | 'assistant'; text: string; bullets?: string[] };

const monthLabel = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(new Date());

export function InsightsScreen() {
  const [loadingReport, setLoadingReport] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AnalyzeInsight | null>(null);
  const [question, setQuestion] = useState('');
  const [chat, setChat] = useState<ChatItem[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  const loadAnalyze = useCallback(async (force = false) => {
    try {
      setError(null);
      if (force) setAnalyzing(true);
      else setLoadingReport(true);
      const { from, to } = monthRange();
      const data = await insightsApi.analyze({ from, to });
      setReport(data);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoadingReport(false);
      setAnalyzing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAnalyze(false);
    }, [loadAnalyze])
  );

  const ask = async () => {
    const q = question.trim();
    if (!q || asking) return;
    setAsking(true);
    setError(null);
    setQuestion('');
    const userId = `u-${Date.now()}`;
    setChat((prev) => [...prev, { id: userId, role: 'user', text: q }]);
    try {
      const { from, to } = monthRange();
      const res = await insightsApi.ask({ question: q, from, to });
      setChat((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: res.answer,
          bullets: res.bullets,
        },
      ]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (e) {
      setError(getErrorMessage(e));
      setChat((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: 'assistant', text: getErrorMessage(e) },
      ]);
    } finally {
      setAsking(false);
    }
  };

  if (loadingReport && !report) return <Loading />;

  return (
    <Screen style={styles.screen} safeTop>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={12}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.kicker}>ИИ / {monthLabel.toUpperCase()}</Text>
          <Text style={styles.title}>Анализ.{`\n`}По делу</Text>
          <ErrorText>{error}</ErrorText>

          <View style={styles.report}>
            <View style={styles.reportTop}>
              <Text style={styles.reportLabel}>ОТЧЁТ ЗА МЕСЯЦ</Text>
              <Pressable onPress={() => loadAnalyze(true)} disabled={analyzing}>
                <Text style={styles.refresh}>{analyzing ? '…' : 'Обновить'}</Text>
              </Pressable>
            </View>
            {report ? (
              <>
                <Text style={styles.headline}>{report.headline || 'Ваш месяц'}</Text>
                <Text style={styles.summary}>{report.summary}</Text>
                {report.highlights?.length ? (
                  <View style={styles.block}>
                    <Text style={styles.blockTitle}>Главное</Text>
                    {report.highlights.map((h) => (
                      <Text key={h} style={styles.bullet}>
                        · {h}
                      </Text>
                    ))}
                  </View>
                ) : null}
                {report.risks?.length ? (
                  <View style={styles.block}>
                    <Text style={styles.blockTitle}>Риски</Text>
                    {report.risks.map((h) => (
                      <Text key={h} style={styles.bulletRisk}>
                        · {h}
                      </Text>
                    ))}
                  </View>
                ) : null}
                {report.tips?.length ? (
                  <View style={styles.block}>
                    <Text style={styles.blockTitle}>Советы</Text>
                    {report.tips.map((h) => (
                      <Text key={h} style={styles.bullet}>
                        · {h}
                      </Text>
                    ))}
                  </View>
                ) : null}
                {report.topCategories?.length ? (
                  <Text style={styles.cats}>Топ: {report.topCategories.join(' · ')}</Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.summary}>Нет отчёта. Нажмите «Обновить».</Text>
            )}
          </View>

          <Text style={styles.chatTitle}>Спросить ИИ</Text>
          {chat.length === 0 ? (
            <Text style={styles.chatHint}>Например: «На что я больше всего трачу?»</Text>
          ) : null}
          {chat.map((item) => (
            <View
              key={item.id}
              style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleAi]}
            >
              <Text style={[styles.bubbleText, item.role === 'user' && styles.bubbleTextUser]}>
                {item.text}
              </Text>
              {item.bullets?.map((b) => (
                <Text key={b} style={styles.bubbleBullet}>
                  · {b}
                </Text>
              ))}
            </View>
          ))}
        </ScrollView>

        <View style={styles.composer}>
          <View style={styles.composerRow}>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="Вопрос о ваших финансах…"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              editable={!asking}
              onSubmitEditing={ask}
              returnKeyType="send"
            />
            <Pressable
              onPress={ask}
              disabled={asking || !question.trim()}
              style={({ pressed }) => [
                styles.sendBtn,
                (asking || !question.trim()) && styles.sendBtnDisabled,
                pressed && !asking && !!question.trim() && styles.sendBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Спросить"
            >
              <Text style={styles.sendArrow}>{asking ? '…' : '→'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0, flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 24 },
  kicker: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginBottom: 10 },
  title: { color: colors.text, fontSize: 40, lineHeight: 42, fontWeight: '900', letterSpacing: -2.4, marginBottom: 18 },
  report: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  reportLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  refresh: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  headline: { color: colors.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.8, marginBottom: 10 },
  summary: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginBottom: 14 },
  block: { marginBottom: 12 },
  blockTitle: { color: colors.text, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginBottom: 6 },
  bullet: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginBottom: 2 },
  bulletRisk: { color: colors.expense, fontSize: 14, lineHeight: 21, marginBottom: 2 },
  cats: { color: colors.primary, fontSize: 12, fontWeight: '700', marginTop: 4 },
  chatTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 8 },
  chatHint: { color: colors.textMuted, fontSize: 13, marginBottom: 12 },
  bubble: { borderRadius: 18, padding: 14, marginBottom: 10, maxWidth: '92%' },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  bubbleAi: { alignSelf: 'flex-start', backgroundColor: colors.surfaceRaised },
  bubbleText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: colors.ink, fontWeight: '600' },
  bubbleBullet: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  composer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.35,
  },
  sendBtnPressed: {
    opacity: 0.75,
  },
  sendArrow: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 22,
  },
});

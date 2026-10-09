import React, { useCallback, useState, useMemo } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { KeyboardScrollView } from '../components/KeyboardScreen';
import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { insightsApi, statsApi, walletsApi } from '../api';
import { ErrorText, Loading, Screen, brandRefreshProps } from '../components/ui';
import { AssistantBanner, AssistantHintCard } from '../components/Assistant';
import { BrandRefreshOverlay } from '../components/BrandLoader';
import { useAssistantScreen } from '../hooks/useAssistantScreen';
import { useBrandPullRefresh } from '../hooks/useBrandPullRefresh';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import type { AnalyzeInsight, Summary, Wallet } from '../types';
import { DEFAULT_CURRENCY, formatMoney, getErrorMessage, monthRange } from '../utils/format';
import { spacing } from '../utils/theme';
import { useTheme } from '../store/ThemeContext';

const monthLabel = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(new Date());

type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function HomeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  screen: { padding: 0 },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 36 },
  topline: { flexDirection: 'row', alignItems: 'center', marginBottom: 34 },
  brand: { color: colors.text, fontSize: 12, fontWeight: '900', letterSpacing: 1, flex: 1 },
  brandEdition: { color: colors.textMuted, fontSize: 8, fontWeight: '600', letterSpacing: 0.6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  headingRow: { flexDirection: 'row', marginBottom: 26 },
  eyebrow: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },
  heading: { color: colors.text, fontSize: 45, lineHeight: 47, fontWeight: '900', letterSpacing: -2.9 },
  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    padding: 24,
    minHeight: 232,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  orbitOuter: {
    position: 'absolute',
    width: 270,
    height: 270,
    borderRadius: 135,
    borderColor: colors.onPrimaryMuted,
    borderWidth: 1,
    right: -105,
    top: -90,
  },
  orbitInner: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderColor: colors.onPrimaryMuted,
    borderWidth: 1,
    right: -55,
    top: -40,
  },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  balanceEyebrow: { color: colors.ink, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  walletName: { color: colors.ink, fontSize: 11, fontWeight: '700', maxWidth: '45%' },
  balance: {
    color: colors.ink,
    fontSize: 42,
    lineHeight: 50,
    fontWeight: '900',
    letterSpacing: -2.5,
    marginTop: 28,
  },
  balanceBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  balanceCaption: { color: colors.onPrimaryMuted, fontSize: 12, fontWeight: '700' },
  balanceSymbol: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceSymbolText: { color: colors.primary, fontSize: 23, lineHeight: 27 },
  metrics: { flexDirection: 'row', gap: 10, marginTop: 10 },
  metric: {
    flex: 1,
    minWidth: 0,
    borderRadius: 22,
    padding: 17,
    minHeight: 132,
    justifyContent: 'space-between',
  },
  incomeMetric: { backgroundColor: colors.violetDeep },
  expenseMetric: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between' },
  metricIndex: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  metricArrow: { color: colors.violet, fontSize: 18, lineHeight: 18 },
  metricValue: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: -1 },
  metricCaption: { color: colors.textMuted, fontSize: 11 },
  assistantBlock: { marginTop: 14 },
  aiTeaser: {
    marginTop: 12,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aiTeaserIndex: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  aiTeaserHeadline: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  aiTeaserSummary: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 10 },
  aiTeaserLink: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  pressed: { opacity: 0.72 },
}), [colors]);

  const navigation = useNavigation<HomeNav>();
  useAssistantScreen('Home');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [insightTeaser, setInsightTeaser] = useState<AnalyzeInsight | null>(null);
  const {
    refreshing,
    dataReady,
    pullProgress,
    startRefresh,
    onPullScroll,
    armRefresh,
    markDataReady,
    markAnimReady,
  } = useBrandPullRefresh();

  const load = useCallback(async (isRefresh = false) => {
    try {
      setError(null);
      const walletList = await walletsApi.list();
      setWallets(walletList);
      setCurrency(walletList[0]?.currency ?? DEFAULT_CURRENCY);

      if (walletList.length === 0) {
        setBalance(0);
        setSummary(null);
        setInsightTeaser(null);
        return;
      }

      const { from, to } = monthRange();
      const [balances, sum] = await Promise.all([
        Promise.all(walletList.map((w) => walletsApi.balance(w.id))),
        statsApi.summary(from, to),
      ]);
      setBalance(balances.reduce((acc, b) => acc + Number(b.balance), 0));
      setSummary(sum);

      insightsApi
        .analyze({ from, to })
        .then(setInsightTeaser)
        .catch(() => setInsightTeaser(null));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      if (isRefresh) markDataReady();
    }
  }, [markDataReady]);

  armRefresh(() => load(true));

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load(false);
  }, [load]));

  if (loading) return <Loading />;

  const walletCaption =
    wallets.length === 0
      ? 'Нет кошелька'
      : wallets.length === 1
        ? `${wallets[0].name} ↗`
        : `${wallets.length} кошелька ↗`;

  return (
    <Screen style={styles.screen} safeTop>
      <View style={styles.flex}>
        <KeyboardScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onPullScroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={startRefresh}
              {...brandRefreshProps}
            />
          }
        >
          <View style={styles.topline}>
            <Text style={styles.brand}>
              FINASSIST <Text style={styles.brandEdition}>/ PERSONAL FINANCE</Text>
            </Text>
            <View style={styles.liveDot} />
          </View>

          <View style={styles.headingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>ВАШИ ФИНАНСЫ  /  {monthLabel.toUpperCase()}</Text>
              <Text style={styles.heading}>Деньги.{`\n`}В порядке</Text>
            </View>
          </View>

          <ErrorText>{error}</ErrorText>

          <View style={styles.balanceCard}>
            <View style={styles.orbitOuter} />
            <View style={styles.orbitInner} />
            <View style={styles.balanceTop}>
              <Text style={styles.balanceEyebrow}>ВАШ БАЛАНС</Text>
              <Text style={styles.walletName} numberOfLines={1}>{walletCaption}</Text>
            </View>
            <Text style={styles.balance} numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(balance, currency)}
            </Text>
            <View style={styles.balanceBottom}>
              <Text style={styles.balanceCaption}>Доступно сейчас · ₸</Text>
              <View style={styles.balanceSymbol}>
                <Text style={styles.balanceSymbolText}>↗</Text>
              </View>
            </View>
          </View>

          <View style={styles.metrics}>
            <View style={[styles.metric, styles.incomeMetric]}>
              <View style={styles.metricTop}>
                <Text style={styles.metricIndex}>ДОХОД</Text>
                <Text style={styles.metricArrow}>↗</Text>
              </View>
              <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
                {formatMoney(summary?.incomes ?? 0, currency)}
              </Text>
              <Text style={styles.metricCaption}>За этот месяц</Text>
            </View>
            <View style={[styles.metric, styles.expenseMetric]}>
              <View style={styles.metricTop}>
                <Text style={styles.metricIndex}>РАСХОД</Text>
                <Text style={styles.metricArrow}>↘</Text>
              </View>
              <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
                {formatMoney(summary?.expenses ?? 0, currency)}
              </Text>
              <Text style={styles.metricCaption}>За этот месяц</Text>
            </View>
          </View>

          <View style={styles.assistantBlock}>
            <AssistantBanner />
            <AssistantHintCard />
          </View>

          {insightTeaser ? (
            <Pressable
              style={({ pressed }) => [styles.aiTeaser, pressed && styles.pressed]}
              onPress={() => navigation.navigate('Insights')}
            >
              <Text style={styles.aiTeaserIndex}>ИИ / ОТЧЁТ</Text>
              <Text style={styles.aiTeaserHeadline} numberOfLines={1}>
                {insightTeaser.headline || 'Анализ месяца'}
              </Text>
              <Text style={styles.aiTeaserSummary} numberOfLines={2}>
                {insightTeaser.summary}
              </Text>
              <Text style={styles.aiTeaserLink}>Подробнее →</Text>
            </Pressable>
          ) : null}
        </KeyboardScrollView>
        <BrandRefreshOverlay
          visible={refreshing}
          complete={dataReady}
          progress={pullProgress}
          onFinished={markAnimReady}
        />
      </View>
    </Screen>
  );
}

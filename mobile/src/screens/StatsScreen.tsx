import React, { useCallback, useState, useMemo } from 'react';
import { Dimensions, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { KeyboardScrollView } from '../components/KeyboardScreen';
import { useFocusEffect } from '@react-navigation/native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { statsApi, walletsApi } from '../api';
import { Card, EmptyState, ErrorText, Loading, Screen, Title, brandRefreshProps } from '../components/ui';
import { AssistantBanner, AssistantHintCard } from '../components/Assistant';
import { BrandRefreshOverlay } from '../components/BrandLoader';
import { useAssistantScreen } from '../hooks/useAssistantScreen';
import { useBrandPullRefresh } from '../hooks/useBrandPullRefresh';
import type { CategoryStat, DayStat, Summary } from '../types';
import { DEFAULT_CURRENCY, formatMoney, getErrorMessage, monthRange } from '../utils/format';
import { spacing } from '../utils/theme';
import { useTheme } from '../store/ThemeContext';

const width = Dimensions.get('window').width - spacing.lg * 4;

export function StatsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  kicker: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.6, marginBottom: 10 },
  period: { color: colors.textMuted, marginBottom: spacing.lg, fontSize: 13 },
  hero: { backgroundColor: colors.violet, borderRadius: 26, padding: 24, minHeight: 184, justifyContent: 'space-between', marginBottom: 10 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroIndex: { color: colors.onViolet, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  heroValue: { color: colors.onViolet, fontSize: 42, fontWeight: '900', letterSpacing: -2 },
  heroCaption: { color: colors.onVioletMuted, fontSize: 12, fontWeight: '700' },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: 20, padding: 16, minHeight: 96, justifyContent: 'space-between' },
  label: { color: colors.textMuted, marginBottom: 8, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  value: { fontWeight: '800', fontSize: 18, letterSpacing: -0.7 },
  row: { flexDirection: 'row', gap: 10, marginBottom: spacing.lg },
  chartIndex: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.3, marginBottom: 8 },
  section: { fontWeight: '800', fontSize: 21, color: colors.text, marginBottom: spacing.md, letterSpacing: -0.6 },
}), [colors]);

  const chartConfig = useMemo(() => {
    const primary = colors.primary;
    const hex = primary.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return {
      backgroundGradientFrom: colors.surface,
      backgroundGradientTo: colors.surface,
      color: (opacity = 1) => `rgba(${r}, ${g}, ${b}, ${opacity})`,
      labelColor: () => colors.textMuted,
      decimalPlaces: 0,
    };
  }, [colors]);

  useAssistantScreen('Stats');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [byCategory, setByCategory] = useState<CategoryStat[]>([]);
  const [byDay, setByDay] = useState<DayStat[]>([]);
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
      const { from, to } = monthRange();
      const [wallets, sum, cats, days] = await Promise.all([
        walletsApi.list(),
        statsApi.summary(from, to),
        statsApi.byCategory(from, to, 'EXPENSE'),
        statsApi.byDay(from, to),
      ]);
      setCurrency(wallets[0]?.currency ?? DEFAULT_CURRENCY);
      setSummary(sum);
      setByCategory(cats);
      setByDay(days);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      if (isRefresh) markDataReady();
    }
  }, [markDataReady]);

  armRefresh(() => load(true));

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(false);
    }, [load])
  );

  if (loading) return <Loading />;

  const pieData = byCategory.slice(0, 6).map((item, index) => ({
    name: `${item.categoryName}`,
    amount: Math.round(Number(item.amount)),
    color: item.color || colors.chart[index % colors.chart.length],
    legendFontColor: colors.textMuted,
    legendFontSize: 12,
  }));

  const dayLabels = byDay.slice(-7).map((d) => d.date.slice(8));
  const dayExpenses = byDay.slice(-7).map((d) => Math.round(Number(d.expenses)));

  return (
    <Screen style={{ paddingBottom: 0 }} safeTop>
      <View style={{ flex: 1 }}>
        <KeyboardScrollView
          scrollEventThrottle={16}
          onScroll={onPullScroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              {...brandRefreshProps}
              onRefresh={startRefresh}
            />
          }
        >
          <Text style={styles.kicker}>АНАЛИТИКА</Text>
          <Title>Цифры говорят.</Title>
          <Text style={styles.period}>Ваш финансовый ритм за текущий месяц · тенге</Text>
          <ErrorText>{error}</ErrorText>

          <AssistantBanner />
          <AssistantHintCard />

          <View style={styles.hero}>
            <View style={styles.heroTop}><Text style={styles.heroIndex}>ЧИСТЫЙ РЕЗУЛЬТАТ</Text></View>
            <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(summary?.net ?? 0, currency)}</Text>
            <Text style={styles.heroCaption}>Разница между доходами и расходами</Text>
          </View>

        <View style={styles.row}>
          <Stat
            label="ДОХОД ↗"
            value={formatMoney(summary?.incomes ?? 0, currency)}
            color={colors.income}
            styles={styles}
          />
          <Stat
            label="РАСХОД ↘"
            value={formatMoney(summary?.expenses ?? 0, currency)}
            color={colors.expense}
            styles={styles}
          />
        </View>

        <Card>
          <Text style={styles.chartIndex}>СТРУКТУРА</Text>
          <Text style={styles.section}>Куда уходят деньги</Text>
          {pieData.length === 0 ? (
            <EmptyState title="Нет расходов за месяц" />
          ) : (
            <PieChart
              data={pieData}
              width={width}
              height={200}
              chartConfig={chartConfig}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="8"
              absolute
            />
          )}
        </Card>

        <Card>
          <Text style={styles.chartIndex}>ДИНАМИКА</Text>
          <Text style={styles.section}>Последние 7 дней · ₸</Text>
          {dayExpenses.length === 0 ? (
            <EmptyState title="Нет данных по дням" />
          ) : (
            <BarChart
              data={{
                labels: dayLabels,
                datasets: [{ data: dayExpenses.length ? dayExpenses : [0] }],
              }}
              width={width}
              height={220}
              yAxisLabel=""
              yAxisSuffix=" ₸"
              chartConfig={chartConfig}
              style={{ borderRadius: 12 }}
              fromZero
            />
          )}
        </Card>
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

function Stat({
  label,
  value,
  color,
  styles,
}: {
  label: string;
  value: string;
  color: string;
  styles: ReturnType<typeof StyleSheet.create>;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

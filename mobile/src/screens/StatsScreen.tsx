import React, { useCallback, useRef, useState } from 'react';
import { Dimensions, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { statsApi, walletsApi } from '../api';
import { Card, EmptyState, ErrorText, Loading, Screen, Title, brandRefreshProps } from '../components/ui';
import { AssistantBanner, AssistantHintCard } from '../components/Assistant';
import { BrandRefreshOverlay } from '../components/BrandLoader';
import { useAssistantScreen } from '../hooks/useAssistantScreen';
import type { CategoryStat, DayStat, Summary } from '../types';
import { DEFAULT_CURRENCY, formatMoney, getErrorMessage, monthRange } from '../utils/format';
import { createBrandRefreshGate } from '../utils/refreshHold';
import { colors, spacing } from '../utils/theme';

const width = Dimensions.get('window').width - spacing.lg * 4;

export function StatsScreen() {
  useAssistantScreen('Stats');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [byCategory, setByCategory] = useState<CategoryStat[]>([]);
  const [byDay, setByDay] = useState<DayStat[]>([]);
  const [pullProgress, setPullProgress] = useState(0);
  const refreshGate = useRef(
    createBrandRefreshGate(() => {
      setRefreshing(false);
      setPullProgress(0);
    })
  ).current;

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
      if (isRefresh) {
        refreshGate.markDataReady();
      } else {
        setRefreshing(false);
      }
    }
  }, [refreshGate]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(false);
    }, [load])
  );

  if (loading) return <Loading />;

  const startRefresh = () => {
    refreshGate.reset();
    setRefreshing(true);
    load(true);
  };

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
        <ScrollView
          scrollEventThrottle={16}
          onScroll={(e) => {
            if (refreshing) return;
            const y = e.nativeEvent.contentOffset.y;
            if (y < 0) setPullProgress(Math.min(1, -y / 90));
            else setPullProgress(0);
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              {...brandRefreshProps}
              onRefresh={startRefresh}
            />
          }
        >
          <Text style={styles.kicker}>АНАЛИТИКА / 03</Text>
          <Title>Цифры говорят.</Title>
          <Text style={styles.period}>Ваш финансовый ритм за текущий месяц · тенге</Text>
          <ErrorText>{error}</ErrorText>

          <AssistantBanner />
          <AssistantHintCard />

          <View style={styles.hero}>
            <View style={styles.heroTop}><Text style={styles.heroIndex}>01 / ЧИСТЫЙ РЕЗУЛЬТАТ</Text></View>
            <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(summary?.net ?? 0, currency)}</Text>
            <Text style={styles.heroCaption}>Разница между доходами и расходами</Text>
          </View>

        <View style={styles.row}>
          <Stat label="ДОХОД ↗" value={formatMoney(summary?.incomes ?? 0, currency)} color={colors.income} />
          <Stat label="РАСХОД ↘" value={formatMoney(summary?.expenses ?? 0, currency)} color={colors.expense} />
        </View>

        <Card>
          <Text style={styles.chartIndex}>02 / СТРУКТУРА</Text>
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
          <Text style={styles.chartIndex}>03 / ДИНАМИКА</Text>
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
      </ScrollView>
        <BrandRefreshOverlay
          visible={refreshing}
          progress={pullProgress}
          onFinished={() => refreshGate.markAnimReady()}
        />
      </View>
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

const chartConfig = {
  backgroundGradientFrom: colors.surface,
  backgroundGradientTo: colors.surface,
  color: (opacity = 1) => `rgba(216, 252, 112, ${opacity})`,
  labelColor: () => colors.textMuted,
  decimalPlaces: 0,
};

const styles = StyleSheet.create({
  kicker: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.6, marginBottom: 10 },
  period: { color: colors.textMuted, marginBottom: spacing.lg, fontSize: 13 },
  hero: { backgroundColor: colors.violet, borderRadius: 26, padding: 24, minHeight: 184, justifyContent: 'space-between', marginBottom: 10 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroIndex: { color: colors.ink, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  heroValue: { color: colors.ink, fontSize: 42, fontWeight: '900', letterSpacing: -2 },
  heroCaption: { color: '#4A3B5C', fontSize: 12, fontWeight: '700' },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: 20, padding: 16, minHeight: 96, justifyContent: 'space-between' },
  label: { color: colors.textMuted, marginBottom: 8, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  value: { fontWeight: '800', fontSize: 18, letterSpacing: -0.7 },
  row: { flexDirection: 'row', gap: 10, marginBottom: spacing.lg },
  chartIndex: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.3, marginBottom: 8 },
  section: { fontWeight: '800', fontSize: 21, color: colors.text, marginBottom: spacing.md, letterSpacing: -0.6 },
});

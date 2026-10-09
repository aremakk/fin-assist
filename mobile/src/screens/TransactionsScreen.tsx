import React, { useCallback, useState, useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { categoriesApi, transactionsApi, walletsApi } from '../api';
import { Button, EmptyState, ErrorText, Loading, Screen, Title, brandRefreshProps } from '../components/ui';
import { AssistantBanner, AssistantHintCard } from '../components/Assistant';
import { BrandRefreshOverlay } from '../components/BrandLoader';
import { renderKeyboardScrollView } from '../components/KeyboardScreen';
import { useAssistantScreen } from '../hooks/useAssistantScreen';
import { useBrandPullRefresh } from '../hooks/useBrandPullRefresh';
import { RootStackParamList } from '../navigation/types';
import type { Category, MoneyType, Transaction, Wallet } from '../types';
import { DEFAULT_CURRENCY, formatDate, formatMoney, getErrorMessage, moneyTypeLabel, monthRange } from '../utils/format';
import { spacing } from '../utils/theme';
import { useTheme } from '../store/ThemeContext';

const filters: { key: 'ALL' | MoneyType; label: string }[] = [
  { key: 'ALL', label: 'Все' },
  { key: 'EXPENSE', label: 'Расходы' },
  { key: 'INCOME', label: 'Доходы' },
];

export function TransactionsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  screen: { padding: 0 },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 36,
    flexGrow: 1,
  },
  kicker: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 10 },
  intro: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.lg },
  filters: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontWeight: '600' },
  chipTextActive: { color: colors.ink },
  period: { marginBottom: spacing.sm },
  periodText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  assistantBlock: { marginTop: spacing.md },
  listLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  item: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  number: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { color: colors.primary, fontSize: 22 },
  note: { fontWeight: '700', color: colors.text, fontSize: 14 },
  meta: { color: colors.textMuted, marginTop: 4, fontSize: 11 },
}), [colors]);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  useAssistantScreen('Transactions');
  const [items, setItems] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Record<string, Wallet>>({});
  const [categories, setCategories] = useState<Record<string, Category>>({});
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [type, setType] = useState<'ALL' | MoneyType>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodOnly, setPeriodOnly] = useState(true);
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
      const range = periodOnly ? monthRange() : {};
      const [page, walletList, categoryList] = await Promise.all([
        transactionsApi.list({
          page: 0,
          size: 50,
          type: type === 'ALL' ? undefined : type,
          ...range,
        }),
        walletsApi.list(),
        categoriesApi.list(),
      ]);
      setItems(page.content);
      setWallets(Object.fromEntries(walletList.map((w) => [w.id, w])));
      setCategories(Object.fromEntries(categoryList.map((c) => [c.id, c])));
      setCurrency(walletList[0]?.currency ?? DEFAULT_CURRENCY);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      if (isRefresh) markDataReady();
    }
  }, [type, periodOnly, markDataReady]);

  armRefresh(() => load(true));

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(false);
    }, [load])
  );

  if (loading) return <Loading />;

  return (
    <Screen style={styles.screen} safeTop>
      <View style={styles.flex}>
        <FlatList
          renderScrollComponent={renderKeyboardScrollView}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          data={items}
          keyExtractor={(item) => item.id}
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
          ListHeaderComponent={
            <>
              <Text style={styles.kicker}>ЖУРНАЛ</Text>
              <Title>История денег.</Title>
              <Text style={styles.intro}>Каждое движение — под вашим контролем. Суммы в тенге.</Text>
              <View style={styles.filters}>
                {filters.map((f) => (
                  <Pressable
                    key={f.key}
                    onPress={() => setType(f.key)}
                    style={[styles.chip, type === f.key && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, type === f.key && styles.chipTextActive]}>{f.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={() => setPeriodOnly((v) => !v)} style={styles.period}>
                <Text style={styles.periodText}>
                  {periodOnly ? 'Период: текущий месяц' : 'Период: все время'}
                </Text>
              </Pressable>
              <Button title="＋  Добавить операцию" onPress={() => navigation.navigate('TransactionForm', {})} />
              <ErrorText>{error}</ErrorText>
              <View style={styles.assistantBlock}>
                <AssistantBanner />
                <AssistantHintCard />
              </View>
              <Text style={styles.listLabel}>ОПЕРАЦИИ</Text>
            </>
          }
          ListEmptyComponent={
            <EmptyState title="Операций нет" hint="Измените фильтр или добавьте запись" />
          }
          renderItem={({ item }) => {
            const category = categories[item.categoryId];
            const wallet = wallets[item.walletId];
            const title = item.note || category?.name || moneyTypeLabel(item.type);
            const metaParts = [
              formatDate(item.occurredAt),
              moneyTypeLabel(item.type),
              category?.name,
              wallet && Object.keys(wallets).length > 1 ? wallet.name : null,
            ].filter(Boolean);

            return (
              <Pressable
                style={styles.item}
                onPress={() => navigation.navigate('TransactionForm', { id: item.id })}
              >
                <View style={styles.number}>
                  <Text style={styles.numberText}>{item.type === 'INCOME' ? '↗' : '↘'}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.note}>{title}</Text>
                  <Text style={styles.meta}>{metaParts.join(' · ')}</Text>
                </View>
                <Text
                  style={{
                    color: item.type === 'INCOME' ? colors.income : colors.text,
                    fontWeight: '800',
                    fontSize: 13,
                    maxWidth: '36%',
                    textAlign: 'right',
                  }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {item.type === 'INCOME' ? '+' : '−'}
                  {formatMoney(item.amount, wallet?.currency ?? currency)}
                </Text>
              </Pressable>
            );
          }}
        />
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

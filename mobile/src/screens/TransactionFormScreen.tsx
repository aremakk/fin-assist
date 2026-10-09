import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { categoriesApi, transactionsApi, walletsApi } from '../api';
import { Button, ErrorText, Input, Loading, Screen } from '../components/ui';
import { KeyboardScrollView } from '../components/KeyboardScreen';
import { AssistantHintCard } from '../components/Assistant';
import { useAssistantScreen } from '../hooks/useAssistantScreen';
import { RootStackParamList } from '../navigation/types';
import type { Category, MoneyType, Wallet } from '../types';
import { formatDate, getErrorMessage, moneyTypeLabel } from '../utils/format';
import { spacing } from '../utils/theme';
import { useTheme } from '../store/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'TransactionForm'>;

function startOfDayIso(daysAgo = 0): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

export function TransactionFormScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  kicker: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 10 },
  heading: { color: colors.text, fontSize: 32, fontWeight: '900', letterSpacing: -1.2, marginBottom: 8 },
  intro: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.lg },
  row: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  chip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.ink },
  label: { fontWeight: '700', color: colors.text, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  optionText: { color: colors.text, fontWeight: '600' },
}), [colors]);

  const id = route.params?.id;
  useAssistantScreen('TransactionForm');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [type, setType] = useState<MoneyType>('EXPENSE');
  const [walletId, setWalletId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [occurredAt, setOccurredAt] = useState(startOfDayIso(0));

  useEffect(() => {
    (async () => {
      try {
        const [w, c] = await Promise.all([walletsApi.list(), categoriesApi.list()]);
        setWallets(w);
        setCategories(c);
        setWalletId(w[0]?.id ?? '');
        if (id) {
          const tx = await transactionsApi.get(id);
          setType(tx.type);
          setWalletId(tx.walletId);
          setCategoryId(tx.categoryId);
          setAmount(String(tx.amount));
          setNote(tx.note ?? '');
          setOccurredAt(tx.occurredAt);
        } else {
          const firstExpense = c.find((cat) => cat.type === 'EXPENSE');
          setCategoryId(firstExpense?.id ?? '');
          setOccurredAt(startOfDayIso(0));
        }
      } catch (e) {
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type]
  );
  const selectedCategoryId = filteredCategories.some((c) => c.id === categoryId)
    ? categoryId
    : filteredCategories[0]?.id ?? '';
  const selectedWallet = wallets.find((w) => w.id === walletId);

  const datePresets = [
    { key: 'today', label: 'Сегодня', value: startOfDayIso(0) },
    { key: 'yesterday', label: 'Вчера', value: startOfDayIso(1) },
    { key: 'week', label: 'Неделю назад', value: startOfDayIso(7) },
  ];

  const isSameDay = (a: string, b: string) =>
    new Date(a).toDateString() === new Date(b).toDateString();

  const save = async () => {
    setError(null);
    const value = Number(amount.replace(',', '.'));
    if (!walletId || !selectedCategoryId || !(value > 0)) {
      setError('Укажите сумму больше 0, кошелёк и категорию');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        walletId,
        categoryId: selectedCategoryId,
        type,
        amount: value,
        note: note.trim() || undefined,
        occurredAt,
      };
      if (id) {
        await transactionsApi.update(id, payload);
      } else {
        await transactionsApi.create(payload);
      }
      navigation.goBack();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!id) return;
    Alert.alert('Удалить операцию?', 'Действие нельзя отменить', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await transactionsApi.remove(id);
            navigation.goBack();
          } catch (e) {
            setError(getErrorMessage(e));
          }
        },
      },
    ]);
  };

  if (loading) return <Loading />;

  return (
    <Screen>
      <KeyboardScrollView contentContainerStyle={{ paddingBottom: spacing.lg }}>
        <Text style={styles.kicker}>ОПЕРАЦИЯ / {id ? 'ПРАВКА' : 'НОВАЯ'}</Text>
        <Text style={styles.heading}>{id ? 'Редактирование.' : 'Новая запись.'}</Text>
        <Text style={styles.intro}>Сумма в тенге{selectedWallet ? ` · ${selectedWallet.name}` : ''}.</Text>
        <ErrorText>{error}</ErrorText>
        <AssistantHintCard />

        <View style={styles.row}>
          {(['EXPENSE', 'INCOME'] as MoneyType[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setType(t)}
              style={[styles.chip, type === t && styles.chipActive]}
            >
              <Text style={[styles.chipText, type === t && styles.chipTextActive]}>
                {moneyTypeLabel(t)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Input
          label="Сумма, ₸"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
        />
        <Input label="Заметка" value={note} onChangeText={setNote} placeholder="Необязательно" />

        <Text style={styles.label}>Дата · {formatDate(occurredAt)}</Text>
        <View style={styles.wrap}>
          {datePresets.map((preset) => (
            <Pressable
              key={preset.key}
              onPress={() => setOccurredAt(preset.value)}
              style={[styles.option, isSameDay(occurredAt, preset.value) && styles.optionActive]}
            >
              <Text style={styles.optionText}>{preset.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Кошелёк</Text>
        <View style={styles.wrap}>
          {wallets.map((w) => (
            <Pressable
              key={w.id}
              onPress={() => setWalletId(w.id)}
              style={[styles.option, walletId === w.id && styles.optionActive]}
            >
              <Text style={styles.optionText}>{w.name}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Категория</Text>
        <View style={styles.wrap}>
          {filteredCategories.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setCategoryId(c.id)}
              style={[styles.option, selectedCategoryId === c.id && styles.optionActive]}
            >
              <Text style={styles.optionText}>{c.name}</Text>
            </Pressable>
          ))}
        </View>

        <Button title="Сохранить" onPress={save} loading={saving} />
        {id ? <Button title="Удалить" variant="danger" onPress={remove} /> : null}
        <Button title="Отмена" variant="secondary" onPress={() => navigation.goBack()} />
      </KeyboardScrollView>
    </Screen>
  );
}

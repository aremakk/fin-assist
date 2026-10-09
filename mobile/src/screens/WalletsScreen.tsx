import React, { useCallback, useState, useMemo, useRef } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { walletsApi } from '../api';
import { Button, EmptyState, ErrorText, Input, Loading, Screen } from '../components/ui';
import { renderKeyboardScrollView } from '../components/KeyboardScreen';
import type { Wallet } from '../types';
import { formatMoney, getErrorMessage } from '../utils/format';
import { spacing } from '../utils/theme';
import { useTheme } from '../store/ThemeContext';

export function WalletsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  kicker: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 10 },
  heading: { color: colors.text, fontSize: 32, fontWeight: '900', letterSpacing: -1.2, marginBottom: 8 },
  intro: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.lg },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  name: { fontWeight: '700', color: colors.text, fontSize: 15 },
  meta: { color: colors.textMuted, marginTop: 4, fontSize: 12 },
  action: { color: colors.primary, fontWeight: '700', fontSize: 13 },
}), [colors]);

  const [items, setItems] = useState<Wallet[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [saving, setSaving] = useState(false);
  const listRef = useRef<FlatList<Wallet>>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const wallets = await walletsApi.list();
      setItems(wallets);
      const entries = await Promise.all(
        wallets.map(async (w) => [w.id, (await walletsApi.balance(w.id)).balance] as const)
      );
      setBalances(Object.fromEntries(entries));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const create = async () => {
    if (!name.trim()) {
      setError('Введите название кошелька');
      return;
    }
    setSaving(true);
    try {
      await walletsApi.create({ name: name.trim(), initialBalance: 0 });
      setName('');
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const saveRename = async () => {
    if (!editingId || !editingName.trim()) {
      setError('Введите новое название');
      return;
    }
    setSaving(true);
    try {
      await walletsApi.update(editingId, { name: editingName.trim() });
      setEditingId(null);
      setEditingName('');
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = (wallet: Wallet) => {
    Alert.alert('Удалить кошелёк?', wallet.name, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await walletsApi.remove(wallet.id);
            await load();
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
      <FlatList
        ref={listRef}
        renderScrollComponent={renderKeyboardScrollView}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={{ paddingBottom: spacing.lg }}
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <Text style={styles.kicker}>ПРОСТРАНСТВО / КОШЕЛЬКИ</Text>
            <Text style={styles.heading}>Ваши счета.</Text>
            <Text style={styles.intro}>Все суммы в тенге (₸).</Text>
            <ErrorText>{error}</ErrorText>
            <Input label="Новый кошелёк" value={name} onChangeText={setName} placeholder="Название" />
            <Button title="Добавить" onPress={create} loading={saving} />

            {editingId ? (
              <View style={{ marginTop: spacing.md }}>
                <Input key={editingId} autoFocus label="Новое название" value={editingName} onChangeText={setEditingName} />
                <Button title="Сохранить название" onPress={saveRename} loading={saving} />
                <Button
                  title="Отмена"
                  variant="secondary"
                  onPress={() => {
                    setEditingId(null);
                    setEditingName('');
                  }}
                />
              </View>
            ) : null}
          </>
        }
        ListHeaderComponentStyle={{ marginBottom: spacing.md }}
        ListEmptyComponent={<EmptyState title="Кошельков нет" hint="Создайте первый счёт для учёта" />}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{formatMoney(balances[item.id] ?? 0, item.currency)}</Text>
            </View>
            <Pressable
              onPress={() => {
                listRef.current?.scrollToOffset({ offset: 0, animated: false });
                setEditingId(item.id);
                setEditingName(item.name);
              }}
            >
              <Text style={styles.action}>Имя</Text>
            </Pressable>
            <Pressable onPress={() => remove(item)}>
              <Text style={[styles.action, { color: colors.danger }]}>Удалить</Text>
            </Pressable>
          </View>
        )}
      />
    </Screen>
  );
}

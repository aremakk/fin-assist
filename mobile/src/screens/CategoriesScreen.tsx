import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { categoriesApi } from '../api';
import { Button, EmptyState, ErrorText, Input, Loading, Screen } from '../components/ui';
import type { Category, MoneyType } from '../types';
import { getErrorMessage, moneyTypeLabel } from '../utils/format';
import { colors, spacing } from '../utils/theme';

export function CategoriesScreen() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<MoneyType>('EXPENSE');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setItems(await categoriesApi.list());
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
      setError('Введите название категории');
      return;
    }
    setSaving(true);
    try {
      await categoriesApi.create({
        name: name.trim(),
        type,
        color: type === 'INCOME' ? colors.income : colors.expense,
        icon: 'custom',
      });
      setName('');
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = (item: Category) => {
    if (item.isSystem) {
      setError('Системные категории нельзя удалить');
      return;
    }
    Alert.alert('Удалить категорию?', item.name, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await categoriesApi.remove(item.id);
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
      <Text style={styles.kicker}>ПРОСТРАНСТВО / КАТЕГОРИИ</Text>
      <Text style={styles.heading}>Структура трат.</Text>
      <Text style={styles.intro}>Доходы и расходы — по смыслу, а не хаосом.</Text>
      <ErrorText>{error}</ErrorText>
      <View style={styles.row}>
        {(['EXPENSE', 'INCOME'] as MoneyType[]).map((t) => (
          <Pressable key={t} onPress={() => setType(t)} style={[styles.chip, type === t && styles.chipActive]}>
            <Text style={[styles.chipText, type === t && styles.chipTextActive]}>
              {moneyTypeLabel(t)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Input label="Новая категория" value={name} onChangeText={setName} placeholder="Название" />
      <Button title="Добавить" onPress={create} loading={saving} />

      <FlatList
        style={{ marginTop: spacing.md }}
        data={items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyState title="Категорий нет" hint="Добавьте свою или используйте системные" />}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={[styles.dot, { backgroundColor: item.color || colors.primary }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {moneyTypeLabel(item.type)}
                {item.isSystem ? ' · системная' : ''}
              </Text>
            </View>
            {!item.isSystem ? (
              <Pressable onPress={() => remove(item)}>
                <Text style={styles.delete}>Удалить</Text>
              </Pressable>
            ) : (
              <Text style={styles.locked}>системная</Text>
            )}
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 10 },
  heading: { color: colors.text, fontSize: 32, fontWeight: '900', letterSpacing: -1.2, marginBottom: 8 },
  intro: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.lg },
  row: { flexDirection: 'row', gap: 8, marginBottom: spacing.sm },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.ink },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  name: { fontWeight: '700', color: colors.text, fontSize: 15 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  delete: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  locked: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
});

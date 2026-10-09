import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authApi } from '../api';
import { Button, Card, ErrorText, Input, Screen, Subtitle, Title } from '../components/ui';
import { KeyboardScrollView } from '../components/KeyboardScreen';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';
import { getErrorMessage } from '../utils/format';

export function ProfileScreen() {
  const { user, logout, refreshProfile } = useAuth();
  const { colors, preference, setPreference, scheme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const saveName = async () => {
    setError(null);
    if (!displayName.trim()) {
      setError('Имя не может быть пустым');
      return;
    }
    setSaving(true);
    try {
      await authApi.updateProfile(displayName.trim());
      await refreshProfile();
      Alert.alert('Готово', 'Имя обновлено');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setError(null);
    if (newPassword.length < 8) {
      setError('Новый пароль должен быть не короче 8 символов');
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      Alert.alert('Готово', 'Пароль изменён');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const themeLabel =
    preference === 'system'
      ? `Система (${scheme === 'light' ? 'светлая' : 'тёмная'})`
      : preference === 'light'
        ? 'Светлая'
        : 'Тёмная';

  return (
    <Screen safeTop style={{ paddingBottom: 0 }}>
      <KeyboardScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <Text style={[styles.kicker, { color: colors.primary }]}>ПРОСТРАНСТВО</Text>
        <Title>Ваш профиль.</Title>
        <Subtitle>{user?.email}</Subtitle>
        <ErrorText>{error}</ErrorText>

        <Card>
          <Text style={[styles.section, { color: colors.text }]}>Тема</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 12 }}>
            Сейчас: {themeLabel}
          </Text>
          <View style={styles.themeRow}>
            {(
              [
                { id: 'light' as const, label: 'Светлая' },
                { id: 'dark' as const, label: 'Тёмная' },
                { id: 'system' as const, label: 'Система' },
              ] as const
            ).map((opt) => {
              const active = preference === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setPreference(opt.id)}
                  style={[
                    styles.themeChip,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primary : colors.surfaceRaised,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontWeight: '700',
                      fontSize: 13,
                      color: active ? colors.ink : colors.text,
                    }}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card>
          <Input label="Имя" value={displayName} onChangeText={setDisplayName} />
          <Button title="Сохранить имя" onPress={saveName} loading={saving} />
        </Card>

        <Card>
          <Text style={[styles.section, { color: colors.text }]}>Смена пароля</Text>
          <Input
            label="Текущий пароль"
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
          <Input
            label="Новый пароль"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <Button title="Сменить пароль" onPress={changePassword} loading={saving} />
        </Card>

        <Button title="Категории" variant="secondary" onPress={() => navigation.navigate('Categories')} />
        <Button title="Кошельки" variant="secondary" onPress={() => navigation.navigate('Wallets')} />
        <Button title="Выйти" variant="danger" onPress={() => logout()} />
      </KeyboardScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 10 },
  section: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 8,
  },
  themeRow: { flexDirection: 'row', gap: 8 },
  themeChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
});

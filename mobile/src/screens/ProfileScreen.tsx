import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authApi } from '../api';
import { Button, Card, ErrorText, Input, Screen, Subtitle, Title } from '../components/ui';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../store/AuthContext';
import { getErrorMessage } from '../utils/format';
import { colors } from '../utils/theme';

export function ProfileScreen() {
  const { user, logout, refreshProfile } = useAuth();
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

  return (
    <Screen safeTop style={{ paddingBottom: 0 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <Text style={styles.kicker}>ПРОСТРАНСТВО / 04</Text>
        <Title>Ваш профиль.</Title>
        <Subtitle>{user?.email}</Subtitle>
        <ErrorText>{error}</ErrorText>

      <Card>
        <Input label="Имя" value={displayName} onChangeText={setDisplayName} />
        <Button title="Сохранить имя" onPress={saveName} loading={saving} />
      </Card>

      <Card>
        <Text style={styles.section}>Смена пароля</Text>
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
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 10 },
  section: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
  },
});

import React, { useState, useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, ErrorText, Input, Screen, Subtitle, Title } from '../components/ui';
import { KeyboardScrollView } from '../components/KeyboardScreen';
import { useAuth } from '../store/AuthContext';
import { AuthStackParamList } from '../navigation/types';
import { useTheme } from '../store/ThemeContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  kicker: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.6, marginBottom: 16 },
}), [colors]);

  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!displayName.trim() || !email.trim() || password.length < 8) {
      setError('Имя, email и пароль от 8 символов обязательны');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, displayName);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen safeTop>
      <KeyboardScrollView contentContainerStyle={{ paddingTop: 52, paddingBottom: 40 }}>
        <Text style={styles.kicker}>FINASSIST / НАЧАЛО</Text>
        <Title>Новый взгляд{`\n`}на деньги</Title>
        <Subtitle>Создадим кошелёк «Основной» и базовые категории</Subtitle>

        <Input label="Имя" value={displayName} onChangeText={setDisplayName} placeholder="Как к вам обращаться" />
        <Input
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="name@email.com"
        />
        <Input
          label="Пароль"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="Минимум 8 символов"
        />
        <ErrorText>{error}</ErrorText>
        <Button title="Зарегистрироваться" onPress={onSubmit} loading={loading} />
        <Button title="У меня уже есть аккаунт" variant="secondary" onPress={() => navigation.goBack()} />
      </KeyboardScrollView>
    </Screen>
  );
}

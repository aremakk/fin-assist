import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, ErrorText, Input, Screen } from '../components/ui';
import { KeyboardScrollView } from '../components/KeyboardScreen';
import { useAuth } from '../store/AuthContext';
import { AuthStackParamList } from '../navigation/types';
import { useTheme } from '../store/ThemeContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', paddingVertical: 30 },
  logo: { width: 50, height: 50, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  logoText: { color: colors.ink, fontSize: 34, fontWeight: '900', letterSpacing: -3, lineHeight: 38 },
  kicker: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.6, marginBottom: 12 },
  headline: { color: colors.text, fontSize: 50, lineHeight: 51, letterSpacing: -3, fontWeight: '900' },
  subtitle: { color: colors.textMuted, fontSize: 14, marginTop: 14, marginBottom: 38 },
  formLabelRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: colors.border, paddingTop: 16, marginBottom: 20 },
  formLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
}), [colors]);

  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Введите email и пароль');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen safeTop>
      <KeyboardScrollView contentContainerStyle={styles.content}>
        <View style={styles.logo}><Text style={styles.logoText}>f.</Text></View>
        <Text style={styles.kicker}>FINASSIST / ВАШИ ФИНАНСЫ</Text>
        <Text style={styles.headline}>Деньги.{`\n`}В вашем{`\n`}ритме</Text>
        <Text style={styles.subtitle}>Ясность в цифрах. Свобода в решениях.</Text>

        <View style={styles.formLabelRow}><Text style={styles.formLabel}>ВОЙТИ В АККАУНТ</Text></View>

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
          placeholder="••••••••"
        />
        <ErrorText>{error}</ErrorText>
        <Button title="Войти" onPress={onSubmit} loading={loading} />
        <Button
          title="Создать аккаунт"
          variant="secondary"
          onPress={() => navigation.navigate('Register')}
        />
      </KeyboardScrollView>
    </Screen>
  );
}

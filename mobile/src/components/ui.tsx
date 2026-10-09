import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../store/ThemeContext';
import { spacing } from '../utils/theme';
import { BrandLoader } from './BrandLoader';

export function Screen({
  children,
  style,
  safeTop = false,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  safeTop?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <SafeAreaView
      edges={safeTop ? ['top'] : []}
      style={[{ flex: 1, backgroundColor: colors.background, padding: spacing.lg }, style]}
    >
      {children}
    </SafeAreaView>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        fontSize: 36,
        fontWeight: '800',
        letterSpacing: -1.6,
        color: colors.text,
        marginBottom: spacing.sm,
      }}
    >
      {children}
    </Text>
  );
}

export function Subtitle({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: spacing.md }}>
      {children}
    </Text>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: 24,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: spacing.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}) {
  const { colors } = useTheme();
  const spinnerColor =
    variant === 'secondary' || variant === 'danger' ? colors.text : colors.ink;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: colors.primary,
          borderRadius: 16,
          paddingVertical: 17,
          alignItems: 'center',
          marginTop: spacing.sm,
        },
        variant === 'secondary' && { backgroundColor: colors.surfaceRaised },
        variant === 'danger' && { backgroundColor: colors.danger },
        (disabled || loading) && { opacity: 0.6 },
        pressed && !disabled && { opacity: 0.9 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <Text
          style={{
            color: variant === 'secondary' ? colors.text : colors.ink,
            fontSize: 16,
            fontWeight: '800',
          }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Input({
  label,
  error,
  ...props
}: TextInputProps & { label?: string; error?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? (
        <Text style={{ marginBottom: 6, color: colors.text, fontWeight: '600' }}>{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={{
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.border,
          borderRadius: 16,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 16,
          color: colors.text,
        }}
        {...props}
      />
      {error ? (
        <Text style={{ color: colors.danger, marginTop: 6, fontSize: 13 }}>{error}</Text>
      ) : null}
    </View>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        paddingVertical: spacing.xl,
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
        {title}
      </Text>
      {hint ? (
        <Text style={{ color: colors.textMuted, textAlign: 'center' }}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function ErrorText({ children }: { children?: string | null }) {
  const { colors } = useTheme();
  if (!children) return null;
  return <Text style={{ color: colors.danger, marginTop: 6, fontSize: 13 }}>{children}</Text>;
}

export function Loading() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
      }}
    >
      <BrandLoader size={56} />
    </View>
  );
}

/** Hide system spinner — pair RefreshControl with BrandRefreshOverlay. */
export const brandRefreshProps = {
  tintColor: 'transparent' as const,
  colors: ['transparent'] as string[],
  progressBackgroundColor: 'transparent' as const,
};

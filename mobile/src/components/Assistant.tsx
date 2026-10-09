import React, { useState, useMemo } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAssistant } from '../store/AssistantContext';
import { formatMoney } from '../utils/format';
import { spacing } from '../utils/theme';
import { useTheme } from '../store/ThemeContext';

function useAssistantStyles() {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 18,
    padding: 14,
    marginTop: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerWarn: {
    borderColor: colors.warning,
  },
  bannerBody: { flex: 1 },
  bannerTitle: { color: colors.text, fontSize: 14, fontWeight: '800', marginBottom: 4 },
  bannerText: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  bannerLink: { color: colors.primary, fontSize: 12, fontWeight: '800', marginTop: 8 },
  bannerClose: { color: colors.textMuted, fontSize: 14, fontWeight: '700', paddingTop: 2 },
  hint: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hintActive: {
    borderColor: colors.primary,
  },
  hintTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  hintKicker: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  hintSay: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  status: { color: colors.primary, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  transcript: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  hintText: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  hintError: { color: colors.danger, fontSize: 12, marginTop: 8 },
  textToggle: { marginTop: 10 },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.35 },
  sendArrow: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetKicker: { color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 8 },
  sheetTitle: { color: colors.text, fontSize: 22, fontWeight: '900', marginBottom: 10 },
  sheetBody: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginBottom: 20 },
  sheetRow: { flexDirection: 'row', gap: 10 },
  sheetSecondary: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSecondaryText: { color: colors.textMuted, fontWeight: '700' },
  sheetPrimary: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetPrimaryText: { color: colors.ink, fontWeight: '800' },
}),
    [colors]
  );
  return { colors, styles };
}

export function AssistantBanner() {
  const { styles } = useAssistantStyles();


  const { alerts, dismissAlert, applyAction } = useAssistant();
  const alert = alerts[0];
  if (!alert) return null;

  return (
    <View style={[styles.banner, alert.severity === 'warning' && styles.bannerWarn]}>
      <View style={styles.bannerBody}>
        <Text style={styles.bannerTitle}>{alert.title}</Text>
        <Text style={styles.bannerText}>{alert.body}</Text>
        {alert.action?.route ? (
          <Pressable
            onPress={() =>
              applyAction({
                type: 'NAVIGATE',
                route: alert.action!.route,
                needsConfirm: false,
              })
            }
          >
            <Text style={styles.bannerLink}>Открыть →</Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable onPress={() => dismissAlert(alert.id)} hitSlop={10}>
        <Text style={styles.bannerClose}>✕</Text>
      </Pressable>
    </View>
  );
}

export function AssistantHintCard() {
  const { colors, styles } = useAssistantStyles();
  const {
    hints,
    reply,
    busy,
    composerOpen,
    setComposerOpen,
    runAssist,
    error,
    listening,
    wallEActive,
    manualVoiceActive,
    transcript,
    stopVoice,
    startVoice,
    voiceAvailable,
  } = useAssistant();
  const [text, setText] = useState('');
  const hint = hints[0] || reply;
  const micOn = listening || wallEActive;

  const statusLine = listening
    ? wallEActive || manualVoiceActive
      ? 'Слушаю команду…'
      : 'Скажите «Валли»…'
    : wallEActive
      ? 'Валли на связи — говорите сумму'
      : null;

  return (
    <View style={[styles.hint, micOn && styles.hintActive]}>
      <View style={styles.hintTop}>
        <Text style={styles.hintKicker}>ВАЛЛИ</Text>
        {voiceAvailable ? (
          <Pressable
            onPress={() => {
              if (manualVoiceActive || wallEActive) stopVoice();
              else startVoice();
            }}
          >
            <Text style={styles.hintSay}>
              {manualVoiceActive || wallEActive ? 'Стоп' : '🎙 Команда'}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.hintSay}>Текст</Text>
        )}
      </View>

      {statusLine ? <Text style={styles.status}>{statusLine}</Text> : null}
      {listening && transcript ? (
        <Text style={styles.transcript}>«{transcript}»</Text>
      ) : null}

      {hint ? <Text style={styles.hintText}>{hint}</Text> : (
        <Text style={styles.hintText}>
          {voiceAvailable
            ? 'Скажите «Валли, 2000 на такси» — запишу сразу.'
            : 'Голос заработает после установки через Xcode. Пока можно написать команду.'}
        </Text>
      )}
      {error ? <Text style={styles.hintError}>{error}</Text> : null}

      <Pressable onPress={() => setComposerOpen(!composerOpen)} style={styles.textToggle}>
        <Text style={styles.hintSay}>{composerOpen ? 'Скрыть текст' : 'Написать…'}</Text>
      </Pressable>

      {composerOpen ? (
        <View style={styles.composerRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Валли, запиши 2000 на такси"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            editable={!busy}
            onSubmitEditing={() => {
              const q = text;
              setText('');
              runAssist(q.replace(/^валли[,.\s]*/i, '').trim() || q, { autoConfirm: true });
            }}
            returnKeyType="send"
          />
          <Pressable
            style={[styles.send, (!text.trim() || busy) && styles.sendDisabled]}
            disabled={!text.trim() || busy}
            onPress={() => {
              const q = text;
              setText('');
              runAssist(q.replace(/^валли[,.\s]*/i, '').trim() || q, { autoConfirm: true });
            }}
          >
            {busy ? (
              <ActivityIndicator size="small" color={colors.ink} />
            ) : (
              <Text style={styles.sendArrow}>→</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function AssistConfirmSheet() {
  const { colors, styles } = useAssistantStyles();
  const { pendingConfirm, confirmCreate, dismissConfirm, busy } = useAssistant();
  if (!pendingConfirm) return null;
  const d = pendingConfirm.draft;
  const label = [
    d.type === 'INCOME' ? 'Доход' : 'Расход',
    formatMoney(Number(d.amount)),
    d.categoryName || null,
    d.note || null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Modal transparent animationType="fade" visible onRequestClose={dismissConfirm}>
      <View style={styles.modalBackdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetKicker}>ВАЛЛИ · ПОДТВЕРДИТЕ</Text>
          <Text style={styles.sheetTitle}>Записать операцию?</Text>
          <Text style={styles.sheetBody}>{label}</Text>
          <View style={styles.sheetRow}>
            <Pressable style={styles.sheetSecondary} onPress={dismissConfirm} disabled={busy}>
              <Text style={styles.sheetSecondaryText}>Отмена</Text>
            </Pressable>
            <Pressable style={styles.sheetPrimary} onPress={confirmCreate} disabled={busy}>
              {busy ? (
                <ActivityIndicator size="small" color={colors.ink} />
              ) : (
                <Text style={styles.sheetPrimaryText}>Да, записать</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

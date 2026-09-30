import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { CHAT_LIMITS, type ChatMessage } from '../../../engine';
import { ChatBubble, TypingIndicator } from '../../components/Chat';
import { Chip, T } from '../../components/ui';
import { askFutureSelf } from '../../lib/chat';
import { haptic } from '../../lib/haptics';
import { useCustomerState, useSnapshot } from '../../store/derived';
import { useStore, type UiChatMessage } from '../../store/useStore';
import { colors, radius, spacing } from '../../theme/theme';

let seq = 0;
const nextId = () => `m-${Date.now()}-${seq++}`;

export default function PraatScreen() {
  const state = useCustomerState();
  const snapshot = useSnapshot();
  const chat = useStore((s) => s.overlays[s.personaId].chat);
  const appendChat = useStore((s) => s.appendChat);
  const clearChat = useStore((s) => s.clearChat);
  const pendingChat = useStore((s) => s.pendingChat);
  const setPendingChat = useStore((s) => s.setPendingChat);
  const serverStatus = useStore((s) => s.serverStatus);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<FlatList<UiChatMessage>>(null);
  const p = state.persona;

  const send = useCallback(
    async (text: string, alertContext?: string) => {
      const content = text.trim().slice(0, CHAT_LIMITS.maxMessageChars);
      if (!content || busy) return;
      haptic.tap();
      setInput('');
      const pid = useStore.getState().personaId;
      const userMsg: UiChatMessage = { id: nextId(), role: 'user', content, createdAt: Date.now() };
      appendChat(userMsg, pid);
      setBusy(true);
      const history: ChatMessage[] = [...chat, userMsg].slice(-CHAT_LIMITS.maxMessages).map((m) => ({ role: m.role, content: m.content }));
      // The API requires alternating turns starting with the user: drop a leading assistant greeting if any.
      while (history.length && history[0].role !== 'user') history.shift();
      try {
        const reply = await askFutureSelf(snapshot, history, alertContext);
        appendChat({ id: nextId(), role: 'assistant', content: reply.reply, mode: reply.mode, scenario: reply.scenario, toolsUsed: reply.toolsUsed, createdAt: Date.now() }, pid);
        haptic.success();
      } finally {
        setBusy(false);
      }
    },
    [appendChat, busy, chat, snapshot],
  );

  // An alert's "Vraag het aan jezelf in 2035" lands here with a prepared prompt.
  useFocusEffect(
    useCallback(() => {
      if (pendingChat && !busy) {
        const { prompt, alertContext } = pendingChat;
        setPendingChat(null);
        send(prompt, alertContext);
      }
    }, [pendingChat, busy, send, setPendingChat]),
  );

  useEffect(() => {
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [chat.length, busy]);

  const status = serverStatus === 'online' ? { label: 'AI actief', color: colors.green } : serverStatus === 'no_key' ? { label: 'offline modus (geen API-sleutel)', color: colors.amber } : serverStatus === 'offline' ? { label: 'offline modus', color: colors.amber } : { label: 'verbinden…', color: colors.textMuted };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <T variant="heading">{p.futureSelfName}</T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: status.color }} />
              <T variant="caption">Jezelf in 2035 · {status.label}</T>
            </View>
          </View>
          {chat.length ? (
            <Pressable onPress={clearChat} hitSlop={8}>
              <T variant="caption" style={{ color: colors.accent, fontWeight: '600' }}>Wis gesprek</T>
            </Pressable>
          ) : null}
        </View>

        <FlatList
          ref={listRef}
          data={chat}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <ChatBubble msg={item} futureName={p.futureSelfName} />}
          ListHeaderComponent={
            chat.length === 0 ? (
              <View style={styles.intro}>
                <T variant="title" style={{ textAlign: 'center' }}>{p.emoji}</T>
                <T variant="subheading" style={{ textAlign: 'center', marginTop: 8 }}>Hey {p.firstName}, ik ben jou, maar dan in 2035.</T>
                <T variant="caption" style={{ textAlign: 'center', marginTop: 6 }}>
                  Vraag me gerust wat je wil over je geld. Elk cijfer dat ik noem, komt uit dezelfde rekenmotor als de app. Ik verkoop niets.
                </T>
              </View>
            ) : null
          }
          ListFooterComponent={busy ? <TypingIndicator name={p.futureSelfName} /> : null}
        />

        <View style={styles.chipsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.lg }} keyboardShouldPersistTaps="handled">
            {p.suggestedQuestions.map((q) => (
              <Chip key={q} label={q} onPress={() => send(q)} />
            ))}
          </ScrollView>
        </View>
        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={`Vraag het aan ${p.futureSelfName}…`}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            maxLength={CHAT_LIMITS.maxMessageChars}
            onSubmitEditing={() => send(input)}
            blurOnSubmit
            returnKeyType="send"
          />
          <Pressable onPress={() => send(input)} disabled={busy || !input.trim()} style={[styles.sendBtn, (busy || !input.trim()) && { opacity: 0.4 }]}>
            <Ionicons name="arrow-up" size={20} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  list: { padding: spacing.lg, paddingBottom: 8, flexGrow: 1 },
  intro: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 12 },
  chipsWrap: { paddingVertical: 8 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: spacing.lg, paddingBottom: 10, paddingTop: 4 },
  input: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: colors.text, maxHeight: 110, borderWidth: 1, borderColor: colors.border },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
});

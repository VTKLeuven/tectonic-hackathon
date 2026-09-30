import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {
  ChevronDown,
  ChevronUp,
  Key,
  Mic,
  RotateCcw,
  Sparkles,
  Square,
  Volume2,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KateVoiceOrb } from './KateVoiceOrb';
import { Button, Card, Pill, T } from './ui';
import {
  COMMON_QUESTIONS,
  getAnswerScript,
  getBriefingScript,
  getTipDetailScript,
} from '../services/kateDialogue';
import {
  voiceService,
  type VoiceState,
} from '../services/voiceService';
import { useApp } from '../state/AppState';
import { C, F, R, S } from '../theme';
import type { RankedInsight } from '../engine';

interface KateVoiceModalProps {
  visible: boolean;
  onClose: () => void;
  targetTip?: RankedInsight;
}

export function KateVoiceModal({ visible, onClose, targetTip }: KateVoiceModalProps) {
  const insets = useSafeAreaInsets();
  const { data, analysis, lang } = useApp();
  const [voiceState, setVoiceState] = useState<VoiceState>(voiceService.getState());
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(voiceService.getApiKey() || '');
  const [customQuestion, setCustomQuestion] = useState('');

  useEffect(() => {
    const unsubscribe = voiceService.subscribe((state) => {
      setVoiceState(state);
    });
    return () => {
      unsubscribe();
      voiceService.stop();
    };
  }, []);

  // When opened, auto-start speaking context briefing
  useEffect(() => {
    if (visible) {
      const initialScript = targetTip
        ? getTipDetailScript(targetTip, data.persona, lang)
        : getBriefingScript(data.persona, analysis, lang);

      void voiceService.speak(initialScript, lang);
    } else {
      voiceService.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, targetTip?.id, lang]);

  function handleQuestion(questionId: string) {
    const answer = getAnswerScript(questionId, {
      persona: data.persona,
      analysis,
      tip: targetTip ?? analysis.featured ?? undefined,
      lang,
    });
    void voiceService.speak(answer, lang);
  }

  function handleCustomAsk() {
    if (!customQuestion.trim()) return;
    const text = customQuestion.trim();
    setCustomQuestion('');
    // Answer contextually
    const answer = lang === 'nl'
      ? `Sarah, wat betreft je vraag "${text}": Kate analyseert continu je verrichtingen om je hierin te begeleiden.`
      : `Sarah, regarding "${text}": Kate continuously monitors your transactions to assist you.`;
    void voiceService.speak(answer, lang);
  }

  function handleSaveApiKey() {
    void voiceService.setApiKey(apiKeyInput);
    setShowKeyInput(false);
  }

  const engineLabel =
    voiceState.engineUsed === 'elevenlabs'
      ? 'ElevenLabs HD Voice'
      : voiceState.engineUsed === 'browser'
        ? lang === 'nl'
          ? 'KBC Systeemstem'
          : 'System Voice'
        : 'Standby';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, S.lg) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
              <View style={styles.iconBadge}>
                <Sparkles size={16} color={C.blue} />
              </View>
              <View>
                <T v="h3" color={C.navy}>
                  Kate Voice
                </T>
                <T v="tiny" color={C.muted}>
                  {lang === 'nl' ? 'Proactief & uitlegbaar advies' : 'Proactive & explainable advice'}
                </T>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
              <Pill
                text={engineLabel}
                color={voiceState.engineUsed === 'elevenlabs' ? C.blue : C.positive}
                bg={voiceState.engineUsed === 'elevenlabs' ? C.kateBg : C.positiveBg}
              />
              <Pressable
                accessibilityLabel="Close"
                onPress={onClose}
                hitSlop={8}
                style={styles.closeBtn}
              >
                <X size={20} color={C.ink} />
              </Pressable>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Center Animated Orb */}
            <View style={styles.orbContainer}>
              <KateVoiceOrb size={88} isPlaying={voiceState.isPlaying} />
            </View>

            {/* Kinetic Karaoke Subtitles Box */}
            <Card style={styles.transcriptCard}>
              <View style={styles.transcriptHead}>
                <Volume2 size={16} color={C.blue} />
                <T v="tiny" color={C.blue} style={{ fontFamily: F.semibold }}>
                  {voiceState.isPlaying
                    ? lang === 'nl'
                      ? 'KATE SPREEKT'
                      : 'KATE IS SPEAKING'
                    : lang === 'nl'
                      ? 'KATE LUISTERT'
                      : 'KATE IS LISTENING'}
                </T>
              </View>

              <View style={styles.wordsContainer}>
                {voiceState.words.length > 0 ? (
                  voiceState.words.map((word, idx) => {
                    const isActive = idx === voiceState.activeWordIndex;
                    const isPast = idx < voiceState.activeWordIndex;
                    return (
                      <View
                        key={`${word}-${idx}`}
                        style={[styles.wordBubble, isActive && styles.activeWordBubble]}
                      >
                        <T
                          v="body"
                          color={isActive ? C.navy : isPast ? C.ink : C.muted}
                          style={[
                            isActive && { fontFamily: F.bold, color: C.blue },
                            isPast && { fontFamily: F.medium },
                          ]}
                        >
                          {word}
                        </T>
                      </View>
                    );
                  })
                ) : (
                  <T v="body" color={C.muted} style={{ textAlign: 'center', fontStyle: 'italic' }}>
                    {lang === 'nl'
                      ? 'Stel een vraag hieronder of beluister je toelichting.'
                      : 'Ask a question below or listen to your briefing.'}
                  </T>
                )}
              </View>

              {/* Playback Controls */}
              <View style={styles.controlsRow}>
                {voiceState.isPlaying ? (
                  <Pressable
                    onPress={() => voiceService.stop()}
                    style={[styles.actionBtn, { backgroundColor: C.warningBg }]}
                  >
                    <Square size={16} color={C.danger} />
                    <T v="label" color={C.danger}>
                      {lang === 'nl' ? 'Pauzeer stem' : 'Pause voice'}
                    </T>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => {
                      if (voiceState.currentText) {
                        void voiceService.speak(voiceState.currentText, lang);
                      }
                    }}
                    style={[styles.actionBtn, { backgroundColor: C.kateBg }]}
                  >
                    <RotateCcw size={16} color={C.blue} />
                    <T v="label" color={C.blue}>
                      {lang === 'nl' ? 'Herhaal' : 'Replay'}
                    </T>
                  </Pressable>
                )}
              </View>
            </Card>

            {/* Quick Contextual Question Chips */}
            <T v="label" color={C.muted} style={{ marginTop: S.lg, marginBottom: S.xs }}>
              {lang === 'nl' ? 'Veelgestelde vragen aan Kate' : 'Frequently asked to Kate'}
            </T>

            <View style={styles.questionsGrid}>
              {COMMON_QUESTIONS.map((q) => (
                <Pressable
                  key={q.id}
                  onPress={() => handleQuestion(q.id)}
                  style={({ pressed }) => [styles.questionChip, pressed && { opacity: 0.7 }]}
                >
                  <T v="small" color={C.navy} style={{ fontFamily: F.medium }}>
                    {q[lang]}
                  </T>
                </Pressable>
              ))}
            </View>

            {/* Custom Question Input */}
            <View style={styles.inputRow}>
              <TextInput
                value={customQuestion}
                onChangeText={setCustomQuestion}
                placeholder={
                  lang === 'nl' ? 'Stel een vraag aan Kate...' : 'Ask Kate anything...'
                }
                placeholderTextColor={C.muted}
                style={styles.textInput}
                onSubmitEditing={handleCustomAsk}
              />
              <Pressable
                onPress={handleCustomAsk}
                disabled={!customQuestion.trim()}
                style={[styles.sendBtn, !customQuestion.trim() && { opacity: 0.5 }]}
              >
                <Mic size={18} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* Optional ElevenLabs API Key Settings Accordion */}
            <Pressable
              onPress={() => setShowKeyInput(!showKeyInput)}
              style={styles.settingsToggle}
            >
              <Key size={14} color={C.muted} />
              <T v="tiny" color={C.muted} style={{ flex: 1 }}>
                {lang === 'nl'
                  ? 'ElevenLabs API-instellingen (optioneel)'
                  : 'ElevenLabs API Settings (optional)'}
              </T>
              {showKeyInput ? (
                <ChevronUp size={14} color={C.muted} />
              ) : (
                <ChevronDown size={14} color={C.muted} />
              )}
            </Pressable>

            {showKeyInput && (
              <Card style={{ marginTop: S.sm, padding: S.md }}>
                <T v="tiny" color={C.muted} style={{ marginBottom: S.xs }}>
                  {lang === 'nl'
                    ? 'Plak hier je ElevenLabs API Key voor studiokwaliteit spraaksynthese. Zonder key gebruikt Kate automatisch de ingebouwde browserstem.'
                    : 'Paste your ElevenLabs API Key here for studio voice synthesis. Without a key, Kate automatically falls back to system speech.'}
                </T>
                <TextInput
                  value={apiKeyInput}
                  onChangeText={setApiKeyInput}
                  secureTextEntry
                  placeholder="xi-api-key..."
                  placeholderTextColor={C.muted}
                  style={styles.apiKeyInput}
                />
                <Button
                  label={lang === 'nl' ? 'Sleutel opslaan' : 'Save Key'}
                  onPress={handleSaveApiKey}
                  style={{ marginTop: S.sm }}
                />
              </Card>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: R.md,
    backgroundColor: C.kateBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: R.pill,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: S.lg,
  },
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: S.sm,
  },
  transcriptCard: {
    padding: S.lg,
    backgroundColor: C.card,
    borderRadius: R.lg,
  },
  transcriptHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: S.sm,
  },
  wordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    minHeight: 80,
    alignItems: 'center',
  },
  wordBubble: {
    marginRight: 4,
    marginVertical: 2,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 4,
  },
  activeWordBubble: {
    backgroundColor: C.kateBg,
    borderRadius: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: S.md,
    gap: S.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: S.md,
    paddingVertical: 6,
    borderRadius: R.pill,
  },
  questionsGrid: {
    gap: S.sm,
  },
  questionChip: {
    backgroundColor: C.card,
    paddingHorizontal: S.md,
    paddingVertical: 10,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.line,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.lg,
    gap: S.sm,
  },
  textInput: {
    flex: 1,
    height: 44,
    backgroundColor: C.card,
    borderRadius: R.md,
    paddingHorizontal: S.md,
    borderWidth: 1,
    borderColor: C.line,
    color: C.ink,
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: R.md,
    backgroundColor: C.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: S.xl,
    paddingVertical: S.xs,
  },
  apiKeyInput: {
    height: 40,
    backgroundColor: C.bg,
    borderRadius: R.sm,
    paddingHorizontal: S.sm,
    borderWidth: 1,
    borderColor: C.line,
    color: C.ink,
    fontSize: 13,
  },
});

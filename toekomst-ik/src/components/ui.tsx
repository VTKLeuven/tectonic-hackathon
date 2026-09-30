/** Small UI primitives shared by every screen. */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, shadow, spacing } from '../theme/theme';
import { haptic } from '../lib/haptics';

type Variant = 'title' | 'heading' | 'subheading' | 'body' | 'caption' | 'amount' | 'amountSmall' | 'label';

const textStyles: Record<Variant, TextStyle> = {
  title: { fontSize: 28, fontWeight: '700', color: colors.navy, letterSpacing: -0.5 },
  heading: { fontSize: 20, fontWeight: '700', color: colors.navy },
  subheading: { fontSize: 16, fontWeight: '600', color: colors.navy },
  body: { fontSize: 15, color: colors.text, lineHeight: 22 },
  caption: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  amount: { fontSize: 34, fontWeight: '700', color: colors.navy, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  amountSmall: { fontSize: 20, fontWeight: '700', color: colors.navy, fontVariant: ['tabular-nums'] },
  label: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
};

export function T({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }) {
  return <Text {...props} style={[textStyles[variant], style]} />;
}

export function Card({ children, style, tone }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; tone?: 'navy' | 'accent' }) {
  return (
    <View
      style={[
        styles.card,
        tone === 'navy' && { backgroundColor: colors.navy },
        tone === 'accent' && { backgroundColor: colors.accentSoft },
        style,
      ]}>
      {children}
    </View>
  );
}

export function Screen({ children, title, subtitle, scroll = true, padded = true, inStack = false }: { children: React.ReactNode; title?: string; subtitle?: string; scroll?: boolean; padded?: boolean; inStack?: boolean }) {
  const inner = (
    <>
      {title ? (
        <View style={styles.header}>
          <T variant="title">{title}</T>
          {subtitle ? <T variant="caption" style={{ marginTop: 4 }}>{subtitle}</T> : null}
        </View>
      ) : null}
      {children}
    </>
  );
  return (
    <SafeAreaView style={styles.safe} edges={inStack ? ['left', 'right'] : ['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={[padded && styles.content]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {inner}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, padded && styles.content]}>{inner}</View>
      )}
    </SafeAreaView>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <T variant="label">{title}</T>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <T variant="caption" style={{ color: colors.accent, fontWeight: '600' }}>{action}</T>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  small,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  small?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = variant === 'primary' ? colors.navy : variant === 'secondary' ? colors.accentSoft : variant === 'danger' ? colors.redSoft : 'transparent';
  const fg = variant === 'primary' ? colors.white : variant === 'danger' ? colors.red : colors.navy;
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        small && styles.buttonSmall,
        variant === 'ghost' && { borderWidth: 1, borderColor: colors.border },
        style,
      ]}>
      <Text style={[styles.buttonText, { color: fg }, small && { fontSize: 13 }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, onPress, selected, style }: { label: string; onPress?: () => void; selected?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress?.();
      }}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && { opacity: 0.8 }, style]}>
      <Text style={[styles.chipText, selected && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

export function Row({ label, value, strong, style }: { label: string; value: string; strong?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.row, style]}>
      <T variant="caption" style={{ flex: 1, color: strong ? colors.navy : colors.textSecondary, fontWeight: strong ? '600' : '400' }}>{label}</T>
      <T variant="body" style={{ fontWeight: strong ? '700' : '600', fontVariant: ['tabular-nums'], marginLeft: 12 }}>{value}</T>
    </View>
  );
}

export function StatTile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'warn' | 'bad' }) {
  const color = tone === 'good' ? colors.green : tone === 'warn' ? colors.amber : tone === 'bad' ? colors.red : colors.navy;
  return (
    <View style={styles.stat}>
      <T variant="label">{label}</T>
      <T variant="amountSmall" style={{ color, marginTop: 4 }}>{value}</T>
      {sub ? <T variant="caption" style={{ marginTop: 2 }}>{sub}</T> : null}
    </View>
  );
}

export function ProgressBar({ value, color = colors.accent, height = 8 }: { value: number; color?: string; height?: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.progressTrack, { height, borderRadius: height / 2 }]}>
      <View style={{ width: `${pct * 100}%`, backgroundColor: color, height, borderRadius: height / 2 }} />
    </View>
  );
}

export function LinkRow({ title, subtitle, onPress, icon }: { title: string; subtitle?: string; onPress: () => void; icon?: React.ReactNode }) {
  return (
    <Pressable onPress={() => { haptic.tap(); onPress(); }} style={({ pressed }) => [styles.linkRow, pressed && { backgroundColor: colors.background }]}>
      {icon ? <View style={{ marginRight: 12 }}>{icon}</View> : null}
      <View style={{ flex: 1 }}>
        <T variant="subheading">{title}</T>
        {subtitle ? <T variant="caption" style={{ marginTop: 2 }}>{subtitle}</T> : null}
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 20 }}>›</Text>
    </Pressable>
  );
}

export function Touchable(props: PressableProps) {
  return <Pressable {...props} style={(state) => [{ opacity: state.pressed ? 0.8 : 1 }, typeof props.style === 'function' ? props.style(state) : props.style]} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 48, gap: spacing.md },
  header: { marginBottom: spacing.sm, marginTop: spacing.sm },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, ...shadow },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, marginBottom: 2 },
  button: { paddingVertical: 13, paddingHorizontal: 18, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  buttonSmall: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: radius.sm },
  buttonText: { fontSize: 15, fontWeight: '600' },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chipSelected: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { color: colors.navy, fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, ...shadow },
  progressTrack: { backgroundColor: colors.border, overflow: 'hidden', width: '100%' },
  linkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});

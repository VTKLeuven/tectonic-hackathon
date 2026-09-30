import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { C, F, R, S, shadow } from '../theme';

type Variant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'tiny' | 'label';

const VARIANTS: Record<Variant, TextStyle> = {
  display: { fontFamily: F.bold, fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  h1: { fontFamily: F.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  h2: { fontFamily: F.semibold, fontSize: 19, lineHeight: 25, letterSpacing: -0.2 },
  h3: { fontFamily: F.semibold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: F.regular, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: F.regular, fontSize: 13, lineHeight: 18 },
  tiny: { fontFamily: F.medium, fontSize: 11, lineHeight: 14 },
  label: { fontFamily: F.semibold, fontSize: 13, lineHeight: 18 },
};

export function T({
  v = 'body',
  color = C.ink,
  style,
  ...rest
}: TextProps & { v?: Variant; color?: string; style?: StyleProp<TextStyle> }) {
  return <Text {...rest} style={[VARIANTS[v], { color }, style]} />;
}

/** Tabular numbers, for amounts in lists. */
export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export function Card({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  return <View style={[styles.card, padded && { padding: S.lg }, style]}>{children}</View>;
}

export function Section({ title, action, children, style }: { title?: string; action?: ReactNode; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ marginTop: S.xl }, style]}>
      {(title || action) && (
        <View style={styles.sectionHead}>
          {title ? <T v="h3">{title}</T> : <View />}
          {action}
        </View>
      )}
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  icon: Icon,
  style,
  disabled,
}: {
  label: string;
  onPress?: PressableProps['onPress'];
  kind?: 'primary' | 'secondary' | 'ghost' | 'navy';
  icon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) {
  const palette = {
    primary: { bg: C.blue, fg: '#FFFFFF', border: C.blue },
    navy: { bg: C.navy, fg: '#FFFFFF', border: C.navy },
    secondary: { bg: C.card, fg: C.navy, border: C.lineStrong },
    ghost: { bg: 'transparent', fg: C.blue, border: 'transparent' },
  }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {Icon && <Icon size={18} color={palette.fg} strokeWidth={2} />}
      <Text style={[VARIANTS.label, { color: palette.fg, fontSize: 15 }]}>{label}</Text>
    </Pressable>
  );
}

export function ListRow({
  icon: Icon,
  iconBg = C.bg,
  iconColor = C.navy,
  title,
  subtitle,
  right,
  onPress,
  chevron = !!onPress,
  last,
}: {
  icon?: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  last?: boolean;
}) {
  const content = (
    <View style={[styles.row, !last && styles.rowLine]}>
      {Icon && (
        <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
          <Icon size={18} color={iconColor} strokeWidth={2} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="body" numberOfLines={1} style={{ fontFamily: F.medium }}>
          {title}
        </T>
        {subtitle ? (
          <T v="small" color={C.muted} numberOfLines={1}>
            {subtitle}
          </T>
        ) : null}
      </View>
      {right}
      {chevron && <ChevronRight size={18} color={C.faint} />}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { backgroundColor: C.bg }}>
      {content}
    </Pressable>
  );
}

export function Pill({ text, color = C.navy, bg = C.bg, icon: Icon }: { text: string; color?: string; bg?: string; icon?: LucideIcon }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {Icon && <Icon size={12} color={color} strokeWidth={2.4} />}
      <Text style={[VARIANTS.tiny, { color, fontFamily: F.semibold }]}>{text}</Text>
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: C.line }, style]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: R.lg,
    ...shadow,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: S.sm,
    paddingHorizontal: S.xs,
  },
  button: {
    minHeight: 48,
    borderRadius: R.pill,
    borderWidth: 1,
    paddingHorizontal: S.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    paddingVertical: S.md,
    paddingHorizontal: S.lg,
    minHeight: 56,
  },
  rowLine: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: R.pill,
  },
});

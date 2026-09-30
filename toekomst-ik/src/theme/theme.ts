/** Design tokens: calm, trustworthy fintech. KBC-inspired colours, no logos. */
import { Platform } from 'react-native';
import type { Severity } from '../../engine';

export const colors = {
  navy: '#0B2A4A',
  navySoft: '#173B63',
  accent: '#00A3E0',
  accentSoft: '#E5F5FC',
  background: '#F5F7FA',
  card: '#FFFFFF',
  text: '#0B2A4A',
  textSecondary: '#5B6B7C',
  textMuted: '#8A97A6',
  border: '#E3E8EE',
  green: '#1E9E6A',
  greenSoft: '#E6F5EE',
  amber: '#E8A200',
  amberSoft: '#FFF6DF',
  red: '#D64545',
  redSoft: '#FCE9E9',
  white: '#FFFFFF',
} as const;

export const severityColor: Record<Severity, string> = {
  info: colors.green,
  let_op: colors.amber,
  waarschuwing: colors.red,
  dringend: colors.red,
};

export const severitySoft: Record<Severity, string> = {
  info: colors.greenSoft,
  let_op: colors.amberSoft,
  waarschuwing: colors.redSoft,
  dringend: colors.redSoft,
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;

export const shadow = Platform.select({
  ios: { shadowColor: '#0B2A4A', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  android: { elevation: 2 },
  default: {},
}) as object;

export const font = {
  regular: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }) as string,
};

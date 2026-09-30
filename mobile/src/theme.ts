/**
 * The look of KBC Mobile, as tokens. Every colour in the app comes from here.
 *
 * Navy and cyan are KBC's brand pair. Kate, the assistant, gets a soft
 * cyan tint so her tips are recognisable without shouting.
 */
export const C = {
  navy: '#003665',
  navyDeep: '#00264A',
  cyan: '#00AEEF',
  blue: '#0097DB',
  /** Page background. */
  bg: '#F2F5F8',
  card: '#FFFFFF',
  ink: '#16283A',
  body: '#3C4E60',
  muted: '#667788',
  faint: '#98A6B4',
  line: '#E3E9EF',
  lineStrong: '#CBD5DF',
  /** Kate's surface: a whisper of cyan. */
  kateBg: '#E8F7FD',
  kateLine: '#BFE8F8',
  positive: '#0B7A55',
  positiveBg: '#E4F4EE',
  warning: '#9A5B00',
  warningBg: '#FFF3DC',
  danger: '#C0392B',
  onNavy: '#FFFFFF',
  onNavyMuted: '#A9C0D6',
  /** Chart series: validated for colour-blind separation and 3:1 contrast on white. */
  series: {
    electricity: '#0097DB',
    heating: '#CC6A1F',
    mobility: '#5B4FC7',
  },
} as const;

export const F = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

export const R = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;

export const shadow = {
  shadowColor: '#0B2239',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

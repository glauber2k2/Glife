// Tokens do design system. ÚNICO lugar com cores, tamanhos e espaçamentos literais.
// Nenhuma tela ou componente deve usar valores "soltos".

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  /** fundo da tela */
  bg: string;
  /** superfícies elevadas por cor, não por sombra (folhas, campos) */
  surface: string;
  /** hover/pressed discreto */
  surfacePressed: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  hairline: string;
  /** a única cor de destaque */
  accent: string;
  accentPressed: string;
  onAccent: string;
  accentSoft: string;
  success: string;
  warning: string;
  danger: string;
  highlight: { yellow: string; green: string; blue: string; pink: string };
  scrim: string;
}

const light: Palette = {
  bg: '#FAFAF9',
  surface: '#FFFFFF',
  surfacePressed: '#F2F1EF',
  text: '#1C1917',
  textSecondary: '#57534E',
  textTertiary: '#78716C',
  hairline: '#E7E5E4',
  accent: '#3451B2',
  accentPressed: '#2A4194',
  onAccent: '#FFFFFF',
  accentSoft: '#E9EDFA',
  success: '#2F7D4F',
  warning: '#9A6512',
  danger: '#B42318',
  highlight: { yellow: '#FBEFB4', green: '#D6EED9', blue: '#D7E6F7', pink: '#F6DCE5' },
  scrim: 'rgba(12,12,11,0.32)',
};

const dark: Palette = {
  bg: '#0C0C0B',
  surface: '#161615',
  surfacePressed: '#1F1F1D',
  text: '#EDEDEC',
  textSecondary: '#B5B3AF',
  textTertiary: '#8F8E8A',
  hairline: '#2A2A28',
  accent: '#8DA4EF',
  accentPressed: '#A9BBF3',
  onAccent: '#0C0C0B',
  accentSoft: '#1B2240',
  success: '#6BC48D',
  warning: '#E0B25C',
  danger: '#F08A80',
  highlight: { yellow: '#4A4320', green: '#22402A', blue: '#1F3450', pink: '#4A2533' },
  scrim: 'rgba(0,0,0,0.6)',
};

export const palettes: Record<ColorScheme, Palette> = { light, dark };

/** Grade de 4 px (0.5 = meio passo, só para respiros mínimos entre linhas de texto) */
export const space = { 0.5: 2, 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32, 12: 48 } as const;
export type SpaceKey = keyof typeof space;

export const radius = { field: 8, card: 12, full: 999 } as const;

export const fonts = {
  sans: { regular: 'Inter_400Regular', medium: 'Inter_500Medium', semibold: 'Inter_600SemiBold' },
  serif: { regular: 'SourceSerif4_400Regular', semibold: 'SourceSerif4_600SemiBold' },
} as const;

/** Escala 12 · 14 · 16 · 20 · 24 · 32 */
export const typeScale = {
  display: { fontSize: 32, lineHeight: 40, font: fonts.sans.semibold, letterSpacing: -0.5 },
  title: { fontSize: 24, lineHeight: 32, font: fonts.sans.semibold, letterSpacing: -0.3 },
  heading: { fontSize: 20, lineHeight: 28, font: fonts.sans.medium, letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 26, font: fonts.sans.regular, letterSpacing: 0 },
  bodyMedium: { fontSize: 16, lineHeight: 24, font: fonts.sans.medium, letterSpacing: 0 },
  reading: { fontSize: 16, lineHeight: 26, font: fonts.serif.regular, letterSpacing: 0 },
  scripture: { fontSize: 18, lineHeight: 30, font: fonts.serif.regular, letterSpacing: 0 },
  label: { fontSize: 14, lineHeight: 20, font: fonts.sans.medium, letterSpacing: 0 },
  small: { fontSize: 14, lineHeight: 20, font: fonts.sans.regular, letterSpacing: 0 },
  caption: { fontSize: 12, lineHeight: 16, font: fonts.sans.regular, letterSpacing: 0.2 },
} as const;
export type TypeVariant = keyof typeof typeScale;

export const icon = { size: 20, strokeWidth: 1.5 } as const;

export const touch = { minTarget: 44 } as const;

/** Larguras máximas: no web/tablet o conteúdo não se estica pela tela inteira. */
export const layout = { contentMaxWidth: 720, sheetMaxWidth: 640 } as const;

/** Estados sem mudar cor: pressionado e desabilitado. */
export const opacity = { pressed: 0.6, disabled: 0.45 } as const;

/** Medidas fixas de componentes. */
export const size = {
  chipHeight: 32,
  swatch: 32,
  grabberWidth: 36,
  grabberHeight: 4,
  captureFieldMinHeight: 160,
} as const;

export const motion = { fast: 150, base: 200, slow: 250 } as const;

export const hairlineWidth = 1;

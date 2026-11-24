// Tokens do design system Glife (direção Glaciar para cor e forma, Sinóptico para tipografia).
// Fonte: docs/design-system/ (tokens/*.css). ÚNICO lugar com cores, tamanhos e espaçamentos literais.
// Nenhuma tela ou componente deve usar valores "soltos".

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  /** fundo da tela e das folhas */
  bg: string;
  /** preenchimento discreto: toque, hover, pílula da aba ativa */
  soft: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  /** linha de 1 px que separa blocos */
  hairline: string;
  /** a única cor de destaque: fundos (botão principal, chip selecionado) */
  accent: string;
  /** botão principal pressionado (brilho 0,94) */
  accentPressed: string;
  /** destaque para texto, links e ícones ativos */
  accentInk: string;
  onAccent: string;
  success: string;
  warning: string;
  danger: string;
  /** marca-textos, só na leitura */
  highlight: { ice: string; honey: string; mint: string; lilac: string };
  scrim: string;
  /** valor previsto nas barras (orçamento): cinza mais claro que o realizado */
  planned: string;
  /** fundo do QR code: claro nos dois temas, para qualquer leitor conseguir ler */
  qrPaper: string;
  qrInk: string;
}

const light: Palette = {
  bg: '#F1F4F7',
  soft: '#E3EAF1',
  text: '#14273B',
  textSecondary: '#475A6D',
  textTertiary: '#5F7184',
  hairline: '#D9E1E9',
  accent: '#3A6690',
  accentPressed: '#376087',
  accentInk: '#345D84',
  onAccent: '#FFFFFF',
  success: '#2F8A6E',
  warning: '#B97F1F',
  danger: '#C2453D',
  highlight: { ice: '#CFE3F5', honey: '#F4E6B5', mint: '#D3EBDD', lilac: '#E9D6EE' },
  scrim: 'rgba(16,28,40,0.32)',
  planned: '#A8B4C1',
  qrPaper: '#FFFFFF',
  qrInk: '#14273B',
};

const dark: Palette = {
  bg: '#0F1822',
  soft: '#192633',
  text: '#E8EFF5',
  textSecondary: '#A3B3C2',
  textTertiary: '#7A8DA0',
  hairline: '#233242',
  accent: '#7FA9D1',
  accentPressed: '#779FC5',
  accentInk: '#8DB5DB',
  onAccent: '#0F1822',
  success: '#5CC2A0',
  warning: '#E4B260',
  danger: '#EE7F76',
  highlight: { ice: '#24425E', honey: '#5A4E26', mint: '#24493A', lilac: '#4A3554' },
  scrim: 'rgba(0,0,0,0.55)',
  planned: '#4A5B6C',
  qrPaper: '#FFFFFF',
  qrInk: '#14273B',
};

export const palettes: Record<ColorScheme, Palette> = { light, dark };

/** Grade de 4 px (0.5 = meio passo, só para respiros mínimos entre linhas de texto) */
export const space = { 0: 0, 0.5: 2, 1: 4, 1.5: 6, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 12: 48 } as const;
export type SpaceKey = keyof typeof space;

/** Controles são pílulas; campos 16, cards em repouso 20, topo da folha 30. */
export const radius = { field: 16, card: 20, sheet: 30, full: 999 } as const;

export const fonts = {
  sans: {
    light: 'HankenGrotesk_300Light',
    regular: 'HankenGrotesk_400Regular',
    medium: 'HankenGrotesk_500Medium',
    semibold: 'HankenGrotesk_600SemiBold',
  },
  serif: { regular: 'CrimsonPro_400Regular', medium: 'CrimsonPro_500Medium', italic: 'CrimsonPro_400Regular_Italic' },
  mono: { regular: 'JetBrainsMono_400Regular' },
} as const;

export interface TypeStyle {
  fontSize: number;
  lineHeight: number;
  font: string;
  letterSpacing: number;
  textTransform?: 'uppercase';
}

/** Escala Sinóptico: títulos grandes e leves, rótulos pequenos em caixa alta, serifa só para ler. */
export const typeScale = {
  wordmark: { fontSize: 44, lineHeight: 44, font: fonts.sans.light, letterSpacing: -2.2 },
  wordmarkSmall: { fontSize: 20, lineHeight: 26, font: fonts.sans.light, letterSpacing: -0.7 },
  digit: { fontSize: 20, lineHeight: 26, font: fonts.sans.regular, letterSpacing: 0 },
  display: { fontSize: 44, lineHeight: 44, font: fonts.sans.light, letterSpacing: -1.98 },
  title: { fontSize: 34, lineHeight: 36, font: fonts.sans.light, letterSpacing: -1.19 },
  title2: { fontSize: 30, lineHeight: 32, font: fonts.sans.light, letterSpacing: -1.05 },
  heading: { fontSize: 20, lineHeight: 26, font: fonts.sans.medium, letterSpacing: -0.3 },
  item: { fontSize: 17, lineHeight: 22, font: fonts.sans.medium, letterSpacing: -0.17 },
  body: { fontSize: 15, lineHeight: 22, font: fonts.sans.regular, letterSpacing: 0 },
  button: { fontSize: 15, lineHeight: 20, font: fonts.sans.semibold, letterSpacing: 0 },
  chip: { fontSize: 14, lineHeight: 18, font: fonts.sans.medium, letterSpacing: 0 },
  small: { fontSize: 13.5, lineHeight: 20, font: fonts.sans.regular, letterSpacing: 0 },
  caption: { fontSize: 12.5, lineHeight: 18, font: fonts.sans.regular, letterSpacing: 0 },
  eyebrow: { fontSize: 12.5, lineHeight: 18, font: fonts.sans.medium, letterSpacing: 0 },
  label: { fontSize: 11, lineHeight: 14, font: fonts.sans.semibold, letterSpacing: 0.88, textTransform: 'uppercase' },
  tab: { fontSize: 11, lineHeight: 14, font: fonts.sans.medium, letterSpacing: 0 },
  readingTitle: { fontSize: 23, lineHeight: 28, font: fonts.serif.medium, letterSpacing: 0 },
  scripture: { fontSize: 20, lineHeight: 31, font: fonts.serif.regular, letterSpacing: 0 },
  reading: { fontSize: 18, lineHeight: 28, font: fonts.serif.regular, letterSpacing: 0 },
  /** valor digitado em destaque (confirmar previsto, pagar fatura) */
  amountField: { fontSize: 32, lineHeight: 38, font: fonts.sans.light, letterSpacing: -1 },
  subtitle: { fontSize: 17, lineHeight: 24, font: fonts.serif.italic, letterSpacing: 0 },
  mono: { fontSize: 13.5, lineHeight: 22, font: fonts.mono.regular, letterSpacing: 0 },
} as const satisfies Record<string, TypeStyle>;
export type TypeVariant = keyof typeof typeScale;

/** Lucide, só contorno, traço 1,5: 20 em abas e ações, 16 em linhas, 13 em chips de vínculo. */
export const icon = { size: 20, small: 16, tiny: 13, strokeWidth: 1.5 } as const;

export const touch = { minTarget: 44, hitSlop: 6 } as const;

/** Margem lateral de 22 px; blocos separados por 18 px e uma linha. No web o conteúdo não se estica. */
export const layout = {
  gutter: 22,
  blockGap: 18,
  contentMaxWidth: 720,
  sheetMaxWidth: 640,
  authMaxWidth: 400,
  /** respiro acima do wordmark na tela Entrar */
  authTop: 120,
  /** cabeçalho das etapas de acesso (wordmark + Sair) */
  headerHeight: 56,
} as const;

/** Estados sem mudar cor: pressionado (sem movimento) e desabilitado. */
export const opacity = { hidden: 0, full: 1, pressed: 0.6, disabled: 0.6, fieldDisabled: 0.55, faint: 0.35 } as const;

/** Medidas fixas de componentes. */
export const size = {
  button: 48,
  buttonSmall: 40,
  iconButton: 40,
  field: 54,
  search: 46,
  chipHeight: 34,
  chipSmall: 32,
  linkChip: 26,
  tabBar: 70,
  toast: 40,
  pill: 32,
  pillSmall: 26,
  navRow: 48,
  navRowTall: 52,
  editorBar: 56,
  formatBar: 48,
  swatch: 32,
  grabberWidth: 36,
  grabberHeight: 4,
  captureFieldMinHeight: 160,
  qrCode: 128,
  qrBox: 152,
  spinner: 16,
  caretWidth: 1.5,
  caretHeight: 22,
  strike: 1.5,
  track: 3,
  trackThin: 2,
  /** círculo de 34 px com o ícone da categoria (listas de Finanças) */
  disc: 34,
  /** coluna da data (dia e mês) em Próximos */
  dateColumn: 30,
  /** rótulo do seletor de mês entre as setas */
  monthLabel: 78,
  /** campo do valor em destaque (confirmar, pagar) */
  fieldLarge: 78,
  /** campo de orçamento editável na linha */
  budgetInputWidth: 116,
  budgetInputHeight: 36,
  /** menu flutuante de ações de uma linha */
  menuWidth: 220,
  menuItem: 44,
  /** marca do limite na barra do orçamento */
  limitTick: 9,
  /** rádio 20 com ponto de 10 */
  radio: 20,
  radioDot: 10,
  radioBorder: 1.5,
  /** interruptor 46 × 28, bolinha de 22 a 3 px da borda */
  switchWidth: 46,
  switchHeight: 28,
  switchKnob: 22,
} as const;

/** Campo com rótulo flutuante (54 px, cantos de 16). */
export const field = {
  paddingX: 18,
  paddingTop: 22,
  paddingBottom: 6,
  labelTop: 17,
  labelLift: -10,
  labelScale: 0.77,
} as const;

/** Durações (ms) e coreografia de listas. */
export const motion = {
  tap: 200,
  standard: 300,
  emphasis: 350,
  gentle: 320,
  stagger: 40,
  /** a borda de trás da linha da aba ativa parte depois da da frente, e a linha estica */
  tabLineDelay: 50,
  enterOffset: 12,
  collapseDelay: 650,
  toast: 2200,
  /** toast com ação ("Desfazer") fica mais tempo */
  toastLong: 4000,
  spin: 800,
  /** a entrada da etapa seguinte começa depois da saída */
  stepDelay: 90,
  /** senha errada: um tremor só, amortecido */
  shake: 280,
} as const;

/** Deslocamentos (px) do tremor do campo de senha errada: 0 → −6 → 5 → −3 → 0. */
export const shakeSteps = [-6, 5, -3, 0] as const;

/**
 * Quatro molas amortecidas (quase sem ultrapassar o destino):
 * tap — toque, checkbox, chip · standard — abas, entradas de lista, foco ·
 * emphasis — folha, card que vira tela, números · gentle — recolher, reordenar, marca-texto.
 */
export const spring = {
  tap: { duration: 200, dampingRatio: 0.9 },
  standard: { duration: 300, dampingRatio: 0.85 },
  emphasis: { duration: 350, dampingRatio: 0.82 },
  gentle: { duration: 320, dampingRatio: 0.95 },
} as const;

export const pressScale = { rest: 1, pressed: 0.96, pressedSmall: 0.9 } as const;

export const hairlineWidth = 1;

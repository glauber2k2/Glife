// Tokens do design system Glife Cobalto v1.0 (docs/design-system-cobalto/tokens.css), claro e escuro.
// ÚNICO lugar com cores, tamanhos e espaçamentos literais. Nenhuma tela ou componente deve usar valores "soltos".
//
// Nomes semânticos mantidos da versão anterior (mapa para o CSS do Cobalto):
//   text = --fg · textSecondary = --fg-2 · textTertiary = --fg-3 · textQuaternary = --fg-4 · hairline = --line
//   accentInk = --accent-text · success/warning/danger = --ok/--warn/--bad · soft = preenchimento de toque

export type ColorScheme = 'light' | 'dark';

export interface Shadows {
  /** dia ou segmento ativo */
  level1: string;
  /** aviso, botão flutuante */
  level2: string;
  /** folha, diálogo */
  level3: string;
  segment: string;
  nav: string;
  /** CTA cobalto e botão + (sombra azulada) */
  fab: string;
  knob: string;
}

export interface Palette {
  /** fundo do app */
  bg: string;
  /** cartões, grupos de lista, folhas, barra de abas */
  card: string;
  /** cartão dentro de cartão, indicador do segmentado no escuro */
  card2: string;
  /** preenchimento de toque e de controles discretos sobre o fundo */
  soft: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  /** desabilitado, chevrons, placeholders */
  textQuaternary: string;
  /** divisória de 1 px */
  hairline: string;
  hairline2: string;
  /** contorno de controles (interruptor desligado, rádio, check) */
  border: string;
  /** trilho de barras e do segmentado */
  track: string;
  /** fundo da ação principal e do item ativo */
  accent: string;
  accentPressed: string;
  /** link e ícone de destaque sobre superfícies */
  accentInk: string;
  onAccent: string;
  /** ação secundária, aba ativa, bloco da IA */
  tonal: string;
  tonalInk: string;
  /** fundo muito leve de destaque (linha selecionada) */
  highlightSoft: string;
  accentSoft: string;
  /** momentos de destaque (cartão da fatura, toast) */
  inverse: string;
  inverseInk: string;
  /** números sobre o inverso */
  inverseAccent: string;
  inverseMuted: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  /** vermelho de anéis e barras estouradas */
  dangerStrong: string;
  dangerSoft: string;
  /** marca-textos, só na leitura */
  highlight: { yellow: string; green: string; blue: string; pink: string };
  /** traço do sublinhado do leitor (mais forte que o marca-texto, para aparecer sobre o papel) */
  highlightLine: { yellow: string; green: string; blue: string; pink: string };
  scrim: string;
  /** véu claro sobre cartão inverso (botão circular) */
  onInverseSoft: string;
  /** valor previsto nas barras: listrado com esta cor */
  planned: string;
  /** fundo do QR code: claro nos dois temas, para qualquer leitor conseguir ler */
  qrPaper: string;
  qrInk: string;
  /** bolinha do interruptor */
  knob: string;
  shadow: Shadows;
}

const light: Palette = {
  bg: '#F1F3F6',
  card: '#FFFFFF',
  card2: '#F7F8FA',
  soft: '#E9ECF1',
  text: '#0E1116',
  textSecondary: '#4B5260',
  textTertiary: '#636A77',
  textQuaternary: '#9AA0AB',
  hairline: '#ECEEF2',
  hairline2: '#E3E7EC',
  border: '#C9CED8',
  track: '#E6E9EE',
  accent: '#2D5BFF',
  accentPressed: '#2349DB',
  accentInk: '#2D5BFF',
  onAccent: '#FFFFFF',
  tonal: '#E2E8FF',
  tonalInk: '#1F3FB8',
  highlightSoft: '#F3F5FF',
  accentSoft: '#C9D4FF',
  inverse: '#0E1116',
  inverseInk: '#FFFFFF',
  inverseAccent: '#9DB2FF',
  inverseMuted: '#9AA0AB',
  success: '#15803D',
  successSoft: '#DCF2E4',
  warning: '#7A5000',
  warningSoft: '#FCEFD6',
  danger: '#A3322A',
  dangerStrong: '#C2453D',
  dangerSoft: '#FBE3E1',
  highlight: { yellow: '#F3E5B0', green: '#C4F2CC', blue: '#C2E9FF', pink: '#FFD2EB' },
  highlightLine: { yellow: '#C9A21C', green: '#2E9E4A', blue: '#2F86C9', pink: '#D14E92' },
  scrim: 'rgba(14,17,22,0.36)',
  onInverseSoft: 'rgba(255,255,255,0.12)',
  planned: '#C9CED8',
  qrPaper: '#FFFFFF',
  qrInk: '#0E1116',
  knob: '#FFFFFF',
  shadow: {
    level1: '0px 1px 2px rgba(14,17,22,0.04), 0px 6px 16px -8px rgba(14,17,22,0.16)',
    level2: '0px 14px 32px -12px rgba(14,17,22,0.32)',
    level3: '0px -12px 40px -14px rgba(14,17,22,0.34), 0px 18px 40px -16px rgba(14,17,22,0.3)',
    segment: '0px 1px 3px rgba(14,17,22,0.12)',
    nav: '0px 12px 32px -12px rgba(14,17,22,0.3), 0px 0px 0px 1px rgba(14,17,22,0.04)',
    fab: '0px 10px 22px -8px rgba(45,91,255,0.7)',
    knob: '0px 2px 6px rgba(14,17,22,0.2)',
  },
};

const dark: Palette = {
  bg: '#0C0F15',
  card: '#161B24',
  card2: '#1D2330',
  soft: '#1D2330',
  text: '#EEF1F6',
  textSecondary: '#C3C9D4',
  textTertiary: '#98A1B0',
  textQuaternary: '#646D7D',
  hairline: '#232A37',
  hairline2: '#232A37',
  border: '#3A4252',
  track: '#262D3A',
  accent: '#3F68FF',
  accentPressed: '#2F57EE',
  accentInk: '#8FA7FF',
  onAccent: '#FFFFFF',
  tonal: '#1B2650',
  tonalInk: '#B7C5FF',
  highlightSoft: '#131A31',
  accentSoft: '#2C3B78',
  inverse: '#131F57',
  inverseInk: '#FFFFFF',
  inverseAccent: '#9DB2FF',
  inverseMuted: '#AEB8DA',
  success: '#62D394',
  successSoft: '#10301F',
  warning: '#F1C46B',
  warningSoft: '#33270F',
  danger: '#FF948A',
  dangerStrong: '#FF948A',
  dangerSoft: '#3B1917',
  highlight: { yellow: '#544714', green: '#295233', blue: '#284A6C', pink: '#64374D' },
  highlightLine: { yellow: '#E2C04E', green: '#5FC77A', blue: '#6AB3EE', pink: '#EE86BE' },
  scrim: 'rgba(0,0,0,0.58)',
  onInverseSoft: 'rgba(255,255,255,0.12)',
  planned: '#3A4252',
  qrPaper: '#FFFFFF',
  qrInk: '#0E1116',
  knob: '#FFFFFF',
  shadow: {
    level1: '0px 1px 2px rgba(0,0,0,0.3), 0px 6px 16px -8px rgba(0,0,0,0.6)',
    level2: '0px 14px 32px -12px rgba(0,0,0,0.7)',
    level3: '0px -12px 40px -14px rgba(0,0,0,0.7), 0px 18px 40px -16px rgba(0,0,0,0.6)',
    segment: '0px 1px 3px rgba(0,0,0,0.5)',
    nav: '0px 12px 32px -12px rgba(0,0,0,0.8), 0px 0px 0px 1px rgba(255,255,255,0.06)',
    fab: '0px 10px 22px -8px rgba(63,104,255,0.6)',
    knob: '0px 2px 6px rgba(0,0,0,0.5)',
  },
};

export const palettes: Record<ColorScheme, Palette> = { light, dark };

/**
 * Cor por módulo: um matiz (oklch) usado só em ícones e blocos suaves. A IA usa o tonal cobalto.
 * Fundo L .95 · C .035 e ícone L .47 · C .13 no claro; fundo L .31 · C .05 e ícone L .85 · C .10 no escuro.
 */
export const moduleHue = {
  notes: 80,
  agenda: 25,
  reminders: 25,
  finance: 160,
  investments: 205,
  bible: 350,
  diet: 130,
  annotations: 305,
  shopping: 55,
  gallery: 240,
  neutral: 260,
} as const;
export type ModuleKey = keyof typeof moduleHue;

/** Matiz dos blocos de ícone de estado do sistema (sincronização): em dia (verde) e atenção (âmbar). */
export const statusHue = { ok: 150, attention: 45 } as const;

export const moduleTone = {
  light: { soft: { l: 0.95, c: 0.035 }, strong: { l: 0.47, c: 0.13 }, chart: { l: 0.62, c: 0.12 } },
  dark: { soft: { l: 0.31, c: 0.05 }, strong: { l: 0.85, c: 0.1 }, chart: { l: 0.72, c: 0.12 } },
} as const;

/** Grade de 4 px (0.5 = meio passo, só para respiros mínimos entre linhas de texto) */
export const space = { 0: 0, 0.5: 2, 1: 4, 1.5: 6, 2: 8, 2.5: 10, 3: 12, 3.5: 14, 4: 16, 4.5: 18, 5: 20, 6: 24, 7: 28, 8: 32, 10: 40, 12: 48 } as const;
export type SpaceKey = keyof typeof space;

/** check 7 · segmento 10 · bloco de ícone 13 · campo 16 · campo grande 18 · atalho 20 · cartão 24 · diálogo 26 · folha 28. */
export const radius = {
  checkbox: 7,
  segment: 10,
  iconSmall: 10,
  icon: 13,
  segmentTrack: 14,
  field: 16,
  fieldLarge: 18,
  tile: 20,
  card: 24,
  dialog: 26,
  sheet: 28,
  full: 999,
} as const;

export const fonts = {
  sans: {
    regular: 'Outfit_400Regular',
    medium: 'Outfit_500Medium',
    semibold: 'Outfit_600SemiBold',
    bold: 'Outfit_700Bold',
  },
  serif: { regular: 'Literata_400Regular', medium: 'Literata_500Medium', italic: 'Literata_400Regular_Italic' },
  mono: { regular: 'DMMono_400Regular' },
} as const;

export interface TypeStyle {
  fontSize: number;
  lineHeight: number;
  font: string;
  letterSpacing: number;
  textTransform?: 'uppercase';
}

/** Escala Cobalto: Outfit em tudo, tracking negativo nos tamanhos grandes; serifa só na leitura bíblica. */
export const typeScale = {
  /** marca na tela de entrar */
  wordmark: { fontSize: 40, lineHeight: 44, font: fonts.sans.bold, letterSpacing: -1.6 },
  /** marca na barra do topo */
  wordmarkSmall: { fontSize: 22, lineHeight: 28, font: fonts.sans.semibold, letterSpacing: -0.8 },
  /** dígito do código de verificação e do bloqueio */
  digit: { fontSize: 24, lineHeight: 30, font: fonts.sans.semibold, letterSpacing: 0 },
  /** número grande (saldo, patrimônio) */
  display: { fontSize: 44, lineHeight: 46, font: fonts.sans.bold, letterSpacing: -2 },
  /** número no topo das telas */
  big: { fontSize: 40, lineHeight: 44, font: fonts.sans.bold, letterSpacing: -1.6 },
  title: { fontSize: 32, lineHeight: 36, font: fonts.sans.semibold, letterSpacing: -1.2 },
  title2: { fontSize: 24, lineHeight: 30, font: fonts.sans.semibold, letterSpacing: -0.6 },
  /** título de seção */
  heading: { fontSize: 20, lineHeight: 26, font: fonts.sans.semibold, letterSpacing: -0.4 },
  emphasis: { fontSize: 16, lineHeight: 22, font: fonts.sans.semibold, letterSpacing: 0 },
  /** título de linha de lista */
  item: { fontSize: 15, lineHeight: 20, font: fonts.sans.medium, letterSpacing: 0 },
  body: { fontSize: 16, lineHeight: 24, font: fonts.sans.regular, letterSpacing: 0 },
  button: { fontSize: 16, lineHeight: 20, font: fonts.sans.semibold, letterSpacing: 0 },
  chip: { fontSize: 14, lineHeight: 18, font: fonts.sans.medium, letterSpacing: 0 },
  small: { fontSize: 14, lineHeight: 20, font: fonts.sans.regular, letterSpacing: 0 },
  /** metadados da linha de lista */
  caption: { fontSize: 13, lineHeight: 18, font: fonts.sans.regular, letterSpacing: 0 },
  /** texto acima do título (data de hoje) */
  eyebrow: { fontSize: 14, lineHeight: 20, font: fonts.sans.regular, letterSpacing: 0 },
  /** rótulo de grupo em caixa alta */
  label: { fontSize: 12, lineHeight: 16, font: fonts.sans.semibold, letterSpacing: 0.5, textTransform: 'uppercase' },
  micro: { fontSize: 12, lineHeight: 16, font: fonts.sans.regular, letterSpacing: 0 },
  tag: { fontSize: 12, lineHeight: 16, font: fonts.sans.semibold, letterSpacing: 0 },
  tab: { fontSize: 11, lineHeight: 14, font: fonts.sans.medium, letterSpacing: 0 },
  /** valor em linha de lista */
  amount: { fontSize: 15, lineHeight: 20, font: fonts.sans.semibold, letterSpacing: 0 },
  readingTitle: { fontSize: 24, lineHeight: 30, font: fonts.serif.medium, letterSpacing: 0 },
  scripture: { fontSize: 19, lineHeight: 32, font: fonts.serif.regular, letterSpacing: 0 },
  /** citação e leitura longa em notas */
  reading: { fontSize: 17, lineHeight: 28, font: fonts.sans.regular, letterSpacing: 0 },
  /** valor digitado em destaque (MoneyField: novo lançamento, confirmar, pagar) */
  amountField: { fontSize: 40, lineHeight: 46, font: fonts.sans.bold, letterSpacing: -1.6 },
  subtitle: { fontSize: 16, lineHeight: 22, font: fonts.sans.regular, letterSpacing: 0 },
  mono: { fontSize: 13, lineHeight: 18, font: fonts.mono.regular, letterSpacing: 0 },
} as const satisfies Record<string, TypeStyle>;
export type TypeVariant = keyof typeof typeScale;

/** Lucide, só contorno, traço 1,5: 20 nas ações, 16 em linhas, 19 dentro de blocos de 40, 17 nos de 32. */
export const icon = { size: 20, large: 24, tile: 24, block: 19, blockSmall: 17, small: 16, tiny: 13, strokeWidth: 1.5 } as const;

export const touch = { minTarget: 44, hitSlop: 6 } as const;

/** Margem de 20 px (24 no web); 24 px entre blocos. Web: coluna de 720 px, folhas de 560 px. */
export const layout = {
  gutter: 20,
  gutterWeb: 24,
  blockGap: 24,
  contentMaxWidth: 720,
  sheetMaxWidth: 560,
  /** Seletores em folhas: área rolável; flexShrink permite telas ainda menores. */
  pickerListMaxHeight: 360,
  /** Data/hora com ícone e ação de limpar: não comprimir o valor em pares estreitos. */
  calendarFieldMinWidth: 220,
  authMaxWidth: 420,
  /** respiro acima da marca na tela Entrar */
  authTop: 72,
  /** cabeçalho das etapas de acesso (marca + Sair) */
  headerHeight: 56,
  /** espaço que a barra de abas flutuante ocupa no rodapé (68 + 20 + folga) */
  tabBarSpace: 120,
  /** barra flutuante: distância das laterais e do rodapé */
  tabBarInset: 14,
  tabBarBottom: 20,
  /** largura máxima da frase de estado vazio */
  emptyTextMax: 280,
  /** coluna de botões do estado vazio e das telas de sistema (item não encontrado, abertura) */
  emptyActionsMax: 300,
  /** colunas da grade de capítulos da folha de livros da Bíblia */
  chapterGridColumns: 6,
  /** deslocamento das folhas no web largo (7% do topo) */
  sheetTopWeb: 56,
} as const;

/** Estados sem mudar cor: pressionado (sem movimento) e desabilitado. */
export const opacity = { hidden: 0, full: 1, pressed: 0.6, disabled: 0.5, fieldDisabled: 0.55, faint: 0.35, muted: 0.45 } as const;

/** Medidas fixas de componentes. */
export const size = {
  button: 52,
  buttonMedium: 44,
  buttonSmall: 36,
  iconButton: 42,
  iconButtonSmall: 36,
  field: 52,
  search: 48,
  chipHeight: 36,
  chipSmall: 32,
  linkChip: 26,
  tag: 24,
  tagLarge: 28,
  /** barra de abas flutuante */
  tabBar: 68,
  tabIndicatorWidth: 52,
  tabIndicatorHeight: 30,
  fab: 52,
  /** navegação no topo (web largo): marca, abas, busca e o + */
  topNav: 64,
  toast: 48,
  pill: 32,
  pillSmall: 26,
  navRow: 56,
  navRowTall: 60,
  listRowSmall: 48,
  editorBar: 56,
  formatBar: 48,
  swatch: 32,
  /** bolinha de cor do marca-texto na barra de seleção do leitor */
  colorDot: 30,
  /** traço do sublinhado no leitor */
  underline: 2,
  grabberWidth: 38,
  grabberHeight: 5,
  captureFieldMinHeight: 160,
  textAreaMinHeight: 96,
  qrCode: 128,
  qrBox: 152,
  spinner: 16,
  caretWidth: 1.5,
  caretHeight: 22,
  strike: 1.5,
  track: 8,
  trackThin: 4,
  trackThick: 10,
  /** bloco de ícone do módulo: 40 (lista), 32 (pequeno), 56 (destaque), 60 de altura no atalho */
  moduleIcon: 40,
  moduleIconSmall: 32,
  moduleIconLarge: 56,
  moduleIconChip: 22,
  tileHeight: 60,
  /** recuo da divisória quando a linha tem ícone */
  rowInsetIcon: 52,
  /** círculo de 34 px com o ícone da categoria (legado: blocos de 40 no Cobalto) */
  disc: 40,
  /** coluna da data (dia e mês) em Próximos */
  dateColumn: 30,
  /** rótulo do seletor de mês entre as setas */
  monthLabel: 96,
  /** o mesmo, enxuto (cabe ao lado do olhinho em 360 dp; mês longo vira reticências) */
  monthLabelCompact: 72,
  /** campo do valor em destaque (confirmar, pagar) */
  fieldLarge: 72,
  /** campo de orçamento editável na linha */
  budgetInputWidth: 116,
  budgetInputHeight: 36,
  /** menu flutuante de ações de uma linha */
  menuWidth: 232,
  menuItem: 48,
  /** marca do limite na barra do orçamento */
  limitTick: 12,
  /** rádio 22 com ponto de 10 */
  radio: 22,
  radioDot: 10,
  radioBorder: 1.5,
  /** check 24 (redondo nas tarefas, cantos de 7 nos itens de compras) */
  checkbox: 24,
  /** interruptor 50 × 30, bolinha de 26 a 2 px da borda */
  switchWidth: 50,
  switchHeight: 30,
  switchKnob: 26,
  /** indicador do segmentado (altura de cada opção) */
  segment: 34,
  segmentPill: 32,
  /** linha de ativo ou movimento de investimento (nome que quebra em duas linhas) */
  listRow: 64,
  /** dia na faixa de dias da agenda */
  dayWidth: 44,
  dayHeight: 64,
  dayDot: 4,
  /** célula do dia no calendário do mês (7 colunas cabem em 360 dp) */
  monthCell: 48,
  /** linha do agora na linha do tempo */
  nowLine: 2,
  nowDot: 10,
  timelineHour: 48,
  /** mascote: estados vazios, cabeçalho de Ajustes, bloco da IA */
  mascot: 72,
  mascotSmall: 30,
  mascotHeader: 36,
  /** anel de progresso */
  ring: 112,
  ringStroke: 10,
  ringSmall: 56,
  ringSmallStroke: 6,
  /** gráfico de evolução do valor do ativo */
  chart: 72,
  chartDot: 3.5,
  /** Gráficos de Finanças: faixa acima do gráfico (linha de referência ou etiqueta do toque) */
  chartTop: 36,
  /** altura das barras de Entradas e saídas, das barras da categoria e da miniatura */
  chartBars: 120,
  chartBarsCategory: 100,
  chartBarsMini: 56,
  /** área da linha (saldo, patrimônio) */
  chartLine: 80,
  chartLinePad: 8,
  /** largura das barras: Mês, 6 meses, 12 meses; da categoria (6 e 12 meses) */
  barWide: 16,
  bar: 12,
  barThin: 8,
  barCategory: 22,
  barCategoryThin: 14,
  barRadius: 5,
  barOutline: 1.5,
  /** mês sem dados: traço na base */
  barEmpty: 3,
  /** barra horizontal de "Para onde foi" */
  categoryBar: 8,
  /** marcador do ponto tocado na linha */
  scrubDot: 7,
  /** quadradinho da legenda (entradas, saídas, previsto) */
  legendSwatch: 10,
  /** coluna do percentual em "Para onde foi" */
  pctColumn: 38,
  /** traço e intervalo do trecho esperado da linha */
  dashOn: 2,
  dashOff: 4,
  /** listras do previsto (padrão 135°, 3 px cheio, 3 px vazio) */
  stripe: 3,
  /** ponto de não lido / sino */
  badge: 8,
  dot: 8,
} as const;

/** Campo com rótulo flutuante (52 px, cantos de 16). Foco: anel de 2 px cobalto + halo tonal de 6 px. */
export const field = {
  paddingX: 16,
  paddingTop: 20,
  paddingBottom: 6,
  labelTop: 16,
  labelLift: -9,
  labelScale: 0.8,
  ring: 2,
  halo: 6,
} as const;

/** Curvas do Cobalto (cubic-bezier). */
export const easing = {
  standard: [0.2, 0, 0, 1],
  enter: [0.05, 0.7, 0.1, 1],
  exit: [0.3, 0, 0.8, 0.15],
  spring: [0.34, 1.56, 0.64, 1],
  loop: [0.45, 0, 0.55, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

/** Durações (ms): "curto e gentil", 90 · 160 · 240 · 400 · 500. Saída ≈ 60% da entrada. */
export const motion = {
  /** toque: afunda em 90 ms */
  press: 90,
  /** volta do toque com mola */
  release: 380,
  tap: 160,
  standard: 240,
  emphasis: 400,
  /** cartão que vira tela */
  expand: 500,
  gentle: 300,
  /** troca de tema, cores */
  fade: 300,
  /** indicador do segmentado e da aba */
  indicator: 340,
  /** folha: sobe em 400 e desce em 240 */
  sheetIn: 400,
  sheetOut: 240,
  /** empurrar tela */
  push: 420,
  /** aviso sobe com mola */
  toastIn: 480,
  /** barras e anéis crescem */
  grow: 800,
  /** listas: +70 ms por item, no máximo 6 */
  stagger: 70,
  staggerMax: 6,
  /** pontos de não lido somem em cascata (+50 ms cada) */
  dotStagger: 50,
  /** a borda de trás do indicador da aba parte depois da da frente */
  tabLineDelay: 50,
  enterOffset: 18,
  collapseDelay: 650,
  toast: 2600,
  /** toast com ação ("Desfazer") fica mais tempo */
  toastLong: 4000,
  spin: 800,
  /** reduzir movimento: tudo vira esmaecer de 160 ms */
  reduced: 160,
  /** a entrada da etapa seguinte começa depois da saída */
  stepDelay: 90,
  /** senha errada: um tremor só */
  shake: 320,
  /** etiqueta do toque nos gráficos some depois de soltar */
  scrubHide: 2500,
  /** mascote: pisca a cada 4 s, flutua em 1,4 s */
  blink: 4000,
  float: 1400,
} as const;

/** Deslocamentos (px) do tremor do campo de senha errada: 0 → −6 → 5 → −3 → 0. */
export const shakeSteps = [-6, 5, -3, 0] as const;

/**
 * Molas (Reanimated withSpring com duração): a curva de mola do Cobalto ultrapassa de leve o destino.
 * tap — volta do toque, check, chip · standard — indicadores, entradas de lista ·
 * emphasis — folha, cartão que vira tela, pop · gentle — recolher, reordenar.
 */
export const spring = {
  tap: { duration: 380, dampingRatio: 0.72 },
  standard: { duration: 340, dampingRatio: 0.9 },
  emphasis: { duration: 400, dampingRatio: 0.82 },
  gentle: { duration: 300, dampingRatio: 0.95 },
} as const;

export const pressScale = { rest: 1, pressed: 0.96, pressedSmall: 0.96, pop: 0.92 } as const;

export const hairlineWidth = 1;

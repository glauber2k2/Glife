// Peças visuais das telas de Finanças (protótipo "Glife Finanças"): seletor de mês, disco de ícone, linhas de
// valor, barra do orçamento, rádio, campo de dinheiro e campo de data.
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Repeat, type LucideIcon } from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, { FadeIn, Keyframe, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import {
  Button,
  DateInput,
  Icon,
  IconButton,
  Input,
  ModuleIcon,
  Radio,
  SurfaceProvider,
  Text,
  makeStyles,
  resolveSpring,
  useInListGroup,
  usePress,
  useReduceMotion,
  useSurface,
  useTheme,
  type TextTone,
} from '@/shared/ui';

import { useMoneyVisibility } from '@/shared/lib/MoneyVisibility';
import { digitsToCents, money } from './format';
import { formatDateInput, parseDateInput } from '@/shared/lib/calendarInput';

// ---------- Seletor de mês / fatura ----------

/** Seletor de mês em pílula branca: setas e o mês no meio (Cobalto). */
export function MonthStepper(p: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  canPrev?: boolean;
  canNext?: boolean;
  prevLabel?: string;
  nextLabel?: string;
  /** rótulo estreito, para dividir a barra com outro botão */
  compact?: boolean;
}) {
  const s = useStyles();
  const t = useTheme();
  const surface = useSurface();
  return (
    <View style={[s.stepper, surface === 'card' && s.stepperOnCard]}>
      <View style={[!p.canPrev && p.canPrev !== undefined && s.dim]}>
        <IconButton
          icon={ChevronLeft}
          label={p.prevLabel ?? 'Mês anterior'}
          variant="ghost"
          size={t.size.iconButtonSmall}
          color="textSecondary"
          disabled={p.canPrev === false}
          onPress={p.onPrev}
        />
      </View>
      <Text variant="chip" align="center" numberOfLines={1} style={[s.stepperLabel, p.compact && s.stepperLabelCompact]}>
        {p.label}
      </Text>
      <View style={[!p.canNext && p.canNext !== undefined && s.dim]}>
        <IconButton
          icon={ChevronRight}
          label={p.nextLabel ?? 'Próximo mês'}
          variant="ghost"
          size={t.size.iconButtonSmall}
          color="textSecondary"
          disabled={p.canNext === false}
          onPress={p.onNext}
        />
      </View>
    </View>
  );
}

/** Conteúdo do mês: ao trocar, entra deslizando 32 px do lado da seta (no web só esmaece). */
export function MonthSlide({ id, direction, children }: { id: string; direction: number; children: ReactNode }) {
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  // O primeiro mês não desliza (a tela já entra em cascata); só as trocas.
  const [firstId] = useState(id);
  const entering =
    reduceMotion || id === firstId
      ? undefined
      : Platform.OS === 'web'
        ? FadeIn.duration(t.motion.standard)
        : new Keyframe({
            0: {
              opacity: 0,
              transform: [{ translateX: direction * t.space[8] }],
            },
            100: { opacity: 1, transform: [{ translateX: 0 }] },
          }).duration(t.motion.standard);
  return (
    <Animated.View key={id} entering={entering} style={{ gap: t.layout.blockGap }}>
      {children}
    </Animated.View>
  );
}

// ---------- Linhas ----------

/** Bloco de 40 px com o ícone da categoria no matiz dela (Finanças por padrão); `muted` fica neutro. */
export function Disc({ icon, muted, hue }: { icon: LucideIcon; muted?: boolean; hue?: number }) {
  return <ModuleIcon icon={icon} module="finance" hue={hue} tone={muted ? 'neutral' : 'module'} />;
}

/** Título do bloco (16/600, dentro do cartão) com algo à direita. */
export function BlockHeader({ title, right }: { title: string; right?: ReactNode }) {
  const s = useStyles();
  return (
    <View style={s.blockHeader}>
      <Text variant="emphasis" accessibilityRole="header" style={s.blockTitle}>
        {title}
      </Text>
      {typeof right === 'string' ? (
        <Text variant="caption" tone="tertiary" numeric>
          {right}
        </Text>
      ) : (
        right
      )}
    </View>
  );
}

/** Bloco do Cobalto: cartão branco r24 com título e conteúdo. `divider={false}` deixa o bloco sem cartão. */
export function Block({ children, divider = true, gap }: { children: ReactNode; divider?: boolean; gap?: number }) {
  const s = useStyles();
  if (!divider) return <View style={[s.bare, gap !== undefined && { gap }]}>{children}</View>;
  return (
    <SurfaceProvider value="card">
      <View style={[s.block, gap !== undefined && { gap }]}>{children}</View>
    </SurfaceProvider>
  );
}

export interface MoneyRowProps {
  leading?: ReactNode;
  title: string;
  /** previsto/atrasado em tom mais claro */
  dim?: boolean;
  recurring?: boolean;
  badge?: string;
  meta?: ReactNode;
  amount: string;
  amountTone?: TextTone;
  /** segunda linha sob o valor (ex.: "próx. 15/12") */
  amountSub?: { text: string; tone?: TextTone };
  /** linha de 1 px no topo */
  divider?: boolean;
  onPress?: () => void;
  trailing?: ReactNode;
  accessibilityLabel?: string;
}

/** Linha de lista com valor à direita (algarismos tabulares). */
export function MoneyRow(p: MoneyRowProps) {
  const s = useStyles();
  const t = useTheme();
  const inGroup = useInListGroup();
  const press = usePress(!p.onPress);
  const body = (
    <Animated.View style={[s.row, p.divider && !inGroup && s.rowDivider, press.style]}>
      {p.leading}
      <View style={s.rowText}>
        <View style={s.titleLine}>
          <Text variant="item" tone={p.dim ? 'secondary' : 'primary'} numberOfLines={1} style={s.shrink}>
            {p.title}
          </Text>
          {p.recurring && <Icon icon={Repeat} size={t.icon.tiny} color="textTertiary" />}
          {p.badge && (
            <View style={s.badge}>
              <Text variant="caption" tone="secondary" numeric style={s.badgeText}>
                {p.badge}
              </Text>
            </View>
          )}
        </View>
        {typeof p.meta === 'string' ? (
          <Text variant="caption" tone="tertiary" numberOfLines={1}>
            {p.meta}
          </Text>
        ) : (
          p.meta
        )}
      </View>
      <View style={s.amountCol}>
        <Text variant="amount" tone={p.amountTone ?? (p.dim ? 'tertiary' : 'primary')} numeric style={p.dim && s.amountDim}>
          {p.amount}
        </Text>
        {p.amountSub && (
          <Text variant="caption" tone={p.amountSub.tone ?? 'tertiary'} numeric>
            {p.amountSub.text}
          </Text>
        )}
      </View>
      {p.trailing}
    </Animated.View>
  );
  if (!p.onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={p.accessibilityLabel}
      onPress={p.onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      {body}
    </Pressable>
  );
}

// ---------- Orçamento ----------

/**
 * Barra de 3 px: gasto em cinza médio, previsto colado em cinza claro; estourou → destaque e um traço onde estava o
 * limite. Cresce da esquerda na mola de ênfase, 40 ms depois da linha anterior.
 */
export function BudgetBar({
  spent,
  planned,
  budget,
  index = 0,
}: {
  spent: number;
  planned: number;
  budget: number | null;
  index?: number;
}) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const spring = resolveSpring('emphasis', reduceMotion);
  const max = Math.max(budget ?? 0, spent + planned) || 1;
  const over = budget !== null && spent > budget;
  const [width, setWidth] = useState(0);
  const a = useSharedValue(0);
  const b = useSharedValue(0);
  const delay = index * t.motion.stagger;
  useEffect(() => {
    const ws = (spent / max) * width;
    const wp = (planned / max) * width;
    a.set(spring ? withDelay(delay, withSpring(ws, spring)) : ws);
    b.set(spring ? withDelay(delay, withSpring(wp, spring)) : wp);
  }, [spent, planned, max, width, spring, delay, a, b]);
  const spentStyle = useAnimatedStyle(() => ({ width: Math.max(0, a.get()) }));
  const plannedStyle = useAnimatedStyle(() => ({
    width: Math.max(0, b.get()),
  }));
  return (
    <View style={s.barWrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={s.barTrack}>
        <Animated.View style={[s.barSpent, over && s.barOver, spentStyle]} />
        <Animated.View style={[s.barPlanned, plannedStyle]} />
      </View>
      {over && budget !== null && <View style={[s.tick, { left: (budget / max) * width }]} />}
    </View>
  );
}

/** Trilho de pago ÷ total da fatura. */
export function ProgressTrack({ ratio }: { ratio: number }) {
  const s = useStyles();
  const reduceMotion = useReduceMotion();
  const spring = resolveSpring('emphasis', reduceMotion);
  const [width, setWidth] = useState(0);
  const w = useSharedValue(0);
  useEffect(() => {
    const target = Math.min(1, Math.max(0, ratio)) * width;
    w.set(spring ? withSpring(target, spring) : target);
  }, [ratio, width, spring, w]);
  const style = useAnimatedStyle(() => ({ width: w.get() }));
  return (
    <View style={s.barTrack} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Animated.View style={[s.trackFill, style]} />
    </View>
  );
}

// ---------- Número que conta ----------

/** Conta do valor anterior até o novo em 350 ms (com "reduzir movimento", troca direto). */
export function useCountUp(value: number): number {
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const { hidden } = useMoneyVisibility();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduceMotion || hidden) {
      from.current = value;
      return;
    }
    const start = from.current;
    const t0 = Date.now();
    let raf = 0;
    const step = () => {
      const k = Math.min(1, (Date.now() - t0) / t.motion.emphasis);
      const e = 1 - (1 - k) ** 3;
      const v = Math.round(start + (value - start) * e);
      from.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, reduceMotion, hidden, t.motion.emphasis]);
  return reduceMotion || hidden ? value : shown;
}

// ---------- Teclado e campos ----------

/** Campo de dinheiro: digita só números, mostra "R$ 1.234,56". */
export function MoneyField({
  label,
  cents,
  onChange,
  large,
  hint,
  allowNegative,
  negative,
  onNegativeChange,
  placeholder,
  autoFocus,
}: {
  label: string;
  cents: number | null;
  onChange: (cents: number | null) => void;
  large?: boolean;
  hint?: string;
  allowNegative?: boolean;
  negative?: boolean;
  onNegativeChange?: (negative: boolean) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const s = useStyles();
  // Campo de digitação: nunca mascarado.
  const text = cents === null ? '' : `${negative ? '− ' : ''}${money(cents)}`;
  return (
    <Input
      label={label}
      hint={hint}
      value={text}
      placeholder={placeholder ?? 'R$ 0,00'}
      autoFocus={autoFocus}
      keyboardType="number-pad"
      inputMode="numeric"
      style={large ? s.largeField : s.numericField}
      onChangeText={(v) => {
        if (allowNegative) onNegativeChange?.(/^\s*[-−]/.test(v));
        const c = digitsToCents(v);
        onChange(v.replace(/\D/g, '') === '' ? null : c);
      }}
    />
  );
}

/** Campo de dia do mês (1 a 31). */
export function DayField({
  label,
  value,
  onChange,
  max = 31,
  hint,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  max?: number;
  hint?: string;
}) {
  const s = useStyles();
  return (
    <Input
      label={label}
      hint={hint}
      value={value === null ? '' : String(value)}
      keyboardType="number-pad"
      inputMode="numeric"
      maxLength={String(max).length}
      style={s.numericField}
      onChangeText={(v) => {
        const n = Number(v.replace(/\D/g, ''));
        onChange(v.replace(/\D/g, '') === '' ? null : Math.min(max, Math.max(1, n)));
      }}
    />
  );
}

/** Finanças falam em data ISO; o campo compartilhado abre o seletor da plataforma. `hint`: "Hoje", "Ontem"… */
export function DateRow({ label = 'Data', date, hint, onChange }: {
  label?: string;
  date: string;
  hint?: string;
  onChange: (d: string) => void;
}) {
  return <DateInput label={label} hint={hint} value={formatDateInput(date)} onChange={(value) => {
    const iso = parseDateInput(value);
    if (iso) onChange(iso);
  }} />;
}

/** Seletor de categoria sem nenhuma ativa daquele tipo: avisa e leva a criar uma. */
export function NoCategoriesNote({ kind, onCreate }: { kind: 'expense' | 'income'; onCreate: () => void }) {
  const s = useStyles();
  return (
    <View style={s.noCats}>
      <Text variant="small" tone="tertiary" style={s.rowText}>
        {kind === 'income' ? 'Nenhuma categoria de receita ativa.' : 'Nenhuma categoria de gasto ativa.'}
      </Text>
      <Button selfAlign="center" label="Criar categoria" variant="secondary" size="sm" onPress={onCreate} />
    </View>
  );
}

/** Modo "Ordenar": subir e descer a linha (no lugar de arrastar). As pontas ficam apagadas, sem mudar a largura. */
export function OrderArrows({ name, first, last, onMove }: { name: string; first: boolean; last: boolean; onMove: (delta: -1 | 1) => void }) {
  const s = useStyles();
  const t = useTheme();
  return (
    <View style={s.arrows}>
      <IconButton
        icon={ChevronUp}
        label={`Subir ${name}`}
        variant="soft"
        size={t.size.iconButtonSmall}
        color="textSecondary"
        disabled={first}
        onPress={() => onMove(-1)}
      />
      <IconButton
        icon={ChevronDown}
        label={`Descer ${name}`}
        variant="soft"
        size={t.size.iconButtonSmall}
        color="textSecondary"
        disabled={last}
        onPress={() => onMove(1)}
      />
    </View>
  );
}

/** Linha que pisca de leve no tom de sucesso quando `flash` muda (ex.: saldo ajustado). */
export function FlashRow({ flash, children }: { flash: number; children: ReactNode }) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const k = useSharedValue(0);
  useEffect(() => {
    if (!flash) return;
    const half = reduceMotion ? t.motion.reduced : t.motion.emphasis;
    k.set(withSequence(withTiming(t.opacity.full, { duration: half }), withTiming(t.opacity.hidden, { duration: half })));
  }, [flash, reduceMotion, k, t.motion.reduced, t.motion.emphasis, t.opacity.full, t.opacity.hidden]);
  const style = useAnimatedStyle(() => ({ opacity: k.get() }));
  return (
    <View>
      <Animated.View pointerEvents="none" style={[s.flash, style]} />
      {children}
    </View>
  );
}

/** Opção de rádio em linha (folhas de escolha e "Este cartão já está em uso?"). */
export function RadioRow({ title, sub, selected, onPress }: { title: string; sub?: string; selected: boolean; onPress: () => void }) {
  const s = useStyles();
  const inGroup = useInListGroup();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [s.radioRow, !inGroup && s.rowDivider, pressed && s.pressed]}
    >
      <View style={s.rowText}>
        <Text variant="item">{title}</Text>
        {sub ? (
          <Text variant="small" tone="tertiary" numeric>
            {sub}
          </Text>
        ) : null}
      </View>
      <Radio selected={selected} />
    </Pressable>
  );
}

/** Linha com texto e interruptor (É previsto · Repetir). */
export function SwitchRow({ title, sub, control }: { title: string; sub: string; control: ReactNode }) {
  const s = useStyles();
  const inGroup = useInListGroup();
  return (
    <View style={[s.switchRow, !inGroup && s.rowDivider]}>
      <View style={s.rowText}>
        <Text variant="item">{title}</Text>
        <Text variant="caption" tone="tertiary">
          {sub}
        </Text>
      </View>
      {control}
    </View>
  );
}

/** Linha de contagem "− 1 +" (A cada N). */
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  const s = useStyles();
  const t = useTheme();
  return (
    <View style={s.counter} accessibilityLabel={label}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Menos"
        onPress={() => onChange(Math.max(min, value - 1))}
        style={s.counterBtn}
      >
        <Text tone="secondary" style={s.counterSign}>
          −
        </Text>
      </Pressable>
      <Text numeric style={[s.medium, s.counterValue, { minWidth: t.space[6] }]} align="center">
        {value}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mais"
        onPress={() => onChange(Math.min(max, value + 1))}
        style={s.counterBtn}
      >
        <Text tone="secondary" style={s.counterSign}>
          +
        </Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: t.size.buttonSmall + t.space[1],
    backgroundColor: t.colors.card,
    borderRadius: t.radius.full,
    paddingHorizontal: t.space[0.5],
    alignSelf: 'flex-start',
  },
  stepperOnCard: { backgroundColor: t.colors.bg },
  stepperLabel: { minWidth: t.size.monthLabel, paddingHorizontal: t.space[1] },
  stepperLabelCompact: { minWidth: t.size.monthLabelCompact, flexShrink: 1 },
  dim: { opacity: t.opacity.faint },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: t.space[3],
    paddingBottom: t.space[1],
  },
  blockTitle: { flexShrink: 1 },
  block: {
    backgroundColor: t.colors.card,
    borderRadius: t.radius.card,
    paddingHorizontal: t.space[4],
    paddingTop: t.space[4],
    paddingBottom: t.space[2],
    gap: t.space[1],
  },
  bare: { gap: t.space[1] },
  shrink: { flexShrink: 1 },
  amountDim: { fontFamily: t.type.chip.font },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3],
    minHeight: t.size.navRow,
    paddingVertical: t.space[3],
  },
  rowDivider: { borderTopWidth: t.hairline, borderTopColor: t.colors.hairline },
  rowText: { flex: 1, minWidth: 0, gap: t.space[0.5] },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[1.5],
    flexShrink: 1,
  },
  medium: { fontFamily: t.type.chip.font },
  amountCol: { alignItems: 'flex-end' },
  badge: {
    height: t.size.tag - t.space[1],
    paddingHorizontal: t.space[2],
    borderRadius: t.radius.full,
    backgroundColor: t.colors.bg,
    justifyContent: 'center',
  },
  badgeText: { fontFamily: t.type.tag.font },
  pressed: { opacity: t.opacity.pressed },
  barWrap: { height: t.size.track, justifyContent: 'center' },
  barTrack: {
    flexDirection: 'row',
    height: t.size.track,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.track,
    overflow: 'hidden',
  },
  barSpent: { height: '100%', backgroundColor: t.colors.textSecondary, borderRadius: t.radius.full },
  barOver: { backgroundColor: t.colors.dangerStrong },
  barPlanned: { height: '100%', backgroundColor: t.colors.planned },
  trackFill: {
    height: '100%',
    backgroundColor: t.colors.textSecondary,
    borderRadius: t.radius.full,
  },
  tick: {
    position: 'absolute',
    top: -t.size.track,
    width: t.size.strike,
    height: t.size.limitTick,
    borderRadius: t.hairline,
    backgroundColor: t.colors.text,
  },
  numericField: { fontVariant: ['tabular-nums'] },
  largeField: {
    fontVariant: ['tabular-nums'],
    fontFamily: t.type.amountField.font,
    fontSize: t.type.amountField.fontSize,
    letterSpacing: t.type.amountField.letterSpacing,
    lineHeight: t.type.amountField.lineHeight,
    minHeight: t.size.fieldLarge,
    paddingTop: t.space[6],
  },
  dateRow: { gap: t.space[2] },
  dateLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: t.size.navRow,
  },
  datePill: {
    height: t.size.buttonSmall,
    paddingHorizontal: t.space[3.5],
    borderRadius: t.radius.full,
    backgroundColor: t.colors.tonal,
    justifyContent: 'center',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3] + t.space[0.5],
    minHeight: t.size.navRow,
    paddingVertical: t.space[3],
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3],
    minHeight: t.size.navRow,
    paddingVertical: t.space[2],
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    height: t.size.buttonSmall + t.space[1],
    backgroundColor: t.colors.bg,
    borderRadius: t.radius.full,
    paddingHorizontal: t.space[1],
  },
  counterBtn: {
    width: t.size.pill,
    height: t.size.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radius.full,
  },
  counterSign: { fontSize: t.type.heading.fontSize },
  arrows: { flexDirection: 'row', alignItems: 'center', gap: t.space[1] },
  noCats: { flexDirection: 'row', alignItems: 'center', gap: t.space[3], minHeight: t.size.buttonSmall },
  flash: {
    position: 'absolute',
    top: t.space[0],
    bottom: t.space[0],
    left: -t.space[2],
    right: -t.space[2],
    borderRadius: t.radius.field,
    backgroundColor: t.colors.successSoft,
  },
  counterValue: {},
}));

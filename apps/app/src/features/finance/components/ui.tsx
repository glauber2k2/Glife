// Peças visuais das telas de Finanças (protótipo "Glife Finanças"): seletor de mês, disco de ícone, linhas de
// valor, barra do orçamento, rádio, campo de dinheiro e campo de data.
import { ChevronLeft, ChevronRight, Repeat, type LucideIcon } from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, { FadeIn, Keyframe, useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { Icon, IconButton, Input, Text, makeStyles, resolveSpring, useReduceMotion, useTheme, type TextTone } from '@/shared/ui';

import { digitsToCents, money, parseDmy, dmy } from './format';

// ---------- Seletor de mês / fatura ----------

export function MonthStepper(p: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  canPrev?: boolean;
  canNext?: boolean;
  prevLabel?: string;
  nextLabel?: string;
}) {
  const s = useStyles();
  const t = useTheme();
  return (
    <View style={s.stepper}>
      <View style={[!p.canPrev && p.canPrev !== undefined && s.dim]}>
        <IconButton
          icon={ChevronLeft}
          label={p.prevLabel ?? 'Mês anterior'}
          variant="ghost"
          size={t.size.pillSmall + t.space[0.5]}
          color="textSecondary"
          disabled={p.canPrev === false}
          onPress={p.onPrev}
        />
      </View>
      <Text variant="chip" align="center" style={s.stepperLabel}>
        {p.label}
      </Text>
      <View style={[!p.canNext && p.canNext !== undefined && s.dim]}>
        <IconButton
          icon={ChevronRight}
          label={p.nextLabel ?? 'Próximo mês'}
          variant="ghost"
          size={t.size.pillSmall + t.space[0.5]}
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

/** Círculo de 34 px contornado com o ícone da categoria. */
export function Disc({ icon, muted }: { icon: LucideIcon; muted?: boolean }) {
  const s = useStyles();
  const t = useTheme();
  return (
    <View style={s.disc}>
      <Icon icon={icon} size={t.icon.small} color={muted ? 'textTertiary' : 'textSecondary'} />
    </View>
  );
}

/** Rótulo de bloco (11 px, caixa alta) com algo à direita. */
export function BlockHeader({ title, right }: { title: string; right?: ReactNode }) {
  const s = useStyles();
  return (
    <View style={s.blockHeader}>
      <Text variant="label" tone="tertiary" accessibilityRole="header">
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

/** Bloco separado por 18 px e uma linha de 1 px (nunca uma caixa). */
export function Block({ children, divider = true, gap }: { children: ReactNode; divider?: boolean; gap?: number }) {
  const s = useStyles();
  return <View style={[s.block, divider && s.blockDivider, gap !== undefined && { gap }]}>{children}</View>;
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
  const body = (
    <View style={[s.row, p.divider && s.rowDivider]}>
      {p.leading}
      <View style={s.rowText}>
        <View style={s.titleLine}>
          <Text tone={p.dim ? 'secondary' : 'primary'} style={s.medium} numberOfLines={1}>
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
        <Text tone={p.amountTone ?? (p.dim ? 'tertiary' : 'primary')} numeric style={s.medium}>
          {p.amount}
        </Text>
        {p.amountSub && (
          <Text variant="caption" tone={p.amountSub.tone ?? 'tertiary'} numeric>
            {p.amountSub.text}
          </Text>
        )}
      </View>
      {p.trailing}
    </View>
  );
  if (!p.onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={p.accessibilityLabel}
      onPress={p.onPress}
      style={({ pressed }) => pressed && s.pressed}
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
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduceMotion) {
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
  }, [value, reduceMotion, t.motion.emphasis]);
  return reduceMotion ? value : shown;
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
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  max?: number;
}) {
  const s = useStyles();
  return (
    <Input
      label={label}
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

/** Data em pílula ("Hoje, 10/12"); tocar abre o campo para digitar dd/mm/aaaa. */
export function DateRow({
  label = 'Data',
  date,
  display,
  onChange,
}: {
  label?: string;
  date: string;
  display: string;
  onChange: (d: string) => void;
}) {
  const s = useStyles();
  const t = useTheme();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(dmy(date));
  const valid = parseDmy(text);
  return (
    <View style={s.dateRow}>
      <View style={s.dateLine}>
        <Text style={s.medium}>{label}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${display}. Alterar`}
          onPress={() => {
            setText(dmy(date));
            setEditing((e) => !e);
          }}
          style={({ pressed }) => [s.datePill, pressed && s.pressed]}
        >
          <Text variant="chip" numeric>
            {display}
          </Text>
        </Pressable>
      </View>
      {editing && (
        <View style={{ gap: t.space[2] }}>
          <Input
            label="dd/mm/aaaa"
            value={text}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            error={text.length >= 8 && !valid ? 'Data inválida' : undefined}
            onChangeText={(v) => {
              setText(v);
              const d = parseDmy(v);
              if (d) onChange(d);
            }}
            onSubmitEditing={() => setEditing(false)}
          />
        </View>
      )}
    </View>
  );
}

/** Opção de rádio em linha (folhas de escolha e "Este cartão já está em uso?"). */
export function RadioRow({ title, sub, selected, onPress }: { title: string; sub?: string; selected: boolean; onPress: () => void }) {
  const s = useStyles();
  const reduceMotion = useReduceMotion();
  const spring = resolveSpring('tap', reduceMotion);
  const dot = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    dot.set(spring ? withSpring(selected ? 1 : 0, spring) : selected ? 1 : 0);
  }, [selected, spring, dot]);
  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dot.get() }],
  }));
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [s.radioRow, pressed && s.pressed]}
    >
      <View style={[s.radio, selected && s.radioOn]}>
        <Animated.View style={[s.radioDot, dotStyle]} />
      </View>
      <View style={s.rowText}>
        <Text style={s.medium}>{title}</Text>
        {sub ? (
          <Text variant="small" tone="tertiary" numeric>
            {sub}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Linha com texto e interruptor (É previsto · Repetir). */
export function SwitchRow({ title, sub, control }: { title: string; sub: string; control: ReactNode }) {
  const s = useStyles();
  return (
    <View style={s.switchRow}>
      <View style={s.rowText}>
        <Text style={s.medium}>{title}</Text>
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
    height: t.size.pill,
    borderWidth: t.hairline,
    borderColor: t.colors.hairline,
    borderRadius: t.radius.full,
    paddingHorizontal: t.space[0.5],
    alignSelf: 'flex-start',
  },
  stepperLabel: { minWidth: t.size.monthLabel, paddingHorizontal: t.space[1] },
  dim: { opacity: t.opacity.faint },
  disc: {
    width: t.size.disc,
    height: t.size.disc,
    borderRadius: t.radius.full,
    borderWidth: t.hairline,
    borderColor: t.colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: t.space[3],
    paddingBottom: t.space[1.5],
  },
  block: { paddingTop: t.layout.blockGap, gap: t.space[1] },
  blockDivider: {
    borderTopWidth: t.hairline,
    borderTopColor: t.colors.hairline,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3],
    minHeight: t.size.navRowTall,
    paddingVertical: t.space[1],
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
    height: t.size.linkChip - t.space[1],
    paddingHorizontal: t.space[2],
    borderRadius: t.radius.full,
    borderWidth: t.hairline,
    borderColor: t.colors.hairline,
    justifyContent: 'center',
  },
  badgeText: { fontFamily: t.type.label.font },
  pressed: { backgroundColor: t.colors.soft },
  barWrap: { height: t.size.track, justifyContent: 'center' },
  barTrack: {
    flexDirection: 'row',
    height: t.size.track,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.hairline,
    overflow: 'hidden',
  },
  barSpent: { height: '100%', backgroundColor: t.colors.textTertiary },
  barOver: { backgroundColor: t.colors.accent },
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
    minHeight: t.size.fieldLarge,
    paddingTop: t.space[6] + t.space[0.5],
  },
  dateRow: {
    gap: t.space[2],
    borderTopWidth: t.hairline,
    borderTopColor: t.colors.hairline,
    paddingTop: t.space[1.5],
  },
  dateLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: t.size.button,
  },
  datePill: {
    height: t.size.pill,
    paddingHorizontal: t.space[3],
    borderRadius: t.radius.full,
    borderWidth: t.hairline,
    borderColor: t.colors.hairline,
    justifyContent: 'center',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3] + t.space[0.5],
    minHeight: t.size.button + t.space[3],
    paddingVertical: t.space[2],
    borderTopWidth: t.hairline,
    borderTopColor: t.colors.hairline,
  },
  radio: {
    width: t.size.radio,
    height: t.size.radio,
    borderRadius: t.radius.full,
    borderWidth: t.size.radioBorder,
    borderColor: t.colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: t.colors.accent },
  radioDot: {
    width: t.size.radioDot,
    height: t.size.radioDot,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.accent,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3],
    minHeight: t.size.button,
    borderTopWidth: t.hairline,
    borderTopColor: t.colors.hairline,
    paddingTop: t.space[2],
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    height: t.size.buttonSmall,
    borderWidth: t.hairline,
    borderColor: t.colors.hairline,
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
  counterValue: {},
}));

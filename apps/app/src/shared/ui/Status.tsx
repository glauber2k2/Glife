import { AlertTriangle, Check, Info, type LucideIcon } from 'lucide-react-native';
import { useEffect, type ReactNode } from 'react';
import { Pressable, View, type DimensionValue } from 'react-native';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, Pattern, Rect } from 'react-native-svg';

import { Icon, type IconColor } from './Icon';
import { Mascot } from './Mascot';
import { Text, type TextTone } from './Text';
import { makeStyles, useTheme } from './theme';
import { useReduceMotion } from './theme/ThemeProvider';

/* ---------------- Tag / StatusBadge ---------------- */

export type TagTone = 'neutral' | 'success' | 'warning' | 'danger' | 'tonal' | 'outline' | 'inverse';

export interface TagProps {
  label: string;
  tone?: TagTone;
  icon?: LucideIcon;
  large?: boolean;
}

const tagFg: Record<TagTone, { text: TextTone; icon: IconColor }> = {
  neutral: { text: 'secondary', icon: 'textSecondary' },
  success: { text: 'success', icon: 'success' },
  warning: { text: 'warning', icon: 'warning' },
  danger: { text: 'danger', icon: 'danger' },
  tonal: { text: 'tonal', icon: 'tonalInk' },
  outline: { text: 'tertiary', icon: 'textTertiary' },
  inverse: { text: 'inverse', icon: 'inverseInk' },
};

/** Etiqueta de estado (24 px, pílula): "Paga", "Atrasado", "Ativo". */
export function Tag({ label, tone = 'neutral', icon, large }: TagProps) {
  const s = useStyles();
  const t = useTheme();
  return (
    <View style={[s.tag, large && s.tagLarge, s[`tag_${tone}`]]}>
      {icon && <Icon icon={icon} size={t.icon.tiny - t.hairline} color={tagFg[tone].icon} />}
      <Text variant="tag" tone={tagFg[tone].text} numberOfLines={1} style={large && s.tagLargeText}>
        {label}
      </Text>
    </View>
  );
}

/* ---------------- Alert ---------------- */

export interface AlertProps {
  tone?: 'warning' | 'danger' | 'success' | 'info' | 'neutral';
  title?: string;
  children?: ReactNode;
  icon?: LucideIcon;
  /** ação em link no fim */
  actionLabel?: string;
  onAction?: () => void;
}

/** Aviso em bloco r18 com a cor do estado (suave): só quando carrega significado. */
export function Alert({ tone = 'info', title, children, icon, actionLabel, onAction }: AlertProps) {
  const s = useStyles();
  const t = useTheme();
  const fg: TextTone = tone === 'info' ? 'tonal' : tone === 'neutral' ? 'secondary' : tone;
  const ic: IconColor = tone === 'info' ? 'tonalInk' : tone === 'neutral' ? 'textSecondary' : tone;
  const glyph = icon ?? (tone === 'success' ? Check : tone === 'info' || tone === 'neutral' ? Info : AlertTriangle);
  return (
    <View style={[s.alert, s[`alert_${tone}`]]} accessibilityRole="alert">
      <View style={s.alertIcon}>
        <Icon icon={glyph} size={t.icon.small + t.space[0.5]} color={ic} />
      </View>
      <View style={s.alertTexts}>
        {title && (
          <Text variant="small" tone={fg} style={s.bold}>
            {title}
          </Text>
        )}
        {typeof children === 'string' ? (
          <Text variant="small" tone={fg}>
            {children}
          </Text>
        ) : (
          children
        )}
        {actionLabel && onAction && (
          <Pressable accessibilityRole="button" onPress={onAction} hitSlop={t.touch.hitSlop}>
            <Text variant="small" tone={fg} style={s.bold}>
              {actionLabel}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/* ---------------- ProgressBar ---------------- */

export interface ProgressBarProps {
  /** 0 a 1 do realizado */
  value: number;
  /** 0 a 1 do previsto, listrado depois do realizado */
  planned?: number;
  tone?: 'neutral' | 'accent' | 'danger' | 'success';
  /** thin 4 · md 8 · thick 10 */
  thickness?: 'thin' | 'md' | 'thick';
  label?: string;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Barra com trilho; cresce da esquerda em 800 ms. O previsto aparece listrado logo depois do realizado. */
export function ProgressBar({ value, planned = 0, tone = 'neutral', thickness = 'md', label }: ProgressBarProps) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const real = clamp01(value);
  const extra = clamp01(Math.min(1 - real, planned));
  const grow = useSharedValue(reduceMotion ? 1 : 0);
  const [a, b, c, d] = t.easing.standard;
  useEffect(() => {
    grow.set(reduceMotion ? 1 : withTiming(1, { duration: t.motion.grow, easing: Easing.bezier(a, b, c, d) }));
  }, [grow, reduceMotion, t, a, b, c, d, value]);
  const growStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: grow.get() }] }));
  const height = { thin: t.size.trackThin, md: t.size.track, thick: t.size.trackThick }[thickness];
  const fill = { neutral: t.colors.textSecondary, accent: t.colors.accent, danger: t.colors.dangerStrong, success: t.colors.success }[tone];
  return (
    <View
      style={[s.track, { height }]}
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? `${Math.round(real * 100)}%`}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(real * 100) }}
    >
      <Animated.View style={[s.fillRow, growStyle]}>
        <View style={[s.fill, { width: `${real * 100}%` as DimensionValue, backgroundColor: fill }, extra > 0 && s.fillJoin]} />
        {extra > 0 && (
          <View style={[s.plannedFill, { width: `${extra * 100}%` as DimensionValue }]}>
            <Stripes />
          </View>
        )}
      </Animated.View>
    </View>
  );
}

/** Listras a 135° do valor previsto (3 px cheio, 3 vazio). */
export function Stripes({ color }: { color?: string }) {
  const t = useTheme();
  const step = t.size.stripe * 2;
  return (
    <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
      <Defs>
        <Pattern id="glife-stripes" width={step} height={step} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <Line x1={t.size.stripe / 2} y1={0} x2={t.size.stripe / 2} y2={step} stroke={color ?? t.colors.planned} strokeWidth={t.size.stripe} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#glife-stripes)" />
    </Svg>
  );
}

/* ---------------- ProgressRing ---------------- */

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ProgressRingProps {
  /** 0 a 1 */
  value: number;
  size?: number;
  stroke?: number;
  tone?: 'accent' | 'danger' | 'success';
  children?: ReactNode;
}

/** Anel de progresso: trilho cinza e valor em cobalto, cresce em 800 ms. */
export function ProgressRing({ value, size, stroke, tone = 'accent', children }: ProgressRingProps) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const dim = size ?? t.size.ring;
  const sw = stroke ?? t.size.ringStroke;
  const r = (dim - sw) / 2;
  const circ = 2 * Math.PI * r;
  const p = useSharedValue(reduceMotion ? clamp01(value) : 0);
  const [a, b, c, d] = t.easing.standard;
  useEffect(() => {
    p.set(reduceMotion ? clamp01(value) : withTiming(clamp01(value), { duration: t.motion.grow, easing: Easing.bezier(a, b, c, d) }));
  }, [value, p, reduceMotion, t, a, b, c, d]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - p.get()) }));
  const color = { accent: t.colors.accent, danger: t.colors.dangerStrong, success: t.colors.success }[tone];
  return (
    <View style={[s.ring, { width: dim, height: dim }]}>
      <Svg width={dim} height={dim} style={s.ringSvg}>
        <Circle cx={dim / 2} cy={dim / 2} r={r} stroke={t.colors.track} strokeWidth={sw} fill="none" />
        <AnimatedCircle
          cx={dim / 2}
          cy={dim / 2}
          r={r}
          stroke={color}
          strokeWidth={sw}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          animatedProps={props}
        />
      </Svg>
      <View style={s.ringInner}>{children}</View>
    </View>
  );
}

/* ---------------- Checkbox / Radio ---------------- */

export interface CheckboxProps {
  checked: boolean;
  /** quadrado com cantos de 7 (itens de compra) ou redondo (tarefas) */
  square?: boolean;
}

/** Check de 24: cobalto cheio quando marcado; o traço surge com mola. Só visual: o toque é da linha. */
export function Checkbox({ checked, square }: CheckboxProps) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const on = useSharedValue(checked ? 1 : 0);
  useEffect(() => {
    on.set(reduceMotion ? (checked ? 1 : 0) : withSpring(checked ? 1 : 0, t.spring.tap));
  }, [checked, on, reduceMotion, t]);
  const mark = useAnimatedStyle(() => ({ opacity: clamp01(on.get()), transform: [{ scale: 0.3 + 0.7 * on.get() }] }));
  return (
    <View style={[s.check, square && s.checkSquare, checked && s.checkOn]}>
      <Animated.View style={mark}>
        <Icon icon={Check} size={square ? t.icon.tiny + t.hairline : t.icon.small - t.hairline} color="onAccent" />
      </Animated.View>
    </View>
  );
}

/** Rádio de 22: o ponto cresce com mola. */
export function Radio({ selected }: { selected: boolean }) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const on = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    on.set(reduceMotion ? (selected ? 1 : 0) : withSpring(selected ? 1 : 0, t.spring.tap));
  }, [selected, on, reduceMotion, t]);
  const dot = useAnimatedStyle(() => ({ transform: [{ scale: on.get() }] }));
  return (
    <View style={[s.radio, selected && s.radioOn]}>
      <Animated.View style={[s.radioDot, dot]} />
    </View>
  );
}

/* ---------------- StatValue ---------------- */

export interface StatValueProps {
  label: string;
  value: string;
  /** display 44 · big 40 · title2 24 */
  size?: 'display' | 'big' | 'title2' | 'heading';
  tone?: TextTone;
  sub?: ReactNode;
  accessibilityLabel?: string;
}

/** Rótulo curto e número grande tabular. */
export function StatValue({ label, value, size = 'big', tone = 'primary', sub, accessibilityLabel }: StatValueProps) {
  const s = useStyles();
  return (
    <View style={s.stat} accessible accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`}>
      <Text variant="small" tone={tone === 'inverse' ? 'inverseMuted' : 'tertiary'}>
        {label}
      </Text>
      <Text variant={size} tone={tone} numeric adjustsFontSizeToFit numberOfLines={1}>
        {value}
      </Text>
      {sub}
    </View>
  );
}

/* ---------------- AIInsight ---------------- */

export interface AIInsightProps {
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Bloco tonal da IA com o mascote: uma frase e, se houver, uma ação. */
export function AIInsight({ text, actionLabel, onAction }: AIInsightProps) {
  const s = useStyles();
  const t = useTheme();
  return (
    <View style={s.ai}>
      <Mascot size={t.size.mascotSmall} eyes={t.colors.tonal} mood="feliz" />
      <View style={s.aiTexts}>
        <Text variant="small">{text}</Text>
        {actionLabel && onAction && (
          <Pressable accessibilityRole="button" onPress={onAction} hitSlop={t.touch.hitSlop}>
            <Text variant="caption" tone="tonal" style={s.bold}>
              {actionLabel}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/* ---------------- estilos ---------------- */

const useStyles = makeStyles((t) => ({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[1],
    height: t.size.tag,
    paddingHorizontal: t.space[2] + t.hairline,
    borderRadius: t.radius.full,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  tagLarge: { height: t.size.tagLarge, paddingHorizontal: t.space[2.5] },
  tagLargeText: { fontSize: t.type.caption.fontSize },
  tag_neutral: { backgroundColor: t.colors.bg },
  tag_success: { backgroundColor: t.colors.successSoft },
  tag_warning: { backgroundColor: t.colors.warningSoft },
  tag_danger: { backgroundColor: t.colors.dangerSoft },
  tag_tonal: { backgroundColor: t.colors.tonal },
  tag_outline: { borderWidth: t.hairline, borderColor: t.colors.border },
  tag_inverse: { backgroundColor: t.colors.inverse },
  alert: { flexDirection: 'row', alignItems: 'flex-start', gap: t.space[2.5], borderRadius: t.radius.fieldLarge, paddingVertical: t.space[3], paddingHorizontal: t.space[3.5] },
  alert_warning: { backgroundColor: t.colors.warningSoft },
  alert_danger: { backgroundColor: t.colors.dangerSoft },
  alert_success: { backgroundColor: t.colors.successSoft },
  alert_info: { backgroundColor: t.colors.tonal },
  alert_neutral: { backgroundColor: t.colors.card },
  alertIcon: { height: t.type.small.lineHeight, justifyContent: 'center' },
  alertTexts: { flex: 1, gap: t.space[1] },
  bold: { fontFamily: t.type.button.font },
  track: { borderRadius: t.radius.full, backgroundColor: t.colors.track, overflow: 'hidden', alignSelf: 'stretch' },
  fillRow: { flexDirection: 'row', height: '100%', transformOrigin: 'left center' },
  fill: { height: '100%', borderRadius: t.radius.full },
  fillJoin: { borderTopRightRadius: t.space[0], borderBottomRightRadius: t.space[0] },
  plannedFill: { height: '100%', overflow: 'hidden', borderTopRightRadius: t.radius.full, borderBottomRightRadius: t.radius.full },
  ring: { alignItems: 'center', justifyContent: 'center' },
  ringSvg: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
  ringInner: { alignItems: 'center', justifyContent: 'center' },
  check: {
    width: t.size.checkbox,
    height: t.size.checkbox,
    borderRadius: t.radius.full,
    borderWidth: t.size.radioBorder,
    borderColor: t.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkSquare: { borderRadius: t.radius.checkbox },
  checkOn: { backgroundColor: t.colors.accent, borderColor: t.colors.accent },
  radio: {
    width: t.size.radio,
    height: t.size.radio,
    borderRadius: t.radius.full,
    borderWidth: t.size.radioBorder,
    borderColor: t.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioOn: { borderColor: t.colors.accent },
  radioDot: { width: t.size.radioDot, height: t.size.radioDot, borderRadius: t.radius.full, backgroundColor: t.colors.accent },
  stat: { gap: t.space[1.5] },
  ai: { flexDirection: 'row', alignItems: 'flex-start', gap: t.space[3], backgroundColor: t.colors.tonal, borderRadius: t.radius.tile, paddingVertical: t.space[3.5], paddingHorizontal: t.space[4] },
  aiTexts: { flex: 1, gap: t.space[1] },
}));

// Peças das telas de Investimentos (protótipo "Glife Investimentos"): linha de ativo, barra de distribuição,
// "Encerrados" que abre e fecha, linha de movimento e o gráfico de evolução do valor.
import { ASSET_KIND_LABELS, type AssetKind, type MovementKind, type PortfolioGroup } from '@glife/domain/finance';
import { Activity, ArrowDownLeft, ArrowUpRight, ChevronDown, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { Icon, ModuleIcon, Text, makeStyles, resolveSpring, useInListGroup, useReduceMotion, useTheme, type TextTone } from '@/shared/ui';

import { shareText } from './investmentFormat';

export const MOVEMENT_LABELS: Record<MovementKind, string> = {
  contribution: 'Aporte',
  withdrawal: 'Resgate',
  income: 'Rendimento',
  quote: 'Cotação',
};

export function movementIcon(kind: MovementKind, amount: number): LucideIcon {
  if (kind === 'contribution') return ArrowDownLeft;
  if (kind === 'withdrawal') return ArrowUpRight;
  if (kind === 'income') return amount < 0 ? TrendingDown : TrendingUp;
  return Activity;
}

/** Cor do resultado: ganho, perda ou neutro. */
export const resultTone = (cents: number): TextTone => (cents > 0 ? 'success' : cents < 0 ? 'danger' : 'tertiary');

// ---------- Lista ----------

export function AssetRow(p: {
  name: string;
  sub: string;
  value: string;
  pct: string;
  pctTone: TextTone;
  closed?: boolean;
  onPress: () => void;
}) {
  const s = useStyles();
  const inGroup = useInListGroup();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${p.name}, ${p.value}, ${p.pct}`}
      onPress={p.onPress}
      style={({ pressed }) => [s.row, !inGroup && s.rowDivider, pressed && s.pressed]}
    >
      <ModuleIcon icon={TrendingUp} module="investments" tone={p.closed ? 'neutral' : 'module'} />
      <View style={s.grow}>
        <Text variant="item" tone={p.closed ? 'secondary' : 'primary'}>
          {p.name}
        </Text>
        {p.sub ? (
          <Text variant="caption" tone="tertiary">
            {p.sub}
          </Text>
        ) : null}
      </View>
      <View style={s.right}>
        <Text variant="amount" tone={p.closed ? 'tertiary' : 'primary'} numeric>
          {p.value}
        </Text>
        <Text variant="caption" tone={p.pctTone} numeric>
          {p.pct}
        </Text>
      </View>
    </Pressable>
  );
}

/** Rótulo de grupo (tipo de ativo) com a participação à direita. */
export function GroupHeader({ label, right }: { label: string; right: string }) {
  const s = useStyles();
  return (
    <View style={s.groupHeader}>
      <Text variant="heading" accessibilityRole="header">
        {label}
      </Text>
      <Text variant="small" tone="tertiary" numeric>
        {right}
      </Text>
    </View>
  );
}

/** Barra segmentada por tipo, monocromática com destaque só no maior; legenda embaixo. */
export function DistributionBar({ groups }: { groups: readonly Pick<PortfolioGroup, 'kind' | 'total' | 'share'>[] }) {
  const s = useStyles();
  return (
    <View style={s.distribution}>
      <Text variant="emphasis">Distribuição</Text>
      <View style={s.bar}>
        {groups.map((g, i) => (
          <View key={g.kind} style={[s.segment, i === 0 ? s.segmentTop : s.segmentRest, { flexGrow: Math.max(g.total, 1) }]} />
        ))}
      </View>
      <View style={s.legend}>
        {groups.map((g, i) => (
          <Text key={g.kind} variant="small" tone={i === 0 ? 'accent' : 'secondary'} numeric style={i === 0 ? s.semibold : undefined}>
            {`${ASSET_KIND_LABELS[g.kind as AssetKind]} ${shareText(g.share)}`}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** "Encerrados" com a contagem; a seta gira 180° ao abrir. */
export function ClosedToggle({ count, open, onPress }: { count: number; open: boolean; onPress: () => void }) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const spring = resolveSpring('standard', reduceMotion);
  const k = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    k.set(spring ? withSpring(open ? 1 : 0, spring) : open ? 1 : 0);
  }, [open, spring, k]);
  const rotate = useAnimatedStyle(() => ({ transform: [{ rotate: `${k.get() * 180}deg` }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      onPress={onPress}
      style={({ pressed }) => [s.closedRow, pressed && s.pressed]}
    >
      <Text tone="secondary" style={[s.grow, s.medium]}>
        Encerrados
      </Text>
      <Text variant="caption" tone="tertiary" numeric>
        {String(count)}
      </Text>
      <Animated.View style={rotate}>
        <Icon icon={ChevronDown} size={t.icon.small + t.space[0.5]} color="textSecondary" />
      </Animated.View>
    </Pressable>
  );
}

// ---------- Detalhe ----------

export function MovementRow(p: { icon: LucideIcon; label: string; sub: string; amount: string; muted?: boolean; onPress: () => void }) {
  const s = useStyles();
  const inGroup = useInListGroup();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${p.label}, ${p.amount}`}
      onPress={p.onPress}
      style={({ pressed }) => [s.row, !inGroup && s.rowDivider, pressed && s.pressed]}
    >
      <ModuleIcon icon={p.icon} module="investments" tone={p.muted ? 'neutral' : 'module'} />
      <View style={s.grow}>
        <Text variant="item">{p.label}</Text>
        {p.sub ? (
          <Text variant="caption" tone="tertiary" numeric>
            {p.sub}
          </Text>
        ) : null}
      </View>
      <Text variant="amount" tone={p.muted ? 'secondary' : 'primary'} numeric>
        {p.amount}
      </Text>
    </Pressable>
  );
}

/** Linha da evolução do valor (monocromática) com o ponto de hoje em destaque. */
export function AssetChart({ series, from }: { series: readonly { date: string; value: number }[]; from: string }) {
  const s = useStyles();
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const height = t.size.chart;
  const pad = t.space[1.5];
  const points = (() => {
    if (series.length === 0 || width === 0) return [];
    const t0 = Date.parse(series[0]!.date);
    const t1 = Date.parse(series[series.length - 1]!.date);
    const vs = series.map((p) => p.value);
    const min = Math.min(...vs);
    const max = Math.max(...vs);
    return series.map((p, i) => [
      t1 > t0 ? ((Date.parse(p.date) - t0) / (t1 - t0)) * width : i === 0 ? 0 : width,
      max > min ? pad + (1 - (p.value - min) / (max - min)) * (height - 2 * pad) : height / 2,
    ]);
  })();
  const d = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x!.toFixed(1)} ${y!.toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  return (
    <View style={s.chart}>
      <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && last && (
          <Svg width={width} height={height}>
            <Path d={d} fill="none" stroke={t.colors.textSecondary} strokeWidth={t.icon.strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
            <Circle cx={last[0]} cy={last[1]} r={t.size.chartDot} fill={t.colors.accent} />
          </Svg>
        )}
      </View>
      <View style={s.chartAxis}>
        <Text variant="caption" tone="tertiary" numeric>
          {from}
        </Text>
        <Text variant="caption" tone="tertiary">
          Hoje
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  grow: { flex: 1, minWidth: 0, gap: t.space[1] },
  medium: { fontFamily: t.type.chip.font },
  semibold: { fontFamily: t.type.button.font },
  pressed: { opacity: t.opacity.pressed },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3],
    minHeight: t.size.listRow,
    paddingVertical: t.space[3],
  },
  rowDivider: { borderTopWidth: t.hairline, borderTopColor: t.colors.hairline },
  right: { flexShrink: 0, alignItems: 'flex-end', gap: t.space[1] },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: t.space[3],
    paddingTop: t.space[2],
    paddingBottom: t.space[1],
  },
  distribution: { gap: t.space[3] },
  bar: { flexDirection: 'row', gap: t.space[1], height: t.size.trackThick + t.space[0.5] },
  segment: { flexBasis: 0, minWidth: t.space[1], borderRadius: t.radius.full },
  segmentTop: { backgroundColor: t.colors.accent },
  segmentRest: { backgroundColor: t.colors.border },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: t.space[4], rowGap: t.space[1.5] },
  closedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[2] + t.space[0.5],
    minHeight: t.size.listRow,
    paddingVertical: t.space[2],
    paddingHorizontal: t.space[4],
    borderRadius: t.radius.card,
    backgroundColor: t.colors.card,
  },
  chart: { gap: t.space[2] },
  chartAxis: { flexDirection: 'row', justifyContent: 'space-between' },
}));

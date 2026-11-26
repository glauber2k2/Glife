// Linha no tempo (Saldo das contas, Patrimônio investido): contínua até hoje, tracejada no esperado, ponto de hoje
// em destaque. Desenha-se da esquerda em 350 ms (uma máscara que abre). O toque marca o ponto mais próximo do dedo e
// mostra data e valor; nos dias futuros, "esperado".
import type { SeriesPoint } from '@glife/domain/finance';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { Text, makeStyles, useReduceMotion, useTheme } from '@/shared/ui';


import { useMoneyFormat } from '../../hooks/useMoneyFormat';
import { dayMonth } from './chartFormat';
import { ScrubLayer, ScrubLine, ScrubTag, useScrub } from './scrub';

export interface LineChartProps {
  points: readonly SeriesPoint[];
  accessibilityLabel: string;
  resetKey: string;
}

/** Distância mínima (fração da largura) entre "Hoje" e o rótulo da ponta. */
const MIN_LABEL_GAP = 0.22;
const dayNumber = (d: string) => Date.parse(`${d}T00:00:00Z`) / 86_400_000;

export function LineChart({ points, accessibilityLabel, resetKey }: LineChartProps) {
  const { balance } = useMoneyFormat();
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const [width, setWidth] = useState(0);
  const height = t.size.chartLine;
  const pad = t.size.chartLinePad;
  const top = t.size.chartTop;

  // Posição horizontal pela data (0–1), vertical pela escala do mínimo ao máximo.
  const xs = useMemo(() => {
    const d0 = dayNumber(points[0]!.date);
    const d1 = dayNumber(points[points.length - 1]!.date);
    return points.map((p, i) => (d1 > d0 ? (dayNumber(p.date) - d0) / (d1 - d0) : i / Math.max(1, points.length - 1)));
  }, [points]);
  const ys = useMemo(() => {
    const vs = points.map((p) => p.value);
    let min = Math.min(...vs);
    let max = Math.max(...vs);
    if (max - min < 1) {
      min -= 1;
      max += 1;
    }
    return vs.map((v) => pad + (1 - (v - min) / (max - min)) * (height - 2 * pad));
  }, [points, pad, height]);

  const pick = useCallback(
    (fx: number) => xs.reduce((best, x, i) => (Math.abs(x - fx) < Math.abs(xs[best]! - fx) ? i : best), 0),
    [xs],
  );
  const { index, layer } = useScrub(pick, resetKey);

  const real = points.map((p, i) => (p.future ? -1 : i)).filter((i) => i >= 0);
  const lastReal = real[real.length - 1];
  const future = lastReal === undefined ? [] : [lastReal, ...points.map((p, i) => (p.future ? i : -1)).filter((i) => i >= 0)];
  const path = (idx: number[]) => idx.map((i, j) => `${j ? 'L' : 'M'}${(xs[i]! * width).toFixed(1)} ${ys[i]!.toFixed(1)}`).join(' ');
  const todayIndex = points.findIndex((p) => p.today);

  // Máscara que abre da esquerda: a linha "se desenha".
  const reveal = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    reveal.set(0);
    reveal.set(reduceMotion ? 1 : withTiming(1, { duration: t.motion.emphasis }));
  }, [resetKey, reduceMotion, reveal, t.motion.emphasis]);
  const mask = useAnimatedStyle(() => ({ width: `${reveal.get() * 100}%` }));

  const sel = index !== null ? points[index] : undefined;
  return (
    <View>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        style={{ height: top + height }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {width > 0 && (
          <Animated.View style={[s.mask, { top, height }, mask]}>
            <Svg width={width} height={height} style={s.svg}>
              {real.length > 1 && (
                <Path d={path(real)} fill="none" stroke={t.colors.textSecondary} strokeWidth={t.icon.strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
              )}
              {future.length > 1 && (
                <Path
                  d={path(future)}
                  fill="none"
                  stroke={t.colors.textTertiary}
                  strokeWidth={t.icon.strokeWidth}
                  strokeDasharray={`${t.size.dashOn} ${t.size.dashOff}`}
                  strokeLinecap="round"
                />
              )}
              {todayIndex >= 0 && <Circle cx={xs[todayIndex]! * width} cy={ys[todayIndex]!} r={t.size.chartDot} fill={t.colors.accent} />}
            </Svg>
          </Animated.View>
        )}
        {sel && width > 0 && (
          <>
            <ScrubTag fx={xs[index!]!} width={width} top={t.space[1.5]}>
              <Text variant="caption" numeric style={s.medium}>
                <Text variant="caption" tone="tertiary">
                  {`${sel.today ? 'Hoje' : dayMonth(sel.date)}${sel.future ? ' · esperado' : ''} `}
                </Text>
                {balance(sel.value)}
              </Text>
            </ScrubTag>
            <ScrubLine x={xs[index!]! * width} top={top - t.space[2]} height={ys[index!]! + t.space[1]} />
            <View
              pointerEvents="none"
              style={[s.marker, { left: xs[index!]! * width - t.size.scrubDot / 2, top: top + ys[index!]! - t.size.scrubDot / 2 }]}
            />
          </>
        )}
        <ScrubLayer layer={layer} />
      </View>
      <Axis points={points} xs={xs} width={width} />
    </View>
  );
}

/** Até três rótulos: o primeiro, "Hoje" e o último, sem se encostarem (cada um a pelo menos 22% do outro). */
function Axis({ points, xs, width }: { points: readonly SeriesPoint[]; xs: number[]; width: number }) {
  const s = useStyles();
  const ti = points.findIndex((p) => p.today);
  const last = points.length - 1;
  const tx = ti >= 0 ? xs[ti]! : null;
  const labels: { i: number; today: boolean }[] = [];
  if (tx === null || tx >= MIN_LABEL_GAP) labels.push({ i: 0, today: false });
  if (ti >= 0) labels.push({ i: ti, today: true });
  if (ti !== last && (tx === null || 1 - tx >= MIN_LABEL_GAP)) labels.push({ i: last, today: false });
  return (
    <View style={s.axis}>
      {width > 0 &&
        labels.map((l) => (
          <AxisLabel key={l.i} fx={xs[l.i]!} width={width} today={l.today} text={l.today ? 'Hoje' : dayMonth(points[l.i]!.date)} />
        ))}
    </View>
  );
}

function AxisLabel({ fx, width, today, text }: { fx: number; width: number; today: boolean; text: string }) {
  const s = useStyles();
  const [own, setOwn] = useState(0);
  return (
    <Text
      variant="tab"
      tone={today ? 'accent' : 'tertiary'}
      numeric
      numberOfLines={1}
      onLayout={(e) => setOwn(e.nativeEvent.layout.width)}
      style={[s.axisLabel, today && s.semibold, { left: Math.max(0, fx * (width - own)), opacity: own > 0 ? 1 : 0 }]}
    >
      {text}
    </Text>
  );
}

const useStyles = makeStyles((t) => ({
  medium: { fontFamily: t.type.chip.font },
  semibold: { fontFamily: t.type.button.font },
  mask: { position: 'absolute', left: 0, overflow: 'hidden' },
  svg: { overflow: 'visible' },
  marker: {
    position: 'absolute',
    width: t.size.scrubDot,
    height: t.size.scrubDot,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.text,
  },
  axis: { height: t.type.tab.lineHeight + t.space[0.5], marginTop: t.space[2] },
  axisLabel: { position: 'absolute', top: 0 },
}));

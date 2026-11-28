// Linha de Investimentos: uma ou mais séries na mesma escala (Patrimônio cheio com área leve, Investido tracejado),
// linha de referência (preço médio), marcas (aportes) e o ponto de hoje. Desenha-se da esquerda; tocar ou arrastar
// mostra data e valores do dia sob o dedo. Dias sem dado (null) ficam fora do traço.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';

import { Text, makeStyles, useReduceMotion, useTheme } from '@/shared/ui';

import { dayMonth } from './chartFormat';
import { lineGeometry, nearestValid, pathOf } from './investGeometry';
import { ScrubLayer, ScrubLine, ScrubTag, useScrub } from './scrub';

export interface InvestSeries {
  values: readonly (number | null)[];
  color: string;
  area?: boolean;
  dashed?: boolean;
  label: string;
}

export interface InvestLineChartProps {
  series: readonly InvestSeries[];
  dates: readonly string[];
  reference?: { value: number; label: string } | null;
  /** índices com marca (aportes) */
  marks?: readonly number[];
  height?: number;
  format: (v: number) => string;
  accessibilityLabel: string;
  resetKey: string;
}

export function InvestLineChart({ series, dates, reference, marks = [], height: h, format, accessibilityLabel, resetKey }: InvestLineChartProps) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const [width, setWidth] = useState(0);
  const height = h ?? t.size.investLine;
  const top = t.size.chartTop;
  const pad = t.size.chartLinePad;

  const g = useMemo(
    () => lineGeometry(series.map((x) => x.values), { width, height, pad, reference: reference?.value ?? null }),
    [series, width, height, pad, reference?.value],
  );
  const main = useMemo(() => g.ys[0] ?? [], [g]);
  const pick = useCallback((fx: number) => nearestValid(g.xs, main, fx), [g.xs, main]);
  const { index, layer } = useScrub(pick, resetKey);

  const reveal = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    const [x1, y1, x2, y2] = t.easing.standard;
    reveal.set(0);
    reveal.set(reduceMotion ? 1 : withTiming(1, { duration: t.motion.grow, easing: Easing.bezier(x1, y1, x2, y2) }));
  }, [resetKey, reduceMotion, reveal, t]);
  const mask = useAnimatedStyle(() => ({ width: `${reveal.get() * 100}%` }));

  const first = main.findIndex((y) => y !== null);
  const lastIndex = main.length - 1;
  const lastY = main[lastIndex] ?? null;

  return (
    <View>
      <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} style={{ height: top + height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && first >= 0 && (
          <Animated.View style={[s.mask, { top, height }, mask]}>
            <Svg width={width} height={height} style={s.svg}>
              {[0.25, 0.5, 0.75].map((k) => (
                <Line key={k} x1={0} x2={width} y1={pad + k * (height - 2 * pad)} y2={pad + k * (height - 2 * pad)} stroke={t.colors.hairline} strokeWidth={t.hairline} />
              ))}
              {series.map((x, k) => {
                const ys = g.ys[k]!;
                const d = pathOf(g.xs, ys);
                const start = ys.findIndex((y) => y !== null);
                return (
                  <G key={x.label}>
                    {x.area && start >= 0 && <Path d={`${d}L${width} ${height}L${g.xs[start]!} ${height}Z`} fill={x.color} fillOpacity={t.opacity.area} />}
                    <Path
                      d={d}
                      fill="none"
                      stroke={x.color}
                      strokeWidth={t.size.ring}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      strokeDasharray={x.dashed ? `${t.size.dashOn * 2} ${t.size.dashOff * 2}` : undefined}
                    />
                  </G>
                );
              })}
              {g.refY !== null && (
                <Line x1={0} x2={width} y1={g.refY} y2={g.refY} stroke={t.colors.textTertiary} strokeWidth={t.hairline} strokeDasharray={`${t.size.dashOn * 2} ${t.size.dashOff * 2}`} />
              )}
              {marks.map((i) => (main[i] !== null && main[i] !== undefined ? <Circle key={i} cx={g.xs[i]} cy={main[i]!} r={t.size.investMark} fill={t.colors.card} stroke={series[0]!.color} strokeWidth={t.size.ring} /> : null))}
              {lastY !== null && <Circle cx={g.xs[lastIndex]} cy={lastY} r={t.size.chartDot + 0.5} fill={series[0]!.color} stroke={t.colors.card} strokeWidth={t.size.ring} />}
            </Svg>
          </Animated.View>
        )}
        {reference && g.refY !== null && width > 0 && (
          <Text variant="micro" tone="tertiary" style={[s.refLabel, { top: top + g.refY - t.type.micro.lineHeight - t.space[0.5] }]}>
            {reference.label}
          </Text>
        )}
        {index !== null && width > 0 && (
          <>
            <ScrubTag fx={g.xs[index]! / width} width={width} top={0}>
              <Text variant="caption" tone="tertiary" numeric>
                {index === lastIndex ? 'Hoje' : dayMonth(dates[index]!)}
              </Text>
              {series.map((x, k) =>
                x.values[index] !== null && x.values[index] !== undefined ? (
                  <Text key={x.label} variant="caption" numeric style={s.medium}>
                    {series.length > 1 ? `${x.label}: ` : ''}
                    {format(x.values[index]!)}
                  </Text>
                ) : null,
              )}
            </ScrubTag>
            <ScrubLine x={g.xs[index]!} top={top - t.space[2]} height={height + t.space[2]} />
            {series.map((x, k) =>
              g.ys[k]![index] !== null && g.ys[k]![index] !== undefined ? (
                <View key={x.label} pointerEvents="none" style={[s.marker, { backgroundColor: x.color, left: g.xs[index]! - t.size.scrubDot / 2, top: top + g.ys[k]![index]! - t.size.scrubDot / 2 }]} />
              ) : null,
            )}
          </>
        )}
        <ScrubLayer layer={layer} />
      </View>
      <View style={s.axis}>
        <Text variant="tab" tone="tertiary" numeric>
          {first >= 0 ? dayMonth(dates[first]!) : ''}
        </Text>
        <Text variant="tab" tone="accent" style={s.semibold}>
          Hoje
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  medium: { fontFamily: t.type.chip.font },
  semibold: { fontFamily: t.type.button.font },
  mask: { position: 'absolute', left: 0, overflow: 'hidden' },
  svg: { overflow: 'visible' },
  refLabel: { position: 'absolute', left: t.space[1], fontFamily: t.type.mono.font },
  marker: {
    position: 'absolute',
    width: t.size.scrubDot,
    height: t.size.scrubDot,
    borderRadius: t.radius.full,
    borderWidth: t.size.ring,
    borderColor: t.colors.card,
  },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: t.space[2] },
}));

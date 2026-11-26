// Calorias por dia (protótipo "dieta-semana"): uma barra por dia contra a linha tracejada da meta. Hoje em cobalto;
// dia sem registro (ou futuro) é um traço na base. As barras crescem da base em cascata e a linha da meta se desenha da
// esquerda; com "reduzir movimento", tudo aparece direto.
import type { HistoryDay } from '@glife/domain/diet';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';

import { Text, makeStyles, resolveSpring, useReduceMotion, useTheme } from '@/shared/ui';

/** Folga acima do maior valor (a meta não encosta no topo). */
const HEADROOM = 1.2;

export interface DietBarChartProps {
  days: readonly HistoryDay[];
  /** meta de kcal (null = sem linha) */
  goal: number | null;
  /** rótulo do eixo de cada dia ("S", "T"… ou o dia do mês) */
  axisLabel: (day: HistoryDay, index: number) => string;
  accessibilityLabel: string;
}

export function DietBarChart({ days, goal, axisLabel, accessibilityLabel }: DietBarChartProps) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const [width, setWidth] = useState(0);
  const plotHeight = t.size.chartBars;
  const top = Math.max(goal ?? 0, ...days.map((d) => d.kcal)) * HEADROOM;
  const n = days.length;
  const barWidth = n > 7 ? t.size.barThin : t.size.barWide;
  // Cascata que cabe em ~6 passos de 70 ms, seja semana ou mês.
  const step = (t.motion.stagger * Math.min(n, t.motion.staggerMax)) / Math.max(1, n);
  const goalY = goal && top > 0 ? plotHeight * (1 - goal / top) : null;

  return (
    <View>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        style={[s.plot, { height: plotHeight }]}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {days.map((d, i) => (
          <View key={d.date} style={s.slot}>
            <Bar kcal={d.kcal} top={top} plotHeight={plotHeight} width={barWidth} today={d.today} delay={reduceMotion ? 0 : Math.round(i * step)} />
          </View>
        ))}
        {goalY !== null && width > 0 && <GoalLine y={goalY} width={width} />}
      </View>
      <View style={s.axis}>
        {days.map((d, i) => (
          <Text key={d.date} variant="tab" tone={d.today ? 'accent' : 'tertiary'} align="center" numeric numberOfLines={1} style={[s.axisLabel, d.today && s.semibold]}>
            {axisLabel(d, i)}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Bar({ kcal, top, plotHeight, width, today, delay }: { kcal: number; top: number; plotHeight: number; width: number; today: boolean; delay: number }) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const spring = resolveSpring('emphasis', reduceMotion);
  const empty = kcal <= 0 || top <= 0;
  const target = empty ? t.size.barEmpty : Math.max(t.size.barEmpty, (kcal / top) * plotHeight);
  const h = useSharedValue(spring ? 0 : target);
  useEffect(() => {
    h.set(spring ? withDelay(delay, withSpring(target, spring)) : target);
  }, [target, spring, delay, h]);
  const size = useAnimatedStyle(() => ({ height: h.get() }));
  const color = empty ? t.colors.hairline : today ? t.colors.accent : t.colors.textTertiary;
  return <Animated.View style={[s.bar, { width, backgroundColor: color }, size]} />;
}

/** Linha tracejada da meta: a janela abre da esquerda para a direita. */
function GoalLine({ y, width }: { y: number; width: number }) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const w = useSharedValue(reduceMotion ? width : 0);
  const [a, b, c, d] = t.easing.standard;
  useEffect(() => {
    w.set(reduceMotion ? width : withTiming(width, { duration: t.motion.grow, easing: Easing.bezier(a, b, c, d) }));
  }, [w, width, reduceMotion, t.motion.grow, a, b, c, d]);
  const reveal = useAnimatedStyle(() => ({ width: w.get() }));
  const stroke = t.size.barOutline;
  return (
    <Animated.View pointerEvents="none" style={[s.goal, { top: y - stroke / 2, height: stroke }, reveal]}>
      <Svg width={width} height={stroke}>
        <Line
          x1={0}
          y1={stroke / 2}
          x2={width}
          y2={stroke / 2}
          stroke={t.colors.textTertiary}
          strokeWidth={stroke}
          strokeDasharray={`${t.size.dashOff} ${t.size.dashOff}`}
        />
      </Svg>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  plot: { flexDirection: 'row' },
  slot: { flex: 1, minWidth: 0, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  bar: { borderRadius: t.size.barRadius },
  goal: { position: 'absolute', left: 0, overflow: 'hidden' },
  axis: { flexDirection: 'row', marginTop: t.space[2] },
  axisLabel: { flex: 1, minWidth: 0 },
  semibold: { fontFamily: t.type.button.font },
}));

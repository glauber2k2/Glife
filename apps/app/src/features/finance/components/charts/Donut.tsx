// Rosca de alocação: uma fatia por grupo com espaço entre elas. Tocar numa fatia engrossa-a com mola e esmaece as
// outras; tocar de novo desmarca. O centro mostra o que a tela mandar (total ou o grupo escolhido).
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { makeStyles, useReduceMotion, useTheme } from '@/shared/ui';

import { donutArcs, nextSelection } from './investGeometry';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface DonutSlice {
  key: string;
  value: number;
  color: string;
  label: string;
}

export function Donut({
  slices,
  selected,
  onSelect,
  center,
  size: sizeProp,
  accessibilityLabel,
}: {
  slices: readonly DonutSlice[];
  selected: string | null;
  onSelect?: (key: string | null) => void;
  center: ReactNode;
  size?: number;
  accessibilityLabel: string;
}) {
  const s = useStyles();
  const t = useTheme();
  const size = sizeProp ?? t.size.donut;
  const stroke = (t.size.donutStroke * size) / t.size.donut;
  const r = (size - t.size.donutStrokeActive) / 2;
  const c = 2 * Math.PI * r;
  const arcs = donutArcs(slices, c, t.size.donutGap);
  return (
    <View style={[s.box, { width: size, height: size }]} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <Svg width={size} height={size}>
        {arcs.map((a, i) => {
          const slice = slices.find((x) => x.key === a.key)!;
          return (
            <Arc
              key={a.key}
              cx={size / 2}
              r={r}
              color={slice.color}
              length={a.length}
              circumference={c}
              offset={a.offset}
              width={selected === a.key ? t.size.donutStrokeActive : stroke}
              dim={selected !== null && selected !== a.key}
              delay={i * t.motion.stagger}
              onPress={onSelect ? () => onSelect(nextSelection(selected, a.key)) : undefined}
            />
          );
        })}
      </Svg>
      <View style={s.center} pointerEvents="none">
        {center}
      </View>
    </View>
  );
}

function Arc(p: { cx: number; r: number; color: string; length: number; circumference: number; offset: number; width: number; dim: boolean; delay: number; onPress?: () => void }) {
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const grow = useSharedValue(reduceMotion ? 1 : 0);
  const width = useSharedValue(p.width);
  const opacity = useSharedValue(1);
  useEffect(() => {
    grow.set(reduceMotion ? 1 : withTiming(1, { duration: t.motion.grow }));
  }, [grow, reduceMotion, t]);
  useEffect(() => {
    width.set(reduceMotion ? p.width : withSpring(p.width, t.spring.tap));
    opacity.set(withTiming(p.dim ? t.opacity.faint : t.opacity.full, { duration: reduceMotion ? t.motion.reduced : t.motion.standard }));
  }, [p.width, p.dim, width, opacity, reduceMotion, t]);
  const props = useAnimatedProps(() => ({
    strokeWidth: width.get(),
    strokeOpacity: opacity.get(),
    strokeDasharray: [p.length * grow.get(), p.circumference],
  }));
  return (
    <AnimatedCircle
      cx={p.cx}
      cy={p.cx}
      r={p.r}
      fill="none"
      stroke={p.color}
      strokeDashoffset={p.offset}
      rotation={-90}
      origin={`${p.cx}, ${p.cx}`}
      animatedProps={props}
      onPress={p.onPress}
    />
  );
}

const useStyles = makeStyles(() => ({
  box: { position: 'relative', flexShrink: 0 },
  center: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
}));

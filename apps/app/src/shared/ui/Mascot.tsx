import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Ellipse, Path, Rect } from 'react-native-svg';

import { makeStyles, useTheme } from './theme';
import { useReduceMotion } from './theme/ThemeProvider';

export type MascotMood = 'normal' | 'feliz' | 'pensando' | 'dormindo';

export interface MascotProps {
  size?: number;
  /** cor do corpo (padrão cobalto) */
  color?: string;
  /** cor dos olhos (padrão a do cartão) */
  eyes?: string;
  mood?: MascotMood;
  /** flutua devagar (estados vazios) */
  float?: boolean;
}

const RX = 2.6;
const RY = 3.6;

function Eye({ x, y, mood, fill }: { x: number; y: number; mood: MascotMood; fill: string }) {
  if (mood === 'feliz')
    return (
      <Path
        d={`M${x - RX - 0.6} ${y + 1.2} Q${x} ${y - RY - 1.6} ${x + RX + 0.6} ${y + 1.2}`}
        fill="none"
        stroke={fill}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    );
  if (mood === 'dormindo')
    return (
      <Path d={`M${x - RX - 0.6} ${y} Q${x} ${y + RY} ${x + RX + 0.6} ${y}`} fill="none" stroke={fill} strokeWidth={2.2} strokeLinecap="round" />
    );
  if (mood === 'pensando') return <Ellipse cx={x + 1.3} cy={y - 1.8} rx={RX * 0.85} ry={RY * 0.85} fill={fill} />;
  return <Ellipse cx={x} cy={y} rx={RX} ry={RY} fill={fill} />;
}

/** Mascote (G com olhos): a marca e a cara da IA. Só em estados vazios, conquistas e IA. Pisca a cada 4 s. */
export function Mascot({ size, color, eyes, mood = 'normal', float }: MascotProps) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const body = color ?? t.colors.accent;
  const eyeFill = eyes ?? t.colors.card;
  const dim = size ?? t.size.mascot;
  const blink = useSharedValue(1);
  const lift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      blink.set(1);
      lift.set(0);
      return;
    }
    if (mood === 'normal') {
      blink.set(
        withRepeat(
          withSequence(withDelay(t.motion.blink, withTiming(0.1, { duration: t.motion.press })), withTiming(1, { duration: t.motion.press })),
          -1,
        ),
      );
    }
    if (float) {
      const [a, b, c, d] = t.easing.loop;
      lift.set(withRepeat(withTiming(1, { duration: t.motion.float, easing: Easing.bezier(a, b, c, d) }), -1, true));
    }
  }, [reduceMotion, mood, float, blink, lift, t]);

  const eyesStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.get() }] }));
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -t.space[1] * lift.get() }] }));

  return (
    <Animated.View style={[{ width: dim, height: dim }, floatStyle]} accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={dim} height={dim} viewBox="0 0 48 48">
        <Path d="M24 24 V8 A16 16 0 1 0 40 24 Z" fill={body} stroke={body} strokeWidth={3} strokeLinejoin="round" />
        <Rect x={24} y={18} width={13} height={7} rx={2.5} fill={body} />
      </Svg>
      <View style={s.layer} pointerEvents="none">
        <Animated.View style={[{ width: dim, height: dim }, eyesStyle]}>
          <Svg width={dim} height={dim} viewBox="0 0 48 48">
            <Eye x={16.5} y={28} mood={mood} fill={eyeFill} />
            <Eye x={26.5} y={28} mood={mood} fill={eyeFill} />
          </Svg>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  layer: { position: 'absolute', top: t.space[0], left: t.space[0] },
}));

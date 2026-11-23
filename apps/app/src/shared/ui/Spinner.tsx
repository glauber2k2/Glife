import { useEffect } from 'react';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { makeStyles, useTheme, type Palette } from './theme';
import { useReduceMotion } from './theme/ThemeProvider';

export interface SpinnerProps {
  color?: keyof Pick<Palette, 'text' | 'textSecondary' | 'textTertiary' | 'onAccent' | 'accentInk' | 'danger'>;
}

/** Anel de 16 px, traço 1,5. Única animação em laço do sistema, e só enquanto há espera. Parado ao reduzir movimento. */
export function Spinner({ color = 'text' }: SpinnerProps) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const turn = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      turn.set(0);
      return;
    }
    turn.set(withRepeat(withTiming(1, { duration: t.motion.spin, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(turn);
  }, [reduceMotion, turn, t.motion.spin]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get() * 360}deg` }] }));

  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[s.ring, { borderColor: t.colors[color] }, s.gap, style]}
    />
  );
}

const useStyles = makeStyles((t) => ({
  ring: {
    width: t.size.spinner,
    height: t.size.spinner,
    borderRadius: t.radius.full,
    borderWidth: t.size.strike,
  },
  gap: { borderTopColor: 'transparent' },
}));

import { useEffect } from 'react';
import { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { useTheme } from './theme';
import { useReduceMotion } from './theme/ThemeProvider';

/**
 * Toque do Cobalto: afunda a 0,96 em 90 ms e volta com mola em 380 ms. Parado com "reduzir movimento".
 * Devolve os handlers para o Pressable e o estilo animado para a View de dentro.
 */
export function usePress(disabled?: boolean) {
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const rest = t.pressScale.rest;
  const scale = useSharedValue<number>(rest);
  const [x1, y1, x2, y2] = t.easing.standard;

  useEffect(() => {
    if (reduceMotion || disabled) scale.set(rest);
  }, [reduceMotion, disabled, scale, rest]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: reduceMotion ? rest : scale.get() }] }));

  return {
    style,
    onPressIn: () => {
      if (reduceMotion || disabled) return;
      scale.set(withTiming(t.pressScale.pressed, { duration: t.motion.press, easing: Easing.bezier(x1, y1, x2, y2) }));
    },
    onPressOut: () => {
      if (reduceMotion) return;
      scale.set(withSpring(rest, t.spring.tap));
    },
  };
}

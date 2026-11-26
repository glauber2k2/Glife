import { useIsFocused } from 'expo-router';
import { useLayoutEffect, type ReactNode } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { makeStyles, useReduceMotion, useTheme } from '@/shared/ui';

import { tabSceneEnterFrom, type TabFocusTracker } from './navigationMotion';

/**
 * Mantém a tela montada (a troca de aba não apaga o estado local). Ao ganhar foco, a tela esmaece e cresce de
 * 0,94 (240 ms, curva de entrada), sem direção. Com "reduzir movimento", só esmaece em 160 ms.
 */
export function TabScene({ children }: { children: ReactNode; tracker?: TabFocusTracker }) {
  const s = useStyles();
  const t = useTheme();
  const focused = useIsFocused();
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue<number>(t.opacity.hidden);
  const scale = useSharedValue<number>(t.pressScale.rest);

  useLayoutEffect(() => {
    if (!focused) return;
    const from = tabSceneEnterFrom(reduceMotion);
    const [a, b, c, d] = t.easing.enter;
    const timing = { duration: reduceMotion ? t.motion.reduced : t.motion.standard, easing: Easing.bezier(a, b, c, d) };
    opacity.set(from.opacity);
    scale.set(from.scale);
    opacity.set(withTiming(t.opacity.full, timing));
    scale.set(withTiming(t.pressScale.rest, timing));
  }, [focused, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ scale: scale.get() }] }));

  return (
    <Animated.View testID="tab-scene" style={[s.scene, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  scene: { flex: 1, backgroundColor: t.colors.bg },
}));

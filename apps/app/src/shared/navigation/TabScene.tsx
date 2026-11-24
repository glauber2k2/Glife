import { useIsFocused } from 'expo-router';
import { useLayoutEffect, type ReactNode } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { makeStyles, useReduceMotion, useTheme } from '@/shared/ui';

import { tabSceneEnterFrom } from './navigationMotion';

/** Mantém a tela montada: a troca de aba esmaece sem apagar seu estado local nem deslocar a tela. */
export function TabScene({ children }: { children: ReactNode }) {
  const s = useStyles();
  const t = useTheme();
  const focused = useIsFocused();
  const reduceMotion = useReduceMotion();
  const from = tabSceneEnterFrom(reduceMotion);
  const opacity = useSharedValue(from.opacity);

  useLayoutEffect(() => {
    if (focused && !reduceMotion) opacity.set(withTiming(1, { duration: t.motion.tap }));
    else opacity.set(focused ? 1 : from.opacity);
  }, [focused, reduceMotion, opacity, from.opacity, t.motion.tap]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <Animated.View testID="tab-scene" style={[s.scene, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  scene: { flex: 1, backgroundColor: t.colors.bg },
}));

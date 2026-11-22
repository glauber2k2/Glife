import { useIsFocused } from 'expo-router';
import { useLayoutEffect, type ReactNode } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { makeStyles, resolveSpring, useReduceMotion, useTheme } from '@/shared/ui';

/** Mantém a tela montada: a troca de aba anima sem apagar seu estado local. */
export function TabScene({ children }: { children: ReactNode }) {
  const s = useStyles();
  const t = useTheme();
  const focused = useIsFocused();
  const reduceMotion = useReduceMotion();
  const distance = t.space[6];
  const offset = useSharedValue(reduceMotion ? t.space[0] : distance);
  const spring = resolveSpring('standard', reduceMotion);

  useLayoutEffect(() => {
    if (focused && spring) offset.set(withSpring(t.space[0], spring));
    else offset.set(reduceMotion ? t.space[0] : distance);
  }, [focused, reduceMotion, spring, offset, distance, t.space]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: reduceMotion ? t.space[0] : offset.get() }],
  }));

  return (
    <Animated.View testID="tab-scene" style={[s.scene, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  scene: { flex: 1, backgroundColor: t.colors.bg },
}));

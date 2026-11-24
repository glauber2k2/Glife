import { useIsFocused, useNavigation, useRoute } from 'expo-router';
import { useLayoutEffect, type ReactNode } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { makeStyles, resolveSpring, useReduceMotion, useTheme } from '@/shared/ui';

import { tabSceneEnterFrom, type TabFocusTracker } from './navigationMotion';

/**
 * Mantém a tela montada (a troca de aba não apaga o estado local). Ao ganhar foco, a tela entra pelo lado
 * do movimento enquanto esmaece; a primeira só esmaece; com "reduzir movimento" aparece direto.
 */
export function TabScene({ children, tracker }: { children: ReactNode; tracker: TabFocusTracker }) {
  const s = useStyles();
  const t = useTheme();
  const focused = useIsFocused();
  const navigation = useNavigation();
  const route = useRoute();
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue<number>(t.opacity.hidden);
  const translateX = useSharedValue<number>(t.space[0]);

  useLayoutEffect(() => {
    if (!focused) return;
    const index = navigation.getState()?.routes.findIndex((r) => r.key === route.key) ?? -1;
    const direction = tracker.advance(index);
    const from = tabSceneEnterFrom(reduceMotion, direction, t.space[6]);
    const spring = resolveSpring('standard', reduceMotion);
    if (!spring) {
      opacity.set(t.opacity.full);
      translateX.set(t.space[0]);
      return;
    }
    opacity.set(from.opacity);
    translateX.set(from.translateX);
    opacity.set(withTiming(t.opacity.full, { duration: t.motion.standard }));
    translateX.set(withSpring(t.space[0], spring));
  }, [focused, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateX: translateX.get() }],
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

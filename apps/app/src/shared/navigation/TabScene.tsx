import { useIsFocused } from 'expo-router';
import { useLayoutEffect, type ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { makeStyles, useReduceMotion, useTheme } from '@/shared/ui';

import { tabSceneEnterFrom, tabSceneOffset, type TabFocusTracker } from './navigationMotion';

/**
 * Mantém a tela montada (a troca de aba não apaga o estado local). Ao ganhar foco, a tela entra do lado da aba
 * escolhida (aba à direita vem da direita, à esquerda vem da esquerda), esmaecendo e crescendo de leve, com a
 * curva de entrada. A primeira aba exibida só esmaece e cresce de 0,94. Com "reduzir movimento", só esmaece em 160 ms.
 */
export function TabScene({ children, tracker, index }: { children: ReactNode; tracker?: TabFocusTracker; index?: number }) {
  const s = useStyles();
  const t = useTheme();
  const focused = useIsFocused();
  const reduceMotion = useReduceMotion();
  const { width } = useWindowDimensions();
  const opacity = useSharedValue<number>(t.opacity.hidden);
  const scale = useSharedValue<number>(t.pressScale.rest);
  const shift = useSharedValue<number>(t.space[0]);

  useLayoutEffect(() => {
    if (!focused) return;
    const direction = tracker && index !== undefined ? tracker.advance(index) : 0;
    const from = tabSceneEnterFrom(reduceMotion, direction);
    const [a, b, c, d] = t.easing.enter;
    const timing = { duration: reduceMotion ? t.motion.reduced : t.motion.tabSwitch, easing: Easing.bezier(a, b, c, d) };
    opacity.set(from.opacity);
    scale.set(from.scale);
    shift.set(tabSceneOffset(direction, reduceMotion, width, t.motion.tabSlideFraction));
    opacity.set(withTiming(t.opacity.full, timing));
    scale.set(withTiming(t.pressScale.rest, timing));
    shift.set(withTiming(t.space[0], timing));
  }, [focused, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateX: shift.get() }, { scale: scale.get() }],
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

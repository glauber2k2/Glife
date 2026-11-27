import { Children, type ReactNode } from 'react';
import { Platform } from 'react-native';
import Animated, { FadeIn, Keyframe } from 'react-native-reanimated';

import { useTheme } from './theme';
import { useReduceMotion } from './theme/ThemeProvider';

export interface RevealProps {
  children: ReactNode;
  /** atraso antes do primeiro item (ms), ex.: esperar a saída da etapa anterior */
  delay?: number;
}

/**
 * Sobe `offset` px enquanto aparece. Na web só esmaece: o Reanimated 4.7 não registra animações de
 * entrada personalizadas no navegador (Keyframe/withInitialValues) e o item ficaria invisível.
 */
export function riseIn(offset: number, duration: number, delay = 0) {
  if (Platform.OS === 'web') return FadeIn.duration(duration).delay(delay);
  return new Keyframe({
    0: { opacity: 0, transform: [{ translateY: offset }] },
    100: { opacity: 1, transform: [{ translateY: 0 }] },
  })
    .duration(duration)
    .delay(delay);
}

/**
 * Entrada em cascata: cada filho sobe 18 px e aparece, 70 ms depois (até o 6º) do anterior, na duração padrão.
 * Com "reduzir movimento" os filhos aparecem sem animação.
 */
export function Reveal({ children, delay = 0 }: RevealProps) {
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  return (
    <>
      {Children.toArray(children)
        .filter(Boolean)
        .map((child, index) => (
          <Animated.View
            // Filhos de Children.toArray já têm chave estável.
            key={(child as { key?: string }).key ?? index}
            entering={
              reduceMotion
                ? undefined
                : riseIn(t.motion.enterOffset, t.motion.standard, delay + Math.min(index, t.motion.staggerMax) * t.motion.stagger)
            }
          >
            {child}
          </Animated.View>
        ))}
    </>
  );
}

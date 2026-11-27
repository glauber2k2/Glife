// Toque nos gráficos: tocar ou arrastar escolhe a barra (ou o ponto) sob o dedo; a etiqueta some 2,5 s depois de
// soltar. Uma camada transparente por cima do gráfico recebe o toque, então `locationX` é sempre relativo a ela.
// Arrastar na vertical devolve o toque para a rolagem da tela.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { View, type GestureResponderEvent, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { makeStyles, useReduceMotion, useTheme } from '@/shared/ui';

const clamp01 = (v: number) => Math.max(0, Math.min(0.9999, v));

/** `pick` recebe a posição do dedo (0–1) e devolve o índice escolhido; `resetKey` mudou → apaga a etiqueta. */
export function useScrub(pick: (fx: number) => number | null, resetKey: string) {
  const t = useTheme();
  const [index, setIndex] = useState<number | null>(null);
  const width = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickRef = useRef(pick);
  useEffect(() => {
    pickRef.current = pick;
  }, [pick]);

  const stopTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stopTimer, []);
  const [lastKey, setLastKey] = useState(resetKey);
  if (lastKey !== resetKey) {
    setLastKey(resetKey);
    setIndex(null);
  }

  const update = (e: GestureResponderEvent) => {
    if (width.current <= 0) return;
    const i = pickRef.current(clamp01(e.nativeEvent.locationX / width.current));
    setIndex((prev) => (prev === i ? prev : i));
  };
  const release = () => {
    stopTimer();
    timer.current = setTimeout(() => setIndex(null), t.motion.scrubHide);
  };

  const layer = {
    onLayout: (e: LayoutChangeEvent) => {
      width.current = e.nativeEvent.layout.width;
    },
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => true,
    onResponderGrant: (e: GestureResponderEvent) => {
      stopTimer();
      update(e);
    },
    onResponderMove: update,
    onResponderRelease: release,
    onResponderTerminate: release,
  };
  return { index, layer };
}

/** Camada de toque que cobre o gráfico inteiro. */
export function ScrubLayer({ layer }: { layer: ReturnType<typeof useScrub>['layer'] }) {
  const s = useStyles();
  return <View style={s.layer} {...layer} />;
}

/**
 * Etiqueta do toque: só texto, sem caixa. Fica sobre o ponto `fx` (0–1) e se ajusta para não sair do gráfico
 * nas pontas: a esquerda vai a fx × (largura − largura da etiqueta).
 */
export function ScrubTag({ fx, width, top, children }: { fx: number; width: number; top: number; children: ReactNode }) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const [own, setOwn] = useState(0);
  const style: ViewStyle = { top, left: Math.max(0, fx * (width - own)), opacity: own > 0 ? 1 : 0 };
  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.duration(t.motion.tap)}
      pointerEvents="none"
      style={[s.tag, style]}
      onLayout={(e) => setOwn(e.nativeEvent.layout.width)}
    >
      {children}
    </Animated.View>
  );
}

/** Linha vertical de 1 px do toque. */
export function ScrubLine({ x, top, height }: { x: number; top: number; height: number }) {
  const s = useStyles();
  return <View pointerEvents="none" style={[s.line, { left: x, top, height: Math.max(0, height) }]} />;
}

const useStyles = makeStyles((t) => ({
  layer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  tag: { position: 'absolute', gap: t.space[0.5] },
  line: { position: 'absolute', width: t.hairline, backgroundColor: t.colors.textTertiary },
}));

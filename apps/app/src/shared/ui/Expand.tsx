// Linha que vira tela (protótipo "Glife Hoje", movimento "Nota → tela da nota"): a linha tocada vira um contêiner
// com o retângulo dela (raio 20, fio de 1 px) que se expande até a tela inteira (raio 0) na mola de ênfase; a tela
// de destino abre por baixo, sem animação própria, e aparece quando o contêiner esmaece (90 ms depois). Voltar faz o
// reverso até a posição atual da linha. Com "reduzir movimento", vira troca direta.
import { useFocusEffect } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';

import { resolveSpring } from './motion';
import { makeStyles, useTheme } from './theme';
import { useReduceMotion } from './theme/ThemeProvider';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ExpandHost {
  /** Cobre a partir de `from` até a tela inteira; `navigate` roda quando cobriu. */
  open(from: Rect, navigate: () => void): void;
  /** Da tela inteira até `to` (ou só esmaece, se a linha sumiu). */
  close(to: Rect | null): void;
  /** Guarda quem abriu (para saber quem faz o reverso ao voltar). */
  remember(owner: string, key: string): void;
  /** A linha que `owner` abriu, se foi ele o último; apaga o registro. */
  take(owner: string): string | null;
}

/** O que a linha precisa ter: medir a própria posição na janela. */
interface Measurable {
  measureInWindow(callback: (x: number, y: number, width: number, height: number) => void): void;
}

const ExpandContext = createContext<ExpandHost | null>(null);

/** Camada por cima da navegação onde o contêiner se expande. Vai na raiz, em volta do Stack. */
export function ExpandProvider({ children }: { children: ReactNode }) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const spring = resolveSpring('emphasis', reduceMotion);
  const size = useRef({ width: 0, height: 0 });
  const [visible, setVisible] = useState(false);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const w = useSharedValue(0);
  const h = useSharedValue(0);
  const edge = useSharedValue(1);
  const opacity = useSharedValue(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pending = useRef<{ owner: string; key: string } | null>(null);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clear, []);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

  const host = useMemo<ExpandHost>(() => {
    const place = (r: Rect, e: number) => {
      x.set(r.x);
      y.set(r.y);
      w.set(r.width);
      h.set(r.height);
      edge.set(e);
    };
    const go = (r: Rect, e: number) => {
      if (!spring) return place(r, e);
      x.set(withSpring(r.x, spring));
      y.set(withSpring(r.y, spring));
      w.set(withSpring(r.width, spring));
      h.set(withSpring(r.height, spring));
      edge.set(withSpring(e, spring));
    };
    const full = (): Rect => ({ x: 0, y: 0, ...size.current });
    return {
      remember(owner, key) {
        pending.current = { owner, key };
      },
      take(owner) {
        const p = pending.current;
        if (!p || p.owner !== owner) return null;
        pending.current = null;
        return p.key;
      },
      open(from, navigate) {
        clear();
        if (!spring) return navigate();
        place(from, 1);
        opacity.set(1);
        setVisible(true);
        // Dois quadros: o contêiner aparece no lugar da linha antes de crescer.
        requestAnimationFrame(() => requestAnimationFrame(() => go(full(), 0)));
        later(() => {
          navigate();
          opacity.set(withDelay(t.motion.stepDelay, withTiming(0, { duration: t.motion.standard })));
          later(() => setVisible(false), t.motion.stepDelay + t.motion.standard);
        }, t.motion.emphasis);
      },
      close(to) {
        clear();
        if (!spring) return;
        place(full(), 0);
        opacity.set(1);
        setVisible(true);
        requestAnimationFrame(() => {
          if (to) go(to, 1);
          opacity.set(withDelay(to ? t.motion.emphasis : 0, withTiming(0, { duration: t.motion.tap })));
        });
        later(() => setVisible(false), (to ? t.motion.emphasis : 0) + t.motion.tap);
      },
    };
  }, [spring, t.motion, x, y, w, h, edge, opacity]);

  const box = useAnimatedStyle(() => ({
    left: x.get(),
    top: y.get(),
    width: w.get(),
    height: h.get(),
    opacity: opacity.get(),
    borderRadius: edge.get() * t.radius.card,
    // cartão branco que vira a tela (fundo do app) ao crescer
    backgroundColor: interpolateColor(edge.get(), [0, 1], [t.colors.bg, t.colors.card]),
  }));

  return (
    <ExpandContext.Provider value={host}>
      <View
        style={s.root}
        onLayout={(e) => {
          size.current = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height };
        }}
      >
        {children}
        {visible && <Animated.View pointerEvents="none" style={[s.box, box]} />}
      </View>
    </ExpandContext.Provider>
  );
}

/**
 * Para uma lista cujas linhas abrem telas: `rowRef(key)` vai no `ref` da linha; `open(key, navigate)` expande a linha
 * e navega. Ao voltar a esta tela, o contêiner encolhe até a linha de onde saiu.
 */
export function useExpandRows() {
  const host = useContext(ExpandContext);
  const owner = useId();
  const rows = useRef(new Map<string, Measurable>());

  const rowRef = useCallback(
    (key: string) => (node: Measurable | null) => {
      if (node) rows.current.set(key, node);
      else rows.current.delete(key);
    },
    [],
  );

  const open = useCallback(
    (key: string, navigate: () => void) => {
      const node = rows.current.get(key);
      if (!host || !node) return navigate();
      node.measureInWindow((x, y, width, height) => {
        host.remember(owner, key);
        host.open({ x, y, width, height }, navigate);
      });
    },
    [host, owner],
  );

  useFocusEffect(
    useCallback(() => {
      const key = host?.take(owner);
      if (!host || !key) return;
      const node = rows.current.get(key);
      if (!node) return host.close(null);
      node.measureInWindow((x, y, width, height) => host.close(width > 0 ? { x, y, width, height } : null));
    }, [host, owner]),
  );

  return { rowRef, open, enabled: host !== null };
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1 },
  box: {
    position: 'absolute',
    backgroundColor: t.colors.card,
    overflow: 'hidden',
  },
}));

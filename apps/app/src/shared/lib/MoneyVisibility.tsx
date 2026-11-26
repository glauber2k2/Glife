import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { makeStyles, useReduceMotion, useTheme } from '../ui';
import type { MoneyVisibilityStore } from './moneyVisibilityStore';

interface MoneyVisibilityValue {
  hidden: boolean;
  toggle: () => void;
}

const MoneyVisibilityContext = createContext<MoneyVisibilityValue | null>(null);

interface MoneyVisibilityProviderProps {
  children: ReactNode;
  /** Onde lembrar a escolha. Sem store, vale só nesta sessão. */
  store?: MoneyVisibilityStore;
}

/** Ocultar/mostrar valores em dinheiro. Padrão: visível. A troca esmaece de leve (ou só esmaece, sem mover, com "reduzir movimento"). */
export function MoneyVisibilityProvider({ children, store }: MoneyVisibilityProviderProps) {
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const s = useStyles();
  const [hidden, setHidden] = useState(false);
  const chosenThisSession = useRef(false);
  const hiddenNow = useRef(false);
  const fade = useSharedValue<number>(t.opacity.full);

  useEffect(() => {
    let active = true;
    void store?.load().then((saved) => {
      // Não sobrescreve uma escolha feita antes de a leitura terminar.
      if (active && saved !== null && !chosenThisSession.current) {
        hiddenNow.current = saved;
        setHidden(saved);
      }
    });
    return () => {
      active = false;
    };
  }, [store]);

  const toggle = useCallback(() => {
    chosenThisSession.current = true;
    const next = !hiddenNow.current;
    hiddenNow.current = next;
    setHidden(next);
    void store?.save(next);
    fade.set(t.opacity.faint);
    fade.set(withTiming(t.opacity.full, { duration: reduceMotion ? t.motion.tap : t.motion.standard }));
  }, [store, fade, reduceMotion, t]);

  const value = useMemo(() => ({ hidden, toggle }), [hidden, toggle]);
  const style = useAnimatedStyle(() => ({ opacity: fade.get() }));
  return (
    <MoneyVisibilityContext.Provider value={value}>
      <Animated.View style={[s.fill, style]}>{children}</Animated.View>
    </MoneyVisibilityContext.Provider>
  );
}

/** `hidden` (valores ocultos) e `toggle` (o olhinho). Fora do provider, os valores aparecem. */
export function useMoneyVisibility(): MoneyVisibilityValue {
  return useContext(MoneyVisibilityContext) ?? { hidden: false, toggle: () => {} };
}

const useStyles = makeStyles(() => ({ fill: { flex: 1 } }));

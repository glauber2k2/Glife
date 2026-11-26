import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { makeStyles, useReduceMotion, useTheme } from '../ui';
import { resolveHidden, type MoneyVisibilityStore } from './moneyVisibilityStore';

interface MoneyVisibilityValue {
  hidden: boolean;
  toggle: () => void;
  /** opacidade animada (esmaece ao alternar); só `MoneyFade` a usa */
  fade: { get(): number };
}

const MoneyVisibilityContext = createContext<MoneyVisibilityValue | null>(null);

interface MoneyVisibilityProviderProps {
  children: ReactNode;
  /** Onde lembrar a escolha. Sem store, vale só nesta sessão (começa visível). */
  store?: MoneyVisibilityStore;
}

/** Ocultar/mostrar valores em dinheiro. Padrão: visível; com store, oculto até a escolha salva ser lida. */
export function MoneyVisibilityProvider({ children, store }: MoneyVisibilityProviderProps) {
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  // null = ainda lendo o armazenamento.
  const [choice, setChoice] = useState<boolean | null>(store ? null : false);
  const choiceNow = useRef<boolean | null>(choice);
  const chosenThisSession = useRef(false);
  const fade = useSharedValue<number>(t.opacity.full);

  useEffect(() => {
    let active = true;
    void store?.load().then((saved) => {
      // Não sobrescreve uma escolha feita antes de a leitura terminar.
      if (active && !chosenThisSession.current) {
        choiceNow.current = saved ?? false;
        setChoice(saved ?? false);
      }
    });
    return () => {
      active = false;
    };
  }, [store]);

  const toggle = useCallback(() => {
    chosenThisSession.current = true;
    const next = !resolveHidden(choiceNow.current);
    choiceNow.current = next;
    setChoice(next);
    void store?.save(next);
    fade.set(t.opacity.faint);
    fade.set(withTiming(t.opacity.full, { duration: reduceMotion ? t.motion.tap : t.motion.standard }));
  }, [store, fade, reduceMotion, t]);

  const hidden = resolveHidden(choice);
  const value = useMemo(() => ({ hidden, toggle, fade }), [hidden, toggle, fade]);
  return <MoneyVisibilityContext.Provider value={value}>{children}</MoneyVisibilityContext.Provider>;
}

/** `hidden` (valores ocultos) e `toggle` (o olhinho). Fora do provider, os valores aparecem. */
export function useMoneyVisibility(): Pick<MoneyVisibilityValue, 'hidden' | 'toggle'> {
  return useContext(MoneyVisibilityContext) ?? { hidden: false, toggle: () => {} };
}

/** Conteúdo com valores: esmaece de leve quando o olhinho alterna (só ele, não a tela toda). */
export function MoneyFade({ children }: { children: ReactNode }) {
  const s = useStyles();
  const ctx = useContext(MoneyVisibilityContext);
  const style = useAnimatedStyle(() => ({ opacity: ctx ? ctx.fade.get() : 1 }));
  if (!ctx) return <View style={s.body}>{children}</View>;
  return <Animated.View style={[s.body, style]}>{children}</Animated.View>;
}

const useStyles = makeStyles((t) => ({ body: { gap: t.layout.blockGap } }));

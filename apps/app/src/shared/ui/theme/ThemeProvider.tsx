import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, StyleSheet, useColorScheme, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

import {
  easing,
  field,
  hairlineWidth,
  icon,
  layout,
  motion,
  opacity,
  palettes,
  pressScale,
  radius,
  size,
  space,
  spring,
  touch,
  typeScale,
  type ColorScheme,
  type Palette,
} from './tokens';
import type { ThemePreference, ThemePreferenceStore } from './preferenceStore';

export type { ThemePreference };

export interface Theme {
  scheme: ColorScheme;
  colors: Palette;
  space: typeof space;
  radius: typeof radius;
  type: typeof typeScale;
  icon: typeof icon;
  touch: typeof touch;
  motion: typeof motion;
  easing: typeof easing;
  spring: typeof spring;
  pressScale: typeof pressScale;
  layout: typeof layout;
  opacity: typeof opacity;
  size: typeof size;
  field: typeof field;
  hairline: number;
}

interface ThemeContextValue {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  reduceMotion: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function buildTheme(scheme: ColorScheme): Theme {
  return {
    scheme,
    colors: palettes[scheme],
    space,
    radius,
    type: typeScale,
    icon,
    touch,
    motion,
    easing,
    spring,
    pressScale,
    layout,
    opacity,
    size,
    field,
    hairline: hairlineWidth,
  };
}

interface ThemeProviderProps {
  children: ReactNode;
  /** Onde lembrar a escolha do usuário. Sem store, a escolha vale só nesta sessão. */
  store?: ThemePreferenceStore;
}

export function ThemeProvider({ children, store }: ThemeProviderProps) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const chosenThisSession = useRef(false);
  // Até conhecer a preferência de acessibilidade, não inicia animações.
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    let active = true;
    let changed = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      changed = true;
      if (active) setReduceMotion(enabled);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active && !changed) setReduceMotion(enabled);
    }).catch(() => {
      // Se a plataforma não informar a preferência, mantém movimento reduzido.
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let active = true;
    void store?.load().then((saved) => {
      // Não sobrescreve uma escolha feita antes de a leitura terminar.
      if (active && saved && !chosenThisSession.current) setPreferenceState(saved);
    });
    return () => {
      active = false;
    };
  }, [store]);

  const setPreference = useCallback(
    (p: ThemePreference) => {
      chosenThisSession.current = true;
      setPreferenceState(p);
      void store?.save(p);
    },
    [store],
  );

  const scheme: ColorScheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo(
    () => ({ theme: buildTheme(scheme), preference, setPreference, reduceMotion }),
    [scheme, preference, setPreference, reduceMotion],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme precisa estar dentro de <ThemeProvider>');
  return ctx;
}

export function useTheme(): Theme {
  return useThemeContext().theme;
}

/** Acompanha alterações de acessibilidade também durante a sessão. */
export function useReduceMotion(): boolean {
  return useThemeContext().reduceMotion;
}

export function useThemePreference() {
  const { preference, setPreference } = useThemeContext();
  return { preference, setPreference };
}

/**
 * Cria um hook de estilos a partir do tema, garantindo que valores venham dos tokens:
 *   const useStyles = makeStyles((t) => ({ root: { padding: t.space[4] } }));
 */
type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

export function makeStyles<S extends NamedStyles>(factory: (t: Theme) => S & NamedStyles) {
  const cache = new Map<ColorScheme, Readonly<S>>();
  return function useStyles(): Readonly<S> {
    const theme = useTheme();
    let styles = cache.get(theme.scheme);
    if (!styles) {
      styles = StyleSheet.create(factory(theme));
      cache.set(theme.scheme, styles);
    }
    return styles;
  };
}

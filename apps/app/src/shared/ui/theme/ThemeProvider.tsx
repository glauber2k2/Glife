import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, useColorScheme, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

import {
  hairlineWidth,
  icon,
  layout,
  motion,
  opacity,
  palettes,
  radius,
  size,
  space,
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
  layout: typeof layout;
  opacity: typeof opacity;
  size: typeof size;
  hairline: number;
}

interface ThemeContextValue {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
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
    layout,
    opacity,
    size,
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
    () => ({ theme: buildTheme(scheme), preference, setPreference }),
    [scheme, preference, setPreference],
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

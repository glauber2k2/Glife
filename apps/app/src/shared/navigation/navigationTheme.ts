import { DarkTheme, DefaultTheme, type Theme as NavigationTheme } from 'expo-router';

import type { Theme } from '@/shared/ui';

/**
 * Traduz os tokens do design system para o tema do React Navigation.
 * Sem isso os contêineres das telas usam o fundo padrão (#F2F2F2), que
 * aparece como um clarão durante as transições no modo escuro.
 */
export function toNavigationTheme(t: Theme): NavigationTheme {
  const base = t.scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    dark: t.scheme === 'dark',
    colors: {
      ...base.colors,
      primary: t.colors.accent,
      background: t.colors.bg,
      card: t.colors.surface,
      text: t.colors.text,
      border: t.colors.hairline,
      notification: t.colors.danger,
    },
  };
}

import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

let open = false;

/** Abre a busca (uma só vez, mesmo com toques ou atalhos repetidos). */
export function openSearch() {
  if (!open) router.push('/busca');
}

/** A tela de busca avisa quando está aberta. */
export function useMarkSearchOpen() {
  useEffect(() => {
    open = true;
    return () => {
      open = false;
    };
  }, []);
}

/** Web: Ctrl+K (⌘K no Mac) abre a busca de qualquer tela. */
export function useSearchShortcut(enabled: boolean) {
  useEffect(() => {
    if (!enabled || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}

/** Web: Esc fecha a tela (o Android usa o voltar do sistema). */
export function useEscape(onEscape: () => void) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onEscape();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onEscape]);
}

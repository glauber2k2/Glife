import { useMemo } from 'react';

import type { TargetSource } from '@/features/links';

import { useNotesDataMaybe } from './NotesData';

/** Notas como alvo de vínculos e avisos ("item não encontrado" restaura pela lixeira das notas); null sem sessão. */
export function useNotesTargetSource(): TargetSource | null {
  const notes = useNotesDataMaybe()?.notes ?? null;
  return useMemo(() => {
    if (!notes) return null;
    return {
      type: 'note',
      table: 'notes',
      noun: 'Esta nota',
      routePrefix: '/nota/',
      href: async (id) => `/nota/${id}`,
      restore: async (id) => void (await notes.restore(id)),
      trashHref: '/lixeira',
    };
  }, [notes]);
}

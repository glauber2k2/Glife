import { useMemo } from 'react';

import type { NoteLinkerPort } from '@/features/links';

import { useNotesDataMaybe } from './NotesData';

const RESULTS = 20;

/** Notas para os campos "Notas vinculadas" de outros módulos (buscar, criar e nomear); null sem sessão. */
export function useNotesLinkerPort(): NoteLinkerPort | null {
  const notes = useNotesDataMaybe()?.notes ?? null;
  return useMemo(() => {
    if (!notes) return null;
    return {
      search: async (query) => {
        const page = await notes.list(query ? { search: query } : {}, { limit: RESULTS });
        return page.items.map((n) => ({ id: n.id, title: n.title }));
      },
      create: async (title) => {
        const n = await notes.create({ title, body_md: '' });
        return { id: n.id, title: n.title };
      },
      title: async (id) => (await notes.get(id))?.title ?? null,
    };
  }, [notes]);
}

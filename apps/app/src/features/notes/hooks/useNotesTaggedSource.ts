import type { TaggedItemSource } from '@glife/domain/tags';
import { useMemo } from 'react';

import { noteExcerpt } from '../components/excerpt';
import { useNotesDataMaybe } from './NotesData';

/** Como as notas aparecem na tela de uma tag; null sem sessão. */
export function useNotesTaggedSource(): TaggedItemSource | null {
  const data = useNotesDataMaybe();
  return useMemo(() => {
    if (!data) return null;
    const { notes } = data;
    return {
      type: 'note',
      label: 'Notas',
      async resolve(ids) {
        const found = await Promise.all(ids.map((id) => notes.get(id)));
        return found
          .filter((n) => n !== null)
          .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
          .map((n) => ({ id: n.id, title: n.title || 'Sem título', meta: noteExcerpt(n.body_md) || undefined, href: `/nota/${n.id}` }));
      },
    };
  }, [data]);
}

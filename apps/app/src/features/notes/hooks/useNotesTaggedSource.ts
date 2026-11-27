import { StickyNote } from 'lucide-react-native';
import { useMemo } from 'react';

import type { TaggedItemUiSource } from '@/features/links';

import { noteExcerpt } from '../components/excerpt';
import { useNotesDataMaybe } from './NotesData';

/** Como as notas aparecem na tela de uma tag; null sem sessão. */
export function useNotesTaggedSource(): TaggedItemUiSource | null {
  const data = useNotesDataMaybe();
  return useMemo(() => {
    if (!data) return null;
    const { notes } = data;
    const live = async (ids: readonly string[]) => (await Promise.all(ids.map((id) => notes.get(id)))).filter((n) => n !== null);
    return {
      type: 'note',
      label: 'Notas',
      icon: StickyNote,
      module: 'notes',
      // A consulta observada relê a cada escrita na tabela de notas (inclusive ir para a lixeira ou excluir).
      watchChanges: (onChange) => notes.watch({ limit: 1 }, () => onChange()),
      async alive(ids) {
        return (await live(ids)).map((n) => n.id);
      },
      async resolve(ids) {
        return (await live(ids))
          .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
          .map((n) => ({ id: n.id, title: n.title || 'Sem título', meta: noteExcerpt(n.body_md) || undefined, href: `/nota/${n.id}` }));
      },
    };
  }, [data]);
}

import type { Note, NoteListQuery } from '@glife/domain/notes';
import { useEffect, useState } from 'react';

import { useNotesData } from './NotesData';

/** Lista observada: atualiza sozinha quando o banco local muda (inclusive pela sincronização). */
export function useNoteList(query: NoteListQuery) {
  const { notes } = useNotesData();
  const [items, setItems] = useState<Note[] | null>(null);
  const [failed, setFailed] = useState(false);
  const { folderId, kind, pinned, search, limit } = query;

  useEffect(() => {
    return notes.watch(
      { folderId, kind, pinned, search: search || undefined, limit },
      (rows) => {
        setItems(rows);
        setFailed(false);
      },
      () => setFailed(true),
    );
  }, [notes, folderId, kind, pinned, search, limit]);

  return { items, failed };
}

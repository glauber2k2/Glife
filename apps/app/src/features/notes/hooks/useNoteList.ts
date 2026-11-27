import type { Note, NoteListQuery } from '@glife/domain/notes';
import { useEffect, useState } from 'react';

import { useNotesData } from './NotesData';

/** Lista observada: atualiza sozinha quando o banco local muda (inclusive pela sincronização). */
export function useNoteList(query: NoteListQuery) {
  const { notes } = useNotesData();
  const [items, setItems] = useState<Note[] | null>(null);
  const [failed, setFailed] = useState(false);
  const { folderId, pinned, search, limit } = query;

  useEffect(() => {
    return notes.watch(
      { folderId, pinned, search: search || undefined, limit },
      (rows) => {
        setItems(rows);
        setFailed(false);
      },
      () => setFailed(true),
    );
  }, [notes, folderId, pinned, search, limit]);

  return { items, failed };
}

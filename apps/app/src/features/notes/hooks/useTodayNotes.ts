import type { Note } from '@glife/domain/notes';
import { useMemo } from 'react';

import { pickTodayNotes } from '../components/todayNotes';
import { useNoteList } from './useNoteList';

export const TODAY_NOTES_LIMIT = 5;

/** Notas do bloco da tela Hoje (fixadas + recentes), observadas; null enquanto carrega. */
export function useTodayNotes(): Note[] | null {
  const pinned = useNoteList({ pinned: true, limit: TODAY_NOTES_LIMIT });
  const recent = useNoteList({ limit: TODAY_NOTES_LIMIT + 2 });
  return useMemo(
    () => (pinned.items && recent.items ? pickTodayNotes(pinned.items, recent.items, TODAY_NOTES_LIMIT) : null),
    [pinned.items, recent.items],
  );
}

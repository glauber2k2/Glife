import type { LocalDb } from '@glife/domain/core';
import type { NoteFoldersRepository, NotesRepository } from '@glife/domain/notes';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { createLocalNoteFoldersRepository, createLocalNotesRepository } from '../data/localNotesRepository';

interface NotesData {
  notes: NotesRepository;
  folders: NoteFoldersRepository;
}

const NotesDataContext = createContext<NotesData | null>(null);

/** Composto na raiz: o banco local e o dono da sessão. Sem sessão, não há repositório. */
export function NotesProvider({ db, userId, children }: { db: LocalDb; userId: string | null; children: ReactNode }) {
  const value = useMemo(
    () =>
      userId
        ? { notes: createLocalNotesRepository(db, userId), folders: createLocalNoteFoldersRepository(db, userId) }
        : null,
    [db, userId],
  );
  return <NotesDataContext.Provider value={value}>{children}</NotesDataContext.Provider>;
}

export function useNotesData(): NotesData {
  const ctx = useContext(NotesDataContext);
  if (!ctx) throw new Error('useNotesData precisa de <NotesProvider> com sessão ativa');
  return ctx;
}

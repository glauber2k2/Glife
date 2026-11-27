import type { LocalDb } from '@glife/domain/core';
import { trashCutoff, type NoteFoldersRepository, type NotesRepository } from '@glife/domain/notes';
import type { SearchSource } from '@glife/domain/search';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';

import { createLocalNoteFoldersRepository, createLocalNotesRepository } from '../data/localNotesRepository';
import { createFoldersSearchSource, createNotesSearchSource } from '../data/notesSearch';

interface NotesData {
  notes: NotesRepository;
  folders: NoteFoldersRepository;
  /** fontes da busca universal (notas e pastas) */
  search: SearchSource[];
}

const NotesDataContext = createContext<NotesData | null>(null);
const NO_SOURCES: SearchSource[] = [];

/** Composto na raiz: o banco local e o dono da sessão. Sem sessão, não há repositório. */
export function NotesProvider({ db, userId, children }: { db: LocalDb; userId: string | null; children: ReactNode }) {
  const value = useMemo(() => {
    if (!userId) return null;
    const notes = createLocalNotesRepository(db, userId);
    const folders = createLocalNoteFoldersRepository(db, userId);
    return { notes, folders, search: [createNotesSearchSource(db, notes), createFoldersSearchSource(folders)] };
  }, [db, userId]);
  // Ao iniciar a sessão: o que está na lixeira há mais de 30 dias é apagado de vez (o DELETE sincroniza).
  useEffect(() => {
    if (value) void value.notes.purgeTrash(trashCutoff()).catch((e) => console.warn('Falha ao limpar a lixeira', e));
  }, [value]);
  return <NotesDataContext.Provider value={value}>{children}</NotesDataContext.Provider>;
}

export function useNotesData(): NotesData {
  const ctx = useContext(NotesDataContext);
  if (!ctx) throw new Error('useNotesData precisa de <NotesProvider> com sessão ativa');
  return ctx;
}

/** Fontes de busca de notas e pastas; vazio sem sessão. */
export function useNotesSearchSources(): SearchSource[] {
  return useContext(NotesDataContext)?.search ?? NO_SOURCES;
}

/** Como `useNotesData`, mas null sem sessão (para o que a raiz compõe). */
export function useNotesDataMaybe(): NotesData | null {
  return useContext(NotesDataContext);
}

import type { LocalDb } from '@glife/domain/core';
import type { LinksRepository } from '@glife/domain/links';
import type { TagsRepository } from '@glife/domain/tags';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { createLocalLinksRepository } from '../data/localLinksRepository';
import { createLocalTagsRepository } from '../data/localTagsRepository';

interface LinksData {
  links: LinksRepository;
  tags: TagsRepository;
}

const LinksDataContext = createContext<LinksData | null>(null);

/** Vínculos e tags sobre o banco local; composto na raiz com o dono da sessão. */
export function LinksProvider({ db, userId, children }: { db: LocalDb; userId: string | null; children: ReactNode }) {
  const value = useMemo(
    () => (userId ? { links: createLocalLinksRepository(db, userId), tags: createLocalTagsRepository(db, userId) } : null),
    [db, userId],
  );
  return <LinksDataContext.Provider value={value}>{children}</LinksDataContext.Provider>;
}

export function useLinksData(): LinksData {
  const ctx = useContext(LinksDataContext);
  if (!ctx) throw new Error('useLinksData precisa de <LinksProvider> com sessão ativa');
  return ctx;
}

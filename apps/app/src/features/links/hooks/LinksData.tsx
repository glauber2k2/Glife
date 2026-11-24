import type { LocalDb } from '@glife/domain/core';
import type { LinksRepository } from '@glife/domain/links';
import type { SearchSource } from '@glife/domain/search';
import type { TagsRepository } from '@glife/domain/tags';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { createLocalLinksRepository } from '../data/localLinksRepository';
import { createLocalTagsRepository } from '../data/localTagsRepository';
import { createTagsSearchSource } from '../data/tagsSearch';

interface LinksData {
  links: LinksRepository;
  tags: TagsRepository;
  /** fontes da busca universal (tags) */
  search: SearchSource[];
}

const LinksDataContext = createContext<LinksData | null>(null);
const NO_SOURCES: SearchSource[] = [];

/** Vínculos e tags sobre o banco local; composto na raiz com o dono da sessão. */
export function LinksProvider({ db, userId, children }: { db: LocalDb; userId: string | null; children: ReactNode }) {
  const value = useMemo(() => {
    if (!userId) return null;
    const tags = createLocalTagsRepository(db, userId);
    return { links: createLocalLinksRepository(db, userId), tags, search: [createTagsSearchSource(tags)] };
  }, [db, userId]);
  return <LinksDataContext.Provider value={value}>{children}</LinksDataContext.Provider>;
}

export function useLinksData(): LinksData {
  const ctx = useContext(LinksDataContext);
  if (!ctx) throw new Error('useLinksData precisa de <LinksProvider> com sessão ativa');
  return ctx;
}

/** Fontes de busca de tags; vazio sem sessão. */
export function useLinksSearchSources(): SearchSource[] {
  return useContext(LinksDataContext)?.search ?? NO_SOURCES;
}

import type { SearchAction, SearchSource } from '@glife/domain/search';
import { createContext, useContext, type ReactNode } from 'react';

interface SearchConfig {
  sources: SearchSource[];
  actions: SearchAction[];
}

const SearchContext = createContext<SearchConfig>({ sources: [], actions: [] });

/**
 * Composto na raiz: cada feature entrega as suas fontes e a raiz define as ações (rotas do app).
 * A busca não conhece as outras features.
 */
export function SearchProvider({ sources, actions, children }: SearchConfig & { children: ReactNode }) {
  return <SearchContext.Provider value={{ sources, actions }}>{children}</SearchContext.Provider>;
}

export const useSearchConfig = () => useContext(SearchContext);

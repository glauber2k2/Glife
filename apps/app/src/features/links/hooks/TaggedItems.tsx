import type { TaggedItemSource } from '@glife/domain/tags';
import { createContext, useContext, type ReactNode } from 'react';

const TaggedItemsContext = createContext<readonly TaggedItemSource[]>([]);

/**
 * Registro aberto de "itens com tag": cada módulo entrega como mostrar os seus (composto na raiz, como a busca).
 * A tela de uma tag lê daqui, sem conhecer os outros módulos.
 */
export function TaggedItemsProvider({ sources, children }: { sources: readonly TaggedItemSource[]; children: ReactNode }) {
  return <TaggedItemsContext.Provider value={sources}>{children}</TaggedItemsContext.Provider>;
}

export function useTaggedItemSources(): readonly TaggedItemSource[] {
  return useContext(TaggedItemsContext);
}

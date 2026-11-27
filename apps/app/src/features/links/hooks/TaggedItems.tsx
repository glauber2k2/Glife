import type { EntityType } from '@glife/domain/core';
import type { TaggedItemSource, TagWithCounts, TagsRepository } from '@glife/domain/tags';
import type { LucideIcon } from 'lucide-react-native';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import type { ModuleKey } from '@/shared/ui';

/** Fonte de itens com tag, com o que a tela precisa para desenhar a linha (ícone e cor do módulo). */
export interface TaggedItemUiSource extends TaggedItemSource {
  icon: LucideIcon;
  module: ModuleKey;
  /** Avisa quando os itens do módulo mudam (título, lixeira, exclusão), para quem os mostra reler na hora. */
  watchChanges?(onChange: () => void): () => void;
}

const TaggedItemsContext = createContext<readonly TaggedItemUiSource[]>([]);

/**
 * Registro aberto de "itens com tag": cada módulo entrega como mostrar os seus (composto na raiz, como a busca).
 * A tela de uma tag lê daqui, sem conhecer os outros módulos.
 */
export function TaggedItemsProvider({ sources, children }: { sources: readonly TaggedItemUiSource[]; children: ReactNode }) {
  return <TaggedItemsContext.Provider value={sources}>{children}</TaggedItemsContext.Provider>;
}

export function useTaggedItemSources(): readonly TaggedItemUiSource[] {
  return useContext(TaggedItemsContext);
}

/** Número que sobe a cada mudança nos itens de qualquer fonte: use como dependência para reler títulos e vivos. */
export function useTaggedItemsVersion(): number {
  const sources = useTaggedItemSources();
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    const offs = sources.map((src) => src.watchChanges?.(bump));
    return () => offs.forEach((off) => off?.());
  }, [sources]);
  return version;
}

/**
 * Contagens só com itens vivos: para cada tipo com fonte registrada, descarta o que foi para a lixeira ou sumiu.
 * Tipos sem fonte mantêm a contagem dos vínculos.
 */
export async function liveTagCounts(
  rows: readonly TagWithCounts[],
  tags: Pick<TagsRepository, 'entitiesWithTag'>,
  sources: readonly Pick<TaggedItemSource, 'type' | 'alive'>[],
): Promise<TagWithCounts[]> {
  const byType = new Map(sources.map((s) => [s.type, s]));
  return Promise.all(
    rows.map(async (row) => {
      const counts: Partial<Record<EntityType, number>> = {};
      for (const [type, n] of Object.entries(row.counts) as [EntityType, number][]) {
        const source = byType.get(type);
        const live = source ? (await source.alive(await tags.entitiesWithTag(row.tag.id, type))).length : n;
        if (live > 0) counts[type] = live;
      }
      return { tag: row.tag, counts };
    }),
  );
}

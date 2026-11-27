// Itens ligados a um capítulo (notas que citam o capítulo, um trecho ou um versículo), ao vivo, já com o título
// de cada item pela fonte do módulo dono (registro de "itens com tag" do links). Item na lixeira não aparece.
import type { Link } from '@glife/domain/links';
import type { TaggedItem } from '@glife/domain/tags';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useLinksDataMaybe, useTaggedItemSources, useTaggedItemsVersion } from '@/features/links';

import { linksByVerse, type ChapterLinks } from '../components/chapterLinks';

export interface LinkedItem extends TaggedItem {
  /** vínculos deste item no capítulo (para saber quais versículos ele cita) */
  links: Link[];
}

export function useChapterLinks(book: string, chapter: number, verseCount: number) {
  const links = useLinksDataMaybe()?.links ?? null;
  const sources = useTaggedItemSources();
  const [rows, setRows] = useState<Link[]>([]);
  const [items, setItems] = useState<Map<string, TaggedItem>>(new Map());
  const [focus, setFocus] = useState(0);
  // Nota excluída ou renomeada em qualquer lugar some/atualiza aqui na hora, sem esperar o foco.
  const changes = useTaggedItemsVersion();

  useEffect(() => (links ? links.watchBibleBook(book, setRows) : undefined), [links, book]);
  // Voltar de uma nota (que pode ter ido para a lixeira) relê os títulos e quem continua vivo.
  useFocusEffect(useCallback(() => setFocus((f) => f + 1), []));

  const grouped: ChapterLinks = useMemo(() => linksByVerse(rows, book, chapter, verseCount), [rows, book, chapter, verseCount]);

  useEffect(() => {
    let active = true;
    const bySource = new Map<string, string[]>();
    for (const l of rows) {
      if (!grouped.sourceIds.includes(l.source_id)) continue;
      bySource.set(l.source_type, [...new Set([...(bySource.get(l.source_type) ?? []), l.source_id])]);
    }
    void Promise.all(
      [...bySource].map(async ([type, ids]) => {
        const source = sources.find((s) => s.type === type);
        return source ? source.resolve(ids).catch(() => []) : [];
      }),
    ).then((lists) => {
      if (active) setItems(new Map(lists.flat().map((i) => [i.id, i])));
    });
    return () => {
      active = false;
    };
  }, [rows, grouped, sources, focus, changes]);

  return useMemo(() => {
    const alive = (l: Link) => items.has(l.source_id);
    const byVerse = new Map<number, LinkedItem[]>();
    for (const [v, ls] of grouped.byVerse) {
      const list = toItems(ls.filter(alive), items);
      if (list.length) byVerse.set(v, list);
    }
    const all = toItems(rows.filter((l) => grouped.sourceIds.includes(l.source_id) && alive(l)), items);
    return { byVerse, chapter: toItems(grouped.chapter.filter(alive), items), all };
  }, [grouped, items, rows]);
}

function toItems(links: readonly Link[], items: Map<string, TaggedItem>): LinkedItem[] {
  const out = new Map<string, LinkedItem>();
  for (const l of links) {
    const item = items.get(l.source_id);
    if (!item) continue;
    const cur = out.get(item.id);
    if (cur) cur.links.push(l);
    else out.set(item.id, { ...item, links: [l] });
  }
  return [...out.values()];
}

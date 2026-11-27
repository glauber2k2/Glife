// Registros da Bíblia ao vivo: grifos/sublinhados (camada do usuário) e itens ligados a versículos pelo `links`
// (notas do menu Anotar ou com [[Sl 23:4]] no texto). Data da anotação = o vínculo mais recente daquele item.
import { buildRecords, type BibleRecord, type LinkedNote } from '@glife/domain/bible';
import type { Link } from '@glife/domain/links';
import type { TaggedItem } from '@glife/domain/tags';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useLinksDataMaybe, useTaggedItemSources, useTaggedItemsVersion } from '@/features/links';

import { useHighlightsMaybe } from './BibleData';

export type RecordFilter = 'all' | 'note' | 'highlight' | 'underline';

export function useBibleRecords(filter: RecordFilter, limit?: number): { records: BibleRecord[]; counts: Record<RecordFilter, number>; loading: boolean } {
  const highlights = useHighlightsMaybe();
  const links = useLinksDataMaybe()?.links ?? null;
  const sources = useTaggedItemSources();
  const [rows, setRows] = useState<Link[] | null>(null);
  const [items, setItems] = useState<Map<string, TaggedItem>>(new Map());
  const [focus, setFocus] = useState(0);
  // Nota excluída ou renomeada em qualquer lugar some/atualiza aqui na hora, sem esperar o foco.
  const changes = useTaggedItemsVersion();

  useEffect(() => (links ? links.watchBibleAll(setRows) : undefined), [links]);
  // voltar de uma nota (que pode ter ido para a lixeira) relê os títulos
  useFocusEffect(useCallback(() => setFocus((f) => f + 1), []));

  useEffect(() => {
    let active = true;
    const bySource = new Map<string, Set<string>>();
    for (const l of rows ?? []) bySource.set(l.source_type, (bySource.get(l.source_type) ?? new Set()).add(l.source_id));
    void Promise.all(
      [...bySource].map(async ([type, ids]) => {
        const source = sources.find((s) => s.type === type);
        return source ? source.resolve([...ids]).catch(() => []) : [];
      }),
    ).then((lists) => active && setItems(new Map(lists.flat().map((i) => [i.id, i]))));
    return () => {
      active = false;
    };
  }, [rows, sources, focus, changes]);

  return useMemo(() => {
    const notes = new Map<string, LinkedNote & { refs: string[] }>();
    for (const l of rows ?? []) {
      const item = items.get(l.source_id);
      if (!item) continue;
      const cur = notes.get(item.id);
      if (cur) cur.refs.push(l.target_ref);
      else notes.set(item.id, { id: item.id, title: item.title, href: item.href, updatedAt: l.created_at, refs: [l.target_ref] });
    }
    const all = buildRecords(highlights?.data ?? [], [...notes.values()]);
    const counts = { all: all.length, note: 0, highlight: 0, underline: 0 } as Record<RecordFilter, number>;
    for (const r of all) counts[r.kind]++;
    const list = all.filter((r) => filter === 'all' || r.kind === filter);
    return { records: limit ? list.slice(0, limit) : list, counts, loading: rows === null || !highlights };
  }, [rows, items, highlights, filter, limit]);
}

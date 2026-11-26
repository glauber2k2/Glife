import type { EntityType } from '@glife/domain/core';
import type { Tag, TaggedItem } from '@glife/domain/tags';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Hash, ReceiptText, StickyNote, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView } from 'react-native';

import { useLinksData, useTaggedItemSources } from '@/features/links';
import { Alert, Chip, EmptyState, ListGroup, NavRow, Reveal, Screen, Section, makeStyles } from '@/shared/ui';

import { SubHeader } from '../components/SubHeader';
import { useFocusData } from '../hooks/useFocusData';

interface Group {
  type: EntityType;
  label: string;
  items: TaggedItem[];
}

const ICONS: Partial<Record<EntityType, LucideIcon>> = { note: StickyNote, tx: ReceiptText };

/** Tudo o que tem a tag, de todos os módulos, agrupado por tipo (cada módulo entrega os seus pelo registro de links). */
export function TagScreen() {
  const s = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tags } = useLinksData();
  const sources = useTaggedItemSources();
  const [filter, setFilter] = useState<EntityType | 'all'>('all');
  const { data } = useFocusData(async (): Promise<{ tag: Tag | null; groups: Group[]; failed?: boolean }> => {
    try {
      const tag = (await tags.list()).find((x) => x.id === id) ?? null;
      if (!tag) return { tag: null, groups: [] };
      const groups = await Promise.all(
        sources.map(async (src) => ({ type: src.type, label: src.label, items: await src.resolve(await tags.entitiesWithTag(tag.id, src.type)) })),
      );
      return { tag, groups: groups.filter((g) => g.items.length > 0) };
    } catch (e) {
      console.warn('Falha ao ler a tag', e);
      return { tag: null, groups: [], failed: true };
    }
  });

  const total = data?.groups.reduce((n, g) => n + g.items.length, 0) ?? 0;
  const shown = data?.groups.filter((g) => filter === 'all' || g.type === filter) ?? [];

  return (
    <Screen
      header={
        <SubHeader
          title={data?.tag ? `#${data.tag.name}` : 'Tag'}
          text={data?.tag ? (total === 1 ? '1 item' : `${total} itens`) : undefined}
        />
      }
    >
      {data === null ? null : data.failed ? (
        <Alert tone="danger">Não foi possível ler esta tag.</Alert>
      ) : !data.tag ? (
        <EmptyState title="Tag não encontrada" message="Ela pode ter sido excluída ou juntada com outra." />
      ) : data.groups.length === 0 ? (
        <EmptyState compact message="Nenhum item com esta tag agora." />
      ) : (
        <Reveal>
          {data.groups.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.bleed} contentContainerStyle={s.chips}>
              <Chip size="sm" label="Tudo" selected={filter === 'all'} onPress={() => setFilter('all')} />
              {data.groups.map((g) => (
                <Chip key={g.type} size="sm" label={g.label} selected={filter === g.type} onPress={() => setFilter(g.type)} />
              ))}
            </ScrollView>
          )}
          {shown.map((g) => (
            <Section key={g.type} title={g.label}>
              <ListGroup>
                {g.items.map((item) => (
                  <NavRow
                    key={item.id}
                    icon={ICONS[g.type] ?? Hash}
                    module={g.type === 'tx' ? 'finance' : 'notes'}
                    iconSize="md"
                    label={item.title}
                    meta={item.meta}
                    onPress={() => router.push(item.href as Href)}
                  />
                ))}
              </ListGroup>
            </Section>
          ))}
        </Reveal>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  bleed: { marginHorizontal: -t.layout.gutter },
  chips: { gap: t.space[2], paddingHorizontal: t.layout.gutter },
}));

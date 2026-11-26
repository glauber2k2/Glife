import { describeTagCounts, tagKey, tagTotal, type TagWithCounts } from '@glife/domain/tags';
import { router } from 'expo-router';
import { Ellipsis, Hash } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import Animated, { Easing, FadeOut, LinearTransition } from 'react-native-reanimated';

import { liveTagCounts, useLinksData, useTaggedItemSources } from '@/features/links';
import { Alert, EmptyState, IconButton, ListGroup, ListItem, Reveal, Screen, SearchField, Text, makeStyles, useReduceMotion, useTheme } from '@/shared/ui';

import { NewTagSheet } from '../components/NewTagSheet';
import { SubHeader } from '../components/SubHeader';
import { TagActionsSheet } from '../components/TagActionsSheet';
import { TAG_UNITS } from '../components/tagUnits';
import { useFocusData } from '../hooks/useFocusData';

/** Tags de tudo (notas, gastos…): contagem por tipo, filtro e a folha de renomear, juntar e excluir. */
export function TagsScreen() {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const { tags } = useLinksData();
  const sources = useTaggedItemSources();
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState<TagWithCounts | null>(null);
  const { data, reload } = useFocusData(async () => {
    try {
      // Contagens só com itens vivos (fora da lixeira), para baterem com a tela da tag.
      return { rows: await liveTagCounts(await tags.listWithCounts(), tags, sources), failed: false };
    } catch (e) {
      console.warn('Falha ao ler as tags', e);
      return { rows: [] as TagWithCounts[], failed: true };
    }
  });

  // Juntar: a linha absorvida recolhe (sai esmaecendo) e as de baixo sobem com a mola suave.
  const layout = useMemo(() => {
    if (reduceMotion) return undefined;
    return Platform.OS === 'web'
      ? LinearTransition.duration(t.spring.gentle.duration).easing(Easing.out(Easing.cubic))
      : LinearTransition.springify(t.spring.gentle.duration).dampingRatio(t.spring.gentle.dampingRatio);
  }, [reduceMotion, t]);

  const rows = data?.rows ?? [];
  const query = tagKey(filter.trim().replace(/^#+/, ''));
  const visible = query ? rows.filter((r) => tagKey(r.tag.name).includes(query)) : rows;

  return (
    <Screen header={<SubHeader title="Tags" plusLabel="Nova tag" onPlus={() => setCreating(true)} />}>
      {data === null ? null : data.failed ? (
        <Alert tone="danger">Não foi possível ler as tags deste aparelho.</Alert>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nenhuma tag ainda"
          message="Tags valem para qualquer coisa: notas, gastos e, depois, eventos e fotos. Crie uma aqui ou aplique no editor da nota."
          actionLabel="Nova tag"
          onAction={() => setCreating(true)}
        />
      ) : (
        <Reveal>
          <SearchField value={filter} onChangeText={setFilter} placeholder="Filtrar tags" />
          {visible.length === 0 ? (
            <EmptyState compact message="Nenhuma tag com esse nome." />
          ) : (
            <ListGroup>
              {visible.map((r) => (
                <Animated.View key={r.tag.id} layout={layout} exiting={reduceMotion ? undefined : FadeOut.duration(t.motion.tap)}>
                  <ListItem
                    icon={Hash}
                    module="notes"
                    title={`#${r.tag.name}`}
                    subtitle={describeTagCounts(r.counts, TAG_UNITS) || 'Sem itens'}
                    onPress={() => router.push({ pathname: '/tags/[id]', params: { id: r.tag.id } })}
                    onLongPress={() => setOpen(r)}
                    trailing={
                      <View style={s.end}>
                        <Text variant="small" tone="secondary" numeric>
                          {String(tagTotal(r.counts))}
                        </Text>
                        <IconButton icon={Ellipsis} label={`Opções da tag ${r.tag.name}`} variant="ghost" size={t.size.iconButtonSmall} onPress={() => setOpen(r)} />
                      </View>
                    }
                  />
                </Animated.View>
              ))}
            </ListGroup>
          )}
        </Reveal>
      )}
      <TagActionsSheet row={open} all={rows} onClose={() => setOpen(null)} onChanged={reload} />
      <NewTagSheet visible={creating} onClose={() => setCreating(false)} onCreated={reload} />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  end: { flexDirection: 'row', alignItems: 'center', gap: t.space[1] },
}));

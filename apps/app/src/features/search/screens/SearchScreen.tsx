import { snippetParts, type SearchGroup, type SearchHit } from '@glife/domain/search';
import { router, type Href } from 'expo-router';
import { FileText, Folder, Hash, Zap, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import {
  Button,
  ListGroup,
  ListItem,
  Mascot,
  Reveal,
  Screen,
  SearchField,
  Section,
  Text,
  makeStyles,
  useTheme,
  type ModuleKey,
} from '@/shared/ui';

import { useSearchResults } from '../hooks/useSearchResults';
import { useEscape, useMarkSearchOpen } from '../hooks/useSearchShortcut';

const GROUP: Record<SearchGroup, { title: string; icon: LucideIcon; module?: ModuleKey }> = {
  actions: { title: 'Ações', icon: Zap },
  notes: { title: 'Notas', icon: FileText, module: 'notes' },
  folders: { title: 'Pastas', icon: Folder, module: 'notes' },
  tags: { title: 'Tags', icon: Hash, module: 'annotations' },
};

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** Fecha a busca e abre o item (voltar retorna para onde se estava antes de buscar). */
function openHit(hit: SearchHit) {
  close();
  router.push(hit.href as Href);
}

function Snippet({ text }: { text: string }) {
  const s = useStyles();
  return (
    <>
      {snippetParts(text).map((p, i) =>
        p.mark ? (
          <Text key={i} variant="caption" tone="tonal" style={s.mark}>
            {p.text}
          </Text>
        ) : (
          p.text
        ),
      )}
    </>
  );
}

/** Busca universal (Cobalto): campo em pílula com "Cancelar"; grupos em listas agrupadas. Enter abre o primeiro. */
export function SearchScreen() {
  const s = useStyles();
  const t = useTheme();
  const [query, setQuery] = useState('');
  const sections = useSearchResults(query);
  useMarkSearchOpen();
  useEscape(close);

  const first = sections?.[0]?.hits[0];
  const empty = sections !== null && sections.length === 0;

  return (
    <Screen gap={t.space[5]}>
      <View style={s.bar}>
        <View style={s.grow}>
          <SearchField value={query} onChangeText={setQuery} placeholder="Buscar ou fazer algo" autoFocus onSubmit={() => first && openHit(first)} />
        </View>
        <Button label="Cancelar" variant="ghost" size="sm" selfAlign="center" onPress={close} />
      </View>
      {empty ? (
        <View style={s.nothing}>
          <Mascot size={t.size.moduleIconLarge} eyes={t.colors.bg} mood="pensando" />
          <Text variant="heading" align="center">{`Nada com “${query.trim()}”`}</Text>
          <Text variant="small" tone="tertiary" align="center" style={s.nothingText}>
            Procurei em notas, pastas, tags e ações.
          </Text>
        </View>
      ) : (
        <Reveal>
          {sections?.map((section) => (
            <Section key={section.group} title={query.trim() || section.group !== 'notes' ? GROUP[section.group].title : 'Recentes'}>
              <ListGroup>
                {section.hits.map((hit) => (
                  <ListItem
                    key={hit.id}
                    icon={GROUP[hit.group].icon}
                    module={GROUP[hit.group].module}
                    title={hit.title}
                    subtitle={hit.snippet ? <Snippet text={hit.snippet} /> : hit.meta}
                    onPress={() => openHit(hit)}
                    trailing={
                      hit === first && query.trim() ? (
                        <View style={s.kbd}>
                          <Text variant="micro" tone="tertiary">
                            Enter
                          </Text>
                        </View>
                      ) : undefined
                    }
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
  bar: { flexDirection: 'row', alignItems: 'center', gap: t.space[2.5] },
  grow: { flex: 1 },
  mark: { fontFamily: t.type.tag.font, backgroundColor: t.colors.tonal },
  nothing: { alignItems: 'center', gap: t.space[3], paddingTop: t.space[7], paddingBottom: t.space[1.5] },
  nothingText: { maxWidth: t.layout.emptyTextMax - t.space[5] },
  kbd: { paddingHorizontal: t.space[1.5], borderRadius: t.radius.checkbox, backgroundColor: t.colors.bg },
}));

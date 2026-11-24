import { snippetParts, type SearchGroup, type SearchHit } from '@glife/domain/search';
import { router, type Href } from 'expo-router';
import { FileText, Folder, Hash, X, Zap, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { IconButton, ListItem, Screen, SearchField, Section, Text, makeStyles } from '@/shared/ui';

import { useSearchResults } from '../hooks/useSearchResults';
import { useEscape, useMarkSearchOpen } from '../hooks/useSearchShortcut';

const GROUP: Record<SearchGroup, { title: string; icon: LucideIcon }> = {
  actions: { title: 'Ações', icon: Zap },
  notes: { title: 'Notas', icon: FileText },
  folders: { title: 'Pastas', icon: Folder },
  tags: { title: 'Tags', icon: Hash },
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
          <Text key={i} variant="small" tone="accent" style={s.mark}>
            {p.text}
          </Text>
        ) : (
          p.text
        ),
      )}
    </>
  );
}

/** Busca universal: ações, notas, pastas e tags. Enter abre o primeiro resultado; Esc fecha (web). */
export function SearchScreen() {
  const s = useStyles();
  const [query, setQuery] = useState('');
  const sections = useSearchResults(query);
  useMarkSearchOpen();
  useEscape(close);

  const first = sections?.[0]?.hits[0];
  const empty = sections !== null && sections.length === 0;

  return (
    <Screen title="Buscar" action={<IconButton icon={X} label="Fechar" variant="ghost" onPress={close} />}>
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Notas, pastas, tags, ações…"
        autoFocus
        onSubmit={() => first && openHit(first)}
      />
      {empty ? (
        <Text variant="small" tone="tertiary" style={s.message}>
          Nada encontrado para “{query.trim()}”.
        </Text>
      ) : (
        <View style={s.sections}>
          {sections?.map((section) => (
            <Section key={section.group} title={query.trim() || section.group !== 'notes' ? GROUP[section.group].title : 'Recentes'}>
              {section.hits.map((hit, i) => (
                <ListItem
                  key={hit.id}
                  icon={GROUP[hit.group].icon}
                  title={hit.title}
                  subtitle={hit.snippet ? <Snippet text={hit.snippet} /> : hit.meta}
                  separator={i < section.hits.length - 1}
                  onPress={() => openHit(hit)}
                />
              ))}
            </Section>
          ))}
        </View>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  sections: { gap: t.layout.blockGap },
  message: { paddingVertical: t.space[4] },
  mark: { fontFamily: t.type.item.font },
}));

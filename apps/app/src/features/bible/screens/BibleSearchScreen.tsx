// Busca na Bíblia (protótipo Bíblia v2, tela "Busca por texto"): palavra, frase ou referência, sem acento, no texto
// da tradução escolhida, sem internet. Referência reconhecida vira atalho no topo; resultados por livro, com o termo
// destacado. Vazio: buscas recentes e sugestões.
import { formatRef, getBook, hitSegments, parseBibleRef, searchVerses, toOsis, type IndexedVerse, type SearchScope } from '@glife/domain/bible';
import { router, type Href } from 'expo-router';
import { ArrowRight, BookOpen, History } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { BackHeader, Chip, EmptyState, Icon, ListGroup, ListItem, Screen, SearchField, Section, Spinner, Text, makeStyles, useTheme } from '@/shared/ui';

import { bibleHref } from '../components/navigation';
import { useBibleText } from '../hooks/BibleData';

const DEBOUNCE_MS = 200;
const PER_BOOK = 12;
const SUGGESTIONS = ['Sl 23', 'Rm 8:28', 'águas', 'descanso', 'força', 'amor'];
const SCOPES: { key: SearchScope; label: string }[] = [
  { key: 'all', label: 'Toda a Bíblia' },
  { key: 'AT', label: 'Antigo Testamento' },
  { key: 'NT', label: 'Novo Testamento' },
];

export function BibleSearchScreen() {
  const s = useStyles();
  const { translation, textIndex, recentSearches } = useBibleText();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [scope, setScope] = useState<SearchScope>('all');
  const [index, setIndex] = useState<IndexedVerse[] | null>(null);
  const [progress, setProgress] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => void recentSearches.list().then(setRecent), [recentSearches]);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);
  // carrega o texto só quando há o que buscar (primeira vez demora; depois fica em memória)
  const needsIndex = debounced.length > 0;
  useEffect(() => {
    if (!needsIndex) return;
    let active = true;
    void textIndex.load(translation.id, (done, total) => active && setProgress(done / total)).then((idx) => active && setIndex(idx));
    return () => {
      active = false;
    };
  }, [needsIndex, textIndex, translation.id]);

  const ref = debounced ? parseBibleRef(debounced) : null;
  const results = useMemo(() => (index && debounced ? searchVerses(index, debounced, scope) : []), [index, debounced, scope]);
  const groups = useMemo(() => {
    const m = new Map<string, IndexedVerse[]>();
    for (const r of results) m.set(r.book, [...(m.get(r.book) ?? []), r]);
    return [...m];
  }, [results]);

  const openVerse = (osis: string) => {
    void recentSearches.add(query);
    const href = bibleHref(osis);
    if (href) router.push(href as Href);
  };

  return (
    <Screen header={<BackHeader title="Buscar na Bíblia" fallback="/biblia" backLabel="Bíblia" />}>
      <SearchField value={query} onChangeText={setQuery} placeholder="Palavra ou referência" autoFocus onSubmit={() => void recentSearches.add(query).then(() => recentSearches.list().then(setRecent))} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {SCOPES.map((o) => (
          <Chip key={o.key} label={o.label} selected={scope === o.key} onPress={() => setScope(o.key)} />
        ))}
      </ScrollView>

      {!debounced ? (
        <>
          {recent.length > 0 && (
            <Section title="Buscas recentes">
              <ListGroup>
                {recent.map((q) => (
                  <ListItem key={q} title={q} leading={<Icon icon={History} color="textTertiary" />} onPress={() => setQuery(q)} />
                ))}
              </ListGroup>
            </Section>
          )}
          <Section title="Experimente">
            <View style={s.wrap}>
              {SUGGESTIONS.map((q) => (
                <Chip key={q} label={q} size="sm" onPress={() => setQuery(q)} />
              ))}
            </View>
          </Section>
          <Text variant="caption" tone="tertiary">
            A busca roda no aparelho, sem internet, no texto da {translation.name}. Sem acento também vale: “aguas” acha “águas”.
          </Text>
        </>
      ) : (
        <>
          {ref && <RefShortcut label={formatRef(ref, 'name')} onPress={() => openVerse(toOsis(ref))} />}
          {!index ? (
            <View style={s.loading}>
              <Spinner />
              <Text variant="caption" tone="tertiary">
                Preparando a busca… {Math.round(progress * 100)}%
              </Text>
            </View>
          ) : results.length === 0 ? (
            !ref && <EmptyState compact mood="pensando" message={`Nada encontrado para “${debounced}”. Tente outra palavra ou uma referência, como Sl 23.`} />
          ) : (
            <>
              <Text variant="small" tone="tertiary">
                {results.length} {results.length === 1 ? 'versículo' : 'versículos'} com “{debounced}”
              </Text>
              {groups.map(([book, list]) => {
                const all = open.has(book);
                return (
                  <Section key={book} title={getBook(book)?.name ?? book}>
                    <ListGroup>
                      {(all ? list : list.slice(0, PER_BOOK)).map((r) => (
                        <Hit key={r.ref} verse={r} query={debounced} onPress={() => openVerse(r.ref)} />
                      ))}
                      {!all && list.length > PER_BOOK && (
                        <ListItem title={`Ver mais ${list.length - PER_BOOK}`} onPress={() => setOpen((o) => new Set(o).add(book))} />
                      )}
                    </ListGroup>
                  </Section>
                );
              })}
            </>
          )}
        </>
      )}
    </Screen>
  );
}

function RefShortcut({ label, onPress }: { label: string; onPress(): void }) {
  const s = useStyles();
  return (
    <Pressable style={s.ref} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Ir para ${label}`}>
      <View style={s.refIcon}>
        <Icon icon={BookOpen} color="inverseInk" />
      </View>
      <View style={s.grow}>
        <Text variant="caption" tone="inverseMuted">
          Ir para a referência
        </Text>
        <Text variant="emphasis" tone="inverse">
          {label}
        </Text>
      </View>
      <Icon icon={ArrowRight} color="inverseInk" />
    </Pressable>
  );
}

function Hit({ verse, query, onPress }: { verse: IndexedVerse; query: string; onPress(): void }) {
  const s = useStyles();
  const t = useTheme();
  return (
    <Pressable style={s.hit} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${getBook(verse.book)?.name} ${verse.chapter}:${verse.verse}. ${verse.text}`}>
      <Text variant="tag" tone="accent" numeric>
        {getBook(verse.book)?.name} {verse.chapter}:{verse.verse}
      </Text>
      <Text variant="body">
        {hitSegments(verse.text, query).map((p, i) =>
          p.hit ? (
            <Text key={i} variant="body" style={{ backgroundColor: t.colors.tonal, color: t.colors.tonalInk, fontFamily: t.type.emphasis.font }}>
              {p.text}
            </Text>
          ) : (
            p.text
          ),
        )}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  chips: { gap: t.space[2] },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
  loading: { flexDirection: 'row', alignItems: 'center', gap: t.space[2], minHeight: t.size.listRowSmall },
  ref: { flexDirection: 'row', alignItems: 'center', gap: t.space[3.5], padding: t.space[4], borderRadius: t.radius.tile, backgroundColor: t.colors.inverse },
  refIcon: { width: t.size.moduleIcon, height: t.size.moduleIcon, borderRadius: t.radius.icon, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.onInverseSoft },
  grow: { flex: 1, gap: t.space[0.5] },
  hit: { paddingVertical: t.space[3], gap: t.space[1], minHeight: t.size.navRow },
}));

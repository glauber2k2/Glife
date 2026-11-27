// Leitor da Bíblia em modo leitura (protótipo `leitor`): só o texto em serifa; tocar em versículos seleciona e abre a
// barra de ações (marca-texto, sublinhar, anotar, copiar…). Versículos com notas mostram um marcador; as notas do
// capítulo ficam no fim. Embaixo, capítulo anterior/próximo. `?v=` rola até o versículo e o destaca.
import { formatRef, getBook, parseOsis, type BibleHighlight, type HighlightMark } from '@glife/domain/bible';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { ChevronLeft, ChevronRight, NotebookPen, StickyNote } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorText } from '@/shared/lib/errorText';
import { BackHeader, EmptyState, IconButton, ListGroup, NavRow, Section, Spinner, Text, makeStyles, useTheme, useToast } from '@/shared/ui';

import { passageActions, type PassageAction, type PassageContext } from '../components/actions';
import { registerBuiltinActions } from '../components/builtinActions';
import { LinkedItemsSheet } from '../components/LinkedItemsSheet';
import { chapterHref, neighborChapter } from '../components/navigation';
import { PassageBar } from '../components/PassageBar';
import { VerseRow } from '../components/VerseRow';
import { useBibleText, useHighlightsMaybe } from '../hooks/BibleData';
import { useChapter } from '../hooks/useChapter';
import { useChapterLinks } from '../hooks/useChapterLinks';

registerBuiltinActions();

const FLASH_MS = 1600;

export function ReaderScreen() {
  const { livro, cap, v } = useLocalSearchParams<{ livro: string; cap: string; v?: string }>();
  const book = getBook(String(livro ?? '').toUpperCase());
  const chapter = Number(cap);
  if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <BackHeader title="Bíblia" fallback="/biblia" />
        <EmptyState title="Capítulo não encontrado" message="Esse livro ou capítulo não existe." mood="pensando" />
      </SafeAreaView>
    );
  }
  return <Reader key={`${book.code}.${chapter}`} book={book.code} chapter={chapter} target={Number(v) || null} />;
}

function Reader({ book, chapter, target }: { book: string; chapter: number; target: number | null }) {
  const s = useStyles();
  const t = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const web = Platform.OS === 'web' && width >= t.layout.contentMaxWidth;
  const { translation, setLast } = useBibleText();
  const state = useChapter(translation.id, book, chapter);
  const verses = useMemo(() => (state.status === 'ready' ? state.verses : []), [state]);
  const highlightsRepo = useHighlightsMaybe();
  const linked = useChapterLinks(book, chapter, verses.length);
  const name = getBook(book)!.name;

  const [selected, setSelected] = useState<number[]>([]);
  const [flash, setFlash] = useState<number | null>(target);
  const [sheet, setSheet] = useState<{ verse: number | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrolled = useRef(false);
  const top = useRef(0);

  useEffect(() => setLast(book, chapter), [book, chapter, setLast]);
  useEffect(() => {
    if (flash === null) return;
    const id = setTimeout(() => setFlash(null), FLASH_MS);
    return () => clearTimeout(id);
  }, [flash]);

  const marks = useMemo(() => {
    const prefix = `${book}.${chapter}.`;
    const m = new Map<number, BibleHighlight>();
    for (const h of highlightsRepo?.data ?? []) if (h.ref.startsWith(prefix)) m.set(Number(h.ref.slice(prefix.length)), h);
    return m;
  }, [highlightsRepo?.data, book, chapter]);

  const toggle = useCallback((verse: number) => setSelected((cur) => (cur.includes(verse) ? cur.filter((x) => x !== verse) : [...cur, verse].sort((a, b) => a - b))), []);
  const openLinked = useCallback((verse: number) => setSheet({ verse }), []);
  const onLayoutY = useCallback(
    (verse: number, y: number) => {
      if (verse !== target || scrolled.current) return;
      scrolled.current = true;
      scroll.current?.scrollTo({ y: Math.max(0, top.current + y - t.space[12]), animated: true });
    },
    [target, t.space],
  );

  const refs = (vs: readonly number[]) => vs.map((x) => `${book}.${chapter}.${x}`);
  const run = async (fn: () => Promise<void>, done: string) => {
    if (!highlightsRepo) return;
    setBusy(true);
    try {
      await fn();
      setSelected([]);
      toast({ message: done });
    } catch (e) {
      toast({ message: `Não deu para salvar a marcação: ${errorText(e)}` });
    } finally {
      setBusy(false);
    }
  };
  const plural = (n: number) => `${n} ${n === 1 ? 'versículo' : 'versículos'}`;
  const mark = (m: HighlightMark) =>
    run(() => highlightsRepo!.repo.set(refs(selected), m), `${plural(selected.length)} ${m.style === 'underline' ? 'sublinhado' : 'marcado'}${selected.length === 1 ? '' : 's'}`);
  const clear = () => run(() => highlightsRepo!.repo.clear(refs(selected)), `Marcação removida de ${plural(selected.length)}`);

  const ctx = (vs: number[]): PassageContext => ({
    translation,
    book,
    chapter,
    verses: vs,
    texts: verses,
    close: () => {
      setSelected([]);
      setSheet(null);
    },
    notify: (message) => toast({ message }),
  });
  const runAction = (a: PassageAction, vs: number[]) =>
    void Promise.resolve(a.run(ctx(vs))).catch((e: unknown) => toast({ message: `Não deu para ${a.label.toLowerCase()}: ${errorText(e)}` }));

  const current = useMemo((): HighlightMark | null => {
    const first = marks.get(selected[0] ?? -1);
    if (!first) return null;
    return selected.every((x) => marks.get(x)?.color === first.color && marks.get(x)?.style === first.style) ? { color: first.color, style: first.style } : null;
  }, [marks, selected]);

  const prev = neighborChapter(book, chapter, -1);
  const next = neighborChapter(book, chapter, 1);
  const go = (to: { book: string; chapter: number } | null) => to && router.replace(chapterHref(to.book, to.chapter) as Href);

  const sheetItems = sheet ? (sheet.verse === null ? linked.chapter : (linked.byVerse.get(sheet.verse) ?? [])) : [];
  const sheetTitle = sheet ? formatRef(sheet.verse === null ? { book, chapter } : { book, chapter, verse: sheet.verse }, 'name') : '';

  return (
    <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
      <View style={[s.column, s.headerPad, web && s.headerWeb]}>
        <BackHeader
          title={`${name} ${chapter}`}
          subtitle={translation.abbr}
          fallback="/biblia"
          backLabel="Bíblia"
          right={<IconButton icon={NotebookPen} label={`Notas e anotar o capítulo ${chapter}`} onPress={() => setSheet({ verse: null })} />}
        />
      </View>
      <ScrollView
        ref={scroll}
        contentContainerStyle={[s.scroll, web && s.scrollWeb, { paddingBottom: t.layout.tabBarSpace + insets.bottom + t.space[10] }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.column}>
          {state.status === 'loading' && <Spinner />}
          {state.status === 'missing' && (
            <EmptyState compact message={`A ${translation.name} não tem ${name} ${chapter}. Troque a tradução na Bíblia.`} />
          )}
          {state.status === 'error' && <EmptyState compact message="Não deu para abrir o texto deste capítulo. Tente de novo." />}
          {state.status === 'ready' && (
            <View onLayout={(e) => (top.current = e.nativeEvent.layout.y)} style={s.verses}>
              {verses.map((text, i) =>
                text ? (
                  <VerseRow
                    key={i}
                    verse={i + 1}
                    text={text}
                    highlight={marks.get(i + 1)}
                    selected={selected.includes(i + 1) || flash === i + 1}
                    linked={linked.byVerse.get(i + 1)?.length ?? 0}
                    onPress={toggle}
                    onLinkedPress={openLinked}
                    onLayoutY={onLayoutY}
                  />
                ) : null,
              )}
            </View>
          )}
          {linked.all.length > 0 && (
            <Section title="Notas deste capítulo">
              <ListGroup>
                {linked.all.map((i) => (
                  <NavRow
                    key={i.id}
                    icon={StickyNote}
                    iconSize="md"
                    module="notes"
                    label={i.title}
                    meta={[...new Set(i.links.map((l) => l.target_ref))].map(refLabel).join(' · ')}
                    onPress={() => router.push(i.href as Href)}
                  />
                ))}
              </ListGroup>
            </Section>
          )}
          {translation.credit && (
            <Text variant="caption" tone="tertiary">
              {translation.credit}
            </Text>
          )}
        </View>
      </ScrollView>

      {selected.length > 0 ? (
        <PassageBar
          count={selected.length}
          current={current}
          anyMarked={selected.some((x) => marks.has(x))}
          busy={busy || !highlightsRepo}
          actions={passageActions('verse')}
          onMark={(m) => void mark(m)}
          onClear={() => void clear()}
          onAction={(a) => runAction(a, selected)}
          onClose={() => setSelected([])}
        />
      ) : (
        <View pointerEvents="box-none" style={[s.navHost, { bottom: t.layout.tabBarBottom + insets.bottom }]}>
          <View style={s.nav}>
            <IconButton icon={ChevronLeft} label={prev ? `Capítulo anterior` : 'Início da Bíblia'} variant="ghost" disabled={!prev} onPress={() => go(prev)} />
            <Pressable style={s.navTitle} accessibilityRole="header">
              <Text variant="emphasis" numberOfLines={1}>
                {name} {chapter}
              </Text>
              <Text variant="caption" tone="tertiary" numberOfLines={1}>
                {translation.name}
              </Text>
            </Pressable>
            <IconButton icon={ChevronRight} label={next ? 'Próximo capítulo' : 'Fim da Bíblia'} variant="ghost" disabled={!next} onPress={() => go(next)} />
          </View>
        </View>
      )}

      <LinkedItemsSheet
        visible={sheet !== null}
        title={sheetTitle}
        items={sheetItems}
        onClose={() => setSheet(null)}
        onAnnotate={() => {
          const annotate = passageActions(sheet?.verse === null ? 'chapter' : 'verse').find((a) => a.id === 'annotate');
          if (annotate) runAction(annotate, sheet?.verse ? [sheet.verse] : []);
        }}
      />
    </SafeAreaView>
  );
}

function refLabel(osis: string): string {
  const ref = parseOsis(osis);
  return ref ? formatRef(ref) : osis;
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.bg },
  column: { width: '100%', maxWidth: t.layout.contentMaxWidth, alignSelf: 'center', gap: t.layout.blockGap },
  headerPad: { paddingHorizontal: t.layout.gutter, paddingTop: t.space[1.5] },
  headerWeb: { paddingHorizontal: t.layout.gutterWeb, paddingTop: t.space[6] },
  scroll: { flexGrow: 1, paddingHorizontal: t.layout.gutter, paddingTop: t.space[4] },
  scrollWeb: { paddingHorizontal: t.layout.gutterWeb },
  verses: { gap: t.space[0.5] },
  navHost: { position: 'absolute', left: t.layout.tabBarInset, right: t.layout.tabBarInset, alignItems: 'center' },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: t.layout.sheetMaxWidth,
    height: t.size.tabBar,
    paddingHorizontal: t.space[2],
    borderRadius: t.radius.dialog,
    backgroundColor: t.colors.card,
    boxShadow: t.colors.shadow.nav,
  },
  navTitle: { flex: 1, alignItems: 'center', gap: t.space[0.5] },
}));

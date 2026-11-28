// Leitor da Bíblia (protótipo Bíblia v2): fundo papel, um versículo por linha em Outfit com os ajustes de leitura,
// cabeçalho leve do capítulo. As barras de cima e de baixo somem ao rolar para baixo e voltam ao subir. Tocar em
// versículos seleciona (sobretom) e abre a barra de ações. `?v=` rola até o versículo e o destaca.
import { formatRef, getBook, parseOsis, type BibleHighlight, type HighlightMark, type HighlightStyle } from '@glife/domain/bible';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, NotebookPen, Search, StickyNote, Type } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions, Platform, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorText } from '@/shared/lib/errorText';
import { BackHeader, EmptyState, Icon, IconButton, ListGroup, NavRow, Section, Spinner, Text, makeStyles, useReduceMotion, useTheme, useToast } from '@/shared/ui';
import { goBackOr } from '@/shared/navigation/backNavigation';

import { passageActions, type PassageAction, type PassageContext } from '../components/actions';
import { registerBuiltinActions } from '../components/builtinActions';
import { BooksSheet } from '../components/BooksSheet';
import { ChapterHeader } from '../components/ChapterHeader';
import { PlanReaderCard, PlanStrip } from '../components/PlanReader';
import { LinkedItemsSheet } from '../components/LinkedItemsSheet';
import { neighborChapter } from '../components/navigation';
import { PassageBar } from '../components/PassageBar';
import { rangeLabel } from '../components/passageLabel';
import { ReadingSheet } from '../components/ReadingSheet';
import { chromeVisibility, readMinutes } from '../components/readerChrome';
import { TranslationSheet } from '../components/TranslationSheet';
import { VerseRow } from '../components/VerseRow';
import { useBibleText, useHighlightsMaybe } from '../hooks/BibleData';
import { useChapter } from '../hooks/useChapter';
import { useChapterLinks } from '../hooks/useChapterLinks';
import { usePlanViews } from '../hooks/usePlanStatuses';

registerBuiltinActions();

const FLASH_MS = 1600;

export function ReaderScreen() {
  const { livro, cap, v, plano } = useLocalSearchParams<{ livro: string; cap: string; v?: string; plano?: string }>();
  const book = getBook(String(livro ?? '').toUpperCase());
  const chapter = Number(cap);
  const s = useStyles();
  // Troca de capítulo fica nesta tela (só o texto anima); guarda de que lado o novo capítulo entra.
  const [step, setStep] = useState<ChapterStep>(0);
  const change = useCallback((to: { book: string; chapter: number }, dir: 1 | -1) => {
    setStep(dir);
    router.setParams({ livro: to.book, cap: String(to.chapter), v: undefined });
  }, []);
  if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) {
    return (
      <View style={s.root}>
        <BackHeader title="Bíblia" fallback="/biblia" />
        <EmptyState title="Capítulo não encontrado" message="Esse livro ou capítulo não existe." mood="pensando" />
      </View>
    );
  }
  return (
    <Reader
      key={`${book.code}.${chapter}`}
      book={book.code}
      chapter={chapter}
      target={Number(v) || null}
      planId={plano ?? null}
      enterFrom={step}
      onChange={change}
    />
  );
}

/** 1 = veio do próximo (entra pela direita), -1 = do anterior (pela esquerda), 0 = abriu agora (sem animar). */
type ChapterStep = 1 | -1 | 0;

interface ReaderProps {
  book: string;
  chapter: number;
  target: number | null;
  planId: string | null;
  enterFrom: ChapterStep;
  onChange(to: { book: string; chapter: number }, dir: 1 | -1): void;
}

function Reader({ book, chapter, target, planId, enterFrom, onChange }: ReaderProps) {
  const s = useStyles();
  const t = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const { width } = useWindowDimensions();
  const web = Platform.OS === 'web' && width >= t.layout.contentMaxWidth;
  const { translation, setLast, reading, setReading, resetReading } = useBibleText();
  const state = useChapter(translation.id, book, chapter);
  const verses = useMemo(() => (state.status === 'ready' ? state.verses : []), [state]);
  const highlightsRepo = useHighlightsMaybe();
  const linked = useChapterLinks(book, chapter, verses.length);
  const name = getBook(book)!.name;
  const plans = usePlanViews();
  const planView = planId ? plans.views.find((x) => x.plan.id === planId) : undefined;

  const [selected, setSelected] = useState<number[]>([]);
  // modo escolhido na barra (vale para as próximas seleções); sem escolha, segue a marcação dos selecionados
  const [chosenMode, setMode] = useState<HighlightStyle | null>(null);
  const [flash, setFlash] = useState<number | null>(target);
  const [sheet, setSheet] = useState<{ verse: number | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState<'books' | 'translation' | 'reading' | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrolled = useRef(false);
  const top = useRef(0);

  // barras que somem ao rolar
  const [chrome, setChrome] = useState(true);
  const prevY = useRef(0);
  const shown = useSharedValue(1);
  const barHeight = t.size.iconButton + t.space[2] * 2;
  useEffect(() => {
    const [x1, y1, x2, y2] = t.easing.standard;
    shown.set(withTiming(chrome ? 1 : 0, { duration: reduceMotion ? t.motion.reduced : t.motion.standard, easing: Easing.bezier(x1, y1, x2, y2) }));
  }, [chrome, shown, reduceMotion, t]);
  const topStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (shown.get() - 1) * (barHeight + insets.top) }], opacity: shown.get() }));
  const bottomStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - shown.get()) * (t.size.tabBar + t.layout.tabBarBottom + insets.bottom) }],
    opacity: shown.get(),
  }));
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    setChrome((visible) => chromeVisibility({ prevY: prevY.current, y, visible }));
    prevY.current = y;
  }, []);

  useEffect(() => setLast(book, chapter, target), [book, chapter, target, setLast]);
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

  // setLast fora do atualizador do estado (atualizador roda durante o render e não pode mexer em outro componente)
  const toggle = useCallback(
    (verse: number) => {
      if (!selected.includes(verse)) setLast(book, chapter, verse);
      setSelected((cur) => (cur.includes(verse) ? cur.filter((x) => x !== verse) : [...cur, verse].sort((a, b) => a - b)));
    },
    [book, chapter, setLast, selected],
  );
  const openLinked = useCallback((verse: number) => setSheet({ verse }), []);
  // Referência citada no texto abre o versículo em cima desta leitura (voltar retorna aqui).
  const openRef = useCallback((href: string) => router.push(href as Href), []);
  const onLayoutY = useCallback(
    (verse: number, y: number) => {
      if (verse !== target || scrolled.current) return;
      scrolled.current = true;
      scroll.current?.scrollTo({ y: Math.max(0, top.current + y - t.space[12] * 2), animated: true });
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
    run(() => highlightsRepo!.repo.set(refs(selected), m), `${plural(selected.length)} ${m.style === 'underline' ? 'sublinhado' : 'grifado'}${selected.length === 1 ? '' : 's'}`);
  const clear = () => run(() => highlightsRepo!.repo.clear(refs(selected)), `Marcação apagada de ${plural(selected.length)}`);

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
  const mode: HighlightStyle = chosenMode ?? current?.style ?? 'highlight';

  const prev = neighborChapter(book, chapter, -1);
  const next = neighborChapter(book, chapter, 1);
  // Próximo capítulo entra pela direita; o anterior, pela esquerda. As barras ficam paradas.
  const go = (to: { book: string; chapter: number } | null, back = false) => {
    if (to) onChange(to, back ? -1 : 1);
  };
  // Só a coluna de texto anima: esmaece e desliza um pouco do lado de onde veio (reduzir movimento: só esmaece).
  const enter = useSharedValue(enterFrom === 0 ? 1 : 0);
  useEffect(() => {
    if (enterFrom === 0) return;
    const [x1, y1, x2, y2] = t.easing.enter;
    enter.set(withTiming(1, { duration: reduceMotion ? t.motion.reduced : t.motion.gentle, easing: Easing.bezier(x1, y1, x2, y2) }));
  }, [enter, enterFrom, reduceMotion, t]);
  const offset = reduceMotion ? 0 : enterFrom * t.motion.enterOffset;
  const columnStyle = useAnimatedStyle(() => ({ opacity: enter.get(), transform: [{ translateX: (1 - enter.get()) * offset }] }));

  const sheetItems = sheet ? (sheet.verse === null ? linked.chapter : (linked.byVerse.get(sheet.verse) ?? [])) : [];
  const sheetTitle = sheet ? formatRef(sheet.verse === null ? { book, chapter } : { book, chapter, verse: sheet.verse }, 'name') : '';

  return (
    <View style={s.root}>
      <ScrollView
        ref={scroll}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          s.scroll,
          web && s.scrollWeb,
          { paddingTop: insets.top + barHeight + t.space[6], paddingBottom: t.layout.tabBarSpace + insets.bottom + t.space[10] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[s.column, columnStyle]}>
          {planView && <PlanStrip view={planView} book={book} chapter={chapter} today={plans.today} />}
          <ChapterHeader book={name} chapter={chapter} verses={state.status === 'ready' ? verses.length : null} minutes={state.status === 'ready' ? readMinutes(verses) : null} />
          {state.status === 'loading' && <Spinner />}
          {state.status === 'missing' && <EmptyState compact message={`A ${translation.name} não tem ${name} ${chapter}. Troque a tradução na Bíblia.`} />}
          {state.status === 'error' && <EmptyState compact message="Não deu para abrir o texto deste capítulo. Tente de novo." />}
          {state.status === 'ready' && (
            <View onLayout={(e) => (top.current = e.nativeEvent.layout.y)}>
              {verses.map((text, i) =>
                text ? (
                  <VerseRow
                    key={i}
                    verse={i + 1}
                    text={text}
                    highlight={marks.get(i + 1)}
                    selected={selected.includes(i + 1)}
                    flash={flash === i + 1}
                    linked={linked.byVerse.get(i + 1)?.length ?? 0}
                    reading={reading}
                    onPress={toggle}
                    onLinkedPress={openLinked}
                    onRefPress={openRef}
                    onLayoutY={onLayoutY}
                  />
                ) : null,
              )}
            </View>
          )}
          {planView && state.status === 'ready' && <PlanReaderCard view={planView} book={book} chapter={chapter} today={plans.today} />}
          {!planView && next && state.status === 'ready' && (
            <Pressable style={s.next} onPress={() => go(next)} accessibilityRole="button" accessibilityLabel={`Próximo capítulo: ${getBook(next.book)!.name} ${next.chapter}`}>
              <View style={s.grow}>
                <Text variant="caption" tone="tertiary">
                  A seguir
                </Text>
                <Text variant="emphasis">
                  {getBook(next.book)!.name} {next.chapter}
                </Text>
              </View>
              <Icon icon={ArrowRight} color="textSecondary" />
            </Pressable>
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
            <Text variant="caption" tone="quaternary">
              {translation.credit}
            </Text>
          )}
        </Animated.View>
      </ScrollView>

      <Animated.View style={[s.topBar, { paddingTop: insets.top }, topStyle]}>
        <View style={[s.topRow, web && s.topRowWeb]}>
          <IconButton icon={ChevronLeft} label="Voltar" variant="ghost" onPress={() => goBackOr('/biblia' as Href)} />
          <Pressable style={s.title} onPress={() => setPicker('books')} accessibilityRole="button" accessibilityLabel={`${name} ${chapter}. Escolher livro e capítulo`}>
            <View style={s.titleRow}>
              <Text variant="emphasis" numberOfLines={1}>
                {name} {chapter}
              </Text>
              <Icon icon={ChevronDown} size={t.icon.small} color="textSecondary" />
            </View>
            <Pressable onPress={() => setPicker('translation')} accessibilityRole="button" accessibilityLabel={`Tradução ${translation.name}. Trocar`} hitSlop={t.touch.hitSlop}>
              <Text variant="mono" tone="tertiary">
                {translation.abbr}
              </Text>
            </Pressable>
          </Pressable>
          <IconButton icon={Search} label="Buscar na Bíblia" variant="ghost" onPress={() => router.push('/biblia/busca' as Href)} />
          <IconButton icon={Type} label="Ajustes de leitura" variant="ghost" onPress={() => setPicker('reading')} />
        </View>
      </Animated.View>

      {selected.length > 0 ? (
        <PassageBar
          refLabel={rangeLabel(book, chapter, selected)}
          mode={mode}
          onModeChange={setMode}
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
        <Animated.View pointerEvents="box-none" style={[s.navHost, { bottom: t.layout.tabBarBottom + insets.bottom }, bottomStyle]}>
          <View style={s.nav}>
            <IconButton icon={ChevronLeft} label={prev ? 'Capítulo anterior' : 'Início da Bíblia'} variant="ghost" disabled={!prev} onPress={() => go(prev, true)} />
            <Pressable style={s.navTitle} accessibilityRole="button" accessibilityLabel="Notas e anotar o capítulo" onPress={() => setSheet({ verse: null })}>
              <Text variant="emphasis" numberOfLines={1}>
                {name} {chapter}
              </Text>
              <View style={s.titleRow}>
                <Icon icon={NotebookPen} size={t.icon.tiny} color="textTertiary" />
                <Text variant="caption" tone="tertiary" numberOfLines={1}>
                  {linked.all.length ? `${linked.all.length} ${linked.all.length === 1 ? 'nota' : 'notas'}` : 'Anotar capítulo'}
                </Text>
              </View>
            </Pressable>
            <IconButton icon={ChevronRight} label={next ? 'Próximo capítulo' : 'Fim da Bíblia'} variant="ghost" disabled={!next} onPress={() => go(next)} />
          </View>
        </Animated.View>
      )}

      <BooksSheet visible={picker === 'books'} onClose={() => setPicker(null)} current={{ book, chapter }} />
      <TranslationSheet visible={picker === 'translation'} onClose={() => setPicker(null)} />
      <ReadingSheet visible={picker === 'reading'} onClose={() => setPicker(null)} reading={reading} onChange={setReading} onReset={resetReading} />
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
    </View>
  );
}

function refLabel(osis: string): string {
  const ref = parseOsis(osis);
  return ref ? formatRef(ref) : osis;
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.paper },
  column: { width: '100%', maxWidth: t.layout.contentMaxWidth, alignSelf: 'center', gap: t.layout.blockGap },
  scroll: { flexGrow: 1, paddingHorizontal: t.layout.gutter + t.space[2] },
  scrollWeb: { paddingHorizontal: t.layout.gutterWeb },
  topBar: { position: 'absolute', top: t.space[0], left: t.space[0], right: t.space[0], backgroundColor: t.colors.paper },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: t.space[1], paddingHorizontal: t.space[2.5], paddingVertical: t.space[2] },
  topRowWeb: { width: '100%', maxWidth: t.layout.contentMaxWidth + t.layout.gutterWeb * 2, alignSelf: 'center' },
  title: { flex: 1, alignItems: 'center', minWidth: t.space[0] },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: t.space[1] },
  next: { flexDirection: 'row', alignItems: 'center', gap: t.space[3], padding: t.space[4], borderRadius: t.radius.tile, backgroundColor: t.colors.soft },
  grow: { flex: 1, gap: t.space[0.5] },
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

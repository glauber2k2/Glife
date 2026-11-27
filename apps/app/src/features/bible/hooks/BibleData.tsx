// Dados da Bíblia compostos na raiz: texto (traduções embutidas e importadas), marcações ao vivo e preferências de
// leitura do aparelho (tradução escolhida e último capítulo).
import { combineSources, type BibleHighlight, type BibleHighlightsRepository, type BibleTextSource, type Translation } from '@glife/domain/bible';
import type { LocalDb } from '@glife/domain/core';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { createSnapshotProvider } from '@/shared/lib/snapshotProvider';
import type { KeyValueStorage } from '@/shared/ui/theme/preferenceStore';

import { BLIVRE } from '../data/bundled/blivre';
import { BPM } from '../data/bundled/bpm';
import { createBundledText } from '../data/bundledText';
import { createLocalHighlights } from '../data/localHighlights';
import { DEFAULT_TRANSLATION, createReadingPrefsStore, type ReadingPrefs } from '../data/readingPrefs';

const highlights = createSnapshotProvider<BibleHighlightsRepository, BibleHighlight[]>('as marcações da Bíblia', createLocalHighlights);
export const useHighlights = highlights.use;
export const useHighlightsMaybe = highlights.useMaybe;

const bundled = createBundledText([BLIVRE, BPM]);

interface BibleText {
  text: BibleTextSource;
  translations: Translation[];
  /** tradução escolhida (se sumiu da lista, a primeira) */
  translation: Translation;
  setTranslation(id: string): void;
  last: ReadingPrefs['last'];
  setLast(book: string, chapter: number): void;
  /** recarrega a lista de traduções (depois de importar ou remover) */
  refreshTranslations(): void;
}

const TextContext = createContext<BibleText | null>(null);
const FALLBACK: Translation = { id: BLIVRE.id, abbr: BLIVRE.abbr, name: BLIVRE.name, credit: BLIVRE.credit, source: 'bundled' };
const NO_SOURCES: readonly BibleTextSource[] = [];

export function BibleProvider({
  db,
  userId,
  storage,
  extraSources = NO_SOURCES,
  children,
}: {
  db: LocalDb;
  userId: string | null;
  storage: KeyValueStorage;
  /** fontes além das embutidas (traduções importadas, só no aparelho) */
  extraSources?: readonly BibleTextSource[];
  children: ReactNode;
}) {
  const prefsStore = useMemo(() => createReadingPrefsStore(storage), [storage]);
  const text = useMemo(() => combineSources(bundled, ...extraSources), [extraSources]);
  const [prefs, setPrefs] = useState<ReadingPrefs>({ translationId: DEFAULT_TRANSLATION, last: null });
  const [translations, setTranslations] = useState<Translation[]>([FALLBACK]);
  const [version, setVersion] = useState(0);

  useEffect(() => void prefsStore.load().then(setPrefs), [prefsStore]);
  useEffect(() => {
    let active = true;
    void text.translations().then((l) => active && setTranslations(l.length ? l : [FALLBACK]));
    return () => {
      active = false;
    };
  }, [text, version]);

  const update = useCallback(
    (fn: (p: ReadingPrefs) => ReadingPrefs) =>
      setPrefs((p) => {
        const next = fn(p);
        if (next !== p) void prefsStore.save(next);
        return next;
      }),
    [prefsStore],
  );

  const value = useMemo<BibleText>(
    () => ({
      text,
      translations,
      translation: translations.find((t) => t.id === prefs.translationId) ?? translations[0] ?? FALLBACK,
      setTranslation: (id) => update((p) => (p.translationId === id ? p : { ...p, translationId: id })),
      last: prefs.last,
      setLast: (book, chapter) => update((p) => (p.last?.book === book && p.last.chapter === chapter ? p : { ...p, last: { book, chapter } })),
      refreshTranslations: () => setVersion((v) => v + 1),
    }),
    [text, translations, prefs, update],
  );

  return (
    <TextContext.Provider value={value}>
      <highlights.Provider db={db} userId={userId}>
        {children}
      </highlights.Provider>
    </TextContext.Provider>
  );
}

export function useBibleText(): BibleText {
  const ctx = useContext(TextContext);
  if (!ctx) throw new Error('useBibleText precisa de <BibleProvider>');
  return ctx;
}

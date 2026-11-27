// Dados da Bíblia compostos na raiz: texto (traduções embutidas e importadas), marcações ao vivo e preferências de
// leitura do aparelho (tradução escolhida e último capítulo).
import { combineSources, type BibleHighlight, type BibleHighlightsRepository, type BiblePlansRepository, type BibleTextSource, type PlanWithReads, type Translation } from '@glife/domain/bible';
import type { LocalDb } from '@glife/domain/core';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { createSnapshotProvider } from '@/shared/lib/snapshotProvider';
import type { KeyValueStorage } from '@/shared/ui/theme/preferenceStore';

import { BLIVRE } from '../data/bundled/blivre';
import { BPM } from '../data/bundled/bpm';
import { createBundledText } from '../data/bundledText';
import { createImportedText, type ImportedTextSource } from '../data/importedText';
import { createLocalHighlights } from '../data/localHighlights';
import { createLocalPlans } from '../data/localPlans';
import { createRecentSearches, type RecentSearches } from '../data/recentSearches';
import { createTextIndex, type TextIndex } from '../data/textIndex';
import { DEFAULT_TRANSLATION, READING_DEFAULTS, createReadingPrefsStore, mergeLoadedPrefs, type ReadingAdjust, type ReadingPrefs } from '../data/readingPrefs';

const highlights = createSnapshotProvider<BibleHighlightsRepository, BibleHighlight[]>('as marcações da Bíblia', createLocalHighlights);
export const useHighlights = highlights.use;
export const useHighlightsMaybe = highlights.useMaybe;

const plans = createSnapshotProvider<BiblePlansRepository, PlanWithReads[]>('os planos de leitura', createLocalPlans);
export const usePlans = plans.use;
export const usePlansMaybe = plans.useMaybe;

const bundled = createBundledText([BLIVRE, BPM]);
const BUNDLED_ABBRS = [BLIVRE.abbr, BPM.abbr];

interface BibleText {
  text: BibleTextSource;
  translations: Translation[];
  /** tradução escolhida (se sumiu da lista, a primeira) */
  translation: Translation;
  setTranslation(id: string): void;
  last: ReadingPrefs['last'];
  setLast(book: string, chapter: number, verse?: number | null): void;
  /** ajustes de leitura (tamanho, entrelinhas, letras, números) */
  reading: ReadingAdjust;
  setReading(patch: Partial<ReadingAdjust>): void;
  resetReading(): void;
  /** recarrega a lista de traduções (depois de importar ou remover) */
  refreshTranslations(): void;
  /** traduções importadas pelo usuário, só neste aparelho */
  imported: ImportedTextSource;
  /** siglas das traduções que vêm no app (não podem repetir na importação) */
  bundledAbbrs: readonly string[];
  /** texto da tradução em memória para a busca (carrega na primeira busca) */
  textIndex: TextIndex;
  recentSearches: RecentSearches;
}

const TextContext = createContext<BibleText | null>(null);
const FALLBACK: Translation = { id: BLIVRE.id, abbr: BLIVRE.abbr, name: BLIVRE.name, credit: BLIVRE.credit, source: 'bundled' };

export function BibleProvider({
  db,
  userId,
  storage,
  children,
}: {
  db: LocalDb;
  userId: string | null;
  storage: KeyValueStorage;
  children: ReactNode;
}) {
  const prefsStore = useMemo(() => createReadingPrefsStore(storage), [storage]);
  const imported = useMemo(() => createImportedText(db), [db]);
  const text = useMemo(() => combineSources(bundled, imported), [imported]);
  const textIndex = useMemo(() => createTextIndex(text), [text]);
  const recentSearches = useMemo(() => createRecentSearches(storage), [storage]);
  const [prefs, setPrefs] = useState<ReadingPrefs>({ translationId: DEFAULT_TRANSLATION, last: null, ...READING_DEFAULTS });
  // campos mudados antes de a leitura do arranque terminar: ela não pode desfazê-los
  const touched = useRef(new Set<keyof ReadingPrefs>());
  const [translations, setTranslations] = useState<Translation[]>([FALLBACK]);
  const [version, setVersion] = useState(0);

  useEffect(() => void prefsStore.load().then((loaded) => setPrefs((cur) => mergeLoadedPrefs(cur, loaded, touched.current))), [prefsStore]);
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
        if (next !== p) {
          for (const k of Object.keys(next) as (keyof ReadingPrefs)[]) if (next[k] !== p[k]) touched.current.add(k);
          void prefsStore.save(next);
        }
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
      setLast: (book, chapter, verse = null) =>
        update((p) => (p.last?.book === book && p.last.chapter === chapter && p.last.verse === verse ? p : { ...p, last: { book, chapter, verse } })),
      reading: { fontSize: prefs.fontSize, lineHeight: prefs.lineHeight, letterSpacing: prefs.letterSpacing, verseNumbers: prefs.verseNumbers },
      setReading: (patch) => update((p) => ((Object.keys(patch) as (keyof ReadingAdjust)[]).every((k) => p[k] === patch[k]) ? p : { ...p, ...patch })),
      resetReading: () => update((p) => ({ ...p, ...READING_DEFAULTS })),
      refreshTranslations: () => setVersion((v) => v + 1),
      imported,
      bundledAbbrs: BUNDLED_ABBRS,
      textIndex,
      recentSearches,
    }),
    [text, translations, prefs, update, imported, textIndex, recentSearches],
  );

  return (
    <TextContext.Provider value={value}>
      <highlights.Provider db={db} userId={userId}>
        <plans.Provider db={db} userId={userId}>
          {children}
        </plans.Provider>
      </highlights.Provider>
    </TextContext.Provider>
  );
}

export function useBibleText(): BibleText {
  const ctx = useContext(TextContext);
  if (!ctx) throw new Error('useBibleText precisa de <BibleProvider>');
  return ctx;
}

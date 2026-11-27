// Preferências de leitura do aparelho (não sincronizam): tradução escolhida e último capítulo aberto.
import { getBook } from '@glife/domain/bible';

import type { KeyValueStorage } from '@/shared/ui/theme/preferenceStore';

export interface ReadingPrefs {
  translationId: string;
  last: { book: string; chapter: number } | null;
}

export interface ReadingPrefsStore {
  load(): Promise<ReadingPrefs>;
  save(prefs: ReadingPrefs): Promise<void>;
}

const KEY = 'glife.bible.reading';
export const DEFAULT_TRANSLATION = 'blivre';
const DEFAULTS: ReadingPrefs = { translationId: DEFAULT_TRANSLATION, last: null };

/** Valida o que veio do armazenamento; o que não fizer sentido volta ao padrão. */
export function parseReadingPrefs(raw: string | null): ReadingPrefs {
  try {
    const v = JSON.parse(raw ?? '') as { translationId?: unknown; last?: { book?: unknown; chapter?: unknown } | null };
    if (!v || typeof v !== 'object' || Array.isArray(v)) return { ...DEFAULTS };
    const translationId = typeof v.translationId === 'string' && /^[a-z0-9-]{1,40}$/.test(v.translationId) ? v.translationId : DEFAULT_TRANSLATION;
    const book = typeof v.last?.book === 'string' ? getBook(v.last.book) : undefined;
    const chapter = v.last?.chapter;
    const last = book && Number.isInteger(chapter) && (chapter as number) >= 1 && (chapter as number) <= book.chapters ? { book: book.code, chapter: chapter as number } : null;
    return { translationId, last };
  } catch {
    return { ...DEFAULTS };
  }
}

/** Falhas de armazenamento nunca derrubam o leitor: só deixa de lembrar. */
export function createReadingPrefsStore(storage: KeyValueStorage): ReadingPrefsStore {
  return {
    async load() {
      try {
        return parseReadingPrefs(await storage.getItem(KEY));
      } catch {
        return { ...DEFAULTS };
      }
    },
    async save(prefs) {
      try {
        await storage.setItem(KEY, JSON.stringify(prefs));
      } catch {
        // sem lembrar a posição nesta vez
      }
    },
  };
}

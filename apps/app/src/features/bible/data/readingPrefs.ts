// Preferências de leitura do aparelho (não sincronizam): tradução escolhida, último trecho aberto e os ajustes de
// leitura (tamanho, entrelinhas, espaço entre letras e números dos versículos).
import { getBook } from '@glife/domain/bible';

import { reading } from '@/shared/ui/theme/tokens';
import type { KeyValueStorage } from '@/shared/ui/theme/preferenceStore';

export interface ReadingAdjust {
  fontSize: number;
  lineHeight: number;
  /** em % do tamanho da letra */
  letterSpacing: number;
  verseNumbers: boolean;
}

export interface ReadingPrefs extends ReadingAdjust {
  translationId: string;
  last: { book: string; chapter: number; verse: number | null } | null;
}

export interface ReadingPrefsStore {
  load(): Promise<ReadingPrefs>;
  save(prefs: ReadingPrefs): Promise<void>;
}

const KEY = 'glife.bible.reading';
export const DEFAULT_TRANSLATION = 'blivre';
export const READING_DEFAULTS: ReadingAdjust = {
  fontSize: reading.fontSize.default,
  lineHeight: reading.lineHeight.default,
  letterSpacing: reading.letterSpacing.default,
  verseNumbers: true,
};
const DEFAULTS: ReadingPrefs = { translationId: DEFAULT_TRANSLATION, last: null, ...READING_DEFAULTS };

type Range = { min: number; max: number; step: number; default: number };
/** Número dentro da faixa e no passo (arredondado); o resto volta ao padrão. Inteiros exigem valor inteiro. */
function inRange(v: unknown, r: Range, integer: boolean): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < r.min || v > r.max) return r.default;
  if (integer && !Number.isInteger(v)) return r.default;
  const snapped = r.min + Math.round((v - r.min) / r.step) * r.step;
  return Math.round(snapped * 100) / 100;
}

/** Valida o que veio do armazenamento; o que não fizer sentido volta ao padrão. */
export function parseReadingPrefs(raw: string | null): ReadingPrefs {
  try {
    const v = JSON.parse(raw ?? '') as Record<string, unknown> & { last?: { book?: unknown; chapter?: unknown; verse?: unknown } | null };
    if (!v || typeof v !== 'object' || Array.isArray(v)) return { ...DEFAULTS };
    const translationId = typeof v.translationId === 'string' && /^[a-z0-9-]{1,40}$/.test(v.translationId) ? v.translationId : DEFAULT_TRANSLATION;
    const book = typeof v.last?.book === 'string' ? getBook(v.last.book) : undefined;
    const chapter = v.last?.chapter;
    const verse = v.last?.verse;
    const last =
      book && Number.isInteger(chapter) && (chapter as number) >= 1 && (chapter as number) <= book.chapters
        ? { book: book.code, chapter: chapter as number, verse: Number.isInteger(verse) && (verse as number) >= 1 ? (verse as number) : null }
        : null;
    return {
      translationId,
      last,
      fontSize: inRange(v.fontSize, reading.fontSize, true),
      lineHeight: inRange(v.lineHeight, reading.lineHeight, false),
      letterSpacing: inRange(v.letterSpacing, reading.letterSpacing, true),
      verseNumbers: typeof v.verseNumbers === 'boolean' ? v.verseNumbers : READING_DEFAULTS.verseNumbers,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

/**
 * O que foi lido do armazenamento no arranque chega depois da primeira tela: os campos que a pessoa já mudou nesta
 * sessão (`touched`) ficam como estão; o resto vem do que estava guardado.
 */
export function mergeLoadedPrefs(current: ReadingPrefs, loaded: ReadingPrefs, touched: ReadonlySet<keyof ReadingPrefs>): ReadingPrefs {
  const out = { ...loaded };
  for (const k of touched) (out as Record<string, unknown>)[k] = current[k];
  return out;
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

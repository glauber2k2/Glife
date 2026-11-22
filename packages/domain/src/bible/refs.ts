// Referências bíblicas no formato OSIS-like usado pelo Vida: `JHN.3`, `JHN.3.16`,
// `JHN.3.16-18`, `JHN.3.16-4.2`, `PSA.23-24`.
import { findBook, getBook } from './books.ts';

export interface BibleRef {
  book: string; // código USFM, ex.: 'JHN'
  chapter: number;
  verse?: number;
  /** Fim do trecho. Se chapterEnd for omitido, é o mesmo capítulo. */
  chapterEnd?: number;
  verseEnd?: number;
}

/**
 * Lê uma referência digitada em português:
 * "Jo 3:16", "Jo 3.16-18", "Sl 23", "1 Co 13:4-7", "Jó 1:1", "Jo 3:16-4:2", "Sl 23-24".
 */
export function parseBibleRef(input: string): BibleRef | null {
  const m = input
    .trim()
    .match(/^((?:[1-3]|i{1,3})?\s*[\p{L}][\p{L}.\s]*?)\s*(\d+)(?:[:.](\d+))?(?:\s*-\s*(\d+)(?:[:.](\d+))?)?$/iu);
  if (!m) return null;

  const book = findBook(m[1]!);
  if (!book) return null;

  const chapter = Number(m[2]);
  const verse = m[3] ? Number(m[3]) : undefined;
  const endA = m[4] ? Number(m[4]) : undefined;
  const endB = m[5] ? Number(m[5]) : undefined;

  const ref: BibleRef = { book: book.code, chapter };
  if (verse !== undefined) ref.verse = verse;

  if (endA !== undefined) {
    if (endB !== undefined) {
      // "3:16-4:2"
      ref.chapterEnd = endA;
      ref.verseEnd = endB;
    } else if (verse !== undefined) {
      // "3:16-18"
      ref.verseEnd = endA;
    } else {
      // "23-24" (capítulos)
      ref.chapterEnd = endA;
    }
  }

  return isValidRef(ref) ? ref : null;
}

export function isValidRef(ref: BibleRef): boolean {
  const book = getBook(ref.book);
  if (!book) return false;
  const pos = (n: number | undefined) => n === undefined || (Number.isInteger(n) && n >= 1);
  if (!pos(ref.chapter) || !pos(ref.verse) || !pos(ref.chapterEnd) || !pos(ref.verseEnd)) return false;
  if (ref.chapter > book.chapters) return false;

  const endChapter = ref.chapterEnd ?? ref.chapter;
  if (endChapter > book.chapters || endChapter < ref.chapter) return false;
  if (endChapter === ref.chapter && ref.verse !== undefined && ref.verseEnd !== undefined) {
    if (ref.verseEnd < ref.verse) return false;
  }
  return true;
}

/** Serializa para o formato guardado em `links.target_ref` e usado em `vida://bible/...`. */
export function toOsis(ref: BibleRef): string {
  let s = `${ref.book}.${ref.chapter}`;
  if (ref.verse !== undefined) s += `.${ref.verse}`;
  if (ref.chapterEnd !== undefined && ref.chapterEnd !== ref.chapter) {
    s += `-${ref.chapterEnd}`;
    if (ref.verseEnd !== undefined) s += `.${ref.verseEnd}`;
  } else if (ref.verseEnd !== undefined && ref.verseEnd !== ref.verse) {
    s += `-${ref.verseEnd}`;
  }
  return s;
}

export function parseOsis(osis: string): BibleRef | null {
  const m = osis.match(/^([1-3]?[A-Z]{2,3})\.(\d+)(?:\.(\d+))?(?:-(\d+)(?:\.(\d+))?)?$/);
  if (!m) return null;
  const ref: BibleRef = { book: m[1]!, chapter: Number(m[2]) };
  if (m[3]) ref.verse = Number(m[3]);
  if (m[4]) {
    if (m[5]) {
      ref.chapterEnd = Number(m[4]);
      ref.verseEnd = Number(m[5]);
    } else if (ref.verse !== undefined) {
      ref.verseEnd = Number(m[4]);
    } else {
      ref.chapterEnd = Number(m[4]);
    }
  }
  return isValidRef(ref) ? ref : null;
}

/** Exibição curta em pt-BR: "Jo 3:16-18", "Sl 23", "1Co 13:4-7". */
export function formatRef(ref: BibleRef, style: 'abbr' | 'name' = 'abbr'): string {
  const book = getBook(ref.book);
  const label = book ? (style === 'abbr' ? book.abbr : book.name) : ref.book;
  let s = `${label} ${ref.chapter}`;
  if (ref.verse !== undefined) s += `:${ref.verse}`;
  if (ref.chapterEnd !== undefined && ref.chapterEnd !== ref.chapter) {
    s += `-${ref.chapterEnd}`;
    if (ref.verseEnd !== undefined) s += `:${ref.verseEnd}`;
  } else if (ref.verseEnd !== undefined && ref.verseEnd !== ref.verse) {
    s += `-${ref.verseEnd}`;
  }
  return s;
}

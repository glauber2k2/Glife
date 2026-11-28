// Acha referências bíblicas no meio de um texto corrido (ex.: a tradução Livre cita "Salmo 118:22" dentro do
// versículo). Só vale `capítulo:versículo` precedido do nome do livro com inicial maiúscula — "às 10:30" e
// "Atos 2" ficam de fora. Um "52:7" logo depois de outra referência (separado por ; ou ,) é do mesmo livro.
import { findBook } from './books.ts';
import { isValidRef, type BibleRef } from './refs.ts';

export interface FoundRef {
  /** Posição no texto (início do nome do livro, ou do número quando herda o livro). */
  start: number;
  end: number;
  ref: BibleRef;
}

const NUMBERS = /(?<![\d:])(\d{1,3}):(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?(?:,\s?\d{1,3}(?![\d:]))*(?![\d:])/g;
// Nome antes dos números: "1 Reis", "Salmo", "Cântico dos Cânticos".
const BOOK_BEFORE = /((?:[1-3]\s*)?\p{Lu}\p{L}*(?:\s+(?:de|dos|das|do|da)\s+\p{Lu}\p{L}*)?)\s+$/u;
const SAME_BOOK_GAP = /^\s*[;,]\s*$/;

export function findBibleRefs(text: string): FoundRef[] {
  const out: FoundRef[] = [];
  for (const m of text.matchAll(NUMBERS)) {
    const at = m.index;
    const chapter = Number(m[1]);
    const verse = Number(m[2]);
    const ref: BibleRef = { book: '', chapter, verse };
    if (m[3]) ref.verseEnd = Number(m[3]);

    let start = at;
    const before = text.slice(Math.max(0, at - 40), at).match(BOOK_BEFORE);
    const name = before?.[1];
    const book = name ? (findBook(name) ?? findBook(name.split(/\s+/).pop()!)) : undefined;
    if (book) {
      ref.book = book.code;
      const used = findBook(name!) ? name! : name!.split(/\s+/).pop()!;
      start = at - before![0].length + before![0].indexOf(used);
    } else {
      const prev = out[out.length - 1];
      if (!prev || !SAME_BOOK_GAP.test(text.slice(prev.end, at))) continue;
      ref.book = prev.ref.book;
    }
    if (!isValidRef(ref)) continue;
    out.push({ start, end: at + m[0].length, ref });
  }
  return out;
}

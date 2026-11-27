// Rotas do leitor e passagem entre capítulos (atravessando livros, na ordem do cânon).
import { BIBLE_BOOKS, getBook, parseOsis } from '@glife/domain/bible';

/** `/biblia/<LIVRO>/<cap>` com `?v=` quando a referência aponta um versículo (o início do trecho). */
export function bibleHref(osis: string): string | null {
  const ref = parseOsis(osis);
  if (!ref) return null;
  return `/biblia/${ref.book}/${ref.chapter}${ref.verse !== undefined ? `?v=${ref.verse}` : ''}`;
}

export function chapterHref(book: string, chapter: number): string {
  return `/biblia/${book}/${chapter}`;
}

export function neighborChapter(book: string, chapter: number, step: 1 | -1): { book: string; chapter: number } | null {
  const b = getBook(book);
  if (!b) return null;
  const next = chapter + step;
  if (next >= 1 && next <= b.chapters) return { book, chapter: next };
  const i = BIBLE_BOOKS.findIndex((x) => x.code === book) + step;
  const other = BIBLE_BOOKS[i];
  if (!other) return null;
  return { book: other.code, chapter: step === 1 ? 1 : other.chapters };
}

/** Leitor aberto dentro de um plano: `/biblia/PSA/23?plano=<id>` (o capítulo vem em OSIS, ex.: PSA.23). */
export function planChapterHref(planId: string, ref: string): string {
  const i = ref.lastIndexOf('.');
  return `${chapterHref(ref.slice(0, i), Number(ref.slice(i + 1)))}?plano=${planId}`;
}

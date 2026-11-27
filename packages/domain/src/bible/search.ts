// Busca no texto bíblico (palavra, frase ou várias palavras), sem acento e sem diferenciar maiúsculas. O texto vem
// de quem chama (tradução escolhida, carregada no aparelho); aqui só ficam as regras.
import { BIBLE_BOOKS, getBook } from './books.ts';

export type SearchScope = 'all' | 'AT' | 'NT';

export interface IndexedVerse {
  /** OSIS do versículo, ex.: PSA.23.1 */
  ref: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  /** texto normalizado (minúsculas, sem acento) */
  norm: string;
}

const ORDER = new Map(BIBLE_BOOKS.map((b, i) => [b.code, i]));
const MIN_TOKEN = 2;
export const SEARCH_LIMIT = 200;

export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Monta o índice de capítulos já carregados; versículos vazios ficam de fora. */
export function indexVerses(chapters: readonly { book: string; chapter: number; verses: readonly string[] }[]): IndexedVerse[] {
  const out: IndexedVerse[] = [];
  for (const c of chapters)
    c.verses.forEach((text, i) => {
      if (text) out.push({ ref: `${c.book}.${c.chapter}.${i + 1}`, book: c.book, chapter: c.chapter, verse: i + 1, text, norm: normalizeText(text) });
    });
  return out;
}

const canonical = (a: IndexedVerse, b: IndexedVerse) =>
  (ORDER.get(a.book) ?? 0) - (ORDER.get(b.book) ?? 0) || a.chapter - b.chapter || a.verse - b.verse;

/** Versículos que têm todas as palavras (de 2+ letras) da consulta, na ordem do cânon. */
export function searchVerses(index: readonly IndexedVerse[], query: string, scope: SearchScope, limit: number = SEARCH_LIMIT): IndexedVerse[] {
  const tokens = normalizeText(query)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= MIN_TOKEN);
  if (!tokens.length) return [];
  const hits = index.filter((v) => (scope === 'all' || getBook(v.book)?.testament === scope) && tokens.every((w) => v.norm.includes(w)));
  return hits.sort(canonical).slice(0, limit);
}

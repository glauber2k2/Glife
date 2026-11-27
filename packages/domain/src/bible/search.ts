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

const tokensOf = (query: string) =>
  normalizeText(query)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= MIN_TOKEN);

const canonical = (a: IndexedVerse, b: IndexedVerse) =>
  (ORDER.get(a.book) ?? 0) - (ORDER.get(b.book) ?? 0) || a.chapter - b.chapter || a.verse - b.verse;

/** Versículos que têm todas as palavras (de 2+ letras) da consulta, na ordem do cânon. */
export function searchVerses(index: readonly IndexedVerse[], query: string, scope: SearchScope, limit: number = SEARCH_LIMIT): IndexedVerse[] {
  const tokens = tokensOf(query);
  if (!tokens.length) return [];
  const hits = index.filter((v) => (scope === 'all' || getBook(v.book)?.testament === scope) && tokens.every((w) => v.norm.includes(w)));
  return hits.sort(canonical).slice(0, limit);
}

/** Partes do texto com as palavras da consulta marcadas (comparação sem acento; o texto mostrado é o original). */
export function hitSegments(text: string, query: string): { text: string; hit: boolean }[] {
  const tokens = tokensOf(query);
  if (!tokens.length) return [{ text, hit: false }];
  // normaliza caractere a caractere para saber onde cada letra normalizada estava no texto original
  const chars = [...text];
  let norm = '';
  const owner: number[] = [];
  chars.forEach((c, i) => {
    const n = normalizeText(c);
    for (let k = 0; k < n.length; k++) owner.push(i);
    norm += n;
  });
  const marked = new Array<boolean>(chars.length).fill(false);
  for (const w of tokens)
    for (let at = norm.indexOf(w); at >= 0; at = norm.indexOf(w, at + w.length))
      for (let k = at; k < at + w.length; k++) marked[owner[k]!] = true;
  const out: { text: string; hit: boolean }[] = [];
  chars.forEach((c, i) => {
    const last = out[out.length - 1];
    if (last && last.hit === marked[i]) last.text += c;
    else out.push({ text: c, hit: marked[i]! });
  });
  return out;
}

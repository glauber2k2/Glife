// Corta o texto do versículo em trechos: os que citam outro versículo ("Salmo 118:22") levam o endereço do leitor.
import { findBibleRefs, formatRef } from '@glife/domain/bible';

import { chapterHref } from './navigation';

export interface VerseSegment {
  text: string;
  /** rota do leitor no versículo citado */
  href?: string;
  /** nome por extenso para leitores de tela */
  label?: string;
}

export function verseSegments(text: string): VerseSegment[] {
  const out: VerseSegment[] = [];
  let at = 0;
  for (const { start, end, ref } of findBibleRefs(text)) {
    if (start > at) out.push({ text: text.slice(at, start) });
    out.push({ text: text.slice(start, end), href: `${chapterHref(ref.book, ref.chapter)}?v=${ref.verse}`, label: formatRef(ref, 'name') });
    at = end;
  }
  if (at < text.length || out.length === 0) out.push({ text: text.slice(at) });
  return out;
}

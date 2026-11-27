// Abrir um registro: grifo/sublinhado vai ao leitor no versículo (com brilho); anotação abre a nota.
import type { BibleRecord } from '@glife/domain/bible';
import { router, type Href } from 'expo-router';

import { chapterHref } from './navigation';

export function openRecord(r: BibleRecord): void {
  if (r.kind === 'note') router.push(r.href as Href);
  else router.push(`${chapterHref(r.book, r.chapter)}?v=${r.verses[0]}` as Href);
}

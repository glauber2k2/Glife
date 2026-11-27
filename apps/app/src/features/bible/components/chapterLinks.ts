// Vínculos (notas e outros itens) que tocam um capítulo, separados por versículo para o leitor.
import { parseOsis, refCoversVerse, refTouchesChapter } from '@glife/domain/bible';
import type { Link } from '@glife/domain/links';

export interface ChapterLinks {
  /** versículo → vínculos que o citam (versículo ou trecho) */
  byVerse: Map<number, Link[]>;
  /** vínculos para o capítulo inteiro (`JHN.3`) ou trechos de capítulos inteiros (`PSA.23-24`) */
  chapter: Link[];
  /** itens de origem que aparecem no capítulo, sem repetir, na ordem dos vínculos */
  sourceIds: string[];
}

export function linksByVerse(links: readonly Link[], book: string, chapter: number, verseCount: number): ChapterLinks {
  const byVerse = new Map<number, Link[]>();
  const whole: Link[] = [];
  const sources = new Set<string>();
  for (const l of links) {
    const ref = l.target_type === 'bible' ? parseOsis(l.target_ref) : null;
    if (!ref || !refTouchesChapter(ref, book, chapter)) continue;
    let hit = false;
    if (ref.verse === undefined) {
      whole.push(l);
      hit = true;
    } else {
      for (let v = 1; v <= verseCount; v++) {
        if (!refCoversVerse(ref, book, chapter, v)) continue;
        const list = byVerse.get(v) ?? [];
        list.push(l);
        byVerse.set(v, list);
        hit = true;
      }
    }
    if (hit) sources.add(l.source_id);
  }
  return { byVerse, chapter: whole, sourceIds: [...sources] };
}

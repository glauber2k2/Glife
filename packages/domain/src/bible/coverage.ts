// Quais versículos uma referência cobre, como agrupar uma seleção e como uma seleção vira nota ou texto copiado.
import { formatRef, type BibleRef } from './refs.ts';

/** Posição comparável (capítulo, versículo) — versículo ausente = capítulo inteiro. */
const pos = (chapter: number, verse: number) => chapter * 10_000 + verse;

function span(ref: BibleRef): [number, number] {
  const endChapter = ref.chapterEnd ?? ref.chapter;
  const start = pos(ref.chapter, ref.verse ?? 0);
  const end =
    ref.verseEnd !== undefined ? pos(endChapter, ref.verseEnd) : ref.verse !== undefined && ref.chapterEnd === undefined ? start : pos(endChapter, 9_999);
  return [start, end];
}

export function refCoversVerse(ref: BibleRef, book: string, chapter: number, verse: number): boolean {
  if (ref.book !== book) return false;
  const [a, b] = span(ref);
  const p = pos(chapter, verse);
  return p >= a && p <= b;
}

export function refTouchesChapter(ref: BibleRef, book: string, chapter: number): boolean {
  return ref.book === book && chapter >= ref.chapter && chapter <= (ref.chapterEnd ?? ref.chapter);
}

/** Versículos selecionados → trechos contíguos, em ordem. */
export function groupVerses(book: string, chapter: number, verses: readonly number[]): BibleRef[] {
  const sorted = [...new Set(verses)].filter((v) => Number.isInteger(v) && v >= 1).sort((a, b) => a - b);
  const out: BibleRef[] = [];
  for (const v of sorted) {
    const last = out[out.length - 1];
    if (last && (last.verseEnd ?? last.verse!) === v - 1) last.verseEnd = v;
    else out.push({ book, chapter, verse: v });
  }
  return out;
}

export interface PassageBlock {
  ref: BibleRef;
  text: string;
}

/** Nota nova a partir da seleção: cada bloco citado com o wikilink que liga a nota ao trecho. */
export function annotationDraft(blocks: readonly PassageBlock[]): { title: string; body: string } {
  const first = blocks[0];
  const title = first ? formatRef(first.ref, 'name') + (blocks.length > 1 ? ' e outros' : '') : '';
  const body = blocks.map((b) => `> [[${formatRef(b.ref)}]] ${b.text}`).join('\n\n') + '\n\n';
  return { title, body };
}

export function copyText(blocks: readonly PassageBlock[], translationAbbr: string): string {
  return blocks.map((b) => `"${b.text}" — ${formatRef(b.ref, 'name')} (${translationAbbr})`).join('\n\n');
}

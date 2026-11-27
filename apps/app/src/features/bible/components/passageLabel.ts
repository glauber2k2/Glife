// Referência dos versículos selecionados, como a barra de seleção mostra: "Salmos 23:2–4, 6".
import { getBook } from '@glife/domain/bible';

export function rangeLabel(book: string, chapter: number, verses: readonly number[]): string {
  const sorted = [...new Set(verses)].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0];
  let prev = start;
  for (let i = 1; i <= sorted.length; i++) {
    const v = sorted[i];
    if (v !== undefined && prev !== undefined && v === prev + 1) {
      prev = v;
      continue;
    }
    if (start !== undefined && prev !== undefined) parts.push(start === prev ? `${start}` : `${start}–${prev}`);
    start = prev = v;
  }
  return `${getBook(book)?.name ?? book} ${chapter}:${parts.join(', ')}`;
}

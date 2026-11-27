// Índice do texto da tradução para a busca: na primeira busca lê os 66 livros pela mesma fonte do leitor e guarda em
// memória (por tradução). Capítulo que falta ou que falha ao ler fica de fora, sem derrubar a busca.
import { BIBLE_BOOKS, indexVerses, type BibleTextSource, type IndexedVerse } from '@glife/domain/bible';

export interface TextIndex {
  load(translationId: string, onProgress?: (done: number, total: number) => void): Promise<IndexedVerse[]>;
  drop(translationId: string): void;
}

export function createTextIndex(text: BibleTextSource): TextIndex {
  const cache = new Map<string, Promise<IndexedVerse[]>>();
  const build = async (id: string, onProgress?: (done: number, total: number) => void) => {
    const out: IndexedVerse[] = [];
    let done = 0;
    for (const book of BIBLE_BOOKS) {
      const chapters = await Promise.all(
        Array.from({ length: book.chapters }, (_, i) =>
          text.chapter(id, book.code, i + 1).then(
            (verses) => (verses ? { book: book.code, chapter: i + 1, verses } : null),
            () => null,
          ),
        ),
      );
      out.push(...indexVerses(chapters.filter((c): c is NonNullable<typeof c> => c !== null)));
      onProgress?.(++done, BIBLE_BOOKS.length);
    }
    return out;
  };
  return {
    load(id, onProgress) {
      let p = cache.get(id);
      if (!p) {
        p = build(id, onProgress);
        cache.set(id, p);
        p.catch(() => cache.delete(id));
      } else onProgress?.(BIBLE_BOOKS.length, BIBLE_BOOKS.length);
      return p;
    },
    drop: (id) => void cache.delete(id),
  };
}

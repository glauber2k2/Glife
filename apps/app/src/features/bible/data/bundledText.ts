// Traduções embutidas no app: cada livro é um asset `.bible` (JSON) que o Metro empacota fora do bundle JS
// e que é lido só quando o livro é aberto (no web por fetch; no Android do arquivo do APK).
import type { BibleTextSource, BookText, Translation } from '@glife/domain/bible';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

/** Gerado por tools/bible-import; `books[código]` é o módulo de asset do livro (número devolvido pelo `require`). */
export interface BundledTranslation {
  id: string;
  abbr: string;
  name: string;
  credit: string;
  books: Record<string, number>;
}

export type ReadAsset = (module: number) => Promise<string>;

/** Lê o conteúdo de um asset empacotado. */
export const readBundledAsset: ReadAsset = async (module) => {
  const asset = Asset.fromModule(module);
  if (Platform.OS === 'web') {
    const res = await fetch(asset.uri);
    if (!res.ok) throw new Error(`asset ${res.status}`);
    return res.text();
  }
  await asset.downloadAsync();
  return new File(asset.localUri ?? asset.uri).text();
};

function isBookText(v: unknown): v is BookText {
  const b = v as BookText;
  return !!b && typeof b.book === 'string' && Array.isArray(b.chapters) && b.chapters.every((c) => Array.isArray(c) && c.every((s) => typeof s === 'string'));
}

/** Fonte das traduções embutidas; guarda em memória o último livro lido de cada tradução. */
export function createBundledText(list: readonly BundledTranslation[], read: ReadAsset = readBundledAsset): BibleTextSource {
  const byId = new Map(list.map((t) => [t.id, t]));
  const cache = new Map<string, Promise<BookText | null>>();
  const load = (t: BundledTranslation, book: string) => {
    const key = `${t.id}/${book}`;
    let p = cache.get(key);
    if (!p) {
      const module = t.books[book];
      p = module === undefined ? Promise.resolve(null) : read(module).then((s) => {
        const parsed: unknown = JSON.parse(s);
        return isBookText(parsed) ? parsed : null;
      });
      // Só um livro por tradução fica guardado; erro não fica (tenta de novo na próxima).
      for (const k of cache.keys()) if (k.startsWith(`${t.id}/`)) cache.delete(k);
      cache.set(key, p);
      p.catch(() => cache.delete(key));
    }
    return p;
  };
  return {
    async translations() {
      return list.map((t): Translation => ({ id: t.id, abbr: t.abbr, name: t.name, credit: t.credit, source: 'bundled' }));
    },
    async chapter(id, book, chapter) {
      const t = byId.get(id);
      if (!t) return null;
      return (await load(t, book))?.chapters[chapter - 1] ?? null;
    },
  };
}

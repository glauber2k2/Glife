// Tradução importada pelo usuário (fica só no aparelho dele): arquivos USFM (um livro por arquivo) ou um JSON no
// formato do importador. Recusa com o motivo escrito para o usuário; nada parcial.
import { z } from 'zod';

import { RepositoryError } from '../core/index.ts';
import { getBook } from './books.ts';
import { parseUsfm, type BookText } from './usfm.ts';

export interface ImportedFile {
  name: string;
  text: string;
}

export interface TranslationImport {
  abbr: string;
  name: string;
  books: BookText[];
}

const bookSchema = z.object({ book: z.string(), chapters: z.array(z.array(z.string())) });
const jsonSchema = z.union([z.object({ books: z.array(bookSchema) }), bookSchema.transform((b) => ({ books: [b] }))]);

const refuse = (message: string) => new RepositoryError('validation', { cause: new RangeError(message) });

function booksOf(file: ImportedFile): BookText[] {
  if (/\.json$/i.test(file.name)) {
    try {
      const parsed = jsonSchema.safeParse(JSON.parse(file.text));
      return parsed.success ? parsed.data.books : [];
    } catch {
      return [];
    }
  }
  const book = parseUsfm(file.text);
  return book ? [book] : [];
}

export function parseTranslationFiles(files: readonly ImportedFile[], meta: { abbr: string; name: string }): TranslationImport {
  const abbr = meta.abbr.trim().toUpperCase();
  const name = meta.name.trim();
  if (!/^[A-Z0-9]{2,8}$/.test(abbr)) throw refuse('Sigla de 2 a 8 letras ou números, ex.: NVI.');
  if (!name || name.length > 60) throw refuse('Nome da tradução com até 60 caracteres.');

  const books = new Map<string, BookText>();
  for (const f of files) {
    for (const b of booksOf(f)) {
      const info = getBook(b.book);
      if (!info) continue;
      if (books.has(info.code)) throw refuse(`${info.name} aparece mais de uma vez nos arquivos.`);
      if (b.chapters.length > info.chapters) throw refuse(`${info.name} veio com ${b.chapters.length} capítulos; o livro tem ${info.chapters}.`);
      books.set(info.code, { book: info.code, chapters: b.chapters });
    }
  }
  if (!books.size) throw refuse('Nenhum livro reconhecido nos arquivos. Use USFM (um livro por arquivo) ou o JSON do importador.');
  return { abbr, name, books: [...books.values()] };
}

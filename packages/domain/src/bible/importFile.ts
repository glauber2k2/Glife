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
  const unknown: string[] = [];
  for (const f of files) {
    const found = booksOf(f).filter((b) => getBook(b.book));
    if (!found.length) unknown.push(f.name);
    for (const b of found) {
      const info = getBook(b.book)!;
      if (books.has(info.code)) throw refuse(`${info.name} aparece mais de uma vez nos arquivos.`);
      if (b.chapters.length > info.chapters) throw refuse(`${info.name} veio com ${b.chapters.length} capítulos; o livro tem ${info.chapters}.`);
      books.set(info.code, { book: info.code, chapters: b.chapters });
    }
  }
  if (!books.size) throw refuse('Nenhum livro reconhecido nos arquivos. Use USFM (um livro por arquivo) ou o JSON do importador.');
  // Tudo ou nada: um arquivo que não é um livro faria a importação sair pela metade sem ninguém perceber.
  if (unknown.length) {
    const names = unknown.slice(0, 3).join(', ') + (unknown.length > 3 ? ` e mais ${unknown.length - 3}` : '');
    throw refuse(`Formato não reconhecido: ${names}. Tire esses arquivos ou corrija-os e importe de novo.`);
  }
  // Livro truncado ou com capítulo vazio mostraria "não tem esse capítulo" no meio da leitura.
  for (const b of books.values()) {
    const info = getBook(b.book)!;
    const filled = b.chapters.filter((c) => c.some((v) => v.trim())).length;
    if (b.chapters.length < info.chapters || filled < b.chapters.length) {
      throw refuse(`${info.name} veio incompleto: ${filled} de ${info.chapters} capítulos com texto.`);
    }
  }
  return { abbr, name, books: [...books.values()] };
}

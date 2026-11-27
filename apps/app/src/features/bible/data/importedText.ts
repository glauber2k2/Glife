// Traduções importadas pelo usuário, guardadas só neste aparelho (tabelas locais fora do sync). Importar grava
// tudo numa transação: se algo falha, nada fica.
import type { BibleTextSource, Translation, TranslationImport } from '@glife/domain/bible';
import { RepositoryError, newId, nowIso, type LocalDb } from '@glife/domain/core';

export interface ImportedTextSource extends BibleTextSource {
  /** `reservedAbbrs`: siglas que já existem (as embutidas), para não repetir. */
  importTranslation(data: TranslationImport, reservedAbbrs: readonly string[]): Promise<Translation>;
  removeTranslation(id: string): Promise<void>;
}

interface TranslationRow {
  id: string;
  abbr: string;
  name: string;
}

const toTranslation = (r: TranslationRow): Translation => ({ id: r.id, abbr: r.abbr, name: r.name, credit: null, source: 'imported' });
const refuse = (message: string) => new RepositoryError('validation', { cause: new RangeError(message) });

export function createImportedText(db: LocalDb): ImportedTextSource {
  return {
    async translations() {
      const rows = await db.getAll<TranslationRow>('SELECT id, abbr, name FROM bible_local_translations ORDER BY created_at, id');
      return rows.map(toTranslation);
    },

    async chapter(id, book, chapter) {
      const row = await db.getOptional<{ verses: string }>(
        'SELECT verses FROM bible_local_chapters WHERE translation_id = ? AND book = ? AND chapter = ?',
        [id, book, chapter],
      );
      if (!row) return null;
      const verses: unknown = JSON.parse(row.verses);
      return Array.isArray(verses) ? verses.map((v) => (typeof v === 'string' ? v : '')) : null;
    },

    async importTranslation(data, reservedAbbrs) {
      const abbr = data.abbr.toUpperCase();
      const taken = new Set(reservedAbbrs.map((a) => a.toUpperCase()));
      const id = `local-${newId()}`;
      await db.writeTransaction(async (tx) => {
        const existing = await tx.getAll<{ abbr: string }>('SELECT abbr FROM bible_local_translations');
        existing.forEach((r) => taken.add(r.abbr.toUpperCase()));
        if (taken.has(abbr)) throw refuse(`Já existe uma tradução com a sigla ${abbr}.`);
        await tx.execute('INSERT INTO bible_local_translations (id, abbr, name, created_at) VALUES (?, ?, ?, ?)', [id, abbr, data.name, nowIso()]);
        for (const b of data.books) {
          for (let c = 0; c < b.chapters.length; c++) {
            await tx.execute('INSERT INTO bible_local_chapters (id, translation_id, book, chapter, verses) VALUES (?, ?, ?, ?, ?)', [
              newId(),
              id,
              b.book,
              c + 1,
              JSON.stringify(b.chapters[c]),
            ]);
          }
        }
      });
      return { id, abbr, name: data.name, credit: null, source: 'imported' };
    },

    async removeTranslation(id) {
      await db.writeTransaction(async (tx) => {
        await tx.execute('DELETE FROM bible_local_chapters WHERE translation_id = ?', [id]);
        await tx.execute('DELETE FROM bible_local_translations WHERE id = ?', [id]);
      });
    },
  };
}

// Notas e pastas na busca universal. Notas usam o índice FTS5 (sem acento, título pesa 10× o corpo);
// sem o índice (SQLite sem FTS5 ou ainda sendo criado) caem para a varredura do repositório.
import type { LocalDb } from '@glife/domain/core';
import type { Note, NoteFoldersRepository, NotesRepository } from '@glife/domain/notes';
import {
  SNIPPET_MARK_END,
  SNIPPET_MARK_START,
  matchesWords,
  toFtsQuery,
  type SearchHit,
  type SearchSource,
} from '@glife/domain/search';

// Direto do módulo: o index de powersync carrega o SDK nativo.
import { ftsTableName, type FtsIndexSpec } from '@/shared/lib/powersync/searchIndex';

export const notesSearchIndex: FtsIndexSpec = {
  name: 'search_notes',
  version: 1,
  table: 'notes',
  columns: { title: 'title', body: 'body_md' },
};

const FTS = ftsTableName(notesSearchIndex);
const TITLE_WEIGHT = 10;
const SNIPPET_WORDS = 12;

const noteHit = (n: Pick<Note, 'id' | 'title'>, snippet?: string | null): SearchHit => ({
  group: 'notes',
  id: n.id,
  title: n.title.trim() || 'Sem título',
  ...(snippet ? { snippet } : {}),
  href: `/nota/${n.id}`,
});

export function createNotesSearchSource(db: LocalDb, notes: NotesRepository): SearchSource {
  return {
    group: 'notes',

    async search(query, limit) {
      const match = toFtsQuery(query);
      if (!match) return [];
      try {
        const rows = await db.getAll<{ id: string; title: string; snippet: string | null }>(
          `SELECT n.id, n.title, snippet(${FTS}, 1, ?, ?, '…', ?) AS snippet
             FROM ${FTS}
             JOIN ps_data__notes p ON p.rowid = ${FTS}.rowid
             JOIN notes n ON n.id = p.id
            WHERE ${FTS} MATCH ? AND n.deleted_at IS NULL
            ORDER BY bm25(${FTS}, ?, 1.0), n.updated_at DESC
            LIMIT ?`,
          [SNIPPET_MARK_START, SNIPPET_MARK_END, SNIPPET_WORDS, match, TITLE_WEIGHT, limit],
        );
        // Trecho só quando o corpo tem o termo; senão o título já diz tudo.
        return rows.map((r) => noteHit(r, r.snippet?.includes(SNIPPET_MARK_START) ? r.snippet : null));
      } catch {
        const page = await notes.list({ search: query }, { limit });
        return page.items.map((n) => noteHit(n));
      }
    },

    async recent(limit) {
      const [pinned, latest] = await Promise.all([
        notes.list({ pinned: true }, { limit }),
        notes.list({}, { limit }),
      ]);
      const seen = new Set<string>();
      return [...pinned.items, ...latest.items]
        .filter((n) => !seen.has(n.id) && !!seen.add(n.id))
        .slice(0, limit)
        .map((n) => noteHit(n));
    },
  };
}

/** Pastas são poucas: filtradas em memória. */
export function createFoldersSearchSource(folders: NoteFoldersRepository): SearchSource {
  return {
    group: 'folders',
    async search(query, limit) {
      return (await folders.list())
        .filter((f) => matchesWords(f.name, query))
        .slice(0, limit)
        .map((f) => ({ group: 'folders', id: f.id, title: f.name, href: `/pasta/${f.id}` }));
    },
  };
}

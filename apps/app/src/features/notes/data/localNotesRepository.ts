// Notas e pastas sobre o banco local (SQLite via PowerSync). Mesmo comportamento da implementação em memória:
// as duas passam por notesRepositoryContract. SQL sempre parametrizado.
import {
  DEFAULT_PAGE_SIZE,
  RepositoryError,
  parseOrThrow,
  restore as restoreEntity,
  softDelete,
  nowIso,
  type LocalDb,
  type LocalQueries,
  type SqlValue,
} from '@glife/domain/core';
import {
  applyNotePatch,
  folderNameSchema,
  newNote,
  newNoteFolder,
  wouldCreateFolderCycle,
  type Note,
  type NoteFolder,
  type NoteFoldersRepository,
  type NoteListQuery,
  type NotesRepository,
} from '@glife/domain/notes';

import { keyset, paginateRows, toPage } from '@/shared/lib/localPaging';

type NoteRow = Omit<Note, 'pinned'> & { pinned: number | null };

const NOTE_COLUMNS = 'id, user_id, title, body_md, folder_id, pinned, kind, created_at, updated_at, deleted_at';
const FOLDER_COLUMNS = 'id, user_id, name, parent_id, created_at, updated_at, deleted_at';

const toNote = (r: NoteRow): Note => ({ ...r, pinned: r.pinned === 1 });
const noteValues = (n: Note): SqlValue[] => [
  n.user_id,
  n.title,
  n.body_md,
  n.folder_id,
  n.pinned ? 1 : 0,
  n.kind,
  n.created_at,
  n.updated_at,
  n.deleted_at,
];

/** Filtros resolvidos no SQL. A busca textual fica em JS: o lower() do SQLite não trata acentos (CAFÉ). */
function filters(q: NoteListQuery): { where: string[]; params: SqlValue[] } {
  const where = ['deleted_at IS NULL'];
  const params: SqlValue[] = [];
  if (q.folderId === null) where.push('folder_id IS NULL');
  else if (q.folderId !== undefined) {
    where.push('folder_id = ?');
    params.push(q.folderId);
  }
  if (q.kind !== undefined) {
    where.push('kind = ?');
    params.push(q.kind);
  }
  if (q.pinned !== undefined) where.push(q.pinned ? 'pinned = 1' : '(pinned = 0 OR pinned IS NULL)');
  return { where, params };
}

const matchesSearch = (n: Note, search: string) => {
  const s = search.toLowerCase();
  return n.title.toLowerCase().includes(s) || n.body_md.toLowerCase().includes(s);
};

async function aliveNote(db: LocalQueries, id: string): Promise<Note> {
  const row = await db.getOptional<NoteRow>(`SELECT ${NOTE_COLUMNS} FROM notes WHERE id = ? AND deleted_at IS NULL`, [id]);
  if (!row) throw new RepositoryError('not_found');
  return toNote(row);
}

async function aliveFolder(db: LocalQueries, id: string): Promise<NoteFolder> {
  const row = await db.getOptional<NoteFolder>(
    `SELECT ${FOLDER_COLUMNS} FROM note_folders WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
  if (!row) throw new RepositoryError('not_found');
  return row;
}

async function writeNote(db: LocalQueries, n: Note, insert: boolean) {
  if (insert) {
    await db.execute(
      `INSERT INTO notes (id, user_id, title, body_md, folder_id, pinned, kind, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [n.id, ...noteValues(n)],
    );
  } else {
    await db.execute(
      `UPDATE notes SET user_id = ?, title = ?, body_md = ?, folder_id = ?, pinned = ?, kind = ?,
       created_at = ?, updated_at = ?, deleted_at = ? WHERE id = ?`,
      [...noteValues(n), n.id],
    );
  }
}

async function writeFolder(db: LocalQueries, f: NoteFolder, insert: boolean) {
  const values: SqlValue[] = [f.user_id, f.name, f.parent_id, f.created_at, f.updated_at, f.deleted_at];
  if (insert) {
    await db.execute(
      `INSERT INTO note_folders (id, user_id, name, parent_id, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [f.id, ...values],
    );
  } else {
    await db.execute(
      `UPDATE note_folders SET user_id = ?, name = ?, parent_id = ?, created_at = ?, updated_at = ?, deleted_at = ?
       WHERE id = ?`,
      [...values, f.id],
    );
  }
}

export function createLocalNotesRepository(db: LocalDb, userId: string): NotesRepository {
  const listSql = (q: NoteListQuery, extraWhere = '1', extraParams: SqlValue[] = [], limit?: number) => {
    const f = filters(q);
    return {
      sql: `SELECT ${NOTE_COLUMNS} FROM notes WHERE ${[...f.where, extraWhere].join(' AND ')}
            ORDER BY updated_at DESC, id DESC${limit !== undefined ? ' LIMIT ?' : ''}`,
      params: [...f.params, ...extraParams, ...(limit !== undefined ? [limit] : [])],
    };
  };

  return {
    async get(id) {
      const row = await db.getOptional<NoteRow>(
        `SELECT ${NOTE_COLUMNS} FROM notes WHERE id = ? AND deleted_at IS NULL`,
        [id],
      );
      return row ? toNote(row) : null;
    },

    async list(q = {}, page) {
      if (q.search) {
        const { sql, params } = listSql(q);
        const rows = (await db.getAll<NoteRow>(sql, params)).map(toNote).filter((n) => matchesSearch(n, q.search!));
        return paginateRows(rows, (n) => n.updated_at, page);
      }
      const k = keyset('updated_at', page);
      const { sql, params } = listSql(q, k.where, k.params, k.fetch);
      return toPage((await db.getAll<NoteRow>(sql, params)).map(toNote), k.limit, (n) => n.updated_at);
    },

    watch(q, listener, onError) {
      const limit = q.limit ?? DEFAULT_PAGE_SIZE;
      const { sql, params } = listSql(q, '1', [], q.search ? undefined : limit);
      return db.watch<NoteRow>(
        sql,
        params,
        (rows) => {
          const notes = rows.map(toNote);
          listener(q.search ? notes.filter((n) => matchesSearch(n, q.search!)).slice(0, limit) : notes);
        },
        (e) => onError?.(new RepositoryError('unavailable', { cause: e })),
      );
    },

    async findIdByTitle(title) {
      const t = title.trim().toLowerCase();
      if (!t) return null;
      // Filtra pelo tamanho no SQL e compara sem maiúsculas em JS (acentos incluídos).
      const rows = await db.getAll<{ id: string; title: string }>(
        'SELECT id, title FROM notes WHERE deleted_at IS NULL AND length(title) = ?',
        [t.length],
      );
      return rows.find((r) => r.title.toLowerCase() === t)?.id ?? null;
    },

    async create(draft) {
      const n = newNote(draft, userId);
      return db.writeTransaction(async (tx) => {
        if (n.folder_id) await aliveFolder(tx, n.folder_id);
        await writeNote(tx, n, true);
        return n;
      });
    },

    async update(id, patch) {
      return db.writeTransaction(async (tx) => {
        const n = applyNotePatch(await aliveNote(tx, id), patch);
        if (n.folder_id) await aliveFolder(tx, n.folder_id);
        await writeNote(tx, n, false);
        return n;
      });
    },

    async remove(id) {
      await db.writeTransaction(async (tx) => writeNote(tx, softDelete(await aliveNote(tx, id)), false));
    },

    async restore(id) {
      return db.writeTransaction(async (tx) => {
        const row = await tx.getOptional<NoteRow>(`SELECT ${NOTE_COLUMNS} FROM notes WHERE id = ?`, [id]);
        if (!row) throw new RepositoryError('not_found');
        const n = restoreEntity(toNote(row));
        await writeNote(tx, n, false);
        return n;
      });
    },

    async listTrash(page) {
      const k = keyset('deleted_at', page);
      const rows = await db.getAll<NoteRow>(
        `SELECT ${NOTE_COLUMNS} FROM notes WHERE deleted_at IS NOT NULL AND ${k.where}
         ORDER BY deleted_at DESC, id DESC LIMIT ?`,
        [...k.params, k.fetch],
      );
      return toPage(rows.map(toNote), k.limit, (n) => n.deleted_at ?? '');
    },
  };
}

export function createLocalNoteFoldersRepository(db: LocalDb, userId: string): NoteFoldersRepository {
  return {
    async list() {
      const rows = await db.getAll<NoteFolder>(`SELECT ${FOLDER_COLUMNS} FROM note_folders WHERE deleted_at IS NULL`);
      return rows.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
    },

    async create(draft) {
      const f = newNoteFolder(draft, userId);
      return db.writeTransaction(async (tx) => {
        if (f.parent_id) await aliveFolder(tx, f.parent_id);
        await writeFolder(tx, f, true);
        return f;
      });
    },

    async rename(id, name) {
      const clean = parseOrThrow(folderNameSchema, name);
      return db.writeTransaction(async (tx) => {
        const f = { ...(await aliveFolder(tx, id)), name: clean, updated_at: nowIso() };
        await writeFolder(tx, f, false);
        return f;
      });
    },

    async move(id, parentId) {
      return db.writeTransaction(async (tx) => {
        const f = await aliveFolder(tx, id);
        if (parentId !== null && parentId !== id) await aliveFolder(tx, parentId);
        const parents = new Map(
          (await tx.getAll<{ id: string; parent_id: string | null }>('SELECT id, parent_id FROM note_folders')).map(
            (r) => [r.id, r.parent_id] as const,
          ),
        );
        if (wouldCreateFolderCycle(id, parentId, (x) => parents.get(x) ?? null)) throw new RepositoryError('validation');
        const moved = { ...f, parent_id: parentId, updated_at: nowIso() };
        await writeFolder(tx, moved, false);
        return moved;
      });
    },

    async remove(id) {
      await db.writeTransaction(async (tx) => {
        const f = await aliveFolder(tx, id);
        const busy = await tx.getOptional<{ n: number }>(
          `SELECT (SELECT count(*) FROM notes WHERE deleted_at IS NULL AND folder_id = ?)
                + (SELECT count(*) FROM note_folders WHERE deleted_at IS NULL AND parent_id = ?) AS n`,
          [id, id],
        );
        if ((busy?.n ?? 0) > 0) throw new RepositoryError('conflict');
        await writeFolder(tx, softDelete(f), false);
      });
    },
  };
}

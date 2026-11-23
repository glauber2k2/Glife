// Grafo de links sobre o banco local (SQLite via PowerSync). Mesmo comportamento da implementação em memória:
// as duas passam por linksRepositoryContract. SQL sempre parametrizado.
import {
  RepositoryError,
  newId,
  nowIso,
  softDelete,
  type LocalDb,
  type LocalQueries,
  type SqlValue,
} from '@glife/domain/core';
import { validateNewLink, type DesiredLink, type Link, type LinksRepository, type SourceAddress } from '@glife/domain/links';

import { keyset, toPage } from '@/shared/lib/localPaging';

const COLUMNS =
  'id, user_id, source_type, source_id, target_type, target_ref, relation, origin, created_at, updated_at, deleted_at';

async function aliveLink(db: LocalQueries, id: string): Promise<Link> {
  const row = await db.getOptional<Link>(`SELECT ${COLUMNS} FROM links WHERE id = ? AND deleted_at IS NULL`, [id]);
  if (!row) throw new RepositoryError('not_found');
  return row;
}

export function createLocalLinksRepository(db: LocalDb, userId: string): LinksRepository {
  const backlinksQuery = (type: string, ref: string, where = '1', params: SqlValue[] = [], limit?: number) => ({
    sql: `SELECT ${COLUMNS} FROM links
          WHERE deleted_at IS NULL AND target_type = ? AND target_ref = ? AND ${where}
          ORDER BY created_at DESC, id DESC${limit !== undefined ? ' LIMIT ?' : ''}`,
    params: [type, ref, ...params, ...(limit !== undefined ? [limit] : [])],
  });

  /** Idempotente: o mesmo link ativo (origem, alvo, relação, origem do link) não duplica. */
  async function insert(tx: LocalQueries, source: SourceAddress, link: DesiredLink, origin: Link['origin']): Promise<Link> {
    const existing = await tx.getOptional<Link>(
      `SELECT ${COLUMNS} FROM links WHERE deleted_at IS NULL AND source_type = ? AND source_id = ?
       AND target_type = ? AND target_ref = ? AND relation = ? AND origin = ?`,
      [source.type, source.id, link.target_type, link.target_ref, link.relation, origin],
    );
    if (existing) return existing;
    const now = nowIso();
    const row: Link = {
      id: newId(),
      user_id: userId,
      source_type: source.type,
      source_id: source.id,
      target_type: link.target_type,
      target_ref: link.target_ref,
      relation: link.relation,
      origin,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    await tx.execute(
      `INSERT INTO links (id, user_id, source_type, source_id, target_type, target_ref, relation, origin,
       created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [row.id, row.user_id, row.source_type, row.source_id, row.target_type, row.target_ref, row.relation, row.origin,
        row.created_at, row.updated_at, row.deleted_at],
    );
    return row;
  }

  const markDeleted = (tx: LocalQueries, l: Link) => {
    const d = softDelete(l);
    return tx.execute('UPDATE links SET deleted_at = ?, updated_at = ? WHERE id = ?', [d.deleted_at, d.updated_at, d.id]);
  };

  return {
    async outgoing(source) {
      return db.getAll<Link>(
        `SELECT ${COLUMNS} FROM links WHERE deleted_at IS NULL AND source_type = ? AND source_id = ?
         ORDER BY created_at, id`,
        [source.type, source.id],
      );
    },

    async backlinks(target, page) {
      const k = keyset('created_at', page);
      const { sql, params } = backlinksQuery(target.type, target.ref, k.where, k.params, k.fetch);
      return toPage(await db.getAll<Link>(sql, params), k.limit, (l) => l.created_at);
    },

    watchBacklinks(target, listener, onError) {
      const { sql, params } = backlinksQuery(target.type, target.ref, '1', [], 50);
      return db.watch<Link>(sql, params, listener, (e) => onError?.(new RepositoryError('unavailable', { cause: e })));
    },

    async add(source, link) {
      const v = validateNewLink(source, link);
      return db.writeTransaction((tx) => insert(tx, v.source, v.link, 'manual'));
    },

    async remove(id) {
      await db.writeTransaction(async (tx) => markDeleted(tx, await aliveLink(tx, id)));
    },

    async applyMarkdownDiff(source, diff) {
      // Valida tudo antes de gravar qualquer coisa (atomicidade).
      const adds = diff.add.map((l) => validateNewLink(source, l));
      await db.writeTransaction(async (tx) => {
        const removing: Link[] = [];
        for (const id of diff.remove) {
          const l = await tx.getOptional<Link>(`SELECT ${COLUMNS} FROM links WHERE id = ? AND deleted_at IS NULL`, [id]);
          if (!l || l.origin !== 'markdown' || l.source_type !== source.type || l.source_id !== source.id) {
            throw new RepositoryError('validation');
          }
          removing.push(l);
        }
        for (const l of removing) await markDeleted(tx, l);
        for (const v of adds) await insert(tx, v.source, v.link, 'markdown');
      });
    },
  };
}

// Paginação por cursor (keyset) para os repositórios locais: ordem decrescente por (coluna, id).
import { encodeCursor, normalizePageRequest, type CursorKey, type Page, type PageRequest, type SqlValue } from '@glife/domain/core';

export interface KeysetQuery {
  /** trecho de WHERE (sempre parametrizado) */
  where: string;
  params: SqlValue[];
  /** busca limit + 1 para saber se há próxima página */
  fetch: number;
  limit: number;
}

/**
 * `sortColumn` vem sempre de uma constante do repositório, nunca de quem chama.
 * Cursor adulterado vira RepositoryError('validation') (normalizePageRequest).
 */
export function keyset(sortColumn: string, req?: PageRequest): KeysetQuery {
  const { limit, cursor } = normalizePageRequest(req);
  if (!cursor) return { where: '1', params: [], fetch: limit + 1, limit };
  return {
    where: `(${sortColumn} < ? OR (${sortColumn} = ? AND id < ?))`,
    params: [cursor.sort, cursor.sort, cursor.id],
    fetch: limit + 1,
    limit,
  };
}

/** Recebe até limit + 1 linhas já ordenadas e monta a página. */
export function toPage<T extends { id: string }>(rows: T[], limit: number, sortOf: (row: T) => string | number): Page<T> {
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  return { items, nextCursor: rows.length > limit && last ? encodeCursor({ sort: sortOf(last), id: last.id }) : null };
}

/** Mesma paginação feita em memória (para filtros que o SQLite não resolve, como maiúsculas acentuadas). */
export function paginateRows<T extends { id: string }>(rows: T[], sortOf: (row: T) => string | number, req?: PageRequest): Page<T> {
  const { limit, cursor } = normalizePageRequest(req);
  const after = (row: T, c: CursorKey) => {
    const s = sortOf(row);
    return s < c.sort || (s === c.sort && row.id < c.id);
  };
  const sorted = rows
    .slice()
    .sort((a, b) => {
      const sa = sortOf(a);
      const sb = sortOf(b);
      if (sa !== sb) return sa < sb ? 1 : -1;
      return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
    })
    .filter((r) => !cursor || after(r, cursor));
  return toPage(sorted, limit, sortOf);
}

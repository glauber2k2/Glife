// RowStore genérico sobre o banco local (SQLite via PowerSync): guarda e lê linhas de um conjunto fixo de tabelas,
// só do dono da sessão. Booleano vira 0/1; colunas JSON (listas) viram texto. As regras ficam no domain.
// SQL sempre parametrizado; nome de tabela e de coluna só da lista declarada (nunca texto de fora).
import { RepositoryError, type LocalDb, type LocalQueries, type RowMap, type RowStore, type RowStoreTx, type SqlValue } from '@glife/domain/core';
import type { Table } from '@powersync/common';

export interface RowCodecs {
  /** colunas booleanas (0/1 no SQLite) */
  booleans?: readonly string[];
  /** colunas com lista guardada como texto JSON (inválida ou vazia = lista vazia) */
  json?: readonly string[];
}

async function unavailable<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof RepositoryError) throw e;
    throw new RepositoryError('unavailable', { cause: e });
  }
}

export function createLocalRowStore<R extends RowMap>(
  db: LocalDb,
  userId: string,
  tables: Record<keyof R & string, Table>,
  codecs: RowCodecs = {},
): RowStore<R> {
  const names = Object.keys(tables) as (keyof R & string)[];
  const booleans = new Set(codecs.booleans);
  const json = new Set(codecs.json);
  const columnsOf = (table: keyof R & string) => ['id', ...tables[table].columns.map((c) => c.name)];
  const tableName = (table: keyof R & string) => {
    if (!names.includes(table)) throw new RepositoryError('validation');
    return table;
  };

  const decode = <K extends keyof R & string>(row: Record<string, unknown>): R[K] => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (booleans.has(k)) out[k] = v === 1 || v === true;
      else if (json.has(k)) out[k] = parseJson(v);
      else out[k] = v ?? null;
    }
    return out as R[K];
  };
  const encode = (table: keyof R & string, row: object): SqlValue[] =>
    columnsOf(table).map((c) => {
      const v = (row as Record<string, unknown>)[c];
      if (typeof v === 'boolean') return v ? 1 : 0;
      if (json.has(c)) return JSON.stringify(v ?? []);
      return (v ?? null) as SqlValue;
    });

  const on = (q: LocalQueries): RowStoreTx<R> => ({
    get: (table, id) =>
      unavailable(async () => {
        const row = await q.getOptional<Record<string, unknown>>(
          `SELECT ${columnsOf(table).join(', ')} FROM ${tableName(table)} WHERE id = ? AND user_id = ?`,
          [id, userId],
        );
        return row ? decode<typeof table>(row) : null;
      }),
    listAlive: (table) =>
      unavailable(async () =>
        (
          await q.getAll<Record<string, unknown>>(
            `SELECT ${columnsOf(table).join(', ')} FROM ${tableName(table)} WHERE user_id = ? AND deleted_at IS NULL`,
            [userId],
          )
        ).map((r) => decode<typeof table>(r)),
      ),
    put: (table, row) =>
      unavailable(async () => {
        const name = tableName(table);
        if (row.user_id !== userId) throw new RepositoryError('validation');
        const cols = columnsOf(table);
        const values = encode(table, row);
        // As tabelas do PowerSync são views: sem ON CONFLICT; atualiza se existe (do dono), senão insere.
        const exists = await q.getOptional<{ user_id: string }>(`SELECT user_id FROM ${name} WHERE id = ?`, [row.id]);
        if (exists && exists.user_id !== userId) throw new RepositoryError('not_found');
        if (exists) {
          const sets = cols.slice(1).map((c) => `${c} = ?`).join(', ');
          await q.execute(`UPDATE ${name} SET ${sets} WHERE id = ?`, [...values.slice(1), row.id]);
        } else {
          await q.execute(`INSERT INTO ${name} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, values);
        }
      }),
  });

  // Sinal de mudança: conta e última atualização de cada tabela da feature.
  const watchSql = `SELECT ${names.map((n, i) => `(SELECT count(*) || max(updated_at) FROM ${n} WHERE user_id = ?) AS t${i}`).join(', ')}`;

  return {
    ...on(db),
    transaction: (fn) => unavailable(() => db.writeTransaction((tx) => fn(on(tx)))),
    watch: (onChange, onError) => db.watch(watchSql, names.map(() => userId), () => onChange(), onError),
  };
}

function parseJson(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (typeof v !== 'string') return [];
  try {
    const parsed: unknown = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

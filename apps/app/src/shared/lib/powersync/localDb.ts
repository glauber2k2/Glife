// Adapta o PowerSyncDatabase ao contrato LocalDb do domain (o que os repositórios locais usam).
import type { LocalDb, LocalQueries, SqlValue } from '@glife/domain/core';

type Params = SqlValue[] | undefined;

interface QueriesLike {
  getAll<T>(sql: string, params?: Params): Promise<T[]>;
  getOptional<T>(sql: string, params?: Params): Promise<T | null>;
  execute(sql: string, params?: Params): Promise<unknown>;
}

/** Subconjunto estrutural do PowerSyncDatabase usado aqui (facilita testar sem o SDK). */
export interface PowerSyncLike extends QueriesLike {
  writeTransaction<R>(fn: (tx: QueriesLike) => Promise<R>): Promise<R>;
  watch(
    sql: string,
    params: Params,
    handler: { onResult: (r: { rows?: { _array: unknown[] } }) => void; onError?: (e: Error) => void },
    options?: { signal?: AbortSignal },
  ): void;
}

const queries = (q: QueriesLike): LocalQueries => ({
  getAll: (sql, params) => q.getAll(sql, params),
  getOptional: (sql, params) => q.getOptional(sql, params),
  execute: async (sql, params) => {
    await q.execute(sql, params);
  },
});

export function toLocalDb(ps: PowerSyncLike): LocalDb {
  return {
    ...queries(ps),
    writeTransaction: (fn) => ps.writeTransaction((tx) => fn(queries(tx))),
    watch<T>(sql: string, params: SqlValue[], onRows: (rows: T[]) => void, onError?: (e: unknown) => void) {
      const abort = new AbortController();
      ps.watch(
        sql,
        params,
        { onResult: (r) => onRows((r.rows?._array ?? []) as T[]), onError },
        { signal: abort.signal },
      );
      return () => abort.abort();
    },
  };
}

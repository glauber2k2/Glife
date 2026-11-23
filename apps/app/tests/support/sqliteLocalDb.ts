// LocalDb de teste sobre sql.js (SQLite em WebAssembly, em memória). Cria as tabelas a partir dos schemas
// locais (os mesmos do PowerSync) e reemite as consultas observadas a cada escrita.
import type { LocalDb, LocalQueries, SqlValue } from '@glife/domain/core';
import type { Table } from '@powersync/common';
import initSqlJs, { type Database } from 'sql.js';

let sqlPromise: ReturnType<typeof initSqlJs> | null = null;

export async function createSqliteLocalDb(tables: Record<string, Table>): Promise<LocalDb> {
  const SQL = await (sqlPromise ??= initSqlJs());
  const db: Database = new SQL.Database();
  for (const [name, table] of Object.entries(tables)) {
    const cols = table.columns.map((c) => `${c.name} ${c.type === 'INTEGER' ? 'INTEGER' : 'TEXT'}`);
    db.run(`CREATE TABLE ${name} (id TEXT PRIMARY KEY NOT NULL, ${cols.join(', ')})`);
  }

  const all = <T>(sql: string, params: SqlValue[] = []): T[] => {
    const stmt = db.prepare(sql);
    try {
      stmt.bind(params);
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as T);
      return rows;
    } finally {
      stmt.free();
    }
  };

  const watchers = new Set<() => void>();
  const notify = () => {
    for (const w of [...watchers]) queueMicrotask(() => watchers.has(w) && w());
  };

  const queries: LocalQueries = {
    async getAll(sql, params) {
      return all(sql, params);
    },
    async getOptional<T>(sql: string, params?: SqlValue[]) {
      return all<T>(sql, params)[0] ?? null;
    },
    async execute(sql, params = []) {
      db.run(sql, params);
    },
  };

  // Transações em fila: o sql.js é síncrono, mas as funções de transação são assíncronas.
  let lock: Promise<unknown> = Promise.resolve();

  return {
    ...queries,
    async execute(sql, params) {
      await queries.execute(sql, params);
      notify();
    },
    writeTransaction<R>(fn: (tx: LocalQueries) => Promise<R>): Promise<R> {
      const run = lock.then(async () => {
        db.run('BEGIN');
        try {
          const result = await fn(queries);
          db.run('COMMIT');
          notify();
          return result;
        } catch (e) {
          db.run('ROLLBACK');
          throw e;
        }
      });
      lock = run.catch(() => {});
      return run;
    },
    watch(sql, params, onRows, onError) {
      const emit = () => {
        try {
          onRows(all(sql, params));
        } catch (e) {
          onError?.(e);
        }
      };
      watchers.add(emit);
      queueMicrotask(() => watchers.has(emit) && emit());
      return () => void watchers.delete(emit);
    },
  };
}

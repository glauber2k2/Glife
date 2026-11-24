// LocalDb de teste sobre node:sqlite (SQLite em memória, com FTS5). Imita o formato do PowerSync: cada tabela é
// uma view sobre `ps_data__<tabela>(id, data JSON)`, gravada por gatilhos INSTEAD OF — assim gatilhos e
// consultas que dependem desse formato (índice de busca) são testados contra o mesmo desenho do aparelho.
// Reemite as consultas observadas a cada escrita.
import type { LocalDb, LocalQueries, SqlValue } from '@glife/domain/core';
import type { Table } from '@powersync/common';
import { DatabaseSync } from 'node:sqlite';

const quote = (name: string) => `"${name.replace(/"/g, '""')}"`;

function createPowerSyncLikeTable(db: DatabaseSync, name: string, table: Table) {
  const data = `ps_data__${name}`;
  const cols = table.columns.map((c) => c.name);
  const view = cols.map(
    (c, i) => `CAST(json_extract(data, '$.${c}') AS ${table.columns[i]!.type === 'INTEGER' ? 'INTEGER' : 'TEXT'})`,
  );
  const json = `json_object(${cols.map((c) => `'${c}', NEW.${quote(c)}`).join(', ')})`;
  db.exec(`
    CREATE TABLE ${quote(data)} (id TEXT PRIMARY KEY NOT NULL, data TEXT);
    CREATE VIEW ${quote(name)} (id, ${cols.map(quote).join(', ')}) AS SELECT id, ${view.join(', ')} FROM ${quote(data)};
    CREATE TRIGGER ${quote(`${name}_insert`)} INSTEAD OF INSERT ON ${quote(name)} BEGIN
      INSERT INTO ${quote(data)} (id, data) VALUES (NEW.id, ${json});
    END;
    CREATE TRIGGER ${quote(`${name}_update`)} INSTEAD OF UPDATE ON ${quote(name)} BEGIN
      UPDATE ${quote(data)} SET data = ${json} WHERE id = OLD.id;
    END;
    CREATE TRIGGER ${quote(`${name}_delete`)} INSTEAD OF DELETE ON ${quote(name)} BEGIN
      DELETE FROM ${quote(data)} WHERE id = OLD.id;
    END;
  `);
}

export async function createSqliteLocalDb(tables: Record<string, Table>): Promise<LocalDb> {
  const db = new DatabaseSync(':memory:');
  for (const [name, table] of Object.entries(tables)) createPowerSyncLikeTable(db, name, table);

  const all = <T>(sql: string, params: SqlValue[] = []): T[] =>
    db.prepare(sql).all(...params).map((row) => ({ ...row }) as T);

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
      db.prepare(sql).run(...params);
    },
  };

  // Transações em fila: o node:sqlite é síncrono, mas as funções de transação são assíncronas.
  let lock: Promise<unknown> = Promise.resolve();

  return {
    ...queries,
    async execute(sql, params) {
      await queries.execute(sql, params);
      notify();
    },
    writeTransaction<R>(fn: (tx: LocalQueries) => Promise<R>): Promise<R> {
      const run = lock.then(async () => {
        db.exec('BEGIN');
        try {
          const result = await fn(queries);
          db.exec('COMMIT');
          notify();
          return result;
        } catch (e) {
          db.exec('ROLLBACK');
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

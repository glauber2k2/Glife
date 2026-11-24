// FinanceStore sobre o banco local (SQLite via PowerSync). Só guarda e lê linhas; as regras ficam em
// `createFinanceRepositories` (domain), as mesmas da implementação em memória. SQL sempre parametrizado.
import { RepositoryError, type LocalDb, type LocalQueries, type SqlValue } from '@glife/domain/core';
import {
  createFinanceRepositories,
  type FinanceRepositories,
  type FinanceRows,
  type FinanceStore,
  type FinanceStoreTx,
  type FinanceTable,
  type Transaction,
  type TransactionRangeQuery,
} from '@glife/domain/finance';

import { financeTables } from './schema';

const TABLES = Object.keys(financeTables) as FinanceTable[];
const BOOLEAN_COLUMNS = new Set(['archived']);
const columnsOf = (table: FinanceTable) => ['id', ...financeTables[table].columns.map((c) => c.name)];

/** Nome de tabela só da lista fixa (nunca vem de fora, mas garante que não há SQL montado com texto livre). */
function tableName(table: FinanceTable): string {
  if (!TABLES.includes(table)) throw new RepositoryError('validation');
  return table;
}

function fromRow<K extends FinanceTable>(row: Record<string, unknown>): FinanceRows[K] {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[k] = BOOLEAN_COLUMNS.has(k) ? v === 1 : (v ?? null);
  return out as FinanceRows[K];
}

function toValues(table: FinanceTable, row: object): SqlValue[] {
  const r = row as Record<string, unknown>;
  return columnsOf(table).map((c) => {
    const v = r[c];
    if (typeof v === 'boolean') return v ? 1 : 0;
    return (v ?? null) as SqlValue;
  });
}

const TX_COLUMNS = columnsOf('transactions').join(', ');
const RANGE_SQL = (accountFilter: boolean) =>
  `SELECT ${TX_COLUMNS} FROM transactions WHERE user_id = ? AND deleted_at IS NULL AND date >= ? AND date <= ?` +
  (accountFilter ? ' AND (account_id = ? OR to_account_id = ?)' : '') +
  ' ORDER BY date, id';
const rangeParams = (userId: string, q: TransactionRangeQuery): SqlValue[] =>
  q.accountId ? [userId, q.from, q.to, q.accountId, q.accountId] : [userId, q.from, q.to];

async function unavailable<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof RepositoryError) throw e;
    throw new RepositoryError('unavailable', { cause: e });
  }
}

function storeOn(q: LocalQueries, userId: string): FinanceStoreTx {
  return {
    get: (table, id) =>
      unavailable(async () => {
        const row = await q.getOptional<Record<string, unknown>>(
          `SELECT ${columnsOf(table).join(', ')} FROM ${tableName(table)} WHERE id = ? AND user_id = ?`,
          [id, userId],
        );
        return row ? fromRow(row) : null;
      }),
    listAlive: (table) =>
      unavailable(async () =>
        (
          await q.getAll<Record<string, unknown>>(
            `SELECT ${columnsOf(table).join(', ')} FROM ${tableName(table)} WHERE user_id = ? AND deleted_at IS NULL`,
            [userId],
          )
        ).map((r) => fromRow(r)),
      ),
    transactionsInRange: (query) =>
      unavailable(async () =>
        (await q.getAll<Record<string, unknown>>(RANGE_SQL(!!query.accountId), rangeParams(userId, query))).map(
          (r) => fromRow<'transactions'>(r) as Transaction,
        ),
      ),
    transactionsByInvoice: (cardId, month) =>
      unavailable(async () =>
        (
          await q.getAll<Record<string, unknown>>(
            `SELECT ${TX_COLUMNS} FROM transactions WHERE user_id = ? AND deleted_at IS NULL AND invoice_month = ?
             AND (account_id = ? OR to_account_id = ?) ORDER BY date, id`,
            [userId, month, cardId, cardId],
          )
        ).map((r) => fromRow<'transactions'>(r) as Transaction),
      ),
    transactionsForRecurrences: (ids) =>
      unavailable(async () =>
        (
          await q.getAll<Record<string, unknown>>(
            `SELECT ${TX_COLUMNS} FROM transactions WHERE user_id = ? AND deleted_at IS NULL
             AND recurrence_id IN (${ids.map(() => '?').join(', ')}) ORDER BY occurrence_date, id`,
            [userId, ...ids],
          )
        ).map((r) => fromRow<'transactions'>(r) as Transaction),
      ),
    put: (table, row) =>
      unavailable(async () => {
        const name = tableName(table);
        const cols = columnsOf(table);
        const values = toValues(table, row);
        // As tabelas do PowerSync são views: nada de ON CONFLICT; atualiza se existe, senão insere.
        const exists = await q.getOptional<{ id: string }>(`SELECT id FROM ${name} WHERE id = ?`, [row.id]);
        if (exists) {
          const sets = cols.slice(1).map((c) => `${c} = ?`).join(', ');
          await q.execute(`UPDATE ${name} SET ${sets} WHERE id = ?`, [...values.slice(1), row.id]);
        } else {
          await q.execute(`INSERT INTO ${name} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, values);
        }
      }),
  };
}

export function createLocalFinanceStore(db: LocalDb, userId: string): FinanceStore {
  return {
    ...storeOn(db, userId),
    transaction: (fn) => unavailable(() => db.writeTransaction((tx) => fn(storeOn(tx, userId)))),
    watchTransactions: (query, onRows, onError) =>
      db.watch<Record<string, unknown>>(
        RANGE_SQL(!!query.accountId),
        rangeParams(userId, query),
        (rows) => onRows(rows.map((r) => fromRow<'transactions'>(r) as Transaction)),
        onError,
      ),
  };
}

export function createLocalFinance(db: LocalDb, userId: string, clock?: () => Date): FinanceRepositories {
  return createFinanceRepositories(createLocalFinanceStore(db, userId), userId, clock);
}

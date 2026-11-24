// FinanceStore em memória: referência executável do contrato de finanças. Não persiste nada.
import type { Unsubscribe } from '../core/index.ts';
import {
  createFinanceRepositories,
  type FinanceRepositories,
  type FinanceRows,
  type FinanceStore,
  type FinanceStoreTx,
  type FinanceTable,
  type Transaction,
  type TransactionRangeQuery,
} from '../finance/index.ts';

type Tables = { [K in FinanceTable]: Map<string, FinanceRows[K]> };

const emptyTables = (): Tables => ({
  accounts: new Map(),
  categories: new Map(),
  transactions: new Map(),
  recurrences: new Map(),
  budgets: new Map(),
});

const copy = (t: Tables): Tables =>
  Object.fromEntries(Object.entries(t).map(([k, m]) => [k, new Map(m as Map<string, unknown>)])) as Tables;

const inRange = (q: TransactionRangeQuery) => (t: Transaction) =>
  t.deleted_at === null &&
  t.date >= q.from &&
  t.date <= q.to &&
  (!q.accountId || t.account_id === q.accountId || t.to_account_id === q.accountId);

const byDate = (a: Transaction, b: Transaction) => (a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.id < b.id ? -1 : 1);

export function createInMemoryFinanceStore(userId: string): FinanceStore {
  let tables = emptyTables();
  const watchers = new Set<() => void>();
  const notify = () => queueMicrotask(() => watchers.forEach((w) => w()));

  const view = (get: () => Tables): FinanceStoreTx => ({
    async get(table, id) {
      const row = get()[table].get(id) as FinanceRows[typeof table] | undefined;
      return row && row.user_id === userId ? structuredClone(row) : null;
    },
    async listAlive(table) {
      return [...get()[table].values()]
        .filter((r) => r.user_id === userId && r.deleted_at === null)
        .map((r) => structuredClone(r)) as never;
    },
    async transactionsInRange(q) {
      return [...get().transactions.values()].filter((t) => t.user_id === userId).filter(inRange(q)).sort(byDate).map((t) => structuredClone(t));
    },
    async transactionsByInvoice(cardId, month) {
      return [...get().transactions.values()]
        .filter((t) => t.user_id === userId && t.deleted_at === null && t.invoice_month === month)
        .filter((t) => t.account_id === cardId || t.to_account_id === cardId)
        .sort(byDate)
        .map((t) => structuredClone(t));
    },
    async transactionsForRecurrences(ids) {
      return [...get().transactions.values()]
        .filter((t) => t.user_id === userId && t.deleted_at === null && t.recurrence_id !== null && ids.includes(t.recurrence_id))
        .sort((a, b) => (a.occurrence_date! !== b.occurrence_date! ? (a.occurrence_date! < b.occurrence_date! ? -1 : 1) : a.id < b.id ? -1 : 1))
        .map((t) => structuredClone(t));
    },
    async put(table, row) {
      (get()[table] as Map<string, unknown>).set(row.id, structuredClone(row));
    },
  });

  const base = view(() => tables);
  return {
    ...base,
    async put(table, row) {
      await base.put(table, row);
      notify();
    },
    async transaction(fn) {
      const draft = copy(tables);
      const result = await fn(view(() => draft));
      tables = draft;
      notify();
      return result;
    },
    watchTransactions(q, onRows): Unsubscribe {
      const emit = () => void base.transactionsInRange(q).then(onRows);
      watchers.add(emit);
      emit();
      return () => watchers.delete(emit);
    },
  };
}

export function createInMemoryFinance(userId: string, clock?: () => Date): FinanceRepositories {
  return createFinanceRepositories(createInMemoryFinanceStore(userId), userId, clock);
}

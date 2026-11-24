// Repositórios de finanças. As regras entre tabelas (conta existe, categoria combina, cartão tem conta pagadora,
// ocorrência com id determinístico, orçamento único) ficam aqui, uma vez só; cada plataforma implementa apenas o
// `FinanceStore` (guardar e ler linhas): memória em `@glife/domain/testing`, SQLite em `features/finance/data`.
//
// Regras comuns (iguais às de notas): o dono é sempre o da sessão; leituras ignoram excluídos; registro de outro
// dono = inexistente; erros são sempre RepositoryError.
import {
  RepositoryError,
  isRepositoryError,
  nowIso,
  softDelete,
  restore as restoreEntity,
  type ErrorListener,
  type Listener,
  type Unsubscribe,
} from '../core/index.ts';
import type { IsoDate, Month } from './calendar.ts';
import { invoiceMonthFor } from './invoice.ts';
import {
  applyAccountPatch,
  applyCategoryPatch,
  applyRecurrencePatch,
  applyTransactionPatch,
  checkCategoryFits,
  newAccount,
  newBudget,
  newCategory,
  newRecurrence,
  newTransaction,
  type Account,
  type AccountDraft,
  type AccountPatch,
  type Budget,
  type Category,
  type CategoryDraft,
  type CategoryKind,
  type CategoryPatch,
  type Recurrence,
  type RecurrenceDraft,
  type RecurrencePatch,
  type Transaction,
  type TransactionDraft,
  type TransactionPatch,
} from './model.ts';
import { occurrenceId, splitRecurrence } from './recurrence.ts';

// ---------- Interfaces usadas pelas telas ----------

export interface AccountsRepository {
  /** Por nome. Arquivadas só com `includeArchived`. */
  list(query?: { includeArchived?: boolean }): Promise<Account[]>;
  get(id: string): Promise<Account | null>;
  /** Cartão: a conta pagadora precisa existir e não ser cartão (`validation`). */
  create(draft: AccountDraft): Promise<Account>;
  update(id: string, patch: AccountPatch): Promise<Account>;
  archive(id: string): Promise<Account>;
  /** Exclusão lógica. */
  remove(id: string): Promise<void>;
}

export interface CategoriesRepository {
  list(query?: { kind?: CategoryKind; includeArchived?: boolean }): Promise<Category[]>;
  get(id: string): Promise<Category | null>;
  create(draft: CategoryDraft): Promise<Category>;
  update(id: string, patch: CategoryPatch): Promise<Category>;
  archive(id: string): Promise<Category>;
}

export interface TransactionRangeQuery {
  from: IsoDate;
  to: IsoDate;
  accountId?: string;
}

/** Rascunho que pode trazer o id já decidido (parcelas apontam para a primeira; ocorrências têm id fixo). */
export type TransactionInput = TransactionDraft & { id?: string };

export interface TransactionsRepository {
  get(id: string): Promise<Transaction | null>;
  /** Por data e id, inclusive nas duas pontas; `accountId` pega origem ou destino. */
  listRange(query: TransactionRangeQuery): Promise<Transaction[]>;
  /** Compras, estornos e pagamentos de uma fatura do cartão. */
  listByInvoice(cardId: string, month: Month): Promise<Transaction[]>;
  watchRange(query: TransactionRangeQuery, listener: Listener<Transaction[]>, onError?: ErrorListener): Unsubscribe;
  /**
   * Compra/estorno no cartão sem `invoice_month` ganha o mês da fatura pela data. Pagamento de fatura (transferência
   * para cartão) exige `invoice_month` (use `suggestInvoiceToPay`).
   */
  create(input: TransactionInput): Promise<Transaction>;
  /** Tudo ou nada. */
  createMany(inputs: readonly TransactionInput[]): Promise<Transaction[]>;
  update(id: string, patch: TransactionPatch): Promise<Transaction>;
  confirm(id: string, changes?: { amount_cents?: number; date?: IsoDate }): Promise<Transaction>;
  skip(id: string): Promise<Transaction>;
  /** Grava a ocorrência de uma regra pelo id determinístico; se já existe (mesmo excluída), substitui. */
  upsertOccurrence(input: TransactionDraft & { id: string }): Promise<Transaction>;
  remove(id: string): Promise<void>;
  restore(id: string): Promise<Transaction>;
}

export interface RecurrencesRepository {
  /** Regras sem fim ou que terminam em `on` ou depois. */
  listActive(on: IsoDate): Promise<Recurrence[]>;
  get(id: string): Promise<Recurrence | null>;
  create(draft: RecurrenceDraft): Promise<Recurrence>;
  /** Edição no lugar (para mudanças desde o início da regra). */
  update(id: string, patch: RecurrencePatch): Promise<Recurrence>;
  end(id: string, endDate: IsoDate): Promise<Recurrence>;
  /** "Este e os próximos": encerra na véspera de `from` e cria a nova regra, juntas. */
  split(id: string, from: IsoDate, changes: Partial<RecurrenceDraft>): Promise<{ ended: Recurrence; next: Recurrence }>;
}

export interface BudgetsRepository {
  list(): Promise<Budget[]>;
  /** Um por categoria de despesa e mês: substitui o valor se já existir. */
  set(categoryId: string, startsMonth: Month, amountCents: number): Promise<Budget>;
  remove(id: string): Promise<void>;
}

export interface FinanceRepositories {
  accounts: AccountsRepository;
  categories: CategoriesRepository;
  transactions: TransactionsRepository;
  recurrences: RecurrencesRepository;
  budgets: BudgetsRepository;
}

// ---------- Armazenamento (o que cada plataforma implementa) ----------

export interface FinanceRows {
  accounts: Account;
  categories: Category;
  transactions: Transaction;
  recurrences: Recurrence;
  budgets: Budget;
}
export type FinanceTable = keyof FinanceRows;
export type SmallFinanceTable = Exclude<FinanceTable, 'transactions'>;

export interface FinanceStoreReads {
  /** Linha do dono da sessão, inclusive excluída; de outro dono ou inexistente = null. */
  get<K extends FinanceTable>(table: K, id: string): Promise<FinanceRows[K] | null>;
  /** Linhas não excluídas do dono (tabelas pequenas). */
  listAlive<K extends SmallFinanceTable>(table: K): Promise<FinanceRows[K][]>;
  /** Transações não excluídas no período, por `date` e `id`. */
  transactionsInRange(query: TransactionRangeQuery): Promise<Transaction[]>;
  /** Transações não excluídas da fatura: do cartão ou para o cartão, com aquele `invoice_month`. */
  transactionsByInvoice(cardId: string, month: Month): Promise<Transaction[]>;
}

export interface FinanceStoreTx extends FinanceStoreReads {
  /** Insere ou substitui pela chave `id`. */
  put<K extends FinanceTable>(table: K, row: FinanceRows[K]): Promise<void>;
}

export interface FinanceStore extends FinanceStoreTx {
  /** Tudo dentro de `fn` grava junto ou nada grava. */
  transaction<R>(fn: (tx: FinanceStoreTx) => Promise<R>): Promise<R>;
  watchTransactions(query: TransactionRangeQuery, onRows: (rows: Transaction[]) => void, onError?: (e: unknown) => void): Unsubscribe;
}

// ---------- Implementação comum ----------

const invalid = (cause?: unknown) => new RepositoryError('validation', { cause });
const notFound = () => new RepositoryError('not_found');

/** Erros de regra do domain (RangeError) viram `validation`; o resto passa como está. */
async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (isRepositoryError(e)) throw e;
    if (e instanceof RangeError) throw invalid(e);
    throw new RepositoryError('unavailable', { cause: e });
  }
}

const byName = <T extends { name: string; id: string }>(a: T, b: T) =>
  a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) || (a.id < b.id ? -1 : 1);

export function createFinanceRepositories(store: FinanceStore, userId: string, clock?: () => Date): FinanceRepositories {
  async function alive<K extends FinanceTable>(db: FinanceStoreReads, table: K, id: string): Promise<FinanceRows[K]> {
    const row = await db.get(table, id);
    if (!row || row.deleted_at !== null) throw notFound();
    return row;
  }
  async function aliveOrInvalid<K extends FinanceTable>(db: FinanceStoreReads, table: K, id: string) {
    const row = await db.get(table, id);
    if (!row || row.deleted_at !== null) throw invalid();
    return row;
  }

  async function checkAccount(db: FinanceStoreReads, a: Account) {
    if (a.kind !== 'credit_card') return;
    const payer = await aliveOrInvalid(db, 'accounts', a.payment_account_id!);
    if (payer.kind === 'credit_card' || payer.id === a.id) throw invalid();
  }

  /** Confere referências e completa o mês da fatura. Devolve a linha pronta para gravar. */
  async function checkMovement<T extends Transaction | Recurrence>(db: FinanceStoreReads, row: T): Promise<T> {
    const account = await aliveOrInvalid(db, 'accounts', row.account_id);
    const target = row.to_account_id ? await aliveOrInvalid(db, 'accounts', row.to_account_id) : null;
    const category = row.category_id ? await aliveOrInvalid(db, 'categories', row.category_id) : null;
    if (!checkCategoryFits(row.type, account.kind, category)) throw invalid();
    if (!('invoice_month' in row)) return row;
    const tx = row as Transaction;
    if (account.kind === 'credit_card' && tx.type !== 'transfer' && tx.invoice_month === null) {
      return { ...row, invoice_month: invoiceMonthFor(tx.date, { closing_day: account.closing_day!, due_day: account.due_day! }) };
    }
    if (target?.kind === 'credit_card' && tx.invoice_month === null) throw invalid();
    return row;
  }

  async function buildTransaction(db: FinanceStoreReads, input: TransactionInput): Promise<Transaction> {
    const { id, ...draft } = input;
    const base = newTransaction(draft, userId, clock);
    return checkMovement(db, id ? { ...base, id } : base);
  }

  async function changeTransaction(id: string, patch: TransactionPatch) {
    return guard(() =>
      store.transaction(async (db) => {
        const current = await alive(db, 'transactions', id);
        const next = await checkMovement(db, applyTransactionPatch(current, patch, clock));
        await db.put('transactions', next);
        return next;
      }),
    );
  }

  const accounts: AccountsRepository = {
    list: (query = {}) =>
      guard(async () =>
        (await store.listAlive('accounts')).filter((a) => query.includeArchived || !a.archived).sort(byName),
      ),
    get: (id) => guard(async () => ((r) => (r && r.deleted_at === null ? r : null))(await store.get('accounts', id))),
    create: (draft) =>
      guard(() =>
        store.transaction(async (db) => {
          const a = newAccount(draft, userId, clock);
          await checkAccount(db, a);
          await db.put('accounts', a);
          return a;
        }),
      ),
    update: (id, patch) =>
      guard(() =>
        store.transaction(async (db) => {
          const a = applyAccountPatch(await alive(db, 'accounts', id), patch, clock);
          await checkAccount(db, a);
          await db.put('accounts', a);
          return a;
        }),
      ),
    archive: (id) => accounts.update(id, { archived: true }),
    remove: (id) =>
      guard(() =>
        store.transaction(async (db) => {
          await db.put('accounts', softDelete(await alive(db, 'accounts', id), clock));
        }),
      ),
  };

  const categories: CategoriesRepository = {
    list: (query = {}) =>
      guard(async () =>
        (await store.listAlive('categories'))
          .filter((c) => (query.includeArchived || !c.archived) && (!query.kind || c.kind === query.kind))
          .sort(byName),
      ),
    get: (id) => guard(async () => ((r) => (r && r.deleted_at === null ? r : null))(await store.get('categories', id))),
    create: (draft) =>
      guard(async () => {
        const c = newCategory(draft, userId, clock);
        await store.put('categories', c);
        return c;
      }),
    update: (id, patch) =>
      guard(() =>
        store.transaction(async (db) => {
          const c = applyCategoryPatch(await alive(db, 'categories', id), patch, clock);
          await db.put('categories', c);
          return c;
        }),
      ),
    archive: (id) => categories.update(id, { archived: true }),
  };

  const transactions: TransactionsRepository = {
    get: (id) => guard(async () => ((r) => (r && r.deleted_at === null ? r : null))(await store.get('transactions', id))),
    listRange: (query) => guard(() => store.transactionsInRange(query)),
    listByInvoice: (cardId, month) => guard(() => store.transactionsByInvoice(cardId, month)),
    watchRange: (query, listener, onError) =>
      store.watchTransactions(query, listener, (e) => onError?.(isRepositoryError(e) ? e : new RepositoryError('unavailable', { cause: e }))),
    create: (input) =>
      guard(() =>
        store.transaction(async (db) => {
          const t = await buildTransaction(db, input);
          if (input.id && (await db.get('transactions', input.id))) throw new RepositoryError('conflict');
          await db.put('transactions', t);
          return t;
        }),
      ),
    createMany: (inputs) =>
      guard(() =>
        store.transaction(async (db) => {
          const rows: Transaction[] = [];
          for (const input of inputs) rows.push(await buildTransaction(db, input));
          for (const t of rows) await db.put('transactions', t);
          return rows;
        }),
      ),
    update: changeTransaction,
    confirm: (id, changes = {}) => changeTransaction(id, { ...changes, status: 'confirmed' }),
    skip: (id) => changeTransaction(id, { status: 'skipped' }),
    upsertOccurrence: (input) =>
      guard(() =>
        store.transaction(async (db) => {
          if (!input.recurrence_id || !input.occurrence_date) throw invalid();
          if (input.id !== occurrenceId(input.recurrence_id, input.occurrence_date)) throw invalid();
          await aliveOrInvalid(db, 'recurrences', input.recurrence_id);
          const built = await buildTransaction(db, input);
          const existing = await db.get('transactions', input.id);
          const row = existing ? { ...built, created_at: existing.created_at, updated_at: nowIso(clock) } : built;
          await db.put('transactions', row);
          return row;
        }),
      ),
    remove: (id) =>
      guard(() =>
        store.transaction(async (db) => {
          await db.put('transactions', softDelete(await alive(db, 'transactions', id), clock));
        }),
      ),
    restore: (id) =>
      guard(() =>
        store.transaction(async (db) => {
          const current = await db.get('transactions', id);
          if (!current) throw notFound();
          const t = restoreEntity(current, clock);
          await db.put('transactions', t);
          return t;
        }),
      ),
  };

  const recurrences: RecurrencesRepository = {
    listActive: (on) =>
      guard(async () =>
        (await store.listAlive('recurrences'))
          .filter((r) => r.end_date === null || r.end_date >= on)
          .sort((a, b) => (a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : a.id < b.id ? -1 : 1)),
      ),
    get: (id) => guard(async () => ((r) => (r && r.deleted_at === null ? r : null))(await store.get('recurrences', id))),
    create: (draft) =>
      guard(() =>
        store.transaction(async (db) => {
          const r = await checkMovement(db, newRecurrence(draft, userId, clock));
          await db.put('recurrences', r);
          return r;
        }),
      ),
    update: (id, patch) =>
      guard(() =>
        store.transaction(async (db) => {
          const r = await checkMovement(db, applyRecurrencePatch(await alive(db, 'recurrences', id), patch, clock));
          await db.put('recurrences', r);
          return r;
        }),
      ),
    end: (id, endDate) => recurrences.update(id, { end_date: endDate }),
    split: (id, from, changes) =>
      guard(() =>
        store.transaction(async (db) => {
          const current = await alive(db, 'recurrences', id);
          const { endedPatch, next } = splitRecurrence(current, from, changes);
          const ended = applyRecurrencePatch(current, endedPatch, clock);
          const created = await checkMovement(db, newRecurrence(next, userId, clock));
          await db.put('recurrences', ended);
          await db.put('recurrences', created);
          return { ended, next: created };
        }),
      ),
  };

  const budgets: BudgetsRepository = {
    list: () =>
      guard(async () =>
        (await store.listAlive('budgets')).sort((a, b) =>
          a.category_id === b.category_id ? (a.starts_month < b.starts_month ? -1 : 1) : a.category_id < b.category_id ? -1 : 1,
        ),
      ),
    set: (categoryId, startsMonth, amountCents) =>
      guard(() =>
        store.transaction(async (db) => {
          const category = await aliveOrInvalid(db, 'categories', categoryId);
          if (category.kind !== 'expense') throw invalid();
          const candidate = newBudget({ category_id: categoryId, starts_month: startsMonth, amount_cents: amountCents }, userId, clock);
          const existing = (await db.listAlive('budgets')).find((b) => b.category_id === categoryId && b.starts_month === startsMonth);
          const row = existing ? { ...existing, amount_cents: candidate.amount_cents, updated_at: nowIso(clock) } : candidate;
          await db.put('budgets', row);
          return row;
        }),
      ),
    remove: (id) =>
      guard(() =>
        store.transaction(async (db) => {
          await db.put('budgets', softDelete(await alive(db, 'budgets', id), clock));
        }),
      ),
  };

  return { accounts, categories, transactions, recurrences, budgets };
}

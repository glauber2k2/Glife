// Repositório de compras, sobre o mesmo FinanceStore de finanças: o "Comprei" grava o gasto e limpa a lista
// numa transação só (tudo ou nada), e o desfazer volta as duas coisas juntas.
import { RepositoryError, nowIso, restore, softDelete, type ErrorListener, type Listener, type Unsubscribe } from '../core/index.ts';
import type { IsoDate } from './calendar.ts';
import type { Transaction } from './model.ts';
import type { FinanceStore, FinanceStoreReads, TransactionInput } from './repository.ts';
import {
  afterPurchase,
  applyShoppingItemPatch,
  applyShoppingListPatch,
  newShoppingItem,
  newShoppingList,
  type AfterPurchase,
  type ShoppingItem,
  type ShoppingItemPatch,
  type ShoppingList,
  type ShoppingListDraft,
  type ShoppingListPatch,
} from './shopping.ts';

export interface ShoppingSnapshot {
  lists: ShoppingList[];
  items: ShoppingItem[];
}

export interface PurchaseInput {
  listId: string;
  /** categoria de gasto do lançamento; fica lembrada na lista */
  categoryId: string | null;
  date: IsoDate;
  after: AfterPurchase;
  /** linhas do gasto (uma na conta; uma por parcela no cartão), já com a categoria e a descrição */
  transactions: readonly TransactionInput[];
}

/** O que o "Comprei" mudou, para desfazer. */
export interface PurchaseReceipt {
  transactionIds: string[];
  previousList: ShoppingList;
  previousItems: ShoppingItem[];
}

export interface ShoppingRepository {
  /** Listas e itens não excluídos (listas por nome; itens do mais novo ao mais antigo). */
  snapshot(): Promise<ShoppingSnapshot>;
  watch(listener: Listener<ShoppingSnapshot>, onError?: ErrorListener): Unsubscribe;
  createList(draft: ShoppingListDraft): Promise<ShoppingList>;
  updateList(id: string, patch: ShoppingListPatch): Promise<ShoppingList>;
  /** Exclui a lista com os itens (lógico). Devolve os ids dos itens que saíram junto, para desfazer. */
  removeList(id: string): Promise<string[]>;
  restoreList(id: string, itemIds: readonly string[]): Promise<void>;
  addItem(listId: string, name: string): Promise<ShoppingItem>;
  updateItem(id: string, patch: ShoppingItemPatch): Promise<ShoppingItem>;
  /** Vai para outra lista, fora do carrinho. */
  moveItem(id: string, toListId: string): Promise<ShoppingItem>;
  removeItem(id: string): Promise<void>;
  restoreItem(id: string): Promise<void>;
  /** Grava o gasto, limpa o carrinho e marca a data da compra, juntos. Carrinho vazio = `validation`. */
  purchase(input: PurchaseInput): Promise<PurchaseReceipt>;
  /** Exclui o gasto e volta a lista e os itens como estavam. */
  undoPurchase(receipt: PurchaseReceipt): Promise<void>;
}

export interface ShoppingDeps {
  store: FinanceStore;
  userId: string;
  clock?: () => Date;
  /** Regras de finanças para montar o gasto (conta existe, categoria combina, mês da fatura). */
  buildTransaction: (db: FinanceStoreReads, input: TransactionInput) => Promise<Transaction>;
  guard: <T>(fn: () => Promise<T>) => Promise<T>;
}

const invalid = () => new RepositoryError('validation');
const notFound = () => new RepositoryError('not_found');

const byName = (a: ShoppingList, b: ShoppingList) =>
  a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) || (a.id < b.id ? -1 : 1);
const newestFirst = (a: ShoppingItem, b: ShoppingItem) =>
  a.created_at !== b.created_at ? (a.created_at < b.created_at ? 1 : -1) : a.id < b.id ? 1 : -1;

export function createShoppingRepository({ store, userId, clock, buildTransaction, guard }: ShoppingDeps): ShoppingRepository {
  async function alive<K extends 'shopping_lists' | 'shopping_items'>(db: FinanceStoreReads, table: K, id: string) {
    const row = await db.get(table, id);
    if (!row || row.deleted_at !== null) throw notFound();
    return row;
  }
  async function aliveList(db: FinanceStoreReads, id: string) {
    const row = await db.get('shopping_lists', id);
    if (!row || row.deleted_at !== null) throw invalid();
    return row;
  }
  async function checkCategory(db: FinanceStoreReads, id: string | null) {
    if (id === null) return;
    const c = await db.get('categories', id);
    if (!c || c.deleted_at !== null || c.kind !== 'expense') throw invalid();
  }

  async function snapshot(db: FinanceStoreReads = store): Promise<ShoppingSnapshot> {
    const [lists, items] = await Promise.all([db.listAlive('shopping_lists'), db.listAlive('shopping_items')]);
    const listIds = new Set(lists.map((l) => l.id));
    return { lists: lists.sort(byName), items: items.filter((i) => listIds.has(i.list_id)).sort(newestFirst) };
  }

  const repo: ShoppingRepository = {
    snapshot: () => guard(() => snapshot()),
    watch: (listener, onError) => {
      let active = true;
      const fail = (e: unknown) => onError?.(e instanceof RepositoryError ? e : new RepositoryError('unavailable', { cause: e }));
      const stop = store.watchShopping(() => {
        void snapshot().then((s) => active && listener(s), fail);
      }, fail);
      return () => {
        active = false;
        stop();
      };
    },
    createList: (draft) =>
      guard(() =>
        store.transaction(async (db) => {
          const list = newShoppingList(draft, userId, clock);
          await checkCategory(db, list.category_id);
          await db.put('shopping_lists', list);
          return list;
        }),
      ),
    updateList: (id, changes) =>
      guard(() =>
        store.transaction(async (db) => {
          const list = applyShoppingListPatch(await alive(db, 'shopping_lists', id), changes, clock);
          await checkCategory(db, list.category_id);
          await db.put('shopping_lists', list);
          return list;
        }),
      ),
    removeList: (id) =>
      guard(() =>
        store.transaction(async (db) => {
          const list = await alive(db, 'shopping_lists', id);
          const items = (await db.listAlive('shopping_items')).filter((i) => i.list_id === id);
          for (const i of items) await db.put('shopping_items', softDelete(i, clock));
          await db.put('shopping_lists', softDelete(list, clock));
          return items.map((i) => i.id);
        }),
      ),
    restoreList: (id, itemIds) =>
      guard(() =>
        store.transaction(async (db) => {
          const list = await db.get('shopping_lists', id);
          if (!list) throw notFound();
          await db.put('shopping_lists', restore(list, clock));
          for (const itemId of itemIds) {
            const item = await db.get('shopping_items', itemId);
            if (item) await db.put('shopping_items', restore(item, clock));
          }
        }),
      ),
    addItem: (listId, name) =>
      guard(() =>
        store.transaction(async (db) => {
          await aliveList(db, listId);
          const item = newShoppingItem({ list_id: listId, name }, userId, clock);
          await db.put('shopping_items', item);
          return item;
        }),
      ),
    updateItem: (id, changes) =>
      guard(() =>
        store.transaction(async (db) => {
          if ('list_id' in changes) throw invalid();
          const item = applyShoppingItemPatch(await alive(db, 'shopping_items', id), changes, clock);
          await db.put('shopping_items', item);
          return item;
        }),
      ),
    moveItem: (id, toListId) =>
      guard(() =>
        store.transaction(async (db) => {
          await aliveList(db, toListId);
          const item = applyShoppingItemPatch(await alive(db, 'shopping_items', id), { list_id: toListId, in_cart: false }, clock);
          await db.put('shopping_items', item);
          return item;
        }),
      ),
    removeItem: (id) =>
      guard(() =>
        store.transaction(async (db) => {
          await db.put('shopping_items', softDelete(await alive(db, 'shopping_items', id), clock));
        }),
      ),
    restoreItem: (id) =>
      guard(() =>
        store.transaction(async (db) => {
          const item = await db.get('shopping_items', id);
          if (!item) throw notFound();
          await db.put('shopping_items', restore(item, clock));
        }),
      ),
    purchase: (input) =>
      guard(() =>
        store.transaction(async (db) => {
          const list = await alive(db, 'shopping_lists', input.listId);
          await checkCategory(db, input.categoryId);
          const items = (await db.listAlive('shopping_items')).filter((i) => i.list_id === list.id);
          const { removed, reset } = afterPurchase(items, input.after);
          if (removed.length + reset.length === 0 || input.transactions.length === 0) throw invalid();
          const rows: Transaction[] = [];
          for (const t of input.transactions) {
            if (t.type !== 'expense' || (t.category_id ?? null) !== input.categoryId) throw invalid();
            const row = await buildTransaction(db, t);
            if (await db.get('transactions', row.id)) throw new RepositoryError('conflict');
            rows.push(row);
          }
          for (const row of rows) await db.put('transactions', row);
          for (const i of removed) await db.put('shopping_items', softDelete(i, clock));
          for (const i of reset) await db.put('shopping_items', { ...i, in_cart: false, updated_at: nowIso(clock) });
          await db.put(
            'shopping_lists',
            applyShoppingListPatch(list, { category_id: input.categoryId, last_purchase_date: input.date }, clock),
          );
          return { transactionIds: rows.map((r) => r.id), previousList: list, previousItems: [...removed, ...reset] };
        }),
      ),
    undoPurchase: (receipt) =>
      guard(() =>
        store.transaction(async (db) => {
          for (const id of receipt.transactionIds) {
            const t = await db.get('transactions', id);
            if (t && t.deleted_at === null) await db.put('transactions', softDelete(t, clock));
          }
          const now = nowIso(clock);
          await db.put('shopping_lists', { ...receipt.previousList, updated_at: now });
          for (const i of receipt.previousItems) await db.put('shopping_items', { ...i, updated_at: now });
        }),
      ),
  };
  return repo;
}

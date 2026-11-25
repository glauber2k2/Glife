// Compras: listas e itens. Cada lista tem uma categoria de gasto; o "Comprei" transforma o carrinho num gasto
// (conta ou cartão, gravado pelo repositório junto com a limpeza da lista). Aqui só modelo e contas puras.
import { z } from 'zod';

import { baseEntitySchema } from '../core/index.ts';
import { isoDateSchema } from './calendar.ts';
import { TX_DESCRIPTION_MAX, build, patch, positiveCents, singleLine } from './model.ts';

export const SHOPPING_LIST_NAME_MAX = 60;
export const SHOPPING_ITEM_NAME_MAX = 120;
export const SHOPPING_QUANTITY_MAX = 999;

// ---------- Listas ----------

const listFields = z.object({
  name: singleLine(SHOPPING_LIST_NAME_MAX).min(1),
  category_id: z.uuid().nullable(),
  last_purchase_date: isoDateSchema.nullable(),
});

export const shoppingListSchema = baseEntitySchema.extend(listFields.shape);
export type ShoppingList = z.infer<typeof shoppingListSchema>;
export type ShoppingListDraft = Partial<z.input<typeof listFields>> & Pick<z.input<typeof listFields>, 'name'>;
export type ShoppingListPatch = Partial<z.input<typeof listFields>>;

export function newShoppingList(draft: ShoppingListDraft, userId: string, clock?: () => Date): ShoppingList {
  return build(listFields, { category_id: null, last_purchase_date: null }, draft, userId, clock);
}
export function applyShoppingListPatch(list: ShoppingList, changes: ShoppingListPatch, clock?: () => Date): ShoppingList {
  return patch(listFields, list, changes, clock);
}

// ---------- Itens ----------

const itemFields = z.object({
  list_id: z.uuid(),
  name: singleLine(SHOPPING_ITEM_NAME_MAX).min(1),
  quantity: z.number().int().min(1).max(SHOPPING_QUANTITY_MAX),
  unit_price_cents: positiveCents.nullable(),
  in_cart: z.boolean(),
  always: z.boolean(),
});

export const shoppingItemSchema = baseEntitySchema.extend(itemFields.shape);
export type ShoppingItem = z.infer<typeof shoppingItemSchema>;
export type ShoppingItemDraft = Partial<z.input<typeof itemFields>> & Pick<z.input<typeof itemFields>, 'list_id' | 'name'>;
export type ShoppingItemPatch = Partial<Omit<z.input<typeof itemFields>, 'list_id'>>;

const ITEM_DEFAULTS = { quantity: 1, unit_price_cents: null, in_cart: false, always: false };

export function newShoppingItem(draft: ShoppingItemDraft, userId: string, clock?: () => Date): ShoppingItem {
  return build(itemFields, ITEM_DEFAULTS, draft, userId, clock);
}
export function applyShoppingItemPatch(
  item: ShoppingItem,
  changes: ShoppingItemPatch & { list_id?: string },
  clock?: () => Date,
): ShoppingItem {
  return patch(itemFields, item, changes, clock);
}

// ---------- Contas ----------

/** Preço da linha (quantidade × unidade); null sem preço. */
export const itemTotal = (item: Pick<ShoppingItem, 'quantity' | 'unit_price_cents'>): number | null =>
  item.unit_price_cents === null ? null : item.unit_price_cents * item.quantity;

export interface ItemsTotal {
  count: number;
  totalCents: number;
  /** algum item sem preço: o total é aproximado (≈) */
  approx: boolean;
}

function totalOf(items: readonly ShoppingItem[]): ItemsTotal {
  return {
    count: items.length,
    totalCents: items.reduce((acc, i) => acc + (itemTotal(i) ?? 0), 0),
    approx: items.some((i) => i.unit_price_cents === null),
  };
}

/** Só o carrinho (itens marcados). */
export const cartOf = (items: readonly ShoppingItem[]): ItemsTotal => totalOf(items.filter((i) => i.in_cart));

export interface ListSummary extends ItemsTotal {
  /** itens que ainda faltam (fora do carrinho) */
  pending: number;
  /** algum item com preço (sem nenhum, a lista não mostra total) */
  priced: boolean;
}

export function listSummary(items: readonly ShoppingItem[]): ListSummary {
  return { ...totalOf(items), pending: items.filter((i) => !i.in_cart).length, priced: items.some((i) => i.unit_price_cents !== null) };
}

/** O que acontece com o carrinho depois do "Comprei": sai da lista ou volta aos pendentes. "Sempre" volta sempre. */
export type AfterPurchase = 'remove' | 'keep';

export function afterPurchase(items: readonly ShoppingItem[], mode: AfterPurchase): { removed: ShoppingItem[]; reset: ShoppingItem[] } {
  const cart = items.filter((i) => i.in_cart);
  const removed = mode === 'remove' ? cart.filter((i) => !i.always) : [];
  return { removed, reset: cart.filter((i) => !removed.includes(i)) };
}

/** Descrição do gasto: nome da lista e os itens, até o limite da transação ("Mercado: Arroz 5 kg, Café…"). */
export function purchaseDescription(listName: string, cart: readonly Pick<ShoppingItem, 'name'>[]): string {
  const full = cart.length === 0 ? listName : `${listName}: ${cart.map((i) => i.name).join(', ')}`;
  return full.length <= TX_DESCRIPTION_MAX ? full : `${full.slice(0, TX_DESCRIPTION_MAX - 1).trimEnd()}…`;
}

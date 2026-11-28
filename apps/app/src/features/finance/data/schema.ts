// Tabelas locais (SQLite via PowerSync) de finanças. Espelham supabase/migrations (conferido em tests/localSchema.test.ts).
// `id` é implícito; booleano e números (centavos, dias) viram integer; datas, meses e uuids são texto.
import { Table, column } from '@powersync/common';

import type { SyncTableLabel } from '@/shared/lib/powersync';

const base = {
  user_id: column.text,
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
};
const movement = {
  type: column.text,
  amount_cents: column.integer,
  account_id: column.text,
  to_account_id: column.text,
  category_id: column.text,
  description: column.text,
};

export const financeTables = {
  accounts: new Table({
    ...base,
    name: column.text,
    kind: column.text,
    initial_balance_cents: column.integer,
    archived: column.integer,
    closing_day: column.integer,
    due_day: column.integer,
    credit_limit_cents: column.integer,
    payment_account_id: column.text,
    sort_order: column.integer,
  }),
  categories: new Table({
    ...base,
    name: column.text,
    kind: column.text,
    color: column.text,
    icon: column.text,
    archived: column.integer,
    sort_order: column.integer,
  }),
  recurrences: new Table({
    ...base,
    ...movement,
    frequency: column.text,
    interval_count: column.integer,
    start_date: column.text,
    end_date: column.text,
  }),
  transactions: new Table(
    {
      ...base,
      ...movement,
      status: column.text,
      date: column.text,
      invoice_month: column.text,
      installment_of: column.text,
      installment_index: column.integer,
      installment_count: column.integer,
      recurrence_id: column.text,
      occurrence_date: column.text,
      is_adjustment: column.integer,
    },
    {
      indexes: {
        by_date: ['date'],
        by_invoice: ['account_id', 'invoice_month'],
        by_target: ['to_account_id'],
      },
    },
  ),
  budgets: new Table({
    ...base,
    category_id: column.text,
    starts_month: column.text,
    amount_cents: column.integer,
  }),
  shopping_lists: new Table({
    ...base,
    name: column.text,
    category_id: column.text,
    last_purchase_date: column.text,
  }),
  shopping_items: new Table(
    {
      ...base,
      list_id: column.text,
      name: column.text,
      quantity: column.integer,
      unit_price_cents: column.integer,
      in_cart: column.integer,
      always: column.integer,
    },
    { indexes: { by_list: ['list_id'] } },
  ),
  investment_assets: new Table({
    ...base,
    name: column.text,
    kind: column.text,
    institution: column.text,
    notes: column.text,
    quote_symbol: column.text,
    last_price_e8: column.integer,
    last_price_at: column.text,
  }),
  investment_movements: new Table(
    {
      ...base,
      asset_id: column.text,
      kind: column.text,
      amount_cents: column.integer,
      quantity: column.integer,
      date: column.text,
      account_id: column.text,
      notes: column.text,
    },
    { indexes: { by_asset: ['asset_id'] } },
  ),
  investment_targets: new Table({
    ...base,
    fixed_income: column.integer,
    stocks: column.integer,
    reits: column.integer,
    funds: column.integer,
    crypto: column.integer,
    other: column.integer,
  }),
};

/** Nome de cada tabela na fila de envio e nas contagens de Ajustes › Sincronização (nunca o conteúdo). */
export const financeTableLabels: Record<keyof typeof financeTables, SyncTableLabel> = {
  accounts: { noun: 'Conta', gender: 'f' },
  categories: { noun: 'Categoria', gender: 'f' },
  recurrences: { noun: 'Recorrente', gender: 'm' },
  transactions: { noun: 'Lançamento', gender: 'm', count: 'transactions' },
  budgets: { noun: 'Orçamento', gender: 'm' },
  shopping_lists: { noun: 'Lista de compras', gender: 'f' },
  shopping_items: { noun: 'Item de compra', gender: 'm' },
  investment_assets: { noun: 'Investimento', gender: 'm' },
  investment_movements: { noun: 'Movimentação', gender: 'f' },
  investment_targets: { noun: 'Meta de alocação', gender: 'f' },
};

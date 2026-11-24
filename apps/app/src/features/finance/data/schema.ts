// Tabelas locais (SQLite via PowerSync) de finanças. Espelham supabase/migrations (conferido em tests/localSchema.test.ts).
// `id` é implícito; booleano e números (centavos, dias) viram integer; datas, meses e uuids são texto.
import { Table, column } from '@powersync/common';

const base = { user_id: column.text, created_at: column.text, updated_at: column.text, deleted_at: column.text };
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
  }),
  categories: new Table({
    ...base,
    name: column.text,
    kind: column.text,
    color: column.text,
    icon: column.text,
    archived: column.integer,
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
    },
    { indexes: { by_date: ['date'], by_invoice: ['account_id', 'invoice_month'], by_target: ['to_account_id'] } },
  ),
  budgets: new Table({
    ...base,
    category_id: column.text,
    starts_month: column.text,
    amount_cents: column.integer,
  }),
};

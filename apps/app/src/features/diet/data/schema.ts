// Tabelas locais (SQLite via PowerSync) da dieta. Espelham supabase/migrations (conferido em tests/localSchema.test.ts).
import { Table, column } from '@powersync/common';

const base = { user_id: column.text, created_at: column.text, updated_at: column.text, deleted_at: column.text };

export const dietTables = {
  meal_plans: new Table({
    ...base,
    name: column.text,
    time: column.text,
    description: column.text,
    weekdays: column.integer,
    remind: column.integer,
  }),
  meals: new Table({ ...base, date: column.text, time: column.text, description: column.text, plan_id: column.text }),
};

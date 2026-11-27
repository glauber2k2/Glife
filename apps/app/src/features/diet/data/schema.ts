// Tabelas locais (SQLite via PowerSync) da dieta. Espelham supabase/migrations (conferido em tests/localSchema.test.ts).
import { Table, column } from '@powersync/common';

import type { SyncTableLabel } from '@/shared/lib/powersync';

const nutrition = { kcal: column.integer, protein_g: column.real, carbs_g: column.real, fat_g: column.real };
const base = { user_id: column.text, created_at: column.text, updated_at: column.text, deleted_at: column.text };

export const dietTables = {
  meal_plans: new Table({
    ...base,
    name: column.text,
    time: column.text,
    description: column.text,
    weekdays: column.integer,
    remind: column.integer,
    ...nutrition,
  }),
  meals: new Table({
    ...base,
    date: column.text,
    time: column.text,
    description: column.text,
    plan_id: column.text,
    ...nutrition,
  }),
  diet_goals: new Table({
    ...base,
    kcal_target: column.integer,
    protein_g_target: column.real,
    carbs_g_target: column.real,
    fat_g_target: column.real,
  }),
};

/** Nome de cada tabela na fila de envio e nas contagens de Ajustes › Sincronização (nunca o conteúdo). */
export const dietTableLabels: Record<keyof typeof dietTables, SyncTableLabel> = {
  meal_plans: { noun: 'Refeição do plano', gender: 'f' },
  meals: { noun: 'Refeição', gender: 'f', count: 'diet' },
  diet_goals: { noun: 'Meta da dieta', gender: 'f' },
};

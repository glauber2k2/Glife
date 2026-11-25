// Tabelas locais (SQLite via PowerSync) da agenda. Espelham supabase/migrations (conferido em tests/localSchema.test.ts).
import { Table, column } from '@powersync/common';

const base = { user_id: column.text, created_at: column.text, updated_at: column.text, deleted_at: column.text };
const repeat = {
  start_date: column.text,
  frequency: column.text,
  interval_count: column.integer,
  weekdays: column.integer,
  until: column.text,
  skipped_dates: column.text,
};

export const agendaTables = {
  events: new Table({
    ...base,
    ...repeat,
    title: column.text,
    location: column.text,
    notes: column.text,
    start_time: column.text,
    end_date: column.text,
    end_time: column.text,
    remind_before: column.integer,
  }),
  reminders: new Table({ ...base, ...repeat, title: column.text, notes: column.text, time: column.text, done_at: column.text }),
};

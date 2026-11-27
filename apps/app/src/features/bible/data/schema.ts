// Tabelas locais (SQLite via PowerSync) da Bíblia. Espelham supabase/migrations (conferido em tests/localSchema.test.ts).
// O texto bíblico nunca entra aqui: as traduções embutidas são assets e as importadas ficam em tabelas só locais.
import { Table, column } from '@powersync/common';

import type { SyncTableLabel } from '@/shared/lib/powersync';

const base = { user_id: column.text, created_at: column.text, updated_at: column.text, deleted_at: column.text };

export const bibleTables = {
  bible_highlights: new Table(
    { ...base, ref: column.text, color: column.text, style: column.text, char_start: column.integer, char_end: column.integer },
    { indexes: { by_ref: ['user_id', 'ref'] } },
  ),
  // listas (groups, weekdays) e pausas chegam como texto JSON
  bible_plans: new Table({
    ...base,
    name: column.text,
    groups: column.text,
    days: column.integer,
    weekdays: column.text,
    start_date: column.text,
    reminder_time: column.text,
    color_hue: column.integer,
    pauses: column.text,
    completed_at: column.text,
  }),
  bible_plan_reads: new Table({ ...base, plan_id: column.text, ref: column.text, read_on: column.text }, { indexes: { by_plan: ['user_id', 'plan_id'] } }),
};

/** Nome de cada tabela na fila de envio e nas contagens de Ajustes › Sincronização (nunca o conteúdo). */
export const bibleTableLabels: Record<keyof typeof bibleTables, SyncTableLabel> = {
  bible_highlights: { noun: 'Marcação da Bíblia', gender: 'f' },
  bible_plans: { noun: 'Plano de leitura', gender: 'm' },
  bible_plan_reads: { noun: 'Leitura do plano', gender: 'f' },
};

/**
 * Traduções importadas pelo usuário: tabelas **só locais** (nunca sobem ao Supabase nem passam pelo sync), porque o
 * texto pode ter direitos autorais. Um capítulo por linha (versículos em JSON) para importar rápido.
 */
export const bibleLocalTables = {
  bible_local_translations: new Table({ abbr: column.text, name: column.text, created_at: column.text }, { localOnly: true }),
  bible_local_chapters: new Table(
    { translation_id: column.text, book: column.text, chapter: column.integer, verses: column.text },
    { localOnly: true, indexes: { by_chapter: ['translation_id', 'book', 'chapter'] } },
  ),
};

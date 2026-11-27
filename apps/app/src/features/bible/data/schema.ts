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
};

/** Nome de cada tabela na fila de envio e nas contagens de Ajustes › Sincronização (nunca o conteúdo). */
export const bibleTableLabels: Record<keyof typeof bibleTables, SyncTableLabel> = {
  bible_highlights: { noun: 'Marcação da Bíblia', gender: 'f' },
};

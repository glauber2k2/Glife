// Tabelas locais (SQLite via PowerSync) de notas. Espelham supabase/migrations (conferido em tests/localSchema.test.ts).
// `id` é implícito; booleano vira integer (0/1); datas e uuids são texto.
import { Table, column } from '@powersync/common';

import type { SyncTableLabel } from '@/shared/lib/powersync';

export const notesTables = {
  note_folders: new Table(
    {
      user_id: column.text,
      name: column.text,
      parent_id: column.text,
      created_at: column.text,
      updated_at: column.text,
      deleted_at: column.text,
    },
    { indexes: { parent: ['parent_id'] } },
  ),
  notes: new Table(
    {
      user_id: column.text,
      title: column.text,
      body_md: column.text,
      folder_id: column.text,
      pinned: column.integer,
      kind: column.text,
      created_at: column.text,
      updated_at: column.text,
      deleted_at: column.text,
    },
    { indexes: { recent: ['updated_at'], folder: ['folder_id'] } },
  ),
};

/** Nome de cada tabela na fila de envio e nas contagens de Ajustes › Sincronização (nunca o conteúdo). */
export const notesTableLabels: Record<keyof typeof notesTables, SyncTableLabel> = {
  note_folders: { noun: 'Pasta', gender: 'f' },
  notes: { noun: 'Nota', gender: 'f', count: 'notes' },
};

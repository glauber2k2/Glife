// Tabelas locais (SQLite via PowerSync) do grafo de links e das tags. Espelham supabase/migrations.
import { Table, column } from '@powersync/common';

export const linksTables = {
  links: new Table(
    {
      user_id: column.text,
      source_type: column.text,
      source_id: column.text,
      target_type: column.text,
      target_ref: column.text,
      relation: column.text,
      origin: column.text,
      created_at: column.text,
      updated_at: column.text,
      deleted_at: column.text,
    },
    { indexes: { target: ['target_type', 'target_ref'], source: ['source_type', 'source_id'] } },
  ),
  tags: new Table({
    user_id: column.text,
    name: column.text,
    created_at: column.text,
    updated_at: column.text,
    deleted_at: column.text,
  }),
  entity_tags: new Table(
    {
      user_id: column.text,
      tag_id: column.text,
      entity_type: column.text,
      entity_id: column.text,
      created_at: column.text,
      updated_at: column.text,
      deleted_at: column.text,
    },
    { indexes: { entity: ['entity_type', 'entity_id'] } },
  ),
};

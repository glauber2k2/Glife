// Registro das ações da IA: tabela SÓ LOCAL (nunca sobe ao Supabase), para o conteúdo do que a IA fez ficar no
// aparelho. `touches` guarda, em JSON, os itens tocados e o estado anterior (para desfazer).
import { Table, column } from '@powersync/common';

export const aiLocalTables = {
  ai_actions: new Table(
    {
      conversation_id: column.text,
      tool: column.text,
      summary: column.text,
      touches: column.text,
      created_at: column.text,
      seq: column.integer,
      undone_at: column.text,
    },
    { localOnly: true, indexes: { by_seq: ['seq'] } },
  ),
};

// Ferramentas do agente Glife IA para notas. Só definições (entrada e risco); quem executa é o app
// (`features/notes`), com o repositório de notas. Ids chegam como apelidos (`n1`, `p1`), nunca UUID.
import { z } from 'zod';

import { defineAiTool } from '../ai/tool.ts';
import { NOTE_BODY_MAX, NOTE_TITLE_MAX } from './model.ts';

const alias = z.string().trim().min(1).max(20);
const title = z
  .string()
  .trim()
  .max(NOTE_TITLE_MAX)
  .refine((s) => !/[\r\n]/.test(s), 'Uma linha só.');

export const NOTES_AI_TOOLS = [
  defineAiTool({
    name: 'notes_search',
    description: 'Procura notas pelo título ou pelo texto. Sem "query", traz as mais recentes. Devolve apelidos (n1, n2…).',
    risk: 'read',
    input: z.object({
      query: z.string().trim().max(200).optional(),
      pinned: z.boolean().optional(),
      limit: z.number().int().min(1).max(20).default(10),
    }),
  }),
  defineAiTool({
    name: 'notes_get',
    description: 'Lê o texto completo de uma nota pelo apelido.',
    risk: 'read',
    input: z.object({ note: alias }),
  }),
  defineAiTool({
    name: 'notes_create',
    description: 'Cria uma nota (markdown). "folder" é o apelido de uma pasta já conhecida.',
    risk: 'write',
    input: z.object({
      title,
      body_md: z.string().max(NOTE_BODY_MAX).optional(),
      folder: alias.optional(),
      pinned: z.boolean().optional(),
    }),
  }),
  defineAiTool({
    name: 'notes_update',
    description: 'Altera título, texto, pasta ou fixação de uma nota. Mande só o que muda; folder null tira da pasta.',
    risk: 'write',
    input: z
      .object({
        note: alias,
        title: title.optional(),
        body_md: z.string().max(NOTE_BODY_MAX).optional(),
        folder: alias.nullable().optional(),
        pinned: z.boolean().optional(),
      })
      .refine((p) => p.title !== undefined || p.body_md !== undefined || p.folder !== undefined || p.pinned !== undefined, 'Diga o que muda.'),
  }),
  defineAiTool({
    name: 'notes_trash',
    description: 'Manda notas para a lixeira (dá para restaurar). O usuário confirma antes.',
    risk: 'confirm',
    bulk: true,
    input: z.object({ notes: z.array(alias).min(1).max(20) }),
  }),
];

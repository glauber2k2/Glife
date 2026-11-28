// Ferramentas do agente Glife IA para a agenda (eventos e lembretes). Só definições; quem executa é o app
// (`features/agenda`). Ids chegam como apelidos (`e1`, `r1`). Repetição fica para depois: só itens avulsos.
import { z } from 'zod';

import { defineAiTool } from '../ai/tool.ts';
import { daysBetween, isoDateSchema, localTimeSchema } from '../time/index.ts';
import { EVENT_LOCATION_MAX, EVENT_NOTES_MAX, EVENT_TITLE_MAX, REMIND_BEFORE_MAX, REMINDER_NOTES_MAX, REMINDER_TITLE_MAX } from './model.ts';

const AGENDA_LIST_MAX_DAYS = 62;

const alias = z.string().trim().min(1).max(20);
const line = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((s) => !/[\r\n]/.test(s), 'Uma linha só.');

const eventFields = {
  title: line(EVENT_TITLE_MAX).min(1),
  start_date: isoDateSchema,
  /** omitido ou null = dia inteiro */
  start_time: localTimeSchema.nullable().optional(),
  end_date: isoDateSchema.optional(),
  end_time: localTimeSchema.nullable().optional(),
  location: line(EVENT_LOCATION_MAX).nullable().optional(),
  notes: z.string().max(EVENT_NOTES_MAX).optional(),
  /** minutos antes do início; null = sem aviso */
  remind_before: z.number().int().min(0).max(REMIND_BEFORE_MAX).nullable().optional(),
};

const reminderFields = {
  title: line(REMINDER_TITLE_MAX).min(1),
  start_date: isoDateSchema,
  time: localTimeSchema,
  notes: z.string().max(REMINDER_NOTES_MAX).optional(),
};

const someChange = (p: Record<string, unknown>, key: string) => Object.keys(p).some((k) => k !== key && p[k] !== undefined);

export const AGENDA_AI_TOOLS = [
  defineAiTool({
    name: 'agenda_list',
    description: `Lista eventos e lembretes entre duas datas (AAAA-MM-DD, até ${AGENDA_LIST_MAX_DAYS} dias). Devolve apelidos (e1, r1…).`,
    risk: 'read',
    input: z
      .object({ from: isoDateSchema, to: isoDateSchema })
      .refine((r) => daysBetween(r.from, r.to) >= 0, 'O início é depois do fim.')
      .refine((r) => daysBetween(r.from, r.to) <= AGENDA_LIST_MAX_DAYS, `No máximo ${AGENDA_LIST_MAX_DAYS} dias.`),
  }),
  defineAiTool({
    name: 'event_create',
    description: 'Cria um compromisso. Datas AAAA-MM-DD e horas HH:MM; sem start_time é de dia inteiro.',
    risk: 'write',
    input: z.object(eventFields),
  }),
  defineAiTool({
    name: 'event_update',
    description: 'Altera um compromisso pelo apelido. Mande só o que muda.',
    risk: 'write',
    input: z
      .object({ event: alias, ...Object.fromEntries(Object.entries(eventFields).map(([k, v]) => [k, v.optional()])) })
      .refine((p) => someChange(p, 'event'), 'Diga o que muda.'),
  }),
  defineAiTool({
    name: 'event_trash',
    description: 'Manda um compromisso para a lixeira (dá para restaurar). O usuário confirma antes.',
    risk: 'confirm',
    input: z.object({ event: alias }),
  }),
  defineAiTool({
    name: 'reminder_create',
    description: 'Cria um lembrete avulso. Data AAAA-MM-DD e hora HH:MM.',
    risk: 'write',
    input: z.object(reminderFields),
  }),
  defineAiTool({
    name: 'reminder_update',
    description: 'Altera um lembrete pelo apelido. Mande só o que muda.',
    risk: 'write',
    input: z
      .object({ reminder: alias, ...Object.fromEntries(Object.entries(reminderFields).map(([k, v]) => [k, v.optional()])) })
      .refine((p) => someChange(p, 'reminder'), 'Diga o que muda.'),
  }),
  defineAiTool({
    name: 'reminder_complete',
    description: 'Marca um lembrete como feito na data (e no horário, se ele tiver vários).',
    risk: 'write',
    input: z.object({ reminder: alias, date: isoDateSchema, time: localTimeSchema.optional() }),
  }),
  defineAiTool({
    name: 'reminder_trash',
    description: 'Manda um lembrete para a lixeira (dá para restaurar). O usuário confirma antes.',
    risk: 'confirm',
    input: z.object({ reminder: alias }),
  }),
];

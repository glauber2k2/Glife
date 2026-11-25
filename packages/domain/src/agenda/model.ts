// Agenda: eventos (com início, fim opcional, local, repetição e aviso antes) e lembretes avulsos ("Comprar ração
// sábado 9h", com repetição). Datas e horas são de calendário, sem fuso.
import { z } from 'zod';

import { createEntity, updateEntity, type BaseEntity } from '../core/index.ts';
import {
  isoDateSchema,
  localTimeSchema,
  repeatFields,
  repeatProblem,
  weekdayBit,
  weekdayOf,
  type IsoDate,
} from '../time/index.ts';

export const EVENT_TITLE_MAX = 200;
export const EVENT_LOCATION_MAX = 200;
export const EVENT_NOTES_MAX = 2000;
export const REMINDER_TITLE_MAX = 200;
export const REMINDER_NOTES_MAX = 1000;
/** Aviso até 7 dias antes. */
export const REMIND_BEFORE_MAX = 7 * 24 * 60;
/** Evento de dia inteiro avisa a partir das 9h do dia. */
export const ALL_DAY_NOTICE_TIME = '09:00';

const singleLine = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((s) => !/[\r\n]/.test(s), 'Uma linha só');
const issue = (ctx: z.RefinementCtx, message: string) => ctx.addIssue({ code: 'custom', message });
const skipped = z.array(isoDateSchema).max(500);

// ---------- Eventos ----------

const eventFields = z.object({
  title: singleLine(EVENT_TITLE_MAX).min(1, 'Dê um título'),
  location: singleLine(EVENT_LOCATION_MAX).nullable(),
  notes: z.string().max(EVENT_NOTES_MAX),
  start_date: isoDateSchema,
  /** null = dia inteiro */
  start_time: localTimeSchema.nullable(),
  end_date: isoDateSchema,
  end_time: localTimeSchema.nullable(),
  ...repeatFields,
  skipped_dates: skipped,
  /** minutos antes do início; null = sem aviso */
  remind_before: z.number().int().min(0).max(REMIND_BEFORE_MAX).nullable(),
});

const eventData = eventFields.superRefine((e, ctx) => {
  if (e.start_time === null && e.end_time !== null) issue(ctx, 'Evento de dia inteiro não tem hora de fim');
  const start = `${e.start_date}T${e.start_time ?? '00:00'}`;
  const end = `${e.end_date}T${e.end_time ?? e.start_time ?? '00:00'}`;
  if (end < start) issue(ctx, 'O fim é antes do início');
  const p = repeatProblem(e);
  if (p) issue(ctx, p);
  if (e.frequency !== 'none' && e.end_date !== e.start_date) issue(ctx, 'Evento que se repete começa e termina no mesmo dia');
});

export type CalendarEvent = z.infer<typeof eventFields> & BaseEntity;
export type EventDraft = Partial<z.input<typeof eventFields>> & Pick<z.input<typeof eventFields>, 'title' | 'start_date'>;
export type EventPatch = Partial<z.input<typeof eventFields>>;

/** Semanal sem dias marcados = o dia da semana do início (fica explícito na linha). */
function normalizeRepeat<T extends { frequency?: string; weekdays?: number; start_date?: string; end_date?: string }>(d: T): T {
  const out = { ...d };
  if (out.frequency === 'weekly' && !out.weekdays && out.start_date) out.weekdays = weekdayBit(weekdayOf(out.start_date));
  if (out.frequency && out.frequency !== 'weekly') out.weekdays = 0;
  return out;
}

const EVENT_DEFAULTS = {
  location: null,
  notes: '',
  start_time: null,
  end_time: null,
  frequency: 'none' as const,
  interval_count: 1,
  weekdays: 0,
  until: null,
  skipped_dates: [],
  remind_before: null,
};

export function newEvent(draft: EventDraft, userId: string, clock?: () => Date): CalendarEvent {
  const d = normalizeRepeat({ end_date: draft.start_date, ...draft });
  return createEntity(eventData, EVENT_DEFAULTS, d, userId, clock) as CalendarEvent;
}

export function applyEventPatch(event: CalendarEvent, changes: EventPatch, clock?: () => Date): CalendarEvent {
  const merged = normalizeRepeat({ ...event, ...Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined)) });
  return updateEntity(eventData, event, merged, clock);
}

/** Pula uma ocorrência (só em evento que se repete e numa data que existe na série). */
export function skipEventDate(event: CalendarEvent, date: IsoDate, clock?: () => Date): CalendarEvent {
  if (event.frequency === 'none') throw new RangeError('Evento único: exclua em vez de pular');
  if (event.skipped_dates.includes(date)) return event;
  return applyEventPatch(event, { skipped_dates: [...event.skipped_dates, date].sort() }, clock);
}


// ---------- Lembretes avulsos ----------

const reminderFields = z.object({
  title: singleLine(REMINDER_TITLE_MAX).min(1, 'Dê um título'),
  notes: z.string().max(REMINDER_NOTES_MAX),
  start_date: isoDateSchema,
  time: localTimeSchema,
  ...repeatFields,
  skipped_dates: skipped,
  /** lembrete único concluído (instante); repetido não conclui, pula a data */
  done_at: z.string().datetime({ offset: true }).nullable(),
});

const reminderData = reminderFields.superRefine((r, ctx) => {
  const p = repeatProblem(r);
  if (p) issue(ctx, p);
  if (r.frequency !== 'none' && r.done_at !== null) issue(ctx, 'Lembrete que se repete não é concluído; pule a data');
});

export type Reminder = z.infer<typeof reminderFields> & BaseEntity;
export type ReminderDraft = Partial<z.input<typeof reminderFields>> & Pick<z.input<typeof reminderFields>, 'title' | 'start_date' | 'time'>;
export type ReminderPatch = Partial<z.input<typeof reminderFields>>;

const REMINDER_DEFAULTS = {
  notes: '',
  frequency: 'none' as const,
  interval_count: 1,
  weekdays: 0,
  until: null,
  skipped_dates: [],
  done_at: null,
};

export function newReminder(draft: ReminderDraft, userId: string, clock?: () => Date): Reminder {
  return createEntity(reminderData, REMINDER_DEFAULTS, normalizeRepeat(draft), userId, clock) as Reminder;
}

export function applyReminderPatch(reminder: Reminder, changes: ReminderPatch, clock?: () => Date): Reminder {
  const merged = normalizeRepeat({ ...reminder, ...Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined)) });
  return updateEntity(reminderData, reminder, merged, clock);
}

/** Concluir: o único fica marcado; o que se repete pula esta data. */
export function completeReminder(reminder: Reminder, date: IsoDate, clock?: () => Date): Reminder {
  if (reminder.frequency === 'none') return applyReminderPatch(reminder, { done_at: (clock ?? (() => new Date()))().toISOString() }, clock);
  if (reminder.skipped_dates.includes(date)) return reminder;
  return applyReminderPatch(reminder, { skipped_dates: [...reminder.skipped_dates, date].sort() }, clock);
}

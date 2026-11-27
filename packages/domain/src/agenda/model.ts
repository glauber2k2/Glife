// Agenda: eventos (com início, fim opcional, local, repetição e aviso antes) e lembretes avulsos ("Comprar ração
// sábado 9h", com repetição). Datas e horas são de calendário, sem fuso.
import { z } from 'zod';

import { createEntity, updateEntity, type BaseEntity } from '../core/index.ts';
import {
  addDays,
  isoDateSchema,
  minutesOf,
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

/**
 * Quantas vezes no dia: uma vez (`time`), numa lista de horários (`times`) ou de tanto em tanto tempo (`time` até
 * `end_time`, a cada `every_minutes`).
 */
export const REMINDER_TIME_MODES = ['once', 'list', 'interval'] as const;
export type ReminderTimeMode = (typeof REMINDER_TIME_MODES)[number];
export const REMINDER_TIMES_MAX = 24;
export const REMINDER_EVERY_MIN = 15;
export const REMINDER_EVERY_MAX = 12 * 60;
/** Teto de vezes no dia (lista ou intervalo): o aparelho agenda poucos alarmes por app. */
export const REMINDER_SLOTS_MAX = 48;
/** Horários concluídos ficam guardados só nesta janela de dias antes do último concluído. */
export const DONE_SLOTS_KEEP_DAYS = 7;

const slotSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/);

const reminderFields = z.object({
  title: singleLine(REMINDER_TITLE_MAX).min(1, 'Dê um título'),
  notes: z.string().max(REMINDER_NOTES_MAX),
  start_date: isoDateSchema,
  /** uma vez: a hora; lista: o primeiro horário; intervalo: a partir de quando */
  time: localTimeSchema,
  time_mode: z.enum(REMINDER_TIME_MODES),
  times: z.array(localTimeSchema).max(REMINDER_TIMES_MAX, `No máximo ${REMINDER_TIMES_MAX} horários`),
  every_minutes: z.number().int().min(REMINDER_EVERY_MIN, `O intervalo mínimo é de ${REMINDER_EVERY_MIN} min`).max(REMINDER_EVERY_MAX, 'O intervalo máximo é de 12 h').nullable(),
  end_time: localTimeSchema.nullable(),
  ...repeatFields,
  skipped_dates: skipped,
  /** horários concluídos (`AAAA-MM-DDThh:mm`) dos lembretes com várias vezes no dia */
  done_slots: z.array(slotSchema).max(REMINDER_SLOTS_MAX * (DONE_SLOTS_KEEP_DAYS + 1)),
  /** lembrete único concluído (instante); repetido não conclui, pula a data */
  done_at: z.string().datetime({ offset: true }).nullable(),
});

/** Horários do intervalo, de `time` até `end_time` (inclusive). Pára um depois do teto (para a regra recusar). */
function intervalTimes(time: string, every: number, end: string): string[] {
  const out: string[] = [];
  for (let m = minutesOf(time); m <= minutesOf(end) && out.length <= REMINDER_SLOTS_MAX; m += every) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return out;
}

/** Os horários do lembrete num dia, em ordem. */
export function reminderTimes(r: Pick<Reminder, 'time' | 'time_mode' | 'times' | 'every_minutes' | 'end_time'>): string[] {
  if (r.time_mode === 'list') return [...r.times];
  if (r.time_mode === 'interval' && r.every_minutes && r.end_time) return intervalTimes(r.time, r.every_minutes, r.end_time);
  return [r.time];
}

/** Mais de uma vez no dia: cada horário se conclui sozinho e o lembrete nunca fica "concluído" nem "atrasado". */
export const isMultiTime = (r: Pick<Reminder, 'time_mode'>) => r.time_mode !== 'once';

const reminderData = reminderFields.superRefine((r, ctx) => {
  const p = repeatProblem(r);
  if (p) issue(ctx, p);
  if (r.frequency !== 'none' && r.done_at !== null) issue(ctx, 'Lembrete que se repete não é concluído; pule a data');
  if (r.time_mode !== 'once' && r.done_at !== null) issue(ctx, 'Lembrete com vários horários não é concluído; conclua cada horário');
  if (r.time_mode === 'list') {
    if (r.times.length < 2) issue(ctx, 'Escolha ao menos 2 horários');
    if (r.times[0] !== r.time) issue(ctx, 'A hora principal é o primeiro horário');
  }
  if (r.time_mode === 'interval') {
    if (r.every_minutes === null) issue(ctx, 'Diga de quanto em quanto tempo');
    if (r.end_time === null) issue(ctx, 'Diga até que horas');
    else if (r.end_time <= r.time) issue(ctx, 'A hora final precisa ser depois da inicial');
    else if (r.every_minutes !== null && intervalTimes(r.time, r.every_minutes, r.end_time).length > REMINDER_SLOTS_MAX) {
      issue(ctx, `São mais de ${REMINDER_SLOTS_MAX} vezes no dia; aumente o intervalo`);
    }
  }
});

export type Reminder = z.infer<typeof reminderFields> & BaseEntity;
export type ReminderDraft = Partial<z.input<typeof reminderFields>> & Pick<z.input<typeof reminderFields>, 'title' | 'start_date' | 'time'>;
export type ReminderPatch = Partial<z.input<typeof reminderFields>>;

const REMINDER_DEFAULTS = {
  notes: '',
  time_mode: 'once' as const,
  times: [],
  every_minutes: null,
  end_time: null,
  frequency: 'none' as const,
  interval_count: 1,
  weekdays: 0,
  until: null,
  skipped_dates: [],
  done_slots: [],
  done_at: null,
};

/** Lista em ordem e sem repetir (a primeira vira a hora principal); o que não é do modo escolhido fica vazio. */
function normalizeTimes<T extends ReminderPatch>(d: T): T {
  const out = { ...d };
  const mode = out.time_mode ?? 'once';
  if (mode === 'list') {
    out.times = [...new Set(out.times ?? [])].sort();
    if (out.times[0]) out.time = out.times[0];
  } else out.times = [];
  if (mode !== 'interval') {
    out.every_minutes = null;
    out.end_time = null;
  }
  return out;
}

export function newReminder(draft: ReminderDraft, userId: string, clock?: () => Date): Reminder {
  return createEntity(reminderData, REMINDER_DEFAULTS, normalizeTimes(normalizeRepeat(draft)), userId, clock) as Reminder;
}

export function applyReminderPatch(reminder: Reminder, changes: ReminderPatch, clock?: () => Date): Reminder {
  const merged = normalizeTimes(normalizeRepeat({ ...reminder, ...Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined)) }));
  return updateEntity(reminderData, reminder, merged, clock);
}

/**
 * Concluir: o único fica marcado; o que se repete pula esta data. Com várias vezes no dia, conclui só o horário
 * `time` (e esquece os concluídos de mais de uma semana antes).
 */
export function completeReminder(reminder: Reminder, date: IsoDate, clock?: () => Date, time?: string): Reminder {
  if (isMultiTime(reminder)) {
    const at = time ?? reminder.time;
    if (!reminderTimes(reminder).includes(at)) throw new RangeError('Esse horário não é do lembrete');
    const slot = `${date}T${at}`;
    if (reminder.done_slots.includes(slot)) return reminder;
    const keepFrom = addDays(date, -DONE_SLOTS_KEEP_DAYS);
    const done_slots = [...reminder.done_slots.filter((s) => s.slice(0, 10) >= keepFrom), slot].sort();
    return applyReminderPatch(reminder, { done_slots }, clock);
  }
  if (reminder.frequency === 'none') return applyReminderPatch(reminder, { done_at: (clock ?? (() => new Date()))().toISOString() }, clock);
  if (reminder.skipped_dates.includes(date)) return reminder;
  return applyReminderPatch(reminder, { skipped_dates: [...reminder.skipped_dates, date].sort() }, clock);
}

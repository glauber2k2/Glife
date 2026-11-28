// Formulários da agenda: o que a tela guarda (texto dos campos) ↔ rascunho do domain. Puro e testável; as regras
// de negócio (fim depois do início etc.) continuam no domain, aqui só a leitura dos campos.
import { REMINDER_SLOTS_MAX, REMINDER_TIMES_MAX, reminderTimes, type CalendarEvent, type EventDraft, type Reminder, type ReminderDraft, type ReminderTimeMode } from '@glife/domain/agenda';
import { weekdayBit, weekdayOf, type IsoDate } from '@glife/domain/time';

import { formatDateInput, parseDateInput, parseTimeInput } from '@/shared/lib/calendarInput';
import type { FormResult } from '@/shared/hooks/useEntityForm';
import type { RepeatValue } from '@/shared/ui';

/** Aviso antes do evento: opções da tela (minutos; null = sem aviso). */
export const REMIND_OPTIONS: readonly { label: string; minutes: number | null }[] = [
  { label: 'Sem aviso', minutes: null },
  { label: 'Na hora', minutes: 0 },
  { label: '15 min antes', minutes: 15 },
  { label: '30 min antes', minutes: 30 },
  { label: '1 h antes', minutes: 60 },
  { label: '1 dia antes', minutes: 1440 },
];

const repeatOf = (r: { frequency: RepeatValue['frequency']; interval_count: number; weekdays: number; until: IsoDate | null }): RepeatValue => ({
  frequency: r.frequency,
  interval: String(r.interval_count),
  weekdays: r.weekdays,
  until: r.until ? formatDateInput(r.until) : '',
});

function readRepeat(v: RepeatValue, start: IsoDate): FormResult<Pick<EventDraft, 'frequency' | 'interval_count' | 'weekdays' | 'until'>> {
  if (v.frequency === 'none') return { ok: true, value: { frequency: 'none', interval_count: 1, weekdays: 0, until: null } };
  const interval = Number(v.interval || '1');
  if (!Number.isInteger(interval) || interval < 1) return { ok: false, error: 'O "a cada" precisa ser 1 ou mais' };
  const until = v.until.trim() ? parseDateInput(v.until) : null;
  if (v.until.trim() && !until) return { ok: false, error: 'Data de fim da repetição inválida' };
  const weekdays = v.frequency === 'weekly' ? v.weekdays || weekdayBit(weekdayOf(start)) : 0;
  return { ok: true, value: { frequency: v.frequency, interval_count: interval, weekdays, until } };
}

// ---------- Evento ----------

export interface EventForm {
  title: string;
  allDay: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  notes: string;
  repeat: RepeatValue;
  remindBefore: number | null;
}

export function emptyEventForm(date: IsoDate): EventForm {
  return {
    title: '',
    allDay: false,
    startDate: formatDateInput(date),
    startTime: '',
    endDate: '',
    endTime: '',
    location: '',
    notes: '',
    repeat: { frequency: 'none', interval: '1', weekdays: 0, until: '' },
    remindBefore: 15,
  };
}

export function eventToForm(e: CalendarEvent): EventForm {
  return {
    title: e.title,
    allDay: e.start_time === null,
    startDate: formatDateInput(e.start_date),
    startTime: e.start_time ?? '',
    endDate: e.end_date !== e.start_date ? formatDateInput(e.end_date) : '',
    endTime: e.end_time ?? '',
    location: e.location ?? '',
    notes: e.notes,
    repeat: repeatOf(e),
    remindBefore: e.remind_before,
  };
}

export function readEventForm(f: EventForm): FormResult<EventDraft> {
  const start = parseDateInput(f.startDate);
  if (!start) return { ok: false, error: 'Data de início inválida' };
  const end = f.endDate.trim() ? parseDateInput(f.endDate) : start;
  if (!end) return { ok: false, error: 'Data de fim inválida' };
  const startTime = f.allDay ? null : parseTimeInput(f.startTime);
  if (!f.allDay && !startTime) return { ok: false, error: 'Hora de início inválida (hh:mm)' };
  const endTime = f.allDay || !f.endTime.trim() ? null : parseTimeInput(f.endTime);
  if (!f.allDay && f.endTime.trim() && !endTime) return { ok: false, error: 'Hora de fim inválida (hh:mm)' };
  const repeat = readRepeat(f.repeat, start);
  if (!repeat.ok) return repeat;
  return {
    ok: true,
    value: {
      title: f.title,
      start_date: start,
      start_time: startTime,
      end_date: end,
      end_time: endTime,
      location: f.location.trim() || null,
      notes: f.notes,
      ...repeat.value,
      skipped_dates: undefined,
      remind_before: f.remindBefore,
    },
  };
}

// ---------- Lembrete ----------

export type ReminderMode = ReminderTimeMode;

/** "A cada" do lembrete por intervalo (minutos). */
export const EVERY_OPTIONS: readonly { label: string; minutes: number }[] = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 h', minutes: 60 },
  { label: '2 h', minutes: 120 },
  { label: '3 h', minutes: 180 },
  { label: '4 h', minutes: 240 },
  { label: '6 h', minutes: 360 },
  { label: '8 h', minutes: 480 },
  { label: '12 h', minutes: 720 },
];

export interface ReminderForm {
  title: string;
  date: string;
  /** uma vez: a hora; intervalo: a partir de quando */
  time: string;
  mode: ReminderMode;
  /** lista de horários (hh:mm), em ordem */
  times: string[];
  /** intervalo: a cada quantos minutos */
  every: number;
  /** intervalo: até quando */
  endTime: string;
  notes: string;
  repeat: RepeatValue;
}

export const emptyReminderForm = (date: IsoDate): ReminderForm => ({
  title: '',
  date: formatDateInput(date),
  time: '09:00',
  mode: 'once',
  times: [],
  every: 120,
  endTime: '',
  notes: '',
  repeat: { frequency: 'none', interval: '1', weekdays: 0, until: '' },
});

export const reminderToForm = (r: Reminder): ReminderForm => ({
  title: r.title,
  date: formatDateInput(r.start_date),
  time: r.time,
  mode: r.time_mode,
  times: [...r.times],
  every: r.every_minutes ?? 120,
  endTime: r.end_time ?? '',
  notes: r.notes,
  repeat: repeatOf(r),
});

/** Põe um horário na lista (em ordem, sem repetir). */
export const addReminderTime = (times: readonly string[], time: string): string[] => {
  const t = parseTimeInput(time);
  return t ? [...new Set([...times, t])].sort() : [...times];
};

/** Os horários que o formulário daria (para o resumo ao vivo); vazio se ainda não dá para saber. */
export function previewReminderTimes(f: ReminderForm): string[] {
  if (f.mode === 'list') return f.times;
  const time = parseTimeInput(f.time);
  if (!time) return [];
  if (f.mode === 'once') return [time];
  const end = parseTimeInput(f.endTime);
  if (!end || end <= time) return [];
  return reminderTimes({ time, time_mode: 'interval', times: [], every_minutes: f.every, end_time: end });
}

export function readReminderForm(f: ReminderForm): FormResult<ReminderDraft> {
  const date = parseDateInput(f.date);
  if (!date) return { ok: false, error: 'Data inválida' };
  const repeat = readRepeat(f.repeat, date);
  if (!repeat.ok) return repeat;
  const base = { title: f.title, start_date: date, notes: f.notes, ...repeat.value };
  if (f.mode === 'list') {
    if (f.times.length < 2) return { ok: false, error: 'Escolha ao menos 2 horários' };
    if (f.times.length > REMINDER_TIMES_MAX) return { ok: false, error: `No máximo ${REMINDER_TIMES_MAX} horários` };
    return { ok: true, value: { ...base, time: f.times[0]!, time_mode: 'list', times: f.times } };
  }
  const time = parseTimeInput(f.time);
  if (!time) return { ok: false, error: f.mode === 'interval' ? 'Hora de início inválida (hh:mm)' : 'Hora inválida (hh:mm)' };
  if (f.mode === 'once') return { ok: true, value: { ...base, time, time_mode: 'once' } };
  const end = parseTimeInput(f.endTime);
  if (!end) return { ok: false, error: 'Diga até que horas (hh:mm)' };
  if (end <= time) return { ok: false, error: 'A hora final precisa ser depois da inicial' };
  if (previewReminderTimes(f).length > REMINDER_SLOTS_MAX) return { ok: false, error: `São mais de ${REMINDER_SLOTS_MAX} vezes no dia; aumente o intervalo` };
  return { ok: true, value: { ...base, time, time_mode: 'interval', every_minutes: f.every, end_time: end } };
}

// Formulários da agenda: o que a tela guarda (texto dos campos) ↔ rascunho do domain. Puro e testável; as regras
// de negócio (fim depois do início etc.) continuam no domain, aqui só a leitura dos campos.
import type { CalendarEvent, EventDraft, Reminder, ReminderDraft } from '@glife/domain/agenda';
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

export interface ReminderForm {
  title: string;
  date: string;
  time: string;
  notes: string;
  repeat: RepeatValue;
}

export const emptyReminderForm = (date: IsoDate): ReminderForm => ({
  title: '',
  date: formatDateInput(date),
  time: '09:00',
  notes: '',
  repeat: { frequency: 'none', interval: '1', weekdays: 0, until: '' },
});

export const reminderToForm = (r: Reminder): ReminderForm => ({
  title: r.title,
  date: formatDateInput(r.start_date),
  time: r.time,
  notes: r.notes,
  repeat: repeatOf(r),
});

export function readReminderForm(f: ReminderForm): FormResult<ReminderDraft> {
  const date = parseDateInput(f.date);
  if (!date) return { ok: false, error: 'Data inválida' };
  const time = parseTimeInput(f.time);
  if (!time) return { ok: false, error: 'Hora inválida (hh:mm)' };
  const repeat = readRepeat(f.repeat, date);
  if (!repeat.ok) return repeat;
  return { ok: true, value: { title: f.title, start_date: date, time, notes: f.notes, ...repeat.value } };
}

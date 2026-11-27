// O que acontece quando: ocorrências de eventos e lembretes num período, o próximo compromisso (bloco de Hoje) e os
// avisos a agendar no aparelho. Funções puras sobre as linhas.
import { addDays, daysBetween, occurrenceDates, shiftMinutes, type IsoDate, type LocalTime, type ScheduledNotice } from '../time/index.ts';
import { ALL_DAY_NOTICE_TIME, isMultiTime, reminderTimes, type CalendarEvent, type Reminder } from './model.ts';

export interface AgendaItem {
  kind: 'event' | 'reminder';
  id: string;
  /** data desta ocorrência */
  date: IsoDate;
  /** null = dia inteiro */
  time: LocalTime | null;
  end_time: LocalTime | null;
  /** evento de vários dias: até quando */
  end_date: IsoDate;
  title: string;
  location: string | null;
  repeats: boolean;
}

const alive = <T extends { deleted_at: string | null }>(r: T) => r.deleted_at === null;
const span = (e: CalendarEvent) => Math.max(0, daysBetween(e.start_date, e.end_date));

/** Dia inteiro primeiro; depois por hora; empate pelo título. */
export const byWhen = (a: AgendaItem, b: AgendaItem) =>
  a.date !== b.date
    ? a.date < b.date
      ? -1
      : 1
    : (a.time ?? '') !== (b.time ?? '')
      ? (a.time ?? '') < (b.time ?? '')
        ? -1
        : 1
      : a.title.localeCompare(b.title, 'pt-BR') || (a.id < b.id ? -1 : 1);

/**
 * Tudo entre `from` e `to` (inclusive). Evento de vários dias aparece no dia em que começa (com `end_date`) e,
 * se começou antes do período, no primeiro dia dele. Lembrete único concluído some.
 */
export function agendaBetween(events: readonly CalendarEvent[], reminders: readonly Reminder[], from: IsoDate, to: IsoDate): AgendaItem[] {
  const out: AgendaItem[] = [];
  for (const e of events.filter(alive)) {
    const days = span(e);
    // Começos que ainda tocam o período (um evento de 3 dias que começou ontem continua hoje).
    for (const date of occurrenceDates(e, addDays(from, -days), to)) {
      const end = addDays(date, days);
      if (end < from) continue;
      out.push({
        kind: 'event',
        id: e.id,
        date: date < from ? from : date,
        time: date < from ? null : e.start_time,
        end_time: e.end_time,
        end_date: end,
        title: e.title,
        location: e.location,
        repeats: e.frequency !== 'none',
      });
    }
  }
  for (const { r, date, time } of reminderSlots(reminders, from, to)) {
    out.push({ kind: 'reminder', id: r.id, date, time, end_time: null, end_date: date, title: r.title, location: null, repeats: r.frequency !== 'none' || isMultiTime(r) });
  }
  return out.sort(byWhen);
}

/** Cada horário de cada lembrete vivo e pendente entre `from` e `to`, sem os horários já concluídos. */
export function reminderSlots(reminders: readonly Reminder[], from: IsoDate, to: IsoDate): { r: Reminder; date: IsoDate; time: LocalTime }[] {
  const out: { r: Reminder; date: IsoDate; time: LocalTime }[] = [];
  for (const r of reminders.filter((x) => alive(x) && x.done_at === null)) {
    const times = reminderTimes(r);
    const done = new Set(r.done_slots);
    for (const date of occurrenceDates(r, from, to)) {
      for (const time of times) if (!done.has(`${date}T${time}`)) out.push({ r, date, time });
    }
  }
  return out;
}

/** Chave do aviso: o horário entra só quando o lembrete tem várias vezes no dia (os de antes seguem iguais). */
export const reminderNoticeKey = (r: Reminder, date: IsoDate, time: LocalTime) =>
  isMultiTime(r) ? `reminder:${r.id}:${date}:${time.replace(':', '')}` : `reminder:${r.id}:${date}`;

/** Lembretes únicos que já passaram e não foram concluídos (aparecem como atrasados). */
export function overdueReminders(reminders: readonly Reminder[], now: { date: IsoDate; time: LocalTime }): Reminder[] {
  return reminders
    .filter((r) => alive(r) && r.frequency === 'none' && !isMultiTime(r) && r.done_at === null && `${r.start_date}T${r.time}` < `${now.date}T${now.time}`)
    .sort((a, b) => (`${a.start_date}T${a.time}` < `${b.start_date}T${b.time}` ? -1 : 1));
}

export interface NextEvent {
  item: AgendaItem;
  /** outros eventos ainda hoje, depois deste */
  moreToday: number;
}

/**
 * Próximo compromisso (bloco de Hoje): o primeiro evento de hoje que ainda não terminou (ou não começou, se não tem
 * fim); se não houver, o primeiro dos próximos `lookahead` dias. Dia inteiro de hoje conta como em andamento.
 */
export function nextEvent(events: readonly CalendarEvent[], now: { date: IsoDate; time: LocalTime }, lookahead = 30): NextEvent | null {
  const items = agendaBetween(events, [], now.date, addDays(now.date, lookahead)).filter((i) => {
    if (i.date !== now.date) return true;
    if (i.time === null) return true;
    return (i.end_date > now.date ? '24:00' : (i.end_time ?? i.time)) >= now.time;
  });
  const first = items[0];
  if (!first) return null;
  const moreToday = first.date === now.date ? items.filter((i) => i.date === now.date).length - 1 : 0;
  return { item: first, moreToday };
}

/** Avisos da agenda entre hoje e `days` dias à frente: eventos com aviso e lembretes não concluídos. */
export function agendaNotices(events: readonly CalendarEvent[], reminders: readonly Reminder[], today: IsoDate, days: number): ScheduledNotice[] {
  const to = addDays(today, days);
  const out: ScheduledNotice[] = [];
  for (const e of events.filter((x) => alive(x) && x.remind_before !== null)) {
    // Aviso pode cair antes de hoje para um evento de amanhã: olha um pouco além do período.
    for (const date of occurrenceDates(e, today, addDays(to, 8))) {
      const at = shiftMinutes(date, e.start_time ?? ALL_DAY_NOTICE_TIME, -(e.start_time ? e.remind_before! : 0));
      if (at.date > to) continue;
      out.push({
        key: `event:${e.id}:${date}`,
        title: e.title,
        body: e.start_time ? `${e.start_time}${e.location ? ` · ${e.location}` : ''}` : `Hoje${e.location ? ` · ${e.location}` : ''}`,
        date: at.date,
        time: at.time,
        url: `/agenda/evento/${e.id}`,
      });
    }
  }
  for (const { r, date, time } of reminderSlots(reminders, today, to)) {
    const ref = isMultiTime(r) ? { kind: 'reminder' as const, id: r.id, date, time } : { kind: 'reminder' as const, id: r.id, date };
    out.push({ key: reminderNoticeKey(r, date, time), title: r.title, body: r.notes.split('\n')[0] ?? '', date, time, url: `/agenda/lembrete/${r.id}`, ref });
  }
  return out;
}

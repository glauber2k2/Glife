// O que a agenda leva à central de notificações: lembretes de hoje e os atrasados (únicos, não concluídos).
import { dayMonth, localInstant, type AppNotification } from '../notifications/index.ts';
import type { IsoDate, LocalTime } from '../time/index.ts';
import type { Reminder } from './model.ts';
import { isReminderDone, overdueReminders, reminderNoticeKey, reminderSlots } from './schedule.ts';

const notification = (r: Reminder, date: IsoDate, message: string, time: LocalTime = r.time): AppNotification => ({
  id: reminderNoticeKey(r, date, time),
  module: 'agenda',
  title: r.title,
  message,
  at: localInstant(date, time),
  route: `/agenda/lembrete/${r.id}`,
  action: { label: 'Feito', kind: 'resolve' },
});

export function agendaNotifications(reminders: readonly Reminder[], now: { date: IsoDate; time: LocalTime }): AppNotification[] {
  const out = new Map<string, AppNotification>();
  for (const r of overdueReminders(reminders, now)) {
    const n = notification(r, r.start_date, `Atrasado · era para ${dayMonth(r.start_date)}, ${r.time}`);
    out.set(n.id, n);
  }
  for (const { r, date, time } of reminderSlots(reminders, now.date, now.date)) {
    const note = r.notes.split('\n')[0]?.trim();
    const n = notification(r, date, `Hoje às ${time}${note ? ` · ${note}` : ''}`, time);
    if (!out.has(n.id)) out.set(n.id, n);
  }
  return [...out.values()];
}

/**
 * O lembrete ainda pede atenção nesta data (vivo, não concluído, data não pulada)? Com várias vezes no dia, olha o
 * horário `time`. Um adiamento só vale se sim.
 */
export function isReminderPending(reminders: readonly Reminder[], id: string, date: IsoDate, time?: LocalTime): boolean {
  const r = reminders.find((x) => x.id === id);
  return !!r && r.deleted_at === null && !isReminderDone(r, date, time ?? r.time);
}

// O que a agenda leva à central de notificações: lembretes de hoje e os atrasados (únicos, não concluídos).
import { dayMonth, localInstant, type AppNotification } from '../notifications/index.ts';
import type { IsoDate, LocalTime } from '../time/index.ts';
import type { Reminder } from './model.ts';
import { agendaBetween, overdueReminders } from './schedule.ts';

const notification = (r: Reminder, date: IsoDate, message: string): AppNotification => ({
  id: `reminder:${r.id}:${date}`,
  module: 'agenda',
  title: r.title,
  message,
  at: localInstant(date, r.time),
  route: `/agenda/lembrete/${r.id}`,
  action: { label: 'Feito', kind: 'resolve' },
});

export function agendaNotifications(reminders: readonly Reminder[], now: { date: IsoDate; time: LocalTime }): AppNotification[] {
  const byId = new Map(reminders.map((r) => [r.id, r]));
  const out = new Map<string, AppNotification>();
  for (const r of overdueReminders(reminders, now)) {
    const n = notification(r, r.start_date, `Atrasado · era para ${dayMonth(r.start_date)}, ${r.time}`);
    out.set(n.id, n);
  }
  for (const item of agendaBetween([], reminders, now.date, now.date)) {
    const r = byId.get(item.id)!;
    const note = r.notes.split('\n')[0]?.trim();
    const n = notification(r, item.date, `Hoje às ${r.time}${note ? ` · ${note}` : ''}`);
    if (!out.has(n.id)) out.set(n.id, n);
  }
  return [...out.values()];
}

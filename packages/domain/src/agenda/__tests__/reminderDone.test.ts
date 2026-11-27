import { describe, expect, it } from 'vitest';

import { agendaBetween, agendaNotices, completeReminder, isReminderPending, lateReminders, newReminder, overdueReminders, uncompleteReminder } from '../index.ts';

const USER = '11110000-0000-4000-8000-000000000001';
const clock = () => new Date('2026-11-25T12:00:00.000Z');

const reminders = (items: ReturnType<typeof agendaBetween>) => items.filter((i) => i.kind === 'reminder').map((i) => `${i.date} ${i.time} ${i.done ? 'feito' : 'pendente'}`);

describe('lembrete concluído continua na agenda, marcado como feito', () => {
  it('único: aparece feito no dia e desmarcar volta a pendente (e a atrasado, se passou)', () => {
    const r = newReminder({ title: 'Pagar luz', start_date: '2026-11-25', time: '10:00' }, USER, clock);
    const done = completeReminder(r, '2026-11-25', clock);
    expect(reminders(agendaBetween([], [done], '2026-11-25', '2026-11-25'))).toEqual(['2026-11-25 10:00 feito']);
    expect(overdueReminders([done], { date: '2026-11-26', time: '08:00' })).toEqual([]);

    const undone = uncompleteReminder(done, '2026-11-25', clock);
    expect(undone.done_at).toBeNull();
    expect(reminders(agendaBetween([], [undone], '2026-11-25', '2026-11-25'))).toEqual(['2026-11-25 10:00 pendente']);
    expect(overdueReminders([undone], { date: '2026-11-26', time: '08:00' }).map((x) => x.id)).toEqual([r.id]);
  });

  it('repetido: só a data concluída fica feita; desmarcar devolve a data', () => {
    const r = newReminder({ title: 'Ração', start_date: '2026-11-25', time: '09:00', frequency: 'daily' }, USER, clock);
    const done = completeReminder(r, '2026-11-25', clock);
    expect(reminders(agendaBetween([], [done], '2026-11-25', '2026-11-26'))).toEqual(['2026-11-25 09:00 feito', '2026-11-26 09:00 pendente']);
    expect(isReminderPending([done], r.id, '2026-11-25')).toBe(false);

    const undone = uncompleteReminder(done, '2026-11-25', clock);
    expect(undone.skipped_dates).toEqual([]);
    expect(isReminderPending([undone], r.id, '2026-11-25')).toBe(true);
  });

  it('vários horários: só o horário concluído fica feito; desmarcar devolve o horário', () => {
    const r = newReminder({ title: 'Remédio', start_date: '2026-11-25', time: '08:00', frequency: 'daily', time_mode: 'list', times: ['08:00', '20:00'] }, USER, clock);
    const done = completeReminder(r, '2026-11-25', clock, '08:00');
    expect(reminders(agendaBetween([], [done], '2026-11-25', '2026-11-25'))).toEqual(['2026-11-25 08:00 feito', '2026-11-25 20:00 pendente']);

    const undone = uncompleteReminder(done, '2026-11-25', clock, '08:00');
    expect(undone.done_slots).toEqual([]);
    expect(reminders(agendaBetween([], [undone], '2026-11-25', '2026-11-25'))).toEqual(['2026-11-25 08:00 pendente', '2026-11-25 20:00 pendente']);
  });

  it('feito não gera aviso; desmarcar algo que não estava feito não muda nada', () => {
    const r = newReminder({ title: 'Ração', start_date: '2026-11-25', time: '09:00', frequency: 'daily' }, USER, clock);
    const done = completeReminder(r, '2026-11-25', clock);
    expect(agendaNotices([], [done], '2026-11-25', 1).map((n) => n.date)).toEqual(['2026-11-26']);
    expect(uncompleteReminder(r, '2026-11-25', clock)).toBe(r);
  });

  it('atrasado feito hoje continua na lista de hoje, riscado; feito em outro dia sai', () => {
    const r = newReminder({ title: 'Pagar luz', start_date: '2026-11-20', time: '10:00' }, USER, clock);
    const now = { date: '2026-11-25', time: '15:00' };
    expect(lateReminders([r], now).map((x) => x.done)).toEqual([false]);
    const doneToday = completeReminder(r, '2026-11-20', () => new Date('2026-11-25T15:00:00.000Z'));
    expect(lateReminders([doneToday], now).map((x) => x.done)).toEqual([true]);
    const doneBefore = completeReminder(r, '2026-11-20', () => new Date('2026-11-22T15:00:00.000Z'));
    expect(lateReminders([doneBefore], now)).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';

import { agendaBetween, agendaNotices, agendaNotifications, completeReminder, isReminderPending, newReminder, overdueReminders, reminderTimes } from '../index.ts';

const USER = '11110000-0000-4000-8000-000000000001';
const clock = () => new Date('2026-11-25T12:00:00.000Z');

const list = (extra: object = {}) =>
  newReminder({ title: 'Remédio', start_date: '2026-11-25', time: '08:00', frequency: 'daily', time_mode: 'list', times: ['20:00', '08:00', '14:00'], ...extra }, USER, clock);
const interval = (extra: object = {}) =>
  newReminder({ title: 'Água', start_date: '2026-11-25', time: '08:00', frequency: 'daily', time_mode: 'interval', every_minutes: 120, end_time: '18:00', ...extra }, USER, clock);

describe('lembrete com vários horários no dia', () => {
  it('lista: guarda os horários em ordem, sem repetir, e a hora principal é a primeira', () => {
    const r = list({ times: ['20:00', '08:00', '14:00', '08:00'] });
    expect(r.times).toEqual(['08:00', '14:00', '20:00']);
    expect(r.time).toBe('08:00');
    expect(reminderTimes(r)).toEqual(['08:00', '14:00', '20:00']);
  });

  it('lista precisa de ao menos 2 horários e no máximo 24', () => {
    expect(() => list({ times: ['08:00'] })).toThrow();
    const many = Array.from({ length: 25 }, (_, i) => `${String(i % 24).padStart(2, '0')}:${i >= 24 ? '30' : '00'}`);
    expect(() => list({ times: many })).toThrow();
  });

  it('intervalo: de tanto em tanto tempo a partir da hora, até a hora final (inclusive)', () => {
    expect(reminderTimes(interval())).toEqual(['08:00', '10:00', '12:00', '14:00', '16:00', '18:00']);
    expect(reminderTimes(interval({ every_minutes: 90, end_time: '12:00' }))).toEqual(['08:00', '09:30', '11:00']);
  });

  it('intervalo: mínimo de 15 min, fim depois do início e no máximo 48 vezes no dia', () => {
    expect(() => interval({ every_minutes: 10 })).toThrow();
    expect(() => interval({ end_time: '08:00' })).toThrow();
    expect(() => interval({ end_time: null })).toThrow();
    expect(() => interval({ every_minutes: 15, time: '00:00', end_time: '23:45' })).toThrow();
    expect(reminderTimes(interval({ every_minutes: 30, time: '00:00', end_time: '23:30' }))).toHaveLength(48);
  });

  it('uma vez: lista e intervalo ficam vazios', () => {
    const r = newReminder({ title: 'X', start_date: '2026-11-25', time: '09:00', times: ['10:00', '11:00'], every_minutes: 60, end_time: '12:00' }, USER, clock);
    expect(r.time_mode).toBe('once');
    expect(r.times).toEqual([]);
    expect(r.every_minutes).toBeNull();
    expect(r.end_time).toBeNull();
    expect(reminderTimes(r)).toEqual(['09:00']);
  });

  it('a agenda mostra cada horário e o feito de um horário só some com ele', () => {
    const r = list();
    expect(agendaBetween([], [r], '2026-11-25', '2026-11-25').map((i) => i.time)).toEqual(['08:00', '14:00', '20:00']);
    const done = completeReminder(r, '2026-11-25', clock, '14:00');
    expect(done.done_at).toBeNull();
    expect(done.skipped_dates).toEqual([]);
    expect(agendaBetween([], [done], '2026-11-25', '2026-11-26').map((i) => `${i.date} ${i.time}`)).toEqual([
      '2026-11-25 08:00',
      '2026-11-25 20:00',
      '2026-11-26 08:00',
      '2026-11-26 14:00',
      '2026-11-26 20:00',
    ]);
    expect(isReminderPending([done], r.id, '2026-11-25', '14:00')).toBe(false);
    expect(isReminderPending([done], r.id, '2026-11-25', '20:00')).toBe(true);
  });

  it('vários horários num dia só (sem repetir): concluir um horário não conclui o lembrete', () => {
    const r = list({ frequency: 'none' });
    const done = completeReminder(r, '2026-11-25', clock, '08:00');
    expect(done.done_at).toBeNull();
    expect(agendaBetween([], [done], '2026-11-25', '2026-11-25').map((i) => i.time)).toEqual(['14:00', '20:00']);
    // Não vira "atrasado": só o lembrete de horário único fica pendente depois que passa.
    expect(overdueReminders([done], { date: '2026-11-26', time: '10:00' })).toEqual([]);
  });

  it('horário que não existe no lembrete não é concluído', () => {
    expect(() => completeReminder(list(), '2026-11-25', clock, '09:00')).toThrow();
  });

  it('horários concluídos guardam só os últimos dias (a linha não cresce para sempre)', () => {
    let r = interval({ every_minutes: 60, end_time: '20:00' });
    for (let d = 1; d <= 20; d++) {
      const date = `2026-12-${String(d).padStart(2, '0')}`;
      for (const t of reminderTimes(r)) r = completeReminder(r, date, clock, t);
    }
    expect(r.done_slots.every((s) => s >= '2026-12-13')).toBe(true);
    expect(r.done_slots.length).toBeLessThanOrEqual(13 * 8);
  });

  it('avisos: um por horário, com a hora no ref', () => {
    const r = list();
    const n = agendaNotices([], [r], '2026-11-25', 0);
    expect(n.map((x) => x.time)).toEqual(['08:00', '14:00', '20:00']);
    expect(n[1]!.key).toBe(`reminder:${r.id}:2026-11-25:1400`);
    expect(n[1]!.ref).toEqual({ kind: 'reminder', id: r.id, date: '2026-11-25', time: '14:00' });
  });

  it('central de notificações: cada horário de hoje é um item, e o de horário único segue igual', () => {
    const r = list();
    const items = agendaNotifications([r], { date: '2026-11-25', time: '13:00' });
    expect(items.map((i) => i.id)).toEqual([`reminder:${r.id}:2026-11-25:0800`, `reminder:${r.id}:2026-11-25:1400`, `reminder:${r.id}:2026-11-25:2000`]);
    expect(items[1]!.message).toBe('Hoje às 14:00');
  });
});

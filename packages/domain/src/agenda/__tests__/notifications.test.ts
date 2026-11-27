import { describe, expect, it } from 'vitest';

import { setIdGenerator } from '../../core/index.ts';
import { agendaNotices, agendaNotifications, completeReminder, isReminderPending, newReminder } from '../index.ts';

const USER = '11110000-0000-4000-8000-000000000001';
let seq = 0;
setIdGenerator(() => `9b2c0000-0000-4000-8000-${String(++seq).padStart(12, '0')}`);
const clock = () => new Date('2026-11-20T12:00:00.000Z');
const now = { date: '2026-11-26', time: '10:00' };

const luz = newReminder({ title: 'Pagar luz', start_date: '2026-11-24', time: '09:00' }, USER, clock);
const remedio = newReminder({ title: 'Remédio', start_date: '2026-11-01', time: '21:00', frequency: 'daily', notes: 'Depois do jantar\nCom água' }, USER, clock);
const feito = completeReminder(newReminder({ title: 'Feito', start_date: '2026-11-26', time: '08:00' }, USER, clock), '2026-11-26', clock);
const amanha = newReminder({ title: 'Amanhã', start_date: '2026-11-27', time: '08:00' }, USER, clock);

describe('agenda: notificações', () => {
  it('lembretes de hoje e atrasados, sem os concluídos nem os de outro dia', () => {
    const items = agendaNotifications([luz, remedio, feito, amanha], now);
    expect(items.map((i) => i.title).sort()).toEqual(['Pagar luz', 'Remédio']);
  });

  it('cada um diz quando e oferece "Feito"', () => {
    const items = agendaNotifications([luz, remedio], now);
    expect(items.find((i) => i.title === 'Pagar luz')).toMatchObject({
      id: `reminder:${luz.id}:2026-11-24`,
      module: 'agenda',
      message: 'Atrasado · era para 24/11, 09:00',
      at: new Date(2026, 10, 24, 9, 0),
      route: `/agenda/lembrete/${luz.id}`,
      action: { label: 'Feito', kind: 'resolve' },
    });
    expect(items.find((i) => i.title === 'Remédio')).toMatchObject({ message: 'Hoje às 21:00 · Depois do jantar', at: new Date(2026, 10, 26, 21, 0) });
  });

  it('o aviso do aparelho leva o lembrete e a data (para "Feito" e "Adiar")', () => {
    const [n] = agendaNotices([], [luz], '2026-11-24', 0);
    expect(n!.ref).toEqual({ kind: 'reminder', id: luz.id, date: '2026-11-24' });
  });
});

describe('agenda: adiamento ainda vale?', () => {
  it('só lembrete vivo, não concluído e sem a data pulada', () => {
    expect(isReminderPending([luz, remedio], luz.id, '2026-11-24')).toBe(true);
    expect(isReminderPending([feito], feito.id, '2026-11-26')).toBe(false);
    const pulado = completeReminder(remedio, '2026-11-26', clock);
    expect(isReminderPending([pulado], remedio.id, '2026-11-26')).toBe(false);
    expect(isReminderPending([pulado], remedio.id, '2026-11-27')).toBe(true);
    expect(isReminderPending([], luz.id, '2026-11-24')).toBe(false);
  });
});

import type { AppNotification } from '@glife/domain/notifications';
import { describe, expect, it } from 'vitest';

import { noticeForSnooze, snoozeUntil } from '../src/features/today/notifications/snooze';

const id = '12345678-1234-4234-8234-123456789012';
const reminder: AppNotification = { id: `reminder:${id}:2026-11-26`, module: 'agenda', title: 'Lembrete', message: 'Hoje', at: new Date(), route: `/agenda/lembrete/${id}` };

describe('adiar na central de notificações', () => {
  it('10 minutos e 1 hora contam a partir da escolha', () => {
    const now = new Date(2026, 10, 26, 23, 55);
    expect(snoozeUntil('10min', now)).toEqual(new Date(2026, 10, 27, 0, 5));
    expect(snoozeUntil('1h', now)).toEqual(new Date(2026, 10, 27, 0, 55));
  });

  it('amanhã às 9 usa a data local, inclusive ao mudar o ano, sem alterar o relógio recebido', () => {
    const now = new Date(2026, 11, 31, 23, 55);
    expect(snoozeUntil('tomorrow', now)).toEqual(new Date(2027, 0, 1, 9));
    expect(now).toEqual(new Date(2026, 11, 31, 23, 55));
  });

  it('mantém id e data da ocorrência ao reagendar lembrete e refeição', () => {
    expect(noticeForSnooze(reminder)).toMatchObject({ key: reminder.id, ref: { kind: 'reminder', id, date: '2026-11-26' } });
    const meal: AppNotification = { ...reminder, id: `meal:${id}:2026-11-26`, module: 'diet', route: `/dieta/registro/novo?plano=${id}` };
    expect(noticeForSnooze(meal)).toMatchObject({ key: meal.id, ref: { kind: 'meal', id, date: '2026-11-26' } });
  });

  it('lembrete com várias vezes no dia: o adiamento guarda o horário', () => {
    const slot = { ...reminder, id: `reminder:${id}:2026-11-26:1400` };
    expect(noticeForSnooze(slot)).toMatchObject({ key: slot.id, ref: { kind: 'reminder', id, date: '2026-11-26', time: '14:00' } });
    expect(noticeForSnooze({ ...reminder, id: `reminder:${id}:2026-11-26:2500` })).toBeNull();
    expect(noticeForSnooze({ ...reminder, id: `reminder:${id}:2026-11-26:14` })).toBeNull();
  });

  it('não oferece adiamento para finanças, ids malformados ou rotas externas', () => {
    expect(noticeForSnooze({ ...reminder, module: 'finance' })).toBeNull();
    expect(noticeForSnooze({ ...reminder, id: reminder.id + ':extra' })).toBeNull();
    expect(noticeForSnooze({ ...reminder, route: 'https://example.com' })).toBeNull();
  });
});

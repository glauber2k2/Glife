import { describe, expect, it } from 'vitest';

import { setIdGenerator } from '../../core/index.ts';
import { dietNotices, dietNotifications, isMealPending, newMealLog, newMealPlanItem } from '../index.ts';

const USER = '11110000-0000-4000-8000-000000000001';
let seq = 0;
setIdGenerator(() => `8c2c0000-0000-4000-8000-${String(++seq).padStart(12, '0')}`);
const clock = () => new Date('2026-11-20T12:00:00.000Z');

const almoco = newMealPlanItem({ name: 'Almoço', time: '12:30', description: 'Arroz, feijão\ne salada' }, USER, clock);
const lanche = newMealPlanItem({ name: 'Lanche da tarde', time: '16:00', description: 'Iogurte, granola e banana' }, USER, clock);

describe('dieta: notificações', () => {
  it('a próxima refeição de hoje ainda sem registro, com "Registrar" já nela', () => {
    const [n, ...rest] = dietNotifications([almoco, lanche], [], { date: '2026-11-26', time: '10:00' });
    expect(rest).toEqual([]);
    expect(n).toMatchObject({
      id: `meal:${almoco.id}:2026-11-26`,
      module: 'diet',
      title: 'Almoço às 12:30',
      message: 'Arroz, feijão',
      at: new Date(2026, 10, 26, 12, 30),
      route: `/dieta/registro/novo?plano=${almoco.id}`,
      action: { label: 'Registrar', kind: 'open' },
    });
  });

  it('registrada, passa para a seguinte; acabou o dia, nada (amanhã não entra)', () => {
    const comi = newMealLog({ date: '2026-11-26', time: '12:40', plan_id: almoco.id }, USER, clock);
    expect(dietNotifications([almoco, lanche], [comi], { date: '2026-11-26', time: '12:50' }).map((n) => n.title)).toEqual(['Lanche da tarde às 16:00']);
    expect(dietNotifications([almoco, lanche], [], { date: '2026-11-26', time: '22:00' })).toEqual([]);
  });

  it('o aviso do aparelho leva a refeição (para "Registrar" e "Adiar")', () => {
    const [n] = dietNotices([almoco], '2026-11-26', 0);
    expect(n!.ref).toEqual({ kind: 'meal', id: almoco.id, date: '2026-11-26' });
  });
});

describe('dieta: adiamento ainda vale?', () => {
  it('só refeição do plano ainda sem registro naquela data', () => {
    expect(isMealPending([almoco], [], almoco.id, '2026-11-26')).toBe(true);
    const comi = newMealLog({ date: '2026-11-26', time: '12:40', plan_id: almoco.id }, USER, clock);
    expect(isMealPending([almoco], [comi], almoco.id, '2026-11-26')).toBe(false);
    expect(isMealPending([almoco], [comi], almoco.id, '2026-11-27')).toBe(true);
    expect(isMealPending([], [], almoco.id, '2026-11-26')).toBe(false);
  });
});

import { beforeEach, describe, expect, it } from 'vitest';

import { setIdGenerator } from '../../core/index.ts';
import { createMemoryRowStore } from '../../testing/index.ts';
import { weekdayBit } from '../../time/index.ts';
import { DIET_TABLES, createDietRepository, dietDay, dietNotices, newMealLog, newMealPlanItem, nextMeal, planFor, type DietRows } from '../index.ts';

const USER = '11110000-0000-4000-8000-000000000001';
let seq = 0;
setIdGenerator(() => `8b1c0000-0000-4000-8000-${String(++seq).padStart(12, '0')}`);
const clock = () => new Date('2026-11-25T12:00:00.000Z');

const cafe = newMealPlanItem({ name: 'Café da manhã', time: '07:30', description: 'Ovos e fruta' }, USER, clock);
const almoco = newMealPlanItem({ name: 'Almoço', time: '12:30' }, USER, clock);
const lanche = newMealPlanItem({ name: 'Lanche', time: '16:00', remind: false }, USER, clock);
const brunch = newMealPlanItem({ name: 'Brunch', time: '10:00', weekdays: weekdayBit(0) }, USER, clock); // só domingo

describe('dieta: regras', () => {
  it('refeição sem dia da semana e registro vazio fora do plano são recusados', () => {
    expect(() => newMealPlanItem({ name: 'X', time: '08:00', weekdays: 0 }, USER)).toThrow();
    expect(() => newMealLog({ date: '2026-11-25', time: '08:00' }, USER)).toThrow();
  });

  it('o plano do dia respeita os dias da semana', () => {
    expect(planFor([cafe, almoco, brunch], '2026-11-25').map((i) => i.name)).toEqual(['Café da manhã', 'Almoço']);
    expect(planFor([cafe, almoco, brunch], '2026-11-29').map((i) => i.name)).toEqual(['Café da manhã', 'Brunch', 'Almoço']);
  });

  it('o dia junta plano e registros; registro fora do plano entra na ordem do horário', () => {
    const comi = newMealLog({ date: '2026-11-25', time: '07:40', plan_id: cafe.id }, USER, clock);
    const extra = newMealLog({ date: '2026-11-25', time: '10:15', description: 'Pão de queijo' }, USER, clock);
    const day = dietDay([cafe, almoco], [comi, extra], '2026-11-25');
    expect(day.map((d) => [d.plan?.name ?? null, d.log?.time ?? null])).toEqual([
      ['Café da manhã', '07:40'],
      [null, '10:15'],
      ['Almoço', null],
    ]);
  });

  it('próxima refeição: a de agora (com tolerância), pula a já registrada e vai para amanhã no fim do dia', () => {
    expect(nextMeal([cafe, almoco, lanche], [], { date: '2026-11-25', time: '12:50' })?.item.name).toBe('Almoço');
    const comi = newMealLog({ date: '2026-11-25', time: '12:40', plan_id: almoco.id }, USER, clock);
    expect(nextMeal([cafe, almoco, lanche], [comi], { date: '2026-11-25', time: '12:50' })?.item.name).toBe('Lanche');
    expect(nextMeal([cafe, almoco], [], { date: '2026-11-25', time: '22:00' })).toMatchObject({ date: '2026-11-26' });
  });

  it('avisos só das refeições com aviso ligado', () => {
    const keys = dietNotices([cafe, lanche], '2026-11-25', 1).map((n) => n.key);
    expect(keys).toEqual([`meal:${cafe.id}:2026-11-25`, `meal:${cafe.id}:2026-11-26`]);
  });
});

describe('dieta: repositório', () => {
  let repo: ReturnType<typeof createDietRepository>;
  beforeEach(() => {
    repo = createDietRepository(createMemoryRowStore<DietRows>(DIET_TABLES, USER), USER, clock);
  });

  it('registro só aponta para refeição do plano que existe', async () => {
    const item = await repo.createPlanItem({ name: 'Jantar', time: '19:30' });
    const log = await repo.createLog({ date: '2026-11-25', time: '19:45', plan_id: item.id });
    expect(log.plan_id).toBe(item.id);
    expect(log.description).toBe('Jantar');
    await repo.removePlanItem(item.id);
    await expect(repo.createLog({ date: '2026-11-25', time: '20:00', plan_id: item.id })).rejects.toMatchObject({ code: 'validation' });
    await expect(
      repo.createLog({ date: '2026-11-25', time: '20:00', plan_id: '99990000-0000-4000-8000-000000000009' }),
    ).rejects.toMatchObject({ code: 'validation' });
  });

  it('edita, exclui e restaura um registro', async () => {
    const log = await repo.createLog({ date: '2026-11-25', time: '10:00', description: 'Fruta' });
    await repo.updateLog(log.id, { description: 'Banana' });
    await repo.removeLog(log.id);
    expect((await repo.snapshot()).logs).toHaveLength(0);
    await repo.restoreLog(log.id);
    expect((await repo.getLog(log.id)).description).toBe('Banana');
  });
});

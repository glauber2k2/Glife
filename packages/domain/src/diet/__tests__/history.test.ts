import { beforeEach, describe, expect, it } from 'vitest';

import { setIdGenerator } from '../../core/index.ts';
import { createMemoryRowStore } from '../../testing/index.ts';
import { weekdayBit } from '../../time/index.ts';
import {
  DIET_TABLES,
  createDietRepository,
  dayTotals,
  history,
  newDietGoals,
  newMealLog,
  newMealPlanItem,
  type DietRows,
} from '../index.ts';

const USER = '11110000-0000-4000-8000-000000000002';
let seq = 0;
setIdGenerator(() => `8b1d0000-0000-4000-8000-${String(++seq).padStart(12, '0')}`);
const clock = () => new Date('2026-11-01T12:00:00.000Z');
const TODAY = '2026-11-26'; // quinta

const log = (date: string, time: string, n: { kcal?: number | null; protein_g?: number | null; plan_id?: string | null } = {}) =>
  newMealLog({ date, time, description: 'x', ...n }, USER, clock);

describe('dieta: totais do dia', () => {
  it('soma kcal e macros informados; vazio conta 0; excluído não entra', () => {
    const a = newMealLog({ date: TODAY, time: '07:00', description: 'a', kcal: 380, protein_g: 20.5, carbs_g: 40, fat_g: 10 }, USER, clock);
    const b = newMealLog({ date: TODAY, time: '12:00', description: 'b', kcal: 760, protein_g: 40 }, USER, clock);
    const c = newMealLog({ date: TODAY, time: '15:00', description: 'c' }, USER, clock);
    const gone = { ...newMealLog({ date: TODAY, time: '16:00', description: 'd', kcal: 999 }, USER, clock), deleted_at: '2026-11-26T10:00:00.000Z' };
    expect(dayTotals([a, b, c, gone])).toEqual({ kcal: 1140, protein_g: 60.5, carbs_g: 40, fat_g: 10 });
    expect(dayTotals([])).toEqual({ kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  });

  it('macros somam sem erro de ponto flutuante (uma casa)', () => {
    const logs = [0.1, 0.2].map((p, i) => newMealLog({ date: TODAY, time: `0${i}:00`, description: 'x', protein_g: p }, USER, clock));
    expect(dayTotals(logs).protein_g).toBe(0.3);
  });
});

describe('dieta: histórico', () => {
  const cafe = newMealPlanItem({ name: 'Café', time: '07:00' }, USER, clock);
  const almoco = newMealPlanItem({ name: 'Almoço', time: '12:00', weekdays: weekdayBit(1) | weekdayBit(2) | weekdayBit(3) | weekdayBit(4) | weekdayBit(5) }, USER, clock);

  it('semana vai de segunda a domingo e marca hoje e os dias futuros', () => {
    const h = history([], [], 'week', TODAY);
    expect(h.from).toBe('2026-11-23');
    expect(h.to).toBe('2026-11-29');
    expect(h.days.map((d) => d.date.slice(8))).toEqual(['23', '24', '25', '26', '27', '28', '29']);
    expect(h.days.find((d) => d.today)?.date).toBe(TODAY);
    expect(h.days.filter((d) => d.future).map((d) => d.date.slice(8))).toEqual(['27', '28', '29']);
  });

  it('mês vai do dia 1 ao último dia', () => {
    const h = history([], [], 'month', TODAY);
    expect(h.from).toBe('2026-11-01');
    expect(h.to).toBe('2026-11-30');
    expect(h.days).toHaveLength(30);
  });

  it('dias sem registro contam 0 e não entram na média', () => {
    const meals = [log('2026-11-23', '07:00', { kcal: 1800 }), log('2026-11-23', '12:00', { kcal: 200 }), log('2026-11-25', '12:00', { kcal: 1500 })];
    const h = history(meals, [], 'week', TODAY);
    expect(h.days.map((d) => d.kcal)).toEqual([2000, 0, 1500, 0, 0, 0, 0]);
    expect(h.averageKcal).toBe(1750);
    expect(h.loggedDays).toBe(2);
  });

  it('dia com registro sem kcal não entra na média, mas conta como registrado', () => {
    const meals = [log('2026-11-23', '07:00', { kcal: 1800 }), log('2026-11-24', '07:00')];
    const h = history(meals, [], 'week', TODAY);
    expect(h.averageKcal).toBe(1800);
    expect(h.loggedDays).toBe(2);
  });

  it('sem nenhum registro: média e aderência nulas', () => {
    const h = history([], [], 'week', TODAY);
    expect(h.averageKcal).toBeNull();
    expect(h.adherence).toBeNull();
    expect(h.loggedDays).toBe(0);
  });

  it('refeições feitas e planejadas por dia seguem o plano daquele dia da semana', () => {
    const meals = [log('2026-11-23', '07:05', { plan_id: cafe.id }), log('2026-11-23', '12:10', { plan_id: almoco.id }), log('2026-11-28', '07:00', { plan_id: cafe.id })];
    const h = history(meals, [cafe, almoco], 'week', '2026-11-29');
    const seg = h.days[0]!;
    const sab = h.days[5]!;
    expect([seg.done, seg.planned]).toEqual([2, 2]);
    expect([sab.done, sab.planned]).toEqual([1, 1]); // almoço não vale no sábado
  });

  it('aderência só sobre dias passados com plano (hoje e futuro ficam de fora)', () => {
    // seg 23: 2/2 · ter 24: 1/2 · qua 25: 0/2 · qui 26 (hoje): 2/2 não conta
    const meals = [
      log('2026-11-23', '07:00', { plan_id: cafe.id }),
      log('2026-11-23', '12:00', { plan_id: almoco.id }),
      log('2026-11-24', '07:00', { plan_id: cafe.id }),
      log('2026-11-26', '07:00', { plan_id: cafe.id }),
      log('2026-11-26', '12:00', { plan_id: almoco.id }),
    ];
    const h = history(meals, [cafe, almoco], 'week', TODAY);
    expect(h.adherence).toBeCloseTo(3 / 6);
  });

  it('refeição criada depois de um dia não conta como planejada nele', () => {
    const nova = newMealPlanItem({ name: 'Ceia', time: '21:00' }, USER, () => new Date('2026-11-25T12:00:00.000Z'));
    const h = history([], [nova], 'week', TODAY);
    expect(h.days.map((d) => d.planned)).toEqual([0, 0, 1, 1, 1, 1, 1]);
  });

  it('sem plano nos dias passados: aderência nula', () => {
    const h = history([log('2026-11-23', '07:00', { kcal: 500 })], [], 'week', TODAY);
    expect(h.adherence).toBeNull();
  });
});

describe('dieta: metas', () => {
  it('limites: kcal inteira 0..20000, macros 0..2000; tudo opcional', () => {
    expect(newDietGoals({}, USER)).toMatchObject({ kcal_target: null, protein_g_target: null, carbs_g_target: null, fat_g_target: null });
    expect(newDietGoals({ kcal_target: 2000, protein_g_target: 120.5 }, USER)).toMatchObject({ kcal_target: 2000, protein_g_target: 120.5 });
    expect(() => newDietGoals({ kcal_target: 20001 }, USER)).toThrow();
    expect(() => newDietGoals({ kcal_target: -1 }, USER)).toThrow();
    expect(() => newDietGoals({ kcal_target: 1800.5 }, USER)).toThrow();
    expect(() => newDietGoals({ protein_g_target: 2000.1 }, USER)).toThrow();
    expect(() => newDietGoals({ fat_g_target: -0.5 }, USER)).toThrow();
  });

  it('kcal e macros da refeição seguem os mesmos limites', () => {
    expect(() => newMealLog({ date: TODAY, time: '08:00', description: 'x', kcal: 20001 }, USER)).toThrow();
    expect(() => newMealPlanItem({ name: 'X', time: '08:00', carbs_g: 2001 }, USER)).toThrow();
  });

  describe('repositório', () => {
    let repo: ReturnType<typeof createDietRepository>;
    beforeEach(() => {
      repo = createDietRepository(createMemoryRowStore<DietRows>(DIET_TABLES, USER), USER, clock);
    });

    it('sem metas: null; salvar cria uma linha e salvar de novo atualiza a mesma', async () => {
      expect(await repo.getGoals()).toBeNull();
      const a = await repo.setGoals({ kcal_target: 2000 });
      const b = await repo.setGoals({ kcal_target: 1900, protein_g_target: 120 });
      expect(b.id).toBe(a.id);
      expect(await repo.getGoals()).toMatchObject({ kcal_target: 1900, protein_g_target: 120, carbs_g_target: null });
      expect((await repo.snapshot()).goals?.id).toBe(a.id);
    });

    it('meta inválida é recusada e não grava', async () => {
      await expect(repo.setGoals({ kcal_target: 30000 })).rejects.toMatchObject({ code: 'validation' });
      expect(await repo.getGoals()).toBeNull();
    });

    it('registro de refeição do plano herda kcal e macros do plano quando não informados', async () => {
      const item = await repo.createPlanItem({ name: 'Lanche', time: '16:00', kcal: 280, protein_g: 11 });
      const quick = await repo.createLog({ date: TODAY, time: '16:10', plan_id: item.id });
      expect(quick).toMatchObject({ kcal: 280, protein_g: 11, carbs_g: null });
      const own = await repo.createLog({ date: TODAY, time: '16:20', plan_id: item.id, kcal: 310, protein_g: null });
      expect(own).toMatchObject({ kcal: 310, protein_g: null });
    });
  });
});

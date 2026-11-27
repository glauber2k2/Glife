import { describe, expect, it } from 'vitest';

import { emptyLogForm, fillFromPlan, readLogForm, readPlanForm, emptyPlanForm } from '../src/features/diet/components/forms';
import { gramsText, kcalGoal, kcalText, maskGrams, maskKcal, readNutrition } from '../src/features/diet/components/nutrition';

describe('dieta: kcal e macros nos campos', () => {
  it('meta calórica zero equivale a sem meta no cartão e no histórico', () => {
    expect(kcalGoal(0)).toBeNull();
    expect(kcalGoal(null)).toBeNull();
    expect(kcalGoal(undefined)).toBeNull();
    expect(kcalGoal(2000)).toBe(2000);
  });
  it('máscaras e exibição', () => {
    expect(maskKcal('1.420 kcal')).toBe('1420');
    expect(maskGrams('92.55')).toBe('92,5');
    expect(maskGrams('abc12,3,4')).toBe('12,3');
    expect(kcalText(1420)).toBe('1.420');
    expect(kcalText(20000)).toBe('20.000');
    expect(gramsText(92.5)).toBe('92,5');
    expect(gramsText(92)).toBe('92');
  });

  it('vazio = null; fora dos limites avisa o campo', () => {
    expect(readNutrition({ kcal: '', protein: '', carbs: '', fat: '' })).toEqual({ ok: true, value: { kcal: null, protein_g: null, carbs_g: null, fat_g: null } });
    expect(readNutrition({ kcal: '380', protein: '20,5', carbs: '40', fat: '' })).toEqual({ ok: true, value: { kcal: 380, protein_g: 20.5, carbs_g: 40, fat_g: null } });
    expect(readNutrition({ kcal: '20001', protein: '', carbs: '', fat: '' })).toEqual({ ok: false, error: 'kcal: no máximo 20.000' });
    expect(readNutrition({ kcal: '', protein: '', carbs: '2000,5', fat: '' })).toEqual({ ok: false, error: 'Carboidratos: no máximo 2.000' });
  });

  it('formulários levam kcal e macros ao rascunho', () => {
    const plan = readPlanForm({ ...emptyPlanForm(), name: 'Lanche', time: '16:00', kcal: '280' });
    expect(plan.ok && plan.value).toMatchObject({ kcal: 280, protein_g: null });
    const log = readLogForm({ ...emptyLogForm('2026-11-26', '16:10', null), description: 'x', fat: '7' });
    expect(log.ok && log.value).toMatchObject({ kcal: null, fat_g: 7 });
  });

  it('ligar o registro a uma refeição do plano só preenche os campos vazios', () => {
    const form = { ...emptyLogForm('2026-11-26', '16:10', null), kcal: '310' };
    const plan = { kcal: 280, protein_g: 11, carbs_g: null, fat_g: 7 } as Parameters<typeof fillFromPlan>[1];
    expect(fillFromPlan(form, plan)).toEqual({ kcal: '310', protein: '11', carbs: '', fat: '7' });
  });
});

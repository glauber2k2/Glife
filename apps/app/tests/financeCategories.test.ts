import type { Budget, Category } from '@glife/domain/finance';
import { describe, expect, it } from 'vitest';

import {
  CATEGORY_ICON_CHOICES,
  budgetPlan,
  categoryFormFrom,
  categoryMeta,
  emptyCategoryForm,
  readCategoryForm,
} from '../src/features/finance/components/categoryForm';
import { moveWithin, sortByIds } from '../src/features/finance/components/ordering';

const CAT = '11111111-1111-4111-8111-111111111111';

function budget(starts_month: string, amount_cents: number, extra: Partial<Budget> = {}): Budget {
  return {
    id: `b-${starts_month}`,
    user_id: 'u',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    deleted_at: null,
    category_id: CAT,
    starts_month,
    amount_cents,
    ...extra,
  } as Budget;
}

describe('ordenar contas e categorias', () => {
  it('troca com o vizinho do grupo e mantém quem está fora no lugar', () => {
    const full = ['a', 'x', 'b', 'c'];
    const group = ['a', 'b', 'c'];
    expect(moveWithin(full, group, 'b', -1)).toEqual(['b', 'x', 'a', 'c']);
    expect(moveWithin(full, group, 'b', 1)).toEqual(['a', 'x', 'c', 'b']);
  });

  it('ponta do grupo ou id de fora não move', () => {
    expect(moveWithin(['a', 'b'], ['a', 'b'], 'a', -1)).toBeNull();
    expect(moveWithin(['a', 'b'], ['a', 'b'], 'b', 1)).toBeNull();
    expect(moveWithin(['a', 'b', 'x'], ['a', 'b'], 'x', -1)).toBeNull();
  });

  it('devolve sempre a lista completa, sem repetir', () => {
    const next = moveWithin(['a', 'b', 'c', 'd'], ['b', 'd'], 'd', -1)!;
    expect(next).toEqual(['a', 'd', 'c', 'b']);
    expect(new Set(next).size).toBe(4);
  });

  it('sortByIds segue a ordem dada; os de fora vão para o fim', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(sortByIds(items, ['c', 'a']).map((i) => i.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('formulário de categoria', () => {
  it('nome obrigatório, espaços colapsados e limite', () => {
    expect(readCategoryForm({ ...emptyCategoryForm(), name: '   ' })).toEqual({ ok: false, error: 'Dê um nome à categoria' });
    const ok = readCategoryForm({ ...emptyCategoryForm(), name: '  Viagens   de  férias ' });
    expect(ok.ok && ok.value.name).toBe('Viagens de férias');
    expect(readCategoryForm({ ...emptyCategoryForm(), name: 'x'.repeat(61) }).ok).toBe(false);
  });

  it('receita não tem orçamento; despesa sem valor = 0', () => {
    const income = readCategoryForm({ ...emptyCategoryForm('income'), name: 'Bico', budgetCents: 5000 });
    expect(income.ok && income.value.budgetCents).toBe(0);
    const expense = readCategoryForm({ ...emptyCategoryForm(), name: 'Viagens', budgetCents: null });
    expect(expense.ok && expense.value.budgetCents).toBe(0);
  });

  it('parte da categoria existente', () => {
    const c = { name: 'Mercado', kind: 'expense', icon: 'shopping-cart', color: 'sage' } as Category;
    expect(categoryFormFrom(c, 120000)).toEqual({ name: 'Mercado', kind: 'expense', icon: 'shopping-cart', color: 'sage', budgetCents: 120000 });
  });

  it('16 ícones na grade', () => {
    expect(CATEGORY_ICON_CHOICES).toHaveLength(16);
    expect(new Set(CATEGORY_ICON_CHOICES).size).toBe(16);
  });

  it('linha da lista', () => {
    const money = (c: number) => `R$ ${c / 100}`;
    expect(categoryMeta('income', 100, money)).toBe('Receita');
    expect(categoryMeta('expense', null, money)).toBe('Sem orçamento');
    expect(categoryMeta('expense', 150000, money)).toBe('Orçamento R$ 1500');
  });
});

describe('plano do orçamento mensal (a partir do mês atual)', () => {
  it('sem orçamento e zero: nada a fazer', () => {
    expect(budgetPlan(CAT, [], '2026-11', 0)).toEqual({ set: null, remove: [] });
  });

  it('valor novo grava no mês e tira registros futuros', () => {
    const later = budget('2027-01', 9000);
    const plan = budgetPlan(CAT, [budget('2026-05', 5000), later], '2026-11', 7000);
    expect(plan).toEqual({ set: 7000, remove: [later] });
  });

  it('mesmo valor em vigor: não grava', () => {
    expect(budgetPlan(CAT, [budget('2026-05', 5000)], '2026-11', 5000)).toEqual({ set: null, remove: [] });
  });

  it('zero tira o registro do mês e o anterior que ainda valeria', () => {
    const old = budget('2026-05', 5000);
    const now = budget('2026-11', 6000);
    const future = budget('2027-02', 7000);
    const plan = budgetPlan(CAT, [old, now, future], '2026-11', 0);
    expect(plan.set).toBeNull();
    expect(plan.remove.map((b) => b.starts_month).sort()).toEqual(['2026-05', '2026-11', '2027-02']);
  });

  it('ignora excluídos e outras categorias', () => {
    const gone = budget('2026-05', 5000, { deleted_at: '2026-06-01T00:00:00.000Z' });
    const other = budget('2026-05', 5000, { category_id: '22222222-2222-4222-8222-222222222222' });
    expect(budgetPlan(CAT, [gone, other], '2026-11', 0)).toEqual({ set: null, remove: [] });
  });
});

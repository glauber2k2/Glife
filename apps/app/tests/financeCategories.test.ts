import type { Category } from '@glife/domain/finance';
import { describe, expect, it } from 'vitest';

import {
  CATEGORY_ICON_CHOICES,
  categoryFormFrom,
  categoryMeta,
  emptyCategoryForm,
  readCategoryForm,
} from '../src/features/finance/components/categoryForm';
import { createOrderQueue, moveWithin, sortByIds } from '../src/features/finance/components/ordering';

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

describe('fila de gravação da ordem', () => {
  it('grava em ordem; falha descarta o que estava na fila e libera os pedidos seguintes', async () => {
    const q = createOrderQueue();
    const saved: string[] = [];
    const errors: unknown[] = [];
    const onError = (e: unknown) => errors.push(e);
    q.push(async () => void saved.push('a'), onError);
    q.push(async () => {
      throw new Error('falhou');
    }, onError);
    await q.push(async () => void saved.push('c (montada sobre a falha)'), onError);
    expect(saved).toEqual(['a']);
    expect(errors).toHaveLength(1);
    await q.push(async () => void saved.push('d'), onError);
    expect(saved).toEqual(['a', 'd']);
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

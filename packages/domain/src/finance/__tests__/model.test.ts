import { describe, expect, it } from 'vitest';

import { isRepositoryError, setIdGenerator } from '../../core/index.ts';
import {
  applyAccountPatch,
  applyTransactionPatch,
  checkCategoryFits,
  newAccount,
  newBudget,
  newCategory,
  newRecurrence,
  newTransaction,
  type Category,
} from '../index.ts';

const USER = '11110000-0000-4000-8000-000000000001';
const CC = 'acc00000-0000-4000-8000-000000000001';
const CC2 = 'acc00000-0000-4000-8000-000000000002';
const CAT = 'ca700000-0000-4000-8000-000000000001';
const clock = () => new Date('2026-11-24T12:00:00.000Z');
let seq = 0;
setIdGenerator(() => `9f2c0000-0000-4000-8000-${String(++seq).padStart(12, '0')}`);

const rejects = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return isRepositoryError(e, 'validation');
  }
  return false;
};

const card = { name: 'Nubank', kind: 'credit_card', closing_day: 3, due_day: 10, payment_account_id: CC } as const;
const expense = { type: 'expense', amount_cents: 1000, date: '2026-11-24', account_id: CC } as const;

describe('contas', () => {
  it('cria conta corrente com padrões', () => {
    const a = newAccount({ name: 'Itaú', kind: 'checking', initial_balance_cents: -5000 }, USER, clock);
    expect(a).toMatchObject({
      user_id: USER,
      archived: false,
      closing_day: null,
      due_day: null,
      credit_limit_cents: null,
      payment_account_id: null,
      initial_balance_cents: -5000,
    });
  });

  it('cartão exige fechamento, vencimento e conta pagadora', () => {
    expect(newAccount(card, USER, clock)).toMatchObject({ kind: 'credit_card', initial_balance_cents: 0 });
    expect(rejects(() => newAccount({ ...card, closing_day: null }, USER))).toBe(true);
    expect(rejects(() => newAccount({ ...card, due_day: null }, USER))).toBe(true);
    expect(rejects(() => newAccount({ ...card, payment_account_id: null }, USER))).toBe(true);
    expect(rejects(() => newAccount({ ...card, closing_day: 32 }, USER))).toBe(true);
  });

  it('cartão não tem saldo inicial; conta comum não tem campos de cartão', () => {
    expect(rejects(() => newAccount({ ...card, initial_balance_cents: 100 }, USER))).toBe(true);
    expect(rejects(() => newAccount({ name: 'Itaú', kind: 'checking', closing_day: 3 }, USER))).toBe(true);
  });

  it('patch revalida a conta inteira', () => {
    const a = newAccount(card, USER, clock);
    expect(applyAccountPatch(a, { closing_day: 5 }).closing_day).toBe(5);
    expect(rejects(() => applyAccountPatch(a, { kind: 'checking' }))).toBe(true);
  });
});

describe('transações', () => {
  it('padrão confirmada, sem parcela nem recorrência', () => {
    expect(newTransaction(expense, USER, clock)).toMatchObject({
      status: 'confirmed',
      description: '',
      category_id: null,
      to_account_id: null,
      invoice_month: null,
      installment_of: null,
      recurrence_id: null,
    });
  });

  it.each([[0], [-100], [1.5]])('recusa valor %s', (amount_cents) => {
    expect(rejects(() => newTransaction({ ...expense, amount_cents }, USER))).toBe(true);
  });

  it('transferência precisa de destino diferente e não tem categoria', () => {
    const t = { ...expense, type: 'transfer', to_account_id: CC2 } as const;
    expect(newTransaction(t, USER).to_account_id).toBe(CC2);
    expect(rejects(() => newTransaction({ ...t, to_account_id: null }, USER))).toBe(true);
    expect(rejects(() => newTransaction({ ...t, to_account_id: CC }, USER))).toBe(true);
    expect(rejects(() => newTransaction({ ...t, category_id: CAT }, USER))).toBe(true);
    expect(rejects(() => newTransaction({ ...expense, to_account_id: CC2 }, USER))).toBe(true);
  });

  it('parcela tem os três campos e índice dentro do total', () => {
    const p = { ...expense, installment_of: CC2, installment_index: 4, installment_count: 10 };
    expect(newTransaction(p, USER).installment_index).toBe(4);
    expect(rejects(() => newTransaction({ ...p, installment_index: 0 }, USER))).toBe(true);
    expect(rejects(() => newTransaction({ ...p, installment_index: 11 }, USER))).toBe(true);
    expect(rejects(() => newTransaction({ ...p, installment_count: 121, installment_index: 1 }, USER))).toBe(true);
    expect(rejects(() => newTransaction({ ...expense, installment_index: 1 }, USER))).toBe(true);
  });

  it('ocorrência exige regra e data juntas', () => {
    expect(rejects(() => newTransaction({ ...expense, recurrence_id: CC2 }, USER))).toBe(true);
    expect(newTransaction({ ...expense, recurrence_id: CC2, occurrence_date: '2026-12-10' }, USER).occurrence_date).toBe(
      '2026-12-10',
    );
  });

  it('recusa data e mês de fatura inválidos', () => {
    expect(rejects(() => newTransaction({ ...expense, date: '2026-02-30' }, USER))).toBe(true);
    expect(rejects(() => newTransaction({ ...expense, invoice_month: '2026-13' }, USER))).toBe(true);
  });

  it('patch confirma e troca valor, mas não quebra regras', () => {
    const t = newTransaction({ ...expense, status: 'planned' }, USER, clock);
    expect(applyTransactionPatch(t, { status: 'confirmed', amount_cents: 2000 })).toMatchObject({
      status: 'confirmed',
      amount_cents: 2000,
    });
    expect(rejects(() => applyTransactionPatch(t, { type: 'transfer' }))).toBe(true);
  });
});

describe('recorrências e orçamentos', () => {
  const rule = { ...expense, frequency: 'monthly', start_date: '2026-12-10' } as const;

  it('recorrência com padrões', () => {
    const { date: _date, ...withoutDate } = rule;
    expect(newRecurrence(withoutDate, USER)).toMatchObject({ interval_count: 1, end_date: null });
  });

  it('recusa intervalo zero e fim antes do início', () => {
    const { date: _date, ...r } = rule;
    expect(rejects(() => newRecurrence({ ...r, interval_count: 0 }, USER))).toBe(true);
    expect(rejects(() => newRecurrence({ ...r, end_date: '2026-12-09' }, USER))).toBe(true);
  });

  it('orçamento por categoria e mês', () => {
    expect(newBudget({ category_id: CAT, starts_month: '2026-12', amount_cents: 80000 }, USER).starts_month).toBe('2026-12');
    expect(rejects(() => newBudget({ category_id: CAT, starts_month: '2026-12-01', amount_cents: 1 }, USER))).toBe(true);
  });

  it('categoria só com cor da paleta e ícone em kebab-case', () => {
    expect(newCategory({ name: 'Mercado', kind: 'expense', color: 'sage', icon: 'shopping-cart' }, USER).archived).toBe(
      false,
    );
    expect(rejects(() => newCategory({ name: 'X', kind: 'expense', color: '#ff0000' as 'sage', icon: 'x' }, USER))).toBe(true);
    expect(rejects(() => newCategory({ name: '', kind: 'expense', color: 'sage', icon: 'x' }, USER))).toBe(true);
  });
});

describe('checkCategoryFits', () => {
  const cat = (kind: 'expense' | 'income') => ({ kind }) as Category;

  it.each([
    ['expense', 'checking', 'expense', true],
    ['expense', 'checking', 'income', false],
    ['income', 'checking', 'income', true],
    ['income', 'checking', 'expense', false],
    ['income', 'credit_card', 'expense', true],
    ['expense', 'credit_card', null, true],
    ['transfer', 'checking', 'expense', false],
    ['transfer', 'checking', null, true],
  ] as const)('%s em %s com categoria %s → %s', (type, accountKind, kind, ok) => {
    expect(checkCategoryFits(type, accountKind, kind ? cat(kind) : null)).toBe(ok);
  });
});

describe('ajuste de saldo (modelo)', () => {
  const base = { amount_cents: 237, date: '2026-11-24', account_id: CC, is_adjustment: true } as const;
  it('aceita receita ou despesa sem categoria', () => {
    expect(newTransaction({ ...base, type: 'expense' }, USER, clock).is_adjustment).toBe(true);
    expect(newTransaction({ ...base, type: 'income' }, USER, clock).is_adjustment).toBe(true);
  });
  it('recusa transferência ou categoria', () => {
    expect(rejects(() => newTransaction({ ...base, type: 'transfer', to_account_id: CC2 }, USER, clock))).toBe(true);
    expect(rejects(() => newTransaction({ ...base, type: 'expense', category_id: CAT }, USER, clock))).toBe(true);
  });
  it('sort_order padrão é 0', () => {
    expect(newAccount({ name: 'x', kind: 'checking' }, USER, clock).sort_order).toBe(0);
    expect(newCategory({ name: 'x', kind: 'expense', color: 'sage', icon: 'a' }, USER, clock).sort_order).toBe(0);
  });
});

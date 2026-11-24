import { describe, expect, it } from 'vitest';

import { setIdGenerator } from '../../core/index.ts';
import {
  newAccount,
  planInstallmentPurchase,
  planOngoingInstallments,
  planPreviousBalance,
  type Account,
} from '../index.ts';

const USER = '11110000-0000-4000-8000-000000000001';
const CC = 'acc00000-0000-4000-8000-000000000001';
let seq = 0;
setIdGenerator(() => `9f2c0000-0000-4000-8000-${String(++seq).padStart(12, '0')}`);

const card: Account = newAccount(
  { name: 'Nubank', kind: 'credit_card', closing_day: 3, due_day: 10, payment_account_id: CC },
  USER,
);
const checking: Account = newAccount({ name: 'Itaú', kind: 'checking' }, USER);
const base = { card, description: 'Geladeira', category_id: null };

describe('planInstallmentPurchase', () => {
  it('3 parcelas sem perder centavo, uma por fatura, ligadas à primeira', () => {
    const rows = planInstallmentPurchase({ ...base, totalCents: 100000, count: 3, date: '2026-11-28' });
    expect(rows.map((r) => r.amount_cents)).toEqual([33334, 33333, 33333]);
    expect(rows.map((r) => r.invoice_month)).toEqual(['2026-12', '2027-01', '2027-02']);
    expect(rows.map((r) => r.date)).toEqual(['2026-11-28', '2026-12-28', '2027-01-28']);
    expect(rows.map((r) => r.installment_index)).toEqual([1, 2, 3]);
    expect(rows.every((r) => r.installment_count === 3 && r.installment_of === rows[0]!.id)).toBe(true);
    expect(rows.every((r) => r.status === 'confirmed' && r.type === 'expense' && r.account_id === card.id)).toBe(true);
    expect(new Set(rows.map((r) => r.id)).size).toBe(3);
  });

  it('dia 31 vira o último dia nos meses curtos', () => {
    const rows = planInstallmentPurchase({ ...base, totalCents: 2000, count: 2, date: '2027-01-31' });
    expect(rows.map((r) => r.date)).toEqual(['2027-01-31', '2027-02-28']);
  });

  it('à vista vira compra simples', () => {
    const [row, ...rest] = planInstallmentPurchase({ ...base, totalCents: 4590, count: 1, date: '2026-11-28' });
    expect(rest).toEqual([]);
    expect(row).toMatchObject({ amount_cents: 4590, invoice_month: '2026-12', installment_of: null, installment_index: null });
  });
});

describe('planOngoingInstallments', () => {
  it('parcela 4 de 10 cria só as 7 que faltam, a primeira na fatura atual', () => {
    const rows = planOngoingInstallments({ ...base, installmentCents: 25000, currentIndex: 4, count: 10, today: '2026-11-24' });
    expect(rows).toHaveLength(7);
    expect(rows.map((r) => r.installment_index)).toEqual([4, 5, 6, 7, 8, 9, 10]);
    expect(rows.every((r) => r.amount_cents === 25000 && r.installment_count === 10)).toBe(true);
    expect(rows[0]!.invoice_month).toBe('2026-12');
    expect(rows[6]!.invoice_month).toBe('2027-06');
    expect(rows.every((r) => r.installment_of === rows[0]!.id)).toBe(true);
  });

  it.each([[0], [11]])('recusa parcela atual %i', (currentIndex) => {
    expect(() =>
      planOngoingInstallments({ ...base, installmentCents: 25000, currentIndex, count: 10, today: '2026-11-24' }),
    ).toThrow(RangeError);
  });
});

describe('planPreviousBalance', () => {
  it('saldo anterior na fatura aberta, sem categoria', () => {
    expect(planPreviousBalance({ card, amountCents: 124000, today: '2026-11-24' })).toMatchObject({
      type: 'expense',
      amount_cents: 124000,
      description: 'Saldo anterior',
      category_id: null,
      invoice_month: '2026-12',
      date: '2026-11-24',
    });
  });
});

describe('só para cartão', () => {
  it('recusa conta que não é cartão', () => {
    expect(() => planInstallmentPurchase({ ...base, card: checking, totalCents: 100, count: 2, date: '2026-11-28' })).toThrow(
      RangeError,
    );
    expect(() =>
      planOngoingInstallments({ ...base, card: checking, installmentCents: 1, currentIndex: 1, count: 2, today: '2026-11-24' }),
    ).toThrow(RangeError);
    expect(() => planPreviousBalance({ card: checking, amountCents: 1, today: '2026-11-24' })).toThrow(RangeError);
  });
});

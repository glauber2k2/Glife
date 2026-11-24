import { describe, expect, it } from 'vitest';

import { setIdGenerator } from '../../core/index.ts';
import {
  accountBalance,
  budgetFor,
  budgetMonth,
  expandRecurrence,
  invoiceSummary,
  isOverdue,
  monthSummary,
  newAccount,
  newBudget,
  newRecurrence,
  newTransaction,
  projectBalance,
  suggestInvoiceToPay,
  type Transaction,
  type TransactionDraft,
} from '../index.ts';

const USER = '11110000-0000-4000-8000-000000000001';
const MERCADO = 'ca700000-0000-4000-8000-000000000001';
let seq = 0;
setIdGenerator(() => `9f2c0000-0000-4000-8000-${String(++seq).padStart(12, '0')}`);
const on = (day: string) => () => new Date(`${day}T12:00:00.000Z`);

const CC = newAccount({ name: 'Itaú', kind: 'checking', initial_balance_cents: 210000 }, USER);
const NU = newAccount({ name: 'Nubank', kind: 'credit_card', closing_day: 3, due_day: 10, payment_account_id: CC.id }, USER);
const accounts = [CC, NU];
const tx = (d: TransactionDraft) => newTransaction(d, USER);

const purchase = tx({ type: 'expense', amount_cents: 30000, date: '2026-11-28', account_id: NU.id, invoice_month: '2026-12', category_id: MERCADO });
const payment = (amount: number, status: 'confirmed' | 'planned' = 'confirmed') =>
  tx({ type: 'transfer', amount_cents: amount, date: '2026-12-08', account_id: CC.id, to_account_id: NU.id, invoice_month: '2026-12', status });
const refund = tx({ type: 'income', amount_cents: 5000, date: '2026-11-30', account_id: NU.id, invoice_month: '2026-12', category_id: MERCADO });

describe('budgetMonth', () => {
  it('cartão conta no mês da fatura; transferência e pulado não contam', () => {
    expect(budgetMonth(purchase)).toBe('2026-12');
    expect(budgetMonth(payment(30000))).toBeNull();
    expect(budgetMonth({ ...purchase, status: 'skipped' })).toBeNull();
    expect(budgetMonth(tx({ type: 'expense', amount_cents: 1, date: '2026-11-28', account_id: CC.id }))).toBe('2026-11');
  });
});

describe('saldos', () => {
  it('compra no cartão e pagamento da fatura', () => {
    const txs = [purchase, payment(30000)];
    expect(accountBalance(NU, txs)).toBe(0);
    expect(accountBalance(CC, txs)).toBe(180000);
    expect(accountBalance(NU, [purchase])).toBe(30000);
  });

  it('previsto e excluído não mexem no saldo real', () => {
    const planned = tx({ type: 'expense', amount_cents: 999, date: '2026-11-20', account_id: CC.id, status: 'planned' });
    const deleted = { ...tx({ type: 'expense', amount_cents: 777, date: '2026-11-20', account_id: CC.id }), deleted_at: '2026-11-21T00:00:00.000Z' };
    expect(accountBalance(CC, [planned, deleted])).toBe(210000);
  });
});

describe('monthSummary', () => {
  it('sem contagem dupla entre compra no cartão e pagamento', () => {
    const s = monthSummary('2026-12', { transactions: [purchase, payment(30000)], occurrences: [], accounts });
    expect(s.expense.confirmed).toBe(30000);
    expect(s.income.confirmed).toBe(0);
  });

  it('estorno no cartão abate o gasto da categoria', () => {
    const s = monthSummary('2026-12', { transactions: [purchase, refund], occurrences: [], accounts });
    expect(s.byCategory.get(MERCADO)?.confirmed).toBe(25000);
    expect(s.expense.confirmed).toBe(25000);
    expect(s.income.confirmed).toBe(0);
  });

  it('previsto entra separado do realizado', () => {
    const planned = tx({ type: 'expense', amount_cents: 45000, date: '2026-12-15', account_id: CC.id, status: 'planned' });
    const s = monthSummary('2026-12', { transactions: [purchase, planned], occurrences: [], accounts });
    expect(s.expense).toEqual({ confirmed: 30000, planned: 45000 });
    expect(s.byCategory.get(null)).toEqual({ confirmed: 0, planned: 45000 });
  });
});

describe('invoiceSummary', () => {
  it.each<[string, Transaction[], string]>([
    ['2026-11-24', [purchase], 'open'],
    ['2026-12-05', [purchase], 'closed'],
    ['2026-12-05', [purchase, payment(10000)], 'partial'],
    ['2026-12-11', [purchase], 'overdue'],
    ['2026-12-11', [purchase, payment(30000)], 'paid'],
  ])('em %s → %s', (today, txs, status) => {
    expect(invoiceSummary(NU, '2026-12', txs, today).status).toBe(status);
  });

  it('total, pago, restante e datas', () => {
    expect(invoiceSummary(NU, '2026-12', [purchase, refund, payment(10000)], '2026-12-05')).toEqual({
      total: 25000,
      paid: 10000,
      remaining: 15000,
      status: 'partial',
      closingDate: '2026-12-03',
      dueDate: '2026-12-10',
    });
  });

  it('pagamento previsto não conta como pago', () => {
    expect(invoiceSummary(NU, '2026-12', [purchase, payment(30000, 'planned')], '2026-12-05').paid).toBe(0);
  });
});

describe('suggestInvoiceToPay', () => {
  it('fatura fechada mais antiga com valor restante', () => {
    const jan = tx({ type: 'expense', amount_cents: 100, date: '2026-12-05', account_id: NU.id, invoice_month: '2027-01' });
    expect(suggestInvoiceToPay(NU, [purchase, jan], '2027-01-04')).toBe('2026-12');
    expect(suggestInvoiceToPay(NU, [purchase, payment(30000), jan], '2027-01-04')).toBe('2027-01');
    expect(suggestInvoiceToPay(NU, [purchase], '2026-11-24')).toBeNull();
  });
});

describe('isOverdue', () => {
  it('só previsto com data passada', () => {
    expect(isOverdue({ status: 'planned', date: '2026-11-23' }, '2026-11-24')).toBe(true);
    expect(isOverdue({ status: 'planned', date: '2026-11-24' }, '2026-11-24')).toBe(false);
    expect(isOverdue({ status: 'confirmed', date: '2026-11-23' }, '2026-11-24')).toBe(false);
  });
});

describe('budgetFor', () => {
  it('vale o orçamento mais recente até o mês', () => {
    const budgets = [
      newBudget({ category_id: MERCADO, starts_month: '2026-10', amount_cents: 80000 }, USER),
      newBudget({ category_id: MERCADO, starts_month: '2027-01', amount_cents: 90000 }, USER),
    ];
    expect(budgetFor(MERCADO, '2026-12', budgets)).toBe(80000);
    expect(budgetFor(MERCADO, '2027-02', budgets)).toBe(90000);
    expect(budgetFor(MERCADO, '2026-09', budgets)).toBeNull();
  });
});

describe('projectBalance', () => {
  const salary = newRecurrence(
    { type: 'income', amount_cents: 500000, account_id: CC.id, frequency: 'monthly', start_date: '2026-12-10' },
    USER,
    on('2026-11-24'),
  );
  const subscription = newRecurrence(
    { type: 'expense', amount_cents: 3990, account_id: NU.id, frequency: 'monthly', start_date: '2026-11-26' },
    USER,
    on('2026-11-24'),
  );
  const occurrences = [salary, subscription].flatMap((r) => expandRecurrence(r, '2026-11-24', '2026-12-31', []));

  it('previsão da conta pagadora: salário, e o cartão só pela fatura', () => {
    const data = { transactions: [purchase], occurrences, cards: [NU] };
    expect(projectBalance(CC, '2026-12-31', data)).toBe(210000 - 30000 - 3990 + 500000);
    expect(invoiceSummary(NU, '2026-12', [purchase], '2026-11-24', occurrences).total).toBe(33990);
  });

  it('pagamento previsto da fatura não desconta duas vezes', () => {
    const data = { transactions: [purchase, payment(33990, 'planned')], occurrences, cards: [NU] };
    expect(projectBalance(CC, '2026-12-31', data)).toBe(210000 - 33990 + 500000);
  });

  it('antes do vencimento a fatura ainda não pesa', () => {
    expect(projectBalance(CC, '2026-12-09', { transactions: [purchase], occurrences, cards: [NU] })).toBe(210000);
  });
});

import { describe, expect, it } from 'vitest';

import { setIdGenerator } from '../../core/index.ts';
import { accountBalance, invoiceSummary, monthSummary, newAccount, newTransaction, paidByOther } from '../index.ts';

const USER = '11110000-0000-4000-8000-000000000001';
let seq = 0;
setIdGenerator(() => `9f2c0000-0000-4000-8000-${String(++seq).padStart(12, '0')}`);

const CC = newAccount({ name: 'Itaú', kind: 'checking', initial_balance_cents: 1000 }, USER);
const NU = newAccount({ name: 'Nubank', kind: 'credit_card', closing_day: 3, due_day: 10, payment_account_id: CC.id }, USER);
const accounts = [CC, NU];
const build = (rows: ReturnType<typeof paidByOther>) => rows.map((r) => newTransaction(r, USER));

describe('paidByOther', () => {
  it('fatura paga por outra pessoa: fatura paga e o saldo da conta não muda', () => {
    const purchase = newTransaction(
      { type: 'expense', amount_cents: 30000, date: '2026-11-28', account_id: NU.id, invoice_month: '2026-12' },
      USER,
    );
    const rows = build(paidByOther({ accountId: CC.id, cents: 30000, date: '2026-12-08', who: 'Pai', invoice: { cardId: NU.id, month: '2026-12' } }));
    const txs = [purchase, ...rows];
    expect(accountBalance(CC, txs)).toBe(1000);
    expect(invoiceSummary(NU, '2026-12', txs, '2026-12-08')).toMatchObject({ remaining: 0, status: 'paid' });
    // A compra continua no orçamento; o dinheiro recebido conta como receita.
    const month = monthSummary('2026-12', { transactions: txs, occurrences: [], accounts });
    expect(month.expense.confirmed).toBe(30000);
    expect(rows.find((r) => r.type === 'income')!.description).toBe('Pago por Pai');
  });

  it('conta paga por outra pessoa: só a entrada que compensa o gasto', () => {
    const rows = paidByOther({ accountId: CC.id, cents: 5000, date: '2026-12-08', who: '  ', label: 'Luz' });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ type: 'income', account_id: CC.id, amount_cents: 5000, description: 'Luz · pago por outra pessoa' });
  });

  it('recusa valor não positivo', () => {
    expect(() => paidByOther({ accountId: CC.id, cents: 0, date: '2026-12-08' })).toThrow(RangeError);
  });
});

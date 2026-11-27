import { describe, expect, it } from 'vitest';

import { setIdGenerator } from '../../core/index.ts';
import { financeNotifications, newAccount, newRecurrence, newTransaction, type FinanceData, type TransactionDraft } from '../index.ts';

const USER = '11110000-0000-4000-8000-000000000001';
let seq = 0;
setIdGenerator(() => `7b2c0000-0000-4000-8000-${String(++seq).padStart(12, '0')}`);
const clock = () => new Date('2026-11-01T12:00:00.000Z');
const money = (c: number) => `R$ ${c}`;
const now = { date: '2026-11-26', time: '10:00' };

const ITAU = newAccount({ name: 'Itaú', kind: 'checking', initial_balance_cents: 300000 }, USER, clock);
const CARD = newAccount({ name: 'Itaú Click', kind: 'credit_card', closing_day: 25, due_day: 2, payment_account_id: ITAU.id }, USER, clock);
const tx = (d: TransactionDraft) => newTransaction(d, USER, clock);

const compra = tx({ type: 'expense', amount_cents: 127640, date: '2026-11-10', account_id: CARD.id, invoice_month: '2026-12', description: 'Mercado' });
const internet = tx({ type: 'expense', amount_cents: 11990, date: '2026-11-24', account_id: ITAU.id, status: 'planned', description: 'Internet' });
const futuro = tx({ type: 'expense', amount_cents: 5000, date: '2026-11-28', account_id: ITAU.id, status: 'planned', description: 'Academia' });
const aluguel = newRecurrence(
  { type: 'expense', amount_cents: 185000, account_id: ITAU.id, category_id: null, frequency: 'monthly', start_date: '2026-11-20', description: 'Aluguel' },
  USER,
  clock,
);

const data = (over: Partial<FinanceData> = {}): FinanceData => ({
  accounts: [ITAU, CARD],
  categories: [],
  transactions: [compra, internet, futuro],
  rules: [aluguel],
  budgets: [],
  ...over,
});

describe('finanças: notificações', () => {
  it('fatura que vence em até 7 dias: abre a fatura, com o valor que falta', () => {
    const items = financeNotifications(data(), now, money);
    const fatura = items.find((i) => i.id === `invoice:${CARD.id}:2026-12`)!;
    expect(fatura).toMatchObject({
      module: 'finance',
      title: 'Fatura do Itaú Click vence em 6 dias',
      message: 'R$ 127640 · vence em 02/12',
      route: `/financas/fatura/${CARD.id}?mes=2026-12`,
      action: { label: 'Pagar', kind: 'open' },
    });
    // Apareceu 7 dias antes do vencimento.
    expect(fatura.at).toEqual(new Date(2026, 10, 25, 0, 0));
  });

  it('fatura mais longe que 7 dias ainda não avisa', () => {
    expect(financeNotifications(data(), { date: '2026-11-20' }, money).some((i) => i.id.startsWith('invoice:'))).toBe(false);
  });

  it('previsto atrasado (gravado ou da recorrência) pede confirmar; o de amanhã não', () => {
    const items = financeNotifications(data(), now, money);
    const ids = items.filter((i) => i.id.startsWith('planned:')).map((i) => i.title);
    expect(ids).toEqual(expect.arrayContaining(['Internet em atraso', 'Aluguel em atraso']));
    expect(ids).not.toContain('Academia em atraso');
    expect(items.find((i) => i.title === 'Internet em atraso')).toMatchObject({
      message: 'Venceu em 24/11 · R$ 11990 · ainda não confirmado',
      action: { label: 'Confirmar', kind: 'resolve' },
      at: new Date(2026, 10, 25, 0, 0),
    });
  });

  it('o formato do valor vem de fora (oculto quando o olhinho está fechado)', () => {
    const items = financeNotifications(data(), now, () => 'R$ ••••');
    expect(items.every((i) => !/\d{4,}/.test(i.message))).toBe(true);
  });
});

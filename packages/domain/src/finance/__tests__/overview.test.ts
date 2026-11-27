import { describe, expect, it } from 'vitest';

import { setIdGenerator } from '../../core/index.ts';
import {
  collectOccurrences,
  invoiceDetail,
  isInvoiceDue,
  lastDayOf,
  monthOverview,
  newAccount,
  newBudget,
  newCategory,
  newRecurrence,
  newTransaction,
  nextOccurrenceOf,
  statement,
  upcomingDates,
  type FinanceData,
  type TransactionDraft,
} from '../index.ts';

const USER = '11110000-0000-4000-8000-000000000001';
let seq = 0;
setIdGenerator(() => `7a1c0000-0000-4000-8000-${String(++seq).padStart(12, '0')}`);
const at = (day: string) => () => new Date(`${day}T12:00:00.000Z`);
const TODAY = '2026-12-10';

const ITAU = newAccount({ name: 'Itaú', kind: 'checking', initial_balance_cents: 300000 }, USER, at('2026-11-01'));
const POUP = newAccount({ name: 'Poupança', kind: 'savings', initial_balance_cents: 100000 }, USER, at('2026-11-01'));
const NU = newAccount(
  { name: 'Nubank', kind: 'credit_card', closing_day: 1, due_day: 8, payment_account_id: ITAU.id },
  USER,
  at('2026-11-01'),
);
const MERCADO = newCategory({ name: 'Mercado', kind: 'expense', color: 'slate', icon: 'shopping-cart' }, USER);
const MORADIA = newCategory({ name: 'Moradia', kind: 'expense', color: 'steel', icon: 'house' }, USER);
const SALARIO = newCategory({ name: 'Salário', kind: 'income', color: 'sage', icon: 'briefcase' }, USER);

const tx = (d: TransactionDraft) => newTransaction(d, USER, at('2026-12-01'));
const salario = newRecurrence(
  { type: 'income', amount_cents: 500000, account_id: ITAU.id, category_id: SALARIO.id, frequency: 'monthly', start_date: '2026-11-10', description: 'Salário' },
  USER,
  at('2026-11-01'),
);
const internet = newRecurrence(
  { type: 'expense', amount_cents: 11990, account_id: ITAU.id, category_id: MORADIA.id, frequency: 'monthly', start_date: '2026-12-08', description: 'Internet' },
  USER,
  at('2026-12-01'),
);
const aluguel = newRecurrence(
  { type: 'expense', amount_cents: 185000, account_id: ITAU.id, category_id: MORADIA.id, frequency: 'monthly', start_date: '2026-12-15', description: 'Aluguel' },
  USER,
  at('2026-12-01'),
);
const netflix = newRecurrence(
  { type: 'expense', amount_cents: 5590, account_id: NU.id, category_id: null, frequency: 'monthly', start_date: '2026-12-18', description: 'Netflix' },
  USER,
  at('2026-12-01'),
);

const salarioNov = tx({
  type: 'income', amount_cents: 500000, date: '2026-11-10', account_id: ITAU.id, category_id: SALARIO.id, description: 'Salário',
});
const compraNov = tx({ type: 'expense', amount_cents: 40000, date: '2026-11-25', account_id: NU.id, category_id: MERCADO.id, invoice_month: '2026-12', description: 'Mercado' });
const compraDez = tx({ type: 'expense', amount_cents: 20000, date: '2026-12-05', account_id: NU.id, category_id: MERCADO.id, invoice_month: '2027-01', description: 'Mercado' });
const mercadoConta = tx({ type: 'expense', amount_cents: 15000, date: '2026-12-06', account_id: ITAU.id, category_id: MERCADO.id, description: 'Feira' });

// Ocorrência de novembro do salário já confirmada (grava linha da regra).
const salarioNovRow = { ...salarioNov, recurrence_id: salario.id, occurrence_date: '2026-11-10' };

function data(extra: Partial<FinanceData> = {}): FinanceData {
  return {
    accounts: [ITAU, POUP, NU],
    categories: [MERCADO, MORADIA, SALARIO],
    transactions: [salarioNovRow, compraNov, compraDez, mercadoConta],
    rules: [salario, internet, aluguel, netflix],
    budgets: [newBudget({ category_id: MERCADO.id, starts_month: '2026-12', amount_cents: 50000 }, USER)],
    ...extra,
  };
}

describe('monthOverview', () => {
  const d = data();
  const occ = collectOccurrences(d, lastDayOf('2027-01'));
  const o = monthOverview(d, occ, TODAY, '2026-12');

  it('saldo hoje soma só as contas (cartão fica fora)', () => {
    expect(o.balanceToday).toBe(300000 + 500000 - 15000 + 100000);
  });

  it('a confirmar: atrasados e de hoje, sem os do cartão', () => {
    expect(o.toConfirm.map((p) => p.description)).toEqual(['Internet', 'Salário']);
    expect(o.toConfirm.every((p) => p.transactionId === null)).toBe(true);
  });

  it('próximos: previstos até o fim do mês; fatura de dezembro já venceu (08/12) e não entra', () => {
    const names = o.upcoming.map((x) => (isInvoiceDue(x) ? 'fatura' : x.description));
    expect(names).toEqual(['Aluguel']);
  });

  it('esperado = saldo + previstos pendentes + fatura vencida em aberto', () => {
    expect(o.expected).toBe(o.balanceToday + 500000 - 11990 - 185000 - 40000);
  });

  it('cartão mostra a fatura vencida', () => {
    expect(o.cards[0]!.invoiceMonth).toBe('2026-12');
    expect(o.cards[0]!.summary.status).toBe('overdue');
  });

  it('orçamento: compra no cartão conta no mês da fatura; previsto separado', () => {
    const mercado = o.budgets.find((b) => b.category.id === MERCADO.id)!;
    expect(mercado).toMatchObject({ spent: 40000 + 15000, planned: 0, budget: 50000 });
    const moradia = o.budgets.find((b) => b.category.id === MORADIA.id)!;
    expect(moradia).toMatchObject({ spent: 0, planned: 11990 + 185000, budget: null });
  });

  it('orçamento 0 a partir de janeiro: "sem orçamento" em janeiro, dezembro mantém o valor', () => {
    const zero = newBudget({ category_id: MERCADO.id, starts_month: '2027-01', amount_cents: 0 }, USER);
    const d0 = data({ budgets: [...d.budgets, zero] });
    expect(monthOverview(d0, occ, TODAY, '2027-01').budgets.find((b) => b.category.id === MERCADO.id)!.budget).toBeNull();
    expect(monthOverview(d0, occ, TODAY, '2026-12').budgets.find((b) => b.category.id === MERCADO.id)!.budget).toBe(50000);
  });

  it('mês futuro: nada a confirmar; fatura de janeiro aparece nos próximos', () => {
    const jan = monthOverview(d, occ, TODAY, '2027-01');
    expect(jan.toConfirm).toEqual([]);
    const due = jan.upcoming.find(isInvoiceDue)!;
    expect(due).toMatchObject({ cardId: NU.id, invoiceMonth: '2027-01', remaining: 20000 + 5590 });
  });

  it('últimos: confirmados do mês, mais novos primeiro', () => {
    expect(o.recent.map((t) => t.id)).toEqual([mercadoConta.id, compraDez.id]);
  });

  it('ajuste de saldo não aparece nos últimos nem no orçamento', () => {
    const adj = tx({ type: 'expense', amount_cents: 999, date: '2026-12-09', account_id: ITAU.id, is_adjustment: true });
    const withAdj = monthOverview({ ...d, transactions: [...d.transactions, adj] }, occ, TODAY, '2026-12');
    expect(withAdj.recent.map((t) => t.id)).toEqual([mercadoConta.id, compraDez.id]);
    expect(withAdj.balanceToday).toBe(o.balanceToday - 999);
  });
});

describe('invoiceDetail', () => {
  it('compras, previstos do cartão e total projetado', () => {
    const d = data();
    const occ = collectOccurrences(d, lastDayOf('2027-01'));
    const inv = invoiceDetail(NU, '2027-01', d, occ, TODAY);
    expect(inv.items.map((t) => t.id)).toEqual([compraDez.id]);
    expect(inv.planned.map((p) => p.description)).toEqual(['Netflix']);
    expect(inv.projected).toBe(25590);
    expect(inv.summary.status).toBe('open');
  });
});

describe('statement', () => {
  it('dias do mais novo ao mais antigo, com saldo real no passado e previsto no futuro', () => {
    const d = data();
    const occ = collectOccurrences(d, '2026-12-31');
    const st = statement(ITAU, d, occ, TODAY, '2026-12-31');
    expect(st.balance).toBe(300000 + 500000 - 15000);
    expect(st.days[0]!.date).toBe('2026-12-15');
    expect(st.days[0]!.projected).toBe(true);
    const today = st.days.find((x) => x.date === TODAY)!;
    expect(today.entries[0]).toMatchObject({ planned: true, today: true });
    const dia6 = st.days.find((x) => x.date === '2026-12-06')!;
    expect(dia6.balance).toBe(st.balance);
    const dia8 = st.days.find((x) => x.date === '2026-12-08')!;
    expect(dia8.entries[0]).toMatchObject({ late: true, amount: -11990 });
  });
});

describe('recorrências', () => {
  it('próxima ocorrência e atraso; no cartão o passado não atrasa', () => {
    const d = data();
    const occ = collectOccurrences(d, '2027-12-31');
    expect(nextOccurrenceOf(internet, occ, TODAY, false)).toEqual({ date: '2026-12-08', late: true });
    expect(nextOccurrenceOf(aluguel, occ, TODAY, false)).toEqual({ date: '2026-12-15', late: false });
    expect(nextOccurrenceOf(netflix, occ, '2026-12-20', true)).toEqual({ date: '2027-01-18', late: false });
  });

  it('próximas datas a partir de uma data', () => {
    expect(upcomingDates(aluguel, '2026-12-16', 3)).toEqual(['2027-01-15', '2027-02-15', '2027-03-15']);
    expect(upcomingDates({ ...aluguel, end_date: '2027-01-31' }, '2026-12-01', 3)).toEqual(['2026-12-15', '2027-01-15']);
  });
});

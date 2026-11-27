import { describe, expect, it } from 'vitest';

import { accountBalance, monthOverview, newAccount, newCategory, newTransaction, projectBalance, statement, type AccountFlow, type FinanceData } from '../index.ts';

const USER = '11110000-0000-4000-8000-000000000001';
const TODAY = '2026-11-25';
const cc = newAccount({ name: 'Itaú', kind: 'checking', initial_balance_cents: 100_000 }, USER);
const mercado = newCategory({ name: 'Mercado', kind: 'expense', color: 'sage', icon: 'shopping-cart' }, USER);
const gasto = newTransaction({ type: 'expense', amount_cents: 10_000, date: '2026-11-05', account_id: cc.id, category_id: mercado.id, description: 'Feira' }, USER);
const flows: AccountFlow[] = [
  { key: 'm1', account_id: cc.id, amount_cents: -50_000, date: '2026-11-10', description: 'Aporte · HGLG11' },
  { key: 'm2', account_id: cc.id, amount_cents: 20_000, date: '2026-11-20', description: 'Resgate · HGLG11' },
];
const data: FinanceData = { accounts: [cc], categories: [mercado], transactions: [gasto], rules: [], budgets: [], flows };

describe('aportes e resgates nas contas', () => {
  it('aporte tira e resgate devolve ao saldo; sem fluxos, nada muda', () => {
    expect(accountBalance(cc, [gasto])).toBe(90_000);
    expect(accountBalance(cc, [gasto], flows)).toBe(60_000);
    expect(accountBalance(cc, [gasto], [{ ...flows[0]!, account_id: 'outra' }])).toBe(90_000);
  });

  it('a previsão parte do saldo com os fluxos', () => {
    expect(projectBalance(cc, '2026-11-30', { transactions: [gasto], occurrences: [], cards: [], flows })).toBe(60_000);
  });

  it('extrato mostra cada fluxo como lançamento realizado', () => {
    const s = statement(cc, data, [], TODAY, TODAY);
    expect(s.balance).toBe(60_000);
    const entries = s.days.flatMap((d) => d.entries);
    expect(entries.find((e) => e.key === 'm1')).toMatchObject({ description: 'Aporte · HGLG11', amount: -50_000, planned: false, type: 'transfer', category_id: null });
    expect(s.days.find((d) => d.date === '2026-11-10')!.balance).toBe(40_000);
  });

  it('início do mês: saldo com os fluxos; orçamento e últimos lançamentos iguais', () => {
    const withFlows = monthOverview(data, [], TODAY, '2026-11');
    const without = monthOverview({ ...data, flows: [] }, [], TODAY, '2026-11');
    expect(withFlows.balanceToday).toBe(60_000);
    expect(withFlows.expected).toBe(60_000);
    expect(withFlows.budgets).toEqual(without.budgets);
    expect(withFlows.recent).toEqual(without.recent);
  });
});

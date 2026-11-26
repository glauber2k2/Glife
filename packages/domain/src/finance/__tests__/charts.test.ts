import { describe, expect, it } from 'vitest';

import { setIdGenerator } from '../../core/index.ts';
import {
  NO_CATEGORY,
  OTHER_CATEGORIES,
  balanceSeries,
  categoryBreakdown,
  categoryDetail,
  chartEntries,
  chartPeriod,
  collectOccurrences,
  firstEntryMonth,
  flowTotals,
  monthBuckets,
  monthSoFar,
  monthWeeks,
  newAccount,
  newBudget,
  newCategory,
  newInvestmentAsset,
  newInvestmentMovement,
  newRecurrence,
  newTransaction,
  niceCeiling,
  portfolioSeries,
  seriesDates,
  weekBuckets,
  type ChartEntry,
  type FinanceData,
  type TransactionDraft,
} from '../index.ts';

const USER = '11110000-0000-4000-8000-000000000001';
let seq = 0;
setIdGenerator(() => `7a1c0000-0000-4000-8000-${String(++seq).padStart(12, '0')}`);
const at = (day: string) => () => new Date(`${day}T12:00:00.000Z`);
const TODAY = '2026-11-25';

const ITAU = newAccount({ name: 'Itaú', kind: 'checking', initial_balance_cents: 100000 }, USER, at('2026-09-01'));
const NU = newAccount({ name: 'Nubank', kind: 'credit_card', closing_day: 1, due_day: 8, payment_account_id: ITAU.id }, USER, at('2026-09-01'));
const MERCADO = newCategory({ name: 'Mercado', kind: 'expense', color: 'slate', icon: 'shopping-cart' }, USER);
const LAZER = newCategory({ name: 'Lazer', kind: 'expense', color: 'steel', icon: 'ticket' }, USER);
const SALARIO = newCategory({ name: 'Salário', kind: 'income', color: 'sage', icon: 'briefcase' }, USER);
const tx = (d: TransactionDraft) => newTransaction(d, USER, at('2026-09-01'));

const salario = (date: string) => tx({ type: 'income', amount_cents: 500000, account_id: ITAU.id, category_id: SALARIO.id, date });
const gasto = (date: string, cents: number, category_id: string | null = MERCADO.id, extra: Partial<TransactionDraft> = {}) =>
  tx({ type: 'expense', amount_cents: cents, account_id: ITAU.id, category_id, date, ...extra });

function dataWith(transactions: FinanceData['transactions'], extra: Partial<FinanceData> = {}): FinanceData {
  return { accounts: [ITAU, NU], categories: [MERCADO, LAZER, SALARIO], transactions, rules: [], budgets: [], ...extra };
}

describe('gráficos: lançamentos', () => {
  it('segue o orçamento: fatura no mês do pagamento, estorno abate, transferência e pulado ficam fora', () => {
    const data = dataWith([
      salario('2026-11-05'),
      tx({ type: 'expense', amount_cents: 3000, account_id: NU.id, category_id: MERCADO.id, date: '2026-11-20', invoice_month: '2026-12' }),
      tx({ type: 'income', amount_cents: 1000, account_id: NU.id, category_id: MERCADO.id, date: '2026-11-21', invoice_month: '2026-12' }),
      tx({ type: 'transfer', amount_cents: 999, account_id: ITAU.id, to_account_id: NU.id, date: '2026-11-08', invoice_month: '2026-11' }),
      gasto('2026-11-10', 500, MERCADO.id, { status: 'skipped' }),
    ]);
    const entries = chartEntries(data, []);
    expect(entries.map((e) => [e.kind, e.month, e.amount])).toEqual([
      ['income', '2026-11', 500000],
      ['expense', '2026-12', 3000],
      ['expense', '2026-12', -1000],
    ]);
  });

  it('inclui ocorrências ainda não gravadas como previstas', () => {
    const rule = newRecurrence(
      { type: 'expense', amount_cents: 5590, account_id: NU.id, category_id: LAZER.id, frequency: 'monthly', start_date: '2026-11-18', description: 'Netflix' },
      USER,
      at('2026-11-01'),
    );
    const data = dataWith([], { rules: [rule] });
    const entries = chartEntries(data, collectOccurrences(data, '2026-11-30'));
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ planned: true, month: '2026-12', amount: 5590, transactionId: null });
  });
});

describe('gráficos: período e barras', () => {
  it('6 meses compara com os 6 anteriores; 12 meses não compara', () => {
    const p = chartPeriod('6m', '2026-11');
    expect(p.months).toEqual(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
    expect(p.previous![0]).toBe('2025-12');
    expect(chartPeriod('12m', '2026-11').previous).toBeNull();
    expect(chartPeriod('month', '2026-01').previous).toEqual(['2025-12']);
  });

  it('soma realizado e previsto por mês e no total', () => {
    const entries = chartEntries(dataWith([salario('2026-10-05'), gasto('2026-11-02', 2000), gasto('2026-11-28', 700, MERCADO.id, { status: 'planned' })]), []);
    const buckets = monthBuckets(entries, ['2026-10', '2026-11']);
    expect(buckets[0]!.income.confirmed).toBe(500000);
    expect(buckets[1]!.expense).toEqual({ confirmed: 2000, planned: 700 });
    expect(flowTotals(buckets).expense).toEqual({ confirmed: 2000, planned: 700 });
    expect(firstEntryMonth(entries)).toBe('2026-10');
  });

  it('semanas: 1–7 … 29–fim; compra de outro mês vai para a ponta', () => {
    expect(monthWeeks('2026-11').map((w) => [w.from, w.to])).toEqual([
      [1, 7],
      [8, 14],
      [15, 21],
      [22, 28],
      [29, 30],
    ]);
    expect(monthWeeks('2026-02')).toHaveLength(4);
    expect(monthWeeks('2026-02')[3]!.to).toBe(28);
    const entries = chartEntries(
      dataWith([
        gasto('2026-11-09', 100),
        tx({ type: 'expense', amount_cents: 50, account_id: NU.id, category_id: MERCADO.id, date: '2026-10-20', invoice_month: '2026-11' }),
      ]),
      [],
    );
    const weeks = weekBuckets(entries, '2026-11');
    expect(weeks.map((w) => w.expense.confirmed)).toEqual([50, 100, 0, 0, 0]);
  });
});

describe('gráficos: para onde foi', () => {
  it('ordena por valor e agrupa o resto em Outras acima de 7 linhas', () => {
    const cats = Array.from({ length: 9 }, (_, i) => newCategory({ name: `C${i}`, kind: 'expense', color: 'slate', icon: 'tag' }, USER));
    const entries = chartEntries(dataWith(cats.map((c, i) => gasto('2026-11-03', (i + 1) * 100, c.id))), []);
    const slices = categoryBreakdown(entries, ['2026-11']);
    expect(slices).toHaveLength(7);
    expect(slices[0]!.categoryIds).toEqual([cats[8]!.id]);
    expect(slices[6]).toMatchObject({ key: OTHER_CATEGORIES, total: 300 + 200 + 100 });
    expect(slices.reduce((s, x) => s + x.share, 0)).toBeCloseTo(1);
  });

  it('sem categoria vira uma linha própria; previsto não entra', () => {
    const entries = chartEntries(dataWith([gasto('2026-11-03', 100, null), gasto('2026-11-28', 900, MERCADO.id, { status: 'planned' })]), []);
    expect(categoryBreakdown(entries, ['2026-11'])).toEqual([{ key: NO_CATEGORY, categoryIds: [null], total: 100, share: 1 }]);
  });
});

describe('gráficos: categoria', () => {
  it('total, comparação, orçamento do mês e lançamentos do mais recente', () => {
    const budgets = [newBudget({ category_id: LAZER.id, starts_month: '2026-01', amount_cents: 30000 }, USER)];
    const entries = chartEntries(
      dataWith([
        gasto('2026-10-10', 20000, LAZER.id),
        gasto('2026-11-02', 25000, LAZER.id),
        gasto('2026-11-24', 8600, LAZER.id),
        gasto('2026-11-27', 1000, LAZER.id, { status: 'planned' }),
        gasto('2026-11-05', 9999, MERCADO.id),
      ]),
      [],
    );
    const d = categoryDetail(entries, [LAZER.id], chartPeriod('month', '2026-11'), budgets, TODAY);
    expect(d.total).toBe(33600);
    expect(d.planned).toBe(1000);
    expect(d.previous).toBe(20000);
    expect(d.budget).toEqual({ month: '2026-11', budget: 30000, spent: 33600, planned: 1000 });
    expect(d.byMonth).toHaveLength(6);
    expect(d.byMonth[5]!.expense.confirmed).toBe(33600);
    expect(d.entries.map((e) => e.date)).toEqual(['2026-11-27', '2026-11-24', '2026-11-02']);
  });

  it('Outras não tem orçamento', () => {
    const entries = chartEntries(dataWith([gasto('2026-11-02', 100, LAZER.id)]), []);
    const d = categoryDetail(entries, [LAZER.id, MERCADO.id], chartPeriod('12m', '2026-11'), [], TODAY);
    expect(d.budget).toBeNull();
    expect(d.previous).toBeNull();
  });
});

describe('gráficos: linhas', () => {
  it('saldo: real até hoje e esperado depois, começando no primeiro dado', () => {
    const data = dataWith([salario('2026-11-05'), gasto('2026-11-10', 20000), gasto('2026-11-28', 5000, MERCADO.id, { status: 'planned' })]);
    const occ = collectOccurrences(data, '2026-12-31');
    const dates = seriesDates(chartPeriod('month', '2026-11'), TODAY);
    expect(dates).toHaveLength(30);
    const pts = balanceSeries(data, occ, TODAY, dates);
    const byDay = (d: string) => pts.find((p) => p.date === d)!;
    expect(byDay('2026-11-04').value).toBe(100000);
    expect(byDay('2026-11-25')).toMatchObject({ today: true, future: false, value: 580000 });
    expect(byDay('2026-11-30')).toMatchObject({ future: true, value: 575000 });
  });

  it('6 meses: fim de cada mês, hoje e o esperado à frente; antes do primeiro dado não há ponto', () => {
    const dates = seriesDates(chartPeriod('6m', '2026-11'), TODAY);
    expect(dates.map((d) => d.date)).toEqual(['2026-05-31', '2026-06-30', '2026-07-31', '2026-08-31', '2026-09-30', '2026-10-31', TODAY, '2026-11-30', '2026-12-31']);
    const pts = balanceSeries(dataWith([salario('2026-10-05')]), [], TODAY, dates);
    expect(pts[0]!.date).toBe('2026-09-30');
  });

  it('patrimônio: valor após o último movimento até cada data; hoje, o valor atual', () => {
    const cdb = newInvestmentAsset({ name: 'CDB', kind: 'fixed_income' }, USER, at('2026-09-01'));
    const movs = [
      newInvestmentMovement({ asset_id: cdb.id, kind: 'contribution', amount_cents: 100000, date: '2026-09-10' }, USER, at('2026-09-10')),
      newInvestmentMovement({ asset_id: cdb.id, kind: 'income', amount_cents: 1500, date: '2026-10-15' }, USER, at('2026-10-15')),
    ];
    const pts = portfolioSeries([cdb], movs, TODAY, seriesDates(chartPeriod('6m', '2026-11'), TODAY));
    expect(pts.map((p) => [p.date, p.value])).toEqual([
      ['2026-09-30', 100000],
      ['2026-10-31', 101500],
      [TODAY, 101500],
    ]);
  });
});

describe('gráficos: mês até agora e escala', () => {
  it('soma orçamentos das categorias e acha a maior', () => {
    const budgets = [
      newBudget({ category_id: MERCADO.id, starts_month: '2026-01', amount_cents: 120000 }, USER),
      newBudget({ category_id: LAZER.id, starts_month: '2026-01', amount_cents: 30000 }, USER),
    ];
    const entries: ChartEntry[] = chartEntries(
      dataWith([gasto('2026-11-02', 50000), gasto('2026-11-03', 10000, LAZER.id), gasto('2026-11-29', 4000, LAZER.id, { status: 'planned' })]),
      [],
    );
    const m = monthSoFar(entries, [MERCADO, LAZER, SALARIO], budgets, TODAY);
    expect(m).toMatchObject({ month: '2026-11', spent: 60000, planned: 4000, budget: 150000 });
    expect(m.top).toMatchObject({ key: MERCADO.id, total: 50000 });
    expect(monthSoFar([], [MERCADO], [], TODAY)).toMatchObject({ budget: null, top: null, spent: 0 });
    const ended = [...budgets, newBudget({ category_id: LAZER.id, starts_month: '2026-11', amount_cents: 0 }, USER)];
    expect(monthSoFar(entries, [MERCADO, LAZER, SALARIO], ended, TODAY).budget).toBe(120000);
  });

  it('referência redonda acima do máximo', () => {
    expect(niceCeiling(0)).toBe(0);
    expect(niceCeiling(8400)).toBe(10000);
    expect(niceCeiling(4907)).toBe(6000);
    expect(niceCeiling(1234567)).toBe(1500000);
  });
});

describe('gráficos: ajuste de saldo', () => {
  it('não vira lançamento de gráfico', () => {
    const adj = tx({ type: 'expense', amount_cents: 237, account_id: ITAU.id, date: '2026-11-10', is_adjustment: true });
    expect(chartEntries(dataWith([adj, gasto('2026-11-11', 100)]), []).map((e) => e.amount)).toEqual([100]);
  });
});

import { describe, expect, it } from 'vitest';

import { createInMemoryFinance } from '../../testing/index.ts';
import { ALLOCATION_GROUPS, ALLOCATION_LABELS, allocation, contributionToReach, groupOf, targetsSum, type Targets } from '../allocation.ts';
import { newInvestmentAsset, newInvestmentMovement, portfolio, type InvestmentAsset } from '../investments.ts';

const USER = '11110000-0000-4000-8000-000000000001';
const TODAY = '2026-11-27';
let tick = 0;
const clock = () => new Date(Date.UTC(2026, 10, 27, 12, 0, tick++));

const SYMBOL: Partial<Record<InvestmentAsset['kind'], string>> = { stocks: 'ITSA4', reits: 'HGLG11', crypto: 'bitcoin' };
const asset = (name: string, kind: InvestmentAsset['kind']) => {
  const a = newInvestmentAsset({ name, kind, quote_symbol: SYMBOL[kind] ?? null }, USER, clock);
  return SYMBOL[kind] ? { ...a, last_price_e8: 100_000_000 } : a; // automático a R$ 1 por cota
};
/** Um aporte por ativo; valor de hoje = aporte (automático: cotas a R$ 1). */
function book(rows: [InvestmentAsset['kind'], number][]) {
  const assets = rows.map(([k], i) => asset(`A${i}`, k));
  const movements = rows.map(([k, cents], i) =>
    newInvestmentMovement(
      { asset_id: assets[i]!.id, kind: 'contribution', amount_cents: cents, date: '2026-11-01', quantity: SYMBOL[k] ? cents * 1_000_000 : null },
      USER,
      clock,
    ),
  );
  return portfolio(assets, movements, TODAY);
}

const T = (t: Partial<Targets>): Targets => ({ fixed_income: 0, stocks: 0, reits: 0, funds: 0, crypto: 0, other: 0, ...t });

describe('grupos de alocação', () => {
  it('renda fixa junta CDB, Tesouro e poupança', () => {
    expect(groupOf('fixed_income')).toBe('fixed_income');
    expect(groupOf('treasury')).toBe('fixed_income');
    expect(groupOf('savings')).toBe('fixed_income');
    expect(groupOf('stocks')).toBe('stocks');
    expect(groupOf('reits')).toBe('reits');
    expect(groupOf('crypto')).toBe('crypto');
    expect(groupOf('other')).toBe('other');
    expect(ALLOCATION_GROUPS.map((g) => ALLOCATION_LABELS[g])).toEqual(['Renda fixa', 'Ações', 'FIIs', 'Fundos', 'Cripto', 'Outros']);
  });

  it('fatias em ordem fixa, com diferença para a meta em pontos', () => {
    const p = book([
      ['treasury', 60000],
      ['crypto', 40000],
    ]);
    const s = allocation(p, T({ fixed_income: 50, stocks: 15, reits: 15, crypto: 10, other: 10 }));
    expect(s.map((x) => x.group)).toEqual([...ALLOCATION_GROUPS]);
    const by = Object.fromEntries(s.map((x) => [x.group, x]));
    expect(by.fixed_income).toMatchObject({ total: 60000, share: 0.6, target: 0.5 });
    expect(by.fixed_income!.diff).toBeCloseTo(10);
    expect(by.crypto!.diff).toBeCloseTo(30);
    expect(by.stocks).toMatchObject({ total: 0, share: 0, target: 0.15 });
    expect(by.stocks!.diff).toBeCloseTo(-15);
  });

  it('sem metas: meta e diferença nulas', () => {
    const s = allocation(book([['stocks', 1000]]), null);
    expect(s.every((x) => x.target === null && x.diff === null)).toBe(true);
  });

  it('aporte para chegar à meta só vai aos grupos abaixo e fecha a conta', () => {
    const p = book([
      ['treasury', 60000],
      ['crypto', 40000],
    ]);
    const targets = T({ fixed_income: 50, stocks: 20, crypto: 10, other: 20 });
    const need = contributionToReach(p, targets);
    // cripto (R$ 400) precisa virar 10%: total R$ 4.000; RF 50% = R$ 2.000 (+1.400); ações 20% (+800); outros 20% (+800)
    expect(need).toEqual({ fixed_income: 140000, stocks: 80000, other: 80000 });
    expect(Object.values(need).reduce((a, b) => a + b, 0) + p.total).toBe(400000);
  });

  it('soma das metas', () => {
    expect(targetsSum(T({ fixed_income: 50, crypto: 49 }))).toBe(99);
  });
});

describe('metas no repositório', () => {
  it('começa sem metas, grava, atualiza e aparece no snapshot', async () => {
    const repo = createInMemoryFinance(USER, clock).investments;
    expect(await repo.getTargets()).toBeNull();
    await repo.setTargets(T({ fixed_income: 100 }));
    const saved = await repo.setTargets(T({ fixed_income: 60, stocks: 40 }));
    expect(saved).toEqual(T({ fixed_income: 60, stocks: 40 }));
    expect(await repo.getTargets()).toEqual(T({ fixed_income: 60, stocks: 40 }));
    expect((await repo.snapshot()).targets).toEqual(T({ fixed_income: 60, stocks: 40 }));
  });

  it('metas que não somam 100, fora de 0–100 ou fracionadas são recusadas (validation)', async () => {
    const repo = createInMemoryFinance(USER, clock).investments;
    await expect(repo.setTargets(T({ fixed_income: 99 }))).rejects.toMatchObject({ code: 'validation' });
    await expect(repo.setTargets(T({ fixed_income: 101, stocks: -1 }))).rejects.toMatchObject({ code: 'validation' });
    await expect(repo.setTargets(T({ fixed_income: 50.5, stocks: 49.5 }))).rejects.toMatchObject({ code: 'validation' });
    expect(await repo.getTargets()).toBeNull();
  });
});

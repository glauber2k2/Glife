import { describe, expect, it } from 'vitest';

import { addDays } from '../calendar.ts';
import { STATS_MIN_POINTS, assetStats } from '../investmentStats.ts';
import { QTY_SCALE, assetPosition, newInvestmentAsset, newInvestmentMovement, type InvestmentAsset, type InvestmentMovement } from '../investments.ts';

const USER = '11110000-0000-4000-8000-000000000001';
const TODAY = '2026-11-27';
let tick = 0;
const clock = () => new Date(Date.UTC(2026, 10, 1, 12, 0, tick++));
const E8 = (reais: number) => Math.round(reais * 1e8);

const weg = (): InvestmentAsset => ({ ...newInvestmentAsset({ name: 'WEG', kind: 'stocks', quote_symbol: 'WEGE3' }, USER, clock), last_price_e8: E8(38.95) });
const buy = (a: InvestmentAsset, cents: number, units: number, date = '2026-10-06') =>
  newInvestmentMovement({ asset_id: a.id, kind: 'contribution', amount_cents: cents, quantity: units * QTY_SCALE, date }, USER, clock);
const income = (a: InvestmentAsset, cents: number, date: string) => newInvestmentMovement({ asset_id: a.id, kind: 'income', amount_cents: cents, date }, USER, clock);

/** Fechamentos em dias seguidos que terminam hoje. */
const series = (values: number[]) => values.map((v, i) => ({ date: addDays(TODAY, i - values.length + 1), closeE8: E8(v) }));

function stats(a: InvestmentAsset, ms: InvestmentMovement[], values: number[]) {
  return assetStats(a, assetPosition(a, ms, TODAY), ms, series(values), TODAY);
}

describe('estatísticas por ativo', () => {
  it('com menos de 20 pregões não há janela nem números de mercado; rendimentos ainda contam', () => {
    const a = weg();
    const ms = [buy(a, 62700, 15), income(a, 210, '2026-11-10')];
    const s = stats(a, ms, Array.from({ length: STATS_MIN_POINTS - 1 }, () => 40));
    expect(s).toMatchObject({ window: null, periodReturn: null, volatility: null, maxDrawdown: null, oscillation: null, income12m: 210 });
  });

  it('retorno e maior queda na janela disponível', () => {
    const a = weg();
    const values = [100, 120, 90, ...Array.from({ length: 16 }, () => 100), 110];
    const s = stats(a, [buy(a, 62700, 15)], values);
    expect(s.window).toEqual({ from: addDays(TODAY, -19), to: TODAY, days: 20 });
    expect(s.periodReturn).toBeCloseTo(0.1);
    expect(s.maxDrawdown).toBeCloseTo(-0.25);
  });

  it('preço constante: oscilação zero e baixa', () => {
    const a = weg();
    const s = stats(a, [buy(a, 62700, 15)], Array.from({ length: 30 }, () => 50));
    expect(s.volatility).toBe(0);
    expect(s.oscillation).toBe('low');
  });

  it('oscilação anualizada: desvio dos retornos diários × √252', () => {
    const a = weg();
    const values = Array.from({ length: 21 }, (_, i) => (i % 2 ? 102 : 100));
    const s = stats(a, [buy(a, 62700, 15)], values);
    expect(s.volatility).toBeGreaterThan(0.25);
    expect(s.oscillation).toBe('high');
  });

  it('preço de hoje contra o preço médio (só automático)', () => {
    const a = weg();
    const s = stats(a, [buy(a, 62700, 15)], []);
    expect(s.vsAverage).toBeCloseTo(38.95 / 41.8 - 1, 6);
  });

  it('rendimentos de 12 meses e rendimento sobre o custo', () => {
    const a = weg();
    const ms = [buy(a, 62700, 15, '2025-10-01'), income(a, 1000, '2025-11-20'), income(a, 627, '2026-11-01')];
    const s = stats(a, ms, []);
    expect(s.income12m).toBe(627);
    expect(s.yieldOnCost).toBeCloseTo(0.01);
  });

  it('ativo manual não tem preço médio', () => {
    const c = newInvestmentAsset({ name: 'CDB', kind: 'fixed_income', quote_symbol: null }, USER, clock);
    const ms = [newInvestmentMovement({ asset_id: c.id, kind: 'contribution', amount_cents: 100000, date: '2026-10-01' }, USER, clock)];
    expect(stats(c, ms, []).vsAverage).toBeNull();
  });
});

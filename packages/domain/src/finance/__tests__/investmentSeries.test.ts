import { describe, expect, it } from 'vitest';

import { assetDaily, portfolioDaily, slicePeriod } from '../investmentSeries.ts';
import { QTY_SCALE, newInvestmentAsset, newInvestmentMovement, portfolio, type InvestmentAsset, type InvestmentMovementDraft } from '../investments.ts';

const USER = '11110000-0000-4000-8000-000000000001';
let tick = 0;
const clock = () => new Date(Date.UTC(2026, 8, 1, 12, 0, tick++));
const E8 = (reais: number) => Math.round(reais * 1e8);

const itsa = (last: number | null): InvestmentAsset => ({
  ...newInvestmentAsset({ name: 'Itaúsa', kind: 'stocks', quote_symbol: 'ITSA4' }, USER, clock),
  last_price_e8: last === null ? null : E8(last),
});
const cdb = () => newInvestmentAsset({ name: 'CDB', kind: 'fixed_income', quote_symbol: null }, USER, clock);
const mov = (a: InvestmentAsset, d: Omit<InvestmentMovementDraft, 'asset_id'>) => newInvestmentMovement({ asset_id: a.id, ...d }, USER, clock);

describe('série diária de um ativo', () => {
  it('automático: cotas × preço do dia; sem preço no dia repete o último', () => {
    const a = itsa(12);
    const ms = [mov(a, { kind: 'contribution', amount_cents: 10000, quantity: 10 * QTY_SCALE, date: '2026-09-01' })];
    const s = assetDaily(a, ms, [{ date: '2026-09-02', closeE8: E8(11) }, { date: '2026-09-04', closeE8: E8(12) }], '2026-09-05');
    expect(s.map((p) => [p.date, p.value, p.invested])).toEqual([
      ['2026-09-01', 10000, 10000],
      ['2026-09-02', 11000, 10000],
      ['2026-09-03', 11000, 10000],
      ['2026-09-04', 12000, 10000],
      ['2026-09-05', 12000, 10000],
    ]);
  });

  it('antes do primeiro preço diário usa o preço pago; hoje usa o último preço do ativo', () => {
    const a = itsa(15);
    const ms = [mov(a, { kind: 'contribution', amount_cents: 10000, quantity: 10 * QTY_SCALE, date: '2026-09-01' })];
    const s = assetDaily(a, ms, [], '2026-09-03');
    expect(s.map((p) => p.value)).toEqual([10000, 10000, 15000]);
  });

  it('manual: interpola até a cotação seguinte; aporte é degrau', () => {
    const a = cdb();
    const ms = [
      mov(a, { kind: 'contribution', amount_cents: 100000, date: '2026-09-01' }),
      mov(a, { kind: 'quote', amount_cents: 110000, date: '2026-09-11' }),
      mov(a, { kind: 'contribution', amount_cents: 50000, date: '2026-09-13' }),
    ];
    const s = assetDaily(a, ms, [], '2026-09-14');
    const by = Object.fromEntries(s.map((p) => [p.date, p]));
    expect(by['2026-09-06']!.value).toBe(105000);
    expect(by['2026-09-12']!.value).toBe(110000);
    expect(by['2026-09-13']).toMatchObject({ value: 160000, invested: 150000 });
    expect(by['2026-09-14']!.value).toBe(160000);
  });

  it('sem movimentos: série vazia', () => {
    expect(assetDaily(cdb(), [], [], '2026-09-14')).toEqual([]);
  });
});

describe('série diária da carteira', () => {
  it('soma os ativos abertos e termina no patrimônio de hoje', () => {
    const a = itsa(12);
    const c = cdb();
    const ms = [
      mov(a, { kind: 'contribution', amount_cents: 10000, quantity: 10 * QTY_SCALE, date: '2026-09-03' }),
      mov(c, { kind: 'contribution', amount_cents: 100000, date: '2026-09-01' }),
      mov(c, { kind: 'quote', amount_cents: 110000, date: '2026-09-11' }),
    ];
    const p = portfolio([a, c], ms, '2026-09-11');
    const s = portfolioDaily(p, ms, new Map([[a.id, [{ date: '2026-09-05', closeE8: E8(11) }]]]), '2026-09-11');
    expect(s[0]).toEqual({ date: '2026-09-01', value: 100000, invested: 100000 });
    expect(s.find((x) => x.date === '2026-09-03')).toEqual({ date: '2026-09-03', value: 102000 + 10000, invested: 110000 });
    expect(s.at(-1)).toEqual({ date: '2026-09-11', value: p.total, invested: p.invested });
  });

  it('carteira só manual não tem buraco nem zero falso', () => {
    const c = cdb();
    const ms = [mov(c, { kind: 'contribution', amount_cents: 100000, date: '2026-09-01' }), mov(c, { kind: 'quote', amount_cents: 110000, date: '2026-09-11' })];
    const s = portfolioDaily(portfolio([c], ms, '2026-09-11'), ms, new Map(), '2026-09-11');
    expect(s).toHaveLength(11);
    expect(s.every((x) => x.value >= 100000)).toBe(true);
  });
});

describe('recorte do período', () => {
  const days = Array.from({ length: 400 }, (_, i) => ({ date: new Date(Date.UTC(2025, 9, 23 + i)).toISOString().slice(0, 10) }));
  const today = days.at(-1)!.date; // 2026-11-26

  it('1M começa 31 dias antes; Tudo devolve tudo', () => {
    expect(slicePeriod(days, '1M', today)[0]!.date).toBe('2026-10-26');
    expect(slicePeriod(days, '1A', today)[0]!.date).toBe('2025-11-25');
    expect(slicePeriod(days, 'Tudo', today)).toHaveLength(400);
  });
});

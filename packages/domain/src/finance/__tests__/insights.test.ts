import { describe, expect, it } from 'vitest';

import type { Targets } from '../allocation.ts';
import { addDays } from '../calendar.ts';
import {
  ASSET_QUESTIONS,
  INSIGHT_DISCLAIMER,
  PORTFOLIO_QUESTIONS,
  assetInsight,
  portfolioHeadline,
  portfolioInsight,
  rankBySinceBuy,
  type InsightBlock,
} from '../insights.ts';
import { assetStats } from '../investmentStats.ts';
import { QTY_SCALE, assetPosition, newInvestmentAsset, newInvestmentMovement, portfolio, type InvestmentAsset, type InvestmentMovement } from '../investments.ts';

const USER = '11110000-0000-4000-8000-000000000001';
const TODAY = '2026-11-27';
let tick = 0;
const clock = () => new Date(Date.UTC(2026, 9, 1, 12, 0, tick++));
const E8 = (reais: number) => Math.round(reais * 1e8);
const money = (c: number) => `R$ ${(c / 100).toFixed(2).replace('.', ',')}`;
const T = (t: Partial<Targets>): Targets => ({ fixed_income: 0, stocks: 0, reits: 0, funds: 0, crypto: 0, other: 0, ...t });

function scenario() {
  const weg: InvestmentAsset = { ...newInvestmentAsset({ name: 'WEG', kind: 'stocks', quote_symbol: 'WEGE3' }, USER, clock), last_price_e8: E8(38.95) };
  const btc: InvestmentAsset = { ...newInvestmentAsset({ name: 'Bitcoin', kind: 'crypto', quote_symbol: 'bitcoin' }, USER, clock), last_price_e8: E8(500) };
  const cdb = newInvestmentAsset({ name: 'CDB', kind: 'fixed_income', quote_symbol: null }, USER, clock);
  const ms: InvestmentMovement[] = [
    newInvestmentMovement({ asset_id: weg.id, kind: 'contribution', amount_cents: 62700, quantity: 15 * QTY_SCALE, date: '2026-10-06' }, USER, clock),
    newInvestmentMovement({ asset_id: btc.id, kind: 'contribution', amount_cents: 40000, quantity: 1 * QTY_SCALE, date: '2026-09-01' }, USER, clock),
    newInvestmentMovement({ asset_id: cdb.id, kind: 'contribution', amount_cents: 100000, date: '2026-09-01' }, USER, clock),
  ];
  const p = portfolio([weg, btc, cdb], ms, TODAY);
  return { weg, btc, cdb, ms, p };
}
const series = (values: number[]) => values.map((v, i) => ({ date: addDays(TODAY, i - values.length + 1), closeE8: E8(v) }));
const enough = series(Array.from({ length: 30 }, (_, i) => 40 - i * 0.03));

function ctx(asset: InvestmentAsset, ms: InvestmentMovement[], p: ReturnType<typeof scenario>['p'], prices = enough, targets: Targets | null = T({ fixed_income: 50, stocks: 20, crypto: 10, reits: 20 })) {
  const position = assetPosition(asset, ms, TODAY);
  return { asset, position, stats: assetStats(asset, position, ms, prices, TODAY), portfolio: p, targets, movements: ms, money };
}

const texts = (bs: InsightBlock[]) =>
  bs.flatMap((b) => (b.kind === 'text' || b.kind === 'heading' ? [b.text] : b.kind === 'list' ? b.items : b.kind === 'range' ? [b.caption] : b.kind === 'numbers' ? b.items.map((i) => `${i.label} ${i.value}`) : []));

describe('leitura dos números', () => {
  it('toda leitura termina com o aviso', () => {
    const { weg, ms, p } = scenario();
    for (const [q] of ASSET_QUESTIONS) expect(assetInsight(q, ctx(weg, ms, p)).at(-1)).toEqual({ kind: 'disclaimer', text: INSIGHT_DISCLAIMER });
    for (const [q] of PORTFOLIO_QUESTIONS) expect(portfolioInsight(q, { portfolio: p, targets: null, money }).at(-1)).toEqual({ kind: 'disclaimer', text: INSIGHT_DISCLAIMER });
  });

  it('aporte abaixo do preço médio mostra o novo preço médio exato', () => {
    const { weg, ms, p } = scenario();
    const out = assetInsight('aporte', ctx(weg, ms, p));
    const favor = out.find((b): b is Extract<InsightBlock, { kind: 'list' }> => b.kind === 'list' && b.tone === 'ok')!;
    // R$ 627 + R$ 1.000 sobre 15 + 1000/38,95 cotas
    const newAvg = Math.round(162700 / (15 + 1000 / 38.95));
    expect(favor.items.some((t) => t.includes(money(4180)) && t.includes(money(newAvg)))).toBe(true);
    expect(out.some((b) => b.kind === 'allocation' && b.focus === 'stocks' && b.after!.stocks > b.before.stocks)).toBe(true);
  });

  it('sem 20 pregões: sem faixa e avisa que faltam dados', () => {
    const { weg, ms, p } = scenario();
    const out = assetInsight('historico', ctx(weg, ms, p, series([40, 41])));
    expect(out.some((b) => b.kind === 'range')).toBe(false);
    expect(texts(out).join(' ')).toContain('Ainda sem dados suficientes');
  });

  it('com histórico: faixa com a janela usada', () => {
    const { weg, ms, p } = scenario();
    const out = assetInsight('historico', ctx(weg, ms, p));
    const range = out.find((b): b is Extract<InsightBlock, { kind: 'range' }> => b.kind === 'range')!;
    expect(range.low).toBeLessThan(range.mid);
    expect(range.high).toBeGreaterThan(range.mid);
    expect(range.caption).toContain('30 pregões');
  });

  it('concentração sem metas convida a definir metas; com metas, diz quanto aportar', () => {
    const { p } = scenario();
    expect(texts(portfolioInsight('concentracao', { portfolio: p, targets: null, money })).join(' ')).toContain('Defina suas metas');
    const withT = portfolioInsight('concentracao', { portfolio: p, targets: T({ fixed_income: 70, stocks: 20, crypto: 10 }), money });
    expect(texts(withT).join(' ')).toContain('Cripto');
    expect(withT.some((b) => b.kind === 'allocation' && !!b.targets)).toBe(true);
  });

  it('nenhum texto manda comprar, vender ou recomenda', () => {
    const { weg, btc, cdb, ms, p } = scenario();
    const all: InsightBlock[] = [];
    for (const a of [weg, btc, cdb]) for (const [q] of ASSET_QUESTIONS) all.push(...assetInsight(q, ctx(a, ms, p)));
    for (const [q] of PORTFOLIO_QUESTIONS) all.push(...portfolioInsight(q, { portfolio: p, targets: T({ fixed_income: 50, stocks: 50 }), money }));
    const body = texts(all.filter((b) => b.kind !== 'disclaimer')).join(' ');
    expect(body).not.toMatch(/\b(compre|venda|vender|comprar|recomendo)\b/i);
  });
});

describe('ranking e manchete da carteira', () => {
  it('ranking desde a compra em ordem decrescente', () => {
    const { p } = scenario();
    const r = rankBySinceBuy(p);
    expect(r.map((x) => x.asset.name)).toEqual(['Bitcoin', 'CDB', 'WEG']);
    expect(r[0]!.pct).toBeCloseTo(0.25);
  });

  it('manchete aponta o grupo mais acima da meta; sem metas ou equilibrada, nada', () => {
    const { p } = scenario();
    expect(portfolioHeadline(p, null)).toBeNull();
    expect(portfolioHeadline(p, T({ fixed_income: 50, stocks: 20, crypto: 10, reits: 20 }))).toContain('Cripto');
    const share = (g: 'fixed_income' | 'stocks' | 'crypto') => Math.round((p.groups.filter((x) => (g === 'fixed_income' ? x.kind === 'fixed_income' : x.kind === g)).reduce((s, x) => s + x.total, 0) / p.total) * 100);
    const exact = T({ fixed_income: share('fixed_income'), stocks: share('stocks'), crypto: 100 - share('fixed_income') - share('stocks') });
    expect(portfolioHeadline(p, exact)).toBeNull();
  });
});

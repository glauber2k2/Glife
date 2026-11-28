import { newInvestmentAsset, type PositionedAsset } from '@glife/domain/finance';
import { describe, expect, it } from 'vitest';

import { marketQuery, readTargetsForm, sortAssets, targetsToForm } from '../src/features/finance/components/investmentPanel';

const USER = '11110000-0000-4000-8000-000000000001';
const pa = (name: string, current: number, pct: number): PositionedAsset =>
  ({ asset: newInvestmentAsset({ name, kind: 'fixed_income', quote_symbol: null }, USER), position: { current, pct } }) as PositionedAsset;

describe('lista de ativos', () => {
  const list = [pa('Bitcoin', 600, 0.08), pa('CDB', 8000, 0.07), pa('Ações BB', 500, -0.06)];
  it('ordena por valor, resultado ou nome', () => {
    expect(sortAssets(list, 'value').map((x) => x.asset.name)).toEqual(['CDB', 'Bitcoin', 'Ações BB']);
    expect(sortAssets(list, 'result').map((x) => x.asset.name)).toEqual(['Bitcoin', 'CDB', 'Ações BB']);
    expect(sortAssets(list, 'name').map((x) => x.asset.name)).toEqual(['Ações BB', 'Bitcoin', 'CDB']);
  });
});

describe('folha de metas', () => {
  it('só vale com inteiros que somam 100', () => {
    const ok = readTargetsForm({ fixed_income: '50', stocks: '15', reits: '15', funds: '', crypto: '10', other: '10' });
    expect(ok).toEqual({ sum: 100, targets: { fixed_income: 50, stocks: 15, reits: 15, funds: 0, crypto: 10, other: 10 } });
    expect(readTargetsForm({ fixed_income: '50', stocks: '49', reits: '', funds: '', crypto: '', other: '' })).toEqual({ sum: 99, targets: null });
    expect(readTargetsForm({ fixed_income: '50,5', stocks: '49,5', reits: '', funds: '', crypto: '', other: '' }).targets).toBeNull();
    expect(readTargetsForm({ fixed_income: '120', stocks: '', reits: '', funds: '', crypto: '', other: '' }).targets).toBeNull();
  });

  it('metas salvas viram o formulário; sem metas, campos vazios', () => {
    expect(targetsToForm({ fixed_income: 100, stocks: 0, reits: 0, funds: 0, crypto: 0, other: 0 })).toEqual({ fixed_income: '100', stocks: '0', reits: '0', funds: '0', crypto: '0', other: '0' });
    expect(targetsToForm(null)).toEqual({ fixed_income: '', stocks: '', reits: '', funds: '', crypto: '', other: '' });
  });
});

describe('ranking do mercado', () => {
  it('altas de hoje em ações e FIIs vêm da B3; em cripto, da CoinGecko', () => {
    expect(marketQuery('up_day', 'stock')).toEqual({ source: 'brapi', sort: 'up_day', type: 'stock' });
    expect(marketQuery('down_day', 'reit')).toEqual({ source: 'brapi', sort: 'down_day', type: 'reit' });
    expect(marketQuery('volume', 'crypto')).toEqual({ source: 'coingecko', sort: 'volume', type: 'crypto' });
  });

  it('30 dias e 1 ano só existem em cripto no plano grátis', () => {
    expect(marketQuery('up_30d', 'stock')).toEqual({ source: 'coingecko', sort: 'up_30d', type: 'crypto' });
    expect(marketQuery('up_1y', 'reit')).toEqual({ source: 'coingecko', sort: 'up_1y', type: 'crypto' });
  });
});

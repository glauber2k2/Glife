import { newInvestmentAsset, type InvestmentAsset } from '@glife/domain/finance';
import type { MarketItem, PricePoint, QuoteKey } from '@glife/domain/quotes';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createPriceBookLoader, createSearchController, loadMarketRank, type MarketClient } from '../src/features/finance/data/marketData';

const USER = '11110000-0000-4000-8000-000000000001';
const item = (ticker: string): MarketItem => ({ source: 'brapi', symbol: ticker, ticker, name: ticker, type: 'stock', priceE8: 1, changeDay: 1, change30d: null, change1y: null, volume: 1 });

function fakeClient(o: { fail?: boolean; delays?: Record<string, number>; empty?: boolean } = {}) {
  const searched: string[] = [];
  const histories: QuoteKey[] = [];
  const client: MarketClient = {
    async history(key) {
      histories.push(key);
      if (o.fail) throw new Error('offline');
      return [{ date: '2026-11-27', closeE8: 1 }] as PricePoint[];
    },
    async market() {
      if (o.fail) throw new Error('offline');
      return o.empty ? [] : [item('A1')];
    },
    async search(q) {
      searched.push(q);
      await new Promise((r) => setTimeout(r, o.delays?.[q] ?? 0));
      if (o.fail) throw new Error('offline');
      return [item(q.toUpperCase())];
    },
  };
  return { client, searched, histories };
}

describe('busca com sugestões', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('digitando rápido faz um pedido só, 250 ms depois da última letra', async () => {
    const { client, searched } = fakeClient();
    const results: string[][] = [];
    const c = createSearchController({ client, onResult: (r) => results.push(r.items.map((x) => x.ticker)) });
    c.set('lo');
    await vi.advanceTimersByTimeAsync(100);
    c.set('log');
    await vi.advanceTimersByTimeAsync(100);
    c.set('logis');
    await vi.advanceTimersByTimeAsync(249);
    expect(searched).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(searched).toEqual(['logis']);
    await vi.runAllTimersAsync();
    expect(results.at(-1)).toEqual(['LOGIS']);
  });

  it('resposta atrasada de uma busca antiga é descartada', async () => {
    const { client } = fakeClient({ delays: { log: 1000, logis: 10 } });
    const results: string[][] = [];
    const c = createSearchController({ client, onResult: (r) => results.push(r.items.map((x) => x.ticker)) });
    c.set('log');
    await vi.advanceTimersByTimeAsync(300); // pedido de "log" saiu e demora
    c.set('logis');
    await vi.runAllTimersAsync();
    expect(results.filter((r) => r.length)).toEqual([['LOGIS']]);
  });

  it('menos de 2 letras limpa sem pedir; falha vira offline sem lançar', async () => {
    const ok = fakeClient();
    const results: { status: string; n: number }[] = [];
    const c = createSearchController({ client: ok.client, onResult: (r) => results.push({ status: r.status, n: r.items.length }) });
    c.set('l');
    await vi.runAllTimersAsync();
    expect(ok.searched).toEqual([]);
    expect(results.at(-1)).toEqual({ status: 'idle', n: 0 });

    const bad = fakeClient({ fail: true });
    const r2: string[] = [];
    const c2 = createSearchController({ client: bad.client, onResult: (r) => r2.push(r.status) });
    c2.set('itsa');
    await vi.runAllTimersAsync();
    expect(r2.at(-1)).toBe('offline');
  });
});

describe('histórico dos ativos', () => {
  const stock = (s: string): InvestmentAsset => newInvestmentAsset({ name: s, kind: 'stocks', quote_symbol: s }, USER);
  const manual = newInvestmentAsset({ name: 'CDB', kind: 'fixed_income', quote_symbol: null }, USER);

  it('pede uma vez por ativo automático na sessão e ignora os manuais', async () => {
    const { client, histories } = fakeClient();
    const loader = createPriceBookLoader(client);
    const a = stock('ITSA4');
    const b1 = await loader.load([a, manual]);
    const b2 = await loader.load([a, manual]);
    expect(histories).toEqual([{ source: 'brapi', symbol: 'ITSA4' }]);
    expect(b1.get(a.id)).toEqual([{ date: '2026-11-27', closeE8: 1 }]);
    expect(b2.get(a.id)).toEqual(b1.get(a.id));
    expect(b1.has(manual.id)).toBe(false);
  });

  it('sem internet: livro vazio, sem lançar, e tenta de novo depois', async () => {
    const bad = fakeClient({ fail: true });
    const loader = createPriceBookLoader(bad.client);
    const a = stock('ITSA4');
    expect((await loader.load([a])).size).toBe(0);
    await loader.load([a]);
    expect(bad.histories).toHaveLength(2);
  });
});

describe('ranking do mercado', () => {
  it('ok, vazio e offline', async () => {
    expect(await loadMarketRank(fakeClient().client, 'brapi', 'up_day')).toEqual({ status: 'ok', items: [item('A1')] });
    expect(await loadMarketRank(fakeClient({ empty: true }).client, 'brapi', 'up_day')).toEqual({ status: 'empty', items: [] });
    expect(await loadMarketRank(fakeClient({ fail: true }).client, 'brapi', 'up_day')).toEqual({ status: 'offline', items: [] });
  });
});

import { describe, expect, it } from 'vitest';

import {
  QUOTE_BATCH_MAX,
  QuoteService,
  quoteRequestSchema,
  toE8,
  type Quote,
  type QuoteCache,
  type QuoteKey,
  type QuoteProvider,
  type QuoteSource,
} from '../index.ts';

const NOW = new Date('2026-11-25T15:00:00.000Z');
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();

function memoryCache(rows: (Quote & { fetchedAt: string })[] = []): QuoteCache & { rows: (Quote & { fetchedAt: string })[] } {
  return {
    rows,
    async get(keys: readonly QuoteKey[]) {
      return rows.filter((r) => keys.some((k) => k.source === r.source && k.symbol === r.symbol));
    },
    async put(quotes: readonly Quote[]) {
      for (const q of quotes) {
        const i = rows.findIndex((r) => r.source === q.source && r.symbol === q.symbol);
        const row = { ...q, fetchedAt: NOW.toISOString() };
        if (i >= 0) rows[i] = row;
        else rows.push(row);
      }
    },
  };
}

function fakeProvider(source: QuoteSource, price: number) {
  const asked: string[][] = [];
  const provider: QuoteProvider = {
    source,
    async fetchQuotes(symbols) {
      asked.push([...symbols]);
      return { quotes: symbols.map((symbol) => ({ source, symbol, priceE8: price, name: symbol, quotedAt: NOW.toISOString() })), errors: [] };
    },
    async lookup() {
      return [];
    },
  };
  return { provider, asked };
}

const cached = (source: QuoteSource, symbol: string, priceE8: number, age: number) => ({
  source,
  symbol,
  priceE8,
  name: symbol,
  quotedAt: minutesAgo(age),
  fetchedAt: minutesAgo(age),
});

describe('serviço de cotação', () => {
  it('cotação de 10 min no cache volta sem chamar o provedor', async () => {
    const brapi = fakeProvider('brapi', 999);
    const service = new QuoteService({ providers: [brapi.provider], cache: memoryCache([cached('brapi', 'ITSA4', 100, 10)]), now: () => NOW });
    const r = await service.getQuotes([{ source: 'brapi', symbol: 'ITSA4' }]);
    expect(brapi.asked).toEqual([]);
    expect(r.quotes.map((q) => q.priceE8)).toEqual([100]);
  });

  it('cotação de 31 min é buscada de novo e gravada no cache', async () => {
    const brapi = fakeProvider('brapi', 999);
    const cache = memoryCache([cached('brapi', 'ITSA4', 100, 31)]);
    const service = new QuoteService({ providers: [brapi.provider], cache, now: () => NOW });
    const r = await service.getQuotes([{ source: 'brapi', symbol: 'ITSA4' }]);
    expect(brapi.asked).toEqual([['ITSA4']]);
    expect(r.quotes.map((q) => q.priceE8)).toEqual([999]);
    expect(cache.rows[0]!.priceE8).toBe(999);
  });

  it('cada símbolo vai ao provedor da sua fonte, sem repetir', async () => {
    const brapi = fakeProvider('brapi', 1);
    const gecko = fakeProvider('coingecko', 2);
    const service = new QuoteService({ providers: [brapi.provider, gecko.provider], cache: memoryCache(), now: () => NOW });
    const r = await service.getQuotes([
      { source: 'brapi', symbol: 'ITSA4' },
      { source: 'coingecko', symbol: 'bitcoin' },
      { source: 'brapi', symbol: 'ITSA4' },
    ]);
    expect(brapi.asked).toEqual([['ITSA4']]);
    expect(gecko.asked).toEqual([['bitcoin']]);
    expect(r.quotes).toHaveLength(2);
  });

  it('fonte sem provedor registrado vira unavailable', async () => {
    const service = new QuoteService({ providers: [], cache: memoryCache(), now: () => NOW });
    const r = await service.getQuotes([{ source: 'brapi', symbol: 'ITSA4' }]);
    expect(r.errors).toEqual([{ source: 'brapi', symbol: 'ITSA4', reason: 'unavailable' }]);
  });
});

describe('pedido validado', () => {
  it('aceita cotações e lookup válidos', () => {
    expect(quoteRequestSchema.safeParse({ action: 'quotes', items: [{ source: 'brapi', symbol: 'ITSA4' }, { source: 'coingecko', symbol: 'bitcoin' }] }).success).toBe(true);
    expect(quoteRequestSchema.safeParse({ action: 'lookup', source: 'coingecko', query: 'btc' }).success).toBe(true);
  });

  it('recusa símbolo fora do formato da fonte, lista vazia e mais de 50 itens', () => {
    const bad = [
      { action: 'quotes', items: [{ source: 'brapi', symbol: 'itsa4' }] },
      { action: 'quotes', items: [{ source: 'brapi', symbol: 'IT' }] },
      { action: 'quotes', items: [{ source: 'coingecko', symbol: 'Bit Coin' }] },
      { action: 'quotes', items: [] },
      { action: 'quotes', items: Array.from({ length: QUOTE_BATCH_MAX + 1 }, () => ({ source: 'brapi', symbol: 'ITSA4' })) },
      { action: 'lookup', source: 'brapi', query: '' },
      { action: 'lookup', source: 'brapi', query: 'x'.repeat(41) },
    ];
    for (const b of bad) expect(quoteRequestSchema.safeParse(b).success).toBe(false);
  });

  it('toE8 arredonda e recusa valor inválido', () => {
    expect(toE8(10.23)).toBe(1_023_000_000);
    expect(() => toE8(-1)).toThrow(RangeError);
    expect(() => toE8(Number.NaN)).toThrow(RangeError);
  });
});

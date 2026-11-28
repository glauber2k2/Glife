import { describe, expect, it } from 'vitest';

import {
  QuoteService,
  keyOf,
  quoteRequestSchema,
  type LookupItem,
  type MarketItem,
  type MarketListCache,
  type PriceHistoryStore,
  type PricePoint,
  type Quote,
  type QuoteCache,
  type QuoteKey,
  type QuoteProvider,
  type QuoteSource,
} from '../index.ts';

const NOW = new Date('2026-11-27T15:00:00.000Z');
const TODAY = '2026-11-27';
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();

const noCache: QuoteCache = { get: async () => [], put: async () => {} };

function memoryHistory(seed: Record<string, PricePoint[]> = {}, fetched: Record<string, string> = {}) {
  const rows = new Map(Object.entries(seed));
  const marks = new Map(Object.entries(fetched));
  const store: PriceHistoryStore & { rows: typeof rows; marks: typeof marks } = {
    rows,
    marks,
    async get(k) {
      return rows.get(keyOf(k)) ?? [];
    },
    async put(k, points) {
      const map = new Map((rows.get(keyOf(k)) ?? []).map((p) => [p.date, p]));
      for (const p of points) map.set(p.date, p);
      rows.set(keyOf(k), [...map.values()].sort((a, b) => (a.date < b.date ? -1 : 1)));
    },
    async fetchedToday(k, today) {
      return marks.get(keyOf(k)) === today;
    },
    async markFetched(k, today) {
      marks.set(keyOf(k), today);
    },
  };
  return store;
}

function memoryLists(seed: Partial<Record<QuoteSource, { items: MarketItem[]; fetchedAt: string }>> = {}) {
  const rows = new Map(Object.entries(seed) as [QuoteSource, { items: MarketItem[]; fetchedAt: string }][]);
  const cache: MarketListCache & { rows: typeof rows } = {
    rows,
    async get(list) {
      return rows.get(list) ?? null;
    },
    async put(list, items) {
      rows.set(list, { items: [...items], fetchedAt: NOW.toISOString() });
    },
  };
  return cache;
}

const mk = (ticker: string, extra: Partial<MarketItem> = {}): MarketItem => ({
  source: 'brapi',
  symbol: ticker,
  ticker,
  name: ticker,
  type: 'stock',
  priceE8: 100,
  changeDay: 1,
  change30d: null,
  change1y: null,
  volume: 1_000_000,
  ...extra,
});

function provider(source: QuoteSource, o: { history?: PricePoint[]; market?: MarketItem[]; lookup?: LookupItem[]; price?: number } = {}) {
  const calls = { history: 0, market: 0, lookup: [] as string[] };
  const p: QuoteProvider = {
    source,
    async fetchQuotes(symbols) {
      return { quotes: symbols.map((symbol) => ({ source, symbol, priceE8: o.price ?? 1, name: symbol, quotedAt: '2026-11-27T13:07:00.000Z' })), errors: [] };
    },
    async lookup(q) {
      calls.lookup.push(q);
      return o.lookup ?? [];
    },
    async history() {
      calls.history++;
      return o.history ?? [];
    },
    async market() {
      calls.market++;
      return o.market ?? [];
    },
  };
  return { p, calls };
}

const ITSA: QuoteKey = { source: 'brapi', symbol: 'ITSA4' };

describe('histórico no serviço', () => {
  it('já buscado hoje: não chama o provedor e devolve o guardado', async () => {
    const b = provider('brapi', { history: [{ date: TODAY, closeE8: 999 }] });
    const history = memoryHistory({ 'brapi:ITSA4': [{ date: '2026-11-26', closeE8: 10 }] }, { 'brapi:ITSA4': TODAY });
    const s = new QuoteService({ providers: [b.p], cache: noCache, history, now: () => NOW });
    expect(await s.history(ITSA)).toEqual([{ date: '2026-11-26', closeE8: 10 }]);
    expect(b.calls.history).toBe(0);
  });

  it('não buscado hoje: o fechamento do provedor corrige dias passados; hoje vale o guardado; marca o dia', async () => {
    const b = provider('brapi', { history: [{ date: '2026-11-25', closeE8: 5 }, { date: '2026-11-26', closeE8: 6 }, { date: TODAY, closeE8: 7 }] });
    const history = memoryHistory({ 'brapi:ITSA4': [{ date: '2026-11-26', closeE8: 10 }, { date: TODAY, closeE8: 11 }] });
    const s = new QuoteService({ providers: [b.p], cache: noCache, history, now: () => NOW });
    expect(await s.history(ITSA)).toEqual([
      { date: '2026-11-25', closeE8: 5 },
      { date: '2026-11-26', closeE8: 6 },
      { date: TODAY, closeE8: 11 },
    ]);
    expect(b.calls.history).toBe(1);
    expect(history.marks.get('brapi:ITSA4')).toBe(TODAY);
  });

  it('cotação buscada também grava o preço do dia no histórico', async () => {
    const b = provider('brapi', { price: 1_085_000_000 });
    const history = memoryHistory();
    const s = new QuoteService({ providers: [b.p], cache: noCache, history, now: () => NOW });
    await s.getQuotes([ITSA]);
    expect(history.rows.get('brapi:ITSA4')).toEqual([{ date: TODAY, closeE8: 1_085_000_000 }]);
  });
});

describe('mercado e busca no serviço', () => {
  it('lista com menos de 30 min vem do cache', async () => {
    const b = provider('brapi', { market: [mk('NOVO3')] });
    const lists = memoryLists({ brapi: { items: [mk('B1', { changeDay: 3 }), mk('A1', { changeDay: 5 })], fetchedAt: minutesAgo(10) } });
    const s = new QuoteService({ providers: [b.p], cache: noCache, lists, now: () => NOW });
    expect((await s.market('brapi', 'up_day')).map((x) => x.ticker)).toEqual(['A1', 'B1']);
    expect(b.calls.market).toBe(0);
  });

  it('lista com 31 min é buscada de novo e guardada', async () => {
    const b = provider('brapi', { market: [mk('NOVO3')] });
    const lists = memoryLists({ brapi: { items: [mk('VELHO3')], fetchedAt: minutesAgo(31) } });
    const s = new QuoteService({ providers: [b.p], cache: noCache, lists, now: () => NOW });
    expect((await s.market('brapi', 'up_day')).map((x) => x.ticker)).toEqual(['NOVO3']);
    expect(lists.rows.get('brapi')!.items.map((x) => x.ticker)).toEqual(['NOVO3']);
  });

  it('busca usa catálogo de até 24 h das duas fontes', async () => {
    const b = provider('brapi');
    const g = provider('coingecko');
    const lists = memoryLists({
      brapi: { items: [mk('HGLG11', { name: 'CSHG Logística', type: 'reit' })], fetchedAt: minutesAgo(23 * 60) },
      coingecko: { items: [mk('BTC', { source: 'coingecko', symbol: 'bitcoin', name: 'Bitcoin', type: 'crypto' })], fetchedAt: minutesAgo(60) },
    });
    const s = new QuoteService({ providers: [b.p, g.p], cache: noCache, lists, now: () => NOW });
    expect((await s.search('logis')).map((x) => x.ticker)).toEqual(['HGLG11']);
    expect((await s.search('bitc')).map((x) => x.ticker)).toEqual(['BTC']);
    expect(b.calls.market).toBe(0);
  });

  it('sem catálogo da B3 a busca cai no código exato', async () => {
    const b = provider('brapi', { lookup: [{ source: 'brapi', symbol: 'ITSA4', name: 'Itaúsa', ticker: 'ITSA4', priceE8: 1_085_000_000 }] });
    const s = new QuoteService({ providers: [b.p], cache: noCache, lists: memoryLists(), now: () => NOW });
    const r = await s.search('itsa4');
    expect(b.calls.lookup).toEqual(['itsa4']);
    expect(r).toEqual([{ source: 'brapi', symbol: 'ITSA4', ticker: 'ITSA4', name: 'Itaúsa', type: 'stock', priceE8: 1_085_000_000, changeDay: null, change30d: null, change1y: null, volume: null }]);
  });

  it('cripto fora do catálogo vem da busca da CoinGecko, sem preço', async () => {
    const g = provider('coingecko', { lookup: [{ source: 'coingecko', symbol: 'pepe', name: 'Pepe', ticker: 'PEPE', priceE8: null }] });
    const lists = memoryLists({ coingecko: { items: [], fetchedAt: minutesAgo(1) }, brapi: { items: [], fetchedAt: minutesAgo(1) } });
    const s = new QuoteService({ providers: [g.p], cache: noCache, lists, now: () => NOW });
    expect((await s.search('pepe')).map((x) => [x.ticker, x.type, x.priceE8])).toEqual([['PEPE', 'crypto', null]]);
  });
});

describe('busca: código fora do catálogo, tipos e falha da lista', () => {
  it('código válido sem item igual no catálogo também é conferido no código exato (ETF, BDR)', async () => {
    const b = provider('brapi', { lookup: [{ source: 'brapi', symbol: 'BOVA11', name: 'iShares Ibovespa', ticker: 'BOVA11', priceE8: 13_000_000_000 }] });
    const lists = memoryLists({ brapi: { items: [mk('BOVV11', { name: 'Outro' })], fetchedAt: minutesAgo(5) }, coingecko: { items: [], fetchedAt: minutesAgo(5) } });
    const s = new QuoteService({ providers: [b.p], cache: noCache, lists, now: () => NOW });
    const r = await s.search('bova11');
    expect(b.calls.lookup).toEqual(['bova11']);
    expect(r.map((x) => x.ticker)).toContain('BOVA11');
  });

  it('filtra os tipos pedidos antes de cortar em 8', async () => {
    const many = Array.from({ length: 12 }, (_, i) => mk(`AB${i}C3`, { name: `Empresa btc ${i}` }));
    const g = provider('coingecko');
    const lists = memoryLists({
      brapi: { items: many, fetchedAt: minutesAgo(5) },
      coingecko: { items: [mk('BTC', { source: 'coingecko', symbol: 'bitcoin', name: 'Bitcoin', type: 'crypto' })], fetchedAt: minutesAgo(5) },
    });
    const s = new QuoteService({ providers: [g.p], cache: noCache, lists, now: () => NOW });
    expect((await s.search('btc', ['crypto'])).map((x) => x.ticker)).toEqual(['BTC']);
  });

  it('lista que falhou não é pedida de novo a cada busca por 5 minutos', async () => {
    const b = provider('brapi', { market: [] });
    const lists = memoryLists();
    let now = NOW;
    const s = new QuoteService({ providers: [b.p], cache: noCache, lists, now: () => now });
    await s.search('itsa4');
    await s.search('itsa');
    expect(b.calls.market).toBe(1);
    now = new Date(NOW.getTime() + 6 * 60_000);
    await s.search('itsa4');
    expect(b.calls.market).toBe(2);
  });
});

describe('pedido validado (ações novas)', () => {
  it('aceita history, market e search válidos', () => {
    expect(quoteRequestSchema.safeParse({ action: 'history', item: ITSA }).success).toBe(true);
    expect(quoteRequestSchema.safeParse({ action: 'market', source: 'brapi', sort: 'up_day', type: 'reit' }).success).toBe(true);
    expect(quoteRequestSchema.safeParse({ action: 'search', query: 'logis' }).success).toBe(true);
    expect(quoteRequestSchema.safeParse({ action: 'search', query: 'btc', types: ['crypto'] }).success).toBe(true);
  });

  it('recusa símbolo inválido, ordenação desconhecida e busca de 1 letra', () => {
    for (const b of [
      { action: 'history', item: { source: 'brapi', symbol: 'itsa4' } },
      { action: 'market', source: 'brapi', sort: 'melhores' },
      { action: 'search', query: 'l' },
      { action: 'search', query: 'x'.repeat(41) },
    ])
      expect(quoteRequestSchema.safeParse(b).success).toBe(false);
  });
});

// garante que o tipo Quote continua compatível com o cache antigo
const _q: Quote = { source: 'brapi', symbol: 'X', priceE8: 1, name: 'X', quotedAt: NOW.toISOString() };
void _q;

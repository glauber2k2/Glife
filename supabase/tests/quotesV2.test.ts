import { describe, expect, it, vi } from 'vitest';

import type { LookupItem, MarketItem, MarketSort, MarketType, PricePoint, QuoteKey, QuoteResult, QuoteSource } from '../../packages/domain/src/quotes/index.ts';
import type { RpcClient } from '../functions/quotes/cache.ts';
import { createHandler } from '../functions/quotes/handler.ts';
import { supabaseMarketLists, supabasePriceHistory } from '../functions/quotes/history.ts';

vi.mock('@glife/domain/quotes', () => import('../../packages/domain/src/quotes/index.ts'));

const claims: Record<string, Record<string, unknown>> = { 'token-aal2': { sub: 'user-1', aal: 'aal2' } };

const ITEM: MarketItem = { source: 'brapi', symbol: 'ITSA4', ticker: 'ITSA4', name: 'Itaúsa', type: 'stock', priceE8: 1, changeDay: 1, change30d: null, change1y: null, volume: 1 };

function setup(o: { fail?: boolean } = {}) {
  const calls: unknown[] = [];
  const service = {
    async getQuotes(_k: readonly QuoteKey[]): Promise<QuoteResult> {
      return { quotes: [], errors: [] };
    },
    async lookup(_s: QuoteSource, _q: string): Promise<LookupItem[]> {
      return [];
    },
    async history(key: QuoteKey): Promise<PricePoint[]> {
      calls.push(['history', key]);
      if (o.fail) throw new Error('boom');
      return [{ date: '2026-11-27', closeE8: 1 }];
    },
    async market(source: QuoteSource, sort: MarketSort, type?: MarketType): Promise<MarketItem[]> {
      calls.push(['market', source, sort, type]);
      return [ITEM];
    },
    async search(q: string): Promise<MarketItem[]> {
      calls.push(['search', q]);
      return [ITEM];
    },
  };
  return { handler: createHandler({ verify: async (jwt) => claims[jwt] ?? null, service }), calls };
}

const post = (body: unknown, token: string | null = 'token-aal2') =>
  new Request('https://example.test/functions/v1/quotes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });

describe('quotes: ações novas', () => {
  it('history devolve os pontos', async () => {
    const { handler, calls } = setup();
    const res = await handler(post({ action: 'history', item: { source: 'brapi', symbol: 'ITSA4' } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ points: [{ date: '2026-11-27', closeE8: 1 }] });
    expect(calls).toEqual([['history', { source: 'brapi', symbol: 'ITSA4' }]]);
  });

  it('market e search devolvem os itens', async () => {
    const { handler, calls } = setup();
    expect(await (await handler(post({ action: 'market', source: 'brapi', sort: 'up_day', type: 'reit' }))).json()).toEqual({ items: [ITEM] });
    expect(await (await handler(post({ action: 'search', query: 'itsa' }))).json()).toEqual({ items: [ITEM] });
    expect(calls).toEqual([
      ['market', 'brapi', 'up_day', 'reit'],
      ['search', 'itsa'],
    ]);
  });

  it('sem token: 401; símbolo inválido ou ordenação desconhecida: 400', async () => {
    const { handler, calls } = setup();
    expect((await handler(post({ action: 'search', query: 'itsa' }, null))).status).toBe(401);
    expect((await handler(post({ action: 'history', item: { source: 'brapi', symbol: 'itsa4' } }))).status).toBe(400);
    expect((await handler(post({ action: 'market', source: 'brapi', sort: 'melhores' }))).status).toBe(400);
    expect(calls).toEqual([]);
  });

  it('serviço falhando: 502 com mensagem curta', async () => {
    const { handler } = setup({ fail: true });
    const res = await handler(post({ action: 'history', item: { source: 'brapi', symbol: 'ITSA4' } }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'Cotação indisponível agora.' });
  });
});

function rpc(reply: Record<string, { data: unknown; error: unknown }>) {
  const calls: [string, Record<string, unknown>][] = [];
  const client: RpcClient = {
    rpc(fn, args) {
      calls.push([fn, args]);
      return Promise.resolve(reply[fn] ?? { data: null, error: null });
    },
  };
  return { client, calls };
}

const KEY: QuoteKey = { source: 'brapi', symbol: 'ITSA4' };

describe('histórico e listas sobre as funções do banco', () => {
  it('get converte as linhas; put grava no formato do banco', async () => {
    const { client, calls } = rpc({ market_prices_get: { data: [{ date: '2026-11-26', close_e8: '1050000000' }], error: null } });
    const store = supabasePriceHistory(client);
    expect(await store.get(KEY)).toEqual([{ date: '2026-11-26', closeE8: 1_050_000_000 }]);
    await store.put(KEY, [{ date: '2026-11-27', closeE8: 2 }]);
    expect(calls[1]).toEqual(['market_prices_put', { key: KEY, points: [{ date: '2026-11-27', close_e8: 2 }] }]);
  });

  it('fetchedToday e markFetched usam as funções de marca', async () => {
    const { client, calls } = rpc({ market_history_fetched: { data: true, error: null } });
    const store = supabasePriceHistory(client);
    expect(await store.fetchedToday(KEY, '2026-11-27')).toBe(true);
    await store.markFetched(KEY, '2026-11-27');
    expect(calls.map((c) => c[0])).toEqual(['market_history_fetched', 'market_history_mark']);
  });

  it('falha ao ler vira vazio / não buscado; falha ao gravar é ignorada', async () => {
    const err = { data: null, error: { message: 'x' } };
    const { client } = rpc({ market_prices_get: err, market_history_fetched: err, market_prices_put: err, market_lists_get: err, market_lists_put: err });
    const store = supabasePriceHistory(client);
    expect(await store.get(KEY)).toEqual([]);
    expect(await store.fetchedToday(KEY, '2026-11-27')).toBe(false);
    await expect(store.put(KEY, [{ date: '2026-11-27', closeE8: 2 }])).resolves.toBeUndefined();
    const lists = supabaseMarketLists(client);
    expect(await lists.get('brapi')).toBeNull();
    await expect(lists.put('brapi', [ITEM])).resolves.toBeUndefined();
  });

  it('listas: get devolve itens e hora; put manda o payload', async () => {
    const { client, calls } = rpc({ market_lists_get: { data: [{ payload: [ITEM], fetched_at: '2026-11-27T15:00:00+00:00' }], error: null } });
    const lists = supabaseMarketLists(client);
    expect(await lists.get('brapi')).toEqual({ items: [ITEM], fetchedAt: '2026-11-27T15:00:00.000Z' });
    await lists.put('brapi', [ITEM]);
    expect(calls[1]).toEqual(['market_lists_put', { list: 'brapi', payload: [ITEM] }]);
  });
});

import { describe, expect, it } from 'vitest';

import { supabaseQuoteCache, type RpcClient } from '../functions/quotes/cache.ts';

function fakeRpc(rows: unknown[] = [], error: unknown = null) {
  const calls: [string, unknown][] = [];
  const client: RpcClient = {
    rpc: async (fn, args) => {
      calls.push([fn, args]);
      return { data: fn === 'market_quotes_get' ? rows : null, error };
    },
  };
  return { client, calls };
}

describe('cache de cotações sobre as funções do banco', () => {
  it('get pede as chaves e converte as linhas', async () => {
    const { client, calls } = fakeRpc([
      { source: 'brapi', symbol: 'ITSA4', price_e8: 1023000000, name: 'Itaúsa', quoted_at: '2026-11-25T13:07:00+00:00', fetched_at: '2026-11-25T13:10:00+00:00' },
    ]);
    const got = await supabaseQuoteCache(client).get([{ source: 'brapi', symbol: 'ITSA4' }]);
    expect(calls).toEqual([['market_quotes_get', { keys: [{ source: 'brapi', symbol: 'ITSA4' }] }]]);
    expect(got).toEqual([
      { source: 'brapi', symbol: 'ITSA4', priceE8: 1023000000, name: 'Itaúsa', quotedAt: '2026-11-25T13:07:00.000Z', fetchedAt: '2026-11-25T13:10:00.000Z' },
    ]);
  });

  it('put grava no formato do banco', async () => {
    const { client, calls } = fakeRpc();
    await supabaseQuoteCache(client).put([{ source: 'coingecko', symbol: 'bitcoin', priceE8: 5, name: 'bitcoin', quotedAt: '2026-11-25T13:00:00.000Z' }]);
    expect(calls).toEqual([
      ['market_quotes_put', { quotes: [{ source: 'coingecko', symbol: 'bitcoin', price_e8: 5, name: 'bitcoin', quoted_at: '2026-11-25T13:00:00.000Z' }] }],
    ]);
  });

  it('falha ao ler o cache não impede buscar no provedor (vazio); falha ao gravar é ignorada', async () => {
    const { client } = fakeRpc([], { message: 'x' });
    const cache = supabaseQuoteCache(client);
    expect(await cache.get([{ source: 'brapi', symbol: 'ITSA4' }])).toEqual([]);
    await expect(cache.put([])).resolves.toBeUndefined();
  });
});

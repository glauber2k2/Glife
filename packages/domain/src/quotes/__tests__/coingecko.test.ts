import { describe, expect, it } from 'vitest';

import { CoinGeckoProvider, type FetchFn } from '../index.ts';

function fakeFetch(reply: (url: URL) => { status: number; body?: unknown } | Error) {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const fetch: FetchFn = async (url, init) => {
    calls.push({ url, headers: init?.headers ?? {} });
    const r = reply(new URL(url));
    if (r instanceof Error) throw r;
    return { ok: r.status < 300, status: r.status, json: async () => r.body };
  };
  return { fetch, calls };
}

describe('coingecko: cripto em reais', () => {
  it('busca vários ids numa chamada, com a chave demo no cabeçalho', async () => {
    const { fetch, calls } = fakeFetch(() => ({
      status: 200,
      body: { bitcoin: { brl: 512345.67, last_updated_at: 1_795_600_000 }, ethereum: { brl: 18000.5, last_updated_at: 1_795_600_060 } },
    }));
    const r = await new CoinGeckoProvider({ fetch, demoKey: 'K' }).fetchQuotes(['bitcoin', 'ethereum']);
    expect(calls).toEqual([
      {
        url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=brl&include_last_updated_at=true',
        headers: { 'x-cg-demo-api-key': 'K' },
      },
    ]);
    expect(r.errors).toEqual([]);
    expect(r.quotes).toEqual([
      { source: 'coingecko', symbol: 'bitcoin', priceE8: 51_234_567_000_000, name: 'bitcoin', quotedAt: new Date(1_795_600_000_000).toISOString() },
      { source: 'coingecko', symbol: 'ethereum', priceE8: 1_800_050_000_000, name: 'ethereum', quotedAt: new Date(1_795_600_060_000).toISOString() },
    ]);
  });

  it('id ausente na resposta é not_found; falha da chamada deixa todos unavailable', async () => {
    const ok = fakeFetch(() => ({ status: 200, body: { bitcoin: { brl: 1, last_updated_at: 1 } } }));
    const r = await new CoinGeckoProvider({ fetch: ok.fetch, demoKey: null }).fetchQuotes(['bitcoin', 'moeda-sumida']);
    expect(ok.calls[0]!.headers).toEqual({});
    expect(r.errors).toEqual([{ source: 'coingecko', symbol: 'moeda-sumida', reason: 'not_found' }]);

    const down = fakeFetch(() => ({ status: 429 }));
    const r2 = await new CoinGeckoProvider({ fetch: down.fetch, demoKey: null }).fetchQuotes(['bitcoin', 'ethereum']);
    expect(r2.quotes).toEqual([]);
    expect(r2.errors.map((e) => e.reason)).toEqual(['unavailable', 'unavailable']);
  });

  it('cripto barata mantém frações de centavo', async () => {
    const { fetch } = fakeFetch(() => ({ status: 200, body: { 'shiba-inu': { brl: 0.00012345, last_updated_at: 1 } } }));
    const r = await new CoinGeckoProvider({ fetch, demoKey: null }).fetchQuotes(['shiba-inu']);
    expect(r.quotes[0]!.priceE8).toBe(12_345);
  });

  it('lookup busca por nome ou sigla e devolve até 8 moedas', async () => {
    const coins = Array.from({ length: 10 }, (_, i) => ({ id: `coin-${i}`, name: `Coin ${i}`, symbol: `c${i}` }));
    const { fetch, calls } = fakeFetch(() => ({ status: 200, body: { coins: [{ id: 'bitcoin', name: 'Bitcoin', symbol: 'btc' }, ...coins] } }));
    const items = await new CoinGeckoProvider({ fetch, demoKey: null }).lookup(' btc ');
    expect(calls[0]!.url).toBe('https://api.coingecko.com/api/v3/search?query=btc');
    expect(items).toHaveLength(8);
    expect(items[0]).toEqual({ source: 'coingecko', symbol: 'bitcoin', name: 'Bitcoin', ticker: 'BTC', priceE8: null });
  });
});

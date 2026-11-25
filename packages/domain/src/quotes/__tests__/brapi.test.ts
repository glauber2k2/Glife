import { describe, expect, it } from 'vitest';

import { BrapiProvider, type FetchFn } from '../index.ts';

type Reply = { status: number; body?: unknown } | Error;

function fakeFetch(replies: Record<string, Reply>) {
  const calls: string[] = [];
  const fetch: FetchFn = async (url) => {
    calls.push(url);
    const path = new URL(url).pathname;
    const r = replies[path];
    if (!r) return { ok: false, status: 404, json: async () => ({ error: true }) };
    if (r instanceof Error) throw r;
    return { ok: r.status < 300, status: r.status, json: async () => r.body };
  };
  return { fetch, calls };
}

const result = (symbol: string, price: number, extra: object = {}) => ({
  status: 200,
  body: { results: [{ symbol, regularMarketPrice: price, regularMarketTime: '2026-11-25T13:07:00.000Z', shortName: `${symbol} PN`, ...extra }] },
});

describe('brapi: ações e FIIs', () => {
  it('faz uma chamada por ticker, com o token, e converte o preço para R$ × 10⁸', async () => {
    const { fetch, calls } = fakeFetch({
      '/api/quote/ITSA4': result('ITSA4', 10.23, { longName: 'Itaúsa S.A.' }),
      '/api/quote/HGLG11': result('HGLG11', 158.4),
    });
    const r = await new BrapiProvider({ fetch, token: 'T' }).fetchQuotes(['ITSA4', 'HGLG11']);
    expect(calls).toEqual(['https://brapi.dev/api/quote/ITSA4?token=T', 'https://brapi.dev/api/quote/HGLG11?token=T']);
    expect(r.errors).toEqual([]);
    expect(r.quotes).toEqual([
      { source: 'brapi', symbol: 'ITSA4', priceE8: 1_023_000_000, name: 'Itaúsa S.A.', quotedAt: '2026-11-25T13:07:00.000Z' },
      { source: 'brapi', symbol: 'HGLG11', priceE8: 15_840_000_000, name: 'HGLG11 PN', quotedAt: '2026-11-25T13:07:00.000Z' },
    ]);
  });

  it('ticker inexistente vira not_found e falha do servidor vira unavailable, sem derrubar os outros', async () => {
    const { fetch } = fakeFetch({
      '/api/quote/ITSA4': result('ITSA4', 10),
      '/api/quote/PETR4': { status: 500 },
      '/api/quote/VALE3': new Error('rede'),
    });
    const r = await new BrapiProvider({ fetch, token: 'T' }).fetchQuotes(['XXXX9', 'ITSA4', 'PETR4', 'VALE3']);
    expect(r.quotes.map((q) => q.symbol)).toEqual(['ITSA4']);
    expect(r.errors).toEqual([
      { source: 'brapi', symbol: 'XXXX9', reason: 'not_found' },
      { source: 'brapi', symbol: 'PETR4', reason: 'unavailable' },
      { source: 'brapi', symbol: 'VALE3', reason: 'unavailable' },
    ]);
  });

  it('resposta sem preço válido vira not_found', async () => {
    const { fetch } = fakeFetch({ '/api/quote/ITSA4': { status: 200, body: { results: [{ symbol: 'ITSA4', regularMarketPrice: null }] } } });
    const r = await new BrapiProvider({ fetch, token: null }).fetchQuotes(['ITSA4']);
    expect(r.errors).toEqual([{ source: 'brapi', symbol: 'ITSA4', reason: 'not_found' }]);
  });

  it('sem token usa a URL sem token', async () => {
    const { fetch, calls } = fakeFetch({ '/api/quote/PETR4': result('PETR4', 38) });
    await new BrapiProvider({ fetch, token: null }).fetchQuotes(['PETR4']);
    expect(calls).toEqual(['https://brapi.dev/api/quote/PETR4']);
  });

  it('lookup confere o ticker (em maiúsculas) e devolve nome e preço, ou nada', async () => {
    const { fetch } = fakeFetch({ '/api/quote/ITSA4': result('ITSA4', 10.23) });
    const p = new BrapiProvider({ fetch, token: 'T' });
    expect(await p.lookup(' itsa4 ')).toEqual([{ source: 'brapi', symbol: 'ITSA4', name: 'ITSA4 PN', ticker: 'ITSA4', priceE8: 1_023_000_000 }]);
    expect(await p.lookup('XXXX9')).toEqual([]);
    expect(await p.lookup('ab')).toEqual([]);
  });
});

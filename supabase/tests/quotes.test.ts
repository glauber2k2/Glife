import { describe, expect, it, vi } from 'vitest';

import type { LookupItem, QuoteKey, QuoteResult, QuoteSource } from '../../packages/domain/src/quotes/index.ts';
import { createHandler } from '../functions/quotes/handler.ts';

// Vitest não lê o import map do Deno: resolve o alias para a implementação real do domain.
vi.mock('@glife/domain/quotes', () => import('../../packages/domain/src/quotes/index.ts'));

const claims: Record<string, Record<string, unknown>> = {
  'token-aal2': { sub: 'user-1', aal: 'aal2' },
  'token-aal1': { sub: 'user-1', aal: 'aal1' },
};

function setup() {
  const asked: QuoteKey[][] = [];
  const looked: [QuoteSource, string][] = [];
  const service = {
    async getQuotes(keys: readonly QuoteKey[]): Promise<QuoteResult> {
      asked.push([...keys]);
      return {
        quotes: keys.filter((k) => k.symbol !== 'XXXX9').map((k) => ({ ...k, priceE8: 100, name: k.symbol, quotedAt: '2026-11-25T13:00:00.000Z' })),
        errors: keys.filter((k) => k.symbol === 'XXXX9').map((k) => ({ ...k, reason: 'not_found' as const })),
      };
    },
    async lookup(source: QuoteSource, query: string): Promise<LookupItem[]> {
      looked.push([source, query]);
      return [{ source, symbol: 'bitcoin', name: 'Bitcoin', ticker: 'BTC', priceE8: null }];
    },
  };
  const handler = createHandler({ verify: async (jwt) => claims[jwt] ?? null, service });
  return { handler, asked, looked };
}

const post = (body: unknown, token: string | null = 'token-aal2') =>
  new Request('https://example.test/functions/v1/quotes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const quotesBody = { action: 'quotes', items: [{ source: 'brapi', symbol: 'ITSA4' }, { source: 'brapi', symbol: 'XXXX9' }] };

describe('quotes: autenticação', () => {
  it('sem token responde 401 e não consulta nada', async () => {
    const { handler, asked } = setup();
    const res = await handler(post(quotesBody, null));
    expect(res.status).toBe(401);
    expect(asked).toEqual([]);
  });

  it('token inválido responde 401', async () => {
    const { handler } = setup();
    expect((await handler(post(quotesBody, 'forjado'))).status).toBe(401);
  });

  it('sessão sem MFA (aal1) responde 403', async () => {
    const { handler, asked } = setup();
    const res = await handler(post(quotesBody, 'token-aal1'));
    expect(res.status).toBe(403);
    expect(asked).toEqual([]);
  });
});

describe('quotes: pedidos', () => {
  it('devolve cotações e erros por símbolo', async () => {
    const { handler, asked } = setup();
    const res = await handler(post(quotesBody));
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(await res.json()).toEqual({
      quotes: [{ source: 'brapi', symbol: 'ITSA4', priceE8: 100, name: 'ITSA4', quotedAt: '2026-11-25T13:00:00.000Z' }],
      errors: [{ source: 'brapi', symbol: 'XXXX9', reason: 'not_found' }],
    });
    expect(asked).toHaveLength(1);
  });

  it('lookup devolve a lista de itens', async () => {
    const { handler, looked } = setup();
    const res = await handler(post({ action: 'lookup', source: 'coingecko', query: ' btc ' }));
    expect(await res.json()).toEqual({ items: [{ source: 'coingecko', symbol: 'bitcoin', name: 'Bitcoin', ticker: 'BTC', priceE8: null }] });
    expect(looked).toEqual([['coingecko', 'btc']]);
  });

  it.each([
    ['JSON quebrado', '{'],
    ['ação desconhecida', { action: 'comprar' }],
    ['código fora do formato', { action: 'quotes', items: [{ source: 'brapi', symbol: 'itsa4' }] }],
    ['mais de 50 itens', { action: 'quotes', items: Array.from({ length: 51 }, () => ({ source: 'brapi', symbol: 'ITSA4' })) }],
  ])('recusa %s com 400 e mensagem em português', async (_label, body) => {
    const { handler, asked } = setup();
    const res = await handler(post(body));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Pedido de cotação inválido.' });
    expect(asked).toEqual([]);
  });

  it('corpo grande demais é recusado com 413', async () => {
    const { handler } = setup();
    const res = await handler(post('x'.repeat(20_000)));
    expect(res.status).toBe(413);
  });

  it('OPTIONS responde ao preflight do navegador; GET não é aceito', async () => {
    const { handler } = setup();
    const pre = await handler(new Request('https://example.test/functions/v1/quotes', { method: 'OPTIONS' }));
    expect(pre.status).toBe(204);
    expect(pre.headers.get('Access-Control-Allow-Headers')).toBe('authorization, x-client-info, apikey, content-type');
    const get = await handler(new Request('https://example.test/functions/v1/quotes', { headers: { Authorization: 'Bearer token-aal2' } }));
    expect(get.status).toBe(405);
  });

  it('falha inesperada do serviço vira 502 sem detalhes', async () => {
    const handler = createHandler({
      verify: async (jwt) => claims[jwt] ?? null,
      service: {
        getQuotes: () => Promise.reject(new Error('banco caiu: segredo')),
        lookup: () => Promise.resolve([]),
      },
    });
    const res = await handler(post(quotesBody));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'Cotação indisponível agora.' });
  });
});

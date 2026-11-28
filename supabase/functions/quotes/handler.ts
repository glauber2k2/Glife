// Edge Function `quotes`: cotações (ações/FIIs pela brapi, cripto pela CoinGecko) com cache de 30 min no servidor.
// As chaves das APIs ficam só nos secrets. Só atende sessão com MFA; não registra dados do usuário.
import {
  quoteRequestSchema,
  type LookupItem,
  type MarketItem,
  type MarketSort,
  type MarketType,
  type PricePoint,
  type QuoteKey,
  type QuoteResult,
  type QuoteSource,
} from '@glife/domain/quotes';

import { requireAal2, type VerifyJwt } from '../_shared/auth.ts';

export interface QuotesService {
  getQuotes(keys: readonly QuoteKey[]): Promise<QuoteResult>;
  lookup(source: QuoteSource, query: string): Promise<LookupItem[]>;
  history(key: QuoteKey): Promise<PricePoint[]>;
  market(source: QuoteSource, sort: MarketSort, type?: MarketType): Promise<MarketItem[]>;
  search(query: string): Promise<MarketItem[]>;
}

const MAX_BODY = 16_000;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: CORS });

export function createHandler(deps: { verify: VerifyJwt; service: QuotesService }) {
  return async function handler(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

    const auth = await requireAal2(req, deps.verify);
    if ('status' in auth) return json({ error: auth.error }, auth.status);

    const declared = Number(req.headers.get('Content-Length') ?? '0');
    if (declared > MAX_BODY) return json({ error: 'Pedido grande demais.' }, 413);
    const text = await req.text();
    if (text.length > MAX_BODY) return json({ error: 'Pedido grande demais.' }, 413);
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      raw = null;
    }
    const parsed = quoteRequestSchema.safeParse(raw);
    if (!parsed.success) return json({ error: 'Pedido de cotação inválido.' }, 400);

    try {
      const request = parsed.data;
      switch (request.action) {
        case 'lookup':
          return json({ items: await deps.service.lookup(request.source, request.query) });
        case 'history':
          return json({ points: await deps.service.history(request.item) });
        case 'market':
          return json({ items: await deps.service.market(request.source, request.sort, request.type) });
        case 'search':
          return json({ items: await deps.service.search(request.query) });
        default:
          return json(await deps.service.getQuotes(request.items));
      }
    } catch {
      return json({ error: 'Cotação indisponível agora.' }, 502);
    }
  };
}

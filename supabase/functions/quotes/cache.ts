// QuoteCache sobre `private.market_quotes`, pelas funções `market_quotes_get/put` (só service_role executa).
// Cache é otimização: se falhar, a cotação ainda vem do provedor.
import type { Quote, QuoteCache, QuoteKey, QuoteSource } from '@glife/domain/quotes';

/** O pedaço do cliente Supabase que o cache usa. */
export interface RpcClient {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
}

interface Row {
  source: QuoteSource;
  symbol: string;
  price_e8: number | string;
  name: string;
  quoted_at: string;
  fetched_at: string;
}

const iso = (s: string) => new Date(s).toISOString();

export function supabaseQuoteCache(client: RpcClient): QuoteCache {
  return {
    async get(keys: readonly QuoteKey[]) {
      if (!keys.length) return [];
      const { data, error } = await client.rpc('market_quotes_get', { keys: keys.map((k) => ({ source: k.source, symbol: k.symbol })) });
      if (error || !Array.isArray(data)) return [];
      return (data as Row[]).map((r) => ({
        source: r.source,
        symbol: r.symbol,
        priceE8: Number(r.price_e8),
        name: r.name,
        quotedAt: iso(r.quoted_at),
        fetchedAt: iso(r.fetched_at),
      }));
    },
    async put(quotes: readonly Quote[]) {
      if (!quotes.length) return;
      await client.rpc('market_quotes_put', {
        quotes: quotes.map((q) => ({ source: q.source, symbol: q.symbol, price_e8: q.priceE8, name: q.name, quoted_at: q.quotedAt })),
      });
    },
  };
}

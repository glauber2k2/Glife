// Histórico diário (`private.market_prices_daily`) e listas de mercado (`private.market_lists`) pelas funções do
// banco que só service_role executa. Como o cache de cotações, é otimização: falha ao ler vira vazio; ao gravar, ignorada.
import type { MarketItem, MarketListCache, PriceHistoryStore, PricePoint, QuoteKey, QuoteSource } from '@glife/domain/quotes';

import type { RpcClient } from './cache.ts';

const keyArg = (k: QuoteKey) => ({ source: k.source, symbol: k.symbol });

export function supabasePriceHistory(client: RpcClient): PriceHistoryStore {
  return {
    async get(key) {
      const { data, error } = await client.rpc('market_prices_get', { key: keyArg(key) });
      if (error || !Array.isArray(data)) return [];
      return (data as { date: string; close_e8: number | string }[]).map((r): PricePoint => ({ date: String(r.date).slice(0, 10), closeE8: Number(r.close_e8) }));
    },
    async put(key, points) {
      if (!points.length) return;
      await client.rpc('market_prices_put', { key: keyArg(key), points: points.map((p) => ({ date: p.date, close_e8: p.closeE8 })) });
    },
    async fetchedToday(key, today) {
      const { data, error } = await client.rpc('market_history_fetched', { key: keyArg(key), today });
      return !error && data === true;
    },
    async markFetched(key, today) {
      await client.rpc('market_history_mark', { key: keyArg(key), today });
    },
  };
}

export function supabaseMarketLists(client: RpcClient): MarketListCache {
  return {
    async get(list: QuoteSource) {
      const { data, error } = await client.rpc('market_lists_get', { list });
      const row = !error && Array.isArray(data) ? (data[0] as { payload?: unknown; fetched_at?: string } | undefined) : undefined;
      if (!row || !Array.isArray(row.payload) || !row.fetched_at) return null;
      return { items: row.payload as MarketItem[], fetchedAt: new Date(row.fetched_at).toISOString() };
    },
    async put(list, items) {
      await client.rpc('market_lists_put', { list, payload: items });
    },
  };
}

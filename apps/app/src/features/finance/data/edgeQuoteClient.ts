// QuoteClient e MarketClient pela Edge Function `quotes` (as chaves das APIs ficam no servidor). Só confere o
// formato da resposta.
import type { LookupItem, MarketItem, PricePoint, QuoteResult } from '@glife/domain/quotes';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { MarketClient } from './marketData';
import type { QuoteClient } from './quoteRefresher';

async function call<T>(supabase: SupabaseClient, body: object, ok: (data: unknown) => data is T): Promise<T> {
  const { data, error } = await supabase.functions.invoke('quotes', { body });
  if (error) throw error;
  if (!ok(data)) throw new Error('Resposta de cotação inesperada');
  return data;
}

const isResult = (d: unknown): d is QuoteResult =>
  !!d && typeof d === 'object' && Array.isArray((d as QuoteResult).quotes) && Array.isArray((d as QuoteResult).errors);
const isItems = <T,>(d: unknown): d is { items: T[] } => !!d && typeof d === 'object' && Array.isArray((d as { items: unknown }).items);
const isPoints = (d: unknown): d is { points: PricePoint[] } => !!d && typeof d === 'object' && Array.isArray((d as { points: unknown }).points);

export function createEdgeQuoteClient(supabase: SupabaseClient): QuoteClient & MarketClient {
  return {
    quotes: (items) => call(supabase, { action: 'quotes', items }, isResult),
    lookup: async (source, query) => (await call(supabase, { action: 'lookup', source, query }, isItems<LookupItem>)).items,
    history: async (item) => (await call(supabase, { action: 'history', item }, isPoints)).points,
    market: async (source, sort, type) => (await call(supabase, { action: 'market', source, sort, ...(type ? { type } : {}) }, isItems<MarketItem>)).items,
    search: async (query, types) => (await call(supabase, { action: 'search', query, ...(types?.length ? { types } : {}) }, isItems<MarketItem>)).items,
  };
}

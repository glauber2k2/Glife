// QuoteClient pela Edge Function `quotes` (as chaves das APIs ficam no servidor). Só confere o formato da resposta.
import type { LookupItem, QuoteResult } from '@glife/domain/quotes';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { QuoteClient } from './quoteRefresher';

async function call<T>(supabase: SupabaseClient, body: object, ok: (data: unknown) => data is T): Promise<T> {
  const { data, error } = await supabase.functions.invoke('quotes', { body });
  if (error) throw error;
  if (!ok(data)) throw new Error('Resposta de cotação inesperada');
  return data;
}

const isResult = (d: unknown): d is QuoteResult =>
  !!d && typeof d === 'object' && Array.isArray((d as QuoteResult).quotes) && Array.isArray((d as QuoteResult).errors);
const isLookup = (d: unknown): d is { items: LookupItem[] } => !!d && typeof d === 'object' && Array.isArray((d as { items: unknown }).items);

export function createEdgeQuoteClient(supabase: SupabaseClient): QuoteClient {
  return {
    quotes: (items) => call(supabase, { action: 'quotes', items }, isResult),
    lookup: async (source, query) => (await call(supabase, { action: 'lookup', source, query }, isLookup)).items,
  };
}

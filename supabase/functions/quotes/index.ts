// Composição da Edge Function `quotes`. Secrets: BRAPI_TOKEN e COINGECKO_DEMO_KEY (opcionais: sem eles, os
// provedores usam o modo sem chave, mais limitado). SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY vêm do ambiente.
import { BrapiProvider, CoinGeckoProvider, QuoteService } from '@glife/domain/quotes';
import { createClient } from '@supabase/supabase-js';

import { supabaseQuoteCache } from './cache.ts';
import { createHandler } from './handler.ts';
import { supabaseMarketLists, supabasePriceHistory } from './history.ts';

const env = (name: string) => Deno.env.get(name)?.trim() || null;

const admin = createClient(env('SUPABASE_URL')!, env('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const fetchFn = (url: string, init?: { headers?: Record<string, string> }) => fetch(url, { headers: init?.headers });

const service = new QuoteService({
  providers: [new BrapiProvider({ fetch: fetchFn, token: env('BRAPI_TOKEN') }), new CoinGeckoProvider({ fetch: fetchFn, demoKey: env('COINGECKO_DEMO_KEY') })],
  cache: supabaseQuoteCache(admin),
  history: supabasePriceHistory(admin),
  lists: supabaseMarketLists(admin),
});

const verify = async (jwt: string) => {
  const { data, error } = await admin.auth.getClaims(jwt);
  return error || !data ? null : (data.claims as unknown as Record<string, unknown>);
};

Deno.serve(createHandler({ verify, service }));

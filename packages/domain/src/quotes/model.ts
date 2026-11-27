// Cotação de ativos de mercado: tipos, limites e validação do pedido. Puro (sem rede): os provedores recebem o
// `fetch` por injeção, então o mesmo código roda na Edge Function (Deno), nos testes e numa futura rotina de alertas.
import { z } from 'zod';

export const QUOTE_SOURCES = ['brapi', 'coingecko'] as const;
export type QuoteSource = (typeof QUOTE_SOURCES)[number];

/** Validade de uma cotação no cache (servidor e app). */
export const QUOTE_TTL_MS = 30 * 60 * 1000;
export const QUOTE_BATCH_MAX = 50;
export const LOOKUP_QUERY_MAX = 40;
export const LOOKUP_LIMIT = 8;
/** Preço em reais × 10⁸: cripto barata vale frações de centavo. */
export const PRICE_SCALE = 100_000_000;

export const SYMBOL_PATTERNS: Record<QuoteSource, RegExp> = {
  brapi: /^[A-Z0-9]{4,12}$/,
  coingecko: /^[a-z0-9-]{1,64}$/,
};

export interface QuoteKey {
  source: QuoteSource;
  symbol: string;
}
export interface Quote extends QuoteKey {
  priceE8: number;
  name: string;
  /** horário da cotação no provedor (ISO) */
  quotedAt: string;
}
export interface QuoteError extends QuoteKey {
  reason: 'not_found' | 'unavailable';
}
export interface QuoteResult {
  quotes: Quote[];
  errors: QuoteError[];
}
export interface LookupItem {
  source: QuoteSource;
  /** o que vai em `quote_symbol` (ticker na brapi, id na CoinGecko) */
  symbol: string;
  name: string;
  /** sigla para mostrar (ITSA4, BTC) */
  ticker: string;
  priceE8: number | null;
}

/** O pedaço de `fetch` que os provedores usam (o global do Deno e do navegador serve). */
export type FetchFn = (
  url: string,
  init?: { headers?: Record<string, string> },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/** Uma fonte de cotação. Fonte nova = classe nova registrada no `QuoteService`. */
export interface QuoteProvider {
  readonly source: QuoteSource;
  fetchQuotes(symbols: readonly string[]): Promise<QuoteResult>;
  lookup(query: string): Promise<LookupItem[]>;
}

/** Cache das cotações (no servidor). `fetchedAt` decide a validade. */
export interface QuoteCache {
  get(keys: readonly QuoteKey[]): Promise<(Quote & { fetchedAt: string })[]>;
  put(quotes: readonly Quote[]): Promise<void>;
}

export function toE8(price: number): number {
  if (!Number.isFinite(price) || price < 0) throw new RangeError('Preço inválido');
  return Math.round(price * PRICE_SCALE);
}

export const quoteKeySchema = z
  .object({ source: z.enum(QUOTE_SOURCES), symbol: z.string() })
  .refine((k) => SYMBOL_PATTERNS[k.source].test(k.symbol), 'Código inválido');

export const quoteRequestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('quotes'), items: z.array(quoteKeySchema).min(1).max(QUOTE_BATCH_MAX) }),
  z.object({ action: z.literal('lookup'), source: z.enum(QUOTE_SOURCES), query: z.string().trim().min(1).max(LOOKUP_QUERY_MAX) }),
]);
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

export const keyOf = (k: QuoteKey) => `${k.source}:${k.symbol}`;

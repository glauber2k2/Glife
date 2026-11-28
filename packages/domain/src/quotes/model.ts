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

/** Fechamento de um dia (data local `YYYY-MM-DD`). */
export interface PricePoint {
  date: string;
  closeE8: number;
}

export const MARKET_TYPES = ['stock', 'reit', 'crypto'] as const;
export type MarketType = (typeof MARKET_TYPES)[number];
/** Um ativo do mercado (lista, ranking e busca). Variações em % (5 = 5%). */
export interface MarketItem {
  source: QuoteSource;
  symbol: string;
  ticker: string;
  name: string;
  type: MarketType;
  priceE8: number | null;
  changeDay: number | null;
  change30d: number | null;
  change1y: number | null;
  volume: number | null;
}

export const MARKET_SORTS = ['up_day', 'down_day', 'volume', 'up_30d', 'up_1y'] as const;
export type MarketSort = (typeof MARKET_SORTS)[number];
export const SEARCH_MIN = 2;
export const MARKET_MIN_VOLUME = 100_000;
export const MARKET_LIMIT = 10;
/** Catálogo da busca vale um dia. */
export const CATALOG_TTL_MS = 24 * 60 * 60 * 1000;

/** Uma fonte de cotação. Fonte nova = classe nova registrada no `QuoteService`. */
export interface QuoteProvider {
  readonly source: QuoteSource;
  fetchQuotes(symbols: readonly string[]): Promise<QuoteResult>;
  lookup(query: string): Promise<LookupItem[]>;
  /** fechamentos diários disponíveis no plano grátis; [] se a fonte recusar */
  history(symbol: string): Promise<PricePoint[]>;
  /** lista do mercado; [] se a fonte falhar */
  market(): Promise<MarketItem[]>;
}

/** Histórico diário guardado no servidor (cresce com o tempo). */
export interface PriceHistoryStore {
  get(key: QuoteKey): Promise<PricePoint[]>;
  put(key: QuoteKey, points: readonly PricePoint[]): Promise<void>;
  fetchedToday(key: QuoteKey, today: string): Promise<boolean>;
  markFetched(key: QuoteKey, today: string): Promise<void>;
}

/** Cache da lista de mercado de cada fonte. */
export interface MarketListCache {
  get(list: QuoteSource): Promise<{ items: MarketItem[]; fetchedAt: string } | null>;
  put(list: QuoteSource, items: readonly MarketItem[]): Promise<void>;
}

/** Data em Brasília (UTC−3, sem horário de verão desde 2019) de um instante em ms. */
export const brDate = (ms: number) => new Date(ms - 3 * 3_600_000).toISOString().slice(0, 10);

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
  z.object({ action: z.literal('history'), item: quoteKeySchema }),
  z.object({ action: z.literal('market'), source: z.enum(QUOTE_SOURCES), sort: z.enum(MARKET_SORTS), type: z.enum(MARKET_TYPES).optional() }),
  z.object({ action: z.literal('search'), query: z.string().trim().min(SEARCH_MIN).max(LOOKUP_QUERY_MAX), types: z.array(z.enum(MARKET_TYPES)).max(MARKET_TYPES.length).optional() }),
]);
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

export const keyOf = (k: QuoteKey) => `${k.source}:${k.symbol}`;

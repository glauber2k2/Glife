// brapi.dev: ações e FIIs da B3. Plano grátis: 1 ticker por chamada e ~30 min de atraso.
import { SYMBOL_PATTERNS, toE8, type FetchFn, type LookupItem, type Quote, type QuoteError, type QuoteProvider, type QuoteResult } from './model.ts';

const BASE = 'https://brapi.dev/api/quote/';

interface BrapiResult {
  symbol?: string;
  regularMarketPrice?: number | null;
  regularMarketTime?: string | null;
  longName?: string | null;
  shortName?: string | null;
}

type One = { quote: Quote } | { error: QuoteError['reason'] };

export class BrapiProvider implements QuoteProvider {
  readonly source = 'brapi' as const;
  private readonly fetch: FetchFn;
  private readonly token: string | null;

  constructor(o: { fetch: FetchFn; token: string | null }) {
    this.fetch = o.fetch;
    this.token = o.token;
  }

  private url(symbol: string) {
    const base = BASE + encodeURIComponent(symbol);
    return this.token ? `${base}?token=${encodeURIComponent(this.token)}` : base;
  }

  private async one(symbol: string): Promise<One> {
    try {
      const res = await this.fetch(this.url(symbol));
      if (res.status === 404 || res.status === 400) return { error: 'not_found' };
      if (!res.ok) return { error: 'unavailable' };
      const r = ((await res.json()) as { results?: BrapiResult[] })?.results?.[0];
      const price = r?.regularMarketPrice;
      if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return { error: 'not_found' };
      const quotedAt = r?.regularMarketTime && !Number.isNaN(Date.parse(r.regularMarketTime)) ? new Date(r.regularMarketTime).toISOString() : new Date().toISOString();
      return { quote: { source: this.source, symbol, priceE8: toE8(price), name: r?.longName || r?.shortName || symbol, quotedAt } };
    } catch {
      return { error: 'unavailable' };
    }
  }

  async fetchQuotes(symbols: readonly string[]): Promise<QuoteResult> {
    const out: QuoteResult = { quotes: [], errors: [] };
    // Sequencial: o plano grátis aceita um ticker por chamada e é sensível a rajadas.
    for (const symbol of symbols) {
      const r = await this.one(symbol);
      if ('quote' in r) out.quotes.push(r.quote);
      else out.errors.push({ source: this.source, symbol, reason: r.error });
    }
    return out;
  }

  async lookup(query: string): Promise<LookupItem[]> {
    const symbol = query.trim().toUpperCase();
    if (!SYMBOL_PATTERNS.brapi.test(symbol)) return [];
    const r = await this.one(symbol);
    if (!('quote' in r)) return [];
    return [{ source: this.source, symbol, name: r.quote.name, ticker: symbol, priceE8: r.quote.priceE8 }];
  }
}

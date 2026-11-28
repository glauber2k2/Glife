// brapi.dev: ações e FIIs da B3. Plano grátis: 1 ticker por chamada e ~30 min de atraso.
import {
  SYMBOL_PATTERNS,
  brDate,
  toE8,
  type FetchFn,
  type LookupItem,
  type MarketItem,
  type PricePoint,
  type Quote,
  type QuoteError,
  type QuoteProvider,
  type QuoteResult,
} from './model.ts';

const BASE = 'https://brapi.dev/api/quote/';

interface BrapiListItem {
  stock?: string;
  name?: string | null;
  close?: number | null;
  change?: number | null;
  volume?: number | null;
  type?: string;
  subType?: string;
}

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

  async history(symbol: string): Promise<PricePoint[]> {
    try {
      const tk = this.token ? `&token=${encodeURIComponent(this.token)}` : '';
      const res = await this.fetch(`${BASE}${encodeURIComponent(symbol)}?range=3mo&interval=1d${tk}`);
      if (!res.ok) return [];
      const body = (await res.json()) as { results?: { historicalDataPrice?: { date?: number; close?: number | null }[] }[] };
      const byDate = new Map<string, number>();
      for (const p of body?.results?.[0]?.historicalDataPrice ?? []) {
        if (typeof p.date !== 'number' || typeof p.close !== 'number' || !Number.isFinite(p.close) || p.close <= 0) continue;
        byDate.set(brDate(p.date * 1000), toE8(p.close));
      }
      return [...byDate].map(([date, closeE8]) => ({ date, closeE8 })).sort((a, b) => (a.date < b.date ? -1 : 1));
    } catch {
      return [];
    }
  }

  async market(): Promise<MarketItem[]> {
    try {
      const res = await this.fetch(`${BASE}list?limit=2000`);
      if (!res.ok) return [];
      const body = (await res.json()) as { stocks?: BrapiListItem[] };
      const out: MarketItem[] = [];
      for (const s of body?.stocks ?? []) {
        const type = s.type === 'stock' ? 'stock' : s.type === 'fund' && s.subType === 'fii' ? 'reit' : null;
        if (!type || !s.stock || typeof s.close !== 'number' || !Number.isFinite(s.close) || s.close <= 0) continue;
        out.push({
          source: this.source,
          symbol: s.stock,
          ticker: s.stock,
          name: s.name || s.stock,
          type,
          priceE8: toE8(s.close),
          changeDay: typeof s.change === 'number' ? s.change : null,
          change30d: null,
          change1y: null,
          volume: typeof s.volume === 'number' ? s.volume : null,
        });
      }
      return out;
    } catch {
      return [];
    }
  }

  async lookup(query: string): Promise<LookupItem[]> {
    const symbol = query.trim().toUpperCase();
    if (!SYMBOL_PATTERNS.brapi.test(symbol)) return [];
    const r = await this.one(symbol);
    if (!('quote' in r)) return [];
    return [{ source: this.source, symbol, name: r.quote.name, ticker: symbol, priceE8: r.quote.priceE8 }];
  }
}

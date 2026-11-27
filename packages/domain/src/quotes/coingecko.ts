// CoinGecko: cripto em reais. Vários ids numa chamada; chave demo (grátis) no cabeçalho, quando houver.
import { LOOKUP_LIMIT, toE8, type FetchFn, type LookupItem, type QuoteProvider, type QuoteResult } from './model.ts';

const BASE = 'https://api.coingecko.com/api/v3';

type PriceBody = Record<string, { brl?: number; last_updated_at?: number } | undefined>;
type SearchBody = { coins?: { id?: string; name?: string; symbol?: string }[] };

export class CoinGeckoProvider implements QuoteProvider {
  readonly source = 'coingecko' as const;
  private readonly fetch: FetchFn;
  private readonly demoKey: string | null;

  constructor(o: { fetch: FetchFn; demoKey: string | null }) {
    this.fetch = o.fetch;
    this.demoKey = o.demoKey;
  }

  private get(url: string) {
    return this.fetch(url, { headers: this.demoKey ? { 'x-cg-demo-api-key': this.demoKey } : {} });
  }

  async fetchQuotes(symbols: readonly string[]): Promise<QuoteResult> {
    const all = (reason: 'not_found' | 'unavailable'): QuoteResult => ({
      quotes: [],
      errors: symbols.map((symbol) => ({ source: this.source, symbol, reason })),
    });
    let body: PriceBody;
    try {
      const res = await this.get(`${BASE}/simple/price?ids=${symbols.map(encodeURIComponent).join(',')}&vs_currencies=brl&include_last_updated_at=true`);
      if (!res.ok) return all('unavailable');
      body = ((await res.json()) ?? {}) as PriceBody;
    } catch {
      return all('unavailable');
    }
    const out: QuoteResult = { quotes: [], errors: [] };
    for (const symbol of symbols) {
      const row = body[symbol];
      const price = row?.brl;
      if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
        out.errors.push({ source: this.source, symbol, reason: 'not_found' });
        continue;
      }
      const at = typeof row?.last_updated_at === 'number' ? new Date(row.last_updated_at * 1000) : new Date();
      out.quotes.push({ source: this.source, symbol, priceE8: toE8(price), name: symbol, quotedAt: at.toISOString() });
    }
    return out;
  }

  async lookup(query: string): Promise<LookupItem[]> {
    const q = query.trim();
    if (!q) return [];
    const res = await this.get(`${BASE}/search?query=${encodeURIComponent(q)}`);
    if (!res.ok) return [];
    const body = ((await res.json()) ?? {}) as SearchBody;
    return (body.coins ?? [])
      .filter((c): c is { id: string; name: string; symbol: string } => !!c.id && !!c.name && !!c.symbol)
      .slice(0, LOOKUP_LIMIT)
      .map((c) => ({ source: this.source, symbol: c.id, name: c.name, ticker: c.symbol.toUpperCase(), priceE8: null }));
  }
}

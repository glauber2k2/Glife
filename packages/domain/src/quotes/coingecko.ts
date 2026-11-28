// CoinGecko: cripto em reais. Vários ids numa chamada; chave demo (grátis) no cabeçalho, quando houver.
import { LOOKUP_LIMIT, toE8, type FetchFn, type LookupItem, type MarketItem, type PricePoint, type QuoteProvider, type QuoteResult } from './model.ts';

interface MarketsRow {
  id?: string;
  symbol?: string;
  name?: string;
  current_price?: number | null;
  total_volume?: number | null;
  price_change_percentage_24h_in_currency?: number | null;
  price_change_percentage_30d_in_currency?: number | null;
  price_change_percentage_1y_in_currency?: number | null;
}

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

  async history(symbol: string): Promise<PricePoint[]> {
    try {
      const res = await this.get(`${BASE}/coins/${encodeURIComponent(symbol)}/market_chart?vs_currency=brl&days=365&interval=daily`);
      if (!res.ok) return [];
      const body = (await res.json()) as { prices?: [number, number][] };
      const byDate = new Map<string, number>();
      for (const p of body?.prices ?? []) {
        const [ms, price] = p ?? [];
        if (typeof ms !== 'number' || typeof price !== 'number' || !Number.isFinite(price) || price <= 0) continue;
        // Cripto negocia o dia todo: vale a data UTC; o último ponto do dia vence.
        byDate.set(new Date(ms).toISOString().slice(0, 10), toE8(price));
      }
      return [...byDate].map(([date, closeE8]) => ({ date, closeE8 })).sort((a, b) => (a.date < b.date ? -1 : 1));
    } catch {
      return [];
    }
  }

  async market(): Promise<MarketItem[]> {
    try {
      const res = await this.get(`${BASE}/coins/markets?vs_currency=brl&order=market_cap_desc&per_page=100&price_change_percentage=24h,30d,1y`);
      if (!res.ok) return [];
      const body = (await res.json()) as MarketsRow[];
      const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
      return (Array.isArray(body) ? body : [])
        .filter((c) => !!c.id && !!c.symbol && !!c.name && (num(c.current_price) ?? 0) > 0)
        .map((c) => ({
          source: this.source,
          symbol: c.id!,
          ticker: c.symbol!.toUpperCase(),
          name: c.name!,
          type: 'crypto' as const,
          priceE8: toE8(c.current_price!),
          changeDay: num(c.price_change_percentage_24h_in_currency),
          change30d: num(c.price_change_percentage_30d_in_currency),
          change1y: num(c.price_change_percentage_1y_in_currency),
          volume: num(c.total_volume),
        }));
    } catch {
      return [];
    }
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

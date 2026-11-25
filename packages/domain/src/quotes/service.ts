// Junta cache e provedores: devolve do cache o que tem menos de 30 min e busca o resto na fonte certa.
// Reaproveitável por uma futura rotina agendada (alerta de preço).
import { QUOTE_TTL_MS, keyOf, type LookupItem, type QuoteCache, type QuoteKey, type QuoteProvider, type QuoteResult, type QuoteSource } from './model.ts';

export class QuoteService {
  private readonly providers: Map<QuoteSource, QuoteProvider>;
  private readonly cache: QuoteCache;
  private readonly now: () => Date;

  constructor(o: { providers: readonly QuoteProvider[]; cache: QuoteCache; now?: () => Date }) {
    this.providers = new Map(o.providers.map((p) => [p.source, p]));
    this.cache = o.cache;
    this.now = o.now ?? (() => new Date());
  }

  async getQuotes(keys: readonly QuoteKey[]): Promise<QuoteResult> {
    const unique = [...new Map(keys.map((k) => [keyOf(k), { source: k.source, symbol: k.symbol }])).values()];
    const limit = this.now().getTime() - QUOTE_TTL_MS;
    const fresh = (await this.cache.get(unique)).filter((c) => Date.parse(c.fetchedAt) > limit);
    const have = new Set(fresh.map(keyOf));
    const out: QuoteResult = { quotes: fresh.map(({ fetchedAt: _f, ...q }) => q), errors: [] };

    const missing = new Map<QuoteSource, string[]>();
    for (const k of unique) if (!have.has(keyOf(k))) missing.set(k.source, [...(missing.get(k.source) ?? []), k.symbol]);

    for (const [source, symbols] of missing) {
      const provider = this.providers.get(source);
      if (!provider) {
        out.errors.push(...symbols.map((symbol) => ({ source, symbol, reason: 'unavailable' as const })));
        continue;
      }
      const r = await provider.fetchQuotes(symbols);
      if (r.quotes.length) await this.cache.put(r.quotes);
      out.quotes.push(...r.quotes);
      out.errors.push(...r.errors);
    }
    return out;
  }

  async lookup(source: QuoteSource, query: string): Promise<LookupItem[]> {
    return (await this.providers.get(source)?.lookup(query)) ?? [];
  }
}

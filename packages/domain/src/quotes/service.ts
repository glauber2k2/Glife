// Junta cache e provedores: devolve do cache o que tem menos de 30 min e busca o resto na fonte certa.
// Também guarda o histórico diário (cresce a cada cotação), a lista do mercado e o catálogo da busca.
// Reaproveitável por uma futura rotina agendada (alerta de preço).
import { rankMarket, searchCatalog } from './catalog.ts';
import {
  CATALOG_TTL_MS,
  LOOKUP_LIMIT,
  QUOTE_SOURCES,
  QUOTE_TTL_MS,
  brDate,
  keyOf,
  type LookupItem,
  type MarketItem,
  type MarketListCache,
  type MarketSort,
  type MarketType,
  type PriceHistoryStore,
  type PricePoint,
  type QuoteCache,
  type QuoteKey,
  type QuoteProvider,
  type QuoteResult,
  type QuoteSource,
} from './model.ts';

const fromLookup = (l: LookupItem): MarketItem => ({
  source: l.source,
  symbol: l.symbol,
  ticker: l.ticker,
  name: l.name,
  type: l.source === 'coingecko' ? 'crypto' : 'stock',
  priceE8: l.priceE8,
  changeDay: null,
  change30d: null,
  change1y: null,
  volume: null,
});

export class QuoteService {
  private readonly providers: Map<QuoteSource, QuoteProvider>;
  private readonly cache: QuoteCache;
  private readonly historyStore: PriceHistoryStore | null;
  private readonly lists: MarketListCache | null;
  private readonly now: () => Date;

  constructor(o: { providers: readonly QuoteProvider[]; cache: QuoteCache; history?: PriceHistoryStore; lists?: MarketListCache; now?: () => Date }) {
    this.providers = new Map(o.providers.map((p) => [p.source, p]));
    this.cache = o.cache;
    this.historyStore = o.history ?? null;
    this.lists = o.lists ?? null;
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
      // O preço de cada cotação nova vira o fechamento do dia: o histórico cresce de graça.
      if (this.historyStore)
        for (const q of r.quotes) await this.historyStore.put(q, [{ date: brDate(Date.parse(q.quotedAt)), closeE8: q.priceE8 }]);
      out.quotes.push(...r.quotes);
      out.errors.push(...r.errors);
    }
    return out;
  }

  async lookup(source: QuoteSource, query: string): Promise<LookupItem[]> {
    return (await this.providers.get(source)?.lookup(query)) ?? [];
  }

  /** Histórico diário: no máximo uma ida ao provedor por símbolo por dia; o guardado vence na mesma data. */
  async history(key: QuoteKey): Promise<PricePoint[]> {
    const store = this.historyStore;
    const provider = this.providers.get(key.source);
    if (!store) return (await provider?.history(key.symbol)) ?? [];
    const today = brDate(this.now().getTime());
    if (provider && !(await store.fetchedToday(key, today))) {
      const fetched = await provider.history(key.symbol);
      const kept = new Set((await store.get(key)).map((p) => p.date));
      const fresh = fetched.filter((p) => !kept.has(p.date));
      if (fresh.length) await store.put(key, fresh);
      await store.markFetched(key, today);
    }
    return store.get(key);
  }

  private async list(source: QuoteSource, maxAgeMs: number): Promise<MarketItem[] | null> {
    const cached = await this.lists?.get(source);
    if (cached && Date.parse(cached.fetchedAt) > this.now().getTime() - maxAgeMs) return cached.items;
    const provider = this.providers.get(source);
    if (!provider) return cached?.items ?? null;
    const items = await provider.market();
    if (!items.length) return cached?.items ?? null;
    await this.lists?.put(source, items);
    return items;
  }

  async market(source: QuoteSource, sort: MarketSort, type?: MarketType): Promise<MarketItem[]> {
    return rankMarket((await this.list(source, QUOTE_TTL_MS)) ?? [], sort, type);
  }

  /** Busca nos catálogos (até 24 h). Sem catálogo da B3: código exato; cripto fora do catálogo: busca da CoinGecko. */
  async search(query: string): Promise<MarketItem[]> {
    const out: MarketItem[] = [];
    for (const source of QUOTE_SOURCES) {
      const catalog = await this.list(source, CATALOG_TTL_MS);
      if (catalog && catalog.length) out.push(...searchCatalog(catalog, query));
      else if (source === 'brapi') out.push(...(await this.lookup('brapi', query)).map(fromLookup));
    }
    if (out.length < 3) {
      const seen = new Set(out.map(keyOf));
      out.push(...(await this.lookup('coingecko', query)).map(fromLookup).filter((m) => !seen.has(keyOf(m))));
    }
    return out.slice(0, LOOKUP_LIMIT);
  }
}

// Histórico, ranking e busca do mercado pela função `quotes`. Puro (sem React): os hooks só embrulham.
// Falha de rede nunca lança para a tela: vira estado (`offline`) e a tela segue com o que tem.
import { quoteSourceOf, type InvestmentAsset, type PriceBook } from '@glife/domain/finance';
import { SEARCH_MIN, keyOf, type MarketItem, type MarketSort, type MarketType, type PricePoint, type QuoteKey, type QuoteSource } from '@glife/domain/quotes';

export interface MarketClient {
  history(key: QuoteKey): Promise<PricePoint[]>;
  market(source: QuoteSource, sort: MarketSort, type?: MarketType): Promise<MarketItem[]>;
  search(query: string, types?: readonly MarketType[]): Promise<MarketItem[]>;
}

export type LoadStatus = 'idle' | 'loading' | 'ok' | 'empty' | 'offline';

/** Histórico dos ativos automáticos, um pedido por ativo na sessão (falha não fica guardada). */
export function createPriceBookLoader(client: MarketClient) {
  const cache = new Map<string, readonly PricePoint[]>();
  return {
    async load(assets: readonly InvestmentAsset[]): Promise<PriceBook> {
      const book = new Map<string, readonly PricePoint[]>();
      await Promise.all(
        assets.map(async (a) => {
          const source = quoteSourceOf(a.kind);
          if (!source || !a.quote_symbol) return;
          const key = { source, symbol: a.quote_symbol };
          let points = cache.get(keyOf(key));
          if (!points) {
            try {
              points = await client.history(key);
              cache.set(keyOf(key), points);
            } catch (e) {
              console.warn('Falha ao buscar o histórico', e);
              return;
            }
          }
          book.set(a.id, points);
        }),
      );
      return book;
    },
  };
}

export async function loadMarketRank(client: MarketClient, source: QuoteSource, sort: MarketSort, type?: MarketType): Promise<{ status: LoadStatus; items: MarketItem[] }> {
  try {
    const items = await client.market(source, sort, type);
    return { status: items.length ? 'ok' : 'empty', items };
  } catch {
    return { status: 'offline', items: [] };
  }
}

export const SEARCH_DELAY_MS = 250;

/** Busca enquanto digita: espera 250 ms parado, precisa de 2 letras e descarta respostas de buscas antigas. */
export function createSearchController(o: { client: MarketClient; onResult: (r: { status: LoadStatus; items: MarketItem[]; query: string }) => void; delayMs?: number; types?: readonly MarketType[] }) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let seq = 0;
  return {
    set(query: string) {
      const q = query.trim();
      const mine = ++seq;
      if (timer) clearTimeout(timer);
      if (q.length < SEARCH_MIN) {
        o.onResult({ status: 'idle', items: [], query: q });
        return;
      }
      o.onResult({ status: 'loading', items: [], query: q });
      timer = setTimeout(async () => {
        try {
          const items = await o.client.search(q, o.types);
          if (mine === seq) o.onResult({ status: items.length ? 'ok' : 'empty', items, query: q });
        } catch {
          if (mine === seq) o.onResult({ status: 'offline', items: [], query: q });
        }
      }, o.delayMs ?? SEARCH_DELAY_MS);
    },
    dispose() {
      seq++;
      if (timer) clearTimeout(timer);
    },
  };
}

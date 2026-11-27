// Decide quais ativos precisam de cotação nova e pede de uma vez. Puro (sem React): o hook só chama `refresh`
// ao abrir as telas. Uma futura notificação de alerta de preço pode chamar o mesmo `apply`.
import { parseTimestamp, quoteSourceOf, type InvestmentsSnapshot } from '@glife/domain/finance';
import { QUOTE_TTL_MS, keyOf, type LookupItem, type Quote, type QuoteKey, type QuoteResult, type QuoteSource } from '@glife/domain/quotes';

/** De onde vêm as cotações (a Edge Function `quotes` em produção). */
export interface QuoteClient {
  quotes(keys: readonly QuoteKey[]): Promise<QuoteResult>;
  lookup(source: QuoteSource, query: string): Promise<LookupItem[]>;
}

export interface QuoteRefresher {
  /** Pede as cotações vencidas (ou todas, com `force`). Devolve false se a busca falhou; nunca lança. */
  refresh(snapshot: InvestmentsSnapshot, force?: boolean): Promise<boolean>;
  /** Códigos que o provedor não encontrou (`keyOf`): a tela avisa e eles só são pedidos de novo ao forçar. */
  notFound(): ReadonlySet<string>;
}

export function createQuoteRefresher(deps: {
  client: QuoteClient;
  apply: (quotes: readonly Quote[]) => Promise<number>;
  now?: () => Date;
}): QuoteRefresher {
  const now = deps.now ?? (() => new Date());
  let inFlight: Promise<boolean> | null = null;
  const missing = new Set<string>();

  function due(snapshot: InvestmentsSnapshot, force: boolean): QuoteKey[] {
    const limit = now().getTime() - QUOTE_TTL_MS;
    const keys = new Map<string, QuoteKey>();
    for (const a of snapshot.assets) {
      const source = quoteSourceOf(a.kind);
      if (!source || a.quote_symbol === null) continue;
      if (!force && a.last_price_at !== null && parseTimestamp(a.last_price_at) > limit) continue;
      const key = { source, symbol: a.quote_symbol };
      if (!force && missing.has(keyOf(key))) continue;
      keys.set(keyOf(key), key);
    }
    return [...keys.values()];
  }

  async function run(keys: QuoteKey[]): Promise<boolean> {
    try {
      const result = await deps.client.quotes(keys);
      for (const e of result.errors) if (e.reason === 'not_found') missing.add(keyOf(e));
      for (const q of result.quotes) missing.delete(keyOf(q));
      if (result.quotes.length) await deps.apply(result.quotes);
      return true;
    } catch (e) {
      console.warn('Falha ao atualizar as cotações', e);
      return false;
    }
  }

  return {
    refresh(snapshot, force = false) {
      if (inFlight) return inFlight;
      const keys = due(snapshot, force);
      if (!keys.length) return Promise.resolve(true);
      inFlight = run(keys).finally(() => {
        inFlight = null;
      });
      return inFlight;
    },
    notFound: () => new Set(missing),
  };
}

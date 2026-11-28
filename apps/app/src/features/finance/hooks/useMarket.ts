// Hooks finos sobre `marketData`: histórico dos ativos, ranking do mercado, busca enquanto digita e metas.
import type { InvestmentAsset, PriceBook, Targets } from '@glife/domain/finance';
import type { MarketItem, MarketSort, MarketType, QuoteSource } from '@glife/domain/quotes';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createSearchController, loadMarketRank, type LoadStatus } from '../data/marketData';
import { useFinance } from './FinanceData';

const EMPTY: PriceBook = new Map();

/** Histórico diário dos ativos automáticos (um pedido por ativo na sessão). */
export function usePriceBook(assets: readonly InvestmentAsset[] | null): { book: PriceBook; loading: boolean } {
  const { priceBook } = useFinance();
  const [state, setState] = useState<{ key: string; book: PriceBook } | null>(null);
  const key = (assets ?? []).map((a) => `${a.id}:${a.quote_symbol ?? ''}`).join('|');
  const latest = useRef(assets);
  // Antes do efeito de busca (mesma ordem de declaração): ele lê a lista mais nova.
  useEffect(() => {
    latest.current = assets;
  }, [assets]);
  useEffect(() => {
    if (!latest.current) return;
    let active = true;
    void priceBook.load(latest.current).then((book) => active && setState({ key, book }));
    return () => {
      active = false;
    };
  }, [key, priceBook]);
  return { book: state?.key === key ? state.book : (state?.book ?? EMPTY), loading: state?.key !== key };
}

export function useMarketRank(source: QuoteSource, sort: MarketSort, type?: MarketType): { items: MarketItem[]; status: LoadStatus } {
  const { quotes } = useFinance();
  const [state, setState] = useState<{ id: string; items: MarketItem[]; status: LoadStatus } | null>(null);
  const id = `${source}:${sort}:${type ?? ''}`;
  useEffect(() => {
    let active = true;
    void loadMarketRank(quotes, source, sort, type).then((r) => active && setState({ id, ...r }));
    return () => {
      active = false;
    };
  }, [quotes, source, sort, type, id]);
  return state?.id === id ? state : { items: state?.items ?? [], status: 'loading' };
}

export function useSymbolSearch(query: string, types?: readonly MarketType[]): { items: MarketItem[]; status: LoadStatus } {
  const { quotes } = useFinance();
  const [result, setResult] = useState<{ items: MarketItem[]; status: LoadStatus }>({ items: [], status: 'idle' });
  const typesKey = (types ?? []).join(',');
  const controller = useMemo(
    () => createSearchController({ client: quotes, types: typesKey ? (typesKey.split(',') as MarketType[]) : undefined, onResult: (r) => setResult({ items: r.items, status: r.status }) }),
    [quotes, typesKey],
  );
  useEffect(() => () => controller.dispose(), [controller]);
  useEffect(() => controller.set(query), [controller, query]);
  return result;
}

export function useTargets(targets: Targets | null): { targets: Targets | null; save: (t: Targets) => Promise<void> } {
  const { repos } = useFinance();
  const save = useCallback(async (t: Targets) => {
    await repos.investments.setTargets(t);
  }, [repos]);
  return { targets, save };
}

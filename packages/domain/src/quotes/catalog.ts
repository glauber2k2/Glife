// Busca e ranking sobre a lista do mercado. Puro: o mesmo código roda na Edge Function e nos testes.
import { LOOKUP_LIMIT, MARKET_LIMIT, MARKET_MIN_VOLUME, SEARCH_MIN, type MarketItem, type MarketSort, type MarketType } from './model.ts';

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** 0 código começa com · 1 nome começa com · 2 palavra do nome começa com · 3 contém · null não casa. */
function score(item: MarketItem, q: string): number | null {
  const ticker = norm(item.ticker);
  const name = norm(item.name);
  if (ticker.startsWith(q)) return 0;
  if (name.startsWith(q)) return 1;
  if (name.split(/[^a-z0-9]+/).some((w) => w.startsWith(q))) return 2;
  if (ticker.includes(q) || name.includes(q)) return 3;
  return null;
}

/** Até `limit` itens que casam com `q` (sem acento, sem caixa); empate mantém a ordem do catálogo. */
export function searchCatalog(items: readonly MarketItem[], query: string, limit = LOOKUP_LIMIT): MarketItem[] {
  const q = norm(query.trim());
  if (q.length < SEARCH_MIN) return [];
  return items
    .map((item, i) => ({ item, i, s: score(item, q) }))
    .filter((x): x is { item: MarketItem; i: number; s: number } => x.s !== null)
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.item);
}

const FIELD: Record<MarketSort, { get: (m: MarketItem) => number | null; dir: 1 | -1 }> = {
  up_day: { get: (m) => m.changeDay, dir: -1 },
  down_day: { get: (m) => m.changeDay, dir: 1 },
  volume: { get: (m) => m.volume, dir: -1 },
  up_30d: { get: (m) => m.change30d, dir: -1 },
  up_1y: { get: (m) => m.change1y, dir: -1 },
};

/** Ranking do mercado: tira papéis sem negócio (volume < 100.000, quando informado) e devolve até 10. */
export function rankMarket(items: readonly MarketItem[], sort: MarketSort, type?: MarketType): MarketItem[] {
  const f = FIELD[sort];
  return items
    .filter((m) => (type ? m.type === type : true))
    .filter((m) => m.volume === null || m.volume >= MARKET_MIN_VOLUME)
    .filter((m) => f.get(m) !== null)
    .sort((a, b) => f.dir * (f.get(a)! - f.get(b)!))
    .slice(0, MARKET_LIMIT);
}

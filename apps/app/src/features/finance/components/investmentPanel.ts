// Regras puras do painel de Investimentos: ordenação da lista, formulário de metas e o que o ranking do mercado pede.
import { ALLOCATION_GROUPS, targetsSchema, targetsSum, type AllocationGroup, type PositionedAsset, type Targets } from '@glife/domain/finance';
import type { MarketSort, MarketType, QuoteSource } from '@glife/domain/quotes';

export type AssetSort = 'value' | 'result' | 'name';
export const ASSET_SORTS: readonly { value: AssetSort; label: string }[] = [
  { value: 'value', label: 'Valor' },
  { value: 'result', label: 'Resultado' },
  { value: 'name', label: 'Nome' },
];

export function sortAssets(list: readonly PositionedAsset[], sort: AssetSort): PositionedAsset[] {
  const byName = (a: PositionedAsset, b: PositionedAsset) => a.asset.name.localeCompare(b.asset.name, 'pt-BR', { sensitivity: 'base' });
  return [...list].sort(
    sort === 'value' ? (a, b) => b.position.current - a.position.current || byName(a, b) : sort === 'result' ? (a, b) => b.position.pct - a.position.pct || byName(a, b) : byName,
  );
}

export type TargetsForm = Record<AllocationGroup, string>;

export function targetsToForm(t: Targets | null): TargetsForm {
  return Object.fromEntries(ALLOCATION_GROUPS.map((g) => [g, t ? String(t[g]) : ''])) as TargetsForm;
}

/** Soma ao vivo (campos vazios valem 0) e as metas válidas, ou null se não forem inteiros 0–100 que somam 100. */
export function readTargetsForm(form: TargetsForm): { sum: number; targets: Targets | null } {
  const values = Object.fromEntries(ALLOCATION_GROUPS.map((g) => [g, form[g].trim() === '' ? 0 : Number(form[g].trim().replace(',', '.'))])) as Targets;
  const sum = targetsSum(values);
  const parsed = targetsSchema.safeParse(values);
  return { sum: Number.isFinite(sum) ? Math.round(sum * 100) / 100 : 0, targets: parsed.success ? (parsed.data as Targets) : null };
}

export type MarketMetric = 'up_day' | 'down_day' | 'volume' | 'up_30d' | 'up_1y';
export const MARKET_METRICS: readonly { value: MarketMetric; label: string }[] = [
  { value: 'up_day', label: 'Altas hoje' },
  { value: 'down_day', label: 'Quedas hoje' },
  { value: 'volume', label: 'Mais negociadas' },
  { value: 'up_30d', label: 'Cripto 30 dias' },
  { value: 'up_1y', label: 'Cripto 1 ano' },
];
export const MARKET_TYPES_UI: readonly { value: MarketType; label: string }[] = [
  { value: 'stock', label: 'Ações' },
  { value: 'reit', label: 'FIIs' },
  { value: 'crypto', label: 'Cripto' },
];

/** O plano grátis só tem variação de 30 dias e 1 ano em cripto (CoinGecko); ações e FIIs vêm da lista da B3. */
export function marketQuery(metric: MarketMetric, type: MarketType): { source: QuoteSource; sort: MarketSort; type: MarketType } {
  if (metric === 'up_30d' || metric === 'up_1y') return { source: 'coingecko', sort: metric, type: 'crypto' };
  return { source: type === 'crypto' ? 'coingecko' : 'brapi', sort: metric, type };
}

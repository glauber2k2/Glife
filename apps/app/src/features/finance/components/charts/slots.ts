// Do domínio para o que os gráficos desenham: grupos de barras com rótulos, etiqueta do toque e descrição para o
// leitor de tela. Funções puras (testáveis sem React).
import {
  NO_CATEGORY,
  OTHER_CATEGORIES,
  monthBuckets,
  monthOf,
  weekBuckets,
  type Category,
  type CategorySlice,
  type ChartEntry,
  type ChartPeriod,
  type FlowBucket,
  type IsoDate,
} from '@glife/domain/finance';

import type { MoneyFormat } from '../format';
import { monthAbbr, monthLong, monthLower, outflow } from './chartFormat';
import type { BarSlot } from './BarChart';

const title = (b: FlowBucket) => (b.days ? `${b.days.from} a ${b.days.to} de ${monthLower(b.month)}` : monthLong(b.month));
const isCurrent = (b: FlowBucket, today: IsoDate) => {
  if (b.month !== monthOf(today)) return false;
  if (!b.days) return true;
  const d = Number(today.slice(8, 10));
  return d >= b.days.from && d <= b.days.to;
};
const isEmpty = (b: FlowBucket) => b.income.confirmed + b.income.planned + b.expense.confirmed + b.expense.planned === 0;

/** Grupos de Entradas e saídas: semanas no modo Mês, meses nos outros. */
export function flowBuckets(entries: readonly ChartEntry[], period: ChartPeriod): FlowBucket[] {
  return period.mode === 'month' ? weekBuckets(entries, period.anchor) : monthBuckets(entries, period.months);
}

export function flowSlots(buckets: readonly FlowBucket[], today: IsoDate, fmt: MoneyFormat): BarSlot[] {
  return buckets.map((b) => ({
    key: b.key,
    axis: b.days ? `${b.days.from}–${b.days.to}` : monthAbbr(b.month),
    title: title(b),
    value: isEmpty(b) ? 'Sem lançamentos' : `${fmt.signed(b.income.confirmed)}  ·  ${outflow(b.expense.confirmed, fmt)}`,
    current: isCurrent(b, today),
    bars: [
      { kind: 'outline', value: b.income },
      { kind: 'fill', value: b.expense },
    ],
  }));
}

/** Barras de gasto da categoria por mês (uma barra preenchida). */
export function expenseSlots(buckets: readonly FlowBucket[], current: string, fmt: MoneyFormat): BarSlot[] {
  return buckets.map((b) => ({
    key: b.key,
    axis: monthAbbr(b.month),
    title: monthLong(b.month),
    value:
      b.expense.confirmed + b.expense.planned === 0
        ? 'Sem lançamentos'
        : `${fmt.money(b.expense.confirmed)}${b.expense.planned > 0 ? ` + ${fmt.money(b.expense.planned)} previsto` : ''}`,
    current: b.month === current,
    bars: [{ kind: 'fill', value: b.expense }],
  }));
}

/** "Entradas e saídas, junho a novembro de 2026. Novembro de 2026: entradas …, saídas …; previsto: …." */
export function flowAria(chart: string, period: string, buckets: readonly FlowBucket[], pair: boolean, fmt: MoneyFormat): string {
  const { money } = fmt;
  const say = (b: FlowBucket) => {
    const name = title(b).charAt(0).toUpperCase() + title(b).slice(1);
    if (isEmpty(b)) return `${name}: sem lançamentos`;
    if (!pair) return `${name}: ${money(b.expense.confirmed)}${b.expense.planned > 0 ? `, mais ${money(b.expense.planned)} previsto` : ''}`;
    const planned = b.income.planned + b.expense.planned > 0;
    return `${name}: entradas ${money(b.income.confirmed)}, saídas ${money(b.expense.confirmed)}${
      planned ? `; previsto: entradas ${money(b.income.planned)}, saídas ${money(b.expense.planned)}` : ''
    }`;
  };
  return `${chart}, ${period.charAt(0).toLowerCase()}${period.slice(1)}. ${buckets.map(say).join('. ')}.`;
}

/** Nome da linha de "Para onde foi" e, em Outras, as categorias que ela soma. */
export function sliceName(slice: Pick<CategorySlice, 'key'>, categories: ReadonlyMap<string, Category>): string {
  if (slice.key === OTHER_CATEGORIES) return 'Outras';
  if (slice.key === NO_CATEGORY) return 'Sem categoria';
  return categories.get(slice.key)?.name ?? 'Categoria excluída';
}

export function categoryNames(ids: readonly (string | null)[], categories: ReadonlyMap<string, Category>): string[] {
  return ids.map((id) => (id === null ? 'Sem categoria' : (categories.get(id)?.name ?? 'Categoria excluída')));
}

/** "Mercado, Lazer e mais 3" */
export function namesSummary(names: readonly string[]): string {
  const more = names.length - 2;
  return `${names.slice(0, 2).join(', ')}${more > 0 ? ` e mais ${more}` : ''}`;
}

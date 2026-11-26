// Textos dos gráficos de Finanças: rótulos de mês e período, valores curtos da linha de referência e percentuais.
// Sem Intl, para dar o mesmo resultado no Android e no web.
import { addMonths, type ChartMode, type ChartPeriod, type IsoDate, type Month } from '@glife/domain/finance';

import { MONTH_NAMES, type MoneyFormat } from '../format';

const MINUS = '−';
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const year = (m: Month) => m.slice(0, 4);
const nameOf = (m: Month) => MONTH_NAMES[Number(m.slice(5, 7)) - 1]!;

export const MODE_OPTIONS: readonly { value: ChartMode; label: string }[] = [
  { value: 'month', label: 'Mês' },
  { value: '6m', label: '6 meses' },
  { value: '12m', label: '12 meses' },
];
export const MODE_SHORT: Record<ChartMode, string> = { month: 'Mês', '6m': '6 meses', '12m': '12 meses' };

/** "jun" */
export const monthAbbr = (m: Month) => nameOf(m).slice(0, 3);
/** "Junho de 2026" */
export const monthLong = (m: Month) => `${cap(nameOf(m))} de ${year(m)}`;
/** "Novembro 2026" (entre as setas) */
export const monthTitle = (m: Month) => `${cap(nameOf(m))} ${year(m)}`;
/** "novembro" */
export const monthLower = (m: Month) => nameOf(m);

/** "Junho a novembro de 2026" · "Dezembro de 2025 a novembro de 2026" · "Novembro de 2026". */
export function periodLabel(p: ChartPeriod): string {
  if (p.mode === 'month') return monthLong(p.anchor);
  const first = p.months[0]!;
  const last = p.anchor;
  return year(first) === year(last)
    ? `${cap(nameOf(first))} a ${nameOf(last)} de ${year(last)}`
    : `${cap(nameOf(first))} de ${year(first)} a ${nameOf(last)} de ${year(last)}`;
}

/** Período anterior em minúsculas para a comparação: "dezembro a maio" · "outubro". */
export function previousLabel(p: ChartPeriod): string | null {
  if (!p.previous) return null;
  const first = p.previous[0]!;
  const last = p.previous[p.previous.length - 1]!;
  return first === last ? nameOf(first) : `${nameOf(first)} a ${nameOf(last)}`;
}

/** Valor curto da linha de referência: "R$ 500" · "R$ 10 mil" · "R$ 1,5 mi". */
export function compactMoney(cents: number): string {
  const reais = Math.abs(cents) / 100;
  const one = (v: number) => {
    const r = Math.round(v * 10) / 10;
    return Number.isInteger(r) ? String(r) : r.toFixed(1).replace('.', ',');
  };
  if (reais >= 1e6) return `R$ ${one(reais / 1e6)} mi`;
  if (reais >= 1e3) return `R$ ${one(reais / 1e3)} mil`;
  return `R$ ${Math.round(reais)}`;
}

/** "43%" · "<1%" */
export const sharePct = (share: number) => (share > 0 && share < 0.005 ? '<1%' : `${Math.round(share * 100)}%`);

/** "+12,3%" · "−4,0%" */
export function signedPct(ratio: number): string {
  const v = (Math.round(Math.abs(ratio) * 1000) / 10).toFixed(1).replace('.', ',');
  return `${ratio < -0.00005 ? MINUS : '+'}${v}%`;
}

/** "− R$ 19,90" sempre com sinal de saída (estorno, que é negativo, vira "+"). */
export const outflow = (cents: number, fmt: MoneyFormat) => (cents < 0 ? `+ ${fmt.money(cents)}` : `${MINUS} ${fmt.money(cents)}`);

/** Rótulos do eixo: todos até 3 grupos; acima disso, primeiro, meio e último. */
export function axisIndices(n: number): Set<number> {
  if (n <= 3) return new Set(Array.from({ length: n }, (_, i) => i));
  return new Set([0, Math.floor((n - 1) / 2), n - 1]);
}

/** Último mês navegável no modo Mês e o anterior ao primeiro lançamento (a seta da esquerda para ali). */
export function monthBounds(first: Month | null, current: Month): { min: Month; max: Month } {
  return { min: first ? addMonths(first, -1) : current, max: current };
}

/** "dd/mm" */
export const dayMonth = (d: IsoDate) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

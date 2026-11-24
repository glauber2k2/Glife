// Datas de calendário do Glife: texto `YYYY-MM-DD` e meses `YYYY-MM`, sem fuso horário.
// Aritmética só com números (ano, mês, dia) para não depender do fuso do aparelho.
import { z } from 'zod';

/** Data de calendário `YYYY-MM-DD`. */
export type IsoDate = string;
/** Mês `YYYY-MM`. */
export type Month = string;

const pad = (n: number, size = 2) => String(n).padStart(size, '0');

export function daysInMonth(year: number, month: number): number {
  return [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
    month - 1
  ]!;
}

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATE_RE = /^(\d{4})-(0[1-9]|1[0-2])-(\d{2})$/;

export const monthSchema = z.string().regex(MONTH_RE, 'Mês inválido');
export const isoDateSchema = z.string().refine((s) => {
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const day = Number(m[3]);
  return day >= 1 && day <= daysInMonth(Number(m[1]), Number(m[2]));
}, 'Data inválida');

function parseMonth(month: Month): [number, number] {
  const m = MONTH_RE.exec(month);
  if (!m) throw new RangeError('Mês inválido');
  return [Number(m[1]), Number(m[2])];
}

function parseDate(date: IsoDate): [number, number, number] {
  if (!isoDateSchema.safeParse(date).success) throw new RangeError('Data inválida');
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return [y, m, d];
}

export function monthOf(date: IsoDate): Month {
  return date.slice(0, 7);
}

export function addMonths(month: Month, n: number): Month {
  const [y, m] = parseMonth(month);
  const index = y * 12 + (m - 1) + n;
  return `${pad(Math.floor(index / 12), 4)}-${pad((index % 12) + 1)}`;
}

/** Dia `day` do mês; dia inexistente (29–31) vira o último dia do mês. */
export function dateInMonth(month: Month, day: number): IsoDate {
  const [y, m] = parseMonth(month);
  return `${month}-${pad(Math.min(day, daysInMonth(y, m)))}`;
}

export function addDays(date: IsoDate, n: number): IsoDate {
  let [y, m, d] = parseDate(date);
  d += n;
  while (d > daysInMonth(y, m)) {
    d -= daysInMonth(y, m);
    [y, m] = m === 12 ? [y + 1, 1] : [y, m + 1];
  }
  while (d < 1) {
    [y, m] = m === 1 ? [y - 1, 12] : [y, m - 1];
    d += daysInMonth(y, m);
  }
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}

/** Negativo se `a` vem antes de `b`, 0 se iguais, positivo se depois (formato fixo permite comparar texto). */
export function compareDates(a: IsoDate, b: IsoDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Data de calendário de um instante ISO no fuso local do aparelho. */
export function localDateOf(iso: string): IsoDate {
  const t = new Date(iso);
  return `${pad(t.getFullYear(), 4)}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}

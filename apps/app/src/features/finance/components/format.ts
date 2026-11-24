// Textos de dinheiro e datas das telas de Finanças (pt-BR, sem Intl para dar o mesmo resultado no Android e no web).
import { formatBRL, localDateOf, monthOf, type IsoDate, type Month } from '@glife/domain/finance';

export const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'] as const;
const WEEKDAYS_LONG = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'] as const;
const MINUS = '−';

/** "R$ 1.234,56" (sem sinal). */
export const money = (cents: number) => formatBRL(Math.abs(cents));

/** "+ R$ 50,00" · "− R$ 19,90" · "R$ 0,00". */
export function signed(cents: number): string {
  if (cents === 0) return money(0);
  return `${cents < 0 ? MINUS : '+'} ${money(cents)}`;
}

/** Saldo que pode ser negativo: "R$ 10,00" · "− R$ 10,00". */
export const balance = (cents: number) => (cents < 0 ? `${MINUS} ${money(cents)}` : money(cents));

/** Só os dígitos do que foi digitado, lidos como centavos ("23990" → 23990). */
export function digitsToCents(text: string): number {
  const digits = text.replace(/\D/g, '').replace(/^0+/, '').slice(0, 11);
  return digits ? Number(digits) : 0;
}

/** Valor digitado com sinal opcional ("-1.000,00" → −100000). */
export function signedDigitsToCents(text: string): number {
  const t = text.trim();
  const negative = t.startsWith('-') || t.startsWith(MINUS);
  const v = digitsToCents(t);
  return negative ? -v : v;
}

/** Data de hoje no fuso do aparelho. */
export const todayIso = (now: Date = new Date()): IsoDate => localDateOf(now.toISOString())!;

/** "08/12". */
export const dm = (d: IsoDate) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
/** "08/12/2026". */
export const dmy = (d: IsoDate) => `${dm(d)}/${d.slice(0, 4)}`;

/** "08/12/2026" → "2026-12-08" (data inexistente → null). */
export function parseDmy(text: string): IsoDate | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const iso = `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`;
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime()) || localDateOf(d.toISOString()) !== iso) return null;
  return iso;
}

const weekdayIndex = (d: IsoDate) => new Date(`${d}T12:00:00`).getDay();
/** "quinta". */
export const weekday = (d: IsoDate) => WEEKDAYS[weekdayIndex(d)]!;

/** "Quinta-feira, 10 de dezembro". */
export const longDay = (d: IsoDate) =>
  `${WEEKDAYS_LONG[weekdayIndex(d)]}, ${Number(d.slice(8, 10))} de ${MONTH_NAMES[Number(d.slice(5, 7)) - 1]}`;

export const monthIndexOf = (month: Month) => Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1;

/** "dezembro"; a mais de 11 meses de hoje, "dezembro de 2028". */
export function monthName(month: Month, today: IsoDate): string {
  const name = MONTH_NAMES[Number(month.slice(5, 7)) - 1]!;
  return Math.abs(monthIndexOf(month) - monthIndexOf(monthOf(today))) > 11 ? `${name} de ${month.slice(0, 4)}` : name;
}

/** Três letras do mês ("dez") a partir da data. */
export const monthShort = (d: IsoDate) => MONTH_NAMES[Number(d.slice(5, 7)) - 1]!.slice(0, 3);

export const daysBetween = (a: IsoDate, b: IsoDate) =>
  Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

/** "Hoje, 10/12" · "Ontem, 09/12" · "Amanhã, 11/12" · "08/12/2026". */
export function dayLabel(d: IsoDate, today: IsoDate): string {
  const diff = daysBetween(today, d);
  if (diff === 0) return `Hoje, ${dm(d)}`;
  if (diff === -1) return `Ontem, ${dm(d)}`;
  if (diff === 1) return `Amanhã, ${dm(d)}`;
  return d.slice(0, 4) === today.slice(0, 4) ? dm(d) : dmy(d);
}

/** "há 1 dia" · "há 3 dias". */
export const lateText = (d: IsoDate, today: IsoDate) => {
  const n = daysBetween(d, today);
  return `Atrasado há ${n} ${n === 1 ? 'dia' : 'dias'}`;
};

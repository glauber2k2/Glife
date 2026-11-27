// Contas dos planos usadas pelas telas (puras): ritmo, data de início, data curta, cor e dias da semana.
import { addDays, weekdayOf, type IsoDate } from '@glife/domain/time';

import { planHues } from '@/shared/ui/theme/tokens';

/** "≈ 3 cap./dia", "1 cap./dia" ou "1 cap. a cada 3 dias". */
export function paceLabel(chapters: number, days: number): string {
  const per = chapters / Math.max(1, days);
  if (per < 1) return `1 cap. a cada ${Math.round(1 / per)} dias`;
  const half = Math.round(per * 2) / 2;
  if (per === 1) return '1 cap./dia';
  return `≈ ${String(half).replace('.', ',')} cap./dia`;
}

export type StartOption = 'today' | 'tomorrow' | 'monday';

export function startDate(option: StartOption, today: IsoDate): IsoDate {
  if (option === 'today') return today;
  if (option === 'tomorrow') return addDays(today, 1);
  const wd = weekdayOf(today);
  return addDays(today, wd === 1 ? 7 : (8 - wd) % 7 || 7);
}

const MONTHS = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
/** "26 de dez." */
export function shortDate(d: IsoDate): string {
  return `${Number(d.slice(8, 10))} de ${MONTHS[Number(d.slice(5, 7)) - 1]}`;
}

/** Primeira cor da paleta de planos que nenhum plano ativo usa; todas usadas, volta à primeira. */
export function nextHue(used: readonly number[]): number {
  return planHues.find((h) => !used.includes(h)) ?? planHues[0];
}

export const weekdaysToMask = (days: readonly number[]): number => days.reduce((m, d) => m | (1 << d), 0);
export const maskToWeekdays = (mask: number): number[] => Array.from({ length: 7 }, (_, d) => d).filter((d) => (mask & (1 << d)) !== 0);

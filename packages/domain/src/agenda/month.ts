// Calendário do mês: a grade de semanas inteiras e os pontos (um por módulo) de cada dia. Funções puras.
import { addDays, daysInMonth, weekdayOf, type IsoDate } from '../time/index.ts';

/** "AAAA-MM". */
export type YearMonth = string;
/**
 * Módulos que marcam o dia no calendário. Só compromissos: o plano da dieta vale para todo dia e marcaria até o
 * dia livre.
 */
export type DayDotModule = 'agenda' | 'reminders';

/** Uma coisa que acontece num dia: evento ou lembrete. */
export interface DayOccurrence {
  date: IsoDate;
  module: DayDotModule;
}

export interface MonthCell {
  date: IsoDate;
  inMonth: boolean;
}

const DOT_ORDER: readonly DayDotModule[] = ['agenda', 'reminders'];

/** Todos os dias do mês, completados com os vizinhos até fechar semanas inteiras (35 ou 42 células). */
export function monthGrid(month: YearMonth, weekStartsOn: 0 | 1 = 0): MonthCell[] {
  const year = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  const first: IsoDate = `${month}-01`;
  const lead = (weekdayOf(first) - weekStartsOn + 7) % 7;
  const total = Math.ceil((lead + daysInMonth(year, m)) / 7) * 7;
  const start = addDays(first, -lead);
  return Array.from({ length: total }, (_, i) => {
    const date = addDays(start, i);
    return { date, inMonth: date.startsWith(month) };
  });
}

/** Mês vizinho: `by` = -1 (anterior) ou 1 (seguinte); aceita qualquer inteiro. */
export function shiftMonth(month: YearMonth, by: number): YearMonth {
  const idx = Number(month.slice(0, 4)) * 12 + (Number(month.slice(5, 7)) - 1) + by;
  return `${String(Math.floor(idx / 12)).padStart(4, '0')}-${String((idx % 12) + 1).padStart(2, '0')}`;
}

/** Pontos do dia: um por módulo que tem algo nele, na ordem agenda, lembrete. */
export function dayDots(date: IsoDate, occurrences: readonly DayOccurrence[]): DayDotModule[] {
  const has = new Set(occurrences.filter((o) => o.date === date).map((o) => o.module));
  return DOT_ORDER.filter((k) => has.has(k));
}

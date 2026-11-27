// Totais do dia (kcal e macros) e o histórico da dieta (Semana/Mês): kcal por dia, refeições feitas e planejadas,
// média e aderência ao plano. Funções puras.
import { addDays, daysInMonth, weekdayOf, type IsoDate } from '../time/index.ts';
import type { MealLog, MealPlanItem } from './model.ts';
import { dietDay } from './schedule.ts';

export interface NutritionTotals {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

const alive = <T extends { deleted_at: string | null }>(r: T) => r.deleted_at === null;
/** Uma casa decimal (como no banco), sem resto de ponto flutuante. */
const oneDecimal = (n: number) => Math.round(n * 10) / 10;

/** Soma do que foi informado nos registros (campo vazio conta 0; excluídos ficam de fora). */
export function dayTotals(meals: readonly MealLog[]): NutritionTotals {
  const t = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  for (const m of meals.filter(alive)) {
    t.kcal += m.kcal ?? 0;
    t.protein_g += m.protein_g ?? 0;
    t.carbs_g += m.carbs_g ?? 0;
    t.fat_g += m.fat_g ?? 0;
  }
  return { kcal: t.kcal, protein_g: oneDecimal(t.protein_g), carbs_g: oneDecimal(t.carbs_g), fat_g: oneDecimal(t.fat_g) };
}

export type HistoryRange = 'week' | 'month';

export interface HistoryDay {
  date: IsoDate;
  kcal: number;
  /** registros do dia (com ou sem kcal) */
  logged: number;
  /** algum registro do dia tem kcal informada (só esses entram na média) */
  hasKcal: boolean;
  /** refeições do plano registradas / previstas no dia */
  done: number;
  planned: number;
  today: boolean;
  future: boolean;
}

export interface DietHistory {
  from: IsoDate;
  to: IsoDate;
  days: HistoryDay[];
  /** média de kcal dos dias com kcal registrada (null = nenhum) */
  averageKcal: number | null;
  /** 0 a 1: refeições do plano feitas sobre as previstas, só nos dias passados com plano (null = nenhum) */
  adherence: number | null;
  /** dias (até hoje) com pelo menos um registro */
  loggedDays: number;
}

/** Período que contém `today`: semana de segunda a domingo ou o mês inteiro. */
export function historyBounds(range: HistoryRange, today: IsoDate): { from: IsoDate; to: IsoDate } {
  if (range === 'week') {
    const from = addDays(today, -((weekdayOf(today) + 6) % 7));
    return { from, to: addDays(from, 6) };
  }
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  return { from: `${today.slice(0, 7)}-01`, to: `${today.slice(0, 7)}-${String(daysInMonth(y, m)).padStart(2, '0')}` };
}

export function history(meals: readonly MealLog[], plans: readonly MealPlanItem[], range: HistoryRange, today: IsoDate): DietHistory {
  const { from, to } = historyBounds(range, today);
  const logs = meals.filter((m) => alive(m) && m.date >= from && m.date <= to);
  const days: HistoryDay[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const dayLogs = logs.filter((l) => l.date === date);
    // Refeição criada depois do dia não contava no plano daquele dia (data de criação em UTC: aproximação).
    const plan = plans.filter((p) => p.created_at.slice(0, 10) <= date);
    const entries = dietDay(plan, dayLogs, date).filter((e) => e.plan);
    days.push({
      date,
      kcal: dayTotals(dayLogs).kcal,
      logged: dayLogs.length,
      hasKcal: dayLogs.some((l) => l.kcal !== null),
      done: entries.filter((e) => e.log).length,
      planned: entries.length,
      today: date === today,
      future: date > today,
    });
  }
  const counted = days.filter((d) => !d.future && d.hasKcal);
  const past = days.filter((d) => d.date < today && d.planned > 0);
  const planned = past.reduce((n, d) => n + d.planned, 0);
  return {
    from,
    to,
    days,
    averageKcal: counted.length ? Math.round(counted.reduce((n, d) => n + d.kcal, 0) / counted.length) : null,
    adherence: planned ? past.reduce((n, d) => n + d.done, 0) / planned : null,
    loggedDays: days.filter((d) => !d.future && d.logged > 0).length,
  };
}

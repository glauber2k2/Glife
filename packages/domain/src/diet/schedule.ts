// O dia da dieta (o que o plano pede hoje e o que já foi registrado), a próxima refeição (bloco de Hoje) e os avisos
// das refeições do plano. Funções puras.
import { addDays, hasWeekday, weekdayOf, type IsoDate, type LocalTime, type ScheduledNotice } from '../time/index.ts';
import type { MealLog, MealPlanItem } from './model.ts';

const alive = <T extends { deleted_at: string | null }>(r: T) => r.deleted_at === null;
const byTime = <T extends { time: LocalTime; id: string }>(a: T, b: T) => (a.time !== b.time ? (a.time < b.time ? -1 : 1) : a.id < b.id ? -1 : 1);

/** Refeições do plano que valem nesta data, por horário. */
export function planFor(items: readonly MealPlanItem[], date: IsoDate): MealPlanItem[] {
  const wd = weekdayOf(date);
  return items.filter((i) => alive(i) && hasWeekday(i.weekdays, wd)).sort(byTime);
}

export interface DietDayEntry {
  /** refeição do plano (null = registro fora do plano) */
  plan: MealPlanItem | null;
  /** registro do que foi comido (null = ainda não registrado) */
  log: MealLog | null;
  time: LocalTime;
}

/** O dia: cada refeição do plano com o seu registro (o primeiro ligado a ela) e os registros fora do plano. */
export function dietDay(items: readonly MealPlanItem[], logs: readonly MealLog[], date: IsoDate): DietDayEntry[] {
  const dayLogs = logs.filter((l) => alive(l) && l.date === date).sort(byTime);
  const used = new Set<string>();
  const entries: DietDayEntry[] = planFor(items, date).map((plan) => {
    const log = dayLogs.find((l) => l.plan_id === plan.id && !used.has(l.id)) ?? null;
    if (log) used.add(log.id);
    return { plan, log, time: plan.time };
  });
  for (const log of dayLogs.filter((l) => !used.has(l.id))) entries.push({ plan: null, log, time: log.time });
  return entries.sort((a, b) => (a.time !== b.time ? (a.time < b.time ? -1 : 1) : 0));
}

export interface NextMeal {
  item: MealPlanItem;
  date: IsoDate;
}

/**
 * Próxima refeição do plano ainda não registrada: hoje, a partir de agora (com `graceMinutes` de tolerância para a
 * que acabou de passar); se hoje não tiver mais, a primeira dos próximos dias.
 */
export function nextMeal(items: readonly MealPlanItem[], logs: readonly MealLog[], now: { date: IsoDate; time: LocalTime }, graceMinutes = 30): NextMeal | null {
  const [h, m] = now.time.split(':').map(Number) as [number, number];
  const back = Math.max(0, h * 60 + m - graceMinutes);
  const from = `${String(Math.floor(back / 60)).padStart(2, '0')}:${String(back % 60).padStart(2, '0')}`;
  const today = dietDay(items, logs, now.date).find((e) => e.plan && !e.log && e.time >= from);
  if (today?.plan) return { item: today.plan, date: now.date };
  for (let i = 1; i <= 7; i++) {
    const date = addDays(now.date, i);
    const first = planFor(items, date)[0];
    if (first) return { item: first, date };
  }
  return null;
}

/** Avisos das refeições com aviso ligado, de hoje até `days` dias à frente. */
export function dietNotices(items: readonly MealPlanItem[], today: IsoDate, days: number): ScheduledNotice[] {
  const out: ScheduledNotice[] = [];
  for (let i = 0; i <= days; i++) {
    const date = addDays(today, i);
    for (const item of planFor(items, date).filter((x) => x.remind)) {
      out.push({ key: `meal:${item.id}:${date}`, title: item.name, body: item.description.split('\n')[0] ?? '', date, time: item.time, url: '/dieta', ref: { kind: 'meal', id: item.id, date } });
    }
  }
  return out;
}

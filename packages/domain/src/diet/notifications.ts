// O que a dieta leva à central de notificações: a próxima refeição do plano de hoje ainda sem registro.
import { localInstant, type AppNotification } from '../notifications/index.ts';
import type { IsoDate, LocalTime } from '../time/index.ts';
import type { MealLog, MealPlanItem } from './model.ts';
import { nextMeal } from './schedule.ts';

export function dietNotifications(plan: readonly MealPlanItem[], logs: readonly MealLog[], now: { date: IsoDate; time: LocalTime }): AppNotification[] {
  const next = nextMeal(plan, logs, now);
  if (!next || next.date !== now.date) return [];
  const { item, date } = next;
  return [
    {
      id: `meal:${item.id}:${date}`,
      module: 'diet',
      title: `${item.name} às ${item.time}`,
      message: item.description.split('\n')[0]?.trim() ?? '',
      at: localInstant(date, item.time),
      route: `/dieta/registro/novo?plano=${item.id}`,
      action: { label: 'Registrar', kind: 'open' },
    },
  ];
}

/** A refeição do plano ainda não foi registrada nesta data? Um adiamento só vale se sim. */
export function isMealPending(plan: readonly MealPlanItem[], logs: readonly MealLog[], id: string, date: IsoDate): boolean {
  if (!plan.some((p) => p.id === id && p.deleted_at === null)) return false;
  return !logs.some((l) => l.deleted_at === null && l.plan_id === id && l.date === date);
}

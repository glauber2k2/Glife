import { useMemo } from 'react';

import type { TargetSource } from '@/features/links';

import { useDietMaybe } from './DietData';

/** Refeições registradas e refeições do plano como alvo de vínculos e avisos; vazio sem sessão. */
export function useDietTargetSources(): TargetSource[] {
  const repo = useDietMaybe()?.repo ?? null;
  return useMemo(() => {
    if (!repo) return [];
    return [
      {
        type: 'meal',
        table: 'meals',
        noun: 'Esta refeição',
        routePrefix: '/dieta/registro/',
        href: async (id) => `/dieta/registro/${id}`,
        restore: (id) => repo.restoreLog(id),
        kindLabel: 'Refeição',
        title: async (id) => {
          const log = await repo.getLog(id).catch(() => null);
          return log ? log.description.split('\n')[0] || 'Refeição' : null;
        },
      },
      {
        type: 'meal_plan',
        table: 'meal_plans',
        noun: 'Esta refeição do plano',
        routePrefix: '/dieta/refeicao/',
        href: async (id) => `/dieta/refeicao/${id}`,
        restore: (id) => repo.restorePlanItem(id),
        kindLabel: 'Refeição do plano',
        title: async (id) => (await repo.getPlanItem(id).catch(() => null))?.name ?? null,
      },
    ];
  }, [repo]);
}

import { useMemo } from 'react';

import type { TargetSource } from '@/features/links';

import { useDietMaybe } from './DietData';

/** Refeições registradas como alvo de vínculos e avisos; null sem sessão. */
export function useDietTargetSource(): TargetSource | null {
  const repo = useDietMaybe()?.repo ?? null;
  return useMemo(() => {
    if (!repo) return null;
    return {
      type: 'meal',
      table: 'meals',
      noun: 'Esta refeição',
      routePrefix: '/dieta/registro/',
      href: async (id) => `/dieta/registro/${id}`,
      restore: (id) => repo.restoreLog(id),
    };
  }, [repo]);
}

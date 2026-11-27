// Planos com a situação de hoje (dia atual, perdidos, sequência…), recalculada quando muda o plano, as leituras ou o dia.
import { planStatus, type BiblePlan, type PlanStatus } from '@glife/domain/bible';
import { localNow } from '@glife/domain/time';
import { useMemo } from 'react';

import { usePlansMaybe } from './BibleData';

export interface PlanView {
  plan: BiblePlan;
  status: PlanStatus;
  reads: { ref: string; read_on: string }[];
  /** concluído: marcado como concluído ou com tudo lido */
  done: boolean;
}

export function usePlanViews(): { views: PlanView[]; today: string; loading: boolean } {
  const plans = usePlansMaybe();
  const today = localNow().date;
  const views = useMemo(
    () =>
      (plans?.data ?? []).map(({ plan, reads }) => {
        const status = planStatus(plan, reads, today);
        return { plan, reads, status, done: plan.completed_at !== null || status.completed };
      }),
    [plans?.data, today],
  );
  return { views, today, loading: !plans || plans.data === null };
}

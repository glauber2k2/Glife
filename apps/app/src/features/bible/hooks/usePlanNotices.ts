// Lembretes dos planos de leitura para o agendador do aparelho (montados pelo `today/NoticesSync`).
import { planNotices } from '@glife/domain/bible';
import { localNow, type ScheduledNotice } from '@glife/domain/time';
import { useMemo } from 'react';

import { usePlansMaybe } from './BibleData';

/** null enquanto os planos não foram lidos (o agendador espera em vez de apagar os avisos); sem sessão, lista vazia. */
export function usePlanNotices(days: number): ScheduledNotice[] | null {
  const plans = usePlansMaybe();
  const today = localNow().date;
  return useMemo(() => {
    if (!plans) return [];
    return plans.data ? planNotices(plans.data, today, days) : null;
  }, [plans, today, days]);
}

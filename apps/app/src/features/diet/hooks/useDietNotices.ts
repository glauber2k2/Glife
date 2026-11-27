// Avisos das refeições do plano para o aparelho agendar.
import { dietNotices } from '@glife/domain/diet';
import { localNow, type ScheduledNotice } from '@glife/domain/time';
import { useMemo } from 'react';

import { useDietMaybe } from './DietData';

/** null sem sessão ou antes da primeira leitura. */
export function useDietNotices(days: number): ScheduledNotice[] | null {
  const data = useDietMaybe()?.data ?? null;
  const today = localNow().date;
  return useMemo(() => (data ? dietNotices(data.plan, today, days) : null), [data, today, days]);
}

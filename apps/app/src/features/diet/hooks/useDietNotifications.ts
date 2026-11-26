// O que a dieta leva à central de notificações: a próxima refeição do plano de hoje (o "Registrar" abre o registro).
import { dietNotifications } from '@glife/domain/diet';
import type { NotificationSource } from '@glife/domain/notifications';
import { localNow } from '@glife/domain/time';
import { useMemo } from 'react';

import { useDietMaybe } from './DietData';

/** null sem sessão ou antes da primeira leitura. `now` vem da central (anda a cada minuto). */
export function useDietNotifications(now: Date): NotificationSource | null {
  const data = useDietMaybe()?.data ?? null;
  const { date, time } = localNow(now);
  return useMemo(() => {
    if (!data) return null;
    // Refeição só abre o registro (ação "open"); nada a resolver aqui.
    return { items: dietNotifications(data.plan, data.logs, { date, time }), resolve: async () => {} };
  }, [data, date, time]);
}

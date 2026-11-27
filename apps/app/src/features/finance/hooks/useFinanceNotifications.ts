// O que Finanças leva à central de notificações (fatura a vencer, previsto atrasado). Os valores seguem o olhinho:
// ocultos, a mensagem mostra "R$ ••••". "Confirmar" grava o previsto com o valor previsto.
import { collectOccurrences, financeNotifications, overduePlanned } from '@glife/domain/finance';
import type { NotificationSource } from '@glife/domain/notifications';
import { localNow } from '@glife/domain/time';
import { useMemo } from 'react';

import { UserFacingError } from '@/shared/lib/errorText';

import { useFinanceMaybe } from './FinanceData';
import { useMoneyFormat } from './useMoneyFormat';
import { settlePlanned } from './settlePlanned';

/** null sem sessão ou antes da primeira leitura. `now` vem da central (anda a cada minuto). */
export function useFinanceNotifications(now: Date): NotificationSource | null {
  const ctx = useFinanceMaybe();
  const { money } = useMoneyFormat();
  const repos = ctx?.repos ?? null;
  const data = ctx?.data ?? null;
  const today = localNow(now).date;
  return useMemo(() => {
    if (!repos || !data) return null;
    return {
      items: financeNotifications(data, { date: today }, money),
      resolve: async (id) => {
        const item = overduePlanned(data, collectOccurrences(data, today), today).find((i) => `planned:${i.key}` === id);
        if (!item) throw new UserFacingError('Este previsto já foi resolvido.');
        await settlePlanned(repos, data, item, 'confirmed');
      },
    };
  }, [repos, data, today, money]);
}

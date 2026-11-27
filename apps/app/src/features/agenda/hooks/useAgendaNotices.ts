// Avisos da agenda para o aparelho agendar (eventos com aviso e lembretes não concluídos dos próximos dias).
import { agendaNotices } from '@glife/domain/agenda';
import { localNow, type ScheduledNotice } from '@glife/domain/time';
import { useMemo } from 'react';

import { useAgendaMaybe } from './AgendaData';

/** null sem sessão ou antes da primeira leitura. `day` muda a cada dia (recalcula a janela). */
export function useAgendaNotices(days: number): ScheduledNotice[] | null {
  const data = useAgendaMaybe()?.data ?? null;
  const today = localNow().date;
  return useMemo(() => (data ? agendaNotices(data.events, data.reminders, today, days) : null), [data, today, days]);
}

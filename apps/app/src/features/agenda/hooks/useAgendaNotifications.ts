// O que a agenda leva à central de notificações (lembretes de hoje e atrasados) e o "Feito" dos lembretes, usado
// também pelo botão do aviso do aparelho.
import { agendaNotifications, isReminderPending } from '@glife/domain/agenda';
import type { NotificationSource } from '@glife/domain/notifications';
import { localNow } from '@glife/domain/time';
import { useMemo } from 'react';

import { useAgendaMaybe } from './AgendaData';

const REMINDER_ID = /^reminder:([0-9a-f-]{36}):(\d{4}-\d{2}-\d{2})$/;

/** null sem sessão ou antes da primeira leitura. `now` vem da central (anda a cada minuto). */
export function useAgendaNotifications(now: Date): NotificationSource | null {
  const ctx = useAgendaMaybe();
  const repo = ctx?.repo ?? null;
  const reminders = ctx?.data?.reminders ?? null;
  const { date, time } = localNow(now);
  return useMemo(() => {
    if (!repo || !reminders) return null;
    return {
      items: agendaNotifications(reminders, { date, time }),
      resolve: async (id) => {
        const m = REMINDER_ID.exec(id);
        if (!m) throw new Error('Lembrete não encontrado');
        await repo.completeReminder(m[1]!, m[2]!);
      },
    };
  }, [repo, reminders, date, time]);
}

/** Concluir um lembrete nesta data (único: feito; repetido: pula a data). null sem sessão. */
export function useCompleteReminder(): ((id: string, date: string) => Promise<void>) | null {
  const repo = useAgendaMaybe()?.repo ?? null;
  return useMemo(() => (repo ? async (id, date) => void (await repo.completeReminder(id, date)) : null), [repo]);
}

/** O lembrete ainda está pendente nesta data? (um adiamento do aviso só vale se sim) null antes da leitura. */
export function usePendingReminder(): ((id: string, date: string) => boolean) | null {
  const reminders = useAgendaMaybe()?.data?.reminders ?? null;
  return useMemo(() => (reminders ? (id, date) => isReminderPending(reminders, id, date) : null), [reminders]);
}

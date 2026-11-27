import { useMemo } from 'react';

import type { TargetSource } from '@/features/links';

import { useAgendaMaybe } from './AgendaData';

/** Eventos e lembretes como alvo de vínculos e avisos; vazio sem sessão. */
export function useAgendaTargetSources(): TargetSource[] {
  const repo = useAgendaMaybe()?.repo ?? null;
  return useMemo(() => {
    if (!repo) return [];
    return [
      {
        type: 'event',
        table: 'events',
        noun: 'Este evento',
        routePrefix: '/agenda/evento/',
        href: async (id) => `/agenda/evento/${id}`,
        restore: (id) => repo.restoreEvent(id),
        kindLabel: 'Evento',
        title: async (id) => (await repo.getEvent(id).catch(() => null))?.title ?? null,
      },
      {
        type: 'reminder',
        table: 'reminders',
        noun: 'Este lembrete',
        routePrefix: '/agenda/lembrete/',
        href: async (id) => `/agenda/lembrete/${id}`,
        restore: (id) => repo.restoreReminder(id),
        kindLabel: 'Lembrete',
        title: async (id) => (await repo.getReminder(id).catch(() => null))?.title ?? null,
      },
    ];
  }, [repo]);
}

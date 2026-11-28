// Repositório da agenda sobre o banco local: o RowStore genérico guarda as linhas; as regras são do domain.
import { createAgendaRepository, type AgendaRepository, type AgendaRows } from '@glife/domain/agenda';
import type { LocalDb } from '@glife/domain/core';

import { createLocalRowStore } from '@/shared/lib/localRowStore';

import { agendaTables } from './schema';

export function createLocalAgenda(db: LocalDb, userId: string, clock?: () => Date): AgendaRepository {
  const store = createLocalRowStore<AgendaRows>(db, userId, agendaTables, {
    json: ['skipped_dates', 'times', 'done_slots'],
    // Lembretes de antes da 0.9 chegam sem o modo: são de uma vez só.
    defaults: { time_mode: 'once' },
  });
  return createAgendaRepository(store, userId, clock);
}

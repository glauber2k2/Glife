// Repositório da agenda sobre o banco local: o RowStore genérico guarda as linhas; as regras são do domain.
import { createAgendaRepository, type AgendaRepository, type AgendaRows } from '@glife/domain/agenda';
import type { LocalDb } from '@glife/domain/core';

import { createLocalRowStore } from '@/shared/lib/localRowStore';

import { agendaTables } from './schema';

export function createLocalAgenda(db: LocalDb, userId: string, clock?: () => Date): AgendaRepository {
  const store = createLocalRowStore<AgendaRows>(db, userId, agendaTables, { json: ['skipped_dates'] });
  return createAgendaRepository(store, userId, clock);
}

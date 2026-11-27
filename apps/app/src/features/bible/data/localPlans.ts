// Planos de leitura sobre o banco local: listas (grupos, dias da semana) e pausas vão como texto JSON.
import { createBiblePlansRepository, type BiblePlansRepository, type PlanRows } from '@glife/domain/bible';
import type { LocalDb } from '@glife/domain/core';

import { createLocalRowStore } from '@/shared/lib/localRowStore';

import { bibleTables } from './schema';

const { bible_plans, bible_plan_reads } = bibleTables;

export function createLocalPlans(db: LocalDb, userId: string): BiblePlansRepository {
  return createBiblePlansRepository(createLocalRowStore<PlanRows>(db, userId, { bible_plans, bible_plan_reads }, { json: ['groups', 'weekdays', 'pauses'] }), userId);
}

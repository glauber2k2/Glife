// Repositório da dieta sobre o banco local: o RowStore genérico guarda as linhas; as regras são do domain.
import type { LocalDb } from '@glife/domain/core';
import { createDietRepository, type DietRepository, type DietRows } from '@glife/domain/diet';

import { createLocalRowStore } from '@/shared/lib/localRowStore';

import { dietTables } from './schema';

export function createLocalDiet(db: LocalDb, userId: string, clock?: () => Date): DietRepository {
  return createDietRepository(createLocalRowStore<DietRows>(db, userId, dietTables, { booleans: ['remind'] }), userId, clock);
}

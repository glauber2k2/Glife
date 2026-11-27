// Marcações da Bíblia sobre o banco local: o RowStore genérico guarda as linhas; as regras são do domain.
import { createBibleHighlightsRepository, type BibleHighlightsRepository, type BibleRows } from '@glife/domain/bible';
import type { LocalDb } from '@glife/domain/core';

import { createLocalRowStore } from '@/shared/lib/localRowStore';

import { bibleTables } from './schema';

export function createLocalHighlights(db: LocalDb, userId: string): BibleHighlightsRepository {
  return createBibleHighlightsRepository(createLocalRowStore<BibleRows>(db, userId, bibleTables), userId);
}

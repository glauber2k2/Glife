// Dados da dieta ao vivo (plano e registros), compostos na raiz com o banco local e o dono da sessão.
import type { DietRepository, DietSnapshot } from '@glife/domain/diet';

import { createSnapshotProvider } from '@/shared/lib/snapshotProvider';

import { createLocalDiet } from '../data/localDiet';

const diet = createSnapshotProvider<DietRepository, DietSnapshot>('a dieta', (db, userId) => createLocalDiet(db, userId));

export const DietProvider = diet.Provider;
export const useDiet = diet.use;
export const useDietMaybe = diet.useMaybe;

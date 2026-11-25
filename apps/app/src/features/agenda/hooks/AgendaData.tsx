// Dados da agenda ao vivo (eventos e lembretes), compostos na raiz com o banco local e o dono da sessão.
import type { AgendaRepository, AgendaSnapshot } from '@glife/domain/agenda';

import { createSnapshotProvider } from '@/shared/lib/snapshotProvider';

import { createLocalAgenda } from '../data/localAgenda';

const agenda = createSnapshotProvider<AgendaRepository, AgendaSnapshot>('a agenda', (db, userId) => createLocalAgenda(db, userId));

export const AgendaProvider = agenda.Provider;
export const useAgenda = agenda.use;
export const useAgendaMaybe = agenda.useMaybe;

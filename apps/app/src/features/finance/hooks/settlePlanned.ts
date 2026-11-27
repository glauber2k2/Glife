// Confirmar ou pular um previsto (linha gravada ou ocorrência calculada de uma regra), devolvendo como desfazer.
// Usado pelas telas de Finanças e pela central de notificações ("Confirmar" na linha).
import { materializeOccurrence, type FinanceData, type FinanceRepositories, type IsoDate, type PlannedItem } from '@glife/domain/finance';

import { UserFacingError } from '@/shared/lib/errorText';

export type Undo = () => Promise<void>;

export async function settlePlanned(
  repos: FinanceRepositories,
  data: FinanceData | null,
  item: PlannedItem,
  status: 'confirmed' | 'skipped',
  changes: { amount_cents?: number; date?: IsoDate } = {},
): Promise<Undo> {
  if (item.transactionId) {
    const id = item.transactionId;
    if (status === 'confirmed') await repos.transactions.confirm(id, changes);
    else await repos.transactions.skip(id);
    return async () => {
      await repos.transactions.update(id, { status: 'planned', amount_cents: item.amount_cents, date: item.date });
    };
  }
  const rule = data?.rules.find((x) => x.id === item.recurrenceId);
  if (!rule) throw new UserFacingError('Recorrência não encontrada.');
  const account = data?.accounts.find((x) => x.id === rule.account_id);
  if (!account) throw new UserFacingError('Conta não encontrada.');
  const row = materializeOccurrence(rule, item.occurrenceDate!, { status, ...changes }, account);
  await repos.transactions.upsertOccurrence(row);
  // A linha excluída faz a ocorrência voltar a ser calculada (prevista).
  return async () => repos.transactions.remove(row.id);
}
